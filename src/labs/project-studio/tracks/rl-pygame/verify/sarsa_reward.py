# Lesson 6.3: SARSA's average reward per episode over episodes 401-500, across 10 runs.
import numpy as np

from training import train
from watch_cliff import make_cliff, make_sarsa

late = [train(make_cliff(), make_sarsa(make_cliff(), seed), 500, seed=seed)[-100:].mean() for seed in range(10)]
print("About -25: still worse than -17" if -35 < np.mean(late) < -19 else np.mean(late))
