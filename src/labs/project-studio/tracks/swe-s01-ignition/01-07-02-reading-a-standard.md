---
title: Reading a Standard: CSV from RFC 4180
runtime: python
---

CSV, "comma-separated values", looks like the simplest file format there is: one record per line, commas between the fields. Every spreadsheet can save it, and almost every program that reads it was written in five minutes with `line.split(",")`. Then a name contains a comma, or a note contains a line break, and the five-minute reader quietly splits one record into two and shifts every column after it. What CSV *is*, exactly, is written down in a short document: **RFC 4180**. This lesson reads it, the way you'd read any standard, and builds Kit's `csv` tool from it rule by rule. Then it checks the result against the standard's own examples and against a second implementation, and finds the one place where Python's own `csv` module and the standard disagree.

**By the end you can:**

- Find your way around an RFC: its status, its numbered rules, its MUST and SHOULD, and its grammar.
- Read a small ABNF grammar and turn it into code.
- Write a CSV reader that handles quoted commas, doubled quotes and line breaks inside quotes, and explain why splitting on commas can't.
- Test an implementation against a standard's examples and against a second implementation, and judge which to believe when they disagree.

**You need:** 01-01-04 (state machines with `start`/`feed`/`finish`), 01-06-03 (regular expressions: why not here, too), Kit installed as a package (01-06-05). Commands run inside `kit`.

## A file that commas can't split

