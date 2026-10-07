# Running code

A program is a list of instructions for a computer. The computer follows them exactly, in order, and does nothing you did not ask for. That exactness is what makes programming feel strange at first: a person reading "print hello" would guess what you meant, but a computer will not guess. The good news is that the same exactness makes computers predictable. If you know the rules, you can say in advance what a program will do, and most of this series is about learning those rules one at a time.

The language you will write in is **Python**. It is one of the most widely used programming languages in the world, and it is the language of most data science and machine learning. Nothing needs installing: Python runs inside this browser tab.

## How this page works

This page is a **notebook**: text like this, mixed with boxes of Python code called **cells**. To run a cell, click its **Run** button, or click inside the code and press Shift+Enter. Whatever the code produces appears underneath it. The first time you run anything, Python takes a few seconds to start; after that, cells run almost instantly.

You can change any cell and run it again, and you should. Trying things is how programming is learned. Nothing you type can damage anything, and the **Reset** button at the top of the page puts the whole lesson back the way it started.

Throughout the series you will see the same rhythm: read an explanation, **predict** what a cell will do, then run it and compare. Predicting before running matters. When your prediction is wrong, you have found exactly the thing you did not yet understand, which is the most useful thing that can happen.

## Your first program

Here is a complete Python program. It is one line long.

Before you run it, predict: what will appear underneath? Will the quotation marks be part of it?

```python type
print("Hello, world!")
```

```output
Hello, world!
```

The output is `Hello, world!` without the quotation marks. Here is how Python read that line, piece by piece:

- `print` is the name of a **function**: a named command that does one job. The job of `print` is to show something as output.
- The parentheses `( )` hold what you are handing to the function. Every time you use a function, the parentheses come right after its name.
- The quotation marks mark the start and end of a piece of **text**. Programmers call a piece of text a **string**, short for "a string of characters". The quotes are not part of the text; they only tell Python where it starts and stops. That is why they do not appear in the output.

Printing "Hello, world!" is by tradition the first program anyone writes in a new language. You have now done it.

## One line after another

A program with several lines runs them one at a time, from the top down. Each `print` shows its output on its own line.

Predict the output of this cell, in order, before you run it.

```python type
print("First, put on your socks.")
print("Then put on your shoes.")
print("Now go outside.")
```

```output
First, put on your socks.
Then put on your shoes.
Now go outside.
```

The lines appear in exactly the order they were written. This sounds too obvious to mention, but it is the first rule of reading any program: to know what a program does, read it from the top, one line at a time, and ask what each line does. Swap the first two lines and run the cell again: Python will happily tell you to put your shoes on before your socks. It follows the order you wrote, not the order that makes sense.

## Text and numbers are different things

Python treats text and numbers differently, and this difference is behind a large share of the mistakes beginners make. Compare the two lines below. One has quotation marks and one does not.

Predict: will both lines print the same thing?

```python type
print(2 + 3)
print("2 + 3")
```

```output
5
2 + 3
```

The first line prints `5`. Without quotation marks, `2 + 3` is an **expression**: something Python calculates. Python works out the value first, and then `print` shows the result. The second line prints `2 + 3` exactly as written, because the quotation marks turn it into text, and text is shown as it is, character for character. Python does not look inside a string to see whether it happens to contain arithmetic.

So quotation marks are not decoration. They change what the code means: with quotes, "show these characters"; without quotes, "work this out".

## Python as a calculator

Python can do all the arithmetic you would do on a calculator. The symbols are close to the ones you already know, with two differences: multiplication is `*` (an asterisk, not the letter x), and division is `/`.

```python type
print(7 + 5)
print(7 - 5)
print(7 * 5)
print(7 / 5)
print(7 ** 2)
```

```output
12
2
35
1.4
49
```

The last line uses `**`, which means "to the power of": `7 ** 2` is 7 squared, 49. You may also notice that `7 / 5` gives `1.4`, a number with a decimal point. Division in Python always produces a decimal number, even when the answer is whole: `10 / 2` gives `5.0`, not `5`. The next lesson explains why Python keeps these two kinds of number apart.

Python follows the order of operations you learned in school: powers first, then multiplication and division, then addition and subtraction. Parentheses force a different order.

Predict both results before you run this cell. Is the first one 20 or 14?

```python type
print(2 + 3 * 4)
print((2 + 3) * 4)
```

```output
14
20
```

The first is `14`, because the multiplication `3 * 4` happens before the addition. The second is `20`, because the parentheses make the addition happen first. When you are not sure what order Python will use, add parentheses. They cost nothing and make your intention obvious to anyone reading the code, including you a week from now.

