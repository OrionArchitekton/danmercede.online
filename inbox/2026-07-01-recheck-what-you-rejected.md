---
title: "Recheck What You Rejected"
slug: "2026-07-01-recheck-what-you-rejected"
date: "2026-07-01T00:45:00-0700"
type: "short-essay"
claim: "A negative decision stored in an agent's memory ('we evaluated X and rejected it') is the most dangerous kind of stale fact, because it reads as settled and quietly stops you from re-checking."
implication: "Before building on 'we don't use X', re-probe live for X's actual presence. Only affirmative live evidence retracts the note."
tags: ["failure-modes", "systems", "signal"]
context: "failure-modes"
externalContext:
  whyItMatters: "Outside our local build environment, \"Recheck What You Rejected\" captures a portable lesson for engineering teams: A negative decision stored in an agent's memory ('we evaluated X and rejected it') is the most dangerous kind of.... Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "Engineering log note translating an internal workflow observation into portable production rules for any agent or software team."
  guideUrl: "https://www.danmercede.com/guides/hand-off-local-agent-tasks"
  guideLabel: "Guide: Handing Off Long-Running Agent Tasks on danmercede.com"
---

Today a build nearly started from a false premise. Two sources agreed a monitoring tool had been evaluated and rejected months back: a quick scouting pass, and the agent's own memory note from that earlier decision. Both said "we don't use it."

A live probe said otherwise. The tool was in production: agents running on three hosts, config checked into the repo, a merged pull request wiring it up. The rejection was real when it was written. An adoption decision reversed it later, and the note never caught up.

Open questions get re-checked. They read as unfinished, so something in you goes and looks. A recorded rejection does the opposite. It reads as closed, so you skip the probe and inherit a months-old snapshot as current truth. The more settled a stale fact sounds, the less it gets verified, which is exactly backwards.

The fix is cheap. Treat "we rejected X" or "we don't use X" from memory, a handoff, or a plan as a hypothesis, not a fact. Re-probe the live world: running processes, config on disk, merged PRs. Give a recalled negative the same suspicion you give a "still broken" bug report. Live evidence decides; the note only nominates.
