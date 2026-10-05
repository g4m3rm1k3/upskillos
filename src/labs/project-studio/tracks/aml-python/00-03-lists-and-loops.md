---
title: 0.3 — Lists and Loops: Fifteen Timings
runtime: python
---

`test_export` has run fifteen nights in a row. You could give every timing its own name, `first`, `second`, … `fifteenth`, and add them up by hand as in the last lesson, but that doesn't scale to fifteen, let alone to the thousands of runs a real CI system records. This lesson introduces the two tools every data program is built on: a **list**, which holds many values under one name, and a **loop**, which does the same thing to each of them.

Then you'll use them to answer a question that matters for the rest of this series: **what is a typical run of `test_export`?** The obvious answer, the average, turns out to be badly wrong, and you'll see exactly why.

## A list

Create `explore/lists.py`:

```python file=explore/lists.py
export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
print(len(export))
print(export[0])
print(export[5])
print(export[-1])
print(export[0:3])
```

```powershell
python explore/lists.py
```

```text
15
4.1
120.0
4.0
[4.1, 4.1, 3.8]
```

> **List**: a value that holds other values in order. Written with square brackets and commas: `[4.1, 4.1, 3.8]`. Each value in it is an **item** (or *element*).

**How it works.**

- **`len(export)`** gives the list's **length**: how many items it holds, 15.
- **`export[0]`** is **indexing**: square brackets after a list pick one item by its position, called its **index**. The first item is at index **0**, not 1.
- **`export[5]`** is the **sixth** item: 120.0. That's the night `test_export` hung and was stopped by the CI system's two-minute timeout.
- **`export[-1]`** counts from the end: `-1` is the last item, `-2` the one before it.
- **`export[0:3]`** is a **slice**: a new list of the items from index 0 **up to but not including** index 3, so three items.

### Why the first index is 0

An index isn't "which item"; it's **how far from the start**. The first item is 0 steps from the start, the second is 1 step, the sixth is 5 steps. This comes from how a list is stored: Python keeps the items' locations one after another in memory, and finding item `i` means "start at the beginning and move `i` places along", a single calculation however long the list is. That's why indexing is instant even for a list of a million items.

It also makes slices tidy: `export[0:3]` has `3 - 0 = 3` items, and `export[0:3] + export[3:6]` is exactly the first six, with nothing repeated or missed.

```check
run "python explore/lists.py" stdout="15\n4.1\n120.0\n4.0\n[4.1, 4.1, 3.8]" label="lists.py prints the length, three single items and a slice" -- Check the list has all 15 timings in this order, with 120.0 sixth.
```

## A loop

Create `explore/loop.py`. The lines under `for` start with **four spaces**:

```python file=explore/loop.py
first_week = [4.1, 4.1, 3.8, 4.0, 4.3]
for seconds in first_week:
    print("run took", seconds)
    print("next")
print("done")
```

```predict
question: How many times does "done" print?
choice: Once
choice: Five times, once per run
choice: Six times
answer: Once
explain: Only the **indented** lines belong to the loop and repeat. `print("done")` has no indent, so it isn't part of the loop: it runs once, after the loop has finished with every item.
```

```powershell
python explore/loop.py
```

```text
run took 4.1
next
run took 4.1
next
run took 3.8
next
run took 4.0
next
run took 4.3
next
done
```

> **`for` loop**: repeats a block of code once for each item in a list (or anything else that can hand out items one at a time). **Block**: the indented lines under a line ending in `:`. **Iteration** (or *pass*): one run through the block.

**How it works.** `for seconds in first_week:` does this:

1. Take the first item of `first_week`, 4.1, and attach the name `seconds` to it (exactly like `seconds = 4.1`).
2. Run the whole indented block, top to bottom.
3. Go back to the `for` line and take the **next** item: `seconds` now refers to 4.1 again (the second run), and the block runs again.
4. When there are no items left, carry on with the first line after the block: `print("done")`.

So the block runs 5 times, with `seconds` referring to a different timing each time. The name `seconds` is your choice; `for run in first_week:` would work the same, but a name that says what each item *is* makes the block easier to read.

