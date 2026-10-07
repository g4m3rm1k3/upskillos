# Union-Find

Connections arrive one at a time: two people become friends, two computers are cabled together, two pixels of the same colour are found side by side. After each one, the question is: **are these two items connected now**, directly or through a chain? Running a graph search after every new edge would cost O(V + E) each time. **Union-Find** (also called a **disjoint-set** structure) answers in practically constant time.

It keeps the items in groups, the connected components, and supports just two operations:

- **find(x)**: which group is x in? (It returns a representative item for the group, so two items are connected exactly when `find` gives the same answer for both.)
- **union(x, y)**: merge the groups of x and y.

It is tiny (two lists and a dozen lines) and one of the best examples of how two simple tricks can change an algorithm's cost dramatically. This lesson covers:

- the forest-of-trees representation, where each item points towards its group's root;
- **union by size** and **path compression**, and what each does to the trees;
- the near-constant running time that results;
- uses: counting components, detecting cycles, and grouping equivalent items.

## A forest of parent pointers

Store each group as a tree, with one array: `parent[x]` is the item x points to, and the **root** of each tree points to itself. The root is the group's representative. `find(x)` follows parent pointers until it reaches a root. `union(x, y)` finds both roots and, if they differ, makes one point to the other. Predict before running: after the unions below, which items are in 0's group, and how deep is the tree?

```python type
class NaiveUnionFind:
    def __init__(self, n):
        self.parent = list(range(n))

    def find(self, x):
        steps = 0
        while self.parent[x] != x:
            x = self.parent[x]
            steps += 1
        return x, steps

    def union(self, x, y):
        rx, _ = self.find(x)
        ry, _ = self.find(y)
        if rx != ry:
            self.parent[rx] = ry

uf = NaiveUnionFind(8)
for a, b in [(0, 1), (2, 3), (1, 3), (4, 5), (3, 6)]:
    uf.union(a, b)
print("parent:", uf.parent)
for x in range(8):
    root, steps = uf.find(x)
    print(f"find({x}) = {root} after {steps} steps")
```

```output
parent: [1, 3, 3, 6, 5, 5, 6, 7]
find(0) = 6 after 3 steps
find(1) = 6 after 2 steps
find(2) = 6 after 2 steps
find(3) = 6 after 1 steps
find(4) = 5 after 1 steps
find(5) = 5 after 0 steps
find(6) = 6 after 0 steps
find(7) = 7 after 0 steps
```

`list(range(n))` starts every item as its own root: n groups of one.

Items 0, 1, 2, 3 and 6 end up in one group with root 6, and 4 and 5 in another; 7 is alone. But the tree is already getting tall: finding 0 takes 3 steps, along 0 → 1 → 3 → 6. Unions that always hang one root under the other can build a chain of length n, making `find` O(n). Two tricks prevent that.

## Union by size and path compression

**Union by size**: when merging, hang the **smaller** tree under the root of the larger. An item's depth increases only when its tree is merged into one at least as big, which at least doubles the size of the tree it is in; that can happen at most log₂ n times. So trees stay O(log n) deep.

**Path compression**: during `find(x)`, once the root is known, make every item on the path point **directly** to the root. The work is done once, and every later `find` on those items takes one step.

Together they make the trees almost flat. Predict before running: building one group from 2,000 items with unions that would form a long chain, how many steps does the slowest `find` take in each version?

```python type
import random

class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.groups = n

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        self.size[rx] += self.size[ry]
        self.groups -= 1
        return True

def depth(parent, x):
    d = 0
    while parent[x] != x:
        x, d = parent[x], d + 1
    return d

n = 2_000
naive, smart = NaiveUnionFind(n), UnionFind(n)
for i in range(n - 1):
    naive.union(i, i + 1)
    smart.union(i, i + 1)
print("naive: deepest item", max(depth(naive.parent, x) for x in range(n)), "steps")
print("union by size: deepest item", max(depth(smart.parent, x) for x in range(n)), "steps; groups left:", smart.groups)

random.seed(0)
smart2 = UnionFind(n)
for _ in range(3 * n):
    smart2.union(random.randrange(n), random.randrange(n))
for x in range(n):
    smart2.find(x)
print("after random unions and one find on every item: deepest", max(depth(smart2.parent, x) for x in range(n)), "steps; groups:", smart2.groups)
```

```output
naive: deepest item 1999 steps
union by size: deepest item 1 steps; groups left: 1
after random unions and one find on every item: deepest 1 steps; groups: 6
```

`self.parent[x], x = root, self.parent[x]` points x at the root and moves on to x's old parent in one line: the right-hand side is evaluated first, so x's old parent is remembered before it is overwritten. `union` returns whether a merge happened, which the cycle-detection example below uses.

The naive version builds a chain of depth 1,999. Union by size keeps every item within one step of its root, because each new item joins the big tree directly. After thousands of random unions and a pass of `find`, path compression has flattened everything to depth at most 1. The formal result is that a sequence of m operations takes O(m α(n)) time, where α is the **inverse Ackermann function**, a function that grows so slowly that α(n) ≤ 4 for any n that could ever be stored. In practice, each operation is constant time.

