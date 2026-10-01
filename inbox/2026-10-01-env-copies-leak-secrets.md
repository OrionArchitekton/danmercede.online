---
title: "Env Copies Leak Secrets"
slug: "2026-10-01-env-copies-leak-secrets"
date: "2026-10-01T11:25:00-0700"
type: "experiment-log"
hypothesis: "Copying os.environ into a pytest helper object, so a CLI under test runs against fake binaries on PATH, is harmless as long as the tests never print it."
constraint: "One dataclass helper holding {**os.environ, ...}; failing assertions run at pytest -q, -v, and -vv; a canary variable seeded in the environment."
result: "Failed"
resultDetails: "The tests never print the helper. Pytest does. Assertion rewriting reprs every object in a failing comparison, and a dataclass repr includes every field, so the first failing run at -v dumped the whole environment, canary included, into the output. On a workstation that exports API keys, that output landed in a coding agent's session transcript, which can sync off the box. Marking the field repr=False removed the canary at -q, -v, and -vv."
nextStep: "Build the subprocess env from an allowlist instead of copying os.environ, and grep new test harness code for **os.environ before its first failing run, not after."
tags: ["security", "failure-modes", "execution"]
context: "failure-modes"
---
