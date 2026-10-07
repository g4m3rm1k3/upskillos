# Binary search trees

A sorted list answers "is x here?" in O(log n) with binary search, but inserting a new item means shifting everything after it, O(n). A hash table inserts and looks up in O(1), but keeps no order: it cannot answer "what is the smallest key above 50?" or "list every key between 20 and 30". A **binary search tree** (BST) aims for both: ordered like a sorted list, with insertion and deletion as cheap as lookup.

It is a binary tree with one rule, the **BST property**: for every node, all keys in its **left** subtree are smaller than its key, and all keys in its **right** subtree are larger. Searching then works like binary search: compare with the node, and go left or right, discarding a whole subtree at each step. This lesson covers:

- search and insertion, following one path from the root;
- why an inorder traversal visits the keys in sorted order;
- deletion, with its three cases;
- ordered queries: minimum, floor and ranges;
- the catch: the cost depends on the tree's **height**, which depends on insertion order.

## Search and insert

To search for a key, start at the root. If the key equals the node's, found. If it is smaller, it can only be in the left subtree; if larger, only in the right. Repeat until found or until you fall off the tree at `None`, which means the key is absent. Insertion follows exactly the same path and attaches the new key where the search fell off. Predict before running: after inserting 50, 30, 70, 20, 40, 60, 80 in that order, what shape is the tree, and how many comparisons to find 60?

```python type
class BSTNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None

class BST:
    def __init__(self):
        self.root = None
        self.size = 0

    def insert(self, key):
        if self.root is None:
            self.root = BSTNode(key)
            self.size += 1
            return
        node = self.root
        while True:
            if key == node.key:
                return
            side = "left" if key < node.key else "right"
            child = getattr(node, side)
            if child is None:
                setattr(node, side, BSTNode(key))
                self.size += 1
                return
            node = child

    def search(self, key):
        node, comparisons = self.root, 0
        while node is not None:
            comparisons += 1
            if key == node.key:
                return True, comparisons
            node = node.left if key < node.key else node.right
        return False, comparisons

def show(node, depth=0):
    if node is not None:
        show(node.right, depth + 1)
        print("     " * depth + str(node.key))
        show(node.left, depth + 1)

tree = BST()
for k in [50, 30, 70, 20, 40, 60, 80]:
    tree.insert(k)
show(tree.root)
print("search 60:", tree.search(60), "  search 65:", tree.search(65), "  size:", tree.size)
```

```output
          80
     70
          60
50
          40
     30
          20
search 60: (True, 3)   search 65: (False, 3)   size: 7
```

`getattr(node, "left")` reads the attribute named by a string, and `setattr` assigns it, so one piece of code handles both sides. Inserting a key that is already present does nothing: this tree stores each key once, like a set.

The tree is perfectly balanced, with 50 at the root, 30 and 70 below it, and the rest as leaves. Finding 60 takes 3 comparisons (50, 70, 60); searching for the absent 65 also takes 3, falling off below 60. Search and insertion each follow one path from the root, so they cost O(height). For a balanced tree of n keys, the height is about log₂ n.

## Inorder is sorted order

An inorder traversal visits the left subtree, then the node, then the right subtree. By the BST property, everything in the left subtree is smaller than the node and everything in the right is larger, and the same holds inside each subtree. So inorder visits the keys **in increasing order**: a BST is a sorted list in disguise. Here the traversal is written as a **generator**, which yields keys one at a time and can be stopped early. Predict before running: what will the first three keys be?

```python type
def inorder_keys(node):
    if node is not None:
        yield from inorder_keys(node.left)
        yield node.key
        yield from inorder_keys(node.right)

print(list(inorder_keys(tree.root)))
keys = inorder_keys(tree.root)
print("first three:", [next(keys) for _ in range(3)])

def minimum(node):
    while node.left is not None:
        node = node.left
    return node.key

print("smallest:", minimum(tree.root))
```

```output
[20, 30, 40, 50, 60, 70, 80]
first three: [20, 30, 40]
smallest: 20
```

`yield from` hands on every value yielded by another generator, which is what makes the recursive generator work.

The keys come out sorted, and the generator stops after three without visiting the rest. The minimum needs no traversal at all: keep going left. That is O(height), as is the maximum (keep going right).

## Deletion

Deleting a key has three cases, depending on how many children its node has:

1. **No children** (a leaf): simply remove it.
2. **One child**: replace the node by its child; the subtree keeps the BST property.
3. **Two children**: the node's **successor**, the smallest key in its right subtree, is the next key in sorted order. Copy the successor's key into the node, then delete the successor from the right subtree; the successor has no left child, so that deletion is case 1 or 2.

The recursive version below returns the new root of each subtree, so the parent can relink to it. Predict before running: after deleting 50 (the root, with two children), what is the new root?

```python type
def delete(node, key):
    if node is None:
        return None
    if key < node.key:
        node.left = delete(node.left, key)
    elif key > node.key:
        node.right = delete(node.right, key)
    else:
        if node.left is None:
            return node.right
        if node.right is None:
            return node.left
        successor = minimum(node.right)
        node.key = successor
        node.right = delete(node.right, successor)
    return node

for k in [20, 70, 50]:
    tree.root = delete(tree.root, k)
    tree.size -= 1
    print(f"after deleting {k}: inorder {list(inorder_keys(tree.root))}, root {tree.root.key}")
show(tree.root)
```

```output
after deleting 20: inorder [30, 40, 50, 60, 70, 80], root 50
after deleting 70: inorder [30, 40, 50, 60, 80], root 50
after deleting 50: inorder [30, 40, 60, 80], root 60
     80
60
          40
     30
```

Deleting 20 (a leaf) removes it; 70 has two children, so its successor 80 takes its place; deleting the root 50 moves its successor, 60, up to the root. After every deletion the inorder list is still sorted, which is the quickest check that the BST property survived. This `delete` assumes the key is present; the size update would need a check otherwise.

## Ordered queries

What a BST offers over a hash table is **order**. The **floor** of x (the largest key ≤ x) and its **ceiling** (the smallest key ≥ x) each take one path down the tree. A **range query**, every key between lo and hi, is an inorder traversal that skips subtrees which cannot contain keys in the range, so it costs O(height + number of results), not O(n). The challenges build floor and range queries; first, the catch.

## Height decides everything

Every operation costs O(height). Inserting keys in random order gives a height around 2 to 3 times log₂ n: good. But inserting keys in **sorted** order makes every new key the largest so far, so it goes to the right of the previous one: the tree becomes a linked list of height n − 1, and every operation O(n). Predict before running: what heights for 1,000 keys inserted in random order and in sorted order?

```python type
import random
from collections import deque

def height_iterative(root):
    if root is None:
        return -1
    deepest, queue = 0, deque([(root, 0)])
    while queue:
        node, depth = queue.popleft()
        deepest = max(deepest, depth)
        for child in (node.left, node.right):
            if child is not None:
                queue.append((child, depth + 1))
    return deepest

random.seed(0)
n = 1_000
for name, order in [("random order", random.sample(range(n), n)), ("sorted order", list(range(n)))]:
    t = BST()
    for k in order:
        t.insert(k)
    found, comparisons = t.search(n - 1)
    print(f"{name}: height {height_iterative(t.root)}, searching for the largest key takes {comparisons} comparisons")
```

```output
random order: height 20, searching for the largest key takes 5 comparisons
sorted order: height 999, searching for the largest key takes 1000 comparisons
```

The height is computed level by level, without recursion, because the sorted tree is 1,000 levels deep, beyond Python's recursion limit.

Random order gives a height of 20 (log₂ 1,000 is about 10), so no search needs more than 21 comparisons, and finding the largest key took just 5 here. Sorted order gives height 999, and finding the largest key takes 1,000 comparisons: no better than a list. Sorted input is common (keys arriving in time order, IDs counting up), so a plain BST is risky. The next lesson's **balanced trees** fix this by restructuring the tree as it grows to keep the height O(log n) whatever the insertion order.

::: challenge Floor [easy]
Write `floor(root, x)` returning the largest key in the BST that is **at most** x, or `None` if every key is larger. Walk down from the root without recursion: if the node's key equals x, that is the answer; if it is larger than x, the floor must be in the left subtree; if smaller, the node is a candidate, but a better one might be in its right subtree.

```python starter
def floor(root, x):
    return None

demo = BST()
for k in [50, 30, 70, 20, 40, 60, 80]:
    demo.insert(k)
print(floor(demo.root, 65), floor(demo.root, 30), floor(demo.root, 10))
```

