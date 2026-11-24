---
title: The Merge Is Also a Mutation
slug: 2026-05-20-the-merge-is-also-a-mutation
date: '2026-05-20T18:40:00+0000'
type: working-note
content: 'Hardening the release gate to fail closed on the merge itself. A merge is where a change crosses from proposal into what runs — the most consequential state mutation in the system, and usually the least governed. Default-deny belongs here too.'
openQuestion: Should the gate evaluate the merge SHA or the head SHA — and does CI parity hold across both?
tags:
  - governance
  - execution
  - systems
context: governance
externalContext:
  whyItMatters: Hardening the release gate to fail closed on the merge itself. Default-deny belongs here too.
  plainTermsNote: fail-closed means blocks the action on missing proof or error instead of silently continuing; gate means a deterministic pre-execution check required before code or publishes advance; CI runner means the automated build machine running tests and checks before changes merge.
  guideUrl: 'https://www.danmercede.com/guides/why-agent-code-needs-layered-review'
  guideLabel: 'Guide: Layered Code Review for Agent Output on danmercede.com'
---

