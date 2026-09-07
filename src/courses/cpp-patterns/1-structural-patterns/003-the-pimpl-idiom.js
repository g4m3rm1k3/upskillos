// cpp-patterns — Lesson 3: The Pimpl Idiom
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 03 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-03-the-pimpl-idiom',
  slug: 'the-pimpl-idiom',
  chapter: 1,
  order: 3,
  title: 'The Pimpl Idiom',
  subtitle: 'Structural and Generic Patterns',
  tags: ['pimpl-idiom', 'opaque-pointer', 'incomplete-type', 'application-binary-interface-abi'],

  hook: {
    question: 'What is "The Pimpl Idiom", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Forward Declarations and Incomplete Types, The Implementation File and Delegation, Client Code and Compile-Time Isolation.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Pimpl Idiom:** "Pointer to implementation." A C++ programming technique that removes implementation details from a class definition by placing them in a separate class, accessed through an opaque pointer. It exists to minimize compilation dependencies and preserve binary compatibility.\n- **Opaque Pointer:** A pointer to a record or data structure of some unspecified type (an incomplete type). It hides the internal details of the object it points to from the client code.\n- **Incomplete Type:** A type that has been declared but not yet defined. You can declare a pointer or reference to an incomplete type, but you cannot create an instance of it or dereference it, because the compiler doesn\'t know its size or layout.\n- **Application Binary Interface (ABI):** The interface between two binary program modules at the machine code level. If the size or layout of a class changes (like adding a private field), the ABI breaks, requiring recompilation of all code using that class.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::unique_ptr:** A smart pointer that owns and manages another object through a pointer and disposes of that object when the unique_ptr goes out of scope.\n- **std::make_unique:** A standard library function that constructs an object of a given type and wraps it in a std::unique_ptr.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'When `main.cpp` executes `Widget w("Dashboard");`, it calls the `Widget` constructor defined in `Widget.cpp`. That constructor dynamically allocates a `Widget::Impl` on the heap, passing `"Dashboard"` to the `Impl`\'s constructor, and stores the resulting pointer in the `std::unique_ptr<Impl> pimpl` member of `Widget`. When `w.draw()` is called, `Widget::draw()` forwards the call by dereferencing `pimpl->draw_internal()`, causing the private `draw_count` to increment and the text to print. Finally, when `w` goes out of scope, the destructor (defaulted in `Widget.cpp`) safely destroys the `unique_ptr`, which deallocates the `Impl`.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If we remove `Widget::~Widget() = default;` from `Widget.cpp` and put it inline in `Widget.h` (`~Widget() = default;`), the compilation will fail with an error like `invalid application of \'sizeof\' to an incomplete type \'Widget::Impl\'`. The `std::unique_ptr` needs to know the size of the object to call `delete` on it, which it cannot do in the header.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Add a `std::vector<int>` field to `Widget::Impl` in `Widget.cpp` and recompile only `Widget.cpp`. Observe that `main.cpp` does not need to be recompiled.\n- Implement a Copy Constructor and Copy Assignment operator for `Widget`. Since `unique_ptr` cannot be copied, you must manually allocate a new `Impl` in the copy constructor and copy the data from the source `Impl`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [x] Pimpl interface defined in header.\n- [x] Impl struct defined in source file.\n- [x] Destructor and move semantics implemented in source file.\n- [x] Client application runs successfully.\n- `git commit -m "Implement Widget class using Pimpl idiom to isolate private state and minimize compilation dependencies"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 3: The Pimpl Idiom',
        caption: 'The Pimpl Idiom',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Forward Declarations and Incomplete Types',
              prose: [
                'When you include a header file (like `<string>` or `<vector>`) in your own class\'s header to use as private fields, every file that includes *your* header also drags in those dependencies. If you change a private member in your class, the size of your class changes, and every file that includes your header must be recompiled. In a large codebase, touching one private field can trigger a massive rebuild.',
                '## First, In Isolation',
                '```cpp\n// isolated_example.cpp\n#include <iostream>\n\n// 1. Forward declaration: "Impl exists, but I won\'t tell you its size or fields."\nstruct Impl;\n\n// 2. We can create pointers to it, because all pointers have a fixed size.\nstruct Wrapper {\n    Impl* pimpl;\n};\n\nint main() {\n    Wrapper w;\n    std::cout << "Wrapper size: " << sizeof(w) << " bytes\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#pragma once` — A preprocessor directive that ensures this header file is included only once in a single compilation unit, preventing redefinition errors.\n- `#include <memory>` — Includes the standard library header for `std::unique_ptr`.\n- `#include <string>` — Includes the standard library header for `std::string`, used in the constructor.\n- `class Widget {` — Declares our main class, the interface the client will use.\n- `public:` — Access modifier making the following members accessible to anyone.\n- `Widget(std::string name);` — The constructor declaration. Takes a string to configure the widget.\n- `~Widget();` — The destructor declaration. It must be explicitly declared here (not defaulted or defined inline), because at this point in the header, `Impl` is an incomplete type. If the compiler generates a default destructor here, it won\'t know how to destroy `Impl`, causing a compilation error.\n- `Widget(Widget&&) noexcept;` — Declares the move constructor. We must explicitly declare it because declaring a destructor prevents the compiler from automatically generating move operations.\n- `Widget& operator=(Widget&&) noexcept;` — Declares the move assignment operator.\n- `void draw() const;` — A public method for the client to call.\n- `private:` — Access modifier hiding the following members.\n- `struct Impl;` — The forward declaration of our implementation struct. This is an incomplete type. We are saying "There is a struct named `Impl`, but its definition is elsewhere."\n- `std::unique_ptr<Impl> pimpl;` — A smart pointer holding the actual implementation. `unique_ptr` can store an incomplete type as long as the type is fully defined by the time the `unique_ptr` needs to destroy it (which will be in the source file, not the header).',
                '**CS lens.** This is an embodiment of the **Bridge Pattern** (or Handle/Body idiom). By separating the abstraction (`Widget`) from its implementation (`Impl`), the two can vary independently. Also recognized in: operating system file descriptors (where the `int` handle hides the complex kernel struct), windowing systems (X11 `Window` handles), and opaque pointers in C libraries (`FILE*` in `<stdio.h>`).',
                '**SE lens.** The principle here is **Information Hiding** and **Minimizing Compile-Time Dependencies**. The alternative not chosen: putting all private members (like `std::vector<int> data`, `std::mutex mtx`, heavy third-party headers) directly into `Widget.h`. The tradeoff: doing that makes `Widget.h` large and forces every client to recompile when any private member changes, slowing down builds. The cost of Pimpl: one heap allocation per object (to create the `Impl`), and one extra pointer indirection every time a method accesses private data.'
              ],
              typeIt: true,
              solution: '// Widget.h\n#pragma once\n#include <memory>\n#include <string>\n\nclass Widget {\npublic:\n    Widget(std::string name);\n    ~Widget();\n\n    Widget(Widget&&) noexcept;\n    Widget& operator=(Widget&&) noexcept;\n\n    void draw() const;\n\nprivate:\n    struct Impl;\n    std::unique_ptr<Impl> pimpl;\n};',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Implementation File and Delegation',
              prose: [
                'The header file promises that an `Impl` structure exists and that `Widget` has methods, but it does not define them. We need to implement `Impl` and wire `Widget`\'s methods to it, ensuring `Impl` is only visible to the compiler when building the library itself, not when building the client.',
                '## First, In Isolation',
                '```cpp\n// isolated_example2.cpp\n#include <iostream>\n#include <memory>\n\nstruct Hidden {\n    void do_work() { std::cout << "Work done behind the scenes.\\n"; }\n};\n\nstruct Interface {\n    std::unique_ptr<Hidden> ptr = std::make_unique<Hidden>();\n    void perform() { ptr->do_work(); }\n};\n\nint main() {\n    Interface i;\n    i.perform();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include "Widget.h"` — Brings in our class declaration so we can implement its methods.\n- `#include <iostream>` — We can include heavy headers here safely, because client code won\'t see this file, avoiding cascading dependencies.\n- `struct Widget::Impl {` — Fully defines the previously incomplete `Impl` type. Because it is nested in `Widget`\'s namespace, we scope it with `Widget::`.\n- `std::string name;` — A private data member of the implementation.\n- `int draw_count = 0;` — Another private data member keeping track of internal state.\n- `Impl(std::string n) : name(std::move(n)) {}` — The `Impl` constructor, taking ownership of the string.\n- `void draw_internal() {` — The actual work method.\n- `draw_count++;` — Mutates internal state.\n- `std::cout << "Drawing widget: " << name << " (Count: " << draw_count << ")\\n";` — Prints output using the hidden state.\n- `Widget::Widget(std::string name)` — The `Widget` constructor definition.\n- `: pimpl(std::make_unique<Impl>(std::move(name))) {}` — Initializes the `unique_ptr` by allocating a new `Impl` on the heap and passing the string to its constructor. This is the exact cost of the Pimpl idiom: one heap allocation.\n- `Widget::~Widget() = default;` — We tell the compiler to generate the default destructor *here*. This is critical: in this source file, `Impl` is fully defined, so `std::unique_ptr<Impl>` knows how to delete it safely.\n- `Widget::Widget(Widget&&) noexcept = default;` — Defaults the move constructor here, for the same reason.\n- `Widget& Widget::operator=(Widget&&) noexcept = default;` — Defaults the move assignment operator here.\n- `void Widget::draw() const {` — Defines the public interface method.\n- `pimpl->draw_internal();` — Dereferences the pointer to call the actual implementation. This is the other exact cost of the Pimpl idiom: one pointer indirection per call.',
                '**CS lens.** This pattern creates an **Application Binary Interface (ABI) boundary**. Because the `Widget` object itself contains only a single pointer (`pimpl`), `sizeof(Widget)` is always exactly the size of one pointer (e.g., 8 bytes). If you later add five new fields to `Widget::Impl`, `sizeof(Widget)` remains 8 bytes. This means pre-compiled client code that links to this library does not need to be recompiled when you update the library internals, preserving binary compatibility. Also recognized in: dynamic linked libraries (.dll, .so) exposing stable C APIs.',
                '**SE lens.** The principle is **Encapsulation**. By enforcing a strict boundary, you guarantee that no client code can accidentally depend on your private fields, because they literally cannot see them. The tradeoff is boilerplate: every public method requires a forwarding wrapper function, and you must manually define the destructor and move semantics in the source file.'
              ],
              typeIt: true,
              solution: '// Widget.cpp\n#include "Widget.h"\n#include <iostream>\n\nstruct Widget::Impl {\n    std::string name;\n    int draw_count = 0;\n\n    Impl(std::string n) : name(std::move(n)) {}\n\n    void draw_internal() {\n        draw_count++;\n        std::cout << "Drawing widget: " << name << " (Count: " << draw_count << ")\\n";\n    }\n};\n\nWidget::Widget(std::string name)\n    : pimpl(std::make_unique<Impl>(std::move(name))) {}\n\nWidget::~Widget() = default;\n\nWidget::Widget(Widget&&) noexcept = default;\nWidget& Widget::operator=(Widget&&) noexcept = default;\n\nvoid Widget::draw() const {\n    pimpl->draw_internal();\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Client Code and Compile-Time Isolation',
              prose: [
                'We need to prove that client code can include `Widget.h`, instantiate a `Widget`, and call its methods, all without knowing what `Impl` contains or including `<iostream>`.',
                '## First, In Isolation',
                '```cpp\n// isolated_example3.cpp\n#define SECRET 42\nstruct Hidden { int value = SECRET; };\nstruct API { Hidden* h; };\n```',
                '## How the Code Works',
                '- `#include "Widget.h"` — The client includes only the interface header. The compiler processes this and sees that `Widget` has a `unique_ptr<Impl>`, but `Impl` is incomplete.\n- `int main() {` — The entry point of the client application.\n- `Widget w("Dashboard");` — Instantiates a `Widget`. The compiler calls the constructor declared in the header, which is defined in the source file to do the actual allocation.\n- `w.draw();` — Calls the public method. The delegation to `Impl` happens inside the compiled library code, completely opaque to `main.cpp`.\n- `w.draw();` — Calls it again to prove state (`draw_count`) persists inside the hidden pointer.\n- `return 0;` — Exits. The `Widget` destructor is called automatically, which correctly destroys the `unique_ptr` and the `Impl` because we defaulted the destructor in the source file.',
                '**CS lens.** This demonstrates **Separation of Concerns** at the build level. The build system parses `main.cpp` and `Widget.cpp` as independent translation units. `main.cpp` only needs the symbol signatures from `Widget.h`. The linker connects the calls at the end.',
                '**SE lens.** The principle is **Decoupling**. The client depends only on the abstraction. If we change `Widget.cpp` to use a GPU for drawing, we only recompile `Widget.cpp`, and then relink. `main.cpp` doesn\'t even need to be recompiled.'
              ],
              typeIt: true,
              solution: '// main.cpp\n#include "Widget.h"\n// Note: We do NOT include <iostream> or know about Impl.\n\nint main() {\n    Widget w("Dashboard");\n    w.draw();\n    w.draw();\n    return 0;\n}',
              expectedOutput: 'Drawing widget: Dashboard (Count: 1)\nDrawing widget: Dashboard (Count: 2)',
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
      'Next lesson: Policy-Based Design.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Opaque Pointer"?',
      options: [
        'A pointer to a record or data structure of some unspecified type (an incomplete type). It hides the internal details of the object it points to from the client code.',
        'A type that has been declared but not yet defined. You can declare a pointer or reference to an incomplete type, but you cannot create an instance of it or dereference it, because the compiler doesn\'t know its size or layout.',
        'The interface between two binary program modules at the machine code level. If the size or layout of a class changes (like adding a private field), the ABI breaks, requiring recompilation of all code using that class.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Application Binary Interface (ABI)"?',
      options: [
        'A type that has been declared but not yet defined. You can declare a pointer or reference to an incomplete type, but you cannot create an instance of it or dereference it, because the compiler doesn\'t know its size or layout.',
        'The interface between two binary program modules at the machine code level. If the size or layout of a class changes (like adding a private field), the ABI breaks, requiring recompilation of all code using that class.',
        '"Pointer to implementation." A C++ programming technique that removes implementation details from a class definition by placing them in a separate class, accessed through an opaque pointer. It exists to minimize compilation dependencies and preserve binary compatibility.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Incomplete Type"?',
      options: [
        'The interface between two binary program modules at the machine code level. If the size or layout of a class changes (like adding a private field), the ABI breaks, requiring recompilation of all code using that class.',
        'A pointer to a record or data structure of some unspecified type (an incomplete type). It hides the internal details of the object it points to from the client code.',
        'A type that has been declared but not yet defined. You can declare a pointer or reference to an incomplete type, but you cannot create an instance of it or dereference it, because the compiler doesn\'t know its size or layout.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Pimpl Idiom"?',
      options: [
        '"Pointer to implementation." A C++ programming technique that removes implementation details from a class definition by placing them in a separate class, accessed through an opaque pointer. It exists to minimize compilation dependencies and preserve binary compatibility.',
        'A type that has been declared but not yet defined. You can declare a pointer or reference to an incomplete type, but you cannot create an instance of it or dereference it, because the compiler doesn\'t know its size or layout.',
        'A pointer to a record or data structure of some unspecified type (an incomplete type). It hides the internal details of the object it points to from the client code.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Pimpl Idiom** — "Pointer to implementation." A C++ programming technique that removes implementation details from a class definition by placing them in a separate class, accessed through an opaque pointer. It exists to minimize compilation dependencies and preserve binary compatibility.',
    '**Opaque Pointer** — A pointer to a record or data structure of some unspecified type (an incomplete type). It hides the internal details of the object it points to from the client code.',
    '**Incomplete Type** — A type that has been declared but not yet defined. You can declare a pointer or reference to an incomplete type, but you cannot create an instance of it or dereference it, because the compiler doesn\'t know its size or layout.',
    '**Application Binary Interface (ABI)** — The interface between two binary program modules at the machine code level. If the size or layout of a class changes (like adding a private field), the ABI breaks, requiring recompilation of all code using that class.',
  ],

  checkpoints: ['read-intuition'],
}
