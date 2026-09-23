# Module 7: Recursion & Trees — Building a Binary Search Tree

## Why this module matters

Trees are naturally recursive data structures (every subtree is itself a smaller tree), and recursion is the natural way to operate on them. This module ties the two together, and connects recursion's cost directly back to Module 1's stack model — recursion isn't free, and understanding why is what separates "I can write a recursive function" from "I understand what my recursive function actually costs."

---

## 1. Recursion and the call stack, made concrete

```cpp
int factorial(int n) {
    if (n <= 1) return 1;          // base case
    return n * factorial(n - 1);    // recursive case
}
```

Every call to `factorial` pushes a new **stack frame** — Module 1's "stack grows downward" diagram, happening in real time:

```
factorial(4) called:

+------------------+
| factorial(4)     |  n=4, waiting on factorial(3)
+------------------+
| factorial(3)     |  n=3, waiting on factorial(2)
+------------------+
| factorial(2)     |  n=2, waiting on factorial(1)
+------------------+
| factorial(1)     |  n=1, returns 1 immediately (base case)
+------------------+
```

Each frame holds its own copy of `n` and its own "return address" (where to resume once the recursive call returns). As `factorial(1)` returns, its frame pops, and `factorial(2)` resumes with the returned value, computes `2*1=2`, returns, its frame pops, and so on back up — this unwinding is exactly the reverse of the pushing.

**Every recursive call consumes stack space.** This is why unbounded/incorrect recursion (missing or unreachable base case) causes a **stack overflow** — you literally run out of the fixed stack memory region from Module 1's memory map, crashing the program. This is a direct, concrete consequence of the stack model you learned in Module 1, not a separate rule to memorize.

### Trade-off: recursion vs. iteration

| | Recursion | Iteration |
|---|---|---|
| Memory cost | O(depth) stack frames | O(1) extra memory (typically) |
| Code clarity for naturally recursive problems (trees, divide-and-conquer) | Usually much clearer | Often awkward, needs an explicit stack/queue to simulate recursion |
| Risk | Stack overflow on deep recursion (e.g., linked list of 1,000,000 nodes processed recursively) | None from recursion depth |
| When to prefer | The problem is naturally recursive AND depth is bounded/reasonable | Deep or unbounded input size, or performance-critical hot loops |

This is precisely why Module 4's `LinkedList` destructor was written as a `while` loop, not recursively (`if (next) delete next;` recursively would blow the stack on a long enough list) — a deliberate choice you can now explain, not just a style preference.

---

## 2. The Binary Search Tree (BST): structure and invariant

A BST is a tree where, for every node: everything in its **left** subtree is smaller, everything in its **right** subtree is larger.

```
          8
        /   \
       3     10
      / \      \
     1   6      14
        / \     /
       4   7   13
```

```cpp
#pragma once
#include <memory>
#include <iostream>

template <typename T>
class BST {
private:
    struct Node {
        T value;
        std::unique_ptr<Node> left;
        std::unique_ptr<Node> right;
        Node(const T& v) : value(v), left(nullptr), right(nullptr) {}
    };

    std::unique_ptr<Node> root;

    // recursive helper — takes a reference to the unique_ptr so it can rebind it
    void insertHelper(std::unique_ptr<Node>& node, const T& value) {
        if (node == nullptr) {
            node = std::make_unique<Node>(value);   // base case: found the empty spot
            return;
        }
        if (value < node->value) {
            insertHelper(node->left, value);
        } else if (value > node->value) {
            insertHelper(node->right, value);
        }
        // if equal, do nothing (no duplicates in this simple version)
    }

    bool containsHelper(const Node* node, const T& value) const {
        if (node == nullptr) return false;             // base case: not found
        if (value == node->value) return true;          // base case: found
        if (value < node->value) return containsHelper(node->left.get(), value);
        return containsHelper(node->right.get(), value);
    }

    void inorderHelper(const Node* node) const {
        if (node == nullptr) return;   // base case
        inorderHelper(node->left.get());
        std::cout << node->value << " ";
        inorderHelper(node->right.get());
    }

public:
    BST() : root(nullptr) {}
    // NO destructor needed — unique_ptr chain-destroys the whole tree, same as Module 6's LinkedList

    void insert(const T& value) { insertHelper(root, value); }
    bool contains(const T& value) const { return containsHelper(root.get(), value); }
    void printInorder() const { inorderHelper(root.get()); std::cout << "\n"; }
};
```

Notice `insertHelper` takes `std::unique_ptr<Node>&` — a **reference** to the unique_ptr itself, not just the `Node*`. This is deliberate: when we hit an empty spot (`node == nullptr`), we need to actually *create* a new node and store it in that exact slot (whether that slot is `root`, `someNode->left`, or `someNode->right`) — a reference to the `unique_ptr` lets the recursive call reach back and modify the caller's pointer directly, rather than working with a disconnected copy.

`containsHelper` and `inorderHelper`, by contrast, only need to *read* the tree, so they take a raw `const Node*` (via `.get()`) — no ownership involved, matching Module 6's "raw pointers for observing, smart pointers for owning" rule directly.

```
inorder traversal visits: left subtree, then node, then right subtree
For the tree above, inorderHelper prints: 1 3 4 6 7 8 10 13 14

^ notice this is SORTED — that's not a coincidence, it's the defining
  property of the BST invariant, and the whole reason BSTs are useful
```

---

## 3. Tree traversal orders

| Order | Sequence | Typical use |
|---|---|---|
| In-order | left, node, right | Produces sorted output (BST-specific property) |
| Pre-order | node, left, right | Copying/serializing a tree (parent before children) |
| Post-order | left, right, node | Deleting a tree bottom-up, evaluating expression trees |

