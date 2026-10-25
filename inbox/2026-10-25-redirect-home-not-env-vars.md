---
title: "Redirect HOME, Not Env Vars"
slug: "2026-10-25-redirect-home-not-env-vars"
date: "2026-10-25T10:12:00-0700"
type: "short-essay"
claim: "If your tests pass an env dict into the code under test, a conftest that scrubs os.environ does not protect them. I ran into this moving an alert from Slack to a CLI that posts to our internal message board. The new transport reads its binary path from the env it is handed and falls back to a default under the home directory. The tests call main(env={...}) with a plain dict, so deleting the override from os.environ changes nothing: the dict never had it, the code takes the default, and a test that forgets the fake makes a real post."
implication: "Isolate the root the default hangs off, not the variable that overrides it. Point HOME at a temp dir in an autouse fixture and compute the default path at call time, so a test that forgets the fake hits a missing file and fails closed."
tags: ["failure-modes", "execution", "systems"]
context: "failure-modes"
---

Two more lessons came out of the same change.

**Drive a fake executable through an explicit override.** The fake records its argv
and the message file, then exits with whatever code the test asks for. So you test the
real subprocess call end to end, and the failure paths (a non-zero exit, a missing
binary) get the same coverage as the happy one.

**Pin the old-path tests when you flip a default.** Once the board became the default,
every existing Slack test would have taken the new path and still passed, because a
missing-binary refusal looks a lot like a missing-token refusal. So I set the old switch
explicitly in those tests, and they went back to testing what their names say.

The tell for the first bug is a signature like `env=None` that falls back to
`os.environ`. Anything in your conftest that only touches `os.environ` stops at that
parameter.
