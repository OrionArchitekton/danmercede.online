// tests/perSlugPages.test.ts — per-slug canonical page emission (spec: per-slug-pages-spec.md).
//
// Primary seam: the pure render/transform functions the build-time emitter is made of.
// No build required — buildEntryPageHtml is fed a representative post-bake shell fixture.
//
// Run via: node --test (tsx). Mirrors the assert/strict idiom of feedJsonLd.test.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EntryType, type LogEntry, type Diagram, type ThoughtSnippet } from '../types.ts';
import {
  pageUrl,
  renderEntryPageJsonLd,
  buildEntryPageHtml,
} from '../scripts/perSlugPages.ts';

const SITE = 'https://www.danmercede.online';
const PERSON = 'https://www.danmercede.com/#person';

const thought: ThoughtSnippet = {
  id: '2026-06-24-enforce-at-the-boundary',
  slug: '2026-06-24-enforce-at-the-boundary',
  title: 'Enforce at the Tool Boundary',
  date: '2026-06-24',
  timestamp: '04:00 PM PT',
  type: EntryType.ThoughtSnippet,
  tags: ['execution', 'governance'],
  content: 'A read-only rail works at the tool boundary, not the prompt.',
};

const diagram: Diagram = {
  id: '2026-06-20-control-flow',
  slug: '2026-06-20-control-flow',
  title: 'Authority Gate Control Flow',
  date: '2026-06-20',
  timestamp: '09:00 AM PT',
  type: EntryType.Diagram,
  tags: ['governance', 'systems'],
  src: '/assets/diagrams/2026-06-20-control-flow.svg',
  alt: 'Control flow through the authority gate',
  caption: 'Requests pass the gate before any mutation.',
};

// A representative shell resembling dist/index.html AFTER bodyBakePlugin has run:
// site-level canonical/og/title + a feed JSON-LD script + the baked feed body in #root.
function shellFixture(): string {
  return [
    '<!DOCTYPE html><html lang="en"><head>',
    '<link rel="canonical" href="https://www.danmercede.online/" />',
    '<title>Dan Mercede — Living Signal Surface</title>',
    // description + og:description are split across lines in the real index.html;
    // the emitter's attribute regexes must tolerate that (\s+).
    '<meta name="description"\n    content="Living signal surface and working log for Dan Mercede." />',
    '<meta property="og:title" content="danmercede.online — Working Notes" />',
    '<meta property="og:description"\n    content="Short-form notes, experiments, and reflections." />',
    '<meta property="og:url" content="https://www.danmercede.online/" />',
    '<meta property="og:image" content="https://www.danmercede.online/dan-mercede-founder-working-og.jpg" />',
    '<meta property="og:image:type" content="image/jpeg" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="Dan Mercede Working Portrait" />',
    '<meta name="twitter:image" content="https://www.danmercede.online/dan-mercede-founder-working-og.jpg" />',
    '<meta name="twitter:image:alt" content="Dan Mercede Working Portrait" />',
    '<script type="application/ld+json">\n{ "@context": "https://schema.org", "@graph": [{"@type":"Blog"}] }\n  </script>',
    '</head><body>',
    '<div id="root"><div data-prerender="true"><h1>danmercede.online — Living Signal Surface</h1>',
    '<article id="2026-06-24-enforce-at-the-boundary"><h2>Enforce at the Tool Boundary</h2></article>',
    '<article id="2026-06-20-control-flow"><h2>Authority Gate Control Flow</h2></article>',
    '</div></div>',
    '<script type="module" src="/assets/index-abc123.js"></script>',
    '</body></html>',
  ].join('\n');
}

test('pageUrl builds the flat /<slug> canonical', () => {
  assert.equal(pageUrl('2026-06-24-enforce-at-the-boundary'), `${SITE}/2026-06-24-enforce-at-the-boundary`);
});

