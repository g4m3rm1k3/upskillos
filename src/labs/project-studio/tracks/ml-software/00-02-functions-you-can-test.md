---
title: 0.2 — Functions You Can Test
track: Python Becomes Software
runtime: python
run: count.py
concepts: functions, testing, modules
revisits: virtual-environments
notebook: py-functions, py-testing-your-code, py-modules
problem: The counting is tangled up with reading a file and printing. How do you check it's right?
---

`count.py` does three jobs at once: it reads a file, it counts, and it prints. To check the counting you have to do all three, and read the output by eye. This lesson pulls the counting out into **functions**: each takes a string and returns an answer. A function like that can be checked in one line, with no file and no printing:

```python
assert count_words("one two three") == 3
```

> **Function**: a named block of code that takes **inputs** (its **parameters**), does some work, and **returns** an output to whoever called it. `def count_words(text):` defines one; `count_words("one two three")` **calls** it, and the value in the brackets is the **argument** given to the parameter `text`.
>
> *Picture it as* a machine on a production line: material goes in one side, a finished part comes out the other, and the machine doesn't care which station fed it or where the part goes next. That independence is the point. A function that also reads files and prints is a machine that insists on fetching its own material and delivering its own parts: it only works in the one spot it was built for.

That line is a **test**: code that runs other code with an input whose correct answer you already know, and complains if the answer is wrong. `assert` is the Python statement that complains: `assert condition` does nothing if the condition is true and raises `AssertionError` if it's false. A file full of lines like it is a test file, and pytest is the program that runs test files and reports which lines failed.

> *Picture it as* a go/no-go gauge on an inspection bench: it doesn't measure how good the part is, it answers one yes-or-no question, and it's quick enough to use on every part. Each `assert` is one gauge.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_stats.py** above.

```python file=tests/test_stats.py provided
# Tests for stats.py. Run them all with:
#   .venv\Scripts\python -m pytest -q tests/test_stats.py
# or only the tests whose names contain a word, with -k:
#   .venv\Scripts\python -m pytest -q tests/test_stats.py -k lines
import stats

SAMPLE = "It was the best of times,\nit was the worst of times.\n"


def test_characters_include_spaces_and_line_breaks():
    assert stats.count_characters("abc") == 3
    assert stats.count_characters("a b\n") == 4
    assert stats.count_characters("") == 0
    assert stats.count_characters(SAMPLE) == 53


def test_lines_are_counted_by_line_breaks():
    assert stats.count_lines(SAMPLE) == 2
    assert stats.count_lines("") == 0
    assert stats.count_lines("no line break at the end") == 1
    assert stats.count_lines("a\n\nb\n") == 3, "an empty line in the middle is still a line"


def test_tokenize_lowercases_and_drops_punctuation():
    assert stats.words("It was the best of times,") == ["it", "was", "the", "best", "of", "times"]


def test_tokenize_keeps_apostrophes_inside_words():
    assert stats.words("Don't stop.") == ["don't", "stop"]
    assert stats.words("'Quoted'") == ["quoted"], "quote marks around a word are not part of it"


def test_tokenize_keeps_numbers_and_skips_pure_punctuation():
    assert stats.words("-- 42 --") == ["42"]
    assert stats.words("") == []


def test_word_count_uses_the_same_idea_of_a_word():
    assert stats.count_words(SAMPLE) == 12
    assert stats.count_words("one  two\tthree\nfour") == 4
    assert stats.count_words("-- hello --") == 1, "punctuation on its own is not a word"


def test_most_common_ranks_by_count():
    assert stats.most_common("b a b", 2) == [("b", 2), ("a", 1)]


def test_most_common_breaks_ties_alphabetically():
    assert stats.most_common("b a c b a", 3) == [("a", 2), ("b", 2), ("c", 1)]
    assert stats.most_common(SAMPLE, 3) == [("it", 2), ("of", 2), ("the", 2)]


def test_most_common_with_more_requested_than_exist():
    assert stats.most_common("x y", 10) == [("x", 1), ("y", 1)]
```

How to read a test file:

- **`import stats`** imports the module you're about to write. Until `stats.py` exists, every test fails at this line with `ModuleNotFoundError`. That's expected.
- **Each `def test_…` is one test.** pytest finds every function whose name starts with `test_` and calls it. A test passes if it returns without an exception.
- **Each `assert` is one claim.** `assert stats.count_lines("") == 0` claims that the empty string has zero lines. The text after a comma, as in `"an empty line in the middle is still a line"`, is printed when the claim fails, to say what was meant.
- **The test names are a specification.** Read them as sentences: "characters include spaces and line breaks", "tokenize keeps apostrophes inside words". They say what the code must do before you write any of it.

Notice what the tests chose to check. `"a\n\nb\n"` has 3 lines, not 2: someone thought about blank lines. `"'Quoted'"` gives `["quoted"]`: someone thought about quote marks. Good tests are mostly **edge cases**: the empty string, the missing final line break, the punctuation on its own. The ordinary case is the one you'd have got right anyway.

Run them now, to see what failure looks like:

```powershell
.venv\Scripts\python -m pytest -q tests/test_stats.py
```

Every test errors with `ModuleNotFoundError: No module named 'stats'`.

**Why `python -m pytest` and not `pytest`?** For the same reason as `python -m pip`: it runs *this project's* pytest. It also does one more thing: `python -m` puts the **current folder** at the front of `sys.path`, the list of folders Python searches when you `import`. That's how `import stats` inside `tests/test_stats.py` will find `stats.py` in the project folder, one level up from the test file.

```check
file tests/test_stats.py -- Click "Create provided tests/test_stats.py" above.
```

## Count characters and lines

Create `stats.py`:

```python file=stats.py
def count_characters(text):
    return len(text)


def count_lines(text):
    return len(text.splitlines())
```

Two functions that each take a string and **return** a number. They don't read files and they don't print. That's the whole point: the caller decides where the text comes from and what to do with the answer.

**`return` is not `print`.** Beginners often mix them up, because at the prompt both seem to "show the answer". They do completely different things. `print` writes text to the screen and gives back nothing. `return` hands a value back to the code that called the function, and shows nothing. Try it at the prompt (`.venv\Scripts\python`), predicting each line before pressing Enter:

```text
>>> def shout(text):
...     print(text.upper())
...
>>> def loud(text):
...     return text.upper()
...
>>> a = shout("hi")
HI
>>> b = loud("hi")
>>> print(a)
None
>>> b
'HI'
```

(At the prompt, a `def` continues over several lines: type the body after `...`, then an empty line to finish.) `shout("hi")` printed `HI`, but the variable `a` got **`None`**, Python's value for "nothing", because `shout` has no `return`. `loud("hi")` printed nothing, but `b` holds `'HI'`, which the rest of the program can use: compare it, count it, put it in a report. Tests can only check what a function returns.

`count_lines` could have been written `text.count("\n")`, counting line breaks. Run that idea against the tests in your head: `"no line break at the end"` has no `"\n"` and would get 0 lines. `splitlines()` handles both cases: a line counts whether or not it ends with a line break.

Run just these tests. `-k` selects tests whose names contain the words given, and `or` combines them:

```powershell
.venv\Scripts\python -m pytest -q tests/test_stats.py -k "characters or lines"
```

```text
..                                                       [100%]
2 passed, 7 deselected in 0.01s
```

Each `.` is a passing test. **Deselected** tests are the ones `-k` left out.

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py -k \"characters or lines\"" label="count_characters and count_lines pass their tests" -- count_lines should be len(text.splitlines()).
```

## What is a word?

`count.py` used `text.split()`, which calls `"times,"` a word and treats `"It"` and `"it"` as different. Before counting words, decide what a word **is**. Here's the definition the tests describe:

- letters and digits, lowercased;
- an apostrophe counts only *between* letters, as in `don't`;
- everything else (spaces, commas, dashes, quote marks) separates words.

That's a pattern, and Python's standard-library module `re` (regular expressions) finds every piece of text matching a pattern. Add it to `stats.py`:

```python file=stats.py
import re

WORD = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)*")


def count_characters(text):
    return len(text)


def count_lines(text):
    return len(text.splitlines())


def words(text):
    return WORD.findall(text.lower())
```

> **Regular expression** (regex): a small language for describing a *pattern* of text, such as "one or more letters". `re.findall(pattern, text)` returns every piece of `text` that fits the pattern, left to right.
>
> *Picture it as* a template you slide along the text: wherever the text fits the template's shape, that piece is cut out and kept. **Where the picture stops working:** a real template has a fixed size; a pattern with `+` stretches to grab as much as fits.

