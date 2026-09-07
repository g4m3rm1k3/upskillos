// Guttag Ch.0 — Lesson 2: Types
//
// DEPENDENCY: Lesson 1 (What a Program Is) only.
//
// TEACHES:
//   Python's five fundamental scalar types: int, float, bool, str, None.
//   type() to inspect a value's type; int(), float(), str(), bool() to convert.
//   Arbitrary-precision integers; IEEE 754 float imprecision.
//   Truthy/falsy values; None as a singleton, checked with `is`.
//   String indexing, slicing, and f-string interpolation.
//   len() as a preview of sequences.
//
// DOES NOT TEACH (reserved for later):
//   Variables as a topic in their own right (Lesson 3) — a few are used here
//   only where unavoidable (naming a string before interpolating it).
//   Short-circuit evaluation of `and`/`or` (Lesson 4, Conditionals).
//   Lists, tuples, dicts (Module 1).

export default {
  id: 'gp-01-types',
  slug: 'types',
  chapter: 1,
  order: 2,
  title: 'Types',
  subtitle: 'int, float, bool, str, and None',
  tags: ['types', 'int', 'float', 'bool', 'str', 'none', 'conversion', 'truthy', 'falsy'],

  hook: {
    question: 'Why does 1 + "1" crash, but "1" + "1" doesn\'t?',
    realWorldContext:
      'Every value in Python carries a type — a category that determines which operations are legal on it ' +
      'and what those operations mean. A type is a contract between you and the runtime: it tells you what ' +
      'you can do with a value before you try it and find out the hard way. This lesson covers Python\'s five ' +
      'foundational scalar types and the built-in functions that inspect and convert between them.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'A **type** is a set of values plus the operations defined on them. `int` is the type of whole numbers, and it defines what `+`, `-`, `//` mean for those numbers. `str` is the type of text, and `+` means something completely different there — concatenation, not addition. The type of a value determines which operations make sense on it.',

      '`type()` is a built-in function that answers "what type is this value?" It is your primary tool for settling any confusion about what you are actually holding.',

      'Python has five foundational scalar types you will use constantly: **int** (whole numbers, arbitrary precision — no overflow, ever), **float** (decimal approximations, IEEE 754 double precision — meaning some numbers cannot be represented exactly), **bool** (`True`/`False`, technically a subtype of int where `True == 1`), **str** (immutable sequences of characters), and **None** (a singleton value representing the deliberate absence of a value, checked with `is`, never `==`).',

      'Every non-boolean value also has a **truthiness** — how it behaves when Python needs a `True`/`False` answer from it (in an `if`, for instance). Zero, empty strings, and empty collections are **falsy**; everything else is **truthy**. This will matter the moment you write your first conditional.',
    ],
    callouts: [
      {
        type: 'insight',
        title: 'A type is a contract, not a label',
        body: 'Saying "x is an int" is not just naming a category — it is a promise about what operations are valid and what they will do. 1 + "1" crashes because Python has no defined meaning for int + str. "1" + "1" works and gives "11" because str + str means concatenation.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 0.2 — int, float, bool, str, None',
        mathBridge: 'Run each cell, read the prose, and pay close attention to any output that surprises you — that is usually the point.',
        caption: 'Five types. One function (type()) to ask what something is.',
        props: {
          initialCells: [

            // ── CELL 1: int ─────────────────────────────────────────────────
            {
              id: 1,
              cellTitle: 'int — whole numbers, no overflow',
              prose: 'An integer is any whole number. Python integers have **arbitrary precision**: they can grow as large as your computer\'s memory allows, with no fixed bit-width to overflow.',
              instructions: 'Run this cell and notice the exact, 31-digit answer — no approximation, no scientific notation.',
              code: 'print(type(42))\nprint(2 ** 100)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 2: float imprecision ──────────────────────────────────
            {
              id: 2,
              cellTitle: 'float — approximations of real numbers',
              prose: 'A float has a decimal point. Floats are stored in **IEEE 754 double precision** binary, which cannot represent every decimal fraction exactly — the same way 1/3 has no finite decimal representation in base 10.',
              instructions: 'Run this cell. `0.1 + 0.2` will NOT print `0.3`. This is not a bug — it is how binary floating-point works, and it matters in every language, not just Python.',
              code: 'print(type(3.14))\nprint(0.1 + 0.2)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 3: bool ────────────────────────────────────────────────
            {
              id: 3,
              cellTitle: 'bool — True, False, and their secret identity',
              prose: 'A boolean has exactly two values: `True` or `False`. Under the hood, `bool` is a subtype of `int` — `True` really is `1`, and `False` really is `0`.',
              instructions: 'Run this cell. Notice that True == 1 is True — booleans participate in arithmetic and comparison just like the integers they secretly are.',
              code: 'print(type(True))\nprint(True == 1)\nprint(True + True + True)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 4: truthy / falsy ─────────────────────────────────────
            {
              id: 4,
              cellTitle: 'Truthy and falsy — bool() on non-booleans',
              prose: 'Calling `bool()` on any value tells you how Python would treat it in a yes/no context. Zero, empty strings, and empty collections are **falsy**. Nearly everything else is **truthy**.',
              instructions: 'Run this cell. Which of these surprises you?',
              code: 'print(bool(0))\nprint(bool(1))\nprint(bool(""))\nprint(bool("text"))\nprint(bool([]))',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 5: str, indexing and slicing ──────────────────────────
            {
              id: 5,
              cellTitle: 'str — indexed, sliceable, immutable text',
              prose: 'A string is a sequence of characters. Each character has a position (starting at index 0), and you can pull out one character with `s[i]` or a range with `s[i:j]` (up to, but not including, `j`).',
              instructions: 'Run this cell. s[0] is one character; s[1:3] is a two-character slice.',
              code: 's = "word"\nprint(type(s))\nprint(s[0])\nprint(s[1:3])',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 6: f-strings ───────────────────────────────────────────
            {
              id: 6,
              cellTitle: 'f-strings — building text out of values',
              prose: 'An **f-string** (a string literal prefixed with `f`) lets you embed any expression directly inside `{}` and Python substitutes its value. This is the standard way to combine text and data.',
              code: 'greeting = "Hello"\ntarget = "World"\nprint(f"{greeting}, {target}!")',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 7: string immutability ─────────────────────────────────
            {
              id: 7,
              cellTitle: 'Strings cannot be changed in place',
              prose: 'Strings are **immutable**: once created, a string object never changes. `+` on strings does not modify either original string — it builds and returns a brand-new one.',
              instructions: 'Run this cell. s stays "word" throughout — a new string is produced and printed, but s itself never changes.',
              code: 's = "word"\nprint(s + "!")\nprint(s)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 8: None ────────────────────────────────────────────────
            {
              id: 8,
              cellTitle: 'None — the absence of a value, and a singleton',
              prose: '`None` represents "nothing" — not zero, not an empty string, not `False`. It is its own type, and there is only ever one `None` object in an entire running program (a **singleton**), which is why you check for it with `is`, not `==`.',
              code: 'x = None\nprint(type(x))\nprint(x is None)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 9: conversions ─────────────────────────────────────────
            {
              id: 9,
              cellTitle: 'Converting between types',
              prose: '`int()`, `float()`, `str()`, and `bool()` are constructors that convert a value from one type to another where a reasonable conversion exists.',
              instructions: 'Run this cell and check each conversion against what you expect.',
              code: 'print(int("42"))\nprint(float(42))\nprint(str(42))\nprint(int(3.9))',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 10: len() preview ───────────────────────────────────────
            {
              id: 10,
              cellTitle: 'len() — a first look at a sequence function',
              prose: '`len()` counts the number of characters in a string (and, later, the number of items in any sequence). It is a small preview of the sequence types you will meet in Module 1.',
              code: 'len("Hello, World!")',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CHALLENGE 1 ──────────────────────────────────────────────────
            {
              id: 21,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Trace a Type Conversion Chain',
              difficulty: 'medium',
              prompt: 'Step through this expression on paper first: `type("10" + str(5 * 2))`.\n1. `5 * 2` → ? (what type?)\n2. `str(...)` of that → ? (what type?)\n3. `"10" + ...` → ? (what type?)\n4. `type(...)` of that → ?\n\nThen write and run the expression to check your reasoning.',
              instructions: 'Your cell output should be <class \'str\'>.',
              code: 'type("10" + str(5 * 2))',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == str:
    res = "SUCCESS: 5*2 is 10 (int), str(10) is '10' (str), '10'+'10' is '1010' (str concatenation), and type('1010') is str."
else:
    res = "ERROR: Expected <class 'str'>. Trace it again: 5*2=10, str(10)='10', '10'+'10'='1010', type('1010')=str."
res
`,
              hint: 'str() converts any value to its string form. Once both sides of + are strings, + means concatenation, not addition.',
            },

            // ── CHALLENGE 2 ──────────────────────────────────────────────────
            {
              id: 22,
              challengeType: 'write',
              challengeNumber: 2,
              challengeTitle: 'None Is Not Zero',
              difficulty: 'easy',
              prompt: 'Write an expression using `is` (not `==`) that checks whether the variable `y`, defined below, is None. `y` has already been assigned for you.',
              instructions: 'Add one line below the assignment that evaluates to True or False using `is`.',
              code: 'y = None\ny is None',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result is True:
    res = "SUCCESS: y is None evaluates to True. is checks identity against the None singleton, which == would do too here, but is is the idiomatic and reliable choice."
else:
    res = "ERROR: Expected True. Make sure your last line is exactly 'y is None'."
res
`,
              hint: 'y is None — no parentheses, no quotes around None.',
            },

            // ── CHALLENGE 3 ──────────────────────────────────────────────────
            {
              id: 23,
              challengeType: 'write',
              challengeNumber: 3,
              challengeTitle: 'Falsy or Truthy?',
              difficulty: 'easy',
              prompt: 'Without running anything yet, predict: is `bool(0.0)` truthy or falsy? Is `bool(" ")` (a string containing one space) truthy or falsy? Then write an expression that prints both, one per line, to check your predictions.',
              instructions: 'Use two print() calls. Expected output: False then True — a single space is NOT an empty string.',
              code: 'print(bool(0.0))\nprint(bool(" "))',
              output: '', status: 'idle', figureJson: null,
              testCode: `
import io, contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print(bool(0.0))
    print(bool(" "))
expected = buf.getvalue().strip()
if expected == "False\\nTrue":
    res = "SUCCESS: 0.0 is falsy (it's numerically zero), but ' ' is truthy — it's a non-empty string, even though it looks blank."
else:
    res = "ERROR: reference computation mismatch, but your own cell should print False then True."
res
`,
              hint: 'Only genuinely empty things (0, 0.0, "", [], {}, None, False) are falsy. A string with a single space character is not empty.',
            },

          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      '**Arbitrary precision vs. fixed-width**: Python\'s int has no size limit, unlike C\'s `int` or Java\'s `int` (both 32-bit, both capable of silently overflowing). This costs some performance on very large numbers but eliminates an entire class of overflow bugs.',

      '**IEEE 754 double precision**: Python floats use the same 64-bit binary floating-point representation as almost every other mainstream language. Because binary cannot exactly represent most decimal fractions, floating-point arithmetic is inherently approximate — never compare floats with `==` when you mean "close enough."',

      '**bool is a subclass of int**: `isinstance(True, int)` is `True`. This is why `True + True` is a valid expression that evaluates to `2`, and why `sum([True, False, True])` (counting how many are True) is a common, intentional idiom.',

      '**Sentinel values**: `None` is Python\'s standard sentinel — a specific, recognizable value used to mean "nothing here" or "not yet computed," distinct from any real data value like `0` or `""`.',
    ],
    callouts: [
      {
        type: 'warning',
        title: 'Never compare floats with ==',
        body: 'Because of floating-point imprecision, 0.1 + 0.2 == 0.3 is False. To compare floats safely, check whether the difference is smaller than a small tolerance, e.g. abs(a - b) < 1e-9.',
      },
    ],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If an operation raises a TypeError, run type() on each operand first — mismatched types are the single most common cause.',
      'If a float comparison behaves strangely, suspect floating-point imprecision before suspecting your logic.',
      'If you wrote `x == None` and it "mostly works" but feels wrong, switch it to `x is None` — it is the correct idiom and avoids subtle edge cases.',
    ],
    futureLinks: [
      'Next lesson: Variables — how a name gets bound to a value, and what happens when two names refer to the same object.',
      'Truthy/falsy values come back immediately in Lesson 4 (Conditionals), where they control branching directly.',
      'Strings get a much deeper treatment once Module 1 covers sequences in full.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Why does 1 + "1" raise a TypeError while "1" + "1" does not?',
      options: [
        'It is a bug in Python that will eventually be fixed',
        'Python has no defined meaning for int + str, but str + str is defined as concatenation',
        '"1" + "1" actually also raises an error, just a different one',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'What does bool(True) is a subclass of int actually let you do?',
      options: [
        'Nothing practical — it is just a curiosity',
        'Use booleans directly in arithmetic, e.g. True + True + True evaluates to 3',
        'Convert any integer into a boolean automatically everywhere',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Why should you check for None with `is` instead of `==`?',
      options: [
        '`==` would raise an error when compared to None',
        'None is a singleton — there is exactly one None object — and `is` checks identity, which is the correct and idiomatic check',
        'There is no real difference; both are equally correct in every case',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these is falsy in Python?',
      options: ['The string " " (a single space)', 'The integer -1', 'The empty list []'],
      correct: 2,
    },
  ],

  mentalModel: [
    'A type is a set of values plus the operations defined on them — it is a contract, not just a label.',
    'Five foundational scalar types: int, float, bool, str, None.',
    'int has arbitrary precision — no overflow. float is a binary approximation — expect small imprecision.',
    'bool is secretly a subtype of int: True == 1, False == 0.',
    'Falsy values: 0, 0.0, "", [], {}, None, False. Everything else is truthy.',
    'Strings are immutable — every "modification" produces a new string.',
    'None is a singleton representing absence — always check it with `is`, never `==`.',
    'int(), float(), str(), bool() convert between types where a sensible conversion exists.',
  ],

  checkpoints: ['read-intuition'],
}
