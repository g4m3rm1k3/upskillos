// cpp-from-scratch — Lesson 25: Template Specialization
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 25 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-25-template-specialization',
  slug: 'template-specialization',
  chapter: 4,
  order: 5,
  title: 'Template Specialization',
  subtitle: 'Templates and Compile-Time Programming',
  tags: ['template-specialization', 'full-specialization', 'partial-specialization', 'if-constexpr'],

  hook: {
    question: 'What is "Template Specialization", and why does it matter?',
    realWorldContext: 'You will write generic types that automatically change their underlying logic when provided with specific types like booleans or pointers. The transferable problem this solves is handling edge cases in generic programming—where 99% of types behave one way, but one specific type requires a completely different approach—without losing the compiler\'s strict type safety or incurring runtime performance penalties.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Full Specialization, Partial Specialization, if constexpr.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Template specialization:** Overriding a generic template with a specific implementation for a particular type or category of types. It exists To allow edge cases (like how bool is stored differently than other primitives) to have their own optimized logic without breaking the unified generic interface.\n- **Full specialization:** A template override that locks down every single generic parameter to an exact, specific type. It exists To handle one absolute type differently from the rest.\n- **Partial specialization:** A template override that locks down the shape of a type (like a pointer or an array) while keeping the underlying type generic. It exists To handle whole categories of types (e.g., all pointers need to be dereferenced) without writing a separate specialization for int, double, etc.\n- **if constexpr:** A conditional statement evaluated entirely at compile time, discarding the false branches before the program is built. It exists To branch logic based on types within a single function, avoiding the boilerplate of writing separate template specialization structs just to change one line of code.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::is_same_v:** A compile-time type trait that checks if two types are perfectly identical.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'When writing generic C++ code, you have tools to handle exceptions to the generic rule at different scales. If a type needs entirely different state or a different layout, use full specialization (`template <> struct`). If an entire category of types (like pointers) shares a structural difference, use partial specialization (`template <typename T> struct <T*>`). If the overall structure is identical but a few lines of logic differ based on type, handle it inline with `if constexpr`.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you try to use a standard `if` statement to call a type-specific method in a generic function, compilation will fail. Modify the `processValue` function in the last example to use a regular `if` instead of `if constexpr`, and attempt to call a string-specific method: \n\n```cpp\n#include <iostream>\n#include <type_traits>\n#include <string>\n\ntemplate <typename T>\nvoid processValue(T value) {\n    if (std::is_same_v<T, std::string>) {\n        std::cout << value.length() << "\\n";\n    }\n}\n\nint main() {\n    processValue(42);\n    return 0;\n}\n```\n\n**The compiler error:** `error: request for member ‘length’ in ‘value’, which is of non-class type ‘int’` Even though the `if` condition would be `false` for `int`, the standard `if` statement still requires both sides of the branch to be valid C++ for whatever type is passed in. An `int` doesn\'t have a `.length()` method, so it crashes the compiler. Restoring `if constexpr` deletes the `value.length()` branch entirely when `T` is `int`, making it perfectly safe.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Full Specialization:** Write a generic `template <typename T> struct DefaultValue` that has a `print()` method printing `"No default"`. Then write a full specialization for `double` that prints `"0.0"`. Test both in `main()`.\n- **Partial Specialization:** Write a generic `template <typename T> struct SizeTracker` that prints `"Normal size"`. Write a partial specialization for arrays `template <typename T, int N> struct SizeTracker<T[N]>` that prints `"Array of fixed size"`. Instantiate both.\n- **`if constexpr`:** Write a generic `template <typename T> void printTypeCategory(T val)`. Inside, use `if constexpr` and `std::is_integral_v<T>` to print `"Whole number"`, `std::is_floating_point_v<T>` to print `"Decimal number"`, and a fallback to print `"Other"`. Test with `5`, `3.14`, and `"Hello"`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have run a full specialization and seen the compiler pick the exact type match over the generic template.\n- [ ] You have run a partial specialization and seen it intercept pointers.\n- [ ] You have written an `if constexpr` branch and seen it execute logic specific to one type.\n- [ ] You can explain the difference between a runtime `if` and a compile-time `if constexpr` to someone who hasn\'t read this lesson.\n- [ ] You have run `git commit -am "Completed template specialization lesson concepts"` to save your progress.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 25: Template Specialization',
        caption: 'Template Specialization',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Full Specialization',
              prose: [
                'When you write a generic template, it assumes the code inside it works identically for every possible type. But sometimes, a specific type requires completely different logic. For example, printing a boolean as `1` or `0` might be fine for a generic formatter, but you might want it to explicitly print `"true"` or `"false"`.',
                '## How the Code Works',
                '- `template <typename T> struct Formatter`: The primary template blueprint. If the compiler doesn\'t find a more specific match, it falls back to generating a struct from this.\n- `template <>`: Declares a full specialization. The empty angle brackets tell the compiler "this template requires no further type deduction; the types are fully locked in."\n- `struct Formatter<bool>`: The name of the specialization. The `<bool>` tells the compiler exactly which instantiation of the primary blueprint is being overridden.\n- `Formatter<int> intFmt;`: Since there is no specialization for `int`, the compiler uses the primary template.\n- `Formatter<bool> boolFmt;`: The compiler intercepts this request and uses the specialized `Formatter<bool>` struct instead of the primary one.',
                '**CS lens.** This is compile-time polymorphism. Unlike runtime polymorphism (virtual functions), which checks an object\'s type while the program is running to decide which code to execute, template specialization decides *during compilation*. There is zero performance cost when the program runs.',
                '**SE lens.** The alternative not chosen is writing unrelated classes like `IntFormatter` and `BoolFormatter`. The tradeoff here is keeping the API unified. By specializing `Formatter<T>`, the caller doesn\'t have to change their naming scheme; they just ask for `Formatter<TheirType>` and the compiler routes it to the optimal implementation.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\ntemplate <typename T>\nstruct Formatter {\n    void print(T value) {\n        std::cout << "Generic: " << value << "\\n";\n    }\n};\n\ntemplate <>\nstruct Formatter<bool> {\n    void print(bool value) {\n        std::cout << "Boolean: " << (value ? "true" : "false") << "\\n";\n    }\n};\n\nint main() {\n    Formatter<int> intFmt;\n    intFmt.print(42);\n\n    Formatter<bool> boolFmt;\n    boolFmt.print(true);\n\n    return 0;\n}',
              expectedOutput: 'Generic: 42\nBoolean: true',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Partial Specialization',
              prose: [
                'Full specialization targets exactly one type (like `bool`). But what if you want to target a whole *category* of types? For instance, you want your template to behave one way for normal values, but a different way for pointers (like `int*` or `double*`), without hardcoding a separate specialization for every single pointer type.',
                '## How the Code Works',
                '- `template <typename T> struct Wrapper<T*>`: The syntax of partial specialization. The first `<typename T>` keeps `T` as an open parameter (unlike full specialization\'s empty `<>`), while the `<T*>` specifies the *shape* that triggers this specialization.\n- `Wrapper<int> w1;`: `int` is not a pointer. The compiler falls back to the primary template.\n- `Wrapper<int*> w2;`: The compiler matches `int*` against `T*`. It deduces `T` is `int`, and uses the specialized `T*` blueprint.',
                '**CS lens.** This is pattern matching at compile time. The compiler evaluates the requested type against the available template signatures from most specific to least specific, stopping at the first valid match.',
                '**SE lens.** The alternative not chosen is requiring the user to manually pass a flag indicating if they provided a pointer, or relying on function overloading instead of structs. The tradeoff here is structural complexity versus seamless consumption. Partial specialization allows you to write custom memory management for pointers inside generic containers (like `std::vector`) without burdening the end-user.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\ntemplate <typename T>\nstruct Wrapper {\n    void describe() {\n        std::cout << "A regular value\\n";\n    }\n};\n\ntemplate <typename T>\nstruct Wrapper<T*> {\n    void describe() {\n        std::cout << "A pointer to something\\n";\n    }\n};\n\nint main() {\n    Wrapper<int> w1;\n    w1.describe();\n\n    Wrapper<int*> w2;\n    w2.describe();\n\n    return 0;\n}',
              expectedOutput: 'A regular value\nA pointer to something',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'if constexpr',
              prose: [
                'Using structs to specialize templates is extremely verbose. If all you want to do is change one single line of code inside a generic function based on the type, writing an entire primary struct and a separate specialized struct is overkill. You need a way to branch logic *inside* a single function, but safely at compile time.',
                '## How the Code Works',
                '- `#include <type_traits>`: The standard library header providing compile-time type introspection utilities.\n- `if constexpr (...)`: A compile-time conditional branch. The compiler evaluates the condition while building the program. Whichever branch evaluates to false is literally erased from the compiled code.\n- `std::is_same_v<T, bool>`: A standard type trait that returns `true` if `T` and `bool` are exactly the same type, and `false` otherwise.',
                '**CS lens.** This is conditional compilation built directly into the language syntax. Before `if constexpr` (C++17), developers had to rely on template specialization or complex, unreadable tricks like SFINAE (Substitution Failure Is Not An Error) to achieve the same result.',
                '**SE lens.** The alternative not chosen is a regular `if` statement. The problem with a regular `if` is that all branches must still successfully compile, even if they never run. If you called a method that only exists on `T=int` inside a regular `if`, and then instantiated the template with `T=bool`, the compiler would fail trying to compile the dead `int` code for the `bool` type. `if constexpr` solves this by safely deleting the invalid dead code before it is fully verified.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <type_traits>\n\ntemplate <typename T>\nvoid processValue(T value) {\n    if constexpr (std::is_same_v<T, bool>) {\n        std::cout << "Processing bool: " << (value ? "true" : "false") << "\\n";\n    } else if constexpr (std::is_same_v<T, int>) {\n        std::cout << "Processing int: " << (value * 2) << "\\n";\n    } else {\n        std::cout << "Processing other type\\n";\n    }\n}\n\nint main() {\n    processValue(42);\n    processValue(true);\n    processValue(3.14);\n    return 0;\n}',
              expectedOutput: 'Processing int: 84\nProcessing bool: true\nProcessing other type',
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
      'Next lesson: Concepts.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "if constexpr"?',
      options: [
        'A conditional statement evaluated entirely at compile time, discarding the false branches before the program is built. It exists To branch logic based on types within a single function, avoiding the boilerplate of writing separate template specialization structs just to change one line of code.',
        'A template override that locks down the shape of a type (like a pointer or an array) while keeping the underlying type generic. It exists To handle whole categories of types (e.g., all pointers need to be dereferenced) without writing a separate specialization for int, double, etc.',
        'Overriding a generic template with a specific implementation for a particular type or category of types. It exists To allow edge cases (like how bool is stored differently than other primitives) to have their own optimized logic without breaking the unified generic interface.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Full specialization"?',
      options: [
        'Overriding a generic template with a specific implementation for a particular type or category of types. It exists To allow edge cases (like how bool is stored differently than other primitives) to have their own optimized logic without breaking the unified generic interface.',
        'A conditional statement evaluated entirely at compile time, discarding the false branches before the program is built. It exists To branch logic based on types within a single function, avoiding the boilerplate of writing separate template specialization structs just to change one line of code.',
        'A template override that locks down every single generic parameter to an exact, specific type. It exists To handle one absolute type differently from the rest.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Partial specialization"?',
      options: [
        'A template override that locks down every single generic parameter to an exact, specific type. It exists To handle one absolute type differently from the rest.',
        'Overriding a generic template with a specific implementation for a particular type or category of types. It exists To allow edge cases (like how bool is stored differently than other primitives) to have their own optimized logic without breaking the unified generic interface.',
        'A template override that locks down the shape of a type (like a pointer or an array) while keeping the underlying type generic. It exists To handle whole categories of types (e.g., all pointers need to be dereferenced) without writing a separate specialization for int, double, etc.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Template specialization"?',
      options: [
        'A template override that locks down the shape of a type (like a pointer or an array) while keeping the underlying type generic. It exists To handle whole categories of types (e.g., all pointers need to be dereferenced) without writing a separate specialization for int, double, etc.',
        'A template override that locks down every single generic parameter to an exact, specific type. It exists To handle one absolute type differently from the rest.',
        'Overriding a generic template with a specific implementation for a particular type or category of types. It exists To allow edge cases (like how bool is stored differently than other primitives) to have their own optimized logic without breaking the unified generic interface.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Template specialization** — Overriding a generic template with a specific implementation for a particular type or category of types. It exists To allow edge cases (like how bool is stored differently than other primitives) to have their own optimized logic without breaking the unified generic interface.',
    '**Full specialization** — A template override that locks down every single generic parameter to an exact, specific type. It exists To handle one absolute type differently from the rest.',
    '**Partial specialization** — A template override that locks down the shape of a type (like a pointer or an array) while keeping the underlying type generic. It exists To handle whole categories of types (e.g., all pointers need to be dereferenced) without writing a separate specialization for int, double, etc.',
    '**if constexpr** — A conditional statement evaluated entirely at compile time, discarding the false branches before the program is built. It exists To branch logic based on types within a single function, avoiding the boilerplate of writing separate template specialization structs just to change one line of code.',
  ],

  checkpoints: ['read-intuition'],
}
