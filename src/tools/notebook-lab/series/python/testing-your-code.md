# Testing your own code

Every challenge in this series has checked your code automatically. Behind each one is a hidden **test**: a short piece of code that runs your function on inputs whose answers are known, and complains if any answer is wrong. In this last lesson you learn to write those tests yourself, for your own code.

Testing is not an optional extra for professionals. It is how they can change a large program with confidence. Without tests, every change risks breaking something far away, and the only way to find out is to try everything by hand, which nobody does thoroughly. With tests, you change the code, run the tests, and know within seconds whether everything still works. This lesson covers writing tests, choosing what to test, a tiny test runner built from things you already know, test-first development, and the tools professionals use.

## A test is code that checks code

The simplest test is a function whose name starts with `test_` and which uses `assert` to check results:

```python type
def word_count(text):
    return len(text.split())

def test_word_count():
    assert word_count("the quick brown fox") == 4
    assert word_count("hello") == 1
    assert word_count("") == 0
    assert word_count("  spaced   out  ") == 2

test_word_count()
print("test_word_count passed")
```

```output
test_word_count passed
```

If every assert holds, the test function returns quietly and the last line prints. If any fails, it raises an `AssertionError` and stops at that line. The test states, in runnable form, exactly what `word_count` is supposed to do, including the cases people forget: empty text and extra spaces.

Each check follows the same shape, sometimes called **arrange, act, assert**: set up the input, call the code, and check the result. For a check like `word_count("hello") == 1` all three fit on one line; for an object with several steps they take several lines.

## Give asserts a message

When an assert fails with no message, you only learn that it failed. Adding a message, and especially including the actual value, turns a failure into a diagnosis:

```python error AssertionError
def average(numbers):
    return sum(numbers) / len(numbers) + 1

def test_average():
    result = average([2, 4, 6])
    assert result == 4, f"average([2, 4, 6]) should be 4, got {result}"

test_average()
```

The message shows at once that the answer is off by exactly one, which points straight at the stray `+ 1`. Every test in this series has used messages like this, so you have seen how helpful they are.

## What to test

Testing only the example you had in mind proves very little; that is the case you already thought about. Good tests deliberately look for the cases where code breaks:

- **A typical case**, to show the normal behaviour works.
- **Edge cases**: the smallest and largest inputs, an empty list or string, zero, one item, negative numbers, the exact values at the boundary of a rule (an age of exactly 18, a score of exactly the pass mark).
- **Special cases**: duplicates, ties, capital letters, spaces, repeated calls.
- **Errors**: inputs that should be refused, to check they really are.

Think of it as trying to break the code. Every bug you have met in this series (off by one, the empty list, the tie, the shared list) is exactly the kind of thing a good edge-case test catches.

## Testing that errors are raised

Some behaviour is "this should fail". To test it, call the code inside `try`, and fail the test if no exception happens. As you read the cell, ask: what would happen if `withdraw` returned normally instead of raising?

```python type
def withdraw(balance, amount):
    if amount > balance:
        raise ValueError("insufficient funds")
    return balance - amount

def test_withdraw_refuses_overdraft():
    try:
        withdraw(50, 80)
    except ValueError:
        return
    raise AssertionError("withdraw(50, 80) should have raised ValueError")

test_withdraw_refuses_overdraft()
print("passed")
```

```output
passed
```

If `withdraw` raises `ValueError`, the `except` block returns and the test passes. If it returns normally instead, the code reaches the final line, and the test fails with a clear message. Any other kind of exception is not caught, and also makes the test fail, which is right.

## A tiny test runner

Calling each test function by hand gets tedious once you have more than a few. A **test runner** finds all the test functions, runs each one, and reports what passed and what failed, without stopping at the first failure. You can build one from things you already know: functions are values, so the runner can take a dictionary of names and functions, pick out the ones whose names start with `test_`, and call each one. Predict which of the three tests fails, and whether the runner stops there.

```python type
def run_tests(namespace):
    passed, failed = 0, 0
    for name, obj in list(namespace.items()):
        if name.startswith("test_") and callable(obj):
            try:
                obj()
            except AssertionError as e:
                failed += 1
                print(f"FAIL {name}: {e}")
            except Exception as e:
                failed += 1
                print(f"ERROR {name}: {type(e).__name__}: {e}")
            else:
                passed += 1
                print(f"pass {name}")
    print(f"{passed} passed, {failed} failed")

def test_upper():
    assert "abc".upper() == "ABC"

def test_split_on_comma():
    assert "a,b".split(",") == ["a", "b"]

def test_deliberately_wrong():
    assert 0.1 + 0.2 == 0.3, "floats are not exact"

run_tests({"test_upper": test_upper, "test_split_on_comma": test_split_on_comma, "test_deliberately_wrong": test_deliberately_wrong})
```

