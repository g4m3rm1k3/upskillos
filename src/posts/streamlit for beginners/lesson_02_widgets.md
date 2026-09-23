# Lesson 2 — Widgets & Interactivity

## Concept, in plain English

Lesson 1 showed that `st.button(...)` returns `True` or `False` depending on
whether it was just clicked. Every other widget follows the exact same
pattern: call it, get its *current value* back immediately as an ordinary
Python variable, use that variable like any other. There's no separate step
to "read" a widget's value and no callback function to register — the
function call *is* both the display and the read, in one line.

## Type this — Cell 1 (continuing Lesson 1's Colab setup — rerun the pip
install and tunnel-password cells if this is a fresh session)

```python
%%writefile app.py
import streamlit as st

name = st.text_input("What's your name?")
st.write("Hello,", name)
```

Rerun the launch cell from Lesson 1 (`!streamlit run app.py &>/content/logs.txt & ` /
`!npx localtunnel --port 8501`), refresh your browser tab, and type into the
text box.

## What just happened

As you type, the page updates after each keystroke — each keystroke triggers
a rerun, `st.text_input(...)` returns whatever's currently in the box on
*this* rerun, and `st.write("Hello,", name)` runs again with the new value.
This is Lesson 1's rerun model in action on a text box instead of a button.

## Type this — Cell 1, revised — a slider

```python
%%writefile app.py
import streamlit as st

age = st.slider("Select your age", min_value=0, max_value=100, value=25)
st.write("You are", age, "years old")

if age >= 65:
    st.write("Eligible for a senior discount")
```

Rerun the launch cell, refresh, drag the slider.

## What just happened

`value=25` sets where the slider starts on first load — not a "default" in
the sense of a fallback if the user does nothing, but literally the value
`st.slider` returns on the very first rerun, before any dragging has
happened. Every rerun after that returns wherever the slider currently sits.
The `if age >= 65` check runs fresh every rerun too, exactly like Lesson 1's
button check.

## Type this — Cell 1, revised — checkboxes and select boxes

```python
%%writefile app.py
import streamlit as st

show_details = st.checkbox("Show extra details")
favorite_language = st.selectbox("Favorite language", ["Python", "JavaScript", "Other"])

st.write("You picked:", favorite_language)

if show_details:
    st.write("Details: you're learning Streamlit as part of a larger curriculum.")
```

Rerun the launch cell, refresh, toggle the checkbox and change the dropdown.

## What just happened

`st.checkbox` returns a plain `True`/`False`, same shape as `st.button` but
representing a persistent toggle state rather than a one-rerun pulse —
notice the checkbox *stays* checked across reruns triggered by *other*
widgets (try changing `favorite_language` and watch the checkbox not reset),
unlike `st.button`, which is only ever `True` on the one rerun immediately
following its click. `st.selectbox` returns whichever string is currently
selected from the list you gave it.

## Type this — Cell 1, revised — combining several widgets into one small
calculator

```python
%%writefile app.py
import streamlit as st

st.write("## Simple tip calculator")

bill_amount = st.number_input("Bill amount ($)", min_value=0.0, value=50.0)
tip_percentage = st.slider("Tip percentage", min_value=0, max_value=30, value=15)
split_between = st.number_input("Split between how many people?", min_value=1, value=1, step=1)

tip_amount = bill_amount * (tip_percentage / 100)
total_amount = bill_amount + tip_amount
amount_per_person = total_amount / split_between

st.write("Tip amount: $", round(tip_amount, 2))
st.write("Total: $", round(total_amount, 2))
st.write("Per person: $", round(amount_per_person, 2))
```

Rerun the launch cell, refresh, and adjust all three inputs.

## What just happened

Every widget's current value feeds directly into ordinary Python arithmetic,
and the whole calculation reruns fresh on every single interaction with any
of the three widgets — there's no "recalculate" button because there doesn't
need to be one; the rerun model means everything downstream of a widget is
always current.

## Checkpoint exercise

1. Add a `st.radio` widget (same call shape as `st.selectbox`, different
   visual style — look up its arguments) letting the user choose how the tip
   percentage rounds (e.g. "round to nearest 5%" vs "exact"), and adjust the
   calculation based on their choice.
2. Add a `st.checkbox` labeled "Round to nearest dollar" that, when checked,
   rounds `total_amount` and `amount_per_person` to whole dollars instead of
   cents.
3. In your own words: why does `st.number_input`'s `step=1` argument matter
   for `split_between` specifically, but wouldn't matter (or would need a
   different value) for `bill_amount`? Tie your answer to what kind of
   quantity each represents.

Next lesson: layout — columns, the sidebar, and tabs, so more than one
widget or chart doesn't just stack straight down the page. Say "next lesson"
when ready.
