# Linked lists

A dynamic array keeps its items side by side in one block, which makes indexing O(1) and inserting at the front O(n). A **linked list** makes the opposite trade. Each item lives in its own small object, a **node**, that holds the item and a reference to the next node. The items can be anywhere in memory; the links chain them together. Inserting at the front means making one node and pointing it at the old first node: O(1), however long the list. But to reach the 500th item, you must follow 500 links: indexing is O(n).

Linked lists are rarely the right choice for storing data in Python (the list type is faster for almost everything), but the technique of linking nodes with references is everywhere: trees, graphs, the LRU cache project later in this series, and the deque that powers Python's own queues. This lesson covers:

- nodes and the singly linked list, with O(1) insertion at the front;
- walking a list, and why indexing is O(n);
- inserting and removing in the middle by relinking;
- the doubly linked list with a **sentinel** node, which makes every end operation O(1) and removes all special cases;
- how the two designs compare in practice.

## Nodes and the head

A node is a tiny object with two attributes: `value` and `next`. The list itself only needs to remember the first node, the **head**. The last node's `next` is `None`, marking the end. Predict before running: after pushing 1, 2 and 3 onto the front, in what order will the walk print them?

```python type
class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

class SinglyLinkedList:
    def __init__(self):
        self.head = None
        self._size = 0

    def push_front(self, value):
        self.head = Node(value, self.head)
        self._size += 1

    def __len__(self):
        return self._size

    def __iter__(self):
        node = self.head
        while node is not None:
            yield node.value
            node = node.next

    def __repr__(self):
        return " -> ".join(repr(v) for v in self) + " -> None"

numbers = SinglyLinkedList()
for v in [1, 2, 3]:
    numbers.push_front(v)
print(numbers, "length", len(numbers))
```

```output
3 -> 2 -> 1 -> None length 3
```

