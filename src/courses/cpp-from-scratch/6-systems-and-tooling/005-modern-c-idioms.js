// cpp-from-scratch — Lesson 35: Modern C++ Idioms
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 35 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-35-modern-c-idioms',
  slug: 'modern-c-idioms',
  chapter: 6,
  order: 5,
  title: 'Modern C++ Idioms',
  subtitle: 'Systems and Tooling',
  tags: ['vocabulary-type', 'the-narrowest-contract', 'non-owning-view'],

  hook: {
    question: 'What is "Modern C++ Idioms", and why does it matter?',
    realWorldContext: 'You will write a series of isolated, throwaway C++ programs that pass data between functions. Each program will prove how modern C++ vocabulary types enforce a strict, specific contract between the caller and the function, eliminating unnecessary memory allocations, null pointer bugs, and ambiguous sentinel values. These examples are explicitly discarded after each unit; they never become part of a larger project.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: std::string_view, std::span, std::optional, std::variant, std::any.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Vocabulary type:** A standard library type that exists purely to express a specific meaning or contract in function signatures, rather than to do heavy computation itself. It exists To give programmers a shared, standard way to say "this might be missing" or "this is a read-only view" without inventing custom types for every project.\n- **The Narrowest Contract:** The software engineering principle of choosing the most restrictive type that still allows a function to do its job. It exists Broad types (like taking a std::string when you only need to read it, or returning a raw pointer when you mean "optional value") force the compiler to allow behaviors the function wasn\'t actually designed to handle. Narrow types turn those misuses into compile-time errors.\n- **Non-owning view:** A type that looks at memory belonging to someone else, but is not responsible for allocating or freeing it. It exists To allow fast, zero-copy read access to data without the overhead of copying or the danger of manual pointer arithmetic.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::string_view:** A non-owning, read-only view of a contiguous sequence of characters.\n- **std::span / size:** A non-owning view of a contiguous sequence of objects.\n- **std::optional / has_value / value:** A wrapper that contains either a value of type T, or nothing.\n- **std::variant / std::get / std::holds_alternative:** A type-safe union that holds exactly one value from a predefined list of types.\n- **std::any / std::any_cast:** A type-safe container for single values of any copy-constructible type.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: '**Connect the pieces:** Consider a generic configuration parser function. By applying the Narrowest Contract, we define the signature based on exactly what the function does. It takes `std::string_view` for the filename (because it only reads the name, without owning it). It returns `std::optional<std::variant<int, std::string>>` (because the file might fail to load, and if it succeeds, the setting must be strictly an integer or a string). If it took `std::string` and returned `std::any`, it would demand unnecessary memory allocations and force the caller to guess the returned type. **What breaks without this:** If you change `std::optional<int> id = parse_id("guest");` to an integer that uses `0` as a sentinel: `int id = parse_id("guest");` And later `parse_id` is updated to return legitimate `0` for the root user, your `if (id == 0)` failure check now falsely rejects valid users. The lack of an explicit `optional` contract causes a silent, catastrophic logic bug. **Exercises:** 1. Write a function that takes a `std::span<int>` and a `std::string_view` prefix, and prints the prefix before each number. Call it with both a `std::vector` and a raw array. 2. Modify the `std::variant` example to add a fourth type: `double`. Update the `print_setting` function to handle it, and create a `Setting` initialized with `3.14`. 3. Try compiling the `std::span` example with `-std=c++17`. Read the compiler error to understand how crucial language version flags are for modern vocabulary types. **Definition of done:** - [ ] You have run all five examples and seen their outputs. - [ ] You have deleted all the example files. - [ ] You can explain why `std::string_view` is preferred over `const std::string&`. - [ ] You understand that `std::optional` replaces sentinel values like `nullptr` or `-1`. - [ ] You can articulate the principle of the Narrowest Contract.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 35: Modern C++ Idioms',
        caption: 'Modern C++ Idioms',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'std::string_view',
              prose: [
                'When a function needs to read a string, taking `const std::string&` is the classic choice. However, if you pass a string literal like `"hello"` to that function, C++ creates a temporary, hidden `std::string`, allocates memory on the heap, copies "hello" into it, passes the reference, and then immediately destroys it. This invisible allocation happens every single time the function is called with a raw C-string. You need a type whose contract says "I will only look at characters, I don\'t care who owns them, and I will never allocate memory to do so."',
                '## How the Code Works',
                '- `#include <string_view>`: The header providing the `std::string_view` type.\n- `std::string_view name`: The function parameter. It holds exactly two things internally: a pointer to the start of the characters, and a length. It does not own the characters.\n- `print_greeting(dynamic_name)`: A `std::string` implicitly converts to a `std::string_view`. The view simply records the pointer to `dynamic_name`\'s internal buffer and its size.\n- `print_greeting("Bob")`: A string literal (a `const char*`) implicitly converts to a `std::string_view`. The compiler counts the characters at compile time, and the view points directly to the read-only memory segment where `"Bob"` lives. No `std::string` is ever created, and the heap is never touched.',
                '**CS lens.** This is the "fat pointer" pattern. A normal pointer only knows *where* memory starts; it relies on a null-terminator `\\0` to know where it ends. A fat pointer pairs the address with an explicit length, making bounds checking fast and safe (an O(1) operation) while entirely removing the need to scan for null terminators.',
                '**SE lens.** The alternative not chosen is overloading the function: `void print_greeting(const std::string&)` and `void print_greeting(const char*)`. The tradeoff there is code duplication. By adhering to the principle of the Narrowest Contract, `std::string_view` asks for exactly what it needs: a read-only sequence of characters. It refuses to demand a specific memory layout or ownership model, making the function maximally reusable.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n#include <string_view>\n\nvoid print_greeting(std::string_view name) {\n    std::cout << "Hello, " << name << "!\\n";\n}\n\nint main() {\n    std::string dynamic_name = "Alice";\n    \n    // No allocation here: string_view just points to dynamic_name\'s buffer.\n    print_greeting(dynamic_name); \n    \n    // No allocation here: string_view just points to the literal in binary.\n    print_greeting("Bob"); \n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'std::span',
              prose: [
                'When a function needs to process a list of numbers, taking `const std::vector<int>&` forces callers to put their data into a `std::vector`. If they have a raw array, a `std::array`, or just a subset of a vector, they must copy their data into a new temporary `std::vector` just to call your function. You need a generic, non-owning view for *any* contiguous block of memory, not just characters.',
                '## How the Code Works',
                '- `#include <span>`: The header for `std::span` (introduced in C++20).\n- `std::span<const int> numbers`: Declares a view over a contiguous sequence of integers. The `const` means this specific span refuses to modify the elements, fulfilling the narrowest contract: "I only read."\n- `numbers.size()`: Returns the number of elements the span covers. Unlike raw pointers, the span knows its own length.\n- `print_numbers(vec)`: The `std::vector` implicitly converts to a span. The span grabs the vector\'s underlying data pointer and size.\n- `print_numbers(arr)` and `print_numbers(raw)`: The compiler knows the size of `std::array` and raw arrays at compile time, so it automatically configures the span with the correct length. No size arguments need to be passed manually.',
                '**CS lens.** Like `std::string_view`, `span` is a non-owning fat pointer, but generalized via templates to work with any data type. It bridges the gap between C-style memory (raw arrays) and C++ object-oriented containers without forcing the performance penalty of copying data between them.',
                '**SE lens.** The alternative not chosen is passing a pointer and a size: `void print_numbers(const int* ptr, size_t size)`. The tradeoff there is safety: humans forget to pass the size, or pass the wrong size, causing buffer overflows. `std::span` encapsulates both pieces of data into a single, type-safe unit, completely neutralizing the risk of a mismatched size argument.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <span>\n#include <array>\n\nvoid print_numbers(std::span<const int> numbers) {\n    std::cout << "Span size: " << numbers.size() << "\\n";\n    for (int num : numbers) {\n        std::cout << num << " ";\n    }\n    std::cout << "\\n";\n}\n\nint main() {\n    std::vector<int> vec = {1, 2, 3};\n    std::array<int, 2> arr = {4, 5};\n    int raw[] = {6, 7, 8, 9};\n\n    print_numbers(vec); // Views the vector\'s buffer\n    print_numbers(arr); // Views the array\'s buffer\n    print_numbers(raw); // Views the raw C-array\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::optional',
              prose: [
                'When a function searches for something and fails, how does it report failure? Returning `-1`, `""`, or a null pointer are "sentinel values." But what if `-1` is actually a valid answer? Using sentinels forces the caller to remember arbitrary rules ("Oh right, -1 means failure here") and causes silent bugs when they forget to check. You need a type whose explicit contract is "this value might legitimately not exist."',
                '## How the Code Works',
                '- `#include <optional>`: The header for `std::optional`.\n- `std::optional<int>`: The return type. It reserves enough memory on the stack for an `int`, plus an extra hidden boolean flag to track whether the integer is currently "alive" or not.\n- `return 42`: Implicitly wraps the integer `42` inside an `optional` and sets the internal "alive" flag to true.\n- `return std::nullopt`: A standard constant representing an empty state. It sets the `optional`\'s "alive" flag to false.\n- `id.has_value()`: Checks the internal boolean flag. Without this check, you are flying blind.\n- `id.value()`: Extracts the actual integer. If the optional is empty, calling `.value()` throws a `std::bad_optional_access` exception, actively preventing you from using garbage memory.',
                '**CS lens.** This is the concept of an Algebraic Data Type (specifically, a "Sum Type" of `T + Nothing`). By encoding the possibility of absence directly into the type system, the compiler forces the programmer to acknowledge it.',
                '**SE lens.** The alternative not chosen is passing a pointer (`int* parse_id(...)`) so you can return `nullptr` on failure. The tradeoff is heap allocation and memory management overhead just to communicate "not found." `std::optional` lives entirely on the stack, requiring zero heap allocations, providing absolute safety with maximum performance.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <optional>\n#include <string>\n#include <string_view>\n\nstd::optional<int> parse_id(std::string_view input) {\n    if (input == "admin") {\n        return 42;\n    }\n    return std::nullopt;\n}\n\nint main() {\n    std::optional<int> id = parse_id("guest");\n    \n    if (id.has_value()) {\n        std::cout << "Found ID: " << id.value() << "\\n";\n    } else {\n        std::cout << "No ID found.\\n";\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'std::variant',
              prose: [
                'Sometimes a configuration file or a network payload can hold different types of data in the same field: a setting might be an integer (`Port: 80`), a string (`Host: "localhost"`), or a boolean (`Enabled: true`). You could create a struct with all three fields and leave two blank, but that wastes memory and leaves the contract ambiguous ("Which field is the real one?"). You need a type-safe way to say "this is exactly one of these three things, and nothing else."',
                '## How the Code Works',
                '- `#include <variant>`: The header for `std::variant`.\n- `std::variant<int, std::string, bool>`: Defines a closed set of allowed types. The compiler calculates the size of the largest type (likely `std::string`) and reserves exactly that much memory, plus a small integer index to remember which type is currently active.\n- `Setting s1 = 8080`: Assigns an integer. The variant stores the `8080` in its memory block and updates its hidden index to indicate "Type 0 (int) is active."\n- `std::holds_alternative<int>(val)`: Checks the variant\'s hidden index. It returns true if the variant currently holds an `int`.\n- `std::get<int>(val)`: Extracts the integer. If the variant actually holds a string at this moment, this throws a `std::bad_variant_access` exception.',
                '**CS lens.** This is a "tagged union" (or true Sum Type: `A + B + C`). C-style unions overlap memory but rely on the programmer to blindly remember what was stored last, leading to undefined behavior if read incorrectly. A tagged union enforces safety by managing the "tag" (the index of the active type) internally and mathematically preventing unsafe reads.',
                '**SE lens.** The alternative not chosen is Object-Oriented inheritance (`class Setting`, derived `IntSetting`, `StringSetting`, etc.) combined with `dynamic_cast`. The tradeoff there is massive boilerplate, heap allocations for every setting, and pointer indirection overhead. `std::variant` keeps everything contiguous on the stack with zero dynamic allocation, and represents a "closed" architecture: the compiler knows every possible type up front.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <variant>\n#include <string>\n\nusing Setting = std::variant<int, std::string, bool>;\n\nvoid print_setting(const Setting& val) {\n    if (std::holds_alternative<int>(val)) {\n        std::cout << "Int: " << std::get<int>(val) << "\\n";\n    } else if (std::holds_alternative<std::string>(val)) {\n        std::cout << "String: " << std::get<std::string>(val) << "\\n";\n    } else if (std::holds_alternative<bool>(val)) {\n        std::cout << "Bool: " << (std::get<bool>(val) ? "true" : "false") << "\\n";\n    }\n}\n\nint main() {\n    Setting s1 = 8080;\n    Setting s2 = std::string("localhost");\n    \n    print_setting(s1);\n    print_setting(s2);\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'std::any',
              prose: [
                'If `std::variant` is a strictly locked menu of choices, occasionally you need a container with no rules at all. If you are building a generic plugin system, a scripting language interpreter, or an event bus where users can attach literal arbitrary objects that your core system has never seen before, you cannot know the types at compile time. You need a type whose contract is "I will hold absolutely anything."',
                '## How the Code Works',
                '- `#include <any>`: The header for `std::any`.\n- `std::any storage = 42`: Creates an `any` object. Because it has no idea how large the incoming type might be, `std::any` usually allocates memory on the heap to store the data, and records C++ `type_info` to remember what it is holding.\n- `std::any_cast<int>(storage)`: The extraction mechanism. You must explicitly declare the exact type you believe is inside.\n- `storage = std::string(...)`: Overwrites the `any`. The old integer is destroyed, new memory is likely allocated, and it becomes a string.\n- `catch (const std::bad_any_cast& e)`: If you request a `float` but it holds a `std::string`, `any_cast` throws. The C++ runtime intervenes before undefined behavior can occur.',
                '**CS lens.** This is dynamic typing implemented in a statically typed language. It acts exactly like variables in Python or JavaScript. It works through "Type Erasure": the container forgets the specific type at compile time but embeds a runtime metadata tag so it can check identity later.',
                '**SE lens.** The alternative not chosen is a `void*` (a raw memory pointer with no type). The tradeoff is that `void*` provides zero safety: if you cast a string to an integer, it just silently reads garbage memory and crashes later. `std::any` trades a small amount of performance (allocations and type checks) to guarantee that you either guess the type exactly right, or receive an immediate, handled exception. It is the widest possible contract, representing an explicit abandonment of compile-time safety when flexibility is mandatory.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <any>\n#include <string>\n\nint main() {\n    std::any storage = 42;\n    \n    // We must guess the type perfectly to get it out.\n    int number = std::any_cast<int>(storage);\n    std::cout << "Stored: " << number << "\\n";\n    \n    // Changing the type dynamically\n    storage = std::string("Now I am a string");\n    \n    try {\n        // Deliberately guessing wrong to show the safety net\n        float mistake = std::any_cast<float>(storage);\n    } catch (const std::bad_any_cast& e) {\n        std::cout << "Caught an error: " << e.what() << "\\n";\n    }\n    \n    return 0;\n}',
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
      'This is the final lesson of the course — nice work getting here.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Non-owning view"?',
      options: [
        'A type that looks at memory belonging to someone else, but is not responsible for allocating or freeing it. It exists To allow fast, zero-copy read access to data without the overhead of copying or the danger of manual pointer arithmetic.',
        'The software engineering principle of choosing the most restrictive type that still allows a function to do its job. It exists Broad types (like taking a std::string when you only need to read it, or returning a raw pointer when you mean "optional value") force the compiler to allow behaviors the function wasn\'t actually designed to handle. Narrow types turn those misuses into compile-time errors.',
        'A standard library type that exists purely to express a specific meaning or contract in function signatures, rather than to do heavy computation itself. It exists To give programmers a shared, standard way to say "this might be missing" or "this is a read-only view" without inventing custom types for every project.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Vocabulary type"?',
      options: [
        'The software engineering principle of choosing the most restrictive type that still allows a function to do its job. It exists Broad types (like taking a std::string when you only need to read it, or returning a raw pointer when you mean "optional value") force the compiler to allow behaviors the function wasn\'t actually designed to handle. Narrow types turn those misuses into compile-time errors.',
        'A standard library type that exists purely to express a specific meaning or contract in function signatures, rather than to do heavy computation itself. It exists To give programmers a shared, standard way to say "this might be missing" or "this is a read-only view" without inventing custom types for every project.',
        'A type that looks at memory belonging to someone else, but is not responsible for allocating or freeing it. It exists To allow fast, zero-copy read access to data without the overhead of copying or the danger of manual pointer arithmetic.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "The Narrowest Contract"?',
      options: [
        'The software engineering principle of choosing the most restrictive type that still allows a function to do its job. It exists Broad types (like taking a std::string when you only need to read it, or returning a raw pointer when you mean "optional value") force the compiler to allow behaviors the function wasn\'t actually designed to handle. Narrow types turn those misuses into compile-time errors.',
        'A standard library type that exists purely to express a specific meaning or contract in function signatures, rather than to do heavy computation itself. It exists To give programmers a shared, standard way to say "this might be missing" or "this is a read-only view" without inventing custom types for every project.',
        'A type that looks at memory belonging to someone else, but is not responsible for allocating or freeing it. It exists To allow fast, zero-copy read access to data without the overhead of copying or the danger of manual pointer arithmetic.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Vocabulary type** — A standard library type that exists purely to express a specific meaning or contract in function signatures, rather than to do heavy computation itself. It exists To give programmers a shared, standard way to say "this might be missing" or "this is a read-only view" without inventing custom types for every project.',
    '**The Narrowest Contract** — The software engineering principle of choosing the most restrictive type that still allows a function to do its job. It exists Broad types (like taking a std::string when you only need to read it, or returning a raw pointer when you mean "optional value") force the compiler to allow behaviors the function wasn\'t actually designed to handle. Narrow types turn those misuses into compile-time errors.',
    '**Non-owning view** — A type that looks at memory belonging to someone else, but is not responsible for allocating or freeing it. It exists To allow fast, zero-copy read access to data without the overhead of copying or the danger of manual pointer arithmetic.',
  ],

  checkpoints: ['read-intuition'],
}
