# Lesson 5.3: Doubly Linked Lists

*Phase 5 — Linked Structures = OOP + Memory, Fused*

---

## The limitation Lesson 5.2 leaves you with

Walk `head.get()` forward, node by node, and you'll reach the end fine. Try to go *backward* from some node you're currently looking at, and there's simply no way to do it — a singly linked `Node` only knows what comes *after* it, nothing about what came before. If you need "find this node's predecessor," your only option is to start over from `head` and walk forward again, comparing as you go — an O(n) operation just to answer a question about a node you're already holding a reference to.

## Adding a backward link

```cpp
class Node {
public:
    int value;
    Node* next;
    Node* prev;   // NEW — a raw pointer back to the previous node

    Node(int v) : value(v), next(nullptr), prev(nullptr) {}
};
```

Two pointers per node now, instead of one — each node knows both its neighbors. This immediately raises a question this lesson needs to answer carefully: if `next` is `unique_ptr<Node>` (Lesson 5.2's ownership model) for forward links, should `prev` be a `unique_ptr<Node>` too?

## Why `prev` must be a raw pointer, not a `unique_ptr`

Think through what would happen if both were `unique_ptr`. Node A's `next` would own Node B. Node B's `prev` would then need to own Node A right back — but Node A is *already* owned by whatever points at it from before (either the list's `head`, or the node before A). The member declaration itself is legal C++, but there is no correct way to wire the two directions as unique owners. Copying an existing `unique_ptr` is rejected; constructing another `unique_ptr` from the same raw address creates two owners and eventually double-frees it.

The resolution, and the actual design decision this lesson is teaching: **ownership flows in one direction only.** `next` remains `unique_ptr<Node>` — the forward chain owns each node, exactly as in Lesson 5.2, and destroying the list still cleans up the entire chain automatically, the same recursive mechanism as before. `prev` becomes a plain, raw `Node*` — a reference back, for navigation, that does **not** own anything and plays no role at all in cleanup:

```cpp
class Node {
public:
    int value;
    std::unique_ptr<Node> next;   // OWNS forward
    Node* prev;                     // just a reference back — does NOT own

    Node(int v) : value(v), next(nullptr), prev(nullptr) {}
};
```

This is a genuinely important, recurring pattern in real C++ design, worth naming explicitly: when two objects need to reference each other, letting *both* directions own would be a contradiction (or, with `shared_ptr` instead of `unique_ptr`, would create a reference cycle neither one can ever break — a real, subtle memory-leak class that reference counting, unlike Python's more sophisticated cycle-detecting garbage collector, doesn't automatically catch). The fix is always the same shape: pick one direction to own, and make the other direction a non-owning raw pointer or reference, used purely for navigation.

## Building the doubly linked list

```cpp
class DoublyLinkedList {
private:
    std::unique_ptr<Node> head;
    Node* tail;   // raw, non-owning pointer to the LAST node — for O(1) access from the back

public:
    DoublyLinkedList() : head(nullptr), tail(nullptr) {}

    void pushBack(int value) {
        auto newNode = std::make_unique<Node>(value);
        Node* newNodeRaw = newNode.get();   // grab a raw pointer BEFORE ownership transfers away

        if (head == nullptr) {
            head = std::move(newNode);
            tail = newNodeRaw;
        } else {
            newNodeRaw->prev = tail;
            tail->next = std::move(newNode);   // ownership transfers to tail->next
            tail = newNodeRaw;                  // tail now points at the new last node
        }
    }

    void printForward() {
        Node* current = head.get();
        while (current != nullptr) {
            std::cout << current->value << " <-> ";
            current = current->next.get();
        }
        std::cout << "nullptr" << std::endl;
    }

    void printBackward() {
        Node* current = tail;
        while (current != nullptr) {
            std::cout << current->value << " <-> ";
            current = current->prev;
        }
        std::cout << "nullptr" << std::endl;
    }
};
```

Trace `pushBack` carefully — it's genuinely the trickiest sequencing in this phase so far. `newNodeRaw = newNode.get();` captures a raw, non-owning pointer to the new node *before* `newNode`'s ownership is handed away — because once `tail->next = std::move(newNode);` runs, `newNode` itself becomes empty (Lesson 5.2's move-transfer behavior), and you'd have no way to refer to the node you just created at all if you hadn't saved a raw pointer to it first. This is the exact same "capture before you overwrite" discipline from Lessons 5.1 and 5.2, now applied a third time, in a slightly more involved shape.

## `tail` — a separate optimization

Notice `DoublyLinkedList` keeps a `tail` pointer alongside `head`. Without a tracked tail, finding the last node requires walking the entire chain — O(n). With `tail` tracked directly, `pushBack` becomes O(1): no walk required, just attach and update `tail`. A singly linked list can use this same optimization; the `prev` links are what add backward traversal and make removal from the back possible without scanning from `head` to find the predecessor.

## Try it yourself

**1. Build the full `DoublyLinkedList` above, push several values with `pushBack`, and confirm `printForward()` and `printBackward()` produce exactly reversed sequences of each other.**

**2. In a throwaway copy, make `prev` a `unique_ptr<Node>` and try to wire it by copying the pointer that already owns the previous node.** The compiler rejects the copy because `unique_ptr` is move-only. Do not construct a second `unique_ptr` from the previous node's raw address: that would compile but create two owners and a double-free. This is direct confirmation that the backward link must be non-owning.

**3. Write `popBack()` — remove the last node, updating both `tail` and the new last node's `next` to `nullptr`.** This one is worth doing carefully: freeing the old tail node happens automatically the instant nothing owns it anymore (setting `tail->prev->next = nullptr;`, which destroys the `unique_ptr` that was the only thing keeping the old tail node alive) — trace through, in writing, exactly which line causes the old tail's destructor to actually run.

**4. Measure `pushBack`'s complexity directly**, comparing a version of this class *without* the `tail` pointer (forcing a full O(n) walk on every `pushBack`) against the version with `tail` tracked, timing 100,000 `pushBack` calls with each. The gap should be dramatic — O(n²) total work for the untracked version versus O(n) total for the tracked one, exactly Lesson 3.1's amortized-analysis reasoning, now applied to a completely different structure.

## What this cost / bought us

| | Singly linked (Lesson 5.1–5.2) | Doubly linked (this lesson) |
|---|---|---|
| Can traverse backward | No | Yes — via `prev` |
| Memory per node | One pointer (`next`) | Two pointers (`next`, `prev`) |
| `pushBack` (with `tail` tracked) | O(1) | O(1) |
| `popBack` (with `tail` tracked) | O(n) — must find the predecessor | O(1) — `prev` gives the predecessor directly |
| Ownership model | Simple — one owning chain | Requires the "one direction owns, one doesn't" pattern — a genuinely important design lesson on its own |
| Risk of ownership cycles | Not applicable | A real risk if done wrong (both directions owning) — resolved here by raw-pointer `prev` |

The core lesson here isn't really "doubly linked lists exist" — it's the ownership-direction pattern itself, which you will use again: **whenever two objects reference each other, exactly one direction should own; the other should be a plain, non-owning reference.** You'll see this exact shape resurface in Phase 7's trees (a child owns nothing back up to its parent — a parent pointer is always non-owning) and, more subtly, in Phase 9's graphs, where cycles are the norm rather than the exception, and this lesson's caution about `shared_ptr` reference cycles becomes directly relevant.

---

**Next up: Lesson 5.4 — Traversal, insertion, deletion, and why these are O(1) here vs. O(n) in your array.** A focused lesson making Lesson 3.2's time/space tradeoff completely explicit, operation by operation, between `MyVector` and everything you've built this phase.
