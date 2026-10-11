---
title: 1.4 — Copy, Move and Delete: cp, mv, rm and *
runtime: none
---

This lesson covers rearranging files: copying, moving and renaming, deleting, and naming many files at once with a wildcard. One of these, `rm`, deletes permanently. The shell has no Trash, so this lesson also covers how to delete carefully.

## Copy a file: cp

Automated tests start from a known set of data, so they give the same result every time; Shelf keeps that data in `test/fixtures`. The bookmark you wrote in 1.3 is a good start for it:

```zsh
cp data/bookmarks.json test/fixtures/bookmarks.json
cat test/fixtures/bookmarks.json
```

- **`cp source destination`** (*copy*) makes a new file at `destination` with the same contents as `source`. The original is untouched.
- **The order matters**: from, then to. Swapping them would copy the (possibly missing or empty) destination over your source.
- If the destination file already exists, `cp` **replaces it without asking**.
- If the destination is an existing **folder**, the copy goes inside it with the same name: `cp data/bookmarks.json test/fixtures` would have done the same thing here.

The two files are now independent. A change to one doesn't affect the other.

```check
file test/fixtures/bookmarks.json label="test/fixtures/bookmarks.json exists" -- cp data/bookmarks.json test/fixtures/bookmarks.json
run "cmp -s data/bookmarks.json test/fixtures/bookmarks.json" label="it's an exact copy of data/bookmarks.json" -- Copy it again with cp; the two files should be identical.
```

## Move and rename: mv

There is no separate rename command. Renaming a file is moving it to a new name.

Make a scratch file to practise on, in the project folder:

```zsh
echo "ideas for Shelf" > draft.txt
mv draft.txt practice/
ls practice
mv practice/draft.txt practice/ideas.txt
ls practice
```

- **`mv source destination`** (*move*) moves a file. Unlike `cp`, the original is gone afterwards.
- **`mv draft.txt practice/`**: the destination is a folder, so the file moves into it and keeps its name. The trailing `/` says "this is a folder"; with it, a typo in the folder name gives an error instead of quietly renaming your file to that typo.
- **`mv practice/draft.txt practice/ideas.txt`**: same folder, new name: a rename.
- Like `cp`, `mv` **replaces an existing destination file without asking**. Add **`-i`** (*interactive*) to be asked first: `mv -i a.txt b.txt` prompts if `b.txt` exists.

```check
file practice/ideas.txt label="practice/ideas.txt exists" -- Move draft.txt into practice, then rename it to ideas.txt.
missing draft.txt label="draft.txt is no longer in the project folder" -- mv moves the file; if draft.txt is still here you may have used cp.
missing practice/draft.txt label="the old name is gone from practice" -- Rename practice/draft.txt to practice/ideas.txt with mv.
```

## Delete: rm, and why there's no undo

```zsh
rm practice/ideas.txt
ls practice
```

- **`rm`** (*remove*) deletes the files you name. **They do not go to the Trash.** The space they used is marked free, and there is no command to bring them back.
- Because of that, professionals guard against slips:
  - **`rm -i`** asks `remove practice/ideas.txt?` for each file; type `y` and Enter to confirm.
  - Run `ls` with the same arguments first, to see exactly what would be removed.
  - Keep work you care about in version control (Git), so a deleted file can be restored.

Folders need different treatment:

```predict
question: You run `rm practice`. What happens?
choice: The practice folder and everything in it are deleted
choice: rm refuses, because practice is a directory
choice: Only the files inside practice are deleted
answer: rm refuses, because practice is a directory
explain: Plain rm deletes files only. It refuses a folder with "rm: practice: is a directory", which protects you from wiping a whole tree by accident.
verify: tmp=$(mktemp -d) && cd "$tmp" && mkdir practice && if rm practice 2>/dev/null; then echo "deleted"; else test -d practice && echo "rm refuses, because practice is a directory"; fi
```

```zsh
rm practice
```

```text
rm: practice: is a directory
```

To delete folders:

- **`rmdir folder`** deletes a folder **only if it's empty**. Otherwise: `rmdir: folder: Directory not empty`. It's the safe choice.
- **`rm -r folder`** (*recursive*) deletes the folder **and everything inside it**, however deep. It's the most dangerous everyday command: check the path twice, and never run it on a path you built in a hurry.

Don't delete `practice`; you need it. Its contents are empty again, which is fine.

```check
dir practice label="practice is still there" -- If you removed it while experimenting, make it again with mkdir practice.
missing practice/ideas.txt label="ideas.txt was deleted" -- rm practice/ideas.txt
```

## Name many files at once: *

```zsh
ls server/*.js
echo public/*
```

- **`*`** is a **wildcard**: in a path, it matches any run of characters (including none). `server/*.js` means "every name in `server` that ends in `.js`".
- **The shell expands it, not the command.** Before `ls` runs, zsh replaces `server/*.js` with the matching names, sorted, as separate arguments. `ls` receives `server/routes.js server/server.js server/store.js`, exactly as if you'd typed them.
- **`echo`** shows this plainly: `echo public/*` prints the expanded list, because `echo` just prints its arguments.
- If nothing matches, zsh stops with `zsh: no matches found:`, just as with `[]` in 1.3. That's a feature: a mistyped pattern never reaches a command like `rm`.

```predict
question: Your public folder holds index.html, style.css and app.js. What does `echo public/*` print?
choice: public/*
choice: public/app.js public/index.html public/style.css
choice: public/index.html public/style.css public/app.js
answer: public/app.js public/index.html public/style.css
explain: The shell replaces public/* with every matching path, in alphabetical order, before echo runs. echo then prints the three arguments it received, separated by spaces.
verify: echo public/*
```

Wildcards make `rm` more dangerous too: `rm *.js` deletes every `.js` file in the folder. Run `echo` with the same pattern first to see what it expands to.

## Your turn: back up the backend, then remove the backup

Before a risky change, programmers sometimes copy a whole folder as a backup. `cp` copies a folder only with **`-r`** (recursive), the same flag `rm` uses to work on a folder and everything inside it.

**Build, on your own:**

1. Copy the whole `server` folder to `practice/server-backup` and list the backup to see its three files.
2. Then delete the backup folder and everything in it, in one command, **without touching `server`**. Use `echo` or `ls` on the exact path first, so you know what you're about to delete.

```hints
nudge: cp needs one extra flag to copy a folder. rm needs the same flag to delete one with files in it.
concept: `cp -r source destination` copies a folder and everything in it; `rm -r path` deletes a folder and everything in it. Both paths here start with practice/.
shape: `cp -r server practice/server-backup`, then `ls practice/server-backup`, then `rm -r` on that same path. Check the path before pressing Enter.
```

```check
missing practice/server-backup label="the backup has been deleted" -- Delete practice/server-backup and everything inside it with rm -r.
file server/server.js label="server/server.js is still there" -- The real server folder must survive. If it's gone, recreate it with mkdir server and touch server/server.js server/routes.js server/store.js.
file server/routes.js label="server/routes.js is still there" -- Recreate it with touch server/routes.js.
file server/store.js label="server/store.js is still there" -- Recreate it with touch server/store.js.
```

The checks establish the end state: no backup, server intact. They do not prove the backup really held three files; only your own `ls` showed you that.

### What you have

```text
shelf/
  README.md
  data/bookmarks.json
  practice/                    (empty)
  public/  app.js  index.html  style.css
  server/  routes.js  server.js  store.js
  test/fixtures/bookmarks.json
```

Next: what a command actually is, where the shell finds it, and checking that Node is installed.
