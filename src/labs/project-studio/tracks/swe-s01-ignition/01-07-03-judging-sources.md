---
title: Judging Sources: Going to the Primary Source
runtime: python
---

Last lesson ended on a disagreement: for a blank line in a CSV file, Python's `csv` module returns `[]`, an empty record, where RFC 4180's grammar says a record with one empty field. Suppose you'd asked around first. A forum answer says "the csv reader skips blank lines". An AI assistant says it returns `['']`. The documentation, read carefully, doesn't say. Three sources, three answers, and at most one is right. This lesson is about deciding which, and the habit behind it: when a claim matters, go to the **primary source**, the thing itself (the code, the standard, the measured result), rather than someone's account of it. It finds the line in Python's own source code that answers the CSV question, tells a guarantee apart from something that merely happens to be true today, and turns claims into experiments you can rerun.

**By the end you can:**

- Tell a primary source from a secondary one, and say how reliable each kind of source is for a given question.
- Find the code that decides a behaviour in an open-source project, at the version you use, and read it as documentation of what it does.
- Distinguish a documented guarantee from an implementation detail, and say why the difference matters to code that relies on it.
- Turn a claim into a small experiment, and record the claim, its source and the verdict.

**You need:** 01-07-01 (references, versions) and 01-07-02 (the CSV disagreement). Commands run inside `kit`.

## Three answers to one question

Kinds of source, roughly in order of how close they are to the truth:

| Kind | Examples | What it tells you |
|---|---|---|
| **Primary** | The source code; the standard; the official reference; your own measurement | What *is*, for that version: the thing itself |
| **Secondary** | A tutorial, a blog post, a forum answer, a book, a talk | Someone's account of the primary source, for some version, at some date |
| **Tertiary** | A summary of summaries; most AI assistants' answers | Patterns from many secondary sources, usually without saying which |

None of these is useless. A good forum answer can save you an hour, and an AI assistant can point you at the right file in seconds. But each step away from the primary source adds a chance that the account is out of date, about a different version, misremembered, or wrong. So the question isn't "which source do I trust?" but "how much does this claim matter, and how close to the primary source must I go before I believe it?"

