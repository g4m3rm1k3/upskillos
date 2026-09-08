# Lesson 5 — XML: Same Data, No Type Mapping, New Failure Shape

## What you'll learn
- How XML represents the same nested movie data JSON did, with genuinely different structure (attributes vs. element text)
- Why *everything* in raw XML is text — including numbers — unlike JSON's automatic int/float mapping
- What `find()` returning `None` on a missing element has in common with, and how it differs from, Lesson 4's `null` trap
- How to navigate a tree of `Element` objects instead of dicts and lists

## What you'll build
A parser for `movies.xml` — the same movie data as Lesson 4, in a format with no built-in type conversion and two different places data can live: element text, and element attributes.

```xml
<movies>
  <movie>
    <title>Coco</title>
    <year>2017</year>
    <rating>8.4</rating>
    <studio country="USA">Pixar</studio>
    <cast>
      <actor>Anthony Gonzalez</actor>
      <actor>Gael García Bernal</actor>
    </cast>
  </movie>
  <movie>
    <title>Arrival</title>
    <year>2016</year>
    <rating>7.9</rating>
    <cast>
      <actor>Amy Adams</actor>
      <actor>Jeremy Renner</actor>
    </cast>
  </movie>
</movies>
```

Two things to notice before you write any code: `Coco`'s studio has a **country as an attribute** (`country="USA"`) but its **name as element text** (`Pixar`) — the same conceptual "studio info" split across two different XML mechanisms. And `Arrival` has no `<studio>` element at all — not empty, not null, just absent from the tree entirely.

## The question
JSON gave you automatic types — a JSON number became a Python `int` or `float` without you asking. XML has no such rule. `<year>2017</year>` — is `"2017"` a string or a number, as far as the XML parser is concerned? And `country="USA"` versus `Pixar` as text — why does XML even have two different places to put data for what feels like the same movie?

## 1. Predict
Before running anything: what Python type do you think `year_element.text` will be, for the `<year>2017</year>` element — even though `2017` looks exactly like a number in the source file?

## 2. Try it
```python
import xml.etree.ElementTree as ET

tree = ET.parse("movies.xml")
root = tree.getroot()

first_movie = root[0]
year_element = first_movie.find("year")

print(year_element.text, type(year_element.text))
```

### What this code does
- `import xml.etree.ElementTree as ET` — the standard library's XML parser, imported under a shorter alias (`ET`) since the full name is used repeatedly.
- `ET.parse("movies.xml")` — reads the file and builds a tree of `Element` objects, one per XML tag, mirroring the nesting in the source file. This is conceptually the same job `json.load` did in Lesson 4 — text in, structured objects out — but the *shape* of what comes out is different: a tree of `Element` objects, not dicts and lists.
- `tree.getroot()` — returns the top-level `Element`, here `<movies>`. Everything else hangs off this.
- `root[0]` — `Element` objects support indexing like a list, where index `0` means "the first child element" — here, the first `<movie>`. This works because `Element` implements the same indexing protocol lists do, even though it isn't literally a `list`.
- `.find("year")` — searches `first_movie`'s direct children for a tag named `"year"` and returns the first match as an `Element`, or `None` if there isn't one. This is a **search by tag name**, unlike a dict's `["year"]`, because XML doesn't guarantee unique or ordered field names the way a JSON object's keys do.
- `.text` — the attribute holding whatever's between an element's opening and closing tags, always as a plain Python `str`, regardless of what the text looks like.

### What happens
```
2017 <class 'str'>
```

If you predicted `int`, that's the exact gap this lesson is about: XML has no type system at all baked into the format. `2017` between `<year>` tags is indistinguishable, to the parser, from `Coco` between `<title>` tags — both are just text content. Getting an actual integer back requires the same explicit `int(...)` conversion from Lesson 1, applied here to `year_element.text` instead of a CSV field.

## 3. Why?
### Code mechanics
JSON's grammar has separate syntax for strings (`"..."`) versus numbers (bare digits) versus booleans (`true`/`false`) — the *format itself* distinguishes them, which is why `json.load` could map types automatically. XML's grammar has no equivalent: `<year>2017</year>` and `<title>Coco</title>` use identical syntax; the "meaning" of the text inside is something only your code knows, based on which tag it came from. This isn't a limitation of the Python library — it's a real difference in what the two formats were designed to express.

### Runtime behavior
`.find()` performs its search each time it's called, walking the element's children looking for a tag match. If you call `.find("year")` in a loop for every movie, that's a fresh search every time — there's no caching or indexing happening for you.

### Mental model
```
movies.xml (text, no type info)
      ↓ ET.parse
<movies>                                ← root Element
  └── <movie>                           ← root[0], a child Element
        ├── <title>Coco</title>         ← .find("title").text → "Coco" (str)
        ├── <year>2017</year>           ← .find("year").text  → "2017" (str, NOT int)
        └── <studio country="USA">Pixar</studio>
              ├── .get("country")  → "USA"   (attribute, str)
              └── .text            → "Pixar" (element text, str)
```

## 4. Change one thing
```diff
-year_element = first_movie.find("year")
+year_element = first_movie.find("studio")
```

### What changed
Searching for `"studio"` instead of `"year"`, still on `first_movie` (`Coco`, which does have a studio).

### What did not change
Nothing else — same `.text` access afterward.

### Behavioral consequence
Still works, returns `"Pixar"` — because `Coco` has a `<studio>` element. But now run the *exact same code* on `root[1]` (`Arrival`) instead of `root[0]`:
```python
second_movie = root[1]
studio_element = second_movie.find("studio")
print(studio_element.text)
```
```
AttributeError: 'NoneType' object has no attribute 'text'
```
`Arrival` has no `<studio>` tag anywhere in its XML. `.find("studio")` searched, found nothing, and — like `dict.get()` on a missing key — returned `None` rather than raising an error immediately. The crash only happens one line later, at `.text`, because `None` has no `.text` attribute.

