# Lesson 2 — Walking Downhill: Gradient Descent

## Concept, in plain English

In Lesson 1's checkpoint you guessed a few `(slope, intercept)` pairs and
watched `mean_squared_error` go up or down. Gradient descent replaces guessing
with a rule: at your current `slope` and `intercept`, figure out which
direction makes the error go *down*, and take a small step that way. Repeat.

That's the whole algorithm. The only new idea is "which direction makes it go
down" — that's what a derivative tells you.

## The math

A derivative of a function, at a point, is the slope of that function at that
point — positive means "increasing here," negative means "decreasing here." If
you're standing on the error function and the derivative with respect to
`slope` is positive, increasing `slope` makes error worse, so you should
*decrease* `slope`. That's why gradient descent always moves *opposite* the
derivative's sign.

Our error function, written out for one point:

```
error = (actual_y - (slope * x + intercept)) ** 2
```

We need the derivative of `error` with respect to `slope`, and separately with
respect to `intercept`. Using the chain rule (outer function is "square it,"
inner function is the stuff inside the parentheses):

```
d(error)/d(slope)     = 2 * (actual_y - predicted_y) * (-x)
d(error)/d(intercept)  = 2 * (actual_y - predicted_y) * (-1)
```

Worked example, one point `(x=2, actual_y=5)`, current guess `slope=1,
intercept=1`:
- `predicted_y = 1*2 + 1 = 3`
- `d(error)/d(slope) = 2 * (5-3) * (-2) = -8`
- `d(error)/d(intercept) = 2 * (5-3) * (-1) = -4`

Both derivatives are negative, meaning: increasing `slope` and `intercept`
*decreases* error here. That matches intuition — the true line is `y=2x+1`,
and our guess of `slope=1` is too low, so nudging it up should help.

To update, we move a small step *opposite* the derivative:

```
new_slope     = slope     - learning_rate * average_d_error_d_slope
new_intercept = intercept - learning_rate * average_d_error_d_intercept
```

`learning_rate` is just "how big a step" — too big and you overshoot, too
small and it takes forever. We'll use `0.01` to start.

## Type this — Cell 1 (new cell, same notebook as Lesson 1)

The two derivative functions, one point at a time — do not average yet, just
get a single point working first:

```python
def slope_derivative(x, actual_y, slope, intercept):
    predicted_y = predict(x, slope, intercept)
    return 2 * (actual_y - predicted_y) * (-x)
```

```python
def intercept_derivative(x, actual_y, slope, intercept):
    predicted_y = predict(x, slope, intercept)
    return 2 * (actual_y - predicted_y) * (-1)
```

## Type this — Cell 2

Check both against the hand-worked example above:

```python
slope_derivative(x=2, actual_y=5, slope=1, intercept=1)
```

```python
intercept_derivative(x=2, actual_y=5, slope=1, intercept=1)
```

You should see `-8` and `-4`, matching your paper work.

## What just happened

You now have two functions that each answer "if I nudge this one number, does
error go up or down, and how fast." That's all a derivative is — you've been
treating it as scary notation, but it's just this small computation.

## Type this — Cell 3

Average the derivatives across *all* points (not just one), same pattern as
Lesson 1's `mean_squared_error`:

```python
def average_slope_derivative(x_values, y_values, slope, intercept):
    total = 0
    for x, actual_y in zip(x_values, y_values):
        total = total + slope_derivative(x, actual_y, slope, intercept)
    return total / len(x_values)
```

```python
def average_intercept_derivative(x_values, y_values, slope, intercept):
    total = 0
    for x, actual_y in zip(x_values, y_values):
        total = total + intercept_derivative(x, actual_y, slope, intercept)
    return total / len(x_values)
```

## Type this — Cell 4

The actual gradient descent loop — the step-and-repeat you've been building
toward:

```python
def gradient_descent(x_values, y_values, starting_slope, starting_intercept, learning_rate, num_steps):
    slope = starting_slope
    intercept = starting_intercept
    for step in range(num_steps):
        slope_grad = average_slope_derivative(x_values, y_values, slope, intercept)
        intercept_grad = average_intercept_derivative(x_values, y_values, slope, intercept)
        slope = slope - learning_rate * slope_grad
        intercept = intercept - learning_rate * intercept_grad
    return slope, intercept
```

## Type this — Cell 5

Run it on Lesson 1's data and watch it find `slope≈2, intercept≈1` on its own:

```python
gradient_descent(x_values, y_values, starting_slope=0, starting_intercept=0, learning_rate=0.01, num_steps=1000)
```

## What just happened

No guessing this time — the algorithm walked itself, step by step, from a
terrible starting guess (`0, 0`) to essentially the true line, purely by
following the derivative downhill on `mean_squared_error`. This loop —
compute gradient, step opposite it, repeat — is the same loop every neural
network in Phase B and Phase C trains with. You just haven't seen a network
yet.

## Checkpoint exercise

1. Try `learning_rate=0.5` instead of `0.01`. Watch what happens (it may
   diverge — numbers explode instead of converging). That's "too big a step,"
   concretely, not just in the abstract.
2. Try `num_steps=10` instead of `1000` with the original `learning_rate`.
   Notice it hasn't converged yet — print the result and compare to the
   1000-step answer.
3. Add a `print(slope, intercept)` inside the loop, every 100 steps, so you
   can *watch* it walk downhill instead of only seeing the final answer.

Next lesson moves from one input (`x`) to several inputs at once — that's
where the dot product from Lesson 1 becomes a real matrix multiplication, and
where NumPy earns its place. Say "next lesson" when ready.
