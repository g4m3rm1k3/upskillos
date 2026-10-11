import gymnasium as gym

from gym_compare import CLIFF_ACTION, FROZEN_LAKE_ACTION


class GymGrid:
    """A Gymnasium grid world with the attributes this lab's learners use (n_states, n_actions)
    and this lab's action numbers (LEFT, UP, RIGHT, DOWN = 0, 1, 2, 3)."""

    def __init__(self, env, action_map):
        self.env = env
        self.n_states = env.observation_space.n
        self.n_actions = env.action_space.n
        self.action_map = action_map

    def reset(self, seed=None):
        state, info = self.env.reset(seed=seed)
        return int(state), info

    def step(self, action):
        state, reward, terminated, truncated, info = self.env.step(self.action_map[action])
        return int(state), float(reward), terminated, truncated, info


def frozen_lake(map_name="4x4"):
    return GymGrid(gym.make("FrozenLake-v1", map_name=map_name, is_slippery=True), FROZEN_LAKE_ACTION)


def cliff_walking():
    return GymGrid(gym.make("CliffWalking-v1"), CLIFF_ACTION)
