---
title: Normal Forms and Satisfiability: Can This Query Ever Match?
runtime: python
---

Run `filter` with a query, get no output, and you face a question the tool doesn't answer: is the log missing those lines, or can *no* line ever match what you asked for? `--all disk --none disk` is obviously impossible. `--all error --none err` is impossible too, and much less obviously. This lesson finishes module 1.2. It shows the two standard shapes every condition can be written in, names the question "can this ever be true?", and teaches `filter` to answer it before it reads a single line.

**By the end you can:**

- Write any condition of a few propositions in disjunctive normal form (an OR of ANDs) and conjunctive normal form (an AND of ORs), straight from its truth table.
- Decide whether a condition is satisfiable by searching every candidate, and explain why that search doubles in cost with each new proposition.
- Use the shape of a particular problem to answer the same question quickly, and check the fast answer against the slow one.

**You need:** lessons 01-02-01 to 01-02-03, with `kit/filter.py` (the flat `matches`) and `kit/check_filter.py`. Commands run inside `kit`: `cd ../kit` if you're still in `blockfall`.

## A query that matches nothing

Try three queries on the sample log:

```
.venv/bin/python filter.py samples/app.log --all disk --none disk
.venv/bin/python filter.py samples/app.log --all error --none err
.venv/bin/python filter.py samples/app.log --any disk slow --none disk slow
```

All three print nothing and end normally. The first is plainly impossible: it demands `disk` and forbids it. The other two are impossible as well, for reasons this lesson works out. From the outside, though, "no line in this file matched" and "no line in any file could match" look the same. A query that can never match is almost always a mistake, and the tool should say so.

A condition that some input makes true is **satisfiable**; one that no input can make true is **unsatisfiable**, or a **contradiction**. The question "is this satisfiable?" is called **SAT**, and it's one of the most studied problems in computer science.

```check
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --none debug" stdout="error: disk full" -- Start from filter.py as 01-02-02 left it, with the flat matches.
run "cd kit; .venv/Scripts/python check_filter.py" stdout="4096 cases, 0 differences"
```

## Two standard shapes

Every condition, however tangled, can be rewritten in either of two standard shapes. They're built from two small pieces:

- A **literal** is a proposition or its negation: `a`, `not a`.
- A **clause** is literals joined by one operator, all `and` or all `or`.

The shapes are:

- **Disjunctive normal form (DNF):** an OR of AND-clauses. `(a and not b) or (not a and b)`.
- **Conjunctive normal form (CNF):** an AND of OR-clauses. `(a or b) and (not a or not b)`.

Both of those are XOR, `a != b`, and you can build each straight from the truth table:

- **DNF from the true rows.** XOR is true in two rows: a true with b false, and a false with b true. Write one AND-clause for each such row, describing it exactly, and join them with OR: "it's this row, or that row".
- **CNF from the false rows.** XOR is false when both are false and when both are true. Each false row gives one OR-clause that rules it out: "not both false" is `a or b`, and "not both true" is `not a or not b` (De Morgan). Join them with AND: "it isn't this row, and it isn't that row".

Check all three forms over the four rows:

```
.venv/bin/python -c "print([(a and not b) or (not a and b) for a in (False, True) for b in (False, True)], [(a or b) and (not a or not b) for a in (False, True) for b in (False, True)])"
```

Both lists are `[False, True, True, False]`, the XOR column. Because the method works on any table, every condition has a DNF and a CNF. They are **normal forms**: standard shapes that make conditions easy to compare, store and search.

`filter`'s query is already a CNF. Each `--all` term is a one-literal clause (`error`). The `--any` group is one OR-clause (`disk or slow`). Each `--none` term is a one-literal clause with a negation (`not debug`). And they're all joined by AND. But it's a restricted CNF: only one OR-clause, with no negations inside it.

