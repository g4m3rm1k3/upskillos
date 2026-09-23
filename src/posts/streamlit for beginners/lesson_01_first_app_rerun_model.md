# Lesson 1 — Your First App & The Rerun Model

## Concept, in plain English

A Streamlit app is a plain Python script. There's no separate template file,
no routing, no HTML — you write Python top to bottom, and Streamlit turns
function calls like `st.write(...)` into things on a web page, in the exact
order you called them. The one idea that makes everything else in this
course make sense: **every time something on the page changes — a button
click, a slider move — Streamlit reruns your entire script from the top.**
Not just the part that changed; the whole file, again, start to finish. This
lesson proves that to you directly rather than just telling you.

## Setup

Streamlit apps don't run inside a notebook cell the way your other curricula
have — they run as a script via a command in a terminal, and open in a
browser tab. In Colab, there's an extra step to make this work since Colab
has no terminal of its own:

```python
!pip install streamlit -q
```

Run that in a cell first. Everything else this lesson writes goes into a
**separate `.py` file**, not a notebook cell — Colab can write a file for you
using `%%writefile` at the top of a cell, which is what Cell 2 below does.

## Type this — Cell 1 (Colab, one-time setup)

```python
!pip install streamlit -q
!wget -q -O - https://loca.lt/mytunnelpassword
```

The second line gets an IP address you'll paste into a browser in a moment —
Colab has no public URL of its own, so this lesson uses a small tunneling
tool (`localtunnel`) to expose the app to a real browser tab. Keep the
printed IP address visible; you'll need it in Cell 4.

## Type this — Cell 2

This writes your very first app to a file called `app.py`. Note the
`%%writefile app.py` line — it must be the *first* line of the cell, and it
means "everything below this, write to the file `app.py`" instead of running
it directly:

```python
%%writefile app.py
import streamlit as st

st.write("Hello, this is my first Streamlit app")
```

Run the cell. You won't see the app yet — you've only written the file so
far, not launched it.

## Type this — Cell 3

Launch it, in the background, and tunnel it out to a public URL:

```python
!streamlit run app.py &>/content/logs.txt &
!npx localtunnel --port 8501
```

This prints a URL ending in `.loca.lt`. Open it in a new browser tab, and
when prompted for a "tunnel password," paste the IP address Cell 1 printed.

## What just happened

You should see a webpage with the text "Hello, this is my first Streamlit
app" — one line of Python (`st.write(...)`) became a real, live web page.
Leave this tab open; you'll rerun Cell 2 and Cell 3 together each time you
change `app.py` in this lesson (edit Cell 2's content, rerun Cell 2, then
rerun Cell 3 — Streamlit needs restarting to pick up file changes in this
Colab setup).

## Type this — Cell 2, revised — proving the rerun model

Replace Cell 2's content and rerun it, then rerun Cell 3:

```python
%%writefile app.py
import streamlit as st
import random

st.write("Hello, this is my first Streamlit app")
st.write("A random number:", random.randint(1, 100))

if st.button("Click me"):
    st.write("You clicked the button!")
```

Refresh your browser tab. Click the button a few times, and separately,
refresh the page itself a few times without clicking anything.

## What just happened

Watch the random number. It changes *every single time* you click the
button — not just when you refresh the page. That's the proof: clicking
`st.button` didn't run some isolated "button handler" function the way a
traditional web framework would. It reran the *entire script*, top to
bottom, including the `random.randint(...)` line that has nothing to do with
the button. `st.button("Click me")` returns `True` for exactly one rerun —
the one immediately triggered by the click — and `False` every other time,
including the very first load. That's the entire mechanism behind every
interactive widget you'll meet in this course: **the widget's current value
is just whatever it returns on this particular rerun.**

## Type this — Cell 2, revised again

```python
%%writefile app.py
import streamlit as st
import random

st.write("This line runs on every single rerun")
number = random.randint(1, 100)
st.write("Random number this rerun:", number)

count = 0
if st.button("Increment"):
    count = count + 1
st.write("Count is:", count)
```

Rerun Cell 2, rerun Cell 3, refresh the browser, and click "Increment"
several times.

## What just happened

`count` stays stuck at either `0` or `1` no matter how many times you click —
never `2`, `3`, `4`. Each click reruns the whole script from scratch,
which means `count = 0` runs again every time, before the `if` check. There
is currently no way for this script to "remember" anything between reruns —
Lesson 7 (`st.session_state`) is the fix for exactly this problem. For now,
sit with this limitation; understanding *why* it happens is the actual point
of this lesson.

## Checkpoint exercise

1. Add a second `st.button` with a different label, and a second `if` block
   using it. Click each button a few times and confirm only the button you
   *just* clicked shows its message on that particular rerun — Streamlit
   only counts one widget as freshly-clicked per rerun.
2. Add a `st.write` line at the very top of the script, before anything
   else, printing today's random number range you chose — confirm it
   appears at the top of the page every time, proving top-to-bottom order
   is preserved on every rerun, not just the first load.
3. In your own words, write one sentence explaining why a traditional
   framework's "event handler" mental model (one function runs only when its
   specific button is clicked) doesn't apply here — tie your answer to what
   you watched happen to the random number and the counter above.

Next lesson covers the widgets themselves — sliders, text input, checkboxes —
now that you understand what "the widget's value" actually means under the
hood. Say "next lesson" when ready.
