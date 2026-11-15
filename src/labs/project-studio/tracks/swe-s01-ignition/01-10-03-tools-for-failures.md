---
title: "Tools for Failures: Loggers, Debuggers, and Bugs That Won't Reproduce"
runtime: python
---

Someone asks: "Why does `filter samples/app.log --all error --none debug` print only one line? There are two error lines that aren't debug lines." Checking means seeing what `filter` decides for each line, and the quickest way is a `print`. That works, and it also quietly breaks the program: the print's output goes where `filter`'s results go, into pipes and into anything that reads them. The tests still pass, so nothing stops the print from being committed. This lesson replaces the print with the tool built for the job, a **logger**, which reports on standard error and is silent until asked. Then it uses Python's **debugger** to stop the program mid-run, set **breakpoints** and **watches**, and examine a crashed program after the fact (**post-mortem**). It ends with the two judgement calls failures force on you: whether to retry or crash, and what to do about a bug you can't make happen again.

**By the end you can:**

- Say when a print, a logger or a debugger is the right tool, and why debugging prints don't belong in output.
- Add logging to a program with levels, on standard error, switched on by an environment variable.
- Use `pdb`: breakpoints, stepping, printing values, watching an expression, the call stack, and post-mortem debugging of a crash.
- Decide whether a failure should be retried, and gather evidence about a bug that won't reproduce.

**You need:** 01-06-02 (standard error, environment variables, pipes), 01-05-04 (a debugger, in the browser), 01-10-01 and 01-10-02 (errors, debugging as experiment). Commands run inside `kit`.

## A print to find out

Find out the quick way. In `filter.py`'s `filter_lines`, add a line straight after `for line in stream:`:

```
        print("DEBUG", line, matches(line, all_terms, any_terms, none_terms))
```

Save it and run the query (on Windows, `.venv/Scripts/python`):

```
.venv/bin/python filter.py samples/app.log --all error --none debug
```

```
error: disk full
DEBUG b'info: start\n' False
DEBUG b'error: disk full\n' True
DEBUG b'debug: error counter reset\n' False
DEBUG b'warning: slow response\n' False
DEBUG b'error: retry failed, debug id 7\n' False
DEBUG b'info: done\n' False
```

The answer to the question is there. The fifth line, `error: retry failed, debug id 7`, contains `debug` (in "debug id"), so `--none debug` excludes it. `filter` is right, and the expectation was wrong. Two things are wrong with how you found that out, though:

- **The order is wrong.** The real result, `error: disk full`, came out *before* the debug line that decided it. `filter` writes its results as bytes to `sys.stdout.buffer`, and `print` writes text to `sys.stdout`, which keeps its own buffer and passes it on later. The two arrive in whatever order the buffers empty, and that can differ between a terminal and a pipe.
- **It's in the output.** Pipe it on: `.venv/bin/python filter.py samples/app.log --all error --none debug | .venv/bin/python count.py` reports `lines: 7` where the answer is 1. Every program downstream now sees the debugging as data.

And `.venv/bin/python -m pytest -q` still says `95 passed`. No test runs `filter.py` from its command line, so the pre-commit hook would let this print be committed. Remove it: `git restore filter.py`.

```check
contains kit/filter.py "    for line in stream:" -- filter.py should be back as it was (git restore filter.py).
lacks kit/filter.py "print(\"DEBUG\"" -- Take the debugging print out.
```

## A logger

Python's **`logging`** module separates the two jobs a debugging print does badly. Code says *what happened* with `log.debug(...)`, `log.info(...)`, `log.warning(...)` or `log.error(...)`. Separately, one setting says *which of those to show, and where*. Each message has a **level**, from `DEBUG` (detail for whoever is investigating) through `INFO`, `WARNING` and `ERROR`. Messages below the chosen level cost almost nothing and print nothing, so they can stay in the code for good, ready for the next investigation.

Kit will choose the level with an environment variable, `KIT_LOG` (01-06-02), so that no tool's arguments change. Replace `kitargs.py`:

```python file=kit/kitargs.py
import logging
import os
import sys


# Take one flag out of a list of command-line arguments. Returns two things:
# whether the flag was there, and the other arguments, in order. A caller can
# pass its own list as rest to collect them into; otherwise each call makes
# a new one.
def take_flag(args, flag, rest=None):
    if rest is None:
        rest = []
    found = False
    for arg in args:
        if arg == flag:
            found = True
        else:
            rest.append(arg)
    return found, rest


# The input a tool should read: standard input for "-" or no name at all,
# otherwise the named file, opened for reading bytes.
def open_input(name):
    if name is None or name == "-":
        return sys.stdin.buffer
    return open(name, "rb")


# The name the program was run by: count.py, or kit-count when it's run as
# an installed command. sys.argv[0] is the path it was started from.
def program_name():
    return os.path.basename(sys.argv[0])


# If --help is among the arguments, print the usage line and stop. Asking
# for help isn't a mistake, so it goes to standard output, with status 0.
# usage is what follows the program's name: "[FILE|-] [--json]".
def help_if_asked(args, usage):
    if "--help" in args:
        print("usage:", program_name(), usage)
        sys.exit(0)


# Take an option that has a value, such as --output out.txt, out of the
# arguments. Returns the value (None if the option isn't there) and the other
# arguments. The option with nothing after it is a mistake: stop with a message.
def take_option(args, option):
    value = None
    rest = []
    i = 0
    while i < len(args):
        if args[i] == option:
            if i + 1 == len(args):
                sys.exit(option + " needs a value")
            value = args[i + 1]
            i = i + 2
        else:
            rest.append(args[i])
            i = i + 1
    return value, rest


# Stop with a message for the person running the program: on standard error,
# after the program's name, with exit status 1. It's for mistakes in how the
# program was run or in what it was given, never for bugs in the program.
def fail(message):
    print(program_name() + ": " + message, file=sys.stderr)
    sys.exit(1)


# The log levels KIT_LOG may name, from the most detailed to the least.
LEVELS = ["DEBUG", "INFO", "WARNING", "ERROR"]


# Show the log messages at or above the level named by the KIT_LOG
# environment variable, on standard error, so they never mix with a tool's
# output. Without KIT_LOG, only warnings and errors are shown.
def setup_logging():
    level = os.environ.get("KIT_LOG", "WARNING").upper()
    if level not in LEVELS:
        fail("KIT_LOG must be one of " + ", ".join(LEVELS) + ", not " + level)
    logging.basicConfig(level=level, stream=sys.stderr, format="%(name)s: %(levelname)s: %(message)s")
```

`setup_logging` is new, at the end, along with `import logging` at the top. `logging.basicConfig` sets up logging once for the whole program: messages go to standard error (never mixed with output), at the level named by `KIT_LOG` (default `WARNING`), formatted as `name: LEVEL: message`, like Kit's errors. A `KIT_LOG` that isn't a level is the user's mistake, so it gets a message from `fail` (01-10-01).

```check
contains kit/kitargs.py "def setup_logging():" -- kitargs.py should have setup_logging.
contains kit/kitargs.py "import logging" -- kitargs.py should import logging.
run "cd kit; .venv/Scripts/ruff check kitargs.py" stdout="All checks passed!" -- kitargs.py should pass Ruff.
```

## filter says what it decides

Now `filter.py` keeps a logger and reports each decision at `DEBUG`. Replace it:

