// cpp-from-scratch — Lesson 12: Standard Library Containers
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 12 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-12-standard-library-containers',
  slug: 'standard-library-containers',
  chapter: 2,
  order: 4,
  title: 'Standard Library Containers',
  subtitle: 'OOP and Generic Programming',
  tags: ['container', 'iterator', 'hash-function'],

  hook: {
    question: 'What is "Standard Library Containers", and why does it matter?',
    realWorldContext: 'You will write isolated console programs that store, retrieve, and organize collections of data. These programs demonstrate how to hold multiple values dynamically without manually managing raw memory arrays. The transferable problem this solves is selecting the right data structure—whether you need fast iteration, instant lookups by a key, or guaranteed uniqueness—using the C++ Standard Library.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: std::vector, std::map, std::unordered_map, std::set.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Container:** A data structure that holds a collection of other objects. It exists To manage the allocation and deallocation of memory for multiple items automatically, freeing you from manual pointer math.\n- **Iterator:** An object that points to an element inside a container and can move to the next element. It exists To provide a uniform way to traverse different types of containers (like vectors and maps) without needing to know how they are structured internally.\n- **Hash function:** A mathematical algorithm that converts a key (like a string) into an integer. It exists To determine exactly where a value should be stored in memory, enabling instant lookups without scanning the entire collection.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how the type system and memory management work seamlessly across all these structures. You never wrote `new` or `delete`. When the `main()` function finishes, the `std::vector`, `std::map`, `std::unordered_map`, and `std::set` all run their destructors. They automatically free every piece of heap memory they allocated behind the scenes, completely preventing memory leaks. Furthermore, because you use template arguments like `<int>` or `<std::string>`, the C++ compiler strictly enforces type safety, guaranteeing you cannot accidentally insert a string into your integer set.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you ignore the container\'s strict template types, the compiler will stop you immediately. Modify the `std::vector` code to insert a string: \n\n```cpp\nstd::vector<int> scores;\nscores.push_back("Hello");\n```\n\n**The compiler error:** `error: no matching function for call to \'std::vector<int>::push_back(const char [6])\'` Because you declared `std::vector<int>`, the `push_back` method is permanently locked to accept only integers. The compiler refuses to compile the program.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Vector Processing:** Create a `std::vector<double>` containing five prices. Write a `for` loop that calculates and prints the total sum of all the prices.\n- **Frequency Counter:** Read about `std::unordered_map`. Create an `std::unordered_map<std::string, int>`. Insert the word `"apple"` twice and `"banana"` once by writing `wordCount["apple"]++;`. Print the final map to prove it correctly counted the occurrences.\n- **Unique Sorting:** Create a `std::set<std::string>`. Insert five names, deliberately including a duplicate name in your code. Print the set to verify that it sorted the names alphabetically and removed the duplicate.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run a `std::vector` and retrieved items by index.\n- [ ] You have compiled and run a `std::map` and retrieved a value by its key.\n- [ ] You have compiled and run a `std::unordered_map` and observed its lack of sorting.\n- [ ] You have compiled and run a `std::set` and observed it filtering out duplicates.\n- [ ] You can explain out loud why you would choose a vector versus a map.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 12: Standard Library Containers',
        caption: 'Standard Library Containers',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'std::vector',
              prose: [
                'When storing multiple items of the same type, raw arrays require you to specify an exact size at the moment they are created. If you create an array of size five and later need to add a sixth element, you must manually allocate a new, larger block of memory, copy the five existing items over using pointers, and then delete the old block. You need a data structure that does this resizing work for you.',
                '## How the Code Works',
                '- `#include <vector>`: Instructs the compiler to include the file defining the `std::vector` template. Without this, the compiler will not recognize the word `vector`.\n- `std::vector<int> scores;`: Declares a variable named `scores`. The `<int>` template argument specifies that this vector will only hold integers. Initially, it holds zero elements.\n- `scores.push_back(100);`: Calls the `push_back` method on the `scores` object. This requests the vector to store the value `100` at the end. The vector secretly allocates memory for this integer.\n- `scores.size()`: Calls a method returning the total number of elements currently held.\n- `scores[1]`: The subscript operator accesses the element at offset `1` (the second item, because counting starts at `0`). This reads directly from that memory location.\n- `for (int score : scores)`: A range-based for loop. It asks the vector for its beginning and end iterators, sequentially pulling each integer into the local `score` variable for the loop body.\n- `std::cout << score << "\\n";`: Prints the current integer to the console, followed by a newline.',
                '**CS lens.** This is a dynamic array. Under the hood, a vector keeps three pointers: one to the start of its allocated memory, one to the last element placed, and one to the end of the allocated memory. When you push an item and hit the allocated limit, the vector allocates a new, larger block (usually doubling in size), copies the old items, and frees the old block.',
                '**SE lens.** The alternative not chosen is manually managing `int*` pointers and using `new[]` and `delete[]`. The tradeoff here is a slight, occasional performance pause when the vector doubles its capacity, in exchange for guaranteed memory safety—you will not leak memory because the vector cleans itself up when it goes out of scope.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> scores;\n    scores.push_back(100);\n    scores.push_back(85);\n    scores.push_back(95);\n    \n    std::cout << "Total scores: " << scores.size() << "\\n";\n    std::cout << "Second score: " << scores[1] << "\\n";\n    \n    for (int score : scores) {\n        std::cout << score << "\\n";\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'std::map',
              prose: [
                'Sometimes you need to look up data based on a specific label or identifier, such as a name, rather than a numeric sequence index. If you only have a `std::vector`, finding a specific record means looping through every single item until you find a match. You need a collection that maps a unique key directly to a value.',
                '## How the Code Works',
                '- `#include <map>`: Brings in the definition for `std::map`.\n- `std::map<std::string, int> ages;`: Instantiates a map requiring two template types. The first (`std::string`) is the Key, and the second (`int`) is the Value.\n- `ages["Alice"] = 30;`: The `[]` operator searches for the key `"Alice"`. Because it does not exist yet, the map creates a new entry for `"Alice"` and assigns the value `30` to it.\n- `ages["Bob"]`: Searches the map for the key `"Bob"` and returns the integer associated with it.\n- `for (const auto& pair : ages)`: Iterates through the map. Because a map holds two pieces of data per entry, it yields a `std::pair` object. The `const auto&` tells the compiler to deduce the exact type (`std::pair<const std::string, int>`) and take it by reference to avoid copying the data.\n- `pair.first` and `pair.second`: Properties of the `std::pair` object. `first` holds the key (the string), and `second` holds the value (the integer).',
                '**CS lens.** A `std::map` is typically implemented as a self-balancing binary search tree (like a Red-Black tree). This guarantees that the keys are always kept in sorted order. Finding, inserting, or removing an item takes logarithmic time based on the number of elements.',
                '**SE lens.** The alternative not chosen is two parallel vectors (one for names, one for ages). The tradeoff here is memory overhead. A binary tree requires allocating individual nodes with extra pointers for the tree structure, using more memory than contiguous vectors, but it drastically reduces the time spent searching.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <map>\n#include <string>\n\nint main() {\n    std::map<std::string, int> ages;\n    \n    ages["Alice"] = 30;\n    ages["Bob"] = 25;\n    ages["Charlie"] = 35;\n    \n    std::cout << "Bob is " << ages["Bob"] << " years old.\\n";\n    \n    for (const auto& pair : ages) {\n        std::cout << pair.first << ": " << pair.second << "\\n";\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::unordered_map',
              prose: [
                '`std::map` keeps everything sorted, which is useful, but maintaining that sorted tree structure takes a small amount of computational work on every insertion. If you only care about instantly looking up a value by its key and do not care about the order in which items are stored, that sorting work is wasted effort.',
                '## How the Code Works',
                '- `#include <unordered_map>`: Includes the hash table implementation.\n- `std::unordered_map<std::string, std::string> capitals;`: Creates the container mapping a string key to a string value.\n- `capitals.find("Japan")`: A method that searches for the key `"Japan"`. It returns an iterator pointing to the found element. If the key is not found, it returns an iterator representing the end of the map.\n- `capitals.end()`: A method returning a special iterator that acts as a placeholder for "past the last element." It is used to check if a search failed.\n- `!=`: The inequality operator. The statement `capitals.find("Japan") != capitals.end()` explicitly checks that the key was actually found before we try to read it.\n- `capitals["Japan"]`: Retrieves the value. We do this safely because the `if` statement just proved the key exists.',
                '**CS lens.** This is a hash table. When you provide `"Japan"`, the container runs a hash function on the string to produce an integer. It uses that integer as a direct array index to store or find the value. This provides constant-time lookups (O(1)), meaning it takes the same amount of time to find an item whether the map holds ten entries or a million.',
                '**SE lens.** The alternative not chosen is using `std::map`. The tradeoff is that `std::unordered_map` has slightly higher memory requirements and an unpredictable internal order. You choose `std::unordered_map` when lookup speed is paramount; you choose `std::map` when you need to iterate over the keys in alphabetical or numeric order.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <unordered_map>\n#include <string>\n\nint main() {\n    std::unordered_map<std::string, std::string> capitals;\n    \n    capitals["France"] = "Paris";\n    capitals["Japan"] = "Tokyo";\n    capitals["Egypt"] = "Cairo";\n    \n    if (capitals.find("Japan") != capitals.end()) {\n        std::cout << "Capital of Japan is " << capitals["Japan"] << "\\n";\n    }\n    \n    for (const auto& pair : capitals) {\n        std::cout << pair.first << " -> " << pair.second << "\\n";\n    }\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'std::set',
              prose: [
                'Sometimes you do not have key-value pairs; you only have single values, but you must ensure that no duplicates ever exist in your collection. If you use a `std::vector`, you would have to manually search the entire vector before every insertion to see if the item is already there. You need a container that enforces uniqueness automatically.',
                '## How the Code Works',
                '- `#include <set>`: Includes the set implementation.\n- `std::set<int> uniqueNumbers;`: Declares a set that holds integers. There is no second template parameter because there are no values mapped to keys; the element itself is the key.\n- `uniqueNumbers.insert(10);`: Attempts to add the integer `10` to the set.\n- `uniqueNumbers.insert(10);`: On this second call, the set checks if `10` is already present. Because it is, the set silently rejects the insertion. The collection does not grow.\n- `uniqueNumbers.size()`: Returns `3`, proving that the duplicate insertion was ignored.',
                '**CS lens.** Like `std::map`, `std::set` is implemented as a binary search tree. The only difference is that the node in the tree stores just one value, not a pair. Because it is a tree, iterating through `std::set` will always return the elements in sorted order.',
                '**SE lens.** The alternative not chosen is `std::vector` coupled with a manual `std::find` check before every push. The tradeoff here is insertion performance. Checking a vector for a duplicate takes linear time (checking every item). `std::set` does it in logarithmic time, making it vastly superior for maintaining a large collection of unique items.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <set>\n\nint main() {\n    std::set<int> uniqueNumbers;\n    \n    uniqueNumbers.insert(10);\n    uniqueNumbers.insert(20);\n    uniqueNumbers.insert(10); // Duplicate!\n    uniqueNumbers.insert(5);\n    \n    std::cout << "Total unique numbers: " << uniqueNumbers.size() << "\\n";\n    \n    for (int num : uniqueNumbers) {\n        std::cout << num << "\\n";\n    }\n    \n    return 0;\n}',
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
      'Next lesson: Standard Library Algorithms.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Hash function"?',
      options: [
        'A data structure that holds a collection of other objects. It exists To manage the allocation and deallocation of memory for multiple items automatically, freeing you from manual pointer math.',
        'A mathematical algorithm that converts a key (like a string) into an integer. It exists To determine exactly where a value should be stored in memory, enabling instant lookups without scanning the entire collection.',
        'An object that points to an element inside a container and can move to the next element. It exists To provide a uniform way to traverse different types of containers (like vectors and maps) without needing to know how they are structured internally.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Iterator"?',
      options: [
        'A data structure that holds a collection of other objects. It exists To manage the allocation and deallocation of memory for multiple items automatically, freeing you from manual pointer math.',
        'An object that points to an element inside a container and can move to the next element. It exists To provide a uniform way to traverse different types of containers (like vectors and maps) without needing to know how they are structured internally.',
        'A mathematical algorithm that converts a key (like a string) into an integer. It exists To determine exactly where a value should be stored in memory, enabling instant lookups without scanning the entire collection.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Container"?',
      options: [
        'An object that points to an element inside a container and can move to the next element. It exists To provide a uniform way to traverse different types of containers (like vectors and maps) without needing to know how they are structured internally.',
        'A mathematical algorithm that converts a key (like a string) into an integer. It exists To determine exactly where a value should be stored in memory, enabling instant lookups without scanning the entire collection.',
        'A data structure that holds a collection of other objects. It exists To manage the allocation and deallocation of memory for multiple items automatically, freeing you from manual pointer math.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Container** — A data structure that holds a collection of other objects. It exists To manage the allocation and deallocation of memory for multiple items automatically, freeing you from manual pointer math.',
    '**Iterator** — An object that points to an element inside a container and can move to the next element. It exists To provide a uniform way to traverse different types of containers (like vectors and maps) without needing to know how they are structured internally.',
    '**Hash function** — A mathematical algorithm that converts a key (like a string) into an integer. It exists To determine exactly where a value should be stored in memory, enabling instant lookups without scanning the entire collection.',
  ],

  checkpoints: ['read-intuition'],
}
