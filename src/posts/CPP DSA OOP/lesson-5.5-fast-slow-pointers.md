# Lesson 5.5: Fast/Slow Pointers, Cycle Detection

*Phase 5 — Linked Structures = OOP + Memory, Fused*

---

## A problem raw pointers can create by accident

Every list you've built so far has been a clean, straight chain ending in `nullptr`. But nothing in `Node`'s definition actually *prevents* a node's `next` from pointing back to an earlier node in the same list, creating a loop:

```cpp
Node* a = new Node(1);
Node* b = new Node(2);
Node* c = new Node(3);

a->next = b;
b->next = c;
c->next = a;   // <- forms a CYCLE: a -> b -> c -> a -> b -> c -> ...
```

This is a genuinely realistic bug, not a contrived one — a stray assignment, a bug in list-manipulation code, or (in real-world systems) even a maliciously crafted data structure can produce exactly this shape. Try running Lesson 5.1's `printAll()` on a list like this, and it will loop forever, printing `1 -> 2 -> 3 -> 1 -> 2 -> 3 -> ...` without end, never reaching a `nullptr` that doesn't exist. This lesson is about detecting that a cycle exists at all, ideally without needing extra memory to do it.

## The naive fix, and why it's worth rejecting first

The obvious approach: keep a set of every node address you've visited, and check each new node against it.

```cpp
#include <unordered_set>

bool hasCycleNaive(Node* head) {
    std::unordered_set<Node*> visited;
    Node* current = head;
    while (current != nullptr) {
        if (visited.count(current) > 0) return true;   // seen this address before -> cycle
        visited.insert(current);
        current = current->next;
    }
    return false;
}
```

This works, and it's O(n) time — genuinely fine for many purposes. But it costs O(n) *extra* space too (the `unordered_set` grows alongside the list), directly recalling Lesson 3.2's time/space tradeoff framing: you're spending real memory to detect the cycle. The technique this lesson actually teaches solves the same problem in O(n) time using **O(1) space** — no extra data structure at all — and it's clever enough to be worth understanding deeply, not just memorizing.

## Floyd's Cycle Detection — "the tortoise and the hare"

Use two pointers, both starting at `head`, moving through the list at different speeds: a **slow** pointer advancing one node at a time, and a **fast** pointer advancing two nodes at a time.

```cpp
bool hasCycle(Node* head) {
    Node* slow = head;
    Node* fast = head;

    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;         // move 1 step
        fast = fast->next->next;   // move 2 steps

        if (slow == fast) {   // they've MET — this can only happen inside a cycle
            return true;
        }
    }

    return false;   // fast reached nullptr — a genuine end exists, no cycle
}
```

## Why this actually works — not just "it does," but why

If there's no cycle, `fast` (moving twice as fast) reaches the real end of the list (`nullptr`) before `slow` does, the loop condition fails, and you correctly return `false` — this half is intuitive.

The genuinely clever part is the cycle case. Think of it as a race on a circular track: if both runners are on a loop, and one runs exactly twice as fast as the other, the faster one is *lapping* the slower one — gaining exactly one extra step of distance every single iteration relative to the slower runner. On a finite loop, a runner gaining one step per lap on another runner **must eventually catch up to them exactly**, the same way a faster runner on a circular track eventually laps a slower one and they're momentarily at the same position again. Because `fast` closes the gap by exactly one node per iteration once both are inside the cycle, and the cycle has some fixed finite length, `fast` is mathematically guaranteed to land on the exact same node as `slow` within, at most, one full trip around the cycle's length. This is why the meeting isn't a coincidence or a probabilistic "usually happens" — it's a guaranteed consequence of the relative speed difference being exactly one step per iteration, on a loop of finite, fixed size.

## Try it yourself

**1. Build the cyclic three-node list from the top of this lesson, and confirm `hasCycle` correctly returns `true`.** Then build a normal, non-cyclic list of several nodes and confirm it correctly returns `false`.

**2. Trace `slow` and `fast`'s positions by hand, node by node, for the 3-node cycle (`a -> b -> c -> a -> ...`)**, writing down each pointer's position after every iteration, until you can see exactly which iteration they land on the same node. Compare your hand-traced answer against adding `std::cout` statements to the real function and running it.

**3. Confirm the O(1) space claim directly** — count the extra variables `hasCycle` uses (`slow`, `fast` — that's it, regardless of list size) versus `hasCycleNaive`'s `unordered_set`, which genuinely grows with the list. This is a real, meaningful difference for very large lists where even O(n) extra memory might be a problem worth avoiding.

**4. A genuinely harder follow-up, worth attempting even if you don't finish it: find *where* the cycle begins, not just whether one exists.** (This is a well-known interview extension of the same technique — after `slow` and `fast` first meet, resetting one pointer to `head` and advancing both one step at a time until they meet again lands exactly on the cycle's starting node. The reasoning behind *why* that works is a genuinely satisfying piece of math worth researching once you've spent real time on it yourself — don't look it up immediately; sit with the problem first.)

## What this cost / bought us

| | `unordered_set`-based detection | Fast/slow pointers (Floyd's algorithm) |
|---|---|---|
| Time complexity | O(n) | O(n) |
| Extra space | O(n) — grows with the list | **O(1)** — always exactly two pointers, regardless of list size |
| Conceptual complexity | Simple, obvious | Clever, requires the "lapping" insight to understand *why* it works |
| Practical use | Fine for most everyday code | Genuinely valuable when memory matters, and a real, recurring interview/algorithm-design technique |

Floyd's algorithm is a small, self-contained example of a bigger idea worth carrying forward: sometimes a cleverer algorithm can eliminate an entire dimension of cost (here, the O(n) space of the naive approach) that looks unavoidable at first glance. You won't invent techniques this clever from scratch very often — but recognizing the *shape* of this kind of trick (two pointers moving at different rates through the same structure) will come up again, including directly in Phase 7's balanced-tree material and various array-based two-pointer techniques you'll meet in Phase 10's sorting and searching lessons.

---

**Phase 5's core lessons are complete.**

**Next up: the head-to-head project — `MyVector` vs. `MyLinkedList`, same interface (`push`, `get`, `remove`), opposite performance profiles**, implementing a small shared abstract base class (your first *practical* abstract base class since Phase 4's `Shape`) so both can be swapped in and out interchangeably — doubling as a concrete Strategy/Interface pattern exercise. After that, a file-I/O checkpoint: parsing real JSON into a linked list, your first contact with a genuine third-party C++ library.
