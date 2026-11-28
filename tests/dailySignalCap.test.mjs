import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  evaluateDailySignalCap,
  fetchAllMergedPullRequests,
  formatPacificDay,
  isFrontmatterPreservingEdit,
  isInboxSignalPath,
  postGraphql,
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
  fs.writeFileSync(path.join(dir, 'inbox', 'existing.md'), '---\nslug: existing\n---\none\n');
  fs.writeFileSync(path.join(dir, 'inbox', 'doomed.md'), '---\nslug: doomed\n---\ntwo\n');
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
    fs.writeFileSync(path.join(d, 'inbox', 'existing.md'), '---\nslug: existing\n---\none, edited\n');
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
    fs.writeFileSync(path.join(d, 'inbox', 'existing.md'), '---\nslug: existing\n---\none, edited\n');
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

test('the cap is 3 per Pacific day by default: the third signal is admitted, the fourth is not', () => {
  const today = (n) =>
    Array.from({ length: n }, (_, i) =>
      makeNode(200 + i, '2026-11-28T18:00:00Z', [`inbox/2026-11-28-${i}.md`]),
    );
  const third = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf(today(2)),
  });
  assert.equal(third.dailyCap, 3);
  assert.equal(third.exitCode, 0);
  assert.equal(third.projectedTotalPtToday, 3);
  const fourth = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf(today(3)),
  });
  assert.equal(fourth.dailyCap, 3);
  assert.equal(fourth.exitCode, 4);
  const twoAtOnce = evaluateDailySignalCap({
    changedPaths: ['inbox/2026-11-28-x.md', 'inbox/2026-11-28-y.md'],
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf(today(2)),
  });
  assert.equal(twoAtOnce.exitCode, 4);
});

// Runs the real CLI in a throwaway repo with no token in the environment, so
// it can never reach the network.
function runCliIn(dir, env) {
  const toolPath = path.resolve(import.meta.dirname, '..', 'tools', 'checkDailySignalCap.mjs');
  const childEnv = { PATH: process.env.PATH, HOME: dir, ...env };
  try {
    const stdout = execFileSync(process.execPath, [toolPath], {
      cwd: dir,
      env: childEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, verdict: JSON.parse(stdout) };
  } catch (err) {
    return { code: err.status, verdict: JSON.parse(err.stdout) };
  }
}

test('CLI: a non-signal PR passes with no token and no remote read', (t) => {
  const { dir, baseSha } = makeRepo(t, (d) => {
    fs.writeFileSync(path.join(d, 'README.md'), 'readme, edited\n');
    fs.writeFileSync(path.join(d, 'inbox', 'existing.md'), '---\nslug: existing\n---\none, edited\n');
  });
  const { code, verdict } = runCliIn(dir, { BASE_SHA: baseSha });
  assert.equal(code, 0);
  assert.equal(verdict.status, 'skipped_non_signal');
});

test('CLI: a signal PR with no token fails closed', (t) => {
  const { dir, baseSha } = makeRepo(t, (d) => {
    fs.writeFileSync(path.join(d, 'inbox', 'new.md'), 'brand new\n');
  });
  const { code, verdict } = runCliIn(dir, { BASE_SHA: baseSha });
  assert.equal(code, 2);
  assert.equal(verdict.reason, 'MISSING_GITHUB_TOKEN');
});

test('CLI: an unusable base commit fails closed instead of passing', (t) => {
  const { dir } = makeRepo(t, (d) => {
    fs.writeFileSync(path.join(d, 'inbox', 'new.md'), 'brand new\n');
  });
  const malformed = runCliIn(dir, { BASE_SHA: 'main; echo x' });
  assert.equal(malformed.code, 2);
  const unknown = runCliIn(dir, { BASE_SHA: 'a'.repeat(40) });
  assert.equal(unknown.code, 2);
});

// Loopback HTTP server that misbehaves in one chosen way. No external network.
async function startServer(t, mode) {
  const sockets = new Set();
  const server = http.createServer((req, res) => {
    req.resume();
    if (mode === 'truncate-content-length') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': 1000 });
      res.write('{"data":{"repository":{"pullRequests":{"totalCount":0,');
      setTimeout(() => res.socket.destroy(), 20);
    } else if (mode === 'truncate-chunked') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write('{"data":{"repository":{"pullRequests":{"totalCount":0,');
      setTimeout(() => res.socket.destroy(), 20);
    } else if (mode === 'hang') {
      // never answers
    } else if (mode === 'complete-empty-history') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: { repository: { pullRequests: {
        totalCount: 0, pageInfo: { hasNextPage: false, endCursor: null }, nodes: [],
      } } } }));
    }
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  t.after(() => {
    for (const socket of sockets) socket.destroy();
    server.close();
  });
  return `http://127.0.0.1:${port}/graphql`;
}

