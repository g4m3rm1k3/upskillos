---
title: 10.3 — Independent capstone: build, test and defend your design
track: Frontend Developer Bootcamp — Portfolio, Deployment and Capstone
trackOrder: 50.1
runtime: none
reference: optional
---

Outcome: extend Reading Room into your own usable product without a supplied implementation. You have practiced every boundary needed: semantic forms, CSS tokens, collections, validation, persistence, requests, components and testing. The capstone combines them; no complete source is provided. Completion means evidence of independent decisions, not typing the references.

## Choose a bounded product brief

Before trying this step, make a prediction.

```predict
question: Does an evidence file alone prove that the independently built app works?
choice: No
choice: Yes
answer: No
explain: The implementation, tests and demonstration need review alongside the written evidence.
```

Use the example below or substitute an equally small frontend product, such as a recipe shortlist or an accessible event planner. Keep API access public or use a backend you control for secrets. Draw the information architecture (which information belongs where), the primary user flow and narrow/wide wireframes. Decide what is out of scope before coding.

```text file=capstone/brief.txt
User: A reader deciding which books to read next.
Problem: Search results and personal priorities are disconnected.
Scope: Search, save, tag, filter and review a shortlist.
Non-goals: Accounts, payments and secret-key APIs.
Acceptance: Save two API results, tag one, filter by that tag, reload and preserve data.
States: Idle, loading, empty, success, error and storage failure have visible recovery.
Design: Sketch two flows; choose one using a short usability session.
Architecture: API module, state owner, reusable controls and validated storage boundary.
Tests: Pure tag filter, corrupt saved tags, failed search and a browser save/reload flow.
Release: Typecheck, tests, build, preview all routes, keyboard and theme review.
```

```check
contains capstone/brief.txt "Acceptance:"
contains capstone/brief.txt "Tests:"
```

## Your turn: deliver a reviewed release

Implement tags on saved books, filtering by tag and persistence with validation for older saved books that have no tags. Add a keyboard-accessible tag form and a clear-filter action. Write behavior tests for no tag, multiple tags, duplicate tags and malformed persisted tags. Test API failures without live network dependency. Ask a volunteer to save and tag a book without coaching, record friction, revise and retest. Create capstone/evidence.txt with Observed:, Explanation:, Independent change:, Test:, Review:, and Release: sections. Include actual commands/results and known limitations. The evidence-file checks are a submission gate only: a mentor or peer must review the implementation and demonstration before calling the capstone passed.

```check
contains capstone/evidence.txt "Independent change:"
contains capstone/evidence.txt "Review:"
contains capstone/evidence.txt "Release:"
```

```hints
nudge: Add one complete vertical slice: tag one book, render it, then save it.
concept: Tags are validated data; filtered results should be derived, not a second saved list.
shape: Extend the model and storage parser first, then the form, filter control and regression tests. Keep the rubric beside you; no complete implementation is provided.
```

## Diagnose, explain and review

Deliberately load a pre-tag shelf from the prior lesson. It must migrate without losing books or crashing. Corrupt one tag value and test recovery. Demonstrate both themes, a narrow viewport, keyboard navigation, slow/failed API and a production preview. Defend one choice against an alternative. Next topics depend on the product: routing with back/forward and direct-link tests, React frameworks for SSR/SSG, server-state caching, accessible headless components, internationalization, authentication through a backend, and CI browser tests. Do not learn every library before shipping a small, well-tested app.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
