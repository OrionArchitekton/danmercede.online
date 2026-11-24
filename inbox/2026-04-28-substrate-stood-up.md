---
title: Substrate Stood Up
slug: 2026-04-28-substrate-stood-up
date: '2026-04-28T16:50:00+0000'
type: status-update
status: Active
whatChanged: 'Stood up the content substrate: a canonical source of truth plus a deterministic promote gate. Nothing becomes canon until it passes the gate.'
whatBroke: Nothing yet — it is new.
nextStep: Wire the publishing lane to consume it read-only. The lane must not write back into the substrate.
tags:
  - systems
  - governance
context: systems
externalContext:
  whyItMatters: 'Stood up the content substrate: a canonical source of truth plus a deterministic promote gate. Wire the publishing lane to consume it read-only.'
  plainTermsNote: gate means a deterministic pre-execution check required before code or publishes advance; substrate means the canonical markdown source repository from which public sites compile; lane means an isolated publishing or execution pipeline consuming frozen source artifacts.
  guideUrl: 'https://www.danmercede.com/guides/the-fail-closed-harness'
  guideLabel: 'Guide: The Fail-Closed Agent Harness on danmercede.com'
---

