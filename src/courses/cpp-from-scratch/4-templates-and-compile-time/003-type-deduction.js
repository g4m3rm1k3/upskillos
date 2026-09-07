// cpp-from-scratch — Lesson 23: Type Deduction
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 23 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-23-type-deduction',
  slug: 'type-deduction',
  chapter: 4,
  order: 3,
  title: 'Type Deduction',
  subtitle: 'auto and decltype',
  tags: ['type-deduction', 'type-decay', 'reference-collapsing', 'forwarding-reference'],

  hook: {
    question: 'What is "Type Deduction", and why does it matter?',
    realWorldContext: 'A series of isolated console programs that allocate memory, manipulate data, and prove how the C++ compiler automatically deduces types. You will observe how `auto` drops qualifiers for safety, how `decltype` preserves them exactly, and how reference collapsing allows code to adapt to any input.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: auto and Type Decay, Reference Collapsing and auto&&, decltype, decltype(auto).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Type Deduction:** the compiler\'s ability to figure out a variable\'s type from its initializer. It exists to avoid typing redundant or complex type names while keeping the code statically typed.\n- **Type Decay:** the process where type deduction drops reference and const qualifiers. It exists to ensure that a basic assignment creates a safe, independent copy of the data by default.\n- **Reference Collapsing:** the language rule that merges a reference to a reference into a single valid reference. It exists so that generic code can accept both temporary values and persistent variables without generating illegal syntax like int& &.\n- **Forwarding Reference:** a reference declared as auto&& that can adapt to bind to any value category. It exists to allow a single variable to safely capture any kind of data without unnecessary copying.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::cout:** The standard character output stream from &lt;iostream&gt;.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how the compiler navigates type constraints step by step: You call a function returning `const std::string&`. If you assign it to `auto val`, the compiler decays the type, allocates new memory, and copies the string into a mutable `std::string`. If you assign it to `auto&& val`, reference collapsing recognizes an lvalue reference and safely creates a `const std::string&`. If you assign it to `decltype(auto) val`, the compiler perfectly mirrors the exact `const std::string&` return type. In all cases, the compiler acts as a static gatekeeper, enforcing exactly how much isolation or connection your data maintains.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you misunderstand `auto` decay, you will accidentally copy massive data structures. Let\'s prove it by breaking the reference link. Open a console project and write: \n\n```cpp\n#include <iostream>\n\nint data = 1;\nint& getData() { return data; }\n\nint main() {\n    auto myRef = getData();\n    myRef = 500;\n    std::cout << data << "\\n";\n}\n```\n\nRun it. The output is `1`, not `500`. The code compiled, but it silently failed to modify the original data because `auto` decayed the reference into a local copy. To fix it and restore the link, change `auto` to `decltype(auto)` or `auto&`.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Create a `const double` variable. Use `auto` to create a copy, and prove you can modify the copy (proving `const` was dropped).\n- Create an `int`. Bind it to an `auto&&` reference, and change the value. Then, bind the literal number `10` to an `auto&&` reference.\n- Write a function returning an `int&`. Use `decltype(auto)` to capture the result and modify the original data.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written and executed code that proves `auto` drops reference and `const` qualifiers.\n- [ ] You have written and executed code that proves `auto&&` can bind to both variables and temporary values.\n- [ ] You have intentionally created a local copy when you meant to create a reference by misusing `auto`.\n- [ ] You have verified that `decltype(auto)` preserves the exact return type of a function.\n- [ ] You can explain reference collapsing out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 23: Type Deduction',
        caption: 'Type Deduction',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'auto and Type Decay',
              prose: [
                'When you read a value from a variable, you generally want your own independent copy to work with. If the source variable happens to be a `const` reference, you do not necessarily want your new variable to be locked as a `const` reference too. The compiler needs a safe default behavior for deducing types that guarantees you get a fresh, modifiable copy unless you ask otherwise.',
                '## How the Code Works',
                '- `#include <iostream>` imports the standard input/output stream library so we can print values.\n- `int main() {` defines the entry point of the program.\n- `int original = 42;` allocates memory for a standard integer and sets it to 42.\n- `const int& ref = original;` creates a read-only reference to the existing `original` variable.\n- `auto copy = ref;` deduces the type for `copy`. The compiler looks at `ref`, which is a `const int&`. By default, `auto` applies **type decay**: it strips away the reference (`&`) and strips away the `const` qualifier. The resulting deduced type is a plain `int`. A brand-new memory location is allocated for `copy`, and the value 42 is copied into it.\n- `copy = 100;` overwrites the data in the memory location of `copy`. This proves `copy` is neither a reference (because `original` is unaffected) nor `const` (because the reassignment is allowed).\n- `std::cout << ...` prints the values, proving that `original` is still 42, while `copy` is 100.\n- `return 0;` signals successful completion of the program.',
                '**CS lens.** This embodies the concept of "pass-by-value" semantics applied to type inference. Safe defaults are a critical language design choice. By forcing `auto` to drop references and immutability guarantees, C++ ensures that generic code behaves like standard assignment: you get an isolated copy. To get a reference, you must explicitly opt-in by writing `auto&`.',
                '**SE lens.** The engineering principle is safety through isolation. The alternative not chosen is exact type matching for `auto`, where `auto x = ref;` would silently create another `const` reference. The tradeoff is that if you actually wanted a reference to avoid a heavy memory copy, a plain `auto` will quietly duplicate the data instead. You must intentionally write `auto&` or `const auto&` to share memory.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int original = 42;\n    const int& ref = original;\n\n    auto copy = ref;\n    copy = 100;\n\n    std::cout << "Original: " << original << "\\n";\n    std::cout << "Copy: " << copy << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Reference Collapsing and auto&&',
              prose: [
                'Sometimes you want to capture a value by reference to avoid copying it. But values come in two forms: persistent variables (lvalues) and temporary values (rvalues). `auto&` only binds to persistent variables. We need a way to declare a variable that automatically adapts its reference type to bind to absolutely anything without copying.',
                '## How the Code Works',
                '- `int original = 42;` creates a standard persistent integer.\n- `auto&& persistentRef = original;` asks the compiler to form a **forwarding reference**. `original` is an lvalue. `auto` is deduced as `int&`. The compiler attempts to create `int& &&` (an rvalue reference to an lvalue reference). C++ applies **reference collapsing** rules: any combination containing an lvalue reference (`&`) collapses to just `&`. The final type of `persistentRef` becomes exactly `int&`.\n- `persistentRef = 100;` overwrites the original memory location, proving it successfully bound as a mutable lvalue reference.\n- `auto&& temporaryRef = 999;` uses the exact same syntax, but `999` is an rvalue (a temporary literal). `auto` is deduced as `int`. The compiler creates `int&&`. Reference collapsing is not needed because there is no conflict. The final type is `int&&` (an rvalue reference).\n- `temporaryRef = 200;` modifies the temporary value whose lifetime was extended by the reference.\n- `std::cout << ...` prints the variables to confirm the mutations succeeded.',
                '**CS lens.** This embodies algebraic reduction rules applied to type systems. Just as multiplying a positive and negative number yields a predictable sign, reference collapsing follows strict boolean-like logic: `&` + `&&` = `&`, while `&&` + `&&` = `&&`. This mechanism is the backbone of generic programming, allowing a single template or variable to perfectly capture any value category. Also recognized in: boolean algebra (AND/OR truth tables), type unification in functional languages.',
                '**SE lens.** The alternative not chosen is writing two separate code paths for every situation: one for `int&` and one for `int&&`. The tradeoff of `auto&&` is conceptual complexity. It requires the programmer to understand that `&&` does not always mean "rvalue reference"; when attached to a deduced type like `auto`, it means "forwarding reference" that will dynamically collapse to whatever is necessary.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int original = 42;\n\n    auto&& persistentRef = original;\n    persistentRef = 100;\n\n    auto&& temporaryRef = 999;\n    temporaryRef = 200;\n\n    std::cout << "Original now: " << original << "\\n";\n    std::cout << "temporaryRef now: " << temporaryRef << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'decltype',
              prose: [
                'There are times when `auto`\'s decay behavior is dangerous. If you are inspecting a variable, you might need to know its *exact* declared type—including its `const` qualifiers and reference status—without the compiler stripping them away. We need a way to ask the compiler for the literal, undeclared type of an expression.',
                '## How the Code Works',
                '- `int data = 10;` creates the base integer.\n- `const int& ref = data;` establishes a read-only reference to `data`.\n- `decltype(ref)` is an operator that evaluates to the exact declared type of the expression `ref`. The compiler inspects the symbol table, sees that `ref` was explicitly declared as `const int&`, and replaces `decltype(ref)` with `const int&`.\n- `exactRef = data;` initializes this new `const int&` to point at `data`.\n- `// exactRef = 20;` proves the strictness of `decltype`. Unlike `auto`, which would have dropped the `const` and the `&`, `decltype` preserves both. The compiler correctly prevents you from modifying `exactRef` because it perfectly mirrored the read-only constraint.\n- `std::cout << ...` prints the value through the exact reference.',
                '**CS lens.** This embodies Compile-Time Reflection. You are programmatically querying the compiler\'s internal abstract syntax tree to extract metadata (the type) and inject it back into the code. Also recognized in: strongly-typed reflection APIs (like Java\'s `Class<?>`), metaprogramming type-traits.',
                '**SE lens.** The alternative not chosen is manually typing `const int& exactRef = data;`. The tradeoff is verbosity versus maintainability. If the return type of the source variable changes in the future (e.g., from `int` to `double`), `decltype` will automatically update the downstream types, preventing fragile, cascading type mismatches throughout the codebase.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int data = 10;\n    const int& ref = data;\n\n    decltype(ref) exactRef = data;\n    \n    // exactRef = 20; // Uncommenting this would cause a compiler error\n\n    std::cout << "Data is: " << exactRef << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'decltype(auto)',
              prose: [
                'If a function returns a reference to a global variable, and you want to capture that return value exactly as it is, typing `decltype(functionCall()) variable = functionCall();` forces you to write the function call twice. We need a syntax that combines the convenience of `auto` (deducing from the right-hand side) with the exactness of `decltype` (never decaying the type).',
                '## How the Code Works',
                '- `int globalData = 55;` allocates a persistent global integer.\n- `int& getGlobalRef() {` declares a function that returns a direct, mutable reference.\n- `return globalData;` returns the reference to the caller.\n- `auto decayed = getGlobalRef();` evaluates the right side. The function returns `int&`. `auto` rules apply type decay, dropping the `&`. `decayed` becomes an independent `int` initialized with a copy of 55.\n- `decayed = 100;` modifies only the local copy. The global data is untouched.\n- `decltype(auto) exact = getGlobalRef();` tells the compiler to deduce the type from the initializer, but to use `decltype` rules instead of `auto` rules. The function returns `int&`, so `decltype` preserves it exactly. `exact` is declared as an `int&` pointing directly to `globalData`.\n- `exact = 999;` overwrites the actual global variable, proving that `decltype(auto)` perfectly forwarded the reference.',
                '**CS lens.** This embodies Perfect Forwarding. The language provides a mechanism to pass data across boundaries (from function return to local variable) without altering its fundamental nature or accidentally triggering a deep copy. Also recognized in: network packet routing (preserving headers exactly as received), zero-copy memory buffers.',
                '**SE lens.** The alternative not chosen is forcing the programmer to write out the exact return type manually (`int& exact = ...`). The tradeoff is syntax complexity. `decltype(auto)` looks strange and requires advanced knowledge to read, but it perfectly insulates the local code from changes in the function\'s signature. If `getGlobalRef()` later changes to return a `const int&`, `exact` will automatically update to `const`, ensuring total safety without code edits.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint globalData = 55;\n\nint& getGlobalRef() {\n    return globalData;\n}\n\nint main() {\n    auto decayed = getGlobalRef();\n    decayed = 100; \n\n    decltype(auto) exact = getGlobalRef();\n    exact = 999; \n\n    std::cout << "globalData after decayed assignment: " << globalData << "\\n";\n    std::cout << "globalData after exact assignment: " << globalData << "\\n";\n    \n    return 0;\n}',
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
      'Next lesson: Variadic Templates.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Type Deduction"?',
      options: [
        'the compiler\'s ability to figure out a variable\'s type from its initializer. It exists to avoid typing redundant or complex type names while keeping the code statically typed.',
        'the language rule that merges a reference to a reference into a single valid reference. It exists so that generic code can accept both temporary values and persistent variables without generating illegal syntax like int& &.',
        'a reference declared as auto&& that can adapt to bind to any value category. It exists to allow a single variable to safely capture any kind of data without unnecessary copying.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Type Decay"?',
      options: [
        'the compiler\'s ability to figure out a variable\'s type from its initializer. It exists to avoid typing redundant or complex type names while keeping the code statically typed.',
        'a reference declared as auto&& that can adapt to bind to any value category. It exists to allow a single variable to safely capture any kind of data without unnecessary copying.',
        'the process where type deduction drops reference and const qualifiers. It exists to ensure that a basic assignment creates a safe, independent copy of the data by default.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Reference Collapsing"?',
      options: [
        'a reference declared as auto&& that can adapt to bind to any value category. It exists to allow a single variable to safely capture any kind of data without unnecessary copying.',
        'the process where type deduction drops reference and const qualifiers. It exists to ensure that a basic assignment creates a safe, independent copy of the data by default.',
        'the language rule that merges a reference to a reference into a single valid reference. It exists so that generic code can accept both temporary values and persistent variables without generating illegal syntax like int& &.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Forwarding Reference"?',
      options: [
        'the language rule that merges a reference to a reference into a single valid reference. It exists so that generic code can accept both temporary values and persistent variables without generating illegal syntax like int& &.',
        'the compiler\'s ability to figure out a variable\'s type from its initializer. It exists to avoid typing redundant or complex type names while keeping the code statically typed.',
        'a reference declared as auto&& that can adapt to bind to any value category. It exists to allow a single variable to safely capture any kind of data without unnecessary copying.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Type Deduction** — the compiler\'s ability to figure out a variable\'s type from its initializer. It exists to avoid typing redundant or complex type names while keeping the code statically typed.',
    '**Type Decay** — the process where type deduction drops reference and const qualifiers. It exists to ensure that a basic assignment creates a safe, independent copy of the data by default.',
    '**Reference Collapsing** — the language rule that merges a reference to a reference into a single valid reference. It exists so that generic code can accept both temporary values and persistent variables without generating illegal syntax like int& &.',
    '**Forwarding Reference** — a reference declared as auto&& that can adapt to bind to any value category. It exists to allow a single variable to safely capture any kind of data without unnecessary copying.',
  ],

  checkpoints: ['read-intuition'],
}
