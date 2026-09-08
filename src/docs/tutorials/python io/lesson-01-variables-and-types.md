# Lesson 1 — Variables, Types, and What's Actually in Memory

## What you'll learn
- What a variable actually is at runtime (a name bound to a value, not a labeled box)
- Why Python decides a value's type when the line *runs*, not before
- How a raw text line becomes typed data you can compute with
- Why parsing text into the right type is a real decision, not a formality

## What you'll build
A tiny parser that takes one line of CSV text — a movie record — and turns it into typed Python values you can actually use (compare years, do math on ratings, etc).

This uses `movies.csv`, a 5-row file we'll keep reusing and growing across lessons:
```
title,year,rating
The Matrix,1999,8.7
Spirited Away,2001,8.6
Parasite,2019,8.5
Arrival,2016,7.9
Coco,2017,8.4
```

## The question
If I hand you the text `"The Matrix,1999,8.7"`, that's just characters. How does it become a title you can print, a year you can compare, and a rating you can average — three different *kinds* of thing from one string?

## 1. Predict
Before running anything: what Python *type* do you think `year` will be if we do `year = "1999"`? Is it a number yet? Write your guess down — you'll check it in a second.

## 2. Try it
```python
line = "The Matrix,1999,8.7"
fields = line.split(",")

title = fields[0]
year = int(fields[1])
rating = float(fields[2])

print(title, type(title))
print(year, type(year))
print(rating, type(rating))
```

### What this code does
- `line = "The Matrix,1999,8.7"` — `line` is a **name**, not a container. Python doesn't put the string "inside" a box called `line`; it creates a string object in memory and makes `line` point at it. This matters later: when two names point at the *same* object versus two *equal but separate* objects, behavior changes (we'll hit this hard in Lesson 3 with equality).
- `.split(",")` — a method call on the string object. It scans the string for every `,` and returns a **new list** of the pieces *as strings*. Nothing here knows or cares that `"1999"` looks like a number — `split` only sees characters. This is the crux of the lesson: after `split`, everything is still text.
- `fields[0]` — list indexing. `fields` is `["The Matrix", "1999", "8.7"]`; `fields[0]` retrieves the object at position 0. Indexing doesn't copy or convert anything, it just retrieves a reference to what's already there.
- `title = fields[0]` — `title` now names the same string object `fields[0]` names. Still just text.
- `int(fields[1])` — this is where the real work happens. `int(...)` is not a cast in the C-family sense (it's not reinterpreting bytes) — it's a **constructor call**. It reads the *characters* `"1999"`, validates that they form a legal integer, and builds a brand-new `int` object with the value 1999. The string `"1999"` still exists unchanged; `year` names a completely different, new object.
- `float(fields[2])` — same idea, but the constructor understands decimal points and builds a `float` object instead.
- `type(x)` — asks the object itself what class created it. This is checked live, by inspecting the actual object in memory right now — not by reading your source code and predicting ahead of time.

### What happens
```
The Matrix <class 'str'>
1999 <class 'int'>
8.7 <class 'float'>
```

If you predicted `year` would already be a number before `int(...)` ran — that's the exact misconception this lesson exists to correct, and it's an extremely common one. `"1999"` and `1999` are different objects with different capabilities. You can't do `"1999" + 1` (Python will refuse — a string and an int don't add), but you can do `1999 + 1`.

## 3. Why?
### Code mechanics — compile-time vs. runtime
Python has **no compile-time type checking** on ordinary variables. There is no step where the language looks at `year = int(fields[1])` ahead of time and locks in "year is an int forever." Every single time this line executes, Python:
1. Evaluates the right-hand side (calls `int()`, gets an object back)
2. Binds the name `year` to whatever object that produced