test('renderEntryPageJsonLd: single BlogPosting at the real page URL, person backlink', () => {
  const raw = renderEntryPageJsonLd(thought);
  assert.ok(!raw.includes('</script'), 'must not contain a raw </script sequence');
  const graph = JSON.parse(raw.replace(/\\u003c/g, '<'));
  const posts = graph['@graph'].filter((n: any) => n['@type'] === 'BlogPosting');
  assert.equal(posts.length, 1, 'exactly one BlogPosting');
  const post = posts[0];
  assert.equal(post.url, pageUrl(thought.slug));
  assert.equal(post['@id'], pageUrl(thought.slug));
  assert.equal(post.mainEntityOfPage['@id'], pageUrl(thought.slug));
  assert.equal(post.author['@id'], PERSON);
  assert.equal(post.publisher['@id'], PERSON);
  assert.equal(post.headline, thought.title);
});

test('renderEntryPageJsonLd: diagram entry carries an ImageObject with absolute URL + caption', () => {
  const raw = renderEntryPageJsonLd(diagram);
  const graph = JSON.parse(raw.replace(/\\u003c/g, '<'));
  const post = graph['@graph'].find((n: any) => n['@type'] === 'BlogPosting');
  assert.ok(post.image, 'diagram BlogPosting has image');
  assert.equal(post.image['@type'], 'ImageObject');
  assert.equal(post.image.url, `${SITE}${diagram.src}`);
  assert.equal(post.image.caption, diagram.caption);
});

test('buildEntryPageHtml: page is self-canonical (criterion 2)', () => {
  const html = buildEntryPageHtml(shellFixture(), thought);
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/);
  assert.ok(canon, 'canonical present');
  assert.equal(canon![1], pageUrl(thought.slug));
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1, 'exactly one canonical');
  assert.match(html, /<meta property="og:url" content="https:\/\/www\.danmercede\.online\/2026-06-24-enforce-at-the-boundary"/);
  assert.ok(html.includes(`<title>`) && html.includes(thought.title), 'title carries the entry title');
});

test('buildEntryPageHtml: exactly one single-entry BlogPosting JSON-LD (criterion 3)', () => {
  const html = buildEntryPageHtml(shellFixture(), thought);
  const scripts = html.match(/<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || [];
  assert.equal(scripts.length, 1, 'exactly one JSON-LD block');
  assert.ok(scripts[0].includes('BlogPosting'), 'JSON-LD is a BlogPosting');
  assert.ok(!scripts[0].includes('"@type":"Blog"') && !scripts[0].includes('"@type": "Blog"'), 'feed Blog graph replaced');
});

test('buildEntryPageHtml: baked body is this one entry, not the whole feed (criterion 4)', () => {
  const html = buildEntryPageHtml(shellFixture(), thought);
  assert.ok(html.includes(`<article id="${thought.slug}">`), 'this entry article present');
  assert.ok(!html.includes(`<article id="${diagram.slug}">`), 'other entry article absent');
  assert.equal((html.match(/<article /g) || []).length, 1, 'exactly one article');
});

test('buildEntryPageHtml: diagram page sets og:image + correct type/alt siblings (not stale portrait)', () => {
  const html = buildEntryPageHtml(shellFixture(), diagram);
  assert.match(html, /<meta property="og:image" content="https:\/\/www\.danmercede\.online\/assets\/diagrams\/2026-06-20-control-flow\.svg"/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/www\.danmercede\.online\/assets\/diagrams\/2026-06-20-control-flow\.svg"/);
  // siblings must describe the diagram, not the default jpeg portrait
  assert.match(html, /<meta property="og:image:type" content="image\/svg\+xml"/);
  assert.match(html, new RegExp(`<meta property="og:image:alt" content="${diagram.alt}"`));
  assert.match(html, new RegExp(`<meta name="twitter:image:alt" content="${diagram.alt}"`));
  assert.ok(!html.includes('Dan Mercede Working Portrait'), 'stale portrait alt must be gone on a diagram page');
});

test('buildEntryPageHtml: non-diagram page keeps the default portrait OG image untouched', () => {
  const html = buildEntryPageHtml(shellFixture(), thought);
  assert.match(html, /<meta property="og:image" content="https:\/\/www\.danmercede\.online\/dan-mercede-founder-working-og\.jpg"/);
  assert.match(html, /<meta property="og:image:type" content="image\/jpeg"/);
});

test('buildEntryPageHtml: guarded — throws if the shell is missing an expected anchor', () => {
  const broken = '<html><head></head><body><div id="root"></div></body></html>';
  assert.throws(() => buildEntryPageHtml(broken, thought), /perSlugPages|anchor|canonical|JSON-LD|root/i);
});
