# Project: text editor with undo

A text editor looks simple, and it combines several ideas from this series. It needs a data structure that makes typing in the middle of a long document fast. It needs **commands** so that every edit can be undone and redone. It needs **mementos** to know whether the document has changed since it was last saved. And it needs some judgement about what "one step" of undo should mean to a person: undoing letter by letter is maddening, so typing is usually grouped into words.

This project builds a small but real editor core: a gap buffer for the text, edit commands with undo and redo, a save-point memento, and grouping of keystrokes into sensible undo steps.

This lesson covers:

- why a plain list or string makes typing in the middle slow, and the **gap buffer** that fixes it;
- edits as command objects, with an undo and redo history;
- a memento for save points: "has the document changed since I saved?";
- merging consecutive keystrokes into one undo step.

## The data structure: a gap buffer

Typing inserts characters at the cursor. If the text is a Python string, every keystroke builds a whole new string: O(n) per character. A list is better, but inserting in the middle still shifts every character after the cursor: also O(n). For a 100,000-character file, each keystroke moves up to 100,000 items.

Editors exploit the fact that typing happens in one place at a time. A **gap buffer** keeps the text in one list with a block of empty slots, the **gap**, at the cursor. Typing fills the gap from its left end: O(1). Deleting backwards just widens the gap: O(1). Moving the cursor moves the gap, copying the characters between the old and new positions: the cost is the distance moved, which is small for ordinary editing. When the gap fills up, the buffer grows it, as the dynamic arrays lesson grew its array. Emacs has used this structure for decades. Predict before running: how many characters move when typing 2,000 characters at the start of a 100,000-character document, list against gap buffer?

```python type
class GapBuffer:
    def __init__(self, text="", gap=16):
        self._buf = list(text) + [None] * gap
        self._start, self._end = len(text), len(text) + gap
        self.moved = 0

    def __len__(self):
        return len(self._buf) - (self._end - self._start)

    @property
    def cursor(self):
        return self._start

    def text(self):
        return "".join(self._buf[:self._start] + self._buf[self._end:])

    def move_to(self, position):
        if not 0 <= position <= len(self):
            raise IndexError(f"position {position} outside 0..{len(self)}")
        while self._start > position:
            self._start -= 1; self._end -= 1
            self._buf[self._end] = self._buf[self._start]
            self.moved += 1
        while self._start < position:
            self._buf[self._start] = self._buf[self._end]
            self._start += 1; self._end += 1
            self.moved += 1

    def insert(self, chars):
        for ch in chars:
            if self._start == self._end:
                self._grow()
            self._buf[self._start] = ch
            self._start += 1

    def delete_back(self, n=1):
        n = min(n, self._start)
        removed = "".join(self._buf[self._start - n:self._start])
        self._start -= n
        return removed

    def _grow(self):
        extra = max(16, len(self._buf))
        self._buf[self._end:self._end] = [None] * extra
        self._end += extra
        self.moved += len(self._buf) - self._end

doc = "x" * 100_000
gb = GapBuffer(doc)
gb.move_to(0)
before = gb.moved
for ch in "The quick brown fox " * 100:
    gb.insert(ch)
print("gap buffer: characters moved while typing:", gb.moved - before)

shifts = 0
lst = list(doc)
for i, ch in enumerate("The quick brown fox " * 100):
    lst.insert(i, ch)
    shifts += len(lst) - i - 1
print(f"plain list: characters shifted while typing: {shifts:,}")
print("same text:", gb.text() == "".join(lst))
```

```output
gap buffer: characters moved while typing: 100000
plain list: characters shifted while typing: 200,000,000
same text: True
```

The gap buffer counts the characters it copies in `moved`. Moving the cursor to the start of the document moved all 100,000 characters once, which is why `before` is recorded after that move.

Typing 2,000 characters at the start of the document moved 100,000 characters exactly once: when the small starting gap filled, the buffer grew it, shifting the text after it a single time, and the new gap was big enough for everything typed after. The list shifted the whole remaining document for every keystroke: 200 million character moves. The gap pays once to move to where you are typing (and occasionally to grow), and then typing there is cheap.

## Edits as commands

Every change to the document goes through a command object with `execute` and `undo`, as in the command lesson. Each command records what it needs to reverse itself: an insertion remembers where it went and what it inserted; a backspace remembers what it removed. The editor holds a gap buffer and a history with undo and redo stacks. Predict before running: after typing, deleting and two undos, what is the text?

