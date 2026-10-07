# for loops

Computers are useful because they do boring work quickly and without mistakes. Adding up a thousand prices, checking every word in a book, drawing each square of a chessboard: in each case the same small piece of work is repeated, once for every item. Writing that piece out a thousand times is not an option, and usually you do not even know in advance how many items there will be.

A **loop** runs the same block of code repeatedly. Python's `for` loop runs a block once for **each item** in a collection such as a list or a string. It is probably the single most useful thing in this series: from here on, almost every program you write will contain one.

## Your first loop

```python type
names = ["Ada", "Grace", "Alan"]
for name in names:
    print("Hello,", name)
print("Done.")
```

```output
Hello, Ada
Hello, Grace
Hello, Alan
Done.
```

Read the loop as English: *for each name in names, print a greeting*. The line `for name in names:` works like this:

1. Python takes the first item of `names` and makes the variable `name` refer to it.
2. It runs the indented block below, with `name` equal to `"Ada"`.
3. It goes back to the top, makes `name` refer to the next item, `"Grace"`, and runs the block again.
4. It repeats until there are no items left, then carries on with the first line after the block.

The variable after `for` is called the **loop variable**. You choose its name, and it is a normal variable: a new value is simply assigned to it before each pass through the block. Each pass is called an **iteration**, and going through a collection item by item is called **iterating** over it.

The syntax follows the same pattern as `if`: a colon at the end of the first line, and an indented block. "Done." is not indented, so it is not part of the loop and runs once, after the loop has finished.

A good habit is to name the collection with a plural and the loop variable with the singular: `for name in names`, `for score in scores`, `for word in words`. Then the loop reads like a sentence.

## Tracing a loop

The best way to understand a loop is to **trace** it by hand: follow the program line by line and write down what each variable holds. Predict the output of this cell by tracing it before you run it.

```python type
numbers = [3, 5, 2]
for n in numbers:
    doubled = n * 2
    print(n, "doubled is", doubled)
print("After the loop, n is", n)
```

```output
3 doubled is 6
5 doubled is 10
2 doubled is 4
After the loop, n is 2
```

On the first iteration `n` is 3, so `doubled` is 6. Then `n` is 5 and `doubled` is 10, then 2 and 4. The last line shows something worth knowing: after the loop ends, the loop variable still refers to the last item it was given.

Any sequence can be looped over. A string is a sequence of characters, so a `for` loop over a string visits each character in turn:

```python type
for letter in "loop":
    print(letter.upper())
```

```output
L
O
O
P
```

## Repeating a number of times: range

Sometimes you do not have a list; you just want to repeat something a number of times, or count. The built-in `range` produces a sequence of whole numbers for a loop to walk through.

```python type
for i in range(5):
    print("Iteration", i)
```

```output
Iteration 0
Iteration 1
Iteration 2
Iteration 3
Iteration 4
```

`range(5)` produces 0, 1, 2, 3, 4: five numbers, starting at 0 and stopping just **before** 5. That is exactly the same rule as slicing, and it means `range(n)` always runs a loop exactly `n` times. (By tradition, a loop variable that is just a counter is often called `i`.)

`range` can also take a start, and a step:

```python type
print(list(range(5)))
print(list(range(2, 7)))
print(list(range(0, 20, 5)))
print(list(range(10, 0, -2)))
```

```output
[0, 1, 2, 3, 4]
[2, 3, 4, 5, 6]
[0, 5, 10, 15]
[10, 8, 6, 4, 2]
```

`range` does not actually build a list; it produces its numbers one at a time as the loop asks for them, which is why it can count to a billion without using up memory. Wrapping it in `list()` builds the list so you can see the numbers. `range(start, stop)` counts from `start` up to just before `stop`. `range(start, stop, step)` counts in jumps of `step`, and a negative step counts down.

## The accumulator pattern

Most useful loops follow one of a small number of patterns, and the most common is the **accumulator**: give a variable a starting value before the loop, and update it on every iteration.

```python type
prices = [2.50, 4.99, 1.25, 3.00]
total = 0
for price in prices:
    total += price
print("Total:", round(total, 2))
```

```output
Total: 11.74
```