Try a simpler pattern first, at the prompt:

```text
>>> import re
>>> re.findall(r"[a-z]+", "it's 2 times")
['it', 's', 'times']
>>> re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)*", "it's 2 times")
["it's", '2', 'times']
```

`[a-z]+` means "one or more lowercase letters", so the apostrophe breaks `it's` in two and the `2` isn't a letter at all. The full pattern fixes both. Read it piece by piece:

| Piece | Means |
|---|---|
| `[a-z0-9]` | one character that is a lowercase letter or a digit |
| `+` | one or more of the thing before it |
| `(?: … )` | a group, so the next symbol applies to all of it |
| `'[a-z0-9]+` | an apostrophe followed by one or more letters or digits |
| `*` | zero or more of the group |

So a word is a run of letters and digits, optionally followed by `'` and more letters, any number of times: `it`, `don't`, `rock'n'roll`. The `r` before the string makes it a **raw string**, where a backslash is just a backslash; patterns are always written that way.

`findall` scans the text left to right and returns every match as a list. `text.lower()` comes first, so the pattern only needs to describe lowercase letters. Trace `"'Quoted'"`: lowercased it's `"'quoted'"`. The first `'` can't start a match (a match must start with a letter or digit), `quoted` matches, and the final `'` isn't followed by a letter, so the group doesn't apply. Result: `["quoted"]`.

`re.compile` turns the pattern into a reusable object once, when the module loads, rather than on every call. `WORD` is in capitals because it's a **constant**: a name set once and never reassigned. Python doesn't enforce that; the capitals tell other programmers.

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py -k tokenize" label="words() splits text into lowercase words" -- words(text) should be WORD.findall(text.lower()).
```

## Count the words

Now a word count is just the number of words:

```python file=stats.py
import re

WORD = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)*")


def count_characters(text):
    return len(text)


def count_lines(text):
    return len(text.splitlines())


def words(text):
    return WORD.findall(text.lower())


def count_words(text):
    return len(words(text))
```

`count_words` **calls** `words` instead of repeating its logic. If the definition of a word changes later (it will, in lesson 0.4), the count changes with it. Two functions with two slightly different ideas of a word would drift apart, and the report would contradict itself.

```predict
question: data.txt gave "Words: 85" with text.split(). How many words does count_words find in it?
answer: 85
explain: Still 85. Splitting on whitespace and finding words with the pattern only disagree where a "piece" between spaces holds no letters at all (like "--") or more than one word (like "end.Next"). The passage has neither: its punctuation is always stuck to a word, so "times," becomes "times" but is still counted once. The two definitions agree on the total and disagree on what the words *are*, which matters as soon as you count each word separately.
verify: .venv/Scripts/python -c "import stats; print(stats.count_words(open('data.txt').read()))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py -k word_count" label="count_words counts the same words that words() finds" -- count_words should return len(words(text)).
```

## The most common words

Now the feature `count.py` couldn't do. Counting how often each word appears is a job for a **dictionary**: the word is the key, its count is the value.

```python file=stats.py
import re

WORD = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)*")


def count_characters(text):
    return len(text)


def count_lines(text):
    return len(text.splitlines())


def words(text):
    return WORD.findall(text.lower())


def count_words(text):
    return len(words(text))


def most_common(text, n):
    counts = {}
    for word in words(text):
        counts[word] = counts.get(word, 0) + 1
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]
```

> **Dictionary**: a collection that maps **keys** to **values**: give it a key, get back the value stored under it. `counts["the"]` is the value stored under the key `"the"`.
>
> *Picture it as* a tally sheet with one row per word: the word is written once in the left column, and every time it turns up you add a mark in the right column.

**Counting.** `counts.get(word, 0)` returns the word's count so far, or `0` if the word isn't a key yet. (Plain `counts[word]` would raise `KeyError` for a word not seen before.) Adding 1 and storing it back counts this occurrence. Trace it for `"b a b"`:

| word | `counts.get(word, 0)` | after `counts[word] = … + 1` |
|---|---|---|
| (start) | | `{}` |
| `b` | 0 | `{"b": 1}` |
| `a` | 0 | `{"b": 1, "a": 1}` |
| `b` | 1 | `{"b": 2, "a": 1}` |

**Ranking.** `counts.items()` gives `(word, count)` pairs. `sorted` puts them in order, comparing whatever the `key` function returns for each pair. Here the key is a tuple, `(-count, word)`, and Python compares tuples element by element:

1. `-count` first: sorting ascending on the negated count puts the **largest** count first (−11 < −10).
2. Only when two counts are equal does the second element decide: the word, alphabetically.

**`lambda`** writes a small function without giving it a name. These two mean the same thing:

```python
key=lambda pair: (-pair[1], pair[0])

