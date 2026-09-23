# Lesson 4 — Displaying Data

## Concept, in plain English

So far every widget and every `st.write` call has been one piece of text or
one number. Real data science apps usually center on a table of many rows —
Streamlit has purpose-built functions for that, plus `st.metric`, a small
labeled number display built specifically for dashboards (a single value,
optionally with a "changed by this much" indicator).

## Type this — Cell 1 (continuing your Colab setup)

Reuse Lesson 7's Iris subset from your ML curriculum — a small real dataset,
already familiar:

```python
%%writefile app.py
import streamlit as st
from sklearn.datasets import load_iris
import pandas as pd

iris = load_iris()
iris_dataframe = pd.DataFrame(iris.data, columns=iris.feature_names)
iris_dataframe["species"] = [iris.target_names[i] for i in iris.target]

st.write("## Iris dataset")
st.dataframe(iris_dataframe)
```

Rerun the launch cell from Lesson 1, refresh your browser tab.

## What just happened

`st.dataframe(...)` renders a pandas DataFrame as an interactive table —
sortable by clicking column headers, scrollable if it's tall, resizable
columns. Nothing about the data itself is new (this is the exact dataset
from Lesson 7 of your ML curriculum); what's new is `st.dataframe` doing the
table rendering for you, no manual HTML.

## Type this — Cell 1, revised — `st.table` for comparison

```python
%%writefile app.py
import streamlit as st
from sklearn.datasets import load_iris
import pandas as pd

iris = load_iris()
iris_dataframe = pd.DataFrame(iris.data, columns=iris.feature_names)
iris_dataframe["species"] = [iris.target_names[i] for i in iris.target]

st.write("## st.dataframe (interactive)")
st.dataframe(iris_dataframe.head(10))

st.write("## st.table (static)")
st.table(iris_dataframe.head(10))
```

Rerun and refresh.

## What just happened

`st.table` renders the whole thing as a static HTML table — no sorting, no
scrolling, sized to fit its content exactly. `.head(10)` (plain pandas, not
Streamlit) keeps both examples small enough to compare side by side.
`st.table` fits a small, fixed summary; `st.dataframe` fits anything the
user might want to explore.

## Type this — Cell 1, revised — filtering data with a widget, tying Lesson 2 together

```python
%%writefile app.py
import streamlit as st
from sklearn.datasets import load_iris
import pandas as pd

iris = load_iris()
iris_dataframe = pd.DataFrame(iris.data, columns=iris.feature_names)
iris_dataframe["species"] = [iris.target_names[i] for i in iris.target]

st.write("## Filter by species")
selected_species = st.selectbox("Species", iris.target_names)

filtered_dataframe = iris_dataframe[iris_dataframe["species"] == selected_species]
st.write(f"Showing {len(filtered_dataframe)} rows")
st.dataframe(filtered_dataframe)
```

Rerun and refresh, change the dropdown.

## What just happened

This is Lesson 1's rerun model again, now applied to real data: changing
`selected_species` triggers a full rerun, `filtered_dataframe` gets
recomputed from scratch with the new filter, and the table updates. No
manual "refresh the table" step exists because the whole script already
reruns on every interaction — you get this behavior for free just by
writing ordinary pandas filtering code after the widget call.

## Type this — Cell 1, revised — `st.metric`

```python
%%writefile app.py
import streamlit as st
from sklearn.datasets import load_iris
import pandas as pd

iris = load_iris()
iris_dataframe = pd.DataFrame(iris.data, columns=iris.feature_names)
iris_dataframe["species"] = [iris.target_names[i] for i in iris.target]

st.write("## Species overview")
selected_species = st.selectbox("Species", iris.target_names)
filtered_dataframe = iris_dataframe[iris_dataframe["species"] == selected_species]

average_petal_length = filtered_dataframe["petal length (cm)"].mean()
overall_average = iris_dataframe["petal length (cm)"].mean()
difference_from_overall = average_petal_length - overall_average

metric_column_1, metric_column_2 = st.columns(2)
with metric_column_1:
    st.metric("Row count", len(filtered_dataframe))
with metric_column_2:
    st.metric("Avg petal length (cm)", round(average_petal_length, 2), delta=round(difference_from_overall, 2))
```

Rerun and refresh, switch between species.

## What just happened

`st.metric`'s third argument, `delta`, adds a small colored up/down
indicator — green with an up arrow for positive, red with a down arrow for
negative, calculated here as this species' average versus the overall
dataset average, computed fresh with plain pandas math on every rerun,
same as the filtered row count.

## Checkpoint exercise

1. Add a `st.multiselect` (look up its call signature — similar to
   `st.selectbox` but lets the user pick several options at once) letting
   the user compare more than one species' rows in the same table.
2. Add a second pair of `st.metric` calls for a different column (e.g.
   `"sepal width (cm)"`), reusing the same `delta`-from-overall-average
   pattern.
3. In your own words: why does `filtered_dataframe` need to be recomputed
   from `iris_dataframe` on every single rerun, rather than being computed
   once and reused? (Tie your answer back to Lesson 1's rerun model — this
   is also the exact motivation for Lesson 6's caching lesson, so it's worth
   really sitting with the "why" here.)

Next lesson: charts — Streamlit's built-in chart functions, then embedding a
real matplotlib or Plotly figure when you need more control. Say "next
lesson" when ready.
