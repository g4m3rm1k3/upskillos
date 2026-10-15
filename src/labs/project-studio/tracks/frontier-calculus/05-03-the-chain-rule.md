---
title: 5.3 — The Chain Rule
runtime: python
support: tests/conftest.py
---

A neural network is functions applied one after another: the input goes through the first layer, whose output goes through the second, and so on, until a last function turns the result into the loss. Lesson 5.2's rules give the slope of each piece on its own. This lesson finds the rule for the slope of the whole chain, the **chain rule**, and it's simple: multiply the pieces' slopes together, each one taken at the right place.

You measure it first, on one function inside another. Then you build a chain of pieces, run it forwards to get every value along the way, and work out its slope by going backwards from the end, multiplying as you go. That backwards trip is **backpropagation**, the algorithm that trains every network in this series, in its smallest form. Chapter 12 builds the full version.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_chain.py**:

```python file=tests/test_chain.py provided
# Tests for frontier.chain (lesson 5.3): the slope of functions applied one after another.
import math

TIMES_3 = (lambda x: 3 * x, lambda x: 3.0)
PLUS_1 = (lambda x: x + 1, lambda x: 1.0)
SQUARE = (lambda x: x * x, lambda x: 2 * x)
EXP = (math.exp, math.exp)


def test_forward_lists_every_value():
    from frontier.chain import forward
    assert forward([TIMES_3, PLUS_1, SQUARE], 1.0) == [1.0, 3.0, 4.0, 16.0]


def test_forward_with_no_pieces_is_just_x():
    from frontier.chain import forward
    assert forward([], 2.5) == [2.5]


def test_backward_multiplies_the_slopes():
    from frontier.chain import chain_slope
    assert chain_slope([TIMES_3, PLUS_1, SQUARE], 1.0) == 24.0


def test_backward_takes_each_slope_at_its_own_input():
    from frontier.chain import chain_slope
    # Plus 1, square, times 3, from x = 2: the square's slope is taken at its input, 3, not at x.
    assert chain_slope([PLUS_1, SQUARE, TIMES_3], 2.0) == 18.0


def test_backward_agrees_with_nudging():
    from frontier.chain import chain_slope, forward
    from frontier.slopes import central_slope
    pieces = [SQUARE, TIMES_3, PLUS_1, EXP, SQUARE]
    for x in [-0.5, 0.2, 0.4]:
        measured = central_slope(lambda v: forward(pieces, v)[-1], x)
        assert math.isclose(chain_slope(pieces, x), measured, rel_tol=1e-6)
```

