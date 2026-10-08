import numpy as np

from qlearning import q_update
from qtable import greedy, make_table


class QAgent:
    def __init__(self, n_states, n_actions, alpha=0.5, gamma=0.9, epsilon=0.1, seed=0):
        self.Q = make_table(n_states, n_actions)
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.rng = np.random.default_rng(seed)

    def act(self, state):
        if self.rng.random() < self.epsilon:
            return int(self.rng.integers(self.Q.shape[1]))
        return greedy(self.Q[state], self.rng)

    def learn(self, state, action, reward, next_state, terminated):
        q_update(self.Q, state, action, reward, next_state, terminated, self.alpha, self.gamma)
