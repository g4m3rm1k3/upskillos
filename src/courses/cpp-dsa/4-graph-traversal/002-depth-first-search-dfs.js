// cpp-dsa — Lesson 15: Depth-First Search (DFS)
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 15 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-15-depth-first-search-dfs',
  slug: 'depth-first-search-dfs',
  chapter: 4,
  order: 2,
  title: 'Depth-First Search (DFS)',
  subtitle: 'Graph Traversal',
  tags: ['depth-first-search-dfs', 'backtracking', 'visited-set', 'cycle-detection', 'topological-sort'],

  hook: {
    question: 'What is "Depth-First Search (DFS)", and why does it matter?',
    realWorldContext: 'You will write graph traversal algorithms that explore as far down a specific path as possible before backtracking. These programs demonstrate how to traverse and analyze network structures recursively and iteratively. The transferable problem this solves is finding deep paths, detecting structural loops (cycles), and resolving dependency orders (topological sort) in arbitrary graphs.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: Recursive DFS and the Visited Set, Iterative DFS, Cycle Detection, Topological Sort.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Depth-First Search (DFS):** A graph traversal strategy that follows a single path to its very end before turning back to try alternatives. It exists To fully explore deep branches or validate complete paths (like solving a maze) without needing to hold all shallow neighbors in memory simultaneously.\n- **Backtracking:** Returning to a previous node after exploring all of its outgoing paths. It exists To resume exploring alternative branches that were left behind when diving deep into the first available path.\n- **Visited set:** A collection tracking nodes that have already been explored. It exists To prevent infinite loops when traversing graphs that contain cycles or redundant paths.\n- **Cycle detection:** The process of finding a path that loops back to a node currently being actively explored. It exists To identify circular dependencies or infinite loops in a network.\n- **Topological sort:** A linear ordering of vertices such that for every directed edge from node A to node B, A comes before B. It exists To schedule tasks, compile code, or resolve dependencies where certain steps must rigidly happen before others.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::reverse:** An algorithm that reverses the order of elements in a range.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'In this lesson, you observed how exploring graphs to their absolute limits uncovers powerful properties. Depth-First Search relies on memory—either the system Call Stack or a heap-allocated `std::stack`—to implicitly track where it needs to return once a path exhausts itself. By simply repositioning where you execute code (before the loop for visitation, inside the loop for cycle checking, or after the loop for topological sorting), you transformed a basic traversal into three entirely different architectural algorithms.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you omit the visited check in a graph with cycles, your program will crash instantly. Remove the `visited` logic from the iterative DFS: \n\n```cpp\n// Remove this if block:\n// if (!visited.count(node))\n```\n\nRun it on a graph with a loop (`0 -> 1 -> 0`). The stack will continuously push `0`, pop it, push `1`, pop it, push `0`, forever. The program will hang consuming CPU resources infinitely, or if running the recursive version, terminate forcefully due to a `Segmentation fault (core dumped)` as the call stack overflows.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Count the Islands:** Write a program that iterates over a grid (represented as an adjacency list of connected land plots). Use DFS to count how many distinct "islands" exist. Every time you trigger DFS from `main`, increment an island counter.\n- **Path Finder:** Modify the recursive DFS to return a `bool`. If the search finds a target node, return `true` immediately without exploring further. This demonstrates searching for existence rather than exhausting the graph.\n- **Safe Topo Sort:** Combine the concepts. Modify `dfsTopo` to include the `state` vector logic from Cycle Detection. If a cycle is detected during topological sort, throw an error instead of producing an invalid execution order.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and executed both recursive and iterative DFS.\n- [ ] You have observed a cycle being accurately detected using three-state tracking.\n- [ ] You have generated a topological order using post-order DFS and `std::reverse`.\n- [ ] You can explain why DFS topological sort appends elements *after* the neighbor loop.\n- [ ] You understand why iterative DFS uses a LIFO stack to mirror recursion.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 15: Depth-First Search (DFS)',
        caption: 'Depth-First Search (DFS)',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Recursive DFS and the Visited Set',
              prose: [
                'When navigating a graph, you often need to explore a branch to its absolute completion before looking at sibling branches. If the graph contains cycles or converging paths, blindly following edges will trap the program in an infinite loop. You need a mechanism that drives the traversal deep while explicitly ignoring nodes it has already seen.',
                '## How the Code Works',
                '- `void dfsRecursive(...)`: Defines the recursive function taking the current `node`, the adjacency list `graph`, and a reference to the `visited` set. Passing the set by reference ensures all recursive calls share the same memory.\n- `if (visited.count(node)) return;`: The base case for redundant paths. If the node is already in the set, the function immediately stops and backtracks, preventing infinite loops.\n- `std::cout << "Visiting: " << node << "\\n";`: Processes the node immediately upon entry.\n- `visited.insert(node);`: Marks the node as seen so future branches that also link to this node will not re-enter it.\n- `for (int neighbor : graph[node])`: Iterates over every outgoing edge from the current node.\n- `dfsRecursive(neighbor, graph, visited);`: Recursively dives into the neighbor. It will explore this neighbor to its absolute completion before moving to the next neighbor in the loop.',
                '**CS lens.** This is Depth-First Search implemented via recursion. It relies entirely on the system\'s Call Stack. Each recursive call suspends the current node\'s iteration, pushes a new frame onto the stack, and dives into the child. Only when a path hits a dead end (a node with no unvisited neighbors) does the function return, popping the frame and resuming the parent\'s loop—this automatic resumption is backtracking. Also recognized in: maze solving algorithms, abstract syntax tree traversal, and garbage collection tracing.',
                '**SE lens.** The alternative not chosen is BFS using a queue. The tradeoff here is memory shape. DFS uses memory proportional to the maximum depth of the graph (the height of the recursion tree), while BFS uses memory proportional to the widest layer. If the graph is extremely deep, recursive DFS risks a stack overflow crash because the system call stack has a hard size limit.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <unordered_set>\n\nvoid dfsRecursive(int node, const std::vector<std::vector<int>>& graph, std::unordered_set<int>& visited) {\n    if (visited.count(node)) return;\n    \n    std::cout << "Visiting: " << node << "\\n";\n    visited.insert(node);\n    \n    for (int neighbor : graph[node]) {\n        dfsRecursive(neighbor, graph, visited);\n    }\n}\n\nint main() {\n    std::vector<std::vector<int>> graph = {\n        {1, 2},    // Node 0 connects to 1, 2\n        {3, 4},    // Node 1 connects to 3, 4\n        {4},       // Node 2 connects to 4\n        {},        // Node 3 has no outgoing edges\n        {}         // Node 4 has no outgoing edges\n    };\n    \n    std::unordered_set<int> visited;\n    dfsRecursive(0, graph, visited);\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Iterative DFS',
              prose: [
                'Recursive DFS is elegant, but system call stacks are limited. A deeply nested graph (e.g., 100,000 nodes in a straight line) will cause a stack overflow and crash your program. You need a way to perform the exact same deep traversal using heap memory instead of the call stack.',
                '## How the Code Works',
                '- `#include <stack>`: Brings in the definition for the Last-In-First-Out `std::stack` container.\n- `s.push(0);`: Seeds the stack with the starting node.\n- `while (!s.empty())`: Continues processing as long as there are discovered nodes left to explore.\n- `int node = s.top(); s.pop();`: Retrieves the most recently added node and removes it from the stack. LIFO behavior means we always dig into the newest path discovered, creating the depth-first effect.\n- `if (!visited.count(node))`: Because a node might be pushed to the stack multiple times via different paths before it is visited, we check its visited status right after popping it, not before pushing it.\n- `auto it = graph[node].rbegin(); it != graph[node].rend(); ++it`: Iterates backward through the adjacency list. By pushing neighbors onto the stack in reverse order, the very first neighbor gets popped and processed first, perfectly mirroring the left-to-right order of the recursive version.',
                '**CS lens.** This is an iterative formulation of DFS. By manually managing a `std::stack` allocated on the heap, you bypass the operating system\'s strict call stack limits. The algorithm remains identical in time complexity, but you gain the capacity to search massively deep graphs safely.',
                '**SE lens.** The alternative not chosen is keeping the recursive approach. The tradeoff is boilerplate and readability versus safety. Recursive DFS is fewer lines of code and often easier to read, but iterative DFS is industrial-grade: it will not crash on worst-case deep inputs.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <unordered_set>\n#include <stack>\n\nint main() {\n    std::vector<std::vector<int>> graph = {\n        {1, 2},\n        {3, 4},\n        {4},\n        {},\n        {}\n    };\n    \n    std::stack<int> s;\n    std::unordered_set<int> visited;\n    \n    s.push(0);\n    \n    while (!s.empty()) {\n        int node = s.top();\n        s.pop();\n        \n        if (!visited.count(node)) {\n            std::cout << "Visiting: " << node << "\\n";\n            visited.insert(node);\n            \n            for (auto it = graph[node].rbegin(); it != graph[node].rend(); ++it) {\n                if (!visited.count(*it)) {\n                    s.push(*it);\n                }\n            }\n        }\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Cycle Detection',
              prose: [
                'A standard `visited` set stops infinite loops, but it only tells you if a node was seen *at any point in the past*. Sometimes you need to know if the graph contains a structural loop (a cycle). If you hit an already-visited node, is it just a converging path, or is it a back-link creating an inescapable circle? You need to track the active path currently being explored.',
                '## How the Code Works',
                '- `std::vector<int> state(graph.size(), 0);`: Instead of a boolean `visited` set, we use an array representing three distinct states for each node: `0` (unvisited), `1` (currently visiting in the active path), and `2` (fully processed and exited).\n- `if (state[node] == 1) return true;`: If we encounter a node with state `1`, it means we are currently still inside its recursive call stack. Finding it again proves there is a loop.\n- `if (state[node] == 2) return false;`: If we hit state `2`, we reached this node via a different path entirely, but it led to no cycles, so it is safe.\n- `state[node] = 1;`: Marks the node as actively being explored.\n- `if (hasCycle(neighbor, graph, state)) return true;`: Recursively explores neighbors. If any neighbor reports a cycle, the `true` bubbles all the way up immediately.\n- `state[node] = 2;`: After the loop finishes, all descendant paths have been validated. We explicitly mark this node as fully processed, removing it from the "active" path.',
                '**CS lens.** This is Cycle Detection in a directed graph using graph coloring (White=0, Gray=1, Black=2). A cycle specifically requires a "back-edge"—an edge pointing back to an ancestor currently on the traversal stack. By keeping nodes "Gray" only while their stack frame is alive, we isolate back-edges from harmless cross-edges.',
                '**SE lens.** The alternative not chosen is tracking an active path using a hash set that inserts on entry and deletes on exit. The tradeoff is performance. While a hash set works, managing states `0`, `1`, and `2` in a flat vector guarantees constant-time `O(1)` state updates and checks without hashing overhead, drastically improving speed on large graphs.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nbool hasCycle(int node, const std::vector<std::vector<int>>& graph, std::vector<int>& state) {\n    if (state[node] == 1) return true;  \n    if (state[node] == 2) return false; \n    \n    state[node] = 1; \n    \n    for (int neighbor : graph[node]) {\n        if (hasCycle(neighbor, graph, state)) {\n            return true;\n        }\n    }\n    \n    state[node] = 2; \n    return false;\n}\n\nint main() {\n    std::vector<std::vector<int>> graph = {\n        {1},       // 0 -> 1\n        {2},       // 1 -> 2\n        {0}        // 2 -> 0 (Cycle!)\n    };\n    \n    std::vector<int> state(graph.size(), 0);\n    \n    if (hasCycle(0, graph, state)) {\n        std::cout << "Cycle detected!\\n";\n    } else {\n        std::cout << "No cycle found.\\n";\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Topological Sort',
              prose: [
                'When items depend on each other—like compiling C++ files where `B` includes `A`, or task scheduling where framing a house must finish before roofing begins—you must compute a valid linear execution order. You need an algorithm that processes a graph and guarantees that no item is output until all of its dependencies have been handled.',
                '## How the Code Works',
                '- `void dfsTopo(...)`: A standard recursive DFS, heavily augmented by an `order` vector passed by reference.\n- `order.push_back(node);`: This is placed *after* the `for` loop finishes. The crucial guarantee of DFS is that when the `for` loop ends, all possible descendants of `node` have already been fully processed. This is a post-order traversal.\n- `for (int i = 0; i < graph.size(); ++i)`: A graph might be disconnected (e.g., disjoint islands of tasks). This loop ensures that every node in the graph is visited, even if node 0 didn\'t connect to everything.\n- `std::reverse(order.begin(), order.end());`: Because nodes are pushed to `order` exactly when they have *nothing left to do*, the node with no outgoing edges at all gets added first. To get the order of execution from start to finish, the entire sequence is reversed at the very end.',
                '**CS lens.** This is Topological Sort. It relies heavily on post-order DFS. Because DFS naturally hits the absolute bottom of a path before bouncing back, appending to a list at the moment of bouncing back records the deepest, most dependent tasks first. Reversing that list gives you the perfectly sorted dependency chain. Also recognized in: package managers resolving installs, build systems like `make` or `cmake`, and spreadsheet cell updates.',
                '**SE lens.** The alternative not chosen is Kahn’s Algorithm (an iterative BFS-like approach tracking incoming edge counts). The tradeoff is structure. DFS-based topological sort is incredibly concise and easy to write, but it requires reversing the output array at the end and silently ignores cycles if you forget to add cycle-detection logic. Kahn\'s Algorithm explicitly fails if a cycle is present, making it generally safer for critical build tools.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <unordered_set>\n#include <algorithm>\n\nvoid dfsTopo(int node, const std::vector<std::vector<int>>& graph, std::unordered_set<int>& visited, std::vector<int>& order) {\n    if (visited.count(node)) return;\n    visited.insert(node);\n    \n    for (int neighbor : graph[node]) {\n        dfsTopo(neighbor, graph, visited, order);\n    }\n    \n    order.push_back(node);\n}\n\nint main() {\n    std::vector<std::vector<int>> graph = {\n        {1, 2},    // Task 0 must happen before Task 1, 2\n        {3},       // Task 1 must happen before Task 3\n        {3},       // Task 2 must happen before Task 3\n        {}         // Task 3 has no dependents\n    };\n    \n    std::unordered_set<int> visited;\n    std::vector<int> order;\n    \n    for (int i = 0; i < graph.size(); ++i) {\n        dfsTopo(i, graph, visited, order);\n    }\n    \n    std::reverse(order.begin(), order.end());\n    \n    std::cout << "Execution Order: ";\n    for (int task : order) {\n        std::cout << task << " ";\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
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
      'Next lesson: Bubble Sort and Insertion Sort.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Backtracking"?',
      options: [
        'Returning to a previous node after exploring all of its outgoing paths. It exists To resume exploring alternative branches that were left behind when diving deep into the first available path.',
        'A linear ordering of vertices such that for every directed edge from node A to node B, A comes before B. It exists To schedule tasks, compile code, or resolve dependencies where certain steps must rigidly happen before others.',
        'A graph traversal strategy that follows a single path to its very end before turning back to try alternatives. It exists To fully explore deep branches or validate complete paths (like solving a maze) without needing to hold all shallow neighbors in memory simultaneously.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Visited set"?',
      options: [
        'The process of finding a path that loops back to a node currently being actively explored. It exists To identify circular dependencies or infinite loops in a network.',
        'A collection tracking nodes that have already been explored. It exists To prevent infinite loops when traversing graphs that contain cycles or redundant paths.',
        'A graph traversal strategy that follows a single path to its very end before turning back to try alternatives. It exists To fully explore deep branches or validate complete paths (like solving a maze) without needing to hold all shallow neighbors in memory simultaneously.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Cycle detection"?',
      options: [
        'The process of finding a path that loops back to a node currently being actively explored. It exists To identify circular dependencies or infinite loops in a network.',
        'A collection tracking nodes that have already been explored. It exists To prevent infinite loops when traversing graphs that contain cycles or redundant paths.',
        'A graph traversal strategy that follows a single path to its very end before turning back to try alternatives. It exists To fully explore deep branches or validate complete paths (like solving a maze) without needing to hold all shallow neighbors in memory simultaneously.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Topological sort"?',
      options: [
        'A linear ordering of vertices such that for every directed edge from node A to node B, A comes before B. It exists To schedule tasks, compile code, or resolve dependencies where certain steps must rigidly happen before others.',
        'A graph traversal strategy that follows a single path to its very end before turning back to try alternatives. It exists To fully explore deep branches or validate complete paths (like solving a maze) without needing to hold all shallow neighbors in memory simultaneously.',
        'The process of finding a path that loops back to a node currently being actively explored. It exists To identify circular dependencies or infinite loops in a network.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Depth-First Search (DFS)** — A graph traversal strategy that follows a single path to its very end before turning back to try alternatives. It exists To fully explore deep branches or validate complete paths (like solving a maze) without needing to hold all shallow neighbors in memory simultaneously.',
    '**Backtracking** — Returning to a previous node after exploring all of its outgoing paths. It exists To resume exploring alternative branches that were left behind when diving deep into the first available path.',
    '**Visited set** — A collection tracking nodes that have already been explored. It exists To prevent infinite loops when traversing graphs that contain cycles or redundant paths.',
    '**Cycle detection** — The process of finding a path that loops back to a node currently being actively explored. It exists To identify circular dependencies or infinite loops in a network.',
    '**Topological sort** — A linear ordering of vertices such that for every directed edge from node A to node B, A comes before B. It exists To schedule tasks, compile code, or resolve dependencies where certain steps must rigidly happen before others.',
  ],

  checkpoints: ['read-intuition'],
}
