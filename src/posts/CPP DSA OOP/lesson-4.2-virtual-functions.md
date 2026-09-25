# Lesson 4.2: Virtual Functions & Dynamic Dispatch

*Phase 4 — Inheritance & Polymorphism, Taught via a Real Need*
*How C++ decides at runtime which version of a function to call — Python does this automatically; here you'll see the mechanism.*

---

## Closing last lesson's gap

`printArea(const Shape& s)` called `s.area()` and got `0`, always, no matter what real object `s` referred to. Here's precisely why: without any special marking, C++ resolves which `area()` to call based on the *declared type of the reference* — `Shape&` — not the actual type of the object it refers to. This is called **static dispatch**, and it's decided entirely at compile time, by looking at the type written in the code, with no regard for what happens at runtime. One keyword changes this completely.

## `virtual` — the fix

```cpp
class Shape {
public:
    std::string name;

    Shape(const std::string& n) : name(n) {}

    virtual double area() {   // <- just this one word
        return 0.0;
    }
};

class Circle : public Shape {
public:
    double radius;

    Circle(double r) : Shape("Circle"), radius(r) {}

    double area() override {   // 'override' is optional but strongly recommended — more below
        return 3.14159 * radius * radius;
    }
};
```

That's the entire fix. Mark the base class's function `virtual`, and now `s.area()` resolves based on the *actual, runtime type* of the object `s` refers to — not the declared reference type. This is called **dynamic dispatch**, and it's what makes Lesson 4.1's `printArea` finally do what you wanted:

```cpp
void printArea(const Shape& s) {
    std::cout << s.name << " area: " << s.area() << std::endl;
}

int main() {
    Circle c(5.0);
    printArea(c);   // NOW correctly prints the real circle area
    return 0;
}
```

Nothing about `printArea` itself changed at all — only the base class's declaration gained `virtual`. That's the whole point: the caller doesn't need to know or care which specific derived type it's dealing with; the object itself now correctly "knows" which version of `area()` belongs to it.

## `override` — not required, but you should always write it

```cpp
double area() override {   // tells the compiler: "I intend to override a virtual base function"
    return 3.14159 * radius * radius;
}
```

`override` isn't required by the language, but it's a real, free safety net: if you write `override` and there is, for any reason, no matching `virtual` function in the base class to actually override (a typo in the function name, a mismatched parameter list, forgetting `virtual` in the base entirely), the compiler will refuse to build and tell you exactly why. Without `override`, that same mistake compiles silently — you'd just get a brand new, unrelated function that happens to share a name, and dynamic dispatch would quietly *not* apply to it, reintroducing Lesson 4.1's exact bug without any warning at all. Always write `override` on every function you intend as an override — treat it as non-negotiable style, not decoration.

## Python was doing this automatically the entire time

```python
class Shape:
    def area(self):
        return 0.0

class Circle(Shape):
    def area(self):
        return 3.14159 * self.radius ** 2

def print_area(s):
    print(s.area())   # ALWAYS calls the real, correct area() — no 'virtual' needed
```

Python has no `virtual` keyword at all, because *every* method lookup in Python works this way, unconditionally, by design — Python looks up `s.area()` at the moment it's called, checks the actual runtime type of `s`, and finds the right method, every single time, automatically. This is a direct consequence of Python's dynamic-typing philosophy from Lesson 0.2: since Python never pins a variable to one fixed type at compile time in the first place, there's no "static" resolution to even be the default — dynamic dispatch is the *only* option, baked into the language's entire method-lookup mechanism. C++ makes you opt in explicitly, per function, because C++'s default (static dispatch) is faster — no runtime lookup needed at all — and the language's whole philosophy, since Phase 0, has been "pay for what you actually need, not what you might need."

## How this actually works under the hood: the vtable

When a class has at least one `virtual` function, the compiler secretly adds one extra hidden pointer to every object of that class — a **vtable pointer** (short for "virtual table pointer"), pointing to a small, per-class table of function addresses. Calling a virtual function through a base-class reference or pointer means: follow the object's vtable pointer, look up the correct function address for *this object's actual class* in that table, and call it. This is a small amount of real, measurable extra work — one extra pointer indirection — compared to a plain, non-virtual function call, which the compiler can resolve and inline directly at compile time with no runtime lookup at all.

```cpp
#include <iostream>

int main() {
    std::cout << "sizeof(Shape) with virtual = " << sizeof(Shape) << std::endl;
    // compare this against a version of Shape with area() NOT marked virtual —
    // the virtual version will be larger, by roughly the size of one pointer
    return 0;
}
```

