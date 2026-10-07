# Debugging

Every programmer writes bugs. Experienced programmers write fewer, but mostly they are faster at **finding** them, and that skill is not talent. It is a method. Beginners tend to debug by staring at the code, changing something that looks suspicious, running it again, and repeating until it works or they give up. That occasionally works, but it is slow, and it often "fixes" a bug by accident while adding a new one.

This lesson teaches a systematic approach: how to turn "it doesn't work" into a precise question, how to look inside a running program to see what it is really doing, and how to check your assumptions automatically with `assert`. It ends with a catalogue of the bugs you are most likely to meet, since most bugs are variations on a small number of themes.

## Two kinds of bug

Some bugs announce themselves: the program crashes with an exception, and the traceback tells you where. These are the easy ones. You already know how to read the message, find the line and understand what went wrong.

The harder kind produces **no error at all**. The program runs to the end and prints an answer, but the answer is wrong. Python cannot help you here, because as far as Python is concerned nothing went wrong: it did exactly what you wrote. The bug is the gap between what you **wrote** and what you **meant**. Finding it means finding the first place where the program's actual behaviour differs from what you expected. Everything in this lesson is a way of finding that place.

Here is a function with a quiet bug. It is supposed to return the average of a list of numbers.

```python type
def average(numbers):
    total = 0
    for i in range(1, len(numbers)):
        total += numbers[i]
    return total / len(numbers)

print(average([10, 20, 30]))
```

```output
16.666666666666668
```

It prints `16.666666666666668` instead of 20. No crash, just a wrong number. Before reading on, see if you can spot the bug. The rest of this lesson shows how to find it without having to spot it.

## Step 1: reproduce it, with the smallest example

You cannot fix a bug you cannot make happen on purpose. So first find an input that reliably shows the problem, then make that input **as small as possible**. A bug that shows up with a 10,000-line data file is hard to think about; the same bug shown with a three-item list is easy.

Small inputs also make the right answer easy to know. You can work out the average of `[10, 20, 30]` in your head, which is exactly what you need to spot where the program goes wrong. Try even smaller inputs, and look for a pattern:

```python type
def average(numbers):
    total = 0
    for i in range(1, len(numbers)):
        total += numbers[i]
    return total / len(numbers)

print(average([10]))
print(average([10, 20]))
print(average([0, 20]))
```

```output
0.0
10.0
10.0
```

With one number, 10, the average comes out as `0.0`. With `[10, 20]` it is `10.0` instead of 15. But with `[0, 20]` it gives the right answer, `10.0`. That is a strong clue: the answers are wrong exactly when the **first** number is not zero. Something is wrong with how the first number is handled.

## Step 2: look inside

Guessing is slow. Look at what the program is actually doing, by printing the values of variables at the point you suspect. Python has a handy f-string form for this: putting `=` after an expression in braces prints both the expression and its value.

```python type
def average(numbers):
    total = 0
    for i in range(1, len(numbers)):
        print(f"{i=} {numbers[i]=} {total=}")
        total += numbers[i]
    print(f"{total=} {len(numbers)=}")
    return total / len(numbers)

average([10, 20, 30])
```

```output
i=1 numbers[i]=20 total=0
i=2 numbers[i]=30 total=20
total=50 len(numbers)=3
16.666666666666668
```

The output shows the loop running with `i=1` and `i=2`, and never with `i=0`. So `numbers[0]`, the 10, is never added. The bug is `range(1, len(numbers))`, which should be `range(len(numbers))`. The printed values turned a mystery into an obvious fix. Once it is fixed, remove the debugging prints.

When you print strings for debugging, use `repr()` or the `!r` format (as in `{name!r}`), which shows the quotation marks. Then invisible problems become visible: `'Ada '` with a trailing space, or `'42'` that is a string when you expected the number `42`.

## Step 3: form a hypothesis, then test it

Debugging works best as an experiment. Instead of "let me try changing this", say what you think is happening: "I think the loop skips the first item." Then design the smallest check that would prove or disprove it: "if I print `i` in the loop, I should never see 0." Run it and see.

If the hypothesis is right, you have found the bug. If it is wrong, you have still learned something, because one possibility is ruled out. Either way you make progress, which random changes do not guarantee. Change **one** thing at a time; if you change three things and the bug goes away, you do not know which change fixed it, or whether the other two broke something else.

## Narrowing it down

