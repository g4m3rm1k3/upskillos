// cpp-dsa — Lesson 24: Greedy Algorithms
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 24 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-24-greedy-algorithms',
  slug: 'greedy-algorithms',
  chapter: 6,
  order: 4,
  title: 'Greedy Algorithms',
  subtitle: 'Advanced Techniques',
  tags: ['greedy-algorithm', 'local-optimum', 'global-optimum', 'greedy-choice-property', 'optimal-substructure'],

  hook: {
    question: 'What is "Greedy Algorithms", and why does it matter?',
    realWorldContext: 'You will write C++ functions that solve optimization problems by aggressively making the best immediate choice at every step. These programs demonstrate how to bypass exhaustive searching. The transferable problem this solves is identifying when a fast, naive, step-by-step approach is mathematically guaranteed to yield the perfect global solution, and recognizing the structural traps where it fails.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: Activity Selection (The Greedy Success), The Limits of Greed (The Counterexample).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Greedy algorithm:** An algorithmic paradigm that builds a solution piece by piece, always choosing the next piece that offers the most obvious and immediate benefit. It exists To dramatically reduce computation time by never reconsidering past choices and never predicting future ones.\n- **Local optimum:** The most advantageous choice available right now, given only the current state. It exists It provides a single, unambiguous rule for the algorithm to execute at each step without needing memory of past steps or analysis of future steps.\n- **Global optimum:** The absolute best possible solution among all conceivable valid solutions for the entire problem. It exists This is the final answer you are actually trying to find; comparing the greedy result to this determines if the algorithm was successful.\n- **Greedy choice property:** A mathematical characteristic indicating that picking the local optimum strictly leads to a global optimum. It exists It is the primary prerequisite for trusting a greedy algorithm; if a problem lacks this, the greedy approach is merely guessing.\n- **Optimal substructure:** A characteristic where an optimal solution to the whole problem is built strictly out of optimal solutions to its smaller subproblems. It exists It is the secondary prerequisite, guaranteeing that after making one greedy choice, applying the exact same greedy logic to the remaining data will still work.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::sort:** The C++ Standard Library\'s optimized sorting function.\n- **Lambda expressions:** An anonymous function defined directly at the site where it is invoked.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: '**Connect the pieces** A greedy algorithm is not a specific block of code; it is a way of thinking. In the activity selection, the choice (earliest end time) guaranteed success because no future combination could possibly fit more meetings into the same span. In the coin change problem, the choice (largest coin) failed because it ignored better combinations that didn\'t include the largest coin. Both used the exact same aggressive, local-optimum logic, but only one had the mathematical properties to support it. **What breaks without this** If you alter the activity selection sorting rule to be greedy about *start times* instead of end times, the logic breaks. Change the lambda in `activity.cpp`: ```cpp // Incorrect greedy choice: earliest start time return a.start < b.start; ``` If an activity starts at `0` but lasts until `100`, the algorithm will eagerly select it first, locking the room for 100 hours and rejecting dozens of shorter meetings. The local optimum must be carefully chosen to leave the maximum possible room for future steps. **Exercises** 1. **The US Currency Proof:** Modify the coin change code to use US denominations `{25, 10, 5, 1}` and set the target to `93`. Observe that the greedy approach produces the correct minimal amount of coins. 2. **Fractional Knapsack:** You have 50 pounds of space in a bag. You have three items: Item A (10 lbs, $60), Item B (20 lbs, $100), Item C (30 lbs, $120). Write a greedy loop that takes as much of the most valuable item *per pound* as possible, proving it maximizes the total dollar value. 3. **The Counterexample Trap:** Can you find a target amount for the `{11, 5, 1}` currency where the greedy algorithm *does* accidentally produce the optimal solution? **Definition of Done** - [ ] You can define "local optimum" and "global optimum." - [ ] You can explain the "greedy choice property" and "optimal substructure." - [ ] You have compiled and run a successful greedy scheduling algorithm. - [ ] You have compiled and run a failing greedy coin change algorithm. - [ ] You committed your code with a message like: `Proof: Activity selection succeeds with greedy strategy, arbitrary coin change fails.`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 24: Greedy Algorithms',
        caption: 'Greedy Algorithms',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Activity Selection (The Greedy Success)',
              prose: [
                'You have a single conference room and a list of requested meetings, each with a specific start and end time. You want to schedule the maximum possible number of meetings in that single room. Evaluating every possible combination of meetings would take exponential time. You need a fast sequence of choices that guarantees the maximum schedule.',
                '## How the Code Works',
                '- `#include <algorithm>`: Instructs the compiler to include the file defining sorting and searching algorithms, required for `std::sort`.\n- `struct Activity`: Defines a custom data type holding a name, start time, and end time. This binds the three pieces of data together so they move as one unit when sorted.\n- `std::sort(...)`: Calls the standard library sorting algorithm. It requires three arguments: the beginning of the range, the end of the range, and a custom comparison rule.\n- `[](const Activity& a, const Activity& b) { return a.end < b.end; }`: A lambda expression serving as the comparison rule. It instructs `std::sort` to place activity `a` before activity `b` strictly if `a` finishes before `b`. This establishes our local optimum: the activity that frees up the room the fastest.\n- `std::vector<Activity> schedule`: Initializes an empty dynamic array to store the final chosen activities.\n- `int current_time = 0`: Tracks the moment the conference room will next become available. Initially, the room is free at time zero.\n- `for (const Activity& act : activities)`: Iterates over the now-sorted list of activities one by one.\n- `if (act.start >= current_time)`: The condition checking if the current activity is compatible with the schedule. Because the list is sorted by end time, the very first activity that meets this condition is mathematically guaranteed to be the best possible choice.\n- `schedule.push_back(act)`: Appends the compatible activity to our final result list.\n- `current_time = act.end`: Updates the room\'s availability to the end time of the newly scheduled activity. This locks the room for that duration and prevents overlapping choices in future iterations.\n- `act` = A (1-4): The condition `start (1) >= current_time (0)` evaluates to true, meaning the room is free. The code appends `A` to `schedule` and updates `current_time` to `4`.\n- `act` = B (3-5): The condition `start (3) >= current_time (4)` evaluates to false because it overlaps with `A`. The code skips it.\n- `act` = C (0-6): The condition `start (0) >= current_time (4)` evaluates to false. The code skips it.\n- `act` = D (5-7): The condition `start (5) >= current_time (4)` evaluates to true. The code appends `D` to `schedule` and updates `current_time` to `7`.',
                '**CS lens.** This algorithm works because it possesses the **greedy choice property** and **optimal substructure**. By always picking the activity that ends earliest, we leave the maximum possible remaining time for all subsequent activities. Once we make that greedy choice, the remainder of the timeline (from `act.end` onward) is an exact, smaller copy of the original problem (optimal substructure). There is no scenario where picking an activity that ends later could possibly allow more subsequent activities to fit.',
                '**SE lens.** The alternative not chosen is dynamic programming or recursive backtracking to evaluate every valid non-overlapping subset. The tradeoff is computation time: a greedy approach runs in O(N log N) time (dominated entirely by the `std::sort`), whereas backtracking takes O(2^N) exponential time. When the problem structure allows it, greedy algorithms are the most performant choice in software engineering.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nstruct Activity {\n    std::string name;\n    int start;\n    int end;\n};\n\nint main() {\n    std::vector<Activity> activities = {\n        {"A", 1, 4},\n        {"B", 3, 5},\n        {"C", 0, 6},\n        {"D", 5, 7},\n        {"E", 3, 9},\n        {"F", 5, 9},\n        {"G", 6, 10},\n        {"H", 8, 11},\n        {"I", 8, 12},\n        {"J", 2, 14},\n        {"K", 12, 16}\n    };\n\n    // The Greedy Choice: Sort by earliest end time.\n    std::sort(activities.begin(), activities.end(), [](const Activity& a, const Activity& b) {\n        return a.end < b.end;\n    });\n\n    std::vector<Activity> schedule;\n    int current_time = 0;\n\n    for (const Activity& act : activities) {\n        if (act.start >= current_time) {\n            schedule.push_back(act);\n            current_time = act.end;\n        }\n    }\n\n    std::cout << "Max activities scheduled: " << schedule.size() << "\\n";\n    for (const Activity& act : schedule) {\n        std::cout << act.name << " (" << act.start << "-" << act.end << ")\\n";\n    }\n\n    return 0;\n}',
              expectedOutput: 'Max activities scheduled: 4\nA (1-4)\nD (5-7)\nH (8-11)\nK (12-16)',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Limits of Greed (The Counterexample)',
              prose: [
                'You need to make exact change for a specific amount of money using the absolute minimum number of coins. A greedy algorithm would naturally pick the largest possible coin that fits, subtract its value, and repeat. But if your currency denominations don\'t perfectly align, this logical local optimum traps you in a terrible global solution.',
                '## How the Code Works',
                '- `std::vector<int> denominations = {11, 5, 1}`: Defines our available coin sizes, already sorted from largest to smallest. This ordering is critical because the greedy strategy always attempts the largest choice first.\n- `int remaining = target_amount`: A variable tracking how much change is left to make. It starts at `15`.\n- `for (int coin : denominations)`: Iterates through each available coin size, starting with the largest (`11`).\n- `while (remaining >= coin)`: A loop that continuously applies the current coin as long as it fits into the remaining amount. This is the greedy choice in action: grab the biggest piece possible, as many times as possible, before moving on.\n- `coins_used.push_back(coin)`: Records the choice.\n- `remaining -= coin`: Deducts the chosen coin\'s value from the total left to make.\n- `coin` = 11: The condition `remaining (15) >= 11` evaluates to true. The code pushes `11` into `coins_used` and subtracts `11`, leaving `remaining` at `4`.\n- `coin` = 11: The condition `remaining (4) >= 11` evaluates to false. The inner loop terminates, and the outer loop advances to the next coin.\n- `coin` = 5: The condition `remaining (4) >= 5` evaluates to false. The inner loop terminates, and the outer loop advances to the next coin.\n- `coin` = 1: The condition `remaining (4) >= 1` evaluates to true. The inner loop runs four consecutive times, pushing four `1`s and leaving `remaining` at `0`.',
                '**CS lens.** This is where the **greedy choice property** fails. The greedy algorithm produced a result of 5 coins (one 11-cent coin, four 1-cent coins). However, the absolute optimal solution is 3 coins (three 5-cent coins). By making the locally optimal choice at the very first step (grabbing the massive 11-cent coin), the algorithm backed itself into a corner where it was forced to use inefficient 1-cent coins for the rest of the work. The problem structure does not guarantee that picking the largest coin yields the fewest total coins. (Note: The greedy algorithm *does* work for standard US denominations like 25, 10, 5, 1).',
                '**SE lens.** The alternative not chosen is using dynamic programming to calculate the exact optimal combination for all possible sums up to the target. The tradeoff here is correctness versus speed. A greedy algorithm is useless if it silently returns the wrong answer. In software engineering, you must mathematically prove your problem possesses the greedy choice property before deploying a greedy algorithm to production.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    // A fictional currency system\n    std::vector<int> denominations = {11, 5, 1};\n    int target_amount = 15;\n    \n    std::vector<int> coins_used;\n    int remaining = target_amount;\n    \n    for (int coin : denominations) {\n        while (remaining >= coin) {\n            coins_used.push_back(coin);\n            remaining -= coin;\n        }\n    }\n    \n    std::cout << "Target: " << target_amount << "\\n";\n    std::cout << "Coins used: " << coins_used.size() << "\\n";\n    for (int coin : coins_used) {\n        std::cout << coin << " ";\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
              expectedOutput: 'Target: 15\nCoins used: 5\n11 1 1 1 1 ',
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
      'Next lesson: Backtracking.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Greedy algorithm"?',
      options: [
        'An algorithmic paradigm that builds a solution piece by piece, always choosing the next piece that offers the most obvious and immediate benefit. It exists To dramatically reduce computation time by never reconsidering past choices and never predicting future ones.',
        'A mathematical characteristic indicating that picking the local optimum strictly leads to a global optimum. It exists It is the primary prerequisite for trusting a greedy algorithm; if a problem lacks this, the greedy approach is merely guessing.',
        'The absolute best possible solution among all conceivable valid solutions for the entire problem. It exists This is the final answer you are actually trying to find; comparing the greedy result to this determines if the algorithm was successful.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Optimal substructure"?',
      options: [
        'A characteristic where an optimal solution to the whole problem is built strictly out of optimal solutions to its smaller subproblems. It exists It is the secondary prerequisite, guaranteeing that after making one greedy choice, applying the exact same greedy logic to the remaining data will still work.',
        'The most advantageous choice available right now, given only the current state. It exists It provides a single, unambiguous rule for the algorithm to execute at each step without needing memory of past steps or analysis of future steps.',
        'The absolute best possible solution among all conceivable valid solutions for the entire problem. It exists This is the final answer you are actually trying to find; comparing the greedy result to this determines if the algorithm was successful.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Global optimum"?',
      options: [
        'A mathematical characteristic indicating that picking the local optimum strictly leads to a global optimum. It exists It is the primary prerequisite for trusting a greedy algorithm; if a problem lacks this, the greedy approach is merely guessing.',
        'The absolute best possible solution among all conceivable valid solutions for the entire problem. It exists This is the final answer you are actually trying to find; comparing the greedy result to this determines if the algorithm was successful.',
        'The most advantageous choice available right now, given only the current state. It exists It provides a single, unambiguous rule for the algorithm to execute at each step without needing memory of past steps or analysis of future steps.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Local optimum"?',
      options: [
        'The most advantageous choice available right now, given only the current state. It exists It provides a single, unambiguous rule for the algorithm to execute at each step without needing memory of past steps or analysis of future steps.',
        'A mathematical characteristic indicating that picking the local optimum strictly leads to a global optimum. It exists It is the primary prerequisite for trusting a greedy algorithm; if a problem lacks this, the greedy approach is merely guessing.',
        'A characteristic where an optimal solution to the whole problem is built strictly out of optimal solutions to its smaller subproblems. It exists It is the secondary prerequisite, guaranteeing that after making one greedy choice, applying the exact same greedy logic to the remaining data will still work.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Greedy algorithm** — An algorithmic paradigm that builds a solution piece by piece, always choosing the next piece that offers the most obvious and immediate benefit. It exists To dramatically reduce computation time by never reconsidering past choices and never predicting future ones.',
    '**Local optimum** — The most advantageous choice available right now, given only the current state. It exists It provides a single, unambiguous rule for the algorithm to execute at each step without needing memory of past steps or analysis of future steps.',
    '**Global optimum** — The absolute best possible solution among all conceivable valid solutions for the entire problem. It exists This is the final answer you are actually trying to find; comparing the greedy result to this determines if the algorithm was successful.',
    '**Greedy choice property** — A mathematical characteristic indicating that picking the local optimum strictly leads to a global optimum. It exists It is the primary prerequisite for trusting a greedy algorithm; if a problem lacks this, the greedy approach is merely guessing.',
    '**Optimal substructure** — A characteristic where an optimal solution to the whole problem is built strictly out of optimal solutions to its smaller subproblems. It exists It is the secondary prerequisite, guaranteeing that after making one greedy choice, applying the exact same greedy logic to the remaining data will still work.',
  ],

  checkpoints: ['read-intuition'],
}
