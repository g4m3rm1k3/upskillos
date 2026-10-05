---
title: 0.5 — Functions: Write It Once
runtime: python
run: ci_report.py
---

Your answer to the last lesson's Your turn had the same seven lines twice, once per list. With six tests to report on, that would be six copies, and a bug fixed in one copy would still be there in the other five. A **function** lets you write a calculation once, give it a name, and use it on any list. This lesson writes the functions your CI report needs, in a file called `ci_report.py` that grows into the real tool by the end of the chapter.

You'll also see what happens when a function is given something it can't handle, and how to make it say so clearly.

## Your first function

Create `explore/functions.py`:

```python file=explore/functions.py
def mean(values):
    return sum(values) / len(values)


export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
upload = [4.0, 4.4, 4.7, 5.0, 5.6, 5.7, 6.2, 6.6, 6.7, 7.0, 7.4, 7.9, 8.3, 8.6, 9.0]
print(mean(export))
print(mean(upload))
print(mean([1, 2, 3]))
```

```powershell
python explore/functions.py
```

```text
11.766666666666667
6.473333333333333
2.0
```

> **Function definition**: `def name(parameters):` followed by an indented block, the function's **body**. **Parameter**: a name in the brackets of a `def`, which will refer to whatever value the caller passes in. **Return value**: the value a function hands back to whoever called it.

### How a call works

`def mean(values):` doesn't calculate anything. It creates a function and attaches the name `mean` to it, the way `=` attaches a name to a number. The body runs only when the function is **called**. When Python reaches `mean(export)`:

1. It works out the argument: `export`, the list of fifteen timings.
2. It starts a fresh, private set of names for this call, and attaches the parameter `values` to that list. Inside this call, `values` *is* `export`'s list.
3. It runs the body: `sum(values) / len(values)` gives 11.766….
4. **`return`** ends the call and hands that number back. The whole expression `mean(export)` is replaced by 11.766…, as if you'd typed the number there, and `print` prints it.

The next call, `mean(upload)`, does the same with `values` attached to the other list. One definition, any number of lists, and the calculation is written in exactly one place.

**Trace it in CodeLens** and watch the call stack: when `mean` is called, a new box (a **frame**) appears holding that call's own `values`. When it returns, the box disappears. The two blank lines after a function are a Python convention, to make definitions easy to spot.

```check
run "python explore/functions.py" stdout="11.766666666666667\n6.473333333333333\n2.0" label="functions.py prints the mean of three lists"
```

## return is not print

Add a second function to `explore/functions.py`, one that prints instead of returning:

```python file=explore/functions.py
def mean(values):
    return sum(values) / len(values)


def show_mean(values):
    print(sum(values) / len(values))


export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
upload = [4.0, 4.4, 4.7, 5.0, 5.6, 5.7, 6.2, 6.6, 6.7, 7.0, 7.4, 7.9, 8.3, 8.6, 9.0]
print(mean(export))
print(mean(upload))
print(mean([1, 2, 3]))
answer = show_mean([1, 2, 3])
print("answer is", answer)
```

```predict
question: What do the last two lines print?
choice: 2.0, then answer is 2.0
choice: 2.0, then answer is None
choice: answer is 2.0, and nothing else
answer: 2.0, then answer is None
explain: `show_mean` prints 2.0 itself, during the call. But it has no `return`, and a function that ends without returning hands back the special value **`None`**, Python's word for "no value". So `answer` is attached to `None`.
```

```text
11.766666666666667
6.473333333333333
2.0
2.0
answer is None
```

**Why it matters.** Printing shows a value to a *person* and then it's gone. Returning gives it to the *program*, which can store it, compare it, put it in an f-string, or pass it to another function. A function that prints is a dead end: you can't build anything on top of `show_mean`. So the rule in this series: **calculations return; only the top level of the program prints.**

```check
run "python explore/functions.py" stdout="2.0\n2.0\nanswer is None" label="show_mean prints 2.0 and returns None"
```

## Start the CI report

Now start the real tool. Create `ci_report.py` in the `ci-toolkit` folder itself (not in `explore`), with `mean` and the median from your last Your turn, written once as a function:

```python file=ci_report.py
def mean(values):
    return sum(values) / len(values)


def median(values):
    in_order = sorted(values)
    middle = len(in_order) // 2
    if len(in_order) % 2 == 1:
        return in_order[middle]
    return (in_order[middle - 1] + in_order[middle]) / 2


export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
print(f"test_export: mean {mean(export):.2f} s, median {median(export)} s")
```

