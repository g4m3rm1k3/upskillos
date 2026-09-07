// Guttag — Lesson 33: Recursion and Induction
// Auto-converted from src/docs/tutorials/guttag-python/lesson-33.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-33-recursion-and-induction',
  slug: 'recursion-and-induction',
  chapter: 5,
  order: 5,
  title: 'Recursion and Induction',
  subtitle: 'Proving Programs Correct',
  tags: ['mathematical-induction', 'base-case', 'inductive-step', 'loop-invariant', 'structural-induction', 'precondition'],

  hook: {
    question: 'What is "Recursion and Induction", and why does it matter?',
    realWorldContext: 'The reader understands the correspondence between mathematical induction and recursive programs: the base case of induction corresponds to the base case of recursion; the inductive step corresponds to the recursive case. They learn to reason about program correctness using loop invariants and induction. The transferable insight: a correct recursive program is a proof by induction. The base case proves the simplest input. The inductive step assumes the recursive call is correct and shows the whole function is correct. This mental model catches bugs before you even run the code.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Induction and recursion — the correspondence, Loop invariants — reasoning about iterative programs, Recursive correctness — structural induction on lists, Preconditions and postconditions, Termination — proving a program stops.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Mathematical induction:** A mathematical proof technique. It exists to prove that a property holds for all natural numbers by proving it for a base case and proving that if it holds for $k$, it holds for $k+1$.\n- **Base case:** The condition under which a recursive function returns a value without making any subsequent recursive calls. It exists to stop the recursion and provide a foundational value.\n- **Inductive step:** The part of a mathematical proof or recursive function that relies on the assumption that a smaller instance of the problem is already solved. It exists to build the solution for size $n$ from size $n-1$.\n- **Loop invariant:** A property that is true before a loop begins, at the end of each iteration, and after the loop terminates. It exists to formally prove the correctness of iterative algorithms.\n- **Structural induction:** A generalization of mathematical induction that inducts on the structure of data (like lists or trees) rather than just integers. It exists to prove properties about functions that operate on recursive data structures.\n- **Precondition:** A condition that must be true before a function is called. It exists to explicitly define the expected state or inputs, relieving the function from handling invalid data.\n- **Postcondition:** A condition that is guaranteed to be true after a function finishes execution, provided its preconditions were met. It exists to define the function\'s contract with its caller.\n- **Termination:** The guarantee that a program or function will eventually finish executing. It exists to prevent infinite loops and unbounded recursion.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **print:** A built-in function to output data.\n- **range:** A built-in class for generating a sequence of numbers.\n- **len:** A built-in function to get the number of items in a container.\n- **assert:** A keyword used for debugging purposes.\n- **sorted:** A built-in function to return a new sorted list from an iterable.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace proving `factorial(n)` correct by induction through ALL concept units discussed today: 1. **Induction & Recursion:** The structure explicitly mirrors a formal mathematical proof. 2. **Loop Invariants:** The iterative version holds a continuous property `result = i!` proving it handles every single step perfectly. 3. **Structural Induction:** Not explicitly applicable to integer sequences, but confirms the logic extends to arrays. 4. **Preconditions & Postconditions:** The assumption $n \\ge 0$ is the precondition, and returning $n!$ is the postcondition, sealing the contract. 5. **Termination:** The decreasing measure is $n$. Because $n$ starts $\\ge 0$ and decreases by exactly 1 each call, it absolutely must hit the base case $0$, guaranteeing it will never hang. By applying all these principles, we can definitively prove a program is mathematically correct without having to execute it for every conceivable integer.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 33: Recursion and Induction',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Recursion and Induction',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Induction and recursion — the correspondence',
              prose: [
                'How can we be absolutely certain that a function calling itself will always produce the correct result without manually tracing every possible input? If a recursive function is a chain of deferred operations, what mathematical principle guarantees the final answer is right? What would happen if we didn\'t have a solid mathematical underpinning for recursion?',
                'This output proves the direct correspondence. Trace the correspondence: base case `n=0`: return `1=0!`. Inductive step: IF `factorial(n-1)=(n-1)!` THEN `n*factorial(n-1)=n*(n-1)!=n!`. By induction, the function is correct for all $n \\ge 0$. The structure of the code *is* the proof.',
                '```text\nfactorial(0) = 1\nfactorial(1) = 1\nfactorial(2) = 2\nfactorial(3) = 6\nfactorial(4) = 24\nfactorial(5) = 120\n```'
              ],
              typeIt: true,
              solution: '# Mathematical induction:\n# 1. Base case: prove P(0) is true\n# 2. Inductive step: if P(k) is true, prove P(k+1) is true\n# 3. Conclusion: P(n) is true for all n >= 0\n\n# Recursive program mirrors this exactly:\ndef factorial(n):\n    # CLAIM: factorial(n) returns n! for all n >= 0\n    # BASE CASE (n=0): returns 1 = 0! ✓\n    if n == 0:\n        return 1\n    # INDUCTIVE STEP: assume factorial(n-1) returns (n-1)!\n    # (the inductive hypothesis)\n    # Then: n * factorial(n-1) = n * (n-1)! = n! ✓\n    return n * factorial(n - 1)\n\nfor i in range(6):\n    print(f\'factorial({i}) = {factorial(i)}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Induction and recursion — the correspondence — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def factorial(n):`: Defines a new function named `factorial` taking a single argument `n`.\n- `if n == 0:`: Checks the equality operator to see if `n` is exactly `0`. This is the base case check.\n- `return 1`: Returns the integer `1`. This resolves the base case without further recursion.\n- `return n * factorial(n - 1)`: Multiplies `n` by the result of the recursive call `factorial(n - 1)`. The multiplication operator `*` combines the current step with the inductive hypothesis.',
                '**Expected behavior.** Predicted confidently: `factorial(5)` returns `120`.',
                '**CS lens.** The CS concept is **Induction and Recursion Equivalence**. Mathematical induction is the formal tool used to prove the correctness of recursive algorithms. Real-world places it appears: proving compiler correctness, validating recursive descent parsers, formal verification of cryptographic protocols, and type checking systems.',
                '**SE lens.** Design principle: **Correctness by Construction**. By writing the code to explicitly map to the mathematical proof, we avoid off-by-one errors. Alternative NOT chosen: unstructured iterative state. The real tradeoff is that recursion maps cleaner to the proof but can consume stack space (stack overflow), whereas iteration is memory-efficient but requires a loop invariant to prove.'
              ],
              typeIt: true,
              solution: 'def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n - 1)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Loop invariants — reasoning about iterative programs',
              prose: [
                'If recursion uses induction for proof, how do we prove an iterative `while` or `for` loop is correct? How can we know that mutable state updating on every cycle eventually converges to the right answer? What property remains constant while the variables change?',
                'This output proves the invariant holds throughout. Trace `factorial_iter_traced(4)`: Init: `result=1=0!`. `i=1`: `result=1=1!`. `i=2`: `result=2=2!`. `i=3`: `result=6=3!`. `i=4`: `result=24=4!`. Loop exits when `i=5`: return `24`.',
                '```text\nInit: result=1 (should be 0!=1)\nAfter i=1: result=1 (should be 1!=1)\nAfter i=2: result=2 (should be 2!=2)\nAfter i=3: result=6 (should be 3!=6)\nAfter i=4: result=24 (should be 4!=24)\n```'
              ],
              typeIt: true,
              solution: 'def factorial(n):\n    if n == 0: return 1\n    return n * factorial(n-1)\n\ndef factorial_iter_traced(n):\n    result, i = 1, 1\n    print(f\'Init: result={result} (should be 0!=1)\')\n    while i <= n:\n        result *= i\n        print(f\'After i={i}: result={result} (should be {i}!={factorial(i)})\')\n        assert result == factorial(i), \'Invariant violated!\'\n        i += 1\n    return result\n\nfactorial_iter_traced(4)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Loop invariants — reasoning about iterative programs — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def factorial_iter(n):`: Defines the function.\n- `result = 1`: Initializes the accumulator variable to `1`.\n- `i = 1`: Initializes the loop counter to `1`.\n- `while i <= n:`: Evaluates the loop condition. The loop continues as long as `i` is less than or equal to `n`.\n- `result *= i`: Multiplies `result` by `i` and assigns it back to `result`. This maintains the invariant.\n- `i += 1`: Increments the loop counter `i` by `1`.\n- `return result`: Returns the final accumulated result.',
                '**Expected behavior.** Predicted confidently: `factorial_iter(5)` returns `120`.',
                '**CS lens.** The CS concept is **Loop Invariants**. An invariant is a condition that is true before and after every execution of a block of code. Real-world places it appears: Hoare logic for program verification, loop unrolling optimizations in compilers, proving sorting algorithm correctness (like Quicksort partitions), and database transaction isolation proofs.',
                '**SE lens.** Design principle: **Defensive Programming with Assertions**. Using an explicit `assert` in development to check the invariant ensures the loop logic is flawless. Alternative NOT chosen: relying entirely on unit tests. Real tradeoff: assertions run continuously during execution and can incur a performance penalty, whereas unit tests only run at build time, but assertions catch internal state corruption instantly.'
              ],
              typeIt: true,
              solution: 'def factorial_iter(n):\n    result = 1\n    i = 1\n    while i <= n:\n        result *= i\n        i += 1\n    return result',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Recursive correctness — structural induction on lists',
              prose: [
                'Mathematical induction works beautifully on natural numbers ($0, 1, 2, ...$), but how do we prove correctness for functions that process lists, trees, or graphs? What is the equivalent of $n=0$ for a list? What represents $n-1$ when dealing with a sequence of items?',
                'This output proves the structural inductive steps. Trace `sum_list([1,2,3])`: `lst=[1,2,3]` not empty. `lst[0]=1`. `sum_list([2,3])=5` (by inductive hypothesis). Return `1+5=6`. Trace: `sum_list([2,3]) = 2 + sum_list([3]) = 2 + 3 + sum_list([]) = 2 + 3 + 0 = 5`.',
                '```text\n15\n[4, 3, 2, 1]\n```'
              ],
              typeIt: true,
              solution: '# Structural induction: induct on the STRUCTURE of data, not just integers\n# Base case: empty list []\n# Inductive step: non-empty list [head] + tail\n#   assume correct for tail, prove correct for [head]+tail\n\ndef sum_list(lst):\n    # CLAIM: sum_list(lst) returns sum of elements in lst\n    # BASE CASE (lst=[]): returns 0 = sum([]) ✓\n    if not lst:\n        return 0\n    # INDUCTIVE STEP: assume sum_list(lst[1:]) = sum(lst[1:])\n    # Then: lst[0] + sum_list(lst[1:]) = lst[0] + sum(lst[1:]) = sum(lst) ✓\n    return lst[0] + sum_list(lst[1:])\n\ndef reverse_list(lst):\n    # BASE CASE: [] reversed is []\n    if not lst:\n        return []\n    # INDUCTIVE STEP: assume reverse_list(lst[1:]) reverses the tail\n    # Then: reverse_list(lst[1:]) + [lst[0]] reverses the whole list\n    return reverse_list(lst[1:]) + [lst[0]]\n\nprint(sum_list([1,2,3,4,5]))\nprint(reverse_list([1,2,3,4]))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Recursive correctness — structural induction on lists — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def sum_list(lst):`: Defines the function taking a single list argument.\n- `if not lst:`: Evaluates the truthiness of the list. An empty list is false, so `not lst` checks the base case.\n- `return 0`: Returns `0` if the list is empty.\n- `return lst[0] + sum_list(lst[1:])`: Accesses the first element `lst[0]` and adds it to the result of recursively calling `sum_list` on the slice `lst[1:]` (the rest of the list).',
                '**Expected behavior.** Predicted confidently: `sum_list([1, 2, 3])` returns `6`.',
                '**CS lens.** The CS concept is **Structural Induction**. It is a proof technique used in mathematical logic and computer science to prove propositions about recursively defined structures. Real-world places it appears: proving properties of abstract syntax trees in compilers, validating JSON parsing rules, formalizing database query equivalence, and verifying tree traversal algorithms.',
                '**SE lens.** Design principle: **Recursive Data Transformation**. Code structurally mimics the data it processes. Alternative NOT chosen: a standard `for` loop over indices. Real tradeoff: slicing `lst[1:]` in Python creates a new list copy on each recursive call, causing $O(N^2)$ time complexity and memory overhead, whereas an iterative approach modifies state in-place for $O(N)$ speed.'
              ],
              typeIt: true,
              solution: 'def sum_list(lst):\n    if not lst:\n        return 0\n    return lst[0] + sum_list(lst[1:])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Preconditions and postconditions',
              prose: [
                'How can a function guarantee it works if the caller passes garbage data? If a binary search requires a sorted list, is it the function\'s job to sort it, or the caller\'s job to guarantee it? How do we formalize these expectations?',
                'This output proves the function meets its postcondition. Trace invariant: Initially target in `lst[0..4]` if present. `mid=2`: `lst[2]=5<7` -> `lo=3`. Invariant: target in `lst[3..4]`. `mid=3`: `lst[3]=7==7`. Found. Invariant maintained at each step.',
                '```text\n3\n-1\n```'
              ],
              typeIt: true,
              solution: 'def binary_search(sorted_lst, target):\n    \'\'\'\n    Precondition: sorted_lst is sorted in ascending order.\n    Postcondition: returns index i where sorted_lst[i] == target,\n                   or -1 if target not in sorted_lst.\n    \'\'\'\n    # Assert precondition in debug mode:\n    assert sorted_lst == sorted(sorted_lst), \'Precondition violated: not sorted\'\n\n    lo, hi = 0, len(sorted_lst) - 1\n    # Invariant: target is in sorted_lst[lo..hi] if it exists\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if sorted_lst[mid] == target:\n            return mid   # postcondition satisfied\n        elif sorted_lst[mid] < target:\n            lo = mid + 1  # invariant maintained: target in [mid+1..hi]\n        else:\n            hi = mid - 1  # invariant maintained: target in [lo..mid-1]\n    return -1  # postcondition: -1 because lo > hi (no elements remain)\n\nprint(binary_search([1,3,5,7,9], 7))\nprint(binary_search([1,3,5,7,9], 4))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Preconditions and postconditions — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def binary_search(sorted_lst, target):`: Defines the binary search function with two parameters.\n- `assert sorted_lst == sorted(sorted_lst)`: Checks the precondition that the list is already sorted.\n- `lo, hi = 0, len(sorted_lst) - 1`: Initializes the two pointer bounds representing the search space.\n- `while lo <= hi:`: Loops as long as the search space is valid.\n- `mid = (lo + hi) // 2`: Calculates the midpoint index using integer division.\n- `if sorted_lst[mid] == target:`: Checks if the target is found at the midpoint.\n- `return mid`: Satisfies the postcondition by returning the successful index.\n- `elif sorted_lst[mid] < target:`: Narrows the search to the right half if the target is larger.\n- `lo = mid + 1`: Updates the lower bound.\n- `else:`: Handles the case where the target is smaller.\n- `hi = mid - 1`: Updates the upper bound.\n- `return -1`: Satisfies the postcondition by returning `-1` when the target is not found.',
                '**Expected behavior.** Predicted confidently: `binary_search([1, 2, 3], 2)` returns `1`.',
                '**CS lens.** The CS concept is **Design by Contract**. Software components should have clear, formal, and verifiable interfaces. Real-world places it appears: standard library API specifications, Eiffel programming language features, formal verification tools (like Dafny), and REST API OpenAPI schemas validating inputs before processing.',
                '**SE lens.** Design principle: **Fail Fast**. Asserting preconditions at the top boundary prevents corrupt state from propagating deep into the program. Alternative NOT chosen: quietly returning `-1` if the list is unsorted. Real tradeoff: adding assertions or validation adds runtime cost on every call; trusting the caller avoids overhead but risks subtle, impossible-to-debug logic failures later.'
              ],
              typeIt: true,
              solution: 'def binary_search(sorted_lst, target):\n    assert sorted_lst == sorted(sorted_lst), \'Precondition violated\'\n    lo, hi = 0, len(sorted_lst) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if sorted_lst[mid] == target:\n            return mid\n        elif sorted_lst[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Termination — proving a program stops',
              prose: [
                'How do we mathematically prove that our recursive functions or while loops don\'t run forever? What prevents a while loop condition from remaining perpetually true? How do we establish a "decreasing measure" to ensure finality?',
                'This output proves the function halted for input 6, but does not prove it for all inputs. Trace `collatz(6)`: `6` even -> `collatz(3)`. `3` odd -> `collatz(10)`. `10` even -> `collatz(5)`. `5` odd -> `collatz(16)`. `16 -> 8 -> 4 -> 2 -> 1`. Stop. 8 steps. No one has proven collatz terminates for ALL $n$ (Collatz conjecture, unsolved).',
                '```text\n6 3 10 5 16 8 4 2 1 \n8 steps\n```'
              ],
              typeIt: true,
              solution: '# Termination requires a DECREASING MEASURE that is bounded below\n# For factorial(n): measure = n. Each call: n decreases by 1.\n# When n=0 (base case): stops.\n\n# For binary_search: measure = hi - lo + 1 (number of candidates)\n# Each iteration: either found (stop) or range halved -> measure decreases\n# When lo > hi: measure = 0 or negative -> loop exits\n\n# Termination proof for collatz (harder: not proven for all n!):\ndef collatz(n, steps=0):\n    print(f\'{n}\', end=\' \')\n    if n == 1:\n        print(f\'\\n{steps} steps\')\n        return steps\n    if n % 2 == 0:\n        return collatz(n // 2, steps + 1)   # n decreases\n    else:\n        return collatz(3 * n + 1, steps + 1)  # n may INCREASE!\n\ncollatz(6)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Termination — proving a program stops — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def collatz(n):`: Defines the function testing the Collatz conjecture.\n- `if n == 1:`: The base case check.\n- `return True`: Stops the recursion if the value reaches `1`.\n- `if n % 2 == 0:`: Evaluates whether `n` is even using the modulo operator.\n- `return collatz(n // 2)`: Calls the function recursively with `n // 2`. The state decreases.\n- `else:`: The fallback condition if `n` is odd.\n- `return collatz(3 * n + 1)`: Calls the function recursively with `3 * n + 1`. The state *increases*.',
                '**Expected behavior.** Predicted confidently: `collatz(16)` returns `True`.',
                '**CS lens.** The CS concept is **Program Termination and the Halting Problem**. Alan Turing proved that no general algorithm can determine whether every possible program will eventually halt. Real-world places it appears: static analyzers verifying timeout conditions, type systems with bounded recursion (like Total Functional Programming languages such as Idris), infinite loop detection in CI/CD, and smart contract gas limits in blockchain.',
                '**SE lens.** Design principle: **Guaranteed Progress**. Every loop iteration or recursive call must measurably move closer to the exit condition. Alternative NOT chosen: relying on arbitrary timeouts. Real tradeoff: adding strict monotonicity checks requires extra variables and arithmetic that can complicate the code, but without it, the program is vulnerable to hanging under edge-case data.'
              ],
              typeIt: true,
              solution: 'def collatz(n):\n    if n == 1:\n        return True\n    if n % 2 == 0:\n        return collatz(n // 2)\n    else:\n        return collatz(3 * n + 1)',
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
      'Next lesson: Dynamic Programming.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Loop invariant"?',
      options: [
        'A condition that is guaranteed to be true after a function finishes execution, provided its preconditions were met. It exists to define the function\'s contract with its caller.',
        'A property that is true before a loop begins, at the end of each iteration, and after the loop terminates. It exists to formally prove the correctness of iterative algorithms.',
        'A mathematical proof technique. It exists to prove that a property holds for all natural numbers by proving it for a base case and proving that if it holds for $k$, it holds for $k+1$.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Mathematical induction"?',
      options: [
        'A generalization of mathematical induction that inducts on the structure of data (like lists or trees) rather than just integers. It exists to prove properties about functions that operate on recursive data structures.',
        'A mathematical proof technique. It exists to prove that a property holds for all natural numbers by proving it for a base case and proving that if it holds for $k$, it holds for $k+1$.',
        'The condition under which a recursive function returns a value without making any subsequent recursive calls. It exists to stop the recursion and provide a foundational value.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Structural induction"?',
      options: [
        'The guarantee that a program or function will eventually finish executing. It exists to prevent infinite loops and unbounded recursion.',
        'The condition under which a recursive function returns a value without making any subsequent recursive calls. It exists to stop the recursion and provide a foundational value.',
        'A generalization of mathematical induction that inducts on the structure of data (like lists or trees) rather than just integers. It exists to prove properties about functions that operate on recursive data structures.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Inductive step"?',
      options: [
        'A condition that is guaranteed to be true after a function finishes execution, provided its preconditions were met. It exists to define the function\'s contract with its caller.',
        'A generalization of mathematical induction that inducts on the structure of data (like lists or trees) rather than just integers. It exists to prove properties about functions that operate on recursive data structures.',
        'The part of a mathematical proof or recursive function that relies on the assumption that a smaller instance of the problem is already solved. It exists to build the solution for size $n$ from size $n-1$.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Mathematical induction** — A mathematical proof technique. It exists to prove that a property holds for all natural numbers by proving it for a base case and proving that if it holds for $k$, it holds for $k+1$.',
    '**Base case** — The condition under which a recursive function returns a value without making any subsequent recursive calls. It exists to stop the recursion and provide a foundational value.',
    '**Inductive step** — The part of a mathematical proof or recursive function that relies on the assumption that a smaller instance of the problem is already solved. It exists to build the solution for size $n$ from size $n-1$.',
    '**Loop invariant** — A property that is true before a loop begins, at the end of each iteration, and after the loop terminates. It exists to formally prove the correctness of iterative algorithms.',
    '**Structural induction** — A generalization of mathematical induction that inducts on the structure of data (like lists or trees) rather than just integers. It exists to prove properties about functions that operate on recursive data structures.',
    '**Precondition** — A condition that must be true before a function is called. It exists to explicitly define the expected state or inputs, relieving the function from handling invalid data.',
    '**Postcondition** — A condition that is guaranteed to be true after a function finishes execution, provided its preconditions were met. It exists to define the function\'s contract with its caller.',
    '**Termination** — The guarantee that a program or function will eventually finish executing. It exists to prevent infinite loops and unbounded recursion.',
  ],

  checkpoints: ['read-intuition'],
}
