---
title: "Green CI Proved Nothing"
slug: "2026-07-21-green-ci-proved-nothing"
date: "2026-07-21T08:58:21-0700"
type: "experiment-log"
hypothesis: "A detector's false positives came from event beacons sent on a transport that its capture layer silently dropped."
constraint: "The fix only counts if a live re-measurement of the symptom against the real inputs confirms it. A green suite does not count."
result: "Failed"
resultDetails: "The patched detector re-ran against the real inputs and found the hypothesized transport in zero of them. Every beacon used the ordinary path. The change was a genuine latent bug and worth keeping, but it was not the cause. The real mechanism was worse: the detector's negative signal had several causes it could not tell apart. A headless client that observes nothing cannot separate genuinely missing from suppressed because you are automated. Two inputs with opposite ground truth produced an identical observation."
nextStep: "Reclassify the ambiguous observation as inconclusive. Mint a finding only from the opposite shape, infrastructure present but idle, where you can see the thing you are judging."
tags: ["failure-modes", "signal", "execution"]
context: "failure-modes"
---

I had a mechanism, a patch, and a green suite. I still had the wrong cause.

The only reason I caught it: I made the fix prove itself by re-running the original
measurement, not by passing tests. That re-run refuted the hypothesis in a single pass.
Without it I would have shipped a real bugfix mislabeled as the cure and walked away
believing the false positives were solved.

A plausible mechanism plus green CI is not proof of the mechanism. When you are fixing
something you MEASURED, make the acceptance test a re-measurement of that thing on real
inputs. Tests prove your code does what you wrote. They cannot tell you that what you
wrote was the reason.

The second lesson cost more. If a negative observation has several causes you cannot
tell apart, it is not a detection. It is an inconclusive wearing a detection's clothes.
So ask it of any detector you own: what else produces this exact observation? If the
answer is a few things, and I cannot distinguish them, you do not have a signal. You
have a coin flip with a confident label on it.

The fix was to stop minting findings from the ambiguous shape entirely and take the
recall loss on purpose. Fewer findings, all of them real, beats a bigger pile you have
to apologize for.
