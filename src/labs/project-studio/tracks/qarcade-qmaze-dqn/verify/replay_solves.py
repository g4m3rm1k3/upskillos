# The episode at which the replay agent first solves every start of the small maze (seed 0).
import contextlib
import io

from dqn import train_dqn

with contextlib.redirect_stdout(io.StringIO()):
    agent, solved_at = train_dqn()
print(solved_at)