This script writes a small CSV file with the cases that make CSV hard: a header line, a name with a comma in it, a note with quotation marks in it, a note with a line break in it, and an empty last field. It writes the bytes itself (01-06-02: a shell's redirect would re-encode them), with the line ending RFC 4180 specifies: CRLF, `\r\n`.

```python file=kit/make_people.py
# A small CSV file with every case RFC 4180 describes: a header, quoted
# fields, a comma and a doubled quote inside quotes, a line break inside
# quotes, an empty last field, and CRLF line breaks.
RECORDS = [
    'name,city,note',
    'Ada,London,first row',
    '"Smith, Sam",Leeds,"said ""hello"" twice"',
    'Lee,"Paris",plain',
    '"Kim","Oslo","line one\r\nline two"',
    'Max,Rome,',
]
with open("samples/people.csv", "wb") as file:
    file.write(("\r\n".join(RECORDS) + "\r\n").encode("utf-8"))
print("wrote samples/people.csv")
```

Save it and run `.venv/bin/python make_people.py` (Windows: `.venv\Scripts\python make_people.py`); then look at the bytes with `.venv/bin/python hexdump.py samples/people.csv`. Each record ends `0d 0a`, and one record, Kim's, has a `0d 0a` *inside* its quotes.

```check
run "cd kit; .venv/Scripts/python make_people.py" stdout="wrote samples/people.csv" -- make_people.py should write samples/people.csv.
run "cd kit; .venv/Scripts/python hexdump.py samples/people.csv" stdout="00000000  6e 61 6d 65 2c 63 69 74 79 2c 6e 6f 74 65 0d 0a" -- The header line ends with CRLF, 0d 0a.
```

## A first attempt

The five-minute reader: split the text into lines, and each line at every comma. It prints each record as a JSON list (01-01-02's `json.dumps`), so you can see exactly where each field starts and ends. One new detail: `open(…, newline="")` turns off Python's translation of line endings when reading text, so that `\r\n` arrives as it is in the file. (Without it, Python would turn every `\r\n` into `\n`, including the one inside Kim's quotes.)

```python file=kit/csvtool.py
import json
import sys


# A first attempt: one record per line, and a new field at every comma.
def parse_csv(text):
    rows = []
    for line in text.splitlines():
        rows.append(line.split(","))
    return rows


def main():
    with open(sys.argv[1], encoding="utf-8", newline="") as file:
        rows = parse_csv(file.read())
    for row in rows:
        print(json.dumps(row))


if __name__ == "__main__":
    main()
```

```predict
question: How many records will this reader print for people.csv? The file has a header and five people, one of them with a line break inside a quoted note.
choice: 6
choice: 7
choice: 5
answer: 7
explain: splitlines treats every line break as the end of a record, including the one inside Kim's quoted note, so Kim's record becomes two: one ending in "line one and one starting with line two". A header and five records is six; the split makes seven. A reader has to know about quotes to know which line breaks end records.
```

Save it and run `.venv/bin/python csvtool.py samples/people.csv`:

```
["name", "city", "note"]
["Ada", "London", "first row"]
["\"Smith", " Sam\"", "Leeds", "\"said \"\"hello\"\" twice\""]
["Lee", "\"Paris\"", "plain"]
["\"Kim\"", "\"Oslo\"", "\"line one"]
["line two\""]
["Max", "Rome", ""]
```

Read the evidence. Smith's record has four fields, because the comma in `"Smith, Sam"` split it, and every column after it is shifted one place to the right. The quotation marks that mark a field as quoted have been kept as if they were part of the data. And Kim's record has become two records. Only Ada and Max, the records without quotes, came out right. No error anywhere: a program reading this would put Leeds in the note column and carry on.

```check
run "cd kit; .venv/Scripts/python csvtool.py samples/people.csv" stdout="[\"\\\"Smith\", \" Sam\\\"\", \"Leeds\"" -- The naive reader splits the quoted name at its comma.
```

## Reading an RFC

An **RFC** ("Request for Comments") is a document in the series that defines how the internet works: HTTP, email, URLs, TCP and UTF-8 are all RFCs. They're numbered, never changed once published (a correction gets a new number), and free to read at rfc-editor.org. RFC 4180, "Common Format and MIME Type for Comma-Separated Values (CSV) Files", from October 2005, is eight pages long. Four things to look for in any RFC:

**Its status.** Near the top: "Category: Informational", and "This memo provides information for the Internet community. It does not specify an Internet standard of any kind." CSV existed for decades before anyone wrote it down, and RFC 4180 records the common format rather than commanding one. Programs differ from it (it says so itself: "some programs, such as Microsoft Excel, do not use double quotes at all"). It's still the best shared definition there is.

**Its key words.** Most RFCs use MUST, SHOULD and MAY in the exact senses defined by RFC 2119: MUST is required, SHOULD is expected unless you have a good reason, MAY is optional. RFC 4180 writes them in lower case ("should be enclosed", "must be escaped"), but reads the same way.

**Its rules.** Section 2, "Definition of the CSV Format", has seven, each with an example:

1. "Each record is located on a separate line, delimited by a line break (CRLF)."
2. "The last record in the file may or may not have an ending line break."
3. "There maybe an optional header line appearing as the first line of the file with the same format as normal record lines."
4. "Within the header and each record, there may be one or more fields, separated by commas. … Spaces are considered part of a field and should not be ignored."
5. "Each field may or may not be enclosed in double quotes … If fields are not enclosed with double quotes, then double quotes may not appear inside the fields."
6. "Fields containing line breaks (CRLF), double quotes, and commas should be enclosed in double-quotes."
7. "If double-quotes are used to enclose fields, then a double-quote appearing inside a field must be escaped by preceding it with another double quote." Its example: `"aaa","b""bb","ccc"`.

Rule 6 is the one the five-minute reader breaks: inside quotes, a comma or a line break is data. Rule 7 says how a quote gets inside quotes: doubled, so `"said ""hello"" twice"` is the text `said "hello" twice`.

**Its grammar.** The rules in English leave questions; the grammar answers them. RFC 4180 gives one in **ABNF** (Augmented Backus–Naur Form, RFC 5234), the standard notation for the shape of text in RFCs. Each line defines a name. `/` means "or", `*` "any number of", `[…]` "optional", `(…)` groups, and `%x2C` is the character with code `0x2C` (a comma: 01-03-01's hex):

```
file = [header CRLF] record *(CRLF record) [CRLF]
record = field *(COMMA field)
field = (escaped / non-escaped)
escaped = DQUOTE *(TEXTDATA / COMMA / CR / LF / 2DQUOTE) DQUOTE
non-escaped = *TEXTDATA
TEXTDATA = %x20-21 / %x23-2B / %x2D-7E
```

Read `escaped` aloud: a quote, then any number of ordinary characters, commas, CRs, LFs or *pairs* of quotes, then a closing quote. That one line is rules 5, 6 and 7 together. `non-escaped` is any number of `TEXTDATA` characters, which excludes the quote (`%x22`) and the comma (`%x2C`). And notice the edge: `TEXTDATA` is printable ASCII only, so by the letter of the grammar, `é` isn't allowed in a CSV file at all. Real CSV files are full of UTF-8, and every real reader accepts it. That's a place where you follow practice, knowingly, and say so.

```predict
question: By the grammar, is a record with an empty field at the end, such as Max,Rome, (with a comma and nothing after it), allowed?
choice: Yes: record = field *(COMMA field), and a non-escaped field can be empty
choice: No: rule 4 says the last field must not be followed by a comma
answer: Yes: record = field *(COMMA field), and a non-escaped field can be empty
explain: non-escaped = *TEXTDATA, and * allows zero characters, so a field can be empty. Max,Rome, is three fields: "Max", "Rome" and "". Rule 4's "the last field in the record must not be followed by a comma" means you mustn't end a record with a comma that has no field after it, and here there is one, empty. This is the kind of question where the grammar settles what the English leaves open.
```

## A reader built from the grammar

The grammar's `escaped` field can't be found by splitting, because whether a comma ends a field depends on everything before it: are we inside quotes? That's exactly what a **state machine** remembers (01-01-04). Read the text one character at a time, in one of four states:

| State | Meaning | A `"` | A `,` | A line break | Anything else |
|---|---|---|---|---|---|
| `FIELD_START` | Nothing read of this field yet | Start a quoted field: `QUOTED` | End the field | End the record | Add it: `UNQUOTED` |
| `UNQUOTED` | Inside a plain field | (added: not allowed, by rule 5) | End the field | End the record | Add it |
| `QUOTED` | Inside quotes | Maybe the end: `AFTER_QUOTE` | Add it (rule 6) | Add it (rule 6) | Add it |
| `AFTER_QUOTE` | Just read a `"` inside quotes | A doubled quote: add one `"`, back to `QUOTED` (rule 7) | End the field | End the record | Add it |

Every cell is a rule from the RFC. Two decisions go beyond it. A record may end with a lone LF (`\n`) as well as CRLF, because many real files use it. And a character after a closing quote, as in `"a"b`, is malformed by the grammar; this reader keeps it (`ab`), as Python's `csv` module does, rather than refusing the file. The function returns the records as lists of fields.

```python file=kit/csvtool.py
import json
import sys

# Where the reader is, inside a record: the states of a small machine
# (01-01-04), one character at a time, following RFC 4180's grammar.
FIELD_START = "field start"  # at the start of a field
UNQUOTED = "unquoted"  # inside a field that didn't start with a quote
QUOTED = "quoted"  # inside a quoted field
AFTER_QUOTE = "after quote"  # just after a quote inside a quoted field


# CSV text as a list of records, each a list of fields (RFC 4180, section 2).
# Records end with CRLF, or a lone LF as many real files have.
def parse_csv(text):
    rows = []
    row = []
    field = ""
    state = FIELD_START
    i = 0
    while i < len(text):
        c = text[i]
        if state == QUOTED:
            if c == '"':
                state = AFTER_QUOTE
            else:
                field += c  # commas and line breaks are data here (rule 6)
            i += 1
        elif state == AFTER_QUOTE and c == '"':
            field += '"'  # two quotes are one quote (rule 7)
            state = QUOTED
            i += 1
        elif c == '"' and state == FIELD_START:
            state = QUOTED  # a quoted field (rule 5)
            i += 1
        elif c == ",":
            row.append(field)  # the end of a field (rule 4)
            field = ""
            state = FIELD_START
            i += 1
        elif c == "\n" or (c == "\r" and text[i + 1:i + 2] == "\n"):
            row.append(field)  # the end of a record (rule 1)
            rows.append(row)
            row = []
            field = ""
            state = FIELD_START
            i += 2 if c == "\r" else 1
        else:
            field += c
            state = UNQUOTED
            i += 1
    if state != FIELD_START or field or row:
        row.append(field)  # the last record needn't end with a line break (rule 2)
        rows.append(row)
    return rows


def main():
    with open(sys.argv[1], encoding="utf-8", newline="") as file:
        rows = parse_csv(file.read())
    for row in rows:
        print(json.dumps(row))


if __name__ == "__main__":
    main()
```

`2 if c == "\r" else 1` is a **conditional expression**: 2 if the condition holds, otherwise 1. It skips both characters of a CRLF, or the one LF. Save it and run `.venv/bin/python csvtool.py samples/people.csv`:

```
["name", "city", "note"]
["Ada", "London", "first row"]
["Smith, Sam", "Leeds", "said \"hello\" twice"]
["Lee", "Paris", "plain"]
["Kim", "Oslo", "line one\r\nline two"]
["Max", "Rome", ""]
```

Six records, three fields each. The comma stays in Smith's name, the doubled quotes became single ones (JSON shows a quote inside a string as `\"`), the line break stays inside Kim's note, and Max's empty note is there.

```check
run "cd kit; .venv/Scripts/python csvtool.py samples/people.csv" stdout="[\"Smith, Sam\", \"Leeds\", \"said \\\"hello\\\" twice\"]" -- A quoted comma and doubled quotes are data, not separators.
run "cd kit; .venv/Scripts/python csvtool.py samples/people.csv" stdout="[\"Kim\", \"Oslo\", \"line one\\r\\nline two\"]" -- A line break inside quotes belongs to the field.
run "cd kit; .venv/Scripts/python -c \"from csvtool import parse_csv; print(len(parse_csv(open('samples/people.csv', encoding='utf-8', newline='').read())))\"" stdout="6" -- Six records: the header and five people.
```

## Checking against the standard, and a second opinion

Two kinds of evidence that the reader is right. First, the standard's own examples: every example in RFC 4180's section 2, with the records it describes. Second, a second implementation: Python's standard library has a `csv` module, written and used by many people over many years. This check writes tables of awkward fields with `csv.writer`, reads them back with both readers, and compares. `itertools.product(PIECES, repeat=3)` (01-04-05) makes every combination of three fields, 512 tables. `io.StringIO` is a text "file" in memory, so the writer and readers need no real files.

```python file=kit/check_csv.py
import csv
import io
import itertools

from csvtool import parse_csv

# RFC 4180's own examples, with the records they describe.
RFC_EXAMPLES = [
    ("aaa,bbb,ccc\r\nzzz,yyy,xxx\r\n", [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]]),
    ("aaa,bbb,ccc\r\nzzz,yyy,xxx", [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]]),
    ('"aaa","bbb","ccc"\r\nzzz,yyy,xxx\r\n', [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]]),
    ('"aaa","b\r\nbb","ccc"\r\nzzz,yyy,xxx\r\n', [["aaa", "b\r\nbb", "ccc"], ["zzz", "yyy", "xxx"]]),
    ('"aaa","b""bb","ccc"\r\n', [["aaa", 'b"bb', "ccc"]]),
]

# Fields that need care, for tables written by Python's own csv module.
PIECES = ["", "a", "b c", ",", '"', 'x"y', "line\r\nbreak", "é"]

failures = 0
for text, expected in RFC_EXAMPLES:
    if parse_csv(text) != expected:
        failures += 1
        print("RFC example differs:", repr(text), parse_csv(text))
print("RFC examples:", len(RFC_EXAMPLES) - failures, "of", len(RFC_EXAMPLES))

cases = 0
differences = 0
for row in itertools.product(PIECES, repeat=3):
    table = [list(row), ["first", "second", "third"]]
    out = io.StringIO()
    csv.writer(out).writerows(table)
    text = out.getvalue()
    cases += 1
    if parse_csv(text) != list(csv.reader(io.StringIO(text, newline=""))):
        differences += 1
        if differences <= 3:
            print("differs from csv:", repr(text))
print(cases, "tables,", differences, "differences from Python's csv module")
```

Save it and run `.venv/bin/python check_csv.py`:

```
RFC examples: 5 of 5
512 tables, 0 differences from Python's csv module
```

Now ask both a question the tables didn't: a file with a blank line in it.

```
.venv/bin/python -c "import csv, io; print(list(csv.reader(io.StringIO('a\n\nb\n', newline='')))); from csvtool import parse_csv; print(parse_csv('a\n\nb\n'))"
```

```
[['a'], [], ['b']]
[['a'], [''], ['b']]
```

They disagree. Python's `csv` module reads the blank line as a record with *no* fields; `parse_csv` reads it as a record with one empty field. Which is right? The grammar says `record = field *(COMMA field)`: a record has at least one field, and a field may be empty, so `['']` is what RFC 4180 describes. Python's choice is a deliberate convenience (blank lines in a spreadsheet export usually mean "no record"), and documented as its behaviour. Neither is a bug. They follow different rules, and now you know where. When two implementations disagree, go back to the standard; when the standard and practice disagree, decide, and write down which you chose.

(Python's `csv` documentation has a requirement of its own worth knowing: open CSV files with `newline=""`, or line breaks inside quoted fields won't be read correctly. That's the same reason `csvtool.py` does.)

```check
run "cd kit; .venv/Scripts/python check_csv.py" stdout="RFC examples: 5 of 5" -- parse_csv should give exactly the records RFC 4180's examples describe.
run "cd kit; .venv/Scripts/python check_csv.py" stdout="512 tables, 0 differences from Python's csv module" -- and agree with Python's csv module on 512 awkward tables.
```

**What else, and why not.**

| Way | Cost |
|---|---|
| A state machine written from the grammar, as here | You know exactly what it does and why; it's yours to maintain, and slower than C code |
| Python's `csv` module | Tested by millions, fast, handles dialects (semicolons, tabs); its blank-line rule differs from the RFC's, and the rest is what you'd expect, but you have to read its docs to know |
| `line.split(",")` | Correct only for files with no quotes at all, which you can rarely promise |
| A regular expression | Possible for one record, but line breaks inside quotes span records, and the patterns become unreadable (01-06-03: regexes match shapes, not structure) |
| A different format (JSON, 01-01-02; or a database, module 2.2) | Unambiguous by design; spreadsheets and many tools speak CSV and nothing else |

## Your turn: one column, as a command

Give `csvtool.py` a `--column NAME` option: it prints the values of the column with that name in the header, one per record after the header, each as a JSON string (so that a value with a line break stays on one line). An unknown name stops the program with a message listing the columns, and status 1. A record too short to have that field gives `""`. Without `--column`, it prints the records as now.

Then make it a Kit command, `kit-csv`, like the others (01-06-05), so that `.venv/bin/kit-csv samples/people.csv --column note` works, and its `--help` names it (01-06-06's `help_if_asked` and `program_name`). There's no file to compare with; the checks run both.

```hints
nudge: Which record holds the names of the columns, and how do you turn a name into a position? Then: what did 01-06-05 change so that count.py became kit-count, and does an editable install notice a new command by itself?
concept: The header is rows[0]; header.index(name) is the column's position, once you've checked name in header. kitargs.take_option (01-06-02) pulls --column and its value out of the arguments. For the command: add "csvtool" to py-modules and kit-csv = "csvtool:main" to [project.scripts], then run pip install -e . again. Editable installs see changes to your code at once, but the commands themselves are made when you install, so a new command needs a new install.
shape: def column(rows, name): header = rows[0]; if name not in header: sys.exit(…); index = header.index(name); collect row[index] for each row in rows[1:], or "" if the row is too short. main: help_if_asked(sys.argv[1:], USAGE); name, args = take_option(sys.argv[1:], "--column"); parse args[0]; print each value with json.dumps. pyproject.toml: kit-csv = "csvtool:main" and "csvtool" in py-modules; then .venv/bin/python -m pip install -e .
answer: In csvtool.py, after the imports:
~~~python
from kitargs import help_if_asked, take_option

USAGE = "FILE [--column NAME]"
~~~
and in place of main:
~~~python
# The values in the column with this name in the header (the first record),
# one per record after it. A record too short to have the field gives "".
def column(rows, name):
    header = rows[0]
    if name not in header:
        sys.exit("no column " + name + "; the columns are: " + ", ".join(header))
    index = header.index(name)
    values = []
    for row in rows[1:]:
        if index < len(row):
            values.append(row[index])
        else:
            values.append("")
    return values


def main():
    help_if_asked(sys.argv[1:], USAGE)
    name, args = take_option(sys.argv[1:], "--column")
    with open(args[0], encoding="utf-8", newline="") as file:
        rows = parse_csv(file.read())
    if name is None:
        for row in rows:
            print(json.dumps(row))
    else:
        for value in column(rows, name):
            print(json.dumps(value))
~~~
In pyproject.toml, kit-csv = "csvtool:main" under [project.scripts], and "csvtool" in py-modules. Then .venv/bin/python -m pip install -e . again: until you do, there's no kit-csv. The tempting slip is printing the values without json.dumps, which splits Kim's note over two lines, so a reader can't tell one value from two: the problem this whole lesson is about, in the output.
```

```check
run "cd kit; .venv/Scripts/python csvtool.py samples/people.csv --column note" stdout="\"line one\\r\\nline two\"" -- --column should print each value as a JSON string, so a line break stays inside one line.
run "cd kit; .venv/Scripts/python csvtool.py samples/people.csv --column city" stdout="\"London\"\n\"Leeds\"\n\"Paris\"\n\"Oslo\"\n\"Rome\"" -- --column city should print the five cities, in order.
run "cd kit; .venv/Scripts/python csvtool.py --column nope samples/people.csv" exit=1 stderr="name, city, note" -- An unknown column should stop with the list of columns.
run "cd kit; .venv/Scripts/kit-csv samples/people.csv --column name" stdout="\"Smith, Sam\"\n\"Lee\"" -- kit-csv should be an installed command (add it to pyproject.toml and install again).
run "cd kit; .venv/Scripts/kit-csv --help" stdout="usage: kit-csv FILE [--column NAME]" -- kit-csv --help should name the command.
run "cd kit; .venv/Scripts/ruff check csvtool.py check_csv.py make_people.py" stdout="All checks passed!" -- The new files should pass the linter.
```

**What these checks establish, and what they don't.** They ask for two columns and check every value of one, check an unknown name, run the installed command and its help, and lint the files. They don't try a record shorter than the header (make one, `Zed` alone on a line, and see `""`), a file with no header at all (RFC 4180's header is optional; how would anyone know?), or a column name that appears twice. And `check_csv.py`'s agreement with Python is only as wide as its eight pieces: tabs, a field that's only spaces (rule 4: "spaces are considered part of a field"), and a quote in the middle of an unquoted field are all worth adding.

## What you can do now

- An **RFC** has a **status** (RFC 4180 is Informational: it records practice), **key words** (MUST, SHOULD, MAY), numbered **rules** with examples, and often a **grammar**. Read all of them; where the English is unclear, the grammar decides.
- **ABNF**: `name = definition`, `/` or, `*` any number, `[ ]` optional, `%x2C` a character by code. `escaped = DQUOTE *(TEXTDATA / COMMA / CR / LF / 2DQUOTE) DQUOTE` is three of CSV's rules in one line.
- Splitting on commas can't read CSV, because whether a comma or line break ends a field depends on quotes before it. A **state machine** can, with one state per situation in the grammar.
- Test against the **standard's own examples** and a **second implementation**. When they disagree (blank lines: `[]` or `['']`), go back to the standard, decide, and write the decision down.
- Open CSV files with `newline=""` in Python, so that line breaks inside fields survive.

```predict
question: A colleague says "our CSV export is fine, Excel opens it". A customer's import program then rejects it, because names with commas are split. The export writes each record as ",".join(fields). What's wrong, what does RFC 4180 say to do, and why did Excel hide the problem?
explain: ",".join doesn't quote anything, so a field containing a comma, a quote or a line break comes out ambiguous: rule 6 says such fields should be enclosed in double quotes, and rule 7 says quotes inside must be doubled. Use a writer that follows the rules (Python's csv.writer does). Excel hid it because the colleague looked at a file with no such names, or because Excel guessed; "a program opens it" is evidence about that program, not about the format.
```

**Next:** 01-07-03 is about judging sources: when the documentation, a forum answer and an AI assistant disagree, how to decide what's true, from source code, issue trackers and papers, by going to the primary source.
