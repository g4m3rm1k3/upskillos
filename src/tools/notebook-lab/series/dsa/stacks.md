# Stacks

A **stack** is a collection where the last item added is the first one removed: **last in, first out**, or LIFO. Think of a stack of plates: you put plates on the top and take them from the top. A stack allows only three things: **push** an item on top, **pop** the top item off, and **peek** at the top without removing it.

That sounds like a restriction, and it is one, deliberately. Many problems have exactly this shape: whatever was opened most recently must be closed first. Brackets in an expression, function calls in a running program, actions to undo in an editor, the path back through a maze. When a problem has that shape, a stack makes the solution short and obviously correct. This lesson covers:

- a stack class on top of Python's list, with O(1) operations;
- undo and redo with two stacks;
- the **call stack**, which runs every Python program, and how to replace recursion with an explicit stack;
- evaluating expressions written in postfix notation.

## A stack on a list

The end of a Python list is a perfect stack top: `append` pushes and `pop()` pops, both O(1) (amortised, from the earlier lessons). The front would be a poor choice: `insert(0, …)` and `pop(0)` are O(n). A small class gives the operations their stack names and hides the list, so code using it can only do stack things. Predict before running: what will the three pops print?

```python type
class Stack:
    def __init__(self):
        self._items = []

    def push(self, item):
        self._items.append(item)

    def pop(self):
        if not self._items:
            raise IndexError("pop from an empty stack")
        return self._items.pop()

    def peek(self):
        if not self._items:
            raise IndexError("peek at an empty stack")
        return self._items[-1]

    def __len__(self):
        return len(self._items)

    def __bool__(self):
        return bool(self._items)

s = Stack()
for plate in ["red", "green", "blue"]:
    s.push(plate)
print("top:", s.peek(), "size:", len(s))
print(s.pop(), s.pop(), s.pop())
print("empty now?", not s)
try:
    s.pop()
except IndexError as error:
    print("IndexError:", error)
```

```output
top: blue size: 3
blue green red
empty now? True
IndexError: pop from an empty stack
```

`__bool__` decides what `if s:` and `not s` mean for a stack: true when it has items, as for a list.

The pops come out blue, green, red: the reverse of the pushes. That reversal is the essence of a stack, and it is why pushing a sequence and popping it all back reverses it. The empty-stack error says what went wrong in stack terms, rather than the list's "pop from empty list". In everyday Python, many programmers just use a list directly as a stack; the class makes the intent explicit and prevents accidental use of the middle.

## Undo and redo

An editor's undo history is a stack: each action is pushed as it happens, and undo pops the most recent. Redo needs a second stack: undoing an action pushes it onto the redo stack, so redo can pop it back. Any **new** action clears the redo stack, because the redone future no longer follows from the present. Predict before running: what will the text be after the last line?

```python type
class Editor:
    def __init__(self):
        self.text = ""
        self._undo = Stack()
        self._redo = Stack()

    def type(self, words):
        self._undo.push(self.text)
        self._redo = Stack()
        self.text += words

    def undo(self):
        if self._undo:
            self._redo.push(self.text)
            self.text = self._undo.pop()

    def redo(self):
        if self._redo:
            self._undo.push(self.text)
            self.text = self._redo.pop()

editor = Editor()
editor.type("Hello")
editor.type(", world")
editor.type("!!!")
editor.undo()
print(repr(editor.text))
editor.undo()
editor.redo()
print(repr(editor.text))
editor.undo()
editor.type(" there")
editor.redo()
print(repr(editor.text))
```

```output
'Hello, world'
'Hello, world'
'Hello there'
```

Each stack entry here stores the whole previous text, which is simple but wasteful for long documents; the Command and Memento pattern lessons, and the text editor project, store just the change instead.

After the first undo the text is "Hello, world"; undo then redo returns to the same place; and after the final undo and new typing, the text is "Hello there", where redo does nothing, because typing cleared the redo stack. Two stacks give the full undo/redo behaviour of any editor in a dozen lines.

