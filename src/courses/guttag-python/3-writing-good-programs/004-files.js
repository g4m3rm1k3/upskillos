// Guttag — Lesson 18: Files
// Auto-converted from src/docs/tutorials/guttag-python/lesson-18.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-18-files',
  slug: 'files',
  chapter: 3,
  order: 4,
  title: 'Files',
  subtitle: 'Reading, Writing, and with',
  tags: ['file-object', 'context-manager', 'file-mode'],

  hook: {
    question: 'What is "Files", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: open() and file modes, The with statement — guaranteed cleanup, Reading line by line — memory-efficient iteration, Writing, appending, and CSV, Paths with pathlib and os.path.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **file object:** A Python object that provides methods to read from and write to a file on disk. It is an iterator over the lines of the file.\n- **context manager:** An object that implements __enter__ and __exit__, ensuring that resources are properly acquired and released, typically used with the with statement.\n- **file mode:** A string indicating how a file is opened, such as \'r\' for reading, \'w\' for writing, \'a\' for appending.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We learned to open files in write mode and safely manage them using `with` and the context manager. When writing CSV data using `csv.writer`, the file handles formatting seamlessly, and we can append rows dynamically. We then learned how memory-efficient reading works: by iterating `for row in reader`, we read and parse one row at a time. If we run a trace writing `scores.csv`, reading it back, and filtering rows where the score > 90, we create the file context, wrap it in a writer, and save to disk; then we re-open it, iterate via `csv.reader`, check the row\'s second element, and print matches — all without ever loading the entire dataset into memory at once. Finally, `pathlib` ensures this pipeline operates safely across different operating systems.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 18: Files',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Files',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'open() and file modes',
              prose: [
                'How do we save data to a file on our hard drive, and how do we retrieve it later? If we just keep data in memory, it is lost when the program terminates. What would you try first to write to a file in Python? How would you retrieve it?',
                'This demonstrates **file I/O**. Trace: `open(\'data.txt\', \'w\')`: creates/truncates `data.txt`, returns file object `f`. `f.write(\'Hello, World!\\n\')`: writes 14 bytes. `with` block ends: `__exit__` calls `f.close()`. Second `with`: open for reading. `f.read()`: reads all bytes as str. `repr()` shows `\\n` escapes. This proves we can persist data.'
              ],
              typeIt: true,
              solution: '# open(path, mode, encoding)\n# Modes: \'r\' read (default), \'w\' write (creates/truncates),\n#        \'a\' append, \'x\' exclusive create, \'b\' binary, \'+\' update\n\n# Write a file:\nwith open(\'data.txt\', \'w\', encoding=\'utf-8\') as f:\n    f.write(\'Hello, World!\\n\')\n    f.write(\'Line two\\n\')\n\n# Read it back:\nwith open(\'data.txt\', \'r\', encoding=\'utf-8\') as f:\n    content = f.read()   # reads entire file as one string\n    print(repr(content)) # \'Hello, World!\\nLine two\\n\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'open() and file modes — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def save_greeting(filename):` defines a function.\n- `with open(...) as f:` opens the file for writing and assigns the file object to `f`.\n- `f.write(...)` writes the string to the file on disk.',
                '**Expected behavior.** Predicted confidently: A file named whatever `filename` evaluates to is created with the string content.',
                '**CS lens.** File system interaction. 3-5 unrelated real-world places it appears: Log files on web servers, saving a game state on a console, configuration files in /etc on Linux, caching HTTP responses to disk.',
                '**SE lens.** Persisting state. The alternative NOT chosen: keeping everything in memory. Real tradeoff: disk is significantly slower than RAM, but it outlives the process.'
              ],
              typeIt: true,
              solution: 'def save_greeting(filename):\n    with open(filename, \'w\', encoding=\'utf-8\') as f:\n        f.write(\'Welcome to the project!\\n\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'The with statement — guaranteed cleanup',
              prose: [
                'What happens if our code crashes while writing to a file? Will the file stay locked or corrupted? How do we ensure cleanup always happens?',
                'This demonstrates the **context manager**. Trace: `with open(...) as f`: calls `f.__enter__()` which returns `f`. Block executes. Normal exit or exception: Python calls `f.__exit__()`. `__exit__` calls `f.close()`. `f.closed` becomes `True`.'
              ],
              typeIt: true,
              solution: '# WITHOUT with: risky (file stays open on exception)\nf = open(\'data.txt\', \'r\')\ntry:\n    content = f.read()\nfinally:\n    f.close()   # must remember this\n\n# WITH with: automatic cleanup\nwith open(\'data.txt\', \'r\', encoding=\'utf-8\') as f:\n    content = f.read()\n# f is automatically closed here, even if read() raises\n\n# with works on anything implementing __enter__ / __exit__\n# File objects implement the context manager protocol\nprint(f.closed)  # True (after with block)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'The with statement — guaranteed cleanup — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `print(...)` outputs to stdout.\n- `f.closed` accesses the boolean attribute of the file object indicating closure.',
                '**Expected behavior.** Predicted confidently: Prints "File filename is automatically closed: True".',
                '**CS lens.** Resource management. 3-5 unrelated real-world places it appears: Database connections, network sockets, thread locks, hardware device handles.',
                '**SE lens.** RAII (Resource Acquisition Is Initialization). The alternative NOT chosen: manual `close()` calls everywhere. Real tradeoff: manual calls are prone to programmer error if exceptions skip the cleanup code.'
              ],
              typeIt: true,
              solution: '        print(f"File {filename} is automatically closed: {f.closed}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Reading line by line — memory-efficient iteration',
              prose: [
                'If a log file is 10 GB and our server only has 2 GB of RAM, how can we process it? What happens if we try to read it all at once?',
                'This demonstrates **file iteration**. Trace: `for line in f`: Python calls `next(f)` repeatedly. Each call reads one line from disk. When EOF: raises `StopIteration`. Loop ends. Only one line in memory at a time.'
              ],
              typeIt: true,
              solution: '# Write multi-line file:\nwith open(\'names.txt\', \'w\') as f:\n    for name in [\'Alice\', \'Bob\', \'Charlie\', \'Diana\']:\n        f.write(name + \'\\n\')\n\n# Method 1: readlines() — loads all into memory as list\nwith open(\'names.txt\') as f:\n    lines = f.readlines()   # [\'Alice\\n\', \'Bob\\n\', ...]\n    names = [l.strip() for l in lines]\nprint(names)  # [\'Alice\', \'Bob\', \'Charlie\', \'Diana\']\n\n# Method 2: iterate directly — one line at a time (best for large files)\nwith open(\'names.txt\') as f:\n    for line in f:           # file object IS an iterator\n        print(line.strip())  # Alice, Bob, Charlie, Diana\n\n# Method 3: readline() — one line per call\nwith open(\'names.txt\') as f:\n    first = f.readline()    # \'Alice\\n\'\n    second = f.readline()   # \'Bob\\n\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Reading line by line — memory-efficient iteration — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def read_greeting(filename):` starts new function.\n- `with open(...)` opens file in read mode.\n- `for line in f:` iterates the file object.\n- `print(...)` outputs the stripped line.\n- `line.strip()` removes trailing whitespace like `\\n`.',
                '**Expected behavior.** Predicted confidently: Will print "Found line: Welcome to the project!".',
                '**CS lens.** Iterators. 3-5 unrelated real-world places it appears: Database cursors, stream processing like Kafka, pagination in REST APIs, generator functions yielding sequences.',
                '**SE lens.** Lazy evaluation and streaming. The alternative NOT chosen: loading the entire file into a list with `readlines()`. Real tradeoff: streaming saves memory but you cannot random-access index the data easily.'
              ],
              typeIt: true,
              solution: 'def read_greeting(filename):\n    with open(filename, \'r\', encoding=\'utf-8\') as f:\n        for line in f:\n            print("Found line:", line.strip())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Writing, appending, and CSV',
              prose: [
                'If we have a dictionary or list of fields, how do we write it such that another program (like Excel) can reliably read it? What happens if data contains commas itself?',
                'This demonstrates the **CSV module**. Trace: `csv.writer` wraps the file object. `writerow([\'Alice\', 95])`: converts to `\'Alice,95\\n\'`, writes to file. `csv.reader`: on each iteration, reads one line, splits on comma, returns list of strings.'
              ],
              typeIt: true,
              solution: 'import csv\n\n# Write CSV:\nwith open(\'scores.csv\', \'w\', newline=\'\', encoding=\'utf-8\') as f:\n    writer = csv.writer(f)\n    writer.writerow([\'Name\', \'Score\'])   # header\n    writer.writerow([\'Alice\', 95])\n    writer.writerow([\'Bob\', 87])\n    writer.writerow([\'Charlie\', 92])\n\n# Read CSV:\nwith open(\'scores.csv\', \'r\', encoding=\'utf-8\') as f:\n    reader = csv.reader(f)\n    header = next(reader)           # [\'Name\', \'Score\']\n    for row in reader:\n        print(f\'{row[0]}: {row[1]}\') # Alice: 95, etc.\n\n# Append to existing file:\nwith open(\'scores.csv\', \'a\', newline=\'\') as f:\n    writer = csv.writer(f)\n    writer.writerow([\'Diana\', 99])  # adds at end',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Writing, appending, and CSV — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import csv` imports the standard library module.\n- `with open(...)` opens file in append mode (`\'a\'`).\n- `csv.writer(f)` creates the writer wrapping the file.\n- `writer.writerow([...])` writes a list as a CSV line.',
                '**Expected behavior.** Predicted confidently: Appends formatted CSV text to the file.',
                '**CS lens.** Serialization. 3-5 unrelated real-world places it appears: JSON endpoints in REST, Protocol Buffers in gRPC, saving game configs in INI, object pickling.',
                '**SE lens.** Standard formats. The alternative NOT chosen: writing a custom format with string splits. Real tradeoff: using the `csv` module handles edge cases (like escaping commas in the data) that a naive split wouldn\'t catch.'
              ],
              typeIt: true,
              solution: 'import csv\n\ndef write_score(filename, name, score):\n    with open(filename, \'a\', newline=\'\', encoding=\'utf-8\') as f:\n        writer = csv.writer(f)\n        writer.writerow([name, score])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Paths with pathlib and os.path',
              prose: [
                'Windows uses backslashes `\\` for paths. Linux uses forward slashes `/`. How do we write code that works on both without breaking?',
                'This demonstrates **pathlib**. Trace: `Path(\'data\') / \'scores.csv\'`: `__truediv__` joins paths with OS separator. `p.exists()`: calls `os.path.exists` internally. `p.read_text()`: opens, reads all, closes. Returns str.'
              ],
              typeIt: true,
              solution: 'from pathlib import Path\nimport os\n\n# pathlib (modern Python):\np = Path(\'data\') / \'scores.csv\'    # OS-independent path joining\nprint(p)              # data/scores.csv (or data\\scores.csv on Windows)\nprint(p.exists())     # True/False\nprint(p.suffix)       # \'.csv\'\nprint(p.stem)         # \'scores\'\nprint(p.parent)       # Path(\'data\')\n\n# Read with pathlib:\nif p.exists():\n    content = p.read_text(encoding=\'utf-8\')  # one-liner read\n    p.write_text(\'new content\', encoding=\'utf-8\')  # one-liner write\n\n# List directory:\nfor f in Path(\'.\').iterdir():\n    if f.suffix == \'.csv\':\n        print(f.name)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Paths with pathlib and os.path — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from pathlib import Path` imports the Path object.\n- `Path(directory).iterdir()` creates a path object and yields children.\n- `f.suffix` gives the file extension.\n- `print(f.name)` outputs the base name of the file.',
                '**Expected behavior.** Predicted confidently: Prints the names of all `.csv` files in the specified directory.',
                '**CS lens.** Cross-platform abstractions. 3-5 unrelated real-world places it appears: JVM virtual machines abstracting hardware, Docker abstracting host OS, web browsers abstracting graphics APIs, ORMs abstracting SQL dialects.',
                '**SE lens.** Object-oriented standard libraries. The alternative NOT chosen: manipulating strings with `os.path.join()`. Real tradeoff: Path objects carry their methods with them, avoiding functional clutter, but you occasionally must cast them back to strings for older APIs.'
              ],
              typeIt: true,
              solution: 'from pathlib import Path\n\ndef list_csvs(directory):\n    for f in Path(directory).iterdir():\n        if f.suffix == \'.csv\':\n            print(f.name)',
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
      'Next lesson: Closures and Decorators.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "file object"?',
      options: [
        'A Python object that provides methods to read from and write to a file on disk. It is an iterator over the lines of the file.',
        'An object that implements __enter__ and __exit__, ensuring that resources are properly acquired and released, typically used with the with statement.',
        'A string indicating how a file is opened, such as \'r\' for reading, \'w\' for writing, \'a\' for appending.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "file mode"?',
      options: [
        'A string indicating how a file is opened, such as \'r\' for reading, \'w\' for writing, \'a\' for appending.',
        'A Python object that provides methods to read from and write to a file on disk. It is an iterator over the lines of the file.',
        'An object that implements __enter__ and __exit__, ensuring that resources are properly acquired and released, typically used with the with statement.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "context manager"?',
      options: [
        'An object that implements __enter__ and __exit__, ensuring that resources are properly acquired and released, typically used with the with statement.',
        'A Python object that provides methods to read from and write to a file on disk. It is an iterator over the lines of the file.',
        'A string indicating how a file is opened, such as \'r\' for reading, \'w\' for writing, \'a\' for appending.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**file object** — A Python object that provides methods to read from and write to a file on disk. It is an iterator over the lines of the file.',
    '**context manager** — An object that implements __enter__ and __exit__, ensuring that resources are properly acquired and released, typically used with the with statement.',
    '**file mode** — A string indicating how a file is opened, such as \'r\' for reading, \'w\' for writing, \'a\' for appending.',
  ],

  checkpoints: ['read-intuition'],
}
