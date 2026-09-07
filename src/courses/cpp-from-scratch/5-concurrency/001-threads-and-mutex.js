// cpp-from-scratch — Lesson 27: Threads and Mutex
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 27 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-27-threads-and-mutex',
  slug: 'threads-and-mutex',
  chapter: 5,
  order: 1,
  title: 'Threads and Mutex',
  subtitle: 'Concurrency',
  tags: ['thread', 'data-race', 'undefined-behavior-ub'],

  hook: {
    question: 'What is "Threads and Mutex", and why does it matter?',
    realWorldContext: 'You will build a series of short, concurrent C++ programs that divide work across multiple CPU cores. You will intentionally create a data race to observe how unprotected memory corrupts under simultaneous access, and then you will fix it by enforcing mutual exclusion. This proves that you can safely parallelize logic.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Spawning a Thread and join, detach, Data Races, std::mutex, std::lock_guard.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Thread:** an independent sequence of execution within a program that the operating system schedules on a CPU core. It exists It allows a single process to execute multiple functions simultaneously, maximizing hardware utilization.\n- **Data race:** a condition where two or more threads access the same memory location simultaneously, and at least one is writing to it. It exists It is the fundamental concurrency bug; without enforced ordering, threads read and write at unpredictable nanosecond intervals, destroying intermediate state.\n- **Undefined behavior (UB):** a situation where the C++ standard provides no guarantees about what a program will do, allowing it to crash, produce garbage, or appear to work normally. It exists It is the tradeoff C++ makes for maximum performance; instead of the compiler adding safety checks that slow down every operation, it assumes the programmer follows the rules, and if they don\'t, the execution contract is void.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::thread:** A standard library class representing a single thread of execution.\n- **std::thread::join:** A method that blocks the caller until the target thread finishes executing.\n- **std::thread::detach:** A method that separates the thread of execution from the std::thread object.\n- **std::mutex:** A synchronization primitive (Mutual Exclusion) that can be locked by only one thread at a time.\n- **std::lock_guard:** An RAII wrapper that owns a mutex for the duration of a scoped block, locking it on creation and unlocking it on destruction.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A C++ program spawns independent paths of execution using `std::thread`, running immediately alongside the caller. The caller must either `join()` to wait for completion or `detach()` to abandon the thread. When those paths intersect over the same memory, the CPU\'s simultaneous read-modify-write cycles overlap, causing data races and undefined behavior. To prevent this, threads coordinate using a `std::mutex`, which acts as a digital baton ensuring only one thread enters the critical section at a time. To prevent deadlocks caused by early exits, `std::lock_guard` leverages RAII to guarantee the mutex is unlocked the moment the scope ends.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you modify data concurrently without a mutex, you corrupt memory. If you use a mutex but forget to unlock it, you freeze the program. Modify `add_to_total` to cause a deliberate deadlock by using manual locks and simulating a skipped unlock: \n\n```cpp\nvoid add_to_total() {\n    for (int i = 0; i < 100000; ++i) {\n        total_mutex.lock();\n        shared_total = shared_total + 1;\n        if (i == 50) return; // Returns early without unlocking!\n        total_mutex.unlock();\n    }\n}\n```\n\nWhen you run the application, it will hang indefinitely. Thread 1 locks the mutex and returns at iteration 50. Thread 2 attempts to lock the mutex but halts, waiting for an `unlock()` that will never happen. The process is permanently frozen. Restore the code by putting `std::lock_guard` back.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Modify the data race example to use three threads instead of two, each doing 100,000 additions, and observe the even more drastic data loss.\n- Add a `std::this_thread::sleep_for(std::chrono::milliseconds(1));` inside the `lock_guard` block, and time how long the program takes. This proves that heavily contended mutexes destroy the performance benefits of multithreading.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You can explain why a data race corrupts memory.\n- [ ] You understand that `join()` forces the caller to wait, while `detach()` does not.\n- [ ] You know why manual `unlock()` is dangerous compared to `std::lock_guard`.\n- [ ] You can spawn a thread, protect a shared resource, and wait for completion in your own code.\n- [ ] You can explain threads and mutexes out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 27: Threads and Mutex',
        caption: 'Threads and Mutex',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Spawning a Thread and join',
              prose: [
                'By default, C++ executes line by line. If a program calls a function that takes a long time, the caller halts until the function returns. We want to start a function but immediately continue doing other work in the background.',
                '## First, In Isolation',
                '```cpp\nstd::thread t(worker_logic);\nt.join();\n```',
                '## How the Code Works',
                '- `#include <thread>` — first appearance. Pulls in the standard library\'s thread support.\n- `std::thread worker(worker_logic);` — first appearance. Constructs a new `std::thread` object named `worker`. The moment this object is instantiated, the operating system begins executing `worker_logic` concurrently.\n- `worker.join();` — first appearance. Blocks the current thread (in this case, `main`) from proceeding. The program sits at this line and does zero work until the `worker` thread completely finishes executing its function.\n**Execution Trace:**\n- `std::thread worker(worker_logic);` — the OS schedules the worker thread. It begins preparing to run, but `main` does not pause to wait for it.\n- `for (int i = 0; i < 5; ++i)` (in main) — executes immediately. The `main` thread races the `worker` thread to output text.\n- `worker.join();` — the `main` thread hits this line and halts. If `worker` is already done, it passes instantly; if not, it waits.',
                '**CS lens.** This embodies hardware concurrency. Also recognized in: operating system multitasking, database query execution, web servers handling multiple requests, and modern game engines calculating physics and rendering simultaneously.',
                '**SE lens.** The alternative is sequential execution, where `main` calls `worker_logic()` and waits for it to return before printing its own loop. Sequential code is predictable and easy to debug. Concurrency trades that simplicity for performance, introducing the risk of unpredictable execution order to maximize hardware utilization.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <thread>\n\nvoid worker_logic() {\n    for (int i = 0; i < 5; ++i) {\n        std::cout << "Worker: " << i << "\\n";\n    }\n}\n\nint main() {\n    std::thread worker(worker_logic);\n    \n    for (int i = 0; i < 5; ++i) {\n        std::cout << "Main: " << i << "\\n";\n    }\n    \n    worker.join();\n    return 0;\n}',
              expectedOutput: 'Main: 0\nMain: 1\nWorker: 0\nWorker: 1\nMain: 2\nWorker: 2\nMain: 3\nWorker: 3\nMain: 4\nWorker: 4',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'detach',
              prose: [
                'Sometimes a program starts a background task—like logging or a network heartbeat—that should run continuously without the main thread ever waiting for it. Using `join` forces a wait, defeating the purpose of a purely independent background task.',
                '## First, In Isolation',
                '```cpp\nstd::thread t(background_task);\nt.detach();\n```',
                '## How the Code Works',
                '- `worker.detach();` — first appearance. Tells the C++ runtime that we will never call `join()` on this thread. The `worker` object can be safely destroyed at the end of `main` without terminating the program, leaving the actual background execution running.\n**Execution Trace:**\n- `std::thread worker(background_task);` — starts the background thread.\n- `worker.detach();` — relinquishes control. The `worker` variable no longer represents the hardware thread.\n- `return 0;` — the main thread finishes and the process exits. Because the process exits, the operating system forcibly terminates the detached thread before it finishes sleeping. The final print never happens.',
                '**CS lens.** This embodies daemon threads or fire-and-forget execution. Also recognized in: garbage collectors, asynchronous telemetry reporters, OS background services.',
                '**SE lens.** The alternative is manually tracking the lifecycle of every background thread and joining them all before exit. Detaching is convenient but dangerous: if a detached thread accesses variables that the main thread destroys (like local variables passed by reference), it will read invalid memory. Modern C++ heavily favors joining or structured concurrency over detaching to guarantee safety.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <thread>\n#include <chrono>\n\nvoid background_task() {\n    std::this_thread::sleep_for(std::chrono::milliseconds(50));\n    std::cout << "Background task finished.\\n";\n}\n\nint main() {\n    std::thread worker(background_task);\n    worker.detach();\n    \n    std::cout << "Main thread finished.\\n";\n    return 0;\n}',
              expectedOutput: 'Main thread finished.',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Data Races',
              prose: [
                'Threads are rarely entirely independent; they usually need to read or write shared state. If two threads modify the exact same variable at the exact same time, the memory operations conflict, causing silent data corruption.',
                '## First, In Isolation',
                '```cpp\nshared_total = shared_total + 1;\n```',
                '## How the Code Works',
                '- `int shared_total = 0;` — a global variable. It resides in memory accessible to all threads in the process.\n- `shared_total = shared_total + 1;` — the site of the data race. Because `t1` and `t2` execute this simultaneously without coordination, their reads and writes overlap.\n**Execution Trace:**\n- Thread `t1` reads `shared_total` (e.g., 50).\n- Thread `t2` reads `shared_total` (also 50, because `t1` hasn\'t written the new value yet).\n- Thread `t1` adds 1 and writes 51 back to memory.\n- Thread `t2` adds 1 and writes 51 back to memory.\nBoth loops advanced, but the total only increased by 1 instead of 2.',
                '**CS lens.** This embodies a race condition, specifically a data race. Also recognized in: database transaction anomalies (lost updates), file system overwrites when two processes edit the same file, double-booking a ticket in a distributed system.',
                '**SE lens.** The alternative is running the loops sequentially, which yields correct data but takes twice as long. By parallelizing without synchronization, we achieved speed at the cost of correctness. In C++, a data race is officially Undefined Behavior (UB), meaning the compiler is allowed to optimize the loop assuming it never happens, potentially generating code that crashes completely rather than just miscalculating.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <thread>\n\nint shared_total = 0;\n\nvoid add_to_total() {\n    for (int i = 0; i < 100000; ++i) {\n        shared_total = shared_total + 1;\n    }\n}\n\nint main() {\n    std::thread t1(add_to_total);\n    std::thread t2(add_to_total);\n    \n    t1.join();\n    t2.join();\n    \n    std::cout << "Expected 200000, got: " << shared_total << "\\n";\n    return 0;\n}',
              expectedOutput: 'Expected 200000, got: 114382',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'std::mutex',
              prose: [
                'We need a mechanism to lock the critical section of code. When one thread begins reading and modifying the total, any other thread must be forced to stop and wait until the first thread finishes writing.',
                '## First, In Isolation',
                '```cpp\ntotal_mutex.lock();\n// Exclusive access here\ntotal_mutex.unlock();\n```',
                '## How the Code Works',
                '- `#include <mutex>` — first appearance. Pulls in the standard library\'s synchronization primitives.\n- `std::mutex total_mutex;` — first appearance. Instantiates a global mutex object. It starts in an unlocked state.\n- `total_mutex.lock();` — first appearance. Attempts to acquire exclusive ownership. If `t1` calls this while `t2` already holds the lock, `t1` halts and waits entirely until `t2` releases it.\n- `total_mutex.unlock();` — first appearance. Relinquishes ownership. The OS instantly wakes up one of the waiting threads (if any) and hands it the lock.\n**Execution Trace:**\n- Thread `t1` locks the mutex.\n- Thread `t2` tries to lock the mutex, but fails. It goes to sleep.\n- Thread `t1` reads (50), adds (1), and writes (51).\n- Thread `t1` unlocks the mutex.\n- Thread `t2` wakes up, acquires the lock, reads (51), adds (1), and writes (52).\nData integrity is preserved.',
                '**CS lens.** This embodies a critical section protected by a lock. Also recognized in: database row locks, file locks during saves, semaphore signals in hardware interrupts.',
                '**SE lens.** The alternative is lock-free programming using atomic variables (e.g., `std::atomic<int>`). Atomics are faster for simple counters because they rely on hardware instructions rather than OS scheduling. However, mutexes are required when updating multiple variables at once or protecting complex data structures like `std::vector`, making them the fundamental building block of thread safety. The cost of a mutex is performance contention: threads spend time sleeping instead of working.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <thread>\n#include <mutex>\n\nint shared_total = 0;\nstd::mutex total_mutex;\n\nvoid add_to_total() {\n    for (int i = 0; i < 100000; ++i) {\n        total_mutex.lock();\n        shared_total = shared_total + 1;\n        total_mutex.unlock();\n    }\n}\n\nint main() {\n    std::thread t1(add_to_total);\n    std::thread t2(add_to_total);\n    \n    t1.join();\n    t2.join();\n    \n    std::cout << "Expected 200000, got: " << shared_total << "\\n";\n    return 0;\n}',
              expectedOutput: 'Expected 200000, got: 200000',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'std::lock_guard',
              prose: [
                'If a function throws an exception or hits a `return` statement while holding a manual lock, it skips the `unlock()` call. The mutex remains locked permanently, freezing any other thread that attempts to acquire it. We need a way to guarantee the mutex is unlocked no matter how the function exits.',
                '## First, In Isolation',
                '```cpp\n{\n    std::lock_guard<std::mutex> guard(total_mutex);\n    // Exclusive access here\n} // Unlocked automatically here\n```',
                '## How the Code Works',
                '- `std::lock_guard<std::mutex>` — first appearance. A template class that manages a mutex. We specify `std::mutex` as the type of mutex it will hold.\n- `guard(total_mutex);` — constructs the object named `guard`. The constructor immediately calls `total_mutex.lock()`.\n- *Missing `unlock()`* — because `guard` is a local variable inside the `for` loop body, it goes out of scope and is destroyed at the end of every single iteration. Its destructor automatically calls `total_mutex.unlock()`. This happens even if an exception is thrown inside the loop. This is the **RAII** pattern (covered in Lesson 08), which guarantees cleanup by binding it to scope.',
                '**CS lens.** This embodies deterministic resource management and exception safety. Also recognized in: smart pointers automatically freeing memory, file streams automatically closing their handles, database transactions automatically rolling back if not committed.',
                '**SE lens.** The alternative is wrapping the critical section in a `try/catch` block and manually calling `unlock()` in both the success and error paths. This is tedious, error-prone, and violates DRY (Don\'t Repeat Yourself). `std::lock_guard` costs zero runtime overhead compared to manual locking but guarantees structural safety. Modern C++ guidelines mandate that `lock()` and `unlock()` should almost never be called manually.'
              ],
              typeIt: true,
              solution: 'void add_to_total() {\n    for (int i = 0; i < 100000; ++i) {\n        std::lock_guard<std::mutex> guard(total_mutex);\n        shared_total = shared_total + 1;\n    }\n}',
              expectedOutput: 'Expected 200000, got: 200000',
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
      'Next lesson: std::atomic and Lock-Free Patterns.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Undefined behavior (UB)"?',
      options: [
        'a situation where the C++ standard provides no guarantees about what a program will do, allowing it to crash, produce garbage, or appear to work normally. It exists It is the tradeoff C++ makes for maximum performance; instead of the compiler adding safety checks that slow down every operation, it assumes the programmer follows the rules, and if they don\'t, the execution contract is void.',
        'an independent sequence of execution within a program that the operating system schedules on a CPU core. It exists It allows a single process to execute multiple functions simultaneously, maximizing hardware utilization.',
        'a condition where two or more threads access the same memory location simultaneously, and at least one is writing to it. It exists It is the fundamental concurrency bug; without enforced ordering, threads read and write at unpredictable nanosecond intervals, destroying intermediate state.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Data race"?',
      options: [
        'an independent sequence of execution within a program that the operating system schedules on a CPU core. It exists It allows a single process to execute multiple functions simultaneously, maximizing hardware utilization.',
        'a condition where two or more threads access the same memory location simultaneously, and at least one is writing to it. It exists It is the fundamental concurrency bug; without enforced ordering, threads read and write at unpredictable nanosecond intervals, destroying intermediate state.',
        'a situation where the C++ standard provides no guarantees about what a program will do, allowing it to crash, produce garbage, or appear to work normally. It exists It is the tradeoff C++ makes for maximum performance; instead of the compiler adding safety checks that slow down every operation, it assumes the programmer follows the rules, and if they don\'t, the execution contract is void.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Thread"?',
      options: [
        'an independent sequence of execution within a program that the operating system schedules on a CPU core. It exists It allows a single process to execute multiple functions simultaneously, maximizing hardware utilization.',
        'a condition where two or more threads access the same memory location simultaneously, and at least one is writing to it. It exists It is the fundamental concurrency bug; without enforced ordering, threads read and write at unpredictable nanosecond intervals, destroying intermediate state.',
        'a situation where the C++ standard provides no guarantees about what a program will do, allowing it to crash, produce garbage, or appear to work normally. It exists It is the tradeoff C++ makes for maximum performance; instead of the compiler adding safety checks that slow down every operation, it assumes the programmer follows the rules, and if they don\'t, the execution contract is void.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Thread** — an independent sequence of execution within a program that the operating system schedules on a CPU core. It exists It allows a single process to execute multiple functions simultaneously, maximizing hardware utilization.',
    '**Data race** — a condition where two or more threads access the same memory location simultaneously, and at least one is writing to it. It exists It is the fundamental concurrency bug; without enforced ordering, threads read and write at unpredictable nanosecond intervals, destroying intermediate state.',
    '**Undefined behavior (UB)** — a situation where the C++ standard provides no guarantees about what a program will do, allowing it to crash, produce garbage, or appear to work normally. It exists It is the tradeoff C++ makes for maximum performance; instead of the compiler adding safety checks that slow down every operation, it assumes the programmer follows the rules, and if they don\'t, the execution contract is void.',
  ],

  checkpoints: ['read-intuition'],
}
