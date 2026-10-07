# Inheritance

Programs often contain several kinds of thing that are mostly the same, with a few differences. A drawing program has circles, squares and triangles: every shape has a position and a colour, and every shape can report its area, but each works its area out differently. A game has characters: every character has a name and health, but a wizard casts spells and a knight does not.

Writing each of these as a completely separate class means repeating the shared parts in every one of them. **Inheritance** lets a class be built on top of another. The new class, called a **subclass** or **child class**, automatically gets everything from the existing one, its **parent class** or **base class**, and then adds to it or changes the parts that differ. This lesson shows how, when it is a good idea, and when it is not.

## A subclass

```python type
class Animal:
    def __init__(self, name):
        self.name = name

    def describe(self):
        return f"{self.name} is an animal."

    def speak(self):
        return "..."

class Dog(Animal):
    def speak(self):
        return "Woof!"

rex = Dog("Rex")
print(rex.describe())
print(rex.speak())
```

```output
Rex is an animal.
Woof!
```

`class Dog(Animal):` means "a `Dog` is a kind of `Animal`". The parent class goes in the brackets. `Dog` defines only one method, `speak`, yet `Dog("Rex")` works and `rex.describe()` works, because `Dog` **inherits** `__init__` and `describe` from `Animal`.

`Dog` also defines its own `speak`, which replaces the one from `Animal` for dogs. Defining a method in a subclass with the same name as one in the parent is called **overriding** it.

## How Python finds a method

When you call `rex.speak()`, Python looks for `speak` in a fixed order: first on the object itself (among the attributes stored with `self.x = ...`), then on its class `Dog`, then on the parent `Animal`, and so on up the chain. It uses the first one it finds. So `rex.speak()` finds `Dog.speak` and stops, while `rex.describe()` finds nothing on `Dog` and goes on to find `Animal.describe`.

At the top of every chain is a built-in class called `object`, which every class inherits from, whether you write it or not. That is where the default `__repr__` (the one that prints `<__main__.Dog object at 0x...>`) and the default `__eq__` come from. `isinstance` understands the chain too. Predict all five results before running the cell: is a `Dog` an `Animal`? Is an `Animal` a `Dog`?

```python type
class Animal:
    def __init__(self, name):
        self.name = name

class Dog(Animal):
    pass

rex = Dog("Rex")
print(isinstance(rex, Dog), isinstance(rex, Animal), isinstance(rex, object))
print(issubclass(Dog, Animal), issubclass(Animal, Dog))
```

```output
True True True
True False
```

`issubclass` asks the same question about classes rather than objects. A `Dog` is an `Animal`, but an `Animal` is not necessarily a `Dog`.

## Extending a method with super()

Often a subclass does not want to replace a parent's method completely, only to add to it. The most common case is `__init__`: the subclass needs everything the parent sets up, plus some extra attributes of its own. `super()` gives you access to the parent class's version of a method. Predict both sentences this cell prints.

```python type
class Animal:
    def __init__(self, name):
        self.name = name

    def describe(self):
        return f"{self.name} is an animal."

class Bird(Animal):
    def __init__(self, name, can_fly):
        super().__init__(name)
        self.can_fly = can_fly

    def describe(self):
        base = super().describe()
        flying = "can fly" if self.can_fly else "cannot fly"
        return f"{base} It {flying}."

print(Bird("Pingu", False).describe())
print(Bird("Tweety", True).describe())
```

```output
Pingu is an animal. It cannot fly.
Tweety is an animal. It can fly.
```

`super().__init__(name)` runs `Animal.__init__`, which sets `self.name`, and then `Bird.__init__` adds `self.can_fly`. Likewise `Bird.describe` takes the parent's sentence and adds to it, instead of copying its code.

Forgetting the `super().__init__` call is a classic mistake. The subclass's `__init__` replaces the parent's completely, so the parent's attributes are never created:

```python error AttributeError
class Animal:
    def __init__(self, name):
        self.name = name

class Cat(Animal):
    def __init__(self, name, indoor):
        self.indoor = indoor

tom = Cat("Tom", True)
print(tom.name)
```

The error says a `'Cat' object has no attribute 'name'`. Adding `super().__init__(name)` as the first line of `Cat.__init__` fixes it.

