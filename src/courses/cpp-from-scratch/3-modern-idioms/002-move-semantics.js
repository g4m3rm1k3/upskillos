// cpp-from-scratch — Lesson 16: Move Semantics
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 16 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-16-move-semantics',
  slug: 'move-semantics',
  chapter: 3,
  order: 2,
  title: 'Move Semantics',
  subtitle: 'Modern C++ Idioms',
  tags: ['lvalue', 'rvalue', 'move-semantics', 'rule-of-five'],

  hook: {
    question: 'What is "Move Semantics", and why does it matter?',
    realWorldContext: '— An exploration of how C++ transfers ownership of memory instead of copying it, enabling high-performance object management without memory leaks or unnecessary duplication. You will build classes that intentionally "steal" resources from temporary objects.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: lvalues vs rvalues, std::move, The Move Constructor, The Move Assignment Operator, The Rule of Five.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **lvalue:** an expression that points to a specific memory location and has an identifiable name or address. It exists It represents data that persists beyond a single expression, meaning you can safely assign to it or take its address.\n- **rvalue:** an expression that does not have a persistent memory address, typically a temporary value or literal. It exists It represents data that is about to be destroyed, making it safe to "steal" its resources instead of copying them.\n- **Move semantics:** the process of transferring ownership of a resource (like allocated memory) from one object to another without copying the underlying data. It exists It eliminates expensive and unnecessary deep copies when returning objects from functions or passing temporary objects.\n- **Rule of Five:** a C++ rule stating that if a class requires a custom destructor, copy constructor, or copy assignment operator, it almost certainly requires all five (adding move constructor and move assignment). It exists It ensures a class correctly manages its memory across all possible lifecycle events—creation, copying, moving, and destruction.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::move:** A standard library function that casts an lvalue into an rvalue reference.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'When a function returns a large `std::string`, it returns an rvalue. Because `std::string` implements the Rule of Five, the compiler automatically uses the move constructor to steal the string\'s internal memory buffer. You get the string without a single character being copied. `std::move` lets us manually invoke this same stealing behavior on lvalues when we know we are finished with them.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Remove the move constructor from the `Buffer` class in Unit 5, leaving only the copy constructor, and compile. \n\n```cpp\nBuffer c = std::move(a);\n```\n\n**The Failure:** It doesn\'t fail to compile. Instead, because there is no move constructor, the compiler silently falls back to the copy constructor. It allocates new memory and performs an expensive deep copy. The program still works, but the performance optimization of moving is completely lost.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **The Vector Mover:** Create a class that owns a `std::vector`. Implement the move constructor to steal the vector (using `std::move` on the vector itself), and prove it leaves the original vector empty.\n- **The Logger Rule of Five:** Create a class that opens a file handle in its constructor. Implement the Rule of Five so that copying duplicates the file, moving transfers the handle, and the destructor closes it safely.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You can explain the difference between an lvalue and an rvalue.\n- [ ] You can explain what `std::move` actually does to an expression.\n- [ ] You can write a move constructor that safely nullifies the original object\'s pointers.\n- [ ] You can implement a self-assignment check in a move assignment operator.\n- [ ] You can list the five methods mandated by the Rule of Five and explain why they belong together.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 16: Move Semantics',
        caption: 'Move Semantics',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'lvalues vs rvalues',
              prose: [
                'In C++, every expression produces a value. Some values have a permanent home in memory, while others exist only temporarily during an evaluation. To control memory efficiently, we must first distinguish between data we can safely hold onto and data that is about to evaporate.',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard input/output stream library for printing.\n- `#include <string>`: Includes the standard string library.\n- `int main() { ... }`: The entry point of a C++ program.\n- `std::string firstName = "Alice";`: Declares a variable `firstName`. `firstName` is an lvalue. `"Alice"` is a string literal, which acts as an rvalue initializing the string.\n- `std::string fullName = firstName + lastName;`: Evaluates `firstName + lastName`, yielding a brand new, temporary `std::string` object (an rvalue). That temporary object is then copied into the lvalue `fullName`.\n- `std::cout << "Name: " << fullName << "\\n";`: Prints the result to standard output.\n- `return 0;`: Returns a success code to the operating system.',
                '**CS lens.** The distinction between lvalues (locator values) and rvalues (read values) exists in many compiled languages. An lvalue refers to a memory location that can be written to, while an rvalue is a transient value that only exists for computation. Also recognized in: C, Rust, compiler syntax trees where expressions are categorized as assignable or non-assignable.',
                '**SE lens.** Before C++11, the temporary object created by `firstName + lastName` was always deeply copied into `fullName`, wasting CPU cycles allocating memory and copying characters only to immediately destroy the temporary. Identifying rvalues is the first step toward fixing that inefficiency.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nint main() {\n    std::string firstName = "Alice";\n    std::string lastName = "Smith";\n\n    std::string fullName = firstName + lastName;\n\n    std::cout << "Name: " << fullName << "\\n";\n    return 0;\n}',
              expectedOutput: 'Name: AliceSmith',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'std::move',
              prose: [
                'Sometimes you have an lvalue (a named variable) that you are entirely done using. You want to transfer its heavy contents to another object without copying, but the compiler protects lvalues from being stolen from. You need a way to explicitly tell the compiler, "Treat this lvalue as a temporary rvalue."',
                '## How the Code Works',
                '- `#include <utility>`: Brings in the `<utility>` header, which provides the `std::move` function.\n- `std::string source = "Heavy Data";`: Creates an lvalue string holding data.\n- `std::string destination = std::move(source);`: Initializes `destination`. The `std::move(source)` call casts the lvalue `source` into an rvalue reference. It does *not* actually move anything on its own; it merely changes how the compiler categorizes the expression. Because the right side is now an rvalue, `std::string` steals the internal memory buffer of `source`.\n- `std::cout << "Source after move: " << source << "\\n";`: Prints `source`, which is now an empty string because its contents were stolen.',
                '**CS lens.** This is an explicit "Transfer of Ownership." Rather than duplicating a resource, ownership is handed from one variable to another. Also recognized in: Rust\'s default ownership model, unique pointers, operating system file handles.',
                '**SE lens.** `std::move` prevents expensive deep copies. The tradeoff is safety: after calling `std::move(source)`, you must not rely on the value of `source`. It is in a "valid but unspecified state," meaning it is safe to destroy or reassign, but reading from it is a logic error.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n#include <utility>\n\nint main() {\n    std::string source = "Heavy Data";\n    std::string destination = std::move(source);\n\n    std::cout << "Destination: " << destination << "\\n";\n    std::cout << "Source after move: " << source << "\\n";\n    return 0;\n}',
              expectedOutput: 'Destination: Heavy Data\nSource after move: ',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'The Move Constructor',
              prose: [
                'When you write a custom class that manages dynamic memory (like raw pointers), the compiler\'s default copy behavior will copy the pointer address, leading to double-free crashes. You need to teach your class how to gracefully steal a pointer from an rvalue temporary, leaving the temporary harmless.',
                '## How the Code Works',
                '- `class Buffer`: A simple class managing a raw dynamically allocated array.\n- `Buffer()`: A default constructor that allocates heap memory using `new int[100]`. (Reappearing from Lesson 07: Constructors).\n- `Buffer(Buffer&& other) noexcept`: The move constructor. The `&&` signifies that `other` is an rvalue reference (a temporary or a `std::move`\'d object). The `noexcept` keyword promises the compiler that this move operation will never throw an exception.\n- `data = other.data;`: Steals the pointer from the rvalue object. `this->data` now points to the heap memory originally owned by `other`.\n- `other.data = nullptr;`: Nullifies the rvalue\'s pointer. If we didn\'t do this, both `this` and `other` would point to the same memory, and `other`\'s destructor would delete it, breaking `this->data`.\n- `~Buffer() { delete[] data; }`: The destructor frees the memory. Deleting a `nullptr` is a safe no-op in C++.\n- `Buffer a;`: Constructs a new `Buffer` object using the default constructor.\n- `Buffer b = std::move(a);`: Triggers the move constructor because `std::move` casts `a` to an rvalue reference.',
                '**CS lens.** The move constructor implements "Pointer Swapping." Instead of moving megabytes of data, we move a few bytes representing a memory address. Also recognized in: swapping linked list nodes, updating virtual memory page tables, transferring network socket ownership.',
                '**SE lens.** Move constructors make returning large objects from functions nearly free. The tradeoff is that implementing them manually for classes with multiple pointers or resources introduces a high risk of subtle bugs—forgetting to nullify a stolen pointer results in fatal double-free errors.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <utility>\n\nclass Buffer {\nprivate:\n    int* data;\npublic:\n    Buffer() {\n        data = new int[100];\n        std::cout << "Constructed\\n";\n    }\n\n    Buffer(Buffer&& other) noexcept {\n        data = other.data;\n        other.data = nullptr;\n        std::cout << "Move Constructed\\n";\n    }\n\n    ~Buffer() {\n        delete[] data;\n    }\n};\n\nint main() {\n    Buffer a;\n    Buffer b = std::move(a);\n    return 0;\n}',
              expectedOutput: 'Constructed\nMove Constructed',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'The Move Assignment Operator',
              prose: [
                'If you already have a fully constructed object, and you want to overwrite it with the contents of a temporary rvalue, the move constructor cannot help you. You need an operator that frees the existing object\'s old memory before stealing the new memory.',
                '## How the Code Works',
                '- `Buffer& operator=(Buffer&& other) noexcept`: Overloads the assignment operator specifically for rvalue references. It returns a reference to `*this` to support chained assignment (`a = b = c`).\n- `if (this != &other)`: Compares the memory address of the current object (`this`) with the address of the incoming object (`&other`). If they are the same, we skip everything to avoid destroying our own data.\n- `delete[] data;`: Frees the memory `b` currently owns, because we are about to overwrite its pointer.\n- `data = other.data;`: Steals the pointer from `other`.\n- `other.data = nullptr;`: Nullifies `other`\'s pointer, exactly like the move constructor.\n- `return *this;`: Returns the modified object itself.\n- `Buffer b;`: Constructs a second `Buffer`.\n- `b = std::move(a);`: Calls the move assignment operator because `b` is already constructed, and `std::move(a)` provides an rvalue reference.',
                '**CS lens.** This mirrors "Resource Reallocation." When a process takes over a new resource, it must gracefully release its previous resource to prevent leaks before assuming control of the new one. Also recognized in: garbage collector sweeps, GPU texture memory swapping.',
                '**SE lens.** Move assignment is essential for maintaining high performance in container classes like `std::vector`, which frequently reassign and move elements internally when resizing. The tradeoff is the mandatory self-assignment check; omitting it leads to catastrophic data loss on `x = std::move(x)`.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <utility>\n\nclass Buffer {\nprivate:\n    int* data;\npublic:\n    Buffer() {\n        data = new int[100];\n    }\n    \n    Buffer& operator=(Buffer&& other) noexcept {\n        if (this != &other) {\n            delete[] data;\n            data = other.data;\n            other.data = nullptr;\n            std::cout << "Move Assigned\\n";\n        }\n        return *this;\n    }\n\n    ~Buffer() {\n        delete[] data;\n    }\n};\n\nint main() {\n    Buffer a;\n    Buffer b;\n    b = std::move(a);\n    return 0;\n}',
              expectedOutput: 'Move Assigned',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'The Rule of Five',
              prose: [
                'If your class manages its own memory, defining only a destructor or only a move constructor leaves holes in how the object behaves when copied or moved. The compiler generates default versions of the missing operators, which will blindly copy raw pointers and cause memory corruption.',
                '## How the Code Works',
                '- `~Buffer()`: **Destructor**. Frees the managed resource. (Reappearing from Lesson 07).\n- `Buffer(const Buffer& other)`: **Copy Constructor**. Allocates new memory and duplicates the data, leaving the original intact.\n- `Buffer& operator=(const Buffer& other)`: **Copy Assignment Operator**. Frees old memory, allocates new memory, and duplicates data. (Reappearing from Lesson 10).\n- `Buffer(Buffer&& other) noexcept`: **Move Constructor**. Steals the pointer, nullifies the original.\n- `Buffer& operator=(Buffer&& other) noexcept`: **Move Assignment Operator**. Frees old memory, steals the pointer, nullifies the original.\n- `Buffer b = a;`: `a` is an lvalue, so the compiler selects the Copy Constructor, performing a safe deep copy.\n- `Buffer c = std::move(a);`: `a` is cast to an rvalue reference, so the compiler selects the Move Constructor, safely stealing the resource.',
                '**CS lens.** The Rule of Five is an application of "Resource Lifecycle Management." It guarantees that every state transition an entity can undergo (creation, duplication, transfer, and destruction) has explicitly defined semantics, leaving no undefined edge cases.',
                '**SE lens.** Adhering to the Rule of Five guarantees memory safety. The engineering tradeoff is severe boilerplate. Modern C++ development prefers the "Rule of Zero": delegating memory management entirely to smart pointers (like `std::unique_ptr`) or containers (like `std::vector`) so that you don\'t have to write any of these five methods yourself.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <utility>\n\nclass Buffer {\nprivate:\n    int* data;\npublic:\n    Buffer() { data = new int[100]; }\n    \n    // 1. Destructor\n    ~Buffer() { delete[] data; std::cout << "Destroyed\\n"; }\n    \n    // 2. Copy Constructor\n    Buffer(const Buffer& other) {\n        data = new int[100];\n        // In reality, we would copy the contents of the array here\n        std::cout << "Copy Constructed\\n";\n    }\n    \n    // 3. Copy Assignment Operator\n    Buffer& operator=(const Buffer& other) {\n        if (this != &other) {\n            delete[] data;\n            data = new int[100];\n            std::cout << "Copy Assigned\\n";\n        }\n        return *this;\n    }\n    \n    // 4. Move Constructor\n    Buffer(Buffer&& other) noexcept {\n        data = other.data;\n        other.data = nullptr;\n        std::cout << "Move Constructed\\n";\n    }\n    \n    // 5. Move Assignment Operator\n    Buffer& operator=(Buffer&& other) noexcept {\n        if (this != &other) {\n            delete[] data;\n            data = other.data;\n            other.data = nullptr;\n            std::cout << "Move Assigned\\n";\n        }\n        return *this;\n    }\n};\n\nint main() {\n    Buffer a;\n    Buffer b = a;            // Copy Constructor\n    Buffer c = std::move(a); // Move Constructor\n    return 0;\n}',
              expectedOutput: 'Copy Constructed\nMove Constructed\nDestroyed\nDestroyed\nDestroyed',
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
      'Next lesson: Smart Pointers.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "lvalue"?',
      options: [
        'an expression that does not have a persistent memory address, typically a temporary value or literal. It exists It represents data that is about to be destroyed, making it safe to "steal" its resources instead of copying them.',
        'an expression that points to a specific memory location and has an identifiable name or address. It exists It represents data that persists beyond a single expression, meaning you can safely assign to it or take its address.',
        'a C++ rule stating that if a class requires a custom destructor, copy constructor, or copy assignment operator, it almost certainly requires all five (adding move constructor and move assignment). It exists It ensures a class correctly manages its memory across all possible lifecycle events—creation, copying, moving, and destruction.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "rvalue"?',
      options: [
        'the process of transferring ownership of a resource (like allocated memory) from one object to another without copying the underlying data. It exists It eliminates expensive and unnecessary deep copies when returning objects from functions or passing temporary objects.',
        'an expression that does not have a persistent memory address, typically a temporary value or literal. It exists It represents data that is about to be destroyed, making it safe to "steal" its resources instead of copying them.',
        'an expression that points to a specific memory location and has an identifiable name or address. It exists It represents data that persists beyond a single expression, meaning you can safely assign to it or take its address.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Move semantics"?',
      options: [
        'an expression that points to a specific memory location and has an identifiable name or address. It exists It represents data that persists beyond a single expression, meaning you can safely assign to it or take its address.',
        'an expression that does not have a persistent memory address, typically a temporary value or literal. It exists It represents data that is about to be destroyed, making it safe to "steal" its resources instead of copying them.',
        'the process of transferring ownership of a resource (like allocated memory) from one object to another without copying the underlying data. It exists It eliminates expensive and unnecessary deep copies when returning objects from functions or passing temporary objects.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Rule of Five"?',
      options: [
        'an expression that points to a specific memory location and has an identifiable name or address. It exists It represents data that persists beyond a single expression, meaning you can safely assign to it or take its address.',
        'an expression that does not have a persistent memory address, typically a temporary value or literal. It exists It represents data that is about to be destroyed, making it safe to "steal" its resources instead of copying them.',
        'a C++ rule stating that if a class requires a custom destructor, copy constructor, or copy assignment operator, it almost certainly requires all five (adding move constructor and move assignment). It exists It ensures a class correctly manages its memory across all possible lifecycle events—creation, copying, moving, and destruction.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**lvalue** — an expression that points to a specific memory location and has an identifiable name or address. It exists It represents data that persists beyond a single expression, meaning you can safely assign to it or take its address.',
    '**rvalue** — an expression that does not have a persistent memory address, typically a temporary value or literal. It exists It represents data that is about to be destroyed, making it safe to "steal" its resources instead of copying them.',
    '**Move semantics** — the process of transferring ownership of a resource (like allocated memory) from one object to another without copying the underlying data. It exists It eliminates expensive and unnecessary deep copies when returning objects from functions or passing temporary objects.',
    '**Rule of Five** — a C++ rule stating that if a class requires a custom destructor, copy constructor, or copy assignment operator, it almost certainly requires all five (adding move constructor and move assignment). It exists It ensures a class correctly manages its memory across all possible lifecycle events—creation, copying, moving, and destruction.',
  ],

  checkpoints: ['read-intuition'],
}
