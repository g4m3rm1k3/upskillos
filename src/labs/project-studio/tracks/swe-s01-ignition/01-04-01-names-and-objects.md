---
title: Names and Objects: What Assignment Really Does
runtime: python
---

In 01-02-03, Blockfall's board was 20 lists of ten 0s, written out in full. There's a shorter way to build it in Python: `[[0] * 10] * 20`, "a row of ten 0s, twenty times". It looks right and prints right. Then you fill one square and twenty squares fill. JavaScript has the same trap: `new Array(20).fill(new Array(10).fill(0))`. And yet 01-03-02 built today's board with `new Array(ROWS).fill(0)`, and that one is fine. This lesson starts module 1.4, on reading code by tracking what it changes, and it begins with the question underneath that difference: what does `=` actually do? It doesn't copy anything. It gives an object a name. Two names for one object are where a great many real bugs come from, in any language with lists and objects, and in code an AI assistant writes for you as much as in your own.

**By the end you can:**

- Trace a sequence of assignments and say, for each name, which object it refers to and which names share one.
- Predict what code prints when it changes an object through one name and reads it through another, in Python and in JavaScript.
- Say what `==` and `is` compare in Python, and `===` in JavaScript, and choose the right one.
- Find an aliasing bug from its evidence with `is` or `id`, and fix it by making separate objects.

**You need:** module 1.1 and the JavaScript of 01-02-03 (Blockfall's console). This is a concept lesson: nothing is added to Kit or Blockfall. The Python experiments are small files in `kit` (commands run inside it: `cd ../kit` if you're in `blockfall`), and the JavaScript ones run in Blockfall's console. Both languages, because they share this model exactly: what you learn about one is true of the other.

## A board that fills twenty squares

Here's the short board, with one square filled and the filled rows counted:

```python file=kit/board_bug.py
# A board of 20 rows of 10 squares, built the short way.
board = [[0] * 10] * 20
board[19][0] = 1  # fill one square: the bottom row, column 0

filled = 0
for row in board:
    if row[0] == 1:
        filled += 1
print("rows with column 0 filled:", filled)
```

`[0] * 10` repeats a list's items: `[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]`. The outer `* 20` repeats *that* list's one item twenty times.

```predict
question: board[19][0] = 1 changes the first square of the last row. How many rows will the program count with column 0 filled?
choice: 1
choice: 19
choice: 20
choice: 0
answer: 20
explain: Every row reports a 1 in column 0, so the count is 20. It looks as if one assignment changed twenty rows. The next two steps show why: there aren't twenty rows, there's one, with twenty references to it.
verify: cd kit; .venv/Scripts/python board_bug.py
```

Save it and run `.venv/bin/python board_bug.py` (on Windows, `.venv\Scripts\python board_bug.py`). It prints `rows with column 0 filled: 20`. No error, and no line of the program mentions any row but the last. Something in the model "a list of 20 rows" is wrong. Keep the file; you'll come back to it with a way to see what's going on.

```check
run "cd kit; .venv/Scripts/python board_bug.py" stdout="rows with column 0 filled: 20" -- board_bug.py should build the board with [[0] * 10] * 20 and count the filled rows.
```

## Names refer to objects

A common first model of a variable is a box: `a = [1, 2]` puts a list in a box called `a`, and `b = a` copies it into a box called `b`. It's wrong, and this program shows it:

```python file=kit/names.py
a = [1, 2]
b = a  # a second name for the same list
b.append(3)  # change the list, through the name b
c = [1, 2, 3]  # a different list with the same contents

print(a, b)
print(a is b, a == b)
print(a is c, a == c)
```

```predict
question: The program appends 3 through b only. What does print(a, b) show?
choice: [1, 2] [1, 2, 3]
choice: [1, 2, 3] [1, 2, 3]
choice: [1, 2] [1, 2]
answer: [1, 2, 3] [1, 2, 3]
explain: b = a didn't copy the list. It made b a second name for the one list a already named, so appending through b changes the list that a names too. There was only ever one list here (until c).
verify: cd kit; .venv/Scripts/python names.py
```

Save it and run `.venv/bin/python names.py`:

```
[1, 2, 3] [1, 2, 3]
True True
False True
```

The model that fits is **names and objects**. An **object** is a thing in the running program's memory: a list, a dictionary, a number, a string. A **name** (a variable) is not a box holding an object; it's a label that *refers to* one. Assignment, `name = expression`, works out the expression to get an object, then makes the name refer to that object. It never copies the object. Here is the program after its fourth line:

```
a ──┐
    ├──▶  [1, 2, 3]     one list, two names
b ──┘
c ─────▶  [1, 2, 3]     another list, equal to it
```

When two names refer to the same object, each is an **alias** for it, and **aliasing** is what you just saw: a change made through one name is visible through every other, because there is only one thing to change.

Every object has an **identity**: which object it is, as opposed to what's in it. Python compares the two with different operators:

- `a == c` asks **equality**: do the objects hold equal values? For lists, the same items in the same order. `True`.
- `a is c` asks **identity**: are they one and the same object? `False`: two lists that happen to be equal.
- `a is b` is `True`: two names, one object.

`id(x)` gives an object's identity as a number, unique among the objects that exist at the same time (in the standard Python, CPython, it's the object's memory address). `id(a) == id(b)` means the same as `a is b`.

Changing an object and changing a name are different acts. `b.append(3)` changed the list. `b = [7]` would change only the name `b`, making it refer to a new list and leaving `a` and its list alone. Which objects *can* be changed in place, and which can't, is the next lesson.

```check
run "cd kit; .venv/Scripts/python names.py" stdout="[1, 2, 3] [1, 2, 3]" -- b = a makes a second name for the list, so appending through b shows through a.
run "cd kit; .venv/Scripts/python names.py" stdout="True True" -- a is b: one object; a == b: equal values.
run "cd kit; .venv/Scripts/python names.py" stdout="False True" -- c is a separate list with equal contents: not the same object, but equal.
```

## Finding the alias

Back to the board, with the new model. The evidence: one assignment to `board[19][0]` changed column 0 in all twenty rows. A hypothesis that explains it: all twenty "rows" are one list. Test it before believing it. Each of these asks the hypothesis a question:

```
.venv/bin/python -c "from board_bug import board; print(board[0] is board[19], len(set(id(row) for row in board)))"
```

(Importing `board_bug` runs it, so its line prints first.) Then `True 1`: the first and last rows are the same object, and the 20 rows have just one identity between them. `set(id(row) for row in board)` collects the rows' identities, and a set keeps only distinct values, so its size is the number of different row objects.

So `* 20` repeated a *reference*. `[row_list] * 20` is a list of 20 references to `row_list`, not 20 lists. Here's the board as it really is:

```
board ──▶ [ • , • , • , … , • ]     20 slots
            │   │   │       │
            └───┴───┴──…────┴──▶  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]     one row
```

