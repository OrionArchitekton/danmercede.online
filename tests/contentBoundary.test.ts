/**
 * contentBoundary.test.ts — content-boundary guard (round-2 R10).
 *
 * Per AGENTS.md this repo is the danmercede.online "living-signal" surface: a
 * public working log of short-form notes, experiments, and status updates. It
 * "does not own primary identity sites" and is NOT a promotional/booking surface
 * — that is danmercede.com's job. This guard asserts the BAKED FEED BODY (the
 * crawlable HTML answer engines read, produced by renderPrerenderBody) does NOT
 * leak promotional/CTA/booking copy. It catches the danielmercede-info CTA-finding
 * class: identity/log surfaces silently accreting "book a call" / "request a demo"
 * style copy that belongs on the hub, not here.
 *
 * This is DIFFERENT from identityGuard.test.ts (the JSON-LD Person-node guard).
 *
 * --- Needle selection (honesty contract) -------------------------------------
 * The body is a FEED of freeform working-log entries (constants.generated.ts +
 * constants.ts ENTRIES), so a phrase like "get started" or "sign up" could
 * legitimately appear inside a technical note. A guard the current corpus already
 * violates is useless, so every candidate needle was grepped against the rendered
 * baked body before being kept.
 *
 * DROPPED (legitimately present in current entry content, so excluded to keep the
 * guard honest — re-evaluate if these entries change):
 *   - 'readiness scan' — an entry references "a runtime governance readiness scan
 *     at danmercede.com"; that is editorial/technical reference copy describing the
 *     HUB's surface, not a CTA on THIS surface. Keeping it would make the guard RED
 *     against the current corpus.
 *
 * KEPT (unambiguous promotional/booking CTAs, all verified ABSENT from the current
 * baked body — these are the load-bearing needles): see FORBIDDEN below. Softer
 * needles ('sign up', 'get started', 'subscribe', 'buy now', 'contact us') are
 * retained because they are currently absent AND read as promotional CTA copy on a
 * log surface; if a future technical note legitimately uses one, drop it here with
 * a documented reason rather than weakening the assertion silently.
 *
 * Deterministic, no network. Run via `npm test` (tsx --test).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderPrerenderBody } from '../scripts/prerenderBody.ts';

/**
 * Promotional/CTA/booking needles forbidden on this identity-only log surface.
 * All verified ABSENT from the current baked corpus (see header). The strongest,
 * unambiguous booking needles ('book a call', 'request a demo', 'schedule a call',
 * '/book') are the load-bearing ones.
 */
const FORBIDDEN = [
  'book a',
  '/book',
  'buy now',
  'sign up',
  'get started',
  'schedule a call',
  'contact us',
  'hire me',
  'book a call',
  'request a demo',
  'subscribe',
  'orionintelligenceagency',
];

/** Pure detector: which forbidden needles appear in a (lowercased) body. */
function ctaLeaks(body: string): string[] {
  const lower = body.toLowerCase();
  return FORBIDDEN.filter((needle) => lower.includes(needle));
}

test('baked feed body carries NO promotional/CTA copy (R10 content boundary)', () => {
  // Call renderPrerenderBody() with no args — identical to how bodyBakePlugin.ts
  // invokes it (it defaults to getOrderedEntries()).
  const baked = renderPrerenderBody().toLowerCase();
  const leaks = FORBIDDEN.filter((needle) => baked.includes(needle));
  assert.deepEqual(
    leaks,
    [],
    `identity-only log surface must carry no promotional/CTA copy; leaked: ${JSON.stringify(leaks)}`,
  );
});

// ---------------------------------------------------------------------------
// NEGATIVE control — prove the detector FAILS on a regression, so a real future
// CTA leak cannot pass green. If ctaLeaks() were a no-op, this would fail.
// (Modeled on identityGuard.test.ts and danielmercede-info's identity-guardrail
// negative control.)
// ---------------------------------------------------------------------------

