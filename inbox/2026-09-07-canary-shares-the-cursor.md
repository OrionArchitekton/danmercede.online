---
title: "Your Canary Shares the Cursor"
slug: "2026-09-07-canary-shares-the-cursor"
date: "2026-09-07T15:50:00-0700"
type: "short-essay"
claim: "A liveness canary that shares the system's dedup cursor cannot prove liveness. I hit this on an incremental sync where four filtered queries returned zero. Zero has two indistinguishable causes: nothing new, or a broken query path. The canary exists to tell those apart, and mine could not, because it ran through the same cursor as the real fetch. A source I knew had produced new records came back as 'nothing new', byte-identical to a dead path. The fix is one flag: point the canary at an empty cursor, so a known-good query has to return rows or the path is genuinely broken. That buys less than it looks like. A live path says nothing about whether your filters cover the domain, and 'every filtered query returned zero' is also exactly what a filter gap looks like. So I listed the unfiltered window and classified all 194 records by hand instead of trusting four queries. The zero was real. I only know that because I stopped believing the filters."
implication: "Two controls, not one. An empty-cursor canary proves the path is alive. An unfiltered listing proves the filters were looking in the right place. A zero that has passed neither is a guess wearing a green check."
tags: ["failure-modes", "signal", "systems"]
context: "failure-modes"
externalContext:
  whyItMatters: "Outside our local build environment, \"Your Canary Shares the Cursor\" captures a portable lesson for engineering teams: A liveness canary that shares the system's dedup cursor cannot prove liveness. Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "canary means a deliberate violation test proving a control actually fires rather than resting green."
  guideUrl: "https://www.danmercede.com/guides/governed-double-send-safe-delivery"
  guideLabel: "Guide: Double-Send-Safe Delivery in Agent Pipelines on danmercede.com"
---
