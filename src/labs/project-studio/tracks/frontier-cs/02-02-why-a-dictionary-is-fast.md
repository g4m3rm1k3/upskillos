---
title: 2.2 — Why a Dictionary Is Fast
runtime: python
support: tests/conftest.py
---

Last lesson, `word not in seen` cost one comparison per word in a list, but about the same tiny time however big a dictionary got. There's no magic in that. A dictionary doesn't search through its keys at all: it works out **where** a key must be, and looks only there.

In this lesson you build that by hand: a `WordSet` that stores words the way Python's `set` and `dict` store their keys. It has three parts. A **hash function** turns a word into a number. The number picks one of a row of **buckets**. A word is kept in its bucket, and looking it up searches only that bucket. You'll also find out what goes wrong when the hash function is a bad one. Hashing comes back throughout the series: the tokenizer in Chapter 28, for one, is built on dictionaries keyed by pairs of tokens.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_hashing.py**:

```python file=tests/test_hashing.py provided
# Tests for frontier.hashing (lesson 2.2): a set of words, built by hand.


def test_letters_add_up():
    from frontier.hashing import letter_sum
    assert letter_sum("ab") == 97 + 98
    assert letter_sum("") == 0


def test_bucket_holds_the_word_once():
    from frontier.hashing import WordSet, letter_sum
    words = WordSet(buckets=8, hash_fn=letter_sum)
    words.add("cat")
    words.add("cat")
    assert words.bucket("cat") == ["cat"]
    assert words.buckets[letter_sum("cat") % 8] == ["cat"]
    assert sum(len(b) for b in words.buckets) == 1


def test_membership_and_length():
    from frontier.hashing import WordSet
    words = WordSet()
    for word in ["the", "cat", "sat", "the"]:
        words.add(word)
    assert "cat" in words
    assert "dog" not in words
    assert len(words) == 3


def test_grow_doubles_the_table_when_there_are_more_words_than_slots():
    from frontier.hashing import WordSet
    words = WordSet(buckets=4)
    for i in range(4):
        words.add(f"w{i}")
    assert len(words.buckets) == 4
    words.add("w4")
    assert len(words.buckets) == 8
    assert all(f"w{i}" in words for i in range(5))


def test_poly_hash_tells_anagrams_apart():
    from frontier.hashing import poly_hash
    assert poly_hash("ab") == 97 * 31 + 98
    assert poly_hash("listen") != poly_hash("silent")


def test_poly_hash_is_the_default():
    from frontier.hashing import WordSet, poly_hash
    assert WordSet().hash_fn is poly_hash
```

In order:

- **`letter_sum`** turns a word into a number by adding up its letters' codes. Every character has a code: `a` is 97, `b` is 98.
- **`WordSet(buckets=8, hash_fn=letter_sum)`** has a list of 8 buckets and a hash function, passed in as an argument the way you passed functions to `best_of` last lesson. `bucket("cat")` is the one bucket where `"cat"` belongs, and adding a word twice keeps it once.
- **`in` and `len`** work on a `WordSet` just as they do on a `set`.
- **Growing:** when there are more words than buckets, the number of buckets doubles, and every word can still be found.
- **`poly_hash`**, your Your turn, is a better hash function, and becomes the default.

```check
file tests/test_hashing.py -- Click "Create provided tests/test_hashing.py" above.
```

## A word as a number

A **hash function** turns a value into a whole number, always the same number for the same value. That's all it has to do. A good one also gives *different* values different numbers as often as it can, and you'll see why that matters.

The simplest idea is to add up the letters. `ord(c)` gives a character's code (`ord("a")` is 97). The generator expression below goes through the word's characters, and `sum` adds up their codes. Create `src/frontier/hashing.py`:

```python file=src/frontier/hashing.py
"""A set of words built by hand: what makes dictionaries and sets fast."""


def letter_sum(word: str) -> int:
    """The word's letter codes added up."""
    return sum(ord(c) for c in word)
```

`letter_sum("cat")` is 99 + 97 + 116 = 312, and it is 312 every time. It's quick to compute, too: one step per letter, however many words you store.

```predict
question: Do `letter_sum("listen")` and `letter_sum("silent")` give the same number?
choice: the same number
choice: different numbers
answer: the same number
explain: They're anagrams: the same six letters in a different order. Adding doesn't care about order, so their sums are equal (655 each). Two different values with the same hash are called a **collision**. Every hash function has some, because there are far more possible words than numbers it gives out in practice. A good hash function makes collisions rare; this one makes them common.
verify: script anagram_sum.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_hashing.py -k letters" label="letter_sum adds up the letter codes" -- Return sum(ord(c) for c in word).
```

## Buckets

