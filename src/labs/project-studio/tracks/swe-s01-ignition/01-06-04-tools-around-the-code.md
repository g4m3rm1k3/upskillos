---
title: Tools Around the Code: Linters, Formatters and Running Checks
runtime: python
---

Kit is now about fifty Python files, written over five modules, and every one of them has been run and checked. But "it ran" only tells you about the paths you tried. Some mistakes can be seen without running anything, by reading the code: a name used before it's assigned, a value computed and thrown away, a file opened and never closed when something goes wrong. A **linter** is a program that reads code and reports patterns like these, in seconds, on every file. A **formatter** rewrites code into one consistent layout, so that nobody has to argue about spacing again. This lesson runs both on Kit for the first time. The linter's report is full of things you already know, because several of them are mistakes this course made on purpose, and one is a real weakness in code from two lessons ago. The lesson also shows how to run all of Kit's checks with one command, and what an editor's language server adds while you type.

**By the end you can:**

- Install a tool into a virtual environment at a pinned version, and run a linter and a formatter on a project.
- Read a linter's findings, and sort them into likely bugs, risky patterns and matters of style.
- Fix a real finding, record a deliberate exception in the tool's configuration, and say why.
- Reformat code and prove that behaviour didn't change, by running the project's checks from the command line.
- Say what a language server is and what an editor gets from one.

**You need:** Kit as it stands after 01-06-03, its virtual environment, and an internet connection for one install. Commands run inside `kit`.

## A program that reads your code

This lesson uses **Ruff**, a linter and formatter in one, for Python. Install it into Kit's virtual environment with `pip`, Python's package installer (01-06-05 is about packages; for now, `pip install` downloads a package and puts it in the environment). The `==0.17.5` pins the version: linters gain new rules with each release, and pinning means you'll see exactly the report shown here.

```
.venv/bin/python -m pip install ruff==0.17.5
```

(Windows: `.venv\Scripts\python -m pip install ruff==0.17.5`.) It prints a few lines, ending with `Successfully installed ruff-0.17.5`. The install also adds a program to the environment, `.venv/bin/ruff` (Windows: `.venv\Scripts\ruff`). Check it with `.venv/bin/ruff --version`: `ruff 0.17.5`.

Now lint the whole of Kit. `ruff check .` checks every Python file in the folder and below, skipping `.venv`. `--output-format concise` gives one line per finding:

```
.venv/bin/ruff check --output-format concise .
```

```
compare_levels.py:12:20: UP012 [*] Unnecessary UTF-8 `encoding` argument to `encode`
compare_levels.py:18:14: PLW1510 `subprocess.run` without explicit `check` argument
env_demo.py:15:1: PLW1510 `subprocess.run` without explicit `check` argument
filter.py:47:9: SIM102 Use a single `if` statement instead of nested `if` statements
filter.py:80:15: SIM115 Use a context manager for opening files
make_server_log.py:12:5: FURB122 [*] Use of `file.write` in a for loop
order.py:19:16: B008 Do not perform function call `shout` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
order.py:31:13: F823 Local variable `total` referenced before assignment
sharing.py:11:5: F841 Local variable `row` is assigned to but never used
show_rule.py:4:9: SIM103 Return the condition `bool(is_error)` directly
Found 10 errors.
[*] 2 fixable with `--fix` (2 unsafe fixes available with `--fix --unsafe-fixes`).
```

(If you've added files of your own to `kit`, you'll see their findings too.) Each line is a file, a line and a column, a **rule code**, and a message. The letters say which family of rules found it: `F` is Pyflakes (likely errors), `B` bugbear (likely bugs), `SIM` simplifications, `UP` modernisations, `PLW` Pylint warnings, `FURB` refurbishments. `ruff rule F823` explains any rule in full. Ruff exits with status 1 when it finds anything, so a script can tell (01-06-02).

```check
run "cd kit; .venv/Scripts/ruff --version" stdout="ruff 0.17.5" -- Install Ruff 0.17.5 into kit's virtual environment with pip.
run "cd kit; .venv/Scripts/ruff check --output-format concise order.py sharing.py show_rule.py" exit=1 stdout="F823 Local variable `total` referenced before assignment" -- ruff check should find the deliberate mistakes in the lesson files.
```

