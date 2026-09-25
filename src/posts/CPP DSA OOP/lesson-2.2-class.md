# Lesson 2.2: `class` — Bundling Data With the Functions That Operate On It

*Phase 2 — What an "Object" Actually Is*

---

## Where Lesson 2.1 left off

`IntArray` bundled `data`, `size`, and `capacity` into one thing — real progress. But `pushBack` was still a separate, free-floating function, living outside the struct entirely, that you had to remember to call correctly, passing the struct in by reference every time. Nothing tied `pushBack` *to* `IntArray` — you could just as easily call it on the wrong struct, or forget it exists, or write a competing `pushBack` for some other type with a name collision. This lesson closes that gap: functions can live *inside* the bundle too.

## The `class` keyword

```cpp
class IntArray {
public:
    int* data;
    int size;
    int capacity;

    void pushBack(int value) {
        if (size == capacity) {
            int newCapacity = (capacity == 0) ? 1 : capacity * 2;
            int* newData = new int[newCapacity];
            for (int i = 0; i < size; i++) {
                newData[i] = data[i];
            }
            delete[] data;
            data = newData;
            capacity = newCapacity;
        }
        data[size] = value;
        size++;
    }

    int get(int index) {
        if (index < 0 || index >= size) {
            std::cerr << "Index out of bounds!" << std::endl;
            return -1;
        }
        return data[index];
    }
};
```

Look closely at `pushBack`'s body compared to every earlier version. There's no `arr.` anywhere, and no `IntArray& arr` parameter at all. `size`, `capacity`, and `data` are referred to directly, as if they were plain local variables — because from inside the class, they effectively are. This is the entire idea of a **member function**: code that lives inside the class and automatically has direct access to that specific object's own fields, with no need to pass the object in as a parameter at all.

## Using it

```cpp
int main() {
    IntArray numbers;
    numbers.data = nullptr;
    numbers.size = 0;
    numbers.capacity = 0;

    numbers.pushBack(10);
    numbers.pushBack(20);
    numbers.pushBack(30);

    for (int i = 0; i < numbers.size; i++) {
        std::cout << numbers.get(i) << " ";
    }
    std::cout << std::endl;

    delete[] numbers.data;
    return 0;
}
```

`numbers.pushBack(10)` — read this as "tell `numbers` to push back 10." The dot operator (Lesson 2.1) now invokes behavior, not just field access. This is the actual shift the whole curriculum has been building toward since the phase intro's "OOP shows up the moment you need a way to bundle data with the code that manages it" — you're looking at that moment, right now, directly.

## `struct` vs. `class`: the one real difference

You'll notice `class IntArray` above has a `public:` label that `struct Point` back in Lesson 2.1 never needed. Here's the entire, complete difference between `struct` and `class` in C++ — genuinely just this one thing:

```cpp
struct Foo { int x; };   // members are PUBLIC by default
class Bar  { int x; };   // members are PRIVATE by default
```

That's it. `struct` and `class` are otherwise **completely interchangeable** — both can have member functions, both can have constructors (next lesson), both work identically in every other respect. The convention this curriculum follows (and the one most real C++ code follows): use `struct` for simple, passive data bundles with no invariants to protect (like `Point`), and use `class` for anything with real behavior and rules about how it should be used correctly (like `IntArray`). The `public:` label you're seeing above exists because, without it, `data`, `size`, and `capacity` would default to private — inaccessible from `main()` entirely, which would actually break the code above. Access control is the very next lesson's subject, and this is exactly the seam where it becomes relevant.

## Member functions can call other member functions

Once code lives inside the class, it can freely call the class's *other* member functions too, without qualification:

```cpp
class IntArray {
public:
    int* data;
    int size;
    int capacity;

    void pushBack(int value) { /* ...as above... */ }

    void pushBackTwice(int value) {
        pushBack(value);   // calling another member function — no object needed, it's implicit
        pushBack(value);
    }
};
```

This composability — building bigger behaviors out of smaller member functions, all with automatic, implicit access to the same shared data — is a large part of why bundling data and behavior together is worth the ceremony. You'll lean on this constantly starting in Phase 4, when class hierarchies get deeper.

## Try it yourself

**1. Build the full `IntArray` class above and confirm it behaves identically to Lesson 2.1's struct-plus-free-function version.** Count the parameters `pushBack` needs to be called with now — compare it against every earlier version across this curriculum: three loose variables (Lesson 1.6), one struct reference (Lesson 2.1), zero extra arguments at all (this lesson, since the object itself supplies them implicitly).

**2. Add a `printAll()` member function** that loops over `data` and prints every element, using no parameters at all — proving to yourself that member functions really do have automatic, implicit access to the object's own fields:

```cpp
void printAll() {
    for (int i = 0; i < size; i++) {
        std::cout << data[i] << " ";
    }
    std::cout << std::endl;
}
```

Call it as `numbers.printAll();` and confirm it works with zero arguments.

**3. Notice, and don't fix yet, the exact same gap Lesson 2.1 ended on:**

```cpp
int main() {
    IntArray numbers;
    numbers.pushBack(5);   // data was never set to nullptr! Undefined behavior, again.
    return 0;
}
```

Run this (or reason through it if you'd rather not crash your terminal) and confirm the problem is identical to Lesson 2.1's — a `class`, exactly like a `struct`, still doesn't guarantee an object starts in a valid state. You've now hit this same wall twice, on purpose. The next lesson is the one that finally closes it for good.

## What this cost / bought us

| | Struct + free function (Lesson 2.1) | Class with member functions (this lesson) |
|---|---|---|
| Calling `pushBack` | `pushBack(numbers, value)` — object passed explicitly | `numbers.pushBack(value)` — object implicit, via the dot |
| Access to fields inside the function | Through `arr.field`, every time | Direct — `field`, as if local |
| Coupling between data and behavior | Loose — `pushBack` could accidentally be called on the wrong type of struct if one existed with matching field names | Tight — `pushBack` only exists as something `IntArray` objects can do |
| Guaranteed valid starting state | Still no | Still no — genuinely unsolved until next lesson |

This is the real, precise moment "OOP" starts in this curriculum — not as a new syntax to memorize, but as the direct answer to a problem you built by hand and felt personally: code that operates on specific data belongs *with* that data, not scattered nearby hoping to be called correctly. Everything from Phase 4's inheritance onward is built on this one foundational move.

---

**Next up: Lesson 2.3 — Constructors / destructors.** The gap you've now hit twice — an object that can exist in an invalid, uninitialized state — gets closed here, permanently, with a mechanism Python's `__init__` only partially has an equivalent for.
