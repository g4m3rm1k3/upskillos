---
title: 4 — STL Containers: The Building Blocks of pandas
track: C++ Data Structures Powering Data Science
trackOrder: 13
runtime: cpp
console: true
---

pandas is famous for its fast groupby, merge, and label-based indexing. Underneath, these operations are powered by classic data structures: dynamic arrays, hash tables, sorted arrays, and iterators. C++ provides all of these through the **Standard Template Library (STL)**.

In this lesson you'll use `std::vector`, `std::unordered_map`, STL iterators, and STL algorithms. You'll see exactly how these map to pandas' internal architecture — and finish by implementing a simple `groupby` from scratch.

## Step 1 — `std::vector<double>`: the workhorse

**This step:** Use `std::vector` as a 1D column of data, analogous to a pandas Series backed by a NumPy array.

A pandas `Series` stores its data in a 1D NumPy array, which is a `std::vector<double>` (or the appropriate dtype) at the C++ level. Here's the full feature tour:

```cpp
#include <vector>
#include <iostream>
#include <numeric>     // std::accumulate, std::iota
#include <algorithm>   // std::sort, std::find

int main() {
    // Create and initialise
    std::vector<double> col = {3.5, 1.2, 4.8, 2.1, 5.0};

    // Append — amortised O(1)
    col.push_back(0.7);

    // Size and random access — O(1)
    std::cout << "size: " << col.size() << "\n";
    std::cout << "col[2]: " << col[2] << "\n";   // 4.8

    // Sort in-place — O(n log n)
    std::sort(col.begin(), col.end());
    std::cout << "sorted: ";
    for (double x : col) std::cout << x << " ";
    std::cout << "\n";

    // Sum with STL algorithm
    double total = std::accumulate(col.begin(), col.end(), 0.0);
    std::cout << "sum: " << total << "\n";

    // Reserve avoids reallocations when size is known
    std::vector<double> preallocated;
    preallocated.reserve(1000);   // pandas does this before filling columns
    std::cout << "reserved capacity: " << preallocated.capacity() << "\n";

    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step1 step1.cpp"
run "./step1" stdout="size: 6"
run "./step1" stdout="col[2]: 4.8"
run "./step1" stdout="sorted:"
run "./step1" stdout="sum:"
run "./step1" stdout="reserved capacity: 1000"
```

> **Python parallel:** `list.append()` is also amortised O(1). `sorted()` calls C's `qsort`. `sum()` iterates. The difference is that `std::vector<double>` stores values contiguously — Python's list stores pointers to heap objects, so iterating it thrashes the cache.

## Step 2 — `std::unordered_map`: hash table (compare to Python `dict`)

**This step:** Use `std::unordered_map` to implement label-to-index mapping — the core of a pandas `Index`.

pandas `Index` maps labels (strings, integers) to integer positions. Lookups must be O(1) on average. That's a hash table:

```cpp
#include <unordered_map>
#include <string>
#include <iostream>
#include <vector>

int main() {
    // Map column names → column index (just like pandas' _item_cache)
    std::unordered_map<std::string, int> col_index;
    std::vector<std::string> columns = {"age", "salary", "score", "tenure"};

    // Build the index — O(n)
    for (int i = 0; i < (int)columns.size(); ++i)
        col_index[columns[i]] = i;

    // Label lookup — O(1) average
    std::cout << "salary is at column " << col_index["salary"] << "\n";  // 1
    std::cout << "score  is at column " << col_index["score"]  << "\n";  // 2

    // Key existence check — O(1)
    if (col_index.count("bonus") == 0)
        std::cout << "'bonus' column not found\n";

    // Iterate over all mappings (unordered!)
    std::cout << "all columns:\n";
    for (const auto& [name, idx] : col_index)
        std::cout << "  " << name << " -> " << idx << "\n";

    // Bucket count (underlying hash table size)
    std::cout << "hash buckets: " << col_index.bucket_count() << "\n";

    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step2 step2.cpp"
run "./step2" stdout="salary is at column 1"
run "./step2" stdout="score  is at column 2"
run "./step2" stdout="'bonus' column not found"
run "./step2" stdout="all columns:"
```

> **Python parallel:** `dict` is exactly a hash table. `col_index["salary"]` in C++ is `d["salary"]` in Python. `count()` is `in` operator. The structured binding `auto& [name, idx]` is like `for name, idx in d.items()`.