## Printing several things at once

You can hand `print` several things at once by separating them with commas. It prints them on one line with a single space between each. This is the easiest way to label a result, so that the output says what the number means.

```python type
print("Minutes in a day:", 24 * 60)
print("Days in four weeks:", 4 * 7)
print(1, 2, 3, "go!")
```

```output
Minutes in a day: 1440
Days in four weeks: 28
1 2 3 go!
```

Notice that the calculations still happen: `24 * 60` has no quotation marks, so Python works it out and prints `1440`. The labels are in quotation marks, so they are printed exactly as written. One `print` can mix text and numbers freely this way. The last line prints `1 2 3 go!`: the spaces between the items were not in your code. `print` puts one space between each thing you give it.

## Comments: notes for humans

Any text after a `#` on a line is a **comment**, and Python ignores it completely. (The one exception: a `#` inside quotation marks is just part of the text, so `print("Item #1")` prints `Item #1`.) Comments are for people: they explain what code is for, or why it is written the way it is.

```python type
# This whole line is a comment, so Python skips it.
print("Comments are ignored.")  # A comment can also follow code on the same line.
# print("This line is commented out, so it does not run.")
```

```output
Comments are ignored.
```

Only one line of output appears. The last line shows a trick you will use constantly: putting `#` in front of a line of code switches it off without deleting it. Remove that `#` and run the cell again to switch the line back on.

## The notebook shows the last value

A notebook has one convenience that is worth knowing about now so that it does not confuse you later. If the last line of a cell is an expression on its own, without `print`, the notebook shows its value anyway.

Predict: this cell has three calculations and no `print`. How many results will you see?

```python type
2 + 2
10 * 10
3 * 3 * 3
```

```output
27
```

Only `27` appears: the value of the last line. The first two lines are calculated and then thrown away, because nothing asked for them to be shown. This is a convenience of notebooks. In a Python program saved as a file and run on its own, nothing appears unless you `print` it. So whenever you want to see a result, `print` it; that always works.

## When things go wrong: reading an error

Sooner or later a cell will fail, and Python will show an **error message** instead of the output you wanted. This is normal. Professional programmers see error messages all day. An error message is not a punishment; it is Python telling you as precisely as it can what it did not understand. Learning to read one is one of the most valuable skills in this whole series.

This cell has a mistake in it on purpose. Run it and look at the message.

```python error NameError
print("This line runs.")
prnt("This line has a typo.")
print("This line never runs.")
```

The red line of the message tells you three things. `Line 2` is where in your code the problem happened. `NameError` is the kind of error. The rest says what went wrong: `name 'prnt' is not defined`. Python does not know any command called `prnt`, and it even suggests what you probably meant: `Did you mean: 'print'?`.

Python is exact about spelling, and that includes capital letters: `Print` is as unknown to it as `prnt`. When a name is almost right, it is still wrong. Programmers describe this by saying Python is **case-sensitive**.

Below the red line is **Show full traceback**. A **traceback** is the full report Python writes when something fails, tracing the route it took through your code to the error. In a one-line mistake like this one it adds nothing, so for now the red line is all you need. In later lessons, when code is spread across several pieces, the traceback shows which piece called which.

Look at what did and did not run. The first line printed its text, because Python runs lines in order and had no problem with it. When Python reached the typo it stopped, so the third line never ran at all. An error stops the program at the line where it happens. Now fix the typo in the cell above and run it again: all three lines print.

Some mistakes are caught before anything runs. This cell is missing its closing quotation mark.

```python error SyntaxError
print("Everything is fine so far.")
print("Where does this text end?)
```

This time even the first line printed nothing. The error is a `SyntaxError`. **Syntax** means the grammar of a language: the rules about which symbols go where. Before Python runs any line of a cell, it reads the whole cell to check the grammar. If the grammar is broken anywhere, it refuses to run any of it and tells you where it got confused. Here the message says the string is unterminated: it starts with a quotation mark that never ends. Add the missing quotation mark and run the cell again, and both lines print.

That gives you two families of error to tell apart:

- A **syntax error** means Python could not understand the code, so nothing in the cell ran. Look for a missing quotation mark, parenthesis or bracket near the line it points to.
- Other errors, like `NameError`, happen while the code is running. Everything before that line ran, and nothing after it did.

When a cell fails, do not guess and start changing things at random. Read the last line of the message, go to the line it points to, and fix exactly what it describes.

