import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-07', slug: 'function-composition', track: 'A', order: 7,
  title: 'Function Composition', subtitle: 'The Matryoshka Model',
  tags: ['composition', 'nesting', 'execution-order', 'substitution', 'none-propagation'],
  prereqs: ['a-06'], unlocks: ['a-08', 'a-09'],
  hook: {
    question: 'How do you chain computations without naming every intermediate result?',
    realWorldContext: 'In a factory, the output of one machine is the input of the next. In Python, feeding one call\'s return value into another is called composition. Reading nested calls correctly — from the inside out — is how you understand any complex expression.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Rewrite a nested call as a sequence of named steps and back again. Predict the value of a composition you have not seen before. Explain why a `print` inside another call breaks the chain.',
        '**The smallest example.** **Composition** means using one call\'s return value as another call\'s argument: `abs(round(-3.8))`. Python cannot call `abs` until it knows its argument, so the innermost call runs first and is replaced by its value:',
        '1. `abs(round(-3.8))`\n2. `abs(-4)` — `round(-3.8)` returned -4\n3. `4`',
        'The same computation with every intermediate value named:',
        '```python\nrounded = round(-3.8)   # -4\nresult = abs(rounded)   # 4\n```',
        'Both versions do the same work in the same order. The nested form is shorter; the named form lets you print or check each step. Moving between them is the main skill of this lesson.',
      ),
      check(
        'What is `len(str(12345))`?',
        ['12345', '5', '1'],
        1,
        'Inside first: `str(12345)` returns the text "12345"; `len` of that text is 5.',
      ),
      notebook('Inside out', [
        demo(1, 'Stage 1 — Nested and expanded give the same result', [
          'The first line is the nested version. The next two lines are the expanded version. The last line checks they agree.',
        ], 'Run it. Then change -3.8 to -3.2 in BOTH versions and predict the new result.', 'nested = abs(round(-3.8))\n\nrounded = round(-3.8)\nexpanded = abs(rounded)\n\nprint(rounded, expanded, nested == expanded)', { expectOutput: ['-4 4 True'] }),
        demo(2, 'Stage 2 — Three levels deep', [
          'Three calls chained. Reduce from the innermost outward: `round(-3.8)` → -4, `abs(-4)` → 4, `pow(4, 2)` → 16. `pow(a, b)` means a to the power b.',
        ], 'Write the three steps as named lines in the cell, below the nested line, and print each one.', 'final = pow(abs(round(-3.8)), 2)\nfinal', { expectOutput: ['16'] }),
      ]),
      prose(
        '**Calls with several arguments.** When a call has several arguments that are themselves calls, Python computes them left to right, then makes the outer call. In `max(len("A"), len("BBB"))`, both lengths (1 and 3) are computed before `max` sees them.',
        '**A pattern: clamping.** `max(0, min(score, 100))` keeps a score within 0 to 100. The inner `min` caps it from above; the outer `max` lifts it from below.',
        '| score | `min(score, 100)` | `max(0, …)` |\n|---|---|---|\n| -20 | -20 | 0 |\n| 50 | 50 | 50 |\n| 150 | 100 | 100 |',
      ),
      notebook('Several arguments', [
        demo(3, 'Stage 3 — Clamping', [
          'The same composed expression applied to three scores; compare with the table.',
        ], 'Run and check each line against the table. Then change the limits to keep scores between 10 and 90.', 'for score in [-20, 50, 150]:\n    print(score, max(0, min(score, 100)))', { expectOutput: ['-20 0', '50 50', '150 100'] }),
        demo(4, 'Stage 4 — Arguments that are calls', [
          'Each argument is reduced to a value before the outer call happens.',
        ], 'Predict, run, then add a third argument len("CC").', 'greatest = max(len("A"), len("BBB"))\ngreatest', { expectOutput: ['3'] }),
      ]),
      prose(
        '**A broken link in the chain: None.** If an inner call returns None, the outer call receives None. `print` is the usual culprit, because it shows its argument and returns None. In `print(print("hi"))`, the inner print shows hi and returns None; the outer print then shows None.',
        'With a function that needs a number, None causes a crash instead: `abs(print(-5))` shows -5, then fails with TypeError, because `abs` cannot take the absolute value of None.',
      ),
      check(
        'What happens when `abs(print(-5))` runs?',
        ['It returns 5', 'It shows -5, then raises TypeError', 'It raises an error before showing anything'],
        1,
        'The inner call runs first: print shows -5 and returns None. Then `abs(None)` raises TypeError.',
      ),
      notebook('None in a chain', [
        demo(5, 'Stage 5 — The double print', [
          'Two lines of output: the inner call\'s side effect (hi) and the outer call showing the inner return value (None).',
        ], 'Run and match each output line to the call that produced it.', 'print(print("hi"))', { expectOutput: ['hi\nNone'] }),
        demo(6, 'Stage 6 — None reaching abs', [
          'The inner print runs first and shows -5; `abs` then receives None.',
        ], 'Run and read the TypeError: it names the type that abs received. Fix it by removing the print, then print the result separately.', 'abs(print(-5))', { expectError: 'TypeError', expectOutput: ['-5'] }),
      ]),
      callout('tip', 'Debugging a long composition', 'When a nested expression gives a surprising result, expand it into named steps and print each one. The first step whose value surprises you is where the problem is. Once it works, you can nest it again — or keep the names if they make the code clearer.'),
      prose('**Practice.** Challenge 1 composes two built-ins. Challenge 2 expands a nested expression into named steps. Challenge 3 is a fresh prediction.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — The string cube', 'easy', {
          prompt: 'Use pow() and len() to store in cube the length of word raised to the power 3.',
          instructions: '1. `len(word)` gives the length.\n2. `pow(x, 3)` raises x to the power 3.\n3. Put one call inside the other.',
          code: 'word = "Python"\ncube = None',
          testCode: `assert cube is not None, "Replace None"
assert cube != 18, "len(word) * 3 multiplies by 3. A cube multiplies the length by itself three times: pow(len(word), 3)"
assert cube == 216, f"Expected 6 ** 3 = 216, got {cube}"
"SUCCESS: len returns 6, pow(6, 3) returns 216."`,
          hint: 'cube = pow(len(word), 3)',
          solution: 'word = "Python"\ncube = pow(len(word), 3)',
          misconceptions: [{ code: 'word = "Python"\ncube = len(word) * 3', feedback: 'multiplies the length by itself three times' }],
        }),
        exercise(12, 2, 'Challenge 2 — Expand a composition', 'medium', {
          prompt: 'Rewrite the nested expression as named steps: smallest (the minimum reading), size (its absolute value), per_item (size divided by the number of readings) and result (per_item rounded to 2 places).',
          prose: ['The nested version:', '```python\nround(abs(min(readings)) / len(readings), 2)\n```'],
          instructions: 'Start with the innermost call. Each step should use the name from the step before. The checker compares your result with the nested version.',
          code: 'readings = [-4.5, 2.0, -7.25, 3.5]\nsmallest = None\nsize = None\nper_item = None\nresult = None',
          testCode: `assert smallest == -7.25, f"smallest should be min(readings) = -7.25, got {smallest}"
assert size == 7.25, f"size should be abs(smallest) = 7.25, got {size}"
assert per_item == 1.8125, f"per_item should be size / len(readings) = 1.8125, got {per_item}"
assert result == round(abs(min(readings)) / len(readings), 2), f"result should match the nested version, 1.81. Got {result}"
"SUCCESS: four named steps reproduce the nested expression."`,
          hint: 'smallest = min(readings); size = abs(smallest); per_item = size / len(readings); result = round(per_item, 2)',
          solution: 'readings = [-4.5, 2.0, -7.25, 3.5]\nsmallest = min(readings)\nsize = abs(smallest)\nper_item = size / len(readings)\nresult = round(per_item, 2)',
          misconceptions: [{ code: 'readings = [-4.5, 2.0, -7.25, 3.5]\nsmallest = min(readings)\nsize = abs(readings)', feedback: "bad operand type for abs()" }],
        }),
        exercise(13, 3, 'Challenge 3 — Predict new compositions', 'hard', {
          prompt: 'Reduce each expression from the inside out on paper, then store your predictions in p1 and p2.',
          prose: ['```python\nmax(len("data"), round(7.5), abs(-6))\nlen(str(round(3.14159, 2)))\n```'],
          instructions: 'Remember from Lesson A.06 how round() treats exact halves.',
          code: 'p1 = None\np2 = None',
          testCode: `assert p1 is not None and p2 is not None, "Fill in both predictions"
assert p1 != 7, "round(7.5) is 8, not 7: exact halves round to the even neighbour, so the arguments are 4, 8 and 6"
assert p1 == 8, f"p1 should be max(4, 8, 6) = 8, got {p1}"
assert p2 != 7, "round runs first: round(3.14159, 2) is 3.14, so str gives '3.14', which has 4 characters"
assert p2 == 4, f"p2 should be len('3.14') = 4, got {p2}"
"SUCCESS: max(4, 8, 6) = 8 and len('3.14') = 4."`,
          hint: 'p1: the three arguments are len("data"), round(7.5) and abs(-6). p2: innermost first — round, then str, then len.',
          solution: 'p1 = 8\np2 = 4',
          misconceptions: [
            { code: 'p1, p2 = 7, 4', feedback: 'exact halves round to the even neighbour' },
            { code: 'p1, p2 = 8, 7', feedback: 'round runs first' },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Composition: an inner call\'s return value becomes the outer call\'s argument.',
    'Evaluate from the inside out; with several arguments, left to right, then the outer call.',
    'Any nested expression can be expanded into named steps — and recombined.',
    'A None-returning call (like print) breaks the chain: the outer call receives None.',
    'Debug a long composition by expanding it and checking each named step.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'What does len(str(12345)) evaluate to?',
      options: ['12345', '5 — str gives the text "12345", which has 5 characters', '1'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'In f(g(x)), which function runs first?',
      options: ['f', 'g — the argument g(x) must be computed before f can be called', 'They run at the same time'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'result = sorted(set([3, 1, 4, 1, 5])). What is result?',
      options: ['[3, 1, 4, 1, 5]', '[1, 3, 4, 5] — set removes the repeated 1, then sorted orders the values', '[1, 1, 3, 4, 5]'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'print(sorted(numbers)) displays a sorted list. Why can you not use that sorted list on the next line?',
      options: [
        'print consumes the value',
        'The sorted list was passed straight to print and never bound to a name; print returns None. Store it first: result = sorted(numbers)',
        'sorted only works inside print',
      ],
      correct: 1,
    },
  ],
}
