I filled in the three blanks like this:

- **Project and topic:** one Python library called `toolkit`. Over the series it grows from a stack into linked lists, hash tables, trees, graphs, sorting, dynamic programming and design patterns, with each pattern introduced where a structure needs it.
- **Learner starts from:** can write Python functions, loops, lists and dicts; has not written classes or tests.
- **Series folder name:** `Algorithms Lab`

## Plan

**01 Foundations**: set up the project, test it, measure cost, build the first class.

- 1.1 Setting Up the Toolkit: a package, `swap`, `is_sorted`.
- 1.2 Testing with pytest: assert, edge cases, naming tests.
- 1.3 Counting Steps: linear, quadratic and logarithmic growth, Big-O.
- 1.4 A Stack Class: classes, encapsulation, custom errors, `__len__`, `__repr__`.
- 1.5 Balanced Brackets: using the stack to solve a real problem.

**02 Linked Structures**

- 2.1 Nodes and a Singly Linked List.
- 2.2 Iteration (the **Iterator** pattern): `__iter__` and generators.
- 2.3 Insert, Remove and a Tail Pointer.
- 2.4 A Queue Built on the List: composition over inheritance.
- 2.5 Doubly Linked List and Deque.

**03 Hashing**

- 3.1 A Hash Table from Scratch.
- 3.2 Collisions with Chaining.
- 3.3 Resizing and Load Factor.
- 3.4 Counting and Two-Sum.
- 3.5 An LRU Cache: hash table plus doubly linked list.

**04 Recursion and Memoization** (first dynamic programming)

- 4.1 Thinking Recursively.
- 4.2 Why Fibonacci Is Slow: overlapping subproblems.
- 4.3 A Memoize Decorator (**Decorator** pattern).
- 4.4 `functools.cache` and Climbing Stairs.
- 4.5 Grid Paths, Top-Down.

**05 Sorting and Searching**

- 5.1 Binary Search.
- 5.2 Selection and Insertion Sort.
- 5.3 Merge Sort (divide and conquer).
- 5.4 Quick Sort.
- 5.5 Pluggable Sorting (**Strategy** pattern): `key` and `reverse`.

**06 Trees**

- 6.1 Binary Tree Nodes.
- 6.2 Traversals (recursive and iterative).
- 6.3 Binary Search Tree.
- 6.4 Heap and Priority Queue.
- 6.5 Trie.
- 6.6 A File-System Tree (**Composite** and **Visitor** patterns).

**07 Graphs**

- 7.1 Adjacency-List Graph.
- 7.2 Breadth-First Search.
- 7.3 Depth-First Search.
- 7.4 Topological Sort.
- 7.5 Dijkstra's Shortest Path.
- 7.6 Union-Find and Kruskal.

**08 Dynamic Programming**

- 8.1 From Memoization to Tabulation.
- 8.2 Coin Change.
- 8.3 0/1 Knapsack.
- 8.4 Longest Common Subsequence.
- 8.5 Edit Distance.
- 8.6 Rebuilding the Answer: reconstruction.
- 8.7 Saving Space: rolling rows.
- 8.8 A DP Solver Base Class (**Template Method** pattern).

**09 Patterns Capstone**

- 9.1 Factory: building structures by name.
- 9.2 Command: undo and redo on stacks.
- 9.3 Facade: a command-line toolkit.
- 9.4 Final Challenge.

Chapter 01 is below. The full series is far more than fits in one reply, so I'm stopping at the end of a file as the instructions require.

---

`Algorithms Lab/01 Foundations/01-setup.md`

````markdown
---
title: 1.1 — Setting Up the Toolkit
track: Foundations
runtime: python
---

Over this series you will build `toolkit`, a small Python library. It will hold data structures (stacks, linked lists, hash tables, trees, graphs), algorithms (searching, sorting, shortest paths) and dynamic programming solutions. You write every piece by hand, so you see exactly how it works.

In this lesson you set up the project folder and write two small helper functions that later lessons reuse.

Open the terminal in your project folder before you start.

## Create the package

A **package** is a folder that Python can import code from. Create a folder named `toolkit`, and inside it a file named `__init__.py`.

```python file=toolkit/__init__.py
"""Algorithms Lab: data structures and algorithms we build ourselves."""

__version__ = "0.1.0"
```

The first line is a **docstring**: a string (`str`) written in triple quotes at the top of a file. It describes what the file is for. Tools, editors and Python's `help()` show it.

`__version__ = "0.1.0"` creates a variable that holds a `str`. Names with double underscores on both sides are called **dunder** names (short for "double underscore"). Python gives some of them special meaning. You will meet many more.

`__init__.py` is the file Python runs when someone writes `import toolkit`. Having it makes the folder a package.

