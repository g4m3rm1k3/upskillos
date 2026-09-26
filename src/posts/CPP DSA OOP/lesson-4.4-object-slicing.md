# Lesson 4.4: Object Slicing

*Phase 4 — Inheritance & Polymorphism, Taught via a Real Need*
*A C++-only gotcha, worth a dedicated lesson.*

---

## Why this bug doesn't exist in Python

You've now seen `Shape&` and `Shape*` correctly enable polymorphism, via `virtual` (Lesson 4.2). Here's a version that looks almost identical but is subtly, silently broken:

```cpp
void printArea(Shape s) {   // note: NOT Shape&, NOT Shape* — just plain Shape, BY VALUE
    std::cout << s.name << " area: " << s.area() << std::endl;
}

int main() {
    Circle c(5.0);
    printArea(c);   // BUG: prints 0, not the real circle area!
    return 0;
}
```

This compiles cleanly, with no warning by default in many setups, and silently produces the wrong answer — exactly Lesson 4.1's original bug, reintroduced, even though `virtual` is correctly in place this time. Understanding *why* requires connecting two things you already know separately: Lesson 0.4's pass-by-value (a function parameter with no `&` or `*` receives a *copy*) and Lesson 4.1's memory layout (a `Circle` is genuinely bigger than a `Shape` — it contains a full `Shape` plus its own extra fields).

## What actually happens, mechanically

```
Circle object (what c actually is):
┌─────────────────┬──────────┐
│  Shape part      │  radius  │
│  (name)          │          │
└─────────────────┴──────────┘

Shape s parameter (what printArea receives, by value):
┌─────────────────┐
│  Shape part      │   <- ONLY this much gets copied. radius is left behind entirely.
│  (name)          │
└─────────────────┘
```

`void printArea(Shape s)` declares its parameter type as plain `Shape` — not a reference, not a pointer, an actual `Shape`-sized box (Lesson 0.3). When you call `printArea(c)`, C++ has to construct a genuine `Shape` object to put in that box — and a `Shape`-sized box has no room for `radius` at all. The compiler copies *only* the `Shape` portion of `c` — the base-class part — into a brand new, genuine `Shape` object, and the `Circle`-specific data (`radius`) is simply left behind, discarded, gone. This is called **object slicing**: the derived-specific part of the object has been sliced off, as if with a knife, leaving only the base-class remnant.

Crucially, `s` inside `printArea` is now a real, actual `Shape` — not a `Circle` wearing a costume, not a reference to the real `Circle` anymore. Its vtable pointer (Lesson 4.2) points to `Shape`'s own vtable, not `Circle`'s. So `s.area()` correctly, faithfully, exactly follows dynamic dispatch — to `Shape::area()`, because as far as `s` is concerned, at this point, that's genuinely and entirely what it is. This is the sharpest, most important thing to understand about slicing: **it's not that virtual dispatch "failed" here — dynamic dispatch worked perfectly. The object it was dispatching on had already been silently, irreversibly reduced to a `Shape` before dispatch ever had a chance to matter.**

## Why references and pointers don't have this problem

Go back to Lesson 4.2's working version:

```cpp
void printArea(const Shape& s) {   // REFERENCE — no copy happens at all
    std::cout << s.name << " area: " << s.area() << std::endl;
}
```

A reference (Lesson 1.3) is, provably, the exact same box as the object it refers to — no new object is ever constructed, nothing is copied, nothing can be sliced off. `s` here still genuinely *is* the original `Circle`, just accessed through a `Shape`-typed reference — its vtable pointer is still `Circle`'s real vtable pointer, untouched, because the object itself was never duplicated in the first place. The same reasoning applies identically to `Shape*` — a pointer just stores an address; copying an address copies 8 bytes, never the object it points to.

