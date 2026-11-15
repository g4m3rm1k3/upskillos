---
title: Conditions Are Statements: Truth Tables, Short-Circuits and Truthiness
runtime: python
---

Here is a condition from a log-processing script. `has_error` says whether a line contains `error`, and `has_debug` whether it contains `debug`:

```python
if not (not has_error or has_debug):
    keep(line)
```

Which lines does it keep? Most people can't say without slowing right down, and many guess wrong. Conditions like this are everywhere in real code, and they're one of the easiest places for a bug to hide, whether a person or an AI tool wrote the code. This lesson gives you a way to read any condition exactly, and starts Kit's second tool, `filter`, which keeps the lines that match a query.

**By the end you can:**

- Write the truth table for a condition of two or three propositions, and use it to say exactly which inputs make the condition true.
- Predict which parts of an `and` / `or` expression Python evaluates, and use that order to guard an operation that could fail.
- Spot a condition that tests a value's truthiness when it means something else, such as `if line.find(term):`, and rewrite it to say what it means.

**You need:** module 1.1 (lessons 01-01-01 to 01-01-04) and its `kit` folder. Every command runs inside `kit`.

## A condition nobody can read

Each of `has_error` and `has_debug` is a **proposition**: a statement that is either true or false. "This line contains `error`" is a proposition about one line. The condition combines the two with three **logical operators**: `not` flips true and false; `a or b` is true when at least one of them is; `a and b` is true only when both are.

```predict
question: Which lines does `not (not has_error or has_debug)` keep?
choice: Lines with error, or with debug
choice: Lines with error but without debug
choice: Lines with neither error nor debug
choice: Lines with debug but without error
answer: Lines with error but without debug
explain: Work outward. `not has_error or has_debug` is true when the line lacks error or has debug. The outer `not` keeps exactly the other lines: those that have error and lack debug. The next step checks this mechanically, with no cleverness needed.
```

To try `filter` on something real you need a log file. As in 01-01-01, a small script makes it, so the bytes are exact:

```python file=kit/make_log.py
lines = [
    b"info: start\n",
    b"error: disk full\n",
    b"debug: error counter reset\n",
    b"warning: slow response\n",
    b"error: retry failed, debug id 7\n",
    b"info: done\n",
]
with open("samples/app.log", "wb") as file:
    file.write(b"".join(lines))
print("wrote samples/app.log")
```

`b"".join(lines)` glues the byte strings together with nothing between them. Save it and run `.venv/bin/python make_log.py`: it prints `wrote samples/app.log`. Line 3 is the interesting one. It's a debug line that mentions `error`, and a query for errors has to decide what to do with it.

```check
run "cd kit; .venv/Scripts/python make_log.py" stdout="wrote samples/app.log" -- make_log.py should write the six lines to samples/app.log.
file kit/samples/app.log
```

## Truth tables

Two propositions can be true or false in exactly four combinations. A **truth table** lists all four and the value of an expression in each. Because it covers every case, it doesn't predict the answer, it *is* the answer: there's nothing left over to be wrong about.

This script prints one, with a column for each operator and two for the conditions from the opening. `str(a).ljust(6)` pads the word to six characters so the columns line up. The column `a != b` is **exclusive or**, **XOR**: true when exactly one of the two is true. Everyday English "or" is often exclusive ("tea or coffee?"), but Python's `or` never is: `a or b` is true when both are.

```python file=kit/truth.py
# a: the line contains "error"    b: the line contains "debug"
print("a      b      | a and b | a or b | a != b | not (not a or b) | a and not b")
for a in [False, True]:
    for b in [False, True]:
        print(
            str(a).ljust(6), str(b).ljust(6), "|",
            str(a and b).ljust(7), "|",
            str(a or b).ljust(6), "|",
            str(a != b).ljust(6), "|",
            str(not (not a or b)).ljust(16), "|",
            a and not b,
        )
```

Save it and run `.venv/bin/python truth.py`:

```
a      b      | a and b | a or b | a != b | not (not a or b) | a and not b
False  False  | False   | False  | False  | False            | False
False  True   | False   | True   | True   | False            | False
True   False  | False   | True   | True   | True             | True
True   True   | True    | True   | False  | False            | False
```

Read the last two columns. They agree in every row, so the two conditions are **equivalent**: they are true for exactly the same inputs, and either can replace the other. The tangled one is true only in the row where `a` is true and `b` is false. That's the plain reading, "has error and doesn't have debug", and the next lesson shows how to rewrite one form into the other without a table.

