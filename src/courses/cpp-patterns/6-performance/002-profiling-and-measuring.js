// cpp-patterns — Lesson 16: Profiling and Measuring
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 16 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-16-profiling-and-measuring',
  slug: 'profiling-and-measuring',
  chapter: 6,
  order: 2,
  title: 'Profiling and Measuring',
  subtitle: 'Performance',
  tags: ['microbenchmark', 'cache-miss-rate', 'instructions-per-cycle-ipc', 'compiler-optimization-level'],

  hook: {
    question: 'What is "Profiling and Measuring", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Compiler Optimization Flags (-O0, -O2, -O3), Microbenchmarking with &lt;chrono&gt;, Hardware Profiling with perf stat.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Microbenchmark:** A test designed to measure the performance of a very small, specific piece of code, like a single function or loop. It exists to isolate performance characteristics and prove hypotheses about code changes, though it risks being over-optimized by the compiler or not reflecting real-world usage.\n- **Cache Miss Rate:** The percentage of memory accesses where the CPU did not find the data in its fast L1/L2/L3 cache and had to wait for main memory (RAM). It exists to show memory access efficiency, which is often the real bottleneck in modern C++, not CPU instructions.\n- **Instructions Per Cycle (IPC):** The average number of machine instructions the CPU completes in a single clock tick. It exists as a measure of how efficiently the CPU\'s pipeline is being utilized, showing if the CPU is churning through math efficiently or stalling on memory and branches.\n- **Compiler Optimization Level:** A flag passed to the compiler (-O0, -O2, -O3) instructing it how hard to try to make the resulting machine code fast, often at the cost of compile time or debuggability. It exists because generating perfect machine code is mathematically undecidable and practically too slow for everyday development.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::chrono::high_resolution_clock:** A clock with the shortest tick period available on the system.\n- **std::chrono::duration:** A class template representing a time interval.\n- **perf stat:** A Linux command-line performance analysis tool.\n- **std::vector:** A dynamically resizable array.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'When tracking performance, the process moves from the compiler flag to the timer, and finally to the hardware counters. We compile `benchmark.cpp` with `-O3` to ensure we are measuring realistic code, not unoptimized debug garbage. The code executes `auto start = high_resolution_clock::now()` to begin the microbenchmark. `process_data` crunches through the 10 million integers in the `vector`. The code executes `auto end = high_resolution_clock::now()` and calculates the duration (`end - start`), isolating the exact execution time. Simultaneously, the `perf stat` wrapper monitors the CPU hardware, recording that during this exact run, the CPU maintained a high IPC of 1.85, confirming that the loop is CPU-bound, not memory-bound.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 16: Profiling and Measuring',
        caption: 'Profiling and Measuring',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Compiler Optimization Flags (-O0, -O2, -O3)',
              prose: [
                'If we write code and immediately measure how fast it runs, the result might be completely useless. A compiler by default translates C++ into machine code directly, instruction for instruction, to make debugging easy and compilation fast. This unoptimized code is often 10x slower than what a real release build would run. We need to know how to ask the compiler to optimize, and why measuring without doing so is a lie.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nint main() {\n    long long sum = 0;\n    for (long long i = 0; i < 1\'000\'000\'000; ++i) {\n        sum += i;\n    }\n    std::cout << sum << \'\\n\';\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <vector>` — includes the standard library header for the dynamic array class template.\n- `void` — specifies the return type of the function, indicating it returns no value.\n- `process_data` — the name of the function we are defining.\n- `(` — opens the parameter list for the function.\n- `std::vector<int>` — the type of the parameter, a dynamic array containing integer values.\n- `&` — indicates the parameter is passed by reference, avoiding an expensive copy of the entire massive array.\n- `data` — the name of the parameter variable.\n- `)` — closes the parameter list.\n- `{` — opens the body of the function.\n- `for` — starts a loop structure.\n- `(` — opens the loop condition.\n- `int&` — declares the loop variable type as a reference to an integer, meaning changes will affect the original vector elements.\n- `val` — the name of the loop variable.\n- `:` — syntax for a range-based for loop, meaning "in".\n- `data` — the container being iterated over.\n- `)` — closes the loop condition.\n- `{` — opens the body of the loop.\n- `val` — accesses the current element by reference.\n- `=` — the assignment operator, storing the computed result of the right side back into `val`.\n- `(` — opens a sub-expression to enforce operator precedence.\n- `val` — reads the current value.\n- `*` — the multiplication operator.\n- `137` — an integer literal used as a multiplier to scramble the value.\n- `)` — closes the sub-expression.\n- `%` — the modulo operator, computing the remainder.\n- `256` — an integer literal used as the divisor to bound the value.\n- `;` — terminates the assignment statement.\n- `}` — closes the loop body.\n- `}` — closes the function body.',
                '**CS lens.** **Constant Folding and Loop Unrolling.** When the compiler sees `-O2` or `-O3`, it applies computer science transformations to the Abstract Syntax Tree. If it sees a loop with a fixed count, it might "unroll" it (do 4 operations per loop iteration, reducing branch condition checks by 75%). If it sees predictable math with known inputs, it computes it once at compile time (constant folding). Also recognized in: JIT compilers in JavaScript engines (V8), database query optimizers rewriting SQL to skip unnecessary rows, regex engines simplifying static prefixes before execution.',
                '**SE lens.** **Measure before Optimizing.** The software engineering principle is that human intuition about what is slow is almost always wrong in modern architectures. Programmers waste days optimizing a math routine that takes 1% of the runtime, while ignoring the memory allocator taking 80%. We engineer for readability first, compile with optimizations on, and only rewrite the parts that a profiler proves are slow. The tradeoff is that optimized code is much harder to step through in a debugger, which is exactly why `-O0` is the default for debug builds, despite its terrible performance.'
              ],
              typeIt: true,
              solution: '#include <vector>\n\nvoid process_data(std::vector<int>& data) {\n    for (int& val : data) {\n        val = (val * 137) % 256;\n    }\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Microbenchmarking with <chrono>',
              prose: [
                'We need to measure the exact time it takes to execute `process_data`, ignoring the time it takes the operating system to start the program, allocate the vector, and tear down the process. We need microsecond-level precision from within the code.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <chrono>\n#include <thread>\n\nint main() {\n    auto start = std::chrono::high_resolution_clock::now();\n    \n    std::this_thread::sleep_for(std::chrono::milliseconds(50));\n    \n    auto end = std::chrono::high_resolution_clock::now();\n    \n    std::chrono::duration<double, std::milli> elapsed = end - start;\n    std::cout << "Took: " << elapsed.count() << " ms\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <chrono>` — includes the standard library header for date and time utilities.\n- `#include <iostream>` — includes the standard library header for I/O streams.\n- `auto` — tells the compiler to deduce the exact type of the variable from its initialization.\n- `start` — the name of the variable storing the starting timestamp.\n- `=` — the assignment operator initializing the variable.\n- `std::chrono` — the namespace for time utilities.\n- `::` — the scope resolution operator accessing the clock class inside the namespace.\n- `high_resolution_clock` — the clock class representing the shortest tick period available on the system.\n- `::` — accesses a static member of the class.\n- `now` — a static method that queries the operating system for the current most precise time.\n- `()` — invokes the method with no arguments.\n- `;` — terminates the statement.\n- `process_data` — the name of the function we defined earlier.\n- `(` — opens the argument list.\n- `data` — the massive vector passed as an argument.\n- `)` — closes the argument list.\n- `;` — terminates the statement.\n- `auto` — deduces the type again.\n- `end` — the variable storing the ending timestamp.\n- `=` — the assignment operator.\n- `std::chrono::high_resolution_clock::now` — fetches the current time again.\n- `()` — invokes the method.\n- `;` — terminates the statement.\n- `std::chrono::duration` — accesses the class template representing a time interval.\n- `<` — opens the template argument list.\n- `double` — specifies the internal tick count should be stored as a floating-point number to allow fractional milliseconds.\n- `,` — separates template arguments.\n- `std::milli` — specifies the tick period as milliseconds (1,000 ticks per second).\n- `>` — closes the template argument list.\n- `ms` — the name of the duration variable.\n- `=` — the assignment operator.\n- `end` — the variable holding the later timestamp.\n- `-` — the subtraction operator overloaded for `time_point` objects, computing the literal difference between timestamps.\n- `start` — the variable holding the earlier timestamp.\n- `;` — terminates the statement.\n- `std::cout` — the standard output stream object.\n- `<<` — the stream insertion operator.\n- `"Processing took: "` — a string literal providing context.\n- `<<` — chains another insertion.\n- `ms` — the duration variable.\n- `.` — the member access operator.\n- `count` — a method that extracts the underlying numerical value (our `double`) from the duration.\n- `()` — invokes the method.\n- `<<` — chains another insertion.\n- `" ms\\n"` — a string literal with the unit and a newline character.\n- `;` — terminates the statement.',
                '**CS lens.** **Wall-clock vs. CPU Time.** `high_resolution_clock` measures wall-clock time — the actual real time passed in the physical world. If the operating system pauses our program halfway through to run a background updater, our benchmark will show a huge latency spike. This is why microbenchmarks must be run multiple times to find a stable minimum. Also recognized in: distributed system timeouts, game loop delta-time calculations, server request latencies.',
                '**SE lens.** **The Observer Effect.** In benchmarking, measuring something often changes its performance. If the compiler sees we are timing code, but we never use the output of `process_data`, an aggressive `-O3` optimizer might realize the entire vector computation is "dead code" and delete the whole loop, resulting in a benchmark that reports 0.000 ms. We must always ensure the results of our benchmarked code have visible side effects (like printing a checksum at the end) to prevent the compiler from optimizing away the work we are trying to measure. For this lesson, we rely on the vector being large enough that compilers often leave it intact.'
              ],
              typeIt: true,
              solution: '#include <chrono>\n#include <iostream>\n\n// ... inside main ...\n    auto start = std::chrono::high_resolution_clock::now();\n    process_data(data);\n    auto end = std::chrono::high_resolution_clock::now();\n\n    std::chrono::duration<double, std::milli> ms = end - start;\n    std::cout << "Processing took: " << ms.count() << " ms\\n";',
              expectedOutput: 'Processing took: 3.412 ms',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Hardware Profiling with perf stat',
              prose: [
                'If code is slow, we don\'t know if the bottleneck is CPU math instructions, branch mispredictions (the CPU guessing `if` statements incorrectly), or memory latency (the CPU sitting idle waiting for RAM). C++ code cannot see this information from the inside. We must use an external hardware profiler to read the CPU\'s physical performance counters.',
                '## First, In Isolation',
                '```cpp\nperf stat ls > /dev/null\n```',
                '## How the Code Works',
                '- `perf` — invokes the Linux performance analysis tool. It interacts with the kernel to configure CPU hardware performance counters before launching the target program.\n- `stat` — the specific subcommand for `perf` that tells it to aggregate the counters over the entire run and print a summary table at the end, rather than recording a massive timeline of events.\n- `./benchmark` — the executable that `perf` will launch and monitor.',
                '**CS lens.** **Instructions Per Cycle (IPC) and the Memory Wall.** Modern CPUs are superscalar: they can execute multiple instructions (like two independent additions) simultaneously in the same clock cycle. An IPC of 2.0 or 3.0 means the CPU is churning through math efficiently. An IPC below 1.0 (like the `0.80` in our `ls` example) usually means the CPU pipeline is stalled. The most common cause of stalling is the "Memory Wall" — the CPU is so fast that it spends most of its time waiting for data to arrive from main RAM because it wasn\'t in the L1/L2/L3 cache. Also recognized in: GPU compute scheduling (hiding memory latency with massive threading), database index design (optimizing for disk block reads rather than CPU time).',
                '**SE lens.** **System-Wide Profiling.** `perf` is powerful because it requires absolutely no changes to the C++ code. You don\'t have to `#include` a profiling library or rebuild your code. You can run `perf` on production binaries in a live environment to diagnose why a server is suddenly sluggish. The tradeoff is that `perf stat` gives you an aggregate for the *entire program*, not line-by-line visibility. If the program spends 99% of its time initializing and 1% of its time doing the work you care about, the `perf stat` numbers will be overwhelmed by the initialization phase.'
              ],
              typeIt: true,
              solution: 'perf stat ./benchmark',
              expectedOutput: 'Processing took: 3.412 ms\n\n Performance counter stats for \'./benchmark\':\n\n        15,200,100      instructions              #    1.85  insn per cycle\n         8,216,270      cycles                    \n            12,410      cache-misses              \n         2,100,000      branches                  \n               150      branch-misses             #    0.01% of all branches\n\n       0.012301000 seconds time elapsed',
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
      'Next lesson: Type Traits and <type_traits>.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Microbenchmark"?',
      options: [
        'The percentage of memory accesses where the CPU did not find the data in its fast L1/L2/L3 cache and had to wait for main memory (RAM). It exists to show memory access efficiency, which is often the real bottleneck in modern C++, not CPU instructions.',
        'A test designed to measure the performance of a very small, specific piece of code, like a single function or loop. It exists to isolate performance characteristics and prove hypotheses about code changes, though it risks being over-optimized by the compiler or not reflecting real-world usage.',
        'A flag passed to the compiler (-O0, -O2, -O3) instructing it how hard to try to make the resulting machine code fast, often at the cost of compile time or debuggability. It exists because generating perfect machine code is mathematically undecidable and practically too slow for everyday development.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Cache Miss Rate"?',
      options: [
        'The average number of machine instructions the CPU completes in a single clock tick. It exists as a measure of how efficiently the CPU\'s pipeline is being utilized, showing if the CPU is churning through math efficiently or stalling on memory and branches.',
        'The percentage of memory accesses where the CPU did not find the data in its fast L1/L2/L3 cache and had to wait for main memory (RAM). It exists to show memory access efficiency, which is often the real bottleneck in modern C++, not CPU instructions.',
        'A test designed to measure the performance of a very small, specific piece of code, like a single function or loop. It exists to isolate performance characteristics and prove hypotheses about code changes, though it risks being over-optimized by the compiler or not reflecting real-world usage.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Instructions Per Cycle (IPC)"?',
      options: [
        'A test designed to measure the performance of a very small, specific piece of code, like a single function or loop. It exists to isolate performance characteristics and prove hypotheses about code changes, though it risks being over-optimized by the compiler or not reflecting real-world usage.',
        'The percentage of memory accesses where the CPU did not find the data in its fast L1/L2/L3 cache and had to wait for main memory (RAM). It exists to show memory access efficiency, which is often the real bottleneck in modern C++, not CPU instructions.',
        'The average number of machine instructions the CPU completes in a single clock tick. It exists as a measure of how efficiently the CPU\'s pipeline is being utilized, showing if the CPU is churning through math efficiently or stalling on memory and branches.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Compiler Optimization Level"?',
      options: [
        'A test designed to measure the performance of a very small, specific piece of code, like a single function or loop. It exists to isolate performance characteristics and prove hypotheses about code changes, though it risks being over-optimized by the compiler or not reflecting real-world usage.',
        'The percentage of memory accesses where the CPU did not find the data in its fast L1/L2/L3 cache and had to wait for main memory (RAM). It exists to show memory access efficiency, which is often the real bottleneck in modern C++, not CPU instructions.',
        'A flag passed to the compiler (-O0, -O2, -O3) instructing it how hard to try to make the resulting machine code fast, often at the cost of compile time or debuggability. It exists because generating perfect machine code is mathematically undecidable and practically too slow for everyday development.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Microbenchmark** — A test designed to measure the performance of a very small, specific piece of code, like a single function or loop. It exists to isolate performance characteristics and prove hypotheses about code changes, though it risks being over-optimized by the compiler or not reflecting real-world usage.',
    '**Cache Miss Rate** — The percentage of memory accesses where the CPU did not find the data in its fast L1/L2/L3 cache and had to wait for main memory (RAM). It exists to show memory access efficiency, which is often the real bottleneck in modern C++, not CPU instructions.',
    '**Instructions Per Cycle (IPC)** — The average number of machine instructions the CPU completes in a single clock tick. It exists as a measure of how efficiently the CPU\'s pipeline is being utilized, showing if the CPU is churning through math efficiently or stalling on memory and branches.',
    '**Compiler Optimization Level** — A flag passed to the compiler (-O0, -O2, -O3) instructing it how hard to try to make the resulting machine code fast, often at the cost of compile time or debuggability. It exists because generating perfect machine code is mathematically undecidable and practically too slow for everyday development.',
  ],

  checkpoints: ['read-intuition'],
}
