# Binary trees

Lists arrange items in a line. Many things are not lines: a file system has folders inside folders, an arithmetic expression has operations applied to the results of other operations, a tournament has winners advancing from pairs of matches, a company has managers with teams. All of these are **trees**: a starting item with any number of children, each of which has children of its own, and no loops. A **binary tree** is the case where every item has at most two children, called left and right. It is the most important tree in computing: binary search trees, heaps, expression trees and decision trees are all binary trees with extra rules.

This lesson covers:

- the vocabulary: root, leaf, parent, child, depth, height;
- building a binary tree from linked nodes, and computing its properties recursively;
- the four standard **traversals**: preorder, inorder, postorder and level order;
- traversing without recursion, with an explicit stack;
- the array layout that stores a complete binary tree with no links at all.

## Nodes and vocabulary

A binary tree is built from nodes, like a linked list, except each node has **two** links, `left` and `right`, either of which may be `None`. The vocabulary:

- The **root** is the node at the top, with no parent. A node's **children** are the nodes its links point to; it is their **parent**.
- A **leaf** has no children.
- The **depth** of a node is the number of links from the root down to it (the root has depth 0).
- The **height** of a tree is the largest depth of any node, so a single node has height 0, and an empty tree, by convention, height −1.

Below is a small tree describing the expression (3 + 4) × (10 − 6). Predict before running: how many nodes, how many leaves, and what height?

```python type
class TreeNode:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right

expression = TreeNode("*",
                      TreeNode("+", TreeNode(3), TreeNode(4)),
                      TreeNode("-", TreeNode(10), TreeNode(6)))

def size(node):
    if node is None:
        return 0
    return 1 + size(node.left) + size(node.right)

def height(node):
    if node is None:
        return -1
    return 1 + max(height(node.left), height(node.right))

def leaves(node):
    if node is None:
        return []
    if node.left is None and node.right is None:
        return [node.value]
    return leaves(node.left) + leaves(node.right)

def show(node, depth=0):
    if node is not None:
        show(node.right, depth + 1)
        print("      " * depth + str(node.value))
        show(node.left, depth + 1)

show(expression)
print("size", size(expression), " height", height(expression), " leaves", leaves(expression))
```

```output
            6
      -
            10
*
            4
      +
            3
size 7  height 2  leaves [3, 4, 10, 6]
```

`show` prints the tree on its side, root on the left, with the right subtree above and the left below, so tilting your head left shows the usual picture.

Seven nodes, four leaves (the numbers), height 2. Every one of these functions has the same shape: handle the empty tree (`None`) as the base case, then combine the answers for the left and right **subtrees**. A subtree is itself a binary tree, so the recursion fits the data exactly. Each visits every node once: O(n).

## Traversals

A **traversal** visits every node once, in some order. For a binary tree there are three natural depth-first orders, which differ only in **when** a node is visited relative to its two subtrees:

- **preorder**: the node, then its left subtree, then its right subtree;
- **inorder**: the left subtree, then the node, then the right subtree;
- **postorder**: the left subtree, then the right subtree, then the node.

On the expression tree, each order is meaningful. Predict before running: which traversal gives the expression as you would write it, and which gives the order a calculator must work in?

```python type
def preorder(node):
    if node is None:
        return []
    return [node.value] + preorder(node.left) + preorder(node.right)

def inorder(node):
    if node is None:
        return []
    return inorder(node.left) + [node.value] + inorder(node.right)

def postorder(node):
    if node is None:
        return []
    return postorder(node.left) + postorder(node.right) + [node.value]

print("preorder: ", preorder(expression))
print("inorder:  ", inorder(expression))
print("postorder:", postorder(expression))

def evaluate(node):
    if node.left is None and node.right is None:
        return node.value
    a, b = evaluate(node.left), evaluate(node.right)
    return {"+": a + b, "-": a - b, "*": a * b}[node.value]

print("value:", evaluate(expression))
```

```output
preorder:  ['*', '+', 3, 4, '-', 10, 6]
inorder:   [3, '+', 4, '*', 10, '-', 6]
postorder: [3, 4, '+', 10, 6, '-', '*']
value: 28
```

