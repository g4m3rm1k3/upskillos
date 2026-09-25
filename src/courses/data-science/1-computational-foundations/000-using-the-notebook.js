import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-00',
  slug: 'using-the-notebook',
  track: 'A',
  order: 0,
  title: 'Using the Notebook',
  subtitle: 'Run cells, read output, and recover a clean state',
  tags: ['notebook', 'cells', 'execution-order', 'state', 'reset'],
  prereqs: [],
  unlocks: ['a-01'],

  hook: {
    question: 'Why can the same cell work for you and fail for someone else?',
    realWorldContext:
      'Every lesson in this course runs Python in a notebook. A notebook remembers what you ran and in which order, not just the code you can see. Knowing how that memory works saves hours of confusion later.',
  },

  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Run a cell and read what it shows. Tell printed text apart from the value of a cell\'s last line. Predict what happens when cells run out of order. Recover a clean state with **Reset variables** and **Run all**. Recognise an error a lesson shows you on purpose.',
        '**The smallest example.** A notebook is a list of **cells**. Each cell holds a little Python. Click ▶ on a cell, or put your cursor in it and press **Shift+Enter**, and Python runs it. Anything the cell shows appears underneath, labelled `Out`. The label `In [1]`, `In [2]`, … on each cell is the *order you ran cells in*, not the cell\'s position on the page.',
      ),
      check(
        'A cell contains two lines: `price = 12` and then `price * 3`. What will appear under it?',
        ['Nothing, because nothing was printed', '36', 'price = 12 and 36', '12'],
        1,
        'A notebook shows the value of the **last line** if that line is an expression. `price * 3` is an expression whose value is 36. The first line is an assignment, which stores a value but shows nothing.',
      ),
      notebook('Your first cells', [
        demo(1, 'Run a cell', [
          'Run this cell. The first two lines store values; nothing is shown for them. The last line is an expression, so its value appears under the cell.',
        ], 'Run the cell with ▶ or Shift+Enter. Then change quantity to 4 and run it again. Check that In [ ] shows a larger number the second time.', 'price = 12\nquantity = 3\nprice * quantity', { expectOutput: ['36'] }),
        demo(2, 'Printed text versus the last value', [
          '`print(...)` writes text at the moment that line runs, from anywhere in the cell. The last-line value is shown only for the **last** line. This cell does both, so you see two lines of output.',
        ], 'Predict both lines of output before running. Then delete the last line and run again: only the printed text remains.', 'print("total:", price * quantity)\nprice * quantity + 1', { expectOutput: ['total: 36', '37'] }),
      ]),
      prose(
        '**What the output rules were.** Here is the whole rule in one table.',
        '| Last thing the cell does | What appears under it |\n|---|---|\n| An expression such as `price * 3` | Its value |\n| An assignment such as `total = 36` | Nothing |\n| `print(...)` anywhere in the cell | The printed text, in order |\n| An error | The error message; lines after it did not run |',
        '**All cells share one memory.** Every cell on this page — and every notebook on the page — runs in the same Python session. A name you create in one cell stays available to every other cell until you reset or reload. That is why cell 2 above could use `price` from cell 1. It also means a cell\'s result depends on what ran *before it in time*, not on what is written above it on the page.',
      ),
      check(
        'Cell 1 says `rate = 0.1`. Cell 3 prints `rate * 100`. You edit cell 1 to `rate = 0.2` but run only cell 3. What does cell 3 print?',
        ['20.0, because cell 1 now says 0.2', '10.0, because the edited cell 1 was never re-run', 'A NameError'],
        1,
        'Editing code changes nothing until you run it. The session still holds the old value 0.1, so cell 3 prints 10.0. This mismatch between the code you can see and the values in memory is called **hidden state**.',
      ),
      notebook('Order and hidden state', [
        demo(1, 'Start a counter', [
          'This cell creates a name called `count` and gives it the value 0.',
        ], 'Run this cell once.', 'count = 0\nprint("count is", count)', { expectOutput: ['count is 0'] }),
        demo(2, 'Run this one several times', [
          'This cell reads `count`, adds one, and stores the result back under the same name. Each time you run it, it starts from whatever value is in memory right now.',
        ], 'Run this cell three times. Predict the value each time before you run it. Then click ↺ Reset variables (top of the notebook) and run ONLY this cell: you get a NameError, because count no longer exists. Finally click ▶ Run all.', 'count = count + 1\ncount', { expectOutput: ['1'] }),
      ]),
      prose(
        '**The recovery routine.** When a notebook behaves strangely, do not guess. Click **↺ Reset variables** to empty the session, then **▶ Run all** to run every demonstration cell from top to bottom. If something now fails, the *first* error points at the first cell that depends on something missing or out of order. Jupyter calls the same routine "restart and run all".',
        'Two limits of this notebook are worth knowing. **Reset variables** clears the whole page\'s session, so outputs in other notebooks on the page may now be out of date. **Run all** skips challenge cells, because those hold unfinished code for you to complete; run each challenge yourself once you have written it.',
      ),
      callout('warning', 'Your edits are not saved', 'Reloading the page or leaving the lesson puts every cell back to its original code. If you write something you want to keep, copy it into a file on your computer first.'),
      prose(
        '**Packages must be imported in the session.** Libraries such as NumPy, pandas, SciPy, scikit-learn and matplotlib are already installed, but a name like `np` does not exist until a cell runs `import numpy as np`. After a reset you must run the import again. The first cell you run on a page can take about ten seconds while Python itself loads.',
        '**Some errors are there on purpose.** Lessons sometimes show an error so you can practise reading it. Those cells are marked **Expected error** when they fail. Read the last line of the message — the error type and description — then follow the cell\'s instructions.',
      ),
      notebook('Imports and error messages', [
        demo(1, 'Import before use', [
          '`import numpy as np` makes the NumPy library available under the short name `np`. Without it, `np` is just an unknown name.',
        ], 'Run the cell. Then click ↺ Reset variables, delete the import line, and run again. Read the error: which name is missing? Put the import line back.', 'import numpy as np\nnp.array([2, 4, 6]).sum()', { expectOutput: ['12'] }),
        demo(2, 'An expected error', [
          'This cell divides by zero on its second line. Python stops there: the first print runs, the last one never does. The message\'s last line names the error type (`ZeroDivisionError`) and describes it.',
        ], 'Run the cell and find: the error type, the line number in the full traceback, and which print statements ran. Then change 0 to 2 and run again.', 'print("before")\nprint(10 / 0)\nprint("after")', { expectError: 'ZeroDivisionError', expectOutput: ['before'] }),
        demo(3, 'A package that is not installed', [
          'Only some packages exist in this browser-based Python. Importing one that does not exist raises `ModuleNotFoundError`. If you see this for a real library, the lesson needs a different tool; it is not your mistake.',
        ], 'Run the cell and read the error type.', 'import not_a_real_package', { expectError: 'ModuleNotFoundError' }),
      ]),
      prose(
        '**Practice.** The challenge below is written in the wrong order, so it fails from a fresh session. Fix it so that it works straight after Reset variables. When you run a challenge cell, a checker runs after your code and tells you whether it passed and, if not, what to look at.',
      ),
      notebook('Practice: make it run from a fresh start', [
        exercise(11, 1, 'Fix the order', 'easy', {
          prompt: 'This cell uses total_cost before creating it. Reorder the lines so it runs from a fresh session and prints the total cost of 5 items at 4 each.',
          instructions: '1. Click Reset variables.\n2. Run the cell and read the NameError.\n3. Move lines so every name is created before it is used.\n4. Run it again. Do not type the number 20 yourself — let Python calculate it.',
          code: 'print("total cost:", total_cost)\nunit_price = 4\ncount = 5\ntotal_cost = unit_price * count',
          testCode: `assert 'unit_price' in globals() and 'count' in globals(), "Keep the unit_price and count assignments"
assert total_cost == unit_price * count, "total_cost should be calculated as unit_price * count"
assert (unit_price, count) == (4, 5), "Keep the original values: 4 per item, 5 items"
"SUCCESS: every name is created before it is used, so the cell works from a fresh session."`,
          hint: 'Python runs lines top to bottom. The print line needs total_cost, and total_cost needs unit_price and count.',
          solution: 'unit_price = 4\ncount = 5\ntotal_cost = unit_price * count\nprint("total cost:", total_cost)',
          misconceptions: [
            { code: 'total_cost = 20\nprint("total cost:", total_cost)', feedback: 'Keep the unit_price and count assignments' },
          ],
        }),
      ]),
    ],
  },

  mentalModel: [
    'A cell shows its last line\'s value (if that line is an expression) plus anything printed.',
    'In [n] is the order cells ran in, not their position on the page.',
    'All cells and notebooks on a page share one session; edited code does nothing until you run it.',
    'Recovery routine: ↺ Reset variables, then ▶ Run all; the first error shows the first missing dependency.',
    'Imports must run in the session; edits are not saved when you leave the page.',
  ],

  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'A cell\'s last line is `total = price * 3`. What appears under the cell?',
      options: ['The value of total', 'Nothing — an assignment shows no value', 'The word total'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'Your notebook worked yesterday but today a cell raises NameError. What is the most reliable first step?',
      options: [
        'Retype the variable name in the failing cell',
        'Reset variables, then Run all, and look at the first error',
        'Run the failing cell repeatedly until it works',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Cell 4 shows In [2] and cell 1 shows In [5]. What does that tell you?',
      options: [
        'Cell 4 ran before cell 1 most recently ran',
        'Cell 4 has a bug',
        'The notebook ran cells top to bottom',
      ],
      correct: 0,
    },
    {
      id: 'q4', type: 'choice',
      text: 'A cell fails with ModuleNotFoundError for a real library name. What does it most likely mean here?',
      options: [
        'You forgot a semicolon',
        'That package is not available in this browser-based Python',
        'The package is installed but needs Reset variables',
      ],
      correct: 1,
    },
  ],
}
