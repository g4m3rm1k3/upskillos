# Lesson 7.5: what does the potential -0.1 * distance do to learning on the maze?
import numpy as np

from shaping_race import SHAPINGS, curve

bad = dict((name, potential_of) for name, _, potential_of in SHAPINGS)["potential -0.1 * distance"]
final = np.mean([curve(bad, seed)[-1] for seed in range(10)])
print("Nothing is learned: standing still pays" if final < 0.01 else final)
