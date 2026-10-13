# Lesson 1.4's prediction: what does print show for a TextStats?
import contextlib
import io

from frontier.text import TextStats

out = io.StringIO()
with contextlib.redirect_stdout(out):
    print(TextStats(2, 6, 4, "the", 3.0, [], []))
shown = out.getvalue()
if shown.startswith("TextStats(lines=2, words=6"):
    print("the class name with every field's name and value")
elif "object at 0x" in shown:
    print("<frontier.text.TextStats object at 0x...>")
else:
    print("just the values, as a tuple")
