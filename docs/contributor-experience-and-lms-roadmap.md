# Contributor Experience and LMS Roadmap

Status: audit and implementation plan; first slice implemented  
Audited: 2026-09-26

## Progress: first slice (2026-09-26)

The nine items under "Recommended first implementation slice" are implemented:

| Item | Where |
|---|---|
| Agent rules with current paths and real commands | `AGENTS.md`. The old `docs/AGENT_WORKFLOW.md` moved to `docs/history/`, marked superseded |
| Generated project facts | `scripts/generate-project-facts.mjs` writes `src/data/projectFacts.json` and `docs/generated/project-inventory.md`, and updates marked README blocks. `npm run facts` regenerates, `npm run catalog:check` fails when stale; dev and build regenerate |
| Short `CONTRIBUTING.md` | Quick start, task chooser, check matrix, pull-request workflow. The old guide is `docs/history/CONTRIBUTING-legacy.md` |
| Starter guides | `docs/contributing/setup.md`, `first-change.md`, `repository-tour.md` |
| Contributor lessons | Level 7: removed the missing-contract reference, replaced rebase/force-push with merge, noted that main courses need no registration, corrected lab wiring |
| Labelled Home | Top bar at every width. The clock is hidden below 640 px, and link padding is tighter, so the bar fits at 360 px |
| Help modal links | Router links; the modal closes on navigation |
| About from facts | Counts and the course list come from `projectFacts.json`; domain headings stay hand-written. Sixteen courses gained a `label` in `meta.json` |
| CI | `pr-checks.yml` runs `catalog:check`, `docs:check` (links, paths and commands in the contributor docs) and a test that fails on plain internal `href`s in help, layout and About |

Also fixed: `src/scripts/build-lesson-titles.js` could not import the 221 lessons that import `.svg` diagrams, so those lessons showed titles made from their filenames. It now stubs image imports (`scripts/lib/asset-import-hooks.mjs`) and reports any lesson it still cannot load. The PR template no longer asks contributors to register lessons in a chapter `index.js`.

Corrections to this audit:

- **Mobile navigation:** `MobileBottomNav.jsx` is not mounted anywhere, so its hidden labels never reach phones. Phones only have the top bar, which is why Home is now labelled there at every width. The guided tour still targets anchors inside the unmounted bar.
- **Manifest counts:** the title/id disagreement had two causes. One was the import failure above. The other is real duplicate content, which the generated inventory lists.

Found and not yet fixed (listed under "Problems found" in `docs/generated/project-inventory.md`):

- **Shared ids across courses:** 14 lesson ids are shared between calculus and precalculus lessons.
- **Geometry lessons without their own id:** 12 geometry lessons have no lesson id, so the first `id:` in each file is a notebook's (`ScienceNotebook`). All 12 share one progress key.
- **Duplicate slugs:** five course-and-slug pairs appear in two chapters, and two Guttag Python lessons share one route.
- **Progress migration needed:** fixing any of these changes progress keys, so it needs a migration.

Also not done: the welcome pop-up blocks every top-bar control on phones until it is dismissed.

## Purpose

UpSkillOS has grown into a large learning application, but its contributor experience still describes several earlier versions of the repository. This document defines a path for making the project understandable to:

- a learner opening the app for the first time;
- the project owner learning to change the code manually;
- a first-time human contributor;
- an experienced contributor adding a course, lab, game, or platform feature;
- a coding agent that needs current, unambiguous repository rules.

The immediate problem is not a lack of documentation. It is that the same facts are copied into several places and have drifted apart. The long-term problem is that the application has course, lesson, lab, game, progress, and planning systems, but no shared learning-path model tying them together.

## Verified current state

The following findings were checked against the repository rather than inferred from the public documentation.

### The live content system is newer than the contributor documentation

The production course loader in `src/courses/courseLoader.js` auto-discovers this shape:

```text
src/courses/{course-id}/
  meta.json
  {N}-{chapter-slug}/
    {NNN}-{lesson-slug}.js
```

The current filesystem contains:

- 41 course folders with `meta.json`;
- 1,223 numbered JavaScript files in numbered chapter folders;
- 49 lab `meta.js` files;
- 15 entries in the game registry.

