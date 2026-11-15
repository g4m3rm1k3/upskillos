---
title: "Errors That Help: Tracebacks, Kinds of Error, and Messages for People"
runtime: python
---

Ask Kit to count a file that isn't there, and it answers with this:

```
Traceback (most recent call last):
  File "C:\Users\you\swe\kit\count.py", line 139, in <module>
    main()
    ~~~~^^
  File "C:\Users\you\swe\kit\count.py", line 122, in main
    with open_input(name) as stream:
         ~~~~~~~~~~^^^^^^
  File "C:\Users\you\swe\kit\kitargs.py", line 26, in open_input
    return open(name, "rb")
FileNotFoundError: [Errno 2] No such file or directory: 'nothere.txt'
```

Ten lines, three files and two line numbers, all to say "there's no file called `nothere.txt`". Other mistakes go worse. `tree.py nothere` prints a complaint and then exits with status 0, success, so a script that relies on it carries on as if all were well. `count.py samples` on Windows says `PermissionError: [Errno 13] Permission denied: 'samples'`, which sends you looking at permissions when the problem is that `samples` is a folder. An error message is part of a program's interface, and it has a reader. This lesson is about writing errors for that reader. It covers reading a traceback, the kinds of error and which ones should crash, where to catch an error, and what a message for a person looks like. Kit's tools get messages like `count.py: nothere.txt: No such file or directory`, test first.

**By the end you can:**

- Read a traceback from the bottom up, and say who it's for.
- Sort an error into a mistake by the user, a problem in the environment, or a bug, and handle each the way it needs.
- Fail fast and loudly instead of silently, check what you can before doing any work, and catch errors at the program's edge rather than deep inside it.
- Write an error message that names the program, the thing that's wrong, and the problem, on standard error, with a non-zero exit status.

**You need:** 01-05-02 (the call stack and exceptions unwinding it), 01-06-02 (standard error and exit status), 01-09-01 to 01-09-03 (tests, `run_kit`). Commands run inside `kit`.

## Reading a traceback

Run it yourself: `.venv/bin/python count.py nothere.txt` (on Windows, `.venv/Scripts/python`). A **traceback** is Python's account of an exception that nothing caught (01-05-02). Read it from the bottom up:

- The **last line** is what happened: the exception's type, `FileNotFoundError`, and its message. Most of the time this line is all you need.
- Above it are the **frames**, one for each call that was in progress, the outermost first: `count.py`'s top level called `main()` at line 139, `main` called `open_input(name)` at line 122, and `open_input` called `open(name, "rb")` in `kitargs.py`, where the exception was raised. Since Python 3.11 the `~~~^^^` marks point at the exact expression in each line.

That's everything a developer needs to find where it failed, and nothing a user needs. The user didn't write `kitargs.py` and doesn't care which line called `open`. They need to know the file isn't there, and they know that already, once the message says so plainly.

Now see the other two from the opening. `.venv/bin/python tree.py nothere` prints `nothere/` and `[can't list nothere: …]`, then exits with status 0. Check with `$LASTEXITCODE` in PowerShell, or `echo $?` elsewhere (01-01-04). `.venv/bin/python count.py samples` raises `PermissionError` on Windows, and `IsADirectoryError` on macOS and Linux: the operating system's own words for "that's a folder", which differ by system and mislead on one of them.

```predict
question: tree.py nothere exits with status 0. Why is that worse than crashing?
choice: It isn't: it printed what went wrong
choice: Anything that checks the exit status believes the walk succeeded
choice: Status 0 means the folder exists
answer: Anything that checks the exit status believes the walk succeeded
explain: A person reading the screen might notice the bracketed complaint; run_checks.py, a pre-commit hook, a script or a pipeline only sees status 0, and carries on with nothing (01-09-02's check_filter.py had the same flaw). Failing silently hides a problem from everything that can't read prose. A crash is at least noticed.
```

```check
run "cd kit; .venv/Scripts/python count.py nothere.txt" exit=1 stderr="FileNotFoundError: [Errno 2] No such file or directory: 'nothere.txt'" -- count.py should still show the traceback, for now.
```

## Kinds of error

Not every error deserves the same treatment. Sort them by whose fault they are, and the right handling follows:

