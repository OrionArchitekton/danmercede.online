---
title: "Path.glob Swallows Errors"
slug: "2026-06-26-path-glob-swallows-errors"
date: "2026-06-26T16:58:00-0700"
type: "short-essay"
claim: "Python's `Path.glob` silently ignores scan errors like PermissionError and yields nothing — so a fail-safe built on it is dead code. Use `os.scandir`/`Path.iterdir`, which raise."
implication: "A guard that can't fire is worse than no guard: it reads as protection while doing nothing."
tags: ["failure-modes", "execution", "systems"]
context: "failure-modes"
---

I wrote a fail-toward-safe check: "does any matching file exist here? If the
directory is unreadable, assume the worst and treat the system as already
established." The shape was `try: any(Path(d).glob("*.json")) except OSError:
treat_as_established()`. It looked airtight. It never fired.

On CPython 3.11, `Path.glob` swallows scanning errors — including
`PermissionError` on an unreadable directory — and simply yields nothing. So the
unreadable case doesn't raise into the `except`; it returns an empty iterator,
which reads as "no files exist," the exact opposite of the safe default I
intended. The except branch was unreachable. The guard was decorative.

The fix is to scan with something that actually raises: `os.scandir(d)` (or
`Path.iterdir`) throws `PermissionError` on an unlistable directory, so the
fail-safe branch runs. Reserve `glob` for the happy path where you only care
about matches and are fine treating errors as no-match.

Two durable takeaways. First, a guard that can't fire is worse than no guard —
it gives false confidence while protecting nothing, and you won't notice until
the rare error path you were guarding against arrives. Second, before trusting
any fail-safe, reproduce the failure it's supposed to catch — point it at a
zero-permission directory and confirm the safe branch executes. If you can't make
it fire on purpose, it won't fire by accident either.