def sort_label(pair):
    return (-pair[1], pair[0])
key=sort_label
```

`sorted` calls the key function once for each item and sorts the items by what it returns. *Picture it as* writing a label on a sticky note for each item and then sorting by the notes, not by the items themselves. Trace it for `"b a c b a"`:

| item from `counts.items()` | sticky note `(-count, word)` |
|---|---|
| `("b", 2)` | `(-2, "b")` |
| `("a", 2)` | `(-2, "a")` |
| `("c", 1)` | `(-1, "c")` |

Sorted by note: `(-2, "a")`, `(-2, "b")`, `(-1, "c")`. So the result is `[("a", 2), ("b", 2), ("c", 1)]`. Check the two comparisons that decided it at the prompt: `(-2, "a") < (-2, "b")` is `True` (first elements equal, so the words decide), and `(-2, "b") < (-1, "a")` is `True` (the first elements already differ, so the words are never looked at).

`ranked[:n]` keeps the first `n` items: a **slice**. Slicing past the end of a list is safe (`[1, 2][:10]` is `[1, 2]`), which the last test relies on.

```predict
question: The key is (-count, word). If it were only -count, which test would fail?
choice: test_most_common_ranks_by_count
choice: test_most_common_breaks_ties_alphabetically
choice: test_most_common_with_more_requested_than_exist
choice: None of them
answer: test_most_common_breaks_ties_alphabetically
explain: With only `-count`, pairs with equal counts are "equal" to `sorted`, and Python's sort is **stable**: equal items keep the order they came in. A dictionary remembers insertion order, so ties would come out in order of first appearance. For "b a c b a" that's b before a, and the test expects a before b. The tie-break isn't cosmetic: without it, the same text could produce a different report after an unrelated change to the code, and a test that compares reports would fail for no visible reason.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py -k most_common" label="most_common ranks words by count, ties alphabetically" -- Sort by the key (-count, word): the largest count first, then alphabetical among equal counts.
```

## Let the standard library count

Counting things is so common that Python's standard library has a tool for it: `collections.Counter`, a dictionary that counts. You've now written the simple version yourself, so you know exactly what it does. Replace your loop:

```python file=stats.py
import re
from collections import Counter

WORD = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)*")


def count_characters(text):
    return len(text)


def count_lines(text):
    return len(text.splitlines())


def words(text):
    return WORD.findall(text.lower())


def count_words(text):
    return len(words(text))


def most_common(text, n):
    counts = Counter(words(text))
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]
```

`Counter(words(text))` runs the same loop you wrote: for each item, add 1 to its count. The result is a dictionary (Counter is a subclass of `dict`), so `.items()` works as before.

Counter also has a method called `most_common(n)`. It's tempting to use it, but read its documentation: "Elements with equal counts are ordered in the order first encountered." That's exactly the tie behaviour the previous prediction ruled out. So you keep your own `sorted` line. **Using a library well means knowing what it does, including where it differs from what you need.** That will matter much more when the library is scikit-learn.

This was a **refactor**: the code changed, the behaviour didn't. How do you know? Run every test, not just this step's:

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py" label="every test in test_stats.py still passes" -- Counter(words(text)) replaces the loop; keep the sorted(...) line as it was.
```

The tests are what make a refactor safe. Without them, "I tidied up the code" and "I broke the code" look the same until someone runs it on real data.

## What import runs

Now give `count.py` the new functions. Replace it with:

```python file=count.py
import stats

text = open("data.txt").read()

print("Characters:", stats.count_characters(text))
print("Words:", stats.count_words(text))
print("Lines:", stats.count_lines(text))
print("Most common:")
for word, count in stats.most_common(text, 5):
    print(f"  {word:<10} {count}")
```

`for word, count in stats.most_common(text, 5):` loops over a list of pairs and **unpacks** each pair into two names: on the first time round, `word` is `"the"` and `count` is `11`.

