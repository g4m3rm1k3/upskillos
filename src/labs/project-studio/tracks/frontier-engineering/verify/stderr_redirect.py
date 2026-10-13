# Lesson 1.5's prediction: what reaches out.txt when the error message goes to stderr?
import subprocess
import sys

result = subprocess.run([sys.executable, "-m", "frontier.textstats_cli", "no-such-file.txt"], capture_output=True, text=True)
print("nothing" if result.stdout == "" else "the error message")