Three propositions give eight rows; `n` give 2ⁿ. A table is exact, and it grows fast.

```check
run "cd kit; .venv/Scripts/python truth.py" stdout="True   False  | False   | True   | True   | True             | True" -- Print a row for each of the four combinations of a and b.
```

## Kit's second tool: filter

`filter` reads lines and writes out only the lines that match a query. For now a query has two groups of terms:

- `--all` terms: the line must contain every one of them (AND);
- `--none` terms: the line must contain none of them (NOT, for each).

So `filter.py samples/app.log --all error --none debug` keeps the lines with `error` and without `debug`, the opening's condition.

New pieces in this file:

- `for line in stream:` on a stream opened in binary mode gives one line at a time, as bytes, each ending in its `b"\n"`. The file is never read whole, as in 01-01-04.
- `sys.stdout.buffer.write(line)` writes those bytes out exactly. `print` would show `b'...'` and add a second newline.
- `sys.exit("message")` prints the message to standard error and ends the process with status 1.
- `main` reads the arguments: the first is the file (or `-` for standard input), and each later word is added to whichever group the last `--all` or `--none` named.

`matches` is written with `find`, which returns the position where a term starts. **This version has a bug on purpose.** Type it, then predict.

```python file=kit/filter.py
import sys


# The query: a line matches when it contains every --all term and no --none term.
def matches(line, all_terms, none_terms):
    for term in all_terms:
        if not line.find(term):
            return False
    for term in none_terms:
        if line.find(term):
            return False
    return True


# Copy the lines that match from a stream of bytes to standard output.
def filter_lines(stream, all_terms, none_terms):
    for line in stream:
        if matches(line, all_terms, none_terms):
            sys.stdout.buffer.write(line)


def main():
    args = sys.argv[1:]
    if len(args) == 0:
        sys.exit("usage: filter.py FILE [--all TERM ...] [--none TERM ...]")

    groups = {"--all": [], "--none": []}
    group = None
    for arg in args[1:]:
        if arg in groups:
            group = groups[arg]
        elif group is None:
            sys.exit("filter.py: put --all or --none before " + arg)
        else:
            group.append(arg.encode("utf-8"))

    if args[0] == "-":
        filter_lines(sys.stdin.buffer, groups["--all"], groups["--none"])
    else:
        with open(args[0], "rb") as file:
            filter_lines(file, groups["--all"], groups["--none"])


if __name__ == "__main__":
    main()
```

```predict
question: Save it and run `.venv/bin/python filter.py samples/app.log --all error`. Three of the six lines contain `error`. How many of those three does it print?
answer: 1
explain: It prints `debug: error counter reset`, and also the three lines with no error at all. The two lines that *start* with error are missing. The next step reads the evidence.
```

```check
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error" stdout="info: start" -- Use line.find(term) for this step, as shown; the next step fixes it.
```

## Truthiness

Run it:

```
info: start
debug: error counter reset
warning: slow response
info: done
```

Almost exactly the wrong lines. Find out what `find` returned:

```
.venv/bin/python -c "print(b'error: disk full'.find(b'error'), b'info: start'.find(b'error'))"
```

It prints `0 -1`. `find` gives the *position* of the term, 0 for the very start, and -1 when the term isn't there. It doesn't answer "is it there?" at all.

So why did `if not line.find(term):` act on it? Because an `if` accepts any value, not only `True` and `False`. Python treats some values as false, and everything else as true. Values that count as false are called **falsy**: `False`, `None`, the number `0`, and empty things (`""`, `b""`, `[]`, `{}`). Everything else is **truthy**, including -1, and even the string `"False"`. That's **truthiness**.

Now trace the bug, line by line:

- `error: disk full`: `find` gives 0, which is falsy, so `not 0` is true and the line is rejected, though it contains `error`.
- `info: start`: `find` gives -1, which is truthy, so it passes, though it has no `error`.
- `debug: error counter reset`: `find` gives 7, truthy, so it passes, correctly, but by luck.

The condition tested *a number's truthiness* when it meant *a proposition*: "does the line contain the term?". Python has an operator that is that proposition: `term in line` is `True` or `False`, nothing else. Two lines change:

