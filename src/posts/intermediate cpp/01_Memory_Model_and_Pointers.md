# Module 1: The Memory Model & Pointers

## Why this module comes first

Every data structure you'll build in this series is, underneath, a set of decisions about memory: where things live, who owns them, and when they're freed. If that model isn't solid, OOP and DSA will feel like magic instead of engineering. This module has no DSA "build" — it's the foundation everything else stands on.

---

## 1. Stack vs. Heap

When your program runs, it has (broadly) two regions of memory it uses for data:

```
High addresses
+------------------------+
|      Command-line      |
|      args, env vars    |
+------------------------+
|          Stack          |   <- grows downward
|            |             |
|            v             |
|                          |
|            ^             |
|            |             |
|          Heap            |   <- grows upward
+------------------------+
|     Uninitialized data  |   (BSS)
+------------------------+
|     Initialized data    |   (globals with values)
+------------------------+
|          Text           |   (your compiled code)
+------------------------+
Low addresses
```

**The stack** holds local variables and function call frames. It's managed automatically — when a function is called, a frame is pushed; when it returns, the frame is popped. This is extremely fast (just moving a pointer) and requires no bookkeeping from you.

**The heap** holds memory you request explicitly with `new` (or `malloc` in C-style code) and must explicitly release with `delete`. It's slower to allocate from (the allocator has to find a free block) but it lives as long as *you* want it to — not tied to any function's lifetime.

```cpp
void stackExample() {
    int x = 42;        // x lives on the stack
    // when stackExample() returns, x is gone. No cleanup needed.
}

void heapExample() {
    int* p = new int(42);  // 42 lives on the heap
    // p (the pointer variable) is on the stack, but what it points to is on the heap
    delete p;               // YOU must free it, or it leaks
}
```

### Trade-off: when do you need the heap?

| Situation | Use stack | Use heap |
|---|---|---|
| Size known at compile time, short-lived | ✅ | |
| Size only known at runtime (e.g., array sized by user input) | | ✅ |
| Data must outlive the function that created it | | ✅ |
| Very large data (risk of stack overflow, typically ~1-8MB stack limit) | | ✅ |
| Performance-critical, small, short-lived | ✅ | |

This is exactly why `std::vector` exists — it's a stack-allocated *handle* (small, fast, automatic cleanup) that manages a heap-allocated buffer underneath. You'll build a simplified version of this in Module 3.

---

## 2. Pointers: the basics

A pointer is a variable whose value is a memory address.

```cpp
int x = 10;
int* p = &x;   // p holds the ADDRESS of x
               // & here is the "address-of" operator

std::cout << x;   // 10
std::cout << p;   // some address, like 0x7ffee4a1c
std::cout << *p;  // 10  <- * here is "dereference": "the value AT this address"

*p = 20;       // changes x, because p points AT x
std::cout << x;   // 20
```

**Mental model**: think of `p` as a sticky note with an address written on it. `*p` means "walk to that address and look at what's there." `&x` means "give me the address where x lives."

### Pointer declaration syntax gotcha

```cpp
int* a, b;   // TRAP: a is int*, but b is just a plain int, NOT int*!
int *a, *b;  // this is what you actually meant — both are pointers
```
This is a genuinely confusing piece of C++ syntax. Many style guides recommend declaring one pointer per line to avoid this entirely.

### The null pointer

A pointer that doesn't point to anything valid should be set to `nullptr` (C++11+; avoid the old `NULL` macro in new code):

```cpp
int* p = nullptr;
if (p != nullptr) {
    *p = 5;   // safe, only happens if p actually points somewhere
}
*p = 5;   // if p is nullptr, this CRASHES (dereferencing null)
```

Uninitialized pointers are worse than null pointers — a null pointer crashes predictably when dereferenced; an uninitialized (garbage-value) pointer might silently corrupt unrelated memory. **Always initialize your pointers**, even if just to `nullptr`.

---

## 3. Pointer arithmetic and arrays

Arrays and pointers are closely related in C++: an array's name "decays" to a pointer to its first element in most expressions.

```cpp
int arr[5] = {10, 20, 30, 40, 50};
int* p = arr;        // p now points to arr[0]

std::cout << *p;       // 10
std::cout << *(p + 1); // 20  <- pointer arithmetic: moves by sizeof(int) bytes, not 1 byte
std::cout << p[2];     // 30  <- p[2] is literally shorthand for *(p + 2)
```

```
arr:    [ 10 ][ 20 ][ 30 ][ 40 ][ 50 ]
address: 1000  1004  1008  1012  1016   (assuming 4-byte ints)

p = 1000        p+1 = 1004        p+2 = 1008
*p = 10         *(p+1) = 20       *(p+2) = 30
```

This is why `arr[i]` and `*(arr + i)` are interchangeable, and why array indexing has no bounds checking in C++ — `arr[100]` on a 5-element array just walks 100 elements past the start and reads/writes whatever memory happens to be there. This is a classic source of bugs (and security vulnerabilities). Compile with `-fsanitize=address` while learning, and it will catch this for you loudly instead of letting it corrupt memory silently.

### Trade-off: raw arrays vs. `std::array` vs. `std::vector`

