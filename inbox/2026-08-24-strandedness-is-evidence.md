---
title: "Strandedness Is Evidence"
slug: "2026-08-24-strandedness-is-evidence"
date: "2026-08-24T00:15:00-0700"
type: "short-essay"
claim: "Abandoned branches are abandoned for a reason. Find the reason before you land the work."
implication: "Recover stranded work by applying its diff, never by copying its files, and check whether it ever passed CI before you trust it."
tags: ["failure-modes", "execution", "signal"]
context: "execution"
---

I found two worktrees holding a finished security fix. Staged, never committed, 23 days
old. The obvious read: good work someone forgot to land. I merged the two halves and
pushed.

That read was wrong three times over.

First, I copied the files instead of applying the diff. Main had moved in those 23 days,
including a commit that pinned a dependency past two CVEs. My copy of the older file
silently reverted part of that merged fix. The diff looked clean because I was reading it
against the stale base in my head, not against main. Three review engines caught it. My
test suite did not, because the suite passed either way.

Second, the branch had never been green. CI failed on every push including the first,
while main stayed green the whole time. The recovered test rendered a compose file with a
flag that leaves required variables unexpanded, and my local toolchain tolerated the extra
colons that produced. The CI runner rejected them: `invalid spec ... too many colons`. So
the work passed on the author's machine and could not pass CI. That is a perfectly good
reason for someone to walk away from it.

Third, my local bar was narrower than CI's the whole time. I kept reporting "224 passed, 0
failed" after every review cycle. That suite runs shell regressions and no markdown lint,
while the workflow file lists a lint step nothing local invoked. Five line-length errors,
all of them in lines inherited unchanged from the stranded worktree.

Nobody abandons finished, green work. Strandedness is a signal about the work, not a
comment on whoever left it.

Two habits fall out of this. Apply the diff, never the file: take main's version, then
replay the old change as a patch and read every removed line. And before spending a day
merging halves, run the CI history for the old branch and read the workflow's steps rather
than the one test command you happen to know.