The fix is to evaluate `[0] * 10` twenty separate times, so that each evaluation makes a new list. A **list comprehension** does that: `[expression for name in iterable]` builds a list by working out `expression` once for each item. `[[0] * 10 for row in range(20)]` runs `[0] * 10` twenty times and collects twenty different lists. (The name `row` isn't used in the expression; it's just what the loop needs. Python programmers often write `_` for a name that's deliberately unused.)

```python file=kit/board_bug.py
# A board of 20 rows of 10 squares, each row its own list.
board = [[0] * 10 for row in range(20)]
board[19][0] = 1  # fill one square: the bottom row, column 0

filled = 0
for row in board:
    if row[0] == 1:
        filled += 1
print("rows with column 0 filled:", filled)
```

Save it and run `.venv/bin/python board_bug.py`: `rows with column 0 filled: 1`. Run the identity test again, and it says `False 20`.

But the inner `[0] * 10` still repeats one object ten times: the number 0. Why isn't *that* a bug? Because `board[19][0] = 1` doesn't change the 0. It's an assignment to a list slot: it makes slot 0 of row 19 refer to the object 1 instead. The other slots still refer to 0, unchanged. Sharing an object only causes trouble when something changes the shared object itself, and there's no way to change the number 0 into something else. That's the difference between the two Blockfall boards: `new Array(ROWS).fill(0)` repeats a number, which nothing can change; `fill(new Array(10).fill(0))` repeats a row, which `row[c] = 1` changes for everyone.

```check
run "cd kit; .venv/Scripts/python board_bug.py" stdout="rows with column 0 filled: 1" -- Build the board with a list comprehension, so each row is a new list.
run "cd kit; .venv/Scripts/python -c \"from board_bug import board; print(board[0] is board[19], len(set(id(row) for row in board)))\"" stdout="False 20" -- Every row should be a different object.
```

## Equal is not the same

`==` and `is` give the same answer often enough to be mistaken for each other. Three cases where they don't:

1. **`in` uses equality.** `[1, 2] in [[1, 2]]` is `True`, although the list you're asking about is a new one that was never put in. `x in items` asks "is any item *equal* to x?" (Python checks identity first, as a shortcut, then equality.) To ask whether one particular object is there, ask about identity yourself: `any(x is item for item in items)`.
2. **Equal numbers may or may not be one object.** In this one program, `a = 1000; b = 1000; print(a is b)` prints `True`, because Python stored the one constant `1000` once. But `int("1000") is int("1000")` is `False`: two separate calculations made two objects. And `int("5") is int("5")` is `True`, because CPython keeps one shared object for each small integer from −5 to 256. None of that is a rule of the language; it's how one implementation saves memory, and it can change. Python itself warns you: `.venv/bin/python -c "print(1000 is 1000)"` prints `True`, but first `SyntaxWarning: "is" with 'int' literal. Did you mean "=="?`.
3. **`is` is for identity questions.** The common one is `x is None`, as `count.py` and `hexdump.py` already do: there is exactly one `None` object, so identity is the precise question. For values (numbers, strings, lists), use `==`.

```predict
question: What does [1, 2] in [[1, 2]] print, and what does any(x is [1, 2] for x in [[1, 2]]) print? (Each [1, 2] written out makes a new list.)
choice: True True
choice: True False
choice: False False
choice: False True
answer: True False
explain: in compares by equality, and the list inside is equal to the one you're asking about, so True. The identity test asks whether one of the items is that very object, and the item is a different list made by a different [1, 2], so False.
verify: cd kit; .venv/Scripts/python -c "print([1, 2] in [[1, 2]], any(x is [1, 2] for x in [[1, 2]]))"
```

```check
run "cd kit; .venv/Scripts/python -c \"print([1, 2] in [[1, 2]], int('1000') is int('1000'), int('1000') == int('1000'), None is None)\"" stdout="True False True True" -- in and == compare values; is compares identity; there is one None.
```

## The same model in JavaScript

JavaScript names work the same way. Go to Blockfall: `cd ../blockfall`, open `index.html` as in 01-02-03 (`start index.html` on Windows, `open index.html` on macOS, `xdg-open index.html` on Linux), and open the developer console (F12). Type each line and press Enter:

```
const a = [1, 2];
const b = a;
b.push(3);
a
a === b
[1, 2] === [1, 2]
```

`a` shows `[1, 2, 3]`: `b = a` made a second name for one array, as in Python. `a === b` is `true`. And `[1, 2] === [1, 2]` is `false`: for arrays and objects, `===` compares **identity**, so two equal arrays made separately are not `===`. JavaScript has no built-in deep equality for arrays; to compare contents you compare item by item, or (for simple data) compare `JSON.stringify(a) === JSON.stringify(b)`.

For numbers, strings and booleans, `===` compares values, and nothing can change one of those values in place (`s += "c"` makes a new string and rebinds `s`). JavaScript calls these **primitives**. Python treats its numbers and strings the same way in effect, so the one model covers both: names refer to objects, and some objects can't be changed.

Now the JavaScript trap from the start of the lesson, and the reason Blockfall avoided it:

```
const rows = new Array(3).fill([]);
rows[0].push(1);
rows
```

It shows `[[1], [1], [1]]`. `fill` put the one array you passed it into every slot, exactly like Python's `* 20`. Blockfall's `new Array(ROWS).fill(0)` is safe because it fills with a number.

Two more things you already wrote are explained by the model:

- **`const board` is changed all the time.** `lock` does `board[cell.row] = …`. `const` means the *name* `board` can never be made to refer to another object (try `board = []`: `TypeError: Assignment to constant variable.`). It doesn't stop the object it refers to from being changed. A `const` array is a fixed name for a changeable array.
- **`moved` returns new cells.** In 01-02-03, `canMove(piece, 0, -1)` tried a move without changing `piece`. That works because `moved` uses `map` and builds a new `{ row, col }` object for every cell: `moved(piece, 1, 0) === piece` is `false`, and so is `moved(piece, 1, 0)[0] === piece[0]`. Had it changed `cell.row` on the cells it was given, asking "can it move?" would have moved it.

```check
page blockfall/index.html "(() => { const a = [1, 2]; const b = a; b.push(3); return [a.join(','), a === b, [1, 2] === [1, 2]].join(' '); })()" "1,2,3 true false" -- In JavaScript too, b = a names the same array, and === on arrays compares identity.
page blockfall/index.html "(() => { const rows = new Array(3).fill([]); rows[0].push(1); return JSON.stringify(rows); })()" "[[1],[1],[1]]" -- fill puts the one array into every slot.
page blockfall/index.html "(() => { const next = moved(piece, 1, 0); return [next === piece, next[0] === piece[0], piece[0].row].join(' '); })()" "false false 0" errors=none -- moved builds new cells and leaves the piece where it was.
```

## Aliases you didn't write

The board's alias came from `* 20`, which doesn't look like an assignment. Most aliases are like that. Three more you'll meet constantly:

```python file=kit/sharing.py
# Three places a second name appears without an assignment you can see.


# 1. A parameter is a new name for the caller's object.
def mark(row):
    row[0] = 1


# 2. Assigning to the parameter moves only the function's own name.
def replace(row):
    row = [9, 9, 9]


squares = [0, 0, 0]
mark(squares)
print("after mark:", squares)
replace(squares)
print("after replace:", squares)

# 3. A container holds references to objects, not copies of them.
settings = {"width": 10}
saved = [settings, settings]
settings["width"] = 12
print("saved:", saved)
```

```predict
question: What does "after replace:" show? replace assigns a new list to its parameter.
choice: after replace: [9, 9, 9]
choice: after replace: [1, 0, 0]
choice: after replace: [0, 0, 0]
answer: after replace: [1, 0, 0]
explain: Calling replace(squares) makes the parameter row a second name for the caller's list. row = [9, 9, 9] then makes row refer to a new list, which changes only the name row, inside the function; the caller's list is untouched. It still holds the 1 that mark put there, because mark changed the list itself.
verify: cd kit; .venv/Scripts/python sharing.py
```

Save it and run `.venv/bin/python sharing.py`:

```
after mark: [1, 0, 0]
after replace: [1, 0, 0]
saved: [{'width': 12}, {'width': 12}]
```

1. **Calling a function** binds each parameter to the object the caller passed. It's not a copy, so a function that changes its argument changes the caller's object. (Some languages copy arguments; Python and JavaScript don't. The name for their way is *call by sharing*.)
2. **Assigning to a parameter** only re-points the function's own name. That's why `replace` had no effect outside. A function can change the caller's object, but never the caller's names.
3. **Putting an object in a list or dictionary** stores a reference. `saved` holds the one `settings` dictionary twice; change it and both "saved copies" change. A program that keeps a history of states this way keeps the same state many times.

This is why 01-01-04's `feed` built and returned a new state dictionary instead of changing the one it was given: a caller that kept the old state (to compare, or to retry with another piece) still has it, unchanged. Module 1.4's next lessons are about exactly that choice.

```check
run "cd kit; .venv/Scripts/python sharing.py" stdout="after mark: [1, 0, 0]" -- A parameter names the caller's object, so mark changes squares.
run "cd kit; .venv/Scripts/python sharing.py" stdout="after replace: [1, 0, 0]" -- Assigning to a parameter only rebinds the function's name.
run "cd kit; .venv/Scripts/python sharing.py" stdout="saved: [{'width': 12}, {'width': 12}]" -- A list holds references: both entries are the one dictionary.
```

**What else, and why not.** You can always avoid an alias by making a copy, and sometimes you should:

| Way | Cost |
|---|---|
| Copy on purpose: `list(a)`, `a.copy()`, `a[:]` in Python; `[...a]` or `a.slice()` in JavaScript | Costs time and memory for each copy, and copies only the outer list: the items are still shared. 01-04-03 is about that "shallow" copy |
| Don't change shared objects: build new ones instead, as `moved` and `feed` do | Each change makes a new object; the old one stays valid for anyone holding it. 01-04-02 |
| Objects that can't be changed (Python tuples and strings, JavaScript primitives, `Object.freeze`) | Sharing becomes harmless; you can't update them in place at all |
| Draw it: a visualizer such as Python Tutor (pythontutor.com) draws names and objects as the code runs | Good for small programs; for real ones you trace by hand or ask with `is` and `id`, as here |

## Your turn: grids that don't share

Write a new file, `grids.py`, with two functions:

- `make_grid(rows, cols, fill)` returns a list of `rows` lists, each holding `cols` copies of `fill`, with every row its own list: changing one square changes exactly one square. (Assume `fill` is a number or a string.)
- `distinct(items)` returns how many *different objects* `items` holds, by identity. Two equal but separate lists count as two; the same list twice counts as one. It must not use `id`.

There's no file to check this one against; the checks call your functions. Test them yourself first: `distinct([[0] * 3] * 3)` should be 1, and `distinct(make_grid(3, 3, 0))` 3.

```hints
nudge: make_grid is the board fix with the sizes as parameters. For distinct, imagine going through the items keeping a list of the ones you've seen. What question do you ask about each new item, and which operator asks it?
concept: A comprehension evaluates its expression once per item, so [fill] * cols inside one makes a new row each time. For distinct, the question is "is this item the very same object as one I've already seen?", which is is. The tempting "if item not in seen" asks the wrong question: in compares by equality, so it would count [0] and a separate [0] as one.
shape: make_grid: return [[fill] * cols for row in range(rows)]. distinct: seen = []; for each item, if not any(item is other for other in seen), append it to seen; return len(seen).
answer: grids.py:
~~~python
# A grid of `rows` lists of `cols` squares, every row its own list.
def make_grid(rows, cols, fill):
    return [[fill] * cols for row in range(rows)]


# How many different objects `items` holds: by identity, not by equality.
def distinct(items):
    seen = []
    for item in items:
        if not any(item is other for other in seen):
            seen.append(item)
    return len(seen)
~~~
The tempting slips: [[fill] * cols] * rows in make_grid, which gives one row many times (distinct of it is 1), and "if item not in seen" in distinct, which counts equal lists as one: distinct([[0], [0]]) gives 1 instead of 2. With id allowed, len(set(id(item) for item in items)) does the same job in one line; it's only reliable while the items are all alive, which they are while items holds them.
```

```check
run "cd kit; .venv/Scripts/python -c \"from grids import make_grid; g = make_grid(3, 4, 0); g[1][2] = 5; print(g)\"" stdout="[[0, 0, 0, 0], [0, 0, 5, 0], [0, 0, 0, 0]]" -- make_grid should give each row its own list, so one assignment changes one square.
run "cd kit; .venv/Scripts/python -c \"from grids import make_grid, distinct; print(distinct(make_grid(5, 2, 'x')), len(make_grid(5, 2, 'x')[0]))\"" stdout="5 2" -- make_grid(rows, cols, fill) should make rows separate lists of cols squares.
run "cd kit; .venv/Scripts/python -c \"from grids import distinct; a = [1]; print(distinct([[0] * 3] * 3), distinct([[0], [0]]), distinct([a, a, [1]]), distinct([]))\"" stdout="1 2 2 0" -- distinct counts objects by identity: equal but separate lists count separately.
run "cd kit; .venv/Scripts/python -c \"import inspect, grids; print('id(' in inspect.getsource(grids.distinct))\"" stdout="False" -- Write distinct with is, without id.
```

**What these checks establish, and what they don't.** They change one square of a grid and print it, count a grid's rows by identity, and call `distinct` on four lists, including two equal-but-separate lists, which is what catches `in`. They don't try `make_grid` with a `fill` that can be changed: `make_grid(2, 2, [])` gives every square the same empty list, so appending to one square appends to all four. Try it, and explain it with this lesson's model; whether `make_grid` should guard against it is a design decision, and 01-04-03's deep copy is one answer. Nothing here checks the JavaScript steps beyond three expressions; if you typed something different in the console, the checks wouldn't know.

## What you can do now

- A **name** refers to an **object**; it isn't a box holding one. **Assignment** makes a name refer to an object and never copies it.
- Two names for one object are **aliases**: a change made through either is seen through both. Aliases also come from `* n` and `fill`, from passing arguments, and from storing an object in a container.
- **Identity** is which object; **equality** is what's in it. Python asks `is` and `==`; JavaScript's `===` asks identity for arrays and objects, value for primitives. `in` uses equality. Use `is` only for identity questions such as `is None`.
- Changing an object (`b.append(3)`, `row[0] = 1`) is seen by every name for it. Rebinding a name (`b = [7]`, a parameter assignment, `const` forbids it) affects only that name.
- Sharing is harmless for objects nothing can change, such as numbers: that's why `fill(0)` was safe and `fill([])` wasn't.

```predict
question: Trace this, then say what it prints. x = [0]; y = [x, x]; x.append(1); x = [5]; print(y, x)
explain: After the second line, y holds two references to the list that x names. x.append(1) changes that list, so both entries of y show [0, 1]. Then x = [5] makes the name x refer to a new list; y still refers to the old one. So it prints [[0, 1], [0, 1]] [5]. Changing the object was seen everywhere; rebinding the name was seen only through x.
```

**Next:** 01-04-02 asks which objects can change at all. Lists and dictionaries can be changed in place; numbers, strings and tuples can't, and code that looks like it changes them is making new ones. Blockfall gets a move function that changes the piece it's given, and then one that doesn't.
