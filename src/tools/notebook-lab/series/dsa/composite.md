# Composite

A gearbox is made of a housing, two shafts and a gear set; the gear set is made of gears and bearings; a bearing is a single bought-in part. Asking "what does the gearbox cost?" or "what does it weigh?" means asking each piece, and some pieces answer by asking their own pieces. The **composite** pattern lets single objects (leaves) and groups of objects (composites) be treated the same way, through one interface. A composite answers each question by combining its children's answers, and the children may themselves be composites, to any depth.

The binary trees lesson built trees for searching. Composite trees model **part-of** structures: assemblies, folders, menus, documents, drawings, organisation charts, and the expression trees of the interpreter lesson to come. Code that uses them never needs to know whether it holds a single part or a whole tree.

This lesson covers:

- the problem: code full of "is this a part or an assembly?" checks;
- the composite pattern: one interface for leaves and composites, answered recursively;
- traversals: flattening a tree, with quantities;
- the design choice between safety and transparency for child-management methods.

## The problem: two kinds of thing everywhere

A workshop's bill of materials (BOM) has parts and assemblies. Without a shared interface, every calculation must check which it has. Predict before reading on: how many functions need the same `if` when "weight" and "lead time" are added next to "cost"?

```python type
part_prices = {"bolt": 0.4, "bearing": 6.5, "gear": 14.0, "shaft": 22.0, "housing": 85.0}
gear_set = {"name": "gear set", "labour": 12.0, "items": [("gear", 2), ("bearing", 4)]}
gearbox = {"name": "gearbox", "labour": 40.0, "items": [("housing", 1), ("shaft", 2), (gear_set, 1), ("bolt", 12)]}

def cost(item):
    if isinstance(item, str):
        return part_prices[item]
    return item["labour"] + sum(cost(child) * qty for child, qty in item["items"])

print(cost(gearbox))
```

```output
239.8
```

`cost` has to know both shapes of data: a part is a string looked up in a price table, an assembly is a dict with items. Every new calculation (weight, lead time, a parts list) repeats the same branch, and a third kind of item, such as a bought-in sub-assembly with a fixed price, means editing all of them.

## One interface for parts and assemblies

Give both kinds the same methods. A `Part` (a leaf) answers from its own data. An `Assembly` (a composite) holds children with quantities, and answers by asking each child and combining the answers. The calling code just calls `cost()` or `weight()` on whatever it holds. Predict before running: what does the gear set cost on its own, and is it any different to ask the whole gearbox?

```python type
class Part:
    def __init__(self, name, price, kg):
        self.name, self.price, self.kg = name, price, kg
    def cost(self):
        return self.price
    def weight(self):
        return self.kg

class Assembly:
    def __init__(self, name, labour):
        self.name, self.labour = name, labour
        self.children = []
    def add(self, component, quantity=1):
        self.children.append((component, quantity))
        return self
    def cost(self):
        return self.labour + sum(child.cost() * qty for child, qty in self.children)
    def weight(self):
        return sum(child.weight() * qty for child, qty in self.children)

bolt, bearing, gear = Part("bolt", 0.4, 0.02), Part("bearing", 6.5, 0.3), Part("gear", 14.0, 1.1)
shaft, housing = Part("shaft", 22.0, 2.4), Part("housing", 85.0, 9.5)

gear_set = Assembly("gear set", labour=12.0).add(gear, 2).add(bearing, 4)
gearbox = Assembly("gearbox", labour=40.0).add(housing).add(shaft, 2).add(gear_set).add(bolt, 12)

for item in [bolt, gear_set, gearbox]:
    print(f"{item.name:<9} cost £{item.cost():7.2f}   weight {item.weight():5.2f} kg")
```

```output
bolt      cost £   0.40   weight  0.02 kg
gear set  cost £  66.00   weight  3.40 kg
gearbox   cost £ 239.80   weight 17.94 kg
```

`add` returns `self`, so assemblies can be built with chained calls, as in the builder lesson.

