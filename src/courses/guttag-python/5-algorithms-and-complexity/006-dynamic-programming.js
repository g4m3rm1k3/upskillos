// Guttag — Lesson 34: Dynamic Programming
// Auto-converted from src/docs/tutorials/guttag-python/lesson-34.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-34-dynamic-programming',
  slug: 'dynamic-programming',
  chapter: 5,
  order: 6,
  title: 'Dynamic Programming',
  subtitle: 'Memoization and Tabulation',
  tags: ['dynamic-programming-dp', 'overlapping-subproblems', 'optimal-substructure', 'memoization', 'tabulation', 'greedy-algorithm'],

  hook: {
    question: 'What is "Dynamic Programming", and why does it matter?',
    realWorldContext: 'The reader understands dynamic programming (DP): the technique of caching results of overlapping subproblems to avoid redundant computation. They implement both top-down DP (memoization) and bottom-up DP (tabulation) for Fibonacci and the coin change problem. The transferable insight: DP applies when: (1) the problem has OVERLAPPING SUBPROBLEMS (same sub-inputs computed multiple times) and (2) OPTIMAL SUBSTRUCTURE (optimal solution built from optimal sub-solutions). If both hold, caching turns exponential into polynomial.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: The overlapping subproblems problem, Memoization — top-down DP, Tabulation — bottom-up DP, Coin change — DP on a harder problem, When to use DP vs. greedy vs. brute force.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Dynamic Programming (DP):** The technique of caching results of overlapping subproblems to avoid redundant computation. It solves complex problems by breaking them down into simpler subproblems.\n- **Overlapping Subproblems:** When a recursive algorithm visits the same subproblems repeatedly. Caching prevents this redundancy.\n- **Optimal Substructure:** When an optimal solution to a larger problem can be built efficiently from optimal solutions to its subproblems.\n- **Memoization:** A top-down dynamic programming approach that recursively solves a problem while caching the results of expensive function calls to return the cached result when the same inputs occur again.\n- **Tabulation:** A bottom-up dynamic programming approach that iteratively solves all subproblems from smallest to largest, storing their answers in a table to compute the final solution.\n- **Greedy Algorithm:** An algorithm that makes a locally optimal choice at each step with the hope of finding a global optimum. It is fast but may fail to find the optimal solution if the problem does not possess the greedy-choice property.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **sys.setrecursionlimit:** A function to set the maximum depth of the Python interpreter stack.\n- **functools.lru_cache:** A decorator that wraps a function with a memoizing callable that saves up to the maxsize most recent calls.\n- **dict:** Python\'s built-in dictionary type, a hash map.\n- **list:** Python\'s built-in mutable sequence type.\n- **float(\'inf\'):** A representation of positive infinity in Python.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Trace `fib(6)` across our strategies: - **Naive:** The function blindly branches `fib(5) + fib(4)`. By the time it computes `fib(6)`, `fib(2)` is redundantly calculated multiple times across a sprawling tree of `15` function calls. - **Memoized:** The function branches, but caches. When `fib(6)` evaluates `fib(5)`, it caches all intermediate steps down to `0`. When the right side, `fib(4)`, is called, it instantly returns the cached value. Redundancy is destroyed, taking only `9` calls. - **Tabulated:** The function builds an array `[0, 1, 0, 0, 0, 0, 0]`. It walks forward exactly `6` times. `table[2] = 1`, `table[3] = 2`, `table[4] = 3`, `table[5] = 5`, `table[6] = 8`. `8` is returned. Both memoization and tabulation exploit overlapping subproblems and optimal substructure, transforming exponential explosions into simple linear sequences.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 34: Dynamic Programming',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Dynamic Programming',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The overlapping subproblems problem',
              prose: [
                'Why does calculating Fibonacci numbers naively take so long? What happens if you try to calculate `fib(40)` using the standard mathematical recurrence? If you draw out the function calls for `fib(5)`, how many times do you see `fib(2)` being evaluated from scratch?',
                'Trace `fib_naive(5)`: calls `fib(4)+fib(3)`. `fib(4)` calls `fib(3)+fib(2)`. `fib(3)` called TWICE. `fib(2)` called THREE times. Redundant: same inputs, same outputs, recomputed. This proves that an algorithm with **overlapping subproblems** will perform redundant work, driving execution time up exponentially.'
              ],
              typeIt: true,
              solution: 'import sys\nsys.setrecursionlimit(10000)\n\ncall_count = 0\n\ndef fib_naive(n):\n    global call_count\n    call_count += 1\n    if n <= 1:\n        return n\n    return fib_naive(n-1) + fib_naive(n-2)\n\nfor n in [10, 20, 30]:\n    call_count = 0\n    result = fib_naive(n)\n    print(f\'fib({n})={result}, calls={call_count}\')\n# fib(10)=55, calls=177\n# fib(20)=6765, calls=21891\n# fib(30)=832040, calls=2692537\n# calls grow as ~2^n: fib(6) is computed MANY times',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'The overlapping subproblems problem — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import sys`: Imports the system module to access interpreter settings.\n- `sys.setrecursionlimit(10000)`: Sets the recursion limit to 10,000 to prevent deep recursive calls from crashing.\n- `call_count = 0`: Initializes a global counter to track function executions.\n- `def fib_naive(n):`: Defines a function taking an integer `n`.\n- `global call_count`: Declares intent to modify the global `call_count` variable.\n- `call_count += 1`: Increments the counter each time the function is invoked.\n- `if n <= 1:`: Checks if the base case has been reached (0 or 1).\n- `return n`: Returns the base case value directly.\n- `return fib_naive(n-1) + fib_naive(n-2)`: The recursive step, returning the sum of the two preceding Fibonacci numbers.',
                '**Expected behavior.** Predicted confidently: Output matches the trace, proving exponential growth in calls for linear increases in `n`.',
                '**CS lens.** **Overlapping Subproblems** are a characteristic of problems where naive recursive algorithms solve the same subproblems over and over. This appears in string matching (like Edit Distance), graph problems (like Shortest Path in a DAG), and computational biology (DNA sequence alignment).',
                '**SE lens.** Design principle: **Separation of state and logic**. Here, `call_count` is a global variable. Alternatively, we could have passed a state object down the call stack or encapsulated it in a class. The tradeoff is that a global variable is quick for a throwaway script but breaks thread safety and reusability in real applications.'
              ],
              typeIt: true,
              solution: 'import sys\nsys.setrecursionlimit(10000)\n\ncall_count = 0\n\ndef fib_naive(n):\n    global call_count\n    call_count += 1\n    if n <= 1:\n        return n\n    return fib_naive(n-1) + fib_naive(n-2)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Memoization — top-down DP',
              prose: [
                'If we are computing `fib(3)` multiple times, how can we compute it just once? What data structure allows us to look up previously computed answers instantly? If we have the answer for `fib(3)`, what should the function do instead of branching?',
                'Trace `fib_memo(5)`: cache={}. fib(5): not in cache. fib(4): not in cache. fib(3): not in cache. fib(2): not in cache. fib(1)=1, fib(0)=0. cache[2]=1. cache[3]=2. fib(4): needs fib(2)=cache[2]=1 (instant). cache[4]=3. cache[5]=5. Total: 9 calls vs 15 naive. This proves that **memoization** eliminates redundant recursive calls by trading space (the cache) for time.'
              ],
              typeIt: true,
              solution: 'def fib_memo(n, cache=None):\n    if cache is None:\n        cache = {}   # fresh cache each top-level call\n    if n in cache:\n        return cache[n]       # already computed\n    if n <= 1:\n        return n\n    result = fib_memo(n-1, cache) + fib_memo(n-2, cache)\n    cache[n] = result         # store before returning\n    return result\n\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib_lru(n):\n    if n <= 1:\n        return n\n    return fib_lru(n-1) + fib_lru(n-2)\n\nprint(fib_memo(50))   # 12586269025 (instant)\nprint(fib_lru(100))   # 354224848179261915075 (instant)\n# Each subproblem computed ONCE: O(n) calls vs O(2^n)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Memoization — top-down DP — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def fib_memo(n, cache=None):`: Defines a recursive function with an optional `cache` parameter that defaults to `None`.\n- `if cache is None:`: Checks if the cache was omitted (signifying a top-level call).\n- `cache = {}`: Initializes an empty dictionary to store results.\n- `if n in cache:`: Checks if the result for `n` has already been computed and stored.\n- `return cache[n]`: Returns the stored result, skipping further recursion.\n- `if n <= 1:`: Base case condition.\n- `return n`: Returns the base case directly.\n- `result = fib_memo(n-1, cache) + fib_memo(n-2, cache)`: Computes the Fibonacci number recursively, passing down the shared cache object.\n- `cache[n] = result`: Stores the newly computed result in the cache dictionary.\n- `return result`: Returns the final computed value.',
                '**Expected behavior.** Predicted confidently: `fib_memo(50)` will execute instantly and return `12586269025`.',
                '**CS lens.** **Memoization (Top-Down DP)** is the process of wrapping a recursive algorithm with a caching mechanism. It appears in parsing (packrat parsers), rendering (caching layout calculations), and web servers (caching expensive database queries by ID).',
                '**SE lens.** Design principle: **Default arguments and mutable state**. We use `cache=None` rather than `cache={}` because default arguments are evaluated once at function definition in Python. If we used `cache={}`, the same dictionary instance would persist across independent top-level calls, leaking state between unrelated computations.'
              ],
              typeIt: true,
              solution: 'def fib_memo(n, cache=None):\n    if cache is None:\n        cache = {}\n    if n in cache:\n        return cache[n]\n    if n <= 1:\n        return n\n    result = fib_memo(n-1, cache) + fib_memo(n-2, cache)\n    cache[n] = result\n    return result',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Tabulation — bottom-up DP',
              prose: [
                'What if the recursion is so deep that even memoization hits the maximum recursion depth? How could you compute the answers starting from `fib(0)` and `fib(1)` and working your way up to `fib(n)`? Do we need to store all the answers, or just the recent ones?',
                'Trace `fib_tab(6)`: `table=[0,1,0,0,0,0,0]`. `i=2: table[2]=1`. `i=3: table[3]=2`. `i=4: table[4]=3`. `i=5: table[5]=5`. `i=6: table[6]=8`. Return 8. This proves that **tabulation** avoids recursion entirely, iterating strictly from smallest to largest.'
              ],
              typeIt: true,
              solution: 'def fib_tab(n):\n    if n <= 1:\n        return n\n    # Build table from smallest subproblems up\n    table = [0] * (n + 1)\n    table[0] = 0\n    table[1] = 1\n    for i in range(2, n + 1):\n        table[i] = table[i-1] + table[i-2]\n    return table[n]\n\n# Space-optimized: only need last two values\ndef fib_opt(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n\nprint(fib_tab(10))   # 55\nprint(fib_opt(50))   # 12586269025\n# table[i] only depends on table[i-1] and table[i-2]\n# O(n) time, O(n) space (tab) or O(1) space (opt)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Tabulation — bottom-up DP — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def fib_tab(n):`: Defines an iterative function for Fibonacci.\n- `if n <= 1:`: Handles base cases instantly.\n- `return n`: Returns the base case value.\n- `table = [0] * (n + 1)`: Initializes a list of zeros with length `n + 1` to hold all intermediate answers up to `n`.\n- `table[0] = 0`: Sets the first base case in the table.\n- `table[1] = 1`: Sets the second base case in the table.\n- `for i in range(2, n + 1):`: Iterates from `2` up to and including `n`.\n- `table[i] = table[i-1] + table[i-2]`: Fills the current table cell using the two previous adjacent cells.\n- `return table[n]`: Returns the fully computed answer located at the end of the table.',
                '**Expected behavior.** Predicted confidently: `fib_tab(10)` returns `55` with no recursive calls made.',
                '**CS lens.** **Tabulation (Bottom-Up DP)** is an algorithmic technique that builds solutions up from the smallest base cases iteratively. It appears in spreadsheet software (resolving cell dependencies topologically), database query planning (joining tables optimally), and string analysis (Longest Common Subsequence).',
                '**SE lens.** Design principle: **Space-Time Tradeoff**. By allocating an array of size `n + 1`, we trade memory for an O(n) execution time while completely avoiding the function call overhead of recursion. The alternative, a purely recursive approach, used O(n) stack space but incurred function call costs.'
              ],
              typeIt: true,
              solution: 'def fib_tab(n):\n    if n <= 1:\n        return n\n    table = [0] * (n + 1)\n    table[0] = 0\n    table[1] = 1\n    for i in range(2, n + 1):\n        table[i] = table[i-1] + table[i-2]\n    return table[n]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Coin change — DP on a harder problem',
              prose: [
                'If you have coins of values 1, 5, 10, and 25, how do you find the minimum number of coins to make an exact amount? Does the optimal solution for `amount = X` relate to the optimal solution for `amount = X - coin_value`?',
                'Trace `coin_change([1,5,10,25], 11)`: `dp=[0,INF,...]`. `i=1: coin=1: dp[0]+1=1 < INF -> dp[1]=1`. `i=5: coin=5: dp[0]+1=1 < INF -> dp[5]=1`. `i=10: coin=10: dp[0]+1=1 < INF -> dp[10]=1`. `i=11: coin=1: dp[10]+1=2 < INF -> dp[11]=2`. `coin=10: dp[1]+1=2` (no improvement). Return `2` (10+1). This proves that DP correctly identifies the minimal combination by trying all valid subproblems.'
              ],
              typeIt: true,
              solution: 'def coin_change(coins, amount):\n    \'\'\'\n    Returns minimum number of coins to make \'amount\'.\n    Returns -1 if impossible.\n    \'\'\'\n    # dp[i] = min coins to make amount i\n    INF = float(\'inf\')\n    dp = [INF] * (amount + 1)\n    dp[0] = 0   # base case: 0 coins to make 0\n\n    for i in range(1, amount + 1):\n        for coin in coins:\n            if coin <= i and dp[i - coin] + 1 < dp[i]:\n                dp[i] = dp[i - coin] + 1\n\n    return dp[amount] if dp[amount] != INF else -1\n\nprint(coin_change([1, 5, 10, 25], 36))  # 3 (25+10+1)\nprint(coin_change([1, 5, 10, 25], 30))  # 2 (25+5)\nprint(coin_change([2], 3))              # -1 (impossible)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Coin change — DP on a harder problem — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def coin_change(coins, amount):`: Defines a function taking a list of coin denominations and an integer target amount.\n- `INF = float(\'inf\')`: Assigns positive infinity to a local variable to act as a sentinel for unreachable states.\n- `dp = [INF] * (amount + 1)`: Creates a table to hold the minimum coins needed for every amount up to the target, initialized to infinity.\n- `dp[0] = 0`: Sets the base case: it takes zero coins to make an amount of zero.\n- `for i in range(1, amount + 1):`: Iterates through every amount from 1 up to the target amount.\n- `for coin in coins:`: Iterates through each available coin denomination.\n- `if coin <= i and dp[i - coin] + 1 < dp[i]:`: Checks if the coin can fit in the current amount `i` and if using it leads to a smaller number of coins than the current best for `dp[i]`.\n- `dp[i] = dp[i - coin] + 1`: Updates the table with the new minimum coin count.\n- `return dp[amount] if dp[amount] != INF else -1`: Returns the value in the final cell, or `-1` if it is still infinity (meaning the amount cannot be made).',
                '**Expected behavior.** Predicted confidently: `coin_change([1, 5, 10, 25], 36)` returns `3`.',
                '**CS lens.** **Optimal Substructure** dictates that an optimal solution to the overall problem can be constructed efficiently from optimal solutions to its subproblems. In `coin_change`, the optimal way to make amount `X` relies on the optimal way to make `X - coin`. This is seen in shortest path algorithms (Dijkstra\'s) and game theory.',
                '**SE lens.** Design principle: **Sentinel values**. We initialize the table with `float(\'inf\')`. The alternative is using a distinct type like `None`, which would force us to perform type checks (`if dp[i] is None: ...`) inside the hot loop. The tradeoff is that `float(\'inf\')` acts like a standard number, allowing simple `<` comparisons at the expense of potentially masking bugs if math is improperly applied to it elsewhere.'
              ],
              typeIt: true,
              solution: 'def coin_change(coins, amount):\n    INF = float(\'inf\')\n    dp = [INF] * (amount + 1)\n    dp[0] = 0\n\n    for i in range(1, amount + 1):\n        for coin in coins:\n            if coin <= i and dp[i - coin] + 1 < dp[i]:\n                dp[i] = dp[i - coin] + 1\n\n    return dp[amount] if dp[amount] != INF else -1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'When to use DP vs. greedy vs. brute force',
              prose: [
                'Why use dynamic programming if we can just pick the largest coin that fits? Does a "greedy" approach always yield the optimal answer for any set of coins?',
                'Trace `greedy_coins([1,3,4], 6)`: `sorted=[4,3,1]`. `coin=4`: `6>=4`: append `4`, `amount=2`. `coin=3`: `2<3` skip. `coin=1`: append `1` (x2). Result=`[4,1,1]`, 3 coins. DP: `dp[6]`: `coin=3`: `dp[3]+1=dp[3]+1`. `dp[3]`: `coin=3`: `dp[0]+1=1` -> `dp[3]=1`. `dp[6]=dp[3]+1=2`. This proves that **greedy algorithms** can yield sub-optimal results on non-standard coin systems.'
              ],
              typeIt: true,
              solution: '# DP vs Greedy:\n# Greedy: make locally optimal choice at each step (fast but may fail)\n# DP: consider ALL subproblems, cache overlapping ones (slower but correct)\n\ndef greedy_coins(coins, amount):\n    coins = sorted(coins, reverse=True)  # largest first\n    result = []\n    for coin in coins:\n        while amount >= coin:\n            result.append(coin)\n            amount -= coin\n    return result if amount == 0 else None\n\n# Coins [1, 3, 4], amount 6:\n# Greedy: 4, 1, 1 -> 3 coins\n# DP:     3, 3    -> 2 coins (optimal)\nprint(greedy_coins([1, 3, 4], 6))  # [4, 1, 1]: 3 coins\nprint(coin_change([1, 3, 4], 6))   # 2: optimal',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'When to use DP vs. greedy vs. brute force — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `coins = sorted(coins, reverse=True)`: Sorts the coins in descending order to prioritize the largest denomination.\n- `result = []`: Initializes a list to hold the chosen coins.\n- `for coin in coins:`: Iterates over each coin, largest to smallest.\n- `while amount >= coin:`: Continuously subtracts the coin while it fits into the remaining amount.\n- `result.append(coin)`: Records the chosen coin.\n- `amount -= coin`: Reduces the remaining amount.\n- `return result if amount == 0 else None`: Returns the list of chosen coins if the exact amount was reached, otherwise `None`.',
                '**Expected behavior.** Predicted confidently: `greedy_coins([1, 3, 4], 6)` returns `[4, 1, 1]` while DP correctly returns `2`.',
                '**CS lens.** **Greedy Algorithms** solve problems by making locally optimal choices without looking ahead. They work perfectly for fractional knapsack or standard US currency (which has the "greedy-choice property"), but fail on 0-1 knapsack or arbitrary coin systems.',
                '**SE lens.** Design principle: **Correctness vs. Heuristics**. A greedy algorithm is a heuristic that is computationally much cheaper (O(n log n) for sorting plus O(amount) iteration) than full DP. The tradeoff is choosing between guaranteed optimality (DP) versus "good enough and fast" (greedy).'
              ],
              typeIt: true,
              solution: '# No new code added to the project for this theory unit.',
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
      'Next lesson: The Knapsack Problem.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Optimal Substructure"?',
      options: [
        'When a recursive algorithm visits the same subproblems repeatedly. Caching prevents this redundancy.',
        'When an optimal solution to a larger problem can be built efficiently from optimal solutions to its subproblems.',
        'The technique of caching results of overlapping subproblems to avoid redundant computation. It solves complex problems by breaking them down into simpler subproblems.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Overlapping Subproblems"?',
      options: [
        'A top-down dynamic programming approach that recursively solves a problem while caching the results of expensive function calls to return the cached result when the same inputs occur again.',
        'When a recursive algorithm visits the same subproblems repeatedly. Caching prevents this redundancy.',
        'When an optimal solution to a larger problem can be built efficiently from optimal solutions to its subproblems.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Memoization"?',
      options: [
        'A top-down dynamic programming approach that recursively solves a problem while caching the results of expensive function calls to return the cached result when the same inputs occur again.',
        'The technique of caching results of overlapping subproblems to avoid redundant computation. It solves complex problems by breaking them down into simpler subproblems.',
        'When a recursive algorithm visits the same subproblems repeatedly. Caching prevents this redundancy.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Tabulation"?',
      options: [
        'A top-down dynamic programming approach that recursively solves a problem while caching the results of expensive function calls to return the cached result when the same inputs occur again.',
        'A bottom-up dynamic programming approach that iteratively solves all subproblems from smallest to largest, storing their answers in a table to compute the final solution.',
        'When a recursive algorithm visits the same subproblems repeatedly. Caching prevents this redundancy.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Dynamic Programming (DP)** — The technique of caching results of overlapping subproblems to avoid redundant computation. It solves complex problems by breaking them down into simpler subproblems.',
    '**Overlapping Subproblems** — When a recursive algorithm visits the same subproblems repeatedly. Caching prevents this redundancy.',
    '**Optimal Substructure** — When an optimal solution to a larger problem can be built efficiently from optimal solutions to its subproblems.',
    '**Memoization** — A top-down dynamic programming approach that recursively solves a problem while caching the results of expensive function calls to return the cached result when the same inputs occur again.',
    '**Tabulation** — A bottom-up dynamic programming approach that iteratively solves all subproblems from smallest to largest, storing their answers in a table to compute the final solution.',
    '**Greedy Algorithm** — An algorithm that makes a locally optimal choice at each step with the hope of finding a global optimum. It is fast but may fail to find the optimal solution if the problem does not possess the greedy-choice property.',
  ],

  checkpoints: ['read-intuition'],
}