pandas uses both `std::unordered_map` (for O(1) lookups) and a sorted array (for range queries and merge/join). The sorted array is covered in Step 5.

## Step 3 — Iterators: the C++ range-for loop

**This step:** Understand iterators and how they power STL algorithms and range-based for loops.

An iterator is an object that points to an element and supports `++`, `*`, and `!=`. Every STL container provides `begin()` and `end()` iterators.

```cpp
#include <vector>
#include <list>
#include <iostream>
#include <algorithm>

int main() {
    std::vector<double> v = {5.0, 3.0, 8.0, 1.0, 9.0, 2.0};

    // Range-based for — uses iterators under the hood
    double total = 0;
    for (double x : v) total += x;
    std::cout << "sum: " << total << "\n";

    // Explicit iterator — useful for algorithms
    auto it = std::min_element(v.begin(), v.end());
    std::cout << "min: " << *it << "\n";            // 1.0
    std::cout << "min index: " << std::distance(v.begin(), it) << "\n";  // 3

    // std::find — O(n) linear search
    auto pos = std::find(v.begin(), v.end(), 8.0);
    if (pos != v.end())
        std::cout << "found 8.0 at index " << std::distance(v.begin(), pos) << "\n";

    // Reverse iteration
    std::cout << "reversed: ";
    for (auto rit = v.rbegin(); rit != v.rend(); ++rit)
        std::cout << *rit << " ";
    std::cout << "\n";

    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step3 step3.cpp"
run "./step3" stdout="sum: 28"
run "./step3" stdout="min: 1"
run "./step3" stdout="found 8.0 at index 2"
run "./step3" stdout="reversed:"
```

> **Python parallel:** Python's `for x in v:` is syntactic sugar for `iter(v)` + `next()`. C++ iterators expose the same protocol — `begin()` is `iter()`, `*it` is `next()`, `it != end()` is the StopIteration guard. pandas' `DataFrame.__iter__` returns an iterator over column names; internally it uses the same `std::vector` iterator pattern.

## Step 4 — `std::sort` and `std::transform`: the STL algorithms

**This step:** Use STL algorithms to transform and sort data — the foundation of pandas' `apply`, `map`, and `sort_values`.

```cpp
#include <vector>
#include <algorithm>
#include <numeric>
#include <iostream>
#include <cmath>

int main() {
    std::vector<double> salaries = {75000, 95000, 60000, 110000, 82000};

    // --- std::sort: like df.sort_values() ---
    std::vector<double> sorted_s = salaries;
    std::sort(sorted_s.begin(), sorted_s.end());
    std::cout << "sorted: ";
    for (double s : sorted_s) std::cout << s << " ";
    std::cout << "\n";

    // --- std::transform: like df['col'].apply(fn) ---
    std::vector<double> log_sal(salaries.size());
    std::transform(salaries.begin(), salaries.end(), log_sal.begin(),
                   [](double x) { return std::log(x); });
    std::cout << "log-salaries: ";
    for (double x : log_sal) std::cout << x << " ";
    std::cout << "\n";

    // --- std::sort with custom comparator: like df.sort_values(ascending=False) ---
    std::sort(sorted_s.begin(), sorted_s.end(), std::greater<double>());
    std::cout << "descending: ";
    for (double s : sorted_s) std::cout << s << " ";
    std::cout << "\n";

    // --- std::accumulate with lambda: like df.agg() ---
    double product = std::accumulate(salaries.begin(), salaries.end(), 1.0,
                                     [](double acc, double x) { return acc * x; });
    std::cout << "product: " << product << "\n";

    // --- std::count_if: like (df['salary'] > 80000).sum() ---
    int over_80k = std::count_if(salaries.begin(), salaries.end(),
                                 [](double x) { return x > 80000; });
    std::cout << "over 80k: " << over_80k << "\n";

    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step4 step4.cpp"
run "./step4" stdout="sorted:"
run "./step4" stdout="log-salaries:"
run "./step4" stdout="descending:"
run "./step4" stdout="over 80k: 3"
```

> **Python parallel:** Lambdas in C++ (`[](double x) { return ...; }`) correspond directly to Python `lambda x: ...`. `std::transform` is `map()`. `std::count_if` is `sum(... for x in v if ...)`. `std::accumulate` is `functools.reduce`. The C++ versions run at full machine speed with no interpreter overhead.

