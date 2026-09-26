# Lesson 5.2: The Same List, Rebuilt With `unique_ptr<Node>`

*Phase 5 — Linked Structures = OOP + Memory, Fused*
*Compare ownership models directly.*

---

## What Lesson 5.1 left manual

Every `new Node(...)` in Lesson 5.1 needed a matching `delete` in the destructor, walked by hand, in order, or the whole list leaks (Lesson 1.4). You wrote that walk-and-delete loop yourself. Lesson 1.7 gave you a tool specifically for "I keep having to remember to delete this" — time to apply it here, and see exactly what changes and what doesn't.

## The rebuild

```cpp
#include <memory>
#include <iostream>

class Node {
public:
    int value;
    std::unique_ptr<Node> next;   // OWNS the next node — was a raw Node* before

    Node(int v) : value(v), next(nullptr) {}
};

class LinkedList {
private:
    std::unique_ptr<Node> head;   // OWNS the first node

public:
    LinkedList() : head(nullptr) {}

    void pushFront(int value) {
        auto newNode = std::make_unique<Node>(value);
        newNode->next = std::move(head);   // transfer ownership of the OLD chain to newNode->next
        head = std::move(newNode);          // transfer ownership of newNode to head
    }

    void printAll() {
        Node* current = head.get();   // .get() — a RAW, non-owning pointer, for traversal only
        while (current != nullptr) {
            std::cout << current->value << " -> ";
            current = current->next.get();
        }
        std::cout << "nullptr" << std::endl;
    }

    // NO destructor needed at all — unique_ptr's own destructor chains automatically
};
```

Two changes carry the entire weight of this lesson: `Node* next;` became `std::unique_ptr<Node> next;`, and `Node* head;` became `std::unique_ptr<Node> head;`. Everything else follows from those two type changes.

## Why `std::move` is required here, specifically

Recall Lesson 1.7's rule: a `unique_ptr` cannot be copied, only moved — copying would mean two owners for one heap allocation, reintroducing the double-free bug. `pushFront` needs to hand `head`'s current chain over to `newNode->next`, and then hand `newNode` itself over to `head` — both are ownership *transfers*, not copies, so both require `std::move`:

```cpp
newNode->next = std::move(head);   // "head, I'm taking your chain. You're now empty."
head = std::move(newNode);          // "newNode, I'm taking you. You're now empty."
```

Trace through this exactly as carefully as Lesson 5.1's raw-pointer version required careful ordering. If you assign `head = std::move(newNode)` first, replacing `head` destroys the old chain. `newNode` is then empty, so trying to use `newNode->next` dereferences a null pointer and causes undefined behavior (typically a crash). The type system prevents two owners from copying the same pointer, but it cannot make a moved-from pointer safe to dereference. The lesson underneath both versions is the same: transfer the old chain before you overwrite its owner.

## `.get()` — a raw pointer, on loan, for traversal only

`printAll()` needs to *walk* the chain without taking ownership of anything — it just wants to look at each node in turn. `head.get()` returns the raw `Node*` a `unique_ptr` wraps internally, without transferring ownership at all — the `unique_ptr` itself is untouched, still fully owning its node, for the entire duration of the loop. This is exactly the right tool for "I need to look at this, briefly, without taking responsibility for it" — a genuine, sanctioned use of a raw pointer even in modern, smart-pointer-based C++, because ownership was never in question here; only temporary access was.

## What disappeared, entirely

