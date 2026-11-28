import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  evaluateDailySignalCap,
  isInboxSignalPath,
  resolveChangedPaths,
} from '../tools/checkDailySignalCap.mjs';

// Local throwaway git repo: a base commit, then one commit built by `mutate`.
function makeRepo(t, mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-cap-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid',
      '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args],
    { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  fs.mkdirSync(path.join(dir, 'inbox'));
  fs.writeFileSync(path.join(dir, 'inbox', 'existing.md'), 'one\n');
  fs.writeFileSync(path.join(dir, 'inbox', 'doomed.md'), 'two\n');
  fs.writeFileSync(path.join(dir, 'README.md'), 'readme\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  const baseSha = git('rev-parse', 'HEAD');
  mutate(dir);
  git('add', '-A');
  git('commit', '-q', '-m', 'change');
  return { dir, baseSha };
}

function makeNode(number, mergedAt, paths, filesTotal = paths.length) {
  return {
    number,
    mergedAt,
    files: {
      totalCount: filesTotal,
      nodes: paths.map((path) => ({ path })),
    },
  };
}

test('non-signal PR touching no inbox/*.md files passes without blocking', () => {
  const verdict = evaluateDailySignalCap({
    changedPaths: ['App.tsx', 'README.md'],
    todayPt: '2026-11-26',
    graphqlPayload: null,
    dailyCap: 3,
  });
  assert.equal(verdict.exitCode, 0);
  assert.equal(verdict.status, 'skipped_non_signal');
});

test('blocks signal PR with exit 4 when 3 merged inbox PRs already landed today in America/Los_Angeles', () => {
  const payload = {
    data: {
      repository: {
        pullRequests: {
          totalCount: 3,
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            makeNode(185, '2026-11-26T16:10:00Z', ['inbox/2026-11-26-one.md', 'public/posts.json']),
            makeNode(186, '2026-11-26T18:20:00Z', ['inbox/2026-11-26-two.md', 'public/posts.json']),
            makeNode(187, '2026-11-26T20:30:00Z', ['inbox/2026-11-26-three.md', 'public/posts.json']),
          ],
        },
      },
    },
  };
  const verdict = evaluateDailySignalCap({
    changedPaths: ['inbox/2026-11-26-four.md', 'public/posts.json'],
    todayPt: '2026-11-26',
    graphqlPayload: payload,
    dailyCap: 3,
  });
  assert.equal(verdict.exitCode, 4);
  assert.equal(verdict.reason, 'CAP_EXCEEDED_REMOTE_RECONCILED');
  assert.equal(verdict.remoteMergedPtToday, 3);
});

test('fails closed with exit 2 on truncated pagination totalCount > nodes.length', () => {
  const payload = {
    data: {
      repository: {
        pullRequests: {
          totalCount: 105,
          pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
          nodes: [makeNode(101, '2026-11-20T12:00:00Z', ['inbox/2026-11-20-a.md'])],
        },
      },
    },
  };
  const verdict = evaluateDailySignalCap({
    changedPaths: ['inbox/2026-11-26-new.md'],
    todayPt: '2026-11-26',
    graphqlPayload: payload,
    dailyCap: 3,
  });
  assert.equal(verdict.exitCode, 2);
  assert.equal(verdict.reason, 'INCOMPLETE_PAGINATION_COUNT');
});

test('admits signal PR when prior PT day and non-signal merges leave room below cap', () => {
  const payload = {
    data: {
      repository: {
        pullRequests: {
          totalCount: 3,
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            // 2026-11-26T07:30:00Z == 2026-11-25 23:30 PST (yesterday PT)
            makeNode(183, '2026-11-26T07:30:00Z', ['inbox/2026-11-25-late.md']),
            // Non-signal PR today
            makeNode(184, '2026-11-26T17:00:00Z', ['README.md']),
            // One signal PR today
            makeNode(185, '2026-11-26T18:00:00Z', ['inbox/2026-11-26-one.md']),
          ],
        },
      },
    },
  };
  const verdict = evaluateDailySignalCap({
    changedPaths: ['inbox/2026-11-26-two.md'],
    todayPt: '2026-11-26',
    graphqlPayload: payload,
    dailyCap: 3,
  });
  assert.equal(verdict.exitCode, 0);
  assert.equal(verdict.status, 'admitted');
  assert.equal(verdict.remoteMergedPtToday, 1);
});

test('counts non-dated inbox/*.md files and multi-signal PRs against daily cap (BLK-WP02-002)', () => {
  const payload = {
    data: {
      repository: {
        pullRequests: {
          totalCount: 1,
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            makeNode(185, '2026-11-26T18:00:00Z', [
              'inbox/2026-11-26-one.md',
              'inbox/hotfix-signal.md',
              'inbox/.gitkeep',
            ]),
          ],
        },
      },
    },
  };
  // 2 already merged today + 2 new signals in candidate PR = 4 > 3 -> blocked exit 4
  const verdict = evaluateDailySignalCap({
    changedPaths: ['inbox/custom-note.md', 'inbox/2026-11-26-fourth.md'],
    todayPt: '2026-11-26',
    graphqlPayload: payload,
    dailyCap: 3,
  });
  assert.equal(verdict.exitCode, 4);
  assert.equal(verdict.reason, 'CAP_EXCEEDED_REMOTE_RECONCILED');
  assert.equal(verdict.remoteMergedPtToday, 2);
  assert.equal(verdict.projectedTotalPtToday, 4);
});

function payloadOf(nodes, totalCount = nodes.length) {
  return {
    data: {
      repository: {
        pullRequests: {
          totalCount,
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes,
        },
      },
    },
  };
}

test('a prior-day merged PR with a truncated file list does not block a later signal PR', () => {
  // Shape of the real history: one old PR changed 159 files, the query returns 100.
  const bigOldPaths = Array.from({ length: 100 }, (_, i) => `inbox/old-${i}.md`);
  const verdict = evaluateDailySignalCap({
    changedPaths: ['inbox/2026-11-28-new.md'],
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf([
      makeNode(190, '2026-11-24T06:21:46Z', bigOldPaths, 159),
      makeNode(191, '2026-11-25T05:17:06Z', ['App.tsx']),
    ]),
  });
  assert.equal(verdict.exitCode, 0);
  assert.equal(verdict.status, 'admitted');
  assert.equal(verdict.remoteMergedPtToday, 0);
});

test('a target-day merged PR with a truncated file list still fails closed', () => {
  const verdict = evaluateDailySignalCap({
    changedPaths: ['inbox/2026-11-28-new.md'],
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf([
      makeNode(193, '2026-11-28T18:00:00Z', ['App.tsx'], 159),
    ]),
  });
  assert.equal(verdict.exitCode, 2);
  assert.equal(verdict.reason, 'INCOMPLETE_PAGINATION_COUNT');
  assert.equal(verdict.prNumber, 193);
});

test('an added inbox path that git would quote is still seen as a signal', (t) => {
  const { dir, baseSha } = makeRepo(t, (d) => {
    fs.writeFileSync(path.join(d, 'inbox', 'a"b.md'), 'quoted\n');
  });
  const paths = resolveChangedPaths({ cwd: dir, env: { BASE_SHA: baseSha } });
  assert.deepEqual(paths, ['inbox/a"b.md']);
  assert.equal(paths.some((p) => isInboxSignalPath(p)), true);
});
