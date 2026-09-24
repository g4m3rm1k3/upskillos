# Lesson 0.4: Functions, Parameters, Return Types

*Phase 0 — Bridging Python → C++*
*Python anchor: you already know this shape*

---

## The Python anchor

You've written thousands of these:

```python
def add(a, b):
    return a + b

result = add(3, 4)
```

A name, some parameters, a body, a `return`. The C++ version looks almost identical on the surface:

```cpp
int add(int a, int b) {
    return a + b;
}

int result = add(3, 4);
```

Same shape, same idea — but three new things appeared that weren't there in Python: a type in front of the function name (`int`), and a type in front of every parameter (`int a`, `int b`). This lesson is short precisely because the *concept* isn't new to you — it's the same "package up some code, give it a name, call it later" idea. What's new is that C++ makes you declare, up front, exactly what types flow in and out. After Lessons 0.2 and 0.3, you already know why: the compiler has to know the size and type of every box before it can generate the machine code to build and tear down that function's stack frame (more on that phrase in Phase 1).

## Return types

Every C++ function declares what type it hands back, right before its name:

```cpp
int square(int x) {
    return x * x;
}

double average(int a, int b) {
    return (a + b) / 2.0;
}

std::string greet(std::string name) {
    return "Hello, " + name;
}
```

If a function returns nothing — the equivalent of a Python function with no `return` statement, which implicitly returns `None` — C++ uses `void`:

```cpp
void printGreeting(std::string name) {
    std::cout << "Hello, " << name << std::endl;
    // no return statement needed
}
```

There is no C++ equivalent of `None` for a `void` function — you simply cannot use its result at all. `int x = printGreeting("A");` is a compile error, not a runtime surprise the way calling a `None`-returning Python function's result unexpectedly might be.

One consequence worth flagging now: **a C++ function can only return one type, period.** Python lets you write a function that sometimes returns an `int` and sometimes returns a `str` — the interpreter doesn't care. C++'s compiler needs to know, at compile time, exactly what type is coming back, every single time that function is called, so it can generate the right instructions at every call site. (Phase 11 will show you `std::variant`, which is C++'s controlled, explicit way of saying "this could be one of several types" — very different from Python quietly allowing it by default.)

## Parameters: the question Python never made you ask

Here's where Lesson 0.3 comes back. In Python:

```python
def modify(lst):
    lst.append(4)

my_list = [1, 2, 3]
modify(my_list)
print(my_list)   # [1, 2, 3, 4] — the original changed!
```

```python
def modify(n):
    n = n + 1

x = 5
modify(x)
print(x)   # 5 — unchanged!
```

Same function shape, wildly different outcome — and if you've never stopped to ask why, that's fine, most people haven't, because in Python it doesn't matter which mental model you use day to day. The real answer is that Python always passes the *label*, never a fresh copy of the object. `lst.append(4)` mutates the one shared list object through that shared label — visible outside. `n = n + 1` doesn't mutate anything; it just points the *local* label `n` at a brand new integer object, leaving the caller's `x` label untouched. The difference you're seeing isn't really about parameter-passing — it's about whether the operation inside the function mutates the object or just reassigns the label.

C++ makes you choose this behavior *explicitly*, every time, for every parameter:

```cpp
// Pass by value: the function gets its own COPY (its own box)
void incrementByValue(int n) {
    n = n + 1;   // only changes the local copy
}

// Pass by reference: the function gets ACCESS to the original box
void incrementByReference(int& n) {
    n = n + 1;   // changes the caller's actual variable
}

int main() {
    int x = 5;
    incrementByValue(x);
    std::cout << x << std::endl;   // 5 — unchanged

    incrementByReference(x);
    std::cout << x << std::endl;   // 6 — changed!

    return 0;
}
```

That `&` after the type (`int& n`) is a **reference** — a formal preview of Lesson 1.3, where you'll learn exactly how it works under the hood. For now, the concept is what matters: in C++, *you* decide at the function signature whether a parameter is a private copy (default — matches Lesson 0.3's "box" behavior) or shared access to the caller's original (opt-in, using `&`). Nothing is implicit. Nothing depends on whether the type happens to be mutable, the way it accidentally does in Python.

## Try it yourself

**1. Confirm pass-by-value really does copy, using addresses (same trick as Lesson 0.3):**

```cpp
#include <iostream>

void showAddress(int n) {
    std::cout << "inside function, n is at " << &n << std::endl;
}

int main() {
    int x = 5;
    std::cout << "in main, x is at " << &x << std::endl;
    showAddress(x);
    return 0;
}
```

Two different addresses print. The function received a genuinely separate box, not access to `x`'s box.

**2. Now do the same with a reference parameter:**

```cpp
#include <iostream>

void showAddress(int& n) {
    std::cout << "inside function, n is at " << &n << std::endl;
}

int main() {
    int x = 5;
    std::cout << "in main, x is at " << &x << std::endl;
    showAddress(x);
    return 0;
}
```

This time the two addresses are **identical**. `n` isn't a copy at all — it's another name for `x`'s exact box. This is the literal, provable difference between the two `increment` functions above.

**3. Rewrite one of your Phase-0 mini-project functions (the temperature converter or word counter) with an explicit, deliberate choice: should its parameter be pass-by-value or pass-by-reference? Write down *why* before you write the code** — that habit of asking the question is the actual point of this lesson, more than the syntax is.

## What this cost / bought us

| | Python | C++ |
|---|---|---|
| What a parameter receives | Always the same label-sharing behavior | Your explicit choice: copy (default) or reference (`&`) |
| Whether a function can mutate the caller's variable | Depends on the object's mutability and what the function does to it — often surprising | Depends only on whether you wrote `&` — visible right in the signature |
| Return type | Can vary per call, unenforced | Fixed, one type, checked at compile time |
| Reading a function signature | Doesn't tell you what will or won't be shared | Tells you *exactly* what will and won't be shared, before you read a single line of the body |

The theme continues: Python decides this stuff implicitly and uniformly; C++ makes you decide it explicitly, per parameter, every time — in exchange for a function signature that tells you, honestly and completely, what it's capable of doing to your data before you've read a single line of its body.

---

**Next up: Lesson 0.5 — Control flow (`if`, `for`, `while`).** A fast one — the *concepts* are identical to Python, this is really just learning the punctuation.
