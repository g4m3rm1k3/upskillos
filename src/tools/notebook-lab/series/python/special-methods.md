# Special methods

Your classes from the last lesson work, but they feel second-class next to Python's own types. Print one and you get `<__main__.Dog object at 0x...>`. Compare two equal ones with `==` and you get `False`. `len` does not work on them, and neither does `+`. Python's built-in types have none of these problems, and the reason is not magic: they define a set of **special methods** that Python calls behind the scenes. Your classes can define them too.

Special methods are the ones with double underscores on each side, like `__init__`, which you have already met. They are often called **dunder methods**. This lesson covers the most useful ones: how an object is shown, how it is compared, how it does arithmetic, and how it behaves like a collection. By the end, your own classes will work with `print`, `==`, `sorted`, `+`, `len`, `in` and `for` just like the built-in ones.

## How Python uses special methods

Every time you use an operator or a built-in function on an object, Python translates it into a method call on that object:

- `len(x)` calls `x.__len__()`
- `x + y` calls `x.__add__(y)`
- `x == y` calls `x.__eq__(y)`
- `x[i]` calls `x.__getitem__(i)`

You can see this for yourself with a built-in type:

```python type
print(len("hello"), "hello".__len__())
print(3 + 4, (3).__add__(4))
print([10, 20, 30][1], [10, 20, 30].__getitem__(1))
```

```output
5 5
7 7
20 20
```

You would never write the long forms in real code, but they show the rule. The operators and functions are the public face, and the special methods are what they call. So to make `len` work on your class, you write a `__len__` method; to make `+` work, you write `__add__`. This set of agreed method names is called Python's **data model**.

## Showing an object: __repr__ and __str__

The most useful special method of all is `__repr__`. It returns a string describing the object, and Python uses it whenever it needs to show the object for a programmer: inside a printed list, in the debugger, in error messages, and when you print an object that has no friendlier description.

```python type
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

p = Point(3, 4)
print(p)
print([Point(0, 0), Point(1, 2)])
p
```

```output
Point(3, 4)
[Point(0, 0), Point(1, 2)]
Point(3, 4)
```

The convention is for `__repr__` to look like the Python code that would create the object, so `Point(3, 4)`. Then anyone reading the output knows exactly what the object is, and could even copy it back into code. Write a `__repr__` for every class you make; it costs one line and makes debugging far easier.

There is a second method, `__str__`, for a friendlier description meant for end users. `print` and `str()` use `__str__` if the class has one, and fall back to `__repr__` if not. Most classes only need `__repr__`.

```python type
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    def __repr__(self):
        return f"Temperature({self.celsius})"

    def __str__(self):
        return f"{self.celsius}°C"

t = Temperature(21.5)
print(t)
print(repr(t))
print([t])
print(f"Today: {t}, or as code: {t!r}")
```

```output
21.5°C
Temperature(21.5)
[Temperature(21.5)]
Today: 21.5°C, or as code: Temperature(21.5)
```

`print(t)` uses `__str__`, but a list always shows its items with `__repr__`, which is why `[t]` shows `Temperature(21.5)`. In an f-string, `!r` asks for the repr.

## Comparing objects: __eq__

By default, `==` on two objects of your class asks whether they are the **same object**, exactly like `is`. That is rarely what you want. Predict what this prints.

```python type
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

print(Point(1, 2) == Point(1, 2))
```

```output
False
```

`False`: two separate objects, even though they hold the same values. Define `__eq__` to say what equality means for your class. It receives the other object and returns `True` or `False`:

```python type
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)

print(Point(1, 2) == Point(1, 2))
print(Point(1, 2) == Point(2, 1))
print(Point(1, 2) == "not a point")
```

```output
True
False
False
```

Comparing the attributes as tuples is a neat way to compare several of them at once. The `isinstance` check handles comparison with something that is not a `Point` at all. Returning the special value `NotImplemented` tells Python "I don't know how to compare with that", and Python then falls back to its default, which says they are not equal.

