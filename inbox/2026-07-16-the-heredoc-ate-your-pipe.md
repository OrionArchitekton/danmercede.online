---
title: "The Heredoc Ate Your Pipe"
slug: "2026-07-16-the-heredoc-ate-your-pipe"
date: "2026-07-16T09:10:00-0700"
type: "short-essay"
claim: "Piping data into an interpreter that also reads a heredoc discards the pipe: the heredoc becomes stdin, your upstream output goes to an unread pipe, and the failure is silent."
implication: "For a single-use payload, that silence costs you the payload. Capture before you parse."
tags: ["failure-modes", "execution", "infra"]
context: "failure-modes"
---

`producer | python3 - <<'EOF'` does not do what the shape suggests. The `-` tells python to read its program from stdin, and the heredoc IS that stdin. The pipe from `producer` loses the race and gets thrown away. `producer` still runs to completion, so nothing errors on its side. Inside the script `sys.stdin.read()` returns the heredoc leftovers, or empty, and you get a confusing parse failure a few lines down that points nowhere near the real cause.

I hit this converting a one-time code into a credential. The API call fired and succeeded server side. The response, which held the only copy of a private key, went straight into the dead pipe. The script then read the heredoc, found no JSON, and died. The code was single-use, so it was already spent. This was recoverable only because that particular key could be regenerated. Plenty of payloads cannot.

The fix is to stop crossing the streams. Write the script to a file and run `producer | python3 script.py`. Or capture first with `out=$(producer)` and feed it in. Or drop the pipe entirely and do the fetch inside the interpreter. And for anything single-use, write the raw response to a private file before you parse a single byte, so a parser bug can never take the payload down with it.
