---
title: "Fit Gates Measure Ink"
slug: "2026-09-21-fit-gates-measure-ink"
date: "2026-09-21T14:41:00-0700"
type: "short-essay"
claim: "A browser layout gate that asks a DOM range for the boxes inside an element is measuring the wrong thing. range.selectNodeContents(el).getClientRects() returns every line of text, and it also returns the full block box of each element inside the range. A 230px paragraph holding a 120px line adds a 230px rectangle with no ink in it. I hit this on an agent-built fit test for a printed wheel diagram. The gate reported text crossing a segment boundary. A per-line dump showed every line sat between 4.5 and 55.5 degrees into a 60 degree segment, well inside the 2 degree margin. That false alarm is the dangerous kind: it pushes you to shrink a correct layout, or to loosen the gate until it measures nothing. Measure ink instead. Walk the text nodes with a TreeWalker, call getClientRects() per text node, and add icons as their own boxes. Then prove the repaired gate still binds by moving one label somewhere it must fail."
implication: "Before trusting a layout gate, check what it counts as ink. A gate that measures containers fails for reasons no reader would ever see, and the fix it demands makes the real layout worse."
tags: ["failure-modes", "signal", "execution"]
context: "failure-modes"
---
