---
title: "Render Steps Fail Quietly"
slug: "2026-10-27-render-steps-fail-quietly"
date: "2026-10-27T15:01:00-0700"
type: "short-essay"
claim: "Three render steps in one afternoon produced clean-looking files that were wrong, and none of them raised an error. An ffmpeg glow (split, gblur, blend=screen) ran in YUV, so the screen blend hit the chroma planes and turned a navy background purple. Forcing format=gbrp before the blend fixed it. A Playwright CDP screencast delivered 1440x810 frames even with deviceScaleFactor set to 2, because only page.screenshot honors the emulated pixel ratio, and launching Chromium with --force-device-scale-factor=2 gave real 2880x1620 frames. Then Blender's default AgX view transform washed saturated emissive colors toward pastel, so a red warning edge rendered yellow until I switched to the Standard transform. Every gate that only checks that a file came out passes all three. So after each composite or capture step I now look at a contact sheet and assert one measured property, a sampled background pixel or the real frame size, before I spend time on the full render."
implication: "A render pipeline fails visually, so its checks have to be visual too: one measured pixel or dimension per stage catches what exit codes never will."
tags: ["failure-modes", "execution", "signal"]
context: "failure-modes"
---
