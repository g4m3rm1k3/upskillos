# UpSkillOS — Agent Workflow Rules

> **This document is mandatory reading for any AI agent working on this codebase.**
> Every rule here exists because violating it has caused real breakage or documentation drift.
> Read the whole thing before touching any file.

---

## 0. What This Project Is

UpSkillOS is a React 18 + Vite 5 interactive STEM learning platform.

- **30 courses**, each with lessons defined as JavaScript ES module objects
- **Lesson content = JS files** in `src/content/{course-folder}/`
- **Visualizations = React/D3/Three.js components** in `src/components/viz/`
- **Routing** uses HashRouter; a lesson is reached at `#/chapter/{chapterId}/{lessonSlug}`
- **Build** = `npm run build` — generates `public/search-index.json` and catches import errors

**The gold standard for lesson quality is:**
- Calculus Chapter 2: `src/content/chapter-2/` — derivatives course, excellent index
- Calculus Chapter 3: `src/content/chapter-3/` — applications of derivatives
- Linear Algebra Chapters 1–4: `src/content/linear-algebra/la1-001-vectors.js` through `la4-009-...`

Read at least one gold-standard lesson before writing or upgrading any lesson.

---

## 1. The Non-Negotiable Rules

### Rule 1 — Never break a build
Run `npm run build` from `/Users/michaelmclean/Testing/open-calc` after any content change.  
A lesson with a syntax error, a missing import, or a duplicate object key will silently break routing.  
**Do not commit or report done until the build passes.**

### Rule 2 — Every lesson must be registered
Adding a lesson file does nothing unless it is imported and added to the `lessons: []` array in the chapter's `index.js`.

### Rule 3 — Every visualization must be registered
A viz referenced in a lesson but not registered in `src/components/viz/VizFrame.jsx` renders as nothing with no error. Both must be done together.

### Rule 4 — IDs must be globally unique
Search for any `id:` string before using it. Duplicate IDs cause the LESSON_MAP to silently overwrite one lesson with another.

### Rule 5 — When you add a course, update 3 documents
| What you did | What you must also update |
|---|---|
| Added a new course folder + `index.js` | `src/content/courses.js`, `README.md` course count + table, `ARCHITECTURE.md` course inventory |
| Added a new lesson | Chapter's `index.js` lessons array |
| Added a new viz component | `src/components/viz/VizFrame.jsx` VIZ_REGISTRY |
| Changed the lesson schema | `ARCHITECTURE.md` Section 5, `CONTRIBUTING.md` Section 1 |
| Added a new viz subfolder | `ARCHITECTURE.md` viz subdirectory table |

### Rule 6 — Run the doc-drift check
After any structural change, run:
```bash
node scripts/check-doc-drift.js
```
This catches doc drift before it accumulates. Fix any warnings before finishing.

---

## 2. Lesson Quality Standard

Every Schema A lesson must have these sections before it is considered **Review-Ready**:

| Section | Minimum requirement |
|---|---|
| `id` | Globally unique; follows course prefix convention (see Section 4) |
| `slug` | Lowercase, hyphenated, ≤ 4 words |
| `chapter` | Matches `number` field in chapter's `index.js` |
| `order` | Unique within the chapter; no two lessons share the same value |
| `title` | ≤ 8 words |
| `subtitle` | One sentence ≤ 15 words |
| `tags` | At least 3 searchable terms |
| `hook.question` | A genuine curiosity-generating question |
| `hook.realWorldContext` | Names a specific domain and explains why the concept is needed there |
| `intuition.prose` | At least 4 paragraphs; first begins with `**Where you are in the story:**` |
| `intuition.callouts` | Includes `type: 'sequencing'` callout (Previous / This / Next) |
| `examples` | At least 3: easy / medium / hard; each has a unique `id` |
| `challenges` | At least 3: easy / medium / hard; each has `walkthrough` with annotated steps |
| `quiz` | At least 6 questions; mix of `choice` and `input` types |
| `semantics.core` | One entry per symbol introduced; `meaning` explains what it **does** |
| `semantics.rulesOfThumb` | 4–5 practical heuristics |
| `spiral.recoveryPoints` | 1–3 entries with `{lessonId, label, note}` |
| `spiral.futureLinks` | 1–3 entries with `{lessonId, label, note}` |
| `mentalModel` | 3–5 entries, ≤ 10 words each, written in student voice |
| `misconceptions` | At least 2 entries with `{falseBelief, whyStudentsThinkIt, correctionExample, contrastCase}` |
| `transferPrompts` | At least 2 entries with `{situation, competingTechniques, whyThisTechniqueWins}` |
| `debugging` | At least 2 entries with `{commonError, symptom, whyItHappened, repairStrategy}` |
| `mastery` | Object with `targetLevel` (1–4) and all four level descriptions |

Full schema and field rules: `docs/lesson-writing-standard.md`  
Full PR checklist: `CONTRIBUTING.md`

---

## 3. The Upgrade Workflow (for quality agents)

When your task is to bring an existing lesson to gold standard:

### Step 1 — Read the lesson
Open the lesson file. Note which required sections are missing or thin.

### Step 2 — Audit against the 14-point self-check
Run through `docs/lesson-writing-standard.md` bottom section: "Self-Check Before Finishing a Lesson."  
Make a list of exactly which of the 14 items fail.

### Step 3 — Check the chapter index
Open the chapter's `index.js`. Does it have:
- A chapter `description` field?
- An Act-based narrative comment block (like `chapter-2/index.js` and `chapter-3/index.js`)?
- Inline comments on each lesson in the `lessons: []` array?

