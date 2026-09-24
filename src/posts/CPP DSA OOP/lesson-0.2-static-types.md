# Lesson 0.2: Static Types — `int x = 5` vs `x = 5`

*Phase 0 — Bridging Python → C++*
*Python anchor: duck typing vs. fixed types*

---

## The Python anchor

In Python you've never once had to tell the language what *kind* of thing a variable holds:

```python
x = 5
x = "now I'm a string"
x = [1, 2, 3]
```

All perfectly legal, all in the same variable, back to back. Python doesn't ask what `x` is until the moment it needs to use it — and even then, it just checks "does this object support the operation I'm trying to do?" (this is "duck typing": if it quacks like a duck, treat it like a duck). The *variable* itself has no type. Only the *object* it currently points to has one, and that can change from one line to the next.

C++ makes you say up front, permanently, what a variable is:

```cpp
int x = 5;
```

`x` is now, forever, for the rest of its life, an `int`. Not "currently holding an int." *An int.* You cannot later do `x = "now I'm a string"` — the compiler will refuse to build your program at all. Let's understand why that restriction exists and what it buys you.

## Why the compiler needs this

Go back to Lesson 0.1: the compiler translates your source into machine code *before* anything runs. Consider this line:

```cpp
z = x + y;
```

To turn `x + y` into an actual CPU instruction, the compiler has to pick one specific machine instruction — and integer addition, floating-point addition, and string concatenation are *completely different operations* at the hardware level, using different CPU instructions and different amounts of memory. The compiler cannot generate that instruction unless it already knows, with certainty, what `x` and `y` are. There's no interpreter standing by at runtime to figure it out on the fly the way Python's PVM does — by the time this code runs, the decision is baked into the binary already.

This is the real reason for `int x = 5;` instead of `x = 5`. You're not filling out bureaucratic paperwork — you're giving the compiler the one piece of information it structurally cannot proceed without.

## What "static" actually means here

"Static typing" means the type of a variable is fixed **at compile time** and never changes for the life of that variable. Contrast with Python's **dynamic typing**, where the type lives on the object, checked **at runtime**, and can change every time you reassign the variable.

```cpp
int x = 5;        // x is an int, permanently
double y = 3.14;   // y is a double, permanently
std::string s = "hi";  // s is a string, permanently

x = 10;      // fine — still an int
// x = "hi"; // COMPILE ERROR — cannot assign a string to an int
```

Notice `x = 10;` on its own, with no type in front, is completely normal in C++ — that's just *reassignment*, changing the value. What you can never do is change the *type*. That's the actual difference from Python: Python variables are labels you can move to any object; C++ variables are fixed-size boxes that only ever hold one specific kind of thing (a preview of Lesson 0.3, coming right after this).

## The common C++ primitive types

A quick reference you'll use constantly:

| Type | Holds | Typical size | Python rough equivalent |
|---|---|---|---|
| `int` | Whole numbers | 4 bytes | `int` |
| `double` | Decimal numbers | 8 bytes | `float` |
| `float` | Decimal numbers, less precision | 4 bytes | *(no direct equivalent — Python floats are doubles)* |
| `char` | A single character | 1 byte | `str` of length 1 |
| `bool` | `true` / `false` | 1 byte | `bool` |
| `std::string` | Text | variable | `str` |

That "typical size" column isn't trivia — it's the other half of why static typing exists. The compiler needs to know a variable's type not just to pick the right instruction, but to know *how many bytes of memory to set aside for it*. Python never tells you an int "takes 4 bytes" because a Python `int` is secretly a whole object with overhead, wherever it happens to live on the heap. C++'s `int` is exactly 4 bytes, sitting exactly where you declared it. That distinction is Phase 1's whole subject, and it starts right here.

## Try it yourself

**1. Confirm Python really doesn't care:**

```python
x = 5
print(type(x))      # <class 'int'>
x = "surprise"
print(type(x))      # <class 'str'>
```

Runs fine both times — `type(x)` just reports whatever `x` currently points to.

**2. Try the same thing in C++ and read the compiler's complaint:**

```cpp
#include <iostream>

int main() {
    int x = 5;
    std::cout << x << std::endl;
    x = "surprise";   // try it — then comment it back out
    std::cout << x << std::endl;
    return 0;
}
```

```bash
g++ types.cpp -o types
```

Read the actual error message closely — don't just glance at it. It will tell you it cannot convert a string literal to an `int`. That's the compiler doing exactly the job described above: refusing to generate machine code it can't pin down.

**3. Use `sizeof` to see the memory cost directly:**

```cpp
#include <iostream>

int main() {
    std::cout << "int: "    << sizeof(int) << " bytes" << std::endl;
    std::cout << "double: " << sizeof(double) << " bytes" << std::endl;
    std::cout << "char: "   << sizeof(char) << " bytes" << std::endl;
    std::cout << "bool: "   << sizeof(bool) << " bytes" << std::endl;
    return 0;
}
```

Compile and run it. These numbers are not approximations or implementation details you can ignore — they are exact, and they are the reason C++ programs can be so memory-efficient compared to Python.

## What this cost / bought us

| | Python (dynamic typing) | C++ (static typing) |
|---|---|---|
| Flexibility | A variable can hold anything, anytime | A variable holds exactly one type, forever |
| When type errors surface | At runtime, only if that line executes | At compile time, guaranteed, before anything runs |
| Memory per variable | Unpredictable — objects carry overhead | Exact and known (`sizeof`) |
| Speed | Slower — type is checked on every operation, every time | Faster — type is resolved once, at compile time |
| What you must do | Nothing — just use the variable | Declare the type once, up front |

The trade is the same shape as Lesson 0.1's, one level deeper: Python keeps deciding things at the last possible moment, every single time, which buys flexibility at a cost. C++ decides once, permanently, at compile time — costing you some upfront ceremony in exchange for speed, predictability, and errors caught before your program ever runs.

---

**Next up: Lesson 0.3 — Variables are boxes with fixed size, not labels on any object.** This is the lesson the curriculum calls *the single biggest mental shift* coming from Python — and you've actually already seen the seed of it above, in that `sizeof` output. We're about to make it precise.
