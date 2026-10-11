from bins import BinnedCartPole, COUNTS, LIMITS
from evaluate import greedy_lengths
from policies import always_left, lean, lean_ahead, play, random_push
from qlearning import train_q_learning
from returns import all_returns
from sarsa import train_sarsa

RULES = {"always_left": always_left, "random_push": random_push, "lean": lean, "lean_ahead": lean_ahead}


def play_rule(rule="lean_ahead", seed=0):
    """One game with one of the rules in policies.py, picked by its name."""
    total, trail = play(RULES[rule], seed)
    return total


def game_returns(rule="lean", seed=0, gamma=0.9):
    """One game's rewards, then the return from every step of it."""
    total, trail = play(RULES[rule], seed)
    rewards = [1.0] * int(total)
    returns = all_returns(rewards, gamma)
    return returns


def play_binned(seed=0):
    """One game with "lean ahead" in the binned world: the state number seen at every step."""
    env = BinnedCartPole()
    state, info = env.reset(seed=seed)
    seen = [state]
    done = False
    while not done:
        action = lean_ahead(env.world.state, None)
        state, reward, terminated, truncated, info = env.step(action)
        seen.append(state)
        done = terminated or truncated
    return seen


def learn_q(counts=COUNTS, limits=LIMITS, **settings):
    """Q-learning on the binned CartPole; settings are train_q_learning's (episodes, alpha, ...)."""
    env = BinnedCartPole(counts, limits)
    Q, totals = train_q_learning(env, **settings)
    return Q, totals, greedy_lengths(Q, env)


def learn_sarsa(counts=COUNTS, limits=LIMITS, **settings):
    """SARSA on the binned CartPole; settings are train_sarsa's."""
    env = BinnedCartPole(counts, limits)
    Q, totals = train_sarsa(env, **settings)
    return Q, totals, greedy_lengths(Q, env)
