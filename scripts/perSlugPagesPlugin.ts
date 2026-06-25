/**
 * perSlugPagesPlugin.ts — Vite plugin: emit one static page per entry (spec: per-slug-pages-spec.md).
 *
 * Runs inside `vite build` (which Vercel runs every deploy). After the bundle is written,
 * reads the final `dist/index.html` (already body-baked + carrying hashed asset refs by
 * bodyBakePlugin) and writes `dist/<slug>/index.html` for every entry, each transformed by
 * buildEntryPageHtml into a self-canonical single-entry page. Vercel `cleanUrls` serves
 * `dist/<slug>/index.html` at `/<slug>` via filesystem precedence — no rewrite, no SSR.
 *
 * `closeBundle` (not `transformIndexHtml`) so it reads the FINAL baked shell off disk,
 * after bodyBakePlugin's transform has landed.
 */

import type { Plugin } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getPageEntries } from './prerenderBody.ts';
import { buildEntryPageHtml } from './perSlugPages.ts';

// Mirror the compiler's slug contract; the emitter must never write outside dist/<slug>/.
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function perSlugPagesPlugin(): Plugin {
  return {
    name: 'danmercede-per-slug-pages',
    apply: 'build',
    async closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      const shellPath = path.join(distDir, 'index.html');
      const shell = await fs.readFile(shellPath, 'utf8').catch(() => {
        throw new Error(`perSlugPages: ${shellPath} not found — vite build must emit dist/index.html first.`);
      });

      const entries = getPageEntries();
      let written = 0;
      for (const entry of entries) {
        // Defense-in-depth: slugs are compile-validated (SAFE_SLUG_PATTERN), but this
        // step writes files from that data — refuse anything that could escape dist/.
        if (!SAFE_SLUG.test(entry.slug)) {
          throw new Error(`perSlugPages: refusing to emit page for unsafe slug "${entry.slug}"`);
        }
        let html: string;
        try {
          html = buildEntryPageHtml(shell, entry);
        } catch (err) {
          // Name the offending entry so an aborted build is triageable (fail closed).
          throw new Error(`perSlugPages: failed building page for "${entry.slug}": ${err instanceof Error ? err.message : err}`);
        }
        const outDir = path.join(distDir, entry.slug);
        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
        written++;
      }
      console.log(`[perSlugPages] wrote ${written} per-slug pages → dist/<slug>/index.html`);
    },
  };
}