Signs of a source's reliability, whatever its kind: who wrote it (the project's maintainers, or a stranger?), when (01-07-01's dates), for which version, whether it shows evidence (code you can run, a link to the source) or just asserts, and whether others can reproduce it.

```predict
question: For "what does Python 3.14's csv.reader return for a blank line?", which source would settle it?
choice: A highly upvoted forum answer
choice: An AI assistant's answer
choice: Running csv.reader on a blank line, and reading the code that handles it
answer: Running csv.reader on a blank line, and reading the code that handles it
explain: Both are primary: the experiment shows what this Python actually does, and the source shows where and why. The forum answer and the AI's answer are accounts, possibly of other versions. 01-07-02 already ran the experiment ([] for a blank line), so the forum's "skips blank lines" is wrong for csv.reader, and the AI's [''] is what the RFC describes, not what Python does.
```

## Go to the source

Python is open source: its code is public, at github.com/python/cpython, with a **branch** for each version (`3.14`, `3.13`, …), so you can read exactly the code your Python runs. The `csv` module is in two parts: `Lib/csv.py`, written in Python, and `Modules/_csv.c`, the reader itself, written in C for speed. The raw file is at `raw.githubusercontent.com/python/cpython/3.14/Modules/_csv.c`. You don't need to know C to find a behaviour in it: search the file for a word, as you'd search any text.

The reader is a state machine, like `csvtool.py`'s (01-07-02), and the function that handles each character is called `parse_process_char`. Its first state, at the start of a record, begins:

```
    case START_RECORD:
        /* start of record */
        if (c == EOL)
            /* empty line - return [] */
            break;
```

There it is, in the code's own words: `empty line - return []`. When a line ends before any field has started, the reader returns an empty list. That's the answer for Python 3.14, from the primary source.

And the forum's "skips blank lines"? That's true of a *different* class. `Lib/csv.py`'s `DictReader`, which gives each record as a dictionary keyed by the header, has this in its `__next__`:

```
        # unlike the basic reader, we prefer not to return blanks,
        # because we will typically wind up with a dict full of None
        # values
        while row == []:
            row = next(self.reader)
```

So `DictReader` skips the `[]` records the basic reader returns, and says why. The forum answer was probably right about `DictReader` and generalised it to `reader`. A secondary source that's half right is a common failure: true of something nearby.

The documentation, for comparison (docs.python.org, 3.14.10): it says nothing about what `reader` returns for a blank line. It does hint at `DictReader`'s behaviour ("If a non-blank row has fewer fields than fieldnames…"). Here the code is the only place the behaviour is written down. Source code is the most exact documentation of what a program does, and the least reliable documentation of what it *promises* to do, which is the next step.

```check
run "cd kit; .venv/Scripts/python -c \"import csv, io; print(list(csv.reader(io.StringIO('a\\nb', newline=''))), list(csv.reader(io.StringIO('a\\n\\nb', newline=''))))\"" stdout="[['a'], ['b']] [['a'], [], ['b']]" -- csv.reader returns [] for a blank line, as _csv.c's comment says.
run "cd kit; .venv/Scripts/python -c \"import csv, io; print(len(list(csv.DictReader(io.StringIO('x\\n1\\n\\n2\\n', newline='')))))\"" stdout="2" -- DictReader skips the blank line, as Lib/csv.py says it does.
```

## Guaranteed, or just true today?

A behaviour you find in the source is true of that version. Whether it stays true depends on whether anyone has promised it. The documentation is where a project says what it promises. Behaviour the docs don't mention is an **implementation detail**: true today, and free to change in any release without warning.

Python's documentation shows the difference itself. On dictionaries (docs.python.org, 3.14, "Mapping Types"): "Dictionaries preserve insertion order." And then: "Changed in version 3.7: Dictionary order is guaranteed to be insertion order. This behavior was an implementation detail of CPython from 3.6." For one version, 3.6, dictionaries kept insertion order in practice, but the language didn't promise it. Code that relied on it then was relying on luck; from 3.7, it's a guarantee. 01-04-01 met the same thing with small integers: CPython keeps one shared object for each of −5 to 256, which is why `int("5") is int("5")` is `True`. That's an implementation detail, and the reason never to write code that depends on it.

Where does the csv module's `[]` for blank lines stand? It's in the code with a comment, so it's deliberate. But it isn't in the documentation, so it isn't promised. Code that depends on `[]` should check for it explicitly (`if row == []`), and code that needs blank lines skipped can say so (`DictReader`, or a filter), rather than trusting that today's behaviour is forever.

When you need to know whether something is a bug, a decision, or a known problem, the next primary source is the project's **issue tracker**: CPython's is GitHub's Issues tab, at github.com/python/cpython/issues. Search it for the behaviour in a few words. An issue shows who reported what, the maintainers' replies, and what was decided, often with a link to the change that fixed it. A closed issue marked "not a bug" is the project telling you a behaviour is intended. (Like any search, a result is a lead: read the issue's date and version before relying on it.)

```check
run "cd kit; .venv/Scripts/python -c \"d = {}; d['b'] = 1; d['a'] = 2; d['b'] = 3; del d['a']; d['a'] = 4; print(list(d))\"" stdout="['b', 'a']" -- Dictionaries keep insertion order (guaranteed since 3.7): updating b doesn't move it; a, deleted and added again, goes to the end.
```

## Test the claim yourself

The most portable primary source is an experiment: a few lines that test a claim on your machine, which anyone can rerun. This file collects some, each printing the claim and what the experiment found. `Decimal(2.675)` (from the standard `decimal` module) shows the exact value a float stores; the `# noqa` tells Ruff (01-06-04) that the float is passed on purpose.

```python file=kit/claims.py
import csv
import io
from decimal import Decimal

# Claims about Python, each tested by an experiment on this machine's Python.
# A claim is a sentence; True or False is what the experiment found.

blank = list(csv.reader(io.StringIO("a\n\nb\n", newline="")))
print("csv.reader gives [] for a blank line:", blank[1] == [])

dict_rows = list(csv.DictReader(io.StringIO("x\n1\n\n2\n", newline="")))
print("csv.DictReader skips blank lines:", len(dict_rows) == 2)

order = {"b": 1, "a": 2}
print("dicts keep insertion order:", list(order) == ["b", "a"])

print("round(2.5) is 3:", round(2.5) == 3)
print("round(2.675, 2) is 2.68:", round(2.675, 2) == 2.68)
print("2.675 is stored as:", Decimal(2.675))  # noqa: RUF032 (the float on purpose)
```

```predict
question: A popular answer says "Python's round() rounds halves up, so round(2.5) is 3". What will claims.py find?
choice: True: round(2.5) is 3
choice: False: round(2.5) is 2
answer: False: round(2.5) is 2
explain: The reference for round() says: "if two multiples are equally close, rounding is done toward the even choice (so, for example, both round(0.5) and round(-0.5) are 0, and round(1.5) is 2)". 2.5 is halfway between 2 and 3, and 2 is even. It's called banker's rounding, chosen because always rounding halves up biases sums upwards. The popular answer describes what people learn at school, and what many other languages and spreadsheets do.
```

Save it and run `.venv/bin/python claims.py`:

```
csv.reader gives [] for a blank line: True
csv.DictReader skips blank lines: True
dicts keep insertion order: True
round(2.5) is 3: False
round(2.675, 2) is 2.68: False
2.675 is stored as: 2.67499999999999982236431605997495353221893310546875
```

The last two lines are worth a moment. `round(2.675, 2)` gives `2.67`, which looks like a bug, and the documentation says it isn't: "most decimal fractions can't be represented exactly as a float." The last line shows the stored value. The float nearest to 2.675 is a little *below* it, so rounding to two places correctly goes down. Two primary sources, the reference and an experiment, explaining each other. (Module 2.4 is about representing numbers like money, where this matters.)

```check
run "cd kit; .venv/Scripts/python claims.py" stdout="round(2.5) is 3: False" -- round() rounds halves to the even choice, as the reference says.
run "cd kit; .venv/Scripts/python claims.py" stdout="2.675 is stored as: 2.67499999999999982236431605997495353221893310546875" -- The float nearest 2.675 is just below it.
run "cd kit; .venv/Scripts/ruff check claims.py" stdout="All checks passed!" -- claims.py should pass the linter (the deliberate float is marked noqa).
```

## Papers, and assistants

Two more kinds of source you'll meet.

**Research papers** are primary sources for ideas: a new algorithm, a measurement, an experiment. A paper's **abstract** summarises its claim; its **method** says what was done; its **results** say what was found; its **limitations** (if it's honest) say where the claim stops. Read the claim against the evidence: does the experiment actually test what the abstract says, on data like yours? A **preprint** (often on arXiv) hasn't been through peer review; a published paper has been read critically by a few experts, which catches some mistakes, not all. And a paper's result is about the paper's setting: "40% faster" on its benchmark is a claim about that benchmark.

**AI assistants**, the subject of module 1.11, produce fluent answers from patterns in what they were trained on. That makes them good at pointing you in a direction and summarising, and unreliable as the last word: an answer can be confidently wrong, mix up versions, or describe a function that doesn't exist. The fix is the same as for any secondary source. Ask for the primary source (which file, which function, which section of which document), then read it, or test the claim with an experiment. The tool that fetched pages for this lesson was itself an AI model. When it summarised the `round()` documentation it added "I checked those values in Python", which it couldn't have done. The quote was right; the claim of having run it was not. That's why every value in this lesson was run on a real Python.

**What else, and why not.**

| Way to settle a claim | Cost |
|---|---|
| An experiment on your machine | Primary, quick, rerunnable; true of your version and inputs only |
| Reading the source | Primary, and shows why; harder to read, and says nothing about what's promised |
| The official documentation | The promise; silent on details, and sometimes behind the code |
| The issue tracker | Shows decisions and known bugs; scattered, and needs reading with dates |
| Asking someone, or an assistant | Fast; a lead to check, not a conclusion |

## Your turn: three claims

Settle three claims, with an experiment each and a written record:

1. "`sorted()` keeps items that compare equal in their original order."
2. "`"a  b".split()` and `"a  b".split(" ")` give the same list."
3. "`json.dumps` writes a dictionary's keys in sorted order."

Add an experiment for each to the end of `claims.py`, printing exactly these three lines with what the experiment found, `True` or `False`:

```
sorted keeps equal items in order: …
split() and split(' ') agree: …
json.dumps sorts keys: …
```

Then write `notes/sources.md`, a record of the three: for each, a line starting `- Claim:`, then a `Source:` line naming the primary source (the page on docs.python.org, and which entry), then a `Verdict:` line. Find each answer in the documentation before you run the experiment, and note whether the two agree.

```hints
nudge: For each claim, ask: what small input would show the difference if the claim were false? For "keeps equal items in order", you need items that compare equal but can be told apart.
concept: Sort pairs by their first item only (key=lambda pair: pair[0]), with equal first items in a known order, and compare the result with the order you'd expect if equal items keep their places. For split, use text with two spaces in a row (01-01-03 met this). For json.dumps, use a dictionary whose keys were inserted out of order, and compare the output with the sorted text. The documentation: sorted() says it's "guaranteed to be stable"; str.split describes runs of whitespace for no separator; json.dumps has a sort_keys parameter, False by default.
shape: pairs = [("b", 2), ("a", 1), ("b", 1), ("a", 2)]; sorted(pairs, key=lambda pair: pair[0]) should be [("a", 1), ("a", 2), ("b", 2), ("b", 1)] if stable. spaced = "a  b"; spaced.split() == spaced.split(" "). json.dumps({"b": 1, "a": 2}) == '{"a": 2, "b": 1}' (import json at the top). sources.md: three "- Claim:" entries, each with Source: and Verdict: lines.
answer: At the end of claims.py, with import json added at the top:
~~~python
pairs = [("b", 2), ("a", 1), ("b", 1), ("a", 2)]
by_letter = sorted(pairs, key=lambda pair: pair[0])
print("sorted keeps equal items in order:", by_letter == [("a", 1), ("a", 2), ("b", 2), ("b", 1)])

spaced = "a  b"
print("split() and split(' ') agree:", spaced.split() == spaced.split(" "))

print("json.dumps sorts keys:", json.dumps({"b": 1, "a": 2}) == '{"a": 2, "b": 1}')
~~~
They print True, False, False. notes/sources.md:
~~~
# Claims, sources and verdicts

- Claim: sorted() keeps items that compare equal in their original order.
  Source: docs.python.org/3.14/library/functions.html, sorted(): "guaranteed to be stable" (primary: the language's own documentation).
  Verdict: true, and guaranteed. Tested in claims.py.
- Claim: "a  b".split() and "a  b".split(" ") give the same list.
  Source: docs.python.org/3.14/library/stdtypes.html, str.split (primary); 01-01-03 met the difference.
  Verdict: false. split() splits on runs of whitespace; split(" ") on every single space, giving empty strings. Tested in claims.py.
- Claim: json.dumps writes a dictionary's keys in sorted order.
  Source: docs.python.org/3.14/library/json.html, json.dumps and its sort_keys parameter (primary).
  Verdict: false by default; keys keep the dictionary's insertion order unless sort_keys=True. Tested in claims.py.
~~~
The tempting slip in the first experiment is to sort items that can't be told apart when equal, such as plain numbers: [2, 1, 2] sorted is [1, 2, 2] whether the sort is stable or not, so the experiment can't fail and proves nothing. An experiment is only evidence if it could have come out the other way.
```

```check
run "cd kit; .venv/Scripts/python claims.py" stdout="sorted keeps equal items in order: True" -- sorted() is stable: equal items keep their order.
run "cd kit; .venv/Scripts/python claims.py" stdout="split() and split(' ') agree: False" -- split() and split(" ") differ on repeated spaces.
run "cd kit; .venv/Scripts/python claims.py" stdout="json.dumps sorts keys: False" -- json.dumps keeps insertion order unless sort_keys=True.
run "cd kit; .venv/Scripts/python -c \"text = open('notes/sources.md', encoding='utf-8').read(); print(text.count('- Claim:') >= 3, text.count('Source:') >= 3, text.count('Verdict:') >= 3, 'docs.python.org' in text)\"" stdout="True True True True" -- notes/sources.md should record three claims, each with a source on docs.python.org and a verdict.
run "cd kit; .venv/Scripts/ruff check claims.py" stdout="All checks passed!" -- claims.py should still pass the linter.
```

**What these checks establish, and what they don't.** They run `claims.py` and read its three new lines, check that `sources.md` has the shape of a record (three claims, sources, verdicts, and a link to the official documentation), and lint the file. They can't check that your experiments could have failed (see the hint answer's last paragraph), that your sources are the right entries, or that your verdicts match what you found. Read your record as a stranger would: could they rerun your experiment and find your source from what you wrote?

## What you can do now

- **Primary sources** are the thing itself (code, standard, official reference, your own measurement); **secondary** are accounts of it. Go as close to the primary source as the claim's importance demands.
- Open-source code is readable at the exact version you run (`cpython/3.14`), and is the most exact record of what a program **does**. `_csv.c` says it: `empty line - return []`.
- The documentation says what's **promised**. Behaviour that's only in the code is an **implementation detail** (dict order in 3.6, small-int caching), free to change.
- **Issue trackers** record bugs and decisions; **papers** make claims to read against their evidence; **AI assistants** are leads, to be checked against a primary source.
- Turn claims into **experiments** that could fail, and keep a record: claim, source, verdict.

```predict
question: A teammate's code relies on os.listdir returning files in alphabetical order, "because it always does on my machine". Is that a guarantee? How would you find out, and what should the code do?
explain: Look in the documentation: os.listdir says the list is "in arbitrary order". It's not promised; it may look alphabetical on one file system (and is often in creation order on another). "Always does on my machine" is one experiment, on one machine. The code should sort explicitly, sorted(os.listdir(path)), exactly as 01-05-02's tree.py does, so that the order is a guarantee the code makes for itself.
```

**Next:** module 1.8 is version control. 01-08-01 puts Kit and Blockfall under Git: what a commit is, the commit graph, branches and `HEAD`, `.gitignore` (the `.venv` and `notes/demo_key` will want it), and making commits that each do one thing.