Defining `__eq__` has one side effect you need to know about. Sets and dictionaries rely on a rule: **objects that are equal must have equal hashes**. The default hash of an object is based on its identity, so two equal `Point`s would get different hashes and break the rule. To prevent that, Python removes the default hash when you define `__eq__`, which makes objects of your class **unhashable**: they can no longer go in a set or be a dictionary key. If your objects never change after they are created, you can make them hashable again by defining `__hash__` to hash the same values `__eq__` compares:

```python type
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)

    def __hash__(self):
        return hash((self.x, self.y))

visited = {Point(0, 0), Point(1, 2), Point(0, 0)}
print(visited)
```

```output
{Point(0, 0), Point(1, 2)}
```

The duplicate `Point(0, 0)` disappears from the set, because the two are now equal and have equal hashes.

## Ordering: __lt__ and sorting

`<` calls `__lt__` ("less than"). Define it, and `sorted`, `min` and `max` work on your objects too, since they only need `<` to compare items:

```python type
class Card:
    order = "23456789TJQKA"

    def __init__(self, rank):
        self.rank = rank

    def __repr__(self):
        return f"Card({self.rank!r})"

    def __lt__(self, other):
        return Card.order.index(self.rank) < Card.order.index(other.rank)

hand = [Card("K"), Card("3"), Card("A"), Card("T")]
print(sorted(hand))
print(max(hand))
```

```output
[Card('3'), Card('T'), Card('K'), Card('A')]
Card('A')
```

The rank order lives in a class attribute (a constant string, so sharing it is fine), and a card is "less than" another if its rank comes earlier in that string. The other comparison operators have their own methods: `__le__` for `<=`, `__gt__` for `>`, `__ge__` for `>=`.

Python's own tuples already know how to compare, and the rule is worth knowing because it is so often useful for sorting: tuples compare **item by item**. The first items are compared first, and only if they are equal do the second items decide, and so on.

```python type
print(sorted([(2, "b"), (1, "z"), (2, "a")]))
print((3, "x") < (3, "y"), (2, "z") < (3, "a"))
```

```output
[(1, 'z'), (2, 'a'), (2, 'b')]
True True
```

`(1, 'z')` comes first because 1 is smallest, whatever comes after it. The two tuples starting with 2 tie on their first item, so their second items decide. Sorting a list of `(score, name)` tuples therefore sorts by score, and breaks ties by name.

## Arithmetic: __add__, __mul__ and friends

Operators like `+`, `-` and `*` call `__add__`, `__sub__` and `__mul__`. This is how you give arithmetic to a new kind of mathematical object. A vector, an arrow with a length and a direction, is added by adding its components, and it is the basic object of the Machine Learning series:

```python type
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, number):
        return Vector(self.x * number, self.y * number)

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5

v = Vector(3, 4)
w = Vector(1, -1)
print(v + w)
print(v * 2)
print(abs(v))
```

```output
Vector(4, 3)
Vector(6, 8)
5.0
```

Each method returns a **new** `Vector` and leaves the originals unchanged, just as `3 + 4` does not change 3. `abs(v)` calls `__abs__`, used here for the vector's length.

There is one gap. `v * 2` works, but try `2 * v`: Python first asks the integer 2 to multiply by a vector, and `int` has no idea how. When the left-hand object cannot do an operation, Python gives the right-hand object a chance through a "reflected" method, `__rmul__`. Adding one line fixes it:

```python type
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"

    def __mul__(self, number):
        return Vector(self.x * number, self.y * number)

    def __rmul__(self, number):
        return self * number

print(2 * Vector(3, 4))
```

```output
Vector(6, 8)
```

`__rmul__` simply reuses `__mul__`, since multiplying by a number works the same from either side.

## Behaving like a collection

A class that holds a group of things can behave like one of Python's collections. `__len__` makes `len` work, and it also decides truthiness: an object with length 0 counts as false. `__getitem__` makes indexing work, and `__contains__` makes `in` work.

