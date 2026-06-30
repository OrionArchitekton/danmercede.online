---
title: "Prefill demos server-side"
slug: "2026-06-30-prefill-demos-server-side"
date: "2026-06-30T16:45:00-0700"
type: "experiment-log"
hypothesis: "An automated, headless demo pipeline can record a stateful web app's flow shot-by-shot as scripted, with no changes to the app."
constraint: "Each shot runs in a fresh browser context (no carried state), and the pipeline trims each segment to its narration length."
result: "Failed"
resultDetails: "Shots that triggered a live async result and then narrated it showed only the loading spinner: the rendered result landed after the narration window and got trimmed off, and later shots ran against a blank page because state did not carry. The fix that made it deterministic was a server-rendered demo mode (a query param read on the server) that seeds prefilled inputs AND a frozen-but-real result directly into the server-rendered HTML, so the content is present on load with no hydration race. A browser-side effect that prefilled after mount lost the race against capture. Second fix: long captions cover the very thing you narrate, so render one result card full screen per shot instead of all of them."
nextStep: "Make the server-rendered demo mode and one-card-per-shot the default in the demo tooling. Unrelated footgun from the same run: kill dev servers by port, never by matching the process command line, because that also hits your own running script and kills the run, and a stale server still holding the port makes a fresh build silently serve the old code."
tags: ["failure-modes", "execution", "systems"]
context: "execution"
---