The generated manifests do not currently agree on a lesson total: `lessonTitles.json` has 992 keys and `lessonIds.json` has 1,209 keys. Therefore, a public lesson count should not be updated by hand until the inventory generator defines exactly what counts as a learner-visible lesson and reports exclusions.

### The public project description is stale

`README.md` and `src/pages/AboutPage.jsx` still advertise 31 courses and 38 labs. Both also contain hand-maintained inventories. The current registries contain more content, so these pages will continue to drift whenever a contributor adds content.

`AboutPage.jsx` duplicates course, lab, game, tool, feature, contributor, and roadmap data in a 1,400-line page. Much of that information already exists in course metadata, lab metadata, the game registry, `package.json`, and repository configuration.

### The main contribution guide teaches removed paths and workflows

`CONTRIBUTING.md` is more than 1,300 lines. Large parts still instruct contributors to edit or create files under `src/content/`, manually import lessons into chapter `index.js` files, and update `src/content/index.js`. The current course loader does not use that structure.

Examples of obsolete references include:

- `src/content/{course-folder}/`;
- `src/content/index.js` and `src/content/courses.js`;
- `src/content/videos/videoDatabase.js`;
- `src/content/videos/videoPlacementMap.js`;
- old chapter index registration steps.

The current validator in `scripts/validate-lesson-schema.mjs` correctly scans `src/courses` and derives routes from filenames. The guide and the validator therefore teach two different systems.

### The architecture guide is a historical document presented as current

`ARCHITECTURE.md` documents routes and files that no longer exist, including `LearningPathsPage.jsx`, `src/data/learningPaths.js`, `src/content/index.js`, and other former content-system files. It also describes manual registries that were replaced by `import.meta.glob` discovery.

The guide was last updated in April 2026. It is useful as design history, but unsafe as an implementation reference until rewritten around the live system.

### Agent instructions are hidden and actively misleading

There is no repository-root `AGENTS.md`. The nearest equivalent, `docs/AGENT_WORKFLOW.md`, says it is mandatory but is not automatically discoverable by most coding agents. It contains old paths and requires `node scripts/check-doc-drift.js`, a script that does not exist.

It also contains a fixed local path from another machine and says lesson files must be manually registered. An agent following it can make unnecessary edits or report a false verification result.

### There are too many competing sources of truth

Contributor guidance currently lives in at least these places:

- `README.md`;
- `CONTRIBUTING.md`;
- `ARCHITECTURE.md`;
- `docs/AGENT_WORKFLOW.md`;
- `docs/lesson-writing-standard.md`;
- `Schema.md`;
- `docs/Schema.md`;
- the 3,600-line `HelpModal.jsx`;
- the eight lessons in `src/labs/lesson-engine/content/contributor-series/`;
- the Lesson Builder and Viz Builder UI.

`Schema.md` and `docs/Schema.md` are currently byte-for-byte duplicates. Duplication without generation or validation guarantees future drift.

### The hidden contributor course is useful but too narrow

The contributor series teaches Markdown, Git, pull requests, reading code, teaching through code, React components, theming, and a first contribution. That is a good foundation.

However, it is buried inside the Lesson Engine lab and focuses heavily on adding Markdown lessons to that one lab. It does not teach the production course layout, auto-discovery rules, how to change a normal React page, how to add a test, which command to run for each kind of change, or how the current app is assembled.

Level 7 also references a missing `UPSKILLOS_CURRICULUM_CONTRACT.md` and recommends a rebase/force-push conflict workflow while `CONTRIBUTING.md` recommends merging upstream. New contributors should receive one safe default.

### Help, feedback, and contributor documentation are conflated

The top-bar `?` button is titled "Contributor Docs", but the modal opens on "Feedback & Bugs" and also contains app help and project About content. A learner seeking help and a contributor seeking repository guidance are different users with different goals.

Bug reports require a signed-in Firebase user. GitHub issue templates also exist, but the in-app flow does not clearly offer GitHub as the account-independent fallback. The public feedback board, private report data, and optional webhook behavior need a short privacy and triage explanation.

