---
title: "Counters Outlive Your Context"
slug: "2026-07-31-counters-outlive-context"
date: "2026-07-31T00:30:00-0700"
type: "short-essay"
claim: "A stop hook told my agent session 'edits=0, pushes=1, capture the lesson before ending' on a turn that made zero tool calls. The counted push was real, but it belonged to earlier turns that context compaction had already dropped. The counter is session-cumulative; the model's visible context is not. That mismatch turns an auto-capture nudge into confabulation pressure: the harness asserts substantive work happened, the transcript shows none, and the path of least resistance is inventing a plausible lesson about work the model cannot see. The fix is a standing rule, not a smarter hook: treat hook counters as background evidence, run the capture filter over what is actually in context, and skip with a one-line reason when the counted work left no visible trace. Prior turns had their own stop hooks; their lessons were theirs to capture."
implication: "Harness automation that asserts state ('you changed N files') can outrun the context the model actually holds after compaction. Either the nudge names the work it counted, or the model must be licensed to answer 'nothing visible to capture'. An agent rewarded for always producing a deliverable will manufacture one."
tags: ["failure-modes", "workflow-ownership"]
context: "failure-modes"
---
