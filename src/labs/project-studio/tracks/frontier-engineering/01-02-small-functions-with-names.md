---
title: 1.2 — Small Functions With Names
runtime: python
support: tests/conftest.py
---

The fifty-line `go` function does seven jobs. This lesson splits it into small functions, each doing one job, with a name that says which. Every step ends the same way: the characterisation test from lesson 1.1 must still pass, which proves the report hasn't changed.

Small functions aren't neater for the sake of it. A function that does one thing can be **tested** on its own, with a few words typed into the test instead of a whole file. It can be **reused**: Chapter 26 needs `split_words` and the counting function from this lesson, and doesn't need a printed report. And it can be **read**: `counts = tally(words)` says what it does, while eight lines of loop make you work it out.

## A branch for the work

You're about to change the script many times, and for a while it will be half-changed. A **branch** keeps that work apart from the version that works.

So far every commit has gone on the branch `main`. A branch is just a name that points at a commit, and moves forward each time you commit on it. Make a new branch for this lesson and switch to it:

```powershell
git switch -c functions
```

`-c` creates the branch, starting at the commit you're on. `git branch` lists the branches and marks the one you're on with `*`. Commits you make now move `functions` forward and leave `main` where it is: whatever happens on this branch, `main` still holds the working script, and `git switch main` brings it back. When the work is finished and the test passes, the last step of this lesson brings it into `main`.

```check
git-branch functions -- Run git switch -c functions
```

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_pieces.py**. It tests the functions you're about to pull out of `go`, each on a few words of text:

```python file=tests/test_pieces.py provided
# Tests for the functions lesson 1.2 pulls out of textstats.py.
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_pieces.py


def test_lines_ignore_blank_ones():
    from textstats import count_lines
    assert count_lines("one\n\n  \ntwo\n") == 2


def test_split_words_strips_punctuation_and_case():
    from textstats import split_words
    assert split_words('The cat, the "dog".') == ["the", "cat", "the", "dog"]


def test_split_words_drops_punctuation_alone():
    from textstats import split_words
    assert split_words("wait ... what?!") == ["wait", "what"]


def test_letters_are_lower_case_and_nothing_else():
    from textstats import letters
    assert letters("Hi, Al 2!") == ["h", "i", "a", "l"]


def test_tally_counts_in_order_of_first_appearance():
    from textstats import tally
    counts = tally(["b", "a", "b", "c", "b"])
    assert counts == {"b": 3, "a": 1, "c": 1}
    assert list(counts) == ["b", "a", "c"]


def test_top_puts_the_most_common_first():
    from textstats import top
    assert top({"x": 1, "y": 3, "z": 2}, 2) == [("y", 3), ("z", 2)]


def test_top_keeps_ties_in_their_order():
    from textstats import top
    assert top({"x": 2, "y": 1, "z": 2}, 2) == [("x", 2), ("z", 2)]


def test_top_of_more_than_there_are_gives_them_all():
    from textstats import top
    assert len(top({"x": 1}, 10)) == 1
```

Each test imports from `textstats`, the script in the project folder. That works because `python -m pytest` puts the current folder on `sys.path`, as `python -c` did in lesson 0.2. (In lesson 1.3 the functions move into your installed package, and the tests import them from there.)

`assert list(counts) == ["b", "a", "c"]` checks the **order** of the dictionary's keys, not just its contents. A Python dictionary remembers the order its keys were added in. That order decides which word wins a tie in the report (`a`, `counts` and `they` each appear 4 times, and print in the order they first appear in the text), so changing it would change the report.

There's a problem before any of these tests can pass, though. When pytest imports `textstats`, Python runs the whole file, including the last four lines. Under pytest, `sys.argv` is pytest's own command line:

```predict
question: Under pytest, `sys.argv` is `["pytest", "-q", "tests/test_pieces.py"]`. What does `import textstats` do?
choice: Nothing: it just imports
choice: It prints the usage line
choice: It tries to read a file named -q, and exits
answer: It tries to read a file named -q, and exits
explain: Importing a module runs it, top to bottom. The last lines see more than one entry in `sys.argv`, so they call `go(sys.argv[1])`, which is `go("-q")`. Opening a file named `-q` fails, the bare `except:` prints "couldn't read -q", and `sys.exit()` raises `SystemExit`, which ends the import. Every test that imports `textstats` would fail with that, before testing anything.
verify: script import_under_pytest.py
```

