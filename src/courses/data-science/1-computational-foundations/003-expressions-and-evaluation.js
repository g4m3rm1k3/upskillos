import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-03', slug: 'expressions-and-evaluation', track: 'A', order: 3,
  title: 'Expressions and Evaluation Order', subtitle: 'The Grammar of Computation',
  tags: ['expressions', 'operators', 'precedence', 'division'],
  prereqs: ['a-01', 'a-02'], unlocks: ['a-04', 'a-08'],
  hook: {
    question: 'What does 2 + 3 * 4 equal — and why?',
    realWorldContext: 'Operator precedence is the grammar rule that makes an expression mean one thing. A formula in a data pipeline that computes the wrong thing because of a missing parenthesis produces no error message — just a wrong number.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Evaluate an expression by hand one operation at a time, in exactly the order Python does. Predict expressions that trip people up: repeated powers, a minus sign in front of a power, and division with negative numbers.',
        '**The smallest example.** An **expression** is a combination of values and operators that Python reduces to a single value. Python does not read `2 + 3 * 4` left to right. It first finds the operator that binds most tightly (`*`), replaces that part with its value, and repeats:',
        '1. `2 + 3 * 4` — multiplication binds more tightly than addition\n2. `2 + 12` — one operator left\n3. `14`',
        'How tightly an operator binds is its **precedence**. Parentheses override it: `(2 + 3) * 4` reduces to `5 * 4`, then `20`.',
        '| Precedence (tightest first) | Operators |\n|---|---|\n| 1 | `( )` parentheses |\n| 2 | `**` power |\n| 3 | `-x` a minus sign in front of one value |\n| 4 | `*` `/` `//` `%` |\n| 5 | `+` `-` between two values |\n| 6 | comparisons such as `<` and `==` |',
      ),
      check(
        'Reduce `10 - 2 * 3` one step at a time. What is the value?',
        ['24', '4', '-2'],
        1,
        '`*` binds tighter: `10 - 2 * 3` → `10 - 6` → `4`. Reading left to right would give (10 − 2) × 3 = 24.',
      ),
      notebook('Precedence', [
        demo(1, 'Stage 1 — Precedence in action', [
          'Each pair shows the same numbers with and without parentheses.',
        ], 'Predict each line using the precedence table, then run. Then add parentheses to the first line so it prints 20.', 'print(2 + 3 * 4)       # 14\nprint((2 + 3) * 4)     # 20\nprint(10 - 2 * 3)      # 4\nprint((10 - 2) * 3)    # 24', { expectOutput: ['14', '20', '4', '24'] }),
        demo(2, 'Stage 2 — Reduce step by step', [
          'A longer expression reduced one operation at a time. Each named step is one reduction; the final comparison checks the steps match the one-line version.',
        ], 'Before running, write the four intermediate values on paper. Then run and compare.', 'result = (3 + 4) ** 2 - 10 // 3\nprint(result)\n\nstep1 = 3 + 4          # parentheses first\nstep2 = step1 ** 2     # then the power\nstep3 = 10 // 3        # then floor division\nstep4 = step2 - step3  # subtraction last\nprint(step1, step2, step3, step4)\nprint(step4 == result)', { expectOutput: ['46', '7 49 3 46', 'True'] }),
      ]),
      prose(
        '**When operators tie.** Precedence does not say what to do with two operators at the same level, as in `20 - 4 - 3`. That is decided by **associativity**: how equal operators group. Most arithmetic operators group from the left, so `20 - 4 - 3` means `(20 - 4) - 3`, which is 13. Power is the exception: `**` groups from the right, so `2 ** 3 ** 2` means `2 ** (3 ** 2)`, which is `2 ** 9` = 512, not `8 ** 2` = 64.',
        '**A minus sign and a power.** In `-2 ** 2` the power binds more tightly than the minus sign on its left, so it means `-(2 ** 2)`, which is -4. To square negative two, write `(-2) ** 2`. A minus sign on the *right* of `**` belongs to the exponent: `2 ** -1` is 0.5.',
        '**Evaluation order is a third rule.** Precedence and associativity decide how an expression is *grouped*. Python still *computes the operands* from left to right. In `f() + g() * h()`, `f()` is called first even though the multiplication is applied before the addition. This only matters when computing an operand has a visible effect, such as printing.',
      ),
      check(
        'What is `2 ** 3 ** 2`?',
        ['64', '512', '36'],
        1,
        '`**` groups from the right: `3 ** 2` = 9 first, then `2 ** 9` = 512.',
      ),
      notebook('Associativity and evaluation order', [
        demo(3, 'Stage 3 — Grouping equal operators', [
          '`/` and `-` group from the left. `**` groups from the right. The explicitly parenthesized lines show the grouping Python chose.',
        ], 'Predict each line before running. Then work out -2 ** 2 and (-2) ** 2 on paper and add both to the cell to check.', 'print(20 / 4 / 5, (20 / 4) / 5)       # 1.0 1.0\nprint(20 - 4 - 3, (20 - 4) - 3)       # 13 13\nprint(2 ** 3 ** 2, 2 ** (3 ** 2))     # 512 512\nprint((2 ** 3) ** 2)                  # 64: parentheses force the other grouping', { expectOutput: ['1.0 1.0', '13 13', '512 512', '64'] }),
        demo(4, 'Stage 4 — Operands are computed left to right', [
          'The `show` helper prints each number as Python computes it, then returns it unchanged. Precedence applies `*` before `+`, but the operands are still computed in the order 1, 2, 3.',
        ], 'Predict the order of the "computing" lines, then run.', 'def show(v):\n    print("computing", v)\n    return v\n\nprint(show(1) + show(2) * show(3))   # 7', { expectOutput: ['computing 1\ncomputing 2\ncomputing 3', '7'] }),
      ]),
      prose(
        '**Three kinds of division.** `/` is true division and always gives a float. `//` is **floor division**: it divides and then rounds *down*, toward negative infinity. `%` (**modulo**) gives the remainder that goes with `//`. The two always fit together: `a == (a // b) * b + a % b`.',
        '| Expression | Value | How |\n|---|---|---|\n| `7 / 2` | `3.5` | true division |\n| `7 // 2` | `3` | 3.5 rounded down |\n| `7 % 2` | `1` | 7 = 3 × 2 + **1** |\n| `-7 // 2` | `-4` | −3.5 rounded *down* is −4, not −3 |\n| `-7 % 2` | `1` | −7 = −4 × 2 + **1** |\n| `int(-7 / 2)` | `-3` | `int()` drops decimals toward zero — a different rule |',
        'Modulo is used constantly: `n % 2 == 0` tests for an even number, `n % 10` gives the last digit, and `minutes % 60` gives the minutes past the hour.',
      ),
      check(
        'What is `-7 // 2`?',
        ['-3', '-4', '-3.5'],
        1,
        '`//` rounds down. −3.5 rounded down is −4. Truncating toward zero (which gives −3) is what `int()` does, not `//`.',
      ),
      notebook('Division', [
        demo(5, 'Stage 5 — The division family', [
          'The last line checks the rule that ties `//` and `%` together, for a positive and a negative number.',
        ], 'Predict each line using the table. Then try a = -23, b = 5: predict a // b and a % b before running.', 'print(7 / 2, 7 // 2, 7 % 2)\nprint(-7 / 2, -7 // 2, -7 % 2)\nprint(int(-7 / 2))\nfor a, b in [(7, 2), (-7, 2)]:\n    print(a == (a // b) * b + a % b)', { expectOutput: ['3.5 3 1', '-3.5 -4 1', '-3', 'True\nTrue'] }),
        demo(6, 'Stage 6 — Modulo in practice', [
          'Common modulo patterns: odd or even, the last digit, and wrapping around a clock.',
        ], 'Run. Then use % to find what time it is 30 hours after 9 o\'clock on a 24-hour clock.', 'print(7 % 2, 8 % 2)      # 1 means odd, 0 means even\nprint(847 % 10)          # last digit\nprint((22 + 5) % 24)     # 5 hours after 22:00 is 3:00', { expectOutput: ['1 0', '7', '3'] }),
      ]),
      callout('tip', 'Parentheses are for readers too', 'When an expression mixes more than two kinds of operator, add parentheses even where Python does not need them. `(weight / height) ** 2` and `weight / (height ** 2)` are different formulas; a reader should not have to recall the precedence table to know which one you meant.'),
      prose(
        '**Practice.** Challenges 1 and 2 turn formulas into correct expressions. Challenge 3 is a fresh prediction problem — reduce each expression by hand before you check.',
      ),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Evaluate the formula', 'medium', {
          prompt: 'Body-mass index is weight in kilograms divided by the square of height in metres. Compute bmi for weight = 70 and height = 1.75, and store in is_healthy whether 18.5 <= bmi < 25.0.',
          instructions: '1. Build the formula from the variables weight and height; do not type the answer.\n2. Use `**` for the square.\n3. Store the comparison result (True or False) in is_healthy.',
          code: 'weight = 70\nheight = 1.75\nbmi = None\nis_healthy = None',
          testCode: `assert bmi is not None, "Replace None with the formula"
if abs(bmi - 70 / 1.75 * 2) < 1e-9 or abs(bmi - 70 / (1.75 * 2)) < 1e-9:
    raise AssertionError("height * 2 doubles the height; squaring needs height ** 2")
assert abs(bmi - 70 / 1.75 ** 2) < 1e-9, f"bmi should be about 22.86, got {bmi}"
assert is_healthy is True, "is_healthy should be the result of the comparison 18.5 <= bmi < 25.0"
"SUCCESS: bmi is about 22.86, so is_healthy is True."`,
          hint: 'bmi = weight / height ** 2 works because ** binds before /. Writing weight / (height ** 2) makes that explicit.',
          solution: 'weight = 70\nheight = 1.75\nbmi = weight / height ** 2\nis_healthy = 18.5 <= bmi < 25.0',
          misconceptions: [{ code: 'weight = 70\nheight = 1.75\nbmi = weight / height * 2\nis_healthy = False', feedback: 'squaring needs height ** 2' }],
        }),
        exercise(12, 2, 'Challenge 2 — Digits with // and %', 'medium', {
          prompt: 'Using only % and // (no text conversion), extract the hundreds, tens and units digits of n = 847.',
          instructions: '1. units: the remainder after dividing by 10.\n2. tens: first remove the units with // 10, then take the last digit.\n3. hundreds: remove two digits, then take the last digit.',
          code: 'n = 847\nhundreds = None\ntens = None\nunits = None',
          testCode: `assert units == 7, f"units should be 7 (847 % 10), got {units}"
assert tens != 84, "847 // 10 is 84 — that removes the units but keeps the hundreds. Take its last digit with % 10"
assert tens == 4, f"tens should be 4, got {tens}"
assert hundreds == 8, f"hundreds should be 8, got {hundreds}"
"SUCCESS: floor division removes digits from the right; modulo keeps the last one."`,
          hint: 'units = n % 10; tens = (n // 10) % 10; hundreds = (n // 100) % 10',
          solution: 'n = 847\nhundreds = (n // 100) % 10\ntens = (n // 10) % 10\nunits = n % 10',
          misconceptions: [{ code: 'n = 847\nunits = n % 10\ntens = n // 10\nhundreds = n // 100', feedback: 'Take its last digit with % 10' }],
        }),
        exercise(13, 3, 'Challenge 3 — Predict without guessing', 'hard', {
          prompt: 'Reduce each expression by hand, one operation at a time, and store your predicted values in p1, p2 and p3. Do not paste the expressions into Python until after you have checked.',
          prose: [
            'The expressions:',
            '```python\n-3 ** 2\n100 - 2 ** 3 ** 2 // 10\n-7 // 2 + 7 % 3\n```',
          ],
          instructions: 'Write each reduction on paper first, like `2 + 3 * 4` → `2 + 12` → `14`. The feedback tells you which rule to revisit if a prediction is wrong.',
          code: 'p1 = None\np2 = None\np3 = None',
          testCode: `assert p1 is not None and p2 is not None and p3 is not None, "Fill in all three predictions"
assert p1 != 9, "p1: ** binds more tightly than the minus sign in front, so -3 ** 2 means -(3 ** 2)"
assert p1 == -9, f"p1 should be -9, got {p1}"
assert p2 != 94, "p2: ** groups from the right, so 2 ** 3 ** 2 is 2 ** 9 = 512, not 64"
assert p2 == 49, f"p2 should be 49: 2 ** 9 = 512, 512 // 10 = 51, 100 - 51 = 49. Got {p2}"
assert p3 != -2, "p3: // rounds toward negative infinity, so -7 // 2 is -4, not -3"
assert p3 == -3, f"p3 should be -3: -7 // 2 = -4 and 7 % 3 = 1. Got {p3}"
"SUCCESS: all three predictions follow precedence, right-to-left **, and floor division."`,
          hint: 'Order of work: parentheses, then **, then the minus sign in front of a value, then * / // %, then + and -.',
          solution: 'p1 = -9\np2 = 49\np3 = -3',
          misconceptions: [
            { code: 'p1, p2, p3 = 9, 49, -3', feedback: 'binds more tightly than the minus sign' },
            { code: 'p1, p2, p3 = -9, 94, -3', feedback: 'groups from the right' },
            { code: 'p1, p2, p3 = -9, 49, -2', feedback: 'rounds toward negative infinity' },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Reduce an expression one operation at a time: the tightest-binding operator goes first.',
    'Precedence: ( ), **, unary minus, * / // %, + -, comparisons.',
    'Equal operators group from the left, except ** which groups from the right: 2 ** 3 ** 2 == 512.',
    'Operands are still computed left to right, whatever the grouping.',
    '/ gives a float; // rounds toward negative infinity; % is the matching remainder.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'What does 2 + 3 * 4 evaluate to in Python?',
      options: [
        '20 — Python evaluates left to right: 2 + 3 = 5, then 5 * 4 = 20',
        '14 — multiplication has higher precedence, so 3 * 4 = 12 first, then 2 + 12 = 14',
        '24 — the expression is fully combined before applying operators',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'What does 17 % 5 evaluate to?',
      options: [
        '3 — the number of times 5 fits into 17',
        '2 — 17 = 5 × 3 + 2, so the remainder is 2',
        '3.4 — 17 divided by 5',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'How do you check whether a number n is even?',
      options: [
        'n / 2 == 0',
        'n % 2 == 0 — an even number leaves remainder 0 when divided by 2',
        'n // 2 == 0',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'What is -2 ** 2 in Python?',
      options: ['4', '-4, because ** binds more tightly than the minus sign in front', 'An error'],
      correct: 1,
    },
    {
      id: 'q5', type: 'choice',
      text: 'What is -9 // 4?',
      options: ['-2', '-3, because // rounds −2.25 down toward negative infinity', '-2.25'],
      correct: 1,
    },
  ],
}
