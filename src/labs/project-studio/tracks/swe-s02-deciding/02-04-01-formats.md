---
title: "Formats: How Data Is Written Down"
runtime: python
---

Convert a bank statement from CSV to JSON and back, and you'd expect the same file. Try it with a converter that "helpfully" turns numbers into numbers, and `-4.50` comes back as `-4.5`, `-950.00` as `-950.0`, and a postcode `01234` as `1234`. Nothing crashed, every value is still a valid number, and six of the eight transactions no longer match the bank's. Data spends most of its life written down, in files and messages, and every format can say some things and not others: CSV only has text, JSON has numbers but no dates, TOML has dates but needs a table at the top, binary formats need a schema to be read at all. A conversion is safe only if every value survives the trip. This lesson lays out the formats, then builds Kit's `convert` between CSV, JSON and TOML, makes it survive the trip, and looks at the pitfalls of turning data into bytes and back.

**By the end you can:**

- Say what JSON, YAML, TOML, CSV, XML and the common binary formats (Protocol Buffers, Avro, Parquet, MessagePack) can represent, and what each is for.
- Tell text from binary formats, and say what each costs.
- Convert data without changing it, and test that with round trips.
- Recognize the classic serialization pitfalls: float round-trips, large integers, `pickle` running code.
- Explain canonical forms, and produce one.

**You need:** 02-03-01 (`diff.py`), 01-07-02 (RFC 4180, `parse_csv`), 01-06-04 (Ruff). Commands run inside `kit`.

## One record, many ways

Here's one transaction, written in five text formats:

| Format | The transaction |
|---|---|
| **CSV** | `2026-11-07,COFFEE CORNER,-4.50` (after a header line `date,description,amount`) |
| **JSON** | `{"date": "2026-11-07", "description": "COFFEE CORNER", "amount": "-4.50"}` |
| **YAML** | `date: 2026-11-07` / `description: COFFEE CORNER` / `amount: "-4.50"`, one per line |
| **TOML** | `[[rows]]` / `date = 2026-11-07` / `description = "COFFEE CORNER"` / `amount = "-4.50"` |
| **XML** | `<transaction date="2026-11-07"><description>COFFEE CORNER</description><amount>-4.50</amount></transaction>` |

They look interchangeable, and they aren't, because each has a different set of things it can say:

| Format | Types it has | Good for | Watch out for |
|---|---|---|---|
| **CSV** | Text only | Tables, spreadsheets, exports | No types, no nesting, many dialects (01-07-02) |
| **JSON** | Text, numbers, true/false, null, lists, objects | Messages between programs, APIs | No dates; numbers' precision depends on the reader |
| **YAML** | JSON's, plus dates and more, guessed from how values look | Hand-written configuration | Guessing: in YAML 1.1, `no` is false and `1:30` a number of seconds |
| **TOML** | Text, numbers, booleans, dates and times, arrays, tables | Configuration (`pyproject.toml`) | The top must be a table, not a list |
| **XML** | Text, with elements, attributes and namespaces | Documents, older enterprise systems | Verbose; elements vs attributes is a choice every time |

And four **binary** formats, which write values as bytes rather than characters (01-01-01, 01-03-03):

| Format | What it is | Good for |
|---|---|---|
| **MessagePack** | JSON's types as compact bytes | The same data as JSON, smaller and faster |
| **Protocol Buffers** | Messages described by a schema file, fields numbered | Messages between services that must evolve (02-04-03) |
| **Avro** | Records with a schema stored alongside the data | Streams and files of records whose schema changes |
| **Parquet** | Tables stored column by column, compressed | Analysing millions of rows a few columns at a time |

**Text formats** can be read and edited with any editor, diffed by Git and debugged by eye; they're bigger and slower to parse, and numbers pass through decimal text. **Binary formats** are compact and fast, and need a program (and, for Protocol Buffers and Avro, the schema) to read at all. Choose text until size or speed is a measured problem, or the data is far too big to look at anyway.

