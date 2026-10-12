import random

from cartpole import CartPole
from linear_policy import scores_of, softmax, train_linear
from returns import all_returns


def play_game(weights, env, rng, seed=None, gamma=0.99):
    """One game with the linear policy, sampling every push; what REINFORCE remembers, and the returns."""
    state, info = env.reset(seed=seed)
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
    return states, actions, chances, all_returns(rewards, gamma)


def game_gradient(states, actions, chances, returns, baseline):
    """REINFORCE's estimate of the gradient from one game alone, for the right push's 4 weights:
    the sum over the game's steps of (G_t - baseline) times the slope of log pi."""
    gradient = [0.0, 0.0, 0.0, 0.0]
    for state, action, probs, G in zip(states, actions, chances, returns):
        slope = (1.0 if action == 1 else 0.0) - probs[1]
        for i in range(4):
            gradient[i] += (G - baseline) * slope * state[i]
    return gradient


def summarise(gradients):
    """The average gradient, the spread of each of its parts, and how often one game's gradient
    points the same way as the average (a positive dot product with it)."""
    n = len(gradients)
    mean = [sum(g[i] for g in gradients) / n for i in range(4)]
    spread = [(sum((g[i] - mean[i]) ** 2 for g in gradients) / n) ** 0.5 for i in range(4)]
    agree = 0
    for g in gradients:
        if sum(x * m for x, m in zip(g, mean)) > 0:
            agree += 1
    return mean, spread, agree / n


def compare_baselines(training_games=20, games=2000, baselines=(0.0, 25.0), seed=0):
    """Train briefly, freeze the weights, then estimate the gradient from many single games, once
    per baseline. The same games serve every baseline, so only the baseline differs."""
    weights, lengths = train_linear(episodes=training_games, seed=seed)
    env = CartPole()
    rng = random.Random(seed + 1)
    samples = {b: [] for b in baselines}
    for game in range(games):
        states, actions, chances, returns = play_game(weights, env, rng, seed + 1 if game == 0 else None)
        for b in baselines:
            samples[b].append(game_gradient(states, actions, chances, returns, b))
    for b in baselines:
        mean, spread, agree = summarise(samples[b])
        print(f"baseline {b:5.1f}: average {[round(x, 2) for x in mean]}, "
              f"spread {[round(x, 2) for x in spread]}, same way as the average {agree:.0%}")
    return samples
