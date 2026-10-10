---
title: 9.3 — Accessibility, performance and security as design work
track: Frontend Developer Bootcamp — TypeScript, Testing and Accessibility
trackOrder: 50.09
runtime: none
reference: optional
---

Outcome: review real user tasks rather than treating a score as certification. Accessibility includes perception, operation, comprehension and compatibility. Performance includes loading, responsiveness and layout stability. Security includes the trust boundary between external data and rendered content.

## Make the review reproducible

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
