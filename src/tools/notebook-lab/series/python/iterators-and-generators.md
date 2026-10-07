# Iterators and generators

A `for` loop works on lists, strings, dictionaries, sets, files, `range`, `enumerate`, `zip`, and your own classes. How can one loop work on so many different things? Behind every `for` loop is a small, precise agreement between the loop and the thing it loops over, and once you know it, you can make anything loopable.

This lesson opens up that agreement, the **iterator protocol**, and then shows the easiest way to use it: the **generator**, a function that produces a sequence of values one at a time, only as they are asked for. Generators let you work with sequences that are enormous, or even endless, without ever holding them all in memory, and they make data-processing code remarkably tidy.

## What a for loop really does

Two built-in functions do the work. `iter(x)` asks `x` for an **iterator**: an object that hands out `x`'s items one at a time. `next(iterator)` asks the iterator for its next item. When there are no items left, `next` raises a `StopIteration` exception.

```python type
colours = ["red", "green", "blue"]
it = iter(colours)
print(next(it))
print(next(it))
print(next(it))
```

```output
red
green
blue
```

Asking once more, when there is nothing left, raises `StopIteration`. (This cell catches it, and prints what happened.)

```python type
it = iter(["only item"])
print(next(it))
try:
    next(it)
except StopIteration:
    print("StopIteration: nothing left")
```

```output
only item
StopIteration: nothing left
```

That is the whole protocol. So this loop:

```python type
for colour in ["red", "green", "blue"]:
    print(colour)
```

```output
red
green
blue
```

is carried out by Python as if you had written:

```python type
it = iter(["red", "green", "blue"])
while True:
    try:
        colour = next(it)
    except StopIteration:
        break
    print(colour)
```

```output
red
green
blue
```

Anything that `iter()` accepts is called **iterable**, and anything iterable works in a `for` loop, a comprehension, `sum`, `sorted`, `list`, `zip`, and everywhere else Python expects a sequence of values.

## Iterators get used up

An iterable, like a list, can be looped over as many times as you like, because each `for` loop calls `iter()` and gets a fresh iterator starting from the beginning. But an **iterator** itself remembers where it has got to, and once it has handed out its last item it is **exhausted**. Looping over it again gives nothing. Predict what the second `print` shows.

```python type
pairs = zip(["a", "b", "c"], [1, 2, 3])
print(list(pairs))
print(list(pairs))
```

```output
[('a', 1), ('b', 2), ('c', 3)]
[]
```

The second list is empty. `zip` returns an iterator, not a list, and the first `list(pairs)` used it up. The same is true of `enumerate`, file objects and generators. This is a common source of puzzling bugs: a loop that mysteriously runs zero times because the iterator it uses was already consumed. If you need the values more than once, store them in a list first.

## Making a class iterable

A class becomes iterable by defining `__iter__`, which `iter()` calls. It must return an iterator: an object with a `__next__` method, which `next()` calls. Here is a countdown written the long way, with a class that is its own iterator:

```python type
class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

for n in Countdown(3):
    print(n)
```

```output
3
2
1
```

`raise StopIteration` raises the exception class on its own, without brackets or a message, which Python allows when there is nothing to say. `__iter__` returns `self` because the object is its own iterator: it keeps its position in `self.current`. The consequence is the one from the previous section: a `Countdown` can only be looped over **once**. Loop over the same `Countdown(3)` object twice, and the second loop finds `current` already at 0 and does nothing.

It works, but it is a lot of machinery for "count down from 3": the state has to be kept in attributes, and `__next__` has to work out where it left off each time. There is a much easier way.

## Generators

A **generator function** looks like an ordinary function, but it uses `yield` instead of `return`. Calling it does not run its body. Instead, it gives back a **generator**: an iterator that runs the function's body a piece at a time. Each `next()` runs the body until it reaches a `yield`, hands out the yielded value, and **pauses** there, with every local variable intact. The next `next()` carries on from exactly where it paused.

```python type
def countdown(start):
    current = start
    while current > 0:
        yield current
        current -= 1

for n in countdown(3):
    print(n)
```

```output
3
2
1
```

That is the whole `Countdown` class in five lines. When the function body finishes, the generator raises `StopIteration` for you, so the loop ends. The next cell makes the pausing visible. Predict the order of every line of output before you run it.

```python type
def chatty():
    print("  starting")
    yield 1
    print("  resumed after 1")
    yield 2
    print("  resumed after 2, finishing")

gen = chatty()
print("Generator created; nothing has run yet.")
print("Got", next(gen))
print("Got", next(gen))
for value in gen:
    print("never printed: nothing left to yield")
print("Done")
```

```output
Generator created; nothing has run yet.
  starting
Got 1
  resumed after 1
Got 2
  resumed after 2, finishing
Done
```

Follow the output line by line. Creating the generator ran nothing. The first `next` ran up to the first `yield`. The second `next` resumed and ran to the second `yield`. The `for` loop asked for another value, which resumed the function once more; it printed its last message, reached the end, and stopped the loop without producing anything.

