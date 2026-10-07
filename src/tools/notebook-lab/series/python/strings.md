# Strings

Most of what programs handle is text: names, messages, addresses, file contents, web pages. In Python a piece of text is a **string**, and you have been writing strings since the first lesson every time you put something in quotation marks. This lesson shows what you can do with them: build a message out of pieces, pull out part of a string, clean it up, and search it.

Along the way you will meet two ideas that apply far beyond strings. The first is **indexing**, which is how Python numbers the positions in a sequence, and it works the same way for many other kinds of data you will meet later. The second is **methods**, functions that belong to a value and are written after it with a dot.

## Writing strings

A string can be written with double quotes or single quotes; `"hello"` and `'hello'` are exactly the same string. Having both is useful when the text itself contains a quotation mark.

```python type
print("It's a lovely day.")
print('She said "hello" and left.')
```

```output
It's a lovely day.
She said "hello" and left.
```

The first string contains an apostrophe, so it uses double quotes around the outside; the second contains double quotes, so it uses single quotes. If Python saw `'It's a lovely day.'`, it would think the string ended at the apostrophe.

Some characters cannot be typed directly into a string, so Python uses **escape sequences**: a backslash followed by a letter. The two you will use most are `\n`, which means "start a new line", and `\t`, which inserts a tab. To put a real backslash in a string, write two: `\\`.

```python type
print("Line one\nLine two")
print("Name:\tAda")
print("A backslash: \\")
```

```output
Line one
Line two
Name:	Ada
A backslash: \
```

The `\n` is written as two characters in the code, but it is one character in the string: an invisible "new line" character. For text that spans several lines, you can also use triple quotes, which let a string continue across line breaks:

```python type
poem = """Roses are red,
violets are blue,
this string has three lines."""
print(poem)
```

```output
Roses are red,
violets are blue,
this string has three lines.
```

## Joining strings together

The `+` operator joins two strings into one, and `*` repeats a string. Joining strings is called **concatenation**.

```python type
first = "Ada"
last = "Lovelace"
full_name = first + " " + last
print(full_name)
print("-" * 20)
```

```output
Ada Lovelace
--------------------
```

Notice the `" "` in the middle: `+` adds nothing between the strings, so the space has to be added explicitly. `"-" * 20` makes a string of twenty dashes, handy for drawing a line in the output.

Here `+` means something different for strings than for numbers: it joins instead of adding. That raises a question. What should `"Age: " + 36` do? Predict before you run it.

```python error TypeError
age = 36
print("Age: " + age)
```

