---
title: "Two Traps in a Zero-Dep LLM Client"
slug: "2026-07-22-zero-dep-llm-client-traps"
date: "2026-07-22T14:18:00-0700"
type: "experiment-log"
hypothesis: "Python stdlib urllib can drive an OpenAI-compatible inference API end to end. No SDK, no pip install, one file."
constraint: "Throwaway event chatbot, shipped in under an hour: http.server plus urllib.request only, against a cheap serverless reasoning model (gpt-oss-120b on Fireworks)."
result: "Passed"
resultDetails: "Worked, after two traps. First: the exact request that returned 200 via curl returned HTTP 403 Forbidden from urllib. The provider's WAF rejects the default Python-urllib/3.x User-Agent. Because the same key had just listed /models successfully, the 403 reads as a key-scope problem and sends you auditing permissions; the real fix is any explicit User-Agent header. Second: reasoning models on OpenAI-compatible endpoints return message.reasoning_content before message.content, and a small max_tokens gets consumed entirely by reasoning. A 10-token probe came back finish_reason length with reasoning_content present and no content key at all. Client code that assumes choices[0].message.content exists breaks precisely when responses truncate. Parse content with a reasoning_content fallback, pass reasoning_effort low, and budget max_tokens in the hundreds."
nextStep: "Bake both into the default zero-dep client template: explicit User-Agent and content-or-reasoning parsing land before any key or scope debugging starts."
tags: ["failure-modes", "execution"]
context: "failure-modes"
---
