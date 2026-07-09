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
  readInboxEntries,
  mapSubstrateToEntry,
  deriveTagsFromLayer,
  deriveTagsFromSubstrate,
  deriveContextFromLayer,
  generateSitemap,
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

test('deriveTagsFromSubstrate prefers valid substrate tags over layer defaults', () => {
  const tags = deriveTagsFromSubstrate('authority-gate', ['economics', 'governance', 'systems']);
  assert.deepEqual(tags, ['economics', 'governance', 'systems']);
});

test('mapSubstrateToEntry maps diagram and copies its asset', () => {
  const substrateRoot = mkTempDir('diagram-substrate-');
  const projectRoot = mkTempDir('diagram-project-');
  const assetRel = path.join('publishing', 'assets', 'diagram-entry', 'diagram.svg');
  const assetPath = path.join(substrateRoot, assetRel);
  fs.mkdirSync(path.dirname(assetPath), { recursive: true });
  fs.writeFileSync(assetPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

  try {
    const data = {
      slug: 'diagram-entry',
      title: 'Diagram Entry',
      date: '2026-03-13T08:00:00-07:00',
      type: 'diagram',
      surface_targets: ['danmercede.online'],
      layer: 'authority-gate',
      tags: ['governance', 'systems', 'execution'],
      alt_text: 'A clean execution diagram.',
      caption: 'The gate sits before the mutation.',
      asset_path: assetRel,
      status: 'canonical',
    };
    const entry = mapSubstrateToEntry(data, 'diagram body', 'diagram-entry.md', substrateRoot, projectRoot);
    assert.ok(entry, 'diagram should be admitted');
    assert.equal(entry!.type, 'diagram');
    assert.equal(entry!.typeEnum, 'EntryType.Diagram');
    assert.deepEqual(entry!.tags, ['governance', 'systems', 'execution']);
    assert.equal(entry!.fields.src, '/assets/diagrams/diagram-entry.svg');
    assert.equal(entry!.fields.alt, 'A clean execution diagram.');
    assert.equal(entry!.fields.caption, 'The gate sits before the mutation.');
    assert.ok(
      fs.existsSync(path.join(projectRoot, 'public', 'assets', 'diagrams', 'diagram-entry.svg')),
      'diagram asset should be copied to public assets',
    );
  } finally {
    fs.rmSync(substrateRoot, { recursive: true, force: true });
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('mapSubstrateToEntry skips unsafe substrate slugs before asset copy', () => {
  const data = {
    slug: '../diagram-entry',
    title: 'Diagram Entry',
    date: '2026-03-13T08:00:00-07:00',
    type: 'diagram',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    alt_text: 'A clean diagram.',
    caption: 'The gate sits before the mutation.',
    asset_path: 'publishing/assets/diagram-entry/diagram.svg',
    status: 'canonical',
  };
  const entry = mapSubstrateToEntry(data, 'diagram body', 'diagram-entry.md', '/tmp/substrate-root', '/tmp/project-root');
  assert.equal(entry, null);
});

test('mapSubstrateToEntry fails closed on branded diagram title metadata', () => {
  const substrateRoot = mkTempDir('diagram-brand-substrate-');
  const projectRoot = mkTempDir('diagram-brand-project-');
  const assetRel = path.join('publishing', 'assets', 'diagram-entry', 'diagram.svg');
  const assetPath = path.join(substrateRoot, assetRel);
  fs.mkdirSync(path.dirname(assetPath), { recursive: true });
  fs.writeFileSync(assetPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

  try {
    assert.throws(
      () =>
        mapSubstrateToEntry(
          {
            slug: 'diagram-entry',
            title: 'Cosmocrat Diagram Entry',
            date: '2026-03-13T08:00:00-07:00',
            type: 'diagram',
            surface_targets: ['danmercede.online'],
            layer: 'authority-gate',
            alt_text: 'A clean diagram.',
            caption: 'The gate sits before the mutation.',
            asset_path: assetRel,
            status: 'canonical',
          },
          'diagram body',
          'diagram-entry.md',
          substrateRoot,
          projectRoot,
        ),
      /Forbidden brand token detected in substrate diagram metadata/,
    );
  } finally {
    fs.rmSync(substrateRoot, { recursive: true, force: true });
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('readInboxEntries fails closed on unsafe slugs', () => {
  const inboxDir = mkTempDir('inbox-bad-slug-');
  try {
    fs.writeFileSync(
      path.join(inboxDir, 'bad-slug.md'),
      `---\nslug: "../bad-slug"\ntitle: "Bad Slug"\ndate: "2026-03-13T08:00:00-07:00"\ntype: "diagram"\ntags: ["governance"]\nsrc: "/assets/diagrams/bad.svg"\nalt: "A clean diagram."\ncaption: "The gate sits before the mutation."\n---\n`,
    );

    const result = readInboxEntries(inboxDir);
    assert.deepEqual(result.entries, []);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].field, 'slug');
    assert.match(result.errors[0].message, /Invalid slug format/);
  } finally {
    fs.rmSync(inboxDir, { recursive: true, force: true });
  }
});

test('readInboxEntries fails closed on branded diagram titles', () => {
  const inboxDir = mkTempDir('inbox-brand-title-');
  try {
    fs.writeFileSync(
      path.join(inboxDir, 'brand-title.md'),
      `---\nslug: "brand-title"\ntitle: "Cosmocrat Diagram"\ndate: "2026-03-13T08:00:00-07:00"\ntype: "diagram"\ntags: ["governance"]\nsrc: "/assets/diagrams/brand-title.svg"\nalt: "A clean diagram."\ncaption: "The gate sits before the mutation."\n---\n`,
    );

    const result = readInboxEntries(inboxDir);
    assert.deepEqual(result.entries, []);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].field, 'brand');
    assert.match(result.errors[0].message, /forbidden brand token in title/);
  } finally {
    fs.rmSync(inboxDir, { recursive: true, force: true });
  }
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

test('mapSubstrateToEntry accepts unquoted YAML date parsed as Date object', () => {
  // gray-matter parses unquoted YAML date scalars (e.g. `date: 2026-05-20`) as JS Date
  // objects, not strings. Regression guard: prior `typeof === string` check would skip
  // such canonicals silently, dropping them from the bundle even though they are valid.
  const data = {
    slug: 'unquoted-date',
    title: 'Unquoted Date',
    date: new Date('2026-05-20T00:00:00Z'),
    type: 'essay-long',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    claim: 'c',
    implication: 'i',
    status: 'canonical',
  };
  const entry = mapSubstrateToEntry(data, 'body', 'test.md');
  assert.ok(entry, 'unquoted YAML date (Date object) must be admitted, not silently skipped');
  assert.equal(entry!.slug, 'unquoted-date');
  // Date object normalized to consumer date string form (date only, no time component).
  assert.match(entry!.date, /^2026-05-20/);
});

test('mapSubstrateToEntry rejects invalid Date object', () => {
  const data = {
    slug: 'bad-date',
    title: 'Bad Date',
    date: new Date('not-a-date'),
    type: 'essay-long',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    claim: 'c',
    implication: 'i',
    status: 'canonical',
  };
  const entry = mapSubstrateToEntry(data, 'body', 'test.md');
  assert.equal(entry, null);
});

test('mapSubstrateToEntry preserves time-of-day for unquoted full ISO timestamps parsed as Date', () => {
  // gray-matter parses an unquoted YAML full ISO timestamp (`date: 2026-05-20T07:00:00-07:00`)
  // as a JS Date for the exact instant. Regression guard against silently rewriting that
  // Date to the date-only noon-PST default — which would publish 12:00 PM PT instead of
  // the canonical 07:00 AM PT timestamp.
  const data = {
    slug: 'full-iso-as-date',
    title: 'Full ISO As Date',
    // The literal value gray-matter would produce for `date: 2026-05-20T07:00:00-07:00`.
    date: new Date('2026-05-20T07:00:00-07:00'),
    type: 'essay-long',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    claim: 'c',
    implication: 'i',
    status: 'canonical',
  };
  const priorTZ = process.env.TZ;
  try {
    process.env.TZ = 'UTC';
    const entry = mapSubstrateToEntry(data, 'body', 'test.md');
    assert.ok(entry, 'full-ISO-as-Date should still be admitted');
    // 07:00 PT is the correct timestamp for the original canonical, not the noon-PST default.
    assert.equal(entry!.timestamp, '07:00 AM PT', 'full ISO Date must preserve exact instant');
    assert.equal(entry!.date, '2026-05-20', 'date field reflects the PT calendar day');
  } finally {
    if (priorTZ === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = priorTZ;
    }
  }
});

test('formatTimestamp/formatDate: PT label correct regardless of host TZ', () => {
  // Regression guard against runner-TZ contamination of "PT"-labeled output.
  // Vercel and most CI runners default to UTC; relying on Date.getHours() / getFullYear()
  // (which use the process TZ) would produce wrong PT timestamps in production builds.
  // Production canonical: 2026-03-06T20:46:21+0000 → 12:46 PM PT (March, pre-DST = UTC-8).
  // formatTimestamp/formatDate are not exported, so exercise them via mapSubstrateToEntry,
  // which calls them after admission.
  const data = {
    slug: 'tz-regression',
    title: 'TZ Regression Probe',
    // 2026-03-06T20:46:21+0000 — same shape as production canonical.
    date: '2026-03-06T20:46:21+0000',
    type: 'essay-long',
    surface_targets: ['danmercede.online'],
    layer: 'authority-gate',
    claim: 'c',
    implication: 'i',
    status: 'canonical',
  };
  const priorTZ = process.env.TZ;
  try {
    // Simulate Vercel runner.
    process.env.TZ = 'UTC';
    const entry = mapSubstrateToEntry(data, 'body', 'tz-test.md');
    assert.ok(entry, 'TZ regression: entry should still be admitted under TZ=UTC');
    assert.equal(entry!.timestamp, '12:46 PM PT', 'PT label must reflect America/Los_Angeles, not host TZ');
    assert.equal(entry!.date, '2026-03-06', 'date must reflect America/Los_Angeles calendar day');
  } finally {
    if (priorTZ === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = priorTZ;
    }
  }
});

test('generateSitemap does NOT emit an image node for diagram entries (S3 demote: the .com hub owns the image-sitemap entry)', () => {
  const xml = generateSitemap([
    {
      slug: 'diagram-entry',
      title: 'Diagram Entry',
      date: '2026-03-13',
      timestamp: '08:00 AM PT',
      type: 'diagram',
      typeEnum: 'EntryType.Diagram',
      tags: ['governance'],
      fields: {
        src: '/assets/diagrams/diagram-entry.svg',
        alt: 'A diagram',
        caption: 'The gate sits before the mutation.',
      },
      body: 'body',
      source: 'substrate',
    },
  ]);
  // The .online page stays listed as an AEO teaser (loc + lastmod present)...
  assert.ok(xml.includes('<loc>https://www.danmercede.online/diagram-entry</loc>'), 'diagram page still listed (teaser)');
  assert.ok(xml.includes('<lastmod>2026-03-13</lastmod>'));
  // ...but it no longer claims the image: the hub (danmercede.com) now owns the
  // <image:image> sitemap entry, so emitting it from both surfaces would split authority.
  assert.ok(!xml.includes('<image:image>'), 'no image node for diagrams after the demote');
  assert.ok(!xml.includes('<image:loc>'), 'no image:loc for diagrams after the demote');
  assert.ok(!xml.includes('/assets/diagrams/diagram-entry.svg'), 'the diagram image url is no longer in the .online sitemap');
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

// ---------------------------------------------------------------------------
// silentShrinkError — fail-closed guard against silent content truncation
// (PR #105 adversarial finding: a compile without a reachable substrate
// regenerates every committed artifact minus all substrate entries, and the
// inbox-only drift gate stays green).
// ---------------------------------------------------------------------------

import { silentShrinkError } from '../scripts/compileContent.ts';

test('shrink guard: blocks a count drop without the explicit override', () => {
  const err = silentShrinkError(72, 97, false);
  assert.ok(err, 'a 97 -> 72 recompile must be blocked');
  assert.match(err!, /SUBSTRATE_PATH/, 'message must name the likely cause + remedy');
  assert.match(err!, /ALLOW_CONTENT_SHRINK/, 'message must name the explicit override');
});

test('shrink guard: blocks a shrink to zero (empty-output path is also gated)', () => {
  assert.ok(silentShrinkError(0, 97, false));
});

test('shrink guard: equal or growing counts pass', () => {
  assert.equal(silentShrinkError(97, 97, false), null);
  assert.equal(silentShrinkError(98, 97, false), null);
});

test('shrink guard: explicit override allows a deliberate shrink', () => {
  assert.equal(silentShrinkError(96, 97, true), null);
});

test('shrink guard: no committed baseline (first run) passes', () => {
  assert.equal(silentShrinkError(72, null, false), null);
});

// Cycle-3 review findings on the guard itself: env override must be strictly
// '1' (not any truthy string), and a CORRUPT baseline must fail closed while a
// genuinely ABSENT baseline (first run) passes.

import { allowShrinkFromEnv, parseCommittedCount } from '../scripts/compileContent.ts';

test('shrink override: only the literal "1" enables it', () => {
  assert.equal(allowShrinkFromEnv('1'), true);
  assert.equal(allowShrinkFromEnv('0'), false);
  assert.equal(allowShrinkFromEnv('false'), false);
  assert.equal(allowShrinkFromEnv('true'), false);
  assert.equal(allowShrinkFromEnv(''), false);
  assert.equal(allowShrinkFromEnv(undefined), false);
});

test('committed baseline: valid count parses, corruption is flagged invalid', () => {
  assert.equal(parseCommittedCount('{"count": 97, "posts": []}'), 97);
  assert.equal(parseCommittedCount('{"count": "97"}'), 'invalid');
  assert.equal(parseCommittedCount('{"posts": []}'), 'invalid');
  assert.equal(parseCommittedCount('not json {'), 'invalid');
});
