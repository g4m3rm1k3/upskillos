# Lesson 5.1: Singly Linked Lists — Raw Pointers First

*Phase 5 — Linked Structures = OOP + Memory, Fused*
*Your array intuition (Phases 1–3) and your object intuition (Phase 2–4) merge here.*

---

## Why this phase exists

Every structure so far — `IntArray`, `MyVector` — has been built on Lesson 1.5's contiguity: one unbroken block of memory, indexed by arithmetic. A linked list throws that away entirely. Elements live wherever the heap happens to put them, scattered, each one holding the *address* of the next — pure pointers (Lesson 1.2), pure objects (Lesson 2.2), with nothing contiguous about it at all. This is the first structure in the curriculum that's genuinely impossible to explain with only array intuition or only object intuition — it needs both, fused, which is exactly why this phase comes right after Phase 4 closes out the object side.

## The building block: a `Node`

```cpp
class Node {
public:
    int value;
    Node* next;   // a pointer to the NEXT node — or nullptr if this is the last one

    Node(int v) : value(v), next(nullptr) {}
};
```

A `Node` is small and, by itself, unremarkable — one value, one pointer. The entire "list" is nothing more than a chain of these, each one pointing to the next:

```
head ──► [5|●]──►[2|●]──►[8|●]──► nullptr
```

Read this diagram literally: `head` is a `Node*` pointing at the first node. Each box holds a value and a pointer to the next box. The last box's `next` is `nullptr` (Lesson 1.2) — the explicit, checkable signal that the chain ends here.

## The list itself

```cpp
class LinkedList {
private:
    Node* head;

public:
    LinkedList() : head(nullptr) {}

    void pushFront(int value) {
        Node* newNode = new Node(value);
        newNode->next = head;   // new node points at the OLD head
        head = newNode;          // head now points at the new node
    }

    void printAll() {
        Node* current = head;
        while (current != nullptr) {
            std::cout << current->value << " -> ";
            current = current->next;
        }
        std::cout << "nullptr" << std::endl;
    }

    ~LinkedList() {
        Node* current = head;
        while (current != nullptr) {
            Node* next = current->next;   // save next BEFORE deleting current
            delete current;
            current = next;
        }
    }
};
```

`current->next` uses **arrow notation** — shorthand for `(*current).next`, first mentioned back in Lesson 2.6. This is the primary syntax you'll use throughout this entire phase: given a pointer to a `Node`, `->` reaches through it to access a member. Get comfortable with it now; you'll type it constantly for the rest of Phase 5 through Phase 9.

## `pushFront`, traced carefully

```cpp
void pushFront(int value) {
    Node* newNode = new Node(value);   // heap allocation, Lesson 1.4
    newNode->next = head;               // step 1: point the new node at the current first node
    head = newNode;                     // step 2: THEN move head to point at the new node
}
```

Order matters here, precisely. If you swapped these two lines — set `head = newNode;` *first* — you'd overwrite `head` before `newNode->next = head;` had a chance to read the *old* value, permanently losing the rest of the list. This is a genuinely common beginner mistake, worth internalizing the reasoning behind rather than just memorizing the correct order: always capture what you need to preserve *before* you overwrite the variable holding it.

## The destructor — RAII, applied to a chain

Notice the destructor doesn't just `delete head;` once — a linked list owns *every* node in the chain, and every single one needs its own `delete`, or you leak all of them except the first (Lesson 1.4). The pattern — save `next` before deleting `current`, because deleting `current` also destroys your only way to find the *next* node — is the linked-list-specific version of Lesson 2.5's RAII: the destructor guarantees the entire chain is freed, correctly, in order, the instant the `LinkedList` object goes out of scope, regardless of how many nodes it holds.

```cpp
~LinkedList() {
    Node* current = head;
    while (current != nullptr) {
        Node* next = current->next;   // MUST save this first — 'current' won't exist after delete
        delete current;
        current = next;
    }
}
```

Try writing this without the `next` variable — `delete current; current = current->next;` — and think through why it's broken: you're reading `current->next` *after* `current` has already been freed, a direct instance of Lesson 1.4's "use after free," undefined behavior, not a hypothetical concern.

