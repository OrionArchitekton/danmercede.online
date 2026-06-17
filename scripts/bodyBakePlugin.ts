/**
 * bodyBakePlugin.ts — Vite plugin: build-time body-bake (W1).
 *
 * Runs inside `vite build` (which Vercel runs on every deploy — `dist/` is the
 * deploy truth, not a committed bundle). Injects the browserless, no-React
 * prerendered feed (scripts/prerenderBody.ts) INTO `<div id="root">` so the
 * served `<body>` carries real crawlable content (<h1> + per-entry <h2>/<p>)
 * for raw-HTML answer engines. React's createRoot().render() replaces the root's
 * children on hydration, so interactive users still get the live SPA.
 *
 * NO SSR. NO framework runtime. Pure string injection at transformIndexHtml time.
 */

import type { Plugin } from 'vite';
import { renderPrerenderBody } from './prerenderBody.ts';

export function bodyBakePlugin(): Plugin {
  return {
    name: 'danmercede-body-bake',
    // Run during build only; `dev` serves the empty shell + live HMR React.
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        const baked = renderPrerenderBody();
        // Inject the prerender block as the children of the existing root div.
        // Matches `<div id="root"></div>` (with optional whitespace).
        const rootRe = /<div id="root">\s*<\/div>/;
        if (!rootRe.test(html)) {
          throw new Error(
            'bodyBakePlugin: could not find empty `<div id="root"></div>` to bake into; ' +
              'index.html structure changed.',
          );
        }
        return html.replace(rootRe, `<div id="root">${baked}</div>`);
      },
    },
  };
}