## The call stack, and recursion without it

Every running Python program uses a stack you never see: the **call stack**. When a function calls another, Python pushes a **frame** recording where the caller was and its local variables; when the called function returns, its frame is popped and the caller resumes. A traceback is a printout of the call stack at the moment of an error.

Recursion leans on the call stack, and Python limits its depth (to about 1,000 frames by default) so that runaway recursion stops with an error instead of exhausting memory. Any recursive algorithm can be rewritten with an **explicit stack** of work to do, which has no such limit. Here both versions add up all the numbers in a nested list. Predict before running: which version will handle a list nested 5,000 levels deep?

```python type
import sys

def nested_sum_recursive(item):
    if isinstance(item, list):
        return sum(nested_sum_recursive(x) for x in item)
    return item

def nested_sum_stack(item):
    total = 0
    todo = Stack()
    todo.push(item)
    while todo:
        current = todo.pop()
        if isinstance(current, list):
            for x in current:
                todo.push(x)
        else:
            total += current
    return total

shallow = [1, [2, 3, [4]], [[5]], 6]
print(nested_sum_recursive(shallow), nested_sum_stack(shallow))

deep = 1
for _ in range(5000):
    deep = [deep, 1]
print("explicit stack:", nested_sum_stack(deep))
try:
    print("recursive:", nested_sum_recursive(deep))
except RecursionError:
    print(f"recursive: RecursionError (the call stack limit is {sys.getrecursionlimit()})")
```

```output
21 21
explicit stack: 5001
recursive: RecursionError (the call stack limit is 1000)
```

`isinstance(item, list)` checks whether the item is a list (to look inside) or a number (to add).

Both give 21 on the small example. On the deep one, the explicit stack happily returns 5,001, while the recursive version runs out of call stack. The rewrite is mechanical: where the recursion would call itself on each part, the loop pushes the parts as work still to do. This is exactly how depth-first search is implemented in the graphs part of the series.

## Postfix expressions

In ordinary **infix** notation, an operator sits between its operands, and brackets and precedence rules decide the order: (3 + 4) × 2. In **postfix** notation (also called reverse Polish notation), each operator comes after its operands: `3 4 + 2 *`. Postfix needs no brackets and no precedence rules at all, and a stack evaluates it in one left-to-right pass: push numbers; on an operator, pop two operands, apply it, and push the result. Old calculators and the Java and Python virtual machines work this way. Predict before running: what does `5 1 2 + 4 * + 3 -` evaluate to?

```python type
def eval_postfix(expression, trace=False):
    operations = {"+": lambda a, b: a + b, "-": lambda a, b: a - b,
                  "*": lambda a, b: a * b, "/": lambda a, b: a / b}
    stack = Stack()
    for token in expression.split():
        if token in operations:
            right = stack.pop()
            left = stack.pop()
            stack.push(operations[token](left, right))
        else:
            stack.push(float(token))
        if trace:
            print(f"  after {token!r:>4}: {stack._items}")
    result = stack.pop()
    if stack:
        raise ValueError("too many operands")
    return result

print(eval_postfix("5 1 2 + 4 * + 3 -", trace=True))
```

```output
  after  '5': [5.0]
  after  '1': [5.0, 1.0]
  after  '2': [5.0, 1.0, 2.0]
  after  '+': [5.0, 3.0]
  after  '4': [5.0, 3.0, 4.0]
  after  '*': [5.0, 12.0]
  after  '+': [17.0]
  after  '3': [17.0, 3.0]
  after  '-': [14.0]
14.0
```

The order of the two pops matters: the first pop is the **right** operand. For `-` and `/`, swapping them would give the wrong answer.

The trace shows the stack after each token: 1 and 2 are added to 3, multiplied by 4 to 12, added to 5 to make 17, and 3 is subtracted: 14 (printed as 14.0, because the tokens are read as floats). In infix that is 5 + (1 + 2) × 4 − 3. A malformed expression shows up naturally: too few operands makes a pop fail on an empty stack, and too many leaves extra items at the end. The expression evaluator project later turns ordinary infix into this form.

