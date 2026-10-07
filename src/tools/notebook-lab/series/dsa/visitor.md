# Visitor

The polymorphism lesson ended with a trade-off. Putting each operation in the classes as a method makes **new types** cheap but **new operations** expensive: a new operation means editing every class. Some structures are the other way round. A CAD part is built from a fixed set of feature types (holes, pockets, chamfers), but the operations on parts keep coming: estimate the machining time, generate G-code, check the design rules, draw a preview, list the tools needed. Adding each as a method to every feature class would turn simple data classes into a dumping ground for every concern in the program.

The **visitor** pattern moves each operation out into its own class, a **visitor**, with one method per node type. The structure only needs a single, general way to let a visitor in. A new operation is then a new visitor, and the node classes never change. It is how compilers work: a fixed set of syntax-tree node types and many passes over them, such as checking, optimising and generating code. Python's own `ast` module provides exactly this.

This lesson covers:

- the problem: every new operation edits every node class;
- the classic visitor with `accept` and double dispatch;
- the Python way: dispatching on the node's class name, as `ast.NodeVisitor` does;
- visiting real Python code with `ast`, and the trade-off the pattern makes.

## The problem: operations piling into the node classes

A part is a list of features. The machining-time estimate was added as a method on each feature class, then the G-code generator, then the design-rule check. Predict before reading on: what does adding a "list the tools needed" operation touch?

```python type
class Hole:
    def __init__(self, x, y, diameter, depth):
        self.x, self.y, self.diameter, self.depth = x, y, diameter, depth
    def machining_seconds(self):
        return 4 + self.depth * 0.8
    def gcode(self):
        return [f"G81 X{self.x} Y{self.y} Z-{self.depth}"]
    def check(self):
        return [] if self.diameter >= 2 else [f"hole at {(self.x, self.y)} is too small to drill"]

class Pocket:
    def __init__(self, x, y, w, h, depth):
        self.x, self.y, self.w, self.h, self.depth = x, y, w, h, depth
    def machining_seconds(self):
        return self.w * self.h * self.depth / 50
    def gcode(self):
        return [f"(pocket {self.w}x{self.h} at {self.x},{self.y})", f"G1 Z-{self.depth}"]
    def check(self):
        return [] if self.depth <= 3 * min(self.w, self.h) else ["pocket is too deep for its width"]

part = [Hole(10, 10, 6, 12), Pocket(30, 5, 20, 15, 4), Hole(60, 10, 1.5, 3)]
print(sum(f.machining_seconds() for f in part), [line for f in part for line in f.gcode()], [e for f in part for e in f.check()])
```

```output
44.0 ['G81 X10 Y10 Z-12', '(pocket 20x15 at 30,5)', 'G1 Z-4', 'G81 X60 Y10 Z-3'] ['hole at (60, 10) is too small to drill']
```

Every operation lives scattered across every feature class: the G-code generator's knowledge is spread over `Hole.gcode`, `Pocket.gcode` and so on, and none of it can be read in one place. A tool-list operation means editing every class again. The feature classes, which should just describe geometry, depend on timing tables, machine dialects and design rules.

## The classic visitor: double dispatch

Strip the operations out of the features. Each feature keeps only its data and one method, `accept(visitor)`, which calls the visitor method for its own type: a hole calls `visitor.visit_hole(self)`. Each operation becomes a visitor class with one method per feature type. This two-step call, first on the node and then on the visitor, is called **double dispatch**: which code runs depends on **both** the node's type and the visitor's type. Predict before running: how many classes must change to add the tool list?

```python type
class Hole:
    def __init__(self, x, y, diameter, depth):
        self.x, self.y, self.diameter, self.depth = x, y, diameter, depth
    def accept(self, visitor):
        return visitor.visit_hole(self)

class Pocket:
    def __init__(self, x, y, w, h, depth):
        self.x, self.y, self.w, self.h, self.depth = x, y, w, h, depth
    def accept(self, visitor):
        return visitor.visit_pocket(self)

class MachiningTime:
    def visit_hole(self, hole):
        return 4 + hole.depth * 0.8
    def visit_pocket(self, pocket):
        return pocket.w * pocket.h * pocket.depth / 50

class ToolList:
    def visit_hole(self, hole):
        return {f"drill {hole.diameter} mm"}
    def visit_pocket(self, pocket):
        return {f"end mill {min(6, pocket.w // 2)} mm"}

part = [Hole(10, 10, 6, 12), Pocket(30, 5, 20, 15, 4), Hole(60, 10, 6, 3)]
print("seconds:", sum(f.accept(MachiningTime()) for f in part))
print("tools:", sorted(set().union(*(f.accept(ToolList()) for f in part))))
```

