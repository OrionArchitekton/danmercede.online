---
title: "When Backward Compat Defends the Bug"
slug: "2026-08-01-when-compat-defends-the-bug"
date: "2026-08-01T13:30:00-0700"
type: "short-essay"
claim: "A backward-compat finding from a review engine can defend the exact escape your change closes. Judge the old behavior against the feature's documented purpose, not against its old output."
implication: "When the defended behavior never delivered the documented intent, decline the revert and take the engine's migrate-and-document branch instead."
tags: ["failure-modes", "governance", "execution"]
context: "governance"
---

Today an adversarial review engine flagged my hardening PR as a breaking change. Factually correct. Strategically wrong.

The PR made a CLI's `--clips-dir` flag a strict root: every clip path in the config must resolve beneath the operator-supplied directory, symlinks refused. The engine objected that configs using directory-qualified clip paths, "previously valid" under that flag, would now fail, and recommended preserving the old contract.

Here is what the old contract actually did: for any clip path carrying a directory, the flag was silently ignored. The run read from the config directory instead. Those "working" production runs never received the protection the flag documented. The compat finding was defending the bug.

The tell is in what the finding measures. It compared old output to new output. It never compared old output to the flag's documented purpose: pin the run to operator-selected copies of its inputs. Behavior that "worked" by skipping the guarantee is not compatibility; it is the defect wearing a compatibility costume.

Review engines usually offer two branches: revert, or migrate and document. When the defended behavior never delivered the documented intent, take the second branch every time. I shipped the migration note plus a changelog Breaking entry, and left the strict root alone.
