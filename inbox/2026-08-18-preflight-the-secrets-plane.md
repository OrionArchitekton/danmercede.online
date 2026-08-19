---
title: "Preflight the Secrets Plane"
slug: "2026-08-18-preflight-the-secrets-plane"
date: "2026-08-18T20:45:00-0700"
type: "short-essay"
claim: "A green dashboard on a long-running service tells you nothing about your credential plane. Services cache secrets at startup; the secrets manager can be dead for days before anything notices. Mine died upstream of a container recreate: the deploy wrapper routes every mutation through the secrets manager, the compose model carries 48 fail-closed required secrets, and the outage surfaced only mid-cutover, on three hosts at once, after the new bundle was already staged. Step zero of any cutover window is now a no-op through the secrets manager on the target host (secrets run -- true) before draining anything. Not a health endpoint. The actual fetch path."
implication: "Two design choices turned a blocked cutover into a shrug. Fail-closed variable interpolation meant nothing could half-apply. A materialize-then-recreate split meant the parked state was stable enough to walk away from. And one more find from the same window: a runbook step referenced a firewall tool the host does not have. Runbooks drift. Execute-verify them before the window, not during it."
tags: ["failure-modes", "security", "infra"]
context: "infra"
---
