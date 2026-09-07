// cpp-patterns — Lesson 2: Type Erasure
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 02 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-02-type-erasure',
  slug: 'type-erasure',
  chapter: 1,
  order: 2,
  title: 'Type Erasure',
  subtitle: 'Structural and Generic Patterns',
  tags: ['heterogeneous-collection', 'intrusive-inheritance', 'duck-typing', 'type-erasure', 'concept-model-idiom', 'small-buffer-optimization-sbo'],

  hook: {
    question: 'What is "Type Erasure", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 1 core ideas: The Heterogeneous Collection Problem.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Heterogeneous collection:** A container (like an array or list) that holds objects of different, distinct types. C++ collections are strictly homogeneous by default; building a heterogeneous one requires explicit design.\n- **Intrusive inheritance:** The requirement that a class explicitly declare class A : public Base to participate in a system. It fails when you cannot modify the class (like std::string or a third-party type) to add the inheritance.\n- **Duck typing:** A programming concept where an object\'s suitability is determined by the presence of certain methods, rather than its actual type or inheritance tree ("If it walks like a duck and quacks like a duck..."). Templates support compile-time duck typing; type erasure enables runtime duck typing.\n- **Type Erasure:** A design pattern that provides a non-templated interface to templated, type-specific behavior. It hides the concrete type of an object from the user of the wrapper, preserving only the specific operations the wrapper promises to support.\n- **Concept-Model Idiom:** The specific C++ implementation technique for type erasure, utilizing a non-templated wrapper class holding a pointer to a private abstract base class (the "Concept"), which is implemented by a private templated derived class (the "Model").\n- **Small Buffer Optimization (SBO):** A performance optimization where small objects are stored directly inside the wrapper class\'s own memory footprint rather than allocating them on the heap, preventing cache misses and allocation overhead.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::unique_ptr:** A smart pointer that retains sole ownership of an object through a pointer and destroys that object when the unique_ptr goes out of scope.\n- **std::any:** A standard library class that can hold a single value of any copy-constructible type.\n- **std::variant:** A type-safe union that holds a value of one of a predefined set of types.\n- **std::function:** A general-purpose polymorphic function wrapper.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We observed the problem of classical polymorphism: intrusive inheritance prevents the use of built-in or third-party types in polymorphic collections. We built a custom type-erased wrapper (`AnyPrinter`) using the Concept-Model idiom, transferring the templated type knowledge into a private, heap-allocated virtual derived class. We then mapped this exact pattern onto the standard library\'s `std::function` (behavioral type erasure) and `std::any` (storage type erasure), and contrasted it with `std::variant` (tagged unions).',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If we delete the `clone()` method from `AnyPrinter::Concept` and `AnyPrinter::Model`, our wrapper becomes uncopyable. We would only be able to move `AnyPrinter` instances. Attempting to pass `AnyPrinter` by value, or returning it from a function without moving it, would result in a compiler error about a deleted copy constructor. Type erasure forces you to explicitly define how lifecycle operations (copying, destroying) bridge the virtual boundary.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Add a behavior:** Modify `AnyPrinter` to become `AnyDrawable`. Add a `draw()` method to the Concept, Model, and Wrapper.\n- **Implement `std::any`:** Create a simplified `MyAny` class that has no `print()` method, but provides a `type_info()` method returning the `std::type_info` of the stored type, mimicking how `std::any_cast` checks types.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [x] A type-erased wrapper class is built using the Concept-Model idiom.\n- [x] Unrelated types (int, string) are successfully stored in a homogeneous vector.\n- [x] The architecture of `std::function`, `std::any`, and `std::variant` is understood in relation to type erasure.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 2: Type Erasure',
        caption: 'Type Erasure',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Heterogeneous Collection Problem',
              prose: [
                'C++ is statically and strongly typed. A `std::vector<T>` requires every element to be exactly type `T`. If you want a list of shapes, and you have a `Circle` and a `Square`, you cannot put them in a `std::vector<Circle>`. The classical Object-Oriented approach is to create an abstract base class `Shape` with virtual methods, make `Circle` and `Square` inherit from it, and use a `std::vector<std::unique_ptr<Shape>>`. This works until you encounter types you cannot modify. If you want to store a `std::string` and an `int`, or a class from a third-party library, you cannot force them to inherit from your `Printable` base class. You need a way to hold unrelated types in a single collection and invoke a common behavior on them, *without* intrusive inheritance.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <vector>\n#include <memory>\n#include <string>\n\n// Classical OOP requirement: everything must inherit from this.\nclass Printable {\npublic:\n    virtual ~Printable() = default;\n    virtual void print() const = 0;\n};\n\n// We control this, so we can inherit.\nclass Report : public Printable {\npublic:\n    void print() const override {\n        std::cout << "Printing report\\n";\n    }\n};\n\n// We DO NOT control std::string. We cannot make it inherit from Printable.\n// std::string my_string = "Hello"; \n\nint main() {\n    std::vector<std::unique_ptr<Printable>> docs;\n    docs.push_back(std::make_unique<Report>());\n    \n    // ERROR: std::string is not a Printable.\n    // docs.push_back(std::make_unique<std::string>("Cannot do this"));\n    \n    for (const auto& doc : docs) {\n        doc->print();\n    }\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `class AnyPrinter`\nThis is the non-templated wrapper class. Because it is not a template, `std::vector<AnyPrinter>` is a valid, concrete type. This is the boundary where type erasure occurs.\n- `struct Concept { virtual ~Concept() = default; virtual void print() const = 0; ... };`\nThis is an abstract base class, hidden inside `AnyPrinter`\'s private section. It defines the interface that we require from the types we hold. It has no knowledge of any specific type `T`.\n- `template <typename T> struct Model : Concept { ... };`\nThis is a templated derived class, also hidden. It inherits from `Concept`. The compiler instantiates a brand new version of `Model` for every distinct type `T` we pass to `AnyPrinter`.\n- `T data;`\nThe `Model` holds the actual concrete value of type `T`.\n- `void print() const override { std::cout << data << \'\\n\'; }`\nThe `Model` implements the virtual `print()` method. It uses the type-specific behavior (in this case, `operator<<`) associated with `T`.\n- `std::unique_ptr<Concept> pimpl;`\nThe `AnyPrinter` class holds a single pointer to the abstract `Concept`. This is a classic "Pointer to Implementation" (Pimpl). At runtime, this points to a specific `Model<T>`, but `AnyPrinter` itself only knows it holds a `Concept`.\n- `template <typename T> AnyPrinter(T val) : pimpl(std::make_unique<Model<T>>(std::move(val))) {}`\nThe templated constructor. When you write `AnyPrinter(42)`, `T` is deduced as `int`. The constructor allocates a `Model<int>` on the heap, and stores it in the `pimpl` pointer. The exact type `T` is "erased" from `AnyPrinter`\'s signature, captured permanently inside the heap-allocated `Model`.\n- `virtual std::unique_ptr<Concept> clone() const = 0;` and its implementation\nBecause `AnyPrinter` holds a `std::unique_ptr`, it is move-only by default. To allow copying an `AnyPrinter`, we must be able to deep-copy the underlying data. However, `AnyPrinter` doesn\'t know what type `T` is. The `clone()` virtual method solves this: the `Model<T>` knows its own type, so it can allocate a new `Model<T>` with a copy of `data` and return it as a `Concept` pointer.\n- `void print() const { pimpl->print(); }`\nThe public non-virtual method of the wrapper. It simply forwards the call to the virtual method of the internal `Concept`, triggering dynamic dispatch.',
                '**CS lens.** This is the **Concept-Model Idiom**, formulated by Sean Parent. It achieves **Runtime Duck Typing**. In purely statically typed languages, polymorphism usually requires named interfaces and inheritance. The Concept-Model idiom builds a bridge: it uses templates to capture the type at compile-time, and virtual dispatch to invoke behavior at runtime, effectively decoupling the polymorphic behavior from the inheritance hierarchy. Also recognized in: - Swift\'s `any Protocol` existentials. - Rust\'s `dyn Trait` objects. - Go\'s interfaces, which are implicitly satisfied without explicit inheritance.',
                '**SE lens.** **The tradeoff:** We have traded structural coupling (intrusive inheritance) for performance overhead (heap allocation and dynamic dispatch). By using `std::make_unique`, every time we create an `AnyPrinter`, we are allocating memory on the heap. If we store 10,000 small integers in `AnyPrinters`, we incur 10,000 heap allocations, severely fragmenting memory and causing cache misses. Production type-erased wrappers (like `std::function` and `std::any`) use **Small Buffer Optimization (SBO)**: they pre-allocate a small raw byte array inside the wrapper itself, and use placement-`new` to construct small models directly in that local buffer, falling back to the heap only for large objects.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <memory>\n#include <vector>\n#include <string>\n#include <utility>\n\nclass AnyPrinter {\nprivate:\n    struct Concept {\n        virtual ~Concept() = default;\n        virtual void print() const = 0;\n        virtual std::unique_ptr<Concept> clone() const = 0;\n    };\n\n    template <typename T>\n    struct Model : Concept {\n        T data;\n        Model(T val) : data(std::move(val)) {}\n        void print() const override {\n            std::cout << data << \'\\n\';\n        }\n        std::unique_ptr<Concept> clone() const override {\n            return std::make_unique<Model>(data);\n        }\n    };\n\n    std::unique_ptr<Concept> pimpl;\n\npublic:\n    template <typename T>\n    AnyPrinter(T val) : pimpl(std::make_unique<Model<T>>(std::move(val))) {}\n\n    AnyPrinter(const AnyPrinter& other) : pimpl(other.pimpl->clone()) {}\n    \n    AnyPrinter& operator=(const AnyPrinter& other) {\n        pimpl = other.pimpl->clone();\n        return *this;\n    }\n\n    AnyPrinter(AnyPrinter&&) noexcept = default;\n    AnyPrinter& operator=(AnyPrinter&&) noexcept = default;\n\n    void print() const {\n        pimpl->print();\n    }\n};',
              expectedOutput: '42\nHello Type Erasure\n3.14159',
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
      'Next lesson: The Pimpl Idiom.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Intrusive inheritance"?',
      options: [
        'A design pattern that provides a non-templated interface to templated, type-specific behavior. It hides the concrete type of an object from the user of the wrapper, preserving only the specific operations the wrapper promises to support.',
        'The requirement that a class explicitly declare class A : public Base to participate in a system. It fails when you cannot modify the class (like std::string or a third-party type) to add the inheritance.',
        'A performance optimization where small objects are stored directly inside the wrapper class\'s own memory footprint rather than allocating them on the heap, preventing cache misses and allocation overhead.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Concept-Model Idiom"?',
      options: [
        'The specific C++ implementation technique for type erasure, utilizing a non-templated wrapper class holding a pointer to a private abstract base class (the "Concept"), which is implemented by a private templated derived class (the "Model").',
        'A container (like an array or list) that holds objects of different, distinct types. C++ collections are strictly homogeneous by default; building a heterogeneous one requires explicit design.',
        'A programming concept where an object\'s suitability is determined by the presence of certain methods, rather than its actual type or inheritance tree ("If it walks like a duck and quacks like a duck..."). Templates support compile-time duck typing; type erasure enables runtime duck typing.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Type Erasure"?',
      options: [
        'A design pattern that provides a non-templated interface to templated, type-specific behavior. It hides the concrete type of an object from the user of the wrapper, preserving only the specific operations the wrapper promises to support.',
        'A performance optimization where small objects are stored directly inside the wrapper class\'s own memory footprint rather than allocating them on the heap, preventing cache misses and allocation overhead.',
        'A container (like an array or list) that holds objects of different, distinct types. C++ collections are strictly homogeneous by default; building a heterogeneous one requires explicit design.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Duck typing"?',
      options: [
        'A container (like an array or list) that holds objects of different, distinct types. C++ collections are strictly homogeneous by default; building a heterogeneous one requires explicit design.',
        'A programming concept where an object\'s suitability is determined by the presence of certain methods, rather than its actual type or inheritance tree ("If it walks like a duck and quacks like a duck..."). Templates support compile-time duck typing; type erasure enables runtime duck typing.',
        'A design pattern that provides a non-templated interface to templated, type-specific behavior. It hides the concrete type of an object from the user of the wrapper, preserving only the specific operations the wrapper promises to support.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Heterogeneous collection** — A container (like an array or list) that holds objects of different, distinct types. C++ collections are strictly homogeneous by default; building a heterogeneous one requires explicit design.',
    '**Intrusive inheritance** — The requirement that a class explicitly declare class A : public Base to participate in a system. It fails when you cannot modify the class (like std::string or a third-party type) to add the inheritance.',
    '**Duck typing** — A programming concept where an object\'s suitability is determined by the presence of certain methods, rather than its actual type or inheritance tree ("If it walks like a duck and quacks like a duck..."). Templates support compile-time duck typing; type erasure enables runtime duck typing.',
    '**Type Erasure** — A design pattern that provides a non-templated interface to templated, type-specific behavior. It hides the concrete type of an object from the user of the wrapper, preserving only the specific operations the wrapper promises to support.',
    '**Concept-Model Idiom** — The specific C++ implementation technique for type erasure, utilizing a non-templated wrapper class holding a pointer to a private abstract base class (the "Concept"), which is implemented by a private templated derived class (the "Model").',
    '**Small Buffer Optimization (SBO)** — A performance optimization where small objects are stored directly inside the wrapper class\'s own memory footprint rather than allocating them on the heap, preventing cache misses and allocation overhead.',
  ],

  checkpoints: ['read-intuition'],
}
