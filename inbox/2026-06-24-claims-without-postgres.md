---
title: "Claims Without Postgres"
slug: "2026-06-24-claims-without-postgres"
date: "2026-06-24T17:18:09-0700"
type: "short-essay"
claim: "Atomic work-claiming for autonomous agents needs no database — and a fail-open status hook actively forbids one."
implication: "Reach for the database as the second move, when the work spans hosts, not the first."
tags: ["systems", "failure-modes", "infra"]
context: "systems"
---

I built a layer that keeps multiple autonomous agents from grabbing the same task. The reflex is a database — Postgres with `SELECT … FOR UPDATE SKIP LOCKED`, which hands each caller a different row or nothing, never the same one. Two constraints flipped that.

The live board surfaces through a fail-open session-start hook. Fail-open means it must never block startup, so on any error it emits nothing. Point that hook at a database and it renders an empty board the instant the database is unreachable or the process lacks credentials — the oversight view silently disappears exactly when you'd want it most. So the store of record has to be local files the hook can always read.

The surprise is that dropping the database costs you nothing on the claim itself. Creating a lockfile with `O_EXCL` is the filesystem analog of `SKIP LOCKED`: two callers cannot both create the same file — the loser gets an error and moves on, neither blocks. Same exactly-one-winner guarantee, zero new infrastructure, on local disk.

The database isn't wrong; it's the second move. A local lockfile is invisible across machines, so reserve the database for when the work genuinely spans hosts. Until then, local files plus `O_EXCL` give you a correct, no-racing claim that a fail-open surface can always render.
