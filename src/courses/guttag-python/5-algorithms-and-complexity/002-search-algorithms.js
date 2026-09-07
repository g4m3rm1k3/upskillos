// Guttag — Lesson 30: Search Algorithms
// Auto-converted from src/docs/tutorials/guttag-python/lesson-30.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-30-search-algorithms',
  slug: 'search-algorithms',
  chapter: 5,
  order: 2,
  title: 'Search Algorithms',
  subtitle: 'Linear and Binary',
  tags: ['linear-search', 'binary-search', 'divide-and-conquer', 'precondition', 'o-n', 'o-log-n'],

  hook: {
    question: 'What is "Search Algorithms", and why does it matter?',
    realWorldContext: 'The reader implements linear search (O(n)), binary search (O(log n)), and understands the PRECONDITION of binary search (sorted input), the bisect module, and searching with custom keys. The transferable insight: binary search is the canonical example of \'divide and conquer applied to search.\' Each step eliminates HALF the remaining candidates. This is why O(log n) is so powerful: log2(1,000,000) = 20. You find any element in a million-element sorted list in at most 20 steps.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Linear search — O(n) brute force, Binary search — O(log n) on sorted data, The bisect module — binary search in the standard library, Searching with a key function, When to use what — search selection guide.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Linear search:** An algorithmic process that checks every element in a list sequentially until the target is found. It exists to provide a simple, foolproof way to search unsorted data.\n- **Binary search:** An algorithmic process that repeatedly divides a sorted list in half to find a target. It exists to provide extremely fast searches, solving the performance bottlenecks of linear search on large datasets.\n- **Divide and conquer:** An algorithmic design paradigm. It exists to solve complex problems by breaking them down into smaller, similar sub-problems, solving them, and combining the results.\n- **Precondition:** A condition that must be true before a function or algorithm runs (e.g., binary search requires a sorted list). It exists to guarantee the correct behavior of the algorithm.\n- **O(n):** Linear time complexity. It describes performance that scales directly in proportion to the input size.\n- **O(log n):** Logarithmic time complexity. It describes performance that scales with the logarithm of the input size, indicating massive efficiency gains for large data.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **enumerate:** A Python built-in function that adds a counter to an iterable.\n- **bisect.bisect_left:** A function in the bisect module to locate the insertion point for a target in a sorted list to maintain sorted order.\n- **bisect.insort:** A function in the bisect module to insert an element into a sorted sequence.\n- **bisect.bisect_right:** A function similar to bisect_left, but returns an insertion point which comes after any existing entries of the target.\n- **lambda:** A keyword used to create small, anonymous functions in Python.\n- **sorted:** A built-in function that builds a new sorted list from an iterable.\n- **time.perf_counter:** A function that returns a float value of time in seconds, useful for performance profiling.\n- **list.sort:** A method that sorts a list in place.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace `binary_search([1,3,5,7,9,11,13], 7)` step by step using our custom `binary_search` algorithm: 1. `lo=0, hi=6`. `mid = (0 + 6) // 2 = 3`. The element at `data[3]` is `7`. Since `7 == 7`, we return index `3` immediately. If we searched for `6`: 1. `lo=0, hi=6`. `mid=3`. `data[3]` is `7`. `7 > 6`, so we set `hi = mid - 1 = 2`. 2. `lo=0, hi=2`. `mid = (0 + 2) // 2 = 1`. `data[1]` is `3`. `3 < 6`, so we set `lo = mid + 1 = 2`. 3. `lo=2, hi=2`. `mid = (2 + 2) // 2 = 2`. `data[2]` is `5`. `5 < 6`, so we set `lo = mid + 1 = 3`. 4. Now `lo=3` and `hi=2`. The condition `lo <= hi` fails. The loop terminates, and we return `-1`. This demonstrates the divide and conquer mechanism that eliminates half the candidates at each step, culminating in an extremely efficient O(log n) operation count.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 30: Search Algorithms',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Search Algorithms',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Linear search — O(n) brute force',
              prose: [
                'How do we find a specific item in a collection of data? If the data is completely scrambled, in what order should we look? What happens if the item we are looking for is at the very end, or not there at all?',
                'Trace linear_search([4,2,7,1,9], 7): i=0,item=4: 4!=7. i=1,item=2: 2!=7. i=2,item=7: 7==7. Return 2. This proves that **linear search** must potentially look at every element, operating in O(n) time.'
              ],
              typeIt: true,
              solution: 'def linear_search(lst, target):\n    for i, item in enumerate(lst):\n        if item == target:\n            return i    # found at index i\n    return -1           # not found\n\ndata = [4, 2, 7, 1, 9, 3, 6, 5, 8]\nprint(linear_search(data, 7))   # 2 (index)\nprint(linear_search(data, 10))  # -1\n\n# Python\'s \'in\' operator: also O(n) for lists\nprint(7 in data)   # True  -- same as linear_search but returns bool\nprint(10 in data)  # False',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Linear search — O(n) brute force — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def linear_search(lst, target):` declares a function accepting a list and a target value.\n- `for i, item in enumerate(lst):` iterates over the list, extracting both the index `i` and the `item` value at that index.\n- `if item == target:` compares the current value with the target value.\n- `return i` exits the function early and returns the index where the item was found.\n- `return -1` provides a sentinel value indicating the target was not found in the list.',
                '**Expected behavior.** Predicted confidently: For a target in the list, it returns its 0-based index. For a missing target, it returns -1.',
                '**CS lens.** This is a sequential search, operating in O(n) time complexity. It appears in log parsing, checking for simple unindexed database rows, or simple array scans in low-level C code where setting up complex structures is unnecessary.',
                '**SE lens.** Design principle: Keep It Simple Stupid (KISS). An alternative not chosen is to build a complex hash map or sorted index. The tradeoff is that while linear search is slow on large data, it has zero setup cost and works on completely unordered inputs.'
              ],
              typeIt: true,
              solution: 'def linear_search(lst, target):\n    for i, item in enumerate(lst):\n        if item == target:\n            return i\n    return -1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Binary search — O(log n) on sorted data',
              prose: [
                'If you have a million records and they are already sorted, does it make sense to check the first item, then the second, and so on? How could you jump ahead and narrow down the possibilities faster?',
                'Trace binary_search([1,3,5,7,9,11,13], 7): lo=0,hi=6. mid=3: data[3]=7==7. Return 3. One step! If target=6: lo=0,hi=6,mid=3,data[3]=7>6 -> hi=2. lo=0,hi=2,mid=1,data[1]=3<6 -> lo=2. lo=2,hi=2,mid=2,data[2]=5<6 -> lo=3. lo=3>hi=2: return -1. This proves that **binary search** rapidly halves the search space in O(log n) time.'
              ],
              typeIt: true,
              solution: 'def binary_search(sorted_lst, target):\n    lo, hi = 0, len(sorted_lst) - 1\n\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if sorted_lst[mid] == target:\n            return mid          # found\n        elif sorted_lst[mid] < target:\n            lo = mid + 1        # target in right half\n        else:\n            hi = mid - 1        # target in left half\n\n    return -1   # not found\n\ndata = [1, 3, 5, 7, 9, 11, 13]  # MUST be sorted\nprint(binary_search(data, 7))    # 3\nprint(binary_search(data, 6))    # -1\nprint(binary_search(data, 1))    # 0\nprint(binary_search(data, 13))   # 6',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Binary search — O(log n) on sorted data — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def binary_search(sorted_lst, target):` defines the function, making it clear through variable naming that `sorted_lst` must be sorted.\n- `lo, hi = 0, len(sorted_lst) - 1` initializes two pointers to the start and end of the list, respectively.\n- `while lo <= hi:` sets up a loop that continues as long as there is a valid range of elements to examine.\n- `mid = (lo + hi) // 2` calculates the midpoint index, using integer division `//` to ensure an integer index.\n- `if sorted_lst[mid] == target:` tests if the midpoint is exactly what we are searching for.\n- `return mid` returns the index if the target is found.\n- `elif sorted_lst[mid] < target:` checks if the target is greater than the midpoint value, meaning it must be in the right half.\n- `lo = mid + 1` shifts the lower bound up, discarding the left half.\n- `else:` captures the case where the target is less than the midpoint value, meaning it must be in the left half.\n- `hi = mid - 1` shifts the upper bound down, discarding the right half.\n- `return -1` executes if the loop exhausts all options, meaning the target does not exist in the list.',
                '**Expected behavior.** Predicted confidently: For target 7 in sorted data `[1,3,5,7,9,11,13]`, it returns 3. For target 6, it returns -1.',
                '**CS lens.** This represents the classic "divide and conquer" paradigm applied to search. Real-world appearances include binary search trees (BSTs) in databases, git bisect for finding bugs, and B-trees in file systems.',
                '**SE lens.** Design principle: Contract prerequisites. The alternative not chosen is sorting the list inside `binary_search`. The tradeoff is that sorting internally would hide the O(n log n) cost; forcing the caller to provide a sorted list enforces the precondition and keeps the search function strictly O(log n).'
              ],
              typeIt: true,
              solution: 'def binary_search(sorted_lst, target):\n    lo, hi = 0, len(sorted_lst) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if sorted_lst[mid] == target:\n            return mid\n        elif sorted_lst[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'The bisect module — binary search in the standard library',
              prose: [
                'Why reinvent the wheel? If binary search is such a fundamental algorithm, shouldn\'t Python provide a built-in, highly optimized way to do it, and perhaps handle edge cases like inserting items while maintaining order?',
                'Trace values_in_range([1,3,5,7,9,11,13], 4, 10): bisect_left([...],4)=2 (5 is first >= 4). bisect_right([...],10)=5 (11 is first > 10). data[2:5]=[5,7,9]. This proves that **the bisect module** offers fast O(log n) primitives for working with sorted lists.'
              ],
              typeIt: true,
              solution: 'import bisect\n\ndata = [1, 3, 5, 7, 9, 11, 13]\n\n# bisect_left: index where target would be inserted to keep sorted order\nprint(bisect.bisect_left(data, 7))   # 3 (7 is at index 3)\nprint(bisect.bisect_left(data, 6))   # 3 (6 would go before 7)\nprint(bisect.bisect_left(data, 0))   # 0 (before all elements)\nprint(bisect.bisect_left(data, 14))  # 7 (after all elements)\n\n# insort: insert while maintaining sorted order O(n) due to list shift\nbisect.insort(data, 6)\nprint(data)  # [1, 3, 5, 6, 7, 9, 11, 13]\n\n# Finding all values in a range [lo, hi]:\ndef values_in_range(sorted_lst, lo, hi):\n    left  = bisect.bisect_left(sorted_lst, lo)\n    right = bisect.bisect_right(sorted_lst, hi)\n    return sorted_lst[left:right]\n\nprint(values_in_range([1,3,5,7,9,11,13], 4, 10))  # [5,7,9]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'The bisect module — binary search in the standard library — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import bisect` brings the standard library module into scope.\n- `def values_in_range(sorted_lst, lo, hi):` defines a function to return a slice of a sorted list containing values between `lo` and `hi`.\n- `left = bisect.bisect_left(sorted_lst, lo)` finds the index of the first element greater than or equal to `lo`.\n- `right = bisect.bisect_right(sorted_lst, hi)` finds the index of the first element strictly greater than `hi`.\n- `return sorted_lst[left:right]` returns the slice of the list using the found indices, extracting only the valid range in O(k) time where k is the number of elements found.',
                '**Expected behavior.** Predicted confidently: For a range `4` to `10` on `[1,3,5,7,9,11,13]`, it returns `[5, 7, 9]`.',
                '**CS lens.** This is an application of bounded search queries. It appears in time-series databases for fetching events between two timestamps, graphics for frustum culling, and spatial indexing.',
                '**SE lens.** Design principle: Reuse standard libraries. The alternative not chosen is writing custom bound-finding loops. The tradeoff is trusting the opaque module implementation vs having complete control; in almost all Python code, standard library C implementations are drastically faster and less bug-prone.'
              ],
              typeIt: true,
              solution: 'import bisect\n\ndef values_in_range(sorted_lst, lo, hi):\n    left  = bisect.bisect_left(sorted_lst, lo)\n    right = bisect.bisect_right(sorted_lst, hi)\n    return sorted_lst[left:right]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Searching with a key function',
              prose: [
                'What if we have a list of tuples representing people\'s names and ages? If we want to find someone by their age, how do we tell the binary search to look only at the age field instead of the whole tuple?',
                'Trace binary_search_key(people, 35, key=lambda p: p[1]): lo=0,hi=3. mid=1: key(people[1])=key((\'Bob\',30))=30 < 35 -> lo=2. mid=2: key(people[2])=35==35. Return 2. This proves that **searching with a key function** decouples the search logic from the data\'s specific structure.'
              ],
              typeIt: true,
              solution: 'def binary_search_key(sorted_lst, target, key=lambda x: x):\n    lo, hi = 0, len(sorted_lst) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        mid_val = key(sorted_lst[mid])\n        if mid_val == target:\n            return mid\n        elif mid_val < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n\npeople = [(\'Alice\', 25), (\'Bob\', 30), (\'Charlie\', 35), (\'Diana\', 40)]\nidx = binary_search_key(people, 35, key=lambda p: p[1])\nprint(idx)              # 2\nprint(people[idx])      # (\'Charlie\', 35)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Searching with a key function — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def binary_search_key(sorted_lst, target, key=lambda x: x):` defines the function and sets a default `key` argument using an inline anonymous `lambda` function that just returns the item itself.\n- `lo, hi = 0, len(sorted_lst) - 1` initializes the boundary pointers.\n- `while lo <= hi:` loop as long as the search space is valid.\n- `mid = (lo + hi) // 2` calculates the midpoint index.\n- `mid_val = key(sorted_lst[mid])` dynamically extracts the comparison value from the midpoint object by calling the `key` function.\n- `if mid_val == target:` compares the extracted value against our target.\n- `return mid` returns the index if there is a match.\n- `elif mid_val < target:` handles the case where the extracted value is less than the target.\n- `lo = mid + 1` moves the lower bound up.\n- `else:` handles the case where the extracted value is greater than the target.\n- `hi = mid - 1` moves the upper bound down.\n- `return -1` returns if the search fails.',
                '**Expected behavior.** Predicted confidently: For a tuple list sorted by age, searching for 35 with a `lambda p: p[1]` key returns the index containing `(\'Charlie\', 35)`.',
                '**CS lens.** This highlights the concept of functional programming abstractions, treating behavior (how to extract a comparison key) as data (an argument). It is widely used in relational databases for secondary indexes.',
                '**SE lens.** Design principle: Dependency Inversion. The alternative not chosen is hardcoding `sorted_lst[mid][1]` for the tuple. The tradeoff is performance (function call overhead inside a tight loop) versus massive reusability across any data type.'
              ],
              typeIt: true,
              solution: 'def binary_search_key(sorted_lst, target, key=lambda x: x):\n    lo, hi = 0, len(sorted_lst) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        mid_val = key(sorted_lst[mid])\n        if mid_val == target:\n            return mid\n        elif mid_val < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'When to use what — search selection guide',
              prose: [
                'If sorting an array takes time, when is it actually worth doing it just so we can use binary search? If we only need to look for one item, is it faster to just scan the unsorted list?',
                'Trace: 1000 searches on 100000-element list. Linear: 1000 * 100000 comparisons = 100M. Binary: sort (1.7M ops) + 1000 * 17 = 18700 ops. Total: ~1.7M vs 100M -> ~58x speedup in operation count. This proves the pattern of **sort-once-search-many**.'
              ],
              typeIt: true,
              solution: 'import time\nimport bisect\n\nn = 100000\ndata = list(range(n, 0, -1))  # reverse sorted\ntargets = list(range(0, n, 100))\n\n# Linear: O(n) per search = O(n*k) total\nt0 = time.perf_counter()\nfor t in targets:\n    t in data\nlinear_time = time.perf_counter() - t0\n\n# Sort once + binary: O(n log n) + O(k log n)\nt0 = time.perf_counter()\ndata.sort()   # O(n log n) once\nfor t in targets:\n    bisect.bisect_left(data, t)  # O(log n) per query\nbinary_time = time.perf_counter() - t0\n\nprint(f\'Linear: {linear_time:.3f}s\')\nprint(f\'Sort+Binary: {binary_time:.3f}s\')\nprint(f\'Speedup: {linear_time/binary_time:.1f}x\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'When to use what — search selection guide — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `# Decision guide for searching:` marks the start of the documentation.\n- `# Data is unsorted, small n (< 1000): linear search or \'in\'` documents that the overhead of sorting isn\'t worth it for small data or single lookups.\n- `# Data is unsorted, large n, many searches: sort once + binary search` states the amortization principle: paying O(n log n) once is cheap if you do many O(log n) searches.\n- `# Data changes frequently: sorted container (SortedList from sortedcontainers)` specifies that list insertions are O(n), so highly volatile data needs specialized structures.\n- `# Need O(1) lookup: dict or set (hash map)` mentions that absolute fastest exact-match lookups belong to hashing, not binary search.\n- `# Range queries: bisect on sorted list` reiterates that binary search excels at bounding problems.',
                '**Expected behavior.** Predicted confidently: This is a documentation block, so running the script does nothing.',
                '**CS lens.** This represents algorithmic profiling and amortization. Real-world systems like Postgres query planners constantly make this exact decision: "Should I do a sequential scan, or use an index scan?" based on the number of rows.',
                '**SE lens.** Design principle: Optimize for the dominant use case. The alternative not chosen is using a dictionary for everything. The tradeoff is that while dictionaries offer O(1) lookups, they use more memory and cannot answer range queries efficiently; sorted lists and binary search provide an optimal balance.'
              ],
              typeIt: true,
              solution: '# Decision guide for searching:\n# Data is unsorted, small n (< 1000): linear search or \'in\'\n# Data is unsorted, large n, many searches: sort once + binary search\n# Data changes frequently: sorted container (SortedList from sortedcontainers)\n# Need O(1) lookup: dict or set (hash map)\n# Range queries: bisect on sorted list',
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
      'Next lesson: Sorting Algorithms.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "O(n)"?',
      options: [
        'Logarithmic time complexity. It describes performance that scales with the logarithm of the input size, indicating massive efficiency gains for large data.',
        'A condition that must be true before a function or algorithm runs (e.g., binary search requires a sorted list). It exists to guarantee the correct behavior of the algorithm.',
        'Linear time complexity. It describes performance that scales directly in proportion to the input size.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "O(log n)"?',
      options: [
        'An algorithmic process that repeatedly divides a sorted list in half to find a target. It exists to provide extremely fast searches, solving the performance bottlenecks of linear search on large datasets.',
        'Linear time complexity. It describes performance that scales directly in proportion to the input size.',
        'Logarithmic time complexity. It describes performance that scales with the logarithm of the input size, indicating massive efficiency gains for large data.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Divide and conquer"?',
      options: [
        'An algorithmic design paradigm. It exists to solve complex problems by breaking them down into smaller, similar sub-problems, solving them, and combining the results.',
        'An algorithmic process that checks every element in a list sequentially until the target is found. It exists to provide a simple, foolproof way to search unsorted data.',
        'An algorithmic process that repeatedly divides a sorted list in half to find a target. It exists to provide extremely fast searches, solving the performance bottlenecks of linear search on large datasets.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Binary search"?',
      options: [
        'A condition that must be true before a function or algorithm runs (e.g., binary search requires a sorted list). It exists to guarantee the correct behavior of the algorithm.',
        'An algorithmic process that repeatedly divides a sorted list in half to find a target. It exists to provide extremely fast searches, solving the performance bottlenecks of linear search on large datasets.',
        'Linear time complexity. It describes performance that scales directly in proportion to the input size.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Linear search** — An algorithmic process that checks every element in a list sequentially until the target is found. It exists to provide a simple, foolproof way to search unsorted data.',
    '**Binary search** — An algorithmic process that repeatedly divides a sorted list in half to find a target. It exists to provide extremely fast searches, solving the performance bottlenecks of linear search on large datasets.',
    '**Divide and conquer** — An algorithmic design paradigm. It exists to solve complex problems by breaking them down into smaller, similar sub-problems, solving them, and combining the results.',
    '**Precondition** — A condition that must be true before a function or algorithm runs (e.g., binary search requires a sorted list). It exists to guarantee the correct behavior of the algorithm.',
    '**O(n)** — Linear time complexity. It describes performance that scales directly in proportion to the input size.',
    '**O(log n)** — Logarithmic time complexity. It describes performance that scales with the logarithm of the input size, indicating massive efficiency gains for large data.',
  ],

  checkpoints: ['read-intuition'],
}
