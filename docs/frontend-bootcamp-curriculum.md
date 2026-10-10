# Frontend Developer Bootcamp

Open **Project Studio → Series → Frontend Developer Bootcamp — From Zero to Portfolio**. Begin with **First Page and Developer Tools**. Every chapter shares one learner-selected portfolio folder; each app has its own subfolder. The browser edition exposes the reading path; local file editing, terminal commands and page checks require the desktop app or a separate editor and terminal.

## Audience and outcomes

No programming prerequisite. Start with files, HTML and browser tools, then build useful apps with increasingly demanding design and engineering requirements. The authored path reaches a static production portfolio and an independently implemented capstone. It does not promise employment, cover every design discipline, or claim that reference solutions certify independent mastery.

| Chapter | Project and observable outcome |
|---|---|
| First Page and Developer Tools | Create semantic HTML; serve it locally; inspect requests; understand Save, Commit and Publish. |
| Design a Responsive Café Site | Identify audience and task, sketch flows, test a usability hypothesis, build a fluid layout, and define readable light/dark tokens. |
| JavaScript and a Budget Calculator | Learn values, conditions, functions and modules; validate inputs; connect accessible forms and events; persist a theme preference. |
| A Task Planner That Remembers | Transform arrays and objects without mutation; render data safely; preserve keyboard focus; recover from malformed or unavailable storage. |
| Book Finder and HTTP APIs | Use promises, HTTP status, JSON validation and request cancellation; implement loading, empty, error and success states; reject stale responses. |
| Bootstrap Service Dashboard | Use the grid and components deliberately; connect a disclosure to its accessible state; inspect library theme conventions. |
| React Reading List | Build components and controlled forms; understand identity, derived state, Effects and cleanup; reuse the API boundary and persist a shelf. |
| Tailwind and a Component System | Use the v4 Vite integration, CSS-first tokens, reusable button contracts and light/dark variants. |
| TypeScript, Testing and Accessibility | Model a discriminated union; write meaningful regression tests; review keyboard access, contrast, performance, security and recovery. |
| Portfolio, Deployment and Capstone | Build every app, preview nested URLs, prepare a release and rollback, write a case study, independently implement and review a tagged reading product. |

The inventory is generated; do not maintain lesson counts here. Lessons are discovered from `src/labs/project-studio/tracks/frontend-*/`. Navigation and prerequisite profiles live in `series.js` and `learningProfile.js`.

## Teaching and assessment

Each lesson includes a guided example, an independent task with progressive hints, and a diagnostic experiment with observation/explanation/retest evidence. Full guided file references are collapsed by default. Exercises have author answers for reconstruction; the final capstone intentionally has no supplied application implementation. Its reference evidence file illustrates the submission shape, not a completed capstone.

Checks distinguish source/document presence from behavior. Browser checks operate on actual learner pages, Node checks test pure logic, and the compiler/build exercise toolchain boundaries. Document checks cannot establish research quality, design judgment or accessibility. Manual review includes narrow layouts, zoom, focus, theme contrast, malformed saved data and failed requests. The learner must retain observed results, an explanation and an independent change.

The capstone requires tags, derived filtering, storage migration, input validation, tests and usability revision. A peer or mentor must inspect the implementation and demonstration; passing the evidence-file checks alone is not completion.

## Toolchain and external dependencies

Learner manifests pin Vite 8.3.4, React/React DOM 19.3.0, Bootstrap 5.3.8, Tailwind and its Vite plugin 4.3.3, and TypeScript 7.0.2, checked against npm on 2026-10-10. These are learner dependencies, not changes to the host application's package manifest. Use a supported Node LTS release compatible with Vite; the verified environment used Node 22.14.0. Commit the learner lockfile and use `npm ci` for reproduction.

Official references used for the lessons:

- [React: building an app from scratch](https://react.dev/learn/build-a-react-app-from-scratch)
- [Tailwind: Vite integration](https://tailwindcss.com/docs/installation/using-vite)
- [Bootstrap introduction](https://getbootstrap.com/docs/5.3/)
- [Vite build configuration](https://vite.dev/config/build-options)
- [Open Library Search API](https://openlibrary.org/dev/docs/api/search)

Live searches send query text to Open Library. No private key is used. Automated API checks substitute controlled responses and do not depend on live availability. The lessons explain CORS, public frontend environment variables and the need for a trusted backend when credentials are private.

## Author verification

Run the structural/component suite:

```sh
npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"
```

For a cross-platform runtime reconstruction, create a temporary dependency folder, copy the final `package.json` target from the testing lesson into it, and run `npm install` there. Then:

```sh
node scripts/check-frontend-bootcamp.mjs /absolute/path/to/learner-dependencies
```

The checker starts from empty learner source, applies every guided target and exercise answer, runs the actual Project Studio checks, and verifies authored wrong answers fail. It uses installed Playwright Chromium, temporary local servers and the explicit dependency folder; it does not install packages implicitly. Add `--keep` to retain reconstructed apps for inspection. Temporary servers and the browser close on failure or completion. The retained final project needs a fresh final build after the metadata exercise if you want to preview that last edit.

The shared Windows desktop walkthrough is also registered:

```sh
npx vitest run src/labs/project-studio/frontendBootcamp.desktop.test.js
```

This follows the normal Windows runner and performs the lesson's `npm install` commands. The separate cross-platform checker reuses the already-installed final dependency set; it does not certify intermediate dependency installation on every OS.

## Review status and next depth

Maturity remains **in-development** pending editorial pacing review, first-time learner sessions, screen-reader review and Windows desktop execution. The authored path is usable for study and reconstruction; this label avoids confusing automated correctness with teaching validation.

Follow-on depth should be selected by product need: browser routing and navigation history, SSR/SSG frameworks, API caching libraries, headless accessible components, internationalization, backend authentication and continuous browser testing. These are introduced as next directions, not represented as completed specialized courses. A TypeScript exercise teaches strict modeling; it does not claim the entire React project is already migrated.