// A loopback port with nothing listening on it.
async function closedEndpoint() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return `http://127.0.0.1:${port}/graphql`;
}

// Settles to 'rejected', 'resolved' or 'never-settled' within the window.
function outcomeOf(promise, windowMs = 3000) {
  let timer;
  const never = new Promise((resolve) => {
    timer = setTimeout(() => resolve('never-settled'), windowMs);
  });
  return Promise.race([
    promise.then(() => 'resolved', () => 'rejected'),
    never,
  ]).finally(() => clearTimeout(timer));
}

for (const mode of ['truncate-content-length', 'truncate-chunked']) {
  test(`transport: a response cut mid-body rejects (${mode})`, async (t) => {
    const endpoint = await startServer(t, mode);
    const outcome = await outcomeOf(postGraphql('t', {}, { endpoint, timeoutMs: 2000 }));
    assert.equal(outcome, 'rejected');
  });
}

test('transport: connection refused rejects', async () => {
  const endpoint = await closedEndpoint();
  assert.equal(await outcomeOf(postGraphql('t', {}, { endpoint, timeoutMs: 2000 })), 'rejected');
});

test('transport: a server that never answers rejects at the timeout', async (t) => {
  const endpoint = await startServer(t, 'hang');
  assert.equal(await outcomeOf(postGraphql('t', {}, { endpoint, timeoutMs: 200 })), 'rejected');
});

test('transport: a complete response resolves with the parsed body', async (t) => {
  const endpoint = await startServer(t, 'complete-empty-history');
  const body = await postGraphql('t', {}, { endpoint, timeoutMs: 2000 });
  assert.equal(body.data.repository.pullRequests.totalCount, 0);
});

// Async CLI run (the loopback server lives in this process, so no execFileSync).
function runCliAsync(dir, env) {
  const toolPath = path.resolve(import.meta.dirname, '..', 'tools', 'checkDailySignalCap.mjs');
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [toolPath],
      { cwd: dir, env: { PATH: process.env.PATH, HOME: dir, ...env }, encoding: 'utf8', timeout: 20000 },
      (err, stdout) => resolve({ code: err ? err.code : 0, stdout }),
    );
  });
}

function signalRepo(t) {
  return makeRepo(t, (d) => {
    fs.writeFileSync(path.join(d, 'inbox', 'new.md'), '---\nslug: new\n---\nbody\n');
  });
}

for (const mode of ['truncate-content-length', 'truncate-chunked', 'hang']) {
  test(`CLI: a signal PR never passes when the remote read is cut or hangs (${mode})`, async (t) => {
    const endpoint = await startServer(t, mode);
    const { dir, baseSha } = signalRepo(t);
    const { code, stdout } = await runCliAsync(dir, {
      BASE_SHA: baseSha,
      GITHUB_TOKEN: 'test-token',
      SIGNAL_CAP_TEST_ENDPOINT: endpoint,
      SIGNAL_CAP_TEST_TIMEOUT_MS: '300',
    });
    assert.equal(code, 2);
    assert.equal(JSON.parse(stdout).status, 'blocked');
  });
}

test('CLI: a signal PR never passes when the connection is refused', async (t) => {
  const endpoint = await closedEndpoint();
  const { dir, baseSha } = signalRepo(t);
  const { code } = await runCliAsync(dir, {
    BASE_SHA: baseSha,
    GITHUB_TOKEN: 'test-token',
    SIGNAL_CAP_TEST_ENDPOINT: endpoint,
  });
  assert.equal(code, 2);
});

