import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  evaluateDailySignalCap,
  fetchAllMergedPullRequests,
  formatPacificDay,
  isInboxSignalPath,
  resolveAddedPaths,
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
      // A bare string is an added file; [path, changeType] sets the type.
      nodes: paths.map((entry) =>
        Array.isArray(entry)
          ? { path: entry[0], changeType: entry[1] }
          : { path: entry, changeType: 'ADDED' },
      ),
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
  const paths = resolveAddedPaths({ cwd: dir, env: { BASE_SHA: baseSha } });
  assert.deepEqual(paths, ['inbox/a"b.md']);
  assert.equal(paths.some((p) => isInboxSignalPath(p)), true);
});

test('a PR that only modifies or deletes inbox entries is not a signal PR', (t) => {
  const { dir, baseSha } = makeRepo(t, (d) => {
    fs.writeFileSync(path.join(d, 'inbox', 'existing.md'), 'one, edited\n');
    fs.rmSync(path.join(d, 'inbox', 'doomed.md'));
    fs.writeFileSync(path.join(d, 'README.md'), 'readme, edited\n');
  });
  const added = resolveAddedPaths({ cwd: dir, env: { BASE_SHA: baseSha } });
  assert.deepEqual(added, []);
  const verdict = evaluateDailySignalCap({
    changedPaths: added,
    todayPt: '2026-11-28',
    graphqlPayload: null,
  });
  assert.equal(verdict.exitCode, 0);
  assert.equal(verdict.status, 'skipped_non_signal');
});

test('added and renamed-in inbox entries are signals; an edit beside them is not', (t) => {
  const { dir, baseSha } = makeRepo(t, (d) => {
    fs.writeFileSync(path.join(d, 'inbox', 'new.md'), 'brand new\n');
    fs.renameSync(path.join(d, 'inbox', 'doomed.md'), path.join(d, 'inbox', 'moved.md'));
    fs.writeFileSync(path.join(d, 'inbox', 'existing.md'), 'one, edited\n');
  });
  const added = resolveAddedPaths({ cwd: dir, env: { BASE_SHA: baseSha } });
  assert.deepEqual([...added].sort(), ['inbox/moved.md', 'inbox/new.md']);
});

test('merged history counts only inbox entries a PR added, not ones it edited or deleted', () => {
  const verdict = evaluateDailySignalCap({
    changedPaths: ['inbox/2026-11-28-new.md'],
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf([
      makeNode(193, '2026-11-28T18:00:00Z', [
        ['inbox/old-a.md', 'MODIFIED'],
        ['inbox/old-b.md', 'MODIFIED'],
        ['inbox/old-c.md', 'MODIFIED'],
        ['inbox/old-d.md', 'DELETED'],
        ['inbox/2026-11-28-one.md', 'ADDED'],
        ['inbox/2026-11-28-moved.md', 'RENAMED'],
      ]),
    ]),
  });
  assert.equal(verdict.exitCode, 0);
  assert.equal(verdict.remoteMergedPtToday, 2);
});

test('a merged inbox file with a missing or unknown change type is counted, never skipped', () => {
  const verdict = evaluateDailySignalCap({
    changedPaths: ['inbox/2026-11-28-new.md'],
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf([
      makeNode(193, '2026-11-28T18:00:00Z', [
        ['inbox/a.md', undefined],
        ['inbox/b.md', 'SOMETHING_NEW'],
        ['inbox/c.md', 'COPIED'],
      ]),
    ]),
  });
  assert.equal(verdict.exitCode, 4);
  assert.equal(verdict.remoteMergedPtToday, 3);
});

// Stubbed GraphQL transport: serves the given pages in order, records calls.
function stubPost(pages) {
  const calls = [];
  const post = async (_token, variables) => {
    calls.push(variables);
    const page = pages[Math.min(calls.length - 1, pages.length - 1)];
    return { data: { repository: { pullRequests: page } } };
  };
  return { post, calls };
}

const SIGNAL_CANDIDATE = ['inbox/2026-11-28-new.md'];

test('the same PR on two pages is refused, so a displaced current-day PR cannot be missed', async () => {
  // Four merged PRs exist. PR 4 (a signal merged today) slid off between pages
  // and PR 2 came back twice: node count equals totalCount, yet PR 4 is unseen.
  const { post } = stubPost([
    {
      totalCount: 4,
      pageInfo: { hasNextPage: true, endCursor: 'c1' },
      nodes: [makeNode(1, '2026-11-20T18:00:00Z', []), makeNode(2, '2026-11-21T18:00:00Z', [])],
    },
    {
      totalCount: 4,
      pageInfo: { hasNextPage: false, endCursor: 'c2' },
      nodes: [makeNode(2, '2026-11-21T18:00:00Z', []), makeNode(3, '2026-11-22T18:00:00Z', [])],
    },
  ]);
  const payload = await fetchAllMergedPullRequests('t', 'o', 'n', post);
  const verdict = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payload,
  });
  assert.equal(verdict.exitCode, 2);
  assert.equal(verdict.status, 'blocked');
});

