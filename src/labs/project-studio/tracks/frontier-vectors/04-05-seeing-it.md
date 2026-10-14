---
title: 4.5 — Seeing It
runtime: python
support: tests/conftest.py
---

Lesson 4.3's similarity table was 25 numbers in rows. With five texts you can read them. With five hundred you can't, but you can still see a picture of them: bright where texts are alike, dark where they aren't, and the pattern jumps out. The same goes for the rest of this series. Training a model produces thousands of numbers, and a curve of them going down (or not) is how you know whether it's working.

This lesson adds **Matplotlib**, the Python library for charts that nearly every other tool draws with. You draw 4.3's table as a grid of colours, and, in your Your turn, the points of a small dataset, before and after 4.4's centering. Each picture is saved to an image file for you to open. The tests don't look at pixels: they check what each picture was drawn **from**, which is exact and repeatable.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_plots.py**:

```python file=tests/test_plots.py provided
# Tests for frontier.plots (lesson 4.5): what each figure holds, checked as data rather than pixels.
import numpy as np

SIMILAR = np.array([[1.0, 0.5], [0.5, 1.0]])
POINTS = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 0.0]])


def test_heatmap_shows_the_matrix():
    from frontier.plots import heatmap
    ax = heatmap(SIMILAR, ["a", "b"]).axes[0]
    assert ax.get_images()[0].get_array().tolist() == SIMILAR.tolist()
    assert ax.get_title() == "cosine similarity"


def test_heatmap_colours_run_from_0_to_1():
    from frontier.plots import heatmap
    ax = heatmap(SIMILAR, ["a", "b"]).axes[0]
    assert ax.get_images()[0].get_clim() == (0.0, 1.0)


def test_heatmap_labels_rows_and_columns():
    from frontier.plots import heatmap
    ax = heatmap(SIMILAR, ["a", "b"]).axes[0]
    assert [label.get_text() for label in ax.get_xticklabels()] == ["a", "b"]
    assert [label.get_text() for label in ax.get_yticklabels()] == ["a", "b"]


def test_scatter_one_dot_per_row():
    from frontier.plots import scatter
    ax = scatter(POINTS, "three points").axes[0]
    assert ax.collections[0].get_offsets().tolist() == POINTS.tolist()


def test_scatter_has_its_title():
    from frontier.plots import scatter
    assert scatter(POINTS, "three points").axes[0].get_title() == "three points"
```

Each function returns a Matplotlib **figure**, a picture still in memory, and the tests read it back. `.axes[0]` is the figure's first chart; the next steps explain what that is.

- **`heatmap`** draws a matrix as coloured squares. The tests check that the picture was made from the matrix it was given, that its colours run from 0 to 1 (`get_clim`, the colour limits), that its rows and columns carry the labels it was given, and its title.
- **`scatter`**, your Your turn, draws one dot per row of a matrix. `get_offsets` gives back the dots' positions, which must be the matrix's rows; and it has the title it was given.

```check
file tests/test_plots.py -- Click "Create provided tests/test_plots.py" above.
```

## Install Matplotlib

