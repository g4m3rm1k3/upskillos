// Guttag — Lesson 32: Divide and Conquer
// Auto-converted from src/docs/tutorials/guttag-python/lesson-32.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-32-divide-and-conquer',
  slug: 'divide-and-conquer',
  chapter: 5,
  order: 4,
  title: 'Divide and Conquer',
  subtitle: 'Algorithms and Complexity',
  tags: ['divide-and-conquer', 'base-case', 'o-n-log-n', 'o-log-n', 'pivot', 'partition'],

  hook: {
    question: 'What is "Divide and Conquer", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: The divide-and-conquer pattern, Merge sort, Merge sort complexity analysis, Fast exponentiation, Quicksort.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Divide and Conquer:** A design paradigm that solves a problem by recursively breaking it down into two or more sub-problems of the same type until they become simple enough to be solved directly.\n- **Base case:** The condition in a recursive function that stops the recursion, preventing an infinite loop.\n- **O(n log n):** The time complexity typically seen when a dataset of size n is repeatedly halved (log n steps) and recombined with linear (n) work at each step.\n- **O(log n):** The time complexity when a problem space is halved at each step without linear recombination work.\n- **Pivot:** The element chosen in quicksort to partition the array.\n- **Partition:** The step in quicksort that reorganizes the array around a pivot element.\n- **def:** Keyword used to define a new function.\n- **if / else:** Conditional keywords used to branch logic.\n- **return:** Keyword used to exit a function and pass a value back to the caller.\n- **while / for / in:** Looping keywords to iterate over sequences or run while a condition holds.\n- **global:** Keyword used to declare that a variable inside a function refers to the module-level variable of the same name.\n- **import:** Keyword used to bring external modules into the current namespace.\n- **is / None:** is checks for object identity. None is the singleton object representing the absence of a value.\n- **List slicing [:]:** Syntax to create a new list containing a subset of elements from an existing list.\n- **List creation []:** Syntax to define a new empty or populated list.\n- **f-string:** Syntax f\'...\' for formatting strings with embedded Python expressions.\n- **Operators (//, %, <=, <, ==, +=, =, +, -, ):** Standard arithmetic, comparison, and assignment operators in Python.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **len:** A built-in function to count items.\n- **max:** A built-in function to find the largest item.\n- **list.append:** A list method to add one item.\n- **list.extend:** A list method to add multiple items.\n- **math.log2:** A mathematical function to compute base-2 logarithm.\n- **print:** A built-in function to output text.\n- **list:** A built-in type for mutable sequences.\n- **range:** A built-in type generating a sequence of numbers.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Trace `merge_sort([5, 3, 8, 1, 4])` through all concept units: - We start with the full problem `[5, 3, 8, 1, 4]`. - The divide step splits it into `[5, 3]` and `[8, 1, 4]`. - We recurse: `[5, 3]` splits into `[5]` and `[3]`. - The base case hits, and the merge step combines them into `[3, 5]`. - Meanwhile, the right half recurses, splits, and merges into `[1, 4, 8]`. - Finally, the top-level merge step interleaves `[3, 5]` and `[1, 4, 8]` into `[1, 3, 4, 5, 8]`. - As proved by our complexity counter, this recursive halving and linear combination took just `n log2(n)` work rather than `n^2`.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 32: Divide and Conquer',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Divide and Conquer',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The divide-and-conquer pattern',
              prose: [
                'How can we find the maximum value in a list more efficiently, or at least differently, than simply looking at every element one by one in a loop? If we split the list in half, and knew the maximum of the left half and the maximum of the right half, could we find the overall maximum without looking at all elements again? What if we kept splitting until the halves were trivially small?',
                'Output confidently predicted: `[3, 1] [4, 1]` This proves that we can slice a list into two distinct halves. This is the foundation of **divide and conquer**.'
              ],
              typeIt: true,
              solution: '# Throwaway demonstration of simple division\ndata = [3, 1, 4, 1]\nmid = len(data) // 2\nleft, right = data[:mid], data[mid:]\nprint(left, right)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'The divide-and-conquer pattern — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def max_linear(lst):`: Defines a linear approach taking one list argument.\n- `m = lst[0]`: Initializes maximum to the first element.\n- `for x in lst[1:]:`: Iterates through the rest of the list.\n- `if x > m: m = x`: Updates maximum if a larger value is found.\n- `return m`: Returns the found maximum.\n- `def max_dc(lst):`: Defines the divide-and-conquer function.\n- `if len(lst) == 1:`: Checks if the list has only one element (base case).\n- `return lst[0]`: Returns the only element.\n- `mid = len(lst) // 2`: Calculates the midpoint integer index using floor division.\n- `left_max = max_dc(lst[:mid])`: Recursively calls `max_dc` on the left half.\n- `right_max = max_dc(lst[mid:])`: Recursively calls `max_dc` on the right half.\n- `return max(left_max, right_max)`: Uses the built-in `max` function to return the larger of the two maxes.\n- `data = [...]`: Creates a test list.',
                '**Expected behavior.** Predicted confidently: Nothing will print yet since we only defined the variables and functions.',
                '**CS lens.** Divide and Conquer is a fundamental algorithmic paradigm. It appears in: 1. Merge Sort and Quick Sort for efficient sorting. 2. Binary Search for O(log n) lookups in sorted data. 3. The Fast Fourier Transform (FFT) for signal processing. 4. Strassen\'s matrix multiplication algorithm.',
                '**SE lens.** Design principle: Recursive decomposition. The alternative not chosen is iterative processing with manual stacks. The real tradeoff is call stack depth (which costs memory and risks stack overflow in Python) versus the clean, expressive simplicity of recursive logic.'
              ],
              typeIt: true,
              solution: 'def max_linear(lst):\n    m = lst[0]\n    for x in lst[1:]:\n        if x > m: m = x\n    return m\n\ndef max_dc(lst):\n    if len(lst) == 1:\n        return lst[0]\n    mid = len(lst) // 2\n    left_max  = max_dc(lst[:mid])\n    right_max = max_dc(lst[mid:])\n    return max(left_max, right_max)\n\ndata = [3, 1, 4, 1, 5, 9, 2, 6]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Merge sort',
              prose: [
                'If we split an unsorted list into halves down to single elements, those single elements are technically "sorted" lists of length 1. How can we take two sorted lists and combine them into a single sorted list efficiently without re-sorting from scratch? What is the logic for interleaving them?',
                'Output confidently predicted: `[1, 3, 4, 5]` This proves we can combine two sorted arrays in linear time by walking pointers. This is the **merge** operation.'
              ],
              typeIt: true,
              solution: '# Throwaway demonstration of merging two sorted lists\nleft = [3, 5]\nright = [1, 4]\nres = []\ni = 0; j = 0\nwhile i < len(left) and j < len(right):\n    if left[i] < right[j]:\n        res.append(left[i])\n        i += 1\n    else:\n        res.append(right[j])\n        j += 1\nres.extend(left[i:])\nres.extend(right[j:])\nprint(res)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Merge sort — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def merge_sort(lst):`: Defines the main sorting function.\n- `if len(lst) <= 1:`: Base case; lists of 0 or 1 element are already sorted.\n- `return lst`: Returns the sorted list.\n- `mid = len(lst) // 2`: Finds the middle index.\n- `left = merge_sort(lst[:mid])`: Sorts the left half recursively.\n- `right = merge_sort(lst[mid:])`: Sorts the right half recursively.\n- `return merge(left, right)`: Combines the two sorted halves.\n- `def merge(left, right):`: Defines the helper merging function.\n- `result = []`: Initializes an empty list to hold the merged elements.\n- `i = j = 0`: Initializes two pointer indices to 0.\n- `while i < len(left) and j < len(right):`: Loops as long as neither list is exhausted.\n- `if left[i] <= right[j]:`: Compares the current elements of both lists.\n- `result.append(left[i])`: Adds the smaller element to the result.\n- `i += 1`: Advances the left pointer.\n- `else:`: Handles the case where the right element is smaller.\n- `result.append(right[j])`: Adds the right element.\n- `j += 1`: Advances the right pointer.\n- `result.extend(left[i:])`: Appends any remaining elements from the left list.\n- `result.extend(right[j:])`: Appends any remaining elements from the right list.\n- `return result`: Returns the fully merged and sorted list.\n- `print(...)`: Prints the result of the function call.',
                '**Expected behavior.** Predicted confidently: `[1, 3, 4, 5, 8]`',
                '**CS lens.** Merge Sort is a classic Divide and Conquer algorithm. It appears in: 1. Python\'s Timsort (which is derived from merge sort and insertion sort). 2. External sorting algorithms where data is too large to fit in RAM. 3. Linked list sorting (where it can be implemented with O(1) space).',
                '**SE lens.** Design principle: Delegation. The alternative not chosen is an in-place sort like Bubble Sort. The real tradeoff is that Merge Sort is stable and guarantees O(n log n) time, but typically requires O(n) auxiliary space to hold the newly merged arrays, unlike in-place algorithms.'
              ],
              typeIt: true,
              solution: 'def merge_sort(lst):\n    if len(lst) <= 1:\n        return lst\n    mid = len(lst) // 2\n    left  = merge_sort(lst[:mid])\n    right = merge_sort(lst[mid:])\n    return merge(left, right)\n\ndef merge(left, right):\n    result = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i])\n            i += 1\n        else:\n            result.append(right[j])\n            j += 1\n    result.extend(left[i:])\n    result.extend(right[j:])\n    return result\n\nprint(merge_sort([5, 3, 8, 1, 4]))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Merge sort complexity analysis',
              prose: [
                'How do we actually prove that merge sort runs in O(n log n) time instead of O(n^2)? If we count every time a recursive function is called and measure how many elements are merged at each step, will the total work mirror the theoretical mathematical curve `n * log2(n)`?',
                'Output confidently predicted: `1` This proves we can track a running tally across multiple function calls using the **global** keyword.'
              ],
              typeIt: true,
              solution: '# Throwaway demonstration of global counters\ncount = 0\ndef increment():\n    global count\n    count += 1\nincrement()\nprint(count)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Merge sort complexity analysis — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def merge_sort_counted(lst, depth=0):`: Defines the tracked sort function with a default depth argument.\n- `global call_count, total_work`: Declares intent to modify module-level counter variables.\n- `call_count += 1`: Increments the recursive call counter.\n- `if len(lst) <= 1: return lst`: Standard base case.\n- `mid = len(lst) // 2`: Midpoint calculation.\n- `left = merge_sort_counted(lst[:mid], depth+1)`: Sorts left half, incrementing depth.\n- `right = merge_sort_counted(lst[mid:], depth+1)`: Sorts right half, incrementing depth.\n- `merged = merge(left, right)`: Uses the original merge function.\n- `total_work += len(lst)`: Adds the size of the current list to the total work (since merging takes O(n) time).\n- `return merged`: Returns the sorted list.\n- `for n in [8, 16, 32, 64]:`: Loops through various input sizes.\n- `call_count = 0; total_work = 0`: Resets global counters for each run.\n- `merge_sort_counted(list(range(n, 0, -1)))`: Calls the function with a worst-case reversed list.\n- `import math`: Imports the standard math library.\n- `print(...)`: Uses an f-string to print formatted metrics, comparing empirical work against mathematical expectation.',
                '**Expected behavior.** Predicted confidently: ``` n= 8: calls=15, work=24, n*log2(n)=24 n= 16: calls=31, work=64, n*log2(n)=64 n= 32: calls=63, work=160, n*log2(n)=160 n= 64: calls=127, work=384, n*log2(n)=384 ```',
                '**CS lens.** Algorithmic Complexity is a fundamental CS concept. It appears in: 1. Benchmarking database queries. 2. Predicting load limits for web servers. 3. Choosing appropriate data structures (e.g. hash maps vs trees).',
                '**SE lens.** Design principle: Profiling and Instrumentation. The alternative not chosen is relying solely on mathematical proofs. The real tradeoff is that modifying code to inject counters (`global` state) makes it messy and thread-unsafe, but provides undeniable runtime validation of theoretical complexity.'
              ],
              typeIt: true,
              solution: 'def merge_sort_counted(lst, depth=0):\n    global call_count, total_work\n    call_count += 1\n    if len(lst) <= 1:\n        return lst\n    mid = len(lst) // 2\n    left  = merge_sort_counted(lst[:mid], depth+1)\n    right = merge_sort_counted(lst[mid:], depth+1)\n    merged = merge(left, right)\n    total_work += len(lst)\n    return merged\n\nfor n in [8, 16, 32, 64]:\n    call_count = 0\n    total_work = 0\n    merge_sort_counted(list(range(n, 0, -1)))\n    import math\n    print(f\'n={n:3d}: calls={call_count}, work={total_work}, n*log2(n)={n*math.log2(n):.0f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Fast exponentiation',
              prose: [
                'If we want to compute 2^1000000, multiplying 2 by itself a million times is very slow (O(n)). Since `2^10 = (2^5) * (2^5)`, we can compute `2^5` just once, and square it. Can we write a recursive function that repeatedly halves the exponent to compute massive powers in mere fractions of a second?',
                'Output confidently predicted: `5 True`, `2 False` This proves we can repeatedly halve integers and check if they are even. This is the **halving step**.'
              ],
              typeIt: true,
              solution: '# Throwaway demonstration of halving an exponent\nexp = 10\nprint(exp // 2, exp % 2 == 0)\nexp = 5\nprint(exp // 2, exp % 2 == 0)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Fast exponentiation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def power(base, exp):`: Defines the exponentiation function.\n- `if exp == 0:`: Base case; anything to the power of 0 is 1.\n- `return 1`: Returns the base case result.\n- `if exp % 2 == 0:`: Checks if the exponent is an even number.\n- `half = power(base, exp // 2)`: Recursively computes the power of half the exponent.\n- `return half * half`: Combines by squaring the result of the half, cutting work in half.\n- `else:`: If the exponent is odd.\n- `return base * power(base, exp - 1)`: Reduces the exponent by 1 to make it even for the next call.\n- `print(...)`: Prints the results.',
                '**Expected behavior.** Predicted confidently: ``` 1024 243 ```',
                '**CS lens.** O(log n) efficiency is a CS holy grail. It appears in: 1. Cryptography (RSA relies heavily on fast modular exponentiation). 2. Binary search trees finding an element. 3. Blockchain state verification (Merkle proofs).',
                '**SE lens.** Design principle: Algorithmic optimization over hardware scaling. The alternative not chosen is waiting for a million iterations in a `for` loop. The real tradeoff is complexity; a `for` loop is universally understood, whereas recursive halving requires deeper conceptual tracing, but it changes an intractable problem into an instantaneous one.'
              ],
              typeIt: true,
              solution: 'def power(base, exp):\n    if exp == 0:\n        return 1\n    if exp % 2 == 0:\n        half = power(base, exp // 2)\n        return half * half\n    else:\n        return base * power(base, exp - 1)\n\nprint(power(2, 10))\nprint(power(3, 5))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Quicksort',
              prose: [
                'Merge sort guarantees fast sorting, but creating a new `result = []` list every time uses O(n) extra memory. Can we divide an array in half and sort it *in place*, by just swapping elements around a chosen "pivot" value?',
                'Output confidently predicted: `[20, 10]` This proves that Python allows simultaneous variable assignment to swap values without a temporary variable. This is **in-place swapping**.'
              ],
              typeIt: true,
              solution: '# Throwaway demonstration of in-place swapping\narr = [10, 20]\narr[0], arr[1] = arr[1], arr[0]\nprint(arr)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Quicksort — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def quicksort(lst, lo=0, hi=None):`: Defines quicksort with optional low and high index bounds.\n- `if hi is None: hi = len(lst) - 1`: Initializes the high bound to the last index on the first call.\n- `if lo < hi:`: Ensures the bounds define a valid sub-array to sort.\n- `p = partition(lst, lo, hi)`: Calls partition to organize the array around a pivot and returns the pivot\'s final index.\n- `quicksort(lst, lo, p - 1)`: Recursively sorts the elements before the pivot.\n- `quicksort(lst, p + 1, hi)`: Recursively sorts the elements after the pivot.\n- `def partition(lst, lo, hi):`: Defines the partition helper function.\n- `pivot = lst[hi]`: Chooses the last element in the given range as the comparison pivot.\n- `i = lo - 1`: Initializes the pointer for the boundary of smaller elements.\n- `for j in range(lo, hi):`: Iterates through the given range up to the pivot.\n- `if lst[j] <= pivot:`: Checks if the current element is smaller than or equal to the pivot.\n- `i += 1`: Moves the smaller-element boundary forward.\n- `lst[i], lst[j] = lst[j], lst[i]`: Swaps the current element into the smaller-element zone.\n- `lst[i+1], lst[hi] = lst[hi], lst[i+1]`: Swaps the pivot itself into its final correct position right after the smaller elements.\n- `return i + 1`: Returns the final index of the pivot.\n- `data = [...]`: Creates test data.\n- `quicksort(data)`: Mutates the list in place.\n- `print(data)`: Prints the now-sorted list.',
                '**Expected behavior.** Predicted confidently: `[1, 1, 2, 3, 6, 8, 10]`',
                '**CS lens.** In-place memory management is vital. It appears in: 1. Embedded systems with strict RAM constraints. 2. V8 JavaScript engine array sorting. 3. Linux kernel memory allocators.',
                '**SE lens.** Design principle: Mutability vs Immutability. The alternative not chosen is Merge Sort returning a brand new list. The real tradeoff is that mutating data in place (Quicksort) saves memory and garbage collection overhead, but makes functions impure and introduces side-effects, making concurrent access dangerous.'
              ],
              typeIt: true,
              solution: 'def quicksort(lst, lo=0, hi=None):\n    if hi is None:\n        hi = len(lst) - 1\n    if lo < hi:\n        p = partition(lst, lo, hi)\n        quicksort(lst, lo, p - 1)\n        quicksort(lst, p + 1, hi)\n\ndef partition(lst, lo, hi):\n    pivot = lst[hi]\n    i = lo - 1\n    for j in range(lo, hi):\n        if lst[j] <= pivot:\n            i += 1\n            lst[i], lst[j] = lst[j], lst[i]\n    lst[i+1], lst[hi] = lst[hi], lst[i+1]\n    return i + 1\n\ndata = [3, 6, 8, 10, 1, 2, 1]\nquicksort(data)\nprint(data)',
              code: '',
              output: '', status: 'idle', figureJson: null,
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
      'If a cell\'s behavior surprises you, isolate the one line that surprised you in its own cell and experiment with small variations.',
      'Read the reference code above the editor line by line and predict what it does before you type it in — that catches most mistakes before you even run anything.',
    ],
    futureLinks: [
      'Next lesson: Recursion and Induction.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "O(n log n)"?',
      options: [
        'Keyword used to exit a function and pass a value back to the caller.',
        'The time complexity typically seen when a dataset of size n is repeatedly halved (log n steps) and recombined with linear (n) work at each step.',
        'Conditional keywords used to branch logic.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Base case"?',
      options: [
        'Syntax f\'...\' for formatting strings with embedded Python expressions.',
        'The condition in a recursive function that stops the recursion, preventing an infinite loop.',
        'The time complexity typically seen when a dataset of size n is repeatedly halved (log n steps) and recombined with linear (n) work at each step.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Divide and Conquer"?',
      options: [
        'A design paradigm that solves a problem by recursively breaking it down into two or more sub-problems of the same type until they become simple enough to be solved directly.',
        'The step in quicksort that reorganizes the array around a pivot element.',
        'Conditional keywords used to branch logic.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Partition"?',
      options: [
        'The step in quicksort that reorganizes the array around a pivot element.',
        'Looping keywords to iterate over sequences or run while a condition holds.',
        'The element chosen in quicksort to partition the array.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Divide and Conquer** — A design paradigm that solves a problem by recursively breaking it down into two or more sub-problems of the same type until they become simple enough to be solved directly.',
    '**Base case** — The condition in a recursive function that stops the recursion, preventing an infinite loop.',
    '**O(n log n)** — The time complexity typically seen when a dataset of size n is repeatedly halved (log n steps) and recombined with linear (n) work at each step.',
    '**O(log n)** — The time complexity when a problem space is halved at each step without linear recombination work.',
    '**Pivot** — The element chosen in quicksort to partition the array.',
    '**Partition** — The step in quicksort that reorganizes the array around a pivot element.',
    '**def** — Keyword used to define a new function.',
    '**if / else** — Conditional keywords used to branch logic.',
  ],

  checkpoints: ['read-intuition'],
}
