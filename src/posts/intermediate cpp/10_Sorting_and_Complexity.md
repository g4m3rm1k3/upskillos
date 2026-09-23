# Module 10: Sorting & Complexity

## Why this module matters

Every trade-off table in this series has leaned on Big-O informally ("O(1)", "O(n)", "amortized O(1)") without a formal definition. This module makes that rigorous, and uses sorting — the classic setting for complexity analysis — to do it, along with two templated sorting algorithms that show how the *same* asymptotic complexity can still mean very different real-world performance.

---

## 1. Big-O, formally

**Big-O describes how an algorithm's cost grows as input size grows, ignoring constant factors and lower-order terms.** Formally: `f(n)` is `O(g(n))` if there exist constants `c` and `n0` such that `f(n) <= c * g(n)` for all `n >= n0`. Informally: "once n is big enough, f(n) doesn't grow faster than some constant multiple of g(n)."

```cpp
// O(1): constant time — doesn't depend on n at all
int first(const std::vector<int>& v) { return v[0]; }

// O(n): linear — cost grows proportionally with n
int sum(const std::vector<int>& v) {
    int total = 0;
    for (int x : v) total += x;   // n iterations
    return total;
}

// O(n^2): quadratic — nested loop over n, each doing n work
bool hasDuplicate(const std::vector<int>& v) {
    for (size_t i = 0; i < v.size(); i++) {
        for (size_t j = i + 1; j < v.size(); j++) {
            if (v[i] == v[j]) return true;
        }
    }
    return false;
}

// O(log n): logarithmic — each step eliminates half the remaining possibilities
bool binarySearch(const std::vector<int>& sorted, int target) {
    int lo = 0, hi = sorted.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (sorted[mid] == target) return true;
        else if (sorted[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}
```

**Why constants get dropped**: an O(n) algorithm that does `3n` operations and an O(n) algorithm that does `n/2` operations are both "O(n)" — because as `n` gets large enough, the *shape* of the growth curve (linear vs. quadratic vs. logarithmic) dominates any fixed multiplier. This is also exactly why Big-O alone doesn't tell you which of two O(n) algorithms is actually faster in practice — that's what benchmarking (section 4) is for, and it's why this module pairs formal complexity with real measurement rather than treating Big-O as the whole story.

### Best, average, and worst case

Complexity can differ by input. Quicksort (section 3) is the textbook example: O(n log n) average case, but O(n²) worst case on already-sorted (or adversarially chosen) input with a naive pivot choice — directly analogous to Module 7's BST degenerating into O(n) on sorted input. This recurring pattern — "average case looks great, worst case on pathological input is much worse" — is worth recognizing as a theme, not a coincidence specific to any one structure.

---

## 2. Mergesort: O(n log n) worst case, guaranteed

```cpp
template <typename T>
void merge(std::vector<T>& arr, int left, int mid, int right) {
    std::vector<T> leftHalf(arr.begin() + left, arr.begin() + mid + 1);
    std::vector<T> rightHalf(arr.begin() + mid + 1, arr.begin() + right + 1);

    size_t i = 0, j = 0;
    int k = left;
    while (i < leftHalf.size() && j < rightHalf.size()) {
        if (leftHalf[i] <= rightHalf[j]) {
            arr[k++] = leftHalf[i++];
        } else {
            arr[k++] = rightHalf[j++];
        }
    }
    while (i < leftHalf.size()) arr[k++] = leftHalf[i++];
    while (j < rightHalf.size()) arr[k++] = rightHalf[j++];
}

template <typename T>
void mergeSort(std::vector<T>& arr, int left, int right) {
    if (left >= right) return;   // base case: 0 or 1 elements, already "sorted"
    int mid = left + (right - left) / 2;
    mergeSort(arr, left, mid);        // recursively sort left half
    mergeSort(arr, mid + 1, right);   // recursively sort right half
    merge(arr, left, mid, right);      // merge the two sorted halves
}
```

```
mergesort([5, 2, 8, 1]):

split:        [5, 2]        [8, 1]
split:      [5]  [2]      [8]  [1]     <- base cases
merge:       [2, 5]         [1, 8]
merge:          [1, 2, 5, 8]
```

This is a **divide-and-conquer** algorithm: split the problem in half, recursively solve each half, combine the results — same recursive shape as Module 7's tree operations, applied to an array instead of a tree structure. The `merge` step is O(n) (it touches every element once), and there are `log n` levels of splitting (each level halves the remaining size, same logic as `binarySearch` above), giving O(n log n) total — and critically, this bound holds for **every** input, not just the average case, because the split point is always the midpoint (no pivot-choice luck involved).

**Trade-off**: mergesort needs O(n) extra memory for the temporary `leftHalf`/`rightHalf` arrays — it's not in-place. It's also **stable** (equal elements keep their original relative order), which matters when you're sorting by one field but want ties broken by original order.

---

## 3. Quicksort: O(n log n) average, O(n²) worst case, but often faster in practice

