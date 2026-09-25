// Track A — Lesson 01
// What Is a Program?
// Prereqs: A.00 | Unlocks: A.02, A.03
import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-01',
  slug: 'what-is-a-program',
  track: 'A',
  order: 1,
  title: 'What Is a Program?',
  subtitle: 'The Interpreter Model',
  tags: ['evaluation', 'interpreter', 'expressions', 'errors'],
  prereqs: ['a-00'],
  unlocks: ['a-02', 'a-03'],

  hook: {
    question: 'What does Python actually DO with code?',
    realWorldContext:
      'Before you write programs, you need a mental model of the machine running them. ' +
      'Python first reads (parses) your whole cell to check it is valid Python, then ' +
      'executes the statements in order, top to bottom. That two-step model explains most ' +
      'of what you will see — including why some errors stop everything and others stop halfway.',
  },

  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Trace a short program line by line, writing down what each line stores and what it prints. Predict which lines run when something goes wrong, and explain the difference between a **syntax error** and a **runtime error**.',
        '**The smallest example.** Here is a complete program. It works out the cost of three notebooks at 4 each.',
        '```python\nprice = 4\nquantity = 3\nprint(price * quantity)\n```',
        'A **program** is a sequence of instructions. Python runs these three lines in order, one after another. Trace them with a table: after each line, write every name Python remembers and anything that appears on screen.',
        '| Line | What Python does | Names remembered afterwards | Output |\n|---|---|---|---|\n| `price = 4` | stores 4 under the name `price` | price = 4 | — |\n| `quantity = 3` | stores 3 under the name `quantity` | price = 4, quantity = 3 | — |\n| `print(price * quantity)` | looks up both names, multiplies 4 × 3, prints the result | price = 4, quantity = 3 | `12` |',
      ),
      check(
        'Suppose line 2 were `quantity = 5` instead. What would line 3 print?',
        ['12', '20', 'price * quantity', 'Nothing'],
        1,
        'Line 3 looks up the values stored when it runs: 4 × 5 = 20. `print` shows the value of the expression, not its text.',
      ),
      notebook('The interpreter in action', [
        demo(1, 'Stage 1 — Trace three lines', [
          'This is the program from the table. Only the last line produces output; the first two only store values.',
        ], 'Predict the output, then run. Change quantity to 5 and run again. Which row of the trace table changed?', 'price = 4\nquantity = 3\nprint(price * quantity)', { expectOutput: ['12'] }),
        demo(2, 'Stage 2 — A pure expression', [
          '`2 + 3` is an **expression**: a piece of code that produces a value. Nothing is stored. In a notebook, the value of the last line is displayed automatically; in a script run outside a notebook, it would simply be discarded.',
        ], 'Run the cell. The 5 below it is the value of the expression.', '2 + 3', { expectOutput: ['5'] }),
        demo(3, 'Stage 3 — Only the last value is shown', [
          'Each of these three lines is evaluated, in order. The notebook displays only the last line\'s value. The first two were computed and then thrown away.',
        ], 'Predict what appears, then run. Then add print(10) as a new first line: printed text appears even though it is not last.', '10\n20\n30', { expectOutput: ['30'] }),
      ]),
      prose(
        '**Three jobs a line can do.** In simple code like this, each line does one or more of three jobs. It can **evaluate an expression** (produce a value, like `price * quantity`). It can **bind a name** (store a value under a name, like `price = 4`). It can **cause a side effect** (change something outside the calculation, like printing). A line can do more than one: `total = print(5)` evaluates, prints and binds. If you cannot say which jobs a line is doing, you do not yet understand it.',
        '**Arithmetic expressions.** Python\'s arithmetic operators behave like a calculator, with one surprise: `/` always produces a decimal (a *float*), even when the answer is whole.',
        '| Expression | Value | Note |\n|---|---|---|\n| `10 + 3` | `13` | addition |\n| `10 - 3` | `7` | subtraction |\n| `10 * 3` | `30` | multiplication |\n| `10 / 3` | `3.3333333333333335` | division always gives a float; the last digit shows rounding |\n| `10 / 2` | `5.0` | still a float |\n| `10 ** 2` | `100` | power |',
      ),
      notebook('Arithmetic', [
        demo(4, 'Stage 4 — Arithmetic expressions', [
          'Each `print(...)` forces a value to be shown even when it is not the last line. Lesson A.06 explains `print` properly.',
        ], 'Predict each line using the table above, then run. Then add print(9 / 3) and explain why it shows 3.0 rather than 3.', 'print(10 + 3)\nprint(10 - 3)\nprint(10 * 3)\nprint(10 / 3)\nprint(10 ** 2)', { expectOutput: ['13', '3.3333333333333335', '100'] }),
      ]),
      prose(
        '**Two phases: parse, then execute.** Running a cell happens in two steps. First Python **parses** the whole cell: it reads all of the text, checks that it follows Python\'s grammar, and turns it into instructions. Only if that succeeds does it **execute** the instructions from the top. Later lessons add **control flow** (`if`, loops, functions), which lets a program skip or repeat lines; for now every line runs once, in order.',
        'The two phases produce two different kinds of error.',
        '| | Syntax error | Runtime error |\n|---|---|---|\n| Found during | parsing, before anything runs | execution |\n| Example | `5 + * 3` (not valid Python) | `1 / 0` (valid Python, impossible value) |\n| Lines above it | do **not** run | already ran |\n| Lines below it | do not run | do not run |',
      ),
      check(
        'A cell contains `print("A")`, then `print(1 / 0)`, then `print("B")`. What is printed before the error message?',
        ['Nothing', 'A', 'A and B'],
        1,
        '`1 / 0` is valid Python, so the cell parses and starts running. Line 1 prints A; line 2 raises ZeroDivisionError; line 3 never runs.',
      ),
      check(
        'A cell contains `print("A")`, then `5 + * 3`, then `print("B")`. What is printed before the error message?',
        ['Nothing', 'A', 'A and B'],
        0,
        '`5 + * 3` is not valid Python, so parsing fails and no line executes — not even the print above the mistake.',
      ),
      notebook('Two kinds of error', [
        demo(5, 'Stage 5 — A syntax error', [
          'The last line is not valid Python. Notice that "before the error" is NOT printed: the problem was found while parsing, before any line executed. The message tells you the error type (SyntaxError) and points at the line.',
        ], 'Check your prediction: did the first print run? Read the error. Then fix the last line (for example, 5 + 3) and run again.', '# This has a syntax error — fix it\nprint("before the error")\n5 + * 3', { expectError: 'SyntaxError' }),
        demo(6, 'Stage 6 — A runtime error', [
          'This code is valid Python, so parsing succeeds and execution starts. The first line runs; the second raises ZeroDivisionError; `print("this never runs")` never executes. Compare with Stage 5, where nothing ran at all.',
        ], 'Predict which lines print, then run. Then change 0 to 4 and check that all three lines now run.', 'print("this runs")\nprint(1 / 0)\nprint("this never runs")', { expectError: 'ZeroDivisionError', expectOutput: ['this runs'] }),
      ]),
      callout('procedure', 'Reading an error message', '1. Read the **last line** first: it names the error type and describes it.\n2. Find the line number in the traceback above it.\n3. Ask: was this found while parsing (SyntaxError, nothing ran) or while running (anything else, earlier lines ran)?\n4. Fix the first error, then run again — a second error may have been hidden behind it.'),
      prose(
        '**Practice.** The first two challenges rehearse the ideas above. The third is a fresh problem: predict which lines run, without running the code.',
      ),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — An expression worth 42', 'easy', {
          prompt: 'Store an arithmetic expression that evaluates to exactly 42 in a variable named answer. Use numbers and operators only (+, -, *, /, **).',
          instructions: '1. Think of a calculation that equals 42.\n2. Write answer = <your expression>.\n3. Run the cell. Try a different expression that also works.',
          code: '# Replace None with an arithmetic expression that equals 42\nanswer = None\nprint(answer)',
          testCode: `assert answer is not None, "Replace None with an expression"
assert not isinstance(answer, str), "answer is text (a string). Remove the quotes so Python calculates the value"
assert answer == 42, f"Your expression evaluates to {answer}, not 42"
"SUCCESS: your expression evaluates to 42."`,
          hint: 'For example 6 * 7, or 40 + 2.',
          solution: 'answer = 6 * 7\nprint(answer)',
          misconceptions: [{ code: 'answer = "42"', feedback: 'answer is text (a string)' }],
        }),
        exercise(12, 2, 'Challenge 2 — Read and fix a syntax error', 'easy', {
          prompt: 'This cell has a syntax error, so nothing in it runs. Fix it so greeting holds the text Hello World.',
          instructions: '1. Run the cell and read the error. Notice that nothing printed.\n2. Work out why Python thinks a string was never closed.\n3. Fix it and run again.',
          code: 'greeting = "Hello" + " " + World"\nprint(greeting)',
          testCode: `assert greeting == "Hello World", f"greeting is {greeting!r}; it should be 'Hello World'"
"SUCCESS: you read the syntax error and fixed the string."`,
          hint: 'World is missing its opening quote. Python pairs the quote after World with nothing, so it reports an unterminated string.',
          solution: 'greeting = "Hello" + " " + "World"\nprint(greeting)',
          misconceptions: [{ code: 'greeting = "Hello" + " " + World\nprint(greeting)', feedback: 'NameError' }],
        }),
        exercise(13, 3, 'Challenge 3 — Which lines run?', 'medium', {
          prompt: 'Without running it, decide which lines of this program print something. Store their line numbers in a list called lines_that_print.',
          prose: [
            'The program:',
            '```python\nprint("line 1")\nprint("line 2")\nprint(len(5))\nprint("line 4")\n```',
            '`len(5)` asks for the length of the number 5. Decide first whether that is a problem Python finds while parsing or while running.',
          ],
          instructions: 'Write your answer as a list, for example lines_that_print = [1, 3]. Run to check. If you are wrong, read the feedback, then paste the program into a new cell and run it to see why.',
          code: 'lines_that_print = None  # replace with a list of line numbers',
          testCode: `assert isinstance(lines_that_print, list), "Store a list of line numbers, like [1, 3]"
assert lines_that_print != [], "len(5) is valid Python, so the cell parses and starts running: this is a runtime error, not a syntax error"
assert 4 not in lines_that_print, "Nothing after the failing line runs, so line 4 never prints"
assert 3 not in lines_that_print, "Line 3 raises TypeError before print can show anything"
assert sorted(lines_that_print) == [1, 2], "Which lines run before the error on line 3?"
"SUCCESS: lines 1 and 2 run; line 3 raises TypeError at runtime; line 4 never runs."`,
          hint: 'len(5) is grammatically fine — it is a function call — so parsing succeeds. The problem appears only when Python tries to run it.',
          solution: 'lines_that_print = [1, 2]',
          misconceptions: [
            { code: 'lines_that_print = []', feedback: 'this is a runtime error, not a syntax error' },
            { code: 'lines_that_print = [1, 2, 4]', feedback: 'Nothing after the failing line runs' },
          ],
        }),
      ]),
    ],
  },

  mentalModel: [
    'Python parses the whole cell first, then executes statements top to bottom (until control flow changes the order).',
    'A line can evaluate an expression, store a value, cause a side effect — or several of these at once.',
    'Trace a program with a table: names remembered and output, after each line.',
    'A syntax error stops the cell before anything runs; a runtime error stops it at that line, after earlier lines have run.',
    'Read error messages from the last line up: type, description, then line number.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'A program raises a runtime error on line 7. What happens to the code on lines 8–15?',
      options: [
        'Lines 8–15 run normally — the error is isolated to line 7',
        'Lines 8–15 do not execute — the program stops at the error (unless code has been written to handle it)',
        'Lines 8–15 are skipped only if they depend on a variable defined on line 7',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'A cell has a syntax error on its last line. Which of its lines run?',
      options: [
        'Every line above the error',
        'None — parsing fails before execution starts',
        'Every line except the one with the error',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A Python script reads a file, computes statistics, and prints results. Which part of this is "output"?',
      options: [
        'Reading the file — that is where data enters the program',
        'Printing the results — output is information the program sends outside itself (to the screen, a file, a network); the statistics computation is internal processing',
        'Computing the statistics — calculations are the final output of any program',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Why are "state" and "control flow" two of the most important ideas in programming?',
      options: [
        'They are just technical terms for variables and loops',
        'State (the values stored at a moment) and control flow (which instruction runs next) together describe what a program does at every step — tracing both is how you debug systematically',
        'State is the program\'s progress through a file, and control flow means keyboard input',
      ],
      correct: 1,
    },
  ],
}
