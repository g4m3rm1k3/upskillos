# Plotting with matplotlib

A column of a thousand numbers tells you almost nothing when you look at it. The same thousand numbers drawn as a picture can show you at a glance whether they are spread out or bunched together, whether they rise over time, whether two measurements move together, or whether a few values are wildly wrong. In machine learning you plot constantly: to understand a dataset before modelling it, to watch a model's error fall as it trains, and to see where a model succeeds and fails.

**matplotlib** is Python's standard plotting library. This lesson teaches the handful of plot types that answer most questions (line plots, scatter plots, histograms and bar charts), how to lay several plots out together, and how to make a plot that communicates clearly rather than one that merely exists.

## Figures and axes

Every matplotlib plot has two main objects. The **figure** is the whole image. An **axes** (always with an "s", even for one) is a single plot inside it, with its own x-axis, y-axis, data and labels. A figure can hold several axes side by side.

The clearest way to work is to create both explicitly with `plt.subplots()`, then call methods on the axes:

```python type
import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 10, 100)
y = x ** 2

fig, ax = plt.subplots()
ax.plot(x, y)
ax.set_xlabel("x")
ax.set_ylabel("x squared")
ax.set_title("y = x²")
plt.show()
```

`import matplotlib.pyplot as plt` is the standard import. `plt.subplots()` returns the figure and one axes, which are unpacked into `fig` and `ax`. `ax.plot(x, y)` draws a line through the points `(x[0], y[0])`, `(x[1], y[1])` and so on; with 100 points close together, it looks like a smooth curve. `plt.show()` displays the figure. (In this notebook, every figure a cell draws is shown below it automatically, but `plt.show()` is what you would write in a normal program, so it is a good habit.)

You will also see code that calls `plt.plot(...)` and `plt.xlabel(...)` directly, without an `ax`. That draws on "the current axes" and is fine for a quick single plot, but with several plots in one figure it quickly becomes unclear which plot each call affects. This series uses the explicit `ax` style throughout.

## Line plots: how something changes

Use a line plot when the x-axis is ordered, such as time, or an input to a function, and you want to see how something changes along it. Several lines can share one axes, and a **legend** says which is which. Before running the next cell, look at the two formulas and predict: what will the validation error do as the rounds go on?

```python type
import numpy as np
import matplotlib.pyplot as plt

epochs = np.arange(1, 21)
training_error = 1 / epochs + 0.05
validation_error = 1 / epochs + 0.02 * epochs

fig, ax = plt.subplots(figsize=(6, 4))
ax.plot(epochs, training_error, label="training error")
ax.plot(epochs, validation_error, label="validation error", linestyle="--", marker="o")
ax.set_xlabel("training round")
ax.set_ylabel("error")
ax.set_title("Validation error starts rising after round 7")
ax.legend()
plt.show()
```

`label=` names each line, and `ax.legend()` draws the key. `linestyle="--"` draws a dashed line and `marker="o"` puts a dot at each data point. `figsize=(6, 4)` sets the figure's size in inches, width then height.

This particular picture is one you will see again and again in this series. The training error keeps falling, but the validation error, measured on data the model has not trained on, turns and rises. That turn is the moment a model starts **overfitting**: memorising its training data instead of learning the general pattern. A plot shows it instantly; a table of 40 numbers would hide it.

Notice the title. "Training and validation error" merely names the plot; "Validation error starts rising after round 7" tells the reader what to see. A good title states the finding.

## Scatter plots: do two things move together?

Use a scatter plot to see the relationship between two measurements. Each example becomes one dot, placed by its two values. `rng.uniform(low, high, size)` gives floats spread evenly between `low` and `high`. Predict which way the dots will slope.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
hours = rng.uniform(0, 10, size=80)
score = 40 + 5 * hours + rng.normal(0, 6, size=80)

fig, ax = plt.subplots()
ax.scatter(hours, score, alpha=0.7)
ax.set_xlabel("hours studied")
ax.set_ylabel("exam score")
ax.set_title("More study, higher scores")
plt.show()
```

The data is simulated: each score is 40, plus 5 points per hour studied, plus some random noise. The dots rise from left to right, showing a clear upward relationship, and their scatter around that trend shows the noise. `alpha=0.7` makes the dots slightly transparent, so where many overlap they look darker. Fitting a straight line through points like these is exactly what linear regression, later in this series, does.

Colour can add a third piece of information. When examples belong to different categories, plot each category separately with its own label:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(1)
cats = rng.normal([2, 2], 0.8, size=(40, 2))
dogs = rng.normal([5, 4], 0.8, size=(40, 2))

fig, ax = plt.subplots()
ax.scatter(cats[:, 0], cats[:, 1], label="cats")
ax.scatter(dogs[:, 0], dogs[:, 1], label="dogs", marker="^")
ax.set_xlabel("feature 1")
ax.set_ylabel("feature 2")
ax.legend()
plt.show()
```

