# Project: expression evaluator

A machining calculator lets engineers type formulas instead of numbers: `feed = rpm * teeth * chip`, `power = 2 * pi * rpm * torque / 60000`, `deflection = F * L^3 / (3 * E * I)`. To support that, the program needs to read formula text, check it, evaluate it with the current values, and show it back neatly. Perhaps it also needs to simplify it, or list which variables it needs. This project builds that, combining three ideas from the series: a **parser** (from the interpreter lesson), a **composite** tree of expression nodes, and **visitors** that each perform one operation on the tree.

Arithmetic has more structure than the small languages so far: operator **precedence** (`*` before `+`), **associativity** (`10 - 3 - 2` is `(10 - 3) - 2`, but `2 ^ 3 ^ 2` is `2 ^ (3 ^ 2)`), **unary minus** (`-x ^ 2`), and **function calls** (`sqrt(x)`). A clean way to parse it all is **precedence climbing**.

This lesson covers:

- the expression tree: a composite of number, variable, operator and call nodes;
- tokenizing and parsing with precedence climbing, including associativity and unary minus;
- visitors: evaluating with variables, and printing with minimal brackets;
- putting it together as a formula calculator that reports clear errors.

## The tree

Each kind of expression is a node class, holding only data: `Num(value)`, `Var(name)`, `BinOp(op, left, right)`, `Neg(operand)` and `Call(name, args)`. A formula is a tree of these. `F * L ^ 3` is a `BinOp("*", Var("F"), BinOp("^", Var("L"), Num(3)))`: the tree's shape encodes the precedence, so nothing downstream needs to know about it. Operations on the tree are visitors, so the node classes stay this small.

## Tokens and precedence climbing

A tokenizer turns the text into tokens: numbers (including decimals and exponents like `2.1e5`), names, operators and brackets. Here a regular expression does it, with one rule per kind of token, and anything it cannot match is reported with its position.

The parser uses **precedence climbing**. Each binary operator has a precedence (`+ -` 1, `* /` 2, `^` 3) and an associativity. `parse_expression(min_prec)` first parses a **primary** (a number, a variable, a call, a bracketed expression or a unary minus). Then, while the next token is an operator with precedence at least `min_prec`, it consumes the operator and parses its right-hand side with a higher minimum: precedence + 1 for left-associative operators, but the **same** precedence for right-associative `^`. That one difference is what makes `2 ^ 3 ^ 2` group to the right. Unary minus binds looser than `^` (so `-x ^ 2` is `-(x ^ 2)`, as in mathematics) but tighter than `*`. Predict before running: what trees do `10 - 3 - 2` and `2 ^ 3 ^ 2` produce, and what values?

```python type
import re, math

class Num:
    def __init__(self, value): self.value = value
class Var:
    def __init__(self, name): self.name = name
class BinOp:
    def __init__(self, op, left, right): self.op, self.left, self.right = op, left, right
class Neg:
    def __init__(self, operand): self.operand = operand
class Call:
    def __init__(self, name, args): self.name, self.args = name, args

TOKEN = re.compile(r"\s*(?:(?P<num>\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)|(?P<name>[A-Za-z_]\w*)|(?P<op>[-+*/^(),]))")
PRECEDENCE = {"+": 1, "-": 1, "*": 2, "/": 2, "^": 3}
RIGHT_ASSOC = {"^"}

def tokenize(text):
    tokens, pos = [], 0
    text = text.rstrip()
    while pos < len(text):
        m = TOKEN.match(text, pos)
        if not m or m.end() == pos:
            pos += len(text[pos:]) - len(text[pos:].lstrip())
            raise SyntaxError(f"unexpected {text[pos:pos + 1]!r} at position {pos}")
        kind = m.lastgroup
        tokens.append((kind, m.group(kind), m.start(kind)))
        pos = m.end()
    tokens.append(("end", "", len(text)))
    return tokens

def parse(text):
    tokens, i = tokenize(text), 0

    def peek():
        return tokens[i]

    def take(expected=None):
        nonlocal i
        kind, value, where = tokens[i]
        if expected is not None and value != expected:
            raise SyntaxError(f"expected {expected!r} at position {where}, found {value or 'end of formula'!r}")
        i += 1
        return kind, value, where

    def primary():
        kind, value, where = take()
        if kind == "num":
            return Num(float(value))
        if kind == "name":
            if peek()[1] == "(":
                take("(")
                args = [] if peek()[1] == ")" else [expression(1)]
                while peek()[1] == ",":
                    take(",")
                    args.append(expression(1))
                take(")")
                return Call(value, args)
            return Var(value)
        if value == "(":
            node = expression(1)
            take(")")
            return node
        if value == "-":
            return Neg(expression(3))
        raise SyntaxError(f"unexpected {value or 'end of formula'!r} at position {where}")

    def expression(min_prec):
        left = primary()
        while peek()[0] == "op" and peek()[1] in PRECEDENCE and PRECEDENCE[peek()[1]] >= min_prec:
            op = take()[1]
            next_min = PRECEDENCE[op] if op in RIGHT_ASSOC else PRECEDENCE[op] + 1
            left = BinOp(op, left, expression(next_min))
        return left

    tree = expression(1)
    if peek()[0] != "end":
        raise SyntaxError(f"unexpected {peek()[1]!r} at position {peek()[2]}")
    return tree

def shape(node):
    if isinstance(node, Num): return f"{node.value:g}"
    if isinstance(node, Var): return node.name
    if isinstance(node, Neg): return f"neg({shape(node.operand)})"
    if isinstance(node, Call): return f"{node.name}({', '.join(shape(a) for a in node.args)})"
    return f"[{shape(node.left)} {node.op} {shape(node.right)}]"

for text in ["10 - 3 - 2", "2 ^ 3 ^ 2", "-x ^ 2", "a + b * c - d / e", "sqrt(3 ^ 2 + 4 ^ 2) * 2.5e-1"]:
    print(f"{text:<30} -> {shape(parse(text))}")
```

