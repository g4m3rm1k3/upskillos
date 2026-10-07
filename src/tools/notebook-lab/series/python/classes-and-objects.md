# Classes and objects

In lesson 2, `type(7)` printed `<class 'int'>`, and you were told to read "class" as "type" for now. It is time to find out what a class really is.

Everything you have worked with in Python is an **object**: a bundle of data together with the operations that make sense for that data. A string holds some characters and knows how to `upper()` and `split()` them. A list holds items and knows how to `append` and `sort`. A **class** is the blueprint that says what data a kind of object holds and what it can do; each object made from that blueprint is an **instance** of the class. `"hello"` is an instance of the class `str`.

This lesson shows how to write your own classes. It is how you create new kinds of object that fit your problem: a `BankAccount`, a `Player`, a `Playlist`. It is also the foundation of the design patterns in the Algorithms & Design Patterns series.

## Why bundle data and behaviour?

Suppose you are keeping track of bank accounts. You could use a dictionary for each account and separate functions to work on them:

```python type
account = {"owner": "Ada", "balance": 100}

def deposit(account, amount):
    account["balance"] += amount

deposit(account, 50)
print(account["balance"])
```

```output
150
```

That works, but nothing ties the data to the functions that are allowed to change it. Any code anywhere could write `account["balance"] = -1000000`, or misspell a key as `"balence"` and silently create a new one. As a program grows, keeping track of which functions go with which data gets harder and harder.

A class puts the data and the functions that work on it in one place, and gives the combination a name. That makes the program easier to understand, because related things live together, and easier to keep correct, because the class controls how its data can change.

## Your first class

```python type
class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def describe(self):
        return f"{self.name} is {self.age} years old."

rex = Dog("Rex", 3)
fido = Dog("Fido", 7)
print(rex.describe())
print(fido.name)
```

```output
Rex is 3 years old.
Fido
```

There is a lot here, so take it one piece at a time.

`class Dog:` starts the definition of a new class. By convention class names use **CapitalisedWords**, unlike the lowercase names of variables and functions, so you can tell a class apart at a glance.

`Dog("Rex", 3)` **creates** a new `Dog` object. Calling a class like a function makes a new instance of it. `rex` and `fido` are two separate `Dog` objects.

Inside the class are functions, which in a class are called **methods**. `__init__` (with two underscores on each side, pronounced "dunder init", short for "double underscore") is a special method that Python calls automatically when a new object is created. Its job is to set up the new object. The arguments you give to `Dog(...)` are passed on to `__init__`.

## What self means

Every method's first parameter is `self`. It refers to **the particular object the method is working on**.

When you write `rex = Dog("Rex", 3)`, Python creates a new, empty `Dog` object, and then calls `__init__` with that new object as `self`, `"Rex"` as `name` and `3` as `age`. The lines `self.name = name` and `self.age = age` store the values **on the object**. A value stored on an object like this is called an **attribute**. Afterwards, `rex.name` is `"Rex"`.

When you call `rex.describe()`, Python calls the `describe` method with `rex` as `self`, so `self.name` means `rex.name`. The same method called as `fido.describe()` gets `fido` as `self`. That is how one method, written once, works for every object of the class. In fact `rex.describe()` is shorthand for this:

```python type
class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def describe(self):
        return f"{self.name} is {self.age} years old."

rex = Dog("Rex", 3)
print(Dog.describe(rex))
print(rex.describe())
```

```output
Rex is 3 years old.
Rex is 3 years old.
```

Both lines do the same thing. The dot form is what everyone writes, but the long form shows what really happens: `self` is simply the object before the dot. You never pass `self` yourself; Python fills it in.

Forgetting `self` is the most common mistake with classes. Inside a method, a plain `name` is a local variable that disappears when the method returns; `self.name` is an attribute that stays on the object.

## Each object has its own attributes

Every instance has its own set of attributes. Changing one object's attribute does not affect any other object.

```python type
class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1
        return self.count

clicks = Counter()
visits = Counter()
clicks.increment()
clicks.increment()
visits.increment()
print("clicks:", clicks.count, "visits:", visits.count)
```

