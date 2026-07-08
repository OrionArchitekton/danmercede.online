---
title: "Certify vs Reproduce"
slug: "2026-07-08-certify-vs-reproduce"
date: "2026-07-08T09:20:00-0700"
type: "short-essay"
claim: "A reviewer that reasons about your code and one that runs it have different blind spots: certification is an argument, reproduction is a fact."
implication: "For AI-written code, stack independent review layers so one layer's blind spot is another layer's catch."
tags: ["failure-modes", "execution", "security"]
context: "failure-modes"
image:
  src: "/assets/signals/independent-review-stack.webp"
  alt: "The independent review stack: four orthogonal review layers for agent-written code (live environment recon, a pre-PR multi-model fleet, post-push functional execution, and the CI merge gate), each sensing a different modality and catching a defect the others miss."
  caption: "Four review layers, each sensing a different modality. Independent ones do not share blind spots."
---

A security reviewer read my credential scrubber and certified it: no overlap mis-redaction. One review layer later, a different reviewer ran the code and reproduced a partial secret in the logs. Same function, opposite verdict.

The two reviewers were not unequal in skill. They had different blind spots. A reviewer that reasons about your code builds an argument for why it is correct. A reviewer that executes it observes what actually happens. An argument can be sound and still miss the exact input the code meets in production. Reproduction does not get that option: the secret either leaks or it does not.

This is why a single review pass is not a safety net for AI-written code. The passes have to be independent, because independence is what stops their blind spots from lining up. Certification tells you a careful reasoner could not find the bug. Reproduction tells you whether the bug is there. Keep both, and keep them separate.

The full walkthrough, four review layers and five defects each caught by only one, is here: https://www.danmercede.com/guides/why-agent-code-needs-layered-review
