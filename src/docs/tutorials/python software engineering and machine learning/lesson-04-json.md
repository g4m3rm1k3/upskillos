# Lesson 4 — Nested Data: JSON, Dicts of Dicts, and a Real Trap

## What you'll learn
- Why flat CSV parsing (`fields[1]`) breaks down the moment data has structure
- How `json.loads` turns text into nested Python dicts/lists, and what rules govern that mapping
- The difference between a **missing key** and a **key whose value is `null`** — and why that difference causes real crashes
- Safe patterns for reaching into nested data without assuming every level exists

## What you'll build
A parser for `movies.json`, where each movie now has a nested `studio` object and a `cast` list — structure a flat CSV line could never represent.

```json
[
  {
    "title": "Coco",
    "year": 2017,
    "rating": 8.4,
    "studio": {"name": "Pixar", "country": "USA"},
    "cast": ["Anthony Gonzalez", "Gael García Bernal"]
  },
  {
    "title": "Arrival",
    "year": 2016,
    "rating": 7.9,
    "studio": null,
    "cast": ["Amy Adams", "Jeremy Renner"]
  }
]
```

Notice `Arrival`'s `studio` is explicitly `null` — not missing, present and empty. Hold onto that; it's the trap.

## The question
`fields[1]` worked for CSV because a row is flat — one level of text, split once. `studio` isn't one value, it's a whole object with its own fields, and `cast` isn't one value either, it's a list of them. What does "the second field" even mean here? It doesn't — flat indexing has nothing to grab onto anymore.

## 1. Predict
Before running anything: when this JSON is loaded into Python, what *type* do you think the top-level structure becomes — a list, a dict, something else? And what type does `"studio": {"name": "Pixar", ...}` become?

## 2. Try it
```python
import json

with open("movies.json") as f:
    movies = json.load(f)

print(type(movies))
print(type(movies[0]))
print(type(movies[0]["studio"]))
print(movies[0]["studio"]["name"])
```

### What this code does
- `import json` — brings in Python's standard JSON module. JSON parsing isn't a language feature, it's a library reading text according to the JSON grammar.
- `json.load(f)` — reads the *entire* file object `f` and parses it in one call, returning fully-built Python objects. (There's also `json.loads` — with an `s` — for parsing a string you already have in memory rather than a file; you'll see both.)
- The mapping `json.load` applies is fixed and worth memorizing once: JSON `{...}` → Python `dict`, JSON `[...]` → Python `list`, JSON string → `str`, JSON number → `int` or `float` depending on whether it has a decimal point, JSON `true`/`false` → `True`/`False`, JSON `null` → `None`.
- `movies[0]["studio"]` — because the whole file parsed into nested dicts and lists, reaching "the studio of the first movie" means indexing the list, then keying into the resulting dict. There's no new syntax here — it's the same `[]` you already know, just chained, because the *data* is chained.
- `movies[0]["studio"]["name"]` — one more level: index the list, key into that dict, key into the nested dict.

### What happens
```
<class 'list'>
<class 'dict'>
<class 'dict'>
Pixar
```

The whole file became one Python `list`, each element became a `dict`, and `studio`'s value became its own nested `dict` — exactly following the JSON→Python mapping above. Nothing about *how* you index changes at each level; what changes is that you now have to do it more than once, because the data has more than one level.

## 3. Why?
### Code mechanics
JSON's grammar is recursive by nature: an object's *value* can itself be another whole object, or a whole array, which can itself contain more objects. `json.load` mirrors that recursively too — it doesn't have special-case code for "objects nested one level deep" versus "two levels deep"; it applies the same object-parsing logic wherever it finds `{`, no matter how deep. You don't need to write recursive code yourself here — the *library* handles the recursion — but recognizing that the data's shape is recursive is exactly why `movies[0]["studio"]["name"]` is a *chain* of the same operation, not three different operations.

### Runtime behavior
All of this happens the moment `json.load(f)` runs — it eagerly builds the entire nested structure in memory before returning. There's no lazy evaluation here the way the file-line iteration was lazy in Lesson 1; for a huge JSON file this matters (it must all fit in memory at once), which is a real practical limit you'll eventually hit with big datasets.

### Mental model
```
movies.json (text)
      ↓ json.load
[ dict, dict, ... ]                    ← top-level: list of movies
      ↓ movies[0]
{ "title": ..., "studio": {...}, "cast": [...] }   ← one movie: dict
      ↓ movies[0]["studio"]
{ "name": "Pixar", "country": "USA" }  ← nested dict
      ↓ movies[0]["studio"]["name"]
"Pixar"                                ← plain string, bottom of the chain
```

## 4. Change one thing
```diff
-print(movies[0]["studio"]["name"])
+print(movies[1]["studio"]["name"])
```

### What changed
Now looking at `movies[1]` — `Arrival` — instead of `movies[0]`.

### What did not change
The access pattern itself, `["studio"]["name"]`, is identical.

### Behavioral consequence
```
Traceback (most recent call last):
    ...
AttributeError: 'NoneType' object has no attribute '__getitem__'
```
Recall `Arrival`'s `"studio": null` in the source JSON. `json.load` mapped that `null` to Python's `None` — a real, present value, not an absence. `movies[1]["studio"]` successfully returns `None`. The crash happens one step later, at `["name"]`, because you can't index into `None` — `None` isn't a dict, it has no keys. This is a **different failure** from a genuinely missing key, and the distinction is the whole point of this lesson.

