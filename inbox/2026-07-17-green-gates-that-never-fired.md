---
title: "Green Gates That Never Fired"
slug: "2026-07-17-green-gates-that-never-fired"
date: "2026-07-17T09:30:00-0700"
type: "experiment-log"
hypothesis: "The 'Prerender validation passed' line in a client site's build log meant its per-route titles and OG tags were protected."
constraint: "Flip the warn-only validator to fail-closed with non-empty assertions and let the very next build tell the truth."
result: "Failed"
resultDetails: "The gate had never fired once. It warned instead of exiting nonzero, and its title regex matched an empty <title></title>, so all 102 prerendered routes had shipped empty heads for four months. Root cause one layer down: the pages are React.lazy behind Suspense, and synchronous renderToString snapshots the loading fallback, so react-helmet never populates. Every social link share rendered a blank preview card the whole time. The fail-closed flip caught it on the first build. Fix: renderToPipeableStream buffered to onAllReady so lazy routes resolve before the head snapshot, plus non-empty assertions on title, description, canonical, and h1."
nextStep: "Audit every 'validation passed' build step for whether it can actually fail, and grep the BUILT artifact for the asserted property instead of trusting the log line."
tags: ["failure-modes", "systems", "signal"]
context: "failure-modes"
---

A build log that says "validation passed" has two indistinguishable causes: the check found nothing wrong, or the check cannot find anything wrong. This one was the second kind twice over. It warned instead of failing, and its regex accepted the empty case it existed to catch.

The tell was cheap to find: grep the built output for the property the gate claims to protect. Empty title tags on 102 routes, four months, zero build failures.
