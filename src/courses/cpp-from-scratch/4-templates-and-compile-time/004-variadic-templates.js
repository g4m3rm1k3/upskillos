// cpp-from-scratch — Lesson 24: Variadic Templates
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 24 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-24-variadic-templates',
  slug: 'variadic-templates',
  chapter: 4,
  order: 4,
  title: 'Variadic Templates',
  subtitle: 'Templates and Compile-Time Programming',
  tags: ['variadic-template', 'parameter-pack', 'pack-expansion', 'sizeof-operator'],

  hook: {
    question: 'What is "Variadic Templates", and why does it matter?',
    realWorldContext: 'You will write functions and type definitions that accept an unlimited number of arguments of differing types, rather than hardcoding a fixed number of parameters. The transferable problem this solves is creating flexible, type-safe APIs that can handle arbitrary combinations of data without duplicating code for every possible parameter count.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Parameter Packs, Pack Expansion, std::tuple.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Variadic template:** A template that takes a variable number of template parameters. It exists To allow functions and classes to accept an arbitrary list of types without writing separate overloads for one, two, or ten arguments.\n- **Parameter pack:** The actual list of parameters accepted by a variadic template, denoted by an ellipsis (...). It exists To bundle an unknown number of types or values into a single referencable name so the compiler can process them together.\n- **Pack expansion:** The process of unpacking a parameter pack into separate, comma-separated arguments using an ellipsis. It exists Because a pack cannot be used directly as a value; it must be expanded so the compiler can feed the individual items to functions or classes that expect discrete variables.\n- **sizeof... operator:** An operator that returns the number of elements in a parameter pack. It exists To allow code to make compile-time decisions based on how many arguments were passed.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::tuple:** A fixed-size collection of heterogeneous values, capable of holding multiple different types in a single object.\n- **std::get:** A template function to extract an element from a tuple by its specific position.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We started by capturing an unknown sequence of arguments using `typename... Args` and `Args... args`. We used `sizeof...(args)` to inspect the pack without opening it. We then unpacked it using `args...` to pass the values into the constructor of `std::tuple<Args...>`, proving we can capture, store, and retrieve arbitrary mixed-type data securely at compile time.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Try using a runtime variable for the tuple index: ```cpp int i = 0; std::cout << std::get<i>(myTuple) << "\\n"; ``` **The error:** `the value of \'i\' is not usable in a constant expression`. The compiler must know the type being returned at compile time; since the type changes depending on the index, the index itself must be a hardcoded compile-time constant.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Write a template function `makePair` that accepts exactly two arguments, checking `sizeof...(args) == 2`, and returns a `std::tuple` of those two.\n- Modify the `std::tuple` code in `main.cpp` to use `auto myTuple = bundleData(...)` instead of explicitly writing out the tuple type, observing how type deduction perfectly handles the variadic return.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled code using `sizeof...` and seen it count parameters.\n- [ ] You have expanded a parameter pack into a function call using `...`.\n- [ ] You have retrieved values from a `std::tuple` using compile-time indices.\n- [ ] You have committed your throwaway file experiments: `git commit -m "Confirm variadic template syntax for unpacking arbitrary parameters"`.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 24: Variadic Templates',
        caption: 'Variadic Templates',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Parameter Packs',
              prose: [
                'When you write a function, you must declare exactly how many arguments it takes. If you want a function that processes two values, you write one with two parameters. If you want three, you write an overload with three. We need a way to pass any number of type-safe arguments to a single function definition, without writing endless overloads, while keeping the compiler\'s strict type checking intact.',
                '## How the Code Works',
                '- `template<typename... Args>`: Declares a **variadic template**. The ellipsis (`...`) before `Args` means this is a type **parameter pack**. It tells the compiler to accept zero or more types and bundle them under the name `Args`. Without this, the template could only accept exactly one type.\n- `void countArguments(Args... args)`: Uses the type pack `Args` to declare a function parameter pack named `args`. The ellipsis here means "zero or more function arguments". Without this, the function could only take a fixed number of parameters.\n- `sizeof...(args)`: The `sizeof...` operator (note the ellipsis) counts the number of elements in a parameter pack at compile time. It does not compute byte size in memory; it computes the pack length.\n- `countArguments("hello", 3.14, \'c\');`: Calls the function. The compiler deduces `Args` to be `<const char*, double, char>` and generates a specialized version of the function for those exact three types.',
                '**CS lens.** This is compile-time code generation for arity (the number of arguments a function takes). The C++ compiler generates a distinct, perfectly sized function for every unique combination of arguments you pass, ensuring absolute type safety with zero runtime overhead.',
                '**SE lens.** The alternative not chosen is writing overloaded functions for 1, 2, 3, up to N arguments. The tradeoff is increased compiler work (generating multiple functions behind the scenes) and potentially larger executable size if the function is called with many different type combinations, in exchange for removing immense code duplication in the source files.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\ntemplate<typename... Args>\nvoid countArguments(Args... args) {\n    std::cout << "Number of arguments: " << sizeof...(args) << "\\n";\n}\n\nint main() {\n    countArguments(1);\n    countArguments("hello", 3.14, \'c\');\n    countArguments();\n    return 0;\n}',
              expectedOutput: 'Number of arguments: 1\nNumber of arguments: 3\nNumber of arguments: 0',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Pack Expansion',
              prose: [
                'A parameter pack like `args` cannot be used directly as a normal variable. You cannot write `args[0]` to get the first one, or `std::cout << args`. The compiler treats the pack as an opaque compressed bundle. To use the values inside, we need a mechanism to unpack them into a discrete, comma-separated list that the rest of C++ can understand.',
                '## How the Code Works',
                '- `process(args...)`: The ellipsis *after* the pack name is a **pack expansion**. It tells the compiler to take the bundle `args` and expand it into a comma-separated list.\n- When the pack contains `42, 3.14, "hello"`, the compiler rewrites this exact line as `process(42, 3.14, "hello");`.\n- `forwardToProcess(42, 3.14, std::string("hello"));`: Invokes the template. The pack receives three items. Without the `...` in the call to `process`, the compiler throws an error, because `args` is a pack, not a single value, and cannot be passed as one.',
                '**CS lens.** Pack expansion is essentially a macro expansion applied at the Abstract Syntax Tree level during compilation. The compiler unrolls the pack into discrete arguments before it checks if the target function can actually accept them.',
                '**SE lens.** The alternative not chosen is trying to iterate over the pack with a `for` loop. The tradeoff here is that standard runtime loops cannot iterate over types that differ; a `for` loop expects every element to be the same data type. Pack expansion solves this by generating sequential, comma-separated code at compile time, treating each argument as its own distinct type.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nvoid process(int a, double b, std::string c) {\n    std::cout << "Processed: " << a << ", " << b << ", " << c << "\\n";\n}\n\ntemplate<typename... Args>\nvoid forwardToProcess(Args... args) {\n    process(args...); \n}\n\nint main() {\n    forwardToProcess(42, 3.14, std::string("hello"));\n    return 0;\n}',
              expectedOutput: 'Processed: 42, 3.14, hello',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::tuple',
              prose: [
                'Parameter packs only exist in the immediate scope of the template function call. If we want to store that exact bundle of heterogeneous types as a real object in memory — for instance, returning multiple different types from a function — we need a concrete class that uses variadic templates internally to hold them.',
                '## How the Code Works',
                '- `#include <tuple>`: The standard library header providing `std::tuple` and `std::get`.\n- `std::tuple<Args...>`: This is pack expansion applied to *types*. `std::tuple` is the canonical variadic template class. If `Args` is `<int, double>`, this expands to `std::tuple<int, double>`. Without this, we could only declare a container for a single type.\n- `storage(args...)`: This is pack expansion applied to *values*. It passes the unpacked variables directly into the `std::tuple` constructor.\n- `std::tuple<int, double, std::string> myTuple`: Declares the concrete variable to hold the returned tuple.\n- `std::get<0>(myTuple)`: Retrieves the first element (index 0) from the tuple. Because a tuple holds mixed types, the index must be known at compile time (inside the `< >` template brackets), not at runtime, so the compiler knows exactly what type it is returning (`int` for `<0>`, `double` for `<1>`).',
                '**CS lens.** A `tuple` is a heterogeneous collection. Unlike an array or a `std::vector` which requires every element to have the exact same memory footprint and type, a tuple stores disparate types sequentially in memory. It is the C++ equivalent of an anonymous `struct` defined on the fly.',
                '**SE lens.** The alternative not chosen is defining a custom `struct` every time you need to return or pass a specific grouping of variables (e.g., `struct IntDoubleString { int a; double b; std::string c; };`). The tradeoff is convenience versus naming. A tuple saves you from polluting the global namespace with one-off structures, but you lose meaningful field names, forcing access via `get<0>` instead of a descriptive property name.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n#include <tuple>\n\ntemplate<typename... Args>\nstd::tuple<Args...> bundleData(Args... args) {\n    std::tuple<Args...> storage(args...);\n    return storage;\n}\n\nint main() {\n    std::tuple<int, double, std::string> myTuple = bundleData(100, 9.99, std::string("C++"));\n    \n    std::cout << std::get<0>(myTuple) << "\\n";\n    std::cout << std::get<1>(myTuple) << "\\n";\n    std::cout << std::get<2>(myTuple) << "\\n";\n    \n    return 0;\n}',
              expectedOutput: '100\n9.99\nC++',
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
      'Next lesson: Template Specialization.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Pack expansion"?',
      options: [
        'The process of unpacking a parameter pack into separate, comma-separated arguments using an ellipsis. It exists Because a pack cannot be used directly as a value; it must be expanded so the compiler can feed the individual items to functions or classes that expect discrete variables.',
        'A template that takes a variable number of template parameters. It exists To allow functions and classes to accept an arbitrary list of types without writing separate overloads for one, two, or ten arguments.',
        'The actual list of parameters accepted by a variadic template, denoted by an ellipsis (...). It exists To bundle an unknown number of types or values into a single referencable name so the compiler can process them together.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Parameter pack"?',
      options: [
        'The actual list of parameters accepted by a variadic template, denoted by an ellipsis (...). It exists To bundle an unknown number of types or values into a single referencable name so the compiler can process them together.',
        'An operator that returns the number of elements in a parameter pack. It exists To allow code to make compile-time decisions based on how many arguments were passed.',
        'A template that takes a variable number of template parameters. It exists To allow functions and classes to accept an arbitrary list of types without writing separate overloads for one, two, or ten arguments.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Variadic template"?',
      options: [
        'The process of unpacking a parameter pack into separate, comma-separated arguments using an ellipsis. It exists Because a pack cannot be used directly as a value; it must be expanded so the compiler can feed the individual items to functions or classes that expect discrete variables.',
        'A template that takes a variable number of template parameters. It exists To allow functions and classes to accept an arbitrary list of types without writing separate overloads for one, two, or ten arguments.',
        'An operator that returns the number of elements in a parameter pack. It exists To allow code to make compile-time decisions based on how many arguments were passed.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "sizeof... operator"?',
      options: [
        'The actual list of parameters accepted by a variadic template, denoted by an ellipsis (...). It exists To bundle an unknown number of types or values into a single referencable name so the compiler can process them together.',
        'An operator that returns the number of elements in a parameter pack. It exists To allow code to make compile-time decisions based on how many arguments were passed.',
        'The process of unpacking a parameter pack into separate, comma-separated arguments using an ellipsis. It exists Because a pack cannot be used directly as a value; it must be expanded so the compiler can feed the individual items to functions or classes that expect discrete variables.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Variadic template** — A template that takes a variable number of template parameters. It exists To allow functions and classes to accept an arbitrary list of types without writing separate overloads for one, two, or ten arguments.',
    '**Parameter pack** — The actual list of parameters accepted by a variadic template, denoted by an ellipsis (...). It exists To bundle an unknown number of types or values into a single referencable name so the compiler can process them together.',
    '**Pack expansion** — The process of unpacking a parameter pack into separate, comma-separated arguments using an ellipsis. It exists Because a pack cannot be used directly as a value; it must be expanded so the compiler can feed the individual items to functions or classes that expect discrete variables.',
    '**sizeof... operator** — An operator that returns the number of elements in a parameter pack. It exists To allow code to make compile-time decisions based on how many arguments were passed.',
  ],

  checkpoints: ['read-intuition'],
}
