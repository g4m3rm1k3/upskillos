---
title: 1.4 — Your First Git Commit
runtime: python
---

You now have a working program. Before you change it again, you will learn **Git**, a tool that records snapshots of your project. Each snapshot is called a **commit**. With commits you can see what changed, undo a mistake, and work on ideas safely. Professional teams use Git for everything, so it is worth learning on day one.

A folder that Git tracks is called a **repository**, or repo.

Your `habits.py` should be the finished program from lesson 1.3, with `is_valid_name` and the validation in `main`.

## Check that Git is installed

In the terminal, in your project folder:

```
git --version
```

You should see a version number. If the command is not found, install Git from git-scm.com, restart the terminal, and try again.

```check
run "git --version" stdout="git version" label="Git is installed" -- Install Git from git-scm.com, then reopen your terminal.
```

## Create the repository

Turn your project folder into a repo:

```
git init
```

This creates a hidden folder called `.git` where Git keeps its records. Your own files are not changed. Everything Git knows about the project lives in that folder.

```check
git-repo -- Run git init inside your project folder, the one that contains habits.py.
```

## Tell Git who you are

Every commit records its author. Set your name and email once. Use your own values:

```
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

`git config` writes a setting. `--global` means it applies to every repo on your computer, so you only do this once.

```check
git-config user.name -- Run git config --global user.name "Your Name"
git-config user.email -- Run git config --global user.email "you@example.com"
```

## Ignore generated files

Some files should never be recorded: ones that Python or your editor creates automatically. A file named `.gitignore` lists patterns Git should skip. Create it in your project folder.

```text file=.gitignore
__pycache__/
*.pyc
```

Python creates a folder named `__pycache__` holding compiled `.pyc` files when one of your files imports another. You will see it from Chapter 5 on. Each line in `.gitignore` is a pattern. `__pycache__/` matches that folder, and `*.pyc` matches any file ending in `.pyc`, because `*` stands for any characters.

```check
file .gitignore -- Create a file named .gitignore in your project folder.
contains .gitignore "__pycache__/" label=".gitignore skips __pycache__" -- Add a line containing __pycache__/
contains .gitignore "*.pyc" label=".gitignore skips .pyc files" -- Add a line containing *.pyc
```

## Look at the status

Ask Git what it sees:

```
git status
```

It lists `habits.py` and `.gitignore` under **Untracked files**: files that exist but that Git is not recording yet.

To record a file, you first **stage** it. Staging means "include this in the next commit". Run:

```
git add habits.py .gitignore
git status
```

```predict
question: After `git add` but before `git commit`, which section of `git status` lists habits.py?
choice: Untracked files
choice: Changes to be committed
choice: Changes not staged for commit
answer: Changes to be committed
explain: Staging moves a file into the "Changes to be committed" list. It is waiting for the next commit. Nothing is recorded permanently until you commit.
```

## Make the commit

Record the snapshot with a message that says what it contains:

```
git commit -m "Add habit tracker with name validation"
```

`-m` gives the commit message in quotes. Write messages that say what changed, because you will read them later to understand your project's history. Check the log:

```
git log --oneline
git status
```

`git log --oneline` shows one line per commit. `git status` should now say `nothing to commit, working tree clean`.

```check
git-tracked habits.py label="habits.py is tracked" -- Run git add habits.py, then git commit -m "your message".
git-tracked .gitignore label=".gitignore is tracked" -- Run git add .gitignore and commit it.
git-commits 1 label="at least one commit exists" -- Run git commit -m "Add habit tracker with name validation"
git-clean label="the working tree is clean" -- Everything should be committed. Check git status for leftover files.
```

## Your turn: document and commit the project

Practice the full cycle on your own: change, stage, commit.

- Create a file called `README.md` in your project folder. Put a title line (`# Habit Tracker`) and one sentence that says what the program does.
- Stage it and commit it. Put the word `README` in your commit message.
- Afterwards the working tree must be clean, and the log must show at least two commits.

```check
file README.md label="README.md exists" -- Create README.md in the project folder.
contains README.md "Habit Tracker" label="README.md names the project" -- Write a title such as # Habit Tracker.
git-tracked README.md label="README.md is tracked by Git" -- Stage it with git add README.md and commit.
git-commits 2 label="there are at least two commits" -- Make a second commit; do not change the first one.
git-message "README" label="the latest commit message mentions README" -- Use a message such as: git commit -m "Add README".
git-clean label="the working tree is clean" -- Commit everything with git add and git commit.
```

```hints
nudge: What are the three commands you used in the lesson to go from a changed file to a recorded commit?
concept: git add stages a file, and git commit -m "message" records the staged files. The commit message here must contain the word README.
shape: Create the file, run git add README.md, then run git commit -m with a message that includes README, then check git status.
answer: Create README.md with these two lines:
~~~markdown
# Habit Tracker

A command-line tool for tracking daily habits.
~~~
Then run:
~~~
git add README.md
git commit -m "Add README"
git status
~~~
```