```output
clicks: 2 visits: 1
```

The two counters count separately, because each has its own `count` attribute. A method like `increment` that changes an object's attributes is how an object's **state** (the current values of its attributes) changes over time.

## A class that protects its data

Here is the bank account again, as a class. The methods are the intended ways to change the balance, and they refuse to do anything that would break the rules:

```python type
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self.balance += amount

    def withdraw(self, amount):
        if amount > self.balance:
            raise ValueError("insufficient funds")
        self.balance -= amount

account = BankAccount("Ada", 100)
account.deposit(50)
account.withdraw(30)
print(account.owner, account.balance)
try:
    account.withdraw(500)
except ValueError as e:
    print("Refused:", e)
print(account.balance)
```

```output
Ada 120
Refused: insufficient funds
120
```

The refused withdrawal left the balance unchanged at 120. Code that uses the class calls `deposit` and `withdraw` and never needs to know how the balance is stored.

Python does not actually stop anyone from writing `account.balance = -5` directly. Instead it relies on a convention: an attribute whose name starts with an underscore is meant to be used only by the class's own methods. Had this class named its attribute `self._balance`, that would tell other programmers to leave it alone and use the methods. Other code should leave it alone. This idea, hiding an object's details behind its methods, is called **encapsulation**, and the design lessons later in the series lean on it heavily.

## Attributes shared by the whole class

A variable assigned directly inside the class body, outside any method, is a **class attribute**. It belongs to the class itself and is shared by every instance, which suits values that are the same for all of them.

```python type
class Circle:
    pi = 3.14159

    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return Circle.pi * self.radius ** 2

small = Circle(1)
big = Circle(10)
print(small.area(), big.area())
print(small.pi, Circle.pi)
```

```output
3.14159 314.159
3.14159 3.14159
```

Looking up `small.pi` finds no `pi` attribute on the object, so Python looks on the class and finds it there.

Lesson 12 should make you suspicious of anything shared. A class attribute holding a **list** is shared by every instance, so appending to it from one object changes it for all of them. Predict what this prints.

```python type
class Student:
    grades = []

    def __init__(self, name):
        self.name = name

    def add_grade(self, grade):
        self.grades.append(grade)

ada = Student("Ada")
alan = Student("Alan")
ada.add_grade(90)
print(alan.grades)
```

```output
[90]
```

Alan has Ada's grade: there is one `grades` list, on the class. It is the same bug as the shared default list from lesson 9. The fix is to create the list in `__init__`, as `self.grades = []`, so every student gets their own. The rule: per-object data goes in `__init__` on `self`; only true constants go directly in the class body.

## Printing an object

What happens if you print an object of your own class?

```python type
class Dog:
    def __init__(self, name):
        self.name = name

print(Dog("Rex"))
```

Something like `<__main__.Dog object at 0x10a2b3c40>`: the class name and a memory address. Python has no idea what would be a useful description of a `Dog`. (`__main__` is the name Python gives to the code you are running directly.) The next lesson shows how to teach it, with special methods like `__repr__`.

## Objects that contain objects

An object's attributes can be any values, including lists of other objects. This is how programs model the real world: a library has books, an order has items, a playlist has songs.

```python type
class Book:
    def __init__(self, title, pages):
        self.title = title
        self.pages = pages

class Library:
    def __init__(self):
        self.books = []

    def add(self, book):
        self.books.append(book)

    def total_pages(self):
        return sum(book.pages for book in self.books)

    def titles(self):
        return [book.title for book in self.books]

library = Library()
library.add(Book("Dune", 412))
library.add(Book("Emma", 474))
print(library.titles())
print(library.total_pages())
```

```output
['Dune', 'Emma']
886
```

Each class has one clear job. `Book` knows about a single book; `Library` knows about the collection and asks each book for its pages. A useful rule of thumb when designing classes: the **nouns** in a description of the problem ("a library has books") often become classes, and the **verbs** ("add a book", "count the pages") become methods.

Finally, `isinstance(value, SomeClass)` checks whether a value is an instance of a class:

```python type
book = Book("Dune", 412)
print(isinstance(book, Book), isinstance(book, Library), isinstance("hi", str))
```

```output
True False True
```

::: challenge Rectangle [easy]
Write a class `Rectangle` whose `__init__` takes a `width` and a `height` and stores them as attributes, with three methods:

- `area()` returns the width times the height,
- `perimeter()` returns the distance all the way round,
- `is_square()` returns `True` if the width equals the height.

```python starter
class Rectangle:
    def __init__(self, width, height):
        width = width
        height = height

r = Rectangle(3, 4)
print(r.area(), r.perimeter(), r.is_square())
```

```python solution
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def perimeter(self):
        return 2 * (self.width + self.height)

    def is_square(self):
        return self.width == self.height

r = Rectangle(3, 4)
print(r.area(), r.perimeter(), r.is_square())
```

```python test
assert "Rectangle" in dir(), "Keep the class name Rectangle."
_r = Rectangle(3, 4)
assert getattr(_r, "width", None) == 3 and getattr(_r, "height", None) == 4, "__init__ should store the values on the object: self.width = width, self.height = height."
assert _r.area() == 12, f"Rectangle(3, 4).area() should be 12, but it returned {_r.area()!r}."
assert _r.perimeter() == 14, f"Rectangle(3, 4).perimeter() should be 14, but it returned {_r.perimeter()!r}."
assert _r.is_square() is False, "Rectangle(3, 4) is not a square."
_s = Rectangle(5, 5)
assert _s.is_square() is True and _s.area() == 25, "Rectangle(5, 5) should be a square with area 25."
assert _r.area() == 12, "Creating a second rectangle must not change the first one."
"SUCCESS: Each rectangle keeps its own width and height, and its methods use self."
```

Hint: In `__init__`, store the values with `self.width = width`; without `self.` they are only local variables. Each method takes `self` as its only parameter and reads `self.width` and `self.height`.
:::

::: challenge Account with history [medium]
Write a class `Account` with:

- `__init__(self, owner, balance=0)`, storing both, and starting an empty list `history`;
- `deposit(amount)`: raises `ValueError` if `amount` is not positive; otherwise adds it to the balance and appends `("deposit", amount)` to `history`;
- `withdraw(amount)`: raises `ValueError` if `amount` is not positive or is more than the balance; otherwise subtracts it and appends `("withdraw", amount)` to `history`.

Every account must have its **own** history.

```python starter
class Account:
    history = []

    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

a = Account("Ada", 100)
print(a.balance, a.history)
```

```python solution
class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance
        self.history = []

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self.balance += amount
        self.history.append(("deposit", amount))

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("withdrawal must be positive")
        if amount > self.balance:
            raise ValueError("insufficient funds")
        self.balance -= amount
        self.history.append(("withdraw", amount))

a = Account("Ada", 100)
print(a.balance, a.history)
```

```python test
assert "Account" in dir(), "Keep the class name Account."
_a = Account("Ada", 100)
_b = Account("Alan")
assert _a.owner == "Ada" and _a.balance == 100 and _b.balance == 0, "Store owner and balance, with balance defaulting to 0."
_a.deposit(50)
_a.withdraw(30)
assert _a.balance == 120, f"After depositing 50 and withdrawing 30 from 100, the balance should be 120, but it is {_a.balance}."
assert _a.history == [("deposit", 50), ("withdraw", 30)], f"Ada's history should be [('deposit', 50), ('withdraw', 30)], but it is {_a.history}."
assert _b.history == [], f"Alan's history should still be empty, but it is {_b.history}. Each account needs its own list, created in __init__."
for _bad in [lambda: _a.deposit(0), lambda: _a.deposit(-5), lambda: _a.withdraw(1000), lambda: _a.withdraw(-1)]:
    try:
        _bad()
    except ValueError:
        pass
    else:
        raise AssertionError("A deposit that is not positive, or a withdrawal that is not positive or is more than the balance, should raise ValueError.")
assert _a.balance == 120 and len(_a.history) == 2, "Refused requests must not change the balance or the history."
"SUCCESS: Each account guards its balance and keeps its own history."
```