test('CLI: a signal PR is admitted on a complete read of an empty history', async (t) => {
  const endpoint = await startServer(t, 'complete-empty-history');
  const { dir, baseSha } = signalRepo(t);
  const { code, stdout } = await runCliAsync(dir, {
    BASE_SHA: baseSha,
    GITHUB_TOKEN: 'test-token',
    SIGNAL_CAP_TEST_ENDPOINT: endpoint,
  });
  assert.equal(code, 0);
  assert.equal(JSON.parse(stdout).status, 'admitted');
});

test('CLI: the test endpoint override is refused unless it is loopback http', async (t) => {
  const { dir, baseSha } = signalRepo(t);
  const { code, stdout } = await runCliAsync(dir, {
    BASE_SHA: baseSha,
    GITHUB_TOKEN: 'test-token',
    SIGNAL_CAP_TEST_ENDPOINT: 'http://example.invalid/graphql',
  });
  assert.equal(code, 2);
  assert.match(stdout, /SIGNAL_CAP_TEST_ENDPOINT/);
});

const entry = (slug, body = 'body') => `---\ntitle: T\nslug: ${slug}\ndate: '2026-11-28T10:00:00-0800'\n---\n${body}\n`;

// Repo whose base commit holds inbox/kept.md with the given content.
function slugRepo(t, baseContent, headContent) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-cap-slug-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid',
      '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args],
    { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  fs.mkdirSync(path.join(dir, 'inbox'));
  fs.writeFileSync(path.join(dir, 'inbox', 'kept.md'), baseContent);
  fs.writeFileSync(path.join(dir, 'inbox', 'gone.md'), entry('gone'));
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  const baseSha = git('rev-parse', 'HEAD');
  if (headContent === null) {
    fs.rmSync(path.join(dir, 'inbox', 'kept.md'));
  } else {
    fs.writeFileSync(path.join(dir, 'inbox', 'kept.md'), headContent);
  }
  git('add', '-A');
  git('commit', '-q', '-m', 'change');
  return { dir, baseSha };
}

const BASE_ENTRY = entry('kept');
const isSignal = (t, base, head) => {
  const { dir, baseSha } = slugRepo(t, base, head);
  const added = resolveAddedPaths({ cwd: dir, env: { BASE_SHA: baseSha } });
  assert.ok(added.length === 0 || (added.length === 1 && added[0] === 'inbox/kept.md'));
  return added.length === 1;
};

test('a body-only edit of an inbox entry is not a signal and passes without the remote', (t) => {
  const { dir, baseSha } = slugRepo(t, BASE_ENTRY, entry('kept', 'typo fixed\n\nand a new paragraph'));
  assert.deepEqual(resolveAddedPaths({ cwd: dir, env: { BASE_SHA: baseSha } }), []);
  const { code, verdict } = runCliIn(dir, { BASE_SHA: baseSha });
  assert.equal(code, 0);
  assert.equal(verdict.status, 'skipped_non_signal');
});

test('a modified inbox entry whose slug changed is a signal', (t) => {
  const { dir, baseSha } = slugRepo(t, BASE_ENTRY, entry('a-whole-new-entry', 'new body'));
  assert.deepEqual(resolveAddedPaths({ cwd: dir, env: { BASE_SHA: baseSha } }), ['inbox/kept.md']);
  const { code, verdict } = runCliIn(dir, { BASE_SHA: baseSha });
  assert.equal(code, 2);
  assert.equal(verdict.reason, 'MISSING_GITHUB_TOKEN');
});

test('frontmatter that a YAML parser reads differently from a line reader is a signal', (t) => {
  // Each head keeps the literal base line `slug: kept` somewhere, yet the
  // compiler's parser would publish a different entry.
  const fm = (inner) => `---\n${inner}\n---\nbody\n`;
  const baseInner = "title: T\nslug: kept\ndate: '2026-11-28T10:00:00-0800'";
  const bypasses = {
    'second key spelled with a YAML escape': fm(`${baseInner}\n"\\x73lug": brand-new-entry`),
    'explicit key form': fm(`title: T\n? slug\n: brand-new-entry\ndate: '2026-11-28T10:00:00-0800'\nnote: |\n  x\nslug: kept`),
    'tagged key': fm(`title: T\n!!str slug: brand-new-entry\ndate: '2026-11-28T10:00:00-0800'`) + 'slug: kept\n',
    'anchor and alias': fm(`title: T\nreal: &s brand-new-entry\n? slug\n: *s\ndate: '2026-11-28T10:00:00-0800'`),
    'early close line of four dashes': `---\ntitle: T\nslug: brand-new-entry\n----\nslug: kept\n---\nbody\n`,
    'early close line with a trailing space': `---\ntitle: T\nslug: brand-new-entry\n--- \nslug: kept\n---\nbody\n`,
    'early close line with trailing text': `---\ntitle: T\nslug: brand-new-entry\n---x\nslug: kept\n---\nbody\n`,
  };
  for (const [label, head] of Object.entries(bypasses)) {
    assert.equal(isSignal(t, BASE_ENTRY, head), true, label);
  }
});

