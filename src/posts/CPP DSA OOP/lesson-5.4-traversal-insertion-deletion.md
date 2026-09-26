# Lesson 5.4: Traversal, Insertion, Deletion — Why O(1) Here vs. O(n) in Your Array

*Phase 5 — Linked Structures = OOP + Memory, Fused*

---

## Making Lesson 3.2's tradeoff completely explicit

You've felt pieces of this across the last three lessons — `pushFront` being cheap on a linked list, insertion-at-front being expensive on `MyVector`. This lesson isn't new material; it's the deliberate, complete version of that comparison, operation by operation, so the pattern is unmistakable rather than just something you half-noticed along the way.

## The full comparison table, derived, not just asserted

| Operation | `MyVector` | `LinkedList` (singly, with `tail` tracked) | Why |
|---|---|---|---|
| Access by index (`get(i)`) | O(1) | O(n) | `MyVector`: direct address arithmetic (Lesson 1.5). `LinkedList`: no shortcut exists — must walk from `head`, node by node, since nodes aren't contiguous. |
| Insert/remove at the **front** | O(n) | O(1) | `MyVector`: every existing element must shift right one slot to make room (or left, to close a gap). `LinkedList`: just relink a couple of pointers — nothing else moves at all. |
| Insert at the **back** | O(1) amortized (Lesson 3.1) | O(1) (with `tail` tracked) | `MyVector`: usually writes to the next free slot; occasionally triggers a resize. `LinkedList`: `tail` gives direct access to the insertion point. |
| Remove from the **back** | O(1) | O(n) | `MyVector` destroys its last element directly. A singly linked list must walk from `head` to find the node before `tail`; a doubly linked list's `prev` link makes this O(1). |
| Insert in the **middle**, given a pointer/index to the spot | O(n) — must shift everything after the insertion point | O(1) — **if you already have a pointer to the node after which to insert** | This is the row worth sitting with the longest, covered fully below. |
| Remove from the **middle**, given the relevant link | O(n) — must shift later elements | O(1) — **if you have the predecessor in a singly linked list, or the node itself in a doubly linked list** | Deletion must update the link that owns or points to the removed node. |
| Search for a value (no index known) | O(n) | O(n) | Both must check elements one by one, in the absence of any additional structure (Phase 7's trees, Phase 8's hash maps exist specifically to make this faster). |

## The subtlety in "insert in the middle" — read this row twice

It's tempting to walk away from this table with "linked lists are O(1) for middle insertion, arrays are O(n) — linked lists win." That's **incomplete**, and the missing piece matters. A linked list's middle insertion is O(1) only for the *relinking step itself* — but *finding* the node you want to insert next to, if all you have is a numeric index or a value to search for, is still an O(n) walk from `head`, exactly like the array case:

```cpp
// "Insert after the node containing value 5" — the FULL operation, index unknown ahead of time
void insertAfterValue(Node* head, int targetValue, int newValue) {
    Node* current = head;
    while (current != nullptr && current->value != targetValue) {   // <- THIS walk is O(n)
        current = current->next;
    }
    if (current != nullptr) {
        Node* newNode = new Node(newValue);
        newNode->next = current->next;   // <- THIS relink is O(1)
        current->next = newNode;
    }
}
```

The relink genuinely is O(1) — three pointer assignments, regardless of list size. But the search to *find* `current` in the first place is O(n), and it dominates the total cost. **The honest statement of the advantage is: a linked list's middle insertion is O(1) only when you already hold a pointer/iterator to the node after which to insert. For deletion in a singly linked list, you need the predecessor, because its `next` link is the one that must change.** These are real, common situations when you are already iterating, but they are meaningfully narrower claims than "linked lists are fast at middle insertion and deletion," full stop. This exact nuance is what Phase 7's iterator lesson will eventually formalize properly — for now, hold onto the distinction between "the relink" and "the search to find where to relink."

## Deletion, the mirror image of insertion

Removing a node follows the identical shape — cheap relink, potentially expensive search:

```cpp
void removeValue(Node*& head, int targetValue) {
    if (head == nullptr) return;

    if (head->value == targetValue) {   // special case: removing the head itself
        Node* toDelete = head;
        head = head->next;
        delete toDelete;
        return;
    }

    Node* current = head;
    while (current->next != nullptr && current->next->value != targetValue) {   // O(n) search
        current = current->next;
    }

    if (current->next != nullptr) {
        Node* toDelete = current->next;
        current->next = current->next->next;   // O(1) relink — skip over the removed node
        delete toDelete;
    }
}
```

(This version uses raw pointers, matching Lesson 5.1, to keep the relinking logic visible without `unique_ptr`'s `std::move` ceremony obscuring it — translating this into the `unique_ptr` style from Lesson 5.2 is a good exercise in its own right, included below.)

Notice the special case for removing `head` itself — this asymmetry (the first node needs different handling than every other node) is a genuine, recurring annoyance in raw linked-list code, and it's exactly the kind of edge case that Phase 7's iterator work and, more immediately, careful test-writing habits exist to catch before it ships as a bug.

## Try it yourself

**1. Build `insertAfterValue` and `removeValue` above, test both against a list of known values, and confirm they behave correctly — including the edge cases:** using the first and last nodes as targets, removing the head, removing the tail, and searching for a value that doesn't exist in the list at all (should do nothing, not crash).

**2. Measure the real difference between "already have the pointer" and "must search first," directly.** Time 10,000 middle-insertions two ways: once where you're handed a pre-found `Node*` for each insertion point (simulating "already iterating"), and once where each insertion requires a full search by value first. Confirm the searched version is dramatically slower, and the pointer-in-hand version is dramatically faster — proof, not assertion, of the nuance from the section above.

**3. Rewrite `removeValue` using the `unique_ptr<Node>`-owned list from Lesson 5.2.** This is a genuinely good exercise: you'll need to think carefully about *which* `unique_ptr` needs to be reassigned to correctly trigger the old node's automatic destruction (Lesson 5.2's recursive-teardown mechanism) without needing an explicit `delete` anywhere at all.

**4. Compare against `MyVector`'s equivalent middle-insertion, timed side by side**, for a range of list sizes (100, 1,000, 10,000, 100,000 elements), inserting at a fixed relative position (say, the middle) each time — with the pointer already in hand for the linked list version, and confirm `MyVector`'s cost grows roughly linearly with size (Lesson 3.1's shifting cost) while the pointer-in-hand linked-list version stays roughly flat.

## What this cost / bought us

The real takeaway of this lesson isn't a new fact — it's a **discipline**: whenever you're comparing two data structures' complexity for some operation, always ask *exactly* what's being assumed. "O(1) middle insertion" sounds unconditionally good until you notice it quietly assumes you already have the insertion point in hand — an assumption that's sometimes true and sometimes isn't, and the honest answer changes completely depending on which. This is the same rigor Lesson 3.1's amortized analysis demanded of you (don't just say "O(1)," say "O(1) *amortized*, and here's why") — Big-O claims are only as trustworthy as the assumptions stated alongside them, and from here forward in this curriculum, every complexity claim should come with its assumptions made explicit, the way this lesson's table tried to model.

---

**Next up: Lesson 5.5 — Fast/slow pointers, cycle detection.** A genuinely clever technique that only makes sense once you deeply understand pointers as addresses (Lesson 1.2) and linked traversal (this lesson) — and it's a real algorithm you'll see again in technical interviews and in Phase 9's graph cycle detection.