```python type
class Shelf:
    def __init__(self, titles):
        self._titles = list(titles)

    def __repr__(self):
        return f"Shelf({self._titles!r})"

    def __len__(self):
        return len(self._titles)

    def __getitem__(self, index):
        return self._titles[index]

    def __contains__(self, title):
        return title.lower() in [t.lower() for t in self._titles]

shelf = Shelf(["Dune", "Emma", "Ulysses"])
print(len(shelf), shelf[0], shelf[-1])
print("emma" in shelf)
for title in shelf:
    print("-", title)
print(shelf[1:])
```

```output
3 Dune Ulysses
True
- Dune
- Emma
- Ulysses
['Emma', 'Ulysses']
```

Notice the loop. You never wrote any code for `for`, but it works: if a class has `__getitem__` and no other way to loop, Python loops by asking for item 0, then 1, then 2, until an `IndexError` says there are no more. And because `__getitem__` hands the index straight on to a list, slices work too. `__contains__` gave `in` a custom meaning: finding a title regardless of capital letters. (Lesson 21 shows `__iter__`, the more general way to make an object loopable.)

## Use them where they make sense

Special methods make a class feel natural, but only when the meaning is obvious. `+` on two vectors clearly means vector addition. `+` on two bank accounts means... what? Merging them? Transferring money? When the meaning of an operator for your class is not obvious to a reader, write a normal method with a clear name instead, such as `account.transfer_to(other, amount)`. The goal is code that reads naturally, not code that uses every feature.

::: challenge Fractions [medium]
Write a class `Frac` for fractions, with:

- `__init__(self, top, bottom)`, storing the fraction **in lowest terms**. `Frac(2, 4)` is stored as 1/2. Use `math.gcd`, which gives the greatest common divisor of two numbers, to reduce it. You can assume `bottom` is positive.
- `__repr__`, returning text like `Frac(1, 2)`.
- `__eq__`, so that `Frac(1, 2) == Frac(2, 4)` is `True`.
- `__add__` and `__mul__`, each returning a new `Frac`. The rules are a/b + c/d = (ad + bc)/(bd), and a/b × c/d = (ac)/(bd).

```python starter
import math

class Frac:
    def __init__(self, top, bottom):
        self.top = top
        self.bottom = bottom

print(Frac(1, 2) + Frac(1, 3))
```

```python solution
import math

class Frac:
    def __init__(self, top, bottom):
        divisor = math.gcd(top, bottom)
        self.top = top // divisor
        self.bottom = bottom // divisor

    def __repr__(self):
        return f"Frac({self.top}, {self.bottom})"

    def __eq__(self, other):
        if not isinstance(other, Frac):
            return NotImplemented
        return (self.top, self.bottom) == (other.top, other.bottom)

    def __add__(self, other):
        return Frac(self.top * other.bottom + other.top * self.bottom, self.bottom * other.bottom)

    def __mul__(self, other):
        return Frac(self.top * other.top, self.bottom * other.bottom)

print(Frac(1, 2) + Frac(1, 3))
```

```python test
assert "Frac" in dir(), "Keep the class name Frac."
_h = Frac(2, 4)
assert (getattr(_h, "top", None), getattr(_h, "bottom", None)) == (1, 2), "Frac(2, 4) should be stored in lowest terms, with top 1 and bottom 2."
assert repr(Frac(3, 4)) == "Frac(3, 4)", f"repr(Frac(3, 4)) should be 'Frac(3, 4)', but it is {repr(Frac(3, 4))!r}."
assert Frac(1, 2) == Frac(2, 4), "Frac(1, 2) should equal Frac(2, 4)."
assert not (Frac(1, 2) == Frac(1, 3)), "Frac(1, 2) should not equal Frac(1, 3)."
assert Frac(1, 2) + Frac(1, 3) == Frac(5, 6), f"1/2 + 1/3 should be 5/6, but got {Frac(1, 2) + Frac(1, 3)!r}."
assert Frac(1, 2) + Frac(1, 2) == Frac(1, 1), "1/2 + 1/2 should be 1/1."
assert Frac(2, 3) * Frac(3, 4) == Frac(1, 2), f"2/3 × 3/4 should be 1/2, but got {Frac(2, 3) * Frac(3, 4)!r}."
assert repr(Frac(2, 3) * Frac(3, 4)) == "Frac(1, 2)", "The result of an operation should also be in lowest terms."
assert Frac(0, 5) == Frac(0, 1), "0/5 should equal 0/1."
_a = Frac(1, 4)
_ = _a + Frac(1, 4)
assert repr(_a) == "Frac(1, 4)", "Adding must return a new Frac and leave the original unchanged."
"SUCCESS: Your fractions print, compare and do arithmetic like a built-in type."
```

