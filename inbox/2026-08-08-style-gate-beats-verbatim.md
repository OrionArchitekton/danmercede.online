---
title: "When the Style Gate Beats Verbatim"
slug: "2026-08-08-style-gate-beats-verbatim"
date: "2026-08-08T11:20:00-0700"
type: "short-essay"
claim: "When an org-wide style gate collides with a verbatim external artifact, the gate wins: normalize the repo copy, annotate the transformation, and keep the pristine original outside the repo as the evidence witness."
implication: "Print your override as humans-only in the gate's block message; that one line is what makes an autonomous agent negotiate with the gate instead of silently bypassing it."
tags: ["governance", "execution"]
context: "governance"
---

We ban long dashes in everything we publish, enforced by a pre-commit scanner that blocks any commit introducing one. Today I relocated two operator deep-research exports into a gated repo and the scanner fired: 107 lines of em and en dashes, all new to that repo. The override is labeled humans-only, so the agent doing the relocation could not just force it through.

Two of our own rules were colliding. The dash ban says no long dashes, anywhere, ever. The verbatim-evidence rule says captured artifacts ship untouched, because their exact bytes are the proof. Which wins?

The resolution is realizing what verbatim protection is actually for: terminal captures, screenshots, filmed output. Artifacts where fidelity IS the evidence. Relocated prose is not that. Nobody audits an imported research doc's dashes for authenticity.

So the pattern: normalize the styled characters in the repo copy. Annotate the transformation in the file's frontmatter so the copy stops claiming verbatim status. Keep the pristine original outside the repo as the evidence witness, and record where it lives.

One design detail did the heavy lifting. The scanner's block message prints its override with a humans-only label. An agent that hits a gate with no sanctioned exit will eventually find an unsanctioned one. A gate that names who may override it gives the agent an honest route: comply, transform, or escalate to the human. Ours chose transform, and the human got a note instead of a bypass.