Now the table. It is a list of buckets, and each bucket is a list of words. To decide where a word goes, take its hash and divide by the number of buckets. The **remainder**, written `%` in Python, is always between 0 and one less than the number of buckets, so it's a valid position. `312 % 8` is 0, because 312 is exactly 39 eights, so `"cat"` goes in bucket 0 of 8.

`WordSet` stores three things. `hash_fn` is the hash function, with `letter_sum` as its default. Its hint `Callable[[str], int]` says it takes a `str` and returns an `int`. `buckets` is the list of empty buckets. `size` is how many words it holds. The buckets are made with a list comprehension, because `[[]] * 8` would put *the same* empty list in all eight places, and a word added to one would appear in all of them. `__init__` returns nothing, and mypy `--strict` wants that said as `-> None`.

Add the import at the top of `src/frontier/hashing.py` and the class at the end:

```python file=src/frontier/hashing.py
"""A set of words built by hand: what makes dictionaries and sets fast."""
from collections.abc import Callable


def letter_sum(word: str) -> int:
    """The word's letter codes added up."""
    return sum(ord(c) for c in word)


class WordSet:
    """A set of words, each kept in the bucket its hash picks."""

    def __init__(self, buckets: int = 8, hash_fn: Callable[[str], int] = letter_sum) -> None:
        self.hash_fn = hash_fn
        self.buckets: list[list[str]] = [[] for _ in range(buckets)]
        self.size = 0

    def bucket(self, word: str) -> list[str]:
        """The one bucket where word belongs."""
        return self.buckets[self.hash_fn(word) % len(self.buckets)]

    def add(self, word: str) -> None:
        bucket = self.bucket(word)
        if word not in bucket:
            bucket.append(word)
            self.size += 1
```

`bucket` is the heart of it. It hashes the word, takes the remainder, and returns that one bucket. `add` looks only in that bucket. If the word isn't already there, it appends it and counts it.

`word not in bucket` is still a search through a list, exactly as slow per item as `unique_by_list`. The difference is the length of the list. If the words are spread evenly, each bucket holds only a few, whatever the total.

```check
run ".venv/Scripts/python -m pytest -q tests/test_hashing.py -k bucket" label="a word goes into its one bucket, once" -- bucket returns self.buckets[self.hash_fn(word) % len(self.buckets)]; add appends only when the word isn't in that bucket.
run ".venv/Scripts/python -m mypy --strict src/frontier/hashing.py" stdout="Success" label="mypy --strict passes" -- __init__ and add need -> None; buckets needs list[list[str]].
```

## `in` and `len` for your own class

Lesson 1.4 showed that `==` calls a method named `__eq__`. `in` and `len` work the same way. `word in words` calls `words.__contains__(word)`, and `len(words)` calls `words.__len__()`. Methods with double underscores at both ends, like these, are how a class hooks into Python's own syntax. Add both at the end of the class:

```python file=src/frontier/hashing.py
"""A set of words built by hand: what makes dictionaries and sets fast."""
from collections.abc import Callable


def letter_sum(word: str) -> int:
    """The word's letter codes added up."""
    return sum(ord(c) for c in word)


class WordSet:
    """A set of words, each kept in the bucket its hash picks."""

    def __init__(self, buckets: int = 8, hash_fn: Callable[[str], int] = letter_sum) -> None:
        self.hash_fn = hash_fn
        self.buckets: list[list[str]] = [[] for _ in range(buckets)]
        self.size = 0

    def bucket(self, word: str) -> list[str]:
        """The one bucket where word belongs."""
        return self.buckets[self.hash_fn(word) % len(self.buckets)]

    def add(self, word: str) -> None:
        bucket = self.bucket(word)
        if word not in bucket:
            bucket.append(word)
            self.size += 1

    def __contains__(self, word: str) -> bool:
        return word in self.bucket(word)

    def __len__(self) -> int:
        return self.size
```

`__contains__` finds the word's bucket and asks the bucket. That `in` is the list's own `in`, so there's no endless loop. `__len__` returns the count that `add` keeps up to date, without counting anything.

```check
run ".venv/Scripts/python -m pytest -q tests/test_hashing.py -k membership" label="in and len work on a WordSet" -- __contains__ returns word in self.bucket(word); __len__ returns self.size.
```

## Growing

There's a problem with a fixed number of buckets. Put 8000 words in 8 buckets and each holds about 1000. Every lookup then searches a 1000-word list, which makes the table just a list divided by 8: still O(n).

The fix is to add buckets as the words arrive. Whenever there are more words than buckets, `grow` doubles the number of buckets. Then each bucket holds about one word on average, however many words there are. The words have to **move**, because a word's bucket is its hash *remainder the number of buckets*, and that number just changed. So `grow` collects every word first, makes the new empty buckets, and puts each word back where it now belongs.

