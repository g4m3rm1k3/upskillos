# Lesson 8 — JOIN: The SQL Answer to Nested Lookups

## What you'll learn
- Why splitting data into two related tables (normalizing) is usually better than one wide table with repeated info
- What a primary key and foreign key actually are, and how `JOIN` uses them to reconnect split data
- The difference between `INNER JOIN` and `LEFT JOIN` — and why picking the wrong one silently *deletes* data from your results, with no error at all
- How this maps directly back to Lessons 4 and 5's "missing/null" handling, now as a table-level problem instead of a single-field one

## What you'll build
Two tables — `studios` and `movies` — related by an ID, queried together to reproduce the nested `movie["studio"]["name"]` lookups from Lesson 4, but as SQL instead of Python dict access.

## The question
Lesson 7 put `studio` directly as a `TEXT` column on the `movies` table. That works until you ask something like "list every studio, even ones with zero movies rated above 8" — a question about *studios*, not movies, that a `studio` column glued onto `movies` can't answer well, because a studio with no movies simply never appears as a value in that column at all. Splitting `studios` into its own table, connected by an ID, is what makes both directions of that question answerable.

## 1. Predict
Given a `movies` table where `Arrival`'s studio is unknown (recall: its JSON had `"studio": null`), and a `studios` table that only lists studios that actually have known info — if you ask "give me every movie with its studio's country," what do you think happens to `Arrival` in the result? Does it appear with a blank/`None` country, or does it vanish from the results entirely?

## 2. Try it
```python
import sqlite3

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE studios (
        id INTEGER PRIMARY KEY,
        name TEXT,
        country TEXT
    )
""")
cursor.execute("""
    CREATE TABLE movies (
        title TEXT,
        year INTEGER,
        rating REAL,
        studio_id INTEGER
    )
""")

cursor.execute("INSERT INTO studios VALUES (1, 'Pixar', 'USA')")
cursor.execute("INSERT INTO movies VALUES ('Coco', 2017, 8.4, 1)")
cursor.execute("INSERT INTO movies VALUES ('Arrival', 2016, 7.9, NULL)")  # no known studio

cursor.execute("""
    SELECT movies.title, studios.name, studios.country
    FROM movies
    JOIN studios ON movies.studio_id = studios.id
""")
print(cursor.fetchall())
```

### What this code does
- `id INTEGER PRIMARY KEY` — declares `id` as the studio table's **primary key**: a value guaranteed unique per row, used to *identify* a specific studio unambiguously. `PRIMARY KEY` also automatically makes SQLite reject a duplicate `id` outright — it's an enforced guarantee, not just documentation.
- `studio_id INTEGER` on `movies` — this is a **foreign key**: a column whose values are meant to reference a primary key in another table (`studios.id`). SQLite doesn't enforce this link by default without extra configuration, but the *concept* is what matters here: `studio_id = 1` means "this movie's studio is whichever row in `studios` has `id = 1`."
- `INSERT INTO movies VALUES ('Arrival', 2016, 7.9, NULL)` — `Arrival` gets `studio_id = NULL`, SQL's explicit "no value here," directly analogous to Lesson 4's JSON `null` — this is not an accident of naming, it's the same underlying idea (an intentionally absent value) expressed in a different data system.
- `FROM movies JOIN studios ON movies.studio_id = studios.id` — this is the actual join: for every row in `movies`, find the row(s) in `studios` where the `ON` condition holds (`studio_id` equals `id`), and produce one combined row per match. `movies.title` and `studios.name`/`studios.country` are qualified with their table name because both tables could in principle have overlapping column names, and `JOIN` needs to know which table each column comes from.

### What happens
```
[('Coco', 'Pixar', 'USA')]
```
Only one row — `Arrival` is **gone entirely**, not shown with a blank country. If you predicted it would appear with `None`/blank values, that's the natural guess, and it's wrong for the join type used here. `JOIN` (equivalent to `INNER JOIN`) only produces a row when the `ON` condition actually matches something in *both* tables. `Arrival`'s `studio_id` is `NULL`, and `NULL` never equals anything in SQL — not even another `NULL` — so it matches nothing in `studios`, and the entire row is silently excluded from the result.