```check
file tests/test_pieces.py -- Click "Create provided tests/test_pieces.py" above.
```

## Safe to import

A module that does things when it's imported can't be used by other code. The fix is the most common two lines in Python scripts. Move the last four lines into a function `main`, and call it only when the file is run as a program:

```python file=textstats.py
# textstats.py - word stats for a text file
# usage: python textstats.py file.txt
import sys

counts = {}
letters = {}
total = 0


def go(fname):
    global total
    try:
        f = open(fname)
        data = f.read()
        f.close()
    except:
        print("couldn't read " + fname)
        sys.exit()
    lines = data.split("\n")
    nlines = 0
    for l in lines:
        if l.strip() != "":
            nlines = nlines + 1
    for l in lines:
        for w in l.split():
            w = w.strip(".,;:!?\"()'").lower()
            if w == "":
                continue
            total = total + 1
            if w in counts:
                counts[w] = counts[w] + 1
            else:
                counts[w] = 1
    for l in lines:
        for c in l:
            c = c.lower()
            if not c.isalpha():
                continue
            if c in letters:
                letters[c] = letters[c] + 1
            else:
                letters[c] = 1
    print("lines: " + str(nlines))
    print("words: " + str(total))
    print("unique words: " + str(len(counts)))
    longest = ""
    for w in counts:
        if len(w) > len(longest):
            longest = w
    print("longest word: " + longest)
    s = 0
    for w in counts:
        s = s + len(w) * counts[w]
    print("average word length: " + str(round(s / total, 2)))
    print()
    print("top words:")
    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    for i in range(10):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))
    print()
    print("top letters:")
    top = sorted(letters.items(), key=lambda x: x[1], reverse=True)
    for i in range(5):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))


def main():
    if len(sys.argv) < 2:
        print("usage: python textstats.py file.txt")
    else:
        go(sys.argv[1])


if __name__ == "__main__":
    main()
```

Every module has a variable `__name__`. When the file is run as a program (`python textstats.py`), Python sets it to `"__main__"`. When the file is imported, it's the module's name, `"textstats"`. So `main()` runs for `python textstats.py data/sample.txt`, and never for `import textstats`.

Run the characterisation test. It runs the script as a program, so the report should be exactly the same:

```powershell
.venv\Scripts\python -m pytest -q tests/test_legacy_output.py
```

```check
run ".venv/Scripts/python -c \"import sys; sys.argv = ['pytest', '-q']; import textstats; print('imported')\"" stdout="imported" label="importing textstats runs nothing" -- Move the last lines into def main(): and call it under if __name__ == "__main__":
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="the report hasn't changed" -- Compare your file with the one above.
```

## Words and lines

Now take jobs out of `go`, one at a time. First, counting lines and splitting the text into words. Each becomes a function that takes text and returns a value, and prints nothing. Add the two functions, a named constant for the punctuation, and use them in `go`:

```python file=textstats.py
# textstats.py - word stats for a text file
# usage: python textstats.py file.txt
import sys

PUNCTUATION = ".,;:!?\"()'"

counts = {}
letters = {}
total = 0


def count_lines(text):
    """How many lines have something on them."""
    return sum(1 for line in text.split("\n") if line.strip())


def split_words(text):
    """The words in text: lower case, without punctuation at either end."""
    words = []
    for word in text.split():
        word = word.strip(PUNCTUATION).lower()
        if word:
            words.append(word)
    return words


def go(fname):
    global total
    try:
        f = open(fname)
        data = f.read()
        f.close()
    except:
        print("couldn't read " + fname)
        sys.exit()
    lines = data.split("\n")
    for w in split_words(data):
        total = total + 1
        if w in counts:
            counts[w] = counts[w] + 1
        else:
            counts[w] = 1
    for l in lines:
        for c in l:
            c = c.lower()
            if not c.isalpha():
                continue
            if c in letters:
                letters[c] = letters[c] + 1
            else:
                letters[c] = 1
    print("lines: " + str(count_lines(data)))
    print("words: " + str(total))
    print("unique words: " + str(len(counts)))
    longest = ""
    for w in counts:
        if len(w) > len(longest):
            longest = w
    print("longest word: " + longest)
    s = 0
    for w in counts:
        s = s + len(w) * counts[w]
    print("average word length: " + str(round(s / total, 2)))
    print()
    print("top words:")
    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    for i in range(10):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))
    print()
    print("top letters:")
    top = sorted(letters.items(), key=lambda x: x[1], reverse=True)
    for i in range(5):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))


def main():
    if len(sys.argv) < 2:
        print("usage: python textstats.py file.txt")
    else:
        go(sys.argv[1])


if __name__ == "__main__":
    main()
```

