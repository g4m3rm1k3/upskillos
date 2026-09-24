# Lesson 1.6: Build a Resizable Array From Scratch

*Phase 1 — Memory: The Thing Python Hides From You*
*This is what `list.append()` does under the hood in CPython, conceptually.*

---

## What you're actually building

Every primitive is now in your hands: heap allocation (`new[]`/`delete[]`, Lesson 1.4), contiguous memory and pointer arithmetic (Lesson 1.5), pointers as handles to that memory (Lesson 1.2). This lesson's only job is to combine them into something a raw array structurally cannot be: **a container that grows.**

You will not use `std::vector` anywhere in this lesson. That's deliberate — the entire point is to feel, by hand, the exact mechanism CPython's `list` and C++'s `std::vector` are both built on top of, so that when you use the real thing from Lesson 2 onward, it stops looking like magic.

## The core problem, stated precisely

A raw array's memory is exactly as big as you asked for, forever (Lesson 1.5). "Growing" it is therefore never actually possible in place — there might be something else entirely sitting in the memory right after it. The only real strategy is:

1. Allocate a **new**, bigger block of heap memory.
2. Copy every existing element from the old block into the new one.
3. Free the old block.
4. Remember the new block's address instead.

That's it. That's the whole trick behind every dynamic array in every language you've ever used, including Python's `list`. Let's build it.

## Step 1: the data you need to track

A resizable array needs to remember three things, not just one:

```cpp
int* data;       // pointer to the heap block currently holding the elements
int size;        // how many elements are ACTUALLY in use right now
int capacity;     // how many elements the current heap block COULD hold
```

`size` and `capacity` are different on purpose, and the gap between them is the whole reason this is efficient. If you always allocated *exactly* enough room for the current number of elements, every single `push_back` would require a full reallocate-and-copy — painfully slow. Instead, you allocate more room than you currently need, so most `push_back` calls just drop the new element into already-reserved space and increment `size` — no allocation at all.

## Step 2: starting empty

```cpp
int* data = nullptr;
int size = 0;
int capacity = 0;
```

An empty array owns no heap memory yet (`nullptr`, from Lesson 1.2) and both counts are zero. This is a genuinely valid, safe starting state — nothing to free, nothing to iterate over.

## Step 3: `push_back` — the real logic

```cpp
void pushBack(int*& data, int& size, int& capacity, int value) {
    if (size == capacity) {
        // FULL — must grow before we can add anything
        int newCapacity = (capacity == 0) ? 1 : capacity * 2;
        int* newData = new int[newCapacity];

        for (int i = 0; i < size; i++) {
            newData[i] = data[i];   // copy every existing element over
        }

        delete[] data;    // free the OLD block — Lesson 1.4's discipline, applied
        data = newData;   // this array now owns the NEW block
        capacity = newCapacity;
    }

    data[size] = value;   // there is now guaranteed to be room
    size++;
}
```

Look closely at the parameter list: `int*& data, int& size, int& capacity`. That `int*&` — a *reference to a pointer* — is new, and it's not decoration. `pushBack` needs to be able to change *which* block of memory the caller's `data` pointer refers to (when it grows), not just what's inside the block. A plain `int* data` parameter would receive only a *copy* of the pointer (Lesson 0.4's pass-by-value rule, applied to a pointer this time) — reassigning it inside the function would never be visible to the caller. `int*& data` is a reference *to* that pointer variable itself, so `data = newData;` actually updates the caller's variable. This is a direct, concrete payoff of really understanding Lessons 0.3, 0.4, and 1.3 together, rather than in isolation.

**Doubling the capacity, specifically, is not arbitrary.** This is the detail behind Lesson 3.1's claim that `push_back` is "O(1) amortized" — you'll prove that properly with real Big-O reasoning next lesson. For now, just notice: doubling means reallocations happen less and less often as the array grows (the 1000th element triggers far fewer total copies, relative to array size, than the 10th did), which is *why* growth-by-doubling is the standard strategy, rather than, say, growing by a fixed amount of `+1` each time.

## Step 4: reading, and — importantly — safe reading

```cpp
int get(int* data, int size, int index) {
    if (index < 0 || index >= size) {
        std::cerr << "Index out of bounds!" << std::endl;
        return -1;   // or better: throw an exception (Phase 3+ territory)
    }
    return data[index];
}
```

This is the exact safety Lesson 1.5 told you a raw `arr[100]` does not have. `get()` checks the bound *before* touching memory — the difference between this and `data[index]` directly is the entire reason `std::vector::at()` exists as a slower-but-checked alternative to `std::vector::operator[]`, which stays fast and unchecked, matching raw arrays. You are, right now, recreating that exact design decision from first principles.

## Step 5: cleanup — don't forget this part

```cpp
void freeArray(int* data) {
    delete[] data;
}
```

