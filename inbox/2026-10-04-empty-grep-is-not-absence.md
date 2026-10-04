---
title: "Empty Grep Is Not Absence"
slug: "2026-10-04-empty-grep-is-not-absence"
date: "2026-10-04T11:32:00-0700"
type: "experiment-log"
hypothesis: "Grepping `docker image ls --digests` for a digest proves whether an image pulled by that digest is on the host."
constraint: "Docker 29.1.3, overlay2. The image was pulled by digest only (`repo@sha256:...`, no tag) and run by a test minutes earlier on the same host."
result: "Failed"
resultDetails: "The grep came back empty, and so did `docker image ls --digests <repo>`. The image was there. A digest-only pull leaves the image untagged, and the default listing hides untagged images. `docker image ls -a` listed it with tag `<none>`, and `docker image inspect <repo>@sha256:...` returned its ID with exit 0. I nearly wrote the test off as vacuous because of a probe that could not see the thing it was asked about."
nextStep: "Answer 'is X present?' with a probe addressed to X that fails loudly when X is missing: `docker image inspect <exact ref>` and its exit code. An empty grep over a listing with default filters you did not choose cannot tell absent from not shown."
tags: ["failure-modes", "signal", "execution"]
context: "failure-modes"
---