**The destructor.** Compare this directly against Lesson 5.1's walk-and-delete loop. It's gone — not simplified, *gone*, zero lines. Here's why this works, and it's worth tracing precisely: when a `LinkedList` object is destroyed, its `head` member (a `unique_ptr<Node>`) is destroyed too, automatically (Lesson 2.3's guaranteed destructor-calls-destructors-of-members behavior). Destroying `head` runs `Node`'s destructor on the first node — which, because `Node::next` is *itself* a `unique_ptr<Node>`, automatically destroys the second node's `unique_ptr`, which destroys the third, and so on, all the way down the chain, each destruction automatically triggering the next. **The entire chain cleans itself up, recursively, through nothing but ordinary member destruction — Lesson 2.5's RAII, applied all the way down a linked structure, with no loop written anywhere by you at all.**

```cpp
#include <iostream>

int main() {
    {
        LinkedList list;
        list.pushFront(1);
        list.pushFront(2);
        list.pushFront(3);
        std::cout << "list built" << std::endl;
    }   // ENTIRE chain destroyed here, automatically, zero code written for it
    std::cout << "list destroyed" << std::endl;
    return 0;
}
```

## The one real risk this doesn't eliminate: deep recursion on destruction

Worth knowing honestly, not glossed over: because each node's destruction triggers the *next* node's destruction directly (function calls nested inside each other, in the literal call-stack sense from Lesson 1.1), an extremely long chain — hundreds of thousands or millions of nodes — can, in principle, exhaust the stack during destruction, the exact stack-overflow failure mode from Lesson 1.1's deliberate recursion exercise. This is a genuine, known edge case with `unique_ptr`-chained structures in real C++ code, and it's exactly the kind of subtlety this curriculum wants you to be aware of rather than discover by surprise in production. (The fix, for anyone who hits this in practice, is an iterative destructor — manually walking and resetting each `next` before the automatic chain would recurse — but for the sizes you'll work with in this curriculum, it won't come up.)

## Try it yourself

**1. Build both the raw-pointer version (Lesson 5.1) and this `unique_ptr` version side by side, and confirm they produce identical `printAll()` output** for the same sequence of `pushFront` calls.

**2. Delete the raw version's destructor entirely and confirm (with `valgrind`, if available) that it now leaks** — direct, contrasting proof of exactly what the smart-pointer version is buying you automatically.

**3. In a throwaway copy, deliberately swap the two `std::move` lines in `pushFront` and run it with an address/undefined-behavior sanitizer.** The first line destroys the old chain and leaves `newNode` empty; the second line dereferences that empty pointer. This demonstrates the precise limit of `unique_ptr`: it automates ownership and cleanup, but it cannot make a moved-from handle valid to use.

**4. Add a print statement inside a hypothetical `~Node()` destructor (you don't need to write one explicitly — the compiler-generated default is enough; just add `std::cout` some other way, e.g. temporarily writing an explicit destructor purely to observe this) and push 5 values, then let the list go out of scope.** Watch the destruction order print — it should go front-to-back (the node holding `head` destroys first, cascading outward), confirming the recursive-teardown mechanism described above, directly, rather than as an assertion to trust.

## What this cost / bought us

| | Raw pointers (Lesson 5.1) | `unique_ptr<Node>` (this lesson) |
|---|---|---|
| Ownership | Implicit — you must track by convention who "owns" each node | Explicit and enforced — exactly one `unique_ptr` owns each node, always |
| Destructor needed | Yes — manual walk-and-delete loop, written by hand | No — automatic, recursive, via ordinary member destruction |
| Risk of leaking a node | Real, if the destructor has a bug | Effectively eliminated |
| Risk of double-freeing a node | Real, if two raw pointers both think they own the same node | Structurally impossible — `unique_ptr` cannot be copied (Lesson 1.7) |
| `pushFront` complexity | Simple pointer reassignment | Requires `std::move` at each ownership transfer — slightly more ceremony |
| New failure mode introduced | N/A | Deep-recursion stack risk on destruction of very long chains (rare in practice, worth knowing about) |

This lesson is a direct, concrete payoff of Lesson 1.7 and Lesson 2.5 landing together on a genuinely non-trivial structure — not just a single heap allocation anymore, but a whole *chain* of them, cleaning itself up correctly with zero manual bookkeeping. From this lesson forward in this curriculum, every linked structure you build will default to `unique_ptr`-based ownership, exactly the way Lesson 1.7 recommended, unless a specific structure (Phase 7's trees needing shared subtrees, in rare cases) genuinely calls for something else.

---

**Next up: Lesson 5.3 — Doubly linked lists.** A singly linked list can only walk forward. Sometimes you need to walk backward too — and that need has real, direct consequences for `Node`'s shape and, especially, for ownership.
