---
title: "Quota Is Not a Parse Error"
slug: "2026-07-10-quota-is-not-a-parse-error"
date: "2026-07-10T01:35:00-0700"
type: "short-essay"
claim: "A pipeline that consumes LLM output needs a third terminal state: a quota-starved reviewer is not-reviewed, which is neither a parse error nor findings."
implication: "Fold abstentions into failure states and you debug phantom parser bugs, trust findings that reviewed nothing, and burn bounded retries before the quota resets."
tags: ["failure-modes", "signal", "execution"]
context: "failure-modes"
---

Overnight, five runs of my PR review pipeline reported the same thing: the Codex review phase exited with status parse_error, schema invalid, zero findings. The obvious read is a broken parser or a drifted schema. The actual payload was one sentence from the vendor: "You've hit your usage limit ... try again at 2:00 AM."

Nothing was malformed. Nothing was reviewed either. The reviewer never ran; the "review output" was a quota message wearing a review envelope, and my pipeline filed it under parse failure. Worse, the run status rolled up as findings-remain, which reads like the reviewer saw problems. It saw nothing.

Pass and fail are verdicts. A quota-starved model produces neither, so classify it as not-reviewed, the same class as a timeout, and carry the vendor's stated reset time as the retry schedule. My pipeline already treated timeouts as non-terminal; the quota message deserved the same treatment and instead got promoted to a defect.

The cost of misclassifying is paid twice. First you debug a parser that is not broken. Then you spend your bounded re-run budget (mine allows one verification re-run per PR) before the quota resets, and the re-run burns on the same quota wall.

One grep fixed the triage: check the parse warnings for a usage-limit string before adjudicating any parse_error. Abstention is not a verdict, and an unreviewed PR is not a reviewed-clean PR.
