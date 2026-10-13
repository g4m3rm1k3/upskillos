---
title: 2.1 — How Slow Grows
track: Frontier — The Computer Science You Need
trackOrder: 15.02
runtime: python
support: tests/conftest.py
---

Your text-statistics command counts a 100-word file before you can blink. Would it still be fast on a whole book? On all of Wikipedia? "Fast" on today's data says little about tomorrow's. What matters is how the time **grows** as the data grows.

This chapter is the computer science the rest of the series leans on. It starts with the most useful idea in it: measure how the time grows as the data doubles, then explain it by counting steps. The idea has a name, **big-O**, and it comes up again and again. Attention, the heart of every language model, compares each word with every other word. That makes it O(n²), which is why long documents are expensive (Chapters 33 and 42 measure it). Search in Chapter 57 is a fight against growth that is far worse.

You'll build two functions that do the same job with nearly the same code, and find that one of them is hundreds of times slower on big inputs.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_bench.py**:

```python file=tests/test_bench.py provided
# Tests for frontier.bench (lesson 2.1). A time is never exactly the same twice, so these test
# what can be pinned down: how often the function is called, and which run is kept.
import time


def test_best_of_calls_the_function_each_time():
    from frontier.bench import best_of
    calls = []
    best_of(lambda: calls.append(1), repeats=4)
    assert len(calls) == 4


def test_best_of_keeps_the_fastest_run():
    from frontier.bench import best_of
    pauses = [0.05, 0.0, 0.05]
    seconds = best_of(lambda: time.sleep(pauses.pop()), repeats=3)
    assert seconds < 0.03


def test_ratios_divide_each_time_by_the_one_before():
    from frontier.bench import ratios
    assert ratios([1.0, 2.0, 8.0]) == [2.0, 4.0]


def test_ratios_of_one_time_are_empty():
    from frontier.bench import ratios
    assert ratios([0.5]) == []
```

What it asks for:

- **`best_of(fn, repeats)`** calls the function `fn` several times, times each call, and returns the fastest. The first test counts the calls: its `lambda` adds to a list each time it's called. The second hands `best_of` a function that pauses (`time.sleep(seconds)` waits that long) for 0.05 s, then not at all, then 0.05 s again. Only the run with no pause is under 0.03 s, so the test passes only if the fastest run is the one kept.
- **`ratios(times)`** says how many times longer each time is than the one before: 2.0 is twice 1.0, and 8.0 is four times 2.0. That's your Your turn.

```check
file tests/test_bench.py -- Click "Create provided tests/test_bench.py" above.
```

## A stopwatch

To time code you need a clock. The standard library's `time` module has several, and `time.perf_counter()` is the one built for this: it returns a number of seconds, as a float, from a clock that ticks far faster than a millisecond. Its value on its own means nothing. The difference between two readings is the time that passed between them.

One timing isn't enough. Your computer is doing other things too (the editor, the browser, the operating system), and any of them can steal a moment in the middle of a run. They can only ever make a run **slower**, never faster, so the fastest of several runs is the closest to what the code itself costs. That's what `best_of` returns.

`best_of` takes a function as an argument. In Python a function is a value like any other: `fn` is the function, and `fn()` calls it. The type hint `Callable[[], object]` (`Callable` is from `collections.abc`) says "a function that takes no arguments and returns anything". The loop variable is named `_`, Python's usual name for a value you don't use. Create `src/frontier/bench.py`:

```python file=src/frontier/bench.py
"""Timing code: how long a function takes."""
import time
from collections.abc import Callable


def best_of(fn: Callable[[], object], repeats: int = 5) -> float:
    """The fastest of several timed calls of fn(), in seconds."""
    times = []
    for _ in range(repeats):
        start = time.perf_counter()
        fn()
        times.append(time.perf_counter() - start)
    return min(times)
```

Each pass of the loop reads the clock, calls `fn()`, and reads the clock again. The difference between the two readings is how long that one call took, and it goes into `times`. After `repeats` passes, `min` picks the fastest.

