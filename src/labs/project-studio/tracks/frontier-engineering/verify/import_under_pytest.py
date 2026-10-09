# Lesson 1.2's prediction: what does `import textstats` do when sys.argv is pytest's?
import contextlib
import io
import sys

sys.argv = ["pytest", "-q", "tests/test_pieces.py"]
out = io.StringIO()
try:
    with contextlib.redirect_stdout(out):
        import textstats
    print("It prints the usage line" if "usage" in out.getvalue() else "Nothing: it just imports")
except SystemExit:
    print("It tries to read a file named -q, and exits" if "couldn't read -q" in out.getvalue() else out.getvalue())
