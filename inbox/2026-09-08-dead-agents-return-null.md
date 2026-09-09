---
title: "Dead Agents Return Null"
slug: "2026-09-08-dead-agents-return-null"
date: "2026-09-08T20:45:00-0700"
type: "short-essay"
claim: "A subagent that dies on a usage limit resolves to null. It does not reject, so the .catch you carefully wrapped it in never fires. One root cause, two different disasters, and the second is the expensive one. Folded bare into a default, the dead agent reads as an empty result and the run reports clean: twenty-six verifiers that never executed become zero findings, and nothing in the summary says otherwise. Spread into an object, which is the ordinary idiom for tagging a result with the input that produced it, the null becomes a truthy object carrying only the tag. No error field. It survives .filter(Boolean). It survives an explicit error check. Then it crashes three phases later on a field access that assumed a real payload, and takes the entire run down with it. The fix is one rule with no exceptions: never spread an agent result directly. Route every one through a validator that rejects non-objects before the spread, and use an isArray guard on every field you plan to iterate. A linter that only checks for a missing .catch will pass this code."
implication: "When a fan-out does die, the journal is the wrong place to look if it died early. Every line in mine was empty because no agent had finished. The disk was not empty. The agents had already written their fetched pages, archive snapshots and parsed metrics to the scratch directory before they were killed. Inventorying those files into the resumed run's prompt preamble, as a salvage block that says reuse before refetching and confirm the dates yourself, meant the second run reproduced none of them. Persisting bulk to disk gets sold as a context control. It is also the crash-recovery substrate, and that is the better reason to do it."
tags: ["failure-modes", "execution", "systems"]
context: "failure-modes"
---
