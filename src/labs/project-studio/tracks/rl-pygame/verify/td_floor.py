# Lesson 6.2: with step 0.1, does TD's error keep falling between episode 50 and episode 100?
import numpy as np

from learners import TDPredictor
from walk import error_curve

mean = np.mean([error_curve(lambda n, m, r: TDPredictor(n, m, r, step=0.1), 100, seed) for seed in range(100)], axis=0)
print("It bottoms out and creeps back up" if mean[99] > mean[49] else "It keeps falling")
