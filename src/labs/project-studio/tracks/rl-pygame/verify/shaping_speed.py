# Lesson 7.5: after 30 episodes, which shaping has found the optimal maze route most often?
import numpy as np

from shaping_race import SHAPINGS, curve

optimal = {name: np.mean([curve(potential_of, seed)[2] > 0.2058 for seed in range(20)]) for name, _, potential_of in SHAPINGS}
print(max(optimal, key=optimal.get))
