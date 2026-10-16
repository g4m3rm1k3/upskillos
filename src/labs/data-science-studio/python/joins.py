"""Part 3 of Data Science Studio: joining tables. Three ways to find the rows of two tables that
share a key (a loop inside a loop, a dictionary, two sorted lists), the joins that keep rows
with no partner or find them, and a table reshaped from wide to long. Plain Python.
"""


def nested_loop_join(left, right, key):
    """Every pair of rows whose keys match, found by comparing each left row with each right
    row: len(left) * len(right) comparisons. Each match is the two rows merged into one."""
    out = []
    for a in left:
        for b in right:
            if a[key] == b[key]:
                out.append({**a, **b})
    return out


def hash_join(left, right, key):
    """The same rows, found by first putting the right rows into a dictionary by key (one pass),
    then looking each left row up in it (one more pass)."""
    index = {}
    for b in right:
        index.setdefault(b[key], []).append(b)
    out = []
    for a in left:
        for b in index.get(a[key], []):
            out.append({**a, **b})
    return out


def sort_merge_join(left, right, key):
    """The same rows in key order, found by sorting both tables by key and walking down the two
    together, the way merge sort merges two sorted lists."""
    lefts = sorted(left, key=lambda row: row[key])
    rights = sorted(right, key=lambda row: row[key])
    out, i, j = [], 0, 0
    while i < len(lefts) and j < len(rights):
        if lefts[i][key] < rights[j][key]:
            i += 1
        elif lefts[i][key] > rights[j][key]:
            j += 1
        else:
            k = j
            while k < len(rights) and rights[k][key] == lefts[i][key]:
                out.append({**lefts[i], **rights[k]})
                k += 1
            i += 1
    return out


def left_join(left, right, key):
    """Every left row, joined to each right row with its key; a left row with no partner is kept
    once, with None in each column that would have come from the right."""
    index = {}
    for b in right:
        index.setdefault(b[key], []).append(b)
    blank = {name: None for row in right for name in row if name != key}
    out = []
    for a in left:
        for b in index.get(a[key], [blank]):
            out.append({**a, **b})
    return out


def anti_join(left, right, key):
    """The left rows whose key is nowhere in the right table: what failed to join."""
    keys = set(row[key] for row in right)
    return [row for row in left if row[key] not in keys]


def join_size(left, right, key):
    """How many rows an inner join gives without making them: for each key, the number of left
    rows with it times the number of right rows with it."""
    counts = {}
    for b in right:
        counts[b[key]] = counts.get(b[key], 0) + 1
    size = 0
    for a in left:
        size += counts.get(a[key], 0)
    return size


def to_long(rows, id_column, name="column", value="value"):
    """A wide table made long: one row for each value, holding the id it belongs to, the name of
    the column it came from, and the value itself."""
    out = []
    for row in rows:
        for column, v in row.items():
            if column != id_column:
                out.append({id_column: row[id_column], name: column, value: v})
    return out
