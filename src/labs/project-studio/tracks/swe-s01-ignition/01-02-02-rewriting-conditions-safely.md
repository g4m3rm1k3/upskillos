---
title: Rewriting Conditions Safely: De Morgan, Implication and Exhaustive Checks
runtime: python
---

`filter`'s `matches` is fourteen lines of loops and early returns, for a rule that fits in one sentence. Code like that gets simplified all the time: by you, by a reviewer, by an AI tool asked to "clean this up". Each simplification is a claim, *the new condition means the same as the old one*, and a wrong one usually still passes the obvious example. This lesson gives you the laws that make a rewrite correct, and a way to check a rewrite against every case instead of a few.

**By the end you can:**

- Rewrite a condition with De Morgan's laws, double negation and distribution, naming the law behind each step.
- Write "if A then B" as a condition, and tell it apart from its converse.
- Flatten nested `if`s into one expression, and prove the two equivalent by checking every combination of inputs.

**You need:** lesson 01-02-01, with `kit/filter.py` including your `--any` group. Every command runs inside `kit`.

## A rule with three inputs

This function decides whether a log line is shown on screen. Errors always show; other lines show in verbose mode, unless quiet mode is on. Read the nested version first:

~~~python
def show_nested(is_error, verbose, quiet):
    if quiet:
        if is_error:
            return True
        else:
            return False
    else:
        if verbose:
            return True
        else:
            return is_error
~~~

```predict
question: Which single expression means exactly the same as show_nested?
choice: is_error or verbose
choice: (is_error or verbose) and not quiet
choice: is_error or (verbose and not quiet)
choice: is_error and not quiet or verbose
answer: is_error or (verbose and not quiet)
explain: Errors show whatever the modes are, so is_error stands alone on one side of an or. A non-error shows only when verbose is on and quiet is off. The second choice hides errors in quiet mode; the fourth shows everything in verbose mode, even when quiet is on.
```

Don't trust that reasoning, including the explanation above. Three inputs have 2 × 2 × 2 = 8 combinations, so check them all: three nested loops, one per input, comparing the two versions in every case and printing any case where they differ.

```python file=kit/show_rule.py
# Should a log line be shown on screen?
def show_nested(is_error, verbose, quiet):
    if quiet:
        if is_error:
            return True
        else:
            return False
    else:
        if verbose:
            return True
        else:
            return is_error


def show_flat(is_error, verbose, quiet):
    return is_error or (verbose and not quiet)


cases = 0
differences = 0
for is_error in [False, True]:
    for verbose in [False, True]:
        for quiet in [False, True]:
            cases += 1
            nested = show_nested(is_error, verbose, quiet)
            flat = show_flat(is_error, verbose, quiet)
            if nested != flat:
                differences += 1
                print("differ:", is_error, verbose, quiet, "nested", nested, "flat", flat)
print(cases, "cases,", differences, "differences")
```

Save it and run `.venv/bin/python show_rule.py`: `8 cases, 0 differences`. That isn't evidence, it's a proof: there are no other inputs. Now change `show_flat` to the second choice, `(is_error or verbose) and not quiet`, and run it again. Two `differ:` lines appear, both with `quiet` true and `is_error` true: errors hidden in quiet mode. Change it back.

A check over every input is called **exhaustive**. It's only possible when the inputs are few, but conditions on booleans are exactly that case.

```check
run "cd kit; .venv/Scripts/python show_rule.py" stdout="8 cases, 0 differences" -- show_flat should be is_error or (verbose and not quiet).
```

## Laws for rewriting

A truth table tells you *whether* two conditions are equivalent. Laws tell you *how* to turn one into the other, a step at a time, with each step known to be safe. Four do most of the work:

| Law | Says | In words |
|---|---|---|
| Double negation | `not not a` = `a` | Two flips cancel |
| De Morgan (and) | `not (a and b)` = `not a or not b` | "Not both" means "at least one is missing" |
| De Morgan (or) | `not (a or b)` = `not a and not b` | "Neither" means "each one is missing" |
| Distribution | `a and (b or c)` = `(a and b) or (a and c)` | `and` spreads over `or` (and `or` over `and`) |

De Morgan's laws are the ones people get wrong: a `not` pushed inside brackets flips every `and` to `or` and every `or` to `and`. Here's 01-02-01's tangled condition, rewritten one law at a time:

