---
title: Git — make changes you can inspect and recover
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

Version control is part of implementation. A clean working tree does not mean the software works; it means Git's tracked files match a recorded snapshot. Tests and review answer different questions.

## Exclude reproducible output

These are build output, downloaded dependencies, local databases and local environment settings. Gitignore affects untracked files; it does not remove something already committed. Lockfiles are deliberately absent: they record dependency resolution and belong in version control. Type these lines, then initialize your repository in the next step.

Type this fragment yourself. Start an empty file at `.gitignore`:

```text edit=.gitignore mode=replace
target/
node_modules/
frontend/dist/
scratch/out/
*.mv.db
*.trace.db
.env
```

## Inspect the three versions

Run these commands one at a time, using your own identity:

```text
git init -b main
git config user.name "Your Name"
git config user.email "you@example.com"
git status
git add .gitignore scratch/Trace.java decisions/001-scope.md learning-log.md
git diff --staged
git commit -m "Define workspace scope and trace Java execution"
```

The working tree contains current files; the index contains the next proposed snapshot; HEAD identifies the current commit. Editing after `git add` changes the working tree without updating the staged copy. Inspect `git diff` and `git diff --staged` separately.

Make a harmless edit to the learning log. Stage it, edit it again, then inspect both diffs. `git restore --staged learning-log.md` unstages without deleting the edit. Commit useful notes. Before every later commit, review the exact diff and run the relevant tests. Commit commands here are instructions for your learning repository, not for the UpSkillOS repository.

```check
git-repo
git-tracked .gitignore
git-ignored target/classes/Main.class
git-commits 1
```

## Resolve a conflict and recover safely

Create a practice branch with `git switch -c practice/conflict`. Change the first line of `learning-log.md`, stage it and commit. Switch to main, change the same line differently, and commit. Merge the practice branch with `git merge practice/conflict`.

A conflict means Git cannot choose between overlapping changes. Read both intended meanings; do not merely remove the markers. Edit the final sentence, stage it, and commit the merge. If you want to restart resolution, `git merge --abort` returns to the pre-merge state when the working tree was clean.

Practice recovery on another branch: add and commit a deliberately mistaken note, then use `git revert HEAD`. Revert creates an inverse commit and preserves shared history. `git reflog` records recent local reference movements; inspect it before attempting recovery from an accidental reset. Avoid destructive reset commands while learning.

Write what changed in HEAD, the index and the working tree during resolution in `decisions/002-git.md`. Return to main. Later lessons do not depend on the practice branch.

```check
file decisions/002-git.md
git-branch main
```
