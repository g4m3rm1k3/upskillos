# Lesson 20 — Git: What a Commit Actually Is

## Why now
Nineteen lessons of real code exist right now only as loose files. If you edit one and break something, there's no way back except memory. "Just keep a copy" doesn't scale past a handful of changes. This lesson isn't git-as-a-checklist-of-commands — it's what a commit actually *is*, mechanically, because that understanding is what makes every git command afterward make sense instead of feeling like memorized incantations.

## What you'll learn
- What `git commit` actually stores — proof it's a full snapshot, not a diff
- Why unchanged files don't get re-stored between commits, and how that's possible without storing diffs
- A real, easy-to-hit trap involving *when* you edit a file relative to `git add` — not the beginner mistake you'd expect
- The actual three-state model (working directory, staging area, repository) that every other git command builds on

## The question
When you run `git commit`, does git store "the lines that changed since last time" (a diff), or something else entirely? This matters more than it sounds — it determines how `git log`, `git diff`, and checking out an old version actually work underneath.

## 1. Predict
Before running anything: if you commit a file, then commit again after changing a *different* file (leaving the first one untouched), do you think the first file gets stored again in the second commit, or does git somehow avoid re-storing something that hasn't changed?

## 2. Try it
```bash
git init
git config user.email "you@example.com"
git config user.name "Learner"

echo "print('hello')" > script.py
git add script.py
git commit -m "Add script"

git log --oneline
git cat-file -p HEAD
```

### What this code does
- `git init` — creates a `.git` directory: an entirely separate storage system living alongside your files, not something bolted onto the filesystem.
- `git add script.py` — copies `script.py`'s **current content** into the staging area (also called the index) — a real, distinct location, not a marker or a flag on the file.
- `git commit -m "..."` — takes whatever is currently in the staging area and permanently records it as a new snapshot.
- `git cat-file -p HEAD` — a low-level command that shows the *raw* content of the most recent commit object, bypassing git's normal user-friendly output. This is deliberately used here instead of `git show`, specifically to see what git actually stores, not a formatted summary of it.

### What happens
Real output:
```
952f583 Add script
tree 4fee17d97fef62dbd2e79d683fa320a827ec991c
author Learner <you@example.com> 1788856968 +0000
committer Learner <you@example.com> 1788856968 +0000

Add script
```
A commit object contains: a pointer to a `tree` (a hash — a fixed-length string computed from content, not a filename or timestamp), author/committer info, a message, and (on later commits) a pointer to the previous commit. Notably: **no diff, no list of changed lines, anywhere in this object.**

