---
title: 1.2 — Make the Folder a Repository
runtime: none
experiments: Before: not a repository
teaches: repository, git init, git status, hidden files, markdown
uses: git
---

Git doesn't watch every folder on your computer. It keeps history only for folders you turn into **repositories** (often shortened to *repo*). This lesson turns your project folder into one, and shows where Git keeps the history.

## Before: not a repository

Ask Git about the folder:

```powershell
git status
```

```text
PS C:\Users\you\Documents\spreadsheet> git status
fatal: not a git repository (or any of the parent directories): .git
```

Read it as you learned in lesson 0.1. `fatal:` means Git stopped without doing anything. The rest says why: it looked for a folder called `.git` here, then in each folder above this one, and found none. `.git` is where a repository keeps its history, so no `.git` means no repository.

## git init

```powershell
git init
```

```text
PS C:\Users\you\Documents\spreadsheet> git init
Initialized empty Git repository in C:/Users/you/Documents/spreadsheet/.git/
```

```predict
question: You just ran `git init`. What does `ls` show now?
choice: Nothing new: the .git folder is hidden
choice: A new folder called .git
choice: A new folder called repository
answer: Nothing new: the .git folder is hidden
explain: `git init` made a folder called `.git`, but it's marked **hidden**, so `ls` and the file tree don't show it. The next step shows how to see it.
verify: if (-not (ls | Where-Object Name -eq '.git')) { 'Nothing new: the .git folder is hidden' }
```

`init` means "initialize": start a new, empty repository here. Your files haven't changed and nothing is recorded yet. Git has only made its `.git` folder. (Git prints the path with `/` even on Windows; Git came from Linux, and Windows accepts both.)

```check
git-repo -- Run git init in the terminal (in your spreadsheet folder).
```

## The hidden .git folder

`ls` doesn't show `.git`, and neither does the file tree, because it's a **hidden** folder. Ask `ls` to show everything with `-Force`:

```powershell
ls -Force
```

```text
PS C:\Users\you\Documents\spreadsheet> ls -Force


    Directory: C:\Users\you\Documents\spreadsheet


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d--h--         10/2/2026   8:11 PM                .git
-a----         10/2/2026   8:08 PM             61 exit-code.js
-a----         10/2/2026   8:05 PM             84 greet.py
-a----         10/2/2026   8:06 PM             78 hello.js
-a----         10/2/2026   8:06 PM             66 hello.py
d-----         10/2/2026   8:10 PM                playground
```

The `h` in `d--h--` marks it hidden. (On macOS: `ls -a`.)

Everything Git knows about your project lives inside `.git`: every snapshot, every message, every branch. Two rules follow from that:

- **Don't edit anything inside `.git` by hand.** Git manages it; you use `git` commands.
- **Deleting `.git` deletes the history.** Your current files stay, but every snapshot is gone. Copying the project folder *with* `.git` copies the history too.

## git status, again

```powershell
git status
```

```text
PS C:\Users\you\Documents\spreadsheet> git status
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        exit-code.js
        greet.py
        hello.js
        hello.py
        playground/

nothing added to commit but untracked files present (use "git add" to track)
```

Line by line:

- **On branch main**: you're on the branch called `main` (lesson 1.1 set that name).
- **No commits yet**: no snapshots have been recorded.
- **Untracked files**: files Git can see in the folder but has never recorded. `playground/` with a `/` is a whole folder of untracked files, listed once. (The empty `terminal\deep\deeper` folders from lesson 0.1 aren't counted: Git tracks files, and a folder with no files in it is invisible to Git.) Git doesn't record a file until you tell it to, so that nothing ends up in your history by accident.
- The lines in brackets are hints: the command that would act on what's listed.

`git status` is the command you'll run most. Whenever you're unsure what state the project is in, run it. It never changes anything.

```check
git-repo
```

## Your turn: a README for your playground

Almost every repository has a file called `README.md` that says what it is. The `.md` means **Markdown**: plain text where a line starting with `# ` is a heading and a blank line separates paragraphs. GitHub shows a folder's README as a formatted page.

Create `playground/README.md`. Give it a heading and a sentence or two, in your own words, saying what the playground is for. Then predict what `git status` will list, and run it to see.

```check
file playground/README.md -- Create README.md inside the playground folder.
matches playground/README.md "^# \S" label="it starts a line with a heading" -- Start a line with # and a space, then the heading's text.
run "git status --porcelain" stdout="?? playground/" label="git sees the playground as untracked"
```

The checks look for a heading. Whether the sentence explains the playground well is up to you.

```hints
nudge: The editor makes the file as soon as you type into it. Type the path, with the folder, when you create it.
concept: Markdown is just text. `# Playground` on a line of its own is a heading; ordinary lines are paragraphs. `git status` lists the new file inside the `playground/` folder it's already listing, so the list doesn't get longer.
shape: A heading line, a blank line, then a sentence.
answer: ~~~markdown
# Playground

Experiments: small files I change, run and break to see how things work, apart from the real project.
~~~
```
