# Lesson 1.2's prediction: with the globals gone, what does a second call to go() print as words:?
import contextlib
import io

import textstats

out = io.StringIO()
with contextlib.redirect_stdout(out):
    textstats.go("data/sample.txt")
    textstats.go("data/sample.txt")
print([line for line in out.getvalue().splitlines() if line.startswith("words:")][-1].split()[-1])
