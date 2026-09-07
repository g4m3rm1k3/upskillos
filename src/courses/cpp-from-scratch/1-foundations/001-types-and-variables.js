// cpp-from-scratch — Lesson 1: Types and Variables
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 01 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-01-types-and-variables',
  slug: 'types-and-variables',
  chapter: 1,
  order: 1,
  title: 'Types and Variables',
  subtitle: 'Foundations',
  tags: ['variable', 'value-type', 'type-safety', 'compile-time', 'runtime', 'type-inference'],

  hook: {
    question: 'What is "Types and Variables", and why does it matter?',
    realWorldContext: 'A series of isolated console programs that allocate memory for data, manipulate that data, and prove how the C++ compiler enforces rules about what that data represents. You will observe how values are copied in memory and how the compiler acts as a gatekeeper to prevent invalid operations before the program is ever allowed to run.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Value Types, Type Safety, Local Type Inference (auto).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Variable:** a named location in memory used to store data. It exists so that your program can store, retrieve, and manipulate data over time without needing to hardcode memory addresses.\n- **Value Type:** a category of data types where the variable directly contains its data. It exists to provide fast, stack-allocated storage for small, fundamental pieces of data.\n- **Type Safety:** a language feature ensuring that a variable is only used in ways consistent with its defined type. It exists to catch errors at compile time rather than crashing unexpectedly while the program is running.\n- **Compile Time:** the period when the C++ compiler translates your source code into executable instructions. It exists to validate the structure, syntax, and type safety of your code before it executes.\n- **Runtime:** the period when the executable instructions are actively executing on the computer. It exists to perform the actual computational work defined by your code.\n- **Type Inference:** the compiler\'s ability to deduce the type of a variable from the value assigned to it. It exists to reduce redundant typing without sacrificing the guarantees of type safety.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::cout:** The standard output stream representing the console.\n- **main:** The entry point of every C++ program.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how strict data typing governs data isolation and behavior: We define `int a = 10;`. The compiler allocates a memory block for an integer. We use type inference to create a copy: `auto b = a;`. The compiler infers `b` is also an `int`. We assign `b = 20;`. Because `int` is a value type, `a` remains `10`. We attempt to store text: `b = "twenty";`. The compiler strictly enforces type safety, completely rejecting the change because `b` was locked as an `int` at compile time, demonstrating that `auto` does not bypass the rules of static typing.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Without type safety, your programs would crash unpredictably when given incompatible data. Let\'s force the compiler to stop you. Open `main.cpp` and write this inside `main`: \n\n```cpp\nint target = "hello";\n```\n\nCompile the program: `g++ -std=c++17 main.cpp -o main` The compilation fails before the program ever runs. **The error:** `error: invalid conversion from \'const char*\' to \'int\'` The compiler caught the logic flaw. To fix it, you must respect the types. Restore it by either changing the value to a valid number, or declaring the appropriate type for text.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Create a `double` variable representing a price. Use `auto` to create a second variable that holds that price. Change the second variable. Print both to prove the first price did not change.\n- Create an `auto` variable and assign it the character `\'X\'`. On the next line, attempt to assign a string `"hello"` to that same variable. Run the compiler to observe the type inference locking the variable\'s type, causing a compile-time error.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written and executed code that proves changing a copied integer does not change the original.\n- [ ] You have intentionally triggered a compiler error by assigning the wrong data type to a variable.\n- [ ] You have verified that `auto` enforces type safety at compile time.\n- [ ] You can explain type safety out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 1: Types and Variables',
        caption: 'Types and Variables',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Value Types',
              prose: [
                'A program needs to hold onto information—numbers, characters, true/false states—so it can use them later. When you store this information, you need a guarantee that if you give a copy of this information to another part of your program, altering the copy will not accidentally overwrite the original data.',
                '## How the Code Works',
                '- `#include <iostream>` tells the compiler to copy the declarations for standard input and output routines into this file. Without this, the compiler will not know what `std::cout` is.\n- `int main()` defines the function where the operating system starts execution. It returns an `int` to the operating system to indicate success or failure.\n- `{` and `}` define the boundaries of the `main` function.\n- `int originalScore = 100;` declares a variable of type `int` (an integer) named `originalScore` and assigns it the value `100`. The compiler allocates memory specifically sized for an integer, because without exactly defining the size and shape of the data, the computer cannot safely store or retrieve it.\n- `double temperature = 98.6;` allocates memory for a double-precision floating-point number. The `double` type is used here because an `int` cannot store fractional values; attempting to do so would result in the compiler dropping the fraction.\n- `bool isOnline = true;` allocates memory for a boolean value. This works because a `bool` strictly represents binary logic (`true` or `false`), which is the fundamental unit of decision-making in computation.\n- `char grade = \'A\';` allocates memory for a single character. The single quotes are required to tell the compiler this is a character literal, not a variable name or text string.\n- `int copiedScore = originalScore;` creates a completely new `int` variable named `copiedScore`. It reads the value stored in `originalScore` (`100`) and writes that exact value into the new memory location belonging to `copiedScore`.\n- `copiedScore = 50;` overwrites the data in the memory location of `copiedScore`. Because `copiedScore` is a separate location in memory, this change affects only `copiedScore`. The original memory location remains completely untouched.\n- `std::cout << originalScore << "\\n";` prints the value of `originalScore`, followed by a newline character. `std::cout` represents the console output, and the `<<` operator pushes data into it.\n- `std::cout << copiedScore << "\\n";` prints the copied value. Because the variables are isolated in memory, printing `originalScore` outputs `100`, and printing `copiedScore` outputs `50`.\n- `return 0;` signals to the operating system that the program completed successfully.',
                '**CS lens.** This embodies the concept of "Pass by Value" and stack allocation. Small, fundamental units of data are stored directly where they are declared. When you assign one value type to another, the computer physically copies the binary data from one memory address to another, ensuring total isolation between the two variables.',
                '**SE lens.** The engineering principle is data isolation by default. The alternative not chosen is storing all variables as shared references. The tradeoff is that value types require copying memory every time they are assigned, which is incredibly fast for small data (like an `int`), but would be computationally expensive if applied to massive structures.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int originalScore = 100;\n    double temperature = 98.6;\n    bool isOnline = true;\n    char grade = \'A\';\n    \n    int copiedScore = originalScore;\n    copiedScore = 50;\n    \n    std::cout << originalScore << "\\n";\n    std::cout << copiedScore << "\\n";\n    return 0;\n}',
              expectedOutput: '100\n50',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Type Safety',
              prose: [
                'If a variable is designed to hold an integer, storing raw text inside it represents a catastrophic logic failure. If the program attempts to perform arithmetic on an incompatible type, the computer does not know how to process that instruction. We need the system to categorically refuse invalid data long before the code is actually executed.',
                '## How the Code Works',
                '- `int quantity = 5;` creates a variable strictly bound to the rules of integers.\n- `int badValue = "apples";` is commented out. If active, the compiler would refuse to compile the program because a string literal (`"apples"`) has a different memory layout than an integer. The compiler acts as a gatekeeper.\n- `char itemInitial = \'A\';` creates a variable strictly bound to the rules of a single character.\n- `std::cout << quantity << itemInitial << "\\n";` chains multiple values into the output stream. The `<<` operator is smart enough to handle different types appropriately because the compiler knows exactly what type `quantity` and `itemInitial` are.',
                '**CS lens.** This embodies Static Typing. The shape and constraints of every variable are evaluated against strict rules before the program is permitted to run. This is similar to a physical puzzle box: if you try to put a square peg in a round hole, the physical constraints prevent it immediately, rather than letting you drop it in and causing a jam later.',
                '**SE lens.** The alternative not chosen is Dynamic Typing (used by Python or JavaScript), where variables have no fixed type and can hold anything at any time. The real tradeoff here is friction versus safety. C++ forces you to explicitly declare intentions, which slows down initial development but drastically reduces runtime crashes in production by catching misalignments during compilation.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int quantity = 5;\n    \n    // The compiler requires strict types.\n    // If we want a character, we must provide one.\n    // Uncommenting the next line would cause a compiler error:\n    // int badValue = "apples";\n\n    char itemInitial = \'A\';\n    \n    std::cout << quantity << itemInitial << "\\n";\n    return 0;\n}',
              expectedOutput: '5A',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Local Type Inference (auto)',
              prose: [
                'When the type of a variable is blatantly obvious from the value being assigned to it, forcing the programmer to write out the type name is redundant. We need a way to let the compiler figure out the type automatically, without sacrificing the strict safety rules established in the previous unit.',
                '## How the Code Works',
                '- `auto year = 2024;` instructs the compiler to deduce the type of `year` by looking at the right side of the equals sign. Because `2024` is an integer literal, the compiler locks `year` to the `int` type. It is exactly identical to writing `int year = 2024;`.\n- `auto isComplete = false;` locks `isComplete` to the `bool` type because `false` is a boolean literal.\n- `auto grade = \'A\';` locks `grade` to the `char` type because of the single quotes.\n- `auto temperature = 98.6;` locks `temperature` to the `double` type because it has a fractional component.\n- `std::cout << year + 1 << "\\n";` performs integer math. If `auto` meant "dynamic type", the compiler wouldn\'t know if this was a valid operation until runtime. Because `auto` is statically typed, the compiler guarantees this math is valid before the program runs.',
                '**CS lens.** This embodies Type Inference. The compiler acts as a static analyzer, tracing the flow of data to prove the type without explicit annotation.',
                '**SE lens.** The alternative not chosen is requiring explicit type annotations everywhere. The tradeoff `auto` introduces is readability. While it saves keystrokes and makes code visually cleaner, it can obscure the exact type from the human reader if the right side of the assignment is a complex function call rather than an obvious literal.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    auto year = 2024;\n    auto isComplete = false;\n    auto grade = \'A\';\n    auto temperature = 98.6;\n\n    std::cout << year + 1 << "\\n";\n    return 0;\n}',
              expectedOutput: '2025',
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
      'Next lesson: Memory.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Value Type"?',
      options: [
        'the compiler\'s ability to deduce the type of a variable from the value assigned to it. It exists to reduce redundant typing without sacrificing the guarantees of type safety.',
        'a category of data types where the variable directly contains its data. It exists to provide fast, stack-allocated storage for small, fundamental pieces of data.',
        'a named location in memory used to store data. It exists so that your program can store, retrieve, and manipulate data over time without needing to hardcode memory addresses.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Compile Time"?',
      options: [
        'the period when the C++ compiler translates your source code into executable instructions. It exists to validate the structure, syntax, and type safety of your code before it executes.',
        'a named location in memory used to store data. It exists so that your program can store, retrieve, and manipulate data over time without needing to hardcode memory addresses.',
        'the compiler\'s ability to deduce the type of a variable from the value assigned to it. It exists to reduce redundant typing without sacrificing the guarantees of type safety.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Type Inference"?',
      options: [
        'the compiler\'s ability to deduce the type of a variable from the value assigned to it. It exists to reduce redundant typing without sacrificing the guarantees of type safety.',
        'a category of data types where the variable directly contains its data. It exists to provide fast, stack-allocated storage for small, fundamental pieces of data.',
        'a named location in memory used to store data. It exists so that your program can store, retrieve, and manipulate data over time without needing to hardcode memory addresses.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Type Safety"?',
      options: [
        'the period when the C++ compiler translates your source code into executable instructions. It exists to validate the structure, syntax, and type safety of your code before it executes.',
        'a named location in memory used to store data. It exists so that your program can store, retrieve, and manipulate data over time without needing to hardcode memory addresses.',
        'a language feature ensuring that a variable is only used in ways consistent with its defined type. It exists to catch errors at compile time rather than crashing unexpectedly while the program is running.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Variable** — a named location in memory used to store data. It exists so that your program can store, retrieve, and manipulate data over time without needing to hardcode memory addresses.',
    '**Value Type** — a category of data types where the variable directly contains its data. It exists to provide fast, stack-allocated storage for small, fundamental pieces of data.',
    '**Type Safety** — a language feature ensuring that a variable is only used in ways consistent with its defined type. It exists to catch errors at compile time rather than crashing unexpectedly while the program is running.',
    '**Compile Time** — the period when the C++ compiler translates your source code into executable instructions. It exists to validate the structure, syntax, and type safety of your code before it executes.',
    '**Runtime** — the period when the executable instructions are actively executing on the computer. It exists to perform the actual computational work defined by your code.',
    '**Type Inference** — the compiler\'s ability to deduce the type of a variable from the value assigned to it. It exists to reduce redundant typing without sacrificing the guarantees of type safety.',
  ],

  checkpoints: ['read-intuition'],
}