| Kind | Kit's examples | Who can fix it | What the program should do |
|---|---|---|---|
| A **mistake by the user**: bad arguments or input | A file that isn't there; an unknown encoding; a folder where a file goes | The user | Stop at once, with a message in the user's terms, on standard error, exit status 1 |
| A problem in the **environment** | A file it may not read; a full disk; a network that's down | The user or an administrator | The same: say what failed and on what, using the system's reason (`strerror`) |
| A **bug** in the program | `TypeError`, `IndexError`, `KeyError` inside Kit's own code | The developer | Crash with the traceback: it's exactly what the developer needs, and a friendly message would hide it |

Two rules come out of this. **Fail fast**: when something is wrong, stop as soon as you can tell, before doing work that will be wasted, and certainly before reporting success. **Fail loudly**: an error goes to standard error with a non-zero exit status, never only into the normal output. Programs that read the status (scripts, hooks, `run_checks.py`) depend on it.

Command-line tools share a format for these messages, `program: subject: problem`. Git Bash's `grep` and `ls` show it:

```
/usr/bin/grep: nothere: No such file or directory
/usr/bin/ls: cannot access 'nothere': No such file or directory
```

`grep` exits with status 2 here. Many tools use 2 for "you ran me wrongly" and 1 for "it didn't work" (`grep` uses 1 for "no line matched"). Kit has used 1 for every failure since 01-01-04 and keeps that. What matters is that the status isn't 0, and that it's documented.

## The tests first

As in 01-09-04, write down what should happen before changing anything. Each mistake, the message it should get, and the rule that it's on standard error, with status 1, and with nothing on standard output:

```python file=kit/tests/test_errors.py
import pytest

# Each mistake a user can make, and the message they should get: on standard
# error, naming the program and the thing that's wrong, with exit status 1.
MISTAKES = [
    (["count.py", "nothere.txt"], "count.py: nothere.txt: No such file or directory"),
    (["count.py", "samples/hello.txt", "nosuch"], "count.py: unknown encoding: nosuch"),
    (["count.py", "samples"], "count.py: samples: is a folder, not a file"),
    (["tree.py", "nothere"], "tree.py: nothere: no such folder"),
    (["tree.py", "count.py"], "tree.py: count.py: is a file, not a folder"),
]


@pytest.mark.parametrize(("args", "message"), MISTAKES)
def test_a_mistake_gets_a_message(run_kit, args, message):
    result = run_kit(*args)
    assert result.returncode == 1
    assert result.stderr.strip() == message
    assert result.stdout == ""
```

Save it and run `.venv/bin/python -m pytest -q tests/test_errors.py`:

```
FAILED tests/test_errors.py::test_a_mistake_gets_a_message[args0-count.py: nothere.txt: No such file or directory]
FAILED tests/test_errors.py::test_a_mistake_gets_a_message[args1-count.py: unknown encoding: nosuch]
FAILED tests/test_errors.py::test_a_mistake_gets_a_message[args2-count.py: samples: is a folder, not a file]
FAILED tests/test_errors.py::test_a_mistake_gets_a_message[args3-tree.py: nothere: no such folder]
FAILED tests/test_errors.py::test_a_mistake_gets_a_message[args4-tree.py: count.py: is a file, not a folder]
5 failed in 1.33s
```

Red, for the reason expected: the messages don't exist yet. Don't commit now. The pre-commit hook (01-08-04) runs every test and would refuse the commit, which is the hook doing its job.

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_errors.py" exit=1 stdout="5 failed" -- The five new tests should fail: no tool gives these messages yet (red).
```

## One way to fail

Every tool will stop the same way, so write it once, in `kitargs.py`, Kit's shared module (01-05-01). Add this to the end, after two blank lines (Python's spacing between functions):

```python edit=kit/kitargs.py mode=append
# Stop with a message for the person running the program: on standard error,
# after the program's name, with exit status 1. It's for mistakes in how the
# program was run or in what it was given, never for bugs in the program.
def fail(message):
    print(program_name() + ": " + message, file=sys.stderr)
    sys.exit(1)