## 5. Put it in the project
```python
import xml.etree.ElementTree as ET

def describe_movie(movie_element):
    title = movie_element.find("title").text
    year = int(movie_element.find("year").text)
    rating = float(movie_element.find("rating").text)

    studio_element = movie_element.find("studio")
    if studio_element is not None:
        studio_name = studio_element.text
        studio_country = studio_element.get("country", "unknown country")
    else:
        studio_name = "Unknown studio"
        studio_country = "unknown country"

    actor_elements = movie_element.findall("cast/actor")
    cast = [a.text for a in actor_elements]
    cast_text = ", ".join(cast) if cast else "no cast listed"

    return f"{title} ({year}) — {studio_name}, {studio_country} — {cast_text}"


tree = ET.parse("movies.xml")
root = tree.getroot()

for movie_element in root.findall("movie"):
    print(describe_movie(movie_element))
```

### Code walkthrough
- `movie_element.find("title").text` — chained directly, no `None` check. Deliberate, same reasoning as Lesson 4's `movie["title"]`: title is guaranteed present in this data, so a crash here would mean the data itself is broken in a way worth knowing about loudly.
- `int(movie_element.find("year").text)` — two operations stacked: find the element, then convert its (guaranteed-string) text into an actual integer. This is Lesson 1's `int(fields[1])` again, just reached via `.find(...).text` instead of `fields[1]`.
- `studio_element.get("country", "unknown country")` — `.get()` here is `Element.get()`, which reads an **attribute**, not a child element. This is a different method living on a different kind of thing than `dict.get()` from Lesson 4, but deliberately similar in spirit: return the attribute value if present, else the default. Attributes, unlike child elements, are always simple string values — there's no nested `<country>` element to worry about here.
- `movie_element.findall("cast/actor")` — `findall` (plural) returns **all** matches as a list, not just the first. The `"cast/actor"` string is a simple XPath-like path: "find the `cast` child, then all `actor` children within it" — one call replacing what would otherwise be finding `cast` first, then iterating its children separately.
- `[a.text for a in actor_elements]` — a list comprehension pulling `.text` out of each matched `Element`, giving you a plain list of strings — the actor names, finally freed from being wrapped in `Element` objects.

### Why this design?
The `if studio_element is not None:` check here is structurally identical to Lesson 4's JSON trap fix — because it's solving the same underlying problem (something might not exist, and blindly chaining into it crashes) even though the *mechanism* producing "might not exist" is different: JSON gave you an explicit `null` value; XML gives you a genuinely absent element that `.find()` reports as `None`. Different causes, same defensive pattern.

## 6. Trap
**Normal rule:** `.find("tag")` returns an `Element` you can immediately call `.text` or `.get()` on.
**Apparently equivalent code:** `movie_element.find("director").text` — assuming, because it worked for `title`, `year`, and `rating`, that it'll work for every tag you ask for.
**Surprising result:** `AttributeError: 'NoneType' object has no attribute 'text'` for any movie lacking a `<director>` tag — which, in this file, is every single one, since none of them have one at all.
**Exact reason:** `.find()` never raises an error for "tag not found" — it always returns `None` silently, no matter how deeply you expected that tag to exist. Unlike `fields[5]` on a too-short CSV row (`IndexError`, loud and immediate) or a missing dict key with plain `[]` access (`KeyError`, also loud), a missing XML element produces no error *at the point of the actual problem* — only later, wherever you first try to use the `None` you got back.
**Project consequence:** this is genuinely one of the most common sources of XML-parsing bugs in real code, precisely because `.find()`'s silence feels like success. The habit worth building: any time you call `.find()` on data you haven't personally verified is guaranteed present, check `is not None` before touching `.text` or `.get()` — the same discipline as Lesson 4's JSON `null` handling, now applied to a new root cause.

## 7. Exercise
- **Predict:** For a `<rating>` element that's present but empty (`<rating></rating>`), what does `.text` return — an empty string, or `None`? (This one's genuinely easy to get wrong — check it.)
- **Modify:** Add a `<director name="..." />` self-closing element (no separate text content, only an attribute) to one movie in the XML, and write the access code to read the `name` attribute from it.
- **Break:** Change `movie_element.findall("cast/actor")` to `movie_element.findall("actor")` (dropping the `cast/` path segment). What do you get back — an error, or something quieter?
- **Repair:** Explain, in one sentence, why the "break" above doesn't crash the way the missing-studio case did — what's actually different about how `findall` fails compared to how `.find(...).text` fails.
- **Trace:** Walk through `describe_movie` for `Arrival` line by line, writing down the exact value of `studio_element`, `studio_name`, and `studio_country` at each step.

## What to remember
- XML has no built-in type system — every piece of text is a plain string until you explicitly convert it, no matter how numeric it looks.
- Data can live in two different places on the same element: attributes (`.get("name")`) and text content (`.text`) — know which one your data actually uses before writing access code.
- `.find()` returns `None` for a missing tag instead of raising an error — the crash always happens one step later, at the point you try to use the result.
- The "check for `None` before chaining" discipline from Lesson 4 (JSON) and this lesson (XML) is the same underlying habit, arising from two structurally different causes — recognizing that pattern is worth more than memorizing either format's specific quirks.

## Next lesson
Lesson 6 leaves local files behind: making a real HTTP request to a live API and getting a response back. You'll find the response body is, once again, just JSON — meaning most of Lesson 4 already applies — but now the data can be slow, can fail to arrive at all, or can fail *differently* than a file ever could, which is where real error handling gets its next layer.
