import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-04', slug: 'variables-as-bindings', track: 'A', order: 4,
  title: 'Variables as Bindings', subtitle: 'Names, Values, and Memory',
  tags: ['variables', 'assignment', 'binding', 'naming', 'memory'],
  prereqs: ['a-02', 'a-03'], unlocks: ['a-05', 'a-06'],
  hook: {
    question: 'What does x = 5 actually do?',
    realWorldContext: 'Assignment is not mathematical equality. x = x + 1 is not a contradiction — it is an instruction. Reading it as an equation is one of the most common sources of beginner bugs, because the code looks correct.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Draw what an assignment does as a name pointing to a value. Trace a sequence of assignments, including `x = x + 1`, and say exactly what changed. Recognise when two names refer to the *same* value, and why that only matters for values that can be changed in place.',
        '**The smallest example.** `x = 5` is an instruction with two steps: evaluate the right-hand side (5), then **bind** the name `x` to that value. Afterwards, using `x` anywhere means "the value `x` is bound to". A **variable** is a name bound to a value.',
        'Picture the names in one column and the values in another, with an arrow from each name to its value:',
        '| Name | → | Value |\n|---|---|---|\n| `x` | → | `5` |',
      ),
      prose(
        '**Assignment is not equality.** In algebra, x = x + 1 has no solution. In Python it is an instruction, carried out right side first:',
        '1. Look up the value `x` points to: 5.\n2. Compute `5 + 1`, which is a *new* value, 6.\n3. Point the name `x` at 6. Nothing points at 5 any more; Python will reclaim it.',
        '| Name | → | Value |\n|---|---|---|\n| `x` | → | `6` |',
        'The value 5 was not "changed into" 6. The name was moved to a different value. That is called **rebinding**.',
      ),
      check(
        '`count = 0`, then `count = count + 1`, then `count = count * 2`. Where does `count` point at the end?',
        ['0', '1', '2', '4'],
        2,
        'Each line reads the current value, computes a new one and rebinds: 0 → 1 → 2.',
      ),
      notebook('Binding and rebinding', [
        demo(1, 'Stage 1 — Basic binding', [
          'Each assignment creates a binding. The last line is just a name, so its value — the value it is bound to — is shown.',
        ], 'Predict the output, then run. Then add the line z = 100 above the print: which printed values change?', 'x = 5\ny = 10\nz = x + y\nprint(x, y, z)\nz', { expectOutput: ['5 10 15'] }),
        demo(2, 'Stage 2 — Right side first', [
          'Python evaluates the whole right-hand side before it rebinds the name. That is why `x = x + 1` works: the old value is read before the name moves.',
        ], 'Write down the value of count after every line, then run to check.', 'count = 0\ncount = count + 1\nprint(count)\ncount = count + 1\ncount = count * 2\nprint(count)', { expectOutput: ['1', '4'] }),
        demo(3, 'Stage 3 — Augmented assignment', [
          '`x += 10` is shorthand for `x = x + 10`; `-=`, `*=` and `//=` work the same way. They are abbreviations, not new operations.',
        ], 'Predict all four printed values before running.', 'score = 100\nscore += 10\nprint(score)\nscore -= 5\nprint(score)\nscore *= 2\nprint(score)\nscore //= 3\nprint(score)', { expectOutput: ['110', '105', '210', '70'] }),
      ]),
      prose(
        '**Two names, one value.** `b = a` does not link `b` to the *name* `a`. It evaluates `a` — getting the value `a` points to — and points `b` at that same value. After that the names are independent: rebinding `a` moves only `a`\'s arrow.',
        '| Step | a → | b → |\n|---|---|---|\n| `a = 3` | 3 | — |\n| `b = a` | 3 | 3 (the same value) |\n| `a = 10` | 10 | 3 |',
        '**Multiple assignment.** `a, b = 3, 7` binds two names at once. Because the whole right side is evaluated first, `a, b = b, a` swaps two values without a temporary name.',
      ),
      check(
        '`a = 3`, then `b = a`, then `a = 10`. What is `b`?',
        ['10, because b is linked to a', '3, because b = a pointed b at the value 3, and rebinding a later does not move b'],
        1,
        'Assignment binds a name to a value, never to another name. Moving `a`\'s arrow leaves `b`\'s arrow where it was.',
      ),
      notebook('Names that share a value', [
        demo(4, 'Stage 4 — Rebinding one name', [
          'After `b = a`, both names point at the same value. Rebinding `a` does not affect `b`.',
        ], 'Predict both prints, then run.', 'a = 3\nb = a\nprint(a, b)\na = 10\nprint(a, b)', { expectOutput: ['3 3', '10 3'] }),
        demo(5, 'Stage 5 — Multiple assignment and swapping', [
          'The right side `b, a` is evaluated completely (to 7, 3) before either name is rebound.',
        ], 'Run. Then try the swap with two separate lines, a = b followed by b = a, and explain why it fails.', 'a, b = 3, 7\nprint(a, b)\na, b = b, a\nprint(a, b)', { expectOutput: ['3 7', '7 3'] }),
      ]),
      callout('warning', 'A preview: values that can change in place', 'Numbers and text can never be changed in place — every "change" makes a new value and rebinds a name. Lists (Lesson A.13) are different: `b.append(4)` changes the list itself. If `a` and `b` point at the same list, both see the change, because there is only one list. This is called **aliasing**. The cell below previews it; you do not need lists yet to follow it.'),
      notebook('Preview: aliasing', [
        demo(6, 'Stage 6 — Rebinding versus changing in place', [
          'First part: `b = b + [4]` builds a new list and rebinds `b`, so `a` is unaffected. Second part: `d.append(4)` changes the one list that both `c` and `d` point to, so `c` sees it too. `is` asks "do these two names point at the very same value?"',
        ], 'Predict each print, then run. Then replace d.append(4) with d = d + [4] and predict again.', 'a = [1, 2, 3]\nb = a\nb = b + [4]          # new list; rebinds b only\nprint(a, b, a is b)\n\nc = [1, 2, 3]\nd = c\nd.append(4)          # changes the shared list\nprint(c, d, c is d)', { expectOutput: ['[1, 2, 3] [1, 2, 3, 4] False', '[1, 2, 3, 4] [1, 2, 3, 4] True'] }),
      ]),
      prose(
        '**Choosing names.** Names are case-sensitive (`total` and `Total` are different names). Python convention is lowercase words joined by underscores: `hours_worked`, `hourly_rate`. A name should say what the value *is*, so a reader never has to work backwards from the calculation. `weekly_pay = hours_worked * hourly_rate` explains itself; `z = x * y` does not.',
        '**Practice.** Challenge 1 is a trace. Challenge 2 builds a result by repeated rebinding. Challenge 3 is a fresh repair problem about the order of assignments.',
      ),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Trace the bindings', 'easy', {
          prompt: 'Without running the lines shown, write the value result points to after each of the four lines, in order, as a list called trace.',
          prose: ['```python\nresult = 10\nresult = result * 3\nresult = result - 5\nresult += 10\nresult //= 2\n```', 'The first value, 10, is given. List the values after lines 2, 3, 4 and 5.'],
          instructions: 'Trace on paper: read the current value, compute, rebind. Then run the challenge to check.',
          code: 'trace = None  # four values, for example [1, 2, 3, 4]',
          testCode: `assert isinstance(trace, list) and len(trace) == 4, "trace should be a list of four values"
assert trace[0] == 30, "Line 2 multiplies the current value 10 by 3"
assert trace[1] == 25, "Line 3 subtracts 5 from the value after line 2"
assert trace[2] == 35, "result += 10 means result = result + 10"
assert trace[3] != 17.5, "//= is floor division: 35 // 2 is 17, not 17.5"
assert trace[3] == 17, "Line 5 rebinds result to 35 // 2"
"SUCCESS: 10 → 30 → 25 → 35 → 17."`,
          hint: 'Each line uses the value from the line before it.',
          solution: 'trace = [30, 25, 35, 17]',
          misconceptions: [{ code: 'trace = [30, 25, 35, 17.5]', feedback: 'floor division' }],
        }),
        exercise(12, 2, 'Challenge 2 — Compound interest by rebinding', 'medium', {
          prompt: 'Start with principal = 1000. Apply 5% interest for three years by multiplying by 1.05 once per year, rebinding principal each time. Store the result rounded to 2 decimal places in final_amount.',
          instructions: '1. Use `principal *= 1.05` once per year (three lines).\n2. Round with `round(principal, 2)`.\n3. Do not use `**` or a loop.',
          code: 'principal = 1000\n# Apply interest once per year\n\nfinal_amount = round(principal, 2)',
          testCode: `assert final_amount != 1000, "principal was never rebound: multiply it by 1.05 once per year"
assert abs(final_amount - 1150.0) > 0.001, "Adding 5% of the ORIGINAL amount each year (simple interest) gives 1150. Compound interest multiplies the CURRENT amount"
assert abs(final_amount - 1157.625) < 0.006, f"Expected about 1157.62, got {final_amount}"
"SUCCESS: 1000 → 1050 → 1102.5 → 1157.62. (The exact value is 1157.625, but floats store it as 1157.6249999…, so round() gives .62.)"`,
          hint: 'principal *= 1.05 (three times), then final_amount = round(principal, 2)',
          solution: 'principal = 1000\nprincipal *= 1.05\nprincipal *= 1.05\nprincipal *= 1.05\nfinal_amount = round(principal, 2)',
          misconceptions: [{ code: 'principal = 1000\nfinal_amount = round(principal + 3 * 0.05 * 1000, 2)', feedback: 'simple interest' }],
        }),
        exercise(13, 3, 'Challenge 3 — Keep the old value', 'medium', {
          prompt: 'A thermostat reading goes up by 4 degrees. Record the reading before the update in previous, update temperature, and store the size of the change in change. The starter code gets the order wrong.',
          instructions: 'Run the starter and look at change. Trace the bindings to find where the old value was lost, then reorder the lines.',
          code: 'temperature = 18\ntemperature = temperature + 4\nprevious = temperature\nchange = temperature - previous\nprint(previous, temperature, change)',
          testCode: `assert temperature == 22, "temperature should be 18 + 4 = 22"
assert previous != 22, "previous was bound AFTER temperature was updated, so it points at the new value. Bind previous first"
assert previous == 18, f"previous should be 18, got {previous}"
assert change == 4, f"change should be 4, got {change}"
"SUCCESS: saving the old value before rebinding keeps it available."`,
          hint: 'Move previous = temperature above the update.',
          solution: 'temperature = 18\nprevious = temperature\ntemperature = temperature + 4\nchange = temperature - previous\nprint(previous, temperature, change)',
          misconceptions: [{ code: 'temperature = 18\ntemperature = temperature + 4\nprevious = temperature\nchange = 4', feedback: 'Bind previous first' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Assignment evaluates the right side completely, then points the name on the left at the result.',
    'x = x + 1 reads the old value, makes a new value and rebinds x — the old value is not changed.',
    'b = a points b at a\'s current value; rebinding a later never moves b.',
    'Values that can change in place (lists) can be shared by two names — changes through one are seen through the other.',
    'Name variables by what they represent: hours_worked, not x.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'x = 5 then x = x + 1. What is x after these two statements?',
      options: [
        'Still 5 — you cannot add 1 to x using x itself',
        '6 — the right side is evaluated with the current value 5, giving 6, and x is rebound to it',
        'An error — x appears on both sides',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'a = 3; b = a; a = 10. What is b?',
      options: [
        '10 — b is linked to a',
        '3 — b = a pointed b at the value 3; rebinding a does not move b',
        'None — b becomes undefined when a changes',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'c = [1, 2]; d = c; d.append(3). What is c?',
      options: [
        '[1, 2] — c and d are separate variables',
        '[1, 2, 3] — c and d point at the same list, and append changes that list in place',
        'An error — two names cannot share a list',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Why is total_revenue a better variable name than tr?',
      options: [
        'Python runs faster with longer names',
        'total_revenue says what the value represents, so readers do not have to guess',
        'Short names cause NameErrors inside functions',
      ],
      correct: 1,
    },
  ],
}
