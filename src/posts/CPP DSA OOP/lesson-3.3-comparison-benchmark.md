# Lesson 3.3: `MyVector` vs. `std::vector` vs. Python `list`

*Phase 3 — Complexity, and Your First Real Comparison*
*What did the standard library buy you?*

---

## Setting up a fair fight

All three of these are, underneath, doing roughly the same thing you learned in Lesson 1.6: a heap-allocated, contiguous block that doubles (or grows by some factor) when full. Same core algorithm, same Big-O — Lesson 3.1's O(1) amortized `push_back` applies equally to all three. So this benchmark isn't really testing "which algorithm is faster" — it's testing what layers of engineering the standard library and CPython have added *on top of* the algorithm you already understand completely, that your hand-rolled version doesn't have. Going in, predict: do you expect `MyVector` to win, lose, or tie against `std::vector`? Write your prediction down before running anything — this lesson is much more valuable if you have a real guess to be surprised or confirmed by.

## The task, identical across all three

Push one million integers, then sum them:

**C++, your `MyVector`:**

```cpp
#include <iostream>
#include <chrono>

int main() {
    auto start = std::chrono::high_resolution_clock::now();

    MyVector vec;
    for (int i = 0; i < 1'000'000; i++) {
        vec.pushBack(i);
    }

    long long sum = 0;
    for (int i = 0; i < vec.getSize(); i++) {
        sum += vec[i];
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    std::cout << "MyVector: sum=" << sum << " time=" << ms << "ms" << std::endl;
    return 0;
}
```

**C++, `std::vector`:**

```cpp
#include <iostream>
#include <vector>
#include <chrono>

int main() {
    auto start = std::chrono::high_resolution_clock::now();

    std::vector<int> vec;
    for (int i = 0; i < 1'000'000; i++) {
        vec.push_back(i);
    }

    long long sum = 0;
    for (int i = 0; i < vec.size(); i++) {
        sum += vec[i];
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    std::cout << "std::vector: sum=" << sum << " time=" << ms << "ms" << std::endl;
    return 0;
}
```

**Python:**

```python
import time

start = time.perf_counter()

vec = []
for i in range(1_000_000):
    vec.append(i)

total = sum(vec)

end = time.perf_counter()
print(f"Python list: sum={total} time={(end - start) * 1000:.1f}ms")
```

Compile the two C++ versions with optimizations enabled — `g++ -O2 file.cpp -o file` — this matters enormously and is part of the lesson (more below). Run all three, several times each (the first run of anything is often slower due to OS-level effects — take the best of 3-5 runs for a fairer comparison), and record the numbers.

## What you should expect to find, and why

**`std::vector` will very likely beat `MyVector`**, sometimes substantially. Here's what's actually different, given that the core algorithm is identical:

