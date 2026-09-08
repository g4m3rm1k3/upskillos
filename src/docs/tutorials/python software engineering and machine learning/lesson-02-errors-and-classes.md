# Lesson 2 — Error Handling, and From Dict to Class

## What you'll learn
- What actually happens when Python "crashes" — an exception is a real object, not just a message
- How `try`/`except` intercepts that object instead of letting it propagate
- Why catching the *specific* error you expect is different from catching everything
- Why a dict of fields is a dead end, and what a class actually buys you over it

## What you'll build
`parse_movie_line` upgraded to survive a messy CSV instead of dying on the first bad row — and a `Movie` class replacing the dict, so a parsed record is a real *thing* instead of a bag of strings-and-numbers you access by name and hope you spelled right.

`movies.csv` now has two bad rows mixed in with the good ones:
```
title,year,rating
The Matrix,1999,8.7
Spirited Away,2001,8.6
Untitled,TBD,7.0
Parasite,2019,8.5
Coco,2017,
```

## The question
Row 3's year is `"TBD"`, not a number. Row 5's rating is missing entirely. Last lesson's `parse_movie_line` will crash the instant it hits either one — killing the whole program over one bad row out of five. Real files are like this constantly. What's the actual mechanism for surviving that, and what does it cost you to use it carelessly?

## 1. Predict
If you run last lesson's loop over this file, exactly which line of *your* code do you think Python will report the error on — the `for line in f` loop line, or the line inside `parse_movie_line` where the bad conversion happens?

## 2. Try it
```python
def parse_movie_line(line):
    fields = line.split(",")
    return {
        "title": fields[0],
        "year": int(fields[1]),
        "rating": float(fields[2]),
    }

parse_movie_line("Untitled,TBD,7.0")
```

### What this code does
- `int(fields[1])` — with `fields[1]` equal to `"TBD"`, the `int` constructor tries to parse those characters as an integer, fails, and does something specific: it doesn't return a sentinel like `None` or `-1`. It **raises an exception** — constructs a `ValueError` object carrying a message, and hands control up the call stack immediately, abandoning the rest of `parse_movie_line`'s body. The `"rating"` key is never even reached.
- Because nothing here catches that exception, it keeps propagating: out of `parse_movie_line`, out to whatever called it, and if nothing anywhere catches it, out to the Python interpreter itself, which prints a traceback and stops the program.

### What happens
```
Traceback (most recent call last):
  File "...", line 8, in <module>
    parse_movie_line("Untitled,TBD,7.0")
  File "...", line 4, in parse_movie_line
    "year": int(fields[1]),
ValueError: invalid literal for int() with base 10: 'TBD'
```

Read a traceback bottom-to-top: the last line names the actual problem (`ValueError`, with the offending text quoted); the lines above trace the path *back* to where you called it. Python reports the error at the exact line inside `parse_movie_line` where `int()` failed — not at the `for` loop that called it — because that's where the exception object was actually created.

## 3. Why?
### Code mechanics — exceptions as control flow, not just messages
An exception in Python isn't a print statement — it's a real object (an instance of the `ValueError` class here) that gets thrown up through the call stack until something agrees to handle it:

```python
try:
    year = int(fields[1])
except ValueError:
    year = None
```

- `try:` — marks a block where you're willing to have something go wrong.
- `int(fields[1])` — runs normally *unless* it raises.
- `except ValueError:` — this only catches a `ValueError` specifically. If `fields` had fewer than 3 elements and `fields[1]` itself failed (an `IndexError`, from indexing past the end of the list), this `except` block would **not** catch it — that's a different exception class, and it would keep propagating past this `try` entirely. This is deliberate, not a limitation: you're saying "I understand and expect *this specific* failure mode," not "silence anything that goes wrong here."
- `year = None` — only runs if the `except` actually caught something. `None` is Python's explicit "no value" — distinct from `0` or `""`, and importantly, distinct from a string like `"TBD"` too. It says *this field genuinely isn't a number*, rather than pretending it is.

### Compile-time vs. runtime
There is nothing at compile time (there isn't really a meaningful compile step for this in Python at all) that knows `int("TBD")` will fail. This is discovered purely at runtime, on that specific piece of data, which is exactly why you can't "type-check your way out of" bad input data — the code is perfectly valid; the *data* is the problem.

### Mental model
```
int(fields[1])
     ↓ succeeds → year = 1999, keep going normally
     ↓ fails    → ValueError object created
                        ↓ no try/except nearby → propagates up, up, up
                        ↓ try/except ValueError present → caught, except block runs, execution resumes AFTER the try block
```

## 4. Change one thing
```diff
-except ValueError:
+except:
     year = None
```

### What changed
The `except` clause no longer names a specific exception type. A bare `except:` catches **every** exception that reaches it — not just `ValueError`.

### What did not change
The `try` block, the fallback assignment, and the surrounding function are identical.

### Behavioral consequence
This looks safer — "catch everything, never crash" — but it's the opposite. Suppose you later introduce an actual bug elsewhere in this block, like typing `fields[1` (a genuine `SyntaxError`... bad example, that one wouldn't even run) — more realistically, imagine the block also did `year = int(felds[1])` — a typo'd variable name, raising `NameError`. A bare `except:` swallows *that* too, silently sets `year = None`, and reports success. You now have a real bug in your program disguised as "missing data." Naming `ValueError` specifically means only the failure you actually anticipated gets absorbed; everything else still surfaces loudly, which is what you want from a bug you didn't expect.

