---
title: 1.5 — What Not to Commit, and Line Endings
runtime: none
experiments: .gitignore
teaches: gitignore, secrets, line endings, wildcards
uses: environment variables, git commit
---

### The story so far

Every file in the project is committed (1.4), and `git status` says *working tree clean*: the folder matches the last commit exactly. `git diff` shows what's changed before you commit. One thing has nagged since 1.3: almost every `git add` prints *LF will be replaced by CRLF*, a warning about line endings that hasn't been explained yet.

### What this lesson builds

Two small settings files, committed with the project so that every copy of it behaves the same:

| file | contents | what it does |
|---|---|---|
| `.gitignore` | `.env` | Git never offers to commit the secrets file |
| `.gitattributes` | `* text=auto eol=lf` | every text file is stored with one kind of line ending, and the warnings stop |

Some files must never go into the history. The most important kind is a **secret**: a password, or a key that proves your server is your server. Anything committed stays in the history even after you delete the file, and once it's pushed to GitHub, anyone who can see the repository can find it.

## A file with a secret

Later in the series your server will sign share links with a secret key, read from an environment variable (lesson 0.2). During development those variables usually live in a file called `.env`. This step opens `.env`; type:

```text file=.env
SHARE_LINK_SECRET=not-a-real-secret-yet
```

It isn't a real secret yet, but treat it as one from the start.

Now look at what Git sees:

```powershell
git status
```

```text
PS C:\Users\you\Documents\spreadsheet> git status
On branch main
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        .env

nothing added to commit but untracked files present (use "git add" to track)
```

Git is offering to track `.env`. One careless `git add .` (which stages everything in the folder) and the secret is in your history.

```check
file .env
```

## .gitignore

A file called **`.gitignore`** lists names Git should pretend aren't there. This step opens `.gitignore`; type:

```text file=.gitignore
.env
```

Each line is a name or pattern to ignore.

```predict
question: `.env` is still in the folder. With `.env` written in `.gitignore`, what does `git status` say about `.env` now?
choice: It's listed under Untracked files, as before
choice: Nothing: Git acts as if it isn't there
choice: That it's ignored
answer: Nothing: Git acts as if it isn't there
explain: An ignored file disappears from `git status` and from `git add .`. The file is still on disk; Git just never offers it. To find out whether, and why, a file is ignored, you have to ask (`git check-ignore`, below).
verify: if (-not (git status --porcelain --untracked-files=all | Select-String '\.env$')) { 'Nothing: Git acts as if it isn''t there' }
```

Run `git status` again:

```text
PS C:\Users\you\Documents\spreadsheet> git status
On branch main
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        .gitignore

nothing added to commit but untracked files present (use "git add" to track)
```

`.env` has disappeared from the list. `.gitignore` itself is listed: it's a normal file, and it should be committed, so that every copy of the project ignores the same things.

To ask Git *why* a file is ignored:

```powershell
git check-ignore -v .env
```

```text
PS C:\Users\you\Documents\spreadsheet> git check-ignore -v .env
.gitignore:1:.env       .env
```

That reads: line 1 of `.gitignore`, the pattern `.env`, matches the file `.env`.

Commit `.gitignore`:

```powershell
git add .gitignore
git commit -m "Never commit .env, where secrets will live"
```

(`git add` prints the line-ending warning for `.gitignore` too. That stops in the next step.)

```check
git-ignored .env -- Put the line .env in .gitignore.
git-untracked .env -- .env must never be committed. If you committed it, ask for help before going on: it needs removing from the history.
git-tracked .gitignore -- Commit .gitignore: git add .gitignore, then git commit.
```

## Line endings, settled

**What a line ending is.** A text file is a row of bytes, one number per character, and "the end of a line" is one or two of those numbers. A file holding the two lines `hi` and `ok` is stored as:

| kind | the bytes, in hexadecimal | `\r` and `\n` |
|---|---|---|
| Windows (CRLF) | `68 69 0D 0A 6F 6B 0D 0A` | `h i \r \n o k \r \n` |
| macOS, Linux (LF) | `68 69 0A 6F 6B 0A` | `h i \n o k \n` |

`0A` is **LF**, *line feed*, written `\n` in Python and JavaScript strings. `0D` is **CR**, *carriage return*, `\r`, left over from typewriters, which needed two moves to start a line. The same two lines are 8 bytes one way and 6 the other. To Git, those are two different files, and a project edited on both kinds of computer would show every line as changed. You can see a file's bytes in PowerShell with `Format-Hex hello.js`.

The warning you've seen on every `git add` comes from a setting Git for Windows makes for you (`core.autocrlf`). It converts line endings as files go in and out of the repository. That made sense when Windows tools needed Windows line endings, but today's editors, Node and Python all handle the single-character (LF) endings everywhere.

The professional fix is to decide line endings for the project itself, in a file called **`.gitattributes`** that's committed with the code. Then every computer that checks the project out behaves the same, whatever its settings. This step opens `.gitattributes`; type:

```text file=.gitattributes
* text=auto eol=lf
```

It reads: for every file (`*`), let Git detect whether it's text (`text=auto`), and give text files LF line endings (`eol=lf`), in the repository and in your folder.

```powershell
git add .gitattributes
git commit -m "Store and check out text files with LF line endings"
```

The editor here writes LF endings, so from now on `git add` has nothing to warn about.

One catch, so it doesn't puzzle you later: PowerShell's own file commands, like `Set-Content`, write Windows line endings. A file made that way gets the opposite warning (`CRLF will be replaced by LF`). That's harmless too: Git stores it with LF either way.

```check
git-tracked .gitattributes -- Commit .gitattributes.
contains .gitattributes "eol=lf"
git-clean -- Commit everything except .env (which is ignored); git status should say the working tree is clean.
```

## Your turn: ignore a whole kind of file

Programs often write **log files**, records of what they did while running, with names like `debug.log` or `server.log`. They change on every run and belong to your computer, not to the project's history.

Make Git ignore **every** file whose name ends in `.log`, in any folder of the project. Prove it: create `playground/debug.log` (anything in it), and check that `git status` doesn't list it. Ask Git why with `git check-ignore -v`. Then commit your change to `.gitignore`.

```check
git-ignored playground/debug.log -- Add a pattern to .gitignore that matches every name ending in .log.
git-ignored server.log label="a .log file at the top of the project is ignored too" -- Your pattern should match any .log file, not just debug.log.
git-ignored .env label=".env is still ignored" -- Keep the .env line in .gitignore.
git-clean -- Commit .gitignore.
```

```hints
nudge: You don't want a line per file name. You want one line that matches them all.
concept: In `.gitignore`, `*` matches any run of characters in a name: `*.tmp` matches `a.tmp`, `notes.tmp` and so on. A pattern without a `/` in it matches in every folder.
shape: One new line in `.gitignore`, under `.env`, then a commit.
answer: ~~~text
.env
*.log
~~~
~~~powershell
git commit -am "Never commit log files"
~~~
```
