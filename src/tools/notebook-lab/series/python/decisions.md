# Decisions

Every program so far has done exactly the same thing every time it runs: the same lines, in the same order, from top to bottom. Real programs have to react. A game checks whether the player has run out of lives. A shop charges a child less than an adult. A login page lets you in only if the password matches. Each of these is a **decision**: do one thing if some condition holds, and something else if it does not.

This lesson covers the two parts of making a decision. First, how Python asks a question and gets a yes-or-no answer. Second, the `if` statement, which runs some code only when the answer is yes.

## True and False

A yes-or-no answer in Python is one of two special values, `True` or `False`. Together they make up the **boolean** type, called `bool`. The name comes from George Boole, the mathematician who worked out the algebra of true and false in the mid-1800s. Note the capital letters: `true` without one is just an unknown name.

You rarely type `True` or `False` directly. Usually they come from a **comparison**, which asks a question about two values:

```python type
age = 20
print(age > 18)
print(age < 18)
print(age == 20)
print(type(age > 18))
```

```output
True
False
True
<class 'bool'>
```

The comparison operators are:

- `==` equal to, and `!=` not equal to
- `<` less than, and `>` greater than
- `<=` less than or equal to, and `>=` greater than or equal to

The most important one to get right is `==`. A single `=` is assignment, which you met two lessons ago: it makes a name refer to a value. A double `==` is a question: "are these two values equal?" Mixing them up is one of the most common beginner mistakes, and Python catches it in the place where it matters most, as you will see below.

Comparisons work on strings too. `==` checks that two strings are exactly the same, character for character, and remember that capital letters count. `<` and `>` compare strings in alphabetical order, as long as the letters are the same case. Mix cases and you may be surprised: Python puts every capital letter before every lowercase letter, so `"Zebra" < "apple"` is `True`. To compare words alphabetically regardless of case, compare their `.lower()` versions.

```python type
print("apple" == "apple")
print("Apple" == "apple")
print("apple" < "banana")
print("Zebra" < "apple")
```

```output
True
False
True
True
```

The `in` operator asks whether one string appears inside another:

```python type
email = "ada@example.com"
print("@" in email)
print("gmail" in email)
```

```output
True
False
```

## The if statement

An `if` statement runs a block of code only when a condition is `True`.

```python type
temperature = 31
if temperature > 30:
    print("It's hot today.")
    print("Remember to drink water.")
print("Have a nice day.")
```

```output
It's hot today.
Remember to drink water.
Have a nice day.
```

Read it like English: *if the temperature is greater than 30, print these two lines*. Then, whatever happened, print "Have a nice day." Change `temperature` to 20 and run it again: the first two lines are skipped, but the last one still prints.

Three details of the syntax matter:

1. The condition is followed by a **colon** `:`.
2. The lines that belong to the `if` are **indented**: each starts with four spaces. This group of indented lines is called a **block**.
3. The block ends at the first line that is not indented. That line runs whether the condition was true or not.

In many languages indentation is just a matter of neatness. In Python it is part of the grammar: it is how Python knows which lines belong to the `if`. The editor in each cell indents automatically after a colon, and pressing Tab indents a line by four spaces. If the indentation is missing, Python cannot tell where the block is:

```python error IndentationError
temperature = 31
if temperature > 30:
print("It's hot today.")
```

An `IndentationError` is a kind of syntax error, so nothing in the cell runs. The fix is to indent the `print` so it belongs to the `if`.

Here is the `=` versus `==` mistake inside an `if`:

```python error SyntaxError
score = 100
if score = 100:
    print("Perfect score!")
```

Python refuses to run it. An assignment is not a question, so it cannot be a condition, and the error message even suggests the fix: `Maybe you meant '==' ... instead of '='?`

## else: the other way

Often you want one thing to happen if the condition is true and something different if it is false. That is what `else` is for.

```python type
balance = 40
price = 55
if balance >= price:
    print("Payment accepted.")
    balance -= price
else:
    print("Not enough money.")
print("Balance:", balance)
```

```output
Not enough money.
Balance: 40
```

Exactly one of the two blocks runs, never both and never neither. `else` has no condition of its own; it simply catches every case the `if` did not. Try setting `balance` to 100 and running the cell again.

## elif: choosing between several options

Some decisions have more than two outcomes. `elif`, short for "else if", adds more conditions to check, one after another.

Predict the output before running: which grade is 72?

```python type
mark = 72
if mark >= 90:
    grade = "A"
elif mark >= 80:
    grade = "B"
elif mark >= 70:
    grade = "C"
elif mark >= 60:
    grade = "D"
else:
    grade = "F"
print("Grade:", grade)
```

```output
Grade: C
```

72 is a C. Python checks the conditions **in order, from the top**, and runs the block of the **first** one that is true. Then it skips all the rest, including the `else`. A mark of 72 fails `>= 90` and `>= 80`, passes `>= 70`, and the remaining conditions are never even checked.

