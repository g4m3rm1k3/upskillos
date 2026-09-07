// Guttag — Lesson 9: Dictionaries
// Auto-converted from src/docs/tutorials/guttag-python/lesson-09.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-09-dictionaries',
  slug: 'dictionaries',
  chapter: 2,
  order: 4,
  title: 'Dictionaries',
  subtitle: 'Key-Value Stores',
  tags: ['dictionary', 'key', 'value', 'hash-map', 'hashable', 'keyerror'],

  hook: {
    question: 'What is "Dictionaries", and why does it matter?',
    realWorldContext: 'The reader understands Python dicts: O(1) key lookup, creation, get/set/delete, iteration patterns, common dict methods, and dict comprehensions. The transferable insight: a dict is a hash map. It trades memory for speed: O(1) average lookup instead of O(n) linear search. Any algorithm that repeatedly searches a list for a value should use a dict instead. This is one of the most important performance insights in Python programming.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Dict literals and basic operations, Dict methods — keys, values, items, Dict as counter — the frequency pattern, Dict comprehensions, Ordered dicts and merging (Python 3.7+).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Dictionary:** A data structure that stores key-value pairs, providing average O(1) time complexity for lookups, insertions, and deletions. It trades memory for speed, avoiding linear searches.\n- **Key:** The unique identifier used to look up a value in a dictionary. Keys must be immutable (hashable), such as strings, integers, floats, or tuples.\n- **Value:** The data associated with a key in a dictionary. Values can be of any type, can be mutable, and can be duplicated across different keys.\n- **Hash Map:** The underlying computer science data structure that powers Python dictionaries, using a hash function to compute an index into an array of buckets or slots.\n- **Hashable:** An object is hashable if it has a hash value which never changes during its lifetime, and can be compared to other objects. Immutable types like strings and numbers are hashable.\n- **KeyError:** An exception raised when a dictionary key is not found in the set of existing keys.\n- **Iterable:** An object capable of returning its members one at a time, allowing it to be iterated over in a for-loop.\n- **Comprehension:** A concise syntax for creating a new dictionary by iterating over an iterable and applying an expression to each item.\n- **In-place:** An operation that modifies the original data structure directly, rather than returning a new copy.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **dict:** The built-in dictionary type in Python.\n- **dict.get():** A method to safely retrieve a value from a dictionary.\n- **dict.pop():** A method to remove a specified key and return its value.\n- **dict.keys():** A method that returns a view object of the dictionary\'s keys.\n- **dict.values():** A method that returns a view object of the dictionary\'s values.\n- **dict.items():** A method that returns a view object of the dictionary\'s key-value pairs.\n- **dict.update():** A method to update the dictionary with elements from another dictionary object.\n- **collections.Counter:** A dictionary subclass for counting hashable objects.\n- **collections.defaultdict:** A dictionary subclass that calls a factory function to supply missing values.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Building a word-frequency dictionary from the sentence `"the cat sat on the mat"` perfectly traces all these concepts in action. You start by splitting the string into an iterable of words. You can manually loop through this list using `word_counts[word] = word_counts.get(word, 0) + 1` to safely initialize and increment counts, proving O(1) key access and avoiding `KeyError`. Alternatively, passing the words directly into `collections.Counter()` leverages the frequency pattern instantly. Once counted, you can use a dictionary comprehension to filter out words below a certain length. Finally, by sorting the `.items()` and passing them back into `dict()`, you rely on Python\'s insertion-order guarantee to maintain a frequency-ranked list of words, which you could then cleanly merge with other text analyses using the `|` operator.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 9: Dictionaries',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Dictionaries',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Dict literals and basic operations',
              prose: [
                'If you have a list of user IDs and want to look up a user\'s name, searching through a list of pairs `[(\'id1\', \'Alice\'), (\'id2\', \'Bob\')]` takes O(n) time. How can you find the name associated with an ID in O(1) time? What data structure maps unique keys to values directly?',
                'Output: ``` Alice No Email {\'name\': \'Alice\'} ``` This proves that **dictionaries** can be created with literal syntax `{}`, values can be accessed and modified via `[key]`, missing keys can be safely retrieved with `.get()`, and `.pop()` removes a key and returns its value.'
              ],
              typeIt: true,
              solution: 'user = {\'name\': \'Alice\', \'age\': 30}\nprint(user[\'name\'])\nuser[\'age\'] = 31\nprint(user.get(\'email\', \'No Email\'))\ndeleted_age = user.pop(\'age\')\nprint(user)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Dict literals and basic operations — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `{}` creates a new dictionary literal containing key-value pairs.\n- `\'case_sensitive\': False` defines a string key `\'case_sensitive\'` mapping to the boolean value `False`.\n- `,` separates the key-value pairs.\n- `\'min_length\': 3` maps another string key to an integer value.\n- `config[\'language\'] = \'en\'` assigns the value `\'en\'` to the key `\'language\'` in the `config` dictionary. If the key exists, it is overwritten; if not, it is created.\n- `print(...)` calls the built-in print function.\n- `"Language:"` is a literal string.\n- `config.get(\'language\')` calls the `get` method on the `config` dictionary with the key `\'language\'`. It returns the value safely without raising a `KeyError`.',
                '**Expected behavior.** Predicted confidently: Language: en',
                '**CS lens.** This is a Hash Map. It appears in databases for indexing, in caches (like Memcached or Redis) for fast retrieval, and in symbol tables in compilers to track variable definitions. It provides average O(1) time complexity for insertions and lookups by passing the key through a hash function.',
                '**SE lens.** Using a dictionary for configuration over multiple separate variables is a design principle of grouping related state. The alternative NOT chosen is having standalone variables like `config_language` and `config_min_length`. The real tradeoff is that dictionaries lack formal structure (you can misspell a key at runtime), whereas formal classes or objects enforce schema but require more boilerplate.'
              ],
              typeIt: true,
              solution: 'config = {\'case_sensitive\': False, \'min_length\': 3}\nconfig[\'language\'] = \'en\'\nprint("Language:", config.get(\'language\'))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Dict methods — keys, values, items',
              prose: [
                'You have a dictionary full of configuration settings and you want to print all of them. How do you loop over a dictionary? Does looping give you the keys, the values, or both?',
                'Output: ``` a: 1 b: 2 True {\'a\': 99, \'b\': 2, \'c\': 3} ``` This proves that `.items()` provides both the key and the value for iteration, the `in` operator provides O(1) membership testing for keys, and `.update()` merges dictionaries and overwrites conflicts. These are core **dictionary methods**.'
              ],
              typeIt: true,
              solution: 'd = {\'a\': 1, \'b\': 2}\nfor k, v in d.items():\n    print(f"{k}: {v}")\nprint(\'a\' in d)\nd.update({\'c\': 3, \'a\': 99})\nprint(d)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Dict methods — keys, values, items — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `for key, val in` starts an iteration unpacking two variables at once.\n- `config.items()` returns a view object of all key-value tuple pairs in the dictionary.\n- `print(f"Config {key} -> {val}")` prints each key and value using an f-string.\n- `if \'language\' in config:` tests whether the string `\'language\'` is a key currently present in the dictionary.\n- `print("Language is configured.")` executes if the `in` check returns `True`.',
                '**Expected behavior.** Predicted confidently: Config case_sensitive -> False Config min_length -> 3 Config language -> en Language is configured.',
                '**CS lens.** Iterating over dictionary views and performing membership tests are core operations on Collections. This appears in JSON parsing (iterating over object properties), routing tables in networking (iterating paths), and file system directory listings (where filenames are keys). The `in` operator uses the underlying hash map to achieve O(1) time complexity.',
                '**SE lens.** Using `.items()` is a design principle of idiomatic iteration. The alternative NOT chosen is looping over keys (`for key in config:`) and then looking up the value (`val = config[key]`). The real tradeoff is that `.items()` is more readable and slightly faster since it avoids the secondary hash lookup, but it unpacks pairs which is unnecessary if you only need the keys.'
              ],
              typeIt: true,
              solution: 'for key, val in config.items():\n    print(f"Config {key} -> {val}")\nif \'language\' in config:\n    print("Language is configured.")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Dict as counter — the frequency pattern',
              prose: [
                'You have a list of words and want to know how many times each word occurs. If you loop through the words, how do you add 1 to a dictionary key\'s count without crashing when the key doesn\'t exist yet?',
                'Output: ``` {\'apple\': 2, \'banana\': 1} Counter({\'apple\': 2, \'banana\': 1}) ``` This proves that `.get(w, 0)` is a safe way to initialize and increment counters in one line, and that the `collections.Counter` class provides this exact **frequency pattern** out of the box.'
              ],
              typeIt: true,
              solution: 'from collections import defaultdict, Counter\nwords = [\'apple\', \'banana\', \'apple\']\ncounts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\nprint(counts)\nprint(Counter(words))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Dict as counter — the frequency pattern — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from collections import Counter` imports the `Counter` class from the standard library\'s `collections` module.\n- `text = "the cat sat on the mat"` assigns a string literal to `text`.\n- `words = text.split()` calls the string method `split()` to break the string into a list of words on whitespace.\n- `word_counts = Counter(words)` instantiates a `Counter` object, passing in the list of words. It automatically counts the occurrences of each element.\n- `print(...)` prints the result.\n- `word_counts[\'the\']` looks up the frequency of the string `\'the\'` in the Counter dictionary.',
                '**Expected behavior.** Predicted confidently: Top word count: 2',
                '**CS lens.** The frequency pattern is a form of a Histogram. It appears in data analytics for summarizing event occurrences, in natural language processing (NLP) for bag-of-words models, and in image processing to count pixel intensities.',
                '**SE lens.** Using the standard library `Counter` is a principle of reusing robust primitives. The alternative NOT chosen is manually looping and using `counts[w] = counts.get(w, 0) + 1`. The real tradeoff is that `Counter` is highly optimized in C and clearly communicates intent, but introduces an import that might feel like overhead for a trivial single-use script.'
              ],
              typeIt: true,
              solution: 'from collections import Counter\ntext = "the cat sat on the mat"\nwords = text.split()\nword_counts = Counter(words)\nprint("Top word count:", word_counts[\'the\'])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Dict comprehensions',
              prose: [
                'You have a dictionary of word counts, but you want to create a new dictionary containing only the words that appear more than once, or maybe map each word to its length. How can you build and filter a new dictionary in a single readable line without writing a full loop?',
                'Output: ``` {\'b\': 20, \'c\': 30} {1: \'a\', 2: \'b\', 3: \'c\'} ``` This proves that **dictionary comprehensions** can iterate, filter, and transform an existing dictionary (or any iterable) to build a new dictionary concisely, even swapping keys and values.'
              ],
              typeIt: true,
              solution: 'base_dict = {\'a\': 1, \'b\': 2, \'c\': 3}\nfiltered = {k: v * 10 for k, v in base_dict.items() if v > 1}\ninverted = {v: k for k, v in base_dict.items()}\nprint(filtered)\nprint(inverted)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Dict comprehensions — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `{ ... }` curly braces surrounding a `for` loop signify a dictionary comprehension (because of the `key: value` syntax inside).\n- `word: count` is the expression defining the key-value pair to insert into the new dictionary.\n- `for word, count in word_counts.items()` iterates over every key-value pair in the `word_counts` dictionary.\n- `if len(word) >= config[\'min_length\']` is an optional filter condition. The key-value pair is only included if the length of the string `word` is greater than or equal to the integer stored in `config[\'min_length\']`.\n- `print("Filtered counts:", long_words)` prints the resulting dictionary.',
                '**Expected behavior.** Predicted confidently: Filtered counts: {\'the\': 2, \'cat\': 1, \'sat\': 1, \'mat\': 1}',
                '**CS lens.** Comprehensions represent declarative programming and map/filter operations. This declarative approach appears in SQL queries (`SELECT ... WHERE`), in functional programming languages (like Haskell\'s list comprehensions), and in big data processing pipelines (like Spark transformations).',
                '**SE lens.** Using a comprehension embraces Pythonic expressiveness. The alternative NOT chosen is initializing an empty dictionary, looping, and using an `if` block with assignment. The real tradeoff is that comprehensions are concise and faster (implemented in C), but they can become unreadable if the filtering or mapping logic grows too complex.'
              ],
              typeIt: true,
              solution: 'long_words = {word: count for word, count in word_counts.items() if len(word) >= config[\'min_length\']}\nprint("Filtered counts:", long_words)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Ordered dicts and merging (Python 3.7+)',
              prose: [
                'If you have two configuration dictionaries, how do you combine them so that the settings from the second one override the first? And when you print them, will the keys come out in random order or the order you added them?',
                'Output: ``` {\'a\': 1, \'b\': 99, \'c\': 3} {\'a\': 1, \'b\': 99, \'c\': 3} ``` This proves that dictionaries can be **merged** using the unpacking syntax `{**d1, **d2}` or the union operator `|` (Python 3.9+). It also implicitly demonstrates that modern Python dictionaries preserve insertion order.'
              ],
              typeIt: true,
              solution: 'd1 = {\'a\': 1, \'b\': 2}\nd2 = {\'b\': 99, \'c\': 3}\nmerged = {**d1, **d2}\nmerged_op = d1 | d2\nprint(merged)\nprint(merged_op)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Ordered dicts and merging (Python 3.7+) — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `user_config = {\'language\': \'fr\', \'theme\': \'dark\'}` creates a new dictionary.\n- `final_config = config | user_config` uses the dictionary union operator `|` to merge `config` and `user_config`. Conflicts are resolved by keeping the value from `user_config` (the right operand).\n- `print(...)` prints the merged configuration.\n- `sorted(...)` is a built-in function that takes an iterable and returns a sorted list.\n- `long_words.items()` provides the iterable of key-value pairs to sort.\n- `key=lambda kv: kv[1]` provides a lambda function to sort by the dictionary values (the second element, index 1, of each tuple).\n- `reverse=True` sorts the values in descending order.\n- `dict(...)` takes the sorted list of tuples and converts it back into a dictionary. Because Python 3.7+ preserves insertion order, this new dictionary remains sorted.\n- `print("Sorted Counts:", sorted_counts)` prints the sorted dictionary.',
                '**Expected behavior.** Predicted confidently: Final Config: {\'case_sensitive\': False, \'min_length\': 3, \'language\': \'fr\', \'theme\': \'dark\'} Sorted Counts: {\'the\': 2, \'cat\': 1, \'sat\': 1, \'mat\': 1}',
                '**CS lens.** Merging structures and maintaining insertion order are foundational concepts. This appears in configuration management systems (cascading overrides like base config -> env config -> user config), in LRU caches (which depend on insertion/access order), and in log aggregators that merge structured JSON logs.',
                '**SE lens.** Using the `|` operator provides declarative clarity. The alternative NOT chosen is using `config.copy()` and then `config.update(user_config)`. The real tradeoff is that the union operator creates a new dictionary cleanly and functional-style, but it requires Python 3.9+.'
              ],
              typeIt: true,
              solution: 'user_config = {\'language\': \'fr\', \'theme\': \'dark\'}\nfinal_config = config | user_config\nprint("Final Config:", final_config)\nsorted_counts = dict(sorted(long_words.items(), key=lambda kv: kv[1], reverse=True))\nprint("Sorted Counts:", sorted_counts)',
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
      'Next lesson: Sets.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Value"?',
      options: [
        'The underlying computer science data structure that powers Python dictionaries, using a hash function to compute an index into an array of buckets or slots.',
        'An exception raised when a dictionary key is not found in the set of existing keys.',
        'The data associated with a key in a dictionary. Values can be of any type, can be mutable, and can be duplicated across different keys.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "KeyError"?',
      options: [
        'An object is hashable if it has a hash value which never changes during its lifetime, and can be compared to other objects. Immutable types like strings and numbers are hashable.',
        'A data structure that stores key-value pairs, providing average O(1) time complexity for lookups, insertions, and deletions. It trades memory for speed, avoiding linear searches.',
        'An exception raised when a dictionary key is not found in the set of existing keys.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Hashable"?',
      options: [
        'An exception raised when a dictionary key is not found in the set of existing keys.',
        'The underlying computer science data structure that powers Python dictionaries, using a hash function to compute an index into an array of buckets or slots.',
        'An object is hashable if it has a hash value which never changes during its lifetime, and can be compared to other objects. Immutable types like strings and numbers are hashable.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Hash Map"?',
      options: [
        'The data associated with a key in a dictionary. Values can be of any type, can be mutable, and can be duplicated across different keys.',
        'The underlying computer science data structure that powers Python dictionaries, using a hash function to compute an index into an array of buckets or slots.',
        'An exception raised when a dictionary key is not found in the set of existing keys.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Dictionary** — A data structure that stores key-value pairs, providing average O(1) time complexity for lookups, insertions, and deletions. It trades memory for speed, avoiding linear searches.',
    '**Key** — The unique identifier used to look up a value in a dictionary. Keys must be immutable (hashable), such as strings, integers, floats, or tuples.',
    '**Value** — The data associated with a key in a dictionary. Values can be of any type, can be mutable, and can be duplicated across different keys.',
    '**Hash Map** — The underlying computer science data structure that powers Python dictionaries, using a hash function to compute an index into an array of buckets or slots.',
    '**Hashable** — An object is hashable if it has a hash value which never changes during its lifetime, and can be compared to other objects. Immutable types like strings and numbers are hashable.',
    '**KeyError** — An exception raised when a dictionary key is not found in the set of existing keys.',
    '**Iterable** — An object capable of returning its members one at a time, allowing it to be iterated over in a for-loop.',
    '**Comprehension** — A concise syntax for creating a new dictionary by iterating over an iterable and applying an expression to each item.',
  ],

  checkpoints: ['read-intuition'],
}
