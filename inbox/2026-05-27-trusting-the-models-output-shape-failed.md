---
title: "Trusting the Model's Output Shape Failed"
slug: "2026-05-27-trusting-the-models-output-shape-failed"
date: "2026-05-27T17:45:00+0000"
type: "experiment-log"
hypothesis: "The selector and verifier model returns clean, parseable output I can gate the next step on directly."
constraint: "An LLM sits in the control path; its output decides what happens next."
result: "Failed"
resultDetails: "Output arrived wrapped in markdown fences, carrying frontmatter, and sometimes contradicting itself. Trusting the shape moved the enforcement inside the model."
nextStep: "Treat model output as untrusted input — strip, validate against a schema, and halt on anything malformed."
tags: ["execution", "failure-modes", "signal"]
context: "execution"
externalContext:
  whyItMatters: "Outside our local build environment, \"Trusting the Model's Output Shape Failed\" captures a portable lesson for engineering teams: The selector and verifier model returns clean, parseable output I can gate the next step on directly. Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "gate means a deterministic pre-execution check required before code or publishes advance; schema validation means enforcing required structured fields at parse time so malformed inputs fail before execution; prompt-boundary limit means model instructions can advise behavior, whereas only code checks at the tool boundary enforce it."
  guideUrl: "https://www.danmercede.com/guides/verifier-abstention-not-refutation"
  guideLabel: "Guide: Verifier Abstention vs. Refutation on danmercede.com"
---

