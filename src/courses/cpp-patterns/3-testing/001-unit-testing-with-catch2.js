// cpp-patterns — Lesson 8: Unit Testing with Catch2
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 08 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-08-unit-testing-with-catch2',
  slug: 'unit-testing-with-catch2',
  chapter: 3,
  order: 1,
  title: 'Unit Testing with Catch2',
  subtitle: 'Testing',
  tags: ['unit-testing', 'arrange-act-assert-aaa', 'test-driven-development-tdd', 'dependency-injection'],

  hook: {
    question: 'What is "Unit Testing with Catch2", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Integrating Catch2 with CMake FetchContent, TEST_CASE and Arrange-Act-Assert, SECTION for Test Reuse, REQUIRE vs CHECK, Dependency Injection for Testability.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Unit Testing:** verifying individual units of code (functions, classes) in isolation to ensure they behave correctly before they are combined into a larger system. Exists to catch logic errors early, locally, and reliably, rather than debugging the whole program.\n- **Arrange-Act-Assert (AAA):** a structured pattern for writing tests. You set up the inputs (Arrange), execute the behavior being tested (Act), and verify the outcome (Assert). Exists to keep tests readable and focused on one specific behavior.\n- **Test-Driven Development (TDD):** a feedback loop where you write a failing test first, write the minimum code to pass it, and then refactor. Exists to ensure test coverage is 100% and that the code\'s design is dictated by its usage.\n- **Dependency Injection:** passing external dependencies (like loggers, databases, or sensors) into a class rather than the class constructing them or pulling them from globals. Exists so that in a test environment, you can pass a fake or mock version of the dependency.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **FetchContent_Declare:** A CMake command to declare an external dependency.\n- **FetchContent_MakeAvailable:** A CMake command to populate and add a previously declared dependency.\n- **TEST_CASE:** A Catch2 macro defining a single, standalone test.\n- **REQUIRE:** A Catch2 assertion macro that evaluates an expression and aborts the current test if false.\n- **CHECK:** A Catch2 assertion macro that evaluates an expression and records a failure if false, but allows the test to continue.\n- **SECTION:** A Catch2 macro to define a sub-case within a TEST_CASE.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'In this lesson, we established a complete unit testing workflow. A `Calculator` requires testing. We used CMake\'s `FetchContent` to dynamically acquire Catch2. We defined a `TEST_CASE` containing `SECTION` blocks, ensuring that every arithmetic operation gets a fresh `Calculator` instance. We invoked the target methods (Act), and verified results using `REQUIRE` (for fatal guarantees) and `CHECK` (for independent properties). Finally, when the `Calculator` grew a dependency on a logger, we applied Dependency Injection to pass a `TestLogger` from the test suite, allowing us to capture and verify side-effects strictly in memory. **What breaks without this** If you remove the `REQUIRE` on `logger.messages.size() == 1` and the Calculator forgets to log, `logger.messages[0]` will access out-of-bounds memory, resulting in a segmentation fault that crashes the test runner completely without a helpful error message. `REQUIRE` acts as the safety gate. **Exercises** 1. Change `FetchContent_Declare` to use `GIT_TAG master`. Reconfigure CMake. Does it pull the latest code? Why is this dangerous for a production build? 2. Inside a `SECTION`, define another `SECTION`. Add a `printf` to trace when it runs. Catch2 supports arbitrary nesting. 3. Write a test that deliberately fails a `REQUIRE` on line 1 and a `CHECK` on line 2. Observe the console output. **Definition of Done** - [x] Catch2 is integrated via `FetchContent`. - [x] Test cases follow the Arrange-Act-Assert pattern. - [x] `SECTION`s are used to isolate state between sub-tests. - [x] `REQUIRE` and `CHECK` are used correctly based on assertion fatality. - [x] Globals are refactored into injected dependencies to allow mocking. - [x] `git commit -m "Add Catch2 unit testing framework and DI calculator tests to guarantee isolated feature verification"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 8: Unit Testing with Catch2',
        caption: 'Unit Testing with Catch2',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Integrating Catch2 with CMake FetchContent',
              prose: [
                'Before we can write tests, we need a testing framework. C++ does not have a built-in standard testing library. Instead of manually downloading headers and source files for Catch2, we want our build system (CMake) to automatically fetch it so that anyone cloning our repository can just build it without manually resolving dependencies.',
                '## First, In Isolation',
                '```cpp\n// main.cpp (Throwaway)\n#include <catch2/catch_test_macros.hpp>\n\nTEST_CASE("Isolation proof") {\n    REQUIRE(1 == 1);\n}\n```',
                '## How the Code Works',
                '- `include(FetchContent)` — loads the `FetchContent` module, a standard CMake module. This must be explicitly included because it provides the macros we call next; it is not loaded by default.\n- `FetchContent_Declare(` — begins the definition of a dependency we want CMake to know about. It does not download anything yet.\n- `Catch2` — the internal name CMake will use to refer to this fetched content.\n- `GIT_REPOSITORY` — a keyword argument telling CMake the source is a Git repository.\n- `https://github.com/catchorg/Catch2.git` — the URL of the official Catch2 repository.\n- `GIT_TAG` — a keyword argument specifying which exact commit, branch, or tag to fetch.\n- `v3.4.0` — the specific stable release tag. Pinning to a specific tag is critical for reproducible builds; if we used `master`, the build could break unexpectedly when upstream changes.\n- `)` — closes the declaration.\n- `FetchContent_MakeAvailable(Catch2)` — instructs CMake to actually execute the fetch (if not already cached locally) and immediately call `add_subdirectory()` on the downloaded source. This exposes all of Catch2\'s exported targets to our build.\n- `add_executable(calculator_tests tests/calculator_tests.cpp)` — creates a new executable target named `calculator_tests` built from our soon-to-be-created test file.\n- `target_link_libraries(` — begins linking dependencies to our target.\n- `calculator_tests` — the target we are linking to.\n- `PRIVATE` — specifies that Catch2 is an implementation detail of `calculator_tests` and should not be propagated to anything that links against `calculator_tests` (though executables aren\'t linked against anyway).\n- `Catch2::Catch2WithMain` — the specific target exposed by Catch2. `Catch2::` is an alias namespace. `Catch2WithMain` is a convenience library that includes the Catch2 framework *and* a pre-written `main()` function that parses command-line arguments and runs the tests.',
                '**CS lens.** The concept of a build system dynamically resolving, downloading, and integrating third-party code at configuration time is called **Dependency Management**. Also recognized in: Node\'s `npm`, Rust\'s `cargo`, Python\'s `pip`, Java\'s `Maven`.',
                '**SE lens.** The principle here is **Reproducible Builds**. The alternative not chosen is downloading the Catch2 header manually and committing it to our source control repository (the "vendoring" approach). While vendoring guarantees the file is always present without internet access, it bloats the repository and makes updating to newer versions a manual, error-prone chore. `FetchContent` trades a one-time network fetch for an automated, declarative, and easily updatable dependency graph. The maintenance cost is minimal, provided the upstream repository (GitHub) and the pinned tag remain available.'
              ],
              typeIt: true,
              solution: 'include(FetchContent)\n\nFetchContent_Declare(\n  Catch2\n  GIT_REPOSITORY https://github.com/catchorg/Catch2.git\n  GIT_TAG        v3.4.0\n)\nFetchContent_MakeAvailable(Catch2)\n\nadd_executable(calculator_tests tests/calculator_tests.cpp)\ntarget_link_libraries(calculator_tests PRIVATE Catch2::Catch2WithMain)',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'TEST_CASE and Arrange-Act-Assert',
              prose: [
                'We need to test a `Calculator::add(int, int)` function. We could write a `main()` function with `if (add(2, 2) != 4) std::cerr << "Fail!";`, but as tests grow, managing the execution, reporting failures, and isolating crashes manually becomes an untameable mess. We need a structured way to define a test scenario.',
                '## First, In Isolation',
                '```cpp\n// throwaway_test.cpp\n#include <catch2/catch_test_macros.hpp>\n#include <string>\n\nTEST_CASE("String concatenation", "[strings]") {\n    // Arrange\n    std::string a = "Hello";\n    std::string b = " World";\n    \n    // Act\n    std::string result = a + b;\n    \n    // Assert\n    REQUIRE(result == "Hello World");\n}\n```',
                '## How the Code Works',
                '- `#include <catch2/catch_test_macros.hpp>` — includes the Catch2 header providing the `TEST_CASE` and `REQUIRE` macros.\n- `#include "../src/calculator.hpp"` — includes our production code header so we can instantiate the class being tested.\n- `TEST_CASE(` — a macro that expands to a statically-registered function. Catch2 uses complex C++ initialization mechanics behind the scenes so that simply defining this block registers it globally before `main()` starts.\n- `"Calculator adds two integers"` — a free-form string describing what the test proves. This is printed if the test fails.\n- `,` — separates the description from the tags.\n- `"[calculator]"` — an optional tag string. Tags are enclosed in brackets. When running the test executable from the command line, you can filter which tests run by specifying tags (e.g., `./calculator_tests [calculator]`).\n- `) {` — closes the macro arguments and opens the test body block.\n- `Calculator calc;` — this is the **Arrange** phase. We instantiate the object under test and set up any necessary preconditions.\n- `int result = calc.add(5, 7);` — this is the **Act** phase. We invoke the specific behavior we are testing and capture its output. We do not mix this with assertions.\n- `REQUIRE(` — a Catch2 macro that evaluates its argument. If the argument evaluates to `false`, the test is immediately halted, marked as failed, and the runner proceeds to the next `TEST_CASE`.\n- `result == 12` — the boolean expression being evaluated. This is the **Assert** phase. Catch2 decomposes this expression so that if it fails, it can print the actual value of `result` alongside the expected `12`.\n- `);` — closes the assertion.\n- `}` — closes the test block.',
                '**CS lens.** The structural pattern employed here is **Arrange-Act-Assert (AAA)**. Also recognized in: database transaction testing (setup schema, run query, verify rows), integration testing (start server, send HTTP request, verify 200 OK), hardware testing (apply voltage, flip relay, measure output).',
                '**SE lens.** The principle here is **Separation of Concerns within Tests**. The alternative not chosen is writing code like `REQUIRE(calc.add(5, 7) == 12);` directly inline. While shorter, combining the Act and Assert phases makes the code harder to read, harder to step through in a debugger, and obscures what the test is actually doing when the setup grows complex. AAA creates a predictable rhythm: what do we have, what do we do, what do we expect. The maintenance cost of AAA is slightly more vertical space, but it pays off instantly when a test fails and the boundaries of the failure are clear.'
              ],
              typeIt: true,
              solution: '#include <catch2/catch_test_macros.hpp>\n#include "../src/calculator.hpp"\n\nTEST_CASE("Calculator adds two integers", "[calculator]") {\n    Calculator calc;\n    \n    int result = calc.add(5, 7);\n    \n    REQUIRE(result == 12);\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'SECTION for Test Reuse',
              prose: [
                'If we want to test multiple operations on a single `Calculator` instance (like add, subtract, multiply), creating a new `TEST_CASE` for each one duplicates the `Calculator calc;` setup. But if we put multiple assertions in one `TEST_CASE`, state might leak: if `calc` had internal state (like a memory registry), the second operation might be affected by the first. We need a way to share setup code while guaranteeing a fresh environment for each check.',
                '## First, In Isolation',
                '```cpp\n// throwaway_section.cpp\n#include <catch2/catch_test_macros.hpp>\n#include <vector>\n\nTEST_CASE("Section execution proof", "[sections]") {\n    std::vector<int> v;\n    v.push_back(1);\n    \n    SECTION("Appending 2") {\n        v.push_back(2);\n        REQUIRE(v.size() == 2);\n    }\n    \n    SECTION("Appending 3") {\n        v.push_back(3);\n        REQUIRE(v.size() == 2);\n        REQUIRE(v.back() == 3);\n    }\n}\n```',
                '## How the Code Works',
                '- `TEST_CASE("Calculator arithmetic operations", "[calculator]") {` — defines the parent test block.\n- `Calculator calc;` — the shared Arrange phase. This line will execute anew for every section encountered below.\n- `SECTION(` — a macro defining a leaf node in the test execution tree.\n- `"Addition computes correct sum"` — the description. If this section fails, Catch2 prints both the `TEST_CASE` description and the `SECTION` description.\n- `) {` — opens the section block.\n- `REQUIRE(calc.add(5, 7) == 12);` — the assertion (with inline act).\n- `}` — closes the first section.\n- `SECTION("Subtraction computes correct difference") {` — defines the second section. Catch2 internally tracks which sections it has already visited so it knows to skip the first and enter this one on its second pass through the parent block.\n- `REQUIRE(calc.subtract(10, 4) == 6);` — the assertion for the second section.\n- `}` — closes the second section.',
                '**CS lens.** The execution model here is a **Tree Traversal of Execution Paths**. Also recognized in: depth-first search algorithms, backtracking parsing, fork-based process testing, speculative execution in CPUs.',
                '**SE lens.** The principle here is **Test Isolation via Fixtures**. The alternative not chosen is using traditional object-oriented `setUp()` and `tearDown()` methods found in xUnit frameworks (like JUnit or GoogleTest). While OOP fixtures work, they force you to split your setup away from your test body, often requiring class member variables that pollute the namespace. Catch2\'s `SECTION` approach leverages lexical scoping: setup code is just standard C++ code written physically above the test, local variables are automatically destroyed when the scope exits, and isolation is guaranteed by the framework re-running the scope. The maintenance cost is minimal, though deep nesting of sections can make the "what executes when" trace confusing.'
              ],
              typeIt: true,
              solution: 'TEST_CASE("Calculator arithmetic operations", "[calculator]") {\n    Calculator calc;\n    \n    SECTION("Addition computes correct sum") {\n        REQUIRE(calc.add(5, 7) == 12);\n    }\n    \n    SECTION("Subtraction computes correct difference") {\n        REQUIRE(calc.subtract(10, 4) == 6);\n    }\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'REQUIRE vs CHECK',
              prose: [
                'If a single section contains multiple assertions verifying different properties of a result, and the first assertion fails using `REQUIRE`, the test immediately halts. You won\'t know if the remaining assertions would have passed or failed until you fix the first one and re-run. Sometimes we want to see a full report of all failures at once.',
                '## First, In Isolation',
                '```cpp\n// throwaway_check.cpp\n#include <catch2/catch_test_macros.hpp>\n\nTEST_CASE("Check vs Require", "[assertions]") {\n    int val = 5;\n    \n    CHECK(val == 10);\n    CHECK(val == 20);\n    \n    REQUIRE(val == 30);\n    CHECK(val == 40); // Will this run?\n}\n```',
                '## How the Code Works',
                '- `SECTION("Division computes quotient and remainder") {` — opens the new isolated block.\n- `auto [quotient, remainder] = ` — structured binding (already taught in C++ From Scratch) to unpack the `std::pair` or struct returned by division.\n- `calc.divide(10, 3);` — the Act phase.\n- `CHECK(` — a Catch2 macro that evaluates its argument, records a failure if false, but allows execution to proceed to the next statement.\n- `quotient == 3);` — the first independent assertion.\n- `CHECK(remainder == 1);` — the second independent assertion. If the quotient check failed, this line still runs.\n- `}` — closes the section.',
                '**CS lens.** The distinction between `REQUIRE` and `CHECK` embodies the concept of **Fatal vs. Non-Fatal Assertions**. Also recognized in: compiler diagnostics (fatal error vs. warning), test frameworks (GoogleTest\'s `ASSERT_EQ` vs `EXPECT_EQ`), error handling strategies (panic vs. recoverable error).',
                '**SE lens.** The principle here is **Maximizing Developer Feedback**. The alternative not chosen is using `REQUIRE` everywhere. If division was broken entirely, a `REQUIRE` on the quotient would stop execution, and the developer wouldn\'t know the remainder was also broken until they fixed the quotient, recompiled, and re-ran. Using `CHECK` for parallel, non-dependent properties provides a complete diagnostic picture in one pass. However, `REQUIRE` is still mandatory when subsequent code relies on the assertion — for instance, `REQUIRE(ptr != nullptr); CHECK(ptr->value == 5);`. If you used `CHECK` for the null pointer, the program would segfault on the next line, crashing the test runner instead of reporting a clean failure.'
              ],
              typeIt: true,
              solution: '    SECTION("Division computes quotient and remainder") {\n        auto [quotient, remainder] = calc.divide(10, 3);\n        \n        CHECK(quotient == 3);\n        CHECK(remainder == 1);\n    }',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'Dependency Injection for Testability',
              prose: [
                'Our `Calculator` has a new requirement: it must log every operation to a file. The developer implements this by opening a file inside `add()` and writing to it. Suddenly, our tests fail if the hardcoded file path is read-only, tests overwrite each other\'s logs when run in parallel, and the test suite leaves garbage `.txt` files on disk. The `Calculator` has a hidden, hard-to-test global dependency (the file system).',
                '## First, In Isolation',
                '```cpp\n// throwaway_di.cpp\n#include <iostream>\n#include <string>\n\n// Bad: Hardcoded dependency\nstruct GlobalLogger {\n    void log(const std::string& msg) { std::cout << "DISK WRITE: " << msg << "\\n"; }\n};\n\nvoid doWork_bad() {\n    GlobalLogger logger; // Cannot intercept or replace this\n    logger.log("Work done.");\n}\n\n// Good: Dependency Injection\nstruct ILogger {\n    virtual void log(const std::string& msg) = 0;\n    virtual ~ILogger() = default;\n};\n\nvoid doWork_good(ILogger& logger) {\n    logger.log("Work done.");\n}\n\nstruct FakeLogger : ILogger {\n    std::string last_msg;\n    void log(const std::string& msg) override { last_msg = msg; }\n};\n\nint main() {\n    FakeLogger test_logger;\n    doWork_good(test_logger);\n    std::cout << "Intercepted: " << test_logger.last_msg << "\\n";\n}\n```',
                '## How the Code Works',
                '- `struct TestLogger : public ILogger {` — declares a local, test-only class that inherits from the production interface `ILogger`. Defining it inside the `TEST_CASE` keeps it localized to where it is used.\n- `std::vector<std::string> messages;` — a container to store the arguments passed to `log`. This is our memory-backed "disk".\n- `void log(const std::string& msg) override {` — implements the pure virtual function required by `ILogger`.\n- `messages.push_back(msg);` — captures the intercepted string instead of printing it or writing it to a file.\n- `};` — closes the struct.\n- `TestLogger logger;` — instantiates our fake dependency. This is part of the Arrange phase.\n- `Calculator calc(logger);` — **Dependency Injection**. We pass the dependency into the object rather than letting the object construct a real file logger itself.\n- `REQUIRE(logger.messages.size() == 1);` — a new assertion verifying the side-effect (logging) actually occurred. We use `REQUIRE` because if the vector is empty, accessing index 0 on the next line will crash the test.\n- `CHECK(logger.messages[0] == "Added 5 and 7");` — a non-fatal check verifying the content of the log message.',
                '**CS lens.** The architectural principle here is **Inversion of Control (IoC)** via **Dependency Injection**. Also recognized in: UI event loops (registering a callback rather than polling), hardware interrupt vectors, web frameworks (Spring Boot injecting database repositories).',
                '**SE lens.** The principle here is **Designing for Testability**. The alternative not chosen is patching or mocking global state (e.g., redirecting `std::cout` or using a macro to redefine a class). While patching works in dynamic languages like Python, C++ is statically linked, making globals extremely hostile to testing. Hardcoded dependencies make code rigid; if `Calculator` news up a `FileLogger`, it can never be used in a context without a filesystem (like embedded hardware or a fast unit test). Dependency injection shifts the responsibility of *choosing* the dependency up the call stack, ensuring the unit itself remains isolated, purely functional, and entirely testable. The maintenance cost is slightly more boilerplate (interfaces and constructors), but the payoff is absolute decoupling. ---'
              ],
              typeIt: true,
              solution: '    struct TestLogger : public ILogger {\n        std::vector<std::string> messages;\n        void log(const std::string& msg) override {\n            messages.push_back(msg);\n        }\n    };\n    \n    TestLogger logger;\n    Calculator calc(logger);',
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
      'Next lesson: Testing Templates and Edge Cases.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Unit Testing"?',
      options: [
        'verifying individual units of code (functions, classes) in isolation to ensure they behave correctly before they are combined into a larger system. Exists to catch logic errors early, locally, and reliably, rather than debugging the whole program.',
        'a structured pattern for writing tests. You set up the inputs (Arrange), execute the behavior being tested (Act), and verify the outcome (Assert). Exists to keep tests readable and focused on one specific behavior.',
        'passing external dependencies (like loggers, databases, or sensors) into a class rather than the class constructing them or pulling them from globals. Exists so that in a test environment, you can pass a fake or mock version of the dependency.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Dependency Injection"?',
      options: [
        'a feedback loop where you write a failing test first, write the minimum code to pass it, and then refactor. Exists to ensure test coverage is 100% and that the code\'s design is dictated by its usage.',
        'a structured pattern for writing tests. You set up the inputs (Arrange), execute the behavior being tested (Act), and verify the outcome (Assert). Exists to keep tests readable and focused on one specific behavior.',
        'passing external dependencies (like loggers, databases, or sensors) into a class rather than the class constructing them or pulling them from globals. Exists so that in a test environment, you can pass a fake or mock version of the dependency.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Test-Driven Development (TDD)"?',
      options: [
        'verifying individual units of code (functions, classes) in isolation to ensure they behave correctly before they are combined into a larger system. Exists to catch logic errors early, locally, and reliably, rather than debugging the whole program.',
        'a structured pattern for writing tests. You set up the inputs (Arrange), execute the behavior being tested (Act), and verify the outcome (Assert). Exists to keep tests readable and focused on one specific behavior.',
        'a feedback loop where you write a failing test first, write the minimum code to pass it, and then refactor. Exists to ensure test coverage is 100% and that the code\'s design is dictated by its usage.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Arrange-Act-Assert (AAA)"?',
      options: [
        'verifying individual units of code (functions, classes) in isolation to ensure they behave correctly before they are combined into a larger system. Exists to catch logic errors early, locally, and reliably, rather than debugging the whole program.',
        'a structured pattern for writing tests. You set up the inputs (Arrange), execute the behavior being tested (Act), and verify the outcome (Assert). Exists to keep tests readable and focused on one specific behavior.',
        'passing external dependencies (like loggers, databases, or sensors) into a class rather than the class constructing them or pulling them from globals. Exists so that in a test environment, you can pass a fake or mock version of the dependency.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Unit Testing** — verifying individual units of code (functions, classes) in isolation to ensure they behave correctly before they are combined into a larger system. Exists to catch logic errors early, locally, and reliably, rather than debugging the whole program.',
    '**Arrange-Act-Assert (AAA)** — a structured pattern for writing tests. You set up the inputs (Arrange), execute the behavior being tested (Act), and verify the outcome (Assert). Exists to keep tests readable and focused on one specific behavior.',
    '**Test-Driven Development (TDD)** — a feedback loop where you write a failing test first, write the minimum code to pass it, and then refactor. Exists to ensure test coverage is 100% and that the code\'s design is dictated by its usage.',
    '**Dependency Injection** — passing external dependencies (like loggers, databases, or sensors) into a class rather than the class constructing them or pulling them from globals. Exists so that in a test environment, you can pass a fake or mock version of the dependency.',
  ],

  checkpoints: ['read-intuition'],
}
