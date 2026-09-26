# Lesson 4.5: Composition vs. Inheritance

*Phase 4 — Inheritance & Polymorphism, Taught via a Real Need*

---

## The "is-a" test, revisited seriously

Lesson 4.1 introduced the "is-a" test: "a Circle *is-a* Shape" genuinely holds, so inheritance was the right tool. But this phase has quietly been building toward a harder, more honest question: **what happens when "is-a" doesn't actually hold, but it's tempting to use inheritance anyway?** This lesson is about noticing that trap and having a real alternative ready.

## A scenario where inheritance goes wrong

Suppose you're modeling a `Car`. A car has an `Engine`. Ask yourself the test directly: is a `Car` *an* `Engine`? Obviously not — a car doesn't behave like an engine, doesn't have an engine's interface, isn't substitutable for one anywhere. The real relationship is different: **a `Car` *has-a* `Engine`.** This is the second fundamental relationship in OOP, and it calls for a different tool entirely: **composition** — building a class out of other objects as *members*, rather than inheriting from them.

```cpp
// WRONG — Car does not pass the "is-a" test against Engine
class Car : public Engine {
    // ...
};
```

```cpp
// RIGHT — composition: Car HAS-A Engine
class Engine {
public:
    int horsepower;
    Engine(int hp) : horsepower(hp) {}

    void start() {
        std::cout << "Engine starting, " << horsepower << " HP" << std::endl;
    }
};

class Car {
private:
    Engine engine;   // a Car object CONTAINS an Engine object, as a member

public:
    std::string model;

    Car(const std::string& m, int hp) : model(m), engine(hp) {}

    void start() {
        std::cout << model << ": ";
        engine.start();   // Car DELEGATES to its Engine, rather than inheriting Engine's interface
    }
};
```

Notice `Car`'s constructor: `: model(m), engine(hp)`. `engine(hp)` in the initializer list constructs `Car`'s `Engine` member directly, passing `hp` to `Engine`'s own constructor — the same member-initializer-list mechanism you've been using since Lesson 2.5's `ScopeLogger`, now initializing an object *member*, not just a primitive field.

`Car` does not inherit `Engine`'s public interface at all — there's no `car.horsepower` or `car.start()`-meaning-the-engine's-start directly exposed as if `Car` *were* an `Engine`. Instead, `Car::start()` explicitly calls `engine.start()` internally — this pattern, calling through to a contained object's method, is called **delegation**, and it's the behavioral heart of composition.

## Directly comparing the two, same underlying need

Suppose you want a `LoggingCar` that behaves like a normal car but also prints a message every time it starts. Here's the same idea solved both ways:

**Inheritance-flavored (only really appropriate when "is-a" genuinely holds — shown here to compare, not endorsed):**

```cpp
class LoggingCar : public Car {
public:
    LoggingCar(const std::string& m, int hp) : Car(m, hp) {}

    void start() {
        std::cout << "[LOG] starting car..." << std::endl;
        Car::start();   // explicitly call the base class's version
    }
};
```

**Composition:**

```cpp
class LoggingCar {
private:
    Car car;   // HAS-A Car, not IS-A Car

public:
    LoggingCar(const std::string& m, int hp) : car(m, hp) {}

    void start() {
        std::cout << "[LOG] starting car..." << std::endl;
        car.start();
    }
};
```

Both compile, both produce identical output. The difference isn't in what runs — it's in what each design *commits you to* going forward, which is the real subject of this lesson.

## Comparing on coupling and flexibility

**Coupling** — how tightly two pieces of code are bound together, and how much a change in one forces a change in the other:

- **Inheritance** couples `LoggingCar` tightly to `Car`'s *entire* public and protected interface, forever. Every public method `Car` has, `LoggingCar` now has too, whether that makes sense or not — and if `Car` changes its internals in a way that affects derived-class behavior (even in ways not obviously related to `start()`), `LoggingCar` can be silently affected. `LoggingCar` also inherits `Car`'s full object layout (Lesson 4.1's memory model) — it *is*, physically, a `Car`, with everything that entails, including susceptibility to Lesson 4.4's object slicing.
- **Composition** couples `LoggingCar` only to the *specific* parts of `Car` it actually chooses to call — `car.start()`, in this example, and nothing else. `LoggingCar` is not a `Car` at all, cannot be passed anywhere a `Car` is expected, and is entirely insulated from anything about `Car`'s internals it doesn't explicitly reach for.

**Flexibility** — how easily the design adapts to change:

- With inheritance, swapping out `Car`'s behavior for something else entirely (a `Motorcycle`, unrelated to `Car`) means `LoggingCar` would need to become a completely different class, inheriting from something else — a structural, compile-time-fixed choice made once.
- With composition, `LoggingCar` could be trivially generalized to log *any* type with a `start()` method, or even hold a `Car*`/reference instead of a `Car` value, letting the exact underlying object be swapped at runtime. This flexibility — "compose with whatever object satisfies an interface, decided dynamically" — is precisely the mechanism behind Phase 4's very first design pattern, arriving at the end of this lesson set.

## A genuinely useful rule of thumb

**"Favor composition over inheritance"** is a well-known, widely-repeated piece of real-world C++ (and general OOP) advice — not because inheritance is bad, but because it's easy to reach for it out of habit in situations where "is-a" doesn't actually hold, and the coupling cost above compounds badly in large, long-lived codebases. The genuinely correct process, every time: **apply the "is-a" test honestly, first.** If it holds — a `Circle` really is a `Shape`, in every meaningful sense, substitutable everywhere a `Shape` is expected — inheritance is the right, natural tool, exactly as Lessons 4.1 through 4.4 used it. If the real relationship is "has-a," or "uses-a," or "can-do-the-same-thing-as-but-isn't-really-a," composition (or, coming very shortly, an interface built from an abstract class with no shared implementation at all) is very likely the better fit.

## Try it yourself

**1. Build both `LoggingCar` versions above and confirm they produce identical output.** Then try passing each into a function that accepts `Car&` — one compiles immediately (the inheritance version, since `LoggingCar` genuinely *is* a `Car`); the other requires you to explicitly expose or forward a `Car&` from inside the composed version, since it fundamentally *isn't* one. Feel that difference directly, not just read about it.

**2. Apply the "is-a" test to a handful of real relationships, out loud, before writing any code:** a `Student` and a `Person`; a `Stack` (Phase 6, coming soon) and a `MyVector`; a `SavingsAccount` and a `BankAccount`; a `Playlist` and a `Song`. For each, decide: is it genuinely "is-a" (inheritance), "has-a" (composition), or something else entirely? There's a real, sometimes debatable answer for some of these — the value is in practicing the question, not necessarily landing on one universally "correct" answer.

**3. Take `MyVector` from Phase 2 and design a `Stack` class using composition** — a `Stack` that *has-a* `MyVector` as a private member, exposing only `push`/`pop`/`top` publicly, hiding `MyVector`'s full interface (like `operator[]`, which a real stack shouldn't expose at all — a stack only allows access at one end). This is, deliberately, a direct preview of Phase 6's opening lesson, and a genuinely good exercise in seeing composition *restrict* an interface on purpose, not just reuse one.

## What this cost / bought us

| | Inheritance | Composition |
|---|---|---|
| Relationship modeled | "is-a" | "has-a" |
| Interface exposed | Everything from the base, by default | Only what you explicitly delegate |
| Coupling | Tight — tied to the base's entire interface and layout | Loose — tied only to the specific methods you call |
| Can change the contained/base type at runtime | No — fixed at compile time | Yes, if held via a pointer/reference to an interface |
| Substitutability (can be passed where the other type is expected) | Yes, automatically (Lesson 4.1's whole premise) | No, unless explicitly exposed |
| Risk of object slicing (Lesson 4.4) | Present | Not applicable — composed objects aren't derived from anything |
| Best used when | The "is-a" test genuinely, honestly holds | Almost everything else |

This lesson closes the "building blocks" portion of Phase 4 with a genuinely important piece of design judgment, not just another keyword. The next lesson puts every tool from this phase to work at once: your first real design pattern, arising directly from a concrete need, exactly the way this entire curriculum has promised patterns would arrive since its very first page.

---

**Next up: the Strategy pattern** — your first design pattern, motivated by wanting interchangeable behavior, implemented three separate ways (inheritance + virtual, `std::function`, and a lambda) and compared directly against each other.
