// cpp-from-scratch — Lesson 9: Inheritance
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 09 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-09-inheritance',
  slug: 'inheritance',
  chapter: 2,
  order: 1,
  title: 'Inheritance',
  subtitle: 'OOP and Generic Programming',
  tags: ['inheritance', 'base-class', 'derived-class', 'polymorphism', 'abstract-class', 'vtable-virtual-method-table'],

  hook: {
    question: 'What is "Inheritance", and why does it matter?',
    realWorldContext: 'You will build a set of related object types that share common structure but have distinct, specialized behaviors. By proving that a program can issue uniform commands to different types through a shared ancestor, you will learn how to write generalized code that automatically adapts to the specific type of object it receives at runtime, and understand the low-level mechanism (the vtable) C++ uses to achieve this without complex if/else checks.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Inheritance, virtual, override, and the vtable, Pure Virtual Functions and Abstract Classes.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Inheritance:** a mechanism where a new class acquires the members and functions of an existing class. It exists to eliminate redundant code by defining shared logic in one place.\n- **Base class:** the class being inherited from. It exists to serve as a common template or contract for specialized classes.\n- **Derived class:** the class that inherits from a base class. It exists to add specific features or override behaviors while keeping the shared foundation.\n- **Polymorphism:** the ability of different objects to respond in their own unique way to the same method call through a shared pointer or reference. It exists to allow calling code to remain ignorant of an object\'s exact type.\n- **Abstract class:** a class that cannot be instantiated directly, serving only as a base for other classes. It exists to represent a pure concept that only makes sense when fully specialized.\n- **vtable (virtual method table):** a hidden array of function pointers created by the compiler for polymorphic classes. It exists to look up and execute the correct overridden function at runtime when the exact object type isn\'t known at compile time.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **: public BaseClass:** The syntax declaring inheritance.\n- **virtual:** A keyword indicating that a function can be overridden by a derived class and should use dynamic dispatch.\n- **override:** A specifier telling the compiler that a function is intended to replace an inherited virtual function.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Consider a graphics engine. A base `UIElement` abstract class defines a pure virtual `void render() = 0;`. It dictates the contract for anything drawn to the screen. A derived `Button` class inherits `UIElement` and provides a concrete `render()` implementation containing math for drawing rectangles and text. A `Slider` class does the same for a track and thumb. The engine\'s main loop holds a `std::vector<UIElement*>`. It iterates over this array, calling `element->render()` on each pointer. Polymorphism and the hidden vtables ensure the `Button` draws a button and the `Slider` draws a slider, all initiated from a single, simple loop that never performs a single type check.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Without the `virtual` keyword, pointers to base classes use static dispatch based solely on the pointer type, breaking polymorphism completely. Create or edit `static_dispatch.cpp`: \n\n```cpp\n#include <iostream>\n\nclass Animal {\npublic:\n    void make_sound() { // Missing \'virtual\'\n        std::cout << "Generic\\n";\n    }\n};\n\nclass Dog : public Animal {\npublic:\n    void make_sound() {\n        std::cout << "Bark\\n";\n    }\n};\n\nint main() {\n    Dog my_dog;\n    Animal* ptr = &my_dog;\n    ptr->make_sound(); // We expect "Bark"\n    \n    return 0;\n}\n```\n\nRun it. The output is `Generic`. Even though the object in memory is a `Dog`, because `Animal::make_sound()` was not `virtual`, the compiler statically linked the call based on the pointer\'s type (`Animal*`). The runtime vtable lookup was bypassed entirely. To fix this, add `virtual` to the base method, forcing dynamic dispatch.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **The Shape Hierarchy**: Create an abstract base class `Shape` with a pure virtual function `virtual double area() = 0;`. Create a `Square` subclass (with a `side` member) that overrides `area()` to return `side * side`, and a `Rectangle` subclass (with `width` and `height`) returning `width * height`. Create a `std::vector<Shape*>` containing instances of both, and loop to print their areas.\n- **Missing Implementation**: Try to instantiate a `Square` but deliberately comment out its `area()` override. Observe the precise compiler error C++ gives you when attempting to instantiate an abstract class.\n- **The `override` Safety Net**: In `Dog`, change the signature of your override to `void make_sound(int volume) override`. Observe the compiler error proving that `override` caught your mismatch with the base class signature.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have run every code example and verified the outputs.\n- [ ] You have seen the compiler error when failing to implement a pure virtual function, or when mismatched signatures use `override`.\n- [ ] You understand the difference between compile-time type (the pointer declaration) and run-time type (the instantiated object in memory).\n- [ ] You can explain the role of the vtable and why `virtual` is required to make polymorphism work in C++.\n- [ ] You can explain Inheritance and Polymorphism out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 9: Inheritance',
        caption: 'Inheritance',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Inheritance',
              prose: [
                'When modeling concepts that share many attributes but differ slightly, you often end up copying and pasting properties and methods across multiple classes. This duplication means that fixing a bug in shared logic requires updating every single copy. You need a way to define common logic once and share it automatically.',
                '## How the Code Works',
                '- `class Animal` defines a base class with a public method `eat()`. This encapsulates logic that any animal should possess.\n- `class Dog : public Animal` defines a new class named `Dog` that inherits from `Animal`. The `:` symbol denotes this inheritance relationship, and `public` dictates that public members of `Animal` remain public in `Dog`. Because of this, `Dog` automatically possesses the `eat()` method even though its block is empty.\n- `my_dog.eat();` executes the inherited method. Even though `eat()` is not explicitly written inside the `Dog` class, the compiler resolves the call to the base `Animal` class\'s function.',
                '**CS lens.** This is subtyping. It establishes an "is-a" relationship (`Dog` is an `Animal`). In systems architecture, hierarchical classifications allow broad rules to be applied to categories of entities rather than individuals, much like how file systems treat both files and directories as "nodes" with a common set of metadata.',
                '**SE lens.** Inheritance provides code reuse. The alternative is composition, where a `Dog` would contain an `Animal` instance and manually forward calls to it. While composition is often safer for complex systems (avoiding deep, rigid hierarchies), inheritance is the most direct way to establish a shared structural baseline when the "is-a" relationship is mathematically strict.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass Animal {\npublic:\n    void eat() {\n        std::cout << "Consuming food.\\n";\n    }\n};\n\nclass Dog : public Animal {\n    // Dog inherits eat() automatically\n};\n\nint main() {\n    Animal my_animal;\n    my_animal.eat();\n\n    Dog my_dog;\n    my_dog.eat();\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'virtual, override, and the vtable',
              prose: [
                'Inheritance provides shared logic, but not all derived types should behave exactly like the base type. Furthermore, if you handle a derived object using a pointer to its base class, the compiler normally binds function calls based on the pointer\'s type, not the actual object\'s type. You need a way to instruct the runtime to look up the correct specialized function based on the exact object in memory.',
                '## How the Code Works',
                '- `virtual void make_sound()` on `Animal` marks the method as overridable and enables dynamic dispatch. The `virtual` keyword explicitly tells the compiler: "When someone calls this through a pointer, don\'t just assume the `Animal` version; check the object\'s hidden vtable at runtime to find the right version."\n- `void make_sound() override` on `Dog` replaces the base implementation. The `override` keyword tells the compiler to swap out the `Animal` version of `make_sound()` for this specific `Dog` version. If `make_sound()` wasn\'t virtual in the base class, the `override` keyword would trigger a compile-time error.\n- `Animal* p2 = &fido;` creates a pointer of type `Animal*` but points it to a `Dog` object. This is a valid upcast because a `Dog` is an `Animal`.\n- `p2->make_sound();` invokes the function. Because `make_sound` is `virtual`, the program dereferences a hidden pointer inside the `fido` object, finds the vtable for `Dog`, and calls `Dog::make_sound()`, returning "Bark".',
                '**CS lens.** This is dynamic dispatch powered by a virtual method table (vtable). When a class contains at least one `virtual` function, the compiler silently adds a hidden pointer (often called `vptr`) to every instantiated object of that class. This pointer points to a static array of function pointers (the vtable) specific to that exact class. At runtime, a virtual function call performs an indirect jump using this table, which is slightly slower than a regular static function call but provides polymorphism.',
                '**SE lens.** The Open/Closed Principle. The `Animal` class is closed for modification but open for extension. The calling code dealing with `Animal*` pointers doesn\'t need a massive `switch` statement checking types (e.g., `if (type == DOG) bark();`). You can create a `Cat` class tomorrow, and the existing pointer logic will correctly route calls to `meow()` without needing recompilation.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass Animal {\npublic:\n    virtual void make_sound() {\n        std::cout << "Generic animal noise\\n";\n    }\n};\n\nclass Dog : public Animal {\npublic:\n    void make_sound() override {\n        std::cout << "Bark\\n";\n    }\n};\n\nint main() {\n    Animal generic;\n    Animal* p1 = &generic;\n    p1->make_sound();\n\n    Dog fido;\n    Animal* p2 = &fido;\n    p2->make_sound();\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Pure Virtual Functions and Abstract Classes',
              prose: [
                'Sometimes a base class represents a concept so generic that providing a default implementation makes no sense. An `Animal` might need to make a sound, but there is no such thing as a "generic animal noise" in reality. You need a way to force every derived class to write its own implementation, while preventing anyone from instantiating the meaningless base class directly.',
                '## How the Code Works',
                '- `virtual void make_sound() = 0;` declares a pure virtual function. The `= 0` syntax tells the compiler that this function has no body in `Animal`.\n- Because `Animal` has at least one pure virtual function, it becomes an abstract class. The compiler will absolutely forbid `Animal a;` (instantiation).\n- `class Dog` and `class Cat` provide concrete implementations using `override`. If they failed to implement `make_sound()`, they would also be considered abstract classes and could not be instantiated.\n- `std::vector<Animal*> pets;` creates a collection capable of holding pointers to any class derived from `Animal`.\n- `for (Animal* pet : pets)` loops over the mixed collection. The uniform command `pet->make_sound()` triggers unique behaviors ("Bark", "Meow") via the vtable, perfectly demonstrating polymorphism.',
                '**CS lens.** This defines an interface. In C++, there is no separate `interface` keyword; an interface is simply an abstract class consisting entirely of pure virtual functions. This maps directly to hardware device drivers: an operating system dictates an interface "SendPacket = 0", and the specific Realtek or Intel driver must provide the exact hardware instructions.',
                '**SE lens.** This establishes a strict contract. The base class dictates *what* must be done, and the derived classes dictate *how*. This decouples the caller (the loop) from the implementer (`Dog`, `Cat`). The loop code relies solely on the contract and does not know or care that `Cat` and `Dog` exist.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nclass Animal {\npublic:\n    virtual void make_sound() = 0; // Pure virtual function\n};\n\nclass Dog : public Animal {\npublic:\n    void make_sound() override {\n        std::cout << "Bark\\n";\n    }\n};\n\nclass Cat : public Animal {\npublic:\n    void make_sound() override {\n        std::cout << "Meow\\n";\n    }\n};\n\nint main() {\n    // Animal a; // This would cause a compile error\n    \n    std::vector<Animal*> pets;\n    \n    Dog fido;\n    Cat whiskers;\n    \n    pets.push_back(&fido);\n    pets.push_back(&whiskers);\n    \n    for (Animal* pet : pets) {\n        pet->make_sound();\n    }\n\n    return 0;\n}',
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
      'Next lesson: Operator Overloading.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "vtable (virtual method table)"?',
      options: [
        'the class being inherited from. It exists to serve as a common template or contract for specialized classes.',
        'a hidden array of function pointers created by the compiler for polymorphic classes. It exists to look up and execute the correct overridden function at runtime when the exact object type isn\'t known at compile time.',
        'the class that inherits from a base class. It exists to add specific features or override behaviors while keeping the shared foundation.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Inheritance"?',
      options: [
        'the class that inherits from a base class. It exists to add specific features or override behaviors while keeping the shared foundation.',
        'a hidden array of function pointers created by the compiler for polymorphic classes. It exists to look up and execute the correct overridden function at runtime when the exact object type isn\'t known at compile time.',
        'a mechanism where a new class acquires the members and functions of an existing class. It exists to eliminate redundant code by defining shared logic in one place.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Polymorphism"?',
      options: [
        'a hidden array of function pointers created by the compiler for polymorphic classes. It exists to look up and execute the correct overridden function at runtime when the exact object type isn\'t known at compile time.',
        'the ability of different objects to respond in their own unique way to the same method call through a shared pointer or reference. It exists to allow calling code to remain ignorant of an object\'s exact type.',
        'a mechanism where a new class acquires the members and functions of an existing class. It exists to eliminate redundant code by defining shared logic in one place.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Base class"?',
      options: [
        'a class that cannot be instantiated directly, serving only as a base for other classes. It exists to represent a pure concept that only makes sense when fully specialized.',
        'the class being inherited from. It exists to serve as a common template or contract for specialized classes.',
        'a hidden array of function pointers created by the compiler for polymorphic classes. It exists to look up and execute the correct overridden function at runtime when the exact object type isn\'t known at compile time.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Inheritance** — a mechanism where a new class acquires the members and functions of an existing class. It exists to eliminate redundant code by defining shared logic in one place.',
    '**Base class** — the class being inherited from. It exists to serve as a common template or contract for specialized classes.',
    '**Derived class** — the class that inherits from a base class. It exists to add specific features or override behaviors while keeping the shared foundation.',
    '**Polymorphism** — the ability of different objects to respond in their own unique way to the same method call through a shared pointer or reference. It exists to allow calling code to remain ignorant of an object\'s exact type.',
    '**Abstract class** — a class that cannot be instantiated directly, serving only as a base for other classes. It exists to represent a pure concept that only makes sense when fully specialized.',
    '**vtable (virtual method table)** — a hidden array of function pointers created by the compiler for polymorphic classes. It exists to look up and execute the correct overridden function at runtime when the exact object type isn\'t known at compile time.',
  ],

  checkpoints: ['read-intuition'],
}
