// Guttag — Lesson 8: Tuples
// Auto-converted from src/docs/tutorials/guttag-python/lesson-08.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-08-tuples',
  slug: 'tuples',
  chapter: 2,
  order: 3,
  title: 'Tuples',
  subtitle: 'Immutable Sequences',
  tags: ['tuple-literal', 'immutability', 'packing', 'unpacking', 'star-unpacking', 'hashability'],

  hook: {
    question: 'What is "Tuples", and why does it matter?',
    realWorldContext: 'The reader understands tuples: immutable ordered sequences, when to choose tuple over list, packing/unpacking, multiple return values, and using tuples as dict keys. The transferable insight: immutability is a GUARANTEE. A tuple promises it will not change. This lets Python use tuples as dict keys (requires hashability), lets you use them as function return values safely, and signals to the reader that this collection is not meant to be modified.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Tuple literals and immutability, Packing and unpacking, Multiple return values, Tuples as dict keys — hashability, When to use tuple vs. list.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Tuple literal:** A sequence of values separated by commas, often enclosed in parentheses, representing a fixed-size ordered collection.\n- **Immutability:** The property of an object whose state cannot be modified after it is created. It guarantees the data will not change.\n- **Packing:** The act of grouping multiple values into a single tuple object without explicitly writing parentheses.\n- **Unpacking:** The act of assigning the individual elements of a tuple to a sequence of variables in a single statement.\n- **Star unpacking:** Using an asterisk () during unpacking to gather multiple remaining elements of a sequence into a list.\n- **Hashability:** A property of an object that means it has a hash value which never changes during its lifetime, allowing it to be used as a dictionary key or in a set.\n- **Record:** A data structure (often a tuple in Python) that groups related, heterogeneous fields together (like a row in a database).',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **len:** A built-in function that returns the number of items in a container.\n- **min:** A built-in function that returns the smallest item in an iterable.\n- **max:** A built-in function that returns the largest item in an iterable.\n- **hash:** A built-in function that returns the hash value of an object, if it has one.\n- **frozenset:** A built-in class representing an immutable set.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Consider the record `(\'Alice\', 25, 95.5)` as it flows through a system across all these concepts. 1. **Creation:** You create it as a literal: `record = (\'Alice\', 25, 95.5)`. Its immutability guarantees that no other part of the program can accidentally change Alice\'s score. 2. **Unpacking:** When you need to process it, you can effortlessly extract the fields: `name, age, score = record`. 3. **Use as a dict key:** Because it\'s a tuple of immutable values, it is hashable. You could use it as a key in a dictionary to cache results: `cache[record] = "Processed"`. 4. **Sorting:** When placed in a list with other tuples (e.g., `records = [(\'Alice\', 25, 95.5), (\'Bob\', 30, 80.0)]`), you can easily sort the list. Python will sort the tuples by comparing their first elements, then their second, and so on, taking advantage of the predictable structure a tuple provides. The immutability of the tuple is the core feature that enables all of these safe, efficient behaviors.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 8: Tuples',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Tuples',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Tuple literals and immutability',
              prose: [
                'If you need a collection of items that should *never* change during the execution of your program, how do you prevent yourself or other code from accidentally modifying it? If you use a list, what happens if someone calls `.append()` or overwrites an index? How do you create an ordered collection that guarantees it will remain exactly as defined?',
                'Output: ```text 1 Error: \'tuple\' object does not support item assignment ``` This proves that a **tuple** is an immutable sequence. Attempting to reassign an index raises a `TypeError`, guaranteeing the collection\'s structure cannot be changed once created.'
              ],
              typeIt: true,
              solution: 't = (1, 2, 3)\nsingle_t = (1,)\nprint(t[0])\ntry:\n    t[0] = 99\nexcept TypeError as e:\n    print(f"Error: {e}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Tuple literals and immutability — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def check_tuple():`: Defines a new function named `check_tuple` taking no arguments.\n- `coordinates = (10, 20)`: Assigns a tuple literal containing `10` and `20` to the variable `coordinates`.\n- The `(10, 20)` literal creates an ordered sequence of two integers in memory.\n- `return len(coordinates)`: Calls the built-in `len` function on the tuple and returns the resulting integer (`2`).',
                '**Expected behavior.** Predicted confidently: `2`',
                '**CS lens.** This is the concept of **Immutability**. In Computer Science, immutable data structures cannot be modified after creation. This appears in string representations in Java, state management in React (where state is treated as immutable), Git commits (which cannot be changed once written, only appended), and functional programming languages like Haskell where all data is immutable by default.',
                '**SE lens.** The design principle here is **Defense in Depth**. By using a tuple instead of a list, you statically prevent a whole class of bugs related to unintended state mutation. The alternative NOT chosen is using a list and just trying to be careful not to modify it. The tradeoff is that you lose the flexibility to append or modify elements in-place, meaning you must create a whole new tuple if a change is genuinely needed, which can have minor performance costs.'
              ],
              typeIt: true,
              solution: 'def check_tuple():\n    coordinates = (10, 20)\n    return len(coordinates)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Packing and unpacking',
              prose: [
                'When you have a record containing multiple related values (like a name and an age), accessing them by index (`record[0]`, `record[1]`) is tedious and hard to read. How can we elegantly extract all the values of a tuple into distinct, named variables in a single line of code?',
                'Output: ```text Alice 95.5 2 1 [2, 3, 4] ``` This proves **packing and unpacking**. Values separated by commas are automatically packed into a tuple, and assigning a tuple to a comma-separated list of variables unpacks it. The `*` syntax gathers remaining elements.'
              ],
              typeIt: true,
              solution: 'record = "Alice", 25, 95.5\nname, age, score = record\nprint(name, score)\n\na, b = 1, 2\na, b = b, a\nprint(a, b)\n\nfirst, *rest = (1, 2, 3, 4)\nprint(rest)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Packing and unpacking — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def get_user_info():`: Defines a new function.\n- `user = ("Bob", 30)`: Assigns a tuple literal to `user`.\n- `name, age = user`: Unpacks the tuple `user`. The first element `"Bob"` is assigned to `name`, and the second element `30` is assigned to `age`.\n- `return name`: Returns the string assigned to `name`.',
                '**Expected behavior.** Predicted confidently: `\'Bob\'`',
                '**CS lens.** This is **Pattern Matching / Destructuring**. This idea appears in Lisp (via macros like `destructuring-bind`), Rust (pattern matching in `match` or `let`), JavaScript (object and array destructuring), and Erlang (where pattern matching is the primary way to bind variables and direct control flow).',
                '**SE lens.** The design principle is **Self-Documenting Code**. By unpacking `user` into `name, age`, the code explicitly documents what the tuple contains, rather than forcing the reader to guess what `user[0]` and `user[1]` mean. The alternative NOT chosen is index-based access. The tradeoff is that unpacking requires you to know the exact length of the tuple (or use star unpacking), otherwise Python raises a `ValueError`.'
              ],
              typeIt: true,
              solution: 'def get_user_info():\n    user = ("Bob", 30)\n    name, age = user\n    return name',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Multiple return values',
              prose: [
                'A function can only execute one `return` statement that yields one object. If you need a function to compute and return two distinct pieces of information—like the minimum and maximum of a sequence—how do you get both values back to the caller without creating a complex custom class?',
                'Output: ```text 1 5 ``` This proves that a function can return multiple values as a tuple, which the caller can immediately unpack. The return statement automatically packs the values.'
              ],
              typeIt: true,
              solution: 'def minmax(lst):\n    return min(lst), max(lst)\n\nlo, hi = minmax([3, 1, 4, 1, 5])\nprint(lo, hi)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Multiple return values — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def bounds(numbers):`: Defines a function accepting a collection.\n- `return min(numbers), max(numbers)`: Computes the minimum using the built-in `min` function, computes the maximum using the built-in `max` function, and returns them as an implicitly packed tuple.',
                '**Expected behavior.** Predicted confidently: `(1, 5)` if called with `[3, 1, 4, 1, 5]`.',
                '**CS lens.** This is the concept of **Multiple Return Values**. It appears in Go (where returning a result and an error is idiomatic), Lua (which natively supports multiple returns), Swift (using tuples for multiple returns), and SQL (where a `SELECT` statement returns a row with multiple columns).',
                '**SE lens.** The design principle is **Lightweight Abstraction**. Tuples provide a zero-overhead way to group values temporarily. The alternative NOT chosen is returning a dictionary or defining a custom class for the return type. The tradeoff is that tuples lack field names; the caller must remember the exact order of the returned elements, which can become confusing if a function returns more than three values.'
              ],
              typeIt: true,
              solution: 'def bounds(numbers):\n    return min(numbers), max(numbers)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Tuples as dict keys — hashability',
              prose: [
                'Dictionaries require keys to be immutable so their internal hash values never change. You cannot use a list like `[0, 0]` as a dictionary key to represent a coordinate. How can we use a composite value—like a grid coordinate `(x, y)`—as a key to map to a location string?',
                'Output: ```text unhashable type: \'list\' True ``` This proves that tuples are **hashable** (if their contents are hashable), allowing them to be used as dictionary keys. Lists are unhashable and will raise a `TypeError`.'
              ],
              typeIt: true,
              solution: 'd = {}\nt = (0, 0)\nd[t] = "start"\n\ntry:\n    d[[0, 0]] = "end"\nexcept TypeError as e:\n    print(e)\n    \nprint(hash(t) == hash((0, 0)))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Tuples as dict keys — hashability — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def map_grid():`: Defines a function.\n- `grid = {(0, 0): \'start\', (3, 4): \'end\'}`: Creates a dictionary where the keys are tuple literals (`(0, 0)` and `(3, 4)`) and the values are strings.\n- `return grid[(0, 0)]`: Looks up the value associated with the tuple key `(0, 0)` and returns it.',
                '**Expected behavior.** Predicted confidently: `\'start\'`',
                '**CS lens.** This is **Hashability**. For a hash table to function, the hash of a key must remain constant over time. This appears in Java\'s `hashCode()` contract, Cryptographic hashes (SHA-256) where any change to input radically changes the output, database indexing strategies, and Content-Addressable Storage systems (like Git\'s internal objects).',
                '**SE lens.** The design principle is **Contract Enforcement**. Python enforces at runtime that only hashable types can be dict keys. The alternative NOT chosen is allowing mutable keys but warning the user not to change them (which C++\'s `std::map` historically allowed, leading to hard-to-find bugs when elements were modified). The tradeoff is that if you have a tuple containing a list, that tuple is suddenly no longer hashable, meaning hashability depends deeply on the entire contents of the tuple.'
              ],
              typeIt: true,
              solution: 'def map_grid():\n    grid = {(0, 0): \'start\', (3, 4): \'end\'}\n    return grid[(0, 0)]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'When to use tuple vs. list',
              prose: [
                'Both lists and tuples hold ordered sequences of items, and both support indexing and slicing. If you can do almost everything with a list, why shouldn\'t you just use lists for everything? How do you decide which sequence type to use when designing a program?',
                'Output: ```text True ``` This proves that tuples are a lighter, fixed-size structure. A tuple is best used as a **heterogeneous record** (different types, fixed structure), while a list is best for a **homogeneous collection** (same type, variable size).'
              ],
              typeIt: true,
              solution: 'import sys\nmy_list = [1, "two", 3.0]\nmy_tuple = (1, "two", 3.0)\nprint(sys.getsizeof(my_list) > sys.getsizeof(my_tuple))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'When to use tuple vs. list — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def process_records():`: Defines a function.\n- `people = [("Alice", 25), ("Bob", 30)]`: Creates a list named `people`. Inside the list are two tuple literals. The list can grow or shrink, but each tuple strictly holds a name string and an age integer.\n- `return people[0][1]`: Accesses the first element of the list (the tuple `("Alice", 25)`), and then accesses the second element of that tuple (the integer `25`).',
                '**Expected behavior.** Predicted confidently: `25`',
                '**CS lens.** This is **Data Modeling / Structuring**. This pattern appears in Relational Databases (a table is a list of rows, and each row is a fixed-schema tuple), JSON arrays of objects, CSV files (where lines are homogeneous, but columns are heterogeneous), and C `struct` arrays.',
                '**SE lens.** The design principle is **Intent Disclosure**. Using a tuple signals to any programmer reading your code: "This structure has a specific, unchanging shape." The alternative NOT chosen is using a list of lists. The tradeoff is that you cannot dynamically add new fields (like an address) to the tuple at runtime; if your data needs to morph, a dictionary or an object is a better choice.'
              ],
              typeIt: true,
              solution: 'def process_records():\n    # List of heterogeneous tuples\n    people = [("Alice", 25), ("Bob", 30)]\n    return people[0][1]',
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
      'Next lesson: Dictionaries.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Immutability"?',
      options: [
        'A sequence of values separated by commas, often enclosed in parentheses, representing a fixed-size ordered collection.',
        'The property of an object whose state cannot be modified after it is created. It guarantees the data will not change.',
        'The act of grouping multiple values into a single tuple object without explicitly writing parentheses.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Hashability"?',
      options: [
        'Using an asterisk () during unpacking to gather multiple remaining elements of a sequence into a list.',
        'A property of an object that means it has a hash value which never changes during its lifetime, allowing it to be used as a dictionary key or in a set.',
        'The act of grouping multiple values into a single tuple object without explicitly writing parentheses.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Tuple literal"?',
      options: [
        'The act of assigning the individual elements of a tuple to a sequence of variables in a single statement.',
        'A sequence of values separated by commas, often enclosed in parentheses, representing a fixed-size ordered collection.',
        'A property of an object that means it has a hash value which never changes during its lifetime, allowing it to be used as a dictionary key or in a set.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Packing"?',
      options: [
        'Using an asterisk () during unpacking to gather multiple remaining elements of a sequence into a list.',
        'The act of grouping multiple values into a single tuple object without explicitly writing parentheses.',
        'The property of an object whose state cannot be modified after it is created. It guarantees the data will not change.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Tuple literal** — A sequence of values separated by commas, often enclosed in parentheses, representing a fixed-size ordered collection.',
    '**Immutability** — The property of an object whose state cannot be modified after it is created. It guarantees the data will not change.',
    '**Packing** — The act of grouping multiple values into a single tuple object without explicitly writing parentheses.',
    '**Unpacking** — The act of assigning the individual elements of a tuple to a sequence of variables in a single statement.',
    '**Star unpacking** — Using an asterisk () during unpacking to gather multiple remaining elements of a sequence into a list.',
    '**Hashability** — A property of an object that means it has a hash value which never changes during its lifetime, allowing it to be used as a dictionary key or in a set.',
    '**Record** — A data structure (often a tuple in Python) that groups related, heterogeneous fields together (like a row in a database).',
  ],

  checkpoints: ['read-intuition'],
}