The gear set costs £66.00 by itself (12 + 2 × 14 + 4 × 6.5), and the gearbox's £239.80 includes it, through exactly the same call. Neither `cost` nor `weight` contains a type check. The recursion ends at the parts, because a part answers without asking anyone. A bought-in sub-assembly would be one new class with `cost` and `weight` methods, and every existing assembly and calculation would accept it.

## Walking the tree

Many questions need more than a single number: "list every part, with the total quantity needed to build one gearbox", for ordering. This is a **traversal**. Each node passes the request down, and quantities multiply along the way: one gearbox needs 1 gear set, which needs 2 gears, so 2 gears per gearbox. A generator method that yields `(part, quantity)` pairs keeps the walking in one place, and every flattening question can reuse it. Predict before running: how many bearings does an order of 5 gearboxes need?

```python type
from collections import Counter

def walk(component, multiplier=1):
    if isinstance(component, Part):
        yield component, multiplier
    else:
        for child, qty in component.children:
            yield from walk(child, multiplier * qty)

def parts_list(component, units=1):
    totals = Counter()
    for part, qty in walk(component, units):
        totals[part.name] += qty
    return dict(sorted(totals.items()))

print(parts_list(gearbox))
print("for 5 gearboxes:", parts_list(gearbox, 5))

def depth(component):
    if isinstance(component, Part):
        return 0
    return 1 + max((depth(child) for child, _ in component.children), default=0)

print("levels of assembly:", depth(gearbox))
```

```output
{'bearing': 4, 'bolt': 12, 'gear': 2, 'housing': 1, 'shaft': 2}
for 5 gearboxes: {'bearing': 20, 'bolt': 60, 'gear': 10, 'housing': 5, 'shaft': 10}
levels of assembly: 2
```

`walk` checks the type once, in one place: the boundary between leaves and composites. Putting `walk` as a method on both classes would remove even that check. Sometimes one well-placed check in a traversal helper is the simpler choice.

5 gearboxes need 20 bearings: 4 per gear set, 1 gear set per gearbox. The traversal visits each node once per path to it, so its cost grows with the size of the expanded tree. `Counter` adds up a part that appears in several places, such as bolts used in different sub-assemblies.

## Safety or transparency?

Where should `add` live? This is the pattern's classic design choice.

- **Transparency**: put `add` in the shared interface, so leaves have it too, raising an error when called. Client code can treat every node identically, but a mistake (adding to a bolt) only shows up when the program runs.
- **Safety**: put `add` only on composites, as above. Client code must know it holds an assembly before adding to it, but a leaf has no `add` at all, so a type checker or editor can flag the mistake before the program runs. Without one, Python still reports it only at run time, as an `AttributeError`.

Python code usually chooses safety: the shared interface is the operations every node really supports (`cost`, `weight`), and building the tree happens in code that knows what it is building. Either way, keep a composite from containing itself, directly or through its children, unless you mean to. A cycle would make every recursive question loop until the recursion limit stops it.

::: challenge Folder sizes [easy]
Write a tiny composite for a file system. `File(name, size)` has `size()` returning its size and `count_files()` returning 1. `Folder(name)` has `add(item)`, which appends a file or folder and returns the folder; `size()`, the total size of everything inside it at any depth; and `count_files()`, the number of files inside it at any depth (folders are not counted). An empty folder has size 0 and 0 files. Neither `size` nor `count_files` should check types: each class answers in its own way.

```python starter
class File:
    def __init__(self, name, size):
        self.name, self._size = name, size

class Folder:
    def __init__(self, name):
        self.name, self.items = name, []

print("write File and Folder")
```

```python solution
class File:
    def __init__(self, name, size):
        self.name, self._size = name, size
    def size(self):
        return self._size
    def count_files(self):
        return 1

class Folder:
    def __init__(self, name):
        self.name, self.items = name, []
    def add(self, item):
        self.items.append(item)
        return self
    def size(self):
        return sum(item.size() for item in self.items)
    def count_files(self):
        return sum(item.count_files() for item in self.items)

docs = Folder("docs").add(File("a.pdf", 300)).add(Folder("old").add(File("b.txt", 20)))
print(docs.size(), docs.count_files())
```

