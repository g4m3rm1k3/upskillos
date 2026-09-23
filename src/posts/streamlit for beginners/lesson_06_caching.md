# Lesson 6 — Caching

## Concept, in plain English

Lesson 1 established the core fact this whole lesson is built on: every
interaction reruns your entire script. So far that's been harmless — loading
a small built-in dataset or computing an average takes microseconds, so
rerunning it 50 times as you click around is invisible. But imagine loading
a large file from disk, querying a database, or running a trained model's
prediction — something that takes real time. Without caching, *every single
click anywhere on the page* would redo that expensive work, even if nothing
relevant to it changed. `st.cache_data` and `st.cache_resource` are
Streamlit's fix: a decorator that says "remember this function's result, and
only actually rerun the function if its inputs changed."

## The distinction between the two

`st.cache_data` is for data — anything that can be copied safely (a
DataFrame, a list, a number). Streamlit returns a fresh copy each time so
one part of your app can't accidentally mutate another part's cached data.

`st.cache_resource` is for things that shouldn't be copied — a database
connection, a loaded machine learning model (like the ones you'll load in
Lesson 9). These are expensive or nonsensical to duplicate, so Streamlit
returns the *same* object every time instead of a copy.

## Type this — Cell 1 (continuing your Colab setup)

First, prove the problem exists — a deliberately slow function, uncached:

```python
%%writefile app.py
import streamlit as st
import time

def slow_calculation(number):
    time.sleep(3)
    return number * 2

st.write("## Uncached slow function")
input_number = st.slider("Pick a number", 1, 10)
result = slow_calculation(input_number)
st.write("Result:", result)

st.button("Click to force a rerun")
```

Rerun the launch cell from Lesson 1, refresh your browser tab. Move the
slider once, then click the button a few times, timing how long each rerun
takes to show a result.

## What just happened

Every single interaction — moving the slider *or* clicking the completely
unrelated button — takes the full 3 seconds, because `slow_calculation` runs
again from scratch every rerun, exactly as Lesson 1 predicted. This is the
concrete cost of the rerun model when real work is involved.

## Type this — Cell 1, revised — add the cache decorator

```python
%%writefile app.py
import streamlit as st
import time

@st.cache_data
def slow_calculation(number):
    time.sleep(3)
    return number * 2

st.write("## Cached slow function")
input_number = st.slider("Pick a number", 1, 10)
result = slow_calculation(input_number)
st.write("Result:", result)

st.button("Click to force a rerun")
```

Rerun the launch cell, refresh. Move the slider to a *new* value (wait for
the 3-second delay), then click the button several times without touching
the slider.

## What just happened

The first time you set the slider to any given number, it still takes 3
seconds — the function has to run at least once to have something to cache.
But clicking the unrelated button afterward is now instant: `@st.cache_data`
recognized that `slow_calculation` was called with the exact same
`input_number` argument as last time, and returned the stored result instead
of re-running the function. Move the slider to a value you haven't tried yet
and you'll see the 3-second delay again — a genuinely new input still has to
be computed once.

## Type this — Cell 1, revised — caching a data-loading function

A more realistic use: loading a dataset once, not on every rerun:

```python
%%writefile app.py
import streamlit as st
from sklearn.datasets import load_iris
import pandas as pd

@st.cache_data
def load_iris_dataframe():
    iris = load_iris()
    dataframe = pd.DataFrame(iris.data, columns=iris.feature_names)
    dataframe["species"] = [iris.target_names[i] for i in iris.target]
    return dataframe

st.write("## Cached data loading")
iris_dataframe = load_iris_dataframe()
selected_species = st.selectbox("Species", iris_dataframe["species"].unique())
st.dataframe(iris_dataframe[iris_dataframe["species"] == selected_species])
```

Rerun and refresh, then change the dropdown several times.

## What just happened

`load_iris_dataframe()` only actually rebuilds the DataFrame once (this
particular dataset loads fast enough that you won't feel a difference here,
but the pattern is exactly what you'd use for a slow database query or a
large file read) — every rerun triggered by the dropdown reuses the cached
DataFrame, and only the filtering (fast, and correctly *not* cached, since
its result depends on `selected_species`) recomputes each time.

## Type this — Cell 1, revised — `st.cache_resource`

```python
%%writefile app.py
import streamlit as st
import time

class ExpensiveResource:
    def __init__(self):
        time.sleep(2)
        self.created_at = time.time()

@st.cache_resource
def get_shared_resource():
    return ExpensiveResource()

st.write("## Cached resource")
resource = get_shared_resource()
st.write("Resource created at:", resource.created_at)

st.button("Click to force a rerun")
```

Rerun and refresh, then click the button several times.

## What just happened

`resource.created_at` stays exactly the same number across every click —
proof it's the *same object* every time, not a fresh copy, which is exactly
`st.cache_resource`'s guarantee. If you'd used `@st.cache_data` on a class
like this instead, Streamlit would try to copy the object on every call,
which is both wasteful and sometimes outright broken for objects that hold
open connections or large loaded models — this is the concrete reason the
two decorators exist separately.

## Checkpoint exercise

1. Add a second argument to `slow_calculation` (e.g. `multiplier`) and
   confirm the cache treats different `(number, multiplier)` combinations as
   genuinely different — each new combination pays the 3-second cost once,
   then is instant afterward.
2. Add a `st.button("Clear cache")` that calls `st.cache_data.clear()` when
   clicked, and confirm the next call to `slow_calculation` pays the
   3-second cost again even for an input you'd already cached.
3. In your own words: why would caching a function that reads live data from
   the internet (say, current stock prices) with no extra arguments be a bug
   waiting to happen, rather than a straightforward speedup? (Streamlit's
   `@st.cache_data(ttl=60)` — a time limit after which the cache expires —
   exists specifically for this case; look up what `ttl` stands for as part
   of answering.)

Next lesson: session state — the fix for Lesson 1's broken counter, for
values that need to persist across reruns rather than being recomputed from
scratch (or cached from the exact same inputs) every time. Say "next lesson"
when ready.
