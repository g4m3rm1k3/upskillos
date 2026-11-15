---
title: The Call Stack: Frames, Recursion and Unwinding
runtime: python
---

Last lesson's `order.py` showed that a call evaluates its arguments, runs, and returns. But while a function runs, the function that called it is still there, paused in the middle of a line, waiting. So is *its* caller. Something has to remember all of them: where each one stopped, and what each one's local names hold. That something is the **call stack**. You've been reading it already: every traceback is a picture of it. This lesson makes it visible, gives Kit a tool that only works because of it, `tree`, which prints a folder and everything inside it by having a function call itself, and then breaks it two ways: by going so deep that the stack runs out, and by raising an error at the bottom and watching it climb back up.

**By the end you can:**

- Explain what a stack frame holds and trace the frames of a recursive function, in the order they're made and removed.
- Read a traceback as the call stack at the moment of an error.
- Write a recursive function with a base case, and predict when recursion runs out of stack and why the limit exists.
- Predict how an exception unwinds through frames, what `finally` does on the way, and choose the frame to catch it in.
- Replace recursion with a loop and an explicit stack, and show the two give the same output.

**You need:** 01-05-01 (calls, local names, lifetime) and 01-01-04 (`while` loops). Commands run inside `kit` (`cd ../kit` if you're in `blockfall`).

## A tree to walk

`tree` needs folders to walk, the same for everyone. This script makes a small one, shaped like a project: `os.makedirs(folder, exist_ok=True)` makes a folder and any folders above it (01-04-05), and `os.path.dirname(name)` is the folder part of a path, `sample_tree/docs` for `sample_tree/docs/guide.txt`. Each file is written empty, since only the names matter.

```python file=kit/make_tree.py
import os

# A small project-like tree of folders and files, the same every time.
FILES = [
    "sample_tree/README.txt",
    "sample_tree/docs/guide.txt",
    "sample_tree/docs/images/logo.txt",
    "sample_tree/src/main.py",
    "sample_tree/src/util/numbers.py",
    "sample_tree/src/util/text.py",
    "sample_tree/tests/test_main.py",
]
for name in FILES:
    os.makedirs(os.path.dirname(name), exist_ok=True)
    with open(name, "w") as file:
        file.write("")
os.makedirs("sample_tree/empty", exist_ok=True)
print("made sample_tree")
```

Save it and run `.venv/bin/python make_tree.py` (Windows: `.venv\Scripts\python make_tree.py`). It prints `made sample_tree`.

```check
run "cd kit; .venv/Scripts/python make_tree.py" stdout="made sample_tree" -- make_tree.py should build sample_tree.
```

## A function that calls itself

How do you print a folder and everything inside it, at any depth? List the folder. For each file, print its name. For each folder inside it, print its name, and then *do the same thing* for that folder, one level further in. "Do the same thing" is a call to the function you're writing. A function that calls itself is **recursive**.

Three pieces of the standard library:

- `os.listdir(path)` lists the names in a folder, in no particular order, so `sorted` makes the output the same on every machine.
- `os.path.join(path, name)` joins them with the right separator for the system (`\` on Windows, `/` elsewhere).
- `os.path.isdir(path)` is `True` for a folder.

```python file=kit/tree.py
import os
import sys


# Print everything inside the folder at path, one name per line, indented
# by depth. A folder's contents are printed by calling tree on that folder.
def tree(path, depth):
    for name in sorted(os.listdir(path)):
        child = os.path.join(path, name)
        if os.path.isdir(child):
            print("    " * depth + name + "/")
            tree(child, depth + 1)
        else:
            print("    " * depth + name)


def main():
    root = "."
    if len(sys.argv) > 1:
        root = sys.argv[1]
    print(root + "/")
    tree(root, 1)


if __name__ == "__main__":
    main()
```

Every recursive function needs a way to stop. `tree` calls itself only for folders it finds inside the current one. A folder with no folders in it, such as `images`, is the **base case**: the loop makes no recursive call, and the function returns. Each call works on a folder one level deeper than its caller's, so the calls always reach a folder with no folders below it.

```predict
question: tree is called once for sample_tree itself. How many times is it called in all, for the whole sample tree? (Count the folders.)
answer: 7
explain: One call per folder, and none for files: sample_tree (1), docs (2), images (3), empty (4), src (5), util (6), tests (7). The easy one to miss is empty: it's a folder, so tree is called for it, lists it, finds nothing, and returns at once without calling itself.
```

Save it and run `.venv/bin/python tree.py sample_tree`:

```
sample_tree/
    README.txt
    docs/
        guide.txt
        images/
            logo.txt
    empty/
    src/
        main.py
        util/
            numbers.py
            text.py
    tests/
        test_main.py
```

(`README.txt` comes first because `sorted` orders capital letters before small ones.)

```check
run "cd kit; .venv/Scripts/python tree.py sample_tree" stdout="            logo.txt" -- tree should indent four spaces per level: logo.txt is three folders down.
run "cd kit; .venv/Scripts/python tree.py sample_tree" stdout="    empty/" -- An empty folder is still listed.
run "cd kit; .venv/Scripts/python tree.py sample_tree" stdout="            text.py" -- Files inside util should be listed in sorted order.
```

## One frame per call

When `tree` calls itself, the call for `src` hasn't finished: it's in the middle of its loop, with its own `path`, `depth`, `name` and `child`, waiting for the call for `util` to return. The call for `util` has a `path` and a `depth` of its own. The two `path`s are different names that happen to be spelled the same, because each is local to its own call (01-05-01).

Each call gets a **frame**: a record holding that call's local names, and the place in its caller to go back to when it returns. Frames are kept in a **stack**. A call pushes a new frame on top; a return removes the top one, and the frame beneath carries on where it paused. The last frame made is always the first one to finish. This small recursive function shows the order:

```python file=kit/frames.py
# A function that calls itself: each call gets its own frame, with its own n.


def countdown(n):
    print("  " * (3 - n) + "enter countdown(" + str(n) + ")")
    if n > 0:
        countdown(n - 1)
    print("  " * (3 - n) + "leave countdown(" + str(n) + ")")


countdown(3)
```

```predict
question: countdown(3) calls countdown(2), which calls countdown(1), and so on. Which "leave" line is printed first?
choice: leave countdown(3)
choice: leave countdown(0)
answer: leave countdown(0)
explain: countdown(3) can't leave until the call it made, countdown(2), has returned, and that one is waiting on countdown(1), and that one on countdown(0). countdown(0) makes no call (n > 0 is false: the base case), so it's the first to reach its last line. Then the frames come off in reverse order: 0, 1, 2, 3. Each frame printed its own n, because each has its own.
```

Save it and run `.venv/bin/python frames.py`:

```
enter countdown(3)
  enter countdown(2)
    enter countdown(1)
      enter countdown(0)
      leave countdown(0)
    leave countdown(1)
  leave countdown(2)
leave countdown(3)
```

The indentation is the stack's height. At the moment `countdown(0)` runs, there are five frames: the module itself, then one for each `countdown`.

**A traceback is the stack.** When an error isn't caught, Python prints the frames that were on the stack when it happened, oldest first. Ask `tree` to list a file instead of a folder, `.venv/bin/python tree.py samples/hello.txt`, and it fails:

```
Traceback (most recent call last):
  File "…/kit/tree.py", line 26, in <module>
    main()
  File "…/kit/tree.py", line 22, in main
    tree(root, 1)
  File "…/kit/tree.py", line 8, in tree
    for name in sorted(os.listdir(path)):
NotADirectoryError: [WinError 267] The directory name is invalid: 'samples/hello.txt'
```

Your paths will differ, the last line is worded differently on macOS and Linux (`[Errno 20] Not a directory`), and Python 3.13 and later also underline the failing part of each line. Read it from the top: the module called `main` at line 26, `main` called `tree` at line 22, and `tree` was at line 8 when `os.listdir` failed. Three frames, oldest first, and the error at the bottom. "Most recent call last" means exactly that.

```check
run "cd kit; .venv/Scripts/python frames.py" stdout="      leave countdown(0)" -- The deepest call is the first to leave.
run "cd kit; .venv/Scripts/python frames.py" stdout="leave countdown(3)" -- The first call is the last to leave.
run "cd kit; .venv/Scripts/python tree.py samples/hello.txt" exit=1 stderr="in tree" -- An uncaught error prints the stack: the traceback should end in tree.
```

## Running out of stack

How deep can the stack go? A folder nested a thousand levels deep would tell you, but it's hard to make: on one Windows 11 machine, creating one-letter folders inside one another stopped at 95 levels with `[WinError 206] The filename or extension is too long`, at a path of about 250 characters. Windows limits a path to 260 characters unless long paths are turned on. So on Windows, `tree`'s folders run out before its stack does.

Nested data has no such limit. A list inside a list inside a list is shaped like nested folders, and a loop can build it as deep as you like. This program builds a list nested `n` deep and measures its depth recursively:

- `isinstance(value, list)` is `True` when `value` is a list. It's the base case: anything that isn't a list has depth 0.
- `nested(n)` builds `[[[…[0]…]]]` with a loop, one level per turn, so building it uses no recursion at all.
- `sys.getrecursionlimit()` is Python's limit on how many frames deep the stack may grow.

```python file=kit/nest.py
import sys


# How deeply a value is nested: 0 for anything that isn't a list, and one
# more than its deepest item for a list.
def depth(value):
    if not isinstance(value, list):
        return 0
    deepest = 0
    for item in value:
        deepest = max(deepest, depth(item))
    return deepest + 1


# A list nested n deep, [[[...[0]...]]], built with a loop, not recursion.
def nested(n):
    value = 0
    for _ in range(n):
        value = [value]
    return value


n = int(sys.argv[1])
print("depth", depth(nested(n)), "of", n, "with limit", sys.getrecursionlimit())
```

Save it and run `.venv/bin/python nest.py 500`: `depth 500 of 500 with limit 1000`. Now try a list 5000 deep, `.venv/bin/python nest.py 5000`:

```
Traceback (most recent call last):
  File "…/kit/nest.py", line 24, in <module>
    print("depth", depth(nested(n)), "of", n, "with limit", sys.getrecursionlimit())
  File "…/kit/nest.py", line 11, in depth
    deepest = max(deepest, depth(item))
  File "…/kit/nest.py", line 11, in depth
    deepest = max(deepest, depth(item))
  [Previous line repeated 996 more times]
RecursionError: maximum recursion depth exceeded
```

The traceback is a thousand frames of the same line, so Python prints it a few times and then counts the rest. This is a **stack overflow**: more calls deep than the stack allows. Python's limit is 1000 frames by default. On the machine this lesson was tested on, `nest.py 998` worked and `nest.py 999` failed: 999 nested lists need 1000 calls of `depth` (one per list, and one for the `0` inside), plus the module's own frame.

Why a limit at all? Each frame takes memory, and the stack has a fixed amount. Recursion that never reaches its base case would otherwise grow until it crashed the whole Python process. The limit turns that crash into an ordinary error that a program can catch. `sys.setrecursionlimit(n)` raises it, but only so far: past what the underlying stack can hold, Python itself can crash. If data can be deeper than about a thousand levels, recursion is the wrong tool, as the last step of this lesson shows.

```check
run "cd kit; .venv/Scripts/python nest.py 500" stdout="depth 500 of 500 with limit 1000" -- 500 levels fit within Python's limit of 1000 frames.
run "cd kit; .venv/Scripts/python nest.py 5000" exit=1 stderr="RecursionError" -- 5000 levels need more frames than the limit allows.
run "cd kit; .venv/Scripts/python nest.py 5000" exit=1 stderr="Previous line repeated" -- Python shortens a traceback that repeats one frame.
```

## An error unwinds the stack

What happens to the frames when an error is raised in the deepest one? Change `countdown` so that the call at the bottom raises an error, and catch it at the top:

- `raise ValueError("reached the bottom")` raises an error on purpose. You've seen errors raised by Python; `raise` is how your own code raises one.
- `try: … finally: …` runs the `finally` block when the `try` block is left, whichever way it's left: by finishing, by `return`, or by an error passing through.
- `back in countdown(n)` is printed after the recursive call returns normally.

```python file=kit/frames.py
# A function that calls itself, and an error raised in the deepest call.


def countdown(n):
    print("  " * (3 - n) + "enter countdown(" + str(n) + ")")
    try:
        if n == 0:
            raise ValueError("reached the bottom")
        countdown(n - 1)
        print("  " * (3 - n) + "back in countdown(" + str(n) + ")")
    finally:
        print("  " * (3 - n) + "leave countdown(" + str(n) + ")")


try:
    countdown(3)
except ValueError as error:
    print("caught:", error)
```

```predict
question: Will any "back in countdown" line be printed?
choice: Yes, all three
choice: Only back in countdown(1)
choice: None of them
answer: None of them
explain: The error is raised in countdown(0) and nothing in countdown catches it, so no call returns normally. Python removes countdown(0)'s frame, then finds countdown(1) in the middle of its recursive call: the error carries on out of that call instead of returning, so the line after it never runs. The same happens to 2 and 3, until the error reaches the try/except around countdown(3) at the top, which catches it. Only the finally blocks run on the way up, printing each "leave".
```

Save it and run `.venv/bin/python frames.py`:

```
enter countdown(3)
  enter countdown(2)
    enter countdown(1)
      enter countdown(0)
      leave countdown(0)
    leave countdown(1)
  leave countdown(2)
leave countdown(3)
caught: reached the bottom
```

No "back in" line at all. This is **unwinding**: an error raised in one frame removes frames from the top of the stack, one by one, until it reaches a frame with a `try` whose `except` matches it. Each frame it passes through is abandoned in the middle of what it was doing. Its `finally` blocks run on the way out, which is what `finally` (and `with`, which closes a file the same way) is for: tidying up whatever the frame had open, however it ends. If no frame catches the error, it unwinds the whole stack and Python prints the traceback, as `tree` did.

```check
run "cd kit; .venv/Scripts/python frames.py" stdout="caught: reached the bottom" -- The error raised at the bottom should be caught at the top.
run "cd kit; .venv/Scripts/python frames.py" without="back in" -- No call returns normally: the error unwinds every frame.
run "cd kit; .venv/Scripts/python frames.py" stdout="leave countdown(3)" -- finally runs in each frame as the error passes through.
```

## Catch where you can carry on

So where should `tree` catch the error from `os.listdir`? It could catch it in `main`, around the first call. But then one unreadable folder, deep in a large tree, would unwind every frame and stop the whole walk, even though the rest of the tree could still be printed. The frame that knows what to do is the call that tried to list the folder: it can report that one folder and return normally, and its caller carries on with the next entry. Catch an error in the frame that can do something sensible about it, and no deeper or higher.

- `except OSError as error:` catches any error from the operating system: `NotADirectoryError`, `FileNotFoundError` and `PermissionError` are all kinds of `OSError`.
- `error.strerror` is the system's description of the problem, without the error number.

```python file=kit/tree.py
import os
import sys


# Print everything inside the folder at path, one name per line, indented
# by depth. A folder's contents are printed by calling tree on that folder.
# A folder that can't be listed is reported, and the walk carries on.
def tree(path, depth):
    try:
        names = sorted(os.listdir(path))
    except OSError as error:
        print("    " * depth + "[can't list " + path + ": " + error.strerror + "]")
        return
    for name in names:
        child = os.path.join(path, name)
        if os.path.isdir(child):
            print("    " * depth + name + "/")
            tree(child, depth + 1)
        else:
            print("    " * depth + name)


def main():
    root = "."
    if len(sys.argv) > 1:
        root = sys.argv[1]
    print(root + "/")
    tree(root, 1)


if __name__ == "__main__":
    main()
```

Save it, and run `.venv/bin/python tree.py samples/hello.txt` again:

```
samples/hello.txt/
    [can't list samples/hello.txt: The directory name is invalid]
```

The message is the system's, so it reads differently on macOS and Linux (`Not a directory`). `.venv/bin/python tree.py sample_tree` prints the same tree as before.

```check
run "cd kit; .venv/Scripts/python tree.py samples/hello.txt" stdout="[can't list samples/hello.txt" -- A folder that can't be listed should be reported, not crash the walk.
run "cd kit; .venv/Scripts/python tree.py nowhere" stdout="[can't list nowhere" -- A missing folder is reported the same way.
run "cd kit; .venv/Scripts/python tree.py sample_tree" stdout="            logo.txt" -- The tree should print as before.
```

**What else, and why not.** Ways to walk a tree, and what each costs:

| Way | Cost |
|---|---|
| Recursion, as `tree` does | The shortest code, shaped like the data; the stack keeps your place for you. Fails past about 1000 levels in Python, and each level costs a frame |
| A loop with your own stack (a list), as in the task below | No depth limit but memory; the place-keeping that frames did is now data you can see and control. More code, and the order takes care |
| `os.walk(path)` from the standard library | Already written and tested, and handles the edge cases; it gives folders in its own order, so printing an indented tree still needs some work |
| A queue instead of a stack (breadth-first) | Visits everything at depth 1, then depth 2, and so on: good for "find the nearest", wrong for an indented listing. Module 4.1 |

## Your turn: a tree without recursion

Write `tree_iter.py`: a program that prints exactly what `tree.py` prints, for any folder, including the `[can't list …]` lines, without any function calling itself. Keep the entries still to be printed in a list used as a stack: `append` pushes onto the end, and `pop()` removes and returns the last item (the Python names for 01-04-03's `push` and `pop`). Each entry needs a path and the depth to print it at; a tuple `(path, depth)` holds both. `os.path.basename(path)` gives the last part of a path, the name to print.

Check your output against `tree.py`'s on `sample_tree`, on `samples/hello.txt`, and on `.`, the whole of `kit`.

```hints
nudge: In tree.py, what does each frame remember between one entry and the next? That's what your stack must hold. And when you pop entries off a stack, which comes off first: the one you pushed first, or last?
concept: Push a folder's entries onto the stack; pop one, print it, and if it's a folder, push its entries, so that they're printed before the rest of the stack: that's the depth-first order tree.py prints. A stack gives back the last thing pushed, so to print a folder's entries in sorted order, push them in reverse sorted order. Each entry carries its own depth, the way each frame carried its own depth parameter.
shape: A helper push_entries(stack, path, depth) lists the folder (catching OSError and printing the [can't list …] line), then for name in reversed(names): stack.append((os.path.join(path, name), depth)). tree_iter(root): stack = []; push_entries(stack, root, 1); while stack: path, depth = stack.pop(); print the basename, with a / and push_entries(stack, path, depth + 1) if it's a folder.
answer: tree_iter.py:
~~~python
import os
import sys


# Push the entries of the folder at path onto the stack, to be printed at
# depth. They're pushed last-first, so that they come off in sorted order.
# A folder that can't be listed is reported, and has no entries.
def push_entries(stack, path, depth):
    try:
        names = sorted(os.listdir(path))
    except OSError as error:
        print("    " * depth + "[can't list " + path + ": " + error.strerror + "]")
        return
    for name in reversed(names):
        stack.append((os.path.join(path, name), depth))


# The same output as tree.py, without recursion. The stack is a list of
# (path, depth) entries still to print; the last one pushed is printed next.
def tree_iter(root):
    stack = []
    push_entries(stack, root, 1)
    while stack:
        path, depth = stack.pop()
        name = os.path.basename(path)
        if os.path.isdir(path):
            print("    " * depth + name + "/")
            push_entries(stack, path, depth + 1)
        else:
            print("    " * depth + name)


def main():
    root = "."
    if len(sys.argv) > 1:
        root = sys.argv[1]
    print(root + "/")
    tree_iter(root)


if __name__ == "__main__":
    main()
~~~
The tempting slip is pushing the names in sorted order: the stack then hands them back last-first, and every folder prints backwards (tests/ before src/ before README.txt). Another is printing a folder's entries when they're pushed rather than when they're popped, which prints all of a folder's entries before any of their contents. Using collections.deque, or popping from the front with pop(0), turns the stack into a queue and gives breadth-first order instead.
```

```check
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; outs = [subprocess.run([sys.executable, p, 'sample_tree'], capture_output=True, text=True).stdout for p in ('tree.py', 'tree_iter.py')]; print(outs[0] == outs[1], len(outs[1].splitlines()))\"" stdout="True 14" -- tree_iter.py should print exactly what tree.py prints for sample_tree.
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; outs = [subprocess.run([sys.executable, p, '.'], capture_output=True, text=True).stdout for p in ('tree.py', 'tree_iter.py')]; print(outs[0] == outs[1])\"" stdout="True" -- tree_iter.py should match tree.py on the whole kit folder too.
run "cd kit; .venv/Scripts/python tree_iter.py samples/hello.txt" stdout="[can't list samples/hello.txt" -- A folder that can't be listed should be reported, as tree.py does.
run "cd kit; .venv/Scripts/python -c \"import ast; tree = ast.parse(open('tree_iter.py').read()); calls = {(f.name, c.func.id) for f in ast.walk(tree) if isinstance(f, ast.FunctionDef) for c in ast.walk(f) if isinstance(c, ast.Call) and isinstance(c.func, ast.Name)}; print(any(a == b for a, b in calls))\"" stdout="False" -- No function in tree_iter.py should call itself.
```

**What these checks establish, and what they don't.** They compare your output with `tree.py`'s, character for character, on `sample_tree` and on the whole `kit` folder, which includes `.venv`'s hundreds of entries, check an unlistable folder, and look through your file for a function that calls itself by name. (That last check uses Python's `ast` module, which reads a program as data; you don't need to know it.) They don't try a folder deeper than `tree.py` can manage, which is where the difference between the two would show; on macOS or Linux you can make one, a few hundred levels deep, with a loop around `os.makedirs`. And two functions that call each other in turn would get past the self-call check while still being recursion.

## What you can do now

- Each call gets a **frame** with its own local names and the place to return to. Frames form a **stack**: the last one made is the first to finish.
- A **recursive** function calls itself on a smaller part of the problem, and needs a **base case** that makes no call. Each recursive call adds a frame.
- A **traceback** is the stack when an error happened, oldest frame first, the error last.
- Too many frames is a **stack overflow**. Python stops it at about 1000 frames with `RecursionError`. Deep data needs a loop and an explicit stack instead.
- An exception **unwinds** the stack until a matching `except`, abandoning each frame on the way, and running its `finally`. Catch an error in the frame that can do something sensible about it.

```predict
question: A recursive function parses nested brackets: parse("((()))") calls itself once per open bracket. A user pastes in 5000 open brackets. What happens in Python, and what would you change?
explain: It raises RecursionError at about 1000 levels deep, and the error unwinds every one of those frames. If nothing catches it, the program crashes with a traceback of one repeated line. Raising the limit only moves the problem, and can crash Python itself. Better: decide what depth is reasonable and reject deeper input with a clear error (input limits are real defences: deeply nested data is a known way to crash parsers), or rewrite the parser with a loop and an explicit stack of open brackets, which handles any depth that fits in memory.
```

**Next:** 01-05-03 treats functions as values. A function can be stored in a variable, passed to another function, and built inside one, remembering the names around it: a **closure**. Blockfall gets a game loop, and its key handlers become closures.
