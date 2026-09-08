# Lesson 7 — SQL: The Answer to a Problem You've Already Hit

## Why now
Every lesson so far, filtering meant a Python `for` loop with an `if`. That's worked fine at 5 rows. Real datasets aren't 5 rows, and real questions aren't one condition — "Pixar movies rated above 8, newest first" is three separate things to get right in a hand-rolled loop, and a fourth condition away from becoming genuinely hard to read. SQL exists because this exact pain is old and common enough that an entire language was built to answer it declaratively — you describe *what* you want, not the loop that finds it.

## What you'll learn
- What a database table actually is, and why it's a *stricter* shape than the dicts/lists you've been using
- How to ask for data with `SELECT ... WHERE ... ORDER BY` instead of writing the loop yourself
- Why building SQL queries with string formatting is a real, serious security bug — not a style nitpick
- How to write the same queries safely with parameters

## What you'll build
The same movie data from Lesson 1-4, loaded into a real (temporary, in-memory) SQL database, queried instead of manually filtered.

## The question
```python
# The Lesson 1-4 way: manually filter for "Pixar movies rated above 8"
results = [m for m in movies if m.get("studio", {}).get("name") == "Pixar" and m["rating"] > 8]
results.sort(key=lambda m: m["year"], reverse=True)
```
This works. Now add "and released after 2015." Now add "or from Studio Ghibli instead." Each new condition means editing this exact code, carefully, without breaking what already works. What if you could just *state* the conditions instead?

## 1. Predict
```sql
SELECT title, rating FROM movies WHERE rating > 8;
```
Before running anything: what do you think this returns if the `movies` table has a row where `rating` is stored as the *text* `"8.5"` instead of a real number? Does `> 8` still work correctly, the way `int(fields[1]) > 8` required an explicit conversion back in Lesson 1?

## 2. Try it
```python
import sqlite3

conn = sqlite3.connect(":memory:")   # a real database that exists only in memory, not a file
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE movies (
        title TEXT,
        year INTEGER,
        rating REAL
    )
""")

cursor.execute("INSERT INTO movies VALUES (?, ?, ?)", ("Coco", 2017, 8.4))
cursor.execute("INSERT INTO movies VALUES (?, ?, ?)", ("Arrival", 2016, 7.9))
cursor.execute("INSERT INTO movies VALUES (?, ?, ?)", ("Parasite", 2019, 8.5))

cursor.execute("SELECT title, rating FROM movies WHERE rating > 8")
print(cursor.fetchall())
```

### What this code does
- `sqlite3.connect(":memory:")` — SQLite is a real, full SQL database engine that (unlike most databases) can run entirely inside your program's memory with zero setup — no server, no separate process. `:memory:` is a special filename meaning "don't persist this anywhere, just use RAM." `conn` represents the open connection.
- `conn.cursor()` — a cursor is the object you actually send commands through and read results from. The connection represents "being connected to the database"; the cursor represents "the thing currently doing work."
- `CREATE TABLE movies (title TEXT, year INTEGER, rating REAL)` — this is the crucial difference from every structure you've used so far: **the shape is declared once, up front, and the database enforces it**. A dict never stopped you from giving one movie a `"rating"` key and another a `"score"` key by typo. A SQL table has exactly the columns you declared — `title`, `year`, `rating` — forever, for every row, no exceptions. `TEXT`, `INTEGER`, `REAL` are column *types* — SQLite's version of `str`/`int`/`float`.
- `cursor.execute("INSERT INTO movies VALUES (?, ?, ?)", ("Coco", 2017, 8.4))` — two arguments to `execute`: the SQL text with `?` as **placeholders**, and a separate tuple of the actual values. This is not string formatting — the values never get pasted into the SQL text at all; the database driver sends them separately and substitutes them safely on the database side. Hold onto this detail; it's the entire subject of this lesson's trap.
- `cursor.execute("SELECT title, rating FROM movies WHERE rating > 8")` — a query: "give me the `title` and `rating` columns, only for rows where `rating > 8`." This one line replaces the list comprehension *and* the condition from step 0 — no loop written by you at all.
- `cursor.fetchall()` — queries don't return results directly from `execute()`; they queue results up, and `fetchall()` retrieves all of them as a list of tuples.

