---
title: "Coherent Isn't Correct"
slug: "2026-06-28-coherent-isnt-correct"
date: "2026-06-28T17:30:00-0700"
type: "experiment-log"
hypothesis: "Hand an autonomous AI coding agent a whole local-first finance tool to build end-to-end, no human writing code, and the output will be safe to use as-is."
constraint: "First pass fully autonomous; then an independent audit and a harden loop where every finding becomes a failing test before it's fixed; every public claim must be backed by code."
result: "Failed"
resultDetails: "The agent (Grok) shipped something genuinely coherent — an installable, Dockerized, CI-green vertical with a CLI, a web UI, a sqlite ledger, invoices, and reports. But it was broken in exactly the parts that matter for money: amounts stored as floats (the Markdown and JSON reports disagreed), a fabricated 42-dollar charge recorded on a receipt it couldn't read, a parser that truncated 1,234.56 down to 1.23, a 'CSV export' that emitted JSON with no OFX at all, an 'optional local vision' feature with zero code behind it, and a file upload with a path-traversal hole that ran as root. The harden loop — a self-adversarial review plus three independent automated review passes, each finding turned into a failing test — caught a critical data-loss bug in the upgrade path and fixed the rest. v0.2 now uses exact integer money, flags unreadable receipts for review instead of inventing amounts, ships real CSV and OFX exports, binds loopback as a non-root container, and has 85 tests at 91 percent coverage."
nextStep: "Treat an autonomous build the way you'd treat a junior pull request for a system that touches money: audit it adversarially and make every claim earn a test. The agent is great at producing something that looks shipped; the unglamorous correctness work is still yours. The build is cheap — the harden loop is the product."
tags: ["failure-modes", "execution", "systems"]
context: "execution"
---