```python file=kit/filter.py
import itertools
import logging
import os
import re
import sys

from kitargs import fail, setup_logging, take_option

log = logging.getLogger("filter")


# The query: a line matches when it contains every --all term,
# at least one --any term (if any were given), and no --none term.
# Terms are bytes, compared exactly: case matters.
def matches(line, all_terms, any_terms, none_terms):
    return (
        all(term in line for term in all_terms)
        and (not any_terms or any(term in line for term in any_terms))
        and not any(term in line for term in none_terms)
    )


# Can any line at all match the query? Try a line made of each subset of
# the query's terms. A term never contains a zero byte, so joining with one
# can't create a term that wasn't in the subset.
def can_match(all_terms, any_terms, none_terms):
    terms = all_terms + any_terms + none_terms
    for size in range(len(terms) + 1):
        for subset in itertools.combinations(terms, size):
            line = b"\0".join(subset)
            if matches(line, all_terms, any_terms, none_terms):
                return True
    return False


# The same answer, fast. A matching line needs every --all term and, if there
# are --any terms, one of them; any other term can only add forbidden text.
# So try just those lines: the --all terms with each --any term in turn.
def can_match_fast(all_terms, any_terms, none_terms):
    if not any_terms:
        return matches(b"\0".join(all_terms), all_terms, any_terms, none_terms)
    for term in any_terms:
        if matches(b"\0".join(all_terms + [term]), all_terms, any_terms, none_terms):
            return True
    return False


# Copy the lines that match from a stream of bytes to another stream of bytes.
# With a regex, a line must also contain a match for it.
def filter_lines(stream, out, all_terms, any_terms, none_terms, regex):
    for line in stream:
        keep = matches(line, all_terms, any_terms, none_terms) and (regex is None or regex.search(line))
        log.debug("%s %r", "keep" if keep else "skip", line)
        if keep:
            out.write(line)


# Filter the file called name, or standard input for "-", into out.
def filter_file(name, out, groups, regex):
    if name == "-":
        filter_lines(sys.stdin.buffer, out, groups["--all"], groups["--any"], groups["--none"], regex)
    else:
        with open(name, "rb") as file:
            filter_lines(file, out, groups["--all"], groups["--any"], groups["--none"], regex)


def main():
    setup_logging()
    output, args = take_option(sys.argv[1:], "--output")
    pattern, args = take_option(args, "--regex")
    if len(args) == 0:
        sys.exit("usage: filter.py FILE [--output OUT] [--regex PATTERN] [--all TERM ...] [--any TERM ...] [--none TERM ...]")

    regex = None
    if pattern is not None:
        try:
            regex = re.compile(pattern.encode("utf-8"))
        except re.error as error:
            sys.exit("filter.py: bad --regex " + pattern + ": " + str(error))

    groups = {"--all": [], "--any": [], "--none": []}
    group = None
    for arg in args[1:]:
        if arg in groups:
            group = groups[arg]
        elif group is None:
            sys.exit("filter.py: put --all, --any or --none before " + arg)
        else:
            group.append(arg.encode("utf-8"))

    if not can_match_fast(groups["--all"], groups["--any"], groups["--none"]):
        sys.exit("filter.py: no line can ever match this query")

    # Check the input before opening the output, so that a missing input
    # doesn't leave an empty output file behind.
    if args[0] != "-" and not os.path.isfile(args[0]):
        fail(args[0] + ": No such file or directory")
    if output is None:
        filter_file(args[0], sys.stdout.buffer, groups, regex)
    else:
        with open(output, "wb") as out:
            filter_file(args[0], out, groups, regex)


if __name__ == "__main__":
    main()
```

`logging.getLogger("filter")` makes (or finds) a logger called `filter`, and the name appears in each message, so when several modules log, you can tell them apart. In `filter_lines`, the decision gets a name, `keep`, so it can be both logged and used. `log.debug("%s %r", …)` passes the values separately rather than building the text first: if `DEBUG` is off, the text is never built. `%r` shows the line as Python writes it, `b'…\n'`, newline and all. `main` calls `setup_logging()` first.

Save it. Run the query as before, and it prints only `error: disk full`: logging is off. Now switch it on for one run:

| Windows (PowerShell) | macOS or Linux |
|---|---|
| `$env:KIT_LOG = "DEBUG"` then the command, then `Remove-Item Env:KIT_LOG` | `KIT_LOG=DEBUG .venv/bin/python filter.py samples/app.log --all error --none debug` |

```
error: disk full
filter: DEBUG: skip b'info: start\n'
filter: DEBUG: keep b'error: disk full\n'
filter: DEBUG: skip b'debug: error counter reset\n'
filter: DEBUG: skip b'warning: slow response\n'
filter: DEBUG: skip b'error: retry failed, debug id 7\n'
filter: DEBUG: skip b'info: done\n'
```

The same answer, but now on standard error. With `KIT_LOG` still set, pipe it into `count` again: `lines: 1`. The log goes to the screen, and only the results go down the pipe. A `KIT_LOG` of `nope` gets `filter.py: KIT_LOG must be one of DEBUG, INFO, WARNING, ERROR, not NOPE`.