```check
file toolkit/__init__.py
run "python -c \"import toolkit; print(toolkit.__version__)\"" stdout="0.1.0" label="the toolkit package can be imported" -- Check that the folder is named toolkit and the file is named __init__.py (two underscores on each side). Run the command from your project folder.
```

## A helper that changes a list in place

Sorting algorithms constantly swap two items. Put that in one place. Create `toolkit/utils.py`.

```python file=toolkit/utils.py
"""Small helpers used by many parts of the toolkit."""


def swap(items, i, j):
    """Swap the items at positions i and j, in place."""
    items[i], items[j] = items[j], items[i]
```

`items` is a `list`. `i` and `j` are `int` positions in that list.

The line `items[i], items[j] = items[j], items[i]` works in two moves. First, Python builds a **tuple** from the right side: `(items[j], items[i])`, a pair holding both values. Then it **unpacks** the pair into the two places on the left. Because the pair already holds both values, you need no temporary variable.

"In place" means the function changes the list you gave it, instead of making a new list. A function with no `return` gives back `None`. This is a good habit to copy: functions that change their input return `None` (like `list.sort()`), and functions that build something new return it.

```predict
question: What does `print(swap([1, 2, 3], 0, 2))` print?
choice: None
choice: [3, 2, 1]
choice: [1, 2, 3]
answer: None
explain: swap changes the list but has no return statement, so the call itself gives back None.
```

```check
contains toolkit/utils.py "def swap"
run "python -c \"from toolkit.utils import swap; a = [1, 2, 3]; swap(a, 0, 2); print(a)\"" stdout="[3, 2, 1]" label="swap exchanges the two items in the same list" -- swap must change the list it receives, not build a new one.
```

## Your turn: is_sorted

Add a function `is_sorted(items)` to `toolkit/utils.py`, below `swap`. Keep `swap`.

It returns `True` when every item is less than or equal to the item after it, and `False` otherwise. Think about these cases:

- `[1, 2, 2, 3]` is sorted: equal neighbours are fine.
- `[1, 3, 2]` is not sorted, even though the problem is in the middle.
- An empty list and a one-item list are both sorted, because there is no pair that is out of order.

You will use this function in every sorting lesson later, so make it correct.

```check
contains toolkit/utils.py "def is_sorted"
run "python -c \"from toolkit.utils import is_sorted; print(is_sorted([1, 2, 2, 3]), is_sorted([3, 1]), is_sorted([]), is_sorted([7]))\"" stdout="True False True True" label="is_sorted handles ordered, unordered, empty and one-item lists" -- Equal neighbours are allowed, [3, 1] must give False, and an empty or one-item list must give True.
run "python -c \"from toolkit.utils import is_sorted; print(is_sorted([1, 3, 2]), is_sorted([2, 1, 3]))\"" stdout="False False" label="is_sorted finds a problem anywhere in the list" -- Look at every neighbouring pair, not only the first one.
run "python -c \"from toolkit.utils import swap, is_sorted\"" label="swap is still in utils.py" -- Keep swap in the file.
```

```hints
nudge: What is the smallest thing that proves a list is NOT sorted?
concept: One neighbouring pair with items[i] > items[i + 1] is enough to answer False at once. Only after checking every pair can you answer True.
shape: Loop over the positions of the first item of each pair. If there are n items, there are n - 1 pairs, so range(len(items) - 1) works and is empty for lists of length 0 or 1.
answer: The full answer:
~~~python
def is_sorted(items):
    """Return True if every item is <= the item after it."""
    for i in range(len(items) - 1):
        if items[i] > items[i + 1]:
            return False
    return True
~~~
```
````

`Algorithms Lab/01 Foundations/02-testing.md`

````markdown
---
title: 1.2 — Testing with pytest
runtime: python
---

A data structure that is almost right is worse than useless, because you will build on top of it. From now on you check your code with automated **tests**: small functions that run your code and report if it gives the wrong answer.

You will use **pytest**, the most common Python test tool. You will write tests for `swap` and `is_sorted` from the last lesson.

## Install pytest

In the terminal, run:

```
pip install pytest
```

Then confirm that it works:

```
python -m pytest --version
```

We write `python -m pytest` instead of just `pytest`. The `-m` option runs pytest as a module from your current folder, which makes the folder importable. That is what lets a test write `from toolkit.utils import swap`.

```check
run "python -m pytest --version" label="pytest is installed" -- Run `pip install pytest` in the terminal, then try again.
```

## Write your first test

Create `tests/test_utils.py`.

```python file=tests/test_utils.py
from toolkit.utils import swap


def test_swap_exchanges_two_items():
    items = [1, 2, 3]
    swap(items, 0, 2)
    assert items == [3, 2, 1]
```

