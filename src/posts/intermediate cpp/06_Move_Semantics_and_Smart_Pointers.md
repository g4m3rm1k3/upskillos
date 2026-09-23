# Module 6: Move Semantics & Smart Pointers

## Why this module matters

Modules 3-5 taught you manual ownership discipline: allocate in the constructor, free in the destructor, deep-copy in the copy constructor/assignment. That discipline is correct but has two problems this module solves: (1) deep copies are sometimes wasteful when the source is about to be discarded anyway, and (2) manual `new`/`delete` pairing is still something a human has to get right every time, even with RAII wrapping it. Move semantics fixes (1). Smart pointers make (2) essentially foolproof.

---

## 1. lvalues and rvalues (just enough to use move semantics)

```cpp
int x = 5;        // x is an lvalue: it has a name, a persistent location, you can take &x
int y = x + 1;     // (x + 1) is an rvalue: a temporary, no name, about to disappear
```

**Rough rule**: an lvalue is anything you could take the address of and that persists after the expression. An rvalue is a temporary that has no name and is about to be destroyed — the result of `x + 1`, a function's return-by-value, a literal like `5`.

This distinction matters because: if a value is about to be destroyed anyway (an rvalue), there's no reason to deep-copy its resources into a new object — you can just **steal** them, since the original is going away regardless.

---

## 2. Move constructor and move assignment

Recall `DynamicArray`'s copy constructor from Module 3 — it deep-copies every element, O(n). A **move constructor** instead just steals the pointer:

```cpp
class DynamicArray {
private:
    int* data;
    int capacity;
    int count;
public:
    // ... constructors, destructor, copy constructor/assignment from Module 3 ...

    // MOVE constructor: takes an rvalue reference (T&&), steals its guts
    DynamicArray(DynamicArray&& other) noexcept
        : data(other.data), capacity(other.capacity), count(other.count) {
        other.data = nullptr;   // leave the source in a valid, empty, safe-to-destroy state
        other.capacity = 0;
        other.count = 0;
    }

    // MOVE assignment
    DynamicArray& operator=(DynamicArray&& other) noexcept {
        if (this == &other) return *this;
        delete[] data;              // free whatever we currently own

        data = other.data;          // steal
        capacity = other.capacity;
        count = other.count;

        other.data = nullptr;       // leave source empty and safe
        other.capacity = 0;
        other.count = 0;
        return *this;
    }
};
```

```
Move (steal, don't copy):

before:  a.data ---> [ heap buffer ]        b.data ---> nullptr

DynamicArray b = std::move(a);

after:   a.data ---> nullptr                b.data ---> [ heap buffer ]
         (a is now empty but valid — its destructor will safely do nothing)
```

Compare to Module 3's deep copy diagram: no new heap allocation happens at all, no element-by-element loop — just three pointer/int assignments. For a `DynamicArray` with a million elements, that's the difference between an O(n) operation and an O(1) one.

**`&&` is an rvalue reference** — a reference that can only bind to rvalues (temporaries), which is exactly the signal "this source object is about to be destroyed, it's safe to steal from it."

**`noexcept`** matters more than it looks: standard containers like `std::vector` check whether your move constructor is marked `noexcept` to decide whether it's *safe* to use moves during operations like resizing (if a move could throw partway through, the container might end up in a corrupted state) — if it's not `noexcept`, some containers will silently fall back to the slower copy constructor instead, defeating the purpose. Always mark move operations `noexcept` when they genuinely can't throw (which is almost always true — you're just reassigning pointers).

### `std::move` — how you actually trigger a move

```cpp
DynamicArray a(10);
DynamicArray b = a;               // COPY — a is an lvalue, deep copy happens
DynamicArray c = std::move(a);    // MOVE — std::move casts a to an rvalue reference,
                                    // telling the compiler "treat a as disposable"
// a is now in a valid-but-empty state; using it further (other than destroying/reassigning it)
// is technically legal but almost always a logic bug — don't read from a moved-from object
```