When you have no idea where a bug is, split the problem in half. Check a value halfway through the program. If it is already wrong there, the bug is in the first half; if it is still right, the bug is in the second half. Then split that half again. Each check halves the amount of code you need to suspect, so even a long program narrows down to a few lines in a handful of checks.

A related technique is to explain the code, line by line, out loud, to someone else or to an object on your desk. This is known as **rubber duck debugging**, after a programmer who explained code to a rubber duck. It works surprisingly often: saying what each line does forces you to notice where what it *actually* does differs from what you assumed.

## Checking assumptions with assert

Every program rests on assumptions: this list is not empty, this number is positive, this total should equal the sum of the parts. When an assumption is false, the bug usually shows up much later, somewhere else, looking like a different problem. An `assert` statement checks an assumption at the point where it matters, and fails immediately if it is false.

```python error AssertionError
def average(numbers):
    assert len(numbers) > 0, "average() needs at least one number"
    return sum(numbers) / len(numbers)

print(average([10, 20, 30]))
print(average([]))
```

`assert condition, message` does nothing if the condition is true. If it is false, it raises an `AssertionError` with the message. Without the assert, `average([])` would raise a `ZeroDivisionError`, which is true but less helpful: the real problem is that someone passed an empty list, and the message says exactly that.

Asserts are also the simplest way to **test** a function: call it with inputs whose answers you know, and assert the results.

```python type
def average(numbers):
    return sum(numbers) / len(numbers)

assert average([10, 20, 30]) == 20
assert average([5]) == 5
assert average([-4, 4]) == 0
print("All checks passed.")
```

```output
All checks passed.
```

If every assert passes, nothing happens and the final line prints. If one fails, you find out immediately which case broke. After fixing a bug, add an assert for the case that exposed it, so that if the bug ever comes back you will know at once. Lesson 24 builds this idea into proper tests.

One caution: asserts are for catching **programming mistakes**, not for handling things that can legitimately go wrong, like bad user input. Python can be run in a mode that skips asserts entirely, so never rely on one for anything the program needs to work. For bad input, raise a proper exception, as in the last lesson.

## A catalogue of common bugs

Most bugs are instances of a few familiar mistakes. When a program misbehaves, run through this list; one of them is very often the culprit.

- **Off by one.** A loop runs one time too many or too few, or an index is one out. Check the ends of every `range` and slice: `range(len(x))` covers every index, `range(1, len(x))` skips the first, and `x[len(x)]` is past the end.
- **Accumulator in the wrong place.** Setting `total = 0` *inside* a loop resets it every iteration.
- **Return too early.** A `return` inside a loop ends the function on the first iteration. Check its indentation.
- **Missing return.** A function that forgets to `return` gives back `None`, which usually causes an error later, far from the real mistake.
- **`=` versus `==`,** and **`and`/`or` mix-ups**, such as `if x == 1 or 2:`.
- **Indentation.** A line indented one level too little is outside the loop or `if` you meant it to be in, and runs at the wrong time.
- **Changing a list while looping over it**, which skips items.
- **Unexpected aliasing.** Two names for one list, so a change through one appears through the other.
- **Comparing floats with `==`.**
- **Shadowing a built-in.** Naming your own variable `list`, `sum`, `max`, `len` or `str` hides Python's function with that name for the rest of the program:

```python error TypeError
def make_numbers():
    list = [3, 1, 2]
    return list((5, 6))

make_numbers()
```

Inside the function, the first line made `list` refer to a list of numbers, so the next line tries to call a list as if it were a function: `'list' object is not callable`. The fix is to choose another name, like `values`. (This demo is wrapped in a function so the damage stays local. At the top level of a notebook, a shadowed built-in stays broken for every later cell too; if that happens, click **Reset variables** at the top of the notebook, which clears every name you have defined.)

## After the fix

When you think you have fixed a bug, check that you really have. Run the case that showed the bug, then the edge cases around it: an empty list, one item, zero, negative numbers, the largest and smallest values. A fix that works for the case you were staring at, but breaks something else, is common. Asserts make this re-checking quick, so keep them.

::: challenge The missing student [easy]
`count_passes` should count how many scores are at or above `pass_mark`. It gives the wrong answer for some lists but not others. Find the bug and fix it. Printing the variables inside the loop is a good way to start.

```python starter
def count_passes(scores, pass_mark):
    count = 0
    for i in range(len(scores) - 1):
        if scores[i] >= pass_mark:
            count += 1
    return count

print(count_passes([40, 55, 70], 50))
print(count_passes([70, 55, 40], 50))
```

