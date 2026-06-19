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
