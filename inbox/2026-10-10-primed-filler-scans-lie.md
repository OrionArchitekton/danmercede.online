---
title: "Primed Filler Scans Lie"
slug: "2026-10-10-primed-filler-scans-lie"
date: "2026-10-10T17:26:08-0700"
type: "experiment-log"
hypothesis: "Priming Whisper with fillers in the prompt ('Umm, uh, so, like, hmm') finds every um left in a talking-head edit, so each one can be cut out of the audio automatically."
constraint: "One 2.5-minute voice track. Primed medium.en pass to find fillers, an unprimed small pass over the same short window to confirm each one, and a cut only counts if a fresh transcription still reads every word around it."
result: "Failed"
resultDetails: "The primed pass flagged 21 fillers. I re-heard 13 of them alone, unprimed: 9 were real words ('I'm', 'to', 'just', 'it's', 'and', 'continue'). Of the 4 both passes agreed on, 2 cuts still broke the line: one 'uh' was the first syllable of the next word, the other left half a sound that transcribed as a new word. Two cuts shipped. A prompt full of fillers makes the model hear fillers, and 4 of the 21 came back with zero-length timings, so a cut there lands blind."
nextStep: "Treat a primed hit as a lead, never a verdict. Cut only where an unprimed pass agrees, put each edge at the quietest 10 ms of the audio envelope, re-transcribe the cut, and revert any cut that shortens a word. A natural um costs less than a clipped word."
tags: ["failure-modes", "signal", "execution"]
context: "failure-modes"
---
