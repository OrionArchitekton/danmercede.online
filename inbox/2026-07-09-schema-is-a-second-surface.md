---
title: "Schema Is a Second Surface"
slug: "2026-07-09-schema-is-a-second-surface"
date: "2026-07-09T01:20:00-0700"
type: "short-essay"
claim: "On a prerendered SPA, a copy reframe has to land on two independent surfaces, not one. The visible React copy auto-bakes into the crawler HTML. The head JSON-LD and social meta do not: they are hand-maintained, and they are exactly what answer engines read without executing your JavaScript."
implication: "Reword the page and skip the structured data and you ship a split identity: humans read the new positioning, crawlers read the old one. When you reframe copy, grep the schema, not just the rendered page."
tags: ["failure-modes", "systems", "signal"]
context: "systems"
---

A reframe of a small site network looked done. Visible copy updated everywhere, tests green, CI passing. Then review caught a stale line no test asserted: the JSON-LD `WebPage.name` in the page head still carried the old title, while every rendered surface had moved on.

That is the trap of a prerendered SPA. Your React components render twice. Once into the DOM a human hydrates, and once into a static body baked into the HTML so crawlers see content without running your JavaScript. Edit the component and both move together. The document head is a different animal. The title, the Open Graph tags, the JSON-LD entity graph: all hand-maintained, and nothing about editing your visible copy touches them.

So a copy change has two surfaces. Miss the second one and you publish a contradiction. The page a person reads says one thing; the structured data a search engine or an answer engine ingests says another. Answer engines lean on that structured data precisely because it is explicit and needs no JavaScript to parse. A stale `name` field there is not a cosmetic miss. It is a split identity signal you are feeding, on purpose, to the machines that summarize you.

Three independent reviewers flagged the same line before it merged. The guard suite flagged none of it, because the identity test asserted the backlink was present, not that the title was current. Structural tests check shape. They do not check that your prose and your schema agree.

The fix was one line. The habit is cheaper than the fix: when you reframe copy, grep the schema too. Diff the head JSON-LD, not just the page. The rendered view is the surface you look at. The structured data is the surface the machines look at, and it is the one you will forget.
