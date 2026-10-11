---
title: 10.2b — A reproducible release gate
track: Frontend Developer Bootcamp — Portfolio, Deployment and Capstone
trackOrder: 50.1
runtime: none
---

Outcome: make a clean machine reproduce the checks and preserve the exact built artifact; separate verification from publishing.

### The story so far

You can build locally, but your machine has installed packages, browser binaries and possibly forgotten edits. A release needs a recipe another machine can follow. Continuous integration executes that recipe after a change; continuous deployment additionally publishes a result. We implement the former here, and make the publishing decision explicit.

## Verify from the lockfile on a clean runner

Create this file in the learner portfolio repository, not in the UpSkillOS repository. The workflow runs for a pull request, a push to main or a manual dispatch. If your default branch is different, change the branch filter. A job is a sequence of steps on a fresh runner; a failed command prevents later ordinary steps from proceeding.

Commit package.json and package-lock.json together. `npm install` updates the lock when you intentionally change dependencies; `npm ci` requires the lock to agree with the manifest and recreates installed dependencies. Pinning direct versions alone does not pin every transitive package. Keep Node consistent across development and CI, then update deliberately when support or security requires it.

The browser install provisions Chromium and Linux system libraries. The tests use fixtures, so a catalog outage cannot masquerade as an application regression. Build runs after checks, and the artifact step stores dist from this exact revision. The workflow itself does not publish a site.

```predict
question: Does uploading a verified dist artifact automatically deploy it to a public site?
choice: No
choice: Yes
answer: No
explain: Artifact storage and hosting deployment are separate actions.
```

Think of a release as a labeled parcel: the revision identifies the recipe, checks record inspections, and dist contains the parcel's actual contents. The analogy fails if you rebuild later with different inputs and pretend it is the same parcel. Preserve the artifact or reproduce it from the same lock and environment.

Read the current official action documentation before major upgrades. These readable major tags are examples; teams needing immutable action dependencies pin verified commit SHAs and use automated update review. Never copy untrusted workflow steps that print secrets or grant unrelated permissions.

```yaml file=.github/workflows/verify.yml
name: Verify portfolio
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24.21.0
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run typecheck
      - run: npm test
      - run: npm run test:browser
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: portfolio-dist
          path: dist
          if-no-files-found: error
```

```check
contains .github/workflows/verify.yml "npm ci"
contains .github/workflows/verify.yml "npm run test:browser"
contains .github/workflows/verify.yml "path: dist"
```

## Rehearse the handoff and rollback

Before pushing your own repository, run the same commands locally. On GitHub inspect the workflow for that revision and download its artifact. A local command log is not a claim that GitHub has run the workflow. If CI fails, identify whether the failure is installation, type checking, application behavior or packaging.

For GitHub Pages, choose Actions as the repository's publishing source, upload dist with upload-pages-artifact, and use a separate deploy job with needs pointing to the successful build job. The deploy job needs pages:write, id-token:write and a github-pages environment. Restrict deployment to the intended branch and use environment review if your team requires it. Follow [GitHub's current Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) rather than treating ordinary upload-artifact as a Pages deployment.

After publishing, open the actual hosted URL, every app entry and a direct #/search link. Check network errors, narrow layouts, saved state and theme. Rollback means restoring a known working release and verifying it, not merely clicking a button. Data stored in a reader's browser does not roll back when JavaScript files do, so schema changes require backward compatibility or a planned migration.

This runbook makes the remaining human decision inspectable. Replace placeholders with actual evidence only after doing the work.

```text file=release/runbook.txt
Revision: Record the source commit and lockfile used for this build.
Verify: npm ci; npm run typecheck; npm test; npm run test:browser; npm run build.
Artifact: Record the successful workflow run and artifact name.
Publish: Choose host, target branch, base path and reviewer before deployment.
Smoke: Open each hosted app and reload the direct search route; inspect console and network.
Rollback: Redeploy the previous verified artifact; recheck saved-data compatibility.
Known limits: Record unresolved manual accessibility and usability findings.
```

```check
contains release/runbook.txt "Rollback:"
```

## Your turn: define a release-blocking failure

Add Block release: followed by a concrete user-visible failure, such as saved books disappearing after reload, to the runbook. Name the check that would catch it. Run the complete local verification sequence; do not publish until its failures and the manual review are resolved.

```check
contains release/runbook.txt "Block release:"
run "npm run typecheck"
run "npm test"
run "npm run test:browser" timeout=120
run "npm run build" timeout=120
```

```hints
nudge: Pick a broken user journey, not a vague quality adjective.
concept: A gate needs both an observable failure and a detecting check.
shape: Name the save/reload browser test and require it to pass.
```

## Diagnose, explain and review

In a disposable branch, change a test expectation so verification fails. Confirm that CI does not create a fresh successful artifact, then restore it. Keep local evidence distinct from a remote workflow run: this lesson authors the workflow but does not impersonate a hosted execution. Explain why build success alone does not establish the usability of the release.

### Explain it without the reference

Explain the input, state transition and observable output of your change. Predict a failure before introducing it, record what actually happened, restore the code and rerun the check. Write the observed result, your explanation and one case these checks do not establish in your learning journal.
