---
title: Text Tools: Searching with Regular Expressions
runtime: python
---

`filter.py` finds lines that contain words: every line with `error`, without `debug`. But many questions about text aren't about words. Which lines mention an IP address? Which requests took over a second? Which lines start with a date in a given minute? There's no word to search for in any of them, only a *shape*: four numbers with dots between them, a number followed by `ms`. Programmers describe shapes of text with **regular expressions**, a small pattern language that almost every editor, language and command line tool understands, from `grep` (1973) to the search box in your editor. This lesson teaches the part of it you'll use every week, gives Kit's `filter` a `--regex` option, plants the regex mistake everyone makes once, and maps the classic Unix text tools onto what you have on any system.

**By the end you can:**

- Read and write practical regular expressions: literals, `.`, character classes, `\d` `\w` `\s`, anchors, quantifiers, groups and alternation, and escaping.
- Use Python's `re` module to search, find all matches and substitute, and say why patterns go in raw strings.
- Spot a pattern that matches more than you meant, prove it with a counterexample, and fix it.
- Say what `grep`, `find`, `sed` and `awk` do, and do the same jobs in PowerShell and in Python.
- Decide when a regular expression is the wrong tool, and finish the job in code.

**You need:** module 1.2's `filter.py` and 01-06-02's `--output`; 01-06-01 and 01-06-02 (the shell, quoting, pipes). Commands run inside `kit`.

## Searches that words can't say

This script writes a server's log: seven lines with dates, times, levels, addresses and version numbers.

```python file=kit/make_server_log.py
# A server's log: dates and times, levels, addresses and version numbers.
LINES = [
    "2026-11-14 09:00:01 INFO server 1.4.2 started on 10.0.0.12",
    "2026-11-14 09:00:07 WARN slow request /api/items took 1250 ms",
    "2026-11-14 09:01:15 ERROR request from 192.168.1.40 failed: timeout",
    "2026-11-14 09:01:16 INFO retry 1 of 3 for 192.168.1.40",
    "2026-11-14 09:02:30 ERROR disk /var/data 97% full",
    "2026-11-14 09:03:00 INFO config 1x4x2 loaded from 999.1.2.3",
    "2026-11-14 09:04:12 info client 10.0.0.12 sent version 2.0.1.7.3",
]
with open("samples/server.log", "w", encoding="utf-8", newline="\n") as file:
    for line in LINES:
        file.write(line + "\n")
print("wrote samples/server.log,", len(LINES), "lines")
```

Save it and run `.venv/bin/python make_server_log.py` (Windows: `.venv\Scripts\python make_server_log.py`). It prints `wrote samples/server.log, 7 lines`. Open `samples/server.log` and look at it.

Now try to ask `filter.py` for the lines that mention an IP address, such as `10.0.0.12`. `--all .` matches every line with a dot. `--any 10 192` matches the addresses that start that way, and misses any that don't, and also matches `1250 ms`. No set of words means "four numbers separated by dots". That's a shape, and it needs a pattern.

```check
run "cd kit; .venv/Scripts/python make_server_log.py" stdout="wrote samples/server.log, 7 lines" -- make_server_log.py should write the seven-line log.
```

## A pattern language

A **regular expression** (regex, for short) is a pattern that a piece of text either matches or doesn't. Most characters match themselves: the pattern `ERROR` matches the text `ERROR`. A few characters are special, and they give the language its power:

| Pattern | Matches |
|---|---|
| `.` | Any one character (except a newline) |
| `[abc]`, `[0-9]`, `[A-Z]` | One character from the set; `-` gives a range |
| `[^0-9]` | One character *not* in the set |
| `\d`, `\w`, `\s` | A digit; a "word" character (letter, digit or `_`); a space, tab or newline |
| `\S`, `\D`, `\W` | The opposites: anything that isn't a space, a digit, a word character |
| `x*`, `x+`, `x?` | `x` zero or more times; one or more times; zero or one time |
| `x{4}`, `x{4,5}` | `x` exactly 4 times; 4 or 5 times |
| `^`, `$` | The start and the end of a line (in multi-line mode) |
| `\b` | A word boundary: between a word character and anything else |
| `(…)`, `a\|b` | A group; one alternative or the other |
| `\.`, `\[`, `\\` | A special character, matched as itself: a backslash takes its power away |

