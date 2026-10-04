---
title: 1.2 — Saving Your Work with Git
runtime: none
---

Sooner or later, this happens to everyone: the game worked an hour ago, you've changed six things since, now it doesn't, and you can't remember exactly what you changed. Or you try an idea, it's worse, and you want yesterday's version back, which is gone, because saving a file replaces it.

**Version control** fixes both. It keeps every saved version of the whole project, says exactly what changed between any two, and can bring any of them back. **Git** is the version control system almost every software team uses, and from this lesson on, the series uses it the way teams do. This lesson also starts a **backlog**: a written list of what the game still needs, so "what do I build next?" has an answer.

## Is Git installed?

**Build:** check that the `git` program is on your `PATH` (lesson 0.1).

```powershell
git --version
```

```text
git version 2.45.1.windows.1
```

Any version from 2.28 on works. If PowerShell says `git` isn't recognized, install **Git for Windows** from [git-scm.com](https://git-scm.com/download/win), accepting the installer's defaults, then close and reopen this window so the terminal sees the new `PATH`. (On macOS, typing `git` offers to install Apple's developer tools, which include it.)

```check
run "git --version" stdout="git version" label="git runs from the terminal" -- Install Git for Windows from git-scm.com, then close and reopen this window.
```

## Tell Git who you are

**Build:** give Git the name and email it records with your work.

Use your own name and email (an email you don't mind other people seeing, if you ever publish the project):

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

**Understand.** Every saved version Git makes records who made it. `git config` stores settings, and `--global` puts them in a file in your user folder (`.gitconfig`) that applies to every project on this computer, so you only do this once. The third setting names the first line of history in each new project `main`, the name most teams now use. (Older Git versions call it `master`, which you'll still see in older projects.)

```check
git-config user.name -- Run git config --global user.name "Your Name", with your name.
git-config user.email -- Run git config --global user.email "you@example.com", with your email.
```

## A repository

**Build:** turn the project folder into a Git repository.

In the terminal, in your `forge` folder:

```powershell
git init
```

```text
Initialized empty Git repository in C:/Users/you/Documents/forge/.git/
```

> **Repository**: a project folder whose history Git keeps. The history lives in a hidden folder named `.git` at the top of the project; your own files around it are the **working tree**, the version you're editing now.

**Understand.** `git init` only creates `.git`; it doesn't save anything yet. Everything Git knows about this project will be inside that one folder: delete `.git` and the history is gone, but your current files stay. Copy the project folder, `.git` included, and the copy has the complete history. (The file tree hides `.git`, as most editors do, because you never edit it by hand.)

Ask Git what it sees:

```powershell
git status
```

```text
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.venv/
	breakout.py
	check_setup.py
	...
```

**Untracked** means "in the folder, but not part of the history". Notice `.venv/` in the list. It shouldn't be.

```check
git-repo -- Run git init in the forge folder.
```

## Ignore what's generated

**Build:** tell Git never to save the environment.

Lesson 0.2 made the rule: `.venv` is **generated** from `requirements.txt`, it's specific to this computer, and it's never shared. Python also makes `__pycache__` folders of compiled bytecode next to your files when one module imports another, which are generated too. Create a file named `.gitignore`:

```text file=.gitignore
# Generated: rebuilt from requirements.txt with python -m venv .venv
.venv/

# Generated: Python's compiled bytecode
__pycache__/
```

**Understand.** Before Git lists or saves a file, it compares the file's path with every pattern in `.gitignore`. A pattern ending in `/` matches a folder of that name anywhere in the project, with everything inside it. Lines starting with `#` are comments, for the people reading the file. Run `git status` again: `.venv/` is gone from the list, and `.gitignore` itself has appeared, because it's a file you wrote and should be saved like any other.

Git may print `warning: in the working copy of '.gitignore', LF will be replaced by CRLF`. Windows and macOS end lines of text with different characters, and Git for Windows converts between them so a project works on both. It's harmless.

> **Engineer:** a repository holds what people **write**, never what's **generated** from it. The same rule will keep build folders, caches, log files, databases of test data and secrets (passwords and keys, Chapter 30) out of every project you make.

```check
git-ignored .venv -- Create .gitignore in the forge folder (with the dot at the start), containing the line .venv/
file .gitignore
```

## The first commit

**Build:** save the first version of the project.

```powershell
git add .
git status --short
git commit -m "Start Breakout: a window and a game loop"
```

```text
A  .gitignore
A  breakout.py
A  check_setup.py
...
[main (root-commit) 46a93d4] Start Breakout: a window and a game loop
 10 files changed, ...
```

(Your list of files, your counts and the 7-character number after `root-commit` will differ: the files are whatever is in your folder, and the number is explained in the next step.)

> **Commit**: a saved snapshot of the whole project, with a message saying what changed and why, who made it, and when. The history of a repository is its chain of commits.

**Understand: the three places a file can be.** Git separates choosing what to save from saving it:

```text
working tree  ──git add──▶  staging area  ──git commit──▶  repository
(your files)                (the next commit,               (history in .git)
                             being assembled)
```

- `git add .` copies the current content of every file in `.` (the current folder, and everything under it, minus what `.gitignore` excludes) into the **staging area**, also called the **index**. `git status --short` shows `A`, for *added to the staging area*; before that it showed `??`, for *untracked*.
- `git commit` makes a snapshot of exactly what's in the staging area, not your working tree. `-m` gives the message.

The two steps exist so that a commit can contain just *some* of your changes: fix two unrelated things, then add and commit each one separately, so each commit means one thing.

**Commit messages** are for the person reading the history later, often you. The common convention: one short line saying what the commit does, as an instruction ("Add the paddle", not "added paddle stuff"), so the history reads as a list of changes.

```check
git-commits 1 -- Run git add . and then git commit -m "Start Breakout: a window and a game loop".
git-clean -- Every file must be committed: run git add . and git commit again.
```

## What a commit really is

**Build:** look inside Git, to see how a commit is stored.

```powershell
git log
```

```text
commit 46a93d46ecda7a3604097199735d5392becb4157
Author: Your Name <you@example.com>
Date:   Sun Oct 4 09:51:21 2026 -0400

    Start Breakout: a window and a game loop
```

The long number is the commit's **hash**. Yours is different, because it's computed from everything in the commit, including your name and the exact second you committed. Now look at the commit itself, the way Git stores it:

```powershell
git cat-file -p HEAD
git cat-file -p "HEAD^{tree}"
```

```text
tree e7d0e40b434562acf5549375fd4a41116a161f6e
author Your Name <you@example.com> 1791121881 -0400
committer Your Name <you@example.com> 1791121881 -0400

Start Breakout: a window and a game loop

100644 blob a230a78aea291ec7c0c35eefbc89b3898612a118	.gitignore
100644 blob b80e3222ab264bd7cafb376749bd18814fd66776	breakout.py
...
```

**Understand: how Git stores history.** A commit is a short piece of text, and so is everything else Git stores:

- A **blob** is the content of one file, nothing else, not even its name.
- A **tree** is a folder listing: for each entry, its name and the hash of the blob (or, for a subfolder, the tree) holding its content.
- A **commit** names one tree (the whole project at that moment), the commit before it (its **parent**; the first commit has none), the author, and the message.

> **Hash**: a fixed-length number computed from content, here 40 hexadecimal digits, by an algorithm (SHA-1) designed so that any change to the content, even one character, gives a completely different number, and two different contents practically never give the same one.

Every object is stored under the hash of its own content, so the hash is its name. That gives Git its guarantees. Two files with identical content are stored once, because their blobs have the same hash. And history can't be changed quietly: change one character of an old file, and its blob's hash changes, so the tree listing it changes, so the commit naming that tree changes, and every commit after it, since each names its parent's hash.

`HEAD` is Git's name for "the commit you're on now". `HEAD^{tree}` means "that commit's tree".

```predict
question: You change one character in `breakout.py` and commit again. Which of these get new hashes?
choice: Only breakout.py's blob
choice: breakout.py's blob, the project's tree, and the new commit
choice: Every file's blob, the tree and the commit
answer: breakout.py's blob, the project's tree, and the new commit
explain: The other files' contents didn't change, so their blobs are the same objects as before, with the same hashes: the new tree simply lists them again. `breakout.py`'s content changed, so it has a new blob; the tree's listing changed, so it's a new tree; and the commit is new anyway, with the old commit as its parent. That's why a commit is cheap even in a huge project: only what changed is stored again.
```

> **Engineer:** naming data by a hash of its content, **content addressing**, appears far beyond Git: package caches (pip's `Using cached` in lesson 0.2), build systems that skip work whose inputs haven't changed, and Forge's own asset import cache in Chapter 17. Whenever you need "has this changed?" or "have I seen this before?", a content hash answers it.

## A backlog

**Build:** a written list of what Breakout still needs.

> **User story**: one feature, written from the point of view of the person who wants it: *As a* (who), *I want* (what), *so that* (why). **Acceptance criteria**: the checks that say when the story is finished. **Backlog**: the ordered list of stories not done yet.

Create `BACKLOG.md`. The `.md` means it's written in **Markdown**, a plain-text format where a line starting with `#` is a heading (`###` a smaller one) and `- [ ]` is a checkbox, which GitHub and most editors display nicely:

```markdown file=BACKLOG.md
# Breakout backlog

Stories are written from the player's side: who wants it, what, and why.
A story is done when every acceptance check under it is ticked and the work is committed.

# To do

### Move the paddle
As a player, I want to move a paddle with the arrow keys, so that I can get under the ball.
- [ ] Left and right arrows move the paddle at the same speed on any computer.
- [ ] The paddle never leaves the screen.

### Bounce the ball
As a player, I want a ball that bounces off the walls and my paddle, so that there's something to keep in play.
- [ ] The ball bounces off the left, right and top walls.
- [ ] The ball bounces up off the paddle, steered by where it hits.

### Lose a life
As a player, I want to lose a life when I miss the ball, so that missing matters.
- [ ] Missing the ball costs one of three lives, and the ball comes back.

### Break bricks and score
As a player, I want to break bricks with the ball, so that I have a goal.
- [ ] A ball that hits a brick removes it, bounces, and scores 10 points.
- [ ] The score and lives are shown on screen.

### Win or lose
As a player, I want the game to end when I clear the wall or run out of lives, so that I know how I did.
- [ ] No lives left shows "Game over" and stops play.
- [ ] No bricks left shows "You win!" and stops play.

# Done

### Open the game
As a player, I want the game to open in a window and close when I'm finished, so that I can play it.
- [x] A 640 × 480 window titled Breakout opens.
- [x] The close button and Escape both quit.
```

Commit it:

```powershell
git add BACKLOG.md
git commit -m "Add the backlog"
```

**Understand.** A story says **what** and **why**, never **how**: "move a paddle with the arrow keys", not "use `get_pressed`". The how is decided while building, and can change without the story changing. The acceptance criteria are written so that each one is either clearly true or clearly false, because "the paddle feels nice" can't be ticked, but "never leaves the screen" can. Each of the next lessons finishes one or two of these stories, and you'll tick them and move them to *Done* as you go.

> **Engineer:** writing down what's wanted, separately from the code, is the first step of the **agile** way of working this series follows: keep a list of small, user-visible goals, build one at a time, and have something working after each. It's also the start of a skill this series builds towards: describing work precisely enough that someone else, a teammate or an AI, could build it, and you could check what they built against the criteria.

```check
git-tracked BACKLOG.md -- Run git add BACKLOG.md, then git commit -m "Add the backlog".
git-message "backlog"
```

## See a change, then undo it

**Build:** change a file, see exactly what changed, and throw the change away.

In `breakout.py`, change the caption to `"Breakout!!!"` and save. Then:

```powershell
git status --short
git diff
```

```text
 M breakout.py
diff --git a/breakout.py b/breakout.py
index 8748048..74e7c43 100644
--- a/breakout.py
+++ b/breakout.py
@@ -19,7 +19,7 @@ WIDTH, HEIGHT = 640, 480

 pygame.init()
 screen = pygame.display.set_mode((WIDTH, HEIGHT))
-pygame.display.set_caption("Breakout")
+pygame.display.set_caption("Breakout!!!")
 clock = pygame.time.Clock()

 frames = 0
```

**Understand.** `M` means *modified since the last commit*. `git diff` compares your working tree with the staging area and prints the difference as a **diff**: lines starting with `-` were removed, lines starting with `+` were added, and lines starting with a space are unchanged **context**, so you can see where the change is. `@@ -19,7 +19,7 @@` says the shown part starts at line 19 in both versions and is 7 lines long in each, and the text after it is the nearest line above that starts at the left margin, to help you find the place. (If your file differs a little from the lesson's, your numbers will too.)

Now throw the change away:

```powershell
git restore breakout.py
git status --short
```

`git restore` replaces the file in the working tree with its last committed version, and `git status --short` prints nothing: no changes. The caption is `"Breakout"` again. That's the undo lesson 0.1's `Remove-Item` didn't have, for any file Git has saved.

**Careful:** `git restore` throws away uncommitted changes for good. Git can only bring back what was committed.

> **Engineer:** commit often, in small steps that each work. Each commit is a point you can return to, and a small diff is one you can read and understand. A day of changes in one commit is almost as hard to undo as no commit at all.

```check
lacks breakout.py "Breakout!!!" -- Run git restore breakout.py to throw the change away.
git-clean
```

## Your turn: two stories of your own

**Build, on your own:** add two stories you'd like Breakout to have, and commit them.

What would make the game better? A pause key, sound when a brick breaks, faster balls as the wall shrinks, a high score that's remembered: your choice. For each one, write it the way the others are written:

- a `###` heading naming it;
- one *As a player, I want …, so that …* sentence;
- at least one acceptance criterion as a `- [ ]` checkbox, clear enough to be true or false.

Put them under *To do*, after the existing stories. Then add the file to the staging area and commit it, with a message that mentions **stories**.

```hints
nudge: Look at one existing story and copy its exact shape: a `###` line, an "As a player, I want …, so that …" line, then `- [ ]` lines. Then check `git status --short`: what does it say about `BACKLOG.md` after you save, after `git add`, and after `git commit`?
concept: A good acceptance criterion can be checked by watching the game. "Pressing P stops everything moving, and pressing it again continues" can be checked; "the game is more fun" can't. Committing is the same two steps as before: `git add BACKLOG.md` to stage it, then `git commit -m "..."`.
shape: Two new `###` sections under *To do*, each with three lines or more, then `git add BACKLOG.md` and `git commit -m "Add two stories: ..."`.
answer: For example:

~~~markdown
### Pause
As a player, I want to pause the game with P, so that I can stop without losing a life.
- [ ] Pressing P stops the ball and paddle; pressing it again continues.
- [ ] "Paused" is shown while the game is paused.

### Faster ball
As a player, I want the ball to speed up as the wall gets smaller, so that the game gets harder as I get better.
- [ ] Every 10 bricks broken, the ball's speed goes up by 10%.
~~~

~~~powershell
git add BACKLOG.md
git commit -m "Add two stories: pause and a faster ball"
~~~

These stay in the backlog: not every story gets built, and choosing which ones to do next is part of the work. Chapter 4 builds a pause.
```

```check
matches BACKLOG.md "(As a player[\s\S]*?){8}" label="BACKLOG.md has two more stories (eight in all)" -- Each story needs its own "As a player, I want ..." line.
git-message "stories" -- Commit with a message that mentions stories, e.g. git commit -m "Add two stories: pause and a faster ball".
git-clean -- Every change must be committed.
```

## What did we actually learn?

- **Version control** keeps every committed version of the whole project and shows exactly what changed. Commit small, working steps with messages that say what each one does.
- **Working tree, staging area, repository**: choose what goes into a commit, then commit it.
- **Commits are content-addressed snapshots**: blobs, trees and commits, each named by the hash of its content. Unchanged files cost nothing, and history can't change silently.
- **Repositories hold what you write, not what's generated**: `.gitignore` keeps `.venv` and caches out.
- **A backlog of user stories** says what's wanted and why, with acceptance criteria that are clearly true or false: the start of working in small, finished steps.

Git is the same tool in every language and every company: C#, Java, Python and JavaScript teams all use exactly these commands. What changes is the `.gitignore`: a C# project ignores `bin/` and `obj/`, a Java project `target/` or `build/`, for the same reason this one ignores `.venv/`. They're all generated.
