import torch

from dqn import DQNAgent, train_dqn
from seen_maze import SMALL_MAZE

PATH = "small_maze_dqn.pt"


def save_agent(agent, path=PATH):
    torch.save(agent.net.state_dict(), path)


def load_agent(path=PATH, maze=SMALL_MAZE):
    agent = DQNAgent(maze.size, epsilon=0.0)
    agent.net.load_state_dict(torch.load(path))
    return agent


if __name__ == "__main__":
    agent, solved_at = train_dqn()
    save_agent(agent)
    print(f"solved at episode {solved_at}; saved to {PATH}")
