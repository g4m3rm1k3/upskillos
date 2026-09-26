## What does this PR do?

<!-- One paragraph: what changed and why. -->

## Type of change

- [ ] Lesson content (new lesson or a fix)
- [ ] Visualization
- [ ] Lab or game
- [ ] Bug fix
- [ ] UI / component change
- [ ] Documentation
- [ ] Build / tooling

## Checks I ran

<!-- Paste the commands and their result. CONTRIBUTING.md#checks lists which apply. -->

## Checklist: all PRs

- [ ] One concern in this PR
- [ ] Branch synced with `upstream/main`
- [ ] Links inside the app use router links (`<Link to>` / `navigate`), not plain `href="/..."`

## Checklist: content added, removed or renamed

- [ ] Ran `npm run facts` and committed the regenerated files (`npm run catalog:check` passes)
- [ ] New lessons are at `src/courses/<course>/<N>-<chapter>/<NNN>-<slug>.js`; nothing needs registering
- [ ] Each new lesson has an `id` that is unique across all courses
- [ ] No published lesson's `id` changed (it is the key learners' progress is saved under)
- [ ] `node scripts/validate-lesson-schema.mjs <file>` passes for each changed lesson

## Checklist: visualizations

- [ ] Course visualizations are in `src/courses/<course>/viz/<Name>.jsx` (found by file name; shared ones are registered in `src/components/viz/VizFrame.jsx`)
- [ ] Works in light and dark mode
- [ ] Resizes with its container

## Checklist: contributor docs

- [ ] `npm run docs:check` passes

## Screenshots (for visible changes)

<!-- Drag images here -->

## Related issues

Closes #
