---
title: Reading Unfamiliar Code
runtime: python
---

Most code you'll work with, you didn't write. A teammate wrote it, or a library's authors did, or an AI assistant produced it in a second. Before you can judge it, change it or trust it, you have to read it, and dense code resists reading: twelve lines can hide five decisions. This lesson gives you a short Python program, written the way experienced programmers often write, compactly and with no comments. Your job is not to rewrite it. It's to find out exactly what it does, including what it does on inputs its author never thought about. The method works on any code: find where it starts, follow one piece of data through it, expand the densest lines into steps you can check, and then prove your expanded version means the same thing.

**By the end you can:**

- Find a program's entry point and say what runs when, and what its inputs and outputs are.
- Follow one input through a program by hand with a trace table.
- Expand a dense expression (a generator inside a call, a `lambda` sort key, a nested format) into named steps, and say what each part does.
- Show that your expanded version behaves the same as the original, on ordinary and edge-case inputs, and list the assumptions the code makes.

**You need:** module 1.1 and 01-04-01 to 01-04-04, in particular names and objects, and the habit from 01-02-02 of proving two versions equal by checking every case. Everything runs in `kit` (`cd ../kit` if you're in `blockfall`). New pieces of Python are explained as the program uses them. Meeting features you haven't seen is part of reading someone else's code.

## A program you didn't write

Save this as `levels.py`, exactly as it is. Don't tidy it: the point is to read it as you found it.

```python file=kit/levels.py
import sys
from collections import Counter


def main(path):
    with open(path, encoding="utf-8") as f:
        c = Counter(l.split(":", 1)[0] for l in f if ":" in l)
    w = max(map(len, c), default=0)
    for k, n in sorted(c.items(), key=lambda kv: (-kv[1], kv[0])):
        print(f"{k:<{w}} {'#' * n} {n}")


if __name__ == "__main__":
    main(*sys.argv[1:2] or ["samples/app.log"])
```

Run it: `.venv/bin/python levels.py` (Windows: `.venv\Scripts\python levels.py`). It prints:

```
error   ## 2
info    ## 2
debug   # 1
warning # 1
```

That's `samples/app.log`, from 01-02-01, summarised: how many lines of each level, with a bar. So much you can tell from one run. But running a program tells you what it does on one input. It doesn't tell you what it does on the next one, or why. For that you read it.

```check
run "cd kit; .venv/Scripts/python levels.py" stdout="error   ## 2" -- Save levels.py exactly as given; run with no arguments, it summarises samples/app.log.
run "cd kit; .venv/Scripts/python levels.py" stdout="warning # 1" -- Each level gets a bar of # and its count.
```

## Where it starts

**Find the entry point first:** the code that runs when the program starts. In a Python file, everything at the top level runs on import, from top to bottom. Here that's two imports and a `def`, which only defines `main`. Then the `if __name__ == "__main__":` block runs `main`, only when the file is run as a program (01-01-02). So the story begins on the last line:

```
main(*sys.argv[1:2] or ["samples/app.log"])
```

Three pieces, from the inside out:

- `sys.argv[1:2]` is a slice of the command-line arguments: a list holding the first argument after the program's name, or an empty list if there isn't one. (A slice past the end of a list is just shorter; it never fails.)
- `X or Y`: you know `or` from module 1.2, but Python's `or` doesn't just give `True` or `False`. It gives back one of its operands: `X` if `X` is truthy, otherwise `Y`. An empty list is falsy, so this means "the argument list if there is one, otherwise `["samples/app.log"]`".
- `*` in front of a list, in a call, spreads its items out as separate arguments: `main(*["a.log"])` is `main("a.log")`.

So the line means: call `main` with the first argument, or with `"samples/app.log"` if there's none. Arguments after the first are ignored. One dense line, three decisions. Check the `or` claim:

```
.venv/bin/python -c "print([] or ['d'], ['x'] or ['d'], 0 or 5, 'a' or 'b')"
```

It prints `['d'] ['x'] 5 a`.

Next, **inputs and outputs**. `main` reads one file, opened in text mode with `encoding="utf-8"`: Python decodes the bytes for you, as UTF-8, and each line is a `str`, not `bytes`. It writes to standard output with `print`. Nothing else: no other files, no exit status set.

```predict
question: What does levels.py print for samples/hello.txt, the file holding "héllo" and a newline? Look at which lines the program counts.
choice: hello # 1
choice: héllo # 1
choice: Nothing at all
choice: An error
answer: Nothing at all
explain: The generator inside Counter(…) keeps only lines with a colon in them (if ":" in l), and héllo has none. With nothing counted, the loop over the counts runs zero times, so nothing is printed, and the program exits normally. No message says that the file had no levels: reading the code tells you that silence is an answer it can give.
```

Try it: `.venv/bin/python levels.py samples/hello.txt` prints nothing, and its exit status is 0.

```check
run "cd kit; .venv/Scripts/python -c \"print([] or ['d'], ['x'] or ['d'], 0 or 5, 'a' or 'b')\"" stdout="['d'] ['x'] 5 a" -- or gives back one of its operands: the first if it's truthy, else the second.
run "cd kit; .venv/Scripts/python levels.py samples/hello.txt" without="#" -- A file with no colons gives no output.
```

## Follow one line through

Now **follow the data**. Pick one input line and trace what happens to it. Take the fifth line of `app.log`, `error: retry failed, debug id 7`. The densest line in the program is

```
c = Counter(l.split(":", 1)[0] for l in f if ":" in l)
```

and it reads from the inside out:

1. `for l in f` loops over the file's lines.
2. `if ":" in l` keeps only lines that contain a colon. This one does.
3. `l.split(":", 1)` splits the line at the colon, but at most once (the `1`): `['error', ' retry failed, debug id 7']`. Without the `1`, a line with three colons would split into four pieces.
4. `[0]` takes the first piece, `'error'`: everything before the first colon. That's the line's level.
5. The `( … for … if … )` around them is a **generator expression** (01-02-02): it produces one level per kept line.
6. `Counter(…)` counts them. `Counter` comes from the standard library's `collections` module. It's a dictionary that maps each item it was given to how many times it appeared, and it answers 0 for an item it never saw, instead of failing.

Do the whole file as a trace table:

| Line | Has a colon? | `split(":", 1)[0]` | Counts after it |
|---|---|---|---|
| `info: start` | yes | `info` | info 1 |
| `error: disk full` | yes | `error` | info 1, error 1 |
| `debug: error counter reset` | yes | `debug` | + debug 1 |
| `warning: slow response` | yes | `warning` | + warning 1 |
| `error: retry failed, debug id 7` | yes | `error` | error 2 |
| `info: done` | yes | `info` | info 2 |

The third line mentions "error", and the fifth mentions "debug", but neither is counted under that word: only the text before the first colon is a level. That's the kind of detail a trace makes you notice, and a quick glance doesn't.

The next line, `w = max(map(len, c), default=0)`:

- Looping over a `Counter`, like any dictionary, gives its keys: the levels.
- `map(len, c)` applies `len` to each one: 4, 5, 5, 7.
- `max(…)` takes the largest, 7 (for `warning`): the width of the widest level. `default=0` is what `max` answers when there's nothing to compare. Without it, `max` of nothing fails with a `ValueError`. So the author thought about a file with no levels: `w` is 0 and the loop prints nothing.

```
.venv/bin/python -c "from collections import Counter; c = Counter(['b', 'a', 'b']); print(c, c['b'], c['zzz'], max(map(len, c), default=0), max(map(len, Counter()), default=0))"
```

It prints `Counter({'b': 2, 'a': 1}) 2 0 1 0`.

```check
run "cd kit; .venv/Scripts/python -c \"print('error: retry failed, debug id 7'.split(':', 1), 'a:b:c'.split(':', 1)[0], 'none'.split(':', 1)[0])\"" stdout="['error', ' retry failed, debug id 7'] a none" -- split(':', 1) splits at the first colon only; [0] is the part before it.
run "cd kit; .venv/Scripts/python -c \"from collections import Counter; c = Counter(['b', 'a', 'b']); print(c['b'], c['zzz'], max(map(len, c), default=0), max(map(len, Counter()), default=0))\"" stdout="2 0 1 0" -- Counter counts items and answers 0 for unseen ones; max(..., default=0) handles an empty Counter.
```

## Expand the dense lines

Two lines are left: the sort and the print.

```
for k, n in sorted(c.items(), key=lambda kv: (-kv[1], kv[0])):
    print(f"{k:<{w}} {'#' * n} {n}")
```

- `c.items()` gives (level, count) pairs: `('info', 2)`, `('error', 2)` and so on.
- `sorted(items, key=f)` sorts by what `f` returns for each item instead of by the item itself.
- `lambda kv: (-kv[1], kv[0])` is a **lambda**: a small function with no name, written in place. It means the same as a `def` that takes `kv` and returns `(-kv[1], kv[0])`. For `('info', 2)` it returns `(-2, 'info')`.
- Tuples compare item by item, the way words compare letter by letter: first by `-count`, so bigger counts (more negative) come first, and only on a tie by the level name, alphabetically. That's why `error` comes before `info`: both have 2, and `e` comes before `i`.
- `f"…"` is an **f-string**: text with expressions in `{…}` filled in. `{'#' * n}` is the bar: a string repeated `n` times. `{k:<{w}}` is `k` with a format spec, like 01-03-01's `format(value, "08x")`: `<` means left-aligned, padded with spaces to width `w`, and the inner `{w}` fills in the width. So every level is padded to the widest one's length, which lines the bars up.

Now **expand** the whole program: rewrite it in plain steps, each with a name, so that the logic is visible. The aim is not a better program. It's a version you can read at a glance, to check your understanding against. If the two ever differ, you misread something.

- `count_levels(path)` does the generator and the `Counter` with an ordinary loop. `counts.get(level, 0)` is a dictionary's "the value for this key, or 0 if there isn't one", so `counts[level] = counts.get(level, 0) + 1` counts. `continue` skips to the next line.
- `print_order(item)` is the lambda with a name, and says what the order *means*.
- The width is a loop with `max`, and the padding is `ljust` (01-03-01), which pads to a width just as `:<` does. `print` puts a single space between its arguments, as the f-string did.
- The last line becomes an `if`, which spells out what the `or` trick did.

```python file=kit/levels_plain.py
import sys

DEFAULT_LOG = "samples/app.log"


# How many lines of the log have each level: the text before the first colon.
# A line with no colon has no level and isn't counted.
def count_levels(path):
    counts = {}
    with open(path, encoding="utf-8") as file:
        for line in file:
            if ":" not in line:
                continue
            level = line.split(":", 1)[0]
            counts[level] = counts.get(level, 0) + 1
    return counts


# The order to print levels in: the most lines first, alphabetical on a tie.
def print_order(item):
    level, count = item
    return (-count, level)


def main(path):
    counts = count_levels(path)
    width = 0
    for level in counts:
        width = max(width, len(level))
    for level, count in sorted(counts.items(), key=print_order):
        bar = "#" * count
        print(level.ljust(width), bar, count)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        main(DEFAULT_LOG)
```

Save it and run `.venv/bin/python levels_plain.py`. It prints the same four lines as `levels.py`. Same output on one input, though, is not the same program.

```check
run "cd kit; .venv/Scripts/python levels_plain.py" stdout="error   ## 2" -- levels_plain.py should print what levels.py prints for app.log.
run "cd kit; .venv/Scripts/python -c \"import levels_plain, inspect; s = inspect.getsource(levels_plain); print('lambda' in s, 'Counter' in s, ('f' + chr(34)) in s)\"" stdout="False False False" -- The expanded version should use no lambda, Counter or f-string: plain, named steps.
```

## Prove the expansion

To claim the two programs are the same, run them on inputs chosen to probe the edges, and compare what they print, exactly. This script writes six small logs to a folder `cases`, runs both programs on each and on `app.log`, and reports any difference. Two new tools:

- `subprocess.run([…], capture_output=True, text=True)` runs another program, as you would at a terminal, and captures what it prints; `.stdout` is that text. `sys.executable` is the path of the Python that's running this script, your virtual environment's, so both programs run under the same Python.
- `os.makedirs("cases", exist_ok=True)` makes the folder, and doesn't mind if it already exists.

The cases are the edges a careful reading suggests: an empty file, a file with no colons, a tie, odd levels (capitals, leading spaces, a colon in a URL, a line that starts with a colon), a last line with no newline, and accented text. Type the `é` as it is; Python reads source files as UTF-8.

```python file=kit/compare_levels.py
import os
import subprocess
import sys

# Small logs that probe the edges. Each is written to cases/ before the run.
CASES = {
    "empty.log": b"",
    "no_colons.log": b"hello\nworld\n",
    "ties.log": b"b: 1\na: 2\nb: 3\na: 4\nc: 5\n",
    "odd_levels.log": b"Error: x\nerror: y\n  info: z\nsee http://example.com\n: nothing\n",
    "no_newline.log": b"info: last line",
    "accents.log": "café: ok\nerror: é\n".encode("utf-8"),
}


# What a program prints for one input file.
def output(program, path):
    result = subprocess.run([sys.executable, program, path], capture_output=True, text=True)
    return result.stdout


os.makedirs("cases", exist_ok=True)
paths = ["samples/app.log"]
for name, data in CASES.items():
    path = "cases/" + name
    with open(path, "wb") as file:
        file.write(data)
    paths.append(path)

differences = 0
for path in paths:
    dense = output("levels.py", path)
    plain = output("levels_plain.py", path)
    if dense != plain:
        differences += 1
        print("differ on", path)
        print("  levels.py:      ", repr(dense))
        print("  levels_plain.py:", repr(plain))
print(len(paths), "inputs,", differences, "differences")
```

Save it and run `.venv/bin/python compare_levels.py`: `7 inputs, 0 differences`.

A comparison is only evidence if it can fail. Make it fail: in `levels_plain.py`, change `print_order` to return `(count, level)`, forgetting the minus, as if you'd misread the lambda. Run the comparison again:

```
differ on samples/app.log
  levels.py:       'error   ## 2\ninfo    ## 2\ndebug   # 1\nwarning # 1\n'
  levels_plain.py: 'debug   # 1\nwarning # 1\nerror   ## 2\ninfo    ## 2\n'
differ on cases/ties.log
  levels.py:       'a ## 2\nb ## 2\nc # 1\n'
  levels_plain.py: 'c # 1\na ## 2\nb ## 2\n'
7 inputs, 2 differences
```

`repr` shows each output as one line with its newlines as `\n`, so you can compare them character by character. Read the evidence: the same lines, in a different order, with the counts going up instead of down. The difference points straight at the sort key. Put the minus back; the comparison returns to 0 differences.

```check
run "cd kit; .venv/Scripts/python compare_levels.py" stdout="7 inputs, 0 differences" -- The expanded program should print exactly what levels.py prints on all seven inputs.
```

## What the code assumes

Reading found more than what the program does on `app.log`. It found the assumptions built into it, and each is a question for whoever owns the program. Run `.venv/bin/python levels.py cases/odd_levels.log`:

```
         # 1
  info   # 1
Error    # 1
error    # 1
see http # 1
```

- **A level is whatever comes before the first colon.** `see http://example.com` has level `see http`. A line starting with `:` has the empty level, printed as a blank name. Nothing checks that a level is a word.
- **Levels are compared exactly.** `Error` and `error` are counted separately, and `  info` keeps its leading spaces. Should they be merged? The code doesn't say, and its author may never have decided.
- **A line with no colon is skipped silently.** A log with a corrupted line under-reports, and nothing tells you.
- **The file must be UTF-8.** `.venv/bin/python levels.py samples/latin1.txt` stops with `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe9 in position 1`: Latin-1's é, from 01-01-01, isn't valid UTF-8. `levels_plain.py` fails the same way, as it should, being the same program.

None of these is necessarily a bug. They're decisions, and reading is how you find decisions that nobody wrote down. That's what makes reading code a design skill and not just a debugging one.

```predict
question: Does the comparison script's 0 differences prove that levels.py and levels_plain.py behave the same on every possible log?
choice: Yes: seven inputs, including the edge cases, all matched
choice: No: it shows they agree on those seven inputs only
answer: No: it shows they agree on those seven inputs only
explain: It's evidence, chosen to cover the edges a reading suggested, and it would have caught many misreadings (it caught the missing minus). But it compares only standard output, on seven files. It doesn't compare error output, so the latin1.txt crash isn't covered, and it can't show that no other input differs. The reading and the comparison support each other; neither alone is proof. Add the Latin-1 file as an eighth case, comparing result.stderr too, if you want that edge covered.
```

```check
run "cd kit; .venv/Scripts/python levels.py cases/odd_levels.log" stdout="see http # 1" -- A level is everything before the first colon, URLs included.
run "cd kit; .venv/Scripts/python levels.py cases/odd_levels.log" stdout="Error    # 1" -- Levels are compared exactly: Error and error are different levels.
run "cd kit; .venv/Scripts/python levels.py samples/latin1.txt" exit=1 stderr="UnicodeDecodeError" -- The program assumes UTF-8, so a Latin-1 file stops it.
```

**What else, and why not.** Other ways to understand unfamiliar code, and what each costs:

| Way | Cost |
|---|---|
| Run it on inputs and watch | Fast, and true for the inputs you try; says nothing about the ones you don't, or why |
| Add prints, or step through it in a debugger (01-05-04) | Shows the real values; you still need a reading to know where to look |
| Read its tests, if it has any | Tell you what its author meant, at least for the cases they thought of; module 1.9 |
| Ask an AI assistant to explain it | Often a good first map, and quick; but the explanation can be confidently wrong in exactly the dense places. Treat it as a hypothesis, and check it by tracing and by comparison, as here |
| Read the history (`git log`, `git blame`, module 1.8) | Can tell you *why* a line is the way it is, which the code itself can't |

## Your turn: another dense function

Here's a different dense function. Save it as `dense.py`:

```
from collections import Counter


def top_words(lines, n):
    return [w for w, _ in sorted(Counter(w.lower() for line in lines for w in line.split() if w.isalpha()).items(), key=lambda p: (-p[1], p[0]))[:n]]
```

Two pieces are new: a generator with two `for`s, `for line in lines for w in line.split()`, loops over the words of every line in turn, like two nested loops; and `w.isalpha()` is `True` when `w` is made only of letters (`"B"` yes; `"x1"`, `"c,"` and `""` no). `_` is the usual name for a value that's deliberately unused.

1. Write `plain_top_words(lines, n)` in a new file, `plain.py`: the same function expanded into plain, named steps, with no `lambda`, no `Counter` and no list comprehension.
2. Write `check_top.py`, which compares the two on every list of 0 to 3 lines drawn (with repeats, in every order) from `SAMPLES = ["", "a b a", "B b", "x1 y", "c, c"]`, for each `n` from 0 to 4, and prints the first few differences and then a line in the form `780 cases, 0 differences`. `itertools.product(SAMPLES, repeat=k)` gives every sequence of `k` items drawn from `SAMPLES`.

Before you write anything, trace `top_words(["The cat", "the dog, the end", "a1 cat"], 2)` by hand.

```hints
nudge: Read top_words from the inside out, as you read levels.py: what does the innermost generator produce for the line "the dog, the end"? Then what does Counter make of all of them, and what does the sort put first?
concept: The generator yields each word that is all letters, lowercased: "dog," is skipped for its comma and "a1" for its digit. Counter counts them; sorted orders the (word, count) pairs by count descending, then alphabetically; [:n] keeps the first n; the outer comprehension keeps only the words. Plain version: a dictionary counted with get, a named sort-key function returning (-count, word), and a loop appending the first n words. The trace gives ["the", "cat"]: the 3, cat 2, end 1.
shape: plain_top_words: counts = {}; two nested for loops (over lines, then over line.split()); if word.isalpha(), count word.lower(). ordered = sorted(counts.items(), key=by_count_then_word); collect the words of ordered[:n] into a list. check_top.py: for count in range(4), for lines in itertools.product(SAMPLES, repeat=count), for n in range(5), compare.
answer: plain.py:
~~~python
# The n most common words in some lines of text, most common first, and
# alphabetical on a tie. A word is a run of letters between spaces, counted
# without regard to case; anything with a digit or punctuation in it isn't one.
def plain_top_words(lines, n):
    counts = {}
    for line in lines:
        for word in line.split():
            if word.isalpha():
                word = word.lower()
                counts[word] = counts.get(word, 0) + 1
    ordered = sorted(counts.items(), key=by_count_then_word)
    top = []
    for word, count in ordered[:n]:
        top.append(word)
    return top


# The most common first; on a tie, alphabetical.
def by_count_then_word(item):
    word, count = item
    return (-count, word)
~~~
check_top.py:
~~~python
import itertools

from dense import top_words
from plain import plain_top_words

SAMPLES = ["", "a b a", "B b", "x1 y", "c, c"]

cases = 0
differences = 0
for count in range(4):
    for lines in itertools.product(SAMPLES, repeat=count):
        for n in range(5):
            cases += 1
            if top_words(lines, n) != plain_top_words(lines, n):
                differences += 1
                if differences <= 3:
                    print("differ:", lines, n, top_words(lines, n), plain_top_words(lines, n))
print(cases, "cases,", differences, "differences")
~~~
The misreadings the check catches: forgetting lower (275 differences), counting words that aren't all letters (276), and sorting by count alone, which leaves ties in the order the words were first seen (99). Lowercasing before the isalpha test is another valid order, since lowercasing never changes whether a word is all letters.
```

```check
run "cd kit; .venv/Scripts/python check_top.py" stdout="780 cases, 0 differences" -- check_top.py should compare the two functions on every list of 0 to 3 sample lines and every n from 0 to 4.
run "cd kit; .venv/Scripts/python -c \"from plain import plain_top_words; print(plain_top_words(['The cat', 'the dog, the end', 'a1 cat'], 2), plain_top_words(['b a', 'a b'], 5), plain_top_words([], 3))\"" stdout="['the', 'cat'] ['a', 'b'] []" -- Lowercase words made only of letters; most common first, alphabetical on a tie.
run "cd kit; .venv/Scripts/python -c \"import inspect, plain; s = inspect.getsource(plain); print('lambda' in s, 'Counter' in s, any(' for ' in l.split('[', 1)[1].split(']')[0] for l in s.splitlines() if '[' in l))\"" stdout="False False False" -- plain.py should spell the steps out: no lambda, no Counter, no list comprehension.
```

**What these checks establish, and what they don't.** They run your comparison over 780 cases, try your function on three inputs, and look for `lambda`, `Counter` and a comprehension in what it returns. The comparison's strength is that its reference, `top_words`, was written by someone else, so a misreading of yours can't be in both. Its weakness is the five sample lines: they cover case, punctuation, digits, ties and empty lines, but not, for instance, tabs between words, or letters outside English. Is `"café".isalpha()` true? Find out, then decide whether a line in another language would be counted the way you'd want. The source checks can be fooled; read your version and ask whether someone new could follow it.

## What you can do now

- Start at the **entry point**: what runs on import, and what runs only when the file is the program. Then list the inputs and outputs.
- **Follow the data**: trace one real input through, writing down each value, in a table if there's more than one.
- **Expand dense lines** from the inside out, into named steps: a generator into a loop, a `lambda` into a named function, `X or Y` into an `if`, a format spec into `ljust`.
- **Prove the expansion** by comparing both versions on inputs chosen to probe the edges, and make sure the comparison can fail.
- Reading finds **assumptions**: what counts as a level, how text is compared, which inputs are skipped silently, which crash. They're decisions for someone to own.

```predict
question: You find this in someone else's code: total = sum(x for x in prices if x) or None. In plain words, what does it set total to, and what case did its author think about, perhaps without meaning to?
explain: It adds up the prices that are truthy, which skips zeros (and None values, if any), and then, because sum gives 0 when there's nothing to add, or turns a total of 0 into None. So an empty list, or a list of only zeros, gives None instead of 0. Maybe that's intended ("no total" rather than "total 0"), maybe not: a list of free items would report no total. Expanding it would be an if: total = the sum; if total == 0, total = None. Then ask the owner whether a real total of 0 should be None.
```

**Next:** module 1.5 is about functions themselves: what happens when one is called. 01-05-01 starts with parameters, return values and the order things are evaluated in, and Kit gets its first shared module.