That is why the order matters. 72 is also `>= 60`, so it would earn a D if that line came first. Checking from the highest mark down means each condition only has to handle what the ones above it did not catch. Here is what happens with the order reversed:

```python type
mark = 95
if mark >= 60:
    grade = "D"
elif mark >= 90:
    grade = "A"
else:
    grade = "F"
print("Grade:", grade)
```

```output
Grade: D
```

A mark of 95 gets a D, because `mark >= 60` is the first true condition and wins. When conditions overlap, put the most specific one first.

## Combining conditions: and, or, not

Some questions have more than one part. Python has three words for combining conditions:

- `a and b` is true only if **both** are true.
- `a or b` is true if **at least one** is true.
- `not a` is true if `a` is false, and false if `a` is true.

```python type
age = 25
has_ticket = True
print(age >= 18 and has_ticket)
print(age < 12 or age >= 65)
print(not has_ticket)
```

```output
True
False
False
```

When one condition mixes `and` and `or`, Python works out the `and` first, the way multiplication is worked out before addition. `a or b and c` means `a or (b and c)`. Rather than relying on that rule, add parentheses whenever you mix the two, so the meaning is obvious to anyone reading:

```python type
is_weekend = False
is_holiday = True
is_raining = False
print((is_weekend or is_holiday) and not is_raining)
```

```output
True
```

A common use of `and` is checking that a number lies in a range. Python lets you write this the way a mathematician would, by chaining the comparisons:

```python type
level = 7
print(level >= 1 and level <= 10)
print(1 <= level <= 10)
```

```output
True
True
```

Both lines ask the same question; the second is shorter and reads like maths.

There is one trap with `or` that catches nearly everyone once. Suppose you want to know whether a word is either "yes" or "y". This looks right but is wrong. Predict what it prints for the word "no".

```python type
answer = "no"
if answer == "yes" or "y":
    print("You said yes.")
else:
    print("You said no.")
```

```output
You said yes.
```

It prints "You said yes.", even though the answer was "no". Python reads the condition as `(answer == "yes") or ("y")`: it does not repeat `answer ==` for you. The first part is false, so it looks at the second part, which is just the string `"y"`, and Python treats any non-empty string as true (more on that in the next section). Each side of an `or` must be a complete question: `answer == "yes" or answer == "y"`.

## Truthiness

Python lets you use any value as a condition, not only `True` and `False`. Values that count as false are the "empty" or "zero" ones: `0`, `0.0` and the empty string `""`. Almost everything else counts as true. This is called **truthiness**, and the function `bool()` shows how Python sees a value:

```python type
print(bool(0), bool(42), bool(-1))
print(bool(""), bool("hello"), bool(" "))
```

```output
False True True
False True True
```

Note that `" "`, a string containing a single space, is true: it is not empty. Truthiness gives a short way to check whether a string has anything in it:

```python type
name = ""
if name:
    print(f"Hello, {name}!")
else:
    print("You didn't enter a name.")
```

```output
You didn't enter a name.
```

## Choosing a value in one line

When a decision only picks between two values, Python has a compact form called a **conditional expression**: `value_if_true if condition else value_if_false`.

```python type
count = 1
label = "item" if count == 1 else "items"
print(count, label)
```

```output
1 item
```

It is exactly equivalent to a four-line `if`/`else` that assigns `label`, but reads naturally when the choice is simple. For anything longer, use a normal `if` statement.

## Comparing floats safely

In lesson 2 you saw that floats are stored slightly inexactly, so `0.1 + 0.2` is `0.30000000000000004`. Now you can see why that matters for decisions:

```python type
total = 0.1 + 0.2
print(total == 0.3)
print(abs(total - 0.3) < 1e-9)
```

```output
False
True
```

`total == 0.3` is `False`. The safe way to compare two floats is to ask whether they are **close**: whether the size of their difference is smaller than some tiny amount. Here that amount is `1e-9`, which is scientific notation for 0.000000001. The difference is far smaller than that, so the second comparison is `True`.

::: challenge Cinema tickets [easy]
A cinema charges by age:

- under 5: free (0)
- 5 to 17: 6
- 65 and over: 7
- everyone else: 12

Set `price` to the right amount for the value of `age`, and print it. The check tries many ages, including the edges of each band, such as 4, 5, 17 and 18.

```python starter
age = 30

price = 0
print("Price:", price)
```

```python solution
age = 30

if age < 5:
    price = 0
elif age <= 17:
    price = 6
elif age >= 65:
    price = 7
else:
    price = 12
print("Price:", price)
```