```predict
question: Can a single filter query keep exactly the lines that have (error and disk) or (warning and slow)?
choice: Yes: --any error disk warning slow
choice: Yes: --all error disk --any warning slow
choice: No: that condition needs more than one OR-clause in CNF
answer: No: that condition needs more than one OR-clause in CNF
explain: It's a DNF of two AND-clauses. Distributing it into CNF gives four OR-clauses: (error or warning) and (error or slow) and (disk or warning) and (disk or slow). A filter query has one --any group, so it can hold only one. The first choice also keeps a line that only says "disk"; the second keeps "error disk slow" but drops "warning slow". To say this, filter would need several --any groups, or two runs whose results are combined.
```

```check
run "cd kit; .venv/Scripts/python -c \"print([(a and not b) or (not a and b) for a in (False, True) for b in (False, True)] == [(a or b) and (not a or not b) for a in (False, True) for b in (False, True)])\"" stdout="True" -- The DNF and CNF of XOR should agree in every row.
```

## A first answer

When is a `filter` query impossible? The idea that comes first is: when a term is both required and forbidden. Python's **sets** make that quick to check. `set(items)` makes a set from a list, and `a & b` is the **intersection**, the members in both, as in 01-02-03. An empty set is falsy.

`can_match` returns whether some line could match. `main` calls it before reading anything, and stops with a message (and status 1) when the answer is no. **This version is wrong, and you'll find out how.**

```python file=kit/filter.py
import sys


# The query: a line matches when it contains every --all term,
# at least one --any term (if any were given), and no --none term.
def matches(line, all_terms, any_terms, none_terms):
    return (
        all(term in line for term in all_terms)
        and (not any_terms or any(term in line for term in any_terms))
        and not any(term in line for term in none_terms)
    )


# Can any line at all match the query? A first idea: not if a term is
# both required and forbidden.
def can_match(all_terms, any_terms, none_terms):
    return not (set(all_terms) & set(none_terms))


# Copy the lines that match from a stream of bytes to standard output.
def filter_lines(stream, all_terms, any_terms, none_terms):
    for line in stream:
        if matches(line, all_terms, any_terms, none_terms):
            sys.stdout.buffer.write(line)


def main():
    args = sys.argv[1:]
    if len(args) == 0:
        sys.exit("usage: filter.py FILE [--all TERM ...] [--any TERM ...] [--none TERM ...]")

    groups = {"--all": [], "--any": [], "--none": []}
    group = None
    for arg in args[1:]:
        if arg in groups:
            group = groups[arg]
        elif group is None:
            sys.exit("filter.py: put --all, --any or --none before " + arg)
        else:
            group.append(arg.encode("utf-8"))

    if not can_match(groups["--all"], groups["--any"], groups["--none"]):
        sys.exit("filter.py: no line can ever match this query")

    if args[0] == "-":
        filter_lines(sys.stdin.buffer, groups["--all"], groups["--any"], groups["--none"])
    else:
        with open(args[0], "rb") as file:
            filter_lines(file, groups["--all"], groups["--any"], groups["--none"])


if __name__ == "__main__":
    main()
```

Save it and run the three queries from the first step again. The first now prints `filter.py: no line can ever match this query`. The other two still print nothing, silently. Each is a counterexample to the shortcut:

1. **`--all error --none err`.** The terms are different, so the sets don't intersect. But `filter`'s terms are *substrings*: any line containing `error` contains `err`, so the requirement guarantees the line is forbidden.
2. **`--any disk slow --none disk slow`.** Nothing is in both `--all` and `--none`, since `--all` is empty. But every way of satisfying the `--any` clause uses a forbidden term.

The shortcut reasoned about the terms as if they were independent propositions. They aren't: `error` being present forces `err` to be present. A rule that's right for one model of the problem and wrong for the real one is a common way for "obviously correct" code to fail.

```check
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all disk --none disk" exit=1 stderr="no line can ever match" -- can_match should be false when a term is both required and forbidden.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --none debug" stdout="error: disk full" -- A query that can match should still filter as before.
```

## Search every candidate line

A shortcut needs an argument for why it's right. A search needs only patience: build every line that could matter, and ask `matches` about each one. That's always correct, because it uses `matches` itself, the real definition, with substrings and all.