## 5. Put it in the project
```python
class Movie:
    def __init__(self, title, year, rating):
        self.title = title
        self.year = year
        self.rating = rating

    def __repr__(self):
        return f"Movie({self.title!r}, {self.year}, {self.rating})"


def parse_movie_line(line):
    fields = line.split(",")
    title = fields[0]

    try:
        year = int(fields[1])
    except ValueError:
        year = None

    try:
        rating = float(fields[2])
    except ValueError:
        rating = None

    return Movie(title, year, rating)


with open("movies.csv") as f:
    header = f.readline()
    movies = [parse_movie_line(line.strip()) for line in f]

for m in movies:
    print(m)

complete = [m for m in movies if m.year is not None and m.rating is not None]
print(f"{len(complete)} of {len(movies)} rows fully parsed")
```

### Code walkthrough
- `class Movie:` — declares a new type. Unlike the dict from Lesson 1, `Movie` is a blueprint: every instance is guaranteed to have exactly `title`, `year`, and `rating` — there's no way to accidentally misspell a key and get a silent `None`-shaped bug, the way `movie["yaer"]` would with a dict (a `KeyError`, sure, but only if you're lucky — with `.get("yaer")` it fails *silently* with no error at all).
- `def __init__(self, title, year, rating):` — the constructor. This runs automatically every time you write `Movie(...)`. `self` is the instance being built — not a keyword, just a strongly-conventional parameter name that always refers to "the object currently under construction."
- `self.title = title` — attaches the parameter `title` to *this specific instance* as an attribute. Without `self.`, `title = title` would just be a local variable inside `__init__` that vanishes when the function returns — the object would end up with no `title` attribute at all. This is a real, common trap.
- `def __repr__(self):` — a special ("dunder") method Python calls automatically when it needs to display the object — e.g. inside `print(m)` or in a traceback. Without it, `print(m)` would show something like `<__main__.Movie object at 0x7f...>` — technically correct, useless to you. Defining `__repr__` is how you opt into a readable representation.
- `f"Movie({self.title!r}, ...)"` — an f-string; `{self.title!r}` specifically means "use `repr()` on this value," which wraps strings in quotes — so `"Coco"` prints as `'Coco'` inside the repr, distinguishing "the string Coco" from "the bare word Coco" at a glance.
- `Movie(title, year, rating)` — this is a **constructor call**, not `__init__` itself. Python allocates a new, empty `Movie` object first, *then* calls `__init__` on it with the arguments you passed. `__init__` initializes an object that already exists; it doesn't create it (that distinction matters more once you meet `__new__`, which you likely won't need for a long time).
- `m.year is not None` — attribute access with a dot instead of a bracket. `m["year"]` doesn't work anymore, on purpose — `Movie` isn't a dict, it's a fixed-shape object, and that's the whole point of upgrading.
- `[m for m in movies if ...]` — a list comprehension with a filter condition, structurally the same idea as Lesson 1's comprehension, just with an `if` added.

### Why this design?
The dict from Lesson 1 worked for a single small script, but it has no memory of *what shape a movie is supposed to be* — nothing stops you from building a dict with a missing key, an extra key, or a typo'd key, and nothing tells you until something downstream breaks, possibly far from the actual mistake. A class fixes the shape once, in one place (`__init__`), and every `Movie` you ever create is guaranteed to match it.

## 6. Trap
**Normal rule:** `except ValueError` only catches value errors, so unrelated bugs still surface.
**Apparently equivalent code:** wrapping the *entire* `parse_movie_line` body in one big `try/except ValueError`, instead of wrapping just the `int(...)` and `float(...)` calls individually.
**Surprising result:** if `fields[0]` were somehow missing (a completely blank line, `fields = [""]`), you'd get an `IndexError` on `fields[1]`, not caught by `except ValueError` — the function crashes anyway, but now on a *different* line than the narrow version, and debugging where exactly it failed gets harder because the `try` block covers so much surface area.
**Exact reason:** a wide `try` block can't tell you *which* line inside it failed just from the exception type — you lose precision on purpose to save a few lines.
**Project consequence:** the narrower version above — separate `try` around just `int(...)` and separate `try` around just `float(...)` — costs a few more lines but tells you exactly which field failed, independently, which is what actually matters once you're parsing real-world data with unpredictable failure patterns.

## 7. Exercise
- **Predict:** In the `Movie` class above, if you construct `Movie("Coco", 2017, None)` and then print `m.rating`, what do you see — and is that different from what a dict would show for a missing key?
- **Modify:** Add a `genre` field to `Movie` (constructor, attribute, and `__repr__`), with no error handling needed since it's always a plain string.
- **Break:** In `__init__`, change `self.title = title` to just `title = title`. Then try `Movie("Coco", 2017, 8.4).title`. What happens, and why does the error message not mention `title` being undefined the way you might expect?
- **Repair:** Fix the break above.
- **Trace:** Walk through, line by line, what happens when `parse_movie_line("Coco,2017,")` runs — specifically at the moment `float(fields[2])` is called with an empty string. Is that a `ValueError` or something else? Predict before you run it.

## What to remember
- An exception is a real object thrown up the call stack — `try`/`except` intercepts it, it doesn't prevent it from being created.
- Catch the *specific* exception you expect; a bare `except:` hides bugs you didn't anticipate, it doesn't just handle the one you did.
- `self.x = x` inside `__init__` is not the same as `x = x` — only the former attaches data to the object.
- A class fixes the *shape* of your data once; a dict never guarantees that shape at all.

## Next lesson
Lesson 3: two separately-parsed `Movie` objects with identical title/year/rating — are they "the same movie"? You'll find `m1 == m2` gives a surprising answer with a plain class, and *why* it does that leads straight into value equality, `__eq__`, and eventually why records/dataclasses exist at all.
