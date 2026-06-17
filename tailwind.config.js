/** @type {import('tailwindcss').Config} */
// Bundled Tailwind config — replaces the production Tailwind CDN JIT compiler (a
// ~123KB-gzip render-blocking script that recompiled CSS on every page load).
// Mirrors the inline `tailwind.config` that previously lived in index.html so the
// utility set and custom tokens (signal palette, Inter/JetBrains) are unchanged;
// Vite now emits a compiled stylesheet at build time. The body-bake
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
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        signal: {
          black: '#111111',
          gray: '#666666',
          light: '#E5E5E5',
          bg: '#FAFAFA',
        },
      },
    },
  },
  plugins: [],
};
