# Lesson 3.2: Time vs. Space Tradeoffs

*Phase 3 — Complexity, and Your First Real Comparison*

---

## The observation from last lesson, generalized

Lesson 3.1 ended on a specific fact: `MyVector`'s doubling strategy can leave `capacity` up to twice as large as `size`, at any given moment. You spent extra memory — real, measurable bytes sitting unused — specifically to keep `pushBack` fast. That single fact is an instance of a pattern that shows up constantly for the rest of this curriculum, worth naming on its own: **you can very often make something faster by using more memory, and smaller by accepting more work.** Neither direction is free. This lesson is about learning to notice the trade explicitly, rather than absorbing it accidentally.

## The trade, made concrete with something new

Here's a clean example that isn't just a repeat of Lesson 3.1. Suppose you need to check, repeatedly, whether a given number exists somewhere in a large `MyVector`.

**Low memory, more time — linear search:**

```cpp
bool contains(const MyVector& vec, int target) {
    for (int i = 0; i < vec.getSize(); i++) {
        if (vec.get(i) == target) return true;
    }
    return false;
}
```

No extra memory beyond the vector itself — O(1) additional space. But every single call is O(n): in the worst case, you check every element before concluding the target isn't there. Call this a thousand times against a 10,000-element vector, and you've done up to 10 million comparisons total.

**More memory, less time — a lookup structure built once:**

```cpp
#include <unordered_set>

std::unordered_set<int> buildLookup(const MyVector& vec) {
    std::unordered_set<int> lookup;
    for (int i = 0; i < vec.getSize(); i++) {
        lookup.insert(vec.get(i));
    }
    return lookup;
}

bool contains(const std::unordered_set<int>& lookup, int target) {
    return lookup.count(target) > 0;
}
```

(`std::unordered_set` is a hash-based container — full mechanics in Phase 8; for now, just trust that `.count()` is roughly O(1).) Building `lookup` costs O(n) once, and roughly doubles your memory footprint (you're now storing the data twice, once in `vec`, once in `lookup`). But every subsequent `contains()` call is O(1) instead of O(n). A thousand lookups against the same 10,000-element dataset now costs roughly 10,000 (to build) + 1,000 (to query) ≈ 11,000 total operations, instead of the earlier approach's 10 million. You paid memory, once, up front, to buy a dramatically cheaper *per-call* cost, repeated many times.

## The general shape of this decision

| Question | Favors |
|---|---|
| Will you query this data many times, or just once? | Many times → build the extra structure (spend memory, save time). Once → don't bother (linear scan is already the cheapest correct approach for a single query). |
| Is memory tight (embedded systems, huge datasets that barely fit in RAM)? | Favor the low-memory, higher-time approach — `MyVector`'s doubling factor itself is even tunable down (grow by 1.5× instead of 2× — a real technique some real-world `vector` implementations use, trading slightly more frequent resizes for a lower worst-case memory overhead). |
| Is speed the bottleneck (a hot loop running millions of times)? | Favor spending memory — precomputed lookup tables, caching, extra indexing structures. |

None of these are universal rules — they're questions you ask about your *specific* situation. This is the actual skill Phase 3's whole comparison exercise (next lesson) and, further out, every one of this curriculum's "implement it 2-4 ways and compare" exercises are training: not memorizing which approach is "best," but developing the judgment to ask the right questions about a given problem's actual constraints.

## Where you'll see this again

This exact tension recurs, by name, throughout the rest of the curriculum — worth flagging now so you recognize it later rather than encountering each instance as unrelated:

- **Phase 5**: an array gives O(1) access but O(n) insertion at the front; a linked list flips this — O(n) access, O(1) insertion at the front. Neither is "better" — it's the same time/space-flavored tradeoff, applied to *where* the cost lands rather than *how much total* memory is used.
- **Phase 8**: hash maps trade memory (the underlying array, often sized larger than strictly needed — the "load factor" you'll meet in Lesson 8.4) for average O(1) lookup, versus a sorted array's O(log n) lookup using tighter memory.
- **Phase 9**: an adjacency matrix (O(V²) memory, O(1) "are these two nodes connected" checks) versus an adjacency list (O(V+E) memory, usually less, but O(degree) to check a connection) — the exact same shape of question, applied to graphs.
- **Phase 12**: caching a database query's result in memory (spend RAM, save repeated round-trips) versus re-querying every time (spend time, save RAM) — the same idea, now at the scale of a real application.

## Try it yourself

**1. Measure the contains() tradeoff directly.** Build a `MyVector` with 10,000 random integers, then time 1,000 `contains()` calls using the linear-scan version versus the `unordered_set`-based version (include the one-time cost of `buildLookup` in your total for the second approach, to keep the comparison fair):

```cpp
#include <chrono>

auto start = std::chrono::high_resolution_clock::now();
// ... your 1,000 contains() calls ...
auto end = std::chrono::high_resolution_clock::now();
std::cout << std::chrono::duration_cast<std::chrono::microseconds>(end - start).count()
          << " microseconds" << std::endl;
```

Run both, print both times, and confirm the gap matches the rough shape predicted above.

**2. Find the crossover point.** Repeat the measurement above, but vary the *number of queries* — 1 query, 10, 100, 1,000, 10,000 — for a fixed dataset size, timing both approaches at each point. At very low query counts, the linear-scan approach should actually win (you never recoup the O(n) cost of building the lookup structure for just one or two queries). Find, roughly, at what query count the `unordered_set` approach starts winning. This crossover point is a genuinely useful piece of engineering judgment, and now you've measured one instance of it yourself instead of just being told "hash maps are faster."

**3. Revisit `MyVector`'s growth factor.** Change `capacity * 2` to `capacity + capacity / 2` (a 1.5× growth rate instead of 2×) and rerun Lesson 3.1's reallocation-counting exercise for a million pushes. Confirm reallocations happen *more often* (more time cost) but the maximum wasted capacity at any point is smaller (less memory cost) — a direct, hands-on feel for tuning this exact tradeoff yourself, rather than treating "double it" as a fixed law.

## What this cost / bought us

There's no single table here — the entire lesson *is* the table, situationally, every time you build something. The one fixed takeaway: **whenever an operation gets faster "for free," ask what got spent to buy that speed — memory is the most common answer, but it's sometimes precomputation time, code complexity, or flexibility instead.** Nothing in real system design is free; Big-O tells you the shape of a cost, and this lesson is about noticing *which* resource is paying it.

---

**Next up: Lesson 3.3 — the comparison exercise.** `MyVector` vs. `std::vector` vs. a Python `list`, benchmarked doing the same task, side by side, with real numbers. This is where Phase 3 pays off directly: you'll finally see, measured rather than asserted, exactly what the standard library bought you over everything you built by hand.
