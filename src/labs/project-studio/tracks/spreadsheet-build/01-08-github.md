---
title: 1.8 — Put the Project on GitHub
runtime: none
---

Your history lives in the `.git` folder on one computer. If the disk fails, it's gone. **GitHub** is a website that keeps a copy of Git repositories online. You **push** your commits to it, and you can get them back on any computer. It's also where other people can see your work and where, later in this series, a robot will test every push.

A copy of your repository somewhere else is called a **remote**.

## A GitHub account and an empty repository

1. If you don't have a GitHub account, create one at **https://github.com**.
2. Click **+** at the top right, then **New repository**.
3. Name it `spreadsheet`. Choose **Public** (anyone can see it, useful for showing your work) or **Private** (only you).
4. **Leave every "Initialize this repository with" option off**: no README, no .gitignore, no license. Your project already has history; a repository GitHub starts with its own first commit would have a different history, and the two wouldn't fit together on the first push.
5. Click **Create repository**.

GitHub shows a page headed *Quick setup*, with an address like `https://github.com/your-username/spreadsheet.git`. Copy it with the copy button next to it.

## Connect the remote

Paste your own address in place of this one:

```powershell
git remote add origin https://github.com/your-username/spreadsheet.git
git remote -v
```

`git remote add` gives a remote a short name, so you don't type the address every time. **`origin`** is the conventional name for "the main copy on the internet". `git remote -v` lists remotes; you'll see the address twice, once for fetching (downloading) and once for pushing (uploading).

```check
git-remote origin -- Run git remote add origin <the address GitHub showed you>
```

## Push

```powershell
git push -u origin main
```

The first time you push, Git needs to know you're allowed to. A **GitHub sign-in window** opens (from Git Credential Manager, which came with Git for Windows). Choose to sign in with your browser, approve it on GitHub's page, and the push continues. Git remembers this, so later pushes don't ask again.

Then Git reports the upload:

```text
PS C:\Users\you\Documents\spreadsheet> git push -u origin main
Enumerating objects: 20, done.
Counting objects: 100% (20/20), done.
Delta compression using up to 28 threads
Compressing objects: 100% (16/16), done.
Writing objects: 100% (20/20), 1.90 KiB | 973.00 KiB/s, done.
Total 20 (delta 4), reused 0 (delta 0), pack-reused 0 (from 0)
To https://github.com/your-username/spreadsheet.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

Your numbers will differ. The lines that matter are the last two:

- **`* [new branch] main -> main`**: your `main` was copied to a new `main` on GitHub.
- **`set up to track 'origin/main'`**: that's what `-u` did. Your `main` now remembers its partner on GitHub, so from now on plain `git push` (and `git pull`) know where to go.

Refresh the GitHub page: your files are there, and so is your history (click the commit count). `.env` is **not** there, because `.gitignore` kept it out.

```check
git-pushed -- Run git push -u origin main
```

## Ahead and behind

`git status` now compares with GitHub's copy too:

```powershell
git status
```

```text
PS C:\Users\you\Documents\spreadsheet> git status
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

Make one more commit and run `git status` before pushing: it says *Your branch is ahead of 'origin/main' by 1 commit*. `git push` uploads it. That rhythm (commit, commit, push) is your everyday workflow from here on.

Be careful with one detail: `origin/main` is your Git's **memory** of GitHub's `main` as of the last time it talked to GitHub. `git status` doesn't go online to check, so *up to date* means "up to date with what I last saw".

## Sprint 1, almost done

Your project has a history, ignores its secrets, has settled line endings, and is backed up on GitHub. You've used a branch and merged it. One thing is left before the sprint is finished: what happens when two branches change the same line. That's lesson 1.9. First, the rhythm you'll use every day from here on.

## Your turn: the everyday rhythm

Add a line to `playground/README.md` saying what you've used the playground for so far. Commit it, check `git status` says you're *ahead* by one commit, push it, and refresh your repository's page on GitHub to see the README with your new line.

```check
git-clean -- Commit the README change.
git-pushed -- Push it: git push
run "git log -1 --name-only --format=" stdout="playground/README.md" label="the last commit changed the playground README" -- Edit playground/README.md, then commit it.
```

```hints
nudge: Edit, commit, push: three moves you've made before, in a row.
concept: `git commit -am` stages tracked files that changed and commits them. The README is tracked since lesson 1.3. Plain `git push` works because `-u` connected `main` to `origin/main` earlier in this lesson.
shape: Edit the file, `git commit -am "..."`, `git status`, `git push`.
answer: ~~~powershell
git commit -am "Say what the playground has been used for"
git status
git push
~~~
```
