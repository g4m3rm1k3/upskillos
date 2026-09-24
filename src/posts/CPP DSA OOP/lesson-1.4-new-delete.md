# Lesson 1.4: `new` / `delete` — Why Forgetting `delete` Is a Real Bug

*Phase 1 — Memory: The Thing Python Hides From You*
*Python's GC does this for you.*

---

## Finally allocating on the heap

Every lesson since 1.1 has been runway toward this moment: you now know the heap exists (1.1), you know what a pointer is (1.2), you know references are a safer alternative but structurally can't do this job (1.3). Now you actually put memory on the heap, on purpose, and take full responsibility for it.

```cpp
int* p = new int(42);
```

`new int(42)` does two things: it asks the operating system for enough memory to hold one `int`, somewhere on the heap, and initializes it to `42`. It hands you back the **address** of that memory — which is exactly why the result goes into a pointer, not a plain `int`. This memory is now yours. It does not belong to any function's stack frame. It will not be cleaned up when the current function returns. It will exist until one specific thing happens: you call `delete` on it.

```cpp
#include <iostream>

int main() {
    int* p = new int(42);
    std::cout << *p << std::endl;   // 42 — dereference to read it, same as Lesson 1.2

    delete p;   // free the memory — give it back
    // *p is now UNDEFINED — the memory might be reused for something else already

    return 0;
}
```

## Why `delete` is not optional

Here's the sentence to internalize: **heap memory you allocate with `new` does not go away on its own, ever, for any reason, until you `delete` it — not when the pointer goes out of scope, not when the function returns, not when your program looks like it's "done" with it.** The pointer variable `p` itself is a stack variable and *will* disappear when `main()` returns (Lesson 1.1). But `p` disappearing does not free the memory `p` was pointing at — it just means you've now lost the only address that could ever find that memory again.

```cpp
void leaky() {
    int* p = new int(42);   // allocate on the heap
}   // p (the STACK variable) is destroyed here — but the heap memory it
    // pointed to is NOT freed. It's still out there. Nothing can reach it anymore.
    // This is a MEMORY LEAK.

int main() {
    for (int i = 0; i < 1000000; i++) {
        leaky();   // leaks a little more memory, one million times
    }
    return 0;
}
```

This compiles fine. It runs fine, for a while. And it slowly, silently consumes more and more of your system's memory, with no error, no warning, no crash — until either your program runs out of memory and dies, or (worse, in a long-running program like a server) it just keeps degrading system performance for everyone until someone restarts it. This is why "forgetting `delete`" isn't a style nitpick — it's a genuine, common, production-grade bug class, and it is structurally impossible in Python.

## Why it's impossible in Python

Python's garbage collector solves exactly this problem for you, automatically:

```python
def leaky():
    x = SomeObject()   # allocated on Python's heap (everything in Python lives there)
    # x goes out of scope here — but unlike C++, this is FINE

for i in range(1000000):
    leaky()
```

Python's runtime keeps a count of how many references point at each object. When `leaky()` returns, `x`'s label disappears, the reference count on that object drops to zero, and the garbage collector reclaims the memory — automatically, on its own schedule, without you writing a single line asking it to. This is genuinely one of the best features of Python, and one C++ simply does not have by default. What you're learning right now is the actual mechanism Python is running for you behind the scenes, and you're temporarily doing its job by hand.

## `new[]` and `delete[]` — arrays need the matching pair

Allocating an array on the heap uses a slightly different form, and — this matters — it needs a matching different form of `delete`:

```cpp
int* arr = new int[10];       // allocate an array of 10 ints on the heap
arr[0] = 1;
arr[1] = 2;
// ...
delete[] arr;                  // MUST use delete[], not delete, for arrays
```

Using plain `delete arr;` on something allocated with `new[]` is undefined behavior — it might appear to work, it might corrupt memory, it might crash, unpredictably, possibly nowhere near the line that actually caused the problem. This asymmetry (`new`/`delete` vs. `new[]`/`delete[]`) is a real, sharp edge in C++, and it's one of the concrete reasons Lesson 1.6 will have you build your own resizable array — you need to feel this mechanism directly, since it's exactly what `std::vector` is doing for you under the hood, safely, every time you use it later.