```output
seconds: 44.0
tools: ['drill 6 mm', 'end mill 6 mm']
```

`set().union(*sets)` merges a sequence of sets into one.

The tool list was one new class and no change to `Hole` or `Pocket`. Each operation is now readable in one place: everything about machining time is in `MachiningTime`. The cost of the pattern is also visible: a new **feature type** (say, a `Chamfer`) needs a new method in **every** visitor. Visitor makes the trade the opposite way round from ordinary methods, so use it where the node types are stable and the operations keep growing.

## The Python way: dispatch by class name

Python can find the right method by name, so the nodes do not need `accept` methods at all. A small base class looks up `"visit_" + type(node).__name__` with `getattr`, and falls back to a `generic_visit` method if there is no specific one. The lookup is exactly how Python's own `ast.NodeVisitor` works (its `generic_visit` walks the children instead of raising). The fallback is where tree structures get handled. For a composite node, `generic_visit` can visit the children, so a visitor only needs methods for the node types it actually cares about. Predict before running: what does the counting visitor report for the nested assembly?

```python type
class Visitor:
    def visit(self, node):
        method = getattr(self, "visit_" + type(node).__name__, self.generic_visit)
        return method(node)
    def generic_visit(self, node):
        raise TypeError(f"{type(self).__name__} cannot visit {type(node).__name__}")

class Group:
    def __init__(self, name, *features):
        self.name, self.features = name, list(features)

class Time(Visitor):
    def visit_Hole(self, h):
        return 4 + h.depth * 0.8
    def visit_Pocket(self, p):
        return p.w * p.h * p.depth / 50
    def visit_Group(self, g):
        return sum(self.visit(f) for f in g.features)

class CountHoles(Visitor):
    def __init__(self):
        self.count = 0
    def visit_Hole(self, h):
        self.count += 1
    def generic_visit(self, node):
        for child in getattr(node, "features", []):
            self.visit(child)

bracket = Group("bracket", Hole(5, 5, 6, 8), Group("boss", Hole(20, 20, 4, 6), Pocket(18, 18, 10, 10, 3)), Hole(40, 5, 6, 8))
print("time:", round(Time().visit(bracket), 1), "s")
counter = CountHoles()
counter.visit(bracket)
print("holes:", counter.count)
try:
    Time().visit("a sketch")
except TypeError as error:
    print("TypeError:", error)
```

```output
time: 35.6 s
holes: 3
TypeError: Time cannot visit str
```

`CountHoles` defines only `visit_Hole`. For a `Group` or a `Pocket`, `visit` finds no specific method and calls `generic_visit`, which walks into any children.

The time visitor handles three node types explicitly. The hole counter handles one and lets `generic_visit` walk everything else, finding all 3 holes, including the one inside the nested group. Visiting an unknown type gives a clear error naming the visitor and the type.

## Visiting real Python code

Python's `ast` module parses source code into a tree of nodes (`FunctionDef`, `Call`, `Name`, `BinOp` and dozens more), and `ast.NodeVisitor` visits them with exactly the name-based dispatch above. Its `generic_visit` visits all children, so a visitor overrides only the node types it cares about, and must call `self.generic_visit(node)` itself to keep descending past them. Linters, code formatters and test tools are built from such visitors. Predict before running: which functions does this little program define, and which does it call?

```python type
import ast

source = """
def clamp(x, low, high):
    return max(low, min(x, high))

def scaled(values, factor):
    return [clamp(v * factor, 0, 100) for v in values]

print(scaled([10, 40, 70], 1.5))
"""

class Overview(ast.NodeVisitor):
    def __init__(self):
        self.defined, self.called = [], []
    def visit_FunctionDef(self, node):
        self.defined.append(f"{node.name}({', '.join(a.arg for a in node.args.args)})")
        self.generic_visit(node)
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            self.called.append(node.func.id)
        self.generic_visit(node)

overview = Overview()
overview.visit(ast.parse(source))
print("defined:", overview.defined)
print("called:", overview.called)
```

