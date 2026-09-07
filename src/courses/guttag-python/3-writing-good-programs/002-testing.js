// Guttag — Lesson 16: Testing
// Auto-converted from src/docs/tutorials/guttag-python/lesson-16.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-16-testing',
  slug: 'testing',
  chapter: 3,
  order: 2,
  title: 'Testing',
  subtitle: 'assert and unittest',
  tags: ['assert-statement', 'assertionerror', 'test-suite', 'test-driven-development-tdd', 'context-manager'],

  hook: {
    question: 'What is "Testing", and why does it matter?',
    realWorldContext: 'The reader understands Python\'s testing tools: the assert statement for inline checks, unittest.TestCase for structured test suites, how to test for expected exceptions, and the basics of test-driven development (TDD). The transferable insight: a test is executable documentation. It says \'given this input, expect this output.\' Any function without tests is unverified. Writing tests before code (TDD) forces you to think about the interface before the implementation.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: assert — inline correctness checks, unittest.TestCase — structured tests, Assertion methods — the full toolkit, Testing for expected exceptions, setUp, tearDown, and test organization.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **assert statement:** A built-in language construct used for inline correctness checks. It evaluates a condition and raises an error if the condition is false. It exists to declare invariants that must always be true during normal execution.\n- **AssertionError:** The built-in exception raised when an assert statement fails. It exists to violently crash the program with a traceback rather than proceeding with invalid state.\n- **Test suite:** A collection of test cases grouped together for execution. It exists to verify a module or system as a whole.\n- **Test-driven development (TDD):** A software engineering practice where tests are written before the implementation code. It exists to force developers to design the interface and edge cases before getting bogged down in implementation details.\n- **Context manager:** A construct that sets up and tears down resources automatically, often used with the with statement. Here, it is used to capture exceptions within a specific block of code.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **unittest.TestCase:** A base class provided by Python\'s standard library for creating unit tests.\n- **unittest.main:** The command-line entry point for the test framework.\n- **TestCase.assertEqual:** An assertion method to check if two values are equal.\n- **TestCase.assertRaises:** An assertion method and context manager to check if a specific exception is raised.\n- **TestCase.setUp:** A hook method run before each test.\n- **TestCase.tearDown:** A hook method run after each test.\n- **ValueError:** A built-in exception raised when a function receives an argument of the correct type but an inappropriate value.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Testing is how we prove that code behaves identically to the mental model in our heads. Writing a robust system requires utilizing all of these tools in concert. Imagine writing a `safe_divide(a, b)` function. First, you use an **`assert` statement** to explicitly declare the preconditions. Next, you subclass **`unittest.TestCase`** to build a structured suite around the function. You use `assertEqual` to verify the normal case (`10 / 2 = 5`). But you must also prove the failure path, so you use `assertRaises(ValueError)` wrapped in a context manager to ensure `safe_divide(10, 0)` fails exactly the way you intend, rather than crashing the program unexpectedly. By writing these tests, you are creating an executable contract: anyone modifying `safe_divide` in the future will know instantly if they broke its intended behavior because the test runner will loudly catch them.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 16: Testing',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Testing',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'assert — inline correctness checks',
              prose: [
                'How do you guarantee that a function\'s inputs meet strict requirements before it attempts to do its work? If a division function is handed a zero divisor, what should it do? Should it silently return a dummy value, or violently halt the program to prevent corrupt data from propagating further?',
                'If we call `check_positive(-5)`, the output is an `AssertionError: Number must be strictly positive`. This proves that the **assert statement** actively guards the execution flow, halting the program if its condition evaluates to `False`.'
              ],
              typeIt: true,
              solution: 'def check_positive(number):\n    assert number > 0, \'Number must be strictly positive\'\n    return number',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'assert — inline correctness checks — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def divide(a, b):` declares the function.\n- `assert` is a built-in Python keyword that initiates the check.\n- `b != 0` is the boolean condition evaluated. If it is `True`, execution continues normally.\n- `,` separates the condition from the optional error message.\n- `\'Divisor cannot be zero\'` is the string message that will be attached to the `AssertionError` if the condition fails.\n- `return a / b` performs the final logic.',
                '**Expected behavior.** Predicted confidently: Calling `divide(10, 2)` returns `5.0`. Calling `divide(10, 0)` raises `AssertionError: Divisor cannot be zero`.',
                '**CS lens.** This is the computer science concept of a **precondition invariant**. By establishing a known valid state before proceeding, we simplify the downstream logic. This appears in database constraints (rejecting negative account balances), network protocols (validating packet checksums before parsing), and compiler design (verifying syntax trees before semantic analysis).',
                '**SE lens.** Using `assert` is a design principle of **fail-fast**. The alternative not chosen is silently returning `None` or `0`, which would mask the error and cause unpredictable bugs later in the program. The tradeoff is that `assert` statements can be disabled globally with Python\'s `-O` (optimized) flag, meaning they should be used for internal invariants, not for validating user input in a production system.'
              ],
              typeIt: true,
              solution: 'def divide(a, b):\n    assert b != 0, \'Divisor cannot be zero\'\n    return a / b',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'unittest.TestCase — structured tests',
              prose: [
                'How can we automate the verification of our functions? If we just write a script with a dozen `print` statements, we have to manually read the console output to verify if the answers are correct. How do we create self-verifying code that explicitly reports failures without human intervention?',
                'This proves that subclassing **`unittest.TestCase`** and invoking **`unittest.main()`** allows the framework to automatically discover, run, and summarize methods that start with `test_`.'
              ],
              typeIt: true,
              solution: 'import unittest\n\nclass DummyTest(unittest.TestCase):\n    def test_truth(self):\n        self.assertEqual(1, 1)\n\nif __name__ == \'__main__\':\n    unittest.main()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'unittest.TestCase — structured tests — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import unittest` brings the standard testing framework into scope.\n- `def add(a, b):` creates our subject under test.\n- `class TestAdd(unittest.TestCase):` defines a new class that inherits all testing infrastructure from the framework.\n- `def test_positive(self):` defines a single test scenario. The `test_` prefix is strictly required for the runner to discover it.\n- `self.assertEqual(add(2, 3), 5)` calls the `add` function and uses the framework\'s assertion method to ensure the result is exactly `5`.\n- `if __name__ == \'__main__\':` ensures the runner only executes if the script is run directly, not if it is imported.\n- `unittest.main()` triggers the framework to discover all `TestCase` subclasses and execute their test methods.',
                '**Expected behavior.** Predicted confidently: The framework will discover 4 tests, run them, and output `....` followed by `OK`.',
                '**CS lens.** This demonstrates **automated test discovery** and the **Command pattern**. The framework scans for methods matching a specific naming convention and executes them as independent commands, trapping exceptions to report failures without crashing the overall runner. This appears in build systems, CI/CD pipelines, and task runners like Make.',
                '**SE lens.** This is the foundation of **Test-Driven Development (TDD)**. By explicitly defining the expected outputs for various inputs, the test acts as executable documentation. The alternative not chosen is relying solely on manual ad-hoc testing in the REPL, which is error-prone, non-repeatable, and easily lost.'
              ],
              typeIt: true,
              solution: 'import unittest\n\ndef add(a, b):\n    return a + b\n\nclass TestAdd(unittest.TestCase):\n    def test_positive(self):\n        self.assertEqual(add(2, 3), 5)\n\n    def test_negative(self):\n        self.assertEqual(add(-1, -1), -2)\n\n    def test_zero(self):\n        self.assertEqual(add(0, 0), 0)\n\n    def test_mixed(self):\n        self.assertEqual(add(-3, 3), 0)\n\nif __name__ == \'__main__\':\n    unittest.main()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Assertion methods — the full toolkit',
              prose: [
                'What if you need to check if an item exists in a list, or if a variable is `None`, or if a computed float is *close enough* to an expected value? If we only use `assertEqual`, our test code becomes cluttered with manual type and condition checks.',
                'This proves that the `unittest.TestCase` base class provides a wide variety of specialized assertion methods that handle type checking, truthiness, and membership directly, producing clearer failure messages when they fail.'
              ],
              typeIt: true,
              solution: 'import unittest\n\nclass AssortedTests(unittest.TestCase):\n    def test_various(self):\n        self.assertTrue(5 > 2)\n        self.assertIsNone(None)\n        self.assertIn(\'x\', [\'a\', \'x\', \'z\'])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Assertion methods — the full toolkit — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `self.assertNotEqual` ensures two values are different.\n- `self.assertTrue` / `self.assertFalse` evaluates the boolean truthiness of the argument.\n- `self.assertIn` checks if the first argument exists within the second argument (which must be an iterable).\n- `self.assertNotIn` checks the reverse, ensuring an item is absent.\n- `self.assertIsNone` explicitly checks for object identity with the `None` singleton, which is safer than equality checking.\n- `self.assertIsNotNone` verifies the object is something other than `None`.\n- `self.assertIsInstance` checks if the first argument is an instance of the class provided in the second argument.\n- `self.assertAlmostEqual` compares floats to a specified number of decimal places, mitigating floating-point precision issues.',
                '**Expected behavior.** Predicted confidently: The runner will discover all test methods across all classes and report `.........` followed by `OK`.',
                '**CS lens.** These specialized methods represent **Domain-Specific Language (DSL)** primitives for testing. By providing named methods for common logical operations, the framework reduces boilerplate and standardizes how failures are expressed. This appears in query builders (like SQL ORMs), configuration management tools, and behavior-driven development (BDD) frameworks.',
                '**SE lens.** The design principle here is **Expressiveness and Diagnostic Quality**. An alternative would be writing `self.assertTrue(a in b)`. However, if that fails, the framework only reports `False is not True`. By using `self.assertIn(a, b)`, the framework reports `Item \'a\' not found in collection \'b\'`, drastically reducing debugging time.'
              ],
              typeIt: true,
              solution: 'class TestMethods(unittest.TestCase):\n    def test_equality(self):\n        self.assertEqual(1 + 1, 2)\n        self.assertNotEqual(1, 2)\n\n    def test_truth(self):\n        self.assertTrue(3 > 2)\n        self.assertFalse(2 > 3)\n\n    def test_membership(self):\n        self.assertIn(3, [1, 2, 3])\n        self.assertNotIn(4, [1, 2, 3])\n\n    def test_none(self):\n        self.assertIsNone(None)\n        self.assertIsNotNone(42)\n\n    def test_types(self):\n        self.assertIsInstance(42, int)\n        self.assertAlmostEqual(0.1+0.2, 0.3, places=10)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Testing for expected exceptions',
              prose: [
                'If a function is designed to raise a `ValueError` when given bad data, how do we write a test for it? If we just call the function, the exception will crash the test and cause a failure. How do we tell the test runner that the exception *is* the expected correct behavior?',
                'This proves that the **context manager** created by `self.assertRaises` intercepts the specified exception. If `throw_error()` raises a `ValueError`, the context manager catches it, preventing the test from crashing, and allows the test to pass.'
              ],
              typeIt: true,
              solution: 'import unittest\n\ndef throw_error():\n    raise ValueError("Boom")\n\nclass ExceptionTest(unittest.TestCase):\n    def test_boom(self):\n        with self.assertRaises(ValueError):\n            throw_error()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Testing for expected exceptions — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def parse_age(s):` attempts to cast a string to an integer.\n- `raise ValueError(...)` deliberately aborts execution if the age is semantically invalid.\n- `with self.assertRaises(ValueError):` establishes a context manager that expects a `ValueError` to be raised by the code inside the block.\n- `parse_age(\'abc\')` triggers the exception because `int(\'abc\')` fails.\n- `as ctx:` binds the caught exception object to the variable `ctx` so we can inspect it after the block finishes.\n- `str(ctx.exception)` extracts the actual error message string.\n- `self.assertIn(\'negative\', ...)` ensures the error message contains the expected explanatory text, proving the correct validation logic was triggered.',
                '**Expected behavior.** Predicted confidently: The tests pass. If `parse_age(\'abc\')` miraculously succeeded, `assertRaises` would fail the test for missing the expected exception.',
                '**CS lens.** This highlights **control flow interception**. By wrapping execution in a designated boundary (the context manager), the test framework temporarily alters how the runtime handles fatal errors, capturing them for inspection instead of unwinding the stack to the top. This appears in transaction rollbacks, middleware error handlers, and debugger trace hooks.',
                '**SE lens.** This reinforces **Defensive Programming**. Testing for expected failures ensures that boundaries remain solid. The alternative not chosen is catching generic `Exception` types, which is dangerous because it could mask unrelated errors (like a typo in a variable name). By asserting a specific exception (`ValueError`), we ensure the function failed for the *exact reason* we anticipated.'
              ],
              typeIt: true,
              solution: 'def parse_age(s):\n    age = int(s)\n    if age < 0:\n        raise ValueError(f\'Age cannot be negative: {age}\')\n    return age\n\nclass TestParseAge(unittest.TestCase):\n    def test_valid(self):\n        self.assertEqual(parse_age(\'25\'), 25)\n\n    def test_not_a_number(self):\n        with self.assertRaises(ValueError):\n            parse_age(\'abc\')\n\n    def test_negative(self):\n        with self.assertRaises(ValueError) as ctx:\n            parse_age(\'-5\')\n        self.assertIn(\'negative\', str(ctx.exception))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'setUp, tearDown, and test organization',
              prose: [
                'If ten tests all require a properly initialized `BankAccount` object to run, copying the instantiation code into every method is repetitive and fragile. How can we instruct the testing framework to automatically prepare a clean state before each test runs?',
                'If we ran this, we would see `-> Setting up` printed twice — exactly once before `test_one`, and once before `test_two`. This proves that **`setUp`** runs automatically as a precursor hook for every individual test method in the class.'
              ],
              typeIt: true,
              solution: 'import unittest\n\nclass SetupDemo(unittest.TestCase):\n    def setUp(self):\n        print("-> Setting up")\n        self.value = 42\n\n    def test_one(self):\n        print(f"Test one sees: {self.value}")\n\n    def test_two(self):\n        print(f"Test two sees: {self.value}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'setUp, tearDown, and test organization — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class BankAccount:` defines a mutable object holding a `balance`.\n- `def setUp(self):` overrides the framework\'s empty setup hook. The test runner calls this explicitly before every `test_` method.\n- `self.account = BankAccount(1000)` creates a fresh instance and binds it to the test case instance so the test methods can access it via `self.account`.\n- `def tearDown(self):` overrides the framework\'s cleanup hook. It runs after every test, regardless of success or failure. Here it is a `pass`, but is useful for closing files or network connections.\n- `test_deposit` runs, and `self.account.deposit(500)` mutates the shared instance.\n- Because `setUp` runs again before `test_withdraw_valid`, that mutation is wiped clean, ensuring tests do not influence each other.',
                '**Expected behavior.** Predicted confidently: The three tests run and pass. `setUp` is executed exactly three times, guaranteeing each test operates on an account with exactly `1000`.',
                '**CS lens.** This relies on **Lifecycle Hooks** and **Test Isolation**. The framework dictates the order of operations (`setUp` -> `test_*` -> `tearDown`), allowing developers to inject custom logic at specific stages of execution. This is identical in concept to React\'s `useEffect`, web framework middleware, and database transaction triggers.',
                '**SE lens.** This enforces **State Isolation**. The alternative not chosen is instantiating the account globally outside the class. If tests shared the same instance, `test_deposit` mutating the balance would cause `test_withdraw_valid` to fail because the starting balance would be wrong. Global test state leads to flaky, order-dependent tests that are notoriously difficult to debug.'
              ],
              typeIt: true,
              solution: 'import unittest\n\nclass BankAccount:\n    def __init__(self, balance):\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            raise ValueError("Overdraft")\n        self.balance -= amount\n\nclass TestBankAccount(unittest.TestCase):\n    def setUp(self):\n        self.account = BankAccount(1000)\n\n    def tearDown(self):\n        pass\n\n    def test_deposit(self):\n        self.account.deposit(500)\n        self.assertEqual(self.account.balance, 1500)\n\n    def test_withdraw_valid(self):\n        self.account.withdraw(200)\n        self.assertEqual(self.account.balance, 800)\n\n    def test_withdraw_overdraft(self):\n        with self.assertRaises(ValueError):\n            self.account.withdraw(2000)',
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
      'Next lesson: Debugging.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "assert statement"?',
      options: [
        'A collection of test cases grouped together for execution. It exists to verify a module or system as a whole.',
        'A built-in language construct used for inline correctness checks. It evaluates a condition and raises an error if the condition is false. It exists to declare invariants that must always be true during normal execution.',
        'A software engineering practice where tests are written before the implementation code. It exists to force developers to design the interface and edge cases before getting bogged down in implementation details.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "AssertionError"?',
      options: [
        'A collection of test cases grouped together for execution. It exists to verify a module or system as a whole.',
        'A software engineering practice where tests are written before the implementation code. It exists to force developers to design the interface and edge cases before getting bogged down in implementation details.',
        'The built-in exception raised when an assert statement fails. It exists to violently crash the program with a traceback rather than proceeding with invalid state.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Context manager"?',
      options: [
        'A construct that sets up and tears down resources automatically, often used with the with statement. Here, it is used to capture exceptions within a specific block of code.',
        'A software engineering practice where tests are written before the implementation code. It exists to force developers to design the interface and edge cases before getting bogged down in implementation details.',
        'A collection of test cases grouped together for execution. It exists to verify a module or system as a whole.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Test-driven development (TDD)"?',
      options: [
        'A collection of test cases grouped together for execution. It exists to verify a module or system as a whole.',
        'A software engineering practice where tests are written before the implementation code. It exists to force developers to design the interface and edge cases before getting bogged down in implementation details.',
        'The built-in exception raised when an assert statement fails. It exists to violently crash the program with a traceback rather than proceeding with invalid state.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**assert statement** — A built-in language construct used for inline correctness checks. It evaluates a condition and raises an error if the condition is false. It exists to declare invariants that must always be true during normal execution.',
    '**AssertionError** — The built-in exception raised when an assert statement fails. It exists to violently crash the program with a traceback rather than proceeding with invalid state.',
    '**Test suite** — A collection of test cases grouped together for execution. It exists to verify a module or system as a whole.',
    '**Test-driven development (TDD)** — A software engineering practice where tests are written before the implementation code. It exists to force developers to design the interface and edge cases before getting bogged down in implementation details.',
    '**Context manager** — A construct that sets up and tears down resources automatically, often used with the with statement. Here, it is used to capture exceptions within a specific block of code.',
  ],

  checkpoints: ['read-intuition'],
}