pytest finds files whose names start with `test_` and runs every function inside whose name starts with `test_`.

`assert` is a statement followed by a condition. If the condition is `True`, nothing happens. If it is `False`, Python raises an `AssertionError` and pytest marks the test as failed.

This test has the shape **arrange, act, assert**: arrange the data (`items = [1, 2, 3]`), act (call `swap`), then assert what you expect. Keep tests in this shape and they stay easy to read.

Run it:

```
python -m pytest tests/test_utils.py
```

```predict
question: A test function contains no `assert` and its code raises no error. What does pytest report?
choice: It passes
choice: It fails
choice: It is skipped
answer: It passes
explain: pytest fails a test only when the function raises an error. An assert raises one when its condition is false. If nothing is raised, the test passed, which is why every test needs a real assert.
```

```check
file tests/test_utils.py
run "python -m pytest tests/test_utils.py -q" stdout="1 passed" label="the swap test passes" -- Run the command in your project folder and read the first lines of pytest's message.
```

## Watch a test fail

A test you have never seen fail might be a test that cannot fail. Break yours on purpose.

In the `assert` line, change `[3, 2, 1]` to `[1, 2, 3]`, save, and run pytest again. Read the output: pytest shows the line that failed and both values it compared.

```predict
question: You change the expected value to `[1, 2, 3]` and run pytest. What does the last summary line say?
choice: 1 passed
choice: 1 failed
choice: 1 error
answer: 1 failed
explain: The assert is false, so an AssertionError is raised inside the test body, and that counts as a failure. "error" is for problems outside the test body, such as a file that cannot be imported.
```

Now change it back to `[3, 2, 1]`.

```check
contains tests/test_utils.py "[3, 2, 1]" label="the test is back to its correct version" -- Change the expected list back to [3, 2, 1].
run "python -m pytest tests/test_utils.py -q" stdout="1 passed" label="the swap test passes again"
```

## Test the edges

Most bugs hide at the edges: the first item, the last item, nothing at all. Add two more tests to the file.

```python file=tests/test_utils.py
from toolkit.utils import swap


def test_swap_exchanges_two_items():
    items = [1, 2, 3]
    swap(items, 0, 2)
    assert items == [3, 2, 1]


def test_swap_same_position_changes_nothing():
    items = [1, 2, 3]
    swap(items, 1, 1)
    assert items == [1, 2, 3]


def test_swap_returns_none():
    assert swap([1, 2], 0, 1) is None
```

Notice two habits:

- **Each test checks one behaviour, and its name says which.** When `test_swap_same_position_changes_nothing` fails, you know what broke without opening the file.
- `is None` is the correct way to test for `None`. `None` is a single object, so we ask whether something _is_ that object, instead of whether it _equals_ it.

```check
run "python -m pytest tests/test_utils.py -k swap -q" stdout="3 passed" label="all three swap tests pass" -- Run pytest and read which test failed.
```

## Your turn: test is_sorted

Add tests for `is_sorted` to `tests/test_utils.py`. Keep the `swap` tests, and change the import line at the top so both functions are imported.

Write at least three tests whose names start with `test_is_sorted`:

- One where the list is sorted and you expect `True`.
- One where the list is not sorted and you expect `False`.
- One for the empty list.

Use the arrange, act, assert shape and give each test a name that says what it checks.

```check
matches tests/test_utils.py "def test_is_sorted[\s\S]*def test_is_sorted[\s\S]*def test_is_sorted" label="there are at least three is_sorted tests" -- Write three functions whose names start with test_is_sorted.
matches tests/test_utils.py "assert is_sorted[(]" label="one test expects True" -- Add a test that asserts is_sorted(...) for a sorted list.
matches tests/test_utils.py "assert not is_sorted[(]|is_sorted[(][^)]*[)] (is|==) False" label="one test expects False" -- Add a test for a list that is out of order and assert that is_sorted(...) is false.
matches tests/test_utils.py "is_sorted[(][[][]][)]" label="one test uses the empty list" -- Add a test that calls is_sorted([]).
run "python -m pytest tests/test_utils.py -q" stdout="passed" without="failed" label="every test in the file passes" -- Run pytest and read the first failure.
```

