# Automatic course and lab discovery

The home catalog and Start menu read the discovered registries. You do not need
to add navigation entries when creating a course or lab.

- Courses: add lessons at `src/courses/<course-id>/<number>-<chapter>/<number>-<lesson>.js`.
  Add `meta.json` in the course folder for its label, description, icon, domain,
  and palette color. Valid lesson folders are discovered even without metadata.
- Labs: add `src/labs/<lab-id>/meta.js` with a default metadata export and an
  `index.jsx` or `index.tsx` default component. Metadata can specify `label`,
  `emoji`, `desc`, `subject`, `color`, `tags`, and `kind` (`lab`, `lesson`,
  `builder`, or `visualizer`). Use an existing lab as the component template.
- Use palette names from `src/styles/courseColors.js` for `color`. Missing or
  unsupported lab colors receive a fallback; missing subjects become `Other`.

The Start menu derives its subject headings from the lab registry. New subjects
appear automatically. The home page retains curated subject placements, then
adds unplaced entries according to their subject or domain. Unknown topics go
under General. All content lists the entire catalog without needing a search.
Editing `src/data/topicGroups.js` is optional, for a more specific placement.

Discovery happens through Vite's `import.meta.glob`. Production sites need a new
build/deployment to include added files; they do not scan the repository live.

Run `node node_modules/vitest/vitest.mjs run src/data/catalogNavigation.test.js`
to check catalog coverage, future-content fallbacks, and palette metadata.
