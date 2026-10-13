# Lesson 3.2's prediction: what an ordinary run writes on stderr, with info messages but no setup.
import subprocess
import sys

result = subprocess.run([sys.executable, "-m", "frontier.textstats_cli", "data/sample.txt"], capture_output=True, text=True)
print("nothing" if result.stderr == "" else result.stderr)
