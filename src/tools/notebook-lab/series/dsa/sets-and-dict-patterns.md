# Sets and dictionary patterns

The hash tables lesson showed **why** dictionaries and sets are fast. This lesson is about **using** them: a handful of patterns that turn up in almost every program, each of which replaces a slow nested loop or a tangle of conditions with a few clear lines. Recognising them is one of the quickest ways to write faster and shorter Python.

The patterns:

- **counting** how often things occur, with `dict.get` and `collections.Counter`;
- **grouping** items by a key, with `collections.defaultdict`;
- **indexing**: building a lookup table once so later questions are O(1);
- **set algebra**: union, intersection and difference for "which are in both, either, only one";
- **memo tables**: remembering answers so they are never computed twice.

## Counting

Counting occurrences is the most common dictionary job. The plain version uses `get` with a default of 0. Python's `collections.Counter` packages the same idea with extras, such as `most_common`. Predict before running: which word is most common, and what does `Counter` give for a word that never appears?

```python type
from collections import Counter

text = "the cat sat on the mat and the dog sat on the log"
words = text.split()

counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
print(counts)

word_counts = Counter(words)
print(word_counts.most_common(3))
print("count of 'bird':", word_counts["bird"])
```

```output
{'the': 4, 'cat': 1, 'sat': 2, 'on': 2, 'mat': 1, 'and': 1, 'dog': 1, 'log': 1}
[('the', 4), ('sat', 2), ('on', 2)]
count of 'bird': 0
```

`counts.get(word, 0)` returns the current count, or 0 the first time a word is seen, so one line handles both cases without an `if`.

"the" appears 4 times, "sat" and "on" twice. A `Counter` returns 0 for missing keys instead of raising `KeyError`, which makes it convenient for questions like "how many times was this seen?". The whole count is one pass, O(n) for n words, with each update O(1). The slow alternative, calling `words.count(w)` for each distinct word, is O(n) per word and O(n²) overall: the hidden-loop trap from the costs lesson.

Counters also compare and combine. Two strings are **anagrams** (the same letters in a different order) exactly when their letter counts are equal, which is O(n) to check, against O(n log n) for sorting both:

```python type
from collections import Counter

print(Counter("listen") == Counter("silent"), Counter("listen") == Counter("tinsel"), Counter("apple") == Counter("pale"))
stock = Counter(apples=5, pears=2)
order = Counter(apples=3, pears=4)
print("left after the order:", stock - order, "  shortfall:", order - stock)
```

```output
True True False
left after the order: Counter({'apples': 2})   shortfall: Counter({'pears': 2})
```

Subtracting Counters keeps only positive counts, so `stock - order` is what remains and `order - stock` is what is missing.

## Grouping

Grouping means collecting items into lists by some key: words by their first letter, files by extension, transactions by customer. The plain version must create each list the first time its key appears. `collections.defaultdict(list)` does that automatically: looking up a missing key creates an empty list for it. Predict before running: what will the group for the letter "s" contain?

```python type
from collections import defaultdict

words = ["sun", "moon", "star", "sky", "mars", "venus", "saturn", "mercury"]

by_letter = {}
for word in words:
    if word[0] not in by_letter:
        by_letter[word[0]] = []
    by_letter[word[0]].append(word)
print(by_letter)

grouped = defaultdict(list)
for word in words:
    grouped[word[0]].append(word)
print(dict(grouped))
print("group for 'z':", grouped["z"], "- and now 'z' is a key:", "z" in grouped)
```

```output
{'s': ['sun', 'star', 'sky', 'saturn'], 'm': ['moon', 'mars', 'mercury'], 'v': ['venus']}
{'s': ['sun', 'star', 'sky', 'saturn'], 'm': ['moon', 'mars', 'mercury'], 'v': ['venus']}
group for 'z': [] - and now 'z' is a key: True
```

`defaultdict(list)` calls `list()` to make the default value; `defaultdict(int)` would start counts at 0 and `defaultdict(set)` would collect unique items.