```output
pass test_upper
pass test_split_on_comma
FAIL test_deliberately_wrong: floats are not exact
2 passed, 1 failed
```

`callable(obj)` checks that a value can be called, which a function can. Each test runs inside its own `try`, so one failure does not stop the rest. A failed assertion is reported as a **failure** (the code gave the wrong answer), and any other exception as an **error** (the code crashed). Catching every kind of exception with `except Exception` is usually a bad idea (lesson 14), but a test runner is the exception to the rule: its whole job is to report any crash and carry on with the next test. This small function is, in essence, what professional test tools do.

The built-in function `globals()` returns a dictionary of every name defined at the top level of the program, so `run_tests(globals())` would run every `test_` function in the notebook. Here the three tests are passed explicitly instead, because earlier cells in this lesson also defined test functions, one of them deliberately broken.

## Checking a clever function against a simple one

Sometimes the right answer is hard to work out by hand, but there is a slow, obviously correct way to compute it. Then you can test the clever version against the simple one on hundreds of random inputs. The simple version is called a **reference implementation** or **oracle**.

```python type
import random

def count_pairs_simple(numbers, target):
    count = 0
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            if numbers[i] + numbers[j] == target:
                count += 1
    return count

def count_pairs_fast(numbers, target):
    seen = {}
    count = 0
    for n in numbers:
        count += seen.get(target - n, 0)
        seen[n] = seen.get(n, 0) + 1
    return count

random.seed(0)
for _ in range(500):
    numbers = [random.randint(-5, 5) for _ in range(random.randint(0, 12))]
    target = random.randint(-6, 6)
    fast = count_pairs_fast(numbers, target)
    slow = count_pairs_simple(numbers, target)
    assert fast == slow, f"Mismatch for {numbers}, {target}: fast {fast}, simple {slow}"
print("500 random cases agree")
```

```output
500 random cases agree
```

The fast version is much quicker on big inputs (the Algorithms series explains why), but it is also much easier to get subtly wrong. Five hundred random cases, including empty lists, duplicates and negative numbers, give strong evidence that it is right. If they ever disagree, the assert prints the exact input that broke it, which is a ready-made small example for debugging.

## Write the test first

A powerful habit, called **test-driven development**, turns the usual order round: write the tests **before** the code.

1. Write a test for a small piece of behaviour. Run it and watch it fail, since the code does not exist yet.
2. Write the simplest code that makes it pass.
3. Tidy the code up, running the tests to make sure it still works.

Then repeat for the next piece of behaviour. Writing the test first forces you to decide exactly what the function should do, including its edge cases, before you are distracted by how to do it. And every piece of code you write is tested from the moment it exists. The last challenge in this lesson works this way: the tests are written, and you make them pass.

## Tests in real projects

In a real project, tests live in their own files, named like `test_shopping.py`, next to the code they test. A test tool finds and runs them all with one command. The most popular is **pytest**: install it, write functions named `test_...` using plain `assert`, run `pytest` in the project folder, and it does what your `run_tests` did, with far more detail when something fails. Python's standard library also includes a test framework called `unittest`, which organises tests as methods of a class. Many projects run their tests automatically every time anyone changes the code, so a mistake is caught before it reaches anyone using the program.

::: challenge Catch the bugs [medium]
This time you write the tests. The function `is_palindrome(text)` should return `True` if `text` reads the same forwards and backwards, **ignoring capital letters and spaces**. So `"Never odd or even"` is a palindrome, and so is the empty string.

Write a test function `test_is_palindrome()` full of asserts. The check runs your test against a correct `is_palindrome`, where it must pass, and then against several broken versions, each with a different common bug. Your test must fail on **every** broken version. Think about which edge cases would expose a careless implementation.

```python starter
def is_palindrome(text):
    cleaned = text.replace(" ", "").lower()
    return cleaned == cleaned[::-1]

def test_is_palindrome():
    assert is_palindrome("racecar")

test_is_palindrome()
print("my test passed")
```

```python solution
def is_palindrome(text):
    cleaned = text.replace(" ", "").lower()
    return cleaned == cleaned[::-1]

def test_is_palindrome():
    assert is_palindrome("racecar")
    assert not is_palindrome("racecars")
    assert is_palindrome("Racecar")
    assert is_palindrome("Never odd or even")
    assert is_palindrome("")
    assert is_palindrome("a")
    assert not is_palindrome("ab")
    assert not is_palindrome("abca")

test_is_palindrome()
print("my test passed")
```

