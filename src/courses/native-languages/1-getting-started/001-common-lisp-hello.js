// native-languages — Getting Started — Lesson 1: Common Lisp
// Pilot lesson for NativeRunNotebook + the autonomous SBCL installer (see
// desktop/app/runtimes/lisp.cjs). Proves the install -> run -> real-output
// pipeline end to end; not a full Lisp curriculum.

export default {
  id: 'native-languages-001-common-lisp-hello',
  slug: 'common-lisp-hello',
  chapter: 1,
  order: 1,
  title: 'Common Lisp: Your First Program',
  subtitle: 'Getting Started',
  tags: ['lisp', 'common-lisp', 'sbcl'],

  hook: {
    question: 'What does a program built entirely out of parentheses actually look like?',
    realWorldContext: 'Common Lisp is one of the oldest programming languages still in real use, and its syntax looks nothing like C-family languages — every operation, from arithmetic to defining a function, is written as a parenthesized list with the operator first. This lesson runs real Common Lisp, through a real SBCL (Steel Bank Common Lisp) interpreter running locally on your machine, not a browser simulation.',
    previewVisualizationId: 'NativeRunNotebook',
  },

  intuition: {
    prose: [
      'In Lisp, code and data share the same shape: a parenthesized list. `(+ 2 2)` is a list whose first element, `+`, tells the interpreter to treat the rest of the list as arguments to add. This "operator first" style is called prefix notation, and it means there is never any ambiguity about order of operations — no PEMDAS to memorize, since the parentheses themselves state exactly what groups with what.',
      'Defining a function looks the same way: `(defun square (x) (* x x))` is itself a list — `defun` (define function), a name, a list of parameters, and a body. Once defined, calling it is just another list: `(square 5)`.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Objects and Functions Used',
        body: '- **`format`** — Common Lisp\'s primary output function. `(format t "text~%")` prints `text` followed by a newline to standard output; `t` means "print to the standard output stream."\n- **`~a`** — inside a `format` string, a placeholder that prints the next argument using its natural/human-readable representation (roughly analogous to `%s` in C-family languages).\n- **`defun`** — defines a named function: `(defun name (params) body)`.\n- **`let`** — introduces local variable bindings: `(let ((x 5) (y 10)) (+ x y))` binds `x` and `y` only within that expression.',
      },
    ],
    visualizations: [
      {
        id: 'NativeRunNotebook',
        title: 'Hands-On: Common Lisp',
        caption: 'Runs for real via a locally-installed SBCL — only works in the OpenCalc desktop app.',
        props: {
          runtime: 'lisp',
          initialCells: [
            {
              id: 1,
              cellTitle: 'Hello, Lisp',
              prose: [
                'The classic first program, plus a small function definition and call to see prefix notation and `let` bindings in the same place.',
              ],
              filename: 'lesson.lisp',
              code: '(format t "Hello from Common Lisp!~%")\n\n(defun square (x)\n  (* x x))\n\n(let ((n 7))\n  (format t "~a squared is ~a~%" n (square n)))\n',
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      'Prefix notation is not just a stylistic choice — it is what makes Lisp\'s macro system possible. Because code is written as ordinary lists (the same data structure the language manipulates at runtime), a Lisp program can construct, inspect, and rewrite its own code before it runs, using the exact same list-processing functions it uses on ordinary data. This property — code and data sharing one representation — is called "homoiconicity," and Lisp is the language most responsible for popularizing it; later languages (Scheme, Clojure, and to a lesser extent Elixir\'s macro system) inherit the same idea directly from Lisp\'s lineage.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If Run does nothing, check the environment banner above the editor — SBCL may still be installing.',
      'Unmatched parentheses are the most common Lisp mistake — count them from the outside in if something doesn\'t run.',
    ],
    futureLinks: [
      'Next lesson: Java.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can read a simple Lisp expression as "operator first, then arguments," all inside parentheses.',
    'I know that (defun name (params) body) defines a function, and that calling it is just another parenthesized list.',
    'I understand that Lisp code and Lisp data share the same list representation — this is why the language can manipulate its own code.',
    'I have run real Common Lisp code and seen real output from a real SBCL interpreter.',
  ],

  checkpoints: ['read-intuition'],
}
