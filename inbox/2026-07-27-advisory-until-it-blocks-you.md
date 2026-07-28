---
title: "Advisory Until It Blocks You"
slug: "2026-07-27-advisory-until-it-blocks-you"
date: "2026-07-27T17:19:00-0700"
type: "experiment-log"
hypothesis: "A markdown rule tells an agent what not to do. A PreToolUse hook that exits non-zero decides whether the action happens at all. The second one is checkable, so it should be checked the way any control is checked: by watching it fire."
constraint: "The gate only counts if the violation is issued as a live tool call through the real harness path, and if the thing it was protecting is confirmed intact afterward. A hook that prints a refusal while the command still runs has proven nothing."
result: "Passed"
resultDetails: "Two gates were fired against deliberate violations on a disposable target. The recursive-delete gate returned exit 2 and halted the call; the directory it named still existed afterward, so the delete never ran. The long-dash publish gate blocked a real git commit; the repository still had zero commits afterward. The same commit message with a plain hyphen committed cleanly, which rules out a blanket denier. A third, unplanned block landed on the session's own housekeeping command mid-setup."
nextStep: "Publish the limits alongside the proof: both hooks fail open on internal error, the dash gate cannot see a message passed by file reference, and the delete gate has documented false positives from trigger words appearing as data. A proof that hides its edges is marketing."
tags: ["governance", "systems", "failure-modes"]
context: "governance"
---

A reader looked at my published agent instructions and asked the sharpest question
anyone has asked about them: does this system persuade the model to behave, or does it
prevent the model from violating the rules?

For what I had published, persuade. That was a fair read and I did not enjoy it. The
instructions are markdown. Markdown depends entirely on the runtime choosing to honor
it, and a model having a bad day is exactly the condition under which you wanted the
rule to hold. So I stopped arguing and went and fired the gates.

The setup: a scratch directory with one throwaway file in it, created ninety seconds
earlier. Then, as a real tool call, `rm -rf` pointed at that directory. The call never
reached the shell. The hook returned exit 2 with its grading (tier BLOCK, score 100 of
100, triggered by recursive force delete) and the harness halted the call.

Then the step that actually matters, and the one I think people skip: I listed the
directory. It was still there, file and all. The command was named, refused, and did not
run. That is the difference between a control and a warning label, and you cannot tell
them apart from the refusal message alone. Both print something red.

The second gate blocks long dashes in anything that publishes: commits, tags, PR bodies,
release notes. I committed a message with an em dash in it. Blocked. Then `git log`:
zero commits, no branch, nothing landed. Then the control that keeps me honest, the same
sentence with a plain hyphen instead, which committed immediately. A gate that blocks
everything is as useless as one that blocks nothing, and only the second test tells you
which one you built.

The best evidence was the one I did not stage. Halfway through, my own setup line used
`rm -rf` to clear a scratch path, and the delete gate stopped me. Unscripted, on my own
housekeeping, in the middle of building the demo. I rewrote the line without it. You
should trust that one more than the two I planned.

Now the part that makes it a proof instead of an advertisement. Both hooks fail open: if
the hook itself errors, the action proceeds. That is a deliberate availability tradeoff
and it is a genuine hole. The dash gate only reads the command text, so a dash living in
a file passed by reference goes straight through it. And the delete gate has two
recorded false positives from the previous day, both cases where the trigger words
showed up as data rather than as a command: a read-only grep whose search pattern
contained the words docker prune, and a source comment mentioning DROP TABLE. Anything
pattern-matching an open vocabulary will over-trigger, and I would rather it over-trigger
in that direction.

It is also one leg of a three-leg test, not the whole thing. The hook sees a shell
command with no provenance attached, so it cannot know whether untrusted input or
sensitive access is in play. It gates the destructive leg and leaves the rest to
judgment.

So the honest answer to the question is narrower than the one I would have liked to
give, and it is checkable, which the broad one never was. On this class of action, in
this runtime, the rule is not advice. It has an exit code, and I have watched it stop me.