| | Fixed size, stack-allocated, bounds-unchecked | Fixed size, stack-allocated, bounds-checkable | Dynamic size, heap-allocated |
|---|---|---|---|
| Type | `int arr[5]` | `std::array<int, 5>` | `std::vector<int>` |
| Resizable | No | No | Yes |
| Bounds checking | None (`.at()` doesn't exist) | Available via `.at()` | Available via `.at()` |
| Overhead | None | None | Small (heap allocation + bookkeeping) |
| When to use | Rarely, in modern C++ | Fixed-size collections | Default choice for most cases |

In modern C++, prefer `std::array` or `std::vector` over raw arrays. You're learning raw pointers/arrays here because understanding *why* those containers are safer requires seeing what they're protecting you from.

---

## 4. References vs. pointers

A reference is an alias for an existing variable — a second name for the same memory.

```cpp
int x = 10;
int& ref = x;   // ref IS x, just under a different name
ref = 20;       // this changes x
std::cout << x; // 20
```

### Key differences

| | Pointer | Reference |
|---|---|---|
| Can be null | Yes (`nullptr`) | No — must be bound to a real object at creation |
| Can be reassigned to point elsewhere | Yes | No — once bound, always refers to that object |
| Needs dereferencing (`*`) to access value | Yes | No — used like the original variable |
| Can do arithmetic on it | Yes (`p + 1`) | No |

### Trade-off: when to use which

- **Use a reference** when a value must always exist and you never need to "re-point" it — most commonly, function parameters where you want to avoid copying a large object, or avoid the syntax overhead of pointers.
- **Use a pointer** when the thing might not exist (needs to represent "nothing," i.e., `nullptr`), or when you need to reassign what it refers to, or when you're managing heap memory directly.

```cpp
// Passing large objects: use const reference to avoid copying
void printVector(const std::vector<int>& v) { /* ... */ }

// Optional/nullable relationship: use a pointer
class Node {
    int value;
    Node* next;   // next might legitimately be nullptr (end of list)
};
```

That `Node* next` pattern is exactly what you'll use to build a Linked List in Module 4 — a pointer is how one object "points to" another that might or might not exist.

---

## 5. Dynamic memory management

```cpp
// Single object
int* p = new int(42);
delete p;

// Array
int* arr = new int[10];      // 10 ints on the heap
delete[] arr;                // MUST use delete[] to match new[]
```

**Rule**: every `new` needs exactly one matching `delete`. Every `new[]` needs exactly one matching `delete[]`. Mismatching these (using `delete` on a `new[]`-allocated array) is undefined behavior.

### The three classic pointer bugs

**1. Memory leak** — you `new` something and lose the only pointer to it before `delete`-ing:
```cpp
void leak() {
    int* p = new int(5);
    p = new int(10);   // the first int(5) is now unreachable — leaked forever
    delete p;           // only frees the second one
}
```

**2. Dangling pointer** — you `delete` something but keep using the pointer:
```cpp
int* p = new int(5);
delete p;
std::cout << *p;   // undefined behavior — p "dangles," pointing to freed memory
```

**3. Double free** — you `delete` the same pointer twice:
```cpp
int* p = new int(5);
delete p;
delete p;   // undefined behavior, often crashes or corrupts the heap allocator's bookkeeping
```

```
Timeline of a dangling pointer:

new int(5)  ->  [ heap block: 5 ]  <- p points here
delete p    ->  [ freed, may be reused by ANYTHING ]  <- p still points here!
*p          ->  reads garbage, or another object's data, or crashes
```

These three bugs are exactly what `-fsanitize=address` is built to catch. **Compile every example in this module with it and deliberately trigger each bug once**, so you see the sanitizer's error message and recognize it in the future.

### A preview: why smart pointers exist

Manually pairing every `new` with a `delete` is error-prone the moment your control flow gets complicated (early returns, exceptions, multiple code paths). Modern C++ solves this with **smart pointers** (`std::unique_ptr`, `std::shared_ptr`), which automatically call `delete` when they go out of scope. We're deferring smart pointers to Module 6 — you need to feel the pain of manual memory management first, or the smart pointer designs won't make intuitive sense.

---

## 6. `const` and pointers (a syntax trap worth knowing now)

```cpp
int x = 5, y = 10;

const int* p1 = &x;   // pointer to a CONST int: can't do *p1 = 6, but CAN do p1 = &y
int* const p2 = &x;   // CONST pointer to an int: CAN do *p2 = 6, but can't do p2 = &y
const int* const p3 = &x;  // neither can change
```

**Reading trick**: read the declaration right-to-left from the variable name. `const int* p1` reads as "p1 is a pointer to an int that is const." `int* const p2` reads as "p2 is a const pointer to an int."

---

## Practice Problems

Try these before moving on. Compile with `-fsanitize=address,undefined -g` for all of them.

1. **Predict then verify**: Write a program with an `int arr[3] = {1,2,3};` and print `*(arr+5)`. Predict what will happen before running it, then run it with and without AddressSanitizer and compare.

2. **Swap by pointer**: Write `void swap(int* a, int* b)` that swaps two integers using pointers (not references). Then write a version using references instead. Which is easier to read, and why might you still sometimes prefer the pointer version?

3. **Trigger and diagnose**: Deliberately write code that causes (a) a memory leak, (b) a dangling pointer read, and (c) a double free. Run each one under AddressSanitizer and read the error message it produces — note what information it gives you (line numbers, allocation history).

4. **Stack vs heap sizing**: Try allocating a huge local array on the stack, e.g. `int arr[100000000];` inside `main()`. What happens? Now allocate the same size with `new int[100000000]`. What's different, and why?

5. **Const pointer puzzle**: Given `const int* const p = &x;`, list every operation on `p` and `*p` that is and isn't legal. Write the code to confirm your answers compile or fail as expected.

6. **Build a tiny "manual vector"**: Write a function `int* growArray(int* oldArr, int oldSize, int newSize)` that allocates a new array of `newSize`, copies over the old elements, frees the old array, and returns the new pointer. This is literally the core operation `std::vector` performs internally when it resizes — you'll formalize this into a real class in Module 3.

---

**Next: Module 2 — Data Types, Trade-offs, and Bitwise Operations.** Say "next module" when you're ready.
