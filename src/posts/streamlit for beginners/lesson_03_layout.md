# Lesson 3 — Layout

## Concept, in plain English

Every widget and every `st.write` call so far has stacked straight down the
page, top to bottom, in the order you called it — Streamlit's default
layout. This lesson covers the handful of container objects that let you
break out of that single column: side-by-side columns, a persistent sidebar
panel, and tabs. The pattern for all of them is the same: get a container
object back from a function call, then use Python's `with` statement to say
"everything indented under here goes inside that container" — nothing new
mathematically or conceptually, just a new way to route where your existing
`st.write`/widget calls end up on the page.

## Type this — Cell 1 (continuing your Colab setup)

Columns — side by side instead of stacked:

```python
%%writefile app.py
import streamlit as st

st.write("## Side-by-side layout")

left_column, right_column = st.columns(2)

with left_column:
    st.write("This is the left column")
    st.button("Left button")

with right_column:
    st.write("This is the right column")
    st.button("Right button")
```

Rerun the launch cell, refresh your browser tab.

## What just happened

`st.columns(2)` returns two container objects — you get to name them
whatever you want, `left_column` and `right_column` here, matching Python's
usual multiple-assignment unpacking. Everything indented under `with
left_column:` renders inside that column; everything under `with
right_column:` renders inside the other. This is the same `st.write`/
`st.button` calls from Lessons 1–2, just placed into a different part of the
page.

## Type this — Cell 1, revised — uneven columns

```python
%%writefile app.py
import streamlit as st

st.write("## Uneven columns")

narrow_column, wide_column = st.columns([1, 3])

with narrow_column:
    st.write("Narrow (1 part)")

with wide_column:
    st.write("Wide (3 parts)")
```

Rerun and refresh.

## What just happened

`st.columns([1, 3])` (a list instead of a plain number) splits the row into
proportional widths — 1 part and 3 parts, so the second column ends up three
times as wide as the first. This is worth remembering for later lessons: a
chart or dataframe often wants a wide column next to a narrow one holding
controls.

## Type this — Cell 1, revised — the sidebar

```python
%%writefile app.py
import streamlit as st

st.sidebar.write("## Settings")
theme = st.sidebar.selectbox("Theme", ["Light", "Dark"])
show_advanced = st.sidebar.checkbox("Show advanced options")

st.write("## Main content")
st.write("Selected theme:", theme)

if show_advanced:
    st.write("Advanced options would go here")
```

Rerun and refresh.

## What just happened

`st.sidebar` is a container, just like the columns above, but a special
built-in one that always renders as a collapsible panel on the left side of
the page, persistent across whatever's happening in the main area. Notice
`st.sidebar.selectbox(...)` — you can call a widget function directly *on*
`st.sidebar` instead of using a `with` block, a shorthand for "put this one
thing in the sidebar" when you don't need to group several things together.

## Type this — Cell 1, revised — tabs

```python
%%writefile app.py
import streamlit as st

st.write("## Tabbed content")

tab_overview, tab_details, tab_settings = st.tabs(["Overview", "Details", "Settings"])

with tab_overview:
    st.write("This is the overview tab")

with tab_details:
    st.write("This is the details tab")
    st.slider("A slider that only matters in this tab", 0, 100)

with tab_settings:
    st.write("This is the settings tab")
```

Rerun and refresh, then click between the three tabs.

## What just happened

`st.tabs([...])` returns one container per label you gave it, same `with`
pattern as columns. Only the currently-selected tab's content is visible at
once — but here's a detail worth internalizing given Lesson 1's rerun model:
*all three tabs' code still runs on every rerun*, whether or not that tab is
currently visible. Switching tabs is itself a rerun (Streamlit tracks which
tab was last clicked), and hidden tabs' widgets still hold their values in
the background.

## Type this — Cell 1, revised — combining everything

```python
%%writefile app.py
import streamlit as st

st.sidebar.write("## Controls")
bill_amount = st.sidebar.number_input("Bill amount ($)", min_value=0.0, value=50.0)
tip_percentage = st.sidebar.slider("Tip percentage", 0, 30, 15)

st.write("## Tip Calculator")

tip_amount = bill_amount * (tip_percentage / 100)
total_amount = bill_amount + tip_amount

result_column, breakdown_column = st.columns([1, 1])

with result_column:
    st.write("### Total")
    st.write("$", round(total_amount, 2))

with breakdown_column:
    st.write("### Breakdown")
    st.write("Bill: $", bill_amount)
    st.write("Tip: $", round(tip_amount, 2))
```

## What just happened

This is Lesson 2's tip calculator, restructured: inputs moved to the
sidebar (so they're visible and out of the way regardless of what else the
main page shows), results split into two side-by-side columns. No new
computation — purely a layout change on top of logic you already had
working.

## Checkpoint exercise

1. Add a third tab-or-column section showing a per-person split (reuse
   Lesson 2's `split_between` widget), placed wherever you think fits best
   in this layout, and justify your placement choice in a comment.
2. Nest a pair of columns *inside* one of the tabs from the tabs example —
   confirm `with` blocks compose the way you'd expect from ordinary Python
   nesting.
3. In your own words: given Lesson 1's rerun model, why does it *not* cause
   a bug that all three tabs' code runs on every rerun even though only one
   is visible? (Hint: think about what would actually go wrong if a hidden
   tab's widget value were somehow not computed on a rerun where you then
   switched to that tab.)

Next lesson: displaying real data — dataframes, tables, and `st.metric`,
tying in a dataset from your ML curriculum. Say "next lesson" when ready.