`rng.normal([2, 2], 0.8, size=(40, 2))` makes 40 points scattered around the centre `(2, 2)`, by broadcasting the centre across the 40 rows. The two groups barely overlap, so a simple straight line could separate them. Pictures like this one are how you will judge, in later lessons, whether a **classification** problem (sorting examples into categories) is easy or hard.

## Histograms: how are the values spread?

A histogram shows the **distribution** of a single measurement: which values are common and which are rare. It divides the range of values into equal-width intervals called **bins**, counts how many values fall in each, and draws a bar for each count.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(2)
heights = rng.normal(170, 8, size=1000)

fig, ax = plt.subplots()
ax.hist(heights, bins=30, edgecolor="white")
ax.set_xlabel("height (cm)")
ax.set_ylabel("number of people")
ax.set_title("Heights cluster around 170 cm")
plt.show()
```

The bars form the familiar bell shape of the normal distribution: most heights near 170, fewer and fewer further away. `edgecolor="white"` draws a thin gap between the bars.

The number of bins changes what you see. Before running the next cell, sketch what you expect the same data to look like with 5 bins and with 200.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(2)
heights = rng.normal(170, 8, size=1000)

fig, axes = plt.subplots(1, 2, figsize=(9, 3.5))
axes[0].hist(heights, bins=5)
axes[0].set_title("5 bins: too coarse")
axes[1].hist(heights, bins=200)
axes[1].set_title("200 bins: too noisy")
for ax in axes:
    ax.set_xlabel("height (cm)")
plt.show()
```

Too few bins hide the shape in a few wide bars; too many make every bar a small, noisy count. `plt.subplots(1, 2)` makes a figure with 1 row and 2 columns of axes, returned as an array `axes`. Each is used exactly like the single `ax` before, and the loop gives both the same x label. There is no single right number of bins; try a few and choose the one that shows the shape most honestly.

## Bar charts: comparing categories

A bar chart compares a number across a few named categories:

```python type
import matplotlib.pyplot as plt

models = ["baseline", "linear", "tree", "forest"]
accuracy = [0.62, 0.81, 0.78, 0.88]

fig, ax = plt.subplots()
ax.bar(models, accuracy, color="tab:blue")
ax.set_ylabel("accuracy")
ax.set_ylim(0, 1)
ax.set_title("The forest model is most accurate")
for i, value in enumerate(accuracy):
    ax.text(i, value + 0.02, f"{value:.2f}", ha="center")
plt.show()
```

`ax.set_ylim(0, 1)` fixes the y-axis to run from 0 to 1. For bar charts this matters: bar **lengths** are how readers compare values, so a y-axis that starts at 0.6 instead of 0 would draw the 0.81 bar about ten times as tall as the 0.62 bar, for a model that is not remotely ten times better. `ax.text(x, y, string)` writes text at a position; here it labels each bar with its value, centred (`ha` means "horizontal alignment").

## Images and grids of numbers

`ax.imshow` draws a 2D array as an image, with each number shown as the colour of one square. scikit-learn comes with a small dataset of handwritten digits, each an 8 by 8 grid of brightness values, which is perfect for this:

```python type
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits

digits = load_digits()
print(digits.images.shape)

fig, axes = plt.subplots(1, 6, figsize=(9, 2))
for ax, image, label in zip(axes, digits.images, digits.target):
    ax.imshow(image, cmap="gray_r")
    ax.set_title(str(label))
    ax.axis("off")
plt.show()
```

```output
(1797, 8, 8)
```

`digits.images` has shape `(1797, 8, 8)`: 1797 images, each 8 by 8. `digits.target` holds the correct digit for each image. `cmap="gray_r"` chooses a reversed grey colour scale, so higher numbers are darker, like ink. `ax.axis("off")` hides the axes, which mean nothing for an image. The `zip` pairs the 6 axes with the images and their labels, and stops after 6, because `zip` stops when its shortest input runs out. You will train a model to recognise these digits later in the series. The same `imshow` also draws **heatmaps**, such as a table showing which pairs of features are related.