test('a cursor that does not advance stops the read at once and fails closed', async () => {
  const stuck = {
    totalCount: 2,
    pageInfo: { hasNextPage: true, endCursor: 'same' },
    nodes: [makeNode(1, '2026-11-20T18:00:00Z', [])],
  };
  const { post, calls } = stubPost([stuck, stuck, { ...stuck, pageInfo: { hasNextPage: false, endCursor: 'same' } }]);
  const payload = await fetchAllMergedPullRequests('t', 'o', 'n', post);
  assert.equal(calls.length, 2);
  const verdict = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payload,
  });
  assert.equal(verdict.exitCode, 2);
});

test('a complete two-page read is assembled and admitted', async () => {
  const { post, calls } = stubPost([
    {
      totalCount: 3,
      pageInfo: { hasNextPage: true, endCursor: 'c1' },
      nodes: [makeNode(3, '2026-11-28T18:00:00Z', ['inbox/2026-11-28-one.md']), makeNode(2, '2026-11-21T18:00:00Z', [])],
    },
    {
      totalCount: 3,
      pageInfo: { hasNextPage: false, endCursor: 'c2' },
      nodes: [makeNode(1, '2026-11-20T18:00:00Z', [])],
    },
  ]);
  const payload = await fetchAllMergedPullRequests('t', 'o', 'n', post);
  assert.deepEqual(calls.map((c) => c.after), [null, 'c1']);
  const verdict = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payload,
  });
  assert.equal(verdict.exitCode, 0);
  assert.equal(verdict.remoteMergedPtToday, 1);
});

test('a failed page in the middle of the read fails closed', async () => {
  const calls = [];
  const post = async (_t, variables) => {
    calls.push(variables);
    if (calls.length === 1) {
      return { data: { repository: { pullRequests: {
        totalCount: 3,
        pageInfo: { hasNextPage: true, endCursor: 'c1' },
        nodes: [makeNode(3, '2026-11-27T18:00:00Z', [])],
      } } } };
    }
    return { errors: [{ message: 'timeout' }], data: null };
  };
  const payload = await fetchAllMergedPullRequests('t', 'o', 'n', post);
  const verdict = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payload,
  });
  assert.equal(verdict.exitCode, 2);
});

test('duplicate PR numbers in the merged list are refused', () => {
  const verdict = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf([
      makeNode(7, '2026-11-20T18:00:00Z', []),
      makeNode(7, '2026-11-20T18:00:00Z', []),
    ]),
  });
  assert.equal(verdict.exitCode, 2);
});

test('a PR number that is not a positive integer is refused', () => {
  for (const bad of [null, undefined, '193', 1.5, 0, -1, Number.NaN]) {
    const verdict = evaluateDailySignalCap({
      changedPaths: SIGNAL_CANDIDATE,
      todayPt: '2026-11-28',
      graphqlPayload: payloadOf([makeNode(bad, '2026-11-20T18:00:00Z', [])]),
    });
    assert.equal(verdict.exitCode, 2, `number=${String(bad)}`);
  }
});

test('a merged list without an explicit last-page marker is refused', () => {
  for (const pageInfo of [undefined, null, {}, { hasNextPage: 'false' }]) {
    const payload = payloadOf([makeNode(7, '2026-11-20T18:00:00Z', [])]);
    payload.data.repository.pullRequests.pageInfo = pageInfo;
    const verdict = evaluateDailySignalCap({
      changedPaths: SIGNAL_CANDIDATE,
      todayPt: '2026-11-28',
      graphqlPayload: payload,
    });
    assert.equal(verdict.exitCode, 2, JSON.stringify(pageInfo));
  }
});

test('null PR nodes and null file nodes are refused', () => {
  const nullPr = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf([null]),
  });
  assert.equal(nullPr.exitCode, 2);
  const node = makeNode(7, '2026-11-28T18:00:00Z', []);
  node.files.nodes = [null];
  node.files.totalCount = 1;
  const nullFile = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf([node]),
  });
  assert.equal(nullFile.exitCode, 2);
});

test('a merged time that is missing, malformed or has no timezone is refused', () => {
  const bad = [
    null,
    undefined,
    '',
    'not-a-date',
    1764352800000,
    '2026-11-28',
    '2026-11-28T18:00:00',
    '2026-11-28 18:00:00Z',
    '2026-11-28T18:00Z',
    '2026-13-45T18:00:00Z',
    'Sat, 28 Nov 2026 18:00:00 GMT',
  ];
  for (const mergedAt of bad) {
    const verdict = evaluateDailySignalCap({
      changedPaths: SIGNAL_CANDIDATE,
      todayPt: '2026-11-28',
      graphqlPayload: payloadOf([makeNode(7, mergedAt, ['inbox/2026-11-28-one.md'])]),
    });
    assert.equal(verdict.exitCode, 2, `mergedAt=${String(mergedAt)}`);
    assert.equal(verdict.reason, 'REMOTE_RECONCILE_FAILED');
  }
});

test('merged times are bucketed by the Pacific day, across midnight and daylight saving', () => {
  assert.equal(formatPacificDay('2026-11-28T07:59:59Z'), '2026-11-27');
  assert.equal(formatPacificDay('2026-11-28T08:00:00Z'), '2026-11-28');
  assert.equal(formatPacificDay('2026-07-04T06:59:59Z'), '2026-07-03');
  assert.equal(formatPacificDay('2026-07-04T07:00:00Z'), '2026-07-04');
  assert.equal(formatPacificDay('2026-11-28T00:30:00-08:00'), '2026-11-28');
  assert.equal(formatPacificDay('2026-11-28T08:00:00.123Z'), '2026-11-28');
});
