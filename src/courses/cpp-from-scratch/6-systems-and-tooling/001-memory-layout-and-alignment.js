// cpp-from-scratch — Lesson 31: Memory Layout and Alignment
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 31 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-31-memory-layout-and-alignment',
  slug: 'memory-layout-and-alignment',
  chapter: 6,
  order: 1,
  title: 'Memory Layout and Alignment',
  subtitle: 'Systems and Tooling',
  tags: ['alignment', 'padding', 'packing', 'cache-line'],

  hook: {
    question: 'What is "Memory Layout and Alignment", and why does it matter?',
    realWorldContext: 'A series of isolated console programs that allocate structures in memory, measure their size and alignment requirements, and manipulate how the compiler pads and packs them. You will observe how the physical architecture of the CPU influences the logical layout of data in C++.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: sizeof and Basic Sizes, alignof and Alignment Requirements, Struct Padding, #pragma pack, alignas and Cache-Line Alignment.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Alignment:** the requirement that certain types of data must be placed in memory at addresses that are multiples of a specific byte boundary. It exists because modern CPUs read memory in chunks (like 4 or 8 bytes) rather than byte-by-byte; placing data at unaligned addresses forces the CPU to perform multiple reads and stitch the data together, crushing performance or even causing hardware faults.\n- **Padding:** empty, unused bytes automatically inserted by the compiler between members of a struct or class. It exists to satisfy the alignment requirements of the subsequent members, ensuring the CPU can read them efficiently, even if it wastes some memory space.\n- **Packing:** the deliberate instruction to the compiler to disable padding and pack data members as tightly as possible. It exists to match strict binary layouts required by network protocols, file formats, or hardware registers, trading CPU read efficiency for exact spatial control.\n- **Cache Line:** the fixed-size chunk of memory (typically 64 bytes) that the CPU fetches into its high-speed cache at one time. It exists to exploit spatial locality—when a program accesses one variable, it is statistically likely to access adjacent variables, so loading them together drastically reduces memory access latency.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **sizeof:** A compile-time operator that returns the size, in bytes, of a type or variable.\n- **alignof:** A compile-time operator that returns the alignment requirement, in bytes, of a specific type.\n- **alignas:** A specifier used to force a custom, stricter alignment requirement on a type or variable.\n- **#pragma pack:** A compiler directive that temporarily changes the maximum alignment for struct members.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how memory layout tools give you absolute control over the physical reality of your data: You use `sizeof` to measure a struct and realize it\'s larger than you expected. You use `alignof` to discover the boundaries the compiler is enforcing, realizing that padding is being inserted to protect memory access speed. If you are writing a network driver and must perfectly match a protocol, you use `#pragma pack` to strip the padding away, accepting the performance hit. If you are writing a high-frequency trading algorithm and need threads to operate without cache interference, you use `alignas` to artificially inflate the alignment, burning memory to guarantee cache isolation. C++ does not abstract the hardware away; it gives you the tools to command it.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you ignore memory alignment when interacting with raw binary data, your program will interpret bytes incorrectly. Create a file named `break_padding.cpp`: \n\n```cpp\n#include <iostream>\n#include <cstring>\n\nstruct Header {\n    char type;\n    int id;\n};\n\nint main() {\n    // 5 raw bytes simulating a network packet (1 byte type \'A\', 4 byte int \'256\')\n    char rawBytes[5] = {\'A\', 0, 1, 0, 0}; \n\n    Header h;\n    // We copy the 5 bytes directly into the struct\n    std::memcpy(&h, rawBytes, 5);\n\n    std::cout << "Type: " << h.type << "\\n";\n    std::cout << "ID: " << h.id << "\\n";\n\n    return 0;\n}\n```\n\nRun it. **The error/output:** \n\n```\nType: A\nID: 0\n```\n\nThe `id` is completely wrong (it should be 256). Why? Because `Header` contains 3 padding bytes after `type`. `std::memcpy` blindly copied the data, shoving the important bytes of the ID into the useless padding space. The actual `h.id` integer was filled with zeros or garbage. To fix it, you must use `#pragma pack(push, 1)` around `Header` so its physical layout exactly matches the raw bytes.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Create a struct with a `char`, a `double`, and an `int` in that order. Print its `sizeof`. Then rearrange the members to `double`, `int`, `char` and print its `sizeof` again. Prove to yourself that the order of declaration changes the total memory footprint.\n- Apply `#pragma pack(push, 1)` to the first struct from Exercise 1. Print its `sizeof` to verify that all padding is removed, regardless of the order.\n- Create an array of two `alignas(64)` structs. Print the memory address of the first element (`&arr[0]`) and the second element (`&arr[1]`). Subtract them (or visually inspect the hex) to prove they are exactly 64 bytes apart.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written and executed code that uses `sizeof` and `alignof` to measure data types.\n- [ ] You have proven that struct member ordering affects total size due to padding.\n- [ ] You have used `#pragma pack(push, 1)` to disable padding and evaluate the raw packed size.\n- [ ] You have used `alignas` to inflate alignment to cache-line boundaries.\n- [ ] You can explain the tradeoff between memory packing and CPU access speed out loud to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 31: Memory Layout and Alignment',
        caption: 'Memory Layout and Alignment',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'sizeof and Basic Sizes',
              prose: [
                'When you declare variables, the computer allocates memory for them. To understand how memory is structured, you first need a way to measure exactly how many bytes a specific data type consumes.',
                '## How the Code Works',
                '- `#include <iostream>` imports the standard input/output stream library, allowing us to print to the console.\n- `int main() { ... }` defines the entry point of the C++ program.\n- `int score = 100;` allocates memory for a 32-bit integer.\n- `double temperature = 98.6;` allocates memory for a double-precision floating-point number.\n- `char grade = \'A\';` allocates memory for a single character.\n- `sizeof(score)` evaluates, at compile-time, exactly how many bytes the `int` type requires on this specific architecture. It does not evaluate the value `100`; it evaluates the physical storage requirement of `int`.\n- `sizeof(temperature)` evaluates the bytes required to store a double-precision floating-point number.\n- `sizeof(grade)` evaluates the bytes required to store a single character.\n- `std::cout << ... << "\\n";` prints the resulting sizes to the standard output.',
                '**CS lens.** This embodies the concept of Hardware-Dependent Types. Unlike languages that guarantee an `int` is always exactly 32 bits everywhere, C++ types are often sized based on what is most efficient for the target CPU architecture. `sizeof` is the bridge that allows your code to adapt to the physical machine it is compiled for.',
                '**SE lens.** The engineering principle is avoiding hardcoded assumptions. The alternative not chosen is typing `4` instead of `sizeof(int)`. The tradeoff of hardcoding `4` is that while it saves a few keystrokes, the code will silently break when compiled on a different architecture where `int` might be 2 bytes or 8 bytes. `sizeof` guarantees correctness across platforms.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int score = 100;\n    double temperature = 98.6;\n    char grade = \'A\';\n\n    std::cout << "Size of int: " << sizeof(score) << " bytes\\n";\n    std::cout << "Size of double: " << sizeof(temperature) << " bytes\\n";\n    std::cout << "Size of char: " << sizeof(grade) << " bytes\\n";\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'alignof and Alignment Requirements',
              prose: [
                'Knowing the size of a variable is only half the picture. CPUs do not like reading data from arbitrary memory addresses. If a 4-byte integer starts at an odd address (like byte 3), the CPU might have to perform two memory reads to fetch it, stitching the halves together. We need to see the rules the compiler enforces to prevent this.',
                '## How the Code Works',
                '- `alignof(int)` is a compile-time operator that returns the alignment requirement for the `int` type. It answers the question: "What multiple must this type\'s memory address be?" If it returns 4, an `int` can only be placed at memory addresses ending in 0, 4, 8, or C (in hex).\n- `alignof(double)` checks the alignment for a `double`. Because a `double` is larger, it typically demands a stricter alignment, often 8 bytes, so the CPU can load all 64 bits in a single aligned memory fetch.\n- `alignof(char)` checks the alignment for a `char`. Because a `char` is exactly 1 byte, it can be placed at any memory address, so its alignment is always 1.',
                '**CS lens.** This embodies Memory Alignment. Hardware memory is not a continuous, featureless ribbon of bytes; it is organized into "words" (chunks of 4 or 8 bytes). Accessing a word-aligned address is a single hardware instruction. Accessing an unaligned address spans across two physical memory words, forcing the hardware to issue two reads, mask out the unwanted bytes, and shift the remaining bytes together.',
                '**SE lens.** The alternative not chosen is allowing unaligned access by default to save memory. The tradeoff C++ makes is prioritizing speed over space. By enforcing alignment, C++ guarantees the fastest possible memory access on the target hardware, accepting that this might leave small gaps in memory to push subsequent variables to the next aligned boundary.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    std::cout << "Alignment of int: " << alignof(int) << " bytes\\n";\n    std::cout << "Alignment of double: " << alignof(double) << " bytes\\n";\n    std::cout << "Alignment of char: " << alignof(char) << " bytes\\n";\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Struct Padding',
              prose: [
                'When you group multiple variables into a `struct`, you might expect the total size of the `struct` to be the exact sum of its members\' sizes. However, because the compiler enforces the alignment rules we just saw, it must insert invisible gaps to ensure every member lands on its required boundary.',
                '## How the Code Works',
                '- `struct PlayerState { ... };` defines a custom data type grouping three variables.\n- `char active;` is placed first. It takes 1 byte.\n- `int health;` requires 4-byte alignment. It cannot sit immediately after `active` at byte offset 1, because 1 is not a multiple of 4. The compiler silently inserts 3 bytes of padding. `health` begins at byte offset 4.\n- `char team;` takes 1 byte. It is placed immediately after `health` at byte offset 8.\n- `sizeof(PlayerState)` evaluates the total size of the struct. The compiler must also pad the *end* of the struct so that if we create an array of `PlayerState` objects, the `health` integer in the *second* element remains correctly aligned. Since the strictest alignment in the struct is 4 (for `int`), the total size of the struct must be a multiple of 4. The current layout takes 9 bytes (1 + 3 pad + 4 + 1), so 3 more padding bytes are added at the end, bringing the total to 12 bytes.',
                '**CS lens.** This embodies Structural Padding. The physical layout in memory looks like this: `[char] [pad] [pad] [pad] [int] [int] [int] [int] [char] [pad] [pad] [pad]`. The order you declare members in a struct drastically affects how much memory is wasted. Reordering this struct to `[int] [char] [char]` would drop its total size from 12 bytes to 8 bytes.',
                '**SE lens.** The tradeoff is developer convenience vs memory efficiency. The compiler will never automatically reorder your struct members to save space, because C++ guarantees that the memory layout matches your declaration order (vital for compatibility with C APIs). If memory footprint matters—such as having a million `PlayerState` objects in an array—it is the engineer\'s responsibility to arrange members from largest to smallest to minimize padding waste.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct PlayerState {\n    char active;      // 1 byte\n    int health;       // 4 bytes\n    char team;        // 1 byte\n};\n\nint main() {\n    std::cout << "Size of active: " << sizeof(char) << " bytes\\n";\n    std::cout << "Size of health: " << sizeof(int) << " bytes\\n";\n    std::cout << "Size of team: " << sizeof(char) << " bytes\\n";\n    std::cout << "Sum of members: 6 bytes\\n";\n    std::cout << "Actual Size of PlayerState: " << sizeof(PlayerState) << " bytes\\n";\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: '#pragma pack',
              prose: [
                'Sometimes you *cannot* have padding. If you are reading a raw binary file from disk (like a bitmap image header) or receiving a strict network packet, the bytes arrive packed tightly together. If your C++ struct contains hidden padding, reading the raw bytes directly into the struct will misalign the data, writing network bytes into padding spaces and destroying the values.',
                '## How the Code Works',
                '- `#pragma pack(push, 1)` is a compiler directive instructing the compiler to temporarily change the maximum alignment requirement for struct members to 1 byte. "Push" saves the current default alignment rules, and "1" dictates that no member requires alignment greater than a 1-byte boundary.\n- `struct NetworkPacket { ... };` defines the structure under these new rules. Because maximum alignment is 1, `payloadID` (an `int`) is allowed to sit immediately after `packetType` at byte offset 1. No padding is inserted.\n- `#pragma pack(pop)` restores the compiler\'s normal alignment rules for any code that follows. This is critical so you do not accidentally disable padding for the rest of your program, which would cripple performance globally.\n- `sizeof(NetworkPacket)` evaluates to exactly 6 bytes (1 + 4 + 1). The compiler has stripped away the performance protections to give you exact spatial control.',
                '**CS lens.** This embodies Unaligned Memory Access. By packing the struct, you are forcing the CPU to fetch `payloadID` from an unaligned address. On some architectures (like x86), the CPU handles this automatically, but it takes more clock cycles. On other architectures (like older ARM), this will crash the program with a hardware fault (a Bus Error or Segmentation Fault).',
                '**SE lens.** The engineering principle is Exact Data Representation. The alternative not chosen is manually reading the data byte-by-byte and shifting it into variables with bitwise operators. The tradeoff `#pragma pack` makes is sacrificing CPU access speed (and risking hardware faults on some platforms) to gain immense simplicity when serializing or deserializing strict binary formats.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\n#pragma pack(push, 1)\nstruct NetworkPacket {\n    char packetType;  // 1 byte\n    int payloadID;    // 4 bytes\n    char checksum;    // 1 byte\n};\n#pragma pack(pop)\n\nint main() {\n    std::cout << "Packed Size of NetworkPacket: " << sizeof(NetworkPacket) << " bytes\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'alignas and Cache-Line Alignment',
              prose: [
                'Sometimes the compiler\'s default alignment isn\'t strict enough. Modern CPUs fetch memory from RAM into their ultra-fast L1 cache in blocks of 64 bytes, called "cache lines". If two independent variables (like lock variables used by different threads) happen to fall into the exact same 64-byte cache line, modifying one will invalidate the cache for the other, causing a massive performance collapse known as "False Sharing". You need a way to force a variable onto its own dedicated cache line.',
                '## How the Code Works',
                '- `struct StandardData { int value; };` creates a normal struct. Its alignment is driven by its largest member, `int`, so its alignment is 4, and its size is 4.\n- `struct alignas(64) CacheLineData { int value; };` applies the `alignas` specifier to the struct definition. `alignas(64)` dictates that this struct must be placed at a memory address that is a multiple of 64.\n- `alignof(CacheLineData)` evaluates to 64, proving that the compiler is now enforcing the custom boundary.\n- `sizeof(CacheLineData)` evaluates to 64. Because the struct *must* be 64-byte aligned, its size must also be a multiple of 64 so that arrays of `CacheLineData` continue to satisfy the alignment. The compiler automatically pads the struct with 60 bytes of empty space to fill the 64-byte requirement.',
                '**CS lens.** This embodies Spatial Locality and Cache Architecture. A cache line is the smallest unit of data transfer between RAM and the CPU cache. By aligning to 64 bytes, you guarantee that `CacheLineData` begins at the exact start of a new cache line, and because its size is padded to 64 bytes, you guarantee it occupies the entire cache line alone. No other variables can physically share that cache line.',
                '**SE lens.** The alternative not chosen is manually inserting 60 bytes of dummy variables (`char pad[60];`) to push the size up. The tradeoff of using `alignas(64)` is a significant waste of memory (60 bytes thrown away per object) in exchange for absolute protection against False Sharing in high-performance multithreaded systems. You only use this when profiling proves that cache invalidation is the bottleneck.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct StandardData {\n    int value;\n};\n\nstruct alignas(64) CacheLineData {\n    int value;\n};\n\nint main() {\n    std::cout << "Alignment of StandardData: " << alignof(StandardData) << " bytes\\n";\n    std::cout << "Size of StandardData: " << sizeof(StandardData) << " bytes\\n";\n\n    std::cout << "Alignment of CacheLineData: " << alignof(CacheLineData) << " bytes\\n";\n    std::cout << "Size of CacheLineData: " << sizeof(CacheLineData) << " bytes\\n";\n\n    return 0;\n}',
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
      'Next lesson: The Build System.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Alignment"?',
      options: [
        'the fixed-size chunk of memory (typically 64 bytes) that the CPU fetches into its high-speed cache at one time. It exists to exploit spatial locality—when a program accesses one variable, it is statistically likely to access adjacent variables, so loading them together drastically reduces memory access latency.',
        'the requirement that certain types of data must be placed in memory at addresses that are multiples of a specific byte boundary. It exists because modern CPUs read memory in chunks (like 4 or 8 bytes) rather than byte-by-byte; placing data at unaligned addresses forces the CPU to perform multiple reads and stitch the data together, crushing performance or even causing hardware faults.',
        'the deliberate instruction to the compiler to disable padding and pack data members as tightly as possible. It exists to match strict binary layouts required by network protocols, file formats, or hardware registers, trading CPU read efficiency for exact spatial control.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Packing"?',
      options: [
        'the deliberate instruction to the compiler to disable padding and pack data members as tightly as possible. It exists to match strict binary layouts required by network protocols, file formats, or hardware registers, trading CPU read efficiency for exact spatial control.',
        'empty, unused bytes automatically inserted by the compiler between members of a struct or class. It exists to satisfy the alignment requirements of the subsequent members, ensuring the CPU can read them efficiently, even if it wastes some memory space.',
        'the requirement that certain types of data must be placed in memory at addresses that are multiples of a specific byte boundary. It exists because modern CPUs read memory in chunks (like 4 or 8 bytes) rather than byte-by-byte; placing data at unaligned addresses forces the CPU to perform multiple reads and stitch the data together, crushing performance or even causing hardware faults.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Cache Line"?',
      options: [
        'the deliberate instruction to the compiler to disable padding and pack data members as tightly as possible. It exists to match strict binary layouts required by network protocols, file formats, or hardware registers, trading CPU read efficiency for exact spatial control.',
        'the requirement that certain types of data must be placed in memory at addresses that are multiples of a specific byte boundary. It exists because modern CPUs read memory in chunks (like 4 or 8 bytes) rather than byte-by-byte; placing data at unaligned addresses forces the CPU to perform multiple reads and stitch the data together, crushing performance or even causing hardware faults.',
        'the fixed-size chunk of memory (typically 64 bytes) that the CPU fetches into its high-speed cache at one time. It exists to exploit spatial locality—when a program accesses one variable, it is statistically likely to access adjacent variables, so loading them together drastically reduces memory access latency.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Padding"?',
      options: [
        'the deliberate instruction to the compiler to disable padding and pack data members as tightly as possible. It exists to match strict binary layouts required by network protocols, file formats, or hardware registers, trading CPU read efficiency for exact spatial control.',
        'the requirement that certain types of data must be placed in memory at addresses that are multiples of a specific byte boundary. It exists because modern CPUs read memory in chunks (like 4 or 8 bytes) rather than byte-by-byte; placing data at unaligned addresses forces the CPU to perform multiple reads and stitch the data together, crushing performance or even causing hardware faults.',
        'empty, unused bytes automatically inserted by the compiler between members of a struct or class. It exists to satisfy the alignment requirements of the subsequent members, ensuring the CPU can read them efficiently, even if it wastes some memory space.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Alignment** — the requirement that certain types of data must be placed in memory at addresses that are multiples of a specific byte boundary. It exists because modern CPUs read memory in chunks (like 4 or 8 bytes) rather than byte-by-byte; placing data at unaligned addresses forces the CPU to perform multiple reads and stitch the data together, crushing performance or even causing hardware faults.',
    '**Padding** — empty, unused bytes automatically inserted by the compiler between members of a struct or class. It exists to satisfy the alignment requirements of the subsequent members, ensuring the CPU can read them efficiently, even if it wastes some memory space.',
    '**Packing** — the deliberate instruction to the compiler to disable padding and pack data members as tightly as possible. It exists to match strict binary layouts required by network protocols, file formats, or hardware registers, trading CPU read efficiency for exact spatial control.',
    '**Cache Line** — the fixed-size chunk of memory (typically 64 bytes) that the CPU fetches into its high-speed cache at one time. It exists to exploit spatial locality—when a program accesses one variable, it is statistically likely to access adjacent variables, so loading them together drastically reduces memory access latency.',
  ],

  checkpoints: ['read-intuition'],
}