test('NEGATIVE: a synthetic CTA string is flagged by the detector', () => {
  const synthetic =
    '<div data-prerender="true"><h1>Notes</h1>' +
    '<p>Ready to ship? Book a call and request a demo today.</p></div>';
  const leaks = ctaLeaks(synthetic);
  assert.ok(leaks.length > 0, 'detector must flag a body containing forbidden CTA copy');
  assert.ok(leaks.includes('book a call'), `expected 'book a call' to be flagged; got ${JSON.stringify(leaks)}`);
  assert.ok(leaks.includes('request a demo'), `expected 'request a demo' to be flagged; got ${JSON.stringify(leaks)}`);

  // And a clean working-log body must NOT be flagged (no false positive).
  const clean =
    '<div data-prerender="true"><h1>Notes</h1>' +
    '<p>Hypothesis: the merge gate fails closed. Result: confirmed.</p></div>';
  assert.deepEqual(ctaLeaks(clean), [], 'a clean working-log body must not be flagged');
});

// ---------------------------------------------------------------------------
// Archived Cosmocrat entries (specs/archived-entry-notice-spec.md).
// Cosmocrat is now Cosmocrat OS ("Tools for human-directed AI work"). Older log
// entries that describe the retired governance platform (a control plane that
// enforces policy at runtime, Drift Guard, the platform migration) stay
// published as historical records, but every one must carry the archive banner
// so no live entry presents those claims as current.
// ---------------------------------------------------------------------------

import { getOrderedEntries } from '../scripts/prerenderBody.ts';

const COSMOCRAT_ARCHIVE_NOTICE =
  'Archived log entry. Cosmocrat is now Cosmocrat OS; see https://www.cosmocrat.ai/about';

/** Entries archived by this change: named by the brief, plus the Drift Guard receipts note. */
const ARCHIVED_COSMOCRAT_SLUGS = [
  '2026-02-14-runtime-governance-short-essay-enforce', // "Cosmocrat Control Plane ... enforces policy"
  '2026-02-15-governance-and-the-importance-of', // "Drift Guard is a critical Cosmocrat component"
  '2026-03-03-governed-memory-as-infrastructure-in-a', // Cosmocrat system's control plane
  '2026-01-26-drift-guard-receipts', // Drift Guard Service remediation
  'cosmocrat-migration-pause', // "Cosmocrat Platform Migration" (legacy constants.ts)
];

/** "Cosmocrat" as the old platform name: any mention not in the current "Cosmocrat OS" form. */
const LEGACY_COSMOCRAT = /\bcosmocrat\b(?!\s+os\b)/i;

test('every entry naming the legacy Cosmocrat platform carries an archive banner', () => {
  const unbannered = getOrderedEntries()
    .filter((entry) => {
      const { archiveNotice: _notice, ...rest } = entry;
      return LEGACY_COSMOCRAT.test(JSON.stringify(rest));
    })
    .filter((entry) => !entry.archiveNotice)
    .map((entry) => entry.slug);
  assert.deepEqual(unbannered, [], `legacy Cosmocrat claims without an archive banner: ${unbannered.join(', ')}`);
});

test('archived Cosmocrat entries carry the exact banner and stay published', () => {
  const bySlug = new Map(getOrderedEntries().map((entry) => [entry.slug, entry]));
  for (const slug of ARCHIVED_COSMOCRAT_SLUGS) {
    const entry = bySlug.get(slug);
    assert.ok(entry, `archived entry must stay published (not deleted): ${slug}`);
    assert.equal(entry.archiveNotice, COSMOCRAT_ARCHIVE_NOTICE, `wrong or missing banner on ${slug}`);
  }
});

test('the baked body shows the banner inside each archived Cosmocrat article', () => {
  const baked = renderPrerenderBody();
  for (const slug of ARCHIVED_COSMOCRAT_SLUGS) {
    const start = baked.indexOf(`<article id="${slug}">`);
    assert.ok(start >= 0, `article missing for ${slug}`);
    const article = baked.slice(start, baked.indexOf('</article>', start));
    assert.ok(
      article.includes('<p role="note">Archived log entry. Cosmocrat is now Cosmocrat OS; see <a href="https://www.cosmocrat.ai/about">'),
      `baked article for ${slug} lacks the linked banner`,
    );
  }
});
