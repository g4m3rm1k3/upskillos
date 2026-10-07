# Interpreter

Sometimes the best way to let people control a program is to give them a small **language**. A plotter accepts `REPEAT 4 [ FORWARD 50 TURN 90 ]`. An alarm system accepts conditions like `temp > 80 and not door_closed`. A machine accepts G-code. Each of these is a domain-specific language, small enough to learn in minutes and precise enough for a program to carry out.

The **interpreter** pattern represents each kind of sentence in the language as a class. A program in the language becomes a tree of these objects, a composite, and each node knows how to **interpret** (execute or evaluate) itself. Building the tree from text is a separate job, **parsing**. Together they make a complete, if small, language implementation, and the same shape (text to tokens, tokens to tree, tree evaluated) underlies every compiler and interpreter, Python's included.

This lesson covers:

- the problem: interpreting commands with string splitting and `if`s, and why nesting breaks it;
- the interpreter pattern: a class per kind of command, each executing itself;
- turning text into a tree: a tokenizer and a recursive-descent parser;
- reporting errors helpfully, and when to reach for a parser library instead.

## The problem: string matching runs out of road

A pen plotter accepts commands, one per word pair. The first version splits the text and checks each command. Predict before reading on: how would this code handle `REPEAT 4 [ FORWARD 10 TURN 90 ]`?

```python type
import math

def run_flat(program):
    x = y = heading = 0
    words = program.split()
    for i in range(0, len(words), 2):
        command, amount = words[i], float(words[i + 1])
        if command == "FORWARD":
            x += amount * math.cos(math.radians(heading))
            y += amount * math.sin(math.radians(heading))
        elif command == "TURN":
            heading = (heading + amount) % 360
        else:
            raise ValueError(f"unknown command {command}")
    return round(x, 2), round(y, 2), heading

print(run_flat("FORWARD 10 TURN 90 FORWARD 5"))
try:
    print(run_flat("REPEAT 4 [ FORWARD 10 TURN 90 ]"))
except ValueError as error:
    print("ValueError:", error)
```

```output
(10.0, 5.0, 90.0)
ValueError: unknown command REPEAT
```

Flat commands work. But a `REPEAT` holds a **block** of commands, and a block can hold another `REPEAT`. The structure is a tree, and reading the words in pairs cannot see it. Bolting on bracket counting would make the loop more and more tangled, and every new nesting construct would make it worse.

## A class per kind of command