## 3. Why?
### Code mechanics
`JOIN` (the plain, unqualified form) is shorthand for `INNER JOIN`: keep only rows where the `ON` condition is true on both sides. This is a deliberate, named behavior — not a bug — but it means `INNER JOIN` can make data disappear from your results without any error, warning, or indication that anything was dropped. If you weren't specifically checking row counts, you might never notice `Arrival` was missing.

### Runtime behavior
The database evaluates the `ON` condition for every combination of a `movies` row and a `studios` row (conceptually — real databases optimize this far more cleverly using the primary key, but the *logical* result is the same), keeping only the combinations where it's true. A `NULL` on either side of `=` in SQL always evaluates to "unknown," never "true," which is precisely why `NULL = NULL` fails to match — this is a real, standard SQL rule worth knowing, since it surprises people coming from languages where comparing two "empty" values feels like it should be `True`.

### Mental model
```
movies                          studios
title    studio_id              id  name    country
Coco     1          ─────match───→ 1  Pixar   USA
Arrival  NULL        ─────no match, NULL never matches anything

INNER JOIN result:  only Coco appears — Arrival silently dropped
```

## 4. Change one thing
```diff
 cursor.execute("""
     SELECT movies.title, studios.name, studios.country
     FROM movies
-    JOIN studios ON movies.studio_id = studios.id
+    LEFT JOIN studios ON movies.studio_id = studios.id
 """)
```

### What changed
`JOIN` became `LEFT JOIN`.

### What did not change
The tables, the data, the `ON` condition itself — identical.

### Behavioral consequence
```
[('Coco', 'Pixar', 'USA'), ('Arrival', None, None)]
```
`LEFT JOIN` keeps **every** row from the left table (`movies`, the one named first, right after `FROM`) regardless of whether the `ON` condition finds a match — and when there's no match, it fills in `NULL` (which Python's `sqlite3` surfaces as `None`) for every column that would have come from the right table (`studios`). `Arrival` now appears, honestly reporting "no known studio" instead of vanishing.

## 5. Put it in the project
```python
import sqlite3, json

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()

cursor.execute("CREATE TABLE studios (id INTEGER PRIMARY KEY, name TEXT, country TEXT)")
cursor.execute("CREATE TABLE movies (title TEXT, year INTEGER, rating REAL, studio_id INTEGER)")

with open("movies.json") as f:
    movies = json.load(f)

studio_ids = {}
next_id = 1
for m in movies:
    studio = m.get("studio")
    studio_id = None
    if studio is not None:
        if studio["name"] not in studio_ids:
            cursor.execute(
                "INSERT INTO studios VALUES (?, ?, ?)",
                (next_id, studio["name"], studio.get("country")),
            )
            studio_ids[studio["name"]] = next_id
            next_id += 1
        studio_id = studio_ids[studio["name"]]

    cursor.execute(
        "INSERT INTO movies VALUES (?, ?, ?, ?)",
        (m["title"], m["year"], m["rating"], studio_id),
    )
conn.commit()

cursor.execute("""
    SELECT movies.title, movies.rating, studios.name, studios.country
    FROM movies
    LEFT JOIN studios ON movies.studio_id = studios.id
    ORDER BY movies.rating DESC
""")
for row in cursor.fetchall():
    print(row)
```

### Code walkthrough
- `studio_ids = {}` — a plain Python dict used only during loading, mapping a studio name you've already seen to the numeric ID you assigned it. This solves a real problem: the source JSON repeats `{"name": "Pixar", "country": "USA"}` inline on every Pixar movie, but the `studios` table should have exactly **one** row per actual studio, not one per movie that happens to mention it.
- `if studio["name"] not in studio_ids:` — only inserts a new `studios` row the *first* time a given studio name is encountered; subsequent movies from the same studio just reuse the already-assigned `next_id`. This is the actual act of normalizing: collapsing repeated inline data into single reference rows.
- `studio_id = None` initialized before the `if studio is not None:` block — deliberately mirrors Lesson 4's pattern: assume "no studio" first, only override it if the data actually provides one. This guarantees every code path reaches the final `INSERT INTO movies` with *some* value for `studio_id`, even if it's `None`.
- `LEFT JOIN ... ORDER BY movies.rating DESC` — using `LEFT JOIN` here is a real decision, not a default: it means "show me every movie, with studio info attached where known" rather than "show me only movies with fully known studio info," which is what plain `JOIN` would silently do.