## Lazy sequences

A generator is **lazy**: it computes each value only when it is asked for. Compare building a list of a million squares with generating them:

```python type
def squares_list(n):
    result = []
    for i in range(n):
        result.append(i * i)
    return result

def squares_gen(n):
    for i in range(n):
        yield i * i

print(sum(squares_list(1_000_000)))
print(sum(squares_gen(1_000_000)))
```

```output
333332833333500000
333332833333500000
```

Both give the same total, but the list version first builds a million-item list in memory and then adds it up, while the generator version hands `sum` one square at a time and keeps nothing. For a million numbers the list takes tens of megabytes; for data too big to fit in memory, like a huge log file, the lazy version is the only one that works.

You have already used this: a generator expression, `(i * i for i in range(n))`, from lesson 13, is a quick way to write a generator without a `def`. And `range` itself is lazy, which is why `range(10**12)` costs nothing until you loop over it.

## Endless generators

Because a generator only computes values on demand, it can describe a sequence that never ends. The consumer decides how many to take. In the Fibonacci sequence each number is the sum of the two before it. What is the last number this cell prints?

```python type
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

for number in fibonacci():
    if number > 100:
        break
    print(number, end=" ")
```

```output
0 1 1 2 3 5 8 13 21 34 55 89
```

`while True` would be an infinite loop in an ordinary function, but in a generator it just means "there is always another value". The `for` loop takes values until it decides to `break`. The `itertools` module has a function for taking a fixed number of items from any iterable, `islice`:

```python type
from itertools import islice

print(list(islice(fibonacci(), 10)))
```

```output
[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

(Never call `list()` on an endless generator without something like `islice` in front of it: `list` would keep asking for values forever.)

## Pipelines

Generators can feed each other, each doing one small job, like stations on an assembly line. Nothing happens until the last one is asked for a value, and then each item flows through the whole chain before the next one starts.

```python type
lines = ["# settings", "width=10", "", "height = 4", "# end", "depth=2"]

def non_blank(lines):
    for line in lines:
        if line.strip():
            yield line

def not_comments(lines):
    for line in lines:
        if not line.startswith("#"):
            yield line

def parse(lines):
    for line in lines:
        key, value = line.split("=")
        yield key.strip(), int(value)

settings = dict(parse(not_comments(non_blank(lines))))
print(settings)
```

```output
{'width': 10, 'height': 4, 'depth': 2}
```

Each function is short, easy to test on its own, and knows nothing about the others. If `lines` were a file with a billion lines, this code would still use almost no memory apart from the settings it collects, because only one line is ever being processed at a time.

## Iterating your own classes with yield

The easiest way to give a class an `__iter__` is to make `__iter__` itself a generator. Python calls it to get an iterator, and a generator is one.

```python type
class Team:
    def __init__(self, members):
        self.members = list(members)

    def __iter__(self):
        for member in self.members:
            yield member.upper()

for name in Team(["ada", "alan", "grace"]):
    print(name)
```

```output
ADA
ALAN
GRACE
```

Each `for` loop calls `__iter__` again and gets a brand-new generator, so unlike an iterator, a `Team` can be looped over any number of times.

A generator can hand over all the values of another iterable with `yield from`: `yield from self.members` is short for the loop `for m in self.members: yield m`.

::: challenge Count by steps [easy]
Write a generator function `count_by(start, stop, step)` that yields `start`, `start + step`, `start + 2 * step`, and so on, for as long as the value is less than `stop`. Unlike `range`, it must work with floats.

`list(count_by(0, 1, 0.25))` is `[0, 0.25, 0.5, 0.75]`.

```python starter
def count_by(start, stop, step):
    return []

print(list(count_by(0, 1, 0.25)))
```

```python solution
def count_by(start, stop, step):
    value = start
    while value < stop:
        yield value
        value += step

