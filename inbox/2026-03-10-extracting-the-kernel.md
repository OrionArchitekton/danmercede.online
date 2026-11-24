---
title: Extracting the Kernel
slug: 2026-03-10-extracting-the-kernel
date: '2026-03-10T19:30:00+0000'
type: working-note
content: 'Lifting the decision kernel out of the legacy core into its own repo, one invariant at a time — the decision contract, the receipt path, the drift rules. The repo split is the easy part. The boundary is only real if each invariant is written down and frozen as it leaves; otherwise I have just moved the coupling and renamed it architecture.'
openQuestion: What is the minimal frozen contract per invariant that makes the boundary enforceable rather than cosmetic?
tags:
  - systems
  - governance
context: systems
externalContext:
  whyItMatters: The repo split is the easy part. What is the minimal frozen contract per invariant that makes the boundary enforceable rather than cosmetic?
  plainTermsNote: receipt means an immutable record tying an action to its verified inputs and exact outcome; drift means silent divergence between source declarations and generated or deployed state; boundary means the tool or interface layer where deterministic checks override prompt intent.
  guideUrl: 'https://www.danmercede.com/guides/done-needs-a-receipt'
  guideLabel: 'Guide: Why Done Needs a Verification Receipt on danmercede.com'
---

