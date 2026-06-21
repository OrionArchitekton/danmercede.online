---
title: "Make Your RAG Earn Its Keep"
slug: "2026-06-21-make-your-rag-earn-its-keep"
date: "2026-06-21T07:20:00-0700"
type: "experiment-log"
hypothesis: "An internal structural code-search RAG tool beats the agent's own ripgrep-and-read loop on cross-repo lookups — by enough to justify keeping it."
constraint: "Equal corpus, same agent and model, a pre-registered case suite, and a +25-point margin required to KEEP. Gate-then-wire: read-only until it passed."
result: "Failed"
resultDetails: "On the cross-repo queries where a structural retriever was supposed to win, the grep-and-read agent resolved ~14 of 16; the RAG tool managed ~5 and timed out on the hard ones — a 56-point loss. Retired it. A small live dry-run also caught two verdict-corrupting bugs that hundreds of hermetic tests had passed green: a scoring-format mismatch that would have faked the verdict, and a database wiring bug. Hermetic tests mock the very things that decide the outcome — so read the per-row data, not the summary."
nextStep: "Keep the falsifiable gate; point any future code-RAG — including an off-the-shelf one — at it before trusting, or keeping, it."
tags: ["failure-modes", "execution", "systems"]
context: "execution"
---
