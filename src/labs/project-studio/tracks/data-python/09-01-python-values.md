---
title: 9.1 — Give SQL an Application Caller
track: Database Engineering — Application Code from the Beginning
trackOrder: 46.09
runtime: none
---

You can query and design databases without knowing another language. Now build the small Python caller inside this course, starting from zero. SQL still owns the relational work.

## Prepare an isolated Python environment

Install Python 3.13 from python.org if needed. Check `python --version`; on a system that only supplies python3, use python3 for the first setup command. Run `python -m venv .venv` in your project. A virtual environment holds this project's dependencies separately from other applications. Activate it with `source .venv/bin/activate` in zsh/bash, or `.venv\Scripts\Activate.ps1` in PowerShell. If PowerShell activation is blocked by policy, invoke `.venv\Scripts\python` directly instead of changing the policy.

The lesson commands say python after activation. Check its version again. The -m option runs a Python module as a program; venv is the built-in environment creator. Install the driver with `python -m pip install "psycopg[binary]==3.2.13"`. A driver transports queries and results between Python and PostgreSQL. The binary extra supplies the native driver library; the pinned version is the one used by the author tests.

```check
run "python -c \"import psycopg; print(psycopg.__version__)\"" exit=0 label="The tested database driver imports" stdout="3.2.13" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Values and names

Unlike SQL's result alias, Python's `=` binds a name to a value for later expressions. Lines run top to bottom. print displays a value. There is no required semicolon. Create bridge.py, run `python bridge.py`, change count to 4, predict the result and restore 3.

```python file=bridge.py
minutes = 30
count = 3
total = minutes * count
print(total)
```

```check
run "python bridge.py" exit=0 label="Calculate a batch" stdout="90" -- Run the command yourself and compare the actual result with the lesson trace.
```

## A named operation

def defines a function. The names inside parentheses are parameters filled by a call. The colon opens its indented body; indentation is meaningful in Python. return supplies the result to the caller. Defining the function alone does not run its body. Calling batch_minutes(30,3) binds minutes to 30 and count to 3 for that call.

```python file=bridge.py
def batch_minutes(minutes, count):
    return minutes * count

print(batch_minutes(30, 3))
```

```check
run "python bridge.py" exit=0 label="Call a reusable function" stdout="90" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Reject the impossible

```predict
question: Does defining a function immediately execute every line inside it?
choice: No
choice: Yes
answer: No
explain: Its body runs when it is called.
```

if runs its indented block when a condition is true. `or` accepts either condition. `<` compares numbers. raise signals an error; ValueError names an unsuitable value. The quoted message is a string. A function must not silently turn negative work into valid estimates. Call with -1, observe the error, then restore the positive example.

```python file=bridge.py
def batch_minutes(minutes, count):
    if minutes < 0 or count < 0:
        raise ValueError("Minutes and count must be nonnegative")
    return minutes * count

print(batch_minutes(30, 3))
```



## Your turn: convert a known duration

Create duration.py defining hours_to_minutes(hours). Reject a negative number with ValueError and return hours multiplied by 60 otherwise. No database connection is needed. Test 0, 1.5 and -1 yourself.


```hints
nudge: A conversion scales the quantity, not its name.
concept: Guard invalid input before returning a result.
shape: Use if with a negative comparison, then multiply by 60.
```

```check
run "python -c \"from duration import hours_to_minutes; assert hours_to_minutes(0)==0; assert hours_to_minutes(1.5)==90; print('ok')\"" exit=0 label="Convert zero and fractional hours" stdout="ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
run "python -c \"from duration import hours_to_minutes; hours_to_minutes(-1)\"" exit=1 label="Reject a negative duration" stderr="ValueError" -- Run the command yourself and compare the actual result with the lesson trace.
```