::: challenge Balanced brackets [easy]
Write `is_balanced(text)` returning `True` if every bracket in `text` (round `()`, square `[]` and curly `{}`) is closed by the matching kind, in the right order, and `False` otherwise. Other characters are ignored. Use a `Stack`: push each opening bracket; on a closing bracket, the top of the stack must be its partner.

```python starter
def is_balanced(text):
    return True

print(is_balanced("f(a[1], {b: 2})"), is_balanced("(]"))
```

```python solution
def is_balanced(text):
    partner = {")": "(", "]": "[", "}": "{"}
    stack = Stack()
    for ch in text:
        if ch in "([{":
            stack.push(ch)
        elif ch in partner:
            if not stack or stack.pop() != partner[ch]:
                return False
    return not stack

print(is_balanced("f(a[1], {b: 2})"), is_balanced("(]"))
```

```python test
assert "is_balanced" in dir(), "Keep the function's name as is_balanced."
for _t, _want in [("f(a[1], {b: 2})", True), ("", True), ("no brackets", True), ("([]{})", True), ("((()))", True),
                  ("(]", False), ("(", False), (")", False), ("([)]", False), ("(()", False), ("())(", False), ("}{", False)]:
    assert is_balanced(_t) == _want, f"is_balanced({_t!r}) should be {_want}."
assert is_balanced("(" * 5000 + ")" * 5000) is True and is_balanced("(" * 5000 + ")" * 4999) is False, "Long inputs should work too."
"SUCCESS: The most recently opened bracket must close first: exactly what a stack tracks. '([)]' fails because ] arrives while ( is on top."
```

Hint: A dictionary from each closing bracket to its opening partner helps. A closing bracket fails if the stack is empty or the popped bracket is not its partner. At the end, the stack must be empty (no unclosed openers).
:::

::: challenge A stack that knows its minimum [medium]
Write a class `MinStack` with `push(x)`, `pop()` (returning the value), `peek()`, `__len__` and `minimum()`, where **every** operation, including `minimum()`, is O(1): no searching. `pop`, `peek` and `minimum` raise `IndexError` on an empty stack.

The trick: alongside each value, store the minimum of the stack **at the moment it was pushed**. Popping then automatically restores the previous minimum.

```python starter
class MinStack:
    def __init__(self):
        pass

    def push(self, x):
        pass

    def pop(self):
        return None

    def peek(self):
        return None

    def minimum(self):
        return None

    def __len__(self):
        return 0

m = MinStack()
for x in [5, 3, 7, 3, 1]:
    m.push(x)
print(m.minimum())
```

```python solution
class MinStack:
    def __init__(self):
        self._items = []

    def push(self, x):
        current = x if not self._items else min(x, self._items[-1][1])
        self._items.append((x, current))

    def pop(self):
        if not self._items:
            raise IndexError("pop from an empty stack")
        return self._items.pop()[0]

    def peek(self):
        if not self._items:
            raise IndexError("peek at an empty stack")
        return self._items[-1][0]

    def minimum(self):
        if not self._items:
            raise IndexError("minimum of an empty stack")
        return self._items[-1][1]

    def __len__(self):
        return len(self._items)

m = MinStack()
for x in [5, 3, 7, 3, 1]:
    m.push(x)
print(m.minimum())
```

