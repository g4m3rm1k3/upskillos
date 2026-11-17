---
title: "Estimating Scale: Numbers Before Architecture"
runtime: python
---

"Will it scale?" is usually asked without a number, and answered with an architecture: a database server, a cache, a queue, "just in case". A design for two people and a design for two million are different designs, and building the second when you have the first is as expensive a mistake as the reverse. The way out is arithmetic, done before building and checked against measurements: how many users, how much data, how many reads and writes, how fast it grows, and what the slowest operation costs at that size. This lesson makes that arithmetic a program for Ledger, finds the size at which Ledger's simple design stops meeting its own spec, checks the estimate against a real measurement (and finds it was three times too pessimistic, and that the decision didn't change), and then asks the same question of Kit: when must a tool read its input a piece at a time, instead of loading it whole?

**By the end you can:**

- Estimate users, data volume, request rates and growth from written-down assumptions.
- Do back-of-envelope arithmetic with units, and sanity-check the result.
- Recall the orders of magnitude of latency and storage that decide designs.
- Tell peaks from averages, and reads from writes, and say when scale changes a design.
- Check an estimate with measurements at more than one size.

**You need:** 02-01-02 (`estimate.py`), 02-02-03 (`timing.py`, access patterns), 02-09-01 (`layers.py`), 01-01-04 (streaming, `tracemalloc`). Commands run inside `ledger`, then inside `kit`.

## A number for every adjective

Every vague word in a design discussion hides a number. "Lots of users" is ten, or ten thousand. "Big data" is a gigabyte, or a petabyte. Each number comes from a few others multiplied together, and writing that multiplication down makes the assumptions visible, so they can be argued with: users × actions each per day = requests per day; rows per day × days × bytes per row = storage.

```predict
question: Ledger's rows are about 29.4 bytes each, and this household makes about 7,300 transactions in ten years. About how much storage is that?
choice: About 200 bytes
choice: About 200 kilobytes
choice: About 200 megabytes
answer: About 200 kilobytes
explain: 7,300 × 29.4 is about 215,000 bytes: 215 KB, or 0.2 MB. Doing the arithmetic in the units, bytes then dividing by a thousand per step, is the way to catch the commonest estimating mistake, which is being right about the digits and wrong by a factor of a thousand.
```

## Ten years, and beyond

Make the arithmetic a program, so every assumption is in one place and every scenario is computed the same way. Create `scale.py`:

```python file=ledger/scale.py
# Back-of-envelope estimates for Ledger at three sizes, each from assumptions
# written down. Two numbers are measured; the rest are guesses, and the point
# is to see which guesses matter.
BYTES_PER_ROW = 29.4  # measured by estimate.py (02-02-02)
SECONDS_PER_ROW = 0.05 / 7200  # measured by timing.py (02-02-03): a report at ten years
REPORT_LIMIT = 1  # seconds: SPEC.md's N1

SCENARIOS = [
    # name, people, transactions a person makes a day, years, reports a day
    ("this household", 2, 1, 10, 3),
    ("a big family, 30 years", 5, 2, 30, 10),
    ("a small business", 50, 4, 10, 500),
]

if __name__ == "__main__":
    for name, people, per_day, years, reports in SCENARIOS:
        writes = people * per_day
        rows = writes * 365 * years
        megabytes = rows * BYTES_PER_ROW / 1_000_000
        seconds = rows * SECONDS_PER_ROW
        verdict = "meets N1" if seconds <= REPORT_LIMIT else "breaks N1"
        print(f"{name:23} {rows:>8,} rows {megabytes:6.1f} MB  a report {seconds:5.2f} s, {verdict};"
              f" {reports} reads to {writes} writes a day")
```

Two numbers are measured: bytes per row (02-02-02) and the time a report takes per row, from `timing.py`'s ten-year run (02-02-03). The rest are guesses: how many people, how many transactions each makes a day, how many years, how often someone looks at a report. Three scenarios: this household; a big family over thirty years; and a small business, fifty staff using a Ledger-like tool. `REPORT_LIMIT` is SPEC.md's N1, so each scenario is judged against the spec. `scale.py` is a new module, so `layers.py` (02-09-01) will report it until it's placed: add a row to `MODULES.md`'s Layers table:

```
| scale.py | tool | Estimating Ledger at other sizes |
```

Save both, and run it:

```
.venv/bin/python scale.py
```

(On Windows, `.venv/Scripts/python`.)

