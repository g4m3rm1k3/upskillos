// cpp-dsa — Lesson 20: Binary Search
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 20 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-20-binary-search',
  slug: 'binary-search',
  chapter: 5,
  order: 5,
  title: 'Binary Search',
  subtitle: 'Sorting and Searching',
  tags: ['precondition', 'loop-invariant', 'monotonic-function'],

  hook: {
    question: 'What is "Binary Search", and why does it matter?',
    realWorldContext: 'You will write isolated console programs that efficiently locate specific items within sorted arrays and calculate mathematical thresholds across continuous value spaces. The transferable problem this solves is finding an answer in logarithmic time by completely discarding half of your remaining search space at every step, bypassing the performance penalty of a linear scan.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Raw Binary Search, std::binary_search and std::lower_bound, Binary Search on the Answer.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Precondition:** A requirement that must be true before an algorithm runs. It exists To guarantee the algorithm\'s logic is mathematically sound; if the precondition is violated, the algorithm\'s output is completely undefined.\n- **Loop invariant:** A condition that remains mathematically true before and after every single iteration of a loop. It exists To formally prove that a loop will eventually terminate and produce a correct result, rather than relying on trial and error to avoid an infinite loop.\n- **Monotonic function:** A mathematical function that strictly never increases, or strictly never decreases, as its input grows. It exists To define the exact property that makes a non-array search space valid for binary search; if a function is monotonic, you can reliably predict which half of the space contains the correct answer.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::binary_search:** The C++ Standard Library algorithm to check for existence in a sorted range.\n- **std::lower_bound:** The C++ Standard Library algorithm to find an exact insertion point.\n- **std::vector&lt;T&gt;:** A dynamic array that can grow in size.\n- **std::boolalpha:** A stream manipulator that formats boolean output.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how the identical mathematical logic—halving a search space by strictly predicting which direction holds the answer—applies equally to memory addresses in a vector, half-open iterators in a standard library algorithm, and continuous floating-point variables tracking a physical threshold. The core invariant remains exactly the same: provided the space is strictly monotonic (either physically sorted or mathematically increasing), the answer is always bounded safely between `low` and `high` at every step.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If the data is completely unsorted, binary search produces a silent mathematical failure. Modify the `raw_binary_search.cpp` to shuffle the array slightly: \n\n```cpp\nstd::vector<int> arr = {5, 2, 8, 16, 12, 23, 38, 56, 72, 91};\n```\n\nWhen you search for `12`, the algorithm checks the midpoint, sees `12 < 16`, and strictly bounds the search to the left half (`5, 2, 8`). The target `12` was physically located on the right, but the algorithm mathematically excluded it based on the broken sorting precondition. The loop terminates naturally and returns `-1` (not found), despite `12` existing in the array. This is mathematically undefined behavior caused by an invariant violation.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Descending Order:** Write a raw binary search loop for an array that is sorted strictly in descending order (`90, 80, 70...`). The loop invariant is the exact same, but the condition that moves `low` and `high` must invert.\n- **Finding the Upper Bound:** C++ includes an algorithm named `std::upper_bound` which finds the first element strictly *greater* than the target. Create a vector of `[10, 10, 10, 20]`. Call `lower_bound` for `10` and `upper_bound` for `10`, subtract the returned iterators, and print the resulting difference to count the duplicates.\n- **Monotonic Capacity:** Imagine a function `bool can_ship_in_days(int capacity)` that returns true if a truck can ship all packages in an array within 5 days. Write a binary search loop from `low = 1` to `high = 10000` to find the minimum capacity that returns `true`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run a raw binary search loop checking for a specific integer.\n- [ ] You have explicitly tracked why `low = mid + 1` prevents infinite loops.\n- [ ] You have compiled and run `std::lower_bound` to find an insertion iterator.\n- [ ] You have compiled and run a floating-point binary search to find a mathematical root.\n- [ ] You can explain out loud the difference between searching an array and searching a monotonic function.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 20: Binary Search',
        caption: 'Binary Search',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Raw Binary Search',
              prose: [
                'Finding a specific item in an array using a linear scan takes time proportional to the number of items, O(n). When searching a dataset of a billion records, checking every record one by one is unacceptably slow. If the data is already sorted, you need a way to discard vast chunks of the search space at once, finding the target in logarithmic time without inspecting every element.',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard library headers for console output.\n- `#include <vector>`: Includes the standard library headers for the dynamic array.\n- `int main() { ... }`: The entry point for the executable.\n- `std::vector<int> arr = { ... };`: Initializes a dynamically sized array. **Crucially, these numbers are sorted.** This sorted order is the algorithm\'s absolute **precondition**; if the array were unsorted, the logic below would fail entirely.\n- `int target = 23;`: Declares the specific integer value we want to find within the vector.\n- `int low = 0;`: Sets the lower bound of the search space to the first index.\n- `int high = arr.size() - 1;`: Sets the upper bound of the search space to the final index.\n- `int found_index = -1;`: Initializes a variable to hold the final result, defaulting to `-1` as a signal that the element was not found.\n- `while (low <= high)`: The loop condition. This establishes the **loop invariant**: if the target exists in the array, it *must* be located at an index strictly between `low` and `high`, inclusive. The loop continues as long as this search space has at least one valid element.\n- `int mid = low + (high - low) / 2;`: Calculates the midpoint. Writing `(low + high) / 2` is a famous integer overflow bug waiting to happen; if `low` and `high` are massive integers, adding them together wraps around to a negative number before dividing. Subtracting them first avoids exceeding the maximum integer limit.\n- `if (arr[mid] == target)`: Checks if the midpoint happens to be the exact target.\n- `found_index = mid;`: Stores the successfully found index.\n- `break;`: Immediately terminates the `while` loop, as the item has been found and no further searching is necessary.\n- `else if (arr[mid] < target)`: The target is strictly greater than the midpoint value. Because the array is sorted, the target cannot possibly be at `mid`, nor anywhere to its left.\n- `low = mid + 1;`: The canonical off-by-one correction. Because we just proved `mid` is not the target, we must explicitly exclude it from the next search space. If we wrote `low = mid`, the loop would eventually get stuck checking the exact same interval infinitely when `low == high - 1`.\n- `else`: The target is strictly less than the midpoint value.\n- `high = mid - 1;`: Discards the right half of the search space, excluding `mid` for the identical off-by-one reasoning.\n- `std::cout << ...`: Prints the result to the console stream.\n- `return 0;`: Signals to the operating system that the program executed successfully.\n- `low = 0`, `high = 9` — The initial bounds cover the whole array. `mid` computes as `4`, looking at `arr[4]`, which is `16`.\n- `low = 5` — Because `16 < 23`, the lower bound steps past the midpoint to `5`. The search space is now exactly the right half of the array. `mid` computes as `7`, looking at `arr[7]`, which is `56`.\n- `high = 6` — Because `56 > 23`, the upper bound pulls down to `6`. The search space shrinks to just two indices. `mid` computes as `5`, looking at `arr[5]`, which is `23`. The `if (arr[mid] == target)` block triggers and terminates the loop.',
                '**CS lens.** This is an O(log n) algorithm. By discarding half of the search space at every step, the number of required checks grows logarithmically rather than linearly. Searching one million sorted items requires at most 20 comparisons. Searching one billion takes at most 30. This makes it exponentially faster than an O(n) linear scan. Also recognized in: binary search trees, B-trees in databases, isolating regressions via `git bisect`, finding roots in collision simulations.',
                '**SE lens.** The alternative not chosen is `std::find`, which runs a linear scan. The tradeoff is the precondition of sorting. Sorting an array takes O(n log n) time. If you only need to search an array a single time, sorting it first to use binary search is actually slower overall than just scanning it linearly. Binary search is only an architectural win if the data is naturally generated in sorted order, or if you will query the same static dataset thousands of times.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n    int target = 23;\n    \n    int low = 0;\n    int high = arr.size() - 1;\n    int found_index = -1;\n    \n    while (low <= high) {\n        int mid = low + (high - low) / 2;\n        \n        if (arr[mid] == target) {\n            found_index = mid;\n            break;\n        } else if (arr[mid] < target) {\n            low = mid + 1;\n        } else {\n            high = mid - 1;\n        }\n    }\n    \n    std::cout << "Target " << target << " found at index: " << found_index << "\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'std::binary_search and std::lower_bound',
              prose: [
                'Writing `while(low <= high)` manually is dangerous. The off-by-one errors (forgetting the `+ 1` or `- 1`) and integer overflow bugs are notorious for causing silent infinite loops in production. You need a vetted, robust implementation that handles the loop invariant and bound shifting automatically.',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the library responsible for printing to the console.\n- `#include <vector>`: Includes the dynamic array container.\n- `#include <algorithm>`: Brings in the standard library sorting and searching functions, which include the vetted binary search algorithms.\n- `int main() { ... }`: The entry point.\n- `std::vector<int> arr = { ... };`: Instantiates the dynamic array and populates it with pre-sorted integers, guaranteeing the mandatory sorting precondition.\n- `bool exists = std::binary_search(...)`: Executes a binary search across the provided range. It returns a simple boolean (`true` or `false`) stating whether the exact target exists, assigning it to the `exists` variable.\n- `arr.begin()`: A method that returns an iterator pointing to the very first element in the array.\n- `arr.end()`: A method returning an iterator pointing one slot *past* the last element. C++ algorithms use a half-open interval `[begin, end)`, meaning the search space goes up to, but strictly excludes, `end`.\n- `12`: The target integer being searched for.\n- `auto it = std::lower_bound(...)`: A distinct standard algorithm that executes a binary search to find an *insertion point*. It returns an iterator pointing to the first element in the range that is not less than the target, assigning it to the `it` variable. `auto` tells the compiler to deduce the exact iterator type itself.\n- `15`: The target integer for the `lower_bound` search.\n- `std::cout << ...`: Prints output to the terminal stream.\n- `std::boolalpha`: An I/O manipulator that forces the stream to print boolean values as the text `"true"` or `"false"` instead of `1` or `0`.\n- `if (it != arr.end())`: Checks if the returned iterator points to a valid element. If every single item in the array was strictly less than `15`, `lower_bound` would have returned the `end()` iterator, signaling failure.\n- `*it`: The dereference operator. It follows the iterator to read the actual integer residing at that position in the memory space.\n- `return 0;`: Exits the program successfully.',
                '**CS lens.** `std::lower_bound` cleanly separates the concept of "searching" from the concept of "equality." By returning the first element that is `>=` the target, it guarantees O(log n) localization whether the exact element exists or not. This is an essential operation for data structures that must repeatedly insert new elements while maintaining a strictly sorted invariant.',
                '**SE lens.** The alternative not chosen is writing the raw `while` loop from the previous unit. The tradeoff is explicit index control versus abstraction safety. The `<algorithm>` library guarantees optimal O(log n) time without off-by-one errors, but it abstracts away the exact index math, requiring you to perform iterator arithmetic (`std::distance(arr.begin(), it)`) if your software architecture demands the raw integer offset.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n    \n    bool exists = std::binary_search(arr.begin(), arr.end(), 12);\n    auto it = std::lower_bound(arr.begin(), arr.end(), 15);\n    \n    std::cout << "12 exists: " << std::boolalpha << exists << "\\n";\n    \n    if (it != arr.end()) {\n        std::cout << "First item not less than 15 is: " << *it << "\\n";\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Binary Search on the Answer',
              prose: [
                'Binary search does not strictly require an array in memory. It only requires a search space where you can ask a true/false question, and the answer to that question flips from `false` to `true` exactly once across the entire space. When you need to find an optimal threshold—like the precise square root of a number, or the maximum speed a machine can run without failing—you must binary search across an abstract mathematical value space.',
                '## How the Code Works',
                '- `#include <iostream>`: Includes the standard input/output stream library.\n- `#include <iomanip>`: Brings in the I/O manipulators required for explicitly formatting floating-point output constraints.\n- `int main() { ... }`: The executable entry point.\n- `double target_area = 50.0;`: Declares a floating-point variable representing the value we want to find the square root of.\n- `double low = 0.0;`: Sets the absolute lowest possible mathematical answer for the root.\n- `double high = target_area;`: Sets the highest possible bound. For integers > 1, the root cannot physically exceed the original number itself.\n- `double mid = 0.0;`: Initializes the variable that will hold the midpoint test value.\n- `while (high - low > 0.00001)`: The loop condition. Because we are searching continuous floating-point numbers, `low` and `high` will never exactly equal each other. We subtract `low` from `high` to get the mathematical distance, and loop until that gap shrinks below an arbitrary precision threshold.\n- `mid = low + (high - low) / 2.0;`: Computes the exact decimal midpoint of the current continuous search space. Division by `2.0` forces floating-point division.\n- `double current_area = mid * mid;`: This multiplication forms the **monotonic function**. As `mid` increases, `mid * mid` strictly increases. This guarantees that if our result is too small, the true root *must* lie in the higher mathematical half.\n- `if (current_area < target_area)`: Tests the squared midpoint against our target constraint.\n- `low = mid;`: If the area is too small, the true root is strictly larger. Because we are using continuous floating-point math, the next valid number isn\'t `mid + 1`. We set `low` directly to `mid` to narrow the window without mathematically skipping over valid decimal values.\n- `else`: The target area is less than or equal to the midpoint\'s square.\n- `high = mid;`: The upper bound drops directly to `mid`, explicitly discarding the upper half of the mathematical space.\n- `std::cout << ...`: Begins the console output stream.\n- `std::fixed`: Forces the standard output stream to use standard decimal notation rather than switching automatically to scientific notation.\n- `std::setprecision(4)`: Commands the output stream to round and print exactly four digits after the decimal point.\n- `return 0;`: Signals successful execution to the system.\n- `low = 0.0`, `high = 50.0` — `mid` computes as `25.0`. The square of `25.0` is `625.0`.\n- `high = 25.0` — Because `625.0 > 50.0`, the upper bound drops to `25.0`. `mid` computes as `12.5`. The square of `12.5` is `156.25`.\n- `high = 12.5` — Because `156.25 > 50.0`, the upper bound drops again to `12.5`. The space halves continuously. The algorithm mathematically hones in on the exact decimal until the bounds are `0.00001` apart.',
                '**CS lens.** This is known formally as "binary search on the answer." The precondition is no longer "a sorted array," but rather a **monotonic function**—a deterministic condition that maps the entire search space so that it is entirely false on one side of a threshold and entirely true on the other (`F F F F T T T T`).',
                '**SE lens.** The alternative not chosen is stepping upward by tiny linear increments (`0.0001`, `0.0002`) and checking each one continuously. The tradeoff is extreme performance gain at the direct cost of precision management. A linear step of `0.00001` to find a root near `50.0` takes roughly seven hundred thousand loops. The binary search achieves the exact same precision in under 30 loops, but requires you to reason carefully about floating-point comparison and exact termination bounds.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <iomanip>\n\nint main() {\n    double target_area = 50.0;\n    \n    double low = 0.0;\n    double high = target_area;\n    double mid = 0.0;\n    \n    while (high - low > 0.00001) {\n        mid = low + (high - low) / 2.0;\n        double current_area = mid * mid;\n        \n        if (current_area < target_area) {\n            low = mid;\n        } else {\n            high = mid;\n        }\n    }\n    \n    std::cout << std::fixed << std::setprecision(4);\n    std::cout << "Square root of " << target_area << " is approx: " << mid << "\\n";\n    \n    return 0;\n}',
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
      'Next lesson: Two Pointers and Sliding Window.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Loop invariant"?',
      options: [
        'A condition that remains mathematically true before and after every single iteration of a loop. It exists To formally prove that a loop will eventually terminate and produce a correct result, rather than relying on trial and error to avoid an infinite loop.',
        'A requirement that must be true before an algorithm runs. It exists To guarantee the algorithm\'s logic is mathematically sound; if the precondition is violated, the algorithm\'s output is completely undefined.',
        'A mathematical function that strictly never increases, or strictly never decreases, as its input grows. It exists To define the exact property that makes a non-array search space valid for binary search; if a function is monotonic, you can reliably predict which half of the space contains the correct answer.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Precondition"?',
      options: [
        'A mathematical function that strictly never increases, or strictly never decreases, as its input grows. It exists To define the exact property that makes a non-array search space valid for binary search; if a function is monotonic, you can reliably predict which half of the space contains the correct answer.',
        'A requirement that must be true before an algorithm runs. It exists To guarantee the algorithm\'s logic is mathematically sound; if the precondition is violated, the algorithm\'s output is completely undefined.',
        'A condition that remains mathematically true before and after every single iteration of a loop. It exists To formally prove that a loop will eventually terminate and produce a correct result, rather than relying on trial and error to avoid an infinite loop.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Monotonic function"?',
      options: [
        'A requirement that must be true before an algorithm runs. It exists To guarantee the algorithm\'s logic is mathematically sound; if the precondition is violated, the algorithm\'s output is completely undefined.',
        'A condition that remains mathematically true before and after every single iteration of a loop. It exists To formally prove that a loop will eventually terminate and produce a correct result, rather than relying on trial and error to avoid an infinite loop.',
        'A mathematical function that strictly never increases, or strictly never decreases, as its input grows. It exists To define the exact property that makes a non-array search space valid for binary search; if a function is monotonic, you can reliably predict which half of the space contains the correct answer.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Precondition** — A requirement that must be true before an algorithm runs. It exists To guarantee the algorithm\'s logic is mathematically sound; if the precondition is violated, the algorithm\'s output is completely undefined.',
    '**Loop invariant** — A condition that remains mathematically true before and after every single iteration of a loop. It exists To formally prove that a loop will eventually terminate and produce a correct result, rather than relying on trial and error to avoid an infinite loop.',
    '**Monotonic function** — A mathematical function that strictly never increases, or strictly never decreases, as its input grows. It exists To define the exact property that makes a non-array search space valid for binary search; if a function is monotonic, you can reliably predict which half of the space contains the correct answer.',
  ],

  checkpoints: ['read-intuition'],
}
