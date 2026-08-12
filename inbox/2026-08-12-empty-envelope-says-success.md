---
title: "The Empty Envelope That Says Success"
slug: "2026-08-12-empty-envelope-says-success"
date: "2026-08-12T12:30:00-0700"
type: "experiment-log"
hypothesis: "A tool result with successful true and no error field means the requested data came back."
constraint: "Read-only probes, one Gmail connection, identical tool and arguments on two transports (Composio CLI vs its MCP surface); response shapes compared byte for byte."
result: "Failed"
resultDetails: "Every response shape that would carry message bodies came back as successful true with an empty data object of about 200 bytes: per-message fetch in full and raw format, batch fetch with payloads, and the verbose flag. Ids-only and metadata-only calls passed clean. The identical body-carrying call on the MCP transport returned complete messages. Two downstream classifier passes burned on id-only stubs before the shape was diagnosed, because an empty-success envelope reads exactly like a legitimately empty result."
nextStep: "Consumers fail closed on shape, not status: a record missing its content fields is PROBE_FAILED, never no-results. Before concluding emptiness from any middleware, re-run the same call on an alternate transport. The sweep now refuses to classify stubs and routes them back into the next run."
tags: ["failure-modes", "signal", "systems"]
context: "failure-modes"
---
