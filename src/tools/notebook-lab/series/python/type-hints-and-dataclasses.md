# Type hints and dataclasses

As programs grow, two problems show up again and again. First, it becomes hard to remember what each function expects. Does `total(items)` want a list of prices, or a list of `Item` objects, or a dictionary? Does it return a number or a string? Second, a lot of class code is boilerplate: an `__init__` that copies each argument into an attribute, a `__repr__` that lists them, an `__eq__` that compares them. It is tedious to write and easy to get slightly wrong.

This lesson covers Python's answers to both. **Type hints** let you write down what types a function expects and returns, right in its definition. **Dataclasses** write the boilerplate methods of a class for you. On the way, you will meet the `@` syntax for decorators promised in the last lesson, and two built-in decorators that every Python programmer uses, `@property` and `@classmethod`.

## Type hints

A **type hint** (or **annotation**) says what type a value is meant to be. For a parameter, it goes after the name and a colon; for the return value, after an arrow `->` at the end of the `def` line.

```python type
def describe(name: str, age: int, height_m: float = 1.7) -> str:
    return f"{name}, {age}, {height_m} m"

print(describe("Ada", 36))
help(describe)
```

```output
Ada, 36, 1.7 m
Help on function describe:

describe(name: str, age: int, height_m: float = 1.7) -> str
```

Read it as: `name` should be a string, `age` an integer, `height_m` a float that defaults to 1.7, and the function returns a string. `help` shows the hints as part of the function's description, and so do code editors, which is one of their main benefits: when you type `describe(`, a good editor shows exactly what to pass.

Variables can be annotated too, though it is only worth it when the type is not obvious from the value:

```python type
count: int = 0
names: list[str] = []
print(count, names)
```

```output
0 []
```

## Hints are not enforced

The single most important thing to know about type hints is that **Python itself ignores them when the program runs**. They are documentation that tools can read, not rules that Python checks. Predict what happens here.

```python type
def double(x: int) -> int:
    return x * 2

print(double("ha"))
```

```output
haha
```

It prints `haha`. The hint says `x` should be an `int`, but Python happily multiplies a string by 2. To actually catch mistakes like this, programmers run a separate tool called a **type checker**, such as `mypy`, which reads the hints and reports calls that do not match, before the program ever runs. In a large program that catches a whole class of bugs early. There is no type checker in this notebook, but hints are still worth writing: they make code much easier to read, and every professional Python codebase uses them.

## Writing more detailed hints

For collections, put the type of the contents in square brackets:

- `list[int]`: a list of integers.
- `dict[str, float]`: a dictionary with string keys and float values.
- `tuple[int, int]`: a tuple of exactly two integers.
- `set[str]`: a set of strings.

A vertical bar means "either": `int | None` is an integer or `None`, which is the usual hint for something that might be missing. For "any type at all", use `Any` from the `typing` module.

```python type
def find_price(prices: dict[str, float], item: str) -> float | None:
    return prices.get(item)

def midpoint(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)

print(find_price({"tea": 2.5}, "coffee"))
print(midpoint((0, 0), (4, 2)))
print(midpoint.__annotations__)
```

```output
None
(2.0, 1.0)
{'a': tuple[float, float], 'b': tuple[float, float], 'return': tuple[float, float]}
```

The hints are stored on the function in an attribute called `__annotations__`, which is how tools read them.

## The @ syntax for decorators

In the last lesson you wrapped a function with `square = announce(square)`. Python has a shorthand for exactly this: write `@announce` on the line just above the `def`.

```python type
def announce(func):
    def wrapper(*args, **kwargs):
        print(f"calling {func.__name__}{args}")
        return func(*args, **kwargs)
    return wrapper

@announce
def add(a, b):
    return a + b

print(add(2, 3))
```

```output
calling add(2, 3)
5
```

`@announce` above `def add` means precisely "define `add`, then replace it with `announce(add)`". The wrapper uses `*args, **kwargs` so it works for any function, whatever its arguments. This `@` form is how decorators are nearly always applied, and it is what you will see in the rest of this lesson.

## @property: attributes that are calculated

Python has several built-in decorators for use inside classes. The most useful is `@property`, which lets a method be used as if it were an attribute, without parentheses. It is perfect for values calculated from other attributes. Predict what the second `print` shows, after the width changes.

```python type
class Rectangle:
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    @property
    def area(self) -> float:
        return self.width * self.height

r = Rectangle(3, 4)
print(r.area)
r.width = 10
print(r.area)
```

```output
12
40
```

`r.area` looks like an attribute but runs the method each time, so it is always up to date after `width` changes. A plain attribute set in `__init__` would still say 12.

