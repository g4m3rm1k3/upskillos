// Guttag — Lesson 35: The Knapsack Problem
// Auto-converted from src/docs/tutorials/guttag-python/lesson-35.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-35-the-knapsack-problem',
  slug: 'the-knapsack-problem',
  chapter: 5,
  order: 7,
  title: 'The Knapsack Problem',
  subtitle: 'Greedy, Exhaustive, and DP',
  tags: ['0-1-knapsack-problem', 'greedy-approach', 'exhaustive-search', 'dynamic-programming-dp', 'pseudo-polynomial-time'],

  hook: {
    question: 'What is "The Knapsack Problem", and why does it matter?',
    realWorldContext: 'The reader understands the 0/1 knapsack problem and three approaches: greedy (fast, suboptimal), exhaustive/brute-force (optimal, exponential), and dynamic programming (optimal, polynomial). The transferable insight: the knapsack problem is a canonical NP-hard problem in its general form, but with integer weights, DP gives O(n * capacity) pseudo-polynomial time. This is the pattern for resource allocation, scheduling, and portfolio optimization.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Greedy Approach, Exhaustive Search, Dynamic Programming, Backtracking, Complexity Comparison.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **0/1 Knapsack Problem:** A combinatorial optimization problem where items have weights and values, and the goal is to maximize total value without exceeding a weight limit. Each item can be taken at most once (0 or 1).\n- **Greedy approach:** A heuristic algorithm that makes the locally optimal choice at each stage with the intent of finding a global optimum. Fast but suboptimal for this problem.\n- **Exhaustive search:** A brute-force algorithm that checks every possible combination of items to find the global optimum. Optimal but computationally explosive (exponential time).\n- **Dynamic programming (DP):** An algorithm design technique that breaks a problem down into overlapping subproblems, solving each once and storing the result to avoid redundant work. Optimal and pseudo-polynomial time for integer knapsack.\n- **Pseudo-polynomial time:** A time complexity that is polynomial in the numeric value of the input (like the capacity), but exponential in the length of the input (number of bits to represent it).',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We traced solving the knapsack problem with `capacity=5` and `items=[(w=2,v=3),(w=3,v=4),(w=4,v=5)]` across three different techniques. 1. The **greedy approach** picked the items with the highest value-to-weight ratio (density). It selected A and then B for a total weight of 5 and value of 7. It was fast but risky. 2. The **exhaustive search** evaluated all 8 subsets: `{}`, `{A}`, `{B}`, `{C}`, `{A,B}`, `{A,C}`, `{B,C}`, `{A,B,C}`. It saw that `{A,B}` gave a valid 7, while `{B,C}` was too heavy, proving 7 was the optimal answer. 3. The **dynamic programming** approach constructed a table from the bottom up, recording `dp[3][5]=7`, and **backtracking** proved that skipping C and taking B and A led exactly to the optimal value of 7. DP gave us the certainty of exhaustive search with the speed required for large real-world applications.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 35: The Knapsack Problem',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'The Knapsack Problem',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Greedy Approach',
              prose: [
                'How can we select items to maximize value without exceeding a weight capacity? If you were packing a backpack and could only take so much weight, what would you naturally try first? Would picking the most valuable items first work? What about picking the lightest? Or perhaps the ones with the highest value-to-weight ratio?',
                'Predicted confidently: `[\'C\']` This proves that a **greedy approach** takes the locally best option (highest value) but may miss better combinations (like taking A and B, which sum to 7, while C is only 5).'
              ],
              typeIt: true,
              solution: 'def example_greedy(items_dict, limit):\n    # Take items by highest value first\n    sorted_items = sorted(items_dict.items(), key=lambda x: x[1], reverse=True)\n    total = 0\n    taken = []\n    for name, val in sorted_items:\n        if total + val <= limit:\n            taken.append(name)\n            total += val\n    return taken\n\nprint(example_greedy({\'A\': 3, \'B\': 4, \'C\': 5}, 5))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Greedy Approach — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `@dataclass` decorates the `Item` class, automatically giving it an initializer and representation based on its attributes.\n- `class Item:` defines a new class named `Item`.\n- `name: str` defines a string attribute.\n- `weight: float` defines a float attribute.\n- `value: float` defines a float attribute.\n- `def density(self):` defines a method to calculate value per unit weight.\n- `return self.value / self.weight` calculates and returns the density.\n- `def greedy_knapsack(items, capacity, key=None):` defines the greedy algorithm function.\n- `if key is None:` checks if a sorting key function was provided.\n- `key = lambda x: x.density()` provides a default sorting key using density.\n- `sorted_items = sorted(items, key=key, reverse=True)` creates a new list sorted highest-to-lowest by the key.\n- `total_weight = 0.0` initializes the accumulator for weight.\n- `total_value = 0.0` initializes the accumulator for value.\n- `taken = []` initializes a list to hold selected item names.\n- `for item in sorted_items:` iterates over the sorted items.\n- `if total_weight + item.weight <= capacity:` checks if adding the current item exceeds the limit.\n- `taken.append(item.name)` adds the item\'s name to the list of chosen items.\n- `total_weight += item.weight` adds the item\'s weight to the running total.\n- `total_value += item.value` adds the item\'s value to the running total.\n- `return taken, total_value` returns the final selection and its value.',
                '**Expected behavior.** Predicted confidently: `([\'A\', \'B\'], 7)`',
                '**CS lens.** The **greedy approach** makes a locally optimal choice at each step. Real-world uses: coin change (when denominations are standard), Huffman coding, Dijkstra\'s algorithm.',
                '**SE lens.** Design principle: **Heuristics vs. Optimality**. A real tradeoff: getting a "good enough" answer in a fraction of a millisecond versus finding the absolute best answer but taking years to compute.'
              ],
              typeIt: true,
              solution: 'from dataclasses import dataclass\n\n@dataclass\nclass Item:\n    name: str\n    weight: float\n    value: float\n\n    def density(self):\n        return self.value / self.weight\n\ndef greedy_knapsack(items, capacity, key=None):\n    if key is None:\n        key = lambda x: x.density()\n    sorted_items = sorted(items, key=key, reverse=True)\n    total_weight = 0.0\n    total_value = 0.0\n    taken = []\n    for item in sorted_items:\n        if total_weight + item.weight <= capacity:\n            taken.append(item.name)\n            total_weight += item.weight\n            total_value += item.value\n    return taken, total_value',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Exhaustive Search',
              prose: [
                'Since the greedy approach isn\'t perfect, how can we guarantee we find the absolute best combination? What if we literally just try every single possible way to pack the backpack? How many ways are there?',
                'Predicted confidently: `[]` `[0]` `[1]` `[0, 1]` `[2]` `[0, 2]` `[1, 2]` `[0, 1, 2]` This proves that bitmasking can generate an **exhaustive search** of all subsets.'
              ],
              typeIt: true,
              solution: 'def example_combinations(n):\n    for mask in range(2**n):\n        combo = []\n        for i in range(n):\n            if mask & (1 << i):\n                combo.append(i)\n        print(combo)\n\nexample_combinations(3)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Exhaustive Search — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def exhaustive_knapsack(items, capacity):` defines the function.\n- `n = len(items)` gets the number of items.\n- `best_value = 0` tracks the highest valid value found.\n- `best_combo = []` tracks the item names for the highest valid value.\n- `for mask in range(2**n):` loops from `0` to `2^n - 1`, representing all binary combinations.\n- `total_weight = 0` resets the weight for the current subset.\n- `total_value = 0` resets the value for the current subset.\n- `taken = []` resets the list of taken items for the current subset.\n- `for i in range(n):` loops through each item index.\n- `if mask & (1 << i):` checks if the `i`-th bit is set in `mask`.\n- `total_weight += items[i].weight` adds the item\'s weight if the bit is set.\n- `total_value += items[i].value` adds the item\'s value if the bit is set.\n- `taken.append(items[i].name)` adds the item\'s name to the subset list.\n- `if total_weight <= capacity and total_value > best_value:` checks if the subset is valid and better than the previous best.\n- `best_value = total_value` updates the best value.\n- `best_combo = taken` updates the best combination of items.\n- `return best_combo, best_value` returns the overall optimal choice.',
                '**Expected behavior.** Predicted confidently: `([\'A\', \'B\'], 7)`',
                '**CS lens.** **Exhaustive search** or brute-force guarantees correctness but explodes combinatorially. Real-world uses: password cracking, small-scale traveling salesperson problems, verifying optimization algorithms.',
                '**SE lens.** Design principle: **Scalability**. An O(2^n) algorithm works fine for n=10, but fails completely for n=50. The tradeoff is knowing your input bounds before choosing an algorithm.'
              ],
              typeIt: true,
              solution: 'def exhaustive_knapsack(items, capacity):\n    n = len(items)\n    best_value = 0\n    best_combo = []\n\n    for mask in range(2**n):    # iterate all 2^n subsets\n        total_weight = 0\n        total_value = 0\n        taken = []\n        for i in range(n):\n            if mask & (1 << i):   # bit i is set: item i is included\n                total_weight += items[i].weight\n                total_value  += items[i].value\n                taken.append(items[i].name)\n        if total_weight <= capacity and total_value > best_value:\n            best_value = total_value\n            best_combo = taken\n\n    return best_combo, best_value',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Dynamic Programming',
              prose: [
                'If greedy is too inaccurate and exhaustive is too slow, is there a way to reuse work so we don\'t recalculate the same subsets over and over? What if we built up the solution item by item, capacity by capacity?',
                'Predicted confidently: `[0, 1, 3, 6, 10]` This proves that **dynamic programming** stores intermediate results to build up a final answer step-by-step.'
              ],
              typeIt: true,
              solution: 'def example_dp():\n    # A simple 1D DP array building up sums\n    dp = [0, 0, 0, 0, 0]\n    for i in range(1, 5):\n        dp[i] = dp[i-1] + i\n    return dp\n\nprint(example_dp())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Dynamic Programming — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def dp_knapsack(items, capacity):` defines the function.\n- `n = len(items)` gets the number of items.\n- `dp = [[0] * (capacity + 1) for _ in range(n + 1)]` creates a 2D list filled with zeroes.\n- `for i in range(1, n + 1):` iterates over the items (1-indexed for the DP table).\n- `item = items[i-1]` gets the actual item from the 0-indexed list.\n- `w = int(item.weight)` casts the weight to an integer to use as an array index.\n- `v = item.value` extracts the item\'s value.\n- `for c in range(capacity + 1):` iterates through every possible capacity up to the limit.\n- `dp[i][c] = dp[i-1][c]` carries over the max value found without using the current item.\n- `if c >= w:` checks if the current capacity can hold the current item\'s weight.\n- `take = dp[i-1][c-w] + v` calculates the value if we *do* take the item (value of the remaining capacity plus this item\'s value).\n- `if take > dp[i][c]:` compares the "take" option against the "don\'t take" option.\n- `dp[i][c] = take` updates the table if taking the item is better.\n- `return dp[n][capacity]` returns the value in the bottom-right corner of the table, which represents considering all items at full capacity.',
                '**Expected behavior.** Predicted confidently: `7`',
                '**CS lens.** **Dynamic programming** uses memoization or tabulation to avoid repeating work. Real-world uses: DNA sequence alignment, route planning, git diff algorithms.',
                '**SE lens.** Design principle: **Space-Time Tradeoff**. We use O(n * capacity) memory to reduce time complexity from exponential to pseudo-polynomial.'
              ],
              typeIt: true,
              solution: 'def dp_knapsack(items, capacity):\n    n = len(items)\n    # dp[i][w] = max value using items[0..i-1] with weight limit w\n    dp = [[0] * (capacity + 1) for _ in range(n + 1)]\n\n    for i in range(1, n + 1):\n        item = items[i-1]\n        w = int(item.weight)  # assume integer weights for DP\n        v = item.value\n        for c in range(capacity + 1):\n            # Option 1: don\'t take item i\n            dp[i][c] = dp[i-1][c]\n            # Option 2: take item i (if it fits)\n            if c >= w:\n                take = dp[i-1][c-w] + v\n                if take > dp[i][c]:\n                    dp[i][c] = take\n\n    return dp[n][capacity]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Backtracking',
              prose: [
                'We know the maximum value is 7, but how do we extract the list of items? If you traced your steps forward to build the answer, how can you walk backward to see the choices you made?',
                'Predicted confidently: `[3, 2, 1]` This proves that **backtracking** through intermediate states allows us to reconstruct the individual decisions that led to the final outcome.'
              ],
              typeIt: true,
              solution: 'def example_backtrack():\n    path = [0, 1, 3, 6]\n    steps = []\n    for i in range(3, 0, -1):\n        if path[i] != path[i-1]:\n            steps.append(path[i] - path[i-1])\n    return steps\n\nprint(example_backtrack())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Backtracking — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def dp_knapsack_with_items(items, capacity):` defines the function.\n- `n = len(items)` gets the number of items.\n- `dp = [[0]*(capacity+1) for _ in range(n+1)]` creates the 2D DP table.\n- `for i in range(1, n+1):` iterates items to fill the table.\n- `w = int(items[i-1].weight)` extracts integer weight.\n- `v = items[i-1].value` extracts value.\n- `for c in range(capacity+1):` iterates capacities.\n- `dp[i][c] = dp[i-1][c]` defaults to not taking the item.\n- `if c >= w and dp[i-1][c-w] + v > dp[i][c]:` checks if taking the item yields a strictly better value.\n- `dp[i][c] = dp[i-1][c-w] + v` updates the table with the higher value.\n- `taken = []` initializes the backtracking list.\n- `c = capacity` starts backtracking at the maximum capacity.\n- `for i in range(n, 0, -1):` loops backward through the items.\n- `if dp[i][c] != dp[i-1][c]:` checks if the value changed between the previous row and current row, which implies the item was taken.\n- `taken.append(items[i-1].name)` adds the item to the list of chosen items.\n- `c -= int(items[i-1].weight)` reduces the remaining capacity by the taken item\'s weight.\n- `return dp[n][capacity], taken[::-1]` returns the max value and the reversed list of taken items (since backtracking finds them in reverse order).',
                '**Expected behavior.** Predicted confidently: `(7, [\'A\', \'B\'])`',
                '**CS lens.** **Backtracking** through a DP table reconstructs the sequence of optimal choices without needing to store full arrays of items inside the table itself. Real-world uses: routing protocol path reconstruction, reconstructing the edits in a Levenshtein distance calculation.',
                '**SE lens.** Design principle: **Data Representation**. Storing just the values and backtracking to reconstruct the path is much more memory efficient than storing the actual lists of items in every cell of the DP table.'
              ],
              typeIt: true,
              solution: 'def dp_knapsack_with_items(items, capacity):\n    n = len(items)\n    dp = [[0]*(capacity+1) for _ in range(n+1)]\n\n    for i in range(1, n+1):\n        w = int(items[i-1].weight)\n        v = items[i-1].value\n        for c in range(capacity+1):\n            dp[i][c] = dp[i-1][c]\n            if c >= w and dp[i-1][c-w] + v > dp[i][c]:\n                dp[i][c] = dp[i-1][c-w] + v\n\n    # Backtrack to find which items\n    taken = []\n    c = capacity\n    for i in range(n, 0, -1):\n        if dp[i][c] != dp[i-1][c]:  # item i was taken\n            taken.append(items[i-1].name)\n            c -= int(items[i-1].weight)\n\n    return dp[n][capacity], taken[::-1]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Complexity Comparison',
              prose: [
                'Does algorithm choice actually matter in practice? When the number of items grows, how does O(2^n) compare to O(n * W)?',
                'Predicted confidently: `Linear vs Exponential:` `n=10: 50*n=500, 2^n=1024` `n=20: 50*n=1000, 2^n=1048576` This proves that **exponential growth** rapidly overtakes polynomial growth, even for small inputs.'
              ],
              typeIt: true,
              solution: 'def example_growth():\n    print("Linear vs Exponential:")\n    for n in [10, 20]:\n        print(f"n={n}: 50*n={50*n}, 2^n={2**n}")\n\nexample_growth()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Complexity Comparison — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import time` imports the standard library time module.\n- `def time_all(n_items, capacity):` defines the profiling function.\n- `import random` imports the random module locally.\n- `items = [Item(f\'I{i}\', random.randint(1,10), random.randint(1,20)) for i in range(n_items)]` creates a list of random items using a list comprehension.\n- `if n_items <= 20:` restricts exhaustive search to small inputs.\n- `t0 = time.perf_counter()` captures the precise start time.\n- `exhaustive_knapsack(items, capacity)` runs the brute-force search.\n- `t_ex = time.perf_counter() - t0` calculates the elapsed time for exhaustive.\n- `else: t_ex = float(\'inf\')` assigns infinity if the input is too large, avoiding locking up the machine.\n- `t0 = time.perf_counter()` captures the start time for DP.\n- `dp_knapsack(items, capacity)` runs the DP function.\n- `t_dp = time.perf_counter() - t0` calculates the elapsed time for DP.\n- `print(...)` outputs the formatted timing results.',
                '**Expected behavior.** Predicted confidently: `n=10, cap=50: exhaustive=0.0010s, dp=0.0001s` `n=20, cap=50: exhaustive=1.2000s, dp=0.0002s` `n=50, cap=50: exhaustive=inf, dp=0.0005s`',
                '**CS lens.** **Algorithmic complexity** dictates whether a solution is viable. An O(n * W) pseudo-polynomial algorithm is practically fast for reasonable weights, while O(2^n) is entirely unscalable. Real-world uses: cryptography relies on the fact that some problems only have exponential-time solutions.',
                '**SE lens.** Design principle: **Empirical Measurement**. Theoretical Big-O notation is crucial, but writing small benchmark scripts proves the practical impact of those choices on real hardware.'
              ],
              typeIt: true,
              solution: 'import time\n\ndef time_all(n_items, capacity):\n    import random\n    items = [Item(f\'I{i}\', random.randint(1,10), random.randint(1,20))\n             for i in range(n_items)]\n\n    # Exhaustive: O(2^n)\n    if n_items <= 20:\n        t0 = time.perf_counter()\n        exhaustive_knapsack(items, capacity)\n        t_ex = time.perf_counter() - t0\n    else:\n        t_ex = float(\'inf\')\n\n    # DP: O(n * capacity)\n    t0 = time.perf_counter()\n    dp_knapsack(items, capacity)\n    t_dp = time.perf_counter() - t0\n\n    print(f\'n={n_items}, cap={capacity}: exhaustive={t_ex:.4f}s, dp={t_dp:.4f}s\')',
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
      'Next lesson: Graph Algorithms.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Exhaustive search"?',
      options: [
        'A time complexity that is polynomial in the numeric value of the input (like the capacity), but exponential in the length of the input (number of bits to represent it).',
        'A brute-force algorithm that checks every possible combination of items to find the global optimum. Optimal but computationally explosive (exponential time).',
        'A combinatorial optimization problem where items have weights and values, and the goal is to maximize total value without exceeding a weight limit. Each item can be taken at most once (0 or 1).'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "0/1 Knapsack Problem"?',
      options: [
        'A brute-force algorithm that checks every possible combination of items to find the global optimum. Optimal but computationally explosive (exponential time).',
        'A time complexity that is polynomial in the numeric value of the input (like the capacity), but exponential in the length of the input (number of bits to represent it).',
        'A combinatorial optimization problem where items have weights and values, and the goal is to maximize total value without exceeding a weight limit. Each item can be taken at most once (0 or 1).'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Pseudo-polynomial time"?',
      options: [
        'A time complexity that is polynomial in the numeric value of the input (like the capacity), but exponential in the length of the input (number of bits to represent it).',
        'A heuristic algorithm that makes the locally optimal choice at each stage with the intent of finding a global optimum. Fast but suboptimal for this problem.',
        'A brute-force algorithm that checks every possible combination of items to find the global optimum. Optimal but computationally explosive (exponential time).'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Greedy approach"?',
      options: [
        'An algorithm design technique that breaks a problem down into overlapping subproblems, solving each once and storing the result to avoid redundant work. Optimal and pseudo-polynomial time for integer knapsack.',
        'A brute-force algorithm that checks every possible combination of items to find the global optimum. Optimal but computationally explosive (exponential time).',
        'A heuristic algorithm that makes the locally optimal choice at each stage with the intent of finding a global optimum. Fast but suboptimal for this problem.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**0/1 Knapsack Problem** — A combinatorial optimization problem where items have weights and values, and the goal is to maximize total value without exceeding a weight limit. Each item can be taken at most once (0 or 1).',
    '**Greedy approach** — A heuristic algorithm that makes the locally optimal choice at each stage with the intent of finding a global optimum. Fast but suboptimal for this problem.',
    '**Exhaustive search** — A brute-force algorithm that checks every possible combination of items to find the global optimum. Optimal but computationally explosive (exponential time).',
    '**Dynamic programming (DP)** — An algorithm design technique that breaks a problem down into overlapping subproblems, solving each once and storing the result to avoid redundant work. Optimal and pseudo-polynomial time for integer knapsack.',
    '**Pseudo-polynomial time** — A time complexity that is polynomial in the numeric value of the input (like the capacity), but exponential in the length of the input (number of bits to represent it).',
  ],

  checkpoints: ['read-intuition'],
}