Both versions group in one O(n) pass; the `defaultdict` version just drops the bookkeeping. Note the side effect in the last line: merely **reading** a missing key from a `defaultdict` inserts it. To check for a key without creating it, use `in`, or `get`.

## Indexing

When the same kind of question will be asked many times, build an **index** once, so each question is a dictionary lookup instead of a search. Suppose a program repeatedly needs a user's record by their email. Searching the list each time is O(n) per question; a dictionary keyed by email answers in O(1) after an O(n) build. Predict before running: how much faster will 2,000 lookups be with the index?

```python type
import random
import timeit

random.seed(0)
users = [{"email": f"user{i}@example.com", "name": f"User {i}", "age": random.randint(18, 90)} for i in range(10_000)]
questions = [f"user{random.randrange(10_000)}@example.com" for _ in range(2_000)]

def find_by_search(email):
    for user in users:
        if user["email"] == email:
            return user

by_email = {user["email"]: user for user in users}

search_time = timeit.timeit(lambda: [find_by_search(q) for q in questions], number=1)
index_time = timeit.timeit(lambda: [by_email[q] for q in questions], number=1)
build_time = timeit.timeit(lambda: {user["email"]: user for user in users}, number=1)
print(f"searching the list: {search_time * 1000:8.1f} ms")
print(f"building the index: {build_time * 1000:8.1f} ms, then lookups: {index_time * 1000:.2f} ms")
```

The dictionary comprehension `{user["email"]: user for user in users}` builds the whole index in one line.

The searches take far longer than building the index and using it combined: the index pays for itself after only a few questions. A key must be unique for this to work (two users with the same email would overwrite each other); if a key can repeat, index into lists with the grouping pattern instead. Databases do exactly this when you create an index on a column.

## Set algebra

Sets answer "which items are in both?", "in either?", "in one but not the other?" directly, with operators that read like the mathematics:

- `a | b`, the **union**: in either.
- `a & b`, the **intersection**: in both.
- `a - b`, the **difference**: in a but not b.
- `a ^ b`, the **symmetric difference**: in exactly one.

Each costs roughly O(len(a) + len(b)), because membership in the other set is O(1). Predict before running: which students take maths but not physics?

```python type
maths = {"Ann", "Ben", "Cat", "Dan", "Eve"}
physics = {"Cat", "Dan", "Fay", "Gus"}

print("either subject:  ", sorted(maths | physics))
print("both subjects:   ", sorted(maths & physics))
print("maths only:      ", sorted(maths - physics))
print("exactly one:     ", sorted(maths ^ physics))
print("is {'Cat'} within physics?", {"Cat"} <= physics, "  no overlap with {'Zed'}?", maths.isdisjoint({"Zed"}))
```

```output
either subject:   ['Ann', 'Ben', 'Cat', 'Dan', 'Eve', 'Fay', 'Gus']
both subjects:    ['Cat', 'Dan']
maths only:       ['Ann', 'Ben', 'Eve']
exactly one:      ['Ann', 'Ben', 'Eve', 'Fay', 'Gus']
is {'Cat'} within physics? True   no overlap with {'Zed'}? True
```

`sorted` turns each result into a sorted list, because a set's printing order is arbitrary. `<=` tests whether one set is a subset of another.

Ann, Ben and Eve take maths only. The same operations power everyday tasks: which files changed between two directory listings (symmetric difference), which permissions a user lacks (difference), which tags two articles share (intersection). Written as nested loops over lists, each would be O(n × m).

## Memo tables

A dictionary can also remember the results of a function, so repeated calls with the same arguments are answered instantly. This is called **memoisation**, and it turns some exponential-time recursive algorithms into fast ones; the dynamic programming lessons are built on it. Here it is on the classic example, the number of ways to climb n stairs taking 1 or 2 steps at a time (the Fibonacci numbers in disguise). Predict before running: how many calls will the plain version make for n = 25, and the memoised one?