If `fields[1]` were `"nineteen ninety nine"` instead of `"1999"`, `int(...)` would fail **at runtime**, the moment that line executes — not before, not when you wrote the code. This is why type errors from bad data always show up as crashes *while running*, never as a warning before you start. (Contrast: a language with compile-time types, like the C# in your schema's examples, would often catch a type mismatch before the program ever runs — Python can't, because it doesn't know what a variable "is" until it's holding something.)

### Mental model
```
"The Matrix,1999,8.7"   ← one string, no structure Python understands yet
        ↓ .split(",")
["The Matrix", "1999", "8.7"]   ← three strings, still just text
        ↓ int(...) / float(...) on the numeric-looking ones
title="The Matrix" (str)   year=1999 (int)   rating=8.7 (float)
        ↑ three different objects, three different capabilities
```

## 4. Change one thing
```diff
-year = int(fields[1])
+year = fields[1]
```

### What changed
`year` now names the original string `"1999"` instead of a new `int` object. No conversion happens at all.

### What did not change
`fields`, `title`, `rating`, and the parsing of the rating are untouched. The string `"1999"` itself is unaffected either way — `int()` never modifies its input, it only reads it and builds something new.

### Behavioral consequence
`year == 1999` is now `False` — a string is never equal to an int in Python, no matter what characters it holds. And `year > 2000` would now crash outright, because `>` isn't defined between a `str` and an `int`. This single change silently breaks any later code that assumes `year` is a number — which is exactly the kind of bug that "it ran without error, so it must be fine" hides from you.

## 5. Put it in the project
```python
def parse_movie_line(line):
    fields = line.split(",")
    return {
        "title": fields[0],
        "year": int(fields[1]),
        "rating": float(fields[2]),
    }

with open("movies.csv") as f:
    header = f.readline()          # discard "title,year,rating"
    movies = [parse_movie_line(line.strip()) for line in f]

for m in movies:
    print(m["title"], "-", m["year"])

newest = max(movies, key=lambda m: m["year"])
print("Most recent:", newest["title"])
```

### Code walkthrough
- `def parse_movie_line(line):` — wraps the parsing logic from step 2 into a reusable function, because we're about to do it 5 times, not once. The function takes one raw text line in, returns one typed record out.
- `return {...}` — builds a **dictionary**, a different structure than the list we used before. Where `fields[1]` required remembering "year is index 1," `movie["year"]` names the field. This is a deliberate upgrade: positional access (`fields[1]`) is fragile — reorder the CSV columns and your code breaks silently, giving you the wrong value instead of an error. Named access (`movie["year"]`) at least fails loudly if the key is wrong.
- `open("movies.csv") as f` — opens the file and hands you a file object `f`. The `with` block guarantees the file is closed when the block ends, even if an error happens inside it — a resource-management detail, not a parsing one, but a real trap if skipped (files left open can silently fail to save data or leak resources in longer programs).
- `f.readline()` — reads exactly one line (the header) and advances the file's internal read position past it, so the loop below never sees it.
- `for line in f` — iterating a file object yields it line by line, lazily, without loading the whole file into memory at once. For 5 rows this doesn't matter; for 5 million it's the difference between working and crashing.
- `.strip()` — removes the trailing newline character each line carries. Skip this and `fields[2]` would be `"8.7\n"`, and `float("8.7\n")` — try predicting: does that succeed or fail? (It succeeds — `float()` tolerates surrounding whitespace. `int()` does too. This is worth knowing, because it means a *missing* `.strip()` bug can hide for a while before something else exposes it.)
- `[parse_movie_line(line.strip()) for line in f]` — a list comprehension: runs the function once per line, collects the results into a list. Equivalent to a `for` loop that appends, just denser.
- `max(movies, key=lambda m: m["year"])` — `max` needs to know *what to compare* when the items are dictionaries, not raw numbers. `key=lambda m: m["year"]` tells it: "for each `m`, extract `m["year"]`, and compare those." This only works cleanly *because* `year` is a real `int` — if you'd kept it as a string from step 4's change, `max` would still run, but it would compare years as text, and `"9"` would rank above `"1000"` (string comparison is character-by-character, not numeric). That's a live consequence of the change you just made above — worth sitting with.

### Why this design?
A dict-of-fields per row, rather than a raw list per row, trades a tiny bit of verbosity for names that document themselves and errors that show up immediately (a typo'd key raises `KeyError` right where you made the mistake, instead of quietly returning the wrong column).

## 6. Trap
**Normal rule:** `int()` and `float()` convert clean numeric text reliably.
**Apparently equivalent code:** `int(fields[1])` on every row of a "clean-looking" CSV.
**Surprising result:** add one row like `Untitled,TBD,7.0` (a movie with no release year yet) and the whole program crashes on `int("TBD")`.
**Exact reason:** `int()` doesn't guess or default — it either parses successfully or raises `ValueError`, and it raises it the instant that specific line is processed, not before.
**Project consequence:** real-world data is never uniformly clean. The moment you accept a CSV from outside your own hands, "just parse it" needs to become "parse it, and decide what happens when a field doesn't fit" — that's a Lesson 2 topic (error handling), but the trap is worth seeing now so it's not a surprise later.

## 7. Exercise
- **Predict:** Before running it, what will `type(fields[1])` print — *before* the `int()` call is applied to it?
- **Modify:** Add a 4th column, `genre`, to `movies.csv` and to `parse_movie_line`. What type should it stay as, and why (hint: not everything needs converting)?
- **Break:** Add a row with a missing rating field (`Coco,2017,`) and run the loop. What error do you get, and on which exact line does it occur?
- **Repair:** Fix `parse_movie_line` so a missing rating doesn't crash the whole loop — even a rough fix (skip the row, or default to `None`) is fine; we'll do this properly in Lesson 2.
- **Trace:** Write out, step by step like the mental model diagram above, what `fields` and `movies` contain after each line of the `with open(...)` block runs on the full 5-row file.

## What to remember
- `split()` never gives you numbers — only ever more strings.
- `int()`/`float()` build new objects from text; they don't relabel or reinterpret the string.
- Python decides a value's type live, while the line runs — there's no earlier point checking this for you.
- A quiet type mistake (leaving a value as a string) doesn't always crash — sometimes it just silently gives you the wrong answer (see `max` on string years). That's more dangerous than a crash.

## Next lesson
Lesson 2 takes the "Break/Repair" exercise above and makes it real: structured error handling for malformed rows, plus upgrading `parse_movie_line`'s dict into a proper class — the first step toward Lesson 3, where we'll ask "are two parsed movies the same movie?" and discover that's a much less obvious question than it sounds.
