---
title: "Deployed Isn't Running"
slug: "2026-06-20-deployed-isnt-running"
date: "2026-06-20T09:56:42-0700"
type: "thought-snippet"
content: "When you audit a fleet of services by reading their config and deploy files, the file tells you what was declared, not what is running. Grepping manifests produced a confident inventory of live services; a six-line HTTP probe of the same hostnames came back 200, 302, 404, and 502 — healthy, redirecting, gone, and broken. The file said deployed for every one. Config presence is not runtime liveness. The cheapest way to stop a confident-but-wrong fact from reaching your plan is to verify it against live state before writing it down: probe the endpoint, inspect the running artifact, read the actual status. File-grep gives you intent; only a live check gives you truth. For an autonomous agent doing recon, that one probe is the difference between a plan built on what should be running and one built on what is."
tags: ["failure-modes", "infra", "execution"]
context: "execution"
---
