/**
 * prerenderBody.ts
 *
 * Build-time, browserless, no-React HTML emitter (W1 body-bake).
 *
 * Produces a static, crawlable HTML snapshot of the feed that is injected into
 * `<div id="root">` at `vite build` time (see scripts/bodyBakePlugin.ts). Non-Google
 * answer engines (ChatGPT/GPTBot, Perplexity/PerplexityBot, Claude/ClaudeBot) fetch
 * raw HTML and do NOT execute JS - without this they see an empty root div. React's
 * createRoot().render() replaces the root's children on hydration, so interactive
 * users get the live SPA while crawlers get the baked content.
 *
 * This is a NO-SSR build-time bake - no framework/SSR runtime. The entry data is the
 * SAME committed source the SPA renders (constants.generated.ts + legacy constants.ts),
 * so the baked body can never drift from what the app shows.
 *
 * Importable by:
 *   - scripts/bodyBakePlugin.ts (the Vite transformIndexHtml plugin) - W1
 *   - scripts/generateSitemap.ts (per-entry sitemap)                 - W9
 *   - tests/bodyBake.test.ts (drift test)
 *
 * Only `ENTRIES` is imported from each module; the `import.meta.env`-touching
 * `getImageMeta` in constants.ts is never invoked here, so tsx/node import is safe.
 */

import { ENTRIES as GENERATED_ENTRIES } from '../constants.generated.ts';
import { ENTRIES as LEGACY_ENTRIES } from '../constants.ts';
import { EntryType, type LogEntry } from '../types.ts';

// ---------------------------------------------------------------------------
// Entry ordering - mirror App.tsx exactly (newest-first by date + time-of-day).
// ---------------------------------------------------------------------------

function parseFullDateTime(date: string, timestamp: string): number {
  const match = timestamp.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return new Date(date).getTime();
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const isPM = match[3].toUpperCase() === 'PM';
  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  return new Date(
    `${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`,
  ).getTime();
}

/** All rendered entries, newest-first - identical ordering to App.tsx. */
export function getOrderedEntries(): LogEntry[] {
  return [...GENERATED_ENTRIES, ...LEGACY_ENTRIES].sort(
    (a, b) =>
      parseFullDateTime(b.date, b.timestamp) - parseFullDateTime(a.date, a.timestamp),
  );
}

// ---------------------------------------------------------------------------
// HTML escaping (no framework - escape every interpolated string).
// ---------------------------------------------------------------------------

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
}

/**
 * The crawlable text for one entry, by type. Returns the lead paragraph(s) that
 * carry the entry's substance - this is what answer engines read.
 */
function entryBodyHtml(entry: LogEntry): string {
  switch (entry.type) {
    case EntryType.ShortEssay: {
      const claim = `<p>Claim: ${escapeHtml(entry.claim)}</p>`;
      const content = entry.content ? paragraphs(entry.content) : '';
      const implication = entry.implication
        ? `<p>${escapeHtml(entry.implication)}</p>`
        : '';
      return claim + content + implication;
    }
    case EntryType.ExperimentLog:
      return (
        `<p>Hypothesis: ${escapeHtml(entry.hypothesis)}</p>` +
        `<p>Constraint: ${escapeHtml(entry.constraint)}</p>` +
        `<p>Result: ${escapeHtml(entry.result)}. ${escapeHtml(entry.resultDetails)}</p>` +
        `<p>Next step: ${escapeHtml(entry.nextStep)}</p>`
      );
    case EntryType.StatusUpdate:
      return (
        `<p>Status: ${escapeHtml(entry.status)}.</p>` +
        `<p>What changed: ${escapeHtml(entry.whatChanged)}</p>` +
        `<p>What broke: ${escapeHtml(entry.whatBroke)}</p>` +
        `<p>Next step: ${escapeHtml(entry.nextStep)}</p>`
      );
    case EntryType.ThoughtSnippet:
      return `<p>${escapeHtml(entry.content)}</p>`;
    case EntryType.WorkingNote:
      return (
        paragraphs(entry.content) +
        `<p>Open question: ${escapeHtml(entry.openQuestion)}</p>`
      );
    case EntryType.Diagram:
      return (
        `<figure><img src="${escapeHtml(entry.src)}" alt="${escapeHtml(entry.alt)}" loading="lazy" width="1200" height="675" />` +
        `<figcaption>${escapeHtml(entry.caption)}</figcaption></figure>`
      );
    default:
      return '';
  }
}