## Step 5 — How pandas' Index is a sorted `std::vector` with a hash map

**This step:** Build a mini two-layer index that mimics how pandas' `Int64Index` is implemented.

pandas' `Index` supports two operations:
1. **Label lookup** — O(1) via a hash map
2. **Range/slice queries** — O(log n) via binary search on a sorted array

```cpp
#include <vector>
#include <unordered_map>
#include <algorithm>
#include <iostream>
#include <stdexcept>

class Int64Index {
    std::vector<long long> sorted_labels;         // for range queries
    std::unordered_map<long long, int> label_to_pos;   // for O(1) lookup

public:
    explicit Int64Index(std::vector<long long> labels) : sorted_labels(labels) {
        std::sort(sorted_labels.begin(), sorted_labels.end());
        for (int i = 0; i < (int)sorted_labels.size(); ++i)
            label_to_pos[sorted_labels[i]] = i;
    }

    // O(1) label lookup
    int get_loc(long long label) const {
        auto it = label_to_pos.find(label);
        if (it == label_to_pos.end())
            throw std::out_of_range("label not found");
        return it->second;
    }

    // O(log n) range query: labels in [lo, hi]
    std::vector<long long> slice(long long lo, long long hi) const {
        auto first = std::lower_bound(sorted_labels.begin(), sorted_labels.end(), lo);
        auto last  = std::upper_bound(sorted_labels.begin(), sorted_labels.end(), hi);
        return {first, last};
    }

    std::size_t size() const { return sorted_labels.size(); }
};

int main() {
    Int64Index idx({42, 7, 100, 55, 3, 88, 21});

    std::cout << "loc(55): " << idx.get_loc(55) << "\n";   // position of 55

    auto range = idx.slice(10, 60);
    std::cout << "labels in [10,60]: ";
    for (long long v : range) std::cout << v << " ";
    std::cout << "\n";   // 21 42 55

    std::cout << "index size: " << idx.size() << "\n";
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step5 step5.cpp"
run "./step5" stdout="labels in [10,60]:"
run "./step5" stdout="21"
run "./step5" stdout="42"
run "./step5" stdout="55"
```

This two-layer design is why `df.loc[label]` is O(1) and `df.loc[10:60]` is O(log n + k). pandas uses the same pattern in `pandas/core/indexes/base.py` backed by a Cython (C++-like) extension.

## Step 6 — Challenge: implement a simple group-by using `std::unordered_map`

**This step:** Implement `groupby(keys, values).sum()` — the heart of `df.groupby('col').sum()`.

Given parallel arrays of string keys and double values, group the values by key and compute the sum per group.

```text
keys:   ["A", "B", "A", "C", "B", "A"]
values: [1.0,  2.0,  3.0,  4.0,  5.0,  6.0]

Expected output (any order):
  A: 10
  B: 7
  C: 4
```

Requirements:
- Use `std::unordered_map<std::string, double>` to accumulate sums
- Print each group key and its total
- Then extend it to also compute group count (so you can derive the mean)

```cpp
#include <unordered_map>
#include <string>
#include <vector>
#include <iostream>

int main() {
    std::vector<std::string> keys   = {"A","B","A","C","B","A"};
    std::vector<double>      values = {1.0, 2.0, 3.0, 4.0, 5.0, 6.0};

    // TODO: compute sum per group using unordered_map
    // TODO: compute count per group
    // TODO: print sum and mean for each group
}
```

```hints
nudge: `std::unordered_map<std::string, double> sums;` starts empty with default value 0.0 on first access.
concept: `sums[keys[i]] += values[i];` accumulates the sum — the key is auto-inserted on first use.
shape: Use a second map `std::unordered_map<std::string, int> counts;` for group counts.
- Mean = `sums[k] / counts[k]` for each key `k`.
```

```check
run "g++ -std=c++17 -O2 -o step6 step6.cpp"
run "./step6" stdout="A: 10"
run "./step6" stdout="B: 7"
run "./step6" stdout="C: 4"
```

You've now implemented the core data structure operations behind pandas: dynamic arrays, hash tables, sorted indexes, STL algorithms, and a simple groupby. The next lesson explains why NumPy loops are 100× faster than Python — it's all about SIMD vectorization.
