# Lesson 3 — Equality: Same Values, Same Object?

## What you'll learn
- The difference between "same object" (identity) and "same values" (equality) — and which one `==` checks by default
- Why a plain class from Lesson 2 gives you the *wrong* answer to "are these the same movie?"
- How to define equality yourself, and what `@dataclass` gives you for free instead
- A real trap with floating-point equality that has nothing to do with classes at all

## What you'll build
Two `Movie` objects built from separately-parsed rows with identical title/year/rating — and code that correctly says "yes, same movie" instead of quietly saying "no."

## The question
```python
m1 = parse_movie_line("Coco,2017,8.4")
m2 = parse_movie_line("Coco,2017,8.4")
```
Same text, parsed twice, into two separate `Movie` objects using Lesson 2's class. What does `m1 == m2` print?

## 1. Predict
Write down your answer before reading further: `True` or `False`? Most people's gut says `True` — same title, same year, same rating, obviously the same movie. Hold that prediction.

## 2. Try it
```python
class Movie:
    def __init__(self, title, year, rating):
        self.title = title
        self.year = year
        self.rating = rating

m1 = Movie("Coco", 2017, 8.4)
m2 = Movie("Coco", 2017, 8.4)

print(m1 == m2)
print(m1 is m2)
print(id(m1), id(m2))
```

### What this code does
- `m1 = Movie(...)` and `m2 = Movie(...)` — two separate calls to the constructor, so Python allocates two distinct objects in memory. They happen to have equal attribute values, but they are not the same object.
- `m1 == m2` — calls `m1.__eq__(m2)` behind the scenes. Every `==` in Python is really a method call, not a built-in primitive comparison. Since `Movie` doesn't define `__eq__` itself, Python falls back to the version inherited from the base `object` class.
- `object`'s default `__eq__` compares **identity** — literally "is this the same object in memory," which is exactly what `is` checks directly.
- `id(m1)` — returns a number that (in the standard implementation) corresponds to the object's memory address. Two distinct objects always have different `id()`s, even with identical contents.

### What happens
```
False
False
140234123456784 140234123467920
```

If you predicted `True`, that's the exact misconception this lesson targets, and it's a genuinely common one — because in ordinary conversation "same movie" obviously means "same values." Python's default doesn't agree. `Movie` inherited an equality check that only asks "are you literally the identical object," and `m1`/`m2` aren't — they're two separate objects that merely *look* the same.

## 3. Why?
### Code mechanics
Every class you write in Python inherits from `object` unless you say otherwise. `object` provides a default `__eq__` that's equivalent to identity comparison — roughly `return self is other`. This is a reasonable *default* because Python has no way to guess, for an arbitrary class you write, which attributes should count toward "equal." Maybe two `Movie`s with the same title but different ratings *shouldn't* be equal, or maybe you only want to compare titles. Only you know that — so Python defaults to the one thing it can be sure of: whether it's literally the same object.

### Runtime behavior
`==` isn't special syntax with fixed meaning — it's sugar for calling `.__eq__()`. This is why you can override it: define `__eq__` yourself and `==` immediately uses your version instead, for that class, everywhere.

### Mental model
```
m1 = Movie("Coco", 2017, 8.4)     m2 = Movie("Coco", 2017, 8.4)
        ↓                                    ↓
  object at address A               object at address B
        \_______________  ==  ________________/
                          ↓
              object.__eq__ (default): is A the same address as B?
                          ↓
                         No → False
```

## 4. Change one thing
```diff
 class Movie:
     def __init__(self, title, year, rating):
         self.title = title
         self.year = year
         self.rating = rating
+
+    def __eq__(self, other):
+        return (self.title == other.title
+                and self.year == other.year
+                and self.rating == other.rating)
```

### What changed
`Movie` now defines its own `__eq__`, which Python calls instead of the inherited default the moment `==` is used between two `Movie`s.

### What did not change
`m1 is m2` is still `False` — you haven't touched identity, and you can't make two distinct objects "be" each other. Only what `==` *means* for this class has changed.

### Behavioral consequence
`m1 == m2` is now `True`. Notice the body of `__eq__` compares `self.title == other.title` — plain value comparison on strings, ints, and floats, which already does the sensible thing for those built-in types. You're not reinventing equality from scratch, just telling Python which attributes should participate in it for *your* type.

## 5. Put it in the project
Writing `__eq__` (and `__init__`, and `__repr__`) by hand for every field, every time, gets repetitive fast — and repetitive code is exactly where typos hide. `dataclasses` generates all of it from a single declaration:

```python
from dataclasses import dataclass

@dataclass
class Movie:
    title: str
    year: int
    rating: float


m1 = Movie("Coco", 2017, 8.4)
m2 = Movie("Coco", 2017, 8.4)

print(m1)          # Movie(title='Coco', year=2017, rating=8.4)
print(m1 == m2)     # True
print(m1 is m2)     # False
```

