# Tries

Type "algo" into a search box and suggestions appear: algorithm, algorithms, algebra… For that, the program needs to find every stored word that **starts with** a given prefix, on every keystroke, fast. A hash table can say whether "algorithm" is stored, but it has no idea which words begin with "algo". A sorted list can answer with two binary searches. A **trie** (from re**trie**val, usually pronounced "try") is a tree built for exactly this: it stores strings character by character, so that all words sharing a prefix share a path from the root.

This lesson covers:

- the trie's structure: one node per prefix, with children indexed by the next character;
- insertion and lookup in O(length of the word), independent of how many words are stored;
- prefix queries and autocomplete;
- counting words by prefix, and deleting;
- when tries beat hash tables and sorted lists, and what they cost in memory.

## The structure

Each trie node represents a **prefix**. The root represents the empty string; its children represent one-letter prefixes; their children, two-letter prefixes; and so on. A node's children are kept in a dictionary from the next character to the child node. A word is stored by walking (and, where needed, creating) the path for its characters, and marking the final node as the **end of a word**: necessary because a stored word can be a prefix of another ("car" and "card"). Predict before running: how many nodes (including the root) will storing car, card, care, cat and dog create?

```python type
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
        self.nodes = 1

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
                self.nodes += 1
            node = node.children[ch]
        node.is_word = True

    def _find(self, prefix):
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def contains(self, word):
        node = self._find(word)
        return node is not None and node.is_word

    def has_prefix(self, prefix):
        return self._find(prefix) is not None

def show(node, prefix="", depth=0):
    for ch, child in sorted(node.children.items()):
        print("   " * depth + ch + ("  <- " + prefix + ch if child.is_word else ""))
        show(child, prefix + ch, depth + 1)

trie = Trie()
for w in ["car", "card", "care", "cat", "dog"]:
    trie.insert(w)
show(trie.root)
print("nodes:", trie.nodes)
print("contains car:", trie.contains("car"), " contains ca:", trie.contains("ca"), " has prefix ca:", trie.has_prefix("ca"), " contains cart:", trie.contains("cart"))
```

```output
c
   a
      r  <- car
         d  <- card
         e  <- care
      t  <- cat
d
   o
      g  <- dog
nodes: 10
contains car: True  contains ca: False  has prefix ca: True  contains cart: False
```

`_find` walks the path for a prefix and returns its node, or `None` as soon as a character has no child; `contains` and `has_prefix` both use it.

The five words share their common beginnings: c-a is stored once for four words, and car, card and care share c-a-r. That makes 10 nodes including the root, against 17 characters in the words. "ca" is a prefix but not a word: its node exists, but is not marked. Lookup walks one node per character: O(m) for a word of length m, whether the trie holds five words or five million.

## Autocomplete

To list every word with a given prefix, find the prefix's node, then collect every word in the subtree below it with a depth-first traversal, building each word as the path grows. Visiting children in sorted order returns the words in alphabetical order. Predict before running: what are the suggestions for "re" from the word list below, and how many nodes does the search visit, compared with the size of the trie?

```python type
import random

def words_with_prefix(trie, prefix, limit=None):
    start = trie._find(prefix)
    if start is None:
        return [], 0
    found, visited = [], 0
    stack = [(start, prefix)]
    while stack and (limit is None or len(found) < limit):
        node, text = stack.pop()
        visited += 1
        if node.is_word:
            found.append(text)
        for ch in sorted(node.children, reverse=True):
            stack.append((node.children[ch], text + ch))
    return found, visited

vocabulary = """read reader reading ready real realise really reason recent record red reduce refer
region relate release remain remember remove repair repeat reply report rest result return
review rice rich ride right ring rise river road rock role roll room root rope rose round route
row rule run rush""".split()
words = Trie()
for w in vocabulary:
    words.insert(w)
suggestions, visited = words_with_prefix(words, "re", limit=8)
print("first 8 for 're':", suggestions)
print(f"visited {visited} nodes; the trie has {words.nodes}")
print("for 'ro':", words_with_prefix(words, "ro")[0])
print("for 'rx':", words_with_prefix(words, "rx")[0])
```

```output
first 8 for 're': ['read', 'reader', 'reading', 'ready', 'real', 'realise', 'really', 'reason']
visited 18 nodes; the trie has 126
for 'ro': ['road', 'rock', 'role', 'roll', 'room', 'root', 'rope', 'rose', 'round', 'route', 'row']
for 'rx': []
```

The stack holds pairs of a node and the text spelled on the way to it. Pushing children in **reverse** sorted order makes the alphabetically first child come off the stack first, so words are found in alphabetical order.

The first eight "re" words come out alphabetically, and the search stopped as soon as it had eight, visiting 18 of the trie's 126 nodes. A prefix with no matches, like "rx", fails at its second character without visiting anything. The cost of a query is O(prefix length + size of the part of the trie it explores), which for autocomplete with a limit is small however large the vocabulary.

