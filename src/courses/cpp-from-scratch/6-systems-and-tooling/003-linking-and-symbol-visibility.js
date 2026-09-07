// cpp-from-scratch — Lesson 33: Linking and Symbol Visibility
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 33 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-33-linking-and-symbol-visibility',
  slug: 'linking-and-symbol-visibility',
  chapter: 6,
  order: 3,
  title: 'Linking and Symbol Visibility',
  subtitle: 'Systems and Tooling',
  tags: ['translation-unit', 'linker', 'one-definition-rule-odr', 'linkage', 'static-library', 'dynamic-library'],

  hook: {
    question: 'What is "Linking and Symbol Visibility", and why does it matter?',
    realWorldContext: 'A series of multi-file C++ programs that demonstrate how the compiler and linker resolve names across different files. You will cause linker errors on purpose to understand the One Definition Rule, then manage symbol visibility using `inline`, `static`, and `extern`. Finally, you will explore how these concepts map to static and dynamic libraries.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Translation Units and the Linker, The One Definition Rule (ODR), inline, static Linkage, extern.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Translation Unit:** a single .cpp source file and all the header files it includes, after the preprocessor has flattened them into one text stream. It exists so the compiler can process code in independent, parallel chunks rather than parsing the entire project at once.\n- **Linker:** a tool that takes the compiled output (object files) from multiple translation units and connects them into a final executable. It exists to match the promises made in one file (declarations) with their actual implementations (definitions) in another.\n- **One Definition Rule (ODR):** the strict C++ requirement that a variable or function can be declared many times, but defined exactly once across the entire program. It exists to prevent ambiguity, ensuring the linker never has to guess which implementation of a symbol to use.\n- **Linkage:** the rule governing whether a name defined in one translation unit can be seen by the linker when processing other units. It exists to let developers hide internal details and avoid name collisions between unrelated files.\n- **Static Library:** an archive of compiled object files that the linker copies directly into your final executable. It exists to bundle reusable code in a way that guarantees the resulting executable is completely self-contained.\n- **Dynamic Library:** a compiled library that remains a separate file (.dll, .so, or .dylib) and is loaded into memory only when the program runs. It exists to save memory and disk space by allowing multiple running programs to share a single copy of the library.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **g++:** The GNU C++ compiler and linker driver.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how a real project balances these visibility rules: You build a dynamic library (`.dll`). The public API functions are declared in a header and defined in `.cpp` files with external linkage so users can call them. You mark tiny getter methods as `inline` to avoid ODR violations when users include your headers. Inside the library, you hide your messy, internal helper functions using `static` linkage so their names don\'t conflict with functions in the user\'s own codebase.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you ignore the One Definition Rule, the build completely halts. If you ignore `static` linkage and let all helpers have external linkage, linking multiple large libraries together will result in symbol collisions (e.g., both libraries defined a global function named `init()`), requiring massive refactoring to fix.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Create a header file with a function `int square(int x) { return x * x; }`. Include it in two different `.cpp` files and write a `main` function to compile them. Verify it fails with an ODR error.\n- Add the `inline` keyword to `square` and recompile to prove the ODR violation is resolved.\n- Try to access an internal `static` function from another file by declaring its signature manually (`void helper();`). Observe the "undefined reference" error because the linker cannot see the `static` symbol.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled multiple `.cpp` files together and observed the linking phase succeed.\n- [ ] You have intentionally caused a multiple definition error by violating the ODR.\n- [ ] You have used `inline` to allow a function definition in a header file.\n- [ ] You have used `static` to hide a function from the linker.\n- [ ] You have used `extern` to share a global variable without violating ODR.\n- [ ] You can explain the difference between a static library and a dynamic library.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 33: Linking and Symbol Visibility',
        caption: 'Linking and Symbol Visibility',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Translation Units and the Linker',
              prose: [
                'When a project grows beyond a single file, you split it into multiple `.cpp` files. The compiler processes each file in complete isolation. If `main.cpp` calls a function defined in `math.cpp`, the compiler doesn\'t know what the function does—it only knows the signature provided by a header. A separate step is required to stitch the isolated pieces together.',
                '## How the Code Works',
                '- `int add(int a, int b) { ... }` in `math.cpp` is a **definition**. It provides the actual machine instructions for the function.\n- `int add(int a, int b);` in `main.cpp` is a **declaration**. It tells the compiler while processing `main.cpp`, "Trust me, a function with this signature exists. Let me call it."\n- `std::cout << add(5, 7) << "\\n";` calls the function. At compile time, the compiler leaves a blank spot (a symbol reference) for the address of `add`.\n- When both files are compiled and passed to the linker, the linker finds the definition in `math.cpp`\'s object file and fills in the blank spot in `main.cpp`\'s object file.',
                '**CS lens.** This embodies the separation of compilation and linking. The compiler translates high-level text into machine code (object files), but leaves unresolved addresses for external symbols. The linker is essentially a graph resolver: it walks through all object files, matching unresolved references (edges) to concrete definitions (nodes).',
                '**SE lens.** The engineering principle is modularity and parallel builds. By processing translation units in isolation, a build system like CMake can compile 100 source files simultaneously on a multi-core machine. If you change one `.cpp` file, only that file needs recompiling; the linker just quickly stitches the new object file with the 99 unchanged ones.'
              ],
              typeIt: true,
              solution: '// math.cpp\nint add(int a, int b) {\n    return a + b;\n}\n\n// main.cpp\n#include <iostream>\n\n// Declaration: promises the compiler that \'add\' exists somewhere.\nint add(int a, int b);\n\nint main() {\n    std::cout << add(5, 7) << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The One Definition Rule (ODR)',
              prose: [
                'Because header files are literally copy-pasted into source files by the preprocessor, putting a function definition inside a header means every `.cpp` file that includes it gets its own identical copy of the function. When the linker tries to combine them, it sees multiple identical definitions and doesn\'t know which one to pick.',
                '## How the Code Works',
                '- `int multiply(int a, int b) { ... }` defines a function inside a header.\n- `#include "utils.h"` in `a.cpp` copies the definition into `a.cpp`.\n- `#include "utils.h"` in `b.cpp` copies the definition into `b.cpp`.\n- `g++ -std=c++17 a.cpp b.cpp main.cpp` instructs the compiler to process both files. The compiler succeeds, because in isolation, `a.cpp` has exactly one definition of `multiply`, and `b.cpp` has exactly one definition.\n- The linker fails. It sees the symbol `multiply` defined in both `a.o` and `b.o`, and strict C++ rules forbid it from guessing which one is the "correct" one.',
                '**CS lens.** This embodies the One Definition Rule (ODR). A program can declare a symbol as many times as it wants (so the compiler knows its type), but there must be exactly one authoritative chunk of memory or machine code for it.',
                '**SE lens.** The tradeoff here is manual separation of interface and implementation. To solve this, C++ forces engineers to put declarations in `.h` files and definitions in exactly one `.cpp` file. This adds boilerplate compared to modern languages like Rust or Go, but it keeps the compiler fast and the linker unambiguous.'
              ],
              typeIt: true,
              solution: '// utils.h\nint multiply(int a, int b) {\n    return a * b;\n}\n\n// a.cpp\n#include "utils.h"\nint useA() { return multiply(2, 3); }\n\n// b.cpp\n#include "utils.h"\nint useB() { return multiply(4, 5); }\n\n// main.cpp\nint useA();\nint useB();\nint main() {\n    useA();\n    useB();\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'inline',
              prose: [
                'Sometimes, a function is so small (like a one-line getter) that putting its definition in a separate `.cpp` file feels tedious and hurts performance by preventing the compiler from substituting the code directly at the call site. We need a way to put a definition in a header file without violating the ODR when multiple translation units include it.',
                '## How the Code Works',
                '- `inline int subtract(...)` marks the function with the `inline` keyword.\n- `#include "math_inline.h"` pastes the definition into both `one.cpp` and `two.cpp`.\n- The `inline` keyword changes the ODR rules for this specific function. It tells the linker: "You might see multiple identical definitions of this function across different object files. Trust me, they are all exactly the same. Just pick one and discard the rest, or substitute the code directly."\n- The linker successfully merges the program without throwing a "multiple definition" error.',
                '**CS lens.** This embodies Link-Time Deduplication. Historically, `inline` was a hint to the compiler to inject the function\'s assembly directly at the call site (avoiding the overhead of a jump instruction). Today, modern compilers optimize and inline functions regardless of the keyword. The actual semantic meaning of `inline` in modern C++ is purely an ODR exemption: "allow multiple identical definitions and merge them."',
                '**SE lens.** The alternative not chosen is forcing all definitions into `.cpp` files. The tradeoff of using `inline` extensively (which is what template and header-only libraries do) is slower compile times, because every time you include the header, the compiler has to parse and generate code for the function over and over, only for the linker to throw away the duplicates at the very end.'
              ],
              typeIt: true,
              solution: '// math_inline.h\ninline int subtract(int a, int b) {\n    return a - b;\n}\n\n// one.cpp\n#include "math_inline.h"\nint callOne() { return subtract(10, 2); }\n\n// two.cpp\n#include "math_inline.h"\n#include <iostream>\nint callOne();\nint main() {\n    std::cout << callOne() << " and " << subtract(10, 5) << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'static Linkage',
              prose: [
                'You write a complex algorithm in a `.cpp` file and create a small helper function, like `cleanInput()`. Later, a teammate writes their own `.cpp` file and also names a helper function `cleanInput()`. Even though neither of you put the function in a header file, the linker will see both and throw a multiple definition ODR error. You need a way to tell the linker that a function is private to its specific translation unit.',
                '## How the Code Works',
                '- `static void logMessage()` defines a function in `parser.cpp`. In C++, applying `static` to a free-standing function or global variable changes its **linkage** to "internal."\n- `static void logMessage()` in `network.cpp` does the same.\n- Internal linkage means the symbol name is never exported to the linker. The linker literally cannot see `logMessage` when connecting the object files.\n- `parse()` calls its local `logMessage()`, and `connect()` calls its local `logMessage()`. There is no conflict because the compiler resolved the addresses locally before the linker was even invoked.',
                '**CS lens.** This embodies Internal Linkage (Information Hiding). By keeping symbols local to the translation unit, you avoid polluting the global namespace. (Note: in modern C++, using an anonymous namespace `namespace { void logMessage() {} }` achieves the exact same thing and is preferred, but `static` is extremely common in legacy codebases).',
                '**SE lens.** The engineering principle is encapsulation. The tradeoff of making a helper function `static` is that it is completely untestable from the outside. A unit test cannot call `logMessage()` to verify its behavior; it can only test `parse()` and assume `logMessage()` works.'
              ],
              typeIt: true,
              solution: '// parser.cpp\n#include <iostream>\n\nstatic void logMessage() {\n    std::cout << "Parser log\\n";\n}\n\nvoid parse() { logMessage(); }\n\n// network.cpp\n#include <iostream>\n\nstatic void logMessage() {\n    std::cout << "Network log\\n";\n}\n\nvoid connect() { logMessage(); }\n\n// main.cpp\nvoid parse();\nvoid connect();\nint main() {\n    parse();\n    connect();\n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'extern',
              prose: [
                'If `static` hides a variable or function, how do you explicitly share a global variable across multiple files? If you define `int systemState = 0;` in a header, the ODR will cause a multiple definition error when included twice. We need a way to declare a variable without defining it, so the linker can wire it up later.',
                '## How the Code Works',
                '- `extern int maxConnections;` in `config.h` is a pure declaration. The `extern` keyword tells the compiler: "The memory for this integer is allocated in some other translation unit. Do not allocate memory here; just leave a reference for the linker."\n- `int maxConnections = 100;` in `config.cpp` is the sole definition. This is where the ODR is satisfied.\n- `#include "config.h"` in `main.cpp` gives `main.cpp` visibility to the `extern` declaration, allowing the compiler to successfully compile `main.cpp`.\n- The linker matches the external reference from `main.o` to the memory address defined in `config.o`.',
                '**CS lens.** This embodies External Linkage. Functions have external linkage by default (which is why you don\'t need to write `extern void parse();`). Variables do not, so to share global state, you must explicitly use `extern` to decouple the declaration of a variable\'s type from the allocation of its memory.',
                '**SE lens.** The alternative not chosen is putting global state inside classes as `static` members (which also require out-of-line definitions). Using `extern` global variables is widely considered an anti-pattern in modern C++ because it creates hidden dependencies and race conditions in multi-threaded programs. However, it is fundamentally how operating system APIs (like `errno` in POSIX) are provided to C++ programs.'
              ],
              typeIt: true,
              solution: '// config.h\n// Declaration only: tells the compiler the variable exists elsewhere.\nextern int maxConnections;\n\n// config.cpp\n// Definition: allocates the actual memory.\nint maxConnections = 100;\n\n// main.cpp\n#include "config.h"\n#include <iostream>\n\nint main() {\n    std::cout << "Max connections: " << maxConnections << "\\n";\n    return 0;\n}',
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
      'Next lesson: Undefined Behavior.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "One Definition Rule (ODR)"?',
      options: [
        'the strict C++ requirement that a variable or function can be declared many times, but defined exactly once across the entire program. It exists to prevent ambiguity, ensuring the linker never has to guess which implementation of a symbol to use.',
        'an archive of compiled object files that the linker copies directly into your final executable. It exists to bundle reusable code in a way that guarantees the resulting executable is completely self-contained.',
        'the rule governing whether a name defined in one translation unit can be seen by the linker when processing other units. It exists to let developers hide internal details and avoid name collisions between unrelated files.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Dynamic Library"?',
      options: [
        'a tool that takes the compiled output (object files) from multiple translation units and connects them into a final executable. It exists to match the promises made in one file (declarations) with their actual implementations (definitions) in another.',
        'a compiled library that remains a separate file (.dll, .so, or .dylib) and is loaded into memory only when the program runs. It exists to save memory and disk space by allowing multiple running programs to share a single copy of the library.',
        'the rule governing whether a name defined in one translation unit can be seen by the linker when processing other units. It exists to let developers hide internal details and avoid name collisions between unrelated files.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Static Library"?',
      options: [
        'a tool that takes the compiled output (object files) from multiple translation units and connects them into a final executable. It exists to match the promises made in one file (declarations) with their actual implementations (definitions) in another.',
        'an archive of compiled object files that the linker copies directly into your final executable. It exists to bundle reusable code in a way that guarantees the resulting executable is completely self-contained.',
        'a compiled library that remains a separate file (.dll, .so, or .dylib) and is loaded into memory only when the program runs. It exists to save memory and disk space by allowing multiple running programs to share a single copy of the library.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Translation Unit"?',
      options: [
        'an archive of compiled object files that the linker copies directly into your final executable. It exists to bundle reusable code in a way that guarantees the resulting executable is completely self-contained.',
        'the rule governing whether a name defined in one translation unit can be seen by the linker when processing other units. It exists to let developers hide internal details and avoid name collisions between unrelated files.',
        'a single .cpp source file and all the header files it includes, after the preprocessor has flattened them into one text stream. It exists so the compiler can process code in independent, parallel chunks rather than parsing the entire project at once.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Translation Unit** — a single .cpp source file and all the header files it includes, after the preprocessor has flattened them into one text stream. It exists so the compiler can process code in independent, parallel chunks rather than parsing the entire project at once.',
    '**Linker** — a tool that takes the compiled output (object files) from multiple translation units and connects them into a final executable. It exists to match the promises made in one file (declarations) with their actual implementations (definitions) in another.',
    '**One Definition Rule (ODR)** — the strict C++ requirement that a variable or function can be declared many times, but defined exactly once across the entire program. It exists to prevent ambiguity, ensuring the linker never has to guess which implementation of a symbol to use.',
    '**Linkage** — the rule governing whether a name defined in one translation unit can be seen by the linker when processing other units. It exists to let developers hide internal details and avoid name collisions between unrelated files.',
    '**Static Library** — an archive of compiled object files that the linker copies directly into your final executable. It exists to bundle reusable code in a way that guarantees the resulting executable is completely self-contained.',
    '**Dynamic Library** — a compiled library that remains a separate file (.dll, .so, or .dylib) and is loaded into memory only when the program runs. It exists to save memory and disk space by allowing multiple running programs to share a single copy of the library.',
  ],

  checkpoints: ['read-intuition'],
}