Matplotlib is a new library, so it goes into `requirements.txt` with an exact version, like every other. Add it as a new line, keeping the lines in alphabetical order (so it's the first line):

```text
matplotlib==3.11.2
```

and install it as before. It's about 10 MB, and pip also installs the few small libraries it needs:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

The pictures will go into a folder named `pictures`. They're made by your code, so they can be made again at any time, and files like that don't belong in git, the way `__pycache__` doesn't. Add `pictures/` to `.gitignore`, and git will leave the folder out of every commit.

```check
run ".venv/Scripts/python -m pip show matplotlib" stdout="Version: 3.11.2" label="Matplotlib 3.11.2 is installed" -- Add matplotlib==3.11.2 to requirements.txt, then run .venv\Scripts\python -m pip install -r requirements.txt
contains requirements.txt "matplotlib==3.11.2" label="requirements.txt pins Matplotlib" -- Add the line matplotlib==3.11.2 to requirements.txt.
contains .gitignore "pictures/" label=".gitignore leaves the pictures out" -- Add the line pictures/ to .gitignore.
```

## A table as a picture

A Matplotlib picture is built from two kinds of object:

- A **`Figure`** is the whole picture: its size, and everything drawn on it. `Figure(figsize=(6, 5))` is 6 inches by 5, which Matplotlib saves at 100 pixels per inch, so 600 by 500 pixels. `layout="constrained"` makes Matplotlib fit the pieces in without overlapping each other or the edges.
- An **Axes** is one chart on the figure: the area with its own scales, labels and title. `fig.add_subplot()` adds one and returns it. The usual name for it is `ax`.

Then `ax.imshow(m)` ("image show") draws the matrix `m` as a grid of squares, one per entry, each coloured by its number: dark purple for the smallest, through blue and green, to yellow for the largest. By default the smallest number in `m` gets the darkest colour. `vmin=0.0, vmax=1.0` fixes the scale instead, so that 0 is always dark purple and 1 always yellow, whatever the matrix holds, and two pictures can be compared. `ax.set_xticks(positions, labels)` puts a label under each column, `ax.set_yticks` one beside each row, and `ax.set_title` a title above. `fig.colorbar(image)` adds a **colour bar**, the key that shows which colour is which number.

Most Matplotlib examples you'll find start with `import matplotlib.pyplot as plt` and draw with `plt.` functions. That **pyplot** interface keeps track of a "current" figure for you and can open windows on screen, which suits typing into an interactive session. For a program that saves pictures to files, making a `Figure` yourself is simpler: it's an ordinary object, and nothing is left open afterwards. The two draw with the same `ax` methods. Create `src/frontier/plots.py`:

```python file=src/frontier/plots.py
"""Pictures of matrices and points, as Matplotlib figures."""
from matplotlib.figure import Figure

from frontier.matrix import Matrix


def heatmap(m: Matrix, labels: list[str]) -> Figure:
    """m as a grid of coloured squares, one per entry, with a colour bar as the key."""
    fig = Figure(figsize=(6, 5), layout="constrained")
    ax = fig.add_subplot()
    image = ax.imshow(m, vmin=0.0, vmax=1.0)
    ax.set_xticks(range(len(labels)), labels)
    ax.set_yticks(range(len(labels)), labels)
    ax.set_title("cosine similarity")
    fig.colorbar(image)
    return fig
```

The squares sit at positions 0, 1, 2 and so on along each side, so `range(len(labels))` puts one label at each. A picture of a matrix like this is called a **heatmap**. Nothing has been saved yet: `heatmap` returns the figure, and whoever called it decides what to do with it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_plots.py -k heatmap" label="the heatmap is drawn from the matrix, scaled 0 to 1, with labels" -- ax.imshow(m, vmin=0.0, vmax=1.0), then labels with ax.set_xticks and ax.set_yticks, and ax.set_title("cosine similarity").
run ".venv/Scripts/python -m mypy --strict src/frontier/plots.py" stdout="Success" label="mypy --strict passes" -- heatmap returns a Figure: from matplotlib.figure import Figure.
```

## Saved to a file

This experiment draws 4.3's similarity table, with a short name for each text so the labels fit, and saves it. `fig.savefig(path)` writes the picture to a file, and the file name's ending decides the format: `.png` here. The folder has to exist first: `Path("pictures").mkdir(exist_ok=True)` makes it, and `exist_ok=True` means it's no error if the folder is already there, so the script can be run again and again. Create `experiments/draw_similarity.py`, with the five texts copied from `all_pairs.py`:

```python file=experiments/draw_similarity.py
"""The similarity table from all_pairs.py, drawn as a picture and saved."""
from pathlib import Path

from frontier.matrix import text_matrix
from frontier.plots import heatmap

texts = [
    "the cat sat on the mat",
    "the dog sat on the log",
    "a cat chased a dog",
    "the stock market fell today",
    "markets rose as stocks recovered",
]
m, _ = text_matrix(texts)
fig = heatmap(m @ m.T, ["cat", "dog", "chased", "stock", "markets"])
print("axes in the figure:", len(fig.axes))
Path("pictures").mkdir(exist_ok=True)
fig.savefig("pictures/similarity.png")
print("saved pictures/similarity.png")
```

`fig.axes` is the list of every Axes on the figure. `heatmap` added one with `add_subplot`.

```predict
question: What does the experiment print for `len(fig.axes)`?
choice: 1
choice: 2
choice: 25
answer: 2
explain: The colour bar is drawn in an Axes of its own, which `fig.colorbar` adds beside the heatmap's: a bar of colours with a scale, just as the heatmap is a grid of colours with scales. That's why the tests read `.axes[0]`, the first one, `add_subplot`'s.
verify: script colour_bar_axes.py
```

```powershell
.venv\Scripts\python experiments/draw_similarity.py
```

```text
axes in the figure: 2
saved pictures/similarity.png
```

Open the picture with your computer's image viewer. `Invoke-Item` is PowerShell's way of opening a file in whatever program usually opens it:

```powershell
Invoke-Item pictures\similarity.png
```

It's 4.3's table, with the same patterns, seen at a glance: a yellow diagonal (each text against itself), the bright green pair of the cat and dog sentences (0.75), the blue the word "the" gives the stock market text against both (0.32), and the dark row and column of "markets", which matches nothing. With five hundred texts the squares would be tiny, but bright blocks of similar texts would still stand out.

```check
run ".venv/Scripts/python experiments/draw_similarity.py" stdout="saved pictures/similarity.png" label="the heatmap is saved" -- Path("pictures").mkdir(exist_ok=True), then fig.savefig("pictures/similarity.png").
file pictures/similarity.png -- Run .venv\Scripts\python experiments/draw_similarity.py
```

## Your turn: points as dots

A heatmap shows a matrix entry by entry. A matrix whose rows are **points**, with two columns such as a person's height and weight, is drawn differently: one dot per row, the first column giving how far across, the second how far up. That's a **scatter plot**.

**Build, on your own:** `scatter(points, title)` at the end of `src/frontier/plots.py`. It takes a `Matrix` with two columns and a `str`, and returns a `Figure` with one Axes, one dot per row of `points`, and `title` as its title.

- Make the figure and its Axes as `heatmap` does. `figsize=(5, 5)` suits a scatter plot.
- `ax.scatter(xs, ys)` draws a dot at each matching pair: `xs[0]` across and `ys[0]` up, then `xs[1]` and `ys[1]`, and so on. Here `xs` is every row's first number and `ys` every row's second: two columns of `points`, read the way 4.3 read a column.
- `ax.set_title` sets the title, as in `heatmap`.

```hints
nudge: The two columns are points[:, 0] and points[:, 1]. Pass them to ax.scatter, then set the title and return the figure.
concept: fig = Figure(figsize=(5, 5), layout="constrained"), ax = fig.add_subplot(), then ax.scatter(points[:, 0], points[:, 1]), ax.set_title(title), return fig. points[0] would be the first row, a single point, not a column.
answer: At the end of `src/frontier/plots.py`:
~~~python
def scatter(points: Matrix, title: str) -> Figure:
    """One dot per row of points: column 0 across, column 1 up."""
    fig = Figure(figsize=(5, 5), layout="constrained")
    ax = fig.add_subplot()
    ax.scatter(points[:, 0], points[:, 1])
    ax.set_title(title)
    return fig
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_plots.py -k scatter" label="one dot per row, with the title" -- ax.scatter(points[:, 0], points[:, 1]): column 0 across, column 1 up. Then ax.set_title(title).
run ".venv/Scripts/python -m pytest -q tests/test_plots.py tests/test_broadcasting.py tests/test_matrix.py" label="every plot and matrix test passes" -- Leave heatmap as it was.
run ".venv/Scripts/python -m mypy --strict src/frontier/plots.py" stdout="Success" label="mypy --strict still passes" -- scatter takes a Matrix and a str, and returns a Figure.
```

## Centering, seen, and Chapter 4 done

Last, 4.4's centering as pictures. This experiment makes 50 made-up people, a height and a weight each, with broadcasting: `rng.random((50, 2))` is 50 rows of two numbers between 0 and 1, multiplying by `[40.0, 30.0]` stretches the columns to between 0 and 40 and 0 and 30, and adding `[150.0, 50.0]` moves them to heights of 150 to 190 cm and weights of 50 to 80 kg. Then it centers them with your `center`, and draws both. Create `experiments/draw_centering.py`:

```python file=experiments/draw_centering.py
"""Fifty made-up people before and after centering, drawn as two pictures."""
from pathlib import Path

import numpy as np

from frontier.matrix import center
from frontier.plots import scatter

rng = np.random.default_rng(0)
people = rng.random((50, 2)) * np.array([40.0, 30.0]) + np.array([150.0, 50.0])
centered = center(people)
print("column averages before:", np.round(people.mean(axis=0), 1))
print("centered columns average 0:", np.allclose(centered.mean(axis=0), 0.0))
Path("pictures").mkdir(exist_ok=True)
scatter(people, "height (cm) and weight (kg)").savefig("pictures/people.png")
scatter(centered, "the same, centered").savefig("pictures/centered.png")
print("saved pictures/people.png and pictures/centered.png")
```

`scatter(...)` returns a figure, and `.savefig(...)` is called on it straight away, without giving it a name first.

```powershell
.venv\Scripts\python experiments/draw_centering.py
Invoke-Item pictures\people.png
Invoke-Item pictures\centered.png
```

```text
column averages before: [171.2  67. ]
centered columns average 0: True
saved pictures/people.png and pictures/centered.png
```

The two pictures have the same cloud of dots, in the same arrangement. Only the numbers along the edges differ: around 150 to 190 and 50 to 80 in the first, around -20 to 20 and -15 to 15 in the second, with 0 in the middle. Centering moved the data, not its shape, which is why it can be done to a dataset before training without losing anything.

Commit and push. `git status` first: the `pictures` folder isn't listed, because `.gitignore` leaves it out.

```powershell
git status
git add .
git commit -m "Matplotlib: the similarity table and a centered dataset, as pictures"
git push
```

```check
run ".venv/Scripts/python experiments/draw_centering.py" stdout="centered columns average 0: True" label="the centering pictures are drawn" -- centered = center(people), then scatter(...).savefig(...) for each.
file pictures/centered.png -- Run .venv\Scripts\python experiments/draw_centering.py
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
requirements.txt         also matplotlib==3.11.2
.gitignore               also pictures/
src/frontier/
  plots.py               heatmap (imshow, labels, colour bar) and scatter, each returning a Figure
experiments/
  draw_similarity.py     4.3's table as pictures/similarity.png
  draw_centering.py      50 people before and after centering: pictures/people.png, pictures/centered.png
tests/
  test_plots.py          -k heatmap, scatter
```

That's Chapter 4. Texts became vectors, compared by the cosine of the angle between them; NumPy arrays hold the numbers; a matrix holds a whole collection, and one matrix multiplication compares a question with all of it, or every text with every other; broadcasting does arithmetic between shapes, and `keepdims` keeps it honest; and Matplotlib shows the result. Chapter 5 is about slopes: how a number changes when you nudge what it depends on, which is how every model in this series learns. Its curves are drawn with this lesson's Matplotlib.
