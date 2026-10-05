---
title: 0.4 — Decisions: Pass, Fail, Flaky
runtime: python
---

A CI report isn't just numbers: it makes **judgements**. Is this run over budget? Did this test fail? Is this test *flaky*: does it fail now and then for no reason, wasting everyone's time with false alarms? Every judgement is a **decision** in code: do one thing if something is true, another if it isn't.

This lesson teaches decisions, then uses them inside loops to write `max` yourself, count failures, and tell a flaky test from a real breakage. It ends with the simplest possible *model*: a rule with one number in it.

## True or False

Create `explore/compare.py`:

```python file=explore/compare.py
print(4.3 > 4.0)
print("fail" == "fail")
print("fail" == "Fail")
print(4.1 != 4.1)
seconds = 120.0
slow = seconds > 10.0
print(slow, type(slow))
```

```powershell
python explore/compare.py
```

```text
True
True
False
False
True <class 'bool'>
```

> **Boolean** (type `bool`): one of exactly two values, `True` or `False`. **Comparison**: an expression that compares two values and produces a boolean.

| Operator | Means |
|---|---|
| `==` | equal to |
| `!=` | not equal to |
| `<`, `>` | less than, greater than |
| `<=`, `>=` | less than or equal to, greater than or equal to |

**How it works.** A comparison is an expression like `4.1 + 4.1`, but its result is a boolean instead of a number. Like any value, it can be printed or given a name: `slow = seconds > 10.0` works out `120.0 > 10.0`, gets `True`, and attaches `slow` to it. Strings are compared character by character, and `"f"` and `"F"` are different characters, so `"fail" == "Fail"` is `False`. Real data is full of `Fail`, `FAIL` and `fail ` (with a trailing space), and you'll clean those up in Chapter 2.

```check
run "python explore/compare.py" stdout="True\nTrue\nFalse\nFalse\nTrue <class 'bool'>" label="compare.py prints the five results"
```

## if and else

The team's budget is 10 seconds per test. Create `explore/label.py`:

```python file=explore/label.py
export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
budget = 10.0
for seconds in export[3:8]:
    if seconds > budget:
        print(seconds, "over budget")
    else:
        print(seconds, "ok")
```

```powershell
python explore/label.py
```

```text
4.0 ok
4.3 ok
120.0 over budget
4.1 ok
4.1 ok
```

**How it works.** `if condition:` works out the condition. If it's `True`, Python runs the indented block under the `if` and skips the `else` block. If it's `False`, it skips the `if` block and runs the `else` block. Exactly one of the two runs, every time.

Here the `if` sits *inside* the loop, so it's indented once for the loop, and its own blocks are indented twice. Each pass of the loop makes a fresh decision about one timing. `export[3:8]` is the slice from index 3 up to (not including) 8: runs 4 to 8, which include the timeout.

`else` is optional. An `if` without one simply does nothing when the condition is `False`.

```check
run "python explore/label.py" stdout="4.0 ok\n4.3 ok\n120.0 over budget\n4.1 ok\n4.1 ok" label="label.py labels runs 4 to 8, with the timeout over budget"
```

## Writing max yourself

`max(export)` finds the slowest run. Here's how it does it. Create `explore/slowest.py`:

```python file=explore/slowest.py
export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
slowest = export[0]
for seconds in export:
    if seconds > slowest:
        slowest = seconds
print(slowest)
print(max(export))
```

```text
120.0
120.0
```

### How the running maximum works

It's an accumulator (lesson 0.3) with a decision in it. Before the loop, `slowest` holds the best answer so far, which is the first item, since it's the only one you've looked at. Each pass asks one question: **is this one slower than the slowest so far?** If yes, it becomes the slowest so far. If no, nothing changes. When the loop ends, every item has been compared, so the slowest so far is the slowest of all.

```figure
name: aml/LoopTrace
caption: The running maximum on the first seven runs. `slowest` only changes when a run beats it.
props: {"values": [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1], "mode": "max", "list": "export"}
```

Notice pass 1 compares the first item with itself: `4.1 > 4.1` is `False`, so nothing changes. That wasted comparison is harmless, and it keeps the loop simple.

