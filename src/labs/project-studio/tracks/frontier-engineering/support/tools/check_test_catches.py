"""Check my work runs this in lesson 1.1: does your test notice a changed report?

It changes one word that textstats.py prints, runs tests/test_legacy_output.py,
then puts the script back exactly as it was. It passes only if your test failed.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
script = ROOT / "textstats.py"


def run_test():
    return subprocess.run(
        [sys.executable, "-m", "pytest", "-q", "tests/test_legacy_output.py"],
        cwd=ROOT, capture_output=True, text=True,
    )


if not (ROOT / "tests" / "test_legacy_output.py").exists():
    sys.exit("tests/test_legacy_output.py doesn't exist yet.")
if run_test().returncode != 0:
    sys.exit("Your test fails on the untouched script, so its failing proves nothing yet.")

original = script.read_bytes()
broken = original.replace(b'"lines: "', b'"line count: "', 1)
if broken == original:
    sys.exit('textstats.py has been changed. Put it back with:  git restore textstats.py')

script.write_bytes(broken)
try:
    result = run_test()
finally:
    script.write_bytes(original)

if result.returncode == 0:
    sys.exit("Your test still passed after the report changed, so it isn't comparing the output.")
print("Your test caught the change.")
