import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Color from 'colorjs.io';

const ROOT = join(import.meta.dirname, '..');

test('all text and semantic tokens meet WCAG 2.1 AA (>=4.5:1) on light surfaces', () => {
  const tokens = JSON.parse(readFileSync(join(ROOT, 'tokens/brand.tokens.json'), 'utf8'));
  const surfaces = [
    tokens.color.surface.bg.$value,
    tokens.color.surface.card.$value,
    tokens.color.surface.well.$value,
  ];
  const inks = [
    tokens.color.text.primary.$value,
    tokens.color.text.secondary.$value,
    ...Object.values(tokens.color.semantic).map((entry: any) => entry.$value),
  ];

  for (const bg of surfaces) {
    for (const fg of inks) {
      const ratio = new Color(fg).contrast(new Color(bg), 'WCAG21');
      assert.ok(ratio >= 4.5, `${fg} on ${bg} contrast ${ratio.toFixed(2)}:1 < 4.5:1`);
    }
  }
});

test('typography and responsive guards are wired in App.tsx, EntryCard.tsx, and tailwind.config.js', () => {
  const tw = readFileSync(join(ROOT, 'tailwind.config.js'), 'utf8');
  assert.ok(tw.includes('Newsreader Variable'));
  assert.ok(tw.includes('IBM Plex Sans Variable'));
  assert.ok(tw.includes('JetBrains Mono Variable'));

  const app = readFileSync(join(ROOT, 'App.tsx'), 'utf8');
  assert.match(app, /<h1[^>]*font-serif[^>]*text-\[28px\]/);
  assert.match(app, /overflow-x-hidden/);

  const card = readFileSync(join(ROOT, 'components/EntryCard.tsx'), 'utf8');
  assert.match(card, /<h2[^>]*font-serif[^>]*text-\[20px\]/);
  assert.doesNotMatch(card, /\btext-gray-400\b/);
  assert.doesNotMatch(card, /\btext-amber-600\b/);
  assert.doesNotMatch(card, /\btext-emerald-600\b/);
});