**Why start at `export[0]` and not at 0?** Starting at 0 works here, because timings are never negative. But this same loop finds the largest of *any* list, and some lists are all negative. In Chapter 2 you'll compute how much faster each run was than the one before: `[-0.3, -0.1, -0.2]`. Start `slowest` at 0 there and no item is ever bigger than 0, so the loop reports 0, a value that isn't even in the list. Starting with a real item from the list means the answer is always one of the items. (It does mean the list must have at least one item; `max([])` fails too, with a `ValueError`.)

Trace `explore/slowest.py` in CodeLens and watch `slowest` change exactly twice, at runs 1 and 6. Look at which line the arrow skips when the condition is `False`.

```check
run "python explore/slowest.py" stdout="120.0\n120.0" label="slowest.py prints 120.0 from your loop and from max"
```

## Counting failures

`test_search` passed or failed on each of the fifteen nights. Create `explore/failures.py`:

```python file=explore/failures.py
search = ["pass", "pass", "fail", "pass", "pass", "pass", "fail", "pass",
          "pass", "pass", "pass", "fail", "pass", "pass", "pass"]
failures = 0
for result in search:
    if result == "fail":
        failures = failures + 1
print("failures:", failures)
print(f"failure rate: {failures / len(search):.0%}")
print(search.count("fail"))
```

The list continues onto a second line. Python allows that inside brackets: it knows the list isn't finished until the `]`.

```text
failures: 3
failure rate: 20%
3
```

**How it works.** A **counter** is an accumulator that adds 1 instead of adding the item, and only when a condition holds. After the loop, `failures` is how many items passed the test `result == "fail"`. The **failure rate** is the fraction of runs that failed: 3 / 15 = 0.2, shown as `20%`.

`search.count("fail")` is the built-in way: a list's **method** (a function that belongs to a value, called with a dot: `value.method(...)`) that counts how many items equal what you give it. Same answer as your loop, which is exactly what it does inside.

```check
run "python explore/failures.py" stdout="failures: 3\nfailure rate: 20%\n3" label="failures.py counts 3 failures, a 20% rate"
```

## Three verdicts, and a problem

`test_signup` also failed twice. Compare its history with `test_search`'s and `test_login`'s, one square per night:

```figure
name: aml/ResultStrip
caption: Three tests' results over the same fifteen nights.
props: {"tests": [{"name": "test_login", "results": "ppppppppppppppp"}, {"name": "test_signup", "results": "ppppppppffppppp"}, {"name": "test_search", "results": "ppfpppfppppfppp"}]}
```

Here's a first attempt at a verdict for each test. Create `explore/verdict.py`:

```python file=explore/verdict.py
signup = ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass",
          "fail", "fail", "pass", "pass", "pass", "pass", "pass"]
failures = signup.count("fail")
if failures == 0:
    print("stable")
elif failures == len(signup):
    print("broken")
else:
    print("flaky")
```

```text
flaky
```

**How it works.** `elif` means "else if". Python checks the conditions **in order**, from the top, and runs the block of the **first** one that's `True`, then skips the rest. `else` catches everything that matched none of them. So exactly one verdict prints: no failures is stable; all failures is broken; anything in between is labelled flaky.

**The problem.** Look at the figure. `test_signup` isn't flaky. It passed for eight nights, failed two nights in a row, then passed every night after. That's the signature of a **real breakage**: someone's change broke sign-up, and someone else fixed it. `test_search` is different: it fails on a night here and there, with passes in between, on code that hadn't changed. Labelling them both "flaky" would make the team ignore a real bug.

The failure *count* can't tell them apart: 2 and 3 are both "some". The *order* of the results can.

```check
run "python explore/verdict.py" stdout="flaky" label="verdict.py prints flaky for signup (the problem this step shows)"
```

## Counting flips

Tick the box in the figure above to mark each **flip**: a night whose result differs from the night before. `test_signup` flips twice (pass→fail when it broke, fail→pass when it was fixed); `test_search` flips six times. A test that breaks and gets fixed flips twice. More flips than that means it went back and forth more than once, which is what flaky looks like.

Counting flips means comparing each result with the **previous** one, so the loop needs positions, not just items. Create `explore/flips.py`:

```python file=explore/flips.py
search = ["pass", "pass", "fail", "pass", "pass", "pass", "fail", "pass",
          "pass", "pass", "pass", "fail", "pass", "pass", "pass"]
flips = 0
for i in range(1, len(search)):
    if search[i] != search[i - 1]:
        flips = flips + 1
print("flips:", flips)
```

