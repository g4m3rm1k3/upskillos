---
title: 2.1 — Design starts with a person and a task
track: Frontend Developer Bootcamp — Design a Responsive Café Site
trackOrder: 50.02
runtime: none
reference: optional
---

Outcome: turn a vague request into a testable design brief. UX (user experience) concerns the whole task; UI (user interface) is the controls and information used to do it. Attractive pixels do not prove a task is easy.

## Write assumptions you can test

Before trying this step, make a prediction.

```predict
question: Does a polished screen prove that visitors can find opening hours?
choice: No
choice: Yes
answer: No
explain: Task observation provides evidence; visual polish alone does not.
```

A persona is a useful summary only when grounded in evidence. Here the audience is a hypothesis. Ask a volunteer what they last needed from a café website, what was hard, and what device they used. Do not lead with “Would you like my design?” Avoid collecting personal information you do not need. Record observations separately from assumptions. The flow below describes actions rather than screen decoration.

```text file=design/brief.txt
Audience: People choosing a quiet lunch spot.
Task: Find prices and opening hours before travelling.
Constraint: One hand on a small screen in sunlight.
Success: Find opening hours and a meal price without help.
Flow: Arrive > scan menu > check hours > visit.
```

```check
contains design/brief.txt "Success:"
```

## Your turn: define a usability observation

Add Test: Ask someone to find opening hours without hints. and Risk: (one reason that test may not represent all visitors). Keep the rest of the brief. Sketch two paper wireframes: a narrow single column and a wide layout. Put content blocks in reading order before color or icons.

```check
contains design/brief.txt "Test:"
contains design/brief.txt "Risk:"
```

```hints
nudge: Choose a task with an observable end.
concept: Record whether the participant completes it, hesitates, or chooses the wrong link.
shape: Add a neutral instruction and a limitation of your sample.
```

## Diagnose, explain and review

Hide opening hours on your sketch and ask the same task. Describe the extra action now required. Restore them near the Visit heading. Have someone think aloud without coaching; record where their actions differ from your expected flow. Checks cannot grade research validity or your sketch.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
