# Lesson 3.1: Big-O, Explained Through the Array You Already Built

*Phase 3 — Complexity, and Your First Real Comparison*
*`push_back` is O(1) amortized — you'll see why, because you wrote the resize logic yourself.*

---

## Why this lesson isn't abstract for you

Most people meet Big-O as a table of symbols to memorize before they've built anything worth measuring. You're meeting it after building `MyVector` completely by hand — every allocation, every copy, every resize was code you personally wrote and ran. This lesson just gives you the vocabulary for describing what you already watched happen with your own eyes back in Lesson 1.6's growth-tracking exercise.

## What Big-O actually describes

Big-O describes how the *cost* of an operation grows as the *size of the input* grows — not an exact time in seconds (that depends on your specific CPU, compiler, and a hundred other things), but the *shape* of the growth. Does doubling your data double the work? Square it? Leave it unchanged? That shape is what Big-O captures, and nothing more.

## O(1) — constant time

An operation is O(1) if it takes roughly the same amount of work regardless of how much data you have. Look at `MyVector::get()`:

```cpp
int get(int index) const {
    if (index < 0 || index >= size) { /* ... */ }
    return data[index];
}
```

Whether `data` holds 10 elements or 10 million, `data[index]` does the exact same thing: one address calculation (`address_of(data) + index * sizeof(int)`, from Lesson 1.5), one memory read. No loop, no scaling. This is O(1) — and it's O(1) specifically *because* of the contiguous-memory guarantee from Lesson 1.5. If your data were scattered randomly across memory instead, you'd have no way to jump straight to element `i` without walking through everything first — which is exactly the shape of the tradeoff Phase 5's linked lists will force you to confront directly.

## O(n) — linear time

An operation is O(n) if the work scales directly, proportionally, with the input size `n`. The statistics-computing loop from your Phase 2 project:

```cpp
for (int i = 0; i < numbers.getSize(); i++) {
    int v = numbers[i];
    total += v;
    // ...
}
```

