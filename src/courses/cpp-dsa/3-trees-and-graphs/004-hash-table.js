// cpp-dsa — Lesson 12: Hash Table
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 12 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-12-hash-table',
  slug: 'hash-table',
  chapter: 3,
  order: 4,
  title: 'Hash Table',
  subtitle: 'Trees, Heaps, and Graphs',
  tags: ['hash-function', 'collision', 'separate-chaining', 'load-factor', 'rehashing'],

  hook: {
    question: 'What is "Hash Table", and why does it matter?',
    realWorldContext: 'You will build a custom hash table from scratch that stores key-value pairs. By implementing the internal bucket array, collision resolution, and automatic resizing, you will solve the transferable problem of achieving near-instant (O(1)) data lookups regardless of how large a dataset grows.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: Hash Functions, Collisions and Separate Chaining, Load Factor and Rehashing, std::unordered_map.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Hash function:** A mathematical algorithm that maps data of arbitrary size (like a text string) to a fixed-size integer. It exists To compute a direct array index for a given key, bypassing the need to search through elements sequentially.\n- **Collision:** An event where a hash function assigns the exact same integer index to two completely different keys. It exists Because the range of possible keys (like all possible words) is infinitely larger than the fixed number of buckets in memory, forcing overlap (the Pigeonhole Principle).\n- **Separate chaining:** A collision resolution strategy where each bucket in the array holds a list of items rather than a single item. It exists To ensure that when two distinct keys hash to the same bucket, both can be saved without one overwriting the other.\n- **Load factor:** The ratio of stored elements to total available buckets in a hash table (elements / buckets). It exists To serve as a metric for when the table is getting too crowded and needs to be expanded to maintain fast lookups.\n- **Rehashing:** The process of allocating a larger array and re-calculating the bucket index for every existing element. It exists Because as the array grows, the modulo math used to assign indices changes; old elements must be moved to their new, correct buckets to be found again.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **Everything else in the file, not this lesson\'s subject but still explained::** A dynamic array that can grow in size.\n- **std::pair&lt;T1, T2&gt;:** A simple struct that bundles two values of potentially different types together.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Trace an insertion through the `std::unordered_map`. When you write `dictionary["cherry"] = 3;`, the map feeds `"cherry"` into `std::hash<std::string>`, producing a massive, highly uniform integer. It modulo-divides this integer by `dictionary.bucket_count()` to find the exact array slot. It jumps instantly to that slot. If the slot is empty, it stores it. If a collision occurred, it uses separate chaining to append it to the list. Finally, it recalculates `dictionary.load_factor()`. If that decimal exceeds `dictionary.max_load_factor()`, it allocates a new array twice as large and recalculates the modulo math for every single item, maintaining O(1) performance forever.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you disable rehashing by setting an impossibly high load factor, performance will collapse. Modify `stl_hash.cpp` to insert thousands of items into a constrained bucket array: \n\n```cpp\ndictionary.max_load_factor(10000.0f);\nfor (int i = 0; i < 50000; i++) {\n    dictionary[std::to_string(i)] = i;\n}\n```\n\nBecause the map is forbidden from expanding, all `50,000` items are forced into the tiny default allocation of buckets. Collisions become practically guaranteed. The separate chains grow thousands of links long. When you look up a value, the hash table is forced to linearly scan a massive list, completely destroying the O(1) speed benefit and dragging your program to a halt.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Collision Counting:** Add an `int collisionCount = 0;` member to our custom `HashTable`. Inside the `insert` method, increment it specifically when `buckets[index]` is not empty before pushing back. Print it in `main` to see how many overlaps occurred.\n- **Standard Library Probing:** Write a program using `std::unordered_map` that inserts elements in a loop. Inside the loop, print the `bucket_count()` and `load_factor()`. Watch the exact moment the bucket count doubles.\n- **Worst Case Hash:** Modify our custom `hash` method to simply `return 0;` no matter what string is passed. Insert ten words. Write out what this mathematically forces the separate chaining vector to look like, and what the lookup time complexity becomes.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run a custom hash function that maps strings to numbers.\n- [ ] You have observed a mathematical collision where two keys share an index.\n- [ ] You have implemented separate chaining to safely store overlapping keys.\n- [ ] You have traced the rehashing logic that prevents chains from growing infinitely.\n- [ ] You can explain out loud what a load factor represents.\n- [ ] You have configured and queried `std::unordered_map` in the C++ standard library.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 12: Hash Table',
        caption: 'Hash Table',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Hash Functions',
              prose: [
                'Looking up a value in a standard array or vector takes O(N) time if we have to check every element sequentially. We want O(1) instant lookup, which is only possible if we know the exact array index where the data lives. But our keys are strings (like `"Alice"`), not integers. We need a mechanism to reliably convert a string into a valid array index.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <string>\n\nint convertToNumber(const std::string& key) {\n    int sum = 0;\n    for (char c : key) {\n        sum = sum + c;\n    }\n    return sum % 10;\n}\n\nint main() {\n    std::cout << "Index for \'dog\': " << convertToNumber("dog") << "\\n";\n    std::cout << "Index for \'cat\': " << convertToNumber("cat") << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `class HashTable`: Declares a new blueprint for our custom data structure. A class encapsulates data and the logic that operates on it.\n- `private:`: An access modifier. It strictly hides the `hash` method from the outside world; code using `HashTable` will never call `hash()` directly, because indexing is an internal implementation detail.\n- `int hash(const std::string& key, int numBuckets)`: A method that takes a read-only reference to a string (`key`) and the total number of available slots (`numBuckets`), returning an integer.\n- `int sum = 0;`: Declares a local integer variable initialized to zero, which will act as an accumulator.\n- `for (char c : key)`: A range-based loop. It automatically extracts each character from the string `key` one by one, placing it into the local variable `c` for the loop body.\n- `sum += c;`: Adds the numeric ASCII value of the character `c` to `sum`. For example, `\'A\'` has an ASCII value of `65`.\n- `return sum % numBuckets;`: The modulo operator `%` divides `sum` by `numBuckets` and returns only the remainder. Because the remainder of division by `N` is mathematically guaranteed to be between `0` and `N - 1`, this ensures the resulting index perfectly fits within our array bounds.',
                '**CS lens.** A good hash function must possess two properties: **Determinism** (the same input must always produce the exact same output, otherwise you can never find your data again) and **Uniformity** (it should spread inputs evenly across all available buckets to avoid crowding). The simple sum function above is deterministic, but its uniformity is poor.',
                '**SE lens.** The alternative not chosen is a cryptographically secure hash function like SHA-256. The tradeoff here is speed versus security. Cryptographic hashes deliberately consume heavy CPU cycles to be mathematically irreversible and collision-resistant. A data structure hash function must be lightning-fast above all else, because it runs on every single insertion and lookup; reversibility does not matter for an array index. ---'
              ],
              typeIt: true,
              solution: '#include <string>\n\nclass HashTable {\nprivate:\n    int hash(const std::string& key, int numBuckets) {\n        int sum = 0;\n        for (char c : key) {\n            sum += c;\n        }\n        return sum % numBuckets;\n    }\n};',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Collisions and Separate Chaining',
              prose: [
                'If our hash function only produces numbers from `0` to `9`, what happens when we insert eleven items? The Pigeonhole Principle dictates that at least two items must be assigned the same index. Even with fewer items, the Birthday Problem proves that random distributions cause overlaps astonishingly early. If two completely different keys hash to the same index, a standard array will overwrite the first item with the second. We need a way to store multiple items at the identical array index safely.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <string>\n\nint simpleHash(const std::string& key) {\n    int sum = 0;\n    for (char c : key) sum += c;\n    return sum % 10;\n}\n\nint main() {\n    std::cout << "act: " << simpleHash("act") << "\\n";\n    std::cout << "cat: " << simpleHash("cat") << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <vector>` and `#include <utility>`: Brings in the standard library definitions for the dynamic array (`std::vector`) and the two-item struct (`std::pair`).\n- `std::vector<std::vector<std::pair<std::string, int>>> buckets;`: Declares a vector where every element is *itself* a vector holding `std::pair`s. The outer vector represents the slots in the table. The inner vector represents the "chain" of items stored at a specific slot.\n- `public:`: An access modifier. Methods below this are exposed and callable by code outside the class.\n- `HashTable(int size)`: The constructor. It automatically runs when a new `HashTable` object is created, taking the desired initial size.\n- `buckets.resize(size);`: Calls the `resize` method on the outer vector, allocating exactly `size` empty inner vectors so our modulo hash function will not go out of bounds.\n- `void insert(const std::string& key, int value)`: A method that takes a key and a value to store in the table.\n- `int index = hash(key, buckets.size());`: Calls our private hash function, dynamically passing the current size of the outer vector, and stores the resulting integer.\n- `for (auto& pair : buckets[index])`: A range-based loop over the inner vector located at `buckets[index]`. It uses `auto&` to deduce the type as a reference to a `std::pair`. Taking it by reference means modifications to `pair` will alter the actual item inside the vector, not a copy.\n- `if (pair.first == key)`: `pair.first` accesses the string key stored in the struct. This checks if the exact key already exists in this chain.\n- `pair.second = value;`: `pair.second` accesses the integer value. If the key exists, this updates its associated value (e.g., replacing Alice\'s old score with a new score).\n- `return;`: Immediately halts the `insert` method, because the update is complete.\n- `buckets[index].push_back({key, value});`: If the loop finishes without finding the key, this constructs a new `std::pair` and appends it to the end of the inner vector at `buckets[index]`.',
                '**CS lens.** This collision strategy is called **Separate Chaining**. Because buckets hold collections rather than single items, the table never strictly runs out of room. The actual data lives in the chains, and the array simply acts as a directory of starting points.',
                '**SE lens.** The alternative not chosen is **Open Addressing**. In open addressing, the table remains a single flat array with no inner vectors. If a collision occurs, the algorithm simply steps forward to the next empty adjacent slot (probing). The tradeoff: Open addressing avoids the memory overhead of inner vectors and pointers, making it exceptionally cache-friendly for the CPU. However, it requires complex deletion logic (using "tombstone" markers) and catastrophic failure occurs if the array fills completely. Separate chaining is far simpler to implement and degrades gracefully under heavy load. ---'
              ],
              typeIt: true,
              solution: '#include <vector>\n#include <utility>\n\n    std::vector<std::vector<std::pair<std::string, int>>> buckets;\n\n    HashTable(int size) {\n        buckets.resize(size);\n    }\n\n    void insert(const std::string& key, int value) {\n        int index = hash(key, buckets.size());\n        \n        for (auto& pair : buckets[index]) {\n            if (pair.first == key) {\n                pair.second = value;\n                return;\n            }\n        }\n        buckets[index].push_back({key, value});\n    }',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Load Factor and Rehashing',
              prose: [
                'If we create a table with `10` buckets and insert `1000` items, separate chaining guarantees all items are saved. But each bucket\'s inner vector will now hold roughly `100` items. Finding an item requires computing the hash (fast), and then sequentially scanning a list of 100 items (slow). Our O(1) performance has collapsed into O(N). We must measure how crowded the table is, and if it exceeds a threshold, allocate a larger array and redistribute everything.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nvoid evaluateLoad(int elements, int buckets) {\n    float loadFactor = (float)elements / buckets;\n    std::cout << "Load factor: " << loadFactor << "\\n";\n    if (loadFactor > 0.75f) {\n        std::cout << "Too crowded! Must expand.\\n";\n    }\n}\n\nint main() {\n    evaluateLoad(8, 10);\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `int numElements = 0;`: A private integer tracking the total number of items stored across all chains combined.\n- `float loadFactor = (float)(numElements + 1) / buckets.size();`: Casts the sum to a `float` to force floating-point division. Without `(float)`, C++ would perform integer division, discarding the decimal and returning exactly `0` until the table is 100% full.\n- `if (loadFactor > 0.75f)`: The `f` suffix denotes a float literal. If the ratio exceeds 75%, we call `rehash()`.\n- `void rehash()`: A private method that handles the complex expansion logic.\n- `std::vector<...> oldBuckets = buckets;`: Creates a full, deep copy of the entire existing bucket array, preserving all our currently stored data safely.\n- `buckets.clear();`: Calls `clear` on the original vector, wiping out all inner chains and dropping its internal size to zero.\n- `buckets.resize(oldBuckets.size() * 2);`: Re-allocates the vector to be exactly twice as large as it was before.\n- `numElements = 0;`: Resets our global tracker to zero, because the subsequent re-insertions will artificially increment it back up to its true value.\n- `for (const auto& chain : oldBuckets)`: A loop traversing the saved copy of the outer array. `chain` represents one inner vector.\n- `for (const auto& pair : chain)`: A nested loop traversing the inner vector.\n- `insert(pair.first, pair.second);`: Recursively calls our own `insert` method. Because `buckets.size()` has doubled, the `hash` function will compute entirely new indices, moving old items into new homes perfectly distributed across the larger space.\n- `numElements++;`: At the very end of `insert`, increments our global tracker to account for the newly added item.',
                '**CS lens.** This is **Amortized Constant Time**. A single `insert` is normally O(1). But when rehashing triggers, that specific `insert` suddenly costs O(N) as the entire structure rearranges itself. Because we double the array size, rehashing happens exponentially less often as the table grows. When averaged out across thousands of operations, the cost per insertion remains mathematically O(1).',
                '**SE lens.** The 0.75 load factor threshold is an engineered tradeoff. A threshold of 0.9 saves maximum memory but allows chains to get dangerously long, slowing lookups. A threshold of 0.4 keeps chains virtually empty for instant lookups but aggressively wastes memory with allocated, unused vectors. The industry standard default for most languages is 0.75, balancing space and speed perfectly. ---'
              ],
              typeIt: true,
              solution: '    int numElements = 0;\n\n    void rehash() {\n        std::vector<std::vector<std::pair<std::string, int>>> oldBuckets = buckets;\n        buckets.clear();\n        buckets.resize(oldBuckets.size() * 2);\n        numElements = 0;\n        \n        for (const auto& chain : oldBuckets) {\n            for (const auto& pair : chain) {\n                insert(pair.first, pair.second);\n            }\n        }\n    }',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'std::unordered_map',
              prose: [
                'Writing a custom hash table, managing its inner vectors, manually tracking the element count, and computing load factors by hand is error-prone and tedious. For production software, you need a pre-built, heavily optimized container that implements hashing, chaining, and automatic rehashing invisibly.',
                '## How the Code Works',
                '- `#include <unordered_map>`: Brings in the definition for the standard library\'s hash table.\n- `std::unordered_map<std::string, int> dictionary;`: Instantiates the map. The first template type (`std::string`) is the Key, and the second (`int`) is the Value. It uses an internal hashing algorithm specifically optimized for strings.\n- `dictionary.max_load_factor(0.5f);`: Calls a method configuring the map\'s internal threshold. Here we lower it to `0.5`, forcing the map to rehash and expand sooner than its default (which is usually 1.0 in standard C++ implementations) to strictly minimize collisions at the cost of more memory.\n- `dictionary["cherry"] = 3;`: The `[]` operator searches the map for `"cherry"`. Because it does not exist, the map automatically computes the hash, allocates space in the correct bucket, and stores the value `3`.\n- `dictionary.load_factor()`: Calls a method returning the current ratio of elements to buckets.\n- `dictionary.bucket_count()`: Calls a method returning the raw number of array slots currently allocated internally.\n- `dictionary["cherry"]`: Calls the `[]` operator again. This time it finds the key immediately via its hash and returns the stored integer.',
                '**CS lens.** The C++ Standard Library explicitly dictates that `std::unordered_map` must provide average constant-time O(1) complexity for search, insertion, and removal. While implementations vary by compiler (GCC vs Clang vs MSVC), they universally use separate chaining to achieve this, just as we built.',
                '**SE lens.** The alternative not chosen is `std::map`. The tradeoff here is hashing versus sorting. `std::map` does not use a hash function at all; it uses a binary search tree to keep all keys perfectly sorted alphabetically. You choose `std::unordered_map` when raw lookup speed is paramount; you choose `std::map` when you must iterate over the keys in sorted order, accepting O(log N) lookup times. ---'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <unordered_map>\n#include <string>\n\nint main() {\n    std::unordered_map<std::string, int> dictionary;\n    \n    dictionary.max_load_factor(0.5f);\n    \n    dictionary["cherry"] = 3;\n    dictionary["apple"] = 1;\n    dictionary["banana"] = 2;\n    \n    std::cout << "Current load factor: " << dictionary.load_factor() << "\\n";\n    std::cout << "Total buckets allocated: " << dictionary.bucket_count() << "\\n";\n    std::cout << "Value for cherry: " << dictionary["cherry"] << "\\n";\n    \n    return 0;\n}',
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
      'Next lesson: Graph Fundamentals.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Separate chaining"?',
      options: [
        'The process of allocating a larger array and re-calculating the bucket index for every existing element. It exists Because as the array grows, the modulo math used to assign indices changes; old elements must be moved to their new, correct buckets to be found again.',
        'The ratio of stored elements to total available buckets in a hash table (elements / buckets). It exists To serve as a metric for when the table is getting too crowded and needs to be expanded to maintain fast lookups.',
        'A collision resolution strategy where each bucket in the array holds a list of items rather than a single item. It exists To ensure that when two distinct keys hash to the same bucket, both can be saved without one overwriting the other.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Rehashing"?',
      options: [
        'An event where a hash function assigns the exact same integer index to two completely different keys. It exists Because the range of possible keys (like all possible words) is infinitely larger than the fixed number of buckets in memory, forcing overlap (the Pigeonhole Principle).',
        'A collision resolution strategy where each bucket in the array holds a list of items rather than a single item. It exists To ensure that when two distinct keys hash to the same bucket, both can be saved without one overwriting the other.',
        'The process of allocating a larger array and re-calculating the bucket index for every existing element. It exists Because as the array grows, the modulo math used to assign indices changes; old elements must be moved to their new, correct buckets to be found again.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Collision"?',
      options: [
        'An event where a hash function assigns the exact same integer index to two completely different keys. It exists Because the range of possible keys (like all possible words) is infinitely larger than the fixed number of buckets in memory, forcing overlap (the Pigeonhole Principle).',
        'A mathematical algorithm that maps data of arbitrary size (like a text string) to a fixed-size integer. It exists To compute a direct array index for a given key, bypassing the need to search through elements sequentially.',
        'The process of allocating a larger array and re-calculating the bucket index for every existing element. It exists Because as the array grows, the modulo math used to assign indices changes; old elements must be moved to their new, correct buckets to be found again.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Load factor"?',
      options: [
        'The ratio of stored elements to total available buckets in a hash table (elements / buckets). It exists To serve as a metric for when the table is getting too crowded and needs to be expanded to maintain fast lookups.',
        'An event where a hash function assigns the exact same integer index to two completely different keys. It exists Because the range of possible keys (like all possible words) is infinitely larger than the fixed number of buckets in memory, forcing overlap (the Pigeonhole Principle).',
        'The process of allocating a larger array and re-calculating the bucket index for every existing element. It exists Because as the array grows, the modulo math used to assign indices changes; old elements must be moved to their new, correct buckets to be found again.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Hash function** — A mathematical algorithm that maps data of arbitrary size (like a text string) to a fixed-size integer. It exists To compute a direct array index for a given key, bypassing the need to search through elements sequentially.',
    '**Collision** — An event where a hash function assigns the exact same integer index to two completely different keys. It exists Because the range of possible keys (like all possible words) is infinitely larger than the fixed number of buckets in memory, forcing overlap (the Pigeonhole Principle).',
    '**Separate chaining** — A collision resolution strategy where each bucket in the array holds a list of items rather than a single item. It exists To ensure that when two distinct keys hash to the same bucket, both can be saved without one overwriting the other.',
    '**Load factor** — The ratio of stored elements to total available buckets in a hash table (elements / buckets). It exists To serve as a metric for when the table is getting too crowded and needs to be expanded to maintain fast lookups.',
    '**Rehashing** — The process of allocating a larger array and re-calculating the bucket index for every existing element. It exists Because as the array grows, the modulo math used to assign indices changes; old elements must be moved to their new, correct buckets to be found again.',
  ],

  checkpoints: ['read-intuition'],
}