- **`PUNCTUATION`** is a **constant**: a value given a name once, at the top of the module. Capital letters are the convention for "never reassigned". The string was buried in a loop. Now it has a name that says what it is, and one place to change it.
- **`if line.strip()`**: an empty string counts as false in an `if`, and any other string as true. So this is the old `!= ""` test, shorter.
- **`sum(1 for line in ... if ...)`** adds a 1 for each line that passes the test, which counts them. The part inside `sum(...)` is a **generator expression**: like a loop that hands each value straight to `sum`, without building a list first.
- **`text.split()`** with no argument splits on any run of spaces, tabs or newlines. Splitting the whole text at once gives the same words as splitting each line, so `split_words` doesn't need the lines at all.
- **Docstrings.** The first line of each function says what it returns. If you can't say that in one line, the function is probably doing two jobs.

Run both test files. `-k lines` and `-k split` choose just the tests for these two functions:

```powershell
.venv\Scripts\python -m pytest -q tests/test_pieces.py -k "lines or split"
.venv\Scripts\python -m pytest -q tests/test_legacy_output.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_pieces.py -k lines" label="count_lines ignores blank lines" -- Count the lines where line.strip() isn't empty.
run ".venv/Scripts/python -m pytest -q tests/test_pieces.py -k split" label="split_words strips punctuation and lower-cases" -- Strip PUNCTUATION from both ends of each word, lower-case it, and skip it if nothing is left.
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="the report hasn't changed" -- Compare your file with the one above.
```

## Count anything

The word-counting loop and the letter-counting loop are the same loop: for each item, add one to its count. Write it once, as `tally`, and feed it either list. Then nothing needs the globals any more, so delete them:

```python file=textstats.py
# textstats.py - word stats for a text file
# usage: python textstats.py file.txt
import sys

PUNCTUATION = ".,;:!?\"()'"


def count_lines(text):
    """How many lines have something on them."""
    return sum(1 for line in text.split("\n") if line.strip())


def split_words(text):
    """The words in text: lower case, without punctuation at either end."""
    words = []
    for word in text.split():
        word = word.strip(PUNCTUATION).lower()
        if word:
            words.append(word)
    return words


def letters(text):
    """Every letter in text, lower case, in order."""
    return [c for c in text.lower() if c.isalpha()]


def tally(items):
    """How many times each item appears, in order of first appearance."""
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def go(fname):
    try:
        f = open(fname)
        data = f.read()
        f.close()
    except:
        print("couldn't read " + fname)
        sys.exit()
    words = split_words(data)
    counts = tally(words)
    letter_counts = tally(letters(data))
    print("lines: " + str(count_lines(data)))
    print("words: " + str(len(words)))
    print("unique words: " + str(len(counts)))
    longest = ""
    for w in counts:
        if len(w) > len(longest):
            longest = w
    print("longest word: " + longest)
    s = 0
    for w in counts:
        s = s + len(w) * counts[w]
    print("average word length: " + str(round(s / len(words), 2)))
    print()
    print("top words:")
    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    for i in range(10):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))
    print()
    print("top letters:")
    top = sorted(letter_counts.items(), key=lambda x: x[1], reverse=True)
    for i in range(5):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))


def main():
    if len(sys.argv) < 2:
        print("usage: python textstats.py file.txt")
    else:
        go(sys.argv[1])


if __name__ == "__main__":
    main()
```

- **`counts.get(item, 0)`** returns the item's count, or `0` if the item isn't in the dictionary yet. It replaces the four-line `if ... in ... else`.
- **`[c for c in text.lower() if c.isalpha()]`** is a **list comprehension**: a generator expression in square brackets, which builds the list. It reads like the loop it replaces: every `c` in the lower-cased text, if it's a letter.
- `tally` works on any list: words, letters, or (in Chapter 26) pairs of letters. That's what one function instead of two copies buys.
- `counts` is now a **local** variable of `go`, made fresh on every call, and `total` is just `len(words)`.

