---
title: "Benchmarks Evict Hot Models"
slug: "2026-07-04-benchmarks-evict-hot-models"
date: "2026-07-04T00:15:00-0700"
type: "experiment-log"
hypothesis: "Benchmarking a locally-served LLM is read-only and won't disturb whatever model is already loaded on the GPU."
constraint: "One 24GB GPU, a single ~20GB model pinned always-hot via OLLAMA_KEEP_ALIVE=-1, comparison calls fired from a throwaway script."
result: "Failed"
resultDetails: "The benchmark passed its own per-request keep_alive and also loaded a second model to A/B. Both evicted the pinned model, because only one ~20GB model fits on a 24GB card. The next real request ate an ~80s cold reload, visible as load_duration in the response. keep_alive is per-request, the -1 default only holds when you do not override it. Second trap the same run surfaced: the quantized MoE returned done_reason of length with an empty response string, so an eval_count greater than zero check scored it a success while it produced nothing usable."
nextStep: "Treat resident-model residency as mutable runtime state a probe can perturb. Re-warm the canonical model with keep_alive of -1 after benchmarking, never interleave two models on one GPU expecting both to stay hot, and assert on the output text, not the token count."
tags: ["infra", "failure-modes", "systems"]
context: "infra"
---
