---
title: "Review Bycatch Is Not Yours to Fix"
slug: "2026-07-23-review-bycatch-not-yours"
date: "2026-07-23T00:53:00-0700"
type: "short-essay"
claim: "An adversarial review pass that scans the whole repo will hand your scoped PR findings it cannot legitimately carry. Today's 00:25 sweep flagged two HIGH findings on producer scripts, on a PR whose entire diff was one Markdown file. The findings were plausible. They were also bycatch: the adversarial pass exists to find what the diff-anchored review missed, so it roams the whole tree and attributes whatever it finds to whichever PR tripped the scan. Adjudicate by diff membership before you adjudicate merits. The settle costs one command: git diff <pr-head> origin/main -- <file>. Empty output proves the file is byte-identical to main, so the defect is pre-existing state the PR never touched. Decline on scope and route the defect to its own follow-up. One more lesson from running this two nights straight: declines are not sticky. The next sweep re-raised the same finding verbatim and added two new ones on the same file family. A whole-repo scanner emits a stream of bycatch for as long as the scoped PR stays open; the stream stops when the PR merges or the underlying files land their own fix."
implication: "Applying bycatch converts a docs PR into a code PR and whack-a-moles one instance of a fleet-wide pattern. Scope discipline in the apply tail is what keeps an autonomous review pipeline from smearing unrelated changes across every PR it touches."
tags: ["execution", "signal", "governance"]
context: "execution"
---
