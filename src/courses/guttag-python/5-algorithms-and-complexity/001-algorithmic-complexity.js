// Guttag — Lesson 29: Algorithmic Complexity
// Auto-converted from src/docs/tutorials/guttag-python/lesson-29.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-29-algorithmic-complexity',
  slug: 'algorithmic-complexity',
  chapter: 5,
  order: 1,
  title: 'Algorithmic Complexity',
  subtitle: 'Big-O Notation',
  tags: ['big-o-notation', 'constant-time-o-1', 'linear-time-o-n', 'logarithmic-time-o-log-n', 'quadratic-time-o-n-2', 'exponential-time-o-2-n'],

  hook: {
    question: 'What is "Algorithmic Complexity", and why does it matter?',
    realWorldContext: 'The reader understands Big-O notation: O(1), O(log n), O(n), O(n log n), O(n^2), O(2^n), how to derive complexity by counting operations, and why it matters. The transferable insight: Big-O measures how WORK GROWS relative to INPUT SIZE. A function that is 10x slower on 10x the data is O(n). A function that is 100x slower is O(n^2). The complexity class determines whether an algorithm is usable at scale, not the constant factor.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: O(1) and O(n) — constant and linear, O(log n) — binary search, O(n^2) — quadratic: nested loops, O(n log n) and O(2^n), Analyzing Python operations.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Big-O Notation:** A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity. Here, it measures how the runtime or space requirements grow as input size grows.\n- **Constant Time (O(1)):** The runtime is independent of the input size.\n- **Linear Time (O(n)):** The runtime grows directly in proportion to the input size.\n- **Logarithmic Time (O(log n)):** The runtime grows logarithmically as the input size increases (e.g., halving the search space each step).\n- **Quadratic Time (O(n^2)):** The runtime grows proportionally to the square of the input size.\n- **Exponential Time (O(2^n)):** The runtime doubles with each addition to the input data set.\n- **Linearithmic Time (O(n log n)):** The runtime grows in proportion to n multiplied by log n, typical of efficient comparison-based sorts.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **time.perf_counter:** A function that returns the value (in fractional seconds) of a performance counter.\n- **list.sort():** An in-place sorting method for lists.\n- **set():** A built-in Python class for unordered collections of unique elements.\n- **set.add():** A method to add a single element to a set.\n- **str.join():** A method to concatenate an iterable of strings.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We can classify `linear_search` as O(n), `binary_search` as O(log n), `has_duplicates` as O(n^2), and `has_duplicates_fast` as O(n). Understanding these complexity classes allows us to reason about performance independently of hardware speed. At scale, an O(n) algorithm will fundamentally beat an O(n^2) algorithm regardless of the constant factors, because the total work grows much more slowly as the dataset increases.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 29: Algorithmic Complexity',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Algorithmic Complexity',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'O(1) and O(n) — constant and linear',
              prose: [
                'How can we mathematically describe how long a piece of code takes to run? If you have ten times as much data, does the code take ten times as long, or a hundred times as long? Why is it that some operations feel instantaneous regardless of the dataset size, while others bog down the system?',
                'This proves that **Constant Time (O(1))** stays flat regardless of `n`, while **Linear Time (O(n))** grows proportionally with `n`. Trace `linear_search([0,1,...,999], -1)`: checks 0,1,...,999. Target -1 not found. Returns False. Work = n comparisons. 10x n -> 10x comparisons -> 10x time.'
              ],
              typeIt: true,
              solution: 'import time\n\ndef get_first(lst):      # O(1): same work regardless of list size\n    return lst[0]\n\ndef linear_search(lst, target):  # O(n): worst case checks all n elements\n    for item in lst:\n        if item == target:\n            return True\n    return False\n\n# Verify empirically:\nfor n in [1000, 10000, 100000]:\n    data = list(range(n))\n    t0 = time.perf_counter()\n    for _ in range(1000): get_first(data)\n    t_const = time.perf_counter() - t0\n\n    t0 = time.perf_counter()\n    linear_search(data, -1)   # worst case: target not present\n    t_linear = time.perf_counter() - t0\n\n    print(f\'n={n:6d}: O(1)={t_const:.4f}s, O(n)={t_linear:.5f}s\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'O(1) and O(n) — constant and linear — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def get_first(lst):` defines a function taking a list.\n- `return lst[0]` accesses the first element. Array indexing is O(1) because the memory address is calculated directly.\n- `def linear_search(lst, target):` defines a search function.\n- `for item in lst:` iterates through every element.\n- `if item == target:` performs a comparison.\n- `return True` exits early if found.\n- `return False` is reached only if all `n` elements are checked.',
                '**Expected behavior.** Predicted confidently: The printed output will show O(1) times remaining roughly equal across all `n`, while O(n) times increase by a factor of 10 as `n` increases by a factor of 10.',
                '**CS lens.** Algorithmic Complexity (Big-O). It measures the worst-case growth rate of an algorithm\'s resource consumption (usually time or memory) as a function of the input size `n`. Real-world examples: finding a name in an unsorted pile of papers (O(n)), looking up a word in a dictionary (O(log n)), or matching every person in a room with every other person (O(n^2)).',
                '**SE lens.** Design Principle: Scalability. We must choose algorithms based on expected data volume. A simple O(n) linear search is perfectly fine for 10 items, but disastrous for 10 billion. The alternative (always optimizing prematurely) wastes developer time for small datasets, but choosing the wrong complexity class for large datasets causes system failures.'
              ],
              typeIt: true,
              solution: 'def get_first(lst):\n    return lst[0]\n\ndef linear_search(lst, target):\n    for item in lst:\n        if item == target:\n            return True\n    return False',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'O(log n) — binary search',
              prose: [
                'If we have a billion items, a linear search might take a billion steps. If those items are sorted, can we find our target without looking at every single one? How can we systematically eliminate large chunks of the search space?',
                'This proves **Logarithmic Time (O(log n))**. 1000x more data -> only 2x more steps (log2(1000) ~ 10). Trace `binary_search([0..999], 999)`: lo=0, hi=999. mid=499: 499 < 999 -> lo=500. mid=749: 749<999 -> lo=750. mid=874 -> lo=875. mid=937 -> lo=938. mid=968 -> lo=969. mid=984 -> lo=985. mid=992 -> lo=993. mid=996 -> lo=997. mid=998 -> lo=999. mid=999 == target: found in 10 steps.'
              ],
              typeIt: true,
              solution: 'def binary_search(sorted_lst, target):\n    lo, hi = 0, len(sorted_lst) - 1\n    steps = 0\n    while lo <= hi:\n        steps += 1\n        mid = (lo + hi) // 2\n        if sorted_lst[mid] == target:\n            print(f\'Found in {steps} steps\')\n            return mid\n        elif sorted_lst[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    print(f\'Not found in {steps} steps\')\n    return -1\n\nbinary_search(list(range(1000)), 999)\nbinary_search(list(range(1000000)), 999999)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'O(log n) — binary search — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def binary_search(sorted_lst, target):` defines the function.\n- `lo, hi = 0, len(sorted_lst) - 1` sets the initial search bounds to the start and end of the list.\n- `while lo <= hi:` loops as long as the search space is valid.\n- `mid = (lo + hi) // 2` calculates the middle index using integer division.\n- `if sorted_lst[mid] == target:` checks if the middle element is the target.\n- `return mid` returns the index if found.\n- `elif sorted_lst[mid] < target:` checks if the target must be in the right half.\n- `lo = mid + 1` updates the lower bound to shrink the search space by half.\n- `else:` implies the target must be in the left half.\n- `hi = mid - 1` updates the upper bound.\n- `return -1` returns -1 if the loop exhausts the search space without finding the target.',
                '**Expected behavior.** Predicted confidently: Found in 10 steps for 1000 items, and 20 steps for 1,000,000 items.',
                '**CS lens.** Divide and Conquer. Binary search is the classic O(log n) algorithm. Each step eliminates half the remaining possibilities. Real-world examples: guessing a number between 1 and 100 by asking "higher or lower?", searching a physical dictionary by splitting it open, or traversing a balanced binary search tree.',
                '**SE lens.** Preconditions. Binary search *requires* the data to be sorted. The alternative is sorting the data first, which takes O(n log n) time. If you only search once, a linear search (O(n)) is faster than sorting and then binary searching. But if you search thousands of times, sorting once and binary searching thereafter is a massive performance win.'
              ],
              typeIt: true,
              solution: 'def binary_search(sorted_lst, target):\n    lo, hi = 0, len(sorted_lst) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if sorted_lst[mid] == target:\n            return mid\n        elif sorted_lst[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'O(n^2) — quadratic: nested loops',
              prose: [
                'How do we check if a list has any duplicate values? The intuitive way is to compare the first item to all others, then the second item to all others. How does the total amount of work grow as the list size doubles?',
                'This proves **Quadratic Time (O(n^2))**. Doubling `n` results in 4x time for O(n^2), while O(n) only takes 2x time. Trace `has_duplicates([0..3])`: i=0: j=1,2,3. i=1: j=2,3. i=2: j=3. i=3: no j. Total comparisons: 3+2+1 = n*(n-1)/2 = O(n^2).'
              ],
              typeIt: true,
              solution: 'def has_duplicates(lst):     # O(n^2): nested loops\n    n = len(lst)\n    for i in range(n):\n        for j in range(i + 1, n):\n            if lst[i] == lst[j]:\n                return True\n    return False\n\ndef has_duplicates_fast(lst):  # O(n): use a set\n    seen = set()\n    for item in lst:\n        if item in seen:       # O(1) set lookup\n            return True\n        seen.add(item)\n    return False\n\nimport time\nfor n in [1000, 2000, 4000]:\n    data = list(range(n))      # no duplicates\n    t0 = time.perf_counter()\n    has_duplicates(data)\n    t1 = time.perf_counter()\n    has_duplicates_fast(data)\n    t2 = time.perf_counter()\n    print(f\'n={n}: O(n^2)={t1-t0:.4f}s, O(n)={t2-t1:.4f}s\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'O(n^2) — quadratic: nested loops — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def has_duplicates(lst):` defines the naive approach.\n- `n = len(lst)` gets the list length.\n- `for i in range(n):` iterates over every index.\n- `for j in range(i + 1, n):` iterates over all subsequent indices. This nested loop structure causes O(n^2) complexity.\n- `if lst[i] == lst[j]:` compares two elements.\n- `return True` returns immediately if a duplicate is found.\n- `return False` is reached only if no duplicates exist.\n- `def has_duplicates_fast(lst):` defines the optimized approach.\n- `seen = set()` initializes an empty set for O(1) lookups.\n- `for item in lst:` iterates through the list once (O(n)).\n- `if item in seen:` checks for membership in constant time.\n- `return True` exits if found.\n- `seen.add(item)` adds the item to the set.\n- `return False` returns if no duplicates were found.',
                '**Expected behavior.** Predicted confidently: The O(n^2) time will roughly quadruple when `n` doubles, whereas the O(n) time will only double.',
                '**CS lens.** Space-Time Tradeoff. We reduced the time complexity from O(n^2) to O(n) by using a hash set. This costs O(n) additional memory. Real-world examples of O(n^2): comparing every pixel in an image to every other pixel, bubble sort, or naive collision detection between many moving objects.',
                '**SE lens.** Algorithmic scaling. O(n^2) algorithms often pass unit tests (where n=10) with flying colors, but completely freeze production systems (where n=1,000,000). The alternative is to recognize nested loops over the same dataset and proactively look for a hashing or sorting-based optimization.'
              ],
              typeIt: true,
              solution: 'def has_duplicates(lst):\n    n = len(lst)\n    for i in range(n):\n        for j in range(i + 1, n):\n            if lst[i] == lst[j]:\n                return True\n    return False\n\ndef has_duplicates_fast(lst):\n    seen = set()\n    for item in lst:\n        if item in seen:\n            return True\n        seen.add(item)\n    return False',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'O(n log n) and O(2^n)',
              prose: [
                'How expensive is sorting a list? And what happens when a function calls itself multiple times per step, branching out like a tree?',
                'This proves **Exponential Time (O(2^n))** grows explosively. Trace `fib_exp(4)`: calls fib(3)+fib(2). fib(3) calls fib(2)+fib(1). fib(2) called TWICE. Tree has 2^4=16 calls for n=4. `fib(30)`: ~2^30 = 1 billion calls.'
              ],
              typeIt: true,
              solution: 'import time\n\n# O(n log n): sorting (Python\'s sort, merge sort, heap sort)\ndef count_operations_sort(n):\n    data = list(range(n, 0, -1))  # reverse sorted: worst case for many sorts\n    t0 = time.perf_counter()\n    data.sort()                    # Timsort: O(n log n)\n    return time.perf_counter() - t0\n\n# O(2^n): exponential - naive recursive Fibonacci\ndef fib_exp(n):\n    if n <= 1:\n        return n\n    return fib_exp(n-1) + fib_exp(n-2)  # 2 recursive calls: 2^n total calls\n\n# Measure fib_exp: grows explosively\nfor n in [10, 20, 30]:\n    t0 = time.perf_counter()\n    result = fib_exp(n)\n    elapsed = time.perf_counter() - t0\n    print(f\'fib({n})={result}, time={elapsed:.4f}s\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'O(n log n) and O(2^n) — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def fib_exp(n):` defines a function taking an integer.\n- `if n <= 1:` is the base case for the recursion.\n- `return n` returns the value for 0 or 1.\n- `return fib_exp(n-1) + fib_exp(n-2)` is the recursive step, calling the function twice. This branching causes the total number of calls to double for each increase in `n`.',
                '**Expected behavior.** Predicted confidently: `fib(10)` takes ~0.0s, `fib(20)` takes ~0.01s, `fib(30)` takes ~0.3s, and `fib(40)` takes ~30s.',
                '**CS lens.** Combinatorial Explosion. Exponential time algorithms are practically unusable for n > 50. Real-world examples of O(2^n) or O(n!): the Traveling Salesperson Problem, brute-forcing a password, or naive recursive backtracking. **Linearithmic Time (O(n log n))** is the best possible worst-case time for comparison-based sorting algorithms.',
                '**SE lens.** Algorithmic bounds. Whenever you see a recursive function that makes two or more calls to itself, carefully analyze the depth and branching factor. The alternative is dynamic programming (memoization), which can often turn an O(2^n) recursive algorithm into an O(n) iterative or cached one.'
              ],
              typeIt: true,
              solution: 'def fib_exp(n):\n    if n <= 1:\n        return n\n    return fib_exp(n-1) + fib_exp(n-2)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Analyzing Python operations',
              prose: [
                'When you write `x in lst` or `string_a + string_b`, you aren\'t writing loops, but work is still happening. How do we avoid accidentally writing an O(n^2) algorithm by putting an O(n) built-in operation inside an O(n) loop?',
                'This proves that using `+=` on strings in a loop is O(n^2) while `\'\'.join()` is O(n). Trace `slow_join([\'a\',\'b\',\'c\'])`: result=\'\' + \'a\' = \'a\' (new str, length 1). \'a\'+\'b\'=\'ab\' (new str, length 2). \'ab\'+\'c\'=\'abc\' (new str, length 3). Total work: 0+1+2+...+(n-1) = n*(n-1)/2 = O(n^2). fast_join: `\'\'.join`: ONE allocation of the final string. O(n).'
              ],
              typeIt: true,
              solution: '# WRONG: building string in loop\ndef slow_join(words):\n    result = \'\'\n    for w in words:       # O(n^2): each += creates new string of growing length\n        result += w\n    return result\n\n# RIGHT:\ndef fast_join(words):\n    return \'\'.join(words) # O(n): one allocation\n\nwords = [\'word\'] * 10000\nimport time\nt0=time.perf_counter(); slow_join(words); print(f\'slow: {time.perf_counter()-t0:.3f}s\')\nt0=time.perf_counter(); fast_join(words); print(f\'fast: {time.perf_counter()-t0:.4f}s\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Analyzing Python operations — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def slow_join(words):` defines the naive approach.\n- `result = \'\'` initializes an empty string.\n- `for w in words:` loops over the words.\n- `result += w` concatenates the strings. Because strings are immutable in Python, this requires allocating a new string and copying all characters every single iteration.\n- `return result` returns the final string.\n- `def fast_join(words):` defines the optimized approach.\n- `return \'\'.join(words)` calls the `join` method on the empty string separator. This calculates the total needed length once, allocates the memory once, and copies each word in exactly once, making it O(n).',
                '**Expected behavior.** Predicted confidently: `slow_join` will take significantly longer (orders of magnitude) than `fast_join` for large inputs.',
                '**CS lens.** Amortized Analysis and Immutability. Python lists have O(1) amortized appends because they occasionally reallocate and copy, but mostly just write to pre-allocated space. Strings are immutable, so *every* concatenation allocates and copies. Real-world examples: Java\'s `StringBuilder` vs `String` concatenation, or resizing dynamic arrays.',
                '**SE lens.** Idiomatic Python. Understanding the performance characteristics of built-ins is crucial. The alternative (ignoring them) leads to "accidentally quadratic" code. Always use `\'\'.join()` for sequences of strings, `set` for lookups, and `list.append()` instead of `list.insert(0, ...)` (which is O(n) because it shifts all elements).'
              ],
              typeIt: true,
              solution: 'def slow_join(words):\n    result = \'\'\n    for w in words:\n        result += w\n    return result\n\ndef fast_join(words):\n    return \'\'.join(words)',
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
      'Next lesson: Search Algorithms.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Big-O Notation"?',
      options: [
        'The runtime grows proportionally to the square of the input size.',
        'A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity. Here, it measures how the runtime or space requirements grow as input size grows.',
        'The runtime grows logarithmically as the input size increases (e.g., halving the search space each step).'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Logarithmic Time (O(log n))"?',
      options: [
        'The runtime grows logarithmically as the input size increases (e.g., halving the search space each step).',
        'The runtime grows in proportion to n multiplied by log n, typical of efficient comparison-based sorts.',
        'The runtime grows directly in proportion to the input size.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Exponential Time (O(2^n))"?',
      options: [
        'The runtime doubles with each addition to the input data set.',
        'The runtime grows proportionally to the square of the input size.',
        'The runtime grows in proportion to n multiplied by log n, typical of efficient comparison-based sorts.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Constant Time (O(1))"?',
      options: [
        'The runtime doubles with each addition to the input data set.',
        'The runtime is independent of the input size.',
        'The runtime grows proportionally to the square of the input size.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Big-O Notation** — A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity. Here, it measures how the runtime or space requirements grow as input size grows.',
    '**Constant Time (O(1))** — The runtime is independent of the input size.',
    '**Linear Time (O(n))** — The runtime grows directly in proportion to the input size.',
    '**Logarithmic Time (O(log n))** — The runtime grows logarithmically as the input size increases (e.g., halving the search space each step).',
    '**Quadratic Time (O(n^2))** — The runtime grows proportionally to the square of the input size.',
    '**Exponential Time (O(2^n))** — The runtime doubles with each addition to the input data set.',
    '**Linearithmic Time (O(n log n))** — The runtime grows in proportion to n multiplied by log n, typical of efficient comparison-based sorts.',
  ],

  checkpoints: ['read-intuition'],
}
