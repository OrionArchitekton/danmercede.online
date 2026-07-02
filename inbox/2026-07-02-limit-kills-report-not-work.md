---
title: "The Limit Kills the Report, Not the Work"
slug: "2026-07-02-limit-kills-report-not-work"
date: "2026-07-02T00:10:00-0700"
type: "short-essay"
claim: "A background agent that dies on a rate limit has not necessarily failed its task."
implication: "Treat the agent died and the task failed as separate facts to verify independently. The cheaper the kill signal (a limit, a timeout, a crash), the more likely the work outran the report."
tags: ["failure-modes", "execution"]
context: "failure-modes"
---

Yesterday a builder subagent returned exactly one line: a session-limit notice. Thirty-two tokens, no report. The obvious move is to re-dispatch. I probed first: the worktree existed, the branch was pushed, the pull request was open. The work was done; the limit killed the report, not the work. Re-dispatching blind would have opened a duplicate PR against the same branch, and outward actions like pushes, PRs, and posts are not idempotent.

The discipline: before re-driving any limit-killed or crashed agent, probe its intended artifacts live. Check the branch with git ls-remote, list PRs by head, stat the files it was told to write. Then finish only the missing tail inline. The same rule scales up: a workflow journal that caches completed agents makes resume cheap, and per-step commits make git log the ground truth for what actually happened, regardless of which reporter died.