Press **▶ Run ci_report.py** above the editor, or run `python ci_report.py` in the terminal:

```text
test_export: mean 11.77 s, median 4.1 s
```

**How it works.**

- **`median` returns from two places.** If the count is odd, the `return` inside the `if` ends the call immediately, so the line after it never runs. If the count is even, the `if` block is skipped and Python reaches the last `return`. You don't need an `else`: reaching the last line already *means* the count was even. This is called an **early return**, and it keeps functions flat and readable.
- **`in_order` and `middle` are local.** They exist only inside a call to `median`, in that call's own frame, and vanish when it returns. Try `print(middle)` at the bottom of the file: `NameError`. That's a feature: a function can use any names it likes inside without clashing with names elsewhere in your program.
- The f-string calls two functions inside its braces. Each call is worked out, then formatted.

```check
run "python ci_report.py" stdout="test_export: mean 11.77 s, median 4.1 s" label="python ci_report.py prints the export summary" -- ci_report.py goes in the ci-toolkit folder itself, not in explore.
```

## Functions for pass and fail

Add the failure rate and the flip counter from lesson 0.4 as functions, and report on `test_search`:

```python file=ci_report.py
def mean(values):
    return sum(values) / len(values)


def median(values):
    in_order = sorted(values)
    middle = len(in_order) // 2
    if len(in_order) % 2 == 1:
        return in_order[middle]
    return (in_order[middle - 1] + in_order[middle]) / 2


def failure_rate(results):
    return results.count("fail") / len(results)


def flips(results):
    count = 0
    for i in range(1, len(results)):
        if results[i] != results[i - 1]:
            count = count + 1
    return count


export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
search = ["pass", "pass", "fail", "pass", "pass", "pass", "fail", "pass",
          "pass", "pass", "pass", "fail", "pass", "pass", "pass"]
print(f"test_export: mean {mean(export):.2f} s, median {median(export)} s")
print(f"test_search: {failure_rate(search):.0%} failed, {flips(search)} flips")
```

```text
test_export: mean 11.77 s, median 4.1 s
test_search: 20% failed, 6 flips
```

**How it works.** `flips` is the loop from lesson 0.4, with two changes: the list arrives as the parameter `results` instead of being typed in, and the answer is **returned** instead of printed. The name `count` replaces `flips` inside, because a function's own name and a local name with the same spelling would be confusing to read.

The order of definitions doesn't matter, as long as every function is defined before the line that *calls* it runs. Python reads all the `def`s on its way down the file, and the calls at the bottom come after all of them.

```check
run "python ci_report.py" stdout="test_search: 20% failed, 6 flips" label="ci_report.py reports test_search's failure rate and flips"
```

## A function that uses other functions

The verdict from lesson 0.4 becomes a function too, with one improvement: it now tells a test that broke and was fixed from one that is **still failing**. Add `verdict` after `flips`, and report on `test_signup` as well:

```python file=ci_report.py
def mean(values):
    return sum(values) / len(values)


def median(values):
    in_order = sorted(values)
    middle = len(in_order) // 2
    if len(in_order) % 2 == 1:
        return in_order[middle]
    return (in_order[middle - 1] + in_order[middle]) / 2


def failure_rate(results):
    return results.count("fail") / len(results)


def flips(results):
    count = 0
    for i in range(1, len(results)):
        if results[i] != results[i - 1]:
            count = count + 1
    return count


def verdict(results):
    if results.count("fail") == 0:
        return "stable"
    if flips(results) > 2:
        return "flaky"
    if results[-1] == "fail":
        return "failing"
    return "broke, then fixed"


export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
search = ["pass", "pass", "fail", "pass", "pass", "pass", "fail", "pass",
          "pass", "pass", "pass", "fail", "pass", "pass", "pass"]
signup = ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass",
          "fail", "fail", "pass", "pass", "pass", "pass", "pass"]
print(f"test_export: mean {mean(export):.2f} s, median {median(export)} s")
print(f"test_search: {failure_rate(search):.0%} failed, {verdict(search)}")
print(f"test_signup: {failure_rate(signup):.0%} failed, {verdict(signup)}")
```