The collecting line is a list comprehension with **two `for`s**. They read left to right, like two nested loops: for each bucket, for each word in that bucket, keep the word. Add the last three lines to `add`, and `grow` after it:

```python file=src/frontier/hashing.py
"""A set of words built by hand: what makes dictionaries and sets fast."""
from collections.abc import Callable


def letter_sum(word: str) -> int:
    """The word's letter codes added up."""
    return sum(ord(c) for c in word)


class WordSet:
    """A set of words, each kept in the bucket its hash picks."""

    def __init__(self, buckets: int = 8, hash_fn: Callable[[str], int] = letter_sum) -> None:
        self.hash_fn = hash_fn
        self.buckets: list[list[str]] = [[] for _ in range(buckets)]
        self.size = 0

    def bucket(self, word: str) -> list[str]:
        """The one bucket where word belongs."""
        return self.buckets[self.hash_fn(word) % len(self.buckets)]

    def add(self, word: str) -> None:
        bucket = self.bucket(word)
        if word not in bucket:
            bucket.append(word)
            self.size += 1
            if self.size > len(self.buckets):
                self.grow()

    def grow(self) -> None:
        """Twice as many buckets, and every word moved to its new bucket."""
        words = [word for bucket in self.buckets for word in bucket]
        self.buckets = [[] for _ in range(2 * len(self.buckets))]
        for word in words:
            self.bucket(word).append(word)

    def __contains__(self, word: str) -> bool:
        return word in self.bucket(word)

    def __len__(self) -> int:
        return self.size
```

`grow` moves every word, which is O(n) work, so you might expect `add` to become slow. It doesn't, because growing gets rarer as the table fills. It happens at 9 words, then 17, 33, 65, and so on, each time after twice as many words as the time before. Add up all the moves so far and they come to fewer than two per word stored. Spread over all the `add`s, each one costs a fixed amount on average: O(1) **amortised**, which means "averaged over many calls".

```predict
question: `WordSet(buckets=4)` is given 5 different words. How many buckets does it have afterwards?
choice: 4
choice: 5
choice: 8
answer: 8
explain: The first four words fit: 4 words in 4 buckets isn't more words than buckets. The fifth makes `size` 5, which is more than 4, so `grow` doubles the buckets to 8 and moves all five words into their new places.
verify: script grow_buckets.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_hashing.py -k grow" label="the buckets double once there are more words than buckets" -- In add, after counting the word: if self.size > len(self.buckets), call self.grow().
run ".venv/Scripts/python -m mypy --strict src/frontier/hashing.py" stdout="Success" label="mypy --strict still passes" -- grow needs -> None.
```

## Measure it

Time to check the claim. The experiment builds a list, a `WordSet` and Python's own `set` from the same n words. It then times looking up 1000 words that are there: the **last** 1000, the worst case for a list, which searches from the front. `words[n - 1000:]` slices them off the end. The generator expression `sum(1 for p in probes if p in words)` does all 1000 lookups and counts the hits.

The last column is the longest bucket in the `WordSet`. That is the most comparisons any single lookup can need. `max(len(b) for b in table.buckets)` finds it. Create `experiments/time_lookup.py`:

```python file=experiments/time_lookup.py
"""Looking up 1000 words in a list, a WordSet and a set, as the number of words grows."""
from frontier.bench import best_of
from frontier.hashing import WordSet

for n in [1000, 2000, 4000, 8000]:
    words = [f"word{i}" for i in range(n)]
    probes = words[n - 1000:]
    table = WordSet()
    for word in words:
        table.add(word)
    builtin = set(words)
    as_list = best_of(lambda: sum(1 for p in probes if p in words), repeats=3)
    as_table = best_of(lambda: sum(1 for p in probes if p in table), repeats=3)
    as_set = best_of(lambda: sum(1 for p in probes if p in builtin), repeats=3)
    print(f"{n:>5} words   list {as_list:.4f} s   WordSet {as_table:.4f} s   set {as_set:.4f} s   longest bucket {max(len(b) for b in table.buckets)}")
```

Run it:

```powershell
.venv\Scripts\python experiments/time_lookup.py
```

The list's time grows at least as fast as n: lookups in a list are O(n). The `set` barely moves. Your `WordSet` is far faster than the list, but its time still climbs. Look at the last column: the longest bucket holds **hundreds** of words, and gets longer as n grows. With 8000 words in 8192 buckets, there should be about one word per bucket.

`letter_sum` is to blame. The words are `word0` to `word7999`. They all start with `word`, and their digits only shuffle a handful of characters, so their sums bunch into a few dozen values. Every word with the same sum lands in the same bucket, however many buckets there are. Try it in the figure: the words below are anagram pairs, the worst case for `letter_sum`. Change the number of buckets and the pairs never split up.