```predict
question: In YAML 1.1, a list of country codes written as - GB, - FR, - NO is read as what?
choice: Three strings
choice: Two strings and false
choice: An error
answer: Two strings and false
explain: YAML 1.1 reads no, yes, on and off, unquoted, as booleans, so Norway's code NO becomes false. YAML 1.2 dropped most of that guessing, but many libraries still default to 1.1 rules. The general lesson: a format that guesses types from how values look will one day guess wrong, so quote anything that must stay text, or use a format that doesn't guess.
```

## convert, first try

Kit's `convert` reads a table from one format and writes it in another, choosing both from the file names. A table in memory is a list of records, each a dictionary from column name to value. This first version also does what many converters do: values that look like numbers become numbers, so the JSON has real numbers in it. Create `convert.py`:

```python file=kit/convert.py
import json
import re
import sys
import tomllib

from csvtool import parse_csv
from kitargs import fail, help_if_asked

USAGE = "IN OUT  (each .csv, .json or .toml)"

# A table in any of the three formats becomes one thing in memory: a list of
# records, each a dict from column name to value. Values that look like
# numbers become numbers, so that the JSON and TOML have real numbers in them.


def kind_of(name):
    kind = name.rsplit(".", 1)[-1].lower()
    if kind not in READERS:
        fail(f"{name}: can't tell the format; use a name ending .csv, .json or .toml")
    return kind


# Every record must have as many fields as the header: zip would silently
# drop the extra ones, or leave columns out.
def read_csv(name, text):
    rows = parse_csv(text)
    if not rows:
        return []
    header = rows[0]
    for number, row in enumerate(rows[1:], start=1):
        if len(row) != len(header):
            fail(f"{name}: record {number} has {len(row)} fields; the header has {len(header)}")
    return [{key: guess(value) for key, value in zip(header, row)} for row in rows[1:]]


# "12" becomes 12 and "-4.50" becomes -4.5; anything else stays text.
def guess(value):
    for number in (int, float):
        try:
            return number(value)
        except ValueError:
            pass
    return value


def read_json(name, text):
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        fail(f"{name}: not JSON: {error}")


# A TOML file can't be a list at the top, so a table is an array of tables
# called rows: each [[rows]] heading starts a record.
def read_toml(name, text):
    try:
        return tomllib.loads(text).get("rows", [])
    except tomllib.TOMLDecodeError as error:
        fail(f"{name}: not TOML: {error}")


def write_csv(table):
    header = list(table[0]) if table else []
    lines = [",".join(csv_field(name) for name in header)]
    lines += [",".join(csv_field(record[name]) for name in header) for record in table]
    return "".join(line + "\r\n" for line in lines)


# RFC 4180 (01-07-02): quote a field that holds a comma, a quote or a line
# break, and double any quotes inside it.
def csv_field(value):
    value = str(value)
    if any(c in value for c in ',"\r\n'):
        return '"' + value.replace('"', '""') + '"'
    return value


def write_json(table):
    return json.dumps(table, indent=2, ensure_ascii=False) + "\n"


# Each record as a [[rows]] table of key = "value" lines. json.dumps writes
# a string with the escapes TOML's basic strings use, except DEL (U+007F),
# which TOML forbids raw and JSON leaves as it is.
def write_toml(table):
    lines = []
    for record in table:
        lines.append("[[rows]]")
        for key, value in record.items():
            lines.append(f"{toml_key(key)} = {toml_string(value)}")
        lines.append("")
    return "\n".join(lines)


def toml_key(key):
    return key if re.fullmatch(r"[A-Za-z0-9_-]+", key) else toml_string(key)


def toml_string(value):
    return json.dumps(value, ensure_ascii=False).replace("\x7f", "\\u007f")


READERS = {"csv": read_csv, "json": read_json, "toml": read_toml}
WRITERS = {"csv": write_csv, "json": write_json, "toml": write_toml}


# The shape every format must give: a list of records, each with the same
# column names, and every value text or a number.
def table_problem(table):
    if not isinstance(table, list):
        return "expected a list of records"
    for number, record in enumerate(table, start=1):
        if not isinstance(record, dict):
            return f"record {number} isn't a set of named values"
        if set(record) != set(table[0]):
            return f"record {number} has columns {sorted(record)}, not {sorted(table[0])}"
        for key, value in record.items():
            if not isinstance(value, (str, int, float)):
                return f"record {number}: {key} is {json.dumps(value)}, not text or a number"
    return None


def main():
    help_if_asked(sys.argv[1:], USAGE)
    if len(sys.argv) != 3:
        fail("expected IN and OUT; usage: " + USAGE)
    source, target = sys.argv[1], sys.argv[2]
    kind_in, kind_out = kind_of(source), kind_of(target)
    try:
        with open(source, encoding="utf-8", newline="") as file:
            text = file.read()
    except OSError as error:
        fail(source + ": " + error.strerror)
    table = READERS[kind_in](source, text)
    problem = table_problem(table)
    if problem:
        fail(f"{source}: {problem}")
    with open(target, "w", encoding="utf-8", newline="") as file:
        file.write(WRITERS[kind_out](table))
    print(f"{len(table)} records from {source} to {target}")


if __name__ == "__main__":
    main()
```

