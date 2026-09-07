// cpp-patterns — Lesson 6: The Factory Pattern
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 06 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-06-the-factory-pattern',
  slug: 'the-factory-pattern',
  chapter: 2,
  order: 2,
  title: 'The Factory Pattern',
  subtitle: 'Behavioral and Creational Patterns',
  tags: ['the-factory-pattern', 'abstract-factory', 'polymorphism'],

  hook: {
    question: 'What is "The Factory Pattern", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: The Static Factory Method, The Abstract Factory.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **The Factory Pattern:** a creational design pattern that delegates the responsibility of instantiating objects to a dedicated method or class. This exists to solve the problem of tightly coupling business logic to concrete classes when the logic only needs to know about their base interfaces.\n- **Abstract Factory:** a variation of the Factory pattern that groups the creation of related families of objects together behind a single interface. This exists to solve the problem of ensuring that a system only creates objects that are conceptually compatible with each other, preventing mismatched pieces.\n- **Polymorphism:** the ability of different concrete classes to be treated as instances of the same base class through pointers or references. This exists to solve the problem of having to write duplicate code for every single specific type in a system.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::unique_ptr&lt;T&gt;:** A standard library smart pointer that retains sole ownership of an object and automatically destroys it when the pointer goes out of scope.\n- **std::make_unique&lt;T&gt;():** A standard library template function that safely allocates an object of type T on the heap and wraps it in a std::unique_ptr.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'By defining `buildUI` to rely purely on `GUIFactory`, `Button`, and `Checkbox`, we have completely decoupled our rendering logic from the concrete implementation of the operating system. **Connect the pieces:** 1. `main` reads `config = "Windows"` and instantiates a `WindowsFactory`. 2. `buildUI` takes this factory and calls `createCheckbox()`. 3. The `WindowsFactory` implementation of `createCheckbox` executes, allocating a `WindowsCheckbox` on the heap via `std::make_unique` and returning it. 4. `buildUI` calls `paint()` on the returned abstract pointer, which dynamically dispatches to `WindowsCheckbox::paint()`, outputting `[x] Windows Checkbox`. 5. `buildUI` finishes, the `std::unique_ptr`s go out of scope, and the button and checkbox are safely destroyed. **What breaks without this:** If we returned a raw pointer `Button*` from the factory instead of `std::unique_ptr<Button>`, the caller `buildUI` would be responsible for calling `delete button;`. If an early `return` or exception occurred between creation and deletion, the application would leak memory. **Exercises:** - Add a third product family: `LinuxFactory`, `LinuxButton`, and `LinuxCheckbox`. Note how `buildUI` requires absolutely zero modifications to support the new OS. - Add a new product type, `Slider`, to the `GUIFactory` interface, and implement it across all existing concrete factories. **Definition of done:** - [x] A static factory method for single-object decoupling. - [x] An abstract factory interface and concrete implementations for family decoupling. - [x] Strict adherence to C++ ownership semantics using `std::unique_ptr`. - [x] Commit: `git commit -m "Implement Abstract Factory pattern for cross-platform UI generation"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 6: The Factory Pattern',
        caption: 'The Factory Pattern',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Static Factory Method',
              prose: [
                'A caller needs to create an object, but deciding *which* exact subclass to instantiate depends on runtime data (like a configuration string, user input, or an enum). If the caller evaluates this data and calls `new WindowsButton()` or `new MacButton()` directly, it becomes permanently coupled to every single subclass. Every time a new platform is added, the caller\'s code has to be modified.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <memory>\n#include <string>\n\nstruct Animal {\n    virtual ~Animal() = default;\n    virtual void speak() = 0;\n};\n\nstruct Dog : Animal { void speak() override { std::cout << "Woof\\n"; } };\nstruct Cat : Animal { void speak() override { std::cout << "Meow\\n"; } };\n\nclass AnimalFactory {\npublic:\n    static std::unique_ptr<Animal> createAnimal(const std::string& type) {\n        if (type == "dog") return std::make_unique<Dog>();\n        if (type == "cat") return std::make_unique<Cat>();\n        return nullptr;\n    }\n};\n\nint main() {\n    auto pet = AnimalFactory::createAnimal("dog");\n    if (pet) pet->speak();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `struct Button { ... }` — Defines the base interface. This is what the rest of the application will depend on, completely insulating it from concrete types.\n- `virtual ~Button() = default;` — A virtual destructor. This is mandatory for polymorphic base classes in C++ to ensure that when a `std::unique_ptr<Button>` is destroyed, the derived class\'s destructor correctly runs.\n- `virtual void render() = 0;` — A pure virtual function making `Button` an abstract class. It forces all derived classes to provide their own implementation.\n- `struct WindowsButton : Button { ... }` — A concrete derived class that implements the specific behavior for Windows.\n- `class ButtonFactory { ... }` — The factory class acting as the single namespace for creation logic.\n- `static std::unique_ptr<Button> createButton(...)` — The static factory method. By returning a `std::unique_ptr`, the factory enforces that the caller must assume exclusive ownership of the allocated memory, eliminating the possibility of a forgotten `delete`.\n- `if (os == "Windows") { ... }` — The conditional logic where the factory assumes the burden of knowing about every concrete subclass so the caller doesn\'t have to.\n- `return std::make_unique<WindowsButton>();` — Performs the heap allocation and wraps it. Because `WindowsButton` inherits from `Button`, this seamlessly converts into the `std::unique_ptr<Button>` return type.\n- `auto myButton = ButtonFactory::createButton(currentOS);` — The caller invokes the factory without needing to `#include` the concrete button headers (in a real multi-file project).\n- `myButton->render();` — Dynamic dispatch. The compiler doesn\'t know this is a `MacButton`; it resolves to the correct method at runtime.',
                '**CS lens.** This is the **Factory Pattern**. Also recognized in: DOM element creation (`document.createElement`), logger instantiation based on config files, parsers generating specific AST nodes from generic tokens.',
                '**SE lens.** This isolates the volatility of instantiation. Adding a `LinuxButton` requires modifying the factory, but requires zero changes to the calling code. This is an application of the Open/Closed Principle: the application logic is closed for modification, but open for extension. Returning `std::unique_ptr` engineers safety directly into the API signature.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <memory>\n#include <string>\n\nstruct Button {\n    virtual ~Button() = default;\n    virtual void render() = 0;\n};\n\nstruct WindowsButton : Button {\n    void render() override { std::cout << "[Windows Button]\\n"; }\n};\n\nstruct MacButton : Button {\n    void render() override { std::cout << "(Mac Button)\\n"; }\n};\n\nclass ButtonFactory {\npublic:\n    static std::unique_ptr<Button> createButton(const std::string& os) {\n        if (os == "Windows") {\n            return std::make_unique<WindowsButton>();\n        } else if (os == "Mac") {\n            return std::make_unique<MacButton>();\n        }\n        return nullptr;\n    }\n};',
              expectedOutput: './factory_demo\n(Mac Button)',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Abstract Factory',
              prose: [
                'We need to create multiple related objects, but they must match a specific family or theme. A static factory for each individual type (a `ButtonFactory`, a `CheckboxFactory`) would require the caller to pass the "OS" string every single time. Worse, a bug could accidentally request a Mac button and a Windows checkbox in the same window, breaking the visual consistency.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <memory>\n\nstruct ThemeFont { virtual void display() = 0; virtual ~ThemeFont() = default; };\nstruct DarkFont : ThemeFont { void display() override { std::cout << "White Text\\n"; } };\nstruct LightFont : ThemeFont { void display() override { std::cout << "Black Text\\n"; } };\n\nstruct ThemeFactory {\n    virtual std::unique_ptr<ThemeFont> createFont() = 0;\n    virtual ~ThemeFactory() = default;\n};\n\nstruct DarkThemeFactory : ThemeFactory {\n    std::unique_ptr<ThemeFont> createFont() override { return std::make_unique<DarkFont>(); }\n};\n\nint main() {\n    std::unique_ptr<ThemeFactory> factory = std::make_unique<DarkThemeFactory>();\n    auto font = factory->createFont();\n    font->display();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `struct Checkbox { ... }` — The abstract base for the second product family.\n- `struct GUIFactory { ... }` — The abstract factory interface. It declares a creation method for every type of product in the family.\n- `virtual std::unique_ptr<Button> createButton() = 0;` — The factory method signature inside the abstract factory. Notice it takes no arguments: the context (the OS) is already captured by the concrete factory\'s type.\n- `struct WindowsFactory : GUIFactory { ... }` — A concrete factory that guarantees all created objects belong to the Windows family.\n- `void buildUI(GUIFactory& factory)` — The consumer code. It takes the factory by reference, meaning the caller owns the factory, and `buildUI` just uses it. This is **Dependency Injection**: the decision-maker is passed in rather than hardcoded.\n- `auto button = factory.createButton();` — The consumer asks for a button. It is mathematically impossible for this to return a Mac button if a `WindowsFactory` was provided.\n- `std::unique_ptr<GUIFactory> factory;` — In `main`, the application resolves the configuration once, at startup, and instantiates the correct factory.\n- `buildUI(*factory);` — Dereferences the smart pointer to pass the factory polymorphic-ally by reference into the UI builder.',
                '**CS lens.** This is the **Abstract Factory**. Also recognized in: Cross-platform UI toolkits (Qt, wxWidgets), rendering engines (DirectX vs OpenGL pipelines), database drivers (a SQL factory producing connections, statements, and result sets that match the engine).',
                '**SE lens.** This pattern guarantees the creation of dependent objects. By forcing the caller to rely on a single factory instance, the system engineers away the failure mode of mismatched objects. The tradeoff is rigidity: adding a new product (like a `Slider`) requires modifying the base `GUIFactory` interface and every single concrete factory implementation.'
              ],
              typeIt: true,
              solution: 'struct Checkbox {\n    virtual ~Checkbox() = default;\n    virtual void paint() = 0;\n};\n\nstruct WindowsCheckbox : Checkbox {\n    void paint() override { std::cout << "[x] Windows Checkbox\\n"; }\n};\n\nstruct MacCheckbox : Checkbox {\n    void paint() override { std::cout << "(v) Mac Checkbox\\n"; }\n};\n\nstruct GUIFactory {\n    virtual ~GUIFactory() = default;\n    virtual std::unique_ptr<Button> createButton() = 0;\n    virtual std::unique_ptr<Checkbox> createCheckbox() = 0;\n};\n\nstruct WindowsFactory : GUIFactory {\n    std::unique_ptr<Button> createButton() override {\n        return std::make_unique<WindowsButton>();\n    }\n    std::unique_ptr<Checkbox> createCheckbox() override {\n        return std::make_unique<WindowsCheckbox>();\n    }\n};\n\nstruct MacFactory : GUIFactory {\n    std::unique_ptr<Button> createButton() override {\n        return std::make_unique<MacButton>();\n    }\n    std::unique_ptr<Checkbox> createCheckbox() override {\n        return std::make_unique<MacCheckbox>();\n    }\n};',
              expectedOutput: './factory_demo\n[Windows Button]\n[x] Windows Checkbox',
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
      'Next lesson: The Builder Pattern.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "The Factory Pattern"?',
      options: [
        'the ability of different concrete classes to be treated as instances of the same base class through pointers or references. This exists to solve the problem of having to write duplicate code for every single specific type in a system.',
        'a creational design pattern that delegates the responsibility of instantiating objects to a dedicated method or class. This exists to solve the problem of tightly coupling business logic to concrete classes when the logic only needs to know about their base interfaces.',
        'a variation of the Factory pattern that groups the creation of related families of objects together behind a single interface. This exists to solve the problem of ensuring that a system only creates objects that are conceptually compatible with each other, preventing mismatched pieces.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Abstract Factory"?',
      options: [
        'a variation of the Factory pattern that groups the creation of related families of objects together behind a single interface. This exists to solve the problem of ensuring that a system only creates objects that are conceptually compatible with each other, preventing mismatched pieces.',
        'the ability of different concrete classes to be treated as instances of the same base class through pointers or references. This exists to solve the problem of having to write duplicate code for every single specific type in a system.',
        'a creational design pattern that delegates the responsibility of instantiating objects to a dedicated method or class. This exists to solve the problem of tightly coupling business logic to concrete classes when the logic only needs to know about their base interfaces.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Polymorphism"?',
      options: [
        'the ability of different concrete classes to be treated as instances of the same base class through pointers or references. This exists to solve the problem of having to write duplicate code for every single specific type in a system.',
        'a creational design pattern that delegates the responsibility of instantiating objects to a dedicated method or class. This exists to solve the problem of tightly coupling business logic to concrete classes when the logic only needs to know about their base interfaces.',
        'a variation of the Factory pattern that groups the creation of related families of objects together behind a single interface. This exists to solve the problem of ensuring that a system only creates objects that are conceptually compatible with each other, preventing mismatched pieces.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**The Factory Pattern** — a creational design pattern that delegates the responsibility of instantiating objects to a dedicated method or class. This exists to solve the problem of tightly coupling business logic to concrete classes when the logic only needs to know about their base interfaces.',
    '**Abstract Factory** — a variation of the Factory pattern that groups the creation of related families of objects together behind a single interface. This exists to solve the problem of ensuring that a system only creates objects that are conceptually compatible with each other, preventing mismatched pieces.',
    '**Polymorphism** — the ability of different concrete classes to be treated as instances of the same base class through pointers or references. This exists to solve the problem of having to write duplicate code for every single specific type in a system.',
  ],

  checkpoints: ['read-intuition'],
}
