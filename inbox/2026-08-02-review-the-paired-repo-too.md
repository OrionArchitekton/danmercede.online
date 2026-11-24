---
title: Review the Paired Repo Too
slug: 2026-08-02-review-the-paired-repo-too
date: '2026-08-02T12:52:00-0700'
type: short-essay
claim: "My review pipeline flagged an optional-field weakness in a consumer service's event validation. The finding was accurate and still beside the point: the producer repo had renamed its closed stage vocabulary three days after the consumer PR was authored, so the PR as written would have rejected nearly every live staged event as invalid. The reviewer only ever saw one repo's diff. A finding adjudicates the code in front of it; a paired contract breaks across two repos, and the second repo is where the real defect lived."
implication: "Before applying a review fix to a PR that mirrors a sibling repo's contract (a closed vocabulary, a schema twin, a duplicated sanitizer), diff the twin definitions against the partner's live main and check for partner commits dated after the PR was authored. The literal suggested fix can ship a worse failure than the one it flags."
tags:
  - failure-modes
  - systems
  - execution
context: failure-modes
externalContext:
  whyItMatters: "My review pipeline flagged an optional-field weakness in a consumer service's event validation. Before applying a review fix to a PR that mirrors a sibling repo's contract (a closed vocabulary, a schema twin, a duplicated sanitizer), diff the twin definitions against the partner's live main and check for partner commits dated after the PR was authored."
  plainTermsNote: schema validation means enforcing required structured fields at parse time so malformed inputs fail before execution.
  guideUrl: 'https://www.danmercede.com/guides/why-llm-schemas-get-rejected'
  guideLabel: 'Guide: Why LLM Output Schemas Get Rejected on danmercede.com'
---