Python's `re` module runs them. `re.findall(pattern, text)` returns every piece of `text` that matches. `re.MULTILINE` makes `^` and `$` match at the start and end of each line, not just of the whole text. And each pattern is written as a **raw string**, `r"…"`: in an ordinary Python string `"\d"` is fine but `"\b"` is a backspace character (Python's own escape), so the regex would never see the backslash. In a raw string, backslashes are just backslashes.

```python file=kit/patterns.py
import re

# Each pattern, and every piece of text in the log that it matches.
PATTERNS = [
    r"ERROR",
    r"\d",
    r"\d+",
    r"\d\d:\d\d:\d\d",
    r"[A-Z]{4,5}",
    r"^2026-11-14 09:0[12]",
    r"ms$",
    r"from \S+",
]

with open("samples/server.log", encoding="utf-8") as file:
    text = file.read()

for pattern in PATTERNS:
    found = re.findall(pattern, text, re.MULTILINE)
    print(pattern.ljust(22), len(found), found[:4])
```

```predict
question: How many matches will \d\d:\d\d:\d\d find in the log? It's two digits, a colon, two digits, a colon, two digits.
answer: 7
explain: Every line starts with a date and a time, and the time is the only place with that shape: 09:00:01, 09:00:07 and so on, one per line. The date doesn't match, because it uses dashes. A pattern describes a shape exactly, which is both its strength and, as the next steps show, its danger.
verify: cd kit; .venv/Scripts/python -c "import re; print(len(re.findall(r'\d\d:\d\d:\d\d', open('samples/server.log').read())))"
```

Save it and run `.venv/bin/python patterns.py`:

```
ERROR                  2 ['ERROR', 'ERROR']
\d                     153 ['2', '0', '2', '6']
\d+                    77 ['2026', '11', '14', '09']
\d\d:\d\d:\d\d         7 ['09:00:01', '09:00:07', '09:01:15', '09:01:16']
[A-Z]{4,5}             6 ['INFO', 'WARN', 'ERROR', 'INFO']
^2026-11-14 09:0[12]   3 ['2026-11-14 09:01', '2026-11-14 09:01', '2026-11-14 09:02']
ms$                    1 ['ms']
from \S+               2 ['from 192.168.1.40', 'from 999.1.2.3']
```

Read each line against the table. `\d` finds single digits, 153 of them; `\d+` finds runs of digits, so `2026` is one match, not four. `[A-Z]{4,5}` finds the levels, but only 6 of the 7: the last line says `info` in small letters, and a pattern is exact about case. `^2026-11-14 09:0[12]` finds the lines from 09:01 and 09:02, anchored at the start of the line. `ms$` finds `ms` only at the end of a line. `from \S+` takes everything up to the next space.

A quantifier takes as much as it can: `\d+` takes all of `2026`, not just `2`. That's called **greedy**. Add `?` to take as little as possible instead (`\d+?` takes one digit), which matters with `.*`, which would otherwise run to the end of the line.

```check
run "cd kit; .venv/Scripts/python patterns.py" stdout="7 ['09:00:01'" -- The time pattern should match once per line.
run "cd kit; .venv/Scripts/python patterns.py" stdout="from \S+               2" -- from \S+ takes everything up to the next space.
```

## filter learns patterns

Give `filter.py` a `--regex PATTERN` option: a line must then also contain a match for the pattern, as well as satisfying any `--all`, `--any` and `--none` terms. Four details:

- `filter` works on bytes (01-02-01), so the pattern is compiled from bytes too: `re.compile(pattern.encode("utf-8"))`. `re.compile` turns a pattern into a regex object once, so that each line doesn't parse it again, and `regex.search(line)` looks for a match anywhere in the line.
- `take_option` (01-06-02) takes `--regex` and its pattern out of the arguments before the query groups are read.
- A pattern can be malformed: `[` opens a set that never closes. `re.compile` then raises `re.error`, and `filter` should say so, not crash.
- `can_match_fast` (01-02-04) proves whether a query of *words* can match any line. It can't reason about patterns, so it checks the words only; a pattern that can never match, such as `a^b`, still gets through.

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
        if matches(line, all_terms, any_terms, none_terms):
            if regex is None or regex.search(line):
                out.write(line)


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

    out = sys.stdout.buffer
    if output is not None:
        out = open(output, "wb")
    if args[0] == "-":
        filter_lines(sys.stdin.buffer, out, groups["--all"], groups["--any"], groups["--none"], regex)
    else:
        with open(args[0], "rb") as file:
            filter_lines(file, out, groups["--all"], groups["--any"], groups["--none"], regex)
    if output is not None:
        out.close()


