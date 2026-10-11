---
title: 10.2 — Git review, deployment and an honest case study
track: Frontend Developer Bootcamp — Portfolio, Deployment and Capstone
trackOrder: 50.1
runtime: none
---

Outcome: deliver a reproducible static release and explain your choices. Deployment is copying the built artifact to a host, not exposing a development server. Git history lets you compare and restore source. Hosting configuration and account permissions vary; verify the provider’s current instructions before publishing.

### The story so far

You have a tested production artifact. Releasing it adds responsibilities beyond making code run locally: reproduce the build, inspect the change, verify the actual hosted result and know how to recover.

Your portfolio case study should communicate those decisions. Employers and collaborators need to understand what you chose, why it served the user, how you tested it and what remains limited—not just which libraries appear in a badge list.

## Prepare a release checklist

### A release has both a forward and a recovery path

```text
reviewed source + lockfile → reproducible checks/build → artifact → deploy → verify
                                                previous verified artifact ← rollback
```

Think of a release as opening a newly arranged shop. Checking the plans is useful, but you also walk through the actual entrance, try the controls and ensure the signs point somewhere. A rollback plan is the ability to restore a known usable arrangement if the new one fails.

The analogy does not mean publishing is casual. Use an account and destination you control, inspect what will become public, and follow the host’s current deployment instructions. A static artifact cannot protect an embedded secret by hiding its filename.

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

### Commit, push and deploy remain separate concepts

A branch gives a name to a line of work. A commit records a reviewed snapshot locally. A push sends commits to a configured remote. Deployment publishes a runnable artifact. Automation can connect those events, but you should know which connection the repository actually configures.

When a merge conflict appears, Git is asking you to resolve overlapping histories. Read the intended behavior from both sides, edit a coherent combined result and retest it. Choosing “ours” or “theirs” indiscriminately can remove a needed change without making the code obviously invalid.

### A useful case study follows a chain of evidence

Problem → audience and constraint → alternatives considered → decision → implementation → observed result → limitation. For the café, the chain might begin with finding prices on a small screen and end with semantic lists that reflow under zoom, plus a note that wider user testing is still needed.

Avoid presenting fictional research as real. A planned usability session belongs under next steps until it happened. An author reference file shows the structure of evidence, not evidence you personally collected.

**Rule of thumb:** publish claims you can demonstrate. “Built a request race test that rejects stale responses” is concrete. “Production-grade full-stack expert” is neither established by this static portfolio nor useful to a reviewer.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain how you would verify a hosted build without relying on your existing localhost storage or cached files. Then write one honest case-study sentence describing a technical choice and its observed benefit, and another describing a limitation that still needs investigation.
