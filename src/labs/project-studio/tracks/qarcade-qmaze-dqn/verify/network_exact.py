# From how many of the small maze's 33 starts the saved network takes exactly the shortest route.
from dqn import ByCell
from maze_tools import extra_steps
from seen_maze import SMALL_MAZE
from trained import load_agent

extra = extra_steps(ByCell(load_agent(), SMALL_MAZE), SMALL_MAZE)
print(extra.count(0))