::: challenge Your first program [easy]
Write a program that prints exactly these two lines:

```text
Hello, Python!
I am learning to code.
```

The check compares your output character by character, so capital letters, commas, full stops and spaces all count.

```python starter
# Write two print lines below this comment.
```

```python solution
print("Hello, Python!")
print("I am learning to code.")
```

```python test
_lines = _stdout.splitlines()
assert len(_lines) == 2, f"Expected 2 lines of output but got {len(_lines)}. Use one print for each line."
assert _lines[0] == "Hello, Python!", f"The first line should be exactly 'Hello, Python!' but you printed {_lines[0]!r}. The quotes show exactly where your line starts and ends, so you can spot extra spaces."
assert _lines[1] == "I am learning to code.", f"The second line should be exactly 'I am learning to code.' but you printed {_lines[1]!r}. The quotes show exactly where your line starts and ends, so you can spot extra spaces."
"SUCCESS: Both lines are exactly right."
```

Hint: Each line of output needs its own `print("...")`. Put the text inside quotation marks, and copy it exactly, including the comma, the exclamation mark and the full stop.
:::

::: challenge Fix the broken cell [easy]
This cell is supposed to print three lines:

```text
Welcome
to the notebook.
Let's begin!
```

But it has three mistakes in it, one on each line. Run it, read the error message, fix the mistake on the line it names, and repeat until the cell prints the three lines above.

The first message may not be about line 1. Python checks the grammar of the whole cell before running anything, so it reports grammar mistakes (syntax errors) first, wherever they are. Mistakes like a misspelt name only show up once the code actually runs.

```python starter
Print("Welcome")
print("to the notebook.)
print "Let's begin!"
```

```python solution
print("Welcome")
print("to the notebook.")
print("Let's begin!")
```

```python test
_lines = _stdout.splitlines()
assert len(_lines) == 3, f"Expected 3 lines of output but got {len(_lines)}."
assert _lines == ["Welcome", "to the notebook.", "Let's begin!"], f"The output should be the three lines shown above. You printed: {_lines}"
"SUCCESS: All three mistakes fixed. Reading the error message first is exactly the right habit."
```

Hint: Every string needs a closing quotation mark, every `print` needs parentheses around what it prints, and capital letters matter. Fix only the line the message names, then run again.
:::

::: challenge Let Python do the arithmetic [medium]
Print these two lines:

```text
Seconds in a week: 604800
Hours in a year: 8760
```

But do not type either number yourself. There are 60 seconds in a minute, 60 minutes in an hour, 24 hours in a day, 7 days in a week and 365 days in a year. Write each calculation and let Python work it out. The check reads your code as well as your output, so typing the answers in will not pass.

```python starter
# Replace each 0 with a calculation.
print("Seconds in a week:", 0)
print("Hours in a year:", 0)
```

```python solution
print("Seconds in a week:", 60 * 60 * 24 * 7)
print("Hours in a year:", 24 * 365)
```

```python test
assert "604800" not in _source and "8760" not in _source, "Your code contains one of the answers. Write the calculations and let Python work out the numbers."
_lines = _stdout.splitlines()
assert len(_lines) == 2, f"Expected 2 lines of output but got {len(_lines)}. Use one print for each line."
assert _lines[0] == "Seconds in a week: 604800", f"The first line should be 'Seconds in a week: 604800' but you printed {_lines[0]!r}."
assert _lines[1] == "Hours in a year: 8760", f"The second line should be 'Hours in a year: 8760' but you printed {_lines[1]!r}."
"SUCCESS: Python did the arithmetic for you."
```

Hint: Use a comma to give `print` two things: the label in quotation marks, and a calculation without quotation marks. Multiplication is `*`, and one calculation can multiply as many numbers as you need.
:::

## What you learned

- A program is a list of instructions that Python runs one at a time, from the top down.
- `print(...)` shows output. Text goes inside quotation marks and is shown exactly as written; code without quotation marks is worked out first.
- Python does arithmetic with `+`, `-`, `*`, `/` and `**`, in the usual order of operations. Parentheses change the order.
- `print` can show several things at once, separated by commas, which is how you label a result.
- `#` starts a comment, which Python ignores.
- Python is case-sensitive: `print` works, `Print` does not.
- When a cell fails, the red line of the message names the line, the kind of error and what went wrong. A syntax error stops the whole cell before anything runs; other errors stop the program at the line where they happen.

In the next lesson you will give values names, so that a program can remember a result and use it again, and you will see why Python treats `5` and `5.0` as different kinds of number.
