// cpp-dsa — Lesson 18: Quicksort
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 18 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-18-quicksort',
  slug: 'quicksort',
  chapter: 5,
  order: 3,
  title: 'Quicksort',
  subtitle: 'Sorting and Searching',
  tags: ['pivot', 'partitioning', 'in-place-sorting', 'introsort'],

  hook: {
    question: 'What is "Quicksort", and why does it matter?',
    realWorldContext: 'You will implement the Quicksort algorithm from scratch to efficiently sort collections of data in-place. The transferable problem this solves is organizing data for fast retrieval without the heavy memory overhead required by other recursive sorting methods.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: The Lomuto Partition Scheme, The Hoare Partition Scheme, Recursive Quicksort, std::sort and Introsort.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Pivot:** A chosen element from the array used as a dividing line. It exists To act as a reference point for comparing and organizing all other elements in the current segment.\n- **Partitioning:** The process of rearranging the array so that elements smaller than the pivot are on one side and elements larger are on the other. It exists To guarantee the pivot is placed in its final sorted position (or to guarantee separate smaller/larger blocks), breaking the problem into smaller independent subproblems.\n- **In-place sorting:** A sorting algorithm that requires no extra memory allocation proportional to the input size. It exists To avoid the memory pressure and allocation time of creating temporary arrays during sorting.\n- **Introsort:** A hybrid sorting algorithm that begins with Quicksort and switches to Heapsort when recursion depth becomes too high. It exists To provide the fast average-case performance of Quicksort while guaranteeing a worst-case O(n log n) runtime without stack overflows.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::swap:** A standard library template function that exchanges the values of two variables.\n- **std::sort:** The standard library\'s default sorting algorithm, commonly implemented as introsort.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'You began by conceptually dividing an array in a single pass without extra memory using the Lomuto scheme. You optimized memory writes by working from both ends inward using the Hoare scheme. You applied this recursively to divide and conquer the collection in an average `O(n log n)` time. Finally, you discarded the manual implementation in favor of `std::sort`, knowing that beneath its simple interface lies an introspective hybrid that relies on the exact Quicksort mechanics you just built, safely guarded against stack exhaustion.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you implement naive Quicksort and feed it an already sorted array of a massive size, the recursion depth will equal the array size instead of `log(n)`. Modify your recursive `quicksort` test data to sort an array of 50,000 ascending integers: \n\n```cpp\nstd::vector<int> data(50000);\nfor(int i = 0; i < 50000; i++) {\n    data[i] = i;\n}\nquicksort(data, 0, data.size() - 1);\n```\n\n**The compiler error/runtime failure:** The program will likely crash at runtime with a **Segmentation Fault**. Because the data is sorted and the pivot logic doesn\'t perfectly halve it, `50,000` recursive function calls pile up in memory and exhaust the system\'s call stack. `std::sort` specifically prevents this by tracking depth and switching to Heapsort.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Pivot Strategy:** Modify the manual Hoare partition code to select the first element (`arr[low]`) as the pivot instead of the middle element. Run it against unsorted data and observe if the final sorted output remains logically correct.\n- **Descending Sort:** Look up the `std::greater<int>()` comparator function online. Pass it as a third argument to your `std::sort` call to sort the array in descending order.\n- **Tracking Swaps:** Add a global integer variable `swap_count` to your recursive `quicksort.cpp`. Increment it every time `std::swap` is called. Print the final count to empirically see how many physical memory moves the algorithm performed.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run a custom Quicksort utilizing the Hoare partition scheme.\n- [ ] You have observed how a partitioning function places elements on correct sides of a pivot.\n- [ ] You can explain out loud why Quicksort is an in-place algorithm.\n- [ ] You have successfully called `std::sort` and can explain why it uses Introsort under the hood instead of naive Quicksort.\n- [ ] You understand the difference between the average `O(n log n)` runtime and the worst-case `O(n²)` runtime.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 18: Quicksort',
        caption: 'Quicksort',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Lomuto Partition Scheme',
              prose: [
                'Before you can recursively divide and conquer, you need a mechanism to separate an array into "smaller than X" and "larger than X" segments without allocating a second array. You need to scan the array and swap elements into their correct sides in a single pass.',
                '## How the Code Works',
                '- `#include <iostream>`: Instructs the compiler to include the standard input/output stream library so you can print to the console.\n- `#include <vector>`: Instructs the compiler to include the dynamic array container.\n- `#include <utility>`: Instructs the compiler to include utility functions, which includes `std::swap`.\n- `int lomuto_partition(std::vector<int>& arr, int low, int high)`: Defines a function that takes a reference to the array and the integer boundaries of the segment to partition. Taking the vector by reference (`&`) ensures no copy is made.\n- `int pivot = arr[high];`: Chooses the last element in the segment as the **pivot** value.\n- `int i = low - 1;`: Initializes an index `i` that tracks the boundary of the "smaller than pivot" segment. It starts just outside the segment because no smaller elements have been found yet.\n- `for (int j = low; j < high; j++)`: Iterates a scanning index `j` from the beginning of the segment up to, but not including, the pivot itself.\n- `if (arr[j] <= pivot)`: Checks if the current element belongs on the left side of the pivot.\n- `i++;`: Expands the "smaller" segment by moving its boundary forward by one.\n- `std::swap(arr[i], arr[j]);`: Exchanges the newly found smaller element at `j` with the element at the new boundary `i`.\n- `std::swap(arr[i + 1], arr[high]);`: Moves the pivot from its temporary spot at the end (`high`) into its correct sorted position immediately following the last smaller element (`i + 1`).\n- `return i + 1;`: Returns the final index of the pivot so the caller knows where the array was split.\n- `std::vector<int> data = {10, 80, 30, 90, 40, 50, 70};`: Creates a standard vector initialized with seven test values.\n- `int pivot_index = lomuto_partition(data, 0, data.size() - 1);`: Calls the partitioning function passing the lowest index (`0`) and the highest valid index.\n- `std::cout << "Pivot placed at index: " << pivot_index << "\\n";`: Prints the integer returned by the partition function.\n- `for (int num : data)`: A range-based for loop that accesses each element in the `data` vector sequentially.\n- `std::cout << num << " ";`: Prints each array element followed by a space.\nExecution trace for `lomuto_partition`:\n- `i = -1`, `j = 0`, `arr[0]` is `10` (<= 70) — `i` becomes `0`, swaps `arr[0]` with `arr[0]`.\n- `i = 0`, `j = 1`, `arr[1]` is `80` (> 70) — no swap.\n- `i = 0`, `j = 2`, `arr[2]` is `30` (<= 70) — `i` becomes `1`, swaps `arr[1]` (`80`) with `arr[2]` (`30`). Array: `{10, 30, 80, 90, 40, 50, 70}`.\n- `i = 1`, `j = 3`, `arr[3]` is `90` (> 70) — no swap.\n- `i = 1`, `j = 4`, `arr[4]` is `40` (<= 70) — `i` becomes `2`, swaps `arr[2]` (`80`) with `arr[4]` (`40`). Array: `{10, 30, 40, 90, 80, 50, 70}`.\n- `i = 2`, `j = 5`, `arr[5]` is `50` (<= 70) — `i` becomes `3`, swaps `arr[3]` (`90`) with `arr[5]` (`50`). Array: `{10, 30, 40, 50, 80, 90, 70}`.\n- Loop ends. Swaps `arr[4]` (`80`) with `arr[6]` (`70`). Final array: `{10, 30, 40, 50, 70, 90, 80}`. Pivot `70` is now fixed at index `4`.',
                '**CS lens.** This algorithm operates strictly **in-place**. Unlike Merge Sort, which allocates a completely new array to merge halves together, Lomuto partitioning requires O(1) extra space because it rearranges elements by swapping them directly within the existing memory.',
                '**SE lens.** The design principle here is trading predictability for memory efficiency. The alternative not chosen is allocating left and right sub-arrays, pushing elements into them, and copying them back. That alternative is easier to write and mentally model but introduces high memory allocation overhead, which is exactly the performance hit Quicksort aims to avoid.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <utility>\n\nint lomuto_partition(std::vector<int>& arr, int low, int high) {\n    int pivot = arr[high];\n    int i = low - 1;\n\n    for (int j = low; j < high; j++) {\n        if (arr[j] <= pivot) {\n            i++;\n            std::swap(arr[i], arr[j]);\n        }\n    }\n    std::swap(arr[i + 1], arr[high]);\n    return i + 1;\n}\n\nint main() {\n    std::vector<int> data = {10, 80, 30, 90, 40, 50, 70};\n    int pivot_index = lomuto_partition(data, 0, data.size() - 1);\n    \n    std::cout << "Pivot placed at index: " << pivot_index << "\\n";\n    for (int num : data) {\n        std::cout << num << " ";\n    }\n    std::cout << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Hoare Partition Scheme',
              prose: [
                'Lomuto partitioning is straightforward to read but does more swaps than necessary, especially when many elements are already in the correct order. You need a partitioning algorithm that minimizes memory writes by moving pointers from both ends.',
                '## How the Code Works',
                '- `int hoare_partition(std::vector<int>& arr, int low, int high)`: Defines the partition function using Hoare\'s scheme.\n- `int pivot = arr[low + (high - low) / 2];`: Selects the middle element as the **pivot**. This specific calculation `low + (high - low) / 2` avoids integer overflow that `(low + high) / 2` might cause on massive arrays.\n- `int i = low - 1;`: Initializes the left pointer `i` strictly outside the array segment.\n- `int j = high + 1;`: Initializes the right pointer `j` strictly outside the array segment.\n- `while (true)`: An infinite loop that will only exit via the `return` statement inside it.\n- `do { i++; } while (arr[i] < pivot);`: Moves the left pointer forward sequentially as long as it sees elements that correctly belong on the left. It stops when it finds an element that is `>= pivot`.\n- `do { j--; } while (arr[j] > pivot);`: Moves the right pointer backward sequentially as long as it sees elements that correctly belong on the right. It stops when it finds an element that is `<= pivot`.\n- `if (i >= j) return j;`: Checks if the pointers have crossed. If they have, partitioning is done. It returns `j`, which marks the highest index of the lower partition.\n- `std::swap(arr[i], arr[j]);`: Exchanges the two out-of-place elements, moving them to their correct sides.\n- `int split_index = hoare_partition(data, 0, data.size() - 1);`: Calls the function and stores the resulting boundary index.',
                '**CS lens.** Hoare\'s scheme uses two pointers working inward. It performs on average three times fewer swaps than Lomuto\'s scheme. Unlike Lomuto, Hoare does not guarantee the pivot itself is placed exactly at the split index; it merely guarantees that all elements from `low` through `j` are smaller than or equal to all elements from `j + 1` through `high`.',
                '**SE lens.** The alternative not chosen is keeping the Lomuto algorithm. The tradeoff is code complexity versus runtime performance. Hoare\'s `do-while` loops and indices are notoriously easy to write incorrectly, resulting in out-of-bounds access or infinite loops. We choose Hoare because in a foundational sorting routine, maximizing runtime efficiency outweighs internal implementation difficulty.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <utility>\n\nint hoare_partition(std::vector<int>& arr, int low, int high) {\n    int pivot = arr[low + (high - low) / 2];\n    int i = low - 1;\n    int j = high + 1;\n\n    while (true) {\n        do { i++; } while (arr[i] < pivot);\n        do { j--; } while (arr[j] > pivot);\n\n        if (i >= j) return j;\n        std::swap(arr[i], arr[j]);\n    }\n}\n\nint main() {\n    std::vector<int> data = {10, 80, 30, 90, 40, 50, 70};\n    int split_index = hoare_partition(data, 0, data.size() - 1);\n    \n    std::cout << "Split index: " << split_index << "\\n";\n    for (int num : data) {\n        std::cout << num << " ";\n    }\n    std::cout << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Recursive Quicksort',
              prose: [
                'Partitioning groups the array into two halves, but neither half is internally sorted yet. You need to repeatedly partition those smaller and smaller halves until the segments are so small they are trivially sorted.',
                '## How the Code Works',
                '- `void quicksort(std::vector<int>& arr, int low, int high)`: Defines the recursive sorting function that coordinates the partitioning.\n- `if (low >= high) return;`: The base case for the recursion. If the segment has one element or zero elements, it is already logically sorted. The function returns immediately.\n- `int split = partition(arr, low, high);`: Calls the Hoare partitioning logic. The segment is rearranged in-place, and the split point index is retrieved.\n- `quicksort(arr, low, split);`: Recursively calls itself to sort the left partition, from `low` up to the `split` index.\n- `quicksort(arr, split + 1, high);`: Recursively calls itself to sort the right partition, from strictly after the `split` index up to `high`.',
                '**CS lens.** This is the **Divide and Conquer** algorithm design paradigm. On average, the pivot splits the array roughly in half, leading to a recursion tree depth of exactly `log(n)`. At each depth level, partitioning does linear scanning work `O(n)`. This yields an **average time complexity of O(n log n)**. However, if the pivot selection is consistently poor (e.g., picking the maximum element every time in a pre-sorted array), one partition will hold 1 element and the other will hold `n-1` elements. This degenerates the recursion depth to `n`, creating a **worst-case time complexity of O(n²)**.',
                '**SE lens.** The design principle here is optimizing for expected real-world performance. The tradeoff is accepting a theoretical O(n²) worst-case edge behavior to gain significantly faster real-world execution times than Merge Sort, because Quicksort\'s in-place, contiguous-memory nature entirely avoids cache misses and memory allocator bottlenecks.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <utility>\n\nint partition(std::vector<int>& arr, int low, int high) {\n    int pivot = arr[low + (high - low) / 2];\n    int i = low - 1;\n    int j = high + 1;\n    while (true) {\n        do { i++; } while (arr[i] < pivot);\n        do { j--; } while (arr[j] > pivot);\n        if (i >= j) return j;\n        std::swap(arr[i], arr[j]);\n    }\n}\n\nvoid quicksort(std::vector<int>& arr, int low, int high) {\n    if (low >= high) return;\n\n    int split = partition(arr, low, high);\n    quicksort(arr, low, split);\n    quicksort(arr, split + 1, high);\n}\n\nint main() {\n    std::vector<int> data = {90, 10, 80, 30, 70, 40, 50};\n    \n    quicksort(data, 0, data.size() - 1);\n    \n    for (int num : data) {\n        std::cout << num << " ";\n    }\n    std::cout << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'std::sort and Introsort',
              prose: [
                'Writing custom partitioning schemes in production code is inherently risky due to subtle off-by-one errors and the worst-case O(n²) performance vulnerability of a naive recursive Quicksort. You need a fast, tested, production-grade sort that prevents the worst-case scenario automatically.',
                '## How the Code Works',
                '- `#include <algorithm>`: Brings in the standard library algorithms package, which exposes functions designed to work across all C++ containers.\n- `std::sort(data.begin(), data.end());`: Invokes the standard library sorting algorithm.\n- `data.begin()`: Returns an iterator pointing to the very first element of the vector.\n- `data.end()`: Returns an iterator pointing just past the final element of the vector, defining the end of the range.',
                '**CS lens.** Modern C++ compilers typically implement `std::sort` as **Introsort** (introspective sort). It begins by using exactly the Quicksort partitioning mechanics you built because it is highly cache-efficient. However, Introsort tracks its own recursion depth. If the recursion depth exceeds `2 * log2(n)`, Introsort concludes that the pivot choices are poor (approaching the O(n²) worst-case) and automatically halts the Quicksort recursion, switching to **Heapsort** to guarantee an `O(n log n)` completion.',
                '**SE lens.** The design principle here is **defense in depth**. The alternative not chosen is enforcing a strict pure Quicksort implementation or forcing developers to choose their algorithm manually. The tradeoff is a slightly more complex standard library implementation under the hood, but it completely shields the application programmer from malicious input that could otherwise trigger an O(n²) Denial of Service via stack overflow or algorithmic complexity attacks.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> data = {90, 10, 80, 30, 70, 40, 50};\n    \n    std::sort(data.begin(), data.end());\n    \n    for (int num : data) {\n        std::cout << num << " ";\n    }\n    std::cout << "\\n";\n    return 0;\n}',
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
      'Next lesson: Counting Sort and Radix Sort.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "In-place sorting"?',
      options: [
        'The process of rearranging the array so that elements smaller than the pivot are on one side and elements larger are on the other. It exists To guarantee the pivot is placed in its final sorted position (or to guarantee separate smaller/larger blocks), breaking the problem into smaller independent subproblems.',
        'A hybrid sorting algorithm that begins with Quicksort and switches to Heapsort when recursion depth becomes too high. It exists To provide the fast average-case performance of Quicksort while guaranteeing a worst-case O(n log n) runtime without stack overflows.',
        'A sorting algorithm that requires no extra memory allocation proportional to the input size. It exists To avoid the memory pressure and allocation time of creating temporary arrays during sorting.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Introsort"?',
      options: [
        'A sorting algorithm that requires no extra memory allocation proportional to the input size. It exists To avoid the memory pressure and allocation time of creating temporary arrays during sorting.',
        'A chosen element from the array used as a dividing line. It exists To act as a reference point for comparing and organizing all other elements in the current segment.',
        'A hybrid sorting algorithm that begins with Quicksort and switches to Heapsort when recursion depth becomes too high. It exists To provide the fast average-case performance of Quicksort while guaranteeing a worst-case O(n log n) runtime without stack overflows.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Pivot"?',
      options: [
        'A hybrid sorting algorithm that begins with Quicksort and switches to Heapsort when recursion depth becomes too high. It exists To provide the fast average-case performance of Quicksort while guaranteeing a worst-case O(n log n) runtime without stack overflows.',
        'A chosen element from the array used as a dividing line. It exists To act as a reference point for comparing and organizing all other elements in the current segment.',
        'The process of rearranging the array so that elements smaller than the pivot are on one side and elements larger are on the other. It exists To guarantee the pivot is placed in its final sorted position (or to guarantee separate smaller/larger blocks), breaking the problem into smaller independent subproblems.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Partitioning"?',
      options: [
        'A sorting algorithm that requires no extra memory allocation proportional to the input size. It exists To avoid the memory pressure and allocation time of creating temporary arrays during sorting.',
        'A chosen element from the array used as a dividing line. It exists To act as a reference point for comparing and organizing all other elements in the current segment.',
        'The process of rearranging the array so that elements smaller than the pivot are on one side and elements larger are on the other. It exists To guarantee the pivot is placed in its final sorted position (or to guarantee separate smaller/larger blocks), breaking the problem into smaller independent subproblems.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Pivot** — A chosen element from the array used as a dividing line. It exists To act as a reference point for comparing and organizing all other elements in the current segment.',
    '**Partitioning** — The process of rearranging the array so that elements smaller than the pivot are on one side and elements larger are on the other. It exists To guarantee the pivot is placed in its final sorted position (or to guarantee separate smaller/larger blocks), breaking the problem into smaller independent subproblems.',
    '**In-place sorting** — A sorting algorithm that requires no extra memory allocation proportional to the input size. It exists To avoid the memory pressure and allocation time of creating temporary arrays during sorting.',
    '**Introsort** — A hybrid sorting algorithm that begins with Quicksort and switches to Heapsort when recursion depth becomes too high. It exists To provide the fast average-case performance of Quicksort while guaranteeing a worst-case O(n log n) runtime without stack overflows.',
  ],

  checkpoints: ['read-intuition'],
}