```
this household             7,300 rows    0.2 MB  a report  0.05 s, meets N1; 3 reads to 2 writes a day
a big family, 30 years   109,500 rows    3.2 MB  a report  0.76 s, meets N1; 10 reads to 10 writes a day
a small business         730,000 rows   21.5 MB  a report  5.07 s, breaks N1; 500 reads to 200 writes a day
```

Read the numbers, not just the verdicts. Storage never matters here: 21.5 MB for the business is less than a phone photo album. Speed matters: the business's report takes five seconds, because every report reads every transaction (`DATA.md`'s design: derive everything, store nothing). **Scale changes a design** at exactly that point, and not before: for this household and the big family, deriving is fine; for the business, the reports need an index by month, or stored monthly totals kept as a cache (02-02-03), or a database to do the adding. Notice the reads-to-writes ratio as well: the business reads more than twice as often as it writes, which is what makes a cache worth its cost.

```check
run "cd ledger; .venv/Scripts/python scale.py" stdout="a small business         730,000 rows" -- scale.py should estimate the small business at 730,000 rows.
run "cd ledger; .venv/Scripts/python scale.py" stdout="breaks N1" -- At that size, a report should break SPEC.md's N1.
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 22 modules" -- scale.py should be placed in MODULES.md as a tool.
```

## Checking an estimate

An estimate built on one measurement is only as good as that measurement. Check it at a second size. `timing.py` always makes 7,200 rows; let it take a number. Replace `timing.py` with:

```python file=ledger/timing.py
import csv
import os
import shutil
import sys
import tempfile
import time

import reports

# Made-up transactions, 7,200 (ten years) unless another number is given, in
# a temporary copy of data/, to see how long deriving the totals takes.
rows = int(sys.argv[1]) if len(sys.argv) > 1 else 7200
folder = tempfile.mkdtemp()
shutil.copytree("data", folder, dirs_exist_ok=True)
with open(os.path.join(folder, "transactions.csv"), "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["id", "date", "account_id", "category_id", "cents", "note", "status"])
    for i in range(1, rows + 1):
        writer.writerow([i, "2026-11-01", i % 2 + 1, i % 5 + 1, 1000 + i % 5000, "", "cleared"])

start = time.perf_counter()
totals = reports.spent_by("who", folder)
print(f"{rows} rows: {sum(totals.values())} cents, derived in {time.perf_counter() - start:.3f} s")
```

