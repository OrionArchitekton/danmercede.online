import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

import {
  resolveExternalContext,
  validateExternalContext,
} from '../externalContext.ts';
import { entryArticleHtml } from '../scripts/prerenderBody.ts';
import { buildEntryPageHtml } from '../scripts/perSlugPages.ts';
import { mapSubstrateToEntry } from '../scripts/compileContent.ts';
import { EntryType, type LogEntry, type WorkingNote } from '../types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

test('resolveExternalContext produces a 2-sentence hook, plain-English jargon translation, and canonical danmercede.com guide link for future notes without frontmatter', () => {
  const futureEntry: WorkingNote = {
    id: '2026-12-01-future-canary-probe',
    slug: '2026-12-01-future-canary-probe',
    title: 'Orion preflight canary probe on staging lane',
    date: '2026-12-01',
    timestamp: '09:00 AM PT',
    type: EntryType.WorkingNote,
    tags: ['governance', 'execution'],
    content: 'A fail-closed preflight gate blocks unverified pushes before any receipt is written.',
    openQuestion: 'Which canary check runs fastest before commit?',
  };

  const ctx = resolveExternalContext(futureEntry);
  assert.ok(ctx.whyItMatters.length > 40);
  const sentenceCount = ctx.whyItMatters.split(/[.!?]+(?:\s|$)/).filter(Boolean).length;
  assert.ok(sentenceCount >= 2, `Expected >=2 sentences, got ${sentenceCount}: ${ctx.whyItMatters}`);
  assert.ok(ctx.plainTermsNote.length > 20);
  assert.match(ctx.plainTermsNote.toLowerCase(), /fail-closed|gate|receipt|canary/);
  assert.match(ctx.guideUrl, /^https:\/\/www\.danmercede\.com\/guides(\/[a-z0-9-]+)?$/);
  assert.ok(ctx.guideLabel.length > 10);
});

test('entryArticleHtml renders "Why This Matters Outside Orion" card without nested div or extra h2', () => {
  const futureEntry: WorkingNote = {
    id: '2026-12-01-future-note',
    slug: '2026-12-01-future-note',
    title: 'Fail-closed deploy receipts',
    date: '2026-12-01',
    timestamp: '10:00 AM PT',
    type: EntryType.WorkingNote,
    tags: ['governance'],
    content: 'Production rollouts require signed verification receipts before traffic shifts.',
    openQuestion: 'What happens if the receipt writer times out?',
  };

  const html = entryArticleHtml(futureEntry);
  assert.ok(html.includes('Why This Matters Outside Orion'));
  assert.ok(html.includes('https://www.danmercede.com/guides'));
  assert.ok(!html.includes('<div'), 'prerender article must avoid nested <div> per perSlugPages contract');
  assert.equal((html.match(/<h2[ >]/g) || []).length, 1);

  const shell = [
    '<!DOCTYPE html><html><head>',
    '<link rel="canonical" href="https://www.danmercede.online/" />',
    '<title>Dan Mercede - Living Signal Surface</title>',
    '<meta name="description" content="d" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:title" content="t" />',
    '<meta property="og:description" content="d" />',
    '<meta property="og:url" content="https://www.danmercede.online/" />',
    '<meta name="twitter:title" content="t" />',
    '<meta name="twitter:description" content="d" />',
    '<meta property="og:image" content="https://www.danmercede.online/dan-mercede-founder-working-og.jpg" />',
    '<meta property="og:image:type" content="image/jpeg" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="alt" />',
    '<meta name="twitter:image" content="https://www.danmercede.online/dan-mercede-founder-working-og.jpg" />',
    '<meta name="twitter:image:alt" content="alt" />',
    '<script type="application/ld+json">{}</script>',
    '</head><body>',
    `<div id="root"><div data-prerender="true"><h1>h</h1>${html}</div></div>`,
    '<script type="module" src="/assets/index.js"></script>',
    '</body></html>',
  ].join('\n');

  const page = buildEntryPageHtml(shell, futureEntry);
  assert.ok(page.includes('Why This Matters Outside Orion'));
  assert.ok(page.includes('https://www.danmercede.com/guides'));
});

