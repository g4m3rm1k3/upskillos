// cpp-from-scratch — Lesson 5: Functions
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 05 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-05-functions',
  slug: 'functions',
  chapter: 1,
  order: 5,
  title: 'Functions',
  subtitle: 'Foundations',
  tags: ['function', 'return-type', 'parameter', 'argument', 'pass-by-value', 'pass-by-reference'],

  hook: {
    question: 'What is "Functions", and why does it matter?',
    realWorldContext: 'A series of isolated console programs that group instructions into named, reusable blocks, pass data into them in different ways, and return results. You will observe how data is copied, how memory locations are shared directly, and how the C++ compiler guarantees that shared data cannot be unexpectedly modified.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Functions and Return Types, Pass-by-Value, Pass-by-Reference, Pass-by-Pointer, const Parameters.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Function:** a named block of code that performs a specific task. It exists so that you can reuse a sequence of instructions without rewriting them, and name that sequence so its purpose is clear.\n- **Return Type:** the type of data a function hands back to whoever called it once it finishes. It exists so that the caller can safely use the result in further calculations, knowing exactly what shape the data will be.\n- **Parameter:** a variable declared in a function\'s signature that acts as a placeholder for the actual data passed in. It exists so the function can operate on different data each time it is called.\n- **Argument:** the actual data provided to a function when it is called. It exists to give the function specific values to work with for a single execution.\n- **Pass-by-Value:** a method of passing arguments where the function receives a brand-new copy of the data. It exists to guarantee that any changes made inside the function cannot affect the original data.\n- **Pass-by-Reference:** a method of passing arguments where the function receives direct access to the original data\'s memory location using an alias. It exists to avoid the cost of copying large data and to allow a function to modify the original data.\n- **Pass-by-Pointer:** a method of passing arguments where the function receives the memory address of the original data. It exists to allow a function to modify the original data, while also allowing the possibility that no data was provided at all (a null pointer).\n- **const Parameter:** a parameter marked as immutable. It exists to allow a function to read original data directly (saving copying time) while having the compiler guarantee the function cannot accidentally modify it.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::cout:** The standard character output stream in C++.\n- **std::endl:** A manipulator that inserts a newline character and flushes the output stream.\n- **std::string:** A standard library class representing a sequence of characters.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how the compiler enforces data boundaries based on the function signature: We define `int original = 100;`. We pass it to `void passByValue(int x)`. The compiler physically clones `100` into a new memory block. The function mutates `x`, but `original` remains safe. Next, we pass it to `void passByRef(int& x)`. The compiler passes the memory address directly. The function mutates `x`, and `original` is permanently altered. Finally, we declare a large text block `std::string text = "Hello";` and pass it to `void print(const std::string& str)`. The compiler passes the memory address to avoid an expensive copy, but erects a static analysis firewall around the reference, guaranteeing that the function cannot overwrite the text.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Without `const` correctness on references, a function designed only to read data might accidentally destroy it. Let\'s force the compiler to stop you. Open `main.cpp` and write: \n\n```cpp\n#include <string>\n\nvoid displayData(const std::string& data) {\n    data = "Corrupted!";\n}\n\nint main() {\n    std::string info = "Safe";\n    displayData(info);\n    return 0;\n}\n```\n\nRun `g++ -std=c++17 main.cpp -o main`. The compilation fails before the program ever runs. **The error:** `error: assignment of read-only reference \'data\'` The compiler caught the logic flaw. To fix it, you must respect the immutable contract. Restore it by deleting the line that attempts to modify `data`.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Write a function `int subtract(int a, int b)` that returns the result of `a - b`. Call it from `main` and print the result.\n- Write a function `void tripleValue(int& number)` that takes a reference and multiplies the original variable by 3. Pass a variable in `main` to it, and print the variable before and after to prove it changed.\n- Attempt to write a function that takes a `const int&` parameter and try to add 1 to it inside the function. Run `g++` and observe the compiler error preventing the mutation.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written and executed a function that returns a calculated value.\n- [ ] You have proven with output that a pass-by-value parameter copies data, isolating the original variable.\n- [ ] You have proven with output that a pass-by-reference parameter mutates the original variable.\n- [ ] You have written a function that handles a `nullptr` pass-by-pointer safely without crashing.\n- [ ] You have intentionally triggered a compiler error by trying to mutate a `const` reference parameter.\n- [ ] You can explain the performance vs. safety tradeoff of pass-by-value vs pass-by-reference out loud.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 5: Functions',
        caption: 'Functions',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Functions and Return Types',
              prose: [
                'Writing the same math or logic repeatedly is error-prone. We need a way to define an operation once, give it a name, and receive a result back so we can use it multiple times without duplicating code.',
                '## How the Code Works',
                '- `#include <iostream>` imports the standard input/output stream library, giving us access to `std::cout`.\n- `int calculateArea(int width, int height)` is the function signature. The first `int` is the return type, declaring that this function will give back an integer. `calculateArea` is the function\'s name. `(int width, int height)` are the parameters, stating that anyone calling this function must provide two integers.\n- `{` begins the function\'s body, the block of code that executes when the function is called.\n- `int area = width * height;` allocates a new integer variable named `area` and assigns it the mathematical product of the two parameters.\n- `return area;` halts the function\'s execution and hands the value stored in `area` back to the caller. The type of this value matches the `int` return type declared in the signature.\n- `}` ends the function\'s body.\n- `int main()` is the entry point of every C++ program.\n- `int roomArea = calculateArea(5, 10);` calls the function. The values `5` and `10` are the arguments. The program pauses `main`, jumps into `calculateArea`, runs it, takes the returned `50`, and stores it in the newly allocated `roomArea` variable.\n- `std::cout << "Area: " << roomArea << std::endl;` prints the result to the console.\n- `return 0;` signals to the operating system that the program completed successfully.',
                '**CS lens.** This embodies the concept of subroutines and abstraction. By wrapping an operation in a function, we abstract away the implementation details. The caller only needs to know the inputs and outputs, not how the work is actually performed. Also recognized in: mathematical functions, CPU jump instructions, RPC (Remote Procedure Calls).',
                '**SE lens.** The design principle here is DRY (Don\'t Repeat Yourself). The alternative not chosen is inline duplication—writing `width * height` every time you need an area. The tradeoff is a slight performance overhead (function call overhead) to jump the instruction pointer to another memory location, but it drastically reduces maintenance cost because the logic is centralized in one place.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint calculateArea(int width, int height) {\n    int area = width * height;\n    return area;\n}\n\nint main() {\n    int roomArea = calculateArea(5, 10);\n    std::cout << "Area: " << roomArea << std::endl;\n    return 0;\n}',
              expectedOutput: 'Area: 50',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Pass-by-Value',
              prose: [
                'When we hand data to a function, we need to know if the function can destroy or alter our original data. If a function misbehaves and modifies a parameter, it shouldn\'t corrupt the caller\'s state.',
                '## How the Code Works',
                '- `void attemptBonus(int score)` declares a function. The `void` return type means this function returns nothing at all.\n- `score = score + 50;` adds 50 to the local parameter `score`.\n- `std::cout << "Inside function: " << score << std::endl;` prints the modified local variable, outputting 150.\n- `int originalScore = 100;` allocates memory in `main` for an integer and stores 100.\n- `attemptBonus(originalScore);` calls the function. Because this is pass-by-value (the default in C++), the compiler physically copies the binary data `100` from `originalScore` into a completely new memory location reserved for the `score` parameter.\n- `std::cout << "Outside function: " << originalScore << std::endl;` prints the variable in `main`. It outputs 100, proving that `originalScore` was completely untouched by the mutation inside the function.',
                '**CS lens.** This embodies pass-by-value and stack isolation. The function executes in its own isolated stack frame, creating localized copies of all incoming arguments.',
                '**SE lens.** The engineering principle is data isolation by default. The alternative not chosen is shared memory for all variables. The tradeoff is memory duplication: pass-by-value is incredibly fast and safe for small fundamental types (like `int` or `bool`), but doing this for a massive multi-megabyte string would waste memory and CPU cycles copying data pointlessly.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nvoid attemptBonus(int score) {\n    score = score + 50;\n    std::cout << "Inside function: " << score << std::endl;\n}\n\nint main() {\n    int originalScore = 100;\n    attemptBonus(originalScore);\n    std::cout << "Outside function: " << originalScore << std::endl;\n    return 0;\n}',
              expectedOutput: 'Inside function: 150\nOutside function: 100',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Pass-by-Reference',
              prose: [
                'We need a way to grant a function direct access to our existing memory. We want to avoid the cost of copying data, and we want mutations inside the function to actually alter the original variable in the caller.',
                '## How the Code Works',
                '- `void grantBonus(int& score)` declares a function that takes a reference. The `&` symbol after the type means `score` is not a new integer; it is a direct alias to whatever existing integer is passed in.\n- `score = score + 50;` adds 50 to `score`. Because `score` is a reference, this operation reaches across the boundary of the function and directly mutates the original memory location.\n- `int myScore = 100;` allocates memory in `main` holding 100.\n- `grantBonus(myScore);` calls the function. No copy is made. The parameter `score` becomes an alternate name for `myScore`\'s exact memory address.\n- `std::cout << "Outside function: " << myScore << std::endl;` prints `myScore`, which outputs 150, proving that the function successfully mutated the original data.',
                '**CS lens.** This embodies pointer semantics abstracted safely. Under the hood, a reference is implemented as a pointer (a memory address), but the compiler hides the memory management from you, making it look and act exactly like a normal variable.',
                '**SE lens.** The tradeoff here is performance versus safety. You eliminate the CPU overhead of copying data, but you surrender the isolation guarantee. If `grantBonus` modifies the data improperly, `main` suffers the consequences immediately.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nvoid grantBonus(int& score) {\n    score = score + 50;\n    std::cout << "Inside function: " << score << std::endl;\n}\n\nint main() {\n    int myScore = 100;\n    grantBonus(myScore);\n    std::cout << "Outside function: " << myScore << std::endl;\n    return 0;\n}',
              expectedOutput: 'Inside function: 150\nOutside function: 150',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Pass-by-Pointer',
              prose: [
                'A reference must always point to a valid object; it cannot be empty. If we are writing a function that updates a player\'s score, but the player might not be logged in (so their score doesn\'t exist), we need a way to pass an empty value safely.',
                '## How the Code Works',
                '- `void optionalBonus(int* scorePointer)` declares a function taking a pointer to an integer. The `*` signifies that it expects a memory address, not the value itself.\n- `if (scorePointer != nullptr)` checks if the pointer is empty. `nullptr` is the standard C++ keyword representing a null (empty) memory address. This is the crucial difference from references: pointers can explicitly point to nothing.\n- `*scorePointer = *scorePointer + 50;` dereferences the pointer using the `*` operator, reaching into the memory address to modify the actual integer stored there.\n- `optionalBonus(&myScore);` passes the exact memory address of `myScore` to the function using the address-of operator `&`.\n- `optionalBonus(nullptr);` passes an empty address. The function\'s `if` check safely catches this and skips the modification, preventing a crash.',
                '**CS lens.** This embodies memory addressing and nullability. Allowing a pointer to be null means the function caller can opt out of providing data, which is a common pattern in C-style APIs and older C++ codebases.',
                '**SE lens.** The alternative not chosen is using `std::optional` (a modern C++ feature). The tradeoff of using raw pointers is safety. If you forget to write the `if (scorePointer != nullptr)` check and attempt to dereference a null pointer, the operating system will instantly terminate your program with a segmentation fault.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nvoid optionalBonus(int* scorePointer) {\n    if (scorePointer != nullptr) {\n        *scorePointer = *scorePointer + 50;\n        std::cout << "Added bonus. New score: " << *scorePointer << std::endl;\n    } else {\n        std::cout << "No score provided. Skipping." << std::endl;\n    }\n}\n\nint main() {\n    int myScore = 100;\n    \n    optionalBonus(&myScore);\n    std::cout << "In main: " << myScore << std::endl;\n    \n    optionalBonus(nullptr);\n    \n    return 0;\n}',
              expectedOutput: 'Added bonus. New score: 150\nIn main: 150\nNo score provided. Skipping.',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'const Parameters',
              prose: [
                'When dealing with large data structures like a long string of text, passing by value is unacceptably slow because the entire text must be duplicated in memory. Passing by reference is fast, but it accidentally grants the function the power to mutate the original string. We need to give the function direct access to the memory, but strictly forbid it from making changes.',
                '## How the Code Works',
                '- `#include <string>` imports the standard string library, allowing us to use `std::string`.\n- `void printName(const std::string& name)` declares the parameter as a constant reference. `const` locks the data, and `&` passes it by reference.\n- `// name = "Hacked";` is commented out. If you uncommented this line, the C++ compiler would categorically refuse to compile the program. The `const` keyword forms a legally binding contract that this function will only read the memory, never write to it.\n- `std::cout << "Player Name: " << name << std::endl;` reads the original string memory and prints it perfectly.\n- `std::string player = "Alice";` allocates a larger, more complex string structure in memory.\n- `printName(player);` passes the reference. No memory is copied, and the caller is mathematically guaranteed that `"Alice"` will not be altered.',
                '**CS lens.** This embodies immutability enforced by the compiler. It shifts the burden of verifying safety from the programmer\'s brain to the compiler\'s static analysis engine.',
                '**SE lens.** The design principle is "const correctness". The alternative not chosen is relying on programmer discipline (trusting them not to write `name = "Hacked";` while just using a plain `std::string&`). The tradeoff is a slightly more verbose signature, but it completely eliminates an entire class of bugs where data changes unexpectedly beneath you. Modern C++ style dictates that all references should be `const` unless the function specifically exists to mutate the data.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nvoid printName(const std::string& name) {\n    // name = "Hacked"; // The compiler would reject this line\n    std::cout << "Player Name: " << name << std::endl;\n}\n\nint main() {\n    std::string player = "Alice";\n    printName(player);\n    return 0;\n}',
              expectedOutput: 'Player Name: Alice',
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
      'Next lesson: Classes and Objects.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Parameter"?',
      options: [
        'a method of passing arguments where the function receives the memory address of the original data. It exists to allow a function to modify the original data, while also allowing the possibility that no data was provided at all (a null pointer).',
        'a variable declared in a function\'s signature that acts as a placeholder for the actual data passed in. It exists so the function can operate on different data each time it is called.',
        'a method of passing arguments where the function receives a brand-new copy of the data. It exists to guarantee that any changes made inside the function cannot affect the original data.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Pass-by-Reference"?',
      options: [
        'a method of passing arguments where the function receives direct access to the original data\'s memory location using an alias. It exists to avoid the cost of copying large data and to allow a function to modify the original data.',
        'the actual data provided to a function when it is called. It exists to give the function specific values to work with for a single execution.',
        'the type of data a function hands back to whoever called it once it finishes. It exists so that the caller can safely use the result in further calculations, knowing exactly what shape the data will be.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Return Type"?',
      options: [
        'a named block of code that performs a specific task. It exists so that you can reuse a sequence of instructions without rewriting them, and name that sequence so its purpose is clear.',
        'the type of data a function hands back to whoever called it once it finishes. It exists so that the caller can safely use the result in further calculations, knowing exactly what shape the data will be.',
        'a parameter marked as immutable. It exists to allow a function to read original data directly (saving copying time) while having the compiler guarantee the function cannot accidentally modify it.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Pass-by-Value"?',
      options: [
        'a method of passing arguments where the function receives a brand-new copy of the data. It exists to guarantee that any changes made inside the function cannot affect the original data.',
        'a parameter marked as immutable. It exists to allow a function to read original data directly (saving copying time) while having the compiler guarantee the function cannot accidentally modify it.',
        'a named block of code that performs a specific task. It exists so that you can reuse a sequence of instructions without rewriting them, and name that sequence so its purpose is clear.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Function** — a named block of code that performs a specific task. It exists so that you can reuse a sequence of instructions without rewriting them, and name that sequence so its purpose is clear.',
    '**Return Type** — the type of data a function hands back to whoever called it once it finishes. It exists so that the caller can safely use the result in further calculations, knowing exactly what shape the data will be.',
    '**Parameter** — a variable declared in a function\'s signature that acts as a placeholder for the actual data passed in. It exists so the function can operate on different data each time it is called.',
    '**Argument** — the actual data provided to a function when it is called. It exists to give the function specific values to work with for a single execution.',
    '**Pass-by-Value** — a method of passing arguments where the function receives a brand-new copy of the data. It exists to guarantee that any changes made inside the function cannot affect the original data.',
    '**Pass-by-Reference** — a method of passing arguments where the function receives direct access to the original data\'s memory location using an alias. It exists to avoid the cost of copying large data and to allow a function to modify the original data.',
    '**Pass-by-Pointer** — a method of passing arguments where the function receives the memory address of the original data. It exists to allow a function to modify the original data, while also allowing the possibility that no data was provided at all (a null pointer).',
    '**const Parameter** — a parameter marked as immutable. It exists to allow a function to read original data directly (saving copying time) while having the compiler guarantee the function cannot accidentally modify it.',
  ],

  checkpoints: ['read-intuition'],
}
