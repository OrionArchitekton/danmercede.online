---
title: "Worktrees: git -C, Not GIT_DIR"
slug: "2026-06-26-worktrees-git-c-not-git-dir"
date: "2026-06-26T16:53:54-0700"
type: "short-essay"
claim: "Never export GIT_DIR or GIT_WORK_TREE into a shell — address a worktree with `git -C <path>` so concurrent git operations can't clobber each other."
implication: "Exported git env bleeds into every later command in that shell; with a second git op running against a different repo, one operation can rewrite the wrong repo's refs and check its worktree out to a foreign tree."
tags: ["failure-modes", "execution", "systems"]
context: "execution"
---

When you run git against a linked worktree, it's tempting to set
`export GIT_DIR=$(git rev-parse --git-dir)` and `export GIT_WORK_TREE=$(pwd)`
so commit and push target the right tree. Don't. Those exports persist for the
rest of the shell's life and leak into every command that follows.

That's harmless until two git operations run at once — an agent's session plus a
background job, two pipelines, a sweep timer firing mid-task. The second
operation runs against a *different* repo but inherits the first one's exported
GIT_DIR. Result: its git writes the wrong repo's refs into your bare repo. The
branch gets clobbered to a foreign commit, the worktree is checked out to a
foreign tree, files vanish from disk, and `git status` reports
"diverged, N and M different commits."

It's recoverable, because the pushed/origin refs are never touched:
`unset GIT_DIR GIT_WORK_TREE; git -C "$WT" reset --hard <pushed-sha>`, then `ls`
and `git -C "$WT" log` before you trust the tree again.

The durable rule: a linked worktree's `.git` file already resolves the correct
gitdir, so `git -C "$WT" <cmd>` works for status, diff, reset, log, commit, and
push with no exports at all — pre-commit and pre-push hooks run fine under it. If
you genuinely need the variables for an ancient git that can't read the worktree
pointer, scope them inline to a single invocation
(`GIT_DIR=… GIT_WORK_TREE=… git …`) and never export — so they can't survive past
the one command. Whenever two git operations can overlap, keep every invocation
self-contained with `-C`.
