import math
import random

from cartpole import CartPole
from returns import all_returns


def scores_of(weights, state):
    """One score per push: that push's 4 weights times the 4 numbers, added up (a dot product)."""
    return [sum(w * v for w, v in zip(row, state)) for row in weights]


def softmax(scores):
    """Scores into probabilities: e to the power of each, divided by the total."""
    top = max(scores)
    powers = [math.exp(s - top) for s in scores]
    total = sum(powers)
    return [p / total for p in powers]


def reinforce_step(weights, states, actions, chances, returns, rate):
    """One REINFORCE update from a whole game: every push made likelier by how much better than usual its return was."""
    baseline = sum(returns) / len(returns)
    for state, action, probs, G in zip(states, actions, chances, returns):
        advantage = G - baseline
        for a in range(len(weights)):
            slope = (1.0 if a == action else 0.0) - probs[a]
            for i in range(len(state)):
                weights[a][i] += rate * advantage * slope * state[i] / len(states)
    return baseline


def train_linear(episodes=300, rate=0.1, gamma=0.99, seed=0):
    rng = random.Random(seed)
    env = CartPole()
    weights = [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]]
    lengths = []
    for episode in range(episodes):
        state, info = env.reset(seed=seed if episode == 0 else None)
        states, actions, chances, rewards = [], [], [], []
        done = False
        while not done:
            probs = softmax(scores_of(weights, state))
            action = 0 if rng.random() < probs[0] else 1
            next_state, reward, terminated, truncated, info = env.step(action)
            states.append(state)
            actions.append(action)
            chances.append(probs)
            rewards.append(reward)
            state = next_state
            done = terminated or truncated
        returns = all_returns(rewards, gamma)
        reinforce_step(weights, states, actions, chances, returns, rate)
        lengths.append(len(rewards))
    return weights, lengths
