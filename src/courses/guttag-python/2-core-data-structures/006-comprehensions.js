// Guttag — Lesson 11: Comprehensions
// Auto-converted from src/docs/tutorials/guttag-python/lesson-11.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-11-comprehensions',
  slug: 'comprehensions',
  chapter: 2,
  order: 6,
  title: 'Comprehensions',
  subtitle: 'Lists, Dicts, Sets, and Generators',
  tags: ['list-comprehension', 'dict-comprehension', 'set-comprehension', 'generator-expression', 'lazy-evaluation', 'eager-evaluation'],

  hook: {
    question: 'What is "Comprehensions", and why does it matter?',
    realWorldContext: 'The reader understands list comprehensions, dict comprehensions, set comprehensions, and generator expressions: their syntax, when to use each, and the performance difference between a list comprehension (eager) and a generator expression (lazy). The transferable insight: comprehensions are declarative transformations. They express WHAT to build, not HOW to build it step by step. A comprehension is almost always more readable than an equivalent for-loop-with-append.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: List comprehension — transform and filter, Dict and set comprehensions, Generator expressions — lazy evaluation, When NOT to use comprehensions, Comprehensions and performance.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **list comprehension:** A declarative way to create a new list by transforming and optionally filtering an iterable.\n- **dict comprehension:** A declarative way to create a new dictionary by transforming an iterable into key-value pairs.\n- **set comprehension:** A declarative way to create a new set by transforming an iterable and automatically deduplicating values.\n- **generator expression:** A lazy evaluator that yields items one by one rather than building a collection in memory.\n- **lazy evaluation:** Producing values on demand rather than eagerly building them all at once.\n- **eager evaluation:** Computing all values and storing them in memory immediately.\n- **declarative programming:** Expressing WHAT you want to compute rather than HOW to compute it step-by-step.\n- **side effect:** Modifying state or interacting with the outside world (e.g., printing) inside a computation.\n- **iterable:** Any object that can return its members one at a time, allowing it to be looped over.\n- **short-circuiting:** Stopping evaluation as soon as the result is determined.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **sum():** A built-in function that adds items of an iterable from left to right.\n- **any():** A built-in function that returns True if any element of the iterable is true.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace how these concepts compose. If we have `words = [\'hello\', \'hi\', \'world\', \'ok\']` and we want a dictionary of lengths for words longer than 2 characters: 1. `words` is evaluated. 2. The dict comprehension `{word: len(word) for word in words if len(word) > 2}` iterates. 3. `\'hello\'` passes the filter (len 5 > 2). It adds `{\'hello\': 5}`. 4. `\'hi\'` fails the filter (len 2 > 2). 5. `\'world\'` passes (len 5 > 2). It adds `{\'world\': 5}`. 6. `\'ok\'` fails (len 2 > 2). Result: `{\'hello\': 5, \'world\': 5}`. If we then want the sum of those lengths using a generator expression: 1. `sum(len(w) for w in words if len(w) > 2)` is called. 2. The generator yields `5` for `\'hello\'`. `sum` accumulates it (total 5). 3. The generator evaluates `\'hi\'` and yields nothing. 4. The generator yields `5` for `\'world\'`. `sum` accumulates it (total 10). 5. The generator evaluates `\'ok\'` and yields nothing. 6. The generator is exhausted. `sum` returns `10`. Through this, we see how comprehensions and generators allow us to declare *what* we want to build or calculate without bogging down in *how* to build the intermediate states.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 11: Comprehensions',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Comprehensions',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'List comprehension — transform and filter',
              prose: [
                'We often need to create a new list by transforming or filtering elements from an existing sequence. Doing this with a standard for loop requires initializing an empty list and calling `.append()` repeatedly. This is verbose and focuses on *how* to build the list rather than *what* the list is. What does the code look like if we want to square every even number from 0 to 9 using a `for` loop? How many lines of code does that take? Can we express this more directly as "give me the squares of even numbers"?',
                '```text [0, 4, 16, 36, 64] ``` This proves that a **list comprehension** can filter (`if x % 2 == 0`) and transform (`x**2`) an iterable in a single, readable expression, producing a new list.'
              ],
              typeIt: true,
              solution: 'squares = [x**2 for x in range(10) if x % 2 == 0]\nprint(squares)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'List comprehension — transform and filter — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def`: The keyword used to define a function.\n- `extract_even_squares`: The name of the function.\n- `(numbers)`: The parameter list accepting an iterable.\n- `:`: Ends the function definition header.\n- `return`: The keyword that sends the evaluated result back to the caller.\n- `[`: Opens the list comprehension syntax.\n- `x**2`: The expression to evaluate for each item; squares the value.\n- `for`: The keyword starting the iteration clause of the comprehension.\n- `x`: The variable name bound to each element during iteration.\n- `in`: The keyword specifying the iterable to draw from.\n- `numbers`: The iterable being processed.\n- `if`: The keyword starting the filter clause.\n- `x % 2 == 0`: The condition that must be true for `x**2` to be included in the result.\n- `]`: Closes the list comprehension syntax.',
                '**Expected behavior.** Predicted confidently: `[0, 4, 16, 36, 64]` when called with `range(10)`.',
                '**CS lens.** Declarative programming. Instead of writing imperative steps (create list, loop, check condition, append), we declare the shape of the data we want. This appears in SQL (`SELECT x^2 FROM numbers WHERE x % 2 = 0`), React UI definitions, Makefile targets, and Terraform configurations.',
                '**SE lens.** Design principle: Readability and intent. The alternative NOT chosen is using a `for` loop with `.append()`. The real tradeoff is that while comprehensions are more concise and often faster in CPython, they can become unreadable if the logic (nested loops, complex conditions) is too dense, at which point a standard loop is preferable.'
              ],
              typeIt: true,
              solution: 'def extract_even_squares(numbers):\n    return [x**2 for x in numbers if x % 2 == 0]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Dict and set comprehensions',
              prose: [
                'We can build lists concisely, but often we need dictionaries to map keys to values, or sets to deduplicate items. Writing loops to build these structures suffers from the same verbosity as list building. If you have a list of words, how would you create a dictionary mapping each word to its length using a loop? How would you extract all unique words from a text? Could the declarative syntax of list comprehensions be adapted for dicts and sets?',
                '```text {\'hello\': 5, \'world\': 5} {\'world\', \'hello\'} ``` This proves that **dict comprehensions** (`{k: v for...}`) and **set comprehensions** (`{expr for...}`) use the exact same declarative pattern as list comprehensions, adjusting only the surrounding braces and key-value syntax.'
              ],
              typeIt: true,
              solution: 'words = [\'hello\', \'hi\', \'world\', \'ok\']\nlengths = {word: len(word) for word in words if len(word) > 2}\nunique_words = {x.lower() for x in words if len(x) > 3}\nprint(lengths)\nprint(unique_words)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Dict and set comprehensions — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def`: The keyword used to define a function.\n- `build_word_lengths`: The name of the function.\n- `(words)`: The parameter list accepting an iterable of strings.\n- `:`: Ends the function definition header.\n- `return`: The keyword that sends the evaluated result back to the caller.\n- `{`: Opens the dictionary comprehension syntax.\n- `w`: The key expression.\n- `:`: Separates the key from the value in the dictionary comprehension.\n- `len(w)`: The value expression.\n- `for`: The keyword starting the iteration clause.\n- `w`: The variable name bound to each element.\n- `in`: The keyword specifying the iterable to draw from.\n- `words`: The iterable being processed.\n- `if`: The keyword starting the filter clause.\n- `len(w) > 2`: The condition that must be true to include the key-value pair.\n- `}`: Closes the dictionary comprehension syntax.\n- `def get_unique_long_words(words):`: Defines another function taking an iterable.\n- `return {w.lower() for w in words if len(w) > 3}`: A set comprehension. `{` and `}` without key-value colons define a set. `w.lower()` transforms the item, deduplication is automatic, and `len(w) > 3` filters the inputs.',
                '**Expected behavior.** Predicted confidently: `{\'hello\': 5}` and `{\'hello\'}` for the respective functions given `[\'hello\', \'hi\']`.',
                '**CS lens.** Hash-based data structures. Dicts and sets rely on hashing for O(1) lookups and automatic deduplication. This appears in database indexes, caching layers (like Redis or Memcached), symbol tables in compilers, and unique constraints in SQL.',
                '**SE lens.** Design principle: Principle of Least Surprise. The alternative NOT chosen is inventing a completely new syntax for dicts and sets. The real tradeoff is that by reusing the `for ... in ... if ...` syntax from list comprehensions, Python lowers the cognitive load, but makes dict and set comprehensions visually similar, distinguished only by the presence of a colon.'
              ],
              typeIt: true,
              solution: 'def build_word_lengths(words):\n    return {w: len(w) for w in words if len(w) > 2}\n\ndef get_unique_long_words(words):\n    return {w.lower() for w in words if len(w) > 3}',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Generator expressions — lazy evaluation',
              prose: [
                'List comprehensions compute all values immediately and store them in memory. If we process a billion items, a list comprehension will consume gigabytes of RAM. How can we perform declarative transformations without the massive memory overhead? What happens to your system\'s memory if you do `[x**2 for x in range(10**9)]`? If we only want to compute the sum of these squares, do we actually need all billion values at the exact same time? Is there a way to generate each value exactly when `sum()` asks for it?',
                '```text <generator object <genexpr> at ...> 285 ``` This proves that a **generator expression** uses parentheses `()` instead of brackets, does NOT build a list in memory (it returns a generator object), and uses **lazy evaluation** to yield items one at a time when consumed by functions like `sum()`.'
              ],
              typeIt: true,
              solution: 'gen = (x**2 for x in range(10))\nprint(gen)\nprint(sum(gen))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Generator expressions — lazy evaluation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def`: The keyword used to define a function.\n- `sum_of_squares`: The name of the function.\n- `(numbers)`: The parameter list.\n- `:`: Ends the header.\n- `return`: The keyword to send back the result.\n- `sum`: The built-in function that aggregates values.\n- `(`: Opens the function call to `sum`. Because it\'s the only argument, the generator expression\'s own parentheses can be omitted.\n- `x**2`: The expression to evaluate lazily.\n- `for`: The keyword starting the iteration clause.\n- `x`: The variable name bound to each element.\n- `in`: The keyword specifying the iterable.\n- `numbers`: The iterable.\n- `)`: Closes the function call to `sum`.',
                '**Expected behavior.** Predicted confidently: `285` given `range(10)`.',
                '**CS lens.** Lazy evaluation. Computing values only when they are needed rather than in advance. This appears in infinite data streams, pagination in web APIs, lazy-loading images in browsers, and Haskell (which is entirely lazy by default).',
                '**SE lens.** Design principle: Resource efficiency. The alternative NOT chosen is `sum([x**2 for x in numbers])` (a list comprehension). The real tradeoff is that the generator is O(1) in memory but can only be iterated *once*. If you need to traverse the values multiple times, you must use a list comprehension or materialise the generator into a list.'
              ],
              typeIt: true,
              solution: 'def sum_of_squares(numbers):\n    return sum(x**2 for x in numbers)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'When NOT to use comprehensions',
              prose: [
                'Because comprehensions are concise, developers sometimes try to force every loop into a comprehension. But what happens if the loop modifies state, or the logic involves complex nested conditions? If a comprehension\'s purpose is to build a *new* collection, does it make sense to use one just to call `print(x)` on every item? How readable is `[y for x in matrix if x for y in x if y > 0]`? When does a standard `for` loop communicate intent better than a comprehension?',
                '```text 1 2 3 [None, None, None] ``` This proves that putting a **side effect** like `print()` inside a comprehension evaluates the effect but creates a useless list of `None` values, which is wasteful and miscommunicates intent.'
              ],
              typeIt: true,
              solution: 'lst = [1, 2, 3]\n[print(x) for x in lst] # BAD practice',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'When NOT to use comprehensions — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def`: Defines a function.\n- `process_items_with_effects`: Function name.\n- `(items)`: Parameter list.\n- `:`: Ends header.\n- `for`: Starts a traditional for loop.\n- `item`: Loop variable.\n- `in`: Keyword.\n- `items`: Iterable.\n- `:`: Ends loop header.\n- `print`: Built-in function causing a side effect (output to console).\n- `f"Processing {item}"`: Formatted string evaluated for each item.',
                '**Expected behavior.** Predicted confidently: Will print "Processing X" for each X in the input, returning `None`.',
                '**CS lens.** Side effects vs Pure functions. A comprehension is meant to act like a mathematical map/filter (pure functions returning new data). A side effect alters state outside its scope. This distinction is foundational in functional programming, React\'s rendering lifecycle, and database transaction isolation.',
                '**SE lens.** Design principle: Use the right tool for the job. The alternative NOT chosen is `[print(item) for item in items]`. The real tradeoff is that while the comprehension is technically one line, it violates the semantics of list building and wastes memory on a list of `None`s, making the explicit `for` loop far superior for side effects or highly complex nesting.'
              ],
              typeIt: true,
              solution: 'def process_items_with_effects(items):\n    for item in items:\n        print(f"Processing {item}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Comprehensions and performance',
              prose: [
                'We know comprehensions are concise, and generators save memory. But how does this affect runtime performance? Does Python optimize these constructs under the hood? Is appending to a list in a `for` loop faster or slower than a list comprehension? If we want to check if *any* number in a massive list is even, do we need to check all of them? How does `any()` behave differently with a generator expression versus a list comprehension?',
                '```text List comp: 0.5200s Gen expr: 0.0000s ``` This proves that a generator expression combined with `any()` leverages **short-circuiting**—it stops exactly at `x == 5` without evaluating the rest, whereas the list comprehension eagerly evaluates all 10 million items before `any()` even starts looking.'
              ],
              typeIt: true,
              solution: 'import time\nstart = time.time()\nres1 = any([x == 5 for x in range(10**7)])\nmid = time.time()\nres2 = any(x == 5 for x in range(10**7))\nend = time.time()\nprint(f"List comp: {mid - start:.4f}s")\nprint(f"Gen expr: {end - mid:.4f}s")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Comprehensions and performance — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def`: Defines a function.\n- `has_even`: Function name.\n- `(numbers)`: Parameter list.\n- `:`: Ends header.\n- `return`: Keyword to send back result.\n- `any`: Built-in function that returns `True` if any element of the iterable is true.\n- `(`: Opens function call.\n- `x % 2 == 0`: Expression evaluating to boolean.\n- `for`: Starts iteration.\n- `x`: Variable bound to element.\n- `in`: Keyword.\n- `numbers`: Iterable.\n- `)`: Closes function call.',
                '**Expected behavior.** Predicted confidently: `True` if any even number is present, fast short-circuiting.',
                '**CS lens.** Short-circuit evaluation. Stopping computation as soon as the result is logically determined. This appears in boolean logic operators (`A or B`), database query optimizers (stopping a scan once a `LIMIT` is reached), regex engines, and stream processing frameworks.',
                '**SE lens.** Design principle: Performance through laziness. The alternative NOT chosen is `any([x % 2 == 0 for x in numbers])`. The real tradeoff is that the list comprehension takes O(N) time and O(N) space, regardless of where the first even number is. The generator expression takes O(1) space and O(K) time, where K is the index of the first even number, drastically improving performance for early matches at the cost of a slightly higher per-iteration overhead in Python.'
              ],
              typeIt: true,
              solution: 'def has_even(numbers):\n    return any(x % 2 == 0 for x in numbers)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: { prose: [], callouts: [], visualizations: [] },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If a cell\'s behavior surprises you, isolate the one line that surprised you in its own cell and experiment with small variations.',
      'Read the reference code above the editor line by line and predict what it does before you type it in — that catches most mistakes before you even run anything.',
    ],
    futureLinks: [
      'Next lesson: Functions as Objects.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "lazy evaluation"?',
      options: [
        'Producing values on demand rather than eagerly building them all at once.',
        'Any object that can return its members one at a time, allowing it to be looped over.',
        'Modifying state or interacting with the outside world (e.g., printing) inside a computation.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "generator expression"?',
      options: [
        'Stopping evaluation as soon as the result is determined.',
        'Computing all values and storing them in memory immediately.',
        'A lazy evaluator that yields items one by one rather than building a collection in memory.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "dict comprehension"?',
      options: [
        'A declarative way to create a new dictionary by transforming an iterable into key-value pairs.',
        'Any object that can return its members one at a time, allowing it to be looped over.',
        'Computing all values and storing them in memory immediately.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "list comprehension"?',
      options: [
        'A declarative way to create a new set by transforming an iterable and automatically deduplicating values.',
        'Expressing WHAT you want to compute rather than HOW to compute it step-by-step.',
        'A declarative way to create a new list by transforming and optionally filtering an iterable.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**list comprehension** — A declarative way to create a new list by transforming and optionally filtering an iterable.',
    '**dict comprehension** — A declarative way to create a new dictionary by transforming an iterable into key-value pairs.',
    '**set comprehension** — A declarative way to create a new set by transforming an iterable and automatically deduplicating values.',
    '**generator expression** — A lazy evaluator that yields items one by one rather than building a collection in memory.',
    '**lazy evaluation** — Producing values on demand rather than eagerly building them all at once.',
    '**eager evaluation** — Computing all values and storing them in memory immediately.',
    '**declarative programming** — Expressing WHAT you want to compute rather than HOW to compute it step-by-step.',
    '**side effect** — Modifying state or interacting with the outside world (e.g., printing) inside a computation.',
  ],

  checkpoints: ['read-intuition'],
}
