# Lesson 2.7: Copying vs. Moving

*Phase 2 — What an "Object" Actually Is*
*Why C++ has two ways to hand off an object and Python has neither — everything in Python is a reference.*

---

## The bug that's been waiting since Lesson 0.3

Every one of C++'s built-in behaviors has been consistent since Lesson 0.3: assignment and copying copy the bytes, box for box. That was harmless for `int`, harmless for `Point`. It is **not** harmless for `IntArray`, and this lesson is about the exact moment that stops being harmless — and what to do about it.

```cpp
#include <iostream>

int main() {
    IntArray a;
    a.pushBack(1);
    a.pushBack(2);
    a.pushBack(3);

    IntArray b = a;   // this compiles. this looks completely innocent.

    return 0;
}   // CRASH, or silent corruption, when a and b are destroyed
```

Here's exactly what went wrong. `IntArray b = a;` triggers C++'s **default copy behavior**, which — because you never told it otherwise — copies every field byte-for-byte, exactly the way `Point`'s copy worked back in Lesson 0.3. That includes `data`. Not what `data` points *at* — the pointer itself, the raw address:

```
a.data  ──────┐
              ├──► [heap block holding 1, 2, 3]
b.data  ──────┘
```

Both `a` and `b` now hold the *identical* address. There's still only one heap block — two objects both think they own it. When `main()` ends, `a`'s destructor runs `delete[] data;`, freeing that block. Then `b`'s destructor runs — and calls `delete[] data;` on memory that's *already been freed*. This is Lesson 1.4's double-free bug, reintroduced silently, by code that looks perfectly ordinary. This is called a **shallow copy**, and it's the default, and it's wrong for any class that owns a heap resource.

## The fix: a copy constructor you write yourself

You can override C++'s default copy behavior by defining your own **copy constructor** — a constructor that takes a `const` reference to another object of the same type:

```cpp
class IntArray {
private:
    int* data;
    int size;
    int capacity;

public:
    IntArray() : data(nullptr), size(0), capacity(0) {}

    // Copy constructor — runs whenever an IntArray is built FROM another IntArray
    IntArray(const IntArray& other) {
        size = other.size;
        capacity = other.capacity;
        data = new int[capacity];              // a genuinely NEW, separate block
        for (int i = 0; i < size; i++) {
            data[i] = other.data[i];            // copy the VALUES, not the pointer
        }
    }

    ~IntArray() {
        delete[] data;
    }

    void pushBack(int value) { /* ...same as before... */ }
};
```

Notice the parameter: `const IntArray& other`. Reference (Lesson 1.3), to avoid infinitely recursing into copying `other` itself just to read it. `const` (Lesson 0.6), because copying `a` into `b` should never modify `a`. This is now a **deep copy** — a genuinely separate heap block, with the same values, but no shared ownership at all:

```
a.data  ──────► [heap block A: 1, 2, 3]
b.data  ──────► [heap block B: 1, 2, 3]   (separate allocation, same contents)
```

Now `IntArray b = a;` produces two fully independent objects. Modifying `b` never touches `a`. Destroying either one only ever frees its own block. The double-free is gone, structurally, the same way Lesson 2.3's constructor made "forgot to initialize" structurally impossible.

## Copy assignment — the other place copying happens

