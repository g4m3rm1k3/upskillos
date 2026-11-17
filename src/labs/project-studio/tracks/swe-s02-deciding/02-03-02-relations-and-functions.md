---
title: "Relations and Functions: Pairing Rows by Key"
runtime: python
---

A bank statement says `MARKET`; Ledger wants `groceries`. A small table can say which description belongs to which category, and joining the statement to it, row by row, by description, gives each transaction its category. That's the most common operation in all of data work, and it fails in two quiet ways. If the table says `MARKET` twice, with two categories, every market visit is counted twice, once in each. If it doesn't mention `PIZZA PLACE` at all, the pizza disappears from the result. Both failures come from a property the lookup table was supposed to have and didn't: being a **function**. This lesson is about relations, pairs of things that go together, and their properties, which decide whether a relation can group things, sort them, or look them up. Kit gains `join`, and, in the task, a `--lookup` mode that checks the table really is a function before trusting it.

Why Python: relations are sets of pairs, and Python's sets, tuples and dictionaries let each property be written as one line that reads like its definition.

**By the end you can:**

- Treat a relation as a set of pairs, and a table as a relation.
- Check whether a relation is reflexive, symmetric, antisymmetric, transitive or total, and say what that makes it: an equivalence (which partitions), a partial or total order (which sorts), or neither.
- Tell whether a mapping is a function, and whether it's injective, surjective or bijective; compose functions, and say when one has an inverse.
- State a functional dependency, and check one on data.
- Join two tables by a key, and predict what duplicates and missing keys do to the result.