```python solution
def floor(root, x):
    node, best = root, None
    while node is not None:
        if node.key == x:
            return x
        if node.key > x:
            node = node.left
        else:
            best = node.key
            node = node.right
    return best

demo = BST()
for k in [50, 30, 70, 20, 40, 60, 80]:
    demo.insert(k)
print(floor(demo.root, 65), floor(demo.root, 30), floor(demo.root, 10))
```

```python test
import random as _random
assert "floor" in dir(), "Keep the function's name as floor."
_d = BST()
for _k in [50, 30, 70, 20, 40, 60, 80]:
    _d.insert(_k)
for _x, _want in [(65, 60), (30, 30), (10, None), (100, 80), (45, 40), (50, 50), (59, 50)]:
    assert floor(_d.root, _x) == _want, f"floor(..., {_x}) should be {_want}, got {floor(_d.root, _x)}."
assert floor(None, 5) is None, "An empty tree has no floor."
_r = _random.Random(1)
for _ in range(200):
    _ks = _r.sample(range(100), _r.randint(1, 20)); _t = BST()
    for _k in _ks:
        _t.insert(_k)
    _x = _r.randint(-5, 105)
    _want = max((k for k in _ks if k <= _x), default=None)
    assert floor(_t.root, _x) == _want, f"floor of {_x} among {sorted(_ks)} should be {_want}."
"SUCCESS: One path from the root, remembering the best candidate seen: O(height), and impossible with a hash table."
```

Hint: Keep `best = None`. At each node: equal means return x; key larger than x means go left; key smaller means record it as `best` and go right. When you fall off the tree, return `best`.
:::

::: challenge Is it a BST? [medium]
Write `is_bst(node, low=None, high=None)` that returns `True` if the binary tree rooted at `node` satisfies the BST property (all keys distinct). A common bug is to check only that each node's children are on the correct side of it: that misses a key deep in the left subtree that is larger than an ancestor. Instead, pass down the range of allowed keys: every key in a left subtree must be below its parent **and** within the bounds the parent had.

```python starter
def is_bst(node, low=None, high=None):
    return True

good = BSTNode(50); good.left = BSTNode(30); good.right = BSTNode(70); good.left.right = BSTNode(40)
bad = BSTNode(50); bad.left = BSTNode(30); bad.right = BSTNode(70); bad.left.right = BSTNode(60)
print(is_bst(good), is_bst(bad))
```

```python solution
def is_bst(node, low=None, high=None):
    if node is None:
        return True
    if low is not None and node.key <= low:
        return False
    if high is not None and node.key >= high:
        return False
    return is_bst(node.left, low, node.key) and is_bst(node.right, node.key, high)

good = BSTNode(50); good.left = BSTNode(30); good.right = BSTNode(70); good.left.right = BSTNode(40)
bad = BSTNode(50); bad.left = BSTNode(30); bad.right = BSTNode(70); bad.left.right = BSTNode(60)
print(is_bst(good), is_bst(bad))
```

```python test
import random as _random
assert "is_bst" in dir(), "Keep the function's name as is_bst."
_g = BSTNode(50); _g.left = BSTNode(30); _g.right = BSTNode(70); _g.left.right = BSTNode(40)
_b = BSTNode(50); _b.left = BSTNode(30); _b.right = BSTNode(70); _b.left.right = BSTNode(60)
assert is_bst(_g) is True, "A valid BST should give True."
assert is_bst(_b) is False, "60 is in 50's left subtree, so this is not a BST, even though 60 is correctly to the right of its parent 30."
assert is_bst(None) is True and is_bst(BSTNode(1)) is True, "Empty and single-node trees are BSTs."
_e = BSTNode(5); _e.left = BSTNode(5)
assert is_bst(_e) is False, "Keys must be distinct: a left child equal to its parent breaks the rule."
_r = _random.Random(2)
for _ in range(200):
    _t = BST()
    for _k in _r.sample(range(50), _r.randint(1, 12)):
        _t.insert(_k)
    assert is_bst(_t.root) is True, "Trees built by BST.insert are valid BSTs."
    _nodes = []
    _stack = [_t.root]
    while _stack:
        _n = _stack.pop(); _nodes.append(_n)
        _stack += [c for c in (_n.left, _n.right) if c]
    if len(_nodes) > 2:
        _a, _c = _r.sample(_nodes, 2)
        if _a.key != _c.key:
            _a.key, _c.key = _c.key, _a.key
            _keys = []
            def _io(_n):
                if _n: _io(_n.left); _keys.append(_n.key); _io(_n.right)
            _io(_t.root)
            assert is_bst(_t.root) == (_keys == sorted(_keys)), "After swapping two keys, the tree is a BST only if its inorder is still sorted."
"SUCCESS: Passing the allowed range down catches violations anywhere below an ancestor, not just between parent and child: O(n), one visit per node."
```

