import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-06', slug: 'builtin-functions', track: 'A', order: 6,
  title: 'Built-in Functions', subtitle: 'The First Tools',
  tags: ['functions', 'abs', 'len', 'round', 'print', 'pure', 'side-effects'],
  prereqs: ['a-04', 'a-05'], unlocks: ['a-07', 'a-08'],
  hook: {
    question: 'What is a function, and why does print() return None?',
    realWorldContext: 'Functions are the unit of work in every program. The most useful distinction to learn first is between a function that gives you back a value you can compute with, and one that does something (like displaying text) and gives back nothing useful. Mixing them up causes a whole family of confusing bugs.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Read a function call as "arguments in, return value out". Tell apart what a function *shows* from what it *returns*. Choose a built-in function for a job and use its result in a further calculation.',
        '**The smallest example.** `abs(-5)` is a **function call**. `abs` is the function\'s name. The parentheses run it. The value inside, `-5`, is the **argument** — the input. The call is replaced by the function\'s **return value**, 5, just as an expression is replaced by its value.',
        'Trace `size = len("hello")`:',
        '1. Evaluate the argument: `"hello"`.\n2. Call `len` with it. `len` counts the characters and **returns** 5.\n3. The call `len("hello")` is replaced by 5, so the line becomes `size = 5`.\n4. Bind `size` to 5.',
        '| Call | Arguments | Returns |\n|---|---|---|\n| `abs(-5)` | -5 | 5 |\n| `len("hello")` | "hello" | 5 |\n| `round(3.7)` | 3.7 | 4 |\n| `round(3.14159, 2)` | 3.14159 and 2 | 3.14 |\n| `max(3, 9, 4)` | 3, 9, 4 | 9 |',
      ),
      check(
        'What does `min(8, -2, 5)` return?',
        ['8', '-2', '2', '5'],
        1,
        '`min` returns the smallest of its arguments, and −2 is smaller than 5 and 8. It does not take absolute values.',
      ),
      notebook('Calls and return values', [
        demo(1, 'Stage 1 — Functions that return values', [
          'Each call below is replaced by its return value, which `print` then displays.',
        ], 'Predict every line using the table, then run. Then store len("data science") in a name and add 1 to it.', 'print(abs(-42))\nprint(round(3.7), round(3.14159, 2))\nprint(len("hello"))\nprint(min(3, 1, 4, 1), max(3, 1, 4, 1))', { expectOutput: ['42', '4 3.14', '5', '1 4'] }),
      ]),
      prose(
        '**Showing is not returning.** `print()` is a function too, but its job is a **side effect**: it writes text to the screen. What it *returns* is `None`, Python\'s value for "nothing". So `x = print("hi")` shows hi and binds `x` to None.',
        '| Call | Shows on screen | Returns |\n|---|---|---|\n| `abs(-5)` | nothing | 5 |\n| `print(-5)` | -5 | None |\n| `print(abs(-5))` | 5 | None |',
        'Functions like `abs`, `len` and `round` are **pure**: they return a value and change nothing else, so you can use their results in any expression. Use `print` only to *look* at a value, never where the value itself is needed.',
      ),
      check(
        'After `x = print("hi")`, what is `x`?',
        ['"hi"', 'None', 'True'],
        1,
        '`print` shows "hi" as a side effect and returns None. The name x is bound to the return value.',
      ),
      notebook('print() returns None', [
        demo(2, 'Stage 2 — The return value of print', [
          'The first line shows "hi" on screen. The name `x` gets print\'s return value.',
        ], 'Predict the last two lines before running.', 'x = print("hi")\nprint(x)\nprint(type(x))', { expectOutput: ['hi', 'None', "<class 'NoneType'>"] }),
        demo(3, 'Stage 3 — The None trap', [
          'This line tries to double what `print` returns. `print` shows 42 and returns None, and None cannot be multiplied.',
        ], 'Run the cell and read the TypeError. Explain why 42 appears on screen before the error. Then fix it so doubled is 84.', 'value = 42\ndoubled = print(value) * 2', { expectError: 'TypeError', expectOutput: ['42'] }),
      ]),
      prose(
        '**The everyday toolkit.** These built-ins work on a whole collection of values at once. Here the values are in a list, written with square brackets; Lesson A.13 covers lists properly.',
        '| Call on `nums = [3, 1, 4, 1, 5]` | Returns |\n|---|---|\n| `sum(nums)` | 14 |\n| `len(nums)` | 5 |\n| `min(nums)`, `max(nums)` | 1, 5 |\n| `sorted(nums)` | a **new** list `[1, 1, 3, 4, 5]`; `nums` is unchanged |\n| `sum(nums) / len(nums)` | 2.8, the mean |',
        '**Two surprises worth knowing.** First, `round()` rounds exact halves to the nearest *even* number: `round(2.5)` is 2 and `round(3.5)` is 4. This "round half to even" rule avoids a bias toward rounding up. Second, `nums.sort()` sorts the list in place and returns None, whereas `sorted(nums)` returns a new sorted list. Writing `nums = nums.sort()` throws the list away.',
      ),
      notebook('Built-ins for collections', [
        demo(4, 'Stage 4 — Summaries of a list', [
          'Each call returns one value computed from the whole list.',
        ], 'Predict each line with the table, then run. Then change one number in nums and predict again.', 'nums = [3, 1, 4, 1, 5]\nprint(sum(nums), len(nums), min(nums), max(nums))\nprint(sorted(nums), nums)\nprint(sum(nums) / len(nums))', { expectOutput: ['14 5 1 5', '[1, 1, 3, 4, 5] [3, 1, 4, 1, 5]', '2.8'] }),
        demo(5, 'Stage 5 — round and sort surprises', [
          'The first line shows round-half-to-even. The last lines show that `.sort()` changes the list but returns None.',
        ], 'Predict each line, then run. Why is round(2.675, 2) not 2.68? (Hint: Lesson A.02 — floats are stored approximately.)', 'print(round(2.5), round(3.5), round(-2.5))\nprint(round(2.675, 2))\nnums = [3, 1, 2]\nresult = nums.sort()\nprint(result, nums)', { expectOutput: ['2 4 -2', '2.67', 'None [1, 2, 3]'] }),
        demo(6, 'Stage 6 — Reading the documentation', [
          '`help(name)` shows a built-in function\'s documentation: what arguments it takes and what it returns.',
        ], 'Run and read the first lines of help for round. Then try help(max) and find how to give it a default value.', 'help(round)'),
      ]),
      prose('**Practice.** Challenges 1 and 2 use the ideas above. Challenge 3 is a fresh problem: choose built-ins and use their results in a new calculation.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Chained built-ins', 'easy', {
          prompt: 'Using only built-in functions, store in result the absolute value of the smallest number in scores.',
          instructions: '1. `min()` finds the smallest number.\n2. `abs()` of that gives its size without the sign.\n3. One line of code.',
          code: 'scores = [-5, 3, -8, 2, -1]\nresult = None',
          testCode: `assert result is not None, "Replace None"
assert result != -8, "min(scores) is -8. Now take its absolute value with abs()"
assert result != 5, "Take the minimum first, then the absolute value: abs(min(scores)). min(abs values) answers a different question"
assert result == 8, f"Expected 8, got {result}"
"SUCCESS: min returns -8, then abs returns 8."`,
          hint: 'result = abs(min(scores))',
          solution: 'scores = [-5, 3, -8, 2, -1]\nresult = abs(min(scores))',
          misconceptions: [{ code: 'result = min([-5, 3, -8, 2, -1])', feedback: 'Now take its absolute value' }],
        }),
        exercise(12, 2, 'Challenge 2 — The None trap', 'medium', {
          prompt: 'This code tries to double a value using what print() returns. Fix it so doubled is 84, and so the value is still displayed.',
          instructions: 'Keep a print so the result is shown, but compute doubled from value, not from print.',
          code: 'value = 42\ndoubled = print(value) * 2',
          testCode: `assert doubled is not None, "doubled is None: print() returns None. Compute doubled from value, then print it separately"
assert doubled == 84, f"doubled should be 84, got {doubled}"
"SUCCESS: compute the value first; print only to look at it."`,
          hint: 'doubled = value * 2\nprint(doubled)',
          solution: 'value = 42\ndoubled = value * 2\nprint(doubled)',
          misconceptions: [{ code: 'value = 42\ndoubled = print(value * 2)', feedback: 'print() returns None' }],
        }),
        exercise(13, 3, 'Challenge 3 — Summarise temperatures', 'medium', {
          prompt: 'From the week of readings in temps, compute temp_range (largest minus smallest) and mean_temp (the mean rounded to 1 decimal place), using built-in functions.',
          instructions: '1. Use `max()` and `min()` for the range.\n2. Use `sum()` and `len()` for the mean.\n3. Round the mean with `round(value, 1)`.',
          code: 'temps = [12.4, 15.1, 9.8, 17.3, 14.0]\ntemp_range = None\nmean_temp = None',
          testCode: `assert temp_range is not None and mean_temp is not None, "Fill in both values"
assert abs(temp_range - 7.5) < 1e-9, f"temp_range should be 17.3 - 9.8 = 7.5, got {temp_range}"
assert mean_temp != 14, "round(x) with no second argument rounds to a whole number. Use round(x, 1) for one decimal place"
assert mean_temp == 13.7, f"mean_temp should be 68.6 / 5 = 13.72, rounded to 13.7. Got {mean_temp}"
"SUCCESS: range 7.5 and mean 13.7, computed from built-in results."`,
          hint: 'temp_range = max(temps) - min(temps); mean_temp = round(sum(temps) / len(temps), 1)',
          solution: 'temps = [12.4, 15.1, 9.8, 17.3, 14.0]\ntemp_range = max(temps) - min(temps)\nmean_temp = round(sum(temps) / len(temps), 1)',
          misconceptions: [{ code: 'temps = [12.4, 15.1, 9.8, 17.3, 14.0]\ntemp_range = max(temps) - min(temps)\nmean_temp = round(sum(temps) / len(temps))', feedback: 'Use round(x, 1)' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'A call takes arguments and is replaced by its return value.',
    'Pure functions (abs, len, round, min, max, sorted) return a value and change nothing else.',
    'print() shows text as a side effect and returns None — never use it where you need the value.',
    'round() rounds exact halves to even; sorted() returns a new list while .sort() returns None.',
    'help(name) shows what a built-in takes and returns.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'x = print("hello"). What is the value of x?',
      options: ['"hello"', 'None — print shows text as a side effect and returns None', 'True'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'sorted([3, 1, 4]) returns [1, 3, 4]. Does it change the original list?',
      options: [
        'Yes — sorted sorts in place',
        'No — sorted returns a new list; list.sort() is the in-place version (and returns None)',
        'Only if the list is assigned to a variable',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'What does round(4.5) return?',
      options: ['5', '4 — exact halves round to the nearest even number', '4.5'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'len([1, [2, 3], 4]) returns what?',
      options: ['4', '3 — len counts the top-level items: 1, [2, 3] and 4', '5'],
      correct: 1,
    },
  ],
}
