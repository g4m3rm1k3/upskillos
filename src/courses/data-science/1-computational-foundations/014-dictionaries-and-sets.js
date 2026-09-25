import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-14', slug: 'dictionaries-and-sets', track: 'A', order: 14,
  title: 'Dictionaries and Sets', subtitle: 'Key-Value Mapping and Uniqueness',
  tags: ['dict', 'set', 'hashmap', 'lookup', 'comprehension', 'O1'],
  prereqs: ['a-13'], unlocks: ['a-15', 'b-01'],
  hook: {
    question: 'How do you store data by name rather than by position?',
    realWorldContext: 'Much of data work is looking things up by name and adding things up by category: stock per product, sales per region, how many distinct customers. Dictionaries and sets are the built-in tools for exactly that.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Store and look up values by key, and handle a missing key deliberately. Add up repeated items into per-category totals. Use a set to find the distinct values in some data, and explain why keys and set items must be hashable.',
        '**The smallest example.** A **dictionary** (dict) maps **keys** to **values**:',
        '```python\ninventory = {"apples": 5, "pears": 2}\n```',
        '| Key | → | Value |\n|---|---|---|\n| "apples" | → | 5 |\n| "pears" | → | 2 |',
        '`inventory["apples"]` looks up the value for the key "apples", which is 5. `inventory["plums"] = 7` adds a new key; assigning to an existing key replaces its value. Each key appears at most once.',
        '**Missing keys, handled on purpose.** Looking up a key that is not there raises KeyError. You have three explicit choices:',
        '| Code | When "plums" is missing | Use it when |\n|---|---|---|\n| `inventory["plums"]` | KeyError | the key must exist — a missing key means a bug you want to see |\n| `inventory.get("plums", 0)` | returns 0 | a missing key has a sensible default |\n| `"plums" in inventory` | False | you need to branch on whether it exists |',
        'Do not use `.get()` everywhere by habit: if the key is misspelled, `.get()` quietly returns the default and hides the typo.',
      ),
      check(
        'What does `inventory.get("plums", 0)` return when "plums" is not a key?',
        ['None', '0', 'KeyError'],
        1,
        '`.get(key, default)` returns the default for a missing key. With no default given, it returns None.',
      ),
      notebook('Dictionary basics', [
        demo(1, 'Stage 1 — Look up, add, update, remove', [
          'Each line reads or changes the mapping.',
        ], 'Predict each print, then run. Then add a key "kiwis" with value 0.', 'inventory = {"apples": 5, "pears": 2}\nprint(inventory["apples"])\ninventory["plums"] = 7       # add\ninventory["apples"] = 4      # replace\ndel inventory["pears"]       # remove\nprint(inventory)\nprint(inventory.get("pears", 0), "pears" in inventory, len(inventory))', { expectOutput: ['5', "{'apples': 4, 'plums': 7}", '0 False 2'] }),
        demo(2, 'Stage 2 — A missing key', [
          'Square-bracket lookup of a key that does not exist raises KeyError; the message names the key.',
        ], 'Run and read the error. Then fix it two ways: with .get() and a default, and with an in check.', 'inventory = {"apples": 5, "pears": 2}\nprint(inventory["plums"])', { expectError: 'KeyError' }),
        demo(3, 'Stage 3 — Looping over a dict', [
          '`.items()` gives key and value pairs. Dicts keep the order in which keys were first added.',
        ], 'Run. Then print only the items with fewer than 3 in stock.', 'inventory = {"apples": 5, "pears": 2, "plums": 7}\nfor item, count in inventory.items():\n    print(item, count)\nprint(list(inventory.keys()), sum(inventory.values()))', { expectOutput: ['apples 5', "['apples', 'pears', 'plums'] 14"] }),
      ]),
      prose(
        '**Adding up repeated items.** A very common task: records arrive one at a time, with the same category repeated, and you need a total per category. The dict holds one running total per key; `.get(item, 0)` supplies 0 the first time an item is seen.',
        '```python\norders = [("apple", 2), ("pear", 1), ("apple", 3)]\ntotals = {}\nfor item, qty in orders:\n    totals[item] = totals.get(item, 0) + qty\n```',
        '| Record | totals before | totals after |\n|---|---|---|\n| ("apple", 2) | {} | {"apple": 2} |\n| ("pear", 1) | {"apple": 2} | {"apple": 2, "pear": 1} |\n| ("apple", 3) | {"apple": 2, "pear": 1} | {"apple": 5, "pear": 1} |',
        'Writing `totals[item] = qty` instead would *replace* the earlier apple total rather than add to it.',
      ),
      check(
        'If the loop body were `totals[item] = qty`, what would `totals["apple"]` be at the end?',
        ['5', '3', '2'],
        1,
        'Assignment replaces the value: the second apple record overwrites 2 with 3. Adding requires reading the current total first.',
      ),
      notebook('Aggregating', [
        demo(4, 'Stage 4 — Totals per category', [
          'The trace table above, in code.',
        ], 'Run and compare with the table. Then add the order ("pear", 4) and predict the new totals.', 'orders = [("apple", 2), ("pear", 1), ("apple", 3)]\ntotals = {}\nfor item, qty in orders:\n    totals[item] = totals.get(item, 0) + qty\nprint(totals)', { expectOutput: ["{'apple': 5, 'pear': 1}"] }),
        demo(5, 'Stage 5 — Counting words', [
          'Counting is aggregation where every record adds 1.',
        ], 'Run. Which word is most common? Then count letters in "banana" the same way.', 'text = "the cat sat on the mat the end"\ncounts = {}\nfor word in text.split():\n    counts[word] = counts.get(word, 0) + 1\nprint(counts)', { expectOutput: ["'the': 3"] }),
      ]),
      prose(
        '**Why lookup is fast, and which keys are allowed.** A dict is stored as a **hash table**: Python computes a number (the *hash*) from each key and uses it to jump close to where that key is stored, instead of scanning every entry. So lookup takes constant time *on average* — written O(1) — whether the dict has ten keys or a million. It is not literally instant, and keys whose hashes collide can make some lookups slower, but it is an excellent approximation for everyday data.',
        'This only works if a key\'s hash can never change while it is stored, so keys must be **hashable**: strings, numbers and tuples of hashable values work; lists, dicts and sets do not — and neither does a tuple that *contains* a list, even though the tuple itself cannot change.',
      ),
      notebook('Hashable keys', [
        demo(6, 'Stage 6 — Which keys are allowed?', [
          'Strings and tuples of numbers are fine. A list, or a tuple containing a list, raises TypeError.',
        ], 'Predict which lines succeed. Then change the list key to the tuple (2024, 1).', 'sales = {}\nsales["north"] = 120\nsales[(2024, 1)] = 95\nprint(sales)\n\nfor bad_key in [(2024, [1, 2]), [2024, 1]]:\n    try:\n        sales[bad_key] = 50\n    except TypeError as e:\n        print("TypeError:", e)', { expectOutput: ["{'north': 120, (2024, 1): 95}", "TypeError: unhashable type: 'list'"] }),
      ]),
      prose(
        '**Sets: distinct values.** A **set** holds unique, hashable items with no values attached: `{"red", "blue"}`. Adding an item that is already there changes nothing, so `set(data)` finds the distinct values in some data, and `len(set(data))` counts them. Sets have no order and no positions. They support membership tests (`x in s`, average-case constant time) and set algebra:',
        '| Operation | `a = {1, 2, 3, 4}`, `b = {3, 4, 5}` | Meaning |\n|---|---|---|\n| `a \\| b` | {1, 2, 3, 4, 5} | in either |\n| `a & b` | {3, 4} | in both |\n| `a - b` | {1, 2} | in a but not b |',
        'Uniqueness depends on exact values: "Red", "red" and "red " are three different strings. Clean the text before asking how many distinct categories there are.',
      ),
      notebook('Sets', [
        demo(7, 'Stage 7 — Distinct values and set algebra', [
          'The duplicates disappear. Notice that the three spellings of red are all kept until the text is normalised.',
        ], 'Predict each line. Then find which colours appear in both surveys.', 'answers = ["red", "blue", "red", "Red", "red "]\nprint(len(answers), len(set(answers)))\nclean = {a.strip().lower() for a in answers}\nprint(sorted(clean))\n\na, b = {1, 2, 3, 4}, {3, 4, 5}\nprint(a | b, a & b, a - b)', { expectOutput: ['5 4', "['blue', 'red']", '{1, 2, 3, 4, 5} {3, 4} {1, 2}'] }),
      ]),
      prose(
        '**Dict comprehensions** build a dict in one expression, like list comprehensions: `{name: len(name) for name in names}`. One caution when you swap keys and values: two keys with the same value become one key, so information is lost.',
      ),
      notebook('Comprehensions', [
        demo(8, 'Stage 8 — Building and inverting', [
          'Inverting {"a": 1, "b": 2, "c": 1} produces only two keys, because the value 1 appeared twice and the later "c" replaced "a".',
        ], 'Run. Then invert a dict whose values are all different, and check nothing is lost.', 'names = ["Alice", "Bob", "Carol"]\nprint({name: len(name) for name in names})\n\nd = {"a": 1, "b": 2, "c": 1}\ninverted = {v: k for k, v in d.items()}\nprint(inverted)', { expectOutput: ["{'Alice': 5, 'Bob': 3, 'Carol': 5}", "{1: 'c', 2: 'b'}"] }),
      ]),
      prose('**Practice.** Challenge 1 groups items by key. Challenge 2 aggregates repeated records. Challenge 3 is a fresh problem about distinct categories in messy data.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Group by first letter', 'medium', {
          prompt: 'Write group_by_first_letter(words) returning a dict from each first letter to the list of words starting with it, in their original order.',
          instructions: 'For each word, get its first letter with `word[0]`. If the letter is new, start an empty list; then append the word to that letter\'s list.',
          code: 'def group_by_first_letter(words):\n    result = {}\n    for w in words:\n        result[w[0]] = [w]\n    return result\n\nprint(group_by_first_letter(["apple", "avocado", "banana"]))',
          testCode: `got = group_by_first_letter(["apple", "avocado", "banana", "cherry", "apricot", "blueberry"])
assert got.get("a") != ["apricot"], "Each new word REPLACED the letter's list. Append to the existing list instead"
assert got == {"a": ["apple", "avocado", "apricot"], "b": ["banana", "blueberry"], "c": ["cherry"]}, f"Got {got}"
"SUCCESS: one list per letter, growing as words arrive — the 'split' step of split-apply-combine."`,
          hint: 'if w[0] not in result:\n    result[w[0]] = []\nresult[w[0]].append(w)',
          solution: 'def group_by_first_letter(words):\n    result = {}\n    for w in words:\n        if w[0] not in result:\n            result[w[0]] = []\n        result[w[0]].append(w)\n    return result',
          misconceptions: [{ code: 'def group_by_first_letter(words):\n    result = {}\n    for w in words:\n        result[w[0]] = [w]\n    return result', feedback: 'Each new word REPLACED' }],
        }),
        exercise(12, 2, 'Challenge 2 — Revenue per region', 'medium', {
          prompt: 'Each sale is a (region, amount) pair. Build revenue, a dict from region to total amount.',
          instructions: 'Start with an empty dict. For each sale, add its amount to the region\'s running total, using 0 when the region is new.',
          code: 'sales = [("north", 120), ("south", 80), ("north", 30), ("east", 50), ("south", 20)]\nrevenue = {}\nfor region, amount in sales:\n    revenue[region] = amount',
          testCode: `assert revenue.get("north") != 30, "The north total is only the last sale: assignment replaced the earlier total. Add to it with revenue.get(region, 0) + amount"
assert revenue == {"north": 150, "south": 100, "east": 50}, f"Expected north 150, south 100, east 50; got {revenue}"
"SUCCESS: repeated regions accumulate into one total each."`,
          hint: 'revenue[region] = revenue.get(region, 0) + amount',
          solution: 'sales = [("north", 120), ("south", 80), ("north", 30), ("east", 50), ("south", 20)]\nrevenue = {}\nfor region, amount in sales:\n    revenue[region] = revenue.get(region, 0) + amount',
          misconceptions: [{ code: 'revenue = {"north": 30, "south": 20, "east": 50}', feedback: 'assignment replaced the earlier total' }],
        }),
        exercise(13, 3, 'Challenge 3 — Distinct categories in messy data', 'medium', {
          prompt: 'Survey answers were typed by hand, so capitalisation and spaces vary. Compute distinct_count, the number of distinct answers after cleaning, and most_common, the cleaned answer given most often.',
          instructions: 'Clean each answer with `.strip().lower()`. Use a set for the distinct count and a counting dict for the most common answer.',
          code: 'answers = ["Red", "blue", " red", "Green", "BLUE", "red", "green ", "Blue"]\ndistinct_count = len(set(answers))\nmost_common = None',
          testCode: `assert distinct_count != 8 and distinct_count != 7, "Counting raw answers treats 'Red', ' red' and 'red' as different. Clean each answer with .strip().lower() first"
assert distinct_count == 3, f"There are 3 distinct cleaned answers (red, blue, green); got {distinct_count}"
assert most_common in ("red", "blue"), f"most_common should be a cleaned answer; got {most_common!r}"
assert most_common == "red" or most_common == "blue", "Count each cleaned answer with a dict"
"SUCCESS: after cleaning there are 3 categories; red and blue are tied at 3 answers each."`,
          hint: 'clean = [a.strip().lower() for a in answers]\ndistinct_count = len(set(clean))\ncounts = {}\nfor a in clean:\n    counts[a] = counts.get(a, 0) + 1\nmost_common = max(counts, key=counts.get)',
          solution: 'answers = ["Red", "blue", " red", "Green", "BLUE", "red", "green ", "Blue"]\nclean = [a.strip().lower() for a in answers]\ndistinct_count = len(set(clean))\ncounts = {}\nfor a in clean:\n    counts[a] = counts.get(a, 0) + 1\nmost_common = max(counts, key=counts.get)',
          misconceptions: [{ code: 'answers = ["Red", "blue", " red", "Green", "BLUE", "red", "green ", "Blue"]\ndistinct_count = len(set(answers))\nmost_common = "red"', feedback: 'Clean each answer with .strip().lower() first' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'A dict maps unique keys to values; d[k] = v adds or replaces.',
    'Missing keys: d[k] raises KeyError (good when it must exist), d.get(k, default), or test k in d.',
    'Aggregate repeated items with totals[k] = totals.get(k, 0) + amount — assignment alone replaces.',
    'A set keeps distinct hashable items; clean text before counting distinct values.',
    'Lookup is average-case constant time because of hashing, so keys must be hashable.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Why is dictionary lookup fast even for very large dicts?',
      options: [
        'Dicts are sorted, so Python uses binary search',
        'The key\'s hash tells Python where to look, so it does not scan every entry — constant time on average',
        'Python caches recent lookups',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'You look up a product ID that should always exist. Which lookup should you use?',
      options: [
        'd.get(pid, 0), so the program never crashes',
        'd[pid] — if the ID is missing, a KeyError shows the bug instead of silently using 0',
        'Either — they behave the same',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'len(set(["NY", "ny", "NY "])) is what?',
      options: ['1', '3 — they are three different strings until the text is cleaned', '2'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Why can a tuple containing a list not be a dict key?',
      options: [
        'Tuples can never be keys',
        'Keys must be hashable; a tuple is hashable only if everything inside it is, and a list is not',
        'Lists inside tuples are converted to strings',
      ],
      correct: 1,
    },
  ],
}