The only change: `rows` comes from the command line, with 7,200 as the default, and the output says how many rows were timed. (The `status` column is 02-07-02's.) Save it, and time two sizes, each twice:

```
.venv/bin/python timing.py 7200
.venv/bin/python timing.py 146000
```

```predict
question: scale.py's model says a report costs the same per row at any size, using 02-02-03's measurement (0.05 s for 7,200 rows). What does it predict for 146,000 rows, 20 times as many?
answer: 1.01
explain: 146,000 × (0.05 / 7,200) is about 1.01 seconds. Whether that's right depends on two things the single measurement can't tell apart: a fixed cost paid once per report (starting up, reading the small tables), and the cost per row. Run it and see.
```

```
7200 rows: 22118600 cents, derived in 0.024 s
7200 rows: 22118600 cents, derived in 0.024 s
146000 rows: 508928000 cents, derived in 0.368 s
146000 rows: 508928000 cents, derived in 0.374 s
```

Two surprises. The 7,200-row report now takes about 0.025 s, half 02-02-03's 0.05: one measurement on a busy machine is a sample, not a constant. And 146,000 rows take about 0.38 s, not the 1.01 predicted: the estimate was nearly three times too pessimistic.

```check
run "cd ledger; .venv/Scripts/python timing.py 20000" stdout="20000 rows:" -- timing.py should time the number of rows it's given.
```

## A line through two points

Fix the model with both measurements: a **straight line** through two points separates the fixed cost, paid once per report, from the cost per row. Replace `scale.py` with:

```python file=ledger/scale.py
# Back-of-envelope estimates for Ledger at three sizes, each from assumptions
# written down. Three numbers are measured; the rest are guesses, and the
# point is to see which guesses matter.
BYTES_PER_ROW = 29.4  # measured by estimate.py (02-02-02)
# Two measurements with timing.py on the machine this was written on
# (2026-11-16): 7,200 rows in 0.025 s, 146,000 in 0.38 s. A straight line
# through them gives a fixed cost and a cost per row.
SMALL, BIG = (7_200, 0.025), (146_000, 0.38)
PER_ROW = (BIG[1] - SMALL[1]) / (BIG[0] - SMALL[0])
FIXED = SMALL[1] - SMALL[0] * PER_ROW
REPORT_LIMIT = 1  # seconds: SPEC.md's N1

SCENARIOS = [
    # name, people, transactions a person makes a day, years, reports a day
    ("this household", 2, 1, 10, 3),
    ("a big family, 30 years", 5, 2, 30, 10),
    ("a small business", 50, 4, 10, 500),
]

if __name__ == "__main__":
    for name, people, per_day, years, reports in SCENARIOS:
        writes = people * per_day
        rows = writes * 365 * years
        megabytes = rows * BYTES_PER_ROW / 1_000_000
        seconds = FIXED + rows * PER_ROW
        verdict = "meets N1" if seconds <= REPORT_LIMIT else "breaks N1"
        print(f"{name:23} {rows:>8,} rows {megabytes:6.1f} MB  a report {seconds:5.2f} s, {verdict};"
              f" {reports} reads to {writes} writes a day")
```

`PER_ROW` is the slope between the two measurements; `FIXED` is what's left at the small size. Your own machine will give other numbers: put yours in. Run it:

```
.venv/bin/python scale.py
```

```
this household             7,300 rows    0.2 MB  a report  0.03 s, meets N1; 3 reads to 2 writes a day
a big family, 30 years   109,500 rows    3.2 MB  a report  0.29 s, meets N1; 10 reads to 10 writes a day
a small business         730,000 rows   21.5 MB  a report  1.87 s, breaks N1; 500 reads to 200 writes a day
```

The business's report is now 1.87 s instead of 5.07 s: still breaks N1. That's the lesson about estimates: they're for **decisions**, not predictions. An estimate that's off by a factor of three is a good estimate if the decision is the same either way. When it isn't (an estimate of 0.8 s against a limit of 1 s), that's when to build a prototype and measure at the real size. Commit:

```
git add scale.py timing.py MODULES.md
git commit -m "Estimate Ledger at three sizes, checked against two measurements"
```

```check
run "cd ledger; .venv/Scripts/python -c \"import scale; print(round(scale.PER_ROW * 1e6, 2), round(scale.FIXED, 4) >= 0)\"" stdout="True" -- scale.py should compute a cost per row and a fixed cost from two measurements.
run "cd ledger; .venv/Scripts/python scale.py" stdout="breaks N1" -- With the corrected model, the small business should still break N1.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('PER_ROW' in git('show', 'HEAD:scale.py').stdout, 'sys.argv' in git('show', 'HEAD:timing.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit scale.py, timing.py and MODULES.md.
```

## Orders of magnitude

Some numbers are worth knowing roughly, because they decide designs before any measurement. These are orders of magnitude, true within a factor of a few on ordinary hardware, and they shift a little every few years:

| Operation | Roughly |
|---|---|
| Read a value already in memory | 100 nanoseconds |
| Read 1 MB from memory | 10 to 100 microseconds |
| Read a small block from an SSD | 100 microseconds |
| A network round trip within one data centre | 0.5 milliseconds |
| Read 1 MB from an SSD | 1 millisecond |
| A disk seek (spinning disk) | 10 milliseconds |
| A network round trip across a continent | 50 to 150 milliseconds |

| Size | Roughly |
|---|---|
| A transaction row | 30 bytes |
| A page of text | 2 KB |
| A phone photo | 3 MB |
| A computer's memory | 8 to 64 GB |
| A laptop's SSD | 0.5 to 2 TB |

Two rules come straight out of the first table: work in memory is thousands of times faster than work over a network, so a design that makes a hundred network calls to draw one page is slow however fast each server is; and a person notices a delay above about a tenth of a second, so anything a person waits for must fit in that budget, or show progress. Out of the second: Ledger's whole ten years fit in memory a hundred thousand times over.

**Peaks** matter more than **averages**. Ledger's imports happen once a month: the average is near zero, and the peak is a whole statement at once. A shop that sells 10,000 orders a day averages one every 9 seconds, and on a sale's first hour sees fifty times that; it must be built for the hour, not the day.

```predict
question: A web page makes 30 requests to a server across the continent, one after another, each a round trip of 100 ms. Roughly how long before the page has everything?
explain: 30 × 100 ms = 3 seconds, before any server does any work: the round trips alone. The fix isn't a faster server; it's fewer round trips (one request that returns everything), or making them at the same time, or a server nearer the people. The latency table decides the design.
```

## Load whole, or stream?

Kit's tools face the same question about memory. `count.py` streams its input, a piece at a time (01-01-04); `uniq.py`, `diff.py`, `union.py`, `join.py` and `convert.py` read the whole file first. How much memory does loading whole really cost? Inside `kit`, create `csv_memory.py`:

```python file=kit/csv_memory.py
import csv
import os
import tempfile
import tracemalloc

from uniq import read_records

# How much memory does loading a CSV file whole take, compared with the
# file's own size, and compared with reading it one record at a time?
path = os.path.join(tempfile.mkdtemp(), "big.csv")
with open(path, "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["date", "description", "amount"])
    for i in range(100_000):
        writer.writerow([f"2026-11-{i % 28 + 1:02d}", f"SHOP {i % 500}", f"-{i % 90}.{i % 100:02d}"])
size = os.path.getsize(path)

tracemalloc.start()
header, records = read_records(path)
whole = tracemalloc.get_traced_memory()[1]
tracemalloc.stop()

tracemalloc.start()
with open(path, newline="", encoding="utf-8") as file:
    streamed_count = sum(1 for _ in csv.reader(file)) - 1
streamed = tracemalloc.get_traced_memory()[1]
tracemalloc.stop()

print(f"the file: {size / 1e6:.1f} MB, {len(records)} records")
print(f"loaded whole: {whole / 1e6:.0f} MB at the peak, {whole / size:.0f} times the file")
print(f"streamed: {streamed / 1e6:.2f} MB at the peak, {streamed_count} records")
```

It writes 100,000 made-up records to a temporary file, then measures, with `tracemalloc` (01-01-04), the peak memory of two ways of reading it: `uniq.py`'s `read_records`, which holds every record, and a loop over `csv.reader` that holds one at a time. Save it and run it, from inside `kit`:

```
.venv/bin/python csv_memory.py
```

```
the file: 2.8 MB, 100000 records
loaded whole: 33 MB at the peak, 12 times the file
streamed: 0.17 MB at the peak, 100000 records
```

Loading whole takes about twelve times the file's size: every record becomes a tuple of Python strings, each with its own overhead. Streaming takes the same small amount however big the file. That gives a rule with a number in it: a tool that loads its input whole can handle files up to about a twelfth of the memory it may use, so for a computer with 8 GB, a few hundred megabytes at most, and much less in practice. Kit's whole-file tools are fine for statements and exports; given a 2 GB log, they would fail where `count.py` wouldn't. Some tools can't stream entirely: `uniq` must remember every distinct record it has seen, so its memory grows with the number of *distinct* records, not the file's size; `join` must hold one side. Knowing which kind a tool is, and writing it down, is part of its contract. Commit, in `kit` (the hook runs Ruff and the tests):

```
git add csv_memory.py
git commit -m "Measure the memory of loading a CSV file whole against streaming it"
```

```check
run "cd kit; .venv/Scripts/python csv_memory.py" stdout="100000 records" -- csv_memory.py should measure a file of 100,000 records.
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys, re; out = subprocess.run([sys.executable, 'csv_memory.py'], capture_output=True, text=True).stdout; times = int(re.search(r'([0-9]+) times the file', out).group(1)); print(times >= 3, 'streamed' in out)\"" stdout="True True" -- Loading whole should take several times the file's size.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:csv_memory.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit csv_memory.py in kit.
```

**What else, and why not.** You could skip estimating and build for the largest scale you can imagine: that's the most common way small projects drown in infrastructure they never needed. You could skip estimating and wait to see: fine for a desktop app with one household, and dangerous for anything where the fix is a redesign under load. You could estimate with a spreadsheet instead of a program: just as good, as long as the assumptions are written next to the numbers and the measurements are dated.

## Your turn: counting without loading

Write `rows.py` in `kit`: `rows.py FILE [--sum COLUMN]` counts a CSV file's records and, with `--sum`, totals a column of whole numbers, **streaming**: one record in memory at a time, using `csv.reader` over the open file. Put the work in a function, `count_rows(path, column=None)`, returning `(records, total)`. An unknown column is refused with a message naming the columns, and exit status 1. From inside `kit`, `rows.py ../ledger/data/transactions.csv --sum cents` should print `10 records, cents total 136689`: Kit reading Ledger's data, with no idea what Ledger is. Commit `rows.py`.

```hints
nudge: What has to be remembered between one record and the next to count them and add up a column? Only two numbers. So nothing else should be kept.
concept: csv.reader yields one record at a time from the open file, so the loop holds one record and two running totals. next(reader, None) reads the header (None for an empty file). The memory is then the same for ten records or ten million, which tracemalloc can show: the peak barely moves when the file grows twentyfold.
shape: def count_rows(path, column=None): with open(path, newline="", encoding="utf-8") as file: reader = csv.reader(file); header = next(reader, None); if header is None: return 0, 0; check the column; index = header.index(column) if column else None; records = total = 0; for row in reader: records += 1; if index is not None: total += int(row[index]); return records, total. main: take_option for --sum, fail on errors, print the result.
answer: rows.py:
~~~python
import csv
import sys

from kitargs import fail, help_if_asked, take_option

USAGE = "FILE [--sum COLUMN]"


# A CSV file's records, counted one at a time, and the total of one column of
# whole numbers if a column is named. Only one record is in memory at once,
# so a file of any size takes the same memory.
def count_rows(path, column=None):
    with open(path, newline="", encoding="utf-8") as file:
        reader = csv.reader(file)
        header = next(reader, None)
        if header is None:
            return 0, 0
        if column is not None and column not in header:
            raise ValueError(f"no column {column}; the columns are: {', '.join(header)}")
        index = header.index(column) if column is not None else None
        records = total = 0
        for row in reader:
            records += 1
            if index is not None:
                total += int(row[index])
    return records, total


def main():
    help_if_asked(sys.argv[1:], USAGE)
    column, args = take_option(sys.argv[1:], "--sum")
    if len(args) != 1:
        fail("expected one FILE; usage: " + USAGE)
    try:
        records, total = count_rows(args[0], column)
    except OSError as error:
        fail(args[0] + ": " + error.strerror)
    except ValueError as error:
        fail(f"{args[0]}: {error}")
    print(f"{records} records" + (f", {column} total {total}" if column else ""))


if __name__ == "__main__":
    main()
~~~
Then git add rows.py and git commit -m "Count and total a CSV file's records without loading it". The tempting slip is len(read_records(path)[1]): the right count, and the whole file in memory.
```

```check
run "cd kit; .venv/Scripts/python rows.py ../ledger/data/transactions.csv --sum cents" stdout="10 records, cents total 136689" -- rows.py should count Ledger's transactions and total their cents.
run "cd kit; .venv/Scripts/python rows.py samples/november.csv" stdout="8 records" -- Without --sum, rows.py should just count.
run "cd kit; .venv/Scripts/python rows.py samples/november.csv --sum nope" exit=1 stderr="no column nope" -- An unknown column should be refused, naming the columns.
run "cd kit; .venv/Scripts/python -c \"import os, pathlib, tempfile, tracemalloc; from rows import count_rows; d = tempfile.mkdtemp(); paths = [os.path.join(d, str(n) + '.csv') for n in (10000, 200000)]; [pathlib.Path(q).write_text('n' + chr(10) + chr(10).join(map(str, range(n))) + chr(10)) for q, n in zip(paths, (10000, 200000))]; peak = lambda q: (tracemalloc.start(), count_rows(q, 'n'), tracemalloc.get_traced_memory()[1], tracemalloc.stop())[2]; small, big = peak(paths[0]), peak(paths[1]); print(count_rows(paths[1], 'n') == (200000, 19999900000), big < 1000000, big < 2 * small + 100000)\"" stdout="True True True" -- On 200,000 records, count_rows should be right, and use about the same memory as on 10,000.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:rows.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit rows.py in kit.
```

**What these checks establish, and what they don't.** They check that `scale.py` computes the three scenarios and its two-point model, that `timing.py` times any size, that the sketch places every module, that loading whole costs several times a file's size, and that `rows.py` counts and totals correctly with memory that doesn't grow with the file. They don't check the timings themselves, which belong to your machine and its mood, and they can't check your assumptions: whether the business really makes four transactions per person a day. That's the point of writing them in one place, where someone who knows can change them and run the estimate again.

## What you can do now

- Turn every vague size into a **number**: users × actions, rows × bytes, per day × days; write the **assumptions** next to it.
- Do the arithmetic **in units**, and sanity-check the factor of a thousand.
- Know the **orders of magnitude**: memory in nanoseconds, SSDs in microseconds, networks in milliseconds; a person notices a tenth of a second.
- Design for the **peak**, not the average; a high **read-to-write ratio** is what makes caching pay.
- **Scale changes the design** at a threshold you can compute: find it, and don't build past it.
- **Check estimates** at two sizes: a line separates fixed from per-unit costs. An estimate is good if the decision survives its error.
- A tool that **loads whole** needs memory many times its input; a tool that **streams** needs the same at any size. Say which in its contract.

**Next:** 02-11-01 looks at text, which is harder than it seems: code points and graphemes, UTF-8 and UTF-16, normalization, sorting and case. Kit's `count` learns to count the characters a person sees, not the bytes or code points a computer stores.