## Counting by prefix

Many questions are about **how many** words have a prefix, not which. Walking the whole subtree each time would be slow for short prefixes. Instead, store in every node the number of words passing through it, updated during insertion: then "how many words start with re?" is just a walk to the node and a read. Predict before running: how many vocabulary words start with "r", "re" and "rea"?

```python type
class CountingTrie(Trie):
    def insert(self, word):
        if self.contains(word):
            return
        node = self.root
        node.count = getattr(node, "count", 0) + 1
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
                self.nodes += 1
            node = node.children[ch]
            node.count = getattr(node, "count", 0) + 1
        node.is_word = True

    def count_prefix(self, prefix):
        node = self._find(prefix)
        return 0 if node is None else node.count

counting = CountingTrie()
for w in vocabulary:
    counting.insert(w)
for p in ["r", "re", "rea", "ro", "x"]:
    print(f"words starting with {p!r}: {counting.count_prefix(p)}")
```

```output
words starting with 'r': 48
words starting with 're': 27
words starting with 'rea': 8
words starting with 'ro': 11
words starting with 'x': 0
```

`CountingTrie` inherits `_find` and `contains` from `Trie` and only replaces `insert`. `getattr(node, "count", 0)` reads the count, treating a node that has none yet as 0. A word inserted twice is counted once, thanks to the `contains` check.

All 48 vocabulary words start with "r", 27 of them with "re" and 8 with "rea", each answered by a walk of at most three nodes. The same idea (store a summary in each node, maintained on the way down) appears again in the next lesson's segment trees.

## Tries compared

How does a trie compare with the alternatives for a set of n words of average length m?

- A **hash set** answers "is this word stored?" in O(m) on average (hashing reads the whole word), with less memory, but cannot answer prefix questions at all without scanning everything.
- A **sorted list** answers prefix questions with two binary searches, O(m log n), and uses little memory, but inserting is O(n).
- A **trie** answers both kinds of question in O(m), independent of n, and inserts in O(m). The cost is **memory**: a node per distinct prefix, each with its own dictionary, which in Python is many times the size of the words themselves.

Tries win when prefix queries matter: autocomplete, spell checkers, routing tables in network routers (which match the longest prefix of an address), and word games. Compressed variants, which merge chains of single-child nodes into one edge labelled with a whole string, reduce the memory.

::: challenge Longest common prefix [easy]
Write `longest_common_prefix(words)` that inserts all the words into a `Trie` and then walks down from the root while the current node has exactly **one** child and is not the end of a word, collecting the characters. Return the collected prefix (`""` for an empty list).

```python starter
def longest_common_prefix(words):
    return ""

print(longest_common_prefix(["interview", "internet", "interval", "internal"]))
```

```python solution
def longest_common_prefix(words):
    if not words:
        return ""
    t = Trie()
    for w in words:
        t.insert(w)
    node, prefix = t.root, ""
    while len(node.children) == 1 and not node.is_word:
        ch, node = next(iter(node.children.items()))
        prefix += ch
    return prefix

print(longest_common_prefix(["interview", "internet", "interval", "internal"]))
```

```python test
import os as _os
assert "longest_common_prefix" in dir(), "Keep the function's name as longest_common_prefix."
for _ws, _want in [(["interview", "internet", "interval", "internal"], "inter"), (["dog", "cat"], ""), (["same", "same"], "same"),
                   (["car", "card"], "car"), ([], ""), (["solo"], "solo"), (["", "a"], ""), (["ab", "abc", "abd"], "ab")]:
    assert longest_common_prefix(_ws) == _want, f"longest_common_prefix({_ws}) should be {_want!r}, got {longest_common_prefix(_ws)!r}."
for _ws in [["flower", "flow", "flight"], ["prefix", "prefixes", "pre"], ["x", "xy", "xyz"]]:
    assert longest_common_prefix(_ws) == _os.path.commonprefix(_ws), f"Wrong answer for {_ws}."
assert "Trie(" in _source, "Build a Trie and walk its single-branch trunk."
"SUCCESS: The common prefix is the trie's single-branch trunk: it ends where the paths fork or where a whole word ends."
```

Hint: Build the trie. Starting at the root, while the node has exactly one child and `is_word` is False, step into that child and add its character. `next(iter(node.children.items()))` gives the only (character, child) pair.
:::

::: challenge Delete a word [medium]
Add `delete(self, word)` to `Trie`: if the word is stored, unmark its end node and **remove any nodes that no longer lead to a word**, decreasing `self.nodes` accordingly; return `True`. If the word is not stored, change nothing and return `False`. A recursive helper that returns "this child can be removed" works well: a node can be removed if it is not the end of a word and has no children left.

```python starter
def delete(self, word):
    return False

Trie.delete = delete

t = Trie()
for w in ["car", "card", "cat"]:
    t.insert(w)
print(t.delete("card"), t.contains("card"), t.contains("car"), t.nodes)
```

