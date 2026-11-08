# Tool Manager: a code-along PySide6 + SQLite course

You will build a desktop app that tracks which **setups** (part number + tab) run on which **machines**, shows each machine's tool data, keeps a history of who changed what, and updates live when someone else saves.

## How this works

Every lesson is a sequence of **small steps**. Each step has the same shape:

1. **Why:** a few lines on the idea.
2. **Code:** short enough to type by hand. Type it, don't paste it.
3. **Predict:** before you run it, write down (or say out loud) what you think it prints. Guessing first is what makes it stick.
4. **Run it and compare.** Under every runnable block is the output I got when I ran it for real.
5. **Try:** a small change that makes you see why the code is the way it is.
6. **How it works:** at the end of the step, a written explanation of what the code does and *why*, with traces on real values. Read it after you've run the code and compared the output. This is the part to study.

Block types:

- `# run it`: runs on its own. Paste it into your runnable editor.
- `# run it (needs PySide6, but opens no window)`: same, but Qt must be installed.
- `# run it (opens a window...)`: a Qt window. Run it on your own machine.
- `# name.py (new file)` or `(add to the bottom)`: the project grows a few lines at a time. The *Output* under a run block is what you should see **if every earlier file step is in place**.
- A **red/green diff** (`-` old line, `+` new line) means: edit that spot in the file.

I ran every block, in order, in a clean folder, and then ran a full test of the finished project (two simulated users, live refresh, locked database, vanished tab). Timestamps in outputs will differ from yours.

**Setup** (Python 3.10+):

```
py -m pip install PySide6 openpyxl
```

Make a folder called `toolmgr` and put every `.py` file in it. Run scripts from inside that folder.

## The shape of the app

Three layers. Each only talks to the one below it, and only in dataclasses.

```
ui.py          Qt widgets. No SQL. No Excel.
repository.py  All the SQL. No Qt. No Excel.
scraper.py     Excel grids -> dataclasses. No Qt. No SQL.
```

When something breaks at work, this tells you where to look.

## Assumptions about your real environment

I couldn't see your real files or shared drive. Each of these is a possible "special case" later.

| Assumption | If wrong, change |
|---|---|
| Setup tabs match a regex (I use `^OP\d+$` as a stand-in for yours) | `config.TAB_RE` |
| Columns A to H: tool no, description, diameter, collet, coolant, process, stickout, holder | `scraper.py` |
| Description, diameter, collet, holder are identical on every process row of a tool | the table split in Lesson 1 |
| Part numbers never contain `_` | `SetupKey.from_string` |
| SQLite is OK for the shared database | **the warning in Lesson 4** |

---

# Lesson 1: Thinking in entities

**Goal:** turn "a pile of requirements" into entities, keys and relationships. We'll do the method first, then run tiny experiments so the key ideas are things you've seen happen.

## Step 1.1: The method

Do these in order, every time:

1. List the **nouns**: candidate entities.
2. For each, ask **"what identifies one?"** That's its key. If it can't be identified without another entity's key, it's a **weak entity**.
3. List the **verbs** between nouns: relationships.
4. For each relationship: how many on each side (**cardinality**), and must one exist (**participation**)?
5. Every **many-to-many** becomes its own entity.
6. For every column ask "what does it depend on?" (**normalization**).

## Step 1.2: Apply it to your app

| Entity | Key | Weak? |
|---|---|---|
| Part | `part_number` | no |
| Machine | `machine_id` (OM6) | no |
| MachineFamily | `family_id` (OM) | no |
| Setup | `(part_number, tab)` | **yes**, on Part |
| Tool | `(part_number, tab, tool_no)` | **yes**, on Setup |
| ToolProcess | `(part_number, tab, tool_no, process_seq)` | **yes**, on Tool |
| Assignment | `(part_number, tab, machine_id)` | associative |
| AssignmentEvent | `event_id` | log |

Three decisions inside that table:

- **No global Tool entity.** You said tool 5 on five different parts shows five times, even when the descriptions disagree. A global Tool table would claim they're the same thing. So a tool is identified only *inside* a setup.
- **Assignment is the many-to-many** between Setup and Machine. A setup can run on several machines (your row of checkboxes), and a machine runs several setups.
- **Description, diameter, collet, holder depend only on `(setup, tool_no)`.** They repeat on every process row. Depending on *part* of a key is a 2NF violation, so they live in **Tool**. `process`, `coolant`, `stickout` depend on the whole key, so they live in **ToolProcess**. (Check this on a real multi-process tool at work: if a column ever differs between a tool's rows, it belongs on the lower table.)

"Used / unused" is **derived**: a setup is used if at least one Assignment exists. You compute it, you don't store it.

## Step 1.3: See a composite key work

**Why:** "weak entity" is abstract until you watch a table refuse a duplicate.

```python
# run it
import sqlite3

con = sqlite3.connect(":memory:", isolation_level=None)
con.execute("PRAGMA foreign_keys = ON")
con.executescript("""
CREATE TABLE part (part_number TEXT PRIMARY KEY);
CREATE TABLE setup (
    part_number TEXT NOT NULL REFERENCES part(part_number),
    tab         TEXT NOT NULL,
    PRIMARY KEY (part_number, tab)
);
""")
con.execute("INSERT INTO part VALUES ('123345')")
con.execute("INSERT INTO setup VALUES ('123345', 'OP10')")
con.execute("INSERT INTO setup VALUES ('123345', 'OP20')")   # same part, new tab

try:
    con.execute("INSERT INTO setup VALUES ('123345', 'OP10')")
except sqlite3.IntegrityError as e:
    print("duplicate  ->", e)

try:
    con.execute("INSERT INTO setup VALUES ('999999', 'OP10')")
except sqlite3.IntegrityError as e:
    print("orphan     ->", e)
```

Output:

```text
duplicate  -> UNIQUE constraint failed: setup.part_number, setup.tab
orphan     -> FOREIGN KEY constraint failed
```

**Predict:** which of the four inserts fail, and what are the two messages?

Notice the key `(part_number, tab)` is made of two columns, and `part_number` is *also* a foreign key. **That is the test for a weak entity: its foreign key is part of its own primary key.**

**Try:** change the third insert's tab to `'OP30'`. Does it still fail?

### How it works

**A key is a promise the database enforces.** `PRIMARY KEY (part_number, tab)` doesn't mean "part_number is unique" and "tab is unique". It means *the pair* is unique. `('123345','OP10')` and `('123345','OP20')` are different pairs, so both are allowed. Insert the first pair again and the database refuses, because it keeps an index of every pair it has seen and checks that index on every insert.

`REFERENCES part(part_number)` is a second promise: "this value must already exist in the `part` table." On every insert into `setup`, the database does a lookup in `part`. If the lookup finds nothing, the insert is refused.

Trace the four inserts:

| insert | pair unique? | part exists? | result |
|---|---|---|---|
| `('123345','OP10')` | yes, first | yes | accepted |
| `('123345','OP20')` | yes, new pair | yes | accepted |
| `('123345','OP10')` again | **no** | yes | `UNIQUE constraint failed` |
| `('999999','OP10')` | yes | **no** | `FOREIGN KEY constraint failed` |

**Why this matters later:** you never write code that checks "does this assignment already exist?" or "is this part real?" The database does it, even if your code has a bug. Constraints are the safety net under your Python.

## Step 1.4: The trap

**Why:** SQLite has a default that will silently undermine everything above.

```python
# run it
import sqlite3

con = sqlite3.connect(":memory:", isolation_level=None)
con.executescript("""
CREATE TABLE part (part_number TEXT PRIMARY KEY);
CREATE TABLE setup (
    part_number TEXT NOT NULL REFERENCES part(part_number),
    tab TEXT NOT NULL,
    PRIMARY KEY (part_number, tab)
);
""")
# Note: no PRAGMA this time.
con.execute("INSERT INTO setup VALUES ('999999', 'OP10')")    # no such part!
print(con.execute("SELECT * FROM setup").fetchall())
```

Output:

```text
[('999999', 'OP10')]
```

**Predict:** error or no error?

No error. **SQLite ignores foreign keys unless you run `PRAGMA foreign_keys = ON` on every connection.** Our repository will do this in its constructor so you never forget.

### How it works

`PRAGMA foreign_keys = ON` is a setting on the **connection**, not on the database file. It isn't saved. Every time your program opens the file, the connection starts with the setting off, because SQLite has to stay compatible with databases from before foreign keys existed.

That's why the trap is dangerous: the `REFERENCES` clause is stored in the file and looks right, but nothing reads it unless the connection turned enforcement on. A bug where one code path forgets the PRAGMA would let bad rows in, and the schema would still look perfect when you inspect it.

The fix is structural: the one place in the app that opens a connection (`Repository.__init__`, Lesson 4) runs the PRAGMA, and nothing else opens connections. You can't forget a line that only exists once.

## Step 1.5: Two ways to store history

- **Temporal rows:** each assignment has `assigned_at` and `unassigned_at`. Easy for "where was it in March?", clumsy for "what did Bob change today?"
- **Event log:** the assignment table holds only *current* state; a separate append-only table records every change. Tab 2 reads current state constantly, and "who, which PC, when" are exactly the log's columns.

We use the **event log**.

## Review cards

- **Q:** What makes an entity weak? **A:** Its foreign key is part of its own primary key.
- **Q:** What do you do with a many-to-many? **A:** Make it an associative entity keyed by both sides.
- **Q:** What question drives normalization? **A:** What does this column depend on: the whole key, part of it, or something else?
- **Q:** Why is there no global Tool table here? **A:** A tool number only means something inside one setup.
- **Q:** Stored or computed: "is this setup used"? **A:** Computed. A stored copy can drift.
- **Q:** What must you do on each SQLite connection? **A:** `PRAGMA foreign_keys = ON`.

---

# Lesson 2: Qt in five small experiments

**Goal:** understand the event loop, widgets, signals and layouts, the four ideas every Qt app is built from. Nothing here goes into the project yet. Run each one and poke at it.

## Step 2.1: A window

```python
# run it (opens a window; close it to finish)
import sys
from PySide6.QtWidgets import QApplication, QLabel

app = QApplication(sys.argv)
label = QLabel("Hello, shop floor")
label.show()
sys.exit(app.exec())
```

**Predict:** what happens if you delete the last line?

Delete it and the window flashes and the program ends. **`app.exec()` starts the event loop**: a loop that waits for clicks, key presses and timer ticks and calls your code. Nothing is interactive until it runs. Everything you write in Qt is a function the loop calls later.

### How it works

Here is the event loop in plain Python. It isn't real Qt code, just the idea:

```python
while window_is_open:
    event = wait_for_next_event()      # click, key press, timer tick, window resize...
    handler = find_handler_for(event)
    handler()                          # YOUR function runs here
```

`app.exec()` *is* that loop. Your code never calls itself in a loop. You hand Qt functions ("when this button is clicked, run this"), and the loop calls them when the event happens.

This explains two things you'll hit constantly. First, **if your function takes 10 seconds, the whole window freezes**, because the loop is stuck inside your function and can't process the next click or redraw. (That's the note in Lesson 8 about polling on the UI thread.) Second, **code after `app.exec()` doesn't run until the window closes**, because `exec()` doesn't return until the loop ends.

Deleting the last line makes the window flash and vanish because the script reaches its end, Python exits, and the window is destroyed with it. No loop ever ran.

## Step 2.2: A click does something

```python
# run it (opens a window; close it to finish)
import sys
from PySide6.QtWidgets import QApplication, QPushButton

app = QApplication(sys.argv)
count = 0


def on_click():
    global count
    count += 1
    button.setText(f"Clicked {count} times")


button = QPushButton("Click me")
button.clicked.connect(on_click)      # <- no parentheses!
button.show()
sys.exit(app.exec())
```

`button.clicked` is a **signal**. `connect(on_click)` registers a **slot**. When the button is clicked, the event loop calls `on_click()`.

**Try:** change it to `connect(on_click())`. It now calls `on_click` *immediately* (when you run it) and connects whatever it returned. That is the most common beginner bug: **pass the function, don't call it.**

### How it works

`connect(on_click)` stores a **reference to the function**. In Python a function is an object like any other. `on_click` (no parentheses) is the object itself. `on_click()` is a *call* that runs the function and gives you its return value.

So with `button.clicked.connect(on_click)`, Qt keeps `on_click` in a list attached to that button's `clicked` signal. When the click event arrives, the loop walks the list and calls each function, now, with parentheses, on your behalf.

With `connect(on_click())`, Python evaluates the inside first. `on_click()` runs immediately (the counter goes up before the window even shows), returns `None`, and then `connect(None)` registers nothing useful. Rule of thumb: **in `connect(...)`, if you see parentheses after the function name, it's a bug.** The exception is when you deliberately build a function, as with `lambda`.

The `global count` line is needed because `on_click` *assigns* to `count`. Without it, Python assumes `count` is a new local variable inside the function and complains it's used before assignment.

## Step 2.3: Signals are not only for widgets

```python
# run it
from PySide6.QtCore import QObject, Signal


class Doorbell(QObject):
    pressed = Signal(str)        # a signal that carries one string


bell = Doorbell()
bell.pressed.connect(lambda who: print("ding, it's", who))
bell.pressed.connect(lambda who: print("logging a visit from", who))
bell.pressed.emit("alice")
```

Output:

```text
ding, it's alice
logging a visit from alice
```

**Predict:** how many lines print, and in what order?

Two things to take: **one signal can have many listeners** (our live-update feature is one signal with four listeners), and **you can define your own signals** (`Signal()` with no arguments means "something happened").

### How it works

Under the hood, a signal is a list of functions plus an `emit` method that walks the list:

```python
class FakeSignal:
    def __init__(self):
        self.slots = []
    def connect(self, fn):
        self.slots.append(fn)
    def emit(self, *args):
        for fn in self.slots:
            fn(*args)
```

Qt's version adds thread safety and a few other features, but this is the core. That's why both of your lambdas ran, in the order you connected them, and why Lesson 8 can have one `data_changed` signal wake four tabs: `emit()` walks the list.

`Signal(str)` declares what the emitted value's type is, so `emit("alice")` hands `"alice"` to every connected function. `lambda who: print(...)` is a small anonymous function with one parameter. It's used here only because it's shorter than writing `def`.

The most important property for design: **the emitter doesn't know who is listening.** `Doorbell` has no reference to either lambda. That's what lets you add a fifth tab later by adding one `connect` line, without touching the code that emits.

## Step 2.4: Layouts, and widgets created from data

**Why:** you never place widgets by pixel. You put them in a layout. This is also the technique for building tab 1: loop over data, create a widget per item, keep them in a dict.

```python
# run it (opens a window; close it to finish)
import sys
from PySide6.QtWidgets import (QApplication, QCheckBox, QGridLayout, QLabel,
                               QPushButton, QWidget)

rows = ["123345_OP10", "123345_OP20"]
columns = ["OM1", "OM6", "DV1"]

app = QApplication(sys.argv)
window = QWidget()
grid = QGridLayout(window)
boxes = {}                                   # (row, column) -> checkbox

for col, name in enumerate(columns, start=1):
    grid.addWidget(QLabel(name), 0, col)     # header row
for row, row_name in enumerate(rows, start=1):
    grid.addWidget(QLabel(row_name), row, 0)
    for col, name in enumerate(columns, start=1):
        box = QCheckBox()
        grid.addWidget(box, row, col)        # widget, row, column
        boxes[(row_name, name)] = box


def show_checked():
    print(sorted(k for k, b in boxes.items() if b.isChecked()))


button = QPushButton("Print checked")
button.clicked.connect(show_checked)
grid.addWidget(button, len(rows) + 1, 0)

window.show()
sys.exit(app.exec())
```

Tick a few boxes, click the button, and watch the terminal.

The key idea is `boxes`. Qt has no "give me the checkbox at row 3, column 2". **You keep your own dict, keyed by something meaningful**, and reading the screen back is a loop over it.

### How it works

`enumerate(columns, start=1)` yields `(1, "OM1")`, `(2, "OM6")`, ... instead of starting at 0. We start at 1 because column 0 holds the row labels, so the checkboxes begin one column over. That's an easy off-by-one to make: if you drop `start=1`, the first machine header lands on top of the row-label column.

`grid.addWidget(box, row, col)` places a widget into a cell. The layout doesn't remember *which* checkbox is where in any way you can ask about by name. Once you've put 6 checkboxes in, Qt can tell you "the widget at row 1, column 2", but that's not useful: you'd have to translate back to "123345_OP10 on OM6" yourself.

So the dict `boxes[(row_name, name)] = box` is your own index, keyed by the *meaning* of each box. Reading the screen back is one comprehension over the dict:

```python
sorted(k for k, b in boxes.items() if b.isChecked())
```

For every `(key, checkbox)` pair, keep the key if the box is ticked. The result is a list of `(row_name, column_name)` tuples, which is almost exactly what the `assignment` table stores.

Notice that the dict is built in the *same loop* that creates the widgets. That's the habit: **whenever you create a widget from data, record it by its data-key in the same breath.** Trying to find them again later is much harder.

## Step 2.5: A table with checkable cells

A grid of loose widgets gets slow and awkward with hundreds of parts. A `QTableWidget` gives you headers that stay put while you scroll, and a checkbox is just a flag on a cell. Tab 1 will use this.

```python
# run it (opens a window; close it to finish)
import sys
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication, QTableWidget, QTableWidgetItem

app = QApplication(sys.argv)
table = QTableWidget(3, 2)
table.setHorizontalHeaderLabels(["OM1", "OM6"])
table.setVerticalHeaderLabels(["123345_OP10", "123345_OP20", "200981_OP10"])

for row in range(3):
    for col in range(2):
        item = QTableWidgetItem()
        item.setFlags(Qt.ItemFlag.ItemIsUserCheckable | Qt.ItemFlag.ItemIsEnabled)
        item.setCheckState(Qt.CheckState.Unchecked)
        table.setItem(row, col, item)

table.item(0, 1).setCheckState(Qt.CheckState.Checked)   # tick one from code
table.itemChanged.connect(
    lambda item: print("changed:", item.row(), item.column(), item.checkState()))
table.resize(400, 200)
table.show()
sys.exit(app.exec())
```

Click some cells and watch `changed:` print. **`itemChanged` fires on every checkbox click**, and we'll use it to show "N unsubmitted changes".

Notice the full enum names (`Qt.CheckState.Checked`). That's the PySide6 style, and your editor can autocomplete them.

### How it works

A `QTableWidgetItem` is not a widget. It's a small piece of *data* about one cell: its text, its check state, its flags. The table draws it for you. That's why a table of 5000 cells is cheap and 5000 loose `QCheckBox` widgets is not: widgets are real window objects (each one costs memory and layout time), and items are just records.

**Flags** control what the user can do with the cell. They're bit flags combined with `|` ("or"): `ItemIsUserCheckable | ItemIsEnabled` means "can be ticked, and isn't greyed out". Leave out `ItemIsEnabled` and the cell is greyed and ignores clicks. Leave out `ItemIsUserCheckable` and no checkbox appears at all.

`setCheckState(Qt.CheckState.Checked)` ticks it from code. Notice you're changing the *item* and the table redraws. You never touch a widget.

`itemChanged` is the table's signal for "something about a cell changed". Ticking a box, un-ticking it, and setting it from code all fire it. In Lesson 6 we use it to keep the "N unsubmitted changes" label current, and in Lesson 6 we'll also see why you sometimes need to silence it.

## Review cards

- **Q:** What does `app.exec()` do? **A:** Starts the event loop, which waits for events and calls your code.
- **Q:** What's wrong with `clicked.connect(save())`? **A:** It calls `save` right away. Pass the function without parentheses.
- **Q:** Signal vs slot? **A:** A signal is an event something emits; a slot is the function you connect to it.
- **Q:** Why keep a dict of widgets created from data? **A:** Qt can't look up "the widget for this item". Your dict is the lookup, and reading the screen is a loop over it.

---

# Lesson 3: Dataclasses and the scraper

**Goal:** define the vocabulary the whole app speaks, then write the code that turns Excel grids into it. Most of your future special cases live in this lesson's code.

## Step 3.1: Why dataclasses

Data travelling as tuples (`("123345", "OP10")`) makes you remember that index 1 is the tab. Dicts (`row["prt"]`) fail only when that line runs. A dataclass names the fields and writes `__init__`, `__repr__` and `__eq__` for you.

```python
# run it
from dataclasses import dataclass


@dataclass
class Tool:
    tool_no: int
    description: str
    holder: str = ""        # fields with defaults must come last


t = Tool(1, "1/2 EM")
print(t)
print(t == Tool(1, "1/2 EM"))
print(t.holder == "")
```

Output:

```text
Tool(tool_no=1, description='1/2 EM', holder='')
True
True
```

**Predict:** what does `print(t)` look like without you writing a `__repr__`?

**Try:** pass a string for `tool_no`: `Tool("one", "x")`. Python doesn't stop you. Type hints are documentation for you and your editor, not enforcement.

### How it works

`@dataclass` reads your field list and writes methods for you. This class:

```python
@dataclass
class Tool:
    tool_no: int
    description: str
    holder: str = ""
```

is the same as writing this by hand:

```python
class Tool:
    def __init__(self, tool_no, description, holder=""):
        self.tool_no = tool_no
        self.description = description
        self.holder = holder

    def __repr__(self):
        return f"Tool(tool_no={self.tool_no!r}, description={self.description!r}, holder={self.holder!r})"

    def __eq__(self, other):
        return (self.tool_no, self.description, self.holder) == (other.tool_no, other.description, other.holder)
```

That's the whole trick. Three methods you'd write the same way every time, generated from the list of names.

`__eq__` matters most for us. Without it, `Tool(1, "x") == Tool(1, "x")` is `False`, because Python's default compares *identity* ("are these the same object in memory?"). The dataclass version compares *fields*. This is what makes `Assignment(s, "OM1") in some_set` work later: two separately created objects with the same values count as equal.

Fields with defaults must come last for the same reason as function parameters: `def f(a="x", b)` isn't valid Python, because when someone calls `f(5)` there's no way to know if `5` is meant for `a` or `b`.

## Step 3.2: The mutable-default trap

```python
# run it
from dataclasses import dataclass, field


@dataclass
class Tool:
    tool_no: int
    tags: list[str] = field(default_factory=list)


a, b = Tool(1), Tool(2)
a.tags.append("carbide")
print(a.tags, b.tags)          # b's list is its own

try:
    @dataclass
    class Bad:
        tags: list[str] = []   # this is rejected
except ValueError as e:
    print("ValueError:", e)
```

Output:

```text
['carbide'] []
ValueError: mutable default <class 'list'> for field tags is not allowed: use default_factory
```

**Predict:** would `b.tags` contain "carbide" too?

### How it works

Python evaluates a default value **once, when the class is defined**, not each time you create an object. So `tags: list = []` would create exactly one list, and every `Tool` would share it. Appending to `a.tags` would also change `b.tags`. That's a famous Python trap, and dataclasses refuse to let you walk into it (the `ValueError` you saw).

`field(default_factory=list)` means "don't store a list; store the *function* `list`, and call it for each new object." Each `Tool` calls `list()` and gets its own empty list. That's why your output shows `['carbide'] []`: `a`'s list was changed, `b` still has its own empty one.

You can see the one-list problem in plain Python:

```python
def add(item, bucket=[]):      # the [] is created ONCE
    bucket.append(item)
    return bucket

print(add(1))   # [1]
print(add(2))   # [1, 2]  <- surprise: same list
```

We won't use mutable defaults much in this project, but you'll see the pattern, and the error message when you forget.

## Step 3.3: `frozen=True` makes things usable as keys

**Why:** this is the most important dataclass feature for our app. A **frozen** dataclass can't be changed after creation, and that makes it *hashable*: usable as a dict key or a set member. Sets give us subtraction, and subtraction is how Submit finds what changed.

```python
# run it
from dataclasses import dataclass


@dataclass(frozen=True)
class Key:
    part: str
    tab: str


k = Key("123345", "OP10")
try:
    k.tab = "OP20"
except Exception as e:
    print(type(e).__name__)

before = {Key("1", "A"), Key("2", "B")}     # what the database says
after = {Key("2", "B"), Key("3", "C")}      # what the screen says
print("added:  ", after - before)
print("removed:", before - after)
```

Output:

```text
FrozenInstanceError
added:   {Key(part='3', tab='C')}
removed: {Key(part='1', tab='A')}
```

**Predict:** what are `added` and `removed`?

Remember `after - before`. It becomes the heart of Lesson 4.

### How it works

Python's `set` and `dict` are fast because they use **hashing**: each object is converted to a number (its hash), and that number says where in memory to look. For this to work, an object's hash must never change while it's in the set. If you could change `k.tab` after putting `k` in a set, its hash would change, and the set would look in the wrong place and never find it again.

That's why Python refuses to hash ordinary mutable objects (try putting a `list` in a set). `frozen=True` forbids changing fields after creation, so the hash is guaranteed stable, so the dataclass becomes hashable, so it can be a set member or a dict key. The `FrozenInstanceError` you saw is the guard doing its job.

Now the part you'll rely on all course: **set subtraction**.

```python
before = {Key("1","A"), Key("2","B")}
after  = {Key("2","B"), Key("3","C")}
after - before    # {Key("3","C")}    in after, not in before   -> added
before - after    # {Key("1","A")}    in before, not in after   -> removed
```

Walk it: `after - before` starts with everything in `after` and throws out anything that's also in `before`. `Key("2","B")` is in both, so it goes. `Key("3","C")` isn't in `before`, so it stays. Python knows `Key("2","B")` in both sets is "the same" because of `__eq__` and the hash, both generated from the fields.

Hold on to this shape: **"new minus old = what was added, old minus new = what was removed."** Submit in Lesson 4 is this and nothing more, with `Assignment` objects instead of `Key`.

## Step 3.4: Create `models.py`

Now the real ones. `SetupKey` is the weak entity's composite key from Lesson 1. `Assignment` is the associative entity.

```python
# models.py   (new file)
from dataclasses import dataclass


@dataclass(frozen=True)
class SetupKey:
    """Identity of a setup: part number + tab. The weak entity's key."""
    part_number: str
    tab: str

    @classmethod
    def from_string(cls, text: str) -> "SetupKey":
        # "123345_OP10" -> ("123345", "OP10").
        # SPECIAL CASE WATCH: assumes part numbers never contain "_".
        part, tab = text.split("_", 1)
        return cls(part, tab)

    def __str__(self) -> str:
        return f"{self.part_number}_{self.tab}"


@dataclass(frozen=True)
class Assignment:
    """One checkmark on tab 1: this setup runs on this machine."""
    setup: SetupKey
    machine_id: str
```

```python
# run it
from models import Assignment, SetupKey

s = SetupKey.from_string("123345_OP10")
print(repr(s))
print(str(s))
a = Assignment(s, "OM6")
print(a in {Assignment(SetupKey("123345", "OP10"), "OM6")})
```

Output:

```text
SetupKey(part_number='123345', tab='OP10')
123345_OP10
True
```

**Predict:** is the last line True or False? (Two different objects, equal fields.)

Notes: `@classmethod` is an alternate constructor (Python has only one `__init__`). `split("_", 1)` splits at the *first* underscore only, and quietly assumes part numbers have none. That's a special-case landmine, so it carries a comment. And because `SetupKey` is frozen, `Assignment` containing it is hashable too.

### How it works

**`@classmethod`** gives you a second way to build an object. In `from_string`, the first parameter `cls` is *the class itself* (`SetupKey`), not an instance, so `return cls(part, tab)` means "build a new `SetupKey`." You call it as `SetupKey.from_string("123345_OP10")`, with no object existing yet. (Python allows only one `__init__`, so alternate constructors are how you accept different inputs.)

`text.split("_", 1)` splits at the **first** underscore only, and the `1` is the maximum number of splits. `"123345_OP10".split("_", 1)` gives `["123345", "OP10"]`. Assigning to `part, tab = ...` unpacks the two-item list. If the part number itself contained an underscore (`"12_345_OP10"`), you'd get `["12", "345_OP10"]` and silently misread it. That's why the comment says special-case watch.

`__str__` is what `str(s)` and `print(s)` call. Without it you'd see `SetupKey(part_number='123345', tab='OP10')`. With it you get `123345_OP10`, the label we want on screen.

**Why `Assignment` is hashable too:** a frozen dataclass is hashable if all its fields are. `Assignment` holds a `SetupKey` (frozen, hashable) and a `str` (immutable, hashable), so `Assignment` can go in a set. Your last output line, `True`, shows two separately built objects count as the same member of a set.

## Step 3.5: `ToolLine`, one row of an Excel sheet

```python
# models.py   (add to the bottom)
@dataclass
class ToolLine:
    """One row of a sheet: one tool doing one process.
    Field order matches the Excel column order on purpose."""
    setup: SetupKey
    tool_no: int
    process_seq: int          # not in Excel; the scraper counts it
    description: str
    diameter: str = ""
    collet: str = ""
    coolant: str = ""
    process: str = ""
    stickout: str = ""
    holder: str = ""
```

```python
# run it
from models import SetupKey, ToolLine

line = ToolLine(SetupKey("123345", "OP10"), 1, 1, "1/2 EM", holder="CAT40")
print(line)
```

Output:

```text
ToolLine(setup=SetupKey(part_number='123345', tab='OP10'), tool_no=1, process_seq=1, description='1/2 EM', diameter='', collet='', coolant='', process='', stickout='', holder='CAT40')
```

`process_seq` is not in your sheet. Lesson 1's key for ToolProcess needs it, so the scraper has to invent it. **Spotting data the model needs that the source doesn't provide is a big part of the job.**

### How it works

There are three things to notice about `ToolLine`.

**It isn't frozen** because it never needs to be a key. Nothing ever asks "is this tool line in this set?" It's just a record being carried from the scraper to the database. Leaving it mutable also lets you fix a field in place if you need to.

**The field order is the Excel column order.** That's what makes the scraper's unpacking line (Step 3.8) easy to read and to check against the sheet.

**`process_seq` has no default and isn't in Excel.** That placement is on purpose. It forces whoever creates a `ToolLine` to supply a value, so you can't forget it. Fields with defaults (`diameter`, `collet`, ...) can be blank, because an empty cell is normal. A missing sequence number would be a bug.

Also note that `setup` is a whole `SetupKey` object, not two strings. Two strings (`part`, `tab`) would work, but then every function that takes a tool line's setup would have to pass two things around, and mixing them up would silently compile. One object means one thing to pass.

## Step 3.6: Scraper step 1, find a label

**Why:** your sheet has `part:` in A1 and the number beside it. We write a function that finds a label anywhere and returns the cell to its right, forgiving about spacing and case.

```python
# scraper.py   (new file)
import re
from dataclasses import dataclass, field

from models import SetupKey, ToolLine


class SkipSheet(Exception):
    """Raised with a human-readable reason when a sheet should not be scraped."""


def _squash(text) -> str:
    """'Part :' / 'PART:' / ' part: ' -> 'part:'"""
    return re.sub(r"\s+", "", str(text)).lower()


def find_label(grid, label: str):
    """Return the cell to the right of the cell whose text matches `label`, else None."""
    wanted = _squash(label)
    for row in grid:
        for col, cell in enumerate(row):
            if cell is not None and _squash(cell) == wanted and col + 1 < len(row):
                return row[col + 1]
    return None
```

```python
# run it
from scraper import find_label

grid = [["part:", 123345.0], [None, None]]
print(find_label(grid, "part:"))
print(find_label([["Part :", 5]], "part:"))
print(find_label([["PART:", 5]], "part:"))
print(find_label([["nothing", 5]], "part:"))
```

Output:

```text
123345.0
5
5
None
```

**Predict:** the first line prints `123345.0`. Why is that a problem for a part number?

### How it works

`_squash` normalizes text so different spellings compare equal:

```python
re.sub(r"\s+", "", str(text)).lower()
```

`re.sub(pattern, replacement, text)` replaces every match of the pattern. `\s+` means "one or more whitespace characters", and replacing them with `""` removes them. Then `.lower()`. So `"Part :"` becomes `"part:"`, and `" PART: "` also becomes `"part:"`. The leading underscore in `_squash` is a Python convention that means "internal helper, not for use outside this file."

`str(text)` first, because cells can be numbers or `None`, and `re.sub` needs a string. That's also why `find_label` checks `cell is not None` before trying anything: `str(None)` is `"None"`, which could accidentally match something.

`find_label` is two nested loops:

```python
for row in grid:                          # every row on the sheet
    for col, cell in enumerate(row):      # every cell in that row, with its column number
```

The `if` inside checks three things, joined with `and`, and **Python stops at the first one that's false**, which is why the order matters:

1. `cell is not None`: skip empty cells.
2. `_squash(cell) == wanted`: is this the label?
3. `col + 1 < len(row)`: is there a cell to the right? Without this check, a `PART:` label in the last column would make `row[col + 1]` crash with `IndexError`.

If all three pass, `return row[col + 1]` hands back the cell to the right and the function ends. If the loops finish without finding anything, the last line `return None` runs. Returning `None` for "not found" (instead of raising an error) lets the caller decide what that means, and in Step 3.8 the caller decides "skip this sheet."

The first output line was `123345.0`, not `123345`. Excel stores numbers as floats. That's the problem Step 3.7 solves.

## Step 3.7: Scraper step 2, tidy a cell

Excel gives you `123345.0` for a number-formatted cell, but you want the string `"123345"`. Float part numbers are a classic "why doesn't this part match" bug.

```python
# scraper.py   (add to the bottom)
FIRST_DATA_ROW = 2      # zero-based: grid[2] is Excel row 3, the first tool row
N_COLUMNS = 8           # tool no, description, diameter, collet, coolant, process, stickout, holder


def clean_cell(value) -> str:
    """Excel hands back ints, floats, None, strings. We want tidy strings."""
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))          # 123345.0 -> "123345"
    return str(value).strip()
```

```python
# run it
from scraper import clean_cell

for v in (123345.0, 0.25, None, "  holder ", 7):
    print(repr(v), "->", repr(clean_cell(v)))
```

Output:

```text
123345.0 -> '123345'
0.25 -> '0.25'
None -> ''
'  holder ' -> 'holder'
7 -> '7'
```

**Predict:** what does `0.25` become? (It's a float, but not a whole one.)

### How it works

Excel doesn't have an "integer" cell type. A cell that looks like `123345` comes out of openpyxl as the float `123345.0`. If you stored that as the part number, `"123345.0"` wouldn't match `"123345"` typed anywhere else, and you'd get two "different" parts that look identical on screen. Classic bug.

Walk the function:

| input | check | result |
|---|---|---|
| `None` | `value is None` → true | `""` |
| `123345.0` | float, and `.is_integer()` is true | `"123345"` |
| `0.25` | float, but `.is_integer()` is false, so skip that branch | falls to the last line: `"0.25"` |
| `"  holder "` | not float | `.strip()` → `"holder"` |
| `7` | an int, not float | `"7"` |

`isinstance(value, float) and value.is_integer()` is the key line: it separates "a float that is really a whole number" (`123345.0`) from "a float that has a fractional part" (`0.25`, a real diameter). We convert the first through `int()` to drop the `.0`, and leave the second alone.

Order matters: the `None` check comes first, because `None.strip()` or `isinstance(None, float)` shouldn't even be tried. And the final line, `str(value).strip()`, is the "everything else" case: it makes sure we always return a string, so later code never has to ask "is this a string or a number?"

## Step 3.8: Scraper step 3, one sheet

This is the longest function in the lesson. Read it before you type it. The new ideas: `process_seq` is **counted**, rows whose first cell isn't a number are **skipped**, and a sheet with no `part:` **raises `SkipSheet` with a reason**.

```python
# scraper.py   (add to the bottom)
def scrape_sheet(tab_name: str, grid) -> list[ToolLine]:
    part = find_label(grid, "part:")
    if part is None or clean_cell(part) == "":
        raise SkipSheet("no PART: label (or its cell is empty)")
    setup = SetupKey(clean_cell(part), tab_name)

    lines: list[ToolLine] = []
    seen: dict[int, int] = {}                      # tool_no -> rows seen so far
    for row in grid[FIRST_DATA_ROW:]:
        row = list(row) + [None] * (N_COLUMNS - len(row))     # pad short rows
        try:
            tool_no = int(float(row[0]))
        except (TypeError, ValueError):
            continue                               # blank row, note, junk: skip it
        seen[tool_no] = seen.get(tool_no, 0) + 1
        _, description, diameter, collet, coolant, process, stickout, holder = row[:N_COLUMNS]
        lines.append(ToolLine(
            setup=setup,
            tool_no=tool_no,
            process_seq=seen[tool_no],
            description=clean_cell(description),
            diameter=clean_cell(diameter),
            collet=clean_cell(collet),
            coolant=clean_cell(coolant),
            process=clean_cell(process),
            stickout=clean_cell(stickout),
            holder=clean_cell(holder),
        ))
    if not lines:
        raise SkipSheet("PART: found but no tool rows")
    return lines
```

Now feed it a grid shaped like your screenshot, with a tool that has two process rows and a junk row:

```python
# run it
from scraper import scrape_sheet, SkipSheet

grid = [
    ["part:", 123345, None, None, None, None, None, None],
    [None] * 8,
    [1, "tool description", "tool diameter", "collet", "coolant", "rough", "stickout", "holder"],
    [1, "tool description", "tool diameter", "collet", "coolant", "finish", "stickout", "holder"],
    [None, "a note someone typed", None, None, None, None, None, None],
    [2, "other tool", "tool diameter", "collet", "coolant", "rough", "stickout", "holder"],
]
for line in scrape_sheet("OP10", grid):
    print(line.setup, "tool", line.tool_no, "seq", line.process_seq, line.process)

try:
    scrape_sheet("OP20", [["nothing", "here"]])
except SkipSheet as why:
    print("skipped:", why)
```

Output:

```text
123345_OP10 tool 1 seq 1 rough
123345_OP10 tool 1 seq 2 finish
123345_OP10 tool 2 seq 1 rough
skipped: no PART: label (or its cell is empty)
```

**Predict:** how many lines print for `OP10`, and what is tool 1's second `process_seq`?

**Try:** delete the `try/except` around `int(float(row[0]))` and run again. The note row crashes the scraper. That `try/except` is where you'd add rules for junk rows at work.

**Why explicit unpacking** (`_, description, diameter, ... = row[:N_COLUMNS]`) instead of `*row[1:]`? If you add a column in Excel, this is the one line you edit, and it fails *loudly* when the count is wrong. A `*` unpack can silently put values in the wrong fields.

### How it works

**The counter.** A tool with two process rows appears twice in column A with the same number. The key needs a third part to tell them apart, and Excel doesn't provide one, so the program invents it.

```python
seen[tool_no] = seen.get(tool_no, 0) + 1
```

Read it right to left. `seen.get(tool_no, 0)` asks "what's stored under this tool number? If nothing, use 0." Add 1. Store it back. The same line runs for every row:

| row | tool_no | `seen` before | `.get(...)` gives | `seen` after | process_seq |
|---|---|---|---|---|---|
| 3 | 1 | `{}` | 0 (nothing stored yet) | `{1: 1}` | **1** |
| 4 | 1 | `{1: 1}` | 1 | `{1: 2}` | **2** |
| 5 | 2 | `{1: 2}` | 0 | `{1: 2, 2: 1}` | **1** |

The result is also used as the label (`process_seq=seen[tool_no]`), so the counter counts and names at the same time. Counting *per tool* is what makes tool 2 restart at 1. Using the row position instead would give tool 2 a `process_seq` of 3. Plain `seen[tool_no]` would crash with `KeyError` the first time a tool appears; `.get` with a fallback avoids that.

**The junk-row filter:**

```python
try:
    tool_no = int(float(row[0]))
except (TypeError, ValueError):
    continue
```

Column A can hold `3`, `3.0`, `None`, or `"Total"`. `float()` first, because `int("3.0")` fails but `int(3.0)` works. A `None` cell raises `TypeError`; a text cell like `"Total"` raises `ValueError`. Catching **only those two** matters: a bare `except:` would also swallow real bugs, like a typo in a variable name, and you'd never know. Anything unexpected still crashes loudly, which is what you want.

**The other lines:**

- `grid[FIRST_DATA_ROW:]` is a slice: everything from row index 2 onward, skipping the `part:` row and the blank row. Index 2 because Python counts from 0 and Excel's row 3 is index 2.
- `row = list(row) + [None] * (N_COLUMNS - len(row))` pads short rows. Excel often trims trailing empty cells, so a row might have only 6 values, and unpacking 8 names from 6 values would crash. `[None] * 2` is a list of two `None`s to fill the gap.
- `_, description, diameter, ... = row[:N_COLUMNS]` unpacks 8 values into 8 names. The `_` is a throwaway name for column A, which we already used as `tool_no`. `row[:N_COLUMNS]` trims anything past column H. If you ever add a column and forget to update the names, unpacking fails immediately with a clear "expected 8 values" message. That's the loud failure we want instead of data in the wrong field.
- `raise SkipSheet(...)` *stops the function* and hands a reason up to whoever called it. That's Step 3.9.

## Step 3.9: Scraper step 4, many sheets and a skip report

A scrape that silently drops sheets is a nightmare to support. So `scrape_all` returns the lines **and a report of what it skipped and why**. It also catches two files claiming the same setup.

```python
# scraper.py   (add to the bottom)
@dataclass
class ScrapeResult:
    lines: list[ToolLine] = field(default_factory=list)
    skipped: list[tuple[str, str]] = field(default_factory=list)   # (where, reason)


def scrape_all(files: dict[str, dict[str, list[list]]], tab_re: re.Pattern) -> ScrapeResult:
    """files: file name -> {tab name -> grid}. Returns every tool line plus a skip report."""
    result = ScrapeResult()
    claimed: dict[SetupKey, str] = {}              # which file first produced each setup key
    for file_name, book in files.items():
        for tab_name, grid in book.items():
            where = f"{file_name}[{tab_name}]"
            if not tab_re.match(tab_name):
                result.skipped.append((where, "tab name does not match the setup pattern"))
                continue
            try:
                lines = scrape_sheet(tab_name, grid)
            except SkipSheet as reason:
                result.skipped.append((where, str(reason)))
                continue
            key = lines[0].setup
            if key in claimed:
                result.skipped.append((where, f"duplicate of {claimed[key]} ({key})"))
                continue
            claimed[key] = where
            result.lines.extend(lines)
    return result
```

```python
# run it
import re
from scraper import scrape_all

good = [["part:", 100], [None, None], [1, "d", "dia", "c", "cool", "p", "s", "h"]]
files = {
    "100.xlsx": {"OP10": good, "Notes": [["just notes"]], "OP30": [["x", "y"]]},
    "copy of 100.xlsx": {"OP10": good},
}
result = scrape_all(files, re.compile(r"^OP\d+$"))
print(len(result.lines), "tool line(s)")
for where, reason in result.skipped:
    print("skipped", where, "->", reason)
```

Output:

```text
1 tool line(s)
skipped 100.xlsx[Notes] -> tab name does not match the setup pattern
skipped 100.xlsx[OP30] -> no PART: label (or its cell is empty)
skipped copy of 100.xlsx[OP10] -> duplicate of 100.xlsx[OP10] (100_OP10)
```

**Predict:** there are four sheets in total. How many are scraped, and why was each of the others skipped?

When a user asks "why isn't my tab showing?", that report is your answer.

### How it works

`scrape_all` is three loops deep, and each loop has a different job:

```python
for file_name, book in files.items():       # each Excel file
    for tab_name, grid in book.items():     # each tab in that file
        ...                                  # decide what to do with this one sheet
```

For each sheet there are four possible outcomes, checked in order, and each one ends with `continue` ("give up on this sheet, go to the next one"):

1. **Tab name doesn't match the pattern.** `tab_re.match(tab_name)` tests the name. (`match` only tries the *start* of the string, which is why the regex's `^` is redundant but harmless.) A `Notes` tab fails here and is recorded with a reason.
2. **`scrape_sheet` raises `SkipSheet`.** The `except SkipSheet as reason:` block catches it, and `str(reason)` turns the exception into its message ("no PART: label..."). The `where` string tells you which file and tab.
3. **Duplicate.** `claimed` is a dict from `SetupKey` to the location that produced it. If this sheet's key is already in `claimed`, another file got there first. We record the conflict, and the first file keeps its place. That `key in claimed` check is fast, and it works because `SetupKey` is hashable (Step 3.3).
4. **Success.** Record the claim, and add the lines.

Note what the function *doesn't* do: it never stops. One bad sheet can't ruin the scrape of a hundred good ones. It collects the reasons and reports at the end.

Your output shows it: four sheets went in, one made it out (`1 tool line`), and each of the other three has its own reason on a separate line. The reason text is what you'll read when someone says "my part isn't showing."

`ScrapeResult` bundles the two outputs, lines and skipped, into one object. A function can only `return` one thing, and a tuple like `(lines, skipped)` would force every caller to remember which is which. A named bundle fixes that.

## Step 3.10: Scaffolding, paste this and don't study it

You don't have your Excel files at home, so we fake them. **Fake the sheets, not the output**: the fake files have the same shape `openpyxl` gives you, so the real scraper runs against them. This is scaffolding, not a lesson: paste both files and move on. The traps in it (a `Notes` tab, an `OP30` with no `PART:`, a `Part :` label with odd spacing) exist to exercise the scraper.

```python
# config.py   (new file)
"""Every knob you will tweak at work lives here, not buried in the code."""
import re
from pathlib import Path

# Where the database lives. At work this would point at the shared drive
# (read the SQLite-on-a-network-share warning in Lesson 4 first).
DB_PATH = Path("toolmgr.db")

# Hard-coded machines: family -> machines. These become tab 1's columns.
MACHINES = {
    "OM": ["OM1", "OM6"],
    "DV": ["DV1", "DV2"],
    "MX": ["MX1"],
}

# Which Excel tabs are setups. Stand-in for the regex you already have.
TAB_RE = re.compile(r"^OP\d+$", re.IGNORECASE)

# How often each open window checks the database for changes.
POLL_MS = 3000
```

```python
# fakedata.py   (new file)
"""Pretend Excel files. A grid is a list of rows; a row is a list of cell values."""
import random

DESCRIPTIONS = [
    "1/2 EM .030R 4FL", "0.500 BULL NOSE R.03 3FL", "3/8 BALL EM", "#7 DRILL",
    "1/4-20 TAP", "12MM EM 2FL", "FACE MILL 3.0", "1/2 end mill 4 flute",
    "SPOT DRILL 90", "CHAMFER MILL 1/4", "MYSTERY TOOL 55",
]
HOLDERS = ["CAT40 ER32", "CAT40 SHRINK", "HSK63 HYDRO"]
COLLETS = ["ER32", "ER25", "N/A"]
PROCESSES = ["ROUGH", "FINISH"]

# part number -> the setup tabs its workbook contains
PARTS = {
    100234: ["OP10", "OP20"],
    100567: ["OP10"],
    200981: ["OP10", "OP20"],
    300112: ["OP10"],
    300445: ["OP10", "OP20"],
    400872: ["OP10"],
}


def make_sheet(part, tab, version=1, label="part:"):
    rng = random.Random(f"{part}-{tab}-{version}")      # same inputs -> same fake data
    grid = [
        [label, part, None, None, None, None, None, None],
        [None] * 8,
    ]
    for tool_no in range(1, rng.randint(4, 8) + 1):
        description = rng.choice(DESCRIPTIONS)
        diameter = rng.choice([0.25, 0.375, 0.5, 0.75])
        collet = rng.choice(COLLETS)
        holder = rng.choice(HOLDERS)
        for seq in range(rng.choice([1, 1, 1, 2])):     # some tools have 2 process rows
            grid.append([tool_no, description, diameter, collet,
                         "FLOOD", PROCESSES[seq], 2.5 + seq, holder])
    return grid


def make_fake_files(version=1):
    """Fake 'folder of workbooks'. version=2 simulates the sheets changing later:
    one part disappears, a new part appears, one sheet gets edited."""
    parts = {p: list(tabs) for p, tabs in PARTS.items()}
    if version == 2:
        del parts[400872]
        parts[500321] = ["OP10"]

    files = {}
    for part, tabs in parts.items():
        book = {}
        for tab in tabs:
            sheet_version = version if part == 100234 else 1
            label = "Part :" if (part, tab) == (200981, "OP20") else "part:"
            book[tab] = make_sheet(part, tab, sheet_version, label)
        files[f"{part}.xlsx"] = book

    # Messy extras you will meet in real life:
    files["300112.xlsx"]["Notes"] = [["just some notes", None]]
    files["300112.xlsx"]["OP30"] = [[None, None], ["no part label here", 1]]
    return files
```

```python
# run it
import config
import fakedata
from scraper import scrape_all

result = scrape_all(fakedata.make_fake_files(), config.TAB_RE)
print(len(result.lines), "tool lines from",
      len({l.setup for l in result.lines}), "setups")
for where, reason in result.skipped:
    print("skipped", where, "->", reason)
print(result.lines[0])
```

Output:

```text
64 tool lines from 9 setups
skipped 300112.xlsx[Notes] -> tab name does not match the setup pattern
skipped 300112.xlsx[OP30] -> no PART: label (or its cell is empty)
ToolLine(setup=SetupKey(part_number='100234', tab='OP10'), tool_no=1, process_seq=1, description='#7 DRILL', diameter='0.25', collet='ER25', coolant='FLOOD', process='ROUGH', stickout='2.5', holder='CAT40 SHRINK')
```

**Predict:** which two sheets get skipped? Is `200981_OP20` (the `Part :` one) among the scraped setups?

### How it works

Two things in `fakedata.py` are worth understanding, and the rest is plain data.

`random.Random(f"{part}-{tab}-{version}")` creates a random number generator **seeded with a string**. The same seed always produces the same sequence of "random" choices. So `100234 / OP10 / version 1` generates the same tools every time you run it. That determinism is deliberate: it lets you rerun a demo and compare outputs, and lets two people see the same data.

`make_fake_files(version=2)` simulates the real world changing between scrapes: one part's file disappears, a new one appears, one sheet is edited. You'll use it in Lesson 5 to test what happens when Excel changes under the app.

## Step 3.11: The only file that knows what Excel is

At work this is the one file that changes: it reads every `.xlsx` in a folder into the same `{file: {tab: grid}}` shape, so nothing else knows.

```python
# excel_source.py   (new file)
from pathlib import Path


def load_folder(folder: str) -> dict[str, dict[str, list[list]]]:
    """Read every .xlsx in a folder into {file name: {tab name: grid}}."""
    import openpyxl                      # imported here so the fake-data path never needs it

    files = {}
    for path in sorted(Path(folder).glob("*.xlsx")):
        if path.name.startswith("~$"):   # Excel's temp lock files
            continue
        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
        files[path.name] = {
            ws.title: [list(row) for row in ws.iter_rows(values_only=True)]
            for ws in wb.worksheets
        }
        wb.close()
    return files
```

Let's prove it against a real workbook, built to look like your screenshot:

```python
# run it
import tempfile
from pathlib import Path

import openpyxl

import config
from excel_source import load_folder
from scraper import scrape_all

folder = Path(tempfile.mkdtemp())
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "OP10"
ws["A1"], ws["B1"] = "part:", 123345
for r in range(3, 14):                       # rows 3..13, like your screenshot
    for c, v in enumerate([r - 2, "tool description", "tool diameter", "collet",
                           "coolant", "process", "stickout", "holder"], start=1):
        ws.cell(row=r, column=c, value=v)
wb.create_sheet("Notes")
wb.save(folder / "123345.xlsx")
(folder / "~$123345.xlsx").write_text("Excel lock file")

files = load_folder(folder)
print({name: list(book) for name, book in files.items()})
result = scrape_all(files, config.TAB_RE)
print(len(result.lines), result.lines[0].setup, result.skipped)
```

Output:

```text
{'123345.xlsx': ['OP10', 'Notes']}
11 123345_OP10 [('123345.xlsx[Notes]', 'tab name does not match the setup pattern')]
```

**Predict:** is the `~$` lock file in the output?

`data_only=True` makes openpyxl return a formula cell's *value*, not its formula text.

### How it works

`openpyxl.load_workbook(path, data_only=True, read_only=True)`:

- `data_only=True`: for formula cells, give the *calculated value*, not the formula text. Without it you'd get strings like `"=B2*2"` instead of numbers.
- `read_only=True`: streams the file instead of loading everything into memory. Faster, and fine because we never write.

```python
{ws.title: [list(row) for row in ws.iter_rows(values_only=True)]
 for ws in wb.worksheets}
```

This is a dict comprehension containing a list comprehension. Read from the inside: for each worksheet `ws`, `ws.iter_rows(values_only=True)` gives one tuple of cell values per row, and `list(row)` turns each tuple into a list. The outer part builds `{tab name: that list of rows}`. The result is exactly the "grid" shape from Step 3.6, which is the point: **nothing else in the app knows Excel exists.** Switching to a different spreadsheet source means writing one function that returns the same shape.

`path.name.startswith("~$")` skips the hidden lock files Excel creates next to any open workbook. They're not real workbooks, and trying to open one throws an error. `sorted(Path(folder).glob("*.xlsx"))` lists matching files in a stable order, so scrapes are repeatable.

## Review cards

- **Q:** What does `@dataclass` write for you? **A:** `__init__`, `__repr__`, `__eq__`.
- **Q:** Why `field(default_factory=list)`? **A:** A plain `[]` default would be shared by every instance.
- **Q:** What does `frozen=True` buy us? **A:** Immutability, so instances are hashable: usable as dict keys and set members.
- **Q:** What does `after - before` give you for two sets of frozen objects? **A:** What's new (added).
- **Q:** Where does `process_seq` come from? **A:** The scraper counts rows per tool number; Excel doesn't have it.
- **Q:** Why unpack columns by name? **A:** It fails loudly when the count changes and can't misplace values.
- **Q:** Why return a skip report? **A:** It answers "why isn't my tab showing" without a debugger.
- **Q:** Where is the only code that knows about `.xlsx`? **A:** `excel_source.py`.

---

# Lesson 4: The repository, the only code that touches SQL

**Goal:** build the storage layer one capability at a time: schema, connection, reads, then the Submit merge that handles two users.

## A warning before you build on SQLite

You said the database lives on a shared drive and several people write to it. **SQLite's own documentation warns against using it over a network file system with multiple writers.** File locking on network shares is unreliable, and the failure is a corrupted file, usually rare and silent. **WAL mode doesn't work over network file systems either**, so don't turn it on as a fix.

What I recommend: build and learn on SQLite (no install, real SQL, the code transfers). Before real users share one file, talk to IT about a server database like PostgreSQL or SQL Server. That is what the repository layer is for: the UI never knows what's underneath, so the swap is a rewrite of one file. Appendix B lists what would change.

## Step 4.1: Some more shapes, then the schema in four pieces

The repository returns a few more shapes than `Assignment`. Add them to `models.py` now. They're just names for query results, and you'll meet each when it's used.

```python
# models.py   (add to the bottom)
@dataclass(frozen=True)
class Meta:
    """The 'who touched it last' stamp plus a counter that goes up on every change."""
    revision: int
    last_edited_by: str | None
    last_edited_pc: str | None
    last_edited_at: str | None


@dataclass(frozen=True)
class Event:
    """One line of history."""
    event_id: int
    at: str
    user_name: str
    pc_name: str
    setup: SetupKey
    machine_id: str
    action: str               # "ADD" or "REMOVE"


@dataclass(frozen=True)
class ToolStatus:
    """A tool line plus whether its setup is assigned to any machine."""
    line: ToolLine
    used: bool


@dataclass(frozen=True)
class UpsertResult:
    setups_seen: int
    tool_lines: int
    deactivated: list[SetupKey]
```

Now start `repository.py`. The imports include things we only use later, so don't worry if one looks unused. Then the first piece of schema: the strong entities and the first weak one, straight from Lesson 1's table.

```python
# repository.py   (new file)
import getpass
import socket
import sqlite3
from contextlib import contextmanager
from datetime import datetime

from models import (Assignment, Event, Meta, SetupKey, ToolLine, ToolStatus,
                    UpsertResult)

SCHEMA_CORE = """
CREATE TABLE IF NOT EXISTS machine_family (
    family_id TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS machine (
    machine_id TEXT PRIMARY KEY,
    family_id  TEXT NOT NULL REFERENCES machine_family(family_id)
);
CREATE TABLE IF NOT EXISTS part (
    part_number TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS setup (
    part_number TEXT NOT NULL REFERENCES part(part_number),
    tab         TEXT NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (part_number, tab)
);
"""
```

Notice `setup.active`. When a tab vanishes from Excel we'll mark it inactive rather than delete it (Lesson 5).

The weak entities below it. **Look at how each child repeats the parent's whole key in its `FOREIGN KEY`.** That repetition is what a weak entity looks like in tables.

```python
# repository.py   (add to the bottom)
SCHEMA_TOOLS = """
CREATE TABLE IF NOT EXISTS tool (
    part_number TEXT NOT NULL,
    tab         TEXT NOT NULL,
    tool_no     INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    diameter    TEXT NOT NULL DEFAULT '',
    collet      TEXT NOT NULL DEFAULT '',
    holder      TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (part_number, tab, tool_no),
    FOREIGN KEY (part_number, tab) REFERENCES setup(part_number, tab)
);
CREATE TABLE IF NOT EXISTS tool_process (
    part_number TEXT NOT NULL,
    tab         TEXT NOT NULL,
    tool_no     INTEGER NOT NULL,
    process_seq INTEGER NOT NULL,
    process     TEXT NOT NULL DEFAULT '',
    coolant     TEXT NOT NULL DEFAULT '',
    stickout    TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (part_number, tab, tool_no, process_seq),
    FOREIGN KEY (part_number, tab, tool_no) REFERENCES tool(part_number, tab, tool_no)
);
"""
```

The associative entity and the event log. `CHECK (action IN (...))` makes the database itself reject a typo.

```python
# repository.py   (add to the bottom)
SCHEMA_ASSIGN = """
CREATE TABLE IF NOT EXISTS assignment (
    part_number TEXT NOT NULL,
    tab         TEXT NOT NULL,
    machine_id  TEXT NOT NULL REFERENCES machine(machine_id),
    PRIMARY KEY (part_number, tab, machine_id),
    FOREIGN KEY (part_number, tab) REFERENCES setup(part_number, tab)
);
CREATE TABLE IF NOT EXISTS assignment_event (
    event_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT NOT NULL,
    tab         TEXT NOT NULL,
    machine_id  TEXT NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('ADD', 'REMOVE')),
    user_name   TEXT NOT NULL,
    pc_name     TEXT NOT NULL,
    at          TEXT NOT NULL
);
"""
```

Last piece: a one-row `meta` table (the "last edited by" stamp plus a **revision counter** that Lesson 8's live updates depend on), and a **view**, a saved query that behaves like a table. The view flattens `tool` and `tool_process` back into one row per Excel row and computes `used`. Lesson 7 explains its join.

```python
# repository.py   (add to the bottom)
SCHEMA_META = """
CREATE TABLE IF NOT EXISTS meta (
    id             INTEGER PRIMARY KEY CHECK (id = 1),
    revision       INTEGER NOT NULL DEFAULT 0,
    last_edited_by TEXT,
    last_edited_pc TEXT,
    last_edited_at TEXT
);
INSERT OR IGNORE INTO meta (id) VALUES (1);

CREATE VIEW IF NOT EXISTS v_tool_line AS
SELECT t.part_number, t.tab, t.tool_no,
       COALESCE(p.process_seq, 1) AS process_seq,
       t.description, t.diameter, t.collet,
       COALESCE(p.coolant, '')  AS coolant,
       COALESCE(p.process, '')  AS process,
       COALESCE(p.stickout, '') AS stickout,
       t.holder,
       s.active AS active,
       EXISTS (SELECT 1 FROM assignment a
               WHERE a.part_number = t.part_number AND a.tab = t.tab) AS used
FROM tool t
JOIN setup s ON s.part_number = t.part_number AND s.tab = t.tab
LEFT JOIN tool_process p ON p.part_number = t.part_number
                        AND p.tab = t.tab AND p.tool_no = t.tool_no;
"""

SCHEMAS = (SCHEMA_CORE, SCHEMA_TOOLS, SCHEMA_ASSIGN, SCHEMA_META)
```

Check that SQLite accepts all of it:

```python
# run it
import sqlite3
from repository import SCHEMAS

con = sqlite3.connect(":memory:")
for sql in SCHEMAS:
    con.executescript(sql)
for kind, name in con.execute(
        "SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type DESC, name"):
    print(f"{kind:6} {name}")
```

Output:

```text
view   v_tool_line
table  assignment
table  assignment_event
table  machine
table  machine_family
table  meta
table  part
table  setup
table  tool
table  tool_process
```

**Predict:** how many tables and how many views?

### How it works

You didn't write much SQL in this step, so here is what each unusual piece means.

**`PRIMARY KEY (part_number, tab)`** declares a composite key (Step 1.3). **`FOREIGN KEY (part_number, tab) REFERENCES setup(part_number, tab)`** says "this pair must exist as a pair in `setup`." Both columns are listed on both sides, in the same order. If you only referenced `part_number`, the database wouldn't stop you attaching a tool to a tab that doesn't exist.

**`NOT NULL DEFAULT ''`**: an empty cell becomes the empty string, never `NULL`. `NULL` in SQL means "unknown", and it behaves oddly: `NULL = NULL` is not true, `NULL` in a `LIKE` search never matches. Using `''` means searches and sorts behave normally.

**`CHECK (action IN ('ADD', 'REMOVE'))`**: the database rejects any other value. If a bug ever tried to write `'ADDED'`, you'd get an error immediately instead of corrupt history.

**`CREATE TABLE IF NOT EXISTS`** makes the script safe to run on every start. It doesn't change a table that already exists (that's why adding a column later needs the `ALTER TABLE` recipe in Appendix A).

**The `meta` table** has `CHECK (id = 1)` and a single `INSERT OR IGNORE`. The check makes a second row impossible, so `UPDATE meta ... WHERE id = 1` always touches exactly the one row. `INSERT OR IGNORE` creates it on first run and does nothing afterward.

**The view `v_tool_line`** is a saved query. Reading from it runs the query. It does three jobs:

- `FROM tool t JOIN setup s ON ...` brings in each setup's `active` flag.
- `LEFT JOIN tool_process p ON ...` attaches the process rows. It's a **LEFT** join so a tool with no process rows still appears. Where there's no match, the `p.` columns are `NULL`, and `COALESCE(p.coolant, '')` replaces `NULL` with `''`. (`COALESCE` returns the first argument that isn't `NULL`.)
- `EXISTS (SELECT 1 FROM assignment a WHERE ...)` is `1` if at least one assignment matches this setup, otherwise `0`. Lesson 7 explains it.

The result looks like one flat table, with one row per Excel row, so the rest of the code never has to know it's stored in two.

The `RUN` output shows 10 objects: 9 tables and 1 view. `sqlite_master` is SQLite's own catalogue of what exists.

## Step 4.2: The connection

**Why:** every line in `__init__` has a job. First the `with`-block helper, which we'll test on its own in a moment.

```python
# repository.py   (add to the bottom)
def _sort_key(a: Assignment):
    return (a.setup.part_number, a.setup.tab, a.machine_id)


def _line_from_row(r: sqlite3.Row) -> ToolLine:
    return ToolLine(
        setup=SetupKey(r["part_number"], r["tab"]),
        tool_no=r["tool_no"],
        process_seq=r["process_seq"],
        description=r["description"],
        diameter=r["diameter"],
        collet=r["collet"],
        coolant=r["coolant"],
        process=r["process"],
        stickout=r["stickout"],
        holder=r["holder"],
    )
```

(Two small helpers that later methods use: `_sort_key` for stable ordering, and `_line_from_row` to turn an SQL row into a `ToolLine`.)

```python
# repository.py   (add to the bottom)
class Repository:
    def __init__(self, path, user: str | None = None, pc: str | None = None):
        self.user = user or getpass.getuser()
        self.pc = pc or socket.gethostname()
        self.conn = sqlite3.connect(str(path), timeout=10, isolation_level=None)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")      # per connection, every time
        for sql in SCHEMAS:
            self.conn.executescript(sql)

    @staticmethod
    def _now() -> str:
        return datetime.now().isoformat(sep=" ", timespec="seconds")
```

What each argument does:

- **`timeout=10`**: wait up to 10 seconds if another writer holds the lock, then raise `database is locked`.
- **`isolation_level=None`**: turn off Python's automatic transactions, so *we* write `BEGIN` and `COMMIT` and the boundaries are visible in the code.
- **`row_factory = sqlite3.Row`**: read columns by name, `r["tab"]`.
- **`PRAGMA foreign_keys = ON`**: Step 1.4.
- **`user` and `pc` are parameters** only so we can pretend to be two people. They default to `getpass.getuser()` and `socket.gethostname()`.

```python
# run it
from repository import Repository

repo = Repository(":memory:", user="alice", pc="PC-A")
print(repo.user, repo.pc)
print(repo.conn.execute("PRAGMA foreign_keys").fetchone()[0])
print(Repository(":memory:").user)          # your real Windows user name
```

Output:

```text
alice PC-A
1
root
```

(The last line printed `root` for me because I ran this in a sandbox. On your PC it prints your own login name. That's the name that ends up in the history table.)

### How it works

**`self.user = user or getpass.getuser()`**: `or` returns its first operand if that's "truthy" (not `None` and not empty), otherwise the second. So if you pass `user="alice"`, that's used. If you pass nothing (`None`), it falls through to the real login name. This one line gives you both behaviors: tests can pretend to be anyone, and the real app uses the real user.

**`@staticmethod`** on `_now` means the function doesn't use `self`. It's a plain function that happens to live inside the class. `isoformat(sep=" ", timespec="seconds")` gives `2026-11-07 15:23:37`, which sorts correctly as plain text (year first, zero-padded). That's why storing dates as text works fine in SQLite.

**The connection arguments:**

- `timeout=10`: if another connection holds the write lock, wait up to 10 seconds, retrying, before raising `database is locked`. Without it you'd get the error instantly whenever two people save at the same moment.
- `isolation_level=None`: by default Python's `sqlite3` module quietly starts transactions for you before certain statements, which makes it hard to see where one begins and ends. `None` turns that off: nothing is a transaction unless you write `BEGIN` yourself.
- `row_factory = sqlite3.Row`: rows come back as objects you can index by column name (`r["tab"]`) as well as by position. Name-based access doesn't break if you reorder the columns in a `SELECT`.

**The loop at the end** runs each schema string in order. They must run in order: the view mentions `tool_process` and `assignment`, which must exist first.

The `RUN` shows `1` for `PRAGMA foreign_keys`, proof the setting took effect. If it had said `0`, Step 1.4's trap would be active.

## Step 4.3: A transaction, in a tiny experiment

**Why:** before we use transactions, see what they protect you from.

```python
# run it
import sqlite3
from contextlib import contextmanager

con = sqlite3.connect(":memory:", isolation_level=None)
con.execute("CREATE TABLE assignment (setup TEXT, machine TEXT)")
con.execute("CREATE TABLE event (setup TEXT, machine TEXT, action TEXT)")


@contextmanager
def write_tx():
    con.execute("BEGIN IMMEDIATE")
    try:
        yield                              # the body of the `with` block runs here
    except BaseException:
        con.execute("ROLLBACK")            # anything went wrong: undo everything
        raise
    else:
        con.execute("COMMIT")              # body finished: make it permanent


with write_tx():
    con.execute("INSERT INTO assignment VALUES ('123345_OP10', 'OM1')")
    con.execute("INSERT INTO event VALUES ('123345_OP10', 'OM1', 'ADD')")

try:
    with write_tx():
        con.execute("INSERT INTO assignment VALUES ('123345_OP10', 'DV1')")
        raise RuntimeError("crash between the two inserts")
except RuntimeError:
    pass

print(con.execute("SELECT * FROM assignment").fetchall())
print(con.execute("SELECT * FROM event").fetchall())
```

Output:

```text
[('123345_OP10', 'OM1')]
[('123345_OP10', 'OM1', 'ADD')]
```

**Predict:** after the crash, is the `DV1` row in `assignment`?

That's **atomicity**, the "A" in ACID: the change and its history entry either both happen or neither does. Without it, a crash halfway would leave the current state saying one thing and the log another.

`BEGIN IMMEDIATE` takes the write lock at the *start*, so a second user's Submit waits instead of interleaving with yours.

Add it to the repository:

```python
# repository.py   (add to the bottom)
    @contextmanager
    def _write_tx(self):
        """BEGIN IMMEDIATE ... COMMIT, or ROLLBACK if anything inside raises."""
        self.conn.execute("BEGIN IMMEDIATE")
        try:
            yield
        except BaseException:
            self.conn.execute("ROLLBACK")
            raise
        else:
            self.conn.execute("COMMIT")

    def _bump_revision(self, stamp_edit: bool) -> None:
        if stamp_edit:
            self.conn.execute(
                "UPDATE meta SET revision = revision + 1, last_edited_by = ?, "
                "last_edited_pc = ?, last_edited_at = ? WHERE id = 1",
                (self.user, self.pc, self._now()),
            )
        else:
            self.conn.execute("UPDATE meta SET revision = revision + 1 WHERE id = 1")
```

`_bump_revision` raises the counter by one on every change, and optionally stamps who did it. That counter will let every open window cheaply ask "did anything change?".

### How it works

`@contextmanager` turns a function with **one `yield`** into something you can use in a `with` block. The `yield` splits the function in two halves:

```python
@contextmanager
def write_tx():
    con.execute("BEGIN IMMEDIATE")      # runs when the `with` block STARTS
    try:
        yield                           # <- your with-block's code runs HERE
    except BaseException:
        con.execute("ROLLBACK")         # runs only if your code raised
        raise                           # re-raise so the caller still sees the error
    else:
        con.execute("COMMIT")           # runs only if your code finished cleanly
```

Trace the first `with`: `BEGIN IMMEDIATE` runs, execution reaches `yield` and pauses, your two `INSERT`s run, the block ends normally, the function resumes after the `yield`, the `else` branch runs, and `COMMIT` makes it permanent.

Trace the crashing one: `BEGIN IMMEDIATE`, pause at `yield`, your `INSERT` runs, then `raise RuntimeError`. Python throws that error *into* the paused function at the `yield`. The `except` branch catches it, `ROLLBACK` undoes the `DV1` insert, and `raise` sends the error on to your `try/except RuntimeError` outside. That's why the `DV1` row is gone: the transaction never committed.

**A transaction is a to-do list the database holds in draft.** Nothing in it is visible to anyone else, or saved, until `COMMIT`. `ROLLBACK` throws the draft away.

Why `BEGIN IMMEDIATE` and not plain `BEGIN`? A plain (deferred) `BEGIN` doesn't take any lock until your first write. Two users could both start, both read, then both try to write, and one would fail midway through its work. `IMMEDIATE` grabs the write lock **up front**, so the second user waits at the very beginning, before doing any work. Waiting at the start is much easier to handle than failing in the middle.

In the real method, `_bump_revision` adds one to the revision counter. It's the same idea, run inside the same transaction as the change, so the counter can never go up without a change or the reverse.

## Step 4.4: Reading

Four small readers. Every query uses `?` placeholders. **Never build SQL with f-strings**: the driver handles quoting, which stops SQL injection and bugs on values like `O'Brien`.

```python
# repository.py   (add to the bottom)
    def seed_machines(self, machines: dict[str, list[str]]) -> None:
        with self._write_tx():
            for family, machine_ids in machines.items():
                self.conn.execute(
                    "INSERT OR IGNORE INTO machine_family (family_id) VALUES (?)", (family,))
                for machine_id in machine_ids:
                    self.conn.execute(
                        "INSERT OR IGNORE INTO machine (machine_id, family_id) VALUES (?, ?)",
                        (machine_id, family))

    def list_setups(self) -> list[SetupKey]:
        rows = self.conn.execute(
            "SELECT part_number, tab FROM setup WHERE active = 1 ORDER BY part_number, tab")
        return [SetupKey(r["part_number"], r["tab"]) for r in rows]

    def load_assignments(self) -> set[Assignment]:
        rows = self.conn.execute(
            "SELECT a.part_number, a.tab, a.machine_id FROM assignment a "
            "JOIN setup s ON s.part_number = a.part_number AND s.tab = a.tab "
            "WHERE s.active = 1")
        return {Assignment(SetupKey(r["part_number"], r["tab"]), r["machine_id"])
                for r in rows}

    def get_meta(self) -> Meta:
        r = self.conn.execute(
            "SELECT revision, last_edited_by, last_edited_pc, last_edited_at "
            "FROM meta WHERE id = 1").fetchone()
        return Meta(r["revision"], r["last_edited_by"], r["last_edited_pc"], r["last_edited_at"])
```

- `INSERT OR IGNORE` means "if this row already exists, do nothing", so seeding is safe to repeat.
- `load_assignments` returns a **`set[Assignment]`**, the same type tab 1's checkboxes will produce.
- It filters `active = 1`: a vanished setup is hidden on tab 1, so its assignments must not load either, or Submit would think they were un-ticked and delete them.

There's no data yet. Insert a few setups by hand with raw SQL (Lesson 5 does this properly) and try the readers:

```python
# run it
import config
from repository import Repository

repo = Repository(":memory:", user="alice", pc="PC-A")
repo.seed_machines(config.MACHINES)
repo.seed_machines(config.MACHINES)          # safe to repeat
print(repo.conn.execute("SELECT COUNT(*) FROM machine").fetchone()[0], "machines")

repo.conn.execute("INSERT INTO part VALUES ('100234')")
repo.conn.execute("INSERT INTO setup (part_number, tab) VALUES ('100234', 'OP10')")
repo.conn.execute("INSERT INTO setup (part_number, tab) VALUES ('100234', 'OP20')")

print(repo.list_setups())
print(repo.load_assignments())
print(repo.get_meta())
```

Output:

```text
5 machines
[SetupKey(part_number='100234', tab='OP10'), SetupKey(part_number='100234', tab='OP20')]
set()
Meta(revision=0, last_edited_by=None, last_edited_pc=None, last_edited_at=None)
```

**Predict:** `load_assignments()` right now returns what?

**Try:** insert an assignment for a part that doesn't exist: `repo.conn.execute("INSERT INTO assignment VALUES ('999','OP10','OM1')")`. You get a foreign-key error, which is the PRAGMA doing its job.

### How it works

**The `?` and the trailing comma.** `execute("... VALUES (?)", (family,))`. The `?` is a placeholder, and the values come as a tuple. `(family,)` has a comma because `(family)` is just `family` in parentheses, not a tuple. Forgetting the comma is a classic error: Python then treats a string like `"OM"` as a sequence of two characters and complains "2 values supplied, 1 expected."

Why placeholders instead of an f-string? Imagine `f"... VALUES ('{name}')"` and `name = "O'Brien"`. The apostrophe closes the string early and the SQL breaks. Worse, `name = "x'); DROP TABLE tool; --"` would run as SQL. A placeholder never mixes the *value* into the *statement*. The database receives them separately, so a value is only ever data.

**`load_assignments`:**

```python
return {Assignment(SetupKey(r["part_number"], r["tab"]), r["machine_id"])
        for r in rows}
```

A set comprehension. For every database row `r`, build the object and put it in a set. Notice it **builds the same types the UI will build**: `set[Assignment]`. That's what makes comparison with set subtraction in Step 4.5 possible.

The `JOIN setup ... WHERE s.active = 1` hides assignments whose setup has vanished. If those were loaded, tab 1 would have no row for them, so the diff would think the user had un-ticked them and delete them. Filtering at the source prevents that.

**`seed_machines` uses `INSERT OR IGNORE`**, so calling it twice doesn't create duplicates or crash. You can see that in the output: running it twice leaves 5 machines, not 10.

`list_setups()` and `get_meta()` are plain reads. `fetchone()` returns one row (the single `meta` row), and the `Meta(...)` call unpacks it into a named object. Look at the output: `Meta(revision=0, ...)` with everything else `None`, because nothing has been edited yet.

## Step 4.5: The lost-update bug

**Why:** this is the heart of "more than one user may edit at the same time".

Alice and Bob both open the app when it's empty. Bob ticks a box and submits. Alice ticks a *different* box and submits. Let's see what a naive Submit does:

```python
# run it
db = set()                       # the shared state
alice_loaded = set(db)           # both open the app when it's empty
bob_loaded = set(db)

db = bob_loaded | {("100234_OP10", "OM1")}              # Bob ticks a box and submits

alice_screen = alice_loaded | {("200981_OP10", "DV1")}  # Alice ticks a different box

# NAIVE: compare Alice's screen against the database as it is NOW
print("naive Submit would delete:", db - alice_screen)

# RIGHT: compare Alice's screen against what Alice *loaded*
added = alice_screen - alice_loaded
removed = alice_loaded - alice_screen
db = (db - removed) | added
print("merged result:", sorted(db))
```

Output:

```text
naive Submit would delete: {('100234_OP10', 'OM1')}
merged result: [('100234_OP10', 'OM1'), ('200981_OP10', 'DV1')]
```

**Predict:** what does the naive Submit delete?

The naive version deletes **Bob's row**. Alice silently undoes his work, because Bob's row isn't on her screen. The fix: **each window remembers the snapshot it loaded, and Submit applies only the difference between the screen and that snapshot, merged into whatever the database holds right now.**

Here it is in the repository. Read it line by line before you type it:

```python
# repository.py   (add to the bottom)
    def apply_changes(self, loaded: set[Assignment], new: set[Assignment]) -> Meta:
        """Apply only what THIS user changed on screen (new vs loaded), merged into
        whatever is in the database right now."""
        added = new - loaded
        removed = loaded - new

        with self._write_tx():
            current = self.load_assignments()
            to_add = added - current            # skip anything someone else already added
            to_remove = removed & current       # skip anything someone else already removed
            now = self._now()

            for a in to_add:
                self.conn.execute(
                    "INSERT INTO assignment (part_number, tab, machine_id) VALUES (?, ?, ?)",
                    (a.setup.part_number, a.setup.tab, a.machine_id))
            for a in to_remove:
                self.conn.execute(
                    "DELETE FROM assignment WHERE part_number = ? AND tab = ? AND machine_id = ?",
                    (a.setup.part_number, a.setup.tab, a.machine_id))

            events = (
                [(a, "ADD") for a in sorted(to_add, key=_sort_key)]
                + [(a, "REMOVE") for a in sorted(to_remove, key=_sort_key)]
            )
            self.conn.executemany(
                "INSERT INTO assignment_event "
                "(part_number, tab, machine_id, action, user_name, pc_name, at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                [(a.setup.part_number, a.setup.tab, a.machine_id, action,
                  self.user, self.pc, now) for a, action in events])

            if events:
                self._bump_revision(stamp_edit=True)
        return self.get_meta()
```

- `added = new - loaded`, `removed = loaded - new`: set subtraction on frozen dataclasses (Step 3.3). These are *this user's* changes.
- Inside the transaction it **re-reads `current`**. `added - current` skips anything someone else already added; `removed & current` skips anything someone else already removed. If you both un-tick the same box there's one event, not two, and no error.
- Events are written only for changes that actually happened, each stamped with user, PC and time.
- `if events:` means a Submit that changes nothing doesn't bump the revision, so other windows aren't told to reload for no reason.

Now the two-user scenario, for real:

```python
# run it
import os
import tempfile

import config
from models import Assignment, SetupKey
from repository import Repository

db = os.path.join(tempfile.mkdtemp(), "demo.db")
alice = Repository(db, user="alice", pc="PC-A")
bob = Repository(db, user="bob", pc="PC-B")
alice.seed_machines(config.MACHINES)
for tab in ("OP10", "OP20"):
    alice.conn.execute("INSERT OR IGNORE INTO part VALUES ('100234')")
    alice.conn.execute("INSERT INTO setup (part_number, tab) VALUES ('100234', ?)", (tab,))

s1, s2 = alice.list_setups()
a_loaded, b_loaded = alice.load_assignments(), bob.load_assignments()    # both: empty

bob.apply_changes(b_loaded, {Assignment(s1, "OM1")})
alice.apply_changes(a_loaded, {Assignment(s2, "DV1")})     # Alice's snapshot is stale

print(sorted(f"{a.setup}/{a.machine_id}" for a in alice.load_assignments()))
print(alice.get_meta())
```

Output:

```text
['100234_OP10/OM1', '100234_OP20/DV1']
Meta(revision=2, last_edited_by='alice', last_edited_pc='PC-A', last_edited_at='2026-11-07 15:23:58')
```

**Predict:** do both rows survive? Who does `last_edited_by` say?

**Try:** change `alice.apply_changes(a_loaded, ...)` to `alice.apply_changes(alice.load_assignments(), ...)` (comparing against the *live* database, the naive way) and run again. Bob's row vanishes. That's the bug, reproduced.

### How it works

First, the bug, with real numbers. The shared database starts empty.

| step | database | Alice's screen | Bob's screen |
|---|---|---|---|
| both open the app | `{}` | `{}` | `{}` |
| Bob ticks X and submits | `{X}` | `{}` | `{X}` |
| Alice ticks Y | `{X}` | `{Y}` | `{X}` |

Alice submits. **Naive version:** "make the database look like my screen." Database `{X}`, screen `{Y}`: `db - screen = {X}`, so X is "not on her screen" and gets deleted. Bob's work vanishes.

**The fix:** Alice's screen was built from what she *loaded* (`{}`), so only differences from that are *her* changes: `added = {Y} - {} = {Y}`, `removed = {} - {} = {}`. Submit applies only those to whatever is in the database now: `{X} + {Y} = {X, Y}`.

Now the method, line by line:

```python
added = new - loaded         # what THIS user ticked
removed = loaded - new       # what THIS user un-ticked
```

These two lines are the whole idea. They're set subtraction from Step 3.3.

```python
with self._write_tx():
    current = self.load_assignments()
    to_add = added - current
    to_remove = removed & current
```

We re-read `current` **inside the transaction**, after the lock is held, because it may have changed since the user opened the app. `to_add = added - current` drops anything already there. `to_remove = removed & current` is set intersection ("in both"), so it keeps only what's still there to remove.

Why bother? Trace two users both un-ticking X, who was in the database:

| | `loaded` | `new` | `removed` | `current` at save time | `to_remove` |
|---|---|---|---|---|---|
| Alice saves first | `{X}` | `{}` | `{X}` | `{X}` | `{X}` → deleted, 1 event |
| Bob saves second | `{X}` | `{}` | `{X}` | `{}` (Alice removed it) | `{X} & {}` = `{}` → nothing to do |

Without the intersection, Bob's `DELETE` would run on a row that's already gone. It wouldn't crash, but it would log a second `REMOVE` event for a change that didn't happen. The history would lie.

The inserts and deletes use placeholders. Then `executemany` runs one `INSERT` for a whole list of tuples, which is faster and tidier than a loop. The events are built from `to_add` and `to_remove`, never from `added`/`removed`, so **only changes that actually happened are logged**.

`sorted(to_add, key=_sort_key)` makes the event order predictable (sets have no order). `if events: self._bump_revision(...)` means saving with nothing changed doesn't bump the revision, so other windows aren't told to reload for no reason.

Look at the output of the two-user run: both rows survive, `last_edited_by` says alice (she saved last), and the revision is 2. In the "Try" step, passing `alice.load_assignments()` as `loaded` makes `loaded` always equal the live database, which is the naive version, and Bob's row dies.

## Step 4.6: The history reader

```python
# repository.py   (add to the bottom)
    def recent_events(self, limit: int = 200) -> list[Event]:
        rows = self.conn.execute(
            "SELECT event_id, at, user_name, pc_name, part_number, tab, machine_id, action "
            "FROM assignment_event ORDER BY event_id DESC LIMIT ?", (limit,))
        return [Event(r["event_id"], r["at"], r["user_name"], r["pc_name"],
                      SetupKey(r["part_number"], r["tab"]), r["machine_id"], r["action"])
                for r in rows]
```

```python
# run it
import os
import tempfile

import config
from models import Assignment
from repository import Repository

db = os.path.join(tempfile.mkdtemp(), "demo.db")
alice = Repository(db, user="alice", pc="PC-A")
bob = Repository(db, user="bob", pc="PC-B")
alice.seed_machines(config.MACHINES)
alice.conn.execute("INSERT INTO part VALUES ('100234')")
alice.conn.execute("INSERT INTO setup (part_number, tab) VALUES ('100234', 'OP10')")
s1 = alice.list_setups()[0]

bob.apply_changes(set(), {Assignment(s1, "OM1")})                       # Bob ticks
alice.apply_changes(alice.load_assignments(), set())                    # Alice un-ticks it

for e in alice.recent_events():
    print(e.at, e.user_name, e.pc_name, e.action, e.setup, e.machine_id)
```

Output:

```text
2026-11-07 15:23:58 alice PC-A REMOVE 100234_OP10 OM1
2026-11-07 15:23:58 bob PC-B ADD 100234_OP10 OM1
```

**Predict:** which event is listed first? (`ORDER BY event_id DESC`.)

That's your "history by user and PC name".

### How it works

`ORDER BY event_id DESC LIMIT ?` sorts newest first and keeps only the first N. `event_id` is `AUTOINCREMENT`, so a larger number always means a later event. That's simpler and more reliable than sorting by the timestamp text: two events in the same second would tie on time but never on id.

The output reads like a log: `bob ... ADD` happened first (older), `alice ... REMOVE` second. The list is newest-first, so Alice's removal is at the top.

The history table is **append-only**. Nothing in the code ever updates or deletes an event row. That's what makes it trustworthy as an audit trail. The "current state" lives in `assignment`, and the "how did it get there" lives in `assignment_event`. Writing both in one transaction (Step 4.3) is what keeps them from disagreeing.

Because every event stores `user_name` and `pc_name` as text copied at the time of the change, the history is still correct if the person later changes PC or leaves.

## Review cards

- **Q:** Why is SQLite on a shared drive risky? **A:** Network locking is unreliable, so concurrent writers from different PCs can corrupt the file.
- **Q:** What does `BEGIN IMMEDIATE` do? **A:** Takes the write lock at the start, so two writers can't interleave.
- **Q:** What is atomicity? **A:** A group of changes either all happen or none do.
- **Q:** Why diff Submit against the loaded snapshot instead of the live database? **A:** Otherwise a stale window deletes other people's newer changes.
- **Q:** Why re-read `current` inside the transaction? **A:** Someone else may have made the same change; re-reading under the lock keeps it safe to repeat.
- **Q:** Why `?` placeholders, never f-strings? **A:** Safe quoting, no injection, no bugs on values with quotes.
- **Q:** Why does `load_assignments` filter on `active = 1`? **A:** Hidden setups must not look "un-ticked" and get deleted.

---

# Lesson 5: Getting scraped data into the database

**Goal:** write `upsert_scrape`, the method that brings the database in line with the sheets *without* destroying what users entered.

## Step 5.1: Three strategies

When the sheets change, you have to bring the database in line:

1. **Wipe and reload.** Simple, and wrong here: assignments point at setups, so wiping destroys what users entered by hand.
2. **Append.** Stale and changed rows pile up.
3. **Upsert.** For each scraped setup, replace its tool data and leave everything users authored alone. This is the one.

The principle: **Excel owns the tool data, users own the assignments.** A re-scrape may overwrite the first and must never touch the second.

## Step 5.2: Two SQL tricks, on tiny tables

```python
# run it
import sqlite3

con = sqlite3.connect(":memory:", isolation_level=None)
con.execute("CREATE TABLE setup (part TEXT, tab TEXT, active INTEGER NOT NULL DEFAULT 1, "
            "PRIMARY KEY (part, tab))")
upsert = ("INSERT INTO setup (part, tab, active) VALUES (?, ?, 1) "
          "ON CONFLICT (part, tab) DO UPDATE SET active = 1")

con.execute(upsert, ("100", "OP10"))            # new: inserted
con.execute("UPDATE setup SET active = 0")      # it vanished from Excel last time
con.execute(upsert, ("100", "OP10"))            # seen again: same row, reactivated
print(con.execute("SELECT * FROM setup").fetchall())

con.execute("CREATE TABLE tool (part TEXT, tool_no INTEGER, description TEXT, "
            "PRIMARY KEY (part, tool_no))")
con.execute("INSERT OR IGNORE INTO tool VALUES ('100', 1, 'first row wins')")
con.execute("INSERT OR IGNORE INTO tool VALUES ('100', 1, 'second row ignored')")
print(con.execute("SELECT * FROM tool").fetchall())
```

Output:

```text
[('100', 'OP10', 1)]
[('100', 1, 'first row wins')]
```

**Predict:** how many rows are in `setup`, and what is the `description` in `tool`?

- **`ON CONFLICT ... DO UPDATE`** is an upsert: insert, or update the existing row if the key already exists. Here it also *brings a setup back* if its tab returns.
- **`INSERT OR IGNORE`** on `tool`: a tool's description/diameter/collet/holder are assumed the same on every process row, so the **first row wins** and the rest are ignored. That's a decision you might change at work.

### How it works

**The upsert.**

```sql
INSERT INTO setup (part, tab, active) VALUES (?, ?, 1)
ON CONFLICT (part, tab) DO UPDATE SET active = 1
```

Read it as: "Try to insert. If that would break the uniqueness of `(part, tab)`, don't fail: update the existing row instead." Trace your output:

| statement | what happens | table afterward |
|---|---|---|
| upsert `('100','OP10')` | no such row, so insert | `('100','OP10',1)` |
| `UPDATE setup SET active = 0` | tab vanished | `('100','OP10',0)` |
| upsert again | conflict, so update instead | `('100','OP10',1)` |

One row, reactivated. A plain `INSERT` would have failed on the duplicate. Delete-then-insert would have worked but lost anything else that pointed at the row.

**`INSERT OR IGNORE`** says "if this would conflict, silently skip it." The second tool insert has the same key `('100', 1)`, so it's skipped, and the first description remains. This is where the "first row wins" rule comes from: when a tool has two process rows and their descriptions differ, the one on the earlier row is kept.

The difference between the two: `ON CONFLICT DO UPDATE` *overwrites* the old row with the new data, and `OR IGNORE` *keeps* the old row. Use the first when the new data is the truth, and the second when whoever got there first should win.

## Step 5.3: Children first

```python
# run it
import sqlite3

con = sqlite3.connect(":memory:", isolation_level=None)
con.execute("PRAGMA foreign_keys = ON")
con.executescript("""
CREATE TABLE tool (tool_no INTEGER PRIMARY KEY);
CREATE TABLE tool_process (tool_no INTEGER REFERENCES tool(tool_no), seq INTEGER);
INSERT INTO tool VALUES (1);
INSERT INTO tool_process VALUES (1, 1);
""")
try:
    con.execute("DELETE FROM tool")             # parent first
except sqlite3.IntegrityError as e:
    print("parent first ->", e)
con.execute("DELETE FROM tool_process")         # child first
con.execute("DELETE FROM tool")
print("child first  -> ok")
```

Output:

```text
parent first -> FOREIGN KEY constraint failed
child first  -> ok
```

**Predict:** which order is refused?

### How it works

A foreign key is checked at the moment each statement runs. `tool_process` has a column that points at `tool`, so a `tool_process` row can't outlive its `tool` row. Deleting the parent while a child still points at it would leave a dangling reference, and the database refuses (`FOREIGN KEY constraint failed`).

So the rule for deletion is **children first, then parents**. Reverse it and you get exactly the error in your output. For inserting it's the opposite: **parents first**, since a child needs its parent to already exist.

That's why `upsert_scrape` runs in this order: `part`, then `setup`, then delete old `tool_process`, then delete old `tool`, then insert new `tool`, then insert new `tool_process`. Draw your ER diagram from Lesson 1: the order is "walk down the diagram when inserting, walk up when deleting."

## Step 5.4: A guard against a failed read

**Why:** if the network share is down, the scrape returns *nothing*. If we treated "nothing" as "everything vanished", we'd deactivate every setup. Always ask what a bad input does to a bulk operation.

```python
# repository.py   (add to the bottom)
    def upsert_scrape(self, lines: list[ToolLine]) -> UpsertResult:
        """Replace tool data for every scraped setup. NEVER touches assignments.
        Setups that vanished from the scrape are marked inactive, not deleted."""
        if not lines:
            raise ValueError("scrape returned no tool lines; refusing to change the database")

        by_setup: dict[SetupKey, list[ToolLine]] = {}
        for line in lines:
            by_setup.setdefault(line.setup, []).append(line)

        with self._write_tx():
            for setup, setup_lines in by_setup.items():
                self.conn.execute(
                    "INSERT OR IGNORE INTO part (part_number) VALUES (?)", (setup.part_number,))
                self.conn.execute(
                    "INSERT INTO setup (part_number, tab, active) VALUES (?, ?, 1) "
                    "ON CONFLICT (part_number, tab) DO UPDATE SET active = 1",
                    (setup.part_number, setup.tab))

                # Children first, because tool_process points at tool.
                self.conn.execute(
                    "DELETE FROM tool_process WHERE part_number = ? AND tab = ?",
                    (setup.part_number, setup.tab))
                self.conn.execute(
                    "DELETE FROM tool WHERE part_number = ? AND tab = ?",
                    (setup.part_number, setup.tab))

                for line in setup_lines:
                    # Tool-level facts: the first row for a tool wins.
                    self.conn.execute(
                        "INSERT OR IGNORE INTO tool "
                        "(part_number, tab, tool_no, description, diameter, collet, holder) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (setup.part_number, setup.tab, line.tool_no, line.description,
                         line.diameter, line.collet, line.holder))
                    self.conn.execute(
                        "INSERT INTO tool_process "
                        "(part_number, tab, tool_no, process_seq, process, coolant, stickout) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (setup.part_number, setup.tab, line.tool_no, line.process_seq,
                         line.process, line.coolant, line.stickout))

            known_active = {SetupKey(r["part_number"], r["tab"]) for r in self.conn.execute(
                "SELECT part_number, tab FROM setup WHERE active = 1")}
            vanished = sorted(known_active - set(by_setup), key=lambda k: (k.part_number, k.tab))
            for key in vanished:
                self.conn.execute(
                    "UPDATE setup SET active = 0 WHERE part_number = ? AND tab = ?",
                    (key.part_number, key.tab))

            self._bump_revision(stamp_edit=False)
        return UpsertResult(len(by_setup), len(lines), vanished)
```

The new idea is the last third: **vanished setups become inactive, never deleted.** `known_active - set(by_setup)` is the set difference again. An inactive setup disappears from every tab, but its assignments and history survive, so if the tab returns, its checkmarks come back. Also note `_bump_revision(stamp_edit=False)`: a scrape raises the revision so open windows reload, but it isn't a *user's* edit, so it doesn't change "last edited by".

### How it works

Walk the method top to bottom.

**The guard.** `if not lines: raise ValueError(...)`. Think about what comes later: any setup that's *in the database but not in this scrape* will be marked inactive. If the scrape is empty because the network share was down, *every* setup would be "missing", and the whole app would go blank. So an empty scrape is treated as "something went wrong", not "everything was deleted."

**Grouping:**

```python
by_setup = {}
for line in lines:
    by_setup.setdefault(line.setup, []).append(line)
```

`setdefault(key, [])` returns the list stored under `key`, creating an empty one first if there isn't one. So each line is appended to its setup's list. After the loop, `by_setup` is `{SetupKey: [its ToolLines]}`. That works as a dict key because `SetupKey` is frozen.

**Per setup (all inside one transaction):**

1. Make sure the `part` and `setup` rows exist (`INSERT OR IGNORE`, then the upsert from Step 5.2, which also reactivates).
2. Delete this setup's old `tool_process` rows, then old `tool` rows (children first, Step 5.3).
3. Insert the freshly scraped data: one `tool` row per tool (first row wins), one `tool_process` row per Excel row.

Deleting then re-inserting tool data is safe here because **nothing user-entered points at `tool` rows**. Assignments point at `setup`, which we never delete. That's the design decision from Lesson 1 showing up.

**Vanished setups:**

```python
known_active = { ...every setup currently active in the database... }
vanished = known_active - set(by_setup)
```

Set subtraction again: active in the database, minus everything we just scraped, equals "was here, now missing." Each of those gets `active = 0`. Nothing is deleted: its tool rows, assignments and history stay, and it comes back if the tab reappears.

Finally `_bump_revision(stamp_edit=False)` raises the counter so open windows reload, without changing "last edited by", because a scrape isn't a person's edit.

Everything ran inside one `with self._write_tx()`. If anything fails halfway through, say the 40th setup, the whole scrape rolls back and the database is exactly as it was.

## Step 5.5: Watch it happen

```python
# run it
import config
import fakedata
from models import Assignment, SetupKey
from repository import Repository
from scraper import scrape_all

repo = Repository(":memory:", user="alice", pc="PC-A")
repo.seed_machines(config.MACHINES)

first = scrape_all(fakedata.make_fake_files(1), config.TAB_RE)
print("scrape 1:", repo.upsert_scrape(first.lines))

# A user ticks a box on 400872_OP10, the setup that is about to vanish.
vs = SetupKey("400872", "OP10")
repo.apply_changes(set(), {Assignment(vs, "MX1")})
print("visible assignments:", len(repo.load_assignments()))

second = scrape_all(fakedata.make_fake_files(2), config.TAB_RE)
print("scrape 2:", repo.upsert_scrape(second.lines))
print("400872_OP10 still listed?", vs in repo.list_setups())
print("visible assignments:", len(repo.load_assignments()))
n = repo.conn.execute("SELECT COUNT(*) FROM assignment WHERE part_number='400872'").fetchone()[0]
print("assignment row still in the database:", n)

third = scrape_all(fakedata.make_fake_files(1), config.TAB_RE)
repo.upsert_scrape(third.lines)
print("after it returns, checkmark back?", Assignment(vs, "MX1") in repo.load_assignments())

try:
    repo.upsert_scrape([])
except ValueError as e:
    print("guard:", e)
```

Output:

```text
scrape 1: UpsertResult(setups_seen=9, tool_lines=64, deactivated=[])
visible assignments: 1
scrape 2: UpsertResult(setups_seen=9, tool_lines=67, deactivated=[SetupKey(part_number='400872', tab='OP10')])
400872_OP10 still listed? False
visible assignments: 0
assignment row still in the database: 1
after it returns, checkmark back? True
guard: scrape returned no tool lines; refusing to change the database
```

**Predict:** after the second scrape, is the assignment visible? Is the row still in the table? What happens in the third scrape?

### How it works

Read your output as a story:

1. **Scrape 1** loads 9 setups. Alice ticks `400872_OP10` on MX1, so 1 assignment is visible.
2. **Scrape 2** (the "changed" version) no longer has `400872_OP10`. It's reported in `deactivated`, it's gone from `list_setups()`, and the visible assignments drop to **0**, because `load_assignments` filters to active setups.
3. But `COUNT(*)` straight from the table still says **1**. The row was never deleted. It's just hidden.
4. **Scrape 3** brings the tab back: `active` is set to 1 by the upsert, and the checkmark reappears. Nobody had to re-enter it.
5. The empty scrape is refused by the guard.

If this had been "wipe and reload", step 4 would have lost the checkmark forever, and that checkmark is exactly the kind of thing a person typed in by hand.

## Step 5.6: The special-case playbook

You said you'll be writing special cases. Here's where each kind goes:

| Problem | Where |
|---|---|
| A tab isn't being picked up | `config.TAB_RE`; read the skip report |
| The `PART:` label varies | `_squash` / `find_label` in `scraper.py` |
| Part number comes back as `123345.0` | `clean_cell` |
| A sheet has junk rows | the `try/except` in `scrape_sheet` |
| A "template" tab should be ignored | a check at the top of `scrape_sheet` that raises `SkipSheet("reason")` |
| Two files claim the same setup | already reported as a duplicate |

**The habit that pays off:** when you fix a special case, add a tiny fake grid that reproduces it to `fakedata.py`. Then the case can never silently break again.

## Review cards

- **Q:** Why not wipe and reload on every scrape? **A:** It would destroy the assignments users entered.
- **Q:** What does `ON CONFLICT DO UPDATE` do? **A:** Inserts, or updates the existing row if the key exists.
- **Q:** Why delete `tool_process` before `tool`? **A:** The foreign key points child to parent; children go first.
- **Q:** Why mark vanished setups inactive instead of deleting? **A:** Assignments and history survive, and everything returns with the tab.
- **Q:** What does the empty-scrape guard protect against? **A:** A failed read deactivating every setup.
- **Q:** Does a scrape change "last edited by"? **A:** No, only the revision.

---

# Lesson 6: Tab 1, the assignment table

**Goal:** a table of setups by machines, built from data, with a Submit button that saves. We'll build the class in small stages and poke at it after each one, *without needing a window*: we'll simulate a user clicking from code.

## Step 6.1: The imports

```python
# ui.py   (new file)
import sqlite3

from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtWidgets import (QAbstractItemView, QCheckBox, QComboBox, QLabel,
                               QLineEdit, QMainWindow, QMessageBox, QPushButton,
                               QTableWidget, QTableWidgetItem, QTabWidget,
                               QVBoxLayout, QWidget)

from models import Assignment, Meta, SetupKey
```

More widget classes than this lesson needs are imported on purpose. Later lessons use them.

## Step 6.2: The skeleton and the cell factory

The key ideas from Lesson 2 carry over: build cells from data, and keep a dict of them keyed by the same `Assignment` the database uses. `self.loaded` is the snapshot from Lesson 4, what the database said the last time this window looked.

```python
# ui.py   (add to the bottom)
class AssignmentTab(QWidget):
    """Tab 1: one row per setup, one checkable cell per machine."""

    saved = Signal()          # emitted after a successful Submit

    def __init__(self, repo, machines: list[str]):
        super().__init__()
        self.repo = repo
        self.machines = machines
        self.setups: list[SetupKey] = []
        self.items: dict[Assignment, QTableWidgetItem] = {}   # the lookup Qt doesn't give us
        self.loaded: set[Assignment] = set()                  # snapshot from the last load

        self.filter_box = QLineEdit()
        self.filter_box.setPlaceholderText("Filter parts...")

        self.table = QTableWidget(0, len(machines))
        self.table.setHorizontalHeaderLabels(machines)

        self.pending_label = QLabel("")
        self.submit_button = QPushButton("Submit")
        # (signals are connected step by step below)

        layout = QVBoxLayout(self)
        layout.addWidget(self.filter_box)
        layout.addWidget(self.table)
        layout.addWidget(self.pending_label)
        layout.addWidget(self.submit_button)

    def rebuild(self, setups: list[SetupKey]) -> None:
        """Create one checkable cell per (setup, machine) and remember each in self.items."""
        self.setups = setups
        self.items.clear()
        self.table.setRowCount(len(setups))
        self.table.setVerticalHeaderLabels([str(s) for s in setups])
        for row, setup in enumerate(setups):
            for col, machine in enumerate(self.machines):
                item = QTableWidgetItem()
                item.setFlags(Qt.ItemFlag.ItemIsUserCheckable | Qt.ItemFlag.ItemIsEnabled)
                item.setCheckState(Qt.CheckState.Unchecked)
                self.table.setItem(row, col, item)
                self.items[Assignment(setup, machine)] = item

    def checked(self) -> set[Assignment]:
        """Read the screen back into the same type the repository uses."""
        return {a for a, item in self.items.items()
                if item.checkState() == Qt.CheckState.Checked}
```

Take a moment: `rebuild` is Step 2.5 in a loop over *your* objects. `checked()` is Step 2.4's "loop over the dict", and it returns a `set[Assignment]`, the same type as `repository.load_assignments()`. **The UI's output and the database's input have the same type. That symmetry is why the three layers fit together.**

Simulate a user, with no window:

```python
# run it (needs PySide6, but opens no window)
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

import config
from models import Assignment, SetupKey
from ui import AssignmentTab

app = QApplication([])
machines = [m for family in config.MACHINES.values() for m in family]
setups = [SetupKey("100234", "OP10"), SetupKey("100234", "OP20"), SetupKey("200981", "OP10")]

tab = AssignmentTab(repo=None, machines=machines)
tab.rebuild(setups)
print(tab.table.rowCount(), "rows,", tab.table.columnCount(), "columns")
print("checked at start:", tab.checked())

# Pretend a user clicked two boxes:
tab.items[Assignment(setups[0], "OM6")].setCheckState(Qt.CheckState.Checked)
tab.items[Assignment(setups[2], "DV1")].setCheckState(Qt.CheckState.Checked)
for a in sorted(tab.checked(), key=lambda a: str(a.setup)):
    print("checked:", a.setup, a.machine_id)
```

Output:

```text
3 rows, 5 columns
checked at start: set()
checked: 100234_OP10 OM6
checked: 200981_OP10 DV1
```

**Predict:** how many rows and columns? Which two are checked at the end?

### How it works

**Widgets versus items.** `AssignmentTab` is a `QWidget` that *contains* a `QTableWidget`, which contains many `QTableWidgetItem`s. The class holds on to the pieces it needs later as attributes (`self.table`, `self.filter_box`...). An attribute you don't save on `self` is lost when `__init__` ends.

**`__init__` sets up state; `rebuild` fills it.** Why split them? The window is created once, but the list of setups can change many times (a re-scrape). So `rebuild` is something you can call again with new data. That's also why `rebuild` starts with `self.items.clear()`: the old dictionary entries point at cells that no longer exist.

Trace `rebuild` for 2 setups and 5 machines. The outer loop picks the setup (a row), the inner loop picks the machine (a column), and each pass does four things:

```python
item = QTableWidgetItem()                                   # a new empty cell
item.setFlags(ItemIsUserCheckable | ItemIsEnabled)          # make it tickable
item.setCheckState(Unchecked)                               # start unticked
self.table.setItem(row, col, item)                          # put it in the grid
self.items[Assignment(setup, machine)] = item               # and remember it
```

The last line is the important one, just like the `boxes` dict in Step 2.4, except the key is the real `Assignment` object. The row labels come from `setVerticalHeaderLabels([str(s) for s in setups])`, which uses the `__str__` you wrote in Step 3.4.

**`checked()`:**

```python
{a for a, item in self.items.items() if item.checkState() == Qt.CheckState.Checked}
```

"For every `(Assignment, cell)` pair, keep the Assignment if its cell is ticked." The result is a `set[Assignment]`, **the same type `repo.load_assignments()` returns.** That's why Lesson 4's `apply_changes(loaded, new)` can take it with no translation. The screen and the database speak one language.

Look at the output of the simulated user: we ticked two cells from code, and `checked()` reported exactly those two. You never touched a window, and you didn't need to.

## Step 6.3: "N unsubmitted changes"

**Why:** the user needs to see what they've clicked but not saved. That's `screen - loaded` again (Step 3.3).

```python
# ui.py   (add to the bottom)
    def pending(self) -> tuple[set[Assignment], set[Assignment]]:
        """What the user changed on screen but hasn't submitted yet: (added, removed)."""
        now = self.checked()
        added = now - self.loaded
        removed = {a for a in self.loaded if a in self.items and a not in now}
        return added, removed

    def set_state(self, assignments: set[Assignment]) -> None:
        self.table.blockSignals(True)       # don't fire itemChanged hundreds of times
        for a, item in self.items.items():
            item.setCheckState(Qt.CheckState.Checked if a in assignments
                               else Qt.CheckState.Unchecked)
        self.table.blockSignals(False)
        self.update_pending_label()

    def update_pending_label(self, *_args) -> None:
        added, removed = self.pending()
        n = len(added) + len(removed)
        self.pending_label.setText(f"{n} unsubmitted change(s)" if n else "")
```

Connect the table's `itemChanged` signal (Step 2.5) to the label:

In `ui.py`, change this:

```diff
-         # (signals are connected step by step below)
+         self.table.itemChanged.connect(self.update_pending_label)
+         # (more signals are connected in the next steps)
```

Two details: **`blockSignals(True)`** silences the table while `set_state` sets every box. Otherwise `itemChanged` would fire once per cell, hundreds of times. And **`*_args`** lets the slot accept whatever `itemChanged` passes (the item) while ignoring it.

```python
# run it (needs PySide6, but opens no window)
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

import config
from models import Assignment, SetupKey
from ui import AssignmentTab

app = QApplication([])
machines = [m for family in config.MACHINES.values() for m in family]
setups = [SetupKey("100234", "OP10"), SetupKey("100234", "OP20")]

tab = AssignmentTab(repo=None, machines=machines)
tab.rebuild(setups)

# Pretend the database said: 100234_OP10 is on OM1.
tab.loaded = {Assignment(setups[0], "OM1")}
tab.set_state(tab.loaded)
print("label after load:", repr(tab.pending_label.text()))

tab.items[Assignment(setups[1], "DV1")].setCheckState(Qt.CheckState.Checked)     # user ticks
print("label after one tick:", repr(tab.pending_label.text()))

tab.items[Assignment(setups[0], "OM1")].setCheckState(Qt.CheckState.Unchecked)   # user un-ticks
print("label after un-tick:", repr(tab.pending_label.text()))
added, removed = tab.pending()
print("added:", [str(a.setup) + "/" + a.machine_id for a in added])
print("removed:", [str(a.setup) + "/" + a.machine_id for a in removed])
```

Output:

```text
label after load: ''
label after one tick: '1 unsubmitted change(s)'
label after un-tick: '2 unsubmitted change(s)'
added: ['100234_OP20/DV1']
removed: ['100234_OP10/OM1']
```

**Predict:** what does the label say at each of the three points?

### How it works

**`pending()`** is the same subtraction as Submit, applied to the screen:

```python
now = self.checked()
added = now - self.loaded
removed = {a for a in self.loaded if a in self.items and a not in now}
```

`added`: ticked now, not in the snapshot. `removed`: in the snapshot, not ticked now. The `a in self.items` part skips snapshot entries with no cell on screen, such as a setup hidden by a re-scrape, so they can't be miscounted as "un-ticked by the user."

Trace the simulated run:

| moment | `loaded` | ticked now | added | removed | label |
|---|---|---|---|---|---|
| after `set_state(loaded)` | `{OP10/OM1}` | `{OP10/OM1}` | `{}` | `{}` | (empty) |
| user ticks OP20/DV1 | same | `{OP10/OM1, OP20/DV1}` | `{OP20/DV1}` | `{}` | 1 |
| user un-ticks OP10/OM1 | same | `{OP20/DV1}` | `{OP20/DV1}` | `{OP10/OM1}` | **2** |

The second tick doesn't cancel the first; it adds a second change. Each is a different difference from the snapshot.

**`blockSignals(True)`.** `set_state` loops over every cell and sets its check state, which fires `itemChanged` for each cell. Each firing would run `update_pending_label`, which runs `pending()`, which loops over every cell again. With 300 setups and 5 machines that's 1500 cells times 1500 work, over two million operations, just to redraw one label. `blockSignals(True)` mutes the table while we set everything, `blockSignals(False)` un-mutes it, and we call `update_pending_label()` **once** at the end.

**The patch connects the signal.** `self.table.itemChanged.connect(self.update_pending_label)` is the Step 2.2 pattern: a function reference, no parentheses. `*_args` in the method's signature collects whatever Qt passes (here the changed item) into a tuple we ignore. Without it, Qt would try to pass the item to a function that accepts none.

## Step 6.4: A filter box

Once you have hundreds of parts, you need a filter. Hiding rows is cheaper than rebuilding.

```python
# ui.py   (add to the bottom)
    def apply_filter(self, *_args) -> None:
        text = self.filter_box.text().strip().lower()
        for row, setup in enumerate(self.setups):
            self.table.setRowHidden(row, bool(text) and text not in str(setup).lower())
```

Two edits: a freshly rebuilt table should respect the current filter, and typing should trigger it.

In `ui.py`, change this:

```diff
-                 self.items[Assignment(setup, machine)] = item
+                 self.items[Assignment(setup, machine)] = item
+         self.apply_filter()
```

In `ui.py`, change this:

```diff
-         # (more signals are connected in the next steps)
+         self.filter_box.textChanged.connect(self.apply_filter)
+         # (more signals are connected in the next steps)
```

```python
# run it (needs PySide6, but opens no window)
from PySide6.QtWidgets import QApplication

import config
from models import SetupKey
from ui import AssignmentTab

app = QApplication([])
machines = [m for family in config.MACHINES.values() for m in family]
setups = [SetupKey("100234", "OP10"), SetupKey("100234", "OP20"), SetupKey("200981", "OP10")]
tab = AssignmentTab(repo=None, machines=machines)
tab.rebuild(setups)

def hidden():
    return [tab.table.isRowHidden(r) for r in range(tab.table.rowCount())]

print(hidden())
tab.filter_box.setText("200981")            # same as the user typing
print(hidden())
tab.filter_box.setText("")
print(hidden())
```

Output:

```text
[False, False, False]
[True, True, False]
[False, False, False]
```

**Predict:** which rows are hidden after typing `200981`?

### How it works

`apply_filter` doesn't delete or rebuild anything. It only hides rows:

```python
self.table.setRowHidden(row, bool(text) and text not in str(setup).lower())
```

Read the condition as English: "hide this row if there's some text **and** the text isn't in this row's label." If the filter box is empty, `bool(text)` is `False`, and `False and ...` is `False`, so nothing is hidden. Python's `and` stops at the first false part, so the `in` test isn't even evaluated.

Why hide instead of rebuilding with a filtered list? Because the cells are *state*: ticked boxes the user hasn't submitted yet. Rebuilding would wipe them. Hiding leaves every cell intact, so a filtered-out row still keeps its pending ticks and still counts in `checked()`.

That's also why `rebuild` now ends with `self.apply_filter()`: a fresh table should obey whatever is currently typed in the filter box.

The output shows the effect: typing `200981` hides rows 0 and 1 (`100234_...`) and leaves row 2. Clearing the box shows them again.

## Step 6.5: Submit

```python
# ui.py   (add to the bottom)
    def on_submit(self) -> None:
        try:
            self.repo.apply_changes(self.loaded, self.checked())
        except sqlite3.Error as exc:       # locked, unreachable, or a constraint failure
            QMessageBox.warning(self, "Could not save",
                                f"The shared database refused the save:\n\n{exc}")
            return
        self.saved.emit()
```

In `ui.py`, change this:

```diff
-         # (more signals are connected in the next steps)
+         self.submit_button.clicked.connect(self.on_submit)
```

`on_submit` passes `self.loaded` (the snapshot) and `self.checked()` (the screen) to the repository, which is Lesson 4's merge. If the database refuses (locked, unreachable), it shows a message and **returns without touching the user's clicks**, so they can retry. On success it emits `saved`, and whoever owns the tab decides what happens next. The tab doesn't know about the rest of the app.

Wire it to a real database, and click the real Submit button from code:

```python
# run it (needs PySide6, but opens no window)
import os
import tempfile

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

import config
import fakedata
from models import Assignment
from repository import Repository
from scraper import scrape_all
from ui import AssignmentTab

app = QApplication([])
repo = Repository(os.path.join(tempfile.mkdtemp(), "t.db"), user="alice", pc="PC-A")
repo.seed_machines(config.MACHINES)
repo.upsert_scrape(scrape_all(fakedata.make_fake_files(), config.TAB_RE).lines)

machines = [m for family in config.MACHINES.values() for m in family]
tab = AssignmentTab(repo, machines)
tab.rebuild(repo.list_setups())
tab.loaded = repo.load_assignments()

first = repo.list_setups()[0]
tab.items[Assignment(first, "OM6")].setCheckState(Qt.CheckState.Checked)
print("before:", repo.load_assignments())
tab.submit_button.click()
print("after: ", [f"{a.setup}/{a.machine_id}" for a in repo.load_assignments()])
print(repo.get_meta())
```

Output:

```text
before: set()
after:  ['100234_OP10/OM6']
Meta(revision=2, last_edited_by='alice', last_edited_pc='PC-A', last_edited_at='2026-11-07 15:23:59')
```

**Predict:** what does the database hold before and after the click?

### How it works

`on_submit` has a pattern worth memorizing: **try the risky call, catch only the expected failure, and leave things as they were.**

```python
try:
    self.repo.apply_changes(self.loaded, self.checked())
except sqlite3.Error as exc:
    QMessageBox.warning(...)
    return
self.saved.emit()
```

`sqlite3.Error` covers "database is locked", "unable to open database file" and constraint failures. If one happens, we show the message and `return`, so `saved.emit()` is skipped. Nothing was changed on screen, so the user's ticks are still there, and they can click Submit again. A version that cleared the screen on failure would throw away the user's work because of a network hiccup.

`self.saved.emit()` announces success. The tab doesn't say what should happen next, just that it happened. In the harness a listener reloads the data, and in Lesson 8 the main window uses it to poll at once. **The tab never needs to know about the main window.** That's why it's a signal rather than a direct call.

You may notice `on_submit` doesn't update `self.loaded` itself. After a successful save the snapshot is stale (it doesn't include the user's own change). That gets fixed by the reload that the `saved` signal triggers. If you skipped the reload, "unsubmitted changes" would keep counting changes that were already saved.

The simulated run proves the whole chain: tick a cell, click the real button, and the database holds the assignment, stamped alice/PC-A.

## Step 6.6: Run it on screen

Tab 1 can't refresh itself yet (that's Lesson 8), so here's a throwaway harness that does the three reload calls by hand. Save it as `run_tab1.py` and run it.

```python
# run it (opens a window; close it to finish)
import sys

from PySide6.QtWidgets import QApplication

import config
import fakedata
from repository import Repository
from scraper import scrape_all
from ui import AssignmentTab

repo = Repository("lesson6.db")
repo.seed_machines(config.MACHINES)
if not repo.list_setups():                       # first run only: fill the DB with fake data
    repo.upsert_scrape(scrape_all(fakedata.make_fake_files(), config.TAB_RE).lines)

machines = [m for family in config.MACHINES.values() for m in family]

app = QApplication(sys.argv)
tab = AssignmentTab(repo, machines)


def reload() -> None:
    tab.rebuild(repo.list_setups())              # build the grid from the database
    tab.loaded = repo.load_assignments()         # remember what the database said
    tab.set_state(tab.loaded)                    # tick the matching boxes


tab.saved.connect(reload)                        # after a successful Submit, reload
reload()                                         # and once on open

tab.resize(700, 500)
tab.show()
sys.exit(app.exec())
```

Tick some boxes, watch the label count them, click Submit, watch it clear. **Close the window, run it again, and your saved boxes are already ticked.** That's your "read the file when it opens and populate the checkmarks" requirement. In Lesson 8 the three lines in `reload()` become `AssignmentTab.refresh()`.

### How it works

The harness's `reload()` runs three lines in a specific order, and each depends on the one before it:

1. `tab.rebuild(repo.list_setups())` creates the cells. Until the cells exist, there's nothing to tick.
2. `tab.loaded = repo.load_assignments()` takes the snapshot, so "pending" and Submit have a baseline.
3. `tab.set_state(tab.loaded)` ticks the boxes that match the snapshot.

Swap 2 and 3 and `set_state` ticks the right boxes, but `pending()` compares against an empty `loaded`, and the label wrongly says every ticked box is an unsubmitted change.

`tab.saved.connect(reload)` is why you see your saved ticks stay after Submit. Close and reopen: `reload()` runs on startup, loads from the `.db` file, and ticks the boxes. That's the persistence you asked for. In Lesson 8 these three lines get packaged as `refresh()`, with one improvement: it keeps the user's unsubmitted ticks.

## Review cards

- **Q:** How do you read a `QTableWidget` checkbox? **A:** `item.checkState() == Qt.CheckState.Checked`, using the item you stored in your dict.
- **Q:** Why key the items dict by `Assignment`? **A:** Screen state and database state become the same type, comparable with set operations.
- **Q:** What is `self.loaded` for? **A:** The snapshot the window last loaded; pending changes and Submit are both computed against it.
- **Q:** Why `blockSignals(True)` in `set_state`? **A:** Otherwise `itemChanged` fires once per cell.
- **Q:** What should a failed Submit do to the user's clicks? **A:** Leave them alone and show the error so they can retry.

---

# Lesson 7: Tab 2, a machine's tools, and SQL joins

**Goal:** pick a machine in a combo box and show every tool line for every setup assigned to it. Most of this lesson is the SQL join, because that's the query you'll maintain the most.

## Step 7.1: Joins on tiny data

You want: *machine, then its assignments, then those setups' tool lines.* A **join** combines rows from two tables where a condition matches.

```python
# run it
import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE setup (part TEXT, tab TEXT, PRIMARY KEY (part, tab));
CREATE TABLE assignment (part TEXT, tab TEXT, machine TEXT);
INSERT INTO setup VALUES ('100', 'OP10'), ('100', 'OP20'), ('200', 'OP10');
INSERT INTO assignment VALUES ('100', 'OP10', 'OM1'), ('200', 'OP10', 'OM1'), ('200', 'OP10', 'DV1');
""")

print("INNER JOIN")
for row in con.execute("""
    SELECT s.part, s.tab, a.machine
    FROM setup s
    JOIN assignment a ON a.part = s.part AND a.tab = s.tab
    ORDER BY 1, 2, 3"""):
    print("  ", row)

print("LEFT JOIN")
for row in con.execute("""
    SELECT s.part, s.tab, a.machine
    FROM setup s
    LEFT JOIN assignment a ON a.part = s.part AND a.tab = s.tab
    ORDER BY 1, 2, 3"""):
    print("  ", row)
```

Output:

```text
INNER JOIN
   ('100', 'OP10', 'OM1')
   ('200', 'OP10', 'DV1')
   ('200', 'OP10', 'OM1')
LEFT JOIN
   ('100', 'OP10', 'OM1')
   ('100', 'OP20', None)
   ('200', 'OP10', 'DV1')
   ('200', 'OP10', 'OM1')
```

**Predict:** which row appears in the LEFT JOIN but not the INNER JOIN? Which setup appears twice?

1. **Composite keys join on every key column**: `ON a.part = s.part AND a.tab = s.tab`.
2. An **INNER JOIN drops rows with no match**. `100/OP20` is missing.
3. A **LEFT JOIN keeps every left row**, with `None` on the right.
4. A **join can multiply rows**: `200/OP10` is on two machines, so it appears twice.

**Try:** delete `AND a.tab = s.tab` from the inner join and run again. Rows from the *wrong tab* join in. That's the bug you'd get from forgetting half a composite key.

### How it works

**Think of a join as a nested loop.** For each row on the left, scan the right table for rows where the `ON` condition is true, and output a combined row for each match:

```
for s in setup:
    for a in assignment:
        if a.part == s.part and a.tab == s.tab:
            output (s.part, s.tab, a.machine)
```

(The database does it far more cleverly with indexes, but the result is the same.) Trace it with your data:

| setup row | matching assignment rows | rows output |
|---|---|---|
| `100/OP10` | one (`OM1`) | 1 |
| `100/OP20` | **none** | 0 in INNER, 1 (with `None`) in LEFT |
| `200/OP10` | two (`OM1`, `DV1`) | **2** |

That table is your whole output. Row `100/OP20` has no matches, so the INNER JOIN drops it entirely, and the LEFT JOIN keeps it and fills in `None` for the missing machine. `200/OP10` matches twice, so it appears twice.

**Why `AND a.tab = s.tab`?** A composite key identifies a row only as a *pair*. If you joined on `part` alone, `100/OP10` would match assignments for both `100/OP10` and `100/OP20`, and rows from the wrong tab would leak in. It's the most common join mistake with composite keys, and the "Try" step shows it happening.

**The mental model for choosing:** use INNER when you only care about rows that have a partner ("setups that are assigned somewhere"), and LEFT when you want everything on the left side regardless ("all setups, assigned or not").

## Step 7.2: `EXISTS`, one yes/no per row

When you want "is it used?" and not one row per machine, a join gives duplicates. `EXISTS` doesn't.

```python
# run it
import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE setup (part TEXT, tab TEXT, PRIMARY KEY (part, tab));
CREATE TABLE assignment (part TEXT, tab TEXT, machine TEXT);
INSERT INTO setup VALUES ('100', 'OP10'), ('100', 'OP20'), ('200', 'OP10');
INSERT INTO assignment VALUES ('100', 'OP10', 'OM1'), ('200', 'OP10', 'OM1'), ('200', 'OP10', 'DV1');
""")
for row in con.execute("""
    SELECT part, tab,
           EXISTS (SELECT 1 FROM assignment a
                   WHERE a.part = s.part AND a.tab = s.tab) AS used
    FROM setup s
    ORDER BY 1, 2"""):
    print(row)
```

Output:

```text
('100', 'OP10', 1)
('100', 'OP20', 0)
('200', 'OP10', 1)
```

**Predict:** how many rows come out, and which are used?

This is exactly how `v_tool_line` in Lesson 4 computes its `used` column.

### How it works

The `EXISTS (SELECT 1 FROM assignment a WHERE a.part = s.part AND a.tab = s.tab)` is a **correlated subquery**. It's a small query that runs *once per outer row*, and the `s.part` inside it refers to the row currently being looked at in the outer query.

For `100/OP10`, the inner query is "does any assignment have part `100` and tab `OP10`?" Yes, so `EXISTS` gives `1`. For `100/OP20`, nothing matches, so `0`. The `SELECT 1` doesn't matter, since `EXISTS` only cares whether the inner query returns *any* rows, never what's in them.

Compare with the join in Step 7.1: `200/OP10` appeared twice there because it has two assignments. With `EXISTS` it's **one row**, because `EXISTS` asks a yes/no question and stops at the first match. That's why this is the right tool for the "used" column: you want one row per tool, with a flag, not one row per assignment.

This is the logic behind the "used" filter in Lesson 9: a tool is used if *its setup* is assigned to at least one machine, and it's computed fresh every time, so it can never get out of date.

## Step 7.3: The repository method

The view already glues `tool` and `tool_process` into one row per Excel row, so the machine query is one join:

```python
# repository.py   (add to the bottom)
    def tool_lines_for_machine(self, machine_id: str) -> list[ToolLine]:
        rows = self.conn.execute(
            "SELECT v.* "
            "FROM assignment a "
            "JOIN v_tool_line v ON v.part_number = a.part_number AND v.tab = a.tab "
            "WHERE a.machine_id = ? AND v.active = 1 "
            "ORDER BY v.part_number, v.tab, v.tool_no, v.process_seq",
            (machine_id,))
        return [_line_from_row(r) for r in rows]
```

It reads: *for each assignment on this machine, take the view's rows for that setup, ignoring inactive setups.*

```python
# run it
import config
import fakedata
from models import Assignment
from repository import Repository
from scraper import scrape_all

repo = Repository(":memory:", user="alice", pc="PC-A")
repo.seed_machines(config.MACHINES)
repo.upsert_scrape(scrape_all(fakedata.make_fake_files(), config.TAB_RE).lines)
s1, s2 = repo.list_setups()[:2]
repo.apply_changes(set(), {Assignment(s1, "OM1"), Assignment(s2, "OM1"), Assignment(s2, "DV1")})

for machine in ("OM1", "DV1", "DV2"):
    lines = repo.tool_lines_for_machine(machine)
    print(machine, "->", len(lines), "tool lines from",
          sorted({str(l.setup) for l in lines}))
print(repo.tool_lines_for_machine("OM1")[0])
```

Output:

```text
OM1 -> 13 tool lines from ['100234_OP10', '100234_OP20']
DV1 -> 5 tool lines from ['100234_OP20']
DV2 -> 0 tool lines from []
ToolLine(setup=SetupKey(part_number='100234', tab='OP10'), tool_no=1, process_seq=1, description='#7 DRILL', diameter='0.25', collet='ER25', coolant='FLOOD', process='ROUGH', stickout='2.5', holder='CAT40 SHRINK')
```

**Predict:** why does `DV2` return nothing? Why does `OM1` have more lines than `DV1`?

### How it works

Read the query as a sentence, in the order the database thinks about it:

```sql
FROM assignment a                                   -- start with the assignment rows...
JOIN v_tool_line v ON v.part_number = a.part_number  -- ...attach the tool lines of each one's setup
                  AND v.tab = a.tab
WHERE a.machine_id = ?                              -- ...only for this machine
  AND v.active = 1                                  -- ...skipping vanished setups
ORDER BY ...                                        -- sorted for a stable display
```

The join starts from `assignment` rather than from the tools, because the machine is what narrows things down: first find this machine's few assignments, then attach each one's tool lines. `v.*` means "every column of the view", which exactly matches what `_line_from_row` reads.

`[_line_from_row(r) for r in rows]` is a list comprehension: for each SQL row, build a `ToolLine`. The UI gets objects, not rows.

Read your output. `OM1` has 13 lines from two setups, `DV1` has 5 from one (since only the second setup is on DV1), and `DV2` has none, since nothing is assigned there. A machine with no assignments produces an empty list, not an error. An empty INNER JOIN is a valid answer.

## Step 7.4: Two helpers every table needs

```python
# ui.py   (add to the bottom)
def make_item(value) -> QTableWidgetItem:
    """A read-only table cell. Storing the raw value (not text) lets numbers sort as numbers."""
    item = QTableWidgetItem()
    item.setData(Qt.ItemDataRole.DisplayRole, "" if value is None else value)
    item.setFlags(Qt.ItemFlag.ItemIsEnabled | Qt.ItemFlag.ItemIsSelectable)
    return item


def fill_table(table: QTableWidget, rows: list[list]) -> None:
    """Replace a table's contents. Sorting must be OFF while filling or rows get shuffled."""
    table.setSortingEnabled(False)
    table.setRowCount(len(rows))
    for r, values in enumerate(rows):
        for c, value in enumerate(values):
            table.setItem(r, c, make_item(value))
    table.setSortingEnabled(True)


def make_read_only_table(columns: list[str]) -> QTableWidget:
    table = QTableWidget(0, len(columns))
    table.setHorizontalHeaderLabels(columns)
    table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
    table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
    table.verticalHeader().setVisible(False)
    table.horizontalHeader().setStretchLastSection(True)
    return table
```

Why store the raw value, not text? Sorting:

```python
# run it (needs PySide6, but opens no window)
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication, QTableWidgetItem

from ui import fill_table, make_read_only_table

app = QApplication([])
table = make_read_only_table(["Tool"])
fill_table(table, [[10], [2], [1]])                       # numbers
table.sortItems(0, Qt.SortOrder.AscendingOrder)
print("numbers:", [table.item(r, 0).data(Qt.ItemDataRole.DisplayRole) for r in range(3)])

text = make_read_only_table(["Tool"])
text.setRowCount(3)
for r, v in enumerate(["10", "2", "1"]):                  # the same values as text
    text.setItem(r, 0, QTableWidgetItem(v))
text.sortItems(0, Qt.SortOrder.AscendingOrder)
print("text:   ", [text.item(r, 0).text() for r in range(3)])
```

Output:

```text
numbers: [1, 2, 10]
text:    ['1', '10', '2']
```

**Predict:** do both columns sort the same way?

Text sorting puts `10` before `2`. That's why `make_item` stores the number as a number.

### How it works

**`setData(Qt.ItemDataRole.DisplayRole, value)`.** A table item can hold a value for different "roles". The *display* role is "what to draw." If you set it to the integer `10`, the item still *shows* "10", but it *knows* it's a number. Sorting then compares `2 < 10`. A text item holding `"10"` compares character by character: `"1"` comes before `"2"`, so `"10"` sorts before `"2"`. Your output shows both outcomes on the same data: `[1, 2, 10]` versus `['1', '10', '2']`.

`"" if value is None else value`: a `None` would show as the text "None". We show a blank instead.

**`fill_table` turns sorting off while filling.** When sorting is on, Qt re-sorts after every item changes. As you fill row 0 and then row 1, previous rows are already moving, so cells end up in the wrong rows. The sequence is: off, fill everything, on. Turning sorting back on also re-applies whatever column the user last sorted by.

**`make_read_only_table`** sets four options you'd otherwise repeat for every table: `NoEditTriggers` (the user can't type into cells), `SelectRows` (clicking selects the whole row), hide the numbered vertical header, and `setStretchLastSection(True)` so the last column fills the window.

## Step 7.5: The tab

```python
# ui.py   (add to the bottom)
class MachineTab(QWidget):
    """Tab 2: pick a machine, see every tool line for the setups assigned to it."""

    COLUMNS = ["Part", "Tab", "Tool", "Proc", "Description", "Diameter",
               "Collet", "Coolant", "Process", "Stickout", "Holder"]

    def __init__(self, repo, machines: list[str]):
        super().__init__()
        self.repo = repo
        self.combo = QComboBox()
        self.combo.addItems(machines)
        self.combo.currentTextChanged.connect(self.refresh)   # signal -> slot

        self.summary = QLabel("")
        self.table = make_read_only_table(self.COLUMNS)

        layout = QVBoxLayout(self)
        layout.addWidget(self.combo)
        layout.addWidget(self.summary)
        layout.addWidget(self.table)

    def refresh(self) -> None:
        machine = self.combo.currentText()
        lines = self.repo.tool_lines_for_machine(machine)
        fill_table(self.table, [
            [l.setup.part_number, l.setup.tab, l.tool_no, l.process_seq, l.description,
             l.diameter, l.collet, l.coolant, l.process, l.stickout, l.holder]
            for l in lines
        ])
        setups = {l.setup for l in lines}
        self.summary.setText(f"{machine}: {len(setups)} setup(s), {len(lines)} tool line(s)")
```

`currentTextChanged` sends the new text, and `refresh` takes no arguments. That's allowed: a slot may accept fewer arguments than the signal sends. **`refresh()` is the one function that makes the screen match the database**, which is the idea Lesson 8 builds on.

Change the combo box from code, as if the user picked a machine:

```python
# run it (needs PySide6, but opens no window)
import config
import fakedata
from PySide6.QtWidgets import QApplication

from models import Assignment
from repository import Repository
from scraper import scrape_all
from ui import MachineTab

app = QApplication([])
repo = Repository(":memory:", user="alice", pc="PC-A")
repo.seed_machines(config.MACHINES)
repo.upsert_scrape(scrape_all(fakedata.make_fake_files(), config.TAB_RE).lines)
s1 = repo.list_setups()[0]
repo.apply_changes(set(), {Assignment(s1, "OM1")})

machines = [m for family in config.MACHINES.values() for m in family]
tab = MachineTab(repo, machines)
tab.refresh()
print(tab.summary.text())
tab.combo.setCurrentText("DV1")             # the user picks another machine
print(tab.summary.text())
tab.combo.setCurrentText("OM1")
print(tab.summary.text(), "|", tab.table.rowCount(), "table rows")
```

Output:

```text
OM1: 1 setup(s), 8 tool line(s)
DV1: 0 setup(s), 0 tool line(s)
OM1: 1 setup(s), 8 tool line(s) | 8 table rows
```

**Predict:** what does the summary say after switching to `DV1`?

### How it works

`self.combo.currentTextChanged.connect(self.refresh)` wires the dropdown to the table. Trace what happens when the user picks `DV1`:

1. The user clicks an entry. The event loop sees it.
2. The combo box emits `currentTextChanged("DV1")`.
3. Qt calls `self.refresh("DV1")`. Our `refresh` takes no argument, but Qt (via PySide) checks the function and only passes what it accepts, so the extra text is dropped.
4. `refresh` asks the combo for `currentText()` again, asks the repository, and fills the table.

We re-read the combo inside `refresh` rather than depending on the argument. That's deliberate: `refresh` can also be called by something else (Lesson 8's live updates call it with nothing), and it works the same either way.

**The design principle: `refresh()` makes the screen match the database.** It doesn't take instructions like "add this row." It just reads the current truth and redraws. That means it works the same no matter *why* it was called: the user changed the combo, a timer fired, another user saved. If you later find yourself writing "when X happens, update this one cell", that's usually a sign you should write `refresh` and call it instead.

The `addItems(machines)` call fills the combo, and the first one becomes selected. Your simulated output shows the effect: switching to `DV1` gave `0 setup(s), 0 tool line(s)`, since nothing is assigned there.

## Review cards

- **Q:** How do you join on a composite key? **A:** Compare every key column in `ON`, joined with `AND`.
- **Q:** INNER vs LEFT JOIN? **A:** Inner drops unmatched rows; left keeps every left row, filling the right with NULL.
- **Q:** Why can a join return more rows than the left table? **A:** One left row matching several right rows repeats per match.
- **Q:** How do you get yes/no per row without duplicates? **A:** `EXISTS (SELECT 1 ...)`.
- **Q:** Why store numbers (not text) in table cells? **A:** So sorting is numeric.
- **Q:** Why turn sorting off while filling a table? **A:** Otherwise Qt re-sorts mid-fill and rows get shuffled.

---

# Lesson 8: Live updates

**Goal:** assemble the main window, and make every open copy of the app update by itself when anyone saves.

## Step 8.1: The idea, in plain Python first

1. Every change bumps `meta.revision` (you built that in Lesson 4).
2. A timer in each window checks *just that one number*.
3. If it changed, the window emits **one signal**, and every tab reloads.

Watch the revision move:

```python
# run it
import config
import fakedata
from models import Assignment
from repository import Repository
from scraper import scrape_all

repo = Repository(":memory:", user="alice", pc="PC-A")
repo.seed_machines(config.MACHINES)
print("fresh:       ", repo.get_meta().revision)
repo.upsert_scrape(scrape_all(fakedata.make_fake_files(), config.TAB_RE).lines)
print("after scrape:", repo.get_meta())
s1 = repo.list_setups()[0]
repo.apply_changes(set(), {Assignment(s1, "OM1")})
print("after submit:", repo.get_meta())
repo.apply_changes(repo.load_assignments(), repo.load_assignments())       # changes nothing
print("no-op submit:", repo.get_meta().revision)
```

Output:

```text
fresh:        0
after scrape: Meta(revision=1, last_edited_by=None, last_edited_pc=None, last_edited_at=None)
after submit: Meta(revision=2, last_edited_by='alice', last_edited_pc='PC-A', last_edited_at='2026-11-07 15:24:00')
no-op submit: 2
```

**Predict:** which of these change the revision? Who is `last_edited_by` after the scrape?

### How it works

You built this in Lesson 4, and now you can see it do its job. **The revision is a change counter**, one number that goes up by one every time anything the app shows has changed. Any window can ask "is the revision different from the last one I saw?" instead of comparing all the data.

Trace your output:

| event | revision | why |
|---|---|---|
| fresh database | 0 | nothing has happened |
| after `upsert_scrape` | 1 | tool data changed; `last_edited_by` is still `None` (not a person's edit) |
| after a real submit | 2 | assignments changed; stamped with alice |
| no-op submit | 2 | nothing changed, `if events:` skipped the bump |

The last row matters. If a no-change Submit bumped the counter, every other window would reload for nothing.

**Why poll a counter instead of the whole data?** Every window asks every few seconds. Reading one small row from one table is nearly free, even over a slow network. Reading every assignment every few seconds would not be. And "did anything change" is a better question than "what changed", because answering it needs no comparison logic.

## Step 8.2: Reloading without trampling the user

Imagine Bob ticked a box but hasn't submitted, and a live update arrives because Alice saved. A naive reload overwrites Bob's screen with the database and **erases his unsaved click**. So `refresh` remembers his pending edits first, reloads, then puts them back on top:

`refresh` goes **inside `AssignmentTab`**, right under `on_submit`:

In `ui.py`, change this:

```diff
-         self.saved.emit()
+         self.saved.emit()
+ 
+     def refresh(self) -> None:
+         """Reload from the database WITHOUT trampling unsubmitted checkbox clicks."""
+         added, removed = self.pending()                  # remember the user's own edits first
+         setups = self.repo.list_setups()
+         if setups != self.setups:
+             self.rebuild(setups)
+         self.loaded = self.repo.load_assignments()
+         self.set_state((self.loaded - removed) | added)  # new DB state + user's edits on top
```

The last line is the whole idea: `(loaded - removed) | added`. Start from the new database state, take away what the user un-ticked, and add what they ticked. Try it:

```python
# run it (needs PySide6, but opens no window)
import os
import tempfile

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

import config
import fakedata
from models import Assignment
from repository import Repository
from scraper import scrape_all
from ui import AssignmentTab

app = QApplication([])
db = os.path.join(tempfile.mkdtemp(), "t.db")
alice = Repository(db, user="alice", pc="PC-A")
bob = Repository(db, user="bob", pc="PC-B")
alice.seed_machines(config.MACHINES)
alice.upsert_scrape(scrape_all(fakedata.make_fake_files(), config.TAB_RE).lines)
s1, s2 = alice.list_setups()[:2]

machines = [m for family in config.MACHINES.values() for m in family]
bob_tab = AssignmentTab(bob, machines)
bob_tab.refresh()                                                   # first load

bob_tab.items[Assignment(s2, "DV1")].setCheckState(Qt.CheckState.Checked)   # Bob ticks, no submit
print("Bob's label:", bob_tab.pending_label.text())

alice.apply_changes(set(), {Assignment(s1, "OM1")})                 # Alice saves something else
bob_tab.refresh()                                                   # Bob's window updates

print("Alice's change arrived:", bob_tab.items[Assignment(s1, "OM1")].checkState() == Qt.CheckState.Checked)
print("Bob's click survived:  ", bob_tab.items[Assignment(s2, "DV1")].checkState() == Qt.CheckState.Checked)
print("Bob's label:", bob_tab.pending_label.text())
```

Output:

```text
Bob's label: 1 unsubmitted change(s)
Alice's change arrived: True
Bob's click survived:   True
Bob's label: 1 unsubmitted change(s)
```

**Predict:** are both lines `True`? What does Bob's label say at the end?

**Try:** replace the last line of `refresh` with `self.set_state(self.loaded)` (the naive version) and run again. Bob's click disappears.

### How it works

This is the trickiest idea in the app, so here it is with concrete sets. Bob's window has the cell `A` ticked in the database (`loaded`), and he has just ticked `B` but hasn't submitted. Meanwhile Alice saves cell `C`.

| | `loaded` | ticked on Bob's screen | `added` | `removed` |
|---|---|---|---|---|
| before the update | `{A}` | `{A, B}` | `{B}` | `{}` |

The refresh runs `pending()` **first**, because afterward the screen will have changed and we'd lose track of what Bob did. Then it reloads: `self.loaded` becomes `{A, C}`. Then:

```python
self.set_state((self.loaded - removed) | added)
#               {A, C} - {}   = {A, C}
#                              | {B} = {A, B, C}
```

`-` takes away what Bob un-ticked, `|` (union) puts back what he ticked. The screen shows `{A, B, C}`: Alice's `C` arrived, Bob's `B` survived, and `pending()` now reports `B` as the one unsubmitted change. Your output confirms all three.

**The naive version is `self.set_state(self.loaded)`**, which would show `{A, C}`. Bob's `B` would silently disappear in the middle of his work. The "Try" step demonstrates it.

Notice the structure: **three sets and two operations**. This pattern (remember local edits, reload the base, replay the edits on top) is how every "live-updating form" works.

`if setups != self.setups: self.rebuild(setups)` rebuilds the table *only when the list of setups changed*. Rebuilding on every refresh would throw away all the cells for no reason. Comparing two lists of `SetupKey` objects works because dataclasses compare by fields.

## Step 8.3: The history tab

The "who changed what, from which PC, and when" requirement is a plain read of the event log you built in Lesson 4:

```python
# ui.py   (add to the bottom)
class HistoryTab(QWidget):
    """Who changed what, from which PC, and when."""

    COLUMNS = ["When", "User", "PC", "Part", "Tab", "Machine", "Action"]

    def __init__(self, repo):
        super().__init__()
        self.repo = repo
        self.table = make_read_only_table(self.COLUMNS)
        QVBoxLayout(self).addWidget(self.table)

    def refresh(self) -> None:
        fill_table(self.table, [
            [e.at, e.user_name, e.pc_name, e.setup.part_number, e.setup.tab,
             e.machine_id, e.action]
            for e in self.repo.recent_events()
        ])
```

### How it works

`HistoryTab.refresh` is the same pattern as `MachineTab.refresh`: read the truth, redraw. There's nothing new to learn except `QVBoxLayout(self).addWidget(self.table)`, a shortcut. `QVBoxLayout(self)` creates a layout and attaches it to this widget in one step, and `.addWidget` puts the table in it. The layout object is created without being stored in a variable. That's fine because the widget owns it from that moment.

Each row is built from an `Event` object, so the columns line up with the fields: `e.at`, `e.user_name`, `e.pc_name`... A mix-up between "user" and "PC" would be obvious in the code, rather than hidden in tuple positions.

## Step 8.4: The main window

Read this one before you type it. The new ideas are: **one signal with many listeners** (`data_changed`), a **`QTimer`**, and the status-bar stamp.

```python
# ui.py   (add to the bottom)
def stamp_text(meta: Meta) -> str:
    if meta.last_edited_at is None:
        return f"No assignment edits yet  |  rev {meta.revision}"
    return (f"Last edit: {meta.last_edited_by} on {meta.last_edited_pc} "
            f"at {meta.last_edited_at}  |  rev {meta.revision}")


class MainWindow(QMainWindow):
    data_changed = Signal()      # "the database changed; everybody reload"

    def __init__(self, repo, machines: list[str], poll_ms: int = 3000, on_rescrape=None):
        super().__init__()
        self.repo = repo
        self.last_revision = -1                      # -1 forces the very first load
        self.setWindowTitle(f"Tool Manager  -  {repo.user}@{repo.pc}")

        self.assign_tab = AssignmentTab(repo, machines)
        self.machine_tab = MachineTab(repo, machines)
        self.history_tab = HistoryTab(repo)

        tabs = QTabWidget()
        tabs.addTab(self.assign_tab, "Assignments")
        tabs.addTab(self.machine_tab, "By Machine")
        tabs.addTab(self.history_tab, "History")
        self.setCentralWidget(tabs)

        self.stamp_label = QLabel("")
        self.statusBar().addPermanentWidget(self.stamp_label)

        # One signal, many listeners.
        self.data_changed.connect(self.assign_tab.refresh)
        self.data_changed.connect(self.machine_tab.refresh)
        self.data_changed.connect(self.history_tab.refresh)
        self.assign_tab.saved.connect(self.poll)

        if on_rescrape is not None:
            button = QPushButton("Re-scrape sheets")
            button.clicked.connect(lambda: self.rescrape(on_rescrape))
            self.statusBar().addWidget(button)

        self.timer = QTimer(self)
        self.timer.timeout.connect(self.poll)
        self.timer.start(poll_ms)
        self.poll()                                  # first load uses the same path as live updates

    def poll(self) -> None:
        """Cheap check: has anyone changed the database since we last looked?"""
        try:
            meta = self.repo.get_meta()
        except sqlite3.Error as exc:
            self.stamp_label.setText(f"Cannot reach the shared database ({exc})")
            return
        self.stamp_label.setText(stamp_text(meta))
        if meta.revision != self.last_revision:
            self.last_revision = meta.revision
            self.data_changed.emit()

    def rescrape(self, scrape_fn) -> None:
        try:
            result = scrape_fn(self.repo)
        except Exception as exc:
            QMessageBox.warning(self, "Re-scrape failed", str(exc))
            return
        self.statusBar().showMessage(
            f"Re-scraped {result.setups_seen} setups; {len(result.deactivated)} went inactive", 5000)
        self.poll()
```

- **`data_changed`** is the fan-out: three tabs are connected to it, and `poll` emits it once. Adding a tab later means one more `connect` line.
- **`self.assign_tab.saved.connect(self.poll)`**: after *you* submit, this window polls immediately instead of waiting for the next tick.
- **`QTimer(self)`** is parented to the window so it lives as long as the window does.
- **The first load goes through the same path as a live update**, because `last_revision = -1` never matches. One code path, one place to get right.
- **If the database can't be reached**, `poll` shows a message instead of crashing.
- **The poll runs on the UI thread**, so a slow share will freeze the window briefly. That's acceptable while you learn; moving it to a background `QThread` is a later improvement.

### How it works

`MainWindow` coordinates everything and does almost no real work. It owns three things: the tabs, the timer, and the signal that connects them.

**The signal fan-out:**

```python
data_changed = Signal()
...
self.data_changed.connect(self.assign_tab.refresh)
self.data_changed.connect(self.machine_tab.refresh)
self.data_changed.connect(self.history_tab.refresh)
```

When `data_changed.emit()` runs, Step 2.3's list of functions is walked, and every tab refreshes. The poll code doesn't know how many tabs exist. Adding a fourth in Lesson 9 is one more `connect` line.

**The polling flow.** Here's one timer tick:

```
timer fires (every poll_ms)
   └─> poll()
        ├─ meta = repo.get_meta()            # one tiny read
        ├─ stamp_label.setText(...)          # always refresh the "last edit" text
        └─ if meta.revision != self.last_revision:
               self.last_revision = meta.revision
               data_changed.emit()           # -> every tab refreshes
```

**`last_revision = -1`** is the trick for the first load. Real revisions are 0 or more, so `-1` can never equal the current one. The first `poll()` in `__init__` therefore always sees "changed" and loads everything, the same path as a live update. One code path means one thing to debug.

**`QTimer(self)`**: passing `self` makes the window the timer's *parent*, so the timer is destroyed with the window. `timer.timeout.connect(self.poll)` is the same signal pattern, and `timer.start(poll_ms)` starts it.

**The `try/except sqlite3.Error` in `poll`** matters for a shared drive. If the network blips, `get_meta()` raises, we show "Cannot reach the shared database" in the status bar, and the window stays alive. On the next tick it tries again, and recovers on its own.

**`self.assign_tab.saved.connect(self.poll)`**: after *you* save, the revision has changed, but waiting up to 3 seconds to see your own change would feel broken. This makes the window check immediately.

**The `lambda` in the Re-scrape button:**

```python
button.clicked.connect(lambda: self.rescrape(on_rescrape))
```

`connect` needs a function with no required arguments, but `rescrape` needs `on_rescrape`. The `lambda` makes a tiny function that calls `rescrape` with it. The lambda *remembers* `on_rescrape` from the enclosing function (that's a closure), which is the same idea used in Step 8.5.

## Step 8.5: `main.py`

```python
# main.py   (new file)
"""Entry point:  python main.py"""
import os
import sys

from PySide6.QtWidgets import QApplication

import config
import fakedata
from repository import Repository
from scraper import scrape_all
from ui import MainWindow


def make_rescraper():
    """Each call to the returned function re-scrapes the fake files, flipping between
    version 1 and version 2 so you can watch tabs vanish and come back."""
    state = {"version": 1}

    def rescrape(repo):
        state["version"] = 2 if state["version"] == 1 else 1
        result = scrape_all(fakedata.make_fake_files(state["version"]), config.TAB_RE)
        return repo.upsert_scrape(result.lines)

    return rescrape, state


def main() -> None:
    # TOOLMGR_USER lets you pretend to be two different people on one PC.
    repo = Repository(config.DB_PATH, user=os.environ.get("TOOLMGR_USER"))
    repo.seed_machines(config.MACHINES)
    if not repo.list_setups():                         # first run: scrape once
        result = scrape_all(fakedata.make_fake_files(1), config.TAB_RE)
        repo.upsert_scrape(result.lines)
        for where, reason in result.skipped:
            print(f"skipped {where}: {reason}")

    rescrape, _ = make_rescraper()
    machines = [m for family in config.MACHINES.values() for m in family]

    app = QApplication(sys.argv)
    window = MainWindow(repo, machines, config.POLL_MS, on_rescrape=rescrape)
    window.resize(1100, 600)
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
```

### How it works

`make_rescraper` uses a **closure**: an inner function that remembers variables from the function around it.

```python
def make_rescraper():
    state = {"version": 1}
    def rescrape(repo):
        state["version"] = 2 if state["version"] == 1 else 1
        ...
    return rescrape, state
```

When `make_rescraper()` returns, its local variable `state` would normally vanish. But `rescrape` uses it, so Python keeps it alive, attached to `rescrape`. Each click calls the same `rescrape`, which sees the same `state`, so the version flips 1, 2, 1, 2...

Why a dict, not `version = 1`? Inside `rescrape`, writing `version = 2` would create a *new local variable*. You'd need `nonlocal version` to change the outer one. Changing an item inside a dict (`state["version"] = ...`) modifies the existing object and needs no special declaration.

**`os.environ.get("TOOLMGR_USER")`** reads an environment variable, or gives `None` if it isn't set. Passing `None` to `Repository` means "use the real login" (the `user or getpass.getuser()` from Step 4.2). That's how one program can be two users in two terminals.

The startup order in `main()` matters: open the repository, seed machines, **scrape only if the database has no setups yet** (so restarting doesn't re-scrape every time), and only then create the `QApplication` and window. Creating the window comes last because it reads the data as soon as it's built.

## Step 8.6: See two users, live, with no window

```python
# run it (needs PySide6, but opens no window)
import os
import tempfile

from PySide6.QtCore import Qt
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication

import config
import fakedata
from models import Assignment
from repository import Repository
from scraper import scrape_all
from ui import MainWindow

app = QApplication([])
db = os.path.join(tempfile.mkdtemp(), "t.db")
ra = Repository(db, user="alice", pc="PC-A")
rb = Repository(db, user="bob", pc="PC-B")
ra.seed_machines(config.MACHINES)
ra.upsert_scrape(scrape_all(fakedata.make_fake_files(), config.TAB_RE).lines)

machines = [m for family in config.MACHINES.values() for m in family]
alice_win = MainWindow(ra, machines, poll_ms=50)        # fast timer for the demo
bob_win = MainWindow(rb, machines, poll_ms=50)

print("Bob sees:", bob_win.stamp_label.text())
s1 = ra.list_setups()[0]
alice_win.assign_tab.items[Assignment(s1, "OM1")].setCheckState(Qt.CheckState.Checked)
alice_win.assign_tab.submit_button.click()              # Alice clicks Submit

QTest.qWait(300)                                        # let Bob's timer tick a few times
box = bob_win.assign_tab.items[Assignment(s1, "OM1")]
print("Bob's box ticked by itself:", box.checkState() == Qt.CheckState.Checked)
print("Bob sees:", bob_win.stamp_label.text())
print("Bob's history rows:", bob_win.history_tab.table.rowCount())
```

Output:

```text
Bob sees: No assignment edits yet  |  rev 1
Bob's box ticked by itself: True
Bob sees: Last edit: alice on PC-A at 2026-11-07 15:24:00  |  rev 2
Bob's history rows: 1
```

**Predict:** does Bob's box tick without anyone touching Bob's window? What does his status bar say?

### How it works

This run is the whole feature, with no window. Follow the clock:

1. Two `MainWindow`s are created. Each ran `poll()` once at construction, saw revision 1 (the scrape), and loaded.
2. Alice's window: a cell is ticked from code and Submit is clicked. `apply_changes` bumps the revision to 2.
3. `QTest.qWait(300)` lets the event loop run for 300 ms, and that's the important line. **Timers only fire while the event loop runs.** If we didn't wait, Bob's timer would never get a turn. The 50 ms poll fires about six times in that period.
4. On the first tick after the save, Bob's `poll()` sees revision 2 ≠ 1, emits `data_changed`, and his `AssignmentTab.refresh()` ticks the cell.

No one touched Bob's window, and it updated anyway. The status bar line shows who: `Last edit: alice on PC-A at ...  |  rev 2`.

## Step 8.7: See it for real

Open two terminals in the project folder.

```
$env:TOOLMGR_USER = "alice"; py main.py
$env:TOOLMGR_USER = "bob";   py main.py
```

(That's PowerShell. Both windows report the same PC name since it's one machine; at work they'd differ.)

1. Tick a box in Alice's window and click Submit. Within about 3 seconds Bob's window ticks it and the status bar shows `Last edit: alice`.
2. Tick a box in Bob's window *without* submitting, then save something as Alice. Bob's click survives, and Alice's change appears.
3. Click **Re-scrape sheets** in either window. The first click removes `400872_OP10` and adds `500321_OP10`; the second brings it back, with its checkmarks.

## Design decision: merge, not lock

You originally asked for the list to be **non-editable while someone else is editing**. I did not build a lock, on purpose. Transactions plus a snapshot merge make two people editing at once *safe*: each person's changes apply independently, and identical changes collapse. A lock would add a worse experience (people blocked from working) to solve a problem the merge already solves.

If a policy says "one editor at a time", here is how you'd add it: an `edit_lock` table with one row (`user`, `pc`, `taken_at`); taking the lock is an `INSERT` that fails if a row exists; a lock older than, say, 10 minutes counts as stale and can be stolen, because people close their laptops; the UI polls the lock like it polls the revision, and disables the checkboxes while someone else holds it. The stale lock is the part to design carefully.

Two more things to know: timestamps come from each PC's clock (a wrong clock means wrong history; a server database would stamp with its own), and **`QFileSystemWatcher` is not a replacement for polling**, because it's unreliable on network shares.

## Review cards

- **Q:** How does a window know the data changed? **A:** A timer polls `meta.revision`; if it differs from the last seen value, the window emits `data_changed`.
- **Q:** Why does the first load use the same path as live updates? **A:** One code path; `last_revision = -1` forces the first load.
- **Q:** How does `refresh` keep unsubmitted clicks? **A:** It computes pending edits first, reloads, then applies `(loaded - removed) | added`.
- **Q:** What's the pattern of one signal with several slots? **A:** Fan-out.
- **Q:** Why merge instead of lock? **A:** Transactions plus a snapshot merge already make concurrent edits safe without blocking anyone.
- **Q:** Where does "who changed what from which PC" come from? **A:** The `assignment_event` table, written in the same transaction as the change.

---

# Lesson 9: Tab 3, all tools, and the description parser

**Goal:** a searchable table of every tool with fields extracted from descriptions. The parser is built one rule at a time.

## Step 9.1: Tab 3 is a query, not a new entity

"All tools with filters" is a `SELECT` over the view from Lesson 4. "Used" is already computed there by `EXISTS` (Step 7.2). We build the `WHERE` piece by piece, and **only fixed SQL fragments are concatenated: the user's text always goes into the parameter list.**

```python
# repository.py   (add to the bottom)
    def search_tool_lines(self, text: str = "", used: bool | None = None) -> list[ToolStatus]:
        sql = "SELECT * FROM v_tool_line WHERE active = 1"
        params: list = []
        if text:
            sql += (" AND (part_number LIKE ? OR description LIKE ? "
                    "OR holder LIKE ? OR collet LIKE ?)")
            params += [f"%{text}%"] * 4
        if used is not None:
            sql += " AND used = ?"
            params.append(1 if used else 0)
        sql += " ORDER BY part_number, tab, tool_no, process_seq"
        return [ToolStatus(_line_from_row(r), bool(r["used"]))
                for r in self.conn.execute(sql, params)]
```

```python
# run it
import config
import fakedata
from models import Assignment
from repository import Repository
from scraper import scrape_all

repo = Repository(":memory:", user="alice", pc="PC-A")
repo.seed_machines(config.MACHINES)
repo.upsert_scrape(scrape_all(fakedata.make_fake_files(), config.TAB_RE).lines)
repo.apply_changes(set(), {Assignment(repo.list_setups()[0], "OM1")})

print("all:   ", len(repo.search_tool_lines()))
print("used:  ", len(repo.search_tool_lines(used=True)))
print("unused:", len(repo.search_tool_lines(used=False)))
print("BALL:  ", {s.line.description for s in repo.search_tool_lines(text="BALL")})
print("injection-shaped text finds:", repo.search_tool_lines(text="'; DROP TABLE tool; --"))
print("tables still there:", repo.search_tool_lines() != [])
```

Output:

```text
all:    64
used:   8
unused: 56
BALL:   {'3/8 BALL EM'}
injection-shaped text finds: []
tables still there: True
```

**Predict:** do `used + unused` add up to `all`? What happens with the `DROP TABLE` text?

### How it works

Building a query from optional pieces is common, and there's a safe way and an unsafe way:

```python
sql = "SELECT * FROM v_tool_line WHERE active = 1"
params = []
if text:
    sql += " AND (part_number LIKE ? OR description LIKE ? OR holder LIKE ? OR collet LIKE ?)"
    params += [f"%{text}%"] * 4
```

The SQL text is **only ever assembled from fixed strings that you wrote**. The user's text goes into `params`, never into `sql`. Each `?` is later filled from `params`, in order. That's why the `'; DROP TABLE tool; --` search in the output is harmless: it's treated as a value to look for, not as SQL.

`f"%{text}%"` wraps the text in `%` wildcards, so `LIKE` matches "contains". `[...] * 4` repeats the same pattern four times, one for each `?`. The number of `?` in the SQL and the length of `params` must match.

`if used is not None` (not `if used`) matters because `False` is a meaningful value ("only unused"), and `if used:` would treat `False` like "no filter".

**The numbers in your output add up:** 64 total, 8 used, 56 unused. The 8 are the tool lines of the one setup we assigned. `used + unused = all`, because every tool line is in exactly one group.

One honest limitation: in `LIKE`, a user-typed `%` or `_` acts as a wildcard. That's fine here, and it's the kind of detail you'd note if someone ever searches for a literal `%`.

## Step 9.2: Rules before machine learning

You asked whether NLP could pull fields like corner radius out of the descriptions. My answer: **start with rules.**

- Machining descriptions are messy but use a *small recurring vocabulary*: EM, BALL, DRILL, `.030R`, `4FL`, fractions.
- Rules are debuggable. When one fails you read a regex, not a model.
- Machine learning needs labeled examples you don't have at home, and still needs rules around it.

Two habits to build in from day one: **never overwrite the raw description** (the parser produces *separate* fields), and **keep an "unparsed" list**: descriptions nothing matched are your to-do list for new rules.

## Step 9.3: Regex in the small

```python
# run it
import re

text = "1/2 EM .030R 4FL"
radius = re.search(r"(\d*\.\d+|\d+/\d+)\s*R\b", text)      # a number followed by R
print(radius.group(1), radius.span())

# Cut the matched text out so later rules can't re-read it:
cut = text[:radius.start()] + " " + text[radius.end():]
print(repr(cut))

flutes = re.search(r"\b(\d+)\s*(?:FLUTES?|FLT|FL)\b", cut)
print(flutes.group(1))

print(re.search(r"\bR\b", "ROUGH"))        # \b stops "R" matching inside a word
```

Output:

```text
.030 (7, 12)
'1/2 EM   4FL'
4
None
```

**Predict:** what does `group(1)` print? What does the last line print?

The pieces: `\d` a digit, `\d*` zero or more, `\.` a literal dot, `|` or, `\s*` optional whitespace, `\b` a word boundary, `(...)` capture, `(?:...)` group without capturing.

### How it works

Here is what each regex piece means, read left to right on `(\d*\.\d+|\d+/\d+)\s*R\b`:

| piece | meaning |
|---|---|
| `(` ... `)` | **capture group**: remember this part, available as `group(1)` |
| `\d*` | zero or more digits |
| `\.` | a literal dot (a bare `.` means "any character") |
| `\d+` | one or more digits |
| `\|` | or |
| `\d+/\d+` | digits, slash, digits (a fraction like `1/32`) |
| `\s*` | zero or more whitespace characters |
| `R` | the letter R |
| `\b` | **word boundary**: the position between a letter/digit and a non-letter/digit |

So the whole thing says "a decimal like `.030` or a fraction like `1/32`, then optional spaces, then an `R` that ends a word."

**`\b` is why `R` doesn't match inside `ROUGH`.** There's no boundary between `R` and `O`, since both are letters. That's the last output line: `None`.

**`.span()` and cutting.** `radius.span()` gave `(7, 12)`, the positions in the string where the match starts and ends. `text[:7] + " " + text[12:]` rebuilds the string without that part, which is what `_cut` does. The result is `'1/2 EM   4FL'`, with the radius gone.

`(?:FLUTES?|FLT|FL)`: the `?:` makes a group *without capturing*, so you can use `|` inside it without it becoming `group(1)`. `FLUTES?` means `FLUTE` with an optional `S`.

**Why cut at all?** That's the next steps.

## Step 9.4: Rule 1, the tool type

```python
# descparse.py   (new file)
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedDescription:
    tool_type: str | None = None
    diameter_in: float | None = None     # inches. UNIT DECISION: mm gets converted.
    corner_radius: float | None = None   # inches
    flutes: int | None = None


# Order matters: the first rule that matches wins, so specific beats general.
TYPE_RULES = [
    (re.compile(r"\bSPOT\b"), "spot drill"),
    (re.compile(r"\bDRILL\b"), "drill"),
    (re.compile(r"\bTAP\b"), "tap"),
    (re.compile(r"\bBALL\b"), "ball endmill"),
    (re.compile(r"\bBULL\b"), "bull endmill"),
    (re.compile(r"\bCHAMFER\b"), "chamfer mill"),
    (re.compile(r"\bFACE\b"), "face mill"),
    (re.compile(r"\bEND\s*MILL\b|\bEM\b"), "endmill"),
    (re.compile(r"\bREAM(?:ER)?\b"), "reamer"),
]


def parse_description(raw: str) -> ParsedDescription:
    text = raw.upper()
    tool_type = next((name for rx, name in TYPE_RULES if rx.search(text)), None)
    return ParsedDescription(tool_type)
```

```python
# run it
from descparse import parse_description

for d in ["SPOT DRILL 90", "#7 DRILL", "3/8 BALL EM", "1/2 end mill 4 flute", "MYSTERY TOOL 55"]:
    print(f"{d!r:28} -> {parse_description(d).tool_type}")
```

Output:

```text
'SPOT DRILL 90'              -> spot drill
'#7 DRILL'                   -> drill
'3/8 BALL EM'                -> ball endmill
'1/2 end mill 4 flute'       -> endmill
'MYSTERY TOOL 55'            -> None
```

**Predict:** what is `SPOT DRILL 90`? Why? (Both the SPOT and DRILL rules match.)

**Try:** swap the first two entries of `TYPE_RULES`. "SPOT DRILL" becomes a plain drill. **When a type is misclassified, the fix is usually reordering this list.**

### How it works

`next((name for rx, name in TYPE_RULES if rx.search(text)), None)` packs a lot into one line. Read it from the inside out:

1. `(name for rx, name in TYPE_RULES if rx.search(text))` is a **generator**: it walks the rules and *produces* the name of each rule whose pattern matches. It's lazy: it does the work one rule at a time, only when asked.
2. `next(generator, None)` asks for the **first** item it produces, and returns `None` if there are none.

So the answer is the first rule that matches, and the rest are never even tested. That's why **the order of the list is the logic**.

Trace `SPOT DRILL 90`:

| rule | matches? |
|---|---|
| `\bSPOT\b` → spot drill | **yes, stop here** |
| `\bDRILL\b` → drill | (never tested) |

Swap the first two rules and the `DRILL` rule matches first, giving `drill`. So **specific rules go before general ones.** Likewise `BALL` and `BULL` sit before `EM`, because "3/8 BALL EM" contains both `BALL` and `EM`, and you want the more specific answer.

`text = raw.upper()` makes every rule case-insensitive without writing `re.IGNORECASE` in each one, so `end mill` and `END MILL` both match. `\bEND\s*MILL\b|\bEM\b` accepts `END MILL`, `ENDMILL` and `EM`.

`MYSTERY TOOL 55` matches nothing, so `next` returns `None`. That's what feeds the "unparsed" report.

## Step 9.5: Rule 2, corner radius, and *cutting it out*

The most important idea in the file: **extract the radius first and cut its text out.** Otherwise `.030` in `.030R` would be read as the diameter later.

In `descparse.py`, change this:

```diff
- def parse_description(raw: str) -> ParsedDescription:
+ RADIUS_RES = [
+     re.compile(r"(\d*\.\d+|\d+/\d+)\s*R\b"),     # .030R   .03R   1/32R
+     re.compile(r"\bR\s*(\d*\.\d+)"),             # R.03
+ ]
+ 
+ 
+ def _to_float(text: str) -> float:
+     if "/" in text:
+         num, den = text.split("/")
+         return int(num) / int(den)
+     return float(text)
+ 
+ 
+ def _cut(text: str, match: re.Match) -> str:
+     """Remove a matched span so later rules can't misread it."""
+     return text[:match.start()] + " " + text[match.end():]
+ 
+ 
+ def parse_description(raw: str) -> ParsedDescription:
```

In `descparse.py`, change this:

```diff
-     return ParsedDescription(tool_type)
+     corner_radius = None
+     for rx in RADIUS_RES:
+         m = rx.search(text)
+         if m:
+             corner_radius = round(_to_float(m.group(1)), 4)
+             text = _cut(text, m)
+             break
+ 
+     return ParsedDescription(tool_type, None, corner_radius, None)
```

```python
# run it
from descparse import parse_description

for d in ["1/2 EM .030R 4FL", "0.500 BULL NOSE R.03 3FL", "1/2 EM 1/32R", "3/8 BALL EM"]:
    print(f"{d!r:28} -> radius {parse_description(d).corner_radius}")
```

Output:

```text
'1/2 EM .030R 4FL'           -> radius 0.03
'0.500 BULL NOSE R.03 3FL'   -> radius 0.03
'1/2 EM 1/32R'               -> radius 0.0312
'3/8 BALL EM'                -> radius None
```

**Predict:** `1/32R` is what in decimal?

### How it works

Trace `"1/2 EM .030R 4FL"` through the function. Each rule reads the text and removes what it used:

| stage | text the next rule sees | extracted |
|---|---|---|
| start | `1/2 EM .030R 4FL` | |
| type rule | (unchanged) | `endmill` |
| radius rule | `1/2 EM   4FL` | `.030` → 0.03 |

The radius rule loops through `RADIUS_RES`, the first pattern for `.030R` and `1/32R`, the second for `R.03`, and `break`s on the first hit. `_to_float` converts a decimal (`float(".030")`) or a fraction (`1/32` → `1 / 32`).

**Why cut it out?** Take `BALL EM .030R 4FL`, with no diameter written. If the radius text stayed in, the diameter rule (Step 9.7) would find `.030` and report **a diameter of 0.03 inches**. A tool with a 0.03" diameter is wrong, and nothing would warn you. (I ran this: without the cut, the decimal pattern returns `.030`.) With the cut, the diameter rule never sees that text, and correctly reports `None`.

**The principle:** each rule *consumes* its text. Whatever is left is only the unexplained text, and later rules look only at that. It's like crossing off words you've already understood.

`round(..., 4)` avoids float noise: `1/32` is `0.03125`, which rounds to `0.0312`. (Python rounds half to even, so the output shows `0.0312`.)

## Step 9.6: Rule 3, flutes

In `descparse.py`, change this:

```diff
- RADIUS_RES = [
+ FLUTE_RE = re.compile(r"\b(\d+)\s*(?:FLUTES?|FLT|FL)\b")
+ 
+ RADIUS_RES = [
```

In `descparse.py`, change this:

```diff
-     return ParsedDescription(tool_type, None, corner_radius, None)
+     flutes = None
+     m = FLUTE_RE.search(text)
+     if m:
+         flutes = int(m.group(1))
+         text = _cut(text, m)
+ 
+     return ParsedDescription(tool_type, None, corner_radius, flutes)
```

```python
# run it
from descparse import parse_description

for d in ["1/2 EM .030R 4FL", "1/2 end mill 4 flute", "12MM EM 2FL", "3/8 BALL EM"]:
    print(f"{d!r:28} -> flutes {parse_description(d).flutes}")
```

Output:

```text
'1/2 EM .030R 4FL'           -> flutes 4
'1/2 end mill 4 flute'       -> flutes 4
'12MM EM 2FL'                -> flutes 2
'3/8 BALL EM'                -> flutes None
```

### How it works

Same pattern as the radius: find, convert, cut.

`FLUTE_RE = \b(\d+)\s*(?:FLUTES?|FLT|FL)\b` matches digits, optional space, and a flute word, so `4FL`, `4 FL`, `4 FLUTE`, `4 FLUTES` and `4FLT`. The capture group holds only the digits, and `int(m.group(1))` turns `"4"` into `4`.

The ordering matters again, in a subtler way. By the time the diameter rule runs, the `4` of `4FL` is gone from the text. Otherwise a tool like `EM 4FL` would have `4` as a candidate for something else. (The diameter patterns happen to need a slash, a decimal or `MM`, so a bare `4` is safe. But the habit of consuming is what keeps new rules from colliding.)

The `if m:` check is essential: `re.search` returns `None` if nothing matched, and `None.group(1)` would crash. Every extraction in the parser is "search, **if found** convert and cut."

## Step 9.7: Rule 4, diameter, with four formats

Millimetres (converted to inches), mixed fractions like `1-1/2`, plain fractions, then decimals, **in that order**. The radius and flute text is already cut out by now, which is why `.030` can't be mistaken for a diameter. (`:=` is the "walrus" operator: assign and test in one expression.)

In `descparse.py`, change this:

```diff
- FLUTE_RE = re.compile(r"\b(\d+)\s*(?:FLUTES?|FLT|FL)\b")
+ FLUTE_RE = re.compile(r"\b(\d+)\s*(?:FLUTES?|FLT|FL)\b")
+ MM_RE = re.compile(r"(\d+(?:\.\d+)?)\s*MM\b")
+ MIXED_RE = re.compile(r"\b(\d+)-(\d+)/(\d+)\b")  # 1-1/2
+ FRAC_RE = re.compile(r"\b(\d+)/(\d+)\b")         # 1/2
+ DEC_RE = re.compile(r"(?<![\w.])(\d*\.\d+)")     # .500   0.5   3.0
```

In `descparse.py`, change this:

```diff
-     return ParsedDescription(tool_type, None, corner_radius, flutes)
+     diameter = None
+     if (m := MM_RE.search(text)):
+         diameter = float(m.group(1)) / 25.4
+     elif (m := MIXED_RE.search(text)):
+         diameter = int(m.group(1)) + int(m.group(2)) / int(m.group(3))
+     elif (m := FRAC_RE.search(text)):
+         diameter = int(m.group(1)) / int(m.group(2))
+     elif (m := DEC_RE.search(text)):
+         diameter = float(m.group(1))
+     if diameter is not None:
+         diameter = round(diameter, 4)
+ 
+     return ParsedDescription(tool_type, diameter, corner_radius, flutes)
```

```python
# run it
from descparse import parse_description

for d in ["1/2 EM .030R 4FL", "12MM EM 2FL", "1-1/2 FACE MILL", "FACE MILL 3.0", "#7 DRILL"]:
    p = parse_description(d)
    print(f"{d!r:22} -> dia {p.diameter_in}  radius {p.corner_radius}  flutes {p.flutes}")
```

Output:

```text
'1/2 EM .030R 4FL'     -> dia 0.5  radius 0.03  flutes 4
'12MM EM 2FL'          -> dia 0.4724  radius None  flutes 2
'1-1/2 FACE MILL'      -> dia 1.5  radius None  flutes None
'FACE MILL 3.0'        -> dia 3.0  radius None  flutes None
'#7 DRILL'             -> dia None  radius None  flutes None
```

**Predict:** what's the diameter of `12MM EM 2FL` in inches? What does `#7 DRILL` give, and why?

`#7 DRILL` has no diameter: number and letter drills need a lookup table. I left that gap in on purpose, as a first special case for you to own.

### How it works

Four formats, checked in a fixed order, and the first that matches wins. It's an `if / elif` chain, so exactly one branch runs.

| order | pattern | example | calculation |
|---|---|---|---|
| 1 | `(\d+(?:\.\d+)?)\s*MM` | `12MM` | 12 / 25.4 = 0.4724 |
| 2 | `(\d+)-(\d+)/(\d+)` | `1-1/2` | 1 + 1/2 = 1.5 |
| 3 | `(\d+)/(\d+)` | `1/2` | 1 / 2 = 0.5 |
| 4 | `(\d*\.\d+)` | `3.0` | 3.0 |

**Why this order?** `1-1/2` contains `1/2`. If the plain-fraction rule ran before the mixed-fraction rule, `1-1/2 FACE MILL` would be read as `0.5`, ignoring the `1-`. **The more specific format must be tried first**, the same principle as the type rules.

**The walrus operator `:=`** assigns *and* tests in one expression. `if (m := MM_RE.search(text)):` means "search, store the result in `m`, and use it as the condition." Without it you'd write two lines, `m = MM_RE.search(text)` and then `if m:`, and with an `elif` chain you couldn't, because each `elif` needs its own search.

**`(?<![\w.])` in `DEC_RE`** is a *lookbehind*: "the character before must not be a word character or a dot." It stops the rule from matching inside something like `R.03`, where the `.03` is preceded by an `R`. (That's a second layer of protection on top of cutting.)

**Unit decision:** everything comes out in inches, so `MM` is converted. If your shop's descriptions mix units without saying so (a bare `12` meaning mm), that's a special case you'd have to own. `#7 DRILL` giving `None` is the other honest gap: a #7 drill's diameter comes from a lookup table, not from the text.

## Step 9.8: The unparsed list, and your test table

```python
# descparse.py   (add to the bottom)
def unparsed(descriptions) -> list[str]:
    """Your to-do list: descriptions where not even the tool type was recognised."""
    return sorted({d for d in descriptions if parse_description(d).tool_type is None})
```

**This is how you support the parser.** Whenever you fix a description at work, add it here and re-run:

```python
# run it
from descparse import ParsedDescription, parse_description, unparsed

cases = {
    "1/2 EM .030R 4FL":         ParsedDescription("endmill", 0.5, 0.03, 4),
    "0.500 BULL NOSE R.03 3FL": ParsedDescription("bull endmill", 0.5, 0.03, 3),
    "3/8 BALL EM":              ParsedDescription("ball endmill", 0.375, None, None),
    "#7 DRILL":                 ParsedDescription("drill", None, None, None),
    "1/4-20 TAP":               ParsedDescription("tap", 0.25, None, None),
    "12MM EM 2FL":              ParsedDescription("endmill", round(12 / 25.4, 4), None, 2),
    "FACE MILL 3.0":            ParsedDescription("face mill", 3.0, None, None),
    "1/2 end mill 4 flute":     ParsedDescription("endmill", 0.5, None, 4),
    "SPOT DRILL 90":            ParsedDescription("spot drill", None, None, None),
    "CHAMFER MILL 1/4":         ParsedDescription("chamfer mill", 0.25, None, None),
    "MYSTERY TOOL 55":          ParsedDescription(None, None, None, None),
    "1-1/2 FACE MILL":          ParsedDescription("face mill", 1.5, None, None),
    "1/2 EM 1/32R 4FL":         ParsedDescription("endmill", 0.5, 0.0312, 4),
}
bad = 0
for text, want in cases.items():
    got = parse_description(text)
    if got != want:
        bad += 1
        print("MISMATCH", repr(text), "\n   got ", got, "\n   want", want)
print("all good" if bad == 0 else f"{bad} failing")
print("unparsed:", unparsed(cases))
```

Output:

```text
all good
unparsed: ['MYSTERY TOOL 55']
```

Known gap: something like `M6x1.0 TAP` would misread `1.0` as a diameter. That's your next special case.

**Why compute instead of store?** Parsed values are derived data. Improve a rule and every screen is instantly right, with no migration and no stale values. And back in Lesson 1, corner radius hinted at subtypes (Endmill, Drill). Since the parser is computed on read, a nullable value is the honest model: a drill simply has `corner_radius = None`. If you ever *store* parsed values or need columns that exist for only one tool type, that's the moment for a supertype/subtype table, and you'd choose *disjoint* (a tool is one type) and *partial* (some won't classify).

### How it works

`unparsed` is a one-line set comprehension, and it's the feedback loop for the whole parser:

```python
sorted({d for d in descriptions if parse_description(d).tool_type is None})
```

"The set of descriptions where no type was recognized, sorted." Using a **set** removes duplicates (the same description appears on hundreds of tool lines, but you want to see it once). `sorted` makes the list stable.

Your workflow at work:

1. Open tab 3, tick "only descriptions the parser couldn't recognise."
2. Read the list. A pattern will jump out ("lots of `TAP M6`...").
3. Add a rule to `TYPE_RULES` (or a new extraction step).
4. Add the new example to the `cases` dictionary below, with the answer you expect.
5. Run the test block. If anything that used to pass now fails, your new rule broke something, and you know before anyone else does.

**The test table is your safety net.** Parser rules interact (order, cutting), so a fix for one description can quietly break another. Because `ParsedDescription` is a dataclass, `got != want` compares all four fields at once, and the `MISMATCH` printout shows both.

## Step 9.9: The tab

In `ui.py`, change this:

```diff
- from models import Assignment, Meta, SetupKey
+ from descparse import parse_description
+ from models import Assignment, Meta, SetupKey
```

```python
# ui.py   (add to the bottom)
class ToolSearchTab(QWidget):
    """Tab 3: every tool line, with filters and parsed description fields."""

    COLUMNS = ["Part", "Tab", "Tool", "Proc", "Description", "Type", "Dia (in)",
               "Corner R", "Flutes", "Holder", "Used"]

    def __init__(self, repo):
        super().__init__()
        self.repo = repo
        self.search_box = QLineEdit()
        self.search_box.setPlaceholderText("Search part, description, holder, collet...")
        self.search_box.textChanged.connect(self.refresh)

        self.used_combo = QComboBox()
        self.used_combo.addItems(["All tools", "Used (setup assigned)", "Unused"])
        self.used_combo.currentIndexChanged.connect(self.refresh)

        self.unparsed_only = QCheckBox("Only descriptions the parser couldn't recognise")
        self.unparsed_only.toggled.connect(self.refresh)

        self.summary = QLabel("")
        self.table = make_read_only_table(self.COLUMNS)

        layout = QVBoxLayout(self)
        layout.addWidget(self.search_box)
        layout.addWidget(self.used_combo)
        layout.addWidget(self.unparsed_only)
        layout.addWidget(self.summary)
        layout.addWidget(self.table)

    def refresh(self) -> None:
        used = {0: None, 1: True, 2: False}[self.used_combo.currentIndex()]
        statuses = self.repo.search_tool_lines(self.search_box.text().strip(), used)

        rows = []
        for st in statuses:
            parsed = parse_description(st.line.description)
            if self.unparsed_only.isChecked() and parsed.tool_type is not None:
                continue
            l = st.line
            rows.append([l.setup.part_number, l.setup.tab, l.tool_no, l.process_seq,
                         l.description, parsed.tool_type, parsed.diameter_in,
                         parsed.corner_radius, parsed.flutes, l.holder,
                         "yes" if st.used else "no"])
        fill_table(self.table, rows)
        self.summary.setText(f"{len(rows)} tool line(s)")
```

Each control is connected to the same `refresh`. Whatever you change, the table is rebuilt from the controls' *current* values. Now add the tab to the main window with three small edits:

In `ui.py`, change this:

```diff
-         self.history_tab = HistoryTab(repo)
- 
-         tabs = QTabWidget()
+         self.history_tab = HistoryTab(repo)
+         self.search_tab = ToolSearchTab(repo)
+ 
+         tabs = QTabWidget()
```

In `ui.py`, change this:

```diff
-         tabs.addTab(self.history_tab, "History")
+         tabs.addTab(self.search_tab, "All Tools")
+         tabs.addTab(self.history_tab, "History")
```

In `ui.py`, change this:

```diff
-         self.data_changed.connect(self.history_tab.refresh)
+         self.data_changed.connect(self.search_tab.refresh)
+         self.data_changed.connect(self.history_tab.refresh)
```

Prove all four tabs work together:

```python
# run it (needs PySide6, but opens no window)
import os
import tempfile

from PySide6.QtWidgets import QApplication

import config
import fakedata
from models import Assignment
from repository import Repository
from scraper import scrape_all
from ui import MainWindow

app = QApplication([])
repo = Repository(os.path.join(tempfile.mkdtemp(), "t.db"), user="alice", pc="PC-A")
repo.seed_machines(config.MACHINES)
repo.upsert_scrape(scrape_all(fakedata.make_fake_files(), config.TAB_RE).lines)
repo.apply_changes(set(), {Assignment(repo.list_setups()[0], "OM1")})

machines = [m for family in config.MACHINES.values() for m in family]
win = MainWindow(repo, machines, poll_ms=1000)
tab = win.search_tab
print("all tools:", tab.summary.text())

tab.used_combo.setCurrentIndex(1)
print("used only:", tab.summary.text())
tab.used_combo.setCurrentIndex(0)

tab.search_box.setText("BALL")
print("search BALL:", tab.summary.text(), "| types:",
      {tab.table.item(r, 5).text() for r in range(tab.table.rowCount())})
tab.search_box.setText("")

tab.unparsed_only.setChecked(True)
print("unparsed:", tab.summary.text(), "|",
      {tab.table.item(r, 4).text() for r in range(tab.table.rowCount())})
```

Output:

```text
all tools: 64 tool line(s)
used only: 8 tool line(s)
search BALL: 3 tool line(s) | types: {'ball endmill'}
unparsed: 10 tool line(s) | {'MYSTERY TOOL 55'}
```

**Predict:** what descriptions does the "unparsed only" filter show?

Run `py main.py` and you have the finished app.

### How it works

The first edit imports the parser. The `refresh` method is where the tab does its work. Walk it:

```python
used = {0: None, 1: True, 2: False}[self.used_combo.currentIndex()]
```

This is a **dictionary used as a lookup table**. The combo box gives an *index* (0, 1 or 2), and the dictionary translates it to the value the repository wants (`None` = no filter, `True`, `False`). It replaces a three-way `if/elif`, and the mapping reads in one line.

```python
statuses = self.repo.search_tool_lines(self.search_box.text().strip(), used)
```

The SQL-side filters (text and used) run in the database. Then the loop adds the **parser-side** filter in Python:

```python
if self.unparsed_only.isChecked() and parsed.tool_type is not None:
    continue
```

"If the user wants only unparsed rows, skip this row if its type *was* recognized." The parser runs in Python, so it can't be part of the SQL query, and that's a real consequence of computing parse results instead of storing them (Step 9.8).

**All three controls connect to the same `refresh`.** Typing, picking a used-filter, and ticking the checkbox each call `refresh`, which reads **all three controls' current values** and rebuilds the table. You never need code like "if the used filter changed *and* text is set." The function just reads the screen state every time. It's the same principle as Step 7.5.

The three small `PATCH` edits at the end add the tab in three places: create it, add it to the tab widget, and connect it to `data_changed`. A new tab is always those three things.

In your output, `search BALL` returned 3 rows, all with type `ball endmill`, and the unparsed filter returned only `MYSTERY TOOL 55`.

## Review cards

- **Q:** Is "all tools with filters" a new entity? **A:** No. It's a query (a view) over existing tables.
- **Q:** How do you build a dynamic `WHERE` safely? **A:** Concatenate only fixed SQL fragments; put user input in the parameter list.
- **Q:** Rules or machine learning for descriptions? **A:** Rules first: debuggable, no labeled data. ML only if rules plateau.
- **Q:** Why extract the corner radius before the diameter? **A:** Cutting the radius text out keeps `.030` in `.030R` from being read as a diameter.
- **Q:** Why does rule order in `TYPE_RULES` matter? **A:** The first match wins, so specific rules go before general ones.
- **Q:** Stored or computed parse results? **A:** Computed on read; fixing a rule fixes every row.
- **Q:** What's the "unparsed" list for? **A:** A to-do list for new rules.

---

# Appendix A: Where each kind of change goes

| You hear | Look in |
|---|---|
| "My tab isn't showing" | the scraper's skip report; `config.TAB_RE` |
| "Wrong part number" | `find_label`, `clean_cell` |
| "A tool's description is wrong" | the `INSERT OR IGNORE` in `upsert_scrape` (first row wins) |
| "It didn't parse this description" | `descparse.py`; add it to your test table |
| "Someone's change got overwritten" | `apply_changes` |
| "database is locked" | the 10-second timeout; an open transaction; the shared-drive question |
| "My checkbox un-ticked itself" | `AssignmentTab.refresh` / `pending` |
| "We bought a new machine" | `config.MACHINES` (removing one needs a deliberate migration, since assignments point at it) |

## Recipe: add a new Excel column (for example, spindle speed)

1. **Scraper:** raise `N_COLUMNS` and add a name to the unpack line in `scrape_sheet`.
2. **Model:** add a field to `ToolLine` in the same position as the Excel column.
3. **Schema:** add the column to `tool` or `tool_process`, depending on what it depends on (Lesson 1). `CREATE TABLE IF NOT EXISTS` does **not** alter a table that already exists, so existing databases also need `ALTER TABLE ... ADD COLUMN`. `PRAGMA user_version` stores a schema version number in the file to track this.
4. **View:** it lists columns by name, so drop and recreate it.
5. **Repository:** add the column to the `INSERT` in `upsert_scrape` and to `_line_from_row`.
6. **UI:** add the heading to `COLUMNS` and the value to the row list.

# Appendix B: If you move off SQLite

Only `repository.py` changes. For PostgreSQL as the example:

| SQLite code | Server database |
|---|---|
| `?` placeholders | `%s` (psycopg) or `$1`, depending on the driver |
| `INSERT OR IGNORE` | `INSERT ... ON CONFLICT DO NOTHING` |
| `BEGIN IMMEDIATE` | an ordinary transaction, plus locks where needed |
| `PRAGMA foreign_keys` | not needed: always enforced |
| `except sqlite3.Error` in `ui.py` | have the repository raise its own `RepositoryError`, so the UI never imports a driver |
| schema created at start-up | migrations run by an admin |
| timestamps from each PC | `now()` from the server (trustworthy history) |

# Appendix C: A review schedule

- **Day 0:** do the lesson, answer the review cards from memory.
- **Day 1:** answer the cards again *before* looking. Re-read only what you missed.
- **Day 3, 7, 14:** same again.
- **Once a week for a month:** rebuild one piece from a blank file with no guide. Good ones: `SetupKey`/`Assignment`; `apply_changes` (write the set arithmetic first); `AssignmentTab.refresh`; one INNER vs LEFT join. Rebuilding, not re-reading, is what makes it stick.