```python test
import random as _random, time as _time
assert "MinStack" in dir(), "Keep the class name MinStack."
_m = MinStack()
for _name in ["pop", "peek", "minimum"]:
    try:
        getattr(_m, _name)()
        assert False, f"{_name}() on an empty MinStack should raise IndexError."
    except IndexError:
        pass
for _x in [5, 3, 7, 3, 1]:
    _m.push(_x)
assert _m.minimum() == 1 and _m.peek() == 1 and len(_m) == 5, "After pushing 5, 3, 7, 3, 1 the minimum and top are both 1."
assert _m.pop() == 1 and _m.minimum() == 3, "After popping 1, the minimum goes back to 3."
assert _m.pop() == 3 and _m.minimum() == 3, "The other 3 is still there, so the minimum stays 3 (duplicates matter)."
assert _m.pop() == 7 and _m.pop() == 3 and _m.minimum() == 5, "Popping down to [5] leaves minimum 5."
_r = _random.Random(1); _m2 = MinStack(); _ref = []
for _ in range(3000):
    if _ref and _r.random() < 0.45:
        assert _m2.pop() == _ref.pop(), "pop returned the wrong value."
    else:
        _v = _r.randint(-50, 50); _m2.push(_v); _ref.append(_v)
    if _ref:
        assert _m2.minimum() == min(_ref), "minimum() disagrees with the true minimum after a random sequence of operations."
_big = MinStack()
for _i in range(100_000, 0, -1):
    _big.push(_i)
_start = _time.perf_counter()
for _ in range(20_000):
    _big.minimum()
    if _time.perf_counter() - _start > 0.5:
        break
assert _time.perf_counter() - _start < 0.5, "minimum() should be O(1): don't search the stack."
"SUCCESS: Each entry carries the minimum beneath it, so popping restores the old minimum for free: O(1) everything, for twice the memory."
```

Hint: Store pairs `(value, minimum so far)` in a list. When pushing x, the new minimum is x if the stack is empty, otherwise `min(x, previous minimum)`. `minimum()` reads the pair on top.
:::

::: challenge Matching tags [medium]
HTML-like tags must nest properly: `<b><i>text</i></b>` is fine, `<b><i>text</b></i>` is not. Write `tags_nest_properly(text)` that finds every tag with `re.findall(r"<(/?)(\w+)>", text)` (each match is a pair: `"/"` or `""`, and the tag name) and returns `True` if every closing tag matches the most recent unclosed opening tag of the same name and nothing is left open, `False` otherwise.

```python starter
import re

def tags_nest_properly(text):
    return True

print(tags_nest_properly("<p><b>hi</b> there</p>"), tags_nest_properly("<b><i>x</b></i>"))
```

```python solution
import re

def tags_nest_properly(text):
    open_tags = Stack()
    for slash, name in re.findall(r"<(/?)(\w+)>", text):
        if not slash:
            open_tags.push(name)
        elif not open_tags or open_tags.pop() != name:
            return False
    return not open_tags

print(tags_nest_properly("<p><b>hi</b> there</p>"), tags_nest_properly("<b><i>x</b></i>"))
```

```python test
assert "tags_nest_properly" in dir(), "Keep the function's name as tags_nest_properly."
for _t, _want in [("<p><b>hi</b> there</p>", True), ("", True), ("plain text", True), ("<a></a><b></b>", True),
                  ("<b><i>x</b></i>", False), ("<b>", False), ("</b>", False), ("<b></i>", False),
                  ("<div><div></div></div>", True), ("<div><div></div>", False), ("<p></p></p>", False)]:
    assert tags_nest_properly(_t) == _want, f"tags_nest_properly({_t!r}) should be {_want}."
"SUCCESS: The same stack logic as brackets, with names instead of symbols: the core of how HTML and XML parsers check structure."
```

Hint: For each `(slash, name)`: an opening tag (`slash == ""`) is pushed; a closing tag must find the same name on top of the stack (pop it), otherwise return False. At the end the stack must be empty.
:::

## What you learned

- A stack is last in, first out: push, pop and peek, all O(1) on the end of a Python list. A small class names the operations and stops accidental use of the middle.
- Undo/redo is two stacks; a new action clears the redo stack.
- The call stack runs every function call; any recursion can become a loop over an explicit stack, which escapes Python's recursion limit.
- Postfix expressions evaluate in one pass with a stack, with no brackets or precedence rules; bracket and tag matching are the same "most recently opened closes first" pattern.

The next lesson covers the stack's partner: the queue, first in, first out.
