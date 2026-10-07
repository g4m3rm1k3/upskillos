# Lists

So far each variable has held a single value: one number, one string. But programs usually deal with groups of things: the items in a shopping basket, the scores in a game, the words in a sentence, the readings from a sensor over a day. You could make a variable for each one (`score1`, `score2`, `score3`...) but that falls apart as soon as you do not know in advance how many there will be.

A **list** holds any number of values, in order, under a single name. Lists are the most used collection in Python, and almost every program you write from now on will have one. This lesson covers how to make them, read them, change them and sort them. In the next lesson you will learn to do something with every item in a list, one at a time.

## Making a list

You write a list as values separated by commas, inside square brackets.

```python type
scores = [72, 88, 95, 61]
names = ["Ada", "Grace", "Alan"]
empty = []
print(scores)
print(names)
print(len(names), len(empty))
```

```output
[72, 88, 95, 61]
['Ada', 'Grace', 'Alan']
3 0
```

Each value in a list is called an **element** or **item**. `len` works on lists just as it did on strings, giving the number of items. A list can hold values of different types, like `[3, "three", 3.0]`, though in practice most lists hold one kind of thing.

## Reading items: indexing and slicing

A list is a sequence, like a string, so everything you learned about positions carries straight over. Indexes start at 0, negative indexes count from the end, and slices take a section.

Predict each line before you run the cell.

```python type
planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter"]
print(planets[0])
print(planets[-1])
print(planets[1:3])
print(planets[:2])
```

```output
Mercury
Jupiter
['Venus', 'Earth']
['Mercury', 'Venus']
```

`planets[0]` is `Mercury` and `planets[-1]` is `Jupiter`. A single index gives one item. A slice always gives a **list**, even when it contains one item or none: `planets[1:3]` is the list `['Venus', 'Earth']`, stopping just before index 3 as always. Asking for an index that is not there is the same `IndexError` as with strings.

## Lists can be changed

Here is the big difference from strings. A string is immutable: you cannot change a character in place. A list is **mutable**: you can replace, add and remove items, and the list itself changes.

```python type
colours = ["red", "green", "blue"]
colours[1] = "yellow"
print(colours)
```

```output
['red', 'yellow', 'blue']
```

Assigning to `colours[1]` replaces the item at that position. The same line on a string would be a `TypeError`, as you saw in lesson 3.

## Adding items

There are three common ways to add to a list:

```python type
queue = ["Ada", "Grace"]
queue.append("Alan")
print(queue)
queue.insert(0, "Linus")
print(queue)
queue.extend(["Margaret", "Tim"])
print(queue)
```

```output
['Ada', 'Grace', 'Alan']
['Linus', 'Ada', 'Grace', 'Alan']
['Linus', 'Ada', 'Grace', 'Alan', 'Margaret', 'Tim']
```

- `append(item)` adds one item to the **end**. This is by far the most used.
- `insert(index, item)` puts an item at a position, shifting the later items along. `insert(0, ...)` adds to the front.
- `extend(other_list)` adds every item of another list to the end.

These are methods, just like the string methods from lesson 3, but with one important difference. String methods return a new string and leave the original alone. These list methods **change the list itself**, and they return nothing.

You can also join two lists with `+`, which makes a new list and leaves both originals unchanged: `[1, 2] + [3]` is `[1, 2, 3]`.

## Removing items

```python type
queue = ["Ada", "Grace", "Alan", "Grace", "Tim"]
last = queue.pop()
print("Popped:", last, "->", queue)
first = queue.pop(0)
print("Popped:", first, "->", queue)
queue.remove("Grace")
print("Removed Grace ->", queue)
```

```output
Popped: Tim -> ['Ada', 'Grace', 'Alan', 'Grace']
Popped: Ada -> ['Grace', 'Alan', 'Grace']
Removed Grace -> ['Alan', 'Grace']
```

- `pop()` removes the **last** item and gives it back, so you can store it. `pop(index)` removes the item at that position instead.
- `remove(value)` removes the first item equal to that value. When it ran, the list was `['Grace', 'Alan', 'Grace']`, and only the first "Grace" was removed, leaving `['Alan', 'Grace']`.
- `del queue[index]` also deletes the item at a position, without giving it back.

If you ask `remove` for a value that is not in the list, you get an error:

```python error ValueError
fruit = ["apple", "pear"]
fruit.remove("banana")
```

A `ValueError` means a value was the right type but not acceptable: `list.remove(x): x not in list`. When you are not sure a value is there, check first with `in`, which works on lists just as it did on strings.

## Finding things in a list

```python type
letters = ["a", "b", "c", "b"]
print("b" in letters)
print("z" in letters)
print(letters.index("b"))
print(letters.count("b"))
```

```output
True
False
1
2
```

`in` gives `True` or `False`, which makes it perfect as a condition: `if "z" in letters:`. `index(value)` gives the position of the first match (it raises a `ValueError` if the value is missing). `count(value)` counts the matches.

