# Lesson 4.1: Inheritance — "Is-a" Relationships

*Phase 4 — Inheritance & Polymorphism, Taught via a Real Need*

---

## The problem that motivates this phase

Imagine you're building a small drawing program. You need to represent several kinds of shapes — circles, rectangles, triangles — and, critically, you want *one* function that can compute the total area of a whole collection of mixed shapes, without needing to know in advance which specific kinds it's holding:

```cpp
double totalArea(/* a collection of... what, exactly? */) {
    // sum up the area of every shape, regardless of what kind it is
}
```

Without a common way to treat different shape types uniformly, you'd need a separate function — or a giant `if`/`else` chain checking types by hand — for every single shape you might encounter, and adding a new shape type would mean hunting down and updating every one of those functions. Inheritance is the tool for exactly this situation: several distinct types that share a conceptual relationship, and a single piece of code that should be able to treat them all the same way.

## The "is-a" test

Inheritance models a specific kind of relationship between types: **"a Circle *is-a* Shape."** **"a Rectangle *is-a* Shape."** This phrasing is the actual design test worth applying before reaching for inheritance at all — if you can't honestly say "a Y is-a X" about two types, inheritance is very likely the wrong tool (Lesson 4.5 will show you the alternative, composition, for exactly the cases where the relationship is really "has-a" instead).

## Declaring a base and a derived class

```cpp
class Shape {
public:
    std::string name;

    Shape(const std::string& n) : name(n) {}

    double area() {
        return 0.0;   // a placeholder — Lesson 4.2 fixes this properly
    }
};

class Circle : public Shape {
public:
    double radius;

    Circle(double r) : Shape("Circle"), radius(r) {}

    double area() {
        return 3.14159 * radius * radius;
    }
};

class Rectangle : public Shape {
public:
    double width;
    double height;

    Rectangle(double w, double h) : Shape("Rectangle"), width(w), height(h) {}

    double area() {
        return width * height;
    }
};
```

`class Circle : public Shape` — read this as "`Circle` inherits from `Shape`, publicly." `Circle` is the **derived class** (also called a subclass); `Shape` is the **base class** (also called a superclass). Every `Circle` object automatically has everything `Shape` has — the `name` field, in this case — plus whatever `Circle` adds on top (`radius`, its own `area()`).

Notice `Circle`'s constructor: `Circle(double r) : Shape("Circle"), radius(r) {}`. That `Shape("Circle")` in the initializer list explicitly calls the *base class's* constructor, passing `"Circle"` up to it — this is required whenever the base class doesn't have a no-argument constructor available. The base part of a derived object gets constructed first, always, before the derived class's own constructor body runs — a direct extension of Lesson 2.3's guaranteed-initialization idea, now applied across two layers instead of one.

## Python's version, for comparison

```python
class Shape:
    def __init__(self, name):
        self.name = name

    def area(self):
        return 0.0

class Circle(Shape):
    def __init__(self, r):
        super().__init__("Circle")
        self.radius = r

    def area(self):
        return 3.14159 * self.radius ** 2
```

`class Circle(Shape):` in Python and `class Circle : public Shape` in C++ are the same idea, same relationship. `super().__init__("Circle")` and `Shape("Circle")` in the initializer list are doing the same job — explicitly invoking the parent's setup. If this feels familiar, that's the point: inheritance's *concept* is identical across languages; only the syntax and (as you'll see starting next lesson) some of the runtime mechanics differ.

## What a derived object actually contains, physically

Go back to Lesson 0.3's "boxes" model one more time. A `Circle` object isn't a `Shape` object with some extra data bolted on somewhere far away — it's genuinely one contiguous block of memory containing the `Shape` part *first*, followed immediately by `Circle`'s own additional fields:

```
Circle object in memory:
┌─────────────────┬──────────┐
│  Shape part      │  radius  │
│  (name)          │          │
└─────────────────┴──────────┘
```

