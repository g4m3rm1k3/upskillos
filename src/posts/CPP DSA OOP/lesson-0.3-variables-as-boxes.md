# Lesson 0.3: Variables Are Boxes With Fixed Size, Not Labels on Any Object

*Phase 0 — Bridging Python → C++*
*This is the single biggest mental shift coming from Python.*

---

## The Python anchor

Picture this in Python:

```python
a = [1, 2, 3]
b = a
b.append(4)
print(a)   # [1, 2, 3, 4]
```

You changed `b`, and `a` changed too. This isn't a bug and it isn't magic — it's because `a` and `b` were never two separate lists. They were two **labels pointing at the same object**. `a = [1, 2, 3]` creates a list object somewhere in memory and sticks a label called `a` on it. `b = a` doesn't copy anything — it just sticks a *second* label, `b`, on that exact same object. There's one list, two names for it.

Every Python variable works this way, all the time, for everything — a Python variable is a label, and labels are free to point anywhere.

C++ does not work like this by default, and this is the shift the whole curriculum has been building toward since Lesson 0.1.

## What a C++ variable actually is

```cpp
int a = 5;
```

This line does not create a value somewhere and attach a label `a` to it. It carves out **4 bytes of actual memory**, at a specific address, reserved exclusively for `a`, and puts the value `5` directly inside those bytes. `a` *is* that box. Not a label pointing at a box somewhere — the box itself, sitting at a fixed address, for as long as `a` exists.

So what happens with:

```cpp
int a = 5;
int b = a;
b = 10;
std::cout << a << std::endl;   // 5, not 10
```

`int b = a;` doesn't make `b` a second label for the same thing `a` refers to — there is no "thing `a` refers to" separate from `a`. It **copies the value** out of `a`'s box into `b`'s own, separate, freshly-allocated box. Two boxes, two addresses, two independent 4-byte chunks of memory, that happen to start out holding the same value. Changing one has zero effect on the other, because they were never the same box.

## Proving it with addresses

This isn't a philosophical distinction — you can literally print the memory address of a variable and watch this happen:

```cpp
#include <iostream>

int main() {
    int a = 5;
    int b = a;

    std::cout << "a is at address " << &a << ", value " << a << std::endl;
    std::cout << "b is at address " << &b << ", value " << b << std::endl;

    b = 10;
    std::cout << "after changing b:" << std::endl;
    std::cout << "a = " << a << std::endl;
    std::cout << "b = " << b << std::endl;

    return 0;
}
```

The `&` here means "give me the address of," not the reference operator we'll meet properly in Lesson 1.3 — for now just read it as "where does this box live." Compile and run it: `a` and `b` will have **different addresses**, printed right there as evidence. They are not the same box wearing two labels. They never were.

Compare that to what the equivalent Python code would show you (using `id()`, Python's version of "address"):

```python
a = 5
b = a
print(id(a), id(b))   # SAME number — same object, two labels
```

For small integers Python even reuses the exact same cached object — `a` and `b` are, provably, pointing at one identical thing.

## Why this matters immediately for structs, arrays, and objects

This "copy the box's contents" behavior applies to *everything* by default in C++ — not just `int`. Assign one array to another, one struct to another, one (non-pointer) object to another, and C++ copies every byte, box to box, independently. This is going to directly explain:

- Why `MyVector b = a;` in Phase 2 needs a carefully-written **copy constructor** — C++ will copy your object byte-for-byte by default, which is *catastrophic* if that object secretly holds a pointer to heap memory (Phase 1.6 onward). Two boxes both thinking they own the same heap allocation is exactly the kind of bug this curriculum keeps circling back to.
- Why Python never needed a "copy constructor" concept at all — there was never a second box to worry about copying into.
- Why C++ *also* has pointers and references (Lessons 1.2 and 1.3) — they exist precisely to give you an escape hatch, a deliberate way to say "no, actually, I want to point at the *same* box," when that's what you need. Python gives you that behavior for free, all the time, whether you want it or not; C++ makes you ask for it explicitly.

## Try it yourself

**1. Run the address-printing example above.** Actually look at the two addresses. Confirm for yourself they differ.

**2. Extend it to a `struct` (a preview of Lesson 2.1) to see the same rule apply to something bigger than one `int`:**

```cpp
#include <iostream>

struct Point {
    int x;
    int y;
};

int main() {
    Point p1 = {1, 2};
    Point p2 = p1;       // copies BOTH fields, independently

    p2.x = 100;

    std::cout << "p1.x = " << p1.x << std::endl;   // 1
    std::cout << "p2.x = " << p2.x << std::endl;   // 100

    return 0;
}
```

Predict the output before running it, then check yourself.

**3. Now do the Python side-by-side** to feel the contrast directly:

```python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

p1 = Point(1, 2)
p2 = p1          # NOT a copy — same object, two labels
p2.x = 100

print(p1.x)      # 100 !! — changing p2 changed p1
print(p2.x)      # 100
```

Same-looking code, opposite result, because Python's `p2 = p1` sticks a second label on one object, while C++'s `p2 = p1` clones every field into a brand new, independent box.

## What this cost / bought us

| | Python (labels on objects) | C++ (fixed-size boxes) |
|---|---|---|
| `b = a` | Two names, one shared object | One value copied into a new, separate box |
| Changing `b` after | Can affect `a` (if mutable) | Never affects `a` |
| Memory model | Objects live wherever the interpreter puts them; variables just point | Each variable *is* a specific, sized chunk of memory at a specific address |
| Predictability | You must reason about aliasing — "do these two names refer to the same object?" | Copies are independent by default — no aliasing unless you explicitly ask for it (pointers/references) |
| Cost | Implicit sharing can cause subtle bugs (mutate one, break another) | Copying can be wasteful for big objects — you'll need to *choose* when to share (Lesson 1.3, Lesson 2.7) |

This is the mental model that everything from here forward assumes you have internalized: **a C++ variable is memory, not a name.** Pointers and references, coming up next in Phase 1, are the two tools C++ gives you when a fixed, private, copied box isn't what you actually want.

---

**Next up: Lesson 0.4 — Functions, parameters, return types.** You already know this shape from Python — but now that you know variables are boxes, we need to ask a question Python never made you ask: when you pass a variable into a function, do you hand the function a copy of your box, or access to the original?
