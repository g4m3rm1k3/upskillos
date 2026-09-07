// cpp-dsa — Lesson 25: Backtracking
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 25 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-25-backtracking',
  slug: 'backtracking',
  chapter: 6,
  order: 5,
  title: 'Backtracking',
  subtitle: 'Advanced Techniques',
  tags: ['state-space-tree', 'backtracking', 'pruning'],

  hook: {
    question: 'What is "Backtracking", and why does it matter?',
    realWorldContext: 'You will build a program that solves the classic N-Queens problem by systematically placing queens on a board, detecting conflicts, and undoing choices that lead to dead ends. The transferable problem this solves is exploring a massive space of possible solutions efficiently by discarding bad paths as early as possible without getting stuck.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: The Generate-and-Test Loop, Pruning the Tree (N-Queens).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **State-space tree:** The theoretical web of all possible choices a program can make, represented as branches in a tree. It exists To give programmers a mental model for visualizing how an algorithm searches through billions of potential configurations one step at a time.\n- **Backtracking:** A recursive algorithmic pattern that builds a solution incrementally and abandons a path the moment it realizes it cannot succeed. It exists To solve problems where the answer is a sequence of dependent choices, allowing the program to "undo" a bad choice and try the next option without starting over from scratch.\n- **Pruning:** The act of stopping the exploration of a specific branch in the state-space tree early because it violates a constraint. It exists To save computational time. Searching every single possibility (brute force) is mathematically impossible for large inputs; pruning skips dead ends before computing them.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::abs:** A mathematical function that returns the absolute (positive) value of an integer.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Watch a single decision flow through the complete system: At row 0, the loop places a queen at column 0. The recursion goes to row 1. The loop tries column 0, but `isValid` detects a vertical collision and skips it. The loop tries column 1, but `isValid` detects a diagonal collision and skips it. The loop tries column 2, `isValid` approves, the choice is `push_back`\'d, and the recursion dives to row 2. If row 2 finds no valid columns at all, its loop finishes and it returns. The recursion unwinds back to row 1, `pop_back` physically removes the queen from column 2, and row 1 advances to test column 3 on a clean board.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Remove the pruning step by commenting out the `if (isValid(...))` check and its matching braces in `solveNQueens`. Recompile and run. The program will eventually finish and report an astronomical number of "solutions" (16,777,216) because it simply accepted every possible column placement for 8 rows as a valid path, proving that the constraints are the only thing stopping the exponential explosion of states. Restore the `isValid` check.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Count the Nodes:** Add a global or reference variable `int recursiveCalls = 0;` and increment it at the very top of `solveNQueens`. Print this out at the end to see exactly how many times the function was called to find those 92 solutions.\n- **Visualizer:** Modify the base case `if (currentRow == n)` to call a new function `void printBoard(const std::vector<int>& board)` that uses a nested loop to print `Q` for queens and `.` for empty spaces for exactly the first solution found, then forcefully exit the program.\n- **Bigger Boards:** Change `n` to `10`. Recompile and run. Note the slight delay in execution time as the state-space tree expands exponentially.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have run a backtracking loop that undoes its own state using `pop_back`.\n- [ ] You have run an N-Queens solver that calculates diagonal constraints.\n- [ ] You can explain out loud how pruning saves computational time.\n- [ ] `git add src/docs/projects/cpp-dsa/"Lesson 25 Backtracking.md"`\n- [ ] `git commit -m "Add lesson 25 on backtracking, state-space trees, and N-Queens"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 25: Backtracking',
        caption: 'Backtracking',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Generate-and-Test Loop',
              prose: [
                'When searching for a valid combination of choices, the naive approach is to generate every single complete combination first, and then test each one to see if it works. This is known as brute force. For even small problems, this generates an exponentially large number of failures. You need a way to build a partial solution step-by-step, test it immediately, and retreat if it fails, before generating the rest of the combination.',
                '## How the Code Works',
                '- `void findPaths(std::vector<int>& path, int step)`: A recursive function taking a vector by reference (so all recursive calls share and mutate the exact same list) and an integer tracking the current depth.\n- `if (step == 3)`: The base case. If we have successfully made 3 choices, we consider the path complete, print it, and return.\n- `for (int choice = 1; choice <= 2; choice++)`: The generate loop. At every step, the algorithm has exactly two options: pick `1` or pick `2`.\n- `path.push_back(choice);`: The "Choose" step. We commit the current choice to our shared state.\n- `findPaths(path, step + 1);`: The "Explore" step. We recursively call the function to make the *next* choice, moving one step deeper into the state-space tree.\n- `path.pop_back();`: The "Un-choose" or "Backtrack" step. Once the recursive call returns (either because it found a solution or hit a dead end), we remove the choice we just made. This restores the `path` vector to its exact previous state, allowing the `for` loop to advance and try the next choice on a clean slate.\nExecution trace for the recursive calls:\n- `step 0` loop starts, chooses `1`. `path` mutates to `[1]`. Recursion dives to `step 1`.\n- `step 1` loop starts, chooses `1`. `path` mutates to `[1, 1]`. Recursion dives to `step 2`.\n- `step 2` loop starts, chooses `1`. `path` mutates to `[1, 1, 1]`. Recursion dives to `step 3`.\n- `step 3` hits the base case, prints the valid path, and returns control to `step 2`.\n- `step 2` resumes immediately after the recursive call. It executes `path.pop_back()`, shrinking the path back to `[1, 1]`. The loop advances to `choice = 2`.\n- `step 2` chooses `2`. `path` mutates to `[1, 1, 2]`. Recursion dives to `step 3`.\n- `step 3` hits the base case, prints the valid path, and returns control to `step 2`.\n- `step 2` executes `path.pop_back()`, shrinking the path back to `[1, 1]`. Its loop finishes, and it returns control to `step 1`.',
                '**CS lens.** This embodies **Depth-First Search (DFS)** on a state-space tree. The algorithm plunges down a single path as deep as possible before exploring siblings. The sequence of pushing a choice, recurring, and popping the choice is the universal blueprint for backtracking.',
                '**SE lens.** The alternative not chosen is passing the vector by value (making a copy for every recursive call). The tradeoff is performance. Copying the vector avoids the need to manually execute `pop_back` to undo state, but dynamically allocating a new array on every single node of an exponential tree would consume massive amounts of CPU time and memory. Mutating a single shared reference and rigorously cleaning up after yourself is standard for high-performance searches.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nvoid findPaths(std::vector<int>& path, int step) {\n    if (step == 3) {\n        std::cout << "Valid path: ";\n        for (int p : path) std::cout << p << " ";\n        std::cout << "\\n";\n        return;\n    }\n\n    for (int choice = 1; choice <= 2; choice++) {\n        // 1. Choose\n        path.push_back(choice);\n        \n        // 2. Explore\n        findPaths(path, step + 1);\n        \n        // 3. Un-choose (Backtrack)\n        path.pop_back();\n    }\n}\n\nint main() {\n    std::vector<int> path;\n    findPaths(path, 0);\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Pruning the Tree (N-Queens)',
              prose: [
                'Generating all combinations is fine for small trees, but the N-Queens problem asks us to place 8 queens on an 8x8 chessboard such that no two queens attack each other (no two share the same row, column, or diagonal). If we generate all possible column placements for 8 rows, that is $8^8 = 16,777,216$ states. We need to detect collisions *while* building the path and stop exploring immediately if a constraint is violated.',
                '## How the Code Works',
                '- `bool isValid(const std::vector<int>& board, int currentRow, int proposedCol)`: A helper function that checks if placing a queen at `(currentRow, proposedCol)` conflicts with any previously placed queens.\n- `const std::vector<int>& board`: We pass the board by `const` reference because the validation logic only needs to read the history, not alter it. The index in the vector represents the row, and the value represents the column the queen is in.\n- `for (int r = 0; r < currentRow; r++)`: Loops through every row that already has a queen placed in it.\n- `int c = board[r];`: Reads the column position of the previously placed queen.\n- `if (c == proposedCol) return false;`: Checks for a column collision. If any previous queen `c` is in the same column we are proposing, this placement is invalid.\n- `if (std::abs(c - proposedCol) == std::abs(r - currentRow)) return false;`: Checks for a diagonal collision. Two points are on the same diagonal if the absolute horizontal difference equals the absolute vertical difference.\n- `std::abs(...)`: Calculates the absolute value, eliminating the need to check positive and negative diagonal slopes separately.\n- `if (isValid(board, currentRow, col))`: The pruning trigger. We only execute the `push_back`/recurse/`pop_back` sequence if the proposed column is safe. If it is not, the `for` loop skips it entirely, instantly severing that branch of the state-space tree from exploration.\n- `solutions++`: A counter passed by reference that increments every time a valid leaf node in the state-space tree is reached.',
                '**CS lens.** This is **Pruning**. By checking validity *before* recursing, the algorithm avoids generating the millions of child states that would flow from an obviously invalid placement. This reduces the search space for 8 Queens from 16.7 million paths down to just 2,056 actual recursive checks. Also recognized in: chess engines evaluating moves (Alpha-Beta pruning), pathfinding algorithms like A*, and constraint satisfaction solvers.',
                '**SE lens.** The alternative not chosen is representing the board as a full 2D array `int board[8][8]` and scanning the whole grid for conflicts. The tradeoff is space and validation speed. By recognizing that each row can only hold exactly one queen, we flatten the state into a single 1D vector `std::vector<int>` where the index implies the row. This dramatically shrinks the memory footprint and speeds up the collision math since we only check exact mathematical coordinates rather than scanning empty array slots.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <cmath>\n\nbool isValid(const std::vector<int>& board, int currentRow, int proposedCol) {\n    for (int r = 0; r < currentRow; r++) {\n        int c = board[r];\n        if (c == proposedCol) return false;\n        if (std::abs(c - proposedCol) == std::abs(r - currentRow)) return false;\n    }\n    return true;\n}\n\nvoid solveNQueens(std::vector<int>& board, int currentRow, int n, int& solutions) {\n    if (currentRow == n) {\n        solutions++;\n        return;\n    }\n\n    for (int col = 0; col < n; col++) {\n        if (isValid(board, currentRow, col)) {\n            board.push_back(col);\n            solveNQueens(board, currentRow + 1, n, solutions);\n            board.pop_back();\n        }\n    }\n}\n\nint main() {\n    int n = 8;\n    std::vector<int> board;\n    int solutions = 0;\n    \n    solveNQueens(board, 0, n, solutions);\n    \n    std::cout << "Found " << solutions << " solutions for " << n << " Queens.\\n";\n    return 0;\n}',
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
      'This is the final lesson of the course — nice work getting here.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Backtracking"?',
      options: [
        'The act of stopping the exploration of a specific branch in the state-space tree early because it violates a constraint. It exists To save computational time. Searching every single possibility (brute force) is mathematically impossible for large inputs; pruning skips dead ends before computing them.',
        'A recursive algorithmic pattern that builds a solution incrementally and abandons a path the moment it realizes it cannot succeed. It exists To solve problems where the answer is a sequence of dependent choices, allowing the program to "undo" a bad choice and try the next option without starting over from scratch.',
        'The theoretical web of all possible choices a program can make, represented as branches in a tree. It exists To give programmers a mental model for visualizing how an algorithm searches through billions of potential configurations one step at a time.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "State-space tree"?',
      options: [
        'The act of stopping the exploration of a specific branch in the state-space tree early because it violates a constraint. It exists To save computational time. Searching every single possibility (brute force) is mathematically impossible for large inputs; pruning skips dead ends before computing them.',
        'The theoretical web of all possible choices a program can make, represented as branches in a tree. It exists To give programmers a mental model for visualizing how an algorithm searches through billions of potential configurations one step at a time.',
        'A recursive algorithmic pattern that builds a solution incrementally and abandons a path the moment it realizes it cannot succeed. It exists To solve problems where the answer is a sequence of dependent choices, allowing the program to "undo" a bad choice and try the next option without starting over from scratch.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Pruning"?',
      options: [
        'A recursive algorithmic pattern that builds a solution incrementally and abandons a path the moment it realizes it cannot succeed. It exists To solve problems where the answer is a sequence of dependent choices, allowing the program to "undo" a bad choice and try the next option without starting over from scratch.',
        'The act of stopping the exploration of a specific branch in the state-space tree early because it violates a constraint. It exists To save computational time. Searching every single possibility (brute force) is mathematically impossible for large inputs; pruning skips dead ends before computing them.',
        'The theoretical web of all possible choices a program can make, represented as branches in a tree. It exists To give programmers a mental model for visualizing how an algorithm searches through billions of potential configurations one step at a time.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**State-space tree** — The theoretical web of all possible choices a program can make, represented as branches in a tree. It exists To give programmers a mental model for visualizing how an algorithm searches through billions of potential configurations one step at a time.',
    '**Backtracking** — A recursive algorithmic pattern that builds a solution incrementally and abandons a path the moment it realizes it cannot succeed. It exists To solve problems where the answer is a sequence of dependent choices, allowing the program to "undo" a bad choice and try the next option without starting over from scratch.',
    '**Pruning** — The act of stopping the exploration of a specific branch in the state-space tree early because it violates a constraint. It exists To save computational time. Searching every single possibility (brute force) is mathematically impossible for large inputs; pruning skips dead ends before computing them.',
  ],

  checkpoints: ['read-intuition'],
}
