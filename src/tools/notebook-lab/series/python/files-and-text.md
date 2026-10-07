# Files and text data

Every program so far has forgotten everything the moment it finished. Its variables live in the computer's memory, and when the program stops, they are gone. To keep information between runs, or to work with data that came from somewhere else, programs read and write **files**. Nearly all real-world data arrives as a file of some kind: a spreadsheet exported as text, a log from a web server, a list of measurements from an instrument, settings saved by an app.

This lesson covers opening, reading and writing text files; the `with` statement that makes sure files are closed properly; and the two text formats you will meet most often, **CSV** for tables and **JSON** for nested data.

## Where files live in this notebook

On your own computer, Python reads and writes files on the hard drive. This notebook's Python runs inside your browser tab, so it has its own small **virtual file system**, kept in memory. Files you create here behave exactly like real files for the rest of this session, but they disappear when you reload the page. To work with a file from your own computer, click **Upload data** at the top of the notebook; the file then appears in the `uploads` folder. Everything in this lesson works the same way on a normal computer.

## Writing a file

To use a file you first **open** it with the built-in `open` function. It takes the file's name (its **path**) and a **mode** saying what you want to do: `"w"` to write, `"r"` to read, `"a"` to append.

```python type
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("First line\n")
    f.write("Second line\n")
    f.write("Third line\n")
print("Written.")
```

```output
Written.
```

`open` returns a **file object**, here named `f`, and its `write` method adds text to the file. Note that `write` does not add a new line at the end the way `print` does; you have to include `\n` yourself.

`encoding="utf-8"` says how the text's characters are turned into the bytes a file stores. UTF-8 handles every language and symbol and is the standard almost everywhere, so pass it every time; without it, some computers use a different default, and accented letters or emoji can come out garbled.

Opening a file in `"w"` mode creates it if it does not exist, and **erases it** if it does. That is worth remembering before you open an important file for writing.

## The with statement

The `with` line is the recommended way to open a file. When the indented block ends, Python **closes** the file automatically. Closing matters: until a file is closed, some of what you wrote may still be waiting in memory rather than saved, and a program that opens files without closing them can eventually run out of them.

The important part is that `with` closes the file even if an exception happens inside the block. It does the same job as a `try` with a `finally` clause, from lesson 14, but you cannot forget it. You will see `with` used for other things that need tidying up afterwards too, but files are by far the most common.

## Reading a file

Open the file in `"r"` mode, which is also the default. The simplest way to read it is `read()`, which gives you the whole file as one string:

```python type
with open("notes.txt", encoding="utf-8") as f:
    content = f.read()
print(repr(content))
print(content.splitlines())
```

```output
'First line\nSecond line\nThird line\n'
['First line', 'Second line', 'Third line']
```

`repr` shows the `\n` characters that separate the lines. `splitlines()` splits the text into a list of lines, without the new-line characters.

For larger files, loop over the file object itself. It gives you one line at a time, so even a file far bigger than your computer's memory can be processed:

```python type
with open("notes.txt", encoding="utf-8") as f:
    for number, line in enumerate(f, start=1):
        line = line.rstrip("\n")
        print(number, line)
```

```output
1 First line
2 Second line
3 Third line
```

Each line comes with its `\n` still on the end, so almost every line-reading loop starts by removing it. `rstrip("\n")` removes it from the right-hand end only; plain `strip()` would also remove spaces at both ends, which is usually what you want for data but not always.

## When the file is not there

Opening a file that does not exist for reading raises a `FileNotFoundError`:

```python error FileNotFoundError
with open("missing.txt", encoding="utf-8") as f:
    print(f.read())
```

The message includes the path Python looked for, which is often the fastest way to spot a typo in a file name. When a missing file is a normal situation, such as a settings file that has not been created yet, catch the exception:

```python type
try:
    with open("settings.txt", encoding="utf-8") as f:
        settings = f.read()
except FileNotFoundError:
    settings = "defaults"
print(settings)
```

```output
defaults
```

## Adding to a file

Mode `"a"` (append) opens a file for writing **without** erasing it: new text goes on the end. This is how log files are written.

