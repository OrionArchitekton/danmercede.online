import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { bodyBakePlugin } from './scripts/bodyBakePlugin.ts';
import { perSlugPagesPlugin } from './scripts/perSlugPagesPlugin.ts';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // bodyBakePlugin (build-only) bakes the crawlable feed into <div id="root">
      // so raw-HTML answer engines see real content (W1). No SSR.
      // perSlugPagesPlugin (build-only, closeBundle) then emits one self-canonical
      // static page per entry at dist/<slug>/index.html (served by Vercel cleanUrls).
      plugins: [react(), bodyBakePlugin(), perSlugPagesPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
