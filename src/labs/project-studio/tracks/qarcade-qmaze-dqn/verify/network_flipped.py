# The saved network, and a table trained the same way, on the small maze flipped over its diagonal.
from dqn import ByCell
from maze_tools import completion
from rewards import train_maze
from seen_maze import SMALL_MAZE
from trained import load_agent

flipped = SMALL_MAZE.T.copy()
network = completion(ByCell(load_agent(), flipped), flipped)[0]
table = completion(train_maze(maze=SMALL_MAZE), flipped)[0]
print("No better than the table: it learned one maze too" if network <= table else f"network {network}, table {table}")