```python type
with open("log.txt", "w", encoding="utf-8") as f:
    f.write("started\n")
for event in ["loaded data", "trained model", "finished"]:
    with open("log.txt", "a", encoding="utf-8") as f:
        f.write(event + "\n")
with open("log.txt", encoding="utf-8") as f:
    print(f.read())
```

```output
started
loaded data
trained model
finished
```

`print` can also write to a file, which saves adding `\n` yourself: `print("text", file=f)`.

## Tables as text: CSV

The most common format for tables of data is **CSV**, "comma-separated values". Each line is one row, and the values in a row are separated by commas. The first line usually holds the column names, called the **header**.

```python type
with open("scores.csv", "w", encoding="utf-8") as f:
    f.write("name,subject,score\n")
    f.write("Ada,maths,91\n")
    f.write("Alan,maths,78\n")
    f.write("Ada,physics,85\n")
print(open("scores.csv", encoding="utf-8").read())
```

```output
name,subject,score
Ada,maths,91
Alan,maths,78
Ada,physics,85
```

(That last line opens the file without `with`, which is fine for a quick look in a notebook, but in a real program use `with` so the file is closed.)

You can read a simple CSV file with what you already know: split each line at the commas, and convert the numbers. Everything read from a file is text, so `"91"` must become `int("91")` before you can do arithmetic with it.

```python type
totals = {}
with open("scores.csv", encoding="utf-8") as f:
    header = f.readline()
    for line in f:
        name, subject, score = line.strip().split(",")
        totals[name] = totals.get(name, 0) + int(score)
print(totals)
```

```output
{'Ada': 176, 'Alan': 78}
```

`f.readline()` reads just one line, which here takes the header out of the way before the loop starts; the loop then continues from the second line.

Splitting at commas breaks as soon as a value itself contains a comma, like the name `"Lovelace, Ada"`. The CSV format handles that by putting such values in quotation marks, and the `csv` module in the standard library understands all the rules. Its `DictReader` also uses the header, giving each row as a dictionary keyed by column name:

```python type
import csv

with open("people.csv", "w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["name", "city"])
    writer.writerow(["Lovelace, Ada", "London"])
    writer.writerow(["Hopper, Grace", "New York"])

with open("people.csv", encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        print(row["name"], "lives in", row["city"])
```

```output
Lovelace, Ada lives in London
Hopper, Grace lives in New York
```

