---
title: "Shape Isn't Identity"
slug: "2026-06-25-shape-isnt-identity"
date: "2026-06-25T12:58:15-0700"
type: "experiment-log"
hypothesis: "An exhaustive single-model adversarial review across four independent lenses is enough to catch destructive-safety gaps before shipping a script that wipes and rebuilds a stateful service's storage."
constraint: "Same diff, same model for all four lenses (quoting, fix-completeness, regression, adversarial); then a second review pass by a DIFFERENT model."
result: "Failed"
resultDetails: "All four same-model lenses rated one finding a low-severity residual: the script's pre-flight guard only checked that the target host LOOKED right — expected binary, config file, and data dir all present — before destroying its data. A different model elevated the same finding to blocking. Proving a target is the right SHAPE (the expected paths exist) does not prove it IS the right target: any other instance of the same software has the identical shape, so an overridden or typo'd target pointing at a DIFFERENT real instance would have its storage wiped. The four lenses partly agreed because they shared one model's blind spot."
nextStep: "For any destructive or irreversible action, the 'am I on the right target?' guard must assert IDENTITY — a unique config value, machine-id, or declared address — not just shape/existence. And budget for cross-model review: it is not belt-and-suspenders, it catches the failures a single model's lenses all miss together."
tags: ["failure-modes", "security", "systems"]
context: "failure-modes"
---
