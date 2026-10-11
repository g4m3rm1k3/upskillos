---
title: 2.1 — Design starts with a person and a task
track: Frontend Developer Bootcamp — Design a Responsive Café Site
trackOrder: 50.02
runtime: none
---

Outcome: turn a vague request into a testable design brief. UX (user experience) concerns the whole task; UI (user interface) is the controls and information used to do it. Attractive pixels do not prove a task is easy.

### The story so far

The café page already contains useful information. Before decorating it, we need a reason for the order, emphasis and interaction choices. Design is the process of choosing how a person can achieve a goal under real constraints.

A requirement such as “make it modern” cannot tell you whether a result works. “A first-time visitor can find opening hours and a meal price on a phone” gives you something to observe. The new file records assumptions, not established facts about every customer.

## Write assumptions you can test

### A brief is a testable hypothesis

A useful analogy is a map for a journey. The visitor has a starting point, a destination and constraints such as time or mobility. Drawing an elegant road that does not reach the destination is not successful navigation.

For our café, the destination is a confident visit decision. The person may need prices, hours and access information before atmosphere. The analogy has a limit: people do not all take the same route. Your flow predicts a common path; usability sessions reveal paths you missed.

### Separate four kinds of statement

| Statement | What it really is | Appropriate next step |
|---|---|---|
| “Visitors always use phones.” | Unverified assumption | Ask about recent behavior or inspect trustworthy usage evidence. |
| “This participant used a phone last time.” | An observation from one person | Record the limited scope. |
| “Put opening hours near Visit.” | A design proposal | Test whether people find them. |
| “They found the hours without help.” | Task evidence | Repeat with other users and conditions. |

Do not silently promote a proposal into evidence. That is how a team becomes very certain about an interface nobody has actually tested.

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

### Move from content to wireframe

First list the questions the page must answer: What is this place? What can I buy? What will it cost? When can I come? Can I enter? Group related answers. This grouping is **information architecture**: deciding how information is organized and named.

A wireframe is a deliberately rough arrangement of those groups. Draw labeled rectangles, not polished gradients. Sketching two alternatives makes comparison possible: hours in the header versus hours under Visit, for example. Explain the benefit and cost of each before choosing.

**Rule of thumb:** test the highest-risk assumption with the cheapest useful representation. Paper can test ordering and wording; it cannot establish keyboard behavior, responsive reflow or browser performance. Use a working page when the question depends on those properties.

In a usability session, say “Find out whether you can visit at 3pm,” not “Click Visit to see the hours.” The second instruction supplies the solution. Note hesitation, wrong turns and requests for help. Silence may feel awkward; filling it with directions hides the exact difficulty you need to find.

Avoid inventing precision. One successful participant is encouraging evidence, not a population success rate. Record who was represented and who was not, then name the next uncertainty.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Take “The site should feel friendly” and translate it into a specific content or interaction choice plus an observation that could challenge that choice. Explain what a paper sketch can test and what requires a real browser. Your answer should distinguish preference, hypothesis and evidence.