```cpp
template <typename T>
int partition(std::vector<T>& arr, int low, int high) {
    T pivot = arr[high];   // choosing the LAST element as pivot (simple, but see the trade-off below)
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            std::swap(arr[i], arr[j]);
        }
    }
    std::swap(arr[i + 1], arr[high]);
    return i + 1;   // final resting position of the pivot
}

template <typename T>
void quickSort(std::vector<T>& arr, int low, int high) {
    if (low >= high) return;   // base case
    int pivotIndex = partition(arr, low, high);
    quickSort(arr, low, pivotIndex - 1);    // recursively sort left of pivot
    quickSort(arr, pivotIndex + 1, high);    // recursively sort right of pivot
}
```

Unlike mergesort's "split evenly, then combine," quicksort **partitions around a pivot** first (everything smaller goes left, everything larger goes right, pivot lands in its final sorted position), then recursively sorts each side — the combining step is trivial (there isn't one; once both sides are sorted, the whole array is sorted), but the partitioning step does the real work.

### Why worst case is O(n²)

If the pivot is always the smallest or largest remaining element (which happens with this simple "always pick the last element" strategy on already-sorted or reverse-sorted input), each partition step only shrinks the problem by 1 element instead of roughly halving it — giving `n` levels of recursion instead of `log n`, each doing O(n) partition work, for O(n²) total. **Randomized or median-of-three pivot selection** substantially reduces the odds of hitting this pathological case on real-world data, though it doesn't eliminate the theoretical worst case entirely.

### Trade-off: quicksort vs. mergesort

| | Quicksort | Mergesort |
|---|---|---|
| Worst case | O(n²) | O(n log n), guaranteed |
| Average case | O(n log n) | O(n log n) |
| Extra memory | O(log n) (recursion stack only) — in-place | O(n) (temporary arrays for merging) |
| Stable (preserves order of equal elements)? | No (in this standard implementation) | Yes |
| Real-world performance | Often faster in practice — better cache locality (in-place, sequential access patterns) and lower constant factors | Predictable, but the extra allocations typically make it somewhat slower in practice despite the same asymptotic complexity |
| When to prefer | General-purpose default when worst-case guarantees aren't critical and memory is a concern | When you need guaranteed worst-case performance, stability, or you're sorting a linked structure (mergesort adapts well; quicksort's partitioning does not) |

This table is the most concrete instance in the whole series of "identical Big-O doesn't mean identical real-world performance" — which is exactly why section 4 has you benchmark both directly rather than trusting the asymptotic analysis alone.

---

## 4. Benchmarking: measuring what Big-O can't tell you

```cpp
#include <chrono>
#include <algorithm>
#include <random>

template <typename SortFunc>
double timeSort(std::vector<int> data, SortFunc sortFn) {
    auto start = std::chrono::high_resolution_clock::now();
    sortFn(data);
    auto end = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(end - start).count();
}
```

Use this to time `quickSort`, `mergeSort`, and `std::sort` (the standard library's own, highly-optimized implementation — worth comparing against as a reference point) on the same random data, and separately on already-sorted data (to see quicksort's worst case materialize) and reverse-sorted data.

---

## Practice Problems

1. **Implement and test both**: Build `mergeSort` and `quickSort`, test each on a small hand-verifiable array (e.g., `[5, 2, 8, 1, 9, 3]`), and confirm both produce identical sorted output.

2. **Trigger quicksort's worst case**: Sort an already-sorted array of size ~5,000-10,000 with your `quickSort` (last-element pivot) and time it. Then sort the same-size *randomly shuffled* array and time that. You should see a dramatic difference — this is section 3's O(n²) vs O(n log n) claim, made measurable.

3. **Fix the pivot strategy**: Modify `partition` to pick a **random** element as the pivot (swap it into the `high` position first, then proceed as before) instead of always using the last element. Re-run problem 2's already-sorted-array test and confirm the pathological slowdown disappears.

4. **Stability test**: Create a `struct Person { std::string name; int age; }` with a comparison based only on `age`, and a vector with several people sharing the same age but different names, in a specific initial order. Sort with `mergeSort` and confirm same-age people keep their original relative order. Do the same with `quickSort` and observe that order is not necessarily preserved.

5. **Full benchmark comparison**: Using the `timeSort` helper, benchmark `quickSort` (randomized pivot), `mergeSort`, and `std::sort` on the same large random dataset (100,000+ elements). Record the timings and note how much (or little) `std::sort` outperforms your implementations — this is a good moment to appreciate what a heavily-optimized standard library implementation buys you beyond just "correct Big-O."

6. **Complexity classification exercise**: Go back through every data structure operation from Modules 3-9 (DynamicArray push_back, LinkedList insert, BST search, HashMap insert, BFS/DFS) and write out its Big-O complexity from memory, then check it against what each module's trade-off tables actually said. This is a deliberate review exercise tying the whole series' complexity claims together in one pass.

---

**Next: Module 11 — Capstone**, where you'll combine at least three structures from this series into one small project, bringing OOP design, memory management, and DSA choices together in something closer to real code than any single module's isolated build. Say "next module" when ready.
