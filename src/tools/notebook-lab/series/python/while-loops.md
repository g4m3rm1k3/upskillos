# while loops

A `for` loop runs once for each item in a collection, so before it starts you already know how many times it will run. Plenty of problems are not like that. How many years until savings double? How many guesses until the right number? How many times can you halve a number before it drops below one? You know the condition for stopping, but not how many steps it will take to get there.

The `while` loop handles exactly this. It keeps repeating a block **for as long as a condition is true**, and it stops the moment the condition becomes false. This lesson also covers `break` and `continue`, which let you leave a loop early or skip part of an iteration, in both kinds of loop.

## The while loop

```python type
count = 3
while count > 0:
    print("Countdown:", count)
    count -= 1
print("Lift off!")
```

```output
Countdown: 3
Countdown: 2
Countdown: 1
Lift off!
```

A `while` loop works like an `if` that repeats. Python checks the condition. If it is true, it runs the indented block, then goes back to the top and checks the condition again. As soon as the condition is false, it skips the block and carries on after the loop.

Trace it: `count` is 3, and `3 > 0` is true, so the block prints 3 and lowers `count` to 2. The condition is checked again: `2 > 0`, so it prints 2. Then 1. Then `count` becomes 0, the condition `0 > 0` is false, and the loop ends. Notice that the condition is only checked at the **top** of each pass, not continuously while the block runs.

If the condition is false the very first time, the block never runs at all. Change `count = 3` to `count = 0` and run the cell again: only "Lift off!" appears.

## Every while loop must make progress

Look again at `count -= 1`. Without that line, `count` would stay at 3 forever, the condition would always be true, and the loop would never end. This is an **infinite loop**, and it is the classic mistake with `while`.

A `for` loop cannot run forever, because a list runs out of items. A `while` loop only stops when something inside it changes the condition. So whenever you write a `while` loop, check that the block changes something the condition depends on, and that the change moves it towards being false.

In this notebook an infinite loop is more than an annoyance: Python runs inside the browser tab, so the tab freezes and you will have to reload the page (your code is saved each time you run a cell, so nothing is lost). While you are learning, a simple safety net is a counter that stops the loop after a generous number of steps, as in this cell, which would otherwise never finish:

```python type
x = 10
steps = 0
while x != 0 and steps < 1000:
    x -= 3
    steps += 1
print("Stopped after", steps, "steps, with x =", x)
```

```output
Stopped after 1000 steps, with x = -2990
```

Subtracting 3 from 10 gives 7, 4, 1, -2 and so on, jumping straight past 0, so `x != 0` alone would never become false. The extra condition `steps < 1000` guarantees the loop ends. The output shows it ran all 1000 steps, which tells you something is wrong with the main condition. A condition like `x > 0` is safer than `x != 0` for exactly this reason: it cannot be jumped over.

## When to use which loop

- Use `for` when you are working through a collection, or repeating a known number of times.
- Use `while` when you are repeating until something happens, and do not know how many steps that will take.

Here is a typical `while` problem. Money in a savings account earns 5% interest a year. How many years until 1000 grows to at least 2000?

```python type
balance = 1000
years = 0
while balance < 2000:
    balance *= 1.05
    years += 1
print(f"After {years} years the balance is {balance:.2f}")
```

```output
After 15 years the balance is 2078.93
```

The loop body does one year's work: add the interest and count the year. It repeats while the goal has not been reached. When the loop ends, the condition is false, so you know for certain that `balance` is at least 2000. That guarantee after the loop is a useful way to think about any `while`: **when the loop ends, its condition is false**.

## Taking a number apart

`while` loops pair naturally with the `//` and `%` operators from lesson 2. For any whole number, `n % 10` is its last digit, and `n // 10` is the number with the last digit removed. Repeating these until nothing is left visits every digit:

```python type
n = 4096
digit_total = 0
while n > 0:
    last_digit = n % 10
    digit_total += last_digit
    n = n // 10
print("Sum of the digits:", digit_total)
```

```output
Sum of the digits: 19
```

Trace it: 4096 gives digit 6 and leaves 409; then 9 and 40; then 0 and 4; then 4 and 0. The loop stops when `n` reaches 0, and the digits 6 + 9 + 0 + 4 add up to 19. You do not need to know in advance how many digits the number has, which is exactly why this is a `while` loop and not a `for` loop.

## Leaving a loop early: break

Sometimes you discover partway through a loop that there is no point continuing: you were searching and you have found it. The `break` statement ends the loop immediately, and Python carries on from the first line after the loop.

