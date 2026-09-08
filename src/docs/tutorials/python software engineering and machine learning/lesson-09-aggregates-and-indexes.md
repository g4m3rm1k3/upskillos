# Lesson 9 — Aggregates, GROUP BY/HAVING, and Why Queries Get Slow

## What you'll learn
- How to answer questions *about groups* of rows (per-studio counts, averages) instead of individual rows
- Why `WHERE` and `HAVING` aren't interchangeable, and why SQL itself will refuse one specific mix-up between them
- What actually makes a query slow at scale, using real measured timings, not a hand-wavy "big O of SQL"
- What an index actually is, and what it costs you in exchange for the speedup

This lesson has two halves — aggregation, then performance — because the second genuinely only makes sense once you've written a query worth making slow on purpose.

## Part 1: Aggregates

### The question
"Give me every studio, how many movies each one has, and their average rating" — this isn't a question about any single row. It's a question about *groups* of rows. Nothing you've written so far (`WHERE`, `ORDER BY`, `JOIN`) answers a question shaped like this.

### 1. Predict
```sql
SELECT studio_id, COUNT(*) FROM movies GROUP BY studio_id;
```
Before running: if a movie's `studio_id` is `NULL` (unknown studio, from Lesson 8), does it get its own group in the results, or does `GROUP BY` skip `NULL` rows entirely the way `INNER JOIN` did?

### 2. Try it
```python
import sqlite3

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()
cursor.execute("CREATE TABLE movies (title TEXT, rating REAL, studio_id INTEGER)")
cursor.executemany("INSERT INTO movies VALUES (?, ?, ?)", [
    ("Coco", 8.4, 1),
    ("Toy Story", 8.3, 1),
    ("Spirited Away", 8.6, 2),
    ("Arrival", 7.9, None),
])
conn.commit()

cursor.execute("SELECT studio_id, COUNT(*) FROM movies GROUP BY studio_id")
print(cursor.fetchall())
```

#### What this code does
- `GROUP BY studio_id` — collapses all rows sharing the same `studio_id` value into a single group, one output row per distinct value. This happens *before* the `SELECT` list is evaluated for display — conceptually, grouping happens first, then aggregate functions run once per group.
- `COUNT(*)` — an **aggregate function**: instead of returning one value per input row, it returns one value *per group*, counting how many rows landed in that group. `*` here means "count rows, regardless of column values" — contrast this with `COUNT(some_column)`, which only counts rows where that specific column is non-`NULL` (a real, separate gotcha worth testing yourself in the exercises).
- `studio_id` in the `SELECT` list — allowed here specifically *because* it's also in `GROUP BY`; every row within a group shares the same `studio_id` by definition, so picking one to display is unambiguous. Selecting a non-grouped, non-aggregated column would be genuinely meaningless (which row's value would it even show?) and most databases either reject it or give you an arbitrary answer.

