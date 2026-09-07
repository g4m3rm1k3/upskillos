// Guttag Ch.0 — Lesson 6: Functions
//
// DEPENDENCY: Lessons 1-5 (Program, Types, Variables, Conditionals, Iteration).
//
// TEACHES:
//   def, parameters vs. arguments, positional vs. keyword arguments, defaults.
//   return, including multiple return values (packed as a tuple).
//   Scope and the LEGB rule (Local, Enclosing, Global, Built-in).
//   Functions as first-class objects; docstrings.
//
// DOES NOT TEACH (reserved for later):
//   *args / **kwargs, closures, decorators (Module 2-3).
//   Classes and methods (Module 3).

export default {
  id: 'gp-05-functions',
  slug: 'functions',
  chapter: 1,
  order: 6,
  title: 'Functions',
  subtitle: 'def, parameters, return, and scope',
  tags: ['functions', 'def', 'parameters', 'arguments', 'return', 'scope', 'legb'],

  hook: {
    question: 'What do you actually gain by wrapping code in a function, beyond not retyping it?',
    realWorldContext:
      'A function is Python\'s unit of abstraction: it names a computation, so you and everyone reading your ' +
      'code can think about WHAT it does instead of HOW every time it is used. It takes inputs (parameters), ' +
      'does work, and produces an output (a return value) — and everything that happens inside stays inside, ' +
      'invisible to the rest of the program unless it is explicitly returned. This lesson closes Module 0 by ' +
      'tying together everything before it: values, variables, conditionals, and loops now live inside ' +
      'reusable, named units.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'A **function** is defined with `def`, a name, a parenthesized list of **parameters**, and an indented body. Calling the function supplies **arguments** — the actual values matched to those parameters. Arguments can be matched **positionally** (by order) or by **keyword** (`name=value`, order-independent) — you can mix both in one call as long as positional arguments come first.',

      'A parameter can have a **default value** (`def greet(name, punctuation="!")`), used automatically whenever the caller omits that argument. This lets you make the common case easy to call while still allowing customization.',

      '`return` immediately ends the function call and sends a value back to the caller. A function with no explicit `return` implicitly returns `None`. Writing `return a, b` returns TWO values at once — Python silently packs them into a tuple, which the caller can unpack: `x, y = calculate_stats(3, 4)`.',

      'Every function call creates a new **local scope** — a fresh namespace for that call\'s parameters and any variables it creates. Name lookup follows the **LEGB rule**: Local scope first, then any Enclosing function scope, then Global (module-level) scope, then Built-in names (like `len` or `print`). A name assigned inside a function is local to that call by default and never leaks out, which is exactly why calling a function repeatedly does not accidentally corrupt state elsewhere in your program.',
    ],
    callouts: [
      {
        type: 'important',
        title: 'A function is data too',
        body: 'In Python, a function is a first-class object: it can be assigned to a variable, passed as an argument, stored in a list, and returned from another function, all without calling it. `operation = calculate_stats` assigns the function itself (not its result) to a new name — notice the missing parentheses.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 0.6 — def, Parameters, and Scope',
        mathBridge: 'For every function call, ask three questions: what goes in, what happens inside, what comes out?',
        caption: 'A function names a computation: inputs in, work happens, an output comes back.',
        props: {
          initialCells: [

            // ── CELL 1: def and return ────────────────────────────────────────
            {
              id: 1,
              cellTitle: 'def and return — the basic shape',
              prose: '`def` creates a function object and binds it to a name. Calling it with `()` executes the body; `return` sends a value back to the caller.',
              code: 'def get_greeting():\n    return "Hello, World!"\n\nresult = get_greeting()\nprint(result)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 2: parameters and positional args ──────────────────────
            {
              id: 2,
              cellTitle: 'Parameters make a function flexible',
              prose: 'Parameters are placeholders filled in by whatever arguments the caller supplies. Positional arguments are matched left to right.',
              code: 'def add(a, b):\n    return a + b\n\nprint(add(3, 4))',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 3: defaults and keyword arguments ────────────────────────
            {
              id: 3,
              cellTitle: 'Default values and keyword arguments',
              prose: 'A default value is used automatically when the caller omits that argument. Keyword arguments can be supplied in any order by naming the parameter explicitly.',
              code: 'def greet(name, punctuation="!"):\n    return "Hello, " + name + punctuation\n\nprint(greet("Alice"))\nprint(greet(punctuation=".", name="Bob"))',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 4: multiple return values ─────────────────────────────────
            {
              id: 4,
              cellTitle: 'Returning more than one value',
              prose: '`return a, b` packs both values into a tuple. The caller can unpack that tuple directly into two names.',
              code: 'def sum_and_diff(x, y):\n    return x + y, x - y\n\ns, d = sum_and_diff(10, 3)\nprint(s)\nprint(d)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 5: local scope ────────────────────────────────────────────
            {
              id: 5,
              cellTitle: 'Local scope — assignment inside a function stays inside',
              prose: 'A name assigned inside a function is local by default, even if a name with the same spelling exists at module level. Assigning to `x` inside `print_x` never touches the global `x`.',
              code: 'x = 10\n\ndef print_x():\n    x = 5\n    print(x)\n\nprint_x()\nprint(x)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 6: LEGB — reading an outer name ────────────────────────────
            {
              id: 6,
              cellTitle: 'LEGB — reading (not assigning) reaches outward',
              prose: 'Reading a name that is not local falls back to enclosing, then global scope. `multiplier` is not a parameter or local variable of `multiply_and_add`, so Python looks it up at module (global) level.',
              code: 'multiplier = 2\n\ndef multiply_and_add(a, b):\n    product = a * multiplier\n    return product + b\n\nprint(multiply_and_add(3, 4))',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 7: functions are objects ───────────────────────────────────
            {
              id: 7,
              cellTitle: 'A function is a first-class object',
              prose: 'A function can be assigned to another name — without calling it, so no parentheses — and passed around like any other value.',
              code: 'def calculate_stats(a, b):\n    return a + b, a * b\n\noperation = calculate_stats\nprint(type(operation))\nprint(operation(3, 4))',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 8: docstrings ───────────────────────────────────────────
            {
              id: 8,
              cellTitle: 'Docstrings — documentation attached to the function',
              prose: 'A string literal as the very first statement in a function body becomes its `__doc__` — retrievable later without reading the source.',
              code: 'def my_func():\n    """This function does nothing but has a docstring."""\n    pass\n\nprint(my_func.__doc__)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CHALLENGE 1 ──────────────────────────────────────────────────
            {
              id: 21,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Write is_valid_score()',
              difficulty: 'easy',
              prompt: 'Define a function `is_valid_score(score)` that returns True if score is between 0 and 100 inclusive, and False otherwise. Then call it with 85 and end the cell with that call so its result is shown.',
              instructions: 'is_valid_score(85) should evaluate to True.',
              code: 'def is_valid_score(score):\n    return 0 <= score <= 100\n\nis_valid_score(85)',
              output: '', status: 'idle', figureJson: null,
              testCode: `
def is_valid_score(score):
    return 0 <= score <= 100
result = _
if result is True and is_valid_score(85) is True and is_valid_score(150) is False:
    res = "SUCCESS: is_valid_score correctly uses the chained comparison 0 <= score <= 100."
else:
    res = "ERROR: Expected is_valid_score(85) to be True. Check your comparison and return statement."
res
`,
              hint: 'return 0 <= score <= 100 — one chained comparison, no if/else needed.',
            },

            // ── CHALLENGE 2 ──────────────────────────────────────────────────
            {
              id: 22,
              challengeType: 'write',
              challengeNumber: 2,
              challengeTitle: 'A Function with a Default Argument',
              difficulty: 'medium',
              prompt: 'Define `power(base, exponent=2)` that returns base raised to exponent, defaulting to squaring when exponent is omitted. Call it twice: once as power(5) and once as power(2, 10). End the cell with a tuple of both results: (power(5), power(2, 10)).',
              instructions: 'Expected output: (25, 1024)',
              code: 'def power(base, exponent=2):\n    return base ** exponent\n\n(power(5), power(2, 10))',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == (25, 1024):
    res = "SUCCESS: power(5) uses the default exponent=2 to give 25; power(2, 10) overrides it to give 1024."
else:
    res = f"ERROR: Expected (25, 1024), got {result}. Check your default value and the ** operator."
res
`,
              hint: 'def power(base, exponent=2): return base ** exponent',
            },

            // ── CHALLENGE 3 ──────────────────────────────────────────────────
            {
              id: 23,
              challengeType: 'write',
              challengeNumber: 3,
              challengeTitle: 'Scope: Predict Before You Run',
              difficulty: 'hard',
              prompt: 'Trace this by hand first: a global `count = 0`. A function `bump()` sets a LOCAL `count = count_param + 1` (it takes count_param as a parameter, does not touch the global) and returns it. Call `bump(count)` three times without ever reassigning the global `count`, and confirm the global stays 0. End the cell with the bare name `count`.',
              instructions: 'Because bump never reassigns the global count, count should still be 0 after all three calls.',
              code: 'count = 0\n\ndef bump(count_param):\n    local_count = count_param + 1\n    return local_count\n\nbump(count)\nbump(count)\nbump(count)\ncount',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == 0:
    res = "SUCCESS: the global count was never reassigned — bump() only ever worked with its own local_count, built fresh from the parameter on every call."
else:
    res = f"ERROR: Expected count to still be 0, got {result}. Make sure bump() never does 'count = ...' at module level."
res
`,
              hint: 'bump() only computes and returns a new local value — it never does count = something at the global level, so the global count is untouched.',
            },

          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      '**Abstraction as the core value**: a function lets a caller depend on WHAT it does (its interface — name, parameters, return value) without needing to know HOW it does it (its implementation). This is the foundation every later abstraction (classes, modules, APIs) builds on.',

      '**LEGB in full**: Local (the current function call), Enclosing (any function this one is nested inside — relevant once closures are introduced), Global (module level), Built-in (names like `len`, `print`, `range` that are always available). Python searches in exactly that order and uses the first match.',

      '**The `global` keyword** (previewed, not required yet): to REASSIGN a global variable from inside a function, you must explicitly declare `global name` first — otherwise assignment always creates a new local variable, even if a global with the same name exists. Reading a global (without assigning to it) never requires this declaration.',
    ],
    callouts: [
      {
        type: 'warning',
        title: 'Assigning inside a function is local by default — always',
        body: 'If a function contains ANY assignment to a name (even after a read of that name earlier in the function), Python treats that name as local for the ENTIRE function body — which can turn an innocent-looking read before the assignment into an UnboundLocalError. This is a well-known Python gotcha worth remembering once you start mixing reads and writes of an outer name inside a function.',
      },
    ],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If a function seems to "not see" a change you expected, check whether you actually reassigned a local copy instead of the object you meant to mutate.',
      'If you get an UnboundLocalError on a name you thought was global, check whether the function assigns to that name anywhere — any assignment makes it local for the whole function body.',
      'If you are unsure whether an argument was matched positionally or by keyword, rewrite the call using explicit keyword arguments for clarity.',
    ],
    futureLinks: [
      'This closes Module 0. Module 1 begins with Strings in depth, then moves through lists, tuples, dicts, and sets — the core data structures every non-trivial Python program is built from.',
      '*args and **kwargs (variable numbers of arguments) and closures are covered once Module 2 revisits functions in depth.',
      'Classes (Module 3) will reframe "a function bound to data" as a method — the same call mechanics you just learned, with self added.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'What happens if a function has no explicit return statement?',
      options: [
        'Python raises a SyntaxError at definition time',
        'It implicitly returns None',
        'It returns the value of the last expression evaluated inside it, even without return',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'What does `return a, b` actually return?',
      options: [
        'Only a — b is discarded',
        'A single tuple (a, b), which the caller can unpack into two names',
        'It is a SyntaxError to return two values',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A global variable x = 10 exists. A function does x = 5 inside its body, with no `global` declaration. What happens to the global x after the function returns?',
      options: [
        'The global x becomes 5',
        'The global x remains 10 — the assignment created a new local x that shadowed it and disappeared when the function returned',
        'Python raises an error because x already exists globally',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'What does it mean that functions are "first-class objects" in Python?',
      options: [
        'Functions run faster than other code',
        'A function can be assigned to a variable, passed as an argument, and returned from another function, just like any other value',
        'Only built-in functions like print() and len() are first-class; user-defined functions are not',
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    'def creates a function object and binds it to a name; calling it with () executes the body.',
    'Parameters are placeholders; arguments are the actual values supplied, matched positionally or by keyword.',
    'A default value (param=value) is used only when the caller omits that argument.',
    'return exits immediately and sends a value back; no return means the function returns None.',
    'return a, b packs multiple values into a tuple, unpackable at the call site.',
    'Every call creates a fresh local scope. Name lookup follows LEGB: Local, Enclosing, Global, Built-in.',
    'Any assignment to a name anywhere in a function makes that name local for the WHOLE function body.',
    'Functions are first-class objects — assignable, passable, returnable, just like any other value.',
  ],

  checkpoints: ['read-intuition'],
}
