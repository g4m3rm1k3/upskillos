# Lesson 7.1: which learner earns the least per episode while learning (episodes 401-500, 20 runs)?
import numpy as np

from cliff_race import LEARNERS, play

late = {name: np.mean([play(cls, seed)[0][-100:].mean() for seed in range(20)]) for name, _, cls in LEARNERS}
print(min(late, key=late.get))
