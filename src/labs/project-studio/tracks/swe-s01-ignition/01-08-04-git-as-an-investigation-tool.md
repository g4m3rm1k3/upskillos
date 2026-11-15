---
title: "Git as an Investigation Tool: Bisect, Blame, Hooks and Secrets"
runtime: python
---

A user writes: "`count samples/hello.txt --json` crashes with `LookupError: unknown encoding: --json`. It worked in 0.2.0." Since 0.2.0, six commits have landed, all small tidy-ups, and every check still passes. Which commit broke it? Reading all six diffs is one way, and it doesn't scale: real projects get hundreds of commits between releases. Git can find the bad commit for you by **bisecting**: it halves the range of suspects at each step, so even a thousand commits take about ten tests. This lesson uses Git to investigate. It finds the breaking commit with `bisect` and asks `blame` who last changed each line. It looks at two versions side by side with a **worktree**, makes Git run Kit's checks before every commit with a **hook**, and shows what to do when a secret reaches the history.

**By the end you can:**

- Find the commit that introduced a bug with `git bisect`, by hand and with `git bisect run` and a script that exits 0 or 1.
- Use `git blame` and `git show` to find when and why a line changed.
- Check out a second version of a project beside the first with `git worktree`.
- Install a pre-commit hook kept in the repository, and say what hooks can't guarantee.
- Say what to do, in order, when a secret has been committed, and why deleting the file isn't enough.

**You need:** 01-08-03 (revert, tags, `v0.2.0`), 01-08-02 (`git am`, reading a diff), 01-06-06 (scripts and exit status). Commands run inside `kit`.

## A bug report

Sam's six commits arrive as one patch file. Create it with the button, beside `kit`, and apply all six to `main`:

```diff file=tidy.patch provided
From 015e12ed986c636ac051283e5643722b9109d06b Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Mon, 16 Nov 2026 10:00:00 +0000
Subject: [PATCH 1/6] Mention --help in the README

New users kept asking how to run the tools.
---
 README.md | 1 +
 1 file changed, 1 insertion(+)

diff --git a/README.md b/README.md
index 2710ea5..291ce72 100644
--- a/README.md
+++ b/README.md
@@ -8,3 +8,4 @@ Each tool runs with the project's virtual environment, from this folder:
 `.venv/Scripts/python`). `python run_checks.py` runs every check.
 
 Kit's history is in Git: `git log --oneline` lists every change.
+Every tool prints how to use it with --help.

From 45ad5386c4c708068f8745e28f5dfd682e14e9c1 Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Mon, 16 Nov 2026 11:00:00 +0000
Subject: [PATCH 2/6] Give CHUNK_SIZE in KiB too

65536 is easier to recognise as 64 KiB.
---
 count.py | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

diff --git a/count.py b/count.py
index cc1954f..49ae454 100644
--- a/count.py
+++ b/count.py
@@ -9,7 +9,7 @@ USAGE = "[FILE|-] [ENCODING] [--json]"
 # ASCII whitespace, the six bytes from the definition of a word.
 WHITESPACE = b" \t\n\r\x0b\x0c"
 NEWLINE = 10  # the value of the byte b"\n"
-CHUNK_SIZE = 65536  # how many bytes to read at a time
+CHUNK_SIZE = 65536  # how many bytes to read at a time (64 KiB)
 
 
 # The counting as a state machine, fed one piece at a time.

From 073c6a881963811beab1b36bec7d018dc12e1745 Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Mon, 16 Nov 2026 12:00:00 +0000
Subject: [PATCH 3/6] Simplify take_flag

Flags come first by convention, so only the first argument needs
looking at. No behaviour change.
---
 kitargs.py | 10 +++-------
 1 file changed, 3 insertions(+), 7 deletions(-)

diff --git a/kitargs.py b/kitargs.py
index 1e46be6..d414446 100644
--- a/kitargs.py
+++ b/kitargs.py
@@ -9,13 +9,9 @@ import sys
 def take_flag(args, flag, rest=None):
     if rest is None:
         rest = []
-    found = False
-    for arg in args:
-        if arg == flag:
-            found = True
-        else:
-            rest.append(arg)
-    return found, rest
+    if args and args[0] == flag:
+        return True, rest + list(args[1:])
+    return False, rest + list(args)
 
 
 # The input a tool should read: standard input for "-" or no name at all,

From 269a12bc68ff0a1f0dac035f19118f850b885965 Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Mon, 16 Nov 2026 13:00:00 +0000
Subject: [PATCH 4/6] Say where hexdump's width comes from

xxd and hexdump -C both show 16 bytes a line.
---
 hexdump.py | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

diff --git a/hexdump.py b/hexdump.py
index 2e5b18d..188f2c7 100644
--- a/hexdump.py
+++ b/hexdump.py
@@ -5,7 +5,7 @@ from kitargs import help_if_asked, open_input, take_flag
 
 USAGE = "[FILE|-] [FORMAT] [--json]"
 
-WIDTH = 16  # how many bytes to show on each line
+WIDTH = 16  # how many bytes to show on each line, as xxd does
 FIRST_PRINTABLE = 0x20  # the space, the first printable ASCII character
 LAST_PRINTABLE = 0x7E  # the tilde, ~, the last one
 

From 7eecf0e6fda57a5ef264d7f04c8ff40ad0c6584b Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Mon, 16 Nov 2026 14:00:00 +0000
Subject: [PATCH 5/6] Say that filter's terms are case-sensitive

Someone expected --all error to match ERROR.
---
 filter.py | 1 +
 1 file changed, 1 insertion(+)

diff --git a/filter.py b/filter.py
index 3560dab..42f61b3 100644
--- a/filter.py
+++ b/filter.py
@@ -7,6 +7,7 @@ from kitargs import take_option
 
 # The query: a line matches when it contains every --all term,
 # at least one --any term (if any were given), and no --none term.
+# Terms are bytes, compared exactly: case matters.
 def matches(line, all_terms, any_terms, none_terms):
     return (
         all(term in line for term in all_terms)

From eabcb5b5248e5011cb2390acca2e3a3bf2cfa557 Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Mon, 16 Nov 2026 15:00:00 +0000
Subject: [PATCH 6/6] Say why tree sorts its entries

The order would otherwise differ between machines.
---
 tree.py | 1 +
 1 file changed, 1 insertion(+)

diff --git a/tree.py b/tree.py
index 1c4918b..1045282 100644
--- a/tree.py
+++ b/tree.py
@@ -9,6 +9,7 @@ USAGE = "[FOLDER]"
 # Print everything inside the folder at path, one name per line, indented
 # by depth. A folder's contents are printed by calling tree on that folder.
 # A folder that can't be listed is reported, and the walk carries on.
+# Entries are sorted, because os.listdir's order is arbitrary (01-07-03).
 def tree(path, depth):
     try:
         names = sorted(os.listdir(path))

```

```
git switch main
git am ../tidy.patch
```

```
Applying: Mention --help in the README
Applying: Give CHUNK_SIZE in KiB too
Applying: Simplify take_flag
Applying: Say where hexdump's width comes from
Applying: Say that filter's terms are case-sensitive
Applying: Say why tree sorts its entries
```

Now reproduce the report. Reproducing a bug before you change anything shows that you're looking at the same problem the user saw:

```
.venv/bin/python count.py samples/hello.txt --json
```

(On Windows, `.venv/Scripts/python`.) The traceback ends:

```
LookupError: unknown encoding: --json
```

`count.py --json samples/hello.txt`, with the flag first, still works, and `.venv/bin/python run_checks.py` still says `8 of 8 passed`. No check runs `count` with `--json` after the file name, which is why the checks didn't catch it.

```check
run "cd kit; git log --format=%an -6" stdout="Sam Teammate" -- Apply Sam's six commits to main (git am ../tidy.patch).
run "cd kit; git log --format=%s -1" stdout="Say why tree sorts its entries" -- All six commits should be applied, the last one on top.
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; r = subprocess.run([sys.executable, 'count.py', 'samples/hello.txt', '--json'], capture_output=True, text=True); print('unknown encoding: --json' in r.stderr)\"" stdout="True" -- The bug should reproduce: --json after the file name is taken for an encoding.
```

## Two versions side by side

Is it really new? You could switch to `v0.2.0` and back, but switching rewrites your folder, and it's refused while you have uncommitted changes. A **worktree** is a second working folder for the same repository, with a different commit checked out:

```
git worktree add ../kit-v0.2.0 v0.2.0
git worktree list
```