## Choosing the right plot

Start from the question, and the plot follows:

- **How does it change over an ordered variable (time, rounds, input)?** Line plot.
- **Are two measurements related?** Scatter plot.
- **How is one measurement distributed?** Histogram.
- **How do a few categories compare?** Bar chart, with the axis starting at zero.
- **What does a grid of numbers look like?** `imshow`.

And every plot you show someone else should have axis labels, with units where there are any, a legend if there is more than one series, and ideally a title that states what the plot shows.

::: challenge Two curves [easy]
Plot `sin(x)` and `cos(x)` on the **same** axes, for 200 values of `x` from 0 to 2π (`np.pi` is π). Label the lines `"sin"` and `"cos"`, show a legend, and label the x-axis `"x"`.

```python starter
import numpy as np
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
plt.show()
```

```python solution
import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 2 * np.pi, 200)
fig, ax = plt.subplots()
ax.plot(x, np.sin(x), label="sin")
ax.plot(x, np.cos(x), label="cos")
ax.set_xlabel("x")
ax.legend()
plt.show()
```

```python test
import numpy as _np
import matplotlib.pyplot as _plt
_ax = _plt.gcf().axes[0] if _plt.get_fignums() and _plt.gcf().axes else None
assert _ax is not None, "Draw your plot on an axes created with plt.subplots()."
_lines = _ax.get_lines()
assert len(_lines) == 2, f"There should be 2 lines on the axes, but there are {len(_lines)}."
_labels = sorted(l.get_label() for l in _lines)
assert _labels == ["cos", "sin"], f"The lines should be labelled 'sin' and 'cos', but their labels are {_labels}."
for _l in _lines:
    _x, _y = _l.get_xdata(), _l.get_ydata()
    assert len(_x) == 200 and _np.isclose(_x[0], 0) and _np.isclose(_x[-1], 2 * _np.pi), "Use 200 x values from 0 to 2π (np.linspace)."
    _f = _np.sin if _l.get_label() == "sin" else _np.cos
    assert _np.allclose(_y, _f(_x)), f"The line labelled {_l.get_label()!r} does not show {_l.get_label()}(x)."
assert _ax.get_legend() is not None, "Show a legend with ax.legend()."
assert _ax.get_xlabel() == "x", f"Label the x-axis 'x' (it is {_ax.get_xlabel()!r})."
"SUCCESS: Two labelled curves on one axes."
```

Hint: `np.linspace(0, 2 * np.pi, 200)` makes the x values. Call `ax.plot` once for each curve, each with its own `label=`, then `ax.legend()` and `ax.set_xlabel("x")`.
:::

::: challenge A histogram with a finding [medium]
The starter simulates the waiting times, in minutes, of 500 customers. (`rng.exponential` produces the kind of spread typical of waiting times: many short waits and a few long ones.) Draw a histogram of them with 25 bins, label the x-axis `"waiting time (minutes)"` and the y-axis `"customers"`, and give it a title that states what the plot shows. For the check, the title must include the word `"most"` (for example, "Most customers wait under 5 minutes").

Then, in the same cell, print the fraction of customers who waited under 5 minutes, calculated from the data, so your title is backed by a number.

```python starter
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(4)
waits = rng.exponential(scale=3, size=500)

fig, ax = plt.subplots()
plt.show()
```

```python solution
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(4)
waits = rng.exponential(scale=3, size=500)

fig, ax = plt.subplots()
ax.hist(waits, bins=25, edgecolor="white")
ax.set_xlabel("waiting time (minutes)")
ax.set_ylabel("customers")
ax.set_title("Most customers wait under 5 minutes")
plt.show()
print((waits < 5).mean())
```