```cpp
void preorderHelper(const Node* node) const {
    if (node == nullptr) return;
    std::cout << node->value << " ";
    preorderHelper(node->left.get());
    preorderHelper(node->right.get());
}

void postorderHelper(const Node* node) const {
    if (node == nullptr) return;
    postorderHelper(node->left.get());
    postorderHelper(node->right.get());
    std::cout << node->value << " ";
}
```

All three share the identical recursive skeleton — only the position of the "visit this node" line changes. That's worth internalizing as a pattern, not memorizing three separate algorithms.

---

## 4. Deletion — the trickiest BST operation

Deleting a node has three cases:

```cpp
void deleteHelper(std::unique_ptr<Node>& node, const T& value) {
    if (node == nullptr) return;   // not found, nothing to do

    if (value < node->value) {
        deleteHelper(node->left, value);
    } else if (value > node->value) {
        deleteHelper(node->right, value);
    } else {
        // found the node to delete
        if (node->left == nullptr && node->right == nullptr) {
            // Case 1: leaf node — just remove it
            node = nullptr;   // unique_ptr reset -> Node destroyed automatically
        } else if (node->left == nullptr) {
            // Case 2: only a right child — promote it
            node = std::move(node->right);
        } else if (node->right == nullptr) {
            // Case 2: only a left child — promote it
            node = std::move(node->left);
        } else {
            // Case 3: two children — find the in-order successor
            // (smallest value in the right subtree) to replace this node's value,
            // then delete that successor from the right subtree instead.
            Node* successor = node->right.get();
            while (successor->left != nullptr) {
                successor = successor->left.get();
            }
            node->value = successor->value;
            deleteHelper(node->right, successor->value);
        }
    }
}
```

Case 3 is the one people find unintuitive at first: you can't just "remove" a node with two children without breaking the tree's connectivity, so instead you **copy in** a value that's guaranteed to preserve the BST invariant (the smallest value larger than everything in the left subtree, and smaller than everything else in the right subtree — the in-order successor), then recursively delete *that* node instead, which is guaranteed to have at most one child (draw a few examples on paper if this doesn't click immediately — it's genuinely one of the harder pieces of classic DSA).

Notice again: `node = std::move(node->right);` in Case 2 is exactly Module 6's move semantics doing real work — transferring ownership of the subtree without any deep copy.

---

## 5. Trade-off: BST vs. sorted array vs. linked list vs. hash table (preview)

| | BST (balanced) | Sorted array | Unsorted Linked List | Hash Table (Module 8) |
|---|---|---|---|---|
| Search | O(log n) | O(log n) (binary search) | O(n) | O(1) average |
| Insert | O(log n) | O(n) — must shift elements | O(1) at front | O(1) average |
| Delete | O(log n) | O(n) — must shift elements | O(n) — must find it first | O(1) average |
| In-order traversal (sorted output) | O(n), naturally | O(n), already sorted | O(n log n), must sort first | Not naturally ordered |

**The catch, honestly stated**: the BST's O(log n) numbers above assume the tree is reasonably **balanced** — roughly the same depth on both sides. A BST built by inserting already-sorted data degenerates into what is effectively a linked list (every node has only a right child), giving O(n) for everything. Self-balancing variants (AVL trees, red-black trees — what `std::map` actually uses internally) solve this by automatically restructuring during insertion/deletion to guarantee O(log n) worst-case, not just average-case. We're not implementing a self-balancing tree in this series (it's a substantial undertaking on its own), but you should know the plain BST you just built has this real, practical weakness — try practice problem 5 below to see it firsthand.

---

## Practice Problems

1. **Build and test the full BST**: Implement `insert`, `contains`, and all three traversal orders. Insert a shuffled set of 10-15 integers and confirm `printInorder()` produces sorted output every time, regardless of insertion order.

2. **Implement `deleteValue`**: Wire up the `deleteHelper` from section 4 as a public `deleteValue(T value)` method. Test all three deletion cases explicitly (delete a leaf, delete a node with one child, delete a node with two children) and confirm `printInorder()` stays sorted after each.

3. **Stack overflow, deliberately**: Write a recursive function with no base case (or an unreachable one) and run it. Observe the crash. Then compute, using `sizeof` on a typical stack frame estimate and your platform's stack size (usually 1-8MB), roughly how many recursive calls it would take to legitimately overflow a correct-but-very-deep recursion (e.g., inserting into a badly-degenerated BST built from 100,000 pre-sorted inserts).

4. **Recursive vs. iterative traversal**: Rewrite `inorderHelper` iteratively using an explicit `std::stack<Node*>` instead of recursion (this is a classic exercise — look up "iterative inorder traversal" if you get stuck, but try it yourself first). Compare the code's clarity to the recursive version.

5. **Trigger the degenerate case**: Build a BST by inserting the numbers 1 through 1000 *in already-sorted order*. Write a helper to measure the tree's depth, and compare it to the depth you get from inserting the same 1000 numbers in random/shuffled order. This should make the "balanced vs. degenerate" trade-off concrete rather than theoretical.

6. **Height and balance check**: Write a function `int height(const Node* node)` (recursive, naturally) that returns the tree's height, and a function `bool isBalanced()` that checks whether, for every node, the height difference between its left and right subtrees is at most 1. This is the core check that self-balancing trees perform after every insertion/deletion (though implementing the actual rebalancing is out of scope here).

---

**Next: Module 8 — Hashing**, where you'll build a `HashMap` from scratch — this is where Module 2's bitwise skills come back directly, in writing a real hash function. Say "next module" when ready.
