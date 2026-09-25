# Lesson 2.1: `struct` — Bundling Data With No Code

*Phase 2 — What an "Object" Actually Is*
*Python anchor: a record, like a `dataclass`*

---

## The problem you already lived through

Look back at the Phase 1 checkpoint's confidence-check question 3. Every dynamic array you built needed three separate variables tracked together, always in sync, always passed together: `data`, `size`, `capacity`. You had to remember, every single call site, to pass all three, in the right order, matching the right array. Nothing in the language enforced that `numbers`'s three variables never got accidentally mixed up with `codes`'s three variables — it was pure discipline on your part.

This lesson gives you the first, simplest tool for fixing that: a way to say "these pieces of data belong together" and have the compiler treat them as one thing.

## The Python anchor

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

p = Point(3, 4)
print(p.x, p.y)   # 3 4
```

A Python `dataclass` bundles fields together with essentially no behavior of its own — just a labeled container for related data. C++'s `struct` is the direct equivalent of exactly this idea, and predates Python's `dataclass` by decades — this is C++ actually having had this concept first.

## Declaring and using a `struct`

```cpp
struct Point {
    int x;
    int y;
};   // <- don't forget this semicolon; forgetting it is a classic, confusing compile error

int main() {
    Point p;
    p.x = 3;
    p.y = 4;
    std::cout << p.x << ", " << p.y << std::endl;
    return 0;
}
```

`p.x` — the dot operator — accesses a **member** of the struct, exactly the way Python's `p.x` accesses an attribute. You can also initialize all the fields at once, in order, using brace initialization:

```cpp
Point p = {3, 4};   // p.x = 3, p.y = 4
```

## This is Lesson 0.3's "boxes" idea, one level up

Recall Lesson 0.3: a C++ variable is a fixed-size box, and assigning one variable to another copies the contents, byte for byte, into a brand new box. A `struct` doesn't change this rule at all — it just makes the box bigger, holding several fields glued together as one unit:

```cpp
#include <iostream>

struct Point {
    int x;
    int y;
};

int main() {
    Point p1 = {1, 2};
    Point p2 = p1;      // copies BOTH fields, independently — same rule as Lesson 0.3

    p2.x = 100;

    std::cout << "p1.x = " << p1.x << std::endl;   // 1
    std::cout << "p2.x = " << p2.x << std::endl;   // 100

    return 0;
}
```

If this example looks familiar, it's because you already saw it — Lesson 0.3 used exactly this struct to *prove* the boxes model before you'd even learned what a `struct` was called. Nothing new is happening here mechanically; you're just now seeing the full picture of what was being copied.

## Fixing the actual Phase 1 problem

Here's the payoff. Go back to the array you built by hand across Lesson 1.6 and the checkpoint — three loose variables (`data`, `size`, `capacity`), passed everywhere together, with nothing stopping you from mixing them up. A `struct` fixes exactly this:

```cpp
struct IntArray {
    int* data;
    int size;
    int capacity;
};
```

Now, instead of three separate variables floating around your `main()`, you have **one** thing:

```cpp
#include <iostream>

struct IntArray {
    int* data;
    int size;
    int capacity;
};

void pushBack(IntArray& arr, int value) {
    if (arr.size == arr.capacity) {
        int newCapacity = (arr.capacity == 0) ? 1 : arr.capacity * 2;
        int* newData = new int[newCapacity];
        for (int i = 0; i < arr.size; i++) {
            newData[i] = arr.data[i];
        }
        delete[] arr.data;
        arr.data = newData;
        arr.capacity = newCapacity;
    }
    arr.data[arr.size] = value;
    arr.size++;
}

int main() {
    IntArray numbers = {nullptr, 0, 0};

    for (int i = 1; i <= 5; i++) {
        pushBack(numbers, i * 10);
    }

    for (int i = 0; i < numbers.size; i++) {
        std::cout << numbers.data[i] << " ";
    }
    std::cout << std::endl;

    delete[] numbers.data;
    return 0;
}
```

Compare this `pushBack` signature — `void pushBack(IntArray& arr, int value)` — against Lesson 1.6's `void pushBack(int*& data, int& size, int& capacity, int value)`. One reference parameter instead of three. And notice `IntArray& arr` uses a plain reference (`&`), not the `int*&` trick from Lesson 1.6 — because now, updating `arr.data` (reassigning which block of memory the struct's pointer field refers to) happens *through* a reference to the whole struct, not by needing a reference to a bare pointer variable directly. The double-indirection headache from Lesson 1.6 is gone, absorbed into this cleaner structure.

## What's genuinely still missing

A `struct` is real progress, but notice what it does *not* do: nothing stops you from writing `IntArray arr;` and then immediately calling `pushBack(arr, 5)` before ever setting `arr.data = nullptr`. `data` would hold garbage — an uninitialized pointer — and your first `pushBack` call would try to `delete[]` garbage memory, undefined behavior straight out of Lesson 1.4. A `struct`, as defined so far, bundles data — but it doesn't *guarantee* that data starts in a valid state, and it doesn't bundle the *behavior* (`pushBack`, cleanup) together with the data at all; `pushBack` is still a free-floating function you have to remember to call correctly.

That gap — data with no guarantees and no attached behavior — is exactly what the next lesson closes.

## Try it yourself

**1. Run the `Point` copy example above and confirm it behaves exactly like Lesson 0.3's version.** You already did this once without a name for it — do it again now that you know it's called a `struct`.

**2. Build the full `IntArray`-based `pushBack` program above, run it, and confirm it produces the same output as Lesson 1.6's three-variable version.** Count how many parameters each `pushBack` signature needs. This is the structural improvement this lesson is entirely about.

**3. Deliberately forget to initialize `data` and see what happens:**

```cpp
int main() {
    IntArray arr;   // NOT initialized — data, size, capacity are all garbage
    pushBack(arr, 5);   // likely crashes, or worse, appears to "work"
    return 0;
}
```

Try it. This is the exact gap named above, made concrete — and it's your first hands-on motivation for Lesson 2.2's `class` and, immediately after, Lesson 2.3's constructors, which exist specifically to make "an object starts in an invalid state" structurally impossible instead of just a thing you have to remember.

## What this cost / bought us

| | Loose variables (Lesson 1.6) | `struct` (this lesson) |
|---|---|---|
| Related data | Scattered — `data`, `size`, `capacity` tracked separately | Bundled into one named type |
| Passing to a function | One parameter per piece of data | One reference parameter for the whole thing |
| Risk of mixing up two arrays' fields | Real — nothing stops `numbers`'s `size` reaching `codes`'s `pushBack` call | Eliminated — each `IntArray` variable is self-contained |
| Guaranteed valid starting state | No | Still no — this gap is next lesson's subject |
| Behavior bundled with data | No — `pushBack` is still a separate free function | Still no — coming in Lesson 2.2 |

A `struct` is deliberately the smallest possible step: pure data, bundled, with zero code attached. That's not a limitation to apologize for — it's the correct first rung on the ladder. The next lesson adds exactly one new capability — functions that live *inside* the bundle, operating on it directly — and that one addition is the actual moment this curriculum starts being about OOP rather than just "a slightly nicer way to organize related variables."

---

**Next up: Lesson 2.2 — `class`: bundling data with the functions that operate on it.** You're about to move `pushBack` itself inside `IntArray` — the first real step of turning it into `MyVector`.
