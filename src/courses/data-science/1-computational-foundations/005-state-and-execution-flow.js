import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-05', slug: 'state-and-execution-flow', track: 'A', order: 5,
  title: 'State and Execution Flow', subtitle: 'Tracing Memory Over Time',
  tags: ['state', 'execution', 'tracing', 'debugging', 'nameerror'],
  prereqs: ['a-04'], unlocks: ['a-06', 'a-10'],
  hook: {
    question: 'What is "state" and why does it change?',
    realWorldContext: 'A data pipeline that produces wrong results but no errors is usually a state problem — a value was overwritten at the wrong moment, or read before it was written, or a notebook cell ran in a different order than the page suggests. Tracing state is how you find these.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Write a state table for a short program. Predict the result when notebook cells run out of order, and recover with Reset variables and Run all. Diagnose a NameError by its cause — order, spelling or scope — instead of guessing.',
        '**The smallest example.** **State** is everything a program remembers at a moment in its execution. For the code in this course, a useful simplified model is a table of bindings: every name and the value it currently points to. (Real state also includes things like open files and data shared between names, but the table is enough to debug most beginner programs.)',
        'Trace these four lines. Each row is the state *after* that line runs.',
        '| Line | x | y | z |\n|---|---|---|---|\n| `x = 5` | 5 | — | — |\n| `y = x + 3` | 5 | 8 | — |\n| `x = y * 2` | 16 | 8 | — |\n| `z = x - y` | 16 | 8 | 8 |',
        'A dash means "not bound yet". Reading a name while it is still a dash raises a **NameError**.',
      ),
      check(
        'After the four lines above, the program runs `y = z + x`. What is `y` now?',
        ['8', '16', '24', '13'],
        2,
        'Look up the current row: z = 8 and x = 16, so y is rebound to 24. The old value of y (8) is gone.',
      ),
      notebook('Tracing state', [
        demo(1, 'Stage 1 — Build the table line by line', [
          'The comments give the state for the first three lines. Fill in the last two rows yourself before running.',
        ], 'Write the state after lines 4 and 5 as comments, then run. The print shows the final row.', 'a = 10           # a=10\nb = 20           # a=10, b=20\nc = a + b        # a=10, b=20, c=30\na = c - a        # state: ?\nb = a * 2        # state: ?\nprint(a, b, c)', { expectOutput: ['20 40 30'] }),
        demo(2, 'Stage 2 — A longer trace', [
          'This is the table from above with two more lines. Do not run it until you have predicted every value.',
        ], 'Write a full state table on paper, then run and compare. If a value differs, find the first row where your table went wrong.', 'x = 5\ny = x + 3\nx = y * 2\nz = x - y\ny = z + x\nw = y // z\nprint(x, y, z, w)', { expectOutput: ['16 24 8 3'] }),
      ]),
      prose(
        '**Overwriting a value you still need.** Rebinding a name discards its old value — there is no undo. That becomes a bug when a later line still needs the old value. The program runs without any error; the table simply shows the wrong value at the moment it is read.',
        '| Line | original | result | final |\n|---|---|---|---|\n| `original = 100` | 100 | — | — |\n| `result = original * 2` | 100 | 200 | — |\n| `original = result + 50` | **250** | 200 | — |\n| `final = original + result` | 250 | 200 | **450** (intended 300) |',
        'The fix is to keep the old value under its own name before overwriting, or to give the new value a new name.',
      ),
      notebook('Overwriting', [
        demo(3, 'Stage 3 — An overwriting bug', [
          'This cell runs without error but prints the wrong answer. The table above shows why: `original` was rebound before `final` read it.',
        ], 'Run it. Then fix it by giving the new value a different name, such as adjusted = result + 50, so original keeps 100.', 'original = 100\nresult = original * 2\noriginal = result + 50     # overwrites a value still needed\nfinal = original + result  # intended 100 + 200 = 300\nprint(final)', { expectOutput: ['450'] }),
        demo(4, 'Stage 4 — Save before overwriting', [
          'One fix: store the value you will need under a separate name before the overwrite.',
        ], 'Run and check that final is now 300. Which row of the state table is different from Stage 3?', 'original = 100\nsaved_original = original   # keep it\nresult = original * 2\noriginal = result + 50\nfinal = saved_original + result\nprint(final)', { expectOutput: ['300'] }),
      ]),
      prose(
        '**Notebooks add a twist: the order you ran cells in.** In a notebook, state is built by the cells you ran, in the order you ran them — including cells you ran twice, and cells you edited and then ran. The `In [n]` numbers record that history. So the page can show code that would produce one answer while the session holds another. That mismatch is **hidden state**.',
        'For example, with cells A: `total = 0`, B: `total = total + 50`, C: `print(total)` —',
        '| Order you ran them | What C prints |\n|---|---|\n| A, B, C | 50 |\n| A, B, B, C | 100 |\n| B, A, C | NameError from B, then 0 |\n| Reset variables, then Run all | 50 |',
        'The last row is the one to trust: it is what anyone else running the notebook from scratch will get.',
      ),
      check(
        'You ran cells A, B, B, C and C printed 100. A colleague opens the same notebook and clicks Run all. What do they see?',
        ['100', '50', 'A NameError'],
        1,
        'Run all executes each cell once, top to bottom: A, B, C. Your extra run of B existed only in your session.',
      ),
      notebook('Out-of-order execution', [
        demo(5, 'Cell A — start the total', ['Creates the name `total`.'], 'Run A, then B twice, then C. Note the In [n] numbers.', 'total = 0', {}),
        demo(6, 'Cell B — add 50', ['Reads the current `total`, adds 50 and rebinds.'], 'Run this twice before running C.', 'total = total + 50', {}),
        demo(7, 'Cell C — report', ['Prints whatever `total` is bound to right now.'], 'After A, B, B, C this shows 100. Now click ↺ Reset variables and ▶ Run all: it shows 50, the answer the code on the page actually produces.', 'print("total:", total)', { expectOutput: ['total: 50'] }),
      ]),
      prose(
        '**Diagnosing a NameError.** A NameError means Python looked up a name that is not bound *where the code is running*. Reordering lines is only one of the possible fixes, so find the cause first.',
        '| Cause | Example | Fix |\n|---|---|---|\n| Order: read before assigned | `total = x + y` above `x = 15` | move the assignment up |\n| Spelling or capitals | `price_totl` or `Price_total` for `price_total` | use the exact name |\n| Scope: the name only exists inside a function | reading a function\'s local name outside it | use the value the function returns |\n| Notebook: the assigning cell never ran | after a reset, or on a fresh page | Reset variables, then Run all |',
      ),
      check(
        'A cell has `price_total = 120` on line 1 and `print(price_totl)` on line 2. Which fix is right?',
        ['Move line 1 below line 2', 'Correct the spelling on line 2', 'Add price_totl = 120'],
        1,
        'The assignment is already above the read, so order is not the problem. Adding a second name would hide the typo rather than fix it.',
      ),
      notebook('NameErrors', [
        demo(8, 'Stage 5 — NameError from order', [
          'This cell reads `x` and `y` before they are bound. Here the cause is order.',
        ], 'Run the cell and read the error. Then fix it by moving the total line below the assignments.', 'total = x + y    # x and y are not bound yet\nx = 15\ny = 25\nprint(total)', { expectError: 'NameError' }),
        demo(9, 'Stage 6 — NameErrors that are not about order', [
          'In the first part, the assignment is already above the read, but the name is misspelled. In the second part, `discount` is bound inside a function, so it is a **local** name: it exists only while the function runs. (Lesson A.08 covers functions properly.)',
        ], 'Run the cell and read the error — Python even suggests the right spelling. Fix it and run again: a second NameError appears, from the scope problem. Fix that by using the value the function returns: discount = get_discount().', 'price_total = 120\nprint(price_totl)      # misspelled name\n\ndef get_discount():\n    discount = 0.1     # local to get_discount\n    return discount\n\nget_discount()\nprint(discount)        # discount only existed inside the function', { expectError: 'NameError' }),
      ]),
      callout('procedure', 'When state looks wrong', '1. Click ↺ Reset variables, then ▶ Run all.\n2. Find the first cell whose output surprises you.\n3. Write the state table for that cell, line by line.\n4. Find the first row where the table differs from what you intended. The bug is on that line or earlier — not necessarily where an error was reported.'),
      prose('**Practice.** Challenge 1 repairs a classic overwriting bug. Challenge 2 builds a total one value at a time. Challenge 3 is a fresh diagnosis problem with two different causes of NameError.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — The swap bug', 'easy', {
          prompt: 'This code tries to swap a and b, but both end up as 99. Fix it so a is 99 and b is 7.',
          instructions: '1. Run it and trace the state table: when does 7 disappear?\n2. Keep the old value under a temporary name before overwriting, or use a, b = b, a.',
          code: 'a = 7\nb = 99\na = b\nb = a   # too late: a is already 99\nprint(a, b)',
          testCode: `assert not (a == 99 and b == 99), "Both are 99: after a = b, the original 7 is gone. Save it first (temp = a) or use a, b = b, a"
assert (a, b) == (99, 7), f"Expected a=99 and b=7, got a={a} and b={b}"
"SUCCESS: the swap keeps both values."`,
          hint: 'temp = a\na = b\nb = temp',
          solution: 'a = 7\nb = 99\ntemp = a\na = b\nb = temp\nprint(a, b)',
          misconceptions: [{ code: 'a = 7\nb = 99\na = b\nb = a', feedback: 'the original 7 is gone' }],
        }),
        exercise(12, 2, 'Challenge 2 — Running total', 'medium', {
          prompt: 'Five sales arrive one at a time. Build total and sales_count by adding one sale at a time (no list, no sum()), then compute average.',
          instructions: '1. Start with total = 0 and sales_count = 0.\n2. For each sale: add it to total and add 1 to sales_count.\n3. average = total / sales_count.',
          code: 'sale1 = 120.50\nsale2 = 89.99\nsale3 = 204.00\nsale4 = 55.25\nsale5 = 178.30\ntotal = 0\nsales_count = 0\n# add each sale here\n\naverage = None',
          testCode: `assert sales_count == 5, f"sales_count should be 5, got {sales_count}. Add 1 for every sale"
assert abs(total - 648.04) < 1e-9, f"total should be 648.04, got {total}"
assert average is not None and abs(average - 129.608) < 1e-9, "average should be total / sales_count"
"SUCCESS: total = 648.04 over 5 sales, average = 129.608. This is the accumulator pattern."`,
          hint: 'total += sale1\nsales_count += 1\n(repeat for each sale)\naverage = total / sales_count',
          solution: 'sale1, sale2, sale3, sale4, sale5 = 120.50, 89.99, 204.00, 55.25, 178.30\ntotal = 0\nsales_count = 0\ntotal += sale1; sales_count += 1\ntotal += sale2; sales_count += 1\ntotal += sale3; sales_count += 1\ntotal += sale4; sales_count += 1\ntotal += sale5; sales_count += 1\naverage = total / sales_count',
          misconceptions: [{ code: 'total = 648.04\nsales_count = 0\naverage = None', feedback: 'Add 1 for every sale' }],
        }),
        exercise(13, 3, 'Challenge 3 — Diagnose, then fix', 'medium', {
          prompt: 'This payroll calculation raises NameError. There are two different causes. Fix both so net is 960.0 and tax is 240.0, without adding any new names.',
          instructions: 'Run it and read the error. Decide which cause from the table it is, fix it, and run again — the second error will then appear.',
          code: 'tax_rate = 0.2\ngross = 1200\nnet = gross - tax\ntax = gross * Tax_rate\nprint(net, tax)',
          testCode: `assert 'Tax_rate' not in globals(), "Do not add a new name Tax_rate: fix the capital letter so the existing tax_rate is used"
assert tax == 240.0, f"tax should be 1200 * 0.2 = 240.0, got {tax}"
assert net == 960.0, f"net should be 1200 - 240 = 960.0, got {net}"
"SUCCESS: one NameError was order (tax used before it was computed), the other was spelling (Tax_rate)."`,
          hint: 'Line 3 reads tax before line 4 creates it. Line 4 reads Tax_rate, but the name that exists is tax_rate.',
          solution: 'tax_rate = 0.2\ngross = 1200\ntax = gross * tax_rate\nnet = gross - tax\nprint(net, tax)',
          misconceptions: [{ code: 'tax_rate = 0.2\nTax_rate = 0.2\ngross = 1200\ntax = gross * Tax_rate\nnet = gross - tax', feedback: 'Do not add a new name Tax_rate' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'A table of bindings (name → current value), written after each line, is a useful simplified model of state.',
    'Rebinding discards the old value: save it under another name first if a later line needs it.',
    'In a notebook, state comes from the cells you ran and in what order — trust Reset variables + Run all.',
    'NameError causes: order, spelling, scope, or a cell that never ran. Diagnose before you fix.',
    'Debug from the first row where the state table differs from what you intended.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'x = 10; x = x * 2; x = x - 3. What is x at the end?',
      options: ['17 — 10 * 2 = 20, then 20 - 3 = 17', '20 — the multiplication runs last', '7 — the subtraction runs first on the original 10'],
      correct: 0,
    },
    {
      id: 'q2', type: 'choice',
      text: 'A notebook works for you but fails with NameError after Reset variables and Run all. What does that most likely mean?',
      options: [
        'The notebook is broken for everyone except you',
        'Your session had state the page does not create in order — for example a cell you ran and later deleted or edited, or cells run out of order',
        'Run all is unreliable and should not be used',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A function assigns to a name result. You also have a result outside the function. After calling the function, what is the outer result?',
      options: [
        'Changed — assignment inside a function changes the outer name',
        'Unchanged — assigning inside a function creates a local name; the outer binding is not affected',
        'Deleted',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'What is the goal of tracing a bug?',
      options: [
        'To find the line where the error message appeared — that is always where the bug is',
        'To find the first step where the state differs from what you expected — the root cause may be earlier than where Python complained',
        'To count how many instructions ran before the crash',
      ],
      correct: 1,
    },
  ],
}
