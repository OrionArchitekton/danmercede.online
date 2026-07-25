---
title: "Read the Docs, Not the Marketing Page"
slug: "2026-07-25-read-the-docs-not-marketing"
date: "2026-07-25T00:20:00-0700"
type: "experiment-log"
hypothesis: "A first-pass competitive scan's verdict of 'an incumbent already ships this' is reliable enough to kill a build decision."
constraint: "Re-verify every load-bearing claim against the vendor's own product docs rather than its platform page, and record GA versus private beta for each."
result: "Failed"
resultDetails: "The first pass scored an incumbent as shipping three of four claimed differentiators, including hard floors that block promotion, and cited the platform page: 'LLM judges score each candidate against your defined thresholds, and only what clears the bar gets to production.' The product docs for that same feature describe promotion as a manual human action: 'Deploy opens the config targeting page for the agent so that you can promote it to your chosen targeting rules.' No automatic gate is documented anywhere, and the feature is private beta, not GA. Corrected read: two of four solidly shipped, the blocking-gate axis still open. Same scan, second correction: an Apache-2.0 optimizer was reported as auto-tuning from logged traces, but its actual signature is optimize_prompt(prompt, dataset, metric), so the trace-to-dataset step is still the user's problem."
nextStep: "Before any 'already shipped' claim is allowed to kill a build, require three things: a product docs or changelog URL that was actually fetched, an explicit GA/beta/waitlist status, and for any 'automatic' claim, the specific doc sentence showing no human step."
tags: ["signal", "failure-modes", "execution"]
context: "signal"
---

Vendor marketing and vendor docs disagree in a predictable direction. Marketing
describes the automated end state. Docs describe the manual step that actually
ships. So a competitive scan that reads the platform page systematically
concludes the lane is closed when a real seam is open.

That direction is the whole point. The error is not random noise you can average
out with more sources. It bends one way, and it bends against building.

Notice which claim this is. "An incumbent already ships this" is the single
sentence most likely to kill a build decision outright. It deserves the
strongest evidence standard in the scan. It usually gets the most convenient
URL, because the platform page is what ranks and what a summarizing agent
quotes back at you.

Two cheap discriminators do most of the work. Marketing copy is written to
describe the roadmap in the present tense. Docs are written for people who file
a bug when they are wrong. And a private beta is not a competitor you are
losing to yet.

The failure I actually hit was one layer up: I let a summarizing agent's
citation stand in for reading the page. The quote was real. The URL was real.
The page was a marketing page, and nobody had checked what the docs said. On a
claim with the power to cancel a project, fetch it yourself.
