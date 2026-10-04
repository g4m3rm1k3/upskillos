# Lesson 7.3: starting every Q at 1.0 (step 1/N, epsilon 0.1): better or worse than starting at 0?
import numpy as np

from evaluate_view import make_env
from learners import QLearning
from tuning import final_value


def maker(initial):
    return lambda env, seed: QLearning(env.n_states, env.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=0.9, initial=initial)


zero = np.mean([final_value(make_env, maker(0.0), seed, 300, 0.9) for seed in range(10)])
one = np.mean([final_value(make_env, maker(1.0), seed, 300, 0.9) for seed in range(10)])
print("Much worse" if one < zero - 0.1 else (zero, one))