```python file=kit/filter.py
import sys


# The query: a line matches when it contains every --all term and no --none term.
def matches(line, all_terms, none_terms):
    for term in all_terms:
        if term not in line:
            return False
    for term in none_terms:
        if term in line:
            return False
    return True


# Copy the lines that match from a stream of bytes to standard output.
def filter_lines(stream, all_terms, none_terms):
    for line in stream:
        if matches(line, all_terms, none_terms):
            sys.stdout.buffer.write(line)


def main():
    args = sys.argv[1:]
    if len(args) == 0:
        sys.exit("usage: filter.py FILE [--all TERM ...] [--none TERM ...]")

    groups = {"--all": [], "--none": []}
    group = None
    for arg in args[1:]:
        if arg in groups:
            group = groups[arg]
        elif group is None:
            sys.exit("filter.py: put --all or --none before " + arg)
        else:
            group.append(arg.encode("utf-8"))

    if args[0] == "-":
        filter_lines(sys.stdin.buffer, groups["--all"], groups["--none"])
    else:
        with open(args[0], "rb") as file:
            filter_lines(file, groups["--all"], groups["--none"])


if __name__ == "__main__":
    main()
```

Save it and run the same command: it prints the three lines that contain `error`. Then `.venv/bin/python filter.py samples/app.log --all error --none debug` prints only `error: disk full`, the opening's condition at work. And `filter` joins a pipeline: `.venv/bin/python filter.py samples/app.log --none info | .venv/bin/python count.py` counts the 4 lines that aren't info lines.

You've already relied on the opposite care. `count.py` says `if counts["characters"] is None:`, not `if not counts["characters"]:`.

```predict
question: If count.py used `if not counts["characters"]:` instead, what would it print for an empty file?
explain: "characters: not utf-8 text". An empty file has 0 characters, and 0 is falsy, so the test can't tell "no characters" from "not text". `is None` asks the question that was meant. A truthiness test is safe only when every falsy value really means the same thing.
```

```check
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error" stdout="error: disk full" without="info: start" -- Test whether the line contains the term with `term in line`, not with find.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --none debug" stdout="error: disk full" without="counter" -- A --none term should remove every line that contains it.
run "cd kit; .venv/Scripts/python filter.py - --all error" stdin="x error\ny\n" stdout="x error" without="y" -- A path of - should read standard input.
run "cd kit; .venv/Scripts/python filter.py" exit=1 stderr="usage:" -- With no arguments, filter.py should print a usage line and end with status 1.
```

## Short-circuit evaluation

`matches` returns `False` at the first `--all` term that's missing. It doesn't look at the others, because the answer can't change: one false part makes the whole AND false. Python's `and` and `or` work the same way. It evaluates the left side first, and it evaluates the right side only if the answer still depends on it:

- `a and b`: if `a` is false, the result is false, and `b` is never evaluated.
- `a or b`: if `a` is true, the result is true, and `b` is never evaluated.

This is **short-circuit evaluation**. To see it, here is a function that prints its name when it's evaluated:

```python file=kit/short.py
# check prints its name, so you can see whether Python evaluated it.
def check(name, value):
    print("checked", name)
    return value


print("and:", check("a", False) and check("b", True))
print("or:", check("a", True) or check("b", False))
print("and:", check("c", True) and check("d", False))
```

```predict
question: Save it and run `.venv/bin/python short.py`. How many "checked" lines does it print in all?
answer: 4
explain: The first and stops after a (false), and the or stops after a (true): one check each. The last and has a true left side, so it must evaluate d too: two checks. 1 + 1 + 2 = 4.
```

Short-circuiting isn't just about speed. It makes **guards** possible: a left side that checks it's safe to evaluate the right side. `count.py` has one: `len(args) > 0 and args[0] != "-"`. The order matters:

```predict
question: What does `.venv/bin/python -c "args = []; print(args[0] != '-' and len(args) > 0)"` do?
choice: Prints False
choice: Prints True
choice: Stops with IndexError
answer: Stops with IndexError
explain: The left side runs first, and args[0] on an empty list fails before len(args) > 0 is ever checked. In logic, `a and b` and `b and a` are equivalent. In Python they aren't, once evaluating one side can fail or has an effect. Swap them back and it prints False.
```

01-01-03's `count_word_starts` had a guard too: `i == 0 or data[i - 1] in WHITESPACE`.

**What else, and why not.** `matches` could be written other ways:

| Written as | Cost |
|---|---|
| `find` compared properly: `line.find(term) != -1` | Correct, but it says "position isn't -1" when it means "contains". A reader has to translate |
| A regular expression | Much more powerful, and module 1.6 adds one. For plain terms it's slower to read, and characters such as `.` or `(` in a term would mean something unexpected |
| `term in line` (chosen) | Says exactly the proposition, and returns a real `True` or `False` |

