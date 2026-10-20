"""Part 10 of Data Science Studio: databases and SQL. The shop's tables in SQLite, typed; a tiny
query engine by hand (projection, selection with NULL, grouping), so every SQL clause has a loop
behind it; a sorted index searched by halving; window functions; functional dependencies and
normalisation; and a transaction that happens completely or not at all.
"""
import sqlite3


def column_type(values):
    """The SQLite type for a column of text values: INTEGER if every non-empty value is a whole
    number, REAL if every one is a number, TEXT otherwise. Empty values do not count: they will
    be NULL."""
    kind = "INTEGER"
    for v in values:
        if v == "":
            continue
        try:
            int(v)
            continue
        except ValueError:
            pass
        try:
            float(v)
            kind = "REAL"
        except ValueError:
            return "TEXT"
    return kind


def sql_value(text, kind):
    """One value as it goes into the table: None for an empty cell, else a number or the text."""
    if text == "":
        return None
    if kind == "INTEGER":
        return int(text)
    if kind == "REAL":
        return float(text)
    return text


def create_sql(name, header, rows):
    """The CREATE TABLE statement for a table, each column typed by column_type."""
    kinds = [column_type([row[j] for row in rows]) for j in range(len(header))]
    return "CREATE TABLE " + name + " (" + ", ".join(h + " " + k for h, k in zip(header, kinds)) + ")"


def load(tables):
    """An in-memory SQLite database holding the tables: a dictionary from each name to its rows
    of text, header first. Columns are typed by column_type and empty cells become NULL."""
    conn = sqlite3.connect(":memory:")
    for name, table in tables.items():
        header, rows = table[0], table[1:]
        conn.execute(create_sql(name, header, rows))
        kinds = [column_type([row[j] for row in rows]) for j in range(len(header))]
        marks = ", ".join("?" for _ in header)
        conn.executemany("INSERT INTO " + name + " VALUES (" + marks + ")",
                         [[sql_value(v, k) for v, k in zip(row, kinds)] for row in rows])
    return conn


def project(rows, columns, distinct=False):
    """SELECT columns: each row cut down to the named columns, as a list. With distinct, each
    combination once, in the order first seen: what relational algebra calls a projection."""
    out, seen = [], set()
    for row in rows:
        values = [row[c] for c in columns]
        if distinct:
            key = tuple(values)
            if key in seen:
                continue
            seen.add(key)
        out.append(values)
    return out


def compare(value, op, target):
    """One condition as SQL reads it: a comparison with NULL (None) is never true, not even
    NULL = NULL; only "is null" finds it."""
    if op == "is null":
        return value is None
    if value is None or target is None:
        return False
    if op == "=":
        return value == target
    if op == "!=":
        return value != target
    if op == "<":
        return value < target
    if op == ">":
        return value > target
    if op == "<=":
        return value <= target
    return value >= target


def where(rows, column, op, target=None):
    """WHERE column op target: the rows for which the condition is true. Rows where it is false
    or unknown (NULL) are left out alike."""
    return [row for row in rows if compare(row[column], op, target)]


def aggregate(values, how):
    """One aggregate as SQL computes it. count_all counts rows, NULLs included, as COUNT(*) does;
    the others skip NULL first. SUM, AVG, MIN and MAX of nothing are NULL; COUNT of nothing is 0."""
    if how == "count_all":
        return len(values)
    present = [v for v in values if v is not None]
    if how == "count":
        return len(present)
    if not present:
        return None
    if how == "sum":
        s = 0
        for v in present:
            s += v
        return s
    if how == "avg":
        s = 0
        for v in present:
            s += v
        return s / len(present)
    if how == "min":
        return min(present)
    return max(present)


def group_aggregate(rows, key, column, how):
    """SELECT key, how(column) ... GROUP BY key: split the rows by key, aggregate each group.
    Returns [key, value] pairs with the keys sorted, NULL first, as SQLite orders them."""
    groups = {}
    for row in rows:
        groups.setdefault(row[key], []).append(row[column])
    keys = sorted(groups, key=lambda k: (k is not None, k))
    return [[k, aggregate(groups[k], how)] for k in keys]


