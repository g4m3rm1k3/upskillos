---
title: "Changing History: Merge, Rebase, and Three Ways to Undo"
runtime: python
---

The review branch from 01-08-02 is ready: `count` is faster, and it counts every word once. But while it was being reviewed, `main` moved on, and both branches changed the same lines of `count.py`. Git can't fast-forward any more (01-08-01) and has to join two lines of work. Sometimes it can't decide on its own which version of a line is right, and it stops and asks you. This lesson joins the branches in both of Git's ways, **merge** and **rebase**, and resolves a **conflict**. It then undoes three kinds of mistake with three commands that sound alike and do very different things: **restore**, **revert** and **reset**. Along the way it covers putting unfinished work aside (**stash**) and marking a release (**tags**).

**By the end you can:**

- Merge two branches that have both moved on, resolve a conflict, and check the result before committing it.
- Explain what a rebase does to commit ids, and decide when to merge and when to rebase.
- Choose between `restore`, `revert` and `reset` for a given mistake, and recover a commit with `reflog`.
- Put work aside with `stash`, and mark a release with an annotated tag.

**You need:** 01-08-01 (commits, branches, `HEAD`) and 01-08-02 (the `review-faster-count` branch, the `origin` remote). Commands run inside `kit`.

One safety note first: some Git commands open a text editor for a message. If one opens and you don't know it, it's probably Vim: type `:wq` and press Enter to save and continue. This lesson gives every message with `-m` or `--no-edit`, so it shouldn't happen.

## Work on the wrong branch

You're on `review-faster-count` (run `git status` to check). Suppose you start a small, unrelated change: a line at the end of `README.md`. Add this as its last line, after a blank line:

```
Kit's history is in Git: `git log --oneline` lists every change.
```

Then you notice the branch. This line belongs on `main`, not in the review. Committing it here would mix it into someone else's change, and switching with uncommitted work is how changes end up on the wrong branch. **`git stash`** puts uncommitted changes aside, on a stack, and leaves the working tree clean:

```
git stash
git stash list
```

```
Saved working directory and index state WIP on review-faster-count: 7c11cde Leave the README line for a change of its own
stash@{0}: WIP on review-faster-count: 7c11cde Leave the README line for a change of its own
```

(WIP means "work in progress".) Now switch, take the change back off the stack with `git stash pop`, and commit it where it belongs:

```
git switch main
git stash pop
git add README.md
git commit -m "Say in the README that Kit's history is in Git"
```

`git stash pop` ends with `Dropped refs/stash@{0}`: the change is back in the folder and gone from the stack. A stash isn't a commit on any branch, so don't leave work there for long. `git stash list` is how you find a forgotten one.

```check
run "cd kit; git branch --show-current" stdout="main" -- Switch to main for this change.
run "cd kit; git show main:README.md" stdout="Kit's history is in Git" -- The README line should be committed on main.
run "cd kit; git show review-faster-count:README.md" without="Kit's history is in Git" -- The review branch should not have the README line.
run "cd kit; .venv/Scripts/python -c \"import subprocess; r = subprocess.run(['git', 'stash', 'list'], capture_output=True, text=True); print('empty' if r.returncode == 0 and not r.stdout.strip() else r.stdout)\"" stdout="empty" -- The stash should be empty again (git stash pop).
```

## Main moves on

One more change on `main`, a comment in `feed`. In `count.py`, between the lines `words = state["words"]` and `for byte in chunk:`, add:

```
    # A word starts at a byte that isn't whitespace, after one that is.
```

Save it. `git diff` shows exactly that one added line. Commit it; `-a` stages every tracked file you've changed, so `git add` isn't needed for a change like this:

```
git commit -am "Say in feed where a word starts"
git log --oneline --graph --all
```

```
* ff9e03c Say in feed where a word starts
* 2827be9 Say in the README that Kit's history is in Git
| * 7c11cde Leave the README line for a change of its own
| * fb27c29 Remove the tqdm dependency, which nothing uses
| * b95d90e Count a word that crosses two chunks once
| * d592bbc Speed up count
|/
* 16aa286 Add a README saying what Kit is
...
```