```
Preparing worktree (detached HEAD f2a8b95)
HEAD is now at f2a8b95 Release 0.2.0
C:/Users/you/swe/kit         8d03f14 [main]
C:/Users/you/swe/kit-v0.2.0  f2a8b95 (detached HEAD)
```

`../kit-v0.2.0` holds Kit's files as they were at 0.2.0. It shares `kit`'s history, and its `.git` is only a small file pointing back. It has no `.venv` (that's ignored, so never in a commit), so run it with Kit's:

| Windows (PowerShell) | macOS or Linux |
|---|---|
| `cd ../kit-v0.2.0; ../kit/.venv/Scripts/python count.py samples/hello.txt --json; cd ../kit` | `cd ../kit-v0.2.0; ../kit/.venv/bin/python count.py samples/hello.txt --json; cd ../kit` |

```
{"bytes": 7, "lines": 1, "words": 1, "characters": 6, "longest": 6}
```

0.2.0 is fine, so the bug is in one of the six commits. A worktree is also how you'd fix an urgent bug in a release while your own work stays where it is. Remove it when you're done; `git worktree remove` deletes the folder and Git's record of it:

```
git worktree remove ../kit-v0.2.0
```

```check
missing kit-v0.2.0 -- Remove the worktree when you're done (git worktree remove ../kit-v0.2.0).
run "cd kit; git worktree list" without="kit-v0.2.0" -- Git should no longer list the worktree.
```

## Bisect

You know a good commit (`v0.2.0`) and a bad one (`main`). **Bisect** checks out the commit halfway between them and asks you which it is. Whichever you answer, half the suspects are cleared. Six commits take at most three tests, and a thousand take about ten.

You need a test that says good or bad without your judgement. Write it as a check, because it's worth keeping. It's a check that doesn't run other checks, so the name `check_…` is safe (01-06-06):

```python file=kit/check_json_flag.py
import json
import subprocess
import sys

# A regression check: count's --json must work wherever it comes among the
# arguments. Exit status 0 if it does and 1 if not, so git bisect run can use it.
for args in (["--json", "samples/hello.txt"], ["samples/hello.txt", "--json"]):
    command = [sys.executable, "count.py", *args]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    try:
        counts = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("FAIL: count.py", *args, "printed no JSON")
        sys.exit(1)
    if counts["bytes"] != 7:
        print("FAIL: count.py", *args, "gave", counts)
        sys.exit(1)
print("pass: --json works before and after the file name")
```

Save it and run it: `.venv/bin/python check_json_flag.py` prints `FAIL: count.py samples/hello.txt --json printed no JSON`. It's untracked, so it stays in the folder while bisect moves between commits. Start bisecting, naming the bad commit first and then the good one:

```
git bisect start main v0.2.0
```

```
Bisecting: 2 revisions left to test after this (roughly 2 steps)
[34ae6326b6a58a1d427f6a8be8ee3ea2f52cb85a] Simplify take_flag
```

Your folder is now that commit (a detached `HEAD`, as in 01-08-01). Test it, and tell bisect what you found:

```
.venv/bin/python check_json_flag.py
git bisect bad
```

The check fails, so it's bad. Bisect moves on to `Give CHUNK_SIZE in KiB too`. You could go on like this, but when the test is a program, **`git bisect run`** does the rest: it runs the program at each step and reads its exit status (0 good, 1 to 127 bad, except 125, which means "can't test this one, skip it"). Start again and let it run:

```
git bisect reset
git bisect start main v0.2.0
git bisect run .venv/bin/python check_json_flag.py
```

```
running '.venv/bin/python' 'check_json_flag.py'
FAIL: count.py samples/hello.txt --json printed no JSON
Bisecting: 0 revisions left to test after this (roughly 1 step)
[a1a4c5cd6df37eed8d2e79224a98017b1f4a61c8] Give CHUNK_SIZE in KiB too
running '.venv/bin/python' 'check_json_flag.py'
pass: --json works before and after the file name
34ae6326b6a58a1d427f6a8be8ee3ea2f52cb85a is the first bad commit
commit 34ae6326b6a58a1d427f6a8be8ee3ea2f52cb85a
Author: Sam Teammate <sam@example.com>
Date:   Mon Nov 16 12:00:00 2026 +0000

    Simplify take_flag

    Flags come first by convention, so only the first argument needs
    looking at. No behaviour change.

 kitargs.py | 10 +++-------
 1 file changed, 3 insertions(+), 7 deletions(-)
```

Your ids differ from these: `git am` keeps Sam as the author, but you're the committer, at the time you applied the patch, and that's part of each commit (01-08-01). The commit bisect names is the same one. Finish with `git bisect reset`, which puts you back on `main`. Always reset: until you do, you're on whatever commit bisect last checked out.

```predict
question: Bisect needed two tests for six commits. Roughly how many would it need for 1,000?
choice: About 10
choice: About 100
choice: About 500
answer: About 10
explain: Each test halves the suspects: 1000, 500, 250, 125, 63, 32, 16, 8, 4, 2, 1 is ten halvings (2 to the power 10 is 1024). That's why bisect is worth knowing: the cost grows with the logarithm of the number of commits, not the number itself.
```

```check
run "cd kit; .venv/Scripts/python check_json_flag.py" exit=1 stdout="FAIL: count.py samples/hello.txt --json printed no JSON" -- On main, the regression check should fail: the bug is still there.
missing kit/.git/BISECT_LOG -- Finish bisecting (git bisect reset).
run "cd kit; git branch --show-current" stdout="main" -- git bisect reset should put you back on main.
```

## Blame, and the fix

Bisect says which commit. **`git blame`** says, for every line of a file, which commit last changed it. `-L` picks lines: here, from the line matching `def take_flag` and the 8 after it:

```
git blame -L "/def take_flag/,+8" kitargs.py
```

```
^21d4f30 (Your Name    2026-11-15 10:17:02 -0500  9) def take_flag(args, flag, rest=None):
^21d4f30 (Your Name    2026-11-15 10:17:02 -0500 10)     if rest is None:
^21d4f30 (Your Name    2026-11-15 10:17:02 -0500 11)         rest = []
34ae6326 (Sam Teammate 2026-11-16 12:00:00 +0000 12)     if args and args[0] == flag:
34ae6326 (Sam Teammate 2026-11-16 12:00:00 +0000 13)         return True, rest + list(args[1:])
34ae6326 (Sam Teammate 2026-11-16 12:00:00 +0000 14)     return False, rest + list(args)
^21d4f30 (Your Name    2026-11-15 10:17:02 -0500 15)
^21d4f30 (Your Name    2026-11-15 10:17:02 -0500 16)
```

Each line shows the commit, its author and date, and the line number. `^` marks the first commit of the history (yours has a different id). Blame answers "when did this line become this way, and in which commit?", and `git show 34ae6326` then gives the commit's message and its whole diff, which is where the reason is. The name says who to ask, which is not the same as who to blame. Here the message gives the reason: "Flags come first by convention… No behaviour change." The convention isn't one Kit follows (01-05-01 made `--json` work anywhere), and the "no behaviour change" claim is exactly the kind of claim 01-08-02 tests.

The commit is shared (it's on `main`), so undo it with a revert (01-08-03), then confirm with the check:

```
git revert --no-edit 34ae632
.venv/bin/python check_json_flag.py
```

```
pass: --json works before and after the file name
```

Commit the check too, so this bug can't come back unnoticed. That's a **regression check**, and `run_checks.py` now runs it with all the others:

```
git add check_json_flag.py
git commit -m "Check that --json works after the file name"
```

```check
run "cd kit; git log --format=%s -5" stdout="Revert \"Simplify take_flag\"" -- Undo Sam's commit with git revert, since it's on main.
run "cd kit; .venv/Scripts/python check_json_flag.py" stdout="pass: --json works before and after the file name" -- After the revert, --json should work in either place.
run "cd kit; git cat-file -e HEAD:check_json_flag.py" -- Commit the regression check.
run "cd kit; .venv/Scripts/python run_checks.py" stdout="9 of 9 passed" -- run_checks.py should now run nine checks, all passing.
```

## Hooks

The regression check only helps if someone runs it. A **hook** is a program Git runs at a certain moment. The **pre-commit** hook runs just before each commit is made, and if it exits with a non-zero status, the commit isn't made. Git looks for hooks in `.git/hooks`, which isn't part of the repository, so a hook there can't be shared or reviewed. Keep them in a folder that is, and point Git at it. Make `hooks/pre-commit`:

```sh file=kit/hooks/pre-commit
#!/bin/sh
# Git runs this before every commit, from the top folder of the repository.
# If a check fails, the hook exits with status 1 and Git makes no commit.
if [ -d .venv/Scripts ]; then
    python=.venv/Scripts/python
else
    python=.venv/bin/python
fi
"$python" run_checks.py || exit 1
```

It's a shell script, because Git runs hooks with `sh`, even on Windows (Git for Windows brings its own). The first line names the program that runs it. The `if` picks the virtual environment's Python on Windows or elsewhere, and `|| exit 1` stops the commit if the checks fail.

One trap before committing it. `sh` reads a line ending in CRLF as a line ending in a stray carriage-return character, so `python=.venv/Scripts/python` would name a program that doesn't exist. On Windows, `core.autocrlf` would give this file CRLF endings in every fresh clone (01-08-01). Add one line to the end of `.gitattributes`, so Git always writes the hooks with LF:

```
hooks/* text eol=lf
```

Save both files, then tell Git where hooks live, mark the hook as a program (needed on macOS and Linux, and recorded in Git for everyone else), and commit:

```
git config core.hooksPath hooks
git add hooks/pre-commit .gitattributes
git update-index --chmod=+x hooks/pre-commit
git commit -m "Run every check before each commit"
```

The commit runs the hook. Before Git's own `[main …]` line, you'll see `run_checks.py`'s output end with `9 of 9 passed`. `git config core.hooksPath` is a setting in your copy only (`.git/config`): a fresh clone has the hook file, but each person turns it on with this command. That's deliberate: Git never runs code from a repository just because you cloned it.

Now see it refuse. Break something on purpose: in `count.py`, change `NEWLINE = 10` to `NEWLINE = 13`, and try to commit:

```
git commit -am "Try a broken change"
```

The checks run, `check_counts.py` fails, and the hook exits with status 1. No commit is made: `git log --oneline -1` still shows "Run every check before each commit". Put the line back with `git restore count.py`.

A hook is a convenience, not a guarantee. `git commit --no-verify` skips it, a fresh clone doesn't run it until someone sets `core.hooksPath`, and anyone can edit it. A check that must pass needs a server that refuses changes without it (module 8.9). The hook catches mistakes early. It doesn't stop anyone who decides to skip it.

Push everything to `origin`: `git push`.

```check
run "cd kit; git config core.hooksPath" stdout="hooks" -- Point Git at the hooks folder (git config core.hooksPath hooks).
run "cd kit; git ls-files -s hooks/pre-commit" stdout="100755" -- hooks/pre-commit should be committed as a program (git update-index --chmod=+x).
run "cd kit; git check-attr eol hooks/pre-commit" stdout="hooks/pre-commit: eol: lf" -- .gitattributes should make Git write the hooks with LF line endings (hooks/* text eol=lf).
run "cd kit; .venv/Scripts/python -c \"import pathlib, subprocess, tempfile; t = tempfile.TemporaryDirectory(); d = pathlib.Path(t.name) / 'k'; subprocess.run(['git', 'clone', '-q', '-c', 'core.autocrlf=true', '.', str(d)], check=True); data = (d / 'hooks' / 'pre-commit').read_bytes(); t.cleanup(); print(len(data) > 0, b'\\r' in data)\"" stdout="True False" -- A fresh clone with core.autocrlf=true should get hooks/pre-commit with LF endings (commit .gitattributes with the hook).
run "cd kit; git hook run pre-commit" stderr="9 of 9 passed" -- The pre-commit hook should run every check, and they should pass.
contains kit/count.py "NEWLINE = 10" -- Put NEWLINE back after seeing the hook refuse the commit (git restore count.py).
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('rev-parse', 'main').stdout == git('rev-parse', 'origin/main').stdout)\"" stdout="clean True" -- Everything should be committed and pushed (git push).
```

## A secret in the history

The worst thing to find in a history is a secret: a password, an API key, a private key. Deleting the file in a new commit doesn't remove it. See why in a throwaway repository, never in a real one. In the course folder (`cd ..`), make one with a pretend key, commit it, then "fix" it:

```
git init -b main secret-demo
cd secret-demo
```

| Windows (PowerShell) | macOS or Linux |
|---|---|
| `Set-Content settings.txt "API_KEY=demo-1234-not-real"` | `echo "API_KEY=demo-1234-not-real" > settings.txt` |

```
git add settings.txt
git commit -m "Add settings"
git rm settings.txt
git commit -m "Remove the key"
git show HEAD~1:settings.txt
```

```
API_KEY=demo-1234-not-real
```

The file is gone from the folder, and the key is still one command away, in the first commit, in every clone, and on every server the repository was ever pushed to. `git log -p -S API_KEY` finds every commit that added or removed the text. Automated tools search public repositories for keys in exactly this way, so a pushed key should be treated as found.

So when a real secret is committed, the order of what you do matters:

1. **Revoke it first.** Change the password, delete the key, issue a new one. Assume it has been copied; nothing done to the history changes that.
2. **Then remove it from the history,** if the repository is shared. That means rewriting every commit since the one that added it, with a tool such as `git filter-repo` (installed separately; the old built-in `git filter-branch` is slow and its own documentation warns against it). Every commit after that point gets a new id (01-08-01).
3. **Replace every copy.** The rewritten history has to be force-pushed, and everyone who has a clone must replace theirs. Hosting services may keep cached copies and forks; most have a way to ask for them to be purged.
4. **Stop it happening again:** `.gitignore` for files that hold secrets (Kit's ignores `notes/demo_key`), and a check before each commit (your task).

That's a lot of work and it's never complete, which is why step 1 comes first and step 4 matters most. Delete the demo when you're done, from the course folder (check the path first, 01-06-06):

| Windows (PowerShell) | macOS or Linux |
|---|---|
| `cd ..; Remove-Item -Recurse -Force secret-demo; cd kit` | `cd ..; rm -rf secret-demo; cd kit` |

```check
missing secret-demo -- Delete the throwaway secret-demo repository once you've seen the key survive.
```

**What else, and why not.**

| Tool | What it answers | Cost |
|---|---|---|
| Reading every diff since the last good version | Which change broke it | Grows with the number of commits; misses the dull line |
| `git bisect` (`run`) | The first commit where a test fails | Needs a good and a bad commit, and a test that can tell |
| `git blame` | Which commit last changed each line | Says *last* change only; a moved or reformatted line points at the move |
| `git log -S TEXT` | Every commit that added or removed some text | Text only, not behaviour |
| A second clone instead of a worktree | Two versions at once | A second copy of the whole history, out of step with the first |
| A hook vs a server-side check | Catches mistakes before a commit | A hook can be skipped; only a server can refuse |

## Your turn: a hook that refuses keys

Kit's hook should also refuse a commit that would add a private key, the commonest secret to end up in a repository by accident. A private key file contains a line like `-----BEGIN OPENSSH PRIVATE KEY-----`.

Write `hooks/no_secrets.py`: it looks at every file that's **staged** (added or modified in the commit being made), and if any of them contains the text `PRIVATE KEY-----`, it prints the file names and exits with status 1; otherwise it exits 0. Make `hooks/pre-commit` run it after the checks, and commit both, with the hook passing. It must pass Ruff, like the rest of Kit.

```hints
nudge: "Staged" means what's in the staging area, not what's in the folder: a file can be changed in the folder and staged in an older version. Git can list the staged files, and give you each one's staged content.
concept: git diff --cached --name-only --diff-filter=AM lists the files added (A) or modified (M) in the staging area. git show :NAME prints the staged version of NAME (the colon with no commit before it means the index). Run both from Python with subprocess.run(…, capture_output=True, check=True), and search the bytes.
shape: names = the stdout of the git diff command, .splitlines(). For each name, content = the stdout of git show ":" + name (bytes, no text=True). If the marker's bytes are in content, collect the name. Print and sys.exit(1) if any were found. In pre-commit, a second line: "$python" hooks/no_secrets.py || exit 1. One trap: think about what happens when no_secrets.py itself is staged.
answer: hooks/no_secrets.py:
~~~python
import subprocess
import sys

# Refuse a commit that stages something that looks like a private key. The
# marker is built from two pieces, so that this file doesn't contain it.
MARKER = ("PRIVATE" + " KEY-----").encode()


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, check=True).stdout


found = []
for name in git("diff", "--cached", "--name-only", "--diff-filter=AM").decode().splitlines():
    if MARKER in git("show", ":" + name):
        found.append(name)
if found:
    print("refusing to commit what looks like a private key:", *found)
    sys.exit(1)
~~~
and at the end of hooks/pre-commit:
~~~
"$python" hooks/no_secrets.py || exit 1
~~~
Then git add hooks/no_secrets.py hooks/pre-commit and commit; the hook runs both, and passes. The trap is writing MARKER = b"PRIVATE KEY-----" directly: then no_secrets.py contains the marker itself, and the commit that adds it is refused by the very check it adds. (The same kind of trap as 01-06-06's check_all.py, which ran itself.) Splitting the text in two, or skipping the hooks folder, avoids it.
```

```check
contains kit/hooks/pre-commit "no_secrets.py" -- hooks/pre-commit should run hooks/no_secrets.py.
run "cd kit; .venv/Scripts/python -c \"import pathlib, shutil, subprocess, sys, tempfile; t = tempfile.TemporaryDirectory(); d = pathlib.Path(t.name); hook = pathlib.Path('hooks/no_secrets.py').resolve(); git = lambda *a: subprocess.run(['git', *a], cwd=d, capture_output=True); git('init', '-q'); shutil.copy(hook, d / 'no_secrets.py'); git('add', 'no_secrets.py'); clean = subprocess.run([sys.executable, str(hook)], cwd=d, capture_output=True).returncode; (d / 'id_demo').write_text('-----BEGIN OPENSSH ' + 'PRIVATE KEY-----\\nabc\\n'); git('add', 'id_demo'); caught = subprocess.run([sys.executable, str(hook)], cwd=d, capture_output=True, text=True); t.cleanup(); print(clean == 0, caught.returncode == 1, 'id_demo' in caught.stdout)\"" stdout="True True True" -- no_secrets.py should pass a commit of itself, and refuse a staged private key, naming the file.
run "cd kit; .venv/Scripts/ruff check hooks/no_secrets.py" stdout="All checks passed!" -- hooks/no_secrets.py should pass Ruff.
run "cd kit; git hook run pre-commit" stderr="9 of 9 passed" -- The hook should still run every check, and pass.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('cat-file', '-e', 'HEAD:hooks/no_secrets.py').returncode == 0)\"" stdout="clean True" -- Commit hooks/no_secrets.py and the changed pre-commit.
```

**What these checks establish, and what they don't.** They check that the investigation reached its end: Sam's six commits applied, the regression reproduced, bisect finished and reset, the bad commit reverted, the regression check committed and passing, a committed pre-commit hook that runs every check, the throwaway repositories gone, and a secret check that refuses a staged key and lets itself through. They can't check that you used bisect rather than reading the six diffs. They also can't check that `no_secrets.py` catches every kind of secret, and it doesn't: an API key in a settings file sails through. Real secret scanners use hundreds of patterns, and still miss things, which is why the order in "A secret in the history" starts with revoking.

## What you can do now

- **Bisect** finds the first bad commit between a good and a bad one, halving the suspects at each test; `git bisect run` drives it with any program that exits 0 for good and non-zero for bad (125 to skip). Always `git bisect reset`.
- **Blame** (`git blame -L`) gives the commit that last changed each line; `git show` gives its reason. It points at a commit, not a culprit.
- A **worktree** (`git worktree add PATH COMMIT`) is a second folder on another commit of the same repository; `git worktree remove` when done.
- A **pre-commit hook** runs before each commit and can refuse it. Keep hooks in the repository with `core.hooksPath`; know they can be skipped (`--no-verify`).
- A **committed secret** stays in the history: revoke it first, then rewrite and replace every copy, then prevent the next one.
- Turn every bug you find into a **regression check**, so it can't return unnoticed.

```predict
question: A test started failing some time in the last 200 commits, but only on about half the runs (it's flaky). What goes wrong if you bisect with that test, and what would you change?
explain: Bisect trusts every answer: one wrong "good" or "bad" sends it into the wrong half, and it confidently names an innocent commit. A test that fails only half the time gives wrong answers. Make the test reliable at each step first, for example by running it 20 times and calling the commit bad if any run fails (and good only if all pass), or find the cause of the flakiness itself (module 1.10). With exit code 125, the script can skip commits that can't be tested at all.
```

**Next:** module 1.9 is about verification: what a test is, what makes one good, and the difference between a check that shows something and one that only seems to. Kit's `check_*.py` scripts become real tests, and Blockfall's rotation and line clearing get their first.
