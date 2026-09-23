# Lesson 5 — Charts

## Concept, in plain English

Streamlit has a handful of one-line chart functions (`st.line_chart`,
`st.bar_chart`, `st.scatter_chart`) that take a DataFrame and just work, no
configuration needed — good for quick looks. When you need more control
(custom colors tied to meaning, multiple subplots, specific chart types
Streamlit doesn't have a shortcut for), you build a real matplotlib or
Plotly figure exactly as you would outside Streamlit, then hand it to
`st.pyplot` or `st.plotly_chart` to display it. Both approaches matter — this
lesson covers both, in that order.

## Type this — Cell 1 (continuing your Colab setup)

```python
%%writefile app.py
import streamlit as st
from sklearn.datasets import load_iris
import pandas as pd

iris = load_iris()
iris_dataframe = pd.DataFrame(iris.data, columns=iris.feature_names)

st.write("## Native line chart")
st.line_chart(iris_dataframe)
```

Rerun the launch cell from Lesson 1, refresh your browser tab.

## What just happened

`st.line_chart` treats every numeric column as its own line, plotted against
the DataFrame's row index. No axis labeling, no legend positioning, no
styling decisions — you traded control for speed, which is exactly the
right trade for a quick look at what's in a dataset.

## Type this — Cell 1, revised — bar chart, tied to a real question

```python
%%writefile app.py
import streamlit as st
from sklearn.datasets import load_iris
import pandas as pd

iris = load_iris()
iris_dataframe = pd.DataFrame(iris.data, columns=iris.feature_names)
iris_dataframe["species"] = [iris.target_names[i] for i in iris.target]

st.write("## Average measurements by species")
averages_by_species = iris_dataframe.groupby("species").mean()
st.bar_chart(averages_by_species)
```

Rerun and refresh.

## What just happened

`averages_by_species` is plain pandas (`.groupby(...).mean()`) — nothing
Streamlit-specific. `st.bar_chart` just needed a DataFrame shaped with
categories as the index and numeric columns to plot; the actual data
question ("how do average measurements differ by species") was answered
entirely with pandas, same as any other data analysis, before Streamlit ever
touched it.

## Type this — Cell 1, revised — a real matplotlib figure

```python
%%writefile app.py
import streamlit as st
from sklearn.datasets import load_iris
import pandas as pd
import matplotlib.pyplot as plt

iris = load_iris()
iris_dataframe = pd.DataFrame(iris.data, columns=iris.feature_names)
iris_dataframe["species"] = [iris.target_names[i] for i in iris.target]

st.write("## Petal length vs width, colored by species")

figure, axes = plt.subplots()
for species_name in iris.target_names:
    subset = iris_dataframe[iris_dataframe["species"] == species_name]
    axes.scatter(subset["petal length (cm)"], subset["petal width (cm)"], label=species_name)
axes.set_xlabel("Petal length (cm)")
axes.set_ylabel("Petal width (cm)")
axes.legend()

st.pyplot(figure)
```

Rerun and refresh.

## What just happened

Everything above `st.pyplot(figure)` is ordinary matplotlib — the same code
you'd write in a plain Colab cell, building `figure`/`axes` and calling
`.scatter(...)` per species so each gets its own color and legend entry,
something none of `st.line_chart`/`st.bar_chart`/`st.scatter_chart` can do
on their own (they don't have a built-in "color by category" option). The
one Streamlit-specific line is the very last one: `st.pyplot(figure)` hands
your finished figure over to be displayed on the page.

## Type this — Cell 1, revised — interactive with Plotly

```python
%%writefile app.py
import streamlit as st
from sklearn.datasets import load_iris
import pandas as pd
import plotly.express as px

iris = load_iris()
iris_dataframe = pd.DataFrame(iris.data, columns=iris.feature_names)
iris_dataframe["species"] = [iris.target_names[i] for i in iris.target]

st.write("## Petal length vs width (interactive)")

figure = px.scatter(
    iris_dataframe,
    x="petal length (cm)",
    y="petal width (cm)",
    color="species",
    hover_data=iris.feature_names,
)
st.plotly_chart(figure)
```

Rerun and refresh, then hover over individual points and try the zoom/pan
controls in the corner of the chart.

## What just happened

`px.scatter(...)` builds the same category-colored scatter plot as the
matplotlib version, in fewer lines (Plotly Express handles the per-category
coloring and legend automatically), and `st.plotly_chart` renders it as a
genuinely interactive widget — hover tooltips, zoom, pan — none of which
`st.pyplot`'s static image provides. This is the real trade-off between the
two: matplotlib gives you precise manual control over every visual detail;
Plotly gives you interactivity essentially for free, at the cost of some
fine-grained styling control.

## Checkpoint exercise

1. Add a `st.selectbox` letting the user choose which two numeric columns to
   plot against each other in the Plotly scatter chart (instead of the fixed
   petal length/width), rebuilding `figure` from the selected columns on
   every rerun.
2. Build a matplotlib histogram (`axes.hist(...)`) of one column, split into
   subplots per species using `plt.subplots(1, 3)` (one subplot per
   species) instead of overlaying colors — a genuinely different layout
   choice matplotlib supports that a one-line Streamlit chart function
   doesn't.
3. In your own words: why did `st.line_chart(iris_dataframe)` in Cell 1 plot
   four confusing overlapping lines with no clear meaning, while
   `st.bar_chart(averages_by_species)` in Cell 2 produced something
   immediately readable? (Tie your answer to what each DataFrame's rows and
   columns actually represented before being handed to the chart function.)

Next lesson: caching — why an app that reruns everything on every click
needs a way to skip recomputing expensive things, and the two functions
Streamlit provides for it. Say "next lesson" when ready.
