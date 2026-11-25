/** @type {import('tailwindcss').Config} */
// Bundled Tailwind config: replaces the production Tailwind CDN JIT compiler (a
// ~123KB-gzip render-blocking script that recompiled CSS on every page load).
// Vite emits a compiled stylesheet at build time. The body-bake
// (scripts/prerenderBody.ts) emits plain class-less HTML, so it needs no content entry.
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './constants.ts',
    './constants.generated.ts',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Newsreader Variable"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      colors: {
        signal: {
          black: '#111111',
          gray: '#525252',
          light: '#E5E5E5',
          bg: '#FAFAFA',
        },
      },
    },
  },
  plugins: [],
};