1. `not (not has_error or has_debug)`
2. `not not has_error and not has_debug` (De Morgan, or)
3. `has_error and not has_debug` (double negation)

Each line is equivalent to the one before, so the last is equivalent to the first, the same answer the truth table gave.

You can check a law the same way as a rule, over every row. This list comprehension has two `for`s, so it runs over all four combinations of `a` and `b`:

```
.venv/bin/python -c "print([(not (a and b)) == (not a or not b) for a in (False, True) for b in (False, True)])"
```

It prints `[True, True, True, True]`: the two sides agree in every row. The brackets around `not (a and b)` matter. `not` binds more loosely than `==`, so without them Python reads `not ((a and b) == (not a or not b))`, a different question. When you write a check like this, bracket each side.

```predict
question: Apply De Morgan to `not (is_admin or is_owner)`. Which is equivalent?
choice: not is_admin or not is_owner
choice: not is_admin and not is_owner
choice: is_admin and is_owner
answer: not is_admin and not is_owner
explain: Pushing not inside flips or to and: "neither an admin nor an owner" means "not an admin, and not an owner". The first choice is the classic slip: it's true for an admin who isn't the owner.
```

```check
run "cd kit; .venv/Scripts/python -c \"print([(not (a and b)) == (not a or not b) for a in (False, True) for b in (False, True)])\"" stdout="[True, True, True, True]" -- This checks De Morgan's law over all four rows.
```

## If, then

Requirements are often written as "if A, then B": *if it's night, someone must be on call*. That's a proposition too, called an **implication**, and it's false in exactly one case: A is true and B is false. It's night and nobody is on call. In every other case the rule is kept, including whenever A is false, because a rule about nights says nothing about days.

So "if A then B" is `not a or b`: either A doesn't hold, or B does. Python has no operator for it, so you write it this way.

```predict
question: Which condition is the rule "if it's night, someone must be on call"?
choice: is_night and on_call
choice: not is_night or on_call
choice: not on_call or is_night
answer: not is_night or on_call
explain: The rule is broken only at night with nobody on call; `not is_night or on_call` is false only then. The first choice is false every day, so it says "it's always night". The third is the converse, "if someone is on call, it's night", a different rule.
```

Two relatives of an implication look alike and aren't:

- The **contrapositive**, "if not B, then not A" (*if nobody's on call, it isn't night*), is equivalent to the original. In code: `b or not a`, the same two parts in a different order.
- The **converse**, "if B, then A" (*if someone's on call, it's night*), is a different rule. Mixing these two up is one of the most common logic errors in specifications and in code.

You've already written an implication. `matches`' `--any` group says: *if any `--any` terms were given, then one of them is in the line*. The `if any_terms:` around the loop is that "if", and the next steps make it visible.

Two propositions that are always true together and false together are **equivalent**, as in 01-02-01. With booleans, `a == b` tests it.

```check
run "cd kit; .venv/Scripts/python -c \"print([((not a) or b) == (b or not a) for a in (False, True) for b in (False, True)])\"" stdout="[True, True, True, True]" -- An implication and its contrapositive agree in every row.
```

## A harness for matches

`matches` has four inputs, but they aren't booleans: a line and three lists of terms. Their combinations are endless. Yet `matches` only ever asks one kind of question, "is this term in the line?". So a small vocabulary of three terms, `a`, `b` and `c`, is enough to produce every *pattern* of answers. Each list can be any **subset** of the vocabulary (8 of them, from none to all three), and so can the set of terms present in the line. That's 8 × 8 × 8 × 8 = 4096 cases, every combination of which terms are asked for and which are present.

`itertools.combinations(VOCABULARY, size)` gives every way to choose `size` of the terms, so looping `size` from 0 to 3 collects all 8 subsets. `b" ".join(present)` builds a line containing exactly those terms.

This file keeps a copy of the current `matches` as `matches_loops`, the **reference**, and compares `filter.matches` with it in every case. Copy your loop version into it exactly, if yours differs from the one shown.

