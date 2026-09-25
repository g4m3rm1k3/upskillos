# Lesson 2.3: Constructors / Destructors

*Phase 2 — What an "Object" Actually Is*
*Python's `__init__` has a real, deterministic counterpart here — `__del__` is unreliable in Python; C++ destructors are guaranteed. This is a genuine difference worth sitting with.*

---

## Closing the gap, finally

Twice now — Lesson 2.1 and Lesson 2.2 — you've hit the exact same bug: create an `IntArray`, forget to manually set `data = nullptr; size = 0; capacity = 0;`, and `pushBack` immediately does something undefined with garbage memory. Both lessons ended by naming this gap and promising this lesson would close it. Here's how.

## The constructor

A **constructor** is a special member function that runs *automatically*, exactly once, the instant an object is created — before any other code can touch it. It has no return type, and its name is always identical to the class's name:

```cpp
class IntArray {
public:
    int* data;
    int size;
    int capacity;

    IntArray() {              // <- the constructor
        data = nullptr;
        size = 0;
        capacity = 0;
    }

    void pushBack(int value) { /* ...same as before... */ }
};
```

```cpp
int main() {
    IntArray numbers;   // constructor runs HERE, automatically — data is nullptr, guaranteed
    numbers.pushBack(5);   // now genuinely safe — no way to have skipped initialization
    return 0;
}
```

Nothing about `main()` changed at all — no explicit call to any constructor, no `numbers.data = nullptr;` anywhere. `IntArray numbers;` alone triggers the constructor, automatically, unconditionally. This is the actual fix: it's no longer possible to *forget* to initialize an `IntArray`, because there's no code path that creates one without running the constructor first. Compare this against Lesson 2.1 and 2.2's bug — this isn't "remember to do it correctly," it's "the compiler will not let you skip it."

## Python's `__init__` — genuinely similar, here

```python
class IntArray:
    def __init__(self):
        self.data = []
        self.size = 0
```

You already know this pattern completely — C++'s constructor is doing precisely what `__init__` does: running automatically on creation, setting up initial state. This is one of the few places in the curriculum where C++ and Python line up almost exactly, syntax aside.

## Constructors can take parameters too

```cpp
class IntArray {
public:
    int* data;
    int size;
    int capacity;

    IntArray() {
        data = nullptr;
        size = 0;
        capacity = 0;
    }

    IntArray(int initialCapacity) {   // a SECOND constructor, with a parameter
        data = new int[initialCapacity];
        size = 0;
        capacity = initialCapacity;
    }

    void pushBack(int value) { /* ... */ }
};

int main() {
    IntArray a;          // uses the first constructor — starts empty
    IntArray b(100);      // uses the second — pre-allocates room for 100 elements immediately
    return 0;
}
```

This is **constructor overloading** — a class can have multiple constructors, distinguished purely by their parameter lists, and C++ picks the right one based on how you write the creation call. `IntArray b(100);` is meaningfully useful here: if you already know you'll be pushing roughly 100 elements, pre-allocating avoids several of Lesson 1.6's grow-and-copy cycles entirely — a real, direct performance win, made available purely by giving the object more information at the moment it's born.

## The destructor — where C++ genuinely surpasses Python

```cpp
class IntArray {
public:
    int* data;
    int size;
    int capacity;

    IntArray() {
        data = nullptr;
        size = 0;
        capacity = 0;
    }

    ~IntArray() {              // <- the destructor: same name, prefixed with ~, no return type, no parameters
        delete[] data;
        std::cout << "IntArray destroyed, memory freed" << std::endl;
    }

    void pushBack(int value) { /* ... */ }
};
```

The destructor runs automatically too — but at the *other* end of the object's life, the instant it goes out of scope (a stack object) or is explicitly `delete`d (a heap object, via `new`). No more `delete[] numbers.data;` at the bottom of `main()`, remembered by hand, matching Lesson 1.4's manual discipline. It's gone. The class handles its own cleanup now.