`__iter__` is written as a generator (with `yield`, from the Python series' iterators lesson): it walks from the head, handing out each value, until it reaches `None`.

The walk prints 3 → 2 → 1: each push puts the new value in front of the others. `push_front` creates one node and changes one reference, `Node(value, self.head)` building a node that points at the old head, then making it the new head. No other node is touched, so it is O(1) at any length. The size is kept in a counter, so `len` is O(1) too; counting the nodes would be O(n).

## Walking costs O(n)

Anything that needs a particular position has to walk there from the head. Getting the item at index i follows i links. Predict before running: how many links must be followed to reach index 0, 1,000 and 1,999 in a 2,000-node list?

```python type
def get(self, index):
    if not 0 <= index < self._size:
        raise IndexError("index out of range")
    node, hops = self.head, 0
    for _ in range(index):
        node = node.next
        hops += 1
    return node.value, hops

SinglyLinkedList.get = get

big = SinglyLinkedList()
for v in reversed(range(2_000)):
    big.push_front(v)
for index in [0, 1_000, 1_999]:
    value, hops = big.get(index)
    print(f"index {index:>5}: value {value:>5} after {hops:>5} hops")
```

```output
index     0: value     0 after     0 hops
index  1000: value  1000 after  1000 hops
index  1999: value  1999 after  1999 hops
```

As in the dynamic arrays lesson, `SinglyLinkedList.get = get` attaches a function as a method, so the class can grow cell by cell. Pushing `reversed(range(2_000))` onto the front leaves the values in order 0, 1, 2, ….

Reaching index i takes exactly i hops, so access is O(n) in the worst case. An array computes the position of any slot directly; a linked list has no way to skip ahead. That one difference decides which structure fits a job: if you mostly access by position, use an array; if you mostly add and remove at a position you already hold, a linked list can win.

## Relinking: insert and remove in the middle

Given a node, inserting after it is O(1): make a new node pointing at the node's successor, then point the node at the new node. Removing the node after a given node is O(1) too: point it past its successor. The removed node is simply no longer referenced, and Python reclaims its memory. The order of the two steps matters: point the new node at the successor **before** overwriting the link, or the rest of the list is lost.

```python type
def insert_after(self, node, value):
    node.next = Node(value, node.next)
    self._size += 1

def remove_after(self, node):
    if node.next is None:
        raise ValueError("nothing after this node")
    removed = node.next
    node.next = removed.next
    self._size -= 1
    return removed.value

def find(self, value):
    node = self.head
    while node is not None and node.value != value:
        node = node.next
    return node

SinglyLinkedList.insert_after = insert_after
SinglyLinkedList.remove_after = remove_after
SinglyLinkedList.find = find

letters = SinglyLinkedList()
for v in "edca":
    letters.push_front(v)
print("start:          ", letters)
letters.insert_after(letters.find("a"), "b")
print("insert b after a:", letters)
print("removed after c:", letters.remove_after(letters.find("c")), "->", letters)
```

```output
start:           'a' -> 'c' -> 'd' -> 'e' -> None
insert b after a: 'a' -> 'b' -> 'c' -> 'd' -> 'e' -> None
removed after c: d -> 'a' -> 'b' -> 'c' -> 'e' -> None
```

`find` returns the first node holding the value, or `None`: O(n), because it walks. The relinking itself is O(1). So "insert in the middle is O(1)" is true only if you already hold the node; finding it is the O(n) part. This is why linked lists shine when another structure hands you the node directly, as a dictionary does in the LRU cache project.

Removing **the node itself** (rather than the one after it) is awkward in a singly linked list: its predecessor's link must change, and a node does not know its predecessor. That is the problem the doubly linked list solves.

## Doubly linked lists and the sentinel

In a **doubly linked list**, each node also has a `prev` reference. Any node can then unlink itself in O(1): its predecessor points forward past it, and its successor points back past it.

The edges are where linked-list code gets buggy: an empty list, removing the head, removing the last node, each needing special cases. A neat trick removes all of them: a **sentinel**, a dummy node that is always present and holds no item. The list is a ring: the sentinel's `next` is the first real node, its `prev` is the last, and in an empty list it points to itself. Every real node always has a real predecessor and successor (possibly the sentinel), so every insertion is the same four reference changes and every removal the same two. Predict before running: after the operations below, what will the list contain, from front to back?

```python type
class DNode:
    def __init__(self, value=None):
        self.value = value
        self.prev = self.next = None

class DoublyLinkedList:
    def __init__(self):
        self._sentinel = DNode()
        self._sentinel.prev = self._sentinel.next = self._sentinel
        self._size = 0

    def _insert_between(self, value, before, after):
        node = DNode(value)
        node.prev, node.next = before, after
        before.next = node
        after.prev = node
        self._size += 1
        return node

    def push_front(self, value):
        return self._insert_between(value, self._sentinel, self._sentinel.next)

    def push_back(self, value):
        return self._insert_between(value, self._sentinel.prev, self._sentinel)

    def unlink(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev
        self._size -= 1
        return node.value

    def pop_front(self):
        if self._size == 0:
            raise IndexError("pop from empty list")
        return self.unlink(self._sentinel.next)

    def __len__(self):
        return self._size

    def __iter__(self):
        node = self._sentinel.next
        while node is not self._sentinel:
            yield node.value
            node = node.next

d = DoublyLinkedList()
d.push_back("b")
d.push_back("c")
middle = d.push_front("a")
d.push_back("d")
print(list(d), "- pop_front gives", d.pop_front(), "-", list(d))
handle = d.push_back("e")
d.unlink(handle)
print("after unlinking the node for 'e':", list(d), "length", len(d))
```

```output
['a', 'b', 'c', 'd'] - pop_front gives a - ['b', 'c', 'd']
after unlinking the node for 'e': ['b', 'c', 'd'] length 3
```

`node is not self._sentinel` compares identity: the walk stops when it comes round to the sentinel again.

The list goes a, b, c, d; popping the front returns a; pushing then unlinking e leaves b, c, d. Notice that `push_front` and `push_back` return the new node: holding on to that **handle** lets the caller remove the item later in O(1) with `unlink`, without searching. Every operation here is O(1), and not one of them has an `if` for the empty or one-item case: the sentinel absorbs them all. `collections.deque` is also a doubly linked list, but each of its nodes holds a block of 64 items, to save memory.

## How the two designs compare

On paper, a linked list wins at the front and loses at indexing. In practice, the constants matter too. Each node is a separate Python object with its own overhead, and walking from node to node jumps around memory, while a list's slots sit together. Predict before running: how will summing 3,000 values compare between a Python list and a linked list? And how will inserting at the front compare, for a short list and a long one?

```python type
import timeit

values = list(range(3_000))
linked = SinglyLinkedList()
for v in reversed(values):
    linked.push_front(v)

list_time = timeit.timeit(lambda: sum(values), number=200) / 200
linked_time = timeit.timeit(lambda: sum(linked), number=200) / 200
print(f"sum over a Python list:  {list_time * 1e6:8.1f} µs")
print(f"sum over a linked list:  {linked_time * 1e6:8.1f} µs  ({linked_time / list_time:.0f} times slower)")

for size in [3_000, 300_000]:
    front_list = timeit.timeit("v.insert(0, 1)", setup=f"v = list(range({size}))", number=1000) / 1000
    print(f"list.insert(0, x) on a list of {size:>7,}: {front_list * 1e6:7.2f} µs")
front_linked = timeit.timeit(lambda: SinglyLinkedList().push_front(1), number=1000) / 1000
print(f"push_front on a linked list of any length: {front_linked * 1e6:5.2f} µs")
```

Both walks are O(n), yet the linked list is several times slower: each step runs Python code (the generator, the attribute lookups), while `sum` over a list runs in compiled code over slots that sit together in memory. At the front, the size matters: inserting into a 3,000-item list shifts every slot, but the shifting is a fast memory copy, so it takes only a few microseconds, a small multiple of `push_front`'s cost; at 300,000 items the copy dominates, and `push_front`, which costs the same at any length, is over a hundred times faster. The lesson: Big-O tells you how costs **grow**; for real speed at a given size, constant factors and memory layout matter too.

One practical caution about very long chains of nodes in Python: when the last reference to the head goes away, Python frees the first node, which frees the second, and so on, one inside another. For a chain of many thousands of nodes that nesting can exhaust the stack, and in this browser's Python it crashes the notebook. That is why the lists in this lesson stay at a few thousand nodes. Use Python's list by default, `collections.deque` for fast work at both ends, and hand-built linked nodes when you need O(1) removal of a node you hold a handle to.

::: challenge Reverse in place [easy]
Add `reverse(self)` to `SinglyLinkedList` that reverses the list **in place** by relinking the existing nodes (no new nodes, no Python list), in one pass, O(n) time and O(1) extra memory.

```python starter
def reverse(self):
    pass

SinglyLinkedList.reverse = reverse

chain = SinglyLinkedList()
for v in [4, 3, 2, 1]:
    chain.push_front(v)
chain.reverse()
print(chain)
```

```python solution
def reverse(self):
    previous, node = None, self.head
    while node is not None:
        following = node.next
        node.next = previous
        previous, node = node, following
    self.head = previous

SinglyLinkedList.reverse = reverse

chain = SinglyLinkedList()
for v in [4, 3, 2, 1]:
    chain.push_front(v)
chain.reverse()
print(chain)
```

```python test
def _make(_xs):
    _l = SinglyLinkedList()
    for _x in reversed(_xs):
        _l.push_front(_x)
    return _l
for _xs in [[1, 2, 3, 4], [], [7], [1, 2]]:
    _l = _make(_xs)
    _nodes = []
    _n = _l.head
    while _n is not None:
        _nodes.append(_n); _n = _n.next
    _l.reverse()
    assert list(_l) == _xs[::-1], f"Reversing {_xs} should give {_xs[::-1]}, got {list(_l)}."
    _after = []
    _n = _l.head
    while _n is not None:
        _after.append(_n); _n = _n.next
    assert all(_a is _b for _a, _b in zip(_after, reversed(_nodes))), "Relink the existing nodes rather than creating new ones."
    assert len(_l) == len(_xs), "The size should not change."
_body = _source.split("def reverse")[1].split("SinglyLinkedList.reverse")[0] if "def reverse" in _source else ""
assert "Node(" not in _body and "[" not in _body and "list(" not in _body, "Don't build new nodes or a Python list: relink in place."
"SUCCESS: Three references (previous, current, following) are enough to reverse any length of list in one pass."
```

Hint: Walk with `previous = None` and `node = self.head`. At each node, save `following = node.next`, point `node.next` back at `previous`, then step: `previous, node = node, following`. At the end, `previous` is the new head.
:::

::: challenge Detect a cycle [medium]
A bug (or a malicious input) can make a chain of nodes loop back on itself, so a walk never ends. Write `has_cycle(head)` returning `True` if following `next` from `head` ever revisits a node, using **O(1) extra memory**: no set of visited nodes. Use Floyd's "tortoise and hare": one reference moves one step at a time, another two steps; if there is a loop, the fast one eventually catches the slow one from behind, and if there is none, the fast one reaches `None`.

```python starter
def has_cycle(head):
    return False

a, b, c = Node("a"), Node("b"), Node("c")
a.next, b.next, c.next = b, c, a
print(has_cycle(a), has_cycle(Node("x", Node("y"))))
```

```python solution
def has_cycle(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

a, b, c = Node("a"), Node("b"), Node("c")
a.next, b.next, c.next = b, c, a
print(has_cycle(a), has_cycle(Node("x", Node("y"))))
```

```python test
assert "has_cycle" in dir(), "Keep the function's name as has_cycle."
def _chain(_n, _loop_to=None):
    _nodes = [Node(_i) for _i in range(_n)]
    for _i in range(_n - 1):
        _nodes[_i].next = _nodes[_i + 1]
    if _loop_to is not None and _n:
        _nodes[-1].next = _nodes[_loop_to]
    return _nodes[0] if _nodes else None
assert has_cycle(None) is False, "An empty chain (head None) has no cycle."
assert has_cycle(_chain(1)) is False and has_cycle(_chain(2)) is False and has_cycle(_chain(1000)) is False, "Chains ending in None have no cycle."
_self = Node("me"); _self.next = _self
assert has_cycle(_self) is True, "A node pointing at itself is a cycle."
assert has_cycle(_chain(3_000)) is False, "A long chain ending in None has no cycle: walk until fast reaches None, not for a fixed number of steps."
for _n, _to in [(2, 0), (5, 2), (1000, 999), (1000, 0), (7, 6), (3_000, 3)]:
    assert has_cycle(_chain(_n, _to)) is True, f"A chain of {_n} nodes whose last node links back to node {_to} has a cycle."
assert "set(" not in _source and "{}" not in _source and "append" not in _source, "Use two references only (O(1) memory), not a collection of visited nodes."
"SUCCESS: Inside a loop the hare gains one step per move on the tortoise, so it must land on it: O(n) time, two references of memory."
```

Hint: Start `slow` and `fast` at the head. While `fast` and `fast.next` are not `None`, move `slow` one step and `fast` two; if they are the same node (`is`), there is a cycle. If the loop ends, the chain reached `None`.
:::

::: challenge Move to front [medium]
A cache often needs "this item was just used: move it to the front". With a doubly linked list and a handle to the node, that is O(1). Add two methods to `DoublyLinkedList`:

- `move_to_front(self, node)`: unlink the node from wherever it is and relink it right after the sentinel (reuse the same node object; don't change the size).
- `pop_back(self)`: remove and return the last value, raising `IndexError` if the list is empty.

```python starter
def move_to_front(self, node):
    pass

def pop_back(self):
    return None

DoublyLinkedList.move_to_front = move_to_front
DoublyLinkedList.pop_back = pop_back

recent = DoublyLinkedList()
handles = {name: recent.push_back(name) for name in ["a", "b", "c"]}
recent.move_to_front(handles["c"])
print(list(recent), recent.pop_back(), list(recent))
```

```python solution
def move_to_front(self, node):
    node.prev.next = node.next
    node.next.prev = node.prev
    first = self._sentinel.next
    node.prev, node.next = self._sentinel, first
    self._sentinel.next = node
    first.prev = node

def pop_back(self):
    if self._size == 0:
        raise IndexError("pop from empty list")
    return self.unlink(self._sentinel.prev)

DoublyLinkedList.move_to_front = move_to_front
DoublyLinkedList.pop_back = pop_back

recent = DoublyLinkedList()
handles = {name: recent.push_back(name) for name in ["a", "b", "c"]}
recent.move_to_front(handles["c"])
print(list(recent), recent.pop_back(), list(recent))
```

```python test
def _backwards(_d):
    _out, _n = [], _d._sentinel.prev
    while _n is not _d._sentinel:
        _out.append(_n.value); _n = _n.prev
    return _out
_d = DoublyLinkedList()
_h = {_k: _d.push_back(_k) for _k in "abcd"}
_d.move_to_front(_h["c"])
assert list(_d) == ["c", "a", "b", "d"], f"Moving c to the front of a, b, c, d should give c, a, b, d; got {list(_d)}."
assert _backwards(_d) == ["d", "b", "a", "c"], "The prev links must be updated too: walking backwards should give d, b, a, c."
_d.move_to_front(_h["c"])
assert list(_d) == ["c", "a", "b", "d"], "Moving the node that is already first should leave the list unchanged."
_d.move_to_front(_h["d"])
assert list(_d) == ["d", "c", "a", "b"] and _backwards(_d) == ["b", "a", "c", "d"], "Moving the last node to the front should work in both directions."
assert len(_d) == 4, "move_to_front should not change the size."
assert _d._sentinel.next is _h["d"], "Reuse the same node object, so handles stay valid."
assert _d.pop_back() == "b" and list(_d) == ["d", "c", "a"] and len(_d) == 3, "pop_back should remove and return the last value."
_e = DoublyLinkedList()
try:
    _e.pop_back()
    assert False, "pop_back on an empty list should raise IndexError."
except IndexError:
    pass
_one = DoublyLinkedList(); _n1 = _one.push_back(1); _one.move_to_front(_n1)
assert list(_one) == [1] and _backwards(_one) == [1], "A one-item list should be unchanged by move_to_front."
"SUCCESS: Unlink, then relink after the sentinel: O(1), no special cases. Together with a dictionary of handles, this is the heart of an LRU cache."
```

Hint: First unlink: `node.prev.next = node.next` and `node.next.prev = node.prev`. Then insert after the sentinel: remember `first = self._sentinel.next` (after unlinking), set the node's `prev` and `next`, then `self._sentinel.next = node` and `first.prev = node`. `pop_back` can reuse `unlink` on `self._sentinel.prev`.
:::

## What you learned

- A linked list chains nodes by references; the list holds only the head. Pushing at the front is O(1), but reaching index i takes i hops, so indexing and searching are O(n).
- Inserting or removing next to a node you already hold is O(1) relinking; finding the node is the O(n) part.
- A doubly linked list with a sentinel makes every end operation and every removal by handle O(1), with no special cases for empty or one-item lists.
- In Python, constant factors favour the built-in list for almost everything; use `collections.deque` for fast ends, and linked nodes when you need O(1) removal by handle.

The next lesson uses these ideas for the first of the classic abstract structures: the stack.
