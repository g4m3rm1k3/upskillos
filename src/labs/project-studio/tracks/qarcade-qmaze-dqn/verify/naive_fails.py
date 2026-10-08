# How many starts the step-by-step network agent solves after 400 episodes (seed 0).
import contextlib
import io

from dqn import train_dqn
from maze_tools import completion
from dqn import ByCell
from seen_maze import SMALL_MAZE

with contextlib.redirect_stdout(io.StringIO()):
    agent, solved_at = train_dqn(check_every=400)
wins = completion(ByCell(agent, SMALL_MAZE), SMALL_MAZE)[0]
print("Almost none" if wins <= 5 else wins)
