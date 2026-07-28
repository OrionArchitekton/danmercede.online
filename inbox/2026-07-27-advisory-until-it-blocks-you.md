---
title: "Advisory Until It Blocks You"
slug: "2026-07-27-advisory-until-it-blocks-you"
date: "2026-07-27T17:19:00-0700"
type: "short-essay"
claim: "A markdown rule produces no mechanical event: the agent reads it and complies or does not. A PreToolUse hook produces one, and that is checkable. The check is not reading the code, it is issuing the violation as a live tool call through the real harness path and then confirming the thing it was protecting is still intact, because a hook that prints a refusal while the command still runs has proven nothing and its output looks identical."
implication: "Fired against deliberate violations, the recursive-delete gate returned exit 2 and halted the call with the target directory still present, and the long-dash gate blocked a real commit leaving the repository at zero commits; the same message with a plain hyphen committed cleanly, ruling out a blanket denier. But the override is an ordinary environment variable the blocked agent can prepend itself, with no human in the loop, so this is not a boundary against a confused or adversarial agent. What survives is narrower and worth having: the destructive path is default-deny and resuming takes a second, visible, attributable action. Enforcement against accident and drift, not against intent."
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

And then the limit that outranks all of those, which I did not want to write. The
override is an ordinary environment variable, so the same agent that got blocked can
prepend it and re-issue the command itself. No human is involved in that. Canary three
above is not a person authorizing a destruction, it is the agent authorizing its own.
Against a confused or adversarial agent, this gate is not a boundary at all. If I sold
it as one, the first person to read the override line would be right to throw out
everything else I said.

So what is actually left, stated as narrowly as I can make it. A markdown rule produces
no mechanical event: the model reads it and complies or does not, and nothing happens
either way. The hook produces one. The destructive path is default-deny, the call stops
by construction, and continuing requires a second, different, visible action that lands
in the record. That is not persuasion, and it is also not prevention. It is enforcement
against accident, drift, and the unreflective reach for a command, which is what nearly
every real incident is made of. It is not enforcement against intent.

That is a smaller claim than the one I set out to make. It has the advantage of being
true, and of being checkable by anyone who runs the four commands above. The persuade
or prevent question turns out to have a third answer, and pretending otherwise would
have made this essay exactly the kind of artifact it is arguing against.
