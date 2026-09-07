// cpp-from-scratch — Lesson 30: Coroutines
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 30 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-30-coroutines',
  slug: 'coroutines',
  chapter: 5,
  order: 4,
  title: 'Coroutines',
  subtitle: 'Concurrency',
  tags: ['coroutine', 'coroutine-frame', 'promise-type'],

  hook: {
    question: 'What is "Coroutines", and why does it matter?',
    realWorldContext: 'You will build a custom lazy generator and an awaitable task type. This proves that C++ functions can suspend their execution, yield control back to the caller, and resume later, solving the problem of holding state across multiple invocations without writing full class-based state machines.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: The Promise Type and co_return, Pausing and Resuming with co_await, Generating Values with co_yield.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Coroutine:** a function that can suspend execution to be resumed later. It exists It allows writing asynchronous or stateful-sequence code that looks like a normal synchronous function, avoiding complex state machines or callback hell.\n- **Coroutine frame:** a heap-allocated block of memory that holds a suspended coroutine\'s local variables, arguments, and execution state. It exists When a normal function returns, its stack is destroyed. A coroutine needs its state to survive suspension so it can pick up exactly where it left off.\n- **Promise type:** the struct inside a coroutine\'s return type that dictates how the coroutine behaves (how it starts, yields, returns, and handles exceptions). It exists C++ does not hardcode coroutine behavior into the language; it delegates it to this type so developers can build lazy generators, eager tasks, or event loops as needed.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::coroutine_handle:** A non-owning pointer to a suspended coroutine frame.\n- **std::suspend_always:** A trivial awaitable object that always dictates the coroutine should suspend.\n- **std::suspend_never:** A trivial awaitable object that dictates the coroutine should not suspend.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A coroutine starts by allocating a coroutine frame and instantiating the `promise_type` within it. It yields a `coroutine_handle` to the caller, allowing the caller to explicitly `.resume()` the suspended execution. As the coroutine runs, it can use `co_yield` to stash a value in the promise and suspend, or `co_await` to pause on an asynchronous operation. The caller checks `.done()` to know when the coroutine has hit `co_return`, and finally, an RAII destructor calls `.destroy()` to free the frame.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you forget to implement `~Generator() { handle.destroy(); }` or rely on `suspend_never` for `final_suspend` while still holding a handle, memory leaks or undefined behavior occur. Remove the destructor from `Generator`: \n\n```cpp\n// ~Generator() { if (handle) handle.destroy(); }\n```\n\nWhen compiled and run under a memory sanitizer or valgrind, you will see a definite memory leak because the heap-allocated coroutine frame was never freed.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Modify the `Generator` example to yield an infinite sequence of Fibonacci numbers using an infinite `while (true)` loop. Have `main` resume and print only the first 10.\n- Change `initial_suspend` in `Generator::promise_type` to return `std::suspend_never` and observe how the first value is produced before `generate_numbers()` even returns to `main`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You can explain what a coroutine frame is and where it lives.\n- [ ] You can describe the role of `promise_type` in configuring coroutine behavior.\n- [ ] You understand the difference between `co_await` (pausing) and `co_yield` (pausing and producing a value).\n- [ ] You can write a small lazy generator from scratch.\n- [ ] You understand why `coroutine_handle::destroy` is necessary when using `suspend_always` at `final_suspend`.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 30: Coroutines',
        caption: 'Coroutines',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Promise Type and co_return',
              prose: [
                'C++20 introduced the keywords to suspend functions (`co_await`, `co_yield`, `co_return`), but the standard library (until C++23) provides almost no built-in coroutine return types. To write a coroutine, we must first define a return type containing a nested `promise_type` that tells the compiler how to manage the coroutine frame.',
                '## How the Code Works',
                '- `struct promise_type` — the exact name the C++ compiler looks for inside a coroutine\'s return type. This object sits inside the heap-allocated coroutine frame and controls the lifecycle.\n- `MinimalTask get_return_object()` — called by the compiler when the coroutine frame is first created. It builds the object that is returned to the caller (`main`).\n- `std::suspend_never initial_suspend()` — called immediately after the frame is created. Returning `suspend_never` means the coroutine starts running immediately, like a normal function.\n- `std::suspend_never final_suspend() noexcept` — called when the coroutine finishes. Returning `suspend_never` means the frame destroys itself automatically when done.\n- `void return_void()` — called when the coroutine executes `co_return;` or falls off the end. It handles the void return.\n- `void unhandled_exception()` — called if an exception escapes the coroutine body. Required by the compiler to prevent undefined behavior on unwinding.\n- `co_return;` — a new language keyword. Using it forces `say_hello` to be compiled as a coroutine rather than a regular function. It maps to `promise_type::return_void()`.',
                '**CS lens.** This is **State Machine Generation**. The compiler rewrites the body of `say_hello` into a state machine. The `promise_type` acts as the configuration interface for that compiler-generated state machine. Also recognized in: parser generators, async/await in C# or JavaScript, and Python generator functions.',
                '**SE lens.** The alternative not chosen is baking a specific `Task` type into the compiler (like C# does). By forcing developers to provide `promise_type`, C++ allows coroutines to be highly optimized for zero-allocation or custom scheduling. The tradeoff is intense boilerplate for simple use cases, requiring library authors to write wrappers before application developers can use the feature easily.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <coroutine>\n\nstruct MinimalTask {\n    struct promise_type {\n        MinimalTask get_return_object() { return MinimalTask{}; }\n        std::suspend_never initial_suspend() { return {}; }\n        std::suspend_never final_suspend() noexcept { return {}; }\n        void return_void() {}\n        void unhandled_exception() {}\n    };\n};\n\nMinimalTask say_hello() {\n    std::cout << "Starting coroutine\\n";\n    co_return;\n}\n\nint main() {\n    say_hello();\n    return 0;\n}',
              expectedOutput: 'Starting coroutine',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Pausing and Resuming with co_await',
              prose: [
                'We want a function to do some work, pause, return control to `main`, and let `main` resume it later. To do this, we need a way to hold onto the coroutine frame and manually drive its execution.',
                '## How the Code Works',
                '- `std::coroutine_handle<promise_type>::from_promise(*this)` — creates a handle pointing to the current coroutine frame. This is the key we give to the caller.\n- `std::suspend_always initial_suspend()` — dictates that the coroutine should pause *before* running its first line of code. The caller receives the `Resumable` object immediately without the coroutine printing anything yet.\n- `std::suspend_always final_suspend() noexcept` — pauses the frame at the very end instead of destroying itself. This keeps the handle valid so we can interrogate it later.\n- `~Resumable()` — the caller now owns the frame via the handle. Because the frame no longer self-destructs, the `Resumable` destructor must call `handle.destroy()` to free the heap memory and prevent leaks.\n- `co_await std::suspend_always{};` — suspends the coroutine mid-execution. Control jumps back to whoever last called `resume()`.\n- `task.handle.resume()` — jumps into the coroutine frame, continuing execution from wherever it was last suspended (either the initial suspend, or the `co_await`), until it suspends again.\n- `pausable_func()` — creates the frame, hits `initial_suspend`, and pauses before printing anything. Returns the `Resumable` handle.\n- `task.handle.resume()` — enters the coroutine. Prints "Step 1".\n- `co_await std::suspend_always{}` — pauses the coroutine. Control returns to `main`.\n- `task.handle.resume()` — re-enters the coroutine. Prints "Step 2". Hits the end, calls `return_void`, then `final_suspend` (pausing again). Control returns to `main`.\n- `~Resumable()` — destroys the frame memory when `task` goes out of scope.',
                '**CS lens.** This is **Cooperative Multitasking**. Unlike OS threads which are preemptively swapped by a scheduler out of your control, coroutines yield control voluntarily and explicitly at `co_await` boundaries.',
                '**SE lens.** The alternative to explicit handle destruction is garbage collection. In C++, because a suspended coroutine lives on the heap, someone must own it. Tying `coroutine_handle::destroy` to an RAII destructor (`~Resumable`) ensures the frame doesn\'t leak while still preserving deterministic memory management.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <coroutine>\n\nstruct Resumable {\n    struct promise_type {\n        Resumable get_return_object() {\n            return Resumable{std::coroutine_handle<promise_type>::from_promise(*this)};\n        }\n        std::suspend_always initial_suspend() { return {}; }\n        std::suspend_always final_suspend() noexcept { return {}; }\n        void return_void() {}\n        void unhandled_exception() {}\n    };\n\n    std::coroutine_handle<promise_type> handle;\n    \n    ~Resumable() {\n        if (handle) handle.destroy();\n    }\n};\n\nResumable pausable_func() {\n    std::cout << "  Coroutine: Step 1\\n";\n    co_await std::suspend_always{};\n    std::cout << "  Coroutine: Step 2\\n";\n}',
              expectedOutput: 'Main: Calling coroutine\nMain: Resuming\n  Coroutine: Step 1\nMain: Resuming again\n  Coroutine: Step 2\nMain: Done',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Generating Values with co_yield',
              prose: [
                'A common use case for coroutines is lazy generation: computing a sequence of values one at a time, pausing after each value is produced, and resuming only when the caller asks for the next one.',
                '## How the Code Works',
                '- `int current_value` — state added to the promise type to shuttle data from the coroutine to the caller.\n- `std::suspend_always yield_value(int value)` — maps directly to the `co_yield` keyword. It saves the value into the promise and then suspends the coroutine, yielding control to the caller.\n- `co_yield i * 10;` — evaluates the expression, passes it to `promise_type::yield_value`, and pauses execution.\n- `gen.handle.done()` — checks if the coroutine is currently suspended at its `final_suspend` point, meaning no more values will be produced.\n- `gen.handle.promise()` — gives the caller access to the `promise_type` instance residing inside the coroutine frame, allowing us to read `current_value`.\nIteration 1: `resume` runs loop to `co_yield 10`, calls `yield_value`, sets `current_value` = 10, pauses. Main prints 10.\nIteration 2: `resume` loops back around, hits `co_yield 20`, sets `current_value` = 20, pauses. Main prints 20.\nIteration 3: `resume` loops back around, hits `co_yield 30`, sets `current_value` = 30, pauses. Main prints 30.\nIteration 4: `resume` finishes loop, hits end of function, `done()` becomes true. Main breaks out.',
                '**CS lens.** This is **Lazy Evaluation**. The sequence elements are computed just-in-time, exactly when requested, rather than allocating a vector and computing all values upfront. Also recognized in: Haskell\'s entire evaluation model, database cursors, stream processing.',
                '**SE lens.** The alternative is writing an iterator class with a state machine manually (storing loop index `i` as a class member, checking it inside `operator++`). Coroutines let the compiler generate that state machine from a standard `for` loop, drastically reducing boilerplate for complex traversal logic.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <coroutine>\n\nstruct Generator {\n    struct promise_type {\n        int current_value;\n        \n        Generator get_return_object() {\n            return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};\n        }\n        std::suspend_always initial_suspend() { return {}; }\n        std::suspend_always final_suspend() noexcept { return {}; }\n        void return_void() {}\n        void unhandled_exception() {}\n        \n        std::suspend_always yield_value(int value) {\n            current_value = value;\n            return {};\n        }\n    };\n\n    std::coroutine_handle<promise_type> handle;\n    ~Generator() { if (handle) handle.destroy(); }\n};\n\nGenerator generate_numbers() {\n    for (int i = 1; i <= 3; ++i) {\n        co_yield i * 10;\n    }\n}',
              expectedOutput: 'Got: 10\nGot: 20\nGot: 30',
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
      'Next lesson: Memory Layout and Alignment.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Coroutine"?',
      options: [
        'a function that can suspend execution to be resumed later. It exists It allows writing asynchronous or stateful-sequence code that looks like a normal synchronous function, avoiding complex state machines or callback hell.',
        'a heap-allocated block of memory that holds a suspended coroutine\'s local variables, arguments, and execution state. It exists When a normal function returns, its stack is destroyed. A coroutine needs its state to survive suspension so it can pick up exactly where it left off.',
        'the struct inside a coroutine\'s return type that dictates how the coroutine behaves (how it starts, yields, returns, and handles exceptions). It exists C++ does not hardcode coroutine behavior into the language; it delegates it to this type so developers can build lazy generators, eager tasks, or event loops as needed.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Promise type"?',
      options: [
        'a function that can suspend execution to be resumed later. It exists It allows writing asynchronous or stateful-sequence code that looks like a normal synchronous function, avoiding complex state machines or callback hell.',
        'a heap-allocated block of memory that holds a suspended coroutine\'s local variables, arguments, and execution state. It exists When a normal function returns, its stack is destroyed. A coroutine needs its state to survive suspension so it can pick up exactly where it left off.',
        'the struct inside a coroutine\'s return type that dictates how the coroutine behaves (how it starts, yields, returns, and handles exceptions). It exists C++ does not hardcode coroutine behavior into the language; it delegates it to this type so developers can build lazy generators, eager tasks, or event loops as needed.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Coroutine frame"?',
      options: [
        'a function that can suspend execution to be resumed later. It exists It allows writing asynchronous or stateful-sequence code that looks like a normal synchronous function, avoiding complex state machines or callback hell.',
        'the struct inside a coroutine\'s return type that dictates how the coroutine behaves (how it starts, yields, returns, and handles exceptions). It exists C++ does not hardcode coroutine behavior into the language; it delegates it to this type so developers can build lazy generators, eager tasks, or event loops as needed.',
        'a heap-allocated block of memory that holds a suspended coroutine\'s local variables, arguments, and execution state. It exists When a normal function returns, its stack is destroyed. A coroutine needs its state to survive suspension so it can pick up exactly where it left off.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Coroutine** — a function that can suspend execution to be resumed later. It exists It allows writing asynchronous or stateful-sequence code that looks like a normal synchronous function, avoiding complex state machines or callback hell.',
    '**Coroutine frame** — a heap-allocated block of memory that holds a suspended coroutine\'s local variables, arguments, and execution state. It exists When a normal function returns, its stack is destroyed. A coroutine needs its state to survive suspension so it can pick up exactly where it left off.',
    '**Promise type** — the struct inside a coroutine\'s return type that dictates how the coroutine behaves (how it starts, yields, returns, and handles exceptions). It exists C++ does not hardcode coroutine behavior into the language; it delegates it to this type so developers can build lazy generators, eager tasks, or event loops as needed.',
  ],

  checkpoints: ['read-intuition'],
}
