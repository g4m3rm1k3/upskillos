---
title: 1.2 — Saving Your Work with Git
runtime: none
---

In the next two lessons you'll take `ci_report.py` apart: move its functions into several files, change how it starts, delete the original. Halfway through, something will break, and it's easy to lose track of what you've changed and impossible to get yesterday's working version back, because saving a file replaces it.

**Version control** fixes that. It keeps every saved version of the whole project, shows exactly what changed between any two, and brings any of them back. **Git** is the version control system almost every software team uses. This lesson sets it up and saves the report as it is now, working, so that whatever happens next, you can always get back here.

## Is Git installed?

```powershell
git --version
```

```text
git version 2.52.0.windows.1
```

Any recent version works. If PowerShell says `git` isn't recognised, install **Git for Windows** from [git-scm.com](https://git-scm.com/download/win), accepting the installer's defaults, then close and reopen this window so the terminal sees the new `PATH` (lesson 0.1).

```check
run "git --version" stdout="git version" label="git runs from the terminal" -- Install Git for Windows from git-scm.com, then close and reopen this window.
```

## Tell Git who you are

Every saved version records who made it. Use your own name and an email you don't mind other people seeing, if you ever publish the project:

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

`git config` stores a setting; `--global` stores it in a file in your user folder (`.gitconfig`) that applies to every project on this computer, so you do this once. The third line names the main line of history in new projects `main`, which most teams now use. (You'll still see the older name, `master`, in older projects.)

If you've done this before, for another series, there's nothing to change.

```check
git-config user.name -- Run git config --global user.name "Your Name", with your name.
git-config user.email -- Run git config --global user.email "you@example.com", with your email.
```

## A repository

In the terminal, in the `ci-toolkit` folder:

```powershell
git init
```

```text
Initialized empty Git repository in C:/Users/you/Documents/ci-toolkit/.git/
```

> **Repository** (or *repo*): a project folder whose history Git keeps. The history lives in a hidden folder inside it, `.git`.

**How it works.** `git init` creates `.git` and nothing else. Your files are untouched, and Git isn't saving anything yet: you'll tell it what to save, and when. Everything Git knows about this project is inside `.git`, so deleting that folder deletes the history (and nothing else), and copying the project folder copies its history with it.

Now ask Git what it sees:

```powershell
git status
```

```text
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.venv/
	about.py
	ci_report.py
	data/
	explore/
	hello.py
	requirements.txt
```

**Untracked** means "in the folder, but not part of any saved version". Notice `.venv/` in the list.

```check
git-repo -- Run git init in the ci-toolkit folder.
```

## Ignore what's generated

`.venv` shouldn't be saved. It's built from `requirements.txt` (last lesson), it's tens of megabytes, and it contains paths that only work on this computer. Saving it would be like saving a printout alongside the document it was printed from. Create a file called `.gitignore` (with the dot at the start) in the `ci-toolkit` folder:

```text file=.gitignore
.venv/
__pycache__/
```

Run `git status` again: `.venv/` has gone from the list, and `.gitignore` has appeared.

**How it works.** Before listing untracked files, Git reads `.gitignore` and skips anything that matches a line in it. A trailing `/` means "a folder with this name, and everything inside it". `__pycache__/` is the second thing to ignore: when Python imports one of your files, it saves a translated copy (the **bytecode** from lesson 0.1's compile step) in a `__pycache__` folder, so it can skip compiling next time. You'll start seeing those folders in the next lesson. Like `.venv`, they're generated from your files, so they don't belong in the history.

`.gitignore` itself *is* saved: it's part of how the project is set up, and everyone who works on it should ignore the same things.

```check
git-ignored .venv -- Create .gitignore in the ci-toolkit folder, with the dot at the start, containing the line .venv/
git-ignored __pycache__/stats.cpython-313.pyc label="Git ignores __pycache__ folders" -- Add a second line to .gitignore: __pycache__/
```

## The first commit

Saving a version takes two commands:

```powershell
git add .
git commit -m "The CI report from Chapter 0"
```

```text
[main (root-commit) 8b5a0b9] The CI report from Chapter 0
 41 files changed, 690 insertions(+)
 create mode 100644 .gitignore
 create mode 100644 about.py
 ...
```

(Your ID and counts will differ: they depend on exactly what's in your folder.)

You may also see lines like *warning: in the working copy of 'about.py', LF will be replaced by CRLF the next time Git touches it*. They're harmless: Windows and other systems end lines of text differently, and Git for Windows converts between the two so files look right on every computer.

> **Commit**: a saved version of the whole project, with a message saying what changed and why. **Staging area**: the set of changes that will go into the next commit.

### How it works

Git saves in two steps on purpose:

1. **`git add .`** copies the current content of every changed file (`.` means "this folder and everything in it", minus what's ignored) into the **staging area**. Nothing is saved in the history yet. You're assembling the next version.
2. **`git commit -m "..."`** takes the staging area as it is and saves it as a new **commit**: a complete snapshot of every tracked file, plus your name, the time, the message, and a link to the commit before it.

Why two steps? Because a real change often touches several files, and you may want to save some changes together and others separately: `git add ci_report.py` stages just that one file. The staging area lets you decide what one commit means.

Each commit gets an ID, here `8b5a0b9` (yours will differ). It's the start of a long number Git computes from the commit's entire contents (a **hash**, like the dictionary keys in lesson 0.6). Change one character anywhere in the project's history and every ID after it changes, which is how Git can tell that a history hasn't been tampered with. Git also stores each *file's* content under the hash of that content, so a file that's the same in a hundred commits is stored once.

**Write messages for the reader in six months.** Not "changes" or "fix", but what the commit does: *"Read the runs file from the command line"*, *"Fix the median for even counts"*.

```check
git-commits 1 -- Run git add . and then git commit -m "The CI report from Chapter 0".
git-clean -- Every file must be committed: run git add . and git commit again.
git-tracked ci_report.py
```

## See a change, then undo it

Change the header in `ci_report.py`: replace `{'test':<15}` with `{'TEST':<15}`, and save. Then:

```powershell
git status --short
git diff
```

```text
 M ci_report.py
diff --git a/ci_report.py b/ci_report.py
index 38749c4..dcd749c 100644
--- a/ci_report.py
+++ b/ci_report.py
@@ -80,7 +80,7 @@ if len(sys.argv) != 2:
 rows = load_runs(sys.argv[1])
 seconds_by_test, results_by_test = group_by_test(rows)
 
-print(f"{'test':<15}{'runs':>5}{'failed':>8}{'median':>8}{'mean':>8}{'slowest':>9}  verdict")
+print(f"{'TEST':<15}{'runs':>5}{'failed':>8}{'median':>8}{'mean':>8}{'slowest':>9}  verdict")
 flaky = []
```

**How to read a diff.** `git diff` compares your files with the last commit. `---` is the old version and `+++` the new one. `@@ -80,7 +80,7 @@` says "7 lines starting at line 80 in both". Lines starting with `-` were removed, lines with `+` were added, and the unmarked lines around them are context, so you can see where the change is. A changed line shows as the old line removed and the new one added. `M` in the short status means *modified*.

Now throw the change away:

```powershell
git restore ci_report.py
git status --short
```

`git status --short` prints nothing: the file is back exactly as it was in the last commit. That's the safety net. In the next lessons, whenever a change goes wrong, `git restore` takes you back to the last version that worked, and `git diff` shows you exactly what you changed since.

**Be careful with it.** `git restore` throws away uncommitted changes for good. They were never saved, so Git has no copy. Commit when something works; restore only what you're sure you don't want.

```check
lacks ci_report.py "'TEST'" -- Run git restore ci_report.py to throw the change away.
git-clean -- Run git restore ci_report.py, or commit any changes you want to keep.
```

## The history

```powershell
git log --oneline
```

```text
8b5a0b9 (HEAD -> main) The CI report from Chapter 0
```

One commit, so far. `HEAD` means "the commit your files are based on", and `main` is the name of this line of history. Each new commit is added on top. `git log` without `--oneline` shows the full ID, the author and the date of each one.

## Try it

| Command | What to notice |
|---|---|
| `git show --stat` | The last commit: its message, and which files it changed. |
| Change two files, then `git add` just one, then `git status` | One file under *Changes to be committed* (staged) and one under *Changes not staged*. `git restore --staged FILE` un-stages it again without losing the change. |
| `git diff --staged` | The difference between the staging area and the last commit: what `git commit` would save. |
| Create `explore/scratch.txt`, then `git status` | Untracked. `git clean -n` lists untracked files that `git clean -f` *would* delete for good. Delete it yourself instead. |
| `dir .git` (or look in File Explorer with hidden files shown) | Git's own folder. You never edit anything in it by hand. |

## Your turn: a README

**No code is shown in this step.** Every project needs a **README**: the file people read first, saying what the project is and how to use it. Create `README.md` in the `ci-toolkit` folder that says, in your own words:

- what the project is (one or two sentences), and
- how to set it up and run the report, with the exact commands, including these two:

  ```text
  .venv\Scripts\python -m pip install -r requirements.txt
  python ci_report.py data/ci_runs.csv
  ```

Then **commit it** with a message that mentions the README, and finish with nothing left uncommitted.

`.md` means **Markdown**, a way of writing formatted text in a plain text file: `# Title` is a heading, a line starting with `- ` is a bullet point, and text between backticks is code. GitHub and most other tools show a README.md formatted.

```hints
nudge: Three parts: write README.md, stage it, commit it. git status tells you which part you're on.
concept: A README answers "what is this?" and "how do I run it?" for someone who has only the folder. The setup commands are the ones from lesson 1.1: make the environment, install the requirements, run the report.
shape: A # heading with the project's name, a sentence or two, then a Setup section listing python -m venv .venv, the pip install line and the run line. Then git add README.md and git commit -m "Add a README".
answer: ~~~markdown
# ci-toolkit

Reports on a CI system's test runs: which tests are flaky, slow,
failing now, or have outlier runs.

### Setup

    python -m venv .venv
    .venv\Scripts\python -m pip install -r requirements.txt

### Run the report

    python ci_report.py data/ci_runs.csv
~~~
Lines indented by four spaces are shown as code in Markdown, the same as text between triple backticks. Then

~~~powershell
git add README.md
git commit -m "Add a README with setup and run instructions"
~~~
```

```check
contains README.md "pip install -r requirements.txt" label="README.md says how to install the requirements" -- Include the line .venv\Scripts\python -m pip install -r requirements.txt
contains README.md "ci_report.py data/ci_runs.csv" label="README.md says how to run the report" -- Include the line python ci_report.py data/ci_runs.csv
git-tracked README.md -- Run git add README.md, then git commit with a message about the README.
git-message "readme" -- Commit with a message that mentions the README, e.g. git commit -m "Add a README".
git-clean -- Every change must be committed.
```

## What you've learned

- A **repository** is a project folder whose history Git keeps in `.git`. **`.gitignore`** keeps generated things like `.venv` and `__pycache__` out of it.
- **`git add`** stages changes; **`git commit`** saves the staged snapshot with a message. Each commit has an ID computed from its contents.
- **`git status`** says what's changed; **`git diff`** shows exactly how; **`git restore`** throws uncommitted changes away; **`git log`** shows the history.
- Commit whenever something works, with a message that says what and why.

Next lesson: with a safety net in place, `ci_report.py` gets taken apart into **modules**.
