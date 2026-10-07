# Vectors

Machine learning turns everything into lists of numbers. A house becomes (floor area, bedrooms, age). A patient becomes (age, blood pressure, cholesterol). A word becomes a list of 300 numbers learned from text. A list of numbers like this is a **vector**, and the moment data is written as vectors, geometry becomes a tool for understanding it: similar houses are **close together**, a model's prediction is a **weighted sum**, and two documents on the same topic **point the same way**.

This lesson builds the ideas about vectors that the rest of the series depends on: adding and scaling them, measuring their length and the distance between them, and the dot product, which measures how much two vectors point in the same direction. Every idea is shown in two dimensions, where you can draw it, and then computed with NumPy, where the same code works in any number of dimensions.

## A vector is a list of numbers, and an arrow

In NumPy, a vector is simply a 1D array. Each number is a **component**. A vector with two components can be drawn as an arrow from the origin, the point (0, 0), to the point given by its components:

```python type
import numpy as np
import matplotlib.pyplot as plt

a = np.array([3, 1])
b = np.array([1, 2])

fig, ax = plt.subplots(figsize=(4, 4))
for vec, colour, name in [(a, "tab:blue", "a"), (b, "tab:orange", "b")]:
    ax.annotate("", xy=vec, xytext=(0, 0), arrowprops=dict(arrowstyle="->", color=colour, lw=2))
    ax.text(vec[0] + 0.1, vec[1] + 0.1, name, color=colour, fontsize=12)
ax.set_xlim(-0.5, 4.5)
ax.set_ylim(-0.5, 4.5)
ax.set_aspect("equal")
ax.grid(True)
plt.show()
```

`ax.annotate("", xy=end, xytext=start, arrowprops=...)` draws an arrow from `start` to `end`. `ax.set_aspect("equal")` makes one unit the same length on both axes, so angles and lengths in the picture are true.

It helps to hold two pictures of the same vector at once: an **arrow**, which has a direction and a length, and a **point**, the place where the arrow ends. In data, the point picture is usually the natural one: each example is a point in a space with one axis per feature. The arrow picture is what makes the operations below make sense.

## Adding and scaling

Vectors of the same length are added component by component, which is exactly NumPy's element-by-element `+`. Geometrically, `a + b` is what you get by placing `b`'s arrow at the tip of `a`'s arrow: walk along `a`, then along `b`.

Multiplying a vector by a number, called a **scalar** in this context, multiplies every component. It stretches or shrinks the arrow without changing its direction; a negative number also flips it round.

```python type
import numpy as np
import matplotlib.pyplot as plt

a = np.array([3, 1])
b = np.array([1, 2])
print("a + b =", a + b)
print("2a =", 2 * a, "  -0.5b =", -0.5 * b)

fig, ax = plt.subplots(figsize=(4.5, 4.5))
def arrow(start, end, colour, name):
    ax.annotate("", xy=end, xytext=start, arrowprops=dict(arrowstyle="->", color=colour, lw=2))
    middle = (np.array(start) + np.array(end)) / 2
    ax.text(middle[0] + 0.1, middle[1] - 0.3, name, color=colour)
arrow((0, 0), a, "tab:blue", "a")
arrow(a, a + b, "tab:orange", "b")
arrow((0, 0), a + b, "tab:green", "a + b")
ax.set_xlim(-0.5, 5)
ax.set_ylim(-0.5, 4.5)
ax.set_aspect("equal")
ax.grid(True)
plt.show()
```

```output
a + b = [4 3]
2a = [6 2]   -0.5b = [-0.5 -1. ]
```

The green arrow `a + b` goes straight to the point you reach by following `a` and then `b`. Subtraction is the reverse: `b - a` is the arrow that goes **from the tip of `a` to the tip of `b`**. Keep that in mind; it is how distances are measured below.

## Length

The length of a vector, also called its **norm** or **magnitude** and written with double bars as ‖a‖, comes from Pythagoras' theorem. For a 2D vector the components are the two short sides of a right-angled triangle, and the length is the long side:

\[
\|a\| = \sqrt{a_1^2 + a_2^2}
\]

The same formula works in any number of dimensions: square every component, add them up, take the square root.

```python type
import numpy as np

a = np.array([3, 4])
print(np.sqrt((a ** 2).sum()))
print(np.linalg.norm(a))

house = np.array([120, 3, 25, 2])
print(np.linalg.norm(house))
```

```output
5.0
5.0
122.62952336203546
```