## `MyVector` vs. `LinkedList` — the first real, felt tradeoff

**Traversal — a `LinkedList` gives up O(1) indexed access entirely:**

```cpp
// MyVector: O(1) — direct address arithmetic (Lesson 1.5)
int fifth = myVector[4];

// LinkedList: O(n) — must walk the chain from the head, one node at a time
int getAt(Node* head, int index) {
    Node* current = head;
    for (int i = 0; i < index; i++) {
        current = current->next;   // no shortcuts — every node must be visited in order
    }
    return current->value;
}
```

There is no address-arithmetic shortcut for "give me the 5th node" — you cannot know where node 5 lives in memory without first following the chain through nodes 1 through 4, because each node's location was decided independently by the heap allocator when it was created, with no contiguity guarantee at all (the direct opposite of Lesson 1.5). This is a genuinely different, and genuinely worse, complexity than `MyVector`'s indexing — and it's the first direct, felt cost of leaving contiguous memory behind.

**Insertion at the front — where `LinkedList` wins decisively:**

```cpp
// MyVector: O(n) — every existing element must shift over to make room at index 0
void insertFront(MyVector& vec, int value) {
    vec.pushBack(0);                       // make room
    for (int i = vec.getSize() - 1; i > 0; i--) {
        vec[i] = vec[i - 1];                // shift everything right, one at a time
    }
    vec[0] = value;
}

// LinkedList: O(1) — always, regardless of how many nodes already exist
list.pushFront(value);
```

This is Lesson 3.2's time/space tradeoff pattern, recurring exactly as promised — neither structure is "better" in any absolute sense; each is faster at the specific operation the other is slow at, and the right choice depends entirely on which operation your actual program does more often.

## Try it yourself

**1. Build `Node` and `LinkedList` above, push several values, and confirm `printAll()` shows them in reverse order of insertion** — since `pushFront` always inserts at the beginning, the most recently pushed value ends up first. Predict the exact printed order before running it.

**2. Deliberately swap the two lines in `pushFront`** (set `head = newNode;` before `newNode->next = head;`) and confirm the bug described above — push three values and watch `printAll()` show only the very last one, with the rest of the list silently lost (leaked, in fact — Lesson 1.4's bug, reintroduced by this specific ordering mistake).

**3. Write `getAt(int index)` as a member function of `LinkedList`, with a bounds check**, mirroring `MyVector::get()`'s style from Phase 2 — confirm it correctly returns `-1` (or prints an error) for an out-of-range index, and walks the chain correctly for a valid one.

**4. Measure the O(n) traversal cost directly.** Build a `LinkedList` with 100,000 nodes, and time how long it takes to reach the *last* node, using your `getAt` function, compared against `MyVector`'s `operator[]` reaching its last element. The gap should be dramatic and immediately obvious — direct, measured confirmation of the complexity difference, rather than a claim you're asked to take on faith.

## What this cost / bought us

| | `MyVector` (Phase 2) | `LinkedList` (this lesson) |
|---|---|---|
| Memory layout | Contiguous (Lesson 1.5) | Scattered, wherever the heap allocator puts each node |
| Indexed access (`get(i)`) | O(1) | O(n) — must walk from the head |
| Insertion at the front | O(n) — must shift every element | O(1) — always |
| Extra memory per element | None beyond the value itself | One extra pointer (`next`) per node |
| Cleanup | One `delete[]` for the whole block | Must walk and `delete` every node individually |

This is the first structure in the curriculum where "what did the standard library buy you" (Phase 3's question) genuinely has a different, structural answer depending on what you're optimizing for — not just a speed difference from better engineering, but a fundamentally different shape of tradeoff. You'll feel this again, sharply, in the head-to-head project closing out this phase.

---

**Next up: Lesson 5.2 — the same list, rebuilt with `unique_ptr<Node>`.** Every `new`/`delete` in this lesson was manual, by hand, exactly like Lesson 1.4 before Lesson 1.7's smart pointers arrived — time to apply that same fix here, and compare the two ownership models directly, node by node.
