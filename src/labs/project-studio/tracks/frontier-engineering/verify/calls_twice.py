# Lesson 1.1's prediction: what does a second call to go() report as the word count?
import contextlib
import io
import sys

sys.argv = ["textstats.py"]
with contextlib.redirect_stdout(io.StringIO()):
    import textstats
    textstats.go("data/sample.txt")
    textstats.go("data/sample.txt")
    second = textstats.total
print(second)