test('any frontmatter change is a signal: date, title, key order, added key, line endings, BOM', (t) => {
  const changes = {
    'changed date (re-dates the entry)': BASE_ENTRY.replace('2026-11-28T10', '2026-11-29T10'),
    'changed title': BASE_ENTRY.replace('title: T', 'title: Other'),
    'key order': `---\nslug: kept\ntitle: T\ndate: '2026-11-28T10:00:00-0800'\n---\nbody\n`,
    'added key': BASE_ENTRY.replace('title: T\n', 'title: T\ntags: [x]\n'),
    'LF to CRLF': BASE_ENTRY.replaceAll('\n', '\r\n'),
    'leading BOM': `﻿${BASE_ENTRY}`,
    'engine tag on the open line': BASE_ENTRY.replace('---\n', '---js\n'),
    'trailing space in a value': BASE_ENTRY.replace('title: T\n', 'title: T \n'),
  };
  for (const [label, head] of Object.entries(changes)) {
    assert.equal(isSignal(t, BASE_ENTRY, head), true, label);
  }
});

test('a base entry without the strict frontmatter shape makes any edit a signal', (t) => {
  const bases = {
    'no frontmatter': 'just text\n',
    'open line has trailing text': `---yaml\nslug: kept\n---\nbody\n`,
    'never closed': `---\nslug: kept\nbody\n`,
    'close only as four dashes': `---\nslug: kept\n----\nbody\n`,
    'close is the second line': `---\n---\nslug: kept\n---\nbody\n`,
    'close has no newline after it': `---\nslug: kept\n---`,
    'leading BOM': `﻿---\nslug: kept\n---\nbody\n`,
    'leading blank line': `\n---\nslug: kept\n---\nbody\n`,
    'CRLF open with LF close': `---\r\nslug: kept\n---\nbody\n`,
  };
  for (const [label, base] of Object.entries(bases)) {
    assert.equal(isSignal(t, base, `${base}edited\n`), true, label);
  }
});

test('a head cut inside the frontmatter is a signal; a CRLF entry with identical frontmatter is not', (t) => {
  assert.equal(isSignal(t, BASE_ENTRY, BASE_ENTRY.slice(0, 20)), true);
  assert.equal(isSignal(t, BASE_ENTRY, '---\ntitle: T\nslug: kept\n'), true);
  const crlf = BASE_ENTRY.replaceAll('\n', '\r\n');
  assert.equal(isSignal(t, crlf, `${crlf}more body\r\n`), false);
  assert.equal(isSignal(t, crlf, `${crlf}mixed ending body\n`), false);
});

test('a deleted entry is not a signal', (t) => {
  assert.equal(isSignal(t, BASE_ENTRY, null), false);
});

test('prefix rule: unreadable blobs and non-buffers are never a frontmatter-preserving edit', () => {
  const base = Buffer.from(BASE_ENTRY);
  const head = Buffer.from(`${BASE_ENTRY}more\n`);
  assert.equal(isFrontmatterPreservingEdit(base, head), true);
  assert.equal(isFrontmatterPreservingEdit(null, head), false);
  assert.equal(isFrontmatterPreservingEdit(base, null), false);
  assert.equal(isFrontmatterPreservingEdit(undefined, undefined), false);
  assert.equal(isFrontmatterPreservingEdit(BASE_ENTRY, `${BASE_ENTRY}more\n`), false);
  // Invalid UTF-8 is compared as bytes, never decoded.
  const rawBase = Buffer.concat([Buffer.from('---\nslug: kept\nx: '), Buffer.from([0xff, 0xfe]), Buffer.from('\n---\nbody\n')]);
  const rawHead = Buffer.concat([Buffer.from('---\nslug: kept\nx: '), Buffer.from([0xff, 0xfd]), Buffer.from('\n---\nbody\n')]);
  assert.equal(isFrontmatterPreservingEdit(rawBase, rawBase), true);
  assert.equal(isFrontmatterPreservingEdit(rawBase, rawHead), false);
});