```check
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --none debug" stdout="error: disk full" without="DEBUG" -- Without KIT_LOG, filter prints only its results.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sys; env = {**os.environ, 'KIT_LOG': 'DEBUG'}; r = subprocess.run([sys.executable, 'filter.py', 'samples/app.log', '--all', 'error', '--none', 'debug'], env=env, capture_output=True, text=True); print(r.stdout.strip() == 'error: disk full', 'filter: DEBUG: skip' in r.stderr)\"" stdout="True True" -- With KIT_LOG=DEBUG, filter logs each decision on standard error, and its output is unchanged.
run "cd kit; .venv/Scripts/python -m pytest -q" stdout="95 passed" -- Kit's tests should still pass.
```

## A debugger: breakpoints and watches

Logs answer the questions you thought to ask in advance. A **debugger** lets you ask new ones while the program is stopped: what is this variable now, how did we get here, what happens on the next line? Python's debugger is `pdb`, and it runs a program under its control:

```
.venv/bin/python -m pdb filter.py samples/app.log --all error --none debug
```

It stops before the first line, and waits at a `(Pdb)` prompt. Type these, one per line (the line number is the `log.debug` line in `filter_lines`. Find yours in the editor, and use it):

| Command | What it does |
|---|---|
| `b 53` | Set a **breakpoint**: stop whenever line 53 is about to run |
| `c` | Continue until a breakpoint (or the end) |
| `p line`, `p keep` | Print a value |
| `display keep` | **Watch** an expression: show it again at each stop, when it changes |
| `n`, `s` | Run the next line; step into a call on it |
| `w` | Where: the call stack, outermost first (01-05-02) |
| `q` | Quit |

A session, shortened:

```
(Pdb) b 53
Breakpoint 1 at c:\users\you\swe\kit\filter.py:53
(Pdb) c
> c:\users\you\swe\kit\filter.py(53)filter_lines()
-> log.debug("%s %r", "keep" if keep else "skip", line)
(Pdb) p line
b'info: start\n'
(Pdb) display keep
display keep: False
(Pdb) c
> c:\users\you\swe\kit\filter.py(53)filter_lines()
-> log.debug("%s %r", "keep" if keep else "skip", line)
display keep: True  [old: False]
(Pdb) w
  ...
  c:\users\you\swe\kit\filter.py(99)main()
-> filter_file(args[0], sys.stdout.buffer, groups, regex)
  c:\users\you\swe\kit\filter.py(64)filter_file()
-> filter_lines(file, out, groups["--all"], groups["--any"], groups["--none"], regex)
> c:\users\you\swe\kit\filter.py(53)filter_lines()
(Pdb) q
```

At each stop, the program is frozen with every variable as it is. `display` is a watch: `pdb` reports `keep` each time it changes, with its old value, so you see the second line's `True` without asking. (On Windows, `pdb` shows the path in lower case.) It's the same idea as 01-05-04's browser debugger. There you clicked to set a breakpoint, and here you type its line.

To stop at a place in your own code without typing breakpoints, write `breakpoint()` on a line. Running normally, the program stops there in `pdb`. Never commit one: like the print, it would stop every user's program.

## After a crash

A crash leaves a traceback, the stack at the moment of failure, but not the values. **Post-mortem debugging** stops the program *at* the crash, with all its variables still there. Plant 01-10-01's bug again: in `count.py`'s `feed`, change `chunk.count(b"\n")` to `chunk.count("\n")`. Then run it under `pdb`, telling it to continue straight away (`-c continue`):

```
.venv/bin/python -m pdb -c continue count.py samples/hello.txt
```

```
Uncaught exception. Entering post mortem debugging
Running 'cont' or 'step' will restart the program
> c:\users\you\swe\kit\count.py(64)feed()
-> "newlines": state["newlines"] + chunk.count("\n"),
(Pdb) p chunk
b'h\xc3\xa9llo\n'
(Pdb) p state['bytes']
0
```

The program has stopped on the failing line, inside `feed`, and `chunk` and `state` are there to examine. `chunk` is bytes, and `"\n"` is text, which is exactly the `TypeError`'s complaint. `q` leaves (and `pdb` prints the traceback on the way out). `pytest --pdb` does the same for a failing test: it stops at the failure, inside the test, with its values. Put `count.py` back with `git restore count.py`.

**Print, logger or debugger?**