**You need:** 02-03-01 (sets, `uniq.py`'s `read_records` and `write`, the statement samples). Commands run inside `kit`.

## Pairs

A **relation** between two sets is a set of pairs: (Sam, Sam's card), (Alex, Alex's card) is the relation "holds" between people and accounts. A relation on one set pairs its members with each other: "costs no more than" on amounts contains (1880, 2750) and not (2750, 1880). Every table is a relation: a CSV file is a set of records, each a tuple of related values, which is why databases built on this idea are called *relational*.

```predict
question: "Is the same category as" relates two transactions when they're in the same category. Is every transaction related to itself?
choice: Yes
choice: No
choice: Only if there are two transactions in its category
answer: Yes
explain: A transaction is always in the same category as itself, so (t, t) is in the relation for every t. That property is called reflexive. It sounds trivial, but plenty of relations don't have it: "costs less than" relates no amount to itself.
```

## Properties

Five properties decide what a relation is good for:

| Property | Means | Example |
|---|---|---|
| **Reflexive** | Everything is related to itself | Same category as |
| **Symmetric** | If a is related to b, b is related to a | Same category as |
| **Antisymmetric** | If both ways, they're the same thing | No more than |
| **Transitive** | If a to b and b to c, then a to c | No more than |
| **Total** | Any two are related one way or the other | No more than, on numbers |

Reflexive, symmetric and transitive together make an **equivalence relation**, and an equivalence splits its set into **classes** (a **partition**): every member in exactly one class, the members of a class all related, members of different classes never. That's what grouping is. Reflexive, antisymmetric and transitive make a **partial order**; add total and it's a **total order**. That's what sorting needs.

Check them rather than trusting intuition. Create `relations.py`:

```python file=kit/relations.py
# A relation on a set is a set of pairs (a, b), read "a is related to b".
# Its properties decide what it can be used for: grouping, sorting, neither.


def reflexive(pairs, items):
    return all((x, x) in pairs for x in items)


def symmetric(pairs):
    return all((b, a) in pairs for a, b in pairs)


def antisymmetric(pairs):
    return all(a == b for a, b in pairs if (b, a) in pairs)


def transitive(pairs):
    return all((a, d) in pairs for a, b in pairs for c, d in pairs if b == c)


def total(pairs, items):
    return all((a, b) in pairs or (b, a) in pairs for a in items for b in items)


# Made-up transactions: a category and an amount in cents.
SPENT = {
    "t1": ("groceries", 6420),
    "t2": ("groceries", 4815),
    "t3": ("rent", 95000),
    "t4": ("eating out", 2750),
    "t5": ("eating out", 1880),
    "t6": ("transport", 3000),
}
# Sets of tags, each different.
TAG_SETS = [
    frozenset(),
    frozenset({"shared"}),
    frozenset({"recurring"}),
    frozenset({"shared", "recurring"}),
    frozenset({"gift"}),
]


# The relation on items made of every pair for which related(a, b) is true.
def relation(items, related):
    return {(a, b) for a in items for b in items if related(a, b)}


RELATIONS = {
    "same category as": (SPENT, relation(SPENT, lambda a, b: SPENT[a][0] == SPENT[b][0])),
    "costs no more than": (SPENT, relation(SPENT, lambda a, b: SPENT[a][1] <= SPENT[b][1])),
    "within 10.00 of": (SPENT, relation(SPENT, lambda a, b: abs(SPENT[a][1] - SPENT[b][1]) <= 1000)),
    "tags a subset of": (TAG_SETS, relation(TAG_SETS, lambda a, b: a <= b)),
}
PROPERTIES = ["reflexive", "symmetric", "antisymmetric", "transitive", "total"]

if __name__ == "__main__":
    print(" " * 20, " ".join(PROPERTIES))
    for name, (items, pairs) in RELATIONS.items():
        flags = [reflexive(pairs, items), symmetric(pairs), antisymmetric(pairs), transitive(pairs), total(pairs, items)]
        cells = [str(flag).rjust(len(word)) for flag, word in zip(flags, PROPERTIES)]
        print(name.ljust(20), " ".join(cells))
    # An equivalence relation splits its set into classes: here, by category.
    classes = {}
    for t, (category, cents) in SPENT.items():
        classes.setdefault(category, []).append(t)
    print(classes)
```

Each property is its definition, written as code: `symmetric` says that for every pair (a, b), the pair (b, a) is there too. `relation` builds the set of pairs from a test, by trying every pair of items: a Cartesian product filtered (02-03-01). `frozenset` is a set that can't change, so it can be a member of a set. "Within 10.00 of" is the relation a tolerant matcher uses ("these two amounts are close enough to be the same payment").

```predict
question: Is "within 10.00 of" transitive?
choice: Yes, closeness chains
choice: No
answer: No
explain: t5 (18.80) is within 10.00 of t4 (27.50), and t4 is within 10.00 of t6 (30.00), but t5 and t6 are 11.20 apart. Closeness doesn't chain, so "close enough" isn't an equivalence, and you can't group by it: which group would t4 go in?
```

Save it and run it:

```
.venv/bin/python relations.py
```

(On Windows, `.venv/Scripts/python`.)

```
                     reflexive symmetric antisymmetric transitive total
same category as          True      True         False       True False
costs no more than        True     False          True       True  True
within 10.00 of           True      True         False      False False
tags a subset of          True     False          True       True False
{'groceries': ['t1', 't2'], 'rent': ['t3'], 'eating out': ['t4', 't5'], 'transport': ['t6']}
```

Read the table row by row. "Same category as" is reflexive, symmetric and transitive: an equivalence, and the last line is its partition, the classes by category. "Costs no more than" is a total order: it sorts. "Tags a subset of" is a partial order but not total: `{"shared"}` and `{"gift"}` aren't related either way, so tag sets can be arranged in levels but not in one line. "Within 10.00 of" is reflexive and symmetric but not transitive, so it's neither. A program that groups transactions by "close" amounts, or sorts by a comparison that isn't a total order, gives answers that depend on the order it happened to see things in.

```check
run "cd kit; .venv/Scripts/python relations.py" stdout="{'groceries': ['t1', 't2'], 'rent': ['t3'], 'eating out': ['t4', 't5'], 'transport': ['t6']}" -- relations.py should end with the partition by category.
run "cd kit; .venv/Scripts/python -c \"import relations as r; items, pairs = r.RELATIONS['within 10.00 of']; print(r.symmetric(pairs), r.transitive(pairs))\"" stdout="True False" -- "Within 10.00 of" should be symmetric but not transitive.
```

## A lookup table

Now the lookup table from the opening: which category each bank description belongs to. Make it as a sample. Create `make_mapping.py`:

```python file=kit/make_mapping.py
import csv

# Which category each description on a bank statement belongs to: a lookup
# table, one row per description.
MAPPING = [
    ("COFFEE CORNER", "eating out"),
    ("CITY TRANSPORT", "transport"),
    ("MARKET", "groceries"),
    ("RENT", "rent"),
    ("POWER CO", "bills"),
    ("PIZZA PLACE", "eating out"),
    ("PHONE CO", "bills"),
]

with open("samples/categories.csv", "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["description", "category"])
    writer.writerows(MAPPING)
```

Save it and run it:

```
.venv/bin/python make_mapping.py
```

It writes `samples/categories.csv`, a header and seven rows.

```check
run "cd kit; .venv/Scripts/python -c \"from uniq import read_records; header, rows = read_records('samples/categories.csv'); print(header, len(rows))\"" stdout="['description', 'category'] 7" -- make_mapping.py should write samples/categories.csv with seven descriptions.
```

## Functions and their kinds

A **function** from A to B is a relation that pairs each member of A with **exactly one** member of B. A Python dictionary is one: each key gives one value. Three more words describe how a function covers its sets:

- **Injective** (one-to-one): no two members of A share a value. Then nothing is lost going through it.
- **Surjective** (onto): every member of B is some member's value. Then nothing in B is unreachable.
- **Bijective**: both. Then it has an **inverse**, a function back from B to A.

Two functions chain: if `f` goes from A to B and `g` from B to C, the **composition** `g ∘ f` goes from A to C: `g(f(x))`. And a **functional dependency** (FD), written description → category, says that in a table, each description determines its category: two rows with the same description always have the same category. It's the property that makes the table usable as a function.

Create `functions.py`:

```python file=kit/functions.py
from uniq import read_records

# A dictionary is a function: each key gives exactly one value.
header, rows = read_records("samples/categories.csv")
category_of = {description: category for description, category in rows}

# A functional dependency: description -> category holds if no description
# appears with two different categories. A dict can't even record a breach:
# a second value for a key replaces the first.
seen = {}
for description, category in rows:
    seen.setdefault(description, set()).add(category)
print("description -> category holds:", all(len(c) == 1 for c in seen.values()))

# Injective: no two keys share a value. Surjective (onto): every category in
# Ledger is some key's value.
CATEGORIES = {"rent", "groceries", "transport", "eating out", "bills"}
print("injective:", len(set(category_of.values())) == len(category_of))
print("surjective onto Ledger's categories:", set(category_of.values()) == CATEGORIES)

# The inverse of a function that isn't injective isn't a function: building
# it as a dict keeps only the last key for each value, and says nothing.
description_of = {category: description for description, category in category_of.items()}
print(len(category_of), "descriptions,", len(description_of), "after inverting:", description_of["eating out"])

# Composition: description -> category, then category -> need or want.
KIND = {"rent": "need", "groceries": "need", "transport": "need", "bills": "need", "eating out": "want"}
kind_of = {description: KIND[category] for description, category in category_of.items()}
print(kind_of["PIZZA PLACE"], kind_of["MARKET"])
```

`seen` maps each description to the set of categories it appears with; the FD holds if every set has one member. It has to be checked on the rows, because a dictionary built from them can't hold two values for one key: the second silently replaces the first. Injective is a count: as many distinct values as keys. The inverse is built the obvious way, and the composition is a dictionary of `KIND[category]` for each description.

```predict
question: The mapping has 7 descriptions and 5 categories. How many entries does the inverted dictionary, category to description, have?
answer: 5
explain: A dictionary can't hold two entries with the same key, and the inverse's keys are the categories, of which there are five. Two descriptions share "eating out" (COFFEE CORNER and PIZZA PLACE) and two share "bills", so two descriptions are lost, silently, and description_of["eating out"] is whichever came last. A function that isn't injective has no inverse; building one anyway loses data without an error.
verify: cd kit; .venv/Scripts/python -c "from uniq import read_records; header, rows = read_records('samples/categories.csv'); print(len({category: description for description, category in rows}))"
```

Save it and run it:

```
.venv/bin/python functions.py
```

```
description -> category holds: True
injective: False
surjective onto Ledger's categories: True
7 descriptions, 5 after inverting: PIZZA PLACE
want need
```

The FD holds, so the table is a function. It isn't injective (several descriptions per category), so its inverse loses data: 7 keys go in, 5 come out, and `"eating out"` maps to `PIZZA PLACE` only because it came later. It is surjective onto Ledger's five categories, so every category has at least one description. And the composition answers a question neither table answers alone: pizza is a want, the market a need.

```check
run "cd kit; .venv/Scripts/python functions.py" stdout="description -> category holds: True" -- The mapping should satisfy the functional dependency description -> category.
run "cd kit; .venv/Scripts/python functions.py" stdout="7 descriptions, 5 after inverting: PIZZA PLACE" -- Inverting the mapping should keep only 5 of the 7 descriptions.
run "cd kit; .venv/Scripts/python functions.py" stdout="want need" -- Composed with KIND, pizza is a want and the market a need.
```

## join

A **join** pairs the records of two tables that agree on a column: every statement row with the mapping row whose description matches. Create `join.py`:

```python file=kit/join.py
import sys

from kitargs import fail, help_if_asked, take_option
from uniq import read_records, write

USAGE = "LEFT RIGHT --on COLUMN"


# Pair each record of left with every record of right that has the same value
# in the column: an inner join. Each result has left's fields, then right's
# other fields. Returns the header, the joined records, and how many of
# left's records matched nothing.
def join(left, right, column):
    (header_l, rows_l), (header_r, rows_r) = left, right
    i, j = header_l.index(column), header_r.index(column)
    matches = {}
    for row in rows_r:
        matches.setdefault(row[j], []).append(row[:j] + row[j + 1:])
    header = (*header_l, *header_r[:j], *header_r[j + 1:])
    joined = [(*row, *match) for row in rows_l for match in matches.get(row[i], [])]
    unmatched = sum(1 for row in rows_l if row[i] not in matches)
    return header, joined, unmatched


def main():
    help_if_asked(sys.argv[1:], USAGE)
    column, args = take_option(sys.argv[1:], "--on")
    if column is None or len(args) != 2:
        fail("expected two files and --on COLUMN; usage: " + USAGE)
    left, right = read_records(args[0]), read_records(args[1])
    for name, (header, rows) in zip(args, [left, right]):
        if column not in header:
            fail(f"{name} has no column {column}; its columns are: " + ", ".join(header))
    header, joined, unmatched = join(left, right, column)
    write([header])
    write(joined)
    if unmatched:
        print(f"records of {args[0]} with no match in {args[1]}: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
```

`join` first indexes the right table: a dictionary from each key to the list of right records that have it (`setdefault` starts a list the first time a key is seen). Then each left record is paired with every match. That's an **inner join**: a left record with no match produces nothing. Since dropping data silently is how totals go wrong, `main` counts the unmatched records and reports them on standard error, where they don't mix with the output (01-06-02). `row[:j] + row[j + 1:]` leaves the key column out of the right side, since the left already has it. Save it and run it:

```
.venv/bin/python join.py samples/november.csv samples/categories.csv --on description
```

```
date,description,amount,category
2026-11-01,RENT,-950.00,rent
2026-11-02,MARKET,-64.20,groceries
2026-11-07,COFFEE CORNER,-4.50,eating out
2026-11-07,COFFEE CORNER,-4.50,eating out
2026-11-12,POWER CO,-71.30,bills
2026-11-20,PIZZA PLACE,-18.80,eating out
2026-11-25,PHONE CO,-39.99,bills
2026-11-28,MARKET,-61.05,groceries
```

Each transaction now has its category, and everything matched, so nothing went to standard error.

Now break the function. Open `samples/categories.csv` and add a last line saying the market is food, as someone tidying up categories might:

```
MARKET,food
```

Save it, and join again:

```
.venv/bin/python join.py samples/november.csv samples/categories.csv --on description
```

```predict
question: November has two market visits. With MARKET listed twice in the mapping (groceries and food), how many transactions does the join print?
answer: 10
explain: An inner join pairs each left record with every matching right record. Each market visit matches two mapping rows, so each appears twice, once as groceries and once as food: 8 transactions become 10, and anything totalled from the result counts 125.25 of market spending twice. Nothing fails, and the output looks like ordinary data.
```

```
date,description,amount,category
2026-11-01,RENT,-950.00,rent
2026-11-02,MARKET,-64.20,groceries
2026-11-02,MARKET,-64.20,food
2026-11-07,COFFEE CORNER,-4.50,eating out
2026-11-07,COFFEE CORNER,-4.50,eating out
2026-11-12,POWER CO,-71.30,bills
2026-11-20,PIZZA PLACE,-18.80,eating out
2026-11-25,PHONE CO,-39.99,bills
2026-11-28,MARKET,-61.05,groceries
2026-11-28,MARKET,-61.05,food
```

Read the evidence: ten rows, and the market visits twice each. `functions.py` catches the same mistake from the other side: run it now and it reports `description -> category holds: False`, then stops with `KeyError: 'food'`, because the dictionary kept `food`, the last value for MARKET, and `KIND` has no such category. The join's result is a product of the matches (02-03-01): one left row times two right rows is two. With a key that should be unique, the only thing that keeps a join from multiplying rows is the functional dependency, and nothing in the file enforces it.

Put the mapping back by running the script that makes it:

```
.venv/bin/python make_mapping.py
```

```check
run "cd kit; .venv/Scripts/python join.py samples/november.csv samples/categories.csv --on description" stdout="2026-11-28,MARKET,-61.05,groceries" -- join.py should give each transaction its category.
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; r = subprocess.run([sys.executable, 'join.py', 'samples/november.csv', 'samples/categories.csv', '--on', 'description'], capture_output=True, text=True); print(len(r.stdout.splitlines()) - 1, repr(r.stderr))\"" stdout="8 ''" -- With the mapping restored (run make_mapping.py), the join should give 8 transactions, and nothing unmatched.
run "cd kit; .venv/Scripts/python join.py samples/november.csv samples/people.csv --on description" exit=1 stderr="has no column description" -- join.py should say which file lacks the column.
```

## Tests for join

Pin the join's behaviour down, including both quiet failures, as tests. Create `tests/test_join.py`:

```python file=kit/tests/test_join.py
from join import join

PEOPLE = (["id", "name"], [("1", "Sam"), ("2", "Alex")])


def test_each_left_record_meets_its_match():
    pets = (["id", "pet"], [("2", "cat"), ("1", "dog")])
    header, joined, unmatched = join(PEOPLE, pets, "id")
    assert header == ("id", "name", "pet")
    assert joined == [("1", "Sam", "dog"), ("2", "Alex", "cat")]
    assert unmatched == 0


def test_a_record_with_no_match_is_left_out_and_counted():
    pets = (["id", "pet"], [("1", "dog")])
    _, joined, unmatched = join(PEOPLE, pets, "id")
    assert joined == [("1", "Sam", "dog")]
    assert unmatched == 1


def test_several_matches_give_several_records():
    pets = (["id", "pet"], [("1", "dog"), ("1", "fish")])
    _, joined, _ = join(PEOPLE, pets, "id")
    assert joined == [("1", "Sam", "dog"), ("1", "Sam", "fish")]
```

The second and third tests are the two behaviours that surprised: a record without a match disappears (and is counted), and several matches give several records. Writing them as tests says these are decisions, not accidents. `_` is the usual name for a value you're deliberately ignoring; Ruff, run by Kit's hook, insists on it. Save it, run the tests, and commit:

```
.venv/bin/python -m pytest -q tests/test_join.py
git add relations.py make_mapping.py samples/categories.csv functions.py join.py tests/test_join.py
git commit -m "Add join, and look at relations and functions"
```

The tests print `3 passed`.

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_join.py" stdout="3 passed" -- The three join tests should pass.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(all(git('cat-file', '-e', 'HEAD:' + n).returncode == 0 for n in ['relations.py', 'functions.py', 'join.py', 'samples/categories.csv', 'tests/test_join.py']), git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit the files, with the mapping restored.
```

**What else, and why not.** You could load the mapping into a dictionary and look each description up: that's a join with the functional dependency assumed, so a repeated description silently keeps its last category, and a missing one raises `KeyError` far from the cause. You could use a spreadsheet's lookup function: most return the first match and say nothing about the second. A database enforces the dependency with a primary key or a `UNIQUE` constraint on the column, which is the strongest answer, and the one Ledger gets in 7.7. Until then, the check has to be in the tool.

## Your turn: a join that checks its lookup

Add `--lookup` to `join.py`. With it, the right file is treated as a lookup table, a function from the column to the rest of the row, and `join.py` checks that it is one before joining:

- **Each value once.** If any value of the column appears more than once in the right file, stop with exit status 1 and a message on standard error that names the value and how many times it appears.
- **Every left record found.** If any left record's value isn't in the right file, stop with exit status 1, naming the value.

Without `--lookup`, `join.py` behaves exactly as before. Commit `join.py` (Kit's hook runs the tests and Ruff).

```hints
nudge: Each check is a property of a function. "Each value once" is the functional dependency on the right file; "every left record found" says the function is defined for everything you'll ask it.
concept: Count the right file's values with collections.Counter: any count above 1 breaks the dependency. Then, for each left record, a count of 0 means no match. Check both before joining, so nothing is printed when the lookup is broken. kitargs.take_flag takes --lookup out of the arguments, as uniq.py does for --count.
shape: def lookup_problem(left, right, column, names): counts = Counter(...); for value, count in counts.items(): if count > 1: return a message; for row in left's rows: if counts[...] == 0: return a message; return None. In main: lookup, args = take_flag(sys.argv[1:], "--lookup") before take_option, and if lookup and a problem: fail(problem).
answer: In join.py, import collections and take_flag, and add before main:
~~~python
# For --lookup, right must be a function of the column: each value appears
# once (a functional dependency), and every record of left finds its value
# (the function is total on left's values). The first breach, or None.
def lookup_problem(left, right, column, names):
    (header_l, rows_l), (header_r, rows_r) = left, right
    i, j = header_l.index(column), header_r.index(column)
    counts = collections.Counter(row[j] for row in rows_r)
    for value, count in counts.items():
        if count > 1:
            return f"{names[1]}: {value} appears {count} times in {column}; a lookup needs each value once"
    for row in rows_l:
        if counts[row[i]] == 0:
            return f"{names[0]}: {row[i]} has no match in {names[1]}"
    return None
~~~
In main, take the flag first, and check before joining:
~~~python
    lookup, args = take_flag(sys.argv[1:], "--lookup")
    column, args = take_option(args, "--on")
    ...
    if lookup:
        problem = lookup_problem(left, right, column, args)
        if problem:
            fail(problem)
    header, joined, unmatched = join(left, right, column)
~~~
Update USAGE to "LEFT RIGHT --on COLUMN [--lookup]". Then git add join.py and git commit -m "Check that a join's lookup table is a function". The tempting slip is checking only for repeated values: a missing description then still vanishes from the result, with only the stderr count to notice.
```

```check
run "cd kit; .venv/Scripts/python join.py samples/november.csv samples/categories.csv --on description --lookup" stdout="2026-11-28,MARKET,-61.05,groceries" -- With a proper lookup table, --lookup should join as before.
run "cd kit; .venv/Scripts/python -c \"import os, shutil, subprocess, sys, tempfile; p = os.path.join(tempfile.mkdtemp(), 'c.csv'); shutil.copy('samples/categories.csv', p); f = open(p, 'a', newline=''); f.write('MARKET,food' + chr(13) + chr(10)); f.close(); r = subprocess.run([sys.executable, 'join.py', 'samples/november.csv', p, '--on', 'description', '--lookup'], capture_output=True, text=True); print(r.returncode, 'MARKET' in r.stderr, r.stdout == '')\"" stdout="1 True True" -- With MARKET twice in the lookup table, --lookup should stop with status 1, name MARKET, and print no rows.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sys, tempfile; p = os.path.join(tempfile.mkdtemp(), 'c.csv'); t = open('samples/categories.csv', encoding='utf-8', newline='').read(); open(p, 'w', encoding='utf-8', newline='').write(''.join(l for l in t.splitlines(True) if 'PIZZA' not in l)); r = subprocess.run([sys.executable, 'join.py', 'samples/november.csv', p, '--on', 'description', '--lookup'], capture_output=True, text=True); print(r.returncode, 'PIZZA PLACE' in r.stderr)\"" stdout="1 True" -- With PIZZA PLACE missing from the lookup table, --lookup should stop with status 1 and name it.
run "cd kit; .venv/Scripts/python -c \"import os, shutil, subprocess, sys, tempfile; p = os.path.join(tempfile.mkdtemp(), 'c.csv'); shutil.copy('samples/categories.csv', p); f = open(p, 'a', newline=''); f.write('MARKET,food' + chr(13) + chr(10)); f.close(); r = subprocess.run([sys.executable, 'join.py', 'samples/november.csv', p, '--on', 'description'], capture_output=True, text=True); print(r.returncode, len(r.stdout.splitlines()) - 1)\"" stdout="0 10" -- Without --lookup, join.py should behave as before: the repeated key gives 10 rows.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('--lookup' in git('show', 'HEAD:join.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit join.py.
```

**What these checks establish, and what they don't.** They check each relation's properties and the partition, that the mapping is a function that isn't injective and that inverting it loses two keys, that the join pairs rows correctly, multiplies them when a key repeats and reports what it drops, and that `--lookup` refuses a table that isn't a function, either way, without changing the plain join. They can't check that you'd notice which relation a piece of code silently assumes: that a sort's comparison is a total order, that a grouping key is an equivalence, that a "unique" column is unique. Those assumptions are rarely written down, which is why they're worth stating, in a spec or a check, wherever data crosses from one table to another.

## What you can do now

- A **relation** is a set of pairs; a **table** is a relation, a **dictionary** a function.
- **Reflexive, symmetric, transitive**: an **equivalence**, which **partitions** (grouping). **Reflexive, antisymmetric, transitive**: a **partial order**; with **total**, a **total order** (sorting). Check the properties; "close enough" fails transitivity.
- A **function** pairs each input with exactly one output. **Injective**: nothing shares a value; **surjective**: every value is reached; **bijective**: both, and only then is there an **inverse**. Functions **compose**.
- A **functional dependency** (key → value) is what makes a table a lookup. A dictionary can't show it broken; check it on the rows.
- A **join** pairs rows by key; repeated keys **multiply** rows, missing keys **drop** them, and both are silent unless the tool checks.

```predict
question: A report joins 1,000 orders to a customers table on customer_id and gets 1,040 rows. What does that tell you, and how would you find the cause?
explain: Some customer_id values appear more than once in the customers table, so the functional dependency customer_id → customer is broken, and those customers' orders appear once per duplicate (40 extra rows). Count the customer_id values in the customers table (a Counter, or GROUP BY customer_id HAVING COUNT(*) > 1 in SQL) to find the repeats, then decide which row is right and enforce uniqueness so it can't happen again. If there were fewer than 1,000 rows, the cause would be orders whose customer_id has no customer.
```

**Next:** 02-04-01 turns from what data means to how it's written down. JSON, YAML, TOML, CSV, XML and binary formats, what each can and can't say, the pitfalls of serialization, and canonical forms. Kit gains `convert`, between CSV, JSON and TOML.
