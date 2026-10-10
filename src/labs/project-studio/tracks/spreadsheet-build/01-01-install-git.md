---
title: 1.1 — Install Git and Introduce Yourself
runtime: none
---

Your project folder has four small files in it. Soon it will have dozens, and you'll change them every day. Some changes will break things, and you'll want to know exactly what changed and to get back to the last version that worked.

**Git** does that. It records snapshots of your project, called **commits**, each with a note saying what changed and why. You can compare any two snapshots, go back to an old one, and try an idea on the side without disturbing the version that works. Almost every software team uses it.

This sprint teaches Git from the start, using your own project. In this lesson you install it and tell it who you are.

## Is Git installed?

```powershell
git --version
```

```text
PS C:\Users\you\Documents\spreadsheet> git --version
git version 2.52.0.windows.1
```

If you see a version, Git is installed; skip to **Tell Git who you are**. If you get *The term 'git' is not recognized…*, install it in the next step. (On macOS, typing `git` offers to install Apple's command-line tools, which include Git. Accept, then skip the next step.)

## Install Git for Windows

1. Open **https://git-scm.com** and download Git for Windows.
2. Run the installer. Its pages ask many questions; the defaults are fine except for two:
   - **Choosing the default editor used by Git**: the default is *Vim*, an editor that is hard to use until you learn it, and even hard to quit. Pick **Notepad** from the list instead. (Git sometimes opens an editor for you to type a message in; this decides which one.)
   - **Adjusting the name of the initial branch in new repositories**: choose **Override the default branch name** and leave it as `main`. (Lesson 1.7 explains branches.)
3. When it finishes, press **Restart** above the terminal (lesson 0.2: a new terminal gets the new PATH) and run `git --version` again.

## Tell Git who you are

Every commit records who made it. Git needs your name and email address before it will make one, so set them now. Use your own name and email in place of these:

```powershell
git config --global user.name "Ada Lovelace"
git config --global user.email "ada@example.com"
```

Both commands print nothing when they work. Check what Git stored:

```powershell
git config --global user.name
```

```text
PS C:\Users\you\Documents\spreadsheet> git config --global user.name
Ada Lovelace
```

`git config` reads and changes Git's settings. `--global` means "for every project on this computer", so you only do this once. Given a setting's name and a value it stores the value; given just the name it prints the current value.

**Your name and email become public** in every commit you push to GitHub (lesson 1.8). If you'd rather not publish your email, GitHub gives every account a private address of the form `12345+username@users.noreply.github.com`, shown under *Settings → Emails*. You can use that one here, now or later.

```check
git-config user.name -- Run git config --global user.name "Your Name"
git-config user.email -- Run git config --global user.email "you@example.com"
```

## Name the first branch main

One more setting. When Git starts a new project it creates a first **branch** (a line of work; lesson 1.7). Git for Windows names it `master` unless told otherwise; GitHub and most teams now use `main`. Set the default so your projects match:

```powershell
git config --global init.defaultBranch main
```

```check
run "git config --global init.defaultBranch" stdout="main" label="new repositories start on a branch called main" -- Run git config --global init.defaultBranch main
```

Git is installed and knows who you are. Next lesson, your project becomes a Git repository.

## Your turn: a shortcut of your own

`git log` (lesson 1.3) shows the history. You'll look at it constantly, and two options make it far more useful:

- `--oneline` shows one line per commit;
- `--graph` draws lines showing how branches split and join (lesson 1.7).

Git lets you name a shortcut for any Git command. It's called an **alias**, and it's a setting like the others:

```text
git config --global alias.<shortcut> "<the rest of a git command>"
```

After that, `git <shortcut>` runs `git <the rest of a git command>`.

Make `git lg` show the log with both options. It won't have any commits to show until lesson 1.3; try it then.

```check
run "git config --global alias.lg" stdout="log" label="git lg is an alias for git log" -- Set alias.lg with git config --global.
run "git config --global alias.lg" stdout="--oneline" label="it uses --oneline"
run "git config --global alias.lg" stdout="--graph" label="it uses --graph"
```

```hints
nudge: The command after the shortcut's name is everything you'd type after `git`.
concept: An alias's value is a Git command without the word `git`, in quotes because it has spaces in it. Options can go in any order.
shape: `git config --global alias.lg "..."`, with `log` and the two options inside the quotes.
answer: ~~~powershell
git config --global alias.lg "log --oneline --graph"
~~~
```
