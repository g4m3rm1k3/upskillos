// cpp-dsa — Lesson 8: Deque
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 08 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-08-deque',
  slug: 'deque',
  chapter: 2,
  order: 5,
  title: 'Deque',
  subtitle: 'Linear Data Structures',
  tags: ['deque-double-ended-queue', 'chunked-array', 'cache-locality', 'o-1-time-complexity', 'o-n-time-complexity'],

  hook: {
    question: 'What is "Deque", and why does it matter?',
    realWorldContext: 'You will build a custom chunked-array architecture to understand how memory can grow in two directions at once. Then, you will use the C++ Standard Library\'s `std::deque` to implement a priority task queue. The transferable problem this solves is escaping the O(N) performance trap of shifting elements in a single array when you need to insert data at the front of a collection.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: The Chunked Map Architecture, The Standard Library std::deque.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Deque (Double-Ended Queue):** A sequence container that allows insertions and deletions at both its beginning and its end. It exists To combine the fast two-way growth of a linked list with the CPU cache locality of an array.\n- **Chunked Array:** A memory architecture made of an array of pointers (the map) pointing to separate fixed-size arrays (the chunks). It exists To allow a collection to grow endlessly by allocating new, disconnected chunks, without ever copying the existing data to a new location.\n- **Cache Locality:** The hardware phenomenon where data stored tightly together in memory is read exponentially faster by the CPU. It exists CPUs pull memory in large contiguous blocks; reading a raw array benefits from this, whereas traversing scattered heap allocations defeats it.\n- **O(1) Time Complexity:** An operation that takes a constant amount of time to execute, regardless of how many items are in the collection. It exists To prove that a container\'s insertion speed will not degrade as the collection scales to millions of elements.\n- **O(N) Time Complexity:** An operation whose execution time grows linearly with the number of items. It exists To quantify the performance penalty of operations like shifting a vector, which must touch every element.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::string:** The standard library class representing a sequence of characters.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Start to finish: Our system needs to process an `INFO` task and a `CRITICAL` task. We push the info task to the back. A split-second later, the critical task fires. Instead of waiting in line or forcing the system to sluggishly shift the info task to make room, we push the critical task to the front of the `std::deque`. The deque merely steps its `front_idx` backwards inside its memory chunk, writing the critical task in O(1) time. The range-based loop reads the chunks sequentially from front to back, pulling the critical task first.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If we forcibly bypass the chunk bounds, we corrupt memory. Modify `ChunkDeque.h` to remove the boundary jump logic entirely: \n\n```cpp\nvoid push_front(int val) {\n    front_idx--;\n    // REMOVED: if (front_idx < 0) { ... }\n    map[front_chunk][front_idx] = val;\n}\n```\n\n**The result:** If we push five items to the front, `front_idx` decrements to `-1`, then `-2`. We are now blindly writing data into unallocated heap memory just outside our chunk array, silently corrupting other variables or crashing the program with a **Segmentation Fault**. This is exactly why bounds-checking logic is mandatory.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Back Pressure:** Write a program using `std::deque<int>` that acts as a rolling buffer. Use a loop to push integers 1 through 10 to the back, but whenever the deque size exceeds 5, immediately call `pop_front()` to discard the oldest element.\n- **Palindrome Checker:** Ask the user for a string. Load every character into a `std::deque<char>`. Write a loop that continuously compares and removes `front()` and `back()` to determine if the word is identical forwards and backwards.\n- **Inspect the Map:** In your `ChunkDeque`, add a `print_diagnostics()` method that literally prints the integer values of `front_chunk` and `front_idx` to the console so you can observe the pointers moving in real time.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run a custom chunked array, pushing data into multiple blocks.\n- [ ] You have compiled and run a standard library `std::deque`.\n- [ ] You have triggered and observed O(1) front insertions without element shifting.\n- [ ] You can explain out loud why a chunked array is preferable to a simple circular buffer.\n- [ ] You have committed your code with a message explaining *why* the standard library handles the map boundaries instead of you.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 8: Deque',
        caption: 'Deque',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Chunked Map Architecture',
              prose: [
                'A single contiguous array (`std::vector`) must copy and shift every single existing element if you insert a new value at the front (an O(N) penalty). A linked list (`std::list`) avoids shifting entirely, but requires a separate heap allocation for every individual element, scattering memory and ruining the CPU\'s ability to read memory quickly via cache locality. We need a data structure that provides O(1) front insertion without surrendering contiguous memory blocks.',
                '## First, In Isolation',
                '```cpp\n// Isolation of a chunked map\nint* chunk_a = new int[4];\nint* chunk_b = new int[4];\nint** map = new int*[2] {chunk_a, chunk_b};\n\n// Insert at the end of the first chunk\nmap[0][3] = 42;\n// Insert at the beginning of the second chunk\nmap[1][0] = 99;\n\nstd::cout << map[0][3] << " -> " << map[1][0] << "\\n";\n// Output: 42 -> 99\n```',
                '## How the Code Works',
                '- `class ChunkDeque`: Declares a blueprint for a custom object. This encapsulates the data and methods needed for our double-ended queue.\n- `int** map;`: A pointer to a pointer. Here, it represents a dynamic array that holds pointers to other arrays (the chunks).\n- `int front_chunk = 1;` and `int front_idx = 2;`: Integer fields. They track the exact chunk and the exact index within that chunk where the *next* front element should be placed. We start in the middle chunk to allow space behind us.\n- `int back_chunk = 1;` and `int back_idx = 1;`: Integer fields tracking where the *next* back element goes.\n- `public:`: An access modifier. It exposes the constructor and insertion methods so code outside the class can call them.\n- `ChunkDeque()`: The constructor method. It runs automatically when an instance of this class is created, setting up the initial memory.\n- `map = new int*[3];`: Allocates an array of three integer pointers on the heap, assigning the starting address to `map`.\n- `for (int i = 0; i < 3; i++)`: A loop that runs three times, incrementing `i` from `0` to `2`.\n- `map[i] = new int[4];`: Allocates a contiguous chunk of four integers on the heap and stores its pointer in the map.\n- `void push_front(int val)`: A method that takes a single integer to insert at the beginning of the deque. `void` means it returns nothing.\n- `front_idx--;`: The decrement operator. Memory addresses generally grow up, but the front of a deque grows backwards. This shifts our target slot one step to the left.\n- `if (front_idx < 0)`: A conditional check. If the index drops below zero, we have entirely filled the current chunk.\n- `front_chunk--;`: Moves our active chunk pointer backward to the previous chunk in the map.\n- `front_idx = 3;`: Resets the index to the far right of the newly selected chunk.\n- `map[front_chunk][front_idx] = val;`: The assignment. It jumps to the specific chunk in the map, then places the integer `val` into the precise slot we calculated.\n- `void push_back(int val)`: A method to insert at the absolute end.\n- `back_idx++;`: The increment operator. It shifts our target slot one step to the right.\n- `if (back_idx > 3)`: Boundary check. If the index exceeds `3`, the current chunk is full.\n- `back_chunk++;` and `back_idx = 0;`: Moves to the next chunk in the map and targets its very first slot.\n- `map[back_chunk][back_idx] = val;`: Stores the value in the calculated back position.\nExecution trace:\n- `ChunkDeque d;` — The constructor allocates `map` with 3 total chunks.\n- `d.push_front(10);` — `front_idx` decrements to 1. `map[1][1]` becomes 10.\n- `d.push_front(20);` — `front_idx` decrements to 0. `map[1][0]` becomes 20. The current chunk is now full at the front.\n- `d.push_front(30);` — `front_idx` drops to -1. The `if` branch runs, `front_chunk` drops to 0, and `front_idx` resets to 3. `map[0][3]` becomes 30, seamlessly moving to a brand new memory block without copying the previous elements.',
                '**CS lens.** This embodies the **Deque** (Double-Ended Queue). A deque allows O(1) insertions at both ends. By using a **Chunked Array**, we get the best of both worlds: the chunks themselves provide the dense cache locality of vectors, while the map of pointers allows the container to grow indefinitely without an O(N) reallocation and copy of the element data.',
                '**SE lens.** The alternative not chosen is the Circular Buffer. A circular buffer maps a flat array into a ring, allowing O(1) front insertions. The tradeoff is that when a circular buffer fills up entirely, you must allocate a larger array and copy every single element. A chunked array avoids the data copy; when it fills up, it only needs to reallocate the small pointer `map`, leaving the heavy data chunks exactly where they are.'
              ],
              typeIt: true,
              solution: 'class ChunkDeque {\n    int** map;\n    int front_chunk = 1;\n    int front_idx = 2;\n    int back_chunk = 1;\n    int back_idx = 1;\n\npublic:\n    ChunkDeque() {\n        map = new int*[3];\n        for (int i = 0; i < 3; i++) {\n            map[i] = new int[4];\n        }\n    }\n\n    void push_front(int val) {\n        front_idx--;\n        if (front_idx < 0) {\n            front_chunk--;\n            front_idx = 3;\n        }\n        map[front_chunk][front_idx] = val;\n    }\n\n    void push_back(int val) {\n        back_idx++;\n        if (back_idx > 3) {\n            back_chunk++;\n            back_idx = 0;\n        }\n        map[back_chunk][back_idx] = val;\n    }\n};',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Standard Library std::deque',
              prose: [
                'Our `ChunkDeque` proves the concept, but expanding its `map` dynamically when all three chunks are exhausted requires writing complex pointer reassignment logic. Building a generic version that accepts any data type requires deep template wizardry. We need a ready-made, battle-tested implementation that handles all memory safety and dynamic resizing automatically.',
                '## First, In Isolation',
                '```cpp\n#include <deque>\n#include <iostream>\n\nint main() {\n    std::deque<int> d;\n    d.push_front(1);\n    d.push_back(2);\n    std::cout << d.front() << ", " << d.back() << "\\n";\n    return 0;\n}\n// Output: 1, 2\n```',
                '## How the Code Works',
                '- `#include <iostream>`: Instructs the compiler to include the file defining input/output streams. Without this, `std::cout` is unrecognized.\n- `#include <deque>`: Instructs the compiler to include the standard library\'s double-ended queue template.\n- `#include <string>`: Brings in the definition for the `std::string` class, allowing text objects.\n- `int main()`: The entry point function. The operating system calls this when the program starts.\n- `std::deque<std::string> task_queue;`: Declares a local variable. The `<std::string>` template argument dictates this collection will strictly hold string objects. Under the hood, this sets up the chunked map architecture automatically.\n- `task_queue.push_front("URGENT: Save data");`: Calls the front insertion method. It allocates memory in the front chunk and places the string at the absolute beginning in O(1) time.\n- `task_queue.push_back("INFO: Update UI");`: Appends a string to the absolute end. If the back chunk is full, `std::deque` automatically handles allocating a newly attached chunk.\n- `task_queue.push_front("CRITICAL: Network disconnect");`: Inserts another high-priority item at the front, pushing it ahead of the first urgent task without shifting any existing memory.\n- `for (const std::string& task : task_queue)`: A range-based for loop. It asks the deque for its beginning and end iterators. The `const std::string&` ensures we take each element by reference—avoiding a slow copy—and promises we will not modify it.\n- `std::cout << task << "\\n";`: Pushes the string content to the console output, followed by a newline character.\n- `return 0;`: Exits the program, signaling to the operating system that it completed successfully.\nExecution trace:\n- `task_queue.push_front("URGENT: Save data")` — Deque allocates a chunk, placing "URGENT: Save data" as the only item.\n- `task_queue.push_back("INFO: Update UI")` — Places "INFO: Update UI" at the end, now sitting physically after the urgent task.\n- `task_queue.push_front("CRITICAL: Network disconnect")` — Inserts at the absolute front. Because this is a deque, it simply writes to the previous index in the map\'s chunk, requiring zero O(N) shifting of the two existing items.',
                '**CS lens.** Also recognized in: job scheduling, work-stealing thread pools, browser history navigation, and undo/redo stacks. The defining trait is amortized O(1) insertion at both boundaries. Cache locality is excellent within a single chunk, but reading across chunk boundaries requires an occasional pointer jump through the map.',
                '**SE lens.** The alternative not chosen is defaulting to `std::vector` for everything. The tradeoff is pointer indirection versus shifting. A `std::vector` stores everything in one single contiguous block, making iteration blazing fast and hardware-perfect, but `push_front` is O(N) because every element must shift right. You use `std::deque` only when your algorithm mandates heavy insertions or deletions at the front; otherwise, the cache perfection of `std::vector` makes it the superior default for almost all other C++ code.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <deque>\n#include <string>\n\nint main() {\n    std::deque<std::string> task_queue;\n    \n    task_queue.push_front("URGENT: Save data");\n    task_queue.push_back("INFO: Update UI");\n    task_queue.push_front("CRITICAL: Network disconnect");\n    \n    for (const std::string& task : task_queue) {\n        std::cout << task << "\\n";\n    }\n    \n    return 0;\n}',
              expectedOutput: 'CRITICAL: Network disconnect\nURGENT: Save data\nINFO: Update UI',
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
      'Next lesson: Binary Tree.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "O(N) Time Complexity"?',
      options: [
        'A memory architecture made of an array of pointers (the map) pointing to separate fixed-size arrays (the chunks). It exists To allow a collection to grow endlessly by allocating new, disconnected chunks, without ever copying the existing data to a new location.',
        'An operation whose execution time grows linearly with the number of items. It exists To quantify the performance penalty of operations like shifting a vector, which must touch every element.',
        'An operation that takes a constant amount of time to execute, regardless of how many items are in the collection. It exists To prove that a container\'s insertion speed will not degrade as the collection scales to millions of elements.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Cache Locality"?',
      options: [
        'An operation that takes a constant amount of time to execute, regardless of how many items are in the collection. It exists To prove that a container\'s insertion speed will not degrade as the collection scales to millions of elements.',
        'A memory architecture made of an array of pointers (the map) pointing to separate fixed-size arrays (the chunks). It exists To allow a collection to grow endlessly by allocating new, disconnected chunks, without ever copying the existing data to a new location.',
        'The hardware phenomenon where data stored tightly together in memory is read exponentially faster by the CPU. It exists CPUs pull memory in large contiguous blocks; reading a raw array benefits from this, whereas traversing scattered heap allocations defeats it.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Deque (Double-Ended Queue)"?',
      options: [
        'An operation that takes a constant amount of time to execute, regardless of how many items are in the collection. It exists To prove that a container\'s insertion speed will not degrade as the collection scales to millions of elements.',
        'A sequence container that allows insertions and deletions at both its beginning and its end. It exists To combine the fast two-way growth of a linked list with the CPU cache locality of an array.',
        'An operation whose execution time grows linearly with the number of items. It exists To quantify the performance penalty of operations like shifting a vector, which must touch every element.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "O(1) Time Complexity"?',
      options: [
        'A sequence container that allows insertions and deletions at both its beginning and its end. It exists To combine the fast two-way growth of a linked list with the CPU cache locality of an array.',
        'An operation that takes a constant amount of time to execute, regardless of how many items are in the collection. It exists To prove that a container\'s insertion speed will not degrade as the collection scales to millions of elements.',
        'The hardware phenomenon where data stored tightly together in memory is read exponentially faster by the CPU. It exists CPUs pull memory in large contiguous blocks; reading a raw array benefits from this, whereas traversing scattered heap allocations defeats it.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Deque (Double-Ended Queue)** — A sequence container that allows insertions and deletions at both its beginning and its end. It exists To combine the fast two-way growth of a linked list with the CPU cache locality of an array.',
    '**Chunked Array** — A memory architecture made of an array of pointers (the map) pointing to separate fixed-size arrays (the chunks). It exists To allow a collection to grow endlessly by allocating new, disconnected chunks, without ever copying the existing data to a new location.',
    '**Cache Locality** — The hardware phenomenon where data stored tightly together in memory is read exponentially faster by the CPU. It exists CPUs pull memory in large contiguous blocks; reading a raw array benefits from this, whereas traversing scattered heap allocations defeats it.',
    '**O(1) Time Complexity** — An operation that takes a constant amount of time to execute, regardless of how many items are in the collection. It exists To prove that a container\'s insertion speed will not degrade as the collection scales to millions of elements.',
    '**O(N) Time Complexity** — An operation whose execution time grows linearly with the number of items. It exists To quantify the performance penalty of operations like shifting a vector, which must touch every element.',
  ],

  checkpoints: ['read-intuition'],
}
