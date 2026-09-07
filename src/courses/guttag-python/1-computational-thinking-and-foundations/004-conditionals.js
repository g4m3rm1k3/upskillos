// Guttag Ch.0 — Lesson 4: Conditionals
//
// DEPENDENCY: Lessons 1-3 (Program, Types, Variables).
//
// TEACHES:
//   if / elif / else branching.
//   Comparison operators (==, !=, <, >, <=, >=), including chaining.
//   and / or / not, and short-circuit evaluation.
//   Truthy/falsy values used directly as conditions.
//   The conditional (ternary) expression.
//
// DOES NOT TEACH (reserved for later):
//   Loops (Lesson 5).
//   match/case pattern matching (not part of this curriculum's scope here).

export default {
  id: 'gp-03-conditionals',
  slug: 'conditionals',
  chapter: 1,
  order: 4,
  title: 'Conditionals',
  subtitle: 'if, elif, else, and the logic that drives them',
  tags: ['conditionals', 'if', 'elif', 'else', 'comparison', 'boolean-operators', 'short-circuit', 'ternary'],

  hook: {
    question: 'How does a program make a decision?',
    realWorldContext:
      'Every interesting program eventually needs to do different things depending on its input: reject an ' +
      'invalid password, choose a shipping rate, decide whether a game is over. A conditional is the ' +
      'mechanism for that decision — it takes a continuum of possible inputs and reduces them to a discrete ' +
      'set of outcomes. The shape of your conditions determines the shape of your program\'s behavior.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'An **if statement** runs a block of code only when its condition evaluates to something truthy. **elif** ("else if") lets you check additional, mutually exclusive conditions without nesting. **else** catches everything not matched by the preceding branches. Python checks conditions top to bottom and executes only the first block whose condition is true.',

      '**Comparison operators** — `==`, `!=`, `<`, `>`, `<=`, `>=` — produce booleans. Python allows you to **chain** them the way mathematical notation does: `0 <= n <= 100` means exactly what it looks like, and is equivalent to `0 <= n and n <= 100`.',

      '**and**, **or**, and **not** combine boolean expressions. Both `and` and `or` **short-circuit**: `and` stops and returns the first falsy value without evaluating the rest; `or` stops and returns the first truthy value without evaluating the rest. This is not just an optimization — it is a safety mechanism, letting you guard an unsafe operation (like dividing by a value that might be zero) on the right-hand side.',

      'Because any value has a truthiness, you rarely need to write `if x == True:` or `if len(lst) > 0:` — Python idiom is to write `if x:` or `if lst:` directly, letting truthy/falsy do the work. Finally, the **conditional expression** (`value_if_true if condition else value_if_false`) packs a simple if/else into one expression, useful for compact assignments.',
    ],
    callouts: [
      {
        type: 'insight',
        title: 'Short-circuiting is a guard, not just a shortcut',
        body: 'In `n is not None and n > 0`, if n is None, Python never evaluates `n > 0` — it short-circuits on the first falsy operand. This lets you safely guard risky operations: `denominator != 0 and total / denominator > 1` never divides by zero, because `and` stops before reaching the division when the left side is False.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 0.4 — Branching and Boolean Logic',
        mathBridge: 'Predict the output of each cell before running it — conditionals reward exact tracing, not guessing.',
        caption: 'A conditional reduces a continuum of inputs into a discrete set of outcomes.',
        props: {
          initialCells: [

            // ── CELL 1: if / elif / else ────────────────────────────────────
            {
              id: 1,
              cellTitle: 'if / elif / else — the basic branch',
              prose: 'Python checks `n > 0` first; if that is False it checks `n < 0`; if that is also False it falls through to `else`. Only ONE branch ever runs.',
              instructions: 'Predict the output, then run.',
              code: 'n = 5\nif n > 0:\n    print("positive")\nelif n < 0:\n    print("negative")\nelse:\n    print("zero")',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 2: Comparison chaining ──────────────────────────────────
            {
              id: 2,
              cellTitle: 'Chained comparisons',
              prose: 'Python lets you chain comparisons the way math notation does. `0 <= n <= 100` reads naturally and means exactly what it looks like.',
              code: 'n = 50\nprint(0 <= n <= 100)\nprint("apple" < "banana")',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 3: Short-circuit and ──────────────────────────────────
            {
              id: 3,
              cellTitle: 'and short-circuits on the first falsy value',
              prose: '`0 and (1/0)` never evaluates `1/0` — `and` sees the falsy `0` on the left and stops immediately, returning `0` without ever touching the division.',
              instructions: 'Run this cell. Notice there is no ZeroDivisionError — the right side never executes.',
              code: 'print(0 and 1/0)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 4: Short-circuit or ────────────────────────────────────
            {
              id: 4,
              cellTitle: 'or short-circuits on the first truthy value',
              prose: 'Symmetrically, `1 or (1/0)` never evaluates `1/0` — `or` sees the truthy `1` and stops, returning `1`.',
              code: 'print(1 or 1/0)\nprint(not 0)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 5: Guarding with short-circuit ───────────────────────────
            {
              id: 5,
              cellTitle: 'Using short-circuit as a safety guard',
              prose: '`n is not None and n > 0` never evaluates `n > 0` if `n` is `None` — this pattern safely checks a value before using it, with no risk of comparing None to a number.',
              code: 'n = None\nprint(n is not None and n > 0)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 6: Truthy values as conditions directly ────────────────
            {
              id: 6,
              cellTitle: 'Using truthiness directly',
              prose: 'Idiomatic Python checks `if lst:` rather than `if len(lst) > 0:` — an empty list is already falsy, so there is no need to spell out the length check.',
              code: 'items = []\nif items:\n    print("has items")\nelse:\n    print("empty")',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 7: Ternary expression ───────────────────────────────────
            {
              id: 7,
              cellTitle: 'The conditional (ternary) expression',
              prose: 'A conditional expression packs a full if/else into a single line: `value_if_true if condition else value_if_false`. Useful for short, simple assignments.',
              code: 'n = 4\nlabel = "even" if n % 2 == 0 else "odd"\nprint(label)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CHALLENGE 1 ────────────────────────────────────────────────────
            {
              id: 21,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Write classify()',
              difficulty: 'easy',
              prompt: 'Define a function-free classification using only what you know so far: given the variable `score = 72`, print "pass" if score >= 60, otherwise print "fail". Use a plain if/else — no functions yet.',
              instructions: 'Your cell should print exactly: pass',
              code: 'score = 72\nif score >= 60:\n    print("pass")\nelse:\n    print("fail")',
              output: '', status: 'idle', figureJson: null,
              testCode: `
import io, contextlib
buf = io.StringIO()
score = 72
with contextlib.redirect_stdout(buf):
    if score >= 60:
        print("pass")
    else:
        print("fail")
expected = buf.getvalue().strip()
if expected == "pass":
    res = "SUCCESS: 72 >= 60, so the pass branch runs. Compare this to your own cell's output."
else:
    res = "ERROR: reference mismatch — but your cell should print exactly 'pass' for score = 72."
res
`,
              hint: 'if score >= 60: print("pass") else: print("fail")',
            },

            // ── CHALLENGE 2 ────────────────────────────────────────────────────
            {
              id: 22,
              challengeType: 'write',
              challengeNumber: 2,
              challengeTitle: 'Guard a Division Safely',
              difficulty: 'medium',
              prompt: 'Write a single boolean expression using short-circuit `and` that checks whether `denominator` is not zero AND `numerator / denominator` is greater than 2 — WITHOUT ever raising a ZeroDivisionError when denominator is 0. Test it with denominator = 0.',
              instructions: 'denominator is 0 in the starter code — your expression must evaluate to False without crashing.',
              code: 'numerator = 10\ndenominator = 0\ndenominator != 0 and numerator / denominator > 2',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result is False:
    res = "SUCCESS: denominator != 0 is False, so 'and' short-circuits and never evaluates the division — no crash."
else:
    res = "ERROR: Expected False with no exception raised. Make sure the zero-check comes FIRST, before the division."
res
`,
              hint: 'Put the safe check first: denominator != 0 and numerator / denominator > 2. If the left side is False, and never touches the right side.',
            },

            // ── CHALLENGE 3 ────────────────────────────────────────────────────
            {
              id: 23,
              challengeType: 'write',
              challengeNumber: 3,
              challengeTitle: 'One-Line Parity Label',
              difficulty: 'medium',
              prompt: 'Using a single conditional (ternary) expression, produce the string "odd" or "even" for n = 17, without writing an if/else block.',
              instructions: 'Your cell should end with a ternary expression that evaluates to "odd".',
              code: 'n = 17\n"even" if n % 2 == 0 else "odd"',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == "odd":
    res = "SUCCESS: 17 % 2 is 1 (truthy... wait, it's compared to 0), so the condition n % 2 == 0 is False, giving 'odd'."
else:
    res = f"ERROR: Expected 'odd', got {result!r}. Use: \\"even\\" if n % 2 == 0 else \\"odd\\""
res
`,
              hint: '"even" if n % 2 == 0 else "odd" — for n = 17, n % 2 is 1, so the condition is False and "odd" is produced.',
            },

          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      '**Operator precedence among booleans**: `not` binds tighter than `and`, which binds tighter than `or`. `not a and b` means `(not a) and b`, not `not (a and b)`. When in doubt, use parentheses to make your intent explicit rather than relying on memorized precedence.',

      '**and/or return operands, not just True/False**: `1 or 2` evaluates to `1` (the first truthy operand), not `True`. This is exploited in idioms like `value = user_input or "default"`, which returns `user_input` if it is truthy, otherwise falls back to `"default"`.',

      '**Cyclomatic complexity**: every additional `elif` or nested `if` adds a path through your code that must be tested and reasoned about. Flattening logic (early returns, guard clauses) is generally preferred over deep nesting once functions are introduced.',
    ],
    callouts: [
      {
        type: 'warning',
        title: 'elif is not the same as a separate if',
        body: 'A chain of elif only ever runs ONE branch — the first true one. A sequence of separate, independent if statements checks every single condition regardless of the others. Using separate ifs where you meant elif is a common source of bugs where multiple "unrelated" branches fire together.',
      },
    ],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If a branch you expected to run did not, check whether an earlier elif already matched — only the first true branch in a chain executes.',
      'If a short-circuit expression seems to skip something you needed, remember the right-hand side never runs at all once the left side determines the result.',
      'If precedence between not/and/or feels ambiguous, add parentheses — they cost nothing and remove all doubt.',
    ],
    futureLinks: [
      'Next lesson: Iteration — while and for. Loops are conditionals applied repeatedly.',
      'Guard clauses (short-circuiting on invalid input, returning early) become a core style choice once functions are introduced in Lesson 6.',
      'Truthy/falsy values return in Module 1 when checking whether a list, dict, or string is empty.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'A value of n hits the first elif branch in an if/elif/elif/else chain. What happens next?',
      options: [
        'Python also checks the remaining elif and else branches, just in case',
        'That branch runs, and Python skips every remaining elif/else in the chain',
        'All matching branches run in order',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'What does `0 and 1/0` evaluate to, and why?',
      options: [
        'It raises ZeroDivisionError, because both sides of and are always evaluated',
        '0, because and short-circuits on the first falsy operand and never evaluates 1/0',
        '0.0, because Python converts the result to a float',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Why is `if lst:` generally preferred over `if len(lst) > 0:`?',
      options: [
        'len() does not work on all sequence types',
        'An empty list is already falsy, so checking truthiness directly is more idiomatic and equally correct',
        'They are not equivalent — if lst: checks something different',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'What does the conditional expression `"odd" if n % 2 else "even"` rely on to work correctly?',
      options: [
        'n % 2 must always be exactly True or False',
        'n % 2 is 0 (falsy) for even numbers and 1 (truthy) for odd numbers, so the truthiness of the expression itself acts as the condition',
        'It is invalid syntax — conditional expressions require a comparison operator',
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    'if/elif/else runs at most ONE branch — the first whose condition is true, checked top to bottom.',
    'Comparisons (==, !=, <, >, <=, >=) can be chained: 0 <= n <= 100 works exactly like it looks.',
    'and short-circuits on the first falsy value; or short-circuits on the first truthy value — the other side may never execute.',
    'and/or return one of their actual operands, not just True/False.',
    'Idiomatic Python uses truthiness directly: if x: instead of if x == True: or if len(x) > 0:.',
    'A conditional (ternary) expression packs if/else into one expression: a if condition else b.',
    'not binds tighter than and, which binds tighter than or — parenthesize when in doubt.',
  ],

  checkpoints: ['read-intuition'],
}
