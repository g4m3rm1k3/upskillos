// cpp-patterns — Lesson 9: Testing Templates and Edge Cases
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 09 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-09-testing-templates-and-edge-cases',
  slug: 'testing-templates-and-edge-cases',
  chapter: 3,
  order: 2,
  title: 'Testing Templates and Edge Cases',
  subtitle: 'Testing',
  tags: ['template-instantiation', 'edge-case', 'behavioral-testing'],

  hook: {
    question: 'What is "Testing Templates and Edge Cases", and why does it matter?',
    realWorldContext: 'You will build a suite of test cases that validate a generic algorithm across multiple data types automatically. You will then write tests that intentionally target the empty state, the single-element state, and the maximum-capacity state of a container. Finally, you will refactor a fragile test into a robust one that verifies observable behavior rather than rigid internal steps, ensuring the test fails for the right reasons.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Testing Multiple Type Instantiations, Boundary Conditions, Behavioral vs Implementation Testing.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Template Instantiation:** The process by which the C++ compiler generates a concrete, typed function or class from a generic template blueprint. Because a template is merely a blueprint, it is only type-checked and compiled when instantiated; a generic function that works perfectly for int might fail to compile or behave incorrectly for a custom type that lacks a default constructor or operator==.\n- **Edge Case:** A scenario that occurs at the extreme operating boundaries of a function or data structure, such as an empty list, a list with exactly one element, or a mathematical operation that produces the maximum representable value. Bugs disproportionately cluster at boundaries, making them the most critical inputs to test.\n- **Behavioral Testing:** The principle of asserting against the public, observable outcomes of a unit of code rather than asserting against the specific internal steps it took to get there. Tests that check internal implementation details are fragile and will break when the code is optimized or refactored, resulting in false failures.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: '**Connect the pieces** To build bulletproof C++ utilities, testing must systematically cover the dimensions of type, scale, and contract. A generic sequence container might be built. You use `TEMPLATE_TEST_CASE` to prove it stores `int` and `std::string`. You write `SECTION` blocks to prove it doesn\'t crash when empty and handles the transition from size 0 to size 1 correctly. Finally, you write `REQUIRE` assertions against its public iterators and accessors, completely ignoring the internal memory allocations, ensuring that your test proves behavioral correctness. **What breaks without this** Delete the empty check from `get_max`: ```cpp template <typename T> T get_max(const std::vector<T>& vec) { // if (vec.empty()) throw std::invalid_argument("Empty vector"); T max_val = vec[0]; // CRASH // ... } ``` Running the boundary test now produces a failure: ``` terminate called after throwing an instance of \'Catch::TestFailureException\' ``` Without the test, this invalid memory access would ship to production. Restoring the check immediately turns the build green again. **Exercises** 1. Add `std::string` to the `TEMPLATE_TEST_CASE` for container reversal and observe if the syntax holds up. 2. Write a boundary test for an integer division function that asserts `REQUIRE_THROWS_AS` when dividing by zero. 3. Refactor `ProcessQueue` to use a `std::deque` internally and verify that the behavioral test still passes without modification. **Definition of done** - [x] A generic test file leverages `TEMPLATE_TEST_CASE` to validate logic across different types. - [x] A boundary test file isolates edge cases (empty, single) into separate `SECTION` blocks. - [x] A behavior test file asserts only against public interfaces, avoiding brittle internal state checks. - Commit message: `test: establish patterns for template testing, edge boundaries, and behavioral assertions`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 9: Testing Templates and Edge Cases',
        caption: 'Testing Templates and Edge Cases',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Testing Multiple Type Instantiations',
              prose: [
                'When you write a generic template function, it represents a family of functions, not just one. Testing it with `int` proves only that the `int` instantiation works. If your algorithm relies on value semantics, it might fail compiling or executing for a move-only type, a type with no default constructor, or a custom class with a specific `operator<`. Writing identical test cases for every expected type by hand is error-prone and violates the DRY (Don\'t Repeat Yourself) principle.',
                '## First, In Isolation',
                '```cpp\n#define CATCH_CONFIG_MAIN\n#include <catch2/catch.hpp>\n#include <string>\n\n// A throwaway template function\ntemplate <typename T>\nT get_default() {\n    return T{};\n}\n\nTEMPLATE_TEST_CASE("Default construction works", "[isolation]", int, double, std::string) {\n    TestType val = get_default<TestType>();\n    \n    // int/double default to 0, string defaults to ""\n    REQUIRE(val == TestType{}); \n}\n```',
                '## How the Code Works',
                '- `TEMPLATE_TEST_CASE` — A macro provided by Catch2. It registers a test case with the test runner, exactly like the standard `TEST_CASE` macro, but accepts a list of types to iterate over.\n- `"Container reversal maintains elements"` — The string name of the test, used for reporting and filtering.\n- `"[generic]"` — The tag string. Tags allow you to run specific subsets of your test suite.\n- `int, char` — The variadic list of types. Catch2 will execute the block that follows exactly twice.\n- `std::vector<TestType> vec;` — `TestType` is a type alias injected by the macro. On the first run, this declares a `std::vector<int>`. On the second run, it declares a `std::vector<char>`.\n- `vec.push_back(TestType{1});` — Uniform initialization using the injected type alias. This forces the literal `1` to be constructed as the appropriate type (an integer `1` or the character with ASCII value 1).\n- `vec.push_back(TestType{2});` — Appends the second element.\n- `reverse_container(vec);` — Calls the template function. Template argument deduction automatically resolves `T` to the current `TestType`.\n- `REQUIRE(vec.front() == TestType{2});` — Checks the first element. The macro aborts the test run for the current type if this evaluates to false.\n- `REQUIRE(vec.back() == TestType{1});` — Checks the last element.',
                '**CS lens.** Testing generic code fundamentally requires exploring the type space. In type theory, parametric polymorphism (templates) asserts that the algorithm is indifferent to the type. However, real-world systems are constrained by concrete type behaviors—specifically, whether a type satisfies the implicit concepts (like `CopyConstructible` or `EqualityComparable`) the algorithm assumes. `TEMPLATE_TEST_CASE` bridges this gap by statically compiling the test logic against a representative sample of type bounds. Also recognized in: fuzzing engines mutating types, generic constraints in languages like Rust and C#, type-parameterized tests in JUnit.',
                '**SE lens.** Engineering robustness requires proving that a shared utility will not break when a colleague uses it with an unforeseen type next week. The tradeoff chosen here is explicit enumeration: we manually list the types to test (`int`, `char`). We did not choose exhaustive reflection, because C++ lacks native reflection to automatically discover all available types. The maintenance cost of this approach is low, but the risk remains that we forget to test a hostile type (like a move-only `std::unique_ptr`), leaving hidden compilation or runtime failures for future developers.'
              ],
              typeIt: true,
              solution: '#define CATCH_CONFIG_MAIN\n#include <catch2/catch.hpp>\n#include <vector>\n#include <algorithm>\n\ntemplate <typename T>\nvoid reverse_container(std::vector<T>& vec) {\n    std::reverse(vec.begin(), vec.end());\n}\n\nTEMPLATE_TEST_CASE("Container reversal maintains elements", "[generic]", int, char) {\n    std::vector<TestType> vec;\n    vec.push_back(TestType{1});\n    vec.push_back(TestType{2});\n\n    reverse_container(vec);\n\n    REQUIRE(vec.front() == TestType{2});\n    REQUIRE(vec.back() == TestType{1});\n}',
              expectedOutput: '===============================================================================\nAll tests passed (4 assertions in 2 test cases)',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Boundary Conditions',
              prose: [
                'Algorithms rarely fail on the "happy path" (e.g., a list of five normal elements). They fail at boundaries: when the container is empty, when it contains exactly one element, or when values reach mathematical extremes. If you only test generic data sets, you leave the most likely failure points completely unchecked.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <vector>\n\nvoid process_first(const std::vector<int>& v) {\n    if (v.empty()) {\n        std::cout << "Boundary handled: Empty\\n";\n        return;\n    }\n    std::cout << v.front() << "\\n";\n}\n\nint main() {\n    std::vector<int> empty_vec;\n    process_first(empty_vec);\n}\n```',
                '## How the Code Works',
                '- `TEST_CASE` — The standard Catch2 macro that registers a test block with the test runner.\n- `"get_max boundary conditions"` — The human-readable string name of the test suite.\n- `"[boundaries]"` — The tag string used for optional test filtering.\n- `SECTION("Empty container throws")` — A Catch2 macro that isolates setup state. If a test case has multiple sections, Catch2 executes the entire `TEST_CASE` block from the top down for each `SECTION`, running exactly one section per pass. This prevents state contamination between tests.\n- `std::vector<int> empty_vec;` — Declares a strictly empty vector, the mathematical floor of the container size boundary.\n- `REQUIRE_THROWS_AS` — A Catch2 macro that evaluates an expression and expects it to throw an exception of a specific type.\n- `get_max(empty_vec)` — The expression under test. If this returns normally without throwing, the macro will fail the test.\n- `std::invalid_argument` — The specific exception type we expect. If a different exception is thrown, the macro will catch it and fail the test, noting the type mismatch.\n- `SECTION("Single element container")` — The second boundary condition block. Catch2 re-runs the `TEST_CASE` from the beginning, skips the first section, and enters this one.\n- `std::vector<int> single_vec = {42};` — Initializes a vector with exactly one element. This tests the boundary where the loop body executes exactly once (or in some iterative algorithms, not at all, leaving the initial state).\n- `REQUIRE(get_max(single_vec) == 42);` — Asserts that the single element is inherently the maximum value.',
                '**CS lens.** Testing boundary conditions is an application of equivalence partitioning. In software testing, inputs are grouped into equivalence classes where the system is expected to behave identically. You test one representative value from the center of the class, and then you explicitly test the values on the borders between classes (the boundaries) because off-by-one errors and unchecked invariants mathematically cluster at transitions. Also recognized in: binary search implementations, graphical clipping windows, memory allocator bucket sizing.',
                '**SE lens.** Engineering tests around boundary conditions directly mitigates catastrophic failures. The alternative chosen by junior developers is to test only representative "happy" data. The failure cost of the alternative is severe: an algorithm works beautifully during development but immediately segfaults in production when a database query returns zero rows, or corrupts data when an integer wraps around. Explicit boundary tests encode the system\'s absolute limits into the repository, preventing future refactorings from accidentally removing necessary safety checks.'
              ],
              typeIt: true,
              solution: '#define CATCH_CONFIG_MAIN\n#include <catch2/catch.hpp>\n#include <vector>\n#include <stdexcept>\n\ntemplate <typename T>\nT get_max(const std::vector<T>& vec) {\n    if (vec.empty()) throw std::invalid_argument("Empty vector");\n    T max_val = vec[0];\n    for (const auto& val : vec) {\n        if (val > max_val) max_val = val;\n    }\n    return max_val;\n}\n\nTEST_CASE("get_max boundary conditions", "[boundaries]") {\n    SECTION("Empty container throws") {\n        std::vector<int> empty_vec;\n        REQUIRE_THROWS_AS(get_max(empty_vec), std::invalid_argument);\n    }\n\n    SECTION("Single element container") {\n        std::vector<int> single_vec = {42};\n        REQUIRE(get_max(single_vec) == 42);\n    }\n}',
              expectedOutput: '===============================================================================\nAll tests passed (2 assertions in 1 test case)',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Behavioral vs Implementation Testing',
              prose: [
                'A test fails for the wrong reason (a false positive failure) when you refactor the internal logic of a function without changing its external output, yet the test turns red anyway. This happens when a test asserts against internal state, private helper calls, or exact algorithmic steps. Fragile tests train developers to ignore test failures or delete the tests altogether.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <vector>\n\n// Version 1: explicit loop\nstd::vector<int> double_values(const std::vector<int>& v) {\n    std::vector<int> res;\n    for(int x : v) res.push_back(x * 2);\n    return res;\n}\n\nint main() {\n    std::vector<int> in = {1, 2, 3};\n    std::vector<int> out = double_values(in);\n    \n    // A brittle test might check that capacity is exactly 3 (from push_back)\n    // If the function is refactored to use res.reserve(v.size()) first,\n    // the capacity check might still pass, but if refactored to return a \n    // std::vector initialized with iterators, capacity might differ.\n    // Asserting behavioral contract (the values) is safe:\n    if (out[0] == 2 && out[1] == 4 && out[2] == 6) {\n        std::cout << "Behavior is correct.\\n";\n    }\n}\n```',
                '## How the Code Works',
                '- `ProcessQueue q;` — Instantiates the object under test.\n- `q.enqueue(10);` — Interacts with the object strictly through its public interface.\n- `q.enqueue(20);` — Pushes a second item to establish sequence.\n- `REQUIRE(q.dequeue() == 10);` — The core behavioral assertion. It does not check if `items.size()` is 1. It does not check if `items[0]` is 20. It calls a public method and verifies the observable output.\n- `REQUIRE(q.dequeue() == 20);` — Verifies the subsequent observable output.\n- `REQUIRE(q.is_empty() == true);` — Verifies the final observable state.\nBecause this test relies zero percent on the internal `std::vector`, a developer can rewrite `ProcessQueue` tomorrow to use a `std::deque` or a circular buffer array. The test will not need to be touched. If it passes, the refactor is correct. If it fails, the refactor broke the contract.',
                '**CS lens.** Behavioral testing mirrors the concept of an Abstract Data Type (ADT). An ADT is defined strictly by its behavior and operations (e.g., a Queue is defined by enqueue and dequeue), entirely divorced from its concrete implementation (linked list vs. array). When tests respect the ADT boundary, they mathematically verify the contract rather than the underlying machinery. Also recognized in: interface segregation, black-box testing, REST API contract validation.',
                '**SE lens.** Engineering a test suite requires optimizing for low maintenance cost and high signal-to-noise ratio. The alternative—white-box testing where test code accesses private fields or mocks internal functions—couples the test directly to the implementation. When implementation changes, the white-box test breaks, creating a false negative. The maintenance cost of updating hundreds of brittle tests for every refactor causes teams to abandon testing. Behavioral testing guarantees that a red build actually means broken software.'
              ],
              typeIt: true,
              solution: '#define CATCH_CONFIG_MAIN\n#include <catch2/catch.hpp>\n#include <vector>\n\nclass ProcessQueue {\n    std::vector<int> items;\npublic:\n    void enqueue(int val) { items.push_back(val); }\n    int dequeue() {\n        int val = items.front();\n        items.erase(items.begin());\n        return val;\n    }\n    bool is_empty() const { return items.empty(); }\n};\n\nTEST_CASE("ProcessQueue maintains FIFO order", "[behavior]") {\n    ProcessQueue q;\n    q.enqueue(10);\n    q.enqueue(20);\n\n    REQUIRE(q.dequeue() == 10);\n    REQUIRE(q.dequeue() == 20);\n    REQUIRE(q.is_empty() == true);\n}',
              expectedOutput: '===============================================================================\nAll tests passed (3 assertions in 1 test case)',
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
      'Next lesson: Mocking and Test Doubles.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Behavioral Testing"?',
      options: [
        'The principle of asserting against the public, observable outcomes of a unit of code rather than asserting against the specific internal steps it took to get there. Tests that check internal implementation details are fragile and will break when the code is optimized or refactored, resulting in false failures.',
        'A scenario that occurs at the extreme operating boundaries of a function or data structure, such as an empty list, a list with exactly one element, or a mathematical operation that produces the maximum representable value. Bugs disproportionately cluster at boundaries, making them the most critical inputs to test.',
        'The process by which the C++ compiler generates a concrete, typed function or class from a generic template blueprint. Because a template is merely a blueprint, it is only type-checked and compiled when instantiated; a generic function that works perfectly for int might fail to compile or behave incorrectly for a custom type that lacks a default constructor or operator==.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Template Instantiation"?',
      options: [
        'A scenario that occurs at the extreme operating boundaries of a function or data structure, such as an empty list, a list with exactly one element, or a mathematical operation that produces the maximum representable value. Bugs disproportionately cluster at boundaries, making them the most critical inputs to test.',
        'The process by which the C++ compiler generates a concrete, typed function or class from a generic template blueprint. Because a template is merely a blueprint, it is only type-checked and compiled when instantiated; a generic function that works perfectly for int might fail to compile or behave incorrectly for a custom type that lacks a default constructor or operator==.',
        'The principle of asserting against the public, observable outcomes of a unit of code rather than asserting against the specific internal steps it took to get there. Tests that check internal implementation details are fragile and will break when the code is optimized or refactored, resulting in false failures.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Edge Case"?',
      options: [
        'The process by which the C++ compiler generates a concrete, typed function or class from a generic template blueprint. Because a template is merely a blueprint, it is only type-checked and compiled when instantiated; a generic function that works perfectly for int might fail to compile or behave incorrectly for a custom type that lacks a default constructor or operator==.',
        'The principle of asserting against the public, observable outcomes of a unit of code rather than asserting against the specific internal steps it took to get there. Tests that check internal implementation details are fragile and will break when the code is optimized or refactored, resulting in false failures.',
        'A scenario that occurs at the extreme operating boundaries of a function or data structure, such as an empty list, a list with exactly one element, or a mathematical operation that produces the maximum representable value. Bugs disproportionately cluster at boundaries, making them the most critical inputs to test.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Template Instantiation** — The process by which the C++ compiler generates a concrete, typed function or class from a generic template blueprint. Because a template is merely a blueprint, it is only type-checked and compiled when instantiated; a generic function that works perfectly for int might fail to compile or behave incorrectly for a custom type that lacks a default constructor or operator==.',
    '**Edge Case** — A scenario that occurs at the extreme operating boundaries of a function or data structure, such as an empty list, a list with exactly one element, or a mathematical operation that produces the maximum representable value. Bugs disproportionately cluster at boundaries, making them the most critical inputs to test.',
    '**Behavioral Testing** — The principle of asserting against the public, observable outcomes of a unit of code rather than asserting against the specific internal steps it took to get there. Tests that check internal implementation details are fragile and will break when the code is optimized or refactored, resulting in false failures.',
  ],

  checkpoints: ['read-intuition'],
}