```

`print(…, file=sys.stderr)` writes to standard error (01-06-02). `program_name()` (01-06-05) gives `count.py`, or `kit-count` when it's run as the installed command, so the message names what the user actually typed. The comment says what `fail` is for. Bugs don't go through `fail`.

```check
contains kit/kitargs.py "def fail(message):" -- kitargs.py should have a fail function.
run "cd kit; .venv/Scripts/python -c \"import kitargs, sys; sys.argv = ['count.py']; kitargs.fail('test message')\"" exit=1 stderr="count.py: test message" -- fail should print the program's name and the message on standard error, and exit with status 1.
```

## Check before reading

Now `count.py`. Three checks, in the order that fails fastest: the encoding (a name, checked without touching any file), then whether the name is a folder, then the file itself as it's opened. Replace `count.py`:

```python file=kit/count.py
import codecs
import json
import os
import sys

from kitargs import fail, help_if_asked, open_input, take_flag

USAGE = "[FILE|-] [ENCODING] [--json]"

# ASCII whitespace, the six bytes from the definition of a word.
WHITESPACE = b" \t\n\r\x0b\x0c"
NEWLINE = 10  # the value of the byte b"\n"
CHUNK_SIZE = 65536  # how many bytes to read at a time (64 KiB)


# The counting as a state machine, fed one piece at a time.
def start(encoding):
    return {
        "bytes": 0,
        "newlines": 0,
        "words": 0,
        "in_word": False,
        "last": None,
        "line_length": 0,
        "longest": 0,
        "characters": 0,
        "decoder": codecs.getincrementaldecoder(encoding)(),
    }


def feed(state, chunk):
    in_word = state["in_word"]
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
    line_length = state["line_length"]
    longest = state["longest"]
    for byte in chunk:
        if byte == NEWLINE:
            longest = max(longest, line_length)
            line_length = 0
        else:
            line_length += 1
    last = state["last"]
    if chunk:
        last = chunk[-1]
    characters = state["characters"]
    decoder = state["decoder"]
    if decoder is not None:
        try:
            characters += len(decoder.decode(chunk))
        except UnicodeDecodeError:
            characters = None
            decoder = None
    return {
        "bytes": state["bytes"] + len(chunk),
        "newlines": state["newlines"] + chunk.count(b"\n"),
        "words": words,
        "in_word": in_word,
        "last": last,
        "line_length": line_length,
        "longest": longest,
        "characters": characters,
        "decoder": decoder,
    }


def finish(state):
    lines = state["newlines"]
    if state["last"] is not None and state["last"] != NEWLINE:
        lines += 1
    characters = state["characters"]
    if state["decoder"] is not None:
        try:
            characters += len(state["decoder"].decode(b"", final=True))
        except UnicodeDecodeError:
            characters = None
    return {
        "bytes": state["bytes"],
        "lines": lines,
        "words": state["words"],
        "characters": characters,
        "longest": max(state["longest"], state["line_length"]),
    }


# The counting as a function: all the bytes in, counts out.
def measure(data, encoding):
    return finish(feed(start(encoding), data))


# Read a stream a piece at a time, feeding each piece to the machine.
def count_stream(stream, encoding):
    state = start(encoding)
    while True:
        chunk = stream.read(CHUNK_SIZE)
        if not chunk:
            break
        state = feed(state, chunk)
    return finish(state)


# The program: read the input, count it, print the result.
def main():
    help_if_asked(sys.argv[1:], USAGE)
    as_json, args = take_flag(sys.argv[1:], "--json")

    if len(args) > 1:
        encoding = args[1]
    else:
        encoding = "utf-8"

    name = None
    if len(args) > 0:
        name = args[0]

    # Check what can be checked before reading anything, and say what's wrong
    # in the user's terms. Anything else that goes wrong is a bug: let it crash.
    try:
        codecs.lookup(encoding)
    except LookupError:
        fail("unknown encoding: " + encoding)
    if name is not None and name != "-" and os.path.isdir(name):
        fail(name + ": is a folder, not a file")
    try:
        with open_input(name) as stream:
            counts = count_stream(stream, encoding)
    except OSError as error:
        fail(name + ": " + error.strerror)

    if as_json:
        print(json.dumps(counts))
        return
    print("bytes:", counts["bytes"])
    print("lines:", counts["lines"])
    print("words:", counts["words"])
    if counts["characters"] is None:
        print("characters: not", encoding, "text")
    else:
        print("characters:", counts["characters"])
    print("longest:", counts["longest"])


if __name__ == "__main__":
    main()
