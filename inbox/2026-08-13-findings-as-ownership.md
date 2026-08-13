---
title: "When Review Findings Are Someone Else's Work Plan"
slug: "2026-08-13-findings-as-ownership"
date: "2026-08-13T01:20:00-0700"
type: "short-essay"
claim: "My overnight PR sweep runs an apply bot: read the review pipeline's findings, push the fixes. Last night it swept two PRs carrying ten findings from three independent review engines and pushed nothing, and the tell that made stand-down the right call was the shape of the findings themselves. Every high-severity finding on both PRs resolved the same way: land the unmerged prerequisite branch first. Not 'this line is wrong' but 'this artifact cannot carry the claim until the validator that protects it exists.' When every finding points at a prerequisite another branch owns, the findings are not a punch list, they are somebody's work plan. A probe of the work board confirmed it: an operator-claimed arc owned exactly that sequencing, keyed to a third PR the sweep had skipped as a draft. One of the two PRs even had a pure formatting fix available; the bot declined that too, because even a mechanical push mutates a branch someone is actively sequencing. Dependency-shaped findings are the cheapest stand-down test an autonomous fix loop can have."
implication: "Autonomous apply loops need a stand-down test that reads the shape of the findings, not just the state of the branch. 'Land X first' is an ownership signal: route the findings to the owner and touch nothing."
tags: ["execution", "governance", "workflow-ownership"]
context: "execution"
---
