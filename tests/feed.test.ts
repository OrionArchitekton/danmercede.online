// Guard for the build-time RSS 2.0 + Atom 1.0 feeds (specs/rss-feed-spec.md).
// renderRss()/renderAtom() project the SAME ordered-entry source as the bake and
// JSON-LD, so feed content cannot drift from what the site renders. Run via
// `npm test` (tsx --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderRss, renderAtom, FEED_LIMIT } from '../scripts/renderFeed.ts';
import { getOrderedEntries, entryCanonicalUrl } from '../scripts/prerenderBody.ts';
import { EntryType, type LogEntry } from '../types.ts';

const SITE = 'https://www.danmercede.online';

// July date: PDT (UTC-7). 2026-07-09 01:20 AM PT == 08:20 UTC (a Thursday).
const essay: LogEntry = {
  id: 'e1',
  slug: '2026-07-09-synthetic-essay',
  title: 'Synthetic & Essay',
  date: '2026-07-09',
  timestamp: '01:20 AM PT',
  type: EntryType.ShortEssay,
  tags: ['systems'],
  claim: 'A <claim> with markup.',
  implication: 'So what.',
  content: 'Body paragraph one.\n\nBody paragraph two.',
};

// January date: PST (UTC-8). 2026-01-23 10:00 AM PT == 18:00 UTC (a Friday).
const note: LogEntry = {
  id: 'n1',
  slug: '2026-01-23-synthetic-note',
  title: 'Synthetic Note',
  date: '2026-01-23',
  timestamp: '10:00 AM PT',
  type: EntryType.WorkingNote,
  tags: [],
  content: 'Note body.',
  openQuestion: 'Still open?',
};

const rss = renderRss([essay, note]);
const atom = renderAtom([essay, note]);