```text
test_export: mean 11.77 s, median 4.1 s
test_search: 20% failed, flaky
test_signup: 13% failed, broke, then fixed
```

### How the verdict decides

Each `if` returns, so the checks act like a sieve: a history reaches a line only if it fell through every line above it.

| Reaches this line only if… | Question | Answer if yes |
|---|---|---|
| (always) | no failures at all? | `stable` |
| it has failed | more than two flips? | `flaky` |
| it has failed, at most 2 flips | did the latest run fail? | `failing` |
| it has failed, at most 2 flips, latest passed | — | `broke, then fixed` |

`pass, pass, fail, fail` has one flip and ends in a fail: `failing`, a test someone needs to fix now. `test_signup` has two flips and ends in a pass: fixed. Because each line can assume everything above it was false, no condition needs an `and`. Compare that with lesson 0.4's version, where the `elif` had to repeat `failures > 0`.

`verdict` calls `flips`. Functions built from smaller functions, each simple enough to check on its own, is how every large program is organised. Trace `ci_report.py` in CodeLens and watch the call stack grow to two frames when `verdict` calls `flips`, then shrink again.

```check
run "python ci_report.py" stdout="test_search: 20% failed, flaky\ntest_signup: 13% failed, broke, then fixed" label="ci_report.py gives search and signup the right verdicts"
```

## Checking your functions with assert

How do you know `median` works for an even count, when none of your lists has one? Ask it. Add four lines after the definitions, before the data:

```python file=ci_report.py
def mean(values):
    return sum(values) / len(values)


def median(values):
    in_order = sorted(values)
    middle = len(in_order) // 2
    if len(in_order) % 2 == 1:
        return in_order[middle]
    return (in_order[middle - 1] + in_order[middle]) / 2


def failure_rate(results):
    return results.count("fail") / len(results)


def flips(results):
    count = 0
    for i in range(1, len(results)):
        if results[i] != results[i - 1]:
            count = count + 1
    return count


def verdict(results):
    if results.count("fail") == 0:
        return "stable"
    if flips(results) > 2:
        return "flaky"
    if results[-1] == "fail":
        return "failing"
    return "broke, then fixed"


assert median([3, 1, 2]) == 2
assert median([4, 1, 3, 2]) == 2.5
assert flips(["pass", "fail", "pass"]) == 2
assert verdict(["pass", "pass", "fail"]) == "failing"

export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
search = ["pass", "pass", "fail", "pass", "pass", "pass", "fail", "pass",
          "pass", "pass", "pass", "fail", "pass", "pass", "pass"]
signup = ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass",
          "fail", "fail", "pass", "pass", "pass", "pass", "pass"]
print(f"test_export: mean {mean(export):.2f} s, median {median(export)} s")
print(f"test_search: {failure_rate(search):.0%} failed, {verdict(search)}")
print(f"test_signup: {failure_rate(signup):.0%} failed, {verdict(signup)}")
```

Run it: the output is the same as before. That's what passing looks like: silence.

**How it works.** `assert condition` does nothing if the condition is `True`. If it's `False`, it stops the program with an **`AssertionError`** pointing at that line. Each assert is a tiny **test**: a small input whose right answer you worked out by hand, and a check that the function agrees.

Good tests pick inputs that are **small enough to check in your head** and that **exercise one case each**: `[3, 1, 2]` is odd and unsorted (so it tests the sorting too); `[4, 1, 3, 2]` is even, whose middles 2 and 3 average to 2.5. And they exercise the cases your real data doesn't happen to contain, like a test that's still failing.

Now break `median` on purpose: change `(in_order[middle - 1] + in_order[middle]) / 2` to `in_order[middle]`. Run it:

```text
Traceback (most recent call last):
  File "C:\Users\you\Documents\ci-toolkit\ci_report.py", line 36, in <module>
    assert median([4, 1, 3, 2]) == 2.5
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError
```

The program stops **before printing a single wrong number**, and the traceback points at the case that failed. Put the line back. In Chapter 1 these asserts move into a proper test file, run by a tool called **pytest**, which shows far more about each failure.

```check
run "python ci_report.py" stdout="test_export: mean 11.77 s, median 4.1 s" label="ci_report.py runs with its asserts passing" -- If an AssertionError appears, the traceback names the assert that failed: check that function against the code above.
contains ci_report.py "assert median([4, 1, 3, 2]) == 2.5" label="ci_report.py checks median on an even-length list"
```

