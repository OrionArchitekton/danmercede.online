---
title: "Enumerate the Set, Never Compare Counts"
slug: "2026-09-06-enumerate-dont-count"
date: "2026-09-06T16:40:00-0700"
type: "experiment-log"
hypothesis: "A grounding check on generated narration can enforce one claim-map line per paragraph by comparing the number of map lines to the number of paragraphs."
constraint: "A script stage where a model returns SPOKEN plus a CLAIM-MAP of 'para N: <claim ids>', checked against a fixed evidence ledger before the text can be voiced. Three independent review engines, three review cycles, pytest suite RED first on every rule."
result: "Failed"
resultDetails: "Three fail-opens shipped in a row, each caught by a different engine. First, coverage compared counts: 'para 1' plus 'para 3' satisfied a two-paragraph script, and so did 'source A' plus 'source B'. The producer controls the labels, so any count it can pad it will pad. Second, tokens that did not look like ids were dropped before validation: 'C-001, MADE_UP_FACT' passed clean. Third, a range label expanded before it was range-checked; 'para 1-1000000000' pinned the CPU and the regression test hit a 60 second timeout inside a gate whose whole job is to refuse fast. The fix was the same shape each time. Build the required set from the side you trust (paragraphs 1..N from the narration you already hold), check membership per element, and report the missing ones by name. Every token is either a known id or a blocking unknown, never filtered. Parse ranges as (lo, hi) and refuse hi below lo, hi above N, and any width over a cap before the first loop iteration. The adversarial fixtures (padding labels, a junk token, a huge range, a reversed range) now sit in the same test file as the happy path."
nextStep: "For every rule of the form 'every X must have a Y' over untrusted output, write the padding fixture and the huge-range fixture in the RED pass, before the happy path is green. A checker that compares cardinalities, or filters to what it recognises, is not a checker. It is a suggestion with an exit code."
tags: ["failure-modes", "governance", "execution"]
context: "failure-modes"
---