print(list(count_by(0, 1, 0.25)))
```

```python test
import inspect
assert "count_by" in dir(), "Keep the function's name as count_by."
assert inspect.isgeneratorfunction(count_by), "count_by should be a generator function: use yield instead of building and returning a list."
assert list(count_by(0, 1, 0.25)) == [0, 0.25, 0.5, 0.75], f"count_by(0, 1, 0.25) should give [0, 0.25, 0.5, 0.75], got {list(count_by(0, 1, 0.25))}."
assert list(count_by(1, 10, 3)) == [1, 4, 7], "count_by(1, 10, 3) should give [1, 4, 7]."
assert list(count_by(5, 5, 1)) == [], "count_by(5, 5, 1) should give nothing: 5 is not less than 5."
_g = count_by(0, 10**9, 1)
assert next(_g) == 0 and next(_g) == 1, "The generator should produce values one at a time, lazily."
"SUCCESS: A lazy counter that works for floats too."
```

Hint: Keep the current value in a local variable. Loop `while value < stop:`, `yield value`, then add `step`. A generator pauses at each `yield` and remembers `value` until it is asked for the next one.
:::

Once it passes, try `list(count_by(0, 1, 0.1))` in a new cell. You get eleven values, and the last is `0.9999999999999999`, not the ten you might expect. That is the float inexactness from lesson 2: adding 0.1 over and over piles up tiny errors, until the total ends up just under 1. Computing each value fresh, as `start + i * step` for `i = 0, 1, 2, ...`, avoids adding up the errors, which is how careful numerical libraries do it.

::: challenge Chunks [medium]
Write a generator function `chunks(items, size)` that yields the items of a list in consecutive lists of `size` items. The last chunk may be shorter.

`list(chunks([1, 2, 3, 4, 5], 2))` is `[[1, 2], [3, 4], [5]]`. This is how large jobs are split into batches, for example when sending records to a server a hundred at a time.

```python starter
def chunks(items, size):
    return [items]

print(list(chunks([1, 2, 3, 4, 5], 2)))
```

```python solution
def chunks(items, size):
    for start in range(0, len(items), size):
        yield items[start:start + size]

print(list(chunks([1, 2, 3, 4, 5], 2)))
```

```python test
import inspect
assert "chunks" in dir(), "Keep the function's name as chunks."
assert inspect.isgeneratorfunction(chunks), "chunks should be a generator function that yields each chunk."
for _args, _want in [(([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]), (([1, 2, 3, 4], 2), [[1, 2], [3, 4]]), (([], 3), []), ((["a"], 5), [["a"]]), ((list(range(7)), 3), [[0, 1, 2], [3, 4, 5], [6]])]:
    _got = list(chunks(*_args))
    assert _got == _want, f"chunks{_args} should give {_want}, but gave {_got}."
"SUCCESS: Batches, produced one at a time."
```

Hint: At what position does each chunk start? `range` can count in steps. And remember that a slice running past the end of a list simply stops at the end.
:::

::: challenge Take the first few [medium]
Write a function `take(iterable, n)` that returns a list of the first `n` items of any iterable, **without** using `islice`, and without looping over more items than it needs. It must work on endless generators, and if the iterable has fewer than `n` items, it returns all of them.

Use `iter()` and `next()` directly, catching `StopIteration`.

```python starter
def take(iterable, n):
    return list(iterable)[:n]

def naturals():
    k = 0
    while True:
        yield k
        k += 1

print(take("hello", 3))
print(take(naturals(), 5))
```

```python solution
def take(iterable, n):
    it = iter(iterable)
    result = []
    for _ in range(n):
        try:
            result.append(next(it))
        except StopIteration:
            break
    return result

def naturals():
    k = 0
    while True:
        yield k
        k += 1

print(take("hello", 3))
print(take(naturals(), 5))
```

```python test
assert "take" in dir(), "Keep the function's name as take."
assert "islice" not in _source, "Solve it with iter() and next() rather than islice."
def _nat():
    _k = 0
    while True:
        yield _k
        _k += 1
assert take("hello", 3) == ["h", "e", "l"], "take('hello', 3) should be ['h', 'e', 'l']."
assert take([1, 2], 5) == [1, 2], "When there are fewer than n items, take should return them all."
assert take([], 2) == [] and take([9], 0) == [], "take should handle empty input and n = 0."
assert take(_nat(), 4) == [0, 1, 2, 3], "take should work on an endless generator."
_pulled = []
def _tracked():
    for _v in range(100):
        _pulled.append(_v)
        yield _v
take(_tracked(), 3)
assert len(_pulled) == 3, f"take(..., 3) should pull exactly 3 items, but it pulled {len(_pulled)}."
"SUCCESS: You used the iterator protocol directly, and took only what you needed."
```

Hint: Get an iterator with `iter()`, then ask it for items with `next()`, at most `n` times. Remember that `next` raises `StopIteration` when the iterable runs out early.
:::

## What you learned

- `iter(x)` gets an iterator from an iterable; `next(iterator)` gets the next item and raises `StopIteration` when there are none. Every `for` loop uses exactly these two calls.
- An iterable (like a list) can be looped over again and again; an iterator (like `zip`, `enumerate`, a file or a generator) is used up after one pass.
- A class is iterable if `__iter__` returns an iterator, an object with `__next__`.
- A function containing `yield` is a generator function. Calling it returns a generator, which runs the body a step at a time, pausing at each `yield` with its variables intact.
- Generators are lazy, so they can be enormous or endless; take what you need with `break` or `itertools.islice`.
- Generators chain into pipelines of small steps that process one item at a time.
- The easiest `__iter__` is a generator. `yield from other` yields every item of another iterable.

You have now passed functions around a few times without thinking about it, such as `defaultdict(list)`. Next you will see that functions are values like any other: stored in variables, passed to other functions, and created on the fly with `lambda`.