`f"  {word:<10} {count}"` is an **f-string** (the `f` before the quote): the parts in braces are replaced by values. After a colon comes a **format specification**: `:<10` means "left-aligned, padded with spaces to 10 characters", so the counts line up in a column. At the prompt, `f"[{'the':<10}]"` gives `'[the       ]'`. Click **Run**:

```text
Characters: 418
Words: 85
Lines: 8
Most common:
  the        11
  it         10
  of         10
  was        10
  we         4
```

> **Module**: a `.py` file whose definitions other code can use by **importing** it. `stats.py` is the module `stats`.
>
> *Picture it as* a drawer of tools with a label on the front. `import stats` fetches the drawer and puts it on your bench under the label `stats`; `stats.words` is "the `words` tool from that drawer".

`import stats` is the first line that matters. When Python executes it:

1. It checks `sys.modules`, a dictionary of every module already imported. `stats` isn't there yet.
2. It searches each folder in `sys.path` for `stats.py`. When you run a script, the script's own folder is first in that list, so `stats.py` is found beside `count.py`.
3. It creates an empty **module object** and **runs `stats.py` from top to bottom** inside it. `def` statements create functions; `WORD = …` compiles the pattern. Whatever names exist at the end become the module's attributes: `stats.words`, `stats.WORD`.
4. It stores the module in `sys.modules["stats"]` and binds the name `stats` in `count.py`.

A second `import stats` anywhere in the same program stops at step 1 and reuses the stored module: a module's code runs **once per program**.

Step 3 is the important one. Importing *runs the file*. Now try importing `count`, the way another program would to reuse it:

```powershell
.venv\Scripts\python -c "import count"
```

```predict
question: What does `python -c "import count"` print?
choice: Nothing: importing only makes functions available
choice: The whole report: characters, words, lines and the most common words
choice: An error, because count.py has no functions to import
answer: The whole report: characters, words, lines and the most common words
explain: Importing a module runs it from top to bottom, and every line of count.py is an action: open the file, print, print, print. A module that does things when imported can't be reused. Anyone who wanted one of its pieces would get the side effects too.
```

```check
run ".venv/Scripts/python count.py" stdout="the        11" label="count.py prints the most common words" -- Replace count.py with the version above, save, and Run.
```

## Run only when run

The fix is a convention every Python program uses. Put the actions in a function, and call it only when the file is **run**, not when it's **imported**:

```python file=count.py
import stats


def main():
    text = open("data.txt").read()
    print("Characters:", stats.count_characters(text))
    print("Words:", stats.count_words(text))
    print("Lines:", stats.count_lines(text))
    print("Most common:")
    for word, count in stats.most_common(text, 5):
        print(f"  {word:<10} {count}")


if __name__ == "__main__":
    main()
```

Every module has a variable named `__name__`. When Python imports a module, `__name__` is the module's name: `"count"`. When Python **runs** a file as the program, it names that module `"__main__"` instead. So `if __name__ == "__main__":` is true only when the file is the program being run.

*Picture it as* a name badge Python pins on each file as it loads it. A file that's been borrowed by another program wears its own name; the file that *is* the program wears the badge "main". The `if` reads the badge and only starts the work when it says "main".

See both badges for yourself. Add `print(__name__)` as the first line of `count.py` for a moment, then run `.venv\Scripts\python count.py` (it prints `__main__`) and `.venv\Scripts\python -c "import count"` (it prints `count`). Take the line out again afterwards.

Now `import count` defines `main` and returns quietly, and **Run** still prints the report. Check both:

```check
run ".venv/Scripts/python count.py" stdout="Words: 85" label="running count.py still prints the report"
run ".venv/Scripts/python -c \"import count\"" without="Characters" label="importing count prints nothing" -- Move the actions into def main(): and call main() under if __name__ == "__main__":
```

### What you have

```text
text-analysis/
  .venv/
  requirements.txt
  data.txt
  stats.py           the counting: pure functions, tested
  count.py           the program: reads, calls, prints
  tests/
    test_stats.py
```

The counting is now separate from reading and printing, so it can be tested, and it was: nine tests, written before the code. But `count.py` still only reads `data.txt`, and `stats.py` and `count.py` sit loose in a folder. Next lesson turns them into a package with a real command line.
