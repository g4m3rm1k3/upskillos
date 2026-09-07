// cpp-from-scratch — Lesson 8: RAII
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 08 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-08-raii',
  slug: 'raii',
  chapter: 1,
  order: 8,
  title: 'RAII',
  subtitle: 'Foundations',
  tags: ['raii-resource-acquisition-is-initialization', 'resource', 'memory-leak'],

  hook: {
    question: 'What is "RAII", and why does it matter?',
    realWorldContext: 'You will build isolated classes that manage their own memory lifecycle automatically. This proves that you can tie the lifespan of a resource directly to the lifespan of a local object, making leaks structurally impossible. The transferable problem this solves is resource management: instead of relying on the programmer to manually free memory or close files on every possible exit path, the language\'s own deterministic destruction rules do the cleanup for you.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: The Vulnerability of Manual Cleanup, Wrapping the Resource in an Object.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **RAII (Resource Acquisition Is Initialization):** a design pattern where a resource is tied to the lifespan of an object. It exists to guarantee that resources are cleaned up safely and automatically, even if a function exits early or fails.\n- **Resource:** anything the program asks the operating system for that must eventually be returned. It exists to hold data, access files, or communicate over networks, which are strictly limited system commodities.\n- **Memory Leak:** a bug where a program loses track of a resource without releasing it. It exists because a programmer acquired a resource but a function returned or crashed before the code to release it could run.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **new:** A C++ keyword that requests memory from the operating system\'s heap.\n- **delete[]:** A C++ keyword that returns an array of heap memory back to the operating system.\n- **std::cout / std::endl:** The standard character output stream and newline manipulator.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Consider the flow of the memory resource. The `process_data_safely` function starts by declaring an `IntBuffer`. The compiler immediately calls the `IntBuffer` constructor, which executes the `new int[100]` command, successfully acquiring the memory. The function then encounters an early `return` statement. Before the CPU is allowed to jump back to `main`, the C++ compiler injects a hidden call to the `~IntBuffer` destructor. The destructor executes `delete[] data`, returning the memory to the operating system. Only then does the function actually return. The resource was acquired, used, and cleaned up safely, with zero manual management at the call site.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If we try to bypass RAII and return to manual pointers, we risk silent leaks. Change the `~IntBuffer()` destructor in the final code example by commenting out the delete line: \n\n```cpp\n    ~IntBuffer() {\n        // delete[] data;\n        std::cout << "RAII: Memory freed in destructor." << std::endl;\n    }\n```\n\nWhen you attempt to run this, the program will still compile and run perfectly, and the output will look identical. However, the memory is now permanently leaked, because the actual `delete` command was removed. The program is silently broken. To fix this, uncomment the `delete[] data;` line. The destructor must actually perform the cleanup.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Modify the `process_data_safely` function to call `process_data_safely(false)` from `main`. Observe the output to prove that the destructor still runs correctly even when the function finishes normally.\n- Add a second `IntBuffer` object to the function (`IntBuffer buffer2;`). Observe the output to see the order in which the destructors are called (they are destroyed in reverse order of creation).\n- Create a new class called `FileHandler` that simulates opening a file in the constructor (print "File opened") and closing it in the destructor (print "File closed"). Use it inside a function to prove RAII works for concepts other than memory.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- You can identify a manual resource leak caused by an early return.\n- You can write a class that acquires a resource in its constructor.\n- You can write a class that releases a resource in its destructor.\n- You understand how stack scoping guarantees the destructor will run.\n- You can explain RAII out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 8: RAII',
        caption: 'RAII',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Vulnerability of Manual Cleanup',
              prose: [
                'When you ask the operating system for memory using a raw pointer, you are taking on a manual contract: you must explicitly give that memory back when you are done. If you write the cleanup code at the very bottom of your function, it seems safe. But if an error check causes the function to return early before reaching that bottom line, the cleanup code is skipped. The memory is permanently lost, causing a memory leak.',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard library feature for console output.\n- `void process_data(bool should_fail)`: A function that takes a boolean flag to simulate a success or failure path.\n- `int* raw_buffer = new int[100];`: The `new` keyword asks the operating system for a block of heap memory large enough to hold 100 integers, returning the memory address into the `raw_buffer` pointer.\n- `std::cout << "Memory acquired." << std::endl;`: Prints a diagnostic message to the console to prove the resource was acquired.\n- `if (should_fail) {`: Checks the simulation flag to determine if the function should abort its work.\n- `std::cout << "Error encountered, returning early!" << std::endl;`: Prints a message indicating the failure path was taken.\n- `return;`: Exits the function immediately. Because the function halts here, the computer jumps directly back to `main`.\n- `std::cout << "Processing finished normally." << std::endl;`: This line is skipped due to the early return.\n- `delete[] raw_buffer;`: The keyword that returns the array memory to the operating system. Because of the early return above, this line is never reached.\n- `std::cout << "Memory freed." << std::endl;`: Proves that the memory was released. This is never printed.\n- `int main() {`: The entry point of the program.\n- `process_data(true);`: Calls our function, intentionally passing `true` to trigger the early return and cause the leak.\n- `return 0;`: Ends the program.',
                '**CS lens.** Manual resource management is an open-loop constraint. The program state transitions into "holding a resource", but there is no structural mechanism forcing it to transition back to "empty". Every possible path through the code flowchart must be manually audited to ensure it contains a cleanup command, which scales poorly as code complexity increases.',
                '**SE lens.** The engineering principle is Determinism. The alternative chosen here is Manual Management. The tradeoff is that manual management gives the programmer ultimate control over exactly when a resource is freed, which can occasionally optimize performance in critical loops. The maintenance cost is catastrophic: in a real codebase with hundreds of branches and exceptions, guaranteeing that every single exit path correctly frees every resource is impossible for human reviewers, leading inevitably to resource exhaustion crashes.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nvoid process_data(bool should_fail) {\n    int* raw_buffer = new int[100];\n    std::cout << "Memory acquired." << std::endl;\n\n    if (should_fail) {\n        std::cout << "Error encountered, returning early!" << std::endl;\n        return; \n    }\n\n    std::cout << "Processing finished normally." << std::endl;\n    delete[] raw_buffer;\n    std::cout << "Memory freed." << std::endl;\n}\n\nint main() {\n    process_data(true);\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Wrapping the Resource in an Object',
              prose: [
                'You cannot rely on remembering to put a `delete` call on every possible exit path. Instead, you need a mechanism that fires automatically when the function ends, no matter *how* it ends. C++ guarantees that when a local object goes out of scope (when the function ends), its destructor is called deterministically. If you put the cleanup code inside a destructor, the compiler itself will ensure the resource is freed.',
                '## How the Code Works',
                '- `class IntBuffer {`: Defines a new custom data type designed exclusively to manage one specific resource.\n- `private:`: An access modifier ensuring that internal data cannot be touched by outside code.\n- `int* data;`: The raw pointer is hidden inside the class. The outside world cannot touch it, ensuring no one else can accidentally delete it early or lose the reference.\n- `public:`: An access modifier exposing the constructor and destructor to the outside world.\n- `IntBuffer() {`: The constructor. It automatically runs the moment an `IntBuffer` object is created.\n- `data = new int[100];`: The actual resource acquisition happens here, safely inside the initialization phase.\n- `std::cout << "RAII: Memory acquired in constructor." << std::endl;`: Proves the constructor ran.\n- `~IntBuffer() {`: The destructor. C++ guarantees this will run exactly once when the object\'s lifetime ends.\n- `delete[] data;`: The cleanup code is written exactly once, permanently bonded to the destructor.\n- `std::cout << "RAII: Memory freed in destructor." << std::endl;`: Proves the destructor ran.\n- `void process_data_safely(bool should_fail) {`: A function simulating the same risk of an early return.\n- `IntBuffer buffer;`: Inside the function, we create the object as a local stack variable. The constructor runs immediately, acquiring the memory.\n- `if (should_fail) {`: Checks if we should abort.\n- `std::cout << "Error encountered, returning early!" << std::endl;`: Prints our failure message.\n- `return;`: The early exit path. Even though we are abruptly leaving the function, C++ intercepts the return, notices that `buffer` is about to be destroyed, and automatically invokes `~IntBuffer()`.',
                '**CS lens.** This is the **Resource Acquisition Is Initialization (RAII)** pattern. By binding a dynamic, heap-allocated resource (the array) to a deterministic, stack-allocated object (the `IntBuffer` instance), we map the unpredictable runtime lifespan of the resource to the strictly predictable, compiler-enforced lexical scope of the object. Also recognized in: mutex locks (locking in constructor, unlocking in destructor), file handles, network sockets, and database transactions.',
                '**SE lens.** The engineering principle is Invariant Enforcement. The alternative not chosen is using a `finally` block, which languages like Java and C# use to guarantee cleanup code runs. The tradeoff of a `finally` block is that the cleanup logic is decoupled from the resource itself; the caller must remember to write the `finally` block every single time they use the resource. By using RAII, the class author writes the cleanup logic once, and the compiler forces it upon every caller automatically. The safety is built into the type itself.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass IntBuffer {\nprivate:\n    int* data;\n\npublic:\n    IntBuffer() {\n        data = new int[100];\n        std::cout << "RAII: Memory acquired in constructor." << std::endl;\n    }\n\n    ~IntBuffer() {\n        delete[] data;\n        std::cout << "RAII: Memory freed in destructor." << std::endl;\n    }\n};\n\nvoid process_data_safely(bool should_fail) {\n    IntBuffer buffer;\n\n    if (should_fail) {\n        std::cout << "Error encountered, returning early!" << std::endl;\n        return; \n    }\n\n    std::cout << "Processing finished normally." << std::endl;\n}\n\nint main() {\n    process_data_safely(true);\n    return 0;\n}',
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
      'Next lesson: Inheritance.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Memory Leak"?',
      options: [
        'a bug where a program loses track of a resource without releasing it. It exists because a programmer acquired a resource but a function returned or crashed before the code to release it could run.',
        'a design pattern where a resource is tied to the lifespan of an object. It exists to guarantee that resources are cleaned up safely and automatically, even if a function exits early or fails.',
        'anything the program asks the operating system for that must eventually be returned. It exists to hold data, access files, or communicate over networks, which are strictly limited system commodities.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Resource"?',
      options: [
        'a design pattern where a resource is tied to the lifespan of an object. It exists to guarantee that resources are cleaned up safely and automatically, even if a function exits early or fails.',
        'a bug where a program loses track of a resource without releasing it. It exists because a programmer acquired a resource but a function returned or crashed before the code to release it could run.',
        'anything the program asks the operating system for that must eventually be returned. It exists to hold data, access files, or communicate over networks, which are strictly limited system commodities.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "RAII (Resource Acquisition Is Initialization)"?',
      options: [
        'anything the program asks the operating system for that must eventually be returned. It exists to hold data, access files, or communicate over networks, which are strictly limited system commodities.',
        'a bug where a program loses track of a resource without releasing it. It exists because a programmer acquired a resource but a function returned or crashed before the code to release it could run.',
        'a design pattern where a resource is tied to the lifespan of an object. It exists to guarantee that resources are cleaned up safely and automatically, even if a function exits early or fails.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**RAII (Resource Acquisition Is Initialization)** — a design pattern where a resource is tied to the lifespan of an object. It exists to guarantee that resources are cleaned up safely and automatically, even if a function exits early or fails.',
    '**Resource** — anything the program asks the operating system for that must eventually be returned. It exists to hold data, access files, or communicate over networks, which are strictly limited system commodities.',
    '**Memory Leak** — a bug where a program loses track of a resource without releasing it. It exists because a programmer acquired a resource but a function returned or crashed before the code to release it could run.',
  ],

  checkpoints: ['read-intuition'],
}