```predict
question: The globals are gone. In one Python session, `go("data/sample.txt")` is called twice. What does the second call print as `words:`?
choice: 100
choice: 200
choice: It crashes
answer: 100
explain: Every call makes its own `words` and `counts`, and they disappear when it returns. Nothing carries over between calls, so each call reports on the file and nothing else. The bug from lesson 1.1's prediction is gone, and no test had to be written about it: a function that only uses its arguments can't have that bug.
verify: script calls_twice_now.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_pieces.py -k tally" label="tally counts items in order of first appearance" -- Add one to counts.get(item, 0) for each item.
run ".venv/Scripts/python -m pytest -q tests/test_pieces.py -k letters" label="letters keeps only letters, lower case" -- Lower-case the text, then keep the characters where c.isalpha() is true.
lacks textstats.py "global" label="no globals are left" -- Delete counts, letters and total from the top of the file, and the global line in go.
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="the report hasn't changed" -- Compare your file with the one above.
```

## Names that say what

Two statistics still take a loop each, and the function's name still says nothing. Python has a built-in for each loop. Rename `go` to `print_report`, which is what it does, and rename its variables to match:

```python file=textstats.py
# textstats.py - word stats for a text file
# usage: python textstats.py file.txt
import sys

PUNCTUATION = ".,;:!?\"()'"


def count_lines(text):
    """How many lines have something on them."""
    return sum(1 for line in text.split("\n") if line.strip())


def split_words(text):
    """The words in text: lower case, without punctuation at either end."""
    words = []
    for word in text.split():
        word = word.strip(PUNCTUATION).lower()
        if word:
            words.append(word)
    return words


def letters(text):
    """Every letter in text, lower case, in order."""
    return [c for c in text.lower() if c.isalpha()]


def tally(items):
    """How many times each item appears, in order of first appearance."""
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def print_report(path):
    try:
        f = open(path)
        text = f.read()
        f.close()
    except:
        print("couldn't read " + path)
        sys.exit()
    words = split_words(text)
    counts = tally(words)
    letter_counts = tally(letters(text))
    average = sum(len(word) for word in words) / len(words)
    print("lines: " + str(count_lines(text)))
    print("words: " + str(len(words)))
    print("unique words: " + str(len(counts)))
    print("longest word: " + max(counts, key=len))
    print("average word length: " + str(round(average, 2)))
    print()
    print("top words:")
    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    for i in range(10):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))
    print()
    print("top letters:")
    top = sorted(letter_counts.items(), key=lambda x: x[1], reverse=True)
    for i in range(5):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))


def main():
    if len(sys.argv) < 2:
        print("usage: python textstats.py file.txt")
    else:
        print_report(sys.argv[1])


if __name__ == "__main__":
    main()
```

- **`max(counts, key=len)`**: looping over a dictionary gives its keys, so this is the word with the largest `len`. When several words tie for longest, `max` returns the first one it meets, exactly like the old loop, which only replaced `longest` when a word was strictly longer.
- **The average.** The old loop added `len(w) * counts[w]` over the unique words: each word's length, once for every time it appears. That's the same total as adding the length of every word in `words`, which says it more directly.
- **Names.** `go` became `print_report`, `fname` became `path` and `data` became `text`. Use `F2` (Rename Symbol) in the editor, and it renames a name everywhere it's used, without touching other words that happen to contain the same letters.

```predict
question: `max(["cat", "horse", "mouse"], key=len)` returns what?
choice: cat
choice: horse
choice: mouse
answer: horse
explain: `horse` and `mouse` both have 5 letters. `max` keeps the first value it has seen with the largest key, and only replaces it when a later one is strictly larger. So ties go to the first, which is why the report's longest word stays the same.
verify: .venv/Scripts/python -c "print(max(['cat', 'horse', 'mouse'], key=len))"
```

```check
run ".venv/Scripts/python -c \"import textstats; print(textstats.print_report.__name__)\"" stdout="print_report" label="go is now print_report" -- Rename def go to def print_report, and its call in main.
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="the report hasn't changed" -- Compare your file with the one above.
```

