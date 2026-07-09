/**
 * renderFeed.ts
 *
 * Build-time RSS 2.0 + Atom 1.0 feed emitter (specs/rss-feed-spec.md).
 *
 * Projects the SAME ordered-entry source as the body-bake and feed JSON-LD
 * (scripts/prerenderBody.ts), so feed content cannot drift from what the site
 * renders. Emits `public/feed.xml` (RSS 2.0) and `public/atom.xml` (Atom 1.0)
 * as committed artifacts: with VERCEL=1 the prebuild compile skips (D1 guard)
 * and vite ships the committed feeds via public/ passthrough.
 *
 * Deterministic given content: channel timestamps derive from the newest
 * entry, never the wall clock, so recompiling unchanged content is a no-op
 * diff. Entry timestamps are PT wall time ("HH:MM AM/PM PT"); conversion to
 * UTC resolves the real PDT/PST offset per date via Intl, independent of the
 * host timezone.
 *
 * Run after compileContent.ts in a FRESH process (`npm run compile`): the
 * feeds must import the constants.generated.ts that compile just wrote, not a
 * stale in-process module instance.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getOrderedEntries,
  entryArticleHtml,
  entryCanonicalUrl,
  escapeHtml,
} from './prerenderBody.ts';
import { EntryType, type LogEntry } from '../types.ts';

const SITE = 'https://www.danmercede.online';
const FEED_TITLE = 'Dan Mercede: Living Signal Surface';
const FEED_DESCRIPTION =
  'Public working log of Dan Mercede: short-form notes, experiments, and status ' +
  'updates on operator workflows, owned AI systems, and fail-closed proof depth.';
const HUB_URL = 'https://pubsubhubbub.appspot.com/';
const AUTHOR_NAME = 'Dan Mercede';

/** Newest entries included per feed; older content stays on the site. */
export const FEED_LIMIT = 20;

// ---------------------------------------------------------------------------
// PT wall time -> UTC (host-timezone-independent).
// ---------------------------------------------------------------------------

function laOffsetMs(utcMs: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - utcMs;
}

/** An entry's publication instant in UTC ms, from its PT date + timestamp. */
export function entryUtcMs(entry: LogEntry): number {
  const [year, month, day] = entry.date.split('-').map(Number);
  const match = entry.timestamp.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hours = 0;
  let minutes = 0;
  if (match) {
    hours = parseInt(match[1], 10) % 12;
    minutes = parseInt(match[2], 10);
    if (match[3].toUpperCase() === 'PM') hours += 12;
  }
  // Two-pass: resolve the PDT/PST offset at the guessed instant, then re-apply.
  const guess = Date.UTC(year, month - 1, day, hours, minutes);
  return guess - laOffsetMs(guess - laOffsetMs(guess));
}

