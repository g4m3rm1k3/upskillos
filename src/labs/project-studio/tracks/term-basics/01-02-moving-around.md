---
title: 1.2 — Moving Around: cd, Paths, Tab and touch
runtime: none
---

In 1.1 every command worked on the folder the terminal started in. This lesson moves the shell between folders with `cd`, names files by their paths, and lets the shell do some of your typing. Then you create Shelf's first empty files with `touch`.

## Go into a folder and back out: cd

```zsh
cd server
pwd
```

- **`cd`** (*change directory*) makes the folder you name the new working directory. It prints nothing.
- **`pwd`** now ends in `/server`. The prompt usually changes too, showing `server` instead of your project folder's name.
- `server` here is a **relative path**: it's looked up *relative to* the working directory. It worked because `server` is inside the folder you were in.

```zsh
ls -a
cd ..
pwd
```

- `ls -a` inside the new, empty `server` folder shows only `.` and `..`.
- **`cd ..`** moves to the parent: `..` always means "one folder up". `pwd` shows your project folder again.
- `..` can be part of a longer path. From inside `server`, `../public` means "up one, then into `public`".

```predict
question: You're in your project folder. You run `cd server`, then `cd ../public`, then `pwd`. What is the last part of the path it prints?
choice: server
choice: public
choice: shelf (or whatever your project folder is called)
answer: public
explain: `cd server` moves into server. From there, `../public` goes up one level to the project folder and then down into public, so the working directory is public.
verify: cd server && cd ../public && basename "$(pwd)"
```

Try it, then come back with `cd ..`.

## Absolute paths, ~ and cd -

A path that **starts with `/`** is an **absolute path**. It's looked up from the root, so it means the same thing whatever folder you're in.

```zsh
cd /
ls
cd ~
pwd
```