```hints
nudge: Each test needs its own function, its own data and its own assert.
concept: A good set of tests covers a normal case that gives True, a case that gives False, and an edge case (the empty list).
shape: Import both functions on the first line: from toolkit.utils import is_sorted, swap. Then add functions named test_is_sorted_... below the swap tests.
answer: The whole file:
~~~python
from toolkit.utils import is_sorted, swap


def test_swap_exchanges_two_items():
    items = [1, 2, 3]
    swap(items, 0, 2)
    assert items == [3, 2, 1]


def test_swap_same_position_changes_nothing():
    items = [1, 2, 3]
    swap(items, 1, 1)
    assert items == [1, 2, 3]


def test_swap_returns_none():
    assert swap([1, 2], 0, 1) is None


def test_is_sorted_true_for_ordered_list():
    assert is_sorted([1, 2, 2, 3])


def test_is_sorted_false_when_out_of_order():
    assert not is_sorted([1, 3, 2])


def test_is_sorted_true_for_empty_list():
    assert is_sorted([])
~~~
```
````

`Algorithms Lab/01 Foundations/03-counting-steps.md`

````markdown
---
title: 1.3 — Counting Steps
runtime: python
---

How do you say that one algorithm is faster than another? Not by timing it. Timing depends on your computer. Instead, you **count the steps** it takes as its input grows.

In this lesson you write three small counting functions. Each one grows in a different way, and together they show what **Big-O** notation means.

## Count a linear search

Create `toolkit/counting.py`.

```python file=toolkit/counting.py
"""Count the work an algorithm does, so we can compare algorithms."""


def linear_comparisons(items, target):
    """Return how many comparisons a left-to-right search makes."""
    comparisons = 0
    for item in items:
        comparisons += 1
        if item == target:
            break
    return comparisons
```

`items` is a `list`, `target` is the value we look for, and `comparisons` is an `int` that starts at 0.

The loop looks at each item from left to right. Every look counts as one comparison, so we add 1 _before_ we compare. `break` ends the loop as soon as the target is found. The function returns the count, not the position.

This count depends on where the target is. If it is the first item, the search takes 1 comparison (the **best case**). If it is last or missing, it takes `len(items)` comparisons (the **worst case**). We usually care about the worst case.

```predict
question: How many comparisons does linear_comparisons(list(range(1000)), 999) make? (list(range(1000)) is the numbers 0 to 999, so 999 is the last item.)
answer: 1000
explain: The search looks at all 1000 items, and the last look finds 999.
```

```check
run "python -c \"from toolkit.counting import linear_comparisons; print(linear_comparisons(list(range(1000)), 999), linear_comparisons(list(range(1000)), 0))\"" stdout="1000 1" label="linear search counts worst and best case" -- Count the comparison before you test it, so the match itself is counted.
```

## Count every pair

Now a function that compares every item with every item after it. Add it to the file below `linear_comparisons`.

```python file=toolkit/counting.py
"""Count the work an algorithm does, so we can compare algorithms."""


def linear_comparisons(items, target):
    """Return how many comparisons a left-to-right search makes."""
    comparisons = 0
    for item in items:
        comparisons += 1
        if item == target:
            break
    return comparisons


def pair_comparisons(items):
    """Return how many comparisons it takes to compare every pair of items."""
    comparisons = 0
    for i in range(len(items)):
        for _ in range(i + 1, len(items)):
            comparisons += 1
    return comparisons
```

This is a **nested loop**: the inner loop runs completely for every step of the outer loop. For position `i`, the inner loop visits positions `i + 1` up to the end, so each pair is counted once.

The name `_` is a convention. It says "this loop variable exists but I never use it." Using it, instead of a name like `j`, tells the next reader there is nothing to look for.

```predict
question: How many comparisons does pair_comparisons make for a list of 20 items?
answer: 190
explain: With n items there are n * (n - 1) / 2 pairs. For 10 items that is 45, and for 20 items it is 20 * 19 / 2 = 190. Doubling the list made the work about four times bigger.
```

```check
run "python -c \"from toolkit.counting import pair_comparisons; print(pair_comparisons(list(range(10))), pair_comparisons(list(range(20))))\"" stdout="45 190" label="pair_comparisons counts every pair once" -- The inner loop should start at i + 1, so no pair is counted twice and no item is compared with itself.
```

## Count halvings

The third function repeatedly cuts a number in half. Add it to the end of the file.

```python file=toolkit/counting.py
"""Count the work an algorithm does, so we can compare algorithms."""


def linear_comparisons(items, target):
    """Return how many comparisons a left-to-right search makes."""
    comparisons = 0
    for item in items:
        comparisons += 1
        if item == target:
            break
    return comparisons


def pair_comparisons(items):
    """Return how many comparisons it takes to compare every pair of items."""
    comparisons = 0
    for i in range(len(items)):
        for _ in range(i + 1, len(items)):
            comparisons += 1
    return comparisons


def halvings(n):
    """Return how many times n can be halved (rounding down) before reaching 1."""
    halvings_done = 0
    while n > 1:
        n //= 2
        halvings_done += 1
    return halvings_done
```

