---
title: 1.3 — The First Commit
runtime: none
---

A **commit** is a snapshot of your project that Git keeps forever, with your name, the time, and a message saying what changed. Making one is a two-step move, and the two steps are the most important idea in Git.

## Two steps: stage, then commit

Think of packing a box to post. First you choose what goes in the box. Then you seal it and write a label. In Git:

1. **`git add`** puts a file's current content into the box. The box is called the **staging area**.
2. **`git commit`** seals the box: everything in the staging area becomes one snapshot, with a message.

Why not just "save everything"? Because you often change several things at once, and a good history keeps them apart: one commit for the bug fix, another for the new feature. The staging area lets you choose what goes into each snapshot.

## Stage hello.js

```powershell
git add hello.js
```

You'll see this:

```text
PS C:\Users\you\Documents\spreadsheet> git add hello.js
warning: in the working copy of 'hello.js', LF will be replaced by CRLF the next time Git touches it
```

It's a **warning**, not an error: the file was staged. It's about **line endings**. Every line of a text file ends with an invisible marker. Windows traditionally uses two characters (called CR and LF), while macOS and Linux use one (LF). Git for Windows is set up to convert between them, and it's telling you it would convert this file. Nothing is wrong. Lesson 1.5 settles line endings for the whole project, and the warning stops.

Now look at the state:

```powershell
git status
```

```text
PS C:\Users\you\Documents\spreadsheet> git status
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
        new file:   hello.js

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        exit-code.js
        greet.py
        hello.py
        playground/
```

`hello.js` moved from *Untracked* to **Changes to be committed**: it's in the box. Nothing else is.

## Commit

```powershell
git commit -m "Add hello.js, a first JavaScript program"
```

```text
PS C:\Users\you\Documents\spreadsheet> git commit -m "Add hello.js, a first JavaScript program"
[main (root-commit) dee5d6d] Add hello.js, a first JavaScript program
 1 file changed, 2 insertions(+)
 create mode 100644 hello.js
```

`-m` gives the message on the command line. (Without `-m`, Git opens the editor you chose in lesson 1.1 for you to type one.)

What Git printed:

- **`main`**: the branch the commit was added to.
- **`(root-commit)`**: it's the first commit, the root of the history.
- **`dee5d6d`**: the start of the commit's **hash**, its unique ID. Yours will be different: it's computed from the content, your name and the exact time.
- **`1 file changed, 2 insertions(+)`**: one file, two new lines.

**Writing good messages.** A message says what the commit does, as if finishing the sentence "This commit will…": *Add hello.js*, not *added stuff* or *changes*. Months from now, the messages are how you find things.

```check
git-commits 1 -- Stage hello.js with git add, then git commit -m "your message".
git-tracked hello.js -- Commit hello.js: git add hello.js, then git commit.
git-untracked hello.py -- Only hello.js goes in this commit; hello.py comes in the next lesson.
```

## Read the history

```powershell
git log
```

```text
PS C:\Users\you\Documents\spreadsheet> git log
commit dee5d6d8d43f2490414b20065ca7aade101a6c3c (HEAD -> main)
Author: Ada Lovelace <ada@example.com>
Date:   Sat Oct 3 04:46:49 2026 -0400

    Add hello.js, a first JavaScript program
```

The full hash is 40 characters; the 7 Git showed earlier are its start, and that's enough to identify it. `(HEAD -> main)` means this is where you are now: **HEAD** is Git's name for "the commit you're on", and it points at the branch `main`.

If the log is longer than the terminal, Git shows one screen at a time: press **Space** for more and **q** to quit.

Run `git status` once more. `hello.js` isn't listed at all now, because it's committed and hasn't changed since. Git only lists files that differ from the last commit.

## Your turn: commit one file on its own

Commit `playground/README.md`, and **only** that file, in a commit of its own. Write a message that finishes the sentence "This commit will…".

Then try your alias from lesson 1.1: `git lg`.

```check
git-tracked playground/README.md -- Stage the README (git add playground/README.md), then commit.
git-untracked playground/shout.py label="nothing else from the playground is committed yet" -- Stage just the README, not the whole playground folder.
git-untracked hello.py label="hello.py is still waiting for the next lesson"
```

The checks see which files are in the last commit. They can't judge your message: read it in `git lg` and ask whether it would make sense to someone else in six months.

```hints
nudge: The same two steps as `hello.js`: stage, then commit.
concept: `git add` takes a path, and a path can go inside a folder: `git add playground/README.md` stages that one file. `git add playground` would stage the whole folder.
shape: `git add` with the README's path, then `git commit -m` with your message.
answer: ~~~powershell
git add playground/README.md
git commit -m "Add a README that explains the playground"
git lg
~~~
```