## 5. Put it in the project
```python
import json

def describe_movie(movie):
    title = movie["title"]

    studio = movie.get("studio")
    if studio is not None:
        studio_name = studio.get("name", "Unknown studio")
    else:
        studio_name = "Unknown studio"

    cast = movie.get("cast", [])
    cast_text = ", ".join(cast) if cast else "no cast listed"

    return f"{title} ({studio_name}) — {cast_text}"


with open("movies.json") as f:
    movies = json.load(f)

for movie in movies:
    print(describe_movie(movie))
```

### Code walkthrough
- `movie["title"]` — plain bracket access, used deliberately here without `.get()`. This says "I'm certain every movie has a title; if one doesn't, I *want* a loud `KeyError`, not a silent fallback" — a real design decision, not an oversight. Contrast this with `studio` and `cast`, which the data has already shown you can be absent or `null`.
- `movie.get("studio")` — `.get()` on a dict returns `None` if the key is missing, instead of raising `KeyError`. Critically, it *also* returns `None` if the key exists and its value genuinely is `None` — `.get()` cannot tell "missing" and "explicitly null" apart, because by the time you're calling `.get()`, `json.load` has already collapsed both into the same Python value. This is why the code below it explicitly checks `if studio is not None:` rather than trusting `.get()`'s default alone.
- `studio.get("name", "Unknown studio")` — the two-argument form of `.get()`: return the value at `"name"` if present, otherwise return the second argument as a fallback. This only runs *after* confirming `studio` isn't `None` — calling `.get()` on `None` itself would be the exact crash from step 4.
- `movie.get("cast", [])` — defaults to an empty list if `cast` is missing. An empty list is a deliberately safe default here because it can still be iterated and joined without a separate `None` check — unlike `studio`, where a dict-shaped default (`{}`) would silently *hide* the "no studio" case instead of reporting it honestly, an empty cast list is a genuinely reasonable "no cast" answer for this text.
- `", ".join(cast)` — turns the list `["Amy Adams", "Jeremy Renner"]` into the single string `"Amy Adams, Jeremy Renner"`. `join` is a string method called *on* the separator, taking the list as its argument — commonly written backwards by beginners as `cast.join(", ")`, which fails, because lists don't have a `.join()` method; only strings do.

### Why this design?
`title` uses strict bracket access; `studio` and `cast` use defensive `.get()` with explicit `None` handling. That asymmetry is intentional, not sloppy — it reflects an actual claim about the data ("title is guaranteed, studio and cast are not"), made visible in the code instead of buried in a single blanket `try/except` around the whole function.

## 6. Trap
**Normal rule:** `dict.get(key, default)` returns `default` when the key is missing.
**Apparently equivalent code:** `movie.get("studio", {}).get("name")` — chaining `.get()` calls, trusting the default to protect the next step.
**Surprising result:** for `Arrival`, this still crashes with `AttributeError: 'NoneType' object has no attribute 'get'`.
**Exact reason:** the default value `{}` only kicks in when the key `"studio"` is *absent*. `Arrival`'s JSON has `"studio": null` — the key **is present**, its value is `None`. `.get("studio", {})` sees the key exists, returns its actual value (`None`), and never touches the default at all. The chained `.get("name")` then runs on `None`, which has no `.get()` method.
**Project consequence:** this is one of the most common real-world JSON bugs, precisely because `.get(key, default)` *feels* like it should make chained access safe, and it does — for missing keys. It does nothing for present-but-null values, which real APIs and real datasets produce constantly (an optional field a service explicitly sets to `null` rather than omitting). The fix is the explicit `is not None` check from step 5 — there's no way to compress this into a single chained `.get()` call safely when `null` is a live possibility.

## 7. Exercise
- **Predict:** For a movie whose JSON has no `"cast"` key at all (fully omitted, not `null`), what does `movie.get("cast", [])` return, and does `cast_text` crash or print something reasonable?
- **Modify:** Add a `"director": {"name": ..., "nationality": ...}` nested object to one movie, `null` to another, and missing entirely from a third. Write the access code that handles all three correctly.
- **Break:** Replace `studio.get("name", "Unknown studio")` with `studio["name"]` for a movie whose studio dict is present but genuinely has no `"name"` key (e.g. `{"country": "USA"}` alone). What error, and where?
- **Repair:** Fix the break above without changing `studio["name"]` back to `.get()` — instead, handle it with an explicit `if`/`else` or `try`/`except KeyError`, so you've now seen the same problem solved three different ways across these lessons.
- **Trace:** Walk through `describe_movie` line by line for `Arrival` specifically, writing down the value of every variable (`studio`, `studio_name`, `cast`, `cast_text`) at each step.

## What to remember
- JSON objects become dicts, JSON arrays become lists, `null` becomes `None` — recursively, at every depth.
- Chained `.get()` only protects against *missing keys*, never against a key that's present with value `None`.
- Deciding which fields deserve strict `[]` access versus defensive `.get()` is a real claim about your data's guarantees — make it visible in the code.
- `json.load` builds the whole structure in memory at once — no laziness, unlike line-by-line file reading.

## Next lesson
Lesson 5 takes the same movie data and hands it to you as XML instead of JSON — same nested information, uglier syntax, and a new category of trap: XML doesn't have JSON's clean type mapping (everything starts life as text, even numbers), so the "is this a string or a number" confusion from Lesson 1 comes back, now one level deeper.
