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

### Distinguish source, output and private local state

Your `Trace.java` is source: text a human edits to define behavior. `Trace.class` is output the compiler can reproduce. Recording both would create two competing representations that can disagree after an edit. We record the source and the build instructions, then regenerate the output.

A `.gitignore` file contains patterns, one per line. `target/` names Maven's output directory. The trailing slash matches directories. `node_modules/` contains downloaded JavaScript packages. `frontend/dist/` reserves a common frontend output directory; our later configured output path will be added separately. `scratch/out/` is exactly the compiler destination from the preceding lesson.

`*.mv.db` means any filename ending in `.mv.db`; the asterisk matches a variable part of a name. H2 will put durable local data in these files. `*.trace.db` excludes its diagnostic files. `.env` matches a common local configuration filename. Ignoring it is a convention, not a security mechanism: inspect staged content, and never assume every possible credential filename is covered.

**Predict:** does adding a pattern erase matching files? No. Files remain on disk. The pattern tells Git which *untracked* files to omit from ordinary discovery. If you already tracked a file, adding an ignore pattern does not remove its history or stop tracking it. Check this distinction before assuming private data was removed.

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

### What the commands change

`git init -b main` creates repository metadata in a hidden `.git` directory and names the initial branch `main`. A **commit** records a snapshot plus metadata such as its parent and message. A **branch** is a movable name for a commit; it is not another copy of every file. `HEAD` normally points to your current branch, whose reference advances when you commit.

`git config user.name` and `git config user.email` set authorship for this repository. Quotation marks keep a name containing spaces together as one command argument. These settings identify commits; they do not log you into a remote service. `git status` reports changes without recording them.

`git add` stages the current contents of the named paths in the **index**, the proposed next snapshot. `git diff --staged` compares that snapshot with the last commit. `git commit -m` records the staged version with the following message. None of these commands uploads your repository. A future push would be a separate operation.

### Trace the versions with actual text

After the first commit, add the line `Prediction: five remaining.` to `learning-log.md`. Stage it. Then change that line to `Observation: five remaining.` without staging again.

| Place | Last line after those operations |
|---|---|
| Last commit | Neither new line |
| Index | `Prediction: five remaining.` |
| Working file | `Observation: five remaining.` |

**Predict:** which wording would a commit record now? The staged prediction. `git diff` compares working file against index, so it shows prediction becoming observation. `git diff --staged` compares index against the commit, so it shows the addition of the prediction. This is why reviewing only one diff can miss what you are about to record.

`git restore --staged learning-log.md` resets this path's index entry to the committed version. It leaves your working file intact. Inspect both diffs again. To keep the observed wording, stage the file again and review before committing. Avoid broad staging until you can account for every listed path.

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

### Understand why Git asks you to decide

A merge compares two branch tips with their shared ancestor. If both branches change different lines, Git can often combine the edits. If both replace the same line differently, textual comparison cannot establish which meaning is correct. That unresolved choice is a **conflict**.

Start with a clean working tree so unfinished edits are not mixed into the exercise. `git switch -c practice/conflict` creates a branch at your current commit and switches to it. After committing its edit, `git switch main` updates the working tree to the main branch's snapshot. Your practice commit still exists; switching has not deleted it.

After `git merge practice/conflict` reports a conflict, inspect the affected file. A marker beginning `<<<<<<<` introduces the current branch's version. `=======` separates the other version; `>>>>>>>` ends it. These markers are not valid prose you should preserve. Write the intended final sentence, removing all three markers and the unwanted alternatives. `git add learning-log.md` tells Git this file's conflict is resolved. Review the staged result and use `git commit` to finish the merge.

Before proceeding, explain both branches' intended change. If one said “expected five” and the other said “observed five,” preserving the distinction may require a new sentence rather than choosing one side. Resolving syntax without preserving requirements is not successful conflict resolution.

### Recovery preserves evidence

`git revert HEAD` constructs a new commit that reverses the changes in the current commit. Your mistaken commit remains visible in history with its correction. This is useful when others may already rely on that history. A reset moves a reference instead, and some reset modes overwrite working files; it solves a different problem.

**Transfer:** a teammate already based work on your mistaken commit. Explain why a corrective commit is easier to coordinate than making the shared commit disappear. Then inspect `git log --oneline` to see the mistake and correction. If a revert encounters conflicts, resolve their meaning just as with a merge; an inverse patch is not guaranteed to apply cleanly after later changes.

Create a practice branch with `git switch -c practice/conflict`. Change the first line of `learning-log.md`, stage it and commit. Switch to main, change the same line differently, and commit. Merge the practice branch with `git merge practice/conflict`.

A conflict means Git cannot choose between overlapping changes. Read both intended meanings; do not merely remove the markers. Edit the final sentence, stage it, and commit the merge. If you want to restart resolution, `git merge --abort` returns to the pre-merge state when the working tree was clean.

Practice recovery on another branch: add and commit a deliberately mistaken note, then use `git revert HEAD`. Revert creates an inverse commit and preserves shared history. `git reflog` records recent local reference movements; inspect it before attempting recovery from an accidental reset. Avoid destructive reset commands while learning.

Write what changed in HEAD, the index and the working tree during resolution in `decisions/002-git.md`. Return to main. Later lessons do not depend on the practice branch.

```check
file decisions/002-git.md
git-branch main
```
