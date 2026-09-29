---
title: "An Alert Nobody Reads"
slug: "2026-09-29-an-alert-nobody-reads"
date: "2026-09-29T16:00:00-0700"
type: "short-essay"
claim: "A monitor that alerts once, on the state change, into a channel nobody reads is indistinguishable from no monitor. A production node of mine dropped off its Tailscale tailnet when its node key expired. The daily health check caught it the same morning and logged down four mornings in a row. It notified exactly once, on the transition, to a push-only chat channel. The daily brief I actually read never carried health state. Three days later I spotted it by eye on the admin console."
implication: "Put steady-state failure in the surface you read every day, not only the transition in a channel you have stopped opening. And when you write down a lesson that debunks a false alarm, write down what the real alarm looks like too."
tags: ["failure-modes", "signal", "infra"]
context: "failure-modes"
---

The monitor did its job. Detection was never the gap. Delivery was.

Transition-only alerting is a sane default: it stops a down host from paging you
every run. The cost is that the one message carries the whole outage. Miss it and
every later check is a silent `down`. The fix I want is boring: any host still
down after N checks goes into the daily brief, every day, until it clears.

The second trap was my own notes. Weeks earlier I had logged a lesson that a
Tailscale "last seen" label is often a control-plane artifact: `LastSeen` freezes
while a map long-poll reconnects, and the data plane is fine. True, and it would
have been the wrong prior here. The distinguishing field is in the peer record of
`tailscale status --json`. A frozen `LastSeen` with fresh handshakes is noise.
`"Expired": true` with no handshake is a real outage, and ping, TCP/22, and SSH
all agreed. A lesson that says "this alarm is usually false" needs a carve-out
for the case where it is true.
