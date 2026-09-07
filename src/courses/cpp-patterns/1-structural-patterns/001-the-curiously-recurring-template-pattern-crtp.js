// cpp-patterns — Lesson 1: The Curiously Recurring Template Pattern (CRTP)
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 01 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-01-the-curiously-recurring-template-pattern-crtp',
  slug: 'the-curiously-recurring-template-pattern-crtp',
  chapter: 1,
  order: 1,
  title: 'The Curiously Recurring Template Pattern (CRTP)',
  subtitle: 'Structural and Generic Patterns',
  tags: ['static-polymorphism', 'virtual-dispatch', 'zero-cost-abstraction', 'curiously-recurring-template-pattern-crtp', 'vtable-virtual-method-table'],

  hook: {
    question: 'What is "The Curiously Recurring Template Pattern (CRTP)", and why does it matter?',
    realWorldContext: 'You will build a high-performance polymorphic benchmark that contrasts two approaches to interface design. First, you will construct a traditional class hierarchy using virtual functions and measure its execution overhead. Then, you will reconstruct the exact same polymorphic behavior using the Curiously Recurring Template Pattern (CRTP), substituting runtime indirection for compile-time generation to achieve a true zero-cost abstraction.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: The Runtime Cost of Virtual Dispatch, The Curiously Recurring Template Pattern (CRTP).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Static Polymorphism:** the ability to present a single interface for multiple distinct types where the exact implementation to call is resolved entirely by the compiler at compile time, eliminating the need for runtime lookups. This exists to enable generic programming without sacrificing performance.\n- **Virtual Dispatch:** the mechanism by which C++ resolves calls to virtual functions at runtime by looking up the correct function pointer in a hidden table. This solves the problem of calling derived-class behavior through a base-class pointer, but introduces a performance penalty.\n- **Zero-Cost Abstraction:** a design principle where using a higher-level programming construct (like an interface or a template) compiles down to the exact same machine code you would have written by hand, incurring no additional runtime overhead. It exists so developers do not have to choose between clean architecture and raw speed.\n- **Curiously Recurring Template Pattern (CRTP):** a C++ idiom where a class X derives from a class template instantiated with X itself as the template argument (e.g., class X : public Base&lt;X&gt;). It exists to allow a base class to know the exact type of its derived class at compile time, injecting behavior or enabling static polymorphism.\n- **Vtable (Virtual Method Table):** a hidden array of function pointers created by the compiler for any class containing virtual functions. It exists to enable dynamic dispatch, forcing the CPU to fetch the function address from memory before calling it.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::chrono::high_resolution_clock:** A clock class providing the smallest tick period available on the current system.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'In the dynamic pipeline, `run_dynamic_work` receives a reference, reads the Vtable pointer attached to `DynamicWorker`, looks up the address of `process()`, and executes an indirect jump 100 million times. In the static pipeline, the compiler examines `StaticWorker : StaticProcessor<StaticWorker>`, generates a unique `run_static_work<StaticWorker>` function, replaces `processor.process()` with `static_cast<const StaticWorker*>(this)->process_impl()`, sees that `process_impl()` is an empty assembly block, and literally collapses the entire 100-million iteration loop into inline raw instructions, resulting in a zero-millisecond runtime cost.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you attempt to call `processor.process_impl()` directly from the base class `StaticProcessor` without the `static_cast`, the compiler will throw an error: `error: \'const struct StaticProcessor<StaticWorker>\' has no member named \'process_impl\'`. The base class does not inherently possess the derived class\'s methods; the cast is the mandatory bridge that asserts the structural relationship.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Change `StaticWorker` to NOT implement `process_impl()`. Observe the spectacular template compilation error generated when `StaticProcessor` tries to call a missing method.\n- Add a state variable (e.g., `int count`) to both workers, increment it in the loop, and return it. Observe how the compiler optimizes the CRTP version into a single mathematical multiplication, while the dynamic version must incrementally update the memory on every pass.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [x] Establish the baseline performance penalty of standard virtual function dispatch.\n- [x] Prove the syntax and structure of the `Base<Derived>` CRTP idiom.\n- [x] Replace runtime virtual dispatch with compile-time static cast dispatch.\n- [x] Demonstrate the zero-cost performance profile achieved by compiler inlining.\n- Commit message: `feat: implement CRTP static polymorphism benchmark proving zero-cost abstraction over virtual dispatch`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 1: The Curiously Recurring Template Pattern (CRTP)',
        caption: 'The Curiously Recurring Template Pattern (CRTP)',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Runtime Cost of Virtual Dispatch',
              prose: [
                'When building generic systems, we often want an interface that guarantees a set of operations (like `process()`) that multiple derived types must implement. The traditional C++ approach uses `virtual` functions and base-class pointers. However, virtual functions cannot be completely optimized away by the compiler; the CPU must look up the correct implementation in a Vtable at runtime, introducing a mandatory penalty in tight loops.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <chrono>\n\nstruct Base {\n    virtual void do_work() = 0;\n    virtual ~Base() = default;\n};\n\nstruct Derived : public Base {\n    void do_work() override {\n        // Minimal work to prevent the loop from being entirely optimized out\n        asm(""); \n    }\n};\n\nint main() {\n    Derived d;\n    Base* ptr = &d;\n\n    auto start = std::chrono::high_resolution_clock::now();\n    for (int i = 0; i < 100000000; ++i) {\n        ptr->do_work(); // Virtual dispatch\n    }\n    auto end = std::chrono::high_resolution_clock::now();\n    \n    std::cout << "Virtual time: " \n              << std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count() \n              << " ms\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `struct DynamicProcessor` — defines the base interface contract. A `struct` is used instead of a `class` purely to default all members to `public`.\n- `virtual void process() const = 0;` — a pure virtual function. `virtual` instructs the compiler to generate a Vtable entry for this method. `= 0` dictates that derived classes must provide their own implementation. `const` ensures the method does not mutate the object\'s state.\n- `virtual ~DynamicProcessor() = default;` — a virtual destructor. This guarantees that if a derived object is destroyed through a base class pointer, the correct derived destructor is invoked, preventing memory leaks.\n- `struct DynamicWorker : public DynamicProcessor` — declares a concrete subclass that inherits from the interface.\n- `void process() const override` — provides the actual implementation. `override` explicitly tells the compiler to verify that this method exactly matches a virtual method in the base class.\n- `asm("");` — an inline assembly directive that emits no instructions. It acts as an optimization barrier, preventing the compiler from realizing the loop does nothing and stripping the entire loop away.\n- `void run_dynamic_work(const DynamicProcessor& processor)` — accepts the object by reference to a base class. This forces the compiler to use dynamic dispatch, since it cannot prove the exact underlying type of `processor` at compile time from the function signature alone.\n- `processor.process();` — invokes the method. At runtime, the program reads the object\'s hidden Vtable pointer, offsets to the `process` entry, and jumps to the function address stored there.',
                '**CS lens.** **Dynamic Dispatch**. This mechanism enables Late Binding. The exact code to execute is determined at runtime based on the actual type of the object, not the type of the pointer or reference holding it. It is fundamentally an indirect jump instruction.',
                '**SE lens.** **The Vtable Penalty**. While highly flexible, virtual functions defeat function inlining. Because the compiler does not know which function will be called until runtime, it cannot insert the function\'s body directly into the calling loop. This causes pipeline stalls and branch mispredictions on the CPU, making it a poor choice for highly iterative operations like per-pixel rendering, high-frequency trading, or dense mathematical simulations.'
              ],
              typeIt: true,
              solution: 'struct DynamicProcessor {\n    virtual void process() const = 0;\n    virtual ~DynamicProcessor() = default;\n};\n\nstruct DynamicWorker : public DynamicProcessor {\n    void process() const override {\n        asm(""); // Prevent over-optimization\n    }\n};\n\nvoid run_dynamic_work(const DynamicProcessor& processor) {\n    for (int i = 0; i < 100000000; ++i) {\n        processor.process();\n    }\n}',
              expectedOutput: '$ ./benchmark\nDynamic dispatch: 145 ms',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Curiously Recurring Template Pattern (CRTP)',
              prose: [
                'We want a base class that defines a clear interface and behavior, but we want the calls to dispatch directly to the derived class without a Vtable. To do this, the base class needs to know the exact type of the derived class at compile time, which seems impossible since the base class is defined before the derived class.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\ntemplate <typename Derived>\nstruct CRTPBase {\n    void call_impl() {\n        // Downcast \'this\' to the Derived type to call its specific method\n        static_cast<Derived*>(this)->implementation();\n    }\n};\n\n// Derived passes ITSELF as the template argument to CRTPBase\nstruct SpecificDerived : public CRTPBase<SpecificDerived> {\n    void implementation() {\n        std::cout << "Compile-time static dispatch executed.\\n";\n    }\n};\n\nint main() {\n    SpecificDerived obj;\n    obj.call_impl();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `template <typename Derived>` — declares that `StaticProcessor` is a class template requiring one type parameter, which by convention represents the derived class.\n- `struct StaticProcessor` — the base class template acting as our static interface.\n- `void process() const` — a non-virtual method in the base class. Because it is not virtual, calling it has no overhead. It serves as the public API contract.\n- `static_cast<const Derived*>(this)` — the core mechanism of CRTP. Because `this` is a pointer to `StaticProcessor`, and we know `StaticProcessor` is only ever inherited by `Derived`, we can safely instruct the compiler to treat the base pointer as a derived pointer.\n- `->process_impl();` — invokes the specific implementation on the derived type. Because the exact type of `Derived` is known at compile time, the compiler resolves the address of `process_impl` immediately.\n- `struct StaticWorker : public StaticProcessor<StaticWorker>` — the curious recurrence. `StaticWorker` inherits from a template instantiated with its own type. This ties the base class to this specific implementation forever.\n- `void process_impl() const` — the concrete behavior. Note that this method does not need `override` because it is not virtual; it is just a plain method the base class expects to exist.\n- `template <typename T>` — makes the runner function a template.\n- `void run_static_work(const StaticProcessor<T>& processor)` — accepts the exact instantiated base type. Because it is a template, the compiler generates a unique, dedicated version of this function for every distinct `T` passed into it.\n- `processor.process();` — calls the base method, which calls `static_cast`, which calls `process_impl`. The compiler sees exactly where the code goes.',
                '**CS lens.** **F-bound Polymorphism**. In type theory, this pattern is a form of F-bounded quantification, where a type is parameterized over itself. It allows types to enforce self-referential constraints, ensuring that a generic function operating on an object returns or expects that exact object type, rather than an eroded base type. Also recognized in: Java\'s `Enum<E extends Enum<E>>`, Rust traits with `Self` types, and recursive mixin architectures.',
                '**SE lens.** **Compile-Time Type Substitution**. By moving the dispatch from a runtime pointer lookup to a compile-time template instantiation, we achieve a **Zero-Cost Abstraction**. The compiler knows the exact address of `process_impl()`. Consequently, the compiler can take the body of `process_impl()` and inline it directly inside the loop inside `run_static_work()`. The function call disappears entirely from the final machine code, leaving only the raw assembly instructions behind. The tradeoff is larger binary size (code bloat), since every new derived class generates a brand-new copy of the `run_static_work` function and `StaticProcessor` base class.'
              ],
              typeIt: true,
              solution: 'template <typename Derived>\nstruct StaticProcessor {\n    void process() const {\n        static_cast<const Derived*>(this)->process_impl();\n    }\n};\n\nstruct StaticWorker : public StaticProcessor<StaticWorker> {\n    void process_impl() const {\n        asm(""); // Prevent over-optimization\n    }\n};\n\ntemplate <typename T>\nvoid run_static_work(const StaticProcessor<T>& processor) {\n    for (int i = 0; i < 100000000; ++i) {\n        processor.process();\n    }\n}',
              expectedOutput: '$ ./benchmark\nDynamic dispatch: 145 ms\nStatic dispatch: 0 ms',
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
      'Next lesson: Type Erasure.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Zero-Cost Abstraction"?',
      options: [
        'the ability to present a single interface for multiple distinct types where the exact implementation to call is resolved entirely by the compiler at compile time, eliminating the need for runtime lookups. This exists to enable generic programming without sacrificing performance.',
        'a design principle where using a higher-level programming construct (like an interface or a template) compiles down to the exact same machine code you would have written by hand, incurring no additional runtime overhead. It exists so developers do not have to choose between clean architecture and raw speed.',
        'a C++ idiom where a class X derives from a class template instantiated with X itself as the template argument (e.g., class X : public Base&lt;X&gt;). It exists to allow a base class to know the exact type of its derived class at compile time, injecting behavior or enabling static polymorphism.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Curiously Recurring Template Pattern (CRTP)"?',
      options: [
        'a design principle where using a higher-level programming construct (like an interface or a template) compiles down to the exact same machine code you would have written by hand, incurring no additional runtime overhead. It exists so developers do not have to choose between clean architecture and raw speed.',
        'the mechanism by which C++ resolves calls to virtual functions at runtime by looking up the correct function pointer in a hidden table. This solves the problem of calling derived-class behavior through a base-class pointer, but introduces a performance penalty.',
        'a C++ idiom where a class X derives from a class template instantiated with X itself as the template argument (e.g., class X : public Base&lt;X&gt;). It exists to allow a base class to know the exact type of its derived class at compile time, injecting behavior or enabling static polymorphism.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Virtual Dispatch"?',
      options: [
        'the ability to present a single interface for multiple distinct types where the exact implementation to call is resolved entirely by the compiler at compile time, eliminating the need for runtime lookups. This exists to enable generic programming without sacrificing performance.',
        'a hidden array of function pointers created by the compiler for any class containing virtual functions. It exists to enable dynamic dispatch, forcing the CPU to fetch the function address from memory before calling it.',
        'the mechanism by which C++ resolves calls to virtual functions at runtime by looking up the correct function pointer in a hidden table. This solves the problem of calling derived-class behavior through a base-class pointer, but introduces a performance penalty.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Static Polymorphism"?',
      options: [
        'a design principle where using a higher-level programming construct (like an interface or a template) compiles down to the exact same machine code you would have written by hand, incurring no additional runtime overhead. It exists so developers do not have to choose between clean architecture and raw speed.',
        'the mechanism by which C++ resolves calls to virtual functions at runtime by looking up the correct function pointer in a hidden table. This solves the problem of calling derived-class behavior through a base-class pointer, but introduces a performance penalty.',
        'the ability to present a single interface for multiple distinct types where the exact implementation to call is resolved entirely by the compiler at compile time, eliminating the need for runtime lookups. This exists to enable generic programming without sacrificing performance.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Static Polymorphism** — the ability to present a single interface for multiple distinct types where the exact implementation to call is resolved entirely by the compiler at compile time, eliminating the need for runtime lookups. This exists to enable generic programming without sacrificing performance.',
    '**Virtual Dispatch** — the mechanism by which C++ resolves calls to virtual functions at runtime by looking up the correct function pointer in a hidden table. This solves the problem of calling derived-class behavior through a base-class pointer, but introduces a performance penalty.',
    '**Zero-Cost Abstraction** — a design principle where using a higher-level programming construct (like an interface or a template) compiles down to the exact same machine code you would have written by hand, incurring no additional runtime overhead. It exists so developers do not have to choose between clean architecture and raw speed.',
    '**Curiously Recurring Template Pattern (CRTP)** — a C++ idiom where a class X derives from a class template instantiated with X itself as the template argument (e.g., class X : public Base&lt;X&gt;). It exists to allow a base class to know the exact type of its derived class at compile time, injecting behavior or enabling static polymorphism.',
    '**Vtable (Virtual Method Table)** — a hidden array of function pointers created by the compiler for any class containing virtual functions. It exists to enable dynamic dispatch, forcing the CPU to fetch the function address from memory before calling it.',
  ],

  checkpoints: ['read-intuition'],
}