```python test
import ast as _ast
for _n in ["File", "Folder"]:
    assert _n in dir(), f"Define {_n}."
_root = Folder("root").add(File("readme", 4)).add(Folder("src").add(File("main.py", 120)).add(File("util.py", 60)).add(Folder("empty"))).add(Folder("data").add(Folder("raw").add(File("log.csv", 900))))
assert _root.size() == 1084, f"Total size is 4 + 120 + 60 + 900 = 1084; got {_root.size()}."
assert _root.count_files() == 4, f"Four files at any depth; got {_root.count_files()}."
assert Folder("e").size() == 0 and Folder("e").count_files() == 0, "An empty folder: size 0, no files."
assert File("x", 7).size() == 7 and File("x", 7).count_files() == 1, "A file answers for itself."
_f = Folder("f")
assert _f.add(File("y", 1)) is _f, "add returns the folder, so calls can be chained."
_calls = [_n.func.id for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.Call) and isinstance(_n.func, _ast.Name)]
assert "isinstance" not in _calls and "type" not in _calls, "No type checks: each class answers size() and count_files() in its own way."
class _Link:
    def size(self): return 1
    def count_files(self): return 0
assert Folder("g").add(_Link()).add(File("z", 5)).size() == 6, "A folder should accept any item with size() and count_files()."
"SUCCESS: Files and folders answer the same two questions, so a folder can hold anything, and code never asks which kind it has."
```

Hint: `File.size` returns its size and `count_files` returns 1. `Folder.size` is `sum(item.size() for item in self.items)`, and `count_files` is the same with `count_files()`. `add` appends and returns `self`.
:::

::: challenge Lead times through the tree [medium]
Extend the lesson's idea with a new kind of question. Write `Part(name, price, lead_days)` and `Assembly(name, labour, build_days)` (with `add(component, quantity=1)` returning `self`), both offering:

- `cost()`: as in the lesson (labour plus children's costs times quantities);
- `lead_time()`: for a part, its `lead_days`; for an assembly, its `build_days` **plus the longest** lead time of its children (children are sourced in parallel, then assembled). An assembly with no children takes just its `build_days`;
- `critical_path()`: a list of names from this component down to the part that sets its lead time, following at each assembly the child with the longest lead time (the first such child if tied). For a part, it is just `[name]`.

```python starter
class Part:
    def __init__(self, name, price, lead_days):
        self.name, self.price, self.lead_days = name, price, lead_days

class Assembly:
    def __init__(self, name, labour, build_days):
        self.name, self.labour, self.build_days = name, labour, build_days
        self.children = []

print("write cost, lead_time and critical_path")
```

```python solution
class Part:
    def __init__(self, name, price, lead_days):
        self.name, self.price, self.lead_days = name, price, lead_days
    def cost(self):
        return self.price
    def lead_time(self):
        return self.lead_days
    def critical_path(self):
        return [self.name]

class Assembly:
    def __init__(self, name, labour, build_days):
        self.name, self.labour, self.build_days = name, labour, build_days
        self.children = []
    def add(self, component, quantity=1):
        self.children.append((component, quantity))
        return self
    def cost(self):
        return self.labour + sum(child.cost() * qty for child, qty in self.children)
    def _slowest(self):
        best, best_time = None, None
        for child, _ in self.children:
            t = child.lead_time()
            if best_time is None or t > best_time:
                best, best_time = child, t
        return best
    def lead_time(self):
        return self.build_days + max((child.lead_time() for child, _ in self.children), default=0)
    def critical_path(self):
        slowest = self._slowest()
        return [self.name] + (slowest.critical_path() if slowest else [])

motor = Part("motor", 120, 21)
frame = Assembly("frame", 30, 2).add(Part("tube", 8, 3), 6).add(Part("plate", 15, 5))
drive = Assembly("drive", 25, 1).add(motor).add(Part("belt", 9, 4))
conveyor = Assembly("conveyor", 60, 3).add(frame).add(drive)
print(conveyor.cost(), conveyor.lead_time(), conveyor.critical_path())
```

```python test
for _n in ["Part", "Assembly"]:
    assert _n in dir(), f"Define {_n}."
_motor = Part("motor", 120, 21)
_frame = Assembly("frame", 30, 2).add(Part("tube", 8, 3), 6).add(Part("plate", 15, 5))
_drive = Assembly("drive", 25, 1).add(_motor).add(Part("belt", 9, 4))
_conv = Assembly("conveyor", 60, 3).add(_frame).add(_drive)
assert _conv.cost() == 60 + (30 + 48 + 15) + (25 + 120 + 9), f"cost should be 307; got {_conv.cost()}."
assert _frame.lead_time() == 7 and _drive.lead_time() == 22 and _conv.lead_time() == 25, f"Lead times: frame 2 + 5, drive 1 + 21, conveyor 3 + 22; got {_frame.lead_time()}, {_drive.lead_time()}, {_conv.lead_time()}."
assert _conv.critical_path() == ["conveyor", "drive", "motor"], f"The motor sets the pace; got {_conv.critical_path()}."
assert _motor.critical_path() == ["motor"] and _motor.lead_time() == 21, "A part's path is just itself."
assert Assembly("kit", 5, 2).lead_time() == 2 and Assembly("kit", 5, 2).critical_path() == ["kit"], "An empty assembly takes its build time; its path is itself."
_tie = Assembly("t", 0, 1).add(Part("a", 1, 4)).add(Part("b", 1, 4))
assert _tie.critical_path() == ["t", "a"], "On a tie, follow the first child."
_deep = Assembly("L0", 0, 1)
_node = _deep
for _i in range(1, 6):
    _next = Assembly(f"L{_i}", 0, 1)
    _node.add(_next).add(Part(f"p{_i}", 1, 2))
    _node = _next
_node.add(Part("slow", 1, 10))
assert _deep.lead_time() == 16 and _deep.critical_path() == ["L0", "L1", "L2", "L3", "L4", "L5", "slow"], f"Deep trees: 6 build days plus 10; got {_deep.lead_time()} and {_deep.critical_path()}."
"SUCCESS: A new question about the whole tree is one method on each class, and the answer flows up from the parts through every level of assembly."
```

Hint: Give `Assembly` a helper that returns its child with the largest `lead_time()` (or None if it has no children); `max(..., key=..., default=None)` keeps the first of equal values. `lead_time` adds `build_days` to that child's lead time, and `critical_path` puts the assembly's own name in front of that child's path.
:::

::: challenge A tree of conditions [hard]
Quality rules for inspected parts are built from simple tests combined with AND, OR and NOT, to any depth: a composite of conditions. Write four classes sharing two methods, `matches(record)` returning True or False for a dict `record`, and `describe()` returning a readable string:

- `Test(field, op, value)` with `op` one of `"<"`, `"<="`, `">"`, `">="`, `"=="`, `"!="`; it matches if `record[field] op value` (a missing field never matches); described as `f"{field} {op} {value!r}"`;
- `All(*conditions)` matches when every condition matches (an empty `All` matches everything); described as the conditions' descriptions joined by `" and "`, in brackets;
- `Any(*conditions)` matches when at least one matches (an empty `Any` matches nothing); joined by `" or "`, in brackets;
- `Not(condition)`: described as `f"not {condition.describe()}"`.

Then write `failing(records, rule)`, returning the list of records that do **not** match the rule, in their original order.

```python starter
class Test:
    def __init__(self, field, op, value):
        self.field, self.op, self.value = field, op, value

print("write Test, All, Any, Not and failing")
```

```python solution
import operator

class Test:
    OPS = {"<": operator.lt, "<=": operator.le, ">": operator.gt, ">=": operator.ge, "==": operator.eq, "!=": operator.ne}
    def __init__(self, field, op, value):
        if op not in self.OPS:
            raise ValueError(f"unknown operator {op!r}")
        self.field, self.op, self.value = field, op, value
    def matches(self, record):
        return self.field in record and self.OPS[self.op](record[self.field], self.value)
    def describe(self):
        return f"{self.field} {self.op} {self.value!r}"

class All:
    def __init__(self, *conditions):
        self.conditions = conditions
    def matches(self, record):
        return all(c.matches(record) for c in self.conditions)
    def describe(self):
        return "(" + " and ".join(c.describe() for c in self.conditions) + ")"

class Any:
    def __init__(self, *conditions):
        self.conditions = conditions
    def matches(self, record):
        return any(c.matches(record) for c in self.conditions)
    def describe(self):
        return "(" + " or ".join(c.describe() for c in self.conditions) + ")"

class Not:
    def __init__(self, condition):
        self.condition = condition
    def matches(self, record):
        return not self.condition.matches(record)
    def describe(self):
        return f"not {self.condition.describe()}"

def failing(records, rule):
    return [r for r in records if not rule.matches(r)]

rule = All(Test("diameter", ">=", 9.98), Test("diameter", "<=", 10.02), Not(Test("finish", "==", "scratched")))
print(rule.describe())
print(failing([{"diameter": 10.0, "finish": "ok"}, {"diameter": 10.05, "finish": "ok"}], rule))
```

```python test
for _n in ["Test", "All", "Any", "Not", "failing"]:
    assert _n in dir(), f"Define {_n}."
_rule = All(Test("diameter", ">=", 9.98), Test("diameter", "<=", 10.02), Any(Test("finish", "==", "polished"), Test("grade", "==", "B")), Not(Test("batch", "==", "X13")))
assert _rule.describe() == "(diameter >= 9.98 and diameter <= 10.02 and (finish == 'polished' or grade == 'B') and not batch == 'X13')", f"Got {_rule.describe()!r}."
_good = {"diameter": 10.0, "finish": "polished", "grade": "A", "batch": "X12"}
_parts = [_good, dict(_good, diameter=10.03), dict(_good, finish="rough"), dict(_good, finish="rough", grade="B"), dict(_good, batch="X13"), {"diameter": 10.0}]
assert [_rule.matches(_p) for _p in _parts] == [True, False, False, True, False, False], f"Got {[_rule.matches(_p) for _p in _parts]}."
assert failing(_parts, _rule) == [_parts[1], _parts[2], _parts[4], _parts[5]], "failing returns the records that do not match, in order."
assert Test("x", "!=", 3).matches({"x": 4}) and not Test("x", "<", 3).matches({}), "A missing field never matches."
assert All().matches({}) and not Any().matches({}), "An empty All matches everything; an empty Any matches nothing."
assert Not(Not(Test("a", "==", 1))).matches({"a": 1}) and Not(Not(Test("a", "==", 1))).describe() == "not not a == 1", "Conditions nest to any depth."
_deep = Test("v", ">", 0)
for _ in range(50):
    _deep = All(_deep, Any(Test("v", ">", 0)))
assert _deep.matches({"v": 1}) and not _deep.matches({"v": 0}), "Deep nesting works the same way."
class _Even:
    def matches(self, record): return record.get("n", 1) % 2 == 0
    def describe(self): return "n is even"
assert All(_Even(), Test("n", "<", 10)).matches({"n": 4}) and All(_Even()).describe() == "(n is even)", "Composites should accept any condition with matches() and describe()."
"SUCCESS: Simple tests and combinations share one interface, so rules nest to any depth and any new kind of condition fits inside them."
```

Hint: `Test` can map each operator string to a function from the `operator` module (`operator.lt` and so on). `All.matches` is `all(c.matches(record) for c in self.conditions)`, and `Any` uses `any`. Each `describe` builds its text from its children's `describe()`, wrapped in brackets for `All` and `Any`.
:::

## What you learned

- A composite lets single objects (leaves) and groups (composites) share one interface. Code asks any node the same question, and composites answer by combining their children's answers, recursively, to any depth.
- New kinds of node fit in without changing the code that uses the tree, because nobody checks which kind it holds.
- Traversals walk the whole tree. Quantities multiply along each path, and a generator keeps the walking in one place.
- Child-management methods can be safe (only on composites) or transparent (on every node, failing on leaves). Python code usually chooses safety. Avoid cycles, which would make recursive questions loop.

The next lesson places a stand-in in front of an object to control access to it: the proxy pattern, for lazy loading, caching and permission checks.