`total` starts at 0. Each iteration adds one price to it: 2.50, then 7.49, then 8.74, then 11.74. When the loop ends, `total` holds the sum of every price. (Python's built-in `sum` does exactly this; writing it yourself shows how it works, and the same pattern handles cases `sum` cannot.)

Where the accumulator is set up matters. Predict what this version prints.

```python type
prices = [2.50, 4.99, 1.25, 3.00]
for price in prices:
    total = 0
    total += price
print("Total:", total)
```

```output
Total: 3.0
```

It prints `3.0`, the last price alone. Because `total = 0` is inside the loop, it runs on every iteration and wipes out the running total each time. Set up the accumulator **before** the loop; update it **inside** the loop; use the result **after** the loop.

An accumulator does not have to be a number. It can be a list you add to, or a string you build up:

```python type
words = ["cat", "horse", "ox", "giraffe"]
lengths = []
initials = ""
for word in words:
    lengths.append(len(word))
    initials += word[0]
print(lengths)
print(initials)
```

```output
[3, 5, 2, 7]
chog
```

## Loops with decisions

Put an `if` inside a loop and the loop can treat each item differently. This is how you **filter** a collection (keep only some items) or **count** the items that match a condition.

```python type
temperatures = [14, 22, 31, 18, 27, 33]
hot_days = []
for t in temperatures:
    if t > 25:
        hot_days.append(t)
print("Hot days:", hot_days)
print("Number of hot days:", len(hot_days))
```

```output
Hot days: [31, 27, 33]
Number of hot days: 3
```

Look at the indentation. The `if` is inside the loop, indented one level. The `append` is inside the `if`, indented two levels. Each level of indentation means "belongs to the line above that ends with a colon".

The same combination finds things. Here is how you would find the largest number without the built-in `max`: keep the best one seen so far, and replace it whenever you meet a bigger one.

```python type
numbers = [41, 7, 93, 12, 58]
largest = numbers[0]
for n in numbers:
    if n > largest:
        largest = n
print("Largest:", largest)
```

```output
Largest: 93
```

`largest` starts as the first number, not as 0. Starting at 0 would give the wrong answer for a list of negative numbers, since no item would ever be bigger than 0.

## Positions as well as items

Sometimes you need to know **where** an item is, not just what it is: to print a numbered list, or to compare each item with the next one. One way is to loop over the positions with `range(len(...))` and use each position as an index.

```python type
runners = ["Kim", "Sam", "Lee"]
for i in range(len(runners)):
    print(f"{i + 1}. {runners[i]}")
```

```output
1. Kim
2. Sam
3. Lee
```

`len(runners)` is 3, so `i` takes the values 0, 1 and 2, which are exactly the valid indexes of the list. The `i + 1` turns the zero-based position into the one-based number people expect. (Python has a neater tool for this, `enumerate`, which you will meet once you have learned about tuples.)

Positions let you compare neighbouring items. This loop finds how much a value changed from one day to the next. It stops one position early, because the last day has no next day to compare with:

```python type
visitors = [120, 135, 128, 160]
for i in range(len(visitors) - 1):
    change = visitors[i + 1] - visitors[i]
    print(f"Day {i + 1} to {i + 2}: {change:+}")
```

```output
Day 1 to 2: +15
Day 2 to 3: -7
Day 3 to 4: +32
```

The format specification `:+` shows a plus sign on positive numbers, so rises and falls stand out. Without the `- 1`, the last iteration would ask for `visitors[4]`, which does not exist, and the loop would crash with an `IndexError`.

## Loops inside loops

The block of a loop can contain another loop. For every iteration of the outer loop, the inner loop runs completely. This is how you work through a grid, or combine every item of one list with every item of another.

```python type
for row in range(1, 4):
    line = ""
    for col in range(1, 6):
        line += f"{row * col:4}"
    print(line)
```

```output
   1   2   3   4   5
   2   4   6   8  10
   3   6   9  12  15
```

This prints a multiplication table. The outer loop runs 3 times, and for each row the inner loop runs 5 times, so the inner block runs 15 times in total. The format `:4` pads each number to 4 characters wide so the columns line up. Notice that `line = ""` sits inside the outer loop: each row needs a fresh, empty line to build on.

The same shape reads a grid stored as a list of lists:

```python type
grid = [
    [1, 0, 1],
    [0, 1, 1],
]
count = 0
for row in grid:
    for cell in row:
        count += cell
print("Cells switched on:", count)
```

```output
Cells switched on: 4
```

## A warning: changing a list while looping over it

Do not add items to, or remove items from, a list while a `for` loop is walking through that same list. The loop keeps track of its position by index, so removing an item shifts everything after it along by one, and the loop skips an item. Predict whether this removes every even number.

```python type
numbers = [2, 4, 5, 6, 8]
for n in numbers:
    if n % 2 == 0:
        numbers.remove(n)
print(numbers)
```

```output
[4, 5, 8]
```

It leaves `[4, 5, 8]`: two even numbers survived, because each removal shifted the next item into the position the loop had just finished with. The safe way is to build a new list of the items you want to keep, using the filter pattern from above.

::: challenge Sum of the even numbers [easy]
Add up only the even numbers in `numbers` and store the result in `even_total`. For the starter's list that is 2 + 8 + 10 = 20. Use a loop; the check tries other lists.

```python starter
numbers = [3, 2, 7, 8, 10, 1]

even_total = 0
print(even_total)
```

```python solution
numbers = [3, 2, 7, 8, 10, 1]

even_total = 0
for n in numbers:
    if n % 2 == 0:
        even_total += n
print(even_total)
```

```python test
import io, contextlib
assert even_total == 20, f"even_total should be 20 (2 + 8 + 10), but it is {even_total}."
_start = "numbers = [3, 2, 7, 8, 10, 1]"
assert _start in _source, "Keep the numbers line as it is, so the check can try other lists."
for _nums in [[1, 3, 5], [4, 4, 4], [-2, 7, 0, 6], []]:
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace(_start, f"numbers = {_nums}"), _ns)
    _want = sum(x for x in _nums if x % 2 == 0)
    assert _ns.get("even_total") == _want, f"For {_nums} the even total should be {_want}, but your code gives {_ns.get('even_total')}."
"SUCCESS: That's the accumulator pattern with a filter inside it."
```

Hint: Start `even_total` at 0 before the loop. Inside the loop, add a number to it only if it is even; a number is even when `n % 2 == 0`.
:::

::: challenge FizzBuzz [medium]
FizzBuzz is a counting game, and a classic programming exercise. Going through the numbers from 1 to `n`:

- if the number is divisible by both 3 and 5, say `"FizzBuzz"`,
- otherwise, if it is divisible by 3, say `"Fizz"`,
- otherwise, if it is divisible by 5, say `"Buzz"`,
- otherwise, say the number itself, as a string.

Build a list called `results` with what is said for each number, in order. For `n = 15` it ends `..., "13", "14", "FizzBuzz"`. The check tries other values of `n`.

```python starter
n = 15

results = []
print(results)
```

```python solution
n = 15

results = []
for i in range(1, n + 1):
    if i % 15 == 0:
        results.append("FizzBuzz")
    elif i % 3 == 0:
        results.append("Fizz")
    elif i % 5 == 0:
        results.append("Buzz")
    else:
        results.append(str(i))
print(results)
```

```python test
import io, contextlib
def _fizz(_n):
    _out = []
    for _i in range(1, _n + 1):
        _out.append("FizzBuzz" if _i % 15 == 0 else "Fizz" if _i % 3 == 0 else "Buzz" if _i % 5 == 0 else str(_i))
    return _out
assert results == _fizz(15), f"For n = 15 results should be {_fizz(15)}, but it is {results}."
assert "n = 15" in _source, "Keep the line n = 15 as it is, so the check can try other values."
for _n in [1, 5, 30]:
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace("n = 15", f"n = {_n}", 1), _ns)
    assert _ns.get("results") == _fizz(_n), f"For n = {_n} results should be {_fizz(_n)}, but your code gives {_ns.get('results')}."
"SUCCESS: FizzBuzz, correct for every n."
```

Hint: `range(1, n + 1)` gives the numbers 1 to `n`, because the stop is never included. Check "divisible by both 3 and 5" first, just as the grades example checked the most specific condition first. The numbers need `str()` so the list holds only strings.
:::

::: challenge The longest word [medium]
Find the longest word in `words` without using `max`, and store it in `longest`. If several words tie for longest, keep the one that comes **first**. For the starter's list the answer is `"banana"`: it and `"cherry"` both have six letters, and `"banana"` comes first. The check tries other lists.

```python starter
words = ["fig", "banana", "kiwi", "cherry", "date"]

longest = ""
print(longest)
```

```python solution
words = ["fig", "banana", "kiwi", "cherry", "date"]

longest = ""
for word in words:
    if len(word) > len(longest):
        longest = word
print(longest)
```

```python test
import io, contextlib
assert longest == "banana", f"longest should be 'banana' (it ties with 'cherry', and comes first), but it is {longest!r}."
assert "max(" not in _source, "Solve it with a loop rather than max(), so you can see how it works."
_start = 'words = ["fig", "banana", "kiwi", "cherry", "date"]'
assert _start in _source, "Keep the words line as it is, so the check can try other lists."
for _words, _want in [(["a", "abc", "ab"], "abc"), (["tie", "one", "two"], "tie"), (["solo"], "solo")]:
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace(_start, f"words = {_words}"), _ns)
    assert _ns.get("longest") == _want, f"For {_words} the longest word should be {_want!r}, but your code gives {_ns.get('longest')!r}."
"SUCCESS: You kept the best so far and replaced it only when you found something strictly better."
```

Hint: Use the "best so far" pattern from the largest-number example, comparing lengths with `len`. To keep the first of several tied words, replace `longest` only when a word is strictly longer: `>` rather than `>=`.
:::

## What you learned

- `for item in collection:` runs the indented block once for each item, with the loop variable referring to that item.
- A `for` loop works on any sequence, including lists, strings and `range`.
- `range(n)` gives 0 up to `n - 1`; `range(start, stop, step)` counts from `start` to just before `stop`.
- The accumulator pattern: set up before the loop, update inside it, use after it.
- An `if` inside a loop filters or counts items. The "best so far" pattern finds the largest or longest.
- `for i in range(len(items)):` loops over positions when you need them.
- A loop inside a loop runs completely on every iteration of the outer loop.
- Never add to or remove from a list while looping over it; build a new list instead.

A `for` loop repeats once per item, so you always know in advance how many times it will run. Next you will meet the `while` loop, which keeps going for as long as a condition is true, for the times when you cannot know in advance.
