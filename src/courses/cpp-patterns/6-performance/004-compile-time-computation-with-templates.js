// cpp-patterns — Lesson 18: Compile-Time Computation with Templates
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 18 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-18-compile-time-computation-with-templates',
  slug: 'compile-time-computation-with-templates',
  chapter: 6,
  order: 4,
  title: 'Compile-Time Computation with Templates',
  subtitle: 'Performance',
  tags: ['template-metaprogramming-tmp', 'constexpr', 'concepts', 'parameter-pack', 'if-constexpr'],

  hook: {
    question: 'What is "Compile-Time Computation with Templates", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: constexpr vs Template Metaprogramming, Compile-Time Lookup Tables, std::integer_sequence and Index Tricks, The Practical Limit of TMP vs Concepts.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Template Metaprogramming (TMP):** Writing code that the compiler executes during compilation to generate types or values, existing to shift work from runtime to compile time so the final executable is smaller and faster.\n- **constexpr:** A language specifier guaranteeing that a variable or function can be evaluated at compile time, existing to replace complex functional TMP with ordinary-looking imperative C++ code.\n- **Concepts:** Compile-time predicates for template arguments, introduced in C++20, existing to provide readable constraints and better error messages compared to older SFINAE techniques.\n- **Parameter Pack:** A template feature accepting zero or more arguments, existing to write generic functions over an unknown number of types or values.\n- **if constexpr:** A compile-time branching statement introduced in C++17, existing to discard invalid code branches during compilation without causing compile errors.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::integer_sequence:** A compile-time sequence of integers.\n- **std::make_index_sequence:** A standard library helper alias.\n- **std::integral:** A C++20 concept.\n- **std::floating_point:** A C++20 concept.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We built a mechanism to shift load to compile time: `compute_scaling_factor` executes imperative logic during compilation to fill a `make_scaling_table` `std::array`. That array is stored purely in the binary. When we need to feed its values into a function, `apply_array` uses `std::make_index_sequence` to deduce parameter packs and expand `arr[Is]...` as literal arguments. Finally, `optimize_math` proves that when we need to handle different generic types, we discard unreadable SFINAE in favor of C++20 Concepts and `if constexpr`, resolving branches at compile time without throwing compilation errors on invalid discarded branches.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 18: Compile-Time Computation with Templates',
        caption: 'Compile-Time Computation with Templates',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'constexpr vs Template Metaprogramming',
              prose: [
                'We want to compute values during compilation so the runtime executable does not waste CPU cycles doing it. Historically, C++ developers used Template Metaprogramming (TMP) — relying on recursive struct instantiations — to force the compiler to do math. This was powerful but famously difficult to read. We need a way to run normal, imperative C++ at compile time.',
                '## First, In Isolation',
                '```cpp\n// Classic TMP approach\ntemplate <int N> \nstruct Fact { \n    static constexpr int value = N * Fact<N - 1>::value; \n};\ntemplate <> \nstruct Fact<0> { \n    static constexpr int value = 1; \n};\n\n// Modern constexpr approach\nconstexpr int fact(int n) { \n    return n <= 1 ? 1 : n * fact(n - 1); \n}\n\n#include <iostream>\nint main() {\n    std::cout << Fact<5>::value << "\\n";\n    std::cout << fact(5) << "\\n";\n}\n```',
                '## How the Code Works',
                '- `#pragma`: Preprocessor directive.\n- `once`: Tells the compiler to include this header exactly once per compilation unit.\n- `constexpr`: A language keyword that marks the function as evaluable at compile time.\n- `int`: The return type, a standard integer.\n- `compute_scaling_factor`: The name of the function.\n- `(`: Opens the parameter list.\n- `int`: The type of the first parameter.\n- `base`: The first parameter, the base value.\n- `,`: Separates parameters.\n- `int`: The type of the second parameter.\n- `multiplier`: The second parameter.\n- `)`: Closes the parameter list.\n- `{`: Opens the function body.\n- `int`: The type of the local variable.\n- `result`: Declares a local integer variable.\n- `=`: The assignment operator.\n- `base`: The initial value.\n- `;`: Ends the statement.\n- `for`: The loop keyword.\n- `(`: Opens the loop conditions.\n- `int`: The type of the loop counter.\n- `i`: The loop counter name.\n- `=`: The assignment operator.\n- `0`: The initial value.\n- `;`: Separates loop clauses.\n- `i`: The loop counter.\n- `<`: The less-than comparison operator.\n- `multiplier`: The upper bound.\n- `;`: Separates loop clauses.\n- `++`: Pre-increment operator.\n- `i`: The loop counter.\n- `)`: Closes the loop conditions.\n- `{`: Opens the loop body.\n- `result`: The local state variable.\n- `+=`: The compound addition assignment operator.\n- `base`: The base parameter.\n- `*`: The multiplication operator.\n- `i`: The loop counter.\n- `;`: Ends the statement.\n- `}`: Closes the loop body.\n- `return`: The keyword to exit the function and pass back a value.\n- `result`: The final computed value.\n- `;`: Ends the statement.\n- `}`: Closes the function body.\nExecution trace:\n- `compute_scaling_factor(10, 3)` — Call begins.\n- `result = 10` — Initial state setup.\n- `i = 0`, `result += 10 * 0` — `result` remains `10`.\n- `i = 1`, `result += 10 * 1` — `result` becomes `20`.\n- `i = 2`, `result += 10 * 2` — `result` becomes `40`.\n- Loop terminates, returns `40`.',
                '**CS lens.** Compile-time evaluation / Constant folding. Also recognized in: macro processors, Lisp macros, JIT compilers doing constant folding, Rust\'s `const fn`.',
                '**SE lens.** Readability and maintainability. TMP requires recursive functional programming in a language not built for it. C++14 expanded `constexpr` to allow local mutation and loops, letting us write normal imperative C++ that runs at compile time, drastically reducing maintenance debt.'
              ],
              typeIt: true,
              solution: '#pragma once\n\nconstexpr int compute_scaling_factor(int base, int multiplier) {\n    int result = base;\n    for(int i = 0; i < multiplier; ++i) {\n        result += base * i;\n    }\n    return result;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Compile-Time Lookup Tables',
              prose: [
                'We need an array of precomputed values (like a sine table or scaling factors) baked directly into the binary. If we compute these at runtime during startup, we waste CPU cycles every time the program launches.',
                '## First, In Isolation',
                '```cpp\n#include <array>\n#include <iostream>\n\nconstexpr std::array<int, 3> make_table() {\n    return {10, 20, 30};\n}\n\nconstexpr auto table = make_table();\n\nint main() {\n    std::cout << table[1] << "\\n";\n}\n```',
                '## How the Code Works',
                '- `#include`: Preprocessor directive.\n- `<array>`: The standard library fixed-size array header.\n- `template`: Keyword introducing a template.\n- `<`: Opens the template parameter list.\n- `size_t`: The type of the template parameter, an unsigned integer type for sizes.\n- `N`: The non-type template parameter representing the array size.\n- `>`: Closes the template parameter list.\n- `constexpr`: Keyword marking compile-time evaluation capability.\n- `std::array`: The standard library container type.\n- `<`: Opens the array template arguments.\n- `int`: The type of elements in the array.\n- `,`: Separates arguments.\n- `N`: The size of the array, matching the template parameter.\n- `>`: Closes the array template arguments.\n- `make_scaling_table`: The function name.\n- `(`: Opens the parameter list.\n- `int`: The type of the parameter.\n- `base`: The single parameter determining the scaling base.\n- `)`: Closes the parameter list.\n- `{`: Opens the function body.\n- `std::array`: The standard library container.\n- `<`: Opens the array template arguments.\n- `int`: The element type.\n- `,`: Separates arguments.\n- `N`: The array size.\n- `>`: Closes the array template arguments.\n- `table`: The name of the local array.\n- `{}`: Uniform initialization syntax, zero-initializing all elements.\n- `;`: Ends the statement.\n- `for`: The loop keyword.\n- `(`: Opens loop conditions.\n- `size_t`: The type of the loop counter.\n- `i`: The loop counter name.\n- `=`: The assignment operator.\n- `0`: The initial value.\n- `;`: Separator.\n- `i`: The loop counter.\n- `<`: The less-than operator.\n- `N`: The array size bound.\n- `;`: Separator.\n- `++`: Pre-increment operator.\n- `i`: The loop counter.\n- `)`: Closes loop conditions.\n- `{`: Opens loop body.\n- `table`: The local array.\n- `[`: Opens the array subscript operator.\n- `i`: The index.\n- `]`: Closes the subscript operator.\n- `=`: Assignment operator.\n- `compute_scaling_factor`: Call to our previous `constexpr` function.\n- `(`: Opens function arguments.\n- `base`: The base parameter.\n- `,`: Separator.\n- `i`: The loop counter, cast implicitly to `int`.\n- `)`: Closes function arguments.\n- `;`: Ends the statement.\n- `}`: Closes loop body.\n- `return`: Keyword to exit the function.\n- `table`: The populated array.\n- `;`: Ends the statement.\n- `}`: Closes function body.\n- `constexpr`: Keyword forcing compile-time evaluation for the variable definition.\n- `auto`: Keyword telling the compiler to deduce the type automatically (which will be `std::array<int, 5>`).\n- `lookup_table`: The name of the global constant variable.\n- `=`: Assignment operator.\n- `make_scaling_table`: Function call.\n- `<`: Opens explicit template arguments.\n- `5`: The compile-time value for `N`.\n- `>`: Closes explicit template arguments.\n- `(`: Opens function arguments.\n- `10`: The argument for `base`.\n- `)`: Closes function arguments.\n- `;`: Ends the statement.',
                '**CS lens.** Lookup tables / Memoization. Also recognized in: cryptography (S-boxes), graphics engines (trig tables), embedded systems (ADC correction tables), hardware synthesis.',
                '**SE lens.** Startup performance vs Binary size. Computing at compile time makes the executable file larger on disk, but application startup becomes instantaneous. We are deliberately trading disk and memory footprint for CPU time.'
              ],
              typeIt: true,
              solution: '#include <array>\n\ntemplate<size_t N>\nconstexpr std::array<int, N> make_scaling_table(int base) {\n    std::array<int, N> table{};\n    for (size_t i = 0; i < N; ++i) {\n        table[i] = compute_scaling_factor(base, i);\n    }\n    return table;\n}\n\nconstexpr auto lookup_table = make_scaling_table<5>(10);',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::integer_sequence and Index Tricks',
              prose: [
                'We have an array, and we need to pass its elements as separate arguments to a function, like `func(arr[0], arr[1], arr[2])`. But we don\'t know the size `N` until compile time, and we cannot write a `for` loop to pass function arguments. We need the compiler to generate the sequence of indices `0, 1, 2...` and unpack them for us.',
                '## First, In Isolation',
                '```cpp\n#include <utility>\n#include <iostream>\n\ntemplate<size_t... Is>\nvoid print_indices(std::index_sequence<Is...>) {\n    // A fold expression printing each index\n    ((std::cout << Is << " "), ...);\n}\n\nint main() {\n    print_indices(std::make_index_sequence<3>{});\n}\n```',
                '## How the Code Works',
                '- `#include`: Preprocessor directive.\n- `<utility>`: Standard header containing `integer_sequence` utilities.\n- `template`: Keyword introducing a template.\n- `<`: Opens template parameters.\n- `typename`: Declares a type parameter.\n- `F`: The template parameter for the callable function type.\n- `,`: Separator.\n- `size_t`: The type of the array size parameter.\n- `N`: The array size parameter.\n- `,`: Separator.\n- `size_t`: The type of the index parameters.\n- `...`: Denotes a parameter pack, meaning zero or more of the preceding type.\n- `Is`: The name of the parameter pack containing the indices.\n- `>`: Closes template parameters.\n- `constexpr`: Marks the function as evaluable at compile time.\n- `void`: The return type.\n- `apply_array_impl`: The name of the internal implementation helper.\n- `(`: Opens the parameter list.\n- `F`: The callable type.\n- `func`: The callable object parameter.\n- `,`: Separator.\n- `const`: Constant qualifier.\n- `std::array`: The array type.\n- `<`: Opens array template arguments.\n- `int`: Element type.\n- `,`: Separator.\n- `N`: Array size.\n- `>`: Closes array template arguments.\n- `&`: Reference qualifier.\n- `arr`: The array parameter.\n- `,`: Separator.\n- `std::index_sequence`: The standard library struct carrying a compile-time sequence of sizes.\n- `<`: Opens index_sequence template arguments.\n- `Is`: The parameter pack.\n- `...`: Expands the pack into the template argument list.\n- `>`: Closes index_sequence template arguments.\n- `)`: Closes the parameter list. (Notice we don\'t name the `index_sequence` parameter; we only need its type to deduce `Is...`).\n- `{`: Opens the function body.\n- `func`: The callable object.\n- `(`: Opens function call arguments.\n- `arr`: The array.\n- `[`: Opens subscript operator.\n- `Is`: The index from the parameter pack.\n- `]`: Closes subscript operator.\n- `...`: Pack expansion operator. This tells the compiler to repeat `arr[Is]` for every element in the `Is` pack, separated by commas.\n- `)`: Closes function call arguments.\n- `;`: Ends the statement.\n- `}`: Closes the function body.\n- `template`: Keyword introducing a template.\n- `<`: Opens template parameters.\n- `typename`: Declares a type parameter.\n- `F`: The callable type.\n- `,`: Separator.\n- `size_t`: The array size type.\n- `N`: The array size parameter.\n- `>`: Closes template parameters.\n- `constexpr`: Marks the function as evaluable at compile time.\n- `void`: Return type.\n- `apply_array`: The public-facing function name.\n- `(`: Opens the parameter list.\n- `F`: The callable type.\n- `func`: The callable parameter.\n- `,`: Separator.\n- `const`: Constant qualifier.\n- `std::array`: The array type.\n- `<`: Opens array template arguments.\n- `int`: Element type.\n- `,`: Separator.\n- `N`: Array size.\n- `>`: Closes array template arguments.\n- `&`: Reference qualifier.\n- `arr`: The array parameter.\n- `)`: Closes the parameter list.\n- `{`: Opens the function body.\n- `apply_array_impl`: Calls the internal helper.\n- `(`: Opens function call arguments.\n- `func`: The callable passed through.\n- `,`: Separator.\n- `arr`: The array passed through.\n- `,`: Separator.\n- `std::make_index_sequence`: The standard library alias that generates an `index_sequence`.\n- `<`: Opens template arguments.\n- `N`: The array size.\n- `>`: Closes template arguments.\n- `{}`: Uniform initialization syntax, creating a temporary instance of the generated sequence.\n- `)`: Closes function call arguments.\n- `;`: Ends the statement.\n- `}`: Closes the function body.\nExecution trace:\n- User calls `apply_array(my_func, my_array_of_size_3)`.\n- Compiler deduces `N = 3`.\n- `std::make_index_sequence<3>{}` generates a temporary of type `std::index_sequence<0, 1, 2>`.\n- The helper `apply_array_impl` is invoked. The compiler matches `index_sequence<0, 1, 2>` to `index_sequence<Is...>`, deducing the pack `Is...` as `0, 1, 2`.\n- Inside the helper, `func(arr[Is]...);` is expanded.\n- The compiler writes the literal equivalent of `func(arr[0], arr[1], arr[2]);`.',
                '**CS lens.** Pattern matching / Pack expansion. Also recognized in: functional destructuring, Lisp unquote-splicing, Python `*args` and `**kwargs` expansion.',
                '**SE lens.** Delegation pattern. We use an `_impl` helper strictly to deduce the parameter pack from the type of a temporary object, keeping the public API clean so the caller never sees `index_sequence`. This was the mandatory way to handle compile-time sequences before C++20.'
              ],
              typeIt: true,
              solution: '#include <utility>\n\ntemplate <typename F, size_t N, size_t... Is>\nconstexpr void apply_array_impl(F func, const std::array<int, N>& arr, std::index_sequence<Is...>) {\n    func(arr[Is]...);\n}\n\ntemplate <typename F, size_t N>\nconstexpr void apply_array(F func, const std::array<int, N>& arr) {\n    apply_array_impl(func, arr, std::make_index_sequence<N>{});\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'The Practical Limit of TMP vs Concepts',
              prose: [
                'When we want to execute different logic based on compile-time conditions (like checking if a type is an integer versus a float), classic TMP required `std::enable_if` and multiple complex struct specializations. SFINAE (Substitution Failure Is Not An Error) is notoriously hostile to read. We need a way to branch logic at compile time cleanly, and a way to constrain templates so they fail with readable errors.',
                '## First, In Isolation',
                '```cpp\n#include <concepts>\n#include <iostream>\n\ntemplate <typename T>\nrequires std::integral<T> || std::floating_point<T>\nconstexpr T optimize_math(T value) {\n    if constexpr (std::integral<T>) {\n        return value << 1; // Bitshift is only valid for integers\n    } else {\n        return value * 2;  // Valid for floats\n    }\n}\n\nint main() {\n    std::cout << optimize_math(5) << "\\n";\n    std::cout << optimize_math(5.5) << "\\n";\n}\n```',
                '## How the Code Works',
                '- `#include`: Preprocessor directive.\n- `<concepts>`: Standard C++20 header defining common type constraints.\n- `template`: Keyword introducing a template.\n- `<`: Opens template parameters.\n- `typename`: Declares a type parameter.\n- `T`: The name of the generic type.\n- `>`: Closes template parameters.\n- `requires`: C++20 keyword introducing a constraint on the template. If this fails, the template is simply excluded from overload resolution with a clean error message.\n- `std::integral`: A standard concept that evaluates to true if the type is an integer type.\n- `<`: Opens concept arguments.\n- `T`: The type being checked.\n- `>`: Closes concept arguments.\n- `||`: Logical OR operator.\n- `std::floating_point`: A standard concept that evaluates to true if the type is a float or double.\n- `<`: Opens concept arguments.\n- `T`: The type being checked.\n- `>`: Closes concept arguments.\n- `constexpr`: Marks the function as evaluable at compile time.\n- `T`: The return type.\n- `optimize_math`: The function name.\n- `(`: Opens parameters.\n- `T`: The parameter type.\n- `value`: The parameter name.\n- `)`: Closes parameters.\n- `{`: Opens the function body.\n- `if`: The standard conditional keyword.\n- `constexpr`: Modifier indicating the condition must be evaluated during compilation. The branch that is not taken is completely discarded and is not compiled.\n- `(`: Opens condition.\n- `std::integral`: The standard concept.\n- `<`: Opens concept arguments.\n- `T`: The type to check.\n- `>`: Closes concept arguments.\n- `)`: Closes condition.\n- `{`: Opens true branch.\n- `return`: Keyword to exit and pass back a value.\n- `value`: The parameter.\n- `<<`: The bitwise left-shift operator (fast multiply by 2).\n- `1`: The shift amount.\n- `;`: Ends the statement.\n- `}`: Closes true branch.\n- `else`: The fallback keyword.\n- `{`: Opens false branch.\n- `return`: Keyword to exit and pass back a value.\n- `value`: The parameter.\n- `*`: The multiplication operator.\n- `2`: The literal two.\n- `;`: Ends the statement.\n- `}`: Closes false branch.\n- `}`: Closes function body.',
                '**CS lens.** Static branching / Dead code elimination. Also recognized in: C preprocessor `#ifdef`, conditional compilation in Rust (`#[cfg]`), Zig\'s `comptime if`.',
                '**SE lens.** Expressiveness. `if constexpr` flattens what used to be a complex web of `std::enable_if` struct specializations into a single readable imperative function, massively reducing cognitive load. Concepts replace dense template errors with exact, human-readable reasons why a type failed to match.'
              ],
              typeIt: true,
              solution: '#include <concepts>\n\ntemplate <typename T>\nrequires std::integral<T> || std::floating_point<T>\nconstexpr T optimize_math(T value) {\n    if constexpr (std::integral<T>) {\n        return value << 1;\n    } else {\n        return value * 2;\n    }\n}',
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
      text: 'Which of these best defines "Concepts"?',
      options: [
        'Writing code that the compiler executes during compilation to generate types or values, existing to shift work from runtime to compile time so the final executable is smaller and faster.',
        'Compile-time predicates for template arguments, introduced in C++20, existing to provide readable constraints and better error messages compared to older SFINAE techniques.',
        'A template feature accepting zero or more arguments, existing to write generic functions over an unknown number of types or values.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Parameter Pack"?',
      options: [
        'A language specifier guaranteeing that a variable or function can be evaluated at compile time, existing to replace complex functional TMP with ordinary-looking imperative C++ code.',
        'Writing code that the compiler executes during compilation to generate types or values, existing to shift work from runtime to compile time so the final executable is smaller and faster.',
        'A template feature accepting zero or more arguments, existing to write generic functions over an unknown number of types or values.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Template Metaprogramming (TMP)"?',
      options: [
        'A compile-time branching statement introduced in C++17, existing to discard invalid code branches during compilation without causing compile errors.',
        'Writing code that the compiler executes during compilation to generate types or values, existing to shift work from runtime to compile time so the final executable is smaller and faster.',
        'A template feature accepting zero or more arguments, existing to write generic functions over an unknown number of types or values.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "constexpr"?',
      options: [
        'A compile-time branching statement introduced in C++17, existing to discard invalid code branches during compilation without causing compile errors.',
        'A language specifier guaranteeing that a variable or function can be evaluated at compile time, existing to replace complex functional TMP with ordinary-looking imperative C++ code.',
        'A template feature accepting zero or more arguments, existing to write generic functions over an unknown number of types or values.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Template Metaprogramming (TMP)** — Writing code that the compiler executes during compilation to generate types or values, existing to shift work from runtime to compile time so the final executable is smaller and faster.',
    '**constexpr** — A language specifier guaranteeing that a variable or function can be evaluated at compile time, existing to replace complex functional TMP with ordinary-looking imperative C++ code.',
    '**Concepts** — Compile-time predicates for template arguments, introduced in C++20, existing to provide readable constraints and better error messages compared to older SFINAE techniques.',
    '**Parameter Pack** — A template feature accepting zero or more arguments, existing to write generic functions over an unknown number of types or values.',
    '**if constexpr** — A compile-time branching statement introduced in C++17, existing to discard invalid code branches during compilation without causing compile errors.',
  ],

  checkpoints: ['read-intuition'],
}
