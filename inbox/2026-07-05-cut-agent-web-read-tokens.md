---
title: "Cut Agent Web-Read Tokens"
slug: "2026-07-05-cut-agent-web-read-tokens"
date: "2026-07-05T15:40:00-0700"
type: "experiment-log"
hypothesis: "Converting a page to markdown before the model reads it, and fetching in a subagent, cuts an agent's web-read token cost without losing content."
constraint: "One real page, raw HTML vs clean markdown, same tokenizer."
result: "Passed"
resultDetails: "9,541 tokens raw vs 1,678 as markdown, an 82% cut on that page (20-30% typical). The extraction is deterministic markdown, not a model summary, so it cannot hallucinate. A keyless reader CLI runs in a subagent, so raw HTML never reaches the main context. A live smoke test caught a browser User-Agent 403 the unit tests missed."
nextStep: "Full stack and the reader CLI in the guide: https://www.danmercede.com/guides/giving-your-agent-web-access"
tags: ["economics", "execution", "systems"]
context: "execution"
image:
  src: "/assets/signals/efficient-web-access.webp"
  alt: "The cost of lazy web access versus a hardened stack: raw HTML wasting about 82 percent of an agent's context window, against a three-part stack of self-hosted search, extract-first markdown fetching, and a summarizing subagent that passes back only distilled facts."
  caption: "Raw HTML can burn 80 percent of an agent's context. Extract-first fetching keeps only the signal."
---