```

Look at `main`. `codecs.lookup(encoding)` asks Python whether it knows the encoding, and raises `LookupError` if it doesn't. Asked up front, it fails before a byte is read, where before it failed only once reading began. `os.path.isdir` names the folder problem in Kit's own words, the same on every system. Opening and reading are wrapped in `try`/`except OSError`, the parent of `FileNotFoundError`, `PermissionError`, `IsADirectoryError` and every other error the operating system reports. `error.strerror` is the system's reason in plain words, `No such file or directory`. Everything else is left alone: a `TypeError` inside `count_stream` is a bug, and still crashes with its traceback.

This is also *where* to catch errors: at the edge, in `main`, where the program meets its user and knows what the user asked for. `count_stream` and `open_input` don't catch anything. They don't know whether they were called by a person at a terminal, by a test, or by another program, so they let the exception travel up the stack (01-05-02) to the code that does know. Catching it deep inside would mean deciding there what to tell a user who might not exist.

Save it and run the tests: `.venv/bin/python -m pytest -q tests/test_errors.py` now says `2 failed, 3 passed`. The three `count.py` tests pass, and the two `tree.py` tests are still red. Try them by hand:

```
count.py: nothere.txt: No such file or directory
count.py: unknown encoding: nosuch
count.py: samples: is a folder, not a file
```

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_errors.py -k \"not tree\"" stdout="3 passed" -- count.py's three mistakes should get their messages.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt" stdout="bytes: 7" -- count.py should still count a real file.
```

## Fail fast, not silently

`tree` already reports folders it can't list, and walks on. That's right for a folder deep in the tree, because one unreadable folder shouldn't stop the rest. It's wrong for the folder the user asked for: if that isn't a folder, there is nothing to walk, and saying so with status 0 is failing silently. Replace `tree.py`:

```python file=kit/tree.py
import os
import sys

from kitargs import fail, help_if_asked

USAGE = "[FOLDER]"


# Print everything inside the folder at path, one name per line, indented
# by depth. A folder's contents are printed by calling tree on that folder.
# A folder that can't be listed is reported, and the walk carries on.
# Entries are sorted, because os.listdir's order is arbitrary (01-07-03).
def tree(path, depth):
    try:
        names = sorted(os.listdir(path))
    except OSError as error:
        print("    " * depth + "[can't list " + path + ": " + error.strerror + "]")
        return
    for name in names:
        child = os.path.join(path, name)
        if os.path.isdir(child):
            print("    " * depth + name + "/")
            tree(child, depth + 1)
        else:
            print("    " * depth + name)


def main():
    help_if_asked(sys.argv[1:], USAGE)
    root = "."
    if len(sys.argv) > 1:
        root = sys.argv[1]
    # A folder deep inside that can't be listed is reported and the walk goes
    # on; but if the folder asked for isn't one, there's nothing to walk.
    if not os.path.exists(root):
        fail(root + ": no such folder")
    if not os.path.isdir(root):
        fail(root + ": is a file, not a folder")
    print(root + "/")
    tree(root, 1)


if __name__ == "__main__":
    main()
```

Two checks before anything is printed, each with its own message, because "it isn't there" and "it's a file" call for different fixes. The `[can't list …]` lines for folders inside stay as they were. Save it and run the error tests: `5 passed`. Then all of Kit's tests, `.venv/bin/python -m pytest -q`: `91 passed`. Commit:

```
git add kitargs.py count.py tree.py tests/test_errors.py
git commit -m "Give count and tree errors written for the person running them"
git push
```

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_errors.py" stdout="5 passed" -- All five mistakes should get their messages.
run "cd kit; .venv/Scripts/python tree.py sample_tree" stdout="sample_tree/" -- tree.py should still walk a real folder.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('rev-parse', 'main').stdout == git('rev-parse', 'origin/main').stdout)\"" stdout="clean True" -- Commit and push.
```

## Catching too much

There's a tempting shortcut: catch *every* exception in `main`, so that no user ever sees a traceback. Try it, and watch what it does to a bug. In `count.py`, change `except OSError as error:` to `except Exception as error:`, and the `fail` line below it to `fail(name + ": " + str(error))`. Then plant a bug: in `feed`, change `chunk.count(b"\n")` to `chunk.count("\n")`, text where bytes belong. Run `.venv/bin/python count.py samples/hello.txt`:

```
count.py: samples/hello.txt: argument should be integer or bytes-like object, not 'str'
```

Read it as a user would. It names their file and gives a reason, so the file must be wrong somehow. The file is fine. The program is broken, and the message blames the wrong party and has thrown away the traceback that would have pointed at `feed`. That's the cost of catching too much: bugs turn into misleading user errors, and nobody can find them. Put the `OSError` version back (`git restore count.py` undoes all three changes), plant the same bug alone, and run it again. Now it crashes with `TypeError: argument should be integer or bytes-like object, not 'str'` and a traceback ending in `feed`, which is right for a bug. Restore `count.py` again.

Catch only the exceptions you can explain to the user (`OSError`, `LookupError`), as close to the edge as you can, and let everything else crash.

**What else, and why not.**

| Way to handle errors | Cost |
|---|---|
| Let every exception show its traceback | Nothing to write; users get developer output, and mistakes look like bugs |
| Catch everything (`except Exception`) and print the message | No tracebacks ever; bugs disguised as user errors, and undebuggable |
| Report the problem and carry on with status 0 | Looks forgiving; scripts and hooks believe it worked (failing silently) |
| `argparse` (Python's argument parser) | Usage errors, `--help` and exit status 2 for free; a rewrite of every tool's arguments (Kit's `kitargs` does a small part by hand) |
| Check up front, catch `OSError` at the edge, `fail` with a message | A few lines per tool; the message must be kept true as the code changes |

```check
contains kit/count.py "    except OSError as error:" -- Put the OSError version back (git restore count.py).
contains kit/count.py "chunk.count(b\"\\n\")" -- Take the planted bug out again.
run "cd kit; .venv/Scripts/python -m pytest -q" stdout="91 passed" -- All of Kit's tests should pass.
```

## Your turn: three more tools

`hexdump.py`, `csvtool.py` and `filter.py` still crash with a `FileNotFoundError` traceback on a missing file. Give each the `fail` treatment, test first, adding a case to `MISTAKES` in `tests/test_errors.py` for each:

```
hexdump.py: nothere.bin: No such file or directory
csvtool.py: nothere.csv: No such file or directory
filter.py: nothere.log: No such file or directory
```

`filter.py` has a second problem, and it's the subtler one. Run `.venv/bin/python filter.py nothere.log --output ../trap.txt --all a`. It crashes, *and* leaves an empty `../trap.txt` behind, because it opens the output file before it reads the input. Write a test that the output file isn't created when the input is missing (`tmp_path` gives somewhere to point `--output`), and make it pass. Then delete `../trap.txt`, run all the tests, and commit.

```hints
nudge: For hexdump and csvtool, it's count's change again: import fail, and wrap the opening and reading in try / except OSError. For filter, think about the order of what main does: when is the output file created?
concept: with open(output, "wb") creates the output file the moment it runs, even if nothing is ever written to it. Check that the input exists first (os.path.isfile), and fail before the output is opened. "-" means standard input and needs no check. A test for it: run filter.py with --output tmp_path / "out.txt" and a missing input, then assert not out.exists().
shape: hexdump.py: try: with open_input(name) as stream: dump(...) except OSError as error: fail(name + ": " + error.strerror). csvtool.py: the same around its open(args[0], ...). filter.py: import os and fail; before "if output is None:", add: if args[0] != "-" and not os.path.isfile(args[0]): fail(args[0] + ": No such file or directory"). In test_errors.py, three more MISTAKES rows, and a test_filter_makes_no_output_for_a_missing_input(run_kit, tmp_path).
answer: hexdump.py and csvtool.py import fail from kitargs and wrap their opening and reading:
~~~python
    try:
        with open_input(name) as stream:
            dump(stream, fmt, as_json)
    except OSError as error:
        fail(name + ": " + error.strerror)
~~~
(csvtool.py the same around with open(args[0], encoding="utf-8", newline="") as file: rows = parse_csv(file.read()), with args[0] in the message.) filter.py imports os and fail, and checks the input before the output is opened:
~~~python
    # Check the input before opening the output, so that a missing input
    # doesn't leave an empty output file behind.
    if args[0] != "-" and not os.path.isfile(args[0]):
        fail(args[0] + ": No such file or directory")
    if output is None:
~~~
tests/test_errors.py gets three more MISTAKES rows and:
~~~python
# A missing input must not leave an empty output file behind.
def test_filter_makes_no_output_for_a_missing_input(run_kit, tmp_path):
    out = tmp_path / "out.txt"
    result = run_kit("filter.py", "nothere.log", "--output", out, "--all", "a")
    assert result.returncode == 1
    assert not out.exists()
~~~
95 tests pass. The tempting slip in filter.py is wrapping only filter_file in try/except OSError: the message comes out right, but by then with open(output, "wb") has already created the empty file, which the last test catches.
```

```check
run "cd kit; .venv/Scripts/python hexdump.py nothere.bin" exit=1 stderr="hexdump.py: nothere.bin: No such file or directory" without="Traceback" -- hexdump.py should report a missing file in one line.
run "cd kit; .venv/Scripts/python csvtool.py nothere.csv" exit=1 stderr="csvtool.py: nothere.csv: No such file or directory" -- csvtool.py should report a missing file in one line.
run "cd kit; .venv/Scripts/python filter.py nothere.log --all a" exit=1 stderr="filter.py: nothere.log: No such file or directory" -- filter.py should report a missing file in one line.
run "cd kit; .venv/Scripts/python -c \"import pathlib, subprocess, sys, tempfile; t = tempfile.TemporaryDirectory(); out = pathlib.Path(t.name, 'out.txt'); r = subprocess.run([sys.executable, 'filter.py', 'nothere.log', '--output', str(out), '--all', 'a'], capture_output=True); made = out.exists(); t.cleanup(); print(r.returncode, made)\"" stdout="1 False" -- A missing input must not leave an empty output file behind.
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; out = subprocess.run([sys.executable, '-m', 'pytest', '-q', '--collect-only', 'tests/test_errors.py'], capture_output=True, text=True).stdout; print(out.count('test_errors.py::') >= 9)\"" stdout="True" -- tests/test_errors.py should test the three new messages and the output file (at least 9 tests).
missing trap.txt -- Delete ../trap.txt, left by the experiment.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout)\"" stdout="clean" -- Commit your changes (the hook runs every test).
```

**What these checks establish, and what they don't.** They check each tool's message for each mistake word for word, its exit status, that nothing went to standard output, that `filter` creates no output for a missing input, and that a real file still works. They can't check that every *other* mistake gets a good message. Run `csvtool.py` with no arguments at all and you'll still get an `IndexError` traceback, a user's mistake shown as if it were a bug. Nor can they check that a message is true: `fail(name + ": No such file or directory")` would pass the missing-file test even if the real problem were permissions. Messages are claims to the user, and like every claim (01-07-03), they're only as good as the check behind them.

## What you can do now

- A **traceback** is read bottom up: the exception and its message, then the calls in progress, outermost first. It's for developers.
- Errors come in three kinds: the **user's mistakes**, problems in the **environment**, and **bugs**. The first two get a message and exit status 1. Bugs crash with their traceback.
- **Fail fast** (check what you can before doing work) and **fail loudly** (standard error, non-zero status). Never report a failure with status 0.
- Catch errors **at the edge** (`main`), and only the kinds you can explain (`OSError`, `LookupError`). `except Exception` turns bugs into misleading messages.
- A message for a person names the **program**, the **thing** and the **problem**: `count.py: nothere.txt: No such file or directory`.

```predict
question: A web form shows "Something went wrong. Please try again later." for every error, from a mistyped email to a crashed database. What's wrong with that, for each kind of error, and what would you do instead?
explain: It treats all three kinds as one. For the user's mistake (a mistyped email) it hides the fix they could make in a second: say which field and what's wrong. For an environment problem (the database is down) "try again later" may be right, but saying so specifically helps them decide whether to wait. For a bug, the user can do nothing and the developer has been told nothing: log the full traceback where developers will see it, with an id the page can show so a report can be matched to it. Catching everything into one friendly sentence is except Exception for a web page.
```

**Next:** 01-10-02 treats debugging as science: Blockfall's piece sometimes falls through the floor, and finding why means a reproduction, a hypothesis, an experiment that could prove it wrong, and narrowing the search, the method you used with `git bisect` in 01-08-04, applied inside the code.
