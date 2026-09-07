// cpp-dsa — Lesson 19: Counting Sort and Radix Sort
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 19 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-19-counting-sort-and-radix-sort',
  slug: 'counting-sort-and-radix-sort',
  chapter: 5,
  order: 4,
  title: 'Counting Sort and Radix Sort',
  subtitle: 'Sorting and Searching',
  tags: ['non-comparison-sort', 'key-range-k', 'stable-sort', 'radix'],

  hook: {
    question: 'What is "Counting Sort and Radix Sort", and why does it matter?',
    realWorldContext: 'You will write isolated integer sorting algorithms that completely avoid comparing elements, breaking the theoretical O(n log n) speed limit of comparison sorts like Merge Sort and Quick Sort. The transferable problem this solves is mapping raw data values directly to memory addresses, allowing you to sort elements in linear O(n + k) time by leveraging the constraints of your data rather than generic comparisons.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: Stable Counting Sort, Radix Sort.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Non-comparison sort:** An algorithm that orders elements without ever using &lt; or &gt; to compare two elements directly against each other. It exists To bypass the mathematical O(n log n) minimum bound that restricts all comparison-based sorting algorithms, achieving linear time complexity for specific types of data.\n- **Key range (k):** The numeric difference between the maximum and minimum possible values in a dataset. It exists To determine the exact size of the auxiliary memory array needed for direct-address counting.\n- **Stable sort:** A sorting algorithm that preserves the original relative order of elements that have the exact same value. It exists To allow multiple sorting passes over the same data without scrambling the results of previous passes—an absolute requirement for Radix Sort to function correctly.\n- **Radix:** The base of a number system (e.g., base 10 for decimal numbers). It exists To break down unmanageably large integer ranges into a sequence of small, manageable digit-by-digit chunks that can be sorted sequentially.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::max_element:** A standard library algorithm that locates the largest element in a defined range.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how the algorithm transitions from relying on value directly (Counting Sort) to slicing the value into base-dependent chunks (Radix Sort). At every stage, the algorithm fundamentally refuses to ask the question "is A greater than B?" Instead, it calculates the exact memory offset where the value belongs using raw mathematics.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you break the **stability** of the inner Counting Sort loop, Radix Sort instantly fails to produce ordered data. Modify the reverse loop in `radix_sort.cpp` to run forward: \n\n```cpp\n// Change this:\n// for (int i = arr.size() - 1; i >= 0; i--)\n// To this:\nfor (size_t i = 0; i < arr.size(); i++) {\n    int digit = (arr[i] / exp) % 10;\n    output[count[digit] - 1] = arr[i];\n    count[digit]--;\n}\n```\n\n**The resulting output:** \n\n```text\n802 170 90 75 66 45 24 2\n```\n\nThe sort collapses. When sorting the tens digit, numbers with identical tens digits (like 170 and 75) are placed in reverse order of their arrival. The work done during the ones-digit pass is completely overwritten and scrambled, proving exactly why stable sorting is a hard engineering requirement for Radix algorithms.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Char Sorting:** Write a Counting Sort that takes a `std::string` of lowercase letters (e.g., `"edcba"`) and sorts it. Your key range `k` is 26, and you will map characters to indices by subtracting `\'a\'` (e.g., `count[ch - \'a\']++`).\n- **Binary Radix:** Modify the Radix Sort code to use base 2 instead of base 10. Change `exp *= 10` to `exp *= 2`, `count(10, 0)` to `count(2, 0)`, and `% 10` to `% 2`. Verify it still sorts correctly.\n- **Negative Numbers:** Read about how Radix Sort handles negative numbers. Attempt to modify the Radix script to separate the array into two buckets (negatives and positives), run Radix Sort on both, and merge them back together.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have run an isolated Counting Sort and verified its prefix-sum index assignment.\n- [ ] You have run an isolated Radix Sort and understand the digit-extraction math.\n- [ ] You have deliberately broken stability in Radix Sort and observed the sorting failure.\n- [ ] You can explain out loud why allocating memory based on the key range `k` prevents Counting Sort from being a generic replacement for `std::sort`.\n- [ ] You understand that `std::sort` remains the standard engineering default due to cache efficiency and flexibility.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 19: Counting Sort and Radix Sort',
        caption: 'Counting Sort and Radix Sort',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Stable Counting Sort',
              prose: [
                'All comparison sorts (like `std::sort` or Merge Sort) take at least O(n log n) time because comparing every element against the others requires a mathematical minimum number of operations. However, if you know your array contains only non-negative integers up to a specific maximum value `k`, you do not need to compare them at all. You can achieve O(n + k) time by simply counting how many times each number appears and placing them directly into their final positions.',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard I/O library to allow console output.\n- `#include <vector>`: Includes the dynamic array container.\n- `int main() {`: The standard entry point of a C++ application.\n- `std::vector<int> arr = {4, 2, 2, 8, 3, 3, 1};`: Allocates a `std::vector` of integers and initializes it with an unsorted sequence containing duplicates.\n- `int max_val = 8;`: Defines the maximum value `k` known to exist in the array.\n- `std::vector<int> count(max_val + 1, 0);`: Allocates the count array. We size it to `9` (`max_val + 1`) so that the indices `0` through `8` exist. The second argument `0` initializes all slots to zero.\n- `std::vector<int> output(arr.size());`: Allocates the output array to match the exact size of the input array.\n- `for (int num : arr)`: A range-based for loop traversing each integer in the input.\n- `count[num]++;`: We use the *value* of the data directly as a memory *index*. If `num` is `4`, we increment the integer stored at `count[4]`. This avoids all comparisons.\n- `for (size_t i = 1; i < count.size(); i++)`: A traditional for loop starting at index 1 up to the end of the `count` array. `size_t` is an unsigned integer type returned by `size()`.\n- `count[i] += count[i - 1];`: A prefix sum. This transforms the `count` array from holding "how many times this exact number appears" to "how many numbers are less than or equal to this number". This sum represents the actual correct 1-indexed position in the output array.\n- `for (int i = arr.size() - 1; i >= 0; i--)`: A reverse for loop over the input array. Iterating backward is the exact mechanical trick that ensures this sort is **stable**.\n- `int num = arr[i];`: Reads the value from the original array.\n- `output[count[num] - 1] = num;`: Uses the prefix sum to find exactly where this number belongs. We subtract `1` because our arrays are 0-indexed.\n- `count[num]--;`: Decrements the prefix sum slot. If we encounter another identical number (like the second `2`), it will now be placed one slot to the left, preserving original relative order.\n- `for (int num : output)`: A range-based loop over the newly sorted data.\n- `std::cout << num << " ";`: Prints the sorted integers to the terminal.\n- `return 0;`: Signals successful program termination.',
                '**CS lens.** This is **Counting Sort**. Its time complexity is O(n + k), where `n` is the number of elements and `k` is the range of values. It fundamentally breaks the O(n log n) comparison barrier because it uses **direct addressing**—mapping the value of the data directly to a memory address in the `count` array. There are no `if (a < b)` statements anywhere in this code.',
                '**SE lens.** The alternative not chosen is using `std::sort`, which operates in O(n log n) time with zero extra memory overhead (O(1) or O(log n) auxiliary space). The massive tradeoff with Counting Sort is memory bound to the key range `k`. If you want to sort just three integers `{1, 2, 1000000000}`, Counting Sort requires allocating a 4-gigabyte count array filled almost entirely with zeros. Counting Sort is explicitly engineered only for scenarios where `k` is roughly equal to or smaller than `n`, such as sorting ages, test scores, or bytes.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> arr = {4, 2, 2, 8, 3, 3, 1};\n    int max_val = 8;\n    \n    std::vector<int> count(max_val + 1, 0);\n    std::vector<int> output(arr.size());\n    \n    for (int num : arr) {\n        count[num]++;\n    }\n    \n    for (size_t i = 1; i < count.size(); i++) {\n        count[i] += count[i - 1];\n    }\n    \n    for (int i = arr.size() - 1; i >= 0; i--) {\n        int num = arr[i];\n        output[count[num] - 1] = num;\n        count[num]--;\n    }\n    \n    for (int num : output) {\n        std::cout << num << " ";\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
              expectedOutput: '1 2 2 3 3 4 8 ',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Radix Sort',
              prose: [
                'Counting sort fails when the range `k` is huge. But large numbers are just sequences of small digits. In base 10, every single digit is bounded strictly between 0 and 9. We can sort massive numbers without a massive count array by repeatedly applying our stable Counting Sort digit by digit—starting from the ones place, then the tens place, then the hundreds.',
                '## How the Code Works',
                '- `#include <algorithm>`: Brings in standard algorithms, specifically `std::max_element`.\n- `std::vector<int> arr = {...};`: Initializes the vector with scattered, multi-digit numbers.\n- `std::max_element(arr.begin(), arr.end())`: Scans the array once to find the pointer/iterator to the maximum element (802).\n- `*`: The dereference operator. It converts the iterator returned by `std::max_element` into the actual integer value (`802`), which is stored in `max_val`.\n- `for (int exp = 1; max_val / exp > 0; exp *= 10)`: The outer loop driving the digit-by-digit extraction. `exp` starts at 1 (ones place). `exp *= 10` shifts it to the tens place, then hundreds. The loop stops when `max_val / exp` collapses to `0`, meaning we have processed all digits of the largest number.\n- `std::vector<int> count(10, 0);`: Allocates our auxiliary array. Notice it is strictly sized to `10`, representing the digits 0 through 9. We completely bypassed allocating a size-802 array.\n- `std::vector<int> output(arr.size());`: Allocates the output array for this specific digit pass.\n- `for (int num : arr)`: Loops over the elements for the frequency counting phase.\n- `int digit = (num / exp) % 10;`: The extraction math. If `num` is 170 and `exp` is 10, `170 / 10` is `17`. `17 % 10` is `7`. We successfully extracted the tens digit.\n- `count[digit]++;`: Increments the count for this specific digit (0-9).\n- `for (int i = 1; i < 10; i++) { count[i] += count[i - 1]; }`: The exact same prefix sum logic from Counting Sort, but strictly bounded to 10 elements.\n- `for (int i = arr.size() - 1; i >= 0; i--)`: The backwards loop over the data, heavily relying on the stability of this inner sort. If two numbers have the same tens digit, their relative order from the ones-digit pass must not be destroyed.\n- `int digit = (arr[i] / exp) % 10;`: Extracts the digit again to use as an index.\n- `output[count[digit] - 1] = arr[i];`: Places the full original number into the `output` array based on the sorting of the current digit.\n- `count[digit]--;`: Decrements the prefix sum for the next occurrence.\n- `arr = output;`: Overwrites the main array with the results of this pass, setting up the board for the next digit pass (e.g., hundreds).\n- `for (int num : arr) { std::cout << num << " "; }`: Prints the fully sorted array.',
                '**CS lens.** This is **Radix Sort** (specifically, Least Significant Digit or LSD Radix Sort). Its time complexity is O(d * (n + b)), where `d` is the number of digits, `n` is the number of elements, and `b` is the base (10). Because `d` and `b` are effectively constant for a fixed integer type (a 32-bit integer has at most 10 decimal digits), the overall time complexity remains strictly linear: O(n).',
                '**SE lens.** The alternative not chosen is using `std::sort`. Radix Sort is mathematically linear and technically faster on paper, so why doesn\'t `std::sort` use it? The engineering reality is **constant factors**. Radix Sort requires repeatedly allocating output arrays, heavily jumping around memory causing cache misses, and performing modulo arithmetic. Modern comparison sorts like introsort (`std::sort`) are highly optimized for CPU caching and usually outperform Radix Sort in real-world scenarios unless the dataset is enormous and the keys are trivial to extract. Additionally, Radix Sort demands that your data can be broken down into integer keys; you cannot cleanly radix-sort complex objects without writing custom, fragile key-extraction mappings.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> arr = {170, 45, 75, 90, 802, 24, 2, 66};\n    int max_val = *std::max_element(arr.begin(), arr.end());\n    \n    for (int exp = 1; max_val / exp > 0; exp *= 10) {\n        std::vector<int> count(10, 0);\n        std::vector<int> output(arr.size());\n        \n        for (int num : arr) {\n            int digit = (num / exp) % 10;\n            count[digit]++;\n        }\n        \n        for (int i = 1; i < 10; i++) {\n            count[i] += count[i - 1];\n        }\n        \n        for (int i = arr.size() - 1; i >= 0; i--) {\n            int digit = (arr[i] / exp) % 10;\n            output[count[digit] - 1] = arr[i];\n            count[digit]--;\n        }\n        \n        arr = output;\n    }\n    \n    for (int num : arr) {\n        std::cout << num << " ";\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
              expectedOutput: '2 24 45 66 75 90 170 802 ',
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
      'Next lesson: Binary Search.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Stable sort"?',
      options: [
        'An algorithm that orders elements without ever using &lt; or &gt; to compare two elements directly against each other. It exists To bypass the mathematical O(n log n) minimum bound that restricts all comparison-based sorting algorithms, achieving linear time complexity for specific types of data.',
        'A sorting algorithm that preserves the original relative order of elements that have the exact same value. It exists To allow multiple sorting passes over the same data without scrambling the results of previous passes—an absolute requirement for Radix Sort to function correctly.',
        'The base of a number system (e.g., base 10 for decimal numbers). It exists To break down unmanageably large integer ranges into a sequence of small, manageable digit-by-digit chunks that can be sorted sequentially.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Radix"?',
      options: [
        'The base of a number system (e.g., base 10 for decimal numbers). It exists To break down unmanageably large integer ranges into a sequence of small, manageable digit-by-digit chunks that can be sorted sequentially.',
        'A sorting algorithm that preserves the original relative order of elements that have the exact same value. It exists To allow multiple sorting passes over the same data without scrambling the results of previous passes—an absolute requirement for Radix Sort to function correctly.',
        'The numeric difference between the maximum and minimum possible values in a dataset. It exists To determine the exact size of the auxiliary memory array needed for direct-address counting.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Non-comparison sort"?',
      options: [
        'An algorithm that orders elements without ever using &lt; or &gt; to compare two elements directly against each other. It exists To bypass the mathematical O(n log n) minimum bound that restricts all comparison-based sorting algorithms, achieving linear time complexity for specific types of data.',
        'A sorting algorithm that preserves the original relative order of elements that have the exact same value. It exists To allow multiple sorting passes over the same data without scrambling the results of previous passes—an absolute requirement for Radix Sort to function correctly.',
        'The numeric difference between the maximum and minimum possible values in a dataset. It exists To determine the exact size of the auxiliary memory array needed for direct-address counting.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Key range (k)"?',
      options: [
        'The numeric difference between the maximum and minimum possible values in a dataset. It exists To determine the exact size of the auxiliary memory array needed for direct-address counting.',
        'A sorting algorithm that preserves the original relative order of elements that have the exact same value. It exists To allow multiple sorting passes over the same data without scrambling the results of previous passes—an absolute requirement for Radix Sort to function correctly.',
        'An algorithm that orders elements without ever using &lt; or &gt; to compare two elements directly against each other. It exists To bypass the mathematical O(n log n) minimum bound that restricts all comparison-based sorting algorithms, achieving linear time complexity for specific types of data.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Non-comparison sort** — An algorithm that orders elements without ever using &lt; or &gt; to compare two elements directly against each other. It exists To bypass the mathematical O(n log n) minimum bound that restricts all comparison-based sorting algorithms, achieving linear time complexity for specific types of data.',
    '**Key range (k)** — The numeric difference between the maximum and minimum possible values in a dataset. It exists To determine the exact size of the auxiliary memory array needed for direct-address counting.',
    '**Stable sort** — A sorting algorithm that preserves the original relative order of elements that have the exact same value. It exists To allow multiple sorting passes over the same data without scrambling the results of previous passes—an absolute requirement for Radix Sort to function correctly.',
    '**Radix** — The base of a number system (e.g., base 10 for decimal numbers). It exists To break down unmanageably large integer ranges into a sequence of small, manageable digit-by-digit chunks that can be sorted sequentially.',
  ],

  checkpoints: ['read-intuition'],
}