**Why indentation matters.** In Python, indentation isn't decoration: it is how Python knows which lines belong to the loop. Four spaces is the standard. Indent `print("done")` by four spaces and it becomes part of the loop, printing five times. Indent one line by three spaces and the other by four, and Python stops with an `IndentationError`, because it can't tell what you meant.

Trace `explore/loop.py` in **CodeLens** (🔬 Trace in CodeLens with the file open): watch the arrow go back up to the `for` line after every pass, and `seconds` change each time.

```check
run "python explore/loop.py" stdout="run took 4.3\nnext\ndone" label="loop.py prints each run with next after it, then done" -- Indent the two print lines inside the loop by four spaces; leave print("done") unindented.
run "python explore/loop.py" without="done\nrun" label="done prints once, after the loop, not inside it" -- print("done") must have no indent, so it isn't part of the loop.
```

## Adding up any number of timings

Now combine the loop with the running total from lesson 0.2. Create `explore/total.py`:

```python file=explore/total.py
export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
total = 0
for seconds in export:
    total = total + seconds
print(total)
print(total / len(export))
```

```powershell
python explore/total.py
```

```text
176.49999999999997
11.766666666666664
```

The total is 176.5 seconds, with a float error you can now explain (lesson 0.2), and the **mean** is about 11.77 seconds.

### How the running total works

This pattern, called an **accumulator**, is the most important loop you'll write in this chapter. You'll use it for totals, counts, maximums and groups. It has three parts:

1. **Before the loop**, start a name at a neutral value: `total = 0`. Zero is neutral for adding: adding 0 changes nothing.
2. **Inside the loop**, update it using the current item: `total = total + seconds`. The right side uses the *old* total; then the name is attached to the new one.
3. **After the loop**, the name holds the answer for the whole list.

Step through it with the first five runs. Press **Next step** to run one more pass:

```figure
name: aml/LoopTrace
caption: The accumulator, one pass at a time. Each row's right-hand column is the old total plus this pass's `seconds`.
props: {"values": [4.1, 4.1, 3.8, 4.0, 4.3], "mode": "sum"}
```

The loop doesn't know or care how long the list is. The same three lines add 5 timings or 5 million.

**Why `total = 0` goes before the loop, not inside it.** If it were inside, every pass would first throw the total away and start again from 0. After the last pass, `total` would hold only the last timing, 4.0. That's the most common accumulator bug, and the program still prints a believable number. Try it in the **Try it** section.

Now trace `explore/total.py` in CodeLens and watch `total` grow by one timing per pass. Notice the moment it jumps by 120.

### The notation, now that you've computed it

Statistics books write the mean like this:

$$\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$$

Read it as the code you just wrote:

- $x_1, x_2, \ldots, x_n$ are the items: $x_1$ is `export[0]`. (Maths counts from 1; Python from 0.)
- $n$ is how many there are: `len(export)`.
- $\sum_{i=1}^{n} x_i$, "the sum of $x_i$ for $i$ from 1 to $n$", is the loop: `total = total + seconds` for every item. $\Sigma$ is the Greek capital S, for *sum*.
- $\frac{1}{n}\sum$ divides the total by the count. $\bar{x}$, "x bar", is the name for the result.

The notation is a compact way of writing something you've already computed. Whenever a formula looks intimidating in this series, it will be translated like this, after the code.

```check
run "python explore/total.py" stdout="176.49999999999997\n11.766666666666664" label="total.py prints the total and the mean of all fifteen runs" -- Put total = 0 before the loop and total = total + seconds inside it, indented.
```

## Python's own sum

Python has a built-in function that adds up a list. Add two lines to `explore/total.py`:

```python file=explore/total.py
export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
total = 0
for seconds in export:
    total = total + seconds
print(total)
print(total / len(export))
print(sum(export))
print(sum(export) / len(export))
```

```text
176.49999999999997
11.766666666666664
176.5
11.766666666666667
```

`sum(export)` agrees with your loop, almost. It gets exactly 176.5.

**How it works.** Since Python 3.12, `sum` adds floats more carefully than a plain loop. As it goes, it keeps a second number holding the tiny rounding error of each addition, the bits that fell off, and adds that correction back at the end. Your loop simply discards those bits each time, and over fifteen additions they add up to 0.00000000000003.

