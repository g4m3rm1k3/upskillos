// cpp-dsa — Lesson 22: Dynamic Programming: Memoization
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 22 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-22-dynamic-programming-memoization',
  slug: 'dynamic-programming-memoization',
  chapter: 6,
  order: 2,
  title: 'Dynamic Programming: Memoization',
  subtitle: 'Advanced Techniques',
  tags: ['dynamic-programming', 'overlapping-subproblems', 'optimal-substructure', 'memoization', 'cache'],

  hook: {
    question: 'What is "Dynamic Programming: Memoization", and why does it matter?',
    realWorldContext: 'You will write programs that solve exponential-time recursive problems in linear time by remembering past results. The transferable problem this solves is identical-work duplication—when a recursive algorithm blindly recomputes the same state millions of times, you will intercept it and serve the answer from memory instead.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: The Cache (Memoization), Optimal Substructure.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Dynamic Programming:** A method for solving complex problems by breaking them down into simpler subproblems and storing the results. It exists To avoid the catastrophic performance cost of recomputing the same answers in massive recursive trees.\n- **Overlapping Subproblems:** A condition where a recursive algorithm asks the exact same question multiple times. It exists It is the fundamental flaw in naive divide-and-conquer that makes dynamic programming necessary; if subproblems don\'t overlap, caching is useless.\n- **Optimal Substructure:** A property where the absolute best solution to a large problem can be constructed directly from the absolute best solutions to its smaller pieces. It exists It proves that local, comparative combinations of sub-answers will actually produce a mathematically correct global answer, making caching safe.\n- **Memoization:** The specific technique of writing a function so that it stores its return value in a lookup table before returning it, and checks that table before doing work. It exists To act as the memory mechanism for dynamic programming, structurally turning a tree of recursive calls into a straight line.\n- **Cache:** A data structure (often a hash map) that maps problem inputs to their computed outputs. It exists To physically hold the saved answers across recursive call boundaries.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **Everything else in the file, not this lesson\'s subject but still explained::** A method returning a special iterator marking the position past the last element in the cache.\n- **std::vector&lt;T&gt;:** A dynamic array used to hold an ordered collection of elements.\n- **std::min:** A standard library function that returns the smaller of two values.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We took a process that exploded exponentially—calculating Fibonacci by branching into identical subtrees—and broke the cycle by giving the function a memory (`std::unordered_map`). A call to `fib(50)` spawned a linear descent because every overlapping query hit the cache. We then carried this architecture into Coin Change. Instead of blindly summing, Coin Change used the same cache to remember the absolute smallest number of steps required to solve sub-amounts. By evaluating multiple branches, selecting the winner with `std::min`, and saving that winner to the map, a problem that naturally required searching millions of combinations collapsed into a fast, linear chain of lookups.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If we disable the cache on an optimal substructure search, the math remains correct, but the execution time becomes apocalyptic. Modify the `coin_change.cpp` file to comment out the cache lookup: \n\n```cpp\n// if (cache.find(amount) != cache.end()) {\n//     return cache[amount];\n// }\n```\n\nRecompile and run the program for `amount = 50`. **The actual failure:** The terminal will hang indefinitely. Without the cache, the program re-evaluates the same coin combinations millions of times. The cache is not an optimization; for problem spaces this deep, it is the only mechanism that allows the program to terminate at all.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Cache Inspection:** Inside `memoized_fibonacci.cpp`, immediately after `cache[n] = result;`, add a print statement: `std::cout << "Computed fib(" << n << ")\\n";`. Run the program and observe that every number is only computed exactly once.\n- **Coin Change Path:** Modify `coin_change.cpp` to use coins `{1, 3, 4}` and search for `amount = 6`. Print the answer. Verify it takes 2 coins (`3+3`) instead of 3 coins (`4+1+1`), proving that DP beats the greedy algorithm.\n- **Missing Base Case:** In `coin_change.cpp`, comment out the `if (amount < 0) return INF;` guard. Run the code. Notice the program crashes with a segmentation fault or stack overflow, proving that DP needs an absolute failure floor to prevent infinite recursion.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written a recursive Fibonacci function backed by an `unordered_map`.\n- [ ] You have written a Coin Change algorithm that makes choices using `std::min`.\n- [ ] You have executed both programs and observed them run in linear time.\n- [ ] You can explain out loud why overlapping subproblems make naive recursion unviable.\n- [ ] `git commit -m "Implement memoization and DP for overlapping subtrees"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 22: Dynamic Programming: Memoization',
        caption: 'Dynamic Programming: Memoization',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Cache (Memoization)',
              prose: [
                'Recursion solves a problem by asking the same question about a smaller input. But naive recursion forgets the answers as soon as it returns them. In the Fibonacci sequence, `fib(5)` asks for `fib(4)` and `fib(3)`. But `fib(4)` *also* asks for `fib(3)`. The exact same `fib(3)` subtree is executed twice. For `fib(50)`, this duplication occurs trillions of times, making the program exponentially slow. We need a way for the recursive function to remember what it has already done.',
                '## How the Code Works',
                '- `long long fib(...)`: A function that returns a `long long` (since Fibonacci numbers grow past the standard `int` limit at `n=47`) and takes the target `n` alongside a cache.\n- `std::unordered_map<int, long long>& cache`: An `unordered_map` passed strictly by reference (`&`). If it were passed by value, every recursive call would get its own blank copy of the map, destroying the shared memory pool entirely.\n- `if (n <= 1) return n;`: The base case, standard for recursion.\n- `cache.find(n)`: A method that searches the hash map for the key `n`. It returns an iterator to the key-value pair if found.\n- `!= cache.end()`: An equality operator comparing the search result against the map\'s end marker. If they are not equal, it means the key exists in the cache.\n- `return cache[n];`: The map\'s subscript operator retrieves the stored `long long` answer directly. This line executes, instantly returning the answer, completely bypassing the massive recursive tree below it.\n- `fib(n - 1, cache) + fib(n - 2, cache)`: The core recursive overlapping subproblem. It asks the same function for the two preceding values, passing the shared cache down into both trees.\n- `long long result = ...`: Stores the output of that massive tree computation in a local variable before we return it.\n- `cache[n] = result;`: The memoization step. We record the computed answer into the hash map, keyed by `n`, so that any future branch asking for `fib(n)` hits the `cache.find(n)` intercept instead of computing this again.\n- `return result;`: Finally, we yield the answer back to the caller.\n- `fib(3, cache)` — Starts computing `fib(3)`. Because `cache.find(3)` fails, it calls `fib(2)` and `fib(1)`.\n- `fib(2, cache)` — Starts computing `fib(2)`. Because `cache.find(2)` fails, it calls `fib(1)` and `fib(0)`, which hit the base case and return `1` and `0`.\n- `cache[2] = 1` — `fib(2)` records its answer (`1 + 0 = 1`) into the map before returning it.\n- `fib(1, cache)` — Hits the base case and returns `1`.\n- `cache[3] = 2` — `fib(3)` receives the answers, sums them (`1 + 1 = 2`), records the answer into the map, and returns.\n- `cache.find(3)` — From this point forward, if any other branch anywhere in the tree calls `fib(3)`, the find intercept instantly returns `2`. The recursive children are never spawned.',
                '**CS lens.** This is **Dynamic Programming** in its top-down form (Memoization). By trading space (the memory used by the hash map) for time, we convert an $O(2^n)$ exponential time algorithm into an $O(n)$ linear time algorithm. The recursion still happens, but every state is evaluated exactly once. Also recognized in: database query caching, CPU instruction caches, HTTP proxy servers, web browser local storage, and CDNs (Content Delivery Networks).',
                '**SE lens.** The alternative not chosen is pure bottom-up tabulation (an iterative loop from `0` to `n`). The tradeoff here is recursion depth overhead vs. conceptual simplicity. Bottom-up iteration is structurally faster because it avoids function call stack overhead entirely, but top-down memoization is often easier for engineers to write because it perfectly preserves the original recursive mathematical definition of the problem.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <unordered_map>\n\nlong long fib(int n, std::unordered_map<int, long long>& cache) {\n    if (n <= 1) return n;\n    \n    if (cache.find(n) != cache.end()) {\n        return cache[n];\n    }\n    \n    long long result = fib(n - 1, cache) + fib(n - 2, cache);\n    cache[n] = result;\n    return result;\n}',
              expectedOutput: '$ ./memo_fib\nfib(50) = 12586269025',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Optimal Substructure',
              prose: [
                'You need to make exact change for a target amount (e.g., 11 cents) using the fewest number of coins possible from a given set of denominations (e.g., {1, 2, 5}). A greedy approach (always taking the largest coin) fails on many coin sets. You must explore all combinations. To find the true minimum, the problem must exhibit **Optimal Substructure**: the absolute best way to make 11 cents is to find the absolute best way to make `11 - coin` cents, and add 1.',
                '## How the Code Works',
                '- `const int INF = 1e9;`: A large integer acting as "infinity." We use this instead of `INT_MAX` because adding `1` to `INT_MAX` causes integer overflow, wrapping around to a negative number.\n- `if (amount == 0) return 0;`: The success base case. It takes zero coins to make zero cents.\n- `if (amount < 0) return INF;`: The failure base case. If we subtracted a coin that was too large, this path is invalid. Returning infinity effectively poisons this path.\n- `cache.find(amount)`: The map searches for the remaining amount to see if it was already solved.\n- `!= cache.end()`: Validates whether the search actually found a result.\n- `return cache[amount];`: The early exit. If found, we instantly return the smallest number of coins needed for this amount.\n- `int best = INF;`: A local tracker for the optimal answer. We initialize it to infinity so that *any* valid path will be smaller and overwrite it.\n- `for (int coin : coins)`: A loop that tests every available coin denomination against the current amount.\n- `int current = minCoins(amount - coin, coins, cache);`: The recursive step. We subtract the coin\'s value and ask the function, "what is the best way to make the remaining amount?"\n- `if (current != INF)`: A guard preventing us from considering dead-end branches.\n- `best = std::min(best, current + 1);`: The optimal substructure decision. `std::min` compares the running `best` against `current + 1` (the `+ 1` counts the coin we just spent to drop down into the `current` state). The smaller value becomes the new `best`.\n- `cache[amount] = best;`: The memoization step. After checking every coin branch and finding the absolute minimum, we save it into the hash map.\n- `return best;`: Returns the smallest number of coins to the caller.\n- `minCoins(2, ...)` — The loop tests coin `1` first. It subtracts the coin and recursively calls `minCoins(1)`.\n- `minCoins(1, ...)` — Tests coin `1`. Subtracts the coin and calls `minCoins(0)`.\n- `minCoins(0, ...)` — Hits the exact change base case and returns `0`.\n- `best = std::min(INF, 0 + 1)` — Back in `minCoins(1)`, it receives `0` and adds `1` (for the coin just spent). The new `best` is `1`.\n- `minCoins(-1, ...)` — Still in `minCoins(1)`, it tests coin `2`. The remaining amount becomes `-1`. It hits the failure base case and returns `INF`.\n- `best = std::min(1, INF + 1)` — The invalid path is ignored because `1` is smaller than `INF`. `minCoins(1)` saves `cache[1] = 1` and returns `1`.\n- `best = std::min(INF, 1 + 1)` — Back in `minCoins(2)`, it receives the answer `1` from the coin `1` branch. `best` becomes `2`.\n- `minCoins(0, ...)` — Still in `minCoins(2)`, it tests coin `2`. The remaining amount becomes `0`. It returns `0`.\n- `best = std::min(2, 0 + 1)` — It compares the previous `best` of `2` against the new path which took `0 + 1` coins. The new path is shorter, so `best` becomes `1`. It saves `cache[2] = 1` and returns `1`.',
                '**CS lens.** This algorithm models a **State-Space Search Tree**. Without memoization, exploring every branch is computationally identical to generating the permutations of a string—catastrophically slow. With memoization, it behaves like a **Directed Acyclic Graph (DAG)** search. If multiple coin sequences land on a remaining balance of `4` cents, the algorithm only solves the `4`-cent node once. Also recognized in: shortest path routing algorithms (Dijkstra\'s), network packet routing protocols (OSPF), sequence alignment in bioinformatics, and AI game tree pruning.',
                '**SE lens.** The alternative not chosen is a pure greedy algorithm. A greedy approach is computationally trivial (just divide and take modulos), but greedy fails entirely on non-canonical coin sets (e.g., trying to make `6` cents with coins `{1, 3, 4}`; greedy takes `4 + 1 + 1` (3 coins), DP correctly finds `3 + 3` (2 coins)). The tradeoff here is correctness versus speed. DP guarantees absolute mathematical correctness by searching the entire valid space, heavily mitigated by the cache.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <unordered_map>\n#include <algorithm>\n\nconst int INF = 1e9;\n\nint minCoins(int amount, const std::vector<int>& coins, std::unordered_map<int, int>& cache) {\n    if (amount == 0) return 0;\n    if (amount < 0) return INF;\n    \n    if (cache.find(amount) != cache.end()) {\n        return cache[amount];\n    }\n    \n    int best = INF;\n    for (int coin : coins) {\n        int current = minCoins(amount - coin, coins, cache);\n        if (current != INF) {\n            best = std::min(best, current + 1);\n        }\n    }\n    \n    cache[amount] = best;\n    return best;\n}',
              expectedOutput: '$ ./coin_change\nMinimum coins for 11: 3',
              code: '',
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
      'If the simulated output doesn\'t match what you expected, re-read the reference code line by line — the walkthrough above explains exactly what each line does.',
      'Compile errors in real C++ are informative — read the first error the compiler reports, not the last; later errors are often just fallout from the first one.',
    ],
    futureLinks: [
      'Next lesson: Dynamic Programming: Tabulation.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Dynamic Programming"?',
      options: [
        'A method for solving complex problems by breaking them down into simpler subproblems and storing the results. It exists To avoid the catastrophic performance cost of recomputing the same answers in massive recursive trees.',
        'A condition where a recursive algorithm asks the exact same question multiple times. It exists It is the fundamental flaw in naive divide-and-conquer that makes dynamic programming necessary; if subproblems don\'t overlap, caching is useless.',
        'The specific technique of writing a function so that it stores its return value in a lookup table before returning it, and checks that table before doing work. It exists To act as the memory mechanism for dynamic programming, structurally turning a tree of recursive calls into a straight line.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Memoization"?',
      options: [
        'The specific technique of writing a function so that it stores its return value in a lookup table before returning it, and checks that table before doing work. It exists To act as the memory mechanism for dynamic programming, structurally turning a tree of recursive calls into a straight line.',
        'A method for solving complex problems by breaking them down into simpler subproblems and storing the results. It exists To avoid the catastrophic performance cost of recomputing the same answers in massive recursive trees.',
        'A property where the absolute best solution to a large problem can be constructed directly from the absolute best solutions to its smaller pieces. It exists It proves that local, comparative combinations of sub-answers will actually produce a mathematically correct global answer, making caching safe.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Overlapping Subproblems"?',
      options: [
        'A data structure (often a hash map) that maps problem inputs to their computed outputs. It exists To physically hold the saved answers across recursive call boundaries.',
        'A condition where a recursive algorithm asks the exact same question multiple times. It exists It is the fundamental flaw in naive divide-and-conquer that makes dynamic programming necessary; if subproblems don\'t overlap, caching is useless.',
        'The specific technique of writing a function so that it stores its return value in a lookup table before returning it, and checks that table before doing work. It exists To act as the memory mechanism for dynamic programming, structurally turning a tree of recursive calls into a straight line.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Optimal Substructure"?',
      options: [
        'A property where the absolute best solution to a large problem can be constructed directly from the absolute best solutions to its smaller pieces. It exists It proves that local, comparative combinations of sub-answers will actually produce a mathematically correct global answer, making caching safe.',
        'A method for solving complex problems by breaking them down into simpler subproblems and storing the results. It exists To avoid the catastrophic performance cost of recomputing the same answers in massive recursive trees.',
        'The specific technique of writing a function so that it stores its return value in a lookup table before returning it, and checks that table before doing work. It exists To act as the memory mechanism for dynamic programming, structurally turning a tree of recursive calls into a straight line.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Dynamic Programming** — A method for solving complex problems by breaking them down into simpler subproblems and storing the results. It exists To avoid the catastrophic performance cost of recomputing the same answers in massive recursive trees.',
    '**Overlapping Subproblems** — A condition where a recursive algorithm asks the exact same question multiple times. It exists It is the fundamental flaw in naive divide-and-conquer that makes dynamic programming necessary; if subproblems don\'t overlap, caching is useless.',
    '**Optimal Substructure** — A property where the absolute best solution to a large problem can be constructed directly from the absolute best solutions to its smaller pieces. It exists It proves that local, comparative combinations of sub-answers will actually produce a mathematically correct global answer, making caching safe.',
    '**Memoization** — The specific technique of writing a function so that it stores its return value in a lookup table before returning it, and checks that table before doing work. It exists To act as the memory mechanism for dynamic programming, structurally turning a tree of recursive calls into a straight line.',
    '**Cache** — A data structure (often a hash map) that maps problem inputs to their computed outputs. It exists To physically hold the saved answers across recursive call boundaries.',
  ],

  checkpoints: ['read-intuition'],
}
