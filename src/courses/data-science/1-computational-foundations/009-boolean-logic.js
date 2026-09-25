import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-09', slug: 'boolean-logic', track: 'A', order: 9,
  title: 'Boolean Logic and Comparisons', subtitle: 'The Decision Layer',
  tags: ['bool', 'comparisons', 'and', 'or', 'not', 'truthiness', 'short-circuit'],
  prereqs: ['a-04', 'a-08'], unlocks: ['a-10', 'a-11'],
  hook: {
    question: 'How does a program compare values and combine conditions?',
    realWorldContext: 'Every filter in a data pipeline and every validation rule is a boolean expression. Misreading one — especially at its boundaries, like "at least 18" versus "over 18" — silently selects the wrong rows.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Evaluate comparisons and combined conditions with truth tables, including exactly what happens at the boundaries of a range. Trace short-circuiting. Recognise that `and` and `or` return one of their operands, not always True or False.',
        '**The smallest example.** A **comparison** produces a bool. `7 > 5` is True. Combining two comparisons with `and` asks whether both hold: `7 > 5 and 7 < 10` → `True and True` → True.',
        '| Operator | Meaning | `7 ? 5` |\n|---|---|---|\n| `==` | equal | False |\n| `!=` | not equal | True |\n| `<`, `<=` | less than, less than or equal | False, False |\n| `>`, `>=` | greater than, greater than or equal | True, True |',
        '`==` asks a question; `=` assigns. `x == 5` produces True or False and changes nothing; `x = 5` rebinds x.',
        'Two comparisons that surprise people: text compares character by character, so `"10" < "9"` is True (the character "1" comes before "9"). And floats are stored approximately, so `0.1 + 0.2 == 0.3` is False; compare floats with `math.isclose` instead.',
      ),
      check(
        'What is `"10" < "9"`?',
        ['False, because 10 is bigger than 9', 'True, because text is compared character by character', 'An error'],
        1,
        'These are text values. Python compares the first characters, "1" and "9"; "1" comes first, so the answer is True. Convert to numbers to compare them as numbers.',
      ),
      notebook('Comparisons', [
        demo(1, 'Stage 1 — Comparison operators', [
          'Each line produces a bool. The last two lines show the text and float surprises.',
        ], 'Predict each line before running. Then compare int("10") < int("9").', 'import math\nprint(7 > 5, 7 < 5, 7 == 7, 7 != 5, 7 >= 7)\nprint("10" < "9")\nprint(0.1 + 0.2 == 0.3, math.isclose(0.1 + 0.2, 0.3))', { expectOutput: ['True False True True True', 'True', 'False True'] }),
      ]),
      prose(
        '**Combining conditions.** `and` is True only when both sides are True. `or` is True when at least one side is True. `not` flips a single value. Every case fits in a truth table:',
        '| a | b | `a and b` | `a or b` | `not a` |\n|---|---|---|---|---|\n| True | True | True | True | False |\n| True | False | False | True | False |\n| False | True | False | True | True |\n| False | False | False | False | True |',
        '`not` binds most tightly, then `and`, then `or`. So `True or False and False` means `True or (False and False)`, which is True. When you mix `and` with `or`, add parentheses so nobody has to remember that.',
        '**Ranges and their boundaries.** "x is between 5 and 10" must say whether 5 and 10 themselves count. Python lets you chain comparisons: `5 <= x <= 10` means `5 <= x and x <= 10`.',
        '| x | `5 <= x <= 10` (inclusive) | `5 < x < 10` (exclusive) | `5 <= x < 10` (half-open) |\n|---|---|---|---|\n| 4 | False | False | False |\n| 5 | True | False | True |\n| 7 | True | True | True |\n| 10 | True | False | False |\n| 11 | False | False | False |',
      ),
      check(
        'A discount applies to orders of "at least 50". Which condition is right?',
        ['total > 50', 'total >= 50', 'total == 50'],
        1,
        '"At least 50" includes 50 itself, so the boundary uses `>=`. Test the boundary value 50 explicitly: it is where `>` and `>=` disagree.',
      ),
      notebook('Combining conditions', [
        demo(2, 'Stage 2 — The truth table in code', [
          'This loops over the four combinations of a and b (loops are Lesson A.11) and prints each row of the table above.',
        ], 'Run and compare with the table. Then add a column for not (a and b) and check that it matches (not a) or (not b).', 'for a in [True, False]:\n    for b in [True, False]:\n        print(a, b, a and b, a or b)', { expectOutput: ['True True True True', 'True False False True', 'False True False True', 'False False False False'] }),
        demo(3, 'Stage 3 — Boundaries of a range', [
          'The three versions of "between 5 and 10" agree in the middle and disagree exactly at the boundaries.',
        ], 'Predict the rows for x = 5 and x = 10 before running. Which version would you use for "a score from 5 to 10"?', 'for x in [4, 5, 7, 10, 11]:\n    print(x, 5 <= x <= 10, 5 < x < 10, 5 <= x < 10)', { expectOutput: ['5 True False True', '10 True False False'] }),
      ]),
      prose(
        '**Short-circuiting.** Python evaluates `and` and `or` from left to right and stops as soon as the answer is known. `False and X` is False whatever X is, so X is never evaluated. `True or X` is True whatever X is, so again X is skipped. You can rely on this to guard a risky check:',
        '| x | `x != 0` | `10 / x > 2` evaluated? | result |\n|---|---|---|---|\n| 4 | True | yes: 2.5 > 2 is True | True |\n| 0 | False | **no** — skipped | False |',
        'Reversing the order, `10 / x > 2 and x != 0`, would divide by zero before the guard runs.',
      ),
      notebook('Short-circuiting', [
        demo(4, 'Stage 4 — Which side runs?', [
          '`noisy` prints a line whenever it is called, so you can see which right-hand sides were evaluated.',
        ], 'Predict which of the four lines call noisy, then run.', 'def noisy():\n    print("  (right side evaluated)")\n    return True\n\nprint(False and noisy())\nprint(True or noisy())\nprint(True and noisy())\nprint(False or noisy())', { expectOutput: ['False\nTrue\n  (right side evaluated)\nTrue\n  (right side evaluated)\nTrue'] }),
        demo(5, 'Stage 5 — A guard that relies on short-circuiting', [
          'For x = 0 the guard `x != 0` is False, so the division is never attempted.',
        ], 'Run. Then swap the two sides of the and and run again: read the error.', 'for x in [4, 0]:\n    print(x, x != 0 and 10 / x > 2)', { expectOutput: ['4 True', '0 False'] }),
      ]),
      prose(
        '**`and` and `or` return an operand.** With bools on both sides, the result is a bool. With other values, Python uses each value\'s **truthiness** — whether it counts as true — and returns one of the operands itself. The values that count as false are `False`, `0`, `0.0`, `""`, `[]`, `{}` and `None`; everything else counts as true.',
        '| Expression | Result | Why |\n|---|---|---|\n| `0 or 5` | `5` | 0 counts as false, so `or` returns the right operand |\n| `"" or "unknown"` | `"unknown"` | empty text counts as false |\n| `3 and 7` | `7` | 3 counts as true, so `and` returns the right operand |\n| `0 and 7` | `0` | 0 counts as false, so `and` stops and returns it |',
        'This makes `name = typed_name or "anonymous"` a common default-value idiom. Its trap: a legitimate 0 or empty value is replaced too. `quantity = typed_quantity or 1` turns a real order of 0 into 1.',
      ),
      check(
        'What is `0 or 10`?',
        ['True', '10', '0', 'False'],
        1,
        '`or` returns its first operand if that operand counts as true; 0 counts as false, so it returns the second operand, 10 — not the bool True.',
      ),
      notebook('Truthiness', [
        demo(6, 'Stage 6 — Truthiness and returned operands', [
          'The first line shows which values count as false. The second shows `or` and `and` returning operands. The last lines show the default-value trap.',
        ], 'Predict each line. Then rewrite the quantity line so a real 0 is kept, using an explicit comparison with None.', 'print(bool(0), bool(""), bool([]), bool(None), bool(42), bool("0"))\nprint(0 or 5, "" or "unknown", 3 and 7, 0 and 7)\n\ntyped_quantity = 0\nquantity = typed_quantity or 1\nprint(quantity)   # the real 0 was replaced', { expectOutput: ['False False False False True True', '5 unknown 7 0', '1'] }),
      ]),
      callout('tip', 'De Morgan\'s laws', '`not (a and b)` is the same as `(not a) or (not b)`, and `not (a or b)` is the same as `(not a) and (not b)`. So "not between 5 and 10" — `not (5 <= x <= 10)` — can be written `x < 5 or x > 10`.'),
      prose('**Practice.** Challenge 1 is a range check with tricky boundaries. Challenge 2 combines `and` with `or`. Challenge 3 is a fresh problem where you must state the boundary behaviour yourself.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Valid age', 'easy', {
          prompt: 'Write is_valid_age(age) that returns True only for whole numbers from 0 to 120 inclusive. Decimals, text, None and True/False are not valid ages.',
          instructions: '1. Check the type first, so later comparisons never see text or None.\n2. `type(age) is int` is stricter than `isinstance` — remember from Lesson A.02 that True counts as an int for isinstance.\n3. Then check the inclusive range.',
          code: 'def is_valid_age(age):\n    pass  # replace with your code',
          testCode: `for age, want in [(25, True), (0, True), (120, True), (-1, False), (121, False)]:
    got = is_valid_age(age)
    assert got is not None, "is_valid_age returns None: add return"
    assert got == want, f"is_valid_age({age}) should be {want}. Inclusive means 0 and 120 themselves are valid: use <=" if age in (0, 120) else f"is_valid_age({age}) should be {want}"
assert is_valid_age(25.5) is False, "25.5 is not a whole number: check the type"
assert is_valid_age("30") is False, "Text is not a valid age: check the type before comparing"
assert is_valid_age(None) is False, "None is not a valid age"
assert is_valid_age(True) is False, "True counts as an int for isinstance (bool is a subclass of int). Use type(age) is int"
"SUCCESS: boundaries 0 and 120 are included; decimals, text, None and bools are rejected."`,
          hint: 'return type(age) is int and 0 <= age <= 120 — the type check runs first, and short-circuiting skips the comparison when it is False.',
          solution: 'def is_valid_age(age):\n    return type(age) is int and 0 <= age <= 120',
          misconceptions: [
            { code: 'def is_valid_age(age):\n    return type(age) is int and 0 < age < 120', feedback: 'Inclusive means 0 and 120' },
            { code: 'def is_valid_age(age):\n    return isinstance(age, int) and 0 <= age <= 120', feedback: 'Use type(age) is int' },
          ],
        }),
        exercise(12, 2, 'Challenge 2 — Free shipping', 'medium', {
          prompt: 'Write free_shipping(total, is_member): shipping is free for any order of at least 50, and for members whose order is at least 20.',
          instructions: 'Write the rule as one boolean expression. Use parentheses to make the grouping of and/or obvious, and test the boundary values 20 and 50.',
          code: 'def free_shipping(total, is_member):\n    return total > 50 or is_member and total > 20',
          testCode: `cases = [(60, False, True), (50, False, True), (49.99, False, False), (20, True, True), (19.99, True, False), (30, False, False)]
for total, member, want in cases:
    got = free_shipping(total, member)
    assert got == want, f"free_shipping({total}, {member}) should be {want}, got {got}. 'At least' includes the boundary: use >=" if total in (20, 50) else f"free_shipping({total}, {member}) should be {want}, got {got}"
"SUCCESS: both rules work, including exactly 20 and exactly 50."`,
          hint: 'return total >= 50 or (is_member and total >= 20)',
          solution: 'def free_shipping(total, is_member):\n    return total >= 50 or (is_member and total >= 20)',
          misconceptions: [{ code: 'def free_shipping(total, is_member):\n    return total > 50 or (is_member and total > 20)', feedback: "'At least' includes the boundary" }],
        }),
        exercise(13, 3, 'Challenge 3 — Half-open bins', 'medium', {
          prompt: 'Scores are sorted into bins such as 10 up to but not including 20. Write in_bin(x, lo, hi) that includes lo and excludes hi. Then predict boundary_results: the values of in_bin(10, 10, 20), in_bin(20, 10, 20) and in_bin(19.99, 10, 20), in that order.',
          instructions: 'Half-open bins mean every value belongs to exactly one bin: 20 goes in the 20–30 bin, not the 10–20 bin. Write boundary_results as a list of three bools before you run anything.',
          code: 'def in_bin(x, lo, hi):\n    pass  # replace with your code\n\nboundary_results = None',
          testCode: `assert in_bin(15, 10, 20) is True, "15 is inside 10 to 20"
assert in_bin(10, 10, 20) is True, "The lower edge lo is included: use lo <= x"
assert in_bin(20, 10, 20) is False, "The upper edge hi is excluded: use x < hi, so 20 belongs to the next bin"
assert in_bin(25, 10, 20) is False, "25 is above the bin"
assert boundary_results == [True, False, True], "Check your predictions against the rule: lo included, hi excluded"
"SUCCESS: lo is in the bin, hi starts the next bin, so every value lands in exactly one bin."`,
          hint: 'return lo <= x < hi',
          solution: 'def in_bin(x, lo, hi):\n    return lo <= x < hi\n\nboundary_results = [True, False, True]',
          misconceptions: [
            { code: 'def in_bin(x, lo, hi):\n    return lo <= x <= hi\nboundary_results = [True, True, True]', feedback: 'The upper edge hi is excluded' },
            { code: 'def in_bin(x, lo, hi):\n    return lo < x < hi\nboundary_results = [False, False, True]', feedback: 'The lower edge lo is included' },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    '== asks a question and returns a bool; = assigns.',
    'Truth tables: and needs both, or needs at least one, not flips. Precedence: not, and, or.',
    'Always test the boundary values of a range: that is where < and <= disagree.',
    'Short-circuit: False and X, and True or X, never evaluate X — useful as a guard.',
    'and/or return one of their operands; 0, 0.0, "", [], {}, None and False count as false.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'True and False or True evaluates to what?',
      options: [
        'False — or runs first',
        'True — and binds more tightly: (True and False) is False, then False or True is True',
        'An error',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'What does x != 0 and 10 / x > 2 do when x = 0?',
      options: [
        'It raises ZeroDivisionError',
        'It returns False without dividing: x != 0 is False, so the right side is never evaluated',
        'It returns True',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'What is "" or "guest"?',
      options: ['True', '"guest" — empty text counts as false, so or returns its second operand', '""'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'not (a and b) is equivalent to which expression?',
      options: ['not a and not b', '(not a) or (not b) — De Morgan\'s law', 'a or b'],
      correct: 1,
    },
  ],
}
