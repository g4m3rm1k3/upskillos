# Balanced trees

The last lesson ended on a problem: a binary search tree's operations cost O(height), and the height depends on the order keys arrive. Random order gives a height near log n; sorted order, which is common, gives a chain of height n − 1. A **balanced** tree repairs its own shape as keys are inserted and deleted, so that the height stays O(log n) whatever the order. Then search, insertion, deletion, floor and range queries are all guaranteed O(log n).

The tool that makes this possible is the **rotation**: a small local rearrangement of three links that changes the shape of a subtree without breaking the BST property. This lesson builds the oldest balanced tree, the **AVL tree** (named after its inventors, Adelson-Velsky and Landis, 1962), and covers:

- rotations, and why they preserve sorted order;
- the AVL rule: at every node, the two subtrees' heights differ by at most 1;
- the four imbalance cases after an insertion, each fixed by one or two rotations;
- why the AVL rule guarantees height O(log n);
- where balanced trees are used in practice.

## Rotations

Suppose node y has a left child x. A **right rotation** at y makes x the root of this subtree, with y as its right child. The subtree that was between them (x's right subtree, holding keys between x and y) moves across to become y's left subtree. A **left rotation** is the mirror image. Sorted order is untouched: an inorder traversal reads x's left subtree, x, the middle subtree, y, y's right subtree, both before and after. Only the shape changes: one side gets one level shorter and the other one level taller. Predict before running: after rotating right at 30 in the chain 30 → 20 → 10, what will the root be, and the height?

```python type
class AVLNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.height = 0

def h(node):
    return node.height if node is not None else -1

def update(node):
    node.height = 1 + max(h(node.left), h(node.right))

def rotate_right(y):
    x = y.left
    y.left = x.right
    x.right = y
    update(y)
    update(x)
    return x

def inorder(node):
    return inorder(node.left) + [node.key] + inorder(node.right) if node else []

def show(node, depth=0):
    if node is not None:
        show(node.right, depth + 1)
        print("     " * depth + f"{node.key} (h{node.height})")
        show(node.left, depth + 1)

a, b, c = AVLNode(30), AVLNode(20), AVLNode(10)
a.left, b.left = b, c
update(c); update(b); update(a)
show(a)
print("inorder", inorder(a), "\nafter rotating right at 30:")
root = rotate_right(a)
show(root)
print("inorder", inorder(root))
```

```output
30 (h2)
     20 (h1)
          10 (h0)
inorder [10, 20, 30]
after rotating right at 30:
     30 (h0)
20 (h1)
     10 (h0)
inorder [10, 20, 30]
```

Each node stores its own height, so balance can be checked in O(1); `update` recomputes a node's height from its children's, and must run for y before x, because y is now x's child.

The chain of height 2 becomes a balanced tree of height 1 with 20 at the root, and the inorder list is still 10, 20, 30. A rotation changes three links and two heights: O(1) work.

## The AVL rule and the four cases

An AVL tree keeps, at **every** node, a **balance factor** (left height minus right height) of −1, 0 or 1. Insert as in a plain BST; then, going back up the path to the root, update each node's height and check its balance. If a node's balance becomes +2 or −2, one of four cases applies, named by the path from the unbalanced node down to the new key:

- **Left-left**: the new key went into the left child's left subtree. One right rotation at the node fixes it.
- **Right-right**: the mirror; one left rotation.
- **Left-right**: the new key went into the left child's **right** subtree. A single right rotation would just move the bulge across; instead, first rotate **left** at the left child (turning it into a left-left case), then right at the node.
- **Right-left**: the mirror; rotate right at the right child, then left at the node.

Predict before running: inserting 1, 2, 3, …, 15 in sorted order, which would make a plain BST a 15-node chain, what height will the AVL tree have?

```python type
def rotate_left(x):
    y = x.right
    x.right = y.left
    y.left = x
    update(x)
    update(y)
    return y

rotations = [0]

def rebalance(node):
    update(node)
    balance = h(node.left) - h(node.right)
    if balance > 1:
        if h(node.left.left) < h(node.left.right):
            node.left = rotate_left(node.left)
            rotations[0] += 1
        rotations[0] += 1
        return rotate_right(node)
    if balance < -1:
        if h(node.right.right) < h(node.right.left):
            node.right = rotate_right(node.right)
            rotations[0] += 1
        rotations[0] += 1
        return rotate_left(node)
    return node

def avl_insert(node, key):
    if node is None:
        return AVLNode(key)
    if key < node.key:
        node.left = avl_insert(node.left, key)
    elif key > node.key:
        node.right = avl_insert(node.right, key)
    else:
        return node
    return rebalance(node)

root = None
for k in range(1, 16):
    root = avl_insert(root, k)
show(root)
print("height", root.height, "after", rotations[0], "rotations; inorder still sorted:", inorder(root) == list(range(1, 16)))
```

```output
               15 (h0)
          14 (h1)
               13 (h0)
     12 (h2)
               11 (h0)
          10 (h1)
               9 (h0)
8 (h3)
               7 (h0)
          6 (h1)
               5 (h0)
     4 (h2)
               3 (h0)
          2 (h1)
               1 (h0)
height 3 after 11 rotations; inorder still sorted: True
```

`avl_insert` returns the (possibly new) root of each subtree, so a rotation anywhere is relinked by its parent; `rebalance` runs at every node on the way back up.

The result is a **perfect** tree of height 3, with 8 at the root: the best any binary tree of 15 nodes can do. Sorted input, the plain BST's worst case, triggered 11 single rotations, each a few link changes. Insertion now costs O(log n): one path down, and at most one or two rotations' worth of repair on the way up.

## Why the height stays logarithmic

How tall can an AVL tree with n nodes be? Turn the question round: what is the **fewest** nodes an AVL tree of height h can have? The sparsest such tree has a root, one subtree of height h − 1 and the other of height h − 2 (the most lopsided the rule allows), each as sparse as possible. So the minimum count N(h) satisfies N(h) = N(h − 1) + N(h − 2) + 1: a Fibonacci-like recurrence, which grows exponentially, by a factor of about 1.618 per level. Since the node count grows exponentially with height, the height grows only logarithmically with the node count: about 1.44 log₂ n at most. The third challenge computes this. In practice, the measured heights are within a few levels of log₂ n (sorted input even gives the smallest height possible). Predict before running: what height for 50,000 keys inserted in sorted order?

```python type
import math
import random

random.seed(0)
for n in [1_000, 10_000, 50_000]:
    for name, keys in [("sorted", range(n)), ("random", random.sample(range(10 * n), n))]:
        r = None
        for k in keys:
            r = avl_insert(r, k)
        print(f"n = {n:>6,} {name:<7} AVL height {r.height:>2}   (log2 n = {math.log2(n):.1f}; a plain BST on sorted keys: {n - 1:,})")
```

```output
n =  1,000 sorted  AVL height  9   (log2 n = 10.0; a plain BST on sorted keys: 999)
n =  1,000 random  AVL height 11   (log2 n = 10.0; a plain BST on sorted keys: 999)
n = 10,000 sorted  AVL height 13   (log2 n = 13.3; a plain BST on sorted keys: 9,999)
n = 10,000 random  AVL height 15   (log2 n = 13.3; a plain BST on sorted keys: 9,999)
n = 50,000 sorted  AVL height 15   (log2 n = 15.6; a plain BST on sorted keys: 49,999)
n = 50,000 random  AVL height 18   (log2 n = 15.6; a plain BST on sorted keys: 49,999)
```

Even 50,000 keys inserted in sorted order give a height of 15, against 49,999 for a plain BST: a search makes at most 16 comparisons instead of 50,000.

## Balanced trees in practice

AVL trees are strictly balanced, which makes lookups fast but means slightly more rotation work on updates. **Red-black trees** relax the rule (the height can be up to twice log₂ n) in exchange for fewer rotations, and are the balanced trees inside Java's `TreeMap` and C++'s `std::map`. Databases and file systems use **B-trees**, whose nodes hold hundreds of keys each, so that the tree is only three or four levels deep and each level costs one disk read.

Python's standard library has no balanced tree. For ordered data, Python programmers use a sorted list with `bisect` (fine when lookups dominate), `heapq` for priority queues (the next lesson), or the third-party `sortedcontainers` package, which keeps a list of sorted lists and is fast in practice. Knowing how balanced trees work explains what all of these guarantee, and is essential when you write ordered structures in other languages or build indexes.

::: challenge Rotate left [easy]
The lesson's `rotate_left` is already defined. Write your own `my_rotate_left(x)`, the mirror image of `rotate_right`: x's right child y becomes the subtree's root, y's left subtree becomes x's right subtree, and x becomes y's left child. Update the heights of x and then y with `update`, and return y.

```python starter
def my_rotate_left(x):
    return x

p, q, r = AVLNode(10), AVLNode(20), AVLNode(30)
p.right, q.right = q, r
update(r); update(q); update(p)
top = my_rotate_left(p)
print(top.key, top.left.key, top.right.key, top.height)
```

```python solution
def my_rotate_left(x):
    y = x.right
    x.right = y.left
    y.left = x
    update(x)
    update(y)
    return y

p, q, r = AVLNode(10), AVLNode(20), AVLNode(30)
p.right, q.right = q, r
update(r); update(q); update(p)
top = my_rotate_left(p)
print(top.key, top.left.key, top.right.key, top.height)
```

```python test
import random as _random
assert "my_rotate_left" in dir(), "Keep the function's name as my_rotate_left."
_p, _q, _r = AVLNode(10), AVLNode(20), AVLNode(30)
_p.right, _q.right = _q, _r
update(_r); update(_q); update(_p)
_top = my_rotate_left(_p)
assert _top is _q and _top.left is _p and _top.right is _r, "After rotating left at 10, 20 should be the root with 10 on its left and 30 on its right."
assert _top.height == 1 and _p.height == 0, "Update the heights: 10 is now a leaf (height 0) and 20 has height 1."
_x, _y = AVLNode(10), AVLNode(30)
_mid = AVLNode(20); _ll = AVLNode(5); _rr = AVLNode(40)
_x.left, _x.right, _y.left, _y.right = _ll, _y, _mid, _rr
for _n in (_ll, _mid, _rr, _y, _x):
    update(_n)
_t = my_rotate_left(_x)
assert _t is _y and _x.right is _mid and _y.left is _x, "y's old left subtree (20) must move across to become x's right subtree."
assert inorder(_t) == [5, 10, 20, 30, 40], f"A rotation must keep sorted order; inorder is {inorder(_t)}."
"SUCCESS: Three links and two heights change; the sorted order does not. Every balancing operation in every balanced tree is built from rotations like this."
```

Hint: `y = x.right`; then `x.right = y.left`; then `y.left = x`. Update x's height before y's, since y's height depends on x's. Return y.
:::

::: challenge Check the AVL rule [medium]
Write `check_avl(node)` that verifies a whole tree: it returns the tree's height (−1 for empty) if the subtree is a valid AVL tree, meaning every node's stored `height` is correct, every balance factor is −1, 0 or 1, and the BST order holds (an inorder traversal is strictly increasing). If any rule is broken, it raises `ValueError` with a message naming the problem and the key. Write it recursively, computing heights from the children rather than trusting the stored ones.

```python starter
def check_avl(node):
    return -1

good = None
for k in [5, 3, 8, 1, 4, 7, 9, 2]:
    good = avl_insert(good, k)
print(check_avl(good))
```

```python solution
def check_avl(node):
    def walk(n):
        if n is None:
            return -1
        left, right = walk(n.left), walk(n.right)
        if abs(left - right) > 1:
            raise ValueError(f"unbalanced at {n.key}")
        actual = 1 + max(left, right)
        if n.height != actual:
            raise ValueError(f"wrong stored height at {n.key}")
        return actual
    height = walk(node)
    keys = inorder(node)
    if any(a >= b for a, b in zip(keys, keys[1:])):
        raise ValueError("keys not in BST order")
    return height

good = None
for k in [5, 3, 8, 1, 4, 7, 9, 2]:
    good = avl_insert(good, k)
print(check_avl(good))
```

```python test
import random as _random
assert "check_avl" in dir(), "Keep the function's name as check_avl."
_g = None
for _k in [5, 3, 8, 1, 4, 7, 9, 2]:
    _g = avl_insert(_g, _k)
assert check_avl(_g) == 3 and check_avl(None) == -1, "A valid AVL tree returns its height (3 here); an empty tree -1."
def _raises(_t):
    try:
        check_avl(_t)
        return False
    except ValueError:
        return True
_chain = AVLNode(1); _chain.right = AVLNode(2); _chain.right.right = AVLNode(3)
update(_chain.right.right); update(_chain.right); update(_chain)
assert _raises(_chain), "A three-node chain is unbalanced at its root: raise ValueError."
_wrong = AVLNode(2); _wrong.left = AVLNode(1); _wrong.height = 5
assert _raises(_wrong), "A wrong stored height should raise ValueError."
_order = AVLNode(2); _order.left = AVLNode(3); update(_order.left); update(_order)
assert _raises(_order), "Keys out of BST order should raise ValueError."
_deep = AVLNode(50); _deep.left = AVLNode(30); _deep.right = AVLNode(70); _deep.left.right = AVLNode(60)
for _n in (_deep.left.right, _deep.left, _deep.right, _deep):
    update(_n)
assert _raises(_deep), "60 sits in 50's left subtree: check the whole inorder order, not just parent-child pairs."
_r = _random.Random(1)
for _ in range(50):
    _t = None
    for _k in _r.sample(range(500), _r.randint(1, 60)):
        _t = avl_insert(_t, _k)
    assert check_avl(_t) == _t.height, "Trees built by avl_insert should always pass."
"SUCCESS: An invariant checker for a whole structure: run it after every operation while testing, and any rebalancing bug is caught at the step that caused it."
```

Hint: A helper `walk(n)` returns the true height: walk both children, raise if their heights differ by more than 1 or if `n.height` disagrees with `1 + max(...)`. Separately, check that `inorder(node)` is strictly increasing.
:::

::: challenge The sparsest AVL trees [medium]
Write `min_nodes(h)`, the fewest nodes an AVL tree of height h can have: N(0) = 1, N(1) = 2, and N(h) = N(h − 1) + N(h − 2) + 1. Compute it with a loop, not recursion. Then write `max_height(n)`, the greatest height an AVL tree with n nodes can have: the largest h with N(h) ≤ n. Finally, store in `worst_ratio` the value `max_height(10**6) / math.log2(10**6)`.

```python starter
import math

def min_nodes(h):
    return 0

def max_height(n):
    return 0

worst_ratio = 0.0
print([min_nodes(h) for h in range(8)], max_height(1_000_000), worst_ratio)
```

```python solution
import math

def min_nodes(h):
    if h == 0:
        return 1
    a, b = 1, 2
    for _ in range(h - 1):
        a, b = b, a + b + 1
    return b

def max_height(n):
    h = 0
    while min_nodes(h + 1) <= n:
        h += 1
    return h

worst_ratio = max_height(10**6) / math.log2(10**6)
print([min_nodes(h) for h in range(8)], max_height(1_000_000), worst_ratio)
```

```python test
import math as _math
assert "min_nodes" in dir() and "max_height" in dir(), "Keep both function names."
assert [min_nodes(_h) for _h in range(8)] == [1, 2, 4, 7, 12, 20, 33, 54], f"Expected 1, 2, 4, 7, 12, 20, 33, 54; got {[min_nodes(_h) for _h in range(8)]}."
import ast as _ast
_fn = [_x for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.FunctionDef) and _x.name == "min_nodes"][0]
assert not any(isinstance(_c, _ast.Call) and getattr(_c.func, "id", "") == "min_nodes" for _c in _ast.walk(_fn)), "Use a loop in min_nodes: plain recursion makes hundreds of millions of calls for h = 40."
assert min_nodes(40) == 433494436, "min_nodes should work for large heights (with a loop, quickly)."
assert max_height(1) == 0 and max_height(2) == 1 and max_height(7) == 3 and max_height(11) == 3 and max_height(12) == 4, "max_height(n) is the largest h with min_nodes(h) <= n."
assert max_height(10**6) == 27, f"A million-node AVL tree is at most 27 levels tall; got {max_height(10**6)}."
assert abs(worst_ratio - 27 / _math.log2(10**6)) < 1e-9, "worst_ratio should be max_height(10**6) / log2(10**6)."
f"SUCCESS: Even the most lopsided legal AVL tree with a million nodes has height 27, just {worst_ratio:.2f} × log₂ n: the guarantee behind O(log n) operations."
```

Hint: Keep the last two values `a = N(h − 2)` and `b = N(h − 1)` and step forward: `a, b = b, a + b + 1`. For `max_height`, increase h while `min_nodes(h + 1) <= n`.
:::

## What you learned

- A rotation rearranges three links to shift a subtree's weight from one side to the other in O(1), preserving sorted order.
- An AVL tree keeps every node's subtree heights within 1 of each other; after an insertion, the four cases (left-left, right-right, left-right, right-left) are fixed with one or two rotations on the way back up.
- The sparsest AVL tree of height h has a Fibonacci-like number of nodes, so the height is at most about 1.44 log₂ n: every operation is O(log n), even for sorted input.
- Red-black trees (relaxed balance) and B-trees (many keys per node) are the balanced trees most used in libraries and databases; Python relies on sorted lists, heaps and third-party packages instead.

The next lesson covers a tree with a weaker order and a remarkable use: heaps and priority queues.