Double the numbers in the file, and this loop does roughly double the work — visit every element exactly once, no more, no less. This is the single most common complexity class you'll write, and it's usually the best you can do for any task that genuinely requires looking at every piece of data at least once (you can't compute a sum without reading every number).

## Now the real question: what is `push_back`?

Here's where it gets interesting, because the honest answer isn't simply "O(1)" or "O(n)" — it's both, depending on which specific call you're looking at:

```cpp
void pushBack(int value) {
    if (size == capacity) {
        // THIS branch is O(n) — allocates new memory AND copies every existing element
        int newCapacity = (capacity == 0) ? 1 : capacity * 2;
        int* newData = new int[newCapacity];
        for (int i = 0; i < size; i++) {
            newData[i] = data[i];
        }
        delete[] data;
        data = newData;
        capacity = newCapacity;
    }
    // THIS part is always O(1) — one write, one increment
    data[size] = value;
    size++;
}
```

Most calls to `pushBack` hit the fast path — `size != capacity`, so it's a single write and an increment, genuinely O(1). But every so often — exactly when the array is full — a call triggers the slow path, copying every existing element into a new block, which is O(n) for that *one specific call*. So which is it?

## Amortized analysis — the actual answer

The honest, precise answer is: **`push_back` is O(1) *amortized*.** "Amortized" means: if you add up the total cost of `n` calls to `push_back` and divide by `n`, the *average* cost per call is O(1) — even though individual calls occasionally spike to O(n). This isn't hand-waving; you can prove it, and doubling is the specific reason the proof works.

Trace through the capacities from your own Lesson 1.6 experiment: `0 → 1 → 2 → 4 → 8 → 16 → 32 → ...`. Each resize copies the *current* size worth of elements — so the total copying work across all resizes up to `n` elements is roughly `1 + 2 + 4 + 8 + ... + n`, a sum that, because it's doubling, totals to **less than `2n`** — a well-known property of geometric series. Spread that `2n` worth of total copying across `n` total `push_back` calls, and you get roughly 2 units of "extra" work per call, on average — a constant, not something that grows with `n`. That's the entire proof, and it's exactly why doubling was the right growth strategy back in Lesson 1.6, not an arbitrary choice.

**Contrast this against growing by a fixed amount instead** (say, always adding room for exactly 1 more element, every single `push_back`):

```cpp
// A DELIBERATELY BAD growth strategy, for comparison
int newCapacity = capacity + 1;   // instead of capacity * 2
```

With this strategy, *every single* `push_back` triggers a full reallocation and copy — turning what should be O(1) amortized into genuinely O(n) for every call, meaning `n` total `push_back` calls cost O(n²) overall instead of O(n). This is not a theoretical concern — it's a real, common beginner mistake, and now you have the tool to actually prove why it's wrong instead of just being told to avoid it.

## Space complexity — the other half of Big-O

Big-O also describes memory, not just time. `MyVector` holding `n` elements uses O(n) space for the data itself — that part's unavoidable, you need at least `n` integers' worth of memory to hold `n` integers. But because of the doubling strategy, `capacity` can be up to roughly 2× `size` at any given moment (right after the array has just doubled but before it's filled back up) — meaning `MyVector` can use up to **twice** the strictly-necessary memory at any instant. This is still O(n) overall (constants don't change the complexity *class*), but it's a real, measurable cost — the deliberate trade Lesson 3.2 examines directly: you're spending some memory to buy amortized-O(1) time.

## Try it yourself

**1. Instrument your `MyVector`'s `pushBack` to count reallocations, and confirm the amortized claim with real numbers:**

```cpp
int reallocCount = 0;

void pushBack(int value) {
    if (size == capacity) {
        reallocCount++;
        // ... existing resize logic ...
    }
    data[size] = value;
    size++;
}
```

Push 1,000,000 elements and print `reallocCount` at the end. It should be roughly 20 (since 2^20 is just over a million) — a tiny number relative to a million total calls, direct, measured proof that the "expensive" resizes are vanishingly rare compared to the cheap O(1) pushes.

**2. Build the "bad" version — growing by `capacity + 1` instead of doubling — and measure real wall-clock time pushing 100,000 elements with each strategy:**

```cpp
#include <chrono>

auto start = std::chrono::high_resolution_clock::now();
// ... push 100,000 elements ...
auto end = std::chrono::high_resolution_clock::now();
std::cout << "Time: "
          << std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count()
          << "ms" << std::endl;
```

Run both versions. The gap should be dramatic — likely orders of magnitude — turning "doubling matters" from something you're told into something you measured yourself.

**3. Classify each of these by Big-O, without running any code, purely by reading:**

```cpp
// (a)
int first = numbers[0];

// (b)
for (int i = 0; i < numbers.getSize(); i++) { std::cout << numbers[i]; }

// (c)
for (int i = 0; i < numbers.getSize(); i++) {
    for (int j = 0; j < numbers.getSize(); j++) {
        std::cout << numbers[i] + numbers[j];
    }
}
```

(Answers: (a) O(1) — one indexed access. (b) O(n) — one pass. (c) O(n²) — a nested loop, each iterating the full size.)

## What this cost / bought us

| Operation | Complexity | Why |
|---|---|---|
| `get(i)` / `operator[]` | O(1) | Direct address arithmetic — Lesson 1.5's contiguity |
| `pushBack` (typical call) | O(1) | Room already exists — one write, one increment |
| `pushBack` (triggers resize) | O(n) | Must copy every existing element |
| `pushBack` (amortized, over many calls) | **O(1)** | Doubling spreads the O(n) resizes thin enough that the average stays constant |
| Linear scan (sum, min, max, search) | O(n) | Must visit every element at least once |
| Nested loop over the array | O(n²) | Every element paired with every other element |

The core idea worth carrying forward: **Big-O is about counting how work scales, not about counting seconds** — and "amortized" is what lets a data structure be honestly described as fast overall even when some individual operations are occasionally slow. You'll use exactly this kind of reasoning for the rest of the curriculum — Phase 5's linked lists trade `MyVector`'s O(1) access for O(1) insertion at the front (something `MyVector` is O(n) at); Phase 7's trees trade both for O(log n) search. Every data structure from here forward is a different answer to the same underlying question this lesson just gave you the vocabulary to ask.

---

**Next up: Lesson 3.2 — Time vs. space tradeoffs.** A short lesson connecting this one's "capacity can be up to 2× size" observation into a general principle you'll see recur throughout the rest of the curriculum.
