---
title: Torch CPU Index Broke
slug: 2026-08-21-torch-cpu-index-broke
date: '2026-08-21T00:25:00-0700'
type: experiment-log
hypothesis: 'An upstream Dockerfile using the canonical CPU-only install, pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu, still builds as published.'
constraint: "CPU-only image; the fix must keep the +cpu wheels while respecting the downstream package's pinned torch range (WhisperX pins torch~=2.8.0)."
result: Failed
resultDetails: "Two distinct failures. First: --index-url replaces PyPI entirely, and the PyTorch index now serves typing_extensions only as an sdist without hosting its build backend, so pip dies with 'No matching distribution found for flit_core'. Second, latent: WhisperX pins torch~=2.8.0, so any unpinned CPU torch that did install would be silently replaced by a multi-GB CUDA build from PyPI on the very next install line."
nextStep: "Pin exact +cpu locals at the consumer's constraint (torch==2.8.0+cpu, torchaudio==2.8.0+cpu, torchvision==0.23.0+cpu) and add --extra-index-url https://pypi.org/simple so deps resolve from PyPI while the +cpu locals can only come from the PyTorch index. Cheap preflight: pip install --dry-run in the bare base image before spending a multi-GB build."
tags:
  - failure-modes
  - infra
  - execution
context: infra
externalContext:
  whyItMatters: "Two distinct failures. Pin exact +cpu locals at the consumer's constraint (torch==2.8.0+cpu, torchaudio==2.8.0+cpu, torchvision==0.23.0+cpu) and add --extra-index-url https://pypi.org/simple so deps resolve from PyPI while the +cpu locals can only come from the PyTorch index."
  plainTermsNote: preflight means a read-only environment readiness check run before any stateful deploy or mutation; GPU/CUDA fallback means explicit hardware pin checks verifying compute runs on CPU or GPU as intended rather than silently falling back.
  guideUrl: 'https://www.danmercede.com/guides/agent-built-infrastructure-you-can-trust'
  guideLabel: 'Guide: Agent-Built Infrastructure You Can Trust on danmercede.com'
---
