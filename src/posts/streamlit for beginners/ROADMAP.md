# Streamlit — Roadmap

**Format:** same as your other curricula — read a lesson here, type the code
into your own growing Streamlit app yourself, run it, see what changed, then
the next small piece. Streamlit is a Python library for turning a plain
script into an interactive web app with no HTML/CSS/JS required, which makes
it the natural front end for anything from your [[ml-math-curriculum]] —
a model you trained by hand can get a real UI in a few lines.

One thing that makes Streamlit different from anything in your other
curricula: **the whole script reruns top to bottom every time the user
interacts with anything** (moves a slider, clicks a button). There's no event
loop, no callbacks to wire up by hand — Streamlit's mental model *is* "rerun
the script, redraw everything." Lesson 1 makes this concrete immediately,
since it explains almost everything unusual about how Streamlit code is
written from then on.

Requires `pip install streamlit` in Colab, or running locally — Lesson 1
covers both.

---

1. **Your first app & the rerun model** — `st.write`, running the app,
   and the "whole script reruns on every interaction" mental model, proven
   to yourself directly rather than just stated.
2. **Widgets & interactivity** — sliders, buttons, text input, checkboxes;
   each widget's current value as a plain Python variable available
   immediately after you call it, no event handler needed.
3. **Layout** — columns, the sidebar, tabs, and containers, for arranging
   more than one thing on the page without it all just stacking vertically.
4. **Displaying data** — `st.dataframe`, `st.table`, `st.metric`, tying in
   a real dataset (reusing one from [[ml-math-curriculum]] where useful).
5. **Charts** — Streamlit's native `st.line_chart`/`st.bar_chart`, then
   embedding a real matplotlib or Plotly figure when you need more control.
6. **Caching** — `st.cache_data`/`st.cache_resource`, and *why* they exist
   given Lesson 1's rerun-everything model — without caching, an expensive
   computation reruns on every single click.
7. **Session state** — `st.session_state`, for the cases where you need a
   value to persist *across* reruns instead of being recomputed each time
   (a running counter, a multi-step form).
8. **File uploads & forms** — `st.file_uploader`, `st.form` for grouping
   inputs so the app doesn't rerun on every keystroke, only on submit.
9. **Serving a trained model** — load one of your hand-built or
   PyTorch-trained models from [[ml-math-curriculum]], build a real
   prediction UI around it: inputs in, prediction out, on one page.
10. **Capstone — multi-page app** — assembling several of the above into a
    small multi-page Streamlit app, the shape a real project would take.

Say "next lesson" any time you're ready, or "redo lesson N" to revisit one.