For lists of numbers, three built-in functions do the most common calculations:

```python type
temperatures = [18.5, 21.0, 19.2, 24.8, 22.1]
print(min(temperatures), max(temperatures))
print(sum(temperatures))
print(sum(temperatures) / len(temperatures))
print(round(sum(temperatures) / len(temperatures), 1))
```

```output
18.5 24.8
105.6
21.119999999999997
21.1
```

`min` and `max` give the smallest and largest items, and `sum` adds them all. There is no built-in "average", but sum divided by length is the average, so you do not need one. The average prints as `21.119999999999997`: float arithmetic is slightly inexact, as you saw in lesson 2, so round the result when you show it to a person, as the last line does.

## Sorting

Lists have a `sort` method that puts the items in order, smallest first (or alphabetical order for strings). Like `append`, it changes the list in place.

```python type
numbers = [42, 7, 19, 3]
numbers.sort()
print(numbers)
numbers.sort(reverse=True)
print(numbers)
```

```output
[3, 7, 19, 42]
[42, 19, 7, 3]
```

`sort(reverse=True)` sorts from largest to smallest. The `reverse=True` inside the parentheses is an extra instruction given by name; you will learn how these work when you write your own functions.

Because `sort` changes the list and returns nothing, this very common mistake loses the whole list. Predict what it prints.

```python type
numbers = [42, 7, 19, 3]
numbers = numbers.sort()
print(numbers)
```

```output
None
```

It prints `None`. `None` is Python's special value for "nothing", and it is what a function gives back when it has nothing to return. The list was sorted, but then `numbers` was made to refer to what `sort()` returned, which was `None`, and the sorted list was lost.

When you want a sorted copy and want to keep the original as it is, use the built-in function `sorted` instead. It returns a new list:

```python type
numbers = [42, 7, 19, 3]
in_order = sorted(numbers)
print(in_order)
print(numbers)
```

```output
[3, 7, 19, 42]
[42, 7, 19, 3]
```

The rule of thumb: methods that change a list (`append`, `insert`, `extend`, `remove`, `sort`) return `None`, with one exception: `pop` gives back the item it removed. Functions like `sorted`, and operators like `+`, leave the original alone and give you a new list.

## Between strings and lists

Two string methods connect strings and lists, and you will use them constantly. `split` breaks a string into a list of pieces, and `join` glues a list of strings together into one string.

```python type
sentence = "the quick brown fox"
words = sentence.split()
print(words)
print(len(words), "words")
csv_line = "Ada,36,London"
print(csv_line.split(","))
```

```output
['the', 'quick', 'brown', 'fox']
4 words
['Ada', '36', 'London']
```

With no argument, `split()` splits wherever there is a run of spaces, which gives you the words. With an argument, like `split(",")`, it splits at that exact piece of text, which is how you pull apart a line of comma-separated data.

`join` goes the other way. It is a method of the **separator** string, and it takes the list to glue together:

```python type
words = ["the", "quick", "brown", "fox"]
print(" ".join(words))
print("-".join(words))
print(" ".join(words[::-1]))
```

```output
the quick brown fox
the-quick-brown-fox
fox brown quick the
```

`" ".join(words)` puts one space between each word. The last line reverses the list with a slice before joining it, which reverses the order of the words. (`join` only accepts strings; joining a list of numbers raises a `TypeError`.)

## Lists inside lists

An item in a list can itself be a list. This is a natural way to represent a grid, like a small spreadsheet or a game board: a list of rows, where each row is a list.

```python type
grid = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
]
print(grid[1])
print(grid[1][2])
grid[0][0] = 100
print(grid)
```

```output
[4, 5, 6]
6
[[100, 2, 3], [4, 5, 6], [7, 8, 9]]
```

`grid[1]` is the second row, `[4, 5, 6]`, and `grid[1][2]` takes item 2 of that row, `6`. Read two indexes from left to right: first choose the row, then the position within it. (Python lets a list written over several lines end with a comma after the last item, which keeps every line looking the same.)

::: challenge Shopping list [easy]
Starting from the list in the starter, change `shopping` in this order:

1. Add `"milk"` to the end.
2. Add `"bread"` to the front.
3. Remove `"sweets"`.
4. Sort the list alphabetically.

Use list methods; do not write out the finished list yourself. The check runs your code on a different starting list too.

```python starter
shopping = ["eggs", "sweets", "apples"]

# Change shopping here.

print(shopping)
```

```python solution
shopping = ["eggs", "sweets", "apples"]

shopping.append("milk")
shopping.insert(0, "bread")
shopping.remove("sweets")
shopping.sort()

print(shopping)
```

