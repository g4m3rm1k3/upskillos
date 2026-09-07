// cpp-from-scratch — Lesson 6: Classes and Objects
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 06 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-06-classes-and-objects',
  slug: 'classes-and-objects',
  chapter: 1,
  order: 6,
  title: 'Classes and Objects',
  subtitle: 'Foundations',
  tags: ['class', 'object-instance', 'member-variable', 'constructor', 'member-function', 'access-specifier'],

  hook: {
    question: 'What is "Classes and Objects", and why does it matter?',
    realWorldContext: 'You will build isolated programs that group related data and actions together under custom names. This proves that you are not limited to the primitive data types C++ provides natively; you can invent your own types to represent complex entities in memory. The transferable problem this solves is data organization: instead of passing dozens of loose variables around a large application, you pass a single cohesive object that manages its own state and rules.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: A Class as a Blueprint, The Constructor, Member Functions, Access Specifiers (public: vs private:).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Class:** a definition of a custom data type. It exists to describe the shape and behavior of a complex entity before it actually exists in memory.\n- **Object / Instance:** a concrete block of memory created from a class. It exists to hold the actual data for one specific entity while the program runs.\n- **Member Variable:** a variable declared directly inside a class. It exists to store the permanent data that an object remembers between actions.\n- **Constructor:** a special function that runs exactly once when an object is created. It exists to guarantee that an object starts its life in a valid, fully configured state, preventing uninitialized memory bugs.\n- **Member Function:** a named block of code attached to a class. It exists to define the actions that objects of this class know how to perform on their own data.\n- **Access Specifier:** a keyword (public:, private:) that controls what code is allowed to see or modify a member variable or function. It exists to prevent outside code from breaking an object by tampering with its internal data.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::cout:** The standard character output stream.\n- **std::string:** A standard library type that manages sequences of characters.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Consider the flow of the value `100.50`. It starts outside the class as an argument provided to the `BankAccount` initialization in `main`. The compiler passes it into the constructor. The constructor binds it to the object by saving it into a `private` member variable. The value rests securely in the object\'s memory. Finally, an outside caller invokes a `public` member function on the object, which reaches into the `private` variable and prints the value to the screen.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If we try to bypass the public function and read the private variable directly from the outside, the compiler will stop us. Change the final code example by adding one line at the bottom of `main`: \n\n```cpp\nBankAccount account(100.50);\naccount.print_balance();\nstd::cout << account.balance << "\\n";\n```\n\nWhen you attempt to compile this using `g++ -std=c++17 private_demo.cpp -o private_demo`, you will receive a compiler error indicating that `balance` is private within this context: \n\n```text\nerror: \'double BankAccount::balance\' is private within this context\n```\n\nTo fix this, delete the failing line. You must respect the object\'s boundaries.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Modify the `Person` class from the third unit to take a `private:` integer `age` in its constructor as well. Update the `describe` function to print both the name and the age. Verify it compiles and works.\n- Try to change the `age` member variable of your `Person` object directly from the `main` function (e.g., `p1.age = 50;`). Observe the compiler error.\n- Add a new public function to `BankAccount` called `deposit(double amount)`. Inside it, add the amount to `balance`. Call `deposit` from your `main` function, then call `print_balance` again to prove the internal state changed.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- You can create a class definition in C++ and allocate instances of it.\n- You can write a constructor to guarantee required data is provided upon creation.\n- You can write a member function that operates on the object\'s own data.\n- You understand the difference between `public:` and `private:` access specifiers.\n- You can explain classes and objects out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 6: Classes and Objects',
        caption: 'Classes and Objects',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'A Class as a Blueprint',
              prose: [
                'When you write software, you often need to represent concepts that have multiple pieces of data. If you want to track a person, you need a name and an age. If you keep these as separate variables (`std::string name1`, `int age1`), keeping track of which variable belongs to which person quickly becomes an unmanageable mess. You need a way to declare a single new concept that contains both pieces of data.',
                '## How the Code Works',
                '- `class Person { ... };`: This defines a new type named `Person`. It does not create a person in memory. It tells the C++ compiler, "If I ever ask for a `Person`, this is what it looks like in memory." The trailing semicolon is strictly required in C++ to terminate a class definition.\n- `public:`: This is an access specifier. It tells the compiler that everything following it is fully visible and accessible from outside the class.\n- `std::string name;` and `int age;`: These are member variables. Every time a `Person` object is created, it will have its own piece of memory to hold a string and an integer.\n- `Person p1;`: This asks the computer to allocate a block of memory large enough to hold all the variables defined in the `Person` class, and names that memory `p1`. It produces an actual object.\n- `p1.name = "Alice";`: The `.` (dot) operator tells the program to access the specific object `p1`, look inside it for the member variable `name`, and store "Alice" there.\n- `Person p2;`: This allocates a completely separate block of memory. Without this, `p2` would not exist, and the data for "Bob" would overwrite "Alice".',
                '**CS lens.** A class is a user-defined compound data type. The hardware CPU only understands raw bytes. Primitive types like integers give meaning to 4 bytes. A class gives meaning to a larger block of memory by slicing it into named regions (member variables). This is identical in concept to a database table schema defining columns, while objects are the individual rows of data inserted into that table.',
                '**SE lens.** The engineering principle is Encapsulation of Data. The alternative not chosen is parallel arrays: having one list for names, one list for ages, and relying on the index matching across lists. Parallel arrays cost mental overhead; if you sort one array and forget to sort the other, the data is corrupted. Grouping data into a class ensures the pieces are physically bound together in memory and cannot drift apart.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nclass Person {\npublic:\n    std::string name;\n    int age;\n};\n\nint main() {\n    Person p1;\n    p1.name = "Alice";\n    p1.age = 30;\n\n    Person p2;\n    p2.name = "Bob";\n    p2.age = 25;\n\n    std::cout << p1.name << "\\n";\n    std::cout << p2.name << "\\n";\n    \n    return 0;\n}',
              expectedOutput: 'Alice\nBob',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Constructor',
              prose: [
                'If you rely on assigning member variables one by one after creating an object (`p1.name = "Alice"; p1.age = 30;`), you leave open the possibility that a programmer will forget to set a required variable. You need a way to demand that certain data is provided at the exact moment the object is brought into existence, so that it is never in an incomplete state.',
                '## How the Code Works',
                '- `Person(std::string initial_name, int initial_age)`: This is the constructor. It is a function that shares the exact name of the class and has no return type. It is the initialization logic for the object.\n- `name = initial_name;`: This takes the value passed into the constructor (`initial_name`) and permanently stores it in the object\'s `name` member variable. Without this step, the variable would remain uninitialized, even though the data was provided.\n- `Person p1("Alice", 30);`: Because the class now has a constructor that requires two parameters, `Person p1;` is no longer valid. The compiler forces the caller to provide the required data during creation. This guarantees the object is born with its data.',
                '**CS lens.** The constructor is the initialization phase of a state machine. It transitions memory from uninitialized garbage into a valid state that obeys the rules of the program. This is similar to formatting a hard drive before you can save files to it: the raw storage exists, but it must be prepared according to a strict structure before it is usable.',
                '**SE lens.** The engineering principle is Invariant Enforcement. The alternative not chosen is an `initialize()` function that must be called manually after creation. The tradeoff of the alternative is temporal coupling: the caller must remember to call `initialize()` before using the object. By using a constructor, we make it impossible for the caller to forget. The cost is that we must know all required data at the exact moment we want to allocate the object.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nclass Person {\npublic:\n    std::string name;\n    int age;\n\n    Person(std::string initial_name, int initial_age) {\n        name = initial_name;\n        age = initial_age;\n    }\n};\n\nint main() {\n    Person p1("Alice", 30);\n    Person p2("Bob", 25);\n\n    std::cout << p1.name << " is " << p1.age << "\\n";\n    std::cout << p2.name << " is " << p2.age << "\\n";\n    \n    return 0;\n}',
              expectedOutput: 'Alice is 30\nBob is 25',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Member Functions',
              prose: [
                'Data rarely exists just to be stored; it exists to be acted upon. If you want to print a person\'s details, you could write that logic in your main function. But if you need to print a person\'s details in fifty different places, you will duplicate that logic fifty times. You need a way to attach behaviors directly to the data, so the object knows how to operate on itself.',
                '## How the Code Works',
                '- `void describe()`: This is a member function. It is a block of code attached to the `Person` class. The word `void` means this action does not return any data when it finishes.\n- `std::cout << "I am " << name << "\\n";`: Because `describe` is inside the `Person` class, it can access the `name` member variable directly. It implicitly knows which `name` to read based on which object called the function.\n- `p1.describe();`: This tells the program to execute the `describe` function. Crucially, it executes it in the context of the `p1` object. When the function runs, it reads `p1`\'s data.\n- `p2.describe();`: This executes the same function, but now in the context of `p2`. The function automatically uses the correct data.',
                '**CS lens.** A member function is a subroutine with an invisible parameter. When you call `p1.describe()`, the C++ compiler silently passes the memory address of `p1` into the function. This is how the same block of machine code can operate on millions of different objects without getting confused about whose data to read.',
                '**SE lens.** The engineering principle is Cohesion. The alternative not chosen is a standalone function `describe_person(Person p)`. The real tradeoff is that keeping the function inside the class makes the class larger and more complex, but it makes the rest of the application simpler because the behavior travels with the data. If the shape of the data changes later, you only have to update the functions inside the class.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nclass Person {\npublic:\n    std::string name;\n\n    Person(std::string initial_name) {\n        name = initial_name;\n    }\n\n    void describe() {\n        std::cout << "I am " << name << "\\n";\n    }\n};\n\nint main() {\n    Person p1("Alice");\n    Person p2("Bob");\n\n    p1.describe();\n    p2.describe();\n    \n    return 0;\n}',
              expectedOutput: 'I am Alice\nI am Bob',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Access Specifiers (public: vs private:)',
              prose: [
                'If every piece of data inside an object is available to the entire program, any part of the program can change it. If you have a `BankAccount` object, you do not want random code to reach in and change the `balance` variable to a million. You need a way to lock down internal data, forcing the outside world to interact with the object only through approved functions that can enforce rules.',
                '## How the Code Works',
                '- `private:`: This keyword declares that everything following it is completely invisible to any code that is not inside the `BankAccount` class. It acts as an absolute barrier.\n- `double balance;`: Because this is listed after `private:`, external code cannot access it.\n- `public:`: This keyword re-opens accessibility. Everything below it can be called by anyone.\n- `balance = initial_deposit;`: This code is inside the `BankAccount` constructor (which is a member of the class), so it is allowed to touch the `private` member variable.\n- `std::cout << "Balance is: " << balance << "\\n";`: Because `print_balance` is inside the class, it can read the `private` member variable and safely share the information with the outside world.\n- `account.print_balance();`: The outside code successfully triggers the behavior without ever touching the raw data directly.',
                '**CS lens.** Access specifiers are a compiler-enforced contract. At runtime, when the program is executing in the CPU, `private` does not exist — the memory is just memory. But during compilation, the compiler acts as a strict referee, refusing to build the program if it catches outside code attempting to access memory declared as private. This is a purely structural safeguard.',
                '**SE lens.** The engineering principle is Information Hiding. The alternative not chosen is making everything public and adding a comment saying `// Do not modify this directly`. The tradeoff is that private variables require you to write extra public functions just to read or safely update the data, which increases the amount of code. However, it prevents catastrophic bugs where external code accidentally corrupts an object\'s state, making the system vastly more stable as it grows.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass BankAccount {\nprivate:\n    double balance;\n\npublic:\n    BankAccount(double initial_deposit) {\n        balance = initial_deposit;\n    }\n\n    void print_balance() {\n        std::cout << "Balance is: " << balance << "\\n";\n    }\n};\n\nint main() {\n    BankAccount account(100.50);\n    account.print_balance();\n    \n    return 0;\n}',
              expectedOutput: 'Balance is: 100.5',
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
      'Next lesson: Constructors and Destructors.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Object / Instance"?',
      options: [
        'a special function that runs exactly once when an object is created. It exists to guarantee that an object starts its life in a valid, fully configured state, preventing uninitialized memory bugs.',
        'a concrete block of memory created from a class. It exists to hold the actual data for one specific entity while the program runs.',
        'a definition of a custom data type. It exists to describe the shape and behavior of a complex entity before it actually exists in memory.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Access Specifier"?',
      options: [
        'a special function that runs exactly once when an object is created. It exists to guarantee that an object starts its life in a valid, fully configured state, preventing uninitialized memory bugs.',
        'a keyword (public:, private:) that controls what code is allowed to see or modify a member variable or function. It exists to prevent outside code from breaking an object by tampering with its internal data.',
        'a concrete block of memory created from a class. It exists to hold the actual data for one specific entity while the program runs.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Member Variable"?',
      options: [
        'a concrete block of memory created from a class. It exists to hold the actual data for one specific entity while the program runs.',
        'a named block of code attached to a class. It exists to define the actions that objects of this class know how to perform on their own data.',
        'a variable declared directly inside a class. It exists to store the permanent data that an object remembers between actions.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Class"?',
      options: [
        'a definition of a custom data type. It exists to describe the shape and behavior of a complex entity before it actually exists in memory.',
        'a named block of code attached to a class. It exists to define the actions that objects of this class know how to perform on their own data.',
        'a variable declared directly inside a class. It exists to store the permanent data that an object remembers between actions.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Class** — a definition of a custom data type. It exists to describe the shape and behavior of a complex entity before it actually exists in memory.',
    '**Object / Instance** — a concrete block of memory created from a class. It exists to hold the actual data for one specific entity while the program runs.',
    '**Member Variable** — a variable declared directly inside a class. It exists to store the permanent data that an object remembers between actions.',
    '**Constructor** — a special function that runs exactly once when an object is created. It exists to guarantee that an object starts its life in a valid, fully configured state, preventing uninitialized memory bugs.',
    '**Member Function** — a named block of code attached to a class. It exists to define the actions that objects of this class know how to perform on their own data.',
    '**Access Specifier** — a keyword (public:, private:) that controls what code is allowed to see or modify a member variable or function. It exists to prevent outside code from breaking an object by tampering with its internal data.',
  ],

  checkpoints: ['read-intuition'],
}
