# Lesson 7.1: how many steps is Expected SARSA's greedy route, in most of 10 runs?
from collections import Counter

from cliff_race import play
from learners import ExpectedSarsa

lengths = Counter(len(route) - 1 for route in (play(ExpectedSarsa, seed)[1] for seed in range(10)) if route)
print(lengths.most_common(1)[0][0])
