---
title: "Pinning the Dep Is Half the Fix"
slug: "2026-07-18-pinning-is-half-the-fix"
date: "2026-07-18T00:25:00-0700"
type: "short-essay"
claim: "An unpinned linter or formatter is a scheduled break in your CI gate. It resolves to whatever shipped that morning, so a file that passed when you last touched it goes non-conforming with no diff to blame. Pin it to the exact version CI resolves. Then notice the hole you just opened: the contributor doc explaining the pin is itself an unpinned copy of your CI config, and it drifts the same way on a slower clock."
implication: "Do not mirror your CI step list into the contributor doc. Name the workflow file as authoritative, document only the commands a developer can run locally, and state plainly that more gates exist. A doc that duplicates a machine-readable list has volunteered to keep two things in sync, and you will keep one."
tags: ["failure-modes", "execution", "systems"]
context: "execution"
---

Three CI cycles. That was the cost of one unpinned formatter, and I spent most
of them fixing the wrong thing.

The setup is ordinary. The dev extra declared `ruff>=0.6`. CI installs that
extra fresh on every run, so it resolves to whatever shipped most recently,
which was 0.15.22. My box had 0.6.9. Those two do not format identically. So
you run `ruff format` locally, commit, push, and watch `ruff format --check .`
reject the file you just formatted. Local clean is not CI green when the
versions differ. The job says "Would reformat", which reads like your code is
wrong. Your code is fine. Your dependency floated.

The fix is one character: `>=` becomes `==`, pinned to the version CI already
resolves. That makes the pin a no-op for the current green state and stops the
upward drift. Cheap, obvious in hindsight.

Then I wrote the contributor note explaining the pin, and walked straight into
the second half of the problem.

My first draft said the bar is ruff plus tests. I checked before shipping it.
The gates job actually runs eleven steps: two ruff commands, tests, a shell
syntax pass over every script, two preflight verifiers, two config checks, a
doc lint, and a whitespace gate. The helpful doc I was writing was already
wrong on the day I wrote it.

Enumerating all eleven would have been worse. A step list in a doc is an
unpinned copy of your CI config. It drifts exactly like `ruff>=0.6` drifted,
just on a slower clock, and nothing goes red when it goes stale. Drift was the
entire reason I was there.

So the doc now names the workflow file as authoritative, lists only the
commands a developer can actually run locally, and says outright that more
gates exist. Read the source for the full set.

The general shape is worth keeping. Any doc that duplicates a machine-readable
list has signed up to keep two things in sync. You will keep one of them.