Python refuses, with a `TypeError`: a value of the wrong type was used. The message says it can only **concatenate str (not "int") to str**. (`str` is Python's name for the string type, just as `int` is the name for integers.) Python will not guess whether you meant to join text or add numbers. You have to convert one of them. The function `str()` turns a value into its text form. And `int()` and `float()`, which you met last lesson converting between kinds of number, also turn text containing a number into a number: `int("40")` is the number 40. The text has to look like the right kind of number, though; `int("3.5")` and `int("forty")` are both errors.

```python type
age = 36
print("Age: " + str(age))
print(int("40") + 2)
print("40" + "2")
```

```output
Age: 36
42
402
```

The last two lines are worth comparing. `int("40") + 2` converts the text to the number 40 and adds 2, giving `42`. `"40" + "2"` joins two strings, giving `402`. The same symbol, two completely different results, decided entirely by the types involved.

## f-strings: putting values into text

Converting and joining quickly gets clumsy when a message contains several values. Python has a much better way, the **f-string**. Put the letter `f` just before the opening quote, and then anything inside curly braces `{ }` is worked out as Python code and its value is inserted into the text.

```python type
name = "Ada"
age = 36
print(f"{name} is {age} years old.")
print(f"Next year {name} will be {age + 1}.")
```

```output
Ada is 36 years old.
Next year Ada will be 37.
```

No `str()` is needed and no `+` signs: the f-string converts each value for you. The braces can contain any expression, like `age + 1`. Without the `f`, the braces are just ordinary characters, which is a common slip: `"{name}"` prints `{name}` literally.

An f-string can also control how a number is displayed. After the value, add a colon and a **format specification**. The most useful ones:

```python type
price = 3.14159
big = 1234567
print(f"Price: {price:.2f}")
print(f"Population: {big:,}")
print(f"Share: {0.256:.1%}")
```

```output
Price: 3.14
Population: 1,234,567
Share: 25.6%
```

`:.2f` means "a float with 2 digits after the decimal point", so `3.14159` shows as `3.14`. `:,` puts commas between the thousands. `:.1%` shows a fraction as a percentage with one decimal place, so `0.256` becomes `25.6%`. These change only how the number is shown; the variable itself is untouched.

## Positions in a string: indexing

A string is a **sequence** of characters, one after another, and each character has a numbered position called its **index**. Python counts positions starting from **zero**, not one. The first character is at index 0, the second at index 1, and so on. You get a single character by putting its index in square brackets after the string.

```python type
word = "Python"
print(word[0])
print(word[1])
print(word[5])
print(len(word))
```

```output
P
y
n
6
```

`word[0]` is `P` and `word[5]` is `n`, the last letter. The built-in function `len` gives the **length** of a string, the number of characters in it: here `6`. Because counting starts at 0, the last index is always one less than the length.

Counting from zero feels odd at first. One way to think about it: the index says how many characters come before this one. `P` has none before it, so its index is 0.

Python also lets you count from the end with negative indexes: `word[-1]` is the last character, `word[-2]` the one before it, and so on. This is much easier than working out `word[len(word) - 1]`.

```python type
word = "Python"
print(word[-1])
print(word[-2])
```

```output
n
o
```

Ask for a position that does not exist and you get an error. Predict which kind before you run this.

```python error IndexError
word = "Python"
print(word[6])
```

An `IndexError`: the index is out of range. A six-letter word has indexes 0 to 5, so there is no index 6. This is one of the most common errors in all of programming, usually from forgetting that counting starts at zero. It even has a name: an **off-by-one error**.

## Slices: taking part of a string

To take more than one character, use a **slice**: two indexes separated by a colon, `text[start:stop]`. The slice starts at `start` and stops just **before** `stop`. The character at `stop` is not included.

```python type
word = "Python"
print(word[0:2])
print(word[2:6])
print(word[1:4])
```

```output
Py
thon
yth
```

`word[0:2]` is `Py`: positions 0 and 1, stopping before 2. `word[2:6]` is `thon`. Stopping before the second index seems strange until you notice what it buys you: `word[0:2] + word[2:6]` fits back together exactly, and the number of characters in a slice is simply `stop - start`.

Either index can be left out. A missing start means "from the beginning", and a missing stop means "to the end". Negative indexes work in slices too.

```python type
filename = "report_final.pdf"
print(filename[:6])
print(filename[7:])
print(filename[-3:])
```

```output
report
final.pdf
pdf
```

`filename[:6]` is the first six characters, `report`. `filename[7:]` is everything from index 7 on. `filename[-3:]` is the last three characters, `pdf`: a neat way to get a file extension.

A slice can take a third number, the **step**: `text[start:stop:step]` takes every step-th character, so `"Python"[::2]` takes every second character, `Pto`. The most famous use is a step of `-1`, which walks backwards through the whole string and reverses it.

```python type
print("Python"[::2])
print("Python"[::-1])
```

```output
Pto
nohtyP
```

## Strings cannot be changed

Suppose you want to turn "Python" into "Jython" by replacing the first letter. The obvious attempt fails:

```python error TypeError
word = "Python"
word[0] = "J"
```

The message says a `'str' object does not support item assignment`. Strings in Python are **immutable**: once a string exists, it can never be changed. What you can do is build a new string and make the variable refer to it instead:

```python type
word = "Python"
word = "J" + word[1:]
print(word)
```

```output
Jython
```

This distinction, between changing a value and making a name refer to a new value, will matter a lot when you meet lists, which *can* be changed.

## Methods: functions that belong to a value

Strings come with dozens of built-in operations called **methods**. A method is a function that belongs to a particular value. You call it by writing the value, a dot, the method's name and parentheses: `text.upper()`. Because strings are immutable, string methods never change the original string; they return a new string.

```python type
shout = "hello there"
print(shout.upper())
print(shout.title())
print(shout)
```

```output
HELLO THERE
Hello There
hello there
```

`upper()` gives an all-capitals copy and `title()` capitalises the first letter of each word. The last line shows that `shout` itself is unchanged. To keep the result, assign it: `shout = shout.upper()`.

Here are the methods you will use most often:

```python type
messy = "   Hello, World!   "
print(messy.strip())
print(messy.lower())
print(messy.replace("World", "Python"))
print("banana".count("a"))
print("banana".find("n"))
print("banana".find("x"))
```

```output
Hello, World!
   hello, world!
   Hello, Python!
3
2
-1
```

- `strip()` removes spaces (and tabs and new lines) from both ends. Text typed by people or read from files often has stray spaces, so this is used constantly.
- `lower()` gives an all-lowercase copy.
- `replace(old, new)` replaces every occurrence of one piece of text with another.
- `count(piece)` counts how many times a piece of text appears.
- `find(piece)` gives the index where a piece of text first appears, or `-1` if it does not appear at all.

`find` combines well with slicing. If you know where something is, you can cut the string there:

```python type
sentence = "The answer is 42 exactly."
start = sentence.find("42")
print(start)
print(sentence[start:start + 2])
```

```output
14
42
```

Methods can also be chained, one after another, each working on the result of the one before: `messy.strip().lower()` strips the spaces and then lowercases what is left.

::: challenge Name badge [easy]
The starter has a person's first and last name. Create two variables:

- `initials`: the first letter of each name followed by a full stop, like `A.L.`
- `badge`: the last name in capitals, a comma and a space, then the first name, like `LOVELACE, Ada`

Print both. Your code must work for any names, so build the strings from `first_name` and `last_name` rather than typing the letters. The check tries other names.

```python starter
first_name = "Ada"
last_name = "Lovelace"

initials = ""
badge = ""
print(initials)
print(badge)
```

```python solution
first_name = "Ada"
last_name = "Lovelace"

initials = first_name[0] + "." + last_name[0] + "."
badge = f"{last_name.upper()}, {first_name}"
print(initials)
print(badge)
```

```python test
import io, contextlib
assert initials == "A.L.", f"initials should be 'A.L.' but it is {initials!r}."
assert badge == "LOVELACE, Ada", f"badge should be 'LOVELACE, Ada' but it is {badge!r}."
assert 'first_name = "Ada"' in _source and 'last_name = "Lovelace"' in _source, "Keep the two name lines as they are, so the check can try other names."
_ns = {}
_code = _source.replace('first_name = "Ada"', 'first_name = "Grace"').replace('last_name = "Lovelace"', 'last_name = "Hopper"')
with contextlib.redirect_stdout(io.StringIO()):
    exec(_code, _ns)
assert _ns.get("initials") == "G.H." and _ns.get("badge") == "HOPPER, Grace", f"For Grace Hopper you should get 'G.H.' and 'HOPPER, Grace', but got {_ns.get('initials')!r} and {_ns.get('badge')!r}. Build the strings from the variables."
"SUCCESS: Your badge works for any name."
```

Hint: `first_name[0]` is the first letter of the first name. Join the pieces with `+`, or use an f-string. For the badge, `last_name.upper()` gives the capitalised last name.
:::

::: challenge Receipt line [medium]
A shop's receipt shows each item on one line. Using the variables in the starter, build a string called `line` that looks exactly like this:

```text
3 x Pencil at 0.45 each = 1.35
```

Prices must always show exactly two decimal places, so a price of 2 shows as `2.00`. Print `line`. The check tries a different item.

```python starter
item = "Pencil"
quantity = 3
price = 0.45

line = ""
print(line)
```

```python solution
item = "Pencil"
quantity = 3
price = 0.45

line = f"{quantity} x {item} at {price:.2f} each = {quantity * price:.2f}"
print(line)
```

```python test
import io, contextlib
assert line == "3 x Pencil at 0.45 each = 1.35", f"line should be '3 x Pencil at 0.45 each = 1.35' but it is {line!r}."
assert 'item = "Pencil"' in _source and "price = 0.45" in _source and "quantity = 3" in _source, "Keep the three starter lines as they are, so the check can try another item."
_ns = {}
_code = _source.replace('item = "Pencil"', 'item = "Notebook"').replace("price = 0.45", "price = 2").replace("quantity = 3", "quantity = 4")
with contextlib.redirect_stdout(io.StringIO()):
    exec(_code, _ns)
assert _ns.get("line") == "4 x Notebook at 2.00 each = 8.00", f"For 4 notebooks at 2 the line should be '4 x Notebook at 2.00 each = 8.00', but yours is {_ns.get('line')!r}. Check the two decimal places."
"SUCCESS: That receipt line is formatted exactly right."
```

Hint: Use an f-string. Each price needs the format specification `:.2f` after it, inside the braces. The total is an expression, so it can go straight into braces too: `{quantity * price:.2f}`.
:::

::: challenge Split an email address [medium]
An email address has two parts either side of the `@`: the user name and the domain. Using `find` and slicing, create a variable `user` with everything before the `@` and a variable `domain` with everything after it.

For `ada.lovelace@example.com`, `user` is `ada.lovelace` and `domain` is `example.com`. The check tries other addresses, so work out where the `@` is rather than counting characters yourself.

```python starter
email = "ada.lovelace@example.com"

user = ""
domain = ""
print(user)
print(domain)
```

```python solution
email = "ada.lovelace@example.com"

at = email.find("@")
user = email[:at]
domain = email[at + 1:]
print(user)
print(domain)
```

```python test
import io, contextlib
assert user == "ada.lovelace", f"user should be 'ada.lovelace' but it is {user!r}."
assert domain == "example.com", f"domain should be 'example.com' but it is {domain!r}. Make sure the @ itself is not included."
assert 'email = "ada.lovelace@example.com"' in _source, "Keep the email line as it is, so the check can try other addresses."
for _email, _u, _d in [("grace@navy.mil", "grace", "navy.mil"), ("x@y.org", "x", "y.org")]:
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace('email = "ada.lovelace@example.com"', f'email = "{_email}"'), _ns)
    assert (_ns.get("user"), _ns.get("domain")) == (_u, _d), f"For {_email} you should get {_u!r} and {_d!r}, but got {_ns.get('user')!r} and {_ns.get('domain')!r}. Use find to locate the @."
"SUCCESS: You found the @ and sliced either side of it."
```

Hint: `email.find("@")` gives the index of the `@`; store it in a variable. The user name is the slice up to that index (which stops just before the `@`). The domain starts one position after it.
:::

## What you learned

- Strings can use single or double quotes. Escape sequences like `\n` and `\t` stand for special characters, and triple quotes allow several lines.
- `+` joins strings and `*` repeats them. Mixing a string and a number with `+` is a `TypeError`; convert with `str()`, `int()` or `float()`.
- An f-string, `f"...{expression}..."`, inserts values into text. Format specifications like `:.2f`, `:,` and `:.1%` control how numbers look.
- Indexes start at 0; negative indexes count from the end. `len()` gives the length.
- A slice `text[start:stop]` stops just before `stop`. Leaving out an index means "from the start" or "to the end", and `[::-1]` reverses.
- Strings are immutable. Methods such as `upper`, `lower`, `strip`, `replace`, `count` and `find` return new strings and leave the original unchanged.

So far every program has done the same thing every time it runs. Next you will write programs that make decisions, doing one thing or another depending on the values they are working with.