`csv.writer` added the quotation marks around the names automatically, and `DictReader` removed them again. (The `newline=""` argument is what the `csv` module's documentation asks for when opening CSV files; it lets the module handle line endings itself.) For any real CSV file, use the `csv` module rather than splitting by hand. In the Machine Learning series you will use `pandas`, which reads a CSV file into a table in one line.

## Nested data as text: JSON

CSV suits flat tables, but a lot of data is nested: a record containing a list, containing more records. **JSON** ("JavaScript Object Notation") is the standard text format for this, used by nearly every web service. It looks almost exactly like Python's dictionaries and lists, and the `json` module converts between the two.

```python type
import json

settings = {"theme": "dark", "volume": 7, "recent": ["intro.txt", "notes.txt"], "fullscreen": False}
with open("settings.json", "w", encoding="utf-8") as f:
    json.dump(settings, f, indent=2)

with open("settings.json", encoding="utf-8") as f:
    loaded = json.load(f)
print(loaded["recent"][0])
print(loaded == settings)
print(json.dumps(settings))
```

```output
intro.txt
True
{"theme": "dark", "volume": 7, "recent": ["intro.txt", "notes.txt"], "fullscreen": false}
```

`json.dump` writes a Python value to a file as JSON, and `json.load` reads it back into dictionaries and lists. The loaded data is equal to the original. `indent=2` spreads the file over several lines so a person can read it. `json.dumps` (with an `s`, for "string") gives the JSON as a string instead of writing a file. The last line shows the small differences from Python: JSON writes `false` where Python writes `False`, always uses double quotes, and has no tuples or sets.

## Paths and the pathlib module

The `pathlib` module gives you `Path` objects, which make common file jobs short:

```python type
from pathlib import Path

p = Path("notes.txt")
print(p.exists(), p.suffix, p.stem)
print(p.read_text(encoding="utf-8").splitlines()[0])
Path("hello.txt").write_text("hi there\n", encoding="utf-8")
print(sorted(path.name for path in Path(".").glob("*.txt")))
```

```output
True .txt notes
First line
['hello.txt', 'log.txt', 'notes.txt']
```

`read_text` and `write_text` open, read or write, and close a file in a single call. `exists()` checks whether a file is there. `glob("*.txt")` finds every file whose name matches a pattern, where `*` stands for "any characters", so the list shows the text files the cells above have created (it depends on which cells you have run). `Path(".")` means the current folder.

::: challenge Line by line [easy]
Write two functions:

- `write_lines(path, lines)` writes each string in `lines` to the file at `path`, one per line.
- `count_nonblank(path)` returns how many lines in the file at `path` contain something other than spaces.

After `write_lines("todo.txt", ["buy milk", "", "  ", "call Ada"])`, `count_nonblank("todo.txt")` returns 2.

```python starter
def write_lines(path, lines):
    return None

def count_nonblank(path):
    return 0

write_lines("todo.txt", ["buy milk", "", "  ", "call Ada"])
print(count_nonblank("todo.txt"))
```

```python solution
def write_lines(path, lines):
    with open(path, "w", encoding="utf-8") as f:
        for line in lines:
            f.write(line + "\n")

def count_nonblank(path):
    count = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                count += 1
    return count

write_lines("todo.txt", ["buy milk", "", "  ", "call Ada"])
print(count_nonblank("todo.txt"))
```

```python test
assert "write_lines" in dir() and "count_nonblank" in dir(), "Keep the names write_lines and count_nonblank."
write_lines("_check.txt", ["alpha", "beta", "", "gamma"])
with open("_check.txt", encoding="utf-8") as _f:
    _text = _f.read()
assert _text.splitlines() == ["alpha", "beta", "", "gamma"], f"The file should contain the four lines alpha, beta, (blank), gamma, but it contains {_text!r}. Did you add a new line after each one?"
assert count_nonblank("_check.txt") == 3, f"count_nonblank should find 3 non-blank lines, but returned {count_nonblank('_check.txt')!r}."
write_lines("_check.txt", ["only"])
assert count_nonblank("_check.txt") == 1, "Writing to an existing file should replace its contents, so only 1 line should remain."
write_lines("_check.txt", [])
assert count_nonblank("_check.txt") == 0, "An empty list should produce an empty file with 0 non-blank lines."
"SUCCESS: Written with with, read line by line."
```

Hint: Open with `"w"` in `write_lines` and write each line followed by `"\n"`. In `count_nonblank`, loop over the file and count a line if `line.strip()` is not empty; an empty string counts as false.
:::

::: challenge Sales report [medium]
Write a function `total_sales(path)` that reads a CSV file with the header `product,quantity,price` and returns the total value of all sales (quantity times price, added up), rounded to 2 decimal places. Use the `csv` module.

```python starter
def total_sales(path):
    return 0

with open("sales.csv", "w", encoding="utf-8") as f:
    f.write("product,quantity,price\n")
    f.write("pen,10,0.5\n")
    f.write("notebook,2,3.25\n")
print(total_sales("sales.csv"))
```

```python solution
import csv

def total_sales(path):
    total = 0
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            total += int(row["quantity"]) * float(row["price"])
    return round(total, 2)

with open("sales.csv", "w", encoding="utf-8") as f:
    f.write("product,quantity,price\n")
    f.write("pen,10,0.5\n")
    f.write("notebook,2,3.25\n")
print(total_sales("sales.csv"))
```

```python test
import csv as _csv
assert "total_sales" in dir(), "Keep the function's name as total_sales."
def _make(_rows):
    with open("_sales.csv", "w", encoding="utf-8", newline="") as _f:
        _w = _csv.writer(_f)
        _w.writerow(["product", "quantity", "price"])
        for _r in _rows:
            _w.writerow(_r)
for _rows, _want in [
    ([["pen", 10, 0.5], ["notebook", 2, 3.25]], 11.5),
    ([], 0),
    ([["desk, oak", 1, 120.0], ["lamp", 3, 19.99]], 179.97),
]:
    _make(_rows)
    _got = total_sales("_sales.csv")
    assert _got == _want, f"For the rows {_rows} the total should be {_want}, but total_sales returned {_got!r}. (A product name can contain a comma, which is why the csv module matters.)"
"SUCCESS: The csv module read every row correctly, even with a comma inside a name."
```

Hint: Use `csv.DictReader` so each row is a dictionary keyed by the header. Everything read from a file is text, so convert the quantity with `int` and the price with `float` before multiplying.
:::

::: challenge High scores [medium]
Write a function `record_score(path, name, score)` that keeps a high-score table in a JSON file. It should:

1. load the table (a dictionary of name to best score) from the file at `path`, or start with an empty dictionary if the file does not exist yet;
2. store `score` for `name` if that name has no score yet, or if `score` is higher than their current best;
3. save the table back to the file as JSON, and return it.

```python starter
def record_score(path, name, score):
    return {}

print(record_score("scores.json", "Ada", 50))
print(record_score("scores.json", "Ada", 40))
print(record_score("scores.json", "Alan", 70))
```

```python solution
import json

def record_score(path, name, score):
    try:
        with open(path, encoding="utf-8") as f:
            table = json.load(f)
    except FileNotFoundError:
        table = {}
    if name not in table or score > table[name]:
        table[name] = score
    with open(path, "w", encoding="utf-8") as f:
        json.dump(table, f)
    return table

print(record_score("scores.json", "Ada", 50))
print(record_score("scores.json", "Ada", 40))
print(record_score("scores.json", "Alan", 70))
```

```python test
import json as _json, os as _os
assert "record_score" in dir(), "Keep the function's name as record_score."
if _os.path.exists("_hs.json"):
    _os.remove("_hs.json")
assert record_score("_hs.json", "Ada", 50) == {"Ada": 50}, "The first score for a new file should give {'Ada': 50}. Start with an empty table when the file does not exist."
assert record_score("_hs.json", "Ada", 40) == {"Ada": 50}, "A lower score should not replace Ada's best of 50."
assert record_score("_hs.json", "Alan", 70) == {"Ada": 50, "Alan": 70}, "A new player should be added."
assert record_score("_hs.json", "Ada", 90) == {"Ada": 90, "Alan": 70}, "A higher score should replace Ada's best."
with open("_hs.json", encoding="utf-8") as _f:
    assert _json.load(_f) == {"Ada": 90, "Alan": 70}, "The file itself should hold the updated table as JSON."
"SUCCESS: Your table survives between calls because it lives in a file."
```

Hint: Wrap the loading in `try` / `except FileNotFoundError:` and use an empty dictionary in the `except` block. Check `name not in table or score > table[name]` before storing. Then write the table with `json.dump`.
:::

## What you learned

- `open(path, mode, encoding="utf-8")` opens a file; modes are `"r"` (read), `"w"` (write, erasing) and `"a"` (append). Always pass the encoding.
- `with open(...) as f:` closes the file automatically, even after an exception.
- `f.read()` reads everything; looping over `f` reads line by line (strip the `\n`); `f.readline()` reads one line. `f.write(text)` does not add a new line.
- A missing file raises `FileNotFoundError`, which you can catch when it is expected.
- CSV stores tables as lines of comma-separated values. Use the `csv` module (`csv.DictReader` to read, `csv.writer` to write), and convert text to numbers yourself.
- JSON stores nested dictionaries and lists; `json.dump`/`json.load` write and read files, and `json.dumps` makes a string.
- `pathlib.Path` offers `exists`, `read_text`, `write_text` and `glob`.
- In this notebook, files live in memory until the page reloads; use **Upload data** to bring in your own.

You have used many kinds of object: strings with their methods, lists, dictionaries, file objects. Next you will learn to design your own kinds of object with classes, which bundle data together with the functions that work on it.