`n` is an `int`. `//` is **floor division**: it divides and rounds down, so `7 // 2` is `3`. `n //= 2` replaces `n` with `n // 2`. The `while` loop repeats as long as `n > 1`, and each pass counts one halving.

This pattern, cutting the problem in half again and again, is behind some of the fastest algorithms you will write, such as binary search.

```predict
question: What does halvings(1000000) return?
answer: 19
explain: 2 to the power 19 is 524,288 and 2 to the power 20 is 1,048,576. One million can be halved 19 times before it drops to 1. A million items, only 19 steps.
```

```check
run "python -c \"from toolkit.counting import halvings; print(halvings(1), halvings(1000), halvings(1024))\"" stdout="0 9 10" label="halvings counts correctly" -- The loop should stop as soon as n is 1.
```

## Reading Big-O

**Big-O** describes how the number of steps grows as the input size `n` grows. We keep only the fastest-growing part and drop constant factors. Here are the three growth shapes you just counted, for `n = 1000`:

| Big-O    | Name        | Example above                     | Steps for n = 1000 |
| -------- | ----------- | --------------------------------- | ------------------ |
| O(log n) | logarithmic | `halvings`                        | 9                  |
| O(n)     | linear      | `linear_comparisons` (worst case) | 1000               |
| O(n²)    | quadratic   | `pair_comparisons`                | 499,500            |

`pair_comparisons` takes n × (n − 1) / 2 steps. The `/ 2` and the `− 1` are constants and small terms, so we simply say O(n²). The important thing is the shape: when `n` doubles, O(n) work doubles, O(n²) work quadruples, and O(log n) work grows by only one step.

```predict
question: An O(n²) algorithm makes about 100 comparisons for 100 items. About how many does it make for 200 items?
choice: About 200
choice: About 400
choice: About 800
answer: About 400
explain: Doubling n multiplies n squared by 2 × 2 = 4, so the work is about four times as large.
```

## Your turn: doublings

Add a function `doublings(n)` to `toolkit/counting.py`. Keep the other three functions.

It returns how many times you must double the number 1 until it is **at least** `n`. For example, doubling 1 gives 2, 4, 8, 16. To reach at least 10 you need 4 doublings (16 is the first value ≥ 10), so `doublings(10)` is 4. `doublings(1)` is 0, because you are already there.

This is the mirror image of `halvings`: one counts down by halves and the other counts up by doubles. Both are O(log n).

```check
contains toolkit/counting.py "def doublings"
run "python -c \"from toolkit.counting import doublings; print(doublings(1), doublings(2), doublings(3), doublings(1000), doublings(1024), doublings(1025))\"" stdout="0 1 2 10 10 11" label="doublings is correct, including exact powers of two" -- Stop doubling as soon as the size is at least n. 1024 is exactly 2 to the power 10, and 1025 needs one more.
run "python -c \"from toolkit.counting import linear_comparisons, pair_comparisons, halvings\"" label="the earlier functions are still there" -- Keep the other functions in the file.
```

```hints
nudge: Start from 1 and ask: is it already at least n? If not, double it and count.
concept: A while loop with a size variable that starts at 1 and a counter that starts at 0 does exactly this. Compare the size to n, not the counter.
shape: while size < n: double the size and add 1 to the count. Return the count.
answer: The full answer:
~~~python
def doublings(n):
    """Return how many times 1 must be doubled to reach at least n."""
    size = 1
    doublings_done = 0
    while size < n:
        size *= 2
        doublings_done += 1
    return doublings_done
~~~
```
````

`Algorithms Lab/01 Foundations/support/tests/test_stack.py`

```python
import pytest

from toolkit import stack as stack_module
from toolkit.stack import Stack


def test_lifo_returns_last_pushed_first():
    s = Stack()
    s.push(1)
    s.push(2)
    s.push(3)
    assert s.pop() == 3
    assert s.pop() == 2
    assert s.pop() == 1


def test_lifo_keeps_any_kind_of_item():
    s = Stack()
    s.push("a")
    s.push([1, 2])
    assert s.pop() == [1, 2]
    assert s.pop() == "a"


def test_emptypop_raises_our_error():
    s = Stack()
    with pytest.raises(stack_module.EmptyStackError):
        s.pop()


def test_emptypop_after_last_item_removed():
    s = Stack()
    s.push(1)
    s.pop()
    with pytest.raises(stack_module.EmptyStackError):
        s.pop()


def test_peekat_returns_top_without_removing():
    s = Stack()
    s.push(1)
    s.push(2)
    assert s.peek() == 2
    assert s.peek() == 2
    assert s.pop() == 2


def test_peekat_empty_raises():
    s = Stack()
    with pytest.raises(stack_module.EmptyStackError):
        s.peek()


def test_lengthof_counts_items():
    s = Stack()
    assert len(s) == 0
    s.push("x")
    s.push("y")
    assert len(s) == 2
    s.pop()
    assert len(s) == 1


def test_truthy_follows_contents():
    s = Stack()
    assert not s
    s.push(1)
    assert s
    s.pop()
    assert not s


def test_reprof_shows_items_bottom_to_top():
    s = Stack()
    assert repr(s) == "Stack([])"
    s.push(1)
    s.push(2)
    assert repr(s) == "Stack([1, 2])"
```

