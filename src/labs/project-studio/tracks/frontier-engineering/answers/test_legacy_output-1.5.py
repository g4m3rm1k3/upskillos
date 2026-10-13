# Pins what the frontier-textstats command prints (lesson 1.1; runs the command since lesson 1.5).
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_sample_report_unchanged():
    result = subprocess.run(
        [sys.executable, "-m", "frontier.textstats_cli", "data/sample.txt"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    expected = (ROOT / "tests" / "golden" / "sample.txt").read_text(encoding="utf-8")
    assert result.stdout == expected
