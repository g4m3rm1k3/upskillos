import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-11', slug: 'for-loops', track: 'A', order: 11,
  title: 'For Loops and Iteration', subtitle: 'Repeating Over Sequences',
  tags: ['for', 'loops', 'range', 'enumerate', 'break', 'continue', 'comprehension'],
  prereqs: ['a-10', 'a-05'], unlocks: ['a-12', 'a-13'],
  hook: {
    question: 'How does a program repeat an operation for every item in a collection?',
    realWorldContext: 'Adding up 5 numbers by hand is easy; adding up 5 million rows needs a loop. Almost every data summary — totals, counts, averages, maximums — is a loop that carries a value from one item to the next.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Trace a loop iteration by iteration with a table. Build totals, counts and maximums with correctly initialised accumulators. Use `range`, `enumerate`, `break` and `continue`, and translate a simple loop into a list comprehension.',
        '**A list, briefly.** A **list** is several values in order, written in square brackets: `prices = [4, 10, 6]`. That is all you need for this lesson; Lesson A.13 covers lists in depth.',
        '**The smallest example.** A `for` loop runs its indented body once for each item, binding a name to the current item each time:',
        '```python\nprices = [4, 10, 6]\ntotal = 0\nfor p in prices:\n    total = total + p\nprint(total)\n```',
        'Trace it with one row per **iteration** (one pass through the body):',
        '| Iteration | p | total before | total after |\n|---|---|---|---|\n| 1 | 4 | 0 | 4 |\n| 2 | 10 | 4 | 14 |\n| 3 | 6 | 14 | 20 |',
        'After the last iteration the loop ends and `print(total)` shows 20. `total` is an **accumulator**: a name set up *before* the loop, updated *inside* it, and read *after* it.',
      ),
      check(
        'Suppose `total = 0` were moved inside the loop, as the first line of the body. What would be printed?',
        ['20', '6', '0', 'A NameError'],
        1,
        'Each iteration would reset total to 0 and then add the current price, so after the last iteration total is 0 + 6 = 6. Initialise accumulators before the loop.',
      ),
      notebook('Loops and accumulators', [
        demo(1, 'Stage 1 — One iteration per item', [
          'The body runs once per item. The loop name `p` is rebound at the start of every iteration.',
        ], 'Run. Then add a fourth price and predict how many lines print.', 'prices = [4, 10, 6]\nfor p in prices:\n    print("current price:", p)\nprint("loop finished; p is still", p)', { expectOutput: ['current price: 4', 'current price: 6', 'loop finished; p is still 6'] }),
        demo(2, 'Stage 2 — Sum and count together', [
          'Two accumulators updated in the same loop. The print inside the loop reproduces the trace table, with a count column added.',
        ], 'Compare each printed row with the table above, then run. Then add a third accumulator for the largest price seen so far.', 'prices = [4, 10, 6]\ntotal = 0\ncount = 0\nfor p in prices:\n    total = total + p\n    count = count + 1\n    print("p =", p, "| total =", total, "| count =", count)\nprint("mean:", total / count)', { expectOutput: ['p = 4 | total = 4 | count = 1', 'p = 6 | total = 20 | count = 3', 'mean: 6.666666666666667'] }),
      ]),
      prose(
        '**Initialisation mistakes.** Most loop bugs are in the line *before* the loop.',
        '| Mistake | Result |\n|---|---|\n| accumulator set inside the loop | only the last item survives |\n| accumulator never set | NameError on the first update |\n| wrong starting value for a product (0 instead of 1) | the result is always 0 |\n| running maximum starting at 0 | wrong when every value is negative |',
        'The starting value should be the answer for *no items yet*: 0 for a sum or count, 1 for a product, and for a maximum, the first item itself.',
      ),
      notebook('Initialisation bugs', [
        demo(3, 'Stage 3 — Two broken accumulators', [
          'Both loops run without error but give wrong answers. The first resets its total every iteration; the second multiplies by a starting value of 0.',
        ], 'Run and explain each wrong answer with a trace table. Then fix both.', 'prices = [4, 10, 6]\nfor p in prices:\n    total = 0          # bug: reset every iteration\n    total = total + p\nprint("total:", total)\n\nproduct = 0            # bug: 0 times anything is 0\nfor p in prices:\n    product = product * p\nprint("product:", product)', { expectOutput: ['total: 6', 'product: 0'] }),
      ]),
      prose(
        '**Counting with range().** `range` produces a sequence of whole numbers for a loop to walk through. The stop value is never included.',
        '| Call | Numbers produced |\n|---|---|\n| `range(5)` | 0, 1, 2, 3, 4 |\n| `range(2, 6)` | 2, 3, 4, 5 |\n| `range(2, 10, 3)` | 2, 5, 8 |\n| `range(5, 0, -1)` | 5, 4, 3, 2, 1 |',
        '**Index and item together.** `enumerate(items)` gives each item together with its position, counting from 0: `for i, name in enumerate(names)`.',
      ),
      check(
        'Which numbers does `range(2, 8, 2)` produce?',
        ['2, 4, 6, 8', '2, 4, 6', '2, 3, 4, 5, 6, 7'],
        1,
        'Start at 2, step by 2, and stop before 8 — the stop value is excluded.',
      ),
      notebook('range and enumerate', [
        demo(4, 'Stage 4 — range', [
          '`list(range(...))` shows all the numbers at once, which is handy for checking.',
        ], 'Predict each list from the table, then run. Then write a range that produces 10, 20, 30.', 'print(list(range(5)))\nprint(list(range(2, 6)))\nprint(list(range(2, 10, 3)))\nprint(list(range(5, 0, -1)))', { expectOutput: ['[0, 1, 2, 3, 4]', '[2, 3, 4, 5]', '[2, 5, 8]', '[5, 4, 3, 2, 1]'] }),
        demo(5, 'Stage 5 — enumerate', [
          'Each iteration unpacks a position and an item.',
        ], 'Run. Then use enumerate(fruits, start=1) to number the items from 1.', 'fruits = ["apple", "banana", "cherry"]\nfor i, fruit in enumerate(fruits):\n    print(i, fruit)', { expectOutput: ['0 apple', '2 cherry'] }),
      ]),
      prose(
        '**Decisions inside a loop.** An `if` in the body lets a loop count or collect only some items. Two keywords change the flow: `continue` skips the rest of the body and moves to the next item; `break` leaves the loop entirely.',
      ),
      notebook('Filtering, break and continue', [
        demo(6, 'Stage 6 — Count the items that pass a test', [
          'The count increases only in iterations where the condition is True.',
        ], 'Predict how many readings are above 20, then run. Then count readings of exactly 20 or more.', 'readings = [18, 25, 20, 31, 12]\nabove = 0\nfor r in readings:\n    if r > 20:\n        above = above + 1\nprint(above, "readings above 20")', { expectOutput: ['2 readings above 20'] }),
        demo(7, 'Stage 7 — break and continue', [
          'The first loop stops at the first even number. The second skips odd numbers.',
        ], 'Trace each loop on paper, then run.', 'numbers = [1, 3, 4, 7, 8, 11]\nfor n in numbers:\n    if n % 2 == 0:\n        print("first even:", n)\n        break\n\nfor n in numbers:\n    if n % 2 != 0:\n        continue\n    print("even:", n)', { expectOutput: ['first even: 4', 'even: 4', 'even: 8'] }),
      ]),
      prose(
        '**List comprehensions.** Building a new list with a loop has a compact form. These two produce the same list:',
        '```python\nsquares = []\nfor n in numbers:\n    if n % 2 == 0:\n        squares.append(n ** 2)\n\nsquares = [n ** 2 for n in numbers if n % 2 == 0]\n```',
        'Read the comprehension as: "n squared, for each n in numbers, if n is even". Use it for simple "transform and/or filter" jobs. Keep the full loop when the body has several steps, prints, or updates more than one value.',
      ),
      notebook('Comprehensions', [
        demo(8, 'Stage 8 — Loop and comprehension agree', [
          'Both versions build the same list.',
        ], 'Run. Then change the condition in both versions to keep only numbers greater than 2.', 'numbers = [1, 2, 3, 4, 5, 6]\nsquares_loop = []\nfor n in numbers:\n    if n % 2 == 0:\n        squares_loop.append(n ** 2)\n\nsquares_comp = [n ** 2 for n in numbers if n % 2 == 0]\nprint(squares_loop, squares_comp, squares_loop == squares_comp)', { expectOutput: ['[4, 16, 36] [4, 16, 36] True'] }),
      ]),
      prose('**Practice.** Challenge 1 builds a sum and a count with correct initialisation. Challenge 2 builds a list. Challenge 3 is a fresh problem where the obvious starting value is wrong.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Sum and count', 'easy', {
          prompt: 'Using one for loop, compute total (the sum of all readings), hot_days (how many readings are above 25) and mean (total divided by the number of readings).',
          instructions: '1. Initialise both accumulators before the loop.\n2. Update total every iteration, hot_days only when the reading is above 25.\n3. Compute mean after the loop.',
          code: 'readings = [22, 27, 31, 19, 26, 24]\n# initialise here\n\nfor r in readings:\n    pass  # update here\n\nmean = None',
          testCode: `assert total != 24, "total equals the last reading: it is being reset inside the loop. Initialise it before the loop"
assert total == 149, f"total should be 149, got {total}"
assert hot_days == 3, f"hot_days should be 3 (27, 31 and 26), got {hot_days}"
assert mean is not None and abs(mean - 149 / 6) < 1e-9, "mean should be total / len(readings)"
"SUCCESS: total 149, 3 hot days, mean about 24.83."`,
          hint: 'total = 0\nhot_days = 0\nfor r in readings:\n    total = total + r\n    if r > 25:\n        hot_days = hot_days + 1\nmean = total / len(readings)',
          solution: 'readings = [22, 27, 31, 19, 26, 24]\ntotal = 0\nhot_days = 0\nfor r in readings:\n    total = total + r\n    if r > 25:\n        hot_days = hot_days + 1\nmean = total / len(readings)',
          misconceptions: [{ code: 'readings = [22, 27, 31, 19, 26, 24]\nhot_days = 0\nfor r in readings:\n    total = 0\n    total = total + r\n    if r > 25:\n        hot_days += 1\nmean = total / 6', feedback: 'it is being reset inside the loop' }],
        }),
        exercise(12, 2, 'Challenge 2 — Even squares', 'easy', {
          prompt: 'Build even_squares: the squares of all even numbers from 0 to 20 inclusive, in increasing order. Use a loop or a comprehension.',
          instructions: 'Remember that range stops before its stop value.',
          code: 'even_squares = None\nprint(even_squares)',
          testCode: `assert isinstance(even_squares, list), "even_squares should be a list"
assert 400 in even_squares, "20 is missing: range(20) stops at 19. Use range(21) to include 20"
assert even_squares == [0, 4, 16, 36, 64, 100, 144, 196, 256, 324, 400], f"Got {even_squares}"
"SUCCESS: 11 even squares from 0 to 400."`,
          hint: 'even_squares = [n ** 2 for n in range(21) if n % 2 == 0]',
          solution: 'even_squares = [n ** 2 for n in range(21) if n % 2 == 0]',
          misconceptions: [{ code: 'even_squares = [n ** 2 for n in range(20) if n % 2 == 0]', feedback: 'Use range(21)' }],
        }),
        exercise(13, 3, 'Challenge 3 — Running maximum', 'medium', {
          prompt: 'Write max_so_far(numbers) that returns a list where each element is the largest value seen up to that point. Do not call max() on the whole list. It must work for lists of negative numbers too.',
          instructions: 'Think about the starting value first: what is the largest value seen when only the first item has been seen?',
          code: 'def max_so_far(numbers):\n    result = []\n    current_max = 0\n    for n in numbers:\n        if n > current_max:\n            current_max = n\n        result.append(current_max)\n    return result\n\nprint(max_so_far([3, 1, 4, 1, 5]))',
          testCode: `assert max_so_far([3, 1, 4, 1, 5, 9, 2, 6]) == [3, 3, 4, 4, 5, 9, 9, 9], "Check the running maximum for [3, 1, 4, 1, 5, 9, 2, 6]"
got = max_so_far([-5, -2, -9])
assert got != [0, 0, 0], "Starting current_max at 0 is wrong when every value is negative: start with the first element"
assert got == [-5, -2, -2], f"max_so_far([-5, -2, -9]) should be [-5, -2, -2], got {got}"
assert max_so_far([7]) == [7], "A single element is its own running maximum"
"SUCCESS: the running maximum starts from the first element, so negative inputs work."`,
          hint: 'current_max = numbers[0] before the loop.',
          solution: 'def max_so_far(numbers):\n    result = []\n    current_max = numbers[0]\n    for n in numbers:\n        if n > current_max:\n            current_max = n\n        result.append(current_max)\n    return result',
          misconceptions: [{ code: 'def max_so_far(numbers):\n    result = []\n    current_max = 0\n    for n in numbers:\n        current_max = n if n > current_max else current_max\n        result.append(current_max)\n    return result', feedback: 'start with the first element' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'for x in items: runs the body once per item, rebinding x each time.',
    'Accumulator: set it before the loop to the answer for "no items yet", update inside, read after.',
    'Trace loops with a table: one row per iteration, one column per changing name.',
    'range(a, b, step) excludes b. enumerate gives (position, item) pairs.',
    'A comprehension [expr for x in items if cond] is a compact loop that builds a list.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'total = 0; for x in [1, 2, 3, 4]: total += x. What is total after the loop?',
      options: ['4', '10 — 0+1, then +2, +3, +4', '0'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'What does list(range(3, 8)) produce?',
      options: ['[3, 4, 5, 6, 7, 8]', '[3, 4, 5, 6, 7] — the stop value is excluded', '[0, 1, 2, 3, 4, 5, 6, 7]'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'What should a product accumulator start at?',
      options: ['0', '1 — multiplying by 1 leaves the first item unchanged', 'The last item'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'for i, name in enumerate(["Alice", "Bob", "Carol"]): what are i and name on the second iteration?',
      options: ['i = 1, name = "Bob"', 'i = 2, name = "Bob"', 'i = 0, name = "Bob"'],
      correct: 0,
    },
  ],
}