`np.linalg.norm` computes it directly. (`np.linalg` is NumPy's linear algebra module, which the next few lessons use a lot.) The house vector has four components, and although you cannot draw a four-dimensional arrow, its length is computed in exactly the same way.

Dividing a vector by its own length gives a vector of length 1 pointing the same way, called a **unit vector**. Scaling a vector to length 1 like this is called **normalising** it, and it is how you keep a vector's direction while discarding its size:

```python type
import numpy as np

a = np.array([3, 4])
unit = a / np.linalg.norm(a)
print(unit, np.linalg.norm(unit))
```

```output
[0.6 0.8] 1.0
```

## Distance between points

The distance between two points is the length of the arrow from one to the other, which is the length of their difference:

\[
\text{distance}(a, b) = \|a - b\|
\]

```python type
import numpy as np

home = np.array([2, 1])
shop = np.array([5, 5])
print(np.linalg.norm(shop - home))

houses = np.array([[120, 3], [95, 2], [130, 3], [60, 1]])
target = np.array([125, 3])
print(np.linalg.norm(houses - target, axis=1))
```

```output
5.0
[ 5.         30.01666204  5.         65.03076195]
```

This straight-line distance is called the **Euclidean distance**. With `axis=1`, `np.linalg.norm` finds the length of each row, so the second calculation, which broadcasts `target` across every row, gives the distance from the target house to every house at once. The nearest houses are the most similar ones, and predicting something about a new house from the houses closest to it is the idea behind the k-nearest-neighbours method you will build later.

Notice that the floor area, in the tens and hundreds, completely dominates these distances, while the bedroom count barely matters. Features measured on very different scales distort distances, which is exactly why the "Standardise the features" challenge in the indexing and broadcasting lesson put every column on the same scale. Machine learning code standardises features before measuring distances for this reason.

## Angles, cos and sin

To talk about the angle between two vectors, you need two functions from trigonometry, **cos** (cosine) and **sin** (sine). Here is all you need of them. Draw a circle of radius 1 around the origin. Start at the point `(1, 0)` and walk anticlockwise round the circle through an angle θ (the Greek letter theta). The point you arrive at has coordinates

\[
(\cos\theta,\ \sin\theta)
\]

So cos θ is how far across you are, and sin θ how far up. At 0° you have not moved, so cos is 1 and sin is 0. At 90° you are at the top, `(0, 1)`: cos is 0. At 180° you are at `(−1, 0)`: cos is −1. In short, **cos θ is 1 when the angle is zero, 0 at a right angle, and −1 when pointing the opposite way**, which is exactly why it measures "how much two directions agree".

NumPy's `np.cos` and `np.sin` measure angles in **radians**, not degrees. A full turn is 2π radians (about 6.28) instead of 360°, so 180° is π radians and 90° is π/2. `np.radians` converts degrees to radians, and `np.degrees` converts back.

```python type
import numpy as np

for degrees in [0, 60, 90, 180, 270]:
    theta = np.radians(degrees)
    print(f"{degrees:>3}°  cos {np.cos(theta):6.3f}   sin {np.sin(theta):6.3f}")
```

```output
  0°  cos  1.000   sin  0.000
 60°  cos  0.500   sin  0.866
 90°  cos  0.000   sin  1.000
180°  cos -1.000   sin  0.000
270°  cos -0.000   sin -1.000
```

Some values print as tiny numbers like `6.1e-17` instead of 0: floating-point rounding again (Python lesson 2), since π itself cannot be stored exactly.

## The dot product

The **dot product** of two vectors multiplies them component by component and adds up the results:

\[
a \cdot b = a_1 b_1 + a_2 b_2 + \dots + a_n b_n
\]

The result is a single number. In NumPy it is written `a @ b`, or `np.dot(a, b)`:

```python type
import numpy as np

a = np.array([3, 1])
b = np.array([1, 2])
print((a * b).sum())
print(a @ b)
print(np.dot(a, b))
```

```output
5
5
5
```

All three give 3 × 1 + 1 × 2 = 5. The `@` operator is the one you will see most, because it also works for matrices, as the next lesson shows.

The dot product has a geometric meaning that makes it one of the most important operations in machine learning. It equals the product of the two lengths and the cosine of the angle θ between the vectors:

\[
a \cdot b = \|a\|\,\|b\|\cos\theta
\]

You can check the formula on two vectors whose angle you know. `(2, 0)` points along the x-axis and `(3, 3)` points diagonally, 45° away:

```python type
import numpy as np

a = np.array([2.0, 0.0])
b = np.array([3.0, 3.0])
print("a · b                  =", a @ b)
print("|a| |b| cos(45°)       =", np.linalg.norm(a) * np.linalg.norm(b) * np.cos(np.radians(45)))
```

```output
a · b                  = 6.0
|a| |b| cos(45°)       = 6.0
```

Both sides come to 6. Since cos θ is 1 when the vectors point the same way, 0 when they are at right angles, and −1 when they point in opposite directions, the dot product measures **how much two vectors point the same way**, scaled by their lengths. Before running the next cell, predict which of the four dot products will be negative and which will be zero.

```python type
import numpy as np

right = np.array([1, 0])
for name, v in [("same direction", [2, 0]), ("45 degrees", [1, 1]), ("right angle", [0, 3]), ("opposite", [-2, 0])]:
    print(f"{name:15} dot = {right @ np.array(v)}")
```

```output
same direction  dot = 2
45 degrees      dot = 1
right angle     dot = 0
opposite        dot = -2
```

- **Positive**: the angle between them is less than 90 degrees; they point broadly the same way.
- **Zero**: they are at exactly 90 degrees. Vectors whose dot product is zero are called **orthogonal**, which is the general word for "perpendicular" in any number of dimensions.
- **Negative**: they point broadly in opposite directions.

Rearranging the formula gives the angle between any two vectors, in any number of dimensions. Look back at the picture of `a = (3, 1)` and `b = (1, 2)` at the start of the lesson and estimate the angle between them before running this:

```python type
import numpy as np

a = np.array([3, 1])
b = np.array([1, 2])
cos_theta = (a @ b) / (np.linalg.norm(a) * np.linalg.norm(b))
print(cos_theta)
print(np.degrees(np.arccos(cos_theta)).round(6))
```

```output
0.7071067811865475
45.0
```

`np.arccos` turns a cosine back into an angle, in radians, and `np.degrees` converts radians to degrees. The angle between `a` and `b` is 45 degrees. (Without the rounding it prints as `45.00000000000001`: rounding error once more.)

## Cosine similarity

That cosine on its own, the dot product divided by both lengths, is called **cosine similarity**. It measures only the **direction** two vectors point, ignoring how long they are, and always lies between -1 and 1.

Direction without size is often exactly what "similar" should mean. Represent each document by how many times it uses each of a few words. A long article and a short note about the same topic use the same words in similar **proportions**, so they point the same way, even though the long article's counts are all much bigger. Predict which pair will have the higher cosine similarity, and which the smaller straight-line distance:

```python type
import numpy as np

words = ["goal", "match", "vote", "election"]
football_note = np.array([2, 1, 0, 0])
football_report = np.array([20, 12, 1, 0])
politics_report = np.array([0, 1, 15, 9])

def cosine_similarity(a, b):
    return (a @ b) / (np.linalg.norm(a) * np.linalg.norm(b))

print("cosine, note vs football report:", round(cosine_similarity(football_note, football_report), 3))
print("cosine, note vs politics report:", round(cosine_similarity(football_note, politics_report), 3))
print("distance, note vs football report:", round(np.linalg.norm(football_note - football_report), 1))
print("distance, note vs politics report:", round(np.linalg.norm(football_note - politics_report), 1))
```

```output
cosine, note vs football report: 0.996
cosine, note vs politics report: 0.026
distance, note vs football report: 21.1
distance, note vs politics report: 17.6
```

The two football texts have a cosine similarity near 1, and the football note and the politics report are close to 0. Straight-line distance gets it backwards: the football note is **closer** to the politics report than to the football report, simply because the football report is long and its counts are all large. Cosine similarity is used throughout search engines and recommendation systems, and to compare the learned vectors, called **embeddings**, that represent words and images in modern models.

## The dot product as a weighted sum

There is one more way to read the dot product, and it is the one this series will use most. Look at the formula again: each component of one vector is multiplied by a matching number from the other, and the results are added. That is a **weighted sum**. If `x` holds the features of an example and `w` holds a weight for each feature, then `w @ x` scores the example, with each weight saying how much its feature counts.

```python type
import numpy as np

weights = np.array([2000, 15000, -500])
house = np.array([110, 3, 20])
print(weights @ house + 50000)
```

```output
305000
```

This is a tiny linear model for a house price: 2000 per square metre, 15000 per bedroom, minus 500 per year of age, plus a starting amount of 50000. The weights are made up here. **Learning** those weights from data, so that the scores match real prices as closely as possible, is what linear regression does, a few lessons from now. When there are many examples, stacked as the rows of a 2D array `X`, `X @ weights` scores all of them in one step, as the next lesson explains.

::: challenge The angle between vectors [easy]
Write a function `angle_degrees(a, b)` that returns the angle between two vectors of any length, in degrees, using the dot product formula from the lesson.

Floating-point rounding can make the cosine come out as something like 1.0000000000000002, which is outside the range `np.arccos` accepts, and gives `nan`. Guard against this with `np.clip(value, -1, 1)`, which moves any value outside -1 to 1 back to the nearest end.

```python starter
import numpy as np

def angle_degrees(a, b):
    return 0.0

print(angle_degrees(np.array([1, 0]), np.array([0, 5])))
```

```python solution
import numpy as np

def angle_degrees(a, b):
    cos_theta = (a @ b) / (np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.degrees(np.arccos(np.clip(cos_theta, -1, 1))))

print(angle_degrees(np.array([1, 0]), np.array([0, 5])))
```

```python test
import numpy as _np
assert "angle_degrees" in dir(), "Keep the function's name as angle_degrees."
for _a, _b, _want in [([1, 0], [0, 5], 90), ([3, 1], [1, 2], 45), ([1, 1], [-2, -2], 180), ([1, 2, 3], [2, 4, 6], 0), ([1, 0, 0, 0], [1, 1, 0, 0], 45)]:
    _got = angle_degrees(_np.array(_a, dtype=float), _np.array(_b, dtype=float))
    assert _np.isclose(_got, _want, atol=1e-6), f"The angle between {_a} and {_b} should be {_want} degrees, but got {_got}."
_v = _np.array([0.1, 0.2, 0.3])
_got = angle_degrees(_v, _v * 7)
assert not _np.isnan(_got), "The angle between a vector and a scaled copy of itself came out as nan. Use np.clip on the cosine."
"SUCCESS: The angle between vectors in any number of dimensions."
```

Hint: The cosine is the dot product divided by the product of the two norms. Clip it, then `np.arccos` gives radians and `np.degrees` converts them.
:::

::: challenge Find the most similar document [medium]
The rows of `docs` are word-count vectors for several documents. Write a function `most_similar(query, docs)` that returns the row position of the document with the highest cosine similarity to the `query` vector. Compute all the similarities at once, without a loop: `docs @ query` gives every row's dot product with the query, and `np.linalg.norm(docs, axis=1)` every row's length.

```python starter
import numpy as np

def most_similar(query, docs):
    return 0

docs = np.array([[20, 12, 1, 0], [0, 1, 15, 9], [1, 0, 2, 7], [3, 9, 0, 1]])
print(most_similar(np.array([2, 1, 0, 0]), docs))
```

```python solution
import numpy as np

def most_similar(query, docs):
    similarities = (docs @ query) / (np.linalg.norm(docs, axis=1) * np.linalg.norm(query))
    return int(similarities.argmax())

docs = np.array([[20, 12, 1, 0], [0, 1, 15, 9], [1, 0, 2, 7], [3, 9, 0, 1]])
print(most_similar(np.array([2, 1, 0, 0]), docs))
```

```python test
import numpy as _np
import ast as _ast
assert "most_similar" in dir(), "Keep the function's name as most_similar."
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp)) for _n in _ast.walk(_ast.parse(_source))), "Compute every similarity at once with docs @ query, without a loop."
_docs = _np.array([[20, 12, 1, 0], [0, 1, 15, 9], [1, 0, 2, 7], [3, 9, 0, 1]], dtype=float)
for _q, _want in [([2, 1, 0, 0], 0), ([0, 0, 1, 1], 1), ([0, 1, 0, 0], 3), ([0, 0, 0, 5], 2)]:
    _got = most_similar(_np.array(_q, dtype=float), _docs)
    assert _got == _want, f"For the query {_q} the most similar document is row {_want}, but most_similar returned {_got}."
assert most_similar(_np.array([200.0, 100.0, 0, 0]), _docs) == 0, "Scaling the query up must not change the answer: cosine similarity ignores length."
"SUCCESS: Cosine similarity against every document in one expression."
```

Hint: Divide the array of dot products, one per document, by the array of document lengths times the single query length. `argmax` gives the position of the largest similarity.
:::

::: challenge Score every example [medium]
A linear model scores an example with features `x` as `w · x + b`, where `w` holds one weight per feature and `b` is a single number called the **bias**. Write a function `linear_scores(X, w, b)` that takes a 2D array `X` with one example per row and returns a 1D array of every example's score, in one expression, without a loop.

Then write `accuracy_of_sign(X, w, b, y)`, where `y` holds the true answers as 1 or -1. A model "predicts" 1 when an example's score is positive and -1 otherwise. Return the fraction of examples it gets right.

```python starter
import numpy as np

def linear_scores(X, w, b):
    return np.zeros(len(X))

def accuracy_of_sign(X, w, b, y):
    return 0.0

X = np.array([[1.0, 2.0], [3.0, -1.0], [-2.0, 0.5]])
w = np.array([0.5, -1.0])
print(linear_scores(X, w, 0.25))
print(accuracy_of_sign(X, w, 0.25, np.array([-1, 1, -1])))
```

```python solution
import numpy as np

def linear_scores(X, w, b):
    return X @ w + b

def accuracy_of_sign(X, w, b, y):
    predictions = np.where(linear_scores(X, w, b) > 0, 1, -1)
    return (predictions == y).mean()

X = np.array([[1.0, 2.0], [3.0, -1.0], [-2.0, 0.5]])
w = np.array([0.5, -1.0])
print(linear_scores(X, w, 0.25))
print(accuracy_of_sign(X, w, 0.25, np.array([-1, 1, -1])))
```

```python test
import numpy as _np
import ast as _ast
assert "linear_scores" in dir() and "accuracy_of_sign" in dir(), "Keep both function names."
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp)) for _n in _ast.walk(_ast.parse(_source))), "Use X @ w and array operations, without a loop."
_X = _np.array([[1.0, 2.0], [3.0, -1.0], [-2.0, 0.5]])
_w = _np.array([0.5, -1.0])
_s = linear_scores(_X, _w, 0.25)
assert _np.allclose(_s, [-1.25, 2.75, -1.25]), f"The scores should be [-1.25, 2.75, -1.25], but got {_s}."
assert _np.isclose(accuracy_of_sign(_X, _w, 0.25, _np.array([-1, 1, -1])), 1.0), "Every prediction is right in the example, so the accuracy should be 1.0."
assert _np.isclose(accuracy_of_sign(_X, _w, 0.25, _np.array([1, 1, -1])), 2 / 3), "With one wrong answer out of three, the accuracy should be 2/3."
_rng = _np.random.default_rng(9)
_Xb = _rng.normal(size=(50, 4))
_wb = _rng.normal(size=4)
assert _np.allclose(linear_scores(_Xb, _wb, -0.3), _Xb @ _wb - 0.3), "linear_scores gave wrong results for a larger random dataset."
"SUCCESS: That is a linear classifier's prediction step. The coming lessons are about learning w and b."
```

Hint: `X @ w` computes the dot product of every row with `w`, giving one number per example; adding `b` broadcasts it. For the predictions, `np.where(scores > 0, 1, -1)`, then compare with `y` and take the mean.
:::

## What you learned

- A vector is a list of numbers, stored as a 1D array. It can be pictured as an arrow from the origin, or as a point. Each example in a dataset is a point with one coordinate per feature.
- Vectors add component by component (tip to tail) and scale by multiplying every component. `b - a` is the arrow from `a` to `b`.
- The norm ‖a‖ = √(sum of squared components) is the length, computed with `np.linalg.norm`. Dividing by it gives a unit vector.
- The Euclidean distance between points is ‖a − b‖. Features on very different scales distort distances, which is why data is standardised.
- The point at angle θ round the unit circle is (cos θ, sin θ). cos is 1 at 0°, 0 at 90° and −1 at 180°. NumPy uses radians (a full turn is 2π); `np.radians` and `np.degrees` convert.
- The dot product `a @ b` multiplies component by component and adds. It equals ‖a‖‖b‖cos θ: positive when vectors point the same way, zero when they are orthogonal, negative when they are opposed.
- Cosine similarity, the dot product divided by both lengths, compares direction while ignoring size.
- The dot product is a weighted sum: `w @ x + b` is a linear model's score, and `X @ w + b` scores every example at once.

A single vector is one example; a whole dataset is many vectors stacked into a matrix. Next you will see what a matrix does when it multiplies a vector: it transforms the whole space, stretching, rotating and projecting it.
