"""The shop's orders: one year of a bike shop's sales, made by a seeded generator so that the
page (engine/data.js) and Python build exactly the same table, flaws included. Each flaw is
there on purpose, for a lesson to find.
"""


class Rng:
    """A tiny random-number generator (the 32-bit LCG from Numerical Recipes), written out so
    the page's JavaScript produces exactly the same numbers."""

    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (self.state * 1664525 + 1013904223) % 2**32
        return self.state / 2**32

    def below(self, n):
        return int(self.random() * n)


HEADER = ["order_id", "date", "town", "item", "price", "quantity", "channel"]

# Each item: its name, its usual price in pence, and how often it is bought (relative weights).
ITEMS = [("Bike", 45000, 6), ("Helmet", 4500, 20), ("Lights, front and back", 2500, 22),
         ("Lock", 3000, 17), ("Inner tube", 700, 20), ("Service", 4000, 15)]
TOWNS = ["Leeds", "York", "Harrogate", "Wakefield"]
MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def date_of(day):
    """Day 0 to 364 of 2025 as text, YYYY-MM-DD."""
    month = 0
    while day >= MONTH_DAYS[month]:
        day -= MONTH_DAYS[month]
        month += 1
    return "2025-" + str(month + 1).zfill(2) + "-" + str(day + 1).zfill(2)


def pounds(pence):
    """Whole pence written as pounds, with whole-number arithmetic only: 4599 becomes "45.99"."""
    return str(pence // 100) + "." + str(pence % 100).zfill(2)


def pick(rng, weights):
    """An index, chosen with probability proportional to its weight."""
    r = rng.below(sum(weights))
    for k, w in enumerate(weights):
        if r < w:
            return k
        r -= w


def make_orders(n=400, seed=7):
    """The orders as rows of text, the way they arrive in a CSV file. About 3 in 100 prices are
    missing, 6 in 100 town names are typed differently, 1 in 100 prices was typed in pence, and
    two orders were entered twice."""
    rng = Rng(seed)
    rows = []
    for k in range(n):
        name, base, _ = ITEMS[pick(rng, [w for _, _, w in ITEMS])]
        price = base * (90 + rng.below(21)) // 100
        quantity = 1 + rng.below(3) if base < 5000 else 1
        town = TOWNS[rng.below(len(TOWNS))]
        channel = "web" if rng.below(100) < 45 else "shop"
        day = rng.below(365)
        flaw = rng.below(100)
        price_text = pounds(price)
        if flaw < 3:
            price_text = ""
        elif flaw < 7:
            town = town.lower()
        elif flaw < 9:
            town = town + " "
        elif flaw == 9:
            price_text = str(price)
        rows.append(["A" + str(1001 + k), date_of(day), town, name, price_text, str(quantity), channel])
    for k in [17, 233]:
        rows.append(rows[k][:])
    return rows


def csv_field(text):
    """A field as a CSV file writes it: in double quotes if it holds a comma, a quote or a new
    line, with every quote inside doubled."""
    if "," in text or '"' in text or "\n" in text:
        return '"' + text.replace('"', '""') + '"'
    return text


def to_csv(header, rows):
    """The header and the rows as the text of a CSV file, one line each."""
    return "\n".join(",".join(csv_field(f) for f in row) for row in [header] + rows) + "\n"
