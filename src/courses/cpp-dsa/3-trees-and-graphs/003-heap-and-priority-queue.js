// cpp-dsa — Lesson 11: Heap and Priority Queue
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 11 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-11-heap-and-priority-queue',
  slug: 'heap-and-priority-queue',
  chapter: 3,
  order: 3,
  title: 'Heap and Priority Queue',
  subtitle: 'Trees, Heaps, and Graphs',
  tags: ['priority-queue', 'heap', 'max-heap-min-heap-property', 'heapify-up', 'heapify-down', 'heapsort'],

  hook: {
    question: 'What is "Heap and Priority Queue", and why does it matter?',
    realWorldContext: 'You will build a sequence of isolated, throwaway programs that implement a binary heap from scratch over an array, demonstrating how to maintain the heap property during insertions and extractions, how to build a heap in linear time, and how to sort an array using a heap. Finally, you will use the C++ Standard Library\'s `std::priority_queue` to achieve the same result. The transferable problem this solves is finding and removing the "most important" or "smallest/largest" element in a changing dataset in guaranteed $O(\\log n)$ time, without keeping the entire dataset perfectly sorted.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 6 core ideas: The Array-Based Representation, The Heap Property and Heapify-Up, Heapify-Down (Extraction), Building a Heap in $O(n)$, Heapsort, std::priority_queue.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Priority Queue:** An abstract data type where elements are extracted in order of their priority (e.g., largest or smallest first), rather than the order they were inserted. It exists To schedule tasks, route network packets, or run greedy algorithms where the "next best" item must be retrieved repeatedly as the data changes.\n- **Heap:** A complete binary tree that satisfies the heap property. It exists To implement a priority queue efficiently using an array without the memory overhead of node pointers.\n- **Max-heap / Min-heap property:** A rule stating that every parent node must be greater than or equal to (max-heap) or less than or equal to (min-heap) its children. It exists To guarantee that the root of the tree always contains the absolute maximum (or minimum) value, making retrieval $O(1)$.\n- **Heapify-up:** The process of moving a newly inserted element up the tree until the heap property is restored. It exists To fix the heap after an insertion at the bottom.\n- **Heapify-down:** The process of moving a node down the tree, swapping it with its largest (or smallest) child until the heap property is restored. It exists To fix the heap after the root is removed and replaced by the last element.\n- **Heapsort:** A sorting algorithm that builds a heap from an array, then repeatedly extracts the root to produce a sorted sequence. It exists To provide an in-place sort with a guaranteed $O(n \\log n)$ worst-case time complexity, unlike QuickSort.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::vector&lt;T&gt;:** A dynamic array that manages its own memory.\n- **std::swap:** A utility function that exchanges the values of two variables.\n- **std::priority_queue&lt;T&gt;:** A standard library container adapter that provides priority queue functionality, implemented as a max-heap by default.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Trace the lifecycle of a priority queue: You receive incoming network packets with integer priority flags. You push them into `std::priority_queue` (a `std::vector` in disguise). The container places the packet at the very end of its array, does the integer division math to find its parent, and swaps it upwards in $O(\\log n)$ time until the max-heap property is satisfied. When your network processor is ready for work, it calls `.top()` to instantly grab the absolute highest-priority packet in $O(1)$ time, then `.pop()` to remove it, causing the heap to quietly swap its last leaf to the root and sink it down using $O(\\log n)$ multiplications to find the next largest item. The system runs flawlessly, processing the most urgent work first.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you omit the `#include <queue>` and try to rely on a raw array to maintain a "always get the biggest item" queue, you\'d likely use `std::sort` after every insertion. \n\n```cpp\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> data = {40, 90, 20};\n    data.push_back(50);\n    std::sort(data.begin(), data.end()); // O(n log n) cost per push!\n    return 0;\n}\n```\n\nIf you process 1,000,000 items, `std::sort` on every push brings the application to a crawl. The heap provides exactly the sorting you *need*—no more, no less—shrinking the penalty for insertion from $O(n \\log n)$ to $O(\\log n)$.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Min-Heap Configuration:** A `std::priority_queue` can be configured as a min-heap by providing three template arguments: `std::priority_queue<int, std::vector<int>, std::greater<int>> pq;`. Write a throwaway program that uses this min-heap configuration to find the 3 *smallest* elements in an array of 20 random numbers.\n- **K-th Largest Element:** Given an array, write a program that uses a `std::priority_queue` to efficiently locate the $k$-th largest element without sorting the entire array. Hint: push elements into the queue, then `pop()` exactly $k-1$ times.\n- **Array Validation:** Write a function `bool is_max_heap(const std::vector<int>& arr)` that iterates through an array and mathematically checks if the max-heap property holds for every parent-child relationship. Run it against a randomly scrambled array to prove it correctly returns `false`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have manually traced the mathematical relationship between parent and child array indices in a complete binary tree.\n- [ ] You have implemented and discarded a custom `heapify_up` and `heapify_down` function.\n- [ ] You have observed a linear-time `build_heap` converting raw data into a valid heap.\n- [ ] You have executed an in-place `heap_sort`.\n- [ ] You have used `std::priority_queue` to manage priorities automatically, without manual pointer manipulation.\n- [ ] You can explain out loud why a heap is more efficient than a sorted array for priority-based workloads.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 11: Heap and Priority Queue',
        caption: 'Heap and Priority Queue',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Array-Based Representation',
              prose: [
                'A binary tree uses dynamic node allocation and pointers (`left` and `right`) to map its structure. This requires extra memory for the pointers and causes memory fragmentation. Because a heap is a **complete** binary tree (every level is fully filled except possibly the last, which is filled left-to-right), you can map the entire tree directly into a flat array. You need a way to find a node\'s parent and children using pure math instead of pointers.',
                '## How the Code Works',
                '- `std::vector<int> heap = {100, 80, 90, 70, 60, 85};`: Creates a contiguous array representing a complete binary tree. `100` is the root (index 0). Its children are `80` and `90` (indices 1 and 2).\n- `int index = 1;`: We deliberately target the element `80` to inspect its relationships.\n- `int parent_index = (index - 1) / 2;`: Calculates the parent\'s index. In a 0-indexed array, the parent of index $i$ is exactly at $(i - 1) / 2$ (integer division). `(1 - 1) / 2` yields `0`.\n- `int left_child_index = 2 * index + 1;`: Calculates the left child. `2 * 1 + 1` yields `3`.\n- `int right_child_index = 2 * index + 2;`: Calculates the right child. `2 * 1 + 2` yields `4`.\n- `std::cout << ...`: Prints the relationships, proving the mathematical mapping holds without any pointers.',
                '**CS lens.** This implicit data structure takes advantage of spatial locality. Because the elements are stored in contiguous memory, traversing the tree is extremely cache-friendly for the CPU, unlike jumping around random heap memory locations with pointers.',
                '**SE lens.** The alternative not chosen is to build a `struct Node { int val; Node* left; Node* right; }` and use `new`. The tradeoff here is pointer management: pointer-based trees are easier to modify if the tree shape changes arbitrarily, but a heap\'s shape is strictly a complete tree, making the math-based array representation vastly superior in both speed and memory overhead.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> heap = {100, 80, 90, 70, 60, 85};\n    \n    int index = 1; // Looking at the value 80\n    \n    int parent_index = (index - 1) / 2;\n    int left_child_index = 2 * index + 1;\n    int right_child_index = 2 * index + 2;\n    \n    std::cout << "Node at index " << index << " is: " << heap[index] << "\\n";\n    std::cout << "Its parent is at index " << parent_index << ": " << heap[parent_index] << "\\n";\n    std::cout << "Its left child is at index " << left_child_index << ": " << heap[left_child_index] << "\\n";\n    std::cout << "Its right child is at index " << right_child_index << ": " << heap[right_child_index] << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Heap Property and Heapify-Up',
              prose: [
                'When you insert a new element into a heap, you must maintain the complete tree structure, so you place the new element at the very end of the array. However, this new element might violate the max-heap property (if it is larger than its parent). You need an algorithm to move the newly inserted element up the tree until the property is restored.',
                '## How the Code Works',
                '- `void heapify_up(std::vector<int>& heap, int index)`: A function that takes the array by reference and the index of the newly inserted element.\n- `while (index > 0)`: Loops as long as the current node is not the root. The root has no parent, so the process must stop there.\n- `int parent_index = (index - 1) / 2;`: Identifies the parent of the current node.\n- `if (heap[index] > heap[parent_index])`: Checks the max-heap property. If the child is greater than its parent, the property is violated.\n- `std::swap(heap[index], heap[parent_index]);`: Physically exchanges the values in the array, moving the larger value up one level in the tree.\n- `index = parent_index;`: Updates the working index to the new position, preparing to check the next level up.\n- `else { break; }`: If the child is not greater than the parent, the heap property is satisfied. Because the rest of the tree was already a valid heap, we can stop immediately.\n- `heap.push_back(95);`: Appends `95` to the end of the array, simulating insertion at the next available leaf node.\nExecution trace of the loop for `heapify_up(heap, 6)`:\n- Iteration 1: `index` 6 → 2. `heap[6]` is 95, `heap[2]` is 90. 95 > 90, so they swap.\n- Iteration 2: `index` 2 → 2 (loop breaks). `heap[2]` is 95, `heap[0]` is 100. 95 is not > 100. The loop breaks.',
                '**CS lens.** This is an $O(\\log n)$ operation. The tree depth is logarithmic relative to the number of elements. At worst, an element inserted at the bottom only needs to travel up the height of the tree to become the new root.',
                '**SE lens.** The alternative not chosen is sorting the entire array after every insertion. Sorting would take $O(n \\log n)$ time for a single insert, which is devastatingly slow. A heap does not guarantee the whole array is perfectly sorted—only that parents are larger than children—saving vast amounts of computational work while still guaranteeing the root is the maximum.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nvoid heapify_up(std::vector<int>& heap, int index) {\n    while (index > 0) {\n        int parent_index = (index - 1) / 2;\n        if (heap[index] > heap[parent_index]) {\n            std::swap(heap[index], heap[parent_index]);\n            index = parent_index;\n        } else {\n            break;\n        }\n    }\n}\n\nint main() {\n    std::vector<int> heap = {100, 80, 90, 70, 60, 85};\n    \n    // Insert a new value at the end (bottom of the tree)\n    heap.push_back(95);\n    int new_index = heap.size() - 1;\n    \n    heapify_up(heap, new_index);\n    \n    for (int val : heap) {\n        std::cout << val << " ";\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Heapify-Down (Extraction)',
              prose: [
                'To serve the priority queue, you extract the root (the maximum value). This leaves a hole at the root. You cannot simply shift all elements left to fill it, because that destroys the tree\'s complete structure. The standard procedure is to move the very last element of the heap into the root position, shrinking the array by one. However, this new root is usually very small and violates the heap property. You need to sink it down the tree until the heap is valid again.',
                '## How the Code Works',
                '- `void heapify_down(std::vector<int>& heap, int index, int size)`: Accepts the heap, the index to sink down (initially 0), and the active size of the heap.\n- `int largest = index;`: Assumes the current node is the largest among itself and its children.\n- `int left = ...; int right = ...;`: Calculates child positions.\n- `if (left < size && heap[left] > heap[largest])`: Ensures the left child actually exists (`left < size`), then checks if it is strictly greater than the current `largest`. If so, updates `largest` to point to `left`.\n- `if (right < size && heap[right] > heap[largest])`: Performs the exact same check for the right child. After both `if` blocks, `largest` perfectly holds the index of the maximum value among the parent and its two children.\n- `if (largest != index)`: If the parent wasn\'t the largest, a swap is required.\n- `std::swap(...)`: Swaps the parent with its largest child, fixing this local triangle.\n- `index = largest;`: Advances the working index downward to continue sinking the element.\n- `int extract_max(...)`: The public interface. It copies the root (`100`), overwrites the root with `heap.back()` (the last element, `90`), deletes the last element to shrink the array, and kicks off `heapify_down` from index 0.',
                '**CS lens.** Heapify-down ensures that the maximum element bubbles up to fill the void. By always swapping with the *largest* of the two children, it guarantees that the new parent will be greater than both of its children, satisfying the heap property locally before continuing down. This is an $O(\\log n)$ operation.',
                '**SE lens.** The alternative not chosen is shifting the array elements left by one index to "fill" the hole at index 0. Shifting an array takes $O(n)$ time and utterly scrambles the mathematical parent-child relationships, destroying the tree. Swapping the last element to the root and sinking it keeps the operation at $O(\\log n)$ and preserves the complete tree structure perfectly.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nvoid heapify_down(std::vector<int>& heap, int index, int size) {\n    while (true) {\n        int largest = index;\n        int left = 2 * index + 1;\n        int right = 2 * index + 2;\n        \n        if (left < size && heap[left] > heap[largest]) {\n            largest = left;\n        }\n        if (right < size && heap[right] > heap[largest]) {\n            largest = right;\n        }\n        \n        if (largest != index) {\n            std::swap(heap[index], heap[largest]);\n            index = largest;\n        } else {\n            break;\n        }\n    }\n}\n\nint extract_max(std::vector<int>& heap) {\n    int max_val = heap[0];\n    heap[0] = heap.back();\n    heap.pop_back();\n    \n    if (!heap.empty()) {\n        heapify_down(heap, 0, heap.size());\n    }\n    return max_val;\n}\n\nint main() {\n    std::vector<int> heap = {100, 80, 95, 70, 60, 85, 90};\n    \n    int max_val = extract_max(heap);\n    \n    std::cout << "Extracted: " << max_val << "\\nRemaining heap: ";\n    for (int val : heap) {\n        std::cout << val << " ";\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Building a Heap in $O(n)$',
              prose: [
                'If you have an unsorted array of data and you want to turn it into a valid heap, you could start with an empty heap and call `heapify_up` $n$ times. However, doing $n$ insertions of $O(\\log n)$ takes $O(n \\log n)$ time. Floyd\'s heap-building algorithm can reorganize an array into a valid heap in-place in linear $O(n)$ time by working from the bottom up.',
                '## How the Code Works',
                '- `void build_heap(std::vector<int>& arr)`: Reorganizes a raw, unsorted array into a heap directly in memory.\n- `int i = (size / 2) - 1;`: Finds the index of the last non-leaf node. In a complete binary tree, the second half of the array consists entirely of leaf nodes. A leaf node with no children is automatically a valid heap of size 1. There is no reason to heapify-down on a leaf. `(size / 2) - 1` pinpoints the parent of the absolute last element.\n- `for (...; i >= 0; --i)`: Iterates backward from the last non-leaf node up to the root (index 0).\n- `heapify_down(arr, i, size);`: Sinks the current node down if necessary. Because we are working from the bottom up, by the time we process a node, its left and right subtrees are mathematically guaranteed to already be valid heaps.',
                '**CS lens.** This algorithm operates in $O(n)$ time. It seems counterintuitive because there is a loop running $n/2$ times calling an $O(\\log n)$ function. However, the majority of the nodes are at the bottom of the tree and only need to sink down a maximum of 1 or 2 levels. The rigorous mathematical sum of the heights of all nodes in a complete binary tree converges strictly to $O(n)$.',
                '**SE lens.** The alternative not chosen is inserting elements one by one into an empty array. The tradeoff is entirely performance. Bottom-up heap construction is a classic algorithm optimization: by recognizing that half the elements are trivially valid (the leaves), you skip half the work immediately, and process the rest optimally.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\n// Reusing heapify_down from the previous unit\nvoid heapify_down(std::vector<int>& heap, int index, int size) {\n    while (true) {\n        int largest = index;\n        int left = 2 * index + 1;\n        int right = 2 * index + 2;\n        if (left < size && heap[left] > heap[largest]) largest = left;\n        if (right < size && heap[right] > heap[largest]) largest = right;\n        if (largest != index) {\n            std::swap(heap[index], heap[largest]);\n            index = largest;\n        } else {\n            break;\n        }\n    }\n}\n\nvoid build_heap(std::vector<int>& arr) {\n    int size = arr.size();\n    // Start from the last non-leaf node\n    for (int i = (size / 2) - 1; i >= 0; --i) {\n        heapify_down(arr, i, size);\n    }\n}\n\nint main() {\n    std::vector<int> arr = {40, 10, 50, 90, 20, 80, 30};\n    \n    build_heap(arr);\n    \n    for (int val : arr) {\n        std::cout << val << " ";\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'Heapsort',
              prose: [
                'You now possess a linear-time mechanism to build a max-heap, and a logarithmic-time mechanism to extract the absolute largest element. You can combine these to sort an array entirely in-place. You need to implement Heapsort.',
                '## How the Code Works',
                '- `void heap_sort(std::vector<int>& arr)`: An in-place sorting algorithm.\n- Step 1 builds the max-heap, running in $O(n)$. The largest element is now at index 0.\n- `for (int i = size - 1; i > 0; --i)`: Iterates backward through the array. `i` marks the boundary between the active heap (left) and the sorted final array (right).\n- `std::swap(arr[0], arr[i]);`: The root (`arr[0]`) is the maximum element of the active heap. We swap it into index `i` (the very end of the array). The max element is now permanently in its correct, final sorted position.\n- `heapify_down(arr, 0, i);`: The active heap is now one element smaller (size `i`). The element we swapped into index 0 is probably small and out of place. We heapify-down from 0 to restore the heap property, bounded exactly by size `i`.',
                '**CS lens.** Heapsort guarantees an $O(n \\log n)$ worst-case runtime. Unlike QuickSort, which can degrade to $O(n^2)$ if the pivot choices are poor, Heapsort is structurally incapable of degrading. The tradeoff is that Heapsort exhibits poor cache locality during the `heapify_down` swaps, meaning QuickSort is generally faster in practice for typical data despite the theoretical worst-case risk.',
                '**SE lens.** Heapsort does not require any additional memory allocation. It operates entirely in-place. If you are developing embedded systems with extremely strict memory limits and real-time execution deadlines where worst-case performance is critical, Heapsort is often preferred over QuickSort.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\n// Reusing heapify_down from above\nvoid heapify_down(std::vector<int>& heap, int index, int size) {\n    while (true) {\n        int largest = index;\n        int left = 2 * index + 1;\n        int right = 2 * index + 2;\n        if (left < size && heap[left] > heap[largest]) largest = left;\n        if (right < size && heap[right] > heap[largest]) largest = right;\n        if (largest != index) {\n            std::swap(heap[index], heap[largest]);\n            index = largest;\n        } else {\n            break;\n        }\n    }\n}\n\nvoid heap_sort(std::vector<int>& arr) {\n    int size = arr.size();\n    \n    // Step 1: Build the max heap\n    for (int i = (size / 2) - 1; i >= 0; --i) {\n        heapify_down(arr, i, size);\n    }\n    \n    // Step 2: Repeatedly extract the max and place it at the end\n    for (int i = size - 1; i > 0; --i) {\n        std::swap(arr[0], arr[i]); // Move max to the end\n        heapify_down(arr, 0, i);   // Restore heap property for the remaining subset\n    }\n}\n\nint main() {\n    std::vector<int> data = {40, 10, 50, 90, 20, 80, 30};\n    \n    heap_sort(data);\n    \n    for (int val : data) {\n        std::cout << val << " ";\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 6,
              cellTitle: 'std::priority_queue',
              prose: [
                'You now understand exactly how a heap works, how it is mapped onto an array, and how $O(\\log n)$ insertions and extractions are performed. Writing `heapify_up` and `heapify_down` by hand is tedious and error-prone for real software. The C++ Standard Library provides a container adapter that wraps a `std::vector` and manages the heap algorithms for you automatically.',
                '## How the Code Works',
                '- `#include <queue>`: The `std::priority_queue` adapter is defined in the `<queue>` header, not `<vector>`.\n- `std::priority_queue<int> pq;`: Instantiates a priority queue holding integers. By default, it uses `std::vector` underneath and `std::less<int>` for comparisons, which paradoxically builds a **max-heap** (it puts the "greatest" element at the top).\n- `pq.push(...)`: Adds an element. Under the hood, this calls `std::vector::push_back` and then executes `std::push_heap` (the standard library\'s optimized version of your `heapify_up`).\n- `pq.empty()`: Returns true if the queue has no elements.\n- `pq.top()`: Returns a `const` reference to the maximum element (the root of the heap). It does not remove it.\n- `pq.pop()`: Removes the maximum element. Under the hood, this swaps the root with the last element, shrinks the vector, and executes `std::pop_heap` (your `heapify_down`).',
                '**CS lens.** A "container adapter" means `std::priority_queue` is not a raw data structure itself. It is a restrictive interface wrapper placed over a `std::vector`. You are not allowed to iterate over a `std::priority_queue` or use the `[ ]` brackets, because arbitrarily accessing middle elements breaks the priority queue\'s abstract contract. You can only insert (`push`), view the maximum (`top`), and remove the maximum (`pop`).',
                '**SE lens.** The standard library prevents you from making mistakes. If you try to iterate over the `pq` with a range-based `for` loop, the code will refuse to compile, actively preventing you from writing logic that depends on the internal array layout. The abstraction hides the complex index math you wrote earlier, presenting a simple, reliable interface for fetching the most important item.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <queue>\n#include <vector>\n\nint main() {\n    // By default, priority_queue is a max-heap.\n    std::priority_queue<int> pq;\n    \n    pq.push(40);\n    pq.push(90);\n    pq.push(20);\n    pq.push(50);\n    \n    std::cout << "Processing tasks by priority (max-heap):\\n";\n    while (!pq.empty()) {\n        std::cout << pq.top() << " ";\n        pq.pop();\n    }\n    std::cout << "\\n";\n    \n    return 0;\n}',
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
      'Next lesson: Hash Table.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Max-heap / Min-heap property"?',
      options: [
        'A rule stating that every parent node must be greater than or equal to (max-heap) or less than or equal to (min-heap) its children. It exists To guarantee that the root of the tree always contains the absolute maximum (or minimum) value, making retrieval $O(1)$.',
        'The process of moving a newly inserted element up the tree until the heap property is restored. It exists To fix the heap after an insertion at the bottom.',
        'An abstract data type where elements are extracted in order of their priority (e.g., largest or smallest first), rather than the order they were inserted. It exists To schedule tasks, route network packets, or run greedy algorithms where the "next best" item must be retrieved repeatedly as the data changes.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Priority Queue"?',
      options: [
        'A complete binary tree that satisfies the heap property. It exists To implement a priority queue efficiently using an array without the memory overhead of node pointers.',
        'The process of moving a newly inserted element up the tree until the heap property is restored. It exists To fix the heap after an insertion at the bottom.',
        'An abstract data type where elements are extracted in order of their priority (e.g., largest or smallest first), rather than the order they were inserted. It exists To schedule tasks, route network packets, or run greedy algorithms where the "next best" item must be retrieved repeatedly as the data changes.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Heapify-up"?',
      options: [
        'A sorting algorithm that builds a heap from an array, then repeatedly extracts the root to produce a sorted sequence. It exists To provide an in-place sort with a guaranteed $O(n \\log n)$ worst-case time complexity, unlike QuickSort.',
        'An abstract data type where elements are extracted in order of their priority (e.g., largest or smallest first), rather than the order they were inserted. It exists To schedule tasks, route network packets, or run greedy algorithms where the "next best" item must be retrieved repeatedly as the data changes.',
        'The process of moving a newly inserted element up the tree until the heap property is restored. It exists To fix the heap after an insertion at the bottom.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Heap"?',
      options: [
        'The process of moving a node down the tree, swapping it with its largest (or smallest) child until the heap property is restored. It exists To fix the heap after the root is removed and replaced by the last element.',
        'A complete binary tree that satisfies the heap property. It exists To implement a priority queue efficiently using an array without the memory overhead of node pointers.',
        'A sorting algorithm that builds a heap from an array, then repeatedly extracts the root to produce a sorted sequence. It exists To provide an in-place sort with a guaranteed $O(n \\log n)$ worst-case time complexity, unlike QuickSort.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Priority Queue** — An abstract data type where elements are extracted in order of their priority (e.g., largest or smallest first), rather than the order they were inserted. It exists To schedule tasks, route network packets, or run greedy algorithms where the "next best" item must be retrieved repeatedly as the data changes.',
    '**Heap** — A complete binary tree that satisfies the heap property. It exists To implement a priority queue efficiently using an array without the memory overhead of node pointers.',
    '**Max-heap / Min-heap property** — A rule stating that every parent node must be greater than or equal to (max-heap) or less than or equal to (min-heap) its children. It exists To guarantee that the root of the tree always contains the absolute maximum (or minimum) value, making retrieval $O(1)$.',
    '**Heapify-up** — The process of moving a newly inserted element up the tree until the heap property is restored. It exists To fix the heap after an insertion at the bottom.',
    '**Heapify-down** — The process of moving a node down the tree, swapping it with its largest (or smallest) child until the heap property is restored. It exists To fix the heap after the root is removed and replaced by the last element.',
    '**Heapsort** — A sorting algorithm that builds a heap from an array, then repeatedly extracts the root to produce a sorted sequence. It exists To provide an in-place sort with a guaranteed $O(n \\log n)$ worst-case time complexity, unlike QuickSort.',
  ],

  checkpoints: ['read-intuition'],
}