### What happens
```
[('Coco', 8.4), ('Parasite', 8.5)]
```
Both rows have `rating` correctly stored as `REAL` (a real number), inserted from Python `float` values — so `WHERE rating > 8` compares numbers to numbers, exactly as expected, and `Arrival` (7.9) is correctly excluded. If your prediction was about what happens when a value is stored as *text* that merely looks numeric — hold that thought for the trap below; the answer is genuinely different from what you might expect, for reasons that echo Lesson 1 directly.

## 3. Why?
### Code mechanics
`CREATE TABLE` isn't creating a Python object — it's issuing a command to a real, separate database engine (even though it happens to be running in-process here) that maintains its own storage and enforces its own rules about what a "movies row" is allowed to look like. This is the origin of the "stricter shape" idea: a dict is whatever keys you happened to put in it; a SQL table has a schema that exists independently of any single row, checked every time you insert.

### Runtime behavior
`WHERE rating > 8` is evaluated by the database engine, not by Python — SQLite scans the rows, applies the comparison itself, and only sends back the rows that matched. Your Python code never sees the rejected rows at all; contrast this with the list comprehension version, where Python built the *entire* list in memory first, then filtered it.

### Mental model
```
Python:  [m for m in movies if condition]   ← you write the loop, Python does exactly what you said, line by line
SQL:     SELECT ... WHERE condition          ← you describe what you want; the database decides how to find it
```
This is the core conceptual shift SQL represents: from *imperative* ("do this, then this, then this") to *declarative* ("give me data matching this description").

## 4. Change one thing
```diff
-cursor.execute("SELECT title, rating FROM movies WHERE rating > 8")
+cursor.execute("SELECT title, rating FROM movies WHERE rating > 8 ORDER BY rating DESC")
```

### What changed
Added `ORDER BY rating DESC` — sort the results by `rating`, descending (highest first).

### What did not change
The `WHERE` condition, the table, the columns selected — identical.

### Behavioral consequence
```
[('Parasite', 8.5), ('Coco', 8.4)]
```
Note the order flipped compared to insertion order. `ORDER BY` is applied by the database *after* filtering — the same sorting job Lesson 1's `max(movies, key=...)` did manually in Python, now stated declaratively as part of the query itself.

## 5. Put it in the project
```python
import sqlite3, json

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE movies (
        title TEXT,
        year INTEGER,
        rating REAL,
        studio TEXT
    )
""")

with open("movies.json") as f:
    movies = json.load(f)

for m in movies:
    studio_name = m["studio"]["name"] if m.get("studio") else None
    cursor.execute(
        "INSERT INTO movies VALUES (?, ?, ?, ?)",
        (m["title"], m["year"], m["rating"], studio_name),
    )
conn.commit()

cursor.execute("""
    SELECT title, year, rating
    FROM movies
    WHERE rating > 8 AND year > 2015
    ORDER BY year DESC
""")
for row in cursor.fetchall():
    print(row)
```

### Code walkthrough
- `studio_name = m["studio"]["name"] if m.get("studio") else None` — this is Lesson 4's `null`-handling trap, still doing real work: some movies had `"studio": null` in the JSON, and a SQL table has no way to store a nested dict in a `TEXT` column, so this line flattens "studio, if it exists" down to a plain string or Python `None` before insertion — which SQLite stores as SQL `NULL`.
- `conn.commit()` — SQLite (like most databases) buffers writes and only durably applies them on `commit()`. Skipping this in a real (non-memory) database risks losing inserted data if the connection closes before committing; for `:memory:` here it mostly matters as the correct habit to build.
- `WHERE rating > 8 AND year > 2015` — two conditions combined with `AND`, directly readable as the English sentence you'd say out loud. Compare this to the equivalent Python: `[m for m in movies if m["rating"] > 8 and m["year"] > 2015]` — genuinely similar in this simple case, but SQL's version keeps reading naturally as conditions stack up (`AND studio = 'Pixar' OR studio = 'Ghibli'`), where the Python version accumulates parentheses and boolean logic that gets harder to scan.

