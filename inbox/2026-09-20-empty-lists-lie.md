---
title: "Empty Lists Lie"
slug: "2026-09-20-empty-lists-lie"
date: "2026-09-20T00:40:00-0700"
type: "short-essay"
claim: "A detector can be scrupulously honest per item and still lie in aggregate. Mine tagged every skill it tracked as measured, insufficient, or unmeasured, and it forced an unmeasured skill's trend to unknown instead of stable, exactly so that silence could not read as health. That care died at the summary. The top-level list of declining skills is built by appending only the ones whose trend is worsening, so an unmeasured skill contributes nothing and the list comes out empty. It read empty with 1 skill measured out of 73 and 9% of logged runs resolved. The consumer downstream mined that empty list as no skill is declining. What it meant was that 72 skills could not be judged at all. The per-item flag does not travel with the summary, and the summary is what consumers read. The fix is to give the aggregate its own status field. Mine now reports blind when zero items are measurable and the list therefore cannot be non-empty, partial when the measured base is too thin to generalize from, and live only when an empty list is a statement about the items rather than about the instrument. One question settles it for any empty collection you are about to act on. Could this have been non-empty?"
implication: "The same trap caught the review pipeline that was supposed to check this change. It exited 0 with 0 findings while every engine inside it had errored or timed out, because the diff it fed them was 8 MB against a base branch 121 commits stale. Zero findings meant no reviewer ran. A green run and an empty result set carry no information until you know the collector was capable of filling it."
tags: ["failure-modes", "signal", "systems"]
context: "signal"
---
