---
title: "Name the Override Gap"
slug: "2026-07-24-name-the-override-gap"
date: "2026-07-24T00:02:43-0700"
type: "short-essay"
claim: "An override a model can grant itself is the permission prompt again in a different hat."
implication: "State what your safety control does NOT have (authentication, command binding, single-use, an audit trail) instead of describing the hardened version you meant to build."
tags: ["security", "governance", "failure-modes"]
context: "governance"
---

I shipped a guide arguing that a safe agent harness fails closed, then described its destructive-action override as authenticated, bound to the exact command, single-use, and audited. Review caught the gap: the real override is an environment variable the operator sets. None of those four properties held.

The fix was not to build the hardened version on the spot. It was to name the gap. A control described as stronger than it is fails the same way a green dashboard with a dead check behind it fails: the reader trusts a property that was never there.

So write the honest version. What does the gate actually enforce, and what does it merely record? An override the model can grant itself is not a safety property. It is the permission prompt again, wearing a hat.

Full writeup: danmercede.com/guides/the-fail-closed-harness
