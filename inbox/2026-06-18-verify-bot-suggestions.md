---
title: "Verify Bot Suggestions"
slug: "2026-06-18-verify-bot-suggestions"
date: "2026-06-18T13:11:54-0700"
type: "thought-snippet"
content: "An automated code-review bot flagged a HIGH-severity 'optimization.' Applied in good faith — even under a blanket 'apply the advisory findings' approval — it would have shipped a worse bug than the one it claimed to fix. A separate adversarial review pass caught it; the right move was to reject the suggestion, keep the original approach, and record why. Treat automated-reviewer output (Codex, Gemini, CodeRabbit, and friends) as advisory input to verify, not a directive — give each suggestion the same try-to-break-it pass you would give your own change before applying it. A severity label reflects the bot's local heuristic, like 'avoid a redundant call,' not whole-system correctness; a HIGH-severity optimization can quietly trade away a correctness invariant. Reject-with-rationale is a valid, expected outcome. Reinforcing pattern from the same work: a layered adversarial-review stage repeatedly caught state and logic bugs that every unit test had already passed. Adversarial review of mutation-bearing code is not optional."
tags: ["failure-modes", "execution", "governance"]
context: "execution"
externalContext:
  whyItMatters: "Outside our local build environment, \"Verify Bot Suggestions\" captures a portable lesson for engineering teams: An automated code-review bot flagged a HIGH-severity 'optimization.' Applied in good faith : even under a blanke.... Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "systemd isolation means Linux service sandboxing that restricts filesystem and network access per process."
  guideUrl: "https://www.danmercede.com/guides/why-agent-code-needs-layered-review"
  guideLabel: "Guide: Layered Code Review for Agent Output on danmercede.com"
---
