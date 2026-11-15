---
title: "Reading a Diff: Reviewing a Change Before It Lands"
runtime: python
---

A teammate sends you a change to Kit. Its message says `count` is about four times faster and that all checks pass. You run Kit's checks, and they do pass: `8 of 8 passed`. Would you merge it? The change also breaks `count`: on a large file it now reports words that aren't there. And it changes one of Kit's checks so that the check can no longer see the problem. Nothing in the test results shows any of this. Only the **diff** does: the exact lines the change removes and adds. This lesson teaches you to read a diff line by line, to review a change with a checklist, and to test every claim in the message yourself. You'll then send Kit to a **remote**, the other copy of a repository that teams share, where **pull requests** are reviewed.

**By the end you can:**

- Read a unified diff: its file headers, its hunks and their line numbers, and what removed, added and context lines mean.
- Review a change against a checklist, and find a weakened test, an unused dependency, an unrelated change and a TODO in a diff.
- Test a change's claims with experiments before accepting them.
- Set up a remote, push branches to it, and explain what a pull request adds on top of Git.

**You need:** 01-08-01 (Kit and Blockfall under Git), 01-01-04 (`count`'s state machine and `check_counts.py`). Commands run inside `kit`.

## A change arrives

Changes often travel as a **patch**: a text file holding one or more commits, made by `git format-patch`. Create the supplied file with the button. It goes in the course folder, beside `kit`, the way a file you'd been sent would.

```diff file=faster-count.patch provided
From 9beb5a4e84bbcb3697f35332c043d70647235edb Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Sun, 15 Nov 2026 09:30:00 +0000
Subject: [PATCH] Speed up count

count is about four times faster on big files now. All checks pass.
---
 README.md       |  3 ++-
 check_counts.py |  2 +-
 count.py        | 11 ++++-------
 pyproject.toml  |  1 +
 4 files changed, 8 insertions(+), 9 deletions(-)

diff --git a/README.md b/README.md
index 4085ee8..1ce15b8 100644
--- a/README.md
+++ b/README.md
@@ -5,4 +5,5 @@ software engineering: `count`, `filter`, `hexdump`, `tree` and `csv`.
 
 Each tool runs with the project's virtual environment, from this folder:
 `.venv/bin/python count.py samples/hello.txt` (on Windows,
-`.venv/Scripts/python`). `python run_checks.py` runs every check.
+`.venv/Scripts/python`). `python run_checks.py` runs every check:
+run it before every commit.
diff --git a/check_counts.py b/check_counts.py
index 8e818c8..ddb88a6 100644
--- a/check_counts.py
+++ b/check_counts.py
@@ -37,7 +37,7 @@ CHARACTER_EXAMPLES = [
     (b"h\xc3", None),
 ]
 
-SIZES = [1, 2, 3, 4096]
+SIZES = [4096]  # the small sizes made this check slow
 
 
 # Feed data to the state machine in pieces of the given size.
diff --git a/count.py b/count.py
index c948296..3fb8460 100644
--- a/count.py
+++ b/count.py
@@ -29,13 +29,10 @@ def start(encoding):
 
 def feed(state, chunk):
     in_word = state["in_word"]
-    words = state["words"]
-    for byte in chunk:
-        if byte in WHITESPACE:
-            in_word = False
-        elif not in_word:
-            in_word = True
-            words += 1
+    # bytes.split() splits on the same six whitespace bytes, and runs in C:
+    # much faster than a Python loop over every byte.
+    # TODO: a word that crosses from one chunk into the next
+    words = state["words"] + len(chunk.split())
     line_length = state["line_length"]
     longest = state["longest"]
     for byte in chunk:
diff --git a/pyproject.toml b/pyproject.toml
index 1b4b6fb..68d2ee6 100644
--- a/pyproject.toml
+++ b/pyproject.toml
@@ -9,6 +9,7 @@ name = "kit"
 version = "0.1.0"
 description = "Small command line tools, built in a software engineering course"
 requires-python = ">=3.10"
+dependencies = ["tqdm>=4.66"]  # for a progress bar on big files
 
 # The commands that installing Kit creates, and the function each one runs.
 [project.scripts]

```

Don't study it yet: Git can lay it out better. Make a branch for the change, so `main` stays as it is, and apply the patch with `git am` ("apply mail", from when patches travelled by email):

```
git switch -c review-faster-count
git am ../faster-count.patch
```

```
Switched to a new branch 'review-faster-count'
Applying: Speed up count
```

If `git am` says `Patch failed` instead, a line the patch expects to find in one of your files is different: the patch can only change lines it recognises (the next step explains how). Run `git am --abort`, which puts the branch back as it was, then compare your file with the lesson's version of it from 01-08-01 or 01-01-04.

The patch is now a commit on your branch. It has two people in it:

```
git log -1 --format="%an <%ae> | %cn <%ce>"
```

```
Sam Teammate <sam@example.com> | Your Name <you@example.com>
```

The **author** (`%an`, `%ae`) wrote the change; the **committer** (`%cn`, `%ce`) put it into this repository. These are 01-08-01's `author` and `committer` lines, and here they differ. Now do what the message invites:

```
.venv/bin/python run_checks.py
```

```
...
pass -m ruff check .
8 of 8 passed
```

(On Windows, `.venv/Scripts/python`.)

```predict
question: The checks pass and the message says the change is faster. Is that enough to merge it?
choice: Yes: passing checks show the change is safe
choice: No: the checks only show what they test, and this change edits a check
answer: No: the checks only show what they test, and this change edits a check
explain: A passing check is evidence about what that check tests, nothing more. A change that edits a check can change what passing means. The diff's file list already shows check_counts.py, so this one needs reading.
```

```check
run "cd kit; git branch --show-current" stdout="review-faster-count" -- Work on a branch called review-faster-count (git switch -c review-faster-count).
run "cd kit; git log -1 --format=%an" stdout="Sam Teammate" -- The patch should be applied as Sam's commit (git am ../faster-count.patch).
run "cd kit; git rev-list --count main..HEAD" stdout="1" -- The branch should be main plus Sam's one commit.
```

## Reading a diff

`git diff main` shows what your branch changes compared with `main`. Start with the summary:

```
git diff --stat main
```

```
 README.md       |  3 ++-
 check_counts.py |  2 +-
 count.py        | 11 ++++-------
 pyproject.toml  |  1 +
 4 files changed, 8 insertions(+), 9 deletions(-)
```

Each line is a file, with how many lines changed and a bar of `+` (added) and `-` (removed). The whole review starts here. A change called "Speed up count" touches four files, and one of them is a check.

Now one file in full:

```
git diff main -- count.py
```

(`--` means "file names follow". If the output stops with a `:` at the bottom, Git is showing it a page at a time: Space for more, `q` to quit.)

```
diff --git a/count.py b/count.py
index c948296..3fb8460 100644
--- a/count.py
+++ b/count.py
@@ -29,13 +29,10 @@ def start(encoding):
 
 def feed(state, chunk):
     in_word = state["in_word"]
-    words = state["words"]
-    for byte in chunk:
-        if byte in WHITESPACE:
-            in_word = False
-        elif not in_word:
-            in_word = True
-            words += 1
+    # bytes.split() splits on the same six whitespace bytes, and runs in C:
+    # much faster than a Python loop over every byte.
+    # TODO: a word that crosses from one chunk into the next
+    words = state["words"] + len(chunk.split())
     line_length = state["line_length"]
     longest = state["longest"]
     for byte in chunk:
```

This is a **unified diff**, the format nearly every tool uses. Read it from the top:

- `--- a/count.py` is the file before, `+++ b/count.py` the file after. `index c948296..3fb8460` gives their blob ids: the content addresses from 01-08-01. `100644` is the mode, an ordinary file.
- A **hunk** starts at each `@@` line. `-29,13` means "from line 29 of the old file, 13 lines"; `+29,10` means "from line 29 of the new file, 10 lines". The text after the second `@@` is a hint for the reader, the nearest line above that starts a definition. It can be wrong: this hunk is in `feed`, not `start`.
- Each line in the hunk starts with one character. A space means **context**, a line both versions share, shown so you can see where the change is. `-` means removed, and `+` means added. A changed line is a removal followed by an addition.

Context lines are also how a patch finds its place: `git am` looks for them in your file, which is why it fails if they differ. And a diff shows only what changed. It doesn't show the code that uses what changed. The lines that read `in_word` further down `feed` aren't in this hunk, and they matter.

For a one-line change, `--word-diff` marks just the words that differ:

```
git diff --word-diff main -- check_counts.py
```

```
SIZES = [-[1, 2, 3, 4096]-]{+[4096]  # the small sizes made this check slow+}
```

`[-…-]` was removed and `{+…+}` added.

```predict
question: In the count.py hunk, the old side is 13 lines and the new side is 10. Of the lines shown, how many are context (in both versions)?
choice: 3
choice: 6
choice: 7
answer: 6
explain: The old side is context plus removed lines; the new side is context plus added lines. 7 lines are removed and 4 added, so 13 − 7 = 10 − 4 = 6 context lines: three above the change and three below. The counts in the @@ line always add up this way, which is how a tool checks that a patch isn't damaged.
```

```check
run "cd kit; git diff --stat main" stdout="4 files changed, 8 insertions(+), 9 deletions(-)" -- The branch should change exactly what Sam's commit changes.
```

## The review checklist

Reading a diff line by line takes attention, and the dangerous lines are usually the dull ones. A **checklist** directs your attention to where changes most often go wrong. Go through it for every change you review, your own included:

| Look for | Why it matters | How to spot it |
|---|---|---|
| **Deleted or weakened tests** | A check that tests less still passes, so it hides whatever it stopped testing | Any change to a check or test file; removed cases; looser comparisons; skipped tests |
| **Changed signatures** | Everything that calls a function must change with it, including code outside the diff | `def` lines (or a language's equivalent) with different parameters or return values |
| **New dependencies** | Code someone else maintains, installed on every machine, forever | `pyproject.toml`, `requirements.txt`, `package.json`; new `import` lines |
| **Generated or large files** | Noise that hides the real change, or a file that belongs in `.gitignore` | Huge numbers in `--stat`; `Bin` instead of a line count |
| **Secrets** | A key in a commit stays in the history (01-08-04) | Words like `key`, `token`, `password`, `BEGIN … PRIVATE KEY`; any file under `notes/` or similar |
| **Unrelated changes** | Can't be reviewed or undone on their own (01-08-01's commit hygiene) | A file the message doesn't explain |
| **TODOs and stubs** | The author knows something isn't finished | `TODO`, `FIXME`, `pass`, `NotImplementedError`, a function that returns a constant |
| **Claims in the message** | "Faster", "all checks pass", "no behaviour change" are claims to test, not facts | The message itself |

Now use it on Sam's change. Two commands help. `git grep` searches the files Git tracks, so it skips `.venv`:

```
git grep -n tqdm
git grep -n TODO -- "*.py"
```

```
pyproject.toml:12:dependencies = ["tqdm>=4.66"]  # for a progress bar on big files
count.py:34:    # TODO: a word that crosses from one chunk into the next
```

Going down the checklist:

- **A weakened test:** `SIZES = [4096]`. 01-01-04 added the sizes 1, 2 and 3 to feed the counter its input in tiny pieces, so that every word, line and character crosses from one piece into the next somewhere. Every example in the tables is shorter than 4096 bytes, so with only 4096 each example arrives in one piece, and no boundary is ever tested.
- **A TODO:** `a word that crosses from one chunk into the next`. The sentence stops there, but it names exactly what the smaller sizes tested.
- **A new dependency:** `tqdm` is added, and `git grep` finds it nowhere else. Nothing uses it.
- **An unrelated change:** the README line is fine on its own, but it has nothing to do with speed.
- **Claims:** "about four times faster" and "All checks pass". The second is true, and the checklist has just shown why it means less than it sounds. The first is the next step.

No signature changed (`feed(state, chunk)` is the same), and there are no secrets and no generated files.

```check
run "cd kit; git grep -n TODO -- *.py" stdout="count.py" -- The TODO is in count.py.
run "cd kit; git grep -c tqdm" stdout="pyproject.toml:1" -- tqdm appears once, in pyproject.toml: nothing imports it.
```

## Testing the claims

The checklist raised suspicions. Experiments settle them. First, the weakened check. Put it back as it was: in `check_counts.py`, change the `SIZES` line to

```
SIZES = [1, 2, 3, 4096]
```

Save it and run the check:

```
.venv/bin/python check_counts.py
```

```
FAIL: words b'hello' expected 1 got [1, 5, 3, 2, 1]
FAIL: words b'hello world\n' expected 2 got [2, 10, 6, 4, 2]
FAIL: words b'  two   spaces  ' expected 2 got [2, 9, 5, 5, 2]
FAIL: words b'tab\tand\r\nwindows' expected 3 got [3, 13, 8, 6, 3]
FAIL: words b'one\xe2\x80\x94two three' expected 2 got [2, 14, 8, 5, 2]
words passed: 3 of 8
lines passed: 7 of 7
characters passed: 5 of 5
longest passed: 6 of 6
```

Read the evidence. Each `got` list is the whole-data count, then the counts at piece sizes 1, 2, 3 and 4096 (01-01-04). For `hello`, fed one byte at a time, the new `feed` counts 5 words: each piece `h`, `e`, `l`, `l`, `o` is one word to `split()`, which can't know that the previous piece ended inside a word. In pairs it's 3 (`he`, `ll`, `o`). The whole data and size 4096 give the right answer, and those are the only two that `SIZES = [4096]` kept. Lines, characters and longest still pass, because Sam didn't touch their code.

Was the small-size check slow, as the comment says? Time both versions in PowerShell with `Measure-Command { .venv/Scripts/python check_counts.py }`, or on macOS or Linux with `time .venv/bin/python check_counts.py`. On this lesson's machine both took about 0.2 seconds. The comment's reason isn't true.

Does the bug matter outside the check? `count` reads files in chunks of 65536 bytes. Give it a file whose words cross a chunk boundary:

```
.venv/bin/python -c "import io, count; data = b'ab ' * 30000; print(count.count_stream(io.BytesIO(data), 'utf-8')['words'])"
```

```predict
question: b'ab ' * 30000 is 30000 words in 90000 bytes, so it's read as one chunk of 65536 bytes and one of 24464. What does Sam's count_stream report?
choice: 30000
choice: 30001
choice: 60000
answer: 30001
explain: 65536 isn't a multiple of 3, so the first chunk ends after the "a" of one "ab". split() counts that "a" as a word in the first chunk and the "b" as a word in the second, so one word is counted twice. Run it on main (git switch main, the same command, then git switch review-faster-count) and you get 30000.
```

It prints `30001`. On `big.txt` from 01-01-04 (if you still have it), Sam's version reports 2,000,061 words, where `main` reports 2,000,000: 61 words cut in two at the edges of its 153 chunks. And "four times faster"? On this lesson's machine `count.py big.txt` took 1.6 seconds on `main` and 1.1 on Sam's branch, about 1.5 times faster. The other loops in `feed` still go through every byte.

Leave `check_counts.py` changed and uncommitted for now. The review comes first.

```check
contains kit/check_counts.py "SIZES = [1, 2, 3, 4096]" -- Put SIZES back to [1, 2, 3, 4096] in check_counts.py.
run "cd kit; .venv/Scripts/python check_counts.py" exit=1 stdout="words passed: 3 of 8" -- With every piece size back, the check should fail on Sam's feed: that's the bug it was hiding.
run "cd kit; .venv/Scripts/python -c \"import io, count; data = b'ab ' * 30000; print(count.count_stream(io.BytesIO(data), 'utf-8')['words'])\"" stdout="30001" -- On Sam's branch, a word across the 65536-byte boundary is counted twice.
```

## Writing the review

A review is written for the author. It should help them fix the change, and help them avoid the problem next time. A good one:

- **Starts with the verdict**: approve, approve with small comments, or request changes.
- **Separates blocking from non-blocking.** A bug or a weakened test blocks the merge. A style preference doesn't, so say it's optional.
- **Points at lines**, and gives the evidence: the command and what it printed, so the author can rerun it instead of arguing.
- **Asks for something specific.** "Please keep `SIZES = [1, 2, 3, 4096]`" is clear. "Tests seem off" isn't.
- **Is about the code, not the person.** "This counts a word twice", not "you broke it".

Here is a review of Sam's change:

```
Request changes. Thanks for working on speed: count is slow on big files.

1. Blocking. check_counts.py, SIZES = [4096]: this drops the piece sizes that
   test words crossing a chunk boundary. With them back the check fails
   (words passed: 3 of 8). They don't make it slow: 0.2 s either way.
   Please keep [1, 2, 3, 4096].
2. Blocking. count.py, feed: a word that crosses two chunks is counted twice
   (the TODO says so). b"ab " * 30000 gives 30001; big.txt gives 2,000,061
   instead of 2,000,000. in_word is never updated any more.
3. pyproject.toml: nothing imports tqdm. Please leave it out until the
   progress bar exists.
4. README.md: the new line is fine, but unrelated. Please send it in its own
   commit.
5. The message: on my machine count.py big.txt went from 1.6 s to 1.1 s,
   about 1.5x. Please say what you measured, and on what.
```

**What else, and why not.**

| Way to accept a change | Cost |
|---|---|
| Merge when the checks pass | Checks show only what they test; a change can edit the checks |
| Read only the files the message mentions | The dangerous line is often in a file nobody mentioned |
| Approve after a quick look at a big diff | A long diff is where a weakened check hides; ask for smaller changes instead |
| Review every line, against a checklist, testing the claims | Slow for a large change, which is one more reason to keep changes small |

## Remotes and pull requests

So far every repository has been on your computer only. A **remote** is another copy of the repository that yours knows by name, usually on a server everyone on a team can reach. You **push** your commits to it and **fetch** other people's from it. A server isn't required, though. A remote can be a folder, and making one shows what a remote is without an account anywhere.

A **bare** repository is one with no working files, only the history (only what's in `.git`). That's what servers keep. Make one beside Kit, and add it as a remote called `origin`, the usual name for the main shared copy:

```
git init --bare ../kit-remote.git
git remote add origin ../kit-remote.git
git remote -v
```

```
Initialized empty Git repository in C:/Users/you/swe/kit-remote.git/
origin	../kit-remote.git (fetch)
origin	../kit-remote.git (push)
```

Push both branches. `-u` makes each local branch **track** the remote one, so later `git push` and `git status` know where to compare:

```
git push -u origin main
git push -u origin review-faster-count
```

```
branch 'main' set up to track 'origin/main'.
To ../kit-remote.git
 * [new branch]      main -> main
branch 'review-faster-count' set up to track 'origin/review-faster-count'.
To ../kit-remote.git
 * [new branch]      review-faster-count -> review-faster-count
```

`git ls-remote origin` lists the branches the remote has, with the commit each one names. They're the same ids as yours, because a commit's id comes from its contents (01-08-01). `git status` now begins `On branch review-faster-count` and `Your branch is up to date with 'origin/review-faster-count'`. `git fetch` downloads the remote's new commits without changing your branches. `git pull` fetches and then joins them into your branch, which is a merge (01-08-03).

A **pull request** (GitLab calls it a *merge request*) isn't part of Git. It's a page on a hosting service such as GitHub, GitLab or Codeberg that asks for a pushed branch to be merged into another one, usually `main`. The page shows the same diff you just read. Reviewers comment on single lines, as in the review above, and finish with *approve* or *request changes*. The service can also run the checks itself and refuse to merge until they pass and someone has approved (module 8.9). When the author pushes more commits to the branch, the pull request updates, and the review continues on the new diff. Everything in this lesson is what a reviewer does on that page. The page only puts it in one place.

```check
run "cd kit; git remote get-url origin" stdout="kit-remote.git" -- Kit should have a remote called origin (git remote add origin ../kit-remote.git).
run "cd kit; git ls-remote --heads origin" stdout="refs/heads/main" -- main should be pushed to origin.
run "cd kit; git ls-remote --heads origin" stdout="refs/heads/review-faster-count" -- The review branch should be pushed to origin.
```

## Your turn: answer the review

Now be Sam. Make the change worth merging, in new commits on `review-faster-count`, then push the branch, as an author does when a pull request gets "request changes":

1. Fix `feed` so that a word crossing from one chunk into the next is counted once, **keeping** `chunk.split()` (the speed was the point). With `SIZES = [1, 2, 3, 4096]` back, `check_counts.py` must pass, and the `b'ab ' * 30000` experiment must print `30000`. Remove the TODO once it's done.
2. Take out the `tqdm` dependency, and take the README line out of this branch.
3. Commit in pieces that each do one thing (01-08-01), run `run_checks.py`, and `git push`.

```hints
nudge: split() counts every run of non-whitespace in the chunk, including one that started in the previous chunk. When is the first part of this chunk the second half of a word? What does feed need to remember from the previous chunk to tell?
concept: The state already has in_word: was the previous chunk's last byte part of a word? If it was, and this chunk's first byte isn't whitespace, split()'s first part continues that word, so take one off. Then set in_word from this chunk's last byte, ready for the next chunk. Commit the fix together with the restored SIZES: a fix and the check that shows it are one change.
shape: After words = state["words"] + len(chunk.split()): if in_word and chunk and chunk[0] not in WHITESPACE: words -= 1. Then if chunk: in_word = chunk[-1] not in WHITESPACE. Three commits: the fix with SIZES; pyproject.toml without tqdm; README.md without the line. Then git push (the branch already tracks origin).
answer: In count.py, feed begins:
~~~python
def feed(state, chunk):
    in_word = state["in_word"]
    # bytes.split() splits on the same six whitespace bytes, and runs in C:
    # much faster than a Python loop over every byte.
    words = state["words"] + len(chunk.split())
    # A word that crosses from the last chunk into this one was counted
    # there already: its second half is this chunk's first part.
    if in_word and chunk and chunk[0] not in WHITESPACE:
        words -= 1
    if chunk:
        in_word = chunk[-1] not in WHITESPACE
    line_length = state["line_length"]
~~~
Delete the dependencies line from pyproject.toml and the "run it before every commit." line from README.md (put the period back after "runs every check"). Then:
~~~
git add count.py check_counts.py
git commit -m "Count a word that crosses two chunks once" -m "split() counted the two halves as two words. Check at piece sizes 1, 2 and 3 again, which catch it."
git add pyproject.toml
git commit -m "Remove the tqdm dependency, which nothing uses"
git add README.md
git commit -m "Leave the README line for a change of its own"
.venv/bin/python run_checks.py
git push
~~~
check_counts.py passes 8 of 8, the experiment prints 30000, big.txt gives 2,000,000, and it's still about 1.5 times faster than main. The tempting slip is to set in_word only when the chunk ends in a word, and never back to False: then a chunk ending in a space leaves in_word True, and the next word is wrongly taken off. Another is to put the old byte loop back. That's correct, but it throws away the speed instead of fixing the change.
```

```check
run "cd kit; git branch --show-current" stdout="review-faster-count" -- Work on the review branch.
contains kit/check_counts.py "SIZES = [1, 2, 3, 4096]" -- check_counts.py should test every piece size again.
run "cd kit; .venv/Scripts/python check_counts.py" stdout="words passed: 8 of 8" -- Words should be counted right at every piece size.
run "cd kit; .venv/Scripts/python -c \"import io, count; data = b'ab ' * 30000; print(count.count_stream(io.BytesIO(data), 'utf-8')['words'])\"" stdout="30000" -- A word across the 65536-byte boundary should be counted once.
run "cd kit; .venv/Scripts/python -c \"import inspect, count; source = inspect.getsource(count.feed); print('chunk.split()' in source, 'TODO' in source)\"" stdout="True False" -- feed should keep the fast chunk.split(), and the TODO should be gone.
lacks kit/pyproject.toml "tqdm" -- The unused tqdm dependency should be gone.
lacks kit/README.md "before every commit" -- The unrelated README line should be out of this branch.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); n = int(git('rev-list', '--count', 'main..HEAD').stdout or 0); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, n >= 3)\"" stdout="clean True" -- Commit the fixes as new commits on top of Sam's (at least two more), with nothing left uncommitted.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True).stdout.strip(); print(git('rev-parse', 'HEAD') == git('rev-parse', 'origin/review-faster-count'))\"" stdout="True" -- Push the branch, so the remote has your fixes (git push).
```

**What these checks establish, and what they don't.** They check the result of the review: the branch now counts words correctly at every piece size and across a real chunk boundary, still uses `split()`, has lost the TODO, the dependency and the unrelated line, is committed in new commits, and is pushed. They can't check that your commits each do one thing, or that your messages say why. They don't measure the speed: a fix that made `count` slow again would pass. Above all, no check can tell whether *you* would have found these problems in a diff without being told there were some. The habit the checks can't test is going down the checklist on every change, especially the ones whose checks all pass.

## What you can do now

- A **unified diff** shows each file as `--- a/` and `+++ b/`, in **hunks** headed `@@ -old,count +new,count @@`; lines are context (space), removed (`-`) or added (`+`). `git diff --stat main`, `git diff main -- FILE` and `--word-diff` read a change from summary to detail.
- **Patches** travel as `git format-patch` files and apply with `git am`, which keeps the **author** apart from the **committer**.
- The **review checklist**: weakened tests, changed signatures, new dependencies, generated or large files, secrets, unrelated changes, TODOs, and the claims in the message. `git grep` searches only what Git tracks.
- **Claims are tested**, not trusted: put the weakened check back and run it; build an input that crosses the boundary; time it.
- A **remote** is another copy of the repository (`git remote add`, `git push -u`, `git fetch`); a **pull request** is a hosting service's page for reviewing a pushed branch before it's merged.

```predict
question: A change titled "Fix flaky test" deletes three lines from a test, and nothing else. All checks pass. What would you look at, and what would you ask?
explain: A deleted assertion is the first line of the checklist: a weakened test. Read what the three lines checked, and run the test with them put back to see whether it fails, and how often (a flaky test fails only sometimes, so run it many times). If it fails, the "fix" hides a real problem; ask for the cause to be found instead. If the lines really were wrong, ask for the message to say why, so the next reader doesn't wonder.
```

**Next:** 01-08-03 is about changing history: joining branches that have both moved on (merge and rebase), resolving a conflict, and undoing changes three ways (revert, reset, restore), using the review branch you just pushed.