```output
defined: ['clamp(x, low, high)', 'scaled(values, factor)']
called: ['max', 'min', 'clamp', 'print', 'scaled']
```

`ast.parse(text)` returns the tree without running the code. Inside `visit_Call`, `node.func` is the expression being called: a `Name` for a plain function.

Two functions are defined. The calls are listed in the order the visitor meets them, top to bottom through the file: `max` and `min` inside `clamp`, `clamp` inside `scaled`, then on the last line `print` before `scaled`, because the outer call is visited before the call inside its brackets. The visitor examined the code without running it. That is how tools find unused variables or forbidden calls. (The course's own challenge tests use `ast` this way to check, for example, that a solution does not call `isinstance`.)

::: challenge A new operation, no edits [easy]
Using the lesson's `Visitor` base class and the `Hole`, `Pocket` and `Group` classes (do not change any of them), write a visitor `GCode` whose `visit` returns a list of program lines:

- a `Hole` gives `[f"G81 X{x} Y{y} Z-{depth} (drill {diameter})"]`;
- a `Pocket` gives `[f"(pocket {w}x{h} at {x},{y})", f"G1 Z-{depth}"]`;
- a `Group` gives `[f"(begin {name})"]`, then the lines of each of its features in order, then `[f"(end {name})"]`.

Unknown types should still raise the base class's `TypeError`.

```python starter
class GCode(Visitor):
    pass

print("write visit_Hole, visit_Pocket and visit_Group")
```

```python solution
class GCode(Visitor):
    def visit_Hole(self, h):
        return [f"G81 X{h.x} Y{h.y} Z-{h.depth} (drill {h.diameter})"]
    def visit_Pocket(self, p):
        return [f"(pocket {p.w}x{p.h} at {p.x},{p.y})", f"G1 Z-{p.depth}"]
    def visit_Group(self, g):
        lines = [f"(begin {g.name})"]
        for feature in g.features:
            lines += self.visit(feature)
        return lines + [f"(end {g.name})"]

print(GCode().visit(Hole(1, 2, 6, 5)))
```

```python test
assert "GCode" in dir() and issubclass(GCode, Visitor), "Write GCode as a Visitor subclass."
assert GCode().visit(Hole(1, 2, 6, 5)) == ["G81 X1 Y2 Z-5 (drill 6)"], "A hole is one drilling line."
assert GCode().visit(Pocket(3, 4, 20, 10, 2)) == ["(pocket 20x10 at 3,4)", "G1 Z-2"], "A pocket is two lines."
_part = Group("bracket", Hole(5, 5, 6, 8), Group("boss", Pocket(18, 18, 10, 10, 3)), Hole(40, 5, 6, 8))
assert GCode().visit(_part) == ["(begin bracket)", "G81 X5 Y5 Z-8 (drill 6)", "(begin boss)", "(pocket 10x10 at 18,18)", "G1 Z-3", "(end boss)", "G81 X40 Y5 Z-8 (drill 6)", "(end bracket)"], f"Got {GCode().visit(_part)}."
assert GCode().visit(Group("empty")) == ["(begin empty)", "(end empty)"], "An empty group."
for _cls in [Hole, Pocket, Group]:
    assert not any("gcode" in _n.lower() for _n in vars(_cls)), f"{_cls.__name__} should not need any change."
try:
    GCode().visit(3.5)
    assert False, "Unknown node types should still raise TypeError from the base class."
except TypeError:
    pass
"SUCCESS: A whole new operation lives in one class, and the feature classes never knew it was added."
```

Hint: Write `visit_Hole`, `visit_Pocket` and `visit_Group`, named after the classes. In `visit_Group`, call `self.visit(feature)` for each child and concatenate the lists between the begin and end lines.
:::

::: challenge A code checker with ast [medium]
Write `check_code(source)`, which parses Python source with `ast.parse` and uses an `ast.NodeVisitor` subclass to return a dict:

- `"functions"`: the names of all functions defined, in the order they appear (including ones nested inside other functions);
- `"calls"`: a dict from the name of each called **plain function** (calls like `f(...)`, not method calls like `obj.f(...)`) to how many times it is called;
- `"globals_used"`: a sorted list of names declared with a `global` statement anywhere.

Remember to call `self.generic_visit(node)` in your visit methods so nested code is visited too.

```python starter
import ast

def check_code(source):
    return {"functions": [], "calls": {}, "globals_used": []}

print(check_code("def f():\n    return g(1)\n"))
```

```python solution
import ast
from collections import Counter

class _Checker(ast.NodeVisitor):
    def __init__(self):
        self.functions, self.calls, self.globals_used = [], Counter(), set()
    def visit_FunctionDef(self, node):
        self.functions.append(node.name)
        self.generic_visit(node)
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            self.calls[node.func.id] += 1
        self.generic_visit(node)
    def visit_Global(self, node):
        self.globals_used.update(node.names)

def check_code(source):
    checker = _Checker()
    checker.visit(ast.parse(source))
    return {"functions": checker.functions, "calls": dict(checker.calls), "globals_used": sorted(checker.globals_used)}

print(check_code("def f():\n    return g(1)\n"))
```

```python test
assert "check_code" in dir(), "Keep the function's name as check_code."
_src = '''
TOTAL = 0
def add(x):
    global TOTAL
    TOTAL += x
    return log(round(x))

def outer():
    def inner(y):
        return add(add(y))
    data = [inner(i) for i in range(3)]
    data.append(max(data))
    print(len(data))

outer()
'''
_r = check_code(_src)
assert _r["functions"] == ["add", "outer", "inner"], f"Functions in order of appearance, nested included; got {_r['functions']}."
assert _r["calls"] == {"log": 1, "round": 1, "add": 2, "inner": 1, "range": 1, "max": 1, "print": 1, "len": 1, "outer": 1}, f"Got {_r['calls']}."
assert "append" not in _r["calls"], "Method calls like data.append(...) are not plain function calls."
assert _r["globals_used"] == ["TOTAL"], "TOTAL is declared global."
assert check_code("x = 1") == {"functions": [], "calls": {}, "globals_used": []}, "Code with no functions or calls."
assert check_code("def a():\n    global q, p\n")["globals_used"] == ["p", "q"], "Several names in one global statement, sorted."
"SUCCESS: The ast visitor walks real Python code without running it, collecting exactly what a code reviewer would look for."
```

Hint: Subclass `ast.NodeVisitor` and write `visit_FunctionDef`, `visit_Call` and `visit_Global`. For calls, check `isinstance(node.func, ast.Name)` and count `node.func.id`. A `Global` node's `names` attribute lists its names. Call `self.generic_visit(node)` in the first two so nested definitions and calls are reached.
:::

::: challenge Symbolic derivatives with visitors [hard]
An expression tree has four node classes: `Num(value)`, `Var(name)`, `Add(left, right)` and `Mul(left, right)`. Write them (plain classes with those attributes), then three visitors, each with a `visit(node)` method that dispatches on the node's class name:

- `Evaluate(env)` returns the numeric value, looking variables up in the dict `env` (a missing variable raises `KeyError`);
- `Show()` returns a string: numbers and variables as themselves (`str(value)` and the name), `Add` as `(a + b)` and `Mul` as `(a * b)`;
- `Derive(var)` returns a **new tree** for the derivative with respect to `var`: a number gives `Num(0)`, the variable `var` gives `Num(1)` and any other variable `Num(0)`, `Add(a, b)` gives `Add(a', b')`, and `Mul(a, b)` gives `Add(Mul(a', b), Mul(a, b'))` (the product rule). No simplifying is needed.

The test checks derivatives by evaluating them and comparing against a numeric slope.

```python starter
class Num:
    def __init__(self, value):
        self.value = value

print("write Var, Add, Mul and the three visitors")
```

```python solution
class Num:
    def __init__(self, value):
        self.value = value

class Var:
    def __init__(self, name):
        self.name = name

class Add:
    def __init__(self, left, right):
        self.left, self.right = left, right

class Mul:
    def __init__(self, left, right):
        self.left, self.right = left, right

class TreeVisitor:
    def visit(self, node):
        method = getattr(self, "visit_" + type(node).__name__, None)
        if method is None:
            raise TypeError(f"cannot visit {type(node).__name__}")
        return method(node)

class Evaluate(TreeVisitor):
    def __init__(self, env):
        self.env = env
    def visit_Num(self, n): return n.value
    def visit_Var(self, v): return self.env[v.name]
    def visit_Add(self, a): return self.visit(a.left) + self.visit(a.right)
    def visit_Mul(self, m): return self.visit(m.left) * self.visit(m.right)

class Show(TreeVisitor):
    def visit_Num(self, n): return str(n.value)
    def visit_Var(self, v): return v.name
    def visit_Add(self, a): return f"({self.visit(a.left)} + {self.visit(a.right)})"
    def visit_Mul(self, m): return f"({self.visit(m.left)} * {self.visit(m.right)})"

class Derive(TreeVisitor):
    def __init__(self, var):
        self.var = var
    def visit_Num(self, n): return Num(0)
    def visit_Var(self, v): return Num(1 if v.name == self.var else 0)
    def visit_Add(self, a): return Add(self.visit(a.left), self.visit(a.right))
    def visit_Mul(self, m): return Add(Mul(self.visit(m.left), m.right), Mul(m.left, self.visit(m.right)))

x = Var("x")
f = Add(Mul(Num(3), Mul(x, x)), Mul(Num(2), x))
print(Show().visit(f), "at x=2:", Evaluate({"x": 2}).visit(f), " slope:", Evaluate({"x": 2}).visit(Derive("x").visit(f)))
```

```python test
for _n in ["Num", "Var", "Add", "Mul", "Evaluate", "Show", "Derive"]:
    assert _n in dir(), f"Define {_n}."
_x, _y = Var("x"), Var("y")
_f = Add(Mul(Num(3), Mul(_x, _x)), Mul(Num(2), _x))
assert Evaluate({"x": 2}).visit(_f) == 16, "3·4 + 2·2 = 16."
assert Show().visit(_f) == "((3 * (x * x)) + (2 * x))", f"Got {Show().visit(_f)!r}."
assert Show().visit(Num(2.5)) == "2.5" and Show().visit(_y) == "y", "Leaves show as themselves."
def _slope(_tree, _var, _env, _h=1e-6):
    _up, _down = dict(_env), dict(_env)
    _up[_var] += _h; _down[_var] -= _h
    return (Evaluate(_up).visit(_tree) - Evaluate(_down).visit(_tree)) / (2 * _h)
_trees = [_f, Mul(_x, _y), Add(Mul(_x, Mul(_x, _x)), Mul(Num(-4), _y)), Mul(Add(_x, Num(1)), Add(_x, Mul(Num(2), _y))), Num(7), _y]
for _t in _trees:
    for _var in ["x", "y"]:
        for _env in [{"x": 2.0, "y": -1.0}, {"x": -0.5, "y": 3.0}]:
            _d = Derive(_var).visit(_t)
            assert abs(Evaluate(_env).visit(_d) - _slope(_t, _var, _env)) < 1e-4, f"The derivative of {Show().visit(_t)} by {_var} is wrong at {_env}: {Show().visit(_d)}."
_d = Derive("x").visit(Mul(_x, _y))
assert Show().visit(_d) == "((1 * y) + (x * 0))", f"The product rule, unsimplified; got {Show().visit(_d)!r}."
assert Show().visit(_f) == "((3 * (x * x)) + (2 * x))", "Deriving must build a new tree, not change the original."
try:
    Evaluate({}).visit(_x)
    assert False, "A missing variable should raise KeyError."
except KeyError:
    pass
"SUCCESS: Three operations on one small set of node classes, each in its own visitor: evaluation, printing and calculus, with the tree classes untouched."
```

Hint: Give the visitors a shared base whose `visit` finds `"visit_" + type(node).__name__`. Each visitor then has four short methods. `Derive.visit_Mul` builds `Add(Mul(self.visit(m.left), m.right), Mul(m.left, self.visit(m.right)))`: new nodes, reusing the original subtrees.
:::

## What you learned

- Visitor moves each operation on a structure into its own class, with one method per node type, so new operations need no change to the node classes.
- The classic form uses `accept(visitor)`, which calls the visitor method for the node's type: double dispatch on node type and visitor type.
- In Python, a visitor can dispatch by name, finding `"visit_" + type(node).__name__` with `getattr` and falling back to `generic_visit`, which can walk children. That is how `ast.NodeVisitor` works.
- `ast.parse` plus a `NodeVisitor` examines real Python code without running it, the basis of linters and code checkers.
- Visitor reverses the usual trade-off: new operations are cheap and new node types expensive (every visitor needs a method). Use it when the node types are stable and the operations keep growing.

The next lesson routes communication between many objects through one coordinator: the mediator pattern.