export function entryArticleHtml(entry: LogEntry): string {
  const meta = `<p>${escapeHtml(entry.type)} &middot; ${escapeHtml(entry.date)} &middot; ${escapeHtml(
    entry.timestamp,
  )}</p>`;
  const heading = `<h2>${escapeHtml(entry.title)}</h2>`;
  const tags = entry.tags.length
    ? `<p>Tags: ${entry.tags.map((t) => escapeHtml(`#${t}`)).join(' ')}</p>`
    : '';
  // Optional lead figure (any entry type may carry one), baked as crawlable prose.
  const figure = entry.image
    ? `<figure><img src="${escapeHtml(entry.image.src)}" alt="${escapeHtml(entry.image.alt)}" loading="lazy" width="1200" height="675" />` +
      (entry.image.caption ? `<figcaption>${escapeHtml(entry.image.caption)}</figcaption>` : '') +
      `</figure>`
    : '';
  // id == slug so the in-feed EntryCard permalink (`#${slug}`) resolves to a real
  // on-page anchor (W6), and so the per-slug page reuses this exact <article> (the
  // page's canonical URL is `/${slug}`, emitted by perSlugPagesPlugin).
  return `<article id="${escapeHtml(entry.slug)}">${heading}${meta}${figure}${entryBodyHtml(
    entry,
  )}${tags}</article>`;
}

/**
 * The full prerendered body block injected into `<div id="root">`. One <h1>, an
 * intro paragraph, and one <article> per entry. Hidden from interactive users by
 * `data-prerender` (React replaces the root children on hydration); fully visible
 * to raw-HTML crawlers.
 */
export function renderPrerenderBody(entries: LogEntry[] = getOrderedEntries()): string {
  const header =
    '<h1>danmercede.online - Living Signal Surface</h1>' +
    '<p>Public working log of Dan Mercede: short-form notes, experiments, and status ' +
    'updates on operator workflows, owned AI systems, and fail-closed proof depth. Not ' +
    'polished. Not canonical.</p>';
  const articles = entries.map(entryArticleHtml).join('');
  return `<div data-prerender="true">${header}${articles}</div>`;
}

// ---------------------------------------------------------------------------
// Feed JSON-LD (W19) - build-time structured data for the feed surface.
// ---------------------------------------------------------------------------

const SITE = 'https://www.danmercede.online';
const PERSON = 'https://www.danmercede.com/#person';

// Slugs that receive their own per-slug page: the COMPILED inbox+substrate set
// (constants.generated.ts). Legacy constants.ts seed entries stay feed-only
// (fragment-addressable), matching their existing exclusion from the sitemap - so
// no per-slug page or page-URL is ever minted for content that has no real page.
const PAGE_ENTRY_SLUGS = new Set(GENERATED_ENTRIES.map((e) => e.slug));

/** Entries that get a real per-slug page, newest-first - the per-slug emitter's source. */
export function getPageEntries(): LogEntry[] {
  return [...GENERATED_ENTRIES].sort(
    (a, b) => parseFullDateTime(b.date, b.timestamp) - parseFullDateTime(a.date, a.timestamp),
  );
}

/** An entry's canonical URL: its own page `/slug` if it has one, else the feed fragment `/#slug`. */
export function entryCanonicalUrl(slug: string): string {
  return PAGE_ENTRY_SLUGS.has(slug) ? `${SITE}/${slug}` : `${SITE}/#${slug}`;
}

function absoluteUrl(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/')) return `${SITE}${src}`;
  return `${SITE}/${src}`;
}

/**
 * The feed's JSON-LD @graph: a CollectionPage whose mainEntity is a Blog, with one
 * BlogPosting per entry (same source as the bake, so the structured data can't
 * drift from the rendered feed). Replaces the static WebPage-only block in
 * index.html at build time (see scripts/bodyBakePlugin.ts). Returns the serialized
 * graph with `<` escaped so an entry title containing `</script>` cannot break out
 * of the embedding <script> tag.
 */
export function renderFeedJsonLd(entries: LogEntry[] = getOrderedEntries()): string {
  const blogPost = entries.map((e) => {
    // Compiled entries have their own per-slug page (perSlugPagesPlugin emits
    // dist/<slug>/index.html) → point @id/url/mainEntityOfPage at that page. Legacy
    // seed entries have no page → keep the feed fragment so structured data never
    // references a 404.
    const canonical = entryCanonicalUrl(e.slug);
    const post: Record<string, unknown> = {
      '@type': 'BlogPosting',
      '@id': canonical,
      headline: e.title,
      datePublished: e.date,
      url: canonical,
      author: { '@id': PERSON },
      publisher: { '@id': PERSON },
      mainEntityOfPage: { '@id': canonical },
    };

    if (e.type === EntryType.Diagram) {
      const url = absoluteUrl(e.src);
      post.image = {
        '@type': 'ImageObject',
        url,
        contentUrl: url,
        caption: e.caption,
      };
    }

    return post;
  });

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['CollectionPage', 'WebPage'],
        '@id': `${SITE}/#webpage`,
        url: `${SITE}/`,
        name: 'danmercede.online - Working Notes',
        about: { '@id': PERSON },
        isPartOf: { '@id': `${SITE}/#website` },
        mainEntity: { '@id': `${SITE}/#blog` },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        publisher: { '@id': PERSON },
      },
      {
        '@type': 'Blog',
        '@id': `${SITE}/#blog`,
        url: `${SITE}/`,
        name: 'danmercede.online - Living Signal Surface',
        publisher: { '@id': PERSON },
        author: { '@id': PERSON },
        blogPost,
      },
    ],
  };

  return JSON.stringify(graph, null, 2).replace(/</g, '\\u003c');
}
