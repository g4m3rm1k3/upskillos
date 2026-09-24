# Lesson 1.1: The Stack vs. the Heap

*Phase 1 — Memory: The Thing Python Hides From You*
*Why Python never made you think about this*

---

## The Python anchor

You've written years of Python and never once had to ask: "where, physically, does this value live in memory?" You've never had to think about *when* it gets cleaned up, either — you create a list, use it, let it go out of scope, and somewhere behind the scenes, Python's garbage collector notices nobody needs it anymore and reclaims the memory. That whole machine has been running under every line of Python you've ever written, invisibly.

This lesson pulls back the curtain. Not because C++ is unnecessarily complicated, but because C++ hands *you* the job Python's runtime was quietly doing for you — and to do that job, you first need to know there are actually **two distinct regions of memory**, with completely different rules, and your program is using both, all the time.

## Two regions, two sets of rules

**The stack** is a region of memory that works like — literally, mechanically — a stack of plates. Every time a function is called, a new "frame" is pushed on top, holding that function's local variables. When the function returns, its frame is popped off and everything in it is gone, instantly, automatically. No cleanup code, no garbage collector, no decision to make — it's a side effect of the function returning.

**The heap** is a large, unstructured pool of memory that doesn't clean itself up on any schedule at all. Something you put on the heap stays there until *you* explicitly say "I'm done with this" (`delete`, coming in Lesson 1.4) — or, if you forget to say that, it stays there forever, wasting memory, for the entire remaining life of your program. That's called a **memory leak**, and it's a real bug class that simply cannot happen in Python, because Python never gives you this kind of memory to manage in the first place.

```cpp
#include <iostream>

void doWork() {
    int localValue = 42;         // lives on the STACK
    std::cout << &localValue << std::endl;
}   // <- the instant doWork() returns, localValue is GONE. Automatically.

int main() {
    doWork();
    doWork();   // localValue's address will very likely repeat here —
                // same stack slot, reused, because the previous frame was
                // popped and this is a brand new one landing in the same spot
    return 0;
}
```

Run this twice in a row and watch the printed addresses — on most systems they'll be identical or very close, because the stack frame from the first call was popped clean off before the second call pushed a new one into the exact same spot.

## Where the heap comes in

Every local variable you've written so far — every `int x`, every `Point p` — has lived on the stack, cleaned up automatically the instant its function returns. That's been fine for everything up to now because those values had short, predictable lifetimes tied exactly to a function call.

But sometimes you need memory that *outlives* the function that created it — data you want to still exist after the function that built it has already returned. The stack fundamentally cannot do that; its whole mechanism is "pop everything the instant this frame ends." For that, you need the heap — memory that exists independently of any function's lifetime, that you request explicitly and (crucially) must release explicitly.

You'll get the actual mechanism for requesting heap memory — `new` and `delete` — properly in Lesson 1.4. This lesson's job is just to make the *distinction* concrete before you touch that keyword at all, because every bug in Lessons 1.4 through 1.7 traces back to confusing which region a piece of memory lives in.

## A concrete comparison

| | Stack | Heap |
|---|---|---|
| Allocated | Automatically, when a scope begins | Explicitly, by you, with `new` (Lesson 1.4) |
| Freed | Automatically, when the scope ends | Explicitly, by you, with `delete` — or **never**, if you forget |
| Speed | Extremely fast — just moving a pointer | Slower — the system has to find and manage free space |
| Size limit | Small, fixed (a few MB, typically) — deep recursion can exhaust it (**"stack overflow"** — yes, that's where the website got its name) | Large — limited mostly by your system's actual RAM |
| Lifetime | Tied exactly to the scope it was declared in | Independent — lives until *you* say it's done |
| What Python does | Handles this identically, invisibly, always | Handles this too — but with a garbage collector doing the "remember to clean up" part *for* you |

That last row is the whole point of this lesson: **Python has a stack and a heap too.** Every language does — this is how computers work, not a C++-specific design choice. What's different is that Python's heap has a garbage collector constantly watching it, automatically freeing anything nothing points to anymore. C++ has no such watcher by default. When you allocate heap memory in C++, tracking its lifetime and freeing it is entirely your job — that responsibility is the subject of the rest of Phase 1, and it's exactly the gap that smart pointers (Lesson 1.7) exist to close, once you understand why the gap is there in the first place.

## Try it yourself

**1. Watch the stack reuse memory, live:**

```cpp
#include <iostream>

void showAddress(const std::string& label) {
    int x;
    std::cout << label << ": " << &x << std::endl;
}

int main() {
    showAddress("call 1");
    showAddress("call 2");
    showAddress("call 3");
    return 0;
}
```

Compile and run this. The three addresses will very likely be identical — same stack slot, reused every time, because each call's frame is fully popped before the next one is pushed.

**2. Cause an actual stack overflow, on purpose, safely:**

```cpp
#include <iostream>

void recurseForever(int depth) {
    std::cout << depth << std::endl;
    recurseForever(depth + 1);   // no base case — deliberate!
}

int main() {
    recurseForever(0);
    return 0;
}
```

Run it and watch it print rapidly increasing numbers before crashing with a **segmentation fault** or **stack overflow**. This is the stack's fixed-size limit from the table above, made real: every recursive call pushes another frame, and eventually there's no room left. (Python has this same limit conceptually — try an infinite recursive function in Python and you'll hit `RecursionError: maximum recursion depth exceeded` — but Python's limit is a *counted* safety net, whereas C++'s stack overflow is the actual hardware memory running out, which is why C++ crashes outright instead of raising a catchable error.)

**3. A thought experiment to carry into Lesson 1.4.** Imagine a function that builds a large amount of data and needs to hand it back to whoever called it, to be used long after this function has returned:

```cpp
int* buildData() {
    int localArray[1000];   // lives on the STACK
    // ... fill localArray with values ...
    return localArray;   // DO NOT DO THIS — try it, read the compiler warning
}
```

Try compiling this. Most compilers will warn you (some refuse outright) that you're returning the address of a local variable — because the instant `buildData()` returns, `localArray`'s stack frame is popped, and that memory is gone, potentially already overwritten by the very next function call. This exact problem — "I need memory that survives past the function that created it" — is precisely why the heap exists, and precisely what `new` (next lesson but one) solves.

## What this cost / bought us

| | What Python does for you | What C++ requires of you |
|---|---|---|
| Stack usage | Automatic, invisible — same as C++ under the hood | Automatic, invisible — identical behavior, you just now *know* it's happening |
| Heap usage | Automatic — garbage collector frees it whenever nothing references it anymore | Manual — you must track lifetime and free it yourself (Lesson 1.4 onward) |
| Cost of getting it wrong | Rare — GC bugs exist but are uncommon | Common — forgetting to free heap memory is a real, everyday bug class (memory leaks) |
| Cost of getting it right | You never had to think about it | Faster, more predictable memory behavior, and zero garbage-collector pauses — a real advantage in performance-sensitive code |

This lesson introduced no new syntax at all — on purpose. Before you touch a single new keyword, you need this mental map: two regions, automatic vs. manual, fast-and-small vs. slow-and-large. Every lesson for the rest of Phase 1 is really just teaching you the *tools* for working with the heap responsibly, now that you know why it needs responsible handling in the first place.

---

**Next up: Lesson 1.2 — Pointers: an address is just a number.** You've already been staring at addresses all through this lesson's examples (`&x`) without a name for what they really are — time to make that precise.
