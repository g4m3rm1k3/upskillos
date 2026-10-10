---
title: 1.6 — Undoing Changes You Haven't Committed
runtime: none
teaches: git restore
uses: git diff, staging area
---

You'll often try something, make a mess, and want the last good version back. With Git, "the last good version" is the last commit, and getting back to it takes one command.

## Make a mess

Break `hello.js` on purpose. Replace its contents with this:

```javascript file=hello.js
const name = "spreadsheet";
console.log("Hello from Node, building a", nme);
```

Run `node hello.js`: a `ReferenceError` for `nme` (lesson 0.4), and the cells line is gone too. Now imagine this was twenty changes across five files, and you can't remember what it looked like before.

```check
run "node hello.js" exit=1 stderr="ReferenceError" label="hello.js is broken (on purpose)"
```

## See the damage, then throw it away

`git diff` shows exactly what changed since the last commit:

```powershell
git diff
```

The `-` lines are what you lost, the `+` lines what you added. To throw away every change to the file and get the committed version back:

```powershell
git restore hello.js
```

It prints nothing. Look at `hello.js` in the editor: it's back to the committed version, with the cells line. Run `node hello.js` to be sure.

**`git restore` can't be undone.** The changes it throws away were never committed, so Git has no copy of them. Use `git diff` first to be sure there's nothing you want to keep.

```check
run "node hello.js" stdout="It will have 2600 cells to start with." -- Run git restore hello.js
git-clean
```

## Unstaging

The other half: you staged something with `git add` and want it out of the box, but keep the change in your file. Add a line to the end of `hello.js` first:

```javascript file=hello.js
const name = "spreadsheet";
const cells = 26 * 100;
console.log("Hello from Node, building a", name);
console.log("It will have", cells, "cells to start with.");
console.log("This line is staged, then unstaged.");
```

Then:

```powershell
git add hello.js
git status
git restore --staged hello.js
git status
```

```text
PS C:\Users\you\Documents\spreadsheet> git add hello.js
PS C:\Users\you\Documents\spreadsheet> git status
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   hello.js
```

`git status` told you the command itself, in the hint in brackets. After `git restore --staged hello.js`, the change is no longer staged (*Changes not staged for commit*), but it's still in your file.

```predict
question: After `git restore --staged hello.js`, is the new line still in `hello.js`?
choice: Yes: only the staging was undone
choice: No: the file went back to the last commit
answer: Yes: only the staging was undone
explain: `--staged` acts on the staging area only: the change comes out of the box and stays in your file, listed as *not staged*. Without `--staged`, `git restore` acts on the file itself and throws the change away.
```

So: **`git restore --staged`** takes a file out of the staging area and keeps your edit. **`git restore`** throws your edit away.

Finally, throw this line away too, so the project is clean again:

```powershell
git restore hello.js
```

```check
lacks hello.js "staged, then unstaged" -- Run git restore hello.js to throw the extra line away.
git-clean
```

## Your turn: break it, then get it back

Break `playground/shout.py` on purpose, any way you like: misspell a name, delete a bracket, delete everything. Run it and read the error. Then look at the damage with `git diff`, and get the committed version back with one command.

```check
run "$env:SHOUT_TEXT = 'hi'; python playground/shout.py" stdout="HI!" os=windows label="shout.py works again"
run "SHOUT_TEXT=hi python3 playground/shout.py" stdout="HI!" os=mac label="shout.py works again"
run "SHOUT_TEXT=hi python3 playground/shout.py" stdout="HI!" os=linux label="shout.py works again"
git-clean -- Get the committed version back with git restore.
```

The checks can only see the end: a working file and nothing uncommitted. The useful part is reading the error and the diff on the way.

```hints
nudge: The command that throws your changes away is in this lesson.
concept: `git restore <file>` replaces the file with its last committed version. Your broken edit was never committed, so this is safe exactly because you don't want it.
shape: Break, run, `git diff`, `git restore` with the file's path.
answer: ~~~powershell
python playground/shout.py
git diff
git restore playground/shout.py
~~~
```
