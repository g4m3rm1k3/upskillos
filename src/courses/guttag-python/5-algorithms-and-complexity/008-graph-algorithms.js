// Guttag — Lesson 36: Graph Algorithms
// Auto-converted from src/docs/tutorials/guttag-python/lesson-36.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-36-graph-algorithms',
  slug: 'graph-algorithms',
  chapter: 5,
  order: 8,
  title: 'Graph Algorithms',
  subtitle: 'DFS and BFS',
  tags: ['graph', 'node-vertex', 'edge', 'adjacency-list', 'depth-first-search-dfs', 'breadth-first-search-bfs'],

  hook: {
    question: 'What is "Graph Algorithms", and why does it matter?',
    realWorldContext: 'The reader understands graphs as adjacency lists, depth-first search (DFS), breadth-first search (BFS), cycle detection, and shortest path (unweighted). The transferable insight: a graph models pairwise relationships. BFS explores layer by layer (finds shortest path in unweighted graphs). DFS explores as far as possible before backtracking (finds paths, detects cycles, topological sort). Every tree is a graph; not every graph is a tree.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Graph representation — adjacency list, Depth-first search (DFS), Breadth-first search (BFS) — shortest path, Cycle detection, Topological sort — DFS on a DAG.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Graph:** a data structure that models pairwise relationships.\n- **Node (Vertex):** an entity in a graph.\n- **Edge:** a connection between two nodes.\n- **Adjacency list:** a way to represent a graph where each node maps to a list of its neighbors.\n- **Depth-first search (DFS):** a graph traversal algorithm that explores as far as possible along each branch before backtracking.\n- **Breadth-first search (BFS):** a graph traversal algorithm that explores the neighbor nodes first, before moving to the next level neighbors.\n- **Cycle detection:** the process of finding if a graph has any cycles (paths that start and end at the same node).\n- **Topological sort:** a linear ordering of vertices such that for every directed edge u->v, vertex u comes before v in the ordering.\n- **Directed Acyclic Graph (DAG):** a directed graph with no directed cycles.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **dict:** A built-in Python dictionary.\n- **list:** A built-in Python list.\n- **set:** A built-in Python set.\n- **collections.deque:** A double-ended queue from the collections module.\n- **deque.append:** Method to add an element to the right side of the deque.\n- **deque.popleft:** Method to remove and return an element from the left side of the deque.\n- **list.append:** Method to add an element to the end of a list.\n- **list.pop:** Method to remove and return an element from the end of a list.\n- **set.add:** Method to add an element to a set.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Graph algorithms unify under the idea of systematic traversal. Whether diving deep with DFS or exploring layers with BFS, the core mechanics rely on marking visited states to avoid loops. Trace BFS finding shortest path A->F in the sample graph through all concepts: - **Unit 1 (Representation)**: The graph is defined as a dictionary `{\'A\':[\'B\',\'C\'], ... \'F\':[\'C\',\'E\']}`. - **Unit 2 (DFS)**: We learned how a `visited` set prevents us from revisiting \'A\' when we look at \'B\'. - **Unit 3 (BFS)**: `bfs_shortest_path` begins with a queue containing `[[A]]`. - Pop `[A]`. Node \'A\' is not \'F\'. Neighbors are \'B\' and \'C\'. New paths `[A, B]` and `[A, C]` are enqueued. - Queue is `[[A, B], [A, C]]`. Pop `[A, B]`. Node \'B\' is not \'F\'. Neighbors \'D\', \'E\'. New paths `[A, B, D]` and `[A, B, E]`. - Queue is `[[A, C], [A, B, D], [A, B, E]]`. Pop `[A, C]`. Node \'C\' is not \'F\'. Neighbor \'F\' (because \'A\' is visited). New path `[A, C, F]`. - Queue is `[[A, B, D], [A, B, E], [A, C, F]]`. - Pop `[A, B, D]`. Skip \'D\'. Pop `[A, B, E]`. Skip \'E\'. - Pop `[A, C, F]`. The last node is \'F\'. We found the destination! - Return `[\'A\', \'C\', \'F\']`. The shortest path length is guaranteed because BFS checks all length-1 paths, then length-2 paths, in strict order. - **Unit 4 (Cycle detection)**: We see that ignoring the \'visited\' check would cause BFS to loop indefinitely between \'A\' and \'C\'. - **Unit 5 (Topo Sort)**: While topo sort uses DFS, BFS pathfinding similarly requires understanding how nodes flow directionally (or bidirectionally) to resolve the correct sequence of steps.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 36: Graph Algorithms',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Graph Algorithms',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Graph representation — adjacency list',
              prose: [
                'How can we represent arbitrary connections between different objects in Python, where one object can connect to multiple others, and relationships might be mutual or one-way? - What data structure naturally maps a unique key to a collection of related items? - How would you distinguish between a two-way street and a one-way street using this structure?',
                'Output: ``` [\'B\', \'C\'] ``` This proves that mapping a node to a list of its neighbors allows O(1) amortized access to all outgoing edges from any given node.'
              ],
              typeIt: true,
              solution: 'isolated_graph = {\n    \'A\': [\'B\', \'C\'],\n    \'B\': [\'A\']\n}\nprint(isolated_graph[\'A\'])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Graph representation — adjacency list — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `graph = { ... }`: Creates a dictionary instance representing the graph.\n- `\'A\': [\'B\', \'C\']`: A key-value pair where the key `\'A\'` (a string) is a node, and the value `[\'B\', \'C\']` (a list) contains its neighbors.\n- `digraph = { ... }`: Creates a second dictionary for a directed graph.\n- `\'F\': []`: In the directed graph, node `\'F\'` has no outgoing edges, so its neighbor list is empty.',
                '**Expected behavior.** Predicted confidently: ``` Nodes: [\'A\', \'B\', \'C\', \'D\', \'E\', \'F\'] A\'s neighbors: [\'B\', \'C\'] Edges: 6 ``` Checking neighbors of A: O(degree(A)) = O(1) amortized. Adding edge: O(1). Checking if edge (u,v) exists: O(degree(u)).',
                '**CS lens.** **Adjacency List** is a fundamental CS data structure for sparse graphs. It appears in: 1. Social networks (friends lists). 2. Web crawling (links between pages). 3. Package managers (dependencies).',
                '**SE lens.** **Data-driven design**. By separating the graph structure into a simple data definition (a dictionary of lists) rather than creating complex `Node` and `Edge` objects, we reduce memory overhead and make the data easy to serialize (e.g., to JSON) or traverse using standard Python idioms. The alternative of rich node objects is harder to construct and traverse safely.'
              ],
              typeIt: true,
              solution: '# Undirected graph:\ngraph = {\n    \'A\': [\'B\', \'C\'],\n    \'B\': [\'A\', \'D\', \'E\'],\n    \'C\': [\'A\', \'F\'],\n    \'D\': [\'B\'],\n    \'E\': [\'B\', \'F\'],\n    \'F\': [\'C\', \'E\'],\n}\n\n# Directed graph:\ndigraph = {\n    \'A\': [\'B\', \'C\'],\n    \'B\': [\'D\'],\n    \'C\': [\'D\', \'E\'],\n    \'D\': [\'F\'],\n    \'E\': [\'F\'],\n    \'F\': [],\n}',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Depth-first search (DFS)',
              prose: [
                'If we start at node \'A\', how do we visit every connected node exactly once, exploring as deeply as possible before looking at alternative paths? - What happens if we visit a node that links back to \'A\'? - How do we remember where we\'ve been?',
                'Output: ``` True ``` This proves that a set provides a fast O(1) way to check if we\'ve already processed a specific node.'
              ],
              typeIt: true,
              solution: 'visited = set()\nvisited.add(\'A\')\nprint(\'A\' in visited)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Depth-first search (DFS) — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def dfs(graph, start, visited=None):`: Defines a function taking the graph, start node, and an optional visited set.\n- `if visited is None: visited = set()`: Initializes the visited set on the first call.\n- `visited.add(start)`: Marks the current node as visited.\n- `print(start, end=\' \')`: Outputs the node.\n- `for neighbor in graph[start]:`: Iterates over the neighbors of the current node.\n- `if neighbor not in visited:`: Checks if the neighbor has already been processed.\n- `dfs(graph, neighbor, visited)`: Recursively calls DFS on the unvisited neighbor.\n- `def dfs_iterative(graph, start):`: Defines the iterative version.\n- `stack = [start]`: Uses a list as a stack (LIFO) to track nodes to visit.\n- `node = stack.pop()`: Removes and returns the last element added to the stack.\n- `stack.append(neighbor)`: Adds unvisited neighbors to the stack to be processed deeply.',
                '**Expected behavior.** Predicted confidently: ``` DFS from A: A B D E F C DFS iterative: [\'A\', \'C\', \'F\', \'E\', \'B\', \'D\'] ``` Trace dfs(graph, \'A\'): visited={A}. Neighbors: B,C. B not visited: dfs(graph,\'B\'). visited={A,B}. Neighbors: A,D,E. A visited. D not visited: dfs(\'D\'). visited={A,B,D}. D\'s neighbors: B. B visited. Return. E not visited: dfs(\'E\'). visited={A,B,D,E}. E\'s neighbors: B(visited), F. dfs(\'F\'): visited={A,B,D,E,F}. F\'s neighbors: C,E. dfs(\'C\'). Print order: A B D E F C.',
                '**CS lens.** **Depth-First Search (DFS)** is a fundamental graph traversal algorithm. It appears in: 1. Solving mazes. 2. Topological sorting. 3. Finding connected components.',
                '**SE lens.** **Default mutable arguments pitfall**. We use `visited=None` instead of `visited=set()` in the function signature because default arguments in Python are evaluated once at function definition time. If we used a mutable default like a set, subsequent calls to `dfs` would unexpectedly share the same visited set, causing incorrect behavior.'
              ],
              typeIt: true,
              solution: 'def dfs(graph, start, visited=None):\n    if visited is None:\n        visited = set()\n    visited.add(start)\n    print(start, end=\' \')\n    for neighbor in graph[start]:\n        if neighbor not in visited:\n            dfs(graph, neighbor, visited)\n    return visited\n\ndef dfs_iterative(graph, start):\n    visited = set()\n    stack = [start]\n    order = []\n    while stack:\n        node = stack.pop()\n        if node not in visited:\n            visited.add(node)\n            order.append(node)\n            for neighbor in graph[node]:\n                if neighbor not in visited:\n                    stack.append(neighbor)\n    return order',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Breadth-first search (BFS) — shortest path',
              prose: [
                'If we want to find the shortest path from \'A\' to \'F\', DFS might take a long winding route. How can we explore all neighbors 1 step away, then 2 steps away, etc.? - What data structure lets us process nodes in the exact order they were discovered?',
                'Output: ``` A ``` This proves that `deque` allows O(1) removals from the left side, giving us First-In-First-Out behavior.'
              ],
              typeIt: true,
              solution: 'from collections import deque\nqueue = deque([\'A\'])\nqueue.append(\'B\')\nprint(queue.popleft())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Breadth-first search (BFS) — shortest path — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from collections import deque`: Imports the double-ended queue.\n- `visited = {start}`: Initializes a set with the start node using set literal syntax.\n- `queue = deque([start])`: Initializes the queue with the start node.\n- `node = queue.popleft()`: Removes and returns the oldest node in the queue (FIFO).\n- `queue = deque([[start]])`: In the shortest path version, the queue holds *paths* (lists of nodes), initialized with a path containing just the start node.\n- `path = queue.popleft()`: Removes the oldest path.\n- `node = path[-1]`: Gets the last node in the current path.\n- `queue.append(path + [neighbor])`: Creates a new list by concatenating the current path with the new neighbor, enqueuing the longer path.',
                '**Expected behavior.** Predicted confidently: ``` BFS: [\'A\', \'B\', \'C\', \'D\', \'E\', \'F\'] Path A->F: [\'A\', \'C\', \'F\'] ``` Trace bfs_shortest_path(graph,\'A\',\'F\'): queue=[[A]]. Pop [A]: node=A, not F. Neighbors B,C. queue=[[A,B],[A,C]]. Pop [A,B]: node=B. Neighbors D,E. queue=[[A,C],[A,B,D],[A,B,E]]. Pop [A,C]: node=C, not F. Neighbor F. queue=[[A,B,D],[A,B,E],[A,C,F]]. Pop [A,B,D]: D, not F. etc. Eventually pop [A,C,F]: node=F==end. Return [A,C,F]. Length 3 -> 2 edges: shortest path.',
                '**CS lens.** **Breadth-First Search (BFS)** is the optimal algorithm for finding the shortest path in unweighted graphs. It appears in: 1. Peer-to-peer network routing. 2. Search engine crawlers finding pages close to a seed URL. 3. Garbage collection algorithms tracing live objects layer by layer.',
                '**SE lens.** **Algorithmic selection based on constraints**. We chose BFS here because all edges have equal weight (unweighted). If edges had different weights (like distances or times), BFS would fail to find the shortest path, and we would need a priority queue (Dijkstra\'s algorithm) instead.'
              ],
              typeIt: true,
              solution: 'from collections import deque\n\ndef bfs(graph, start):\n    visited = {start}\n    queue = deque([start])\n    order = []\n    while queue:\n        node = queue.popleft()\n        order.append(node)\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)\n    return order\n\ndef bfs_shortest_path(graph, start, end):\n    visited = {start}\n    queue = deque([[start]])\n    while queue:\n        path = queue.popleft()\n        node = path[-1]\n        if node == end:\n            return path\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(path + [neighbor])\n    return None',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Cycle detection',
              prose: [
                'If a graph has a loop (e.g., A -> B -> A), how can we algorithmically prove its existence? - When we visit an already-visited node during DFS, is it always a cycle? - How do we distinguish between an undirected edge back to the node we *just* came from, versus a true cycle?',
                'Output: ``` True ``` This proves that tracking the parent allows us to ignore the trivial loop of an undirected edge (going immediately back where we came from).'
              ],
              typeIt: true,
              solution: 'def check_visited(node, parent, visited):\n    # If the node is visited and it\'s NOT the parent, we found a loop\n    return node in visited and node != parent\n\nvisited = {\'A\', \'B\'}\nprint(check_visited(\'A\', \'B\', visited))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Cycle detection — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def has_cycle_undirected(graph):`: Defines the outer function holding the shared `visited` state.\n- `def dfs(node, parent):`: Defines a nested helper function that can access `visited` from the outer scope via closure.\n- `if dfs(neighbor, node): return True`: Recursively explores unvisited neighbors. If any recursive call finds a cycle, the `True` bubbles up immediately.\n- `elif neighbor != parent: return True`: If the neighbor *is* visited, and it is *not* the node we just arrived from (`parent`), we have found a cycle.\n- `for node in graph:`: The outer loop ensures we check disconnected components of the graph by initiating DFS from any unvisited node.\n- `dfs(node, None)`: Starts the DFS for a component. The root has no parent, so `None` is passed.',
                '**Expected behavior.** Predicted confidently: ``` True False ``` Trace has_cycle_undirected(cyclic): dfs(A, None): visited={A}. Neighbor B: dfs(B,A). visited={A,B}. Neighbor A: A==parent -> skip. Neighbor C: dfs(C,B). visited={A,B,C}. Neighbor A: A!=parent B AND A is visited -> CYCLE. Return True.',
                '**CS lens.** **Cycle detection** is crucial for ensuring graphs are trees or DAGs. It appears in: 1. Deadlock detection in operating systems. 2. Detecting infinite loops in spreadsheets (circular references). 3. Verifying valid Git commit histories.',
                '**SE lens.** **Closures for state encapsulation**. By nesting the `dfs` function inside `has_cycle_undirected`, we avoid having to pass the `visited` set around as a parameter or exposing it as a global variable. The inner function automatically has access to the outer function\'s scope, simplifying its signature.'
              ],
              typeIt: true,
              solution: 'def has_cycle_undirected(graph):\n    visited = set()\n\n    def dfs(node, parent):\n        visited.add(node)\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                if dfs(neighbor, node):\n                    return True\n            elif neighbor != parent:\n                return True\n        return False\n\n    for node in graph:\n        if node not in visited:\n            if dfs(node, None):\n                return True\n    return False',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Topological sort — DFS on a DAG',
              prose: [
                'Given a set of tasks with dependencies (e.g., \'compile\' before \'link\', \'link\' before \'test\'), how do we find a valid execution order? - What happens if we just list nodes as we encounter them in DFS? - Why do we need to know all of a node\'s dependencies have been met before adding it?',
                'Output: ``` [\'link\', \'compile\'] ``` This proves that by appending elements *after* processing their dependencies, and then reversing the list with the `[::-1]` slice, we get a valid topological order.'
              ],
              typeIt: true,
              solution: 'result = []\nresult.append(\'compile\')\nresult.append(\'link\')\nprint(result[::-1])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Topological sort — DFS on a DAG — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def topological_sort(graph):`: Defines the sorting function.\n- `\'\'\'Graph must be a DAG...\'\'\'`: Docstring indicating the algorithm\'s prerequisite.\n- `result = []`: Initializes the list to hold the sorted nodes.\n- `dfs(node)`: Recursive helper function.\n- `result.append(node)`: This is the key insight. We add the node to our result *only after* all of its descendants (dependencies) have been fully explored and added.\n- `for node in graph:`: Outer loop ensures we don\'t miss nodes with no incoming edges.\n- `return result[::-1]`: Returns the reversed list. Since nodes were appended post-order (dependents before dependencies), reversing it puts dependencies first.',
                '**Expected behavior.** Predicted confidently: ``` [\'assets\', \'compile\', \'link\', \'test\', \'deploy\'] ``` Trace topo_sort: dfs(\'compile\'): visit compile, then dfs(\'link\'): visit link, dfs(\'test\'): visit test, dfs(\'deploy\'): visit deploy, no neighbors, append \'deploy\'. append \'test\'. append \'link\'. append \'compile\'. dfs(\'assets\'): dfs(\'deploy\') already visited, append \'assets\'. result=[\'deploy\',\'test\',\'link\',\'compile\',\'assets\']. Reversed: [\'assets\',\'compile\',\'link\',\'test\',\'deploy\'].',
                '**CS lens.** **Topological Sort** is the standard algorithm for dependency resolution. It appears in: 1. Build systems (Make, Ninja) ordering compilation tasks. 2. Package managers resolving install orders. 3. Scheduling systems.',
                '**SE lens.** **Preconditions and docstrings**. We document that the graph *must* be a DAG. If we ran this on a cyclic graph, the result would be invalid or it might silently loop indefinitely without a visited check. Production implementations often combine cycle detection with topological sort to throw a descriptive exception if a cycle is found.'
              ],
              typeIt: true,
              solution: 'def topological_sort(graph):\n    \'\'\'Graph must be a DAG (directed acyclic graph).\'\'\'\n    visited = set()\n    result = []\n\n    def dfs(node):\n        visited.add(node)\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                dfs(neighbor)\n        result.append(node)\n\n    for node in graph:\n        if node not in visited:\n            dfs(node)\n\n    return result[::-1]',
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
      'Next lesson: Randomness and Stochastic Simulation.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Node (Vertex)"?',
      options: [
        'the process of finding if a graph has any cycles (paths that start and end at the same node).',
        'a graph traversal algorithm that explores as far as possible along each branch before backtracking.',
        'an entity in a graph.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Edge"?',
      options: [
        'the process of finding if a graph has any cycles (paths that start and end at the same node).',
        'a connection between two nodes.',
        'a way to represent a graph where each node maps to a list of its neighbors.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Breadth-first search (BFS)"?',
      options: [
        'a graph traversal algorithm that explores the neighbor nodes first, before moving to the next level neighbors.',
        'a linear ordering of vertices such that for every directed edge u->v, vertex u comes before v in the ordering.',
        'a graph traversal algorithm that explores as far as possible along each branch before backtracking.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Depth-first search (DFS)"?',
      options: [
        'a connection between two nodes.',
        'a graph traversal algorithm that explores as far as possible along each branch before backtracking.',
        'a linear ordering of vertices such that for every directed edge u->v, vertex u comes before v in the ordering.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Graph** — a data structure that models pairwise relationships.',
    '**Node (Vertex)** — an entity in a graph.',
    '**Edge** — a connection between two nodes.',
    '**Adjacency list** — a way to represent a graph where each node maps to a list of its neighbors.',
    '**Depth-first search (DFS)** — a graph traversal algorithm that explores as far as possible along each branch before backtracking.',
    '**Breadth-first search (BFS)** — a graph traversal algorithm that explores the neighbor nodes first, before moving to the next level neighbors.',
    '**Cycle detection** — the process of finding if a graph has any cycles (paths that start and end at the same node).',
    '**Topological sort** — a linear ordering of vertices such that for every directed edge u->v, vertex u comes before v in the ordering.',
  ],

  checkpoints: ['read-intuition'],
}