| Tool | Best for | Cost |
|---|---|---|
| A `print` | A throwaway question, in code that's yours and about to change | Mixes with output, gets forgotten and committed, changes timing |
| A logger | Questions worth asking again, and a record of what a running program did | A little setup; you must decide what to log before you need it |
| A debugger | New questions about a program stopped mid-run, or just after a crash | Interactive: hard to use on a server, in a test run, or where timing matters |

```check
contains kit/count.py "chunk.count(b\"\\n\")" -- Take the planted bug out of count.py (git restore count.py).
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; r = subprocess.run([sys.executable, '-m', 'pdb', '-c', 'continue', 'filter.py', 'samples/app.log', '--all', 'error'], input='q\\n', capture_output=True, text=True); print('error: disk full' in r.stdout)\"" stdout="True" -- filter.py should run to the end under pdb.
```

## Retry or crash? And bugs that won't reproduce

Some failures go away on their own: a network that drops for a second, a file another program has locked for a moment, a server that's busy. For those, the right response may be to **retry**: try again a few times, waiting a little longer each time, then give up with an error. Retrying is right only when the failure is **transient** (an environment problem, in 01-10-01's terms) and the operation is safe to repeat. A bug never goes away on a retry. It only costs time and hides the bug. And a user's mistake won't be fixed by asking again. So:

| The failure | Do |
|---|---|
| A bug in the program | Crash, with the traceback |
| The user's mistake | Stop with a message saying what to change |
| Transient, in the environment, safe to repeat | Retry a few times with growing waits, log each attempt, then fail with a message |
| Lasting, in the environment (disk full) | Stop with a message; retrying just waits |

The hardest bugs are the ones that **won't reproduce**: they happened once, in someone's run, and never again in yours. 01-10-02's method needs a reproduction, so the work becomes gathering evidence until you have one:

- **Logs** are the record of a run you didn't watch. That's the strongest reason to log at `INFO` and above in normal running: a log made *before* the bug is the only witness.
- **Inputs:** the exact file, arguments, and environment (versions, operating system, `KIT_LOG`, the working folder, 01-09-03). Ask for them, and record them in the log.
- **Randomness and time:** a seed (01-09-03), a clock, the order of a set. Make them explicit, so a run can be replayed exactly.
- **Timing:** a bug that disappears when you add a print or a breakpoint, because they change the timing (a "heisenbug"), points at two things racing (module 7).

Commit the logging:

```
git add kitargs.py filter.py
git commit -m "Log filter's decisions at DEBUG, switched on by KIT_LOG"
git push
```

```check
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('rev-parse', 'main').stdout == git('rev-parse', 'origin/main').stdout)\"" stdout="clean True" -- Commit the logging and push.
```

## Your turn: count logs what it reads

01-01-04's `count_stream` reads its input in pieces of up to 65536 bytes. Make `count` log each piece it reads at `DEBUG`, as `count: DEBUG: read N bytes`, using `setup_logging` and a logger called `count`. Then write `tests/test_logging.py`, a test that runs `count.py samples/hello.txt --json` with `KIT_LOG=DEBUG`, and asserts both that standard output is still exactly the JSON counts and that standard error has `count: DEBUG: read 7 bytes`. Commit.

```hints
nudge: The same three pieces as filter: import logging and setup_logging, a module-level log = logging.getLogger("count"), and setup_logging() at the start of main. The new line goes in count_stream's loop, after the empty-chunk check.
concept: log.debug("read %d bytes", len(chunk)) inside the while loop. For the test, run_kit doesn't pass an environment, so call subprocess.run yourself with env={**os.environ, "KIT_LOG": "DEBUG"} and cwd set to the kit folder, found from the test's own location (01-09-03).
shape: In count.py: import logging; from kitargs import fail, help_if_asked, open_input, setup_logging, take_flag; log = logging.getLogger("count"); in count_stream, after "if not chunk: break", log.debug("read %d bytes", len(chunk)); in main, setup_logging() first. tests/test_logging.py: KIT = Path(__file__).resolve().parent.parent; result = subprocess.run([sys.executable, "count.py", "samples/hello.txt", "--json"], cwd=KIT, env=env, capture_output=True, text=True, check=False); assert json.loads(result.stdout)["bytes"] == 7; assert "count: DEBUG: read 7 bytes" in result.stderr.
answer: tests/test_logging.py:
~~~python
import json
import os
import subprocess
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent


# With KIT_LOG=DEBUG, count logs each piece it reads on standard error,
# and its standard output is still exactly the counts.
def test_count_logs_on_stderr_only():
    env = {**os.environ, "KIT_LOG": "DEBUG"}
    command = [sys.executable, "count.py", "samples/hello.txt", "--json"]
    result = subprocess.run(command, cwd=KIT, env=env, capture_output=True, text=True, check=False)
    assert json.loads(result.stdout)["bytes"] == 7
    assert "count: DEBUG: read 7 bytes" in result.stderr
~~~
and in count.py the three changes in the shape rung. 96 tests pass. The tempting slip is putting the log line before the empty-chunk check: then the last, empty read is logged too, as "read 0 bytes", which the test doesn't catch but a reader of the log would find confusing. Another is print instead of log.debug, which breaks the json.loads in the test, as the print broke filter's pipe.
```