Hint: In `__init__`, compute `divisor = math.gcd(top, bottom)` and store `top // divisor` and `bottom // divisor`. Because the constructor reduces every fraction, `__add__` and `__mul__` can simply return `Frac(new_top, new_bottom)` and the result comes out reduced. With both sides reduced, `__eq__` can compare tops and bottoms directly.
:::

::: challenge A vector class [medium]
Write a class `Vec` for two-dimensional vectors, with:

- `__init__(self, x, y)` and `__repr__` returning text like `Vec(1, 2)`;
- `__add__` and `__sub__`, adding or subtracting component by component;
- `__mul__` and `__rmul__`, so that both `v * 3` and `3 * v` scale the vector by a number;
- `__eq__`, comparing components;
- `__abs__`, returning the length, the square root of x² + y².

```python starter
class Vec:
    def __init__(self, x, y):
        self.x = x
        self.y = y

v = Vec(3, 4)
print(v, abs(v), 2 * v)
```

```python solution
class Vec:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Vec({self.x}, {self.y})"

    def __add__(self, other):
        return Vec(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        return Vec(self.x - other.x, self.y - other.y)

    def __mul__(self, number):
        return Vec(self.x * number, self.y * number)

    def __rmul__(self, number):
        return self * number

    def __eq__(self, other):
        if not isinstance(other, Vec):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5

v = Vec(3, 4)
print(v, abs(v), 2 * v)
```

```python test
assert "Vec" in dir(), "Keep the class name Vec."
assert repr(Vec(1, 2)) == "Vec(1, 2)", f"repr(Vec(1, 2)) should be 'Vec(1, 2)', but it is {repr(Vec(1, 2))!r}."
assert Vec(1, 2) == Vec(1, 2) and not (Vec(1, 2) == Vec(2, 1)), "== should compare the components."
assert Vec(1, 2) + Vec(3, 4) == Vec(4, 6), f"Vec(1, 2) + Vec(3, 4) should be Vec(4, 6), got {Vec(1, 2) + Vec(3, 4)!r}."
assert Vec(5, 5) - Vec(1, 2) == Vec(4, 3), "Vec(5, 5) - Vec(1, 2) should be Vec(4, 3)."
assert Vec(1, -2) * 3 == Vec(3, -6), "Vec(1, -2) * 3 should be Vec(3, -6)."
try:
    _r = 3 * Vec(1, -2)
except TypeError:
    raise AssertionError("3 * Vec(1, -2) raised TypeError. Add __rmul__ so a number on the left works too.")
assert _r == Vec(3, -6), "3 * Vec(1, -2) should be Vec(3, -6)."
assert abs(Vec(3, 4)) == 5, f"abs(Vec(3, 4)) should be 5, got {abs(Vec(3, 4))!r}."
_v = Vec(1, 1)
_ = _v + Vec(1, 1)
assert _v == Vec(1, 1), "Operations must return a new Vec and leave the original unchanged."
"SUCCESS: Vectors that add, scale and measure. You will use exactly this idea throughout Machine Learning."
```

Hint: Each arithmetic method builds and returns a new `Vec` from the components. `__rmul__` can just `return self * number`, reusing `__mul__`. The length is `(x ** 2 + y ** 2) ** 0.5`.
:::

