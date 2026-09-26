> **Historical document.** This plan targets the removed `src/content/` system and manual chapter indexes. Do not assign these tasks without rewriting them for the current `src/courses/` layout and current lesson contract.

# UpSkillOS — Agent Task Plan

This document outlines the structured tasks to be handed off to AI agents to upgrade the UpSkillOS content to the "Gold Standard". 
When assigning an agent, copy the relevant task block and provide it as their system prompt or initial instruction.

## The Goal
Bring all developing-tier courses up to the standard established in **Calculus Chapters 2 & 3** and **Linear Algebra Chapters 1-4**.

---

## 🛠️ Infrastructure Tasks (To be run first or periodically)

### Task: Normalize File Naming Conventions
**Target:** `src/content/python-1/`
**Instruction:**
1. The `python-1` directory has 3 separate naming conventions (`lesson1.js`, `ch1-1.js`, `ch4-1.js`).
2. Rename all files to follow the `py{chapter}-{NNN}-{slug}.js` convention.
3. Update `python-1/index.js` to fix all broken imports resulting from the rename.
4. Run `npm run build` to ensure no routing or import errors exist.

### Task: Standardize Chapter Indices
**Targets:** `chapter-1/index.js`, `chapter-4/index.js`, `chapter-5/index.js`, `chapter-6/index.js`, `precalc/index.js`, `geometry-1/index.js`
**Instruction:**
1. Read `docs/CHAPTER_INDEX_TEMPLATE.js`.
2. Update the target `index.js` files to include an Act-based narrative comment block explaining the pedagogical arc of the chapter.
3. Add inline comments to the `lessons: []` array matching the Act structure.
4. Ensure a `description` string exists for the chapter.

---

## 📚 Content Upgrades (Parallelizable per course)

Give this block to an agent along with the specific target course folder.

### Task: Full 14-Point Lesson Audit & Upgrade
**Instruction:**
Your goal is to bring the assigned course up to the UpSkillOS Gold Standard.
For each lesson file in the course folder:
1. Verify it adheres to Schema A (refer to `ARCHITECTURE.md`).
2. Ensure `intuition.prose` has at least 4 paragraphs, with the first starting with `**Where you are in the story:**`.
3. Ensure `intuition.callouts` includes a `type: 'sequencing'` callout.
4. Verify or add at least 3 examples (easy/medium/hard).
5. Verify or add at least 3 challenges (easy/medium/hard) with step-by-step walkthroughs.
6. Verify or add a `quiz` array with at least 6 questions, including at least one `input` type question and `reviewSection` strings.
7. Verify or add `semantics.core` and `semantics.rulesOfThumb`.
8. Verify or add `spiral.recoveryPoints` and `spiral.futureLinks`.
9. Verify or add `mentalModel` (3-5 short entries).
10. **CRITICAL:** Add `misconceptions` (at least 2 entries).
11. **CRITICAL:** Add `transferPrompts` (at least 2 entries).
12. **CRITICAL:** Add `debugging` (at least 2 entries).
13. Add `mastery` target level.
14. Ensure `npm run build` passes after your changes.

**Courses needing this task (Assign one course per agent):**
- Priority 1: `chapter-1`, `chapter-4`, `chapter-5`, `chapter-6`
- Priority 2: `precalc`, `geometry-1`
- Priority 3: `cpp-0`, `cli-0`, `sql-0`, `nosql-1`, `applied-statistics`
- Priority 4: `dsa-1`, `dp-1`, `cs-1`, `discrete-math`

---

## 🎨 Visualization Tasks

### Task: Viz Hook Generation
**Target:** Courses lacking visualizations
**Instruction:**
Identify lessons that do not have a `previewVisualizationId` in their hook or lack visualizations in their intuition/math sections.
1. Design a suitable interactive visualization for the concept.
2. Implement it as a React or D3 component in `src/components/viz/`.
3. Register it in `src/components/viz/VizFrame.jsx`.
4. Update the lesson file to include the visualization with a proper `mathBridge` instruction.

---

## Agent Protocol

Every agent working on these tasks MUST:
1. Read `AGENTS.md` before touching code.
2. Run `npm run build` frequently.
3. Run `npm run docs:check` after contributor-document changes and `npm run catalog:check` after catalog changes.
4. Report their completion status clearly, including any unresolved issues from the 14-point checklist.