## Counting components as edges arrive

Each successful union merges two groups into one, so the number of groups is n minus the number of successful unions, kept in `groups`. That answers questions like "after which connection did the network become fully connected?" in one pass over the connections. Predict before running: after which cable are all 6 computers connected?

```python type
cables = [(0, 1), (2, 3), (1, 2), (0, 3), (4, 5), (3, 5)]
network = UnionFind(6)
for step, (a, b) in enumerate(cables, start=1):
    merged = network.union(a, b)
    note = "merged two groups" if merged else "already connected: this cable makes a loop"
    print(f"cable {step} {a}-{b}: {note}; groups now {network.groups}")
    if network.groups == 1:
        print("all connected after cable", step)
        break
```

```output
cable 1 0-1: merged two groups; groups now 5
cable 2 2-3: merged two groups; groups now 4
cable 3 1-2: merged two groups; groups now 3
cable 4 0-3: already connected: this cable makes a loop; groups now 3
cable 5 4-5: merged two groups; groups now 2
cable 6 3-5: merged two groups; groups now 1
all connected after cable 6
```

A union that finds both items already in the same group means the new edge closes a **cycle**: there was already a path between them.

Cable 4 joins two computers that were already connected through cables 1 to 3, so it adds a loop rather than reach; everything is connected after cable 6. Detecting "this edge would make a cycle" in O(1) is exactly what Kruskal's minimum spanning tree algorithm needs, in the next lesson.

## Grouping equivalent things

Union-Find works on any items, not just numbers 0 to n − 1: map each item to an index with a dictionary, or store the parents in a dictionary directly. A common use is merging records that refer to the same thing: user accounts sharing an email address, or files with the same contents found by different tools. Each piece of evidence that two records match is a union; the groups at the end are the merged entities. The third challenge does this. Union-Find only ever merges: it cannot split a group again, which is the price of its speed.

::: challenge How many friend groups? [easy]
Write `friend_groups(n, friendships)` for people numbered 0 to n − 1 and a list of friendship pairs, returning the number of groups (friends of friends, at any distance, are in the same group). Use the lesson's `UnionFind`.

```python starter
def friend_groups(n, friendships):
    return n

print(friend_groups(6, [(0, 1), (1, 2), (3, 4)]))
```

```python solution
def friend_groups(n, friendships):
    uf = UnionFind(n)
    for a, b in friendships:
        uf.union(a, b)
    return uf.groups

print(friend_groups(6, [(0, 1), (1, 2), (3, 4)]))
```

```python test
import random as _random
assert "friend_groups" in dir(), "Keep the function's name as friend_groups."
assert friend_groups(6, [(0, 1), (1, 2), (3, 4)]) == 3, "Groups {0, 1, 2}, {3, 4} and {5}: 3."
assert friend_groups(4, []) == 4 and friend_groups(1, []) == 1, "With no friendships, everyone is their own group."
assert friend_groups(3, [(0, 1), (1, 0), (0, 1)]) == 2, "Repeated friendships change nothing."
_r = _random.Random(1)
for _ in range(100):
    _n = _r.randint(1, 12); _fs = [(_r.randrange(_n), _r.randrange(_n)) for _ in range(_r.randint(0, 12))]
    _adj = {i: set() for i in range(_n)}
    for _a, _b in _fs:
        _adj[_a].add(_b); _adj[_b].add(_a)
    _seen, _count = set(), 0
    for _s in range(_n):
        if _s not in _seen:
            _count += 1; _stack = [_s]; _seen.add(_s)
            while _stack:
                for _w in _adj[_stack.pop()]:
                    if _w not in _seen:
                        _seen.add(_w); _stack.append(_w)
    assert friend_groups(_n, _fs) == _count, f"Wrong count for {_n} people and friendships {_fs}."
assert "UnionFind(" in _source, "Use the lesson's UnionFind."
"SUCCESS: n groups to start, one fewer for every union that merges: the same answer as a full graph search, with no graph at all."
```

Hint: Make a `UnionFind(n)`, call `union` for every pair, and return its `groups` count.
:::

::: challenge The redundant cable [medium]
A network of n computers (0 to n − 1) was meant to be a tree, but one extra cable was added somewhere, creating a loop. Given the cables in the order they were laid, write `redundant_cable(n, cables)` returning the **first** cable that connected two computers that were already connected, or `None` if there is none.

```python starter
def redundant_cable(n, cables):
    return None

print(redundant_cable(5, [(0, 1), (1, 2), (3, 4), (2, 0), (2, 3)]))
```

```python solution
def redundant_cable(n, cables):
    uf = UnionFind(n)
    for a, b in cables:
        if not uf.union(a, b):
            return (a, b)
    return None

print(redundant_cable(5, [(0, 1), (1, 2), (3, 4), (2, 0), (2, 3)]))
```

