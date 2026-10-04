# Lesson 6.2: after 50 episodes, which has the lower error: the best TD step or the best MC step?
import numpy as np

from walk_view import LEARNERS
from walk import error_curve

after_50 = {name: np.mean([error_curve(make, 50, seed)[-1] for seed in range(100)]) for name, _, make in LEARNERS}
best_td = min(v for name, v in after_50.items() if name.startswith("TD"))
best_mc = min(v for name, v in after_50.items() if name.startswith("MC"))
print("TD, at every step size tried" if max(v for n, v in after_50.items() if n.startswith("TD")) < best_mc else (best_td, best_mc))