## 3. Following the pointer — what's actually a snapshot
```bash
git cat-file -p HEAD^{tree}
```
Real output:
```
100644 blob b376c9941fda362c8d2c5c8ddb35db3e0b003402    script.py
```
The `tree` object the commit pointed to is a **complete listing of every file in the project at that moment** — here, just `script.py` — each pointing to a `blob` (git's term for stored file content), identified by another hash.
```bash
git cat-file -p b376c9941fda362c8d2c5c8ddb35db3e0b003402
```
```
print('hello')
```
That hash, `b376c994...`, isn't arbitrary — it's computed **from the content itself** (a SHA-1 hash of the file's bytes). This is the actual mechanism: identical content always produces the identical hash, no matter when or where it's stored.

### Mental model
```
commit object  →  points to  →  tree object  →  lists  →  blob(s)
  (metadata)                   (snapshot of              (actual file
                                all files at              content, hashed)
                                this moment)
```
A commit is a full snapshot of the entire project at that instant — reached by following pointers — not a record of what changed.

## 4. Proof: unchanged content is never re-stored
```bash
echo "print('goodbye')" > other.py
git add other.py
git commit -m "Add other script"

git cat-file -p HEAD^{tree}
git rev-parse HEAD:script.py
```
Real output:
```
100644 blob 7d029fac923e9dabcdb60241e5604f76c8a6355a    other.py
100644 blob b376c9941fda362c8d2c5c8ddb35db3e0b003402    script.py

b376c9941fda362c8d2c5c8ddb35db3e0b003402
```
`script.py`'s blob hash — `b376c994...` — is **exactly the same** as it was in the first commit. `script.py` wasn't touched, so its content hashes to the same value, so git's second tree just points at the *same already-existing blob* rather than storing a duplicate copy. This answers step 1's prediction directly: unchanged files aren't re-stored, but not because git is tracking "what changed" — it's a side effect of content-addressing: identical content always produces an identical hash, so there's simply nothing new to store.

## 5. The real trap — not the one you'd expect
The classic beginner fear is "I'll forget to `git add` and lose my work." Modern git actually protects against that loudly — try committing with nothing staged, and git refuses outright with a clear message, not a silent no-op. The trap that actually costs people time is different, and subtler:

```bash
echo "print('EDITED')" > script.py
git add script.py
echo "print('EDITED AGAIN')" > script.py
git commit -m "Edit script"

git show HEAD:script.py
cat script.py
git status --short
```
Real output:
```
--- committed content ---
print('EDITED')
--- working directory content ---
print('EDITED AGAIN')
--- status ---
 M script.py
```
The commit captured `"EDITED"` — **not** `"EDITED AGAIN"`. `git status` afterward still shows `script.py` as modified, even though you just committed it.

### Exact reason
`git add` copies the file's content into the staging area **at the moment `add` runs** — a snapshot of that instant, not a live link to the file. Editing the file *again* afterward changes the working directory, but the staging area still holds the earlier snapshot from when `add` ran. `git commit` only ever commits what's in the staging area — it never looks at the working directory directly. The second edit was simply never staged, so it was never eligible to be committed at all, and it's still sitting there, uncommitted, in the working directory.

### Project consequence
This is genuinely common in real workflows — stage a file, get distracted, make one more tweak, commit, and ship a commit that's missing your last change, with `git status` afterward being the only signal something's off (and easy to not check). The habit worth building: run `git status` (or `git diff --staged` to see exactly what will be committed) immediately before every commit, not just occasionally — never trust that "I ran `git add` earlier" still accurately describes the current state of the file.

## 6. The three-state model, now grounded in what you just saw
```
working directory  →  git add  →  staging area  →  git commit  →  repository (commits)
  (your actual files,      (a snapshot          (permanent snapshots,
   freely editable)         taken at             each pointing to a tree
                             add-time)            of blobs)
```
`git diff` (no arguments) compares working directory against staging area. `git diff --staged` compares staging area against the last commit. Neither of these is "showing you a stored diff" — both are computed on the fly, right then, by comparing two snapshots' content — consistent with everything shown above: git never stores diffs, only snapshots; anything that looks like a diff is calculated fresh, every time, from two real snapshots being compared.

## Exercise
- **Predict:** If you `git add` a file, then delete it from the working directory (`rm file.py`) without committing, does `git status` show it as deleted, or does something more surprising happen given what staging actually stores?
- **Modify:** Create two files with identical content (e.g., two files both containing `print('hello')`) and commit them together. Check both files' blob hashes with `git rev-parse HEAD:file1.py` and `git rev-parse HEAD:file2.py`. Are they the same, and why would that make sense given everything this lesson covered?
- **Break:** Reproduce the "staged, then edited again" trap yourself, but this time run `git add` a *second* time after the second edit, then commit. Does the commit now contain the final edit?
- **Repair:** Based on the previous exercise, state in one sentence the actual rule for "what will be committed" — is it "whatever the file currently contains" or something more specific?
- **Trace:** Walk through the blob-hash-reuse example above: after the second commit ("Add other script"), how many blob objects actually exist in the repository in total — one per commit, or one per *distinct piece of content* ever committed? Use the two blob hashes shown to reason it out.

## What to remember
- A commit is a full snapshot (via a tree of blobs), not a diff — `git log`/`git diff` compute differences on demand by comparing snapshots, they don't retrieve a stored diff.
- Identical content always hashes identically, which is *why* unchanged files aren't duplicated across commits — a direct consequence of content-addressing, not a special "did this change" check.
- `git add` captures a snapshot of a file's content at that exact moment — editing the file again afterward does not retroactively update what's staged.
- Always check `git status` or `git diff --staged` immediately before committing — never assume an earlier `git add` still reflects the file's current state.

## Next lesson
Branches and merging — now that "a commit is a snapshot with a pointer to its parent" is solid ground, a branch is just a movable label pointing at one of those snapshots, and a merge is a specific, well-defined way of combining two of them. Both make far more sense built on what this lesson already established than as commands memorized in isolation.
