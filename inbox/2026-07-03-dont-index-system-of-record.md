---
title: "Don't Index Your System of Record"
slug: "2026-07-03-dont-index-system-of-record"
date: "2026-07-03T08:40:00-0700"
type: "thought-snippet"
content: "Went to drop a PDF into an agent's knowledge vault today and hit the right instinct by accident: the vault's ingest crawler explicitly excludes its own directory from the crawl. Obvious in hindsight. A recall layer, the RAG corpus or the wiki an agent searches, is advisory. It is lossy, re-summarized, allowed to drift. Your registers and config are authoritative. Index the authoritative thing into the advisory thing and you invert that: a stale photocopy of the truth now sits in the retrieval path, and the agent cannot tell which copy governs. Keep the lanes apart. External third-party knowledge goes in the recall corpus. Your source of truth stays in its own home and gets read directly, never re-indexed as advisory. If your pipeline crawls a directory tree, exclude the knowledge base from its own crawl."
tags: ["systems", "governance", "signal"]
context: "systems"
---

Went to drop a PDF into an agent's knowledge vault today and hit the right instinct by accident: the vault's ingest crawler explicitly excludes its own directory from the crawl. Obvious in hindsight.

A recall layer, the RAG corpus or the wiki an agent searches, is advisory. It is lossy, re-summarized, allowed to drift. Your registers and config are authoritative. Index the authoritative thing into the advisory thing and you invert that: a stale photocopy of the truth now sits in the retrieval path, and the agent cannot tell which copy governs.

Keep the lanes apart. External third-party knowledge goes in the recall corpus. Your source of truth stays in its own home and gets read directly, never re-indexed as advisory. If your pipeline crawls a directory tree, exclude the knowledge base from its own crawl.
