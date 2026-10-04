# Lesson 4.1: the fewest steps from S to G on the "walls" map, by breadth-first search.
from collections import deque

from grid import MAPS, GridWorld

env = GridWorld(MAPS["walls"])
goal = env.find("G")
distance = {env.start: 0}
queue = deque([env.start])
while queue:
    cell = queue.popleft()
    for action in range(env.n_actions):
        nxt = env.next_cell(cell, action)
        if nxt not in distance and env.tile(nxt) != "H":
            distance[nxt] = distance[cell] + 1
            queue.append(nxt)
print(distance[goal])