```check
run ".venv/Scripts/python -m pytest -q tests/test_bench.py -k best" label="best_of calls fn each time and keeps the fastest run" -- Call fn() between two readings of time.perf_counter(), keep each difference in a list, and return min of the list.
run ".venv/Scripts/python -m mypy --strict src/frontier/bench.py" stdout="Success" label="mypy --strict passes" -- fn's hint is Callable[[], object], imported from collections.abc.
```

## Two functions, one job

Now something to time. Click **Create provided tests/test_growth.py**:

```python file=tests/test_growth.py provided
# Tests for frontier.growth (lesson 2.1): two ways to find the different words in a list.
from frontier.text import split_words

WORDS = split_words("The cat sat. The cat ran! A cat, a hat.")


def test_list_version_keeps_first_appearance_order():
    from frontier.growth import unique_by_list
    assert unique_by_list(WORDS) == ["the", "cat", "sat", "ran", "a", "hat"]


def test_dict_version_finds_the_same_words():
    from frontier.growth import unique_by_dict
    assert unique_by_dict(WORDS) == ["the", "cat", "sat", "ran", "a", "hat"]
```

`unique_by_list` and `unique_by_dict` must both return the different words in `WORDS`, each once, in the order they first appear. `split_words`, from Chapter 1, makes the list: lower case, punctuation gone, so `"The"` and `"the"` count as one word.

```check
file tests/test_growth.py -- Click "Create provided tests/test_growth.py" above.
```

## The slow way