```python test
import numpy as _np
import matplotlib.pyplot as _plt
_ax = _plt.gcf().axes[0] if _plt.get_fignums() and _plt.gcf().axes else None
assert _ax is not None, "Draw your histogram on the axes from plt.subplots()."
assert len(_ax.patches) == 25, f"The histogram should have 25 bins (bars), but it has {len(_ax.patches)}."
assert _ax.get_xlabel() == "waiting time (minutes)" and _ax.get_ylabel() == "customers", f"Label the axes 'waiting time (minutes)' and 'customers' (they are {_ax.get_xlabel()!r} and {_ax.get_ylabel()!r})."
assert "most" in _ax.get_title().lower(), "Give the plot a title that states the finding, using the word 'most'."
import re as _re
_frac = (_np.random.default_rng(4).exponential(scale=3, size=500) < 5).mean()
_printed = [float(_m) for _m in _re.findall(r"\d*\.\d+|\d+", _stdout)]
assert any(abs(_p - _frac) < 0.01 or abs(_p - 100 * _frac) < 1 for _p in _printed), f"Print the fraction of customers who waited under 5 minutes, calculated from the data (it is about {_frac:.3f})."
"SUCCESS: A histogram with a title that says something, backed by a number."
```

Hint: `ax.hist(waits, bins=25)` draws it. For the fraction, compare the whole array with 5 and take the mean of the resulting booleans, as in the last lesson.
:::

::: challenge Colour by class [medium]
The starter creates 2D points `X`, with shape `(150, 2)`, and a label array `y` holding 0, 1 or 2 for each point. Draw a scatter plot with **one `ax.scatter` call per class**, using a boolean mask to pick out that class's points, and label each call `"class 0"`, `"class 1"` and `"class 2"`. Add a legend and label the axes `"feature 1"` and `"feature 2"`.

```python starter
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(7)
centres = np.array([[0, 0], [4, 1], [2, 4]])
y = rng.integers(0, 3, size=150)
X = centres[y] + rng.normal(0, 0.8, size=(150, 2))

fig, ax = plt.subplots()
plt.show()
```

```python solution
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(7)
centres = np.array([[0, 0], [4, 1], [2, 4]])
y = rng.integers(0, 3, size=150)
X = centres[y] + rng.normal(0, 0.8, size=(150, 2))

fig, ax = plt.subplots()
for label in [0, 1, 2]:
    points = X[y == label]
    ax.scatter(points[:, 0], points[:, 1], label=f"class {label}")
ax.set_xlabel("feature 1")
ax.set_ylabel("feature 2")
ax.legend()
plt.show()
```

```python test
import numpy as _np
import matplotlib.pyplot as _plt
_ax = _plt.gcf().axes[0] if _plt.get_fignums() and _plt.gcf().axes else None
assert _ax is not None, "Draw the scatter plot on the axes from plt.subplots()."
_cols = _ax.collections
assert len(_cols) == 3, f"There should be 3 scatter groups (one ax.scatter call per class), but there are {len(_cols)}."
_by_label = {c.get_label(): c.get_offsets() for c in _cols}
assert sorted(_by_label) == ["class 0", "class 1", "class 2"], f"Label the groups 'class 0', 'class 1' and 'class 2' (they are {sorted(_by_label)})."
for _k in range(3):
    _pts = _np.asarray(_by_label[f"class {_k}"])
    _want = X[y == _k]
    assert _pts.shape == _want.shape and _np.allclose(_np.sort(_pts, axis=0), _np.sort(_want, axis=0)), f"The 'class {_k}' group should contain exactly the points where y == {_k}."
assert _ax.get_legend() is not None, "Add a legend with ax.legend()."
assert (_ax.get_xlabel(), _ax.get_ylabel()) == ("feature 1", "feature 2"), "Label the axes 'feature 1' and 'feature 2'."
"SUCCESS: Three classes, three colours, one mask each."
```

Hint: Inside a loop over the three labels, `X[y == label]` selects the rows belonging to that class. Plot column 0 against column 1 of those rows, with `label=f"class {label}"`.
:::

## What you learned

- A figure is the whole image; an axes is one plot in it. `fig, ax = plt.subplots()` creates both, and `fig, axes = plt.subplots(rows, cols)` makes a grid.
- `ax.plot` draws lines (for ordered data), `ax.scatter` draws points (for relationships), `ax.hist` draws histograms (for distributions), `ax.bar` compares categories, and `ax.imshow` draws a 2D array as an image.
- `label=` with `ax.legend()` identifies each series. `ax.set_xlabel`, `ax.set_ylabel` and `ax.set_title` label the plot; a good title states the finding.
- The number of histogram bins changes what you see; try a few.
- Bar charts must start at zero; `ax.set_ylim` controls the range.
- Choose the plot from the question: change, relationship, distribution, comparison or grid.

With arrays and plots in hand, the next lessons build the mathematics machine learning rests on, starting with vectors: what they are, how to measure their length and the angle between them, and why "similar" in machine learning so often means "pointing the same way".