This is the pattern you'll follow with every library in this series: **write the simple version yourself, then use the library, and check they agree**. Where they differ, there's a reason, and knowing it is what separates using a tool from understanding it. Here the difference is far too small to matter for timings, so from now on use `sum`. You know exactly what it does, plus one improvement.

```check
run "python explore/total.py" stdout="176.5\n11.766666666666667" label="total.py also prints sum(export) and the mean from it"
```

## Is the mean a typical run?

The mean is 11.77 seconds. Look back at the list: fourteen of the fifteen runs took between 3.7 and 4.3 seconds.

The figure below plots each run as a dot. The orange dot is run 6, the timeout. Drag its slider down to a normal 4 seconds, then back up, and watch the two dashed lines:

```figure
name: aml/MeanMedianOutlier
caption: One run moves; every other run stays where it is. The mean (orange) follows the moving run. The median (blue) barely notices.
props: {"values": [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0], "index": 5, "max": 130}
```

**How it works.** The mean is the total divided by the count, so **every second of every run counts equally**. The timeout adds 120 seconds to the total where a normal run adds about 4, so it alone pulls the mean up by (120 − 4) / 15 ≈ 7.7 seconds. One bad night makes the "typical" run look three times slower than any normal run. Not one of the fifteen runs actually took anything like 11.77 seconds.

A value far from the rest, like that 120.0, is called an **outlier**. CI data is full of them: timeouts, a slow machine, a network hiccup. You need a measure of "typical" that an outlier can't drag around. That's the **median**.

## The median

> **Median**: the middle value once the values are sorted. Half the values are at or below it, half at or above.

Create `explore/median.py`:

```python file=explore/median.py
export = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0]
in_order = sorted(export)
print(in_order)
middle = len(in_order) // 2
print(middle)
print(in_order[middle])
```

```powershell
python explore/median.py
```

```text
[3.7, 3.8, 3.8, 4.0, 4.0, 4.0, 4.1, 4.1, 4.1, 4.1, 4.1, 4.2, 4.2, 4.3, 120.0]
7
4.1
```

The median is **4.1 seconds**, which really is what a typical run of `test_export` takes.

**How it works.**