```python test
import random as _random
assert "redundant_cable" in dir(), "Keep the function's name as redundant_cable."
assert redundant_cable(5, [(0, 1), (1, 2), (3, 4), (2, 0), (2, 3)]) == (2, 0), "0, 1 and 2 are already joined when (2, 0) is laid."
assert redundant_cable(4, [(0, 1), (1, 2), (2, 3)]) is None, "A tree has no redundant cable."
assert redundant_cable(2, [(0, 1), (1, 0)]) == (1, 0), "A second cable between the same pair is redundant."
assert redundant_cable(3, [(1, 1)]) == (1, 1), "A cable from a computer to itself is redundant at once."
_r = _random.Random(2)
for _ in range(100):
    _n = _r.randint(2, 9); _cs = [(_r.randrange(_n), _r.randrange(_n)) for _ in range(_r.randint(1, 10))]
    _want, _adj = None, {i: set() for i in range(_n)}
    for _a, _b in _cs:
        _seen, _stack = {_a}, [_a]
        while _stack:
            for _w in _adj[_stack.pop()]:
                if _w not in _seen:
                    _seen.add(_w); _stack.append(_w)
        if _b in _seen:
            _want = (_a, _b); break
        _adj[_a].add(_b); _adj[_b].add(_a)
    assert redundant_cable(_n, _cs) == _want, f"Wrong answer for cables {_cs}."
"SUCCESS: A union that finds both ends already in one group means the new edge closes a cycle: detected in near-constant time per cable."
```

Hint: Union each cable in order; the lesson's `union` returns False when the two computers are already in the same group, and that cable is the answer.
:::

::: challenge Merge accounts [medium]
Each account is a list: a name, followed by one or more email addresses. Two accounts belong to the same person if they share any email address (directly, or through a chain of shared addresses). Write `merge_accounts(accounts)` returning the merged accounts as a list of `[name, email, email, ...]` lists, each with its emails **sorted** and without duplicates, and the whole list sorted. Use Union-Find over account indices: for each email, union the current account with the first account that used that email.

```python starter
def merge_accounts(accounts):
    return []

accounts = [
    ["Ann", "ann@home.com", "ann@work.com"],
    ["Ben", "ben@mail.com"],
    ["Ann", "a.lee@uni.edu", "ann@work.com"],
    ["Ann", "ann.two@mail.com"],
    ["Ben", "b@ben.net", "ben@mail.com"],
]
for row in merge_accounts(accounts):
    print(row)
```

```python solution
def merge_accounts(accounts):
    uf = UnionFind(len(accounts))
    first_owner = {}
    for i, account in enumerate(accounts):
        for email in account[1:]:
            if email in first_owner:
                uf.union(i, first_owner[email])
            else:
                first_owner[email] = i
    groups = {}
    for email, i in first_owner.items():
        groups.setdefault(uf.find(i), set()).add(email)
    return sorted([accounts[root][0]] + sorted(emails) for root, emails in groups.items())

accounts = [
    ["Ann", "ann@home.com", "ann@work.com"],
    ["Ben", "ben@mail.com"],
    ["Ann", "a.lee@uni.edu", "ann@work.com"],
    ["Ann", "ann.two@mail.com"],
    ["Ben", "b@ben.net", "ben@mail.com"],
]
for row in merge_accounts(accounts):
    print(row)
```

```python test
assert "merge_accounts" in dir(), "Keep the function's name as merge_accounts."
_acc = [["Ann", "ann@home.com", "ann@work.com"], ["Ben", "ben@mail.com"], ["Ann", "a.lee@uni.edu", "ann@work.com"], ["Ann", "ann.two@mail.com"], ["Ben", "b@ben.net", "ben@mail.com"]]
_want = [["Ann", "a.lee@uni.edu", "ann@home.com", "ann@work.com"], ["Ann", "ann.two@mail.com"], ["Ben", "b@ben.net", "ben@mail.com"]]
assert merge_accounts(_acc) == _want, f"Expected {_want}, got {merge_accounts(_acc)}."
_chain = [["Z", "a", "b"], ["Z", "c", "d"], ["Z", "b", "c"]]
assert merge_accounts(_chain) == [["Z", "a", "b", "c", "d"]], "Accounts linked through a chain of shared emails merge into one."
assert merge_accounts([["Solo", "x@x", "x@x"]]) == [["Solo", "x@x"]], "Duplicate emails inside one account appear once."
assert merge_accounts([]) == [], "No accounts, no result."
"SUCCESS: Every shared email is a union; the groups at the end are the real people. Merging duplicate records this way is a daily job in data cleaning."
```

Hint: Keep `first_owner[email]` = index of the first account with that email; on seeing it again, union the two accounts. Afterwards, group every email by `uf.find(first_owner[email])`, and build each result row from the root account's name and the sorted emails.
:::

## What you learned

- Union-Find keeps disjoint groups as trees of parent pointers; `find` follows pointers to the root, and `union` links two roots.
- Without care, trees become chains and `find` is O(n). Union by size keeps them O(log n) deep; path compression flattens every path it walks. Together, operations take near-constant time, O(α(n)).
- A union that finds two items already together detects a cycle; counting successful unions tracks the number of components as edges arrive.
- Any items can be grouped, by mapping them to indices: merging accounts, files or records that share evidence. Groups can merge but never split.

The next lesson uses Union-Find to build the cheapest network connecting every vertex: minimum spanning trees.