`IntArray b = a;` (copy *construction* — `b` didn't exist yet) is different from:

```cpp
IntArray a, b;
a.pushBack(1);
b.pushBack(99);
b = a;   // COPY ASSIGNMENT — b already existed
```

This calls a different function, the **copy assignment operator**, and it needs its own fix — critically, it must free `b`'s *existing* data before copying `a`'s, or `b`'s original heap block leaks (Lesson 1.4, again):

```cpp
IntArray& operator=(const IntArray& other) {
    if (this == &other) return *this;   // guard against a = a (self-assignment)

    delete[] data;                       // free THIS object's existing block first

    size = other.size;
    capacity = other.capacity;
    data = new int[capacity];
    for (int i = 0; i < size; i++) {
        data[i] = other.data[i];
    }

    return *this;                        // enables chaining: a = b = c;
}
```

`operator=` is your first taste of **operator overloading** (a full lesson's worth of material Phase 11 will expand on) — you're defining what the `=` symbol *means* for your own type, the same way `pushBack` defines what "add an element" means for it.

## Copying is expensive — moving is the answer

Deep copying is correct, but it's not free — copying a 10,000-element `IntArray` means allocating a new 10,000-element block and copying every value over, every single time you hand the object off. Often, you don't actually need the *original* to survive at all:

```cpp
IntArray makeArray() {
    IntArray result;
    result.pushBack(1);
    result.pushBack(2);
    return result;   // result is about to be destroyed anyway — why copy its data at all?
}

IntArray a = makeArray();
```

Copying `result`'s data into `a`, only to immediately destroy `result` a moment later, is pure waste — allocate, copy, then throw the original away. **Moving** solves this: instead of duplicating the heap block, just *steal* the pointer from the source and leave the source empty.

```cpp
// Move constructor — takes a non-const reference to an rvalue (a temporary, about to be destroyed)
IntArray(IntArray&& other) noexcept {
    data = other.data;         // STEAL the pointer — no allocation, no copying values
    size = other.size;
    capacity = other.capacity;

    other.data = nullptr;      // leave the source in a valid, empty, safely-destructible state
    other.size = 0;
    other.capacity = 0;
}
```

`IntArray&&` — double ampersand — is an **rvalue reference**, C++'s way of saying "this parameter refers to a temporary object that's about to be destroyed anyway, so it's safe to cannibalize it instead of copying it." The move constructor's whole job is theft, not duplication: copy the *pointer* (cheap — just 8 bytes), then null out the source so its destructor, which will still run, safely does nothing (`delete[] nullptr;` is explicitly guaranteed safe in C++ — no crash).

## `std::move` — explicitly asking for a move

Sometimes you have a named, still-alive object that you *know* you're done with, and want to move rather than copy:

```cpp
IntArray a;
a.pushBack(1);
a.pushBack(2);

IntArray b = std::move(a);   // explicitly say: "I'm done with a, steal its guts"
// a is now empty (valid, but empty) — using it further would be a logic bug, not a crash
```

`std::move` doesn't actually move anything by itself — it's just a cast that tells the compiler "treat this named object as if it were a temporary, so the move constructor gets chosen instead of the copy constructor." You met this already, briefly, in Lesson 1.7's `unique_ptr` ownership transfer — same mechanism, now you know what it's actually doing underneath.

## Why Python never needed any of this

Go all the way back to Lesson 0.3. In Python, `b = a` never copies anything at all — it's two labels on one shared object, always, unconditionally. There's no "deep vs. shallow" distinction to get wrong, because Python simply never copies unless you explicitly ask for it (`copy.deepcopy`). C++'s entire copy/move machinery exists precisely *because* Lesson 0.3's boxes model is real: assignment genuinely duplicates data by default, which is exactly right for a `Point` and exactly wrong for anything owning a heap resource — and the language needs a way for *you* to say which situation you're in, for every class you write.

## Try it yourself

**1. Reproduce the double-free crash from the top of this lesson**, using an `IntArray` with no copy constructor defined (just the default). If you have `valgrind`, run it and read the "invalid free" or "double free" report directly.

**2. Add the copy constructor and copy assignment operator above, rerun the same program, and confirm the crash is gone** — then modify `b` after copying and confirm `a` is genuinely untouched.

**3. Add the move constructor, then write a function like `makeArray()` above and trace, by hand, whether copy or move gets used** — add a `std::cout` line inside both the copy and move constructors so you can watch, at runtime, which one the compiler actually picked for `IntArray a = makeArray();` versus `IntArray b = a;`.

## What this cost / bought us

| | Default (shallow) copy | Your copy constructor (deep copy) | Move constructor |
|---|---|---|---|
| What's duplicated | Just the pointer — both objects share one block | A whole new block, same values | Nothing — the pointer is stolen, no allocation |
| Correctness for heap-owning classes | Broken — double-free | Correct | Correct, and cheap |
| Cost | Cheap, but wrong | Correct, but O(n) — full copy every time | Correct *and* cheap — O(1) |
| Python equivalent | This is what `b = a` always does in Python (shared reference) — safe there because Python never frees on scope exit the way C++ does | `copy.deepcopy(a)` — must be requested explicitly | Not really a Python concept — nothing to "steal," since there was never ownership to transfer |

This closes out the theory portion of Phase 2. You now have every piece `MyVector` needs to be genuinely correct: guaranteed initialization (2.3), guaranteed cleanup (2.3, 2.5), protected invariants (2.4), and now, correct copy *and* move behavior for a class that owns heap memory. The project is next.

---

**Next up: the Phase 2 project — turn your `IntArray` into a real class `MyVector`, complete with constructor, destructor, copy constructor, copy assignment, and move constructor — this is, genuinely, literally, step one of implementing `std::vector` yourself.** After that: a file-I/O checkpoint, your first contact with `<fstream>`, before Phase 3's Big-O discussion puts a name to why all of this was worth building by hand.