**This is why the professional rule, worth adopting permanently starting now, is: pass polymorphic types by reference or pointer, essentially always, never by value.** Slicing is a genuinely easy mistake to write by accident — the plain `Shape s` version above compiles with no error in most compiler setups, which is precisely what makes it dangerous. It's the kind of bug that can sit quietly in real code for a long time, always technically "working" (it runs, it produces *an* answer, just the wrong one), before someone eventually notices the numbers don't add up.

## Slicing also happens on direct assignment, not just parameters

```cpp
Circle c(5.0);
Shape s = c;   // ALSO sliced — s is a real, separate Shape, radius is gone
s.name = "modified";
std::cout << c.name << std::endl;   // "Circle" — c is UNTOUCHED, s was always a separate object
```

This is worth contrasting directly against Lesson 4.1's `Shape& shapeRef = c;`, which created a genuine alias to the real `Circle` — no slicing, because no new object was constructed. `Shape s = c;`, with no `&`, constructs an entirely new, independent `Shape` object from `c`'s base portion — indistinguishable, mechanically, from the parameter-passing case above, just written at a different call site. Same underlying cause both times: any context that constructs a genuine, standalone `Shape` object (a plain value, not a reference or pointer) from something derived will slice.

## Try it yourself

**1. Build the sliced `printArea(Shape s)` version above and confirm it really does print `0` for a real `Circle`**, despite `virtual` being correctly in place on `area()`. This is the exact bug named at the top of the lesson, live.

**2. Confirm the vtable claim directly**, by printing `typeid(s).name()` inside both the by-value and by-reference versions of `printArea` (requires `#include <typeinfo>`):

```cpp
#include <typeinfo>

void printArea(Shape s) {
    std::cout << "by value, typeid: " << typeid(s).name() << std::endl;
}

void printAreaRef(const Shape& s) {
    std::cout << "by reference, typeid: " << typeid(s).name() << std::endl;
}
```

Call both with a real `Circle` and compare the printed type names — the by-value version will report a genuine `Shape`; the by-reference version will report the real, underlying `Circle`. (The exact printed text is compiler-specific and not meant to be pretty — the point is confirming the two versions report *different* answers.)

**3. Try to fix the direct-assignment version, `Shape s = c;`, and notice you genuinely can't** — there's no way to make a plain `Shape` variable "remember" it came from a `Circle`, because a `Shape`-sized box structurally has nowhere to put `radius` at all. The only real fixes are: don't declare `s` as a plain `Shape` in the first place (use a reference, a pointer, or — Lesson 1.7's tool, reintroduced here for exactly this purpose — a `std::unique_ptr<Shape>` holding a real, unsliced `Circle` on the heap).

## What this cost / bought us

| | Pass/store by value (`Shape s`) | Pass/store by reference or pointer (`Shape&`, `Shape*`) |
|---|---|---|
| What happens with a derived object | Sliced — a new, separate, base-only object is constructed | No copy at all — the original, full derived object is accessed directly |
| Virtual dispatch still works correctly | No — the sliced object's vtable genuinely is the base class's | Yes — the real object, and its real vtable, were never touched |
| Compiles without warning | Yes, in most setups — this is exactly what makes it dangerous | N/A |
| Professional default | Avoid for polymorphic types | **This is the default you should reach for**, essentially always, for any type designed to be inherited from |

This lesson has no new keyword and no new capability — it's entirely about understanding a consequence of things you already know (pass-by-value copies, Lesson 0.4; derived objects are physically bigger, Lesson 4.1) well enough to see a genuinely dangerous interaction between them before it bites you in real code. This is exactly the kind of subtlety that separates "knows the syntax" from "understands the machine underneath it," which has been this entire curriculum's stated goal since the very first lesson.

---

**Next up: Lesson 4.5 — Composition vs. inheritance.** The same problem, solved a second way, compared on coupling and flexibility — including a direct look at when "is-a" (this phase's whole foundation) is actually the *wrong* relationship, and "has-a" is what you meant all along.
