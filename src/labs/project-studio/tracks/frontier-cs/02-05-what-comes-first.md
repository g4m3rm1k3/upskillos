---
title: 2.5 — What Comes First
runtime: python
support: tests/conftest.py
---

In a tree, every node has one parent. Plenty of real structures break that rule. Two lessons can both need the same earlier lesson. Two Python packages can both need NumPy. In `(a + b) * b`, the value `b` is used twice. When a node can be needed by more than one other node, the structure is a **graph**.

This lesson answers one question about graphs: **in what order can I do everything, so that each thing comes after whatever it needs?** That order is called a **topological order**. `pip` works one out before installing anything. So does every build tool. And PyTorch works one out every time it computes gradients, which you'll see at the end of the lesson and build yourself in Chapter 12.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_graph.py**:

```python file=tests/test_graph.py provided
# Tests for frontier.graph (lesson 2.5): an order that puts every node after what it needs.
import pytest

COURSE = {
    "tensors": ["python"],
    "autograd": ["tensors", "calculus"],
    "calculus": [],
    "python": [],
    "gpt": ["autograd", "tensors"],
}


def test_needs_come_first():
    from frontier.graph import order
    result = order(COURSE)
    for node, needs in COURSE.items():
        for need in needs:
            assert result.index(need) < result.index(node)


def test_shared_nodes_appear_once():
    from frontier.graph import order
    assert sorted(order(COURSE)) == sorted(COURSE)


def test_unlisted_nodes_still_appear():
    from frontier.graph import order
    assert order({"tea": ["kettle"], "kettle": ["water"]}) == ["water", "kettle", "tea"]


def test_cycles_raise_an_error():
    from frontier.graph import order
    with pytest.raises(ValueError, match="cycle"):
        order({"egg": ["chicken"], "chicken": ["egg"]})
    with pytest.raises(ValueError, match="cycle"):
        order({"me": ["me"]})
```

A graph is stored as a dictionary: each node, and the list of nodes it **needs** first. In `COURSE`, `autograd` needs `tensors` and `calculus`, and both `autograd` and `gpt` need `tensors`.

- **`order(graph)`** returns every node in a list, each after everything it needs. The first test checks that with `index`, for every node and every one of its needs.
- **Each node appears once.** `sorted(COURSE)` sorts the dictionary's keys, so the two sides match only if the result holds each node exactly once.
- **A node that is only ever needed**, like `water`, which isn't a key, still appears.
- **A graph that goes round in a circle** can't be put in order at all, and must say so. That's your Your turn.

```check
file tests/test_graph.py -- Click "Create provided tests/test_graph.py" above.
```

## Visit what it needs first

The idea is the recursion from last lesson. To place a node, first place everything it needs, then the node itself. Each need gets the same treatment, so the deepest needs end up first. This way of walking, going as deep as possible before coming back, is called **depth-first**.

`visit` does one node. `graph.get(node, [])` gives the node's needs, or an empty list for a node like `water` that isn't a key. `order` starts a visit from every key in turn, all adding to one `result` list. Create `src/frontier/graph.py`:

```python file=src/frontier/graph.py
"""A graph of things that need other things first, and an order to do them in."""


def visit(graph: dict[str, list[str]], node: str, result: list[str]) -> None:
    """Add node to result, after everything it needs."""
    for need in graph.get(node, []):
        visit(graph, need, result)
    result.append(node)


def order(graph: dict[str, list[str]]) -> list[str]:
    """Every node, each one after everything it needs."""
    result: list[str] = []
    for node in graph:
        visit(graph, node, result)
    return result
```

`visit` appends `node` only after the loop, once every need is in `result`, so needs always come first. That passes the first test. But nothing stops a node being visited again when a second node needs it, or when `order` reaches it as a key.

```predict
question: With this code, how many times does `"python"` appear in `order(COURSE)`?
choice: 1
choice: 2
choice: 5
answer: 5
explain: Every visit that reaches `python` appends it again. The visit from `tensors` reaches it, and so does the one from `autograd`, through `tensors`. `order` visits the key `python` itself. Then `gpt` reaches it twice: once through `autograd` and `tensors`, once through `tensors` alone. The whole result has 15 entries for 5 nodes.
verify: script repeated_python.py
```

Step through it. With **skip nodes that are done** switched off, as here, watch `python` and `tensors` go into the result again and again:

```figure
name: frontier/GraphOrder
caption: visit places everything a node needs, then the node. Without a done set, a node needed twice is placed twice.
props: {"graph": {"tensors": ["python"], "autograd": ["tensors", "calculus"], "calculus": [], "python": [], "gpt": ["autograd", "tensors"]}, "done": false}
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_graph.py -k needs" label="every node comes after what it needs" -- In visit, loop over graph.get(node, []) calling visit on each, then append node.
run ".venv/Scripts/python -m mypy --strict src/frontier/graph.py" stdout="Success" label="mypy --strict passes" -- visit returns None; order returns list[str], and result needs list[str].
```

## Each node once

The repeats are worse than untidy. Each repeat visit walks the node's needs all over again, and in a graph where many nodes share needs, the work can grow far faster than the graph. The fix is to remember which nodes are **done**, and return at once on reaching one.

`done` is a `set`, because the question "is it done?" is asked on every visit, and lesson 2.2 showed `in` is O(1) on a set but O(n) on a list. `result` stays a list, because it's the order that matters there. A set's `add` puts a node in it. Change `visit` and `order` in `src/frontier/graph.py`:

```python file=src/frontier/graph.py
"""A graph of things that need other things first, and an order to do them in."""


def visit(graph: dict[str, list[str]], node: str, done: set[str], result: list[str]) -> None:
    """Add node to result after everything it needs, unless it's there already."""
    if node in done:
        return
    for need in graph.get(node, []):
        visit(graph, need, done, result)
    done.add(node)
    result.append(node)


def order(graph: dict[str, list[str]]) -> list[str]:
    """Every node, each one after everything it needs."""
    done: set[str] = set()
    result: list[str] = []
    for node in graph:
        visit(graph, node, done, result)
    return result
```

Now `order(COURSE)` is `["python", "tensors", "calculus", "autograd", "gpt"]`. Each node is visited once, and each of its needs looked at once, so the whole walk is O(nodes + needs): as good as it gets, since it must at least look at everything. Step through it with the done set switched on:

```figure
name: frontier/GraphOrder
caption: With a done set, a node already placed is skipped at once, so each node is placed exactly once.
props: {"graph": {"tensors": ["python"], "autograd": ["tensors", "calculus"], "calculus": [], "python": [], "gpt": ["autograd", "tensors"]}, "done": true}
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_graph.py -k shared" label="a node needed twice appears once" -- Return at the start of visit if node is in done; add it to done just before appending it.
run ".venv/Scripts/python -m pytest -q tests/test_graph.py -k unlisted" label="a node that is only needed still appears" -- Use graph.get(node, []) so a node that isn't a key has no needs.
run ".venv/Scripts/python -m mypy --strict src/frontier/graph.py" stdout="Success" label="mypy --strict still passes" -- done is set[str], in both functions.
```

## Backwards: the order for gradients

Here's where this is going. A calculation is a graph: each value needs the values it's computed from. In `e = (a + b) * b`, write `c = a + b`. Then `e` needs `c` and `b`, and `c` needs `a` and `b`. Computing the values in topological order guarantees every input is ready before it's used.

Training a network needs the opposite trip. It asks how much `e` changes when each input changes, its **gradient**, and that information flows backwards, from `e` towards `a` and `b`. Create `experiments/backward_order.py`:

```python file=experiments/backward_order.py
"""The order to compute (a + b) * b, and the order to compute its gradients."""
from frontier.graph import order

# e = c * b, where c = a + b: each value, and the values it's computed from.
EXPRESSION = {"e": ["c", "b"], "c": ["a", "b"], "a": [], "b": []}

forward = order(EXPRESSION)
print("values, in the order:", forward)
print("gradients, in the order:", forward[::-1])
```

`forward[::-1]` is the list reversed, a slice with a step of -1, as in lesson 2.3. Run it:

```powershell
.venv\Scripts\python experiments/backward_order.py
```

Values go `a, b, c, e`; gradients go `e, c, b, a`. The reverse order matters because of `b`. It's used twice, by `c` and by `e`, so its gradient has two parts, one from each use, and it isn't complete until both have arrived. Reversing a topological order guarantees that every node comes after **all** the nodes that use it. With `a = 2` and `b = 3`, `b`'s gradient is 5 from `e` directly, plus 3 by way of `c`: 8 in all. In Chapter 12 you'll build a `backward()` that does this for any calculation, and its first line works out exactly this order.

