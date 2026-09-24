# Lesson 1.2: Pointers — An Address Is Just a Number

*Phase 1 — Memory: The Thing Python Hides From You*

---

## Where you already are

Lesson 1.1 had you printing `&x` over and over without naming what it actually is. Time to fix that: `&x` is a **memory address** — a number. Not a metaphor, not a special language construct with hidden magic — an actual integer, usually printed in hexadecimal, that identifies one specific location in your computer's RAM. A **pointer** is simply a variable whose job is to *store* one of these numbers.

That's the whole concept. Everything else in this lesson is syntax and consequences.

## Declaring and using a pointer

```cpp
int x = 42;
int* p = &x;   // p stores the ADDRESS of x, not the value 42
```

Read `int* p` as "`p` is a pointer to an `int`" — a variable that holds an address, specifically the address of somewhere an `int` lives. `&x` means "give me the address of `x`" (you've already used this). The reverse operation — "go to the address stored in `p` and give me the value sitting there" — is **dereferencing**, using `*`:

```cpp
#include <iostream>

int main() {
    int x = 42;
    int* p = &x;

    std::cout << "x        = " << x  << std::endl;   // 42
    std::cout << "&x       = " << &x << std::endl;   // some address, e.g. 0x7ffee3a1c4ac
    std::cout << "p        = " << p  << std::endl;   // the SAME address — p stores it
    std::cout << "*p       = " << *p << std::endl;   // 42 — follow the address, read the value

    *p = 100;   // follow the address stored in p, and write 100 THERE
    std::cout << "x is now = " << x << std::endl;   // 100 — x changed!

    return 0;
}
```

That last part is the payoff: `*p = 100;` didn't change `p` at all — `p` still holds the exact same address it always did. It changed *whatever is at that address*, which happens to be `x`. This is the real mechanism underneath references (Lesson 1.3) and pass-by-reference (Lesson 0.4) — you were using this idea already, without the vocabulary or the explicit `*`/`&` syntax to see it directly.

## `*` means two different things — don't let this trip you up

This confuses everyone briefly. `*` is overloaded in C++ to mean two unrelated things depending on where it appears:

```cpp
int* p = &x;   // HERE, * is part of the TYPE — "p is a pointer to int"
std::cout << *p;   // HERE, * is the DEREFERENCE OPERATOR — "the value at p"
```

One is a declaration-time marker ("this variable's type is *pointer-to-int*"), the other is an operation you perform on an existing pointer ("go fetch what's at this address"). Same symbol, genuinely different jobs, disambiguated purely by context. There's no way around just getting used to this.

## Pointers and the heap, finally connected

Lesson 1.1 ended with a function that couldn't safely return a stack variable — the memory was gone the instant the function returned. Now you have the tool that solves this. `new` (fully covered next lesson) requests memory *on the heap* and hands you back a pointer to it:

```cpp
int* p = new int(42);   // allocate ONE int on the heap, holding 42, get its address
std::cout << *p << std::endl;   // 42
delete p;   // free it — Lesson 1.4's whole subject
```

Unlike a stack variable, this memory does **not** disappear when the current function returns — it exists until you explicitly `delete` it (or, if you forget, it leaks — the exact bug class Lesson 1.1 named). A pointer is nothing more than the *address* of that memory — which means you can hand that address to another function, store it in a struct, return it from the function that created it, all without copying the actual data it points to. That's the second half of why pointers matter: not just "access to a heap allocation," but "a small, cheap, copyable handle to *anywhere* — heap or stack — that multiple parts of your program can share."

## `nullptr` — a pointer that points nowhere

A pointer variable can exist without pointing at anything valid yet. C++ gives you an explicit way to represent that:

```cpp
int* p = nullptr;   // p deliberately points nowhere
if (p == nullptr) {
    std::cout << "p isn't pointing at anything yet" << std::endl;
}
```

**Dereferencing a `nullptr` (`*p` when `p == nullptr`) is one of the single most common C++ bugs that exists**, and it crashes your program immediately and unceremoniously (a segmentation fault, same failure you saw from the stack overflow in Lesson 1.1). Python's closest relative to this is calling a method on `None` and getting an `AttributeError` — the difference is Python's version is a catchable exception with a message; C++'s is an instant, uncatchable-by-default hard crash. Get in the habit, right now, of checking a pointer against `nullptr` before dereferencing it if there's any chance it might not point anywhere valid.

## Try it yourself

**1. Run the dereference example above.** Actually watch `x` change after you write through `*p`. Predict the output before running it.

**2. Trigger a null pointer dereference on purpose, to see what it actually looks like:**

```cpp
#include <iostream>

int main() {
    int* p = nullptr;
    std::cout << *p << std::endl;   // crash
    return 0;
}
```

Compile and run it. Note the crash — no exception, no traceback like Python gives you, just an abrupt stop (likely "Segmentation fault"). This is the cost of C++ giving you direct memory access: enormous power, but the language will not catch this mistake for you at runtime the way Python catches `None` attribute access.

**3. Swap two variables using pointers**, a classic exercise for making the mechanism click:

```cpp
#include <iostream>

void swap(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 1, y = 2;
    std::cout << "before: x=" << x << " y=" << y << std::endl;
    swap(&x, &y);
    std::cout << "after:  x=" << x << " y=" << y << std::endl;
    return 0;
}
```

Trace through this by hand before running it: `swap` receives *addresses*, not copies of `x` and `y`, so `*a = *b` reaches all the way back into `main`'s actual variables. This is functionally identical to what `int& n` (Lesson 0.4's reference parameters) does — you're seeing the raw mechanism now, one layer below the friendlier reference syntax.

## What this cost / bought us

| | No pointers (Python's world) | Pointers (C++) |
|---|---|---|
| What a variable can "point at" | Whatever object it's currently labeled to — implicit, automatic | Any address you explicitly choose to store — you control it directly |
| Returning data that outlives a function | Handled automatically — objects just live as long as something references them | You choose: return a pointer to heap memory you allocated (and now must manage) |
| Risk of a "points at nothing" bug | `None`, checked, raises a catchable `AttributeError` | `nullptr`, often unchecked, crashes immediately and uncatchably by default |
| What you gain | Simplicity | Direct, explicit control over memory — the foundation everything from here (references, smart pointers, your own `MyVector`) is built on |

Pointers are the raw, low-level tool underneath nearly everything else in this curriculum — references (next lesson) are a safer, restricted version of exactly this idea; smart pointers (Lesson 1.7) automate the cleanup you're currently responsible for by hand; and your `MyVector` in Phase 2 will, under the hood, just be a pointer to a heap-allocated block plus some bookkeeping. Understanding *this* lesson, precisely, is what makes all of those make sense later instead of feeling like separate arbitrary features.

---

**Next up: Lesson 1.3 — References (`&`) — a safer alias for a pointer.** You've technically already used references (Lesson 0.4's `int& n`) without seeing how they relate to what you just learned — time to connect the two.