```python test
assert "test_is_palindrome" in dir(), "Keep the test function's name as test_is_palindrome."
_real = is_palindrome
def _correct(text):
    c = text.replace(" ", "").lower()
    return c == c[::-1]
def _no_lower(text):
    c = text.replace(" ", "")
    return c == c[::-1]
def _no_spaces(text):
    c = text.lower()
    return c == c[::-1]
def _always_true(text):
    return True
def _empty_false(text):
    c = text.replace(" ", "").lower()
    return len(c) > 0 and c == c[::-1]
def _first_last_only(text):
    c = text.replace(" ", "").lower()
    return len(c) == 0 or c[0] == c[-1]
def _runs(impl):
    globals()["is_palindrome"] = impl
    try:
        test_is_palindrome()
        return True
    except AssertionError:
        return False
    finally:
        globals()["is_palindrome"] = _real
assert _runs(_correct), "Your test fails on a correct is_palindrome. Check that every assert matches the rules (ignore capitals and spaces; the empty string is a palindrome)."
for _bug, _desc in [(_no_lower, "does not ignore capital letters"), (_no_spaces, "does not ignore spaces"), (_always_true, "always returns True"), (_empty_false, "says the empty string is not a palindrome"), (_first_last_only, "only compares the first and last letters")]:
    assert not _runs(_bug), f"Your test passed on a broken version that {_desc}. Add an assert that would catch it."
"SUCCESS: Your test catches every one of the broken versions. That is what good edge cases are for."
```

Hint: For each rule, ask what a careless version would get wrong: capital letters, spaces, the empty string, something that is not a palindrome at all, and something whose ends match but whose middle does not.
:::

::: challenge Make the tests pass [medium]
Test-first: the tests for a function `slugify(title)` are already written in the starter. A **slug** is the part of a web address made from a page title, like `my-first-post`. Write `slugify` so that all the tests pass, then run the cell. The check also runs a few extra tests of the same rules.

The rules, as the tests show:

- lowercase everything;
- keep letters and digits; turn every run of other characters (spaces, punctuation) into a single `-`;
- no `-` at the start or end.

```python starter
def slugify(title):
    return title

def test_slugify():
    assert slugify("Hello World") == "hello-world"
    assert slugify("  Python  3.13 is here!  ") == "python-3-13-is-here"
    assert slugify("Already-a-slug") == "already-a-slug"
    assert slugify("!!!") == ""
    assert slugify("") == ""

test_slugify()
print("All slugify tests pass")
```

```python solution
def slugify(title):
    pieces = []
    current = ""
    for character in title.lower():
        if character.isalnum():
            current += character
        elif current:
            pieces.append(current)
            current = ""
    if current:
        pieces.append(current)
    return "-".join(pieces)

def test_slugify():
    assert slugify("Hello World") == "hello-world"
    assert slugify("  Python  3.13 is here!  ") == "python-3-13-is-here"
    assert slugify("Already-a-slug") == "already-a-slug"
    assert slugify("!!!") == ""
    assert slugify("") == ""

test_slugify()
print("All slugify tests pass")
```

```python test
assert "slugify" in dir(), "Keep the function's name as slugify."
for _title, _want in [
    ("Hello World", "hello-world"),
    ("  Python  3.13 is here!  ", "python-3-13-is-here"),
    ("Already-a-slug", "already-a-slug"),
    ("!!!", ""),
    ("", ""),
    ("A", "a"),
    ("What's New?", "what-s-new"),
    ("10 Tips -- and 5 Tricks", "10-tips-and-5-tricks"),
]:
    _got = slugify(_title)
    assert _got == _want, f"slugify({_title!r}) should be {_want!r}, but got {_got!r}."
"SUCCESS: Written test-first, and passing the hidden tests too."
```

Hint: Walk through the lowercased title one character at a time, building up the current word while characters are letters or digits (`character.isalnum()`). When you reach any other character, finish the current word, if there is one, by adding it to a list. At the end, join the words with `"-"`. Joining only non-empty words takes care of repeated separators and the ends.
:::

## What you learned

- A test is a function, usually named `test_...`, that runs code on known inputs and asserts the results. Messages that include the actual value make failures easy to diagnose.
- Test typical cases, edge cases (empty, zero, one, boundaries), special cases (ties, capitals, repeats) and errors.
- Test that an error is raised with `try`/`except`, failing the test if the code returns normally.
- A test runner finds the test functions, runs each separately, and reports passes, failures and errors.
- A slow, obviously correct reference implementation can check a clever one on many random inputs.
- Test-driven development: write a failing test, make it pass, tidy up, repeat.
- Real projects keep tests in `test_*.py` files and run them with a tool such as `pytest` or `unittest`.

## You have finished Python from Zero

You can now write programs with variables, decisions, loops, functions, collections, files, classes, generators and tests, and you know how to read errors and debug. That is a real foundation: it is the Python that working programmers use every day.

Where next is up to you. Both follow-on series assume exactly what you have learned here, and both are in the sidebar:

- **Machine Learning** starts with *NumPy arrays* and builds learning algorithms from scratch, from the perceptron to Q-learning.
- **Algorithms & Design Patterns** starts with *What an algorithm is* and teaches you to write programs that are fast and well organised.
