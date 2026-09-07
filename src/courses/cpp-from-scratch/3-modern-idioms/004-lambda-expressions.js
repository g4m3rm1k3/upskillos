// cpp-from-scratch — Lesson 18: Lambda Expressions
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 18 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-18-lambda-expressions',
  slug: 'lambda-expressions',
  chapter: 3,
  order: 4,
  title: 'Lambda Expressions',
  subtitle: 'Modern C++ Idioms',
  tags: ['lambda-expression', 'capture-clause', 'closure'],

  hook: {
    question: 'What is "Lambda Expressions", and why does it matter?',
    realWorldContext: 'This lesson does not build a persistent project. Instead, you will build a series of isolated, disposable programs that define behavior exactly where it is needed. You will pass these inline functions around as data, creating the flexible foundations used in modern C++ to filter data, react to events, and customize algorithms on the fly.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Basic Lambda Syntax, Capturing Variables by Value, Capturing Variables by Reference, Generic Lambdas with auto, Storing Functions with std::function.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Lambda expression:** an unnamed, inline function defined directly inside another function. It exists It removes the need to write a full, separate function elsewhere when you only need a tiny piece of custom behavior once, exactly at the site where it is used.\n- **Capture clause:** the [] at the beginning of a lambda. It exists It dictates which outside variables from the surrounding function the inside of the lambda is allowed to see and use, protecting against accidental modifications of local state.\n- **Closure:** the actual runtime object created by a lambda expression. It exists Functions alone do not hold data, but a closure wraps both the behavior (the code) and the captured data (the state) into a single package that can be saved or passed around.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::function:** A standard library container that can hold any callable code, including lambdas.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A modern C++ program sets up an event system by creating a `std::function<void()>` to hold a callback. You assign it a lambda `[=](){ ... }` that captures the current state of your variables by value. When the event fires later, the `std::function` executes the lambda, which safely uses the closure\'s captured state to process the event locally, bridging the gap between where behavior is defined and when it actually executes.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Try to capture a variable by value and then modify it inside the lambda. Modify the `check_limit` lambda from Concept Unit 2: \n\n```cpp\n    auto check_limit = [threshold](int value) {\n        threshold = 20; // Attempt to modify\n    };\n```\n\n**The Failure:** \n\n```\nerror: assignment of read-only variable ‘threshold’\n```\n\nBy default, the copy inside the closure is strictly read-only (`const`). This prevents accidental logic errors where a developer believes they are updating the original variable when they are actually just updating an isolated copy. If you genuinely want to modify the copy (while leaving the original alone), you must add the `mutable` keyword: `[threshold](int value) mutable { ... }`.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **The Multiplier:** Write a lambda that captures an `int multiplier` by value and takes an `int value` as a parameter. It should return `value * multiplier`.\n- **The Counter:** Write a lambda that captures an integer by reference. Each time you call the lambda, it should increment the integer by 1 and print the new value.\n- **The Printer:** Create a `std::function<void(std::string)>` and assign it a lambda that prints the string to the console.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You can define a basic lambda using `[](){}`.\n- [ ] You can explain the difference between capturing by value `[x]` and capturing by reference `[&x]`.\n- [ ] You understand why `auto` is strictly necessary when declaring a lambda variable.\n- [ ] You can explain what `std::function` is and when you would use it instead of `auto`.\n- [ ] You can explain lambdas and closures out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 18: Lambda Expressions',
        caption: 'Lambda Expressions',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Basic Lambda Syntax',
              prose: [
                'You often need to pass a tiny piece of custom logic to an algorithm or another function. Writing a completely separate, named function outside of `main` just to use it once is tedious and disconnects the logic from where it is actually used. You need a way to define behavior inline.',
                '## How the Code Works',
                '- `#include <iostream>` — includes the standard input/output stream library so `std::cout` is available.\n- `int main() {` — opens the entry point of the program.\n- `auto say_hello =` — declares a variable named `say_hello`. The exact type of a lambda is a unique, unnameable type generated by the compiler during the build process, so you must use the `auto` keyword to let the compiler figure the type out.\n- `[]` — the capture clause. This marks the beginning of a lambda expression. Empty brackets mean this lambda does not use any variables from the surrounding `main` function.\n- `()` — the parameter list, functioning exactly like a normal function\'s parameter list. Empty parentheses mean it takes no arguments.\n- `{` — opens the body of the lambda, containing the code to run.\n- `std::cout << "Hello from the lambda!\\n";` — prints text to the console.\n- `};` — closes the lambda body and terminates the assignment statement with a semicolon.\n- `say_hello();` — executes the lambda, exactly as if it were a normal function.',
                '**CS lens.** This is the concept of **First-class functions**. Treating functions as first-class citizens means they can be assigned to variables, passed as arguments, and created dynamically, just like any other piece of data. Also recognized in: JavaScript callbacks, Python\'s `def` inside another `def`, Lisp\'s foundational structure.',
                '**SE lens.** This establishes **Locality of Behavior**. By defining the code exactly where it is used, you spare the reader from having to jump to a different file or scroll to the top of the file to see what a one-off helper function does. The tradeoff is that the logic cannot easily be tested in isolation since it has no name and exists only inside another function.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    auto say_hello = []() {\n        std::cout << "Hello from the lambda!\\n";\n    };\n\n    say_hello();\n    return 0;\n}',
              expectedOutput: 'Hello from the lambda!',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Capturing Variables by Value',
              prose: [
                'A lambda is its own isolated scope. If you declare a variable inside `main` and try to read it inside the lambda, the compiler will reject it, treating it as undeclared. You need a way to explicitly pass local data into the lambda without forcing that data to become a function parameter on every call.',
                '## How the Code Works',
                '- `int threshold = 10;` — a standard local variable defined inside `main`.\n- `auto check_limit =` — declares a variable to hold the new lambda.\n- `[threshold]` — the capture clause explicitly names `threshold`. This copies the current value of `threshold` into the lambda\'s internal memory at the exact moment the lambda is created.\n- `(int value)` — the parameter the lambda accepts when it is invoked.\n- `if (value > threshold)` — the lambda freely reads its internal copy of `threshold`. By default, this captured copy is read-only; attempting to assign `threshold = 20;` inside the lambda would cause a compiler error.\n- `check_limit(15);` — invokes the lambda, passing `15` as `value`.',
                '**CS lens.** This creates a **Closure**. A closure is a function bound together with its lexical environment. Functions alone are just logic; a closure is logic wrapped around a persistent snapshot of state. Also recognized in: React `useEffect` hooks, Rust closures, capturing variables in Swift closures.',
                '**SE lens.** Capturing by value enforces **Immutability**. Because the lambda only receives a copy, the surrounding function is guaranteed that the lambda will not secretly alter its variables. The tradeoff is memory and performance: capturing a large object (like a massive vector or string) by value requires copying the entire structure, which is slow.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int threshold = 10;\n\n    auto check_limit = [threshold](int value) {\n        if (value > threshold) {\n            std::cout << value << " is over the limit.\\n";\n        } else {\n            std::cout << value << " is safe.\\n";\n        }\n    };\n\n    check_limit(15);\n    check_limit(5);\n    return 0;\n}',
              expectedOutput: '15 is over the limit.\n5 is safe.',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Capturing Variables by Reference',
              prose: [
                'Capturing by value is safe but restrictive. If you actually want the lambda to *modify* a variable in the surrounding scope, or if the variable is too large to copy efficiently, you need the lambda to reach back into the original memory location instead of working on a duplicate.',
                '## How the Code Works',
                '- `int total_count = 0;` — a local integer initialized to zero.\n- `[&total_count]` — the `&` symbol means "capture by reference." The lambda does not make a copy; it stores a direct memory pointer back to the exact `total_count` variable in `main`.\n- `total_count = total_count + 1;` — because this is a reference, modifying it inside the lambda directly mutates the original variable in `main`.\n- `counter();` — executes the lambda, mutating `total_count` from `0` to `1`.\n- `counter();` — executes the lambda again, mutating `total_count` from `1` to `2`.\n- `std::cout << ... << total_count` — prints `2`, proving the lambda permanently modified the original memory.',
                '**CS lens.** This demonstrates **Side Effects** via aliasing. The lambda does not return a value; its entire purpose is to mutate state outside of itself.',
                '**SE lens.** Capturing by reference avoids expensive copies and allows shared state. The severe risk is **Dangling References**: if a lambda captures a local variable by reference, and that lambda is somehow returned or saved to be executed *after* the surrounding function finishes, the lambda will attempt to read memory that has already been destroyed, causing a fatal crash. You only capture by reference when you are certain the lambda will finish running before the captured variable goes out of scope.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int total_count = 0;\n\n    auto counter = [&total_count]() {\n        total_count = total_count + 1;\n        std::cout << "Count is now: " << total_count << "\\n";\n    };\n\n    counter();\n    counter();\n    std::cout << "Final count in main: " << total_count << "\\n";\n    return 0;\n}',
              expectedOutput: 'Count is now: 1\nCount is now: 2\nFinal count in main: 2',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Generic Lambdas with auto',
              prose: [
                'Standard functions force you to rigidly define the type of their parameters. If you need a lambda that can compare two integers, and later need to compare two floating-point numbers, writing two separate but identical lambdas violates the principle of keeping code DRY (Don\'t Repeat Yourself). You need a lambda that adapts to the type it is handed.',
                '## How the Code Works',
                '- `(auto a, auto b)` — uses the `auto` keyword in the parameter list. The compiler delays enforcing a type until the exact moment the lambda is invoked.\n- `return a + b;` — the lambda attempts to use the `+` operator on whatever types it receives.\n- `add_anything(5, 7)` — the compiler sees two integers. It silently generates a concrete version of the lambda behind the scenes where `a` and `b` are `int`.\n- `add_anything(3.14, 2.0)` — the compiler sees floating-point numbers. It generates a second, separate concrete version of the lambda where `a` and `b` are `double`.',
                '**CS lens.** This is **Parametric Polymorphism**, specifically C++\'s template system applied to lambdas. The code is written once but can operate on any type that supports the operations used inside the body.',
                '**SE lens.** Generic lambdas maximize code reuse for small utility operations without the heavy boilerplate of writing full C++ `template <typename T>` functions. The tradeoff is that if you pass types that cannot be added together (like two pointers), the compiler will emit a massive, difficult-to-read error message from deep inside the lambda\'s generated code.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    auto add_anything = [](auto a, auto b) {\n        return a + b;\n    };\n\n    std::cout << "Integers: " << add_anything(5, 7) << "\\n";\n    std::cout << "Decimals: " << add_anything(3.14, 2.0) << "\\n";\n    return 0;\n}',
              expectedOutput: 'Integers: 12\nDecimals: 5.14',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'Storing Functions with std::function',
              prose: [
                '`auto` is required to declare a lambda because its true type is unnameable. However, `auto` cannot be used to define a class member variable, and passing an `auto` parameter to another normal function requires making that function a template. You need a concrete, explicit type that can store a lambda so you can pass it across normal program boundaries or save it for later.',
                '## How the Code Works',
                '- `#include <functional>` — includes the standard library header required to use `std::function`.\n- `std::function<void(int)>` — declares a variable named `on_click`. The `<void(int)>` signature specifies exactly what this container accepts: it will hold *any* callable object that takes exactly one `int` parameter and returns `void`.\n- `on_click = [](int x) { ... };` — assigns a matching lambda into the container.\n- `on_click(42);` — invokes whatever callable object is currently stored in the container, passing `42` to it.\n- `on_click = [](int y) { ... };` — replaces the stored lambda with a completely new one. Because both lambdas share the `void(int)` signature, `std::function` accepts the swap.',
                '**CS lens.** This demonstrates **Type Erasure**. The unique, unnameable type of the lambda is erased and wrapped in a uniform, predictable `std::function` interface.',
                '**SE lens.** This provides the foundation for the **Command pattern** and event callbacks in C++. GUI libraries use this extensively to store button click handlers. The tradeoff is performance: `std::function` requires dynamic memory allocation behind the scenes and adds a small execution overhead (virtual function call cost) compared to a raw lambda, meaning it should not be used in extreme high-performance loops.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <functional>\n\nint main() {\n    std::function<void(int)> on_click;\n\n    on_click = [](int x) {\n        std::cout << "Clicked at position " << x << "\\n";\n    };\n\n    on_click(42);\n\n    on_click = [](int y) {\n        std::cout << "Alternative click behavior at " << y << "\\n";\n    };\n\n    on_click(99);\n    return 0;\n}',
              expectedOutput: 'Clicked at position 42\nAlternative click behavior at 99',
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
      'Next lesson: The Rule of Zero.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Capture clause"?',
      options: [
        'the [] at the beginning of a lambda. It exists It dictates which outside variables from the surrounding function the inside of the lambda is allowed to see and use, protecting against accidental modifications of local state.',
        'an unnamed, inline function defined directly inside another function. It exists It removes the need to write a full, separate function elsewhere when you only need a tiny piece of custom behavior once, exactly at the site where it is used.',
        'the actual runtime object created by a lambda expression. It exists Functions alone do not hold data, but a closure wraps both the behavior (the code) and the captured data (the state) into a single package that can be saved or passed around.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Lambda expression"?',
      options: [
        'the [] at the beginning of a lambda. It exists It dictates which outside variables from the surrounding function the inside of the lambda is allowed to see and use, protecting against accidental modifications of local state.',
        'an unnamed, inline function defined directly inside another function. It exists It removes the need to write a full, separate function elsewhere when you only need a tiny piece of custom behavior once, exactly at the site where it is used.',
        'the actual runtime object created by a lambda expression. It exists Functions alone do not hold data, but a closure wraps both the behavior (the code) and the captured data (the state) into a single package that can be saved or passed around.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Closure"?',
      options: [
        'an unnamed, inline function defined directly inside another function. It exists It removes the need to write a full, separate function elsewhere when you only need a tiny piece of custom behavior once, exactly at the site where it is used.',
        'the [] at the beginning of a lambda. It exists It dictates which outside variables from the surrounding function the inside of the lambda is allowed to see and use, protecting against accidental modifications of local state.',
        'the actual runtime object created by a lambda expression. It exists Functions alone do not hold data, but a closure wraps both the behavior (the code) and the captured data (the state) into a single package that can be saved or passed around.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Lambda expression** — an unnamed, inline function defined directly inside another function. It exists It removes the need to write a full, separate function elsewhere when you only need a tiny piece of custom behavior once, exactly at the site where it is used.',
    '**Capture clause** — the [] at the beginning of a lambda. It exists It dictates which outside variables from the surrounding function the inside of the lambda is allowed to see and use, protecting against accidental modifications of local state.',
    '**Closure** — the actual runtime object created by a lambda expression. It exists Functions alone do not hold data, but a closure wraps both the behavior (the code) and the captured data (the state) into a single package that can be saved or passed around.',
  ],

  checkpoints: ['read-intuition'],
}
