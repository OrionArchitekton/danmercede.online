---
title: "The Control That Shared the Contamination"
slug: "2026-08-16-control-shared-contamination"
date: "2026-08-16T13:15:00-0700"
type: "experiment-log"
hypothesis: "A test that fails in my fresh worktree and still fails with my edit stashed must be broken on the base branch, not by me."
constraint: "Docs-only change; the repo's pre-commit hook reruns all 202 test scripts as the commit gate."
result: "Failed"
resultDetails: "git stores only the executable bit; every other mode bit comes from checkout umask. The worktree was created under umask 0002, so files landed group-writable, and a validator asserting exact modes on checked-in fixtures threw 'mode mismatch' either way. The stash control ran in the same checkout: it could only confirm the contamination, never isolate it. chmod g-w on the fixture tree turned the suite green."
nextStep: "When a control run must exonerate the base branch, vary the environment too: a second checkout under a clean umask, then compare."
tags: ["failure-modes", "execution"]
context: "failure-modes"
externalContext:
  whyItMatters: "Outside our local build environment, \"The Control That Shared the Contamination\" captures a portable lesson for engineering teams: A test that fails in my fresh worktree and still fails with my edit stashed must be broken on the base branch, n.... Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "worktree means an isolated branch checkout keeping parallel edits separate from clean main."
  guideUrl: "https://www.danmercede.com/guides/git-worktree-overlap-report"
  guideLabel: "Guide: Isolating Concurrent Agent Worktrees on danmercede.com"
---