```python type
class Insert:
    def __init__(self, text):
        self.text = text
    def execute(self, buffer):
        self.at = buffer.cursor
        buffer.insert(self.text)
    def undo(self, buffer):
        buffer.move_to(self.at + len(self.text))
        buffer.delete_back(len(self.text))

class Backspace:
    def __init__(self, n=1):
        self.n = n
    def execute(self, buffer):
        self.at = buffer.cursor
        self.removed = buffer.delete_back(self.n)
    def undo(self, buffer):
        buffer.move_to(self.at - len(self.removed))
        buffer.insert(self.removed)

class Editor:
    def __init__(self, text=""):
        self.buffer = GapBuffer(text)
        self._done, self._undone = [], []
    def apply(self, command):
        command.execute(self.buffer)
        self._done.append(command)
        self._undone.clear()
    def type(self, text):
        self.apply(Insert(text))
    def backspace(self, n=1):
        self.apply(Backspace(n))
    def move_to(self, position):
        self.buffer.move_to(position)
    def undo(self):
        command = self._done.pop()
        command.undo(self.buffer)
        self._undone.append(command)
    def redo(self):
        command = self._undone.pop()
        if hasattr(command, "at"):
            self.buffer.move_to(command.at)
        command.execute(self.buffer)
        self._done.append(command)
    def text(self):
        return self.buffer.text()

ed = Editor()
ed.type("Spindle speed 12000 rpm")
ed.move_to(14)
ed.backspace(6)
ed.type("speed: ")
print(repr(ed.text()))
ed.undo(); ed.undo()
print(repr(ed.text()))
ed.redo()
print(repr(ed.text()))
```

```output
'Spindle speed: 12000 rpm'
'Spindle speed 12000 rpm'
'Spindle 12000 rpm'
```

Moving the cursor is not a command here: it changes no text, so undo skips over it. Each command remembers the cursor position it acted at, so undo works wherever the cursor has moved since.

Undoing twice reverses the insertion and then the backspace, restoring `'Spindle speed 12000 rpm'`. Redo re-applies the backspace. Because each command captured exactly where it acted and what it changed, undo works however the cursor moved in between, and redo first moves back to where the command originally acted.

## Save points with a memento

An editor must know whether the document has unsaved changes, to put a dot on the tab or ask before closing. Comparing the whole text with the saved copy works but costs O(n) each time. A cheaper and more robust way is a **memento of the history position**: on save, record which command was the latest done (its identity), and the document is "clean" exactly when the latest done command is that one again, whether you got there by undoing or redoing. Predict before running: is the document clean after an undo followed by a redo?

```python type
class SavingEditor(Editor):
    def __init__(self, text=""):
        super().__init__(text)
        self._saved_at = None
    def _position(self):
        return self._done[-1] if self._done else None
    def save(self):
        self._saved_at = self._position()
        return self.text()
    @property
    def modified(self):
        return self._position() is not self._saved_at

ed = SavingEditor("G0 X0 Y0")
print("new:", ed.modified)
ed.type(" Z5")
print("after typing:", ed.modified)
ed.save()
print("after save:", ed.modified)
ed.undo()
print("after undo:", ed.modified)
ed.redo()
print("after redo:", ed.modified)
```

```output
new: False
after typing: True
after save: False
after undo: True
after redo: False
```

The memento is just a reference to a command object: a tiny token standing for "the state the document was in when saved", with no copy of the text at all.

Undoing past the save point marks the document modified, and redoing back to it marks it clean again, with no text comparison. Typing something new after an undo clears the redo stack, so the saved position can then never be reached again, which correctly leaves the document modified until the next save.

## One undo step per word

Undoing one character at a time is tedious. Editors **merge** consecutive typing into one undo step, usually until a space or newline, or until the cursor moves elsewhere. The history can do this: when a new `Insert` directly continues the previous one (it starts where the last one ended, and the last one did not end a word), extend the previous command instead of recording a new one. Predict before running: how many undo steps does typing "feed rate 250" one character at a time produce?

```python type
class Insert(Insert):
    def can_merge(self, other):
        return isinstance(other, Insert) and other.at == self.at + len(self.text) and not self.text.endswith((" ", "\n"))
    def merge(self, other):
        self.text += other.text

class MergingEditor(SavingEditor):
    def apply(self, command):
        command.execute(self.buffer)
        last = self._done[-1] if self._done else None
        if last is not None and hasattr(last, "can_merge") and last.can_merge(command) and last is not self._saved_at:
            last.merge(command)
        else:
            self._done.append(command)
        self._undone.clear()

ed = MergingEditor()
for ch in "feed rate 250":
    ed.type(ch)
print("undo steps:", len(ed._done), [c.text for c in ed._done])
ed.undo()
print(repr(ed.text()))
ed.undo()
print(repr(ed.text()))
```

