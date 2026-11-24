---
title: The Default Picked the GPU
slug: 2026-11-21-the-default-picked-the-gpu
date: '2026-11-21T19:25:00-0800'
type: short-essay
claim: "A comment that says CPU doesn't prove the job ran on the CPU. I had a narration job for Kokoro text-to-speech. The wrapper script's header comment said CPU, and the Python under it built the pipeline as KPipeline(lang_code='b', repo_id='hexgrad/Kokoro-82M') with no device argument. In kokoro 0.9.4 that argument defaults to None, and pipeline.py then picks 'cuda' whenever torch.cuda.is_available() is true. The torch in that environment was 2.15.0+cu132. So on a box with a shared GPU, where a job is supposed to ask for a slot first, the narration went to the GPU without asking, for three videos in a row. There was no GPU command in the session to notice, so the records for the first two videos say 'No GPU was used'. That line was written from what the script was meant to do, and it was never checked against what it did. What gave it away was a timestamp. An agent drafting the third record noticed that 56 takes had been written within six seconds. I measured it afterwards, and it was 608 seconds of speech inside 5.4 seconds. The other two videos read the same way: 710 seconds within 6.3, and 593 within 5.7."
implication: "So pass the device explicitly, device='cpu', or export an empty CUDA_VISIBLE_DEVICES before the model loads, in any script that has to stay off a shared GPU. And before a record says no GPU was used, read the device the model landed on, or find a timing that only a CPU explains. A comment tells you what the author meant to run, and you still have to look at what ran."
tags:
  - failure-modes
  - infra
  - governance
context: failure-modes
externalContext:
  whyItMatters: "A comment that says CPU doesn't prove the job ran on the CPU. So pass the device explicitly, device='cpu', or export an empty CUDA_VISIBLE_DEVICES before the model loads, in any script that has to stay off a shared GPU."
  plainTermsNote: 'GPU/CUDA fallback means explicit hardware pin checks verifying compute runs on CPU or GPU as intended rather than silently falling back; prompt-boundary limit means model instructions can advise behavior, whereas only code checks at the tool boundary enforce it.'
  guideUrl: 'https://www.danmercede.com/guides/quality-video-on-local-hardware'
  guideLabel: 'Guide: Local Media Pipelines on danmercede.com'
---
