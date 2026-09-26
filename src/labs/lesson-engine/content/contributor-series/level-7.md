---
series: contributor-series
level: 7
title: Your First Contribution
lang: bash
---

# Your First Contribution

The previous six levels covered the mechanics: Markdown, git, branches, reading code, writing lessons, and the theming system. This level puts them together into a single end-to-end workflow — from having an idea to seeing your PR merged into the codebase.

The first contribution is the hardest. The uncertainty about "am I doing this right?" goes away once you've done it once. The goal of this level is to walk you through that first time completely, so the second time feels routine.

By the end of this lesson you will know the full contribution workflow (branch → write → commit → PR → review → merge), understand what makes a good first contribution vs a bad one, and have the checklist you need to submit a lesson that passes review.

## Finding something to contribute

```text
Types of contributions (easiest to hardest):

1. Fix a typo or mistake in an existing lesson
   → Smallest possible change. Great first PR.
   → Find a typo? Edit the .md file. Commit. PR.

2. Add a missing "Debug tip" or "Common mistake" to an existing lesson
   → Still very small. Improves existing content without creating new files.

3. Add a missing level to an existing series (shows "Coming soon")
   → Medium. You write one .md file and add it to series.ts + LessonEngineLab.tsx.

4. Write a new series from scratch
   → Large. 7-8 lesson files + series.ts + LessonEngineLab.tsx registration.
   → Recommended: discuss in a GitHub issue first, so you know the topic is wanted.

5. Add a new lab component
   → Requires React. A folder in src/labs/ with a meta.js and an index.jsx
     is discovered automatically; nothing else needs wiring up.
   → Discuss first. Not a beginner task.
```

The steps above are for this lab's Markdown series, which are registered in `series.ts`. The app's main courses work differently: a lesson is a `.js` file at `src/courses/<course>/<N>-<chapter>/<NNN>-<slug>.js` and is found automatically, with nothing to register. `CONTRIBUTING.md` in the repository covers those.

## The full contribution workflow

```bash
# 1. Make sure your local main is up to date:
git switch main
git pull upstream main      # pull from the original repo, not your fork

# 2. Create your branch:
git switch -c fix/typo-css-responsive-level-2
# or
git switch -c lessons/add-missing-level-dsa-python

# 3. Make your changes:
#    Edit or create lesson .md files
#    Update series.ts if adding a new level
#    Update LessonEngineLab.tsx if adding a new level

# 4. Test locally:
npm run dev
# Navigate to your lesson in the browser
# Check: does it load? Does the challenge work?
# Check both light and dark theme

# 5. Commit:
git add src/labs/lesson-engine/content/css-responsive/level-2.md
git commit -m "fix: typo in css-responsive level-2 — 'widht' → 'width'"

# 6. Push:
git push -u origin fix/typo-css-responsive-level-2

# 7. Open PR on GitHub:
#    Go to github.com/YOUR-NAME/open-calc
#    GitHub shows a banner: "Compare & pull request"
#    Title: "fix: typo in css-responsive level-2"
#    Description: what you changed and why
#    Target branch: main (of the original repo)
#    Click "Create pull request"
```

**CS lens:** The open-source contribution model is a **distributed peer review system**. Every change goes through: fork (copy) → branch (isolate) → commit (save) → push (share) → PR (propose) → review (verify) → merge (integrate). This pipeline catches errors, maintains quality, and preserves history. The same model is used by the Linux kernel, React, Python, and virtually every major open-source project. Learning to use it effectively is one of the most transferable software skills there is.

## What a reviewer looks for

```text
When a maintainer reviews your PR, they check:

Content quality:
  ✓ Does the lesson follow the same structure as the other levels in its series?
  ✓ Is the CS lens or SE lens genuinely insightful?
  ✓ Does the challenge actually test the concept?
  ✓ Are the test assertions meaningful (not trivially passable)?
  ✓ Is the language clear and correct?

Technical:
  ✓ Does series.ts have the new levels with matching titles?
  ✓ Does LessonEngineLab.tsx have the ?raw imports and LESSON_FILES entries?
  ✓ Does the lesson render correctly in the dev server?
  ✓ Does the challenge run without errors?

Style:
  ✓ Does the commit message describe what changed?
  ✓ Is the PR description clear?

A reviewer may leave comments asking for changes. This is normal.
Respond to comments, make the changes, push more commits.
The PR stays open until the reviewer approves and merges.
```

## Responding to review feedback

```bash
# The reviewer left a comment asking you to improve the CS lens paragraph.
# Make the change in your editor, then:

git add src/labs/lesson-engine/content/react-fundamentals/level-0.md
git commit -m "update: improve CS lens paragraph in react-fundamentals level-0"
git push   # pushes to the same branch — the PR updates automatically

# After pushing, reply to the reviewer's comment on GitHub:
# "Updated — expanded the CS lens to include the functor analogy."

# When the reviewer approves:
# They click "Merge pull request" on GitHub.
# Your branch is merged into main.
# Your lessons are live in the project.
```

**SE lens:** Code review is a collaboration skill, not just a technical one. The reviewer is not your adversary — they want your contribution to be good. When they ask for changes, it's because they believe the PR can be better. The best response: read the comment carefully, make the specific change they asked for, and explain what you changed. If you disagree, ask a question rather than arguing: "I thought X was clearer because Y — does that address your concern?" Disagreements resolved in comments become better documentation than silence.

**Common mistakes:**
- Opening a PR before testing locally — run `npm run dev` and click through every level before pushing. Reviewing broken content wastes the reviewer's time.
- Ignoring review comments — a PR with unresponded comments stalls. Even a "I see your point, will fix shortly" response keeps the process moving.

**Debug tip:** If your PR shows merge conflicts (GitHub shows a red warning), it means main has changed since you branched. Sync your branch: `git fetch upstream && git merge upstream/main`, resolve any conflicts, commit, and `git push`. Merging adds one commit and leaves your branch's history alone, which matters once a reviewer has seen it; avoid rebasing and force-pushing a branch that is already under review.

**You did it.** You now have all the skills to contribute: Markdown, git, branches, PRs, reading code, writing great lessons, understanding components and theming, and navigating the review process. The first PR is the hardest. After that, it becomes routine.

## Challenge: contribution_plan

Plan your first contribution.

```challenge javascript
const myFirstContribution = {
  // What type of contribution will you make? (fix/add-level/new-series/other)
  type: '',
  // What series or topic will it be for?
  topic: '',
  // What branch name will you use? (must follow naming convention)
  branchName: '',
  // Write the commit message you'll use for your first commit:
  commitMessage: '',
}
```

```test
assert myFirstContribution.type.length > 2
assert myFirstContribution.topic.length > 3
assert (myFirstContribution.branchName.includes('/') && myFirstContribution.branchName.length > 5)
assert myFirstContribution.commitMessage.length > 10
assert (myFirstContribution.commitMessage.startsWith('add:') || myFirstContribution.commitMessage.startsWith('fix:') || myFirstContribution.commitMessage.startsWith('update:') || myFirstContribution.commitMessage.startsWith('chore:'))
```