```check
run "cd kit; .venv/Scripts/python short.py" stdout="checked d" -- short.py should print the three results; the last and must evaluate both sides.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error" stdout="error: retry failed" -- filter.py should still keep every line that contains error.
```

## Your turn: an --any group

Add a third group, `--any`: the line must contain **at least one** of its terms (OR). Every group applies at once:

- `filter.py samples/app.log --any disk slow` keeps `error: disk full` and `warning: slow response`.
- `filter.py samples/app.log --all error --any disk retry --none counter` keeps `error: disk full` and `error: retry failed, debug id 7`.
- Commands without `--any` behave exactly as before.

The last requirement hides a decision. "At least one of the `--any` terms" sounds simple. But when no `--any` terms are given, at least one of *zero* terms is never present, so read literally, no line could match. Decide what `--any` with no terms should mean, write that decision in the comment above `matches`, and make the code follow it.

```hints
nudge: With no --any group, which lines should pass the "any" test? Then: what does your OR loop return when its list is empty?
concept: An OR over a list is true as soon as one term is found, and false if the loop ends without finding one, including when there was nothing to loop over. Since no group should mean no condition, test the list first: an empty list is falsy, which is a safe truthiness test here, because an empty list is the only falsy value a list of terms can be.
shape: Add "--any": [] to groups and pass groups["--any"] through filter_lines to matches. In matches, after the none loop: if any_terms, loop over them and return True on the first term in the line, and return False after the loop; otherwise fall through to return True. Update the usage message and the "put --all, --any or --none before" error.
answer: matches, with the new comment:
~~~python
# The query: a line matches when it contains every --all term,
# at least one --any term (if any were given), and no --none term.
def matches(line, all_terms, any_terms, none_terms):
    for term in all_terms:
        if term not in line:
            return False
    for term in none_terms:
        if term in line:
            return False
    if any_terms:
        for term in any_terms:
            if term in line:
                return True
        return False
    return True
~~~
filter_lines takes any_terms and passes it on: `def filter_lines(stream, all_terms, any_terms, none_terms):` and `matches(line, all_terms, any_terms, none_terms)`. In main, groups = {"--all": [], "--any": [], "--none": []}, and both calls become filter_lines(…, groups["--all"], groups["--any"], groups["--none"]). Without the `if any_terms:` test, the loop over an empty list ends and returns False, so every command without --any prints nothing.
```

```check
run "cd kit; .venv/Scripts/python filter.py samples/app.log --any disk slow" stdout="warning: slow response" without="info" -- A line should match when it contains at least one --any term.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --any disk retry --none counter" stdout="retry failed" without="counter" -- All three groups apply at once.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error" stdout="debug: error counter reset" -- With no --any group, the any condition should be left out.
```

**What these checks establish, and what they don't.** They run three queries on the sample log and look for a line that should appear and one that shouldn't. They don't try every combination of groups, terms that appear twice in a line, a term that is empty (`--any ""`: what should that mean?), or upper-case text: `filter` is case-sensitive, so `--all error` misses `ERROR`. Whether it should be is a specification question. Write a truth table for your `matches` with three propositions: "has an --all term", "has an --any term" and "has a --none term". Check that its eight rows say what you meant.

## What you can do now

- A condition is built from **propositions** with `and`, `or`, `not`; `!=` on booleans is **XOR**, exactly one. Python's `or` is inclusive.
- A **truth table** lists every combination, so it settles what a condition means. Two conditions with the same column are **equivalent**.
- Python evaluates `and` / `or` left to right and stops as soon as the answer is known. Put the **guard** first; in code, `a and b` and `b and a` can differ when evaluating one side can fail.
- `if x:` tests **truthiness**, and 0, empty values and `None` are all falsy. Test the proposition you mean (`term in line`, `x is None`) unless every falsy value means the same thing.

```predict
question: A teammate's code says `if user.discount:` to decide whether to apply a discount, where discount is a percentage that may be missing (None). A customer with a 0% discount set on purpose reports a problem. Which values does this condition mishandle, and how would you write it?
explain: 0 and None are both falsy, so the condition treats "a discount of 0" the same as "no discount recorded". Here that may happen to be harmless, but the code can't tell the two apart; if another branch handles missing discounts (say, looking up a default), the 0% customer gets the default. Say what you mean: `if user.discount is not None:`.
```

**Next:** lesson 01-02-02 rewrites conditions without a table: De Morgan's laws, implication and equivalence, and flattening `matches`' nested loops into one expression that provably means the same thing.