Building lists with `+` copies them, which makes these versions O(n²) in the worst case; they are written this way for clarity. A version that appends to one shared list is O(n).

Inorder gives 3 + 4 * 10 − 6, the expression as written (minus the brackets that a printer would add from the tree's shape). Postorder gives 3 4 + 10 6 − *, which is the **postfix** form the stacks lesson evaluated: a calculator must finish both operands before applying the operator. Preorder gives * + 3 4 − 10 6, the prefix form, natural for copying a tree (create the node before its children). And `evaluate` is itself a postorder traversal: it computes both subtrees before combining them, giving 28.

## Level order

The fourth standard traversal goes **level by level**, top to bottom, left to right. Recursion goes deep before wide, so it doesn't fit; instead, keep a **queue** of nodes waiting to be visited: take one from the front, visit it, and add its children to the back. The queue lesson promised this: it is breadth-first search on a tree. Predict before running: in what order will the nodes of this taller tree be visited?

```python type
from collections import deque

def level_order(root):
    if root is None:
        return []
    levels = []
    queue = deque([(root, 0)])
    while queue:
        node, depth = queue.popleft()
        if depth == len(levels):
            levels.append([])
        levels[depth].append(node.value)
        for child in (node.left, node.right):
            if child is not None:
                queue.append((child, depth + 1))
    return levels

family = TreeNode("A",
                  TreeNode("B", TreeNode("D"), TreeNode("E", TreeNode("H"))),
                  TreeNode("C", None, TreeNode("F", TreeNode("I"), TreeNode("J"))))
show(family)
for depth, level in enumerate(level_order(family)):
    print(f"depth {depth}: {level}")
```

```output
                  J
            F
                  I
      C
A
            E
                  H
      B
            D
depth 0: ['A']
depth 1: ['B', 'C']
depth 2: ['D', 'E', 'F']
depth 3: ['H', 'I', 'J']
```

Each queue entry carries the node's depth, so the output can be grouped into levels.

The nodes come out level by level: A; B, C; D, E, F; H, I, J. Level order is the natural way to print a tree as people draw it, to find the shallowest node with some property, or to measure how wide each level is.

## Without recursion: an explicit stack

Recursive traversals use the call stack. For a very tall tree (one long chain of nodes, which unbalanced trees can become) that hits Python's recursion limit. Any traversal can instead keep its own stack. Inorder is the trickiest: walk left as far as possible, pushing each node; when you can go no further, pop a node, visit it, and then do the same from its right child. Predict before running: will this give the same order as the recursive inorder?

```python type
def inorder_iterative(root):
    result, stack, node = [], [], root
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        result.append(node.value)
        node = node.right
    return result

print(inorder_iterative(family))
print(inorder(family))

chain = None
for v in range(2_000):
    chain = TreeNode(v, chain)
print("a 2,000-node left chain, iteratively:", len(inorder_iterative(chain)), "nodes visited")
try:
    inorder(chain)
except RecursionError:
    print("recursively: RecursionError")
```

```output
['D', 'B', 'H', 'E', 'A', 'C', 'I', 'F', 'J']
['D', 'B', 'H', 'E', 'A', 'C', 'I', 'F', 'J']
a 2,000-node left chain, iteratively: 2000 nodes visited
recursively: RecursionError
```

The stack holds exactly the nodes whose left subtrees are being explored and that have not yet been visited themselves: the same nodes the recursive version would have paused on the call stack.

Both give D, B, H, E, A, C, I, F, J. On a chain 2,000 nodes tall the iterative version is unaffected, while the recursive one exceeds the recursion limit. Height matters for more than recursion: most tree operations take time proportional to the height, which is why the balanced trees lesson works so hard to keep it small.

## Trees in an array

A **complete** binary tree has every level full except possibly the last, which is filled from the left. Such a tree can be stored in a plain list with **no links**: put the root at index 0, and the children of the node at index i at indices 2i + 1 and 2i + 2. The parent of index i is then at (i − 1) // 2. Level order is simply the list order. This layout is exactly how heaps are stored, in a later lesson. Predict before running: what are the children of the node at index 2, and the parent of index 6?

```python type
values = ["A", "B", "C", "D", "E", "F", "G", "H"]
for i, v in enumerate(values):
    kids = [values[c] for c in (2 * i + 1, 2 * i + 2) if c < len(values)]
    parent = values[(i - 1) // 2] if i > 0 else None
    print(f"index {i} ({v}): parent {parent}, children {kids}")
```

```output
index 0 (A): parent None, children ['B', 'C']
index 1 (B): parent A, children ['D', 'E']
index 2 (C): parent A, children ['F', 'G']
index 3 (D): parent B, children ['H']
index 4 (E): parent B, children []
index 5 (F): parent C, children []
index 6 (G): parent C, children []
index 7 (H): parent D, children []
```

Index 2 (C) has children F and G at indices 5 and 6, and index 6's parent is (6 − 1) // 2 = 2. Moving around the tree is arithmetic, and the whole tree sits in one compact list. The layout wastes space on trees that are not complete, which is why general trees use linked nodes.

::: challenge Count the leaves [easy]
Write a recursive function `count_leaves(node)` returning the number of leaves in the binary tree rooted at `node` (0 for an empty tree), and `max_value(node)` returning the largest value in a non-empty tree of numbers.

```python starter
def count_leaves(node):
    return 0

def max_value(node):
    return 0

numbers = TreeNode(5, TreeNode(3, TreeNode(8)), TreeNode(2, TreeNode(9), TreeNode(1)))
print(count_leaves(numbers), max_value(numbers))
```

```python solution
def count_leaves(node):
    if node is None:
        return 0
    if node.left is None and node.right is None:
        return 1
    return count_leaves(node.left) + count_leaves(node.right)

def max_value(node):
    best = node.value
    for child in (node.left, node.right):
        if child is not None:
            best = max(best, max_value(child))
    return best

numbers = TreeNode(5, TreeNode(3, TreeNode(8)), TreeNode(2, TreeNode(9), TreeNode(1)))
print(count_leaves(numbers), max_value(numbers))
```

```python test
assert "count_leaves" in dir() and "max_value" in dir(), "Keep both function names."
_t = TreeNode(5, TreeNode(3, TreeNode(8)), TreeNode(2, TreeNode(9), TreeNode(1)))
assert count_leaves(_t) == 3 and max_value(_t) == 9, f"The tree has leaves 8, 9 and 1, and largest value 9; got {count_leaves(_t)} and {max_value(_t)}."
assert count_leaves(None) == 0 and count_leaves(TreeNode(4)) == 1 and max_value(TreeNode(-7)) == -7, "Empty tree: 0 leaves; a single node is a leaf and its own maximum."
assert count_leaves(expression) == 4 and count_leaves(family) == 4, "The expression tree has 4 leaves (the numbers) and the family tree 4 (D, H, I and J)."
assert max_value(TreeNode(-5, TreeNode(-9), TreeNode(-2))) == -2, "All-negative trees: the largest is -2, not 0."
"SUCCESS: Base case for the empty tree (or the leaf), then combine the two subtrees: the shape of almost every tree function."
```

Hint: A node with no children is a leaf (count 1). Otherwise add the leaf counts of its two subtrees, with an empty subtree counting 0. For the maximum, start from the node's own value and compare with each existing child's maximum.
:::

::: challenge Preorder with a stack [medium]
Write `preorder_iterative(root)` returning the preorder list of values **without recursion**, using a Python list as a stack: push the root; repeatedly pop a node, record its value, then push its **right** child and then its **left** child (if they exist), so that the left is popped first.

```python starter
def preorder_iterative(root):
    return []

print(preorder_iterative(family))
```

```python solution
def preorder_iterative(root):
    if root is None:
        return []
    result, stack = [], [root]
    while stack:
        node = stack.pop()
        result.append(node.value)
        if node.right is not None:
            stack.append(node.right)
        if node.left is not None:
            stack.append(node.left)
    return result

print(preorder_iterative(family))
```

```python test
import ast as _ast
assert "preorder_iterative" in dir(), "Keep the function's name as preorder_iterative."
assert preorder_iterative(family) == preorder(family), f"Expected {preorder(family)}, got {preorder_iterative(family)}."
assert preorder_iterative(expression) == ["*", "+", 3, 4, "-", 10, 6], "Preorder of the expression tree is * + 3 4 - 10 6."
assert preorder_iterative(None) == [] and preorder_iterative(TreeNode(1)) == [1], "Empty tree and single node."
_right_chain = None
for _v in range(2_000):
    _right_chain = TreeNode(_v, None, _right_chain)
assert preorder_iterative(_right_chain) == list(range(1999, -1, -1)), "A 2,000-node chain should work without recursion."
_fn = [_x for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.FunctionDef) and _x.name == "preorder_iterative"][0]
assert not any(isinstance(_c, _ast.Call) and getattr(_c.func, "id", "") in ("preorder_iterative", "preorder") for _c in _ast.walk(_fn)), "Use a stack, not recursion."
"SUCCESS: Pushing right before left makes the left subtree come off the stack first: the call stack's job, done by hand."
```

Hint: Start with `stack = [root]` (if the root exists). While the stack is not empty: pop, append the value, then push `node.right` and then `node.left` when they are not `None`.
:::

::: challenge Rebuild a tree from two traversals [medium]
A tree with **distinct** values can be rebuilt from its preorder and inorder lists. The first item of the preorder is the root. Finding the root in the inorder list splits it into the left subtree's inorder (before it) and the right subtree's (after it); their lengths then split the rest of the preorder the same way. Write `rebuild(pre, ino)` returning the root `TreeNode` (or `None` for empty lists), recursively.

```python starter
def rebuild(pre, ino):
    return None

copy = rebuild(preorder(family), inorder(family))
print(level_order(copy))
```

```python solution
def rebuild(pre, ino):
    if not pre:
        return None
    root_value = pre[0]
    split = ino.index(root_value)
    left = rebuild(pre[1:split + 1], ino[:split])
    right = rebuild(pre[split + 1:], ino[split + 1:])
    return TreeNode(root_value, left, right)

copy = rebuild(preorder(family), inorder(family))
print(level_order(copy))
```

```python test
import random as _random
assert "rebuild" in dir(), "Keep the function's name as rebuild."
def _same(_a, _b):
    if _a is None or _b is None:
        return _a is _b
    return _a.value == _b.value and _same(_a.left, _b.left) and _same(_a.right, _b.right)
assert rebuild([], []) is None, "Empty traversals give an empty tree."
assert _same(rebuild(preorder(family), inorder(family)), family), "Rebuilding the family tree should reproduce its exact shape."
_r = _random.Random(3)
def _random_tree(_vals):
    if not _vals:
        return None
    _k = _r.randrange(len(_vals))
    return TreeNode(_vals[_k], _random_tree(_vals[:_k]), _random_tree(_vals[_k + 1:]))
for _ in range(200):
    _vals = _r.sample(range(100), _r.randint(1, 15))
    _t = _random_tree(_vals)
    assert _same(rebuild(preorder(_t), inorder(_t)), _t), f"Failed to rebuild a tree with preorder {preorder(_t)} and inorder {inorder(_t)}."
"SUCCESS: The preorder names each root; the inorder says which values lie to its left and right. Together they pin down the whole shape."
```

Hint: The root is `pre[0]`; `split = ino.index(pre[0])` is the size of the left subtree. The left subtree's preorder is `pre[1:split + 1]` and inorder `ino[:split]`; the right's are `pre[split + 1:]` and `ino[split + 1:]`.
:::

## What you learned

- A binary tree is linked nodes with up to two children; root, leaf, depth and height describe its shape. Recursive functions on trees handle `None` and combine the two subtrees, in O(n).
- Preorder, inorder and postorder visit a node before, between or after its subtrees; on an expression tree they give prefix, infix and postfix forms, and evaluation is a postorder traversal.
- Level order uses a queue to visit the tree level by level: breadth-first search.
- An explicit stack replaces recursion for tall trees; a complete tree can live in a list, with children of i at 2i + 1 and 2i + 2.

The next lesson adds one rule to binary trees, smaller values to the left and larger to the right, and gets a structure that searches in time proportional to its height.
