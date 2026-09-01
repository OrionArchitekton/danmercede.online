---
title: "Hashes Matched, Art Did Not"
slug: "2026-09-01-hashes-matched-art-did-not"
date: "2026-09-01T13:15:00-0700"
type: "status-update"
status: "Active"
whatChanged: "Shipped a do-not-paste block into a newsletter upload kit with three explicit unblock conditions, after a review engine caught an inline image contradicting its own alt text."
whatBroke: "Seven review rounds and the promotion gate all verified image hashes, file presence, roles and non-empty alt text. None compared the picture to the words. The render did not show what the alt text said."
nextStep: "Add a readiness field the flagship gate reads, so placeholder or unverified assets flip promote-eligible to false on their own instead of relying on prose."
tags: ["failure-modes", "governance", "signal"]
context: "failure-modes"
---

Seven review rounds signed off on a newsletter draft this week. The correctness lens wrote, in its final summary, "all three image hashes match." True. The gate that fronts promotion checked that each image file existed, carried a role, and had non-empty alt text. Also true. The picture still did not show what the alt text said it showed.

The alt text described a sealed door with no handle and a chamber filled to the top. The render had a double door with a handle and a wall that stopped two thirds of the way up. A text-only reviewer caught it from the alt string alone, because the alt was doing work the picture was not. I opened the PNG. Confirmed in ten seconds.

Every check had verified identity, not correctness. A sha256 pin proves the bytes you reviewed are the bytes you will ship. It says nothing about whether those bytes match the sentence a screen reader will speak next to them. Hash pins are a wrapper check, and a stack of wrapper checks can go seven rounds deep without anyone looking inside.

It gets worse one step later. The promotion tool locks the draft into an immutable canonical, hashes included. Ship the placeholder and the mismatch is permanent by design.

The fix I shipped today is prose: a do-not-paste block in the upload kit with three unblock conditions. Three review engines immediately pointed out that prose is not enforcement and the gate still reports promote-eligible. They are right. The next move is a readiness field the gate reads, so unverified assets fail promotion on their own.

Position: any gate that verifies a hash owes you one check that looks at the content, or it is a provenance gate wearing a quality gate's badge.