This isn't a metaphor — you can confirm it directly by printing `sizeof(Circle)` and comparing it against `sizeof(Shape) + sizeof(double)`. This physical layout fact is what makes Lesson 4.4's "object slicing" gotcha make sense later — you're building toward that now, without needing to worry about it yet.

## Access using the base type

Because a `Circle` genuinely *contains* a `Shape`, you can refer to a `Circle` through a `Shape` reference or pointer:

```cpp
Circle c(5.0);
Shape& shapeRef = c;         // legal — a Circle IS-A Shape
std::cout << shapeRef.name << std::endl;   // "Circle" — the name field is accessible
```

This is the actual mechanical payoff this whole lesson has been building toward: you can now write a function that accepts `Shape&` and pass it *any* derived type — `Circle`, `Rectangle`, anything that inherits from `Shape` — without that function needing to know or care which specific derived type it received.

```cpp
void printName(const Shape& s) {
    std::cout << "This shape is called: " << s.name << std::endl;
}

int main() {
    Circle c(5.0);
    Rectangle r(3.0, 4.0);

    printName(c);   // works — Circle IS-A Shape
    printName(r);   // works — Rectangle IS-A Shape

    return 0;
}
```

One function, two genuinely different concrete types, no `if`/`else` type-checking anywhere. This is real progress toward the phase's opening goal — but notice it only solved the `name` half of the problem. Try calling `s.area()` inside `printName` and think about what would actually happen: `s` is declared as a `Shape&`, and `Shape::area()` always returns `0.0` no matter what. Calling `area()` through a `Shape&` reference, as written so far, will call `Shape`'s version, not the derived object's real version — even when the underlying object is genuinely a `Circle` with real geometry. This is *not* what you want, and it's exactly the gap the very next lesson exists to close.

## Try it yourself

**1. Build `Shape`, `Circle`, and `Rectangle` above, plus `printName()`, and confirm it works identically for both derived types.**

**2. Confirm the memory-layout claim directly:**

```cpp
#include <iostream>

int main() {
    std::cout << "sizeof(Shape) = " << sizeof(Shape) << std::endl;
    std::cout << "sizeof(Circle) = " << sizeof(Circle) << std::endl;
    std::cout << "sizeof(Shape) + sizeof(double) = " << sizeof(Shape) + sizeof(double) << std::endl;
    return 0;
}
```

The last two numbers should be close (possibly not exactly equal, due to memory alignment padding — a real but secondary detail) — direct, measured confirmation that a `Circle` really does physically contain a `Shape` inside it.

**3. Trigger the gap named above, on purpose, so it's memorable when the fix arrives:**

```cpp
void printArea(const Shape& s) {
    std::cout << s.name << " area: " << s.area() << std::endl;
}

int main() {
    Circle c(5.0);
    printArea(c);   // prints 0, not the real circle area!
    return 0;
}
```

Run this and confirm it genuinely prints `0`, despite `c` being a real `Circle` with `radius = 5.0`. Sit with how wrong this feels for a moment — you have a real circle, with a real, correctly-implemented `area()` function, and calling it through a `Shape&` silently ignores it. This exact frustration is the entire motivation for Lesson 4.2's `virtual` keyword, arriving next.

## What this cost / bought us

| | Separate, unrelated classes | Inheritance (this lesson) |
|---|---|---|
| Shared fields (`name`) | Duplicated in every class | Written once, in the base, inherited automatically |
| Treating different types uniformly | Not possible without manual type-checking | A single function accepting `Shape&` works for any derived type |
| Calling shared behavior correctly on the real, specific type | N/A | **Not yet working** — the exact gap this lesson ends on |

Inheritance gives you shared structure and a genuine "is-a" relationship the compiler understands. What it doesn't give you yet — despite the setup looking almost complete — is *runtime dispatch*: calling the *right* version of a function based on what an object actually is, not what type of reference you're holding it through. That's `virtual`, and it's the single most important mechanism in this entire phase.

---

**Next up: Lesson 4.2 — Virtual functions & dynamic dispatch.** How C++ decides, at runtime, which version of a function to call — Python does this automatically, always; here you'll see the actual mechanism, and the one keyword that turns it on.