if __name__ == "__main__":
    main()
```

Save it, and ask for lines with an address. The pattern is four runs of digits with an escaped dot between each. Use single quotes around a pattern, in PowerShell and in Unix shells alike: inside single quotes, no shell does anything to a backslash or a `$`.

```
.venv/bin/python filter.py samples/server.log --regex '\d+\.\d+\.\d+\.\d+'
```

Five lines. Four of them are right. The sixth line's match is `999.1.2.3`, which looks like an address but can't be one, since an address's parts go up to 255. And the last line matched twice over, at `10.0.0.12` and inside the version `2.0.1.7.3`. A regex describes the *shape* of the text. It doesn't know what the text means. You'll deal with both in the task.

```check
run "cd kit; .venv/Scripts/python filter.py samples/server.log --regex '\d+\.\d+\.\d+\.\d+' --output notes/ips.log; .venv/Scripts/python count.py notes/ips.log" stdout="lines: 5" -- --regex should keep only lines with a match: five lines have four dotted numbers.
run "cd kit; .venv/Scripts/python filter.py samples/server.log --regex ERROR --all 192" stdout="192.168.1.40 failed" -- A pattern and words can be combined: the line must satisfy both.
run "cd kit; .venv/Scripts/python filter.py samples/server.log --regex '['" exit=1 stderr="bad --regex" -- A malformed pattern should be reported, not crash filter.
run "cd kit; .venv/Scripts/python check_filter.py" stdout="4096 cases, 0 differences" -- Matching by words should be unchanged.
```

## A dot that matches anything

Which lines mention version 1.4.2 of the server? The obvious search:

```
.venv/bin/python filter.py samples/server.log --regex '1.4.2'
```

```predict
question: How many lines will --regex '1.4.2' match?
choice: 1: the line that says server 1.4.2
choice: 2
choice: 0: a regex needs backslashes
answer: 2
explain: In a regex, . isn't a dot: it's any character. So 1.4.2 means "1, any character, 4, any character, 2", and the line with config 1x4x2 matches as well. The search looked right because the right line was in the results; it was wrong because another one was too.
```

It prints two lines: the server's start-up, and `config 1x4x2 loaded from 999.1.2.3`. The second line's `1x4x2` matched, because `.` matches the `x`. This is the most common regex mistake there is, and it's easy to miss, because the result *includes* the line you wanted. The way to catch it is to look for a **counterexample**, a line that matches but shouldn't, as 01-01-03 taught for definitions. Whenever you write a pattern, ask what else has the same shape.

Escape the dots, `\.`, so that each one matches only a dot:

```
.venv/bin/python filter.py samples/server.log --regex '1\.4\.2'
```

One line. Then ask the follow-up question: what else could still match? `21.4.25` contains `1.4.2`. If that matters, say where the version must begin and end: `\b1\.4\.2\b` uses word boundaries, so that the match can't be part of a longer number. (Here it wouldn't stop `1.4.2.9`, since a dot is a boundary; patterns get exact only as far as you push them.)

```check
run "cd kit; .venv/Scripts/python filter.py samples/server.log --regex '1.4.2'" stdout="1x4x2" -- An unescaped dot matches any character, so 1x4x2 matches 1.4.2.
run "cd kit; .venv/Scripts/python filter.py samples/server.log --regex '1\.4\.2'" stdout="server 1.4.2 started" without="1x4x2" -- With the dots escaped, only the real version matches.
```

## The classic tools

On macOS and Linux, four old programs do most text work at the command line, and you'll meet them in every tutorial, script and Stack Overflow answer. Windows doesn't include them, but Git for Windows does: they work in **Git Bash**. PowerShell has its own commands for the same jobs, and Python can do all of them.

| Job | Unix tool | PowerShell | Python |
|---|---|---|---|
| Lines matching a pattern | `grep -E '1\.4\.2' server.log` (`-i` ignores case, `-c` counts, `-v` inverts) | `Select-String -Path server.log -Pattern '1\.4\.2'` (ignores case unless `-CaseSensitive`) | `filter.py --regex`, or `re.search` in a loop |
| Files by name, anywhere below a folder | `find . -name '*.log'` | `Get-ChildItem -Recurse -Filter *.log` | `os.walk`, or `pathlib.Path('.').rglob('*.log')` |
| Replace text (stream editor) | `sed -E 's/(\d+)-…/…/'` (with `[0-9]` for `\d`) | `(Get-Content f) -replace 'pattern', 'replacement'` | `re.sub(pattern, replacement, text)` |
| Pick columns, count, add up | `awk '{print $3}' server.log` (the third space-separated field) | `(Get-Content f) \| ForEach-Object { ($_ -split ' ')[2] }` | `line.split()[2]` |

Some measured details. `Select-String … -Pattern 'error'` finds both `ERROR` lines, because PowerShell ignores case by default, and `grep error` finds none, because grep doesn't. `Select-String` prints each match as `samples\server.log:1:…`, the file and the line number first. A replacement can use the groups the pattern captured: `(\d+)-(\d+)-(\d+)` replaced by `\3/\2/\1` in Python and sed, or by `$3/$2/$1` in PowerShell, turns `2026-11-14` into `14/11/2026`. And in Git Bash, `awk '{print $3}' samples/server.log | sort | uniq -c` counts the levels: `2 ERROR`, `3 INFO`, `1 WARN`, `1 info`. That's a pipeline of three tools, each doing one job, as 01-06-02 showed. Patterns also come in dialects: `grep` without `-E`, and older `sed`, use "basic" regular expressions, where `+` and `(` need backslashes. When a pattern from one tool fails in another, the dialect is the first thing to check.

**What else, and why not.**

| Way | Cost |
|---|---|
| A regular expression | Short, and understood everywhere; easy to make too loose (`.`) or unreadable when long. It matches shapes, not meanings |
| Plain words, as `--all` and `--any` do | Can't be wrong in the ways a regex can, and can be reasoned about (01-02-04 proved queries satisfiable); can't express shapes |
| Parsing the text properly (split into fields, convert to numbers) | Knows what the text means, and can check that a part is at most 255; more code |
| A parser for the format, such as `json` or `csv` (01-07-02) | The only right way for structured formats: regexes can't handle nesting or quoting reliably |

## Your turn: real addresses

Write `ips.py FILE`, which prints every IPv4 address in a text file, one per line, each address once, in the order they first appear. An IPv4 address is exactly four whole numbers from 0 to 255 joined by dots, standing alone. So in `samples/server.log`, `999.1.2.3` isn't one (999 is too big), `1.4.2` isn't (three parts), and `2.0.1.7.3` isn't, and doesn't contain one, since it has five parts.

Use a regular expression to find the candidates, and code to decide which of them are addresses. Put the deciding in a function `is_ipv4(text)` and the finding in `addresses(text)`, which returns the list, so the checks can call them. `(?:…)` is a group that doesn't capture: `re.findall` returns whole matches when a pattern has no capturing group, and only the group's part when it has one.

```hints
nudge: Try writing one regex that accepts 255 but not 256, and see how long it gets. Then split the job: what shape do all the candidates share, and what's left to decide about each one?
concept: Find every run of digits separated by dots that stands alone, with \b at each end: \b\d+(?:\.\d+)+\b. That finds 1.4.2, 999.1.2.3 and 2.0.1.7.3 as whole runs, so a five-part version can't be mistaken for an address inside it. Then decide in code: split the run at the dots; it's an address if there are exactly four parts and each int(part) is at most 255. Keep a list of the ones found, and add each address only if it isn't there yet, to keep the first-seen order.
shape: DOTTED = re.compile(r"\b\d+(?:\.\d+)+\b"). is_ipv4(dotted): parts = dotted.split("."); False unless len(parts) == 4; False if any int(part) > 255; else True. addresses(text): found = []; for dotted in DOTTED.findall(text): if is_ipv4(dotted) and dotted not in found: found.append(dotted); return found. main reads the file named in sys.argv[1] and prints each address.
answer: ips.py:
~~~python
import re
import sys

# A run of digits separated by dots, such as 10.0.0.12 or 1.4.2, standing alone.
DOTTED = re.compile(r"\b\d+(?:\.\d+)+\b")


# Is this dotted run an IPv4 address: exactly four parts, each from 0 to 255?
# A regex can find the runs; deciding "at most 255" is easier in code.
def is_ipv4(dotted):
    parts = dotted.split(".")
    if len(parts) != 4:
        return False
    for part in parts:
        if int(part) > 255:
            return False
    return True


# Every IPv4 address in the text, each once, in the order they first appear.
def addresses(text):
    found = []
    for dotted in DOTTED.findall(text):
        if is_ipv4(dotted) and dotted not in found:
            found.append(dotted)
    return found


def main():
    path = sys.argv[1]
    with open(path, encoding="utf-8") as file:
        for address in addresses(file.read()):
            print(address)


if __name__ == "__main__":
    main()
~~~
The tempting slips: \d+\.\d+\.\d+\.\d+ as the whole answer, which accepts 999.1.2.3 and finds 2.0.1.7 inside the five-part version; forgetting the duplicates, so 192.168.1.40 is printed twice; and (\.\d+)+ with a capturing group, which makes findall return only the last ".3"-style piece. A regex can say "at most 255" (25[0-5]|2[0-4]\d|1?\d?\d, four times), and real code often does, but it's hard to read and easy to get subtly wrong; finding with a pattern and deciding with code is the clearer split.
```

```check
run "cd kit; .venv/Scripts/python ips.py samples/server.log" stdout="10.0.0.12\n192.168.1.40" without="999.1.2.3" -- ips.py should print the two real addresses, once each, in order, and not 999.1.2.3.
run "cd kit; .venv/Scripts/python ips.py samples/server.log" without="2.0.1.7" -- A five-part version isn't an address and doesn't contain one.
run "cd kit; .venv/Scripts/python -c \"from ips import is_ipv4; print(is_ipv4('255.255.255.255'), is_ipv4('0.0.0.0'), is_ipv4('256.1.1.1'), is_ipv4('1.2.3'), is_ipv4('1.2.3.4.5'))\"" stdout="True True False False False" -- is_ipv4 should accept four parts from 0 to 255, and nothing else.
run "cd kit; .venv/Scripts/python -c \"from ips import addresses; print(addresses('a 1.2.3.4 b 5.6.7.8 c 1.2.3.4 d 1.4.2 e 300.1.1.1'))\"" stdout="['1.2.3.4', '5.6.7.8']" -- addresses should keep each address once, in the order first seen.
```

**What these checks establish, and what they don't.** They run `ips.py` on the server log and check what it prints and doesn't, and call `is_ipv4` and `addresses` on cases at the edges: 255 and 256, three parts and five. They don't try addresses with leading zeros (`010.0.0.1`: is that an address? Many programs say no, since some read a leading zero as octal, 01-03-01), or addresses glued to letters (`host10.0.0.1`: `\b` doesn't separate a letter from a digit, so it's missed), or IPv6 (`::1`), which is a different shape altogether. Pick one, decide what `ips.py` should do, and add a case for it.

## What you can do now

- A **regular expression** describes the shape of text. Most characters match themselves; `.`, `[…]`, `\d` `\w` `\s`, `*` `+` `?` `{n,m}`, `^` `$` `\b`, `(…)` and `|` are special, and a backslash makes a special character ordinary.
- In Python, write patterns as raw strings `r"…"`; `re.search` finds one match, `re.findall` all of them, `re.sub` replaces them; `re.compile` once, use many times. On the command line, put patterns in single quotes.
- The classic mistake is a pattern that matches too much: an unescaped `.`, a missing anchor, case. Look for a counterexample, a line that matches but shouldn't.
- `grep`, `find`, `sed` and `awk` search lines, find files, replace text and pick columns; PowerShell has `Select-String`, `Get-ChildItem -Recurse`, `-replace` and `-split`, and Python has all four jobs in `re`, `os` and `str`.
- A regex finds shapes; code decides meanings. Split the job when the rule is about values (at most 255) or structure (JSON, CSV).

```predict
question: A colleague validates email addresses with .+@.+ and says it's been fine for years. Give a counterexample it accepts that it shouldn't, and say whether a better regex is the right fix.
explain: It accepts "a@b", "@@@", "me@example.com and you@there.org" (the whole string, since .+ matches spaces) and "x@y@z". A stricter regex helps a little (no spaces, one @, a dot after it), but the real rules for addresses are notoriously complicated, and even a perfect pattern can't tell you that the address exists. The usual answer: a loose shape check to catch typing mistakes, then send a confirmation email. Some questions aren't about shapes at all.
```

**Next:** 01-06-04 looks at the tools around your code: editors, language servers, linters, formatters, and running tests from the command line. Kit gets checked by a linter for the first time, and the linter has opinions.
