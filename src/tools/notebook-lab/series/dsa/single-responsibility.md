# Single responsibility

The last lesson split a function that did four jobs. Classes drift into the same state, more quietly. A class starts as a neat bundle of data and behaviour. Then it gains a method to print itself, a method to save itself, a method to email someone about itself, and each addition is small and convenient. Eventually one class holds the business rules, the file format, the report layout and the messaging. Changing any of them means editing, and re-testing, all of them.

The **single responsibility principle** says a class should have one responsibility, and it gives a practical test for what that means: a class should have **one reason to change**. A "reason to change" usually means a group of people who ask for changes. If the accountants, the warehouse staff and the IT team all file requests against the same class, it has three responsibilities.

This lesson covers:

- spotting a class with several responsibilities, by its change requests;
- a mechanical clue: which attributes each method uses;
- splitting the class, and what each change request costs afterwards;
- how far to go, and when splitting makes code worse.

## A class with three jobs

A garage keeps a `JobCard` for each repair. Over time it has grown: it records parts and labour, prices the job, writes the invoice text, and stores itself as text in a "database" (here a dictionary standing in for a file or table).

```python type
class JobCard:
    LABOUR_RATE = 55.0

    def __init__(self, job_id, customer, vehicle):
        self.job_id = job_id
        self.customer = customer
        self.vehicle = vehicle
        self.parts = []
        self.labour_hours = 0.0

    def add_part(self, name, price):
        self.parts.append((name, price))

    def add_labour(self, hours):
        self.labour_hours += hours

    def total(self):
        return sum(price for _, price in self.parts) + self.labour_hours * self.LABOUR_RATE

    def invoice_text(self):
        lines = [f"Invoice {self.job_id} for {self.customer} ({self.vehicle})"]
        lines += [f"  {name:<16}£{price:7.2f}" for name, price in self.parts]
        lines.append(f"  {'labour ' + str(self.labour_hours) + ' h':<16}£{self.labour_hours * self.LABOUR_RATE:7.2f}")
        lines.append(f"  {'TOTAL':<16}£{self.total():7.2f}")
        return "\n".join(lines)

    def save(self, database):
        parts = ";".join(f"{name}={price}" for name, price in self.parts)
        database[self.job_id] = f"{self.customer}|{self.vehicle}|{self.labour_hours}|{parts}"

    @classmethod
    def load(cls, database, job_id):
        customer, vehicle, hours, parts = database[job_id].split("|")
        card = cls(job_id, customer, vehicle)
        card.labour_hours = float(hours)
        for item in filter(None, parts.split(";")):
            name, price = item.split("=")
            card.add_part(name, float(price))
        return card

db = {}
card = JobCard("J-104", "M. Okafor", "Ford Transit")
card.add_part("brake pads", 48.00)
card.add_part("brake fluid", 9.50)
card.add_labour(1.5)
card.save(db)
print(JobCard.load(db, "J-104").invoice_text())
print(db)
```

```output
Invoice J-104 for M. Okafor (Ford Transit)
  brake pads      £  48.00
  brake fluid     £   9.50
  labour 1.5 h    £  82.50
  TOTAL           £ 140.00
{'J-104': 'M. Okafor|Ford Transit|1.5|brake pads=48.0;brake fluid=9.5'}
```

`@classmethod` makes `load` receive the class itself as `cls`, so `cls(...)` builds a new `JobCard`: a common way to write an alternative constructor.

Now the change requests arrive, from different people:

- the **workshop manager**: "Labour is charged in quarter hours, rounded up";
- the **accounts office**: "Invoices must show VAT and our company number";
- the **IT team**: "We are moving the job store to JSON".

Predict before reading on: how many of these requests require editing `JobCard`?

## A clue in the attributes

All three do. A mechanical clue shows why. List, for each method, which of the class's attributes and methods it uses. Methods that serve the same responsibility tend to share data, and methods that share nothing with each other are often separate jobs that happen to live together. Python can produce this list itself. When a function is defined, Python compiles it, and `function.__code__.co_names` lists every name the compiled code looks up: attribute names after a dot, and global names. Keeping only the names that belong to the class (its methods and class attributes, and the attributes `__init__` sets) gives each method's list.