**`std::move` does not move anything by itself** — it's purely a cast, relabeling an lvalue as movable. The actual "stealing" happens in whichever move constructor/assignment operator gets selected because of that cast. This is a very common point of confusion: `std::move(a)` doesn't do the move; it just makes the move *possible* by changing which overload gets picked.

---

## 3. The Rule of Five

Module 3's Rule of Three (destructor, copy constructor, copy assignment) becomes the **Rule of Five** once move semantics enter the picture: if you need any one of these five, you typically need to think about all five (though for move operations, sometimes "delete" them explicitly is the right choice — see the `unique_ptr` example below).

1. Destructor
2. Copy constructor
3. Copy assignment operator
4. Move constructor
5. Move assignment operator

### Trade-off: why not just always rely on the compiler-generated defaults?

The compiler *will* generate default versions of all five for you — but only under specific conditions, and the defaults are only correct if your class has no resource to manage (no raw pointers, no manual `new`/`delete`). The moment your class owns a resource directly (like `DynamicArray`'s `int* data`), you must write all five yourself (or use smart pointers, section 4, which let the compiler-generated defaults become correct again — see why below).

---

## 4. Smart pointers: making the Rule of Five (mostly) unnecessary

`std::unique_ptr<T>` wraps a raw pointer and automatically calls `delete` on it when the `unique_ptr` itself is destroyed — RAII, but generic and reusable, instead of writing it by hand in every class's destructor.

```cpp
#include <memory>

void example() {
    std::unique_ptr<int> p = std::make_unique<int>(42);
    std::cout << *p;   // dereferences just like a raw pointer
}   // <- p goes out of scope here, delete happens automatically. No manual delete anywhere.
```

**"Unique" is the key word**: a `unique_ptr` cannot be copied — only moved. This directly encodes "exactly one owner" into the type system:

```cpp
std::unique_ptr<int> a = std::make_unique<int>(5);
std::unique_ptr<int> b = a;              // COMPILE ERROR — copy is deleted
std::unique_ptr<int> c = std::move(a);   // OK — ownership transfers to c, a becomes nullptr
```

This is a huge deal: Module 3's shallow-copy double-free bug becomes **impossible to even compile** — the compiler rejects the copy outright, rather than you discovering the bug at runtime under AddressSanitizer.

### Rebuilding the `LinkedList` with `unique_ptr`

```cpp
struct Node {
    int value;
    std::unique_ptr<Node> next;   // each node OWNS the next one
    Node(int v) : value(v), next(nullptr) {}
};

class LinkedList {
private:
    std::unique_ptr<Node> head;   // the list OWNS the first node
    int count;
public:
    LinkedList() : head(nullptr), count(0) {}
    // NO destructor needed — unique_ptr's own destructors chain-destroy the whole list automatically!

    void push_front(int value) {
        auto newNode = std::make_unique<Node>(value);
        newNode->next = std::move(head);   // transfer ownership of the old head to newNode->next
        head = std::move(newNode);          // transfer ownership of newNode to head
    }

    void print() const {
        Node* current = head.get();   // .get() gives a raw, NON-OWNING pointer for traversal
        while (current != nullptr) {
            std::cout << current->value << " -> ";
            current = current->next.get();
        }
        std::cout << "nullptr\n";
    }
};
```

Compare to Module 4's version: **there is no manual destructor at all**. When `head`'s `unique_ptr` is destroyed, it destroys its `Node`, whose `next` member (also a `unique_ptr`) is then destroyed, destroying *its* `Node`, and so on down the chain — automatically. This is exactly the walk-and-delete loop you wrote by hand in Module 4, now performed for free by the chain of destructors.

**`.get()`** returns the raw pointer *without* transferring ownership — critical for traversal, where you need to walk the list without claiming ownership of each node. This is the correct use of raw pointers even in modern C++: **use raw pointers/references for "observing" an object you don't own; use smart pointers for expressing actual ownership.**

---

## 5. `std::shared_ptr` — when there's more than one owner

`unique_ptr` enforces exactly one owner. Sometimes you genuinely need multiple owners (e.g., a graph node referenced by several other nodes — you'll hit this in Module 9). `std::shared_ptr<T>` uses **reference counting**: the underlying object is destroyed only when the last `shared_ptr` pointing to it is destroyed.

```cpp
std::shared_ptr<int> a = std::make_shared<int>(42);
std::shared_ptr<int> b = a;   // COPY is allowed — refcount goes from 1 to 2

std::cout << a.use_count();   // 2
```

```
a --\
     --> [ refcount: 2 | value: 42 ]
b --/

When a goes out of scope: refcount drops to 1, object NOT freed yet.
When b also goes out of scope: refcount drops to 0, object IS freed.
```

### Trade-off: `unique_ptr` vs. `shared_ptr` vs. raw pointer

| | `unique_ptr` | `shared_ptr` | raw pointer |
|---|---|---|---|
| Ownership | Exactly one | Shared, refcounted | None implied — you decide manually |
| Overhead | None beyond the pointer itself | Extra allocation for the refcount, atomic increment/decrement (thread-safe by default) | None |
| Copyable | No (move-only) | Yes | Yes |
| Use when | You want single, clear ownership (the default choice) | Genuinely multiple owners, unclear which outlives which | Observing/traversing without owning (like `.get()` above), or interfacing with C APIs |

**Rule of thumb, in order of preference**: reach for `unique_ptr` by default. Use `shared_ptr` only when you've actually confirmed you need shared ownership (it's not "the safe default" — it has real runtime cost). Use raw pointers only for non-owning observation, never for anything that should be freed.

There's a third smart pointer, `std::weak_ptr`, that observes a `shared_ptr`-managed object without affecting its refcount (solving reference cycles, where two `shared_ptr`s point at each other and neither refcount ever reaches zero) — mentioned here for completeness; you'll meet it if you build a graph structure with shared ownership in Module 9.

---

## Practice Problems

1. **Measure the move speedup**: Add a `push_back` loop that fills a `DynamicArray` with, say, 1,000,000 elements. Time (a) copy-constructing a second array from it (`DynamicArray b = a;`) vs. (b) move-constructing (`DynamicArray b = std::move(a);`), using `<chrono>`. Confirm the move is dramatically faster.

2. **Compile-time double-free prevention**: Try to copy a `std::unique_ptr<int>` directly (`auto b = a;` where `a` is a `unique_ptr`) and read the compiler error. Contrast this with Module 3's version of the same mistake, which compiled fine and only failed at runtime under AddressSanitizer.

3. **Rebuild `LinkedList` with `unique_ptr`**: Implement the full version from section 4, including `push_front`, `print`, and add `pop_front` (hint: you'll need `std::move` to transfer ownership of `head->next` up to `head` before the old head is destroyed).

4. **`shared_ptr` refcount tracing**: Create a `shared_ptr<int>`, copy it into two more variables, print `use_count()` after each copy, then let them go out of scope one at a time (in a nested block) and print `use_count()` after each destruction.

5. **Rule of Five audit**: Take your `Stack<T>` from Module 5 and add a proper move constructor and move assignment operator (it currently only has the Rule of Three from being copy-pasted off `DynamicArray`). Verify with a timing test like problem 1 that moving a large `Stack<int>` is much faster than copying it.

6. **When NOT to use `std::move`**: Write a function that takes a `std::unique_ptr<int>` by value, and inside it, tries to use the original variable *after* calling the function with `std::move(ptr)`. Observe what happens (hint: it should be `nullptr` — you gave ownership away). Then explain in a comment why calling `std::move` on something you still need afterward is a logic bug, not just a style issue.

---

**Next: Module 7 — Recursion & Trees**, where you'll build a Binary Search Tree using `unique_ptr` for node ownership, and see how the call stack from Module 1 governs recursion's memory cost. Say "next module" when ready.
