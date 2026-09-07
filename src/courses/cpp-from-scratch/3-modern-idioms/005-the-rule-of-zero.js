// cpp-from-scratch — Lesson 19: The Rule of Zero
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 19 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-19-the-rule-of-zero',
  slug: 'the-rule-of-zero',
  chapter: 3,
  order: 5,
  title: 'The Rule of Zero',
  subtitle: 'Modern C++ Idioms',
  tags: ['the-rule-of-zero', 'special-member-functions', 'deleted-function'],

  hook: {
    question: 'What is "The Rule of Zero", and why does it matter?',
    realWorldContext: 'You will write classes that safely manage dynamically allocated heap memory and handle copying without writing a single line of memory-management code. This proves that you do not need to manually define destructors or copy operations when building robust data structures. The transferable problem this solves is maintenance burden: manually writing cleanup and copy logic for every class is tedious and error-prone, but by leaning on types that govern themselves, your classes become immune to memory leaks by default.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: The Compiler-Generated Destructor, The Compiler-Generated Copy Constructor, Composing Value Types.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **The Rule of Zero:** a design principle in modern C++. It exists to eliminate boilerplate memory management code by delegating cleanup and copying to types that already manage themselves.\n- **Special Member Functions:** the destructor, copy constructor, and copy assignment operator. It exists to define exactly what happens when an object goes out of scope or is duplicated, allowing custom memory handling when necessary.\n- **Deleted Function:** a function explicitly marked by the compiler (or programmer) as forbidden to call. It exists to prevent invalid operations, such as attempting to copy an object that owns a strictly unique resource.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::make_unique:** A standard library template function that allocates memory on the heap and wraps it in a std::unique_ptr.\n- **std::unique_ptr:** A smart pointer that claims exclusive ownership of heap memory.\n- **std::vector:** A dynamically resizing array.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Consider the journey of heap memory in a Rule of Zero class. When `Server` is instantiated, it calls `make_unique`. Memory is allocated on the heap and bound to the `unique_ptr`. The `Server` class itself is oblivious; it simply holds a field. When you try to copy the `Server`, the compiler asks the `unique_ptr` to copy itself, fails, and rejects your code at compile time, saving you from a runtime crash. When the `Server` finally goes out of scope, the compiler automatically invokes the `unique_ptr`\'s destructor, which safely frees the heap memory.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you violate the Rule of Zero by using a raw pointer and forgetting the destructor, the compiler will not warn you. Change `Server` to use a raw pointer instead of a smart pointer: \n\n```cpp\nclass Server {\npublic:\n    Connection* conn;\n    \n    Server() {\n        conn = new Connection();\n    }\n};\n```\n\nIf you compile and run this, "Connection closed" will never print. The heap memory is leaked permanently because the compiler-generated destructor for a raw pointer does nothing. The Rule of Zero prevents this by forcing the use of self-cleaning types.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Add a `std::shared_ptr<Connection>` to a new class. See if the compiler allows you to copy the class. (Hint: `std::shared_ptr` is copyable, so the parent class will be copyable too).\n- Attempt to write a custom empty destructor `~Server() {}` in the original `unique_ptr` version of `Server`. Observe that it still compiles and cleans up, but is now violating the Rule of Zero (because you wrote unnecessary boilerplate).\n- Create a class `Config` containing only `int port;` and `std::string host;`. Instantiate one, copy it, and prove that the copy is independent of the original.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- You can rely on the compiler to generate safe default destructors and copy constructors.\n- You understand how `std::unique_ptr` prevents a parent class from being copied.\n- You understand how composing value types like `std::string` gives your classes deep-copy behavior for free.\n- You can explain the Rule of Zero out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 19: The Rule of Zero',
        caption: 'The Rule of Zero',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Compiler-Generated Destructor',
              prose: [
                'If a class holds a dynamically allocated resource (like an open network connection or a chunk of heap memory), that resource must be destroyed when the class dies, or you will cause a memory leak. Historically, C++ developers had to write a custom destructor (`~MyClass()`) for every class that owned a resource. You need a way to build a class that safely cleans up after itself without writing manual cleanup code.',
                '## How the Code Works',
                '- `~Connection() { ... }`: This is a custom destructor on the dummy `Connection` class, solely so we can see when it is destroyed.\n- `std::unique_ptr<Connection> conn;`: `Server` holds a smart pointer to a `Connection`.\n- `conn = std::make_unique<Connection>();`: Inside the `Server` constructor, heap memory is allocated for a `Connection` and handed directly to the smart pointer.\n- `Server srv;`: The `Server` object is created on the stack. Its constructor runs, opening the connection.\n- `}` (end of scope): The `Server` object goes out of scope and is destroyed. Because we did not write a custom destructor, the compiler generates a default one. The default destructor automatically visits every field inside `Server` and calls that field\'s destructor. It visits `conn`, destroying the `std::unique_ptr`. The smart pointer\'s own destructor then frees the heap memory, printing "Connection closed".',
                '**CS lens.** A compiler-generated destructor is an implicit recursive function. When an object dies, the compiler does not just vaporize its memory. It statically knows the type of every member variable, and automatically injects calls to each member\'s destructor in reverse order of declaration. Because `std::unique_ptr` already knows how to free heap memory, the parent class does not need to know anything about it.',
                '**SE lens.** The engineering principle is the Single Responsibility Principle applied to memory. The alternative not chosen is storing a raw pointer (`Connection*`) and writing `~Server() { delete conn; }`. The tradeoff of the alternative is that the `Server` class now has two jobs: its actual networking logic, and managing raw heap memory. By using `std::unique_ptr`, we delegate memory management entirely to a type built specifically for it, leaving `Server` with zero memory-management code to maintain.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <memory>\n\nclass Connection {\npublic:\n    Connection() { std::cout << "Connection opened\\n"; }\n    ~Connection() { std::cout << "Connection closed\\n"; }\n};\n\nclass Server {\npublic:\n    std::unique_ptr<Connection> conn;\n    \n    Server() {\n        conn = std::make_unique<Connection>();\n    }\n    // No ~Server() destructor written!\n};\n\nint main() {\n    std::cout << "--- Starting scope ---\\n";\n    {\n        Server srv;\n    }\n    std::cout << "--- Ended scope ---\\n";\n    return 0;\n}',
              expectedOutput: '--- Starting scope ---\nConnection opened\nConnection closed\n--- Ended scope ---',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Compiler-Generated Copy Constructor',
              prose: [
                'If a class owns a unique resource (like an exclusive lock or a `unique_ptr`), it is physically dangerous to copy the class. If two objects think they exclusively own the exact same block of heap memory, they will both try to delete it when they die, crashing the program. You might think you must manually write code to forbid copying such a class.',
                '## How the Code Works',
                '- `Server srv2 = srv;`: This attempts to invoke the copy constructor of `Server`. Since we did not write one, the compiler attempts to generate a default copy constructor.\n- The compiler inspects `Server`\'s fields. It sees `std::unique_ptr<Connection> conn`.\n- The compiler tries to figure out how to copy `conn`. However, `std::unique_ptr` explicitly forbids copying (it has a deleted copy constructor, as taught in Lesson 17).\n- Because a required field cannot be copied, the compiler immediately gives up and implicitly marks `Server`\'s own copy constructor as a **deleted function**.',
                '**CS lens.** The compiler propagates constraints bottom-up. A class is only as copyable as its least-copyable member. If a single field cannot be copied, the entire class becomes uncopyable by default. This mathematically guarantees that a class composed of unique resources cannot accidentally violate that uniqueness.',
                '**SE lens.** The engineering principle is "Make invalid states unrepresentable." The alternative not chosen is writing a custom copy constructor that throws a runtime error, or explicitly writing `Server(const Server&) = delete;`. The tradeoff of the alternative is manual labor and the risk of forgetting to update it. By doing absolutely nothing, the compiler automatically prevents the bug at compile time.'
              ],
              typeIt: true,
              solution: 'Server srv2 = srv; // Try to copy the server',
              expectedOutput: 'use of deleted function \'Server::Server(const Server&)\'',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Composing Value Types',
              prose: [
                'Sometimes you *do* want a class to be freely copied. If you are building a data transfer object, like a network packet containing a string of data and a list of timestamps, you want to be able to duplicate it easily. You might think you have to write a custom copy constructor to manually duplicate the string and the array piece by piece.',
                '## How the Code Works',
                '- `std::string data;`: `std::string` is a standard library class that internally manages a dynamic character array.\n- `std::vector<int> timestamps;`: `std::vector` is a standard library class that internally manages a dynamically resizing array of integers.\n- `Packet p2 = p1;`: This invokes the default compiler-generated copy constructor for `Packet`.\n- The compiler-generated copy constructor automatically invokes the copy constructor of `data`, causing `std::string` to allocate a fresh buffer and copy its characters over.\n- It then invokes the copy constructor of `timestamps`, causing `std::vector` to allocate fresh memory and copy the integers over.\n- `p2.data = "World";`: We modify the copy. Because the default copy was a deep copy (driven by `std::string`\'s own correct copy logic), `p1.data` remains untouched.',
                '**CS lens.** This is recursive composition. A compound data type\'s behavior is exactly the sum of its parts\' behaviors. `std::string` and `std::vector` are value types — they enforce deep-copy semantics. When you build a new class solely out of value types, your new class automatically inherits deep-copy semantics for free.',
                '**SE lens.** The engineering principle is the Rule of Zero. The historical "Rule of Three" stated that if you write a custom destructor, copy constructor, or copy assignment operator, you probably need to write all three. The modern Rule of Zero states: if your class deals with resources, do not manage them directly using raw pointers. Instead, wrap them in self-managing types (`unique_ptr`, `string`, `vector`). Then, write exactly zero special member functions. Your code will be shorter, simpler, and mathematically immune to memory leaks.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n#include <vector>\n\nclass Packet {\npublic:\n    std::string data;\n    std::vector<int> timestamps;\n    // No copy constructor written!\n};\n\nint main() {\n    Packet p1;\n    p1.data = "Hello";\n    p1.timestamps.push_back(100);\n\n    Packet p2 = p1; // Copy it\n    p2.data = "World";\n    \n    std::cout << "p1 data: " << p1.data << "\\n";\n    std::cout << "p2 data: " << p2.data << "\\n";\n    \n    return 0;\n}',
              expectedOutput: 'p1 data: Hello\np2 data: World',
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
      'Next lesson: Iterators and Ranges.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Special Member Functions"?',
      options: [
        'a function explicitly marked by the compiler (or programmer) as forbidden to call. It exists to prevent invalid operations, such as attempting to copy an object that owns a strictly unique resource.',
        'a design principle in modern C++. It exists to eliminate boilerplate memory management code by delegating cleanup and copying to types that already manage themselves.',
        'the destructor, copy constructor, and copy assignment operator. It exists to define exactly what happens when an object goes out of scope or is duplicated, allowing custom memory handling when necessary.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Deleted Function"?',
      options: [
        'a design principle in modern C++. It exists to eliminate boilerplate memory management code by delegating cleanup and copying to types that already manage themselves.',
        'a function explicitly marked by the compiler (or programmer) as forbidden to call. It exists to prevent invalid operations, such as attempting to copy an object that owns a strictly unique resource.',
        'the destructor, copy constructor, and copy assignment operator. It exists to define exactly what happens when an object goes out of scope or is duplicated, allowing custom memory handling when necessary.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "The Rule of Zero"?',
      options: [
        'the destructor, copy constructor, and copy assignment operator. It exists to define exactly what happens when an object goes out of scope or is duplicated, allowing custom memory handling when necessary.',
        'a function explicitly marked by the compiler (or programmer) as forbidden to call. It exists to prevent invalid operations, such as attempting to copy an object that owns a strictly unique resource.',
        'a design principle in modern C++. It exists to eliminate boilerplate memory management code by delegating cleanup and copying to types that already manage themselves.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**The Rule of Zero** — a design principle in modern C++. It exists to eliminate boilerplate memory management code by delegating cleanup and copying to types that already manage themselves.',
    '**Special Member Functions** — the destructor, copy constructor, and copy assignment operator. It exists to define exactly what happens when an object goes out of scope or is duplicated, allowing custom memory handling when necessary.',
    '**Deleted Function** — a function explicitly marked by the compiler (or programmer) as forbidden to call. It exists to prevent invalid operations, such as attempting to copy an object that owns a strictly unique resource.',
  ],

  checkpoints: ['read-intuition'],
}
