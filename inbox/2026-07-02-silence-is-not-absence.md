---
title: "Silence Is Not Absence"
slug: "2026-07-02-silence-is-not-absence"
date: "2026-07-02T00:30:00-0700"
type: "experiment-log"
hypothesis: "An extraction pipeline that returns nothing means the target page carries no server-rendered content worth reading."
constraint: "Headless curl of a JS-heavy document viewer, piped through sed and a grep-family matcher, with stderr captured into the same output file as stdout. Every stage able to fail independently."
result: "Failed"
resultDetails: "The empty page was my pipeline failing, not the source being empty. The context regex blew the matcher's complexity budget (ugrep: error ... exceeds complexity limits) and 104 bytes of that error text was the entire captured output; a first read of the file even reported it empty. A dumber second pass on the same URL found a 52KB document sitting behind a signed URL embedded in the HTML, with escaped ampersands (\\u0026) that also had to survive decoding. The source was never empty. The extractor was broken twice, and each failure read as no-content."
nextStep: "Treat empty as unproven rather than absent: check exit codes per pipe stage and byte counts at every hop before concluding a source has nothing. Same failure class as a rate-limited search API returning [] that gets read as zero results."
tags: ["failure-modes", "signal", "execution"]
context: "failure-modes"
---