## What the findings mean

Read them with the course behind you. Several are old friends:

- **`order.py`, `F823`:** "local variable `total` referenced before assignment". That's 01-05-01's `UnboundLocalError`. Ruff found it without running the program, from the rule that a name assigned anywhere in a function is local everywhere in it.
- **`order.py`, `B008`:** a function call in a default value. That's the default evaluated once, when `def` runs (01-05-01). With a list as the default, bugbear has a sharper rule, `B006`, which flags 01-05-01's `rest=[]` trap.
- **`sharing.py`, `F841`:** "`row` is assigned to but never used". That's `replace` from 01-04-01, which assigned to its parameter and so changed nothing. The linter's message is the lesson's point, in one line.
- **`show_rule.py`, `SIM103`:** an `if` that returns `True` or `False` could return the condition itself. That's 01-02-02's nested form, kept to be flattened.

Each of these lesson files makes its mistake on purpose. The rest are about Kit's real code, and they're of three kinds:

| Kind | Findings here | What to do |
|---|---|---|
| Likely bugs | `F823`, `F841`, `B006`-style | Almost always fix |
| Risky patterns: correct today, fragile tomorrow | `SIM115`: `filter.py` opens its `--output` file without `with`, so the file isn't closed if anything goes wrong before the end. `PLW1510`: `subprocess.run` ignores the child's failure unless told not to | Fix, or record why not |
| Style and modernisation | `SIM102`, `UP012`, `FURB122` | Follow, for consistency, or switch the rule off for the project |

A linter is **static analysis**: it reasons about the text of the code, never its values. That makes it fast, and able to look at code no test runs. It also means it can be wrong in both directions. It can flag something that's fine (a **false positive**, as every lesson file here is) and miss a bug it can't see, such as 01-06-03's unescaped dot, which is a perfectly valid regex. A finding is evidence to weigh, like a check's result, not a verdict.

```predict
question: The linter flags filter.py line 80, out = open(output, "wb"), with SIM115 "Use a context manager for opening files". The program works and the tests pass. What can actually go wrong?
choice: Nothing: Python closes files when the program ends
choice: If an error happens before out.close(), the file isn't closed and buffered lines may never be written
choice: The file is opened twice
answer: If an error happens before out.close(), the file isn't closed and buffered lines may never be written
explain: The close is the last line of main. If anything raises an error between the open and the close, such as a line Python can't read, the close is skipped as the error unwinds the stack (01-05-02). Python does usually close files at exit, but with an error in flight it's not guaranteed when, or whether, the last buffered writes reach the disk. A with block closes the file however the block is left, which is what finally guarantees (01-05-02).
```

```check
run "cd kit; .venv/Scripts/ruff check --output-format concise filter.py" exit=1 stdout="SIM115" -- The linter finds the file filter.py opens without with.
```

## Fix what matters

Fix the two findings in `filter.py`. The `--output` file gets a `with` block, so that it's closed however the program ends. To keep one `with` for each file, a small new function, `filter_file`, opens the input (or uses standard input) and filters it into whichever output it's given. And `SIM102`'s nested `if` becomes one condition with `and`.

```python file=kit/filter.py
import itertools
import re
import sys

from kitargs import take_option


# The query: a line matches when it contains every --all term,
# at least one --any term (if any were given), and no --none term.
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
        if matches(line, all_terms, any_terms, none_terms) and (regex is None or regex.search(line)):
            out.write(line)


# Filter the file called name, or standard input for "-", into out.
def filter_file(name, out, groups, regex):
    if name == "-":
        filter_lines(sys.stdin.buffer, out, groups["--all"], groups["--any"], groups["--none"], regex)
    else:
        with open(name, "rb") as file:
            filter_lines(file, out, groups["--all"], groups["--any"], groups["--none"], regex)


def main():
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

    if output is None:
        filter_file(args[0], sys.stdout.buffer, groups, regex)
    else:
        with open(output, "wb") as out:
            filter_file(args[0], out, groups, regex)


if __name__ == "__main__":
    main()
```