```python type
calls = 0

def ways_plain(n):
    global calls
    calls += 1
    if n <= 1:
        return 1
    return ways_plain(n - 1) + ways_plain(n - 2)

memo = {}
def ways_memo(n):
    global calls
    calls += 1
    if n <= 1:
        return 1
    if n not in memo:
        memo[n] = ways_memo(n - 1) + ways_memo(n - 2)
    return memo[n]

for f in [ways_plain, ways_memo]:
    calls = 0
    print(f"{f.__name__}(25) = {f(25):,} using {calls:,} calls")
```

```output
ways_plain(25) = 121,393 using 242,785 calls
ways_memo(25) = 121,393 using 49 calls
```

`global calls` lets the functions update the counter defined outside them.

The plain version recomputes the same smaller cases over and over, about 250,000 calls; with the memo table, each n is computed once, and the total is under 50 calls. Python's `functools.cache` decorator adds such a table to any function automatically, as the memoisation lesson shows.

::: challenge Group anagrams [easy]
Write `group_anagrams(words)` returning a list of groups (lists) of words that are anagrams of each other, keeping the words in each group in their original order, and the groups in the order their first word appeared. Use a `defaultdict(list)` keyed by something all anagrams share: for example the word's letters in sorted order, `"".join(sorted(word))`.

```python starter
from collections import defaultdict

def group_anagrams(words):
    return []

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
```

```python solution
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for word in words:
        groups["".join(sorted(word))].append(word)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
```

```python test
assert "group_anagrams" in dir(), "Keep the function's name as group_anagrams."
_got = group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
assert _got == [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]], f"Expected [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]; got {_got}."
assert group_anagrams([]) == [], "No words, no groups."
assert group_anagrams(["a", "a"]) == [["a", "a"]], "Repeated words stay in the same group."
assert group_anagrams(["ab", "ba", "abc"]) == [["ab", "ba"], ["abc"]], "Words of different lengths can't be anagrams."
"SUCCESS: One pass, one dictionary: a shared key turns grouping into an O(n) job. (Dictionaries keep insertion order, which preserved the group order for free.)"
```

Hint: For each word, compute its key `"".join(sorted(word))` and append the word to `groups[key]`. Return `list(groups.values())`; dictionaries remember the order keys were first added.
:::

::: challenge A tiny search engine [medium]
Build an **inverted index**: a dictionary from each word to the **set** of document ids containing it. Write `build_index(documents)`, where `documents` is a dictionary from id to text, splitting each text into lowercase words with `text.lower().split()`. Then write `search(index, query)` returning the **sorted list** of ids of documents that contain **every** word of the query (lowercased), using set intersection. A query with no words, or with a word no document contains, gives `[]`.

```python starter
from collections import defaultdict

def build_index(documents):
    return {}

def search(index, query):
    return []

docs = {1: "The quick brown fox", 2: "The lazy dog", 3: "A quick brown dog"}
index = build_index(docs)
print(search(index, "quick brown"), search(index, "the dog"), search(index, "cat"))
```

```python solution
from collections import defaultdict

def build_index(documents):
    index = defaultdict(set)
    for doc_id, text in documents.items():
        for word in text.lower().split():
            index[word].add(doc_id)
    return dict(index)

def search(index, query):
    words = query.lower().split()
    if not words:
        return []
    result = set(index.get(words[0], set()))
    for word in words[1:]:
        result &= index.get(word, set())
    return sorted(result)

docs = {1: "The quick brown fox", 2: "The lazy dog", 3: "A quick brown dog"}
index = build_index(docs)
print(search(index, "quick brown"), search(index, "the dog"), search(index, "cat"))
```

