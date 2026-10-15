"""Part 1 of Data Science Studio: a table by hand. Rows as dictionaries, a CSV file read one
character at a time, text turned into numbers, filtering and sorting. Plain Python: pandas only
arrives in lesson 1.5, so every line here can be stepped through.
"""


def column(rows, name):
    """Every row's value in one column, top to bottom."""
    return [row[name] for row in rows]


def count_values(values):
    """How many times each value appears, in the order each was first seen."""
    counts = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    return counts


def split_csv_line(line):
    """One line of a CSV file split into its fields. A field in double quotes may hold commas,
    and two quotes in a row inside it stand for one quote character."""
    fields, field, in_quotes, i = [], "", False, 0
    while i < len(line):
        ch = line[i]
        if in_quotes:
            if ch == '"' and i + 1 < len(line) and line[i + 1] == '"':
                field += '"'
                i += 1
            elif ch == '"':
                in_quotes = False
            else:
                field += ch
        elif ch == '"':
            in_quotes = True
        elif ch == ",":
            fields.append(field)
            field = ""
        else:
            field += ch
        i += 1
    fields.append(field)
    return fields


def read_csv(text):
    """A whole CSV file as rows: dictionaries from the header's names to each line's fields.
    Blank lines are skipped. A field holding a new line is not handled: this lab's files have none."""
    lines = [line for line in text.split("\n") if line.strip() != ""]
    header = split_csv_line(lines[0])
    return [dict(zip(header, split_csv_line(line))) for line in lines[1:]]


def to_pence(text):
    """A price written in pounds, such as "45.99", as whole pence (4599), using only whole
    numbers: no float is ever made, so nothing is rounded. Empty text gives None."""
    text = text.strip()
    if text == "":
        return None
    pounds, _, pence = text.partition(".")
    pence = (pence + "00")[:2]
    return int(pounds) * 100 + int(pence)


def to_number(text):
    """A field as a number: None if it is empty, otherwise a float. Spaces around it are ignored."""
    text = text.strip()
    if text == "":
        return None
    return float(text)


def with_numbers(rows, names):
    """Copies of the rows with the named columns turned into numbers, None where a field is empty."""
    return [{k: to_number(v) if k in names else v for k, v in row.items()} for row in rows]


def mean_of(values):
    """The mean of the values that are not None, and how many were left out."""
    present = [v for v in values if v is not None]
    if not present:
        return None, len(values)
    return sum(present) / len(present), len(values) - len(present)


def rows_where(rows, name, value):
    """The rows whose column `name` holds exactly `value`, in their original order."""
    return [row for row in rows if row[name] == value]


def where_all(rows, conditions):
    """The rows that match every condition: conditions maps a column name to the value it must hold."""
    return [row for row in rows if all(row[name] == value for name, value in conditions.items())]


def sort_by(rows, name):
    """The rows sorted by one column, smallest first, as a new list: insertion sort, written out.
    A row moves left only past rows with a strictly larger value, so rows with equal values keep
    the order they had. A sort that does this is called stable; Python's sorted is stable too."""
    out = []
    for row in rows:
        i = len(out)
        while i > 0 and out[i - 1][name] > row[name]:
            i -= 1
        out.insert(i, row)
    return out


def merge_sorted(left, right, name):
    """Two lists of rows, each already sorted by `name`, merged into one sorted list. On a tie the
    row from the left list goes first, which keeps the merge stable."""
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if right[j][name] < left[i][name]:
            out.append(right[j])
            j += 1
        else:
            out.append(left[i])
            i += 1
    return out + left[i:] + right[j:]


def merge_sort(rows, name):
    """Merge sort: split the list in half, sort each half the same way, merge the two halves."""
    if len(rows) <= 1:
        return list(rows)
    middle = len(rows) // 2
    return merge_sorted(merge_sort(rows[:middle], name), merge_sort(rows[middle:], name), name)
