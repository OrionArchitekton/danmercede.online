---
title: "One Bridge Per Folder"
slug: "2026-11-05-one-bridge-per-folder"
date: "2026-11-05T20:23:00-0800"
type: "experiment-log"
hypothesis: "I could keep Claude Code's Remote Control bridge (claude rc) alive across WSL restarts by wrapping it in a systemd user service with Restart=always, so I stop leaving a terminal open just so the mobile app can reach my machine."
constraint: "WSL with systemd and lingering on, one home folder, and a terminal claude rc already serving that folder. That terminal was hosting the very chat I was configuring the service from, so I could not kill it to test."
result: "Failed"
resultDetails: "The first start exited 1 on a blank screen. The TUI clears itself on exit, so the reason only showed up once I sent stderr to a file: 'This folder is already served by a terminal claude remote-control on this device. Stop it first.' The bridge allows one server per folder, and each failed start still registers a fresh environment before it quits, so Restart=always would have filled the app's environment list every 30 seconds. My first repro lied too. I ran it from the agent's shell and it connected, but only because that shell's working directory had drifted into another folder, and the Connected label is the folder name. What works is a launcher that waits, with zero API calls, while a terminal rc serves the folder, then execs claude remote-control inside tmux (it needs a real terminal) through bash -lic so the login PATH and node load."
nextStep: "Watch the first real handover when the terminal closes. And if you run rc unattended, gate the start on the folder being free instead of trusting a restart loop."
tags: ["failure-modes", "infra", "execution"]
context: "infra"
---