## When there's nothing to average

What should `mean` do with an empty list? A CI system that ran no tests last night will give you exactly that. Create `explore/empty.py` to see:

```python file=explore/empty.py
def mean(values):
    return sum(values) / len(values)


print(mean([]))
```

```text
Traceback (most recent call last):
  File "C:\Users\you\Documents\ci-toolkit\explore\empty.py", line 5, in <module>
    print(mean([]))
          ~~~~^^^^
  File "C:\Users\you\Documents\ci-toolkit\explore\empty.py", line 2, in mean
    return sum(values) / len(values)
           ~~~~~~~~~~~~^~~~~~~~~~~~~
ZeroDivisionError: division by zero
```

**Reading a traceback with two frames.** This one has two `File` entries, one per frame on the call stack when the error happened, **oldest first**:

1. `line 5, in <module>`: the main part of the file called `mean([])`.
2. `line 2, in mean`: inside that call, the division failed. `sum([])` is 0, `len([])` is 0, and 0 / 0 is undefined.

The bottom entry is where the error *happened*; the entries above are *how the program got there*. Here the real mistake is at line 5 (asking for the mean of nothing), but the error appears at line 2. In big programs that distance can be many frames, and reading upwards is how you find who passed the bad value.

```check
run "python explore/empty.py" exit=1 stderr="ZeroDivisionError" label="empty.py stops with a ZeroDivisionError"
```

## Saying what went wrong

`division by zero` describes the symptom, not the problem. Make `mean` refuse an empty list itself, with a message that says what's wrong. In `ci_report.py`, change `mean`:

```python file=ci_report.py
def mean(values):
    if len(values) == 0:
        raise ValueError("mean() of an empty list")
    return sum(values) / len(values)


def median(values):
    in_order = sorted(values)
    middle = len(in_order) // 2
    if len(in_order) % 2 == 1:
        return in_order[middle]
    return (in_order[middle - 1] + in_order[middle]) / 2


def failure_rate(results):
    return results.count("fail") / len(results)


def flips(results):
    count = 0
    for i in range(1, len(results)):
        if results[i] != results[i - 1]:
            count = count + 1
    return count


def verdict(results):
    if results.count("fail") == 0:
        return "stable"
    if flips(results) > 2:
        return "flaky"
    if results[-1] == "fail":
        return "failing"
    return "broke, then fixed"


assert median([3, 1, 2]) == 2
assert median([4, 1, 3, 2]) == 2.5
assert flips(["pass", "fail", "pass"]) == 2
assert verdict(["pass", "pass", "fail"]) == "failing"

export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
search = ["pass", "pass", "fail", "pass", "pass", "pass", "fail", "pass",
          "pass", "pass", "pass", "fail", "pass", "pass", "pass"]
signup = ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass",
          "fail", "fail", "pass", "pass", "pass", "pass", "pass"]
print(f"test_export: mean {mean(export):.2f} s, median {median(export)} s")
print(f"test_search: {failure_rate(search):.0%} failed, {verdict(search)}")
print(f"test_signup: {failure_rate(signup):.0%} failed, {verdict(signup)}")
```

Add `print(mean([]))` at the very end temporarily, and run it:

```text
  File "C:\Users\you\Documents\ci-toolkit\ci_report.py", line 3, in mean
    raise ValueError("mean() of an empty list")
ValueError: mean() of an empty list
```

Then delete that line again.

**How it works.** **`raise`** stops the function immediately and sends an **exception** (an error object) up the call stack, exactly as Python did for the division. `ValueError` is the standard kind for "the type is right, but this value doesn't make sense". The message names the real problem, at the function that knows what's wrong.

**Why raise, instead of returning 0?** Returning 0 would let the program carry on and print `mean 0.00 s` for a test that never ran, a believable, wrong number in a report people trust. Failing loudly with a clear message is safer than succeeding quietly with a wrong answer. Deciding what a function does with inputs it can't handle is part of designing it.

```check
run "python ci_report.py" stdout="test_signup: 13% failed, broke, then fixed" label="ci_report.py runs cleanly (remove the temporary print(mean([])))" -- Delete the print(mean([])) line you added at the end.
run "python -c \"import runpy; runpy.run_path('ci_report.py')['mean']([])\"" exit=1 stderr="ValueError: mean() of an empty list" label="mean([]) raises ValueError: mean() of an empty list" -- The first lines of mean must check for an empty list and raise ValueError with that exact message.
```

