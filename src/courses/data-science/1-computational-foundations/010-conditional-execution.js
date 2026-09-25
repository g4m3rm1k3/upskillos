import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-10', slug: 'conditional-execution', track: 'A', order: 10,
  title: 'Conditional Execution', subtitle: 'Branching Paths',
  tags: ['if', 'else', 'elif', 'branching', 'ternary'],
  prereqs: ['a-09'], unlocks: ['a-11', 'a-12'],
  hook: {
    question: 'How does a program take different actions based on different conditions?',
    realWorldContext: 'Every decision in software is an if statement: data pipelines branch on data quality, pricing rules branch on order size. A correct and an incorrect program often differ by a single condition — usually at a boundary, or in the order conditions are checked.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Trace which single branch of an if/elif/else runs for a given input. Choose conditions that handle boundary values correctly and put them in the right order. Test every branch of a decision.',
        '**The smallest example.**',
        '```python\ntemperature = 25\nif temperature > 20:\n    print("warm day")\nelse:\n    print("cold day")\nprint("done")\n```',
        '`if` evaluates its condition. If it is True, the indented block under it runs and the `else` block is skipped; if False, the `if` block is skipped and the `else` block runs. Either way, execution continues with the first unindented line after the whole statement. Exactly one of the two blocks runs.',
        '| Line | runs when temperature = 25? | runs when temperature = 15? |\n|---|---|---|\n| `if temperature > 20:` | yes (True) | yes (False) |\n| `print("warm day")` | **yes** | no |\n| `print("cold day")` | no | **yes** |\n| `print("done")` | yes | yes |',
        '**Indentation is syntax.** The indented lines *are* the block; Python has no other marker for where it ends. Use 4 spaces. A missing indent raises IndentationError before anything runs.',
      ),
      check(
        'With `temperature = 20`, what does the example print before "done"?',
        ['warm day', 'cold day', 'both'],
        1,
        '`20 > 20` is False, so the else block runs. If 20 degrees should count as warm, the condition must be `>= 20` — always check the boundary value.',
      ),
      notebook('if and else', [
        demo(1, 'Stage 1 — Exactly one branch runs', [
          'The same decision for three temperatures, including the boundary value 20. The last print runs every time, because it is outside the if statement.',
        ], 'Predict the three outputs, then run. Change > to >= and predict again.', 'def describe(temperature):\n    if temperature > 20:\n        print(temperature, "warm day")\n    else:\n        print(temperature, "cold day")\n    print("  done")\n\ndescribe(25)\ndescribe(20)\ndescribe(15)', { expectOutput: ['25 warm day', '20 cold day', '15 cold day'] }),
        demo(2, 'Stage 2 — Indentation is part of the syntax', [
          'The print below the `if` is not indented, so Python cannot tell what belongs to the block. Nothing runs at all — this is found while parsing.',
        ], 'Run and read the error. Fix it by indenting the print with 4 spaces.', 'temperature = 25\nif temperature > 20:\nprint("warm day")', { expectError: 'IndentationError' }),
      ]),
      prose(
        '**More than two paths: elif.** `elif` ("else if") adds another condition. Python tests the conditions from the top and runs the block of the **first** one that is True; every later branch is skipped, even if its condition is also True. `else` catches everything that matched nothing.',
        '```python\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelse:\n    grade = "F"\n```',
        '| score | `>= 90`? | `>= 80`? | `>= 70`? | grade |\n|---|---|---|---|---|\n| 95 | True | not checked | not checked | A |\n| 85 | False | True | not checked | B |\n| 80 | False | True (boundary) | not checked | B |\n| 55 | False | False | False | F |',
        'Because the first match wins, **order matters**. A chain that tests `score >= 70` first would give 95 a C: 95 >= 70 is True, so the later, more specific tests never run. Put the most restrictive condition first.',
      ),
      check(
        'A chain checks `score >= 70` first (grade C), then `score >= 80` (B), then `score >= 90` (A). What grade does 95 get?',
        ['A', 'C', 'A, B and C'],
        1,
        '95 >= 70 is True, so the first branch runs and the rest are skipped. Order the conditions from most to least restrictive.',
      ),
      notebook('elif chains', [
        demo(3, 'Stage 3 — First match wins', [
          'The grading chain from the table, wrapped in a function so it can be tried on several scores.',
        ], 'Predict the grade for each score, including the boundaries 90 and 80, then run.', 'def grade(score):\n    if score >= 90:\n        return "A"\n    elif score >= 80:\n        return "B"\n    elif score >= 70:\n        return "C"\n    else:\n        return "F"\n\nprint(grade(95), grade(90), grade(85), grade(80), grade(55))', { expectOutput: ['A A B B F'] }),
        demo(4, 'Stage 4 — The same chain in the wrong order', [
          'Same conditions, reversed. It runs without error but gives wrong answers, because the least restrictive test is reached first.',
        ], 'Run and find which scores get the wrong grade. Fix it by reordering the branches.', 'def grade_wrong_order(score):\n    if score >= 70:\n        return "C"\n    elif score >= 80:\n        return "B"\n    elif score >= 90:\n        return "A"\n    else:\n        return "F"\n\nprint(grade_wrong_order(95), grade_wrong_order(85), grade_wrong_order(55))', { expectOutput: ['C C F'] }),
      ]),
      prose(
        '**Separate ifs versus one chain.** Several separate `if` statements are all tested, so more than one block can run. An if/elif chain runs at most one. Use a chain when the cases are alternatives; use separate ifs when each check is independent (for example, several warnings that could all apply).',
        '**Testing every branch.** A decision with four branches needs at least four tests — one input per branch — plus the boundary values between branches, because that is where `<` versus `<=` mistakes hide. For the grade chain: 95, 85, 75 and 55 reach each branch, and 90, 80 and 70 test the boundaries.',
      ),
      notebook('Testing decisions', [
        demo(5, 'Stage 5 — Separate ifs can all run', [
          'The first version has two independent checks, so both messages can print. The chain prints at most one.',
        ], 'Predict the output for x = 15, then run. Then try x = 5.', 'x = 15\nif x > 0:\n    print("separate: positive")\nif x > 10:\n    print("separate: large")\n\nif x > 10:\n    print("chain: large")\nelif x > 0:\n    print("chain: positive")', { expectOutput: ['separate: positive\nseparate: large\nchain: large'] }),
        demo(6, 'Stage 6 — Tests for every branch and boundary', [
          'Each assert checks one input. Together they reach every branch of `grade` and every boundary between branches. The function is repeated here so this notebook works on its own.',
        ], 'Run: silence means all tests passed. Then change >= 80 to > 80 and run again: which test catches it?', 'def grade(score):\n    if score >= 90:\n        return "A"\n    elif score >= 80:\n        return "B"\n    elif score >= 70:\n        return "C"\n    else:\n        return "F"\n\nfor score, want in [(95, "A"), (85, "B"), (75, "C"), (55, "F"),\n                    (90, "A"), (80, "B"), (70, "C")]:\n    assert grade(score) == want, f"grade({score}) should be {want}, got {grade(score)}"\nprint("all 7 tests passed")', { expectOutput: ['all 7 tests passed'] }),
      ]),
      prose(
        '**A shorthand, once the long form is familiar.** When both branches only choose a value, Python has a one-line form: `label = "even" if n % 2 == 0 else "odd"`. It means exactly the same as a four-line if/else that assigns `label`. Keep it for simple two-way choices; use the full form for anything with more branches or more than one line of work.',
      ),
      notebook('The one-line form', [
        demo(7, 'Stage 7 — Conditional expression', [
          'Both forms produce the same value.',
        ], 'Run. Then rewrite the grade chain as one line and decide whether it is still readable.', 'n = 7\nif n % 2 == 0:\n    label = "even"\nelse:\n    label = "odd"\nprint(label)\n\nlabel = "even" if n % 2 == 0 else "odd"\nprint(label)', { expectOutput: ['odd\nodd'] }),
      ]),
      prose('**Practice.** Challenge 1 is a four-way classification with boundaries. Challenge 2 is a two-bracket calculation. Challenge 3 is fresh: write a decision and the tests that cover it.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — BMI classifier', 'easy', {
          prompt: 'Write classify_bmi(bmi) returning "Underweight" below 18.5, "Normal" from 18.5 up to but not including 25, "Overweight" from 25 up to but not including 30, and "Obese" from 30 up.',
          instructions: 'Use an if/elif/else chain that returns a string. Each boundary value (18.5, 25, 30) belongs to the higher category.',
          code: 'def classify_bmi(bmi):\n    pass  # replace with your code',
          testCode: `cases = [(17.5, "Underweight"), (22, "Normal"), (27, "Overweight"), (32, "Obese")]
boundaries = [(18.5, "Normal"), (25, "Overweight"), (30, "Obese")]
for bmi, want in cases:
    got = classify_bmi(bmi)
    assert got is not None, "classify_bmi returns None: return the label"
    assert got == want, f"classify_bmi({bmi}) should be {want!r}, got {got!r}"
for bmi, want in boundaries:
    got = classify_bmi(bmi)
    assert got == want, f"classify_bmi({bmi}) should be {want!r}, got {got!r}: each boundary belongs to the higher category, so use < for the upper limit"
"SUCCESS: every category and every boundary is correct."`,
          hint: 'if bmi < 18.5: return "Underweight"; elif bmi < 25: return "Normal"; elif bmi < 30: return "Overweight"; else: return "Obese"',
          solution: 'def classify_bmi(bmi):\n    if bmi < 18.5:\n        return "Underweight"\n    elif bmi < 25:\n        return "Normal"\n    elif bmi < 30:\n        return "Overweight"\n    else:\n        return "Obese"',
          misconceptions: [{ code: 'def classify_bmi(bmi):\n    if bmi < 18.5:\n        return "Underweight"\n    elif bmi <= 25:\n        return "Normal"\n    elif bmi <= 30:\n        return "Overweight"\n    return "Obese"', feedback: 'each boundary belongs to the higher category' }],
        }),
        exercise(12, 2, 'Challenge 2 — A two-bracket tax', 'medium', {
          prompt: 'In a simplified tax system, the first 10,000 of income is taxed at 10% and only the part above 10,000 is taxed at 20%. Write compute_tax(income) returning the tax owed.',
          instructions: '1. If income is at most 10,000, the tax is 10% of income.\n2. Otherwise it is 10% of 10,000 plus 20% of (income − 10,000).',
          code: 'def compute_tax(income):\n    pass  # replace with your code',
          testCode: `for income, want in [(0, 0), (5000, 500), (10000, 1000)]:
    assert abs(compute_tax(income) - want) < 1e-6, f"compute_tax({income}) should be {want}"
got = compute_tax(15000)
assert abs(got - 3000) > 1e-6, "Only the part above 10,000 is taxed at 20%, not the whole income"
assert abs(got - 2000) < 1e-6, f"compute_tax(15000) should be 1000 + 5000 * 0.2 = 2000, got {got}"
assert abs(compute_tax(20000) - 3000) < 1e-6, "compute_tax(20000) should be 3000"
"SUCCESS: both brackets and the 10,000 boundary are correct."`,
          hint: 'if income <= 10000: return income * 0.10\nelse: return 10000 * 0.10 + (income - 10000) * 0.20',
          solution: 'def compute_tax(income):\n    if income <= 10000:\n        return income * 0.10\n    else:\n        return 10000 * 0.10 + (income - 10000) * 0.20',
          misconceptions: [{ code: 'def compute_tax(income):\n    if income <= 10000:\n        return income * 0.10\n    return income * 0.20', feedback: 'Only the part above 10,000' }],
        }),
        exercise(13, 3, 'Challenge 3 — Write the decision and its tests', 'medium', {
          prompt: 'Write shipping_cost(weight): under 1 kg costs 5, from 1 kg up to but not including 5 kg costs 9, and 5 kg or more costs 15. Then list in test_weights the weights you would test: at least one per branch, plus both boundary values.',
          instructions: 'Decide your test weights BEFORE writing the function, from the rules alone. The checker tests your function and checks that your list really covers every branch and both boundaries.',
          code: 'def shipping_cost(weight):\n    pass  # replace with your code\n\ntest_weights = []',
          testCode: `for w, want in [(0.5, 5), (1, 9), (3, 9), (4.99, 9), (5, 15), (12, 15)]:
    got = shipping_cost(w)
    assert got == want, f"shipping_cost({w}) should be {want}, got {got}" + (": check the boundary — 1 kg and 5 kg belong to the heavier band" if w in (1, 5) else "")
assert any(w < 1 for w in test_weights), "test_weights needs a weight under 1 kg"
assert any(1 < w < 5 for w in test_weights), "test_weights needs a weight strictly between 1 and 5 kg"
assert any(w > 5 for w in test_weights), "test_weights needs a weight over 5 kg"
assert 1 in test_weights and 5 in test_weights, "test_weights should include both boundary values, 1 and 5"
"SUCCESS: the function is right and your tests reach every branch and both boundaries."`,
          hint: 'if weight < 1: return 5\nelif weight < 5: return 9\nelse: return 15',
          solution: 'def shipping_cost(weight):\n    if weight < 1:\n        return 5\n    elif weight < 5:\n        return 9\n    else:\n        return 15\n\ntest_weights = [0.5, 1, 3, 5, 12]',
          misconceptions: [
            { code: 'def shipping_cost(weight):\n    if weight <= 1:\n        return 5\n    elif weight <= 5:\n        return 9\n    return 15\ntest_weights = [0.5, 1, 3, 5, 12]', feedback: 'belong to the heavier band' },
            { code: 'def shipping_cost(weight):\n    if weight < 1:\n        return 5\n    elif weight < 5:\n        return 9\n    return 15\ntest_weights = [0.5, 3, 12]', feedback: 'both boundary values' },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'if/else: exactly one of the two blocks runs; code after the statement always runs.',
    'Indentation defines blocks — it is syntax, not style.',
    'if/elif/else runs only the FIRST branch whose condition is True, so order from most to least restrictive.',
    'Test one input per branch plus every boundary value between branches.',
    'The one-line form a if cond else b is for simple two-way value choices.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'x = 7. if x > 10: big / elif x > 5: medium / else: small. What prints?',
      options: ['big', 'medium — 7 > 10 is False, then 7 > 5 is True', 'medium and small'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'What changes if you replace every elif in a chain with a separate if?',
      options: [
        'Nothing',
        'Every condition is then tested independently, so several blocks can run for the same input',
        'Python raises a SyntaxError',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A rule says "orders of 100 or more get free delivery". Which test input is most likely to reveal a bug?',
      options: ['50', '100', '1000'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'd.get("x") returns None when the key "x" is missing. Does the block under if d.get("x"): run in that case?',
      options: ['Yes', 'No — None counts as false', 'It raises KeyError'],
      correct: 1,
    },
  ],
}
