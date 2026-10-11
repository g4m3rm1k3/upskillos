---
title: 1.1 — The Prompt, pwd, ls and mkdir
track: The Terminal — Find Your Way and Lay Out a Project
trackOrder: 70
runtime: none
---

This series teaches the **terminal**: controlling your computer by typing commands instead of clicking. Programmers use it all day, to create and organise files, run programs and servers, search through code, use Git, and work on other computers over the network. Many tools have no buttons at all and can only be used from the terminal.

You learn on a real project's folder: **Shelf**, the layout of a small bookmark web app, with a `server` folder for the backend code, a `public` folder for the web page, data, and tests. By the end of this chapter the folder has all of that, plus a README and a first data file, all made by typing commands. Later chapters search it, run programs in it, put it under Git and automate work on it with scripts.

Before you start, choose a project folder for this series: click **Choose folder…** and pick a new, empty folder. Naming it `shelf` keeps it easy to recognise.

## Find the terminal and its prompt

At the bottom of Project Studio is the **Terminal** tab. Click inside it. You see a line ending in `%` (or `$`, or `➜`, depending on how your computer is set up) and a blinking cursor. That line is the **prompt**.

- **The terminal** is the window that shows text and takes your typing.
- **The shell** is the program running inside it that reads each line you type, runs it, and prints a new prompt. On a Mac the shell is **zsh** (pronounced "zee-shell"). On Linux it's usually **bash**; every command in this series works the same in both.
- **The prompt** is the shell saying "ready for a command". The default zsh prompt on a Mac looks like `ada@MacBook shelf %`: your user name, the computer's name, the folder you're in, and `%`. Yours may look different; what matters is that the cursor sits after it.
- **A command** is a line you type and send with **Enter**. Nothing happens until you press Enter.

Project Studio starts every terminal inside your project folder. Type this and press Enter:

```zsh
pwd
```

- **`pwd`** stands for *print working directory*. It prints the full **path** of the folder the shell is in now, such as `/Users/ada/shelf`.
- **A directory** is the older word for a folder. The two words mean the same thing; commands use "directory" (and `dir`) a lot.
- **The working directory** is the folder the shell is "in". Commands that take a file name look for it here unless you say otherwise.
- **A path** names a file or folder by listing the folders that lead to it, separated by `/`. `/Users/ada/shelf` means: start at the very top (`/`, called the **root**), go into `Users`, then `ada`, then `shelf`.

The last part of what `pwd` printed should be the name of the folder you chose.

## List what's here: ls

```zsh
ls
```

- **`ls`** (*list*) prints the names of the files and folders in the working directory.
- In a new, empty folder it prints **nothing**, and the prompt comes straight back. In the shell, no output usually means the command succeeded with nothing to report, not that it failed.

Most commands accept **options**, also called **flags**: a dash followed by a letter, which change what the command does.

```predict
question: Your folder is empty and `ls` printed nothing. `ls -a` lists *all* entries, including hidden ones. What does it print?
choice: Nothing at all
choice: Two entries, . and ..
choice: An error, because the folder is empty
answer: Two entries, . and ..
explain: Every folder contains two special entries. `.` means "this folder" and `..` means "the folder that contains this one". Their names start with a dot, and `ls` hides every name that starts with a dot unless you ask with `-a`.
```

```zsh
ls -a
```