Hint: Create the list in `__init__` as `self.history = []`, and remove the class attribute, which is shared by every account. In each method, check for bad amounts first and `raise ValueError(...)`, before changing anything.
:::

::: challenge Playlist [medium]
Write two classes:

- `Song`, whose `__init__` takes a `title` and a length in `seconds` and stores them.
- `Playlist`, which starts empty and has:
  - `add(song)`, which adds a `Song`;
  - `total_time()`, which returns the total length as a string `"minutes:seconds"`, with the seconds always two digits, so 125 seconds is `"2:05"`;
  - `longest()`, which returns the title of the longest song, or `None` if the playlist is empty. If two songs tie, return the first.

The starter's classes contain only `pass`, a statement that does nothing. Python does not allow an empty block, so `pass` is used as a placeholder until you write the real body. Replace it.

```python starter
class Song:
    pass

class Playlist:
    pass

p = Playlist()
p.add(Song("Intro", 65))
p.add(Song("Anthem", 240))
print(p.total_time(), p.longest())
```

```python solution
class Song:
    def __init__(self, title, seconds):
        self.title = title
        self.seconds = seconds

class Playlist:
    def __init__(self):
        self.songs = []

    def add(self, song):
        self.songs.append(song)

    def total_time(self):
        total = sum(song.seconds for song in self.songs)
        return f"{total // 60}:{total % 60:02}"

    def longest(self):
        best = None
        for song in self.songs:
            if best is None or song.seconds > best.seconds:
                best = song
        return None if best is None else best.title

p = Playlist()
p.add(Song("Intro", 65))
p.add(Song("Anthem", 240))
print(p.total_time(), p.longest())
```

```python test
assert "Song" in dir() and "Playlist" in dir(), "Keep the class names Song and Playlist."
_p = Playlist()
assert _p.total_time() == "0:00" and _p.longest() is None, f"An empty playlist should have total_time '0:00' and longest None, but got {_p.total_time()!r} and {_p.longest()!r}."
_p.add(Song("Intro", 65))
_p.add(Song("Anthem", 240))
assert _p.total_time() == "5:05", f"65 + 240 seconds is 5:05, but total_time returned {_p.total_time()!r}."
assert _p.longest() == "Anthem", f"The longest song is 'Anthem', but longest returned {_p.longest()!r}."
_p.add(Song("Tie", 240))
assert _p.longest() == "Anthem", "When two songs tie for longest, return the first one."
_q = Playlist()
_q.add(Song("One", 3600))
assert _q.total_time() == "60:00", f"3600 seconds is '60:00', but total_time returned {_q.total_time()!r}."
assert _p.total_time() == "9:05", "A second playlist must not share songs with the first."
"SUCCESS: Two classes working together, each with one job."
```

Hint: `Playlist.__init__` should create `self.songs = []`. For the time, add up the seconds, then use `//` and `%` by 60; the f-string format `:02` pads a number with a zero to two digits. For `longest`, use the "best so far" pattern on the song objects and return the title at the end.
:::

## What you learned

- A class is a blueprint for a kind of object; each object made from it is an instance. `ClassName(...)` creates one.
- `__init__` sets up a new object. Its first parameter, like every method's, is `self`: the object the method is working on.
- `self.name = value` stores an attribute on the object; forgetting `self.` makes a local variable that vanishes.
- `obj.method()` is shorthand for `ClassName.method(obj)`.
- Each instance has its own attributes, so objects keep separate state. Methods can check rules and raise exceptions to protect it.
- A leading underscore marks an attribute as internal to the class. Hiding details behind methods is called encapsulation.
- Class attributes are shared by all instances; never put a list there for per-object data.
- Objects can hold other objects. Nouns often become classes and verbs methods. `isinstance` checks an object's class.

Your objects still print as `<__main__.Dog object at 0x...>`, cannot be compared with `==`, and do not work with `len` or `+`. Next you will learn the special methods that let your own classes behave like Python's built-in types.