#### What happens
```
[(1, 2), (2, 1), (None, 1)]
```
`NULL` **does** get its own group — three groups total: `studio_id = 1` (2 movies), `studio_id = 2` (1 movie), and `studio_id = NULL` (1 movie, `Arrival`). This is a genuine, easy-to-miss inconsistency worth naming directly: `GROUP BY` treats all `NULL`s as belonging to the *same* group (unlike `JOIN`'s `ON`, where `NULL = NULL` is never true) — two entirely different SQL rules about `NULL`, both real, both worth knowing separately rather than assuming they behave the same way everywhere.

### 3. Why? — mental model
```
rows:  (Coco,8.4,1) (ToyStory,8.3,1) (Ghibli,8.6,2) (Arrival,7.9,NULL)
              ↓ GROUP BY studio_id
group 1:  [(Coco,8.4,1), (ToyStory,8.3,1)]     → COUNT(*) = 2
group 2:  [(Ghibli,8.6,2)]                      → COUNT(*) = 1
group NULL: [(Arrival,7.9,NULL)]                → COUNT(*) = 1
              ↓ one output row per group
```

### 4. Change one thing
```diff
-cursor.execute("SELECT studio_id, COUNT(*) FROM movies GROUP BY studio_id")
+cursor.execute("SELECT studio_id, COUNT(*), AVG(rating) FROM movies GROUP BY studio_id")
```
Adds `AVG(rating)`, a second aggregate function computed per group, alongside `COUNT(*)`. Result: `[(1, 2, 8.35), (2, 1, 8.6), (None, 1, 7.9)]` — no new concept, just a second aggregate riding along on the same grouping.

### 5. HAVING — filtering groups, not rows
```python
cursor.execute("""
    SELECT studio_id, COUNT(*) as movie_count
    FROM movies
    GROUP BY studio_id
    HAVING movie_count > 1
""")
print(cursor.fetchall())
# [(1, 2)]
```
`HAVING` filters *after* grouping and aggregation — "keep only groups where the count exceeds 1." `WHERE` cannot do this job: `WHERE` filters individual rows *before* grouping ever happens, at a point where "how many rows are in this group" doesn't exist yet as a concept. This is the trap.

### 6. Trap
**Normal rule:** `WHERE` filters rows; `HAVING` filters groups after aggregation.
**Apparently equivalent code:**
```python
cursor.execute("SELECT studio_id, COUNT(*) FROM movies WHERE COUNT(*) > 1 GROUP BY studio_id")
```
**Surprising result:** this doesn't return a wrong answer — it fails outright:
```
sqlite3.OperationalError: misuse of aggregate function COUNT()
```
**Exact reason:** SQL evaluates a query in a specific conceptual order — `WHERE` runs first, filtering raw rows, *before* `GROUP BY` forms groups and *before* aggregate functions like `COUNT(*)` are computed at all. Asking `WHERE` to check `COUNT(*)` is asking it to use a value that doesn't exist yet at the point `WHERE` runs — the database can't compute a per-group count before groups exist.
**Project consequence:** this specific error message is common enough that recognizing it instantly is worth more than memorizing the WHERE/HAVING rule in the abstract — "misuse of aggregate function" almost always means an aggregate got used somewhere it hasn't been computed yet, and the fix is nearly always "move that condition into HAVING."

---

## Part 2: Why Queries Get Slow

### The question
Every query so far ran against a handful of rows — fast no matter how you wrote it. What actually happens when a table has real size, and how do you find out *why* a specific query is slow instead of guessing?

### 1. Predict
If a `movies` table has 200,000 rows and you run `WHERE studio_id = 17` with no special setup, how does SQLite find the matching rows — does it somehow know where they are, or does it look at every single row?

### 2. Try it — and the real numbers
```python
import sqlite3, random, time

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()
cursor.execute("CREATE TABLE movies (title TEXT, year INTEGER, rating REAL, studio_id INTEGER)")

random.seed(42)
rows = [(f"Movie{i}", random.randint(1980, 2024), round(random.uniform(1, 10), 1), random.randint(1, 50))
        for i in range(200_000)]
cursor.executemany("INSERT INTO movies VALUES (?, ?, ?, ?)", rows)
conn.commit()

t0 = time.perf_counter()
cursor.execute("SELECT * FROM movies WHERE studio_id = 17")
results = cursor.fetchall()
t1 = time.perf_counter()
print(f"rows found: {len(results)}, time: {t1 - t0:.4f}s")

cursor.execute("EXPLAIN QUERY PLAN SELECT * FROM movies WHERE studio_id = 17")
print(cursor.fetchall())
```

This is real output from actually running this code:
```
rows found: 4142, time: 0.0151s
[(2, 0, 0, 'SCAN movies')]
```

#### What this code does
- `EXPLAIN QUERY PLAN` — asks SQLite to report *how* it intends to execute the query, without actually running it for results. This is the real tool for "why is this slow" — not guessing, reading what the database itself says it's doing.
- `'SCAN movies'` — SQLite's plan says it will scan the **entire table**, row by row, checking `studio_id = 17` on every single one of the 200,000 rows, to find the 4,142 that match. It has no way to jump directly to the matching rows — there's no structure telling it where `studio_id = 17` values live, so "check everything" is the only option available.

### 3. Why — adding an index
```python
cursor.execute("CREATE INDEX idx_studio ON movies(studio_id)")
conn.commit()

t0 = time.perf_counter()
cursor.execute("SELECT * FROM movies WHERE studio_id = 17")
results = cursor.fetchall()
t1 = time.perf_counter()
print(f"rows found: {len(results)}, time: {t1 - t0:.4f}s")

cursor.execute("EXPLAIN QUERY PLAN SELECT * FROM movies WHERE studio_id = 17")
print(cursor.fetchall())
```
Real output, same query, same data, only the index added:
```
rows found: 4142, time: 0.0052s
[(3, 0, 0, 'SEARCH movies USING INDEX idx_studio (studio_id=?)')]
```
Roughly a 3x speedup here, on 200,000 rows — and the gap widens dramatically as table size grows, because a scan's cost grows linearly with row count while an index lookup's cost barely grows at all.

#### What an index actually is
`CREATE INDEX idx_studio ON movies(studio_id)` builds a separate, sorted structure (conceptually similar to a book's index, or a phone book sorted by last name) mapping `studio_id` values directly to the rows that have them. `SEARCH ... USING INDEX` in the query plan means SQLite now looks up `17` in that sorted structure directly — closer to a dictionary lookup than a linear search — instead of checking every row.

### Mental model
```
No index:  WHERE studio_id = 17
           → check row 1: no. check row 2: no. check row 3: no. ... (all 200,000)
           → cost grows linearly with table size

With index on studio_id:
           → look up 17 directly in the sorted index structure
           → jump straight to matching rows
           → cost grows far more slowly as table size increases
```

### 4. The cost — indexes are not free
```python
t0 = time.perf_counter()
cursor.executemany("INSERT INTO movies VALUES (?, ?, ?, ?)",
                    [(f"New{i}", 2024, 7.0, 1) for i in range(10_000)])
conn.commit()
t1 = time.perf_counter()
print(f"insert time with index: {t1 - t0:.4f}s")
```
Every `INSERT` now has extra work to do: update the table **and** update the index's sorted structure to include the new row. An index that makes `SELECT` faster makes every `INSERT`/`UPDATE`/`DELETE` on that column slightly slower, and takes extra storage space to hold the sorted structure itself. This is a genuine trade-off, not a free upgrade — indexing every column "just in case" is a real anti-pattern, not a best practice.

### Trap
**Normal rule:** an index on a column speeds up queries filtering on that column.
**Apparently equivalent code:** `CREATE INDEX idx_rating ON movies(rating)`, then `WHERE rating > 8` — filtering with a *range* condition instead of exact equality, expecting the same kind of speedup.
**Surprising result:** it often does help, but far less dramatically than the equality case above, and for some queries SQLite's planner may decide scanning is actually cheaper and ignore the index entirely — `EXPLAIN QUERY PLAN` might still show `SCAN`.
**Exact reason:** an index is excellent at "jump directly to this one value" (equality) and reasonably good at "give me a contiguous range" (since the structure is sorted), but the planner weighs the *estimated* cost of each approach — if a huge fraction of rows match your range condition anyway, scanning the whole table can genuinely be cheaper than looking up thousands of individual matches through an index.
**Project consequence:** never assume an index helped just because you created one — always check `EXPLAIN QUERY PLAN` after adding an index, on your actual query, with realistic data volume. "I added an index" is not the same claim as "this query is now fast," and the only way to know which one is true is to look.

## Exercise
- **Predict:** `COUNT(*)` counts all rows in a group. What does `COUNT(studio_id)` return for the `studio_id = NULL` group specifically — the same count, or a different one?
- **Modify:** Write a query using `AVG(rating)` and `HAVING` together — studios with an average rating above 8, count included.
- **Break:** Run `SELECT studio_id FROM movies WHERE COUNT(*) > 1` yourself and read the exact error SQLite gives.
- **Repair:** Fix it using `HAVING`, and explain in one sentence why moving the condition fixed it rather than just being a syntax swap.
- **Trace:** For the 200,000-row example, run `EXPLAIN QUERY PLAN` on `SELECT * FROM movies WHERE year = 2020` (no index on `year`) — do you get `SCAN` or `SEARCH`, and does that match what you'd predict given no index exists on that column?

## What to remember
- `GROUP BY` answers questions about groups of rows; aggregate functions (`COUNT`, `AVG`, `SUM`) only make sense once grouping has happened.
- `WHERE` filters rows before grouping; `HAVING` filters groups after aggregation — using an aggregate in `WHERE` is a real SQL error, not just bad style.
- `EXPLAIN QUERY PLAN` tells you what the database actually intends to do — read it instead of guessing why something is slow.
- An index trades faster reads for slower writes and extra storage — it is a real cost, not a free performance upgrade, and it doesn't guarantee the planner will even use it.

## Next lesson
Open again — deeper database topics (transactions, and what actually happens when two things try to write at once), formal testing of the whole pipeline you've built, or starting the ML track are all live options whenever you're ready to pick.