```python type
import types

def names_used(function):
    names, codes = set(), [function.__code__]
    while codes:
        code = codes.pop()
        names.update(code.co_names)
        codes.extend(c for c in code.co_consts if isinstance(c, types.CodeType))
    return names

def attributes_used(cls):
    own_names = names_used(cls.__init__) | set(vars(cls))
    used = {}
    for name, member in vars(cls).items():
        function = member.__func__ if isinstance(member, classmethod) else member
        if callable(function) and name != "__init__":
            used[name] = sorted((names_used(function) & own_names) - {name})
    return used

print("names looked up by total:", sorted(names_used(JobCard.total)))
for method, attributes in attributes_used(JobCard).items():
    print(f"{method:<13} {attributes}")
```

```output
names looked up by total: ['LABOUR_RATE', 'labour_hours', 'parts', 'sum']
add_part      ['parts']
add_labour    ['labour_hours']
total         ['LABOUR_RATE', 'labour_hours', 'parts']
invoice_text  ['LABOUR_RATE', 'customer', 'job_id', 'labour_hours', 'parts', 'total', 'vehicle']
save          ['customer', 'job_id', 'labour_hours', 'parts', 'vehicle']
load          ['add_part', 'labour_hours']
```

`vars(cls)` is the class's own dictionary of methods and class attributes. A generator expression inside a method is compiled as a separate small code object, stored in `co_consts`, so `names_used` searches those too. `total` looks up `sum` (a built-in) as well as the class's names; intersecting with `own_names` keeps only the names that belong to the class.

Read the table by responsibility. `add_part`, `add_labour` and `total` work on the job's contents: the **domain**, the garage's actual business. `invoice_text` reads almost everything, but only to lay it out: **presentation**. `save` reads all the data, and `load` rebuilds a card through its constructor and `add_part`, only to turn a card into text and back: **persistence**. The tool cannot decide responsibilities for you: every method shares something with the others, because they all touch the same data. What it does is make visible who touches what. Read with the change requests, it shows the shape: three groups of people, three kinds of method.

## Splitting by reason to change

Give each responsibility its own home:

- `JobCard` keeps the data and the domain rules (adding parts and labour, the total);
- `InvoiceFormatter` turns a job card into text;
- `JobStore` saves and loads job cards.

The formatter and the store **use** a `JobCard`. The job card knows nothing about either. That direction matters: the domain is the part most worth protecting, so nothing in it should depend on output formats or storage. Predict before running: which class changes for the quarter-hour rule, and which for JSON?

```python type
import json, math

class JobCard:
    LABOUR_RATE = 55.0

    def __init__(self, job_id, customer, vehicle):
        self.job_id, self.customer, self.vehicle = job_id, customer, vehicle
        self.parts = []
        self.labour_hours = 0.0

    def add_part(self, name, price):
        self.parts.append((name, price))

    def add_labour(self, hours):
        self.labour_hours += math.ceil(hours * 4) / 4

    def labour_cost(self):
        return self.labour_hours * self.LABOUR_RATE

    def total(self):
        return sum(price for _, price in self.parts) + self.labour_cost()

class InvoiceFormatter:
    def __init__(self, vat_rate=0.2, company_number="09876543"):
        self.vat_rate, self.company_number = vat_rate, company_number

    def text(self, card):
        lines = [f"Invoice {card.job_id} for {card.customer} ({card.vehicle})"]
        lines += [f"  {name:<16}£{price:7.2f}" for name, price in card.parts]
        lines.append(f"  {'labour ' + str(card.labour_hours) + ' h':<16}£{card.labour_cost():7.2f}")
        vat = card.total() * self.vat_rate
        lines.append(f"  {'VAT':<16}£{vat:7.2f}")
        lines.append(f"  {'TOTAL':<16}£{card.total() + vat:7.2f}")
        lines.append(f"Company no. {self.company_number}")
        return "\n".join(lines)

class JobStore:
    def __init__(self, database):
        self.database = database

    def save(self, card):
        self.database[card.job_id] = json.dumps({"customer": card.customer, "vehicle": card.vehicle,
                                                 "hours": card.labour_hours, "parts": card.parts})

    def load(self, job_id):
        data = json.loads(self.database[job_id])
        card = JobCard(job_id, data["customer"], data["vehicle"])
        card.labour_hours = data["hours"]
        for name, price in data["parts"]:
            card.add_part(name, price)
        return card

store = JobStore({})
card = JobCard("J-104", "M. Okafor", "Ford Transit")
card.add_part("brake pads", 48.00)
card.add_part("brake fluid", 9.50)
card.add_labour(1.4)
store.save(card)
print(InvoiceFormatter().text(store.load("J-104")))
print(store.database)
```

