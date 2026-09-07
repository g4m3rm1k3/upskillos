// cpp-from-scratch — Lesson 11: Templates
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 11 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-11-templates',
  slug: 'templates',
  chapter: 2,
  order: 3,
  title: 'Templates',
  subtitle: 'OOP and Generic Programming',
  tags: ['template', 'template-type-parameter', 'instantiation'],

  hook: {
    question: 'What is "Templates", and why does it matter?',
    realWorldContext: 'You will write functions and classes that can operate on any data type without duplicating code. These isolated programs prove that the C++ compiler can use a single blueprint to automatically generate specific, type-safe versions of a function or class at compile time. The transferable problem this solves is writing generic algorithms and data structures that are strictly type-checked but don\'t require you to copy-paste identical logic for every new data type.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: The Problem, Function Templates, Class Templates.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Template:** A blueprint for a function or class that leaves one or more data types unspecified until they are used. It exists To eliminate code duplication when the exact same logic applies to many different types of data.\n- **Template type parameter:** A placeholder name (usually T) in a template definition that stands in for an actual type. It exists To declare exactly where the unknown type will be substituted later.\n- **Instantiation:** The process where the compiler reads a template and generates a concrete, fully-typed version of the function or class based on the types provided. It exists To ensure that the final compiled code is just as fast and type-safe as if you had written out every specific version by hand.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::cout:** The standard character output stream in C++.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how the generic type parameters flow: When you define `Box<double>`, the compiler replaces `T` with `double` throughout the class definition. Thus, the constructor `Box(T initial_value)` rigidly becomes `Box(double initial_value)`. Finally, when the object provides access to the data, `T get_value()` strictly manifests as `double get_value()`. The type flows from the initial instantiation in `main()` down through every method and property of the instance, entirely at compile time.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you ignore the compiler\'s generic rules, it will stop you immediately. Modify the `Box` code to insert the wrong type into an initialized box: \n\n```cpp\nBox<int> int_box(42);\nint_box = Box<double>(9.99); // Trying to assign a double box to an int box\n```\n\n**The compiler error:** `error: no viable overloaded \'=\'` Because you declared `int_box` as a `Box<int>`, the compiler considers it an entirely different, incompatible class from `Box<double>`. They do not share a type relationship just because they came from the same template. Restore the code by ensuring you only assign boxes of the exact same instantiated type.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Multiple Template Parameters:** Create a function `template <typename T1, typename T2>` named `print_pair` that accepts two arguments of potentially different types (`T1 a`, `T2 b`) and prints them separated by a comma. Call it from `main` passing an `int` and a `double`.\n- **Type Deduction:** In modern C++, the compiler can often guess the type parameter for a function template without you explicitly writing `<int>`. Try calling `find_max(5, 10)` without the `<int>` brackets and verify it still compiles and runs.\n- **Array Box:** Modify the `Box` class template so that instead of holding a single `T value`, it holds a static array `T values[3]`. Add a method `void set_value(int index, T item)` and test it in `main` with an array of `double`s.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled the duplicated functions and understood the maintenance problem.\n- [ ] You have run a function template and witnessed the compiler generate the correct types.\n- [ ] You have built a class template and retrieved a value without losing type safety.\n- [ ] You can explain template instantiation out loud, in your own words, to someone who hasn\'t read this lesson.\n- [ ] `git commit -m "Complete Lesson 11: Templates, isolating type from logic"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 11: Templates',
        caption: 'Templates',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Problem',
              prose: [
                'When building a function that compares two values to find the maximum, the logic is simple: `if (a > b) return a; else return b;`. However, C++ is statically typed, meaning a function\'s parameters and return type must be explicitly declared. If you write this function for integers, it only works for integers. To do the exact same comparison for decimals, you have to write a second function. This forces you to duplicate code just to satisfy the type system.',
                '## How the Code Works',
                '- `int max_int(int a, int b)`: Defines a function that strictly accepts and returns `int`.\n- `double max_double(double a, double b)`: Defines a completely separate function that strictly accepts and returns `double`. The internal logic is identical to `max_int`.\n- `std::cout << max_int(5, 10) << "\\n";`: Calls the integer version of the function.\n- `std::cout << max_double(3.14, 2.71) << "\\n";`: Calls the decimal version of the function. Without this second function, passing decimals to `max_int` would cause the compiler to truncate them into whole integers, losing data.',
                '**CS lens.** This is the concept of "manual monomorphization." The programmer acts as a macro expander, manually writing out a specialized version of the algorithm for every type it needs to support. This guarantees type safety but scales terribly as the number of required types grows.',
                '**SE lens.** The alternative not chosen is abandoning static typing entirely (like using `void*` in C), which would allow one function to take any data but would break the compiler\'s ability to verify the program is safe. The tradeoff here is a maintenance burden: if you discover a bug in your `max` logic, you have to remember to fix it in `max_int`, `max_double`, `max_float`, and everywhere else you copied it.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint max_int(int a, int b) {\n    if (a > b) return a;\n    return b;\n}\n\ndouble max_double(double a, double b) {\n    if (a > b) return a;\n    return b;\n}\n\nint main() {\n    std::cout << max_int(5, 10) << "\\n";\n    std::cout << max_double(3.14, 2.71) << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Function Templates',
              prose: [
                'We need the safety of strictly typed functions without the maintenance nightmare of duplicating them. We need a way to write the logic once and let the compiler automatically generate the specific `int` or `double` versions for us when it sees what types we are trying to pass in.',
                '## How the Code Works',
                '- `template <typename T>`: Declares that the following function is a template, and that `T` is a **template type parameter**. `T` acts as a variable for a data type (like `int` or `double`), not a variable for actual data (like `5`). Without this line, the compiler would complain that it has never heard of a type named `T`.\n- `T find_max(T a, T b)`: Uses the placeholder `T` for the return type and the parameter types. When `T` becomes `int`, this signature becomes exactly `int find_max(int a, int b)`.\n- `find_max<int>(5, 10)`: Calls the function, explicitly providing `int` as the type for `T` inside the angle brackets. This triggers **instantiation**: the compiler secretly writes a brand-new integer version of `find_max` just for this call.\n- `find_max<double>(3.14, 2.71)`: Calls the function again, this time requesting a `double` version. The compiler secretly writes a second, entirely separate decimal version of `find_max`.',
                '**CS lens.** This embodies parametric polymorphism. You define logic abstractly over parameters, and instantiate it with specific types later. It is like a customizable factory mold: you build the mold once, but the factory produces distinct plastic parts and metal parts depending on what material you pour in.',
                '**SE lens.** The alternative not chosen is code generation tools outside the language (like writing a Python script to generate C++ files). The tradeoff here is slower compile times: the compiler has to do the heavy lifting of parsing the template and generating every requested variation from scratch every time you build the program. In exchange, the programmer gets maximum reuse with zero runtime performance cost.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\ntemplate <typename T>\nT find_max(T a, T b) {\n    if (a > b) return a;\n    return b;\n}\n\nint main() {\n    std::cout << find_max<int>(5, 10) << "\\n";\n    std::cout << find_max<double>(3.14, 2.71) << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Class Templates',
              prose: [
                'Templates are not just for functions. When building a data structure (like a wrapper or a container) that needs to hold a piece of data, locking it to a single type makes the data structure useless for anything else. We need to create a class that can store and retrieve data of any type, determined at the moment an object is created.',
                '## How the Code Works',
                '- `template <typename T>`: Declares that the following class is a template, using `T` as the placeholder type.\n- `class Box { ... }`: The definition of the class itself. Because it is prefixed by the template declaration, everything inside this block can use `T` as a valid type.\n- `T value;`: Declares a private member variable whose type is `T`. If `T` is `int`, this is an integer variable. If `T` is `double`, this is a decimal variable.\n- `Box(T initial_value)`: The constructor. It takes an argument of type `T` to initialize the object.\n- `T get_value()`: A method that returns the stored value, ensuring the return type perfectly matches whatever was put in.\n- `Box<int> int_box(42);`: Creates an instance of the class. The `<int>` tells the compiler to generate a specific version of `Box` where every `T` is replaced with `int`, and then instantiate an object from that generated class.\n- `Box<double> double_box(9.99);`: Proves the exact same template can be reused safely for decimals.',
                '**CS lens.** This is generic programming applied to data structures. A class template is not a class; it is a recipe for a class. Just as `std::vector` or `std::string` in the C++ Standard Library can hold any data type, you are using the exact same mechanism they use under the hood to ensure type safety.',
                '**SE lens.** The alternative not chosen is storing data as `void*` pointers, which can point to any data type in memory. The tradeoff for templates is that the compiler must see the full implementation of the class template wherever it is used (which is why templates are usually written entirely inside header files). The immense benefit is that the compiler prevents you from ever putting a `double` into a `Box<int>`, making the container structurally safe.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\ntemplate <typename T>\nclass Box {\nprivate:\n    T value;\npublic:\n    Box(T initial_value) {\n        value = initial_value;\n    }\n    \n    T get_value() {\n        return value;\n    }\n};\n\nint main() {\n    Box<int> int_box(42);\n    std::cout << int_box.get_value() << "\\n";\n\n    Box<double> double_box(9.99);\n    std::cout << double_box.get_value() << "\\n";\n\n    return 0;\n}',
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
      'Next lesson: Standard Library Containers.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Template type parameter"?',
      options: [
        'A blueprint for a function or class that leaves one or more data types unspecified until they are used. It exists To eliminate code duplication when the exact same logic applies to many different types of data.',
        'A placeholder name (usually T) in a template definition that stands in for an actual type. It exists To declare exactly where the unknown type will be substituted later.',
        'The process where the compiler reads a template and generates a concrete, fully-typed version of the function or class based on the types provided. It exists To ensure that the final compiled code is just as fast and type-safe as if you had written out every specific version by hand.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Template"?',
      options: [
        'A placeholder name (usually T) in a template definition that stands in for an actual type. It exists To declare exactly where the unknown type will be substituted later.',
        'A blueprint for a function or class that leaves one or more data types unspecified until they are used. It exists To eliminate code duplication when the exact same logic applies to many different types of data.',
        'The process where the compiler reads a template and generates a concrete, fully-typed version of the function or class based on the types provided. It exists To ensure that the final compiled code is just as fast and type-safe as if you had written out every specific version by hand.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Instantiation"?',
      options: [
        'A blueprint for a function or class that leaves one or more data types unspecified until they are used. It exists To eliminate code duplication when the exact same logic applies to many different types of data.',
        'A placeholder name (usually T) in a template definition that stands in for an actual type. It exists To declare exactly where the unknown type will be substituted later.',
        'The process where the compiler reads a template and generates a concrete, fully-typed version of the function or class based on the types provided. It exists To ensure that the final compiled code is just as fast and type-safe as if you had written out every specific version by hand.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Template** — A blueprint for a function or class that leaves one or more data types unspecified until they are used. It exists To eliminate code duplication when the exact same logic applies to many different types of data.',
    '**Template type parameter** — A placeholder name (usually T) in a template definition that stands in for an actual type. It exists To declare exactly where the unknown type will be substituted later.',
    '**Instantiation** — The process where the compiler reads a template and generates a concrete, fully-typed version of the function or class based on the types provided. It exists To ensure that the final compiled code is just as fast and type-safe as if you had written out every specific version by hand.',
  ],

  checkpoints: ['read-intuition'],
}
