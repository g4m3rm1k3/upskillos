// cpp-dsa — Lesson 23: Dynamic Programming: Tabulation
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 23 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-23-dynamic-programming-tabulation',
  slug: 'dynamic-programming-tabulation',
  chapter: 6,
  order: 3,
  title: 'Dynamic Programming: Tabulation',
  subtitle: 'Advanced Techniques',
  tags: ['tabulation', 'dependency-order', 'space-optimization'],

  hook: {
    question: 'What is "Dynamic Programming: Tabulation", and why does it matter?',
    realWorldContext: 'You will write standalone C++ scripts that solve problems by pre-computing and storing subproblem answers iteratively rather than recursively. The transferable problem this solves is calculating values strictly from the bottom up, ensuring every dependency is ready before it is needed, while eliminating the memory overhead and stack risks of recursive function calls. Finally, you will optimize memory by squashing a two-dimensional grid into a single one-dimensional array.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Dependency Order in Tabulation, Converting Memoization to a 2D Table, Space Optimization (Reducing 2D to 1D).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Tabulation:** Building a table (usually an array or vector) iteratively from the smallest subproblem up to the final target. It exists To compute recurrent relationships sequentially without the hidden context-switching overhead and stack limits of recursive function calls.\n- **Dependency order:** The explicit, manual sequence in which subproblems must be solved. It exists Because in a bottom-up loop, you cannot calculate state i until every state it depends on is already computed and sitting in the table; recursion pauses to get dependencies automatically, but tabulation requires you to order the loops correctly.\n- **Space optimization:** The practice of discarding old subproblem answers that will never be needed again. It exists To dramatically reduce the memory footprint of a dynamic programming algorithm, often converting an $O(N^2)$ memory requirement into $O(N)$ when the algorithm only looks backward a fixed number of steps.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **Everything else in the file, not this lesson\'s subject but still explained.:** The standard character output stream.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Every step we took reduced the runtime burden. We began by removing the call stack overhead completely using a 1D vector loop. We then proved we could map a two-variable recursive problem onto a 2D vector matrix by iterating strictly left-to-right and top-to-bottom. Finally, we analyzed the dependencies in that matrix and compressed it down to a 1D array, reducing the memory footprint entirely while arriving at the exact same answer (`6`).',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 23: Dynamic Programming: Tabulation',
        caption: 'Dynamic Programming: Tabulation',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Dependency Order in Tabulation',
              prose: [
                'When you use memoization, the recursive function calls automatically pause to solve any subproblems they need, naturally resolving dependencies. But recursive calls carry stack overhead and risk stack overflow on deep inputs. To solve subproblems iteratively with a simple loop, you must manually guarantee that before you calculate step $i$, the answers for $i-1$ and $i-2$ are already computed. You need a structured way to order the work from smallest to largest.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <vector>\nint main() {\n    std::vector<int> table(4, -1);\n    for(int val : table) std::cout << val << " ";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <iostream>`: Pulls in the standard output stream definitions.\n- `#include <vector>`: Pulls in the standard vector container definitions.\n- `int n = 5;`: Declares the target subproblem we want to solve.\n- `std::vector<int> dp(n + 1, 0);`: Instantiates a vector named `dp` holding integers. It creates `n + 1` elements (6 elements total, so indices `0` through `5` are valid), and sets each to `0`. We need `n + 1` so that `dp[n]` is a valid addressable index.\n- `dp[0] = 0;`: Manually sets the base case for $0$.\n- `dp[1] = 1;`: Manually sets the base case for $1$.\n- `for (int i = 2; i <= n; i++)`: The core iteration order. It begins at `2` because `0` and `1` are already solved. It strictly moves upward.\n- `dp[i] = dp[i - 1] + dp[i - 2];`: The state transition equation. It calculates the current state by reading the two previous states directly from the table. Because the loop strictly counts up, `i - 1` and `i - 2` are guaranteed to have been solved in earlier iterations.\n- `std::cout << "Answer for " << n << ": " << dp[n] << "\\n";`: Prints the final solved target.\nExecution trace for the loop:\n```text\nIteration 1: i=2, dp[2] = dp[1] + dp[0] = 1 + 0 = 1\nIteration 2: i=3, dp[3] = dp[2] + dp[1] = 1 + 1 = 2\nIteration 3: i=4, dp[4] = dp[3] + dp[2] = 2 + 1 = 3\nIteration 4: i=5, dp[5] = dp[4] + dp[3] = 3 + 2 = 5\n```',
                '**CS lens.** This is **Tabulation** — the bottom-up approach to Dynamic Programming. ```text Also recognized in: generating Pascal\'s Triangle, calculating Levenshtein distance in spell checkers, and route-finding algorithms like Floyd-Warshall. ``` By systematically computing from smallest to largest, tabulation avoids the recursive call stack completely.',
                '**SE lens.** The alternative not chosen is top-down memoization with recursive function calls. The tradeoff here is control versus simplicity. Tabulation requires you to figure out the exact topological order of dependencies (which is easy for a 1D sequence but hard for complex graphs), but in return, it executes as a blazing-fast contiguous memory loop with zero stack-frame overhead.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    int n = 5;\n    std::vector<int> dp(n + 1, 0);\n    \n    dp[0] = 0;\n    dp[1] = 1;\n    \n    for (int i = 2; i <= n; i++) {\n        dp[i] = dp[i - 1] + dp[i - 2];\n    }\n    \n    std::cout << "Answer for " << n << ": " << dp[n] << "\\n";\n    return 0;\n}',
              expectedOutput: 'Answer for 5: 5',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Converting Memoization to a 2D Table',
              prose: [
                'A 2D dynamic programming problem (like finding unique paths on a grid) has two variables: a row and a column. Memoization uses a recursive function taking two arguments, but a bottom-up approach needs to iterate through a 2D grid in a specific order so that every cell\'s dependencies (the cell directly above it and the cell directly left of it) are already computed and filled before we reach the current cell.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <vector>\nint main() {\n    std::vector<std::vector<int>> grid(2, std::vector<int>(3, 9));\n    std::cout << grid[1][2];\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `int rows = 3;`: Defines the vertical dimension of our grid.\n- `int cols = 3;`: Defines the horizontal dimension of our grid.\n- `std::vector<std::vector<int>> dp(...)`: Declares a vector where every element is itself another `std::vector<int>`.\n- `(rows, std::vector<int>(cols, 0))`: The outer vector allocates `rows` (3) slots. For every slot, it inserts a brand new inner vector of size `cols` (3), initialized to `0`.\n- `for (int r = 0; r < rows; r++)`: The outer loop visits every row sequentially from top to bottom.\n- `for (int c = 0; c < cols; c++)`: The inner loop visits every column in the current row from left to right. This left-to-right, top-to-bottom iteration is the explicit **dependency order** for this problem.\n- `if (r == 0 || c == 0)`: The base case check. If we are on the very top edge (`r == 0`) or the very left edge (`c == 0`), there is only 1 way to reach this cell (moving straight).\n- `dp[r][c] = 1;`: Fills the base case directly into the table.\n- `dp[r][c] = dp[r - 1][c] + dp[r][c - 1];`: The recurrence relation. It computes the current cell by adding the paths from the cell directly above (`r - 1`) and the cell directly to the left (`c - 1`). Because of our nested loop order, both of those cells were guaranteed to be visited and filled in earlier loop iterations.\nExecution trace for the interior cell at `r=1, c=1`:\n- `dp[r-1][c]` evaluates to `dp[0][1]`, which the loop previously set to `1` (top edge base case).\n- `dp[r][c-1]` evaluates to `dp[1][0]`, which the loop previously set to `1` (left edge base case).\n- `dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1`, resulting in `2`.',
                '**CS lens.** This is **2D Tabulation**. Because we strictly iterate top-down and left-right, every cell acts as a dependency sink that only reads backward in time. ```text Also recognized in: computing Longest Common Subsequence in diff tools, zero-one Knapsack problems, and sequence alignment in bioinformatics. ```',
                '**SE lens.** The alternative not chosen is a 2D recursive function using a hash map for memoization. The tradeoff here is memory locality. A 2D `std::vector` places its rows in predictable memory, allowing the CPU cache to efficiently prefetch the data. A recursive map causes random heap jumps, making the recursive version noticeably slower on large grids even if the mathematical time complexity is identical.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    int rows = 3;\n    int cols = 3;\n    std::vector<std::vector<int>> dp(rows, std::vector<int>(cols, 0));\n    \n    for (int r = 0; r < rows; r++) {\n        for (int c = 0; c < cols; c++) {\n            if (r == 0 || c == 0) {\n                dp[r][c] = 1;\n            } else {\n                dp[r][c] = dp[r - 1][c] + dp[r][c - 1];\n            }\n        }\n    }\n    \n    std::cout << "Paths to bottom-right: " << dp[rows - 1][cols - 1] << "\\n";\n    return 0;\n}',
              expectedOutput: 'Paths to bottom-right: 6',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Space Optimization (Reducing 2D to 1D)',
              prose: [
                'The 2D table above uses $O(m \\times n)$ memory. But look at the dependency: when calculating row `r`, you only ever look at row `r` (the current cell\'s left neighbor) and row `r-1` (the cell directly above it). Row `r-2` and earlier are completely dead memory. To save space, we want to reduce the entire 2D matrix down to a single 1D array that continuously overwrites itself.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\nint main() {\n    int value = 5;\n    value = value + 2;\n    std::cout << value;\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `int rows = 3;`: Sets the number of rows.\n- `int cols = 3;`: Sets the number of columns.\n- `std::vector<int> dp(cols, 1);`: We declare a single 1D array representing just *one* row. We initialize every column to `1`. This pre-fills the array to perfectly mimic the `r=0` top-edge base case.\n- `for (int r = 1; r < rows; r++)`: The outer loop still simulates moving row by row, starting from row 1.\n- `for (int c = 1; c < cols; c++)`: The inner loop moves left to right. We start at column 1 because the left edge (`c=0`) is always `1`.\n- `dp[c] = dp[c] + dp[c - 1];`: The space optimization core.\n- `dp[c]` (on the right side of `=`): Reads the value currently sitting at index `c`. Because we haven\'t overwritten it yet this iteration, this is the value from the *previous* row. It acts exactly like `dp[r - 1][c]`.\n- `dp[c - 1]` (on the right side of `=`): Reads the value at the previous index. Because the inner loop moves left to right, column `c - 1` was already updated during this current row\'s iteration. It acts exactly like `dp[r][c - 1]`.\n- `dp[c]` (on the left side of `=`): Overwrites the slot with the new sum, fully migrating this slot from "old row" to "new row".\n- `std::cout << "Paths to bottom-right: " << dp[cols - 1] << "\\n";`: The final answer is sitting in the last slot of the array once all rows are processed.\nExecution trace for the second row (`r = 1`):\n- `Start state` is `dp = [1, 1, 1]`, which represents row 0.\n- The inner loop evaluates `c = 1`. It calculates `dp[1] + dp[0]`, reading `1 + 1 = 2`. It overwrites `dp[1]`. The state becomes `[1, 2, 1]`.\n- The inner loop evaluates `c = 2`. It calculates `dp[2] + dp[1]`, reading `1 + 2 = 3`. It overwrites `dp[2]`. The state becomes `[1, 2, 3]`.',
                '**CS lens.** This is **Space Optimization**. By analyzing the topological bounds of our recurrence relation, we proved that the problem only has a lookback depth of 1 row. Dropping an entire dimension shifts the memory complexity from $O(N^2)$ to $O(N)$, which is often the difference between a program passing or crashing out of memory on a server. ```text Also recognized in: sliding window algorithms, audio processing buffers, and streaming cellular automata logic. ```',
                '**SE lens.** The alternative not chosen is keeping the full 2D array. The tradeoff here is debugging visibility versus hardware limits. When you squash the matrix down to 1D, you permanently destroy the historical states, making it impossible to print out the whole 2D grid to verify your intermediate math. You sacrifice observability to guarantee the program fits in RAM.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    int rows = 3;\n    int cols = 3;\n    std::vector<int> dp(cols, 1);\n    \n    for (int r = 1; r < rows; r++) {\n        for (int c = 1; c < cols; c++) {\n            dp[c] = dp[c] + dp[c - 1];\n        }\n    }\n    \n    std::cout << "Paths to bottom-right: " << dp[cols - 1] << "\\n";\n    return 0;\n}',
              expectedOutput: 'Paths to bottom-right: 6',
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
      'Next lesson: Greedy Algorithms.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Tabulation"?',
      options: [
        'Building a table (usually an array or vector) iteratively from the smallest subproblem up to the final target. It exists To compute recurrent relationships sequentially without the hidden context-switching overhead and stack limits of recursive function calls.',
        'The practice of discarding old subproblem answers that will never be needed again. It exists To dramatically reduce the memory footprint of a dynamic programming algorithm, often converting an $O(N^2)$ memory requirement into $O(N)$ when the algorithm only looks backward a fixed number of steps.',
        'The explicit, manual sequence in which subproblems must be solved. It exists Because in a bottom-up loop, you cannot calculate state i until every state it depends on is already computed and sitting in the table; recursion pauses to get dependencies automatically, but tabulation requires you to order the loops correctly.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Space optimization"?',
      options: [
        'The practice of discarding old subproblem answers that will never be needed again. It exists To dramatically reduce the memory footprint of a dynamic programming algorithm, often converting an $O(N^2)$ memory requirement into $O(N)$ when the algorithm only looks backward a fixed number of steps.',
        'Building a table (usually an array or vector) iteratively from the smallest subproblem up to the final target. It exists To compute recurrent relationships sequentially without the hidden context-switching overhead and stack limits of recursive function calls.',
        'The explicit, manual sequence in which subproblems must be solved. It exists Because in a bottom-up loop, you cannot calculate state i until every state it depends on is already computed and sitting in the table; recursion pauses to get dependencies automatically, but tabulation requires you to order the loops correctly.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Dependency order"?',
      options: [
        'The practice of discarding old subproblem answers that will never be needed again. It exists To dramatically reduce the memory footprint of a dynamic programming algorithm, often converting an $O(N^2)$ memory requirement into $O(N)$ when the algorithm only looks backward a fixed number of steps.',
        'Building a table (usually an array or vector) iteratively from the smallest subproblem up to the final target. It exists To compute recurrent relationships sequentially without the hidden context-switching overhead and stack limits of recursive function calls.',
        'The explicit, manual sequence in which subproblems must be solved. It exists Because in a bottom-up loop, you cannot calculate state i until every state it depends on is already computed and sitting in the table; recursion pauses to get dependencies automatically, but tabulation requires you to order the loops correctly.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Tabulation** — Building a table (usually an array or vector) iteratively from the smallest subproblem up to the final target. It exists To compute recurrent relationships sequentially without the hidden context-switching overhead and stack limits of recursive function calls.',
    '**Dependency order** — The explicit, manual sequence in which subproblems must be solved. It exists Because in a bottom-up loop, you cannot calculate state i until every state it depends on is already computed and sitting in the table; recursion pauses to get dependencies automatically, but tabulation requires you to order the loops correctly.',
    '**Space optimization** — The practice of discarding old subproblem answers that will never be needed again. It exists To dramatically reduce the memory footprint of a dynamic programming algorithm, often converting an $O(N^2)$ memory requirement into $O(N)$ when the algorithm only looks backward a fixed number of steps.',
  ],

  checkpoints: ['read-intuition'],
}
