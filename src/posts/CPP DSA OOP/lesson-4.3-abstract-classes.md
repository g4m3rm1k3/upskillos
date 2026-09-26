# Lesson 4.3: Abstract Base Classes / Pure Virtual Functions

*Phase 4 — Inheritance & Polymorphism, Taught via a Real Need*
*Python anchor: `≈` Python's `ABC`*

---

## The question `Shape` never really answered

`Shape::area()` has returned `0.0` since Lesson 4.1 — a placeholder, always slightly wrong, quietly relying on every derived class to override it correctly. But step back and ask: does it even make sense to create a plain `Shape` at all?

```cpp
Shape s("mystery shape");
std::cout << s.area() << std::endl;   // 0 — meaningless, not a real geometric answer
```

A generic, non-specific "shape" doesn't have a well-defined area — only *actual* shapes (circles, rectangles, triangles) do. `Shape` was never meant to be a real, standalone thing you create directly — it was always meant to be a *template of requirements* that concrete shapes fulfill. C++ has a way to say this explicitly, and enforce it.

## Pure virtual functions: `= 0`

```cpp
class Shape {
public:
    std::string name;

    Shape(const std::string& n) : name(n) {}
    virtual ~Shape() {}

    virtual double area() = 0;   // PURE virtual — no body, no default at all
};
```

`= 0` after the function signature makes `area()` a **pure virtual function** — a function `Shape` declares exists, and requires every derived class to provide, but that `Shape` itself does not (and cannot) implement. A class containing at least one pure virtual function becomes an **abstract class**, and the compiler now actively enforces the consequence:

```cpp
Shape s("mystery shape");   // COMPILE ERROR — cannot instantiate an abstract class
```

This is not a warning or a style suggestion — your program will not build. `Shape` has become impossible to create directly, permanently, for as long as `area()` remains pure virtual. This is the enforced version of what was always conceptually true: a bare `Shape` never made sense, and now the compiler agrees with you and refuses to let anyone accidentally create one.

## Concrete classes must implement every pure virtual function, or they're abstract too

```cpp
class Circle : public Shape {
public:
    double radius;
    Circle(double r) : Shape("Circle"), radius(r) {}

    double area() override {
        return 3.14159 * radius * radius;
    }
};
```

`Circle` provides a real body for `area()`, so `Circle` is a **concrete class** — it can be instantiated normally, `Circle c(5.0);`. But if a derived class *fails* to override every pure virtual function it inherits, it remains abstract too, and the same compile error applies to it:

```cpp
class BrokenShape : public Shape {
public:
    BrokenShape() : Shape("broken") {}
    // forgot to implement area() !
};

BrokenShape b;   // COMPILE ERROR — BrokenShape is STILL abstract, area() is still unimplemented
```

This is genuinely useful, not just strict for its own sake: it's impossible to accidentally ship a derived shape class that's missing its area logic. The bug that would otherwise surface at runtime (calling `area()` on some shape and quietly getting `0` again, exactly Lesson 4.1's original problem) is caught at compile time instead, before the program can even run.

## Python's version: `ABC`

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    def __init__(self, name):
        self.name = name

    @abstractmethod
    def area(self):
        pass

class Circle(Shape):
    def __init__(self, r):
        super().__init__("Circle")
        self.radius = r

    def area(self):
        return 3.14159 * self.radius ** 2
```

```python
s = Shape("mystery")   # TypeError: Can't instantiate abstract class Shape with abstract method area
```

Same idea, same enforcement, different mechanics: Python's `ABC` (Abstract Base Class, from the `abc` module) and `@abstractmethod` decorator check this at *runtime*, when you attempt to instantiate — raising a `TypeError` the moment it happens, rather than refusing to compile in the first place. This is a genuinely important, recurring distinction across this whole curriculum: **C++ tends to catch a class of mistake earlier (compile time) than Python catches the equivalent mistake (runtime)** — not because C++ is "stricter" for its own sake, but because it *can* be, since the compiler has your entire program available to check before anything runs at all (a direct callback to Lesson 0.1's very first lesson).

## An abstract class can still have real, shared behavior

Pure virtual functions don't mean an abstract class must be empty — it can freely have ordinary member functions, fields, and constructors that concrete derived classes inherit and share normally:

```cpp
class Shape {
public:
    std::string name;

    Shape(const std::string& n) : name(n) {}
    virtual ~Shape() {}

    virtual double area() = 0;      // pure virtual — must be implemented

    void describe() {                // ordinary, fully-implemented, INHERITED as-is
        std::cout << name << " has area " << area() << std::endl;
    }
};
```

`describe()` is a completely ordinary member function, inherited by `Circle`, `Rectangle`, and anything else derived from `Shape`, with no need for any of them to reimplement it — and notice it calls `area()` internally, which will correctly dispatch (via `virtual`, Lesson 4.2) to whichever concrete class's implementation actually applies. This pattern — a base class providing some genuinely shared, working logic, plus a few specific gaps that only derived classes can fill in correctly — is exactly the shape of Phase 10's Template Method pattern, arriving much later, and it's worth recognizing the seed of it here.

## Try it yourself

**1. Make `Shape::area()` pure virtual, confirm `Shape s("test");` now fails to compile**, and confirm `Circle`/`Rectangle` still work exactly as before.

**2. Deliberately write a derived class that forgets to implement `area()`, and read the compiler's error message closely.** It should explicitly tell you the class is still abstract, and name the specific pure virtual function that's unimplemented — get comfortable reading this exact error, since it's one you'll see again for the rest of this curriculum whenever you forget to finish implementing an interface.

**3. Add `describe()` to `Shape` as shown above, and confirm it works correctly, unmodified, for every derived shape type** — direct proof that shared, concrete behavior and per-type required behavior coexist cleanly in the same abstract class.

**4. Build the polymorphic vector from Lesson 4.2 again, this time calling `s->describe()` in the loop instead of `s->area()` directly.** Confirm each shape's `describe()` correctly reports its own specific area, via the shared base implementation dispatching internally to the right override.

## What this cost / bought us

| | `Shape` with a placeholder `area()` (Lesson 4.1–4.2) | `Shape` with `area() = 0` (this lesson) |
|---|---|---|
| Can you accidentally create a bare `Shape`? | Yes — compiles fine, silently meaningless | No — compile error, caught immediately |
| Can a derived class forget to implement `area()`? | Yes — silently inherits the meaningless `0.0` placeholder | No — that derived class remains abstract too, compile error |
| When is the mistake caught? | Possibly never — could ship, quietly wrong | Always, at compile time, before the program can even run |
| Shared, real behavior in the base class | Possible, but mixed in with the meaningless placeholder | Cleanly separated — pure virtual for "must be provided," ordinary functions for "genuinely shared" |

`= 0` turns an implicit design intention ("nobody should ever create a bare `Shape`") into an explicit, compiler-enforced rule. This is the same philosophical move as Lesson 2.3's constructors (making "must be initialized" impossible to skip) and Lesson 2.4's `private` (making "must go through the approved interface" impossible to bypass) — this entire phase, and honestly this entire curriculum, keeps returning to the same idea: **wherever possible, turn a rule you'd otherwise have to remember into a rule the compiler enforces for you.**

---

**Next up: Lesson 4.4 — Object slicing.** A C++-only gotcha, worth a dedicated lesson — and it's the direct, concrete payoff of Lesson 4.1's memory-layout discussion, which was quietly building toward exactly this moment.