```text
flips: 6
```

### How the flip counter works

- **`range(1, len(search))`** produces the whole numbers from 1 up to, but not including, 15: 1, 2, …, 14. (Like a slice, the end is excluded. `range(5)` on its own means 0 to 4.) So `i` is an **index**, not a result.
- On each pass, `search[i]` is tonight's result and `search[i - 1]` is last night's. If they differ, that's a flip.
- **Why start at 1?** Index 0 is the first night, which has no previous night to compare with. Starting at 0 would compare `search[0]` with `search[-1]`, the *last* night, since `-1` counts from the end: a comparison that means nothing and would count a flip whenever the first and last nights differ. No error, just a wrong number.

Trace it in CodeLens with an eye on `i`: it's always one more than the index of the result it's compared with.

```check
run "python explore/flips.py" stdout="flips: 6" label="flips.py counts 6 flips for test_search"
```

## A better verdict

Combine both facts with **`and`**: flaky means it has failed *and* it has flipped more than twice. Update `explore/verdict.py`:

```python file=explore/verdict.py
signup = ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass",
          "fail", "fail", "pass", "pass", "pass", "pass", "pass"]
failures = signup.count("fail")
flips = 0
for i in range(1, len(signup)):
    if signup[i] != signup[i - 1]:
        flips = flips + 1
if failures == 0:
    print("stable")
elif failures > 0 and flips > 2:
    print("flaky")
else:
    print("broke, then fixed")
```

```predict
question: What does it print for signup now?
choice: stable
choice: flaky
choice: broke, then fixed
answer: broke, then fixed
explain: `signup` has 2 failures, so the first condition (`failures == 0`) is False. It has 2 flips, so `flips > 2` is False, and `True and False` is False, so the `elif` doesn't match either. That leaves `else`.
```

```text
broke, then fixed
```

**How it works.** `A and B` is `True` only when both are `True`. `A or B` is `True` when at least one is. `not A` flips `True` and `False`. Python stops early when it can: in `A and B`, if `A` is `False` it doesn't even look at `B`.

**Be honest about what this is.** It's a **heuristic**: a rule of thumb that is right often, not always. A test that breaks, gets fixed, and breaks again also flips more than twice, and this rule would call it flaky. Real flaky-test detection reruns the same code to see if the result changes, and in Chapter 9 you'll turn this into a model that estimates the *probability* that a failure is a flake. For now, a rule you can explain beats one you can't.

```check
run "python explore/verdict.py" stdout="broke, then fixed" label="verdict.py says signup broke, then was fixed" -- The elif needs both conditions: failures > 0 and flips > 2.
```

## A rule with one number in it

The team wants to know which tests are slow. Here are the six tests' **median** run times (lesson 0.3), and a rule: *slow if the median is over a threshold*. Drag the threshold:

```figure
name: aml/ThresholdRule
caption: One number decides every test's label.
props: {"items": [{"label": "test_login", "value": 1.2}, {"label": "test_signup", "value": 2.1}, {"label": "test_search", "value": 3.0}, {"label": "test_export", "value": 4.1}, {"label": "test_upload", "value": 6.6}, {"label": "test_checkout", "value": 8.2}], "start": 5, "max": 10}
```

In code, the rule is one comparison in a counter. Create `explore/slow.py`:

```python file=explore/slow.py
medians = [1.2, 2.1, 3.0, 4.1, 6.6, 8.2]
threshold = 5.0
slow = 0
for median in medians:
    if median > threshold:
        slow = slow + 1
print(slow, "of", len(medians), "tests are slow")
```

```text
2 of 6 tests are slow
```

This is the simplest **model** there is: a rule that turns an input (a median) into a decision (slow or not), controlled by a number you choose (the threshold). Change the number and every decision can change. Every model in this series, up to neural networks, has that shape: inputs, a rule, and numbers that control the rule. The difference is that later you won't pick the numbers by eye. You'll write code that picks them **from data**, so that the decisions match what actually happened as closely as possible. That's what "learning" means in machine learning.

```check
run "python explore/slow.py" stdout="2 of 6 tests are slow" label="slow.py finds 2 of 6 tests over 5.0 seconds"
```

