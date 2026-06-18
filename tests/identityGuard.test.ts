/**
 * identityGuard.test.ts — spoke-side identity guardrail (round-2 R12 / O7).
 *
 * The hub-spoke identity rule: a spoke MUST reference the hub Person via
 * `"@id": "https://www.danmercede.com/#person"` and MUST NOT declare its own
 * local Person node (a JSON-LD object whose `@type` is "Person" — bare or inside
 * an @type array — anchored to THIS spoke's own domain). A bare `@id` reference to
 * the hub #person is allowed; a self-defined Person node is the violation.
 *
 * Until now this was enforced HUB-side only (the hub's O7 contract+test). This adds
 * the SPOKE-side guard so a future regression (a competing local Person node, e.g.
 * someone "helpfully" adding a `Person` with `@id danmercede.online/#person` and
 * sameAs links) fails CI before it can ship to the live site.
 *
 * The two JSON-LD surfaces this spoke serves are BOTH guarded:
 *   1. index.html static JSON-LD (the committed crawler surface, served pre-bake).
 *   2. renderFeedJsonLd() — the build-time feed graph that bodyBakePlugin injects
 *      INTO index.html at `vite build` time, REPLACING the static block (W19).
 *
 * Deterministic and self-contained — no network. Run via `npm test` (tsx --test).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { renderFeedJsonLd } from '../scripts/prerenderBody.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const HUB_PERSON = 'https://www.danmercede.com/#person';
// THIS spoke's own origin (any @id anchored here that is typed Person is the violation).
const SPOKE_ORIGIN = 'https://www.danmercede.online';

// ---------------------------------------------------------------------------
// Helpers (pure, deterministic)
// ---------------------------------------------------------------------------

/** Extract the JSON object from a JSON-LD <script> in an HTML string. */
function jsonLdFromHtml(html: string): unknown {
  const m = html.match(
    /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  assert.ok(m, 'index.html must contain a JSON-LD <script> block');
  return JSON.parse(m![1]);
}

/** Flatten a JSON-LD document into its constituent nodes (handles @graph + arrays). */
function jsonLdNodes(doc: unknown): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      nodes.push(obj);
      if (Array.isArray(obj['@graph'])) obj['@graph'].forEach(visit);
    }
  };
  visit(doc);
  return nodes;
}

/** True if a node's @type is, or includes, "Person". */
function isPersonTyped(node: Record<string, unknown>): boolean {
  const t = node['@type'];
  if (typeof t === 'string') return t === 'Person';
  if (Array.isArray(t)) return t.includes('Person');
  return false;
}

/**
 * The single source of truth for the guard. Returns the local-Person violations in a
 * JSON-LD document: Person-typed nodes that are NOT a bare reference to the hub
 * #person (i.e. they are a self-defined Person node — they carry properties beyond an
 * @id, or are @id-anchored to anything other than the hub). The hub-only reference
 * `{ "@id": "https://www.danmercede.com/#person" }` is allowed and is never a node.
 */
function localPersonViolations(doc: unknown): Record<string, unknown>[] {
  return jsonLdNodes(doc).filter((node) => {
    if (!isPersonTyped(node)) return false;
    const id = node['@id'];
    // A Person-typed node whose @id is exactly the hub person is not a "local" node;
    // anything else (no @id, or an @id not equal to the hub) is a self-defined node.
    return typeof id !== 'string' || id !== HUB_PERSON;
  });
}

/** True if any node in the document references the hub #person (via @id). */
function referencesHubPerson(doc: unknown): boolean {
  return jsonLdNodes(doc).some((node) => {
    for (const value of Object.values(node)) {
      // Direct reference object: { "@id": HUB_PERSON }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ((value as Record<string, unknown>)['@id'] === HUB_PERSON) return true;
      }
      // The node itself might be the reference (e.g. about/publisher inline).
    }
    return node['@id'] === HUB_PERSON;
  });
}

// ---------------------------------------------------------------------------
// Surface 1 — the committed index.html static JSON-LD.
// ---------------------------------------------------------------------------

const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');
const indexDoc = jsonLdFromHtml(indexHtml);

