// Guttag Ch.0 — Lesson 1: What a Program Is
//
// DEPENDENCY: None. First lesson of the course.
//
// TEACHES:
//   Declarative vs. imperative knowledge — the fundamental split computer
//   science sits on top of.
//   A program is a sequence of instructions the computer executes mechanically.
//   The notebook cell is a Read-Eval-Print Loop: it reads an expression,
//   evaluates it, prints the result, and waits for the next one.
//   Standard arithmetic operators: + - * / // % **, and infix precedence (PEMDAS).
//   print() as a way to show more than one value from a single cell.
//
// DOES NOT TEACH (reserved for later):
//   Types in depth (Lesson 2)
//   Variables (Lesson 3)
//   Defining your own functions (Lesson 6)
//   Anything about print()'s keyword arguments

export default {
  id: 'gp-00-what-a-program-is',
  slug: 'what-a-program-is',
  chapter: 1,
  order: 1,
  title: 'What a Program Is',
  subtitle: 'Computation, instructions, and the Python shell',
  tags: ['computation', 'repl', 'program', 'arithmetic', 'declarative', 'imperative'],

  hook: {
    question: 'When you type 2 + 2 and press Enter, what is actually happening?',
    realWorldContext:
      'Before you learn a single keyword of Python syntax, you need a mental model of what a computer ' +
      'is even doing when it "runs" your code. A computer has no understanding of anything — it mechanically ' +
      'follows instructions, one at a time, exactly as written. This lesson draws the line between ' +
      'stating a fact and giving an instruction, introduces the notebook cell as a miniature interactive ' +
      'shell, and gets your fingers moving with the arithmetic every later lesson will build on.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'There are two fundamentally different kinds of knowledge. **Declarative knowledge** is a statement of fact: "the area of a circle is πr²". It describes a relationship but does not tell you the steps to compute anything. **Imperative knowledge** is a recipe: a step-by-step procedure that, if followed exactly, produces a result. A **program** is imperative knowledge, written in a language a computer can execute.',

      'This distinction matters because a computer cannot act on a fact by itself. Telling it "the sum of two numbers is their total" does nothing. Telling it "take this number, take that number, add them, produce the result" is something it can actually carry out. Every program you will ever write, no matter how sophisticated, is ultimately a sequence of small, mechanical steps like this.',

      'The tool you use to explore this is the **notebook cell** below. Each cell is a miniature **REPL** — Read-Eval-Print Loop. You type an expression, the interpreter **R**eads it, **E**valuates it (reduces it to a value), **P**rints that value, and **L**oops back, waiting for your next expression. This loop — read, evaluate, print, repeat — is the single most important habit for exploring a language you don\'t know yet: when in doubt, try it in the REPL.',

      'Python expressions use **infix notation** — the operator sits between its operands, exactly like the arithmetic you already know: `2 + 3`, not `+ 2 3`. Standard precedence rules (PEMDAS: parentheses, exponents, multiplication/division, addition/subtraction) decide which operation happens first when an expression has more than one operator, and parentheses override that order explicitly.',
    ],
    callouts: [
      {
        type: 'insight',
        title: 'A program does not understand — it executes',
        body: 'A computer following your program has no idea what a "circle" or an "average" is. It only knows how to perform a fixed set of primitive operations, one after another, exactly as instructed. Every abstraction you will learn — functions, classes, algorithms — exists to let humans think in bigger ideas while the machine still only ever executes small mechanical steps underneath.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 0.1 — Computation, Instructions, and the Shell',
        mathBridge: 'Run each cell in order and read the prose above it. Predict the output before you press Run whenever a cell asks you to.',
        caption: 'This is the Python REPL, cell by cell: read an expression, evaluate it, print the result, repeat.',
        props: {
          initialCells: [

            // ── CELL 1: First expression ─────────────────────────────────────
            {
              id: 1,
              cellTitle: 'Your first expression',
              prose: 'An expression is anything Python can reduce to a value. `2 + 2` is an expression: two literal numbers combined by the addition operator.\n\nType it into the editor below yourself, then run it. Python reads the expression, evaluates it, and prints the result below — this is the Read-Eval-Print Loop in miniature.',
              typeIt: true,
              solution: '2 + 2',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 2: Imperative, not declarative ──────────────────────────
            {
              id: 2,
              cellTitle: 'This is an instruction, not a fact',
              prose: '`2 + 2` does not merely state that four is the sum of two and two. It is an **instruction**: take the `+` procedure, apply it to `2` and `2`, and produce the result. That is imperative knowledge — a step to carry out, not a fact to know.',
              typeIt: true,
              solution: '2 + 2',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 3: Precedence ────────────────────────────────────────────
            {
              id: 3,
              cellTitle: 'Order of operations — PEMDAS applies',
              prose: 'Python follows the same precedence rules you learned in school: multiplication and division happen before addition and subtraction.\n\n`2 + 3 * 4` is not `(2 + 3) * 4` — it is `2 + (3 * 4)`.',
              instructions: 'Before typing it in: what do you expect? Then type it and run to check.',
              typeIt: true,
              solution: '2 + 3 * 4',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 4: Parentheses override precedence ──────────────────────
            {
              id: 4,
              cellTitle: 'Parentheses force a different order',
              prose: 'Wrapping part of an expression in parentheses makes Python evaluate that part first, exactly like in ordinary math notation.',
              typeIt: true,
              solution: '(2 + 3) * 4',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 5: The four division-family operators ───────────────────
            {
              id: 5,
              cellTitle: 'Four ways to divide',
              prose: 'Python has more than one division-like operator:\n\n- `/` — true division, always produces a decimal result.\n- `//` — floor division, discards anything after the decimal point.\n- `%` — modulo, the remainder left over.\n- `**` — exponentiation, not division at all, but grouped here because it is easy to confuse with `*`.\n\n`print()` is a function that displays a value — we need it here because a cell only auto-shows its *last* expression, and we want to see four results at once. You will learn `print()` properly in a later lesson; for now, just use it to peek at multiple values.',
              instructions: 'Type all four lines yourself, then run the cell and match each printed line to the operator that produced it.',
              typeIt: true,
              solution: [
                'print(10 / 3)',
                'print(10 // 3)',
                'print(10 % 3)',
                'print(2 ** 10)',
              ].join('\n'),
              code: '',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 6: The REPL loop, made explicit ──────────────────────────
            {
              id: 6,
              cellTitle: 'Read, Eval, Print, Loop',
              prose: 'Every cell you have run so far followed the exact same cycle:\n\n1. **Read** — Python reads your typed expression.\n2. **Eval**uate — it reduces the expression to a single value.\n3. **Print** — that value is displayed as output.\n4. **Loop** — control returns to you for the next expression.\n\nThis cycle is why the REPL is the best way to explore an unfamiliar piece of Python: type something, see immediately what it evaluates to, adjust, repeat.',
              typeIt: true,
              solution: '"Read -> Eval -> Print -> Loop"',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 7: A peek at type() ───────────────────────────────────────
            {
              id: 7,
              cellTitle: 'A preview: every value has a type',
              prose: 'Every value Python produces belongs to some type — a category that determines what you can do with it. `type()` asks Python what type a value is. We will study types properly in the next lesson; for now just notice that the answer to `type(4)` is not `4` — it is a description of *what kind of thing* `4` is.',
              typeIt: true,
              solution: 'type(4)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 8: Negative numbers and mixed expressions ────────────────
            {
              id: 8,
              cellTitle: 'Combining operators in one expression',
              prose: 'Real expressions usually mix several operators. Python evaluates the whole thing using precedence and, where precedence ties, left-to-right order.',
              instructions: 'Predict the value before typing it in and running.',
              typeIt: true,
              solution: '10 - 2 ** 2 + 6 / 2',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CHALLENGE 1 ────────────────────────────────────────────────────
            {
              id: 21,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Build the Number 100',
              difficulty: 'easy',
              prompt: 'Write a single arithmetic expression — no variables, no print() — that evaluates to exactly 100. Use at least two different operators (from + - * / // % **).',
              instructions: 'Your cell should contain only the expression. Run it — the output should show 100.',
              code: '# Write an expression that evaluates to 100\n',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == 100:
    res = "SUCCESS: Your expression evaluates to 100. You just wrote and evaluated your first real Python expression."
else:
    res = f"ERROR: Your expression evaluates to {result}, not 100. Try something like 4 * 5 * 5."
res
`,
              hint: '4 * 5 * 5 works, and so does 10 ** 2. Any combination that reduces to 100 is fine.',
            },

            // ── CHALLENGE 2 ────────────────────────────────────────────────────
            {
              id: 22,
              challengeType: 'write',
              challengeNumber: 2,
              challengeTitle: 'Precedence Changes the Answer',
              difficulty: 'easy',
              prompt: 'Write two expressions that use the exact same three numbers and the exact same two operators, but produce different results purely because of parentheses placement: one grouped as `(a op b) op c`, one as `a op (b op c)`. Run each one at a time and compare.',
              instructions: 'Try `(10 - 4) * 2` first, then replace it with `10 - (4 * 2)`. Leave the second one as your final answer.',
              code: '10 - (4 * 2)',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == 2:
    res = "SUCCESS: 10 - (4 * 2) = 2, while (10 - 4) * 2 = 12. Same numbers, same operators, different grouping, different answer."
else:
    res = f"ERROR: Expected 2 from 10 - (4 * 2). Got {result}. Check your parentheses."
res
`,
              hint: 'Multiplication happens before subtraction unless parentheses say otherwise. 4 * 2 = 8, and 10 - 8 = 2.',
            },

            // ── CHALLENGE 3 ────────────────────────────────────────────────────
            {
              id: 23,
              challengeType: 'write',
              challengeNumber: 3,
              challengeTitle: 'Three Results, One Cell',
              difficulty: 'medium',
              prompt: 'Using print(), display three different results in a single cell: the floor division of 17 by 5, the modulo (remainder) of 17 by 5, and 17 raised to the power of 2. Each on its own line.',
              instructions: 'Use three separate print() calls. Expected output (in order): 3, 2, 289',
              code: '# Three print() calls, one per line\n',
              output: '', status: 'idle', figureJson: null,
              testCode: `
import io, contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print(17 // 5)
    print(17 % 5)
    print(17 ** 2)
expected = buf.getvalue().strip()
if expected == "3\\n2\\n289":
    res = "SUCCESS: 17 // 5 is 3, 17 % 5 is 2, and 17 ** 2 is 289 — run the cell above and compare your own output to this."
else:
    res = "ERROR: something is off in the reference computation — but your own cell's printed output should read 3, 2, 289 on three lines."
res
`,
              hint: 'print(17 // 5) then print(17 % 5) then print(17 ** 2), one call per line.',
            },

          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      '**Mechanical execution**: a computer running a program has no semantic understanding of what the program "means" — it only ever performs primitive operations (add, compare, move data) in the exact sequence its instructions specify. Every higher-level abstraction (a function, a class, a machine-learning model) eventually compiles or interprets down to this same mechanical execution.',

      '**The REPL is not the whole language**: what you have used so far — typing a bare expression and seeing its value — is a notebook/REPL convenience. A saved `.py` script run from the command line does not automatically print a bare expression\'s value; only `print()` produces visible output there. That distinction becomes important once you start writing scripts instead of exploring in a notebook.',

      '**Operator precedence is fixed, not configurable**: `**` binds tighter than unary minus in some edge cases (`-2 ** 2` is `-4`, not `4`, because `**` is evaluated before the negation) — a classic surprise worth testing for yourself in the cell above.',
    ],
    callouts: [
      {
        type: 'warning',
        title: '-2 ** 2 is -4, not 4',
        body: 'Exponentiation binds more tightly than unary minus in Python. `-2 ** 2` is parsed as `-(2 ** 2)`, which is `-4`. If you want `(-2) ** 2 = 4`, you must write the parentheses explicitly.',
      },
    ],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If an operator does not do what you expect, isolate it: put just that one operation in a cell by itself and check the result before combining it with anything else.',
      'If you are unsure of evaluation order, add parentheses. They never change a mathematically-equivalent expression\'s value — they only make the order explicit.',
    ],
    futureLinks: [
      'Next lesson: Types — int, float, bool, str, and None. You already produced values of several of these types without naming them.',
      'print() will be explained properly once functions are introduced (Lesson 6).',
      'Variables — giving a name to a value so it can be reused — are the subject of Lesson 3.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'What is the key difference between declarative and imperative knowledge?',
      options: [
        'Declarative knowledge is written in English; imperative knowledge is written in code',
        'Declarative knowledge states a fact or relationship; imperative knowledge is a step-by-step procedure a machine can execute',
        'There is no real difference — they are two names for the same thing',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'What does the "L" in REPL stand for, and what does it mean in practice?',
      options: [
        'Language — the REPL only works for one specific programming language',
        'Loop — after printing a result, the REPL returns control to you and waits for the next expression',
        'Limit — the REPL stops after a fixed number of expressions',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'What does 2 + 3 * 4 evaluate to, and why?',
      options: [
        '20, because Python evaluates strictly left to right with no precedence rules',
        '14, because multiplication is evaluated before addition (PEMDAS)',
        'An error, because Python requires parentheses around every operation',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Why did the lesson use print() inside a cell that also demonstrated the "last expression is shown" rule?',
      options: [
        'print() is required for every expression in Python',
        'Because a cell only automatically displays its last expression — print() lets you display more than one value from a single cell',
        'It was a mistake; print() was not actually necessary',
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    'A program is imperative knowledge: a sequence of instructions a machine executes mechanically, with no understanding of what they "mean."',
    'Declarative knowledge states facts; imperative knowledge specifies steps. Programs are imperative.',
    'The REPL cycle — Read, Eval, Print, Loop — is the core interaction model for exploring code interactively.',
    'Python uses infix notation with standard PEMDAS precedence; parentheses override the default order.',
    '/ always produces a float. // floors the result. % gives the remainder. ** exponentiates.',
    'Only a notebook/REPL auto-displays a bare expression\'s value — a saved script needs print() to show anything.',
    '-2 ** 2 is -4: exponentiation binds tighter than unary minus.',
  ],

  checkpoints: ['read-intuition'],
}
