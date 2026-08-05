---
title: "Green Tests That Cannot Fail"
slug: "2026-08-05-green-tests-that-cannot-fail"
date: "2026-08-05T01:30:00-0700"
type: "experiment-log"
hypothesis: "New tests covering the partial-byte mask branch of a CIDR prefix matcher will catch a regression in that mask."
constraint: "Prove it by mutating the mask in both directions, too wide and too narrow. The tests must fail on each mutant."
result: "Failed"
resultDetails: "Both mutants stayed green. The inside probes were .1 and a v6 address ending 0x281, whose low-order bits are all zero, so they satisfy a correct mask and an off-by-one one identically. Re-probing with values that carry bits below the prefix boundary (.64, .127, 0x288, 0x28f) made both mutants fail correctly."
nextStep: "For any mask, rounding, clamping or boundary test, stop probing with round numbers. Pick a value just inside the edge, and run the mutant in both directions."
tags: ["failure-modes", "execution", "systems"]
context: "failure-modes"
---

A review flagged that an IP allowlist's prefix matcher had no coverage for
prefix lengths that are not multiples of eight. Every existing test used /24,
/64, /120: all octet aligned, all decided by the whole-bytes loop. The partial
byte mask, the subtlest arithmetic in the file, had never once been executed.

So I added tests for a /25 and a /60. They passed. That is the moment worth
being suspicious of, because a coverage test that passes on first write has told
you nothing yet: green has two causes, and "the code is right" is only one of
them. The other is "this test cannot fail."

It could not fail. I broke the mask by one bit in each direction and the tests
stayed green both times. The oracle was right, the code path was right, and the
inputs were useless. I had probed the inside of the /25 with .1, and .1 has no
bits below the prefix boundary, so a mask comparing one bit too many accepts it
exactly like a correct mask does. Round numbers are invisible to off-by-one
errors on the low bits, which is precisely where mask bugs live.

The fix was not more tests. It was different constants: .64 and .127 instead of
.1, addresses ending 0x288 and 0x28f instead of 0x281. Same count, same
assertions, same code path. Now a wrong mask has somewhere to show up.

The generalization I want to keep: a passing test is a claim about your code,
and an unverified claim. The only evidence a test binds is a mutant that makes
it fail. Cheap to produce, and the first direction you try is often the one the
test already handles, so run both. Too narrow is the obvious failure. Too wide
is the quiet one, and in an allowlist it is the direction that silently
misclassifies real traffic.
