# Dictionaries

A list keeps values in order and finds them by position: the first item, the fifth item. That is the wrong tool for a lot of everyday questions. What is the price of a loaf of bread? What is Ada's phone number? How many times does the word "the" appear in this book? None of these is about a position. Each one is about looking something up by **name**.

A **dictionary** stores pairs: a **key**, which is what you look up, and a **value**, which is what you get back. Like a real dictionary, where you look up a word to find its definition, you give a Python dictionary a key and it gives you the value straight away. Dictionaries are everywhere in Python, and the patterns in this lesson, especially counting and grouping, are some of the most useful you will learn.

## Making a dictionary and looking things up

A dictionary is written in curly braces, as `key: value` pairs separated by commas.

```python type
prices = {"bread": 1.45, "milk": 0.95, "eggs": 2.30}
print(prices)
print(prices["milk"])
print(len(prices))
```

```output
{'bread': 1.45, 'milk': 0.95, 'eggs': 2.3}
0.95
3
```

To look up a value, put the key in square brackets: `prices["milk"]` is `0.95`. It looks like indexing a list, but the thing in the brackets is a key, not a position. `len` gives the number of pairs. Python's name for the dictionary type is `dict`.

What happens if you look up a key that is not there? Predict before running.

```python error KeyError
prices = {"bread": 1.45, "milk": 0.95, "eggs": 2.30}
print(prices["butter"])
```

A `KeyError`, naming the key that was missing. There are two ways to avoid it. You can check first with `in`, which asks whether a **key** (not a value) is in the dictionary. Or you can use the `get` method, which returns `None` for a missing key instead of failing, or a default value if you give one:

```python type
prices = {"bread": 1.45, "milk": 0.95, "eggs": 2.30}
print("butter" in prices)
print(prices.get("butter"))
print(prices.get("butter", 0))
print(prices.get("milk", 0))
```

```output
False
None
0
0.95
```

`prices.get("butter", 0)` means "the price of butter, or 0 if there is none". You will use `get` with a default constantly.

## Adding, changing and removing

Dictionaries are mutable, like lists. Assigning to a key adds the pair if the key is new, or replaces the value if the key already exists.

```python type
stock = {"apples": 10, "pears": 4}
stock["plums"] = 12
stock["apples"] = 7
stock["pears"] += 3
print(stock)
del stock["plums"]
print(stock)
sold_out = stock.pop("pears")
print(sold_out, stock)
```

```output
{'apples': 7, 'pears': 7, 'plums': 12}
{'apples': 7, 'pears': 7}
7 {'apples': 7}
```

- `stock["plums"] = 12` adds a new pair.
- `stock["apples"] = 7` replaces the old value. A key can only appear once in a dictionary, so there is never a second `"apples"`.
- `stock["pears"] += 3` works too: it looks up the old value, adds 3 and stores the result.
- `del stock["plums"]` removes a pair, and `pop` removes a pair and gives you its value.

## What can be a key

Keys must be unique, and they must be values that can never change: strings, numbers, and tuples of those. A list cannot be a key, because it could be changed after it was stored, and then the dictionary would not be able to find it again.

```python error TypeError
locations = {}
locations[[51, 0]] = "London"
```

The message says a list is **unhashable**. Python finds a key quickly by turning it into a number called a **hash**, and it can only do that for values that cannot change. A tuple works where a list does not:

```python type
locations = {}
locations[(51.5, -0.1)] = "London"
locations[(48.9, 2.4)] = "Paris"
print(locations[(51.5, -0.1)])
```

```output
London
```

Values have no such restriction. A value can be anything: a number, a string, a list, even another dictionary.

## Looping over a dictionary

A `for` loop over a dictionary gives you its **keys**, in the order they were added.

```python type
ages = {"Ada": 36, "Grace": 85, "Alan": 41}
for name in ages:
    print(name, "is", ages[name])
```

```output
Ada is 36
Grace is 85
Alan is 41
```

Most of the time you want each key and its value together. The `items` method gives you (key, value) pairs as tuples, which you unpack in the `for` line, just like `enumerate` in the last lesson:

```python type
ages = {"Ada": 36, "Grace": 85, "Alan": 41}
for name, age in ages.items():
    print(f"{name}: {age}")
print(list(ages.keys()))
print(list(ages.values()))
print(sum(ages.values()))
```

```output
Ada: 36
Grace: 85
Alan: 41
['Ada', 'Grace', 'Alan']
[36, 85, 41]
162
```

`keys()` gives just the keys and `values()` just the values; `sum(ages.values())` adds up all the ages. As with `range`, these methods do not build lists, which is why `list()` is used here to show what they contain.

