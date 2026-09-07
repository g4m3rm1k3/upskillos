// Guttag — Lesson 13: Recursion
// Auto-converted from src/docs/tutorials/guttag-python/lesson-13.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-13-recursion',
  slug: 'recursion',
  chapter: 2,
  order: 8,
  title: 'Recursion',
  subtitle: 'The Function That Calls Itself',
  tags: ['recursion', 'base-case', 'recursive-case', 'call-stack'],

  hook: {
    question: 'What is "Recursion", and why does it matter?',
    realWorldContext: 'This lesson introduces recursion by building and analyzing several functions that call themselves. We will compute factorials, explore Python\'s recursion limits, trace execution depth, flatten nested recursive data structures, and compare recursive and iterative approaches.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Base case and recursive case, The call stack and Python\'s recursion limit, Tracing recursion with instrumentation, Recursive data structures (nested lists), Recursion vs. iteration.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Recursion:** A programming technique where a function calls itself.\n- **Base Case:** The condition that stops the recursion.\n- **Recursive Case:** The part of the function that executes the self-call.\n- **Call Stack:** A stack data structure storing information about active subroutines.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **sys.getrecursionlimit():** A standard library method from the sys module.\n- **isinstance():** A built-in function to check variable types.\n- **list.extend():** A list method that merges an iterable into the list.\n- **list.append():** A list method that adds a single item.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace `factorial(4)` through everything we\'ve learned today. The function evaluates if `n == 0` (the base case) and proceeds to `n * factorial(n - 1)` (the recursive case). Each subsequent call pushes a new frame onto the call stack, moving closer to the base case while safely staying under Python\'s recursion limit. Our instrumented trace showed exactly how `factorial(0)` finally returns `1`, causing the stack to unwind, resolving all pending math operations until `24` pops out at the top. While iteration is faster for flat numerical series like Fibonacci, recursion reigns supreme for deep nested structures like parsing trees or flattening multidimensional arrays.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 13: Recursion',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Recursion',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Base case and recursive case',
              prose: [
                'How do we write a function that performs a repeated mathematical operation, like a factorial, without using a traditional `for` or `while` loop? What happens if a function tries to call itself? How would it ever know when to stop?',
                'This proves that a function can call itself and successfully complete as long as an `if` condition eventually halts the chain of calls. This is called a **recursive function**.',
                '```text\nDone\n```'
              ],
              typeIt: true,
              solution: 'def simple_recurse(n):\n    if n == 0:\n        return "Done"\n    return simple_recurse(n - 1)\n\nprint(simple_recurse(3))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Base case and recursive case — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def factorial(n):`: Defines a new function named `factorial` taking one parameter `n`.\n- `if n == 0:`: Evaluates whether `n` has reached the base case of `0`.\n- `return 1`: Returns the constant `1` immediately without any further function calls if the base case is met.\n- `return`: Instructs the function to output a calculated value.\n- `n * factorial(n - 1)`: Multiplies the current `n` by the result of calling `factorial` again, but with `n - 1`.\n- `print(...)`: Executes the function with arguments `0`, `1`, and `5`, printing the returned integers.',
                '**Expected behavior.** ```text 1 1 120 ``` Trace: `factorial(5) = 5 * factorial(4) = 5 * 4 * factorial(3) = ... = 120`.',
                '**CS lens.** Recursion is a fundamental CS concept based on mathematical induction. Real-world applications include tree traversals, parsing expressions in compilers, divide-and-conquer algorithms like Quicksort, and fractal generation in graphics.',
                '**SE lens.** Design principle: Recursive logic is often more readable than maintaining a manual stack or complex iteration state for hierarchical data. The alternative not chosen is using a `while` loop with a local accumulator, which trades mathematical purity and readability for slight performance gains.'
              ],
              typeIt: true,
              solution: 'def factorial(n):\n    if n == 0:               # base case: answer is known\n        return 1\n    return n * factorial(n - 1)  # recursive case: reduce problem\n\nprint(factorial(0))  # 1\nprint(factorial(1))  # 1\nprint(factorial(5))  # 120',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'The call stack and Python\'s recursion limit',
              prose: [
                'If a recursive function never reaches its base case, will it run forever like an infinite `while` loop? Does the computer keep track of every unresolved function call, and if so, is there a limit to how many it can remember?',
                'If we run this, it eventually crashes with a `RecursionError`. This proves that every active function call consumes a finite system resource, and Python strictly limits how deep this can go.'
              ],
              typeIt: true,
              solution: 'def infinite(n):\n    return infinite(n + 1)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'The call stack and Python\'s recursion limit — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import sys`: Loads the built-in system module.\n- `print(sys.getrecursionlimit())`: Calls the `getrecursionlimit()` function on the `sys` object and prints its integer return value.\n- `def safe_count(n, limit):`: Defines a function with two parameters: the current count and the maximum allowed depth.\n- `if n >= limit:`: Evaluates if the current state exceeds or equals the safe boundary.\n- `return n`: Returns the count directly, stopping the recursion.\n- `return safe_count(n + 1, limit)`: Recursively calls itself with an incremented `n`.',
                '**Expected behavior.** ```text 1000 10 ``` Trace: Each call adds a frame to the Python call stack. At 1000 frames: `RecursionError`. Our limit of 10 stops the stack at 10 frames safely.',
                '**CS lens.** The Call Stack is the CS concept here. When a function calls another (or itself), a new "frame" is pushed onto the call stack. Real-world analogies include a stack of plates, a trail of breadcrumbs in a maze, browser history back buttons, or a pile of sticky notes reminding you to resume tasks.',
                '**SE lens.** Design principle: Fail-safes. Passing an explicit `limit` parameter protects against catastrophic resource exhaustion. The alternative not chosen is relying on the environment\'s global recursion limit to catch bugs, which results in hard application crashes (`RecursionError`) instead of graceful exits.'
              ],
              typeIt: true,
              solution: 'import sys\nprint(sys.getrecursionlimit())  # 1000\n\ndef safe_count(n, limit):\n    if n >= limit:\n        return n          # base case\n    return safe_count(n + 1, limit)  # recursive case\n\nprint(safe_count(0, 10))  # 10',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Tracing recursion with instrumentation',
              prose: [
                'How can we actually see the call stack growing and shrinking? When `factorial(4)` executes, exactly in what order do the recursive calls happen and when do they finally return their values?',
                'This proves that code placed *before* the recursive call executes on the way "down" (or "in"), and code placed *after* it executes on the way "up" (or "out"), in reverse order.',
                '```text\nIn at depth 0\n  In at depth 1\nOut of depth 0\n```'
              ],
              typeIt: true,
              solution: 'def echo_trace(depth):\n    print(f"{\'  \' * depth}In at depth {depth}")\n    if depth == 1:\n        return\n    echo_trace(depth + 1)\n    print(f"{\'  \' * depth}Out of depth {depth}")\n\necho_trace(0)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Tracing recursion with instrumentation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def factorial_traced(n, depth=0):`: Defines a function with a default parameter `depth` to track recursion level.\n- `indent = \'  \' * depth`: Creates a string of spaces proportional to the current stack depth via string multiplication.\n- `print(f\'{indent}factorial({n}) called\')`: Evaluates an f-string to log execution before recursing.\n- `if n == 0:`: Checks the base case.\n- `print(...)`: Logs the base case discovery.\n- `return 1`: Returns from the base case.\n- `result = n * factorial_traced(n - 1, depth + 1)`: Assigns the value of the recursive call to a variable `result`, capturing it instead of returning it immediately.\n- `print(f\'{indent}factorial({n}) -> returning {result}\')`: Logs the computed return value after the recursive call completes.\n- `return result`: Finally returns the computed product up the stack.',
                '**Expected behavior.** ```text factorial(4) called factorial(3) called factorial(2) called factorial(1) called factorial(0) called base case -> returning 1 factorial(1) -> returning 1 factorial(2) -> returning 2 factorial(3) -> returning 6 factorial(4) -> returning 24 ```',
                '**CS lens.** Instrumentation is the CS concept of adding diagnostic code to a system to monitor its internal execution state. Real-world uses include performance profilers, logging middleware in web servers, debugging hooks in game engines, and telemetry in distributed microservices.',
                '**SE lens.** Design principle: Observability. By capturing the recursive result into a variable `result` before returning it, we gain a place to inject a `print` statement. The alternative not chosen is keeping the terse one-line return `return n * factorial(...)`, which is cleaner but fundamentally impossible to log halfway through.'
              ],
              typeIt: true,
              solution: 'def factorial_traced(n, depth=0):\n    indent = \'  \' * depth\n    print(f\'{indent}factorial({n}) called\')\n    if n == 0:\n        print(f\'{indent}base case -> returning 1\')\n        return 1\n    result = n * factorial_traced(n - 1, depth + 1)\n    print(f\'{indent}factorial({n}) -> returning {result}\')\n    return result\n\nfactorial_traced(4)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Recursive data structures (nested lists)',
              prose: [
                'How can we process a list that contains other lists of varying depths, like `[1, [2, [3, 4]], 5]`? A simple `for` loop only reads the first level, leaving the inner lists intact. How do we extract every primitive item regardless of how deeply nested it is?',
                'This proves we can dynamically inspect whether an item is a standard value or another list at runtime, allowing us to branch our logic accordingly.',
                '```text\nIt is a list!\n```'
              ],
              typeIt: true,
              solution: 'item = [1, 2]\nif isinstance(item, list):\n    print("It is a list!")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Recursive data structures (nested lists) — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def flatten(lst):`: Defines a new function taking a single argument `lst`.\n- `result = []`: Initializes an empty list to act as the accumulator for this specific frame.\n- `for item in lst:`: Iterates over the items in the current list layer.\n- `if isinstance(item, list):`: Checks the type of `item` to see if it is itself a list.\n- `result.extend(...)`: Mutates the `result` list by adding all elements yielded by the expression inside.\n- `flatten(item)`: The recursive call handling the inner nested list.\n- `else:`: Executes when the item is a standard value (the base case for this branch).\n- `result.append(item)`: Mutates `result` by attaching the single item directly.\n- `return result`: Yields the fully flattened sub-list back up the stack.',
                '**Expected behavior.** ```text [1, 2, 3, 4, 5] [] [1, 2, 3] ``` Trace `flatten([1, [2, [3,4]], 5])`: item=1 not list -> append 1. item=[2,[3,4]] is list -> recurse: `flatten([2,[3,4]])`: item=2 -> append 2; item=[3,4] -> recurse: `flatten([3,4])`: item=3->3, item=4->4. Returns `[3,4]`. Back: `[2,3,4]`. item=5 -> append 5. Result: `[1,2,3,4,5]`.',
                '**CS lens.** Recursive Data Structures are constructs defined in terms of themselves. Real-world appearances include the Document Object Model (DOM) in web browsers, filesystem directory trees, JSON objects, and Abstract Syntax Trees (ASTs) in language compilers.',
                '**SE lens.** Design principle: Polymorphic handling. By dynamically checking types with `isinstance`, the function dynamically adapts its flow based on the data shape. The alternative not chosen is hardcoding multiple nested loops (`for x in item: for y in x...`), which catastrophically breaks as soon as the nesting depth exceeds the hardcoded limit.'
              ],
              typeIt: true,
              solution: 'def flatten(lst):\n    result = []\n    for item in lst:\n        if isinstance(item, list):      # recursive case: item is a list\n            result.extend(flatten(item))\n        else:                           # base case: item is not a list\n            result.append(item)\n    return result\n\nprint(flatten([1, [2, [3, 4]], 5]))  # [1, 2, 3, 4, 5]\nprint(flatten([]))                   # []\nprint(flatten([1, 2, 3]))            # [1, 2, 3]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Recursion vs. iteration',
              prose: [
                'Are recursive functions always the best tool for the job? If a problem like computing Fibonacci numbers can be written recursively or iteratively, how do we decide which is better in terms of system memory and execution time?',
                'This proves we can reassign multiple variables simultaneously in Python, effectively swapping or advancing state without needing a temporary third variable.',
                '```text\n1 1\n```'
              ],
              typeIt: true,
              solution: 'a, b = 0, 1\na, b = b, a + b\nprint(a, b)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Recursion vs. iteration — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def fib_rec(n):`: Defines the recursive Fibonacci function.\n- `if n <= 1: return n`: The base case, handling 0 and 1.\n- `return fib_rec(n - 1) + fib_rec(n - 2)`: The recursive case firing two distinct function calls on the same stack frame and adding their results together.\n- `def fib_iter(n):`: Defines the iterative function.\n- `a, b = 0, 1`: Initializes two variables simultaneously using tuple unpacking.\n- `for _ in range(n - 1):`: Iterates exactly `n - 1` times. The `_` signifies a throwaway loop counter.\n- `a, b = b, a + b`: Reassigns `a` and `b` simultaneously on each iteration.\n- `return b`: Returns the final accumulated value.',
                '**Expected behavior.** ```text 55 55 354224848179261915075 ``` Trace `fib_iter(5)`: `a=0,b=1`. Iter1: `a=1,b=1`. Iter2: `a=1,b=2`. Iter3: `a=2,b=3`. Iter4: `a=3,b=5`. Return 5. `fib_rec(5)`: Tree of calls, 2^5 = 32 maximum branches versus 4 simple iterations.',
                '**CS lens.** Algorithmic Time Complexity is fundamentally highlighted here. `fib_rec` runs in O(2^n) exponential time because the call tree doubles at every level. `fib_iter` runs in O(n) linear time, iterating a flat number of times. Space complexity also differs: `fib_rec` uses O(n) stack space, while `fib_iter` uses O(1) constant space. Real-world applications of algorithm optimization affect everything from database indexing speed to video rendering times.',
                '**SE lens.** Design principle: Performance vs. Expressiveness. The recursive approach closely mirrors the mathematical definition of Fibonacci, making it highly expressive. However, the alternative chosen (iteration) avoids stack overflows and exponential redundant calculations, illustrating that production software must respect hardware constraints over pure elegance.'
              ],
              typeIt: true,
              solution: '# Recursive Fibonacci (naive - exponential time)\ndef fib_rec(n):\n    if n <= 1:\n        return n\n    return fib_rec(n - 1) + fib_rec(n - 2)\n\n# Iterative Fibonacci (linear time)\ndef fib_iter(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(n - 1):\n        a, b = b, a + b\n    return b\n\nprint(fib_rec(10))   # 55\nprint(fib_iter(10))  # 55\nprint(fib_iter(100)) # 354224848179261915075 (instant)\n# fib_rec(50) would take minutes',
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
      'Next lesson: Modules and Packages.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Recursive Case"?',
      options: [
        'A programming technique where a function calls itself.',
        'The part of the function that executes the self-call.',
        'A stack data structure storing information about active subroutines.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Recursion"?',
      options: [
        'The condition that stops the recursion.',
        'A programming technique where a function calls itself.',
        'The part of the function that executes the self-call.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Base Case"?',
      options: [
        'The part of the function that executes the self-call.',
        'A stack data structure storing information about active subroutines.',
        'The condition that stops the recursion.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Call Stack"?',
      options: [
        'The part of the function that executes the self-call.',
        'The condition that stops the recursion.',
        'A stack data structure storing information about active subroutines.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Recursion** — A programming technique where a function calls itself.',
    '**Base Case** — The condition that stops the recursion.',
    '**Recursive Case** — The part of the function that executes the self-call.',
    '**Call Stack** — A stack data structure storing information about active subroutines.',
  ],

  checkpoints: ['read-intuition'],
}
