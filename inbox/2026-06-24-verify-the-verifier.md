---
title: "Verify the Verifier"
slug: "2026-06-24-verify-the-verifier"
date: "2026-06-24T13:20:00-0700"
type: "experiment-log"
hypothesis: "In a two-tier verification pattern — a cheap draft, then a skeptic agent that fact-checks each claim against live state — the skeptic's correction can be trusted as a verdict."
constraint: "One skeptic per premise, each required to refute-or-confirm with cited evidence before a claim is accepted into the output."
result: "Failed"
resultDetails: "One skeptic returned a confident 'CONFIRMED — corrected' verdict that FLIPPED a premise the draft had right. Its cited evidence named a look-alike sibling artifact, not the one in question. Because the whole design assumes the cheap draft is the unreliable layer, the skeptic's flip read as authoritative — exactly the backside error the fan-out was meant to catch, one layer up. A direct probe restored the draft's original, correct value."
nextStep: "Treat a skeptic's correction as a claim, not a verdict: (1) check its cited evidence names the thing in question, not a sibling; (2) cross-check the other agents in the fan-out — a lone flip against draft + prior knowledge is a flag, not a resolution; (3) run one direct probe to break the tie. A 'CONFIRMED' with mismatched evidence refutes the skeptic; it does not correct the premise."
tags: ["failure-modes", "systems", "execution"]
context: "systems"
---

A verification agent is still a single source. The two-tier pattern (draft cheap, then verify adversarially) earns its keep when the skeptic catches the draft's errors — but it quietly inverts when the skeptic introduces its own. The asymmetry that makes the pattern work (assume the draft is wrong) is the same one that makes a wrong correction dangerous: you have pre-committed to trusting the second voice.

The tell is cheap to check and easy to skip: does the skeptic's cited evidence actually name the artifact under test, or a sibling that looks like it? Mismatched-but-confident is the signature. Do not promote a correction on the skeptic's say-so — promote it on a citation that names the right thing, agreement across the fan-out, or one direct probe you ran yourself.