```output
10 - 3 - 2                     -> [[10 - 3] - 2]
2 ^ 3 ^ 2                      -> [2 ^ [3 ^ 2]]
-x ^ 2                         -> neg([x ^ 2])
a + b * c - d / e              -> [[a + [b * c]] - [d / e]]
sqrt(3 ^ 2 + 4 ^ 2) * 2.5e-1   -> [sqrt([[3 ^ 2] + [4 ^ 2]]) * 0.25]
```

`shape` is a quick throwaway printer with every grouping shown in square brackets, to see what the parser built. A proper printing visitor comes next. `m.lastgroup` is the name of the group that matched, which tells the tokenizer what kind of token it found.

`10 - 3 - 2` groups to the left, `[[10 - 3] - 2]`, which is 5; `2 ^ 3 ^ 2` groups to the right, `[2 ^ [3 ^ 2]]`, which is 512. `-x ^ 2` is `neg([x ^ 2])`, and the mixed formula respects precedence everywhere. All of that comes from about a dozen lines in `expression`, because each precedence level is a number rather than a separate function.

## Visitors: evaluating and printing

Two visitors do the main work. `Evaluate(env)` computes a value, looking variables up in a dictionary, with a small set of safe functions (`sqrt`, `sin`, `cos`, `abs`, `min`, `max`) and the constant `pi`. Unknown names and wrong argument counts give clear errors. `Show()` prints the tree back as text with **as few brackets as possible**: a child needs brackets only when its precedence is lower than its parent's, or equal on the side where associativity would regroup it. Printing and re-parsing must give the same tree, which is a round-trip property the testing lesson would approve of. Predict before running: how does `Show` print `(a - b) - c` and `a - (b - c)`?

