// Guttag — Lesson 21: Program Structure
// Auto-converted from src/docs/tutorials/guttag-python/lesson-21.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-21-program-structure',
  slug: 'program-structure',
  chapter: 3,
  order: 7,
  title: 'Program Structure',
  subtitle: 'Decomposition and Style',
  tags: ['decomposition', 'pep-8', 'docstrings', 'module-guard', 'magic-numbers'],

  hook: {
    question: 'What is "Program Structure", and why does it matter?',
    realWorldContext: 'The reader understands how to decompose a program into well-named functions, follow PEP 8 style, write good docstrings, use the if __name__ == \'__main__\' guard, and structure a module for reuse. The transferable insight: decomposition is the act of breaking a problem into sub-problems that can be solved independently. A well-decomposed program has functions that each do ONE thing, have meaningful names, and are short enough to understand at a glance.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Decomposition — one function, one job, PEP 8 — Python style guide, Docstrings — documentation as code, if __name__ == \'__main__\' — module guard, Constants, magic numbers, and named values.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Decomposition:** breaking a problem into sub-problems that can be solved independently.\n- **PEP 8:** Python\'s style guide to make code readable and consistent.\n- **Docstrings:** documentation strings embedded directly in Python code.\n- **Module guard:** the if __name__ == \'__main__\': construct preventing code execution upon import.\n- **Magic numbers:** unexplained numerical values in code that should be replaced with named constants.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **open:** Built-in function to open a file.\n- **readlines:** File object method.\n- **strip:** String method.\n- **split:** String method.\n- **sorted:** Built-in function.\n- **help:** Built-in function.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We started with a monolithic, hard-to-read, 30-line script. We **decomposed** it into 5 focused functions, making each part testable. We applied **PEP 8** style guidelines so anyone can read it smoothly. We wrote **docstrings** so callers know the contract without reading the implementation. We added a **module guard** (`if __name__ == \'__main__\':`) so the file can be safely imported elsewhere. Finally, we extracted **magic numbers** into named constants to create a single source of truth. The result is a professional, reusable Python module.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 21: Program Structure',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Program Structure',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Decomposition — one function, one job',
              prose: [
                'When you write a single script that reads a file, parses the data, filters it, sorts it, and prints it, testing any single part of that process becomes nearly impossible. How do you test just the sorting logic if the only way to run it is to provide a real file? What if another part of the program needs to parse a similar line of data?',
                'Predicted confidently: `14`. This proves **Decomposition**. By breaking the pipeline into independent functions, we can verify `add` and `multiply` on their own, outside the context of `math_pipeline`.'
              ],
              typeIt: true,
              solution: '# Throwaway example demonstrating the concept\ndef add(a, b):\n    return a + b\n\ndef multiply(a, b):\n    return a * b\n\ndef math_pipeline(x, y):\n    sum_val = add(x, y)\n    return multiply(sum_val, 2)\n\nprint(math_pipeline(3, 4))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Decomposition — one function, one job — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def read_scores(filename):` defines a function taking a string path.\n- `with open(filename) as f:` opens the file context safely.\n- `return f.readlines()` reads all lines and returns them as a list of strings.\n- `def parse_score_line(line):` defines a parser for a single line.\n- `parts = line.strip().split(\',\')` cleans whitespace and splits by comma.\n- `if len(parts) != 2: return None` checks validity and returns `None` on failure.\n- `return parts[0], int(parts[1])` returns a tuple of name and integer score.\n- `def sort_scores(scores):` defines a sorting function.\n- `return sorted(scores, key=lambda x: x[1], reverse=True)` sorts the list of tuples by the second element descending.\n- `def print_scores(scores):` defines the output function.\n- `for name, score in scores:` unpacks each tuple.\n- `print(f\'{name}: {score}\')` prints it cleanly.\n- `def process_data(filename):` the main driver function.\n- `lines = read_scores(filename)` gets lines.\n- `scores = [parse_score_line(l) for l in lines]` parses them into tuples (or None).\n- `scores = [s for s in scores if s is not None]` filters out the invalid parsing results.\n- `print_scores(sort_scores(scores))` sorts and prints the clean data.',
                '**Expected behavior.** Predicted confidently: Assuming a valid `scores.csv`, it will print `Name: Score` in descending order of scores.',
                '**CS lens.** **Decomposition**. In computer science, decomposition is breaking a complex problem down into highly cohesive, loosely coupled parts. You see this in: microservices architecture, CPU instruction pipelining, and network OSI layers.',
                '**SE lens.** **Single Responsibility Principle (SRP)**. Every function should have one reason to change. The alternative is a monolithic script, which makes changes risky since touching the sort logic could inadvertently break file reading. We trade slightly more boilerplate (function definitions) for vastly improved testability and maintainability.'
              ],
              typeIt: true,
              solution: 'def read_scores(filename):\n    with open(filename) as f:\n        return f.readlines()\n\ndef parse_score_line(line):\n    parts = line.strip().split(\',\')\n    if len(parts) != 2:\n        return None\n    return parts[0], int(parts[1])\n\ndef sort_scores(scores):\n    return sorted(scores, key=lambda x: x[1], reverse=True)\n\ndef print_scores(scores):\n    for name, score in scores:\n        print(f\'{name}: {score}\')\n\ndef process_data(filename):\n    lines = read_scores(filename)\n    scores = [parse_score_line(l) for l in lines]\n    scores = [s for s in scores if s is not None]\n    print_scores(sort_scores(scores))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'PEP 8 — Python style guide',
              prose: [
                'If ten developers write Python in ten different styles (different indentation, capitalization, spacing), reading their combined code is exhausting. How do we ensure any Python programmer can read any other Python programmer\'s code without style friction?',
                'Predicted confidently: Both behave identically. This proves **PEP 8** style compliance doesn\'t change execution, but standardizes formatting (e.g. 4 spaces, snake_case).'
              ],
              typeIt: true,
              solution: '# Throwaway code breaking style\ndef calculateAverage(Numbers):\n  return sum(Numbers)/len(Numbers)\n\n# Throwaway code following PEP 8\ndef calculate_average(numbers):\n    return sum(numbers) / len(numbers)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'PEP 8 — Python style guide — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `MAX_RETRIES = 3` defines a constant in UPPER_SNAKE_CASE.\n- `class StudentRecord:` defines a class in CamelCase.\n- `pass` is a placeholder.\n- `def calculate_average(numbers):` defines a function in snake_case.\n- `if not numbers:` handles an empty list cleanly.\n- `return 0.0` early exit.\n- `return sum(numbers) / len(numbers)` has spaces around the division operator.',
                '**Expected behavior.** Predicted confidently: No runtime output, but tools like `black` will reformat the code to match these rules automatically.',
                '**CS lens.** **Coding Standards**. Universal conventions in programming reduce cognitive load. You see this in C++ style guides, the `gofmt` tool in Go, and REST API naming conventions.',
                '**SE lens.** **Readability over writeability**. Python\'s creator, Guido van Rossum, noted that code is read much more often than it is written. Following PEP 8 makes your code instantly recognizable to others. We avoid personalized styling in favor of community consensus.'
              ],
              typeIt: true,
              solution: 'MAX_RETRIES = 3\n\nclass StudentRecord:\n    pass\n\ndef calculate_average(numbers):\n    if not numbers:\n        return 0.0\n    return sum(numbers) / len(numbers)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Docstrings — documentation as code',
              prose: [
                'How does a developer calling `parse_score_line` know what to pass in and what it returns, without having to read and trace the function\'s internal implementation?',
                'Predicted confidently: `Multiply two numbers.`. This proves **Docstrings**. Python attaches the first string literal of a function to its `__doc__` attribute.'
              ],
              typeIt: true,
              solution: 'def multiply(a, b):\n    """\n    Multiply two numbers.\n    """\n    return a * b\n\nprint(multiply.__doc__.strip())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Docstrings — documentation as code — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `"""` opens a multi-line string literal immediately after the function signature.\n- `Parse a CSV line...` provides a summary.\n- `Args:` describes the parameters and their types.\n- `Returns:` describes the return value and type.\n- `try:` attempts to execute code that might raise an exception.\n- `return parts[0], int(parts[1])` parses the int; if it fails, a `ValueError` occurs.\n- `except ValueError:` catches specifically a ValueError.\n- `return None` handles the error by returning None as promised in the docstring.',
                '**Expected behavior.** Predicted confidently: `help(parse_score_line)` will print the formatted docstring to the terminal.',
                '**CS lens.** **Interface Contracts**. A docstring defines the contract between the caller and the callee. You see this in JavaDocs, OpenAPI specifications, and statically typed function signatures.',
                '**SE lens.** **Documentation as Code**. Keeping documentation inside the code file ensures it travels with the code and is updated alongside it. Alternative is an external wiki, which inevitably falls out of sync.'
              ],
              typeIt: true,
              solution: 'def parse_score_line(line):\n    """\n    Parse a CSV line of format \'name,score\' into a (str, int) tuple.\n\n    Args:\n        line (str): A single CSV line, e.g. \'Alice,95\'\n\n    Returns:\n        tuple[str, int] | None: (name, score) if valid, else None\n\n    Examples:\n        >>> parse_score_line(\'Alice,95\')\n        (\'Alice\', 95)\n        >>> parse_score_line(\'bad_line\')\n        None\n    """\n    parts = line.strip().split(\',\')\n    if len(parts) != 2:\n        return None\n    try:\n        return parts[0], int(parts[1])\n    except ValueError:\n        return None',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'if __name__ == \'__main__\' — module guard',
              prose: [
                'If we `import process_data` in another script just to use the `sort_scores` function, Python will immediately run the `process_data(\'scores.csv\')` logic at the bottom of the file. How can we make a script act as a library when imported, but a runnable program when executed directly?',
                'Predicted confidently: Prints "Running directly" if executed as a script, but nothing if imported. This proves the **Module guard**. Python automatically sets the special `__name__` variable to `\'__main__\'` for the primary executed script.'
              ],
              typeIt: true,
              solution: '# Throwaway module guard\ndef main():\n    print("Running directly")\n\nif __name__ == \'__main__\':\n    main()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'if __name__ == \'__main__\' — module guard — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def main():` defines an entry point function.\n- `process_data(\'scores.csv\')` calls our driver function.\n- `if __name__ == \'__main__\':` checks the built-in `__name__` string.\n- `main()` executes the program only if the check passes.',
                '**Expected behavior.** Predicted confidently: Will execute `main()` and process the CSV file. `import process_data` will not execute `main()`.',
                '**CS lens.** **Entry Points**. Programs need a designated start location. You see this in `public static void main(String[] args)` in Java, `int main()` in C, and `package main` in Go.',
                '**SE lens.** **Reusability**. By separating definition from execution, one file serves two roles: a command-line utility and an importable library. Without this, you would have to maintain two separate files.'
              ],
              typeIt: true,
              solution: 'def main():\n    process_data(\'scores.csv\')\n\nif __name__ == \'__main__\':\n    main()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Constants, magic numbers, and named values',
              prose: [
                'If someone sees `if score >= 90:` in the code, they might guess what 90 means, but what if they see `if rate == 1.42:`? Unexplained "magic numbers" make code hard to read and hard to change across multiple locations.',
                'Predicted confidently: Both behave identically. This proves **Magic numbers** can be replaced by named constants to provide context and a single source of truth.'
              ],
              typeIt: true,
              solution: '# Throwaway magic numbers\ndef is_passing(score):\n    return score >= 65\n\n# Throwaway named constants\nPASSING_SCORE = 65\n\ndef is_passing_constant(score):\n    return score >= PASSING_SCORE',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Constants, magic numbers, and named values — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `MIN_SCORE = 0` creates a constant integer.\n- `MAX_SCORE = 100` creates a constant integer.\n- `GRADE_THRESHOLDS = {\'A\': 90, \'B\': 80, \'C\': 70}` creates a constant dictionary mapping strings to integers.\n- `def is_valid_score(score):` takes a score.\n- `return MIN_SCORE <= score <= MAX_SCORE` uses chained comparison using the named constants.\n- `def grade(score):` takes a score.\n- `for letter, threshold in sorted(...):` iterates through the dictionary sorted by values descending.\n- `key=lambda kv: kv[1]` extracts the dictionary value (threshold) for sorting.\n- `if score >= threshold: return letter` matches the highest threshold reached.\n- `return \'F\'` is the fallback.',
                '**Expected behavior.** Predicted confidently: `grade(85)` will evaluate thresholds [90, 80, 70] and return `\'B\'`.',
                '**CS lens.** **Configuration vs Logic**. Extracting values from algorithms separates business rules (thresholds) from pure logic (sorting and checking). You see this in `.env` files, config maps in Kubernetes, and externalized string resources in Android.',
                '**SE lens.** **Single Source of Truth**. If the passing grade changes from 70 to 65, you only update the constant `GRADE_THRESHOLDS`. If it was a magic number, you would have to find and replace every instance in the codebase, risking a miss.'
              ],
              typeIt: true,
              solution: 'MIN_SCORE = 0\nMAX_SCORE = 100\nGRADE_THRESHOLDS = {\'A\': 90, \'B\': 80, \'C\': 70}\n\ndef is_valid_score(score):\n    return MIN_SCORE <= score <= MAX_SCORE\n\ndef grade(score):\n    for letter, threshold in sorted(GRADE_THRESHOLDS.items(),\n                                     key=lambda kv: kv[1], reverse=True):\n        if score >= threshold:\n            return letter\n    return \'F\'',
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
      'Next lesson: Classes.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Module guard"?',
      options: [
        'the if __name__ == \'__main__\': construct preventing code execution upon import.',
        'unexplained numerical values in code that should be replaced with named constants.',
        'documentation strings embedded directly in Python code.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Decomposition"?',
      options: [
        'unexplained numerical values in code that should be replaced with named constants.',
        'documentation strings embedded directly in Python code.',
        'breaking a problem into sub-problems that can be solved independently.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Docstrings"?',
      options: [
        'Python\'s style guide to make code readable and consistent.',
        'unexplained numerical values in code that should be replaced with named constants.',
        'documentation strings embedded directly in Python code.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "PEP 8"?',
      options: [
        'breaking a problem into sub-problems that can be solved independently.',
        'Python\'s style guide to make code readable and consistent.',
        'documentation strings embedded directly in Python code.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Decomposition** — breaking a problem into sub-problems that can be solved independently.',
    '**PEP 8** — Python\'s style guide to make code readable and consistent.',
    '**Docstrings** — documentation strings embedded directly in Python code.',
    '**Module guard** — the if __name__ == \'__main__\': construct preventing code execution upon import.',
    '**Magic numbers** — unexplained numerical values in code that should be replaced with named constants.',
  ],

  checkpoints: ['read-intuition'],
}