Save it, and ask Ruff about this one file: `.venv/bin/ruff check filter.py` prints `All checks passed!`. Then make sure nothing else changed, with the checks Kit already has: `.venv/bin/python check_filter.py` still prints `4096 cases, 0 differences`, and `filter.py samples/hello.txt --all h --output notes/h.txt` still writes `68 c3 a9 6c 6c 6f 0a`.

```check
run "cd kit; .venv/Scripts/ruff check filter.py" stdout="All checks passed!" -- Open the output file in a with block, and join the nested if into one condition.
run "cd kit; .venv/Scripts/python check_filter.py" stdout="4096 cases, 0 differences" -- filter's matching should be unchanged.
run "cd kit; .venv/Scripts/python filter.py samples/hello.txt --all h --output notes/h.txt; .venv/Scripts/python hexdump.py notes/h.txt" stdout="68 c3 a9 6c 6c 6f 0a" -- --output should still write the exact bytes.
run "cd kit; .venv/Scripts/python filter.py samples/server.log --regex ERROR --all 192" stdout="192.168.1.40 failed" -- --regex should still combine with words.
```

## Say what you meant

The lesson files' findings are deliberate: `order.py` *must* keep its `UnboundLocalError`, or it can't show one. Silencing a rule is fine. Silencing it without saying why is how real warnings get lost among ignored ones. Two ways to say what you meant:

- A comment on the line itself: `total = total + 1  # noqa: F823` ("no quality assurance" for that rule, on that line). Good for one line.
- The project's configuration. Ruff reads `pyproject.toml`, the standard file for a Python project's settings, which 01-06-05 will use for packaging too. Its `[tool.ruff.lint.per-file-ignores]` table lists, for each file, the rules not to apply there. It's written in **TOML**, a simple settings format: `name = value`, and `[section]` headers.

Each ignore gets a comment saying why, so that the next reader knows it's deliberate:

```toml file=kit/pyproject.toml
# Settings for Ruff, Kit's linter and formatter: https://docs.astral.sh/ruff/

[tool.ruff.lint.per-file-ignores]
# Lesson files that show a mistake on purpose, so the mistake must stay.
"order.py" = ["B008", "F823"]  # 01-05-01: a default evaluated once; UnboundLocalError
"sharing.py" = ["F841"]  # 01-04-01: assigning to a parameter changes nothing outside
"show_rule.py" = ["SIM103"]  # 01-02-02: the nested form, before it was flattened
```

Save it and run `.venv/bin/ruff check --output-format concise .` again. Six findings are gone: the three lesson files are quiet, and `filter.py` is fixed. Four remain, in `compare_levels.py`, `env_demo.py` and `make_server_log.py`. Those are yours.

```check
run "cd kit; .venv/Scripts/ruff check order.py sharing.py show_rule.py" stdout="All checks passed!" -- pyproject.toml should tell Ruff which rules each lesson file breaks on purpose.
contains kit/pyproject.toml "[tool.ruff.lint.per-file-ignores]" -- The ignores belong in pyproject.toml's per-file-ignores table.
```

## Formatting, and proving nothing changed

A formatter decides layout: line lengths, spaces, quotes, where long expressions break. `ruff format --check .` reports what it would change without changing anything: `16 files would be reformatted, 34 files already formatted`. `--diff` shows how. The densest one is 01-04-05's `dense.py`:

```
.venv/bin/ruff format --diff dense.py
```

The diff marks the old line with `-` and each new line with `+`. Here are the new lines, without the marks:

```
     return [
         w
         for w, _ in sorted(
             Counter(
                 w.lower() for line in lines for w in line.split() if w.isalpha()
             ).items(),
             key=lambda p: (-p[1], p[0]),
         )[:n]
     ]
```

The one long line has become ten, broken where the structure breaks. It's the expansion 01-04-05 did by hand, though only of the layout. A formatter changes how code looks, never what it does. But "never" is a claim, and Kit has a way to test claims. Format it, `.venv/bin/ruff format dense.py`, then run the check that compares it with the plain version, `.venv/bin/python check_top.py`: `780 cases, 0 differences`.

