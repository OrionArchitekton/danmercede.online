/**
 * perSlugPages.ts — build-time per-slug page emitter (spec: specs/per-slug-pages-spec.md).
 *
 * Ports the hub `/thoughts/<slug>` convention to the signal feed: every entry becomes a
 * real, crawlable, self-canonical page at `https://www.danmercede.online/<slug>`, emitted
 * into `dist/<slug>/index.html` during `vite build` (so it lands on Vercel deploys) and
 * served by Vercel `cleanUrls` filesystem precedence — no SPA rewrite, no SSR, no router.
 *
 * Mechanism mirrors bodyBakePlugin: a pure string transform of the already-built shell
 * (`dist/index.html`, which carries the correct hashed asset refs + the baked feed). Each
 * transform is GUARDED — a structure change throws rather than silently emitting a wrong
 * page. The page body is the SAME `entryArticleHtml` the feed bakes, so it can never drift.
 */

import { EntryType, type LogEntry } from '../types.ts';
import { entryArticleHtml, escapeHtml } from './prerenderBody.ts';

const SITE = 'https://www.danmercede.online';
const PERSON = 'https://www.danmercede.com/#person';

/** The flat per-slug canonical page URL. */
export function pageUrl(slug: string): string {
  return `${SITE}/${slug}`;
}

/**
 * Absolute URL for a diagram image, but ONLY when `src` is a same-origin site-relative
 * path (`/assets/...`). Off-site `http(s)://`, protocol-relative `//host`, and non-path
 * schemes (`javascript:`, `data:`) return null — so a stray/malformed diagram src can
 * never advertise an attacker-controllable image in og:image or the page's ImageObject.
 * (Substrate diagrams are already constrained to /assets/diagrams/<slug>.<ext>; this is
 * the same guarantee for the inbox path, at the emission point.)
 */
function siteRelativeImageUrl(src: string): string | null {
  return src.startsWith('/') && !src.startsWith('//') ? `${SITE}${src}` : null;
}

/** OG image MIME type from a diagram src extension (default jpeg). */
function diagramImageMime(src: string): string {
  const ext = src.toLowerCase().match(/\.([a-z0-9]+)(?:[?#].*)?$/)?.[1];
  switch (ext) {
    case 'svg': return 'image/svg+xml';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    default: return 'image/jpeg';
  }
}

/** Plain-text lead description per type (for <meta name="description"> + og:description). */
export function entryDescription(entry: LogEntry): string {
  let text: string;
  switch (entry.type) {
    case EntryType.ShortEssay: text = entry.claim; break;
    case EntryType.ExperimentLog: text = `${entry.hypothesis} Result: ${entry.result}.`; break;
    case EntryType.StatusUpdate: text = `${entry.status}: ${entry.whatChanged}`; break;
    case EntryType.ThoughtSnippet: text = entry.content; break;
    case EntryType.WorkingNote: text = entry.content; break;
    case EntryType.Diagram: text = entry.caption; break;
    default: text = entry.title;
  }
  return truncate(text);
}

function truncate(text: string, max = 200): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The page's JSON-LD @graph: an ItemPage WebPage whose mainEntity is a single BlogPosting
 * (the entry), backlinking the hub Person. Diagram entries carry an ImageObject. `<` is
 * escaped so an entry title containing `</script>` cannot break out of the <script> tag.
 */
export function renderEntryPageJsonLd(entry: LogEntry): string {
  const url = pageUrl(entry.slug);

  const post: Record<string, unknown> = {
    '@type': 'BlogPosting',
    '@id': url,
    headline: entry.title,
    datePublished: entry.date,
    url,
    author: { '@id': PERSON },
    publisher: { '@id': PERSON },
    mainEntityOfPage: { '@id': url },
  };

  if (entry.type === EntryType.Diagram) {
    const img = siteRelativeImageUrl(entry.src);
    if (img) {
      post.image = {
        '@type': 'ImageObject',
        url: img,
        contentUrl: img,
        caption: entry.caption,
      };
    }
  }

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['WebPage', 'ItemPage'],
        '@id': `${url}#webpage`,
        url,
        name: entry.title,
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': PERSON },
        mainEntity: { '@id': url },
      },
      post,
    ],
  };

  return JSON.stringify(graph, null, 2).replace(/</g, '\\u003c');
}

const JSON_LD_SCRIPT_PATTERN = String.raw`<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>`;

