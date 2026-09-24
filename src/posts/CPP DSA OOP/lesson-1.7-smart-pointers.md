# Lesson 1.7: Smart Pointers — Closer to Python Again

*Phase 1 — Memory: The Thing Python Hides From You*
*C++'s version of "let the language clean up after me."*

---

## The problem this lesson exists to solve

Look back at Lesson 1.6's `freeArray` function — a separate call you had to remember to make, every time, for every array, or leak the memory. Now imagine a real program: dozens of heap allocations, scattered across dozens of functions, some with early `return`s, some that throw exceptions partway through. Every single one of those exit paths needs to correctly `delete` everything it allocated, or you leak. Getting this right by hand, everywhere, forever, is genuinely hard — and forgetting it is the single most common category of C++ bug you'll write for the rest of this curriculum if nothing changes.

Smart pointers are the fix. They're not a new memory region, not a new allocation mechanism — they're a thin wrapper *around* the raw pointers you already know, that calls `delete` for you, automatically, guaranteed, the instant it's no longer needed. This is C++ handing you back a piece of what Python's garbage collector does — but explicitly, predictably, and on a schedule you can reason about precisely, rather than "whenever the GC gets around to it."

## `unique_ptr` — one owner, guaranteed cleanup

```cpp
#include <memory>
#include <iostream>

int main() {
    std::unique_ptr<int> p = std::make_unique<int>(42);
    std::cout << *p << std::endl;   // 42 — dereferences exactly like a raw pointer

    // no delete needed, anywhere, ever.
    // when p goes out of scope, its destructor automatically calls delete for you.

    return 0;
}
```

That's the entire mental model: `unique_ptr` behaves like a raw pointer for reading and writing (`*p`, same as Lesson 1.2), but it *owns* the memory it points to, and its destructor — a concept you'll formalize properly in Lesson 2.3, but can already feel the shape of here — automatically calls `delete` the instant the `unique_ptr` variable itself goes out of scope. You get Lesson 1.4's cleanup discipline for free, enforced by the language, not by your memory of writing the matching `delete`.

**"Unique" is enforced, not just a naming suggestion:**

```cpp
std::unique_ptr<int> p1 = std::make_unique<int>(42);
std::unique_ptr<int> p2 = p1;   // COMPILE ERROR — cannot copy a unique_ptr
```