**Running all the checks.** Kit has six `check_*.py` scripts by now, each a test in all but name, and each exits with status 0 when everything passes (01-01-04 made `check_counts.py` exit 1 on failure). One command runs them all, and prints each one's status:

| Shell | Command |
|---|---|
| PowerShell | `Get-ChildItem check_*.py \| ForEach-Object { .venv\Scripts\python $_.Name; $_.Name + " exited " + $LASTEXITCODE }` |
| bash or zsh | `for f in check_*.py; do .venv/bin/python "$f"; echo "$f exited $?"; done` |

Every line should end `exited 0`. Run it after any change: after formatting, after a fix, after anything a tool did to your code. (`pytest`, in module 1.9, does this properly, and 01-06-06 turns it into a script.) Whether to format the whole of Kit is a choice: it's a single command, `ruff format .`, and it makes every later diff smaller; but this course's later lessons show each file as it was written. Format the files you're about to change, and run the checks.

```check
run "cd kit; .venv/Scripts/ruff format --check dense.py" stdout="1 file already formatted" -- Format dense.py with ruff format.
run "cd kit; .venv/Scripts/python check_top.py" stdout="780 cases, 0 differences" -- Formatting changes the layout only: dense.py still agrees with the plain version.
```

## Editors and language servers

A linter run from the command line reports on the code as it is. An editor can do the same while you type, along with much more, through a **language server**: a program that understands one language, which the editor runs in the background and asks questions: what's this name's type, where is it defined, what does it accept, is anything wrong here? The answers become the red underlines, the hover boxes, "go to definition", rename-everywhere and completion lists. One protocol, the Language Server Protocol, lets any editor use any language's server: Pylance or Pyright for Python, the TypeScript server for JavaScript, rust-analyzer for Rust. Editors can also run Ruff as you type, and format on save.

This app's editor is deliberately simple: no language server, no formatting on save. That's why this course asks you to run each tool yourself, and see what it does. In a full editor, the same tools run without being asked.

**What else, and why not.**

| Way | Cost |
|---|---|
| Ruff, as here | One fast tool for lint and format, with hundreds of rules; new rules arrive with each release, so pin the version |
| flake8 (with plugins such as bugbear), pylint | The older standard linters; slower, several tools to configure; pylint checks more deeply and complains more |
| black | The formatter Ruff's formatter copies; one job, done the same way everywhere |
| A type checker (mypy, Pyright) | Finds a different class of bug, a value of the wrong type, using type annotations; module 3.1 and TypeScript later |
| No tools, careful review | Free; people are slow and inconsistent at exactly what tools do well, and good at what tools can't do: judging intent |

## Your turn: a clean report

Make `ruff check .` report nothing for the whole of Kit. Four findings are left, in `compare_levels.py`, `env_demo.py` and `make_server_log.py`. For each one, decide whether to change the code or record an exception in `pyproject.toml` with a reason, and do it. Whatever you decide, each script must behave exactly as before: `compare_levels.py` still finds 0 differences, `env_demo.py` still shows the parent's value unchanged, and `make_server_log.py` still writes the same log, byte for byte.

`ruff rule CODE` explains a rule, including what to write instead. Two notes: `str.encode()` with no argument encodes as UTF-8; and `subprocess.run(…, check=True)` raises an error if the child process fails, while `check=False` says you've decided not to care.