This is the fork that 01-08-01 described: two commits on `main` and four on `review-faster-count`, both with the parent `16aa286`. Neither branch contains the other, so a fast-forward isn't possible. And both changed `feed`.

```check
run "cd kit; git show main:count.py" stdout="# A word starts at a byte that isn't whitespace, after one that is." -- main's feed should have the new comment, committed.
run "cd kit; git merge-base --is-ancestor review-faster-count main" exit=1 -- The review branch isn't joined into main yet.
run "cd kit; git merge-base --is-ancestor main review-faster-count" exit=1 -- main has commits the review branch doesn't: the two have both moved on.
```

## Rebase, and why not here

There are two ways to join the branches. A **rebase** replays the branch's commits, one at a time, on top of the newest `main`, as if the work had started there. The history comes out as one straight line, which is easy to read. Try it on the review branch:

```
git switch review-faster-count
git rebase main
```

```
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
Auto-merging count.py
CONFLICT (content): Merge conflict in count.py
error: could not apply d592bbc... Speed up count
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
...
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
```

The rebase stopped at the first of the four commits, Sam's, because it changes lines that `main` changed too. You would resolve this commit's conflicts, then the next commit's, and so on through all four, including commits whose changes are later undone. Stop it:

```
git rebase --abort
```

The branch is back exactly as it was. Before you'd go on with a rebase, there's a deeper problem: **a rebase makes new commits.** Each replayed commit has a new parent, so it gets a new id (01-08-01: a commit's id covers its parents). The original commits are already on `origin`, and in a team someone may have fetched them or built on them. After a rebase, their copies and yours describe two different histories of the same work. The usual rule follows: **rebase only commits nobody else has.** A rebase keeps your own unpushed work tidy before you share it. Shared branches are joined by merging.

```predict
question: If you finished the rebase, what would happen to the id of the commit "Count a word that crosses two chunks once"?
choice: It stays b95d90e: the change is the same
choice: It gets a new id
answer: It gets a new id
explain: Its contents now have a different parent (the rebased "Speed up count", itself new), and the files it records include main's two commits. The change it makes is the same, but it's a different commit, and git push would refuse to replace the branch on origin without --force.
```

```check
missing kit/.git/rebase-merge -- No rebase should be in progress (git rebase --abort).
run "cd kit; git log -1 --format=%s review-faster-count" stdout="Leave the README line for a change of its own" -- The review branch should be exactly as it was before the rebase.
```

## A merge, and a conflict

A **merge** joins the branches with a new commit that has *two* parents: the tip of each branch. Nothing already made changes, so the pushed commits keep their ids. Merge the review into `main`:

```
git switch main
git merge review-faster-count
```

```
Auto-merging count.py
CONFLICT (content): Merge conflict in count.py
Automatic merge failed; fix conflicts and then commit the result.
```

Git compared each branch with their common ancestor, `16aa286`. For each line, if only one side changed it, Git takes that side's version. That's why `README.md` went through silently: on the review branch it ends exactly as it started. In `count.py`, both sides changed the same lines, so Git won't guess. `git status --short` marks the file `UU`, unmerged. Open `count.py` and find `feed`:

```
<<<<<<< HEAD
    words = state["words"]
    # A word starts at a byte that isn't whitespace, after one that is.
    for byte in chunk:
        if byte in WHITESPACE:
            in_word = False
        elif not in_word:
            in_word = True
            words += 1
=======
    # bytes.split() splits on the same six whitespace bytes, and runs in C:
    # much faster than a Python loop over every byte.
    words = state["words"] + len(chunk.split())
    # A word that crosses from the last chunk into this one was counted
    # there already: its second half is this chunk's first part.
    if in_word and chunk and chunk[0] not in WHITESPACE:
        words -= 1
    if chunk:
        in_word = chunk[-1] not in WHITESPACE
>>>>>>> review-faster-count
```

These are **conflict markers**. Between `<<<<<<< HEAD` and `=======` is your side, `main`. Between `=======` and `>>>>>>> review-faster-count` is the branch's side. Resolving the conflict means replacing everything from `<<<<<<<` to `>>>>>>>` with the code that should be there. That isn't "pick one". Here the right answer keeps the branch's fast, correct code and the meaning of `main`'s comment, which still describes what a word is. Replace the whole marked region with:

```
    # bytes.split() splits on the same six whitespace bytes, and runs in C:
    # much faster than a Python loop over every byte. A word starts at a byte
    # that isn't whitespace, after one that is.
    words = state["words"] + len(chunk.split())
    # A word that crosses from the last chunk into this one was counted
    # there already: its second half is this chunk's first part.
    if in_word and chunk and chunk[0] not in WHITESPACE:
        words -= 1
    if chunk:
        in_word = chunk[-1] not in WHITESPACE
```

Save it. A resolution is new code nobody has tested, so test it before committing:

```
.venv/bin/python check_counts.py
```

(On Windows, `.venv/Scripts/python`.) It prints `words passed: 8 of 8` and the three other lines. Now tell Git the conflict is resolved, by staging the file, and make the merge commit:

```
git add count.py
git commit -m "Merge the faster count from review-faster-count"
git cat-file -p HEAD
```

```
tree 76457807d8636279516b54ebc116514115850b22
parent ff9e03cdba79a81649cd8030e6da1ad8c894d7e0
parent 7c11cde78f210e08daf6bfe18f207b18809b702c
author Your Name <you@example.com> 1794758373 -0500
...
```

Two `parent` lines: `main`'s last commit and the review branch's. `git log --oneline --graph` now shows the two lines of work joining:

```
*   3b28fee Merge the faster count from review-faster-count
|\
| * 7c11cde Leave the README line for a change of its own
| * fb27c29 Remove the tqdm dependency, which nothing uses
| * b95d90e Count a word that crosses two chunks once
| * d592bbc Speed up count
* | ff9e03c Say in feed where a word starts
* | 2827be9 Say in the README that Kit's history is in Git
|/
* 16aa286 Add a README saying what Kit is
```

Push `main`, so `origin` has the merge too: `git push`. The review branch's work is now part of `main`; `git branch -d review-faster-count` would delete its name, and Git allows it because the branch is merged. Keep it for now.

A conflict is not an error. It means two people changed the same lines and Git won't choose between them. Read both sides, write the code that should be there, then test it. A merge with no conflicts can still be wrong, when each side is fine alone but they don't work together. Run the checks after every merge.

```check
lacks kit/count.py "<<<<<<<" -- count.py should have no conflict markers left.
lacks kit/count.py ">>>>>>>" -- count.py should have no conflict markers left.
run "cd kit; .venv/Scripts/python check_counts.py" stdout="words passed: 8 of 8" -- The merged count.py should pass every check.
run "cd kit; .venv/Scripts/python -c \"import io, count; data = b'ab ' * 30000; print(count.count_stream(io.BytesIO(data), 'utf-8')['words'])\"" stdout="30000" -- The merge should keep the branch's boundary fix.
run "cd kit; git merge-base --is-ancestor review-faster-count main" -- The review branch should be merged into main.
run "cd kit; .venv/Scripts/python -c \"import subprocess; print(len(subprocess.run(['git', 'rev-list', '--parents', '-1', 'main'], capture_output=True, text=True).stdout.split()) - 1)\"" stdout="2" -- main's newest commit should be a merge, with two parents.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True).stdout.strip(); print(git('rev-parse', 'main') == git('rev-parse', 'origin/main'))\"" stdout="True" -- Push main so origin has the merge (git push).
```

## Undo, three ways

Three commands undo things, and they're easy to confuse. Each is for a different mistake.

**Restore: throw away a change you haven't committed.** Delete a sample by accident:

| Windows (PowerShell) | macOS or Linux |
|---|---|
| `Remove-Item samples/hello.txt` | `rm samples/hello.txt` |

`git status --short` shows ` D samples/hello.txt`, deleted. Get the committed version back:

```
git restore samples/hello.txt
```

It's back, 7 bytes (thanks to `.gitattributes`, byte for byte). `git restore FILE` rewrites a file from the last commit, so **it discards whatever you'd changed in that file**, with no way back. `git restore --staged FILE` does something milder: it takes a file out of the staging area and leaves your edits alone.

**Revert: undo a commit that's already shared.** Make a bad change and push it, as if it had slipped through: in `count.py`, change the `WHITESPACE` line to

```
WHITESPACE = b" \n"
```

then commit and push it, and run the check:

```
git commit -am "Treat only spaces and newlines as whitespace"
git push
.venv/bin/python check_counts.py
```

`words passed: 7 of 8`: the tab and carriage-return example fails. The commit is on `origin` now, so it can't be taken out quietly, because others may already have it. **`git revert` makes a new commit that does the opposite** of the one you name:

```
git revert --no-edit HEAD
git log --oneline -3
```

```
aae50f1 Revert "Treat only spaces and newlines as whitespace"
2b66467 Treat only spaces and newlines as whitespace
3b28fee Merge the faster count from review-faster-count
```

The history keeps both the mistake and its undoing, and says so. `git show HEAD` says `This reverts commit 2b66467…`. The check passes again. `git push` shares the revert like any other commit.

**Reset: move the branch back, before you've shared it.** Make another bad commit, and don't push it: change the `CHUNK_SIZE` line to `CHUNK_SIZE = 64  # how many bytes to read at a time`, then

```
git commit -am "Read smaller chunks"
git status
```

```
On branch main
Your branch is ahead of 'origin/main' by 1 commit.
  (use "git push" to publish your local commits)
```

`ahead of 'origin/main' by 1 commit`: `origin` doesn't have it. Since no one else has this commit, you can make it never have happened. **`git reset` moves the current branch to another commit.** `HEAD~1` is the commit before:

```
git reset HEAD~1
```

```
Unstaged changes after reset:
M	count.py
```

The branch has moved back one commit, and `git log` no longer shows "Read smaller chunks". The change itself is still in your folder, uncommitted. That's plain `reset` (called *mixed*): it moves the branch and keeps your files. Now that the change is uncommitted, `git restore count.py` throws it away. `git reset --hard HEAD~1` would have done both in one step, and like `restore`, it discards uncommitted changes with no way back. Use it carefully (01-06-06).

Is the reset commit gone? Not quite. **`git reflog`** lists every commit `HEAD` has pointed at recently, including ones no branch names any more:

```
git reflog -4
```

```
aae50f1 HEAD@{0}: reset: moving to HEAD~1
8d23a61 HEAD@{1}: commit: Read smaller chunks
aae50f1 HEAD@{2}: revert: Revert "Treat only spaces and newlines as whitespace"
2b66467 HEAD@{3}: commit: Treat only spaces and newlines as whitespace
```

`git reset 8d23a61` would bring it back. Git keeps commits that no branch names for a while (weeks, by default) before deleting them, which makes the reflog the way back from most Git mistakes. It won't save uncommitted work, though: what `restore` or `reset --hard` overwrote was never in a commit.

```predict
question: You pushed a commit an hour ago, and it has a bug. Which do you use to undo it?
choice: git restore
choice: git revert
choice: git reset
answer: git revert
explain: The commit is shared, so the history others have must stay valid: revert adds a commit that undoes it. reset would move your branch back, and the next push would be refused (origin is ahead), or with --force would remove a commit others may have built on. restore only works on uncommitted changes.
```

**What else, and why not.**

| Command | Undoes | Changes history? | Use it when |
|---|---|---|---|
| `git restore FILE` | Uncommitted changes to a file | No; the changes are lost | You want the committed version back |
| `git revert COMMIT` | A commit, by adding its opposite | No, it adds to it | The commit is shared (pushed) |
| `git reset COMMIT` | Commits after `COMMIT`, by moving the branch | Yes | The commits are only yours (not pushed) |
| `git rebase` | Nothing; it replays commits elsewhere | Yes, new ids | Tidying your own unpushed work |
| `git merge` | Nothing; it joins two lines of work | No, it adds a commit | Joining shared branches |

```check
run "cd kit; git status --porcelain samples" without="hello.txt" -- samples/hello.txt should be back (git restore samples/hello.txt).
contains kit/count.py "WHITESPACE = b\" \\t\\n\\r\\x0b\\x0c\"" -- The WHITESPACE line should be back to all six bytes, by the revert.
run "cd kit; git log --format=%s -5 main" stdout="Revert \"Treat only spaces and newlines as whitespace\"" -- The bad pushed commit should be undone with git revert.
run "cd kit; git log --format=%s main" without="Read smaller chunks" -- The unpushed commit should be gone from main (git reset HEAD~1, then git restore count.py).
contains kit/count.py "CHUNK_SIZE = 65536" -- CHUNK_SIZE should be back to 65536.
run "cd kit; .venv/Scripts/python check_counts.py" stdout="words passed: 8 of 8" -- Every check should pass again.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('rev-parse', 'main').stdout == git('rev-parse', 'origin/main').stdout)\"" stdout="clean True" -- Nothing should be left uncommitted, and origin should have the revert (git push).
```

## Tags

A branch name moves with every commit. A **tag** is a name that stays on one commit: "this is version 0.2.0". Release Kit: in `pyproject.toml`, change `version = "0.1.0"` to `version = "0.2.0"`, then commit and tag:

```
git commit -am "Release 0.2.0"
git tag -a v0.2.0 -m "Kit 0.2.0: count is faster on big files"
git log --oneline --decorate -1
```

```
f2a8b95 (HEAD -> main, tag: v0.2.0) Release 0.2.0
```

`-a` makes an **annotated** tag, which is an object of its own, the fourth kind after 01-08-01's three:

```
git cat-file -p v0.2.0
```

```
object f2a8b953c06dba90fd1349d21d3c71dec1ca54fe
type commit
tag v0.2.0
tagger Your Name <you@example.com> 1794758390 -0500

Kit 0.2.0: count is faster on big files
```

It records who tagged which commit, when, and why. A tag without `-a` (*lightweight*) is only a name, like a branch that never moves. Use annotated tags for releases. `git push` doesn't send tags, so push them by name:

```
git push
git push origin v0.2.0
```

```
To ../kit-remote.git
 * [new tag]         v0.2.0 -> v0.2.0
```

From now on `git switch --detach v0.2.0` gives anyone exactly this version, and `git describe` names the newest tag reachable from where you are.

```check
run "cd kit; git cat-file -t v0.2.0" stdout="tag" -- v0.2.0 should be an annotated tag (git tag -a).
run "cd kit; git describe --exact-match main" stdout="v0.2.0" -- The tag should be on main's newest commit.
contains kit/pyproject.toml "version = \"0.2.0\"" -- pyproject.toml should say version 0.2.0.
run "cd kit; git ls-remote --tags origin" stdout="refs/tags/v0.2.0" -- Push the tag (git push origin v0.2.0).
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True).stdout; print(git('rev-parse', 'main') == git('rev-parse', 'origin/main'))\"" stdout="True" -- Push main too (git push).
```

## Your turn: a conflict in Blockfall

Do it again in Blockfall, without the steps written out. Two lines of work, both changing the same line of `game.js`:

1. On a new branch `faster-fall`, change `const FALL_MS = 800;` to `const FALL_MS = 500;` and commit.
2. On `main`, give the same line a comment: `const FALL_MS = 800; // milliseconds between steps down`, and commit.
3. Merge `faster-fall` into `main`. Resolve the conflict so the game falls every 500 milliseconds *and* keeps the comment. Reload the page and play it for a moment before committing the merge (01-02-03: open `index.html`).
4. Tag the result `v0.1.0`, Blockfall's first release, as an annotated tag.

Work inside `blockfall`, which has no remote, so there's nothing to push.

```hints
nudge: The order matters: make the branch's commit, then switch back to main for its commit, so that both have moved on. Then the merge can't fast-forward, and conflicts.
concept: git switch -c faster-fall; edit; git commit -am. git switch main; edit the same line differently; git commit -am. git merge faster-fall stops with CONFLICT. In game.js, replace the region from <<<<<<< to >>>>>>> with the one line you want, git add game.js, git commit -m. Then git tag -a v0.1.0 -m "…".
shape: The conflict region is <<<<<<< HEAD, main's line with the comment, =======, the branch's line with 500, >>>>>>> faster-fall. The resolution is one line: const FALL_MS = 500; // milliseconds between steps down
answer: Inside blockfall:
~~~
git switch -c faster-fall
(change the line to const FALL_MS = 500;)
git commit -am "Make the piece fall faster"
git switch main
(change the line to const FALL_MS = 800; // milliseconds between steps down)
git commit -am "Say what FALL_MS measures"
git merge faster-fall
(replace the five lines from <<<<<<< HEAD to >>>>>>> faster-fall with:)
const FALL_MS = 500; // milliseconds between steps down
(reload index.html and play)
git add game.js
git commit -m "Merge the faster fall from faster-fall"
git tag -a v0.1.0 -m "Blockfall 0.1.0: a falling piece, keys, undo and a ghost"
~~~
The tempting slips are keeping one side whole (losing either the speed or the comment), and leaving a marker line in game.js: the page then stops with a SyntaxError in the console, and nothing draws. That's why you play it before you commit the merge.
```

```check
page blockfall/index.html "FALL_MS" 500 -- The game should fall every 500 milliseconds after the merge.
contains blockfall/game.js "const FALL_MS = 500; // milliseconds between steps down" -- The resolved line should keep the speed and the comment.
lacks blockfall/game.js "<<<<<<<" -- game.js should have no conflict markers left.
lacks blockfall/game.js ">>>>>>>" -- game.js should have no conflict markers left.
page blockfall/index.html "typeof game === 'object'" true errors=none -- The page should load without errors.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); merged = git('merge-base', '--is-ancestor', 'faster-fall', 'main').returncode == 0; parents = len(git('rev-list', '--parents', '-1', 'main').stdout.split()) - 1; print(merged, parents)\"" stdout="True 2" -- faster-fall should be merged into main with a merge commit (both branches moved on first).
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True).stdout.strip(); print(git('cat-file', '-t', 'v0.1.0'), git('describe', '--exact-match', 'main'))\"" stdout="tag v0.1.0" -- Tag main's merge commit as v0.1.0 with an annotated tag.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout + r.stderr)\"" stdout="clean" -- Every change in blockfall should be committed.
```

**What these checks establish, and what they don't.** They check the results in both repositories: the branches are joined by real merge commits, no conflict markers are left, the merged code passes Kit's checks and runs Blockfall at the resolved speed without errors, the mistakes are undone with the right command for each, and the releases are tagged and pushed. They can't see how you got there. A merge made with `-X theirs` (which takes one side automatically) would pass the Kit checks if it happened to give the same code. They also can't tell whether you'd choose `revert` over `reset` for a pushed commit without being told. That choice is the one to practise: ask "has anyone else got this commit?" before every undo.

## What you can do now

- **Merge** joins two branches with a commit that has two parents; nothing existing changes. **Rebase** replays commits on a new base, making new ids, so rebase only what nobody else has.
- A **conflict** is two changes to the same lines. Between `<<<<<<<`, `=======` and `>>>>>>>` are both sides; write the code that should be there, test it, `git add`, commit. `git merge --abort` and `git rebase --abort` go back.
- **Restore** discards uncommitted changes to a file. **Revert** undoes a shared commit with a new one. **Reset** moves the branch back over commits only you have. **Reflog** finds commits no branch names.
- **Stash** puts uncommitted work aside (`git stash`, `git stash pop`, `git stash list`).
- An annotated **tag** (`git tag -a`) names a release for good; push it with `git push origin TAG`.

```predict
question: You finished a feature on your own branch, never pushed, in eight messy commits ("wip", "fix", "fix again"). main has moved on. How would you tidy it and join it, and what would you not do if the branch were already on origin with a teammate working on it?
explain: Unpushed and yours alone, it's safe to rewrite: rebase it onto main (resolving conflicts once per commit, or first combining the commits; a later module covers interactive rebase), so it arrives as a few clear commits on top of main, then merge or fast-forward. If a teammate has the branch, rewriting it would leave their copy describing a different history: merge main into it, or join it with a merge, and leave its commits as they are.
```

**Next:** 01-08-04 uses Git as an investigation tool: `bisect` to find the commit that broke something, `blame` to see who last changed a line and why, worktrees to have two versions checked out at once, hooks that run before a commit, and what to do when a secret has been committed.
