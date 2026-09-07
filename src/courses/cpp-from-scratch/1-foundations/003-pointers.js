// cpp-from-scratch — Lesson 3: Pointers
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 03 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-03-pointers',
  slug: 'pointers',
  chapter: 1,
  order: 3,
  title: 'Pointers',
  subtitle: 'Foundations',
  tags: ['pointer', 'memory-address', 'null-pointer', 'undefined-behavior-ub'],

  hook: {
    question: 'What is "Pointers", and why does it matter?',
    realWorldContext: 'A series of isolated console programs that allocate memory for data, inspect memory addresses directly, manipulate data remotely through those addresses, and deliberately crash a program by misusing an empty address. This teaches the transferable problem of understanding memory indirection and the severe consequences of violating memory rules in C++.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: The Address-Of Operator &, Pointers, The Dereference Operator, nullptr and Undefined Behavior.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Pointer:** a variable whose value is a memory address rather than a piece of application data. It exists so that a program can share, observe, or modify a single piece of data from multiple places without making expensive copies of it.\n- **Memory Address:** a unique numerical identifier for a specific byte of RAM. It exists so the computer\'s hardware and the operating system know exactly where to store and retrieve specific data.\n- **Null Pointer:** a pointer that explicitly holds no valid memory address. It exists to provide a safe, testable state indicating that a pointer is not currently pointing at any valid data.\n- **Undefined Behavior (UB):** a situation where the C++ standard deliberately does not specify what must happen, allowing the compiler to do whatever it wants (including crashing, corrupting data, or seemingly working fine). It exists to allow compilers to optimize code heavily by assuming you will never write code that breaks fundamental memory rules.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::cout:** The standard output stream.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: '1. `int a = 10;` creates data. 2. `int* p = &a;` uses the address-of operator `&` to find the data\'s location and stores it in the pointer `p`. 3. `*p = 20;` uses the dereference operator `*` to travel to the location and mutate the original data to `20`. 4. `p = nullptr;` severs the connection, making `p` point nowhere safely. 5. `*p = 30;` attempts to travel to nowhere, triggering Undefined Behavior and crashing the application.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Without pointers, you could never build complex data structures like linked lists or trees, where objects must maintain references to other objects. You would be forced to copy entire objects every time you passed them to a function, quickly exhausting memory and destroying performance.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Create a `double` variable with the value `3.14`.\n- Create a pointer to that `double`.\n- Print the memory address using the pointer.\n- Dereference the pointer to change the value to `2.71`.\n- Print the original `double` variable to confirm it changed.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written code that uses `&` to get a memory address.\n- [ ] You have declared a pointer variable with `*`.\n- [ ] You have used the dereference operator `*` to modify a variable indirectly.\n- [ ] You have deliberately crashed a program by dereferencing a `nullptr`.\n- [ ] You can explain the difference between the `&` operator and the `*` operator out loud.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 3: Pointers',
        caption: 'Pointers',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Address-Of Operator &',
              prose: [
                'We have data safely stored in a variable, but to tell another part of the system *where* that data is instead of just giving it a copy, we need a way to ask the computer for the data\'s actual physical location in memory.',
                '## How the Code Works',
                '- `#include <iostream>` tells the compiler to pull in the declarations for standard input and output.\n- `int main() {` is the entry point of the program.\n- `int score = 42;` allocates memory for a 32-bit integer named `score` and assigns it the value `42`.\n- `std::cout <<` pushes data to the standard output stream.\n- `&score` — **first appearance**: The address-of operator `&` placed immediately before a variable name asks the compiler for the memory address where that variable is physically stored. It evaluates to a memory address, not the value `42`.\n- `<< "\\n";` pushes a newline character to the output stream.\n- `return 0;` signals successful completion of the program to the operating system.\n- `}` closes the function block.',
                '**CS lens.** This embodies the concept of Indirection. Instead of operating on data directly, we are obtaining the means to locate the data. Indirection is a foundational concept in computer science. Also recognized in: file system paths, URLs, database indexes.',
                '**SE lens.** The engineering principle is transparency vs. abstraction. C++ gives you the exact memory address because it prioritizes transparency and control. The alternative not chosen is hiding memory management entirely (like Java or Python do). The tradeoff is that you have extreme power over hardware, but you bear the total responsibility for using that power safely.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int score = 42;\n    std::cout << &score << "\\n";\n    return 0;\n}',
              expectedOutput: '0x7ffee23b9a1c',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Pointers',
              prose: [
                'Now that we can obtain a memory address using the `&` operator, we need a dedicated variable type capable of safely storing that address so we can pass it around the program. We cannot just store it in an `int`, because memory addresses have different sizes and rules than regular numbers.',
                '## How the Code Works',
                '- `int score = 42;` allocates the data variable.\n- `int* addressOfScore` — **first appearance**: Declares a variable of type "pointer to int". The `*` here is part of the type declaration. It modifies `int` to mean "memory address of an int". This variable will hold a location, not an integer value.\n- `= &score;` evaluates the address of `score` and assigns it to the pointer variable.\n- `std::cout << addressOfScore << "\\n";` prints the memory address stored inside the pointer.',
                '**CS lens.** This embodies the concept of References. A variable that holds the location of data rather than the data itself.',
                '**SE lens.** The engineering principle is typing by reference target. Why declare it as `int*` instead of just a generic `address` type? Because C++ insists on strict type safety even for memory addresses. The compiler tracks what *kind* of data lives at that address, preventing you from accidentally reading an `int` address as if it were a `double` address.'
              ],
              typeIt: true,
              solution: 'int score = 42;\nint* addressOfScore = &score;\nstd::cout << addressOfScore << "\\n";',
              expectedOutput: '0x7ffcd34f8104',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'The Dereference Operator',
              prose: [
                'Once we hold a memory address in a pointer variable, we need a way to travel to that exact address and interact with the actual data stored there, either to read it or mutate it, without ever touching the original variable name directly.',
                '## How the Code Works',
                '- `int score = 42;` allocates the original integer.\n- `int* pScore = &score;` stores its address in a pointer.\n- `*pScore = 99;` — **first appearance**: The dereference operator `*`. When placed in front of a pointer variable *that is already declared*, it means "go to the address this pointer holds, and access the data there." We assign `99` into that location, mutating the original `score` indirectly.\n- `std::cout << score << "\\n";` prints the original `score` variable to prove it was changed.',
                '**CS lens.** This embodies Shared State. Multiple paths (the variable name `score`, and the pointer `pScore`) now lead to the exact same piece of memory.',
                '**SE lens.** The engineering principle is mutability through indirection. The alternative not chosen is returning a modified copy every time data changes. C++ allows direct in-place mutation through pointers because copying large structures is computationally expensive. The tradeoff is that analyzing the code becomes harder: `score` changed, even though the word `score` is never on the left side of an equals sign on that line.'
              ],
              typeIt: true,
              solution: 'int score = 42;\nint* pScore = &score;\n\n*pScore = 99;\n\nstd::cout << score << "\\n";',
              expectedOutput: '99',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'nullptr and Undefined Behavior',
              prose: [
                'If a pointer is declared but hasn\'t been assigned a valid address yet, it holds whatever garbage data happened to be in RAM. We need a way to explicitly mark a pointer as empty, and we must understand the catastrophic consequence of trying to dereference a pointer that points nowhere.',
                '## How the Code Works',
                '- `int* pEmpty = nullptr;` — **first appearance**: `nullptr` is a language keyword representing a safe, explicit "nowhere." It explicitly zeros out the pointer so it doesn\'t hold random garbage memory.\n- `std::cout <<` prepares to output data.\n- `*pEmpty` — **first appearance of UB**: We apply the dereference operator `*` to an empty address. We are telling the CPU "go to address 0 and read the integer there." The operating system reserves address 0 to trap errors. The standard dictates this is Undefined Behavior. The OS intercepts the illegal memory access and forcibly kills the program.\n- `<< "\\n";` is never reached.',
                '**CS lens.** This embodies Memory Protection and Segmentation Faults. Modern operating systems isolate memory. When a program tries to read memory it does not own (like the zero page), the hardware issues a fault, and the OS terminates the process.',
                '**SE lens.** The engineering principle is "Fast vs Safe". C++ chooses fast. The alternative not chosen is having the compiler automatically inject a check `if (pEmpty == nullptr) abort()` before every single dereference operator. C++ refuses to add this hidden cost. It assumes you, the programmer, will check for `nullptr` yourself before dereferencing. If you fail, the result is Undefined Behavior.'
              ],
              typeIt: true,
              solution: 'int* pEmpty = nullptr;\nstd::cout << *pEmpty << "\\n"; ',
              expectedOutput: 'Segmentation fault (core dumped)',
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
      'Next lesson: References.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Memory Address"?',
      options: [
        'a unique numerical identifier for a specific byte of RAM. It exists so the computer\'s hardware and the operating system know exactly where to store and retrieve specific data.',
        'a pointer that explicitly holds no valid memory address. It exists to provide a safe, testable state indicating that a pointer is not currently pointing at any valid data.',
        'a situation where the C++ standard deliberately does not specify what must happen, allowing the compiler to do whatever it wants (including crashing, corrupting data, or seemingly working fine). It exists to allow compilers to optimize code heavily by assuming you will never write code that breaks fundamental memory rules.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Undefined Behavior (UB)"?',
      options: [
        'a pointer that explicitly holds no valid memory address. It exists to provide a safe, testable state indicating that a pointer is not currently pointing at any valid data.',
        'a situation where the C++ standard deliberately does not specify what must happen, allowing the compiler to do whatever it wants (including crashing, corrupting data, or seemingly working fine). It exists to allow compilers to optimize code heavily by assuming you will never write code that breaks fundamental memory rules.',
        'a variable whose value is a memory address rather than a piece of application data. It exists so that a program can share, observe, or modify a single piece of data from multiple places without making expensive copies of it.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Null Pointer"?',
      options: [
        'a situation where the C++ standard deliberately does not specify what must happen, allowing the compiler to do whatever it wants (including crashing, corrupting data, or seemingly working fine). It exists to allow compilers to optimize code heavily by assuming you will never write code that breaks fundamental memory rules.',
        'a unique numerical identifier for a specific byte of RAM. It exists so the computer\'s hardware and the operating system know exactly where to store and retrieve specific data.',
        'a pointer that explicitly holds no valid memory address. It exists to provide a safe, testable state indicating that a pointer is not currently pointing at any valid data.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Pointer"?',
      options: [
        'a variable whose value is a memory address rather than a piece of application data. It exists so that a program can share, observe, or modify a single piece of data from multiple places without making expensive copies of it.',
        'a pointer that explicitly holds no valid memory address. It exists to provide a safe, testable state indicating that a pointer is not currently pointing at any valid data.',
        'a unique numerical identifier for a specific byte of RAM. It exists so the computer\'s hardware and the operating system know exactly where to store and retrieve specific data.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Pointer** — a variable whose value is a memory address rather than a piece of application data. It exists so that a program can share, observe, or modify a single piece of data from multiple places without making expensive copies of it.',
    '**Memory Address** — a unique numerical identifier for a specific byte of RAM. It exists so the computer\'s hardware and the operating system know exactly where to store and retrieve specific data.',
    '**Null Pointer** — a pointer that explicitly holds no valid memory address. It exists to provide a safe, testable state indicating that a pointer is not currently pointing at any valid data.',
    '**Undefined Behavior (UB)** — a situation where the C++ standard deliberately does not specify what must happen, allowing the compiler to do whatever it wants (including crashing, corrupting data, or seemingly working fine). It exists to allow compilers to optimize code heavily by assuming you will never write code that breaks fundamental memory rules.',
  ],

  checkpoints: ['read-intuition'],
}
