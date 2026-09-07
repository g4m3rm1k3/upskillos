// cpp-dsa — Lesson 13: Graph Fundamentals
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 13 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-13-graph-fundamentals',
  slug: 'graph-fundamentals',
  chapter: 3,
  order: 5,
  title: 'Graph Fundamentals',
  subtitle: 'Trees, Heaps, and Graphs',
  tags: ['vertex-node', 'edge', 'directed-graph', 'undirected-graph', 'weight', 'adjacency-matrix'],

  hook: {
    question: 'What is "Graph Fundamentals", and why does it matter?',
    realWorldContext: 'You will write isolated console programs that map out relationships between data points, creating networks of connected information. The transferable problem this solves is choosing the correct memory layout—matrix versus list—to represent sparse versus dense connections while balancing lookup speed against memory consumption.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: Adjacency Matrix, Edge Weights, Adjacency List, Hash-Mapped Graph.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Vertex (Node):** A single data point or entity in a graph. It exists To represent the discrete objects (like cities, users, or servers) that make up a network.\n- **Edge:** A connection between two vertices. It exists To formalize the relationship or path between entities, allowing traversal from one to another.\n- **Directed Graph:** A graph where edges have a specific direction (A points to B, but B does not inherently point to A). It exists To model asymmetric relationships like one-way streets, followers on social media, or dependencies.\n- **Undirected Graph:** A graph where edges are bidirectional (A connects to B, which means B connects to A). It exists To model symmetric relationships like physical proximity or mutual friendships.\n- **Weight:** A numerical value assigned to an edge. It exists To quantify the cost, distance, or capacity of moving across that specific connection.\n- **Adjacency Matrix:** A two-dimensional grid representing a graph, where a row and column intersection indicates an edge. It exists To provide instant, constant-time checks of whether a connection exists between any two specific vertices.\n- **Adjacency List:** A collection where each vertex stores only a list of its actual neighbors. It exists To save memory in graphs where most vertices are not connected to every other vertex, avoiding the massive blank space of a matrix.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::vector&lt;std::vector&lt;T&gt;&gt;:** A vector where each element is itself a vector.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how the memory requirement transformed. You started with a fixed $V \\times V$ grid where asserting a connection was a simple numeric assignment. When that proved too rigid and memory-intensive for sparse data, you pivoted to dynamic `std::vector` arrays, allocating memory strictly for edges that exist. Finally, you decoupled the data structure from sequential integers by wrapping those vectors inside a `std::unordered_map`, creating a flexible graph capable of mapping real-world string entities to each other without pre-defining the total vertex count.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you try to map a non-existent key in an adjacency list without recognizing how the `[]` operator works, you pollute your memory. Modify the `std::unordered_map` code to check if a city has flights: \n\n```cpp\nif (graph["Berlin"].empty()) {\n    std::cout << "No flights out of Berlin.\\n";\n}\n```\n\nThis compiles and runs cleanly, printing the message. However, the `[]` operator is designed to forcefully create a key if it is missing. Just by executing `graph["Berlin"]` inside an `if` statement, you permanently inserted `"Berlin"` into your graph with an empty vector. To correctly check without modifying, you must use `graph.find("Berlin")`.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Matrix Evaluation:** Write an $O(V^2)$ adjacency matrix with 4 vertices. Create a `for` loop that iterates through every cell. If `matrix[i][j] == 1`, print the edge.\n- **Weighted Adjacency List:** An adjacency list can hold weights by storing pairs. Modify the `std::vector` list to be `std::vector<std::vector<std::pair<int, int>>>`, where the pair holds the destination vertex and the weight.\n- **Map Verification:** Using the `std::unordered_map` graph, write code that securely verifies if `"Paris"` exists as a vertex using `.find()` instead of the `[]` operator.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run a matrix graph and manipulated exact array indices.\n- [ ] You have compiled and run a weighted graph with a sentinel value.\n- [ ] You have compiled and run a vector-based adjacency list, understanding its memory footprint.\n- [ ] You have compiled and run a map-based adjacency list using string keys.\n- [ ] You can explain out loud the exact memory tradeoff between an adjacency matrix and an adjacency list.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 13: Graph Fundamentals',
        caption: 'Graph Fundamentals',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Adjacency Matrix',
              prose: [
                'You need to represent a network of items and track exactly which items connect to each other. Storing flat variables like `int vertex1 = 0;` does not capture the relationships between them. You need a data structure that maps pairs of elements to a boolean state: connected or not.',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard library file required for console output.\n- `#include <vector>`: Instructs the compiler to include the definition for the `std::vector` template.\n- `int numVertices = 3;`: Declares an integer specifying the total number of vertices in our graph (indexed 0, 1, and 2).\n- `std::vector<std::vector<int>> matrix`: Declares a nested vector. The outer vector holds rows, and each row is an inner vector of integers.\n- `(numVertices, std::vector<int>(numVertices, 0))`: The constructor arguments. The outer vector is sized to `numVertices` rows. Every row is initialized with a brand new `std::vector<int>` that contains `numVertices` elements, all initialized to `0`. This builds a perfect 3x3 square grid.\n- `matrix[0][1] = 1;`: The first `[0]` accesses the zeroth row, acting as the starting vertex. The second `[1]` accesses the first element inside that row, acting as the destination vertex. Assigning `1` physically records an edge from 0 to 1. Because `matrix[1][0]` remains 0, this is a **directed graph** relationship.\n- `matrix[1][2] = 1;` and `matrix[2][1] = 1;`: Setting the connection in both directions symmetrically proves an **undirected graph** relationship. Vertex 1 points to 2, and 2 explicitly points back to 1.\n- `if (matrix[0][1] == 1)`: Immediately jumps to the specific coordinates in the grid, evaluating to true because the value is 1.\n- `std::cout << ...`: Prints the confirmation to the console.',
                '**CS lens.** This structure maps to a mathematical square matrix. To check if an edge exists between any two vertices takes $O(1)$ constant time: you perform exactly one memory array lookup. However, finding all neighbors of a specific vertex takes $O(V)$ time, because you must scan the entire row (all $V$ columns) to see which elements are 1. The space complexity is heavily $O(V^2)$.',
                '**SE lens.** The tradeoff chosen here optimizes for instant edge verification at the cost of massive memory overhead. If you have 10,000 users, this matrix allocates 100,000,000 integers. If most users only have 5 friends, 99.99% of your memory is wasted holding zeroes. Matrices are built for densely connected graphs where the fast $O(1)$ check is mandatory.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    int numVertices = 3;\n    \n    std::vector<std::vector<int>> matrix(numVertices, std::vector<int>(numVertices, 0));\n    \n    matrix[0][1] = 1;\n    \n    matrix[1][2] = 1;\n    matrix[2][1] = 1;\n    \n    if (matrix[0][1] == 1) {\n        std::cout << "Directed edge exists from 0 to 1\\n";\n    }\n    \n    if (matrix[1][2] == 1 && matrix[2][1] == 1) {\n        std::cout << "Undirected edge exists between 1 and 2\\n";\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Edge Weights',
              prose: [
                'Connections in the real world are rarely perfectly equal. A flight from New York to London takes longer than a flight from New York to Boston; a network packet dropping into a congested route costs more latency than an open pipe. A matrix filled with `1`s and `0`s only records existence, not cost. You need to assign numbers to edges.',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard I/O library.\n- `#include <vector>`: Includes the `std::vector` definition.\n- `int numVertices = 3;`: Declares the number of vertices.\n- `std::vector<std::vector<int>> weights`: Declares the nested vector representing the two-dimensional grid.\n- `(numVertices, std::vector<int>(numVertices, -1))`: Sizes the grid to 3x3. Crucially, it fills the grid with `-1` rather than `0`. In a weighted graph, `0` is often a valid cost (e.g., a free transition). You must use an impossible value—like a negative distance—to signify "no edge exists."\n- `weights[0][1] = 50;`: Replaces the `-1` at coordinates `[0][1]` with the integer `50`. This assigns a **weight** to the edge.\n- `weights[1][2] = 10;`: Assigns a weight of `10` to the edge from 1 to 2.\n- `if (weights[0][1] != -1)`: Checks the array index against `-1` to ensure the edge physically exists before attempting to read its weight.\n- `std::cout << ...`: Reads `weights[0][1]` again and prints `50` to the console.',
                '**CS lens.** Adding weights does not alter the asymptotic complexity. It is still an $O(V^2)$ memory structure, and checking the cost of an edge is still $O(1)$. You have simply repurposed the value at the intersection to hold quantitative data instead of binary data.',
                '**SE lens.** The alternative not chosen is storing separate Edge objects in a parallel structure. By embedding the weight directly inside the matrix, you keep cache locality high and lookups instantaneous. The engineering debt here is reserving an invalid value (`-1` or `INT_MAX`) specifically to represent emptiness, which requires every edge-checking function to correctly validate against that sentinel value before processing a weight.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    int numVertices = 3;\n    \n    std::vector<std::vector<int>> weights(numVertices, std::vector<int>(numVertices, -1));\n    \n    weights[0][1] = 50;\n    \n    weights[1][2] = 10;\n    \n    if (weights[0][1] != -1) {\n        std::cout << "Traversal cost from 0 to 1 is " << weights[0][1] << "\\n";\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Adjacency List',
              prose: [
                'The $O(V^2)$ memory scaling of the adjacency matrix is unacceptable for large, sparse datasets like social networks or geographic maps. You need a data structure that drops the square grid entirely and only allocates memory for the edges that actually exist in reality.',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the console output definitions.\n- `#include <vector>`: Includes the `std::vector` implementation.\n- `int numVertices = 3;`: Declares our three starting vertices.\n- `std::vector<std::vector<int>> adjList`: Declares a nested vector.\n- `(numVertices)`: Initializes the outer vector to contain exactly 3 inner vectors. Crucially, the inner vectors are left totally empty (size 0). There is no square grid.\n- `adjList[0].push_back(1);`: The `[0]` operator targets the first inner vector. `push_back(1)` instructs that inner vector to dynamically allocate memory and append the value `1` to its end. This directed edge costs exactly one integer of storage, not an entire row.\n- `adjList[1].push_back(2);` and `adjList[2].push_back(1);`: Vertex 1 records 2 as a neighbor, and vertex 2 records 1 as a neighbor, creating an undirected relationship using precisely two integers.\n- `for (int neighbor : adjList[1])`: A range-based for loop. It asks the specific inner vector at index 1 for its beginning and end iterators. It loops exactly once per actual connection, pulling each connected vertex ID into the local `neighbor` variable.\n- `std::cout << ...`: Prints the neighbor ID to the screen.',
                '**CS lens.** This is an Adjacency List. The space complexity is precisely $O(V + E)$—you store exactly one slot for every vertex, and one integer for every edge. For sparse graphs, $O(V + E)$ is vastly smaller than $O(V^2)$. Iterating over a vertex\'s neighbors takes $O(E_{avg})$ time (where $E_{avg}$ is the number of connections that vertex actually has), which is far faster than scanning an entire matrix row of zeroes. The loss is that checking if a specific edge exists takes $O(E_{avg})$ time, because you must scan the list.',
                '**SE lens.** The tradeoff chosen is memory and iteration speed at the cost of lookup speed. Software engineering defaults to the adjacency list for nearly all graph problems because real-world networks are predominantly sparse. It is extremely rare for every entity to connect to every other entity; designing a system to optimize for that rare case by allocating billions of zeroes is an architecture failure.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    int numVertices = 3;\n    \n    std::vector<std::vector<int>> adjList(numVertices);\n    \n    adjList[0].push_back(1);\n    \n    adjList[1].push_back(2);\n    adjList[2].push_back(1);\n    \n    std::cout << "Neighbors of vertex 1:\\n";\n    for (int neighbor : adjList[1]) {\n        std::cout << "-> " << neighbor << "\\n";\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Hash-Mapped Graph',
              prose: [
                'Using `std::vector` requires every vertex to be tightly packed integers starting exactly at zero. If your dataset identifies vertices by names, IP addresses, or scattered UUIDs, you cannot use them as vector indices. You need a way to build an adjacency list that natively understands arbitrary, non-sequential keys.',
                '## How the Code Works',
                '- `#include <iostream>`, `#include <vector>`, `#include <string>`: Includes standard library dependencies.\n- `#include <unordered_map>`: Includes the hash table implementation, providing constant-time key lookups without sorting overhead.\n- `std::unordered_map<std::string, std::vector<std::string>> graph;`: Instantiates a map. The key is a `std::string` (the name of the vertex). The value mapped to that key is a `std::vector<std::string>` (the adjacency list of connected neighbors).\n- `graph["New York"]`: The `[]` operator searches the hash table for the key `"New York"`. Because it does not exist, the map creates it, internally default-constructing an entirely empty `std::vector`.\n- `.push_back("London");`: Calls `push_back` on the vector that the map just returned, appending `"London"` to the adjacency list.\n- `graph["New York"].push_back("Tokyo");`: The `[]` operator runs the hash function again, finds the existing `"New York"` entry, and returns its vector by reference, allowing `push_back` to append `"Tokyo"` as the second edge.\n- `graph["London"].push_back("New York");`: Builds a reciprocal edge, ensuring London points back to New York.\n- `for (const std::string& dest : graph["New York"])`: Uses a range-based for loop over the vector returned by `graph["New York"]`. It specifies `const std::string& dest` to read each string by reference, completely avoiding the computational cost of copying the string bytes into a new local variable during each iteration.\n- `std::cout << ...`: Prints the destination.',
                '**CS lens.** You have replaced the outer array with a hash table. The hash function converts the string key into an integer memory location in $O(1)$ time. This gives you the exact same performance characteristics as the vector-based adjacency list—$O(V + E)$ space complexity—but abstracts away the requirement that vertices be sequential integers.',
                '**SE lens.** The alternative not chosen is keeping a vector-based graph and writing a separate `std::map` that translates strings to `int` IDs. The tradeoff here is cleaner, direct logic at the cost of slightly slower operations. Hashing a string on every lookup takes more CPU cycles than reading a raw array index. In highly performance-critical systems like game pathfinding, engineers enforce integer IDs specifically to use raw vectors. In business logic, the direct `std::unordered_map` prevents translation errors and simplifies the codebase.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <unordered_map>\n#include <vector>\n#include <string>\n\nint main() {\n    std::unordered_map<std::string, std::vector<std::string>> graph;\n    \n    graph["New York"].push_back("London");\n    graph["New York"].push_back("Tokyo");\n    graph["London"].push_back("New York");\n    \n    std::cout << "Flights out of New York:\\n";\n    for (const std::string& dest : graph["New York"]) {\n        std::cout << "-> " << dest << "\\n";\n    }\n    \n    return 0;\n}',
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
      'Next lesson: Breadth-First Search (BFS).',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Weight"?',
      options: [
        'A numerical value assigned to an edge. It exists To quantify the cost, distance, or capacity of moving across that specific connection.',
        'A collection where each vertex stores only a list of its actual neighbors. It exists To save memory in graphs where most vertices are not connected to every other vertex, avoiding the massive blank space of a matrix.',
        'A two-dimensional grid representing a graph, where a row and column intersection indicates an edge. It exists To provide instant, constant-time checks of whether a connection exists between any two specific vertices.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Directed Graph"?',
      options: [
        'A collection where each vertex stores only a list of its actual neighbors. It exists To save memory in graphs where most vertices are not connected to every other vertex, avoiding the massive blank space of a matrix.',
        'A graph where edges have a specific direction (A points to B, but B does not inherently point to A). It exists To model asymmetric relationships like one-way streets, followers on social media, or dependencies.',
        'A two-dimensional grid representing a graph, where a row and column intersection indicates an edge. It exists To provide instant, constant-time checks of whether a connection exists between any two specific vertices.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Edge"?',
      options: [
        'A numerical value assigned to an edge. It exists To quantify the cost, distance, or capacity of moving across that specific connection.',
        'A connection between two vertices. It exists To formalize the relationship or path between entities, allowing traversal from one to another.',
        'A single data point or entity in a graph. It exists To represent the discrete objects (like cities, users, or servers) that make up a network.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Adjacency Matrix"?',
      options: [
        'A connection between two vertices. It exists To formalize the relationship or path between entities, allowing traversal from one to another.',
        'A two-dimensional grid representing a graph, where a row and column intersection indicates an edge. It exists To provide instant, constant-time checks of whether a connection exists between any two specific vertices.',
        'A graph where edges are bidirectional (A connects to B, which means B connects to A). It exists To model symmetric relationships like physical proximity or mutual friendships.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Vertex (Node)** — A single data point or entity in a graph. It exists To represent the discrete objects (like cities, users, or servers) that make up a network.',
    '**Edge** — A connection between two vertices. It exists To formalize the relationship or path between entities, allowing traversal from one to another.',
    '**Directed Graph** — A graph where edges have a specific direction (A points to B, but B does not inherently point to A). It exists To model asymmetric relationships like one-way streets, followers on social media, or dependencies.',
    '**Undirected Graph** — A graph where edges are bidirectional (A connects to B, which means B connects to A). It exists To model symmetric relationships like physical proximity or mutual friendships.',
    '**Weight** — A numerical value assigned to an edge. It exists To quantify the cost, distance, or capacity of moving across that specific connection.',
    '**Adjacency Matrix** — A two-dimensional grid representing a graph, where a row and column intersection indicates an edge. It exists To provide instant, constant-time checks of whether a connection exists between any two specific vertices.',
    '**Adjacency List** — A collection where each vertex stores only a list of its actual neighbors. It exists To save memory in graphs where most vertices are not connected to every other vertex, avoiding the massive blank space of a matrix.',
  ],

  checkpoints: ['read-intuition'],
}