const RFC822_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RFC822_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function rfc822Utc(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${RFC822_DAYS[d.getUTCDay()]}, ${pad(d.getUTCDate())} ` +
    `${RFC822_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`
  );
}

// ---------------------------------------------------------------------------
// Per-type plain-text summary (the RSS description / Atom summary).
// ---------------------------------------------------------------------------

function truncate(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function entrySummary(entry: LogEntry): string {
  switch (entry.type) {
    case EntryType.ShortEssay:
      return truncate(entry.claim);
    case EntryType.ExperimentLog:
      return truncate(entry.hypothesis);
    case EntryType.StatusUpdate:
      return truncate(entry.whatChanged);
    case EntryType.Diagram:
      return truncate(entry.caption);
    case EntryType.ThoughtSnippet:
    case EntryType.WorkingNote:
      return truncate(entry.content);
  }
}

// ---------------------------------------------------------------------------
// Renderers.
// ---------------------------------------------------------------------------

function feedEntries(entries: LogEntry[]): LogEntry[] {
  return entries.slice(0, FEED_LIMIT);
}

export function renderRss(entries: LogEntry[] = getOrderedEntries()): string {
  const items = feedEntries(entries);
  const newestMs = items.length ? entryUtcMs(items[0]) : 0;
  const itemXml = items
    .map((entry) => {
      const canonical = entryCanonicalUrl(entry.slug);
      return (
        '<item>' +
        `<title>${escapeHtml(entry.title)}</title>` +
        `<link>${canonical}</link>` +
        `<guid isPermaLink="true">${canonical}</guid>` +
        `<pubDate>${rfc822Utc(entryUtcMs(entry))}</pubDate>` +
        `<description>${escapeHtml(entrySummary(entry))}</description>` +
        `<content:encoded>${escapeHtml(entryArticleHtml(entry))}</content:encoded>` +
        '</item>'
      );
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" ' +
    'xmlns:content="http://purl.org/rss/1.0/modules/content/">\n' +
    '<channel>\n' +
    `<title>${escapeHtml(FEED_TITLE)}</title>\n` +
    `<link>${SITE}/</link>\n` +
    `<description>${escapeHtml(FEED_DESCRIPTION)}</description>\n` +
    '<language>en</language>\n' +
    `<lastBuildDate>${rfc822Utc(newestMs)}</lastBuildDate>\n` +
    '<docs>https://www.rssboard.org/rss-specification</docs>\n' +
    `<atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>\n` +
    `<atom:link href="${HUB_URL}" rel="hub"/>\n` +
    `${itemXml}\n` +
    '</channel>\n' +
    '</rss>\n'
  );
}

export function renderAtom(entries: LogEntry[] = getOrderedEntries()): string {
  const items = feedEntries(entries);
  const newestMs = items.length ? entryUtcMs(items[0]) : 0;
  const entryXml = items
    .map((entry) => {
      const canonical = entryCanonicalUrl(entry.slug);
      const iso = new Date(entryUtcMs(entry)).toISOString();
      return (
        '<entry>' +
        `<id>${canonical}</id>` +
        `<title>${escapeHtml(entry.title)}</title>` +
        `<link href="${canonical}" rel="alternate" type="text/html"/>` +
        `<published>${iso}</published>` +
        `<updated>${iso}</updated>` +
        `<summary>${escapeHtml(entrySummary(entry))}</summary>` +
        `<content type="html">${escapeHtml(entryArticleHtml(entry))}</content>` +
        '</entry>'
      );
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<feed xmlns="http://www.w3.org/2005/Atom">\n' +
    `<id>${SITE}/</id>\n` +
    `<title>${escapeHtml(FEED_TITLE)}</title>\n` +
    `<subtitle>${escapeHtml(FEED_DESCRIPTION)}</subtitle>\n` +
    `<updated>${new Date(newestMs).toISOString()}</updated>\n` +
    `<author><name>${escapeHtml(AUTHOR_NAME)}</name><uri>${SITE}/</uri></author>\n` +
    `<link href="${SITE}/atom.xml" rel="self" type="application/atom+xml"/>\n` +
    `<link href="${SITE}/" rel="alternate" type="text/html"/>\n` +
    `<link href="${HUB_URL}" rel="hub"/>\n` +
    `${entryXml}\n` +
    '</feed>\n'
  );
}

// ---------------------------------------------------------------------------
// CLI: emit committed artifacts (run by `npm run compile` after compileContent).
// ---------------------------------------------------------------------------

function main(): void {
  if (process.env.VERCEL) {
    console.log(
      'VERCEL build environment detected - skipping feed render; the committed feeds are served (Spec 4b D1).',
    );
    return;
  }
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  writeFileSync(join(publicDir, 'feed.xml'), renderRss(), 'utf8');
  writeFileSync(join(publicDir, 'atom.xml'), renderAtom(), 'utf8');
  console.log(`renderFeed: wrote public/feed.xml + public/atom.xml (limit ${FEED_LIMIT})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
