export default {
  id:'a-14',slug:'dictionaries-and-sets',track:'A',order:14,
  title:'Dictionaries and Sets',subtitle:'Key-Value Mapping and Uniqueness',
  tags:['dict','set','hashmap','lookup','comprehension','O1'],
  prereqs:['a-13'],unlocks:['a-15','b-01'],
  hook:{question:'How do you store data by name rather than by position?',realWorldContext:'Dictionaries are the data structure of data science. JSON is a dict. A DataFrame row is a dict. A word frequency counter is a dict. Any time you need fast lookup by key, you need a dict.'},
  intuition:{
    prose:['A **dictionary** maps keys to values. Python stores it as a **hash table**: it computes a number (the *hash*) from the key and uses it to jump near the right slot, instead of scanning every entry like a list search. So lookup takes **constant time on average**, written O(1): a dict with a million keys is not a million times slower to search than one with ten. It is not literally instant, and unlucky keys that collide can make individual lookups slower, but for everyday data it is an excellent approximation. Keys must be **hashable**: strings, numbers, and tuples of hashable things work; lists, dicts and sets do not, and neither does a tuple that contains a list. Values can be anything.',
      'A **set** is like a dictionary with only keys, no values. It stores unique elements, so its elements must be hashable too. Set operations — union, intersection, difference — correspond directly to mathematical set theory, and membership tests (`x in s`) are average-case constant time.',
      '**Dict comprehension** builds a dict from an expression: `{k: v for k, v in iterable}`. It is to dicts what list comprehension is to lists.'],
    callouts:[{type:'important',title:'.get() vs Direct Access',body:`d = {"a": 1}
d["b"]       # KeyError — key does not exist
d.get("b")   # None — no error
d.get("b",0) # 0 — default value

Always use .get() when the key might not exist.`}],
    visualizations:[{id:'PythonNotebook',title:'Dictionaries and Sets',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — Dict Basics',prose:'Create, read, update, and delete dict entries.',instructions:'Run. Notice dict["missing_key"] crashes but .get() does not.',code:`d = {"name":"Alice","age":30,"city":"NYC"}
print(d["name"])
print(d.get("salary",0))  # default 0
d["age"] = 31             # update
d["email"] = "a@b.com"    # add new key
print(d)`,output:'',status:'idle'},
      {id:2,cellTitle:'Stage 2 — Iterating Dicts',prose:'Three ways to iterate: keys, values, or key-value pairs.',instructions:'Run. items() is most commonly used — gives both key and value.',code:`scores = {"Alice":92,"Bob":78,"Carol":85}
for k in scores:            # keys
    print(k)
for v in scores.values():   # values
    print(v)
for k,v in scores.items():  # pairs
    print(f"{k}: {v}")`,output:'',status:'idle'},
      {id:3,cellTitle:'Stage 3 — Word Frequency Counter',prose:'The classic dict pattern: count occurrences of each unique item.',instructions:'Run. Notice .get(word,0) is the key pattern — default 0 for unseen words.',code:`text = "the cat sat on the mat the cat"
freq = {}
for word in text.split():
    freq[word] = freq.get(word,0) + 1
print(freq)`,output:'',status:'idle'},
      {id:4,cellTitle:'Stage 4 — Sets',prose:'Sets store unique elements. Membership testing is average-case constant time, like dict lookup.',instructions:'Run. Notice {1,2,2,3} becomes {1,2,3} — duplicates removed automatically.',code:`print({1,2,2,3})  # {1, 2, 3}
a = {1,2,3,4}
b = {3,4,5,6}
print(a | b)   # union
print(a & b)   # intersection
print(a - b)   # difference (in a but not b)
print(2 in a)  # average-case O(1) membership test`,output:'',status:'idle'},
      {id:6,cellTitle:'Stage 4b — Which Keys Are Allowed?',prose:'A key must be **hashable**: Python must be able to compute a hash for it that never changes while it is stored. Strings, numbers and tuples of hashable values qualify. A list does not, because it can change. The rule is about hashability, not just "is the outer object immutable": a tuple is immutable, but a tuple containing a list is still unhashable.',instructions:'Predict which lines succeed before running. Then change the list key to a tuple, (2024, 1), and run again.',code:`sales = {}
sales["north"] = 120             # str key: fine
sales[(2024, 1)] = 95            # tuple of ints: fine
print(sales)

try:
    sales[(2024, [1, 2])] = 50   # tuple CONTAINING a list: unhashable
except TypeError as e:
    print("TypeError:", e)

try:
    sales[[2024, 1]] = 80        # list key: unhashable
except TypeError as e:
    print("TypeError:", e)`,output:'',status:'idle'},
      {id:5,cellTitle:'Stage 5 — Dict Comprehension',prose:'Build a dict in one expression.',instructions:'Run. The same pattern that produces list comprehensions produces dict comprehensions.',code:`names = ["Alice","Bob","Carol"]
lengths = {name: len(name) for name in names}
print(lengths)

# Filter with condition
long_names = {k:v for k,v in lengths.items() if v > 3}
print(long_names)`,output:'',status:'idle'},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Group By',difficulty:'medium',
        prompt:'Write group_by_first_letter(words) that returns a dict where each key is a letter and each value is a list of words starting with that letter.',
        instructions:`1. Initialize empty dict.
2. For each word, add to the list for that letter.
3. Use .get() or setdefault() to handle missing keys.`,
        code:`def group_by_first_letter(words):
    # Your code here
    pass

words = ["apple","avocado","banana","cherry","apricot","blueberry"]
print(group_by_first_letter(words))`,output:'',status:'idle',
        testCode:`
result=group_by_first_letter(["apple","avocado","banana","cherry","apricot","blueberry"])
assert sorted(result["a"])==["apple","apricot","avocado"],f"a: {result.get('a')}"
assert sorted(result["b"])==["banana","blueberry"],f"b: {result.get('b')}"
assert result["c"]==["cherry"],f"c: {result.get('c')}"
res="SUCCESS: Grouping by first letter — this is the split step of split-apply-combine."
res
`,hint:`def group_by_first_letter(words):
    result={}
    for w in words:
        letter=w[0]
        result.setdefault(letter,[]).append(w)
    return result`},
      {id:12,challengeType:'write',challengeNumber:2,challengeTitle:'Challenge 2 — Invert a Dict',difficulty:'medium',
        prompt:'Write invert(d) that swaps keys and values. Input: {"a":1,"b":2,"c":3}. Output: {1:"a",2:"b",3:"c"}. Use a dict comprehension.',
        instructions:`1. Iterate over d.items().
2. Swap k and v in the comprehension.
3. One line.`,
        code:`def invert(d):
    # Your code here
    pass

print(invert({"a":1,"b":2,"c":3}))`,output:'',status:'idle',
        testCode:`
result=invert({"a":1,"b":2,"c":3})
if result!={1:"a",2:"b",3:"c"}: raise ValueError(f"Expected {{1:a,2:b,3:c}}, got {result}")
res="SUCCESS: Dict inversion with comprehension — {v:k for k,v in d.items()}"
res
`,hint:`def invert(d):
    return {v:k for k,v in d.items()}`},
    ]}}],
  },
  mentalModel:['Dict maps keys→values. Lookup is average-case constant time (O(1)), not literally instant. Keys must be hashable — a tuple containing a list is not.','Always use .get(key, default) when the key might not exist.','Set stores unique elements. Union |, intersection &, difference -.','Word frequency counter: freq[word] = freq.get(word,0) + 1','Dict comprehension: {k:v for k,v in iterable}'],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Why is dictionary lookup O(1) rather than O(n) like a list search?',
      options: [
        'Dictionaries are sorted, so binary search (O(log n)) applies, which is approximately O(1) for small dicts',
        'Dictionaries use a hash table — the key\'s hash tells Python where to look, so lookup does not scan all entries; on average it takes about the same time whatever the dict size (collisions can occasionally make it slower)',
        'Python caches the last N lookups, so repeated lookups are O(1) due to caching',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'd = {"a": 1}; d["b"] raises a KeyError. What does d.get("b", 0) return instead?',
      options: [
        'None — .get() always returns None for missing keys',
        '0 — .get(key, default) returns the default value (0 here) when the key is absent, instead of raising KeyError',
        'KeyError — .get() and direct access behave identically',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'set([1, 2, 2, 3, 3, 3]) produces what?',
      options: [
        '[1, 2, 2, 3, 3, 3] — sets preserve the input',
        '{1, 2, 3} — sets store only unique elements; duplicates are automatically discarded',
        '{1: 1, 2: 2, 3: 3} — sets convert to dictionaries with keys equal to values',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Why must dictionary keys be hashable (e.g., strings, numbers, tuples of these — not lists)?',
      options: [
        'Python syntax requires immutable keys to prevent accidental modification during iteration',
        'Dict lookup uses a hash of the key to find its slot; if a key could change (like a list), its hash would change and the key would become unfindable after it is stored — so Python only accepts keys whose hash cannot change, which rules out lists and also tuples that contain lists',
        'Immutable keys are faster to compare because Python can use pointer equality instead of value equality',
      ],
      correct: 1,
    },
  ],
}