```check
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sys; env = {**os.environ, 'KIT_LOG': 'DEBUG'}; r = subprocess.run([sys.executable, 'count.py', 'samples/hello.txt', '--json'], env=env, capture_output=True, text=True); print(r.stdout.strip(), 'count: DEBUG: read 7 bytes' in r.stderr)\"" stdout="{\"bytes\": 7, \"lines\": 1, \"words\": 1, \"characters\": 6, \"longest\": 6} True" -- With KIT_LOG=DEBUG, count should log each read on standard error and print only the counts.
run "cd kit; .venv/Scripts/python count.py samples/hello.txt --json" stdout="{\"bytes\": 7" without="DEBUG" -- Without KIT_LOG, count logs nothing.
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_logging.py" stdout="passed" without="failed" -- tests/test_logging.py should pass.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sys; env = {**os.environ, 'KIT_LOG': 'DEBUG'}; r = subprocess.run([sys.executable, 'count.py', 'samples/hello.txt'], env=env, capture_output=True, text=True); print('read 0 bytes' in r.stderr)\"" stdout="False" -- The empty read at the end shouldn't be logged.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout)\"" stdout="clean" -- Commit your changes.
```

**What these checks establish, and what they don't.** They check that the debugging print is gone, that `filter` and `count` log on standard error only when `KIT_LOG` asks, that their output is unchanged either way, and that a test guards `count`'s. They can't check your use of the debugger, which leaves nothing behind. That's its strength and its limit: what you learned in a `pdb` session is lost unless you turn it into a test or a log line. They also can't judge what you chose to log. Too little, and the log can't explain a failure. Too much, and nobody reads it. A good line says what was decided and on what, as `filter`'s `skip b'…'` does.

## What you can do now

- A debugging **`print`** shares the program's output: it corrupts pipes, can arrive out of order, and gets committed. Use it for throwaway questions only.
- A **logger** (`logging.getLogger(name)`, `log.debug(…)`) reports on standard error at a **level**; one setting (`KIT_LOG`, `basicConfig`) chooses what's shown. Log lines can stay in the code for good.
- A **debugger** (`python -m pdb`) stops a running program: **breakpoints** (`b`), stepping (`n`, `s`), values (`p`), **watches** (`display`), the stack (`w`). **Post-mortem** (`-c continue`, `pytest --pdb`) stops at a crash with its values intact.
- **Retry** only transient, repeatable failures in the environment, with a limit and growing waits; crash on bugs, and give users a message.
- For a bug that **won't reproduce**, gather evidence: logs from before the failure, exact inputs and environment, seeds and times made explicit.

```predict
question: A program fails about once a week on a server, never on your machine, and leaves only "Error: operation failed" in its log. What would you change so that the next failure can be explained?
explain: Make the next failure leave evidence. Log the full exception with its traceback (log.exception, at ERROR), not just a message; log the inputs and environment that matter at INFO as each operation starts (which file, which arguments, versions); make randomness and times explicit and logged; and if the operation touches the network or another program, log each attempt and its result, so a transient failure can be told from a bug. Then, when it happens again, the log is the reproduction's first draft: the exact inputs to try on your machine.
```

**Next:** module 1.11 is about how language models work and fail: what a model actually does when it writes, where its knowledge ends, why it can be fluently wrong, and what changes when it acts through tools. Everything in modules 1.8 to 1.10 (reviewing diffs, testing claims, debugging by experiment) is what makes working with one safe.
