# Lesson 0.6: `const` — Why "Can This Change?" Matters More in C++

*Phase 0 — Bridging Python → C++*
*Python has no real equivalent to this one.*

---

## The Python anchor

Python has a *convention*: `SCREAMING_SNAKE_CASE = 5` signals "please don't change this." That's it. That's the whole enforcement mechanism — a naming convention, backed by nothing:

```python
MAX_SIZE = 100
MAX_SIZE = 200   # totally legal, no warning, no error, nothing stops you
```

Python simply does not have a built-in way to say "this variable may never be reassigned" and have the interpreter actually check it. C++ does, and it's used *constantly* — far more than most beginners expect, because it turns out to be useful for more than just "protect my constants."

## The keyword

```cpp
const int MAX_SIZE = 100;
MAX_SIZE = 200;   // COMPILE ERROR — cannot assign to a const variable
```

This is enforced by the compiler, at compile time, the same way type mismatches are (Lesson 0.2). It's not a lint warning you can ignore — your program will not build.

Once you know Lesson 0.3's "variables are boxes" model, `const` has a very literal meaning: it's a box whose contents are set once, at creation, and then permanently sealed. The compiler will refuse to generate any machine code that tries to write into it again.

## Why this matters *more* in C++ than it would in Python

Here's the part that's easy to underestimate: in Python, this wouldn't buy you much even if it existed, because Python doesn't have Lesson 0.4's pass-by-reference problem. In C++, once you can pass a *reference* into a function (`int& n`, from Lesson 0.4), you've created a genuine risk that didn't exist before: the function now has the power to silently modify the caller's original variable. `const` is how you take that power back, function by function:

```cpp
// This function CAN modify the caller's string — risky, unclear from the name alone
void process(std::string& s) {
    s += " processed";
}

// This function is passed a reference (for efficiency — no copy!)
// but the compiler GUARANTEES it cannot modify the original
void printLength(const std::string& s) {
    std::cout << s.length() << std::endl;
    // s += "x";   // COMPILE ERROR — caught immediately if you try
}
```

Read `const std::string& s` as: "give this function direct access to the caller's string (no copy, so it's fast, per Lesson 0.4) — but the compiler will not let this function's body write to it." This is an enormously common pattern in real C++ code, and it solves a genuine problem: passing by reference is often necessary for performance (avoiding a copy of a large object), but you don't always want the function to be *able* to mutate what you handed it. `const` gets you both at once — speed *and* safety — a combination Python's model can't even express, because Python never gave you the copy-vs-reference choice to begin with.

## `const` on parameters vs. `const` on variables

You'll see it in three common shapes:

```cpp
const int x = 5;                    // a variable that can never be reassigned

void f(const int x);                // a parameter passed by value that the
                                     // function promises not to reassign locally
                                     // (rarely useful, since it's already a copy)

void f(const std::string& s);       // a parameter passed by REFERENCE that the
                                     // function promises not to modify —
                                     // this is the genuinely important, common case
```

That last form — `const T&` — is worth committing to memory right now, because you will type it constantly for the rest of this curriculum: it means "let me look at this without copying it, and I promise not to touch it."

## Try it yourself

**1. Confirm the compiler actually enforces it:**

```cpp
#include <iostream>

int main() {
    const int maxAttempts = 3;
    std::cout << maxAttempts << std::endl;
    maxAttempts = 5;   // uncomment and try to compile — read the error
    return 0;
}
```

**2. Feel the "safety without losing speed" benefit directly:**

```cpp
#include <iostream>
#include <string>

// Takes a reference (no copy — cheap even for a huge string)
// but const means it's GUARANTEED not to change your data.
void printInfo(const std::string& name) {
    std::cout << "Name has " << name.length() << " characters: " << name << std::endl;
    // Try uncommenting the next line and recompiling:
    // name += "!!!";
}

int main() {
    std::string myName = "Ada Lovelace";
    printInfo(myName);
    std::cout << "Still intact: " << myName << std::endl;   // unchanged, guaranteed
    return 0;
}
```

Uncomment the `name += "!!!";` line and recompile. Read the compiler's error message. This is the exact mechanism that will save you real debugging time in Phase 2 onward, when functions start taking `const MyVector&` and similar — you'll be able to trust, from the signature alone, that a function isn't quietly mutating something you handed it.

**3. Go back to your Lesson 0.4 exercise** (the function you rewrote with an explicit pass-by-value or pass-by-reference choice) and ask a new question: if you chose pass-by-reference for speed, should that parameter also be `const`? Add it if it should be, and confirm your function still compiles and behaves correctly.

## What this cost / bought us

| | Python | C++ |
|---|---|---|
| "Don't change this" | A naming convention (`ALL_CAPS`) — purely social, unenforced | `const` keyword — enforced by the compiler, program won't build otherwise |
| Passing by reference safely | Not applicable — Python has no equivalent choice to make | `const T&` gives you speed (no copy) *and* a compiler-checked promise not to mutate |
| Where mistakes are caught | Only if you happen to notice a value changed unexpectedly at runtime | Immediately, at compile time, wherever a `const` is violated |

`const` is the first tool in this curriculum that's purely upside — it costs you a little typing and buys you a compiler-enforced guarantee that would otherwise just be a comment or a hope. You'll be reaching for `const T&` on function parameters so often it'll become close to a reflex by the end of Phase 2.

---

**Phase 0 core lessons are done.** Next up: the **mini-project** — rewrite three small Python scripts (a temperature converter, FizzBuzz, and a word counter) fully in C++, applying everything from 0.1–0.6 together: static types, explicit pass-by-value/reference choices, `const` where it belongs, and real `{ }`-delimited control flow. After that, we move into Phase 1 — memory, the thing Python has been hiding from you this entire time.
