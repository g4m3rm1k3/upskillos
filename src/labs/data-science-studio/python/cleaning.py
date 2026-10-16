"""Part 3 of Data Science Studio: cleaning. Text made comparable, rows checked against rules,
duplicates removed, edit distance and fuzzy matching, and missing values filled. Plain Python,
so every line can be stepped through.
"""
import unicodedata

from tables import to_pence

# The towns the shop delivers to, written the way the shop writes them.
TOWNS = ["Leeds", "York", "Harrogate", "Wakefield"]


def normalise(text):
    """Text made comparable: one Unicode form for accented letters, no spaces at the ends, one
    space between words, and lower case. Two texts a person reads as the same word come out equal."""
    text = unicodedata.normalize("NFC", text)
    words = text.split()
    return " ".join(words).lower()


def clean_town(text):
    """A town name the way the shop writes it: normalised, then a capital at the start of each
    word, so "  leeds " and "Leeds" both become "Leeds"."""
    return normalise(text).title()


def is_order_id(row):
    """Rule: the order id is an A and four digits."""
    text = row["order_id"]
    return len(text) == 5 and text[0] == "A" and text[1:].isdigit()


def price_written_right(row):
    """Rule: the price is blank, or pounds, a point and two digits of pence."""
    text = row["price"]
    if text == "":
        return True
    pounds, point, pence = text.partition(".")
    return pounds.isdigit() and point == "." and len(pence) == 2 and pence.isdigit()


def quantity_in_range(row):
    """Rule: the quantity is a whole number from 1 to 3, the most the shop sells in one order."""
    text = row["quantity"]
    return text.isdigit() and 1 <= int(text) <= 3


def town_as_written(row):
    """Rule: the town is one of the towns the shop delivers to, written exactly as the shop writes it."""
    return row["town"] in TOWNS


RULES = [
    ["order id", is_order_id],
    ["price written right", price_written_right],
    ["quantity 1 to 3", quantity_in_range],
    ["town as written", town_as_written],
]


def check_rows(rows, rules):
    """Every row against every rule: [order id, rule name] for each rule a row breaks. A rule is
    a name and a function that takes a row and says whether it is valid."""
    problems = []
    for row in rows:
        for name, valid in rules:
            if not valid(row):
                problems.append([row["order_id"], name])
    return problems


def fix_pence(text, list_price):
    """A price as whole pence, checked against the list price of its item (in pence). A price more
    than ten times the list price was typed in pence, without its point: it is divided by 100."""
    pence = to_pence(text)
    if pence is None:
        return None
    if pence > 10 * list_price:
        return pence // 100
    return pence


def dedupe(rows, key):
    """The rows with only the first of each key kept, in their original order, and the keys
    seen again. A set answers "seen this before?" in one step, so this is a single pass."""
    seen, kept, repeated = set(), [], []
    for row in rows:
        k = row[key]
        if k in seen:
            repeated.append(k)
        else:
            seen.add(k)
            kept.append(row)
    return kept, repeated


def edit_distance(a, b):
    """The fewest single-character changes (insert, delete, substitute) that turn a into b.
    table[i][j] is the distance from the first i characters of a to the first j of b. Each cell
    comes from three cells already filled, so the table is filled row by row."""
    table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        table[i][0] = i
    for j in range(len(b) + 1):
        table[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            change = 0 if a[i - 1] == b[j - 1] else 1
            table[i][j] = min(table[i - 1][j] + 1,
                              table[i][j - 1] + 1,
                              table[i - 1][j - 1] + change)
    return table[len(a)][len(b)]


def closest(text, choices, most=0.34):
    """The choice nearest to text by edit distance (both normalised), with the distance. When even
    the nearest needs more changes than `most` of the longer word, it is no match: None."""
    best, best_d = None, None
    for choice in choices:
        d = edit_distance(normalise(text), normalise(choice))
        if best_d is None or d < best_d:
            best, best_d = choice, d
    if best is None or best_d > most * max(len(normalise(text)), len(normalise(best))):
        return [None, best_d]
    return [best, best_d]


def fill_missing(values, value):
    """The values with every None replaced by value."""
    return [value if v is None else v for v in values]


def fill_by_group(rows, column, key):
    """New rows with each missing value of `column` filled with the mean of its own group (the
    rows with the same `key`): a helmet with no price gets the mean price of a helmet."""
    sums, counts = {}, {}
    for row in rows:
        if row[column] is not None:
            sums[row[key]] = sums.get(row[key], 0) + row[column]
            counts[row[key]] = counts.get(row[key], 0) + 1
    out = []
    for row in rows:
        new = dict(row)
        if new[column] is None and counts.get(row[key], 0) > 0:
            new[column] = sums[row[key]] / counts[row[key]]
        out.append(new)
    return out


def clean_orders(rows, list_prices):
    """The whole cleaning, in order: duplicates out first (they are found by the raw order id),
    then each town cleaned and each price turned into pence and checked against its list price."""
    kept, _ = dedupe(rows, "order_id")
    out = []
    for row in kept:
        new = dict(row)
        new["town"] = clean_town(row["town"])
        new["price"] = fix_pence(row["price"], list_prices[row["item"]])
        new["quantity"] = int(row["quantity"])
        out.append(new)
    return out
