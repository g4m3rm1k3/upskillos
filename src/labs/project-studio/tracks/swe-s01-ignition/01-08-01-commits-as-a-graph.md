---
title: "Commits as a Graph: Kit and Blockfall under Git"
runtime: python
---

What did `count.py` look like before 01-05-01 moved its argument handling into `kitargs.py`? You can't say. Kit has changed in almost every lesson, and the only earlier version you kept is `notes-backup/`, one copy made by hand in 01-06-06. Version control fixes that. It keeps every saved state of a project, so you can go back to one, compare two, and see who changed what and why. This module teaches Git, the version control system almost every team uses. You'll put Kit under Git and look inside it at the objects Git stores. Along the way, Git breaks one of Kit's sample files on a fresh copy, and you'll make it stop. One fact to carry in: Git names a file by what's in it, so `samples/hello.txt` has the same 40-character name on every computer in the world.

**By the end you can:**

- Put a project under Git, choose what it leaves out, and make commits that each do one thing, with messages that say why.
- Describe what a commit is from the objects Git stores (blob, tree, commit), and explain why every id changes if any earlier commit changes.
- Say what a branch and `HEAD` are, by reading the files that hold them, and move between commits.
- Find and fix a line-ending conversion that changes a file's bytes in another copy.

**You need:** 01-06-01 (the terminal), 01-06-05 (Kit's `.venv`), 01-06-06 (care with deleting commands). Commands run inside `kit` unless a step says otherwise. Git must be installed: `git --version` prints its version (this lesson used 2.45; anything from 2.28 on works).

## Starting a history

A **repository** is a project folder whose history Git keeps, in a hidden folder called `.git` inside it. Git stores your name and email address in every commit, so tell it who you are first. Ask whether it already knows:

```
git config user.name
```

If that prints a name, skip ahead. If it prints nothing, set both, once, for every repository on your computer (`--global`):

```
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Use the name and address you'd want on public work: if you ever share a repository, they go with it.

Now make Kit a repository. `-b main` names its first branch `main` (what a branch is comes later in this lesson; older Git called it `master` by default):

```
git init -b main
```

```
Initialized empty Git repository in C:/Users/you/swe/kit/.git/
```

Then ask Git what it sees, which you'll do constantly:

```
git status
```

```
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	__pycache__/
	alert.py
	bases.py
	big.txt
	...
```

**Untracked** means Git sees the file but isn't keeping it. Nothing is kept until you say so.

One decision before going on: **one repository per project.** Kit and Blockfall get a repository each, not one for the whole course folder. Each project's history is then about that project only, and each can be shared, copied or deleted on its own, which is how real projects are kept.

```check
run "cd kit; git rev-parse --show-toplevel" stdout="/kit" -- kit should be a Git repository of its own (run git init -b main inside kit).
run "cd kit; git symbolic-ref HEAD" stdout="refs/heads/main" -- The first branch should be called main.
git-config user.name -- Git should know your name (git config --global user.name "Your Name").
git-config user.email -- Git should know your email address.
```

## What to leave out

Some of what `git status` lists shouldn't be kept. `__pycache__/` and `kit.egg-info/` are made by Python and pip, and rebuilt in a moment. `big.txt` is 10 MB of generated text. `notes-backup/` was a hand-made backup, the job Git now does. And `.venv`, the virtual environment, is 40 MB of installed packages. It holds paths that only work on your computer, and `pip install -e .` rebuilds it from `pyproject.toml`.

You might have noticed `.venv/` *isn't* in the list. Python 3.13 and later put a file called `.gitignore` inside each new environment, containing `*`: "ignore everything here". Ruff does the same for `.ruff_cache/`. Older Python doesn't, so Kit says it for itself.

A file called **`.gitignore`**, at the top of the repository, lists patterns for Git to ignore: one per line, `#` for a comment, a trailing `/` for a folder, `*` for any run of characters. Create it:

```gitignore file=kit/.gitignore
# Made by tools, and rebuilt in a moment: never part of Kit's history.
.venv/
__pycache__/
.ruff_cache/
*.egg-info/

# Made by scripts here, and large or temporary.
big.txt
cases/
notes-backup/
locked.txt

# Keys are never committed, not even demonstration ones.
notes/demo_key
notes/demo_key.pub
```

The last two lines name files that don't exist any more (01-06-06 deleted its demonstration key). They're there so that if a key is ever made again, it can't be committed by accident. A secret that reaches a commit stays in the history even after the file is deleted; 01-08-04 shows how hard it is to get out.

Save it and run `git status` again: the list is shorter, and `.gitignore` itself appears in it, as a file to keep. To ask why something is ignored, use `git check-ignore -v`, which names the file and line that matched:

```
git check-ignore -v .venv big.txt notes/demo_key count.py
```

```
.gitignore:2:.venv/	.venv
.gitignore:8:big.txt	big.txt
.gitignore:14:notes/demo_key	notes/demo_key
```

`count.py` isn't in the answer, because nothing ignores it.

```check
run "cd kit; git check-ignore -q .venv" -- Git should ignore .venv.
run "cd kit; git check-ignore -q big.txt" -- Git should ignore big.txt.
run "cd kit; git check-ignore -q notes/demo_key" -- Git should ignore notes/demo_key, even before it exists.
run "cd kit; git check-ignore -q kit.egg-info" -- Git should ignore kit.egg-info.
run "cd kit; git check-ignore -q count.py" exit=1 -- Git must not ignore count.py.
```

## The first commit

A **commit** is a saved state of the whole project. Making one takes two commands. `git add` puts changes in the **staging area** (also called the *index*), a draft of the next commit. `git commit` then saves the draft as a commit. Two steps, so that you choose exactly what goes into each commit, even when you've changed several things.

```
git add .
git status
```

`.` means "everything here that isn't ignored". `git status` now lists every file under **Changes to be committed**. On Windows, `git add` also prints a line like this for each text file; it's the subject of a later step, so read it and go on:

```
warning: in the working copy of 'alert.py', LF will be replaced by CRLF the next time Git touches it
```

Now save the draft, with a message saying what the commit is:

```
git commit -m "Add Kit as it stands after module 1.7"
```

```
[main (root-commit) 8ecd883] Add Kit as it stands after module 1.7
 77 files changed, 1654 insertions(+)
 create mode 100644 .gitignore
 create mode 100644 alert.py
 ...
```

`8ecd883` is the start of the commit's id; yours is different (the next step says why), and your counts may differ by a few files. `root-commit` means it's the first commit, with nothing before it. `git log --oneline` lists commits, one line each; for now there's one.

```check
run "cd kit; git ls-tree --name-only HEAD" stdout="count.py" without=".venv" -- The first commit should contain Kit's files, without .venv.
run "cd kit; git ls-tree --name-only HEAD" stdout="samples" without="big.txt" -- The first commit should contain samples/ and leave out big.txt.
run "cd kit; git rev-list --count HEAD" stdout="1" -- There should be a commit.
```

## What a commit is

Git stores everything in `.git/objects` as **objects**, each named by a 40-character id. There are three kinds that matter here, and `git cat-file -p` prints any of them. Start with the commit (`HEAD` means "the commit you're on"):

```
git cat-file -p HEAD
```

```
tree dc25f3ddf7d9c3202a06891f5ad6c12c9f7399ce
author Your Name <you@example.com> 1794755734 -0500
committer Your Name <you@example.com> 1794755734 -0500

Add Kit as it stands after module 1.7
```

A commit is a small text record: a **tree** (the project's top folder), who made it and when (seconds since 1970, and the time zone), and the message. Follow the tree. The quotes matter in PowerShell, where `{ }` means something else:

```
git cat-file -p 'HEAD^{tree}'
```

```
100644 blob 365dde231ea5a74c2663ba677dfbe4dcb072861c	.gitignore
100644 blob 669c9a7c29c68f4b719d7142e4814662cd97310a	alert.py
...
040000 tree 30a8abfecfb86948a2df810a63d5b58fbaf8d08a	notes
040000 tree ee86bc4a8158aa9b42173699fcd31399f261f4ed	sample_tree
040000 tree 2d963df53f576661005253318fdf43a2d3b01225	samples
```

A **tree** is a folder listing: for each entry, a mode (`100644` an ordinary file, `040000` a folder), a kind, an id and a name. A file's contents are a **blob**; a subfolder is another tree. So a commit points at a tree, which points at blobs and trees, all the way down. Git keeps files, not folders: `sample_tree/empty/`, from 01-05-02, has no files, so it isn't in the commit at all.

`git cat-file -p HEAD:samples` lists the `samples` tree, and in it is `hello.txt`'s blob:

```
100644 blob 5fb50d3c93474f139362304b663fe44e9d17a26e	hello.txt
```

```predict
question: Your commit's id is different from this lesson's 8ecd883. Will your samples/hello.txt blob id also be different from 5fb50d3c…?
choice: Yes: every id in your repository is different
choice: No: it's the same id
answer: No: it's the same id
explain: A blob's id is computed from nothing but the file's bytes, and 01-01-01's make_samples.py wrote the same seven bytes on every machine. The commit's id differs because a commit's text includes your name, your email and the second you made it.
```

That's **content addressing**: an object's id is a hash of its contents, a SHA-1 (a fixed formula that turns any bytes into 20 bytes, written as 40 hex digits, 01-03-01). Same bytes, same id, on any computer; one changed byte, a completely different id. Here's the whole formula for a blob, in Python:

```python file=kit/blob_id.py
import hashlib
import sys
from pathlib import Path

# Git's name for a file's content: the SHA-1 of a short header, then the bytes.
data = Path(sys.argv[1]).read_bytes()
header = b"blob " + str(len(data)).encode() + b"\0"
print(hashlib.sha1(header + data).hexdigest())
```

The header is the word `blob`, a space, the length in bytes, and a zero byte. Save it, and compare it with Git's own answer, `git hash-object`:

```
.venv/bin/python blob_id.py samples/hello.txt
git hash-object samples/hello.txt
```

(On Windows, `.venv/Scripts/python`.) Both print `5fb50d3c93474f139362304b663fe44e9d17a26e`. Try `count.py` too: both agree there as well.

Because ids come from contents, nothing in a commit can be changed without changing its id. Edit one byte of one file and its blob gets a new id; so the tree listing it changes, so its id changes; so the commit's text changes, so its id changes. An id is a fingerprint of the entire project at that moment.

`blob_id.py` is a new file, so it's untracked. Commit it on its own, since it's one change:

```
git add blob_id.py
git commit -m "Add blob_id.py, which computes Git's id for a file"
```

```check
run "cd kit; git rev-parse HEAD:samples/hello.txt" stdout="5fb50d3c93474f139362304b663fe44e9d17a26e" -- hello.txt's blob id is the same on every machine.
run "cd kit; .venv/Scripts/python blob_id.py samples/hello.txt" stdout="5fb50d3c93474f139362304b663fe44e9d17a26e" -- blob_id.py should compute the same id as Git.
run "cd kit; git cat-file -t HEAD" stdout="commit" -- HEAD is a commit object.
run "cd kit; git cat-file -e HEAD:blob_id.py" -- blob_id.py should be committed.
run "cd kit; git rev-list --count HEAD" stdout="2" -- There should be two commits now.
```

## A clone that breaks

A **clone** is a complete copy of a repository, history and all, which is how a project reaches another computer. Make one beside Kit, the way it would arrive on a Windows computer: `-c core.autocrlf=true` is the setting Git for Windows turns on when it's installed. (If you're on Windows, you have it already; the option shows everyone the same thing.)

```
git clone -c core.autocrlf=true . ../kit-clone
.venv/bin/python count.py ../kit-clone/samples/hello.txt
```

```predict
question: samples/hello.txt is 7 bytes in kit. How many bytes will count.py report for the clone's copy?
choice: 7
choice: 8
choice: 6
answer: 8
explain: The clone's copy has gained a byte. The next command shows which.
```

```
bytes: 8
lines: 1
words: 1
characters: 7
longest: 7
```

The clone's `hello.txt` isn't the file you committed. Look at its bytes:

```
.venv/bin/python hexdump.py ../kit-clone/samples/hello.txt
```

```
00000000  68 c3 a9 6c 6c 6f 0d 0a                          h..llo..
```

The evidence is the `0d` before the `0a`: a carriage return (CR) before the line feed (LF), the Windows line ending, where the file had a bare LF (01-06-02). Git did this on purpose. With `core.autocrlf=true`, Git treats files it guesses are text as lines rather than bytes: when you `add`, it stores line endings as LF; when it writes files out, it gives them CRLF. That's what the warning at your first `git add` was announcing: "LF will be replaced by CRLF the next time Git touches it". For source code that's harmless, since Python reads either. For Kit's samples it's damage: they exist *to be* exact bytes, and every count and hex dump of them changes. `samples/people.csv`'s CRLF endings, which 01-07-02's RFC 4180 reader depends on, were flattened to LF when you committed on Windows.

The fix is to tell Git which files are bytes, not lines. A file called **`.gitattributes`** sets properties by pattern; `-text` means "not text: never convert".

```gitattributes file=kit/.gitattributes
# Git must store and check out these files byte for byte: Kit reads their
# exact bytes, and a CRLF where a file had an LF changes every count.
samples/** -text
notes/** -text
```

`**` matches any depth of folders, so these lines cover everything under `samples` and `notes`. Save it and check that it applies:

```
git check-attr text samples/hello.txt count.py
```

```
samples/hello.txt: text: unset
count.py: text: unspecified
```

`unset` means "not text", as set; `unspecified` means nothing was said, so Git keeps guessing. The new rule doesn't change what's already stored in the first commit. `git add --renormalize .` re-stores every tracked file under the current rules. Then add the new file, and look before committing:

```
git add --renormalize .
git add .gitattributes
git status --short
```

```
A  .gitattributes
M  samples/people.csv
```

`A` is added, `M` modified. On Windows, `people.csv` is re-stored with its CRLF endings; on macOS and Linux it never lost them, so only `.gitattributes` is listed. Commit, then test the fix the same way you found the problem: delete the old clone (check the path before you press Enter, as 01-06-06 taught) and clone again.

```
git commit -m "Store samples and notes byte for byte"
```

| Windows (PowerShell) | macOS or Linux |
|---|---|
| `Remove-Item -Recurse -Force ../kit-clone` | `rm -rf ../kit-clone` |

```
git clone -c core.autocrlf=true . ../kit-clone
.venv/bin/python hexdump.py ../kit-clone/samples/hello.txt
```

```
00000000  68 c3 a9 6c 6c 6f 0a                             h..llo.
```

Seven bytes, the same as Kit's. Delete `../kit-clone` again; it has done its job.

```check
run "cd kit; git check-attr text samples/hello.txt" stdout="samples/hello.txt: text: unset" -- .gitattributes should mark everything in samples as not text.
run "cd kit; git check-attr text notes/hello.txt" stdout="notes/hello.txt: text: unset" -- .gitattributes should mark everything in notes as not text.
run "cd kit; git cat-file -e HEAD:.gitattributes" -- .gitattributes should be committed.
run "cd kit; .venv/Scripts/python -c \"import pathlib, subprocess, tempfile; t = tempfile.TemporaryDirectory(); d = pathlib.Path(t.name) / 'k'; subprocess.run(['git', 'clone', '-q', '-c', 'core.autocrlf=true', '.', str(d)], check=True); print([(d / 'samples' / n).read_bytes() == pathlib.Path('samples', n).read_bytes() for n in ['hello.txt', 'people.csv', 'temps.bin']]); t.cleanup()\"" stdout="[True, True, True]" -- A fresh clone with core.autocrlf=true should give samples byte for byte (commit .gitattributes, after git add --renormalize .).
missing kit-clone -- Delete the clone once it has shown the fix.
```

## Commits form a graph

You have three commits now. `git cat-file -p HEAD` shows one line the first commit didn't have:

```
tree 325ca5af866f568cd244dfab92dae2c1738c345c
parent 3d8d3d47f3961d2742e6519c6bcb48d31466f4be
author Your Name <you@example.com> 1794755746 -0500
...
```

**`parent`** is the id of the commit this one was made on top of. Every commit except the first names its parent, so the commits form a chain that you follow backwards from the newest. Two commits can have the same parent (when two lines of work start from one place), and one commit can have two parents (when two lines of work are joined, 01-08-03). So in general the commits form a **graph**: each commit is a point, each `parent` an arrow to an older commit. Because an arrow can only point at a commit that already existed, no chain of arrows ever comes back to where it started. That shape is a **directed acyclic graph**, a DAG: *directed* because each arrow goes one way, *acyclic* because there are no loops.

```
git log --oneline --graph
```

```
* eaaa398 (HEAD -> main) Store samples and notes byte for byte
* 3d8d3d4 Add blob_id.py, which computes Git's id for a file
* 8ecd883 Add Kit as it stands after module 1.7
```

```predict
question: Suppose you could change one byte of samples/app.log in the first commit, 8ecd883, without touching the others. Which commits' ids would change?
choice: Only 8ecd883
choice: 8ecd883 and every commit after it
choice: None: ids are fixed once made
answer: 8ecd883 and every commit after it
explain: Its blob changes, so its tree, so its id. The second commit's text names its parent by that id, so its text changes, so its id changes, and so on to the newest. That's why rewriting history (01-08-03) gives every later commit a new id, and why a commit id vouches for everything before it.
```

**Branches and `HEAD`.** A **branch** is a name for one commit, and nothing more: a file holding an id. **`HEAD`** says which branch you're on. Read both:

```
cat .git/HEAD
cat .git/refs/heads/main
git rev-parse HEAD
```

```
ref: refs/heads/main
eaaa39817de729f9dd383cb0d3fe6dcda2f0b4e3
eaaa39817de729f9dd383cb0d3fe6dcda2f0b4e3
```

(`cat` works in PowerShell too.) `HEAD` says "I'm the branch `main`"; `main` says "I'm commit `eaaa398`". When you commit, Git makes the new commit with the current one as its parent and moves the branch you're on to it. That's how a branch grows: the name moves forward, and the commits stay where they are.

To look at an old commit, switch to it directly. `HEAD~2` means "two parents back from `HEAD`":

```
git switch --detach HEAD~2
```

```
HEAD is now at 8ecd883 Add Kit as it stands after module 1.7
```

Kit's folder is now exactly the first commit: `blob_id.py` and `.gitattributes` are gone from it (`ls` shows it). They aren't lost. They're in the later commits, and `main` still names the newest. `cat .git/HEAD` now prints a commit id instead of `ref: refs/heads/main`: you're on a commit, not on a branch, which Git calls a **detached HEAD**. A commit made here belongs to no branch, and is easy to lose once you switch away. Look, then go back:

```
git switch main
```

```check
run "cd kit; git branch --show-current" stdout="main" -- Switch back to main after looking at the old commit (git switch main).
run "cd kit; git rev-list --count HEAD" stdout="3" -- main should have three commits.
run "cd kit; git cat-file -e HEAD:blob_id.py" -- Back on main, blob_id.py is in the commit again.
```

## Commits that each do one thing

A history is only useful if you can read it. Three habits make it readable:

- **One change per commit.** "Add a README" and "fix a bug in `filter`" are two commits, even if you did them in the same hour. Then each can be read, reviewed, and undone (01-08-03) on its own. The staging area exists for exactly this: `git add` the files for one change, commit, then the next.
- **A summary line in the imperative,** short enough to read in a one-line log, about 50 characters: "Add a README saying what Kit is", as if finishing the sentence "This commit will…". Not "changes", not "stuff", not "fixed it".
- **A body that says why,** when it isn't obvious. The diff shows *what* changed; only the message can say why. A second `-m` adds a paragraph.

Practise all three on a **branch**, the usual place for a change in progress. `git switch -c readme` creates a branch called `readme` at the current commit and switches to it:

```
git switch -c readme
```

Then write a README, the file people open first in a project:

```markdown file=kit/README.md
# Kit

Small command-line tools for looking at files, written while learning
software engineering: `count`, `filter`, `hexdump`, `tree` and `csv`.

Each tool runs with the project's virtual environment, from this folder:
`.venv/bin/python count.py samples/hello.txt` (on Windows,
`.venv/Scripts/python`). `python run_checks.py` runs every check.
```

Save it and commit it, with a body:

```
git add README.md
git commit -m "Add a README saying what Kit is" -m "Newcomers couldn't tell the tools from the scratch files."
git log --oneline --decorate --all
```

```
b859aec (HEAD -> readme) Add a README saying what Kit is
eaaa398 (main) Store samples and notes byte for byte
3d8d3d4 Add blob_id.py, which computes Git's id for a file
8ecd883 Add Kit as it stands after module 1.7
```

`--decorate` shows where the names point: `readme`, with `HEAD` on it, has moved to the new commit; `main` is still one behind. Now switch to `main`:

```
git switch main
```

`README.md` vanishes from the folder, because `main`'s commit doesn't have it. Bring `main` up to date: since `readme` is just `main` plus one commit, "joining" them means moving the name `main` forward, which Git calls a **fast-forward**. `--ff-only` asks for exactly that and refuses anything else (real merges are 01-08-03):

```
git merge --ff-only readme
git branch -d readme
```

```
Updating eaaa398..b859aec
Fast-forward
 README.md | 8 ++++++++
 1 file changed, 8 insertions(+)
 create mode 100644 README.md
Deleted branch readme (was b859aec).
```

Deleting the branch deletes only its name; the commit is on `main`. `git log -1` shows the whole message, body included, and `git status` says `nothing to commit, working tree clean`.

**What else, and why not.**

| Way to keep history | Cost |
|---|---|
| Copies of the folder (`notes-backup/`, `kit-final-v2/`) | No record of what changed or why; copies drift; nothing tells you which is current |
| One repository for the whole course folder | Every project's history mixed together; can't share or copy one project alone |
| One big commit at the end of each day | Unrelated changes tangled together: can't review or undo one without the others |
| Committing `.venv` and generated files | Huge commits full of machine-specific paths; real changes hidden in noise |
| Leaving out `.gitattributes` | Fine for source code; silent damage to files whose bytes matter, on someone else's computer |

```check
run "cd kit; git cat-file -e HEAD:README.md" -- README.md should be committed on main.
run "cd kit; git branch --show-current" stdout="main" -- You should be back on main.
run "cd kit; git rev-parse --verify --quiet refs/heads/readme" exit=1 -- The readme branch should be deleted once main has its commit.
run "cd kit; .venv/Scripts/python -c \"import subprocess; print(bool(subprocess.run(['git', 'log', '-1', '--format=%b'], capture_output=True, text=True).stdout.strip()))\"" stdout="True" -- The README commit should have a body saying why (a second -m).
run "cd kit; .venv/Scripts/python -c \"import subprocess; r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout + r.stderr)\"" stdout="clean" -- Every change in kit should be committed.
```

## Your turn: Blockfall under Git

Put Blockfall under version control, in its own repository, in two commits that each do one thing:

1. The game: `index.html` and `game.js`.
2. The module experiment from 01-06-05: `shapes.js` and `module-test.html`, with a body saying why the page exists.

Work inside `blockfall` (`cd ../blockfall`). Blockfall needs no `.gitignore` yet (nothing in it is generated), and no `.gitattributes` (a browser reads either line ending). End with a clean working tree, and check your history with `git log --oneline` and `git show --name-only HEAD~1`.

```hints
nudge: The two steps are the same as Kit's, done twice: stage exactly the files of one change, then commit. git status before each commit shows what's in the draft.
concept: git add takes file names, not only "."; that's how one commit gets only some of the files. The first commit in a new repository needs git init -b main first. git show --name-only names the files a commit changed.
shape: git init -b main; git add index.html game.js; git commit -m "…"; git status (two files still untracked); git add shapes.js module-test.html; git commit -m "…" -m "…".
answer: Inside blockfall:
~~~
git init -b main
git add index.html game.js
git commit -m "Add the game: a board, a falling piece and its keys"
git add shapes.js module-test.html
git commit -m "Add shapes.js, a first ES module, and a page that tests it" -m "Modules load only over HTTP, so module-test.html is served with python -m http.server."
git log --oneline
git show --name-only HEAD~1
~~~
The log shows the two commits, newest first; git show lists game.js and index.html for the first. The tempting slip is git add . before the first commit, which puts all four files in one commit; the fix, before you go on, is in 01-08-03 (reset). Another is running git init in the course folder instead of blockfall: then git status lists kit/ and blockfall/ as folders, a sign you're one level too high.
```

```check
run "cd blockfall; git rev-parse --show-toplevel" stdout="/blockfall" -- blockfall should be a Git repository of its own (git init -b main inside blockfall).
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True).stdout.split(); first = git('rev-list', '--max-parents=0', 'HEAD'); names = git('show', '--name-only', '--format=', first[0]) if first else []; print('game.js' in names, 'index.html' in names, 'shapes.js' in names, 'module-test.html' in names)\"" stdout="True True False False" -- Blockfall's first commit should hold the game (index.html and game.js) and not the module experiment.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); names = subprocess.run(['git', 'ls-tree', '--name-only', 'HEAD'], capture_output=True, text=True).stdout.split(); print('shapes.js' in names, 'module-test.html' in names)\"" stdout="True True" -- A later commit should add shapes.js and module-test.html.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout + r.stderr)\"" stdout="clean" -- Every change in blockfall should be committed.
```

**What these checks establish, and what they don't.** They ask Git about each repository: that `kit` and `blockfall` are repositories of their own on `main`, that the right files are ignored, committed and marked as bytes, that a fresh clone keeps the samples' bytes, that Blockfall's first commit is the game alone, and that nothing is left uncommitted. They don't read your messages for sense (only that the README commit has a body), and they can't tell whether a commit does one thing: two unrelated changes in one commit pass. Read your own `git log` as a stranger would: does each line say what changed, and does each commit hold only that?

## What you can do now

- A **repository** keeps a project's history in `.git`. `git add` stages a draft; `git commit` saves it as a **commit**, a state of the whole project with a message.
- `.gitignore` keeps out what's generated or secret; `git check-ignore -v` says why a path is ignored.
- Git stores **objects**: **blobs** (file contents), **trees** (folder listings), **commits** (a tree, parents, author, message). Each id is a SHA-1 of the object's contents, so equal content has an equal id everywhere, and changing anything changes every id after it.
- Commits point at their parents, forming a **DAG**. A **branch** is a movable name for a commit; **`HEAD`** says which branch (or, detached, which commit) you're on.
- Git may convert line endings (`core.autocrlf`); `.gitattributes` with `-text` keeps files whose bytes matter byte for byte, and a fresh clone is the test.
- Good history: one change per commit, an imperative summary line, a body that says why.

```predict
question: A teammate's commit is titled "updates" and changes the parser, the README and a test's expected value together. What's wrong with it, and what would you ask for instead?
explain: The summary says nothing, and the commit tangles three changes, so none can be reviewed or undone alone. Worst, a changed expected value in a test, mixed in with a parser change, could be hiding a bug: the test was changed to agree with the new code (01-08-02 is about spotting exactly that). Ask for three commits, each with an imperative summary ("Accept quoted newlines in the parser", …) and, for the test change, a body saying why the old expected value was wrong.
```

**Next:** 01-08-02 is about reading a diff: what exactly a commit changed, line by line, and a review checklist, used on a change that quietly weakens one of Kit's checks.
