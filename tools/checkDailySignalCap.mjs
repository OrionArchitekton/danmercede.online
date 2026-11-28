#!/usr/bin/env node
/**
 * Daily Pacific signal cap guard for danmercede.online pull requests (REC-005 / F-PBG-003).
 *
 * Enforces the 3/day America/Los_Angeles ceiling on signal PRs, meaning PRs that
 * ADD an inbox/*.md entry, by querying GitHub GraphQL merged PRs with complete
 * totalCount verification. A PR that only edits (same frontmatter slug) or
 * deletes existing entries publishes no new signal: it is not capped. An edit
 * that changes an entry's slug is a new entry and is capped.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HEX_SHA_RX = /^[0-9a-f]{40,64}$/i;
const ISO_INSTANT_RX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const DEFAULT_DAILY_CAP = 3;
const PACIFIC_TZ = 'America/Los_Angeles';
// 100 merged PRs per page. Past MAX_PAGES the read is reported incomplete.
const MAX_PAGES = 20;
const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const DEFAULT_TIMEOUT_MS = 30000;
const LOOPBACK_ENDPOINT_RX = /^http:\/\/127\.0\.0\.1:\d{1,5}\/graphql$/;

const GRAPHQL_QUERY = `
query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(
      states: MERGED
      baseRefName: "main"
      first: 100
      after: $after
      orderBy: {field: UPDATED_AT, direction: DESC}
    ) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        mergedAt
        files(first: 100) {
          totalCount
          nodes {
            path
            changeType
          }
        }
      }
    }
  }
}
`.trim();

const PT_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: PACIFIC_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function isInboxSignalPath(rawPath) {
  if (typeof rawPath !== 'string') {
    return false;
  }
  const trimmed = rawPath.trim();
  return (
    trimmed.startsWith('inbox/') &&
    trimmed.endsWith('.md') &&
    trimmed !== 'inbox/.gitkeep'
  );
}

export function formatPacificDay(isoTimestamp) {
  if (typeof isoTimestamp !== 'string' || !isoTimestamp.trim()) {
    throw new Error('mergedAt timestamp is missing');
  }
  // Full ISO 8601 instant with an explicit zone only. Date() would read a
  // zone-less string as runner-local time and a bare date as UTC midnight,
  // either of which can put a merge on the wrong Pacific day.
  if (!ISO_INSTANT_RX.test(isoTimestamp)) {
    throw new Error(`invalid mergedAt timestamp: ${isoTimestamp}`);
  }
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid mergedAt timestamp: ${isoTimestamp}`);
  }
  return PT_DATE_FORMATTER.format(date);
}

// changedPaths: the paths the candidate PR ADDS (see resolveAddedPaths).
export function evaluateDailySignalCap({
  changedPaths,
  todayPt,
  graphqlPayload,
  dailyCap = DEFAULT_DAILY_CAP,
}) {
  if (!Array.isArray(changedPaths)) {
    return {
      exitCode: 2,
      status: 'blocked',
      reason: 'INVALID_CHANGED_PATHS',
    };
  }
  const signalPaths = [
    ...new Set(
      changedPaths
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => isInboxSignalPath(item)),
    ),
  ];
  if (signalPaths.length === 0) {
    return {
      exitCode: 0,
      status: 'skipped_non_signal',
      signalPaths: [],
      dailyCap,
    };
  }

  if (!graphqlPayload || typeof graphqlPayload !== 'object' || graphqlPayload.errors) {
    return {
      exitCode: 2,
      status: 'blocked',
      reason: 'REMOTE_RECONCILE_FAILED',
    };
  }

  const prs = graphqlPayload?.data?.repository?.pullRequests;
  if (!prs || typeof prs !== 'object') {
    return {
      exitCode: 2,
      status: 'blocked',
      reason: 'REMOTE_RECONCILE_FAILED',
    };
  }

  const { totalCount, nodes, pageInfo } = prs;
  if (
    typeof totalCount !== 'number' ||
    !Number.isInteger(totalCount) ||
    totalCount < 0 ||
    !Array.isArray(nodes)
  ) {
    return {
      exitCode: 2,
      status: 'blocked',
      reason: 'REMOTE_RECONCILE_FAILED',
    };
  }

  // The last page must say so explicitly: a missing or malformed pageInfo is
  // an incomplete read, not a complete one.
  if (!pageInfo || typeof pageInfo !== 'object' || typeof pageInfo.hasNextPage !== 'boolean') {
    return {
      exitCode: 2,
      status: 'blocked',
      reason: 'REMOTE_RECONCILE_FAILED',
      detail: 'pageInfo.hasNextPage missing',
    };
  }

  if (totalCount > nodes.length || pageInfo.hasNextPage === true) {
    return {
      exitCode: 2,
      status: 'blocked',
      reason: 'INCOMPLETE_PAGINATION_COUNT',
      totalCount,
      fetchedNodes: nodes.length,
    };
  }

  let remoteMergedPtToday = 0;
  const seenPrNumbers = new Set();
  for (const pr of nodes) {
    if (!pr || typeof pr !== 'object') {
      return { exitCode: 2, status: 'blocked', reason: 'REMOTE_RECONCILE_FAILED' };
    }
    // Every node must be a distinct PR. A PR seen twice (the list shifted
    // between pages) lets the node count reach totalCount while another PR,
    // possibly one merged today, was never read.
    if (!Number.isSafeInteger(pr.number) || pr.number <= 0) {
      return {
        exitCode: 2,
        status: 'blocked',
        reason: 'REMOTE_RECONCILE_FAILED',
        detail: 'PR number is not a positive integer',
      };
    }
    if (seenPrNumbers.has(pr.number)) {
      return {
        exitCode: 2,
        status: 'blocked',
        reason: 'REMOTE_RECONCILE_FAILED',
        detail: 'duplicate PR in merged list',
        prNumber: pr.number,
      };
    }
    seenPrNumbers.add(pr.number);
    let mergedDayPt;
    try {
      mergedDayPt = formatPacificDay(pr.mergedAt);
    } catch {
      return { exitCode: 2, status: 'blocked', reason: 'REMOTE_RECONCILE_FAILED' };
    }
    // The merged time of EVERY node is validated above. The Pacific-day filter
    // then runs before any look at the file list: a merge from another day
    // cannot add to today's count, so a null, malformed or truncated file list
    // on it is irrelevant. On the target day each of those still fails closed.
    if (mergedDayPt !== todayPt) {
      continue;
    }
    const files = pr.files;
    if (
      !files ||
      typeof files.totalCount !== 'number' ||
      !Number.isInteger(files.totalCount) ||
      !Array.isArray(files.nodes)
    ) {
      return { exitCode: 2, status: 'blocked', reason: 'REMOTE_RECONCILE_FAILED' };
    }
    if (files.totalCount > files.nodes.length) {
      return {
        exitCode: 2,
        status: 'blocked',
        reason: 'INCOMPLETE_PAGINATION_COUNT',
        prNumber: pr.number,
        filesTotalCount: files.totalCount,
        filesFetchedNodes: files.nodes.length,
      };
    }
    const matchedInPr = new Set();
    for (const f of files.nodes) {
      if (!f || typeof f.path !== 'string') {
        return { exitCode: 2, status: 'blocked', reason: 'REMOTE_RECONCILE_FAILED' };
      }
      // Count what the PR added. Only an explicit MODIFIED or DELETED is
      // skipped; a missing or unknown change type is counted (fail closed).
      if (f.changeType === 'MODIFIED' || f.changeType === 'DELETED') {
        continue;
      }
      if (isInboxSignalPath(f.path)) {
        matchedInPr.add(f.path.trim());
      }
    }
    remoteMergedPtToday += matchedInPr.size;
  }

  if (
    remoteMergedPtToday >= dailyCap ||
    remoteMergedPtToday + signalPaths.length > dailyCap
  ) {
    return {
      exitCode: 4,
      status: 'blocked',
      reason: 'CAP_EXCEEDED_REMOTE_RECONCILED',
      todayPt,
      remoteMergedPtToday,
      candidateSignals: signalPaths.length,
      projectedTotalPtToday: remoteMergedPtToday + signalPaths.length,
      dailyCap,
      signalPaths,
    };
  }

  return {
    exitCode: 0,
    status: 'admitted',
    todayPt,
    remoteMergedPtToday,
    candidateSignals: signalPaths.length,
    projectedTotalPtToday: remoteMergedPtToday + signalPaths.length,
    dailyCap,
    signalPaths,
  };
}

export function postGraphql(
  token,
  variables,
  { endpoint = GITHUB_GRAPHQL_ENDPOINT, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  const body = JSON.stringify({ query: GRAPHQL_QUERY, variables });
  const client = endpoint.startsWith('http://') ? http : https;
  return new Promise((resolve, reject) => {
    // Settles exactly once, and always: every way a response can end without
    // a complete body (reset, abort, early close, timeout) is a rejection.
    // A promise left pending would let the event loop drain and the process
    // exit with whatever exit code was set.
    let settled = false;
    let deadline = null;
    const settle = (fn, value) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(deadline);
      fn(value);
    };
    const fail = (err) => settle(reject, err instanceof Error ? err : new Error(String(err)));
    const req = client.request(
      endpoint,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'danmercede-online-cap-guard/1.0',
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('error', fail);
        res.on('aborted', () => fail(new Error('GitHub GraphQL response aborted')));
        res.on('close', () => {
          if (!res.complete) {
            fail(new Error('GitHub GraphQL response closed before it was complete'));
          }
        });
        res.on('end', () => {
          if (!res.complete) {
            fail(new Error('GitHub GraphQL response ended incomplete'));
            return;
          }
          if (res.statusCode !== 200) {
            fail(new Error(`GitHub GraphQL HTTP ${res.statusCode}`));
            return;
          }
          try {
            settle(resolve, JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (err) {
            fail(err);
          }
        });
      },
    );
    // Idle timeout on the socket, plus a hard deadline for the whole request
    // so a slow trickle cannot hold the read open.
    req.on('timeout', () => req.destroy(new Error('GitHub GraphQL timeout')));
    req.on('error', fail);
    req.on('close', () => fail(new Error('GitHub GraphQL request closed without a response')));
    deadline = setTimeout(() => {
      req.destroy(new Error('GitHub GraphQL deadline exceeded'));
      fail(new Error('GitHub GraphQL deadline exceeded'));
    }, timeoutMs * 2);
    req.write(body);
    req.end();
  });
}

// Reads every merged PR, page by page. Any response it cannot fully trust is
// handed back as-is or marked incomplete (hasNextPage: true), and
// evaluateDailySignalCap turns either into a block. It never returns a
// complete-looking list from an incomplete read.
export async function fetchAllMergedPullRequests(token, owner, name, post = postGraphql) {
  const incomplete = (totalCount, nodes, endCursor) => ({
    data: {
      repository: {
        pullRequests: {
          totalCount,
          pageInfo: { hasNextPage: true, endCursor },
          nodes,
        },
      },
    },
  });
  const allNodes = [];
  const seenCursors = new Set();
  let expectedTotal = null;
  let after = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const resp = await post(token, { owner, name, after });
    if (!resp || resp.errors) {
      return resp;
    }
    const prs = resp?.data?.repository?.pullRequests;
    if (
      !prs ||
      !Array.isArray(prs.nodes) ||
      typeof prs.totalCount !== 'number' ||
      typeof prs.pageInfo?.hasNextPage !== 'boolean'
    ) {
      return resp;
    }
    expectedTotal =
      expectedTotal === null ? prs.totalCount : Math.max(expectedTotal, prs.totalCount);
    allNodes.push(...prs.nodes);
    if (!prs.pageInfo.hasNextPage) {
      return {
        data: {
          repository: {
            pullRequests: {
              totalCount: expectedTotal,
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: allNodes,
            },
          },
        },
      };
    }
    const next = prs.pageInfo.endCursor;
    // A missing cursor, or one already used, cannot make progress.
    if (typeof next !== 'string' || !next || next === after || seenCursors.has(next)) {
      return incomplete(expectedTotal, allNodes, next ?? null);
    }
    seenCursors.add(next);
    after = next;
  }
  return incomplete(expectedTotal ?? allNodes.length + 1, allNodes, after);
}

const SAFE_SLUG_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// The frontmatter slug of an inbox entry, or null when it cannot be read with
// certainty. The site compiler keys entries by this slug, not by filename.
// Deliberately narrow: plain `---` fences only (no engine tag), exactly one
// line that looks like a slug key anywhere in the block, written `slug: value`
// at column 0, value a safe slug (optionally in matching quotes). Anything
// else is null, and the caller treats null as a signal.
export function readFrontmatterSlug(text) {
  if (typeof text !== 'string') {
    return null;
  }
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') {
    return null;
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    return null;
  }
  const slugLines = lines.slice(1, end).filter((line) => /^\s*["']?slug["']?\s*:/i.test(line));
  if (slugLines.length !== 1) {
    return null;
  }
  const match = /^slug:[ \t]*(.*?)[ \t]*$/.exec(slugLines[0]);
  if (!match) {
    return null;
  }
  let value = match[1];
  const quoted = /^(["'])(.*)\1$/.exec(value);
  if (quoted) {
    value = quoted[2];
  }
  return SAFE_SLUG_RX.test(value) ? value : null;
}

function git(args, cwd) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    encoding: 'utf8',
    cwd,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function readBlobSlug(rev, filePath, cwd) {
  try {
    return readFrontmatterSlug(git(['cat-file', 'blob', `${rev}:${filePath}`], cwd));
  } catch {
    return null;
  }
}

// Paths by which the PR publishes something NEW, relative to its merge base.
// - Added (and anything that is not a plain modify or delete): kept.
//   --no-renames reports a rename as a delete plus an add, so a file renamed
//   or copied into inbox/ counts as added.
// - Deleted: dropped. A deletion publishes nothing.
// - Modified inbox entry: kept when its frontmatter slug differs between the
//   merge base and HEAD, or when either slug cannot be read. The compiler keys
//   entries by slug, so rewriting an existing file under a new slug publishes
//   a new entry. Same slug on both sides is an edit and is dropped.
// - Modified non-inbox path: dropped.
// -z: NUL-delimited, never quoted. Without it git quotes a path holding a
// double quote, backslash or control character even with core.quotePath=false,
// and the quoted form would not be recognised as an inbox path.
function gitDiffAddedPaths(baseRef, cwd) {
  const mergeBase = git(['merge-base', baseRef, 'HEAD'], cwd).trim();
  if (!HEX_SHA_RX.test(mergeBase)) {
    throw new Error('could not resolve the merge base');
  }
  const out = git(['diff', '--name-status', '--no-renames', '-z', mergeBase, 'HEAD', '--'], cwd);
  const fields = out.split('\0');
  if (fields[fields.length - 1] === '') {
    fields.pop();
  }
  if (fields.length % 2 !== 0) {
    throw new Error('unexpected git diff --name-status -z output');
  }
  const added = [];
  for (let i = 0; i < fields.length; i += 2) {
    const status = fields[i];
    const filePath = fields[i + 1];
    if (!status || !filePath) {
      throw new Error('unexpected git diff --name-status -z output');
    }
    if (status === 'D') {
      continue;
    }
    if (status === 'M') {
      if (!isInboxSignalPath(filePath)) {
        continue;
      }
      const baseSlug = readBlobSlug(mergeBase, filePath, cwd);
      const headSlug = readBlobSlug('HEAD', filePath, cwd);
      if (baseSlug !== null && headSlug !== null && baseSlug === headSlug) {
        continue;
      }
    }
    added.push(filePath);
  }
  return added;
}

export function resolveAddedPaths({ cwd = process.cwd(), env = process.env } = {}) {
  const baseSha = (env.BASE_SHA || env.GITHUB_BASE_SHA || '').trim();
  if (baseSha) {
    if (!HEX_SHA_RX.test(baseSha)) {
      throw new Error('BASE_SHA is not a valid hexadecimal commit digest');
    }
    return gitDiffAddedPaths(baseSha, cwd);
  }
  const eventPath = env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const evt = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const prBase = evt?.pull_request?.base?.sha;
    if (typeof prBase === 'string' && HEX_SHA_RX.test(prBase)) {
      return gitDiffAddedPaths(prBase, cwd);
    }
  }
  return gitDiffAddedPaths('HEAD~1', cwd);
}

async function runCli() {
  // Default to failure. Only an explicit verdict below can set a pass, so a
  // promise that never settles or an early event-loop drain exits non-zero.
  process.exitCode = 2;
  try {
    const changedPaths = resolveAddedPaths();
    const hasSignal = changedPaths.some((p) => isInboxSignalPath(p));
    const todayPt = PT_DATE_FORMATTER.format(new Date());
    if (!hasSignal) {
      const verdict = evaluateDailySignalCap({
        changedPaths,
        todayPt,
        graphqlPayload: null,
        dailyCap: DEFAULT_DAILY_CAP,
      });
      console.log(JSON.stringify(verdict));
      process.exit(verdict.exitCode);
    }

    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
    if (!token) {
      console.log(
        JSON.stringify({
          status: 'blocked',
          reason: 'MISSING_GITHUB_TOKEN',
          exitCode: 2,
        }),
      );
      process.exit(2);
    }
    const repoFull = process.env.GITHUB_REPOSITORY || 'OrionArchitekton/danmercede.online';
    const [owner, name] = repoFull.split('/');
    // Test-only: a loopback http endpoint (and a short timeout with it) so the
    // CLI can be run against a local misbehaving server. Anything that is not
    // http://127.0.0.1:<port>/graphql is refused, so the token cannot be sent
    // elsewhere.
    const transport = {};
    const testEndpoint = process.env.SIGNAL_CAP_TEST_ENDPOINT;
    if (testEndpoint) {
      if (!LOOPBACK_ENDPOINT_RX.test(testEndpoint)) {
        throw new Error('SIGNAL_CAP_TEST_ENDPOINT must be http://127.0.0.1:<port>/graphql');
      }
      transport.endpoint = testEndpoint;
      const testTimeout = Number(process.env.SIGNAL_CAP_TEST_TIMEOUT_MS);
      if (Number.isInteger(testTimeout) && testTimeout > 0 && testTimeout <= DEFAULT_TIMEOUT_MS) {
        transport.timeoutMs = testTimeout;
      }
    }
    const graphqlPayload = await fetchAllMergedPullRequests(token, owner, name, (tok, vars) =>
      postGraphql(tok, vars, transport),
    );
    const verdict = evaluateDailySignalCap({
      changedPaths,
      todayPt,
      graphqlPayload,
      dailyCap: DEFAULT_DAILY_CAP,
    });
    console.log(JSON.stringify(verdict));
    process.exit(verdict.exitCode);
  } catch (err) {
    console.log(
      JSON.stringify({
        status: 'blocked',
        reason: 'REMOTE_RECONCILE_FAILED',
        detail: String(err?.message || err),
        exitCode: 2,
      }),
    );
    process.exit(2);
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runCli();
}
