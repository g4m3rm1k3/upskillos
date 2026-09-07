// cpp-dsa — Lesson 2: Arrays and Contiguous Memory
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 02 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-02-arrays-and-contiguous-memory',
  slug: 'arrays-and-contiguous-memory',
  chapter: 1,
  order: 2,
  title: 'Arrays and Contiguous Memory',
  subtitle: 'Complexity and Recursion',
  tags: ['contiguous-memory', 'pointer-arithmetic', 'cache-locality-spatial-locality'],

  hook: {
    question: 'What is "Arrays and Contiguous Memory", and why does it matter?',
    realWorldContext: 'You will write isolated console programs that allocate raw blocks of memory, traverse them using raw pointer arithmetic, and verify how memory addresses map to array indices. The transferable problem this solves is understanding how contiguous memory fundamentally works, why it provides extreme performance via CPU caching, and why modern C++ wraps this exact mechanism inside `std::vector`.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: Raw Arrays and Contiguous Memory, Pointer Arithmetic as Array Indexing, Cache Locality, std::vector as the Correct Default.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Contiguous memory:** A single, unbroken block of memory addresses. It exists To allow predictable, sequential access to data, which physical hardware is heavily optimized to read quickly.\n- **Pointer arithmetic:** The mathematical addition or subtraction applied directly to a memory address. It exists To compute the exact location of subsequent elements in a block of memory dynamically, without needing a separate named pointer for each item.\n- **Cache locality (Spatial locality):** The hardware behavior where loading one byte from main RAM automatically pulls the adjacent bytes into the ultra-fast CPU cache. It exists Because programs that access one piece of data are highly likely to access the data right next to it immediately afterward, and fetching from main RAM is exceptionally slow.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **sizeof:** A compile-time operator that returns the size of a type or variable in bytes.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A raw array is just a contiguous block of bytes in memory. Because it is contiguous, accessing any element is an instantaneous `Base + (Index * Size)` math calculation, and the CPU cache hardware greedily pulls adjacent elements into fast memory automatically. Because manual pointer arrays cannot resize and easily lead to memory corruption, `std::vector` wraps this exact same contiguous architecture inside a safe, automatically resizing interface, making it the most important default container in C++.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you try to perform pointer arithmetic on elements that are not contiguous, the math will calculate an address pointing to garbage data. Modify the `std::vector` pointer code to point past the end of the data: \n\n```cpp\nint* internalPointer = dynamicSequence.data();\nstd::cout << *(internalPointer + 100) << "\\n";\n```\n\n**The runtime result:** Instead of a compiler error, the program compiles cleanly but will likely print `0` or a random garbage integer, or it will instantly crash with a `Segmentation fault`. Because pointer math blindly performs the calculation without bounds checking, it jumped out of the safe contiguous block and read memory that didn\'t belong to the array.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Size Verification:** Write a program that creates a raw array of `double` (which usually takes 8 bytes) and an array of `char` (which takes 1 byte). Print `sizeof(double)` and `sizeof(char)`. Then, print the addresses of index 0 and index 1 for both arrays. Verify that the memory addresses jump by 8 bytes for the double array, but only 1 byte for the char array.\n- **Reverse Traversal:** Create a `std::vector<int>` with five elements. Get the raw pointer using `.data()`. Write a `for` loop that uses raw pointer arithmetic (subtraction or decrementing) to print the array backwards, starting from `(pointer + 4)`.\n- **Manual Pointer Array:** Create a raw array `int data[3] = {5, 10, 15};`. Do not use brackets `[]` anywhere else in the code. Write a `for` loop to print all three elements using entirely pointer arithmetic and dereferencing (`*(ptr + i)`).',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run a raw array and printed its sequential memory addresses.\n- [ ] You have manually calculated an array element using `*(Base + Index)`.\n- [ ] You can explain out loud why a cache line makes contiguous arrays faster than linked objects.\n- [ ] You have proved that a `std::vector` is contiguous under the hood using the `.data()` method.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 2: Arrays and Contiguous Memory',
        caption: 'Arrays and Contiguous Memory',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Raw Arrays and Contiguous Memory',
              prose: [
                'If we want to hold multiple identical objects, we could allocate them individually, letting them land wherever there happens to be free space in memory. But managing a massive collection of disconnected pointers is chaotic and slow. We need a way to allocate a single, continuous block of memory for all of them at once, ensuring they sit perfectly shoulder-to-shoulder.',
                '## How the Code Works',
                '- `int sequence[4]`: Declares a raw, fixed-size array named `sequence` capable of holding exactly four integers. The compiler reserves this memory immediately as one single block.\n- `= {10, 20, 30, 40}`: An initializer list that populates the block of memory with these specific integer values sequentially, placing `10` at the start.\n- `sizeof(int)`: A compile-time operator that evaluates to the number of bytes a single integer requires (typically 4 bytes on modern systems).\n- `std::cout`: The standard character output stream, used to print text and memory addresses to the console.\n- `&sequence[0]`: The address-of operator `&` retrieves the exact memory address where the first element (`10`) begins. It prevents the compiler from reading the value `10` and instead forces it to reveal where the value lives.\n- `&sequence[1]`: Retrieves the memory address of the second element (`20`).',
                '**CS lens.** This is **contiguous allocation**. The array does not store any hidden metadata, pointers to the next element, or formatting information. It is literally just 16 bytes of raw memory (4 integers × 4 bytes each) packed tightly together without a single bit of wasted space between them.',
                '**SE lens.** The alternative not chosen is node-based allocation, where each element is allocated separately and stores a pointer to the next element (a linked list). The tradeoff here is rigid size: a raw contiguous array must have its size known and fixed in advance so the compiler can find a large enough continuous gap in memory, whereas individual nodes can be scattered wherever small fragments of memory are available.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int sequence[4] = {10, 20, 30, 40};\n\n    std::cout << "Size of one int: " << sizeof(int) << " bytes\\n";\n    std::cout << "Element 0 address: " << &sequence[0] << "\\n";\n    std::cout << "Element 1 address: " << &sequence[1] << "\\n";\n    std::cout << "Element 2 address: " << &sequence[2] << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Pointer Arithmetic as Array Indexing',
              prose: [
                'Now that we have a contiguous block, how does asking for `sequence[2]` actually find the third element? The compiler does not store a hidden map of indices to memory addresses. It must calculate the address dynamically. We need a way to move a pointer forward mathematically.',
                '## How the Code Works',
                '- `int sequence[4]`: Declares the contiguous memory block of four integers.\n- `int* basePointer`: Declares a raw pointer capable of holding the memory address of an integer.\n- `= &sequence[0]`: Assigns the precise starting address of the array to the pointer. This anchors our math to the start of the block.\n- `(basePointer + 2)`: This is pointer arithmetic. It takes the starting address and adds `2`. Because `basePointer` is an `int*`, the compiler automatically multiplies the `2` by `sizeof(int)`. It calculates the physical address of the third integer without looking at the array.\n- `*(...)`: The dereference operator. It goes to the newly calculated memory address, treats the memory there as an integer, and reads the value (`30`).',
                '**CS lens.** Array indexing is an illusion. The bracket syntax `sequence[i]` is purely syntactic sugar that the compiler immediately rewrites as `*(sequence + i)`. Indexing into an array is an instantaneous O(1) mathematical calculation: `Target Address = Base Address + (Index * Element Size)`. It does not require searching or traversing.',
                '**SE lens.** The engineering principle here is zero-overhead abstraction. C++ gives you the readable bracket syntax `[2]` but compiles it down to the exact same raw CPU instructions as doing the math manually. The tradeoff of this speed is zero bounds checking: if you ask for `*(basePointer + 100)`, C++ will happily do the math, read the random memory at that location, and likely crash your program or return garbage data.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int sequence[4] = {10, 20, 30, 40};\n    \n    int* basePointer = &sequence[0];\n    \n    std::cout << "Value via index [2]: " << sequence[2] << "\\n";\n    std::cout << "Address via pointer math: " << (basePointer + 2) << "\\n";\n    std::cout << "Value via pointer math: " << *(basePointer + 2) << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Cache Locality',
              prose: [
                'Why do we care so much that elements are physically next to each other in RAM? The CPU is capable of jumping to any memory address instantly. However, jumping to random RAM addresses is comparatively slow for the hardware. We need a memory layout that takes advantage of how the CPU actually fetches data.',
                '## How the Code Works',
                '- `int sequence[16];`: Allocates a contiguous block of 16 integers (64 bytes of memory).\n- `for (int i = 0; i < 16; i++)`: A loop that iterates sequentially from `0` to `15`.\n- `sequence[i] = i * 10;`: Writes data sequentially into the contiguous block.\n- `int sum = 0;`: A variable to accumulate the result.\n- `sum += sequence[i];`: Calculates the address of the next integer, fetches it from memory, and adds it to the running total.',
                '**CS lens.** This introduces **spatial locality** and CPU cache lines. Main RAM is physically distant from the CPU core and very slow. When the loop asks for `sequence[0]` from RAM, the memory controller does not fetch just 4 bytes. Hardware always fetches data in large chunks called "cache lines" (typically 64 bytes). Fetching `sequence[0]` unknowingly pulls the next 15 integers into the ultra-fast L1 CPU cache simultaneously. When the loop asks for `sequence[1]` through `sequence[15]`, the data is already inside the CPU.',
                '**SE lens.** The alternative not chosen is traversing elements scattered randomly across memory (like following a linked list). The tradeoff is immense performance degradation. If elements are scattered, every pointer dereference requires fetching a new 64-byte cache line from slow RAM, wasting 60 bytes of unrelated data each time. This is called a "cache miss." Contiguous arrays are the fastest data structure in modern computing because they perfectly align with hardware cache behavior.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nint main() {\n    int sequence[16];\n    \n    for (int i = 0; i < 16; i++) {\n        sequence[i] = i * 10;\n    }\n    \n    int sum = 0;\n    for (int i = 0; i < 16; i++) {\n        sum += sequence[i]; \n    }\n    \n    std::cout << "Final sum: " << sum << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'std::vector as the Correct Default',
              prose: [
                'Raw arrays are perfectly contiguous and highly cache-friendly, but they have a fatal flaw: their size is strictly fixed at compile time. Furthermore, if you pass a raw array to a function, it degrades into a simple raw pointer and forgets its own size, forcing you to pass the size as a second variable. We need the extreme performance of contiguous memory, but with dynamic sizing and intelligent length tracking.',
                '## How the Code Works',
                '- `#include <vector>`: Brings in the definition for `std::vector`, the standard library\'s dynamic array container.\n- `std::vector<int> dynamicSequence`: Instantiates a vector that safely manages its own memory on the heap.\n- `= {10, 20, 30, 40};`: Initializes the vector with four integers.\n- `int* internalPointer`: Declares a raw integer pointer.\n- `dynamicSequence.data()`: Calls a method on the vector that reaches inside its private state and returns a raw `int*` pointer to the very beginning of the contiguous memory block it allocated.\n- `&dynamicSequence[0]`: Uses standard indexing to get the address of the first element, identical to a raw array.\n- `*(internalPointer + 2)`: Performs raw pointer arithmetic on the vector\'s internal memory block, jumping exactly two integers forward and dereferencing the value (`30`), proving it operates identical to a raw array.',
                '**CS lens.** A `std::vector` is not a magic new data structure; it is an intelligent wrapper around a raw contiguous array. It dynamically allocates a raw array on the heap. When it runs out of space, it allocates a larger contiguous block, copies the data over, and frees the old block. This guarantees it maintains the exact same cache locality and O(1) indexing math as a raw array.',
                '**SE lens.** The alternative not chosen is writing manual pointer management for dynamic arrays every time. The tradeoff is that `std::vector` carries a very slight overhead to track its capacity and size, and occasionally pauses to reallocate memory. However, the engineering consensus is absolute: `std::vector` is the correct default collection in C++. It gives you the blistering cache speed of contiguous memory without the severe bugs and memory leaks associated with manual raw array management.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> dynamicSequence = {10, 20, 30, 40};\n    \n    int* internalPointer = dynamicSequence.data();\n    \n    std::cout << "Vector element 0 address: " << &dynamicSequence[0] << "\\n";\n    std::cout << "Internal pointer address: " << internalPointer << "\\n";\n    std::cout << "Internal pointer + 2 value: " << *(internalPointer + 2) << "\\n";\n    \n    return 0;\n}',
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
      'Next lesson: Recursion.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Pointer arithmetic"?',
      options: [
        'The mathematical addition or subtraction applied directly to a memory address. It exists To compute the exact location of subsequent elements in a block of memory dynamically, without needing a separate named pointer for each item.',
        'A single, unbroken block of memory addresses. It exists To allow predictable, sequential access to data, which physical hardware is heavily optimized to read quickly.',
        'The hardware behavior where loading one byte from main RAM automatically pulls the adjacent bytes into the ultra-fast CPU cache. It exists Because programs that access one piece of data are highly likely to access the data right next to it immediately afterward, and fetching from main RAM is exceptionally slow.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Contiguous memory"?',
      options: [
        'A single, unbroken block of memory addresses. It exists To allow predictable, sequential access to data, which physical hardware is heavily optimized to read quickly.',
        'The hardware behavior where loading one byte from main RAM automatically pulls the adjacent bytes into the ultra-fast CPU cache. It exists Because programs that access one piece of data are highly likely to access the data right next to it immediately afterward, and fetching from main RAM is exceptionally slow.',
        'The mathematical addition or subtraction applied directly to a memory address. It exists To compute the exact location of subsequent elements in a block of memory dynamically, without needing a separate named pointer for each item.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Cache locality (Spatial locality)"?',
      options: [
        'The hardware behavior where loading one byte from main RAM automatically pulls the adjacent bytes into the ultra-fast CPU cache. It exists Because programs that access one piece of data are highly likely to access the data right next to it immediately afterward, and fetching from main RAM is exceptionally slow.',
        'The mathematical addition or subtraction applied directly to a memory address. It exists To compute the exact location of subsequent elements in a block of memory dynamically, without needing a separate named pointer for each item.',
        'A single, unbroken block of memory addresses. It exists To allow predictable, sequential access to data, which physical hardware is heavily optimized to read quickly.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Contiguous memory** — A single, unbroken block of memory addresses. It exists To allow predictable, sequential access to data, which physical hardware is heavily optimized to read quickly.',
    '**Pointer arithmetic** — The mathematical addition or subtraction applied directly to a memory address. It exists To compute the exact location of subsequent elements in a block of memory dynamically, without needing a separate named pointer for each item.',
    '**Cache locality (Spatial locality)** — The hardware behavior where loading one byte from main RAM automatically pulls the adjacent bytes into the ultra-fast CPU cache. It exists Because programs that access one piece of data are highly likely to access the data right next to it immediately afterward, and fetching from main RAM is exceptionally slow.',
  ],

  checkpoints: ['read-intuition'],
}