def build_index(rows, column):
    """An index on one column: every [value, position] pair, sorted by value, then position.
    NULLs are left out, as a lookup by value can never find them."""
    pairs = [[row[column], i] for i, row in enumerate(rows) if row[column] is not None]
    return sorted(pairs, key=lambda p: (p[0], p[1]))


def binary_search(index, value):
    """The positions of the rows holding value, found in a sorted index by halving: look at the
    middle, keep the half that can hold the first match. Returns [positions, comparisons]."""
    lo, hi, steps = 0, len(index), 0
    while lo < hi:
        mid = (lo + hi) // 2
        steps += 1
        if index[mid][0] < value:
            lo = mid + 1
        else:
            hi = mid
    found = []
    while lo < len(index) and index[lo][0] == value:
        found.append(index[lo][1])
        lo += 1
    return [found, steps]


def btree_levels(n, fanout):
    """The levels a B-tree needs for n keys when each page holds fanout of them: the smallest h
    with fanout to the power h at least n."""
    levels, reach = 1, fanout
    while reach < n:
        reach *= fanout
        levels += 1
    return levels


def window_average(values, preceding):
    """AVG(value) OVER (ROWS BETWEEN preceding PRECEDING AND CURRENT ROW): for each row, the
    average of it and up to preceding rows before it. Near the start the window is shorter."""
    out = []
    for i in range(len(values)):
        start = max(0, i - preceding)
        s = 0
        for v in values[start:i + 1]:
            s += v
        out.append(s / (i + 1 - start))
    return out


def rank_within(rows, partition, order):
    """RANK() OVER (PARTITION BY partition ORDER BY order DESC): each row ranked within its
    group, largest first. Ties share a rank, and the next rank skips: 1, 2, 2, 4."""
    ranks = []
    for row in rows:
        better = 0
        for other in rows:
            if other[partition] == row[partition] and other[order] > row[order]:
                better += 1
        ranks.append(better + 1)
    return ranks


def determines(rows, a, b):
    """Whether column a determines column b (a functional dependency, a to b): no two rows agree
    on a and differ on b."""
    seen = {}
    for row in rows:
        if row[a] in seen and seen[row[a]] != row[b]:
            return False
        seen[row[a]] = row[b]
    return True


def split_out(rows, key, columns):
    """Normalising one step: the columns that depend only on key move to a table of their own,
    one row per key, in the order first seen. Returns [that table, the rows without them]."""
    lookup, seen = [], set()
    for row in rows:
        if row[key] not in seen:
            seen.add(row[key])
            lookup.append({c: row[c] for c in [key] + columns})
    rest = [{c: v for c, v in row.items() if c not in columns} for row in rows]
    return [lookup, rest]


def place_orders(stock, orders):
    """A transaction: take every order [item, quantity] off the stock, inside one transaction.
    The table forbids negative stock (a CHECK constraint), so one order too many fails, and the
    whole transaction is rolled back: all the orders happen, or none do. Returns the stock after,
    as a dictionary, and whether the orders went through."""
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE stock (item TEXT PRIMARY KEY, units INTEGER CHECK (units >= 0))")
    conn.executemany("INSERT INTO stock VALUES (?, ?)", list(stock.items()))
    conn.commit()
    try:
        with conn:
            for item, quantity in orders:
                conn.execute("UPDATE stock SET units = units - ? WHERE item = ?", (quantity, item))
        ok = True
    except sqlite3.IntegrityError:
        ok = False
    after = {item: units for item, units in conn.execute("SELECT item, units FROM stock ORDER BY item")}
    return [after, ok]


def monthly_revenue(rows, under=1000):
    """Revenue, price times quantity, by month (the YYYY-MM at the front of the date), months in
    order. Missing prices are left out, and so are prices of under or more: the two typed in
    pence. Returns [month, revenue] pairs, as GROUP BY month would."""
    totals = {}
    for row in rows:
        if row["price"] is None or row["price"] >= under:
            continue
        month = row["date"][:7]
        totals[month] = totals.get(month, 0) + row["price"] * row["quantity"]
    return [[m, totals[m]] for m in sorted(totals)]
