/**
 * Tests for compileContent.ts substrate integration.
 * Uses node:test runner via tsx (no new test framework dependencies).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
  resolveSubstratePath,
  readSubstrateCanonicals,
  mapSubstrateToEntry,
  deriveTagsFromLayer,
  deriveContextFromLayer,
  mergeEntriesDedupBySlug,
  type ParsedEntry,
} from '../scripts/compileContent.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_SUBSTRATE = path.join(__dirname, 'fixtures', 'substrate');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function clearEnv(name: string): string | undefined {
  const prior = process.env[name];
  delete process.env[name];
  return prior;
}

function restoreEnv(name: string, prior: string | undefined): void {
  if (prior === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = prior;
  }
}

function makeInboxEntry(slug: string, title: string): ParsedEntry {
  return {
    slug,
    title,
    date: '2026-03-06',
    timestamp: '12:00 PM PT',
    type: 'short-essay',
    typeEnum: 'EntryType.ShortEssay',
    context: 'Systems',
    tags: ['systems'],
    fields: { claim: 'inbox-claim', implication: 'inbox-implication', content: 'inbox body' },
    body: 'inbox body',
    source: 'inbox',
  };
}

// ---------------------------------------------------------------------------
// resolveSubstratePath
// ---------------------------------------------------------------------------

test('resolveSubstratePath returns SUBSTRATE_PATH when env set and dir exists', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const tmp = mkTempDir('substrate-env-');
  process.env.SUBSTRATE_PATH = tmp;
  try {
    // Project root irrelevant when env wins
    const projectRoot = mkTempDir('projroot-');
    const resolved = resolveSubstratePath(projectRoot);
    assert.equal(resolved, tmp);
  } finally {
    restoreEnv('SUBSTRATE_PATH', prior);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('resolveSubstratePath falls back to sibling when env unset and sibling exists', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const parent = mkTempDir('parent-');
  const projectRoot = path.join(parent, 'danmercede.online');
  const sibling = path.join(parent, 'dan-mercede-substrate');
  fs.mkdirSync(projectRoot);
  fs.mkdirSync(sibling);
  try {
    const resolved = resolveSubstratePath(projectRoot);
    assert.equal(resolved, sibling);
  } finally {
    restoreEnv('SUBSTRATE_PATH', prior);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('resolveSubstratePath returns null when neither env nor sibling exists', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const parent = mkTempDir('parent-');
  const projectRoot = path.join(parent, 'consumer-only');
  fs.mkdirSync(projectRoot);
  try {
    const resolved = resolveSubstratePath(projectRoot);
    assert.equal(resolved, null);
  } finally {
    restoreEnv('SUBSTRATE_PATH', prior);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('resolveSubstratePath falls back to sibling when SUBSTRATE_PATH points to nonexistent dir', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const parent = mkTempDir('parent-');
  const projectRoot = path.join(parent, 'consumer');
  const sibling = path.join(parent, 'dan-mercede-substrate');
  fs.mkdirSync(projectRoot);
  fs.mkdirSync(sibling);
  process.env.SUBSTRATE_PATH = '/this/path/does/not/exist/anywhere';
  try {
    const resolved = resolveSubstratePath(projectRoot);
    assert.equal(resolved, sibling);
  } finally {
    restoreEnv('SUBSTRATE_PATH', prior);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// readSubstrateCanonicals — filters
// ---------------------------------------------------------------------------

test('readSubstrateCanonicals filters canonicals not targeting danmercede.online', () => {
  const entries = readSubstrateCanonicals(FIXTURE_SUBSTRATE);
  const slugs = entries.map(e => e.slug);
  assert.ok(!slugs.includes('2026-05-21-wrong-surface'), 'wrong-surface fixture must be filtered out');
});

test('readSubstrateCanonicals filters non-canonical status', () => {
  const entries = readSubstrateCanonicals(FIXTURE_SUBSTRATE);
  const slugs = entries.map(e => e.slug);
  assert.ok(!slugs.includes('2026-05-22-draft-status'), 'draft-status fixture must be filtered out');
});

test('readSubstrateCanonicals admits valid fixture with full layer-derived mapping', () => {
  const entries = readSubstrateCanonicals(FIXTURE_SUBSTRATE);
  const valid = entries.find(e => e.slug === '2026-05-20-valid-target-canonical');
  assert.ok(valid, 'valid fixture must be admitted');
  // Verify the FULL file-read → mapper path produces the locked layer-derivation:
  // layer "authority-gate" → tags ["governance", "execution"] + context "Governance"
  assert.deepEqual(valid!.tags, ['governance', 'execution']);
  assert.equal(valid!.context, 'Governance');
  assert.equal(valid!.typeEnum, 'EntryType.ShortEssay');
});

test('readSubstrateCanonicals returns [] on missing canonical dir', () => {
  const tmp = mkTempDir('empty-substrate-');
  try {
    const entries = readSubstrateCanonicals(tmp);
    assert.deepEqual(entries, []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// mapSubstrateToEntry — type/layer/context mappings
// ---------------------------------------------------------------------------

test('mapSubstrateToEntry maps essay-long → short-essay → EntryType.ShortEssay', () => {
  const data = {
    slug: 'test-essay-long',
    title: 'Test Essay Long',
    date: '2026-05-20T07:00:00-07:00',
    type: 'essay-long',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    claim: 'c',
    implication: 'i',
    status: 'canonical',
  };
  const entry = mapSubstrateToEntry(data, 'body', 'test.md');
  assert.ok(entry, 'expected entry, got null');
  assert.equal(entry!.type, 'short-essay');
  assert.equal(entry!.typeEnum, 'EntryType.ShortEssay');
});

test('mapSubstrateToEntry: layer authority-gate → tags [governance, execution] + context Governance', () => {
  const data = {
    slug: 'authority-gate-test',
    title: 'Authority Gate Test',
    date: '2026-05-20T07:00:00-07:00',
    type: 'essay-long',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    claim: 'c',
    implication: 'i',
    status: 'canonical',
  };
  const entry = mapSubstrateToEntry(data, 'body', 'test.md');
  assert.ok(entry);
  assert.deepEqual(entry!.tags, ['governance', 'execution']);
  assert.equal(entry!.context, 'Governance');
});

test('mapSubstrateToEntry filters wrong surface_targets', () => {
  const data = {
    slug: 'linkedin-only',
    title: 'LinkedIn Only',
    date: '2026-05-20T07:00:00-07:00',
    type: 'essay-long',
    surface_targets: ['linkedin'],
    layer: 'authority-gate',
    claim: 'c',
    implication: 'i',
    status: 'canonical',
  };
  const entry = mapSubstrateToEntry(data, 'body', 'test.md');
  assert.equal(entry, null);
});

test('mapSubstrateToEntry filters non-canonical status', () => {
  const data = {
    slug: 'draft-status',
    title: 'Draft',
    date: '2026-05-20T07:00:00-07:00',
    type: 'essay-long',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    claim: 'c',
    implication: 'i',
    status: 'draft',
  };
  const entry = mapSubstrateToEntry(data, 'body', 'test.md');
  assert.equal(entry, null);
});

test('mapSubstrateToEntry skips unmapped type', () => {
  const data = {
    slug: 'unmapped-type',
    title: 'Unmapped',
    date: '2026-05-20T07:00:00-07:00',
    type: 'micro-burst',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    claim: 'c',
    implication: 'i',
    status: 'canonical',
  };
  const entry = mapSubstrateToEntry(data, 'body', 'test.md');
  assert.equal(entry, null);
});

test('mapSubstrateToEntry skips missing required fields', () => {
  const data = {
    slug: 'missing-claim',
    title: 'Missing Claim',
    date: '2026-05-20T07:00:00-07:00',
    type: 'essay-long',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    // claim missing
    implication: 'i',
    status: 'canonical',
  } as Record<string, unknown>;
  const entry = mapSubstrateToEntry(data, 'body', 'test.md');
  assert.equal(entry, null);
});

// ---------------------------------------------------------------------------
// deriveTagsFromLayer / deriveContextFromLayer
// ---------------------------------------------------------------------------

test('deriveTagsFromLayer: known layers', () => {
  assert.deepEqual(deriveTagsFromLayer('authority-gate'), ['governance', 'execution']);
  assert.deepEqual(deriveTagsFromLayer('immutable-receipts'), ['governance', 'infra']);
  assert.deepEqual(deriveTagsFromLayer('drift-guard'), ['governance', 'failure-modes']);
  assert.deepEqual(deriveTagsFromLayer('gated-substrate'), ['security', 'infra']);
});

test('deriveTagsFromLayer: unknown/missing falls back to ["governance"]', () => {
  assert.deepEqual(deriveTagsFromLayer('unknown-layer'), ['governance']);
  assert.deepEqual(deriveTagsFromLayer(undefined), ['governance']);
  assert.deepEqual(deriveTagsFromLayer(null), ['governance']);
});

test('deriveContextFromLayer: known layers', () => {
  assert.equal(deriveContextFromLayer('authority-gate'), 'Governance');
  assert.equal(deriveContextFromLayer('immutable-receipts'), 'Governance');
  assert.equal(deriveContextFromLayer('drift-guard'), 'Systems');
  assert.equal(deriveContextFromLayer('gated-substrate'), 'Infra');
});

test('deriveContextFromLayer: unknown/missing returns undefined', () => {
  assert.equal(deriveContextFromLayer('unknown'), undefined);
  assert.equal(deriveContextFromLayer(undefined), undefined);
});

// ---------------------------------------------------------------------------
// mergeEntriesDedupBySlug
// ---------------------------------------------------------------------------

test('mergeEntriesDedupBySlug: substrate wins on slug conflict', () => {
  const inbox = [makeInboxEntry('shared-slug', 'INBOX title')];
  const substrate: ParsedEntry[] = [{
    slug: 'shared-slug',
    title: 'SUBSTRATE title',
    date: '2026-03-06',
    timestamp: '01:00 PM PT',
    type: 'short-essay',
    typeEnum: 'EntryType.ShortEssay',
    context: 'Governance',
    tags: ['governance', 'execution'],
    fields: { claim: 'substrate-claim', implication: 'substrate-implication', content: 'substrate body' },
    body: 'substrate body',
    source: 'substrate',
  }];
  const merged = mergeEntriesDedupBySlug(inbox, substrate);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].title, 'SUBSTRATE title');
  assert.equal(merged[0].source, 'substrate');
  // Substrate is the canonical authority on the FULL entry payload, not just title.
  // Verify claim and body are also replaced (not just the headline metadata).
  assert.equal(merged[0].fields.claim, 'substrate-claim');
  assert.equal(merged[0].body, 'substrate body');
});

test('readSubstrateCanonicals + mergeEntriesDedupBySlug: end-to-end conflict resolution via real fixture', () => {
  // Exercises the FULL file-read → mapping → merge path against the conflict fixture,
  // proving substrate-wins precedence holds after gray-matter parse + mapper, not just
  // when both sides are inline literals (as in the test above).
  const entries = readSubstrateCanonicals(FIXTURE_SUBSTRATE);
  const conflict = entries.find(e => e.slug === '2026-03-06-execution-boundary-deterministic-governance');
  assert.ok(conflict, 'conflict fixture must be admitted by readSubstrateCanonicals');
  assert.equal(conflict!.title, 'SUBSTRATE Version: Execution Boundary');
  assert.equal(conflict!.source, 'substrate');
  assert.equal(conflict!.fields.claim, 'Substrate-side claim wins on slug conflict.');

  // Inbox entry with the SAME slug as the conflict fixture (matches a real inbox slug).
  const inboxConflict = makeInboxEntry(
    '2026-03-06-execution-boundary-deterministic-governance',
    'INBOX Version: Should Be Replaced'
  );
  const merged = mergeEntriesDedupBySlug([inboxConflict], [conflict!]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].title, 'SUBSTRATE Version: Execution Boundary');
  assert.equal(merged[0].source, 'substrate');
  assert.equal(merged[0].fields.claim, 'Substrate-side claim wins on slug conflict.');
});

test('mergeEntriesDedupBySlug preserves inbox-only entries when no substrate conflict', () => {
  const inbox = [
    makeInboxEntry('inbox-only-1', 'Inbox One'),
    makeInboxEntry('inbox-only-2', 'Inbox Two'),
  ];
  const substrate: ParsedEntry[] = [{
    slug: 'substrate-only',
    title: 'Substrate Only',
    date: '2026-05-20',
    timestamp: '07:00 AM PT',
    type: 'short-essay',
    typeEnum: 'EntryType.ShortEssay',
    context: 'Governance',
    tags: ['governance', 'execution'],
    fields: { claim: 'c', implication: 'i', content: 'body' },
    body: 'body',
    source: 'substrate',
  }];
  const merged = mergeEntriesDedupBySlug(inbox, substrate);
  const slugs = merged.map(e => e.slug).sort();
  assert.deepEqual(slugs, ['inbox-only-1', 'inbox-only-2', 'substrate-only']);
});

test('mergeEntriesDedupBySlug preserves all inbox entries when substrate empty', () => {
  const inbox = [
    makeInboxEntry('a', 'A'),
    makeInboxEntry('b', 'B'),
  ];
  const merged = mergeEntriesDedupBySlug(inbox, []);
  assert.equal(merged.length, 2);
});
