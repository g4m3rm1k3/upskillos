# Frontend Developer Bootcamp

Open **Project Studio → Series → Frontend Developer Bootcamp — From Zero to Portfolio**. Begin with **First Page and Developer Tools**. Every chapter shares one learner-selected portfolio folder; each app has its own subfolder. The browser edition exposes the reading path; local file editing, terminal commands and page checks require the desktop app or a separate editor and terminal.

## Audience and outcomes

No programming prerequisite. Start with files, HTML and browser tools, then build useful apps with increasingly demanding design and engineering requirements. The authored path reaches a static production portfolio and an independently implemented capstone. It does not promise employment, cover every design discipline, or claim that reference solutions certify independent mastery.

| Chapter | Project and observable outcome |
|---|---|
| First Page and Developer Tools | Create semantic HTML; serve it locally; inspect requests; understand Save, Commit and Publish. |
| Design a Responsive Café Site | Identify audience and task, sketch flows, test a usability hypothesis, build a fluid layout, and define readable light/dark tokens, and critique typography, imagery, hierarchy and action labels in a separate design workshop. |
| JavaScript and a Budget Calculator | Learn values, conditions, functions and modules; validate inputs; connect accessible forms and events; persist a theme preference. |
| A Task Planner That Remembers | Transform arrays and objects without mutation; render data safely; preserve keyboard focus; recover from malformed or unavailable storage. |
| Book Finder and HTTP APIs | Use promises, HTTP status, JSON validation and request cancellation; implement loading, empty, error and success states; reject stale responses. |
| Bootstrap Service Dashboard | Use the grid and components deliberately; connect a disclosure to its accessible state; inspect library theme conventions. |
| React Reading List | Build components and controlled forms; understand identity, derived state, Effects and cleanup; reuse the API boundary and persist a shelf. |
| Tailwind and a Component System | Use the v4 Vite integration, CSS-first tokens, reusable button contracts and light/dark variants. |
| TypeScript, Testing and Accessibility | Model a discriminated union; write meaningful regression tests; review keyboard access, contrast, performance, security and recovery. |
| Production React and Browser Testing | Migrate the complete React tree to strict TypeScript, implement accessible routed navigation, and execute browser regressions for persistence, focus, retry and recovery. |
| Portfolio, Deployment and Capstone | Build every app, preview nested URLs, automate clean-install verification and artifact creation, prepare a release and rollback, write a case study, independently implement and review a tagged reading product. |

The inventory is generated; do not maintain lesson counts here. Lessons are discovered from `src/labs/project-studio/tracks/frontend-*/`. Navigation and prerequisite profiles live in `series.js` and `learningProfile.js`.

## Teaching and assessment

The teaching approach takes its reference from Q-Arcade's [Update, by Hand](../src/labs/project-studio/tracks/qarcade-corridor/01-03-the-update-by-hand.md), [A Function with Knobs](../src/labs/project-studio/tracks/qarcade-networks/04-01-a-function-with-knobs.md), and setup explanations. The aim is causal understanding, not a longer typing checklist. The frontend lessons additionally make analogy limits, heuristic exceptions, trust boundaries and evidence limits explicit.

Every lesson rebuilds the story so far and ends with a closed-reference explanation task. Guided steps explain the new vocabulary and syntax, why a change is needed, what its inputs and outputs mean, and the failure an alternative would create. Worked arithmetic, state tables and request/event timelines keep the causal chain inspectable. Rules of thumb are defaults with context, not universal slogans. Analogies name both what transfers and where the comparison stops being accurate.

Examples include the exact content-box/border-box arithmetic, the progression from text input to a numeric model and rendered result, shallow-copy identity, JSON parsing versus validation, intent order versus response order, React render snapshots and effect lifetimes, and source versus production-artifact verification. Concrete execution predictions include plausible misconception-based distractors and executable verifiers. Conceptual recall questions complement them; they do not substitute for behavior checks.

When extending this course, preserve that sequence: felt problem → small model → concrete trace → named syntax → guided implementation → explained check → independent variation → deliberate failure and recovery → teach-back. Do not add a library until the earlier handmade implementation makes its responsibility understandable. Do not judge instructional quality by word counts or passing source-pattern tests; observe a beginner following the lesson and revise from their questions.

Each lesson includes a guided example, an independent task with progressive hints, and a diagnostic experiment with observation/explanation/retest evidence. Guided code files are visible by default, alongside their explanations. Small worked React examples introduce syntax before the complete app files; only independent tasks withhold solutions. Exercises have author answers for reconstruction; the final capstone intentionally has no supplied application implementation. Its reference evidence file illustrates the submission shape, not a completed capstone.

Checks distinguish source/document presence from behavior. Browser checks operate on actual learner pages, Node checks test pure logic, and the compiler/build exercise toolchain boundaries. Document checks cannot establish research quality, design judgment or accessibility. Manual review includes narrow layouts, zoom, focus, theme contrast, malformed saved data and failed requests. The learner must retain observed results, an explanation and an independent change.

The capstone requires tags, derived filtering, storage migration, input validation, tests and usability revision. A peer or mentor must inspect the implementation and demonstration; passing the evidence-file checks alone is not completion.

## Toolchain and external dependencies