A property can also control what happens when someone assigns to it, with a **setter**. This is how a class can check a value every time it changes, while other code still uses ordinary attribute syntax:

```python type
class Thermostat:
    def __init__(self, celsius: float):
        self.celsius = celsius

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float) -> None:
        if value < -50 or value > 50:
            raise ValueError(f"{value} is outside the range -50 to 50")
        self._celsius = value

t = Thermostat(20)
t.celsius = 23.5
print(t.celsius)
try:
    t.celsius = 400
except ValueError as e:
    print("Refused:", e)
```

```output
23.5
Refused: 400 is outside the range -50 to 50
```

The two methods are both called `celsius`, which looks like a mistake but is how the syntax works. `@property` turns the first `celsius` method into a property. Then `@celsius.setter` attaches the second method to **that same property**, as the code to run whenever something is assigned to it. Both must use the same name. The real value is kept in `self._celsius`, with the underscore marking it as internal (lesson 18). Every assignment to `t.celsius`, including the one in `__init__`, goes through the setter, which checks it.

## @classmethod: other ways to create an object

A method decorated with `@classmethod` receives the **class** as its first argument, called `cls` by convention, instead of an instance. Its main use is to provide alternative ways of creating objects, often named `from_something`:

```python type
class Colour:
    def __init__(self, red: int, green: int, blue: int):
        self.red, self.green, self.blue = red, green, blue

    def __repr__(self) -> str:
        return f"Colour({self.red}, {self.green}, {self.blue})"

    @classmethod
    def from_hex(cls, code: str) -> "Colour":
        code = code.lstrip("#")
        return cls(int(code[0:2], 16), int(code[2:4], 16), int(code[4:6], 16))

print(Colour(255, 0, 0))
print(Colour.from_hex("#1e90ff"))
```

```output
Colour(255, 0, 0)
Colour(30, 144, 255)
```

`Colour.from_hex(...)` is called on the class, parses the text, and calls `cls(...)`, which is `Colour(...)`, to build the object. (`int(text, 16)` reads text as a hexadecimal, base-16, number.) The return hint `"Colour"` is in quotation marks because, inside its own class body, the name `Colour` does not exist yet; a hint written as a string is read later, once it does.

## Dataclasses

Look at how much of a typical small class is repetition:

```python type
class PointOld:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"PointOld(x={self.x}, y={self.y})"

    def __eq__(self, other):
        return (self.x, self.y) == (other.x, other.y)

print(PointOld(1, 2), PointOld(1, 2) == PointOld(1, 2))
```

```output
PointOld(x=1, y=2) True
```

Every name appears several times, and adding a third attribute means editing all three methods. The `dataclasses` module's `@dataclass` decorator writes these methods for you, from a list of annotated attributes:

```python type
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

p = Point(1, 2)
print(p)
print(p == Point(1, 2))
print(p.x + p.y)
```

```output
Point(x=1, y=2)
True
3
```

The class body just lists the attributes with type hints. `@dataclass` reads them and generates `__init__`, `__repr__` and `__eq__`. The result is a normal class: you can add your own methods to it as usual.

Attributes can have defaults, written like default arguments. As with function parameters, attributes with defaults must come after those without.

```python type
from dataclasses import dataclass

@dataclass
class Item:
    name: str
    price: float
    quantity: int = 1

    def total(self) -> float:
        return self.price * self.quantity

basket = [Item("tea", 2.5, 2), Item("cake", 3.0)]
print(basket)
print(sum(item.total() for item in basket))
```

```output
[Item(name='tea', price=2.5, quantity=2), Item(name='cake', price=3.0, quantity=1)]
8.0
```

## The mutable default trap, again

Can a dataclass attribute default to an empty list? Not with `= []`: that would be one list shared by every object, the same trap as lesson 9's default argument and lesson 18's class attribute. `@dataclass` refuses it with a `ValueError` to protect you. Instead, use `field(default_factory=list)`, which calls `list()` to make a **new** list for each object. Predict: after adding to Ada's order, is Alan's list still empty?

```python type
from dataclasses import dataclass, field

@dataclass
class Order:
    customer: str
    items: list[str] = field(default_factory=list)

a = Order("Ada")
b = Order("Alan")
a.items.append("tea")
print(a, b)
```

```output
Order(customer='Ada', items=['tea']) Order(customer='Alan', items=[])
```

Each order gets its own list, so adding to Ada's leaves Alan's empty.

## Frozen and ordered dataclasses

Two options change what `@dataclass` generates:

- `@dataclass(frozen=True)` makes objects that cannot be changed after they are created, like tuples. Frozen objects are also hashable, so they can go in sets and be dictionary keys. (A plain dataclass is not: it defines `__eq__`, and lesson 19 showed that defining `__eq__` removes the default hash. Freezing is what makes a safe hash possible again.)
- `@dataclass(order=True)` generates `<`, `<=`, `>` and `>=`, comparing the attributes in order, like tuples. Then `sorted` works on the objects.

```python type
from dataclasses import dataclass, FrozenInstanceError

@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int

releases = [Version(2, 1), Version(1, 9), Version(2, 0)]
print(sorted(releases))
print(max(releases))
print({Version(1, 0), Version(1, 0)})
try:
    releases[0].major = 99
except FrozenInstanceError as e:
    print("FrozenInstanceError -", e)
```

```output
[Version(major=1, minor=9), Version(major=2, minor=0), Version(major=2, minor=1)]
Version(major=2, minor=1)
{Version(major=1, minor=0)}
FrozenInstanceError - cannot assign to field 'major'
```

Before running it, predict the sorted order. Versions sort by major number first, then minor, and duplicates collapse in a set. Trying to change a frozen object raises a `FrozenInstanceError`.

A dataclass can also check its values after they are set, with a method called `__post_init__`, which the generated `__init__` calls at the end:

```python type
from dataclasses import dataclass

@dataclass
class Percentage:
    value: float

    def __post_init__(self):
        if not 0 <= self.value <= 100:
            raise ValueError(f"{self.value} is not between 0 and 100")

print(Percentage(42))
try:
    Percentage(120)
except ValueError as e:
    print("Refused:", e)
```

```output
Percentage(value=42)
Refused: 120 is not between 0 and 100
```

Use a dataclass whenever a class is mainly a bundle of named data, which covers a large share of the classes you will write. Write the class by hand when its `__init__` needs to do real work.

::: challenge Annotate a function [easy]
The function `summarise` works, but has no type hints. Add hints so that:

- `scores` is a list of floats,
- `pass_mark` is a float, with its default of 50,
- the function returns a tuple of an int and a float.

Do not change what the function does.

```python starter
def summarise(scores, pass_mark=50):
    passed = sum(1 for s in scores if s >= pass_mark)
    average = sum(scores) / len(scores)
    return passed, average

print(summarise([40.0, 75.5, 90.0]))
```

```python solution
def summarise(scores: list[float], pass_mark: float = 50) -> tuple[int, float]:
    passed = sum(1 for s in scores if s >= pass_mark)
    average = sum(scores) / len(scores)
    return passed, average

print(summarise([40.0, 75.5, 90.0]))
```

```python test
assert "summarise" in dir(), "Keep the function's name as summarise."
_ann = summarise.__annotations__
assert _ann.get("scores") == list[float], f"scores should be hinted as list[float], but its hint is {_ann.get('scores')!r}."
assert _ann.get("pass_mark") is float, f"pass_mark should be hinted as float, but its hint is {_ann.get('pass_mark')!r}."
assert _ann.get("return") == tuple[int, float], f"The return type should be tuple[int, float], but it is {_ann.get('return')!r}."
assert summarise([40.0, 75.5, 90.0]) == (2, 68.5), "The function should still return (2, 68.5) for the example."
assert summarise([60.0], 70) == (0, 60.0), "pass_mark must still work as an argument with a default."
"SUCCESS: The function now says exactly what it takes and gives back."
```

Hint: A parameter with a hint and a default is written `pass_mark: float = 50`. The return hint goes before the colon at the end of the `def` line: `-> tuple[int, float]:`.
:::

::: challenge Order totals with dataclasses [medium]
Write two dataclasses:

- `Line`, with `product: str`, `unit_price: float` and `quantity: int` (defaulting to 1), and a method `subtotal()` returning price times quantity;
- `Order`, with `customer: str` and `lines`, a list of `Line` objects that starts empty for each order. It has a method `add(product, unit_price, quantity=1)` that appends a new `Line`, and a method `total()` that returns the sum of the subtotals, rounded to 2 decimal places.

```python starter
from dataclasses import dataclass, field

class Line:
    pass

class Order:
    pass

order = Order("Ada")
order.add("tea", 2.5, 2)
order.add("cake", 3.2)
print(order.total())
```

