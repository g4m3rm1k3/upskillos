# Lesson 1 — A Line That Predicts

## Concept, in plain English

You have some points. You want a straight line through them so that, given a new
`x`, you can guess `y` before you actually know it. That's it — that's linear
regression. Everything else in this lesson is "how do we find the *best* line,
and how do we even measure 'best'?"

A line is two numbers: how steep it is (`slope`), and where it crosses the
y-axis (`intercept`). Your whole model *is* those two numbers.

## The math

Prediction for one point:

```
predicted_y = slope * x + intercept
```

To measure how wrong a line is, we don't just add up the errors (positive and
negative errors would cancel out). We square each error first, then average:

```
error_for_one_point = (actual_y - predicted_y) ** 2
mean_squared_error   = average of error_for_one_point across all points
```

Worked example, three points: `(1, 3), (2, 5), (3, 7)` — notice `y = 2x + 1`
fits perfectly, so we already know the answer to check our work against.
Try `slope = 1, intercept = 1`:
- point (1,3): predicted = 1*1+1 = 2, error = (3-2)² = 1
- point (2,5): predicted = 1*2+1 = 3, error = (5-3)² = 4
- point (3,7): predicted = 1*3+1 = 4, error = (7-4)² = 9
- mean squared error = (1+4+9)/3 = 4.666...

Now try `slope = 2, intercept = 1` (the true fit) and you should get 0. Do that
by hand before you type anything — it's the check you'll use in a minute.

## Type this — Cell 1

New Colab notebook. First cell, just your data:

```python
x_values = [1, 2, 3, 4, 5]
y_values = [3, 5, 7, 9, 11]
```

Run it. Nothing happens visibly — that's fine, you're just holding data.

## What just happened

You made two parallel lists. `x_values[i]` and `y_values[i]` are one point
together. This is the entire "dataset" for this lesson — no file loading, no
library, just numbers you can trace by hand.

## Type this — Cell 2

A function that predicts one `y` from one `x`, given a candidate line:

```python
def predict(x, slope, intercept):
    return slope * x + intercept
```

Run it, then in a new cell, sanity-check it against your hand calculation above:

```python
predict(2, slope=1, intercept=1)
```

You should get `3`, matching your by-hand work.

## Type this — Cell 3

Now the error measurement. Build it in two steps — first the error of one
point, then the average over all points:

```python
def squared_error(actual_y, predicted_y):
    return (actual_y - predicted_y) ** 2
```

```python
def mean_squared_error(x_values, y_values, slope, intercept):
    total_error = 0
    for x, actual_y in zip(x_values, y_values):
        predicted_y = predict(x, slope, intercept)
        total_error = total_error + squared_error(actual_y, predicted_y)
    return total_error / len(x_values)
```

## What just happened

`mean_squared_error` loops over every point, predicts it, compares to the real
answer, and averages the squared differences. This one function is *the*
question every regression algorithm is trying to answer: "for this candidate
line, how bad is it?"

## Type this — Cell 4

Check it against your hand-worked example:

```python
mean_squared_error(x_values, y_values, slope=1, intercept=1)
```

## Checkpoint exercise

Before moving on, do this yourself, no new concepts required:

1. Call `mean_squared_error` with `slope=2, intercept=1` and confirm you get
   `0.0` — this is the true underlying line, so error should vanish.
2. Try two or three other `(slope, intercept)` pairs you make up. Notice you're
   already doing, by trial and error, what Lesson 2 will do systematically:
   searching for the pair that minimizes this function.

Once you've done that by hand-guessing a few times, you're ready for Lesson 2:
instead of guessing, we'll use the *derivative* of `mean_squared_error` to walk
directly downhill toward the best `slope` and `intercept`. Say "next lesson"
when you're ready.
