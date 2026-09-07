// cpp-from-scratch — Lesson 4: References
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 04 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-04-references',
  slug: 'references',
  chapter: 1,
  order: 4,
  title: 'References',
  subtitle: 'Foundations',
  tags: ['reference', 'pass-by-value', 'pass-by-reference'],

  hook: {
    question: 'What is "References", and why does it matter?',
    realWorldContext: 'A series of isolated console programs that alias variables, pass them to functions without copying memory, and demonstrate the structural differences between references and pointers at the compiler level. This lesson contains only throwaway code to isolate and prove these concepts.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: The Copying Problem (Pass by Value), What a Reference Is, Passing by Reference, References vs. Pointers.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Reference:** an alias for an existing variable. It exists to allow a program to give multiple names to the exact same piece of memory, enabling direct access without copying data.\n- **Pass by Value:** a mechanism where a function receives a separate copy of the data. It exists to guarantee that a function cannot accidentally alter the caller\'s original variable, isolating state safely.\n- **Pass by Reference:** a mechanism where a function receives direct access to the original data rather than a copy. It exists to avoid the performance cost of copying large amounts of data, and to allow a function to intentionally modify the caller\'s data.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::string:** A standard library type that stores and manages sequences of text.\n- **std::cout:** The standard output stream.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how references and pointers dictate memory interaction: We define data. By default, passing that data to a function makes a full copy, eating memory and isolating the function from the caller\'s state. To share the original data, we use a reference. Unlike a pointer, which is a separate variable holding an address that can be reassigned or nulled, a reference acts as a permanent, compiler-enforced alias to the original data. Passing by reference gives the function direct access to the memory without the structural overhead of pointer arithmetic or dereferencing.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Without references, avoiding large copies requires pointers. This introduces nullability risks everywhere. Let\'s see how a reference removes this risk. Open a terminal and run `touch invalid_reference.cpp`. Add this code: \n\n```cpp\nint main() {\n    int& badRef;\n    return 0;\n}\n```\n\nCompile it with `g++ -std=c++17 invalid_reference.cpp -o invalid_reference`. The compilation fails before the program ever runs. **The error:** `error: declaration of reference variable \'badRef\' requires an initializer` The compiler caught the flaw. Unlike a pointer, which could be left uninitialized and crash your program at runtime, a reference *must* be bound to a valid variable the instant it is created.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Create a function that takes two `int` parameters by value, and swaps their values. Call it from `main` and print the results to prove that pass-by-value failed to swap the caller\'s variables.\n- Change the function signature to take two `int&` parameters instead. Recompile and run to observe the successful swap.\n- Declare an `int` variable and a pointer to it. Then, try to declare a reference to that pointer. Manipulate the value through the reference.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written and executed code that proves pass-by-value copies data.\n- [ ] You have written and executed code that proves references alias memory and avoid copying.\n- [ ] You have intentionally triggered a compiler error by leaving a reference uninitialized.\n- [ ] You have verified the behavioral difference between pointer reassignment and reference reassignment.\n- [ ] You can explain the structural difference between a pointer and a reference out loud, in your own words.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 4: References',
        caption: 'References',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Copying Problem (Pass by Value)',
              prose: [
                'When you hand data to a function, the language must decide how that data is delivered. By default, the language creates a brand-new variable and copies the data into it. This is safe, but it means the function cannot alter the original data, and if the data is large (like a massive body of text), copying it repeatedly wastes memory and time.',
                '## How the Code Works',
                '- `#include <iostream>` includes the standard library for terminal output.\n- `#include <string>` includes the standard library for text sequences, so we can work with a piece of data more substantial than a simple integer.\n- `void attemptChange(std::string text)` declares a function that takes a `std::string` argument. By default, `text` is a brand-new, independent memory location allocated specifically for this function call.\n- `text = "Changed!";` overwrites the contents of that new, independent memory location.\n- `std::string originalMessage = "Original";` allocates memory in `main` and stores the starting text.\n- `attemptChange(originalMessage);` calls the function. The computer reads the characters from `originalMessage`, physically copies them to the new memory location belonging to `text`, and then executes the function body.\n- `std::cout << originalMessage << "\\n";` prints the value from `main`\'s memory. It prints "Original" because `attemptChange` only modified its own isolated copy.',
                '**CS lens.** This embodies the concept of "Pass by Value." The caller and the callee have strict memory isolation. The callee receives an identical, independent clone of the data, not the data itself.',
                '**SE lens.** The design principle here is isolation by default. The alternative not chosen is having functions share the exact same memory location automatically. The tradeoff is performance versus safety: copying an integer takes almost no time, but copying a list of a million items every time a function is called would bring a program to a halt. Pass by value prioritizes safety against unintended modifications at the cost of execution speed for large structures.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nvoid attemptChange(std::string text) {\n    text = "Changed!";\n}\n\nint main() {\n    std::string originalMessage = "Original";\n    attemptChange(originalMessage);\n    std::cout << originalMessage << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'What a Reference Is',
              prose: [
                'If we want to avoid copying memory, or if we specifically want two parts of a program to talk about the exact same location in memory, we need a way to give an existing memory location a second name without duplicating its contents.',
                '## How the Code Works',
                '- `int originalScore = 100;` allocates standard memory for an integer and stores 100.\n- `int& aliasedScore = originalScore;` declares a **reference**. The ampersand operator (`&`), when attached directly to a type (`int&`), tells the compiler this is not a new variable. It is an alias—a second name—for the exact same physical memory location as `originalScore`.\n- `aliasedScore = 50;` writes the value 50 into the memory. Because `aliasedScore` is just another name for `originalScore`, this writes 50 directly over the original 100.\n- `std::cout << originalScore << "\\n";` prints 50.\n- `std::cout << aliasedScore << "\\n";` prints 50. There is only one integer in memory, just accessed through two different names.',
                '**CS lens.** This embodies Memory Aliasing. It allows multiple identifiers in a program to route to the exact same physical hardware address, avoiding the overhead of creating parallel data structures.',
                '**SE lens.** The alternative not chosen is forcing the programmer to use raw memory addresses (pointers) whenever they want to share data. The tradeoff here is syntactic safety versus flexibility: a reference must be bound to a real variable the exact moment it is created and can never be reassigned to point at something else later. This removes an entire class of bugs where a reference might accidentally point to nothing (null), at the cost of being permanently locked to its initial target.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int originalScore = 100;\n    int& aliasedScore = originalScore;\n    \n    aliasedScore = 50;\n    \n    std::cout << originalScore << "\\n";\n    std::cout << aliasedScore << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Passing by Reference',
              prose: [
                'We established that passing large data by value creates slow, expensive copies, and prevents a function from updating the caller\'s data. By combining function arguments with references, we can solve both issues at once.',
                '## How the Code Works',
                '- `void actualChange(std::string& text)` declares a function that takes a reference (`&`). The compiler does not allocate new memory for a copy of the string. Instead, `text` becomes a direct alias to whatever existing variable is handed to it.\n- `text = "Changed!";` writes new data directly into that shared memory location.\n- `std::string message = "Original";` allocates the memory in `main`.\n- `actualChange(message);` calls the function. No copying occurs. The name `text` inside the function temporarily routes to the exact same memory as `message`.\n- `std::cout << message << "\\n";` prints "Changed!" because the function altered the original memory directly, unhindered by pass-by-value isolation.',
                '**CS lens.** This embodies "Pass by Reference." The callee is given direct, unmediated access to the caller\'s memory. This is foundational in systems programming for achieving zero-copy data processing.',
                '**SE lens.** The tradeoff is lost local certainty. When you pass by value, you know with absolute certainty that your variable will not change after the function returns. When you pass by reference, you surrender that guarantee. To regain it when you just want to avoid the performance cost of copying without allowing modification, C++ heavily relies on `const` references (`const std::string&`), enforcing read-only access at the compiler level while still preventing the copy.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nvoid actualChange(std::string& text) {\n    text = "Changed!";\n}\n\nint main() {\n    std::string message = "Original";\n    actualChange(message);\n    std::cout << message << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'References vs. Pointers',
              prose: [
                'C++ also has pointers (introduced previously), which store memory addresses and can be used to share data. If both pointers and references let us avoid copying and modify original data, why have both? We need to understand how a reference structurally differs from a pointer at the language level.',
                '## How the Code Works',
                '- `int* ptr = &targetA;` creates a pointer. The `&` here means "get the address of", not reference. The pointer itself is a distinct variable sitting in memory that stores `targetA`\'s numeric address.\n- `ptr = &targetB;` changes the address stored inside the pointer. It now points to `targetB`. This is valid because a pointer is its own independent variable.\n- `*ptr = 99;` uses the dereference operator (`*`) to follow the address and write `99` into `targetB`.\n- `int& ref = targetA;` creates a reference. Unlike a pointer, a reference is not structurally a separate variable you can manipulate. It is irrevocably welded to `targetA`.\n- `ref = targetB;` looks like it might make the reference point to `targetB`. It does not. Because `ref` is permanently welded to `targetA`, this line reads the value of `targetB` (20) and writes it directly into `targetA`.\n- `std::cout << "targetA: " << targetA << "\\n";` prints 20, because the reference assignment altered its value.\n- `std::cout << "targetB: " << targetB << "\\n";` prints 99, because the pointer was successfully re-seated and then dereferenced.',
                '**CS lens.** Pointers are indirect addressing made explicit as a first-class variable: they have their own memory, can point to nothing (`nullptr`), and can change targets. References are a syntactic abstraction provided by the compiler to create a permanent alias: they have no visible memory address of their own, cannot be null, and cannot be re-seated.',
                '**SE lens.** The engineering tradeoff is safety versus capability. Pointers are necessary for data structures like linked lists where relationships must change over time. References are safer and cleaner for function arguments because you never have to check if a reference is `nullptr`—the compiler guarantees it points to valid memory upon creation.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int targetA = 10;\n    int targetB = 20;\n\n    // Pointer approach\n    int* ptr = &targetA;\n    ptr = &targetB; \n    *ptr = 99;      \n\n    // Reference approach\n    int& ref = targetA;\n    ref = targetB;  \n\n    std::cout << "targetA: " << targetA << "\\n";\n    std::cout << "targetB: " << targetB << "\\n";\n    return 0;\n}',
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
      'Next lesson: Functions.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Pass by Value"?',
      options: [
        'an alias for an existing variable. It exists to allow a program to give multiple names to the exact same piece of memory, enabling direct access without copying data.',
        'a mechanism where a function receives direct access to the original data rather than a copy. It exists to avoid the performance cost of copying large amounts of data, and to allow a function to intentionally modify the caller\'s data.',
        'a mechanism where a function receives a separate copy of the data. It exists to guarantee that a function cannot accidentally alter the caller\'s original variable, isolating state safely.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Reference"?',
      options: [
        'a mechanism where a function receives direct access to the original data rather than a copy. It exists to avoid the performance cost of copying large amounts of data, and to allow a function to intentionally modify the caller\'s data.',
        'a mechanism where a function receives a separate copy of the data. It exists to guarantee that a function cannot accidentally alter the caller\'s original variable, isolating state safely.',
        'an alias for an existing variable. It exists to allow a program to give multiple names to the exact same piece of memory, enabling direct access without copying data.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Pass by Reference"?',
      options: [
        'an alias for an existing variable. It exists to allow a program to give multiple names to the exact same piece of memory, enabling direct access without copying data.',
        'a mechanism where a function receives direct access to the original data rather than a copy. It exists to avoid the performance cost of copying large amounts of data, and to allow a function to intentionally modify the caller\'s data.',
        'a mechanism where a function receives a separate copy of the data. It exists to guarantee that a function cannot accidentally alter the caller\'s original variable, isolating state safely.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Reference** — an alias for an existing variable. It exists to allow a program to give multiple names to the exact same piece of memory, enabling direct access without copying data.',
    '**Pass by Value** — a mechanism where a function receives a separate copy of the data. It exists to guarantee that a function cannot accidentally alter the caller\'s original variable, isolating state safely.',
    '**Pass by Reference** — a mechanism where a function receives direct access to the original data rather than a copy. It exists to avoid the performance cost of copying large amounts of data, and to allow a function to intentionally modify the caller\'s data.',
  ],

  checkpoints: ['read-intuition'],
}
