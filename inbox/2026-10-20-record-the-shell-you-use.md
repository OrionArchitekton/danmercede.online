---
title: "Record the Shell You Use"
slug: "2026-10-20-record-the-shell-you-use"
date: "2026-10-20T00:23:00-0700"
type: "short-essay"
claim: "A terminal recording runs in a shell that is not the one you work in, and the differences only show up in the video. I hit four of them on one guide episode. I wrapped the capture in bash -c 'cd repo && exec bash -i' and the prompt vanished, because a non-interactive bash unsets PS1 even when it arrives in the environment, so my recorder never saw a prompt and decided every command was still running. Exporting PS1 inside the wrapper fixed it. Then git and gh opened a pager in the pty and the capture sat waiting for a keypress, so I set GIT_PAGER, PAGER and GH_PAGER to cat. The gh spinner left braille characters on screen in the rendered frames, and GH_SPINNER_DISABLED=1 swaps it for plain progress text. And a scratch HOME made my global git hook print missing-helper warnings that my real setup never shows, because the hook finds its helpers through HOME. So every capture now starts from the same four lines: export the prompt, pagers to cat, spinner off, real HOME."
implication: "Treat the recording environment like a deploy target and write its setup down once. Otherwise each episode finds the same breakage on camera, one take at a time."
tags: ["failure-modes", "execution"]
context: "failure-modes"
---
