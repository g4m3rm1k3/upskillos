// Track A — Lesson 01
// What Is a Program?
// Prereqs: None | Unlocks: A.02, A.03

export default {
  id: 'a-01',
  slug: 'what-is-a-program',
  track: 'A',
  order: 1,
  title: 'What Is a Program?',
  subtitle: 'The Interpreter Model',
  tags: ['evaluation', 'interpreter', 'expressions', 'errors'],
  prereqs: [],
  unlocks: ['a-02', 'a-03'],

  hook: {
    question: 'What does Python actually DO with code?',
    realWorldContext:
      'Before you write a single program, you need a mental model of the machine running it. ' +
      'Python first reads (parses) your whole cell or file to check it is valid Python, then ' +
      'executes the statements in order, top to bottom. Most simple lines evaluate a value, store a ' +
      'value, or cause a side effect. This sequential model is the foundation everything else extends.',
  },

  intuition: {
    prose: [
      'A **program** is a sequence of instructions. Running Python code happens in two phases. First Python **parses** the whole cell or file: it checks that the text is valid Python and turns it into instructions. Then it **executes** those instructions top to bottom. For the straight-line examples on this page, that means one statement after another, in order. Later lessons add **control flow** (`if`, loops, function calls), which lets a program skip or repeat statements, but top-to-bottom is the starting model.',
      'In the simple code on this page, each line does one of three jobs: it **evaluates an expression** (produces a value), it **binds a name to a value** (assignment), or it **causes a side effect** (changes something outside the computation, like printing). Real code often combines them — `x = print(2 + 3)` does all three — so treat these as three jobs to look for, not three bins every line must fit into.',
      'There are two different kinds of error. A **syntax error** is found while parsing, *before anything runs*: no line in the cell executes, not even the lines above the mistake. A **runtime error** (such as dividing by zero) happens during execution: lines above it have already run, and nothing below it runs. The error message tells you the error type, the line number, and a description. Reading error messages precisely is a skill — it is not optional.',
    ],
    callouts: [
      {
        type: 'important',
        title: 'Three Jobs a Line Can Do',
        body: '1. Evaluate an expression → produce a value\n2. Bind a name → store a value in memory\n3. Cause a side effect → change something outside the computation\n\nA line can do more than one: x = print(5) does all three. If you cannot say which jobs a line is doing, you do not yet understand it.',
      },
      {
        type: 'warning',
        title: 'Syntax Errors vs Runtime Errors',
        body: 'Syntax error on line 5: nothing in the cell runs — not even lines 1–4 — because Python could not parse the code.\nRuntime error on line 5: lines 1–4 already ran; lines 6, 7, 8 do not run. Continuing with broken state would produce meaningless results.\n(Later you will meet try/except, which lets a program handle a runtime error and continue.)',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'The Interpreter in Action',
        caption: 'Watch how Python evaluates each line. Notice which produce visible values and which do not.',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Stage 1 — A Pure Expression',
              prose: 'Type `2 + 3` into a cell and run it. This is an expression. Python evaluates it and shows the result: 5. Nothing is stored anywhere. The value 5 exists for a moment, is displayed, and then is gone.',
              instructions: 'Run the cell. Notice the `Out [1]: 5` below. That is the result of evaluating the expression.',
              code: '2 + 3',
              output: '',
              status: 'idle',
            },
            {
              id: 2,
              cellTitle: 'Stage 2 — A String Literal',
              prose: 'A string in quotes is also an expression — it evaluates to itself. `"hello"` evaluates to the string hello. The quotes are not part of the value — they are syntax that tells Python "this is a string."',
              instructions: 'Run the cell. The output shows the string with its quotes — Python\'s way of telling you this is a string value, not a number.',
              code: '"hello"',
              output: '',
              status: 'idle',
            },
            {
              id: 3,
              cellTitle: 'Stage 3 — Sequential Execution',
              prose: 'Python runs lines top to bottom. Each line runs to completion before the next begins. In a notebook, only the value of the LAST expression in a cell is shown automatically.',
              instructions: 'Run the cell. Notice that only the result of the last line (30) appears as output. The first two expressions (10, 20) evaluated but were not shown — there was a next line to run.',
              code: '10\n20\n30',
              output: '',
              status: 'idle',
            },
            {
              id: 4,
              cellTitle: 'Stage 4 — Arithmetic Expressions',
              prose: 'Python understands standard arithmetic. These are all expressions — they evaluate to values. The operators follow standard mathematical precedence.',
              instructions: 'Run the cell. Each `print()` forces the value to be displayed even though it is not the last line. We will explain print() properly in Lesson A.06.',
              code: 'print(10 + 3)\nprint(10 - 3)\nprint(10 * 3)\nprint(10 / 3)\nprint(10 ** 2)',
              output: '',
              status: 'idle',
            },
            {
              id: 5,
              cellTitle: 'Stage 5 — What an Error Looks Like',
              prose: 'This cell contains a deliberate syntax error on its last line. Run it and read the output carefully. Python tells you: (1) the type of error, (2) the line where it occurred, (3) a description of what went wrong. Notice that the print on the first line does NOT run: a syntax error is found while parsing, before any line executes.',
              instructions: 'Predict first: will "before the error" be printed? Run the cell. Read the error. Find the error type (SyntaxError), the line number and the description. Then fix the error so the cell runs correctly.',
              code: '# This has a syntax error — fix it\nprint("before the error")\n5 + * 3',
              output: '',
              status: 'idle',
            },
            {
              id: 6,
              cellTitle: 'Stage 6 — Errors Stop Everything',
              prose: 'This is a runtime error. The code is valid Python, so parsing succeeds and execution starts. The first line runs; the second line raises ZeroDivisionError; `print("this never runs")` never executes. Compare with Stage 5, where nothing ran at all.',
              instructions: 'Predict which lines will print, then run the cell. Only one line of output appears: the error on the second line stops execution, so the third line never runs.',
              code: 'print("this runs")\n1 / 0\nprint("this never runs")',
              output: '',
              status: 'idle',
            },
            {
              id: 11,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Challenge 1 — Your First Expression',
              difficulty: 'easy',
              prompt: 'Write a single arithmetic expression that evaluates to exactly 42. You may use any combination of numbers and operators (+, -, *, /, **). Do not use any variable names.',
              instructions: '1. Think of a calculation that equals 42.\n2. Write only the expression — no variable names, no print().\n3. Run the cell. The output should show 42.',
              code: '# Write your expression below — it should evaluate to 42\n',
              output: '',
              status: 'idle',
              testCode: `
result = eval(In[-1].strip().split('\\n')[-1])
if result == 42:
    res = "SUCCESS: Your expression evaluates to 42. You have written your first Python expression."
else:
    raise ValueError(f"Your expression evaluates to {result}, not 42. Adjust your arithmetic.")
res
`,
              hint: '6 * 7',
            },
            {
              id: 12,
              challengeType: 'predict',
              challengeNumber: 2,
              challengeTitle: 'Challenge 2 — Error Reading',
              difficulty: 'easy',
              prompt: 'The cell below has a syntax error. Run it and read the error message. Notice that neither line printed: the error was found while parsing, before anything ran. Fix the error so the first line prints Hello World.',
              instructions: '1. Run the cell as-is.\n2. Read the error type and line number.\n3. Work out why Python thinks a string was never closed.\n4. Fix it and run again.\n5. The first line should print exactly: Hello World',
              code: 'print("Hello" + " " + World")\nprint("this line is fine")',
              output: '',
              status: 'idle',
              testCode: `
import sys
from io import StringIO
buf = StringIO()
sys.stdout = buf
exec('''print("Hello" + " " + "World")''')
sys.stdout = sys.__stdout__
out = buf.getvalue().strip()
if out == "Hello World":
    res = "SUCCESS: You read two error messages and fixed them both. This skill will save you hours."
else:
    raise ValueError(f"Expected 'Hello World', got '{out}'. Check your string syntax.")
res
`,
              hint: 'World is missing its opening quote. Python pairs the quote after World with nothing, so it reports an unterminated string.',
            },
          ],
        },
      },
    ],
  },

  mentalModel: [
    'Python parses the whole cell first, then executes statements top to bottom (until control flow changes the order).',
    'A line can evaluate an expression, store a value, cause a side effect — or several of these at once.',
    'An expression is anything that produces a value when evaluated.',
    'A syntax error stops the cell before anything runs; a runtime error stops it at that line, after earlier lines have run.',
    'Read error messages precisely: type, line number, description.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'A program encounters a runtime error on line 7. What happens to the code on lines 8–15?',
      options: [
        'Lines 8–15 run normally — the error is isolated to line 7',
        'Lines 8–15 do not execute — errors stop execution immediately and control passes to the error handler or the program terminates',
        'Lines 8–15 are skipped only if they depend on a variable defined on line 7',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'What is the key difference between source code and a running program?',
      options: [
        'Source code is stored in memory, while a running program is stored on disk',
        'Source code is static text (instructions); a running program is the active process executing those instructions step by step — the code is the recipe, the program is the cooking',
        'Source code is in a high-level language, while a running program is always machine code',
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
      text: 'Why are "state" and "control flow" two of the most important concepts in programming?',
      options: [
        'State and control flow are just technical terms for variables and loops — they have no deeper meaning',
        'State (what values are stored in memory at a moment in time) combined with control flow (which instruction runs next) together fully describe what a program does at every step — understanding both is how you trace and debug programs systematically',
        'State refers to the program\'s progress through a file, and control flow refers to keyboard inputs',
      ],
      correct: 1,
    },
  ],
}