### Why this design?
Loading data into SQLite *from* the JSON/CSV files you already know how to parse — rather than treating SQL as a replacement for those skills — reflects how this actually works in practice: parsing raw data formats and querying structured data are separate skills that compose, not alternatives to each other.

## 6. Trap
**Normal rule:** `cursor.execute(sql, params)` with `?` placeholders safely inserts values into a query.
**Apparently equivalent code:**
```python
rating_threshold = 8
query = f"SELECT title FROM movies WHERE rating > {rating_threshold}"
cursor.execute(query)
```
**Surprising result:** this specific line works fine and returns the right answer — which is exactly what makes it dangerous. Now imagine `rating_threshold` isn't a number you typed, but text that arrived from a user, a form, a URL parameter — anything outside your direct control:
```python
rating_threshold = "0 OR 1=1"
query = f"SELECT title FROM movies WHERE rating > {rating_threshold}"
cursor.execute(query)
```
This returns **every row in the table**, ignoring the filter entirely — because the resulting SQL text is literally `WHERE rating > 0 OR 1=1`, and `1=1` is always true. This is a real, extremely well-known category of vulnerability called **SQL injection**: if untrusted text ever gets pasted directly into a query string, whoever controls that text can rewrite your query's logic, or worse (`"0; DROP TABLE movies"` is a legitimate, catastrophic example, though SQLite's default execute only runs one statement at a time — other databases are not always so forgiving).
**Exact reason:** f-string formatting builds the final SQL text *before* the database ever sees it — from SQLite's perspective, `WHERE rating > 0 OR 1=1` is just the query it was asked to run, with no way to know some of that text was supposed to be "just a value." The `?` placeholder approach from step 2 never has this problem, because the value and the query structure are sent to the database **separately** — the database only ever treats the placeholder slot as a value, never as SQL syntax, no matter what the value contains.
**Project consequence:** the fix is not "sanitize the input" or "check for suspicious characters" — those approaches are famously unreliable. The fix is simply: never format values into SQL text. Always use `?` placeholders and pass values as a separate tuple, exactly as step 2 already did, every single time, with no exceptions for "this value is probably safe."

## 7. Exercise
- **Predict:** If you insert a row where `rating` is stored as the *string* `"8.5"` (not a float) into the `REAL` column, does `WHERE rating > 8` still correctly match it? SQLite is more permissive about types than you might expect — check what actually happens before assuming.
- **Modify:** Add a query using `AND` to find movies from a specific studio, with a rating above some threshold, sorted by year ascending.
- **Break:** Rewrite the safe parameterized query from step 5 using an f-string instead, with a `title` value of `Coco' OR '1'='1`. What does `WHERE title = '...'` actually match now?
- **Repair:** Fix the break above by switching back to `?` placeholders, and explain in one sentence why quoting the value differently ("just escape the quotes") isn't a reliable general fix.
- **Trace:** Walk through exactly what SQL text gets sent to SQLite in the injection example above (`rating_threshold = "0 OR 1=1"`) — write out the literal final query string that `f"..."` produces.

## What to remember
- A SQL table enforces its shape (declared columns and types) for every row — unlike a dict, which enforces nothing.
- `SELECT ... WHERE ... ORDER BY` is declarative: you describe the result, the database figures out how to produce it.
- Never format untrusted (or honestly, any) values directly into SQL text — always use `?` placeholders with a separate values tuple.
- SQLite can run entirely in memory with zero setup, which is why it's a reasonable place to actually practice this instead of only reading about it.

## Next lesson
Lesson 8 extends this into a second table — `studios(name, country)` separate from `movies` — and introduces `JOIN`, the SQL answer to the exact "nested dict lookup" problem Lessons 4 and 5 kept working around by hand.
