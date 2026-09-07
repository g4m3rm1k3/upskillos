// cpp-patterns — Lesson 11: std::expected and Error Codes
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 11 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-11-std-expected-and-error-codes',
  slug: 'std-expected-and-error-codes',
  chapter: 4,
  order: 1,
  title: 'std::expected and Error Codes',
  subtitle: 'Error Handling',
  tags: ['stack-unwinding', 'sum-type-tagged-union', 'monadic-interface', 'zero-overhead-principle'],

  hook: {
    question: 'What is "std::expected and Error Codes", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Returning Success or Failure by Value, Chaining Failable Operations (.and_then), Transforming and Recovering (.transform and .or_else).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Stack unwinding:** the process where the C++ runtime walks backward up the call stack, destroying local variables and searching for a matching catch block when an exception is thrown. It exists to guarantee resource cleanup (RAII) during an error, but costs significant execution time and prevents the compiler from optimizing control flow.\n- **Sum type (Tagged Union):** a data structure that holds exactly one of several distinct, strictly defined types at any given moment, accompanied by a tag indicating which type is currently active. It exists to represent mutually exclusive states (like "success" OR "error") in a single variable without dynamic allocation or unsafe casts.\n- **Monadic interface:** a design pattern providing standard methods (like .and_then or .transform) to chain operations on wrapper types. It exists to remove boilerplate: the wrapper internally checks if it holds a valid value before passing it to the next operation, halting the chain early if an error occurs.\n- **Zero-overhead principle:** the C++ design philosophy that you don\'t pay for what you don\'t use. Applied to error handling, it means reporting an error should not cost more execution time than returning a normal value, which value-based error reporting achieves by treating errors as ordinary data.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::expected:** A standard library sum type representing either a successful expected value or an unexpected error value.\n- **std::unexpected:** A utility type used to hold an error value meant to be stored in the error channel of a std::expected.\n- **std::expected::and_then:** A monadic binding method that takes a function returning another std::expected, and executes it only if the current object contains a success value.\n- **std::expected::transform:** A monadic mapping method that takes a function returning a raw value, executes it on the success value, and wraps the result in a new std::expected.\n- **std::expected::or_else:** A monadic recovery method that takes a function returning a std::expected, and executes it only if the current object contains an error.\n- **std::from_chars:** A low-level, high-performance parsing function from the &lt;charconv&gt; header that does not allocate memory and does not throw exceptions.\n- **std::from_chars_result:** The return type of std::from_chars, containing a pointer to the first unparsed character and an error code.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'The pipeline works because `std::expected` forces a dual-channel return type, and the monadic operations act as railway switches. A success value stays on the upper track, passing through `.and_then` and `.transform`. The moment an error occurs, the switch flips to the lower track, bypassing the success operations, until it hits `.or_else` which resolves it. **What breaks without this:** If you remove `.or_else` from the chain and change `pipeline_result.value()` back to simply printing `.value()` while passing `"XYZ"`, the code will compile, but crash at runtime. `std::expected::value()` throws a `std::bad_expected_access` exception if called on an error state. `std::expected` guarantees you handle your errors, either intrinsically via monadic chains or explicitly via `.has_value()`. **Exercises:** - Modify `divide_100_by` to return `std::unexpected("Number too large")` if the divisor is &gt; 100. Run the pipeline with `"200"` and verify `.or_else` intercepts it. - Replace `.or_else` with `.transform_error`, which alters the error message but leaves the pipeline in the error state, then use `if (!result.has_value())` to print it. **Definition of Done:** - [x] Create a parser that returns `std::expected`. - [x] Chain it to a division function using `.and_then`. - [x] Transform success values to strings and catch errors with `.or_else`. - [x] Commit: `feat: implement zero-overhead math pipeline with std::expected` because we must ensure exception-free operation for hard real-time requirements.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 11: std::expected and Error Codes',
        caption: 'std::expected and Error Codes',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Returning Success or Failure by Value',
              prose: [
                'When a function can fail, it needs a way to inform the caller. The traditional C++ approach is throwing an exception. However, exceptions have hidden control flow: a `throw` statement immediately aborts the current path and jumps up the call stack. This stack unwinding is computationally expensive. In high-performance, real-time, or deeply embedded systems, that overhead is unacceptable. We need a way to return either a valid result or an error directly, as ordinary data, so the compiler can optimize it exactly like a normal return value.',
                '## How the Code Works',
                '- `std::expected<int, std::string>` — the return type. It declares a sum type that holds *either* an `int` (the expected success type) *or* a `std::string` (the unexpected error type), but never both. It enforces an explicit error contract: the caller cannot ignore that this function might fail.\n- `parse_int(std::string_view str)` — the function signature taking a non-owning view of a string.\n- `int result = 0;` — a local integer initialized to zero to hold the successfully parsed value.\n- `auto [ptr, ec]` — a structured binding declaration that unpacks the two members of the `std::from_chars_result` struct.\n- `=` — the assignment operator.\n- `std::from_chars(...)` — a low-level, high-performance parsing function that reads characters and converts them to a number. It guarantees it will never throw an exception.\n- `str.data()` — a method call on the string view returning a pointer to the start of the character array.\n- `,` — the argument separator.\n- `str.data() + str.size()` — pointer arithmetic calculating the end of the character array, passed as the upper bound for parsing.\n- `,` — the argument separator.\n- `result` — the local integer passed by reference, which `from_chars` will populate if successful.\n- `if (ec == std::errc{})` — an equality check. `std::errc{}` constructs a default-initialized error code, which represents "no error". We are checking if the parsing succeeded.\n- `{ return result; }` — implicitly constructs a `std::expected` in its success state using the integer value.\n- `return` — the return keyword.\n- `std::unexpected("Parse failed: not an integer")` — explicitly constructs a utility wrapper holding the error string. Because `std::expected` can be implicitly constructed from an expected value *or* an unexpected wrapper, returning this tells the compiler to build the `std::expected` in its error state.',
                '**CS lens.** This pattern embodies the concept of a **Sum Type**, often called a Tagged Union or Result type. In type theory, a sum type `A | B` means a value can be exactly one of those types. This is fundamentally different from a Product type (like a `struct`), which holds `A` *and* `B` simultaneously. Also recognized in: Rust\'s `Result<T, E>`, Haskell\'s `Either a b`, Swift\'s `Result`, functional programming monads.',
                '**SE lens.** We engineered this with `std::expected` to achieve **Zero-Overhead Error Handling**. The alternative not chosen was `try`/`catch` with exceptions. Throwing an exception requires the compiler to emit side-tables for unwinding and requires the runtime to traverse the stack dynamically. By using `std::expected`, the error is just ordinary data returned in registers or on the stack. The CPU treats an error path with the exact same predictable performance cost as a success path. The maintenance trade-off is that callers must explicitly check the result; they cannot silently let an error bubble up the stack without explicitly returning it themselves.'
              ],
              typeIt: true,
              solution: '#include <expected>\n#include <string_view>\n#include <string>\n#include <charconv>\n\nstd::expected<int, std::string> parse_int(std::string_view str) {\n    int result = 0;\n    auto [ptr, ec] = std::from_chars(str.data(), str.data() + str.size(), result);\n    \n    if (ec == std::errc{}) {\n        return result;\n    }\n    \n    return std::unexpected("Parse failed: not an integer");\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Chaining Failable Operations (.and_then)',
              prose: [
                'If we want to parse an integer, and then divide 100 by that integer, both steps can fail (parsing can fail on bad text; division can fail on zero). If we manually check `.has_value()` after every step, we get nested `if` statements—often called the "pyramid of doom." We need a way to chain operations such that if step one fails, step two is automatically skipped and the error passes straight through to the end, without writing manual checks.',
                '## How the Code Works',
                '- `std::expected<int, std::string>` — the return type for our division function, explicitly stating it can fail and return an error string.\n- `divide_100_by(int divisor)` — the function signature. Notice it takes a plain `int`, not a `std::expected`. It assumes it is receiving a valid value.\n- `if (divisor == 0)` — a conditional check preventing division by zero, which causes hardware faults.\n- `{ return std::unexpected("Division by zero"); }` — constructs the expected object in the error state.\n- `return 100 / divisor;` — performs the division and implicitly constructs the success state.\n- `auto pipeline_result` — type deduction for the final `std::expected` object resulting from the chain.\n- `=` — the assignment operator.\n- `parse_int("0")` — invokes our parsing function, which will succeed and return the integer `0`.\n- `.and_then` — a method on `std::expected`. It inspects the current state of the expected object. If it contains an error, it returns that error immediately. If it contains a success value, it unpacks that value and passes it to the provided function.\n- `(divide_100_by)` — the function passed as an argument to `.and_then`. The extracted integer `0` is fed directly into `divisor`. Since `divide_100_by` returns a `std::expected`, the chain remains flat.\n- `parse_int("0")` — successfully parses the string and returns a `std::expected` holding the integer `0`.\n- `.and_then(...)` — sees the success state, extracts `0`, and calls `divide_100_by(0)`.\n- `divide_100_by(0)` — detects the zero divisor and returns an error holding `"Division by zero"`.\n- `pipeline_result` — receives the error state.',
                '**CS lens.** This embodies the **Monad** design pattern. A monad is simply a wrapper type that provides a specific interface to sequence operations. The `.and_then` method (often called `bind` or `>>=` in functional languages) is the defining feature: it takes a wrapped value, unwraps it, applies a function that returns a *new* wrapped value, and flattens the result so you don\'t end up with `expected<expected<T>>`. Also recognized in: `std::optional::and_then`, JavaScript `Promise.then()`, C# LINQ `SelectMany`.',
                '**SE lens.** We engineered this using a monadic interface to achieve **Linear Flow without Boilerplate**. The alternative not chosen was checking `has_value()` after every call and manually returning the error. The cost of that alternative is cognitive load: the "happy path" of the business logic becomes buried under error-handling noise. `.and_then` allows us to describe the logical sequence of operations clearly, deferring the error handling until the very end, while maintaining strictly typed, zero-overhead execution.'
              ],
              typeIt: true,
              solution: 'std::expected<int, std::string> divide_100_by(int divisor) {\n    if (divisor == 0) {\n        return std::unexpected("Division by zero");\n    }\n    return 100 / divisor;\n}\n\n// Inside main:\nauto pipeline_result = parse_int("0").and_then(divide_100_by);',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Transforming and Recovering (.transform and .or_else)',
              prose: [
                'Not all operations in a pipeline can fail. If we want to take our final integer and format it as a string for display, that formatting operation always succeeds. We can\'t use `.and_then` because `.and_then` demands a function that returns a `std::expected`. We need a way to apply an infallible function to our success value. Furthermore, if an error *did* happen anywhere in the chain, we might want to recover from it by substituting a safe default value, rather than letting the error escape.',
                '## How the Code Works',
                '- `auto pipeline_result` — type deduction. Because `.transform` changes the success type to a `std::string`, the final type of this chain is `std::expected<std::string, std::string>`.\n- `=` — assignment operator.\n- `parse_int("XYZ")` — starts the chain. This will fail immediately.\n- `.and_then(divide_100_by)` — skipped entirely, because the prior step resulted in an error.\n- `.transform` — a monadic method. Unlike `.and_then`, it expects a function that returns a plain value, not a `std::expected`. If the current state is success, it applies the function and automatically wraps the raw result in a new `std::expected`. If the state is an error, it skips the function and passes the error along.\n- `([](int val) { ... })` — a lambda expression passed into `.transform`. It receives the success integer from the previous step.\n- `return "The answer is: " + std::to_string(val);` — converts the integer to a string and concatenates it. This plain string return type is intercepted by `.transform` and wrapped into a success state.\n- `.or_else` — a monadic method that acts on the *error* channel. If the state is a success, it skips the function. If the state is an error, it unwraps the error and passes it to the provided function. The function must return a `std::expected` matching the success type of the chain.\n- `([](const std::string& err) -> std::expected<std::string, std::string> { ... })` — a lambda explicitly returning a new `std::expected`. We use a trailing return type `->` to force the exact match.\n- `return "Default answer: -1 (Reason: " + err + ")";` — constructs a fallback success value embedding the original error message. Because it\'s returned from the `.or_else` lambda, it overrides the error and turns the pipeline back into a success state.\n- `parse_int("XYZ")` — fails, yielding an error holding `"Parse failed: not an integer"`.\n- `.and_then(...)` — skips because of the error.\n- `.transform(...)` — skips because of the error.\n- `.or_else(...)` — sees the error, extracts it, and generates a *success* state holding `"Default answer: -1 (Reason: Parse failed: not an integer)"`.',
                '**CS lens.** This completes the pipeline by mirroring the **Map** and **Catch** paradigms. `.transform` is structurally identical to the mathematical `map` functor: applying a pure function `A -> B` to a wrapped `A` to get a wrapped `B`. `.or_else` is the monadic equivalent of a `catch` block, intercepting the failure track and forcing execution back onto the success track. Also recognized in: JavaScript `Promise.catch()`, Java `Optional.map()`, Rust `.map()` and `.unwrap_or_else()`.',
                '**SE lens.** We engineered this using `.transform` and `.or_else` to achieve **Functional Pipeline Composition**. The alternative not chosen was breaking the chain, inspecting the type, conditionally formatting, or throwing an exception to be caught in `main`. The chosen design centralizes all logic (the happy path *and* the recovery path) into a single expression. This makes the data flow strictly linear top-to-bottom, dramatically lowering the chance of uninitialized variable bugs or unhandled edge cases, because the compiler enforces the type signatures of each chain link.'
              ],
              typeIt: true,
              solution: 'auto pipeline_result = parse_int("XYZ")\n    .and_then(divide_100_by)\n    .transform([](int val) {\n        return "The answer is: " + std::to_string(val);\n    })\n    .or_else([](const std::string& err) -> std::expected<std::string, std::string> {\n        return "Default answer: -1 (Reason: " + err + ")";\n    });',
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
      'Next lesson: Designing Error Types.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Monadic interface"?',
      options: [
        'a design pattern providing standard methods (like .and_then or .transform) to chain operations on wrapper types. It exists to remove boilerplate: the wrapper internally checks if it holds a valid value before passing it to the next operation, halting the chain early if an error occurs.',
        'a data structure that holds exactly one of several distinct, strictly defined types at any given moment, accompanied by a tag indicating which type is currently active. It exists to represent mutually exclusive states (like "success" OR "error") in a single variable without dynamic allocation or unsafe casts.',
        'the process where the C++ runtime walks backward up the call stack, destroying local variables and searching for a matching catch block when an exception is thrown. It exists to guarantee resource cleanup (RAII) during an error, but costs significant execution time and prevents the compiler from optimizing control flow.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Stack unwinding"?',
      options: [
        'a data structure that holds exactly one of several distinct, strictly defined types at any given moment, accompanied by a tag indicating which type is currently active. It exists to represent mutually exclusive states (like "success" OR "error") in a single variable without dynamic allocation or unsafe casts.',
        'a design pattern providing standard methods (like .and_then or .transform) to chain operations on wrapper types. It exists to remove boilerplate: the wrapper internally checks if it holds a valid value before passing it to the next operation, halting the chain early if an error occurs.',
        'the process where the C++ runtime walks backward up the call stack, destroying local variables and searching for a matching catch block when an exception is thrown. It exists to guarantee resource cleanup (RAII) during an error, but costs significant execution time and prevents the compiler from optimizing control flow.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Zero-overhead principle"?',
      options: [
        'a design pattern providing standard methods (like .and_then or .transform) to chain operations on wrapper types. It exists to remove boilerplate: the wrapper internally checks if it holds a valid value before passing it to the next operation, halting the chain early if an error occurs.',
        'the process where the C++ runtime walks backward up the call stack, destroying local variables and searching for a matching catch block when an exception is thrown. It exists to guarantee resource cleanup (RAII) during an error, but costs significant execution time and prevents the compiler from optimizing control flow.',
        'the C++ design philosophy that you don\'t pay for what you don\'t use. Applied to error handling, it means reporting an error should not cost more execution time than returning a normal value, which value-based error reporting achieves by treating errors as ordinary data.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Sum type (Tagged Union)"?',
      options: [
        'a data structure that holds exactly one of several distinct, strictly defined types at any given moment, accompanied by a tag indicating which type is currently active. It exists to represent mutually exclusive states (like "success" OR "error") in a single variable without dynamic allocation or unsafe casts.',
        'a design pattern providing standard methods (like .and_then or .transform) to chain operations on wrapper types. It exists to remove boilerplate: the wrapper internally checks if it holds a valid value before passing it to the next operation, halting the chain early if an error occurs.',
        'the C++ design philosophy that you don\'t pay for what you don\'t use. Applied to error handling, it means reporting an error should not cost more execution time than returning a normal value, which value-based error reporting achieves by treating errors as ordinary data.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Stack unwinding** — the process where the C++ runtime walks backward up the call stack, destroying local variables and searching for a matching catch block when an exception is thrown. It exists to guarantee resource cleanup (RAII) during an error, but costs significant execution time and prevents the compiler from optimizing control flow.',
    '**Sum type (Tagged Union)** — a data structure that holds exactly one of several distinct, strictly defined types at any given moment, accompanied by a tag indicating which type is currently active. It exists to represent mutually exclusive states (like "success" OR "error") in a single variable without dynamic allocation or unsafe casts.',
    '**Monadic interface** — a design pattern providing standard methods (like .and_then or .transform) to chain operations on wrapper types. It exists to remove boilerplate: the wrapper internally checks if it holds a valid value before passing it to the next operation, halting the chain early if an error occurs.',
    '**Zero-overhead principle** — the C++ design philosophy that you don\'t pay for what you don\'t use. Applied to error handling, it means reporting an error should not cost more execution time than returning a normal value, which value-based error reporting achieves by treating errors as ordinary data.',
  ],

  checkpoints: ['read-intuition'],
}