```python solution
from dataclasses import dataclass, field

@dataclass
class Line:
    product: str
    unit_price: float
    quantity: int = 1

    def subtotal(self) -> float:
        return self.unit_price * self.quantity

@dataclass
class Order:
    customer: str
    lines: list[Line] = field(default_factory=list)

    def add(self, product: str, unit_price: float, quantity: int = 1) -> None:
        self.lines.append(Line(product, unit_price, quantity))

    def total(self) -> float:
        return round(sum(line.subtotal() for line in self.lines), 2)

order = Order("Ada")
order.add("tea", 2.5, 2)
order.add("cake", 3.2)
print(order.total())
```

```python test
import dataclasses as _dc
assert _dc.is_dataclass(Line) and _dc.is_dataclass(Order), "Make both Line and Order dataclasses with @dataclass."
assert Line("tea", 2.5) == Line("tea", 2.5, 1), "Line's quantity should default to 1, and == should compare the fields."
assert Line("tea", 2.5, 2).subtotal() == 5.0, "Line('tea', 2.5, 2).subtotal() should be 5.0."
_a = Order("Ada")
_b = Order("Alan")
_a.add("tea", 2.5, 2)
_a.add("cake", 3.2)
assert _a.total() == 8.2, f"Ada's order total should be 8.2, but it is {_a.total()!r}."
assert _b.lines == [] and _b.total() == 0, "Alan's order must start with its own empty list of lines. Use field(default_factory=list)."
assert _a.lines[0] == Line("tea", 2.5, 2), "add should append a Line built from its arguments."
assert "Order(customer='Ada'" in repr(_a), "Let @dataclass generate the repr."
"SUCCESS: Two dataclasses, no boilerplate, and no shared list."
```

Hint: The `lines` field needs `field(default_factory=list)`; everything else follows the lesson's examples.
:::

::: challenge A checked property [medium]
Write a class `Account` with an `owner` and a `balance`. Make `balance` a **property** with a setter that raises `ValueError` if the new balance is negative, so that `account.balance = -5` is refused, including in `__init__`. Also add a read-only property `is_empty` that is `True` when the balance is exactly 0.

```python starter
class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

a = Account("Ada", 10)
a.balance = -5
print(a.balance)
```

```python solution
class Account:
    def __init__(self, owner: str, balance: float = 0):
        self.owner = owner
        self.balance = balance

    @property
    def balance(self) -> float:
        return self._balance

    @balance.setter
    def balance(self, value: float) -> None:
        if value < 0:
            raise ValueError("balance cannot be negative")
        self._balance = value

    @property
    def is_empty(self) -> bool:
        return self._balance == 0

a = Account("Ada", 10)
try:
    a.balance = -5
except ValueError as e:
    print("Refused:", e)
print(a.balance)
```

```python test
assert "Account" in dir(), "Keep the class name Account."
assert isinstance(Account.__dict__.get("balance"), property), "balance should be a property (use @property and @balance.setter)."
_a = Account("Ada", 10)
assert _a.balance == 10 and _a.owner == "Ada", "Account('Ada', 10) should have owner 'Ada' and balance 10."
_a.balance = 25
assert _a.balance == 25, "Assigning a valid balance should work."
try:
    _a.balance = -1
except ValueError:
    pass
else:
    raise AssertionError("Assigning a negative balance should raise ValueError.")
assert _a.balance == 25, "A refused assignment must leave the balance unchanged."
try:
    Account("Alan", -3)
except ValueError:
    pass
else:
    raise AssertionError("Account('Alan', -3) should raise ValueError: __init__ should go through the setter.")
assert Account("Bea").is_empty is True and _a.is_empty is False, "is_empty should be True only when the balance is 0 (and used without parentheses)."
"SUCCESS: The balance is checked on every change, and code using the class still just writes account.balance."
```

Hint: Keep the real value in an attribute with an underscore, and make sure `__init__` assigns through the setter rather than around it.
:::

## What you learned

- Type hints document what a function takes and returns: `def f(name: str, n: int = 1) -> bool:`. Collections are hinted like `list[int]` and `dict[str, float]`; `X | None` means "X or nothing".
- Python does not enforce hints when the program runs; separate type checkers like `mypy` use them, and editors and `help` show them.
- `@decorator` above a `def` means `f = decorator(f)`.
- `@property` makes a method read like an attribute; a `.setter` checks every assignment. `@classmethod` receives the class and is used for alternative constructors like `from_hex`.
- `@dataclass` generates `__init__`, `__repr__` and `__eq__` from annotated fields, with defaults like function parameters.
- Use `field(default_factory=list)` for a list field, never `= []`.
- `frozen=True` makes objects immutable and hashable; `order=True` makes them sortable; `__post_init__` checks values after creation.

You have written many small checks with `assert` throughout this series. The last lesson turns that habit into proper tests: organised, repeatable checks that tell you immediately when a change breaks something.