This has to be called explicitly, by whoever owns the array, when they're done with it — exactly the `new`/`delete` discipline from Lesson 1.4, now applied to a container instead of a single value. Forgetting this call leaks the entire array's memory, same bug, same consequences. (You'll notice this is genuinely annoying to remember correctly, every time, for every array — and that annoyance is the entire motivation for Lesson 2.3's constructors/destructors and Lesson 2.5's RAII, which is coming very soon and will make this problem disappear almost entirely.)

## Try it yourself

**1. Assemble the full program and watch it grow:**

```cpp
#include <iostream>

void pushBack(int*& data, int& size, int& capacity, int value) {
    if (size == capacity) {
        int newCapacity = (capacity == 0) ? 1 : capacity * 2;
        int* newData = new int[newCapacity];
        for (int i = 0; i < size; i++) {
            newData[i] = data[i];
        }
        delete[] data;
        data = newData;
        capacity = newCapacity;
        std::cout << "  [grew to capacity " << capacity << "]" << std::endl;
    }
    data[size] = value;
    size++;
}

int main() {
    int* data = nullptr;
    int size = 0;
    int capacity = 0;

    for (int i = 1; i <= 10; i++) {
        pushBack(data, size, capacity, i * 10);
        std::cout << "pushed " << i * 10
                   << " -> size=" << size << " capacity=" << capacity << std::endl;
    }

    std::cout << "final contents: ";
    for (int i = 0; i < size; i++) {
        std::cout << data[i] << " ";
    }
    std::cout << std::endl;

    delete[] data;
    return 0;
}
```

Watch the output carefully — capacity should jump `0 → 1 → 2 → 4 → 8 → 16`, growing only when `size` actually catches up to `capacity`, not on every push. Count how many times `[grew to capacity...]` actually printed across 10 pushes. It should be far fewer than 10 — that gap is the entire performance story of Lesson 3.1.

**2. Prove the out-of-bounds check actually works, this time:**

```cpp
#include <iostream>

int get(int* data, int size, int index) {
    if (index < 0 || index >= size) {
        std::cerr << "Index out of bounds!" << std::endl;
        return -1;
    }
    return data[index];
}
```

Wire this into your program from step 1 and call `get(data, size, 100)` on a small array. Compare this behavior — a clean, controlled, obvious failure — against Lesson 1.5's raw `arr[100]`, which corrupted memory silently instead. You built the safety net Python had all along.

**3. Trace through, by hand, on paper, what happens to memory addresses across three consecutive `pushBack` calls that trigger growth.** Specifically: does `data`'s address stay the same after a resize, or change? (It changes — every resize allocates a brand new block.) This matters enormously in real code: it means **any pointer or reference you took into the old `data` block before a resize is now dangling** (Lesson 1.4's vocabulary) the instant a `pushBack` triggers growth. This exact gotcha is a real, common bug with `std::vector` too — the professional term for it is "iterator invalidation," and you'll meet it formally once you're using the real STL containers.

## File-I/O checkpoint (Phase 2 preview — optional here)

If you want a head start: write a tiny Python script that generates a text file of 20 random integers, one per line, then write a C++ program that reads them (using `std::ifstream`, a quick preview of Lesson 2's `<fstream>` material) and `pushBack`s each one into your resizable array. You don't need to fully understand file I/O yet to try this — just enough to see your from-scratch container hold real, externally-sourced data instead of hardcoded values.

## What this cost / bought us

| | Raw array (Lesson 1.5) | Your resizable array (this lesson) | `list.append()` (Python) |
|---|---|---|---|
| Can grow | No — fixed forever | Yes — reallocates and copies as needed | Yes — identical strategy, hidden from you |
| Bounds checking | None — undefined behavior | Yours, explicit, in `get()` | Built-in — `IndexError` |
| Memory management | N/A (stack) or manual (heap, Lesson 1.4) | Fully manual — you must call `freeArray` | Fully automatic — garbage collected |
| What just happened | — | You rebuilt, from first principles, the core mechanism behind every dynamic array structure in computer science | — |

You have now, by hand, built the actual algorithm CPython uses internally for `list.append()` — over-allocate, copy-and-grow only when full, amortize the cost across many cheap operations. Nothing about `std::vector` or Python's `list` will look like unexplainable magic again — they're both doing exactly what you just wrote, just with better error handling, generics (Phase 10's templates), and automatic cleanup (Phase 2's destructors) layered on top.

---

**Checkpoint project: reimplement your Phase-0 mini-projects using dynamic arrays instead of fixed ones.** Take the word counter especially — anywhere it used a fixed-size structure, swap in the `pushBack`/`get`/`freeArray` trio you just built, and confirm it still behaves identically.

**After that: Lesson 1.7 — Smart pointers**, where C++ finally automates away the manual `delete[]`/`freeArray` discipline you've been carrying by hand since Lesson 1.4 — closer to Python again, but on C++'s own explicit terms.
