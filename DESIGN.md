---
version: "1.0"
name: "danmercede.online"
description: "Living Signal Surface visual system with Newsreader editorial headings, IBM Plex Sans body copy, JetBrains Mono metadata, and WCAG 2.1 AA contrast."
colors:
  bg: "#fafafa"
  surface: "#ffffff"
  card-muted: "#f9fafb"
  chip-bg: "#f3f4f6"
  ink-primary: "#111827"
  ink-secondary: "#4b5563"
  border-subtle: "#e5e7eb"
  type-working-note: "#1d4ed8"
  type-status-update: "#047857"
  type-thought-snippet: "#7e22ce"
  type-experiment-log: "#92400e"
  type-diagram: "#334155"
typography:
  serif:
    fontFamily: "Newsreader Variable, Georgia, serif"
    h1Size: "28px / 32px"
    h2Size: "20px / 22px"
  sans:
    fontFamily: "IBM Plex Sans Variable, system-ui, sans-serif"
    bodySize: "16px"
  mono:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    metaSize: "12px"
---

# danmercede.online Design System

This document defines the canonical typography, color, layout, and touch-target standards for `danmercede.online`.

## Typography

- **Display / Headings (`h1`, `h2`)**: `Newsreader Variable` (`@fontsource-variable/newsreader`, OFL-1.1). `<h1>` renders at `28px` on mobile and `32px` on `sm+`; entry `<h2>` headings render at `20px` on mobile and `22px` on `md+`.
- **Body**: `IBM Plex Sans Variable` (`@fontsource-variable/ibm-plex-sans`, OFL-1.1) at `16px`.
- **Metadata / Code**: `JetBrains Mono Variable` (`@fontsource-variable/jetbrains-mono`, OFL-1.1) at `12px`.

## Contrast & Color Roles

- Surface background is `#fafafa` (`bg-signal-bg`) with `#ffffff` / `#f9fafb` cards.
- Primary ink is `#111827` (`gray-900`, 16.9:1 on `#fafafa`); secondary/metadata ink is `#4b5563` (`gray-600`, 7.2:1 on `#fafafa`).
- Entry type badges use darkened semantic inks (`blue-700`, `emerald-700`, `purple-700`, `amber-800`, `slate-700`), all >= 4.5:1 on `#fafafa`.

## Responsive & Touch Targets

- Header `Current Focus` chips wrap cleanly (`flex-wrap`) and containers enforce `min-w-0 break-words overflow-x-hidden` so `375x812` viewports have `0px` horizontal overflow.
- Primary header, navigation, filter-clear, and permalink controls maintain `>= 44x44px` hit areas; inline tag pills maintain `>= 28px` height (WCAG 2.2 AA).