```python solution
def delete(self, word):
    if not self.contains(word):
        return False

    def remove(node, depth):
        if depth == len(word):
            node.is_word = False
        else:
            ch = word[depth]
            child = node.children[ch]
            if remove(child, depth + 1):
                del node.children[ch]
                self.nodes -= 1
        return not node.is_word and not node.children

    remove(self.root, 0)
    return True

Trie.delete = delete

t = Trie()
for w in ["car", "card", "cat"]:
    t.insert(w)
print(t.delete("card"), t.contains("card"), t.contains("car"), t.nodes)
```

```python test
import random as _random
_t = Trie()
for _w in ["car", "card", "cat"]:
    _t.insert(_w)
assert _t.nodes == 6, "Setup: car, card and cat make 6 nodes including the root."
assert _t.delete("card") is True and not _t.contains("card") and _t.contains("car") and _t.nodes == 5, "Deleting card removes only its 'd' node."
assert _t.delete("ca") is False and _t.nodes == 5, "ca is a prefix, not a stored word: return False and change nothing."
assert _t.delete("car") is True and _t.nodes == 4 and _t.contains("cat") and _t.has_prefix("ca"), "Deleting car removes its 'r' node but keeps c-a, still used by cat."
assert _t.delete("cat") is True and _t.nodes == 1 and _t.root.children == {}, "Deleting the last word should leave only the root."
assert _t.delete("cat") is False, "Deleting a word twice returns False the second time."
_r = _random.Random(1); _t2 = Trie(); _ref = set()
for _ in range(400):
    _w = "".join(_r.choice("ab") for _ in range(_r.randint(1, 4)))
    if _r.random() < 0.5:
        _t2.insert(_w); _ref.add(_w)
    else:
        assert _t2.delete(_w) == (_w in _ref), f"delete({_w!r}) returned the wrong result."
        _ref.discard(_w)
_fresh = Trie()
for _w in _ref:
    _fresh.insert(_w)
assert _t2.nodes == _fresh.nodes, f"After random inserts and deletes the trie has {_t2.nodes} nodes, but a fresh trie of the same words has {_fresh.nodes}: remove nodes that no longer lead to a word."
"SUCCESS: Unmark, then prune upwards only while nodes have become useless: the trie ends up exactly as if the word had never been inserted."
```

Hint: Check `contains` first. Then recurse along the word: at the end, set `is_word = False`; on the way back, if the child reports it can be removed, delete it from `children` and decrease `self.nodes`. Each call returns whether its own node is now removable.
:::

::: challenge Word search with wildcards [medium]
Write `matches(trie, pattern)` returning a sorted list of all stored words matching `pattern`, where `.` matches any single character and other characters match themselves (the word must have exactly the pattern's length). Explore the trie recursively: for a normal character follow that one child; for `.` follow **every** child.

```python starter
def matches(trie, pattern):
    return []

print(matches(words, "r..d"), matches(words, "re..."))
```

```python solution
def matches(trie, pattern):
    found = []

    def walk(node, i, text):
        if i == len(pattern):
            if node.is_word:
                found.append(text)
            return
        ch = pattern[i]
        if ch == ".":
            for c, child in node.children.items():
                walk(child, i + 1, text + c)
        elif ch in node.children:
            walk(node.children[ch], i + 1, text + ch)

    walk(trie.root, 0, "")
    return sorted(found)

print(matches(words, "r..d"), matches(words, "re..."))
```

```python test
import re as _re
assert "matches" in dir(), "Keep the function's name as matches."
for _p in ["r..d", "re...", "....", "rose", "r", "....s", "x..", ".", "re..r", "......"]:
    _want = sorted(w for w in vocabulary if _re.fullmatch(_p, w))
    assert matches(words, _p) == _want, f"matches(words, {_p!r}) should be {_want}, got {matches(words, _p)}."
_t = Trie()
assert matches(_t, "..") == [], "An empty trie matches nothing."
"SUCCESS: A wildcard branches into every child, a letter into one: the trie prunes every word that fails at an early character, without looking at the rest of it."
```

Hint: A recursive helper `walk(node, i, text)`: when `i` reaches the pattern's length, record `text` if `node.is_word`. Otherwise, for `.` recurse into all children, and for a letter recurse into that child if it exists.
:::

## What you learned

- A trie stores strings one character per level; each node is a prefix, with children in a dictionary and a flag marking the ends of words.
- Insertion, lookup and prefix checks cost O(length of the word), independent of how many words are stored.
- Prefix queries find the prefix's node and explore only its subtree; storing counts in nodes answers "how many words start with this?" in one walk.
- Tries beat hash sets and sorted lists at prefix queries, at the price of memory; they power autocomplete, spell checking and longest-prefix routing.

The next lesson stores summaries in tree nodes to answer range questions over arrays that keep changing: segment trees and Fenwick trees.
