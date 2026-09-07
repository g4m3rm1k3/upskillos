// Guttag — Lesson 15: Exceptions
// Auto-converted from src/docs/tutorials/guttag-python/lesson-15.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-15-exceptions',
  slug: 'exceptions',
  chapter: 3,
  order: 1,
  title: 'Exceptions',
  subtitle: 'try, except, raise, finally',
  tags: ['exception', 'eafp-easier-to-ask-forgiveness-than-permission', 'lbyl-look-before-you-leap'],

  hook: {
    question: 'What is "Exceptions", and why does it matter?',
    realWorldContext: 'The reader understands Python\'s exception mechanism: try/except/else/finally, raising exceptions with raise, defining custom exception classes, and the difference between EAFP (Easier to Ask Forgiveness than Permission) vs. LBYL (Look Before You Leap). The transferable insight: exceptions are not just for errors — they are Python\'s mechanism for communicating unexpected conditions between caller and callee. Raising an exception unwinds the call stack until a matching except clause catches it.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: try / except — catching exceptions, Multiple except clauses and exception hierarchy, raise — signalling errors from your own code, finally and else, Custom exception classes.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Exception:** Python\'s mechanism for handling errors and unexpected conditions during execution, allowing the program to respond rather than crash.\n- **EAFP (Easier to Ask Forgiveness than Permission):** A coding style in Python where you assume valid keys or attributes exist and catch exceptions if the assumption proves false.\n- **LBYL (Look Before You Leap):** A coding style where you explicitly check for pre-conditions before making calls or lookups.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **Exception (class):** The base class for all built-in, non-system-exiting exceptions.\n- **ValueError (class):** An exception raised when an operation or function receives an argument that has the right type but an inappropriate value.\n- **TypeError (class):** An exception raised when an operation or function is applied to an object of inappropriate type.\n- **ZeroDivisionError (class):** An exception raised when the second argument of a division or modulo operation is zero.\n- **FileNotFoundError (class):** An exception raised when a file or directory is requested but doesn\'t exist.\n- **isinstance():** A built-in function that returns True if the specified object is of the specified type.\n- **open():** A built-in function to open a file and return a corresponding file object.\n- **int():** A built-in function to convert a number or string to an integer.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'When tracking how exceptions bubble up and are resolved, let\'s trace `safe_divide(10, 0)` from the start of the lesson through its entire lifecycle: - Python enters the `try` block and attempts the expression `10 / 0`. - The division operation immediately fails; Python intercepts the fault and instantiates a `ZeroDivisionError` object. - Normal line-by-line execution halts instantly; the remainder of the `try` block is abandoned. - Python looks for a matching `except` clause. It finds `except ZeroDivisionError`. - Execution jumps into this block. If we had a `finally` block here, Python would execute it immediately after the `except` block concluded. - The `except` block returns `None`, safely bypassing the error and returning control to the original caller without crashing the program.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 15: Exceptions',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Exceptions',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'try / except — catching exceptions',
              prose: [
                'When performing division, what happens if the denominator is zero? Does the program crash entirely? How can we handle this error gracefully without halting execution completely?',
                'This is called a **try/except block**. Output: `Caught a division by zero!`. This PROVES that dividing by zero raises an exception, which the `except` block catches, preventing a crash.'
              ],
              typeIt: true,
              solution: 'try:\n    print(10 / 0)\nexcept ZeroDivisionError:\n    print(\'Caught a division by zero!\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'try / except — catching exceptions — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def safe_divide(a, b):` defines a new function taking two arguments.\n- `try:` opens a block of code that might raise an exception.\n- `result = a / b` performs the division. If `b` is 0, execution immediately halts here and jumps to the except block.\n- `return result` returns the answer if no exception occurred.\n- `except ZeroDivisionError:` catches specifically the ZeroDivisionError type.\n- `print(\'Cannot divide by zero\')` outputs a user-friendly error message.\n- `return None` provides a fallback value instead of crashing.',
                '**Expected behavior.** Predicted confidently: `print(safe_divide(10, 2))` returns `5.0`. `print(safe_divide(10, 0))` prints `Cannot divide by zero` and returns `None`.',
                '**CS lens.** **Exception Handling**. This pattern appears in database connections (handling timeouts), network requests (handling dropped packets), and file parsing (handling corrupted formats).',
                '**SE lens.** **Graceful Degradation**. By returning None instead of crashing, we allow the caller to decide what to do next. The alternative (letting the program crash) forces the user out of the application entirely.'
              ],
              typeIt: true,
              solution: 'def safe_divide(a, b):\n    try:\n        result = a / b          # may raise ZeroDivisionError\n        return result\n    except ZeroDivisionError:\n        print(\'Cannot divide by zero\')\n        return None',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Multiple except clauses and exception hierarchy',
              prose: [
                'What if a single operation can fail in multiple different ways? If a user passes a string instead of a number, or an invalid string format, how do we distinguish between these distinct failure modes?',
                'This is called **multiple except clauses**. Output: `TypeError`. This PROVES that Python evaluates except clauses top-to-bottom and executes only the first one that matches the exception type raised.'
              ],
              typeIt: true,
              solution: 'try:\n    int(None)\nexcept ValueError:\n    print(\'ValueError\')\nexcept TypeError:\n    print(\'TypeError\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Multiple except clauses and exception hierarchy — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def parse_int(s):` defines a function taking a string `s`.\n- `try:` begins the block to attempt conversion.\n- `return int(s)` attempts to convert `s` to an integer. This can raise `ValueError` (for invalid formats like `\'abc\'`) or `TypeError` (for wrong types like `None`).\n- `except ValueError:` catches format errors.\n- `print(f\'Not a valid integer: {s!r}\')` logs the formatting issue.\n- `return None` handles the failure gracefully.\n- `except TypeError:` catches invalid data types.\n- `print(f\'Expected string, got {type(s).__name__}\')` logs the type error dynamically.\n- `return None` also handles this failure gracefully.',
                '**Expected behavior.** Predicted confidently: `print(parse_int(\'42\'))` returns `42`. `print(parse_int(\'abc\'))` prints `Not a valid integer: \'abc\'` and returns `None`. `print(parse_int(None))` prints `Expected string, got NoneType` and returns `None`.',
                '**CS lens.** **Exception Hierarchy**. In Python, `Exception` acts as the base class for `ValueError` and `TypeError`. Catching an exception higher up the hierarchy catches all its subclasses. Always catch specific exceptions (leaf nodes) before generic ones.',
                '**SE lens.** **Specificity in Error Handling**. By explicitly catching `ValueError` and `TypeError` instead of a bare `except:`, we ensure we don\'t accidentally swallow unrelated errors like `KeyboardInterrupt` (Ctrl+C), which could make the program un-killable.'
              ],
              typeIt: true,
              solution: 'def parse_int(s):\n    try:\n        return int(s)\n    except ValueError:\n        print(f\'Not a valid integer: {s!r}\')\n        return None\n    except TypeError:\n        print(f\'Expected string, got {type(s).__name__}\')\n        return None',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'raise — signalling errors from your own code',
              prose: [
                'If a function receives arguments that are valid types but violate business logic (like a negative age), how can the function forcibly halt its execution and alert the caller to the invalid state?',
                'This is called **raising an exception**. Output: `ValueError: Age cannot be negative`. This PROVES that we can manually trigger the exception mechanism from our own code using the `raise` keyword.'
              ],
              typeIt: true,
              solution: 'age = -5\nif age < 0:\n    raise ValueError("Age cannot be negative")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'raise — signalling errors from your own code — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def set_age(age):` defines a function taking a single argument.\n- `if not isinstance(age, int):` checks if the provided argument is an integer type.\n- `raise TypeError(...)` halts execution and throws a type error up the call stack if it\'s not an int.\n- `if age < 0 or age > 150:` applies business logic bounds checking to the integer value.\n- `raise ValueError(...)` halts execution and throws a value error up the call stack if bounds are exceeded.\n- `return age` executes only if all checks pass.',
                '**Expected behavior.** Predicted confidently: `try: set_age(-5)` catches `ValueError: age must be 0-150, got -5`. `try: set_age(\'old\')` catches `TypeError: age must be int, got str`.',
                '**CS lens.** **Fail-Fast Design**. Raising an error immediately upon discovering invalid state prevents bad data from persisting and causing confusing side-effects later on.',
                '**SE lens.** **LBYL vs EAFP**. Here we use LBYL (Look Before You Leap) to explicitly validate arguments before proceeding, returning precise exceptions. Python often prefers EAFP (Easier to Ask Forgiveness than Permission), but LBYL is appropriate for guarding business rules that don\'t trigger built-in operations.'
              ],
              typeIt: true,
              solution: 'def set_age(age):\n    if not isinstance(age, int):\n        raise TypeError(f\'age must be int, got {type(age).__name__}\')\n    if age < 0 or age > 150:\n        raise ValueError(f\'age must be 0-150, got {age}\')\n    return age',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'finally and else',
              prose: [
                'If a function opens a file, it must close that file when finished. If an exception happens while reading, how do we guarantee the file is closed, since a raised exception immediately halts normal block execution?',
                'This is called the **finally block**. Output: `Trying\\nCleanup`. This PROVES that the code inside a `finally` block runs unconditionally, even when no exception occurs (and even if one does).'
              ],
              typeIt: true,
              solution: 'try:\n    print(\'Trying\')\nexcept Exception:\n    print(\'Failed\')\nfinally:\n    print(\'Cleanup\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'finally and else — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `f = None` initializes the variable so the `finally` block can safely check it.\n- `try:` starts the block where file operations happen.\n- `f = open(path, \'r\')` attempts to open the file. This may raise `FileNotFoundError`.\n- `content = f.read()` reads the file contents into memory.\n- `return content` returns the string on success.\n- `except FileNotFoundError:` catches the error if `open()` fails.\n- `print(...)` and `return None` handle the missing file gracefully.\n- `else:` executes **only if** the try block completes successfully without raising any exceptions.\n- `print(\'File read successfully\')` logs success (though note: standard `return` inside `try` bypasses `else`).\n- `finally:` executes unconditionally.\n- `if f is not None: f.close()` ensures we release system resources safely.',
                '**Expected behavior.** Predicted confidently: `read_file(\'missing.txt\')` traces: open() raises FileNotFoundError -> except FileNotFoundError catches -> else is skipped -> finally runs -> returns None.',
                '**CS lens.** **Resource Management**. Operating systems have strict limits on open file handles or network sockets. Unconditionally releasing them using `finally` prevents resource leaks.',
                '**SE lens.** **The `else` Clause Tradeoff**. The `else` clause in Python\'s try/except is relatively rare. It makes the distinction between "code that might raise" (in `try`) and "code that should only run if the try succeeded" (in `else`) explicit.'
              ],
              typeIt: true,
              solution: 'def read_file(path):\n    f = None\n    try:\n        f = open(path, \'r\')\n        content = f.read()\n        return content\n    except FileNotFoundError:\n        print(f\'File not found: {path}\')\n        return None\n    else:\n        print(\'File read successfully\')\n    finally:\n        if f is not None:\n            f.close()\n        print(\'Cleanup done\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Custom exception classes',
              prose: [
                'If a bank account attempts an invalid withdrawal, raising a standard `ValueError` conveys that something was wrong, but how do we bundle the context (balance vs amount) into the error itself?',
                'This is called a **Custom exception class**. Output: `Caught custom error!`. This PROVES that we can define our own exceptions by subclassing `Exception` and use them in try/except flows exactly like built-in ones.'
              ],
              typeIt: true,
              solution: 'class MyError(Exception):\n    pass\n\ntry:\n    raise MyError()\nexcept MyError:\n    print(\'Caught custom error!\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Custom exception classes — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class InsufficientFundsError(Exception):` creates a custom error inheriting from the base `Exception`.\n- `def __init__(self, balance, amount):` allows the exception to accept specific context.\n- `self.balance = balance` and `self.amount = amount` save context as properties on the exception object.\n- `super().__init__(...)` delegates to the parent `Exception` class to set the main string message.\n- `class BankAccount:` sets up the consumer of the error.\n- `if amount > self.balance:` checks the business logic rule.\n- `raise InsufficientFundsError(self.balance, amount)` instantiates the custom error and raises it immediately, halting normal execution.',
                '**Expected behavior.** Predicted confidently: `acc = BankAccount(100)` `try: acc.withdraw(150)` `except InsufficientFundsError as e:` -> catches error, `e.balance` is `100`, `e.amount` is `150`.',
                '**CS lens.** **Domain-Driven Exceptions**. By subclassing `Exception`, you create errors that speak the language of the business domain ("Insufficient Funds") rather than the language of the runtime ("Value Error").',
                '**SE lens.** **Exception Payloads**. Storing attributes like `.balance` and `.amount` directly on the exception instance allows the calling `except` block to programmatically react to the error (e.g., dynamically prompting the user for a top-up) without parsing string messages.'
              ],
              typeIt: true,
              solution: 'class InsufficientFundsError(Exception):\n    def __init__(self, balance, amount):\n        self.balance = balance\n        self.amount = amount\n        super().__init__(f\'Cannot withdraw {amount}: balance is {balance}\')\n\nclass BankAccount:\n    def __init__(self, balance):\n        self.balance = balance\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            raise InsufficientFundsError(self.balance, amount)\n        self.balance -= amount\n        return self.balance',
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
      'Next lesson: Testing.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "LBYL (Look Before You Leap)"?',
      options: [
        'A coding style where you explicitly check for pre-conditions before making calls or lookups.',
        'Python\'s mechanism for handling errors and unexpected conditions during execution, allowing the program to respond rather than crash.',
        'A coding style in Python where you assume valid keys or attributes exist and catch exceptions if the assumption proves false.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "EAFP (Easier to Ask Forgiveness than Permission)"?',
      options: [
        'A coding style where you explicitly check for pre-conditions before making calls or lookups.',
        'A coding style in Python where you assume valid keys or attributes exist and catch exceptions if the assumption proves false.',
        'Python\'s mechanism for handling errors and unexpected conditions during execution, allowing the program to respond rather than crash.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Exception"?',
      options: [
        'Python\'s mechanism for handling errors and unexpected conditions during execution, allowing the program to respond rather than crash.',
        'A coding style where you explicitly check for pre-conditions before making calls or lookups.',
        'A coding style in Python where you assume valid keys or attributes exist and catch exceptions if the assumption proves false.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Exception** — Python\'s mechanism for handling errors and unexpected conditions during execution, allowing the program to respond rather than crash.',
    '**EAFP (Easier to Ask Forgiveness than Permission)** — A coding style in Python where you assume valid keys or attributes exist and catch exceptions if the assumption proves false.',
    '**LBYL (Look Before You Leap)** — A coding style where you explicitly check for pre-conditions before making calls or lookups.',
  ],

  checkpoints: ['read-intuition'],
}
