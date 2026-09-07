// Guttag — Lesson 31: Sorting Algorithms
// Auto-converted from src/docs/tutorials/guttag-python/lesson-31.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-31-sorting-algorithms',
  slug: 'sorting-algorithms',
  chapter: 5,
  order: 3,
  title: 'Sorting Algorithms',
  subtitle: 'Selection Sort, Merge Sort, and Timsort',
  tags: ['algorithm-complexity', 'big-o-notation', 'o-n', 'o-n-log-n', 'divide-and-conquer', 'stability'],

  hook: {
    question: 'What is "Sorting Algorithms", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 7 core ideas: Selection Sort, Insertion Sort, Merge Sort, Stability, Python\'s Timsort, Empirical Comparison, sorted() and .sort().',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Algorithm complexity:** A measure of how the runtime or memory requirements of an algorithm scale as the input size grows.\n- **Big-O notation:** A mathematical notation used to describe the worst-case asymptotic upper bound of an algorithm\'s complexity.\n- **O(n²):** Quadratic time complexity, meaning the runtime grows proportional to the square of the input size.\n- **O(n log n):** Linearithmic time complexity, common for efficient divide-and-conquer algorithms like merge sort.\n- **Divide-and-conquer:** An algorithmic paradigm that breaks a problem into smaller, independent subproblems, solves them, and combines their results.\n- **Stability:** A property of sorting algorithms where equal elements retain their original relative order.\n- **In-place sorting:** An algorithm that sorts the data without requiring additional proportional memory.\n- **Selection sort:** A simple but inefficient sorting algorithm that repeatedly finds the minimum element and swaps it into place.\n- **Insertion sort:** An algorithm that builds the final sorted array one item at a time, highly efficient for nearly-sorted data.\n- **Merge sort:** A divide-and-conquer algorithm that recursively splits the list and merges the sorted halves.\n- **Timsort:** A hybrid, stable sorting algorithm derived from merge sort and insertion sort, used as Python\'s standard sort.\n- **List slicing ([:]):** Python syntax to create a shallow copy of a list or extract a sublist.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **len:** A built-in Python function that returns the number of items in a container.\n- **range:** A built-in generator of integer sequences.\n- **list.append:** A method to add a single element to the end of a list.\n- **list.extend:** A method to append all items from an iterable to the list.\n- **sorted:** Built-in function that returns a new sorted list from an iterable.\n- **list.sort:** In-place sorting method specifically for lists.\n- **time.time:** Function to get the current system time in seconds.\n- **lambda:** Python keyword for creating small, anonymous inline functions.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'You now have a deep understanding of sorting algorithms, their complexity classes, stability, and Python\'s own implementation strategies. --- Closing: Sorting is one of the most studied problems in computer science. Lesson 32 covers divide and conquer as a general paradigm. Exercises: implement `count_inversions(lst)` (count pairs `(i,j)` where `i<j` but `lst[i]>lst[j]`) using a modified merge sort; implement merge sort that avoids copying by sorting in place using indices.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 31: Sorting Algorithms',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Sorting Algorithms',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Selection Sort',
              prose: [
                'How can we take a list of disorganized numbers and arrange them in ascending order? Before reaching for built-in functions, what is the most intuitive, manual way to sort a list of numbers if you were doing it by hand?',
                'This proves we can iterate through the list to find the position of the smallest element and bring it to the front using a simple tuple swap. The predicted output is `Swapped array: [11, 12, 22, 25]`.'
              ],
              typeIt: true,
              solution: '# Throwaway lab: Finding the minimum index and swapping\narr = [25, 12, 22, 11]\nmin_idx = 0\nfor j in range(1, len(arr)):\n    if arr[j] < arr[min_idx]:\n        min_idx = j\narr[0], arr[min_idx] = arr[min_idx], arr[0]\nprint("Swapped array:", arr)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Selection Sort — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def selection_sort(lst):` defines the function.\n- `lst = lst[:]` uses slicing to create a shallow copy of the input list.\n- `n = len(lst)` uses the built-in length function to get the loop bound.\n- `for i in range(n):` iterates over every index.\n- `min_idx = i` assumes the first element of the unsorted portion is the smallest.\n- `for j in range(i+1, n):` iterates over the remaining unsorted portion.\n- `if lst[j] < lst[min_idx]:` checks if the current element is smaller than our known minimum.\n- `min_idx = j` updates the minimum index.\n- `lst[i], lst[min_idx] = lst[min_idx], lst[i]` swaps the found minimum with the element at position `i`.\n- `return lst` returns the sorted copy.\nHere is the full step-by-step execution trace for `[64, 25, 12, 22, 11]`:\n- i=0: min found at index 4 (11), swap positions 0 and 4: `[11, 25, 12, 22, 64]`\n- i=1: min found at index 2 (12), swap positions 1 and 2: `[11, 12, 25, 22, 64]`\n- i=2: min found at index 3 (22), swap positions 2 and 3: `[11, 12, 22, 25, 64]`\n- i=3: min found at index 3 (25), no swap: `[11, 12, 22, 25, 64]`\n- i=4: one element, done.',
                '**CS lens.** Selection sort has an **O(n²)** time complexity. For an array of size $n$, it makes $n-1$ comparisons, then $n-2$, and so on. This sums to approximately $n^2 / 2$ comparisons. It always does this work regardless of whether the array is already sorted, meaning it has no best-case improvement. It performs exactly $O(n)$ swaps.'
              ],
              typeIt: true,
              solution: 'def selection_sort(lst):\n    lst = lst[:]  # don\'t modify the original\n    n = len(lst)\n    for i in range(n):\n        # Find the minimum in the unsorted portion [i:]\n        min_idx = i\n        for j in range(i+1, n):\n            if lst[j] < lst[min_idx]:\n                min_idx = j\n        # Swap minimum into position i\n        lst[i], lst[min_idx] = lst[min_idx], lst[i]\n    return lst',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Insertion Sort',
              prose: [
                'If selection sort is always $O(n^2)$, is there a different way to sort that is faster if the data is already partially sorted?',
                'This proves we can repeatedly shift larger elements one spot to the right to clear the correct position for our `key`. The predicted output is `Inserted array: [2, 4, 5]`.'
              ],
              typeIt: true,
              solution: '# Throwaway lab: Shifting for insertion\narr = [2, 5, 4]  # The first two elements [2, 5] are sorted. We want to insert 4.\nkey = arr[2]\nj = 1\nwhile j >= 0 and arr[j] > key:\n    arr[j+1] = arr[j]\n    j -= 1\narr[j+1] = key\nprint("Inserted array:", arr)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Insertion Sort — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def insertion_sort(lst):` defines the function.\n- `lst = lst[:]` uses slicing to copy the list.\n- `for i in range(1, len(lst)):` iterates through the list starting from the second element.\n- `key = lst[i]` stores the current element to be inserted.\n- `j = i - 1` starts checking elements immediately to the left of the `key`.\n- `while j >= 0 and lst[j] > key:` loops as long as we haven\'t reached the start of the list and the checked element is larger than the `key`.\n- `lst[j+1] = lst[j]` shifts the larger element to the right.\n- `j -= 1` moves the check to the next element to the left.\n- `lst[j+1] = key` places the `key` into its correct sorted position.\n- `return lst` returns the sorted list.\nFull trace for `[5, 2, 4]`:\n- i=1, key=2: j=0, lst[0]=5>2, shift: `[5, 5, 4]`; j=-1, place: `[2, 5, 4]`\n- i=2, key=4: j=1, lst[1]=5>4, shift: `[2, 5, 5]`; j=0, lst[0]=2<4, stop; place: `[2, 4, 5]`',
                '**CS lens.** Insertion sort is **O(n²)** in the worst case (when the array is in reverse order). However, on nearly-sorted data, the `while` loop terminates almost immediately, giving it an **O(n)** best-case time complexity. This adaptability is precisely why Timsort uses insertion sort for small runs.'
              ],
              typeIt: true,
              solution: 'def insertion_sort(lst):\n    lst = lst[:]\n    for i in range(1, len(lst)):\n        key = lst[i]\n        j = i - 1\n        while j >= 0 and lst[j] > key:\n            lst[j+1] = lst[j]\n            j -= 1\n        lst[j+1] = key\n    return lst',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Merge Sort',
              prose: [
                'How can we sort a list in better than $O(n^2)$ time? What if we could break the list in half, sort each half independently, and then carefully merge the two sorted halves back together?',
                'This proves we can combine two sorted arrays into a single sorted array in exactly one pass, proportional to the sum of their lengths. The predicted output is `Merged: [3, 9, 27, 38]`.'
              ],
              typeIt: true,
              solution: '# Throwaway lab: Merging two sorted lists\nleft = [3, 27]\nright = [9, 38]\nresult = []\ni, j = 0, 0\nwhile i < len(left) and j < len(right):\n    if left[i] <= right[j]:\n        result.append(left[i])\n        i += 1\n    else:\n        result.append(right[j])\n        j += 1\nresult.extend(left[i:])\nresult.extend(right[j:])\nprint("Merged:", result)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Merge Sort — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def merge_sort(lst):` defines the recursive sort function.\n- `if len(lst) <= 1:` is the base case; lists of 0 or 1 elements are already sorted.\n- `return lst[:]` returns a copy of the base case list.\n- `mid = len(lst) // 2` finds the middle index to split the list.\n- `left = merge_sort(lst[:mid])` recursively sorts the first half.\n- `right = merge_sort(lst[mid:])` recursively sorts the second half.\n- `return merge(left, right)` calls the helper to combine the sorted halves.\n- `def merge(left, right):` defines the helper function.\n- `result = []` prepares the output list.\n- `i = j = 0` initializes pointers for the `left` and `right` lists.\n- `while i < len(left) and j < len(right):` loops until one list is exhausted.\n- `if left[i] <= right[j]:` compares the current items of both lists.\n- `result.append(left[i])` appends the smaller item from `left` and increments `i`.\n- `result.append(right[j])` appends the smaller item from `right` and increments `j`.\n- `result.extend(left[i:])` appends any remaining items in `left` (using the `extend` method).\n- `result.extend(right[j:])` appends any remaining items in `right`.\n- `return result` returns the merged list.\nFull recursive call tree for `merge_sort([38, 27, 43, 3])`:\n- `merge_sort([38, 27, 43, 3])`\n- `merge_sort([38, 27])` -> `merge_sort([38])=[38]`, `merge_sort([27])=[27]` -> `merge([38], [27])=[27, 38]`\n- `merge_sort([43, 3])` -> `merge_sort([43])=[43]`, `merge_sort([3])=[3]` -> `merge([43], [3])=[3, 43]`\n- `merge([27, 38], [3, 43])=[3, 27, 38, 43]`\nFull trace of `merge([27, 38], [3, 43])`:\n- `i=0`, `j=0`: 27 > 3, take 3, `j=1`.\n- `i=0`, `j=1`: 27 < 43, take 27, `i=1`.\n- `i=1`, `j=1`: 38 < 43, take 38, `i=2`.\n- `extend [43]`. Result=`[3, 27, 38, 43]`.',
                '**CS lens.** Merge sort has an **O(n log n)** time complexity. The recurrence relation splits the input in half at each step, yielding a recursion tree with a depth of $\\log_2 n$. At each level of the tree, merging takes $O(n)$ work. Therefore, the total work is proportional to $n \\log n$.'
              ],
              typeIt: true,
              solution: 'def merge_sort(lst):\n    if len(lst) <= 1:\n        return lst[:]\n    mid = len(lst) // 2\n    left  = merge_sort(lst[:mid])\n    right = merge_sort(lst[mid:])\n    return merge(left, right)\n\ndef merge(left, right):\n    result = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i])\n            i += 1\n        else:\n            result.append(right[j])\n            j += 1\n    result.extend(left[i:])\n    result.extend(right[j:])\n    return result',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Stability',
              prose: [
                'If we have a list of objects and we want to sort them by one property, and then by a different property, how do we guarantee that the second sort doesn\'t completely scramble the relative ordering established by the first sort?',
                'This proves we can dictate the property to sort by. The predicted output is `[(1, \'c\'), (2, \'b\'), (2, \'a\')]`. Notice that `(2, \'b\')` still appears before `(2, \'a\')` just as it did in the original list.'
              ],
              typeIt: true,
              solution: '# Throwaway lab: Stability in sorting\npairs = [(2, \'b\'), (1, \'c\'), (2, \'a\')]\n# Sort by the first element (the numbers)\nsorted_pairs = sorted(pairs, key=lambda x: x[0])\nprint(sorted_pairs)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Stability — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `students = [...]` defines a list of tuples representing (Name, Grade, GPA).\n- `by_grade = sorted(students, key=lambda s: s[1])` sorts the list based on the second element (Grade).\n- `print(by_grade)` prints the result of the first sort.\n- `by_gpa_then_grade = sorted(by_grade, key=lambda s: s[2])` takes the previously sorted list and sorts it again based on the third element (GPA).\n- `print(by_gpa_then_grade)` prints the final sorted order.\n- Bob appears before Dave in the final output because their GPA is equal (3.5), and in the input to the second sort (`by_grade`), Bob appeared before Dave. The stable sort preserved their relative order.',
                '**CS lens.** A **STABLE** sort guarantees that elements with equal keys remain in their original relative order. Merge sort and Python\'s built-in sorts are stable. Selection sort, by contrast, is NOT stable, as swapping from distant positions can jump over equal elements and invert their relative order. Stability matters deeply when performing multi-key sorts (sorting on a secondary key first, then a primary key).'
              ],
              typeIt: true,
              solution: 'students = [\n    (\'Alice\', \'A\', 3.9),\n    (\'Bob\', \'B\', 3.5),\n    (\'Carol\', \'A\', 3.7),\n    (\'Dave\', \'B\', 3.5),\n]\n\n# Sort by grade first, then by GPA:\n# A stable sort preserves relative order for equal keys\nby_grade = sorted(students, key=lambda s: s[1])\nby_gpa_then_grade = sorted(by_grade, key=lambda s: s[2])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Python\'s Timsort',
              prose: [
                'Real-world data is rarely entirely random. Often, segments of a list are already sorted. How can a sorting algorithm take advantage of these pre-existing "runs" of ordered data?',
                'This proves Python\'s internal sorting implementation scales incredibly well and exploits already sorted data. The predicted output will show the ordered time is extremely fast, and the reversed time is also very quick due to internal optimizations.'
              ],
              typeIt: true,
              solution: 'import time\n# Throwaway lab: Timing Python\'s sorted()\nordered = list(range(100000))\nrev = ordered[::-1]\n\nstart = time.time()\nsorted(ordered)\nt1 = time.time() - start\n\nstart = time.time()\nsorted(rev)\nt2 = time.time() - start\n\nprint(f"Ordered: {t1:.4f}s, Reversed: {t2:.4f}s")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Python\'s Timsort — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import time` loads the time module.\n- `data = list(range(1_000_000, 0, -1))` constructs a list of one million integers in descending order (a worst-case scenario for many algorithms).\n- `start = time.time()` captures the current time.\n- `sorted_data = sorted(data)` runs Python\'s built-in sort.\n- `print(...)` computes and displays the elapsed time.\n- `nearly_sorted = list(range(1_000_000))` constructs an ordered list.\n- `nearly_sorted[-1] = 0` intentionally breaks the order for just one element.\n- `sorted(nearly_sorted)` runs the sort again, demonstrating its speed on mostly-ordered data.',
                '**CS lens.** **Timsort** is a hybrid sorting algorithm derived from merge sort and insertion sort. It detects natural runs (already-sorted sequences) in the data and merges them. It guarantees $O(n \\log n)$ worst-case performance and approaches $O(n)$ time on nearly-sorted data. It is stable by design.'
              ],
              typeIt: true,
              solution: 'import time\n\n# Timsort is Python\'s built-in:\ndata = list(range(1_000_000, 0, -1))  # reversed = worst case for simple sorts\nstart = time.time()\nsorted_data = sorted(data)\nprint(f\'sorted() on 1M elements: {time.time()-start:.3f}s\')\n\n# Nearly-sorted (Timsort\'s strength):\nnearly_sorted = list(range(1_000_000))\nnearly_sorted[-1] = 0  # one element out of place\nstart = time.time()\nsorted(nearly_sorted)\nprint(f\'sorted() on nearly-sorted 1M: {time.time()-start:.3f}s\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 11,
              cellTitle: 'Empirical Comparison',
              prose: [
                'Theoretical Big-O notation tells us how algorithms scale, but what is the practical difference in actual wall-clock time between an $O(n^2)$ algorithm in Python and Python\'s C-optimized $O(n \\log n)$ Timsort?',
                'This proves we can build a list of random integers to serve as unbiased input for our sorts. The predicted output is a short list of random numbers, e.g., `Random data: [7123, 15, 492, 8812, 102]`.'
              ],
              typeIt: true,
              solution: 'import random\n# Throwaway lab: Generating random data\ndata = [random.randint(0, 10000) for _ in range(5)]\nprint("Random data:", data)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 12,
              cellTitle: 'Empirical Comparison — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def time_sort(sort_fn, data):` defines a helper function taking a function object (`sort_fn`) and input data.\n- `data_copy = data[:]` copies the data so subsequent sorts aren\'t fed already-sorted data.\n- `start = time.time()` begins the clock.\n- `sort_fn(data_copy)` executes the provided sort function.\n- `return time.time() - start` computes the elapsed time.\n- `size = 5000` defines the input size.\n- `data = [random.randint(0, 10000) for _ in range(size)]` generates a test array using a list comprehension.\n- `print(...)` logs the time for each. We use `lambda d: selection_sort(d)` to pass an anonymous function wrapper matching the signature `time_sort` expects.',
                '**CS lens.** Python\'s `sorted()` is written in highly-optimized C, while our merge sort and selection sort are executing as interpreted Python bytecode. Even so, the algorithmic difference between $O(n^2)$ and $O(n \\log n)$ is clearly visible: our Python merge sort is over 50x faster than selection sort, and Python\'s native `sorted()` is orders of magnitude faster still.'
              ],
              typeIt: true,
              solution: 'import random\n\ndef time_sort(sort_fn, data):\n    data_copy = data[:]\n    start = time.time()\n    sort_fn(data_copy)\n    return time.time() - start\n\nsize = 5000\ndata = [random.randint(0, 10000) for _ in range(size)]\n\nprint(f\'n={size}\')\nprint(f\'selection_sort: {time_sort(lambda d: selection_sort(d), data):.3f}s\')\nprint(f\'merge_sort:     {time_sort(lambda d: merge_sort(d), data):.3f}s\')\nprint(f\'sorted():       {time_sort(lambda d: sorted(d), data):.5f}s\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 13,
              cellTitle: 'sorted() and .sort()',
              prose: [
                'When you want to sort data using Python\'s native Timsort, you can use the global `sorted()` function or the `.sort()` instance method on a list. What is the actual difference between the two?',
                'This proves `sorted()` works on *any* iterable and returns a brand-new list. The predicted output is `[\'e\', \'h\', \'l\', \'l\', \'o\']`.'
              ],
              typeIt: true,
              solution: '# Throwaway lab: Sorting non-lists\ncharacters = sorted("hello")\nprint(characters)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 14,
              cellTitle: 'sorted() and .sort() — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `sorted(\'hello\')` takes a string (an iterable) and returns a newly minted list of sorted characters.\n- `sorted({3, 1, 2})` takes a set and returns a sorted list.\n- `sorted(range(5), reverse=True)` uses the optional `reverse` argument to sort descending.\n- `lst = [3, 1, 4, 1, 5]` creates a mutable list.\n- `lst.sort()` calls the instance method which sorts the elements directly in the existing memory. It returns `None`.\n- `print(lst)` prints the mutated list.\n- `sorted(words, key=len)` uses the built-in `len` function as a key, sorting the strings by their length rather than alphabetically.',
                '**SE lens.** In practice, always use `sorted()` or `.sort()` — never write your own sorting implementation in production code. Use `.sort()` when you want to avoid the memory overhead of creating a copy of the list. Use `sorted()` when you need to preserve the original data order or when you are sorting an iterable that is not a list. Understand the algorithms underneath to reason about complexity, but let the standard library do the heavy lifting.'
              ],
              typeIt: true,
              solution: '# sorted() returns a new list (any iterable):\nprint(sorted(\'hello\'))         \nprint(sorted({3, 1, 2}))       \nprint(sorted(range(5), reverse=True))  \n\n# .sort() modifies in place (lists only):\nlst = [3, 1, 4, 1, 5]\nlst.sort()\nprint(lst)\n\n# Both accept key=:\nwords = [\'banana\', \'fig\', \'apple\', \'cherry\']\nprint(sorted(words, key=len))',
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
      'Next lesson: Divide and Conquer.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "O(n²)"?',
      options: [
        'Quadratic time complexity, meaning the runtime grows proportional to the square of the input size.',
        'A measure of how the runtime or memory requirements of an algorithm scale as the input size grows.',
        'An algorithm that sorts the data without requiring additional proportional memory.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Big-O notation"?',
      options: [
        'A mathematical notation used to describe the worst-case asymptotic upper bound of an algorithm\'s complexity.',
        'A simple but inefficient sorting algorithm that repeatedly finds the minimum element and swaps it into place.',
        'An algorithm that builds the final sorted array one item at a time, highly efficient for nearly-sorted data.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "O(n log n)"?',
      options: [
        'A measure of how the runtime or memory requirements of an algorithm scale as the input size grows.',
        'An algorithm that builds the final sorted array one item at a time, highly efficient for nearly-sorted data.',
        'Linearithmic time complexity, common for efficient divide-and-conquer algorithms like merge sort.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Algorithm complexity"?',
      options: [
        'Linearithmic time complexity, common for efficient divide-and-conquer algorithms like merge sort.',
        'A measure of how the runtime or memory requirements of an algorithm scale as the input size grows.',
        'An algorithmic paradigm that breaks a problem into smaller, independent subproblems, solves them, and combines their results.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Algorithm complexity** — A measure of how the runtime or memory requirements of an algorithm scale as the input size grows.',
    '**Big-O notation** — A mathematical notation used to describe the worst-case asymptotic upper bound of an algorithm\'s complexity.',
    '**O(n²)** — Quadratic time complexity, meaning the runtime grows proportional to the square of the input size.',
    '**O(n log n)** — Linearithmic time complexity, common for efficient divide-and-conquer algorithms like merge sort.',
    '**Divide-and-conquer** — An algorithmic paradigm that breaks a problem into smaller, independent subproblems, solves them, and combines their results.',
    '**Stability** — A property of sorting algorithms where equal elements retain their original relative order.',
    '**In-place sorting** — An algorithm that sorts the data without requiring additional proportional memory.',
    '**Selection sort** — A simple but inefficient sorting algorithm that repeatedly finds the minimum element and swaps it into place.',
  ],

  checkpoints: ['read-intuition'],
}
