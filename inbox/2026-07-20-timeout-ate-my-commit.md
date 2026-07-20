---
title: "The Timeout That Ate My Commit"
slug: "2026-07-20-timeout-ate-my-commit"
date: "2026-07-20T01:30:00-0700"
type: "short-essay"
claim: "An agent harness's default command timeout will eat your git commit whole. The setup: a repo whose pre-commit hook runs the full regression suite, about three minutes, and a harness that kills any command at its two-minute default. The hook's tests all pass. The commit still never lands, because the timeout SIGTERMed the process group mid-hook, before the ref write. Exit 143, staged files intact, no commit. The trap is the diagnosis: green tests plus a missing commit reads like a mysterious hook failure, so you retry, and the same default timeout kills it the same way, forever. The failure lives in the harness, not the repo. The fix is two habits. Before committing anywhere, check whether pre-commit or pre-push runs a test suite, and if it does, raise the exec timeout on commit and push to cover the suite. After any killed commit, read git log before retrying: staged state survives the kill, the commit does not, and assuming half-landed state is how you double-commit or abandon a clean tree."
implication: "Hooks moved real work into git's critical section, but agent harnesses still budget commands as if git were instant. Any wrapper that imposes a default exec timeout needs a per-command override at exactly the commands that run someone else's code: commit, push, merge."
tags: ["failure-modes", "execution", "workflow-ownership"]
context: "failure-modes"
---
