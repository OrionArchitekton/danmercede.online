// Pin the committed RSS/Atom CHANNEL copy to the operator/OIA-SMB positioning.
//
// public/feed.xml + public/atom.xml are rendered in the lane repo and land here
// by manual regenerate + commit (see #25, #103/#104 history). Nothing structural
// stops a regen from a stale lane checkout reintroducing the retired brand lead
// ("Runtime governance, control planes, and the operator-grade systems...") and
// shipping it silently — CI would stay green. This pins the channel description
// so that regression fails the `ci` gate instead. Run via `npm test` (tsx --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const feed = readFileSync(path.join(root, 'public', 'feed.xml'), 'utf8');
const atom = readFileSync(path.join(root, 'public', 'atom.xml'), 'utf8');

// Retired brand lead — PROHIBITION needles, kept aligned with the lane repo's
// tests/test_brand_positioning_pins.py so both ends of the render pipe agree.
const RETIRED_LEAD = /runtime governance|operator-grade|control planes?, and|enterprise AI operating system/i;

function channelDescription(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  assert.ok(m, `feed must carry a <${tag}> element`);
  return m[1];
}

test('feed.xml channel description carries the operator lead, not the retired one', () => {
  const desc = channelDescription(feed, 'description');
  assert.ok(!RETIRED_LEAD.test(desc), `retired brand lead in feed.xml description: ${desc}`);
  assert.match(desc, /workflow|operator/i, `feed.xml description lost the operator lead: ${desc}`);
});

test('atom.xml subtitle carries the operator lead, not the retired one', () => {
  const subtitle = channelDescription(atom, 'subtitle');
  assert.ok(!RETIRED_LEAD.test(subtitle), `retired brand lead in atom.xml subtitle: ${subtitle}`);
  assert.match(subtitle, /workflow|operator/i, `atom.xml subtitle lost the operator lead: ${subtitle}`);
});

test('negative control: the detector fires on the pre-reframe channel string', () => {
  const old = 'Runtime governance, control planes, and the operator-grade systems that make them work.';
  assert.ok(RETIRED_LEAD.test(old));
});
