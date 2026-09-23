# Module 8: Hashing — Building a `HashMap` from Scratch

## Why this module matters

This is where Module 2's bitwise work stops being a side skill and becomes load-bearing: a good hash function is built almost entirely out of bit operations, and understanding *why* those operations produce good distribution is what separates "I called `std::hash`" from actually understanding what a hash table is doing.

---

## 1. The core idea

A hash table gives average O(1) insert/lookup/delete by converting a key into an array index via a **hash function**, then storing the value at that index.

```
key "apple"  --> hash function --> some large number --> % table_size --> index 3
key "banana" --> hash function --> some large number --> % table_size --> index 7

table:  [0] [1] [2] [3:apple] [4] [5] [6] [7:banana] [8] ...
```

The magic is that computing the index is O(1) (not searching, not comparing against every existing key) — a good hash function distributes keys roughly evenly across the table, so most slots hold zero or one entries, and lookup is "compute the hash, go straight to that slot."

---

## 2. Writing a hash function

A hash function must satisfy one hard rule and one soft goal:

- **Hard rule**: equal keys must always produce equal hashes (otherwise you could never find a key you'd already inserted).
- **Soft goal**: different keys should, as much as possible, produce different hashes, spread evenly across the output range (this is what avoids collisions — see section 3).

### Hashing an integer

```cpp
// A simple but genuinely reasonable integer hash (loosely based on well-known
// "mix" functions used in real hash table implementations)
uint32_t hashInt(int key) {
    uint32_t x = static_cast<uint32_t>(key);
    x ^= x >> 16;          // XOR-fold the high bits down into the low bits
    x *= 0x85ebca6b;        // multiply by a large odd constant to spread bits further
    x ^= x >> 13;
    x *= 0xc2b2ae35;
    x ^= x >> 16;
    return x;
}
```

This is directly built from Module 2's operators: `^` (XOR), `>>` (right shift), and multiplication. **Why bother with all this instead of just returning `key` itself?** Because a naive hash (like "just use the key directly") interacts badly with `% table_size` when keys have patterns — e.g., if all your keys happen to be multiples of 16 and your table size is also a power of two, `key % table_size` might only ever produce a handful of distinct values, no matter how many keys you insert, because the low bits of `key` (the only bits that matter for `% power_of_two`) never vary. The XOR-fold-and-multiply steps exist specifically to **mix the high bits down into the low bits**, so that even patterned input keys produce well-spread hash outputs. This is precisely the kind of thing Module 2's struct-padding section hinted at: low-level bit layout has real, non-obvious consequences for higher-level code correctness and performance.

### Hashing a string

```cpp
uint32_t hashString(const std::string& s) {
    uint32_t hash = 2166136261u;   // FNV offset basis (a well-known starting constant)
    for (char c : s) {
        hash ^= static_cast<uint32_t>(c);
        hash *= 16777619u;          // FNV prime
    }
    return hash;
}
```

This is the FNV-1a hash — a small, well-known, genuinely-used-in-practice algorithm: XOR each byte in, then multiply by a carefully chosen prime, repeated per character. The repeated XOR+multiply is again exactly the "mix the bits thoroughly" principle from the integer hash above, just applied incrementally over a sequence of bytes instead of one fixed-width integer.

---

## 3. Collisions and how to resolve them

Two different keys hashing to the *same* table index is called a **collision** — inevitable once you have enough keys (pigeonhole principle: more possible keys than table slots, eventually something repeats). Two standard strategies:

### Separate chaining (what we'll build)

Each table slot holds a small linked list (or `std::vector`) of all entries that hashed to that index.

```
table:
[0] -> nullptr
[1] -> nullptr
[2] -> [("apple", 5)] -> [("grape", 9)] -> nullptr   (both hashed to index 2)
[3] -> [("banana", 3)] -> nullptr
```

```cpp
#pragma once
#include <vector>
#include <list>
#include <string>
#include <utility>
#include <stdexcept>

template <typename K, typename V>
class HashMap {
private:
    struct Entry {
        K key;
        V value;
    };

    std::vector<std::list<Entry>> buckets;
    int count;

    size_t hashKey(const K& key) const {
        return std::hash<K>{}(key) % buckets.size();   // using std::hash for generality;
                                                           // section 2 showed you what's under the hood
    }

    void rehash() {
        std::vector<std::list<Entry>> oldBuckets = std::move(buckets);
        buckets.assign(oldBuckets.size() * 2, std::list<Entry>());
        count = 0;
        for (auto& bucket : oldBuckets) {
            for (auto& entry : bucket) {
                insert(entry.key, entry.value);   // re-insert into the new, larger table
            }
        }
    }

public:
    HashMap(size_t initialBuckets = 16) : buckets(initialBuckets), count(0) {}

    void insert(const K& key, const V& value) {
        double loadFactor = static_cast<double>(count + 1) / buckets.size();
        if (loadFactor > 0.75) {
            rehash();
        }
        size_t idx = hashKey(key);
        for (auto& entry : buckets[idx]) {
            if (entry.key == key) {
                entry.value = value;   // key already exists — update, don't duplicate
                return;
            }
        }
        buckets[idx].push_back(Entry{key, value});
        count++;
    }

    bool contains(const K& key) const {
        size_t idx = hashKey(key);
        for (const auto& entry : buckets[idx]) {
            if (entry.key == key) return true;
        }
        return false;
    }

    V& get(const K& key) {
        size_t idx = hashKey(key);
        for (auto& entry : buckets[idx]) {
            if (entry.key == key) return entry.value;
        }
        throw std::out_of_range("key not found");
    }

    void erase(const K& key) {
        size_t idx = hashKey(key);
        auto& bucket = buckets[idx];
        for (auto it = bucket.begin(); it != bucket.end(); ++it) {
            if (it->key == key) {
                bucket.erase(it);
                count--;
                return;
            }
        }
    }

    int size() const { return count; }
};
```

### Open addressing (the alternative, briefly)

Instead of a list per bucket, every entry lives directly in the array itself; on a collision, you **probe** for the next open slot (e.g., linear probing: try index+1, index+2, ...). This avoids the linked-list overhead entirely (better cache locality — a familiar theme from Module 4's array-vs-linked-list discussion) but makes deletion trickier (you can't just clear a slot — it might be "covering" for a later entry that probed past it) and degrades faster as the table fills up.

### Trade-off: chaining vs. open addressing

| | Separate chaining | Open addressing |
|---|---|---|
| Memory overhead | Extra pointer per entry (linked list nodes) | None extra (entries stored inline) |
| Cache locality | Poor (list nodes scattered) | Good (contiguous array) |
| Behavior as table fills up (high load factor) | Degrades gracefully (lists just get a bit longer) | Degrades sharply (long probe sequences) |
| Deletion complexity | Simple (just remove from the bucket's list) | Trickier (must handle "tombstones" or shift entries) |
| What real-world implementations use | `std::unordered_map` implementations commonly use chaining | Some high-performance hash maps (e.g., in game engines, some language runtimes) use open addressing for the cache-locality win |

We built chaining here because it's conceptually simpler and directly reuses your Module 4 linked-list knowledge — but knowing open addressing exists (and why you'd pick it) is worth having for real-world context.

---

## 4. Load factor and resizing

**Load factor** = number of entries / number of buckets. As it climbs, chains get longer (more collisions to walk through per lookup), degrading toward O(n) in the worst case. The `insert` method above checks load factor before every insertion and **rehashes** (doubles the bucket count, re-inserts everything) once it crosses 0.75 — the same amortized-doubling trade-off from Module 3's `DynamicArray::grow()`, applied to bucket count instead of array capacity.

```
Load factor over time, with doubling:

buckets=16, count grows 0->12 (load factor 0.75) -> REHASH -> buckets=32
buckets=32, count grows 12->24 (load factor 0.75) -> REHASH -> buckets=64
```

This is the same amortized-O(1) argument as Module 3's array growth: rehashing is expensive (O(n), touches every entry) but happens exponentially less often as the table grows, so the *average* cost per insertion stays O(1).

---

## Practice Problems

1. **Hash quality check**: Using `hashInt` from section 2, hash the integers 0 through 999 into a table of size 16 (`hash % 16`) and print a histogram of how many keys land in each bucket. Now do the same using *only* `key % 16` (no mixing at all) for the same input, but this time use keys that are all multiples of 16 (e.g., 0, 16, 32, 48, ...) and observe the difference — this should make the "why bother mixing bits" argument concrete instead of theoretical.

2. **Build and test the full `HashMap<K,V>`**: Implement `insert`, `contains`, `get`, `erase`, and test with `HashMap<std::string, int>` — insert a handful of key-value pairs, confirm lookups work, confirm updating an existing key doesn't create a duplicate entry, confirm `erase` actually removes entries.

3. **Trigger and observe collisions**: Force multiple keys into the same bucket (e.g., temporarily shrink `buckets` to size 2 or 3) and print each bucket's chain length. Confirm `contains`/`get` still work correctly even with multiple entries in one bucket.

4. **Measure load-factor degradation**: Insert a large number of entries (10,000+) with rehashing *disabled* (comment out the rehash check temporarily) into a small fixed table (e.g., 16 buckets), and measure lookup time for a fixed key as the table fills far past a reasonable load factor. Then re-enable rehashing and confirm lookup time stays roughly flat as you insert the same number of entries.

5. **Implement `operator[]`**: Add `V& operator[](const K& key)` to `HashMap` that inserts a default-constructed value if the key doesn't exist yet (matching `std::unordered_map`'s real behavior), reusing Module 5's operator overloading knowledge in a genuinely useful context.

6. **Write a string hash quality test**: Hash a list of similar strings (e.g., "key1", "key2", "key3", ..., "key100") with `hashString` from section 2 and confirm the resulting hashes (mod a small table size) are well-distributed, not clustered — this is a real test of whether FNV-1a's bit-mixing is doing its job on realistic, similar-looking keys.

---

**Next: Module 9 — Graphs**, where you'll build a Graph class with BFS/DFS, and directly compare adjacency-list vs. adjacency-matrix representations as another instance of the "which structure fits which operations" trade-off theme running through this series. Say "next module" when ready.