The program is a set of small readers and writers, picked from two dictionaries by the files' extensions: a function as a value (01-05-03), looked up by key (02-03-02). `read_csv` uses Kit's own `parse_csv`, and refuses a record with more or fewer fields than the header, since `zip` would quietly drop the extras. `write_csv` follows RFC 4180, quoting a field with a comma, quote or line break. TOML needs a table at the top, so a list of records is written as an **array of tables**, each record under a `[[rows]]` heading. `table_problem` checks the shape every reader must produce. `guess` is the helpful part: it tries `int`, then `float`, and leaves the value as text only if both fail.

Save it, and convert November's statement to JSON and back to CSV:

```
.venv/bin/python convert.py samples/november.csv nov.json
.venv/bin/python convert.py nov.json nov-back.csv
.venv/bin/python diff.py samples/november.csv nov-back.csv
```

(On Windows, `.venv/Scripts/python`.)

```predict
question: How many of November's 8 transactions come back from the round trip exactly as they were?
answer: 2
explain: Every amount was turned into a float on the way in, and a float has no trailing zeros: -950.00 is -950.0, -4.50 is -4.5. Written back, they're different text. Only -39.99 and -61.05, which have no trailing zero to lose, come back the same. The dates and descriptions survive because int() and float() both refuse them.
```

```
< 2026-11-01,RENT,-950.00
< 2026-11-02,MARKET,-64.20
< 2026-11-07,COFFEE CORNER,-4.50
< 2026-11-07,COFFEE CORNER,-4.50
< 2026-11-12,POWER CO,-71.30
< 2026-11-20,PIZZA PLACE,-18.80
> 2026-11-01,RENT,-950.0
> 2026-11-02,MARKET,-64.2
> 2026-11-07,COFFEE CORNER,-4.5
> 2026-11-07,COFFEE CORNER,-4.5
> 2026-11-12,POWER CO,-71.3
> 2026-11-20,PIZZA PLACE,-18.8
6 only in samples/november.csv, 6 only in nov-back.csv, 2 in both
```

Read the evidence. Six transactions differ, and only in their amounts: `-950.00` became `-950.0`, `-4.50` became `-4.5`. Look inside `nov.json` and the cause is there, `"amount": -950.0`: the number has no idea it was money with two decimal places. Nothing is wrong with each step on its own: `float("-4.50")` is `-4.5`, and `-4.5` is written as `-4.5`. The information was lost by the guess. And these are only the visible losses: a postcode `01234` would come back as `1234`, a long account number as a rounded float, and a product code `1E5` as `100000.0`.

Delete the two files:

```
rm nov.json nov-back.csv
```

```check
run "cd kit; .venv/Scripts/python -c \"import json, os, subprocess, sys, tempfile; d = tempfile.mkdtemp(); j, c = os.path.join(d, 'n.json'), os.path.join(d, 'n.csv'); subprocess.run([sys.executable, 'convert.py', 'samples/november.csv', j], check=True, capture_output=True); print(json.load(open(j, encoding='utf-8'))[0]['amount'])\"" stdout="-950.0" -- This first convert.py should turn the amounts into numbers: -950.00 becomes -950.0 in the JSON.
missing kit/nov.json -- Delete nov.json and nov-back.csv after the experiment.
```

