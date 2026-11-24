---
title: "orion-skills Is Public"
slug: "2026-06-17-orion-skills-public"
date: "2026-06-17T16:00:00-0700"
type: "status-update"
status: "Active"
whatChanged: "Open-sourced orion-skills — a collection of first-party Claude Code skills extracted from production operator workflows: a structural read-only mode, scope guarding, ship discipline, pre-PR checks, incident-as-code, learning capture, goal-prompt authoring, and pre-compact handoffs. MIT-licensed and public at https://github.com/OrionArchitekton/orion-skills."
whatBroke: "Nothing. The skills were already running internally; this is the same set, genericized and published."
nextStep: "They now sit on the Works page at danmercede.com/works, with one skill published as a sample gist. Next is a short write-up on how the read-only and scope-guard rails actually enforce."
tags: ["execution", "governance", "systems"]
context: "execution"
externalContext:
  whyItMatters: "Outside our local build environment, \"orion-skills Is Public\" captures a portable lesson for engineering teams: Open-sourced orion-skills : a collection of first-party Claude Code skills extracted from production operator wo.... Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "Orion means our local multi-agent engineering setup used as a live testbed for production workflows; prompt-boundary limit means model instructions can advise behavior, whereas only code checks at the tool boundary enforce it."
  guideUrl: "https://www.danmercede.com/guides/hand-off-local-agent-tasks"
  guideLabel: "Guide: Handing Off Long-Running Agent Tasks on danmercede.com"
---
