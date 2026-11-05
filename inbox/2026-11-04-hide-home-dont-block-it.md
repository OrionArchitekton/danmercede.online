---
title: "Hide Home, Don't Block It"
slug: "2026-11-04-hide-home-dont-block-it"
date: "2026-11-04T22:41:00-0800"
type: "short-essay"
claim: "We moved CI off GitHub-hosted minutes onto self-hosted runners, hardened the systemd units with ProtectHome=yes, and suites that pass on GitHub's machines started failing with PermissionError: [Errno 13] Permission denied on /home paths. The tests weren't reading our home folder on purpose. They look for a sibling checkout, call Path.exists(), and skip when it isn't there, which is what happens on a hosted runner where that path doesn't exist. But ProtectHome=yes makes /home inaccessible, not empty, and on Python 3.11 pathlib's exists() only treats 'not found' as False, so permission denied comes back as an exception and the test crashes instead of skipping. So the fix was one word: ProtectHome=tmpfs. Jobs still can't read anything under /home, but now it's an empty read-only mount, a missing path reads as missing, and the suites behave the way they do on hosted runners. If your self-hosted CI fails only on paths it should never see, check whether you blocked them or hid them."
implication: "Hardening that turns 'not found' into 'denied' changes how programs behave, not just what they can reach. When you sandbox a runner, match what the code expects on a clean machine: absent, not forbidden."
tags: ["failure-modes", "infra", "security"]
context: "infra"
---
