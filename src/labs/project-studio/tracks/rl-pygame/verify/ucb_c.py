# Lesson 3.3: which earns more over 500 pulls, UCB with c = 2 or c = 0.5?
import numpy as np

from bandit import UCBLearner
from experiment import run_once

totals = {}
for c in (2.0, 0.5):
    totals[c] = np.array([run_once(lambda k, r: UCBLearner(k, r, c=c), 5, 500, s)[0].sum() for s in range(300)])
lead = totals[0.5] - totals[2.0]
assert abs(lead.mean()) > 2 * lead.std(ddof=1) / np.sqrt(len(lead)), "difference within the noise"
print("c = 0.5" if lead.mean() > 0 else "c = 2")