```check
run ".venv/Scripts/python experiments/backward_order.py" stdout="gradients, in the order: ['e', 'c', 'b', 'a']" label="the gradients go in the reverse order" -- Print forward[::-1], the forward order reversed.
```

## Your turn: going round in a circle

Some graphs have no order at all. If an egg needs a chicken first, and the chicken needs an egg, nothing can come first. A path that leads back to where it started is a **cycle**. Right now, `order({"egg": ["chicken"], "chicken": ["egg"]})` visits egg, then chicken, then egg again, for ever, until Python stops it with a `RecursionError` like the one in lesson 2.4. That error says nothing about the real problem.

**Build, on your own:** a check in `src/frontier/graph.py` that raises `ValueError` with a message containing the word `cycle` when the graph has one.

Done nodes aren't enough to spot it, because a node is only done once all its needs are. You need a second set, `visiting`: the nodes whose visit has started but not finished, which are exactly the ones on the call stack right now. `visit` adds its node to `visiting` before visiting its needs, and takes it out afterwards with `visiting.remove(node)`, just before it's done. Reaching a node that is in `visiting` means the path has come back round to a node still waiting on it: a cycle. Give `visit` one more parameter, `visiting: set[str]`, and have `order` pass in a new empty set.

```hints
nudge: The new check goes near the top of visit, after the done check: if the node is in visiting, raise.
concept: `visiting` holds the visits that have started and not finished. Add the node to it before the loop over its needs, remove it after the loop, then add it to done. Every recursive call passes `visiting` on, like `done`.
answer: In `src/frontier/graph.py`:
~~~python
def visit(graph: dict[str, list[str]], node: str, done: set[str], visiting: set[str], result: list[str]) -> None:
    """Add node to result after everything it needs, unless it's there already."""
    if node in done:
        return
    if node in visiting:
        raise ValueError(f"cycle through {node}")
    visiting.add(node)
    for need in graph.get(node, []):
        visit(graph, need, done, visiting, result)
    visiting.remove(node)
    done.add(node)
    result.append(node)


def order(graph: dict[str, list[str]]) -> list[str]:
    """Every node, each one after everything it needs."""
    done: set[str] = set()
    visiting: set[str] = set()
    result: list[str] = []
    for node in graph:
        visit(graph, node, done, visiting, result)
    return result
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_graph.py -k cycles" label="a cycle raises ValueError" -- Raise ValueError(f"cycle through {node}") when visit reaches a node that is in visiting.
run ".venv/Scripts/python -m pytest -q tests/test_graph.py" label="every graph test still passes" -- Check for done before visiting, and pass visiting on in every recursive call.
run ".venv/Scripts/python -m mypy --strict src/frontier/graph.py" stdout="Success" label="mypy --strict still passes" -- visiting is set[str], in visit's parameters and in order.
run ".venv/Scripts/python experiments/backward_order.py" stdout="gradients, in the order: ['e', 'c', 'b', 'a']" label="the experiment still runs" -- order should still take just the graph.
```

## Python's own, and onto GitHub

Python has this built in too, in the `graphlib` module. `graphlib.TopologicalSorter` takes a graph in the same shape as yours, a dictionary from each node to what it needs, and `static_order()` gives back an order. Try it:

```powershell
.venv\Scripts\python -c "import graphlib; print(list(graphlib.TopologicalSorter({'gpt': ['autograd', 'tensors'], 'autograd': ['tensors'], 'tensors': []}).static_order()))"
```

It prints `['tensors', 'autograd', 'gpt']`. A graph can have more than one correct order, and `graphlib` doesn't promise the same one as yours: on `COURSE`, it puts `calculus` before `tensors`. Both are right, since neither needs the other. On a cycle, it raises `graphlib.CycleError`.

Commit and push:

```powershell
git add .
git commit -m "Put a graph in order, and spot cycles"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  graph.py               visit and order: a topological order by depth-first search, with cycles reported
experiments/
  backward_order.py      the order for computing values, and its reverse for gradients
tests/
  test_graph.py
```

Every structure in the series so far has held exact values: words, counts, positions. The next lesson is about the numbers inside every model, which are **not** exact. Floats round, overflow and lose digits, and you'll see how a model's softmax would break without a one-line fix.
