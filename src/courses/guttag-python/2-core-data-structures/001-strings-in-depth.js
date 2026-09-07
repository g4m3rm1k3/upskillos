// Guttag — Lesson 6: Strings in Depth
// Auto-converted from src/docs/tutorials/guttag-python/lesson-06.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-06-strings-in-depth',
  slug: 'strings-in-depth',
  chapter: 2,
  order: 1,
  title: 'Strings in Depth',
  subtitle: 'Data: Python\'s Core Structures',
  tags: ['index', 'slice', 'immutability', 'f-string', 'iteration'],

  hook: {
    question: 'What is "Strings in Depth", and why does it matter?',
    realWorldContext: 'The reader understands Python strings as immutable sequences of Unicode characters: indexing, slicing, common methods, string formatting with f-strings, and the split/join pattern. The transferable insight: a string is a sequence. Every sequence operation (len, indexing, slicing, iteration, in) works on strings. Immutability means \'modification\' always produces a new string. This is safe but can be expensive if done in a loop (use join instead).',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Strings as sequences — indexing and slicing, Immutability — strings cannot be changed in place, String methods — the built-in toolkit, String formatting — f-strings and format(), The split/join pattern — working with structured text.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Index:** A zero-based integer representing a position in a sequence. It exists to provide constant-time access to any element.\n- **Slice:** A sub-sequence extracted using start, stop, and step indices. It exists to efficiently read portions of data without manual loops.\n- **Immutability:** The property of an object whose state cannot be modified after it is created. It exists to guarantee safe sharing of data across a program without unexpected side-effects.\n- **f-string:** A formatted string literal. It exists to interpolate expressions directly into string constants cleanly and safely.\n- **Iteration:** The process of processing each item in a sequence sequentially. It exists to apply uniform logic to a collection of items.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **len:** A built-in function that returns the number of items in a sequence.\n- **str.upper:** A string method that returns a copy of the string converted to uppercase.\n- **str.split:** A string method that returns a list of substrings.\n- **str.join:** A string method that concatenates an iterable of strings.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace how all of these sequence operations and methods work together on a simple input like `\'Alice,30,Engineer\'`. First, we can test membership (`\'Alice\' in text`) or find its length (`len(text)`). Because strings are immutable, we can\'t change the characters directly; instead, we rely on the split/join pattern. `text.split(\',\')` produces `[\'Alice\', \'30\', \'Engineer\']`. We can access individual fields using zero-based indexing (`fields[0]` gives `\'Alice\'`), extract slices if needed, or apply methods like `upper()` to generate new string copies. Finally, we can reconstruct a completely new string efficiently using `" | ".join(fields)` or precisely format the output using an f-string like `f"Name: {fields[0]} | Role: {fields[2]}"`, safely managing textual data through sequences and immutability across the entire pipeline.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 6: Strings in Depth',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Strings in Depth',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Strings as sequences — indexing and slicing',
              prose: [
                'If we have a string representing a fixed-width record, how do we access just the characters representing a specific field? How can we get just the first character? How can we process each character one by one?',
                'This proves that **indexing and slicing** provide direct access to parts of a sequence, and standard sequence operations like `len()` and `in` work natively on strings.'
              ],
              typeIt: true,
              solution: 'text = "Python"\nprint(text[0])       # P\nprint(text[-1])      # n\nprint(text[0:4])     # Pyth\nprint(text[::-1])    # nohtyP\nprint(len(text))     # 6\nprint(\'y\' in text)   # True',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Strings as sequences — indexing and slicing — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def get_prefix(record: str) -> str:` defines a function taking a string and returning a string.\n- `return` sends the evaluated result back to the caller.\n- `record` accesses the passed argument string.\n- `[` begins the slice syntax.\n- `0` is the starting index (inclusive).\n- `:` separates the start and stop indices.\n- `3` is the stop index (exclusive).\n- `]` ends the slice syntax.',
                '**Expected behavior.** Predicted confidently: calling `get_prefix("ABCDE")` returns `\'ABC\'`.',
                '**CS lens.** Sequence data structures. This appears in arrays in C, lists in Lisp, memory buffers in networking, and file streams in operating systems.',
                '**SE lens.** Zero-based indexing is a design principle. The alternative NOT chosen is 1-based indexing (like in Lua or R). The real tradeoff is that 0-based indexing makes calculating offsets easier (distance = stop - start), but it is slightly less intuitive for non-programmers.'
              ],
              typeIt: true,
              solution: 'def get_prefix(record: str) -> str:\n    return record[0:3]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Immutability — strings cannot be changed in place',
              prose: [
                'What if we want to capitalize just the first letter of a string in memory? Why can\'t we just assign `text[0] = \'H\'` like we do with arrays in other languages?',
                'This proves **Immutability**. Strings cannot be modified in place; you must construct and return a completely new string.'
              ],
              typeIt: true,
              solution: 'text = "hello"\ntry:\n    text[0] = "H"\nexcept TypeError as e:\n    print(e)  # \'str\' object does not support item assignment\n\ntext = "H" + text[1:]\nprint(text)   # Hello',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Immutability — strings cannot be changed in place — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def capitalize_record(record: str) -> str:` defines the function.\n- `if len(record) == 0:` checks if the string is empty.\n- `return record` returns the empty string safely.\n- `return` sends the result back.\n- `record[0]` gets the first character.\n- `.upper()` calls the method to return an uppercase version of that character.\n- `+` concatenates two strings.\n- `record[1:]` slices the string from index 1 to the end.',
                '**Expected behavior.** Predicted confidently: calling `capitalize_record("test")` returns `\'Test\'`.',
                '**CS lens.** Immutability. This appears in functional programming (Haskell), version control (Git commits), database transaction logs, and concurrent lock-free data structures.',
                '**SE lens.** Value semantics vs Reference semantics. The design principle is safe sharing. Alternative NOT chosen: mutable strings (like C `char[]`). The real tradeoff is that immutability prevents bugs from accidental side-effects when passing strings around, but requires more memory allocation since every "modification" creates a new copy.'
              ],
              typeIt: true,
              solution: 'def capitalize_record(record: str) -> str:\n    if len(record) == 0:\n        return record\n    return record[0].upper() + record[1:]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'String methods — the built-in toolkit',
              prose: [
                'If building strings manually is tedious, how do we easily perform common text manipulations like removing extra whitespace or making everything lowercase? Do we have to slice and concatenate manually every time?',
                'This proves that **string methods** exist to handle common text parsing and formatting needs out-of-the-box.'
              ],
              typeIt: true,
              solution: 'raw = "  hello world  "\nprint(f"\'{raw.strip()}\'")       # \'hello world\'\nprint(raw.replace("o", "0"))    #   hell0 w0rld  \nprint(raw.startswith(" "))      # True',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'String methods — the built-in toolkit — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def clean_record(record: str) -> str:` defines the function.\n- `return` sends the result back.\n- `record` is the input string.\n- `.strip()` is a method call that returns a new string with leading/trailing whitespace removed.\n- `.replace(" ", "_")` is a method call on the returned string that replaces all space characters with underscores.',
                '**Expected behavior.** Predicted confidently: calling `clean_record(" some data ")` returns `\'some_data\'`.',
                '**CS lens.** Standard libraries and common APIs. This appears in regex engines, POSIX text utilities (sed/awk), browser DOM string APIs, and SQL string functions.',
                '**SE lens.** Method chaining. The alternative NOT chosen is procedural calls like `replace(strip(record), " ", "_")`. The real tradeoff is that method chaining (fluent interfaces) reads left-to-right matching the order of operations, which is highly readable, but can be hard to debug if an intermediate step fails.'
              ],
              typeIt: true,
              solution: 'def clean_record(record: str) -> str:\n    return record.strip().replace(" ", "_")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'String formatting — f-strings and format()',
              prose: [
                'How do we efficiently inject variables into a string template? Do we really have to use `+` to concatenate strings and manually cast numbers with `str(n)` every time?',
                'This proves that **f-strings** evaluate expressions embedded in curly braces and automatically cast the results to strings inside the template.'
              ],
              typeIt: true,
              solution: 'name = "Alice"\nage = 30\nprint(f"User {name} is {age} years old.")\n# User Alice is 30 years old.',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'String formatting — f-strings and format() — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def format_log(name: str, score: float) -> str:` defines the function.\n- `return` sends the result back.\n- `f"` indicates the start of an f-string literal.\n- `Record: ` is literal text.\n- `{` begins an interpolation block.\n- `name.upper()` evaluates to the uppercase name.\n- `}` ends the interpolation block.\n- ` | Score: ` is literal text.\n- `{` begins another interpolation block.\n- `score` is the float variable.\n- `:.2f` is a format specifier telling Python to display the float with 2 decimal places.\n- `}` ends the block.\n- `"` ends the string literal.',
                '**Expected behavior.** Predicted confidently: calling `format_log("bob", 95.1234)` returns `\'Record: BOB | Score: 95.12\'`.',
                '**CS lens.** String interpolation and macro expansion. This appears in Bash shell variable expansion, HTML templating engines (Jinja/React JSX), C\'s `printf`, and SQL prepared statements.',
                '**SE lens.** Declarative formatting. The alternative NOT chosen is string concatenation (`"Record: " + name.upper() + ...`). The real tradeoff is that interpolation is vastly more readable and less error-prone regarding type conversion, though it requires the language parser to understand special string syntax.'
              ],
              typeIt: true,
              solution: 'def format_log(name: str, score: float) -> str:\n    return f"Record: {name.upper()} | Score: {score:.2f}"',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'The split/join pattern — working with structured text',
              prose: [
                'If we are given a string representing a CSV row like `"Alice,30,Engineer"`, how do we break it down into usable pieces, process them, and reassemble them into a new format?',
                'This proves the **split/join pattern**: `split` breaks a delimiter-separated string into a list, and `join` glues an iterable of strings back into a single string using a specified separator.'
              ],
              typeIt: true,
              solution: 'line = "a,b,c"\nparts = line.split(",")\nprint(parts)               # [\'a\', \'b\', \'c\']\nnew_line = "-".join(parts) \nprint(new_line)            # a-b-c',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'The split/join pattern — working with structured text — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def reformat_csv(line: str) -> str:` defines the function.\n- `fields =` assigns the result to a variable.\n- `line` is the input string.\n- `.split(",")` calls the method to divide the string at commas, returning a list.\n- `return` sends the result back.\n- `" | "` is a literal string that will act as the separator.\n- `.join(fields)` calls the method on the separator, passing the list of strings to be combined.',
                '**Expected behavior.** Predicted confidently: calling `reformat_csv("Alice,30,Engineer")` returns `\'Alice | 30 | Engineer\'`.',
                '**CS lens.** Serialization and deserialization. This appears in parsing network packets, reading environment variables (like `PATH`), breaking down command line arguments, and processing log files.',
                '**SE lens.** O(N) string construction. The alternative NOT chosen is looping over the fields and using `+=` to append strings. The real tradeoff is that `join` calculates the final required memory size once and allocates exactly what is needed, avoiding the O(N^2) overhead of repeatedly reallocating memory for immutable strings during a loop.'
              ],
              typeIt: true,
              solution: 'def reformat_csv(line: str) -> str:\n    fields = line.split(",")\n    return " | ".join(fields)',
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
      'Next lesson: Lists.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Iteration"?',
      options: [
        'The process of processing each item in a sequence sequentially. It exists to apply uniform logic to a collection of items.',
        'A zero-based integer representing a position in a sequence. It exists to provide constant-time access to any element.',
        'A formatted string literal. It exists to interpolate expressions directly into string constants cleanly and safely.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Slice"?',
      options: [
        'A sub-sequence extracted using start, stop, and step indices. It exists to efficiently read portions of data without manual loops.',
        'A zero-based integer representing a position in a sequence. It exists to provide constant-time access to any element.',
        'The process of processing each item in a sequence sequentially. It exists to apply uniform logic to a collection of items.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "f-string"?',
      options: [
        'The property of an object whose state cannot be modified after it is created. It exists to guarantee safe sharing of data across a program without unexpected side-effects.',
        'A sub-sequence extracted using start, stop, and step indices. It exists to efficiently read portions of data without manual loops.',
        'A formatted string literal. It exists to interpolate expressions directly into string constants cleanly and safely.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Index"?',
      options: [
        'The property of an object whose state cannot be modified after it is created. It exists to guarantee safe sharing of data across a program without unexpected side-effects.',
        'A sub-sequence extracted using start, stop, and step indices. It exists to efficiently read portions of data without manual loops.',
        'A zero-based integer representing a position in a sequence. It exists to provide constant-time access to any element.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Index** — A zero-based integer representing a position in a sequence. It exists to provide constant-time access to any element.',
    '**Slice** — A sub-sequence extracted using start, stop, and step indices. It exists to efficiently read portions of data without manual loops.',
    '**Immutability** — The property of an object whose state cannot be modified after it is created. It exists to guarantee safe sharing of data across a program without unexpected side-effects.',
    '**f-string** — A formatted string literal. It exists to interpolate expressions directly into string constants cleanly and safely.',
    '**Iteration** — The process of processing each item in a sequence sequentially. It exists to apply uniform logic to a collection of items.',
  ],

  checkpoints: ['read-intuition'],
}