Which lines matter? Only which of the query's terms a line contains can affect `matches`. So try one line for each **subset** of the query's terms, built with `itertools.combinations` as in `check_filter.py`. The terms are joined with a zero byte, `b"\0"`. A term typed on a command line can never contain a zero byte, so joining with one can't accidentally create a term that spans two pieces: the line contains exactly the substrings its pieces contain. If any real line matches, then the line made of the `--all` terms and one `--any` term it contains matches too, and that subset is among those tried. So the search can't miss.

```python file=kit/filter.py
import itertools
import sys


# The query: a line matches when it contains every --all term,
# at least one --any term (if any were given), and no --none term.
def matches(line, all_terms, any_terms, none_terms):
    return (
        all(term in line for term in all_terms)
        and (not any_terms or any(term in line for term in any_terms))
        and not any(term in line for term in none_terms)
    )


# Can any line at all match the query? Try a line made of each subset of
# the query's terms. A term never contains a zero byte, so joining with one
# can't create a term that wasn't in the subset.
def can_match(all_terms, any_terms, none_terms):
    terms = all_terms + any_terms + none_terms
    for size in range(len(terms) + 1):
        for subset in itertools.combinations(terms, size):
            line = b"\0".join(subset)
            if matches(line, all_terms, any_terms, none_terms):
                return True
    return False


# Copy the lines that match from a stream of bytes to standard output.
def filter_lines(stream, all_terms, any_terms, none_terms):
    for line in stream:
        if matches(line, all_terms, any_terms, none_terms):
            sys.stdout.buffer.write(line)


def main():
    args = sys.argv[1:]
    if len(args) == 0:
        sys.exit("usage: filter.py FILE [--all TERM ...] [--any TERM ...] [--none TERM ...]")

    groups = {"--all": [], "--any": [], "--none": []}
    group = None
    for arg in args[1:]:
        if arg in groups:
            group = groups[arg]
        elif group is None:
            sys.exit("filter.py: put --all, --any or --none before " + arg)
        else:
            group.append(arg.encode("utf-8"))

    if not can_match(groups["--all"], groups["--any"], groups["--none"]):
        sys.exit("filter.py: no line can ever match this query")

    if args[0] == "-":
        filter_lines(sys.stdin.buffer, groups["--all"], groups["--any"], groups["--none"])
    else:
        with open(args[0], "rb") as file:
            filter_lines(file, groups["--all"], groups["--any"], groups["--none"])


if __name__ == "__main__":
    main()
```

Save it and run the three queries once more: all three now print `filter.py: no line can ever match this query`, and end with status 1. `--all error --none debug` still prints `error: disk full`, and `check_filter.py` still reports `4096 cases, 0 differences`, because `matches` hasn't changed.

```check
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --none err" exit=1 stderr="no line can ever match" -- can_match should search lines built from subsets of the terms, and use matches on each.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --any disk slow --none disk slow" exit=1 stderr="no line can ever match" -- Every way to satisfy --any here uses a forbidden term.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --none debug" stdout="error: disk full" -- Satisfiable queries should filter as before.
```

## How long does searching take?

A query with `n` terms has 2ⁿ subsets, and an unsatisfiable query makes the search try every one before it can say no. This script times `can_match` on impossible queries of growing size: each has `n` terms in `--any`, and the same `n` in `--none`, so `2n` terms in all.

```python file=kit/time_can_match.py
import sys
import time

import filter

# A query that can never match: every --any term is also a --none term.
for n in [4, 6, 8, 9, 10]:
    terms = [("t" + str(i)).encode() for i in range(n)]
    start = time.perf_counter()
    result = filter.can_match([], terms, terms)
    seconds = time.perf_counter() - start
    fast = "-"
    if hasattr(filter, "can_match_fast"):
        start = time.perf_counter()
        filter.can_match_fast([], terms, terms)
        fast = round(time.perf_counter() - start, 5)
    print(n, "terms in each group:", result, round(seconds, 3), "s brute force,", fast, "s fast")
    sys.stdout.flush()
```

