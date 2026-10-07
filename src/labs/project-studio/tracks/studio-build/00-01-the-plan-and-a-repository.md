---
title: 0.1 — The Plan, the Backlog and a Repository
track: Build Your Own Game Studio
runtime: none
concepts: git, agile, backlog
problem: A program as big as a game studio is built over months. How do you start it so that every change is recorded, every goal is written down, and the project works the same on every computer?
---

Over this series you'll build a desktop game studio from an empty folder: a window with a scene tree, an inspector, a viewport you drag things around in, undo, a script editor, physics, tilemaps, animation, export, and a trainer that teaches game characters by Q-learning. It is the same kind of program as the Game Studio in UpSkillOS, written by you, one small step at a time.

No experience of making software or making games is assumed. A game studio has three parts, and you'll build all three:

- The **engine** runs a game. Many times a second it works out where everything is now (the player moved, a coin was picked up) and draws the result. Each drawing is a **frame**; a game that draws 60 frames a second looks smooth.
- The **editor** is where a game is made: you place things in a level, set their properties, and attach code that says how they behave, without writing the whole game by hand.
- The **game** itself is data the editor saves (what's in each level, and where) plus the code attached to it. The engine reads both and plays them.

So the series teaches two crafts at once: how software is built (tools, tests, design, teamwork), and how games work (frames, movement, collisions, levels). Each new idea from either is explained when it first matters.

How the series works:

- **Every line of the studio is typed by you.** No file arrives finished.
- **Every step is small and runs.** Each one adds a few lines and ends with something you can run: a test passes, the app starts, or something new appears.
- **Every line is explained,** first by what it does to the data, then by why it's written that way.
- **It's built the way teams build software:** in **sprints**, short stretches of work that each end with a working program. This first sprint, Sprint 0, sets up the tools.

You need to be able to type commands in a terminal and know what Git is for. If either is new, do **Build a Spreadsheet**, lessons 0.1 to 1.6, first: they teach the terminal, installing programs and Git from the beginning. The commands this lesson uses are all explained again here.

## Make the project's folder

1. Click **Choose folder…** in the middle of this window.
2. Go to your **Documents** folder, make a new folder named `studio`, select it and click **Select Folder**.

The terminal at the bottom now starts in `studio`. Type `pwd` and press Enter to see its path.

## A repository

Type:

```powershell
git init
```

```text
Initialized empty Git repository in C:/Users/you/Documents/studio/.git/
```

- `git init` makes a hidden folder, `.git`, inside `studio`. That folder is the **repository**: Git's database of every saved version of the project.
- Nothing is saved in it yet. A version is saved only when you **commit**, at the end of this lesson.
- Everything outside `.git` is the **working tree**: the files you edit. Git compares the working tree with the last commit to work out what changed.

```check
git-repo -- Type git init in the terminal, in the studio folder.
```

## Line endings, the same everywhere

A text file ends each line with an invisible character. Windows programs traditionally use two characters, **CR LF** (carriage return, line feed: bytes 13 and 10); macOS and Linux use one, **LF** (byte 10). Git on Windows is often set to convert files to CR LF when it checks them out. A program that reads its own files as text then sees different bytes on different computers. (UpSkillOS's own Game Studio broke on Windows for exactly this reason.)

Create `.gitattributes`:

```text file=.gitattributes
* text=auto eol=lf
```

- `*` is a **pattern**: it matches every file name in the project.
- `text=auto` asks Git to decide for each file whether it's text or binary (an image, say). Only text files have line endings to change.
- `eol=lf` ("end of line") says every text file is checked out with LF, on every computer. Your editor works with LF files on Windows too.

```check
file .gitattributes
contains .gitattributes "eol=lf" -- The line is * text=auto eol=lf
```

## Files Git should never save

Two kinds of folder will appear in this project that must not be saved in the repository: `node_modules`, where installed libraries go (hundreds of megabytes, and any computer can install them again from a list), and `dist`, where the finished app is built (made again from the source each time).

Create `.gitignore`:

```text file=.gitignore
node_modules/
dist/
```

- Each line is a pattern. A name ending in `/` matches a folder of that name, anywhere in the project.
- Git still sees an ignored folder on disk; it just never lists it as a change and never adds it to a commit.

Try it: make an ignored folder with a file in it, and ask Git what has changed.

```powershell
mkdir node_modules
New-Item node_modules/test.txt
git status
```

(On macOS, `touch node_modules/test.txt` instead of `New-Item`.)

```predict
question: Which files does git status list as "Untracked"?
choice: .gitattributes, .gitignore and node_modules/
choice: .gitattributes and .gitignore only
choice: Nothing: nothing has been committed yet
answer: .gitattributes and .gitignore only
explain: Untracked means "in the working tree but in no commit yet": both new files are. node_modules matches the pattern node_modules/ in .gitignore, so Git leaves it out of the list, and git add would leave it out too.
```

Now delete the test folder: `Remove-Item -Recurse node_modules` (on macOS, `rm -r node_modules`).

```check
file .gitignore
contains .gitignore "node_modules/"
contains .gitignore "dist/"
missing node_modules -- Remove-Item -Recurse node_modules
```

## The backlog

Agile teams keep their goals in a **backlog**: a list of what the program should do, written from the point of view of the person using it, most important first. Each item is a **user story**, in one fixed shape: *As a (who), I want (what), so that (why)*. The *why* matters: it says when a story is really done, and what can be dropped if time runs out.

Create `BACKLOG.md`:

```markdown file=BACKLOG.md
# Backlog

### Sprint 0: tools

Goal: an empty desktop app that opens, with tests, on any computer.

- [ ] As a developer, I want every change recorded, so that I can see what changed and undo mistakes.
- [ ] As a developer, I want my code type-checked, so that mistakes show up before the program runs.
- [ ] As a developer, I want automated tests, so that I know a change didn't break what worked.
- [ ] As a user, I want the studio to open in its own window, so that it works like any desktop program.

### Definition of done

A story is done when its code is committed, its tests pass, and the app still starts.
```

- `#` starts a Markdown heading: one `#` for the title, three for a section inside it.
- `- [ ]` is a Markdown **checkbox**. You'll change `[ ]` to `[x]` as each story is done.
- The **definition of done** is one rule for every story. Without it, "done" means whatever someone feels it means that day; with it, anyone can check.
- The first story is the one this lesson finishes.

```check
contains BACKLOG.md "### Definition of done"
contains BACKLOG.md "As a user, I want the studio to open in its own window"
```

## The first commit

```powershell
git add .
git commit -m "Start the studio: backlog, line endings, ignored folders"
```

- `git add .` copies every changed file in the working tree (`.` means "this folder and everything in it") into the **staging area**: the list of what the next commit will contain. Ignored files are skipped.
- `git commit -m "…"` saves what's staged as a new version, with your message. The message says *what and why* in one line, so the history reads like a log of the project.
- If Git answers *Please tell me who you are*, set your name and email once, then commit again:

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

```check
git-commits 1 -- git add . then git commit -m "…"
git-clean -- Commit every change: git status should say "nothing to commit, working tree clean".
```

## Tick the story

The first story is done: changes are recorded. Change its `[ ]` to `[x]`:

```markdown file=BACKLOG.md
# Backlog

### Sprint 0: tools

Goal: an empty desktop app that opens, with tests, on any computer.

- [x] As a developer, I want every change recorded, so that I can see what changed and undo mistakes.
- [ ] As a developer, I want my code type-checked, so that mistakes show up before the program runs.
- [ ] As a developer, I want automated tests, so that I know a change didn't break what worked.
- [ ] As a user, I want the studio to open in its own window, so that it works like any desktop program.

### Definition of done

A story is done when its code is committed, its tests pass, and the app still starts.
```

Then commit it:

```powershell
git commit -am "Sprint 0: changes are recorded"
```

- `-a` stages every *tracked* file that changed before committing, so a change to files Git already knows needs no separate `git add`. (A brand-new file still needs `git add` first.)
- `git log --oneline` now lists two commits, newest first, each with a short **hash**: an id Git computes from the commit's contents.

```check
git-commits 2 -- git commit -am "Sprint 0: changes are recorded"
git-clean
contains BACKLOG.md "- [x] As a developer, I want every change recorded"
```

## Challenge: a story of your own

**Optional, ★.** Add a fifth user story to Sprint 0 for something you want from the studio's tools (for example, that the app can be packaged into an installer). Write it in the fixed shape, with a real *so that*. Commit it with a message that says what you added.

```hints
nudge: Start from a problem you'd have without it: what goes wrong if the tools can't do this?
concept: A user story names who wants it, what they want, and why. The why is what tells you when it's done.
shape: - [ ] As a developer, I want …, so that … — then git commit -am "Backlog: …"
```