## Text stays text

The fix is to stop guessing. A converter's job is to move values from one notation to another without changing them; deciding that `-4.50` is an amount of money, and what to do with it, belongs to the program that knows what the data means (02-04-02 does exactly that for Ledger's imports). Replace `convert.py` with:

```python file=kit/convert.py
import json
import re
import sys
import tomllib

from csvtool import parse_csv
from kitargs import fail, help_if_asked

USAGE = "IN OUT  (each .csv, .json or .toml)"

# A table in any of the three formats becomes one thing in memory: a list of
# records, each a dict from column name to text. Every value stays text:
# whether "-4.50" is a number, or "01234" isn't, is for the program that uses
# the data to decide, not for the converter to guess.


def kind_of(name):
    kind = name.rsplit(".", 1)[-1].lower()
    if kind not in READERS:
        fail(f"{name}: can't tell the format; use a name ending .csv, .json or .toml")
    return kind


# Every record must have as many fields as the header: zip would silently
# drop the extra ones, or leave columns out.
def read_csv(name, text):
    rows = parse_csv(text)
    if not rows:
        return []
    header = rows[0]
    for number, row in enumerate(rows[1:], start=1):
        if len(row) != len(header):
            fail(f"{name}: record {number} has {len(row)} fields; the header has {len(header)}")
    return [dict(zip(header, row)) for row in rows[1:]]


def read_json(name, text):
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        fail(f"{name}: not JSON: {error}")


# A TOML file can't be a list at the top, so a table is an array of tables
# called rows: each [[rows]] heading starts a record.
def read_toml(name, text):
    try:
        return tomllib.loads(text).get("rows", [])
    except tomllib.TOMLDecodeError as error:
        fail(f"{name}: not TOML: {error}")


def write_csv(table):
    header = list(table[0]) if table else []
    lines = [",".join(csv_field(name) for name in header)]
    lines += [",".join(csv_field(record[name]) for name in header) for record in table]
    return "".join(line + "\r\n" for line in lines)


# RFC 4180 (01-07-02): quote a field that holds a comma, a quote or a line
# break, and double any quotes inside it.
def csv_field(value):
    if any(c in value for c in ',"\r\n'):
        return '"' + value.replace('"', '""') + '"'
    return value


def write_json(table):
    return json.dumps(table, indent=2, ensure_ascii=False) + "\n"


# Each record as a [[rows]] table of key = "value" lines. json.dumps writes
# a string with the escapes TOML's basic strings use, except DEL (U+007F),
# which TOML forbids raw and JSON leaves as it is.
def write_toml(table):
    lines = []
    for record in table:
        lines.append("[[rows]]")
        for key, value in record.items():
            lines.append(f"{toml_key(key)} = {toml_string(value)}")
        lines.append("")
    return "\n".join(lines)


def toml_key(key):
    return key if re.fullmatch(r"[A-Za-z0-9_-]+", key) else toml_string(key)


def toml_string(value):
    return json.dumps(value, ensure_ascii=False).replace("\x7f", "\\u007f")


READERS = {"csv": read_csv, "json": read_json, "toml": read_toml}
WRITERS = {"csv": write_csv, "json": write_json, "toml": write_toml}


# The shape every format must give: a list of records, each with the same
# column names, and every value text.
def table_problem(table):
    if not isinstance(table, list):
        return "expected a list of records"
    for number, record in enumerate(table, start=1):
        if not isinstance(record, dict):
            return f"record {number} isn't a set of named values"
        if set(record) != set(table[0]):
            return f"record {number} has columns {sorted(record)}, not {sorted(table[0])}"
        for key, value in record.items():
            if not isinstance(value, str):
                return f"record {number}: {key} is {json.dumps(value)}, not text"
    return None


def main():
    help_if_asked(sys.argv[1:], USAGE)
    if len(sys.argv) != 3:
        fail("expected IN and OUT; usage: " + USAGE)
    source, target = sys.argv[1], sys.argv[2]
    kind_in, kind_out = kind_of(source), kind_of(target)
    try:
        with open(source, encoding="utf-8", newline="") as file:
            text = file.read()
    except OSError as error:
        fail(source + ": " + error.strerror)
    table = READERS[kind_in](source, text)
    problem = table_problem(table)
    if problem:
        fail(f"{source}: {problem}")
    with open(target, "w", encoding="utf-8", newline="") as file:
        file.write(WRITERS[kind_out](table))
    print(f"{len(table)} records from {source} to {target}")


if __name__ == "__main__":
    main()
```

