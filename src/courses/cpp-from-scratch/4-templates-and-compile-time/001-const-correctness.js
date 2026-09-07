// cpp-from-scratch — Lesson 21: const Correctness
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 21 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-21-const-correctness',
  slug: 'const-correctness',
  chapter: 4,
  order: 1,
  title: 'const Correctness',
  subtitle: 'Templates and Compile-Time Programming',
  tags: ['const-correctness', 'const-member-function', 'mutable'],

  hook: {
    question: 'What is "const Correctness", and why does it matter?',
    realWorldContext: 'You will write C++ code that explicitly declares which data is allowed to change and which is read-only. You will prove that the compiler enforces these rules, and you will see how failing to mark read-only data correctly breaks the code for anyone trying to use it.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: const Variables, const Pointers and References, const Member Functions, Const-Incorrect APIs Break Callers, mutable for Invisible State.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **const correctness:** the practice of using the const keyword everywhere a variable, pointer, reference, or method does not modify state. It exists To enlist the compiler in proving that data isn\'t accidentally modified, and to allow read-only data to flow through a program safely.\n- **const member function:** a method that is forbidden from modifying the object it belongs to. It exists So that you can still call methods on an object even when you only have read-only access to it.\n- **mutable:** a keyword applied to a class field that allows it to be modified even inside a const member function. It exists To permit internal housekeeping (like caching or read-counting) that doesn\'t affect the logical, outward-facing state of the object.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::string:** A standard library class representing a sequence of characters.\n- **std::cout / operator&lt;&lt;:** The standard output stream and its insertion operator.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace the full lifecycle of a value guarded by const correctness. 1. `std::string data = "Critical";` — a normal, modifiable value is created. 2. `void Process(const std::string& input)` — the value is passed to a function. The compiler safely narrows the access to read-only for the scope of the function. 3. `input.length()` — inside the function, a method is called on the object. The compiler checks `length()`\'s signature, sees it is marked `const`, and allows the call. 4. If `length()` needed to cache its result internally, it would update a `mutable` field, satisfying both the compiler\'s physical checks and the caller\'s logical expectations.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Without const correctness, the compiler cannot enforce your design intents. **The Broken Code:** \n\n```cpp\n#include <iostream>\n\nvoid UpdateScore(int* score) {\n    *score = -1; // Unintentional corruption\n}\n\nint main() {\n    int my_score = 100;\n    UpdateScore(&my_score); \n    std::cout << my_score << "\\n";\n    return 0;\n}\n```\n\n**The Output:** \n\n```text\n-1\n```\n\n*To fix it, you add `const` to the pointer parameter (`const int* score`). The compiler will then immediately flag the illegal assignment inside `UpdateScore` as an error before the code even runs.*',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Write a `Player` class with a `set_score` method and a `get_score` method. Try putting `const` on `set_score` and observe the compiler error.\n- Create a function that takes a `const Player&`. Try calling `set_score` on it.\n- Add a `mutable` boolean `was_read` to the `Player` class, and set it to true inside `get_score`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You understand that `const` physically prevents assignment.\n- [ ] You can pass large objects efficiently using `const` references without fear of modification.\n- [ ] You know to label read-only methods with `const` so they can be called on `const` objects.\n- [ ] You understand why a missing `const` in a parameter list breaks code that tries to use it.\n- [ ] You can explain const correctness out loud, in your own words, to someone who hasn\'t read this lesson.\n- [ ] You have committed your code: `git commit -m "Demonstrate const correctness so that the compiler enforces our read-only contracts"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 21: const Correctness',
        caption: 'const Correctness',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'const Variables',
              prose: [
                'When a value is meant to be read-only (like a maximum capacity or a fixed hardware address), leaving it as a normal variable allows other code to accidentally change it. The compiler won\'t stop the modification, leading to unpredictable behavior when the rest of the program assumes the value remained fixed.',
                '## First, In Isolation',
                '```cpp\nconst int max_players = 4;\nmax_players = 5;\n```',
                '## How the Code Works',
                '- `#include <iostream>` — includes the standard input/output stream library so we can print to the terminal.\n- `int main() { ... }` — the entry point of a C++ program.\n- `const` — the keyword that marks the data as immutable after initialization. Without it, the variable could be modified at any time.\n- `int` — the data type specifying we are storing an integer.\n- `max_players = 4;` — initialization of the variable. Because it is `const`, this is the only time it can be assigned a value.\n- `std::cout << ... << "\\n";` — basic, already-established syntax for printing to the console.',
                '**CS lens.** This is immutability. By guaranteeing that a value cannot change, we reduce the state space of a program, making it easier to reason about. Also recognized in: functional programming languages where all variables are immutable by default, hardware ROM (Read-Only Memory), and database primary keys.',
                '**SE lens.** The alternative not chosen is using a preprocessor macro `#define MAX_PLAYERS 4`. The tradeoff of `const` is that it creates a typed, scoped variable that the debugger can inspect, whereas macros are blind text-replacements that lack type safety and scope, polluting the global namespace.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    const int max_players = 4;\n    // max_players = 5; // The compiler will reject this\n    std::cout << "Max players: " << max_players << "\\n";\n    return 0;\n}',
              expectedOutput: 'Max players: 4',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'const Pointers and References',
              prose: [
                'When passing a large object to a function, copying it by value is slow. We pass by reference or pointer to avoid the copy (Lesson 04). However, doing so gives the function full power to modify the original object. We need a way to grant the performance of passing by reference without granting the permission to modify.',
                '## First, In Isolation',
                '```cpp\nvoid Cheat(const int* score_ptr) {\n    *score_ptr = 9999;\n}\n```',
                '## How the Code Works',
                '- `const std::string& name` — a reference to a string, marked `const`. The function accesses the original string without copying it, but the `const` qualifier explicitly forbids the function from altering it.\n- `const int* score_ptr` — a pointer to an integer, marked `const`. The pointer itself holds an address, but it promises not to modify the integer residing at that address. Without the `const`, the function could rewrite the caller\'s score.\n- `*score_ptr` — basic, already-established syntax for dereferencing a pointer to read its value.\n- `PrintPlayer(player_name, &score);` — passing a regular, non-`const` variable into a function that takes it as `const`. The compiler happily allows this, safely downgrading full-access to read-only access for the duration of the function call.',
                '**CS lens.** This is the Principle of Least Privilege. A function should only be given the permissions it strictly requires to do its job. A printing function only needs to read; giving it write access creates unnecessary risk. Also recognized in: file system permissions (read vs. write), database user roles, and CPU ring levels.',
                '**SE lens.** The alternative not chosen is passing by value (`void PrintPlayer(std::string name)`). The tradeoff of `const` references is that we must type slightly more complex syntax, but we gain identical safety to pass-by-value while completely avoiding the CPU and memory cost of duplicating the data.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nvoid PrintPlayer(const std::string& name, const int* score_ptr) {\n    std::cout << "Player: " << name << ", Score: " << *score_ptr << "\\n";\n}\n\nint main() {\n    std::string player_name = "Alice";\n    int score = 150;\n    \n    PrintPlayer(player_name, &score);\n    return 0;\n}',
              expectedOutput: 'Player: Alice, Score: 150',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'const Member Functions',
              prose: [
                'If you have a read-only view of an object (like a `const` reference), the compiler forbids you from calling any methods on it. The compiler cannot look inside every method to check if it modifies the object\'s fields. Unless explicitly told otherwise, the compiler assumes every method modifies the object, and blocks the call.',
                '## First, In Isolation',
                '```cpp\nstd::string GetName() { return name; }\n```',
                '## How the Code Works',
                '- `class Player { ... };` — basic, already-established syntax for defining a class blueprint.\n- `std::string GetName()` — declares a method returning a string.\n- `const` (after the parameter list) — modifies the implicit `this` pointer of the method, changing it from `Player* const this` to `const Player* const this`. This legally binds the method to a contract: it cannot modify any non-static members of the class. Without it, the compiler assumes the method mutates state.\n- `return name;` — reads the field. If we wrote `name = "hacked";` here, the compiler would block it because the method is `const`.\n- `void PrintName(const Player& p)` — receives the object as a read-only reference.\n- `p.GetName()` — succeeds because `GetName()` is certified as `const`, matching the read-only restriction on `p`.',
                '**CS lens.** This is contract-based design. The method signature acts as a binding contract between the caller and the implementer. The compiler is the enforcer, ensuring neither side violates the terms. Also recognized in: interface segregation, static type systems, and API schemas like OpenAPI.',
                '**SE lens.** The alternative not chosen is having the compiler perform deep flow analysis on every method body to automatically deduce if it changes state. The tradeoff of explicit `const` methods is that the programmer must manually label them, but this prevents a minor internal implementation change (like adding a debug counter) from silently changing the method\'s implicit signature and breaking distant callers.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nclass Player {\npublic:\n    std::string name;\n    \n    std::string GetName() const {\n        return name;\n    }\n};\n\nvoid PrintName(const Player& p) {\n    std::cout << p.GetName() << "\\n";\n}\n\nint main() {\n    Player p;\n    p.name = "Bob";\n    PrintName(p);\n    return 0;\n}',
              expectedOutput: 'Bob',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Const-Incorrect APIs Break Callers',
              prose: [
                'If you write a function or a method that only reads data, but you forget to mark its parameters or signature as `const`, you create a const-incorrect API. A caller who has `const` data is physically forbidden from passing their data to your function, even if your function doesn\'t actually modify anything.',
                '## First, In Isolation',
                '```cpp\nDisplayScore(read_only_score);\n```',
                '## How the Code Works',
                '- `void DisplayScore(int& current_score)` — the parameter lacks `const`. To the compiler, this signature explicitly requests write access, regardless of what the body actually does.\n- `void ProcessPlayer(const int& read_only_score)` — the parameter is `const`. This function only has read access.\n- `DisplayScore(read_only_score);` — the attempted handoff. The compiler checks permissions: the caller has read-only access, but the callee demands read-write. Request denied, compilation fails.',
                '**CS lens.** This is type system propagation. In type theory, `T` and `const T` are different types. A `T` can be implicitly coerced into a `const T` (shedding privileges is safe), but a `const T` cannot be coerced into a `T` (escalating privileges is unsafe). Also recognized in: taint tracking algorithms and information flow security.',
                '**SE lens.** The alternative not chosen is casting away constness using `const_cast`. The tradeoff of strict const-correctness is that applying it retroactively to a large codebase is notoriously difficult, because a single `const` missing at the bottom of a call chain requires changing every signature above it. This is why `const` must be applied from day one.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\n// Poorly written API: promises nothing, but only reads.\nvoid DisplayScore(int& current_score) {\n    std::cout << "Score: " << current_score << "\\n";\n}\n\nvoid ProcessPlayer(const int& read_only_score) {\n    // We only have read-only access. We try to call an API.\n    // DisplayScore(read_only_score); // ERROR!\n}\n\nint main() {\n    int score = 500;\n    ProcessPlayer(score);\n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'mutable for Invisible State',
              prose: [
                'Sometimes a method is logically `const` — to the outside world, it just reads data — but physically it needs to modify a hidden internal field, like updating a read-counter, locking a mutex, or caching a calculation. A `const` method is strictly forbidden from modifying any field, making this impossible.',
                '## First, In Isolation',
                '```cpp\nprivate:\n    int read_count = 0;\n```',
                '## How the Code Works',
                '- `mutable int read_count = 0;` — declares a field with the `mutable` specifier. This exempts the field from the class\'s `const` restrictions. Even if the entire object is `const`, this specific field can be modified. Without it, caching or read-tracking in `const` methods is impossible.\n- `int GetTemperature() const` — a const member function. Logically, getting the temperature shouldn\'t change the sensor\'s outward state.\n- `read_count++;` — inside the `const` method, we modify the field. Because of `mutable`, the compiler allows this operation.\n- `const Sensor s;` — the entire object is declared `const`.\n- `s.GetTemperature();` — calling the const method succeeds, and internally updates the counter.',
                '**CS lens.** This distinguishes between logical constness and physical constness. Physical constness means the raw bytes of the object in memory do not change. Logical constness means the observable state of the object does not change. `mutable` exists to allow logical constness even when physical constness is violated. Also recognized in: lazy evaluation architectures, memoization algorithms.',
                '**SE lens.** The alternative not chosen is forcing the caller to pass in a separate non-const tracking object to hold the metrics. The tradeoff of `mutable` is that it creates a backdoor in your immutability guarantees. Overusing it makes `const` meaningless, which is why it is reserved strictly for hidden, internal state like mutexes or caches.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass Sensor {\npublic:\n    int GetTemperature() const {\n        read_count++;\n        return 72; // Fake temperature\n    }\n\n    int GetReads() const {\n        return read_count;\n    }\n\nprivate:\n    mutable int read_count = 0;\n};\n\nint main() {\n    const Sensor s;\n    s.GetTemperature();\n    s.GetTemperature();\n    std::cout << "Reads: " << s.GetReads() << "\\n";\n    return 0;\n}',
              expectedOutput: 'Reads: 2',
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
      'Next lesson: constexpr and Compile-Time Computation.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "const correctness"?',
      options: [
        'the practice of using the const keyword everywhere a variable, pointer, reference, or method does not modify state. It exists To enlist the compiler in proving that data isn\'t accidentally modified, and to allow read-only data to flow through a program safely.',
        'a keyword applied to a class field that allows it to be modified even inside a const member function. It exists To permit internal housekeeping (like caching or read-counting) that doesn\'t affect the logical, outward-facing state of the object.',
        'a method that is forbidden from modifying the object it belongs to. It exists So that you can still call methods on an object even when you only have read-only access to it.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "mutable"?',
      options: [
        'a keyword applied to a class field that allows it to be modified even inside a const member function. It exists To permit internal housekeeping (like caching or read-counting) that doesn\'t affect the logical, outward-facing state of the object.',
        'a method that is forbidden from modifying the object it belongs to. It exists So that you can still call methods on an object even when you only have read-only access to it.',
        'the practice of using the const keyword everywhere a variable, pointer, reference, or method does not modify state. It exists To enlist the compiler in proving that data isn\'t accidentally modified, and to allow read-only data to flow through a program safely.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "const member function"?',
      options: [
        'a keyword applied to a class field that allows it to be modified even inside a const member function. It exists To permit internal housekeeping (like caching or read-counting) that doesn\'t affect the logical, outward-facing state of the object.',
        'the practice of using the const keyword everywhere a variable, pointer, reference, or method does not modify state. It exists To enlist the compiler in proving that data isn\'t accidentally modified, and to allow read-only data to flow through a program safely.',
        'a method that is forbidden from modifying the object it belongs to. It exists So that you can still call methods on an object even when you only have read-only access to it.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**const correctness** — the practice of using the const keyword everywhere a variable, pointer, reference, or method does not modify state. It exists To enlist the compiler in proving that data isn\'t accidentally modified, and to allow read-only data to flow through a program safely.',
    '**const member function** — a method that is forbidden from modifying the object it belongs to. It exists So that you can still call methods on an object even when you only have read-only access to it.',
    '**mutable** — a keyword applied to a class field that allows it to be modified even inside a const member function. It exists To permit internal housekeeping (like caching or read-counting) that doesn\'t affect the logical, outward-facing state of the object.',
  ],

  checkpoints: ['read-intuition'],
}
