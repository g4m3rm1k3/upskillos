# TypeScript and build-warning cleanup — 2026-10-10

The current TypeScript baseline is clean. The HTML Lab parser's comment typing
was already repaired when this pass started; the remaining diagnostics were fixed
without changing compiler exclusions or suppressing errors.

Changes:

- Give the shared theme context usable defaults and the correct setter signature.
- Describe the shared Markdown plugin/component contracts and optional code-block
  callbacks, so TypeScript callers do not have to supply notebook-only props.
- Infer the progress context contract from its implementation, type the stored
  progress map, and report a missing provider explicitly. A regression test saves
  a checkpoint, avoids duplicates and restores it through a fresh provider.
- Use OpenMAT's actual workspace-entry type and narrow matrix results to numeric
  rows before formatting them.
- Use an ES2020-compatible own-property assertion in the migration test.
- Exclude nested tutorial `node_modules` folders from Tailwind scanning. A glob
  check confirmed 4,168 dependency files excluded and zero dependencies remaining
  in the scan. Exclude the Python prose token `[-3:-1]` from class generation so
  it cannot create the invalid declaration `-3: -1`.
- Exclude the already-imported practice manifest and loader from the lazy content
  glob; the previous runtime filter happened too late to prevent bundling warnings.

Verification:

- `npm.cmd ls sql.js --depth=0`: `sql.js@1.12.0`. Both dependency files declare it;
  loading its installed WASM successfully reported SQLite `3.45.2`.
- `node node_modules/typescript/bin/tsc --noEmit`: exit 0, no diagnostics.
- `node node_modules/vitest/vitest.mjs run src/labs/backend-lab src/context src/hooks/useLocalStorage.test.jsx`:
  **8 files, 60 tests passed**.
- `npm.cmd run docs:check`: **10 contributor files; links, paths and commands all exist**.
- `node --max-old-space-size=8192 node_modules/vite/bin/vite.js build`: the first
  cleanup build passed in **3m 33s**, with the nested-dependency scan warning gone.
  The final build passed in **3m 39s**; the invalid CSS and mixed static/dynamic
  practice-manifest warnings are also gone. The final TypeScript rerun passed.
- `node scripts/check-backend-lab-browser.cjs http://127.0.0.1:5188`: passed against
  that production build, covering anonymous requests, SQLite, reload persistence,
  checklist progress, saved checks, history, backups, mobile controls and stale-tab
  conflict protection, with no page errors or SQLite CDN requests.

Remaining warnings are not suppressed: outdated Browserslist data, a third-party
PURE annotation, sql.js's Node-only imports being externalized, intentional eval
in the JavaScript console and JSXGraph, large chunks, and React-plugin deprecations
under Vitest's newer Vite runtime. Dependency upgrades and bundle-size changes need
their own compatibility checks. Verification logs are in the ignored
`.cache/backend-lab-verification` directory.