Three things changed: `guess` is gone, `read_csv` builds each record with `dict(zip(header, row))`, and `table_problem` now requires every value to be text, so a JSON or TOML file that does contain a number is refused with a message saying which record and column, rather than converted into something else. The comment at the top states the rule. Save it, and take the statement around all three formats:

```
.venv/bin/python convert.py samples/november.csv nov.json
.venv/bin/python convert.py nov.json nov.toml
.venv/bin/python convert.py nov.toml nov-back.csv
.venv/bin/python diff.py samples/november.csv nov-back.csv
```

```
0 only in samples/november.csv, 0 only in nov-back.csv, 8 in both
```

The beginning of `nov.toml` shows the array of tables:

```
[[rows]]
date = "2026-11-01"
description = "RENT"
amount = "-950.00"
```

Even the bytes are identical: CSV → JSON → TOML → CSV gives back the file it started from. Delete the three files:

```
rm nov.json nov.toml nov-back.csv
```

```check
run "cd kit; .venv/Scripts/python -c \"import filecmp, os, subprocess, sys, tempfile; d = tempfile.mkdtemp(); names = [os.path.join(d, n) for n in ['n.json', 'n.toml', 'n.csv']]; src = ['samples/november.csv'] + names[:2]; [subprocess.run([sys.executable, 'convert.py', a, b], check=True, capture_output=True) for a, b in zip(src, names)]; print(filecmp.cmp('samples/november.csv', names[2], shallow=False))\"" stdout="True" -- CSV to JSON to TOML and back to CSV should give back the same bytes.
run "cd kit; .venv/Scripts/python -c \"import json, os, subprocess, sys, tempfile; p = os.path.join(tempfile.mkdtemp(), 'n.json'); open(p, 'w').write(json.dumps([{'a': 2}])); r = subprocess.run([sys.executable, 'convert.py', p, p + '.csv'], capture_output=True, text=True); print(r.returncode, 'not text' in r.stderr)\"" stdout="1 True" -- A JSON file with a number in it should be refused with a message, not converted.
missing kit/nov.toml -- Delete nov.json, nov.toml and nov-back.csv.
```

## What the linter noticed

Before committing, run Kit's linter on the new file, as the pre-commit hook will:

```
.venv/bin/python -m ruff check convert.py
```

```
I001 [*] Import block is un-sorted or un-formatted
 --> convert.py:1:1
```

The imports look sorted. The detail Ruff shows is the clue: it wants a blank line before `import tomllib`, as if `tomllib` weren't part of Python. Ruff decides what's in the standard library from the oldest Python the project says it supports, and Kit's `pyproject.toml` says `requires-python = ">=3.10"`. `tomllib` was added in Python 3.11. So the linter is right, about something more important than ordering: on Python 3.10, which Kit claims to support, `convert.py` would fail with `ModuleNotFoundError`. A tool's complaint about formatting turned out to be a compatibility bug.

Fix the claim, not the imports. In `pyproject.toml`, change that line to:

```
requires-python = ">=3.11"
```

and run Ruff again: `All checks passed!`.

```check
run "cd kit; .venv/Scripts/python -c \"import tomllib; print(tomllib.load(open('pyproject.toml', 'rb'))['project']['requires-python'])\"" stdout=">=3.11" -- pyproject.toml should say Kit needs Python 3.11 or later, since convert.py uses tomllib.
run "cd kit; .venv/Scripts/python -m ruff check convert.py" stdout="All checks passed!" -- Ruff should accept convert.py.
```

