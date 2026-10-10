---
title: 1.5 — What Not to Commit, and Line Endings
runtime: none
---

Some files must never go into the history. The most important kind is a **secret**: a password, or a key that proves your server is your server. Anything committed stays in the history even after you delete the file, and once it's pushed to GitHub, anyone who can see the repository can find it.

This lesson makes Git ignore a secrets file, and settles the line-ending warnings from the last two lessons.

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

Each line is a name or pattern to ignore. Run `git status` again:

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
