// cpp-dsa — Lesson 14: Breadth-First Search (BFS)
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 14 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-14-breadth-first-search-bfs',
  slug: 'breadth-first-search-bfs',
  chapter: 4,
  order: 1,
  title: 'Breadth-First Search (BFS)',
  subtitle: 'Graph Traversal',
  tags: ['breadth-first-search-bfs', 'level-order-exploration', 'visited-set', 'bfs-tree'],

  hook: {
    question: 'What is "Breadth-First Search (BFS)", and why does it matter?',
    realWorldContext: 'You will write isolated console programs that traverse graphs radiating outward level by level. These programs demonstrate how to explore a network, guarantee you don\'t get trapped in cycles, and find the absolute shortest path between two points in an unweighted graph. The transferable problem this solves is finding optimal routes and exploring states evenly without diving blindly down dead ends.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: Level-Order Exploration (The Queue Mechanism), The Visited Set (Avoiding Cycles), Shortest Path in an Unweighted Graph, The BFS Tree (Path Reconstruction).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Breadth-First Search (BFS):** An algorithm that explores a graph level by level, visiting all immediate neighbors of a node before moving deeper. It exists To guarantee that the first time you reach a node, you have found the shortest possible path to it in an unweighted graph.\n- **Level-order exploration:** Processing nodes in waves, grouped by their distance from the starting point. It exists To ensure uniform outward expansion, preventing the search from committing to a long path before checking adjacent options.\n- **Visited set:** A collection tracking which nodes have already been added to the queue. It exists To prevent infinite loops when a graph contains cycles, ensuring each node is processed exactly once.\n- **BFS Tree:** A structural byproduct of a BFS traversal, recording the single path used to discover each node. It exists To allow tracing the exact sequence of steps backward from a destination to the start.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::reverse:** A standard library algorithm that flips the order of elements in a range.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how the algorithm evolved from a naive expansion into a robust routing tool. A bare `std::queue` enforced the level-order traversal, expanding equally in all directions. Adding a `visited` check—whether using a `std::unordered_set`, or doubling up a `distance` or `parent` array for the job—safely cut through cycles and prevented infinite loops. Finally, recording the step count or the parent ID during that expansion provided the exact shortest path through the network. The identical queue loop sits at the center of all these features.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you omit the visited check entirely, a graph with a single cycle will freeze your program. Modify `bfs_path.cpp` and comment out the `if (parent[neighbor] == -1)` check, allowing unconditional pushing: \n\n```cpp\n// if (parent[neighbor] == -1) {\n    parent[neighbor] = current;\n    frontier.push(neighbor);\n// }\n```\n\nIf the graph contains a cycle (like `0 -> 1 -> 0`), the queue will endlessly enqueue `1`, then `0`, then `1`. The `while (!frontier.empty())` loop will never terminate, maxing out a CPU core and eventually crashing with an Out of Memory error when the queue grows too large. The visited check is the only thing standing between BFS and infinite recursion.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Disconnected Graph:** Modify `bfs_distance.cpp` to print a message if a node is completely unreachable (its distance remains `-1` after the BFS completes).\n- **Path to Anywhere:** Move the path reconstruction logic from `bfs_path.cpp` into a dedicated function `std::vector<int> getPath(const std::vector<int>& parent, int target)` that you can call for any target node, not just Node 4.\n- **Implicit Graph BFS:** Imagine a chess knight on a grid. You don\'t need a `std::vector<std::vector<int>>` graph. Write a BFS where the `for (int neighbor : graph[current])` loop is replaced by generating the 8 valid knight moves on the fly, tracking the shortest number of jumps to a destination square.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run a standard BFS using `std::queue`.\n- [ ] You have observed how a visited set or array prevents infinite cycles.\n- [ ] You have run a BFS that computes the shortest path distance to every node.\n- [ ] You have reconstructed a step-by-step shortest path using a parent array.\n- [ ] You can explain out loud why a queue produces a breadth-first expansion instead of a depth-first one.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 14: Breadth-First Search (BFS)',
        caption: 'Breadth-First Search (BFS)',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Level-Order Exploration (The Queue Mechanism)',
              prose: [
                'How do you explore a graph by expanding outward evenly? Recursion naturally dives deep, pursuing one path to its absolute end before checking alternative branches. If you want to process all immediate neighbors before looking at their neighbors, you need a mechanism that forces a "first discovered, first processed" ordering.',
                '## How the Code Works',
                '- `#include <queue>`: Instructs the compiler to include the definition for the `std::queue` container adapter, which provides strict First-In-First-Out semantics.\n- `std::vector<std::vector<int>> graph`: Defines the graph as an adjacency list. The outer vector represents the nodes, and each inner vector holds the outgoing edges for that specific node.\n- `std::queue<int> frontier`: Instantiates a queue of integers. The name "frontier" reflects its purpose: it holds the boundary of our exploration, the nodes we have discovered but not yet processed.\n- `frontier.push(0)`: Enqueues the starting node (`0`). The loop requires at least one item to begin.\n- `while (!frontier.empty())`: The loop condition. It continues as long as there are discovered nodes waiting to be processed.\n- `int current = frontier.front()`: Retrieves the value at the front of the queue without removing it. Because it is a queue, this is guaranteed to be the oldest discovered node.\n- `frontier.pop()`: Removes the front element from the queue. `front()` and `pop()` are deliberately separate methods in C++ to guarantee exception safety.\n- `std::cout << "Visiting node " << current << "\\n"`: Prints the node, proving the exact order in which the algorithm processes them.\n- `for (int neighbor : graph[current])`: A range-based for loop traversing the inner vector. It iterates over every outgoing edge from the `current` node.\n- `frontier.push(neighbor)`: Adds each discovered neighbor to the back of the queue. They will wait their turn until all previously discovered nodes are processed.\nExecution trace for the queue:\n- `push(0)` — Queue holds `[0]`.\n- `current = 0`, `pop()` — Queue is empty. We push `1` and `2`. Queue holds `[1, 2]`.\n- `current = 1`, `pop()` — Queue holds `[2]`. We push `3`. Queue holds `[2, 3]`.\n- `current = 2`, `pop()` — Queue holds `[3]`. We push `3`. Queue holds `[3, 3]`.\n- `current = 3`, `pop()` — Queue holds `[3]`. Node 3 has no neighbors.\n- `current = 3`, `pop()` — Queue is empty. Loop ends.',
                '**CS lens.** This is **Breadth-First Search (BFS)**. By using a FIFO queue, we enforce a strict level-order traversal. All nodes at distance 1 are queued behind the start node. All nodes at distance 2 are queued behind the distance 1 nodes. Also recognized in: peer-to-peer network broadcasting, web crawlers mapping domains, garbage collection algorithms.',
                '**SE lens.** The alternative not chosen is using a `std::stack` (LIFO). If you swap the queue for a stack, the algorithm immediately becomes Depth-First Search (DFS), diving down the most recently discovered path instead of the oldest. The tradeoff is memory shape: BFS must hold the entire width of the current level in memory, which for a dense graph can be significantly larger than the single deep path DFS holds.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <queue>\n\nint main() {\n    // Adjacency list for a Directed Acyclic Graph (DAG)\n    std::vector<std::vector<int>> graph = {\n        {1, 2},    // Node 0 points to 1, 2\n        {3},       // Node 1 points to 3\n        {3},       // Node 2 points to 3\n        {}         // Node 3 has no outgoing edges\n    };\n\n    std::queue<int> frontier;\n    frontier.push(0);\n\n    while (!frontier.empty()) {\n        int current = frontier.front();\n        frontier.pop();\n\n        std::cout << "Visiting node " << current << "\\n";\n\n        for (int neighbor : graph[current]) {\n            frontier.push(neighbor);\n        }\n    }\n\n    return 0;\n}',
              expectedOutput: 'Visiting node 0\nVisiting node 1\nVisiting node 2\nVisiting node 3\nVisiting node 3',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Visited Set (Avoiding Cycles)',
              prose: [
                'In the previous example, Node 3 was processed twice because both Node 1 and Node 2 pointed to it. If our graph had a cycle—Node 3 pointing back to Node 0—the queue would never empty. The loop would enqueue 0, 1, 2, 3, 0, 1, 2, 3 forever. You need a mechanism to remember which nodes have already been discovered so they are processed exactly once.',
                '## How the Code Works',
                '- `#include <unordered_set>`: Instructs the compiler to include the hash-based set container.\n- `std::vector<std::vector<int>> graph`: The adjacency list now contains a cycle. Node 2 points back to Node 0.\n- `std::unordered_set<int> visited`: Instantiates a collection that will hold only unique integers, storing the IDs of nodes we have already seen.\n- `visited.insert(0)`: Marks the start node as visited immediately. This is critical: nodes must be marked visited *when they are pushed to the queue*, not when they are popped.\n- `if (visited.count(neighbor) == 0)`: Calls `count` on the set. Since a set can hold at most one copy of any item, `count` returns `0` if the item is absent and `1` if it is present. This checks if we have already discovered this neighbor.\n- `visited.insert(neighbor)`: Adds the neighbor to the visited set. Because this happens inside the `if` block, we guarantee no node is ever pushed into the queue twice.\n- `frontier.push(neighbor)`: Enqueues the neighbor only because it passed the visited check.\nExecution trace for the cycle prevention:\n- Node 2 is popped. Its neighbors are `0` and `3`.\n- Evaluates `visited.count(0)`. Because Node 0 was inserted at the very beginning, this returns `1`.\n- The `if` condition fails. Node 0 is ignored, breaking the infinite cycle.\n- Evaluates `visited.count(3)`. Returns `0`. Node 3 is marked visited and pushed to the queue.',
                '**CS lens.** This combination of a queue and a visited set forms the complete, standard **Breadth-First Search** algorithm. The visited set transforms the problem of traversing an arbitrary, potentially cyclic graph into traversing a clean, acyclic tree structure rooted at the start node.',
                '**SE lens.** The alternative not chosen is placing `visited.insert(current)` at the top of the `while` loop, after popping. The tradeoff is efficiency. If you wait until a node is popped to mark it visited, multiple edges pointing to the same undiscovered node will cause it to be pushed into the queue multiple times, wasting memory and queue operations. Marking it visited at the exact moment of discovery prevents this redundant queuing.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <queue>\n#include <unordered_set>\n\nint main() {\n    // Adjacency list for a graph with a cycle: 0 -> 1 -> 2 -> 0\n    std::vector<std::vector<int>> graph = {\n        {1},       // Node 0 points to 1\n        {2},       // Node 1 points to 2\n        {0, 3},    // Node 2 points to 0 (cycle!) and 3\n        {}         // Node 3 points nowhere\n    };\n\n    std::queue<int> frontier;\n    std::unordered_set<int> visited;\n\n    frontier.push(0);\n    visited.insert(0); // Mark as visited the moment it enters the queue\n\n    while (!frontier.empty()) {\n        int current = frontier.front();\n        frontier.pop();\n\n        std::cout << "Visiting node " << current << "\\n";\n\n        for (int neighbor : graph[current]) {\n            if (visited.count(neighbor) == 0) {\n                visited.insert(neighbor);\n                frontier.push(neighbor);\n            }\n        }\n    }\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Shortest Path in an Unweighted Graph',
              prose: [
                'Knowing that we can reach a node is useful, but often we need to know the minimum number of steps required to get there. Because BFS expands in uniform waves, the first time it reaches a node, it has inherently found the shortest path. We need to record this distance as the wave expands.',
                '## How the Code Works',
                '- `std::vector<int> distance`: Instantiates a vector to track the shortest distance from the start node to every other node.\n- `distance.assign(graph.size(), -1)`: Calls the `assign` method on the vector. This resizes the vector to match the total number of nodes in the graph and fills every slot with `-1`. We use `-1` as a sentinel value meaning "unvisited".\n- `distance[0] = 0`: Explicitly sets the distance to the starting node to `0`. It takes zero edges to reach the start from the start. This also implicitly marks Node 0 as visited.\n- `if (distance[neighbor] == -1)`: Checks if the neighbor has been visited yet. By doubling the `distance` array\'s role to also act as our visited check, we eliminate the need for a separate `std::unordered_set`.\n- `distance[neighbor] = distance[current] + 1`: The core distance logic. Because the neighbor is exactly one edge away from `current`, its shortest path distance is exactly one greater than `current`\'s shortest path distance.\n- `frontier.push(neighbor)`: Queues the newly discovered neighbor for later expansion.\nExecution trace for the distance calculation:\n- `current = 0` (distance 0). Neighbors are 1 and 2.\n- `distance[1]` becomes `0 + 1 = 1`. Pushed to queue.\n- `distance[2]` becomes `0 + 1 = 1`. Pushed to queue.\n- `current = 1` (distance 1). Neighbor is 3. `distance[3]` becomes `1 + 1 = 2`. Pushed.\n- `current = 2` (distance 1). Neighbor is 3. `distance[3]` is already `2` (not `-1`), so it is ignored.',
                '**CS lens.** This is the **Single-Source Shortest Path** algorithm for unweighted graphs. Because BFS guarantees that nodes at distance `d` are processed completely before any node at distance `d + 1`, the addition `distance[current] + 1` is mathematically proven to be the absolute minimum edge count. Also recognized in: Six Degrees of Kevin Bacon, routing protocols like RIP, solving unweighted mazes.',
                '**SE lens.** The alternative not chosen is using Dijkstra\'s algorithm with a priority queue. The tradeoff is unnecessary complexity. Dijkstra\'s handles varying edge weights (costs), requiring logarithmic time per queue operation to sort them. When all edges have identical weight (unweighted), the FIFO queue of BFS naturally maintains the sorted order for "free" in constant time. Using Dijkstra\'s on an unweighted graph is a waste of computation.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <queue>\n\nint main() {\n    std::vector<std::vector<int>> graph = {\n        {1, 2},    // 0\n        {3},       // 1\n        {3},       // 2\n        {4},       // 3\n        {}         // 4\n    };\n\n    std::queue<int> frontier;\n    std::vector<int> distance;\n    distance.assign(graph.size(), -1);\n\n    frontier.push(0);\n    distance[0] = 0; // Distance to start node is always 0\n\n    while (!frontier.empty()) {\n        int current = frontier.front();\n        frontier.pop();\n\n        for (int neighbor : graph[current]) {\n            if (distance[neighbor] == -1) {\n                distance[neighbor] = distance[current] + 1;\n                frontier.push(neighbor);\n            }\n        }\n    }\n\n    for (int i = 0; i < distance.size(); ++i) {\n        std::cout << "Distance to " << i << ": " << distance[i] << "\\n";\n    }\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'The BFS Tree (Path Reconstruction)',
              prose: [
                'Knowing the shortest distance is 3 tells you *how long* the path is, but it doesn\'t tell you *what* the path is. If you are writing a pathfinding AI, the character needs the exact sequence of nodes to walk through. You need to record the trail as you explore so you can reconstruct it later.',
                '## How the Code Works',
                '- `#include <algorithm>`: Brings in algorithms like `std::reverse`.\n- `std::vector<int> parent`: Instantiates an array to hold the "parent" of each node—the ID of the node that first discovered it.\n- `parent.assign(graph.size(), -1)`: Fills the array with `-1`, using it as our "unvisited" sentinel value just like we did with the distance array.\n- `parent[0] = -2`: Assigns `-2` to the start node\'s parent. Because the start node wasn\'t discovered by any other node, it has no real parent. We use a distinct negative number so we know exactly when to stop tracing backward.\n- `if (current == 4) break;`: An early exit condition. If our goal is only to reach Node 4, we can stop the search entirely the moment we process it. Exploring the rest of the graph is wasted effort.\n- `parent[neighbor] = current`: The core tree-building logic. When `current` discovers `neighbor`, we record `current` into `neighbor`\'s slot. This leaves a breadcrumb trail pointing back to the start.\n- `std::vector<int> path`: Creates a vector to hold our final reconstructed path.\n- `int backtrack = 4`: Initializes a local variable starting at our destination node.\n- `while (backtrack != -2)`: Loops backward through the `parent` array until it hits the `-2` sentinel we placed at the start node.\n- `path.push_back(backtrack)`: Appends the current node in our backward trace to the path vector.\n- `backtrack = parent[backtrack]`: Overwrites `backtrack` with its own parent, effectively stepping one hop backward toward the start node.\n- `std::reverse(path.begin(), path.end())`: Because we traced backward from destination to start, the vector is reversed. This algorithm flips it in place so it reads start to destination.\nExecution trace for path reconstruction:\n- `backtrack = 4`. Added to path. `parent[4]` is `3`.\n- `backtrack = 3`. Added to path. `parent[3]` is `1` (assuming Node 1 discovered 3 first).\n- `backtrack = 1`. Added to path. `parent[1]` is `0`.\n- `backtrack = 0`. Added to path. `parent[0]` is `-2`. Loop ends.\n- Path vector is `[4, 3, 1, 0]`. Reversed, it becomes `[0, 1, 3, 4]`.',
                '**CS lens.** The `parent` array represents the **BFS Tree** (or Shortest Path Tree). Even if the original graph has thousands of cross-edges and cycles, the edges recorded in the `parent` array form a strict tree with the start node at the root. Every path down this tree is the shortest path to that node.',
                '**SE lens.** The alternative not chosen is storing a `std::vector<int> path` inside every single node or pushing full paths into the queue. The tradeoff is memory consumption. Copying a full vector of history for every step of the search takes massive amounts of memory and `O(N)` time per step. Storing a single integer `parent` per node takes minimal memory and reconstructed the path in `O(N)` time only once at the very end.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <queue>\n#include <algorithm>\n\nint main() {\n    std::vector<std::vector<int>> graph = {\n        {1, 2},    // 0\n        {3},       // 1\n        {3},       // 2\n        {4},       // 3\n        {}         // 4\n    };\n\n    std::queue<int> frontier;\n    std::vector<int> parent;\n    parent.assign(graph.size(), -1);\n\n    frontier.push(0);\n    parent[0] = -2; // Distinct sentinel for the start node\n\n    while (!frontier.empty()) {\n        int current = frontier.front();\n        frontier.pop();\n\n        if (current == 4) break; // Stop early if we found our target\n\n        for (int neighbor : graph[current]) {\n            if (parent[neighbor] == -1) {\n                parent[neighbor] = current;\n                frontier.push(neighbor);\n            }\n        }\n    }\n\n    // Path Reconstruction\n    std::vector<int> path;\n    int backtrack = 4;\n    while (backtrack != -2) {\n        path.push_back(backtrack);\n        backtrack = parent[backtrack];\n    }\n    std::reverse(path.begin(), path.end());\n\n    std::cout << "Shortest path to 4: ";\n    for (int n : path) {\n        std::cout << n << " ";\n    }\n    std::cout << "\\n";\n\n    return 0;\n}',
              expectedOutput: 'Shortest path to 4: 0 1 3 4 ',
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
      'Next lesson: Depth-First Search (DFS).',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Breadth-First Search (BFS)"?',
      options: [
        'A collection tracking which nodes have already been added to the queue. It exists To prevent infinite loops when a graph contains cycles, ensuring each node is processed exactly once.',
        'Processing nodes in waves, grouped by their distance from the starting point. It exists To ensure uniform outward expansion, preventing the search from committing to a long path before checking adjacent options.',
        'An algorithm that explores a graph level by level, visiting all immediate neighbors of a node before moving deeper. It exists To guarantee that the first time you reach a node, you have found the shortest possible path to it in an unweighted graph.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Level-order exploration"?',
      options: [
        'A structural byproduct of a BFS traversal, recording the single path used to discover each node. It exists To allow tracing the exact sequence of steps backward from a destination to the start.',
        'A collection tracking which nodes have already been added to the queue. It exists To prevent infinite loops when a graph contains cycles, ensuring each node is processed exactly once.',
        'Processing nodes in waves, grouped by their distance from the starting point. It exists To ensure uniform outward expansion, preventing the search from committing to a long path before checking adjacent options.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "BFS Tree"?',
      options: [
        'A structural byproduct of a BFS traversal, recording the single path used to discover each node. It exists To allow tracing the exact sequence of steps backward from a destination to the start.',
        'Processing nodes in waves, grouped by their distance from the starting point. It exists To ensure uniform outward expansion, preventing the search from committing to a long path before checking adjacent options.',
        'An algorithm that explores a graph level by level, visiting all immediate neighbors of a node before moving deeper. It exists To guarantee that the first time you reach a node, you have found the shortest possible path to it in an unweighted graph.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Visited set"?',
      options: [
        'Processing nodes in waves, grouped by their distance from the starting point. It exists To ensure uniform outward expansion, preventing the search from committing to a long path before checking adjacent options.',
        'An algorithm that explores a graph level by level, visiting all immediate neighbors of a node before moving deeper. It exists To guarantee that the first time you reach a node, you have found the shortest possible path to it in an unweighted graph.',
        'A collection tracking which nodes have already been added to the queue. It exists To prevent infinite loops when a graph contains cycles, ensuring each node is processed exactly once.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Breadth-First Search (BFS)** — An algorithm that explores a graph level by level, visiting all immediate neighbors of a node before moving deeper. It exists To guarantee that the first time you reach a node, you have found the shortest possible path to it in an unweighted graph.',
    '**Level-order exploration** — Processing nodes in waves, grouped by their distance from the starting point. It exists To ensure uniform outward expansion, preventing the search from committing to a long path before checking adjacent options.',
    '**Visited set** — A collection tracking which nodes have already been added to the queue. It exists To prevent infinite loops when a graph contains cycles, ensuring each node is processed exactly once.',
    '**BFS Tree** — A structural byproduct of a BFS traversal, recording the single path used to discover each node. It exists To allow tracing the exact sequence of steps backward from a destination to the start.',
  ],

  checkpoints: ['read-intuition'],
}