```python file=kit/check_filter.py
import itertools

from filter import matches


# matches as 01-02-01 left it: loops and early returns. This is the reference.
def matches_loops(line, all_terms, any_terms, none_terms):
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


# Every subset of three terms: (), (a,), (b,), (c,), (a, b), (a, c), (b, c), (a, b, c).
VOCABULARY = [b"a", b"b", b"c"]
SUBSETS = []
for size in range(len(VOCABULARY) + 1):
    for subset in itertools.combinations(VOCABULARY, size):
        SUBSETS.append(list(subset))

cases = 0
differences = 0
for present in SUBSETS:
    line = b" ".join(present) + b"\n"
    for all_terms in SUBSETS:
        for any_terms in SUBSETS:
            for none_terms in SUBSETS:
                cases += 1
                expected = matches_loops(line, all_terms, any_terms, none_terms)
                got = matches(line, all_terms, any_terms, none_terms)
                if got != expected:
                    differences += 1
                    if differences <= 3:
                        print("differ:", line, all_terms, any_terms, none_terms, "expected", expected, "got", got)
print(cases, "cases,", differences, "differences")
```

Save it and run `.venv/bin/python check_filter.py`: `4096 cases, 0 differences`.

That result proves nothing yet, and it's worth seeing why. `filter.matches` and `matches_loops` are the same code, so this check can't fail. A check that compares something with a copy of itself is **tautological**: it passes whatever the code does. Here that's deliberate, because the harness is waiting for a second version to compare against. Notice the pattern, though. Module 1.9 will ask of every test: *could this fail if the code were wrong?*

(The vocabulary is three terms, not two, so that two terms can be in a group while a third stays outside it. Two would miss some patterns, and four would give 65,536 cases with nothing new.)

```check
run "cd kit; .venv/Scripts/python check_filter.py" stdout="4096 cases, 0 differences" -- check_filter.py should compare filter.matches with matches_loops on all 4096 cases.
```

## One expression, one mistake

Python has two built-in functions that are `and` and `or` over a whole sequence:

- `all(values)` is true when every value is true. It stops at the first false one, so it short-circuits like `and`.
- `any(values)` is true when at least one value is true. It stops at the first true one, like `or`.

What you pass them here is a **generator expression**, `term in line for term in all_terms`: like a list comprehension in round brackets, it produces its values one at a time, as `all` or `any` asks for them.

Now the flattened `matches`, written straight from the rule's three parts. **It has a mistake in it, and it's a realistic one.** The `--none` part says "not all of them are in the line":

```python file=kit/filter.py
import sys


# The query: a line matches when it contains every --all term,
# at least one --any term (if any were given), and no --none term.
def matches(line, all_terms, any_terms, none_terms):
    return (
        all(term in line for term in all_terms)
        and (not any_terms or any(term in line for term in any_terms))
        and not all(term in line for term in none_terms)
    )


# Copy the lines that match from a stream of bytes to standard output.
def filter_lines(stream, all_terms, any_terms, none_terms):
    for line in stream:
        if matches(line, all_terms, any_terms, none_terms):
            sys.stdout.buffer.write(line)


def main():
    args = sys.argv[1:]
    if len(args) == 0:
        sys.exit("usage: filter.py FILE [--all TERM ...] [--any TERM ...] [--none TERM ...]")

    groups = {"--all": [], "--any": [], "--none": []}
    group = None
    for arg in args[1:]:
        if arg in groups:
            group = groups[arg]
        elif group is None:
            sys.exit("filter.py: put --all, --any or --none before " + arg)
        else:
            group.append(arg.encode("utf-8"))

    if args[0] == "-":
        filter_lines(sys.stdin.buffer, groups["--all"], groups["--any"], groups["--none"])
    else:
        with open(args[0], "rb") as file:
            filter_lines(file, groups["--all"], groups["--any"], groups["--none"])


if __name__ == "__main__":
    main()
```

The `--any` part is the implication from the last step, `not any_terms or …`: "if there are `--any` terms, then one is in the line". Save the file and try the query everyone tries first:

```
.venv/bin/python filter.py samples/app.log --all error --none debug
```

It prints `error: disk full`, which is right. Now run the harness:

```predict
question: How many of the 4096 cases does `check_filter.py` find different?
choice: None: the obvious query worked
choice: A handful, only with two --none terms
choice: Hundreds
answer: Hundreds
explain: 521 of them. The mistake shows up in two different ways, and the next paragraphs read both from the evidence.
```

Run `.venv/bin/python check_filter.py`:

```
differ: b'\n' [] [] [] expected True got False
differ: b'a\n' [] [] [b'a', b'b'] expected False got True
4096 cases, 521 differences
```

(You'll see three `differ:` lines; the second is like the first.) Read each as a counterexample:

1. **An empty query rejects everything.** With no `--none` terms, `all(...)` of nothing is true, since there's no term that fails, so `not all(...)` is false and no line passes. `filter.py samples/app.log --all error` prints nothing at all. The obvious query hid it because it happened to have a `--none` term.
2. **`--none a b` keeps a line containing `a`.** "Not all of a and b are in the line" is true, because `b` isn't. But the rule said *none* of them may be in it.

Both are the same slip, and De Morgan names it. "None of the terms is in the line" is "not (a in line or b in line or …)", which is `not any(...)`. By De Morgan that also equals `all(term not in line ...)`. It is not `not all(...)`, which means "at least one is missing".

```check
run "cd kit; .venv/Scripts/python check_filter.py" stdout="4096 cases, 521 differences" -- For this step, the --none part is `not all(...)`, as shown; the next step fixes it.
```

## Fix it, and prove it

One word changes, `all` to `any`, in the `--none` part:

```python file=kit/filter.py
import sys


# The query: a line matches when it contains every --all term,
# at least one --any term (if any were given), and no --none term.
def matches(line, all_terms, any_terms, none_terms):
    return (
        all(term in line for term in all_terms)
        and (not any_terms or any(term in line for term in any_terms))
        and not any(term in line for term in none_terms)
    )


# Copy the lines that match from a stream of bytes to standard output.
def filter_lines(stream, all_terms, any_terms, none_terms):
    for line in stream:
        if matches(line, all_terms, any_terms, none_terms):
            sys.stdout.buffer.write(line)


def main():
    args = sys.argv[1:]
    if len(args) == 0:
        sys.exit("usage: filter.py FILE [--all TERM ...] [--any TERM ...] [--none TERM ...]")

    groups = {"--all": [], "--any": [], "--none": []}
    group = None
    for arg in args[1:]:
        if arg in groups:
            group = groups[arg]
        elif group is None:
            sys.exit("filter.py: put --all, --any or --none before " + arg)
        else:
            group.append(arg.encode("utf-8"))

    if args[0] == "-":
        filter_lines(sys.stdin.buffer, groups["--all"], groups["--any"], groups["--none"])
    else:
        with open(args[0], "rb") as file:
            filter_lines(file, groups["--all"], groups["--any"], groups["--none"])


if __name__ == "__main__":
    main()
```

Save it and run `.venv/bin/python check_filter.py`: `4096 cases, 0 differences`. This time that's a real result, since two different programs agree on every pattern of terms. Then the queries from 01-02-01 give the same lines as before: `--all error` prints the three error lines, and `--any disk slow` prints `error: disk full` and `warning: slow response`.

Is the flat version *better*? It reads like the rule's sentence, one clause per part, and a reviewer can match it against the specification at a glance. But nothing about flattening made it correct: the harness did. Without it, the wrong version would have shipped, because it passed the example people try.

**What else, and why not.**

| Approach | Cost |
|---|---|
| Keep the loops | Easier to step through in a debugger, one term at a time. But the rule is spread over fourteen lines, and the empty-group case hides in an `if` |
| Flatten by eye, check a few queries | Fast, and it is how the `not all` slip ships: the obvious query passed |
| Flatten with the laws, then check exhaustively (chosen) | Needs a reference and a harness. In exchange, the rewrite is proved for every pattern of terms, not sampled |

```check
run "cd kit; .venv/Scripts/python check_filter.py" stdout="4096 cases, 0 differences" -- The --none part should be not any(...): none of the terms may be in the line.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error" stdout="error: retry failed" -- With no --none terms, every line with error should pass.
run "cd kit; .venv/Scripts/python filter.py samples/app.log --all error --any disk retry --none counter" stdout="disk full" without="counter" -- All three groups should still apply at once.
```

## Your turn: flatten an alerting rule

An on-call system decides whether an event pages someone. Here is its rule as nested `if`s:

~~~python
# Should this event page the on-call engineer?
def should_alert(is_error, is_night, on_call, muted):
    if muted:
        return False
    if is_error:
        if is_night:
            return on_call
        return True
    return False
~~~

Make a file `alert.py` containing:

1. `should_alert`, exactly as above: the reference.
2. `should_alert_flat`, with the same four parameters, whose body is a single `return` of one expression. Write it from the rule in words before you write code. Where does an implication hide in it?
3. Under `if __name__ == "__main__":`, an exhaustive check: every combination of the four inputs, printing any that differ, and then a final line in the form `16 cases, 0 differences`.

Then break your flat version on purpose, in a way you think is plausible, and check that your harness catches it.

```hints
nudge: In words: when does this page someone? Read the nesting from the top: what must be true or false at each level for it to return True?
concept: It pages only when it isn't muted, and it's an error, and the night rule is kept. The night rule is an implication: "if it's night, then someone is on call", which is `not is_night or on_call`. Four booleans have 2 × 2 × 2 × 2 = 16 combinations: four nested loops over [False, True], like show_rule.py.
shape: return not muted and is_error and (not is_night or on_call). The harness: cases and differences start at 0; four nested for loops; in the innermost, add 1 to cases, call both functions, and if they differ add 1 to differences and print the inputs; after the loops, print(cases, "cases,", differences, "differences").
answer: One version of the two new parts:
~~~python
# The same rule as one expression: if it's night, someone must be on call.
def should_alert_flat(is_error, is_night, on_call, muted):
    return not muted and is_error and (not is_night or on_call)


if __name__ == "__main__":
    cases = 0
    differences = 0
    for is_error in [False, True]:
        for is_night in [False, True]:
            for on_call in [False, True]:
                for muted in [False, True]:
                    cases += 1
                    if should_alert(is_error, is_night, on_call, muted) != should_alert_flat(is_error, is_night, on_call, muted):
                        differences += 1
                        print("differ:", is_error, is_night, on_call, muted)
    print(cases, "cases,", differences, "differences")
~~~
A plausible mistake is to write the night part as `is_night and on_call`: then a daytime error never pages, and the harness prints two differ lines, both with is_error true and is_night false. The bracket matters too: without it, `not muted and is_error and not is_night or on_call` pages whenever someone is on call, error or not.
```

```check
run "cd kit; .venv/Scripts/python alert.py" stdout="16 cases, 0 differences" -- alert.py should compare should_alert and should_alert_flat on all 16 combinations and print the totals.
run "cd kit; .venv/Scripts/python -c \"import itertools; from alert import should_alert_flat; print([int(should_alert_flat(*c)) for c in itertools.product([False, True], repeat=4)])\"" stdout="[0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0]" -- should_alert_flat(is_error, is_night, on_call, muted) should page only for an unmuted error, and at night only if someone is on call.
```

**What these checks establish, and what they don't.** They run your harness and look for its total, and they compute `should_alert_flat` for all 16 inputs and compare with the right answers, so a wrong flat version fails even if your harness is wrong too. They don't check that your flat version is one expression, that your harness prints the inputs of a difference, or that it would catch a mistake. That last one is the point of breaking it on purpose: a harness you've never seen fail hasn't shown you it can.

## What you can do now

- Rewrite with laws, one step at a time: double negation, De Morgan (a `not` pushed inside brackets flips `and` and `or`), distribution. Bracket each side when you compare two conditions in code.
- "If A then B" is `not a or b`. Its contrapositive is equivalent; its converse isn't.
- `all` and `any` are `and` and `or` over a sequence. "None of them" is `not any(...)`, never `not all(...)`. `all` of nothing is true, `any` of nothing is false.
- A rewrite is a claim of equivalence. When the inputs are few, or can be reduced to a few patterns, check every case against the original, and make sure the harness can fail.

```predict
question: An AI tool simplifies a 30-line permission check in a pull request and says "logic unchanged; all existing tests pass". The function takes five booleans. What do you ask for, or do, before approving?
explain: Five booleans have only 32 combinations, so ask for (or write) an exhaustive comparison of the old and new functions, with the old one kept as the reference. Existing tests are samples, not the 32 cases, and they may not exercise the changed paths. Then check the harness can fail, by breaking the new version once. If the tool's rewrite used De Morgan or turned a nested if into an implication, read those parts against the laws too.
```

**Next:** lesson 01-02-03 starts Blockfall, a falling-block game in JavaScript, and makes `all` and `any` precise: "every cell of the piece is free", and its negation, "some cell is blocked".
