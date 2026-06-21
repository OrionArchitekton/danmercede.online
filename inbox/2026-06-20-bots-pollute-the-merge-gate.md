---
title: "Bots Pollute the Merge Gate"
slug: "2026-06-20-bots-pollute-the-merge-gate"
date: "2026-06-20T21:30:00-0700"
type: "thought-snippet"
content: "I built an autonomous loop that drives an open-source repo through a multi-version release arc: it fires each build phase headless, opens a pull request, and waits for me to approve by merging. My first approval signal was GitHub's aggregate review decision: approved means proceed, changes-requested means stop. It false-halted on the very first run. The culprit wasn't me; it was the review bots. CodeRabbit, Sourcery, and friends auto-review every PR, and their verdicts roll up into that same aggregate decision, so a bot's changes-requested was indistinguishable from a human no. The fix: gate on the human's irreversible action, not a derived status. Merge means go. Close means stop. Ignore the aggregate decision entirely; it's polluted by automation you don't control. The principle for any human-in-the-loop agent: your approval signal should be something only the human can do and a bot can't accidentally emit. Prefer an explicit, irreversible act (merge, tag, a click) over a status field your tooling also writes. The loop caught this itself by refusing to guess and halting, which is exactly what you want when a system's own gate logic is wrong."
tags: ["failure-modes", "governance", "execution"]
context: "governance"
---