```python type
FUNCTIONS = {"sqrt": (math.sqrt, 1), "sin": (math.sin, 1), "cos": (math.cos, 1), "abs": (abs, 1), "min": (min, 2), "max": (max, 2)}
CONSTANTS = {"pi": math.pi}

class Visitor:
    def visit(self, node):
        return getattr(self, "visit_" + type(node).__name__)(node)

class Evaluate(Visitor):
    def __init__(self, env):
        self.env = env
    def visit_Num(self, n):
        return n.value
    def visit_Var(self, v):
        if v.name in self.env:
            return self.env[v.name]
        if v.name in CONSTANTS:
            return CONSTANTS[v.name]
        raise NameError(f"no value for {v.name!r}")
    def visit_Neg(self, n):
        return -self.visit(n.operand)
    def visit_BinOp(self, b):
        x, y = self.visit(b.left), self.visit(b.right)
        if b.op == "+": return x + y
        if b.op == "-": return x - y
        if b.op == "*": return x * y
        if b.op == "/": return x / y
        return x ** y
    def visit_Call(self, c):
        if c.name not in FUNCTIONS:
            raise NameError(f"unknown function {c.name!r}")
        function, arity = FUNCTIONS[c.name]
        if len(c.args) != arity:
            raise TypeError(f"{c.name} takes {arity} argument(s), got {len(c.args)}")
        return function(*(self.visit(a) for a in c.args))

class Show(Visitor):
    def visit_Num(self, n):
        return f"{n.value:.15g}"
    def visit_Var(self, v):
        return v.name
    def visit_Call(self, c):
        return f"{c.name}({', '.join(self.visit(a) for a in c.args)})"
    def visit_Neg(self, n):
        inner = self.visit(n.operand)
        return f"-({inner})" if isinstance(n.operand, BinOp) and PRECEDENCE[n.operand.op] < 3 else f"-{inner}"
    def visit_BinOp(self, b):
        p = PRECEDENCE[b.op]
        left, right = self.visit(b.left), self.visit(b.right)
        if self._needs_brackets(b.left, p, b.op in RIGHT_ASSOC):
            left = f"({left})"
        if self._needs_brackets(b.right, p, b.op not in RIGHT_ASSOC):
            right = f"({right})"
        return f"{left} {b.op} {right}"
    def _needs_brackets(self, child, p, strict):
        if isinstance(child, Neg) or (isinstance(child, Num) and child.value < 0):
            return p >= 3
        if not isinstance(child, BinOp):
            return False
        q = PRECEDENCE[child.op]
        return q < p or (q == p and strict)

for text in ["(a - b) - c", "a - (b - c)", "(2 ^ 3) ^ 2", "2 ^ (3 ^ 2)", "(a + b) * (c - d)", "-(x ^ 2)", "(-x) ^ 2"]:
    tree = parse(text)
    printed = Show().visit(tree)
    print(f"{text:<20} -> {printed:<16} round trip same tree: {shape(parse(printed)) == shape(tree)}")

env = {"rpm": 2400, "teeth": 4, "chip": 0.05, "torque": 12.5}
for formula in ["rpm * teeth * chip", "2 * pi * rpm * torque / 60000", "sqrt(teeth ^ 2 + 9)"]:
    print(f"{formula:<32} = {Evaluate(env).visit(parse(formula)):.4g}")
```

```output
(a - b) - c          -> a - b - c        round trip same tree: True
a - (b - c)          -> a - (b - c)      round trip same tree: True
(2 ^ 3) ^ 2          -> (2 ^ 3) ^ 2      round trip same tree: True
2 ^ (3 ^ 2)          -> 2 ^ 3 ^ 2        round trip same tree: True
(a + b) * (c - d)    -> (a + b) * (c - d) round trip same tree: True
-(x ^ 2)             -> -x ^ 2           round trip same tree: True
(-x) ^ 2             -> (-x) ^ 2         round trip same tree: True
rpm * teeth * chip               = 480
2 * pi * rpm * torque / 60000    = 3.142
sqrt(teeth ^ 2 + 9)              = 5
```

For a left-associative operator such as `-`, a right child of equal precedence needs brackets (`a - (b - c)`) and a left child does not. For right-associative `^` it is the other way round. `_needs_brackets` encodes exactly that with its `strict` flag.

Redundant brackets disappear (`(a - b) - c` prints as `a - b - c`) while necessary ones stay (`a - (b - c)`), and every printed form parses back to the same tree. The calculator gives a feed of 480 mm/min and 3.14 kW (2π × 2400 rpm × 12.5 N·m / 60,000) from the formulas, with `pi` supplied as a constant.

## A calculator with clear errors

A user-facing tool must turn every failure into a message a person can act on, without a traceback. The pieces already raise specific exceptions: `SyntaxError` with a position from the parser, `NameError` for unknown variables or functions, `TypeError` for wrong argument counts, and `ZeroDivisionError` from evaluation. A thin facade catches them and reports. Predict before running: which formulas fail, and how?

```python type
def calculate(formula, env):
    try:
        value = Evaluate(env).visit(parse(formula))
        if isinstance(value, complex):
            return "math error: the result is not a real number"
        return f"{value:.6g}"
    except SyntaxError as error:
        return f"syntax error: {error}"
    except NameError as error:
        return f"unknown name: {error}"
    except TypeError as error:
        return f"wrong arguments: {error}"
    except ZeroDivisionError:
        return "division by zero"
    except (ValueError, OverflowError) as error:
        return f"math error: {error}"

env = {"F": 500.0, "L": 0.4, "E": 2.1e11, "I": 8.3e-8}
for formula in ["F * L^3 / (3 * E * I)", "F * L^3 / (3 * E * J)", "F * (L + ", "sqrt(F, L)", "F / (L - 0.4)", "max(F, 2) $ 3", "sqrt(L - 1)", "(-8) ^ 0.5"]:
    print(f"{formula:<24} -> {calculate(formula, env)}")
```