This is deliberate and important: if two `unique_ptr`s both thought they owned the same memory, both would try to `delete` it when they went out of scope — the double-free bug from Lesson 1.4, reintroduced right back in. So the language simply forbids copying a `unique_ptr` outright. What you *can* do is transfer ownership explicitly, using `std::move` (a genuine preview of Lesson 2.7's move semantics — filed away for now):

```cpp
std::unique_ptr<int> p1 = std::make_unique<int>(42);
std::unique_ptr<int> p2 = std::move(p1);   // ownership TRANSFERS to p2
// p1 is now empty (nullptr) — it gave up ownership, it didn't duplicate it
```

Exactly one `unique_ptr` owns a given piece of memory at any moment — ownership can move between variables, but it can never be duplicated. This single guarantee is what makes the automatic cleanup safe.

## `shared_ptr` — multiple owners, reference-counted, closest to Python

Sometimes one owner genuinely isn't the right model — several parts of your program legitimately need to keep something alive together, and none of them individually knows when the others are done with it. This is exactly the situation Python's reference counting (which you learned about in Lesson 1.4) handles for *every* object, all the time. `shared_ptr` brings that same mechanism into C++, but opt-in, for the specific cases that need it:

```cpp
#include <memory>
#include <iostream>

int main() {
    std::shared_ptr<int> p1 = std::make_shared<int>(42);
    std::cout << "count: " << p1.use_count() << std::endl;   // 1

    {
        std::shared_ptr<int> p2 = p1;   // COPYING IS ALLOWED — unlike unique_ptr
        std::cout << "count: " << p1.use_count() << std::endl;   // 2
    }   // p2 goes out of scope here — count drops back down

    std::cout << "count: " << p1.use_count() << std::endl;   // 1

    return 0;
}
```

`use_count()` shows you the reference count directly — the exact mechanism you read about conceptually in Lesson 1.4's Python explanation, now visible and inspectable in C++. The underlying `int` is only actually `delete`d once the *last* `shared_ptr` pointing at it is destroyed — nobody needs to coordinate or remember to do it manually; the count itself decides.

## Choosing between them

| | Raw pointer | `unique_ptr` | `shared_ptr` |
|---|---|---|---|
| Ownership | Ambiguous — you decide by convention only | Exactly one owner, enforced | Multiple owners, reference-counted |
| Cleanup | Manual `delete` — your responsibility entirely | Automatic — guaranteed on scope exit | Automatic — when the last owner exits |
| Overhead | None | Essentially none — as fast as a raw pointer | Small — must maintain a reference count |
| When to reach for it | Rarely, by default, in modern C++ — mostly for non-owning access (Lesson 1.3's references cover most of that need anyway) | **Default choice** whenever one thing clearly owns a heap allocation | When ownership is genuinely, legitimately shared |

The real-world guidance, and the modern C++ convention this curriculum follows from here forward: **reach for `unique_ptr` by default.** Use `shared_ptr` only when you have an actual, concrete reason multiple owners are needed — reaching for it out of uncertainty ("I'm not sure who owns this, so I'll just share it") is a code smell, not a safe default, because it trades away the compile-time clarity of `unique_ptr`'s single-owner guarantee for runtime reference-counting overhead you may not have actually needed.

## Try it yourself

**1. Prove `unique_ptr` really does clean up automatically — no leak, no explicit `delete`, anywhere:**

```cpp
#include <memory>
#include <iostream>

void useIt() {
    std::unique_ptr<int> p = std::make_unique<int>(99);
    std::cout << "inside function: " << *p << std::endl;
}   // p's destructor runs HERE, automatically, freeing the int

int main() {
    useIt();
    useIt();
    useIt();
    std::cout << "no leaks, no explicit delete anywhere in this program" << std::endl;
    return 0;
}
```

If you have `valgrind` available (from Lesson 1.4), run it against this program and confirm: zero leaks, without a single `delete` written anywhere in your code.

**2. Confirm ownership transfer with `std::move`, and confirm the source really does become empty:**

```cpp
#include <memory>
#include <iostream>

int main() {
    std::unique_ptr<int> p1 = std::make_unique<int>(7);
    std::unique_ptr<int> p2 = std::move(p1);

    std::cout << "p2: " << *p2 << std::endl;

    if (p1 == nullptr) {
        std::cout << "p1 is now empty — ownership fully transferred" << std::endl;
    }

    return 0;
}
```

**3. Watch a `shared_ptr`'s count rise and fall in real time**, using the reference-counting example above — add a third nested scope and predict the `use_count()` at each print *before* running it. Get this intuition solid now; Phase 5's linked structures and Phase 9's graphs will both lean on exactly this tool whenever a node legitimately needs multiple owners.

## What this cost / bought us

| | Raw `new`/`delete` (Lesson 1.4) | Smart pointers (this lesson) | Python |
|---|---|---|---|
| Who calls the equivalent of "free"? | You, manually, every time, on every exit path | The smart pointer's destructor, automatically | The garbage collector, automatically |
| Risk of forgetting | High — a real, common bug (Lesson 1.4) | Effectively eliminated for owned memory | Not applicable |
| Risk of double-free | Real, if you're not careful | Effectively eliminated — `unique_ptr` can't be copied; `shared_ptr` only frees when the count hits zero | Not applicable |
| Overhead vs. raw pointers | None | `unique_ptr`: none. `shared_ptr`: a small counting cost | A full, always-on garbage collector, running continuously |
| Control | Total, but entirely your responsibility | Automatic, but still deterministic and inspectable (you know *exactly* when cleanup happens) | Automatic, but the *timing* of cleanup is not something you control or always predict |

That last row is worth sitting with as Phase 1 closes: smart pointers aren't just "C++ copying Python's garbage collector." They give you something Python's GC structurally can't: you know, precisely, to the exact line of code, when a `unique_ptr`'s destructor runs — when its scope ends, full stop, no exceptions. Python's GC decides when *it* feels like reclaiming an object. This determinism is exactly what RAII (Lesson 2.5, arriving very soon) generalizes into the single most important idea in the whole C++ side of this curriculum.

---

**Phase 1 core lessons are complete.** You now understand memory the way C++ actually requires — stack vs. heap, pointers, references, manual allocation, raw arrays, a resizable array built entirely by hand, and the smart pointers that finally start automating the tedious part away.

**Checkpoint project next: reimplement your Phase-0 mini-projects using dynamic arrays instead of fixed ones.** After that — **Phase 2: What an "Object" Actually Is**, where OOP begins, not as an abstract new topic, but as the direct, natural answer to a problem you've already personally felt in Lesson 1.6: *"my array-building code needs to remember its size, capacity, and pointer together, and I keep passing three things around everywhere."*
