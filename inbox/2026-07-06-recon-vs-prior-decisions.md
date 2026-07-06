---
title: "Recon vs Prior Decisions"
slug: "2026-07-06-recon-vs-prior-decisions"
date: "2026-07-06T00:20:00-0700"
type: "short-essay"
claim: "A fresh recon-and-synthesis agent sees only live system state, not the decisions you already made about it, so it will confidently recommend something you already rejected."
implication: "Reconcile the raw synthesis against your prior decision docs before acting; the reconciliation, not the recon, is the trustworthy output."
tags: ["execution", "systems", "signal"]
context: "execution"
---

Fan a recon pass out over live state, let an agent synthesize it, and the result is grounded, plausible, and blind. It answers "what is the state" but not "what has already been decided about it." So it surfaces the obvious move, say "route all the inference to the idle GPU," when an earlier analysis already found the real constraint was model reliability, not spare capacity, and rejected exactly that. The synthesis is well cited and wrong.

The fix is cheap. Either seed the synthesis with prior-decision context (run a memory or lessons search first and feed its digest into the synthesis prompt), or treat the raw synthesis as a draft and reconcile it against your decision docs yourself before you act. The reconciliation is the deliverable, not the recon.

A second shape of the same blindness shows up in wide research fan-outs: a broad multi-part question spends its budget where sources are dense and quietly under-covers the sparse sub-questions. Do not accept the half-answer, and do not rerun the whole thing. Fire a focused re-run scoped to just the starved parts, and read the abstention as a gap to close rather than an answer.
