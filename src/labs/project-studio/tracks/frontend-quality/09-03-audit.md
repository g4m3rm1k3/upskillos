---
title: 9.3 — Accessibility, performance and security as design work
track: Frontend Developer Bootcamp — TypeScript, Testing and Accessibility
trackOrder: 50.09
runtime: none
---

Outcome: review real user tasks rather than treating a score as certification. Accessibility includes perception, operation, comprehension and compatibility. Performance includes loading, responsiveness and layout stability. Security includes the trust boundary between external data and rendered content.

### The story so far

The apps now have working behavior and automated checks. A quality review asks whether that behavior remains usable under different abilities, devices, inputs and failure conditions.

This is design work because the results can change structure, wording, emphasis and interaction. It is engineering work because you need reproducible conditions and evidence. Neither a beautiful screenshot nor a green test suite answers the whole question.

## Make the review reproducible

### Start from a task, then vary the conditions

“Save one book and find it after reload” is a concrete task. Try it with a keyboard, enlarged text, a narrow viewport, a screen reader if available, a slow network and blocked storage. Each variation exposes a different assumption.

An accessibility checklist is like a preflight checklist: it reduces predictable omissions but does not fly the plane. Automated tooling can identify some violations, such as certain missing names or contrast problems. It cannot decide whether your error message is understandable or whether the user’s goal is sensible.

### A practical investigation order

First confirm the person can reach and operate the controls. Then check that names, instructions and feedback explain what will happen. Then inspect whether layout, contrast, motion or performance interfere. This is not a strict hierarchy of importance; it is a useful way to avoid polishing a control that cannot be operated at all.

Record browser, viewport, theme, input and reproduction steps with a finding. “The card is broken” is less useful than “At 320 CSS pixels, this uninterrupted title extends beyond the card in the light theme.”

Before trying this step, make a prediction.

```predict
question: Does an automated accessibility score establish that every user can complete a task?
choice: No
choice: Yes
answer: No
explain: Automated scans cover limited rules; keyboard, assistive technology and user review remain necessary.
```

Use this review sheet with actual observations, not just checkmarks. Use browser accessibility tools and, if available, a screen reader. Review labels and heading order, visible focus, error recovery and touch targets. Measure production assets: development includes extra tooling. Inspect image sizes, unused packages and network waterfalls before adding memoization or a new dependency.

```text file=quality/review.txt
Task: Save one catalog book and find it after reload.
Keyboard: Tab, Shift+Tab, Enter and Space reach and activate every control.
Zoom: At 200 percent, no content or actions disappear.
Contrast: Measure text, controls and focus in both themes.
Screen reader: Headings, labels, status and button names describe the task.
Network: Offline, delayed, empty and failed responses explain recovery.
Performance: Measure a production build on a throttled mobile profile.
Security: Untrusted text is never inserted as HTML; no secrets in the bundle.
```

### Performance is an observed experience

A large download can delay first content. Main-thread work can delay response to input. Unreserved content dimensions can cause layout movement. These are different problems and require different evidence. A development server’s timing is not a production measurement because it includes extra transformation and development behavior.

Inspect the production network waterfall and browser performance tools before guessing at the bottleneck. Image sizing, unused libraries and unnecessary work often matter more than adding memoization everywhere. Compare under the same throttling and device conditions after a change.

### Security has visible design consequences

Treat user text and external data as untrusted. Render text as text. Keep credentials out of frontend bundles. Explain which data leaves the device. Do not offer fake offline assurances if the next action requires a network request.

**Rule of thumb:** a quality claim should name its scope and evidence. “Keyboard flow tested in this browser” is useful. “Fully accessible, secure and fast” is an unbounded claim that a small scan cannot support.

A finding is not complete until retested. Preserve the original conditions and input, make the smallest coherent fix, repeat the test and look for regressions nearby. If you cannot test a condition, record it as unverified rather than marking it passed.

```check
contains quality/review.txt "Keyboard:"
contains quality/review.txt "Security:"
```

## Your turn: record a measured fix

Append Finding:, Change:, Retest: and Remaining: lines. Report one actual issue found in your apps, change it, and record the retest steps and remaining limitation. Examples: lost focus after Remove, an unclear error message, a large image, or a long title overflowing. Do not claim “accessible” from one automated scan.

```check
contains quality/review.txt "Finding:"
contains quality/review.txt "Retest:"
contains quality/review.txt "Remaining:"
```

```hints
nudge: Choose an issue you can reproduce now.
concept: A fix needs evidence from the same task and conditions.
shape: Record the defect, the change, the retest and what you still have not checked.
```

## Diagnose, explain and review

Disable CSS briefly: is the document’s reading order still sensible? Restore it. Enter HTML-like book titles and confirm they remain text. Use Network throttling and observe whether layout jumps when content arrives. Reserve image space, compress assets and defer nonessential code. Do not use dangerouslySetInnerHTML for API text. Contrast is one criterion; automated scanners cannot establish the whole experience.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Choose one failure and write it as an observation, not an interpretation: what happened, under which conditions, and what the person could no longer do. Then propose two possible causes and an experiment that distinguishes them. State what remains unknown after the experiment.
