// cpp-from-scratch — Lesson 10: Operator Overloading
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 10 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-10-operator-overloading',
  slug: 'operator-overloading',
  chapter: 2,
  order: 2,
  title: 'Operator Overloading',
  subtitle: 'OOP and Generic Programming',
  tags: ['operator-overloading', 'friend-function', 'copy-assignment-operator', 'rule-of-three'],

  hook: {
    question: 'What is "Operator Overloading", and why does it matter?',
    realWorldContext: 'You will build a sequence of isolated classes that redefine how standard C++ operators behave. You will prove that C++ allows custom objects to be added, compared, and printed just like built-in integers, and you will learn the rules for managing object memory safely when assigning one object to another. Every code example in this lesson proves one concept, then is explicitly discarded. It never becomes part of a project.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Overloading the Addition Operator (+), Equality and Overloading ==, Printing Objects with &lt;&lt; and Friend Functions, The Copy Assignment Operator (=), The Rule of Three.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Operator Overloading:** redefining how standard C++ operators (like +, ==) work for custom classes. It exists To make custom types feel like built-in types, allowing natural mathematical and logical expressions without forcing the use of clunky methods like add().\n- **Friend Function:** a function declared with the friend keyword that is not a member of a class but is granted full access to its private members. It exists To allow external functions (like the &lt;&lt; stream insertion operator) to read private data without exposing that data publicly via getters.\n- **Copy Assignment Operator:** a special operator (=) that is automatically called when an already-initialized object is assigned the value of another existing object of the same type. It exists To control how resources (like dynamically allocated memory) are cleaned up and duplicated when replacing an object\'s current state.\n- **Rule of Three:** a software engineering rule stating that if a class requires a user-defined destructor, copy constructor, or copy assignment operator, it almost certainly requires all three. It exists To prevent resource leaks, double-frees, or shallow-copy bugs when a class manually manages its own memory.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::ostream:** The base class for output streams, including std::cout.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace the lifecycle of a manually managed object being copied and printed. 1. `Buffer b1(10);` allocates memory and sets its value. 2. `Buffer b2(20);` allocates separate memory. 3. `b2 = b1;` invokes the custom copy assignment operator (`operator=`). 4. Inside the operator, `b2` checks that it is not assigning to itself (`this != &other`). 5. `b2` copies the value `10` from `b1`\'s memory into its own separate memory block. 6. `std::cout << b2;` invokes the friend `operator<<`, which reaches into `b2`\'s private fields to format and print the output. 7. As the program ends, `b2`\'s destructor runs, freeing its memory. 8. `b1`\'s destructor runs, freeing its separate memory. Both are destroyed safely without a double-free crash.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you fail to implement the Rule of Three, a default shallow copy will lead to a double-free crash. **The Broken Code:** \n\n```cpp\nclass BadBuffer {\npublic:\n    int* data;\n    BadBuffer() { data = new int(10); }\n    ~BadBuffer() { delete data; }\n};\n\nint main() {\n    BadBuffer b1;\n    BadBuffer b2 = b1; // Shallow copy! Both point to the same memory.\n    return 0; // CRASH: b2 deletes the memory, then b1 tries to delete it again.\n}\n```\n\n**The Error:** \n\n```text\nfree(): double free detected in tcache 2\nAborted (core dumped)\n```\n\n*To fix it, you must implement a copy constructor to perform a deep copy so each object has its own separate memory to delete.*',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Write a `Fraction` class containing an `int numerator` and `int denominator`. Overload the `*` operator to multiply two fractions and return a new `Fraction`.\n- Add an `operator==` to `Fraction`. Test that `Fraction(1, 2) == Fraction(1, 2)` returns true.\n- Write a friend `operator<<` for `Fraction` to print it in the format `"numerator/denominator"`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You understand that operator overloading is just a different syntax for method calls.\n- [ ] You can overload operators like `+` and `==` to give custom types mathematical meaning.\n- [ ] You know why the `friend` keyword is needed to overload `<<` for streams.\n- [ ] You can explain the difference between a copy constructor and a copy assignment operator.\n- [ ] You understand the Rule of Three and why custom memory management requires it to prevent crashes.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 10: Operator Overloading',
        caption: 'Operator Overloading',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Overloading the Addition Operator (+)',
              prose: [
                'When you build a custom class representing a mathematical or physical concept (like a 2D vector or a currency amount), adding them together using a method like `v1.add(v2)` is verbose and hard to read. You want to use the standard `+` operator, just like you would with integers (`v1 + v2`).',
                '## How the Code Works',
                '- `Vector2D operator+(const Vector2D& other) const` declares an operator overload.\n- `operator+` is the specific name C++ requires to redefine the `+` symbol. Without this exact name, the compiler will not map the `+` symbol to this function.\n- `const Vector2D& other` takes the right-hand side of the `+` expression as a read-only reference. It is passed by reference to avoid copying, and `const` ensures the right-hand object is not modified by the addition.\n- `const` at the end of the signature guarantees that the left-hand object (the one the method is called on) is not modified either. Addition should produce a new value, not change the existing ones.\n- `return Vector2D(...)` constructs and returns an entirely new `Vector2D` object containing the sum of the components. Without creating a new object, `+` would mutate existing data, behaving like `+=`.\n- `v1 + v2` is exactly equivalent to calling `v1.operator+(v2)`. The compiler translates the symbol into the method call.',
                '**CS lens.** This is syntactic sugar. Operator overloading does not give the computer new capabilities; it maps existing method-call mechanics onto established mathematical symbols. This reduces cognitive load when reading complex equations, allowing the programmer to rely on their existing understanding of arithmetic notation.',
                '**SE lens.** The alternative not chosen is writing a `Vector2D add(const Vector2D& other)` method. The tradeoff of operator overloading is potential abuse: redefining `+` to mean something non-obvious (like deleting a file) makes the code actively misleading. Operator overloading should only be used when the operator\'s mathematical or logical meaning is universally understood for that type.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass Vector2D {\nprivate:\n    int x;\n    int y;\n\npublic:\n    Vector2D(int x, int y) : x(x), y(y) {}\n\n    Vector2D operator+(const Vector2D& other) const {\n        return Vector2D(this->x + other.x, this->y + other.y);\n    }\n\n    void print() const {\n        std::cout << "x: " << x << ", y: " << y << "\\n";\n    }\n};\n\nint main() {\n    Vector2D v1(2, 3);\n    Vector2D v2(4, 1);\n    Vector2D v3 = v1 + v2;\n    v3.print();\n    return 0;\n}',
              expectedOutput: 'x: 6, y: 4',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Equality and Overloading ==',
              prose: [
                'By default, C++ does not know how to compare two objects of a custom class. If you try to write `v1 == v2`, the compiler will produce an error because it doesn\'t know which fields matter for equality. You must define what makes two objects "equal."',
                '## How the Code Works',
                '- `bool operator==(const Item& other) const` defines the equality operator.\n- `bool` is the return type. Equality must answer a true/false question. Without returning a boolean, the result could not be used in an `if` statement.\n- `this->id == other.id` explicitly compares the internal state of the left-hand object (`this`) and the right-hand object (`other`).\n- `item1 == item2` triggers the `operator==` method on `item1`, passing `item2` as the argument.',
                '**CS lens.** Equality is a semantic concept, not just a memory comparison. Two objects might reside at different memory addresses but be considered logically equal if their identifying data (like an ID) matches. Overloading `==` allows the class author to define the exact semantic rules for equivalence.',
                '**SE lens.** The alternative not chosen is relying on a manual `isEqual()` method or comparing public fields directly (`item1.getId() == item2.getId()`). Overloading `==` makes the code significantly cleaner when objects are used in standard algorithms, like searching a list for a specific item, which inherently rely on the `==` operator to function.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass Item {\nprivate:\n    int id;\n\npublic:\n    Item(int id) : id(id) {}\n\n    bool operator==(const Item& other) const {\n        return this->id == other.id;\n    }\n};\n\nint main() {\n    Item item1(42);\n    Item item2(42);\n    Item item3(99);\n\n    if (item1 == item2) {\n        std::cout << "item1 and item2 are equal\\n";\n    }\n    if (!(item1 == item3)) {\n        std::cout << "item1 and item3 are not equal\\n";\n    }\n    return 0;\n}',
              expectedOutput: 'item1 and item2 are equal\nitem1 and item3 are not equal',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Printing Objects with << and Friend Functions',
              prose: [
                'You want to print your object directly using `std::cout << myObject;`. However, the `<<` operator belongs to the `std::ostream` class (like `std::cout`), not your class. You cannot add a method to the standard library\'s `std::ostream` class. Furthermore, the function that overloads `<<` needs to read your object\'s private data to print it.',
                '## How the Code Works',
                '- `friend std::ostream& operator<<(std::ostream& os, const Player& player);` inside the class declares a friend function.\n- `friend` tells the compiler: "This specific function is not a member of this class, but it is allowed to read and write my private fields." Without this keyword, the external function would be blocked from accessing `name` and `score`.\n- `std::ostream& operator<<(...)` is defined outside the class. It takes the output stream (`os`) as the left operand and the `Player` as the right operand.\n- `os << "[" << player.name ...` writes the private data into the stream.\n- `return os;` returns the stream itself by reference. Without returning the stream, you could not chain multiple output operations together (like `std::cout << p1 << "\\n"`).',
                '**CS lens.** The `<<` operator is mathematically left-associative. When you write `cout << a << b`, it evaluates as `(cout << a) << b`. Because `cout << a` returns a reference to `cout`, the result is `cout << b`, allowing the chain to continue indefinitely.',
                '**SE lens.** The alternative not chosen is adding public getter methods for every field just so an external print function can read them. The tradeoff of the `friend` keyword is that it slightly weakens encapsulation by granting a specific outsider full access, but the benefit is keeping the class interface clean of getter methods that exist solely for logging or printing.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nclass Player {\nprivate:\n    std::string name;\n    int score;\n\npublic:\n    Player(std::string name, int score) : name(name), score(score) {}\n\n    friend std::ostream& operator<<(std::ostream& os, const Player& player);\n};\n\nstd::ostream& operator<<(std::ostream& os, const Player& player) {\n    os << "[" << player.name << ": " << player.score << "]";\n    return os;\n}\n\nint main() {\n    Player p1("Zelda", 1500);\n    std::cout << "Winner: " << p1 << "\\n";\n    return 0;\n}',
              expectedOutput: 'Winner: [Zelda: 1500]',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'The Copy Assignment Operator (=)',
              prose: [
                'When you assign an existing object to another existing object (`a = b`), C++ performs a shallow copy by default, copying the raw bytes of `b` into `a`. If your object manages dynamically allocated memory (using `new`), a shallow copy will result in both objects pointing to the exact same memory address. When one object modifies or deletes the memory, the other object is corrupted.',
                '## How the Code Works',
                '- `Buffer& operator=(const Buffer& other)` defines the copy assignment operator. It is called exactly when an existing object receives an assignment.\n- `if (this == &other)` checks for self-assignment (e.g., `b1 = b1`). If the memory addresses are identical, the method immediately returns. Without this check, the function might mistakenly overwrite or delete its own data before copying it.\n- `*data = *(other.data);` performs a deep copy of the value, rather than copying the pointer address. Both objects retain their own independent memory allocations, but the values inside them are synchronized.\n- `return *this;` returns a reference to the newly updated object, enabling chained assignments (like `a = b = c`).',
                '**CS lens.** Assignment is fundamentally different from initialization. A copy constructor creates a brand new object. An assignment operator alters an object that has already been constructed, which means it may hold existing resources (like allocated memory or open files) that must be carefully managed or cleaned up before adopting the new state.',
                '**SE lens.** The alternative not chosen is letting C++ perform a default shallow copy. The tradeoff is that writing custom copy assignment operators is tedious and prone to edge-case bugs (like forgetting the self-assignment check). This is why modern C++ strongly prefers using smart pointers (`std::unique_ptr` or `std::shared_ptr`) which automatically handle memory duplication and cleanup, entirely removing the need to write custom assignment operators in most cases.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass Buffer {\nprivate:\n    int* data;\n\npublic:\n    Buffer(int value) {\n        data = new int(value);\n    }\n\n    ~Buffer() {\n        delete data;\n    }\n\n    Buffer& operator=(const Buffer& other) {\n        if (this == &other) {\n            return *this;\n        }\n        \n        *data = *(other.data);\n        return *this;\n    }\n\n    void print() const {\n        std::cout << "Data: " << *data << "\\n";\n    }\n};\n\nint main() {\n    Buffer b1(10);\n    Buffer b2(20);\n    \n    b2 = b1; \n    \n    b2.print();\n    return 0;\n}',
              expectedOutput: 'Data: 10',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'The Rule of Three',
              prose: [
                'If a class manually allocates memory, it needs a custom Destructor to free that memory. But if it has a custom Destructor, the default shallow copy behavior will cause a "double-free" crash when two copies of an object try to delete the exact same memory address.',
                '## How the Code Works',
                '- `~Resource()` is the destructor. Because we manually call `delete`, we are managing our own memory.\n- `Resource(const Resource& other)` is the copy constructor. It handles the deep copy when a new object is created from an existing one (`Resource r2 = r1;`).\n- `Resource& operator=(const Resource& other)` is the copy assignment operator. It handles the deep copy when an existing object is overwritten (`r3 = r1;`).\n- Notice that `Resource r2 = r1;` calls the copy constructor, not the assignment operator, because `r2` is being newly initialized on that exact line.',
                '**CS lens.** The Rule of Three is a heuristic for resource management. It states that the need for any one of these three functions (Destructor, Copy Constructor, Copy Assignment Operator) almost guarantees that the class is managing a manual resource. If you only implement one, you leave a gap in the object lifecycle where the resource can be leaked, double-freed, or corrupted.',
                '**SE lens.** The alternative not chosen is violating the rule by only writing a destructor, leading to inevitable crashes during runtime when objects are passed by value to functions or placed into standard library containers like `std::vector`. The cost of the Rule of Three is boilerplate code. Modern C++ extends this to the "Rule of Five" (adding move semantics) or the "Rule of Zero" (designing classes that don\'t manage their own raw resources at all).'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass Resource {\nprivate:\n    int* value;\n\npublic:\n    // 1. Constructor (allocates memory)\n    Resource(int val) {\n        value = new int(val);\n        std::cout << "Allocated\\n";\n    }\n\n    // 2. Destructor (Rule of Three part 1)\n    ~Resource() {\n        delete value;\n        std::cout << "Freed\\n";\n    }\n\n    // 3. Copy Constructor (Rule of Three part 2)\n    Resource(const Resource& other) {\n        value = new int(*(other.value));\n        std::cout << "Copy Constructed\\n";\n    }\n\n    // 4. Copy Assignment Operator (Rule of Three part 3)\n    Resource& operator=(const Resource& other) {\n        if (this != &other) {\n            *value = *(other.value);\n            std::cout << "Copy Assigned\\n";\n        }\n        return *this;\n    }\n};\n\nint main() {\n    Resource r1(100);       // Constructor\n    Resource r2 = r1;       // Copy Constructor\n    Resource r3(200);       // Constructor\n    r3 = r1;                // Copy Assignment Operator\n    \n    return 0;               // Destructor called 3 times\n}',
              expectedOutput: 'Allocated\nCopy Constructed\nAllocated\nCopy Assigned\nFreed\nFreed\nFreed',
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
      'Next lesson: Templates.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Operator Overloading"?',
      options: [
        'redefining how standard C++ operators (like +, ==) work for custom classes. It exists To make custom types feel like built-in types, allowing natural mathematical and logical expressions without forcing the use of clunky methods like add().',
        'a special operator (=) that is automatically called when an already-initialized object is assigned the value of another existing object of the same type. It exists To control how resources (like dynamically allocated memory) are cleaned up and duplicated when replacing an object\'s current state.',
        'a function declared with the friend keyword that is not a member of a class but is granted full access to its private members. It exists To allow external functions (like the &lt;&lt; stream insertion operator) to read private data without exposing that data publicly via getters.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Copy Assignment Operator"?',
      options: [
        'redefining how standard C++ operators (like +, ==) work for custom classes. It exists To make custom types feel like built-in types, allowing natural mathematical and logical expressions without forcing the use of clunky methods like add().',
        'a special operator (=) that is automatically called when an already-initialized object is assigned the value of another existing object of the same type. It exists To control how resources (like dynamically allocated memory) are cleaned up and duplicated when replacing an object\'s current state.',
        'a software engineering rule stating that if a class requires a user-defined destructor, copy constructor, or copy assignment operator, it almost certainly requires all three. It exists To prevent resource leaks, double-frees, or shallow-copy bugs when a class manually manages its own memory.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Rule of Three"?',
      options: [
        'a special operator (=) that is automatically called when an already-initialized object is assigned the value of another existing object of the same type. It exists To control how resources (like dynamically allocated memory) are cleaned up and duplicated when replacing an object\'s current state.',
        'a software engineering rule stating that if a class requires a user-defined destructor, copy constructor, or copy assignment operator, it almost certainly requires all three. It exists To prevent resource leaks, double-frees, or shallow-copy bugs when a class manually manages its own memory.',
        'a function declared with the friend keyword that is not a member of a class but is granted full access to its private members. It exists To allow external functions (like the &lt;&lt; stream insertion operator) to read private data without exposing that data publicly via getters.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Friend Function"?',
      options: [
        'a special operator (=) that is automatically called when an already-initialized object is assigned the value of another existing object of the same type. It exists To control how resources (like dynamically allocated memory) are cleaned up and duplicated when replacing an object\'s current state.',
        'a function declared with the friend keyword that is not a member of a class but is granted full access to its private members. It exists To allow external functions (like the &lt;&lt; stream insertion operator) to read private data without exposing that data publicly via getters.',
        'a software engineering rule stating that if a class requires a user-defined destructor, copy constructor, or copy assignment operator, it almost certainly requires all three. It exists To prevent resource leaks, double-frees, or shallow-copy bugs when a class manually manages its own memory.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Operator Overloading** — redefining how standard C++ operators (like +, ==) work for custom classes. It exists To make custom types feel like built-in types, allowing natural mathematical and logical expressions without forcing the use of clunky methods like add().',
    '**Friend Function** — a function declared with the friend keyword that is not a member of a class but is granted full access to its private members. It exists To allow external functions (like the &lt;&lt; stream insertion operator) to read private data without exposing that data publicly via getters.',
    '**Copy Assignment Operator** — a special operator (=) that is automatically called when an already-initialized object is assigned the value of another existing object of the same type. It exists To control how resources (like dynamically allocated memory) are cleaned up and duplicated when replacing an object\'s current state.',
    '**Rule of Three** — a software engineering rule stating that if a class requires a user-defined destructor, copy constructor, or copy assignment operator, it almost certainly requires all three. It exists To prevent resource leaks, double-frees, or shallow-copy bugs when a class manually manages its own memory.',
  ],

  checkpoints: ['read-intuition'],
}
