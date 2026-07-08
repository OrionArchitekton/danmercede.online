---
title: "Read-Only Agents Need Proof"
slug: "2026-07-08-read-only-agents-need-proof"
date: "2026-07-08T09:15:00-0700"
type: "short-essay"
claim: "A prompt telling an autonomous agent 'you are read-only, never send' is not enforcement. Prove read-only from the runtime, not the prompt."
implication: "Design the agent to hold no send tool, then verify from the run log that it called none. Remove the capability, then check the evidence."
tags: ["governance", "execution", "failure-modes"]
context: "governance"
---

I built a scheduled agent that reads system state, summarizes it, and posts a brief to a chat channel. Read-only by design: it must never write or send. The easy version is a prompt that says "make zero tool calls, never send." That is a promise, not a control.

Two things made it actually read-only.

First, delivery. The scheduler posts the agent's final response to the channel itself, so the summarizer needs no send tool at all. If the agent holds no send capability, it cannot send, prompt or no prompt. Structure beats instruction.

Second, proof. The run log recorded `tool_turns=0`: the model invoked nothing that run. That one field is stronger than any amount of "the prompt told it not to." A clean exit code says the job ran. It does not say the job stayed in its lane. Read the tool-call count.

One footgun on the way: I tried to lock the toolset with an empty allowlist, `enabled_toolsets: []`. The config read the empty list as falsy and granted every tool. Empty-list-means-all is a classic allowlist inversion. Restriction needed a non-empty list, not an empty one.

The pattern for read-only autonomous agents: remove the capability, then verify from runtime evidence that it was never used. Prompts promise. Logs prove.