Hint: Return False if the key is not strictly inside `(low, high)` (treating `None` as no limit). Then the left subtree must lie within `(low, node.key)` and the right within `(node.key, high)`.
:::

::: challenge Range query [medium]
Write `keys_between(node, lo, hi, visited)` returning a sorted list of all keys k with lo ≤ k ≤ hi, appending every node it examines to the list `visited`. Prune: only go into the left subtree if the node's key is greater than lo (smaller keys might still be in range), and only into the right subtree if it is less than hi. On a balanced tree this visits O(log n + results) nodes instead of all n.

```python starter
def keys_between(node, lo, hi, visited):
    return []

big = BST()
import random
random.seed(5)
for k in random.sample(range(10_000), 2_000):
    big.insert(k)
seen = []
found = keys_between(big.root, 5_000, 5_100, seen)
print(len(found), "keys found after visiting", len(seen), "of", big.size, "nodes")
```

```python solution
def keys_between(node, lo, hi, visited):
    if node is None:
        return []
    visited.append(node)
    result = []
    if node.key > lo:
        result += keys_between(node.left, lo, hi, visited)
    if lo <= node.key <= hi:
        result.append(node.key)
    if node.key < hi:
        result += keys_between(node.right, lo, hi, visited)
    return result

big = BST()
import random
random.seed(5)
for k in random.sample(range(10_000), 2_000):
    big.insert(k)
seen = []
found = keys_between(big.root, 5_000, 5_100, seen)
print(len(found), "keys found after visiting", len(seen), "of", big.size, "nodes")
```

```python test
import random as _random
assert "keys_between" in dir(), "Keep the function's name as keys_between."
_all = sorted(inorder_keys(big.root))
_seen = []
assert keys_between(big.root, 5_000, 5_100, _seen) == [k for k in _all if 5_000 <= k <= 5_100], "Wrong keys for the range 5,000 to 5,100."
_path, _n = [], big.root
while _n is not None:
    _path.append(_n)
    _n = _n.left if 5_000 < _n.key else _n.right
assert all(any(_p is _s for _s in _seen) for _p in _path[:5]), "Record every node you examine in visited, including those on the way down to the range."
assert len(_seen) < 150, f"Visited {len(_seen)} nodes for a narrow range: prune subtrees that cannot contain keys in range."
assert keys_between(big.root, 20_000, 30_000, []) == [] and keys_between(None, 0, 9, []) == [], "Empty results and empty trees."
assert keys_between(big.root, 0, 10_000, []) == _all, "A range covering everything returns every key, in order."
_r = _random.Random(6)
for _ in range(100):
    _a, _b = sorted(_r.sample(range(10_000), 2))
    assert keys_between(big.root, _a, _b, []) == [k for k in _all if _a <= k <= _b], f"Wrong keys for the range {_a} to {_b}."
f"SUCCESS: {len(found)} keys found visiting only {len(seen)} of {big.size} nodes: the BST's order lets whole subtrees be skipped."
```

Hint: Visit the node (append it to `visited`). Recurse left only if `node.key > lo`, add the node's key if it is in range, and recurse right only if `node.key < hi`. Doing it in that order (left, node, right) keeps the result sorted.
:::

## What you learned

- A BST keeps smaller keys to the left and larger to the right of every node; search and insertion follow one path, O(height).
- An inorder traversal yields the keys in sorted order; minimum, maximum, floor, ceiling and range queries all exploit the order, which hash tables lack.
- Deletion has three cases; a node with two children is replaced by its successor, the minimum of its right subtree.
- Height decides the cost: random insertion order gives O(log n) height, sorted order a chain of height n − 1. Checking the BST property needs bounds passed down, not just parent-child comparisons.

The next lesson keeps the height O(log n) whatever the insertion order, using rotations.