```python test
import io, contextlib
assert "age = 30" in _source, "Keep the line age = 30 as it is, so the check can try other ages."
_cases = {0: 0, 4: 0, 5: 6, 12: 6, 17: 6, 18: 12, 30: 12, 64: 12, 65: 7, 90: 7}
for _age, _want in _cases.items():
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace("age = 30", f"age = {_age}"), _ns)
    assert _ns.get("price") == _want, f"At age {_age} the price should be {_want}, but your code gives {_ns.get('price')}."
"SUCCESS: Every age band is priced correctly, edges included."
```

Hint: Use `if`, `elif` and `else`, checking the bands one at a time from the youngest. Think carefully about `<` versus `<=` at each edge: is someone who is exactly 5 still free?
:::

::: challenge Leap years [medium]
Most years have 365 days, but leap years have 366. The rule is:

1. A year divisible by 4 is a leap year,
2. except that a year divisible by 100 is not,
3. except that a year divisible by 400 is.

So 2024 is a leap year, 1900 is not (divisible by 100), and 2000 is (divisible by 400). Set `is_leap` to `True` or `False` for the value of `year`. The check tries many years.

```python starter
year = 2024

is_leap = False
print(year, "is a leap year:", is_leap)
```

```python solution
year = 2024

if year % 400 == 0:
    is_leap = True
elif year % 100 == 0:
    is_leap = False
elif year % 4 == 0:
    is_leap = True
else:
    is_leap = False
print(year, "is a leap year:", is_leap)
```

```python test
import io, contextlib
assert "year = 2024" in _source, "Keep the line year = 2024 as it is, so the check can try other years."
for _year in [2024, 2023, 1900, 2000, 2100, 2400, 1996, 1999, 1600, 1700]:
    _want = (_year % 4 == 0 and _year % 100 != 0) or _year % 400 == 0
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace("year = 2024", f"year = {_year}"), _ns)
    _got = _ns.get("is_leap")
    assert _got in (True, False) and type(_got) is bool, f"is_leap must be exactly True or False, but for {_year} it is {_got!r}. Set it with a comparison or with True/False."
    assert _got is _want, f"{_year} should give is_leap = {_want}, but your code gives {_got!r}."
"SUCCESS: Your leap year rule handles every exception."
```

Hint: "Divisible by 4" means the remainder is zero: `year % 4 == 0`. The exceptions are the tricky part, so check the most specific rule first: divisible by 400, then by 100, then by 4. That is the same "most specific first" idea as the grades example.
:::

::: challenge Password rules [medium]
A website accepts a new password only if it follows three rules. Set `message` to exactly one of these strings, checking the rules in this order and reporting the first one broken:

1. `"Too short"` if the password has fewer than 8 characters.
2. `"Contains your username"` if the username appears anywhere in the password.
3. `"Needs a capital letter"` if the password has no capital letters at all.
4. Otherwise `"Password accepted"`.

The check tries many passwords.

```python starter
username = "ada"
password = "ada12345"

message = ""
print(message)
```

```python solution
username = "ada"
password = "ada12345"

if len(password) < 8:
    message = "Too short"
elif username in password:
    message = "Contains your username"
elif password.lower() == password:
    message = "Needs a capital letter"
else:
    message = "Password accepted"
print(message)
```

```python test
import io, contextlib
assert 'password = "ada12345"' in _source, 'Keep the line password = "ada12345" as it is, so the check can try other passwords.'
_cases = {
    "short": "Too short",
    "Ab1": "Too short",
    "ada12345": "Contains your username",
    "Xada5678": "Contains your username",
    "blue-sky-42": "Needs a capital letter",
    "12345678": "Needs a capital letter",
    "Blue-sky-42": "Password accepted",
    "AAAAAAAA": "Password accepted",
}
for _pw, _want in _cases.items():
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace('password = "ada12345"', f'password = "{_pw}"'), _ns)
    assert _ns.get("message") == _want, f"For the password {_pw!r} the message should be {_want!r}, but your code gives {_ns.get('message')!r}."
"SUCCESS: All three rules are checked, in the right order."
```

Hint: `len(password)` gives its length, and `username in password` checks whether the username appears in it. For the capital letter rule, think about what `password.lower()` returns for a password with no capitals: exactly the same string as `password`.
:::

## What you learned

- `True` and `False` are the two boolean values. Comparisons (`==`, `!=`, `<`, `>`, `<=`, `>=`) and `in` produce them.
- `=` assigns and `==` compares. Python refuses `if x = 1:`.
- `if condition:` runs the indented block below it only when the condition is true. Indentation is part of Python's grammar.
- `elif` and `else` add alternatives. Python runs the block of the first true condition and skips the rest, so put the most specific conditions first.
- `and`, `or` and `not` combine conditions. Each side of `or` must be a complete comparison.
- Empty and zero values count as false, and almost everything else as true.
- `a if condition else b` chooses between two values in one line.
- Compare floats by checking that their difference is tiny, not with `==`.

Next you will start working with collections of values, beginning with lists, so a single variable can hold a whole group of things.
