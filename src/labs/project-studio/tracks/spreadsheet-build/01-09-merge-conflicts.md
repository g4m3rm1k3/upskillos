---
title: 1.9 — Merge Conflicts
runtime: none
experiments: The merge stops; Resolve it
teaches: merge conflicts, merge commits
uses: branches, git merge, git push
---

In lesson 1.7, `main` hadn't moved while you worked on your branch, so merging was a fast-forward: Git just moved the name `main` along. On a team that almost never happens. While you work on your branch, other people merge theirs, and `main` moves on.

When two branches change **different** lines, Git combines them by itself, in a new commit called a **merge commit**. When both change the **same** line, Git can't know which version you want, so it stops and asks. That's a **merge conflict**. It isn't an error and nothing is broken: it's Git refusing to guess.

Every developer meets conflicts every week, and the first one is always alarming. So this lesson makes one on purpose, in the playground, where nothing important can go wrong.

## A line to disagree about

This step opens a new file, `playground/motto.txt`. Type one line:

```text file=playground/motto.txt
Build it, then break it.
```

Commit it on `main`:

```powershell
git add playground/motto.txt
git commit -m "Add a motto to the playground"
```

```check
git-branch main -- Switch to main first: git switch main
git-tracked playground/motto.txt -- git add playground/motto.txt, then git commit.
git-clean
```

## One branch changes it

Make a branch and change the motto there:

```powershell
git switch -c careful
```

```text file=playground/motto.txt
Build it, then test it.
```

```powershell
git commit -am "Test before breaking"
```

```check
git-branch careful -- git switch -c careful
contains playground/motto.txt "then test it" -- Change the line to: Build it, then test it.
git-clean -- Commit it on the branch: git commit -am "Test before breaking"
```

## Main changes it too

Meanwhile, someone changes the same line on `main`. Play that someone: switch back and change it differently.

```powershell
git switch main
```

Watch the editor: the motto goes back to *break it*, because `main` never had your branch's change.

```text file=playground/motto.txt
Build it, then ship it.
```

```powershell
git commit -am "Ship it"
```

Run `git lg` (your alias from lesson 1.1). The two branches have split: each has a commit the other doesn't.

```check
git-branch main
contains playground/motto.txt "then ship it" -- On main, change the line to: Build it, then ship it.
git-clean -- Commit it on main: git commit -am "Ship it"
```

## The merge stops

You're on `main`. Before you merge `careful` into it, predict:

```predict
question: Both branches changed the same line. What does `git merge careful` do?
choice: Fast-forwards, as in lesson 1.7
choice: Picks the newest change and makes a merge commit
choice: Stops and asks you to choose
answer: Stops and asks you to choose
explain: A fast-forward is only possible when `main` hasn't moved, and it has. Git never picks between two people's changes to the same line by itself: whichever it chose, someone's work would quietly disappear. So it stops, marks the conflict in the file, and waits for you.
verify: if (git diff --name-only --diff-filter=U) { 'Stops and asks you to choose' }
```

```powershell
git merge careful
```

```text
PS C:\Users\you\Documents\spreadsheet> git merge careful
Auto-merging playground/motto.txt
CONFLICT (content): Merge conflict in playground/motto.txt
Automatic merge failed; fix conflicts and then commit the result.
```

Look at `playground/motto.txt` in the editor. Git has written **both** versions into the file, between markers:

```text
<<<<<<< HEAD
Build it, then ship it.
=======
Build it, then test it.
>>>>>>> careful
```

- **`<<<<<<< HEAD`** to **`=======`**: the version on the branch you're on (`HEAD`, which is `main`).
- **`=======`** to **`>>>>>>> careful`**: the version from the branch you're merging in.

Run `git status`:

```text
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
        both modified:   playground/motto.txt
```

The merge is **half done**, and Git says what to do next: fix the file, `git add` it to mark it resolved, then commit. Or, if you'd rather not deal with it now, `git merge --abort` puts everything back as it was before the merge.

```check
run "git diff --name-only --diff-filter=U" stdout="playground/motto.txt" label="Git reports a conflict in motto.txt" -- Run git merge careful while on main.
```

## Resolve it

Resolving means **deciding what the line should say**, then removing the markers. It might be one side, the other, or a mix of both. Here both changes have a point, so keep both ideas:

```text file=playground/motto.txt
Build it, test it, then ship it.
```

The markers must all go: a `<<<<<<<` left in a real source file breaks the program. Then tell Git the conflict is resolved, and finish the merge:

```powershell
git add playground/motto.txt
git commit --no-edit
```

`git add` on a conflicted file means "this is resolved". `git commit --no-edit` makes the merge commit with the message Git has already prepared (*Merge branch 'careful'*) without opening an editor.

Run `git lg`: the two lines of history join again at the merge commit. Then delete the branch, which has done its job:

```powershell
git branch -d careful
```

```check
lacks playground/motto.txt "<<<<<<<" label="no conflict markers are left" -- Remove the <<<<<<<, ======= and >>>>>>> lines.
contains playground/motto.txt "test it, then ship it" -- Make the line: Build it, test it, then ship it.
git-clean -- git add playground/motto.txt, then git commit --no-edit
run "git log --merges --oneline -1" stdout="careful" label="there's a merge commit for careful"
git-no-branch careful -- git branch -d careful
```

## Your turn: a conflict of your own

Make another conflict and resolve it yourself, from start to finish:

1. On a new branch, change one line of a playground file (`motto.txt`, `README.md`, whichever you like) and commit.
2. On `main`, change the **same** line differently and commit.
3. Merge the branch into `main`. Read the conflict, decide what the line should say, and finish the merge.
4. Delete the branch and push.

```check
run "@(git log --merges --oneline).Count" stdout="2" label="there are two merge commits now" -- Merge your branch into main after resolving the conflict.
run "git grep -n -e '<<<<<<<' -e '>>>>>>>'" exit=1 label="no conflict markers anywhere in the project" -- Remove every conflict marker line, then git add the file.
git-clean -- Finish the merge with git add and git commit --no-edit.
git-pushed -- Push main: git push
```

The checks see a merge, no markers and a push. Whether your resolution says the right thing is the part only you can judge, and on a team it's the part a reviewer reads most carefully.

```hints
nudge: It's this lesson again: branch, change, commit; main, change, commit; merge.
concept: A conflict needs both branches to change the same line after they split. If the merge fast-forwards, `main` hadn't moved: make the commit on `main` before merging.
shape: `git switch -c`, edit, `git commit -am`; `git switch main`, edit, `git commit -am`; `git merge`; edit the file to remove the markers; `git add`; `git commit --no-edit`; `git branch -d`; `git push`.
answer: ~~~powershell
git switch -c shorter
# change "Build it, test it, then ship it." to "Build, test, ship."
git commit -am "Shorter motto"
git switch main
# change the same line to "Build it, test it, then ship it often."
git commit -am "Ship often"
git merge shorter
# edit motto.txt: keep one line, e.g. "Build, test, ship often.", and delete the markers
git add playground/motto.txt
git commit --no-edit
git branch -d shorter
git push
~~~
```

## Sprint 1 is done

Your project has a history, ignores its secrets and its logs, has settled line endings, and is backed up on GitHub. You've made branches, merged them, and resolved a conflict, which is the part of Git that frightens people most. You'll use all of it every day from here on, starting with sprint 2: putting a spreadsheet on the screen.
