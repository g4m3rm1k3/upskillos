// cpp-patterns — Lesson 10: Mocking and Test Doubles
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 10 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-10-mocking-and-test-doubles',
  slug: 'mocking-and-test-doubles',
  chapter: 3,
  order: 3,
  title: 'Mocking and Test Doubles',
  subtitle: 'Testing',
  tags: ['test-double', 'seam', 'dependency-injection', 'stub', 'fake', 'mock'],

  hook: {
    question: 'What is "Mocking and Test Doubles", and why does it matter?',
    realWorldContext: 'You will build a `UserProcessor` service that coordinates fetching data from a database and dispatching alerts to a notification system. Instead of wiring it to a real database and network, you will design the code with replaceable seams, injecting hand-rolled stubs, fakes, and mocks to test every execution path in absolute isolation without relying on heavy external infrastructure.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: The Seam Principle and std::function, Stubs, Fakes, Mocks.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Test Double:** an overarching term for any object or function used in place of a real dependency during testing. The term exists because distinguishing between the kinds of doubles (stubs, fakes, mocks) clarifies what a specific test is actually verifying.\n- **Seam:** a place in the codebase where the behavior can be altered without editing the source code in that location. Seams exist to decouple components so they can be isolated for testing or swapped out for different implementations.\n- **Dependency Injection:** the technique of passing dependencies (services, connections) into an object, rather than having the object construct them itself. This solves the problem of hardcoded coupling, making the object testable and reusable.\n- **Stub:** a test double that provides canned answers to calls made during the test. Stubs exist to provide indirect inputs to the system under test, ensuring predictable execution paths without complex logic.\n- **Fake:** a test double that actually has a working implementation, but takes a shortcut that makes it not suitable for production (like an in-memory database). Fakes exist when a test needs state to persist across multiple calls.\n- **Mock:** a test double pre-programmed with expectations which form a specification of the calls they are expected to receive. Mocks exist to verify indirect outputs — checking behavior and side-effects rather than state.\n- **Type Erasure:** a design pattern where an object\'s concrete type is hidden behind a generic interface, allowing different types to be used interchangeably. std::function uses type erasure to hold any callable object, which solves the problem of writing templated code or enforcing inheritance when you just need something you can invoke.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::function:** A general-purpose polymorphic function wrapper provided by the C++ Standard Library.\n- **REQUIRE:** The primary assertion macro from the Catch2 testing framework.\n- **std::string:** The standard C++ string class managing dynamically allocated character sequences.\n- **std::optional:** A standard library wrapper that represents an object that may or may not contain a value.\n- **std::unordered_map:** A hash table implementation from the standard library mapping keys to values.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'In an actual execution, the `UserProcessor` takes an ID, calls its functional seam to fetch the user, receives a stubbed response, formats it, and returns it. If registering, it passes data to a fake that stores it, then immediately invokes a mock that records the network payload — all happening instantaneously in process memory.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you delete `notificationSent = true;` inside the mock and rerun the test, Catch2 will loudly fail at `REQUIRE(notificationSent == true)`, proving the test accurately catches a failure to dispatch the alert.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [x] Code decoupled via `std::function` seams.\n- [x] Tests cover retrieval (stubs), persistence (fakes), and side effects (mocks).\n- Commit message: `test: implement stubs, fakes, and mocks for UserProcessor isolation`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 10: Mocking and Test Doubles',
        caption: 'Mocking and Test Doubles',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Seam Principle and std::function',
              prose: [
                'If a `UserProcessor` instantiates a `RealDatabase` object directly inside its own constructor, it is completely coupled. It cannot be unit tested without spinning up a real, active database connection. We need a seam — a boundary where we can slice away the real dependency and replace it from the outside.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <functional>\n#include <string>\n\n// Hardcoded (No Seam)\nvoid processHardcoded() {\n    std::string data = "Production Data"; // Imagine this connects to MySQL\n    std::cout << "Processing: " << data << "\\n";\n}\n\n// Seam via std::function\nvoid processWithSeam(std::function<std::string()> fetchData) {\n    std::cout << "Processing: " << fetchData() << "\\n";\n}\n\nint main() {\n    processHardcoded();\n    \n    // Injecting a test double\n    auto testDouble = []() -> std::string {\n        return "Test Data";\n    };\n    processWithSeam(testDouble);\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#pragma once`: A preprocessor directive ensuring the header is included only once per compilation unit.\n- `#include <string>`: Pulls in the standard string class.\n- `#include <functional>`: Pulls in the `std::function` wrapper template.\n- `#include <optional>`: Pulls in the standard optional type for nullable values.\n- `class UserProcessor {`: Defines the core service blueprint.\n- `public:`: Access modifier making the following members callable from outside the class.\n- `using FetchUserFn = std::function<std::optional<std::string>(int)>;`: A type alias defining the exact signature of our seam. **`std::function`** uses type erasure to store any callable (a standalone function, a lambda, or a functor) that takes an `int` and returns a `std::optional<std::string>`.\n- `explicit UserProcessor(FetchUserFn fetcher)`: The constructor taking the dependency. Marked `explicit` to prevent the compiler from performing accidental implicit conversions from a raw lambda into a `UserProcessor`.\n- `: fetcher_(std::move(fetcher)) {}`: The member initializer list. It initializes the member variable by moving the `std::function` argument, transferring ownership and avoiding a deep copy of any allocated state hiding inside the type-erased wrapper.\n- `std::string getGreeting(int userId) const {`: The business logic method we actually want to test. Marked `const` because it does not mutate the processor\'s state.\n- `auto user = fetcher_(userId);`: Invokes the seam. The processor does not know or care if this executes a heavyweight SQL query over the network or runs a lightweight test lambda.\n- `if (user) {`: Checks if the `std::optional` contains a value. This boolean conversion returns true if data was found.\n- `return "Hello, " + *user + "!";`: Dereferences the optional (`*user`) to extract the string, concatenates it, and returns it.\n- `return "Hello, Guest!";`: The fallback path if the database returned empty.\n- `private:`: Access modifier hiding the internal state.\n- `FetchUserFn fetcher_;`: The stored seam, ready to be called.',
                '**CS lens.** This structure embodies **Inversion of Control (IoC)**. Instead of the processor controlling the creation of its dependencies, control is inverted: the caller defines and injects the dependency. Also recognized in: plugin architectures, UI event callback registrations, hardware interrupt handler tables.',
                '**SE lens.** Why use `std::function` instead of the traditional C++ OOP approach of defining an interface like `class IDatabase { virtual std::optional<std::string> fetch(int) = 0; }`? Virtual base classes force the caller to write a whole new class inheritance tree, instantiate objects, and pass pointers or references, immediately raising complex questions about memory lifetime and ownership. `std::function` provides a lightweight, value-semantic seam. The tradeoff is a slight runtime overhead from type erasure and a potential small heap allocation inside the wrapper, but for non-hot-path dependencies like database or network calls, the ergonomic gain of using simple lambdas is massive.'
              ],
              typeIt: true,
              solution: '#pragma once\n#include <string>\n#include <functional>\n#include <optional>\n\nclass UserProcessor {\npublic:\n    using FetchUserFn = std::function<std::optional<std::string>(int)>;\n\n    explicit UserProcessor(FetchUserFn fetcher) \n        : fetcher_(std::move(fetcher)) {}\n\n    std::string getGreeting(int userId) const {\n        auto user = fetcher_(userId);\n        if (user) {\n            return "Hello, " + *user + "!";\n        }\n        return "Hello, Guest!";\n    }\n\nprivate:\n    FetchUserFn fetcher_;\n};',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Stubs',
              prose: [
                'We need to test `getGreeting(int userId)` for two specific logic branches: the case where a user is found, and the case where a user is not found. We absolutely do not want to set up, seed, and tear down a real database to do this. We need a way to provide canned answers.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <optional>\n#include <string>\n\nvoid runStubTest() {\n    // This is a stub: it ignores the input and returns a hardcoded answer.\n    auto stubFound = [](int /*id*/) -> std::optional<std::string> {\n        return "Alice";\n    };\n    \n    std::cout << "Stub returns: " << *stubFound(99) << "\\n";\n}\n\nint main() {\n    runStubTest();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <catch2/catch_test_macros.hpp>`: Pulls in the Catch2 testing macros.\n- `#include "../src/UserProcessor.hpp"`: Includes our service blueprint.\n- `TEST_CASE("UserProcessor greets known user", "[processor]") {`: The Catch2 macro defining an isolated test block with a description and a tag.\n- `auto stubFound = [](int) -> std::optional<std::string> {`: A **lambda expression** acting as a stub. It takes an integer parameter (which remains unnamed because the stub deliberately ignores it) and declares an explicit return type.\n- `return "Alice";`: The hardcoded canned answer. The string implicitly converts into the `std::optional`.\n- `};`: Closes the lambda.\n- `UserProcessor processor(stubFound);`: Instantiates the object under test, injecting the stub through the `std::function` seam.\n- `REQUIRE(processor.getGreeting(42) == "Hello, Alice!");`: The Catch2 **`REQUIRE`** macro asserts that the method processes the stub\'s data correctly, aborting the test if false. The integer ID `42` is irrelevant because the stub ignores it, proving this test is focused strictly on the processor\'s string formatting logic, not data retrieval.\n- `auto stubNotFound = [](int) -> std::optional<std::string> {`: The second stub, representing a database miss.\n- `return std::nullopt;`: Returns the standard library\'s empty optional constant.\n- `REQUIRE(processor.getGreeting(99) == "Hello, Guest!");`: Asserts that the processor correctly executes the fallback branch when the seam returns empty.',
                '**CS lens.** Stubs represent a forced reduction of a system\'s state space. By fixing an input variable to a constant, we eliminate environmental entropy and reduce the complexity of the test. Also recognized in: mathematical proofs (assuming a variable is constant to solve for another), mock servers returning static JSON payloads.',
                '**SE lens.** Stubs are the simplest form of test double. They are perfect for providing indirect inputs. The core tradeoff is that they possess no logic or memory; if your test requires the dependency to remember something across multiple sequential calls, a stub is instantly insufficient.'
              ],
              typeIt: true,
              solution: '#include <catch2/catch_test_macros.hpp>\n#include "../src/UserProcessor.hpp"\n\nTEST_CASE("UserProcessor greets known user", "[processor]") {\n    auto stubFound = [](int) -> std::optional<std::string> {\n        return "Alice";\n    };\n    \n    UserProcessor processor(stubFound);\n    REQUIRE(processor.getGreeting(42) == "Hello, Alice!");\n}\n\nTEST_CASE("UserProcessor greets unknown user", "[processor]") {\n    auto stubNotFound = [](int) -> std::optional<std::string> {\n        return std::nullopt;\n    };\n    \n    UserProcessor processor(stubNotFound);\n    REQUIRE(processor.getGreeting(99) == "Hello, Guest!");\n}',
              expectedOutput: '===============================================================================\nAll tests passed (2 assertions in 2 test cases)',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Fakes',
              prose: [
                'Suppose we expand our service to actively register users. A simple stub cannot simulate a database that saves a record on step 1 and retrieves that exact record on step 2. We need a test double that actually stores data dynamically.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <unordered_map>\n#include <string>\n#include <optional>\n\nvoid runFakeTest() {\n    std::unordered_map<int, std::string> fakeDb;\n    \n    // A fake closure that mutates and reads captured state\n    auto save = [&fakeDb](int id, const std::string& name) {\n        fakeDb[id] = name;\n    };\n    \n    auto fetch = [&fakeDb](int id) -> std::optional<std::string> {\n        if (fakeDb.count(id)) return fakeDb[id];\n        return std::nullopt;\n    };\n    \n    save(1, "Bob");\n    std::cout << "Fake fetch: " << *fetch(1) << "\\n";\n}\n\nint main() {\n    runFakeTest();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <unordered_map>`: Pulls in the standard hash map.\n- `TEST_CASE("UserProcessor saves and fetches using a Fake", "[processor]") {`: Begins the new test.\n- `std::unordered_map<int, std::string> memoryDb;`: The real state backing our test double. **`std::unordered_map`** is the standard library\'s hash table, providing O(1) average constant-time access.\n- `auto fakeFetch = [&memoryDb](int id) -> std::optional<std::string> {`: A lambda capturing the local `memoryDb` variable by reference (`&`). This is crucial: the read lambda must access the exact same map instance that the save lambda modifies.\n- `if (memoryDb.find(id) != memoryDb.end()) {`: Searches the map for the key. If the iterator returned does not equal the end iterator, the key exists.\n- `return memoryDb[id];`: Retrieves and returns the stored value.\n- `return std::nullopt;`: The fallback if the key is missing.\n- `auto fakeSave = [&memoryDb](int id, std::string name) {`: The second half of the fake. It mutates the captured map.\n- `memoryDb[id] = std::move(name);`: Stores the name in the map, moving it to avoid an unnecessary string copy.\n- `UserProcessor processor(fakeFetch, fakeSave);`: We inject both functional seams into the processor.\n- `processor.registerUser(10, "Charlie");`: Exercises the processor, which transparently invokes our `fakeSave` lambda.\n- `REQUIRE(processor.getGreeting(10) == "Hello, Charlie!");`: Exercises the read path, which transparently invokes `fakeFetch` and proves the state persisted across calls.',
                '**CS lens.** This is stateful simulation. We are simulating a high-latency, persistent state machine (a disk-backed database) with a low-latency, ephemeral state machine (a memory map) that implements the exact same behavioral contract. Also recognized in: hardware emulators, ramdisks, shadow DOMs.',
                '**SE lens.** Fakes are immensely powerful because they provide robust, working implementations that can survive complex multi-step tests. The tradeoff is maintenance cost: your fake database must mimic the real database\'s contract exactly. If the real production database throws a specific error on duplicate IDs, the fake must be manually coded to do the same, otherwise your tests will pass in environments where production fails.'
              ],
              typeIt: true,
              solution: '#include <unordered_map>\n\nTEST_CASE("UserProcessor saves and fetches using a Fake", "[processor]") {\n    std::unordered_map<int, std::string> memoryDb;\n\n    auto fakeFetch = [&memoryDb](int id) -> std::optional<std::string> {\n        if (memoryDb.find(id) != memoryDb.end()) {\n            return memoryDb[id];\n        }\n        return std::nullopt;\n    };\n\n    auto fakeSave = [&memoryDb](int id, std::string name) {\n        memoryDb[id] = std::move(name);\n    };\n\n    UserProcessor processor(fakeFetch, fakeSave);\n    \n    processor.registerUser(10, "Charlie");\n    REQUIRE(processor.getGreeting(10) == "Hello, Charlie!");\n}',
              expectedOutput: '===============================================================================\nAll tests passed (3 assertions in 3 test cases)',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Mocks',
              prose: [
                'Suppose `UserProcessor` must immediately send a welcome email when a user registers. Sending an email has no return value and alters no state in our application itself; the data vanishes across the network. We need a way to verify that the `sendEmail` function was actually called, and exactly what arguments were passed to it.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <string>\n#include <vector>\n\nvoid runMockTest() {\n    // We want to verify this was called with specific data\n    std::vector<std::string> calledWith;\n    \n    // This is a mock: it records interactions for later verification.\n    auto mockSend = [&calledWith](const std::string& msg) {\n        calledWith.push_back(msg);\n    };\n    \n    // System under test does something\n    mockSend("Welcome!");\n    \n    // Verification phase\n    std::cout << "Times called: " << calledWith.size() << "\\n";\n    std::cout << "First argument: " << calledWith[0] << "\\n";\n}\n\nint main() {\n    runMockTest();\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `bool notificationSent = false;`: A tracking variable.\n- `std::string sentMessage = "";`: A second tracking variable. Together, these hold the "memory" of the mock.\n- `auto mockNotify = [&](int id, const std::string& msg) {`: A lambda capturing the local tracking variables by reference via the `[&]` default capture clause. This lambda is the mock itself.\n- `notificationSent = true;`: The mock records the interaction.\n- `sentMessage = msg;`: The mock saves the passed argument. It does no real work, sends no network request; its only job is espionage.\n- `UserProcessor processor(`: Instantiates the object, passing three test doubles.\n- `[](int) -> std::optional<std::string> { return std::nullopt; },`: The fetch seam is provided a stub returning empty.\n- `[](int, std::string) {},`: The save seam is provided a **dummy**. A dummy is a test double passed only because the method signature strictly requires it, but the test fundamentally does not care about it. It does absolutely nothing.\n- `mockNotify`: The mock is injected into the notification seam.\n- `processor.registerUserAndNotify(20, "Dave");`: The method under test is invoked.\n- `REQUIRE(notificationSent == true);`: Behavior verification. We assert that the method was actually called, proving the side effect logically occurred.\n- `REQUIRE(sentMessage == "Welcome Dave");`: Argument verification. We assert the exact string data passed out of the system matches the specification.\n- `UserProcessor processor(...)` — builds the processor and stores the mock lambda, but nothing runs.\n- `processor.registerUserAndNotify(...)` — the method under test begins execution.\n- `mockNotify(20, "Welcome Dave")` — the processor internally calls our injected lambda.\n- `notificationSent = true` — the mock mutates the local tracking variable synchronously.\n- `REQUIRE(...)` — the test resumes control and verifies the side effect occurred.',
                '**CS lens.** This is the Actor model concept of message passing observation. We are deliberately instrumenting the communication channel between two boundaries to inspect telemetry. Also recognized in: network packet sniffers, wiretaps, debug loggers, middleware interceptors.',
                '**SE lens.** Mocks exist strictly for *behavior verification*, as opposed to *state verification* (which stubs and fakes use). The dangerous tradeoff of mocks is that they tightly couple your test to the intimate implementation details of your method. If you refactor the code to send notifications in a batch array instead of one by one, the mock test breaks instantly, even if the end user experience is identical. Over-mocking leads to fragile tests that break on every refactor. **When is a Mocking Library Justified?** Hand-rolling mocks with lambdas is fast, highly readable, and dependency-free. However, pulling in a heavyweight **Mocking Library** (like GoogleTest\'s gMock or Trompeloeil) is explicitly justified when: 1. You are forced to mock massive virtual interfaces, where manually writing boilerplate overrides for 20 unused methods is pure noise. 2. You need strict temporal call-order verification (e.g., asserting `open()` happens strictly before `read()`). 3. You need cardinality assertions (e.g., "called exactly 3 times"). In modern C++, `std::function` seams handle 80% of testing use cases with zero framework overhead. Reserve massive mocking frameworks for legacy codebases bound to deep OOP class hierarchies.'
              ],
              typeIt: true,
              solution: 'TEST_CASE("UserProcessor sends notification on registration", "[processor]") {\n    bool notificationSent = false;\n    std::string sentMessage = "";\n\n    auto mockNotify = [&](int id, const std::string& msg) {\n        notificationSent = true;\n        sentMessage = msg;\n    };\n\n    UserProcessor processor(\n        [](int) -> std::optional<std::string> { return std::nullopt; }, // Stub\n        [](int, std::string) {},                                        // Dummy\n        mockNotify                                                      // Mock\n    );\n\n    processor.registerUserAndNotify(20, "Dave");\n\n    REQUIRE(notificationSent == true);\n    REQUIRE(sentMessage == "Welcome Dave");\n}',
              expectedOutput: '===============================================================================\nAll tests passed (5 assertions in 4 test cases)',
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
      'Next lesson: std::expected and Error Codes.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Dependency Injection"?',
      options: [
        'a test double that actually has a working implementation, but takes a shortcut that makes it not suitable for production (like an in-memory database). Fakes exist when a test needs state to persist across multiple calls.',
        'a test double that provides canned answers to calls made during the test. Stubs exist to provide indirect inputs to the system under test, ensuring predictable execution paths without complex logic.',
        'the technique of passing dependencies (services, connections) into an object, rather than having the object construct them itself. This solves the problem of hardcoded coupling, making the object testable and reusable.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Mock"?',
      options: [
        'a test double pre-programmed with expectations which form a specification of the calls they are expected to receive. Mocks exist to verify indirect outputs — checking behavior and side-effects rather than state.',
        'a place in the codebase where the behavior can be altered without editing the source code in that location. Seams exist to decouple components so they can be isolated for testing or swapped out for different implementations.',
        'a test double that actually has a working implementation, but takes a shortcut that makes it not suitable for production (like an in-memory database). Fakes exist when a test needs state to persist across multiple calls.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Test Double"?',
      options: [
        'an overarching term for any object or function used in place of a real dependency during testing. The term exists because distinguishing between the kinds of doubles (stubs, fakes, mocks) clarifies what a specific test is actually verifying.',
        'a test double that actually has a working implementation, but takes a shortcut that makes it not suitable for production (like an in-memory database). Fakes exist when a test needs state to persist across multiple calls.',
        'the technique of passing dependencies (services, connections) into an object, rather than having the object construct them itself. This solves the problem of hardcoded coupling, making the object testable and reusable.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Fake"?',
      options: [
        'the technique of passing dependencies (services, connections) into an object, rather than having the object construct them itself. This solves the problem of hardcoded coupling, making the object testable and reusable.',
        'a place in the codebase where the behavior can be altered without editing the source code in that location. Seams exist to decouple components so they can be isolated for testing or swapped out for different implementations.',
        'a test double that actually has a working implementation, but takes a shortcut that makes it not suitable for production (like an in-memory database). Fakes exist when a test needs state to persist across multiple calls.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Test Double** — an overarching term for any object or function used in place of a real dependency during testing. The term exists because distinguishing between the kinds of doubles (stubs, fakes, mocks) clarifies what a specific test is actually verifying.',
    '**Seam** — a place in the codebase where the behavior can be altered without editing the source code in that location. Seams exist to decouple components so they can be isolated for testing or swapped out for different implementations.',
    '**Dependency Injection** — the technique of passing dependencies (services, connections) into an object, rather than having the object construct them itself. This solves the problem of hardcoded coupling, making the object testable and reusable.',
    '**Stub** — a test double that provides canned answers to calls made during the test. Stubs exist to provide indirect inputs to the system under test, ensuring predictable execution paths without complex logic.',
    '**Fake** — a test double that actually has a working implementation, but takes a shortcut that makes it not suitable for production (like an in-memory database). Fakes exist when a test needs state to persist across multiple calls.',
    '**Mock** — a test double pre-programmed with expectations which form a specification of the calls they are expected to receive. Mocks exist to verify indirect outputs — checking behavior and side-effects rather than state.',
    '**Type Erasure** — a design pattern where an object\'s concrete type is hidden behind a generic interface, allowing different types to be used interchangeably. std::function uses type erasure to hold any callable object, which solves the problem of writing templated code or enforcing inheritance when you just need something you can invoke.',
  ],

  checkpoints: ['read-intuition'],
}