### Why this design?
Deciding between `JOIN` and `LEFT JOIN` is a genuine design decision about your data's completeness — the same category of decision as Lesson 4's choice between strict `[]` and defensive `.get()` — made explicit here rather than accepted as a default you didn't examine.

## 6. Trap
**Normal rule:** a `JOIN` combines matching rows from two tables.
**Apparently equivalent code:** using plain `JOIN` in step 5's query instead of `LEFT JOIN`, on the reasoning that "it's simpler and I'll add `LEFT` later if I need it."
**Surprising result:** `Arrival` — and any other movie with an unknown studio — disappears from the output entirely, with zero errors, zero warnings, and a row count that's simply smaller than the number of movies you know you inserted.
**Exact reason:** `INNER JOIN`'s entire behavior is "silently exclude non-matches" — that's not an edge case of the feature, it *is* the feature, working exactly as designed. The danger isn't that it's broken; it's that it's easy to reach for by default (`JOIN` is shorter to type than `LEFT JOIN`) in a context where "silently drop unmatched rows" is the wrong choice for your actual question.
**Project consequence:** this is a genuinely common real-world bug class — a report or dashboard built on an `INNER JOIN` that quietly excludes anything with incomplete related data, discovered months later when someone asks "why doesn't this total match" and the answer turns out to be rows that were never wrong, just missing from the query the whole time. The habit worth building: before writing `JOIN`, ask explicitly "should rows with no match on the other side still appear?" — if yes, it needs to be `LEFT JOIN`, not a plain one.

## 7. Exercise
- **Predict:** If you swap `LEFT JOIN` in step 5 to `RIGHT JOIN` (keep every row from `studios` instead, matching rows from `movies` where possible), and one studio in the table happens to have zero movies, what would you expect that studio's row to look like in the result? (SQLite historically didn't support `RIGHT JOIN` directly — check whether yours does, and if not, reason about what a `LEFT JOIN` with the table order swapped would produce instead.)
- **Modify:** Write a query that lists every studio name alongside a *count* of how many movies it has, using `LEFT JOIN` plus `GROUP BY studios.name` and `COUNT(movies.title)` — include studios with zero movies if any exist.
- **Break:** Take the working `LEFT JOIN` query from step 5, change it to plain `JOIN`, and run it. Count the rows in the output versus the number of movies in `movies.json`. Are they different?
- **Repair:** Fix it back, then write one sentence explaining how you'd have discovered this bug if you *hadn't* known to check the row count — what symptom would a real user of this code actually notice?
- **Trace:** For the `LEFT JOIN` version, walk through what SQLite does row-by-row for `Arrival` specifically: what does the `ON` condition evaluate to, and what does `LEFT JOIN`'s rule say to do when it's false?

## What to remember
- Normalizing (splitting repeated inline data into its own table) trades a bit of loading complexity for a database that can't represent the same studio inconsistently across rows.
- `INNER JOIN` (plain `JOIN`) silently drops any row with no match — this is its actual designed behavior, not a bug, which is exactly what makes it dangerous when used by default.
- `LEFT JOIN` keeps every row from the left table, filling unmatched columns with `NULL`/`None` — use it whenever "row exists but related info doesn't" should still be visible.
- `NULL` never equals anything in SQL, including another `NULL` — this is why a `NULL` foreign key never accidentally matches another `NULL` foreign key in a join.

## Next lesson
You've now built the full pipeline once: parse messy text (CSV/JSON/XML), handle missing and malformed data honestly, model it as real objects, fetch it live over a network, and query it relationally. Where you want to go next is genuinely open — deeper into SQL (aggregates, subqueries, indexes and why they matter for speed), into testing what you've built so far properly, or across into the ML track, where the very first real step is: take a dataset shaped exactly like the one you've been building, and ask a model to predict something about it. Your call.