## Your turn: one function for both tables

**Build, on your own:** the two "top" tables are still copy and paste, with a magic number each. Replace them:

1. Two constants under `PUNCTUATION`: `TOP_WORDS = 10` and `TOP_LETTERS = 5`.
2. A function `top(counts, n)` that returns the `n` most common items as a list of `(item, count)` pairs, most common first. Ties keep the order they have in `counts`, as they do now. If there are fewer than `n` items, it returns them all. The tests `test_top_…` say exactly what it must do.
3. A function `print_top(title, counts, n)` that prints the title and then one line per pair, indented two spaces, as the report does now.
4. In `print_report`, the two tables become one `print_top(...)` call each, and the `range` loops are gone.

Then run both test files. `print_report` ends up about fifteen lines long, and each line says what it does.

```hints
nudge: Start with `top`: it's the `sorted(...)` line that's already in `print_report`, plus a way to keep only the first `n` pairs. Then `print_top` is the printing loop, using `top`.
concept: `some_list[:n]` is the first `n` items of a list, or the whole list if it's shorter, so it replaces `for i in range(10): if i < len(top)`. `sorted` keeps items that compare equal in their original order (it's a **stable** sort), so ties stay in order of first appearance. `for item, count in pairs:` unpacks each pair into two names.
answer: Under `PUNCTUATION`:
~~~python
TOP_WORDS = 10
TOP_LETTERS = 5
~~~
Before `print_report`:
~~~python
def top(counts, n):
    """The n most common items, as (item, count) pairs, most common first."""
    return sorted(counts.items(), key=lambda pair: pair[1], reverse=True)[:n]


def print_top(title, counts, n):
    print(title)
    for item, count in top(counts, n):
        print("  " + item + " " + str(count))
~~~
In `print_report`, the end becomes:
~~~python
    print()
    print_top("top words:", counts, TOP_WORDS)
    print()
    print_top("top letters:", tally(letters(text)), TOP_LETTERS)
~~~
and the `letter_counts = ...` line can go.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_pieces.py -k top" label="top gives the n most common pairs, ties in order" -- Sort counts.items() by count, largest first, and keep the first n with [:n].
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="the report hasn't changed" -- Run the test and read pytest's comparison: which lines of the report differ?
matches textstats.py "TOP_WORDS\s*=\s*10" label="the 10 has a name" -- Add TOP_WORDS = 10 under PUNCTUATION.
matches textstats.py "TOP_LETTERS\s*=\s*5" label="the 5 has a name" -- Add TOP_LETTERS = 5 under PUNCTUATION.
lacks textstats.py "range(" label="the copied table loops are gone" -- Print both tables with print_top, and delete the for i in range(...) loops.
```

## Bring it into `main`

The work is done and every test passes, so it can join `main`. First commit it on this branch:

```powershell
git add .
git commit -m "Split go into small functions"
```

Then switch to `main` and **merge** the branch into it:

```powershell
git switch main
git merge functions
```

When you switch to `main`, `textstats.py` in your editor goes back to the old version, because that's what `main` holds. Merging brings the branch's commits in. Since `main` hasn't changed since you branched, Git just moves `main` forward to the branch's last commit. That's called a **fast-forward**, and Git says so in its output. Now both names point at the same commit, and the branch has done its job. Delete it:

```powershell
git branch -d functions
```

`-d` only deletes a branch that has been merged, so it can't lose work. `git log --oneline` now shows the whole story on `main`: the script as given, the safety net, and the refactor.

```check
git-branch main -- Run git switch main
git-no-branch functions -- Merge it first (git merge functions), then delete it: git branch -d functions
contains textstats.py "def print_top" label="main has the refactored script" -- On main, run git merge functions
git-clean -- Something isn't committed yet. Run git status to see what.
```

### What you have

```text
textstats.py
  PUNCTUATION, TOP_WORDS, TOP_LETTERS
  count_lines(text)        split_words(text)      letters(text)
  tally(items)             top(counts, n)         print_top(title, counts, n)
  print_report(path)       main()
tests/
  test_pieces.py           one test per job
  test_legacy_output.py    the report, unchanged
```

`print_report` still does two jobs: it works out the statistics *and* prints them. Lesson 1.3 moves the functions into your package, with type hints, and lesson 1.4 separates working out from printing.
