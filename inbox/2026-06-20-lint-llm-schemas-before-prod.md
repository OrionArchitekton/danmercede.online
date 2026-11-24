---
title: Lint LLM Schemas Before Prod
slug: 2026-06-20-lint-llm-schemas-before-prod
date: '2026-06-20T09:30:00-0700'
type: thought-snippet
content: 'A JSON Schema or tool definition that works on one LLM provider can 400 on another: OpenAI demands additionalProperties:false on every object and forbids default; Anthropic rejects a dozen validation keywords (minLength, pattern, format, minimum/maximum, and more); Gemini chokes on anyOf and dicts. The API tells you it failed, not which keyword. The durable fix is a static, provider-aware CI lint that fails the PR — naming the JSON-Pointer path, the offending keyword, and why — before the schema reaches production. The constraint surfaces are documented; treat them as a deterministic pre-ship check, not a runtime surprise.'
tags:
  - failure-modes
  - execution
  - infra
context: execution
externalContext:
  whyItMatters: 'A JSON Schema or tool definition that works on one LLM provider can 400 on another: OpenAI demands additionalProperties:false on every object and forbids default; Anthropic rejects a dozen validation keywords (minLength, pattern, format, minimum/maximum, and more); Gemini chokes on anyOf and dicts. The API tells you it failed, not which keyword.'
  plainTermsNote: schema validation means enforcing required structured fields at parse time so malformed inputs fail before execution; CI runner means the automated build machine running tests and checks before changes merge.
  guideUrl: 'https://www.danmercede.com/guides/why-llm-schemas-get-rejected'
  guideLabel: 'Guide: Why LLM Output Schemas Get Rejected on danmercede.com'
---
