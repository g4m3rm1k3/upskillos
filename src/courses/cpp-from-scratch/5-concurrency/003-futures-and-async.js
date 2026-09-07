// cpp-from-scratch — Lesson 29: Futures and Async
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 29 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-29-futures-and-async',
  slug: 'futures-and-async',
  chapter: 5,
  order: 3,
  title: 'Futures and Async',
  subtitle: 'Concurrency',
  tags: ['future', 'promise', 'async'],

  hook: {
    question: 'What is "Futures and Async", and why does it matter?',
    realWorldContext: 'You will build small, isolated examples that run code asynchronously and retrieve the result later. This proves you can offload work without manually spawning and joining threads or passing data back through a shared, mutex-locked variable.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Returning Values from Threads, Fulfilling a Future Manually, Deferring Work with std::packaged_task.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Future:** a read-only placeholder object that will eventually hold a value computed on another thread. It exists It gives the caller a safe way to ask "is the result ready yet?" or wait for it, without needing to lock a shared variable or manage a condition variable manually.\n- **Promise:** a write-only channel used by a worker to supply a value to a corresponding future. It exists It decouples the act of producing a result from the act of consuming it, allowing one thread to "promise" a result that another thread holds a future for.\n- **Async:** a high-level function that runs a task (often on a background thread) and immediately returns a future for its result. It exists It abstracts away thread creation and promise/future wiring, turning asynchronous execution into a single function call.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::async:** A template function that executes a callable asynchronously.\n- **std::future / get:** A class template that provides access to the result of an asynchronous operation. get() retrieves the value.\n- **std::promise / set_value:** A facility to store a value or an exception that is later acquired asynchronously via a std::future created by the promise object.\n- **std::packaged_task:** A wrapper that wraps any callable target so that it can be invoked asynchronously, storing its return value in a shared state accessible through a std::future.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: '`std::async` is the highest-level tool: it takes a function, starts a thread, and returns a `std::future`. Underneath the hood, `std::async` behaves as if it creates a `std::packaged_task` to wrap your function, extracts the `std::future`, and passes the task to a `std::thread`. The `std::packaged_task` itself is built on top of `std::promise`: when invoked, it runs your function and calls `set_value` on an internal `std::promise`, which fulfills the `std::future` held by the caller.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you try to call `get()` on a future more than once, the program will crash because the future\'s shared state is consumed on the first read. Modify the `async.cpp` example to add a second `get()`: \n\n```cpp\n    int answer = result.get();\n    int answer2 = result.get(); // Breaks here\n```\n\nWhen compiled and run, the program will terminate with `std::future_error`: "Future already retrieved." Restore the code by removing the second `get()`, or by using `std::shared_future` if multiple threads genuinely need to read the same result.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Modify `async.cpp` to use `std::launch::deferred` instead of `std::launch::async`. Add a print statement before `result.get()`. Observe that the worker thread\'s printing now happens *after* the main thread waits, because deferred execution runs the function synchronously exactly when `get()` is called.\n- Modify `promise.cpp` to create a `std::promise<void>` and `std::future<void>`. Use this to implement a pure signal (e.g., the worker waits until the main thread calls `prom.set_value()`, acting as a start gun).',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You can explain why `std::future` replaces a mutex-protected shared variable for returning results.\n- [ ] You understand that `std::async` automatically spawns execution, while `std::promise` requires you to provide the value yourself.\n- [ ] You know that `std::packaged_task` wraps a function so it can be passed around and invoked later.\n- [ ] You can safely retrieve a value from a future using `.get()`.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 29: Futures and Async',
        caption: 'Futures and Async',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Returning Values from Threads',
              prose: [
                'In Lesson 27, when a `std::thread` computed a result, the only way to get that result back to the main thread was to pass a reference to a shared variable and protect it with a `std::mutex`. This requires writing thread-safe synchronization code just to answer the simple question, "what did the function return?"',
                '## How the Code Works',
                '- `std::async(std::launch::async, calculate_answer)` launches the `calculate_answer` function. The `std::launch::async` policy forces it to run on a new, separate thread immediately. If the policy were omitted, the C++ runtime could decide to defer execution.\n- `std::future<int> result = ...` captures the return value of `std::async`. `std::future<int>` is a handle to an integer that does not exist yet. It represents the eventual return value of `calculate_answer`.\n- `result.get()` asks the future for the value. Because the worker thread is sleeping for 2 seconds, the result is not ready. `get()` blocks the main thread, waiting until the worker returns 42. Once `get()` returns, the future is consumed and cannot be asked for the value again.',
                '**CS lens.** This is the Actor model\'s concept of a "promise" or "future" applied to shared-memory concurrency. Instead of sharing mutable state (a shared variable and a mutex), you share an immutable channel: the future. The worker thread owns the write side, and the main thread owns the read side.',
                '**SE lens.** The alternative not chosen is using a `std::thread` holding a reference to an atomic variable or a mutex-guarded integer. That alternative costs boilerplate and is easy to get wrong (e.g., reading the variable before the thread joins). `std::async` costs a small overhead for the hidden shared state allocated by the standard library, but guarantees the data is synchronized and safely transferred to the caller without explicit locking.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <future>\n#include <thread>\n#include <chrono>\n\nint calculate_answer() {\n    std::cout << "Worker: Calculating..." << std::endl;\n    std::this_thread::sleep_for(std::chrono::seconds(2));\n    return 42;\n}\n\nint main() {\n    std::cout << "Main: Starting async task..." << std::endl;\n    \n    std::future<int> result = std::async(std::launch::async, calculate_answer);\n    \n    std::cout << "Main: Doing other work..." << std::endl;\n    \n    int answer = result.get();\n    \n    std::cout << "Main: The answer is " << answer << std::endl;\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Fulfilling a Future Manually',
              prose: [
                '`std::async` is convenient, but it hides the thread creation. Sometimes you already have a background thread running (like a dedicated network thread), or you want to provide a value to a future based on an event rather than a function returning. You need a way to manually fulfill a future.',
                '## How the Code Works',
                '- `std::promise<std::string> my_promise` creates an empty channel for a string. This is the write side.\n- `my_promise.get_future()` extracts the read side. This `std::future<std::string>` is permanently linked to `my_promise`.\n- `std::thread t(network_listener, std::move(my_promise))` spawns a raw `std::thread`. Because `std::promise` cannot be copied (you can\'t have two writers for one future), it must be moved into the thread using `std::move`.\n- `prom.set_value(fake_data)` is called inside the worker thread. This pushes the string into the shared state. The moment this runs, the linked future is fulfilled.\n- `my_future.get()` blocks the main thread until `set_value` is called, then extracts the string.',
                '**CS lens.** This is the decoupling of execution and synchronization. A promise/future pair acts as a one-shot, single-item pipe. The producer (`promise`) and consumer (`future`) do not need to know anything about each other\'s execution context, only that they share this pipe.',
                '**SE lens.** The alternative is using a `std::condition_variable`, a `std::mutex`, a boolean `ready` flag, and a string variable. Using `std::promise` eliminates the chance of writing a buggy condition variable loop (such as missing a wakeup or failing to lock the mutex correctly). It trades the tiny overhead of the promise\'s internal heap allocation for absolute safety and significantly less code.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <future>\n#include <thread>\n#include <chrono>\n\nvoid network_listener(std::promise<std::string> prom) {\n    std::cout << "Thread: Listening for data..." << std::endl;\n    std::this_thread::sleep_for(std::chrono::seconds(1));\n    std::string fake_data = "packet_received";\n    \n    std::cout << "Thread: Fulfilling promise!" << std::endl;\n    prom.set_value(fake_data);\n}\n\nint main() {\n    std::promise<std::string> my_promise;\n    std::future<std::string> my_future = my_promise.get_future();\n    \n    std::thread t(network_listener, std::move(my_promise));\n    \n    std::cout << "Main: Waiting for data..." << std::endl;\n    std::string data = my_future.get();\n    \n    std::cout << "Main: Got data: " << data << std::endl;\n    t.join();\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Deferring Work with std::packaged_task',
              prose: [
                'If `std::async` runs work immediately, and `std::promise` requires manually setting values, what do you use when you want to queue up functions to be run later (like pushing them to a thread pool), but still want a `std::future` right now so you can ask for the result later?',
                '## How the Code Works',
                '- `std::packaged_task<double(double)> task(compute_heavy)` wraps the `compute_heavy` function. The type `double(double)` specifies the signature: it takes a double and returns a double.\n- `task.get_future()` extracts the read side. Just like `std::promise`, a packaged task creates a shared state and gives you the future for it.\n- `task(16.0)` actually invokes the wrapped function. When `compute_heavy(16.0)` returns `4.0`, the packaged task catches that return value and automatically calls `set_value(4.0)` on the underlying promise.\n- `result.get()` retrieves the `4.0`. Because the task was already invoked on the previous line (on the main thread, synchronously), `get()` returns immediately without blocking.',
                '**CS lens.** A packaged task is a closure that bridges functional programming and concurrency. It turns an ordinary function return into an asynchronous message, allowing the caller to treat "running the function" and "getting its result" as two completely separate operations that can happen on different threads at different times.',
                '**SE lens.** The alternative is manually writing a lambda that captures a `std::promise` and calls `set_value` with the result of `compute_heavy`. `std::packaged_task` provides this wrapper for you. It is the fundamental building block for thread pools: a thread pool\'s queue is simply a list of `std::packaged_task`s that worker threads pop and invoke.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <future>\n#include <cmath>\n\ndouble compute_heavy(double x) {\n    return std::sqrt(x);\n}\n\nint main() {\n    std::packaged_task<double(double)> task(compute_heavy);\n    std::future<double> result = task.get_future();\n    \n    std::cout << "Main: Task packaged, but not running yet." << std::endl;\n    \n    task(16.0); \n    \n    std::cout << "Main: Task invoked. Result: " << result.get() << std::endl;\n    return 0;\n}',
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
      'Next lesson: Coroutines.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Future"?',
      options: [
        'a high-level function that runs a task (often on a background thread) and immediately returns a future for its result. It exists It abstracts away thread creation and promise/future wiring, turning asynchronous execution into a single function call.',
        'a read-only placeholder object that will eventually hold a value computed on another thread. It exists It gives the caller a safe way to ask "is the result ready yet?" or wait for it, without needing to lock a shared variable or manage a condition variable manually.',
        'a write-only channel used by a worker to supply a value to a corresponding future. It exists It decouples the act of producing a result from the act of consuming it, allowing one thread to "promise" a result that another thread holds a future for.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Promise"?',
      options: [
        'a write-only channel used by a worker to supply a value to a corresponding future. It exists It decouples the act of producing a result from the act of consuming it, allowing one thread to "promise" a result that another thread holds a future for.',
        'a read-only placeholder object that will eventually hold a value computed on another thread. It exists It gives the caller a safe way to ask "is the result ready yet?" or wait for it, without needing to lock a shared variable or manage a condition variable manually.',
        'a high-level function that runs a task (often on a background thread) and immediately returns a future for its result. It exists It abstracts away thread creation and promise/future wiring, turning asynchronous execution into a single function call.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Async"?',
      options: [
        'a high-level function that runs a task (often on a background thread) and immediately returns a future for its result. It exists It abstracts away thread creation and promise/future wiring, turning asynchronous execution into a single function call.',
        'a read-only placeholder object that will eventually hold a value computed on another thread. It exists It gives the caller a safe way to ask "is the result ready yet?" or wait for it, without needing to lock a shared variable or manage a condition variable manually.',
        'a write-only channel used by a worker to supply a value to a corresponding future. It exists It decouples the act of producing a result from the act of consuming it, allowing one thread to "promise" a result that another thread holds a future for.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Future** — a read-only placeholder object that will eventually hold a value computed on another thread. It exists It gives the caller a safe way to ask "is the result ready yet?" or wait for it, without needing to lock a shared variable or manage a condition variable manually.',
    '**Promise** — a write-only channel used by a worker to supply a value to a corresponding future. It exists It decouples the act of producing a result from the act of consuming it, allowing one thread to "promise" a result that another thread holds a future for.',
    '**Async** — a high-level function that runs a task (often on a background thread) and immediately returns a future for its result. It exists It abstracts away thread creation and promise/future wiring, turning asynchronous execution into a single function call.',
  ],

  checkpoints: ['read-intuition'],
}
