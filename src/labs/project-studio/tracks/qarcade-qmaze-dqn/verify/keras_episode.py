# The episode at which the tutorial-style Keras agent solves every start of the small maze (seed 0).
import contextlib
import io

from tutorial_keras import qtrain

with contextlib.redirect_stdout(io.StringIO()):
    model, solved_at = qtrain()
print("About the same, around 200" if solved_at is not None and 120 <= solved_at <= 300 else solved_at)
