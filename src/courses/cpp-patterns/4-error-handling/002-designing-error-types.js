// cpp-patterns — Lesson 12: Designing Error Types
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 12 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-12-designing-error-types',
  slug: 'designing-error-types',
  chapter: 4,
  order: 2,
  title: 'Designing Error Types',
  subtitle: 'Error Handling',
  tags: ['bare-integer-error-code', 'strong-enum', 'contextual-error', 'recoverable-error', 'unrecoverable-error'],

  hook: {
    question: 'What is "Designing Error Types", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: The Failure of Bare Integer Error Codes, Strong Error Enums, Rich Error Types for Context, Recoverable vs. Unrecoverable Errors, std::error_code and std::error_category.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Bare Integer Error Code:** a design pattern where failures are returned as generic integers (-1, 404). It exists to provide low-overhead signaling, but fails in C++ because integers lack type safety and meaning.\n- **Strong Enum:** a scoped enumeration (enum class) that does not implicitly convert to an integer. It exists to force the compiler to enforce type boundaries between different enumerations.\n- **Contextual Error:** an error representation that carries dynamic state (like a filename or line number) alongside the failure reason. It exists to provide actionable diagnostics to the caller.\n- **Recoverable Error:** a failure state (like missing configuration or invalid user input) that the calling code is expected to anticipate and handle. It exists to be routed and mitigated without terminating the process.\n- **Unrecoverable Error:** a failure state (like a null pointer dereference or corrupted memory) representing a broken program invariant. It exists to terminate the process immediately because safe execution is no longer possible.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::expected:** A standard vocabulary type holding either a valid result or an error value.\n- **std::error_category:** A standard base class defining a specific domain of errors.\n- **std::error_code:** A standard type pairing an integer error value with a pointer to its std::error_category.\n- **std::abort:** A standard library function that terminates the program immediately.\n- **std::string:** A standard library string type.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We have built a sequence of tools for signaling failure across application boundaries. A user inputs bad data, generating a `ConfigError::InvalidSyntax`. This is wrapped in a `ParseContextError` with the exact line number, returned as a **Recoverable Error** via `std::expected`. At the top level, it is converted into a `std::error_code` and logged via `ec.message()`. Meanwhile, an internal null pointer triggers `std::abort()`, immediately halting the process as an **Unrecoverable Error**. ### What breaks without this If we remove the `is_error_code_enum` trait from the last unit: ```cpp // namespace std { template <> struct is_error_code_enum<ConfigError> : true_type {}; } ``` ```text error: no viable conversion from \'std::unexpected<ConfigError>\' to \'std::expected<void, std::error_code>\' ``` The compiler refuses to implicitly convert the enum, preventing us from accidentally passing un-registered integers as error codes. Type safety is preserved. ### Exercises 1. Expand the `ParseContextError` to include a `std::string_view` of the exact bad token instead of just the line number. 2. Add a `PermissionDenied` error to `ConfigError` and implement its string conversion in the `error_category`. 3. Try catching a `std::abort()` with a `try { ... } catch(...) { ... }` block to prove to yourself that unrecoverable errors cannot be intercepted. ### Definition of Done - [x] Bare integers are rejected for error states due to lack of type safety. - [x] Anticipated failures are returned as strong enums. - [x] Diagnostic context is packaged in rich error structs. - [x] Contract violations use `std::abort()` to fail fast. - [x] Custom enums are wired into `std::error_code` for standard interoperability. ```bash git commit -m "Adopt strong enums and std::error_code for type-safe failure routing" ```',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 12: Designing Error Types',
        caption: 'Designing Error Types',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Failure of Bare Integer Error Codes',
              prose: [
                'When a function fails, it must communicate that failure to the caller. Historically, C and early C++ used bare integers as return codes to signal success or failure. This fails because integers carry no type safety and no inherent meaning, allowing the caller to easily ignore the error or mistake it for a valid result.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nint parseConfiguration() {\n    // -1 represents "file not found"\n    return -1; \n}\n\nint main() {\n    int result = parseConfiguration();\n    // The compiler allows this dangerous arithmetic on an error code\n    std::cout << "Result doubled: " << (result * 2) << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `int` — the return type of the function. It is a fundamental signed integer type. It provides no information about whether it represents a count, an index, or a failure.\n- `processData()` — the function declaration. It accepts no arguments.\n- `return 404;` — returns an integer literal. The meaning of `404` is entirely undocumented in the type system; the caller must rely on external documentation to know what it means.\n- `int status = processData();` — stores the result. The type `int` allows `status` to be passed into any math function or array subscript operator without warning.\n- `if (status != 0)` — a conditional check assuming `0` means success. This is a convention, not a rule enforced by the language.\n- `std::cout << "Error: " << status << "\\n";` — prints the integer to standard output. The user sees `Error: 404`, which is opaque and unhelpful.',
                '**CS lens.** This embodies **In-band Signaling**, where control information (the error state) and data share the same channel and type. Also recognized in: C standard library functions (like `getchar()` returning `-1` for EOF), sentinel values in algorithms, and early Unix system calls.',
                '**SE lens.** The design principle violated here is **Type Safety**. The alternative chosen was using a generic `int` for performance and simplicity, avoiding the overhead of complex objects. The maintenance cost is high: callers routinely forget to check the error code or accidentally use the error code as valid data, leading to silent data corruption or out-of-bounds memory accesses further down the line.'
              ],
              typeIt: true,
              solution: 'int processData() {\n    return 404; // 404 represents "not found"\n}',
              expectedOutput: 'Error: 404',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Strong Error Enums',
              prose: [
                'If we use integers, the compiler cannot stop us from mixing up error codes with math or confusing one library\'s error codes with another\'s. We need a way to declare a closed set of failure reasons that cannot be implicitly converted to or from integers.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nenum class ParseError {\n    MissingFile,\n    InvalidSyntax\n};\n\nvoid printError(ParseError err) {\n    if (err == ParseError::MissingFile) {\n        std::cout << "File is missing.\\n";\n    }\n}\n\nint main() {\n    printError(ParseError::MissingFile);\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `enum class ConfigError` — declares a scoped enumeration. Unlike a plain `enum`, the values inside are strongly typed and scoped to `ConfigError`.\n- `{ NotFound, PermissionDenied };` — the closed set of exact failure states. They have no implicit integer value exposed to the programmer.\n- `std::expected<int, ConfigError>` — a standard library template that holds either the expected success type (`int`) or the error type (`ConfigError`). It forces the caller to acknowledge both possibilities.\n- `loadConfig()` — the function declaration.\n- `return std::unexpected(ConfigError::NotFound);` — constructs an error state. `std::unexpected` is a wrapper that tells `std::expected` to initialize its error channel instead of its value channel.\n- `auto result = loadConfig();` — calls the function, storing the `std::expected` object.\n- `if (!result.has_value())` — checks if the expected object contains an error.\n- `if (result.error() == ConfigError::NotFound)` — accesses the error channel via `.error()` and compares it safely. Because `ConfigError` is an `enum class`, comparing it to an integer or a different enum type would cause a compiler error.\n- `std::cout << "Configuration not found.\\n";` — prints a hardcoded message based on the typed error.',
                '**CS lens.** This embodies **Algebraic Data Types**, specifically a Sum Type (or disjoint union), where a type can be exactly one of a constrained set of variants (Success OR Error). Also recognized in: Rust\'s `Result` type, Haskell\'s `Either`, Swift\'s `Result`, network protocol state machines.',
                '**SE lens.** The design principle here is **Make Invalid State Unrepresentable**. The alternative was returning an integer, which allows millions of invalid states (what does error `999` mean?). By using `enum class`, the compiler guarantees that only `NotFound` or `PermissionDenied` can ever be returned as an error, eliminating entire categories of boundary bugs.'
              ],
              typeIt: true,
              solution: 'enum class ConfigError {\n    NotFound,\n    PermissionDenied\n};\n\nstd::expected<int, ConfigError> loadConfig() {\n    return std::unexpected(ConfigError::NotFound);\n}',
              expectedOutput: 'Configuration not found.',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Rich Error Types for Context',
              prose: [
                'An `enum class` is a static identifier. When parsing a 10,000-line configuration file, returning `ConfigError::InvalidSyntax` is useless because it doesn\'t tell the caller *where* the syntax error occurred. We need an error type that carries dynamic state.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <string>\n\nenum class ParseError { Syntax };\n\nstruct DetailedError {\n    ParseError code;\n    std::string context;\n    int line;\n};\n\nint main() {\n    DetailedError err = {ParseError::Syntax, "Missing semicolon", 42};\n    std::cout << "Error at line " << err.line << ": " << err.context << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `struct ParseContextError` — defines a custom data structure for our error.\n- `ConfigError code;` — embeds the strong enum we defined earlier. The caller can still `switch` on this for logic routing.\n- `std::string filename;` — a standard dynamically allocated string holding the name of the file that caused the error.\n- `int lineNumber;` — an integer storing exactly where the parser failed.\n- `std::expected<void, ParseContextError>` — the return type. `void` means the function produces no value on success, only success itself, but produces a `ParseContextError` on failure.\n- `parseLine()` — the function declaration.\n- `return std::unexpected(...)` — triggers the error channel of the `std::expected`.\n- `ParseContextError{ ConfigError::InvalidSyntax, "server.cfg", 15 }` — uses uniform initialization (brace initialization) to instantly construct the struct with its three members.\n- `const auto& err = result.error();` — retrieves the error object by `const` reference, avoiding an unnecessary copy of the `std::string` inside it.\n- `std::cout << ...` — accesses `err.filename` and `err.lineNumber` to print a highly specific diagnostic message.',
                '**CS lens.** This embodies **Out-of-Band Diagnostics**, where the error type encapsulates a payload of telemetry data rather than just a minimal signal, separating the *category* of the error (for logic routing) from the *context* of the error (for human debugging). Also recognized in: HTTP response bodies containing JSON error details, Java\'s Exception stack traces, compiler diagnostic ASTs.',
                '**SE lens.** The design principle here is **Observability**. The alternative is dropping the file and line data and returning only `InvalidSyntax`, which saves memory (no `std::string` allocation). The tradeoff is that when this runs in production, an `InvalidSyntax` log with no filename is impossible to debug. We pay the cost of allocating a string on the error path to make the system maintainable.'
              ],
              typeIt: true,
              solution: 'struct ParseContextError {\n    ConfigError code;\n    std::string filename;\n    int lineNumber;\n};\n\nstd::expected<void, ParseContextError> parseLine() {\n    return std::unexpected(ParseContextError{\n        ConfigError::InvalidSyntax, "server.cfg", 15\n    });\n}',
              expectedOutput: 'Failed in server.cfg at line 15',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Recoverable vs. Unrecoverable Errors',
              prose: [
                'If a network request times out, we want to retry it — that is a recoverable error. If our code tries to dereference a null pointer because of a logic bug, retrying won\'t fix it; the program\'s internal state is corrupted. Returning a `std::expected` for a logic bug forces callers to handle states that should never exist. We need to distinguish between errors we report, and errors that kill the process.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <cstdlib>\n\nvoid checkPointer(int* ptr) {\n    if (ptr == nullptr) {\n        std::cout << "Fatal logic bug: null pointer. Terminating.\\n";\n        std::abort();\n    }\n    std::cout << "Pointer is valid.\\n";\n}\n\nint main() {\n    int* p = nullptr;\n    checkPointer(p);\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `processBuffer(const char* buffer)` — a function that expects a valid memory buffer to parse.\n- `if (buffer == nullptr)` — a check for a broken contract. The caller is legally required to provide a valid pointer. If it\'s null, the programmer made a mistake, not the user.\n- `std::abort();` — a standard library function that instantly terminates the process. It does not throw an exception, it does not unwind the stack, and it cannot be caught. It is a hard crash.\n- `return std::unexpected(ConfigError::InvalidSyntax);` — the alternative path. If the buffer is valid but the text inside it is garbled, that is an environmental failure (bad input). We return it as an expected enum so the caller can recover.\n- `auto result = processBuffer(badInput);` — executes the recoverable path. The program logs it and continues.\n- `processBuffer(nullptr);` — executes the unrecoverable path. The program dies immediately.',
                '**CS lens.** This embodies the **Fail-Fast** principle. When a system\'s internal state becomes untrustworthy (a broken invariant), halting immediately prevents the corruption from cascading into databases, filesystems, or security vulnerabilities. Also recognized in: Rust\'s `panic!`, assertions in C, hardware memory-protection faults.',
                '**SE lens.** The design principle here is **Contract Enforcement**. The alternative is returning a `ConfigError::NullPointer` to the caller. That is a terrible design because it forces every layer of the application to check for and route an error that represents a developer typo. By aborting, we shift the failure from runtime error-handling logic back to the developer\'s debugging session, where bugs belong.'
              ],
              typeIt: true,
              solution: 'std::expected<void, ConfigError> processBuffer(const char* buffer) {\n    if (buffer == nullptr) {\n        std::abort(); // Unrecoverable: logic bug\n    }\n    \n    return std::unexpected(ConfigError::InvalidSyntax); // Recoverable\n}',
              expectedOutput: 'Recovered from syntax error.\nTriggering unrecoverable error...',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'std::error_code and std::error_category',
              prose: [
                'If our project uses `ConfigError`, but the networking library returns `std::errc::connection_refused`, we cannot store them in the same `std::expected` type. We need a type-erased container that can hold *any* library\'s error code uniformly, without allocating memory like a rich struct would.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <system_error>\n\nenum class DbError { Locked = 1 };\n\nclass DbCategory : public std::error_category {\npublic:\n    const char* name() const noexcept override { return "Database"; }\n    std::string message(int ev) const override {\n        if (ev == 1) return "Database is locked";\n        return "Unknown";\n    }\n};\n\nconst DbCategory& getDbCategory() {\n    static DbCategory instance;\n    return instance;\n}\n\nint main() {\n    std::error_code ec(static_cast<int>(DbError::Locked), getDbCategory());\n    std::cout << ec.category().name() << " error: " << ec.message() << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `enum class ConfigError { NotFound = 1 };` — our strong enum, now assigned a specific integer value.\n- `namespace std { template <> struct is_error_code_enum<ConfigError> : true_type {}; }` — we open the `std` namespace and specialize a type trait. This tells the compiler, "Yes, `ConfigError` is legally allowed to be converted into a `std::error_code`."\n- `std::error_code make_error_code(ConfigError e)` — the exact factory function signature the standard library looks for via Argument-Dependent Lookup (ADL) when converting our enum.\n- `static struct : std::error_category { ... } cat;` — creates an anonymous struct inheriting from `std::error_category`, and immediately instantiates a `static` instance of it named `cat`. It is static so there is exactly one instance in the entire program, making pointer comparisons fast.\n- `const char* name() const noexcept override` — overrides the base class virtual method to return a domain name string (`"Config"`).\n- `std::string message(int ev) const override` — overrides the method that converts the raw integer (`ev`) back into a human-readable string (`"File not found"`).\n- `return {static_cast<int>(e), cat};` — constructs the `std::error_code`, pairing the integer value of the enum with a reference to our singleton category.\n- `std::expected<void, std::error_code>` — the function now returns a universal `std::error_code` instead of our custom enum.\n- `return std::unexpected(ConfigError::NotFound);` — the compiler sees an enum, sees the `is_error_code_enum` trait is true, and automatically calls `make_error_code` for us.\n- `ec.category().name()` and `ec.message()` — the caller invokes standard methods on the `std::error_code` to retrieve our custom strings, entirely agnostic to the fact that it came from `ConfigError`.',
                '**CS lens.** This embodies **Type Erasure**. The caller only knows about `std::error_code` and `std::error_category`. The specific enum type (`ConfigError`) has been erased, but its behavior (how to stringify it) is preserved dynamically via the virtual methods on the category pointer. Also recognized in: `std::function`, Java interfaces, polymorphism in device drivers.',
                '**SE lens.** The design principle here is **Interoperability**. The alternative is forcing the caller to write a giant `std::variant<ConfigError, NetworkError, FsError>` to hold all possible failure types. By adopting `std::error_code`, a single application can seamlessly combine failures from the OS, standard libraries, and our custom code into a single, uniform error-handling pipeline.'
              ],
              typeIt: true,
              solution: 'enum class ConfigError { NotFound = 1 };\n\nnamespace std {\n    template <> struct is_error_code_enum<ConfigError> : true_type {};\n}\n\nstd::error_code make_error_code(ConfigError e) {\n    static struct : std::error_category {\n        const char* name() const noexcept override { return "Config"; }\n        std::string message(int ev) const override {\n            return ev == 1 ? "File not found" : "Unknown";\n        }\n    } cat;\n    return {static_cast<int>(e), cat};\n}',
              expectedOutput: '[Config] File not found',
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
      'Next lesson: std::fstream and Binary I/O.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Contextual Error"?',
      options: [
        'a failure state (like a null pointer dereference or corrupted memory) representing a broken program invariant. It exists to terminate the process immediately because safe execution is no longer possible.',
        'a failure state (like missing configuration or invalid user input) that the calling code is expected to anticipate and handle. It exists to be routed and mitigated without terminating the process.',
        'an error representation that carries dynamic state (like a filename or line number) alongside the failure reason. It exists to provide actionable diagnostics to the caller.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Unrecoverable Error"?',
      options: [
        'a scoped enumeration (enum class) that does not implicitly convert to an integer. It exists to force the compiler to enforce type boundaries between different enumerations.',
        'an error representation that carries dynamic state (like a filename or line number) alongside the failure reason. It exists to provide actionable diagnostics to the caller.',
        'a failure state (like a null pointer dereference or corrupted memory) representing a broken program invariant. It exists to terminate the process immediately because safe execution is no longer possible.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Strong Enum"?',
      options: [
        'a scoped enumeration (enum class) that does not implicitly convert to an integer. It exists to force the compiler to enforce type boundaries between different enumerations.',
        'a design pattern where failures are returned as generic integers (-1, 404). It exists to provide low-overhead signaling, but fails in C++ because integers lack type safety and meaning.',
        'a failure state (like a null pointer dereference or corrupted memory) representing a broken program invariant. It exists to terminate the process immediately because safe execution is no longer possible.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Recoverable Error"?',
      options: [
        'a failure state (like missing configuration or invalid user input) that the calling code is expected to anticipate and handle. It exists to be routed and mitigated without terminating the process.',
        'a scoped enumeration (enum class) that does not implicitly convert to an integer. It exists to force the compiler to enforce type boundaries between different enumerations.',
        'a failure state (like a null pointer dereference or corrupted memory) representing a broken program invariant. It exists to terminate the process immediately because safe execution is no longer possible.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Bare Integer Error Code** — a design pattern where failures are returned as generic integers (-1, 404). It exists to provide low-overhead signaling, but fails in C++ because integers lack type safety and meaning.',
    '**Strong Enum** — a scoped enumeration (enum class) that does not implicitly convert to an integer. It exists to force the compiler to enforce type boundaries between different enumerations.',
    '**Contextual Error** — an error representation that carries dynamic state (like a filename or line number) alongside the failure reason. It exists to provide actionable diagnostics to the caller.',
    '**Recoverable Error** — a failure state (like missing configuration or invalid user input) that the calling code is expected to anticipate and handle. It exists to be routed and mitigated without terminating the process.',
    '**Unrecoverable Error** — a failure state (like a null pointer dereference or corrupted memory) representing a broken program invariant. It exists to terminate the process immediately because safe execution is no longer possible.',
  ],

  checkpoints: ['read-intuition'],
}
