from agent import QAgent
from corridor import COIN, START, TREASURE, Corridor
from train import run_episode, train


def which_end(gamma, episodes=1000, seed=0):
    agent = QAgent(Corridor.n_states, Corridor.n_actions, gamma=gamma, epsilon=0.3, seed=seed)
    train(Corridor(), agent, episodes)
    agent.epsilon = 0.0
    env = Corridor()
    run_episode(env, agent, learn=False)
    if env.cell == TREASURE:
        return "treasure"
    if env.cell == COIN:
        return "coin"
    return "neither"


if __name__ == "__main__":
    for gamma in (0.9, 0.5, 0.35, 0.3, 0.1):
        print(f"gamma {gamma}: {which_end(gamma)}")