The rule from lesson 6 applies here too: do not add or remove keys while looping over a dictionary. Python stops you with an error if you try.

## The counting pattern

Counting how often each thing occurs is one of the most common jobs in programming: words in a text, votes for each candidate, visits to each page. A dictionary is perfect for it. The keys are the things being counted, and the values are the counts.

```python type
votes = ["red", "blue", "red", "green", "red", "blue"]
counts = {}
for vote in votes:
    counts[vote] = counts.get(vote, 0) + 1
print(counts)
```

```output
{'red': 3, 'blue': 2, 'green': 1}
```

The key line is `counts[vote] = counts.get(vote, 0) + 1`. Read it as: "the count for this vote becomes its current count, or 0 if it has none yet, plus one." The first time `"red"` is seen, `get` returns 0, so its count becomes 1. The next time, `get` returns 1, and so on. Without `get`, the first lookup of each new colour would be a `KeyError`.

To find the winner, use the "best so far" pattern from lesson 6, looping over the pairs:

```python type
counts = {"red": 3, "blue": 2, "green": 1}
winner = None
best = 0  # safe here: every count is at least 1
for colour, count in counts.items():
    if count > best:
        winner = colour
        best = count
print(winner, "wins with", best, "votes")
```

```output
red wins with 3 votes
```

## The grouping pattern

A close relative of counting is **grouping**: collecting items into lists according to some property. The keys are the groups, and each value is a list of the items in that group.

```python type
animals = ["cat", "cow", "dog", "duck", "crab"]
by_letter = {}
for animal in animals:
    first = animal[0]
    if first not in by_letter:
        by_letter[first] = []
    by_letter[first].append(animal)
print(by_letter)
```

```output
{'c': ['cat', 'cow', 'crab'], 'd': ['dog', 'duck']}
```

For each animal, if there is no group for its first letter yet, create an empty list for it; then add the animal to its group's list. `by_letter[first].append(animal)` works because `by_letter[first]` is a list, so you can call `append` on it directly.

## Dictionaries inside dictionaries

Because values can be anything, a dictionary can describe a whole record, and a list of dictionaries makes a table of records. This is how a great deal of real-world data is shaped, including the JSON data that websites send each other.

```python type
people = [
    {"name": "Ada", "born": 1815, "field": "mathematics"},
    {"name": "Grace", "born": 1906, "field": "computing"},
    {"name": "Alan", "born": 1912, "field": "computing"},
]
for person in people:
    print(f"{person['name']} ({person['born']}) worked in {person['field']}.")
print(people[1]["name"])
```

```output
Ada (1815) worked in mathematics.
Grace (1906) worked in computing.
Alan (1912) worked in computing.
Grace
```