Finding the different words in a list is a job your project already does (`tally`'s keys are exactly that). Here is the most natural way to write it from scratch: go through the words, and keep each one that hasn't been seen yet. Create `src/frontier/growth.py`:

```python file=src/frontier/growth.py
"""Two ways to find the different words in a list, with very different speeds."""


def unique_by_list(words: list[str]) -> list[str]:
    """The different words, in order of first appearance, remembered in a list."""
    seen: list[str] = []
    for word in words:
        if word not in seen:
            seen.append(word)
    return seen
```

It reads well and it's correct. But `word not in seen` hides a loop. To answer it, Python compares `word` with the first item in `seen`, then the second, and so on, until it finds a match or reaches the end. For a word that isn't there yet, it reaches the end every time.

Count what that costs when all the words are different. The first word is compared with nothing, because `seen` is empty. The second is compared with one word, the third with two, and the last with every word before it.

```predict
question: `unique_by_list` is given 1000 different words. How many comparisons does `word not in seen` make in total?
choice: 1000
choice: 499500
choice: 1000000
answer: 499500
explain: 0 + 1 + 2 + … + 999 comparisons. Pairing the first with the last (0 + 999), the second with the second-last (1 + 998), and so on, gives 500 pairs of 999, so 499,500 in all. In general, n different words take n × (n − 1) / 2 comparisons, about n²/2.
verify: script list_comparisons.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_growth.py -k list" label="unique_by_list keeps each word once, in order" -- Append a word to seen only when it isn't in seen already, and return seen.
```

## The same code, with a dictionary

Now the same function, changed in two places. `seen` becomes a dictionary, and a word is remembered by making it a key. The value stored with it (`True`) doesn't matter: only the keys are used. `word not in seen` on a dictionary asks whether `word` is one of its keys. At the end, `list(seen)` makes a list of the keys. A dictionary keeps its keys in the order they were added, as you saw in Chapter 1, so they come out in order of first appearance. Add it at the end of `src/frontier/growth.py`:

```python file=src/frontier/growth.py
"""Two ways to find the different words in a list, with very different speeds."""


def unique_by_list(words: list[str]) -> list[str]:
    """The different words, in order of first appearance, remembered in a list."""
    seen: list[str] = []
    for word in words:
        if word not in seen:
            seen.append(word)
    return seen


def unique_by_dict(words: list[str]) -> list[str]:
    """The same, remembered as the keys of a dictionary."""
    seen: dict[str, bool] = {}
    for word in words:
        if word not in seen:
            seen[word] = True
    return list(seen)
```

Line for line, the two functions do the same thing in the same order. The only real difference is what `seen` is. Whether that difference matters is the next step's question.

```check
run ".venv/Scripts/python -m pytest -q tests/test_growth.py -k dict" label="unique_by_dict finds the same words in the same order" -- Remember each new word as a key (seen[word] = True), and return list(seen).
run ".venv/Scripts/python -m mypy --strict src/frontier/growth.py" stdout="Success" label="mypy --strict passes" -- seen needs a hint: dict[str, bool].
```

## Measure them

Timing belongs in an experiment, like `experiments/first_tensors.py` from lesson 0.3: a script you run to find something out, not part of the package. Create `experiments/time_unique.py`.

It times both functions on lists of 1000, 2000, 4000 and 8000 different words. The words are made with a list comprehension: `f"word{i}"` gives `word0`, `word1`, and so on. `best_of` needs a function that takes no arguments, and `lambda: unique_by_list(words)` is one: calling it calls `unique_by_list(words)`. Three repeats are enough here, because the slowest call takes a noticeable fraction of a second.

The `print` uses two new f-string tricks. A **format spec** goes after a colon inside the braces. `{n:>5}` right-aligns `n` in 5 characters, so the columns line up. `{by_list:.5f}` shows a float with exactly 5 digits after the point.

```python file=experiments/time_unique.py
"""How the time to find the different words grows with the number of words."""
from frontier.bench import best_of
from frontier.growth import unique_by_dict, unique_by_list

SIZES = [1000, 2000, 4000, 8000]

for n in SIZES:
    words = [f"word{i}" for i in range(n)]
    by_list = best_of(lambda: unique_by_list(words), repeats=3)
    by_dict = best_of(lambda: unique_by_dict(words), repeats=3)
    print(f"{n:>5} words   list {by_list:.5f} s   dict {by_dict:.5f} s")
```

Run it. It takes a few seconds, almost all of it in the list version:

```powershell
.venv\Scripts\python experiments/time_unique.py
```

Your numbers depend on your computer, but their **shape** won't. Read each column downwards. Each row has twice as many words as the row before. The dict column roughly **doubles** from row to row. The list column roughly **quadruples**, so by 8000 words it is hundreds of times slower than the dict. Run it again and every number changes a little, but the pattern stays.

That pattern is what **big-O** describes. It ignores the exact time, which depends on the computer, and keeps only how the work grows with the size of the input, *n*.

- `unique_by_list` makes about n²/2 comparisons, as the prediction showed. Big-O drops constant factors like ½ and keeps the term that grows fastest, so it is **O(n²)**, "order n squared". Doubling n multiplies n² by 4.
- `unique_by_dict` does a fixed amount of work per word, so it is **O(n)**, "linear". Doubling n doubles the time. That assumes `word not in seen` on a dictionary takes the same time however big the dictionary is. It does, and the next lesson builds a dictionary-like table by hand to see how.

Drag the slider to see how the common growth rates pull apart:

```figure
name: frontier/GrowthCurves
caption: Steps against n. Untick O(n²) to see the slower-growing curves; at small n they're all close, which is why a slow algorithm can look fine in testing.
props: {"n": 16, "max": 64}
```

Some others you'll meet: **O(1)**, "constant", takes the same time whatever n is, like reading `counts["the"]`. **O(log n)** grows by one step each time n doubles: a heap (lesson 2.3) and binary search work like that. **O(n log n)** is a little more than linear, and it's the cost of sorting: `top()` in your `text.py` is O(n log n) because of `sorted`.

The big-O of a piece of code can usually be read off its loops. A loop over n items doing a fixed amount of work is O(n). A loop over n items whose body is itself O(n), like `word not in seen` on a list, is O(n × n) = O(n²). The rule of thumb is to look for **a loop hidden inside another loop**, often hiding inside an innocent-looking `in`.

```check
run ".venv/Scripts/python experiments/time_unique.py" stdout="8000 words" label="the experiment runs and times 8000 words" -- Check the imports at the top of experiments/time_unique.py: best_of from frontier.bench, the two functions from frontier.growth.
```

## Your turn: how much did it grow?

Reading "about four times" off a column of numbers is easy to get wrong. Let the code do the division.

**Build, on your own:** a function `ratios(times)` at the end of `src/frontier/bench.py`. It takes a list of times and returns a list with one number fewer: each time divided by the time before it. `ratios([1.0, 2.0, 8.0])` is `[2.0, 4.0]`, and a list with one time gives `[]`. Give it the hints `times: list[float]` and `-> list[float]`.

```powershell
.venv\Scripts\python -m pytest -q tests/test_bench.py
```

```hints
nudge: For a list of n times there are n − 1 pairs of neighbours. Item `i + 1` divided by item `i`, for every `i` from 0 to `len(times) - 2`.
concept: A list comprehension can loop over positions: `[... for i in range(len(times) - 1)]` gives `i` = 0, 1, …, up to the second-last position, so `times[i + 1]` is always there. A list with one time gives `range(0)`, which is empty.
answer: At the end of `src/frontier/bench.py`:
~~~python
def ratios(times: list[float]) -> list[float]:
    """How many times longer each run took than the one before it."""
    return [times[i + 1] / times[i] for i in range(len(times) - 1)]
~~~
`zip(times, times[1:])` pairs each time with the next and works just as well: `[later / earlier for earlier, later in zip(times, times[1:])]`.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_bench.py -k ratios" label="ratios divides each time by the one before" -- Divide times[i + 1] by times[i], not the other way round, for each i up to the second-last.
run ".venv/Scripts/python -m mypy --strict src/frontier/bench.py" stdout="Success" label="mypy --strict still passes" -- ratios needs hints: times: list[float] and -> list[float].
```

## Ratios in the experiment, and onto GitHub

Now the experiment can say how each version grows. It goes through the two versions in turn: a list of `(name, function)` pairs, unpacked into `name` and `unique` by the `for`, just as `for word, count in ...` unpacked pairs in Chapter 1. Each version's times are collected in `times`, and `ratios` divides them at the end. `round(x, 1)` keeps one decimal place, enough to see the pattern. Change `experiments/time_unique.py`:

```python file=experiments/time_unique.py
"""How the time to find the different words grows with the number of words."""
from frontier.bench import best_of, ratios
from frontier.growth import unique_by_dict, unique_by_list

SIZES = [1000, 2000, 4000, 8000]

for name, unique in [("list", unique_by_list), ("dict", unique_by_dict)]:
    times = []
    for n in SIZES:
        words = [f"word{i}" for i in range(n)]
        seconds = best_of(lambda: unique(words), repeats=3)
        times.append(seconds)
        print(f"{name} {n:>5} words: {seconds:.5f} s")
    print(f"{name}: each doubling multiplies the time by", [round(x, 1) for x in ratios(times)])
```

Run it:

```powershell
.venv\Scripts\python experiments/time_unique.py
```

Expect the list version's ratios near 4 and the dict version's near 2. With small sizes they wobble, sometimes by a lot, because a run that short is easily disturbed. That's why the sizes double several times: a pattern you see three times running is one you can trust. If the dict's ratios look ragged, add `16000` and `32000` to `SIZES` and run it again. It stays fast, while the list version would take minutes at those sizes. That difference is the whole point.

Commit the lesson and push it:

```powershell
git add .
git commit -m "Time two ways of finding the different words"
git push
```

```check
contains experiments/time_unique.py "ratios(times)" label="the experiment prints the ratios" -- Collect each version's times in a list and print ratios(times) after its sizes.
run ".venv/Scripts/python experiments/time_unique.py" stdout="each doubling multiplies the time by" label="the experiment runs" -- Compare your script with the one above, line by line.
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  bench.py               best_of (a stopwatch that keeps the fastest run), ratios
  growth.py              unique_by_list: O(n²); unique_by_dict: O(n)
experiments/
  time_unique.py         times both, prints how each grows as n doubles
tests/
  test_bench.py, test_growth.py
```

Next lesson: why a dictionary can answer `in` without looking at every key. You build one by hand, from a list of lists and a function that turns a word into a number.
