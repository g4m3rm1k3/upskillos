# Lesson 21 — Branches and Merges: Pointers, Not Copies

## What you'll learn
- What a branch actually is on disk — proof it's not a copy of your files
- What happens mechanically during a merge, including what a merge commit's two parents mean
- A real, complete merge conflict — the exact markers, and how resolving one actually works
- Why understanding commits-as-snapshots (Lesson 20) makes all of this simpler than it looks

## The question
"Create a branch to work on a feature without affecting the main code" is the usual one-line explanation. Given what you now know — a commit is a full snapshot, reached by following pointers — what does "creating a branch" actually *do*? Does it copy every file into a new location?

## 1. Predict
Before running anything: do you think `git branch feature-x` duplicates your project's files somewhere, or does something much smaller happen?

## 2. Try it
```bash
git checkout -b feature-x
echo "print('feature work')" > feature.py
git add feature.py
git commit -m "Add feature.py on feature-x"

cat .git/HEAD
cat .git/refs/heads/feature-x
cat .git/refs/heads/master
```

### What this code does
- `git checkout -b feature-x` — creates a new branch pointing at the current commit, and switches to it. Two actions in one command: create, then move to it.
- `cat .git/refs/heads/feature-x` — branches aren't a special git data structure at all; each one is genuinely just a **plain text file**, living under `.git/refs/heads/`, whose entire content is a single commit hash.
- `cat .git/HEAD` — `HEAD` is git's record of "which branch you're currently on," itself just a text file containing a reference to the current branch (or, in some situations, a raw commit hash directly).

### What happens
Real output:
```
ref: refs/heads/feature-x
8335ab3162bb2522ec269e73c4893b63f7cf112e
9e4a2e201b4a204a59daf3a2766c78d3cbe4332a
```
`.git/HEAD` just says "I'm currently on `feature-x`." `refs/heads/feature-x` contains a commit hash — the new commit just made. `refs/heads/master` contains a *different* hash — the commit master was already pointing at, unaffected by anything just done on `feature-x`. If your prediction was "not a file copy, something much smaller" — this is it: a branch is a 40-character text file containing one hash. Nothing about your project's actual files was duplicated anywhere.

## 3. Why?
### Code mechanics
Because every commit already fully identifies an entire project snapshot (Lesson 20 — following commit → tree → blobs gets you everything), a branch doesn't need to store anything more than "which commit is the tip of this line of work." Switching branches (`git checkout other-branch`) just updates your working directory's files to match whatever that branch's commit snapshot contains, and moves `HEAD` to point there instead.

### Mental model
```
refs/heads/master     → commit hash A
refs/heads/feature-x  → commit hash B

Both hashes point into the SAME underlying commit graph.
"Creating a branch" = writing one new small text file with a hash in it.
"Switching branches" = updating HEAD + refreshing working directory files
                        to match the target commit's snapshot.
```

## 4. A real merge — combining two lines of history
```bash
git checkout master
echo "print('EDITED AGAIN')
print('master-only line')" > script.py
git add script.py
git commit -m "Add master-only line"

git merge feature-x -m "Merge feature-x"
git log --oneline --all --graph
```
Real output:
```
*   4f8ef5e Merge feature-x
|\
| * 8335ab3 Add feature.py on feature-x
* | 0842907 Add master-only line
|/
* 9e4a2e2 Edit script
...
```
`master` and `feature-x` had each gained a commit the other didn't have (`script.py`'s edit on master, `feature.py`'s addition on `feature-x`) — genuinely divergent history. `git merge` created a **new commit with two parents**:
```bash
git cat-file -p HEAD | head -5
```
```
tree 18e924d...
parent 0842907ef3fc987fedadf9c854780f7574abcba7
parent 8335ab3162bb2522ec269e73c4893b63f7cf112e
```
Two `parent` lines — this is what makes a commit a *merge* commit specifically: it's not a new kind of object, it's an ordinary commit that happens to record two prior commits as its parents instead of one, with a tree that combines both branches' changes (here, straightforwardly: `master`'s edited `script.py` plus `feature-x`'s new `feature.py`, since they didn't touch the same lines).