```cpp
#include <iostream>

int main() {
    {
        IntArray numbers;
        numbers.pushBack(1);
        numbers.pushBack(2);
        std::cout << "about to leave this scope..." << std::endl;
    }   // <- destructor runs HERE, automatically, the instant this block ends
    std::cout << "scope has ended" << std::endl;
    return 0;
}
```

Run this and watch "IntArray destroyed, memory freed" print *between* the two other lines — proof the destructor really did fire automatically, at exactly the right moment, with zero code written at the call site to trigger it.

**Now, the genuine difference from Python, worth sitting with, as the lesson title promises:** Python has `__del__`, which looks similar on paper —

```python
class IntArray:
    def __del__(self):
        print("IntArray destroyed")
```

— but `__del__` is **not guaranteed to run at any predictable time**, because it fires whenever the garbage collector happens to reclaim the object, which could be immediately, could be much later, or in some circumstances (reference cycles, interpreter shutdown ordering) might not run at all in any way you can rely on. This is a direct, structural consequence of Lesson 1.4's reference-counting explanation: Python decides cleanup timing for you, on its own schedule. **C++'s destructor is deterministic — it runs at one exact, predictable moment: when the object's scope ends, full stop, every single time, no exceptions.** You can read a C++ program and know, precisely, on which line every destructor fires. You cannot generally do that with `__del__` in Python. This determinism is not a minor implementation detail — it's about to become the single most important idea in the entire curriculum, two lessons from now, in Lesson 2.5's RAII.

## Try it yourself

**1. Build the full class above (both constructors, plus destructor) and confirm the scope-based cleanup timing directly**, using the nested-block example. Predict exactly which line "IntArray destroyed" will print on, before running it.

**2. Confirm constructor overloading picks the right constructor:**

```cpp
#include <iostream>

int main() {
    IntArray a;
    IntArray b(50);

    std::cout << "a.capacity = " << a.capacity << std::endl;   // 0
    std::cout << "b.capacity = " << b.capacity << std::endl;   // 50

    return 0;
}
```

**3. Trigger multiple destructor calls and watch the order.** Objects are destroyed in the *reverse* order they were created — this matters and is worth seeing directly:

```cpp
#include <iostream>

int main() {
    std::cout << "creating a" << std::endl;
    IntArray a;
    std::cout << "creating b" << std::endl;
    IntArray b;
    std::cout << "main ending" << std::endl;
    return 0;
}   // watch the order destructors print in here
```

Predict the destruction order before running it (hint: it's the reverse of creation order — think about why that follows naturally from how the stack itself works, back in Lesson 1.1).

**4. Deliberately break the "no way to forget initialization" guarantee** by writing a class with a constructor that forgets to initialize one field, and confirm the bug is now *in the constructor*, in one obvious place, rather than scattered across every call site that creates the object. This is itself a real benefit: even when a mistake happens, it now has exactly one place to live and get fixed, instead of needing to be fixed everywhere the class is used.

## What this cost / bought us

| | No constructor/destructor (Lessons 2.1–2.2) | With constructor/destructor (this lesson) | Python `__init__`/`__del__` |
|---|---|---|---|
| Guaranteed initialization | No — a real, recurring bug | Yes — impossible to skip | Yes, `__init__` is reliable |
| Guaranteed cleanup | No — must remember `delete[]` everywhere | Yes — automatic, on scope exit | `__del__` exists but timing is **not** guaranteed |
| When cleanup happens | Whenever you remembered to write it | Deterministic — exactly when scope ends | Whenever the GC gets around to it |
| Multiple ways to construct | Not applicable | Yes — constructor overloading | Python has one `__init__`, but default arguments cover some of this |

This lesson closes a real, felt gap — you hit this bug twice on purpose so that the fix would land with actual weight instead of feeling like arbitrary new syntax. The determinism point in the table's third row is not a side note. It's the seed of Lesson 2.5's RAII, arriving in two lessons, which is the single idea this entire curriculum considers the most important C++-specific concept you'll learn.

---

**Next up: Lesson 2.4 — Access control (`private`/`public`).** You've been writing `public:` at the top of `IntArray` this whole time without asking why it's necessary — time to find out what it's actually protecting you from.