A **piece** is a pair: a function, and the function that gives its slope. `TIMES_3` is "multiply by 3", whose slope is 3 everywhere; `SQUARE` is "square it", whose slope at *u* is 2*u* (lesson 5.2's power rule); `EXP` is `math.exp`, which is its own slope.

- **`forward`** runs a number through a list of pieces in order and returns every value along the way, starting with the number itself: 1, then 3 × 1 = 3, then 3 + 1 = 4, then 4² = 16.
- **`chain_slope`**, your Your turn, gives the slope of the whole chain at a point. The tests check it on two short chains, then against `central_slope` on a five-piece one.

```check
file tests/test_chain.py -- Click "Create provided tests/test_chain.py" above.
```

## A function inside a function

Take (3*x* + 1)². It's one function inside another: the **inside** is 3*x* + 1, and the **outside** squares whatever the inside gives. Call the inside's value *u*, so the outside is *u*². At *x* = 1, the inside gives *u* = 4, and the outside gives 16.

This experiment measures three slopes: the whole thing's at *x* = 1, the inside's at *x* = 1, and the outside's at *u* = 4, where the inside put it. Create `experiments/inside.py`:

```python file=experiments/inside.py
"""The slope of (3x + 1)², of the inside 3x + 1, and of the outside u², measured."""
from frontier.slopes import central_slope

whole = central_slope(lambda x: (3 * x + 1) ** 2, 1.0)
inside = central_slope(lambda x: 3 * x + 1, 1.0)
outside = central_slope(lambda u: u ** 2, 4.0)
print(f"whole {whole:.3f}, inside {inside:.3f}, outside at 4 {outside:.3f}")
```

Each line measures one function's slope with `central_slope`. You can work out the first already: multiplied out, (3*x* + 1)² is 9*x*² + 6*x* + 1.

```predict
question: By lesson 5.2's rules, the slope of 9x² + 6x + 1 is 18x + 6. What does the experiment print for the whole function's slope at x = 1?
choice: 6.000
choice: 18.000
choice: 24.000
answer: 24.000
explain: 18 × 1 + 6 = 24. 6 is the slope at x = 0, and 18 forgets the + 6.
verify: script whole_slope.py
```

```powershell
.venv\Scripts\python experiments/inside.py
```

```text
whole 24.000, inside 3.000, outside at 4 8.000
```

Look at the three numbers: 24 = 3 × 8. That's not a coincidence. Nudge *x* by a tiny *h*. The inside's slope is 3, so *u* moves by 3*h*. The outside's slope where *u* is, at 4, is 8, so the result moves by 8 × 3*h* = 24*h*. The whole slope is the inside's slope times the outside's slope:

the slope of f(g(*x*)) = f′(g(*x*)) × g′(*x*)

That's the **chain rule**. The one thing to get right is *where* each slope is taken: the outside's slope at the value the inside gave it (*u* = 4), not at *x* (which would give 2, and a wrong answer of 6). With it, you never need to multiply anything out.

```check
run ".venv/Scripts/python experiments/inside.py" stdout="whole 24.000, inside 3.000, outside at 4 8.000" label="the whole slope is the inside's times the outside's" -- Measure the outside, lambda u: u ** 2, at 4.0, where the inside puts it.
```

## A chain of pieces

A network has many pieces, not two, so write the chain down as data: a list of pieces, each a pair of (function, its slope). `Piece` is a type alias for `tuple[Function, Function]`, with `Function` from your `slopes.py`.

Running the chain forwards is a loop: start with `x`, and give each piece the value the previous one produced. `values[-1]` is the last value so far. Keep every value, not only the last, because the backward trip needs each piece's input: the chain rule takes every slope at the value that went into that piece. `for f, _ in pieces` unpacks each pair and ignores its slope function. Create `src/frontier/chain.py`:

```python file=src/frontier/chain.py
"""The chain rule: the slope of functions applied one after another."""
from frontier.slopes import Function

Piece = tuple[Function, Function]


def forward(pieces: list[Piece], x: float) -> list[float]:
    """x, then each piece's output in turn: every value along the chain."""
    values = [x]
    for f, _ in pieces:
        values.append(f(values[-1]))
    return values
```

For times 3, plus 1, square from *x* = 1, the values are `[1.0, 3.0, 4.0, 16.0]`: the input, then each piece's output. Piece `i`'s input is `values[i]` and its output `values[i + 1]`, so there's always one more value than pieces, and with no pieces at all `forward` returns `[x]`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_chain.py -k forward" label="forward lists every value along the chain" -- values = [x], then for each piece, values.append(f(values[-1])).
run ".venv/Scripts/python -m mypy --strict src/frontier/chain.py" stdout="Success" label="mypy --strict passes" -- Piece = tuple[Function, Function], with from frontier.slopes import Function.
```

## Backwards through the chain

With three pieces the chain rule multiplies three slopes, each at its own input: times 3's slope at 1, plus 1's at 3, square's at 4. Multiplication doesn't care about order, but there's a reason to go **backwards**, from the last piece to the first.

Start at the end, where the output's slope with respect to itself is 1. Step back over the square: its slope at its input, 4, is 8, so the output changes 8 times as fast as the square's input, the value 4. Step back over plus 1 (slope 1): the output changes 8 times as fast as the value 3. Step back over times 3 (slope 3): 24 times as fast as *x*. Each step multiplies the running slope by one more piece's slope, and gives the output's slope with respect to every value along the way, not only *x*. In a network, those values include every parameter, and that's why training goes backwards: one trip from the loss gives the slope for all of them. Lesson 2.5 found the same reversed order for gradients.

This experiment does the backward trip by hand, one line per piece, so you can see each running slope. Create `experiments/backward_by_hand.py`:

```python file=experiments/backward_by_hand.py
"""Times 3, plus 1, square, from x = 1: the values forwards, then the slopes backwards, by hand."""
from frontier.chain import Piece, forward

pieces: list[Piece] = [
    (lambda x: 3 * x, lambda x: 3.0),
    (lambda x: x + 1, lambda x: 1.0),
    (lambda x: x * x, lambda x: 2 * x),
]
values = forward(pieces, 1.0)
print("values forwards:", values)
at_output = 1.0
at_square_input = at_output * pieces[2][1](values[2])
at_plus_input = at_square_input * pieces[1][1](values[1])
at_x = at_plus_input * pieces[0][1](values[0])
print("slopes backwards:", [at_x, at_plus_input, at_square_input, at_output])
```

`pieces[2][1]` is piece 2's slope function (item 1 of the pair), and `values[2]`, the value 4, is that piece's input. Each line takes the running slope and multiplies it by one more piece's slope at its own input.

```predict
question: The second number printed after "slopes backwards" is the output's slope with respect to the value 3, plus 1's input. What is it?
choice: 3.0
choice: 8.0
choice: 24.0
answer: 8.0
explain: From the output back past the square (slope 8 at its input 4) and past plus 1 (slope 1): 1 × 8 × 1 = 8. Nudging the 3 by h nudges the 4 by h, and the 16 by 8h. Times 3's slope only comes in at the last step, giving 24 for x.
verify: script slope_at_three.py
```

```powershell
.venv\Scripts\python experiments/backward_by_hand.py
```

```text
values forwards: [1.0, 3.0, 4.0, 16.0]
slopes backwards: [24.0, 8.0, 8.0, 1.0]
```

The backwards list lines up with the values: the output changes 24 times as fast as *x* (the 1), 8 times as fast as the 3, 8 times as fast as the 4, and once as fast as itself. The first number is the chain's slope, 24, the same as lesson 5.2's rules and the measurement gave for (3*x* + 1)².

```check
run ".venv/Scripts/python experiments/backward_by_hand.py" stdout="slopes backwards: [24.0, 8.0, 8.0, 1.0]" label="the slopes, worked backwards by hand" -- Start at 1.0 and multiply by each piece's slope at its input, values[i], from piece 2 back to piece 0.
```

## Your turn: the chain's slope, by a loop

The hand-written lines in the experiment only work for exactly three pieces. A loop works for any number.

**Build, on your own:** `chain_slope(pieces, x)` at the end of `src/frontier/chain.py`, taking a `list[Piece]` and a `float` and returning the whole chain's slope at `x`. Run the chain forwards with `forward` to get every value. Then start a running slope at `1.0` and go through the pieces from the **last** to the first, multiplying it by each piece's slope at that piece's input, `values[i]`.

`reversed(...)` gives the items of a sequence last first, without changing it: `reversed(range(3))` gives 2, 1, 0, the positions of three pieces from the last. And `slope *= ...` is short for `slope = slope * ...`.

```hints
nudge: values = forward(pieces, x). Then loop i over reversed(range(len(pieces))), and multiply a running slope by piece i's slope function at values[i].
concept: Piece i's slope function is pieces[i][1] (or unpack it: _, df = pieces[i]), and its input is values[i], not values[i + 1], which is its output. Start the running slope at 1.0 and return it after the loop.
answer: At the end of `src/frontier/chain.py`:
~~~python
def chain_slope(pieces: list[Piece], x: float) -> float:
    """The whole chain's slope at x: each piece's slope at its own input, multiplied, last piece first."""
    values = forward(pieces, x)
    slope = 1.0
    for i in reversed(range(len(pieces))):
        _, df = pieces[i]
        slope *= df(values[i])
    return slope
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_chain.py -k backward" label="chain_slope multiplies each piece's slope at its own input" -- Run forward(pieces, x), then multiply 1.0 by pieces[i][1](values[i]) for i from the last piece to the first.
run ".venv/Scripts/python -m pytest -q tests/test_chain.py tests/test_rules.py tests/test_slopes.py" label="every slope and chain test passes" -- Leave forward as it was.
run ".venv/Scripts/python -m mypy --strict src/frontier/chain.py" stdout="Success" label="mypy --strict still passes" -- chain_slope takes a list[Piece] and a float, and returns a float.
```

## A long chain, checked, and onto GitHub

Last, a five-piece chain: square, times 3, plus 1, *e* to the power, square again. That's (*e*^(3*x*² + 1))², which would take some work to differentiate by hand. Here it's five easy slopes multiplied. This experiment compares your `chain_slope` with `central_slope` nudging the whole chain, at *x* = 0.4. Create `experiments/check_chain.py`:

```python file=experiments/check_chain.py
"""A five-piece chain's slope by the chain rule, against nudging the whole chain."""
import math

from frontier.chain import Piece, chain_slope, forward
from frontier.slopes import central_slope

square: Piece = (lambda x: x * x, lambda x: 2 * x)
pieces: list[Piece] = [
    square,
    (lambda x: 3 * x, lambda x: 3.0),
    (lambda x: x + 1, lambda x: 1.0),
    (math.exp, math.exp),
    square,
]
print(f"chain rule {chain_slope(pieces, 0.4):.4f}")
print(f"nudged     {central_slope(lambda v: forward(pieces, v)[-1], 0.4):.4f}")
```

The same `square` piece is used twice, at the start and the end, which is fine: each use gets its own input from `forward`.

```powershell
.venv\Scripts\python experiments/check_chain.py
```

```text
chain rule 92.6303
nudged     92.6303
```

They agree to the four decimals shown (to about one part in a billion, in fact: `central_slope` is the one that's slightly off). The chain rule got there with one trip forwards and one backwards, and no nudging. For one input that's about the same work as nudging, which also runs the chain twice. The difference comes with many inputs. Nudging needs two runs **per input**, while one backward trip gives the slope for every value at once. Next lesson's functions have several inputs, and that's where the gap opens.

```check
run ".venv/Scripts/python experiments/check_chain.py" stdout="chain rule 92.6303" label="the chain rule agrees with nudging on five pieces" -- pieces is square, times 3, plus 1, (math.exp, math.exp), square; print chain_slope(pieces, 0.4) with :.4f.
```

Commit and push:

```powershell
git add .
git commit -m "The chain rule: slopes multiplied backwards through a chain"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  chain.py               Piece, forward (every value along a chain), chain_slope (backwards, multiplying)
experiments/
  inside.py              (3x + 1)²: the whole slope is the inside's times the outside's
  backward_by_hand.py    the values forwards and the slopes backwards, one line per piece
  check_chain.py         a five-piece chain, chain rule against nudging
tests/
  test_chain.py          -k forward, backward
```

Next lesson: functions of several numbers at once, their slopes along each one, and the vector those slopes make: the gradient.