```figure
name: frontier/HashBuckets
caption: Each word goes to bucket hash(word) % buckets. With letter_sum, anagrams always share a bucket; switch to poly_hash and they separate.
props: {"words": ["listen", "silent", "enlist", "cat", "act", "dog", "god", "word12", "word21", "word3"], "buckets": 8}
```

```check
run ".venv/Scripts/python experiments/time_lookup.py" stdout="longest bucket" label="the experiment runs" -- Check the imports: best_of from frontier.bench, WordSet from frontier.hashing.
```

## Your turn: a hash where order matters

**Build, on your own:** a function `poly_hash(word)` in `src/frontier/hashing.py`, and make it `WordSet`'s default `hash_fn` in place of `letter_sum`.

`poly_hash` starts with `h = 0`. Then, for each character `c` of the word in turn, it sets `h = h * 31 + ord(c)`, and at the end it returns `h`. Multiplying by 31 before adding each letter gives each position a different weight. `"ab"` is 97 × 31 + 98, while `"ba"` is 98 × 31 + 97, so anagrams no longer collide. Give it the hints `word: str` and `-> int`.

Then run the tests and the experiment again:

```powershell
.venv\Scripts\python -m pytest -q tests/test_hashing.py
.venv\Scripts\python experiments/time_lookup.py
```

The longest bucket drops from hundreds to a handful, and the `WordSet` column stops growing with n, just like the `set`'s. It's still slower than `set`, which is written in C, but now it grows the same way. In the figure above, switch to `poly_hash` and watch the anagrams split up.

```hints
nudge: It's a loop with a running total, like the loops in Chapter 1, except each step multiplies the total by 31 before adding the letter's code.
concept: A default value is worked out when the `def` line runs, so `poly_hash` must already exist by then: define it above the class. Then change `hash_fn: Callable[[str], int] = letter_sum` to `= poly_hash`. Keep `letter_sum`: the tests still use it.
answer: Above `class WordSet`:
~~~python
def poly_hash(word: str) -> int:
    """A hash where each letter's position matters, so anagrams differ."""
    h = 0
    for c in word:
        h = h * 31 + ord(c)
    return h
~~~
and in `__init__`, `hash_fn: Callable[[str], int] = poly_hash`.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_hashing.py -k poly" label="poly_hash weighs each position, and is the default" -- Multiply h by 31 before adding each ord(c); then use poly_hash as hash_fn's default (define it above the class).
run ".venv/Scripts/python -m pytest -q tests/test_hashing.py" label="every WordSet test still passes" -- The bucket test passes letter_sum in itself, so it doesn't depend on the default.
run ".venv/Scripts/python -m mypy --strict src/frontier/hashing.py" stdout="Success" label="mypy --strict still passes" -- poly_hash needs hints: word: str and -> int.
```

## Python's own, and onto GitHub

Python's `dict` and `set` are hash tables like yours, written in C. They differ in the details: instead of a list per bucket, a word that collides tries the next free slot by a fixed rule. A `set` stores only keys; a `dict` stores a value beside each key. The hash function is the built-in `hash()`. Run this twice:

```powershell
.venv\Scripts\python -c "print(hash('cat'))"
.venv\Scripts\python -c "print(hash('cat'))"
```

The two numbers differ. Python picks a fresh random ingredient for string hashes each time it starts. Within one run `hash('cat')` never changes, which is all a dictionary needs. Between runs it changes on purpose, after a real attack in 2011: people sent web servers thousands of form fields whose names all collided. That turned each server's dictionary into one long list, the problem you just saw with `letter_sum`, on purpose. A random ingredient means nobody can work out collisions in advance.

A key must keep the same hash for as long as it's in the table. Otherwise it would sit in a bucket its hash no longer points to, and nobody could find it. So Python only lets values that can't change be keys: strings, numbers, and tuples of those. A list can change after it's stored, with `append`.

```predict
question: What does `{["the", "cat"]: 1}` do?
choice: makes a dictionary with one key
choice: TypeError
choice: KeyError
answer: TypeError
explain: `TypeError: unhashable type: 'list'`. A list can change after it is stored, so Python refuses to hash it. A tuple, `("the", "cat")`, works: it can't change. Chapter 28's tokenizer counts pairs of tokens with exactly such tuple keys.
verify: script unhashable.py
```

Commit and push:

```powershell
git add .
git commit -m "Build a hash table by hand"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  hashing.py             letter_sum, poly_hash, WordSet: buckets, in, len, growing
experiments/
  time_lookup.py         list vs WordSet vs set, and the longest bucket
tests/
  test_hashing.py
```

The rule from these two lessons, in one line: **to ask "is it there?" over and over, use a `set` or a `dict`, never a list.** Next lesson: a different question, "which is the smallest?", asked over and over while items keep arriving. A **heap** answers it in O(log n), and the tokenizer and every search algorithm in this series rely on one.
