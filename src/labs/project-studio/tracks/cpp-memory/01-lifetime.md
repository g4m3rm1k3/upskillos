---
title: 1 — Object Lifetime: the Stack, the Heap, and Who Cleans Up
track: Memory, Lifetime and Ownership
trackOrder: 6
runtime: cpp
reference: optional
console: true
---

This track is where C++ differs most from Python, Java or JavaScript. In those languages the runtime decides when objects disappear: Java and JavaScript use a **garbage collector**, and CPython frees most objects as soon as nothing refers to them, with a collector for the leftover reference cycles (other Python implementations differ). Either way the language doesn't promise you when. In C++ the rules are precise and predictable, and you are in charge:

```text
STACK (automatic)                      HEAP (dynamic)
┌──────────────────────────┐           ┌──────────────────────────┐
│ main:  a, c              │           │ Tracer "heap"            │
│ f:     f-local           │  ───────► │ (lives until deleted)    │
└──────────────────────────┘  pointer  └──────────────────────────┘
objects die at the end of              objects die when someone
their scope, automatically             destroys them, or never
```

Predictable lifetimes are what let C++ manage *any* resource (memory, files, locks, GPU buffers) with one mechanism, and with no pauses for garbage collection. They're also behind C++'s most notorious bugs: using an object after its life has ended. This track teaches you to see lifetimes, then to design code where those bugs can't happen.

Choose a **new empty folder** for this track.

## Step 1 — Predict the lifetimes

**This step: create the supplied `lifetime/tracer.cpp`. Read it and write down the output you expect before you build it.**

`tracer.cpp` defines a `Tracer`: a struct with two **special member functions**.

- The **constructor**, `Tracer(std::string n)`, runs when a Tracer comes into existence. `: name(std::move(n))` initialises the member before the body runs.
- The **destructor**, `~Tracer()`, runs **automatically** when a Tracer's lifetime ends. You never call it yourself.

Each prints a line, so the program's output is a timeline of object lifetimes.

**Predict, on paper:** in what order do `construct b`, `construct f-local`, `destroy f-local`, `destroy b` and `construct c` appear? When are `a` and `global` destroyed? Then build and run:

```text
g++ -std=c++20 -Wall -Wextra lifetime/tracer.cpp -o lifetime/tracer
./lifetime/tracer
```

```cpp file=lifetime/tracer.cpp provided
#include <iostream>
#include <string>
#include <utility>

// A Tracer announces when it is created and when it is destroyed.
struct Tracer {
    std::string name;

    // Constructor: runs when a Tracer comes into existence.
    explicit Tracer(std::string n) : name(std::move(n)) { std::cout << "construct " << name << '\n'; }

    // Destructor: runs automatically when a Tracer's lifetime ends.
    ~Tracer() { std::cout << "destroy " << name << '\n'; }
};

Tracer global("global");

void f()
{
    Tracer local("f-local");
}

int main()
{
    std::cout << "main starts\n";
    Tracer a("a");
    {
        Tracer b("b");
        f();
    }
    Tracer c("c");
    std::cout << "main ends\n";
    return 0;
}
```

### What happened

A local object is destroyed at the closing `}` of the block it was declared in:

- `f-local` dies when `f` returns, before control even gets back to `b`'s block.
- `b` dies at the end of its inner `{ }` block, before `c` is created.
- `c` and `a` die at the end of `main`, **in reverse order of construction**: last made, first destroyed. Later objects may depend on earlier ones, so they must go first.
- `global` is constructed before `main` starts and destroyed after it returns.

This is called **automatic storage**, usually just "the stack": the compiler inserts the destructor calls for you, on every path out of the block.

```check
run "g++ -std=c++20 -Wall -Wextra -Werror lifetime/tracer.cpp -o lifetime/tracer"
run "./lifetime/tracer" stdout="construct f-local\ndestroy f-local\ndestroy b\nconstruct c" label="locals die at the end of their own block"
run "./lifetime/tracer" stdout="main ends\ndestroy c\ndestroy a\ndestroy global" label="later objects die first"
```

## Step 2 — Objects you destroy yourself

**This step: in `main`, create a Tracer on the heap with `new`, use it, and `delete` it.**

Some objects must outlive the block that creates them: a game object created inside a function but used for the rest of the game. They go on the **heap** (also called the free store):

```cpp
Tracer* h = new Tracer("heap");    // allocate memory, then construct a Tracer in it
std::cout << "using " << h->name << '\n';
delete h;                          // destroy the Tracer, then release the memory
```

