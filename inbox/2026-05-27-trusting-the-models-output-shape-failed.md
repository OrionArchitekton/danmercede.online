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
---