Learner manifests pin Vite 8.3.4, React/React DOM 19.3.0, Bootstrap 5.3.8, Tailwind and its Vite plugin 4.3.3, TypeScript 7.0.2, React Router 8.4.0, React type packages 19.3.0, and Playwright Test 1.64.0, checked against npm on 2026-10-10. These are learner dependencies, not changes to the host application's package manifest. Use Node 24.21.0 LTS for the full course. React Router 8.4.0 requires Node >=22.22.0; the earlier Node 22.14.0 verification covered only the original path and is insufficient for the production extension. Commit the learner lockfile and use `npm ci` for reproduction.

Official references used for the lessons:

- [React: building an app from scratch](https://react.dev/learn/build-a-react-app-from-scratch)
- [Tailwind: Vite integration](https://tailwindcss.com/docs/installation/using-vite)
- [Bootstrap introduction](https://getbootstrap.com/docs/5.3/)
- [Vite build configuration](https://vite.dev/config/build-options)
- [React Router HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter)
- [Playwright continuous integration](https://playwright.dev/docs/ci)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Open Library Search API](https://openlibrary.org/dev/docs/api/search)

Live searches send query text to Open Library. No private key is used. Automated API checks substitute controlled responses and do not depend on live availability. The lessons explain CORS, public frontend environment variables and the need for a trusted backend when credentials are private.

## Author verification

Run the structural/component suite:

```sh
npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"
```

For a cross-platform runtime reconstruction, create a temporary dependency folder, copy the `package.json` target from Production 1 into it, run `npm install` there, and run `npx playwright install chromium` in that folder. Use the course Node version. The host repository must also have its own Playwright Chromium installed for Project Studio page checks. Then:

```sh
node scripts/check-frontend-bootcamp.mjs /absolute/path/to/learner-dependencies
```

The checker starts from empty learner source, applies every guided target and exercise answer, runs the actual Project Studio checks, and verifies authored wrong answers fail. It uses installed Playwright Chromium, temporary local servers and the explicit dependency folder; it does not install packages implicitly. Add `--keep` to retain reconstructed apps for inspection. Temporary servers and the browser close on failure or completion. The retained final project needs a fresh final build after the metadata exercise if you want to preview that last edit.

The shared Windows desktop walkthrough is also registered:

```sh
npx vitest run src/labs/project-studio/frontendBootcamp.desktop.test.js
```

This follows the normal Windows runner and performs the lessons' explicit package and Chromium installation commands. The separate cross-platform checker reuses the already-installed final dependency set; it does not certify intermediate dependency installation on every OS.

## Review status and next depth

Maturity remains **in-development** pending editorial pacing review, first-time learner sessions, screen-reader review and Windows desktop execution. The authored path is usable for study and reconstruction; this label avoids confusing automated correctness with teaching validation.

Follow-on specialization should be selected by product need: SSR/SSG frameworks, API caching libraries, headless accessible components, internationalization and backend authentication. The course now includes the full React TypeScript migration, browser routing and continuous browser verification. It does not implement a backend, claim exhaustive coverage of every design discipline, or treat authored reference reconstruction as independent learner mastery. The final capstone remains intentionally unsolved and requires implementation review.

## Verification recorded on 2026-10-10

The runtime reconstruction used Node 24.21.0 and the explicit temporary learner dependency folder. These are recorded test results, not manually maintained catalog totals.

| Command | Observed result |
|---|---|
| `TMPDIR=/private/tmp npx vitest run src/labs/project-studio --exclude '**/*.desktop.test.js'` | `Test Files 43 passed (43)` and `Tests 204 passed (204)`. The canonical macOS temporary directory avoids the existing Git fixture's `/var` versus `/private/var` path comparison. |
| `node scripts/check-frontend-bootcamp.mjs /tmp/frontend-bootcamp-deps` | `Frontend walkthrough: 37 lessons, 141 positive checks, 109 wrong-answer checks, 8 executable predictions passed.` |
| Learner `npm run typecheck` | `tsc --noEmit`, no diagnostics. |
| Learner `npm run test:browser` | `3 passed`; rerun after the final visible navigation adjustment. |
| Learner `npm run build` | `✓ built in 241ms` on the final reconstructed source. React Router emitted non-fatal module-directive warnings. |
| Host `npm run typecheck` | `tsc --noEmit`, no diagnostics. The local OpenMAT workspace package was built first to supply its generated declarations. |
| `npm run docs:check` | `✓ Contributor docs checked: 10 file(s), links, paths and commands all exist.` |
| `npm run facts` and `npm run catalog:check` | Generated facts and catalog are current; both report the existing 14 content problems listed in the generated inventory. |
| `node scripts/audit-project-studio-lessons.mjs --write` | Frontend lessons have no audit errors or signals. The command still exits 1 for three existing `independent task exposes full target` errors in spreadsheet-build. |
| `git diff --check` | No output. |

The final navigation styling was verified again with learner type checking, browser tests, production build and the Project Studio suite after the complete ordered reconstruction. The reader was inspected in the browser, including the newly discovered chapter; the built React app was checked through its actual navigation. No hosted workflow or deployment was run, and the Windows-only desktop walkthrough remains unexecuted here. Temporary preview servers were stopped after inspection.