test('rss envelope: version, channel self link, WebSub hub link', () => {
  assert.ok(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(rss.includes('<rss version="2.0"'));
  assert.ok(rss.includes(`<atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>`));
  assert.ok(rss.includes('<atom:link href="https://pubsubhubbub.appspot.com/" rel="hub"/>'));
  assert.ok(rss.includes(`<link>${SITE}/</link>`));
});

test('rss dates: RFC-822 UTC with correct PDT and PST conversion', () => {
  assert.ok(rss.includes('<pubDate>Thu, 09 Jul 2026 08:20:00 +0000</pubDate>'));
  assert.ok(rss.includes('<pubDate>Fri, 23 Jan 2026 18:00:00 +0000</pubDate>'));
  // lastBuildDate derives from the newest entry, never the wall clock.
  assert.ok(rss.includes('<lastBuildDate>Thu, 09 Jul 2026 08:20:00 +0000</lastBuildDate>'));
});

test('rss items: canonical permalink guid, escaped title, full content', () => {
  const canonical = entryCanonicalUrl(essay.slug);
  assert.ok(rss.includes(`<guid isPermaLink="true">${canonical}</guid>`));
  assert.ok(rss.includes(`<link>${canonical}</link>`));
  assert.ok(rss.includes('Synthetic &amp; Essay'));
  assert.ok(!rss.includes('Synthetic & Essay'));
  // content:encoded carries the full baked article HTML, XML-escaped.
  assert.ok(rss.includes('<content:encoded>'));
  assert.ok(rss.includes('Body paragraph two.'));
  // per-type summary: ShortEssay uses claim, WorkingNote falls back to content.
  assert.ok(rss.includes('A &lt;claim&gt; with markup.'));
  assert.ok(rss.includes('<description>Note body.</description>'));
});

test('rss orders items as given (newest-first upstream) and respects the limit', () => {
  assert.ok(rss.indexOf('2026-07-09-synthetic-essay') < rss.indexOf('2026-01-23-synthetic-note'));
  const many = Array.from({ length: FEED_LIMIT + 5 }, (_, i) => ({
    ...essay,
    id: `m${i}`,
    slug: `2026-07-09-many-${i}`,
  }));
  const capped = renderRss(many);
  assert.equal(capped.match(/<item>/g)?.length, FEED_LIMIT);
});

test('atom envelope: id, self + alternate + hub links, updated from newest entry', () => {
  assert.ok(atom.includes('<feed xmlns="http://www.w3.org/2005/Atom">'));
  assert.ok(atom.includes(`<id>${SITE}/</id>`));
  assert.ok(atom.includes(`<link href="${SITE}/atom.xml" rel="self" type="application/atom+xml"/>`));
  assert.ok(atom.includes(`<link href="${SITE}/" rel="alternate" type="text/html"/>`));
  assert.ok(atom.includes('<link href="https://pubsubhubbub.appspot.com/" rel="hub"/>'));
  assert.ok(atom.includes('<updated>2026-07-09T08:20:00.000Z</updated>'));
});

test('atom entries: canonical id, published, html content', () => {
  const canonical = entryCanonicalUrl(essay.slug);
  assert.ok(atom.includes(`<id>${canonical}</id>`));
  assert.ok(atom.includes('<published>2026-07-09T08:20:00.000Z</published>'));
  assert.ok(atom.includes('<content type="html">'));
  assert.ok(atom.includes('Body paragraph one.'));
});

test('feeds are deterministic for identical input', () => {
  assert.equal(renderRss([essay, note]), rss);
  assert.equal(renderAtom([essay, note]), atom);
});

// Feed drift gate (PR #105 review): checkInboxDrift covers constants/posts.json/
// sitemap but NOT the feeds, so a signal PR could update the bundle and forget
// public/feed.xml + atom.xml. The renderer is deterministic given content, so a
// fresh render from the COMMITTED bundle must byte-equal the committed artifacts.
test('committed feeds match a fresh render of the committed bundle (drift gate)', () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  assert.equal(
    fs.readFileSync(path.join(projectRoot, 'public', 'feed.xml'), 'utf8'),
    renderRss(),
    'public/feed.xml is stale: run `npm run compile` (with SUBSTRATE_PATH in a worktree) and commit it',
  );
  assert.equal(
    fs.readFileSync(path.join(projectRoot, 'public', 'atom.xml'), 'utf8'),
    renderAtom(),
    'public/atom.xml is stale: run `npm run compile` (with SUBSTRATE_PATH in a worktree) and commit it',
  );
});

test('VERCEL=1 feed render exits 0, prints sentinel, leaves committed feeds byte-identical', () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const feedPath = path.join(projectRoot, 'public', 'feed.xml');
  const atomPath = path.join(projectRoot, 'public', 'atom.xml');
  const beforeFeed = fs.readFileSync(feedPath);
  const beforeAtom = fs.readFileSync(atomPath);

  const tsx = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
  const result = spawnSync(tsx, [path.join('scripts', 'renderFeed.ts')], {
    cwd: projectRoot,
    env: { ...process.env, VERCEL: '1' },
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });

  assert.equal(result.status, 0, `expected exit 0; stderr: ${result.stderr}`);
  assert.ok(result.stdout.includes('skipping feed render'), 'must print the D1 skip sentinel');
  assert.ok(beforeFeed.equals(fs.readFileSync(feedPath)), 'public/feed.xml bytes changed under VERCEL=1');
  assert.ok(beforeAtom.equals(fs.readFileSync(atomPath)), 'public/atom.xml bytes changed under VERCEL=1');
});

test('default path projects the real ordered entries with canonical-host URLs', () => {
  const real = renderRss();
  const newest = getOrderedEntries()[0];
  const firstItem = real.slice(real.indexOf('<item>'));
  assert.ok(firstItem.includes(entryCanonicalUrl(newest.slug)));
  assert.ok(!/href="http:\/\//.test(real));
  assert.ok(!real.includes('https://danmercede.online/'), 'must use the www canonical host');
});
