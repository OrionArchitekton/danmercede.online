#!/usr/bin/env node
/**
 * Daily Pacific signal cap guard for danmercede.online pull requests (REC-005 / F-PBG-003).
 *
 * Enforces the 3/day America/Los_Angeles ceiling on signal PRs touching inbox/*.md
 * by querying GitHub GraphQL merged PRs with complete totalCount verification.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HEX_SHA_RX = /^[0-9a-f]{40,64}$/i;
const DEFAULT_DAILY_CAP = 3;
const PACIFIC_TZ = 'America/Los_Angeles';

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
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid mergedAt timestamp: ${isoTimestamp}`);
  }
  return PT_DATE_FORMATTER.format(date);
}

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

  if (totalCount > nodes.length || pageInfo?.hasNextPage === true) {
    return {
      exitCode: 2,
      status: 'blocked',
      reason: 'INCOMPLETE_PAGINATION_COUNT',
      totalCount,
      fetchedNodes: nodes.length,
    };
  }

  let remoteMergedPtToday = 0;
  for (const pr of nodes) {
    if (!pr || typeof pr !== 'object') {
      return { exitCode: 2, status: 'blocked', reason: 'REMOTE_RECONCILE_FAILED' };
    }
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

async function fetchAllMergedPullRequests(token, owner, name) {
  const allNodes = [];
  let expectedTotal = null;
  let after = null;
  for (let page = 0; page < 20; page += 1) {
    const resp = await postGraphql(token, { owner, name, after });
    if (!resp || resp.errors) {
      return resp;
    }
    const prs = resp?.data?.repository?.pullRequests;
    if (!prs || !Array.isArray(prs.nodes) || typeof prs.totalCount !== 'number') {
      return resp;
    }
    expectedTotal =
      expectedTotal === null ? prs.totalCount : Math.max(expectedTotal, prs.totalCount);
    allNodes.push(...prs.nodes);
    if (!prs.pageInfo?.hasNextPage) {
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
    if (!prs.pageInfo?.endCursor) {
      return {
        data: {
          repository: {
            pullRequests: {
              totalCount: expectedTotal,
              pageInfo: { hasNextPage: true, endCursor: null },
              nodes: allNodes,
            },
          },
        },
      };
    }
    after = prs.pageInfo.endCursor;
  }
  return {
    data: {
      repository: {
        pullRequests: {
          totalCount: expectedTotal ?? allNodes.length + 1,
          pageInfo: { hasNextPage: true, endCursor: after },
          nodes: allNodes,
        },
      },
    },
  };
}

function gitDiffNames(rangeSpec, cwd) {
  // -z: NUL-delimited, never quoted. Without it git quotes a path holding a
  // double quote, backslash or control character even with core.quotePath=false,
  // and the quoted form would not be recognised as an inbox path.
  const out = execFileSync(
    'git',
    ['-c', 'core.quotePath=false', 'diff', '--name-only', '-z', rangeSpec, '--'],
    { encoding: 'utf8', cwd },
  );
  return out.split('\0').filter((entry) => entry.length > 0);
}

export function resolveChangedPaths({ cwd = process.cwd(), env = process.env } = {}) {
  const baseSha = (env.BASE_SHA || env.GITHUB_BASE_SHA || '').trim();
  if (baseSha) {
    if (!HEX_SHA_RX.test(baseSha)) {
      throw new Error('BASE_SHA is not a valid hexadecimal commit digest');
    }
    return gitDiffNames(`${baseSha}...HEAD`, cwd);
  }
  const eventPath = env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const evt = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const prBase = evt?.pull_request?.base?.sha;
    if (typeof prBase === 'string' && HEX_SHA_RX.test(prBase)) {
      return gitDiffNames(`${prBase}...HEAD`, cwd);
    }
  }
  return gitDiffNames('HEAD~1...HEAD', cwd);
}

async function runCli() {
  try {
    const changedPaths = resolveChangedPaths();
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