- **`-O2` optimization matters enormously, and matters *differently* for the two.** `std::vector`'s implementation has been battle-tested and shaped, over decades, specifically to be friendly to compiler optimizations — inlining cleanly, avoiding patterns that block vectorized instructions. Your `MyVector`, written fresh this phase, may not have been written with those optimizer-friendliness patterns in mind. Try compiling *without* `-O2` (`g++ file.cpp -o file`, no flag) and rerun — the gap will likely shrink noticeably, because unoptimized `std::vector` loses a lot of its usual advantage.
- **`std::vector<int>` may use a different growth factor than your `capacity * 2`.** Different standard library implementations (libstdc++, libc++, MSVC's STL) use different exact growth factors — some use 2×, some use ~1.5×. This directly connects to Lesson 3.2's tradeoff: a different growth factor means a different balance of reallocation frequency versus wasted memory, which shows up as a real, measurable timing difference.
- **Bounds-checking and other small overheads exist in different places.** Your `MyVector::operator[]` has zero bounds checking, identical to `std::vector::operator[]` — so this specific difference shouldn't matter here. But if you swap in `.get()`/`.at()` instead, you'll feel the checked-access cost directly, on both sides, roughly equally.

**Python will lose to both C++ versions, likely by a wide margin** — often 10-50× slower for this kind of raw numeric loop, sometimes more. This isn't evidence that Python is a "bad" language — it's the direct, measured consequence of everything you learned starting in Lesson 0.1: Python's interpreter mediates every single operation, every `append()` call and every `+` involves the interpreter checking types and dispatching dynamically (Lesson 0.2), while your compiled C++ binary has none of that overhead at runtime at all. This is the single clearest, most concrete payoff of this entire curriculum's opening lessons — you're watching, in milliseconds, the exact cost of the interpreted-vs-compiled and dynamic-vs-static distinctions from Phase 0.

## Isolate exactly where the cost lives

Break the benchmark into its two halves — building the vector, and summing it — and time them separately, in all three languages:

```cpp
auto buildStart = std::chrono::high_resolution_clock::now();
// ... build loop only ...
auto buildEnd = std::chrono::high_resolution_clock::now();

auto sumStart = std::chrono::high_resolution_clock::now();
// ... sum loop only ...
auto sumEnd = std::chrono::high_resolution_clock::now();
```

Compare the *ratio* between build time and sum time across all three. In C++, summing should be noticeably faster than building (no allocation involved at all, per Lesson 3.1 — it's a pure O(n) scan with zero reallocation cost). In Python, the gap between the two phases will likely be smaller, proportionally — Python's per-operation interpreter overhead applies fairly evenly to both the `append()` calls and the `sum()` built-in's internal iteration, since neither one gets to skip the interpreter the way compiled C++ skips it entirely.

## Try it yourself

**1. Run the full benchmark exactly as given above, best-of-5 runs each, with `-O2`.** Record all three times in a small table. Compute the speedup ratios: C++/`std::vector` vs. Python, and `MyVector` vs. `std::vector`.

**2. Rerun the C++ versions *without* `-O2`** and compare against your optimized numbers. This single flag is often the single biggest lever you'll pull in this entire curriculum for real-world C++ performance — internalizing that "always compile with optimizations on for anything you're benchmarking or shipping" is a genuinely important professional habit, not a minor detail.

**3. Swap `MyVector`'s growth factor to 1.5× (from Lesson 3.2's exercise) and rerun the build-phase benchmark.** Does it get closer to or further from `std::vector`'s timing? This connects Lesson 3.2's tradeoff directly to something you can now measure rather than just reason about abstractly.

**4. A genuinely open-ended question worth sitting with, not answering immediately: was building `MyVector` "worth it," given that `std::vector` is faster and required zero lines of code from you?** Write down your own honest answer before reading further. There's a real answer coming, but the value of forming your own first is worth protecting.

## The actual answer

Building `MyVector` was never about beating `std::vector` — that outcome was never realistically on the table, and wasn't the goal. It was about making `std::vector` stop being a black box. Every single number in this benchmark now has a *mechanism* attached to it in your head: you know *why* `push_back` occasionally spikes (Lesson 3.1's resize), you know *why* memory usage isn't perfectly tight (Lesson 3.2's growth-factor tradeoff), you know *why* deep-copying a vector is expensive and moving one isn't (Lesson 2.7), and you know, precisely, *why* Python's version trails both C++ versions by an order of magnitude (Phase 0, in its entirety). That mechanistic understanding is the actual deliverable of Phase 1 and Phase 2 — this benchmark is just the first place it pays off in a way you can literally watch a stopwatch confirm.

## What this cost / bought us

| | `MyVector` (yours) | `std::vector` | Python `list` |
|---|---|---|---|
| Underlying algorithm | Same amortized-O(1) doubling strategy | Same core strategy, more heavily tuned | Same core strategy, hidden inside the interpreter |
| Raw speed (this benchmark) | Good, likely slightly behind `std::vector` | Fastest — decades of tuning, compiler-friendly patterns | Slowest by a wide margin — interpreter overhead on every operation |
| What you had to write | Every line, by hand | Zero lines — `#include <vector>` | Zero lines — built in |
| What you now understand | Everything, mechanistically, because you built it | Everything, because it's the same mechanism you already built, just polished | The *concept*, though not the C-level implementation details CPython itself is written in |

Phase 3 is done. You now have the actual vocabulary — O(1), O(n), amortized, time/space tradeoffs — to reason about every data structure for the rest of this curriculum, and you've watched that vocabulary predict real, measured numbers rather than staying theoretical.

---

**Next up: Phase 4 — Inheritance & Polymorphism, Taught via a Real Need.** New territory: you're about to need several *different kinds* of objects that a single piece of code can treat uniformly — the first genuinely new OOP concept since Phase 2, and the direct motivation for your first design pattern.
