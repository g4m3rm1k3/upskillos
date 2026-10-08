# Over 200 seeds, which value in the table becomes positive first, most often.
from collections import Counter

from agent import QAgent
from corridor import Corridor
from watch_corridor import Watcher

NAMES = {(1, 0): "Q(1, left), the coin", (3, 1): "Q(3, right), the treasure", (1, 1): "Q(1, right)"}
firsts = Counter()
for seed in range(200):
    agent = QAgent(5, 2, epsilon=0.3, seed=seed)
    watcher = Watcher(Corridor(), agent)
    while (agent.Q[1:4] <= 0).all():
        watcher.advance()
    for cell in (1, 2, 3):
        for action in (0, 1):
            if agent.Q[cell, action] > 0:
                firsts[NAMES.get((cell, action), f"Q({cell}, {action})")] += 1
print(firsts.most_common(1)[0][0])