test('substrate canonicals automatically inherit externalContext during compilation', () => {
  const mapped = mapSubstrateToEntry(
    {
      slug: 'substrate-inherited-context',
      title: 'Gate before mutation',
      date: '2026-11-23T08:00:00-08:00',
      type: 'essay-long',
      layer: 'authority-gate',
      surface_targets: ['danmercede.online'],
      status: 'canonical',
      claim: 'Execution requires a pre-action check and a tamper-evident receipt.',
    },
    'A gate sits ahead of side effects.',
    '2026-11-23-substrate-inherited-context.md',
  );
  assert.ok(mapped !== null);
  const ctx = mapped.fields.externalContext as { whyItMatters: string; guideUrl: string; plainTermsNote: string };
  assert.ok(ctx && typeof ctx.whyItMatters === 'string');
  assert.match(ctx.guideUrl, /^https:\/\/www\.danmercede\.com\/guides/);
  assert.ok(ctx.plainTermsNote.length > 15);
});

test('EntryCard.tsx renders Why This Matters Outside Orion and canonical guide link', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'components', 'EntryCard.tsx'), 'utf8');
  assert.ok(src.includes('Why This Matters Outside Orion'));
  assert.ok(src.includes('resolveExternalContext'));
});

test('all inbox/*.md files carry valid backfilled externalContext without long dashes', () => {
  const inboxDir = path.join(projectRoot, 'inbox');
  const files = fs.readdirSync(inboxDir).filter((f) => f.endsWith('.md'));
  assert.ok(files.length >= 140);
  for (const file of files) {
    const raw = fs.readFileSync(path.join(inboxDir, file), 'utf8');
    const parsed = matter(raw);
    const errors = validateExternalContext(parsed.data.externalContext, file, true);
    assert.deepEqual(errors, [], `${file} invalid externalContext: ${errors.join('; ')}`);
    const serialized = JSON.stringify(parsed.data.externalContext);
    assert.ok(!/[\u2013\u2014\u2015]/.test(serialized), `${file} contains long dash in externalContext`);
    const why = (parsed.data.externalContext as { whyItMatters: string }).whyItMatters;
    assert.ok(!/\.{4}|\.{3}(?:\s*$|\s*[.!?])/.test(why), `${file} contains truncated ellipsis in whyItMatters: ${why}`);
    assert.ok(
      !why.includes('Outside our local build environment,'),
      `${file} contains canned boilerplate prefix`,
    );
  }
});

test('experiment-log entries summarize observed resultDetails/nextStep rather than disproved hypothesis', () => {
  const exp: LogEntry = {
    id: '2026-11-05-one-bridge-per-folder',
    slug: '2026-11-05-one-bridge-per-folder',
    title: 'One Bridge Per Folder',
    date: '2026-11-05',
    timestamp: '08:23 PM PT',
    type: EntryType.ExperimentLog,
    hypothesis: 'Restart=always would keep the bridge alive.',
    constraint: 'One folder per bridge.',
    result: 'Failed',
    resultDetails: 'The first start exited 1 on a blank screen because a folder allows only one bridge server.',
    nextStep: 'Gate unattended starts on the folder being free instead of trusting a restart loop.',
    tags: ['failure-modes'],
  };
  const ctx = resolveExternalContext({ ...exp, externalContext: undefined });
  assert.ok(!ctx.whyItMatters.includes('Restart=always would keep'));
  assert.match(ctx.whyItMatters, /exited 1|one bridge server/i);

  const oneBridge = matter(
    fs.readFileSync(path.join(projectRoot, 'inbox', '2026-11-05-one-bridge-per-folder.md'), 'utf8'),
  );
  const storedWhy = (oneBridge.data.externalContext as { whyItMatters: string }).whyItMatters;
  assert.ok(!storedWhy.includes('I could keep Claude Code'), `Stale hypothesis summary still in frontmatter: ${storedWhy}`);
  assert.match(storedWhy, /exited 1|one server per folder|blank screen/i);
});