test('a modified inbox symlink is a signal whatever its target text says', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-cap-link-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid',
      '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', '-c', 'core.symlinks=true', ...args],
    { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  fs.mkdirSync(path.join(dir, 'inbox'));
  fs.symlinkSync('---\nslug: kept\n---\na', path.join(dir, 'inbox', 'link.md'));
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  const baseSha = git('rev-parse', 'HEAD');
  fs.rmSync(path.join(dir, 'inbox', 'link.md'));
  fs.symlinkSync('---\nslug: kept\n---\nb', path.join(dir, 'inbox', 'link.md'));
  git('add', '-A');
  git('commit', '-q', '-m', 'change');
  assert.deepEqual(resolveAddedPaths({ cwd: dir, env: { BASE_SHA: baseSha } }), ['inbox/link.md']);
});

test('an other-day merged PR with null or malformed files does not block a later signal PR', () => {
  for (const files of [null, undefined, {}, { totalCount: 'x', nodes: [] }, { totalCount: 1, nodes: null }]) {
    const old = makeNode(150, '2026-08-23T19:57:16Z', []);
    old.files = files;
    const verdict = evaluateDailySignalCap({
      changedPaths: SIGNAL_CANDIDATE,
      todayPt: '2026-11-28',
      graphqlPayload: payloadOf([old, makeNode(200, '2026-11-28T18:00:00Z', ['inbox/2026-11-28-one.md'])]),
    });
    assert.equal(verdict.exitCode, 0, JSON.stringify(files));
    assert.equal(verdict.remoteMergedPtToday, 1);
  }
});

test('a target-day merged PR with null or malformed files still fails closed', () => {
  for (const files of [null, undefined, {}, { totalCount: 'x', nodes: [] }, { totalCount: 1, nodes: null }]) {
    const today = makeNode(200, '2026-11-28T18:00:00Z', []);
    today.files = files;
    const verdict = evaluateDailySignalCap({
      changedPaths: SIGNAL_CANDIDATE,
      todayPt: '2026-11-28',
      graphqlPayload: payloadOf([today]),
    });
    assert.equal(verdict.exitCode, 2, JSON.stringify(files));
  }
});

test('an other-day merged PR with a bad merged time still fails closed even when its files are null', () => {
  const old = makeNode(150, '2026-08-23', []);
  old.files = null;
  const verdict = evaluateDailySignalCap({
    changedPaths: SIGNAL_CANDIDATE,
    todayPt: '2026-11-28',
    graphqlPayload: payloadOf([old]),
  });
  assert.equal(verdict.exitCode, 2);
});

// Loopback server that would hand back an empty history, and counts hits.
async function startCountingServer(t) {
  const seen = { connections: 0, requests: 0 };
  const server = http.createServer((req, res) => {
    seen.requests += 1;
    req.resume();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: { repository: { pullRequests: {
      totalCount: 0, pageInfo: { hasNextPage: false, endCursor: null }, nodes: [],
    } } } }));
  });
  server.on('connection', () => { seen.connections += 1; });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return { endpoint: `http://127.0.0.1:${server.address().port}/graphql`, seen };
}

for (const ciEnv of [{ GITHUB_ACTIONS: 'true' }, { CI: 'true' }, { CI: '1' }, { GITHUB_ACTIONS: 'false' }]) {
  test(`CLI: the test endpoint is refused under CI and nothing connects to it (${JSON.stringify(ciEnv)})`, async (t) => {
    const { endpoint, seen } = await startCountingServer(t);
    const { dir, baseSha } = signalRepo(t);
    const { code, stdout } = await runCliAsync(dir, {
      BASE_SHA: baseSha,
      GITHUB_TOKEN: 'test-token',
      SIGNAL_CAP_TEST_ENDPOINT: endpoint,
      ...ciEnv,
    });
    assert.equal(code, 2);
    const verdict = JSON.parse(stdout);
    assert.equal(verdict.status, 'blocked');
    assert.match(verdict.detail, /SIGNAL_CAP_TEST_ENDPOINT/);
    assert.deepEqual(seen, { connections: 0, requests: 0 });
  });
}

