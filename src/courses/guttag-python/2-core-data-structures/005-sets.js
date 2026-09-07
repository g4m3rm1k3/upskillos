// Guttag — Lesson 10: Sets
// Auto-converted from src/docs/tutorials/guttag-python/lesson-10.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-10-sets',
  slug: 'sets',
  chapter: 2,
  order: 5,
  title: 'Sets',
  subtitle: 'Membership and Uniqueness',
  tags: ['set', 'hashable', 'set-literal', 'set-algebra', 'deduplication', 'o-1-vs-o-n-lookup'],

  hook: {
    question: 'What is "Sets", and why does it matter?',
    realWorldContext: 'The reader understands Python sets: unordered collections of unique hashable elements, O(1) membership test, and set algebra (union, intersection, difference, symmetric difference). The transferable insight: a set is the right data structure when you care about MEMBERSHIP and UNIQUENESS, not order or count. Any \'does this item exist?\' question that iterates a list should use a set.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Set literals and creation, Set mutation methods, Set algebra — union, intersection, difference, frozenset — the hashable set, When to use set vs. list vs. dict.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Set:** an unordered collection of unique hashable elements. It exists to provide fast O(1) membership testing and deduplication, solving the problem of slow O(n) list lookups.\n- **Hashable:** an object whose value never changes during its lifetime (like an integer or string) and can be mapped to an integer via a hash function. It exists because sets and dicts require stable memory locations to provide fast lookups.\n- **Set Literal:** a comma-separated list of items enclosed in curly braces {1, 2, 3}. It exists as a concise way to create sets with known elements.\n- **Set Algebra:** mathematical operations on sets (union, intersection, difference). It exists to easily compare, combine, and filter collections of data.\n- **Deduplication:** the process of removing duplicate elements from a collection. It exists to ensure each element is unique, saving space and preventing double-counting.\n- **O(1) vs O(n) lookup:** time complexity describing how lookup time scales with collection size. It exists to analyze performance; O(1) is constant time regardless of size, O(n) grows linearly.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **set():** The Python built-in constructor for creating a set object.\n- **add():** A method that adds a single element to a set.\n- **remove():** A method that removes a specific element from a set, raising an error if not found.\n- **discard():** A method that removes a specific element from a set, doing nothing if not found.\n- **pop():** A method that removes and returns an arbitrary element from the set.\n- **clear():** A method that removes all elements from the set.\n- **update():** A method that adds multiple elements from an iterable to a set.\n- **frozenset():** The Python built-in constructor for creating an immutable set object.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace these concepts through a practical scenario: processing email lists. If we have a list `[\'alice@x.com\', \'bob@x.com\', \'alice@x.com\']`, converting it with `set(emails)` immediately gives us deduplication (`{\'alice@x.com\', \'bob@x.com\'}`). If we have a second list of emails from a different department, we can find the common emails using set intersection (`emails1 & emails2`). If we need to find emails that are only in the first list but not the second, we use set difference (`emails1 - emails2`). We can mutate our primary set by dropping invalid emails with `emails.discard("invalid@x.com")` safely. If we need to use this set of verified emails as a cache key, we convert it to a `frozenset`. By understanding when to use a set—specifically when we care about membership and uniqueness rather than order—we replace slow O(n) list iterations with fast O(1) hash lookups, making our code more declarative, safer, and highly performant.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 10: Sets',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Sets',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Set literals and creation',
              prose: [
                'How do you store a collection of unique items where the order does not matter? If you have a list of items and you want to remove duplicates quickly, what data structure is best? If you need to repeatedly check whether an item exists in a large collection, what offers the fastest lookup?',
                'Output: ```text {1, 2, 3} set() {10, 20, 30} True True ``` This output proves that **sets** automatically deduplicate their contents and do not guarantee insertion order. It also proves that creating an empty set requires `set()` because `{}` creates a dictionary, and that `in` and `not in` are used to check membership.'
              ],
              typeIt: true,
              solution: '# Create a set literal\nmy_set = {1, 2, 3, 2, 1}\nprint(my_set)\n\n# Create an empty set\nempty_set = set()\nprint(empty_set)\n\n# Convert list to set to deduplicate\nmy_list = [10, 20, 10, 30]\nlist_as_set = set(my_list)\nprint(list_as_set)\n\n# Membership test\nprint(20 in list_as_set)\nprint(99 not in list_as_set)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Set literals and creation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `set()` is called, passing a list `[101, 102, 103, 101]`.\n- The list `[101, 102, 103, 101]` provides the initial elements.\n- `processed_ids` is assigned the resulting set `{101, 102, 103}`.\n- `len(processed_ids)` calculates the number of elements in the set, returning `3`.\n- `unique_count` is assigned the value `3`.\n- `102 in processed_ids` checks if the integer `102` exists in the set, evaluating to `True`.\n- `is_processed` is assigned the value `True`.',
                '**Expected behavior.** Predicted confidently: The `processed_ids` set will contain `{101, 102, 103}`, `unique_count` will be `3`, and `is_processed` will be `True`.',
                '**CS lens.** The concept here is a Hash Set. It appears in databases (for fast indexing of unique values), in caching systems (to track which keys have been seen), and in graph traversal algorithms (like breadth-first search) to remember which nodes have already been visited in O(1) time.',
                '**SE lens.** Design principle: Choose the right data structure for the job. We could have used a list and manually checked for duplicates using loops, but that would be O(n^2) for deduplication. Using a set makes it O(n) to build and O(1) to query. The tradeoff is that sets consume slightly more memory overhead than lists and discard original insertion order.'
              ],
              typeIt: true,
              solution: 'processed_ids = set([101, 102, 103, 101])\nunique_count = len(processed_ids)\nis_processed = 102 in processed_ids',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Set mutation methods',
              prose: [
                'What if your collection of unique items needs to grow or shrink over time? How do you add an item without checking if it already exists? How do you remove an item safely whether it\'s there or not?',
                'Output: ```text {1, 2, 3, 4} {1, 3, 4} 1 {3, 4} {10, 11, 3, 4} set() ``` This output proves that **mutation methods** alter the set in place: `add` ignores duplicates, `remove` throws an error on missing items while `discard` does not, `pop` removes an arbitrary element, `update` merges multiple elements, and `clear` empties the set completely.'
              ],
              typeIt: true,
              solution: 's = {1, 2, 3}\ns.add(4)\ns.add(4) # Duplicate add is a no-op\nprint(s)\n\ns.remove(2)\n# s.remove(99) # This would raise a KeyError\ns.discard(99) # This does nothing, safely\nprint(s)\n\npopped = s.pop()\nprint(popped, s)\n\ns.update([10, 11])\nprint(s)\n\ns.clear()\nprint(s)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Set mutation methods — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `processed_ids.add(104)` calls the `add` method on the set, inserting the integer `104`.\n- `processed_ids.discard(101)` calls the `discard` method, silently removing `101` if it exists.\n- `processed_ids.update([201, 202])` calls the `update` method, iterating over the list `[201, 202]` and adding each element to the set.',
                '**Expected behavior.** Predicted confidently: The `processed_ids` set will be mutated in place and will contain `{102, 103, 104, 201, 202}`.',
                '**CS lens.** The concept here is Mutability in Hash-based Data Structures. It appears in memory management (tracking active memory allocations), event driven programming (subscribing and unsubscribing listeners), and session management (adding and dropping active user sessions).',
                '**SE lens.** Design principle: Fail-fast versus safe-defaults. The choice between `remove` (which raises an error) and `discard` (which silently ignores missing items) forces the programmer to explicitly state their expectation. The alternative not chosen is having only one removal method, which would either hide bugs or require manual existence checks.'
              ],
              typeIt: true,
              solution: 'processed_ids.add(104)\nprocessed_ids.discard(101)\nprocessed_ids.update([201, 202])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Set algebra — union, intersection, difference',
              prose: [
                'How do you find the elements that exist in two different collections? What if you want to combine two collections while removing all duplicates? How do you find elements that are in one collection but not another?',
                'Output: ```text {1, 2, 3, 4, 5} {3} {1, 2} {1, 2, 4, 5} False ``` This output proves that **set algebra** operators return entirely new sets based on mathematical relationships: `|` combines them, `&` finds commonalities, `-` subtracts elements, and `^` finds items exclusive to one or the other. It also proves that `<= `checks if one set is a subset of another.'
              ],
              typeIt: true,
              solution: 'a = {1, 2, 3}\nb = {3, 4, 5}\n\nprint(a | b) # Union\nprint(a & b) # Intersection\nprint(a - b) # Difference\nprint(a ^ b) # Symmetric difference\nprint(a <= b) # Subset test',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Set algebra — union, intersection, difference — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `admins` is assigned the set literal `{101, 102}`.\n- `editors` is assigned the set literal `{102, 103, 104}`.\n- `admins & editors` computes the intersection of the two sets, returning `{102}`.\n- `super_users` is assigned the resulting intersection set `{102}`.\n- `admins - editors` computes the difference, returning elements in `admins` that are not in `editors`, which is `{101}`.\n- `only_admins` is assigned the resulting difference set `{101}`.',
                '**Expected behavior.** Predicted confidently: `super_users` will be `{102}` and `only_admins` will be `{101}`.',
                '**CS lens.** The concept here is Relational Algebra. It appears in SQL databases (JOINs and EXCEPT clauses), Boolean search queries (AND/OR operators in search engines), and access control lists (calculating effective permissions from multiple groups).',
                '**SE lens.** Design principle: Expressiveness. We could achieve these results by iterating through lists and manually checking conditions, but set operators natively communicate the mathematical intent of the operation. The real tradeoff is readability for those unfamiliar with the mathematical operators vs verbose but universally understood loop logic.'
              ],
              typeIt: true,
              solution: 'admins = {101, 102}\neditors = {102, 103, 104}\nsuper_users = admins & editors\nonly_admins = admins - editors',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'frozenset — the hashable set',
              prose: [
                'Dictionaries require their keys to be hashable and immutable, and sets require their elements to be hashable and immutable. If you want to use a set itself as a dictionary key or store a set inside another set, how do you prevent it from being mutated?',
                'Output: ```text {frozenset({1, 2}), frozenset({3, 4})} ``` This output proves that a **frozenset** is an immutable, hashable version of a set. It can be stored inside another set, but attempts to mutate it (like calling `add`) will fail.'
              ],
              typeIt: true,
              solution: '# Mutable sets cannot be elements of another set\n# This would raise a TypeError: unhashable type: \'set\'\n# nested_sets = {{1, 2}, {3, 4}}\n\n# frozenset solves this\nf_set = frozenset([1, 2])\nvalid_nested_set = {f_set, frozenset([3, 4])}\nprint(valid_nested_set)\n\n# f_set.add(3) # This would raise an AttributeError',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'frozenset — the hashable set — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `role_permissions` is assigned a new dictionary literal.\n- `frozenset(["read", "write"])` is called to create an immutable set from a list of two strings.\n- This `frozenset` is used as the first key in the dictionary, mapping to the value `"Editor"`.\n- `frozenset(["read"])` is called to create an immutable set from a list of one string.\n- This second `frozenset` is used as the second key in the dictionary, mapping to the value `"Viewer"`.',
                '**Expected behavior.** Predicted confidently: `role_permissions` will be a valid dictionary with two `frozenset` keys.',
                '**CS lens.** The concept here is Immutability and Hashing. It appears in functional programming paradigms (where data is never mutated), in cryptography (where hashing requires stable inputs), and in memoization (caching function results using their immutable arguments as keys).',
                '**SE lens.** Design principle: Type safety and invariants. By using `frozenset`, the language guarantees that the key can never change underneath the dictionary, preserving the integrity of the hash table. The alternative not chosen is using a sorted tuple, which works but loses the unordered mathematical semantics of a set.'
              ],
              typeIt: true,
              solution: 'role_permissions = {\n    frozenset(["read", "write"]): "Editor",\n    frozenset(["read"]): "Viewer"\n}',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'When to use set vs. list vs. dict',
              prose: [
                'You have tools like lists, dictionaries, and sets. When building a new feature, how do you decide which one to use? What is the performance penalty of choosing the wrong one?',
                'Output: ```text {1, 9, 25} ``` This output proves that a **set comprehension** works exactly like a list comprehension but uses curly braces `{}` and automatically deduplicates the results, building a set in a single pass. It proves that filtering and mapping can be combined with deduplication concisely.'
              ],
              typeIt: true,
              solution: 'data = [1, 2, 3, 4, 5, 5, 4, 3, 2, 1]\n\n# Set comprehension\nunique_squares = {x * x for x in data if x % 2 != 0}\nprint(unique_squares)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'When to use set vs. list vs. dict — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `logs` is assigned a list literal containing four string elements.\n- The `{ ... }` syntax initiates a set comprehension.\n- `for log in logs` iterates over each element in the `logs` list.\n- `if log.startswith("ERR_")` filters the iteration, selecting only strings that begin with `"ERR_"`.\n- `log` (before the `for`) is the expression that determines what value is added to the set.\n- `unique_errors` is assigned the resulting set, which automatically drops the duplicate `"ERR_500"`.',
                '**Expected behavior.** Predicted confidently: `unique_errors` will be a set containing `{"ERR_500", "ERR_404"}`.',
                '**CS lens.** The concept here is Asymptotic Time Complexity. It appears in algorithm analysis (Big O notation), database query optimization (table scans vs index lookups), and load balancing (evaluating the cost of routing decisions under heavy traffic).',
                '**SE lens.** Design principle: Intentional Data Modeling. We could just use a list comprehension and cast it to a set later (`set([x for x in ...])`), but a set comprehension expresses the intent to build a set directly, and avoids allocating intermediate memory for the list. The tradeoff is that the set comprehension does not preserve the order of the logs.'
              ],
              typeIt: true,
              solution: 'logs = ["ERR_500", "INFO_200", "ERR_500", "ERR_404"]\nunique_errors = {log for log in logs if log.startswith("ERR_")}',
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
      'Next lesson: Comprehensions.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Set Algebra"?',
      options: [
        'time complexity describing how lookup time scales with collection size. It exists to analyze performance; O(1) is constant time regardless of size, O(n) grows linearly.',
        'mathematical operations on sets (union, intersection, difference). It exists to easily compare, combine, and filter collections of data.',
        'the process of removing duplicate elements from a collection. It exists to ensure each element is unique, saving space and preventing double-counting.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Set"?',
      options: [
        'a comma-separated list of items enclosed in curly braces {1, 2, 3}. It exists as a concise way to create sets with known elements.',
        'an unordered collection of unique hashable elements. It exists to provide fast O(1) membership testing and deduplication, solving the problem of slow O(n) list lookups.',
        'the process of removing duplicate elements from a collection. It exists to ensure each element is unique, saving space and preventing double-counting.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Set Literal"?',
      options: [
        'mathematical operations on sets (union, intersection, difference). It exists to easily compare, combine, and filter collections of data.',
        'a comma-separated list of items enclosed in curly braces {1, 2, 3}. It exists as a concise way to create sets with known elements.',
        'an unordered collection of unique hashable elements. It exists to provide fast O(1) membership testing and deduplication, solving the problem of slow O(n) list lookups.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Hashable"?',
      options: [
        'an object whose value never changes during its lifetime (like an integer or string) and can be mapped to an integer via a hash function. It exists because sets and dicts require stable memory locations to provide fast lookups.',
        'the process of removing duplicate elements from a collection. It exists to ensure each element is unique, saving space and preventing double-counting.',
        'time complexity describing how lookup time scales with collection size. It exists to analyze performance; O(1) is constant time regardless of size, O(n) grows linearly.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Set** — an unordered collection of unique hashable elements. It exists to provide fast O(1) membership testing and deduplication, solving the problem of slow O(n) list lookups.',
    '**Hashable** — an object whose value never changes during its lifetime (like an integer or string) and can be mapped to an integer via a hash function. It exists because sets and dicts require stable memory locations to provide fast lookups.',
    '**Set Literal** — a comma-separated list of items enclosed in curly braces {1, 2, 3}. It exists as a concise way to create sets with known elements.',
    '**Set Algebra** — mathematical operations on sets (union, intersection, difference). It exists to easily compare, combine, and filter collections of data.',
    '**Deduplication** — the process of removing duplicate elements from a collection. It exists to ensure each element is unique, saving space and preventing double-counting.',
    '**O(1) vs O(n) lookup** — time complexity describing how lookup time scales with collection size. It exists to analyze performance; O(1) is constant time regardless of size, O(n) grows linearly.',
  ],

  checkpoints: ['read-intuition'],
}