- **`cd /`** goes to the root of the disk. `ls` there shows the top-level folders: `Applications`, `Users`, `System` and others on a Mac.
- **`~`** (the *tilde*, Shift+\` on most keyboards) is the shell's short name for your **home folder**, `/Users/<your name>` on a Mac or `/home/<your name>` on Linux. `cd` with no argument at all also goes home.

Now get back to the project. You could type its absolute path, but there's a shortcut:

```zsh
cd -
pwd
```

- **`cd -`** returns to the previous working directory, the one before the last `cd`. Run it twice and you toggle between two folders. Here it takes you from home back to `/`; run it again only if that's where you need to be.

The simplest way back to your project folder is the **Restart** button above the terminal: a new shell always starts there. Or `cd` to the path that `pwd` printed at the start of 1.1. Do that now, and check with `pwd`.

## Let the shell type for you: Tab and history

Typing every name in full is slow and invites typos. Two features help.

**Tab completion.** Type the start of a name and press **Tab**:

```zsh
cd pu
```

Press Tab before Enter. The shell completes it to `cd public/`, because only one entry here starts with `pu`. Press Enter, then `cd ..` to come back.

- If several names match (try `cd ` followed by Tab with nothing typed), the first Tab may do nothing or beep, and a second Tab lists the candidates. Type one more letter and press Tab again.
- Tab completes command names too: type `mkd` and Tab gives `mkdir`.
- A completion that doesn't appear is information: the name you started doesn't exist where the shell is looking.

**History.** The shell remembers what you've run.

- **↑ / ↓** step back and forward through previous commands. Edit the line and press Enter to run it.
- **Ctrl+R** searches history: press it, type part of an old command (`mkdir`), and the most recent match appears. Press Ctrl+R again for older matches, Enter to run it, or Ctrl+G (or Esc) to cancel.
- **`history`** prints your recent commands with numbers.

## Edit a long line without retyping it

When a long command has a typo near the start, holding ← is slow. These keys move and delete inside the line you're typing. They work in zsh, bash, and many other command-line programs, including the command line inside editors such as Vim and Neovim.

| Keys | Does |
|---|---|
| Ctrl+A | Move to the start of the line |
| Ctrl+E | Move to the end of the line |
| Ctrl+U | Delete everything before the cursor (zsh: the whole line) |
| Ctrl+K | Delete everything from the cursor to the end |
| Ctrl+W | Delete the word before the cursor |
| Ctrl+C | Abandon the line and get a fresh prompt (and, while a program runs, stop it) |

Try it: type `mkdir tset/fixtures` but **don't press Enter**. Press Ctrl+A to jump to the start, move right with → until the cursor is on `tset`, and fix it to `test`. Then press Ctrl+C to abandon the line; you'll make that folder properly in the next step.

## Folders inside folders: mkdir -p

Shelf's tests will need sample data, which lives in a folder inside `test` called `fixtures`. (A **fixture** is a fixed piece of data a test starts from, so the test gives the same result every time.)

First, see what happens when a folder in the middle of a path doesn't exist yet. `mkdir` only creates the last name in a path:

```zsh
mkdir notes/today
```

```text
mkdir: notes: No such file or directory
```

- `mkdir` was asked to create `today` inside `notes`, but `notes` doesn't exist, so it refused. Nothing was created.

The **`-p`** flag (*parents*) creates every missing folder along the path, and doesn't complain if they already exist:

```zsh
mkdir -p test/fixtures
ls test
```

`ls test` lists `fixtures`. Notice that `ls` accepts a path argument: it lists that folder without you having to `cd` into it.

```check
dir test/fixtures label="test/fixtures exists" -- From your project folder, run mkdir -p test/fixtures.
missing notes label="no stray notes folder" -- The notes/today command should have failed. If you made notes with -p while experimenting, remove it with rmdir notes/today notes.
```

## Empty files: touch

Shelf's backend is three JavaScript files in `server`. Create them empty for now; this series is about organising and running a project, not writing its code.

```zsh
touch server/server.js server/routes.js server/store.js
ls -l server
```

- **`touch`** creates each file you name if it doesn't exist. If it does exist, `touch` leaves its contents alone and only updates its "last changed" time, so it's safe to run on an existing file.
- The paths `server/server.js` and so on are relative: from the project folder, into `server`, then the file.
- **`.js`** is the conventional ending (**extension**) for JavaScript files. The shell doesn't care about extensions; editors and tools use them to decide how to treat a file.
- `ls -l server` shows three lines starting with `-` (ordinary files) and a size of `0`: they exist and are empty.

```check
file server/server.js label="server/server.js exists" -- From your project folder: touch server/server.js server/routes.js server/store.js
file server/routes.js label="server/routes.js exists" -- From your project folder: touch server/server.js server/routes.js server/store.js
file server/store.js label="server/store.js exists" -- From your project folder: touch server/server.js server/routes.js server/store.js
missing server.js label="server.js isn't loose in the project folder" -- A file named server.js landed in the project folder itself: touch was run without the server/ part. Remove it with rm server.js.
```

## Your turn: the frontend's three files

The frontend is three files in `public`: `index.html` (the page's structure), `style.css` (how it looks) and `app.js` (what it does).

**Build, on your own:** create those three empty files in `public`. This time, do it **from inside** the `public` folder: `cd` into it first, create the files with names that have no folder in front, then return to the project folder. Confirm with `ls -l public`.

```hints
nudge: Inside public, a file's name on its own is a path relative to public.
concept: `cd public` changes the working directory, so `touch index.html` creates public/index.html. `cd ..` comes back up.
shape: Three commands: cd into public; touch with three names; cd back up. Use Tab to complete public.
```

```check
file public/index.html label="public/index.html exists" -- Create index.html inside public.
file public/style.css label="public/style.css exists" -- Create style.css inside public.
file public/app.js label="public/app.js exists" -- Create app.js inside public.
missing index.html label="nothing landed in the project folder by mistake" -- index.html is in the project folder itself, not in public. Remove it with rm index.html, then create it inside public.
```

The checks establish that the files are where they belong. They do not prove whether you created them from inside `public` or from the project folder; both give the same result, and both are worth being able to do.

### What you have

```text
shelf/
  data/  practice/
  public/  index.html  style.css  app.js
  server/  server.js  routes.js  store.js
  test/    fixtures/
```

Next: putting text into files from the shell, and reading it back.
