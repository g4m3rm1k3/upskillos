// cpp-patterns — Lesson 15: Cache-Friendly Data Layouts
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 15 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-15-cache-friendly-data-layouts',
  slug: 'cache-friendly-data-layouts',
  chapter: 6,
  order: 1,
  title: 'Cache-Friendly Data Layouts',
  subtitle: 'Performance',
  tags: ['cache-line', 'array-of-structs-aos', 'struct-of-arrays-soa', 'false-sharing', 'microbenchmark'],

  hook: {
    question: 'What is "Cache-Friendly Data Layouts", and why does it matter?',
    realWorldContext: 'You will build a microbenchmark suite that measures the execution time of updating millions of entities, demonstrating the massive performance difference between cache-friendly and cache-hostile data layouts. The working feature is a particle physics update loop; the transferable problem is understanding how the CPU actually reads memory in 64-byte chunks, and how structuring your data to respect that physical reality (Struct of Arrays vs. Array of Structs) or isolating threads to avoid fighting over it (False Sharing) can yield order-of-magnitude performance gains without changing the algorithm itself.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: Microbenchmarking with std::chrono, Array of Structs (AoS), Struct of Arrays (SoA), False Sharing.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Cache Line:** The smallest unit of memory that the CPU fetches from main memory (RAM), typically 64 bytes. The CPU never fetches a single byte or a single integer on its own; it fetches an entire cache line at once. If the data your program needs next is contiguous to what it just processed, it is already sitting in the L1 cache, making it extremely fast. If it is scattered, the CPU wastes cycles waiting on RAM.\n- **Array of Structs (AoS):** A data layout where all properties of a single entity (e.g., position, velocity, color, name) are stored together in a struct, and an array holds many such structs side-by-side. This is the natural, intuitive object-oriented way to model data, but it is often cache-hostile if a loop only needs to read one specific property across all entities, because the CPU cache line fills up with the other unneeded properties.\n- **Struct of Arrays (SoA):** A data layout where each property across all entities is stored in its own separate, contiguous array. This is extremely cache-friendly for operations that process a single property (like adding velocity to position for all particles), because every single byte loaded into the CPU cache line is data the loop will actually use, maximizing memory throughput.\n- **False Sharing:** A severe performance degradation in multithreaded code where two independent threads modify completely independent variables, but those variables happen to reside right next to each other on the exact same 64-byte cache line. The CPU\'s cache coherency protocol sees a modification to the cache line and forces the other thread to invalidate and reload its own copy from RAM, creating a bottleneck that destroys the performance benefits of threading, even though no data is actually shared.\n- **Microbenchmark:** A small, isolated program designed specifically to measure the execution time of a specific, narrow code snippet or data layout. Used here to mathematically prove the effects of cache rather than guessing at them.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::chrono::high_resolution_clock:** A clock provided by the standard library that guarantees the highest possible precision available on the operating system.\n- **std::chrono::duration_cast:** A template function that translates a duration from one time unit or representation to another.\n- **alignas:** A language keyword that forces the compiler to align a variable or struct to a specific byte boundary in memory.\n- **std::hardware_destructive_interference_size:** A compile-time constant that defines the minimum byte offset between two objects to guarantee they will never experience false sharing. It perfectly matches the target architecture\'s cache line size (typically 64).',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: '**Connect the pieces** Execution Trace for a system hitting cache lines: 1. `std::vector<ParticleAoS>` is allocated. `p.x` and `p.r` live next to each other. 2. `updateAoS` requests `p.x`. The CPU fetches a 64-byte cache line containing `x`, `vx`, and the useless `r`, `g`, `b` data. 3. The next iteration of the loop asks for particle 2, which requires a brand new cache line fetch from RAM. Performance is slow. 4. `runFalseSharingTest` spawns threads. Thread 1 modifies `counterA`. The CPU locks the 64-byte cache line holding both `counterA` and `counterB`. 5. Thread 2 modifies `counterB`, forcing Thread 1\'s cache line to invalidate. Performance plummets. 6. `AlignedState` is used instead. `counterA` and `counterB` sit 64 bytes apart. Thread 1 locks its cache line, Thread 2 locks its entirely separate cache line. No invalidation occurs. **What breaks without this** Remove the `alignas` keyword from `AlignedState` and change `std::hardware_destructive_interference_size` to nothing. Compile and run. The "True Parallelism (Good)" test will immediately degrade to the exact same terrible 215ms performance as the "Bad" test, because the compiler will silently pack the variables back into the same 64-byte chunk. **Exercises** 1. Change the `padding` array in `ParticleAoS` to be much larger (e.g., `float padding[64];`). Rerun the benchmark to see how much worse the AoS performance gets as the struct size exceeds a single cache line. 2. In the `False Sharing` test, try adding an array `int padding[16];` between `counterA` and `counterB` in the `SharedState` struct instead of using `alignas`. Prove that manual padding achieves the same result as the keyword. **Definition of done** - [x] A microbenchmark suite is built using `std::chrono`. - [x] AoS and SoA data layouts are implemented and timed. - [x] False sharing is demonstrated and fixed using `alignas`. - [x] Commit: `git commit -m "Add cache layout benchmarks to prove SoA and False Sharing performance"` (Because performance must be proven with metrics, not guessed).',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 15: Cache-Friendly Data Layouts',
        caption: 'Cache-Friendly Data Layouts',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Microbenchmarking with std::chrono',
              prose: [
                'We are about to write code to prove that cache layouts matter. But performance differences at the CPU cache level happen in fractions of a millisecond. We cannot use standard logging or human counting to see which loop is faster; we need a precise, programmatic way to start a timer, run a loop millions of times, stop the timer, and report the exact duration.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <chrono>\n\nint main() {\n    // 1. Start the clock\n    auto start = std::chrono::high_resolution_clock::now();\n\n    // 2. Do the work\n    volatile int counter = 0;\n    for (int i = 0; i < 1\'000\'000\'000; ++i) {\n        counter++;\n    }\n\n    // 3. Stop the clock\n    auto end = std::chrono::high_resolution_clock::now();\n\n    // 4. Calculate the duration in milliseconds\n    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);\n    \n    std::cout << "Counting took: " << duration.count() << " ms\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `struct Timer {` — Defines a new data structure to hold our timing logic. We use a struct so that creating it is lightweight and its members are public by default.\n- `std::chrono::time_point<std::chrono::high_resolution_clock> start_time;` — Declares a member variable to hold the exact moment the timer begins. `std::chrono::time_point` represents a specific point in time, and the template parameter `std::chrono::high_resolution_clock` specifies which clock system provides that time.\n- `std::string name;` — Declares a string to hold the label for this specific benchmark run, so we know which output corresponds to which test.\n- `Timer(std::string timer_name) : name(timer_name) {` — The constructor, which takes the label and initializes the `name` member variable using a member initializer list.\n- `start_time = std::chrono::high_resolution_clock::now();` — Calls the static `now()` method on the high-resolution clock to capture the current time, storing it in `start_time`.\n- `~Timer() {` — The destructor, which is automatically called by the language when the `Timer` object goes out of scope. This is the core mechanism of the RAII (Resource Acquisition Is Initialization) pattern.\n- `auto end_time = std::chrono::high_resolution_clock::now();` — Calls `now()` again the exact moment the destructor runs, capturing the finish line.\n- `auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);` — Subtracts the start time from the end time to get a duration, and immediately passes that result into `std::chrono::duration_cast<std::chrono::milliseconds>()`. This template function converts the internal, opaque tick-count into human-readable milliseconds.\n- `std::cout << name << " took " << duration.count() << " ms\\n";` — Calls `.count()` on the millisecond duration object to extract the raw integer value, and prints it alongside the timer\'s name.',
                '**CS lens.** This specific mechanism — tying the start of an action to a constructor, and the end of the action to a destructor — is an application of RAII (Resource Acquisition Is Initialization). Also recognized in: file handle closures, mutex unlocking (`std::lock_guard`), database connection pooling, and OpenGL context management.',
                '**SE lens.** We engineered this as an RAII object rather than requiring the caller to manually write `start()` and `stop()` methods. The alternative — forcing the developer to explicitly call `stop()` at the end of every benchmark — creates a high risk of maintenance failure. If a benchmark function returns early or throws an exception, a manual `stop()` call might be bypassed, breaking the measurement or leaving the system in an unknown state. By tying the measurement to the destructor, the compiler absolutely guarantees the timer will stop exactly when the block ends, no matter how the block is exited.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <chrono>\n\nstruct Timer {\n    std::chrono::time_point<std::chrono::high_resolution_clock> start_time;\n    std::string name;\n\n    Timer(std::string timer_name) : name(timer_name) {\n        start_time = std::chrono::high_resolution_clock::now();\n    }\n\n    ~Timer() {\n        auto end_time = std::chrono::high_resolution_clock::now();\n        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);\n        std::cout << name << " took " << duration.count() << " ms\\n";\n    }\n};',
              expectedOutput: './benchmark',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Array of Structs (AoS)',
              prose: [
                'We need to model a system of 10 million particles in a simulation. Each particle has a position, a velocity, a color, and a mass. We want to write a loop that updates every particle\'s position by adding its velocity. We will build this the standard, intuitive way first, and then measure how fast it runs.',
                '## First, In Isolation',
                '```cpp\n#include <vector>\n\nstruct ParticleAoS {\n    float x, y, z;\n    float vx, vy, vz;\n    int r, g, b, a;\n    float mass;\n    float padding[4]; // Simulate other unused data\n};\n\nint main() {\n    std::vector<ParticleAoS> particles(5);\n    particles[0].x += particles[0].vx;\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `struct ParticleAoS {` — Defines the traditional entity model where all properties belong to a single struct.\n- `float x, y, z;` — Declares the position variables.\n- `float vx, vy, vz;` — Declares the velocity variables.\n- `int r, g, b, a;` — Declares color variables that are entirely irrelevant to the physics update.\n- `float mass;` — Declares a mass variable, also unused in the basic position update.\n- `float padding[12];` — Adds an array of unused floats. This simulates the reality of production structs, which often grow large as features are added (name strings, collision shapes, flags). It artificially bloats the struct size to roughly 96 bytes.\n- `void updateAoS(std::vector<ParticleAoS>& particles) {` — Defines a function that takes the massive vector of particles by reference.\n- `Timer t("AoS Update");` — Instantiates our RAII timer. The moment this is created, the clock starts.\n- `for (auto& p : particles) {` — A range-based for loop that iterates over every particle by reference.\n- `p.x += p.vx;` — Adds the X velocity to the X position.\n- `p.y += p.vy;` — Adds the Y velocity to the Y position.\n- `p.z += p.vz;` — Adds the Z velocity to the Z position.',
                '**CS lens.** This layout represents object-oriented design taken literally at the memory level: an object is a single contiguous block of state. The CPU reads memory in 64-byte Cache Lines. Our `ParticleAoS` is roughly 96 bytes. When the CPU goes to read `p.x` and `p.vx` for the first particle, it pulls 64 bytes of memory into its L1 cache. It gets the position and velocity, but it also pulls in the color, the mass, and some of the padding. By the time it moves to the second particle, it has to fetch an entirely new cache line from RAM, because the first cache line was filled with color and padding data that the loop never looked at. The CPU is spending the vast majority of its time waiting on RAM to deliver data, not actually doing math. This is a memory-bound algorithm.',
                '**SE lens.** We engineered this using an Array of Structs because it is the most intuitive way for a human to read and write the code. "A particle has a position and a velocity." The alternative — breaking the particle into pieces — violates object-oriented encapsulation and makes the codebase harder to reason about at a domain level. The massive failure cost here is performance: the hardware physically penalizes this layout for operations that only touch a slice of the data, forcing a brutal tradeoff between human readability and machine efficiency.'
              ],
              typeIt: true,
              solution: 'struct ParticleAoS {\n    float x, y, z;\n    float vx, vy, vz;\n    int r, g, b, a;\n    float mass;\n    float padding[12]; \n};\n\nvoid updateAoS(std::vector<ParticleAoS>& particles) {\n    Timer t("AoS Update");\n    for (auto& p : particles) {\n        p.x += p.vx;\n        p.y += p.vy;\n        p.z += p.vz;\n    }\n}',
              expectedOutput: 'AoS Update took 45 ms',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Struct of Arrays (SoA)',
              prose: [
                'The CPU cache line is 64 bytes. In the AoS approach, we filled those 64 bytes with color and padding data we didn\'t need, forcing the CPU to fetch from RAM constantly. We need to restructure the data so that when the CPU fetches a 64-byte cache line, it receives exactly 64 bytes of pure position and velocity data, perfectly utilizing the fetch and eliminating RAM waiting time.',
                '## First, In Isolation',
                '```cpp\n#include <vector>\n\nstruct ParticleSoA {\n    std::vector<float> x, y, z;\n    std::vector<float> vx, vy, vz;\n    std::vector<int> r, g, b, a;\n    std::vector<float> mass;\n};\n\nint main() {\n    ParticleSoA particles;\n    particles.x.push_back(1.0f);\n    particles.vx.push_back(0.5f);\n    \n    particles.x[0] += particles.vx[0];\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `struct ParticleSoA {` — Defines the inverted data container. There is no single "Particle" object anymore.\n- `std::vector<float> x, y, z;` — Declares contiguous arrays specifically for positions.\n- `std::vector<float> vx, vy, vz;` — Declares contiguous arrays specifically for velocities.\n- `ParticleSoA(size_t size) {` — A constructor to immediately allocate space for all particles.\n- `x.resize(size);` — Pre-allocates the exact number of slots needed. `std::vector::resize` guarantees the memory is contiguous.\n- `void updateSoA(ParticleSoA& particles, size_t count) {` — Defines the update function for the new layout.\n- `Timer t("SoA Update");` — Instantiates the RAII timer for this specific loop.\n- `for (size_t i = 0; i < count; ++i) {` — Uses a raw index loop, because the "particle" is just an index across multiple arrays.\n- `particles.x[i] += particles.vx[i];` — Looks up the X position at index `i` and adds the X velocity at index `i`.\n- `particles.y[i] += particles.vy[i];` — Performs the Y addition.\n- `particles.z[i] += particles.vz[i];` — Performs the Z addition.',
                '**CS lens.** This is Data-Oriented Design. By storing all the `x` values in one array, and all the `vx` values in another array, we have perfectly aligned our data with the hardware\'s 64-byte Cache Line reality. When the CPU fetches `particles.x[0]` from RAM, the 64-byte cache line it receives contains `x[0]`, `x[1]`, `x[2]`, all the way up to `x[15]` (since a float is 4 bytes). The next 15 iterations of the loop require absolutely zero trips to RAM. The CPU streams the data at maximum bandwidth. The color and padding arrays are entirely ignored and never loaded into the cache at all. Also recognized in: high-performance game engines (Entity Component Systems), database column stores (Parquet, Redshift), and GPU compute pipelines.',
                '**SE lens.** We engineered this layout to prioritize hardware reality over domain modeling. The alternative — keeping the AoS layout — maintains object-oriented purity but sacrifices extreme performance. The maintenance cost of SoA is that the code is harder to read, entities are spread across multiple variables, and adding or removing a single particle requires modifying a dozen different vectors instead of just pushing one object. It is a deliberate, heavy tradeoff used only in critical hot-paths.'
              ],
              typeIt: true,
              solution: 'struct ParticleSoA {\n    std::vector<float> x, y, z;\n    std::vector<float> vx, vy, vz;\n    std::vector<int> r, g, b, a;\n    std::vector<float> mass;\n    std::vector<float> padding; \n\n    ParticleSoA(size_t size) {\n        x.resize(size); y.resize(size); z.resize(size);\n        vx.resize(size); vy.resize(size); vz.resize(size);\n        r.resize(size); g.resize(size); b.resize(size); a.resize(size);\n        mass.resize(size);\n        padding.resize(size * 12); \n    }\n};\n\nvoid updateSoA(ParticleSoA& particles, size_t count) {\n    Timer t("SoA Update");\n    for (size_t i = 0; i < count; ++i) {\n        particles.x[i] += particles.vx[i];\n        particles.y[i] += particles.vy[i];\n        particles.z[i] += particles.vz[i];\n    }\n}',
              expectedOutput: 'AoS Update took 45 ms\nSoA Update took 11 ms',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'False Sharing',
              prose: [
                'We want to speed up a counter by splitting the work across two threads. If Thread A increments one counter, and Thread B increments a different counter, they should run completely in parallel. But if those two separate counters happen to live right next to each other in memory, the CPU\'s cache protocol will choke, and the threaded code will actually run slower than the single-threaded code.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nstruct BadCounters {\n    int threadA_count;\n    int threadB_count;\n};\n\nstruct GoodCounters {\n    alignas(64) int threadA_count;\n    alignas(64) int threadB_count;\n};\n\nint main() {\n    std::cout << "Bad size: " << sizeof(BadCounters) << " bytes\\n";\n    std::cout << "Good size: " << sizeof(GoodCounters) << " bytes\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `struct SharedState {` — Defines the natural, tightly packed data structure.\n- `int counterA = 0;` — The variable Thread 1 will modify.\n- `int counterB = 0;` — The completely unrelated variable Thread 2 will modify. Because they are adjacent, they reside on the same 64-byte cache line.\n- `struct AlignedState {` — Defines the cache-aware data structure.\n- `alignas(std::hardware_destructive_interference_size)` — Uses the `alignas` core language keyword, passing in `std::hardware_destructive_interference_size`. This constant from `<new>` asks the compiler "what is the cache line size of the architecture you are currently compiling for?" and injects that exact number (usually 64 or 128) into the alignment directive.\n- `int counterA = 0;` — The variable Thread 1 will modify, now guaranteed to sit at the exact start of its own dedicated cache line.\n- `template<typename State> void runFalseSharingTest(std::string name) {` — A template function so we can pass in either the bad struct or the good struct and run the exact same logic.\n- `State state;` — Instantiates the chosen struct.\n- `Timer t(name);` — Starts the timer.\n- `auto workerA = [&]() {` — Defines a lambda, capturing the local `state` variable by reference.\n- `for (int i = 0; i < 100\'000\'000; ++i) { state.counterA++; }` — A tight loop aggressively mutating `counterA`.\n- `std::thread t1(workerA);` — Spawns the first OS thread to run the `workerA` lambda.\n- `t1.join(); t2.join();` — Blocks the main thread until both background threads finish their loops.',
                '**CS lens.** This proves the existence of the CPU Cache Coherency Protocol (often MESI: Modified, Exclusive, Shared, Invalid). When Thread 1 modifies `counterA`, the CPU modifies the *entire 64-byte cache line* sitting in Thread 1\'s core. The hardware must guarantee that no other core acts on stale data. So, it sends an invalidation signal across the motherboard to Thread 2\'s core, wiping out Thread 2\'s cache line. When Thread 2 tries to modify `counterB`, it suffers a cache miss, fetches the line from RAM, modifies `counterB`, and sends an invalidation signal right back to Thread 1. The two cores play ping-pong with the cache line millions of times a second. Even though the variables are different, the *cache line* is shared. This is called **False Sharing**.',
                '**SE lens.** We engineered the solution using `std::hardware_destructive_interference_size` rather than hardcoding `alignas(64)`. The alternative — hardcoding 64 — creates subtle performance bugs when the code is compiled for architectures with 128-byte cache lines (like some ARM chips). By relying on the standard library constant, the code dynamically adapts to the target hardware at compile time, completely eliminating the maintenance debt of chasing architecture-specific numbers.'
              ],
              typeIt: true,
              solution: '#include <thread>\n#include <new>\n\nstruct SharedState {\n    int counterA = 0;\n    int counterB = 0;\n};\n\nstruct AlignedState {\n    alignas(std::hardware_destructive_interference_size) int counterA = 0;\n    alignas(std::hardware_destructive_interference_size) int counterB = 0;\n};\n\ntemplate<typename State>\nvoid runFalseSharingTest(std::string name) {\n    State state;\n    Timer t(name);\n\n    auto workerA = [&]() {\n        for (int i = 0; i < 100\'000\'000; ++i) { state.counterA++; }\n    };\n    auto workerB = [&]() {\n        for (int i = 0; i < 100\'000\'000; ++i) { state.counterB++; }\n    };\n\n    std::thread t1(workerA);\n    std::thread t2(workerB);\n    t1.join();\n    t2.join();\n}',
              expectedOutput: 'AoS Update took 45 ms\nSoA Update took 11 ms\nFalse Sharing (Bad) took 215 ms\nTrue Parallelism (Good) took 38 ms',
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
      'Next lesson: Profiling and Measuring.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Array of Structs (AoS)"?',
      options: [
        'A data layout where all properties of a single entity (e.g., position, velocity, color, name) are stored together in a struct, and an array holds many such structs side-by-side. This is the natural, intuitive object-oriented way to model data, but it is often cache-hostile if a loop only needs to read one specific property across all entities, because the CPU cache line fills up with the other unneeded properties.',
        'A small, isolated program designed specifically to measure the execution time of a specific, narrow code snippet or data layout. Used here to mathematically prove the effects of cache rather than guessing at them.',
        'The smallest unit of memory that the CPU fetches from main memory (RAM), typically 64 bytes. The CPU never fetches a single byte or a single integer on its own; it fetches an entire cache line at once. If the data your program needs next is contiguous to what it just processed, it is already sitting in the L1 cache, making it extremely fast. If it is scattered, the CPU wastes cycles waiting on RAM.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Struct of Arrays (SoA)"?',
      options: [
        'A severe performance degradation in multithreaded code where two independent threads modify completely independent variables, but those variables happen to reside right next to each other on the exact same 64-byte cache line. The CPU\'s cache coherency protocol sees a modification to the cache line and forces the other thread to invalidate and reload its own copy from RAM, creating a bottleneck that destroys the performance benefits of threading, even though no data is actually shared.',
        'A data layout where each property across all entities is stored in its own separate, contiguous array. This is extremely cache-friendly for operations that process a single property (like adding velocity to position for all particles), because every single byte loaded into the CPU cache line is data the loop will actually use, maximizing memory throughput.',
        'The smallest unit of memory that the CPU fetches from main memory (RAM), typically 64 bytes. The CPU never fetches a single byte or a single integer on its own; it fetches an entire cache line at once. If the data your program needs next is contiguous to what it just processed, it is already sitting in the L1 cache, making it extremely fast. If it is scattered, the CPU wastes cycles waiting on RAM.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "False Sharing"?',
      options: [
        'A severe performance degradation in multithreaded code where two independent threads modify completely independent variables, but those variables happen to reside right next to each other on the exact same 64-byte cache line. The CPU\'s cache coherency protocol sees a modification to the cache line and forces the other thread to invalidate and reload its own copy from RAM, creating a bottleneck that destroys the performance benefits of threading, even though no data is actually shared.',
        'A data layout where each property across all entities is stored in its own separate, contiguous array. This is extremely cache-friendly for operations that process a single property (like adding velocity to position for all particles), because every single byte loaded into the CPU cache line is data the loop will actually use, maximizing memory throughput.',
        'The smallest unit of memory that the CPU fetches from main memory (RAM), typically 64 bytes. The CPU never fetches a single byte or a single integer on its own; it fetches an entire cache line at once. If the data your program needs next is contiguous to what it just processed, it is already sitting in the L1 cache, making it extremely fast. If it is scattered, the CPU wastes cycles waiting on RAM.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Microbenchmark"?',
      options: [
        'A small, isolated program designed specifically to measure the execution time of a specific, narrow code snippet or data layout. Used here to mathematically prove the effects of cache rather than guessing at them.',
        'The smallest unit of memory that the CPU fetches from main memory (RAM), typically 64 bytes. The CPU never fetches a single byte or a single integer on its own; it fetches an entire cache line at once. If the data your program needs next is contiguous to what it just processed, it is already sitting in the L1 cache, making it extremely fast. If it is scattered, the CPU wastes cycles waiting on RAM.',
        'A severe performance degradation in multithreaded code where two independent threads modify completely independent variables, but those variables happen to reside right next to each other on the exact same 64-byte cache line. The CPU\'s cache coherency protocol sees a modification to the cache line and forces the other thread to invalidate and reload its own copy from RAM, creating a bottleneck that destroys the performance benefits of threading, even though no data is actually shared.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Cache Line** — The smallest unit of memory that the CPU fetches from main memory (RAM), typically 64 bytes. The CPU never fetches a single byte or a single integer on its own; it fetches an entire cache line at once. If the data your program needs next is contiguous to what it just processed, it is already sitting in the L1 cache, making it extremely fast. If it is scattered, the CPU wastes cycles waiting on RAM.',
    '**Array of Structs (AoS)** — A data layout where all properties of a single entity (e.g., position, velocity, color, name) are stored together in a struct, and an array holds many such structs side-by-side. This is the natural, intuitive object-oriented way to model data, but it is often cache-hostile if a loop only needs to read one specific property across all entities, because the CPU cache line fills up with the other unneeded properties.',
    '**Struct of Arrays (SoA)** — A data layout where each property across all entities is stored in its own separate, contiguous array. This is extremely cache-friendly for operations that process a single property (like adding velocity to position for all particles), because every single byte loaded into the CPU cache line is data the loop will actually use, maximizing memory throughput.',
    '**False Sharing** — A severe performance degradation in multithreaded code where two independent threads modify completely independent variables, but those variables happen to reside right next to each other on the exact same 64-byte cache line. The CPU\'s cache coherency protocol sees a modification to the cache line and forces the other thread to invalidate and reload its own copy from RAM, creating a bottleneck that destroys the performance benefits of threading, even though no data is actually shared.',
    '**Microbenchmark** — A small, isolated program designed specifically to measure the execution time of a specific, narrow code snippet or data layout. Used here to mathematically prove the effects of cache rather than guessing at them.',
  ],

  checkpoints: ['read-intuition'],
}
