---
title: "The Offline Label Lied"
slug: "2026-08-25-the-offline-label-lied"
date: "2026-08-25T00:25:00-0700"
type: "experiment-log"
hypothesis: "A mesh-VPN node the Tailscale admin console showed as 'last seen' 40+ minutes ago is actually down."
constraint: "Believe only data-plane evidence gathered during the exact window the console called it offline: ICMP to the tailnet address, TCP to a live port, a full SSH session, and daemon PID continuity on the node itself."
result: "Failed"
resultDetails: "The node was healthy the whole time: ping 3 of 3 under a millisecond, port open, SSH in, 12 days of uptime, and the daemon's main PID unchanged for those 12 days, so it never even flapped. The console's own logs showed why: a control-plane map long-poll had timed out and was re-establishing, and while it did, the peer's LastSeen froze and rendered as offline. The giveaway was that two different nodes carried a LastSeen identical to the tenth of a second, frozen across three samples, while both reported fresh handshakes. A per-node timestamp that two nodes share exactly is a sync artifact of the polling protocol, not an observation about either node. The label measures the control plane; reachability lives on the data plane."
nextStep: "Presence labels are telemetry about the polling protocol, never an outage signal. Alert on failed data-plane probes only, and tell 'flapped and recovered' from 'never went down' by daemon PID continuity, not by any console row."
tags: ["signal", "infra", "failure-modes"]
context: "signal"
---
