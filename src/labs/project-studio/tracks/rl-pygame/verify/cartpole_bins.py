# Lesson 8.3: after 1000 episodes, which balances longer: 4 coarse states or 72?
import numpy as np

from balance import train_balancer

late = {}
for bins in ((1, 1, 2, 2), (1, 1, 6, 12)):
    late[bins] = np.mean([train_balancer(seed=s, episodes=1000, bins=bins)[1][-100:].mean() for s in (0, 2)])
print("72 states, by a wide margin" if late[(1, 1, 6, 12)] > 1.5 * late[(1, 1, 2, 2)] else late)
