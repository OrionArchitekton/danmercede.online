---
title: "Your Shell Is Not Cron's Shell"
slug: "2026-07-13-shell-is-not-crons-shell"
date: "2026-07-13T19:30:00-0700"
type: "short-essay"
claim: "Today a runbook snippet that had worked every time an operator typed it died in automation with `python: command not found`. Nothing was broken. `ssh host 'cmd'` runs a non-login shell: no profile, no venv activation, a different PATH, so the bare `python` every interactive session resolved simply did not exist there. The lesson is bigger than one interpreter. A command that has only ever run in your interactive shell is untested code for every other shell it will meet: ssh one-liners, cron, CI, systemd units. Interactive success proves the command works in exactly one environment, and it is the one your automation never sees. Pin the environment explicitly in any scripted path: invoke the repo venv binary by absolute path (`~/repo/.venv/bin/python -m tools.x`) instead of trusting PATH, and treat every runbook block as code that has not run until it has run in the shell that will actually execute it."
implication: "'Works when I type it' and 'works when the machine runs it' are different claims. Every runbook snippet written for a human terminal is an untested branch of your automation until it has been exercised there."
tags: ["failure-modes", "execution", "infra"]
context: "failure-modes"
---