```python solution
def count_passes(scores, pass_mark):
    count = 0
    for score in scores:
        if score >= pass_mark:
            count += 1
    return count

print(count_passes([40, 55, 70], 50))
print(count_passes([70, 55, 40], 50))
```

```python test
assert "count_passes" in dir(), "Keep the function's name as count_passes."
for _args, _want in [(([40, 55, 70], 50), 2), (([70, 55, 40], 50), 2), (([50], 50), 1), (([], 50), 0), (([10, 20], 50), 0), (([90, 90, 90], 50), 3)]:
    _got = count_passes(*_args)
    assert _got == _want, f"count_passes{_args} should return {_want}, but it returned {_got!r}."
"SUCCESS: Found it: the loop was skipping the last score."
```

Hint: The first call gives the wrong answer and the second gives the right one, even though they hold the same scores. Which score is treated differently? Print `i` inside the loop and compare it with the valid indexes.
:::

::: challenge All different? [medium]
`all_different` should return `True` if no value appears twice in `items`, and `False` otherwise. It works on the first example but not the second. Find the bug and fix it.

```python starter
def all_different(items):
    seen = set()
    for item in items:
        if item in seen:
            return False
        seen.add(item)
        return True

print(all_different([1, 2, 3]))
print(all_different([1, 2, 1]))
```

```python solution
def all_different(items):
    seen = set()
    for item in items:
        if item in seen:
            return False
        seen.add(item)
    return True

print(all_different([1, 2, 3]))
print(all_different([1, 2, 1]))
```

```python test
assert "all_different" in dir(), "Keep the function's name as all_different."
for _items, _want in [([1, 2, 3], True), ([1, 2, 1], False), ([], True), (["a"], True), (["a", "a"], False), ([3, 1, 4, 1, 5], False), ([1, 2, 3, 4, 5], True)]:
    _got = all_different(_items)
    assert _got is _want, f"all_different({_items}) should return {_want}, but it returned {_got!r}."
"SUCCESS: The return is back where it belongs, after the loop."
```

Hint: Add a print at the start of the loop body showing `item`. How many times does the loop actually run? Then look carefully at the indentation of every line in the function. (What should an empty list return?)
:::

::: challenge Running totals [medium]
`running_totals` should return a list where each item is the sum of all the numbers up to and including that position: `running_totals([1, 2, 3, 4])` should return `[1, 3, 6, 10]`. It has **two** bugs. Find and fix both, then check the empty list too.

```python starter
def running_totals(numbers):
    totals = []
    for n in numbers:
        total = 0
        total += n
        totals.append(total)
        return totals

print(running_totals([1, 2, 3, 4]))
```

```python solution
def running_totals(numbers):
    totals = []
    total = 0
    for n in numbers:
        total += n
        totals.append(total)
    return totals

print(running_totals([1, 2, 3, 4]))
```

```python test
assert "running_totals" in dir(), "Keep the function's name as running_totals."
for _nums, _want in [([1, 2, 3, 4], [1, 3, 6, 10]), ([], []), ([5], [5]), ([2, -2, 2], [2, 0, 2]), ([0, 0, 1], [0, 0, 1])]:
    _got = running_totals(_nums)
    assert _got == _want, f"running_totals({_nums}) should return {_want}, but it returned {_got!r}."
"SUCCESS: Both bugs fixed: the accumulator starts once, and the list is returned after the loop."
```

Hint: Fix one bug at a time and run it after each. If the output is still wrong after the first fix, look again: there is a second bug. Check the list of common bugs in the lesson: two of them are here.
:::

## What you learned

- A crash tells you where it happened; a wrong answer does not. For those, find the first point where the program's behaviour differs from what you expected.
- Reproduce the bug with the smallest input you can, where you know the right answer.
- Look inside: print values with labels, `f"{x=}"`, and `!r` for strings.
- Treat debugging as experiments: state a hypothesis, test it, change one thing at a time. Halve the suspect code when you are lost, and explain it line by line.
- `assert condition, message` checks an assumption and fails loudly the moment it is false. Asserts double as quick tests; they are for programming mistakes, not bad input.
- Most bugs are familiar: off by one, accumulators in loops, early or missing returns, indentation, aliasing, float equality, shadowed built-ins.
- After a fix, re-check the failing case and the edge cases, and keep an assert for the case that broke.

So far every program has used only what is built into Python. Next you will learn to import modules, and unlock Python's large standard library: mathematics, randomness, dates, and ready-made tools for counting and combining.