## 5. Why a conflict happens, and what resolving one actually is
```bash
git checkout -b conflict-branch
echo "print('CONFLICT VERSION FROM BRANCH')
print('master-only line')" > script.py
git add script.py
git commit -m "Change first line on conflict-branch"

git checkout master
echo "print('CONFLICT VERSION FROM MASTER')
print('master-only line')" > script.py
git add script.py
git commit -m "Change first line on master"

git merge conflict-branch -m "Merge conflict-branch"
```
Real output:
```
Auto-merging script.py
CONFLICT (content): Merge conflict in script.py
Automatic merge failed; fix conflicts and then commit the result.
```
Both branches edited the exact same line of `script.py`, differently, since their common ancestor commit. Git can automatically combine changes that touch *different* parts of a file (as it did with `script.py`/`feature.py` in the previous merge) — but when the same line diverges in two directions, there's genuinely no automatic "correct" answer, so git stops and asks you.

### What the file actually looks like
```bash
cat script.py
```
```
<<<<<<< HEAD
print('CONFLICT VERSION FROM MASTER')
=======
print('CONFLICT VERSION FROM BRANCH')
>>>>>>> conflict-branch
print('master-only line')
```
This isn't a special "conflict mode" — it's plain text, inserted directly into the actual file, marking both versions. `<<<<<<< HEAD` through `=======` is your current branch's version; `=======` through `>>>>>>> conflict-branch` is the incoming branch's version. `print('master-only line')`, unaffected by either branch, appears once, completely untouched — proof that git correctly identified exactly which lines actually diverged, not just which file.

### Resolving it
```bash
echo "print('RESOLVED VERSION')
print('master-only line')" > script.py
git add script.py
git commit -m "Merge conflict-branch"
```
"Resolving" a conflict means exactly this: manually edit the file to whatever it should actually say (removing the `<<<<<<<`/`=======`/`>>>>>>>` markers entirely — they're not special syntax git strips out for you, they're just text you're responsible for deleting), then `git add` that resolved version like any other change, then commit. The resulting commit is a normal two-parent merge commit, identical in structure to the earlier conflict-free one — a conflict only affects the *process* of getting there, not the shape of the final result.

## 6. Trap
**Normal rule:** `<<<<<<<`/`=======`/`>>>>>>>` markers mean git is waiting for you to resolve a conflict.
**Apparently equivalent code:** editing around the markers, but accidentally leaving one section (say, forgetting to delete the `<<<<<<< HEAD` line itself) in the file before committing.
**Surprising result:** git doesn't detect this — it will happily let you `git add` and `commit` a file that still literally contains `<<<<<<< HEAD` as a text string, since as far as git's concerned, you edited the file and staged a new version; it has no way to know that text was supposed to be a marker you'd remove rather than content you meant to keep.
**Exact reason:** conflict markers are inserted as plain content, and resolution is just "you edit the file" — git doesn't parse the result to check the markers are gone, because after you `git add`, it trusts that whatever's in the staging area is what you meant to commit.
**Project consequence:** always review the actual resolved file (or at minimum, search for `<<<<<<<` before committing) rather than assuming "I fixed it" was applied correctly — this is a genuinely common real mistake, and it silently ships broken code (a stray `<<<<<<< HEAD` line is usually a syntax error in most languages, which at least tends to get caught fast — but not always, and not in every file type).

## Exercise
- **Predict:** If two branches both add a *new*, different file each (not touching any shared file at all), do you expect merging them to ever produce a conflict? Why or why not, given what actually causes one here?
- **Modify:** Create a third branch from `master`, make a change, and merge it in after `feature-x` is already merged. Does `git log --graph` show a three-way relationship, or two separate two-parent merges?
- **Break:** Deliberately leave a `<<<<<<< HEAD` marker in a resolved file (don't delete it), then `git add` and commit anyway. Does git stop you? Confirm with `git show HEAD:script.py` that the marker really did get committed.
- **Repair:** Remove the leftover marker properly with a follow-up commit, and explain in one sentence why "git will catch broken merges for me" is not a safe assumption based on what you just saw.
- **Trace:** Using the two-parent merge commit's raw content from step 4, explain in your own words what each `parent` line refers to, and confirm (via `git log --oneline`) that both hashes correspond to real, distinct prior commits.

## What to remember
- A branch is a small text file containing one commit hash — creating or switching branches never copies your project's files.
- A merge commit is an ordinary commit with two `parent` references instead of one — nothing more exotic than that.
- A conflict happens specifically when the same lines diverge on both branches since their common ancestor — git resolves everything else automatically.
- Conflict markers are plain text you're responsible for removing correctly — git does not verify your resolution is clean before letting you commit it.

## Next lesson
This wraps the core git mechanics that everything else (rebasing, remotes, pull requests) sits on top of. From here: `git remote`/`push`/`pull` (what actually happens when two separate `.git` histories sync with each other — genuinely just more of the same commit-and-pointer mechanics, applied across machines), or back to ML for gradient boosting, still queued from a couple lessons ago. Your call.
