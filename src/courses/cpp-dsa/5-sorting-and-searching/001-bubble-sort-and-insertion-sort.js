// cpp-dsa — Lesson 16: Bubble Sort and Insertion Sort
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 16 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-16-bubble-sort-and-insertion-sort',
  slug: 'bubble-sort-and-insertion-sort',
  chapter: 5,
  order: 1,
  title: 'Bubble Sort and Insertion Sort',
  subtitle: 'Sorting and Searching',
  tags: ['comparison-sort', 'in-place-sort', 'stable-sort'],

  hook: {
    question: 'What is "Bubble Sort and Insertion Sort", and why does it matter?',
    realWorldContext: 'You will write isolated console programs implementing classical quadratic sorting algorithms from scratch, followed by demonstrating their production counterpart. The transferable problem this solves is understanding the mechanics of in-place array manipulation, stability in sorting, and recognizing why an algorithm with poor theoretical complexity (Insertion Sort) is structurally essential to high-performance standard library algorithms.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Bubble Sort, Insertion Sort, Standard Library std::sort.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Comparison sort:** An algorithm that orders elements by examining pairs and deciding which should come first based on a strict less-than relationship. It exists To provide a generic way to sort any type of data as long as it defines an ordering operator, abstracting the sorting logic away from the specific data type.\n- **In-place sort:** An algorithm that transforms input using no auxiliary data structures. It exists To sort datasets strictly within their existing memory bounds, preventing out-of-memory crashes and allocation overhead when working with huge vectors.\n- **Stable sort:** A sorting algorithm that preserves the relative order of equal elements. It exists To allow sorting by multiple criteria sequentially (e.g., sorting objects by first name, then by last name) without scrambling the previous sort\'s work.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::swap:** A standard library utility function that exchanges the values of two variables.\n- **std::sort:** The standard library\'s default highly optimized sorting algorithm.\n- **std::vector&lt;T&gt;:** A dynamic array that holds contiguous elements.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Sorting small arrays is an unavoidable foundation of computer science. Every time you invoke `std::sort` on massive datasets, the standard library divides your massive vectors into tiny partitions. Once those partitions are small enough, it silently drops its advanced O(n log n) logic and deploys the humble Insertion Sort at the absolute bottom of the call stack to finish the job fast.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you attempt to write an in-place sorting algorithm but accidentally forget the pass-by-reference operator, your logic becomes disconnected from the real data. Modify the Bubble Sort signature to pass by value: \n\n```cpp\nvoid bubbleSort(std::vector<int> arr) {\n```\n\n**The result:** The code compiles and runs, but the final output is `5 2 9 1`. Passing by value silently creates a complete copy of the vector. The algorithm flawlessly sorts the isolated local copy inside the function\'s scope, but the moment `bubbleSort` returns, that sorted copy is destroyed. `main` prints the original, completely unmodified unsorted vector.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Reverse Bubble Sort:** Modify the Bubble Sort `if` condition to `arr[j] < arr[j + 1]`. Run it and observe how it sorts the array in descending order.\n- **Stable Verification:** Create a struct representing a `Person` with an `age` and a `name`. Create a vector of people where two different people have the exact same age. Sort them by age using Insertion Sort and prove that their original relative ordering is preserved.\n- **Sort Subset:** Use `std::sort` but pass `data.begin()` and `data.begin() + 2`. Print the vector to prove that only the first two elements were sorted while the rest were untouched.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and executed a manual Bubble Sort.\n- [ ] You have compiled and executed a manual Insertion Sort, tracing its shift logic.\n- [ ] You have compiled and executed `std::sort` from the `<algorithm>` library.\n- [ ] You can explain out loud why Insertion Sort outperforms O(n log n) algorithms on very small arrays.\n- [ ] You have committed your code with a message explaining why `std::sort` internally relies on Insertion Sort.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 16: Bubble Sort and Insertion Sort',
        caption: 'Bubble Sort and Insertion Sort',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Bubble Sort',
              prose: [
                'When given an unsorted collection of data, we need a mechanism to order it by repeatedly pushing the absolute largest remaining element to its correct final position at the end of the array.',
                '## How the Code Works',
                '- `#include <iostream>`: Instructs the compiler to include the file defining input/output streams for console printing.\n- `#include <vector>`: Brings in the `std::vector` template.\n- `#include <utility>`: Brings in the definition for `std::swap`.\n- `void bubbleSort(std::vector<int>& arr)`: Declares a function taking the vector by reference (`&`). Taking it by reference is mandatory here because an in-place sort must modify the caller\'s actual memory, not an isolated local copy.\n- `int n = arr.size();`: Calls the `size()` method on the vector to get the total number of elements, storing it so it isn\'t recomputed every loop.\n- `bool swapped;`: Declares a boolean flag to track if any changes occurred during a pass.\n- `for (int i = 0; i < n - 1; i++)`: The outer loop. It runs `n - 1` times because the last remaining element is inherently sorted when all others are correct.\n- `swapped = false;`: Resets the flag at the beginning of each pass.\n- `for (int j = 0; j < n - i - 1; j++)`: The inner loop. It stops early (`- i`) because every complete outer loop guarantees the absolute largest remaining element has successfully "bubbled" to its final correct position at the end. We do not need to re-check the already-sorted tail.\n- `if (arr[j] > arr[j + 1])`: The comparison. Evaluates to true if the left element is strictly greater than the right element.\n- `std::swap(arr[j], arr[j + 1])`: A standard library utility that safely exchanges the contents of the two memory locations without manual temporary variables.\n- `swapped = true;`: Records that a swap happened.\n- `if (!swapped) break;`: An early exit condition. If an entire pass completes without a single swap, the array is perfectly sorted, and we bypass all remaining iterations.\n- `int main()`: The entry point of the program.\n- `std::vector<int> data = {5, 2, 9, 1};`: Instantiates the vector with an initial unsorted set of integers.\n- `bubbleSort(data);`: Executes the sort on our vector.\n- `for (int v : data)`: A range-based for loop. It asks the vector for its beginning and end iterators, sequentially pulling each integer into the local `v` variable.\n- `std::cout << v << " ";`: Prints the current integer and a space to the console.\n- `std::cout << "\\n";`: Prints a newline character.\n- `return 0;`: Exits the program successfully.\n- `i = 0, j = 0` — The algorithm compares `arr[0]` (5) to `arr[1]` (2). Because 5 > 2 is true, it calls `std::swap`. The array becomes `[2, 5, 9, 1]`, and `swapped` becomes `true`.\n- `i = 0, j = 1` — It compares `arr[1]` (5) to `arr[2]` (9). Because 5 is not greater than 9, no swap occurs. The array remains `[2, 5, 9, 1]`.\n- `i = 0, j = 2` — It compares `arr[2]` (9) to `arr[3]` (1). Because 9 > 1 is true, it calls `std::swap`. The array becomes `[2, 5, 1, 9]`. The largest element (9) has now correctly bubbled to its final slot.',
                '**CS lens.** **Bubble Sort** is an **O(n²)** comparison sort. Its worst-case and average-case time complexities are quadratic because it must iterate over the array repeatedly, making it entirely impractical for large datasets. It is an **in-place** sort (requiring O(1) auxiliary memory) and a **stable** sort (equal elements never swap past each other, strictly preserving their initial relative order).',
                '**SE lens.** The design principle here is algorithmic simplicity. The alternative not chosen is implementing a sophisticated algorithm like Merge Sort or Quick Sort immediately. The tradeoff is code complexity versus performance. Bubble Sort is almost never the right choice in production engineering because even among O(n²) sorts, it performs significantly more expensive memory writes (swaps) than Insertion Sort. It exists primarily as an educational stepping stone.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <utility>\n\nvoid bubbleSort(std::vector<int>& arr) {\n    int n = arr.size();\n    bool swapped;\n    for (int i = 0; i < n - 1; i++) {\n        swapped = false;\n        for (int j = 0; j < n - i - 1; j++) {\n            if (arr[j] > arr[j + 1]) {\n                std::swap(arr[j], arr[j + 1]);\n                swapped = true;\n            }\n        }\n        if (!swapped) break;\n    }\n}\n\nint main() {\n    std::vector<int> data = {5, 2, 9, 1};\n    bubbleSort(data);\n    for (int v : data) std::cout << v << " ";\n    std::cout << "\\n";\n    return 0;\n}',
              expectedOutput: '1 2 5 9',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Insertion Sort',
              prose: [
                'We need to sort elements efficiently when the dataset is already mostly sorted or extremely small, minimizing unnecessary and expensive memory writes.',
                '## How the Code Works',
                '- `void insertionSort(std::vector<int>& arr)`: Declares the function, taking the vector by reference to modify it directly.\n- `int n = arr.size();`: Stores the length of the vector.\n- `for (int i = 1; i < n; i++)`: The outer loop. It starts at index `1` instead of `0` because a single element (at index 0) is intrinsically already a sorted sub-array of length 1.\n- `int key = arr[i];`: Extracts the current element we are trying to place into the sorted portion, holding it in a local variable. This effectively creates an empty "hole" at index `i`.\n- `int j = i - 1;`: Initializes the comparison pointer `j` to the element immediately left of the `key`.\n- `while (j >= 0 && arr[j] > key)`: The core shifting loop. It continues as long as we haven\'t fallen off the left edge of the array (`j >= 0`) and the sorted element we are looking at is strictly larger than our `key`.\n- `arr[j + 1] = arr[j];`: Copies the larger element one slot to the right, overwriting the hole and effectively sliding the hole one position to the left.\n- `j--;`: Decrements `j` to examine the next element to the left.\n- `arr[j + 1] = key;`: Drops the `key` into the final, correct hole once the `while` loop finishes shifting larger elements out of the way.\n- `i = 1` — `key` is `arr[1]` (2). The inner loop checks `j = 0` where `arr[0]` is 5. Because 5 > 2, it copies 5 to index 1. The loop ends. It places the `key` (2) at index 0. The array becomes `[2, 5, 9, 1]`.\n- `i = 2` — `key` is `arr[2]` (9). The inner loop checks `j = 1` where `arr[1]` is 5. Because 5 > 9 is false, the `while` loop never runs. It places 9 back at index 2. The array remains `[2, 5, 9, 1]`.\n- `i = 3` — `key` is `arr[3]` (1). The inner loop finds that 9, 5, and 2 are all strictly greater than 1, shifting all of them rightward. It finally places the `key` (1) at index 0. The array becomes `[1, 2, 5, 9]`.',
                '**CS lens.** **Insertion Sort** is an **O(n²)** comparison sort in the worst and average cases. However, its best-case time complexity is an incredibly fast **O(n)** when the array is already sorted, because the `while` loop immediately fails and no memory shifts occur. Like Bubble Sort, it is strictly **in-place** and **stable**.',
                '**SE lens.** The alternative not chosen is using Bubble Sort. The tradeoff is that while both share an O(n²) worst-case complexity, Insertion Sort performs vastly fewer memory operations. Bubble Sort swaps (which requires three memory writes) for every inversion; Insertion Sort simply shifts (one memory write) and places the key once. Because it involves tight loops, contiguous memory access, and predictable branching, Insertion Sort is the undisputed performance champion for extremely small arrays (typically fewer than 16 to 64 elements).'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nvoid insertionSort(std::vector<int>& arr) {\n    int n = arr.size();\n    for (int i = 1; i < n; i++) {\n        int key = arr[i];\n        int j = i - 1;\n        while (j >= 0 && arr[j] > key) {\n            arr[j + 1] = arr[j];\n            j--;\n        }\n        arr[j + 1] = key;\n    }\n}\n\nint main() {\n    std::vector<int> data = {5, 2, 9, 1};\n    insertionSort(data);\n    for (int v : data) std::cout << v << " ";\n    std::cout << "\\n";\n    return 0;\n}',
              expectedOutput: '1 2 5 9',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Standard Library std::sort',
              prose: [
                'Writing manual nested loops for sorting is error-prone and scales poorly for large N. Production C++ code delegates this entirely to the standard library, which automatically chooses the most mathematically efficient algorithm sequence based on the dataset\'s size.',
                '## How the Code Works',
                '- `#include <algorithm>`: Brings in the standard library definitions for collection manipulation algorithms, explicitly including `std::sort`.\n- `std::sort`: A standard library function template that sorts elements in-place using a hybrid algorithm.\n- `data.begin()`: A vector method returning an iterator pointing to the very first element.\n- `data.end()`: A vector method returning an iterator pointing to the memory location immediately after the last element.\n- `std::sort(data.begin(), data.end())`: Executes the sort on the provided continuous range. By default, it uses the `<` operator to determine order.\n```cpp\ntemplate <class RandomIt>\nvoid sort(RandomIt first, RandomIt last);\n```\n- **`sort`**: This signature shows that the function accepts two iterators representing a range.\n- `data.begin()` to `data.end()` — The standard library receives the memory bounds and begins sorting the integer array in-place. Because the array is small, the internal implementation quietly routes this directly to an Insertion Sort routine.',
                '**CS lens.** `std::sort` provides a guaranteed **O(n log n)** worst-case time complexity. Modern C++ standard libraries (like libstdc++ or libc++) implement this as **Introsort**. Introsort begins as Quick Sort for high performance, monitors the recursion depth, switches to Heap Sort if the depth becomes too deep (guaranteeing O(n log n)), and crucially, delegates completely to **Insertion Sort** for small sub-arrays (like ours) because Insertion Sort\'s low overhead fundamentally beats O(n log n) algorithms on tiny inputs. Note that `std::sort` is **not** a stable sort; `std::stable_sort` is provided if stability is explicitly required. Also recognized in: V8 JavaScript engine\'s `Array.prototype.sort`, Python\'s `list.sort()` (via Timsort), and Rust\'s `slice::sort`, all of which aggressively fall back to Insertion Sort for tiny data chunks.',
                '**SE lens.** The alternative not chosen is writing a bespoke Quick Sort or Merge Sort manually for everyday data. The tradeoff is strict control versus guaranteed safety and speed. By delegating to `std::sort`, you lose the ability to micromanage the sorting strategy, but you gain an aggressively optimized, deeply tested implementation that automatically leverages the specific architectural strengths of Insertion Sort on small data without you having to code the fallback logic yourself.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> data = {5, 2, 9, 1};\n    \n    std::sort(data.begin(), data.end());\n    \n    for (int v : data) std::cout << v << " ";\n    std::cout << "\\n";\n    return 0;\n}',
              expectedOutput: '1 2 5 9',
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
      'Next lesson: Merge Sort.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Comparison sort"?',
      options: [
        'An algorithm that transforms input using no auxiliary data structures. It exists To sort datasets strictly within their existing memory bounds, preventing out-of-memory crashes and allocation overhead when working with huge vectors.',
        'An algorithm that orders elements by examining pairs and deciding which should come first based on a strict less-than relationship. It exists To provide a generic way to sort any type of data as long as it defines an ordering operator, abstracting the sorting logic away from the specific data type.',
        'A sorting algorithm that preserves the relative order of equal elements. It exists To allow sorting by multiple criteria sequentially (e.g., sorting objects by first name, then by last name) without scrambling the previous sort\'s work.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "In-place sort"?',
      options: [
        'A sorting algorithm that preserves the relative order of equal elements. It exists To allow sorting by multiple criteria sequentially (e.g., sorting objects by first name, then by last name) without scrambling the previous sort\'s work.',
        'An algorithm that transforms input using no auxiliary data structures. It exists To sort datasets strictly within their existing memory bounds, preventing out-of-memory crashes and allocation overhead when working with huge vectors.',
        'An algorithm that orders elements by examining pairs and deciding which should come first based on a strict less-than relationship. It exists To provide a generic way to sort any type of data as long as it defines an ordering operator, abstracting the sorting logic away from the specific data type.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Stable sort"?',
      options: [
        'An algorithm that orders elements by examining pairs and deciding which should come first based on a strict less-than relationship. It exists To provide a generic way to sort any type of data as long as it defines an ordering operator, abstracting the sorting logic away from the specific data type.',
        'An algorithm that transforms input using no auxiliary data structures. It exists To sort datasets strictly within their existing memory bounds, preventing out-of-memory crashes and allocation overhead when working with huge vectors.',
        'A sorting algorithm that preserves the relative order of equal elements. It exists To allow sorting by multiple criteria sequentially (e.g., sorting objects by first name, then by last name) without scrambling the previous sort\'s work.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Comparison sort** — An algorithm that orders elements by examining pairs and deciding which should come first based on a strict less-than relationship. It exists To provide a generic way to sort any type of data as long as it defines an ordering operator, abstracting the sorting logic away from the specific data type.',
    '**In-place sort** — An algorithm that transforms input using no auxiliary data structures. It exists To sort datasets strictly within their existing memory bounds, preventing out-of-memory crashes and allocation overhead when working with huge vectors.',
    '**Stable sort** — A sorting algorithm that preserves the relative order of equal elements. It exists To allow sorting by multiple criteria sequentially (e.g., sorting objects by first name, then by last name) without scrambling the previous sort\'s work.',
  ],

  checkpoints: ['read-intuition'],
}
