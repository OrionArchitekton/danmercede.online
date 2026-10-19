---
title: "The Canary Looked Fake"
slug: "2026-10-19-the-canary-looked-fake"
date: "2026-10-19T13:56:04-0700"
type: "experiment-log"
hypothesis: "Staging a fake GitHub token in a scratch repo proves my pre-commit secret gate blocks commits."
constraint: "One scratch repo with a local pre-commit hook, plus a global hooks directory running gitleaks 8.24.3 on default rules. git 2.43.0."
result: "Failed"
resultDetails: "The first canary, ghp_ plus 36 copies of one letter, committed with exit 0 and a scanner line saying no leaks found. Two controls were installed and neither one stopped it."
nextStep: "Build canaries from random characters at run time, and check which control printed the verdict before trusting it."
tags: ["security", "governance", "failure-modes"]
context: "failure-modes"
---

I planted a fake GitHub token to prove a pre-commit hook works. The commit went through, exit 0, and a scanner printed "no leaks found".

Two separate things were wrong. My hook was dead code, because a global core.hooksPath tells git to look in that directory and never in the repo's .git/hooks. So the "no leaks found" line came from a different hook, and I'd have credited my own if I hadn't read whose message it was.

And the canary looked fake. With default rules, gitleaks passed a token made of one repeated letter, and it passed the alphabet in order too, so it isn't only about entropy. A random 36-character token was blocked at once by the global scanner, and by my hook once I forced it into the path.

Green has two causes: nothing to catch, or catching nothing. A canary only tells them apart if it looks like the real thing.

Full writeup: danmercede.com/guides/done-needs-a-receipt
