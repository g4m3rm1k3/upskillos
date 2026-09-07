// Guttag Ch.0 — Lesson 3: Variables, Assignment, and Names
//
// DEPENDENCY: Lessons 1-2 (What a Program Is, Types).
//
// TEACHES:
//   A variable is a NAME bound to an OBJECT, not a container that holds a value.
//   Assignment binds a name; rebinding changes what a name points to.
//   Aliasing — two names referring to the same mutable object — and why
//   mutation through one alias is visible through the other.
//   += behaves differently on immutable vs. mutable objects.
//   Naming conventions: snake_case, UPPER_SNAKE for constants, leading underscore.
//
// DOES NOT TEACH (reserved for later):
//   Lists/dicts as data structures in depth (Module 1) — used minimally here
//   only to demonstrate aliasing, since immutable types can't show it.
//   Function parameter passing and scope (Lesson 6).

export default {
  id: 'gp-02-variables',
  slug: 'variables',
  chapter: 1,
  order: 3,
  title: 'Variables, Assignment, and Names',
  subtitle: 'Names are bound to objects — they are not boxes',
  tags: ['variables', 'assignment', 'binding', 'aliasing', 'mutability', 'identity'],

  hook: {
    question: 'If a = b, and then a = 99, does b change too?',
    realWorldContext:
      'Almost every beginner pictures a variable as a labeled box that holds a value. That picture is wrong, ' +
      'and it will eventually cause a bug you cannot explain. Python\'s actual model is: a variable is a NAME, ' +
      'and assignment BINDS that name to an OBJECT living somewhere in memory. Once you see variables this way, ' +
      'an entire category of "impossible" bugs — mutating something you never meant to touch — becomes ' +
      'completely predictable.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'When you write `x = 42`, Python does not put `42` "inside" `x`. It creates the integer object `42` (or finds an existing one) and makes the name `x` refer to it. This is **binding**, and `id()` — a built-in function returning an object\'s unique identity — can prove it: two names bound to the same object return the same `id()`.',

      'Assigning to a name that already exists does not modify the old object — it **rebinds** the name to point at a new object entirely. `x = 1; x = 2` does not turn the object `1` into `2`; it abandons `1` (which Python will eventually garbage-collect if nothing else references it) and points `x` at a freshly created `2`.',

      'This distinction becomes visible the moment two names point at the *same* mutable object — called **aliasing**. `b = a` does not copy the list `a` refers to; it makes `b` refer to that exact same list. Mutate it through `b`, and `a` sees the change too, because there was only ever one list, referenced by two names.',

      'This is why `+=` behaves so differently depending on the type. For an immutable int, `x += 1` is just shorthand for `x = x + 1` — a rebinding. For a mutable list, `lst += [item]` mutates the list object in place — every alias to that list sees the new item.',
    ],
    callouts: [
      {
        type: 'important',
        title: 'Variables are references, not boxes',
        body: 'A variable is a name pointing at an object. Assignment changes what a name points to — it does not modify a container. This is the single most important mental model correction most beginners have to make, and it explains aliasing, mutable default arguments, and a long list of otherwise-mysterious bugs later on.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 0.3 — Names and Objects',
        mathBridge: 'Watch id() closely in this notebook — it is the tool that reveals what is actually happening underneath assignment.',
        caption: 'A variable is a name bound to an object. Nothing more, nothing less.',
        props: {
          initialCells: [

            // ── CELL 1: Binding ─────────────────────────────────────────────
            {
              id: 1,
              cellTitle: 'Binding — a name points at an object',
              prose: '`id()` returns an object\'s unique identity (in practice, its memory address). Two names bound to the same object have the same id.',
              code: 'x = 42\ny = 42\nprint(id(x) == id(y))\nprint(x is y)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 2: Rebinding ────────────────────────────────────────────
            {
              id: 2,
              cellTitle: 'Rebinding — assignment does not mutate',
              prose: 'Assigning a new value to an existing name does not change the old object — it points the name at a different object entirely.',
              instructions: 'Run this cell. The id changes, proving x now refers to a completely different object.',
              code: 'x = 1\nold_id = id(x)\nx = 2\nprint(id(x) == old_id)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 3: Aliasing ──────────────────────────────────────────────
            {
              id: 3,
              cellTitle: 'Aliasing — two names, one mutable object',
              prose: '`a = [1, 2, 3]` creates a list object. `b = a` does not copy it — `b` now refers to that exact same list. This is **aliasing**.',
              instructions: 'Run this cell. Mutating through b is visible through a, because they are the same object.',
              code: 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)\nprint(a is b)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 4: Rebinding an alias breaks the link ────────────────────
            {
              id: 4,
              cellTitle: 'Rebinding one alias does not affect the other',
              prose: '`b = b + [5]` builds a brand-new list and rebinds `b` to it — it does not mutate the shared list. After this, `a` and `b` refer to two different objects.',
              code: 'a = [1, 2, 3]\nb = a\nb = b + [5]\nprint(a)\nprint(b)\nprint(a is b)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 5: += on an immutable vs a mutable type ───────────────────
            {
              id: 5,
              cellTitle: '+= means different things for int vs list',
              prose: 'For an int (immutable), `+=` is shorthand for rebinding: `n = n + 1`. For a list (mutable), `+=` mutates the existing object in place.',
              instructions: 'Run this cell and compare the id before and after += for each type.',
              code: [
                'n = 5',
                'n_id = id(n)',
                'n += 1',
                'print("int id changed:", id(n) != n_id)',
                '',
                'lst = [1, 2]',
                'lst_id = id(lst)',
                'lst += [3]',
                'print("list id changed:", id(lst) != lst_id)',
              ].join('\n'),
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 6: Breaking an alias deliberately ─────────────────────────
            {
              id: 6,
              cellTitle: 'Breaking an alias with a real copy',
              prose: '`list(a)` (or `a[:]`, or `copy.copy(a)`) builds a genuinely new list with the same contents — mutating the copy leaves the original untouched.',
              code: 'a = [1, 2, 3]\nc = list(a)\nc.append(99)\nprint(a)\nprint(c)\nprint(a is c)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 7: Naming conventions ──────────────────────────────────
            {
              id: 7,
              cellTitle: 'Naming rules and conventions',
              prose: 'Names must start with a letter or underscore and contain only letters, digits, and underscores; they are case-sensitive. Convention (not a rule enforced by Python): **snake_case** for ordinary names, **UPPER_SNAKE** for constants, a leading underscore to signal "internal use."',
              code: 'MAX_RETRIES = 3\nuser_age = 25\n_internal_counter = 0\nprint(user_age)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CHALLENGE 1 ────────────────────────────────────────────────────
            {
              id: 21,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Predict Before You Run',
              difficulty: 'medium',
              prompt: 'Trace this sequence by hand first: `x = 3`; `y = x`; `x = 99`; then what is `y`? Write the full sequence and end with the bare expression `y` so the notebook shows its final value.',
              instructions: 'Type all four lines. The final line should be just `y`.',
              code: 'x = 3\ny = x\nx = 99\ny',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == 3:
    res = "SUCCESS: y is still 3. y = x bound y to the SAME object x pointed at (3). x = 99 rebinds x to a new object — it never touches the object y still refers to."
else:
    res = f"ERROR: Expected 3, got {result}. Remember: rebinding x does not change what y points to."
res
`,
              hint: 'y was bound once, to whatever object x pointed at at that moment. Later reassigning x has no effect on y.',
            },

            // ── CHALLENGE 2 ────────────────────────────────────────────────────
            {
              id: 22,
              challengeType: 'write',
              challengeNumber: 2,
              challengeTitle: 'Prove Two Names Share One List',
              difficulty: 'medium',
              prompt: 'Create a list `history = []`. Create an alias `backup = history`. Append the number `1` to `history`. Then write a bare expression that evaluates to `True` if `backup` shows the appended item too.',
              instructions: 'End your cell with an expression like `1 in backup` or `backup == history`.',
              code: 'history = []\nbackup = history\nhistory.append(1)\nbackup == history',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result is True:
    res = "SUCCESS: backup and history are the same object, so appending through one name is visible through the other."
else:
    res = "ERROR: Expected True. backup = history creates an alias, not a copy — mutating history should be visible via backup."
res
`,
              hint: 'backup = history makes both names point at the exact same list object.',
            },

            // ── CHALLENGE 3 ────────────────────────────────────────────────────
            {
              id: 23,
              challengeType: 'write',
              challengeNumber: 3,
              challengeTitle: 'Fix the Accidental Alias',
              difficulty: 'hard',
              prompt: 'The code below tries to keep `original` unchanged while building a modified `edited` list, but it accidentally aliases instead of copying, so both end up mutated. Fix ONLY the second line so that `edited` becomes a genuine independent copy — use `list(original)`.',
              instructions: 'Change `edited = original` to `edited = list(original)`. After the fix, original should stay [1, 2, 3].',
              starterBlock: 'original = [1, 2, 3]\nedited = original\nedited.append(4)\noriginal',
              code: 'original = [1, 2, 3]\nedited = original\nedited.append(4)\noriginal',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == [1, 2, 3]:
    res = "SUCCESS: original stayed [1, 2, 3] because edited is now an independent copy, not an alias."
else:
    res = f"ERROR: Expected original to stay [1, 2, 3], got {result}. Change 'edited = original' to 'edited = list(original)'."
res
`,
              hint: 'list(original) builds a new list with the same items — it does not share the same object as original.',
            },

          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      '**Small integer / string caching**: CPython caches small integers (typically -5 to 256) and some string literals, so two separately-written literals with the same small value may report `is` as `True` even without explicit aliasing. This is an implementation detail — never rely on `is` for value equality on numbers or strings; use `==` for that. Use `is` only for identity checks like `x is None`.',

      '**Garbage collection**: when no name refers to an object anymore, CPython\'s reference-counting garbage collector reclaims its memory automatically. You never explicitly free memory in Python.',

      '**Mutable default argument trap** (a preview): a mutable object like a list, if used as a function\'s default argument, is created once and shared across every call that doesn\'t override it — a classic aliasing bug you will meet again once functions are introduced.',
    ],
    callouts: [
      {
        type: 'warning',
        title: 'Never rely on `is` for value comparisons',
        body: '`is` checks whether two names refer to the literal same object in memory. Use `==` to check whether two values are equal. The one standard exception: always use `is` (never `==`) when checking for None.',
      },
    ],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If a mutation shows up somewhere you did not expect, suspect aliasing — search for every name that could point at the same mutable object.',
      'If `is` gives a surprising answer for numbers or strings, remember small-value caching is an implementation detail — switch to `==` for value comparisons.',
      'When you want an independent copy of a list, use `list(x)` or `x[:]` — never assume `y = x` gives you one.',
    ],
    futureLinks: [
      'Next lesson: Conditionals — if/elif/else, comparison operators, and short-circuit evaluation of and/or.',
      'The aliasing trap resurfaces almost immediately once functions pass mutable arguments (Lesson 6).',
      'Lists and dictionaries get a full treatment in Module 1, where mutability becomes a central design concern.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'After `a = [1, 2]`, `b = a`, `b.append(3)`, what is `a`?',
      options: ['[1, 2] — a is unaffected by changes to b', '[1, 2, 3] — a and b refer to the same list object', 'An error — you cannot mutate a list through an alias'],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'After `x = 5`, `y = x`, `x = 10`, what is `y`?',
      options: ['10, because y always tracks x', '5, because rebinding x does not affect what y already points to', 'An error, because x was reassigned'],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Why does `lst += [item]` behave differently from `n += 1` in terms of identity (id())?',
      options: [
        'They behave identically — both always rebind',
        'Lists are mutable, so += mutates the existing object in place; ints are immutable, so += must rebind to a new object',
        '+= is not valid syntax for lists',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'What is the correct way to check if a variable holds None?',
      options: ['if x == None:', 'if x is None:', 'if x = None:'],
      correct: 1,
    },
  ],

  mentalModel: [
    'A variable is a name bound to an object — not a container holding a value.',
    'Assignment binds a name. Reassignment REBINDS it to a different object; it does not mutate the old one.',
    'Aliasing: two names can refer to the exact same mutable object. Mutating through one is visible through the other.',
    'Rebinding one alias (b = b + [x]) does not affect other aliases — it points that one name at a new object.',
    '+= rebinds for immutable types (int, str, tuple) but mutates in place for mutable types (list, dict, set).',
    'Use == for value equality, `is` only for identity (and always for None checks).',
    'list(x) or x[:] makes a genuine independent copy; y = x does not.',
    'Naming convention: snake_case for names, UPPER_SNAKE for constants, leading underscore for "internal."',
  ],

  checkpoints: ['read-intuition'],
}