This is worth knowing precisely because it means `virtual` isn't free — a small memory cost (one pointer per object) and a small runtime cost (one indirection per call) apply the instant you add it. In nearly all real code this cost is utterly negligible next to what it buys you — but "everything has a cost, know what you're paying for it" has been this curriculum's running theme since Lesson 0.1's compiling-vs-interpreting trade-off, and `virtual` is no exception to that pattern.

## Polymorphism through pointers — where this becomes genuinely powerful

The real payoff shows up when you hold a *collection* of different derived types through base-class pointers, and call a virtual function uniformly across all of them:

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<Shape*> shapes;
    shapes.push_back(new Circle(5.0));
    shapes.push_back(new Rectangle(3.0, 4.0));
    shapes.push_back(new Circle(2.0));

    for (Shape* s : shapes) {
        std::cout << s->name << " area: " << s->area() << std::endl;   // each calls the RIGHT area()
    }

    for (Shape* s : shapes) {
        delete s;   // cleanup — but see the warning below
    }

    return 0;
}
```

This is **polymorphism** — literally "many forms" — a single `std::vector<Shape*>` genuinely holding a mix of different concrete types, with one loop correctly calling each one's own specific `area()`. This is the exact, complete solution to this phase's opening problem: one piece of code, `totalArea`-style, that works uniformly across every current and future shape type, with zero type-checking `if`/`else` chains anywhere.

**One sharp edge, worth flagging now even though it's fixed properly by Lesson 2.5's RAII applied here:** `delete s;` above calls `Shape`'s destructor, not necessarily `Circle`'s or `Rectangle`'s, *unless the destructor is also marked `virtual`* — an easy-to-miss requirement that causes real leaks in real code when a derived class holds its own heap resources. The fix is one word, in the base class:

```cpp
class Shape {
public:
    std::string name;
    Shape(const std::string& n) : name(n) {}
    virtual ~Shape() {}   // virtual destructor — ALWAYS do this for any class meant to be inherited from
    virtual double area() { return 0.0; }
};
```

**Rule to adopt permanently, starting now:** any class with at least one `virtual` function should almost always have a `virtual` destructor too, even if that destructor's body is empty. This single detail prevents a real, subtle memory-leak class of bug the moment you start deleting derived objects through base-class pointers — exactly the pattern the `shapes` vector above uses.

## Try it yourself

**1. Build `Shape`/`Circle`/`Rectangle` with `virtual area()` and confirm `printArea` now works correctly**, exactly reversing Lesson 4.1's bug.

**2. Build the `std::vector<Shape*>` polymorphism example above**, add a third shape type of your own (a `Triangle`, say), and confirm the loop correctly calls each one's real `area()` with zero changes to the loop itself.

**3. Prove the virtual destructor matters, not just in theory.** Give `Circle` a heap-allocated field (anything — a `std::string* label = new std::string("circle");` works fine for this purpose), write a non-virtual destructor in `Shape`, and run the polymorphic `delete` loop with a memory checker like `valgrind` if you have it available. Confirm it reports a leak. Then mark `Shape`'s destructor `virtual` and confirm the leak disappears, with no other code changes at all.

**4. Measure the `sizeof` difference from a `virtual` function directly**, comparing a version of `Shape` with and without any `virtual` members, confirming the vtable pointer's real, measurable memory cost from the section above.

## What this cost / bought us

| | Static dispatch (default, no `virtual`) | Dynamic dispatch (`virtual`) | Python (always dynamic) |
|---|---|---|---|
| Which function runs | Decided by the reference/pointer's declared type, at compile time | Decided by the object's real runtime type | Always the real runtime type |
| Speed | Fastest — no runtime lookup, can even be inlined | Slightly slower — one vtable indirection per call | Slowest — full dynamic lookup on every single call, always |
| Memory per object | No extra cost | One extra pointer (the vtable pointer) | N/A — Python objects carry far more overhead than this regardless |
| Is it opt-in? | This is the default | You explicitly choose it, per function, with `virtual` | Not opt-in — it's the only mode Python has |

You now have the complete mechanism behind runtime polymorphism — the actual thing "OOP" usually means when people invoke it vaguely. The next two lessons tighten this up: abstract base classes, for when a base class like `Shape` should never be instantiated on its own at all, and a genuine C++-only gotcha (object slicing) that this lesson's memory-layout discussion from Lesson 4.1 was quietly setting you up to understand.

---

**Next up: Lesson 4.3 — Abstract base classes / pure virtual functions.** `Shape`'s `area()` returning `0.0` as a placeholder was always a little unsatisfying — what does it even mean for a generic, non-specific "Shape" to have an area at all? This lesson gives you the tool to say, explicitly, "this base class can never be instantiated directly."
