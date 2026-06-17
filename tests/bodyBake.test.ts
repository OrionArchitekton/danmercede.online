/**
 * Tests for the build-time body-bake (W1) and per-entry anchors (W6).
 *
 * Drift guard: the prerendered body MUST carry real crawlable content (one <h1>,
 * >0 <p>) and one anchor id per entry slug, derived from the SAME committed
 * sources the SPA renders. If the entry data or the emitter changes such that the
 * served <body> would go blank (the BLOCKING AEO failure W1 fixes), this fails.
 *
 * Uses node:test via tsx (no new test framework dependencies).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
  renderPrerenderBody,
  getOrderedEntries,
  escapeHtml,
} from '../scripts/prerenderBody.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function count(html: string, tag: string): number {
  return (html.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
}

test('prerender body carries exactly one <h1> and many <p> (not a blank root)', () => {
  const html = renderPrerenderBody();
  assert.equal(count(html, 'h1'), 1, 'expected exactly one <h1>');
  assert.ok(count(html, 'p') > 0, 'expected >0 <p> (body must not be blank)');
  // The block must be the hydration-replaceable prerender wrapper.
  assert.ok(html.includes('data-prerender="true"'), 'missing data-prerender wrapper');
});

test('every entry renders exactly one anchor whose id == its slug (W6)', () => {
  const entries = getOrderedEntries();
  assert.ok(entries.length >= 32, `expected >=32 entries, got ${entries.length}`);
  const html = renderPrerenderBody(entries);
  for (const entry of entries) {
    const idAttr = `id="${escapeHtml(entry.slug)}"`;
    const occurrences = html.split(idAttr).length - 1;
    assert.equal(occurrences, 1, `slug anchor missing/duplicated for ${entry.slug}`);
  }
  // One <h2> and one <article> per entry.
  assert.equal(count(html, 'h2'), entries.length, '<h2> count != entry count');
  assert.equal(count(html, 'article'), entries.length, '<article> count != entry count');
});

test('every entry title appears in the baked body (crawlable text)', () => {
  const entries = getOrderedEntries();
  const html = renderPrerenderBody(entries);
  for (const entry of entries) {
    assert.ok(
      html.includes(escapeHtml(entry.title)),
      `baked body missing title for ${entry.slug}: ${entry.title}`,
    );
  }
});

test('escapeHtml neutralizes angle brackets, quotes, and ampersands', () => {
  assert.equal(
    escapeHtml(`<a href="x" data-y='z'>&`),
    '&lt;a href=&quot;x&quot; data-y=&#39;z&#39;&gt;&amp;',
  );
});

test('committed sitemap.xml covers every canonical post slug with a fragment URL (W9)', () => {
  const postsRaw = fs.readFileSync(path.join(projectRoot, 'public', 'posts.json'), 'utf-8');
  const posts = (JSON.parse(postsRaw) as { posts: { slug: string }[] }).posts;
  const sitemap = fs.readFileSync(path.join(projectRoot, 'public', 'sitemap.xml'), 'utf-8');
  for (const post of posts) {
    assert.ok(
      sitemap.includes(`/#${post.slug}</loc>`),
      `sitemap.xml missing fragment URL for canonical slug ${post.slug}`,
    );
  }
  // Root URL is still present.
  assert.ok(sitemap.includes('<loc>https://www.danmercede.online/</loc>'), 'sitemap missing root URL');
  // lastmod must never be a literal placeholder; each must be an ISO date.
  const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  assert.ok(lastmods.length >= posts.length + 1, 'expected a lastmod per url');
  for (const lm of lastmods) {
    assert.match(lm, /^\d{4}-\d{2}-\d{2}$/, `non-ISO lastmod: ${lm}`);
  }
});
