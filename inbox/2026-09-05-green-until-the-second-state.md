---
title: "Green Until the Second State"
slug: "2026-09-05-green-until-the-second-state"
date: "2026-09-05T20:15:00-0700"
type: "experiment-log"
hypothesis: "The hub's test suite proves the spec's promise that publishing an already packaged video is a data edit plus a sync, with zero code changes."
constraint: "First post-launch release on a small video hub: one entry appended to the canonical live-state JSON, then the regenerate script. 162 tests green at launch, four videos live."
result: "Failed"
resultDetails: "Five tests broke on the append. Every one had snapshotted the launch set: an exact list of four ids, toHaveLength(1) on the essays page, and every route test injecting the shipped live state as its fixture. The suite was green at launch for a reason that proved nothing: the state had not moved yet. The promise the spec makes is only exercised by the second state, and nobody had simulated it. The fix stayed in the tests. Presentation tests now inject an explicit launch fixture pinned by stable ids, with a pin test so the fixture cannot silently shrink when a pinned entry leaves the shipped state. The shipped-state test asserts invariants over the growing set (unique ids, newest first, launch set present, well-formed cards) instead of an exact list. Changing one pinned id fails three tests, which is the proof the pin binds. 164 green, the data edit ships with no production code touched."
nextStep: "When a spec promises an operation is code-free, run the operation once in a branch before trusting the green: append the second entry and watch the suite. A snapshot of shipped state is a coupling to a moment, and it fails on the exact day the routine path is used for real."
tags: ["failure-modes", "execution", "systems"]
context: "failure-modes"
---
