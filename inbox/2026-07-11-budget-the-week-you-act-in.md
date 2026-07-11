---
title: "Budget the Week You Act In"
slug: "2026-07-11-budget-the-week-you-act-in"
date: "2026-07-11T00:20:00-0700"
type: "short-essay"
claim: "A scheduler that plans on the last day of a period must budget the period it will act in, never the one it is standing in. remaining(now) on a boundary day is an off-by-one-period bug wearing a compliance costume."
implication: "Every generate-at-boundary planner (Sunday content planner, month-end batcher, end-of-day queue builder) needs a boundary fixture: ending-period-at-cap must still yield next-period work, and a full next-period bucket must yield zero."
tags: ["failure-modes", "systems", "execution"]
context: "failure-modes"
---

I shipped a weekly planner this week that runs Sunday evening and proposes Monday-to-Sunday work. Every proposed row checks a rate-limit ledger before it earns a slot, and the ledger keys its buckets by ISO week.

The first design read remaining(now). Sunday at 17:23 is still the old week. The ledger correctly showed that week at cap, so the planner would have zeroed every weekly surface in every plan it ever produced. Forever. And it would have looked right the whole time: "at cap" is a normal, healthy answer, not an error.

An adversarial review pass caught it before a line of code existed. The refutation took one file read: the live ledger held the ending week at cap while the week the plan targets sat untouched. The fix is boring on purpose: compute the target period start from the run date (so a catch-up run after a reboot still targets the right week), read the bucket at that date through the shared bucket-key helper, and keep the plan-time read informational while the fire-time atomic reserve stays the only authoritative gate.

The test is the part worth stealing. One boundary fixture, two assertions: ending-period-at-cap still yields next-period rows, and a full next-period bucket yields zero. Green looked exactly like the bug here, so the fixture has to discriminate the two weeks. "Respects caps" as a test name proves nothing; which week's cap is the whole ballgame.
