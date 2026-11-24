---
title: "Self-Hosting Has Two Planes, Not One"
slug: "2026-06-25-self-hosting-two-planes"
date: "2026-06-25T16:45:00-0700"
type: "short-essay"
claim: "Most self-hosting messes trace to one mistake: treating every service the same. Split them by a single question — does the public need to reach this? Public apps go through one controlled ingress plane (Cloudflare Tunnel to Traefik to containers, zero public inbound ports); everything you administer stays on a private mesh (Tailscale). The two planes meet only through routes you declare, never by accident. The discipline is one sentence: classify every service by whether the public needs it, put it on the matching plane, and verify the bind address — not just the health check."
implication: "Wrote the whole thing up end to end — Cloudflare Tunnel, Traefik, Tailscale, the auth model, and a security checklist: https://www.danmercede.com/guides/self-hosting-websites-and-apps"
tags: ["infra", "security", "systems"]
context: "infra"
externalContext:
  whyItMatters: "Outside our local build environment, \"Self-Hosting Has Two Planes, Not One\" captures a portable lesson for engineering teams: Most self-hosting messes trace to one mistake: treating every service the same. Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "Engineering log note translating an internal workflow observation into portable production rules for any agent or software team."
  guideUrl: "https://www.danmercede.com/guides/self-hosting-websites-and-apps"
  guideLabel: "Guide: Self-Hosting Apps Safely on danmercede.com"
---