Give each kind of command a class with an `execute(turtle)` method. `Forward` and `Turn` change the turtle (the pen's position and heading). `Repeat` holds a count and a **block**, a list of commands, and executes the block that many times. Because a `Repeat`'s block can contain another `Repeat`, programs nest to any depth, with no special code: this is the composite pattern, where each node interprets itself. The program is just a list of nodes. Predict before running: what shape does `REPEAT 4 [ FORWARD 20 TURN 90 ]` draw, and where does the pen end up?

```python type
import math

class Turtle:
    def __init__(self):
        self.x = self.y = 0.0
        self.heading = 0.0
        self.path = [(0.0, 0.0)]
    def forward(self, distance):
        self.x += distance * math.cos(math.radians(self.heading))
        self.y += distance * math.sin(math.radians(self.heading))
        self.path.append((round(self.x, 2) + 0.0, round(self.y, 2) + 0.0))
    def turn(self, degrees):
        self.heading = (self.heading + degrees) % 360

class Forward:
    def __init__(self, distance):
        self.distance = distance
    def execute(self, turtle):
        turtle.forward(self.distance)

class Turn:
    def __init__(self, degrees):
        self.degrees = degrees
    def execute(self, turtle):
        turtle.turn(self.degrees)

class Repeat:
    def __init__(self, count, block):
        self.count, self.block = count, block
    def execute(self, turtle):
        for _ in range(self.count):
            for command in self.block:
                command.execute(turtle)

def run(program, turtle=None):
    turtle = turtle or Turtle()
    for command in program:
        command.execute(turtle)
    return turtle

square = [Repeat(4, [Forward(20), Turn(90)])]
t = run(square)
print("square path:", t.path)
star = [Repeat(5, [Forward(30), Turn(144)])]
print("star corners:", len(run(star).path) - 1, "lines, ends at", run(star).path[-1])
```

```output
square path: [(0.0, 0.0), (20.0, 0.0), (20.0, 20.0), (0.0, 20.0), (0.0, 0.0)]
star corners: 5 lines, ends at (0.0, 0.0)
```

The programs here are built by hand as trees of objects. The next section builds them from text.

The square visits four corners and returns to (0, 0). The star draws five lines and also closes, because 5 × 144° is two full turns. `Repeat.execute` does not care what its block contains, so `Repeat(3, [Repeat(4, ...)])` works with no extra code.

## From text to a tree

Two steps turn program text into the tree.

**Tokenizing** splits the text into **tokens**, the smallest meaningful pieces: words, numbers and brackets. Here `str.split` almost does it, after putting spaces around the brackets.

**Parsing** reads tokens and builds nodes. A **recursive-descent parser** has one function per grammar rule, and the functions call each other the way the rules refer to each other. The grammar of this language, written informally:

- a **program** is a list of commands, until the end or a closing `]`;
- a **command** is `FORWARD number`, `TURN number`, or `REPEAT number [ program ]`.

`parse_block` reads commands until it meets `]` or runs out of tokens. When it meets `REPEAT`, it reads the count, expects `[`, and calls `parse_block` again for the inner block. That recursive call is what lets blocks nest. Predict before running: how many nodes does the nested program produce at the top level?

```python type
def tokenize(text):
    return text.replace("[", " [ ").replace("]", " ] ").split()

def parse(text):
    tokens = tokenize(text)
    position = 0

    def take():
        nonlocal position
        if position >= len(tokens):
            raise SyntaxError("unexpected end of program")
        token = tokens[position]
        position += 1
        return token

    def number():
        token = take()
        try:
            return float(token)
        except ValueError:
            raise SyntaxError(f"expected a number at token {position}, found {token!r}") from None

    def parse_block():
        commands = []
        while position < len(tokens) and tokens[position] != "]":
            word = take().upper()
            if word == "FORWARD":
                commands.append(Forward(number()))
            elif word == "TURN":
                commands.append(Turn(number()))
            elif word == "REPEAT":
                count = int(number())
                if take() != "[":
                    raise SyntaxError("REPEAT needs a [ block ]")
                commands.append(Repeat(count, parse_block()))
                if take() != "]":
                    raise SyntaxError("missing ]")
            else:
                raise SyntaxError(f"unknown command {word!r} at token {position}")
        return commands

    program = parse_block()
    if position != len(tokens):
        raise SyntaxError(f"unexpected {tokens[position]!r} at token {position + 1}")
    return program

source = "TURN 45 REPEAT 3 [ REPEAT 4 [ FORWARD 10 TURN 90 ] TURN 120 ]"
program = parse(source)
print("top-level nodes:", [type(c).__name__ for c in program])
print("lines drawn:", len(run(program).path) - 1)
for bad in ["FORWARD ten", "REPEAT 2 [ FORWARD 5", "JUMP 3", "FORWARD 5 ]"]:
    try:
        parse(bad)
    except SyntaxError as error:
        print(f"{bad!r:<24} -> SyntaxError: {error}")
```

```output
top-level nodes: ['Turn', 'Repeat']
lines drawn: 12
'FORWARD ten'            -> SyntaxError: expected a number at token 2, found 'ten'
'REPEAT 2 [ FORWARD 5'   -> SyntaxError: unexpected end of program
'JUMP 3'                 -> SyntaxError: unknown command 'JUMP' at token 1
'FORWARD 5 ]'            -> SyntaxError: unexpected ']' at token 3
```

`take` hands out the next token and moves on; `number` takes a token and insists it is a number. Both report the position, so error messages can point at the problem.

The nested program parses into two top-level nodes, a `Turn` and a `Repeat` that holds another `Repeat`, and draws 3 × 4 = 12 lines. Every malformed program is rejected with a message saying what was expected, and where when it can, rather than crashing somewhere inside the interpreter. Parsing and interpreting are separate: the same tree could be drawn, counted, or translated to G-code by a visitor without parsing again.

## When to build your own

A hand-written recursive-descent parser is the right tool for small languages: a few kinds of command, a simple grammar, errors you can describe. It is short, has no dependencies, and is easy to change. As a language grows (operator precedence, many statement types, good error recovery), the hand-written code grows too, and parser generators or libraries such as `lark` take over. And before writing any language, ask whether an existing format would do: JSON or YAML for configuration, or Python itself through a small API, are often better than a new language that people must learn.

::: challenge Interpreting the commands [easy]
Using the lesson's `Turtle`, `Forward`, `Turn`, `Repeat` and `run`, write two new command classes that fit into programs exactly like the others, each with an `execute(turtle)` method:

- `Back(distance)`: moves backwards (the opposite of forward), without changing the heading;
- `Face(heading)`: turns to face an absolute heading in degrees (0 is along +x, 90 along +y), whatever the current heading, keeping the heading between 0 and 360 as `Turn` does.

Do not change the lesson's classes. Then write `path_length(program)`, which runs a program on a new turtle and returns the total distance travelled, rounded to 2 places (forwards and backwards both count as distance).

```python starter
class Back:
    def __init__(self, distance):
        self.distance = distance

print("write Back.execute, Face and path_length")
```

```python solution
import math

class Back:
    def __init__(self, distance):
        self.distance = distance
    def execute(self, turtle):
        turtle.forward(-self.distance)

class Face:
    def __init__(self, heading):
        self.heading = heading
    def execute(self, turtle):
        turtle.heading = self.heading % 360

def path_length(program):
    turtle = Turtle()
    travelled = [0.0]
    move = turtle.forward
    def counting_forward(distance):
        travelled[0] += abs(distance)
        move(distance)
    turtle.forward = counting_forward
    run(program, turtle)
    return round(travelled[0], 2)

print(path_length([Forward(10), Back(4), Repeat(2, [Face(90), Forward(3)])]))
```

```python test
for _n in ["Back", "Face", "path_length"]:
    assert _n in dir(), f"Define {_n}."
_t = run([Forward(10), Back(4)])
assert (round(_t.x, 6), round(_t.y, 6), _t.heading) == (6, 0, 0), "Back moves backwards without turning."
_t = run([Turn(30), Face(90), Forward(5)])
assert (round(_t.x, 6), round(_t.y, 6), _t.heading) == (0, 5, 90), "Face sets an absolute heading."
assert run([Face(450)]).heading == 90, "Headings wrap round at 360."
assert path_length([Forward(10), Back(4), Repeat(2, [Face(90), Forward(3)])]) == 20, "10 forward, 4 back, then 3 and 3: 20 in total."
assert path_length([Repeat(4, [Forward(25), Turn(90)])]) == 100, "A 25 square has perimeter 100."
assert path_length([]) == 0, "An empty program travels nowhere."
assert path_length([Repeat(5, [Forward(30), Turn(144)])]) == 150, "Diagonal moves count their full length: the star is 5 × 30 = 150 (measure each move, not the rounded points)."
_nested = [Repeat(3, [Back(2), Repeat(2, [Face(0), Forward(1)])])]
assert path_length(_nested) == 12, "New commands work inside REPEAT blocks too."
"SUCCESS: Two new kinds of sentence in the language, each a small class that interprets itself, and every existing construct, REPEAT included, handles them."
```

Hint: `Back.execute` can call `turtle.forward(-self.distance)`. `Face.execute` sets `turtle.heading` directly, modulo 360. For `path_length`, make a `Turtle`, replace its `forward` with a function that adds `abs(distance)` to a running total and then calls the original, and run the program on it. (Measuring between the rounded points of `turtle.path` would be slightly off for diagonal moves.)
:::

::: challenge A parser for a recipe language [medium]
A heat-treatment oven runs recipes written like `HEAT 850 HOLD 30 COOL 200 HOLD 10`, where steps can be grouped with `CYCLE n ( ... )`, which repeats its steps n times, for example `HEAT 600 CYCLE 3 ( HEAT 650 HOLD 5 COOL 550 ) COOL 20`. Write `parse_recipe(text)` returning a list of steps, where `HEAT t` and `COOL t` become `("set", t)` with t an int, `HOLD m` becomes `("hold", m)`, and `CYCLE n ( ... )` becomes `("cycle", n, [inner steps])`. Keywords are case-insensitive. Raise `SyntaxError` (with a message) for an unknown word, a missing or non-integer number, a missing `(` or `)`, or a stray `)`. Then write `total_minutes(steps)`, returning the total hold time, counting cycles their number of times.

```python starter
def parse_recipe(text):
    return []

print(parse_recipe("HEAT 850 HOLD 30"))
```

```python solution
def parse_recipe(text):
    tokens = text.replace("(", " ( ").replace(")", " ) ").split()
    position = 0

    def take():
        nonlocal position
        if position >= len(tokens):
            raise SyntaxError("unexpected end of recipe")
        position += 1
        return tokens[position - 1]

    def integer():
        token = take()
        if not token.isdigit():
            raise SyntaxError(f"expected a whole number, found {token!r}")
        return int(token)

    def block():
        steps = []
        while position < len(tokens) and tokens[position] != ")":
            word = take().upper()
            if word in ("HEAT", "COOL"):
                steps.append(("set", integer()))
            elif word == "HOLD":
                steps.append(("hold", integer()))
            elif word == "CYCLE":
                n = integer()
                if take() != "(":
                    raise SyntaxError("CYCLE needs ( steps )")
                inner = block()
                if take() != ")":
                    raise SyntaxError("missing )")
                steps.append(("cycle", n, inner))
            else:
                raise SyntaxError(f"unknown step {word!r}")
        return steps

    steps = block()
    if position != len(tokens):
        raise SyntaxError("unexpected )")
    return steps

def total_minutes(steps):
    total = 0
    for step in steps:
        if step[0] == "hold":
            total += step[1]
        elif step[0] == "cycle":
            total += step[1] * total_minutes(step[2])
    return total

r = parse_recipe("HEAT 600 CYCLE 3 ( HEAT 650 HOLD 5 COOL 550 ) COOL 20")
print(r, total_minutes(r))
```

```python test
for _n in ["parse_recipe", "total_minutes"]:
    assert _n in dir(), f"Define {_n}."
assert parse_recipe("HEAT 850 HOLD 30 COOL 200 HOLD 10") == [("set", 850), ("hold", 30), ("set", 200), ("hold", 10)], "Flat steps."
_r = parse_recipe("heat 600 CYCLE 3 ( HEAT 650 HOLD 5 cool 550 ) COOL 20")
assert _r == [("set", 600), ("cycle", 3, [("set", 650), ("hold", 5), ("set", 550)]), ("set", 20)], f"Got {_r}."
assert total_minutes(_r) == 15, "Three cycles of a 5-minute hold."
_nest = parse_recipe("CYCLE 2 ( HOLD 1 CYCLE 3 ( HOLD 2 ) )")
assert _nest == [("cycle", 2, [("hold", 1), ("cycle", 3, [("hold", 2)])])] and total_minutes(_nest) == 14, "Cycles nest: 2 × (1 + 3 × 2) = 14."
assert parse_recipe("") == [] and parse_recipe("CYCLE 4 ( )") == [("cycle", 4, [])], "Empty recipes and empty cycles are allowed."
for _bad in ["HEAT", "HEAT hot", "HOLD 2.5", "BAKE 100", "CYCLE 2 HOLD 5", "CYCLE 2 ( HOLD 5", "HOLD 5 )", "CYCLE x ( HOLD 1 )"]:
    try:
        parse_recipe(_bad)
        assert False, f"{_bad!r} should raise SyntaxError."
    except SyntaxError as _e:
        assert str(_e), "Give the SyntaxError a message."
"SUCCESS: Text becomes a nested list of steps by a parser with one function per rule, and malformed recipes are rejected with a reason."
```

Hint: Tokenize by putting spaces around the brackets and splitting. Keep a position and a `take()` helper that raises at the end. A `block()` function reads steps until `)` or the end; on `CYCLE` it reads the count, expects `(`, calls `block()` again, then expects `)`. After the top-level block, any leftover token is a stray `)`.
:::

::: challenge A condition language with precedence [hard]
Alarm rules are written as conditions such as `temp > 80 and not door_closed or pressure < 2`. Write `parse_condition(text)`, returning a tree of objects, each with a method `evaluate(env)` that returns True or False for a dict of readings. The language:

- **comparisons** `name op number`, with `op` one of `<`, `<=`, `>`, `>=`, `==`, `!=` (the number may be negative or have decimals); a missing name in `env` raises `KeyError`;
- a bare **name** is true when `env[name]` is truthy;
- `not x`, `a and b`, `a or b`, and brackets `( ... )`, with the usual precedence: `not` binds tightest, then `and`, then `or`. So `a or b and not c` means `a or (b and (not c))`. `and` and `or` group left to right.

Tokens are separated by spaces, except that brackets may touch the words next to them. Raise `SyntaxError` for anything malformed (a missing operand, an unknown operator, unbalanced brackets, a missing number, or leftover tokens). Write one function per precedence level: `or_expr` calls `and_expr`, which calls `not_expr`, which handles `not`, brackets and comparisons.

```python starter
def parse_condition(text):
    return None

print(parse_condition("temp > 80"))
```

```python solution
import operator

OPS = {"<": operator.lt, "<=": operator.le, ">": operator.gt, ">=": operator.ge, "==": operator.eq, "!=": operator.ne}

class Compare:
    def __init__(self, name, op, value):
        self.name, self.op, self.value = name, op, value
    def evaluate(self, env):
        return OPS[self.op](env[self.name], self.value)

class Flag:
    def __init__(self, name):
        self.name = name
    def evaluate(self, env):
        return bool(env[self.name])

class Not:
    def __init__(self, inner):
        self.inner = inner
    def evaluate(self, env):
        return not self.inner.evaluate(env)

class And:
    def __init__(self, left, right):
        self.left, self.right = left, right
    def evaluate(self, env):
        return self.left.evaluate(env) and self.right.evaluate(env)

class Or:
    def __init__(self, left, right):
        self.left, self.right = left, right
    def evaluate(self, env):
        return self.left.evaluate(env) or self.right.evaluate(env)

def parse_condition(text):
    tokens = text.replace("(", " ( ").replace(")", " ) ").split()
    position = 0

    def peek():
        return tokens[position] if position < len(tokens) else None

    def take():
        nonlocal position
        if position >= len(tokens):
            raise SyntaxError("unexpected end of condition")
        position += 1
        return tokens[position - 1]

    def or_expr():
        node = and_expr()
        while peek() == "or":
            take()
            node = Or(node, and_expr())
        return node

    def and_expr():
        node = not_expr()
        while peek() == "and":
            take()
            node = And(node, not_expr())
        return node

    def not_expr():
        token = take()
        if token == "not":
            return Not(not_expr())
        if token == "(":
            node = or_expr()
            if take() != ")":
                raise SyntaxError("missing )")
            return node
        if token in ("and", "or", ")") or token in OPS or not token.isidentifier():
            raise SyntaxError(f"expected a name, found {token!r}")
        if peek() in OPS:
            op = take()
            raw = take()
            try:
                value = float(raw)
            except ValueError:
                raise SyntaxError(f"expected a number after {op}, found {raw!r}") from None
            return Compare(token, op, value)
        return Flag(token)

    tree = or_expr()
    if position != len(tokens):
        raise SyntaxError(f"unexpected {tokens[position]!r}")
    return tree

rule = parse_condition("temp > 80 and not door_closed or pressure < 2")
print(rule.evaluate({"temp": 85, "door_closed": False, "pressure": 3}), rule.evaluate({"temp": 85, "door_closed": True, "pressure": 3}))
```

```python test
import itertools as _it
assert "parse_condition" in dir(), "Keep the function's name as parse_condition."
_rule = parse_condition("temp > 80 and not door_closed or pressure < 2")
assert _rule.evaluate({"temp": 85, "door_closed": False, "pressure": 3}) is True, "Hot with the door open: alarm."
assert _rule.evaluate({"temp": 85, "door_closed": True, "pressure": 3}) is False, "Hot but door closed and pressure fine: no alarm."
assert _rule.evaluate({"temp": 20, "door_closed": True, "pressure": 1.5}) is True, "Low pressure alone triggers it."
for _a, _b, _c in _it.product([False, True], repeat=3):
    _env = {"a": _a, "b": _b, "c": _c}
    assert parse_condition("a or b and not c").evaluate(_env) == (_a or (_b and not _c)), f"Precedence: a or (b and (not c)) at {_env}."
    assert parse_condition("(a or b) and not c").evaluate(_env) == ((_a or _b) and not _c), f"Brackets override precedence at {_env}."
    assert parse_condition("not not a and (b)").evaluate(_env) == (_a and _b), "not can repeat; brackets around a name."
assert parse_condition("x >= -2.5").evaluate({"x": -2.5}) and not parse_condition("x != 3").evaluate({"x": 3}), "Negative and decimal numbers, and the >= and != operators."
assert parse_condition("(x < 1)").evaluate({"x": 0}) is True, "Brackets may touch the words next to them."
try:
    parse_condition("missing > 1").evaluate({})
    assert False, "An unknown reading should raise KeyError when evaluated."
except KeyError:
    pass
for _bad in ["", "temp >", "temp > hot", "temp => 3", "a and", "or a", "(a or b", "a or b)", "a b", "not", "a and and b"]:
    try:
        parse_condition(_bad)
        assert False, f"{_bad!r} should raise SyntaxError."
    except SyntaxError:
        pass
"SUCCESS: One parsing function per precedence level turns the conditions into a tree of small objects that each evaluate themselves, the shape of every expression language."
```

Hint: Write node classes `Compare`, `Flag`, `Not`, `And` and `Or`, each with `evaluate(env)`. In the parser, `or_expr` reads an `and_expr` and then, while the next token is `or`, combines with another `and_expr`; `and_expr` does the same with `not_expr`. `not_expr` handles `not`, a bracketed `or_expr`, and finally a name, which is a comparison if the next token is an operator. Reject a token that is an operator or keyword where a name is expected.
:::

## What you learned

- A small domain-specific language lets people express exactly what they want; the interpreter pattern implements one with a class per kind of sentence, each interpreting itself.
- A program becomes a tree of these objects, a composite, so nested constructs such as `REPEAT` blocks need no special handling.
- Text becomes the tree in two steps: tokenizing into words, numbers and brackets, then parsing with a recursive-descent parser that has one function per grammar rule. Precedence comes from layering the functions.
- Parsers should reject malformed input with a message saying what was expected and where.
- Hand-written parsers suit small languages; larger ones call for a parser library, and often an existing format such as JSON, or a Python API, is better than a new language.

The next lesson steps back from the catalogue: which of these patterns Python makes unnecessary, and when plain functions, modules and dataclasses are the better design.
