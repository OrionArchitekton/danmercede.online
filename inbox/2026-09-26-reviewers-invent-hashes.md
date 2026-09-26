---
title: "Reviewers Invent Hashes"
slug: "2026-09-26-reviewers-invent-hashes"
date: "2026-09-26T09:28:00-0700"
type: "short-essay"
claim: "An LLM code reviewer will quote exact evidence for content it never read. This morning a review engine in my post-push pipeline raised two HIGH findings on a lockfile bump. One said a pinned file was missing from the integrity map; the pin was sitting in the lock. The other said a pinned digest no longer matched the file at the pinned commit, and it supplied the real sha256. That file lives in a different repository. The reviewer only saw the diff, so it had no way to hash it. The quoted value ended in 0123456, a sequential run that is a strong tell of a generated number. Two checks settled it in about a minute. I re-hashed all 21 pinned files at the pinned commit with plain git and sha256, then ran the repo's own lock verifier against a throwaway checkout of that commit. Both passed. Applying the finding would have rewritten a correct lock to match a number the model made up."
implication: "Before acting on a finding, ask whether the reviewer could have seen the thing it describes. If the evidence points outside what it read, its precision is a warning sign. Settle it with the check the repo already enforces, then decline the finding with that output attached."
tags: ["failure-modes", "signal", "execution"]
context: "failure-modes"
---
