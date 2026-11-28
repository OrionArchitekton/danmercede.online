#!/usr/bin/env node
/**
 * Daily Pacific signal cap guard for danmercede.online pull requests (REC-005 / F-PBG-003).
 *
 * Enforces the 3/day America/Los_Angeles ceiling on signal PRs, meaning PRs that
 * ADD an inbox/*.md entry, by querying GitHub GraphQL merged PRs with complete
 * totalCount verification. A PR that only edits or deletes existing entries
 * publishes no new signal: it is not capped and does not use up the day's cap.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
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
    const files = pr.files;
    if (
      !files ||
      typeof files.totalCount !== 'number' ||
      !Number.isInteger(files.totalCount) ||
      !Array.isArray(files.nodes)
    ) {
      return { exitCode: 2, status: 'blocked', reason: 'REMOTE_RECONCILE_FAILED' };
    }
    // The Pacific-day filter runs BEFORE the truncation refusal: a merge from
    // another day cannot add to today's count, so its file list is irrelevant.
    // A truncated list on the target day still fails closed below.
    if (mergedDayPt !== todayPt) {
      continue;
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

function postGraphql(token, variables) {
  const body = JSON.stringify({ query: GRAPHQL_QUERY, variables });
  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://api.github.com/graphql',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'danmercede-online-cap-guard/1.0',
        },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode !== 200) {
            reject(new Error(`GitHub GraphQL HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(text));
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('GitHub GraphQL timeout')));
    req.on('error', reject);
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

// Paths the range ADDS. A signal is a new inbox entry: editing or deleting an
// existing entry publishes nothing new. --no-renames reports a rename as a
// delete plus an add, so a file renamed or copied into inbox/ counts as added.
// Only a plain modify (M) or delete (D) is dropped; any other status is kept.
// -z: NUL-delimited, never quoted. Without it git quotes a path holding a
// double quote, backslash or control character even with core.quotePath=false,
// and the quoted form would not be recognised as an inbox path.
function gitDiffAddedPaths(rangeSpec, cwd) {
  const out = execFileSync(
    'git',
    [
      '-c',
      'core.quotePath=false',
      'diff',
      '--name-status',
      '--no-renames',
      '-z',
      rangeSpec,
      '--',
    ],
    { encoding: 'utf8', cwd },
  );
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
    if (status !== 'M' && status !== 'D') {
      added.push(filePath);
    }
  }
  return added;
}

export function resolveAddedPaths({ cwd = process.cwd(), env = process.env } = {}) {
  const baseSha = (env.BASE_SHA || env.GITHUB_BASE_SHA || '').trim();
  if (baseSha) {
    if (!HEX_SHA_RX.test(baseSha)) {
      throw new Error('BASE_SHA is not a valid hexadecimal commit digest');
    }
    return gitDiffAddedPaths(`${baseSha}...HEAD`, cwd);
  }
  const eventPath = env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const evt = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const prBase = evt?.pull_request?.base?.sha;
    if (typeof prBase === 'string' && HEX_SHA_RX.test(prBase)) {
      return gitDiffAddedPaths(`${prBase}...HEAD`, cwd);
    }
  }
  return gitDiffAddedPaths('HEAD~1...HEAD', cwd);
}

async function runCli() {
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
    const graphqlPayload = await fetchAllMergedPullRequests(token, owner, name);
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
