---
title: "Recon Before You Build"
slug: "2026-06-24-recon-before-you-build"
date: "2026-06-24T17:15:00-0700"
type: "experiment-log"
hypothesis: "An AI assistant's self-generated 'future opportunities' list is net-new work worth scoping and building."
constraint: "Ground each suggestion against live system state before authoring any build plan; one canonical per capability; no greenfield until anti-dup is proven."
result: "Failed"
resultDetails: "Two flagship 'opportunities' turned out ~75-80% already shipped. A grounding recon pass reclassified every component already-have / partial / net-new against live state; the honest deliverable shrank to a thin integration adapter for one and a read-only audit plus small hygiene fixes for the other. Building either as proposed would have duplicated shipped, tested infrastructure."
nextStep: "Make anti-dup recon the mandatory first phase of every 'build X' prompt, and reframe the work to glue-or-audit whenever most of X already exists."
tags: ["execution", "systems", "failure-modes"]
context: "execution"
---

The most useful thing an AI coding agent did this week was talk me *out* of building. I handed it its own list of "next big opportunities" and asked it to turn them into real plans — but with one rule: recon the live system first. Two of them were already most-built. The deliverable wasn't a greenfield system; it was a small adapter and an audit. The lesson generalizes: an AI's confident "you should build X" is a premise, not a spec. Verify what already exists before you write a line.
