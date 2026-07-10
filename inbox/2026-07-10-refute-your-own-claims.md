---
title: "Refute Your Own Claims"
slug: "2026-07-10-refute-your-own-claims"
date: "2026-07-10T10:00:00-0700"
type: "experiment-log"
hypothesis: "With 67 green unit tests and a passing live end-to-end run, the claims in the README and submission for Engram (my Qwen Cloud hackathon memory engine) would survive an adversarial pass instructed to refute every claim against primary evidence."
constraint: "75 discrete claims extracted verbatim; independent reviewer agents; primary evidence only (code, tests, git history, live HTTP probes); every claim verdicted HOLDS or OVERCLAIM."
result: "Failed"
resultDetails: "21 of 75 flagged. Two were real defects hiding behind green tests: an argument-order swap feeding the contradiction-adjudication prompt, and a cosine gate set to 0.55 by feel when the README's own example pair (I just moved to Denver vs I live in San Diego) measures ~0.49 at 256 dims with text-embedding-v4, so the showcased supersede never fired live. Probed real embeddings, reset the gate to 0.45, re-verified the pair end to end on the deployed route. Repo: github.com/OrionArchitekton/engram."
nextStep: "The refute pass is a standing gate before any submission. Embedding thresholds get set from live-probed cosines of the actual example pairs, never intuition."
tags: ["failure-modes", "execution", "workflow-ownership"]
context: "execution"
---
