import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-08', slug: 'defining-functions', track: 'A', order: 8,
  title: 'Defining Functions', subtitle: 'Building Your Own Machines',
  tags: ['def', 'parameters', 'return', 'scope', 'pure-functions'],
  prereqs: ['a-05', 'a-07'], unlocks: ['a-09', 'a-10'],
  hook: {
    question: 'How do you create a computation you can reuse by name?',
    realWorldContext: 'A calculation written once as a function and called a hundred times is one place to get right instead of a hundred. Functions also give a computation a name, so code reads like a description of what it does.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Define a function, and trace a call through its parameters, local names and return value. Explain why a function\'s local names never leak out — and why a list passed into a function can still be changed by it. Write a small pure function and test it.',
        '**The smallest example.**',
        '```python\ndef add_tax(price, rate):\n    total = price * (1 + rate)\n    return total\n```',
        '`def` stores a recipe under the name `add_tax`; nothing is computed yet. `price` and `rate` are **parameters**: names that will receive values when the function is called. The indented lines are the **body**. `return` ends the call and sends a value back.',
        'Trace the call `add_tax(100, 0.25)`:',
        '1. The **arguments** 100 and 0.25 are bound to the parameters: `price = 100`, `rate = 0.25`. These are **local** names, private to this call.\n2. The body runs: `total = 100 * 1.25`, so `total` (also local) is 125.0.\n3. `return total` ends the call. The call expression is replaced by 125.0.\n4. The local names `price`, `rate` and `total` are discarded.',
        'A second call, `add_tax(40, 0.5)`, starts again with fresh local names: `price = 40`, `rate = 0.5`, and returns 60.0. Nothing from the first call is remembered.',
      ),
      check(
        'After `with_tax = add_tax(40, 0.5)`, what is `with_tax`, and can the next line use the name `total`?',
        ['60.0; yes, total is 60.0', '60.0; no, total was local to the call', 'None; no'],
        1,
        'The call returns 60.0, which is bound to `with_tax`. `total` existed only inside that call.',
      ),
      notebook('Defining and calling', [
        demo(1, 'Stage 1 — One definition, two calls', [
          'The definition runs first and only stores the recipe. Each call binds new arguments to the parameters and returns a value.',
        ], 'Predict both results using the trace above, then run. Then add a third call with your own arguments.', 'def add_tax(price, rate):\n    total = price * (1 + rate)\n    return total\n\nprint(add_tax(100, 0.25))\nprint(add_tax(40, 0.5))', { expectOutput: ['125.0', '60.0'] }),
        demo(2, 'Stage 2 — Local names stay local', [
          'After the call, the function\'s local name `total` does not exist. Only the returned value, stored in `with_tax`, is available.',
        ], 'Run the cell and read the NameError. Then change the last line to print(with_tax).', 'with_tax = add_tax(40, 0.5)\nprint(total)', { expectError: 'NameError' }),
      ]),
      prose(
        '**Forgetting return.** A function without `return` still runs its body, but returns None. The value is computed and then thrown away.',
        '| Body | `double(5)` returns |\n|---|---|\n| `return n * 2` | 10 |\n| `n * 2` | None — computed, never returned |\n| `print(n * 2)` | None — 10 is shown on screen, but not returned |',
        '**Defaults and keywords.** A parameter can have a **default value**, used when the caller leaves that argument out: `def round_to(value, decimals=2)`. Callers can also name arguments — `round_to(3.14159, decimals=4)` — which makes calls self-explanatory.',
      ),
      notebook('return, defaults and keywords', [
        demo(3, 'Stage 3 — The missing return', [
          'Three versions of "double". Only one gives its result back to the caller.',
        ], 'Predict all three outputs, then run. Note which line shows 10 on screen even though the function returns None.', 'def double_return(n):\n    return n * 2\n\ndef double_no_return(n):\n    n * 2\n\ndef double_print(n):\n    print(n * 2)\n\nprint(double_return(5))\nprint(double_no_return(5))\nprint(double_print(5))', { expectOutput: ['10\nNone\n10\nNone'] }),
        demo(4, 'Stage 4 — Default and keyword arguments', [
          'The first call uses the default of 2 decimals. The second overrides it by position, the third by name.',
        ], 'Run. Then give round_to a new call that uses the keyword with a value of 0.', 'def round_to(value, decimals=2):\n    return round(value, decimals)\n\nprint(round_to(3.14159))\nprint(round_to(3.14159, 4))\nprint(round_to(3.14159, decimals=1))', { expectOutput: ['3.14', '3.1416', '3.1'] }),
      ]),
      prose(
        '**Local names, shared objects.** Local scope protects *names*, not *values*. When you call `f(scores)`, the parameter inside `f` becomes a second name for the same list — no copy is made (see the aliasing preview in Lesson A.04).',
        '| Inside the function | Effect on the caller\'s list |\n|---|---|\n| `items = [0, 0, 0]` (rebinding the local name) | none |\n| `items + [bonus]` returned as a new list | none |\n| `items.append(bonus)` (changing the list in place) | **the caller\'s list changes** |',
        'A **pure function** returns a value that depends only on its arguments and changes nothing else — no printing, no changing its inputs. Pure functions are easy to test: the same call always gives the same answer. Prefer returning a new value to changing an argument.',
      ),
      check(
        '`scores = [70, 85]`, then a function runs `items.append(5)` on it. What is `scores` afterwards?',
        ['[70, 85]', '[70, 85, 5]', 'None'],
        1,
        '`items` and `scores` name the same list, and `append` changes that list in place.',
      ),
      notebook('Scope and shared lists', [
        demo(7, 'Stage 5 — Rebinding versus changing in place', [
          '`rebind` only moves its local name. `add_bonus_pure` builds and returns a new list. `add_bonus_mutating` changes the list the caller passed in.',
        ], 'Predict each print before running. Then change add_bonus_pure to use items.append(bonus) and return items — run again and see scores change. Undo that before moving on.', 'def rebind(items):\n    items = [0, 0, 0]          # new local binding — caller unaffected\n    return items\n\ndef add_bonus_mutating(items, bonus):\n    items.append(bonus)        # changes the SAME list the caller holds\n\ndef add_bonus_pure(items, bonus):\n    return items + [bonus]     # builds a NEW list; input untouched\n\nscores = [70, 85]\nrebind(scores)\nprint(scores)\n\nnew_scores = add_bonus_pure(scores, 5)\nprint(scores, new_scores)\n\nadd_bonus_mutating(scores, 5)\nprint(scores)', { expectOutput: ['[70, 85]\n[70, 85] [70, 85, 5]\n[70, 85, 5]'] }),
        demo(5, 'Stage 6 — Test a function with assert', [
          '`assert condition, message` does nothing when the condition is True and raises AssertionError with your message when it is False. A few asserts — ordinary cases plus edge cases such as the exact limits — are a quick way to test a pure function.',
        ], 'Run: silence means every test passed. Then break clamp (swap min and max) and run again to see a failing test.', 'def clamp(value, lo, hi):\n    return max(lo, min(value, hi))\n\nassert clamp(50, 0, 100) == 50, "inside the range stays the same"\nassert clamp(150, 0, 100) == 100, "above the range becomes hi"\nassert clamp(-5, 0, 100) == 0, "below the range becomes lo"\nassert clamp(100, 0, 100) == 100, "the limit itself is allowed"\nprint("all clamp tests passed")', { expectOutput: ['all clamp tests passed'] }),
        demo(6, 'Stage 7 — Functions calling functions', [
          'A function can use another function. `normalize_score` reuses `clamp` from the cell above, so run that cell first.',
        ], 'Run the cell. Then click ↺ Reset variables and run only this cell: which name is missing, and why?', 'def normalize_score(raw):\n    clamped = clamp(raw, 0, 100)\n    return clamped / 100\n\nprint(normalize_score(150), normalize_score(73), normalize_score(-5))', { expectOutput: ['1.0 0.73 0.0'] }),
      ]),
      prose('**Practice.** Challenges 1 and 2 turn a rule into a function. Challenge 3 is a fresh problem: write a function with a default argument that passes tests you have not seen.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Celsius to Fahrenheit', 'easy', {
          prompt: 'Write celsius_to_fahrenheit(c) that returns the temperature in Fahrenheit: F = C × 9/5 + 32.',
          instructions: '1. Compute the formula from the parameter c.\n2. Return it — do not print it.',
          code: 'def celsius_to_fahrenheit(c):\n    pass  # replace with your code\n\nprint(celsius_to_fahrenheit(100))',
          testCode: `assert celsius_to_fahrenheit(0) is not None, "The function returns None: use return, not print"
for c, f in [(0, 32), (100, 212), (-40, -40), (37, 98.6)]:
    got = celsius_to_fahrenheit(c)
    assert abs(got - f) < 1e-9, f"celsius_to_fahrenheit({c}) should be {f}, got {got}"
"SUCCESS: 0 → 32, 100 → 212, -40 → -40 and 37 → 98.6."`,
          hint: 'return c * 9 / 5 + 32',
          solution: 'def celsius_to_fahrenheit(c):\n    return c * 9 / 5 + 32',
          misconceptions: [{ code: 'def celsius_to_fahrenheit(c):\n    print(c * 9 / 5 + 32)', feedback: 'use return, not print' }],
        }),
        exercise(12, 2, 'Challenge 2 — Clamp', 'medium', {
          prompt: 'Write clamp(value, lo, hi): return value if it lies between lo and hi, lo if it is below, and hi if it is above.',
          instructions: 'One line with min() and max() is enough. Check it against the three cases in the clamping table from Lesson A.07.',
          code: 'def clamp(value, lo, hi):\n    pass  # replace with your code',
          testCode: `cases = [(150, 0, 100, 100), (-5, 0, 100, 0), (50, 0, 100, 50), (3, 3, 10, 3), (10, 3, 10, 10)]
for v, lo, hi, want in cases:
    got = clamp(v, lo, hi)
    assert got is not None, "clamp returns None: add return"
    assert got == want, f"clamp({v}, {lo}, {hi}) should be {want}, got {got}"
"SUCCESS: values below, inside, above and exactly at the limits all work."`,
          hint: 'return max(lo, min(value, hi))',
          solution: 'def clamp(value, lo, hi):\n    return max(lo, min(value, hi))',
          misconceptions: [{ code: 'def clamp(value, lo, hi):\n    return min(value, hi)', feedback: 'clamp(-5, 0, 100) should be 0' }],
        }),
        exercise(13, 3, 'Challenge 3 — Split the bill', 'medium', {
          prompt: 'Write split_bill(total, people, tip_rate=0.1) that returns each person\'s share of the total plus tip, rounded to 2 decimal places. The tip rate should default to 10%.',
          instructions: '1. Add the tip: total × (1 + tip_rate).\n2. Divide by the number of people.\n3. Round to 2 places and return.\nWrite two asserts of your own under the function before running the checker.',
          code: 'def split_bill(total, people, tip_rate):\n    share = total * (1 + tip_rate) / people\n    print(round(share, 2))',
          testCode: `got = split_bill(100, 4)
assert got is not None, "split_bill returns None: return the rounded share instead of printing it"
assert got == 27.5, f"split_bill(100, 4) should be 27.5 (110 / 4), got {got}"
assert split_bill(90, 3, tip_rate=0.2) == 36.0, "split_bill(90, 3, tip_rate=0.2) should be 36.0"
assert split_bill(10, 3, 0) == 3.33, "split_bill(10, 3, 0) should be 3.33: round to 2 decimal places"
"SUCCESS: the default tip, a keyword tip and rounding all work."`,
          hint: 'Give the parameter a default: tip_rate=0.1. Replace print(...) with return round(share, 2).',
          solution: 'def split_bill(total, people, tip_rate=0.1):\n    share = total * (1 + tip_rate) / people\n    return round(share, 2)\n\nassert split_bill(100, 4) == 27.5\nassert split_bill(20, 2, 0) == 10.0',
          misconceptions: [
            { code: 'def split_bill(total, people, tip_rate):\n    return round(total * (1 + tip_rate) / people, 2)', feedback: "missing 1 required positional argument: 'tip_rate'" },
            { code: 'def split_bill(total, people, tip_rate=0.1):\n    print(round(total * (1 + tip_rate) / people, 2))', feedback: 'returns None' },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'def stores a recipe; a call binds arguments to parameters, runs the body, and is replaced by the return value.',
    'Parameters and names assigned in the body are local to one call and disappear afterwards.',
    'No return means the function returns None — even if it printed something.',
    'Rebinding a parameter never affects the caller; changing a passed-in list in place does.',
    'Pure functions (result depends only on arguments, nothing else changed) are easy to test with assert.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'def f(x): x * 2 — what does f(5) return?',
      options: ['10', 'None — the value is computed but never returned', 'An error'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'In def area(width, height): ..., and the call area(3, 4), which are the parameters and which the arguments?',
      options: [
        'width and height are parameters; 3 and 4 are arguments',
        '3 and 4 are parameters; width and height are arguments',
        'They are two names for the same thing',
      ],
      correct: 0,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A function assigns items = [] to its parameter items. Does the caller\'s list change?',
      options: [
        'Yes — the list is emptied',
        'No — that only rebinds the local name; the caller\'s list is untouched',
        'Only if the list was empty already',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Why are pure functions easier to test?',
      options: [
        'They run faster',
        'Their result depends only on their arguments and they change nothing else, so a test just compares a call with its expected result',
        'Python checks them automatically',
      ],
      correct: 1,
    },
  ],
}
