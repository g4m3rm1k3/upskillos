"""Checks that python/gridworld.py builds the same transition table as Gymnasium's own
FrozenLake-v1 (4 x 4 and 8 x 8, slippery) and CliffWalking-v1. The comparison itself is
python/gym_compare.py, which lesson 2.6 teaches. Exits 1 if anything differs.

    python src/labs/qmaze-lab/tools/check_gymnasium.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python"))

from gym_compare import compare_all  # noqa: E402

if __name__ == "__main__":
    sys.exit(1 if any(compare_all().values()) else 0)