```python test
import io, contextlib
assert shopping == ["apples", "bread", "eggs", "milk"], f"shopping should end up as ['apples', 'bread', 'eggs', 'milk'], but it is {shopping}."
_start = 'shopping = ["eggs", "sweets", "apples"]'
assert _start in _source, "Keep the first line of the starter as it is, so the check can try another list."
_ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(_source.replace(_start, 'shopping = ["tea", "rice", "jam", "sweets"]'), _ns)
assert _ns.get("shopping") == ["bread", "jam", "milk", "rice", "tea"], f"Starting from ['tea', 'rice', 'jam', 'sweets'] you should get ['bread', 'jam', 'milk', 'rice', 'tea'], but your code gives {_ns.get('shopping')}. Use the list methods instead of writing the answer out."
"SUCCESS: Your list operations work on any shopping list."
```

Hint: The four steps are one method each: `append`, `insert` with index 0, `remove`, and `sort`. None of them needs an `=`, because they change the list in place.
:::

::: challenge Score summary [medium]
Given a list of test scores, create these four variables:

- `highest`: the highest score
- `lowest`: the lowest score
- `spread`: the highest minus the lowest
- `average`: the mean score, rounded to 1 decimal place

For the starter's scores these are 95, 61, 34 and 79.0. The check tries other lists of scores, so calculate everything from `scores`.

```python starter
scores = [72, 88, 95, 61, 79]

highest = 0
lowest = 0
spread = 0
average = 0
print(highest, lowest, spread, average)
```

```python solution
scores = [72, 88, 95, 61, 79]

highest = max(scores)
lowest = min(scores)
spread = highest - lowest
average = round(sum(scores) / len(scores), 1)
print(highest, lowest, spread, average)
```

```python test
import io, contextlib
assert (highest, lowest, spread) == (95, 61, 34), f"Expected highest 95, lowest 61 and spread 34, but got {highest}, {lowest} and {spread}."
assert average == 79.0, f"average should be 79.0 but it is {average}."
_start = "scores = [72, 88, 95, 61, 79]"
assert _start in _source, "Keep the line scores = [72, 88, 95, 61, 79] as it is, so the check can try other scores."
_ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(_source.replace(_start, "scores = [50, 100, 70]"), _ns)
_got = (_ns.get("highest"), _ns.get("lowest"), _ns.get("spread"), _ns.get("average"))
assert _got == (100, 50, 50, 73.3), f"For the scores [50, 100, 70] you should get 100, 50, 50 and 73.3, but got {_got}. Is the average rounded to 1 decimal place?"
"SUCCESS: The summary is calculated from whatever scores it is given."
```

Hint: `max`, `min`, `sum` and `len` each do one part of the job. The average is the sum divided by the number of scores; wrap it in `round(..., 1)`.
:::

::: challenge Reverse the words [medium]
Given a sentence, create:

- `words`: a list of the words in the sentence
- `word_count`: how many words there are
- `backwards`: a string with the words in reverse order, separated by single spaces

Leave `words` itself in the original order.

For `"practice makes progress"`, `backwards` is `"progress makes practice"`. The check tries other sentences.

```python starter
sentence = "practice makes progress"

words = []
word_count = 0
backwards = ""
print(backwards)
```

```python solution
sentence = "practice makes progress"

words = sentence.split()
word_count = len(words)
backwards = " ".join(words[::-1])
print(backwards)
```

```python test
import io, contextlib
assert words == ["practice", "makes", "progress"], f"words should be ['practice', 'makes', 'progress'], but it is {words}."
assert word_count == 3, f"word_count should be 3, but it is {word_count}."
assert backwards == "progress makes practice", f"backwards should be 'progress makes practice', but it is {backwards!r}."
_start = 'sentence = "practice makes progress"'
assert _start in _source, "Keep the sentence line as it is, so the check can try other sentences."
_ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(_source.replace(_start, 'sentence = "one small step for a coder"'), _ns)
assert _ns.get("backwards") == "coder a for step small one" and _ns.get("word_count") == 6, f"For 'one small step for a coder' you should get 'coder a for step small one' with 6 words, but got {_ns.get('backwards')!r} with {_ns.get('word_count')}."
"SUCCESS: split, a reversing slice and join, working together."
```

Hint: `split()` turns the sentence into a list of words. A slice with a step of -1 reverses a list, just as it reversed a string. Then `" ".join(...)` puts the words back together with spaces.
:::

## What you learned

- A list, written `[a, b, c]`, holds any number of values in order. `len` gives how many.
- Indexing and slicing work exactly as for strings; a slice of a list is a new list.
- Lists are mutable. `items[i] = x` replaces an item; `append`, `insert` and `extend` add; `pop`, `remove` and `del` take away.
- `in`, `index` and `count` search a list. `min`, `max` and `sum` summarise a list of numbers.
- `sort()` sorts a list in place and returns `None`; `sorted()` returns a sorted copy. Never write `x = x.sort()`.
- `split` turns a string into a list and `separator.join(list)` turns a list of strings back into one string.
- A list can contain lists, for grids and tables: `grid[row][column]`.

Everything in this lesson worked on a list as a whole or on one item you picked by position. Next you will learn the `for` loop, which runs the same code once for every item in a list, whether it has three items or three million.