## Try it

| Change | What to notice |
|---|---|
| Call `mean(export, upload)` | `TypeError: mean() takes 1 positional argument but 2 were given`. A call must match the definition. |
| Call `mean()` | `TypeError: ... missing 1 required positional argument: 'values'`. |
| In `functions.py`, add `print(values)` at the bottom, outside any function | `NameError`: `values` exists only inside a call. |
| In `verdict`, swap the `flaky` and `failing` checks | `["pass", "fail", "pass", "fail"]` (3 flips, ends failing) changes from `flaky` to `failing`. With early returns, order is part of the logic. |
| `print(failure_rate([]))` | `ZeroDivisionError`. Same problem as `mean`; you could fix it the same way. |
| `print(verdict(["fail"] * 15))` | `failing`: no flips, ends in a fail. A list times a number repeats it, like a string. |

## Your turn: nights since the last failure

**No code is shown in this step.** Teams like to know how long a test has been passing: "15 nights clean". Add a function **`since_last_failure(results)`** to `ci_report.py` that returns how many runs **in a row at the end** of the list passed:

| results | returns |
|---|---|
| `test_search`'s history | `3` (its last failure was run 12, and runs 13–15 passed) |
| `test_signup`'s history | `5` |
| fifteen passes | `15` |
| `["pass", "fail"]` | `0` |

Add an `assert` for each of the last two rows, and make the report's `test_signup` line end with `, 5 nights since last failure`.

Do it with **one loop that goes forwards**, through the list from the start, as every loop so far has.

```hints
nudge: It's an accumulator. Go through the results in order: what should the count do on a pass, and what should it do on a fail?
concept: A pass adds 1 to the current streak. A fail ends the streak, so the count goes back to 0. After the loop, the count is the length of the last streak, the passes since the last failure. If there was never a failure, it's never reset, so it ends as the number of runs.
shape: count = 0; for result in results: if result == "fail": count = 0, else: count = count + 1; then return count. Add the asserts after the others and change the last print's f-string to add {since_last_failure(signup)}.
answer: ~~~python
def since_last_failure(results):
    count = 0
    for result in results:
        if result == "fail":
            count = 0
        else:
            count = count + 1
    return count
~~~
Put it after `verdict`, add

~~~python
assert since_last_failure(["pass"] * 15) == 15
assert since_last_failure(["pass", "fail"]) == 0
~~~

after the other asserts, and change the last line to

~~~python
print(f"test_signup: {failure_rate(signup):.0%} failed, {verdict(signup)}, {since_last_failure(signup)} nights since last failure")
~~~

Why it works: the count is reset by every failure, so whatever it holds at the end can only have been built up *after* the last failure.
```

```check
run "python ci_report.py" stdout="test_signup: 13% failed, broke, then fixed, 5 nights since last failure" label="the signup line ends with 5 nights since last failure" -- Call since_last_failure(signup) inside the last f-string.
run "python -c \"import runpy; f = runpy.run_path('ci_report.py')['since_last_failure']; P, F = 'pass', 'fail'; print(f([P, P, F, P, P, P, F, P, P, P, P, F, P, P, P]), f([P] * 15), f([P, F]), f([F, P, P]), f([]))\"" stdout="3 15 0 2 0" label="since_last_failure gives 3, 15, 0, 2 and 0 for five histories" -- A fail resets the count to 0; a pass adds 1. Return the count after the loop.
contains ci_report.py "assert since_last_failure(" label="ci_report.py has asserts for since_last_failure"
```

## What you've learned

- **`def`** creates a function; the body runs only when it's **called**. A call attaches **parameters** to the **arguments** in a fresh **frame** of local names, runs the body, and **returns** a value that replaces the call.
- **Return, don't print**, from calculations. A function without `return` gives back `None`.
- **Early returns** make a sieve: each line can assume everything above it was false.
- **`assert`** checks a small case you worked out by hand. Silence means it passed.
- A **traceback** lists frames oldest first; the bottom is where it broke, the lines above are how it got there.
- **`raise ValueError("...")`** fails loudly with a clear message instead of returning a believable wrong answer.

Next lesson: the numbers stop being typed into your code. You'll read all ninety results from the CI system's file.