- **`-a`** (*all*) includes **hidden** entries: any file or folder whose name starts with `.`. Programs keep settings in hidden files (you'll make one, `.gitignore`, later in the series), and hiding them keeps everyday listings short.
- **`.`** is the folder itself. **`..`** is its **parent**, the folder one level up. You'll use both in the next lesson to move around.

```zsh
ls -l
```

- **`-l`** (*long*) prints one entry per line with details. For a folder that's still empty it prints only `total 0`. You'll read its columns in a moment, once there's something to list.

Flags can be combined behind one dash: `ls -la` means `ls -l -a`.

## Make Shelf's folders: mkdir

Shelf keeps its code in four folders: `server` for the backend, `public` for the files the browser downloads (the frontend), `data` for the saved bookmarks, and `test` for the automated tests.

```zsh
mkdir server public data test
```

- **`mkdir`** (*make directory*) creates a folder for each name you give it.
- **Arguments** are the words after a command's name, separated by spaces. Here `mkdir` gets four arguments, so it makes four folders. Flags are arguments too; they just start with a dash.
- It prints nothing when it succeeds.

Now list them in detail:

```zsh
ls -l
```

```text
total 0
drwxr-xr-x  2 ada  staff  64 Oct 11 09:00 data
drwxr-xr-x  2 ada  staff  64 Oct 11 09:00 public
drwxr-xr-x  2 ada  staff  64 Oct 11 09:00 server
drwxr-xr-x  2 ada  staff  64 Oct 11 09:00 test
```

Each line is one entry. Read it left to right:

- **`d`**: the first character is the type. `d` is a directory; `-` would be an ordinary file.
- **`rwxr-xr-x`**: the **permissions**: who may read (`r`), write (`w`) and enter or run (`x`) it. Three groups: you, your group, everyone else. You won't need to change these in this series.
- **`ada staff`**: the owner and the group.
- **`64`**: the size in bytes (for a folder, the size of its own list of contents, not what's inside).
- **`Oct 11 09:00`**: when it was last changed.
- **The name**, last. `ls` sorts names alphabetically.

```check
dir server label="the server folder exists" -- Run mkdir server public data test in the Terminal tab, inside your project folder.
dir public label="the public folder exists" -- Run mkdir server public data test in the Terminal tab, inside your project folder.
dir data label="the data folder exists" -- Run mkdir server public data test in the Terminal tab, inside your project folder.
dir test label="the test folder exists" -- Run mkdir server public data test in the Terminal tab, inside your project folder.
```

These checks look for the four folders in your project. They can't see what you typed, only the result.

## Read an error, then recover

Errors are information. Try two deliberate mistakes and read exactly what the shell says.

First, run the same `mkdir` again:

```zsh
mkdir server
```

```text
mkdir: server: File exists
```

- The message starts with the **name of the program** that complained (`mkdir`), then the **argument** it was working on (`server`), then **what went wrong**. Almost every command-line error follows this shape.
- Nothing was changed: `mkdir` refuses rather than replacing the folder, so your folder (and anything in it) is safe.

Second, misspell the command:

```zsh
mkdri server
```

```text
zsh: command not found: mkdri
```

- This time the message comes from **zsh** itself, not from `mkdir`: the shell couldn't find any program called `mkdri`, so nothing ran at all.
- **To recover**, press **↑** (the up arrow). The shell puts your previous line back at the prompt. Fix the typo with **←** and **Backspace** and press Enter. You'll learn faster ways to edit a line in the next lesson.

So there are two kinds of error to tell apart: *the program ran and refused* (`mkdir: …`) and *no program ran* (`zsh: command not found: …`).

## Clear the screen

After a few commands the terminal fills up. Press **Ctrl+L** (hold Control, press L), or type `clear` and press Enter. The screen is wiped and the prompt moves to the top. Nothing is deleted from your folder; only the display is cleared. Scrolling up in the Terminal tab still shows earlier output in most cases.

## Your turn: a folder for practice

It's useful to keep experiments apart from a project's real files, so a mistake can't break anything that matters. In this series they live in a folder called `practice`.

**Build, on your own:** create the `practice` folder inside your project folder, then use `ls` with a flag to confirm that it is a directory (not a file) in its listing.

```hints
nudge: You made four folders with one command earlier. This is the same command with one name.
concept: `mkdir <name>` makes a folder. In `ls -l` output, a line that starts with `d` is a directory.
shape: Run `mkdir` with the folder's name, then `ls -l` and find the line ending in `practice`.
```

```check
dir practice label="the practice folder exists" -- Create a folder named practice (all lowercase) in your project folder.
run "ls -1 | grep -qx practice" label="it is named practice, in lowercase" -- Name it practice, all lowercase. A Mac treats Practice and practice as the same folder, but Linux, Git and web servers don't.
```

The checks establish that the folder exists with the right name. They do not prove you can read `ls -l` to tell a folder from a file; that part is yours: look for the `d`.

### What you have

```text
shelf/
  data/  practice/  public/  server/  test/
```

Next: moving between these folders with `cd`, and creating files inside them.