test('index.html JSON-LD references the hub Person via @id', () => {
  assert.ok(
    indexHtml.includes(HUB_PERSON),
    `index.html must reference the hub Person ${HUB_PERSON}`,
  );
  assert.ok(
    referencesHubPerson(indexDoc),
    'a JSON-LD node in index.html must reference { "@id": hub #person }',
  );
});

test('index.html JSON-LD declares NO local Person node', () => {
  const violations = localPersonViolations(indexDoc);
  assert.deepEqual(
    violations,
    [],
    `index.html must not declare a local Person node; found: ${JSON.stringify(violations)}`,
  );
  // Defense-in-depth: no Person-typed @id anchored to this spoke's own origin.
  for (const node of jsonLdNodes(indexDoc)) {
    if (isPersonTyped(node)) {
      const id = String(node['@id'] ?? '');
      assert.ok(
        !id.startsWith(SPOKE_ORIGIN),
        `Person node anchored to this spoke (${id}) is forbidden; back-link the hub instead`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Surface 2 — the build-time feed graph that replaces index.html's block (W19).
// ---------------------------------------------------------------------------

const feedRaw = renderFeedJsonLd();
// renderFeedJsonLd escapes `<` as < for safe embedding; un-escape before parse.
const feedDoc = JSON.parse(feedRaw.replace(/\\u003c/g, '<'));

test('baked feed JSON-LD references the hub Person via @id', () => {
  assert.ok(
    feedRaw.includes(HUB_PERSON),
    `baked feed JSON-LD must reference the hub Person ${HUB_PERSON}`,
  );
  assert.ok(
    referencesHubPerson(feedDoc),
    'a node in the baked feed graph must reference { "@id": hub #person }',
  );
});

test('baked feed JSON-LD declares NO local Person node', () => {
  const violations = localPersonViolations(feedDoc);
  assert.deepEqual(
    violations,
    [],
    `baked feed graph must not declare a local Person node; found: ${JSON.stringify(violations)}`,
  );
  for (const node of jsonLdNodes(feedDoc)) {
    if (isPersonTyped(node)) {
      const id = String(node['@id'] ?? '');
      assert.ok(
        !id.startsWith(SPOKE_ORIGIN),
        `Person node anchored to this spoke (${id}) is forbidden; back-link the hub instead`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// NEGATIVE guard — prove the detector FAILS on a regression, so a real future
// regression cannot pass green. Inject a competing local Person node (the exact
// shape O7 forbids) and assert the guard flags it. This keeps the positive tests
// honest: if localPersonViolations() were a no-op, this would fail.
// ---------------------------------------------------------------------------

test('NEGATIVE: a competing local Person node is detected as a violation', () => {
  // A self-defined Person anchored to THIS spoke, with sameAs — the regression.
  const regressionGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SPOKE_ORIGIN}/#website`,
        publisher: { '@id': HUB_PERSON },
      },
      {
        '@type': 'Person',
        '@id': `${SPOKE_ORIGIN}/#person`,
        name: 'Dan Mercede',
        url: `${SPOKE_ORIGIN}/`,
        sameAs: ['https://github.com/OrionArchitekton'],
      },
    ],
  };

  const violations = localPersonViolations(regressionGraph);
  assert.equal(violations.length, 1, 'the injected local Person node must be flagged');
  assert.equal((violations[0] as Record<string, unknown>)['@id'], `${SPOKE_ORIGIN}/#person`);

  // And the array/bare @type forms are both caught.
  const arrayTypeGraph = {
    '@graph': [{ '@type': ['Person', 'ProfilePage'], name: 'X' }],
  };
  assert.equal(
    localPersonViolations(arrayTypeGraph).length,
    1,
    'a Person inside an @type array must be flagged',
  );

  // A bare hub reference must NOT be flagged (the allowed form).
  const allowedGraph = { '@graph': [{ '@id': HUB_PERSON }] };
  assert.deepEqual(
    localPersonViolations(allowedGraph),
    [],
    'a bare @id reference to the hub #person is allowed, not a violation',
  );

  // And a Person-typed node whose @id IS the hub person is allowed (defensive).
  const hubPersonNode = { '@graph': [{ '@type': 'Person', '@id': HUB_PERSON, name: 'Dan' }] };
  assert.deepEqual(
    localPersonViolations(hubPersonNode),
    [],
    'a Person node that IS the hub person (not a spoke-local one) is allowed',
  );
});