## Try it

| Change | What to notice |
|---|---|
| In `slowest.py`, change `>` to `<` (and read the name as "fastest") | You get the minimum, 3.7. One character turns `max` into `min`. |
| In `slowest.py`, use `changes = [-0.3, -0.1, -0.2]` and start the loop's name at `0` | It prints 0, which isn't in the list. Start at `changes[0]` and you get -0.1. |
| In `flips.py`, change `range(1, ...)` to `range(0, ...)` | Still 6 here, because the first and last nights are both passes. Change the last item to `"fail"` and the count goes wrong by one. |
| In `verdict.py`, put the `failures > 0 and flips > 2` test first | Same answers: no failures means no flips, so the order doesn't matter *here*. With `elif` it often does, because only the first match runs. |
| In `slow.py`, try `threshold = 4.1` with `>` and then `>=` | 2 slow, then 3: `test_export`'s median is exactly 4.1. Where the boundary goes is part of the rule. |
| `print(True + True)` | `2`. Python treats `True` as 1 and `False` as 0 in arithmetic, which is why `sum` of a list of booleans counts the `True`s. |

## Your turn: a median for any length

**No code is shown in this step.** In lesson 0.3 the median only worked for an odd number of items. Create `explore/median_any.py` that works out the median of **two** lists, the first five and the first six runs of `test_upload`:

```text
first five: 4.0, 4.4, 4.7, 5.0, 5.6
first six:  4.0, 4.4, 4.7, 5.0, 5.6, 5.7
```

It must print exactly:

```text
median of 5: 4.7
median of 6: 4.85
```

For an even count, the median is the average of the two middle items of the sorted list. Your code must **decide** which case it's in from the list's length, so that it would still be right for any list.

```hints
nudge: The two cases need an if and an else. What's true about the length of a list with an odd number of items?
concept: % gives the remainder after division, and an odd number has remainder 1 when divided by 2: len(items) % 2 == 1. For an even count, len(items) // 2 is the index of the upper middle, and the lower middle is just before it.
shape: Sort the list, work out middle = len(in_order) // 2, then if the length is odd the median is in_order[middle]; else it's (in_order[middle - 1] + in_order[middle]) / 2. Do that for each list and print with an f-string.
answer: ~~~python
five = [4.0, 4.4, 4.7, 5.0, 5.6]
six = [4.0, 4.4, 4.7, 5.0, 5.6, 5.7]

in_order = sorted(five)
middle = len(in_order) // 2
if len(in_order) % 2 == 1:
    median = in_order[middle]
else:
    median = (in_order[middle - 1] + in_order[middle]) / 2
print(f"median of {len(five)}: {median}")

in_order = sorted(six)
middle = len(in_order) // 2
if len(in_order) % 2 == 1:
    median = in_order[middle]
else:
    median = (in_order[middle - 1] + in_order[middle]) / 2
print(f"median of {len(six)}: {median}")
~~~
For six items, `middle` is 3, so the two middles are at indexes 2 and 3 (4.7 and 5.0), and their average is 4.85. Writing the same seven lines twice is clumsy, and that's exactly the problem the next lesson solves.
```

```check
run "python explore/median_any.py" stdout="median of 5: 4.7\nmedian of 6: 4.85" label="median_any.py prints 4.7 for five runs and 4.85 for six" -- For six items, average the two middle items of the sorted list, at indexes 2 and 3.
contains explore/median_any.py "if " label="median_any.py decides between the odd and even cases" -- Use an if on the length of the list.
```

## What you've learned

- **Comparisons** produce **booleans**, `True` or `False`. `==` compares; `=` assigns.
- **`if` / `elif` / `else`** run the block of the **first** condition that's `True`, and only that block.
- A decision inside a loop gives you the **running maximum** (start with a real item, not 0) and the **counter** (add 1 when a condition holds).
- **`range(a, b)`** gives indexes, so a loop can compare an item with the one before it.
- **`and`**, **`or`**, **`not`** combine conditions. The flaky-test rule is a **heuristic**: say so, and know where it fails.
- A **threshold rule** is the simplest model: an input, a rule, and a number that controls it. Machine learning is choosing those numbers from data.

Next lesson: you wrote the median twice. **Functions** let you write it once and use it everywhere.
