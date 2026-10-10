---
title: 10.2 — Git review, deployment and an honest case study
track: Frontend Developer Bootcamp — Portfolio, Deployment and Capstone
trackOrder: 50.1
runtime: none
reference: optional
---

Outcome: deliver a reproducible static release and explain your choices. Deployment is copying the built artifact to a host, not exposing a development server. Git history lets you compare and restore source. Hosting configuration and account permissions vary; verify the provider’s current instructions before publishing.

## Prepare a release checklist

Before trying this step, make a prediction.

```predict
question: Will saved localhost data automatically appear on a published domain?
choice: No
choice: Yes
answer: No
explain: Browser storage is scoped to an origin, so the published site has separate data.
```

Use a branch for a small change: git switch -c improve-copy, edit, inspect git diff, run checks, stage chosen files and commit. Review the diff before merging. Never run destructive reset commands just to hide a conflict; identify each side and retest the resolution. To publish, use an account and repository you control, follow its static-site workflow, build with the lockfile and upload dist. For GitHub Pages, use a Pages workflow that uploads dist and grants only the permissions the deployment needs. No server secrets belong in this artifact.

```text file=release/checklist.txt
Build: npm ci, npm test, npm run typecheck, npm run build.
Artifact: dist contains static HTML, CSS and JavaScript.
Host: A static host with HTTPS and a repository subdirectory if needed.
Verify: Open every app, reload nested URLs, test themes, storage and an API search.
Rollback: Keep the previous successful artifact or redeploy its commit.
Privacy: Search queries go to Open Library; saved lists stay in this browser.
```

```check
contains release/checklist.txt "Rollback:"
```

## Your turn: write a case study that explains the work

Create portfolio/case-study.txt with Problem:, Audience:, Alternatives:, Decision:, Evidence:, and Next: lines. Choose one app and describe a design tradeoff, a measured or observed result, and an honest remaining limitation. Include a live link only after you have actually published and verified it. Screenshots should illustrate a decision rather than replace an explanation.

```check
contains portfolio/case-study.txt "Alternatives:"
contains portfolio/case-study.txt "Evidence:"
contains portfolio/case-study.txt "Next:"
```

```hints
nudge: Explain why the solution serves the audience.
concept: Evidence should be something observed or measured, not a claim of perfection.
shape: Use a real comparison and name a limitation you still intend to address.
```

## Diagnose, explain and review

Preview a deliberately broken relative asset path and inspect the failed request, then restore it. After deployment test from a fresh browser profile and a mobile device. Local storage is origin-specific, so localhost data will not magically appear on your published site. Simulate rollback locally by previewing a previous saved artifact; do not overwrite production merely for practice.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
