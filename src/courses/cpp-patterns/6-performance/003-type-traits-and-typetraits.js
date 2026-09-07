// cpp-patterns — Lesson 17: Type Traits and <type_traits>
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 17 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-17-type-traits-and-typetraits',
  slug: 'type-traits-and-typetraits',
  chapter: 6,
  order: 3,
  title: 'Type Traits and <type_traits>',
  subtitle: 'Performance',
  tags: ['type-trait', 'metaprogramming', 'substitution-failure-is-not-an-error-sfinae'],

  hook: {
    question: 'What is "Type Traits and &lt;type_traits&gt;", and why does it matter?',
    realWorldContext: 'In this lesson, you will build and evaluate compile-time type inspections using the `<type_traits>` header. You will not build a standing project; instead, you will write a series of isolated templates that prove how C++ allows querying and transforming types at compile time before any runtime branching occurs. This solves the problem of writing generic code that must adapt its behavior or memory layout based on the exact type it is instantiated with, without paying a runtime cost.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 7 core ideas: std::is_same, std::is_integral, std::remove_reference, std::add_const, std::conditional, std::enable_if, Writing your own type trait.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Type Trait:** A template struct that yields a compile-time constant or type based on the properties of its template argument. It exists to let the compiler ask questions about types ("is this a pointer?", "are these two types the same?") and branch or substitute code accordingly before the program ever runs.\n- **Metaprogramming:** Writing code that executes at compile time to generate or verify the code that will actually run. Type traits are the fundamental building block of C++ metaprogramming, existing to automate type-safe code generation.\n- **Substitution Failure Is Not An Error (SFINAE):** A C++ compiler principle where an invalid template substitution does not immediately fail the build, but instead discards that candidate from overload resolution. It exists to allow conditional enabling of function overloads based on type properties.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::is_same:** A standard library type trait that checks if two types are exactly identical.\n- **std::is_integral:** A standard library type trait that checks if a type is a fundamental integer type.\n- **std::remove_reference:** A type transformation trait that strips & or && from a type.\n- **std::add_const:** A type transformation trait that adds a const qualifier to a type.\n- **std::conditional:** A compile-time if-then-else for types.\n- **std::enable_if:** A SFINAE tool that removes a function or class template from overload resolution if a condition is false.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Type traits represent a cohesive metaprogramming ecosystem: we use `std::is_same` or custom traits like `is_pointer` to query facts, route logic securely via `std::conditional` or `std::enable_if`, and actively sculpt memory layouts using transformers like `std::remove_reference` or `std::add_const`. Together, they shift immense analytical burden off the CPU at runtime, resolving it inside the compiler before an executable is ever built.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 17: Type Traits and <type_traits>',
        caption: 'Type Traits and <type_traits>',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'std::is_same',
              prose: [
                'When writing a generic template, we often need to know if two types are exactly the same type. This isn\'t about runtime equality of values (`a == b`), but compile-time identity of types (`T` vs `int`). If they are the same, we might want to optimize a copy operation or change how a function behaves, all without taking a runtime performance hit.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <type_traits>\n\ntemplate <typename T, typename U>\nvoid check_types() {\n    if constexpr (std::is_same<T, U>::value) {\n        std::cout << "Types are exactly the same.\\n";\n    } else {\n        std::cout << "Types are different.\\n";\n    }\n}\n\nint main() {\n    check_types<int, int>();\n    check_types<int, const int>();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <type_traits>`: A standard library preprocessor directive. It pulls in the declarations for all standard type traits, providing the foundational metaprogramming tools we need.\n- `bool`: A fundamental C++ type representing true or false. It is the return type of our function.\n- `test_same()`: A function declaration taking no arguments.\n- `{`: Opens the function body scope.\n- `return`: A C++ keyword that exits the function and passes the subsequent value back to the caller.\n- `std::`: The namespace scope resolution operator. It directs the compiler to look for the following name inside the C++ Standard Library namespace.\n- `is_same_v`: A variable template, which is a convenience helper for `std::is_same<...>::value`. It exists to save typing `::value` every time we evaluate a trait.\n- `<`: Opens the template argument list.\n- `int`: The first type argument, representing a standard integer.\n- `,`: Separates template arguments.\n- `signed int`: The second type argument. In C++, `int` is implicitly signed, meaning `int` and `signed int` are perfectly identical types.\n- `>`: Closes the template argument list.\n- `;`: Terminates the statement.\n- `}`: Closes the function body scope.',
                '**CS lens.** Type reflection. C++ lacks runtime reflection (the ability of a program to inspect its own structure while running), but it provides extensive **compile-time reflection** via type traits. Also recognized in: languages with dependent types, Rust\'s trait bounds, and Zig\'s `comptime` constructs.',
                '**SE lens.** Performance over flexibility. By shifting type inspection to the compiler, C++ ensures that generic code has zero runtime overhead. The tradeoff is increased compile times and deeply complex compiler error messages when type traits fail.'
              ],
              typeIt: true,
              solution: '#include <type_traits>\n\nbool test_same() {\n    return std::is_same_v<int, signed int>;\n}',
              expectedOutput: '1',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'std::is_integral',
              prose: [
                'Sometimes checking for exactly `int` is too narrow. We might want to accept `short`, `long`, `long long`, or `unsigned int`. Writing an `is_same` check for every possible integer type would be brittle and verbose.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <type_traits>\n\ntemplate <typename T>\nvoid print_if_integer(T val) {\n    if constexpr (std::is_integral_v<T>) {\n        std::cout << val << " is an integer.\\n";\n    } else {\n        std::cout << "Not an integer.\\n";\n    }\n}\n\nint main() {\n    print_if_integer(42);\n    print_if_integer(3.14);\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `template`: A C++ keyword declaring that the following construct is a blueprint, not a concrete function.\n- `<`: Opens the template parameter list.\n- `typename`: A keyword indicating that `T` is a placeholder for a type.\n- `T`: The name of the template type parameter.\n- `>`: Closes the parameter list.\n- `bool`: The return type of the function.\n- `check_integral()`: The function name and empty parameter list.\n- `{`: Opens the function body.\n- `return`: keyword to return a value.\n- `std::`: Standard library namespace.\n- `is_integral`: The type trait struct template that checks for integer types.\n- `<`: Opens trait template arguments.\n- `T`: We pass our function\'s template parameter directly into the trait.\n- `>`: Closes trait template arguments.\n- `::`: Scope resolution operator, used here to access a static member inside the `is_integral<T>` instantiated struct.\n- `value`: The `static constexpr bool` member of the trait struct that holds the actual true/false result.\n- `;`: Statement terminator.\n- `}`: Closes function body.',
                '**CS lens.** Type categorization. Grouping infinite possible types into finite, actionable categories allows algorithms to make assumptions about behavior (e.g., bitwise operations are only valid on integrals).',
                '**SE lens.** The Open-Closed Principle applied to types. We don\'t modify our function when a new architecture introduces a weird 128-bit integer type; as long as the standard library marks it as integral, our generic code automatically supports it.'
              ],
              typeIt: true,
              solution: 'template <typename T>\nbool check_integral() {\n    return std::is_integral<T>::value;\n}',
              expectedOutput: '1',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::remove_reference',
              prose: [
                'When dealing with templates and perfect forwarding, a type `T` might actually be a reference like `int&`. If we want to allocate a fresh, independent variable of that exact underlying type, declaring `T new_var;` would declare a reference, which fails because references must be initialized immediately. We need a way to strip the reference off.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <type_traits>\n\nint main() {\n    using RefType = int&;\n    using ValueType = std::remove_reference<RefType>::type;\n    \n    ValueType x = 10; // If this were int&, it would fail without initialization to an existing lvalue.\n    std::cout << x << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `template`: Begins template declaration.\n- `<typename T>`: Declares type parameter `T`.\n- `typename`: A critical C++ keyword here. Because `std::remove_reference<T>::type` depends on the template parameter `T`, the compiler doesn\'t know if `::type` is a static variable or a type. The `typename` keyword explicitly tells the compiler "treat what follows as a type name."\n- `std::remove_reference`: The transformation trait.\n- `<T>`: We pass our template parameter `T` into it.\n- `::`: Accesses members inside the instantiated struct.\n- `type`: The nested `typedef` or `using` alias inside the trait that holds the transformed result.\n- `strip`: The function name.\n- `(`: Opens function parameters.\n- `T&&`: A forwarding reference (because `T` is a template parameter). It binds to both lvalues and rvalues.\n- `arg`: The parameter name.\n- `)`: Closes parameters.\n- `{`: Opens function body.\n- `return arg;`: Returns the value. Since the return type has references stripped, this forces a copy.\n- `}`: Closes function body.',
                '**CS lens.** Type mapping. This represents a pure function executed during compilation: `f(Type) -> Type`. It\'s functional programming, but mapped over types instead of values.',
                '**SE lens.** Decoupling intent from caller arguments. `strip` guarantees it returns a value, regardless of whether the caller passed a temporary rvalue or an lvalue reference. This makes APIs predictable.'
              ],
              typeIt: true,
              solution: 'template <typename T>\ntypename std::remove_reference<T>::type strip(T&& arg) {\n    return arg;\n}',
              expectedOutput: 'x is 5, y is 10',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'std::add_const',
              prose: [
                'We have a mutable type, but we want to force it to be immutable in a specific template context to enforce safety.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <type_traits>\n\nint main() {\n    using NormalInt = int;\n    using ConstInt = std::add_const_t<NormalInt>;\n    \n    std::cout << std::is_same_v<ConstInt, const int> << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `template <typename T>`: Standard template declaration.\n- `void`: Return type, returns nothing.\n- `force_const`: Function name.\n- `(`: Opens arguments.\n- `std::add_const_t`: A variable template alias (ending in `_t`). It is shorthand for `typename std::add_const<...>::type`. It saves us from writing `typename` and `::type`.\n- `<`: Opens trait arguments.\n- `T`: The type parameter passed into the trait.\n- `>`: Closes trait arguments.\n- `&`: We append an lvalue reference to the resulting const type. The result is `const T&`.\n- `arg`: Parameter name.\n- `)`: Closes arguments.\n- `{`: Opens body.\n- `// arg is always const here`: A comment indicating the forced state.\n- `}`: Closes body.',
                '**CS lens.** Immutability constraints. We are programmatically weaving read-only enforcement into the type system rather than relying on programmer discipline.',
                '**SE lens.** Defensive programming. When generating complex types, using `add_const_t` ensures downstream template instantiations cannot accidentally mutate state.'
              ],
              typeIt: true,
              solution: 'template <typename T>\nvoid force_const(std::add_const_t<T>& arg) {\n    // arg is always const here\n}',
              expectedOutput: '1',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'std::conditional',
              prose: [
                'We want to declare a variable whose type changes based on a condition. For example, if memory is tight, we want a `short`, otherwise an `int`. Standard `if` statements only control execution flow; they cannot declare variables with different types in the same scope.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <type_traits>\n\nint main() {\n    constexpr bool use_small = true;\n    std::conditional_t<use_small, short, int> var = 32000;\n    \n    std::cout << sizeof(var) << " bytes\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `template`: Begins template.\n- `<`: Opens parameters.\n- `bool UseFloat`: A non-type template parameter. Instead of taking a type `T`, this template takes a concrete compile-time boolean value.\n- `>`: Closes parameters.\n- `using`: C++ keyword for creating a type alias (modern `typedef`).\n- `OptimalDecimal`: The name of our new custom alias template.\n- `=`: Assigns the alias meaning.\n- `std::conditional_t`: The type alias helper for `std::conditional<...>::type`.\n- `<`: Opens conditional arguments.\n- `UseFloat`: The boolean condition. If true, picks the first type.\n- `,`: Separator.\n- `float`: The type chosen if `UseFloat` is true.\n- `,`: Separator.\n- `double`: The type chosen if `UseFloat` is false.\n- `>`: Closes conditional arguments.\n- `;`: Statement terminator.',
                '**CS lens.** Compile-time branching. This is the structural equivalent of multiplexer logic in digital circuits, but executed by the compiler during the translation phase.',
                '**SE lens.** Memory and performance scaling. You can write a single math library that adapts its precision and memory footprint instantly based on a single compile-time flag, keeping the source code completely unified.'
              ],
              typeIt: true,
              solution: 'template <bool UseFloat>\nusing OptimalDecimal = std::conditional_t<UseFloat, float, double>;',
              expectedOutput: '4 8',
              code: '',
            },
            {
              id: 6,
              cellTitle: 'std::enable_if',
              prose: [
                'If a function template is meant only for integers, passing a `float` might compile but cause silent logical errors. We want to remove the function from the compiler\'s list of options entirely if the type is wrong, forcing an immediate compile error or allowing a different overload to be chosen.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <type_traits>\n\ntemplate <typename T>\ntypename std::enable_if<std::is_integral<T>::value, void>::type\nprocess(T val) {\n    std::cout << "Processing integer: " << val << "\\n";\n}\n\nint main() {\n    process(10);\n    // process(3.14); // This line would cause a compile error!\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `template`: Begins template.\n- `<`: Opens parameters.\n- `typename T`: The primary type parameter.\n- `,`: Separates parameters.\n- `typename`: Starts an unnamed template type parameter.\n- `=`: Assigns a default type for this unnamed parameter.\n- `std::enable_if_t`: The helper alias that yields `void` if the condition is true.\n- `<`: Opens arguments.\n- `std::is_integral_v<T>`: The condition: is `T` an integer?\n- `>`: Closes arguments.\n- `>`: Closes template parameters.\n- `void`: Return type.\n- `strict_print(T val)`: Function signature.\n- `{ std::cout << val << "\\n"; }`: Function body.\n*Why put it in the template parameters?* Placing SFINAE in a default template argument is much cleaner than mangling the return type, keeping the signature (`void strict_print(T val)`) highly readable.',
                '**CS lens.** Constraint satisfaction. We are defining bounded quantification: "for all types T such that T is an integer."',
                '**SE lens.** API guardrails. By actively removing overloads that don\'t make sense, we prevent downstream developers from misusing templates in ways that might accidentally compile but perform destructively at runtime.'
              ],
              typeIt: true,
              solution: 'template <typename T, typename = std::enable_if_t<std::is_integral_v<T>>>\nvoid strict_print(T val) {\n    std::cout << val << "\\n";\n}',
              expectedOutput: '42',
              code: '',
            },
            {
              id: 7,
              cellTitle: 'Writing your own type trait',
              prose: [
                'The standard library covers fundamental categories, but what if we want a trait specific to our own system, like `is_pointer_to_custom_class` or simply replicating `is_same` to understand the magic? We must implement a trait from scratch.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\n// Primary template: general case is false\ntemplate <typename T, typename U>\nstruct my_is_same {\n    static constexpr bool value = false;\n};\n\n// Partial specialization: when both types are exactly T, it is true\ntemplate <typename T>\nstruct my_is_same<T, T> {\n    static constexpr bool value = true;\n};\n\nint main() {\n    std::cout << my_is_same<int, double>::value << "\\n";\n    std::cout << my_is_same<int, int>::value << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `template <typename T>`: Declares the primary template.\n- `struct`: Opens the struct definition. In C++, structs are identical to classes except default visibility is public.\n- `is_pointer`: The name of our custom trait.\n- `{`: Opens body.\n- `static`: Keyword indicating this member belongs to the type itself, not to instances of the struct. We will never instantiate this struct.\n- `constexpr`: Keyword guaranteeing this value is computed entirely at compile time.\n- `bool`: The type of the constant.\n- `value = false;`: The generic fallback answer. Unless proven otherwise, a type is not a pointer.\n- `};`: Closes the struct definition.\n- `template <typename T>`: Declares a new template specialization.\n- `struct`: Begins struct.\n- `is_pointer`: We are specializing the trait we just declared.\n- `<T*>`: The partial specialization. This tells the compiler: "If the type provided ends in `*` (is a pointer), use this version instead of the primary template, and extract the underlying type into `T`."\n- `{`: Opens body.\n- `static constexpr bool value = true;`: The specialized answer. Yes, this is a pointer.\n- `};`: Closes struct.',
                '**CS lens.** Pattern matching at compile time. The compiler evaluates type arguments against available templates, preferring the most specialized match. This is declarative logic programming (similar to Prolog) embedded entirely within C++ types.',
                '**SE lens.** Extensibility. By understanding how traits are built, you can define project-specific compile-time constraints that integrate seamlessly with `std::enable_if` and `if constexpr`, creating robust, self-verifying architectures.'
              ],
              typeIt: true,
              solution: 'template <typename T>\nstruct is_pointer {\n    static constexpr bool value = false;\n};\n\ntemplate <typename T>\nstruct is_pointer<T*> {\n    static constexpr bool value = true;\n};',
              expectedOutput: '0\n1',
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
      'Next lesson: Compile-Time Computation with Templates.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Substitution Failure Is Not An Error (SFINAE)"?',
      options: [
        'Writing code that executes at compile time to generate or verify the code that will actually run. Type traits are the fundamental building block of C++ metaprogramming, existing to automate type-safe code generation.',
        'A C++ compiler principle where an invalid template substitution does not immediately fail the build, but instead discards that candidate from overload resolution. It exists to allow conditional enabling of function overloads based on type properties.',
        'A template struct that yields a compile-time constant or type based on the properties of its template argument. It exists to let the compiler ask questions about types ("is this a pointer?", "are these two types the same?") and branch or substitute code accordingly before the program ever runs.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Metaprogramming"?',
      options: [
        'A template struct that yields a compile-time constant or type based on the properties of its template argument. It exists to let the compiler ask questions about types ("is this a pointer?", "are these two types the same?") and branch or substitute code accordingly before the program ever runs.',
        'Writing code that executes at compile time to generate or verify the code that will actually run. Type traits are the fundamental building block of C++ metaprogramming, existing to automate type-safe code generation.',
        'A C++ compiler principle where an invalid template substitution does not immediately fail the build, but instead discards that candidate from overload resolution. It exists to allow conditional enabling of function overloads based on type properties.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Type Trait"?',
      options: [
        'Writing code that executes at compile time to generate or verify the code that will actually run. Type traits are the fundamental building block of C++ metaprogramming, existing to automate type-safe code generation.',
        'A template struct that yields a compile-time constant or type based on the properties of its template argument. It exists to let the compiler ask questions about types ("is this a pointer?", "are these two types the same?") and branch or substitute code accordingly before the program ever runs.',
        'A C++ compiler principle where an invalid template substitution does not immediately fail the build, but instead discards that candidate from overload resolution. It exists to allow conditional enabling of function overloads based on type properties.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Type Trait** — A template struct that yields a compile-time constant or type based on the properties of its template argument. It exists to let the compiler ask questions about types ("is this a pointer?", "are these two types the same?") and branch or substitute code accordingly before the program ever runs.',
    '**Metaprogramming** — Writing code that executes at compile time to generate or verify the code that will actually run. Type traits are the fundamental building block of C++ metaprogramming, existing to automate type-safe code generation.',
    '**Substitution Failure Is Not An Error (SFINAE)** — A C++ compiler principle where an invalid template substitution does not immediately fail the build, but instead discards that candidate from overload resolution. It exists to allow conditional enabling of function overloads based on type properties.',
  ],

  checkpoints: ['read-intuition'],
}
