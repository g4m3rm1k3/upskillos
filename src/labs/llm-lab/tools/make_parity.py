"""Records what the Python programs compute, for engine/parity.test.js to compare the JavaScript
engine against, number for number. Run from src/labs/llm-lab:

    node ../../../scripts/frontier-safe-run.mjs --timeout 300 -- python3 tools/make_parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

from arith import notebook, complete, exact_match, QUESTIONS  # noqa: E402
from gpt import init_model  # noqa: E402
from pretrain import pretrain  # noqa: E402

model, losses = pretrain()
out = {
    "notebook_start": notebook()[:120],
    "init_tok_row0": init_model(17)["tok"][0],
    "losses_first": losses[:50],
    "losses_last": losses[-50:],
    "completions": [complete(model, a, b) for a, b in QUESTIONS],
    "exact_match": exact_match(model),
    "out_row0": model["out"][0],
}
with open(os.path.join(HERE, "..", "engine", "parity.json"), "w", encoding="utf-8") as f:
    json.dump(out, f)
print("exact match", out["exact_match"])
