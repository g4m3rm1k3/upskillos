// cpp-dsa — Lesson 21: Two Pointers and Sliding Window
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 21 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-21-two-pointers-and-sliding-window',
  slug: 'two-pointers-and-sliding-window',
  chapter: 6,
  order: 1,
  title: 'Two Pointers and Sliding Window',
  subtitle: 'Advanced Techniques',
  tags: ['two-pointers', 'sliding-window', 'brute-force'],

  hook: {
    question: 'What is "Two Pointers and Sliding Window", and why does it matter?',
    realWorldContext: 'You will write isolated algorithm proofs demonstrating two integer indices traversing an array. The transferable problem this solves is reducing quadratic O(n²) nested loop performance down to linear O(n) time by taking advantage of ordered data or overlapping contiguous sequences.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: The Two-Pointer Technique, Fixed-Size Sliding Window, Dynamic-Size Sliding Window.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Two Pointers:** An algorithmic pattern that uses two reference indices to traverse a collection, typically moving towards each other or in the same direction. It exists To reduce nested loops (O(n²)) down to a single pass (O(n)) by taking advantage of ordered data or specific constraints.\n- **Sliding Window:** A subset of the two-pointer technique where the two pointers define the boundaries of a contiguous subarray (a "window") moving in the same direction. It exists To process contiguous sequence problems efficiently by reusing overlapping work from the previous step instead of recalculating from scratch.\n- **Brute Force:** The most straightforward, exhaustive approach to solving a problem, usually relying on nested loops to check every possibility. It exists To establish a baseline for correctness before optimizing for performance.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::vector&lt;T&gt;:** A dynamic array.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A full trace of algorithmic progression: we start with brute force O(n²) searching, checking every pair. By sorting the data, we enable opposite-end Two Pointers to eliminate invalid pairs instantly, dropping the time to O(n). When dealing with contiguous sequences rather than isolated pairs, we adapt the pointers to move in the same direction, turning Two Pointers into a Sliding Window. Whether fixed or dynamic, the fundamental mechanic remains the same: two indices that never backtrack, ensuring we only pass through the data once.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If we attempt to solve the dynamic sliding window without independent pointer tracking, we fall back to a naive nested loop approach. Modify the `dynamic_window.cpp` code to a brute force approach: \n\n```cpp\nint min_length = arr.size() + 1;\nfor (int i = 0; i < arr.size(); i++) {\n    int sum = 0;\n    for (int j = i; j < arr.size(); j++) {\n        sum += arr[j];\n        if (sum >= target) {\n            min_length = std::min(min_length, j - i + 1);\n            break;\n        }\n    }\n}\n```\n\n**The result:** This code is functionally correct and produces the exact same output. However, what breaks is performance at scale. Because `j` resets back to `i` on every iteration, this runs in O(n²) time. On an array of 100,000 elements, the sliding window finishes in milliseconds; the brute force nested loop executes 5 billion inner loop iterations and freezes your program.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Two Pointers:** Write a program that takes `std::vector<int> nums = {0, 1, 0, 3, 12};` and moves all `0`s to the end of the array using two pointers moving in the same direction.\n- **Fixed Window:** Given `std::vector<double> temps = {70.0, 72.5, 71.0, 75.0, 74.0, 76.0};`, find the maximum average temperature over any 3-day window.\n- **Dynamic Window:** Given a string `std::string s = "abcabcbb";`, find the length of the longest substring without repeating characters using a sliding window and a `std::set` or `std::unordered_map` to track character uniqueness inside the window.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run an opposite-direction two-pointer algorithm.\n- [ ] You have compiled and run a fixed-size sliding window algorithm.\n- [ ] You have compiled and run a dynamic-size sliding window algorithm.\n- [ ] You can explain out loud why a `while` loop nested inside a `for` loop does not automatically mean O(n²) time complexity.\n- [ ] `git commit -m "feat: complete two pointers and sliding window concepts"` — Commits the isolated concept files.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 21: Two Pointers and Sliding Window',
        caption: 'Two Pointers and Sliding Window',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Two-Pointer Technique',
              prose: [
                'Finding a pair of numbers in a sorted array that sum to a specific target. A brute force approach checks every possible pair using nested loops, which takes O(n²) time. As the array grows, nested iterations become unacceptably slow. We need a way to find the pair in a single pass.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nint main() {\n    int left = 0;\n    int right = 4;\n    \n    while (left < right) {\n        std::cout << "Evaluating " << left << " and " << right << "\\n";\n        left++;\n        right--;\n    }\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard input/output stream library so we can print results to the console.\n- `#include <vector>`: Instructs the compiler to include the definition for the `std::vector` dynamic array template.\n- `int main() {`: The entry point of the C++ program where execution begins.\n- `std::vector<int> numbers = {2, 7, 11, 15, 21};`: Declares a dynamic array restricted to holding integers, initialized with a strictly sorted list of values. The sorting is critical; without it, this algorithm fails.\n- `int target = 26;`: Declares the integer sum we are trying to find.\n- `int left = 0;`: Initializes the first pointer to index `0`, the absolute start of the array.\n- `int right = numbers.size() - 1;`: Initializes the second pointer to the absolute end of the array. We subtract `1` because `size()` returns the total count, but array indices are zero-based.\n- `while (left < right)`: The traversal loop. It continues as long as the left index is strictly less than the right index, ensuring the pointers never cross over each other.\n- `int current_sum = numbers[left] + numbers[right];`: Calculates the sum of the two values currently pointed to by our left and right indices.\n- `if (current_sum == target)`: Checks if the sum exactly matches our goal.\n- `std::cout << ...`: Prints the found indices to the console.\n- `break;`: Immediately terminates the `while` loop, preventing further unnecessary searching since we already found the answer.\n- `else if (current_sum < target)`: Checks if the sum is too small. Because the array is sorted, the only way to increase the sum is to move the left pointer to the right, pointing to a larger number.\n- `left++;`: Increments the left index by one.\n- `else { right--; }`: If the sum is neither equal nor too small, it must be too large. Because the array is sorted, the only way to decrease the sum is to move the right pointer to the left, pointing to a smaller number. Decrements the right index by one.\n- `return 0;`: Signals to the operating system that the program executed successfully.\nExecution trace:\n- `left` is 0 (value 2), `right` is 4 (value 21). `current_sum` is 23. Because 23 < 26, `left` increments to 1.\n- `left` is 1 (value 7), `right` is 4 (value 21). `current_sum` is 28. Because 28 > 26, `right` decrements to 3.\n- `left` is 1 (value 7), `right` is 3 (value 15). `current_sum` is 22. Because 22 < 26, `left` increments to 2.\n- `left` is 2 (value 11), `right` is 3 (value 15). `current_sum` is 26. This matches `target`, the `if` branch executes, prints, and `break` exits the loop.',
                '**CS lens.** This reduces an O(n²) quadratic search down to O(n) linear time. By relying on the strict sorted order of the input array, every failed check systematically eliminates an entire row or column of potential pairs without having to actually evaluate them. Also recognized in: quicksort partitioning, palindrome checking, reversing linked lists.',
                '**SE lens.** The alternative not chosen is a brute-force nested loop checking every pair. The tradeoff is that the two-pointer technique strictly requires the input array to be pre-sorted. If the input is unsorted, you must pay the O(n log n) cost to sort it first, or use a completely different approach like a hash map.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> numbers = {2, 7, 11, 15, 21};\n    int target = 26;\n    \n    int left = 0;\n    int right = numbers.size() - 1;\n    \n    while (left < right) {\n        int current_sum = numbers[left] + numbers[right];\n        \n        if (current_sum == target) {\n            std::cout << "Found target at indices: " << left << " and " << right << "\\n";\n            break;\n        } else if (current_sum < target) {\n            left++;\n        } else {\n            right--;\n        }\n    }\n    \n    return 0;\n}',
              expectedOutput: 'Found target at indices: 2 and 3',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Fixed-Size Sliding Window',
              prose: [
                'Finding the maximum sum of any contiguous subarray of size `k`. A brute force approach calculates the sum of elements `0` to `k-1`, then elements `1` to `k`, then `2` to `k+1`. This recalculates the same overlapping inner elements over and over, doing O(k) work for every single position in the array. We need to reuse the overlapping work.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nint main() {\n    int sum = 2 + 1 + 5; // 8\n    std::cout << "Initial sum: " << sum << "\\n";\n    \n    sum = sum - 2 + 1; \n    std::cout << "Next sum: " << sum << "\\n";\n    \n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard input/output stream library.\n- `#include <vector>`: Brings in the definition for `std::vector`.\n- `#include <algorithm>`: Brings in standard algorithms, specifically `std::max`, which we need for comparing maximum values without writing manual `if` blocks.\n- `int main() {`: The entry point of the C++ program.\n- `std::vector<int> arr = {2, 1, 5, 1, 3, 2};`: Declares our array of integers. This data does not need to be sorted.\n- `int k = 3;`: Declares the strict, fixed size of the contiguous window we must evaluate.\n- `int window_sum = 0;`: Declares an integer to track the running total of the elements currently inside our window.\n- `for (int i = 0; i < k; i++)`: A loop that runs exactly `k` times to establish the very first window at the start of the array.\n- `window_sum += arr[i];`: Adds the first `k` elements to `window_sum`.\n- `int max_sum = window_sum;`: Stores the sum of the first window as the initial baseline record to beat.\n- `for (int i = k; i < arr.size(); i++)`: Begins looping from the element immediately *after* the first window (`i = k`), scanning to the end of the array.\n- `window_sum = window_sum - arr[i - k] + arr[i];`: The core slide mechanic. `arr[i - k]` identifies the element that is exiting the left side of the window, subtracting it. `arr[i]` identifies the new element entering the right side of the window, adding it.\n- `std::max(max_sum, window_sum)`: Compares the all-time record (`max_sum`) against the newly slid window\'s sum (`window_sum`), returning the larger of the two.\n- `max_sum = ...`: Updates the all-time record with the result of the `std::max` comparison.\n- `std::cout << ...`: Prints the maximum sum found to the console.\n- `return 0;`: Signals successful execution.\nExecution trace:\n- Initial loop finishes: `window_sum` is 8 (2 + 1 + 5). `max_sum` becomes 8.\n- Main loop `i=3` (value 1): `window_sum` becomes 8 - 2 + 1 = 7. `max_sum` remains 8.\n- Main loop `i=4` (value 3): `window_sum` becomes 7 - 1 + 3 = 9. `max_sum` updates to 9.\n- Main loop `i=5` (value 2): `window_sum` becomes 9 - 5 + 2 = 6. `max_sum` remains 9.',
                '**CS lens.** This is a fixed-size sliding window. It converts an O(n * k) overlapping recalculation into a pure O(n) linear sweep. By treating the window as a continuous stream of state, we process each element in the entire array exactly twice: once when it enters the window, and once when it leaves. Also recognized in: network packet rate limiting, moving averages in signal processing, rendering viewports in graphics.',
                '**SE lens.** The alternative not chosen is nesting two loops and running a fresh sum calculation for every position. The tradeoff here is maintaining valid state across loop iterations (`window_sum` and `max_sum` living outside the loop). State that persists across iterations is notoriously prone to off-by-one errors (like getting `arr[i - k]` wrong), making the boundaries of the loop far more fragile than a brute-force approach.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> arr = {2, 1, 5, 1, 3, 2};\n    int k = 3;\n    \n    int window_sum = 0;\n    for (int i = 0; i < k; i++) {\n        window_sum += arr[i];\n    }\n    \n    int max_sum = window_sum;\n    \n    for (int i = k; i < arr.size(); i++) {\n        window_sum = window_sum - arr[i - k] + arr[i];\n        max_sum = std::max(max_sum, window_sum);\n    }\n    \n    std::cout << "Maximum sum of subarray of size " << k << ": " << max_sum << "\\n";\n    \n    return 0;\n}',
              expectedOutput: 'Maximum sum of subarray of size 3: 9',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Dynamic-Size Sliding Window',
              prose: [
                'Finding the length of the smallest contiguous subarray whose sum is greater than or equal to a `target`. Here, we don\'t know the window size `k` in advance; the window needs to grow to accumulate enough sum, then shrink from the back to find the absolute minimum length that still satisfies the target.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> data = {10, 20, 30};\n    int left = 0;\n    \n    for (int right = 0; right < data.size(); right++) {\n        std::cout << "Expanding right to " << right << "\\n";\n        \n        while (left < right) {\n            std::cout << "  Shrinking left to " << left + 1 << "\\n";\n            left++;\n        }\n    }\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard input/output stream library.\n- `#include <vector>`: Brings in the definition for `std::vector`.\n- `#include <algorithm>`: Brings in standard algorithms, specifically `std::min`, used to keep the smallest length.\n- `int main() {`: The entry point of the C++ program.\n- `std::vector<int> arr = {2, 1, 5, 2, 8};`: Declares the array to search.\n- `int target = 7;`: Declares the minimum sum threshold our subarray must meet.\n- `int min_length = arr.size() + 1;`: Initializes the record tracker to an impossibly large value. If the array has 5 elements, the maximum possible valid length is 5. Setting it to 6 ensures any real valid length will immediately overwrite it.\n- `int window_sum = 0;`: Tracks the current sum.\n- `int left = 0;`: Initializes the trailing pointer that will define the back end of the dynamic window.\n- `for (int right = 0; right < arr.size(); right++)`: The leading pointer `right` iterates through every element one by one, unconditionally expanding the window.\n- `window_sum += arr[right];`: Incorporates the newly encountered leading element into the running total.\n- `while (window_sum >= target)`: The condition that determines if the window is currently "valid". As long as the sum is high enough, we enter the loop to shrink the window from the back to see if a smaller valid window is possible.\n- `int current_length = right - left + 1;`: Calculates the inclusive length of the window right now.\n- `std::min(min_length, current_length)`: Compares the smallest recorded length against the current valid window.\n- `min_length = ...`: Updates the all-time record if the current valid window is smaller than the previous record.\n- `window_sum -= arr[left];`: The core shrinking mechanic. Removes the value at the trailing pointer from the running sum *before* we move the pointer.\n- `left++;`: Advances the trailing pointer, physically shrinking the window. The `while` loop then re-evaluates if the window is still valid.\n- `if (min_length == arr.size() + 1)`: A final safety check. If the record never changed from its impossible initial value, it means no valid subarray was ever found.\n- `min_length = 0;`: Sets the result to 0 to accurately report no valid windows.\n- `std::cout << ...`: Prints the final result.\n- `return 0;`: Signals successful execution.\nExecution trace:\n- `right` is 0 (value 2), sum is 2. `while` loop is skipped.\n- `right` is 1 (value 1), sum is 3. `while` loop is skipped.\n- `right` is 2 (value 5), sum is 8. 8 >= 7, enter `while`.\n- `current_length` is 3 (indices 0 to 2). `min_length` becomes 3.\n- Subtract `arr[left]` (value 2), sum becomes 6. `left` increments to 1.\n- `while` loop condition (6 >= 7) is now false.\n- `right` is 3 (value 2), sum is 8. 8 >= 7, enter `while`.\n- `current_length` is 3 (indices 1 to 3). `min_length` remains 3.\n- Subtract `arr[left]` (value 1), sum becomes 7. `left` increments to 2.\n- `while` loop condition (7 >= 7) is true! Enter `while` again.\n- `current_length` is 2 (indices 2 to 3). `min_length` becomes 2.\n- Subtract `arr[left]` (value 5), sum becomes 2. `left` increments to 3.\n- `while` loop condition (2 >= 7) is now false.\n- `right` is 4 (value 8), sum is 10. 10 >= 7, enter `while`.\n- `current_length` is 2 (indices 3 to 4). `min_length` remains 2.\n- Subtract `arr[left]` (value 2), sum becomes 8. `left` increments to 4.\n- `while` loop condition (8 >= 7) is true.\n- `current_length` is 1 (indices 4 to 4). `min_length` becomes 1.\n- Subtract `arr[left]` (value 8), sum becomes 0. `left` increments to 5.\n- `while` loop condition (0 >= 7) is false.',
                '**CS lens.** This expands the window pattern to variable sizes, adapting dynamically to the data. It maintains O(n) linear time complexity despite the nested `while` loop because the inner loop pointer (`left`) never resets to `0` — both `left` and `right` traverse the array exactly once, meaning at most 2n operations occur. Also recognized in: garbage collection compaction, TCP congestion control sliding windows.',
                '**SE lens.** The alternative not chosen is recalculating the subarray sum from scratch for every possible pair of start and end indices. The tradeoff here is complex boundary management. The logic for exactly when to increment `left`, and doing so strictly *after* reading `arr[left]`, is a common source of off-by-one errors that the brute-force approach avoids.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> arr = {2, 1, 5, 2, 8};\n    int target = 7;\n    \n    int min_length = arr.size() + 1;\n    int window_sum = 0;\n    int left = 0;\n    \n    for (int right = 0; right < arr.size(); right++) {\n        window_sum += arr[right];\n        \n        while (window_sum >= target) {\n            int current_length = right - left + 1;\n            min_length = std::min(min_length, current_length);\n            \n            window_sum -= arr[left];\n            left++;\n        }\n    }\n    \n    if (min_length == arr.size() + 1) {\n        min_length = 0;\n    }\n    \n    std::cout << "Minimum length subarray: " << min_length << "\\n";\n    \n    return 0;\n}',
              expectedOutput: 'Minimum length subarray: 1',
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
      'Next lesson: Dynamic Programming: Memoization.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Two Pointers"?',
      options: [
        'An algorithmic pattern that uses two reference indices to traverse a collection, typically moving towards each other or in the same direction. It exists To reduce nested loops (O(n²)) down to a single pass (O(n)) by taking advantage of ordered data or specific constraints.',
        'The most straightforward, exhaustive approach to solving a problem, usually relying on nested loops to check every possibility. It exists To establish a baseline for correctness before optimizing for performance.',
        'A subset of the two-pointer technique where the two pointers define the boundaries of a contiguous subarray (a "window") moving in the same direction. It exists To process contiguous sequence problems efficiently by reusing overlapping work from the previous step instead of recalculating from scratch.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Brute Force"?',
      options: [
        'The most straightforward, exhaustive approach to solving a problem, usually relying on nested loops to check every possibility. It exists To establish a baseline for correctness before optimizing for performance.',
        'A subset of the two-pointer technique where the two pointers define the boundaries of a contiguous subarray (a "window") moving in the same direction. It exists To process contiguous sequence problems efficiently by reusing overlapping work from the previous step instead of recalculating from scratch.',
        'An algorithmic pattern that uses two reference indices to traverse a collection, typically moving towards each other or in the same direction. It exists To reduce nested loops (O(n²)) down to a single pass (O(n)) by taking advantage of ordered data or specific constraints.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Sliding Window"?',
      options: [
        'The most straightforward, exhaustive approach to solving a problem, usually relying on nested loops to check every possibility. It exists To establish a baseline for correctness before optimizing for performance.',
        'An algorithmic pattern that uses two reference indices to traverse a collection, typically moving towards each other or in the same direction. It exists To reduce nested loops (O(n²)) down to a single pass (O(n)) by taking advantage of ordered data or specific constraints.',
        'A subset of the two-pointer technique where the two pointers define the boundaries of a contiguous subarray (a "window") moving in the same direction. It exists To process contiguous sequence problems efficiently by reusing overlapping work from the previous step instead of recalculating from scratch.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Two Pointers** — An algorithmic pattern that uses two reference indices to traverse a collection, typically moving towards each other or in the same direction. It exists To reduce nested loops (O(n²)) down to a single pass (O(n)) by taking advantage of ordered data or specific constraints.',
    '**Sliding Window** — A subset of the two-pointer technique where the two pointers define the boundaries of a contiguous subarray (a "window") moving in the same direction. It exists To process contiguous sequence problems efficiently by reusing overlapping work from the previous step instead of recalculating from scratch.',
    '**Brute Force** — The most straightforward, exhaustive approach to solving a problem, usually relying on nested loops to check every possibility. It exists To establish a baseline for correctness before optimizing for performance.',
  ],

  checkpoints: ['read-intuition'],
}