Several internal links in `HelpModal.jsx` use plain anchors such as `href="/lesson-builder"` and `href="/viz-builder"` even though the application uses `HashRouter`. These should use router links or navigation callbacks so a static deployment does not request a server path directly.

### Home exists, but its meaning is visually hidden

Desktop users can return to `/` by clicking the cube logo, and standard lesson pages have a small Home breadcrumb. The top bar does not show a labeled Home action. On mobile, the bottom navigation includes Home, but inactive item labels are visually hidden; a learner inside another area sees icons without persistent labels.

The route `/` is also conceptually ambiguous: on desktop it can display a codebase graph or the content home depending on a stored desktop mode. A learner should not have to know that the logo, a cube, or a right-click desktop menu leads back to the catalog.

### Learning-path pieces exist but are not a learning-path system

The repository contains:

- sequential lessons within courses;
- progress tracking;
- concept prerequisite graphs in some explorers;
- Compass plans and course-name matching;
- topic-group discovery on the home page;
- an old architecture reference to a removed learning-path page.

These are useful pieces, but there is no current platform entity for a curated path containing steps, prerequisites, outcomes, optional branches, progress, and a stable route.

## Design principles for the fix

1. **Generate facts; hand-write explanations.** Counts, inventories, routes, and file locations should come from code. Rationale, examples, and teaching guidance should be written by people.
2. **One canonical page per question.** Other surfaces should link to it or render generated excerpts.
3. **Progressive disclosure.** A first typo fix should not require reading a 57 KB guide. Advanced schema and architecture details should remain available without blocking the first contribution.
4. **Humans and agents share the same rules.** `AGENTS.md` may add operational constraints, but it must link to the same canonical task guides humans use.
5. **Stable IDs are separate from filenames and routes.** Renaming a title or slug must not erase progress or break a learning path.
6. **Recommendations are preferable to locks.** Learning paths should explain prerequisites and offer recovery links without preventing an experienced learner from skipping ahead.
7. **The UI should always answer three questions:** Where am I? How do I go back? What should I do next?

## Target documentation architecture

### Root documents

Keep the repository root small and predictable:

| File | Responsibility |
|---|---|
| `README.md` | What the project is, a generated scale summary, screenshots, run instructions, and links to the next document |
| `CONTRIBUTING.md` | A short contribution landing page and decision tree, ideally under 250 lines |
| `AGENTS.md` | Repository rules for coding agents, verification commands, protected/generated files, and the change-impact map |
| `ARCHITECTURE.md` | A current system map with links to focused architecture pages; historical material moves to decisions/history |
| `CODE_OF_CONDUCT.md` | Community behavior |
| `SECURITY.md` | Private vulnerability reporting and supported versions |

### Focused contributor guides

Create `docs/contributing/` with task-based pages:

```text
docs/contributing/
  README.md                 # choose a contribution type
  setup.md                  # Node/npm, clone, install, run, editor setup
  first-change.md           # one small verified change from branch to PR
  repository-tour.md        # App -> shell -> pages -> courses/labs/games
  lessons.md                # live course layout and builder workflow
  visualizations.md         # current VizFrame and course-local patterns
  ui-and-features.md        # React components, state, routing, accessibility
  labs-and-games.md         # auto-discovery metadata and route behavior
  tests-and-verification.md # command matrix by change type
  documentation.md          # ownership, generated facts, link checks
  pull-requests.md          # sync, scope, screenshots, review workflow
```

Move detailed lesson-quality policy into `docs/content/` and link to it from `lessons.md`. Avoid embedding the full lesson schema in the general contribution guide.

### A change-impact map

Create one machine-readable map, for example `docs/change-impact.yml`, that describes coupled changes:

```yaml
rules:
  - when: src/courses/*/meta.json
    verify:
      - npm run catalog:check
    generated:
      - docs/generated/project-inventory.md
      - src/data/projectFacts.json
  - when: src/labs/*/meta.js
    verify:
      - npm run catalog:check
  - when: src/components/viz/VizFrame.jsx
    docs:
      - docs/contributing/visualizations.md
  - when: package.json#scripts
    docs:
      - docs/contributing/tests-and-verification.md
```

