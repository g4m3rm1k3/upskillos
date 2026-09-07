// cpp-from-scratch — Lesson 34: Undefined Behavior
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 34 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-34-undefined-behavior',
  slug: 'undefined-behavior',
  chapter: 6,
  order: 4,
  title: 'Undefined Behavior',
  subtitle: 'Systems and Tooling',
  tags: ['undefined-behavior-ub', 'compiler-optimization', 'sanitizer', 'shadow-memory'],

  hook: {
    question: 'What is "Undefined Behavior", and why does it matter?',
    realWorldContext: 'You will write isolated code snippets that violate the rules of the C++ language in ways that do not produce compilation errors. This proves that C++ compilers do not stop you from writing invalid programs, and demonstrates how to use sanitizers to detect these silent failures before they cause unpredictable bugs in production. This solves the fundamental problem of how to trust a codebase when the language itself does not guarantee safe execution.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: The Reality of Undefined Behavior, The Compiler\'s Assumption, Detecting UB with Sanitizers.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Undefined Behavior (UB):** a situation where the C++ standard imposes no requirements on what the program does. It exists To allow C++ to run as fast as possible by not requiring the compiler to inject runtime safety checks for every operation.\n- **Compiler Optimization:** the process where the compiler rewrites your code to run faster or use less memory. It exists To make abstractions (like function calls and loops) cost nothing at runtime.\n- **Sanitizer:** a diagnostic tool integrated into the compiler that injects runtime checks into your executable. It exists To actively detect and report Undefined Behavior during testing, since the compiler normally assumes it never happens.\n- **Shadow Memory:** a separate region of memory maintained by a sanitizer to track the validity of the application\'s actual memory. It exists To provide a fast, parallel accounting system that can verify if a pointer access is legal without complex runtime structures.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **-fsanitize=address:** A compiler flag that enables AddressSanitizer (ASan).\n- **-fsanitize=undefined:** A compiler flag that enables UndefinedBehaviorSanitizer (UBSan).',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A piece of code attempting to perform an illegal memory access: 1. `int numbers[3] = {10, 20, 30};` — allocates valid memory. 2. `int badRead = numbers[3];` — attempts an out-of-bounds access. Without sanitizers, the compiler assumes this Undefined Behavior won\'t happen, performs the read, and silently retrieves garbage memory. 3. `g++ -fsanitize=address` — recompiles the program, fundamentally altering the generated executable. 4. `int badRead = numbers[3];` — at runtime, the AddressSanitizer intercepts the read, checks the shadow memory, discovers the address is unallocated, and terminates the program instantly.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Without sanitizers, Undefined Behavior lies dormant. A program might run perfectly on your machine, but crash on your user\'s machine because their memory layout is slightly different. It might run perfectly in debug mode, but behave erratically in release mode because the optimizer deleted a critical `if` statement. Sanitizers are the only reliable mechanism to prove your code is free of silent Undefined Behavior.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **UndefinedBehaviorSanitizer (UBSan):** Compile the `overflow.cpp` code from the second unit using `-fsanitize=undefined -g`. Run the resulting executable. Observe how UBSan catches the signed integer overflow at runtime and halts the program with a descriptive error.\n- **Use-After-Free:** Write a program that allocates an integer on the heap using `new`, deletes it using `delete`, and then attempts to print the value of the deleted pointer. Compile it normally and observe the silent failure. Recompile it with `-fsanitize=address` and observe the AddressSanitizer intercepting the use-after-free violation.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run the out-of-bounds array access.\n- [ ] You have compiled the overflow example with optimizations and observed the compiler delete the check.\n- [ ] You have compiled the out-of-bounds example with `-fsanitize=address` and observed the sanitizer catch the error.\n- [ ] You understand that Undefined Behavior does not guarantee a crash.\n- [ ] You can explain why the compiler is allowed to assume Undefined Behavior never happens.\n- [ ] You can explain Undefined Behavior out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 34: Undefined Behavior',
        caption: 'Undefined Behavior',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Reality of Undefined Behavior',
              prose: [
                'When you do something illegal in C++, like reading beyond the end of an array, the language does not promise to crash. It promises absolutely nothing. You need to understand what this lack of a promise actually looks like in practice, because assuming an invalid operation will cleanly halt your program is a dangerous misconception in C++.',
                '## How the Code Works',
                '- `int numbers[3] = {10, 20, 30};` — allocates an array of precisely 3 integers on the stack. The valid indices are `0`, `1`, and `2`.\n- `numbers[3]` — asks the program to read the memory located exactly one integer\'s width past the end of the array. Because C++ does not perform bounds checking, it faithfully computes the memory address where the fourth element *would* be, and reads whatever bits happen to live there.\n- `std::cout << ...` — prints the garbage value retrieved from that memory address.',
                '**CS lens.** Undefined Behavior is a breach of contract between the programmer and the compiler. High-level languages like Java or Python check every array access at runtime and throw an `IndexOutOfBoundsException` if the access is illegal. C++ does not. It translates the array access directly into a hardware memory offset. The CPU blindly reads whatever happens to be at that memory address, whether it belongs to your array, another variable, or uninitialized memory.',
                '**SE lens.** The C++ standard defines this as Undefined Behavior to guarantee zero-overhead abstraction. The alternative not chosen is requiring the compiler to automatically inject a bounds check before every array access. C#\'s approach costs CPU cycles for every read. C++\'s approach is infinitely faster, but costs the developer the burden of absolute correctness, because an error might silently corrupt data instead of cleanly crashing.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int numbers[3] = {10, 20, 30};\n    \n    // Attempting to read past the end of the array\n    std::cout << "The fourth element is: " << numbers[3] << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Compiler\'s Assumption',
              prose: [
                'The danger of Undefined Behavior is not just that you might read garbage memory at runtime. It is that the compiler is legally allowed to assume your program *never* contains Undefined Behavior. If the compiler sees a path of code that contains Undefined Behavior, it can optimize your code by rewriting or deleting that path entirely, altering the fundamental logic of your program.',
                '## How the Code Works',
                '- `bool isPositive(int value)` — declares a function that takes a signed integer and returns a boolean.\n- `return (value + 1) > value;` — evaluates whether adding 1 to the value makes it larger. Mathematically, this is always true.\n- `int maxInt = 2147483647;` — assigns the maximum possible value for a 32-bit signed integer.\n- `isPositive(maxInt)` — passes `maxInt` into the function. Inside the function, `maxInt + 1` causes a signed integer overflow. In C++, signed integer overflow is explicitly defined as Undefined Behavior.',
                '**CS lens.** Compiler optimization relies on mathematical axioms. Because signed integer overflow is Undefined Behavior, the optimizer is mathematically justified in assuming it will *never* occur. Since the overflow never occurs, the compiler deduces that `value + 1` must *always* be strictly greater than `value`. Therefore, the compiler optimizes the entire `isPositive` function down to a single instruction that simply returns `true`. It deletes the check entirely.',
                '**SE lens.** The standard could have defined signed integer overflow to reliably wrap around to negative numbers (which is what unsigned integers do). The tradeoff is that certain loop optimizations would become impossible, slowing down valid code. By declaring it Undefined Behavior, the standard prioritizes the maximum performance of correct programs over the predictable execution of incorrect ones.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nbool isPositive(int value) {\n    // If value is 2147483647, adding 1 causes a signed integer overflow.\n    // Signed integer overflow is Undefined Behavior.\n    return (value + 1) > value;\n}\n\nint main() {\n    int maxInt = 2147483647;\n    std::cout << "Is (maxInt + 1) > maxInt? " << isPositive(maxInt) << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Detecting UB with Sanitizers',
              prose: [
                'Because the compiler assumes Undefined Behavior never happens, it will not warn you when you write it. And because Undefined Behavior can fail silently at runtime, you cannot rely on crashes to find it. You need a tool that actively watches your program execute and stops it the exact moment Undefined Behavior occurs.',
                '## How the Code Works',
                '- `g++` — invokes the C++ compiler.\n- `-std=c++17` — tells the compiler to use the C++17 standard.\n- `-fsanitize=address` — instructs the compiler to inject bookkeeping code around every memory allocation and memory access in your program.\n- `-g` — instructs the compiler to include debug information in the executable. This ensures the sanitizer can map the memory error back to the exact line number in your source code.\n- `out_of_bounds.cpp -o out_of_bounds_sanitized` — specifies the input file and the output executable name.',
                '**CS lens.** Sanitizers use a technique called shadow memory. For every 8 bytes of memory your program uses, AddressSanitizer allocates 1 byte in a separate, hidden region (the shadow memory) to track its state (e.g., valid, freed, unallocated). During compilation, AddressSanitizer injects a check before every single memory read or write. If the target address is marked as invalid in the shadow memory, the program immediately halts and prints a stack trace.',
                '**SE lens.** Sanitizers are not meant for production binaries because they drastically slow down execution and consume significantly more memory. The standard engineering practice is to run your entire test suite with sanitizers enabled in a Continuous Integration (CI) environment. This catches Undefined Behavior during automated testing, ensuring the bugs never reach production.'
              ],
              typeIt: true,
              solution: '# Compile with AddressSanitizer and Debug Symbols\ng++ -std=c++17 -fsanitize=address -g out_of_bounds.cpp -o out_of_bounds_sanitized',
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
      'Next lesson: Modern C++ Idioms.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Shadow Memory"?',
      options: [
        'a diagnostic tool integrated into the compiler that injects runtime checks into your executable. It exists To actively detect and report Undefined Behavior during testing, since the compiler normally assumes it never happens.',
        'a separate region of memory maintained by a sanitizer to track the validity of the application\'s actual memory. It exists To provide a fast, parallel accounting system that can verify if a pointer access is legal without complex runtime structures.',
        'a situation where the C++ standard imposes no requirements on what the program does. It exists To allow C++ to run as fast as possible by not requiring the compiler to inject runtime safety checks for every operation.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Sanitizer"?',
      options: [
        'the process where the compiler rewrites your code to run faster or use less memory. It exists To make abstractions (like function calls and loops) cost nothing at runtime.',
        'a situation where the C++ standard imposes no requirements on what the program does. It exists To allow C++ to run as fast as possible by not requiring the compiler to inject runtime safety checks for every operation.',
        'a diagnostic tool integrated into the compiler that injects runtime checks into your executable. It exists To actively detect and report Undefined Behavior during testing, since the compiler normally assumes it never happens.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Compiler Optimization"?',
      options: [
        'a situation where the C++ standard imposes no requirements on what the program does. It exists To allow C++ to run as fast as possible by not requiring the compiler to inject runtime safety checks for every operation.',
        'the process where the compiler rewrites your code to run faster or use less memory. It exists To make abstractions (like function calls and loops) cost nothing at runtime.',
        'a diagnostic tool integrated into the compiler that injects runtime checks into your executable. It exists To actively detect and report Undefined Behavior during testing, since the compiler normally assumes it never happens.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Undefined Behavior (UB)"?',
      options: [
        'a separate region of memory maintained by a sanitizer to track the validity of the application\'s actual memory. It exists To provide a fast, parallel accounting system that can verify if a pointer access is legal without complex runtime structures.',
        'a situation where the C++ standard imposes no requirements on what the program does. It exists To allow C++ to run as fast as possible by not requiring the compiler to inject runtime safety checks for every operation.',
        'the process where the compiler rewrites your code to run faster or use less memory. It exists To make abstractions (like function calls and loops) cost nothing at runtime.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Undefined Behavior (UB)** — a situation where the C++ standard imposes no requirements on what the program does. It exists To allow C++ to run as fast as possible by not requiring the compiler to inject runtime safety checks for every operation.',
    '**Compiler Optimization** — the process where the compiler rewrites your code to run faster or use less memory. It exists To make abstractions (like function calls and loops) cost nothing at runtime.',
    '**Sanitizer** — a diagnostic tool integrated into the compiler that injects runtime checks into your executable. It exists To actively detect and report Undefined Behavior during testing, since the compiler normally assumes it never happens.',
    '**Shadow Memory** — a separate region of memory maintained by a sanitizer to track the validity of the application\'s actual memory. It exists To provide a fast, parallel accounting system that can verify if a pointer access is legal without complex runtime structures.',
  ],

  checkpoints: ['read-intuition'],
}
