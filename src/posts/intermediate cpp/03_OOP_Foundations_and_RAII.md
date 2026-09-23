# Module 3: OOP Foundations + RAII — Building a `DynamicArray`

## Why this module matters

You already know the syntax of classes. What ties OOP to everything in Module 1 is **RAII** (Resource Acquisition Is Initialization) — the idea that a class's constructor acquires a resource (like heap memory) and its destructor releases it automatically. This is *the* central idiom of C++ and the reason `std::vector` never leaks memory even though it's managing raw heap allocations internally, exactly like the `growArray` function you wrote in Module 1's practice problems.

This module's build: a simplified `DynamicArray` class — essentially a teaching version of `std::vector<int>`.

---

## 1. Encapsulation, recap with intent

```cpp
class DynamicArray {
private:
    int* data;       // pointer to heap-allocated buffer
    int capacity;     // how much space is allocated
    int count;        // how many elements are actually in use
public:
    // ... interface goes here
};
```

The point of `private` isn't just "hiding" — it's protecting the **invariant** that `data` always points to a valid buffer of at least `capacity` ints, and `count <= capacity` always holds. If external code could directly poke at `data` or `count`, it could easily violate that invariant (e.g., set `count` to 100 while `capacity` is 10) and corrupt memory. Every public method's job is to change the internal state *without ever breaking the invariant*.

---

## 2. Constructors

```cpp
class DynamicArray {
private:
    int* data;
    int capacity;
    int count;

public:
    // Default constructor
    DynamicArray() : data(nullptr), capacity(0), count(0) {}

    // Constructor with initial capacity
    explicit DynamicArray(int initialCapacity)
        : data(new int[initialCapacity]), capacity(initialCapacity), count(0) {}
};
```

**The `: data(...), capacity(...), count(...)` syntax is a member initializer list.** Prefer it over assigning inside the constructor body:

```cpp
// Works, but slightly worse:
DynamicArray(int initialCapacity) {
    data = new int[initialCapacity];  // this is ASSIGNMENT, after default-construction
    capacity = initialCapacity;
    count = 0;
}
```
For simple types like `int*` and `int` the difference is negligible, but for class-typed members it matters a lot: the initializer list directly *constructs* the member with the right value, while assignment in the body first default-constructs it, then throws that away and assigns — wasted work, and for some types (references, `const` members) assignment-in-body doesn't even compile. Build the habit now.

**`explicit`**: prevents the compiler from using this constructor for *implicit* conversions. Without it, `DynamicArray arr = 5;` would silently compile, treating `5` as "initial capacity" — surprising and rarely what you want. `explicit` forces `DynamicArray arr(5);` or `DynamicArray arr{5};` instead. Rule of thumb: mark single-argument constructors `explicit` unless you have a specific reason to want implicit conversion.

---

## 3. Destructors — closing the RAII loop

```cpp
~DynamicArray() {
    delete[] data;
}
```

This is the entire point of the module. Whatever heap memory the constructor acquired, the destructor releases — **automatically**, whenever the object goes out of scope, no matter how it exits (normal return, early return, even an exception unwinding the stack). This is exactly the manual "every `new` needs a `delete`" discipline from Module 1, except now the compiler enforces the *timing* for you. You can never forget to call the destructor — it happens automatically.

```cpp
void useArray() {
    DynamicArray arr(10);   // constructor runs, allocates
    // ... use arr ...
}   // <- arr goes out of scope HERE, destructor runs automatically, memory freed
```

Compare this to Module 1's manual version, where forgetting a single `delete` on one code path leaked memory. RAII eliminates that entire class of bug by tying the lifetime of the resource to the lifetime of an object on the stack.

---

## 4. The Rule of Three (and why copying is dangerous here)

If a class manages a resource (like our `int* data`), and you don't explicitly handle copying, C++ gives you a **compiler-generated copy constructor** that does a *shallow copy* — it copies the pointer value, not what it points to.

```cpp
DynamicArray a(5);
DynamicArray b = a;   // shallow copy: b.data == a.data (SAME address!)

// Now both a and b think they own the same heap buffer.
// When a's destructor runs: delete[] a.data  (frees the buffer)
// When b's destructor runs: delete[] b.data  (DOUBLE FREE — same address!)
```

```
Shallow copy (the bug):

a.data ---\
            --> [ heap buffer ]
b.data ---/

Both point to the SAME memory. Whoever's destructor runs
second is doing a double-free (Module 1's bug #3).
```

**The Rule of Three**: if your class needs a custom destructor, it almost certainly also needs a custom copy constructor and a custom copy assignment operator — because the default shallow-copy behavior is wrong the moment your class owns a resource.

