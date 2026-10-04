# Lesson 3.3: in a drifting room, which step finds the best machine more often late in the run?
import numpy as np

from bandit import DriftingBandit, Learner
from experiment import Experiment

share = {}
for name, step in (("step 1/N", None), ("step 0.1", 0.1)):
    exp = Experiment(lambda k, r: Learner(k, r, epsilon=0.1, step=step), steps=2000, make_bandit=DriftingBandit)
    exp.add_runs(150)
    share[name] = exp.curves()[2][-500:].mean()
print(max(share, key=share.get))