## One call, many behaviours

The real power of inheritance shows up when code works with a mix of related objects. Every shape below has an `area` method, each worked out its own way. The loop does not know or care which kind of shape it is dealing with; it just calls `area`, and each object runs its own version. Before running it, ask yourself: `describe` is written only in `Shape`, so when it calls `self.area()` for the first circle, which `area` runs?

```python type
class Shape:
    def area(self):
        raise NotImplementedError("each shape must define area()")

    def describe(self):
        return f"{type(self).__name__} with area {self.area():.2f}"

class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return 3.14159 * self.radius ** 2

class Square(Shape):
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side ** 2

shapes = [Circle(1), Square(3), Circle(2.5)]
for shape in shapes:
    print(shape.describe())
print("Total area:", round(sum(s.area() for s in shapes), 2))
```

```output
Circle with area 3.14
Square with area 9.00
Circle with area 19.63
Total area: 31.78
```

This is called **polymorphism**, from the Greek for "many forms": one method call, `shape.area()`, with a different behaviour for each kind of object. Notice that `describe` is written once, in `Shape`, and calls `self.area()`. Because `self` is the actual object, a `Circle` or a `Square`, the call finds the right `area`. The parent class defines the general procedure, and the subclasses fill in the details. (`type(self).__name__` is the name of the object's actual class, which is how `describe` prints "Circle" or "Square".)

`Shape.area` raises `NotImplementedError`, a built-in exception for exactly this purpose. `Shape` is not meant to be used on its own; it describes what every shape must provide. If someone writes a new shape and forgets to define `area`, they get a clear error the first time it is called, instead of a silently wrong answer. A class like this, meant only as a base for others, is called an **abstract base class**. (The standard library's `abc` module can enforce this more strictly, refusing even to create an object that has not defined every required method.)

## Your own exceptions

Lesson 14 used Python's built-in exceptions, like `ValueError`. Exceptions are classes, and `except ValueError` catches a `ValueError` **or any subclass of it**. So you can make your own kinds of exception simply by inheriting from an existing one:

```python type
class InsufficientFundsError(ValueError):
    pass

def withdraw(balance, amount):
    if amount > balance:
        raise InsufficientFundsError(f"balance {balance} is less than {amount}")
    return balance - amount

try:
    withdraw(50, 80)
except InsufficientFundsError as e:
    print("Specific handler:", e)

try:
    withdraw(50, 80)
except ValueError as e:
    print("General handler also works:", type(e).__name__)
```

```output
Specific handler: balance 50 is less than 80
General handler also works: InsufficientFundsError
```

The class body is just `pass`, because it needs nothing new: its name is what matters. Code that cares specifically about insufficient funds can catch `InsufficientFundsError`, while code that handles any bad value can still catch `ValueError`. Choose the parent that describes the problem: `ValueError` for bad values, `LookupError` (the parent of `KeyError` and `IndexError`) for something not found, or `Exception` for a general error of your own.

## Inherit only when "is a" is true

Inheritance is powerful, and so it is often overused. Use it only when the subclass really **is a** kind of the parent, and everything true of the parent is true of the child. A `Dog` is an `Animal`. A `SavingsAccount` is an `Account`. A `Circle` is a `Shape`.

When the relationship is "has a", use an attribute instead. A car **has** an engine, so a `Car` should hold an `Engine` object as an attribute, not inherit from `Engine`. A library has books, as in lesson 18. Building objects out of other objects like this is called **composition**, and it is usually more flexible than inheritance, because parts can be swapped without changing the class hierarchy. A common piece of advice is to **prefer composition over inheritance**, and to reach for inheritance when the "is a" relationship is clear. The Algorithms & Design Patterns series has a whole lesson on this choice.

(Python also lets a class inherit from several parents at once, written `class C(A, B):`. It has uses, but it makes the lookup order much harder to follow, and you will not need it in this series.)

::: challenge Shapes [easy]
The starter defines a base class `Shape`. Write two subclasses:

- `Rectangle(width, height)`, whose `area()` returns width times height;
- `Triangle(base, height)`, whose `area()` returns half of base times height.

Both must use the inherited `describe()` without redefining it.

```python starter
class Shape:
    def area(self):
        raise NotImplementedError("each shape must define area()")

    def describe(self):
        return f"{type(self).__name__} with area {self.area():.2f}"

print(Rectangle(3, 4).describe())
print(Triangle(3, 4).describe())
```

```python solution
class Shape:
    def area(self):
        raise NotImplementedError("each shape must define area()")

    def describe(self):
        return f"{type(self).__name__} with area {self.area():.2f}"

class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

class Triangle(Shape):
    def __init__(self, base, height):
        self.base = base
        self.height = height

    def area(self):
        return self.base * self.height / 2

print(Rectangle(3, 4).describe())
print(Triangle(3, 4).describe())
```

```python test
assert "Rectangle" in dir() and "Triangle" in dir(), "Define the classes Rectangle and Triangle."
assert issubclass(Rectangle, Shape) and issubclass(Triangle, Shape), "Rectangle and Triangle should both inherit from Shape: class Rectangle(Shape):"
assert "describe" not in Rectangle.__dict__ and "describe" not in Triangle.__dict__, "Use the describe() inherited from Shape instead of writing it again."
assert Rectangle(3, 4).area() == 12 and Triangle(3, 4).area() == 6, "Rectangle(3, 4).area() should be 12 and Triangle(3, 4).area() should be 6."
assert Rectangle(2, 5).describe() == "Rectangle with area 10.00", f"Rectangle(2, 5).describe() should be 'Rectangle with area 10.00', got {Rectangle(2, 5).describe()!r}."
assert Triangle(5, 3).describe() == "Triangle with area 7.50", f"Triangle(5, 3).describe() should be 'Triangle with area 7.50', got {Triangle(5, 3).describe()!r}."
"SUCCESS: One describe(), written once, working for every shape."
```

Hint: Each subclass starts `class Rectangle(Shape):`, has its own `__init__` storing its measurements, and its own `area`. The `describe` method comes from `Shape` automatically.
:::

::: challenge Savings account [medium]
The starter has a working `Account` class. Write a subclass `SavingsAccount` that:

- takes an extra `rate` argument (for example 0.02 for 2%) after the owner and balance, stores it as `self.rate`, and uses `super().__init__` for the rest;
- has a method `add_interest()` that adds `balance * rate` to the balance;
- refuses any withdrawal that would leave less than 100 in the account, by raising `ValueError`. Otherwise it withdraws as normal, by calling the parent's `withdraw`.

```python starter
class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def withdraw(self, amount):
        if amount > self.balance:
            raise ValueError("insufficient funds")
        self.balance -= amount

class SavingsAccount(Account):
    pass

s = SavingsAccount("Ada", 1000, 0.02)
s.add_interest()
print(s.balance)
```

```python solution
class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def withdraw(self, amount):
        if amount > self.balance:
            raise ValueError("insufficient funds")
        self.balance -= amount

class SavingsAccount(Account):
    def __init__(self, owner, balance, rate):
        super().__init__(owner, balance)
        self.rate = rate

    def add_interest(self):
        self.balance += self.balance * self.rate

    def withdraw(self, amount):
        if self.balance - amount < 100:
            raise ValueError("a savings account must keep at least 100")
        super().withdraw(amount)

s = SavingsAccount("Ada", 1000, 0.02)
s.add_interest()
print(s.balance)
```

```python test
assert "SavingsAccount" in dir(), "Keep the class name SavingsAccount."
assert issubclass(SavingsAccount, Account), "SavingsAccount should inherit from Account."
_s = SavingsAccount("Ada", 1000, 0.02)
assert _s.owner == "Ada" and _s.balance == 1000 and _s.rate == 0.02, "SavingsAccount should store owner and balance (through super().__init__) and rate."
_s.add_interest()
assert abs(_s.balance - 1020) < 1e-9, f"After add_interest at 2% on 1000, the balance should be 1020, but it is {_s.balance}."
_s.withdraw(900)
assert abs(_s.balance - 120) < 1e-9, f"Withdrawing 900 from 1020 should leave 120, but the balance is {_s.balance}."
try:
    _s.withdraw(30)
except ValueError:
    pass
else:
    raise AssertionError("Withdrawing 30 from 120 would leave 90, below 100, so it should raise ValueError.")
assert abs(_s.balance - 120) < 1e-9, "A refused withdrawal must not change the balance."
_s.withdraw(20)
assert abs(_s.balance - 100) < 1e-9, "Withdrawing down to exactly 100 is allowed."
_plain = Account("Alan", 50)
_plain.withdraw(50)
assert _plain.balance == 0, "The ordinary Account must still allow withdrawing everything."
assert "super()" in _source, "Use super() to reuse the parent's methods."
"SUCCESS: The savings account reuses Account and changes only what differs."
```

Hint: `__init__` should call `super().__init__(owner, balance)` and then store `self.rate`. Override `withdraw`: check the minimum balance first and raise if it would be broken, then call `super().withdraw(amount)` to do the actual withdrawal.
:::

::: challenge Validation errors [medium]
Create a small family of exceptions for checking user names:

- `ValidationError`, a subclass of `ValueError`;
- `TooShortError` and `BadCharacterError`, both subclasses of `ValidationError`.

Then write `validate_username(name)`, which raises `TooShortError` if `name` has fewer than 3 characters, raises `BadCharacterError` if it contains anything other than letters, digits and underscores, and otherwise returns `name` in lowercase. (The string method `isalnum()` is `True` if every character is a letter or digit.)

```python starter
def validate_username(name):
    return name.lower()

print(validate_username("Ada_99"))
```

```python solution
class ValidationError(ValueError):
    pass

class TooShortError(ValidationError):
    pass

class BadCharacterError(ValidationError):
    pass

def validate_username(name):
    if len(name) < 3:
        raise TooShortError(f"{name!r} is shorter than 3 characters")
    for character in name:
        if not (character.isalnum() or character == "_"):
            raise BadCharacterError(f"{name!r} contains {character!r}")
    return name.lower()

print(validate_username("Ada_99"))
```

```python test
for _cls in ["ValidationError", "TooShortError", "BadCharacterError", "validate_username"]:
    assert _cls in dir(), f"Define {_cls}."
assert issubclass(ValidationError, ValueError), "ValidationError should inherit from ValueError."
assert issubclass(TooShortError, ValidationError) and issubclass(BadCharacterError, ValidationError), "TooShortError and BadCharacterError should both inherit from ValidationError."
assert validate_username("Ada_99") == "ada_99", "A valid name should come back in lowercase."
for _name, _cls in [("ab", TooShortError), ("", TooShortError), ("ada lovelace", BadCharacterError), ("ada!", BadCharacterError), ("x-y-z", BadCharacterError)]:
    try:
        validate_username(_name)
    except _cls:
        pass
    except Exception as _e:
        raise AssertionError(f"validate_username({_name!r}) should raise {_cls.__name__}, but raised {type(_e).__name__}.")
    else:
        raise AssertionError(f"validate_username({_name!r}) should raise {_cls.__name__}, but it returned normally.")
"SUCCESS: Specific errors for specific problems, all catchable as ValueError."
```

Hint: Each exception class needs only `pass` as its body; what matters is the parent in brackets. In the function, check the length first, then loop over the characters and raise as soon as one is neither `isalnum()` nor `"_"`.
:::

## What you learned

- `class Child(Parent):` makes a subclass that inherits every method and attribute of the parent.
- Defining a method with the same name overrides the parent's. Python looks for methods on the object, then its class, then each parent in turn, up to `object`.
- `super().method(...)` calls the parent's version, most importantly `super().__init__(...)` in a subclass's `__init__`.
- `isinstance` and `issubclass` understand inheritance: a subclass instance is also an instance of its parent.
- Polymorphism: one call, like `shape.area()`, runs whichever version belongs to the actual object. A base method can raise `NotImplementedError` to require subclasses to provide it.
- Custom exceptions are subclasses of built-in ones, and `except Parent` also catches every subclass.
- Inherit only for a true "is a" relationship; for "has a", use composition.

Every `for` loop you have written has quietly relied on a protocol of two special methods. Next you will see exactly how iteration works, and write generators: functions that produce values one at a time, only when they are asked for.