```output
Invoice J-104 for M. Okafor (Ford Transit)
  brake pads      £  48.00
  brake fluid     £   9.50
  labour 1.5 h    £  82.50
  VAT             £  28.00
  TOTAL           £ 168.00
Company no. 09876543
{'J-104': '{"customer": "M. Okafor", "vehicle": "Ford Transit", "hours": 1.5, "parts": [["brake pads", 48.0], ["brake fluid", 9.5]]}'}
```

`json.dumps` turns dictionaries and lists into JSON text and `json.loads` reads it back; JSON is a standard text format for structured data.

All three requests are in, each in its own class. The quarter-hour rule changed one line of `JobCard`: 1.4 hours is billed as 1.5. VAT and the company number live only in `InvoiceFormatter`. JSON lives only in `JobStore`. A test of the labour rounding no longer involves invoice text or storage at all, and the accounts office can change the invoice layout without any risk to how jobs are priced or stored.

## How far to split

Single responsibility is about **reasons to change**, not about making every class tiny. A class with one method per class, `PartAdder`, `LabourAdder`, `TotalCalculator`, would scatter one responsibility (the job's contents and price) across many places, so one change to pricing would touch several of them. That is the opposite of the goal. Two useful checks:

- **Can you describe the class in one sentence without "and"?** "Holds a repair job's parts and labour and prices it" is one responsibility: the price is a fact about the job. "Prices a job and writes the invoice and saves it to disk" is three.
- **Who would ask for a change?** If two different groups of people could each ask for changes for unrelated reasons, the class is serving two masters.

Small scripts often don't need the split at all. The principle earns its keep when a program will live long enough to collect change requests from several directions.

::: challenge Take the saving out of the playlist [easy]
The `Playlist` below manages songs and also turns itself into text for saving. Split it. `Playlist` should keep `add(title, seconds)`, `remove(title)`, `total_seconds()` and the `songs` list of `(title, seconds)` tuples, with **no** saving code. A new class `PlaylistStore` gets `dumps(playlist)`, returning the text, and `loads(text)`, returning a new `Playlist` with the same name and songs. Keep the text format exactly as `to_text` writes it: the name on the first line, then one `title|seconds` line per song.

```python starter
class Playlist:
    def __init__(self, name):
        self.name = name
        self.songs = []

    def add(self, title, seconds):
        self.songs.append((title, seconds))

    def remove(self, title):
        self.songs = [s for s in self.songs if s[0] != title]

    def total_seconds(self):
        return sum(seconds for _, seconds in self.songs)

    def to_text(self):
        return "\n".join([self.name] + [f"{t}|{s}" for t, s in self.songs])

    @classmethod
    def from_text(cls, text):
        name, *rows = text.split("\n")
        playlist = cls(name)
        for row in rows:
            title, seconds = row.split("|")
            playlist.add(title, int(seconds))
        return playlist

p = Playlist("Workshop radio")
p.add("Blue Monday", 448)
p.add("Heroes", 371)
print(p.to_text())
```

```python solution
class Playlist:
    def __init__(self, name):
        self.name = name
        self.songs = []

    def add(self, title, seconds):
        self.songs.append((title, seconds))

    def remove(self, title):
        self.songs = [s for s in self.songs if s[0] != title]

    def total_seconds(self):
        return sum(seconds for _, seconds in self.songs)

class PlaylistStore:
    def dumps(self, playlist):
        return "\n".join([playlist.name] + [f"{t}|{s}" for t, s in playlist.songs])

    def loads(self, text):
        name, *rows = text.split("\n")
        playlist = Playlist(name)
        for row in rows:
            title, seconds = row.split("|")
            playlist.add(title, int(seconds))
        return playlist

p = Playlist("Workshop radio")
p.add("Blue Monday", 448)
p.add("Heroes", 371)
print(PlaylistStore().dumps(p))
```

```python test
import inspect as _inspect
assert "Playlist" in dir() and "PlaylistStore" in dir(), "Define Playlist and PlaylistStore."
for _m in ["to_text", "from_text", "dumps", "loads"]:
    assert not hasattr(Playlist, _m), f"Playlist should not have {_m}: saving belongs to PlaylistStore."
_p = Playlist("Mix")
_p.add("A", 100); _p.add("B", 200); _p.add("C", 50); _p.remove("B")
assert _p.songs == [("A", 100), ("C", 50)] and _p.total_seconds() == 150, "Playlist still adds, removes and totals songs."
_store = PlaylistStore()
_text = _store.dumps(_p)
assert _text == "Mix\nA|100\nC|50", f"dumps should write the name, then title|seconds lines; got {_text!r}."
_q = _store.loads("Road trip\nX|60\nY|90")
assert isinstance(_q, Playlist) and _q.name == "Road trip" and _q.songs == [("X", 60), ("Y", 90)], "loads should rebuild a Playlist with the same name and songs."
_r = _store.loads(_store.dumps(_q))
assert _r.name == _q.name and _r.songs == _q.songs and _r is not _q, "Saving then loading gives an equal, separate playlist."
assert _store.loads("Empty").songs == [], "A playlist with no songs is just its name."
_looked_up = set()
for _name, _f in vars(Playlist).items():
    if callable(_f) and not _name.startswith("__"):
        _looked_up |= set(getattr(_f, "__func__", _f).__code__.co_names)
assert "split" not in _looked_up and "join" not in _looked_up, "Playlist's ordinary methods should do nothing with the save format: no split or join."
"SUCCESS: Playlist now changes only for playlist rules, and PlaylistStore only when the save format changes."
```

Hint: Delete `to_text` and `from_text` from `Playlist`. Put the same code into `PlaylistStore.dumps(self, playlist)` (reading `playlist.name` and `playlist.songs`) and `PlaylistStore.loads(self, text)` (building `Playlist(name)`).
:::

::: challenge Split the library desk [medium]
A library's `Desk` class keeps the catalogue of books, records loans and writes the overdue report, so changes from cataloguers, desk staff and managers all land in it. Split it into:

- `Catalogue`, with `add(isbn, title)`, `title(isbn)` (raise `KeyError` for an unknown ISBN) and `isbn in catalogue` support via `__contains__`;
- `Loans`, with `lend(isbn, member, day)` (raise `ValueError` if that book is already out), `give_back(isbn)`, `on_loan(isbn)` returning True or False, and `overdue(today, limit=14)` returning a list of `(isbn, member, days_late)` for loans older than `limit` days, sorted by most days late first (ties by ISBN);
- a function `overdue_report(catalogue, loans, today)` returning one line per overdue loan, `f"{title} - {member} - {days_late} days late"`, joined with newlines, in the same order.

Days are plain whole numbers (day 30 is 30 days after day 0). A loan made on day d is `today - d - limit` days late when that is positive.

```python starter
class Desk:
    def __init__(self):
        self.books = {}
        self.loans = {}

    def add_book(self, isbn, title):
        self.books[isbn] = title

    def lend(self, isbn, member, day):
        if isbn in self.loans:
            raise ValueError(f"{isbn} is already on loan")
        self.loans[isbn] = (member, day)

    def give_back(self, isbn):
        del self.loans[isbn]

    def overdue_report(self, today, limit=14):
        late = []
        for isbn, (member, day) in self.loans.items():
            days_late = today - day - limit
            if days_late > 0:
                late.append((-days_late, isbn, member))
        return "\n".join(f"{self.books[isbn]} - {member} - {-d} days late" for d, isbn, member in sorted(late))

desk = Desk()
desk.add_book("111", "Dune")
desk.add_book("222", "Emma")
desk.lend("111", "Sam", 1)
desk.lend("222", "Lee", 10)
print(desk.overdue_report(30))
```

```python solution
class Catalogue:
    def __init__(self):
        self._titles = {}

    def add(self, isbn, title):
        self._titles[isbn] = title

    def title(self, isbn):
        return self._titles[isbn]

    def __contains__(self, isbn):
        return isbn in self._titles

class Loans:
    def __init__(self):
        self._out = {}

    def lend(self, isbn, member, day):
        if isbn in self._out:
            raise ValueError(f"{isbn} is already on loan")
        self._out[isbn] = (member, day)

    def give_back(self, isbn):
        del self._out[isbn]

    def on_loan(self, isbn):
        return isbn in self._out

    def overdue(self, today, limit=14):
        late = []
        for isbn, (member, day) in self._out.items():
            days_late = today - day - limit
            if days_late > 0:
                late.append((isbn, member, days_late))
        return sorted(late, key=lambda item: (-item[2], item[0]))

def overdue_report(catalogue, loans, today):
    return "\n".join(f"{catalogue.title(isbn)} - {member} - {days} days late" for isbn, member, days in loans.overdue(today))

catalogue, loans = Catalogue(), Loans()
catalogue.add("111", "Dune")
catalogue.add("222", "Emma")
loans.lend("111", "Sam", 1)
loans.lend("222", "Lee", 10)
print(overdue_report(catalogue, loans, 30))
```

```python test
for _n in ["Catalogue", "Loans", "overdue_report"]:
    assert _n in dir(), f"Define {_n}."
_c = Catalogue()
_c.add("111", "Dune"); _c.add("222", "Emma")
assert _c.title("222") == "Emma" and "111" in _c and "999" not in _c, "Catalogue stores titles and supports `in`."
try:
    _c.title("999")
    assert False, "title() of an unknown ISBN should raise KeyError."
except KeyError:
    pass
_l = Loans()
_l.lend("111", "Sam", 1); _l.lend("222", "Lee", 10)
assert _l.on_loan("111") and not _l.on_loan("333"), "on_loan reports whether a book is out."
try:
    _l.lend("111", "Kim", 5)
    assert False, "Lending a book that is already out should raise ValueError."
except ValueError:
    pass
assert _l.overdue(30) == [("111", "Sam", 15), ("222", "Lee", 6)], f"overdue(30) should be [('111', 'Sam', 15), ('222', 'Lee', 6)]; got {_l.overdue(30)}."
assert _l.overdue(15) == [], "A loan from day 1 is not late on day 15: 15 - 1 - 14 = 0."
assert _l.overdue(30, limit=20) == [("111", "Sam", 9)], "The limit can be changed."
_l.give_back("111")
assert not _l.on_loan("111") and _l.overdue(30) == [("222", "Lee", 6)], "Returned books are no longer late."
_l.lend("333", "Ana", 10); _c.add("333", "Ivanhoe")
assert _l.overdue(30) == [("222", "Lee", 6), ("333", "Ana", 6)], "Equal lateness: order by ISBN."
assert overdue_report(_c, _l, 30) == "Emma - Lee - 6 days late\nIvanhoe - Ana - 6 days late", f"Report was {overdue_report(_c, _l, 30)!r}."
assert overdue_report(_c, Loans(), 30) == "", "No loans, empty report."
assert not hasattr(Catalogue, "lend") and not hasattr(Loans, "add") and not hasattr(Loans, "title"), "Keep catalogue and loan jobs in their own classes."
class _OnlyTitles:
    def title(self, isbn):
        return "T"
class _OnlyOverdue:
    def overdue(self, today, limit=14):
        return [("1", "X", 3)]
assert overdue_report(_OnlyTitles(), _OnlyOverdue(), 30) == "T - X - 3 days late", "overdue_report should use only the public methods title() and overdue(), not the classes' internal data."
"SUCCESS: Cataloguing, lending and reporting each live in one place, and the report is a function that uses the other two."
```

Hint: Move the `books` dict and its methods into `Catalogue`, the `loans` dict and its methods into `Loans`. `overdue` collects `(isbn, member, days_late)` when `days_late > 0` and sorts with `key=lambda item: (-item[2], item[0])`. The report asks `loans.overdue(today)` for the late loans and `catalogue.title(isbn)` for each title.
:::

::: challenge Find the responsibilities automatically [hard]
Extend the attribute clue into a tool. Write `cohesion_groups(cls)`. Look at every method defined directly in the class except `__init__`. A method **uses** a name if the name is in `names_used(method)` (the lesson's function) and is one of the class's own names: a name `__init__` looks up, or a key of `vars(cls)`. Two methods are **connected** if they use a common name, or if one uses the other's name (a method that calls `self.total()` connects to `total`). Groups are formed by following connections, so if A connects to B and B to C, all three are one group. Return a list of groups: each group a sorted list of method names, and the groups sorted by their first name. Joining connected methods is the connected-components problem from the graph lessons: use union-find or a depth-first search.

```python starter
def cohesion_groups(cls):
    return []

class Sensor:
    def __init__(self):
        self.readings, self.unit, self.alarm_level, self.contacts = [], "C", 30, []
    def record(self, value):
        self.readings.append(value)
    def mean(self):
        return sum(self.readings) / len(self.readings)
    def label(self):
        return f"{self.mean():.1f} {self.unit}"
    def add_contact(self, email):
        self.contacts.append(email)
    def alert_needed(self):
        return any(r > self.alarm_level for r in self.readings)

print(cohesion_groups(Sensor))
```

```python solution
def cohesion_groups(cls):
    methods = {name: f for name, f in vars(cls).items() if callable(f) and not isinstance(f, type) and name != "__init__"}
    own_names = (names_used(cls.__init__) if "__init__" in vars(cls) else set()) | set(vars(cls))
    parent = {}
    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def union(a, b):
        parent[find(a)] = find(b)
    for name, f in methods.items():
        find(name)
        for used in names_used(getattr(f, "__func__", f)) & own_names:
            union(name, used)
    groups = {}
    for name in methods:
        groups.setdefault(find(name), []).append(name)
    return sorted(sorted(g) for g in groups.values())

class Sensor:
    def __init__(self):
        self.readings, self.unit, self.alarm_level, self.contacts = [], "C", 30, []
    def record(self, value):
        self.readings.append(value)
    def mean(self):
        return sum(self.readings) / len(self.readings)
    def label(self):
        return f"{self.mean():.1f} {self.unit}"
    def add_contact(self, email):
        self.contacts.append(email)
    def alert_needed(self):
        return any(r > self.alarm_level for r in self.readings)

print(cohesion_groups(Sensor))
```

```python test
assert "cohesion_groups" in dir(), "Keep the function's name as cohesion_groups."
class _Sensor:
    def __init__(self):
        self.readings, self.unit, self.alarm_level, self.contacts = [], "C", 30, []
    def record(self, value):
        self.readings.append(value)
    def mean(self):
        return sum(self.readings) / len(self.readings)
    def label(self):
        return f"{self.mean():.1f} {self.unit}"
    def add_contact(self, email):
        self.contacts.append(email)
    def alert_needed(self):
        return any(r > self.alarm_level for r in self.readings)
_g = cohesion_groups(_Sensor)
assert _g == [["add_contact"], ["alert_needed", "label", "mean", "record"]], f"Sensor: record, mean and alert_needed share readings, label calls mean; add_contact stands alone (it and record both call append, but append is not one of the class's names). Got {_g}."
class _Two:
    def __init__(self):
        self.a = self.b = 0
    def f(self):
        return self.a
    def g(self):
        return self.b
    def h(self):
        return len([1])
_g = cohesion_groups(_Two)
assert _g == [["f"], ["g"], ["h"]], f"Methods sharing none of the class's names are separate groups, even one using none; got {_g}."
class _Chain:
    def __init__(self):
        self.x = self.y = self.z = self.w = 0
    def p(self):
        return self.x
    def q(self):
        return self.x + self.y
    def r(self):
        return self.y + self.z
    def s(self):
        return self.z
    def t(self):
        return self.w
_g = cohesion_groups(_Chain)
assert _g == [["p", "q", "r", "s"], ["t"]], f"Connections chain: p-q share x, q-r share y, r-s share z, so p, q, r and s form one group; got {_g}."
class _Calls:
    def __init__(self):
        self.v = 1
    def outer(self):
        return self.inner() * 2
    def inner(self):
        return 3
    def lone(self):
        return self.v
_g = cohesion_groups(_Calls)
assert _g == [["inner", "outer"], ["lone"]], f"A method calling self.inner() is connected to inner; got {_g}."
class _Empty:
    pass
assert cohesion_groups(_Empty) == [], "A class with no methods has no groups."
"SUCCESS: Shared names and calls link methods into groups; a class whose methods fall into separate groups is usually doing separate jobs."
```

Hint: Collect the methods from `vars(cls)`, skipping `__init__`. Work out `own_names` as in `attributes_used` (a class may have no `__init__` of its own). Make a union-find over names: for each method, union its own name with every own name it uses, `names_used(method) & own_names`. Methods sharing an attribute meet through that attribute's entry, and a call meets the called method directly. Group methods by their root, sort each group, and sort the list of groups.
:::

## What you learned

- A class should have one responsibility, meaning one reason to change. Different groups of people requesting changes for unrelated reasons point to separate responsibilities.
- Which attributes each method uses is a useful clue: methods serving one responsibility tend to share data, and groups that share nothing are often separate jobs. The clue informs judgement; it does not replace it.
- Split domain rules from presentation and persistence. The formatter and the store use the domain class, which knows nothing about them, so the most valuable code depends on the least.
- Split by reason to change, not by size. One method per class scatters a responsibility; a small script may need no split at all.

The next lesson looks at the boundary of a class: hiding its internal state behind methods, and writing down the interface other code may rely on, with protocols and abstract base classes.