## The two failure modes, named

You now have enough vocabulary for the two classic heap bugs this entire phase is building toward avoiding:

- **Memory leak** — you allocate with `new`, lose every pointer that could reach it, and never `delete` it. The memory sits there, unreachable and unusable, for the rest of your program's life. You saw this above.
- **Dangling pointer / double-free** — you `delete` something, but a pointer to it still exists and gets dereferenced or deleted again afterward:

```cpp
int* p = new int(42);
delete p;          // memory is freed, given back to the system
std::cout << *p;   // UNDEFINED BEHAVIOR — p is now a "dangling pointer"
delete p;           // UNDEFINED BEHAVIOR — deleting the same memory twice
```

Both of these compile without any warning in most setups. Both can run "successfully" many times before failing unpredictably. This unpredictability — not the syntax — is the actual reason C++ has a reputation for being harder to debug than Python: the bug and its symptom can be arbitrarily far apart in your code.

## Try it yourself

**1. Build and free a single heap value, watching the address:**

```cpp
#include <iostream>

int main() {
    int* p = new int(42);
    std::cout << "heap address: " << p << std::endl;
    std::cout << "value: " << *p << std::endl;
    delete p;
    return 0;
}
```

Compare this address against a stack variable's address from Lesson 1.1's examples — on most systems, heap and stack addresses look distinctly different (often heap addresses are much larger numbers), a rough visual confirmation that these really are separate regions of memory.

**2. Deliberately leak memory, then deliberately fix it**, to feel both sides:

```cpp
void leaky() {
    int* p = new int(42);   // leaked — no delete
}

void notLeaky() {
    int* p = new int(42);
    delete p;   // fixed
}

int main() {
    leaky();
    notLeaky();
    return 0;
}
```

Both compile and run identically from the outside — this is exactly what makes leaks dangerous: nothing observable happens at the point of the bug. (If you have `valgrind` available on your system, run `valgrind ./yourprogram` on the leaky version — it will report exactly how many bytes were leaked and where. This tool will become a real part of your workflow from here forward.)

**3. Build and free a heap array, using the matching `new[]`/`delete[]` pair:**

```cpp
#include <iostream>

int main() {
    int* arr = new int[5];
    for (int i = 0; i < 5; i++) {
        arr[i] = i * i;
    }
    for (int i = 0; i < 5; i++) {
        std::cout << arr[i] << " ";
    }
    std::cout << std::endl;
    delete[] arr;
    return 0;
}
```

Notice `arr[i]` looks exactly like indexing a Python list — that's not a coincidence, and it's the entire subject of the next lesson.

## What this cost / bought us

| | Python | C++ (`new`/`delete`) |
|---|---|---|
| Allocating heap memory | Automatic, implicit, whenever you create an object | Explicit — `new`, on purpose, when you need memory that outlives its scope |
| Freeing heap memory | Automatic — garbage collector tracks references and reclaims for you | Manual — `delete`, and you must get it exactly right, exactly once |
| Forgetting to free | Not possible — the GC always eventually reclaims unreachable memory | A real, common, silent bug (memory leak) |
| Freeing twice / using after freeing | Not possible — Python won't let a reference "expire" out from under you like this | A real, common, undefined-behavior bug (dangling pointer / double-free) |
| What you gain | Total safety, zero effort | Precise control over exactly when memory is allocated and released — critical for performance-sensitive and long-running programs |

You are now, for the first time in this curriculum, doing a job the Python interpreter has been silently doing for you your entire programming life. The next three lessons build directly on this: arrays on the heap (1.5, 1.6) will need exactly this `new[]`/`delete[]` discipline, and smart pointers (1.7) will show you how modern C++ automates this same responsibility back away from you — safely, deliberately, and in a way that will make much more sense now that you've felt what it's automating.

---

**Next up: Lesson 1.5 — Arrays: fixed-size, contiguous, no bounds checking.** You just used one in the exercise above — now we look at exactly what `arr[i]` is really doing, and why C++ won't stop you from writing `arr[100]` on a 5-element array.