If not, add them. This is low-effort, high-signal work.

### Step 4 — Upgrade the lesson
Add only what is missing. Do not restructure existing content unless it violates the rules.  
Keep notation consistent with neighboring lessons in the same chapter.

### Step 5 — Verify
```bash
npm run build
node scripts/check-doc-drift.js
```

### Step 6 — Report
In your completion message, list:
- Which lesson(s) you upgraded
- Which sections you added
- Which items from the 14-point check still fail (if any)

---

## 4. File Naming Conventions

### Lesson files

| Course | Convention | Example |
|---|---|---|
| Calculus (ch1–6) | `{NN}-{slug}.js` | `02-chain-rule.js` |
| Linear Algebra | `la{chapter}-{NNN}-{slug}.js` | `la2-003-inverse-matrices.js` |
| Geometry | `g{book}-{NNN}-{slug}.js` | `g1-001-points-lines.js` |
| Python | `py{chapter}-{NNN}-{slug}.js` | `py1-001-variables.js` *(target standard)* |
| C++ | `cpp{chapter}-{NNN}-{slug}.js` | `cpp0-001-hello-world.js` |
| All others | `{coursekey}{chapter}-{NNN}-{slug}.js` | `dsa1-001-arrays.js` |

> ⚠️ **Python-1 currently has 3 mixed naming conventions** (`lesson1.js`, `ch1-1.js`, `ch4-1.js`).  
> Do NOT rename existing Python-1 files — it breaks routes. New Python-1 lessons should use `py{chapter}-{NNN}-{slug}.js`.

### Chapter index files
Every course folder has exactly one `index.js`. It exports either:
- A single chapter object (`export default { id, number, title, ... }`)
- An array of chapter objects (`export default [CH1, CH2, ...]`)

See `docs/CHAPTER_INDEX_TEMPLATE.js` for the copyable gold-standard template.

### Visualization files
- React: `src/components/viz/react/MyVizName.jsx` (PascalCase)
- D3: `src/components/viz/d3/MyVizName.jsx` (PascalCase)
- Three.js: `src/components/viz/three/MyVizName.jsx` (PascalCase)
- Matter.js: `src/components/viz/matter/MyVizName.jsx` (PascalCase)

---

## 5. What Not to Touch Without Explicit Authorization

These files require coordination because many lessons depend on them:

| File | Why it's dangerous |
|---|---|
| `src/content/index.js` | The master lesson map. Adding wrong imports breaks all routing |
| `src/components/viz/VizFrame.jsx` | The viz registry. Wrong entries break all viz rendering |
| `src/App.jsx` | Route definitions. Wrong changes break all navigation |
| `src/components/layout/AppShell.jsx` | Layout shell. Wrong changes break the whole UI |
| `tailwind.config.js` | Design tokens. Wrong changes break all dark mode |
| Any `index.js` in a content folder | Breaks all lessons in that chapter if malformed |

If you need to edit these files, do the minimal possible change and build-test immediately.

---

## 6. Lesson Schema Variants — Know Which One You're In

There are 4 lesson schemas in the codebase. **Do not mix them.**

| Schema | Used by | Key characteristic |
|---|---|---|
| **Schema A** | Calculus, Linear Algebra, Geometry, Physics, Discrete, Precalc, DSA, DP, Stats, SQL, C++... | Full `intuition / math / rigor / examples / challenges / quiz` structure |
| **Schema B** | Python-1 | `hook + intuition` with a `PythonNotebook` viz; minimal prose |
| **Schema C** | Web-1 | Named viz components + optional `JSNotebook` at end |
| **Schema D** | JavaScript-1, Tetris | `LESSON_DATA` constant + metadata `export default` |
| **Schema E** | Chemistry, Digital Fundamentals | Named `export const LESSON_X` + thin default export; requires wrapper viz component |

Full schema docs: `ARCHITECTURE.md` Section 5.

---

## 7. Quick Reference — Common Tasks

### Add a lesson to an existing course
1. Create `src/content/{course}/my-lesson.js` using Schema A template
2. Import it in `src/content/{course}/index.js`
3. Add to `lessons: [...]` array in correct position
4. `npm run build` — confirm clean

### Add a new course
1. Create `src/content/{course-key}/index.js` (use `docs/CHAPTER_INDEX_TEMPLATE.js`)
2. Add lesson files
3. Import chapter in `src/content/index.js`
4. Add course entry to `src/content/courses.js`
5. Update `README.md` course count and table
6. Update `ARCHITECTURE.md` course inventory table
7. `npm run build` + `node scripts/check-doc-drift.js`

### Add a visualization
1. Create component in the correct `src/components/viz/{type}/` folder
2. Add `MyViz: lazy(() => import('./type/MyViz.jsx'))` to VIZ_REGISTRY in `VizFrame.jsx`
3. Reference `{ id: 'MyViz', ... }` in the lesson's `visualizations` array
4. `npm run build` — confirm clean

---

## 8. How to Report Completion

At the end of every agent session, report:

```
## Completed
- [list of files created or modified]

## Build status
- npm run build: PASS / FAIL (if fail, paste the error)
- node scripts/check-doc-drift.js: PASS / WARNINGS (list any warnings)

## Remaining work
- [anything from your task that is not yet done]
- [anything you noticed that is out of scope but should be tracked]
```

---

*Last updated: 2026-05-30. Maintained by project owner. Agents must not modify this file unless explicitly authorized.*
