---
title: 1.1 — Neovim: Modes, Insert, Save and Quit
track: Neovim — Modes, Saving and a First Server
trackOrder: 71
runtime: none
support: data/bookmarks.json, server/server.js, server/routes.js, server/store.js, public/index.html, public/style.css, public/app.js, practice/README.md
---

**Neovim** is a text editor that runs inside a terminal and is driven entirely from the keyboard. It descends from **Vi** (1976) and **Vim** (1991). Its keys are worth learning because they turn up in many other places: on every Linux server you'll ever log in to (as `vi` or `vim`), in `less` and `man` (`j`, `k`, `/`), and as optional "Vim mode" in VS Code, JetBrains IDEs, Obsidian and web browsers.

What makes it different from every editor you've used is **modes**: the same key does different things depending on which mode Neovim is in. That's confusing for about an hour, and then it becomes the reason Neovim is fast. In this lesson you learn the two modes you need to write a file, how to save, and how to quit (a famous stumbling block, solved in four keys).

This series assumes you can use a terminal a little: run a command, move between folders with `cd`, and stop a program with Ctrl+C. If that's new, the **Terminal** series teaches it first.

## Get the starter project

Throughout this series you build **Shelf**, a bookmark manager with a small server (the *backend*) written in JavaScript for **Node**, and a web page (the *frontend*) written in HTML, CSS and JavaScript. It has a dozen files in several folders: enough to need fast ways of moving between files, finding text and making the same change in many places, which is what Neovim is for.

Click **Choose folder…** and pick a new, empty folder (naming it `shelf` keeps it easy to recognise). Then click **Create provided README.md**. It writes Shelf's starting files: this README, a data file holding one bookmark, the empty code files you'll fill in, and a `practice` folder for exercises that are kept apart from the real code.

```markdown file=README.md provided
# Shelf

A bookmark manager with a Node backend and a plain HTML, CSS and JavaScript frontend.
```

Shelf's server needs **Node** 18 or newer. In the **Terminal** tab at the bottom, run:

```zsh
node --version
```

If it prints a version such as `v22.14.0`, you're set. If it says `command not found`, install the **LTS** version from [nodejs.org](https://nodejs.org), then click **Restart** above the terminal.

```check
file server/server.js label="the starter files are in your project" -- Click Create provided README.md.
dir practice label="the practice folder exists" -- Click Create provided README.md; it makes practice/ too.
run "node -e \"process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)\"" label="Node 18 or newer is installed" -- Install the LTS version from nodejs.org, then click Restart above the terminal.
```

## Switch the editor to Neovim

At the top right of the editor, next to the file tabs, is an **Editor** menu. Choose **Neovim**.

- If Neovim isn't on your computer, Project Studio downloads it (about 10 MB, kept inside the app; nothing else on your computer changes) and then opens it. If you already have Neovim 0.10 or newer, it uses yours.
- The editor pane is now a terminal running Neovim on the open file. Clicking a file in the explorer, or moving to a step that names a file, opens that file in Neovim.
- You can switch back to Monaco at any moment; both edit the same files on disk.
- Neovim is also on the **Terminal** tab's `PATH`: `nvim README.md` there opens Neovim in the terminal instead of the editor pane. Both are the same program.

## Normal mode: keys are commands

This step opens `server/server.js`, an empty file from the starter project. Click into the editor pane so your keystrokes go to Neovim.

- The empty lines are marked with **`~`** (tilde). They're not part of the file; they show where the file ends.
- The bottom line is the **status line**: the file name and the cursor's line and column, such as `0,0-1` in an empty file.
- Neovim starts in **Normal mode**. In Normal mode, **letters are commands, not text**: `j` moves down, `x` deletes a character, `u` undoes. Nothing you type is inserted.

Normal mode is the default because programmers spend most of their time reading, moving and changing code, not typing new code. Every key is available for those jobs without holding Ctrl.

## Insert mode: type text, then Esc

Press **`i`**.

- **`i`** (*insert*) switches to **Insert mode**, with the cursor where it was. The bottom line shows **`-- INSERT --`**.
- In Insert mode, keys type text, as in any editor. Backspace, Enter and the arrow keys work.
- Press **Esc** to return to Normal mode. `-- INSERT --` disappears.

Get into the habit now: **type, then Esc straight away**. Normal mode is home; Insert mode is a short trip.

Type this line in Insert mode, then press Esc:

```javascript file=server/server.js
console.log('Shelf is starting');
```

- **`console.log(…)`** prints what's in the parentheses, followed by a newline.
- **`'Shelf is starting'`** is a **string**: text in a program, written between quotes. JavaScript accepts single or double quotes; this series uses single quotes.
- **`;`** ends the statement. JavaScript can usually guess where statements end without it, but the guesses occasionally go wrong, so writing it is the safer habit.

The file isn't saved yet: Neovim edits a copy in memory called a **buffer**, and the file on disk is still empty.

## Command-line mode: save with :w

Make sure you're in Normal mode (press Esc once more if unsure; Esc in Normal mode does nothing harmful). Then type **`:w`** and press **Enter**.

- **`:`** opens **Command-line mode**: a prompt at the very bottom where you type an editor command and press Enter. Esc cancels it.
- **`:w`** (*write*) saves the buffer to the file. The bottom line confirms, with something like `"server/server.js" 1L, 34B written`: one line, 34 bytes.

Now run the file in the **Terminal** tab:

```zsh
node server/server.js
```

- **`node file`** runs the JavaScript in that file. It prints `Shelf is starting` and ends, because there's nothing more to do.

