---
title: "The Canary Looked Fake"
slug: "2026-10-19-the-canary-looked-fake"
date: "2026-10-19T13:56:04-0700"
type: "experiment-log"
hypothesis: "Staging a fake GitHub token in a scratch repo proves my pre-commit secret gate blocks commits."
constraint: "One scratch repo with a local pre-commit hook, plus a global hooks directory running gitleaks 8.24.3 on default rules. git 2.43.0."
result: "Failed"
resultDetails: "The first canary, ghp_ plus 36 copies of one letter, committed with exit 0 and a scanner line saying no leaks found. Two things were wrong. My hook was dead code, because a global core.hooksPath tells git to look in that directory and never in the repo's .git/hooks, so the verdict came from a different hook. And the canary looked fake: gitleaks passed it, and passed the alphabet in order too, but blocked a random token at once."
nextStep: "Build canaries from random characters at run time, and check which control printed the verdict before trusting it. Green has two causes: nothing to catch, or catching nothing. Full writeup: danmercede.com/guides/done-needs-a-receipt"
tags: ["security", "governance", "failure-modes"]
context: "failure-modes"
externalContext:
  whyItMatters: "Outside our local build environment, \"The Canary Looked Fake\" captures a portable lesson for engineering teams: Staging a fake GitHub token in a scratch repo proves my pre-commit secret gate blocks commits. Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "gate means a deterministic pre-execution check required before code or publishes advance; canary means a deliberate violation test proving a control actually fires rather than resting green; hook means an automated script triggered before a tool call, commit, or push completes."
  guideUrl: "https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change"
  guideLabel: "Guide: Regression-Testing Agent Prompt Changes on danmercede.com"
---
