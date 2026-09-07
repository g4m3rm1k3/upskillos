// cpp-dsa — Lesson 17: Merge Sort
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 17 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-17-merge-sort',
  slug: 'merge-sort',
  chapter: 5,
  order: 2,
  title: 'Merge Sort',
  subtitle: 'Sorting and Searching',
  tags: ['divide-and-conquer', 'merge-step', 'auxiliary-space', 'stability'],

  hook: {
    question: 'What is "Merge Sort", and why does it matter?',
    realWorldContext: 'You will write a program that sorts an array of integers using the Merge Sort algorithm from scratch, and then you will replicate the same stable sorting behavior using the C++ Standard Library. The transferable problem this solves is ordering large datasets efficiently in O(n log n) time while maintaining the relative order of identical elements.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: The Merge Step, Recursive Divide and Conquer, std::stable_sort.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Divide and conquer:** An algorithmic paradigm that solves a complex problem by recursively breaking it down into smaller, simpler subproblems, solving those, and combining their results. It exists To reduce the time complexity of algorithms that would otherwise require exhaustive quadratic (O(n²)) or exponential work on the whole dataset at once.\n- **Merge step:** The process of reading two separately sorted sequences and combining them into a single sorted sequence in a single pass. It exists It is the engine of Merge Sort; it performs all the actual sorting work, while the recursion merely handles the splitting.\n- **Auxiliary space:** Additional memory required by an algorithm, beyond the memory used to hold the input itself. It exists To quantify memory overhead; algorithms like Merge Sort cannot easily shuffle elements in-place without overwriting unread data, so they require a separate buffer to hold intermediate results.\n- **Stability:** A property of a sorting algorithm where equal elements reliably retain their original relative order after sorting. It exists To preserve secondary sorting criteria, such as sorting a list by last name, and then sorting it by first name without destroying the last name order for people with the same first name.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::stable_sort:** A Standard Library algorithm that sorts elements while guaranteeing stability.\n- **std::vector&lt;T&gt;:** A dynamic array that can grow in size.\n- **push_back:** A method on std::vector that appends a new element.\n- **size:** A method on std::vector that returns the current number of elements.\n- **std::cout:** The standard character output stream.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Start with the value `82` in the initial unsorted `data` array `{38, 27, 43, 3, 9, 82, 10}`. The recursive `merge_sort` calls repeatedly halve the array, eventually isolating `82` into its own trivial subarray `{82}`. Because the left index equals the right index, the recursion bottoms out. It is then passed into `merge` alongside the trivial subarray `{10}`. The `merge` function compares `82` and `10`, appends `10` to `temp` first, then appends `82`, weaving them into the sorted sequence `{10, 82}`. This sequence continues being merged up the tree until `82` reaches its final, fully sorted position near the end of the array.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you accidentally write an unstable comparison inside your `merge` function, equal elements will permanently swap positions. Modify the `merge` function\'s critical condition by removing the equals sign: \n\n```cpp\nif (arr[i] < arr[j]) { // Was <=\n```\n\nIf your array contains `{5, 5}`, when `merge` processes the two halves, the strict `<` check will force it to pull the element from the right sequence *before* the element from the left sequence. The original relative order is destroyed. Your algorithm still sorts, but it has quietly lost its stability property.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Descending Order:** Modify your custom `merge` function to sort the integers in descending order (largest to smallest) by changing exactly one character.\n- **Counting Operations:** Add a global integer variable named `comparisons`. Increment it every time `if (arr[i] <= arr[j])` executes. Print it at the end of `main` to see exactly how many comparisons it took to sort the array.\n- **Custom Lambda:** Write a program using `std::stable_sort` that sorts a vector of strings strictly by their lengths, rather than alphabetically, using a custom lambda function.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run the custom `merge_sort.cpp` successfully.\n- [ ] You have compiled and run the `stable_sort_demo.cpp` successfully.\n- [ ] You can explain out loud why allocating a `temp` vector inside the merge step is necessary.\n- [ ] You have committed your changes to version control: `git commit -m "Implement stable Merge Sort from scratch and using the STL"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 17: Merge Sort',
        caption: 'Merge Sort',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Merge Step',
              prose: [
                'You have two separate sequences of data that are already sorted individually. You need to combine them into one larger sorted sequence. A naive approach might simply append the second sequence to the end of the first and run a full sorting algorithm on the combined result, completely destroying the performance advantage that the halves are already sorted. You need an operation that reads both sequences exactly once and weaves them together into a single sorted result.',
                '## How the Code Works',
                '- **`void merge`** — Declares a function named `merge` that returns no value.\n- **`std::vector<int>& arr`** — The first parameter. `std::vector<int>` is a dynamic array holding integers; the `&` means it is passed by reference so we directly modify the original array in memory, not a copy.\n- **`int left_idx, int mid, int right_idx`** — Integer parameters defining the boundaries of the sequences within the array. `left_idx` is the start of the first sequence, `mid` is its end, and `right_idx` is the end of the second sequence.\n- **`std::vector<int> temp;`** — Declares a new, empty dynamic array named `temp`. This acts as our auxiliary space, required because shifting elements directly within `arr` would overwrite unread data.\n- **`int i = left_idx;`** — Declares an integer `i` initialized to `left_idx`. This serves as the read pointer for the left sequence.\n- **`int j = mid + 1;`** — Declares an integer `j` initialized to `mid + 1`. This serves as the read pointer for the right sequence.\n- **`while (i <= mid && j <= right_idx)`** — A loop that continues only as long as both pointers have not passed the end of their respective sequences. The `&&` (logical AND) ensures we stop weaving as soon as either sequence is exhausted.\n- **`if (arr[i] <= arr[j])`** — Compares the element at index `i` with the element at index `j`. The `<=` operator is what guarantees stability: if two elements are equal, the left one is chosen first, preserving its earlier relative position.\n- **`temp.push_back(arr[i]);`** — Reads the integer at index `i` from `arr` and appends it to the end of `temp`, saving it safely.\n- **`i++;`** — The post-increment operator. It advances the read pointer `i` by one so the next iteration examines the next element in the left sequence.\n- **`else`** — The branch taken if the element in the right sequence was strictly smaller than the left sequence\'s current element.\n- **`temp.push_back(arr[j]);`** — Appends the element from the right sequence to `temp`.\n- **`j++;`** — Advances the read pointer `j` by one.\n- **`while (i <= mid)`** — A secondary loop that runs only if the right sequence was exhausted first. It safely copies any remaining unread elements from the left sequence.\n- **`temp.push_back(arr[i]); i++;`** — Appends the remaining left element and advances the pointer.\n- **`while (j <= right_idx)`** — A tertiary loop that runs only if the left sequence was exhausted first. It safely copies any remaining unread elements from the right sequence.\n- **`temp.push_back(arr[j]); j++;`** — Appends the remaining right element and advances the pointer.\n- **`for (int k = 0; k < temp.size(); k++)`** — A standard counting loop. `k` starts at `0`, increments by `1` each time via `k++`, and stops when it reaches the total number of elements currently stored in `temp` (returned by `temp.size()`).\n- **`arr[left_idx + k] = temp[k];`** — The assignment operator `=`. It reads the sorted value from `temp` at offset `k` and writes it back into the original `arr` at the correct global offset starting from `left_idx`.\nExecution trace of the main while loop merging `{2, 5}` and `{3, 6}`:\n- `i = 0, j = 2` — The left element `2` is less than or equal to the right element `3`, so `2` is appended to `temp`, and `i` advances to `1`.\n- `i = 1, j = 2` — The left element `5` is strictly greater than the right element `3`, so `3` is appended to `temp`, and `j` advances to `3`.\n- `i = 1, j = 3` — The left element `5` is less than or equal to the right element `6`, so `5` is appended to `temp`, and `i` advances to `2`.\n- The loop terminates because `i > mid`, and the remaining `6` is picked up by the tertiary clean-up loop.',
                '**CS lens.** The time complexity of this merge operation is O(n), where n is the total number of elements between `left_idx` and `right_idx`. We touch each element exactly once when moving it into `temp`, and exactly once when copying it back. The auxiliary space is also O(n) because `temp` grows to hold exactly n elements.',
                '**SE lens.** The design principle here is simplicity and safety over theoretical micro-optimization. The alternative not chosen is attempting an "in-place" merge to avoid allocating `temp`. Real in-place merging is highly complex, involves heavy block-swapping logic, and severely degrades the O(n) time performance. Allocating a temporary buffer is the industry standard tradeoff to keep the merge fast and stable.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nvoid merge(std::vector<int>& arr, int left_idx, int mid, int right_idx) {\n    std::vector<int> temp;\n    int i = left_idx;\n    int j = mid + 1;\n\n    while (i <= mid && j <= right_idx) {\n        if (arr[i] <= arr[j]) {\n            temp.push_back(arr[i]);\n            i++;\n        } else {\n            temp.push_back(arr[j]);\n            j++;\n        }\n    }\n\n    while (i <= mid) {\n        temp.push_back(arr[i]);\n        i++;\n    }\n\n    while (j <= right_idx) {\n        temp.push_back(arr[j]);\n        j++;\n    }\n\n    for (int k = 0; k < temp.size(); k++) {\n        arr[left_idx + k] = temp[k];\n    }\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Recursive Divide and Conquer',
              prose: [
                'The merge step requires its two input halves to already be sorted. But you start with a single, completely unsorted array. You need a way to break the large problem down into pieces so small that they are trivially sorted by definition, and then feed them back up into your merge function.',
                '## How the Code Works',
                '- **`void merge_sort`** — Declares the function.\n- **`std::vector<int>& arr`** — The array, passed by reference so all recursive branches operate on the exact same underlying memory.\n- **`int left_idx, int right_idx`** — The bounds defining which segment of the array this specific function call is responsible for sorting.\n- **`if (left_idx >= right_idx)`** — The base case condition. The `>=` operator checks if the subarray consists of one or zero elements.\n- **`return;`** — Exits the function immediately, because a subarray of size one is already sorted by definition and needs no further splitting or merging.\n- **`int mid = left_idx + (right_idx - left_idx) / 2;`** — Computes the exact middle index. The mathematical structure `left + (right - left) / 2` safely determines the midpoint while preventing integer overflow that could occur if we naïvely calculated `(left + right) / 2` with very large numbers.\n- **`merge_sort(arr, left_idx, mid);`** — A recursive call invoking the function itself to sort the left half. The current execution pauses until this left side is fully divided and merged.\n- **`merge_sort(arr, mid + 1, right_idx);`** — A recursive call invoking the function itself to sort the right half.\n- **`merge(arr, left_idx, mid, right_idx);`** — Calls the `merge` function we wrote earlier to combine the two newly sorted halves into one sorted whole.\n- **`int main()`** — The program entry point.\n- **`std::vector<int> data = {38, 27, 43, 3, 9, 82, 10};`** — Declares a dynamic array and initializes it with an unsorted sequence of integers.\n- **`merge_sort(data, 0, data.size() - 1);`** — Kicks off the sort on the entire array, passing `0` as the left bound and the last valid index as the right bound.\n- **`for (int val : data)`** — A range-based for loop. It asks `data` for its beginning and end, sequentially copying each element into the local variable `val`.\n- **`std::cout << val << " ";`** — Streams the integer `val` and a space string literal to the standard output.\n- **`return 0;`** — Signals to the operating system that the program ran successfully.\nExecution trace for control flow:\n- `merge_sort(data, 0, 6)` — Starts the sort for the whole array. It calculates `mid = 3` and pauses itself to call the left half.\n- `merge_sort(data, 0, 3)` — Recursively calls itself to sort the left half `{38, 27, 43, 3}`. It calculates `mid = 1` and pauses.\n- `merge_sort(data, 0, 1)` — Recursively calls itself to sort `{38, 27}`. It calculates `mid = 0` and pauses.\n- `merge_sort(data, 0, 0)` — Recursively calls itself to sort `{38}`. Since `left_idx == right_idx`, it hits the base case and immediately returns.\n- `merge_sort(data, 1, 1)` — Recursively calls itself to sort `{27}`. It hits the base case and returns.\n- `merge(data, 0, 0, 1)` — The two trivial halves `{38}` and `{27}` are passed to `merge`, which correctly orders them and overwrites the array segment to become `{27, 38}`.',
                '**CS lens.** The time complexity of the entire algorithm is O(n log n). The recursion halves the array repeatedly, creating a recursion tree with a depth of O(log n). At each level of depth, the `merge` operations across all branches combine to perform O(n) total work.',
                '**SE lens.** The design principle here is relying on the call stack to manage state. The alternative not chosen is an iterative, bottom-up merge sort using loops instead of recursion. The tradeoff is that recursion consumes stack memory (O(log n) frames). However, because log₂(1,000,000) is only about 20, the stack depth is incredibly shallow even for massive datasets, making recursion completely safe here without risking a stack overflow.'
              ],
              typeIt: true,
              solution: 'void merge_sort(std::vector<int>& arr, int left_idx, int right_idx) {\n    if (left_idx >= right_idx) {\n        return;\n    }\n    \n    int mid = left_idx + (right_idx - left_idx) / 2;\n    \n    merge_sort(arr, left_idx, mid);\n    merge_sort(arr, mid + 1, right_idx);\n    \n    merge(arr, left_idx, mid, right_idx);\n}\n\nint main() {\n    std::vector<int> data = {38, 27, 43, 3, 9, 82, 10};\n    merge_sort(data, 0, data.size() - 1);\n    \n    for (int val : data) {\n        std::cout << val << " ";\n    }\n    std::cout << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::stable_sort',
              prose: [
                'Writing Merge Sort by hand is tedious and exposes you to off-by-one errors in your indices. In production, you need a pre-written, highly optimized standard algorithm that guarantees O(n log n) stable sorting without writing custom logic.',
                '## How the Code Works',
                '- **`#include <algorithm>`** — Instructs the compiler to include the Standard Library algorithms header, which contains the definition for `std::stable_sort`. Without this, the compiler cannot find the sorting logic.\n- **`int main()`** — The program entry point.\n- **`std::vector<int> data`** — Declares the dynamic array sequence.\n- **`std::stable_sort(data.begin(), data.end());`** — Calls the Standard Library\'s stable sorting algorithm, passing it the start and end bounds of the array. It performs the sorting entirely in place, hiding its internal memory allocations.\n- **`data.begin()`** — A method on `std::vector` that returns an iterator pointing to the very first element.\n- **`data.end()`** — A method on `std::vector` that returns an iterator pointing to the theoretical memory slot exactly one position past the final element, defining an exclusive upper bound for the sort.\n- **`for (int val : data)`** — Iterates over the now-sorted array.\n- **`std::cout << val << " ";`** — Prints the element.\n- **`return 0;`** — Returns success.',
                '**CS lens.** Under the hood, `std::stable_sort` relies on a highly optimized, adaptive variant of Merge Sort. It allocates temporary auxiliary memory dynamically.',
                '**SE lens.** The design principle here is relying on standard abstractions. The alternative not chosen is using `std::sort`. The tradeoff is that `std::sort` uses Introsort (a fast variant of Quicksort) which is generally faster and requires O(log n) space, but it is entirely unstable. You must explicitly choose `std::stable_sort` over `std::sort` when the initial relative order of equal items is semantically important.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> data = {38, 27, 43, 3, 9, 82, 10};\n    \n    std::stable_sort(data.begin(), data.end());\n    \n    for (int val : data) {\n        std::cout << val << " ";\n    }\n    std::cout << "\\n";\n    return 0;\n}',
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
      'Next lesson: Quicksort.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Divide and conquer"?',
      options: [
        'Additional memory required by an algorithm, beyond the memory used to hold the input itself. It exists To quantify memory overhead; algorithms like Merge Sort cannot easily shuffle elements in-place without overwriting unread data, so they require a separate buffer to hold intermediate results.',
        'An algorithmic paradigm that solves a complex problem by recursively breaking it down into smaller, simpler subproblems, solving those, and combining their results. It exists To reduce the time complexity of algorithms that would otherwise require exhaustive quadratic (O(n²)) or exponential work on the whole dataset at once.',
        'The process of reading two separately sorted sequences and combining them into a single sorted sequence in a single pass. It exists It is the engine of Merge Sort; it performs all the actual sorting work, while the recursion merely handles the splitting.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Auxiliary space"?',
      options: [
        'A property of a sorting algorithm where equal elements reliably retain their original relative order after sorting. It exists To preserve secondary sorting criteria, such as sorting a list by last name, and then sorting it by first name without destroying the last name order for people with the same first name.',
        'Additional memory required by an algorithm, beyond the memory used to hold the input itself. It exists To quantify memory overhead; algorithms like Merge Sort cannot easily shuffle elements in-place without overwriting unread data, so they require a separate buffer to hold intermediate results.',
        'The process of reading two separately sorted sequences and combining them into a single sorted sequence in a single pass. It exists It is the engine of Merge Sort; it performs all the actual sorting work, while the recursion merely handles the splitting.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Stability"?',
      options: [
        'An algorithmic paradigm that solves a complex problem by recursively breaking it down into smaller, simpler subproblems, solving those, and combining their results. It exists To reduce the time complexity of algorithms that would otherwise require exhaustive quadratic (O(n²)) or exponential work on the whole dataset at once.',
        'A property of a sorting algorithm where equal elements reliably retain their original relative order after sorting. It exists To preserve secondary sorting criteria, such as sorting a list by last name, and then sorting it by first name without destroying the last name order for people with the same first name.',
        'The process of reading two separately sorted sequences and combining them into a single sorted sequence in a single pass. It exists It is the engine of Merge Sort; it performs all the actual sorting work, while the recursion merely handles the splitting.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Merge step"?',
      options: [
        'A property of a sorting algorithm where equal elements reliably retain their original relative order after sorting. It exists To preserve secondary sorting criteria, such as sorting a list by last name, and then sorting it by first name without destroying the last name order for people with the same first name.',
        'The process of reading two separately sorted sequences and combining them into a single sorted sequence in a single pass. It exists It is the engine of Merge Sort; it performs all the actual sorting work, while the recursion merely handles the splitting.',
        'An algorithmic paradigm that solves a complex problem by recursively breaking it down into smaller, simpler subproblems, solving those, and combining their results. It exists To reduce the time complexity of algorithms that would otherwise require exhaustive quadratic (O(n²)) or exponential work on the whole dataset at once.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Divide and conquer** — An algorithmic paradigm that solves a complex problem by recursively breaking it down into smaller, simpler subproblems, solving those, and combining their results. It exists To reduce the time complexity of algorithms that would otherwise require exhaustive quadratic (O(n²)) or exponential work on the whole dataset at once.',
    '**Merge step** — The process of reading two separately sorted sequences and combining them into a single sorted sequence in a single pass. It exists It is the engine of Merge Sort; it performs all the actual sorting work, while the recursion merely handles the splitting.',
    '**Auxiliary space** — Additional memory required by an algorithm, beyond the memory used to hold the input itself. It exists To quantify memory overhead; algorithms like Merge Sort cannot easily shuffle elements in-place without overwriting unread data, so they require a separate buffer to hold intermediate results.',
    '**Stability** — A property of a sorting algorithm where equal elements reliably retain their original relative order after sorting. It exists To preserve secondary sorting criteria, such as sorting a list by last name, and then sorting it by first name without destroying the last name order for people with the same first name.',
  ],

  checkpoints: ['read-intuition'],
}
