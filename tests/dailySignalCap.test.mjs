import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateDailySignalCap } from '../tools/checkDailySignalCap.mjs';

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
