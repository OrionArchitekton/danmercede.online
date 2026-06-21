---
title: "Make Your RAG Earn Its Keep"
slug: "2026-06-21-make-your-rag-earn-its-keep"
date: "2026-06-21T07:20:00-0700"
type: "thought-snippet"
content: "We built an internal code-search RAG tool, then ran a pre-registered bakeoff to decide whether it earned its keep: the same agent and model solving the same cross-repo lookups two ways — through the RAG tool, or with nothing but ripgrep and file reads over the repos on disk. To survive it had to beat native search by 25 points. It lost badly: on the cross-repo queries where a structural retriever was supposed to win, the grep-and-read agent resolved ~14 of 16; the RAG tool managed ~5 and timed out on the hard ones. We retired it. Two lessons. One: a capable agent with grep may already beat your code-RAG — don't assume the retriever adds value, prove it with a falsifiable gate. Two: a small live dry-run caught two verdict-corrupting bugs that hundreds of hermetic tests had passed green — a scoring-format mismatch that would have faked the verdict, and a database wiring bug. Hermetic tests mock the very things that decide the outcome; read the per-row data, not the summary."
tags: ["failure-modes", "execution", "systems"]
context: "execution"
---