## Tests for convert

A round trip is a property (02-03-01): for any table, writing it and reading it back gives the same table. Test it with values chosen to break careless converters. Create `tests/test_convert.py`:

```python file=kit/tests/test_convert.py
import itertools

import pytest

from convert import READERS, WRITERS

# Values that break careless converters: a comma, quotes, a line break, a
# letter outside ASCII, a leading zero, an empty field, and DEL.
TRICKY = [
    {"name": "Zoë", "note": 'said "hi", then left', "code": "01234"},
    {"name": "", "note": "two\nlines", "code": "\x7f"},
]
FORMATS = ["csv", "json", "toml"]


@pytest.mark.parametrize("kind", FORMATS)
def test_a_table_survives_a_round_trip(kind):
    text = WRITERS[kind](TRICKY)
    assert READERS[kind]("test." + kind, text) == TRICKY


@pytest.mark.parametrize(("first", "second"), list(itertools.permutations(FORMATS, 2)))
def test_converting_through_another_format_changes_nothing(first, second):
    there = READERS[first]("a." + first, WRITERS[first](TRICKY))
    back = READERS[second]("b." + second, WRITERS[second](there))
    assert back == TRICKY
```

`TRICKY` holds a comma and quotes (CSV must quote them), a line break (CSV must quote it; JSON and TOML must escape it), a letter outside ASCII, a leading zero, an empty value, and `"\x7f"`, the DEL character: JSON, written with `ensure_ascii=False`, leaves it as it is, and TOML forbids it unescaped, which is why `toml_string` replaces it with `\u007f`. The first test takes each format there and back; the second goes through every ordered pair of formats (`itertools.permutations`), six in all. Save it, run it, and commit:

```
.venv/bin/python -m pytest -q tests/test_convert.py
git add convert.py pyproject.toml tests/test_convert.py
git commit -m "Add convert between CSV, JSON and TOML, keeping every value as text"
```