```cpp
class DynamicArray {
    // ... as before ...
public:
    // 1. Destructor
    ~DynamicArray() { delete[] data; }

    // 2. Copy constructor: DEEP copy
    DynamicArray(const DynamicArray& other)
        : data(new int[other.capacity]), capacity(other.capacity), count(other.count) {
        for (int i = 0; i < count; i++) {
            data[i] = other.data[i];
        }
    }

    // 3. Copy assignment operator: DEEP copy, with self-assignment and old-memory handling
    DynamicArray& operator=(const DynamicArray& other) {
        if (this == &other) return *this;   // guard against arr = arr;

        delete[] data;   // free our old buffer before taking a new one

        capacity = other.capacity;
        count = other.count;
        data = new int[capacity];
        for (int i = 0; i < count; i++) {
            data[i] = other.data[i];
        }
        return *this;
    }
};
```

```
Deep copy (correct):

a.data ---> [ heap buffer A ]
b.data ---> [ heap buffer B, independent copy of A's contents ]

Each object owns its own memory. Each destructor frees only its own buffer.
```

**Note on the copy assignment operator's return type**: it returns `DynamicArray&` (a reference to `*this`) specifically so chained assignment (`a = b = c;`) works, matching how built-in types behave.

### Trade-off: is the Rule of Three enough, or do you need more?

The Rule of Three is the *minimum* correct behavior. Modern C++ extends it to the **Rule of Five**, adding a move constructor and move assignment operator for performance (avoiding unnecessary deep copies when the source object is about to be destroyed anyway). We're deliberately deferring that to Module 6, once you've felt exactly how expensive deep copying is — the motivation for move semantics won't land without this module first.

---

## 5. `const` correctness in member functions

```cpp
class DynamicArray {
public:
    int get(int index) const {   // this method promises not to modify the object
        return data[index];
    }

    void set(int index, int value) {   // no const: this one does modify
        data[index] = value;
    }
};
```

The trailing `const` on `get` means "this method will not modify any member variables" (except ones marked `mutable`, an escape hatch you'll rarely need). This matters because it lets you call `get` on a `const DynamicArray&` — if `get` weren't marked `const`, the compiler wouldn't let you call it on a const reference, even though it's obviously safe (it doesn't mutate anything). Mark every method `const` that doesn't need to mutate state — it's not optional style, it's part of the type's correctness contract.

---

## 6. Putting it together: growth strategy

The core operation — what actually makes this a "dynamic" array — is resizing when `count` reaches `capacity`:

```cpp
void push_back(int value) {
    if (count == capacity) {
        grow();
    }
    data[count] = value;
    count++;
}

private:
void grow() {
    int newCapacity = (capacity == 0) ? 1 : capacity * 2;
    int* newData = new int[newCapacity];
    for (int i = 0; i < count; i++) {
        newData[i] = data[i];
    }
    delete[] data;
    data = newData;
    capacity = newCapacity;
}
```

### Trade-off: doubling capacity vs. growing by a fixed amount

| Strategy | Amortized cost of `push_back` | Wasted memory (worst case) |
|---|---|---|
| Grow by fixed amount (e.g. +10 each time) | O(n) per push_back — bad for large n | Low |
| Double capacity each time | O(1) amortized — this is why `push_back` is "usually" instant | Up to ~50% unused |

Doubling is what `std::vector` actually does (the exact growth factor is implementation-defined, but doubling or similar exponential growth is universal) because it guarantees that the *total* cost of growing from empty to n elements is O(n), not O(n²) — each element gets copied O(log n) times total across all the resizes, not once per resize. This is the classic "amortized O(1)" argument you'll see formalized in Module 10 (Complexity).

---

## Practice Problems

1. **Trace the bug**: Remove the copy constructor and copy assignment operator from a `DynamicArray` (let the compiler generate defaults), create two objects where one is copy-constructed from the other, let both go out of scope, and run under AddressSanitizer. Read the double-free error it reports.

2. **Implement `pop_back` and `resize` down**: Add a `pop_back()` that decrements `count` (no need to actually shrink the buffer — just don't count that slot as in-use). Then add a `shrink_to_fit()` that reallocates to exactly `count` capacity.

3. **Const-correctness audit**: Go through every method you've written and determine which should be `const`. Try calling a non-const method on a `const DynamicArray&` parameter and confirm the compiler rejects it.

4. **Growth factor experiment**: Add a static counter that increments every time `grow()` is called. Push 1000 elements with a doubling strategy and print the counter. Then change the strategy to "+10 capacity each grow" and compare the counter value. This makes the amortized-cost argument concrete rather than theoretical.

5. **Bounds checking**: Add an `at(int index)` method that throws `std::out_of_range` if the index is invalid (compare to `operator[]`, which — like `std::vector` — should skip the check for speed). This is the same trade-off from Module 1's array bounds-checking discussion, now as a deliberate design choice you're making yourself.

6. **Full build**: Assemble everything into one working `DynamicArray` class with `push_back`, `pop_back`, `get`/`set` or `operator[]`, `size()`, `capacity()`, a working Rule of Three, and const-correct methods where appropriate. Write a small `main()` that pushes 20 elements and prints them, and run the whole thing under AddressSanitizer to confirm there are zero leaks.

---

**Next: Module 4 — Inheritance & Polymorphism**, where you'll build a polymorphic shape hierarchy and start a Linked List (using the `Node*` pattern previewed in Module 1). Say "next module" when ready.