test('CLI: under CI even a non-signal PR is refused when the test endpoint is set', async (t) => {
  const { endpoint, seen } = await startCountingServer(t);
  const { dir, baseSha } = makeRepo(t, (d) => {
    fs.writeFileSync(path.join(d, 'README.md'), 'readme, edited\n');
  });
  const { code } = await runCliAsync(dir, {
    BASE_SHA: baseSha,
    SIGNAL_CAP_TEST_ENDPOINT: endpoint,
    SIGNAL_CAP_TEST_TIMEOUT_MS: '5',
    GITHUB_ACTIONS: 'true',
  });
  assert.equal(code, 2);
  assert.deepEqual(seen, { connections: 0, requests: 0 });
});

test('CLI: outside CI the counting server is reached, so the zero-hit assertions above mean something', async (t) => {
  const { endpoint, seen } = await startCountingServer(t);
  const { dir, baseSha } = signalRepo(t);
  const { code } = await runCliAsync(dir, {
    BASE_SHA: baseSha,
    GITHUB_TOKEN: 'test-token',
    SIGNAL_CAP_TEST_ENDPOINT: endpoint,
  });
  assert.equal(code, 0);
  assert.equal(seen.requests, 1);
});

// Fake request/response pair: plays one scripted ending, with no socket, so
// each incomplete-response handler in the transport is pinned on its own.
function fakeRequest(script) {
  return (_endpoint, _options, onResponse) => {
    const req = new EventEmitter();
    req.write = () => {};
    req.destroy = (err) => { if (err) req.emit('error', err); };
    req.end = () => setImmediate(() => script(req, onResponse));
    return req;
  };
}

function fakeResponse({ complete, statusCode = 200 }) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.complete = complete;
  return res;
}

const GOOD_BODY = JSON.stringify({ data: { ok: true } });
const INCOMPLETE_ENDINGS = {
  'end fires while the response is incomplete': (_req, onResponse) => {
    const res = fakeResponse({ complete: false });
    onResponse(res);
    res.emit('data', Buffer.from(GOOD_BODY));
    res.emit('end');
  },
  'close fires without end': (_req, onResponse) => {
    const res = fakeResponse({ complete: false });
    onResponse(res);
    res.emit('data', Buffer.from(GOOD_BODY.slice(0, 5)));
    res.emit('close');
  },
  'aborted fires alone': (_req, onResponse) => {
    const res = fakeResponse({ complete: false });
    onResponse(res);
    res.emit('aborted');
  },
  'the response emits error alone': (_req, onResponse) => {
    const res = fakeResponse({ complete: false });
    onResponse(res);
    res.emit('error', new Error('reset'));
  },
  'the request closes with no response': (req) => {
    req.emit('close');
  },
};

for (const [label, script] of Object.entries(INCOMPLETE_ENDINGS)) {
  test(`transport handler pinned: rejects when ${label}`, async () => {
    // Long timeout on purpose: only the handler under test can settle this.
    const pending = postGraphql('t', {}, { request: fakeRequest(script), timeoutMs: 600000 });
    assert.equal(await outcomeOf(pending, 300), 'rejected');
  });
}

test('transport handler pinned: a complete response through the same fake resolves', async () => {
  const body = await postGraphql('t', {}, {
    timeoutMs: 600000,
    request: fakeRequest((req, onResponse) => {
      const res = fakeResponse({ complete: true });
      onResponse(res);
      res.emit('data', Buffer.from(GOOD_BODY));
      res.emit('end');
      res.emit('close');
      req.emit('close');
    }),
  });
  assert.deepEqual(body, { data: { ok: true } });
});

test('transport handler pinned: a complete non-200 response rejects', async () => {
  const pending = postGraphql('t', {}, {
    timeoutMs: 600000,
    request: fakeRequest((_req, onResponse) => {
      const res = fakeResponse({ complete: true, statusCode: 502 });
      onResponse(res);
      res.emit('data', Buffer.from(GOOD_BODY));
      res.emit('end');
    }),
  });
  assert.equal(await outcomeOf(pending, 300), 'rejected');
});