```check
contains server/server.js "console.log('Shelf is starting');" label="server.js has the console.log line" -- In Neovim: i, type the line, Esc, then :w and Enter.
run "node server/server.js" stdout="Shelf is starting" label="node server/server.js prints Shelf is starting" -- Save with :w (in Normal mode), then run it in the Terminal tab.
```

## Drill: insert, Esc, save

Knowing a key and having it in your fingers are different things. Every lesson in this series has **drills**: short edits on practice files, each with a **par**, the number of keystrokes a fluent Neovim user needs. Project Studio counts your keystrokes while you edit a practice file in the editor pane, and the drill's check compares your count with par when you save.

- **Every key counts**, including the text you type in Insert mode and Esc. Saving with `:w` and Enter doesn't count.
- **Arrow keys and the mouse fail a drill**, even under par. The point is to learn the keys that keep your hands where they are.
- **To retry**, click **Fresh copy of …**: it replaces the file with the original, reloads it in Neovim, puts the cursor at the start and resets your count. Then open it again if you've moved to another file.
- The counts are kept in a hidden `.practice` folder in your project.

First drill. Click **Fresh copy of practice/drills/01-insert.txt**, open it (`:e practice/drills/01-insert.txt`, or click it in the explorer), and make the line read `Shelf keeps your bookmarks.` Then save with `:w`.

```text file=practice/drills/01-insert.txt provided
keeps your bookmarks.
```

The cursor starts on the first character, `k`. Insert mode starts **before** the cursor with {{key:i}}, so: {{key:i}}, type `Shelf ` (with the space), {{key:esc}}, then `:w`. That's 8 keystrokes: `i`, six characters, Esc.

```check
run "sed -n 1p practice/drills/01-insert.txt | grep -qx 'Shelf keeps your bookmarks.'" label="line 1 reads Shelf keeps your bookmarks." -- Click Fresh copy of practice/drills/01-insert.txt and try again.
run "test $(wc -l < practice/drills/01-insert.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/01-insert.txt and try again.
keys practice/drills/01-insert.txt par=8
```

## Quit: :q, :wq and :q!

In the editor pane you rarely need to quit Neovim; switching files is enough. In the Terminal tab you do, and "how do I exit Vim?" is one of the most-asked programming questions ever. Here's the whole answer, in Normal mode:

| Command | Does |
|---|---|
| `:q` | Quit. Refuses if there are unsaved changes. |
| `:wq` | Write (save), then quit. |
| `:q!` | Quit and **throw away** unsaved changes. The `!` means "I mean it". |
| `ZZ` | Same as `:wq` (capital Z twice, no colon, no Enter). |

Try it in the Terminal tab, where Neovim takes over the whole tab:

```zsh
nvim README.md
```

Press `i`, type a few characters anywhere, press Esc, and then try to quit with `:q` and Enter.

```predict
question: You've changed README.md in Neovim without saving, and you type :q and Enter. What happens?
choice: Neovim quits and saves the change
choice: Neovim quits and loses the change
choice: Neovim refuses, with an error saying there are unsaved changes
answer: Neovim refuses, with an error saying there are unsaved changes
explain: :q never discards work. Neovim shows "E37: No write since last change (add ! to override)" and stays open. :wq saves and quits; :q! quits and discards.
```

You'll see, in red:

```text
E37: No write since last change (add ! to override)
```

- **`E37`** is the error's number. `:help E37` explains any numbered error.
- You don't want those random characters in your README, so quit **without saving**: `:q!` and Enter. You're back at the shell prompt, and README.md is unchanged. Check with `cat README.md`.

If you ever find yourself stuck in a Neovim (or Vim) you didn't mean to open, for example one Git opened for you, this always gets you out: **Esc, then `:q!`, Enter**.

```check
run "head -n 1 README.md | grep -qx '# Shelf'" label="README.md still starts with # Shelf" -- If a change was saved by mistake, open it in Neovim and make the first line read # Shelf again.
run "! grep -q 'Shelf is starting' README.md" label="README.md didn't get server code in it" -- Quit with :q! to discard changes you don't want to keep.
```

## Your turn: a file of your own, from the terminal

**Build, on your own:** from the Terminal tab, open Neovim on a **new** file, `practice/hello.txt` (opening a file that doesn't exist yet starts an empty buffer for it; it's created when you first save). Type the line `Hello from Neovim`, then save **and** quit with one command. Back at the prompt, print the file with `cat` to confirm.

```hints
nudge: Opening is the same as with README.md, with a different path. You need three modes: Normal to start, Insert to type, Command-line to save and quit.
concept: `nvim path` opens or starts a file. `i` enters Insert mode; Esc leaves it. `:wq` writes and quits (and so does ZZ).
shape: `nvim practice/hello.txt`, then i, the text, Esc, `:wq`, Enter, then `cat practice/hello.txt`.
```

```check
file practice/hello.txt label="practice/hello.txt exists" -- Save with :w or :wq; the file is created on the first save.
run "grep -qx 'Hello from Neovim' practice/hello.txt" label="it holds exactly Hello from Neovim" -- One line, Hello from Neovim, with a capital H and N and nothing else on the line.
```

The checks establish that the file was saved with the right line. They do not prove how you quit, with `:wq` or `ZZ`, or that Neovim is closed: if `cat` printed the line and you're at the prompt, you've done all three steps.

### What you have

```text
server/server.js   console.log('Shelf is starting');
practice/hello.txt Hello from Neovim
```

| Mode | How you get there | What keys do |
|---|---|---|
| Normal | Esc | Commands: move, delete, undo… |
| Insert | `i` | Type text |
| Command-line | `:` | Editor commands: `:w`, `:q`, `:wq`, `:q!` |

Next: moving around without the arrow keys, more ways into Insert mode, undo, and turning `server.js` into a real web server.