```python type
readings = [12, 15, 14, 98, 13, 99]
position = 0
for value in readings:
    if value > 90:
        print("Alarm! Reading", value, "at position", position)
        break
    position += 1
print("Finished checking.")
```

```output
Alarm! Reading 98 at position 3
Finished checking.
```

The loop stops at the first reading above 90. The later reading of 99 is never examined, because once the alarm is found the loop has done its job. `break` works in `for` loops and `while` loops alike.

`break` also makes a common `while` pattern possible: a loop whose condition is simply `True`, so it would run forever, with a `break` inside that decides when to stop. This is useful when the stopping decision is easiest to make in the middle of the block rather than at the top.

```python type
n = 27
steps = 0
while True:
    if n == 1:
        break
    if n % 2 == 0:
        n = n // 2
    else:
        n = 3 * n + 1
    steps += 1
print("Reached 1 after", steps, "steps")
```

```output
Reached 1 after 111 steps
```

This follows a famous rule: if a number is even, halve it; if it is odd, multiply it by 3 and add 1. Starting from 27 the numbers climb as high as 9232 before falling back to 1, in 111 steps. Mathematicians have checked that every starting number they have ever tried eventually reaches 1, but nobody has been able to prove it always happens. This is the Collatz conjecture, one of the most famous unsolved problems in mathematics, and you just ran it.

A `while True` loop must always contain a `break` that is guaranteed to be reached, or it really will run forever.

## Skipping ahead: continue

`continue` is the gentler relative of `break`. Instead of leaving the loop, it skips the rest of the **current** iteration and jumps straight back to the top for the next one.

```python type
lines = ["name,score", "", "Ada,91", "# a comment", "Alan,78"]
for line in lines:
    if line == "" or line[0] == "#":
        continue
    print("Processing:", line)
```

```output
Processing: name,score
Processing: Ada,91
Processing: Alan,78
```

Blank lines and lines starting with `#` are skipped; everything else is processed. You could write the same thing with the processing inside an `if`, but `continue` keeps the main code at one level of indentation, which reads better when the processing is long. (Why check `line == ""` first? Because `line[0]` on an empty string would be an `IndexError`, and `or` stops as soon as the first part is true, so the index is never reached.)

In a `while` loop, be careful that `continue` does not jump over the line that makes progress. If the counter update comes after the `continue`, skipping it causes an infinite loop.

## Walking a list with while

A `while` loop can walk through a list by keeping an index yourself. It is longer than a `for` loop, so you would not normally do this for the whole list. It is useful when the loop needs to stop partway for a reason that depends on the position, or needs to move through the list in steps of different sizes.

```python type
temperatures = [3, 5, 8, 12, 15, 11, 7]
i = 0
while i < len(temperatures) and temperatures[i] < 10:
    i += 1
print("First day at 10 or above is day", i + 1)
```

```output
First day at 10 or above is day 4
```

The loop moves forward while the current day is still below 10. The first part of the condition, `i < len(temperatures)`, stops the loop from running off the end of the list if no day ever reaches 10. Because `and` stops as soon as the first part is false, `temperatures[i]` is never looked at when `i` is past the end.

::: challenge Saving up [easy]
You start with `balance` in the bank. At the end of each month you add `deposit`, and then the bank adds 1% interest to the whole balance. Count how many months it takes for the balance to reach at least `target`, and store the count in `months`.

With the starter's numbers it takes 17 months. The check tries other amounts.

```python starter
balance = 200
deposit = 150
target = 3000

months = 0
print("Months:", months)
```

```python solution
balance = 200
deposit = 150
target = 3000

months = 0
while balance < target:
    balance += deposit
    balance *= 1.01
    months += 1
print("Months:", months)
```

```python test
import io, contextlib
def _months(_b, _d, _t):
    _m = 0
    while _b < _t:
        _b = (_b + _d) * 1.01
        _m += 1
    return _m
assert months == _months(200, 150, 3000), f"With the starter's numbers months should be {_months(200, 150, 3000)}, but it is {months}."
for _line in ["balance = 200", "deposit = 150", "target = 3000"]:
    assert _line in _source, f"Keep the line {_line} as it is, so the check can try other amounts."
for _b, _d, _t in [(0, 100, 1000), (5000, 10, 3000), (1000, 500, 1600)]:
    _ns = {}
    _code = _source.replace("balance = 200", f"balance = {_b}").replace("deposit = 150", f"deposit = {_d}").replace("target = 3000", f"target = {_t}")
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_code, _ns)
    _want = _months(_b, _d, _t)
    assert _ns.get("months") == _want, f"Starting at {_b}, depositing {_d} a month, to reach {_t} should take {_want} months, but your code gives {_ns.get('months')}."
"SUCCESS: Your loop stops exactly when the target is reached, even if it is reached at the start."
```

