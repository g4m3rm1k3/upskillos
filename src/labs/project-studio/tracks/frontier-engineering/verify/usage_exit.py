# Lesson 1.5's prediction: the exit code when the command is run with no arguments.
import subprocess
import sys

result = subprocess.run([sys.executable, "-m", "frontier.textstats_cli"], capture_output=True, text=True)
print(result.returncode)