/**
 * Replace exactly one occurrence of `re` in `html` via a replacer FUNCTION (so a literal
 * `$` in interpolated entry text is never treated as a replacement pattern). Throws if the
 * anchor is missing or ambiguous — a guarded transform, like bodyBakePlugin.
 */
function replaceOnce(
  html: string,
  re: RegExp,
  replacer: (...args: string[]) => string,
  label: string,
): string {
  const globalRe = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  const count = (html.match(globalRe) || []).length;
  if (count !== 1) {
    throw new Error(`perSlugPages: expected exactly one ${label} anchor, found ${count}`);
  }
  return html.replace(re, replacer as never);
}

/** Set the value of a `<tag ... attr="VALUE" ...>` whose open is captured as (p1)VALUE(p2). */
function setAttr(html: string, attrRe: RegExp, value: string, label: string): string {
  return replaceOnce(html, attrRe, (_m, p1: string, p2: string) => `${p1}${escapeHtml(value)}${p2}`, label);
}

/**
 * Transform a built shell (`dist/index.html`, post-body-bake) into a single-entry page:
 * per-entry canonical/title/description/OG, single-BlogPosting JSON-LD, and a body that is
 * just this entry's <article> (unique per URL — focus, not the whole feed).
 */
export function buildEntryPageHtml(shellHtml: string, entry: LogEntry): string {
  const url = pageUrl(entry.slug);
  const desc = entryDescription(entry);
  let html = shellHtml;

  // 1) canonical + og:url → the real page URL.
  // \s+ between the identifying attribute and href/content: the source index.html
  // splits some meta tags across lines, and the built shell preserves that.
  html = setAttr(html, /(<link rel="canonical"\s+href=")[^"]*(")/, url, 'canonical');
  html = setAttr(html, /(<meta property="og:url"\s+content=")[^"]*(")/, url, 'og:url');

  // 2) title + description (page + OG)
  html = replaceOnce(
    html,
    /<title>[\s\S]*?<\/title>/,
    () => `<title>${escapeHtml(entry.title)} — danmercede.online</title>`,
    'title',
  );
  html = setAttr(html, /(<meta name="description"\s+content=")[^"]*(")/, desc, 'meta description');
  html = setAttr(html, /(<meta property="og:title"\s+content=")[^"]*(")/, entry.title, 'og:title');
  html = setAttr(html, /(<meta property="og:description"\s+content=")[^"]*(")/, desc, 'og:description');

  // 3) diagram pages advertise the diagram image (and its real type/alt/dimensions) as
  // the social/og image — replacing ALL the default portrait OG siblings, not just the
  // url, so type/alt/size don't lie. Skipped when src is not same-origin (keeps the safe
  // default portrait rather than emitting an off-site image).
  if (entry.type === EntryType.Diagram) {
    const img = siteRelativeImageUrl(entry.src);
    if (img) {
      html = setAttr(html, /(<meta property="og:image"\s+content=")[^"]*(")/, img, 'og:image');
      html = setAttr(html, /(<meta property="og:image:type"\s+content=")[^"]*(")/, diagramImageMime(entry.src), 'og:image:type');
      html = setAttr(html, /(<meta property="og:image:width"\s+content=")[^"]*(")/, '1200', 'og:image:width');
      html = setAttr(html, /(<meta property="og:image:height"\s+content=")[^"]*(")/, '675', 'og:image:height');
      html = setAttr(html, /(<meta property="og:image:alt"\s+content=")[^"]*(")/, entry.alt, 'og:image:alt');
      html = setAttr(html, /(<meta name="twitter:image"\s+content=")[^"]*(")/, img, 'twitter:image');
      html = setAttr(html, /(<meta name="twitter:image:alt"\s+content=")[^"]*(")/, entry.alt, 'twitter:image:alt');
    }
  }

  // 4) JSON-LD: replace the feed graph with the single-entry BlogPosting
  const ld = renderEntryPageJsonLd(entry);
  html = replaceOnce(
    html,
    new RegExp(JSON_LD_SCRIPT_PATTERN, 'i'),
    () => `<script type="application/ld+json">\n${ld}\n  </script>`,
    'JSON-LD script',
  );

  // 5) baked body: replace the feed prerender block with just this entry's <article>
  html = replaceOnce(
    html,
    /<div data-prerender="true">[\s\S]*?<\/div>/,
    () => `<div data-prerender="true">${entryArticleHtml(entry)}</div>`,
    'prerender root body',
  );

  return html;
}
