from gridworld import GridWorld
from montecarlo import mc_evaluate, train_mc_control
from planning import value_iteration
from qlearning import train_q_learning
from sarsa import train_sarsa


def plan(name="cheese_and_cat", gamma=0.95):
    """Value iteration on one map: the exact V* and Q*, computed from P."""
    env = GridWorld(name)
    V, Q, sweeps = value_iteration(env.P, gamma)
    return V, Q, sweeps


def learn_q(name="cheese_and_cat", **settings):
    """Q-learning on one map; settings are train_q_learning's (episodes, alpha, gamma, ...)."""
    env = GridWorld(name)
    Q, totals = train_q_learning(env, **settings)
    return Q, totals


def learn_sarsa(name="cheese_and_cat", **settings):
    """SARSA on one map; settings are train_sarsa's."""
    env = GridWorld(name)
    Q, totals = train_sarsa(env, **settings)
    return Q, totals


def evaluate_mc(name="cheese_and_cat", **settings):
    """Monte Carlo prediction of the random policy's values on one map; settings are mc_evaluate's."""
    env = GridWorld(name)
    V = mc_evaluate(env, **settings)
    return V


def learn_mc(name="cheese_and_cat", **settings):
    """Monte Carlo control on one map; settings are train_mc_control's."""
    env = GridWorld(name)
    Q, totals = train_mc_control(env, **settings)
    return Q, totals
