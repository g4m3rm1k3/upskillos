// cpp-dsa — Lesson 1: Big-O Notation and Complexity Analysis
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 01 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-01-big-o-notation-and-complexity-analysis',
  slug: 'big-o-notation-and-complexity-analysis',
  chapter: 1,
  order: 1,
  title: 'Big-O Notation and Complexity Analysis',
  subtitle: 'Complexity and Recursion',
  tags: ['time-complexity', 'space-complexity', 'asymptotic-analysis', 'best-worst-and-average-case'],

  hook: {
    question: 'What is "Big-O Notation and Complexity Analysis", and why does it matter?',
    realWorldContext: 'You will write isolated console programs that execute algorithms with different scaling properties. These programs demonstrate how execution time and memory usage grow as the size of the input grows. The transferable problem this solves is predicting whether an algorithm will survive real-world data volumes before you actually run it.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 7 core ideas: Constant Time — O(1), Linear Time — O(n) and Dropping Constants, Quadratic Time — O(n²), Logarithmic Time — O(log n), Linearithmic Time — O(n log n), Best, Worst, and Average Case, Space Complexity.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Time Complexity:** A measure of how the runtime of an algorithm increases as the input size increases. It exists To evaluate algorithm speed mathematically, independent of CPU clock speed or hardware details.\n- **Space Complexity:** A measure of how much extra memory an algorithm requires as the input size increases. It exists To evaluate whether an algorithm will exhaust available RAM on massive datasets, separate from its execution speed.\n- **Asymptotic Analysis:** The method of describing limiting behavior, focusing on the dominant term as the input size approaches infinity. It exists To formalize the rule that constant factors and smaller terms do not matter at massive scale.\n- **Best, Worst, and Average Case:** Categorizations of an algorithm\'s performance based on the specific arrangement of the input data, not just its size. It exists To provide a complete picture of an algorithm\'s reliability, since some algorithms are fast usually but catastrophic occasionally.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::sort:** A standard library algorithm for sorting a range of elements.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Imagine a multi-stage pipeline processing user data. You read a file of user IDs into a vector (O(n) space). You must filter out duplicates. If you use a nested loop comparing every ID to every other ID, the time taken is O(n²), and your server freezes when a million users register. You replace the nested loop by first sorting the vector with `std::sort` (O(n log n) time), then running a single pass over it to remove adjacent duplicates (O(n) time). By analyzing the complexity class, you proved the pipeline would survive before ever running the code.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you fail to drop constants or focus on the worst case, you will choose the wrong data structure. Consider an algorithm that does $100n$ operations and an algorithm that does $n^2$ operations. Without asymptotic analysis, a developer testing with $n=10$ will see the $n^2$ algorithm take 100 operations, and the $100n$ algorithm take 1,000 operations. They will deploy the $n^2$ algorithm because it was "faster." When the data hits $n=10,000$, the $100n$ algorithm takes a manageable 1 million operations, but the $n^2$ algorithm attempts 100 million operations and times out.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Complexity Identification:** Write a function that takes a vector, iterates through it once, and then iterates through it a second time backwards. What is the time complexity? What is the space complexity?\n- **Space Optimization:** Write a function that reverses a `std::vector<int>`. Do it once by creating a new vector and pushing elements in reverse (O(n) space). Do it a second time by swapping elements in the original vector using a `while` loop with two pointers. What is the new space complexity?\n- **Logarithmic Logic:** In the binary search simulation code, change the initial $n$ to 8. Track by hand how many times the loop runs. Now change it to 32. How many additional operations did multiplying the input by 4 cost?',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You can explain why O(2n) is simplified to O(n).\n- [ ] You can identify a nested loop as O(n²) time complexity.\n- [ ] You have run code demonstrating O(log n) scaling and observed its extreme efficiency.\n- [ ] You understand that Space Complexity measures *extra* memory, not the memory of the input itself.\n- [ ] You can articulate why engineers primarily focus on Worst Case scenarios.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 1: Big-O Notation and Complexity Analysis',
        caption: 'Big-O Notation and Complexity Analysis',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Constant Time — O(1)',
              prose: [
                'If you measure an algorithm\'s speed in seconds, the same code will run faster on a new computer than an old one. To communicate efficiency universally, we need a metric that counts the exact number of operations an algorithm performs. The simplest case is an operation whose cost never changes, no matter how much data exists.',
                '## How the Code Works',
                '- `void printFirstElement(const std::vector<int>& data)`: Takes a read-only reference to a vector.\n- `if (data.empty()) return;`: A single check to prevent crashing.\n- `data[0]`: The subscript operator accesses the first memory location of the vector directly. It does not scan the rest of the elements.\n- `std::cout`: Prints the value.',
                '**CS lens.** This is **O(1)**, or Constant Time. "O" stands for "Order of". O(1) means the number of operations is bounded by a constant. It does not literally mean "one operation"—it might be five instructions or fifty—but the critical fact is that the number of operations *does not scale* with the input size ($n$).',
                '**SE lens.** The alternative not chosen is assuming that all operations are instantaneous. The tradeoff of recognizing O(1) is learning to identify what operations are truly "free" at scale. Array indexing is O(1); finding an item in a linked list is not. You design massive systems around O(1) lookups whenever possible.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nvoid printFirstElement(const std::vector<int>& data) {\n    if (data.empty()) return;\n    \n    // This takes the same amount of time whether the vector has 10 items or 10 million.\n    std::cout << "First element: " << data[0] << "\\n";\n}\n\nint main() {\n    std::vector<int> smallData = {5, 10, 15};\n    std::vector<int> massiveData(1000000, 42); // 1 million items\n    \n    printFirstElement(smallData);\n    printFirstElement(massiveData);\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Linear Time — O(n) and Dropping Constants',
              prose: [
                'When you must inspect every piece of data, the time taken grows proportionally to the input size. Furthermore, if you loop through the data twice, does that make it an entirely new category of complexity? We need a rule for handling linear growth and constant multipliers.',
                '## How the Code Works',
                '- `for (int value : data)` (first loop): Visits every element once to print it. If $n$ is 5, this loop runs 5 times.\n- `int sum = 0;`: Initializes a counter.\n- `for (int value : data)` (second loop): Visits every element again to add it to `sum`. This loop also runs 5 times.\n- Total iterations: For $n$ items, the function performs $n + n = 2n$ iterations.',
                '**CS lens.** This is **O(n)**, or Linear Time. But wait, there are two loops, so shouldn\'t it be O(2n)? Asymptotic analysis dictates that **constant factors are dropped**. As $n$ approaches infinity, the difference between $n$ and $2n$ is insignificant compared to the difference between $n$ and $n^2$. O(2n), O(500n), and O(n/2) are all simplified to O(n). They represent the same linear growth curve.',
                '**SE lens.** The alternative not chosen is tracking exact operational counts (like precisely $2n + 3$ instructions). The tradeoff is that dropping constants loses precision for small inputs, but gains universal comparability. In engineering, an O(n) algorithm with a large constant factor might be slower than an O(n^2) algorithm for $n=10$, but the O(n) will inevitably win as data scales to millions.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nvoid printAllAndSum(const std::vector<int>& data) {\n    // Loop 1\n    for (int value : data) {\n        std::cout << value << " ";\n    }\n    std::cout << "\\n";\n    \n    // Loop 2\n    int sum = 0;\n    for (int value : data) {\n        sum += value;\n    }\n    std::cout << "Sum: " << sum << "\\n";\n}\n\nint main() {\n    std::vector<int> data = {1, 2, 3, 4, 5};\n    printAllAndSum(data);\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Quadratic Time — O(n²)',
              prose: [
                'When logic requires comparing every element against every other element, the number of operations explodes. We need to measure what happens when linear operations are nested inside other linear operations.',
                '## How the Code Works',
                '- `for (size_t i = 0; i < data.size(); ++i)`: The outer loop. Runs exactly $n$ times.\n- `for (size_t j = 0; j < data.size(); ++j)`: The inner loop. For *every single tick* of the outer loop, this inner loop runs exactly $n$ times from start to finish.\n- `operations++`: A counter to prove the exact number of inner executions. If $n=4$, the inner block executes $4 \\times 4 = 16$ times.',
                '**CS lens.** This is **O(n²)**, or Quadratic Time. If you double the input size, the execution time quadruples. Nested loops iterating over the same dataset are the classic hallmark of O(n²). At massive scale, O(n²) is generally considered a failure mode for an algorithm; an O(n²) solution that works for a thousand items will freeze a server when given a million.',
                '**SE lens.** The alternative not chosen is writing code this way because it is usually the easiest logic to write (e.g., a brute-force duplicate check). The tradeoff is catastrophic failure under load. Engineers spend significant effort redesigning O(n²) algorithms into O(n log n) or O(n) using hash maps or sorting.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nvoid printAllPairs(const std::vector<int>& data) {\n    int operations = 0;\n    for (size_t i = 0; i < data.size(); ++i) {\n        for (size_t j = 0; j < data.size(); ++j) {\n            std::cout << "(" << data[i] << ", " << data[j] << ") ";\n            operations++;\n        }\n        std::cout << "\\n";\n    }\n    std::cout << "Total operations: " << operations << "\\n";\n}\n\nint main() {\n    std::vector<int> data = {1, 2, 3, 4};\n    printAllPairs(data);\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Logarithmic Time — O(log n)',
              prose: [
                'O(n) is considered fast, but if you are searching a database of billions of records, visiting every item once is still too slow. If the data is already sorted, we need a way to discard vast amounts of the search space instantly.',
                '## How the Code Works',
                '- `int remainingElements = n;`: Simulates starting with a sorted dataset of size $n$.\n- `while (remainingElements > 1)`: The loop continues until only one element is left (the target).\n- `remainingElements /= 2;`: The core mechanic. In a real binary search, you check the middle element. If your target is smaller, you discard the entire upper half. The search space is cut exactly in half every iteration.\n- `operations++`: Counts how many times we halve the data.',
                '**CS lens.** This is **O(log n)**, or Logarithmic Time (specifically, base 2). It is the inverse of exponentiation. If exponentiation doubles the value at every step, logarithm halves it. For 1 billion items, an O(n) search takes 1,000,000,000 operations. An O(log n) search takes exactly 30 operations. It is overwhelmingly powerful.',
                '**SE lens.** The alternative not chosen is ignoring sorted data and always using linear search. The tradeoff is setup cost: you can only achieve O(log n) searches if the data is rigidly kept in sorted order, which costs time to maintain when inserting new data.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nvoid simulateBinarySearch(int n) {\n    int operations = 0;\n    int remainingElements = n;\n    \n    while (remainingElements > 1) {\n        remainingElements /= 2; // Discard half the data\n        operations++;\n    }\n    \n    std::cout << "Input size: " << n << " -> Operations: " << operations << "\\n";\n}\n\nint main() {\n    simulateBinarySearch(16);\n    simulateBinarySearch(1024);\n    simulateBinarySearch(1048576); // ~1 million\n    simulateBinarySearch(1073741824); // ~1 billion\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'Linearithmic Time — O(n log n)',
              prose: [
                'We know O(n) visits everything once, and O(log n) halves the dataset. What happens when an algorithm must perform an O(log n) operation *for every single item* in an $n$-sized dataset? This is the theoretical limit for comparison-based sorting.',
                '## How the Code Works',
                '- `#include <algorithm>`: Brings in the standard library\'s optimized algorithms.\n- `std::sort(data.begin(), data.end())`: Sorts the entire vector from beginning to end.\n- `data.begin()`, `data.end()`: Iterators marking the range.',
                '**CS lens.** This is **O(n log n)**, or Linearithmic Time. Efficient sorting algorithms like Merge Sort, Heap Sort, and C++\'s `std::sort` (usually IntroSort) fall into this category. It means the algorithm splits the data logarithmically, but must touch every element linearly to merge or partition them. It is much slower than O(n), but dramatically faster than O(n²).',
                '**SE lens.** The alternative not chosen is writing a naive sorting loop (like Bubble Sort) which is O(n²). The tradeoff is that O(n log n) algorithms are significantly more complex to write from scratch, which is why engineering relies entirely on standard library implementations like `std::sort` rather than reinventing them.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> data = {5, 2, 9, 1, 5, 6};\n    \n    // std::sort operates in O(n log n) time\n    std::sort(data.begin(), data.end());\n    \n    for (int value : data) {\n        std::cout << value << " ";\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 6,
              cellTitle: 'Best, Worst, and Average Case',
              prose: [
                'If you use linear search to find the number 5, and 5 is the very first item in the array, it takes 1 operation. If it\'s the last item, it takes $n$ operations. Saying the algorithm is "O(n)" tells a partial truth. We need distinct terminology to describe how data arrangement affects performance.',
                '## How the Code Works',
                '- `if (value == target)`: Checks the current element against the target.\n- `return true;`: Exits the function immediately. The loop terminates. The rest of the vector is skipped.\n- `findTarget(data, 10)`: The first call searches for `10`, which is at index 0.',
                '**CS lens.** - **Best Case:** The target is first. It takes 1 operation. The Best Case complexity is O(1). - **Worst Case:** The target is last, or doesn\'t exist at all. It must scan the entire array. The Worst Case is O(n). - **Average Case:** Assuming random distribution, you will find the item halfway through, taking $n/2$ operations. Dropping the constant, the Average Case is O(n). When engineers simply say "this algorithm is O(n)", they are almost always referring to the **Worst Case**.',
                '**SE lens.** The alternative not chosen is judging algorithms by their Best Case. The tradeoff is that engineering relies on guarantees. If a web server\'s search function is fast on average but takes 10 seconds in the worst case, a malicious user can send a payload that forces the worst-case path and crashes the server. We engineer for the worst case.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nbool findTarget(const std::vector<int>& data, int target) {\n    int operations = 0;\n    for (int value : data) {\n        operations++;\n        if (value == target) {\n            std::cout << "Found in " << operations << " operations.\\n";\n            return true;\n        }\n    }\n    std::cout << "Not found. Took " << operations << " operations.\\n";\n    return false;\n}\n\nint main() {\n    std::vector<int> data = {10, 20, 30, 40, 50};\n    \n    findTarget(data, 10); // Target is first\n    findTarget(data, 50); // Target is last\n    findTarget(data, 99); // Target is missing\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 7,
              cellTitle: 'Space Complexity',
              prose: [
                'Time is not the only constrained resource; memory is finite. An algorithm might be incredibly fast (O(1) time) but require duplicating the entire dataset in RAM. We must measure the *extra* memory an algorithm consumes as $n$ scales.',
                '## How the Code Works',
                '- `std::vector<int> copy;`: A new, empty vector is created in memory.\n- `copy.push_back(value);`: For every element in `original`, a new element is allocated inside `copy`.\n- `return copy;`: The function yields the new memory structure.',
                '**CS lens.** This algorithm has an **O(n) Space Complexity**. The space required by the input (`original`) does not count. Space complexity strictly measures the *auxiliary* (extra) space required by the algorithm itself. Because we create a new vector matching the size of the input, the extra memory scales linearly with $n$. If we modified `original` directly without making a copy, the space complexity would be **O(1)**.',
                '**SE lens.** The alternative not chosen is mutating the original data in place. The tradeoff is safety versus memory. Creating a copy (O(n) space) preserves the original data for other functions to use safely. Mutating in place (O(1) space) destroys the original state but allows algorithms to run on massive datasets that are too large to fit in RAM twice.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nstd::vector<int> duplicateArray(const std::vector<int>& original) {\n    // We allocate a brand new vector of the same size\n    std::vector<int> copy;\n    for (int value : original) {\n        copy.push_back(value);\n    }\n    return copy;\n}\n\nint main() {\n    std::vector<int> data = {1, 2, 3};\n    std::vector<int> result = duplicateArray(data);\n    \n    std::cout << "Original size: " << data.size() << "\\n";\n    std::cout << "Copy size: " << result.size() << "\\n";\n    \n    return 0;\n}',
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
      'Next lesson: Arrays and Contiguous Memory.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Asymptotic Analysis"?',
      options: [
        'A measure of how the runtime of an algorithm increases as the input size increases. It exists To evaluate algorithm speed mathematically, independent of CPU clock speed or hardware details.',
        'The method of describing limiting behavior, focusing on the dominant term as the input size approaches infinity. It exists To formalize the rule that constant factors and smaller terms do not matter at massive scale.',
        'Categorizations of an algorithm\'s performance based on the specific arrangement of the input data, not just its size. It exists To provide a complete picture of an algorithm\'s reliability, since some algorithms are fast usually but catastrophic occasionally.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Best, Worst, and Average Case"?',
      options: [
        'Categorizations of an algorithm\'s performance based on the specific arrangement of the input data, not just its size. It exists To provide a complete picture of an algorithm\'s reliability, since some algorithms are fast usually but catastrophic occasionally.',
        'A measure of how the runtime of an algorithm increases as the input size increases. It exists To evaluate algorithm speed mathematically, independent of CPU clock speed or hardware details.',
        'The method of describing limiting behavior, focusing on the dominant term as the input size approaches infinity. It exists To formalize the rule that constant factors and smaller terms do not matter at massive scale.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Space Complexity"?',
      options: [
        'A measure of how much extra memory an algorithm requires as the input size increases. It exists To evaluate whether an algorithm will exhaust available RAM on massive datasets, separate from its execution speed.',
        'A measure of how the runtime of an algorithm increases as the input size increases. It exists To evaluate algorithm speed mathematically, independent of CPU clock speed or hardware details.',
        'Categorizations of an algorithm\'s performance based on the specific arrangement of the input data, not just its size. It exists To provide a complete picture of an algorithm\'s reliability, since some algorithms are fast usually but catastrophic occasionally.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Time Complexity"?',
      options: [
        'The method of describing limiting behavior, focusing on the dominant term as the input size approaches infinity. It exists To formalize the rule that constant factors and smaller terms do not matter at massive scale.',
        'A measure of how much extra memory an algorithm requires as the input size increases. It exists To evaluate whether an algorithm will exhaust available RAM on massive datasets, separate from its execution speed.',
        'A measure of how the runtime of an algorithm increases as the input size increases. It exists To evaluate algorithm speed mathematically, independent of CPU clock speed or hardware details.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Time Complexity** — A measure of how the runtime of an algorithm increases as the input size increases. It exists To evaluate algorithm speed mathematically, independent of CPU clock speed or hardware details.',
    '**Space Complexity** — A measure of how much extra memory an algorithm requires as the input size increases. It exists To evaluate whether an algorithm will exhaust available RAM on massive datasets, separate from its execution speed.',
    '**Asymptotic Analysis** — The method of describing limiting behavior, focusing on the dominant term as the input size approaches infinity. It exists To formalize the rule that constant factors and smaller terms do not matter at massive scale.',
    '**Best, Worst, and Average Case** — Categorizations of an algorithm\'s performance based on the specific arrangement of the input data, not just its size. It exists To provide a complete picture of an algorithm\'s reliability, since some algorithms are fast usually but catastrophic occasionally.',
  ],

  checkpoints: ['read-intuition'],
}