`AGENTS.md`, the PR template, and contributor docs should all point to this map. A check script should validate it; contributors should not have to remember every coupled file.

### Generated project facts

Add `scripts/generate-project-facts.mjs` that reads the same registries/loaders used by the product and produces:

- `src/data/projectFacts.json` for the About page;
- `docs/generated/project-inventory.md` for GitHub readers;
- a validation report for lessons omitted from title or ID manifests.

At minimum, the output should define:

- visible course count and IDs;
- visible lesson count and the exact counting rule;
- lab count and IDs;
- game count and IDs;
- lesson files missing stable IDs or titles;
- duplicate stable IDs, routes, or catalog keys.

README badges or marked generated sections can then be updated by the generator. CI should fail if regenerated output differs from committed output.

## A manual coding path for the project owner and new contributors

The existing contributor series should be split conceptually into two paths.

### Open-source foundations

Keep the existing general lessons, with corrections:

1. Markdown and documentation;
2. Git as a save/history system;
3. branches and pull requests;
4. reading unfamiliar code;
5. explaining code to learners;
6. React component basics;
7. the design/theme system;
8. review and iteration.

### Contributing to UpSkillOS

Add a repository-specific, task-based path:

1. **Run the app and find the code for one visible label.** Change it and see hot reload.
2. **Trace a route.** Follow `App.jsx` to a page and identify the shared `AppShell`.
3. **Change a small component.** Add a labeled Home action or improve help copy.
4. **Add a meaningful test.** Change behavior, observe the failure, implement the fix, and rerun the focused test.
5. **Edit an existing production lesson.** Use the live `src/courses` naming rules and current validators.
6. **Add a lesson.** Demonstrate auto-discovery, stable IDs, generated manifests, and local navigation.
7. **Add or modify a lab.** Explain `meta.js`, lazy loading, dedicated routes, and catalog discovery.
8. **Document and submit the change.** Use the change-impact map, focused checks, and PR template.

Each lesson should end with a real repository task whose result is visible in the app. The owner can follow the same series locally without having to publish every practice branch.

## Navigation and help redesign

### Persistent orientation

Add a clearly labeled Home/Catalog action to the desktop top bar. Keep the logo link, but do not make the logo the only persistent affordance.

On mobile, show all bottom-navigation labels at all times. Active state can still use color and motion. Icons alone should not carry primary navigation meaning.

Every full-page course, lesson, lab, builder, and tool should use a shared location header or exit control with:

- Home or Catalog;
- the current area name;
- Back to the previous meaningful product location when available;
- a close action for desktop windows and overlays.

Use router state such as `returnTo` for contextual returns, with `/` as a safe fallback. Do not rely on browser history alone because deep links can be the first page visited.

### Separate help destinations

Replace the overloaded `?` destination with a small Help Center containing four obvious choices:

- **Using UpSkillOS** — navigation, progress, running code, builders, offline behavior;
- **Report a problem** — in-app form plus GitHub issue fallback;
- **Contribute** — contributor path, repository docs, Lesson Builder, Viz Builder;
- **About** — mission, current capabilities, license, contributors, roadmap.

The existing detailed content can be reused, but it should be split into components or data modules rather than remaining in one 3,600-line modal.

### Reporting expectations

The report UI should state:

- whether sign-in is required;
- what information is stored privately;
- what fields appear publicly;
- where a user can report without signing into the app;
- how to report a security issue privately.

Use React Router links for internal destinations in all help content.

## About page redesign

The About page should render facts from live data wherever possible.

Generate or import:

- course, lab, and game counts;
- course groupings from `meta.json` domains;
- lab and game highlights from registry metadata;
- app version from `package.json` or build metadata;
- current feature flags/capabilities from a small maintained feature registry.

Keep hand-written:

- the project story and mission;
- the learning philosophy;
- acknowledgements and contributor stories;
- roadmap themes;
- limitations stated honestly.

Contributor avatars and community links need an explicit owner and update process. If they remain manual, label the source file and add it to the change-impact map.

## LMS-oriented content model

