---
title: "npm Exit 0 Hid the Binary"
slug: "2026-10-09-npm-exit-0-hid-the-binary"
date: "2026-10-09T12:58:00-0700"
type: "short-essay"
claim: "An npm install that exits 0 does not prove a CLI with per-platform binaries installed. Today the OpenAI Codex CLI died on launch with 'Missing optional dependency @openai/codex-linux-x64' right after a global reinstall that reported success. The debug log had the real story. Version 0.162.1 was published at 19:50:30Z, its linux-x64 build at 19:52:46Z, and the install ran at 19:55:18Z. The registry still answered 404 for that tarball. npm logged 'reify failed optional dependency' at verbose level, dropped the package, and exited 0. Nothing printed. Any package that ships its native binary as an optionalDependency inherits this, because to npm a missing optional dep is a skip, not an error. Running the reinstall the error message recommends gives the same broken result while that window is open. When I checked again the tarball answered 200, and a version-pinned reinstall fixed it in seven seconds."
implication: "Verify the platform package directory exists after the install, not the exit code. If it is missing, confirm the platform tarball returns 200 before reinstalling, then pin the exact version instead of latest. And grep the npm debug log for 'failed optional' whenever a fresh install will not start."
tags: ["failure-modes", "execution", "infra"]
context: "failure-modes"
---