- `new` returns a **pointer**: the address of the new object. `Tracer*` means "address of a Tracer".
- `h->name` reaches a member through a pointer. It's short for `(*h).name`.
- The object lives until someone calls `delete` on that address. **Nothing does it automatically.**

Create it after `c`, print `using heap`, and `delete` it just before `main ends` is printed.

**Experiment:** remove the `delete` and run again. `destroy heap` never appears: the destructor never runs. If a Tracer held an open file, the file would stay open forever. That's a **leak**.

```cpp file=lifetime/tracer.cpp
#include <iostream>
#include <string>
#include <utility>

// A Tracer announces when it is created and when it is destroyed.
struct Tracer {
    std::string name;

    // Constructor: runs when a Tracer comes into existence.
    explicit Tracer(std::string n) : name(std::move(n)) { std::cout << "construct " << name << '\n'; }

    // Destructor: runs automatically when a Tracer's lifetime ends.
    ~Tracer() { std::cout << "destroy " << name << '\n'; }
};

Tracer global("global");

void f()
{
    Tracer local("f-local");
}

int main()
{
    std::cout << "main starts\n";
    Tracer a("a");
    {
        Tracer b("b");
        f();
    }
    Tracer c("c");
    Tracer* h = new Tracer("heap");
    std::cout << "using " << h->name << '\n';
    delete h;
    std::cout << "main ends\n";
    return 0;
}
```

```check
matches lifetime/tracer.cpp "new\s+Tracer\s*[({]" label="tracer.cpp creates a Tracer with new"
run "g++ -std=c++20 -Wall -Wextra -Werror lifetime/tracer.cpp -o lifetime/tracer"
run "./lifetime/tracer" stdout="construct heap\nusing heap\ndestroy heap\nmain ends" -- delete the Tracer just before main prints main ends.
```

## Step 3 — Let the type clean up: std::unique_ptr

**This step: replace your `new` and `delete` with `std::make_unique`.**

Your heap Tracer works, but correctness depends on remembering `delete` on **every** path out of the function: every early `return`, every exception. Real code has many paths.

C++'s answer is **RAII**, *Resource Acquisition Is Initialisation*: tie each resource to an object whose destructor releases it. Then the compiler's automatic destructor calls do the cleanup. `std::unique_ptr` is RAII for heap objects:

```cpp
#include <memory>

std::unique_ptr<Tracer> h = std::make_unique<Tracer>("heap");   // owns the heap Tracer
std::cout << "using " << h->name << '\n';                       // use it like a pointer
// no delete: when h is destroyed, its destructor deletes the Tracer
```

- A `unique_ptr` is the **single owner** of its object. It can't be copied (two owners would both delete), only *moved*. Lesson 5 shows how.

**Predict:** where does `destroy heap` appear now? Then run it.

### Where it went

After `main ends`, and before `destroy c`. `h` is now an ordinary local declared after `c`, so it's destroyed first, and its destructor deletes the Tracer.

> Modern C++ guideline: **no naked `new` and `delete`** in application code. Use values, standard containers and `std::make_unique`. Lesson 3 shows why, by having you write a container yourself.

```cpp file=lifetime/tracer.cpp
#include <iostream>
#include <memory>
#include <string>
#include <utility>

// A Tracer announces when it is created and when it is destroyed.
struct Tracer {
    std::string name;

    // Constructor: runs when a Tracer comes into existence.
    explicit Tracer(std::string n) : name(std::move(n)) { std::cout << "construct " << name << '\n'; }

    // Destructor: runs automatically when a Tracer's lifetime ends.
    ~Tracer() { std::cout << "destroy " << name << '\n'; }
};

Tracer global("global");

void f()
{
    Tracer local("f-local");
}

int main()
{
    std::cout << "main starts\n";
    Tracer a("a");
    {
        Tracer b("b");
        f();
    }
    Tracer c("c");
    std::unique_ptr<Tracer> h = std::make_unique<Tracer>("heap");
    std::cout << "using " << h->name << '\n';
    std::cout << "main ends\n";
    return 0;
}
```

```check
matches lifetime/tracer.cpp "make_unique\s*<\s*Tracer\s*>" label="tracer.cpp uses std::make_unique<Tracer>"
lacks lifetime/tracer.cpp "delete" label="no delete left in tracer.cpp"
run "g++ -std=c++20 -Wall -Wextra -Werror lifetime/tracer.cpp -o lifetime/tracer"
run "./lifetime/tracer" stdout="main ends\ndestroy heap\ndestroy c" label="the heap Tracer is destroyed automatically, before c" -- Declare the unique_ptr after c, as a local in main.
```