```hints
nudge: Run ruff rule PLW1510 and ruff rule FURB122 and read them. For each of the four, ask: is the linter right that this could be clearer or safer here? Then ask what would prove your change kept the behaviour.
concept: All four are easy to fix in the code, and fixing is better than ignoring when the fix is clear. UP012: .encode() means the same as .encode("utf-8"). PLW1510: decide per call. In compare_levels.py the child's failure is part of what's being compared (a crash gives different output), so say check=False on purpose; in env_demo.py the child should never fail, so check=True turns a failure into an error instead of a silent wrong demo. FURB122: file.writelines(…) writes every string in one call. Prove it with the scripts' own output, and for the log, by comparing the file before and after (count.py, or hexdump.py).
shape: compare_levels.py: "café: ok\nerror: é\n".encode() and subprocess.run([...], capture_output=True, text=True, check=False). env_demo.py: subprocess.run([sys.executable, "-c", child], check=True). make_server_log.py: file.writelines(line + "\n" for line in LINES). Then .venv/bin/ruff check . and the checks.
answer: compare_levels.py, the accents case and the call:
~~~python
    "accents.log": "café: ok\nerror: é\n".encode(),
~~~
~~~python
    result = subprocess.run([sys.executable, program, path], capture_output=True, text=True, check=False)
~~~
env_demo.py:
~~~python
subprocess.run([sys.executable, "-c", child], check=True)
~~~
make_server_log.py, the loop:
~~~python
with open("samples/server.log", "w", encoding="utf-8", newline="\n") as file:
    file.writelines(line + "\n" for line in LINES)
~~~
Ignoring them in pyproject.toml would also pass the checks, with a reason for each: a reasonable choice for PLW1510 in throwaway scripts, but a weaker one where the fix is one argument. check=True in compare_levels.py would be the tempting slip: a child that exits with an error would then stop the comparison instead of being compared, which is exactly the case the comparison exists to catch.
```

```check
run "cd kit; .venv/Scripts/ruff check ." stdout="All checks passed!" -- ruff check . should report nothing for the whole of kit.
run "cd kit; .venv/Scripts/python compare_levels.py" stdout="7 inputs, 0 differences" -- compare_levels.py should still compare all seven inputs.
run "cd kit; .venv/Scripts/python env_demo.py" stdout="parent still has: set by the parent" -- env_demo.py should behave as before.
run "cd kit; .venv/Scripts/python make_server_log.py; .venv/Scripts/python count.py samples/server.log" stdout="bytes: 419" -- make_server_log.py should still write the same 419-byte log.
run "cd kit; .venv/Scripts/python make_server_log.py; .venv/Scripts/python hexdump.py samples/server.log" stdout="000001a0  2e 33 0a" -- and end it exactly as before.
```

**What these checks establish, and what they don't.** They run `ruff check .` on the whole of Kit, and check each script's behaviour by its output: the comparison's line, the environment demo's last line, the log's size and last bytes. They don't check *how* you made the report clean: an ignore with no reason, or a `# noqa` on every line, would pass too. Read your `pyproject.toml` and ask whether each entry would make sense to someone who's never seen this course. And a clean report means only that these 400 rules found nothing; run the checks loop as well.

## What you can do now

- A **linter** reads code without running it (static analysis) and reports patterns: likely bugs (`F823`, `F841`), risky code (`SIM115`, `B006`), style. It can be wrong both ways, so weigh each finding.
- Fix what matters; record a deliberate exception where it lives (`# noqa: CODE`, or `pyproject.toml`'s `per-file-ignores`), always with the reason.
- A **formatter** changes layout, never behaviour, and running the project's checks afterwards is how you know.
- Pin a tool's version (`pip install ruff==0.17.5`), so its report doesn't change under you.
- Run every check from one command, and read each exit status. A **language server** brings the same knowledge into the editor as you type.

```predict
question: A team turns on a linter for an old project and it reports 3,000 findings. Someone proposes adding every one of them to the ignore list so that the build passes, and fixing them "later". What's wrong with that, and what's a better plan?
explain: Ignoring all of them hides the few real bugs among the style notes, and "later" never comes; worse, new code gets the same blanket exemption, so the linter catches nothing from then on. Better: fix the likely-bug rules first (they're usually few), switch off style rules the team doesn't want, run the formatter once in its own commit, and make the linter apply in full to new and changed code (most linters can compare against a recorded baseline), so the count can only go down.
```

**Next:** 01-06-05 is about packages and environments: what `pip install` actually did, where Ruff went, and why each project has its own `.venv`. Kit becomes a package you can install, so that its tools run as commands from any folder, and Blockfall gets a local development server.
