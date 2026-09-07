// cpp-from-scratch — Lesson 15: Namespaces and Header Files
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 15 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-15-namespaces-and-header-files',
  slug: 'namespaces-and-header-files',
  chapter: 3,
  order: 1,
  title: 'Namespaces and Header Files',
  subtitle: 'Modern C++ Idioms',
  tags: ['namespace', 'header-file', 'source-file', 'translation-unit', 'linker', 'include-guard'],

  hook: {
    question: 'What is "Namespaces and Header Files", and why does it matter?',
    realWorldContext: 'A series of isolated console programs that organize code into separate compartments and distinct files, proving how the compiler reads declarations across file boundaries and how the linker ultimately stitches them together into a single executable.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Namespaces, The using Declaration, Header Files and Source Files, Include Guards, The Linker.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Namespace:** a named scope that groups related code together. It exists to prevent naming collisions when multiple libraries or parts of a program happen to use the exact same name for a function or class.\n- **Header File:** a file containing only the declarations (signatures) of functions and classes, not their implementations. It exists to tell the compiler the shape of the code before it sees the actual body, allowing different files to call each other\'s code.\n- **Source File:** a file containing the actual implementations (bodies) of functions and classes. It exists to hold the computational logic that is compiled into machine instructions.\n- **Translation Unit:** the ultimate result of a source file after the preprocessor resolves all its #include directives. It exists because the C++ compiler processes code strictly one unit at a time, in complete isolation from the rest of the program.\n- **Linker:** a tool that runs after the compiler, connecting the compiled translation units together. It exists to resolve the empty placeholders left by the compiler when a function was declared but implemented in a different file.\n- **Include Guard:** a directive preventing a header file from being pasted multiple times into the same translation unit. It exists to prevent compilation errors caused by the compiler seeing the exact same declaration twice.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::cout:** The standard character output stream.\n- **g++:** The GNU C++ compiler and linker driver.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe the lifecycle of a modern C++ project: We write `double calculate() { return 1.0; }` in a `.cpp` file, nesting it in `namespace Engine` to isolate the name. We declare the signature `double calculate();` inside a `.h` file, wrapped in `#pragma once` to prevent duplication. A second file uses `#include` to safely absorb the signature, and uses `using Engine::calculate;` to avoid typing the namespace over and over. The compiler validates each file in isolation, turning them into machine code. Finally, the linker unites the files, matching the call site in the second file to the exact machine instructions in the first.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Without the linker, your code can compile perfectly but never run. The compiler only verifies that you followed the rules of grammar; the linker verifies that the universe actually contains what you promised it did. Run the broken command from the Linker unit again: `g++ -std=c++17 main.cpp -o broken_program` **The error:** \n\n```\n/usr/bin/ld: /tmp/ccXXXXXX.o: in function `main\':\nmain.cpp:(.text+0x15): undefined reference to `square(double)\'\ncollect2: error: ld returned 1 exit status\n```\n\nThe error doesn\'t come from `g++` directly—it comes from `ld` (the GNU linker). It successfully found `main`, but halted at `undefined reference`. Fix it by supplying all necessary `.cpp` files to the compilation command.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Create a namespace `Math` and write a function `int add(int a, int b)`. In `main()`, call it using the `::` operator without any `using` declarations.\n- Create `logger.h` with an `#pragma once` guard and a function declaration `void log(std::string message);` (you will need `#include <string>` in the header). Implement it in `logger.cpp`, and call it from `main.cpp`. Compile all of them together.\n- Deliberately remove `#pragma once` from `logger.h`, include `logger.h` twice in `main.cpp` manually (`#include "logger.h"` written twice in a row), and attempt to compile. Observe the "redefinition" compiler error.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written and executed code that successfully isolates functions using namespaces.\n- [ ] You have used `#pragma once` to protect a header file from being included multiple times.\n- [ ] You have split a single program across a `.h` file, a `.cpp` implementation, and a `.cpp` entry point.\n- [ ] You have intentionally triggered a linker error by compiling a file without its required implementations.\n- [ ] You can explain the exact difference between the compiler and the linker out loud, in your own words.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 15: Namespaces and Header Files',
        caption: 'Namespaces and Header Files',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Namespaces',
              prose: [
                'When a codebase grows large, or when you use multiple external libraries, you inevitably encounter naming collisions. Two different programmers might both write a function named `calculateGravity()` or a class named `Window`. We need a way to isolate names so the compiler knows exactly which version we mean.',
                '## How the Code Works',
                '- `#include <iostream>` copies the standard input/output declarations into this file.\n- `namespace Physics { ... }` creates a named scope called `Physics`. Any function, class, or variable declared inside these braces belongs exclusively to this namespace.\n- `double calculateGravity() { ... }` inside `Physics` defines the function.\n- `namespace UI { ... }` creates a second, entirely separate boundary.\n- `double calculateGravity() { ... }` inside `UI` defines a function with the exact same name. Because it is in a different namespace, it does not conflict with the first one.\n- `int main() { ... }` defines the entry point of the program.\n- `double realGravity = Physics::calculateGravity();` calls the function. The `::` is the **scope resolution operator**. It tells the compiler to look strictly inside the `Physics` boundary for a function named `calculateGravity`.\n- `double screenGravity = UI::calculateGravity();` does the same for the `UI` boundary.\n- `std::cout << ...` uses the `::` operator to access `cout` from the `std` (standard) namespace.',
                '**CS lens.** This embodies the concept of a hierarchical namespace. It transforms a flat, global list of names into a structured tree. This is mathematically identical to a computer\'s file system, where you cannot have two files named `data.txt` in the same folder, but you can have one in `/physics/data.txt` and one in `/ui/data.txt`.',
                '**SE lens.** The engineering principle is encapsulation and collision prevention. The alternative not chosen is prefixing every name manually (like `Physics_calculateGravity()`), which is what older languages like C rely on. The tradeoff C++ makes is slightly more typing at the call site, but it fundamentally solves the problem of integrating third-party libraries without fear that their internal names will break your program.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nnamespace Physics {\n    double calculateGravity() {\n        return 9.81;\n    }\n}\n\nnamespace UI {\n    double calculateGravity() {\n        return 0.0;\n    }\n}\n\nint main() {\n    double realGravity = Physics::calculateGravity();\n    double screenGravity = UI::calculateGravity();\n    \n    std::cout << realGravity << "\\n";\n    std::cout << screenGravity << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The using Declaration',
              prose: [
                'Typing a full namespace path like `std::cout` or `Physics::calculateGravity()` repeatedly is tedious and clutters the code. We need a way to tell the compiler, "For the rest of this block, if I use this name, assume I mean the one from this specific namespace."',
                '## How the Code Works',
                '- `namespace Database { ... }` creates a namespace holding a `connect` function.\n- `using Database::connect;` tells the compiler that whenever it sees the bare word `connect` in this scope, it should assume it means `Database::connect`.\n- `using std::cout;` instructs the compiler that the bare word `cout` resolves to `std::cout`.\n- `connect();` calls the function without needing the `Database::` prefix.\n- `cout << "Finished.\\n";` uses the standard output stream without the `std::` prefix.',
                '**CS lens.** This embodies scope modification. The compiler maintains a lookup table (a symbol table) for the current scope. A `using` declaration injects a specific symbol from an external namespace directly into the local symbol table, bypassing the need for explicit path traversal.',
                '**SE lens.** The alternative is `using namespace std;`, which dumps *every* name from the standard library into the current scope. The tradeoff of targeting specific symbols (`using std::cout;`) instead of whole namespaces is that it takes a few extra lines of typing, but prevents catastrophic silent name collisions. If you dump a massive namespace and happen to create a function that shares a name with something inside it, the compiler might silently choose the wrong one, leading to bugs that are incredibly difficult to trace.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nnamespace Database {\n    void connect() {\n        std::cout << "Connecting to database...\\n";\n    }\n}\n\nint main() {\n    using Database::connect;\n    using std::cout;\n    \n    connect();\n    cout << "Finished.\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Header Files and Source Files',
              prose: [
                'Writing an entire program in one file becomes impossible to manage. We need to split code into multiple files. However, the C++ compiler reads files strictly from top to bottom, one at a time. If `main.cpp` calls a function defined in `math_utils.cpp`, the compiler will fail when reading `main.cpp` because it has no idea what that function looks like. We need a way to promise the compiler that a function exists and tell it the exact signature, without providing the full body.',
                '## How the Code Works',
                '- `double square(double x);` in the `.h` file is a **forward declaration**. It ends in a semicolon, not braces. It tells the compiler, "A function named `square` exists. It takes a `double` and returns a `double`. Trust me, you will find the body later."\n- `#include "math_utils.h"` in the `.cpp` files is a preprocessor command. Before the compiler even tries to understand the C++ code, the preprocessor physically copies the exact text from `math_utils.h` and pastes it into the `.cpp` file, replacing the `#include` line. The double quotes `""` tell the preprocessor to look in the current folder for the file, while brackets `<>` are reserved for system libraries.\n- `double square(double x) { return x * x; }` in `math_utils.cpp` is the **definition**. It provides the actual computational logic.\n- `square(5.0)` in `main.cpp` is the call. When the compiler reads `main.cpp`, it first pastes the header. Because it sees the declaration, it validates that `5.0` is a double, and permits the call.',
                '**CS lens.** This embodies the separation of Interface (the header) and Implementation (the source). It is a foundational concept in modular programming. You give other modules exactly the information they need to talk to your code (the interface), completely hiding the underlying complexity (the implementation).',
                '**SE lens.** The alternative not chosen is requiring the compiler to automatically scan the entire project folder to find definitions, which languages like Java and C# do. The tradeoff C++ makes requires you to manually manage headers. The benefit is compilation speed for massive codebases: if you change the internal logic of `math_utils.cpp` without altering `math_utils.h`, files that depend on the header (like `main.cpp`) do not need to be recompiled at all.'
              ],
              typeIt: true,
              solution: 'double square(double x);',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Include Guards',
              prose: [
                'Because `#include` literally copies and pastes text, including a file multiple times in the same chain creates a disaster. If `renderer.h` includes `shapes.h`, and `main.cpp` includes both, the preprocessor will paste `shapes.h` twice into `main.cpp`. The compiler will then see two identical declarations of the same struct and crash, refusing to redefine it. We need a way to tell the preprocessor to ignore a file if it has already been pasted.',
                '## How the Code Works',
                '- `#pragma once` is a preprocessor directive placed at the very top of a header file.\n- When the preprocessor processes `#include "engine.h"` in `main.cpp`, it copies the text of `engine.h`.\n- When it processes `#include "car.h"`, it copies the text of `car.h`.\n- Inside `car.h`, there is another `#include "engine.h"`. The preprocessor sees that it has already processed `engine.h` in this translation unit, and because of the `#pragma once` directive, it strictly refuses to copy the contents a second time.\n- The compiler ultimately receives a file with exactly one definition of `Engine` and one definition of `Car`.',
                '**CS lens.** This embodies idempotency. An operation is idempotent if doing it once has the same effect as doing it multiple times. `#pragma once` makes the act of including a header idempotent, protecting the system from recursive or duplicate state changes.',
                '**SE lens.** The older alternative to `#pragma once` is the "include guard" pattern, which involves wrapping the file in `#ifndef MY_HEADER_H`, `#define MY_HEADER_H`, and `#endif`. `#pragma once` achieves the exact same thing in a single line, is less error-prone (no risk of typos in the macro name), and is slightly faster for the compiler to process. It is supported by every modern C++ compiler, making the old macro pattern obsolete for new code.'
              ],
              typeIt: true,
              solution: '#pragma once\n\nstruct Engine {\n    int horsepower;\n};',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'The Linker',
              prose: [
                'When `main.cpp` is compiled, the compiler only checks that the functions it calls were declared in a header. It leaves a blank space in the compiled machine code where the actual function memory address should be. If the implementation is in a different file, how do these blank spaces get filled in so the program can actually execute?',
                '## How the Code Works',
                '- `g++ -c main.cpp` tells the compiler to compile the C++ text into machine code (creating `main.o` or `main.obj`), but strictly stop there. It does not attempt to create a final executable. This succeeds because `main.cpp` has the header, which is all the compiler requires to validate the grammar and types.\n- `g++ main.cpp -o broken_program` tells the compiler to compile the code *and* invoke the Linker to build the final executable. The compiler does its job, but the Linker throws a fatal error: `undefined reference to \'square(double)\'`. The Linker looked for the implementation of `square`, couldn\'t find it, and refused to output a broken program.\n- `g++ main.cpp math_utils.cpp -o program` gives the compiler both files. It compiles them both into object files behind the scenes, and passes both to the Linker. The Linker finds the empty placeholder in `main`\'s machine code, finds the actual address of `square` in `math_utils`\'s machine code, and stitches them together into the final `program`.',
                '**CS lens.** This embodies multi-stage processing and late binding. The task of translating human text into machine instructions (compiling) is strictly decoupled from the task of wiring those instructions together (linking).',
                '**SE lens.** The alternative not chosen is forcing the compiler to output a final executable immediately every time a single file is processed. The tradeoff of the compile-then-link pipeline is slightly more complex build commands. The massive advantage is incremental builds. In a project with 1,000 files, if you change one `.cpp` file, you only have to recompile that single file. The linker then quickly restitches the 1 new object file with the 999 old object files, reducing build times from hours to seconds.'
              ],
              typeIt: true,
              solution: 'g++ -std=c++17 -c main.cpp\ng++ -std=c++17 main.cpp -o broken_program\ng++ -std=c++17 main.cpp math_utils.cpp -o program',
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
      'Next lesson: Move Semantics.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Header File"?',
      options: [
        'a tool that runs after the compiler, connecting the compiled translation units together. It exists to resolve the empty placeholders left by the compiler when a function was declared but implemented in a different file.',
        'a directive preventing a header file from being pasted multiple times into the same translation unit. It exists to prevent compilation errors caused by the compiler seeing the exact same declaration twice.',
        'a file containing only the declarations (signatures) of functions and classes, not their implementations. It exists to tell the compiler the shape of the code before it sees the actual body, allowing different files to call each other\'s code.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Source File"?',
      options: [
        'the ultimate result of a source file after the preprocessor resolves all its #include directives. It exists because the C++ compiler processes code strictly one unit at a time, in complete isolation from the rest of the program.',
        'a file containing the actual implementations (bodies) of functions and classes. It exists to hold the computational logic that is compiled into machine instructions.',
        'a named scope that groups related code together. It exists to prevent naming collisions when multiple libraries or parts of a program happen to use the exact same name for a function or class.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Translation Unit"?',
      options: [
        'the ultimate result of a source file after the preprocessor resolves all its #include directives. It exists because the C++ compiler processes code strictly one unit at a time, in complete isolation from the rest of the program.',
        'a file containing the actual implementations (bodies) of functions and classes. It exists to hold the computational logic that is compiled into machine instructions.',
        'a named scope that groups related code together. It exists to prevent naming collisions when multiple libraries or parts of a program happen to use the exact same name for a function or class.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Linker"?',
      options: [
        'a tool that runs after the compiler, connecting the compiled translation units together. It exists to resolve the empty placeholders left by the compiler when a function was declared but implemented in a different file.',
        'a named scope that groups related code together. It exists to prevent naming collisions when multiple libraries or parts of a program happen to use the exact same name for a function or class.',
        'the ultimate result of a source file after the preprocessor resolves all its #include directives. It exists because the C++ compiler processes code strictly one unit at a time, in complete isolation from the rest of the program.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Namespace** — a named scope that groups related code together. It exists to prevent naming collisions when multiple libraries or parts of a program happen to use the exact same name for a function or class.',
    '**Header File** — a file containing only the declarations (signatures) of functions and classes, not their implementations. It exists to tell the compiler the shape of the code before it sees the actual body, allowing different files to call each other\'s code.',
    '**Source File** — a file containing the actual implementations (bodies) of functions and classes. It exists to hold the computational logic that is compiled into machine instructions.',
    '**Translation Unit** — the ultimate result of a source file after the preprocessor resolves all its #include directives. It exists because the C++ compiler processes code strictly one unit at a time, in complete isolation from the rest of the program.',
    '**Linker** — a tool that runs after the compiler, connecting the compiled translation units together. It exists to resolve the empty placeholders left by the compiler when a function was declared but implemented in a different file.',
    '**Include Guard** — a directive preventing a header file from being pasted multiple times into the same translation unit. It exists to prevent compilation errors caused by the compiler seeing the exact same declaration twice.',
  ],

  checkpoints: ['read-intuition'],
}
