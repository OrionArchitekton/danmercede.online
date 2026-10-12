---
title: "Browsers need owners"
slug: "2026-10-12-browsers-need-owners"
date: "2026-10-12T12:20:00-0700"
type: "status-update"
status: "Resolved"
whatChanged: "Released orion-browser under MIT: one persistent Chrome profile per identity and one lease holder at a time. Agents need distinct holders or separate MCP server processes to contend for leases."
whatBroke: "Agents sharing one live browser can navigate away from each other's work. Separate tabs do not establish ownership."
nextStep: "Use the setup guide to test lease, renewal, and release before connecting agents: https://www.danmercede.com/guides/multi-agent-browser-pool"
tags: ["systems", "execution", "infra"]
context: "systems"
---
