// cpp-from-scratch — Lesson 20: Iterators and Ranges
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 20 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-20-iterators-and-ranges',
  slug: 'iterators-and-ranges',
  chapter: 3,
  order: 6,
  title: 'Iterators and Ranges',
  subtitle: 'Modern C++ Idioms',
  tags: ['iterator', 'iterator-category', 'iterator-invalidation', 'range', 'view'],

  hook: {
    question: 'What is "Iterators and Ranges", and why does it matter?',
    realWorldContext: 'A set of small console programs that traverse, manipulate, and query standard library containers. This proves that you can write algorithms that operate on data without knowing how that data is stored in memory. The problem this solves is the duplication of effort required to write a new search or sort function for every different data structure.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: The Iterator Abstraction, Iterator Categories, Iterator Invalidation, C++20 Ranges and Views.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Iterator:** an object that points to an element inside a container and knows how to move to the next element. It exists to provide a uniform, standardized way to traverse fundamentally different data structures (like contiguous arrays versus node-based linked lists) using the exact same syntax.\n- **Iterator Category:** a classification of what an iterator is computationally capable of doing (e.g., moving forward only, moving backward, or jumping directly to any index). It exists to prevent you from accidentally using an inefficient algorithm on a data structure that doesn\'t support it (like trying to binary-search a linked list).\n- **Iterator Invalidation:** the silent corruption of an iterator when the underlying container changes its memory layout. It exists because iterators are often implemented as raw memory pointers under the hood; if a container resizes and moves its data to a new location in RAM, the old iterators are left pointing at abandoned memory.\n- **Range:** a C++20 abstraction that represents an iterable sequence by bundling its beginning and end together into a single object. It exists to eliminate the verbosity and error-proneness of always having to pass separate begin() and end() iterators to every algorithm.\n- **View:** a lightweight, non-owning range that transforms or filters underlying data on-the-fly. It exists to allow declarative data pipelines (like filtering and mapping) to execute lazily with zero memory allocation overhead, processing elements only as they are requested.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::vector::begin / std::vector::end:** Methods that return iterators to the start and one-past-the-end of a vector sequence.\n- **std::list:** A doubly-linked list container.\n- **std::views::filter:** A C++20 range adaptor that produces a view containing only elements that satisfy a given predicate.\n- **std::views::transform:** A C++20 range adaptor that applies a transformation function to every element in a sequence.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A single program demonstrating iterator manipulation, the danger of invalidation, and resolving it elegantly with modern C++ ranges. ```cpp #include <iostream> #include <vector> #include <ranges> #include <algorithm> int main() { std::vector<int> data = {1, 5, 2, 8, 3}; // 1. Classic Iterator usage: find an element auto it = std::find(data.begin(), data.end(), 2); if (it != data.end()) { std::cout << "Found: " << *it << "\\n"; } // 2. The Danger: Invalidation // We hold \'it\' pointing to \'2\'. Let\'s trigger a resize. data.reserve(100); // \'it\' is now invalid! We must not dereference it. // We must re-aquire the iterator if we want to use it again. it = std::find(data.begin(), data.end(), 2); // 3. The Modern Solution: Ranges // Instead of raw iterators and risking invalidation, we process declaratively. auto greater_than_two = data | std::views::filter([](int n) { return n > 2; }); std::cout << "Modern processing: "; for (int val : greater_than_two) { std::cout << val << " "; } std::cout << "\\n"; return 0; } ``` 1. **`std::find(data.begin(), data.end(), 2)`**: The classic C++ algorithm demands a `begin` and `end` iterator, returning an iterator pointing to the element `2`. 2. **`data.reserve(100)`**: Forces a massive reallocation. The pointer inside `it` is now dangling. 3. **`it = std::find(...)`**: To safely access `2` again, the manual search must be repeated to get a fresh, valid iterator in the new memory block. 4. **`data | std::views::filter(...)`**: Modern ranges abstract away the explicit iterator handling. When the loop executes, the view safely queries the current `data.begin()` and `data.end()` internally, insulating you from manual dangling pointer mechanics.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Attempting to apply an algorithm meant for random-access sequences onto a container that only supports bidirectional movement. \n\n```cpp\n#include <iostream>\n#include <list>\n#include <algorithm>\n\nint main() {\n    std::list<int> lst = {5, 2, 9, 1, 6};\n\n    // This will completely fail to compile.\n    std::sort(lst.begin(), lst.end());\n\n    return 0;\n}\n```\n\n**The Error:** A massive template compilation error, often hundreds of lines long, containing something like: `error: no match for \'operator-\' (operand types are \'std::_List_iterator<int>\' and \'std::_List_iterator<int>\')` **The Fix:** Understand iterator categories. `std::sort` requires jumping around memory (`operator-`, `operator+`), which `std::list` does not support. You must either use a `std::vector`, or use the list\'s own specialized sorting method: \n\n```cpp\n    lst.sort(); // Compiles and works, because it uses a linked-list-specific algorithm internally.\n```',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Reverse Traversal:** Use a classic `for` loop, but instead of `.begin()` and `.end()`, use `.rbegin()` and `.rend()` on a `std::vector<int>`. Notice how `++it` moves *backwards* conceptually when using reverse iterators.\n- **The View Chain:** Create a `std::vector<std::string> = {"a", "abc", "de", "fghi"}`. Use `std::views::filter` to keep only strings longer than 2 characters. Print the results.\n- **Provoke Invalidation:** Write a loop that uses an iterator to step through a vector. Inside the loop body, call `push_back`. Run the program and observe the crash (or infinite loop) caused by modifying a container while actively traversing it.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You can write a manual loop utilizing `begin()`, `end()`, `++it`, and `*it`.\n- [ ] You can explain why `std::vector` allows `it += 5` but `std::list` does not.\n- [ ] You understand that `push_back` on a vector can destroy the validity of all existing iterators pointing to it.\n- [ ] You can pipe a vector through a `std::views::filter` to process it lazily.\n- [ ] You can explain the relationship between an iterator and a C++20 range.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 20: Iterators and Ranges',
        caption: 'Iterators and Ranges',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Iterator Abstraction',
              prose: [
                'If you write a loop using an integer index `for (int i = 0; i < size; ++i)`, it works perfectly for a `std::vector` because vectors are contiguous blocks of memory that support direct indexing (`v[i]`). But if you switch your container to a `std::set` or a `std::list`, indexing with `[i]` no longer exists. You need a way to point to an element and say "give me the next one," regardless of how the container is physically built in memory.',
                '## How the Code Works',
                '- `#include <vector>`: Provides the standard vector container, which internally defines its own `iterator` type.\n- `std::vector<int>::iterator it = numbers.begin();`: Declares a variable `it` of the specific iterator type nested inside `std::vector<int>`. It is initialized by calling `.begin()`, which returns an iterator pointing to the very first element (`10`).\n- `it != numbers.end();`: The loop continuation condition. `.end()` does *not* point to the last element (`30`). It points to the imaginary slot exactly one position *past* the last element. This forms a half-open range `[begin, end)`. When `it` reaches `.end()`, the sequence is completely finished.\n- `++it`: The increment operator. For an iterator, this means "execute whatever pointer math or node-traversal logic is necessary to arrive at the next element in this specific data structure." For a vector, it advances a pointer; for a tree, it traverses pointers to find the next in-order node.\n- `*it`: The dereference operator. An iterator acts like a pointer. To access the actual integer value sitting at that location, you must dereference it using the `*` symbol.',
                '**CS lens.** This is the Iterator pattern. It decouples algorithms from data structures. By establishing a standard contract (must implement `++`, `*`, `==`, `!=`), any generic algorithm can process any container. Real-world equivalent: a bookmark in a book. The bookmark tracks your current position, you read the text on the page (`*it`), and you move it to the next page (`++it`), without needing to know how the book\'s spine is bound.',
                '**SE lens.** Uniformity at the cost of verbosity. The alternative is rewriting loops specific to every container type. The cost of this abstraction in modern C++ is exactly zero at runtime — the compiler aggressively inlines iterator operations, turning `std::vector::iterator` math into identical assembly instructions as raw pointer arithmetic. The developer experience cost is verbosity, which is why `auto` and range-based for loops were eventually introduced to hide the raw `begin()` and `end()` mechanics.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> numbers = {10, 20, 30};\n\n    // Manual iterator loop\n    for (std::vector<int>::iterator it = numbers.begin(); it != numbers.end(); ++it) {\n        std::cout << *it << " ";\n    }\n    std::cout << "\\n";\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Iterator Categories',
              prose: [
                'Not all collections are physically capable of the same movements. If you want to jump immediately to the middle element of a sequence, an array can calculate that memory address instantly. A doubly-linked list cannot; it must walk node by node. If the language allowed you to write `it = it + 5` on a linked list iterator, it would either fail to compile, or it would silently hide a highly inefficient `O(N)` traversal behind a deceptively fast-looking `+` operator.',
                '## How the Code Works',
                '- `std::list<int> lst = {1, 2, 3, 4, 5};`: Creates a doubly-linked list. Its elements are allocated in scattered locations in memory, connected by pointers.\n- `auto vec_it = vec.begin();`: `auto` deduces `std::vector<int>::iterator`. This is a **Random-Access Iterator**.\n- `auto lst_it = lst.begin();`: `auto` deduces `std::list<int>::iterator`. This is a **Bidirectional Iterator**.\n- `vec_it += 3;`: Compiles and executes in `O(1)` time. Because vectors are contiguous in memory, the iterator simply adds `3 * sizeof(int)` to its internal pointer to land directly on `4`.\n- `++lst_it; --lst_it;`: Bidirectional iterators support stepping forward one-by-one (`++`) and stepping backward one-by-one (`--`).\n- `lst_it += 3;` (commented out): If uncommented, this triggers a compilation error. `std::list` explicitly refuses to implement the `+=` operator for its iterators. C++ deliberately enforces this constraint so you cannot accidentally write an `O(N)` operation using syntax that implies `O(1)` cost.',
                '**CS lens.** Iterators are organized into a strict hierarchy of capabilities. - **Input/Output Iterators**: Can only move forward, can only read/write an element exactly once (like a stream of data from a network socket). - **Forward Iterators**: Can only move forward, but can read the same element multiple times (like a singly-linked list). - **Bidirectional Iterators**: Can move forward and backward (like a doubly-linked list). - **Random-Access Iterators**: Can jump by arbitrary offsets instantly (like an array). Algorithms demand specific categories. `std::sort` requires Random-Access Iterators; you cannot `std::sort` a `std::list`.',
                '**SE lens.** Performance honesty by design. By refusing to provide `+=` on a list iterator, the C++ standard library forces you to acknowledge that jumping ahead is expensive. If you truly need to advance a list iterator by 3, you must use `std::advance(lst_it, 3)`, which clearly signals that a mechanical sequence of steps is taking place.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <list>\n\nint main() {\n    std::vector<int> vec = {1, 2, 3, 4, 5};\n    std::list<int> lst = {1, 2, 3, 4, 5};\n\n    auto vec_it = vec.begin();\n    auto lst_it = lst.begin();\n\n    // Random-access movement (valid for vector)\n    vec_it += 3;\n    std::cout << "Vector element: " << *vec_it << "\\n";\n\n    // Bidirectional movement (valid for list)\n    ++lst_it;\n    ++lst_it;\n    --lst_it;\n    std::cout << "List element: " << *lst_it << "\\n";\n\n    // Uncommenting this line causes a massive compiler error:\n    // lst_it += 3; \n\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Iterator Invalidation',
              prose: [
                'When you store an iterator, you are often holding a raw memory pointer. If the container holding the data decides it needs to resize and move its memory elsewhere, your iterator does not get automatically updated. It is left pointing at abandoned, unmapped memory, resulting in silent corruption or fatal crashes if used.',
                '## How the Code Works',
                '- `auto first_it = numbers.begin();`: Captures an iterator pointing to the memory address where the integer `10` currently lives.\n- `numbers.push_back(i);`: Runs 1,000 times. A `std::vector` stores elements in a single contiguous block of memory. When that block fills up, the vector must allocate a brand new, larger block of memory elsewhere, copy all the old elements over, and delete the original block.\n- `std::cout << "After: " << *first_it`: Because the vector moved its data to a new neighborhood in RAM, the memory address stored inside `first_it` was deallocated. Dereferencing it is Undefined Behavior. It might print garbage, it might crash, or it might print `10` purely by accident if the operating system hasn\'t overwritten that RAM yet.',
                '**CS lens.** This is the classic dangling pointer problem, disguised behind the safer-looking name "iterator." Iterators are not magical tracking references; they are dumb structural markers. When the structure moves, the marker becomes a landmine.',
                '**SE lens.** Memory management requires manual vigilance. The alternative (found in languages like Java or C#) is having a garbage collector and object references that transparently handle movement. In C++, performance is prioritized: tracking every active iterator and updating them when a vector resizes would introduce massive overhead. The tradeoff is that the developer assumes 100% of the responsibility for knowing exactly which operations (like `push_back`, `insert`, `erase`) invalidate iterators for specific containers, by checking the C++ documentation.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> numbers = {10, 20, 30};\n    \n    // Grab an iterator pointing to the first element\n    auto first_it = numbers.begin();\n    \n    std::cout << "Before: " << *first_it << "\\n";\n\n    // Force the vector to reallocate by pushing many elements\n    for(int i = 0; i < 1000; ++i) {\n        numbers.push_back(i);\n    }\n\n    // DANGER: first_it is now invalid!\n    // Dereferencing it is Undefined Behavior.\n    std::cout << "After: " << *first_it << "\\n";\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'C++20 Ranges and Views',
              prose: [
                'Passing `container.begin()` and `container.end()` to every single algorithm is tedious and prone to typos (like mixing up the `end()` of one container with the `begin()` of another). Furthermore, if you want to filter a container and then transform the results, doing it with raw algorithms forces you to allocate temporary intermediate containers to hold the steps, wasting memory and CPU cycles.',
                '## How the Code Works',
                '- `#include <ranges>`: Imports the C++20 ranges library, which provides abstractions that treat entire containers as single sequence objects.\n- `numbers | std::views::filter(...)`: The `|` operator is overloaded to behave like a Unix pipe. Instead of passing `begin()` and `end()`, you pass the entire `numbers` container into `std::views::filter`.\n- `[](int n) { return n % 2 == 0; }`: A lambda predicate. `filter` evaluates this and logically drops any odd numbers. It does not delete them from `numbers`; it simply skips over them when iterated.\n- `| std::views::transform(...)`: Pipes the filtered results directly into a transformation. The lambda multiplies the surviving numbers by `10`.\n- `auto pipeline`: The result is a highly complex, nested view type computed by the compiler. It does absolutely no work yet. It is entirely lazy. It has not filtered or transformed a single integer at this line.\n- `for (int result : pipeline)`: The range-based for loop demands elements one by one. Only now does the pipeline pull the integer `1`, see it fail the filter, pull `2`, see it pass, transform it to `20`, and hand it to the loop.',
                '**CS lens.** This is Lazy Evaluation and Declarative Functional Programming. Instead of writing imperative loops that execute immediately, you are constructing a state machine. Real-world equivalent: assembling a factory assembly line. Building the conveyor belts and stations (the views) does nothing. Turning on the power and feeding the first raw material down the line (the `for` loop) causes the work to actually happen on demand.',
                '**SE lens.** Zero-allocation data pipelines. The alternative is creating a `temp_vector`, copying the even numbers into it, then iterating `temp_vector` to multiply by 10 and printing. `std::views` completely eliminates the temporary memory allocations. The cost is slightly longer compile times and significantly more complex error messages if you misconfigure the pipeline, as the underlying nested template types are massive.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <ranges>\n\nint main() {\n    std::vector<int> numbers = {1, 2, 3, 4, 5, 6};\n\n    // A declarative pipeline using C++20 views\n    auto pipeline = numbers \n        | std::views::filter([](int n) { return n % 2 == 0; })\n        | std::views::transform([](int n) { return n * 10; });\n\n    // The views execute lazily only when we iterate\n    for (int result : pipeline) {\n        std::cout << result << " ";\n    }\n    std::cout << "\\n";\n\n    return 0;\n}',
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
      'Next lesson: const Correctness.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Iterator"?',
      options: [
        'an object that points to an element inside a container and knows how to move to the next element. It exists to provide a uniform, standardized way to traverse fundamentally different data structures (like contiguous arrays versus node-based linked lists) using the exact same syntax.',
        'the silent corruption of an iterator when the underlying container changes its memory layout. It exists because iterators are often implemented as raw memory pointers under the hood; if a container resizes and moves its data to a new location in RAM, the old iterators are left pointing at abandoned memory.',
        'a lightweight, non-owning range that transforms or filters underlying data on-the-fly. It exists to allow declarative data pipelines (like filtering and mapping) to execute lazily with zero memory allocation overhead, processing elements only as they are requested.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Range"?',
      options: [
        'the silent corruption of an iterator when the underlying container changes its memory layout. It exists because iterators are often implemented as raw memory pointers under the hood; if a container resizes and moves its data to a new location in RAM, the old iterators are left pointing at abandoned memory.',
        'a classification of what an iterator is computationally capable of doing (e.g., moving forward only, moving backward, or jumping directly to any index). It exists to prevent you from accidentally using an inefficient algorithm on a data structure that doesn\'t support it (like trying to binary-search a linked list).',
        'a C++20 abstraction that represents an iterable sequence by bundling its beginning and end together into a single object. It exists to eliminate the verbosity and error-proneness of always having to pass separate begin() and end() iterators to every algorithm.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Iterator Invalidation"?',
      options: [
        'an object that points to an element inside a container and knows how to move to the next element. It exists to provide a uniform, standardized way to traverse fundamentally different data structures (like contiguous arrays versus node-based linked lists) using the exact same syntax.',
        'the silent corruption of an iterator when the underlying container changes its memory layout. It exists because iterators are often implemented as raw memory pointers under the hood; if a container resizes and moves its data to a new location in RAM, the old iterators are left pointing at abandoned memory.',
        'a classification of what an iterator is computationally capable of doing (e.g., moving forward only, moving backward, or jumping directly to any index). It exists to prevent you from accidentally using an inefficient algorithm on a data structure that doesn\'t support it (like trying to binary-search a linked list).'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Iterator Category"?',
      options: [
        'a lightweight, non-owning range that transforms or filters underlying data on-the-fly. It exists to allow declarative data pipelines (like filtering and mapping) to execute lazily with zero memory allocation overhead, processing elements only as they are requested.',
        'a classification of what an iterator is computationally capable of doing (e.g., moving forward only, moving backward, or jumping directly to any index). It exists to prevent you from accidentally using an inefficient algorithm on a data structure that doesn\'t support it (like trying to binary-search a linked list).',
        'the silent corruption of an iterator when the underlying container changes its memory layout. It exists because iterators are often implemented as raw memory pointers under the hood; if a container resizes and moves its data to a new location in RAM, the old iterators are left pointing at abandoned memory.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Iterator** — an object that points to an element inside a container and knows how to move to the next element. It exists to provide a uniform, standardized way to traverse fundamentally different data structures (like contiguous arrays versus node-based linked lists) using the exact same syntax.',
    '**Iterator Category** — a classification of what an iterator is computationally capable of doing (e.g., moving forward only, moving backward, or jumping directly to any index). It exists to prevent you from accidentally using an inefficient algorithm on a data structure that doesn\'t support it (like trying to binary-search a linked list).',
    '**Iterator Invalidation** — the silent corruption of an iterator when the underlying container changes its memory layout. It exists because iterators are often implemented as raw memory pointers under the hood; if a container resizes and moves its data to a new location in RAM, the old iterators are left pointing at abandoned memory.',
    '**Range** — a C++20 abstraction that represents an iterable sequence by bundling its beginning and end together into a single object. It exists to eliminate the verbosity and error-proneness of always having to pass separate begin() and end() iterators to every algorithm.',
    '**View** — a lightweight, non-owning range that transforms or filters underlying data on-the-fly. It exists to allow declarative data pipelines (like filtering and mapping) to execute lazily with zero memory allocation overhead, processing elements only as they are requested.',
  ],

  checkpoints: ['read-intuition'],
}