```output
undo steps: 3 ['feed ', 'rate ', '250']
'feed rate '
'feed '
```

The redefined `Insert` adds the merging methods to the earlier class; `Editor.type` looks `Insert` up when it runs, so it picks up the new version. Merging never extends a command that is the current save point, so save points stay exact.

Thirteen keystrokes become three undo steps: `feed `, `rate ` and `250`, each word together with its trailing space. Each undo removes a word, which is what people expect. The rule for merging is the policy, and it is easy to change in one place: by time between keystrokes, for example, as many editors do.

::: challenge Moving the cursor by words [easy]
Add two methods to the lesson's `GapBuffer`, without changing its existing methods: `char_at(i)`, returning the character at text position `i` regardless of where the gap is (raise `IndexError` outside `0 .. len - 1`), and `word_left()`, which moves the cursor to the start of the previous word: skip any spaces immediately before the cursor, then skip non-space characters, and stop there (at 0 if it reaches the start). It returns the new cursor position. Write them as functions and attach them to the class, as the lesson did with `_check`.

```python starter
def char_at(self, i):
    return ""

def word_left(self):
    return self.cursor

GapBuffer.char_at = char_at
GapBuffer.word_left = word_left

b = GapBuffer("set feed 250")
print(b.word_left())
```

```python solution
def char_at(self, i):
    if not 0 <= i < len(self):
        raise IndexError(i)
    return self._buf[i] if i < self._start else self._buf[i + (self._end - self._start)]

def word_left(self):
    position = self.cursor
    while position > 0 and self.char_at(position - 1) == " ":
        position -= 1
    while position > 0 and self.char_at(position - 1) != " ":
        position -= 1
    self.move_to(position)
    return position

GapBuffer.char_at = char_at
GapBuffer.word_left = word_left

b = GapBuffer("set feed 250")
print(b.word_left(), b.word_left(), b.word_left(), b.word_left())
```

```python test
for _n in ["char_at", "word_left"]:
    assert hasattr(GapBuffer, _n), f"Attach {_n} to GapBuffer."
_b = GapBuffer("set feed 250")
assert [_b.char_at(_i) for _i in range(len(_b))] == list("set feed 250"), "char_at reads every position."
_b.move_to(5)
assert _b.char_at(4) == "f" and _b.char_at(5) == "e" and _b.char_at(11) == "0", "char_at must work wherever the gap is."
for _bad in [-1, 12]:
    try:
        _b.char_at(_bad)
        assert False, f"char_at({_bad}) should raise IndexError."
    except IndexError:
        pass
_b.move_to(12)
assert [_b.word_left() for _ in range(4)] == [9, 4, 0, 0], "From the end: start of 250, start of feed, start of set, then stay at 0."
_c = GapBuffer("a   bc")
_c.move_to(6)
assert _c.word_left() == 4 and _c.word_left() == 0, "Several spaces are skipped."
_d = GapBuffer("tool T4")
_d.move_to(7)
_d.word_left()
_d.insert("x")
assert _d.text() == "tool xT4", "word_left moves the real cursor, so typing goes there."
"SUCCESS: The buffer hides its gap: positions mean the same wherever the gap sits, and word movement works on top of them."
```

Hint: Characters before the gap are at their own index; characters after it are shifted by the gap's width, `self._end - self._start`. `word_left` steps a position back over spaces, then over non-spaces, using `char_at`, and finally calls `move_to`.
:::