(`time.perf_counter()` is a clock meant for measuring short intervals. `hasattr(filter, "can_match_fast")` asks whether that function exists yet: not until the task. The `-` column waits for it.)

```predict
question: Going from 9 terms in each group to 10 adds two terms to the search. Roughly how much longer should the brute force take?
choice: About 10% longer
choice: About twice as long
choice: About four times as long
answer: About four times as long
explain: Each extra term doubles the number of subsets, and two extra terms double it twice. Going from 18 terms in all to 20 means 2^20 subsets instead of 2^18: four times as many.
```

Save it and run `.venv/bin/python time_can_match.py`. It takes several seconds. On one Windows machine it printed:

```
4 terms in each group: False 0.001 s brute force, - s fast
6 terms in each group: False 0.014 s brute force, - s fast
8 terms in each group: False 0.229 s brute force, - s fast
9 terms in each group: False 0.924 s brute force, - s fast
10 terms in each group: False 3.749 s brute force, - s fast
```

Your times will differ, but the ratios won't: about 4 times longer for each step of one term per group. At this rate 15 terms per group would take over an hour. Growth like this, where each extra input multiplies the cost, is **exponential**, and it's why brute force is only the reference, never the product.

For conditions in general there's no known way out. Nobody has found a method that decides every satisfiability question quickly, and it's widely believed that none exists. Yet SAT solvers routinely handle real formulas with millions of propositions, because real problems have structure. `filter`'s queries have a lot of it.

**What else, and why not.**

| Approach | Cost |
|---|---|
| The set-intersection shortcut | Instant, and wrong: it misses substrings and `--any` groups that are all forbidden |
| Brute force over subsets | Always right, since it asks `matches` itself. Exponential: fine for a handful of terms, hopeless for dozens |
| An argument from the query's shape, checked against brute force (the task) | Fast and right, but only for this restricted CNF. Its correctness rests on the argument, so the brute force stays as the reference that checks it |

```check
run "cd kit; .venv/Scripts/python time_can_match.py" stdout="10 terms in each group: False" timeout=120 -- time_can_match.py should call filter.can_match on the impossible queries.
```

## Your turn: a fast can_match

Write `can_match_fast(all_terms, any_terms, none_terms)` in `filter.py`. It must give the same answer as `can_match` for every query, and look at only a handful of lines, not 2ⁿ. Then make `main` use it.

Prove it the way 01-02-02 proved a rewrite. Write `check_can_match.py`, which compares the two functions on every query built from a vocabulary with a substring relation in it: `[b"err", b"error", b"disk"]`, every subset in each of the three groups, 8 × 8 × 8 = 512 queries. It prints any query where they differ, then a line in the form `512 queries, 0 differences`.

When it passes, run `time_can_match.py` again and look at the last column.

```hints
nudge: The search argument said the search can't miss, because a line made of "the --all terms and one --any term" always works if anything does. How many such lines are there?
concept: A matching line must contain every --all term and, if there are --any terms, at least one of them. Adding anything else can only add forbidden substrings. So the only candidates worth trying are the --all terms alone (when --any is empty), or the --all terms plus one --any term, for each --any term: one line per --any term, instead of one per subset.
shape: If any_terms is empty, return matches(b"\0".join(all_terms), …). Otherwise loop over any_terms; for each, build b"\0".join(all_terms + [term]) and return True if matches says so; return False after the loop. check_can_match.py: build SUBSETS of the vocabulary as check_filter.py does, three nested loops over it for the three groups, compare can_match and can_match_fast, count and print.
answer: In filter.py, after can_match, and call it in main instead of can_match:
~~~python
# The same answer, fast. A matching line needs every --all term and, if there
# are --any terms, one of them; any other term can only add forbidden text.
# So try just those lines: the --all terms with each --any term in turn.
def can_match_fast(all_terms, any_terms, none_terms):
    if not any_terms:
        return matches(b"\0".join(all_terms), all_terms, any_terms, none_terms)
    for term in any_terms:
        if matches(b"\0".join(all_terms + [term]), all_terms, any_terms, none_terms):
            return True
    return False
~~~
check_can_match.py:
~~~python
import itertools

from filter import can_match, can_match_fast

# Terms where one is inside another, so substring effects are covered.
VOCABULARY = [b"err", b"error", b"disk"]
SUBSETS = []
for size in range(len(VOCABULARY) + 1):
    for subset in itertools.combinations(VOCABULARY, size):
        SUBSETS.append(list(subset))

queries = 0
differences = 0
for all_terms in SUBSETS:
    for any_terms in SUBSETS:
        for none_terms in SUBSETS:
            queries += 1
            slow = can_match(all_terms, any_terms, none_terms)
            fast = can_match_fast(all_terms, any_terms, none_terms)
            if slow != fast:
                differences += 1
                print("differ:", all_terms, any_terms, none_terms, "brute force", slow, "fast", fast)
print(queries, "queries,", differences, "differences")
~~~
The fast column in time_can_match.py stays below a thousandth of a second at every size: it tries n lines, not 2^(2n). A tempting slip is to return True when any_terms is empty without calling matches: then --all disk --none disk is "possible" again, and the comparison finds the difference straight away.
```