```output
F * L^3 / (3 * E * I)    -> 0.000611972
F * L^3 / (3 * E * J)    -> unknown name: no value for 'J'
F * (L +                 -> syntax error: unexpected 'end of formula' at position 8
sqrt(F, L)               -> wrong arguments: sqrt takes 1 argument(s), got 2
F / (L - 0.4)            -> division by zero
max(F, 2) $ 3            -> syntax error: unexpected '$' at position 10
sqrt(L - 1)              -> math error: math domain error
(-8) ^ 0.5               -> math error: the result is not a real number
```

`calculate` is a facade, as in the facade lesson: callers get a string either way, and the parser and visitors stay ignorant of how errors are presented.

The beam deflection evaluates to about 0.61 mm (0.000612 m). The others report precisely what is wrong: an unknown variable `J`, a formula that ends too early (with the position), a function given the wrong number of arguments, a division by zero, and a character the tokenizer does not understand. The last two hit mathematical limits: the square root of a negative number, and a power that would be complex. Each would otherwise have been a crash with a traceback, or a confusing complex number.

::: challenge Which variables does a formula need? [easy]
Write a visitor `Variables` (subclass the lesson's `Visitor`) whose `visit(tree)` returns the **set** of variable names used in an expression tree, excluding names in `CONSTANTS` (such as `pi`) and excluding function names. Then write `needs(formula)`, returning a sorted list of the variables `parse(formula)` uses.

```python starter
class Variables(Visitor):
    pass

def needs(formula):
    return []

print(needs("2 * pi * rpm * torque / 60000"))
```

```python solution
class Variables(Visitor):
    def visit_Num(self, n):
        return set()
    def visit_Var(self, v):
        return set() if v.name in CONSTANTS else {v.name}
    def visit_Neg(self, n):
        return self.visit(n.operand)
    def visit_BinOp(self, b):
        return self.visit(b.left) | self.visit(b.right)
    def visit_Call(self, c):
        names = set()
        for a in c.args:
            names |= self.visit(a)
        return names

def needs(formula):
    return sorted(Variables().visit(parse(formula)))

print(needs("2 * pi * rpm * torque / 60000"))
```

```python test
for _n in ["Variables", "needs"]:
    assert _n in dir(), f"Define {_n}."
assert issubclass(Variables, Visitor), "Variables should be a Visitor."
assert needs("2 * pi * rpm * torque / 60000") == ["rpm", "torque"], "pi is a constant, not a variable."
assert needs("F * L^3 / (3 * E * I)") == ["E", "F", "I", "L"], "Every variable, sorted."
assert needs("sqrt(x^2 + y^2) - max(x, z)") == ["x", "y", "z"], "Function names are not variables; repeats count once."
assert needs("-a ^ b") == ["a", "b"] and needs("42") == [], "Unary minus and constants-only formulas."
assert Variables().visit(parse("a + a * b")) == {"a", "b"}, "visit returns a set."
"SUCCESS: One more visitor and the calculator can tell the user exactly which values a formula needs before evaluating it."
```

Hint: Each `visit_` method returns a set: empty for numbers, the name (unless it is in `CONSTANTS`) for variables, and the union of the children's sets for operators, negation and calls.
:::

::: challenge A list of steps [medium]
Engineers checking a calculation by hand want to see it step by step. Write a visitor `Steps(env)` whose `visit(tree)` returns the formula's value and records, in a list attribute `lines`, one line per operator or function call in the order they are **computed** (innermost and leftmost first), each as `f"{left_value:g} {op} {right_value:g} = {result:g}"` for operators, `f"-{value:g} = {result:g}"` for negation, and `f"{name}({args joined by ', '}) = {result:g}"` for calls, with argument values formatted `:g`. Numbers and variables produce no lines. Use the lesson's `FUNCTIONS` and `CONSTANTS`.

```python starter
class Steps(Visitor):
    def __init__(self, env):
        self.env, self.lines = env, []

print("write the visit methods")
```

```python solution
class Steps(Visitor):
    def __init__(self, env):
        self.env, self.lines = env, []
    def visit_Num(self, n):
        return n.value
    def visit_Var(self, v):
        return self.env[v.name] if v.name in self.env else CONSTANTS[v.name]
    def visit_Neg(self, n):
        value = self.visit(n.operand)
        self.lines.append(f"-{value:g} = {-value:g}")
        return -value
    def visit_BinOp(self, b):
        x, y = self.visit(b.left), self.visit(b.right)
        if b.op == "+": result = x + y
        elif b.op == "-": result = x - y
        elif b.op == "*": result = x * y
        elif b.op == "/": result = x / y
        else: result = x ** y
        self.lines.append(f"{x:g} {b.op} {y:g} = {result:g}")
        return result
    def visit_Call(self, c):
        args = [self.visit(a) for a in c.args]
        result = FUNCTIONS[c.name][0](*args)
        self.lines.append(f"{c.name}({', '.join(f'{a:g}' for a in args)}) = {result:g}")
        return result

s = Steps({"rpm": 2400, "teeth": 4, "chip": 0.05})
print(s.visit(parse("rpm * teeth * chip")), s.lines)
```

```python test
assert "Steps" in dir() and issubclass(Steps, Visitor), "Write Steps as a Visitor."
_s = Steps({"rpm": 2400, "teeth": 4, "chip": 0.05})
assert abs(_s.visit(parse("rpm * teeth * chip")) - 480) < 1e-9, "The value is returned."
assert _s.lines == ["2400 * 4 = 9600", "9600 * 0.05 = 480"], f"Got {_s.lines}."
_s = Steps({"x": 3, "y": 4})
_s.visit(parse("sqrt(x^2 + y^2) - -1"))
assert _s.lines == ["3 ^ 2 = 9", "4 ^ 2 = 16", "9 + 16 = 25", "sqrt(25) = 5", "-1 = -1", "5 - -1 = 6"], f"Got {_s.lines}."
_s = Steps({})
assert _s.visit(parse("max(2, 7) / 2")) == 3.5 and _s.lines == ["max(2, 7) = 7", "7 / 2 = 3.5"], f"Got {_s.lines}."
_s = Steps({})
assert _s.visit(parse("2 * pi")) == 2 * math.pi and _s.lines == ["2 * 3.14159 = 6.28319"], "Constants are values too."
_s = Steps({"a": 5})
_s.visit(parse("a"))
assert _s.lines == [], "A lone variable needs no steps."
"SUCCESS: The same tree, a different visitor, and the calculation explains itself step by step in the order it is computed."
```

Hint: Each `visit_` method computes its children first (which records their steps), then computes its own result, appends its line, and returns the result. The order of the lines then follows the order of computation automatically.
:::

::: challenge Simplifying formulas [hard]
Write a visitor `Simplify` whose `visit(tree)` returns a **new**, simplified tree, never changing the original. Simplify bottom-up (children first), applying these rules where they fit:

- constant folding: an operator, negation or call whose operands are all `Num` becomes a single `Num` (leave division by zero and calls to unknown functions unfolded);
- `x + 0`, `0 + x`, `x - 0`, `x * 1`, `1 * x`, `x / 1`, `x ^ 1` become `x`;
- `x * 0` and `0 * x` become `Num(0)`, and `x ^ 0` becomes `Num(1)`;
- `-(-x)` becomes `x`.

Then write `simplify(formula)`, returning `Show().visit(Simplify().visit(parse(formula)))`. The simplified tree must evaluate to the same value as the original for any variable values (where the original is defined).

```python starter
class Simplify(Visitor):
    pass

def simplify(formula):
    return formula

print(simplify("2 * 3 + x * 1 - 0"))
```

```python solution
class Simplify(Visitor):
    def visit_Num(self, n):
        return Num(n.value)
    def visit_Var(self, v):
        return Var(v.name)
    def visit_Neg(self, n):
        inner = self.visit(n.operand)
        if isinstance(inner, Num):
            return Num(-inner.value)
        if isinstance(inner, Neg):
            return inner.operand
        return Neg(inner)
    def visit_Call(self, c):
        args = [self.visit(a) for a in c.args]
        if c.name in FUNCTIONS and all(isinstance(a, Num) for a in args) and len(args) == FUNCTIONS[c.name][1]:
            try:
                return Num(FUNCTIONS[c.name][0](*(a.value for a in args)))
            except (ValueError, ZeroDivisionError):
                pass
        return Call(c.name, args)
    def visit_BinOp(self, b):
        left, right = self.visit(b.left), self.visit(b.right)
        is_num = lambda node, value: isinstance(node, Num) and node.value == value
        if isinstance(left, Num) and isinstance(right, Num):
            if not (b.op == "/" and right.value == 0):
                try:
                    value = Evaluate({}).visit(BinOp(b.op, left, right))
                except ArithmeticError:
                    value = None
                if isinstance(value, (int, float)):
                    return Num(value)
        if b.op == "+" and is_num(right, 0): return left
        if b.op == "+" and is_num(left, 0): return right
        if b.op == "-" and is_num(right, 0): return left
        if b.op == "*" and (is_num(left, 0) or is_num(right, 0)): return Num(0)
        if b.op == "*" and is_num(right, 1): return left
        if b.op == "*" and is_num(left, 1): return right
        if b.op == "/" and is_num(right, 1): return left
        if b.op == "^" and is_num(right, 1): return left
        if b.op == "^" and is_num(right, 0): return Num(1)
        return BinOp(b.op, left, right)

def simplify(formula):
    return Show().visit(Simplify().visit(parse(formula)))

print(simplify("2 * 3 + x * 1 - 0"), "|", simplify("(a + 0) * (b ^ 1) / 1"), "|", simplify("--y * 0 + z"))
```

```python test
import random as _random
for _n in ["Simplify", "simplify"]:
    assert _n in dir(), f"Define {_n}."
assert simplify("2 * 3 + x * 1 - 0") == "6 + x", f"Got {simplify('2 * 3 + x * 1 - 0')!r}."
assert simplify("(a + 0) * (b ^ 1) / 1") == "a * b", f"Got {simplify('(a + 0) * (b ^ 1) / 1')!r}."
assert simplify("--y * 0 + z") == "z", "Double negation, times zero, plus: just z."
assert simplify("-(-q)") == "q" and simplify("x ^ 0") == "1" and simplify("0 + 0 * w") == "0", "More identities."
assert simplify("sqrt(16) + max(2, 9)") == "13", "Calls on constants fold."
assert simplify("1 / 0 + x") == "1 / 0 + x", "Division by zero is left alone."
assert simplify("0 ^ -1 + x") == "0 ^ (-1) + x", "Folding that would fail (0 to a negative power) is left alone."
assert simplify("(-2) ^ x") == "(-2) ^ x", "A negative number raised to a power keeps its brackets, or it would read as -(2 ^ x)."
assert simplify("2 * pi") == "2 * pi" and simplify("f(3)") == "f(3)", "Variables named like constants, and unknown functions, are not folded."
_orig = parse("x * 1 + 0")
Simplify().visit(_orig)
assert shape(_orig) == "[[x * 1] + 0]", "Simplify must build a new tree, not change the original."
_rng = _random.Random(14)
_formulas = ["x * 1 + 0 * y - (z - 0)", "(x + 0) ^ (1 * 2) / 1", "--x * (y ^ 0) + 2 * 3 * z", "max(x, 0 + y) - sqrt(4) * x", "-(x - y) * 1 + 0 ^ 1", "(x * 0 + y * 1) / (z ^ 1)"]
for _f in _formulas:
    _tree, _simple = parse(_f), Simplify().visit(parse(_f))
    for _ in range(20):
        _env = {"x": _rng.uniform(-5, 5), "y": _rng.uniform(-5, 5), "z": _rng.uniform(0.5, 5)}
        assert abs(Evaluate(_env).visit(_tree) - Evaluate(_env).visit(_simple)) < 1e-9, f"Simplifying {_f!r} to {Show().visit(_simple)!r} changed its value at {_env}."
    assert len(simplify(_f)) <= len(Show().visit(parse(_f))), f"{_f!r} should not get longer when simplified."
"SUCCESS: A bottom-up visitor folds constants and removes identities, and random evaluation proves every simplified formula still means the same thing."
```

Hint: Visit the children first and build new nodes. In `visit_BinOp`, fold when both sides are `Num` (using `Evaluate({})` on a new `BinOp`, except for division by zero), then check the identity rules in turn, and otherwise return a new `BinOp`. `visit_Neg` folds numbers and cancels a double negation; `visit_Call` folds known functions on numbers.
:::

## What you learned

- An expression tree is a composite of small node classes. Its shape encodes precedence, so operations on it never need to know the parsing rules.
- A regular-expression tokenizer plus precedence climbing parses arithmetic with precedence, left and right associativity, unary minus and function calls in a few dozen lines.
- Visitors keep each operation separate: evaluating, listing variables, explaining steps, printing with minimal brackets and simplifying. A round trip (print, then parse again) and random evaluation (simplified equals original) test them thoroughly.
- A facade turns the parser's and evaluator's specific exceptions into clear messages for people.

The next project schedules jobs on machines, combining priority queues, topological order and swappable strategies.