`Algorithms Lab/01 Foundations/04-stack.md`

````markdown
---
title: 1.4 — Your First Data Structure: the Stack
runtime: python
support: tests/test_stack.py
---

A **stack** is a collection where you can only add and remove at one end, the **top**. The last item you put in is the first one you take out. This is called **last in, first out**, or **LIFO**. Think of a stack of plates: you add to the top and take from the top.

Stacks are everywhere. Your browser's back button uses one, and so does your editor's undo. Function calls in Python use one too. In the next lesson you will use a stack to check brackets.

A stack is an **abstract data type**: a promise about _what_ you can do (push, pop, peek), not _how_ it is stored. You will store the items in a Python list, but code using the stack never needs to know that. That freedom is why we wrap the list in a **class**.

Before you start, press the button that adds this lesson's support file, `tests/test_stack.py`.

## Define the class

Create `toolkit/stack.py`.

```python file=toolkit/stack.py
class Stack:
    """A last-in, first-out collection."""

    def __init__(self):
        self._items = []
```

`class Stack:` defines a new type. The docstring on the first line of the class describes it.

`__init__` is a dunder method. Python calls it automatically when you write `Stack()`, so it sets up a new, empty stack. Every method's first parameter is `self`, which stands for _the particular stack object being used_. Python fills it in for you.

`self._items = []` creates an attribute named `_items` on that object and gives it an empty `list`. The leading underscore is a convention: it means "this is an inside detail, leave it alone." Code outside the class should use `push` and `pop`, not touch `_items`. Because outsiders follow that rule, you can later change how items are stored without breaking anyone.

```check
contains toolkit/stack.py "class Stack"
run "python -c \"from toolkit.stack import Stack; print(type(Stack()).__name__)\"" stdout="Stack" label="you can create a Stack" -- The file must be toolkit/stack.py and define class Stack.
```

## Meet the tests

The support file is already in your project. You do not type it. Read it, because it describes the behaviour you are about to build.

```python file=tests/test_stack.py provided
import pytest

from toolkit import stack as stack_module
from toolkit.stack import Stack


def test_lifo_returns_last_pushed_first():
    s = Stack()
    s.push(1)
    s.push(2)
    s.push(3)
    assert s.pop() == 3
    assert s.pop() == 2
    assert s.pop() == 1


def test_lifo_keeps_any_kind_of_item():
    s = Stack()
    s.push("a")
    s.push([1, 2])
    assert s.pop() == [1, 2]
    assert s.pop() == "a"


def test_emptypop_raises_our_error():
    s = Stack()
    with pytest.raises(stack_module.EmptyStackError):
        s.pop()


def test_emptypop_after_last_item_removed():
    s = Stack()
    s.push(1)
    s.pop()
    with pytest.raises(stack_module.EmptyStackError):
        s.pop()


def test_peekat_returns_top_without_removing():
    s = Stack()
    s.push(1)
    s.push(2)
    assert s.peek() == 2
    assert s.peek() == 2
    assert s.pop() == 2


def test_peekat_empty_raises():
    s = Stack()
    with pytest.raises(stack_module.EmptyStackError):
        s.peek()


def test_lengthof_counts_items():
    s = Stack()
    assert len(s) == 0
    s.push("x")
    s.push("y")
    assert len(s) == 2
    s.pop()
    assert len(s) == 1


def test_truthy_follows_contents():
    s = Stack()
    assert not s
    s.push(1)
    assert s
    s.pop()
    assert not s


def test_reprof_shows_items_bottom_to_top():
    s = Stack()
    assert repr(s) == "Stack([])"
    s.push(1)
    s.push(2)
    assert repr(s) == "Stack([1, 2])"
```

Each test name starts with a word (`lifo`, `emptypop`, `peekat`, `lengthof`, `truthy`, `reprof`) that marks one part of the behaviour. You can run one part at a time with `-k`, for example `python -m pytest tests/test_stack.py -k lifo`. Most of them fail right now. That is the plan: make them pass one part at a time.

`with pytest.raises(...)` is a test for errors. It passes only if the code inside the `with` block raises that error.