Do not begin by forcing all 1,000+ lesson files into one new schema. First create a small normalized layer above the existing formats.

### Core entities

```text
Course
  id, title, description, domain, outcomes, moduleIds

Module
  id, courseId, title, order, lessonIds

Lesson
  id, moduleId, title, route, objectives, prerequisiteIds,
  estimatedMinutes, activityKinds, evidenceKinds

LearningPath
  id, title, audience, goal, estimatedHours, stepIds, version

PathStep
  id, resourceType, resourceId, required, prerequisiteStepIds,
  reason, completionRule, alternatives

Capability
  id, title, description, evidenceRule

ProgressEvidence
  learnerId/localProfileId, resourceId, capabilityId, status,
  attempt, assistance, score, completedAt, contentVersion
```

The normalized layer can be built from adapters:

- the current file/folder convention supplies course, module, lesson, order, and route;
- optional metadata files add objectives, prerequisites, time, and capabilities;
- existing lesson shapes continue to render through their current components;
- new paths reference stable resource IDs, never display titles or file paths.

### Learning-path MVP

Start with curated paths stored in a reviewed data file. A path should be a recommendation, not a second copy of lesson content.

Good first paths are:

- **Contribute to UpSkillOS** — tooling, Git, React, tests, first PR;
- **Start Coding from Zero** — CLI, Git, programming fundamentals, one project;
- **Math Foundations for Machine Learning** — algebra, functions, vectors, calculus, statistics, then ML foundations;
- **CNC Programmer Foundations** — coordinate systems, G-code, tooling, simulator practice;
- **Build Interactive Web Lessons** — HTML/CSS/JS, React basics, visualization, Lesson Builder.

Each path needs:

- a named audience and assumed starting point;
- a concrete end capability;
- a reason for every step;
- optional diagnostic or "I already know this" bypasses;
- prerequisite recovery links;
- progress calculated from stable lesson/lab evidence;
- an explicit version so path edits do not corrupt prior progress.

### Home-page information architecture

Evolve the home page toward these learner questions:

1. **Continue** — resume the last meaningful activity.
2. **Choose a goal** — select a curated learning path.
3. **Explore** — browse all courses, labs, games, and tools.
4. **Practice and review** — see due or recommended work when that evidence exists.
5. **Create and contribute** — open contributor learning and builders.

Topic filters remain valuable inside Explore. They should not be the only starting experience for a beginner who does not yet know which topic to choose.

## Implementation phases

### Phase 0 — Protect current work and establish a baseline

Deliverables:

- inventory the existing uncommitted work before touching shared files;
- define the visible lesson counting rule;
- add a repository facts report without changing product behavior;
- record current build, test, link, and typecheck status.

Acceptance criteria:

- counts are reproducible by one command;
- omitted or malformed content is listed rather than silently ignored;
- no documentation claims a number that cannot be reproduced.

### Phase 1 — Make contributor guidance truthful

Deliverables:

- add root `AGENTS.md`;
- replace `CONTRIBUTING.md` with a short task index;
- create the focused `docs/contributing/` guides;
- rewrite `ARCHITECTURE.md` around `src/courses/courseLoader.js`, lab discovery, game registry, and the actual routes;
- remove the duplicate schema file or generate one copy from the canonical source;
- correct and relink the in-app contributor series;
- pin and document the supported Node/npm versions.

Acceptance criteria:

- a clean-machine contributor can run the app using only the setup guide;
- a contributor can make a one-line UI change and a one-line lesson correction using current paths;
- no contributor guide references `src/content` unless explicitly labeled as history;
- every documented command exists and succeeds in the documented context.

### Phase 2 — Prevent documentation drift

Deliverables:

- implement `generate-project-facts.mjs` and `check-docs.mjs`;
- validate local Markdown links and literal repository paths;
- validate internal application routes used by help/about content;
- add `npm run docs:check` and `npm run catalog:check`;
- run both in `.github/workflows/pr-checks.yml`;
- update the PR template to use the change-impact map.

Acceptance criteria:

- changing course/lab/game inventory without regenerating facts fails CI with a useful message;
- references to missing local files fail CI;
- plain non-hash internal anchors in app help fail a focused test or lint rule;
- generated files say how to regenerate them.

