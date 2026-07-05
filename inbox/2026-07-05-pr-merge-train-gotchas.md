---
title: "PR-Merge Train Gotchas"
slug: "2026-07-05-pr-merge-train-gotchas"
date: "2026-07-05T00:15:00-0700"
type: "short-essay"
claim: "Merging a stack of PRs into one branch has host-side mechanics that silently skip half your queue if you script it naively."
implication: "Treat mergeability as eventually consistent and order the train by a file-conflict graph, or the merge button lies to your loop."
tags: ["execution", "failure-modes", "systems"]
context: "execution"
---

Merged fourteen PRs into one repo today in a single pass. If you script that as "loop over the open PRs, merge each one," you will silently skip half of them. Here is why, and the five things that actually decide whether the train runs.

**Each merge invalidates the others.** The moment one PR lands, every other open PR's mergeable state flips to UNKNOWN for a few seconds while the host recomputes against the new base. Read `mergeable` once and your loop sees UNKNOWN, calls it "not ready," and skips a perfectly clean PR. Treat mergeability as eventually consistent: poll each PR until it settles to MERGEABLE or CONFLICTING before you act on it.

**Admin-merge bypasses more than review.** An admin merge skips the required-review rule and the "branch must be up to date" rule, but only when branch protection has enforce_admins set to false. A PR that is behind but clean merges fine. Only a true content conflict stops you. Check the protection setting before you trust what the state string is telling you.

**Order the train by a conflict graph.** Build it from each PR's changed-file list. Merge the largest set of PRs touching disjoint files first, for zero rebases. PRs that share a file cascade-conflict, so sequence them last. That turned a five-PR cluster all editing the same manifest into four clean merges and exactly one resolution.

**Resolve without rewriting history.** When two PRs edit the same lines and force-push is off the table, merge the base branch into the PR branch and union the hunks. Do not rebase. A squash-merge flattens the extra merge commit anyway. Union so both sides' tests still pass: two of mine grepped for different literal regex branches, so both had to survive the merge.

**Stand down on concurrent work.** One PR had another process actively reviewing and merging it. I left it alone instead of racing. It finished and merged itself, correctly, while the rest of the train ran. The cheapest conflict is the one you decline to start.

None of this lives in the merge button. All of it bites the first time you automate the queue.