- **`sorted(export)`** gives a **new** list with the same items in increasing order. The original `export` is unchanged.
- **`len(in_order) // 2`** is `15 // 2`, which is 7 (whole-number division, from lesson 0.1's Try it). Index 7 is the eighth item, and in a list of 15 there are exactly 7 items before it and 7 after it. That's what "middle" means.
- The timeout ends up at the far end of the sorted list. Whether it took 120 seconds or 12,000, it's still just "the biggest one", one place at the end, so the middle doesn't move.

With an **even** number of values there are two middles, and the median is the average of them. Tick the box in this figure to see it:

```figure
name: aml/MedianSorted
caption: Odd count, one middle; even count, two middles averaged. `//` finds the right index either way.
props: {"values": [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1]}
```

For 6 values, `6 // 2` is 3, and the two middles are at indexes 2 and 3: the one at `middle - 1` and the one at `middle`. Handling both cases needs a decision, "is the count odd or even?", which is the next lesson's subject. Until then your lists have 15 items, an odd number.

**Why both?** Neither is "right": they answer different questions. The **mean** answers *"how much time do these runs cost in total, per run?"*. If you're paying for CI machine time, the timeout really did cost you 120 seconds, and the mean includes it. The **median** answers *"how long does a normal run take?"*. A report that shows both, side by side, tells you when something unusual happened: a big gap between them means outliers.

```check
run "python explore/median.py" stdout="7\n4.1" label="median.py prints the middle index 7 and the median 4.1"
```

## Try it

| Change | What to notice |
|---|---|
| In `total.py`, change `120.0` to `1200.0` | The mean jumps to about 83.8. Change `median.py` the same way: the median is still 4.1. |
| In `total.py`, delete `120.0, ` from the list | The mean drops to about 4.04, now close to the median. Fourteen normal runs agree with each other. |
| In `total.py`, move `total = 0` inside the loop, indented above `total = total + seconds` | `total` ends as 4.0, the last timing. Trace it in CodeLens to watch it reset every pass. |
| `print(export[15])` in `lists.py` | `IndexError: list index out of range`. The last index of a 15-item list is 14. |
| `print(max(export), min(export))` | `120.0 3.7`: built-ins for the largest and smallest item. In the next lesson you'll write `max` yourself. |
| `for letter in "test":` then `print(letter)` | A string can be looped over too: one character per pass. |
| In `loop.py`, indent `print("done")` | It prints five times: it's now part of the block. |

## Your turn: upload.py

**No code is shown in this step.** `test_upload` took these times on the same fifteen nights:

```text
4.0, 4.4, 4.7, 5.0, 5.6, 5.7, 6.2, 6.6, 6.7, 7.0, 7.4, 7.9, 8.3, 8.6, 9.0
```

Create `explore/upload.py` that stores them in a list and prints exactly:

```text
runs: 15
mean: 6.47
median: 6.6
fastest: 4.0
slowest: 9.0
first to last: 5.0 s slower
```

Rules: add up the timings **with your own `for` loop and accumulator**, not with `sum`, and show the mean with 2 decimal places. "first to last" is the last run's time minus the first run's.

When it works, look at your output and the list. The mean and the median are close this time, because there's no outlier. But something else is going on with `test_upload` that neither number shows. In Chapter 7 you'll build a model that predicts when it will pass the team's 10-second budget.

```hints
nudge: Start from total.py and median.py: the list, an accumulator loop, then sorted and // for the middle.
concept: Every line is one value from the list: len for the count, the accumulator divided by the count for the mean, the middle of the sorted list for the median, min and max for fastest and slowest, and indexes 0 and -1 for the first and last runs.
shape: total = 0 before a for loop; total = total + seconds inside it. Then six print calls with f-strings; use {mean:.2f} for the mean. The last line is upload[-1] - upload[0].
answer: ~~~python
upload = [4.0, 4.4, 4.7, 5.0, 5.6, 5.7, 6.2, 6.6, 6.7, 7.0, 7.4, 7.9, 8.3, 8.6, 9.0]
total = 0
for seconds in upload:
    total = total + seconds
mean = total / len(upload)
in_order = sorted(upload)
median = in_order[len(in_order) // 2]
print(f"runs: {len(upload)}")
print(f"mean: {mean:.2f}")
print(f"median: {median}")
print(f"fastest: {min(upload)}")
print(f"slowest: {max(upload)}")
print(f"first to last: {upload[-1] - upload[0]} s slower")
~~~
The mean is 97.1 / 15 = 6.4733…, shown as `6.47` by `:.2f`. The list happens to be in increasing order already, so `sorted` changes nothing here, but you can't rely on that for real data, so sort anyway.
```

```check
run "python explore/upload.py" stdout="runs: 15\nmean: 6.47\nmedian: 6.6\nfastest: 4.0\nslowest: 9.0\nfirst to last: 5.0 s slower" label="upload.py prints all six lines exactly" -- Check each label, the 2 decimal places on the mean, and that first to last is the last timing minus the first.
contains explore/upload.py "for " label="upload.py adds up with a for loop" -- Write the accumulator: total = 0, then a for loop that adds each timing.
lacks explore/upload.py "sum(" label="upload.py doesn't use sum" -- This step is practice for the accumulator: add up with your own loop.
```

## What you've learned

- A **list** holds items in order. **Indexes** count from 0 (the distance from the start); `-1` is the last item; a **slice** `[a:b]` runs from `a` up to but not including `b`.
- A **`for` loop** attaches a name to each item in turn and runs the **indented block** once per item.
- The **accumulator**: a neutral starting value before the loop, an update inside it, the answer after it.
- `sum` adds the same way, but more carefully: write it yourself, then trust the library and know where it differs.
- The **mean** counts every second, so one **outlier** drags it a long way. The **median**, the middle of the sorted values, ignores how extreme the outlier is. Report both, and a gap between them tells you something unusual happened.

Next lesson: decisions. Which runs failed, which tests are flaky, and which are slow: and you'll write `max` yourself.