```check
file tests/test_stack.py label="the test file is in your project" -- Press the lesson's support-file button to add tests/test_stack.py.
```

## Push and pop

Add the two operations every stack needs.

```python file=toolkit/stack.py
class Stack:
    """A last-in, first-out collection."""

    def __init__(self):
        self._items = []

    def push(self, item):
        """Put item on top of the stack."""
        self._items.append(item)

    def pop(self):
        """Remove and return the top item."""
        return self._items.pop()
```

`push` takes any `item` and adds it to the end of the list with `append`. We choose the **end** of the list as the top, because adding and removing at the end of a Python list is fast (O(1)). `pop` removes the last item and returns it.

```predict
question: You push 1, then 2, then 3 onto a new stack. What does `pop()` return first?
choice: 1
choice: 3
choice: 2
answer: 3
explain: The stack is last in, first out. 3 went in last, so it comes out first.
```

```check
run "python -m pytest tests/test_stack.py -k lifo -q" stdout="2 passed" label="push and pop follow last-in, first-out" -- Check that push adds to the end of the list and pop removes from the end.
```

## Fail clearly on an empty stack

What happens if you pop from an empty stack?

```predict
question: With the code so far, what happens when you call pop() on a new, empty Stack?
choice: It returns None
choice: It raises IndexError
choice: It raises KeyError
answer: It raises IndexError
explain: The list's own pop raises IndexError: "pop from empty list". That message talks about a list, which is an inside detail of your Stack. A user of Stack should see an error about the stack.
```

Give the stack its own error type and raise it with a clear message.

```python file=toolkit/stack.py
class EmptyStackError(Exception):
    """Raised when we pop or peek at a stack with nothing in it."""


class Stack:
    """A last-in, first-out collection."""

    def __init__(self):
        self._items = []

    def push(self, item):
        """Put item on top of the stack."""
        self._items.append(item)

    def pop(self):
        """Remove and return the top item."""
        if not self._items:
            raise EmptyStackError("pop from an empty stack")
        return self._items.pop()
```

`class EmptyStackError(Exception):` makes a new kind of error. Putting `Exception` in brackets means it **inherits** from `Exception`: it gets everything a normal error has, and it needs no code of its own, only a docstring.

`if not self._items:` is true when the list is empty, because an empty list counts as false. `raise` stops the method and sends the error up to whoever called it. Callers can then write `except EmptyStackError:` and handle exactly this problem.

```check
run "python -m pytest tests/test_stack.py -k emptypop -q" stdout="2 passed" label="popping an empty stack raises EmptyStackError" -- EmptyStackError must be defined in toolkit/stack.py, and pop must raise it when there are no items.
run "python -m pytest tests/test_stack.py -k lifo -q" stdout="2 passed" label="push and pop still work" -- Make sure pop still returns the top item.
```

## Peek

Sometimes you want to look at the top item without removing it. Add `peek`.

```python file=toolkit/stack.py
class EmptyStackError(Exception):
    """Raised when we pop or peek at a stack with nothing in it."""


class Stack:
    """A last-in, first-out collection."""

    def __init__(self):
        self._items = []

    def push(self, item):
        """Put item on top of the stack."""
        self._items.append(item)

    def pop(self):
        """Remove and return the top item."""
        if not self._items:
            raise EmptyStackError("pop from an empty stack")
        return self._items.pop()

    def peek(self):
        """Return the top item without removing it."""
        if not self._items:
            raise EmptyStackError("peek at an empty stack")
        return self._items[-1]
```

`self._items[-1]` is the last item of the list, which is our top. Unlike `pop()`, indexing does not remove it. Peeking at an empty stack is also an error, so it raises the same exception with its own message.

```check
run "python -m pytest tests/test_stack.py -k peekat -q" stdout="2 passed" label="peek shows the top without removing it" -- peek must return self._items[-1] and must not remove anything.
```

## Make len() work

Python's built-in `len()` works on lists, strings and dicts. You can make it work on your own class by adding the dunder method `__len__`.

```python file=toolkit/stack.py
class EmptyStackError(Exception):
    """Raised when we pop or peek at a stack with nothing in it."""


class Stack:
    """A last-in, first-out collection."""

    def __init__(self):
        self._items = []

    def push(self, item):
        """Put item on top of the stack."""
        self._items.append(item)

    def pop(self):
        """Remove and return the top item."""
        if not self._items:
            raise EmptyStackError("pop from an empty stack")
        return self._items.pop()

    def peek(self):
        """Return the top item without removing it."""
        if not self._items:
            raise EmptyStackError("peek at an empty stack")
        return self._items[-1]

    def __len__(self):
        return len(self._items)
```