`people[1]["name"]` reads from left to right, as with nested lists: take item 1 of the list (Grace's record), then look up `"name"` in it. Note the quotes in the f-string: the f-string itself uses double quotes, and the keys inside it use single quotes. Older versions of Python required the other kind of quote there, and it is still the usual style because it is easier to read.

## Building a dictionary from two lists

If you have the keys in one list and the values in another, `zip` pairs them up and `dict` turns the pairs into a dictionary:

```python type
names = ["Ada", "Grace", "Alan"]
scores = [91, 88, 79]
results = dict(zip(names, scores))
print(results)
print(results["Grace"])
```

```output
{'Ada': 91, 'Grace': 88, 'Alan': 79}
88
```

::: challenge Basket total [easy]
Write a function `basket_total(prices, basket)`. `prices` maps each product to its price, and `basket` maps each product to how many were bought. Return the total cost, rounded to 2 decimal places.

A product in the basket that is not in `prices` costs nothing (the shop gave it away), so it should not cause an error. For the starter's example the total is 2 × 1.45 + 3 × 0.95 = 5.75.

```python starter
def basket_total(prices, basket):
    return 0

prices = {"bread": 1.45, "milk": 0.95, "eggs": 2.30}
basket = {"bread": 2, "milk": 3}
print(basket_total(prices, basket))
```

```python solution
def basket_total(prices, basket):
    total = 0
    for product, quantity in basket.items():
        total += prices.get(product, 0) * quantity
    return round(total, 2)

prices = {"bread": 1.45, "milk": 0.95, "eggs": 2.30}
basket = {"bread": 2, "milk": 3}
print(basket_total(prices, basket))
```

```python test
assert "basket_total" in dir(), "Keep the function's name as basket_total."
_prices = {"bread": 1.45, "milk": 0.95, "eggs": 2.30}
for _basket, _want in [({"bread": 2, "milk": 3}, 5.75), ({}, 0), ({"eggs": 1, "caviar": 2}, 2.3), ({"eggs": 10}, 23.0)]:
    try:
        _got = basket_total(_prices, _basket)
    except KeyError as _e:
        raise AssertionError(f"For the basket {_basket} your function raised KeyError {_e}. Use get with a default for products that have no price.")
    assert _got == _want, f"For the basket {_basket} the total should be {_want}, but your function returned {_got!r}."
"SUCCESS: Your basket total copes with unknown products."
```

Hint: Loop over `basket.items()` to get each product and quantity. Look up the price with `prices.get(product, 0)`, so a missing product counts as 0, and add price times quantity to a running total.
:::

::: challenge Word counts [medium]
Write a function `word_counts(text)` that returns a dictionary mapping each word in `text` to how many times it appears. Treat capital and small letters as the same, so `"The"` and `"the"` count as one word, and store the words in lowercase. Words are separated by spaces; there is no punctuation to worry about.

`word_counts("the cat and The hat")` returns `{"the": 2, "cat": 1, "and": 1, "hat": 1}`.

```python starter
def word_counts(text):
    return {}

print(word_counts("the cat and The hat"))
```

```python solution
def word_counts(text):
    counts = {}
    for word in text.lower().split():
        counts[word] = counts.get(word, 0) + 1
    return counts

print(word_counts("the cat and The hat"))
```

```python test
assert "word_counts" in dir(), "Keep the function's name as word_counts."
for _text, _want in [
    ("the cat and The hat", {"the": 2, "cat": 1, "and": 1, "hat": 1}),
    ("", {}),
    ("Go go GO", {"go": 3}),
    ("a b a c b a", {"a": 3, "b": 2, "c": 1}),
]:
    _got = word_counts(_text)
    assert _got == _want, f"word_counts({_text!r}) should return {_want}, but it returned {_got!r}."
"SUCCESS: That's the counting pattern, which you will use again and again."
```

Hint: Lowercase the text and `split()` it into words. Then use the counting pattern: `counts[word] = counts.get(word, 0) + 1`.
:::

::: challenge Group by first letter [medium]
Write a function `group_by_first_letter(words)` that returns a dictionary. Each key is a first letter, and its value is the list of words starting with that letter, in the order they appear in `words`.

`group_by_first_letter(["cat", "dog", "cow", "duck"])` returns `{"c": ["cat", "cow"], "d": ["dog", "duck"]}`.

```python starter
def group_by_first_letter(words):
    return {}

print(group_by_first_letter(["cat", "dog", "cow", "duck"]))
```

```python solution
def group_by_first_letter(words):
    groups = {}
    for word in words:
        first = word[0]
        if first not in groups:
            groups[first] = []
        groups[first].append(word)
    return groups

print(group_by_first_letter(["cat", "dog", "cow", "duck"]))
```

```python test
assert "group_by_first_letter" in dir(), "Keep the function's name as group_by_first_letter."
for _words, _want in [
    (["cat", "dog", "cow", "duck"], {"c": ["cat", "cow"], "d": ["dog", "duck"]}),
    ([], {}),
    (["apple"], {"a": ["apple"]}),
    (["bee", "ant", "bat", "art", "bug"], {"b": ["bee", "bat", "bug"], "a": ["ant", "art"]}),
]:
    _got = group_by_first_letter(_words)
    assert _got == _want, f"For {_words} the groups should be {_want}, but your function returned {_got!r}."
"SUCCESS: That's the grouping pattern: a dictionary whose values are lists."
```

Hint: Use the grouping pattern: for each word, take `word[0]`; if that letter is not a key yet, give it an empty list; then append the word to that letter's list.
:::

## What you learned

- A dictionary, `{key: value, ...}`, finds values by key instead of by position. `d[key]` looks up a value and raises `KeyError` if the key is missing.
- `key in d` checks for a key, and `d.get(key, default)` looks up with a fallback.
- `d[key] = value` adds or replaces a pair; `del` and `pop` remove one. Keys are unique.
- Keys must be unchangeable (strings, numbers, tuples); values can be anything.
- Looping over a dictionary gives its keys in insertion order; `items()` gives key-value pairs to unpack, and `keys()` and `values()` give each side.
- Counting: `counts[x] = counts.get(x, 0) + 1`. Grouping: create an empty list for a new key, then append.
- Lists of dictionaries represent tables of records. `dict(zip(keys, values))` builds a dictionary from two lists.

You now know three kinds of collection: strings, lists and dictionaries. Next you will meet the last two basic ones, tuples and sets, and learn how to choose the right collection for a job.