::: challenge An undoable replace [medium]
Write a command class `ReplaceFirst(old, new)` for the lesson's `Editor`. Its `execute(buffer)` finds the first occurrence of `old` in the text at or after the cursor and replaces it with `new`, leaving the cursor just after the replacement. If there is no occurrence, it changes nothing and records that. Its `undo(buffer)` restores the original text exactly and puts the cursor back where it was before `execute`. Use only the buffer's public methods: `text()`, `cursor`, `move_to`, `insert` and `delete_back`. (A new `Editor`'s cursor starts at the end of its text, so move it to 0 before searching from the start.)

```python starter
class ReplaceFirst:
    def __init__(self, old, new):
        self.old, self.new = old, new
    def execute(self, buffer):
        pass
    def undo(self, buffer):
        pass

ed = Editor("F800 G1 F800")
ed.move_to(0)
ed.apply(ReplaceFirst("F800", "F600"))
print(ed.text())
```

```python solution
class ReplaceFirst:
    def __init__(self, old, new):
        self.old, self.new = old, new

    def execute(self, buffer):
        self.cursor_before = buffer.cursor
        self.found = buffer.text().find(self.old, buffer.cursor)
        if self.found < 0:
            return
        buffer.move_to(self.found + len(self.old))
        buffer.delete_back(len(self.old))
        buffer.insert(self.new)

    def undo(self, buffer):
        if self.found >= 0:
            buffer.move_to(self.found + len(self.new))
            buffer.delete_back(len(self.new))
            buffer.insert(self.old)
        buffer.move_to(self.cursor_before)

ed = Editor("F800 G1 F800")
ed.move_to(0)
ed.apply(ReplaceFirst("F800", "F600"))
print(ed.text(), ed.buffer.cursor)
```

```python test
assert "ReplaceFirst" in dir(), "Keep the class name ReplaceFirst."
_ed = Editor("F800 G1 F800")
_ed.move_to(0)
_ed.apply(ReplaceFirst("F800", "F600"))
assert _ed.text() == "F600 G1 F800" and _ed.buffer.cursor == 4, "The first occurrence after the cursor is replaced, cursor just after it."
_ed.apply(ReplaceFirst("F800", "F1200"))
assert _ed.text() == "F600 G1 F1200" and _ed.buffer.cursor == 13, "The next search starts at the cursor."
_ed.undo()
assert _ed.text() == "F600 G1 F800" and _ed.buffer.cursor == 4, "Undo restores the text and the cursor."
_ed.undo()
assert _ed.text() == "F800 G1 F800" and _ed.buffer.cursor == 0, "Both replacements undone."
_ed.redo(); _ed.redo()
assert _ed.text() == "F600 G1 F1200", "Redo re-applies them."
_e2 = Editor("abc")
_e2.move_to(1)
_e2.apply(ReplaceFirst("a", "z"))
assert _e2.text() == "abc" and _e2.buffer.cursor == 1, "Only text at or after the cursor is searched; no match changes nothing."
_e2.undo()
assert _e2.text() == "abc" and _e2.buffer.cursor == 1, "Undoing a no-op restores the cursor."
_e3 = Editor("aaa")
_e3.move_to(0)
_e3.apply(ReplaceFirst("a", ""))
assert _e3.text() == "aa" and _e3.buffer.cursor == 0, "Replacing with nothing deletes."
_e3.undo()
assert _e3.text() == "aaa", "and undo puts it back."
"SUCCESS: The replace command records where it acted and what it changed, so undo and redo work through the same history as typing."
```

Hint: In `execute`, remember the cursor, then `found = buffer.text().find(old, buffer.cursor)`. If found, move to the end of the match, `delete_back(len(old))` and `insert(new)`. `undo` does the reverse at the same place (`found + len(new)`), then moves the cursor back to where it was.
:::

::: challenge Grouped undo with a time rule [hard]
Write `TimedEditor(clock)`, an editor whose typing is grouped into undo steps by both words and **time**. It holds a `GapBuffer` and an injected `clock` (a function returning seconds). Its methods are `type(text)`, `backspace(n=1)`, `move_to(position)`, `undo()`, `redo()` and `text()`. A typed text is merged into the previous undo step only if **all** of these hold:

- the previous step is also typing;
- the new text starts exactly where the previous one ended (no cursor move in between);
- the previous typing does not end with a space or newline;
- it is less than 1.0 second since the previous keystroke.

Every backspace is its own undo step and is never merged. `undo` and `redo` raise `IndexError` when there is nothing to do. New edits clear the redo history.

```python starter
class TimedEditor:
    def __init__(self, clock):
        self.clock = clock
        self.buffer = GapBuffer()
    def type(self, text):
        self.buffer.insert(text)
    def text(self):
        return self.buffer.text()

print("write the undo grouping")
```

```python solution
class TimedEditor:
    def __init__(self, clock):
        self.clock = clock
        self.buffer = GapBuffer()
        self._done, self._undone = [], []
        self._last_key_time = None

    def type(self, text):
        now = self.clock()
        at = self.buffer.cursor
        self.buffer.insert(text)
        last = self._done[-1] if self._done else None
        if (last is not None and last["kind"] == "insert" and last["at"] + len(last["text"]) == at
                and not last["text"].endswith((" ", "\n"))
                and self._last_key_time is not None and now - self._last_key_time < 1.0):
            last["text"] += text
        else:
            self._done.append({"kind": "insert", "at": at, "text": text})
        self._last_key_time = now
        self._undone.clear()

    def backspace(self, n=1):
        at = self.buffer.cursor
        removed = self.buffer.delete_back(n)
        self._done.append({"kind": "delete", "at": at, "text": removed})
        self._last_key_time = None
        self._undone.clear()

    def move_to(self, position):
        self.buffer.move_to(position)

    def _reverse(self, step):
        if step["kind"] == "insert":
            self.buffer.move_to(step["at"] + len(step["text"]))
            self.buffer.delete_back(len(step["text"]))
        else:
            self.buffer.move_to(step["at"] - len(step["text"]))
            self.buffer.insert(step["text"])

    def _apply(self, step):
        if step["kind"] == "insert":
            self.buffer.move_to(step["at"])
            self.buffer.insert(step["text"])
        else:
            self.buffer.move_to(step["at"])
            self.buffer.delete_back(len(step["text"]))

    def undo(self):
        if not self._done:
            raise IndexError("nothing to undo")
        step = self._done.pop()
        self._reverse(step)
        self._undone.append(step)
        self._last_key_time = None

    def redo(self):
        if not self._undone:
            raise IndexError("nothing to redo")
        step = self._undone.pop()
        self._apply(step)
        self._done.append(step)
        self._last_key_time = None

    def text(self):
        return self.buffer.text()

t = [0.0]
ed = TimedEditor(lambda: t[0])
for ch in "G1 X10":
    ed.type(ch); t[0] += 0.2
ed.undo()
print(repr(ed.text()))
```

```python test
assert "TimedEditor" in dir(), "Keep the class name TimedEditor."
_t = [0.0]
def _typing(_ed, _s, _gap=0.2):
    for _ch in _s:
        _ed.type(_ch); _t[0] += _gap
_ed = TimedEditor(lambda: _t[0])
_typing(_ed, "G1 X10")
_ed.undo()
assert _ed.text() == "G1 ", f"Fast typing groups by word: undo removes 'X10'; got {_ed.text()!r}."
_ed.undo()
assert _ed.text() == "", "The next undo removes 'G1 '."
_ed.redo(); _ed.redo()
assert _ed.text() == "G1 X10", "Redo restores both words."
_t[0] = 100.0
_e2 = TimedEditor(lambda: _t[0])
_typing(_e2, "abc", _gap=0.2)
_t[0] += 2.0
_typing(_e2, "def", _gap=0.2)
_e2.undo()
assert _e2.text() == "abc", f"A pause of a second or more starts a new step, even mid-word; got {_e2.text()!r}."
_e3 = TimedEditor(lambda: _t[0])
_typing(_e3, "spindle")
_e3.move_to(3)
_typing(_e3, "X")
_e3.undo()
assert _e3.text() == "spindle", "Typing after a cursor move is a separate step."
_e4 = TimedEditor(lambda: _t[0])
_typing(_e4, "feed")
_e4.backspace(2)
_typing(_e4, "ed")
assert _e4.text() == "feed"
_e4.undo()
assert _e4.text() == "fe", "Typing after a backspace starts a new step."
_e4.undo()
assert _e4.text() == "feed", "The backspace is undone on its own."
_e4.undo()
assert _e4.text() == "", "Then the original word."
for _call in (_e4.undo,):
    try:
        _call(); assert False, "Nothing left to undo: IndexError."
    except IndexError:
        pass
_e4.redo()
_typing(_e4, "!")
try:
    _e4.redo(); assert False, "A new edit clears the redo history."
except IndexError:
    pass
_e5 = TimedEditor(lambda: _t[0])
_typing(_e5, "a\nb")
_e5.undo()
assert _e5.text() == "a\n", "A newline ends a step, like a space."
"SUCCESS: Undo steps follow how people type: words, pauses and cursor moves start new steps, so each undo takes back one meaningful chunk."
```

Hint: Store each undo step as a small dict with its kind, position and text. In `type`, check the four merge conditions against the last step and the time of the last keystroke (injected clock); either extend the last step's text or push a new step. Reset the last keystroke time after a backspace, undo or redo, so typing never merges across them. Undo reverses a step at its recorded position; redo re-applies it.
:::

## What you learned

- A gap buffer keeps a block of empty slots at the cursor, so typing and deleting there are O(1); moving the cursor costs the distance moved. Editors use it because editing is local.
- Every edit is a command that records what it needs to reverse itself, such as position and removed text, so undo and redo work wherever the cursor has moved since.
- A save point is a memento of the history position, not a copy of the text: the document is unmodified exactly when the history is back at that position.
- Grouping keystrokes into undo steps (by word, by pause, by cursor move) is a policy in one place, built on command merging.
- The project combines a data structure (gap buffer), two patterns (command and memento), dependency injection (the clock) and invariants that tests can check.

The next project builds an expression evaluator: a parser, a composite tree and visitors that evaluate and transform it.