```check
run "cd kit; .venv/Scripts/python check_can_match.py" stdout="512 queries, 0 differences" -- check_can_match.py should compare can_match and can_match_fast on all 512 queries.
run "cd kit; .venv/Scripts/python -c \"from filter import can_match_fast as f; print([f([b'disk'], [], [b'disk']), f([b'error'], [], [b'err']), f([], [b'disk', b'slow'], [b'disk', b'slow']), f([b'error'], [b'disk'], [b'debug']), f([], [], [])])\"" stdout="[False, False, False, True, True]" -- can_match_fast should agree with can_match, substrings included.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --none err" exit=1 stderr="no line can ever match" -- main should still refuse impossible queries.
run "cd kit; .venv/Scripts/python -c \"import time, filter; t = [('t' + str(i)).encode() for i in range(40)]; s = time.perf_counter(); r = filter.can_match_fast([], t, t); print(r, time.perf_counter() - s < 1)\"" stdout="False True" -- can_match_fast should answer a 40-term query in well under a second.
```

**What these checks establish, and what they don't.** They run your comparison, call `can_match_fast` on five queries (three impossible, two possible, one of them empty) and on one 40-term query against the clock, and check that `main` still refuses an impossible query. They don't check that `main` calls the fast version rather than the slow one, though a query with many terms will show you; that your comparison covers substrings, which depends on your vocabulary; or that your argument for the fast version is sound. The comparison is evidence about 512 queries over three terms. The argument is what covers the rest. Write it down in the comment above the function.

## What you can do now

- A **literal** is a proposition or its negation. **DNF** is an OR of AND-clauses, read off a truth table's true rows. **CNF** is an AND of OR-clauses, from its false rows. Every condition has both.
- `filter`'s query is a restricted CNF, with one OR-clause and no negations inside it. That's why it can't say (a and b) or (c and d).
- **Satisfiable** means some input makes the condition true. Brute force decides it by trying every candidate, and it's always right if it asks the real definition. But it doubles with every proposition.
- Shortcuts that treat related propositions as independent (`error` and `err`) give wrong answers. Fast methods that use the problem's real structure give right ones, and the slow search is how you check them.

```predict
question: A booking system rejects a request when "no room satisfies all the filters", and a colleague proposes checking every combination of filter settings in advance to find impossible ones. There are 30 independent yes/no filters. What's wrong with the plan, and what would you suggest?
explain: 30 yes/no filters have 2^30, about a billion, combinations, and checking each one against the rooms makes the plan far too slow to run on every change: it's the exponential search from this lesson. Use the structure instead: each filter narrows the set of rooms, so intersect the matching sets filter by filter (01-02-03's sets) and see whether anything is left. That's one pass per filter, not one per combination. Keep a brute-force check over a few filters as the reference that the fast version is tested against.
```

**Next:** module 1.3 is about numbers as bit patterns. Kit gets `hexdump`, which shows any file's bytes in hexadecimal, and Blockfall stores each board row as a single number.