When Python sees `len(stack)`, it calls `stack.__len__()`. Ours returns an `int`: the length of the inner list. Dunder methods let your classes behave like Python's built-in types. This is a design principle you will use all through the series: make your types feel native.

There is a bonus. When Python needs a true or false value, as in `if stack:`, it calls `__len__` and treats 0 as false.

```predict
question: Now that Stack has __len__, what does bool(Stack()) give for a new, empty stack?
choice: True
choice: False
answer: False
explain: Python uses __len__ to decide truthiness. A length of 0 means false, just like an empty list.
```

```check
run "python -m pytest tests/test_stack.py -k lengthof -q" stdout="1 passed" label="len(stack) counts the items" -- __len__ must return the length of the inner list.
run "python -m pytest tests/test_stack.py -k truthy -q" stdout="1 passed" label="an empty stack is false, a stack with items is true" -- Defining __len__ is enough. Do not add anything else.
```

## Make the stack printable

When you print a stack in a terminal, you want to see what is in it. Add `__repr__`.

```python file=toolkit/stack.py
class EmptyStackError(Exception):
    """Raised when we pop or peek at a stack with nothing in it."""


class Stack:
    """A last-in, first-out collection."""

    def __init__(self):
        self._items = []

    def push(self, item):
        """Put item on top of the stack."""
        self._items.append(item)

    def pop(self):
        """Remove and return the top item."""
        if not self._items:
            raise EmptyStackError("pop from an empty stack")
        return self._items.pop()

    def peek(self):
        """Return the top item without removing it."""
        if not self._items:
            raise EmptyStackError("peek at an empty stack")
        return self._items[-1]

    def __len__(self):
        return len(self._items)

    def __repr__(self):
        return f"Stack({self._items!r})"
```

`__repr__` returns a `str` that describes the object for programmers. Python calls it when you use `repr(stack)`, or show a stack in the terminal or in an error message.

The text `f"Stack({self._items!r})"` is an **f-string**: the part in `{ }` is replaced by a value. `!r` means "use `repr()` of that value", so a list shows as `[1, 2]` with its brackets and strings keep their quotes. A good `__repr__` looks like the code that would build the object, so `Stack([1, 2])` reads naturally. It lists the bottom item first.

```check
run "python -m pytest tests/test_stack.py -k reprof -q" stdout="1 passed" label="repr shows the items, bottom first" -- The result for a stack holding 1 then 2 should be exactly: Stack([1, 2])
run "python -m pytest tests/test_stack.py -q" stdout="9 passed" label="all nine stack tests pass" -- Run all the stack tests and read the first failure.
```

## Your turn: reverse text with a stack

A stack reverses order: what goes in first comes out last. Use that.

Create `toolkit/stack_tools.py` with a function `reverse_text(text)`. It must use your `Stack` class: push each character of `text` onto a stack, then pop them all off to build the reversed text, and return it as a `str`.

Do not use `text[::-1]` or `reversed()`. The point is to practise the stack. You already know everything you need: `push`, `pop`, and `while stack:` to keep going until it is empty.

```check
file toolkit/stack_tools.py
matches toolkit/stack_tools.py "import[\s\S]*Stack" label="stack_tools.py imports Stack" -- Import Stack at the top of the file: from toolkit.stack import Stack
matches toolkit/stack_tools.py "[.]push[(]" label="it pushes onto a Stack" -- Use stack.push(...) for every character.
matches toolkit/stack_tools.py "[.]pop[(]" label="it pops from a Stack" -- Use stack.pop() to take the characters back out.
run "python -c \"from toolkit.stack_tools import reverse_text; print(reverse_text('hello'), '|', reverse_text(''), '|', reverse_text('ab cd'))\"" stdout="olleh |  | dc ba" label="reverse_text reverses text, including empty text and spaces" -- The last character must come first. An empty string should give an empty string.
```

```hints
nudge: What order do items come out of a stack compared with the order they went in?
concept: If you push the characters of "abc" one by one, pop() gives c, then b, then a. That is already the reversed order.
shape: Make a Stack. A for loop pushes each character. Then a while loop runs while the stack is true, popping a character and collecting it. Join the collected characters into one string at the end.
answer: The full answer:
~~~python
from toolkit.stack import Stack


def reverse_text(text):
    """Return text reversed, using a Stack."""
    stack = Stack()
    for character in text:
        stack.push(character)
    reversed_characters = []
    while stack:
        reversed_characters.append(stack.pop())
    return "".join(reversed_characters)
~~~
"".join(list_of_strings) glues the strings together with nothing between them.
```
````

CONTINUE FROM: `Algorithms Lab/01 Foundations/05-balanced-brackets.md`

Say "continue" and I'll write 1.5 Balanced Brackets and then move through chapters 02 onward in order.
