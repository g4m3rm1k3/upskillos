# The fewest moves from (0, 0) to the cheese, by breadth-first search.
from collections import deque

from qmaze import MOVES, QMaze

env = QMaze()
distance = {(0, 0): 0}
queue = deque([(0, 0)])
while queue:
    row, col = queue.popleft()
    for d_row, d_col in MOVES.values():
        cell = (row + d_row, col + d_col)
        if env.is_free(*cell) and cell not in distance:
            distance[cell] = distance[(row, col)] + 1
            queue.append(cell)
print(distance[env.target])
