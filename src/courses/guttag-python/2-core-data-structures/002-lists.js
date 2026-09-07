// Guttag — Lesson 7: Lists
// Auto-converted from src/docs/tutorials/guttag-python/lesson-07.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-07-lists',
  slug: 'lists',
  chapter: 2,
  order: 2,
  title: 'Lists',
  subtitle: 'The Workhorse',
  tags: ['mutable', 'sequence', 'index', 'slice', 'aliasing', 'in-place-mutation'],

  hook: {
    question: 'What is "Lists", and why does it matter?',
    realWorldContext: 'The reader understands Python lists: mutable ordered sequences, indexing/slicing, mutation methods (append, insert, remove, pop, sort), aliasing vs. copying, and list-as-stack/queue patterns. The transferable insight: a list is a mutable sequence. Mutability means methods like append() change the list IN PLACE and return None. This catches many beginners: sorted(lst) returns a new list; lst.sort() mutates in place and returns None.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: List literals and indexing — mutable ordered sequence, Mutation methods — append, insert, remove, pop, Sorting — sort() vs sorted(), Aliasing vs. copying — the mutation trap, Lists as stacks and queues.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **mutable:** an object whose state or contents can be changed after it is created. Mutability requires careful handling to avoid accidental changes to shared data.\n- **sequence:** an ordered collection of elements. A sequence allows access to elements by their integer position.\n- **index:** a zero-based integer indicating an element\'s position within a sequence. Used to retrieve or modify specific elements.\n- **slice:** a subset of a sequence, extracted by specifying a start, stop, and optional step index. It creates a new sequence containing the requested elements.\n- **aliasing:** when two or more variables refer to the exact same object in memory. A change through one alias is visible through all others.\n- **in-place mutation:** modifying an existing object directly rather than creating a new copy with the changes. Operations that mutate in place typically return None in Python.\n- **stack:** a data structure that follows the Last-In, First-Out (LIFO) principle, where elements are added and removed from the same end.\n- **queue:** a data structure that follows the First-In, First-Out (FIFO) principle, where elements are added at one end and removed from the other.\n- **LIFO:** Last-In, First-Out. The last item added is the first one removed.\n- **FIFO:** First-In, First-Out. The first item added is the first one removed.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **list:** Python\'s built-in mutable sequence type.\n- **len:** A built-in function that returns the number of items in a container.\n- **id:** A built-in function that returns the unique memory address (identity) of an object.\n- **append:** A list method that adds a single element to the end of the list.\n- **insert:** A list method that inserts an element before a specified index.\n- **remove:** A list method that removes the first occurrence of a value.\n- **pop:** A list method that removes and returns the element at a given index (defaulting to the last).\n- **extend:** A list method that appends all elements from an iterable to the list.\n- **clear:** A list method that removes all items from the list.\n- **sort:** A list method that sorts the list in place.\n- **sorted:** A built-in function that returns a new sorted list from the items in any iterable.\n- **copy.deepcopy:** A function from the copy module that creates a fully independent clone of an object and all objects it contains.\n- **collections.deque:** A double-ended queue from the collections module.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Through this lesson, we traced a raw collection of names as it evolved using Python\'s list capabilities. We started with a basic list literal and saw how indexing and slicing allow targeted access and mutation. We modified it in place by appending, inserting, and popping elements, proving that lists are mutable containers that change state rather than returning new copies. We then sorted the collection, distinguishing sharply between `sorted(names)` returning a fresh sequence and `names.sort()` mutating the list in place. We observed the dangers of aliasing when multiple variables share a reference, and how to safely duplicate structures with shallow and deep copies. Finally, we constrained the list\'s random access to specific patterns, turning it into a LIFO stack and introducing `deque` for high-performance FIFO queues. This lifecycle — creation, in-place mutation, defensive copying, and patterned access — forms the daily reality of managing state in Python.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 7: Lists',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Lists',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'List literals and indexing — mutable ordered sequence',
              prose: [
                'When dealing with multiple related values, such as a row of sensor readings or a collection of user inputs, storing each one in a separate variable (`val1`, `val2`, `val3`) quickly becomes unmanageable. How can you group an arbitrary number of values together in a specific, predictable order? If you need to retrieve the exact first or last item of that group, how would you target it? What if you need to update one specific value within the group without recreating the entire structure?',
                'Output: ```text 1 None [\'a\', True] 4 True [99, \'a\', True, None] True ``` This proves that a **list** is a heterogeneous, ordered sequence that supports zero-based indexing (`my_list[0]`), negative indexing from the end (`my_list[-1]`), slicing (`my_list[1:3]`), length checking (`len()`), and membership testing (`in`). Crucially, it proves that lists are mutable: assigning `99` to index `0` changes the list in place, and the `id()` check confirms it is the exact same object in memory, just with different contents.'
              ],
              typeIt: true,
              solution: 'my_list = [1, \'a\', True, None]\nprint(my_list[0])\nprint(my_list[-1])\nprint(my_list[1:3])\nprint(len(my_list))\nprint(\'a\' in my_list)\n\noriginal_id = id(my_list)\nmy_list[0] = 99\nprint(my_list)\nprint(id(my_list) == original_id)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'List literals and indexing — mutable ordered sequence — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `names`: A variable bound to the list object.\n- `=`: The assignment operator.\n- `[\'Alice\', \'Bob\', \'Charlie\']`: A list literal containing three string elements.\n- `names[0]`: Indexing syntax targeting the element at integer position 0.\n- `=`: The assignment operator used for item assignment.\n- `\'Alicia\'`: A new string literal replacing the old element.',
                '**Expected behavior.** Predicted confidently: The list `names` will contain `[\'Alicia\', \'Bob\', \'Charlie\']`.',
                '**CS lens.** The CS concept is the **Dynamic Array**. Unlike static arrays in C or Java which have fixed sizes determined at creation, a dynamic array grows and shrinks automatically. It appears in Java\'s `ArrayList`, C++\'s `std::vector`, and Ruby\'s `Array`. It provides O(1) random access by index but O(n) insertions/deletions in the middle of the array, as elements must be shifted.',
                '**SE lens.** The design principle here is **Mutability vs Immutability**. Python chose to make its primary sequence type mutable for convenience and performance in scripting tasks. The alternative NOT chosen is making all sequences immutable (like functional languages or Python\'s own `tuple`). The real tradeoff is that mutable objects can be modified unexpectedly if shared across different parts of a program, leading to bugs, but they avoid the overhead of copying entire structures for tiny updates.'
              ],
              typeIt: true,
              solution: 'names = [\'Alice\', \'Bob\', \'Charlie\']\nnames[0] = \'Alicia\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Mutation methods — append, insert, remove, pop',
              prose: [
                'We have a list, but it currently only holds the items we provided when we typed the literal `[...]`. How do we add a new item dynamically to the end of the list? What if we need to insert an item exactly at the beginning? If an item needs to be removed, how do we delete it by its value or by its index?',
                'Output: ```text None [10, 20, 30] [5, 10, 20, 30] [5, 10, 30] Popped: 10, List: [5, 30] [5, 30, 40, 50] [] ``` This proves that **list mutation methods** (`append`, `insert`, `remove`, `extend`, `clear`) change the list in place and explicitly return `None`. `pop` is the exception, mutating the list by removing an item and returning that removed item.'
              ],
              typeIt: true,
              solution: 'sandbox = [10, 20]\nprint(sandbox.append(30))\nprint(sandbox)\n\nsandbox.insert(0, 5)\nprint(sandbox)\n\nsandbox.remove(20)\nprint(sandbox)\n\npopped = sandbox.pop(1)\nprint(f"Popped: {popped}, List: {sandbox}")\n\nsandbox.extend([40, 50])\nprint(sandbox)\n\nsandbox.clear()\nprint(sandbox)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Mutation methods — append, insert, remove, pop — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `names.append(\'David\')`: Calls the `append` method on the `names` list, mutating it to add the string `\'David\'` to the end, returning `None`.\n- `names.insert(1, \'Eve\')`: Calls `insert` on `names`, shifting elements from index 1 rightward, and placing `\'Eve\'` at index 1, returning `None`.\n- `names.remove(\'Bob\')`: Calls `remove` on `names`, searching for the exact value `\'Bob\'` and removing its first occurrence, returning `None`.\n- `last = names.pop()`: Calls `pop` on `names` with no arguments, which removes and returns the last element. The returned string is assigned to the variable `last`.',
                '**Expected behavior.** Predicted confidently: The list `names` will contain `[\'Alicia\', \'Eve\', \'Charlie\']` and `last` will hold `\'David\'`.',
                '**CS lens.** The CS concept is **In-Place Modification (Side Effects)**. Methods that perform side effects (like mutating the underlying data structure) typically do not return the structure itself. It appears in REST APIs (POST/DELETE don\'t always return the full state), database UPDATE statements, and object-oriented state machines.',
                '**SE lens.** The design principle is **Command-Query Separation (CQS)**. A method should either be a command that performs an action (mutates state) and returns void/None, or a query that returns data without side effects, but not both. Python adheres to this strictly with `append()`, `insert()`, and `remove()`. `pop()` is a deliberate, pragmatic violation of CQS because separating a stack pop into a peek followed by a delete would create race conditions in concurrent environments.'
              ],
              typeIt: true,
              solution: 'names.append(\'David\')\nnames.insert(1, \'Eve\')\nnames.remove(\'Bob\')\nlast = names.pop()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Sorting — sort() vs sorted()',
              prose: [
                'If you have a list of names and need to present them alphabetically, how do you reorder them? If you need to keep the original list exactly as it is but also need an alphabetical copy for a specific report, how do you accomplish both? What if you want to sort them by length instead of alphabetical order?',
                'Output: ```text Original: [\'b\', \'a\', \'d\', \'c\'] Sorted copy: [\'a\', \'b\', \'c\', \'d\'] Return value: None Mutated original: [\'d\', \'c\', \'b\', \'a\'] Case-insensitive: [\'apple\', \'Banana\', \'cherry\'] ``` This proves the difference between **`sorted()`** (which returns a new list and leaves the original alone) and **`lst.sort()`** (which mutates the list in place and returns `None`). Both accept keyword arguments `key` and `reverse` to customize the sorting logic.'
              ],
              typeIt: true,
              solution: 'letters = [\'b\', \'a\', \'d\', \'c\']\nnew_letters = sorted(letters)\nprint(f"Original: {letters}")\nprint(f"Sorted copy: {new_letters}")\n\nresult = letters.sort(reverse=True)\nprint(f"Return value: {result}")\nprint(f"Mutated original: {letters}")\n\nwords = [\'apple\', \'Banana\', \'cherry\']\nwords.sort(key=str.lower)\nprint(f"Case-insensitive: {words}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Sorting — sort() vs sorted() — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `alphabetical_names`: A new variable bound to the result of `sorted()`.\n- `=`: The assignment operator.\n- `sorted(names)`: Calls the built-in `sorted` function with `names` as the argument, returning a brand new list sorted in ascending order.\n- `names.sort(key=len)`: Calls the `sort` method on `names`, mutating it in place. The `key=len` argument specifies that the built-in `len` function should be called on each element to determine its sort weight, sorting by string length.',
                '**Expected behavior.** Predicted confidently: `alphabetical_names` will be `[\'Alicia\', \'Charlie\', \'Eve\']`. `names` will be `[\'Eve\', \'Alicia\', \'Charlie\']` (sorted by length, \'Eve\' is 3, \'Alicia\' is 6, \'Charlie\' is 7).',
                '**CS lens.** The CS concept is **Stable Sorting**. Python\'s sorting algorithm (Timsort) is guaranteed to be stable, meaning that if two elements compare as equal (e.g., they have the same length when `key=len` is used), their original relative order is preserved in the sorted output. It appears in SQL `ORDER BY` clauses, spreadsheet sorting, and multi-pass sorting algorithms where you sort by one criteria and then another without losing the first pass\'s grouping.',
                '**SE lens.** The design principle is **Pure Functions vs Mutating Methods**. `sorted()` is a pure-like function: it takes an input, returns an output, and has no side effects (it doesn\'t alter the input). `sort()` is an impure method: it relies entirely on side effects. Python provides both so the developer can choose based on the tradeoff: `sorted()` is safer because it prevents accidental corruption of shared state, while `sort()` is significantly more memory-efficient for massive datasets because it doesn\'t allocate a new array.'
              ],
              typeIt: true,
              solution: 'alphabetical_names = sorted(names)\nnames.sort(key=len)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Aliasing vs. copying — the mutation trap',
              prose: [
                'If you assign a list to a new variable (like `backup = names`), and then modify the new variable, what happens to the original list? Why does modifying `backup` magically alter `names`? If you actually need an independent copy to modify safely, how do you create one?',
                'Output: ```text a after b mutates: [1, [2, 3], 4] a after c appends: [1, [2, 3], 4] a after c mutates nested list: [1, [2, 3, 99], 4] a after d mutates nested list: [1, [2, 3, 99], 4] ``` This proves **aliasing** (`b = a` points to the exact same list) and **shallow copying** (`c = a[:]` creates a new outer list, but the nested list `[2, 3]` is still aliased). Finally, it proves **deep copying** (`copy.deepcopy()`) clones the list and everything inside it, fully severing the connection.'
              ],
              typeIt: true,
              solution: 'import copy\n\na = [1, [2, 3]]\nb = a\nb.append(4)\nprint(f"a after b mutates: {a}")\n\nc = a[:]\nc.append(5)\nprint(f"a after c appends: {a}")\n\nc[1].append(99)\nprint(f"a after c mutates nested list: {a}")\n\nd = copy.deepcopy(a)\nd[1].append(100)\nprint(f"a after d mutates nested list: {a}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Aliasing vs. copying — the mutation trap — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `names_alias`: A new variable.\n- `= names`: Binds `names_alias` to the exact same list object in memory that `names` points to.\n- `names_alias.append(\'Frank\')`: Mutates the shared list object in place, adding \'Frank\'.\n- `names_copy`: A new variable.\n- `= names.copy()`: Calls the `copy` method on `names` (equivalent to `names[:]` or `list(names)`), returning a shallow copy, and binds it to `names_copy`.\n- `names_copy.append(\'Grace\')`: Mutates the independent copy in place, adding \'Grace\'. The original `names` list is unaffected.',
                '**Expected behavior.** Predicted confidently: `names` will contain `[\'Eve\', \'Alicia\', \'Charlie\', \'Frank\']`. `names_copy` will contain `[\'Eve\', \'Alicia\', \'Charlie\', \'Frank\', \'Grace\']`.',
                '**CS lens.** The CS concept is **Reference Semantics vs Value Semantics**. Variables in Python are labels (references) pointing to objects in memory, not boxes containing values. When you pass a list to a function or assign it to a variable, you pass the memory address (reference), not the data payload. It appears in Java objects, JavaScript objects/arrays, and pointers in C/C++.',
                '**SE lens.** The design principle is **Defensive Copying**. The alternative NOT chosen is passing the mutable reference blindly to a function. The real tradeoff is that defensive copying prevents subtle bugs where a called function unexpectedly ruins the caller\'s data structure, but it incurs a severe performance and memory penalty if the list is large. You copy when mutation is dangerous; you pass the reference when mutation is intended or copying is too slow.'
              ],
              typeIt: true,
              solution: 'names_alias = names\nnames_alias.append(\'Frank\')\nnames_copy = names.copy()\nnames_copy.append(\'Grace\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Lists as stacks and queues',
              prose: [
                'Sometimes you don\'t need a random-access list, but rather a structure that enforces a strict processing order: processing the most recently added task first (LIFO) or processing tasks in the exact order they arrived (FIFO). How can a Python list simulate a stack? Can it simulate a queue efficiently?',
                'Output: ```text Stack pop: B List queue pop(0): A Deque popleft: A ``` This proves that lists act naturally as **stacks** using `append()` and `pop()`. Using a list as a queue by calling `pop(0)` works but is extremely inefficient (O(n)) because all subsequent elements must be shifted left in memory. `collections.deque` provides O(1) performance for both ends.'
              ],
              typeIt: true,
              solution: 'from collections import deque\n\nstack = []\nstack.append(\'A\')\nstack.append(\'B\')\nprint(f"Stack pop: {stack.pop()}")\n\nqueue_bad = [\'A\', \'B\']\nprint(f"List queue pop(0): {queue_bad.pop(0)}")\n\nqueue_good = deque([\'A\', \'B\'])\nqueue_good.append(\'C\')\nprint(f"Deque popleft: {queue_good.popleft()}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Lists as stacks and queues — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from collections import deque`: Imports the `deque` class from the `collections` module.\n- `task_stack = []`: Initializes an empty list to act as a stack.\n- `task_stack.append(\'Task 1\')`: Pushes an item onto the top (end) of the stack.\n- `task_stack.pop()`: Pops and returns the item from the top of the stack.\n- `task_queue = deque()`: Initializes a new, empty double-ended queue.\n- `task_queue.append(\'Job 1\')`: Enqueues an item to the right end of the deque.\n- `task_queue.popleft()`: Dequeues and returns an item from the left end of the deque efficiently.',
                '**Expected behavior.** Predicted confidently: `task_stack` will be empty `[]`. `task_queue` will be an empty `deque([])`.',
                '**CS lens.** The CS concepts are **Time Complexity (Big O Notation)** and **Abstract Data Types (ADTs)**. A Stack and a Queue are ADTs: theoretical models defining behavior (LIFO/FIFO). Arrays and Linked Lists are concrete data structures. Using a dynamic array (Python list) to implement a Stack is O(1) for push/pop. Using it to implement a Queue is O(N) for dequeue (`pop(0)`) because of memory shifting. The `deque` is internally implemented as a doubly-linked list of fixed-size blocks, making ends-operations O(1).',
                '**SE lens.** The design principle is **Choosing the Right Abstraction for Performance**. The alternative NOT chosen is just using `list.pop(0)` everywhere because it\'s technically functional. The real tradeoff is that `pop(0)` works fine for 10 items but grinds the CPU to a halt for 100,000 items, causing a severe performance bottleneck. A professional engineer uses `deque` specifically to guarantee O(1) queue performance, signaling intent to future readers.'
              ],
              typeIt: true,
              solution: 'from collections import deque\n\ntask_stack = []\ntask_stack.append(\'Task 1\')\ntask_stack.pop()\n\ntask_queue = deque()\ntask_queue.append(\'Job 1\')\ntask_queue.popleft()',
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
      'Next lesson: Tuples.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "index"?',
      options: [
        'when two or more variables refer to the exact same object in memory. A change through one alias is visible through all others.',
        'a zero-based integer indicating an element\'s position within a sequence. Used to retrieve or modify specific elements.',
        'an object whose state or contents can be changed after it is created. Mutability requires careful handling to avoid accidental changes to shared data.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "in-place mutation"?',
      options: [
        'modifying an existing object directly rather than creating a new copy with the changes. Operations that mutate in place typically return None in Python.',
        'an object whose state or contents can be changed after it is created. Mutability requires careful handling to avoid accidental changes to shared data.',
        'First-In, First-Out. The first item added is the first one removed.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "slice"?',
      options: [
        'First-In, First-Out. The first item added is the first one removed.',
        'a subset of a sequence, extracted by specifying a start, stop, and optional step index. It creates a new sequence containing the requested elements.',
        'an object whose state or contents can be changed after it is created. Mutability requires careful handling to avoid accidental changes to shared data.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "sequence"?',
      options: [
        'when two or more variables refer to the exact same object in memory. A change through one alias is visible through all others.',
        'a zero-based integer indicating an element\'s position within a sequence. Used to retrieve or modify specific elements.',
        'an ordered collection of elements. A sequence allows access to elements by their integer position.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**mutable** — an object whose state or contents can be changed after it is created. Mutability requires careful handling to avoid accidental changes to shared data.',
    '**sequence** — an ordered collection of elements. A sequence allows access to elements by their integer position.',
    '**index** — a zero-based integer indicating an element\'s position within a sequence. Used to retrieve or modify specific elements.',
    '**slice** — a subset of a sequence, extracted by specifying a start, stop, and optional step index. It creates a new sequence containing the requested elements.',
    '**aliasing** — when two or more variables refer to the exact same object in memory. A change through one alias is visible through all others.',
    '**in-place mutation** — modifying an existing object directly rather than creating a new copy with the changes. Operations that mutate in place typically return None in Python.',
    '**stack** — a data structure that follows the Last-In, First-Out (LIFO) principle, where elements are added and removed from the same end.',
    '**queue** — a data structure that follows the First-In, First-Out (FIFO) principle, where elements are added at one end and removed from the other.',
  ],

  checkpoints: ['read-intuition'],
}