### Code walkthrough
- `from dataclasses import dataclass` — imports a **decorator**, a function that takes a class and returns a modified version of it.
- `@dataclass` — applying the decorator to `Movie`. At class-definition time (once, when Python first reads this code — not per-instance), it inspects the annotated fields below and generates `__init__`, `__repr__`, and `__eq__` for you, matching what you wrote by hand in the last two lessons.
- `title: str` — this is a **type annotation**, not a type *enforcement*. Critical distinction: Python does not check at runtime that `title` is actually a `str`. You could pass `Movie(42, 2017, 8.4)` and nothing would stop you — the annotation exists for `dataclass` to know *what fields exist* (so it can build `__init__` and friends), and for humans and tools like type checkers reading the code, not as a runtime guard. This is genuinely different from a language with enforced static types, and worth not confusing.
- The generated `__eq__` compares field-by-field, same as what you wrote manually in step 4 — `dataclass` isn't magic, it's writing the boilerplate you already understand.
- `print(m1)` now shows `Movie(title='Coco', year=2017, rating=8.4)` automatically — the generated `__repr__` — without you writing the f-string from Lesson 2 by hand.

### Why this design?
Hand-writing `__init__`/`__eq__`/`__repr__` was the right way to *learn* what they do (Lesson 2, and step 4 above) — now that you understand the mechanism, `@dataclass` removes the repetition without hiding what's actually happening, since you can always fall back to writing any of these methods manually if `Movie` ever needs custom behavior one of them doesn't cover.

## 6. Trap
**Normal rule:** value equality on numbers works the way you'd expect — `8.4 == 8.4` is `True`.
**Apparently equivalent code:**
```python
rating_from_parsing = float("8.4")
rating_from_math = 8.0 + 0.1 + 0.1 + 0.1 + 0.1
print(rating_from_parsing == rating_from_math)
```
**Surprising result:** `False`.
**Exact reason:** `float` values are stored in binary floating-point, which cannot represent most decimal fractions exactly — `0.1` in binary is actually a very slightly-off repeating value, and adding it four times accumulates a tiny error that isn't there when you parse `"8.4"` directly. `rating_from_math` ends up as something like `8.399999999999999`, not exactly `8.4`.
**Project consequence:** if `Movie`'s generated `__eq__` ever compares a rating that came from parsing against one that came from a computation (an average, a normalization, anything with arithmetic), two "obviously equal" movies can silently compare unequal. The fix isn't a different equality method — it's usually comparing with a tolerance (`abs(a - b) < 0.0001`) instead of `==` whenever floats came from different computation paths. This has nothing to do with classes or `dataclass` at all — it would bite you identically comparing two bare `float` variables — which is exactly why it's easy to miss once it's buried inside a generated `__eq__` you didn't write yourself.

## 7. Exercise
- **Predict:** With the `@dataclass` version, what does `m1 == "Coco"` (comparing a `Movie` to a plain string) return — `True`, `False`, or an error? Reason about what `other.title` would even mean if `other` is a string, then check.
- **Modify:** Add a `genre: str` field to the dataclass. Do `m1` and `m2` still compare equal if one has `genre="Animation"` and the other has `genre=""`?
- **Break:** Add a field `tags: list` (e.g. `tags=["family", "animation"]`) to two otherwise-identical movies, but build the lists separately (`["family"]` typed out twice, not shared). Are the two `Movie`s still equal? Reason about whether list equality in Python works like the identity-based default `Movie.__eq__` did before dataclasses, or like the value-based one you wrote by hand.
- **Repair:** N/A this lesson — instead, **compare**: write one sentence on why Python's built-in `list == list` already does the "right" value-based thing without you writing any code for it, while your custom `Movie` needed `__eq__` written explicitly to get the same behavior.
- **Trace:** Using the floating-point trap above, compute `0.1 + 0.1 + 0.1` in a Python shell and print it with full precision (`print(repr(0.1 + 0.1 + 0.1))`). Does it show exactly `0.3`?

## What to remember
- `==` is a method call (`__eq__`), not a fixed operator — its meaning depends entirely on the class.
- The default, inherited `__eq__` checks identity (`is`), not values — this is almost never what you actually want for data records.
- `@dataclass` generates `__init__`/`__repr__`/`__eq__` from annotated fields — but those annotations are documentation, not enforcement.
- Floats compared with `==` can silently fail for mathematical reasons that have nothing to do with your code being wrong.

## Next lesson
Lesson 4 leaves flat CSV behind: JSON, which nests. You've been treating one movie as one flat record — Lesson 4 asks what happens when a "movie" actually needs a list of `cast` members or a nested `studio: {name, country}` object, and why `fields[1]` stops making sense the moment data isn't a flat line of text anymore.
