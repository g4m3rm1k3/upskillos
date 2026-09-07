// cpp-from-scratch — Lesson 14: Exceptions
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 14 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-14-exceptions',
  slug: 'exceptions',
  chapter: 2,
  order: 6,
  title: 'Exceptions',
  subtitle: 'OOP and Generic Programming',
  tags: ['exception', 'throw', 'catch', 'stack-unwinding'],

  hook: {
    question: 'What is "Exceptions", and why does it matter?',
    realWorldContext: 'You will write isolated code snippets that throw, catch, and handle errors using C++ exceptions. This proves that you can signal catastrophic failures, decouple error detection from error handling, guarantee resource cleanup during a crash via RAII, and recognize when returning an error code is a better engineering choice than throwing an exception.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: throw, try / catch, std::exception, Stack Unwinding and RAII, When Exceptions Are the Wrong Tool.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Exception:** a signal that a function has failed to achieve its documented purpose and cannot proceed. It exists To forcefully interrupt normal execution and transfer control to an error-handling block, rather than relying on the caller to manually check return codes.\n- **Throw:** the act of raising an exception. It exists To abort the current function immediately and begin searching up the call stack for a handler.\n- **Catch:** the act of intercepting an exception. It exists To stop the program from crashing, inspect the error, and execute recovery logic.\n- **Stack Unwinding:** the process of automatically destroying local variables as an exception propagates up the call stack. It exists To guarantee that destructors run and resources are safely released even when a function is abruptly terminated by an error.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::exception:** The standard base class for all C++ library exceptions.\n- **std::exception / what():** A virtual method that returns an explanatory string describing the error.\n- **std::runtime_error:** A standard exception class derived from std::exception representing errors that can only be detected at runtime.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A single piece of bad data moving through a robust system: ```cpp // 1. A function receives bad data and cannot complete its work. void processFile(const std::string& path) { FileHandle file(path); // RAII object acquires the file // 2. We throw a std::exception derivative to signal failure throw std::runtime_error("Disk read error"); // 3. Stack unwinding destroys \'file\' here automatically. } int main() { // 4. We isolate risky code inside a try block. try { processFile("data.bin"); } // 5. We catch the standard base class to handle any derived error gracefully. catch (const std::exception& e) { std::cout << "Alert user: " << e.what() << "\\n"; } return 0; } ```',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you fail to catch an exception, the program terminates instantly without running any further code. Change your `catch_lab.cpp` from the `try/catch` unit to remove the `try` block inside `main`: \n\n```cpp\nint main() {\n    validateAge(20);\n    validateAge(-5);\n    std::cout << "Program recovered and continues.\\n";\n    return 0;\n}\n```\n\nCompile and run it. You will see the runtime explicitly crash and terminate your process with an uncaught exception error. The program does not recover, and the final print statement never runs. To restore it, you must wrap the dangerous calls in a `try` block and provide a `catch` handler.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Multiple Catch Blocks:** Write a function that takes an `int`. If the int is `1`, throw a `std::runtime_error("one")`. If it is `2`, throw a `std::invalid_argument("two")`. In `main`, write a `try` block followed by two separate `catch` blocks (one for `std::runtime_error`, one for `std::invalid_argument`) that print different messages.\n- **RAII vs Raw Pointers:** Modify the "Stack Unwinding" lab to include an `int* rawPtr = new int(5);` inside `processData` before the exception is thrown. Prove to yourself that `delete rawPtr;` is skipped when the exception is thrown, creating a memory leak, which is why RAII is required.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run every code snippet.\n- [ ] You understand that `throw` aborts a function and `catch` intercepts the abort.\n- [ ] You can explain why `std::exception` makes catching third-party errors easier.\n- [ ] You understand that stack unwinding guarantees RAII objects are destroyed.\n- [ ] You know why you should return `false` for expected failures instead of throwing exceptions.\n- [ ] You can explain exceptions out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 14: Exceptions',
        caption: 'Exceptions',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'throw',
              prose: [
                'When a function encounters an impossible situation—like dividing by zero, failing to allocate memory, or finding a corrupted file—it cannot return a valid result. If it simply returns a default value like `0` or `false`, the calling code might ignore it and continue computing with garbage data. You need a way for a function to loudly declare "I cannot do my job" and unconditionally halt the current execution path.',
                '## How the Code Works',
                '- `#include <iostream>` — includes the standard I/O library for printing.\n- `#include <string>` — includes the standard string class.\n- `void validateAge(int age)` — a function that takes an integer but returns nothing. If it completes successfully, the age is valid.\n- `if (age < 0)` — detects the impossible state.\n- `throw` — a C++ keyword that immediately aborts `validateAge`. It does not return to the caller; it initiates an exception sequence.\n- `std::string("Age cannot be negative.")` — the payload being thrown. In C++, you can throw absolutely any type—an `int`, a `std::string`, or a custom object. This object travels up the call stack.\n- `std::cout << "Age is valid.\\n";` — skipped if an exception is thrown.\n- `int main()` — the program entry point.\n- `validateAge(-5);` — calls the function with invalid input.\n- `std::cout << "This line will never print.\\n";` — because `validateAge` throws, execution in `main` is interrupted the moment `validateAge` evaluates the bad input. The program terminates before reaching this line.\n- `return 0;` — never reached.',
                '**CS lens.** Throwing an exception is a non-local `goto`. Instead of jumping to a specific line in the same function, it jumps out of the current function entirely, discarding the current stack frame and looking for a handler in the parent frames. If the hardware encounters a critical fault (like a divide-by-zero trap), the OS interrupts the process; `throw` is the software equivalent, raising an interrupt from user code.',
                '**SE lens.** The alternative to `throw` is returning an error code (e.g., returning `-1` if the age is invalid). The tradeoff is that error codes can be accidentally ignored by the caller, leading to silent propagation of bad state. `throw` forces the issue: the caller *must* deal with the failure, or the entire program crashes. The cost is that control flow becomes invisible; looking at `validateAge(-5)`, you cannot see that it might jump away.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nvoid validateAge(int age) {\n    if (age < 0) {\n        throw std::string("Age cannot be negative.");\n    }\n    std::cout << "Age is valid.\\n";\n}\n\nint main() {\n    validateAge(-5);\n    std::cout << "This line will never print.\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'try / catch',
              prose: [
                'In the previous unit, throwing an exception crashed the program. This is the default behavior. However, crashing an entire web server because one user submitted a bad age is unacceptable. You need a way to intercept the thrown exception, handle the error gracefully, and resume normal program execution.',
                '## How the Code Works',
                '- `try { ... }` — a block that tells the runtime to monitor all code executing inside it. If anything throws, execution stops immediately and the runtime looks at the attached `catch` blocks.\n- `validateAge(20);` — runs successfully. Prints "Age is valid."\n- `validateAge(-5);` — throws a `std::string`. The `try` block immediately aborts. The next line in the `try` block is skipped.\n- `catch (const std::string& errorMessage)` — intercepts any thrown object that matches the type `std::string`. The `const &` (const reference) prevents an unnecessary memory copy of the string payload.\n- `errorMessage` — the variable name given to the caught payload, allowing you to read it and print it.\n- `std::cout << "Program recovered..."` — after the `catch` block finishes, execution resumes at the first line *after* the `catch` block. The program does not crash.',
                '**CS lens.** This is structured exception handling. It acts as an out-of-band communication channel. The "happy path" (the `try` block) contains only the successful logic, while the "error path" (the `catch` block) is completely isolated. This separation mirrors the concept of control-plane versus data-plane in networking: normal data flows one way, but critical control signals bypass the normal flow.',
                '**SE lens.** The design principle is "separation of concerns." If you use error codes, every function call must be followed by an `if (error)` check, mixing success logic with error logic. `try`/`catch` consolidates error handling into one place. The downside is that exceptions add hidden branches to the compiled code, making the binary larger and potentially slowing down the "happy path" slightly, which is why strict real-time systems sometimes ban them entirely.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n\nvoid validateAge(int age) {\n    if (age < 0) {\n        throw std::string("Age cannot be negative.");\n    }\n    std::cout << "Age is valid.\\n";\n}\n\nint main() {\n    try {\n        validateAge(20);\n        validateAge(-5);\n        std::cout << "This line inside try will not print.\\n";\n    } \n    catch (const std::string& errorMessage) {\n        std::cout << "Error caught: " << errorMessage << "\\n";\n    }\n    \n    std::cout << "Program recovered and continues.\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::exception',
              prose: [
                'Because C++ allows you to `throw` absolutely anything—an `int`, a `double`, a `std::string`—catching errors from third-party libraries becomes a nightmare. If library A throws strings and library B throws integers, you have to write `catch` blocks for everything. You need a standardized, universal format for errors so you can catch a single type and extract a readable error message regardless of who threw it.',
                '## How the Code Works',
                '- `#include <stdexcept>` — the header providing standard exception types like `std::runtime_error`.\n- `throw std::runtime_error("...");` — throws a specific standard library error type instead of a raw string. `std::runtime_error` inherits from the base class `std::exception`.\n- `catch (const std::exception& ex)` — catches the base class. Because of object-oriented polymorphism, this single `catch` block will intercept `std::runtime_error`, `std::out_of_range`, `std::bad_alloc`, and any other standard exception.\n- `ex.what()` — a virtual method on `std::exception` that returns a `const char*` (a C-style string) containing the error message. The caller does not need to know what specific subclass was thrown; calling `what()` always works.',
                '**CS lens.** This demonstrates Liskov Substitution and polymorphism applied to error hierarchies. By throwing derived classes but catching the base class by reference, the system standardizes the interface for retrieving diagnostic data (`what()`) while allowing subsystems to throw highly specific types.',
                '**SE lens.** Best practice in modern C++ is to *never* throw basic types like `int` or `std::string`. Always throw a type that derives from `std::exception`. The tradeoff is a slightly longer syntax (`throw std::runtime_error(...)` instead of `throw "error"`), but the gain is that a single `catch (const std::exception&)` at the top of your program acts as a universal safety net, catching and logging any unexpected failure from any compliant library.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <stdexcept>\n\nvoid loadConfig() {\n    throw std::runtime_error("Configuration file missing.");\n}\n\nint main() {\n    try {\n        loadConfig();\n    } \n    catch (const std::exception& ex) {\n        std::cout << "Standard exception caught: " << ex.what() << "\\n";\n    }\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Stack Unwinding and RAII',
              prose: [
                'When a function throws an exception, execution immediately jumps out of the function. But what happens to the local variables (like objects managing open files or network connections) that were created before the exception was thrown? If they are simply abandoned in memory, the program will leak resources. You need proof that C++ cleans up properly when an exception interrupts execution.',
                '## How the Code Works',
                '- `class DatabaseConnection` — a mock RAII class that acquires a resource in its constructor and releases it in its destructor.\n- `DatabaseConnection db;` — creates a local object on the stack inside `processData`. The constructor runs, printing "Connected to DB."\n- `throw std::runtime_error(...)` — the exception is thrown. `processData` is violently aborted.\n- `~DatabaseConnection()` — the C++ runtime automatically invokes the destructor of `db` *before* the exception leaves the `processData` scope. This prints "Disconnected from DB."\n- `catch (const std::exception& ex)` — intercepts the exception after the stack has been cleaned up.',
                '**CS lens.** This mechanism is called **Stack Unwinding**. As the exception searches upward for a matching `try`/`catch` block, the C++ runtime meticulously walks backward through every stack frame it exits, calling the destructor for every fully constructed local object. This is a deterministic traversal ensuring resource safety.',
                '**SE lens.** This proves why RAII (Resource Acquisition Is Initialization, from Lesson 08) is mandatory in C++. If you use raw pointers and manual `delete` statements, an exception will jump right over your `delete` statement, causing a permanent memory leak. Because stack unwinding guarantees destructors are called regardless of *how* a function exits, wrapping resources in RAII classes (like smart pointers or file guards) makes your code immune to exception-based leaks.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <stdexcept>\n\nclass DatabaseConnection {\npublic:\n    DatabaseConnection() { std::cout << "Connected to DB.\\n"; }\n    ~DatabaseConnection() { std::cout << "Disconnected from DB.\\n"; }\n};\n\nvoid processData() {\n    DatabaseConnection db; \n    std::cout << "Processing...\\n";\n    throw std::runtime_error("Network failure during processing.");\n    std::cout << "This will not print.\\n";\n}\n\nint main() {\n    try {\n        processData();\n    } \n    catch (const std::exception& ex) {\n        std::cout << "Failed: " << ex.what() << "\\n";\n    }\n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'When Exceptions Are the Wrong Tool',
              prose: [
                'Because exceptions bypass normal return values and guarantee cleanup, they seem like the perfect way to handle every `if` statement that goes wrong. But exceptions have a massive performance cost when thrown. If you use them for ordinary, expected outcomes—like reaching the end of a file, or user validation failing—you will choke your application\'s speed. You need to know when to stick to return codes.',
                '## How the Code Works',
                '- `throw std::invalid_argument(...)` — throws an exception because a user left a field blank. This is bad engineering. A blank field is an expected outcome, not a catastrophic failure.\n- `return false;` — indicates failure via a boolean. This takes less than a nanosecond, whereas throwing an exception requires allocating the error object, unwinding the stack, and checking runtime type information.\n- `if (!loginWithErrorCode(""))` — the caller checks the boolean result. This is normal, expected logic that does not incur overhead.',
                '**CS lens.** Exceptions are designed for the "slow path." In modern compilers, the "happy path" (a `try` block where nothing is thrown) has zero performance cost. But the act of *throwing* an exception requires locking thread structures, doing string lookups, and traversing stack frames. It can be thousands of times slower than a simple `return` statement.',
                '**SE lens.** The golden rule is: **Exceptions are for exceptional circumstances.** Use them when a function physically cannot fulfill its contract (e.g., `openFile("data.txt")` fails because the hard drive is dead). Do not use them for normal business logic (e.g., `isValidPassword("123")` failing because it\'s too short). Expected failures should return `false`, `std::optional` (empty), or an error code enum. Catastrophic failures should throw.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <string>\n#include <stdexcept>\n\n// BAD: Using exceptions for normal control flow\nvoid loginWithException(const std::string& username) {\n    if (username == "") {\n        throw std::invalid_argument("Username empty"); // Expensive!\n    }\n}\n\n// GOOD: Using error codes/booleans for expected failures\nbool loginWithErrorCode(const std::string& username) {\n    if (username == "") {\n        return false; // Fast and expected.\n    }\n    return true;\n}\n\nint main() {\n    if (!loginWithErrorCode("")) {\n        std::cout << "Please enter a username.\\n";\n    }\n    return 0;\n}',
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
      'Next lesson: Namespaces and Header Files.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Exception"?',
      options: [
        'the act of intercepting an exception. It exists To stop the program from crashing, inspect the error, and execute recovery logic.',
        'the act of raising an exception. It exists To abort the current function immediately and begin searching up the call stack for a handler.',
        'a signal that a function has failed to achieve its documented purpose and cannot proceed. It exists To forcefully interrupt normal execution and transfer control to an error-handling block, rather than relying on the caller to manually check return codes.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Throw"?',
      options: [
        'the process of automatically destroying local variables as an exception propagates up the call stack. It exists To guarantee that destructors run and resources are safely released even when a function is abruptly terminated by an error.',
        'the act of intercepting an exception. It exists To stop the program from crashing, inspect the error, and execute recovery logic.',
        'the act of raising an exception. It exists To abort the current function immediately and begin searching up the call stack for a handler.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Stack Unwinding"?',
      options: [
        'the process of automatically destroying local variables as an exception propagates up the call stack. It exists To guarantee that destructors run and resources are safely released even when a function is abruptly terminated by an error.',
        'the act of raising an exception. It exists To abort the current function immediately and begin searching up the call stack for a handler.',
        'a signal that a function has failed to achieve its documented purpose and cannot proceed. It exists To forcefully interrupt normal execution and transfer control to an error-handling block, rather than relying on the caller to manually check return codes.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Catch"?',
      options: [
        'the act of raising an exception. It exists To abort the current function immediately and begin searching up the call stack for a handler.',
        'a signal that a function has failed to achieve its documented purpose and cannot proceed. It exists To forcefully interrupt normal execution and transfer control to an error-handling block, rather than relying on the caller to manually check return codes.',
        'the act of intercepting an exception. It exists To stop the program from crashing, inspect the error, and execute recovery logic.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Exception** — a signal that a function has failed to achieve its documented purpose and cannot proceed. It exists To forcefully interrupt normal execution and transfer control to an error-handling block, rather than relying on the caller to manually check return codes.',
    '**Throw** — the act of raising an exception. It exists To abort the current function immediately and begin searching up the call stack for a handler.',
    '**Catch** — the act of intercepting an exception. It exists To stop the program from crashing, inspect the error, and execute recovery logic.',
    '**Stack Unwinding** — the process of automatically destroying local variables as an exception propagates up the call stack. It exists To guarantee that destructors run and resources are safely released even when a function is abruptly terminated by an error.',
  ],

  checkpoints: ['read-intuition'],
}