### Phase 3 — Fix orientation, help, and About

Deliverables:

- add labeled Home/Catalog navigation on desktop;
- keep mobile navigation labels visible;
- add the shared location/exit control to full-page experiences;
- split Help, Feedback, Contribute, and About into clear destinations;
- replace raw internal anchors with router navigation;
- make About inventory data-driven;
- add navigation and report-flow integration tests.

Acceptance criteria:

- a first-time user can leave any course, lesson, lab, builder, or tool without guessing an icon;
- keyboard users can reach and understand every primary navigation control;
- all internal help links work in the production hash-router build;
- About counts match the generated inventory automatically.

### Phase 4 — Ship curated learning paths

Deliverables:

- define versioned `LearningPath` and `PathStep` types;
- add a small validated path registry;
- add `/paths` and `/paths/:pathId` routes;
- show Continue, path progress, prerequisites, optional steps, and recovery links;
- ship the contributor path first and use it to validate the model;
- connect course/lab completion evidence without converting all activity into one unsupported mastery score.

Acceptance criteria:

- each path step resolves to a real resource at build time;
- path edits are versioned;
- learners can skip optional/review steps;
- progress survives title and slug changes through stable IDs;
- completion language distinguishes visited, practiced, completed, and independently demonstrated where evidence permits.

### Phase 5 — Converge schemas gradually

Deliverables:

- inventory every lesson shape and renderer capability;
- define a versioned normalized lesson contract;
- build adapters for current formats;
- validate new content against a JSON Schema, TypeScript runtime schema, or equivalent executable contract;
- migrate one course at a time only when the adapter and round-trip tests preserve behavior;
- update Lesson Builder import/export around the normalized contract.

Acceptance criteria:

- new content has one documented default format;
- old content remains renderable during migration;
- every migration has semantic and visual regression coverage;
- schema documentation is generated from or tested against the executable schema.

## Recommended first implementation slice

The first slice should be deliberately small enough to review and large enough to remove immediate confusion:

1. create `AGENTS.md` with current paths and real commands;
2. add `scripts/generate-project-facts.mjs` and a generated inventory report;
3. replace the top of `CONTRIBUTING.md` with a current quick start and task chooser;
4. create `docs/contributing/setup.md`, `first-change.md`, and `repository-tour.md`;
5. correct the production course-layout instructions in the contributor lessons;
6. add a labeled desktop Home/Catalog action and persistent mobile labels;
7. fix the Help modal's internal router links;
8. render About counts from generated facts;
9. add checks for all of the above to PR CI.

This slice gives humans and agents a trustworthy entrance, fixes the most visible navigation problem, and creates the automation needed to keep later documentation work current. The LMS data model and broad schema migration should begin after that foundation is passing in CI.

## Risks to manage

- **Concurrent work:** shared files such as `AppShell.jsx`, `AboutPage.jsx`, and the root docs are likely agent hot spots. Audit `git status` and recent changes before every phase.
- **Counting ambiguity:** file count, manifest count, and learner-visible count are not currently identical. Define terms before publishing numbers.
- **Schema migration scope:** a mass rewrite of lessons would be difficult to review and likely to change behavior. Use adapters and course-sized migrations.
- **Progress compatibility:** routes and filenames have changed before. Learning paths must use stable IDs and explicit migrations.
- **Documentation volume:** moving old text into more files does not solve the problem unless ownership and automated checks are added.
- **Claims of mastery:** page completion and quiz attempts are useful evidence, but they should not be presented as proof of mastery without suitable independent tasks.

## Definition of success

A successful contributor experience lets a newcomer answer, within a few minutes:

- What is this project?
- How do I run it?
- Where is the feature or lesson I want to change?
- What is the smallest safe change I can make?
- Which checks apply to my change?
- Which documentation or generated output must change with it?
- How do I see the result and ask for help?

A successful learner experience lets a newcomer answer:

- Where am I?
- How do I return home?
- Where should I start for my goal?
- Why is this step in my path?
- What can I skip, review, or try next?
- What evidence of progress has the app actually recorded?