```python test
assert "build_index" in dir() and "search" in dir(), "Keep both function names."
_docs = {1: "The quick brown fox", 2: "The lazy dog", 3: "A quick brown dog"}
_ix = build_index(_docs)
_before = {k: set(v) for k, v in _ix.items()}
assert _ix.get("quick") == {1, 3} and _ix.get("the") == {1, 2}, "The index should map each lowercase word to the set of ids containing it."
assert search(_ix, "quick brown") == [1, 3], "Both 1 and 3 contain quick and brown."
assert search(_ix, "THE dog") == [2], "Queries are lowercased too; only document 2 has both 'the' and 'dog'."
assert search(_ix, "cat") == [] and search(_ix, "quick cat") == [], "A word no document contains gives no results."
assert search(_ix, "") == [], "An empty query gives no results."
search(_ix, "quick dog")
assert _ix == _before, "search must not change the index (copy the first set before intersecting in place)."
"SUCCESS: Build once in O(total words), then answer each query by intersecting small sets: the core of every search engine."
```

Hint: In `build_index`, use `defaultdict(set)` and add each document's id under each of its words. In `search`, start from a **copy** of the first word's set (`set(index.get(word, set()))`) and intersect with each other word's set.
:::

::: challenge Longest run of consecutive numbers [medium]
Write `longest_consecutive(numbers)` returning the length of the longest run of consecutive integers that can be formed from the values in `numbers` (in any order, duplicates ignored). For `[100, 4, 200, 1, 3, 2]` the run 1, 2, 3, 4 gives 4. Do it in O(n): put the numbers in a set, and start counting only from numbers that **begin** a run (those whose predecessor `x - 1` is not in the set), stepping up while `x + 1` is present.

```python starter
def longest_consecutive(numbers):
    return 0

print(longest_consecutive([100, 4, 200, 1, 3, 2]))
```

```python solution
def longest_consecutive(numbers):
    present = set(numbers)
    best = 0
    for x in present:
        if x - 1 not in present:
            length = 1
            while x + length in present:
                length += 1
            best = max(best, length)
    return best

print(longest_consecutive([100, 4, 200, 1, 3, 2]))
```

```python test
import random as _random, time as _time
assert "longest_consecutive" in dir(), "Keep the function's name as longest_consecutive."
for _xs, _want in [([100, 4, 200, 1, 3, 2], 4), ([], 0), ([7], 1), ([1, 2, 2, 3], 3), ([0, -1, -2, 5, 6], 3), ([10, 30, 20], 1)]:
    assert longest_consecutive(_xs) == _want, f"longest_consecutive({_xs}) should be {_want}, got {longest_consecutive(_xs)}."
_r = _random.Random(2)
for _ in range(300):
    _xs = [_r.randint(-10, 10) for _ in range(_r.randint(0, 12))]
    _s = set(_xs); _ref = max((next(_k for _k in range(1, 30) if _x + _k not in _s) for _x in _s if _x - 1 not in _s), default=0)
    assert longest_consecutive(_xs) == _ref, f"longest_consecutive({_xs}) should be {_ref}."
_big = list(range(5_000))
_r.shuffle(_big)
_start = _time.perf_counter(); _res = longest_consecutive(_big); _elapsed = _time.perf_counter() - _start
assert _res == 5_000 and _elapsed < 0.5, f"5,000 shuffled consecutive numbers took {_elapsed:.1f} s: only count upwards from the start of a run, so each number is visited O(1) times."
"SUCCESS: Each number is stepped over at most once, from the start of its run: O(n) with a set, where sorting would cost O(n log n)."
```

Hint: Loop over the **set** (not the list, so duplicates are skipped). Skip x unless `x - 1` is missing; then count upwards while `x + length` is in the set.
:::

## What you learned

- Counting: `counts[k] = counts.get(k, 0) + 1` or `Counter`, one O(n) pass; equal Counters detect anagrams.
- Grouping: `defaultdict(list)` collects items by key in one pass; reading a missing key inserts it.
- Indexing: build a dictionary once (O(n)) to turn repeated O(n) searches into O(1) lookups.
- Set algebra (`|`, `&`, `-`, `^`) answers both/either/only questions in roughly linear time, and a memo table stops a function computing the same answer twice.

This completes the linear structures. The next part of the series turns to recursion, searching and sorting, starting with recursion itself.
