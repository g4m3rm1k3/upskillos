---
title: Transfer the engineering beyond this game
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

Completing typed fragments gives experience with a substantial program. Independent design choices require another kind of evidence. These return-later exercises are options, not gates on the course.

## Explain the system without reading method bodies

Draw the dependency direction among Game, Core, Checks, and Raylib. Trace one Space press from the input queue to Control, legality, hazard creation, collision, reward, message, and rendering. Trace a garage purchase through persistence and reopening. Trace one Q update from observation to reward interval to independent snapshot.

For each boundary, identify who owns mutable state and who is allowed to change it. Explain why rendering twice must not advance the race twice, why replacing a dictionary may still share row arrays, and why a visible menu does not prove pause. If you cannot explain a step, revisit its focused lesson and trace concrete values before adding another feature.

The transferable skill is choosing and defending representations and contracts. Java has different syntax and library conventions, but value/reference reasoning, invariants, interfaces, collections, tests, persistence boundaries, and algorithm cost still apply. Learning this game does not mean every unfamiliar framework or software domain is already understood.

## Compare designs against requirements

Consider adding a second track. Keeping static Track methods is simple for one circuit, but it forces global replacement when two races need different geometry. An instance-based track contract injected into Race and World would let both share one selected track. The extra abstraction becomes justified by a concrete new requirement.

Consider network multiplayer. Sending raw mutable Kart objects would expose implementation state and permit clients to invent hits. An authoritative server, validated commands, sequence numbers, latency handling, and state reconciliation introduce new requirements. Do not label the existing deterministic local loop network-ready merely because it uses fixed ticks.

Consider a much larger roster. Pairwise contacts grow quadratically, while target sorting grows with candidate count. A spatial grid can reduce local searches, but adds update bookkeeping and boundary cases. Choose it after measurement and distribution assumptions, not solely from asymptotic vocabulary.

These comparisons show what experienced engineers do: name the constraint, compare alternatives, identify failure modes, and preserve evidence when changing the design. This course is a foundation for that practice, not a claim to compress every domain's decade of experience into one project.

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Choose one independent change: a new legal equipment action, a new garage pricing rule, or a second track representation. Write the observable requirement, identify affected boundaries, add a test that rejects a plausible broken implementation, and make a focused change. Keep a working branch and return to it later if you get stuck. Do not ask a code generator to supply the solution; use the execution traces and library documentation you now know how to interpret.


## Challenge — independent diagnostic checkpoint {#diagnostic-checkpoint}

This is optional, may be deferred, and never prevents access to later material. Use a scratch branch; no required implementation depends on these changes. Try without reading the earlier answer first, then use the hints and revisit the underlying lesson.

1. A speed average displays a whole number even though the variable storing it is float. Write a reproduction and explain the operand types before editing. Hint: inspect the division expression before inspecting the destination declaration.
2. A second key press disappears on a display frame that has no simulation tick. Identify the ownership/lifetime mistake and the layer that should retain the event. Hint: distinguish held state from a queued transition.
3. A face disappears from one side while other faces remain lit. Propose two different causes and a controlled experiment that distinguishes them. Hint: brightness, orientation, and camera position are separate stages.
4. A saved garage parses successfully but equips an unowned package. Specify the missing validation and a regression test. Hint: syntactic validity is not a domain invariant.
5. Training reward rises while completion rate falls. Explain an implementation bug you would first rule out and an objective problem you would investigate afterward. Hint: arithmetic tests and product metrics answer different questions.

For each attempt, keep the starting evidence, your hypothesis, the smallest experiment, the repair, and the regression result. Being able to choose the right investigation on a new problem is stronger evidence than remembering which file contained the example. A failed attempt identifies what to revisit; it is not a grade that locks the course.
