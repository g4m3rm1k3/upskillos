// cpp-from-scratch — Lesson 28: std::atomic and Lock-Free Patterns
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 28 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-28-std-atomic-and-lock-free-patterns',
  slug: 'std-atomic-and-lock-free-patterns',
  chapter: 5,
  order: 2,
  title: 'std::atomic and Lock-Free Patterns',
  subtitle: 'Concurrency',
  tags: ['lock-free', 'data-race', 'memory-ordering'],

  hook: {
    question: 'What is "std::atomic and Lock-Free Patterns", and why does it matter?',
    realWorldContext: 'You will build a multi-threaded counter and evaluate compound operations that share data between threads without using a mutex. This proves you can synchronize state with zero blocking overhead, solving the problem of performance bottlenecks caused by heavy thread contention, while recognizing the boundaries of where lock-free patterns actually apply.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: The Atomic Counter, Memory Ordering and relaxed, Why Atomics Do Not Replace Mutexes.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Lock-free:** a property of an algorithm where at least one thread is always guaranteed to make progress, regardless of whether other threads are suspended or delayed. It exists It provides predictable performance and avoids deadlocks, unlike mutex-based code where a thread holding a lock can halt the entire system if it gets preempted.\n- **Data race:** undefined behavior that occurs when two threads access the same memory location simultaneously, and at least one access is a write. It exists Hardware and compilers reorder instructions assuming single-threaded execution; data races are the formal term for when this assumption breaks down across multiple threads.\n- **Memory ordering:** the set of rules that dictate how memory operations (reads and writes) in one thread become visible to other threads. It exists Modern CPUs use caches and out-of-order execution. Memory ordering tells the CPU and compiler which operations must strictly happen before others to maintain logical correctness.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::atomic:** A standard library template that encapsulates a value and guarantees that operations on it are indivisible (atomic) and free of data races.\n- **std::memory_order:** An enumeration specifying the exact synchronization requirements for an atomic operation.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'When you use `std::atomic<T>`, you are leveraging hardware instructions to perform thread-safe operations on single variables without blocking. An atomic variable guarantees its own safety, preventing data races when multiple threads increment or flip it simultaneously. You can use `memory_order_relaxed` to squeeze out maximum performance if you don\'t care about the ordering of other variables. However, atomics cannot enforce invariants across multiple variables; for compound actions, you must still use a mutex.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you remove `std::atomic` and use a standard `int counter = 0`, then run `counter++` from multiple threads, the final counter value will be randomly lower than expected. The CPU interleaves the read and write instructions from different threads, overwriting increments.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Modify the counter example to use `counter.fetch_sub(1, std::memory_order_seq_cst)` and count down from 20000 to 0 across two threads.\n- Rewrite the bank transfer example using a `std::mutex` to prove that the audit thread will always see `Total funds: 200`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You can explain the difference between a data race on a standard `int` and a thread-safe increment on a `std::atomic<int>`.\n- [ ] You understand that `memory_order_relaxed` provides atomicity but not instruction ordering.\n- [ ] You can explain why `std::atomic` cannot replace a mutex when updating two related variables.\n- [ ] You can compile and run a C++ program using `<atomic>`.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 28: std::atomic and Lock-Free Patterns',
        caption: 'std::atomic and Lock-Free Patterns',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Atomic Counter',
              prose: [
                'If two threads increment a normal integer simultaneously, the CPU must read the value, add one, and write it back. If both threads read the value before either writes, one of the increments is overwritten and lost. This is a data race. Using a mutex fixes it, but pausing an entire thread and invoking the operating system just to protect a single addition is devastating to performance. We need a way to tell the hardware itself to perform the read-modify-write cycle as one indivisible step.',
                '## How the Code Works',
                '- `std::atomic<int> counter{0};` — creates an atomic wrapper around a standard integer, initialized to 0. It guarantees that any operation performed on `counter` will be thread-safe.\n- `counter++` — (which maps to `fetch_add(1)`) performs the read, addition, and write back to memory as a single, indivisible hardware operation. No other thread can see a half-finished update.\n- `counter.load()` — safely reads the current value of the atomic variable.',
                '**CS lens.** This is a hardware-level lock-free operation. Under the hood, the compiler translates `counter++` into specific CPU instructions (like `LOCK XADD` on x86) that lock the memory bus for a fraction of a nanosecond, preventing other CPU cores from accessing that memory address until the instruction finishes. It requires no OS-level context switching.',
                '**SE lens.** The alternative is wrapping the integer in a `std::mutex`. While that works, a mutex involves the operating system and can put the thread to sleep, costing thousands of clock cycles. Atomics resolve the conflict at the silicon level in dozens of cycles. However, atomics only protect exactly one variable at a time.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <thread>\n#include <atomic>\n#include <vector>\n\nint main() {\n    std::atomic<int> counter{0};\n\n    auto increment = [&]() {\n        for (int i = 0; i < 10000; ++i) {\n            counter++;\n        }\n    };\n\n    std::thread t1(increment);\n    std::thread t2(increment);\n    t1.join();\n    t2.join();\n\n    std::cout << "Final counter: " << counter.load() << "\\n";\n    return 0;\n}',
              expectedOutput: 'Final counter: 20000',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Memory Ordering and relaxed',
              prose: [
                'By default, every operation on a `std::atomic` uses a memory ordering called Sequential Consistency (`std::memory_order_seq_cst`). This prevents the CPU and compiler from reordering *any* memory operations around the atomic instruction. This is incredibly safe, but in a simple counter where we only care that the addition itself is atomic — and we don\'t care about the chronological order of other, unrelated variables — Sequential Consistency forces unnecessary stalls in the CPU\'s instruction pipeline.',
                '## How the Code Works',
                '- `counter.fetch_add(...)` — explicitly calls the addition function instead of using the `++` operator, because operators cannot take memory ordering arguments.\n- `1` — the value to add to the counter.\n- `std::memory_order_relaxed` — instructs the compiler and CPU that this operation must be atomic, but it places *no restrictions* on how this operation is ordered relative to other memory reads and writes in the program.',
                '**CS lens.** Modern CPUs execute instructions out of order to keep their pipelines full. `memory_order_seq_cst` forces a full memory barrier, flushing hardware queues and stalling the CPU. `memory_order_relaxed` says "just make sure the addition is indivisible, but feel free to reorder this instruction if it makes things faster."',
                '**SE lens.** The default behavior (`seq_cst`) is the alternative not chosen here. You should always default to `seq_cst` (which `++` and basic assignment use) because getting memory ordering wrong leads to impossible-to-reproduce bugs on different CPU architectures (like ARM vs x86). You only switch to `relaxed` in highly-profiled performance hotspots, such as reference counting, where synchronization of other data is handled elsewhere.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <thread>\n#include <atomic>\n\nint main() {\n    std::atomic<int> counter{0};\n\n    auto increment = [&]() {\n        for (int i = 0; i < 10000; ++i) {\n            counter.fetch_add(1, std::memory_order_relaxed);\n        }\n    };\n\n    std::thread t1(increment);\n    std::thread t2(increment);\n    t1.join();\n    t2.join();\n\n    std::cout << "Relaxed counter: " << counter.load() << "\\n";\n    return 0;\n}',
              expectedOutput: 'Relaxed counter: 20000',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Why Atomics Do Not Replace Mutexes',
              prose: [
                'Because atomics are lock-free and fast, a common mistake is trying to replace all mutexes with them. But atomics only guarantee the safety of *one* operation on *one* variable. If a system requires two variables to remain in sync — like transferring money between two accounts — atomics cannot prevent another thread from observing an invalid intermediate state between the two atomic operations.',
                '## How the Code Works',
                '- `accountA.fetch_sub(50)` — safely subtracts 50 from A.\n- `std::this_thread::sleep_for(...)` — artificially delays the thread to simulate being preempted by the operating system mid-transfer.\n- `accountB.fetch_add(50)` — safely adds 50 to B, but this hasn\'t happened yet.\n- `int total = accountA.load() + accountB.load();` — the audit thread runs while the transfer thread is asleep. It safely reads A (50) and B (100).',
                '**CS lens.** This demonstrates the difference between "atomicity" and "isolation". Each individual read and write is atomic, but the *transaction* (the transfer) is not isolated. A mutex provides critical section isolation, preventing the audit thread from observing the system midway through the transfer.',
                '**SE lens.** The alternative is using a `std::mutex`. A mutex allows you to define a compound action where multiple variables change at once, and no other thread can observe the partial changes. You must use a mutex when the invariant spans multiple variables. Atomics are for isolated counters and flags, not for coordinating complex state.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <thread>\n#include <atomic>\n#include <chrono>\n\nint main() {\n    std::atomic<int> accountA{100};\n    std::atomic<int> accountB{100};\n\n    auto transfer = [&]() {\n        accountA.fetch_sub(50);\n        // If the thread is preempted right here, 50 has vanished.\n        std::this_thread::sleep_for(std::chrono::milliseconds(10));\n        accountB.fetch_add(50);\n    };\n\n    auto audit = [&]() {\n        std::this_thread::sleep_for(std::chrono::milliseconds(5));\n        int total = accountA.load() + accountB.load();\n        std::cout << "Total funds during transfer: " << total << "\\n";\n    };\n\n    std::thread t1(transfer);\n    std::thread t2(audit);\n    t1.join();\n    t2.join();\n\n    return 0;\n}',
              expectedOutput: 'Total funds during transfer: 150',
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
      'Next lesson: Futures and Async.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Memory ordering"?',
      options: [
        'the set of rules that dictate how memory operations (reads and writes) in one thread become visible to other threads. It exists Modern CPUs use caches and out-of-order execution. Memory ordering tells the CPU and compiler which operations must strictly happen before others to maintain logical correctness.',
        'undefined behavior that occurs when two threads access the same memory location simultaneously, and at least one access is a write. It exists Hardware and compilers reorder instructions assuming single-threaded execution; data races are the formal term for when this assumption breaks down across multiple threads.',
        'a property of an algorithm where at least one thread is always guaranteed to make progress, regardless of whether other threads are suspended or delayed. It exists It provides predictable performance and avoids deadlocks, unlike mutex-based code where a thread holding a lock can halt the entire system if it gets preempted.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Lock-free"?',
      options: [
        'the set of rules that dictate how memory operations (reads and writes) in one thread become visible to other threads. It exists Modern CPUs use caches and out-of-order execution. Memory ordering tells the CPU and compiler which operations must strictly happen before others to maintain logical correctness.',
        'undefined behavior that occurs when two threads access the same memory location simultaneously, and at least one access is a write. It exists Hardware and compilers reorder instructions assuming single-threaded execution; data races are the formal term for when this assumption breaks down across multiple threads.',
        'a property of an algorithm where at least one thread is always guaranteed to make progress, regardless of whether other threads are suspended or delayed. It exists It provides predictable performance and avoids deadlocks, unlike mutex-based code where a thread holding a lock can halt the entire system if it gets preempted.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Data race"?',
      options: [
        'the set of rules that dictate how memory operations (reads and writes) in one thread become visible to other threads. It exists Modern CPUs use caches and out-of-order execution. Memory ordering tells the CPU and compiler which operations must strictly happen before others to maintain logical correctness.',
        'undefined behavior that occurs when two threads access the same memory location simultaneously, and at least one access is a write. It exists Hardware and compilers reorder instructions assuming single-threaded execution; data races are the formal term for when this assumption breaks down across multiple threads.',
        'a property of an algorithm where at least one thread is always guaranteed to make progress, regardless of whether other threads are suspended or delayed. It exists It provides predictable performance and avoids deadlocks, unlike mutex-based code where a thread holding a lock can halt the entire system if it gets preempted.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Lock-free** — a property of an algorithm where at least one thread is always guaranteed to make progress, regardless of whether other threads are suspended or delayed. It exists It provides predictable performance and avoids deadlocks, unlike mutex-based code where a thread holding a lock can halt the entire system if it gets preempted.',
    '**Data race** — undefined behavior that occurs when two threads access the same memory location simultaneously, and at least one access is a write. It exists Hardware and compilers reorder instructions assuming single-threaded execution; data races are the formal term for when this assumption breaks down across multiple threads.',
    '**Memory ordering** — the set of rules that dictate how memory operations (reads and writes) in one thread become visible to other threads. It exists Modern CPUs use caches and out-of-order execution. Memory ordering tells the CPU and compiler which operations must strictly happen before others to maintain logical correctness.',
  ],

  checkpoints: ['read-intuition'],
}
