# Module 11: Capstone — Parts Inventory & Dependency Tracker

## Why this module is different

Every earlier module isolated one structure so you could focus on it. Real code doesn't work that way — a real system combines several structures, each chosen for what it's good at, wired together through clean OOP design. This capstone is deliberately **not** fully solved for you the way earlier modules were — you've built every individual piece already; this is about architecture and integration. Treat it like a real project: a spec, a suggested design, and milestones, with the implementation being yours.

## The project: a manufacturing parts inventory system

You work in manufacturing, so this domain should feel natural rather than arbitrary — but the structural lessons transfer to any domain (a dependency graph is a dependency graph whether it's parts, tasks, or package managers).

**The system tracks**: parts by ID, their quantity on hand and reorder threshold, and which parts depend on which other parts (a bill of materials — building a "Widget" might require 2 "Bolt-A" and 1 "Bracket-B"). It needs to answer:

1. **O(1) lookup**: given a part ID, get its full info instantly.
2. **Sorted range query**: list all parts with quantity below their reorder threshold, sorted by how far below threshold they are (most urgent first).
3. **Dependency resolution**: given a part, determine the full build order for it and everything it depends on (you can't build a Widget before its Bolt-A and Bracket-B exist) — and detect if the bill of materials has an accidental circular dependency (Part A needs Part B needs Part A — a real, correctness-critical bug in this domain).
4. **Transaction history**: every quantity change (received stock, used stock) is logged, and the system supports undoing the most recent transaction.

## Which structure from the series maps to which requirement

| Requirement | Structure | Module |
|---|---|---|
| O(1) lookup by part ID | `HashMap<std::string, Part>` | 8 |
| Sorted range query by "urgency" (threshold - quantity) | `BST<...>` keyed on urgency, or an ordering scheme of your design | 7 |
| Dependency resolution + cycle detection | `Graph` (directed), using DFS for cycle detection and a topological sort for build order | 9 |
| Transaction history with undo | `Stack<Transaction>` (undo = pop the most recent) | 5 |
| Owning the parts themselves, avoiding leaks/dangling pointers throughout | `unique_ptr`/RAII discipline | 3, 6 |

This mapping is deliberately given to you — figuring out *which* structure fits *which* requirement, from scratch, for an unfamiliar problem, is a whole skill on its own (worth practicing later on projects with no such table provided). For this capstone, the integration work — making these four structures cooperate cleanly inside one coherent class design — is the actual exercise.

## Suggested architecture

```cpp
struct Part {
    std::string id;
    std::string name;
    int quantity;
    int reorderThreshold;
    std::vector<std::string> dependsOn;   // IDs of parts this one requires
};

struct Transaction {
    std::string partId;
    int quantityDelta;   // positive = received stock, negative = used stock
};

class Inventory {
private:
    HashMap<std::string, Part> parts;         // Module 8
    // ... your urgency-ordering structure ... // Module 7
    Graph dependencyGraph;                      // Module 9 (vertices = parts, mapped to indices)
    Stack<Transaction> history;                 // Module 5

public:
    void addPart(const Part& part);
    void adjustQuantity(const std::string& id, int delta);   // logs a Transaction
    void undoLastTransaction();

    std::vector<Part> partsNeedingReorder() const;            // uses the BST/ordering structure
    std::vector<std::string> buildOrderFor(const std::string& id) const;  // uses the Graph
    bool hasCircularDependency() const;                        // uses Graph cycle detection
};
```

**A genuine design decision left to you**: `Graph` from Module 9 was built around integer vertex indices, but parts have string IDs. You'll need to decide how to bridge this — a `HashMap<std::string, int>` mapping IDs to graph indices is one reasonable approach, but think about whether that's the cleanest option or whether adapting `Graph` itself to be a template (`Graph<T>`, generalizing the vertex type, echoing Module 5's genericization of `Stack`/`Queue`) is worth the extra effort here. There's no single correct answer — this kind of judgment call is exactly what real design work looks like.

## Suggested milestones

Work through these roughly in order — each one should compile and be testable before moving to the next, rather than trying to build everything at once:

1. **Core storage**: `Part` struct, `HashMap`-backed storage, `addPart`/lookup/`adjustQuantity` working, no history or dependencies yet. Test: add a few parts, adjust quantities, confirm lookups reflect the changes.

2. **Transaction history**: wire `adjustQuantity` to push a `Transaction` onto the history stack, implement `undoLastTransaction`. Test: adjust quantity, undo, confirm it's back to the original value.

3. **Reorder query**: pick and implement your urgency-ordering structure (a BST keyed by `threshold - quantity`, re-sorted or re-inserted as quantities change, is one reasonable design — but consider the trade-off of keeping a structure "live-updated" vs. just building it fresh each query, and be ready to justify whichever you pick). Test: create parts with varying quantities relative to their thresholds, confirm `partsNeedingReorder()` returns them sorted by urgency.

4. **Dependency graph**: wire up part dependencies into the `Graph`, implement `hasCircularDependency()` (Module 9 problem 4's cycle detection, applied here for real) and `buildOrderFor()` (this requires **topological sort** — a natural extension of DFS that hasn't been explicitly covered; research it briefly, it's a short, well-documented algorithm once you have working DFS). Test: build a small bill-of-materials with a deliberate cycle, confirm it's detected; build one without a cycle, confirm the build order respects dependencies (a part never appears before something it depends on).

5. **Integration test**: write a `main()` that builds a small but complete inventory (8-10 parts, some with dependencies, some understocked), and exercises every public method of `Inventory` in one coherent scenario — this is the point where you'll likely discover interface mismatches between the pieces that individual-milestone testing didn't surface.

## Self-check: is your capstone actually using what the series taught?

Before considering it done, verify honestly:

- [ ] No raw `new`/`delete` anywhere in your own code (smart pointers or STL containers manage everything) — Module 3/6
- [ ] Every class that owns a resource follows the Rule of Three/Five correctly, or avoids the need entirely via smart pointers/STL members — Module 3/6
- [ ] At least one place uses `const` correctly on a method that doesn't mutate state — Module 3
- [ ] `.h`/`.cpp` split for at least the `Inventory` class, with proper include guards or `#pragma once` — Module 4.5
- [ ] Templates used somewhere genuinely (not forced in where it doesn't fit) — Module 5
- [ ] The dependency graph's cycle detection is actually tested against a deliberately broken (circular) bill of materials, not just "happy path" data — Module 9
- [ ] You can explain, out loud, why you chose each structure for each requirement — not just that it works, but why it's the *right* choice given the operations that requirement needs (this is the real test of whether the trade-off tables throughout the series actually stuck)

## Where to go from here

If you want to keep extending this series' skills beyond the capstone: adding a self-balancing tree (AVL or red-black) to replace the plain BST, implementing Dijkstra's algorithm on the weighted-graph extension from Module 9, or converting `Inventory` to be multithreaded-safe (a substantial jump — mutexes, atomics, and thread-safety are a natural "Module 12" this series didn't cover) are all reasonable next steps once this capstone is solid.

---

That's the full series. If you want, I can also produce a single combined reference document indexing every trade-off table across all 11 modules for quick lookup — just ask.
