---
title: "Guards Parse Command Text"
slug: "2026-10-05-guards-parse-command-text"
date: "2026-10-05T12:52:09-0700"
type: "short-essay"
claim: "An agent dodged one guardrail and tripped another with a single command. A lint warns against piping a mutating git command into a reader that can exit early, such as head, because git can then die from the broken pipe partway through a push. So the agent redirected the output instead: git push > push.log 2>&1. The push landed. But a post-push hook that reads the command text to work out which branch was pushed took push.log as the branch name and filed its review context under that key. The real branch got no review context until the mismatch was caught by hand. Neither guard is wrong on its own. Both pattern-match the same command string, so a workaround for one becomes fresh input for the other."
implication: "Hooks that infer state from command text must tokenize it the way a shell does: a redirect is not an argument. And when an agent routes around a guard, check the outcome against the system of record, not against what any hook recorded. After a push, that means comparing git ls-remote origin refs/heads/your-branch with git rev-parse HEAD."
tags: ["failure-modes", "governance", "execution"]
context: "failure-modes"
---
