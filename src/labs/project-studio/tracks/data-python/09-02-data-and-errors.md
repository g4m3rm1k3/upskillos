---
title: 9.2 — Rows, Collections, Modules and Errors
track: Database Engineering — Application Code from the Beginning
trackOrder: 46.09
runtime: none
---

A driver returns Python values. Learn the representations before reading or changing any database rows.

## Accumulate only known values

Square brackets create a list, an ordered collection. None is Python's missing-value marker; a database NULL becomes None through the driver. for visits each list element, binding it to value. `is not None` tests absence without confusing zero with missing. The loop accumulates known numbers.

A module is a Python file that can be imported. __name__ equals "__main__" when the file is run directly. This guard avoids printing the demo when another file imports known_total. `==` compares values; `=` assigns a name.

```python file=totals.py
def known_total(values):
    total = 0
    for value in values:
        if value is not None:
            total = total + value
    return total

if __name__ == "__main__":
    print(known_total([30, None, 60]))
```

```check
run "python totals.py" exit=0 label="Preserve the known total" stdout="90" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Map field names to values

A dictionary maps keys to values: braces hold key:value pairs. `loaded["title"]` looks up one key. A tuple, such as (30,60), is an ordered immutable collection; driver rows are tuples by default. Index 0 selects its first item. `(title,)` is a one-item tuple; the comma matters.

import loads a module. `from pathlib import Path` imports one name. Path represents a file path. Dot notation selects an operation on an object; write_text writes text, read_text reads it, and encoding names the text encoding. `json.dumps` serializes Python values to JSON text; `json.loads` parses it back. JSON null becomes None. This file experiment is separate from database persistence.

```python file=record.py
import json
from pathlib import Path

record = {"title": "Login", "estimate_minutes": None}
Path("ticket.json").write_text(json.dumps(record), encoding="utf-8")
loaded = json.loads(Path("ticket.json").read_text(encoding="utf-8"))
print(loaded["title"])
```

```check
run "python record.py" exit=0 label="Round-trip a field through JSON" stdout="Login" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Handle a narrow failure

```predict
question: Should a database outage be reported as an empty query result?
choice: No
choice: Yes
answer: No
explain: No rows and failure to query are different outcomes.
```

try introduces work that can fail; except ValueError handles only that error type. `int("12")` converts text to an integer, while int("twelve") raises ValueError. Catching every exception and returning [] can hide permission errors and outages. Use an error message at the boundary; let unexpected faults surface.

`assert condition` raises AssertionError when a test expectation is false. The course's -c commands execute short test snippets; assertions are checks, not production input validation. Real validation must still work when Python optimization disables assertions.



## Your turn: count missing estimates

Write missing.py with missing_count(values), returning how many entries are None. Zero must not count as missing. Use a loop and return after the loop.


```hints
nudge: Look for identity with None.
concept: A zero-duration value exists, even though it is numerically zero.
shape: Initialize a counter, increment on is None, return after the loop.
```

```check
run "python -c \"from missing import missing_count; assert missing_count([0,None,30,None])==2; assert missing_count([])==0; print('ok')\"" exit=0 label="Distinguish missing from zero" stdout="ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