Hint: Loop `while balance < target:`. Each pass is one month: add the deposit, then multiply by 1.01 for the interest, then count the month. If the balance already meets the target, the loop should not run at all, and `months` stays 0.
:::

::: challenge Collatz steps [easy]
Using the Collatz rule from the lesson (halve an even number; multiply an odd number by 3 and add 1), count how many steps it takes for `n` to reach 1, and store the count in `steps`. Starting from 6, the sequence is 6, 3, 10, 5, 16, 8, 4, 2, 1, which is 8 steps. Starting from 1 takes 0 steps. The check tries other starting numbers.

Write it with a `while` loop whose condition checks whether `n` has reached 1, rather than `while True`.

```python starter
n = 6

steps = 0
print("Steps:", steps)
```

```python solution
n = 6

steps = 0
while n != 1:
    if n % 2 == 0:
        n = n // 2
    else:
        n = 3 * n + 1
    steps += 1
print("Steps:", steps)
```

```python test
import io, contextlib
def _collatz(_n):
    _s = 0
    while _n != 1:
        _n = _n // 2 if _n % 2 == 0 else 3 * _n + 1
        _s += 1
    return _s
assert steps == 8, f"Starting from 6 it takes 8 steps, but steps is {steps}."
assert "n = 6" in _source, "Keep the line n = 6 as it is, so the check can try other numbers."
assert "while True" not in _source, "Put the stopping condition in the while line itself this time, instead of while True."
for _n in [1, 2, 7, 27, 97]:
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace("n = 6", f"n = {_n}", 1), _ns)
    assert _ns.get("steps") == _collatz(_n), f"Starting from {_n} it takes {_collatz(_n)} steps, but your code gives {_ns.get('steps')}."
"SUCCESS: Your loop reaches 1 from any starting number."
```

Hint: The loop should keep going `while n != 1:`. Inside it, use `if`/`else` to apply the rule, and make sure the even case uses `//` so `n` stays a whole number. Count every step.
:::

::: challenge First repeated word [medium]
Find the first word in `words` that has already appeared earlier in the list, and store it in `repeat`. For the starter's list, `"the"` appears first at position 0 and again at position 3, but `"cat"` repeats earlier: it is at position 1 and again at position 2. So `repeat` is `"cat"`.

If no word repeats, `repeat` should stay `None`. Stop looking as soon as you find the answer. The check tries other lists.

```python starter
words = ["the", "cat", "cat", "the", "dog"]

repeat = None
print("First repeat:", repeat)
```

```python solution
words = ["the", "cat", "cat", "the", "dog"]

repeat = None
seen = []
for word in words:
    if word in seen:
        repeat = word
        break
    seen.append(word)
print("First repeat:", repeat)
```

```python test
import io, contextlib
assert repeat == "cat", f"repeat should be 'cat', but it is {repeat!r}."
_start = 'words = ["the", "cat", "cat", "the", "dog"]'
assert _start in _source, "Keep the words line as it is, so the check can try other lists."
for _words, _want in [(["a", "b", "c"], None), (["x", "y", "x", "y"], "x"), (["go", "go"], "go"), ([], None), (["a", "b", "b", "a"], "b")]:
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace(_start, f"words = {_words}"), _ns)
    assert _ns.get("repeat") == _want, f"For {_words} the first repeat should be {_want!r}, but your code gives {_ns.get('repeat')!r}."
"SUCCESS: You found the first repeat and stopped looking."
```

Hint: Keep a list of the words you have already seen, starting empty. For each word: if it is already in that list, you have found the repeat, so store it and `break`. Otherwise add it to the list. A word is "a repeat" when you meet it the second time, so check before you add.
:::

## What you learned

- `while condition:` repeats its block as long as the condition is true, checking it at the top of each pass. If it is false at the start, the block never runs.
- Every `while` loop must change something that moves its condition towards false; otherwise it is an infinite loop. In this notebook, an infinite loop freezes the tab until you reload.
- Use `for` for a collection or a known count; use `while` to repeat until something happens.
- When a `while` loop ends, its condition is false, which tells you something certain about your variables.
- `n % 10` and `n // 10` take a number apart one digit at a time.
- `break` leaves a loop at once. `while True:` with a `break` inside is a common pattern, but the `break` must be reachable.
- `continue` skips the rest of the current iteration and moves on to the next.

Your programs are getting longer, and you have started to repeat the same few lines in different places. Next you will learn to package code into functions: named, reusable pieces you can call whenever you need them.