`9 passed`. (Take the `.replace("\x7f", "\\u007f")` out of `toml_string` and run the tests again, if you'd like to see what it's for: five of them fail with `TOMLDecodeError: Illegal character '\x7f'`. Put it back before committing.)

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_convert.py" stdout="9 passed" -- The nine round-trip tests should pass.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:convert.py').returncode == 0, '>=3.11' in git('show', 'HEAD:pyproject.toml').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit convert.py, pyproject.toml and the tests.
```

## Pitfalls

Three classic ways serialization goes wrong, each in one line.

**Floats don't round-trip through decimal text the way people expect.** A float is binary (stage 5), and most decimal fractions have no exact binary form:

```
.venv/bin/python -c "print(0.1 + 0.2, 0.1 + 0.2 == 0.3, repr(float('-4.50')))"
```

```
0.30000000000000004 False -4.5
```

That's why Ledger keeps money in whole cents (02-01-01), and why `convert` leaves amounts as text.

**Large integers depend on the reader.** JSON's specification doesn't limit numbers; programs do. Python reads integers exactly. JavaScript reads every JSON number as a 64-bit float, exact only up to 2⁵³:

```
.venv/bin/python -c "import json; print(json.loads('9007199254740993'))"
node -e "console.log(JSON.parse('9007199254740993'))"
```

Python prints `9007199254740993`; JavaScript prints `9007199254740992`. (If you don't have Node.js, the browser console gives the same answer to `JSON.parse('9007199254740993')`.) The same JSON means two different numbers in two languages, which is why APIs send large ids, such as order numbers, as strings.

**Some formats run code when they're read.** Python's `pickle` can store almost any object, because loading it can call any function the data names. Here's a harmless one that calls `print`:

```
.venv/bin/python -c "import pickle; data = pickle.dumps(type('P', (), {'__reduce__': lambda self: (print, ('this ran while loading',))})()); print(len(data), 'bytes'); pickle.loads(data)"
```

```
62 bytes
this ran while loading
```

`__reduce__` tells `pickle` how to rebuild an object: "call this function with these arguments". Loading those 62 bytes called `print`; other bytes could call anything, such as deleting files or starting a program. Python's documentation warns that `pickle` is not secure, and to unpickle only data you trust. Never load pickled data from a user, a network or a file you didn't make. JSON, CSV and TOML readers only ever build plain values.

```check
run "cd kit; .venv/Scripts/python -c \"import json; print(json.loads('9007199254740993'), 0.1 + 0.2 == 0.3)\"" stdout="9007199254740993 False" -- Python reads the large integer exactly, and 0.1 + 0.2 isn't 0.3.
```

## Canonical forms

Two JSON texts can hold the same data and still be different bytes: keys in another order, other spacing.

```
.venv/bin/python -c "import json; a = json.dumps({'b': '2', 'a': '1'}); b = json.dumps({'a': '1', 'b': '2'}, separators=(',', ':')); print(a, b, json.loads(a) == json.loads(b), a == b)"
```

```
{"b": "2", "a": "1"} {"a":"1","b":"2"} True False
```

Equal as data, different as text. That matters whenever something compares bytes: Git's diffs, a hash that identifies the data (01-08-01's blob ids), a signature, a cache key, a test that compares files. A **canonical form** is one agreed way of writing each value, so equal data always gives equal bytes: for JSON, keys sorted, no optional spaces, one fixed way to write strings and numbers (RFC 8785, the JSON Canonicalization Scheme, defines one exactly). `json.dumps(…, sort_keys=True, separators=(",", ":"))` gets most of the way; this lesson's task uses it.

**What else, and why not.** You could let each program pick its own representation and compare data only after parsing: that works inside one program, but Git, hashes and caches compare bytes. You could use a binary format with a schema (Protocol Buffers), which settles types once, for every reader; that's the right choice between services you control, and 02-04-03 looks at how such schemas evolve. You could convert with a spreadsheet: it's the most common way data loses leading zeros, long numbers and dates.

## Your turn: one way to write it

Add `--canonical` to `convert.py`: with it, the output must be a `.json` file (stop with a message and status 1 otherwise), written in a canonical form: keys sorted, no spaces after `,` or `:`, non-ASCII letters as themselves, records in their original order, and one newline at the end. The same table should then always give the same bytes, whatever format it came from and whatever order its keys were in. Without `--canonical`, nothing changes. Commit `convert.py`.

```hints
nudge: Which of json.dumps's arguments decide the key order and the spacing? And where does --canonical have to be taken out of the arguments, so it isn't mistaken for a file name?
concept: sort_keys=True fixes key order; separators=(",", ":") removes the spaces; ensure_ascii=False writes letters as themselves. The records' order is data (it's the order of the statement), so it stays. kitargs.take_flag removes the flag before the IN and OUT names are read.
shape: def write_canonical_json(table): return json.dumps(table, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n". In main: canonical, args = take_flag(sys.argv[1:], "--canonical"); source, target = args; if canonical and kind_out != "json": fail(...); then write one or the other.
answer: In convert.py, import take_flag, and add after write_json:
~~~python
# One way to write each table: keys sorted, no spaces, text as itself, one
# newline at the end. The same data always gives the same bytes, so two files
# can be compared, or hashed, byte for byte.
def write_canonical_json(table):
    return json.dumps(table, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n"
~~~
In main:
~~~python
    canonical, args = take_flag(sys.argv[1:], "--canonical")
    if len(args) != 2:
        fail("expected IN and OUT; usage: " + USAGE)
    source, target = args
    kind_in, kind_out = kind_of(source), kind_of(target)
    if canonical and kind_out != "json":
        fail("--canonical writes JSON: give an OUT ending .json")
~~~
and when writing:
~~~python
        file.write(write_canonical_json(table) if canonical else WRITERS[kind_out](table))
~~~
Update USAGE to mention [--canonical]. Then git add convert.py and git commit -m "Add canonical JSON output to convert". The tempting slip is leaving out sort_keys: the output is compact, but a TOML file with its keys in another order still gives different bytes.
```

```check
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sys, tempfile; d = tempfile.mkdtemp(); out = os.path.join(d, 'a.json'); subprocess.run([sys.executable, 'convert.py', 'samples/november.csv', out, '--canonical'], check=True, capture_output=True); t = open(out, encoding='utf-8', newline='').read(); q = chr(34); print(t.startswith('[{' + q + 'amount' + q + ':' + q + '-950.00' + q + ',' + q + 'date' + q + ':'), ': ' not in t)\"" stdout="True True" -- --canonical should write compact JSON with the keys sorted.
run "cd kit; .venv/Scripts/python -c \"import json, os, subprocess, sys, tempfile; from convert import READERS; d = tempfile.mkdtemp(); rows = READERS['csv']('n.csv', open('samples/november.csv', encoding='utf-8', newline='').read()); rev = os.path.join(d, 'rev.json'); json.dump([dict(reversed(list(r.items()))) for r in rows], open(rev, 'w', encoding='utf-8')); a, b = os.path.join(d, 'a.json'), os.path.join(d, 'b.json'); [subprocess.run([sys.executable, 'convert.py', s, t, '--canonical'], check=True, capture_output=True) for s, t in [('samples/november.csv', a), (rev, b)]]; print(open(a, 'rb').read() == open(b, 'rb').read(), open(a, 'rb').read().endswith(b'}]' + bytes([10])))\"" stdout="True True" -- The same table with its keys in another order should give the same bytes, ending in one newline.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sys, tempfile; d = tempfile.mkdtemp(); r = subprocess.run([sys.executable, 'convert.py', 'samples/november.csv', os.path.join(d, 'x.csv'), '--canonical'], capture_output=True, text=True); print(r.returncode)\"" stdout="1" -- --canonical with an OUT that isn't .json should stop with status 1.
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_convert.py" stdout="9 passed" -- Without --canonical, convert should behave as before.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('--canonical' in git('show', 'HEAD:convert.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit convert.py.
```

**What these checks establish, and what they don't.** They check that guessing changes the amounts, that the text-only converter gives back the same bytes through all three formats and refuses values that aren't text, that Kit now claims the Python version it needs, that the round trips hold for awkward values, and that canonical output is the same bytes for the same data. They can't check that a format suits a purpose: that a configuration file people edit by hand should be TOML rather than JSON, or that a service's messages need a schema. And "the same data" assumes you agree on what the data is: whether `-4.50` and `-4.5` are the same amount is a question the converter, rightly, refuses to answer.

## What you can do now

- Each **format** can say different things: CSV only text, JSON no dates, YAML guesses, TOML needs a table at the top, XML is a tree of elements and attributes. **Binary** formats (MessagePack, Protocol Buffers, Avro, Parquet) trade readability for size and speed, and some need a schema to read.
- A **converter** must not **guess types**; a guess that turns `-4.50` into `-4.5` loses information silently. Decide types where the meaning is known.
- **Round trips** are the test of a conversion, and a property test with awkward values is the way to run them.
- **Floats** don't hold most decimals exactly; **large integers** change in readers that use floats; **pickle** runs code while loading, so never load untrusted pickles.
- A **canonical form** makes equal data equal bytes, which hashes, diffs, caches and signatures depend on.
- A linter's complaint can be a symptom: read what it actually objects to.

```predict
question: A team stores user settings as Python pickles in a database, and lets an admin page upload settings files. What's the risk, and what would you store instead?
explain: Anyone who can upload a settings file can make the server run any code when it's loaded, since unpickling calls whatever the data names: a remote code execution hole, reachable from an admin page. Store settings as JSON or TOML, which load only plain values, and validate them on the way in (02-04-02). If the settings need types JSON lacks, such as dates, convert them explicitly in code.
```

**Next:** 02-04-02 is about the boundary where outside data comes in. Schema languages, validation at the boundary, "parse, don't validate", nullability, enums versus strings, units, and identifiers. Ledger gets the bank-statement import that `IMPORT.md` promised: it rejects bad rows, says why, and never counts a month twice.