::: challenge A score sheet [medium]
Write a class `ScoreSheet` that holds players' scores and behaves like a collection:

- `__init__(self)` starts with no scores; `add(name, score)` records a score for a player (a later score for the same name replaces the earlier one);
- `len(sheet)` is the number of players;
- `sheet[name]` gives that player's score, and raises `KeyError` for an unknown name;
- `name in sheet` checks whether the player has a score;
- a normal method `ranking()` returns a list of the player names, from highest score to lowest. If two players have the same score, put them in alphabetical order.

```python starter
class ScoreSheet:
    def __init__(self):
        self.scores = {}

    def add(self, name, score):
        self.scores[name] = score

sheet = ScoreSheet()
sheet.add("Ada", 90)
sheet.add("Alan", 95)
print(len(sheet), sheet["Ada"], "Alan" in sheet, sheet.ranking())
```

```python solution
class ScoreSheet:
    def __init__(self):
        self.scores = {}

    def add(self, name, score):
        self.scores[name] = score

    def __len__(self):
        return len(self.scores)

    def __getitem__(self, name):
        return self.scores[name]

    def __contains__(self, name):
        return name in self.scores

    def ranking(self):
        pairs = sorted((-score, name) for name, score in self.scores.items())
        return [name for negative_score, name in pairs]

sheet = ScoreSheet()
sheet.add("Ada", 90)
sheet.add("Alan", 95)
print(len(sheet), sheet["Ada"], "Alan" in sheet, sheet.ranking())
```

```python test
assert "ScoreSheet" in dir(), "Keep the class name ScoreSheet."
_s = ScoreSheet()
assert len(_s) == 0 and _s.ranking() == [], "An empty sheet should have length 0 and an empty ranking."
_s.add("Ada", 90)
_s.add("Alan", 95)
_s.add("Grace", 70)
_s.add("Ada", 99)
_s.add("Bea", 70)
assert len(_s) == 4, f"There are 4 players, but len(sheet) is {len(_s)}."
assert _s["Ada"] == 99, f"Ada's later score of 99 should replace 90, but sheet['Ada'] is {_s['Ada']!r}."
assert "Grace" in _s and "Linus" not in _s, "'in' should check whether a player has a score."
try:
    _s["Linus"]
except KeyError:
    pass
else:
    raise AssertionError("sheet['Linus'] should raise KeyError for an unknown player.")
assert _s.ranking() == ["Ada", "Alan", "Bea", "Grace"], f"ranking() should be ['Ada', 'Alan', 'Bea', 'Grace'] (highest first, ties alphabetical), but it is {_s.ranking()}."
"SUCCESS: Your score sheet works with len, indexing and in, and ranks its players."
```

Hint: `__len__`, `__getitem__` and `__contains__` can each hand the work to the dictionary. For `ranking`, sort tuples, as in the lesson. To get the highest score first while keeping ties alphabetical, sort `(-score, name)` tuples: negating the score reverses its order but leaves the names alone.
:::

## What you learned

- Python turns operators and built-in functions into special method calls: `len(x)` is `x.__len__()`, `a + b` is `a.__add__(b)`.
- `__repr__` shows an object, ideally as the code that would create it; `__str__` is an optional friendlier version for `print`.
- `__eq__` defines `==` (return `NotImplemented` for unrelated types). Defining it makes objects unhashable unless you also define `__hash__`.
- `__lt__` defines `<`, which is all `sorted`, `min` and `max` need.
- `__add__`, `__sub__`, `__mul__` and `__abs__` give a class arithmetic; `__rmul__` handles a number on the left.
- `__len__`, `__getitem__` and `__contains__` make a class behave like a collection, and `__getitem__` with number indexes also makes `for` work.
- Only give operators to a class when their meaning is obvious.

Several of the classes in this lesson repeated each other: three versions of `Point`, two of `Vector`. Next you will learn inheritance, which lets one class build on another, so that shared behaviour is written once and each variation only adds what is different.
