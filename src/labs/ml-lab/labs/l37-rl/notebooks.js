// Runnable notebook cells for Lab 37. Every lesson's notebook starts with the
// same gridworld, written in Python to match engine.js exactly.
const ENV = {
  title: 'The gridworld',
  prose: 'The same 7 × 5 yard as the playground. A state is one integer s = y·W + x. `move` is the deterministic effect of an action; `step` adds slip, so it samples from p(s′, r | s, a).',
  code: `import numpy as np

W, H = 7, 5
START, GOAL = (0, 4), (6, 4)
ACTIONS = [(0, -1), (1, 0), (0, 1), (-1, 0)]      # up, right, down, left
N_STATES, N_ACTIONS = W * H, 4

def state(x, y):
    return y * W + x

def ditch(x, y):
    return y == 4 and 0 < x < 6

def terminal(s):
    x, y = s % W, s // W
    return (x, y) == GOAL or ditch(x, y)

def move(s, a):
    """Deterministic effect of action a in state s: (next state, reward, done)."""
    x, y = s % W, s // W
    dx, dy = ACTIONS[a]
    nx, ny = min(W - 1, max(0, x + dx)), min(H - 1, max(0, y + dy))
    s2 = state(nx, ny)
    if (nx, ny) == GOAL:
        return s2, 10.0, True
    if ditch(nx, ny):
        return s2, -10.0, True
    return s2, -0.1, False

def step(s, a, rng, slip=0.0):
    """One environment step: samples S_{t+1}, R_{t+1} ~ p(., . | S_t = s, A_t = a)."""
    if rng.random() < slip:
        a = int(rng.integers(4))                  # the move goes in a random direction
    return move(s, a)

def outcomes(s, a, slip=0.0):
    """The model p(s', r | s, a) written out: a list of (probability, s', r, done)."""
    return [((1 - slip if b == a else 0.0) + slip / 4, *move(s, b)) for b in range(4)]

def edge_walker(s):
    """The hand-written policy: up once, right along the ditch, then down."""
    x, y = s % W, s // W
    return (0 if x == 0 else 2) if y == 4 else (1 if x < 6 else 2)

s0 = state(*START)
print("start state", s0, "| outcomes of 'right' from the start with slip 0.2 (down and left both hit a wall, so both stay put):")
for p, s2, r, done in outcomes(s0, 1, slip=0.2):
    print(f"  p = {p:.2f} -> s' = {s2:2d}, r = {r:+.1f}, done = {done}")`,
}

export const notebooks = {
  'l37-mdp': {
    title: 'Lab 37.1 · The agent–environment loop',
    intro: 'Build the loop in Python, print $S_t, A_t, R_{t+1}, S_{t+1}$ at every step, and check the return two ways: the direct sum and the backward recursion $G_t = R_{t+1} + \\gamma G_{t+1}$.',
    cells: [ENV, {
      title: 'One episode, one timestep at a time',
      prose: 'Each pass through the loop is one value of t. The row printed is exactly one transition (S_t, A_t, R_{t+1}, S_{t+1}).',
      code: `rng = np.random.default_rng(3)
gamma, slip = 0.95, 0.2
s = s0                                    # S_0
rewards = []
for t in range(60):
    a = edge_walker(s)                    # A_t
    s_next, r, done = step(s, a, rng, slip)   # S_{t+1}, R_{t+1}
    print(f"t={t:2d}  S_t={s:2d}  A_t={'URDL'[a]}  R_(t+1)={r:+.1f}  S_(t+1)={s_next:2d}")
    rewards.append(r)
    s = s_next                            # advance: t <- t + 1
    if done:
        break`,
    }, {
      title: 'The return, forwards and backwards',
      prose: 'G_0 = Σ_k γ^k R_{k+1}. Computing it backwards with G_t = R_{t+1} + γ G_{t+1} gives every G_t at once — the same recursion the Bellman equation uses.',
      code: `G0_direct = sum(gamma ** k * r for k, r in enumerate(rewards))
G = np.zeros(len(rewards) + 1)            # G[T] = 0 after the episode ends
for t in reversed(range(len(rewards))):
    G[t] = rewards[t] + gamma * G[t + 1]
print("G_0 direct   :", round(G0_direct, 6))
print("G_0 backwards:", round(G[0], 6))
assert abs(G0_direct - G[0]) < 1e-12`,
    }, {
      title: 'Estimate p(s′ | s, a) by sampling',
      prose: 'With slip 0.2 the intended move should happen with probability 1 − 0.2 + 0.2/4 = 0.85 and each other direction with 0.05.',
      code: `rng = np.random.default_rng(0)
s = state(3, 2)                           # an open cell in the middle of the yard
counts = np.zeros(N_STATES)
for _ in range(100_000):
    s2, _, _ = step(s, 1, rng, slip=0.2)  # try to move right
    counts[s2] += 1
for s2 in np.flatnonzero(counts):
    print(f"s' = {s2:2d}: {counts[s2] / 100_000:.3f}")`,
    }],
  },
  'l37-values': {
    title: 'Lab 37.2 · Policies and value functions',
    intro: 'Turn the Bellman expectation equation into loops, check it against Monte Carlo returns, and see that policy evaluation is also a linear system you can solve with NumPy.',
    cells: [ENV, {
      title: 'A stochastic policy is an array of probabilities',
      prose: 'ε-greedy around a preferred action: 1 − ε + ε/4 for it and ε/4 for each other action (the random draw can land on the preferred action too). Sampling many actions reproduces the array.',
      code: `def epsilon_greedy_probs(best, epsilon, n=4):
    probs = np.full(n, epsilon / n)
    probs[best] += 1 - epsilon
    return probs

pi_start = epsilon_greedy_probs(edge_walker(s0), 0.1)
print("pi(. | start) =", pi_start)           # [0.925 0.025 0.025 0.025]
rng = np.random.default_rng(1)
draws = rng.choice(4, size=200_000, p=pi_start)
print("sampled      =", np.bincount(draws, minlength=4) / draws.size)`,
    }, {
      title: 'Policy evaluation: the Bellman expectation equation as loops',
      prose: 'V(s) ← Σ_a π(a|s) Σ_{s′,r} p(s′,r|s,a) [r + γ V(s′)]. The outer sum is the loop over actions, the inner sum the loop over outcomes.',
      code: `def policy_evaluation(pi, gamma=0.95, slip=0.0, tol=1e-12):
    V = np.zeros(N_STATES)
    while True:
        V_new = np.zeros(N_STATES)
        for s in range(N_STATES):
            if terminal(s):
                continue                               # V(terminal) = 0
            for a, pa in enumerate(pi(s)):             # sum over a of pi(a|s) ...
                for p, s2, r, done in outcomes(s, a, slip):   # ... sum over s', r of p(s', r | s, a)
                    V_new[s] += pa * p * (r + (0 if done else gamma * V[s2]))
        if np.max(np.abs(V_new - V)) < tol:
            return V_new
        V = V_new

V_det = policy_evaluation(lambda s: epsilon_greedy_probs(edge_walker(s), 0.0))
closed_form = -0.1 * (1 - 0.95 ** 7) / (1 - 0.95) + 10 * 0.95 ** 7
print("deterministic route, no slip: V(start) =", round(V_det[s0], 4), "| by hand:", round(closed_form, 4))
V_eps = policy_evaluation(lambda s: epsilon_greedy_probs(edge_walker(s), 0.1))
V_slip = policy_evaluation(lambda s: epsilon_greedy_probs(edge_walker(s), 0.0), slip=0.1)
print("epsilon 0.1, no slip: V(start) =", round(V_eps[s0], 4))
print("no epsilon, slip 0.1: V(start) =", round(V_slip[s0], 4), "(the same random move, caused by the world instead of the policy)")`,
    }, {
      title: 'V is an expected return: check by simulation',
      prose: 'Run many episodes with the ε-greedy policy and average their discounted returns. The average should approach V^π(start).',
      code: `rng = np.random.default_rng(7)
def sample_return(epsilon, gamma=0.95):
    s, G, discount = s0, 0.0, 1.0
    for t in range(500):
        a = rng.choice(4, p=epsilon_greedy_probs(edge_walker(s), epsilon))
        s, r, done = step(s, a, rng)
        G += discount * r
        discount *= gamma
        if done:
            break
    return G
returns = [sample_return(0.1) for _ in range(20_000)]
print(f"Monte Carlo mean {np.mean(returns):.3f} ± {1.96 * np.std(returns) / np.sqrt(len(returns)):.3f}   |   Bellman V(start) {V_eps[s0]:.3f}")`,
    }, {
      title: 'The same values from one linear solve',
      prose: 'Collect the equation for every state: V = r_π + γ P_π V, so (I − γ P_π) V = r_π. Policy evaluation is solving a linear system; the loop above is Jacobi iteration on it.',
      code: `def linear_system(pi, gamma=0.95, slip=0.0):
    P, r = np.zeros((N_STATES, N_STATES)), np.zeros(N_STATES)
    for s in range(N_STATES):
        if terminal(s):
            continue
        for a, pa in enumerate(pi(s)):
            for p, s2, rew, done in outcomes(s, a, slip):
                r[s] += pa * p * rew
                if not done:
                    P[s, s2] += pa * p
    return P, r
P_pi, r_pi = linear_system(lambda s: epsilon_greedy_probs(edge_walker(s), 0.1))
V_solve = np.linalg.solve(np.eye(N_STATES) - 0.95 * P_pi, r_pi)
print("max difference from the iterative answer:", np.max(np.abs(V_solve - V_eps)))`,
    }, {
      title: 'The ceiling: V* and Q*',
      prose: 'V*(s) = max_π V^π(s). Value iteration (next lesson) computes it; here we compare it with the hand-written policy.',
      code: `def value_iteration(gamma=0.95, slip=0.0, tol=1e-12):
    V = np.zeros(N_STATES)
    while True:
        Q = np.zeros((N_STATES, N_ACTIONS))
        for s in range(N_STATES):
            if terminal(s):
                continue
            for a in range(N_ACTIONS):
                Q[s, a] = sum(p * (r + (0 if done else gamma * V[s2])) for p, s2, r, done in outcomes(s, a, slip))
        V_new = Q.max(axis=1)
        if np.max(np.abs(V_new - V)) < tol:
            return V_new, Q
        V = V_new
V_star, Q_star = value_iteration(slip=0.1)
V_hand = policy_evaluation(lambda s: epsilon_greedy_probs(edge_walker(s), 0.0), slip=0.1)
print("slip 0.1:  V*(start) =", round(V_star[s0], 3), " >=  V^hand(start) =", round(V_hand[s0], 3))
print("Q*(start, .) =", np.round(Q_star[s0], 3), "-> best action", "URDL"[Q_star[s0].argmax()])`,
    }],
  },
  'l37-planning': {
    title: 'Lab 37.3 · Value iteration',
    intro: 'Run value iteration sweep by sweep and check the contraction guarantee: each sweep’s largest change is at most $\\gamma$ times the previous one.',
    cells: [ENV, {
      title: 'Value iteration, printing the change per sweep',
      prose: 'Each sweep applies V(s) ← max_a Σ p(s′,r|s,a)[r + γV(s′)] to every state. The theorem promises next/this ≤ γ = 0.95; in this small world the change shrinks faster and reaches exactly zero, because every path ends at the goal or the ditch.',
      code: `gamma, slip = 0.95, 0.1
V = np.zeros(N_STATES)
changes = []
for sweep in range(200):
    V_new = np.array([0.0 if terminal(s) else max(sum(p * (r + (0 if done else gamma * V[s2])) for p, s2, r, done in outcomes(s, a, slip)) for a in range(4)) for s in range(N_STATES)])
    changes.append(np.max(np.abs(V_new - V)))
    V = V_new
for k in [0, 1, 2, 5, 10, 20, 40, 80]:
    ratio = changes[k + 1] / changes[k] if changes[k] > 0 else float('nan')
    print(f"sweep {k + 1:3d}: largest change {changes[k]:.2e}   next/this = {ratio:.3f}")
print("V*(start) =", round(V[s0], 4))`,
    }, {
      title: 'The greedy policy, drawn as arrows',
      prose: 'Once V* is known, the optimal action in each state is the argmax of the one-step lookahead.',
      code: `arrows = "↑→↓←"
for y in range(H):
    row = ""
    for x in range(W):
        s = state(x, y)
        if (x, y) == GOAL: row += " ★"
        elif ditch(x, y): row += " ~"
        else: row += " " + arrows[int(np.argmax([sum(p * (r + (0 if d else gamma * V[s2])) for p, s2, r, d in outcomes(s, a, slip)) for a in range(4)]))]
    print(row)`,
    }],
  },
  'l37-qlearning': {
    title: 'Lab 37.4 · Q-learning',
    intro: 'Q-learning written with the timestep names from the math, compared at the end with the exact $Q^*$ from value iteration.',
    cells: [ENV, {
      title: 'Q-learning with the math’s variable names',
      prose: 'δ_t = R_{t+1} + γ max_a′ Q(S_{t+1}, a′) − Q(S_t, A_t); then Q(S_t, A_t) ← Q(S_t, A_t) + α δ_t.',
      code: `def q_learning(episodes=400, alpha=0.5, gamma=0.95, epsilon=0.1, slip=0.1, seed=37):
    rng = np.random.default_rng(seed)
    Q = np.zeros((N_STATES, N_ACTIONS))
    for episode in range(episodes):
        S_t = s0
        for t in range(60):
            if rng.random() < epsilon:
                A_t = int(rng.integers(4))                                   # explore
            else:
                A_t = int(rng.choice(np.flatnonzero(Q[S_t] == Q[S_t].max())))  # greedy, random ties
            S_next, R_next, done = step(S_t, A_t, rng, slip)                 # S_{t+1}, R_{t+1}
            target = R_next if done else R_next + gamma * Q[S_next].max()
            delta = target - Q[S_t, A_t]                                     # TD error
            Q[S_t, A_t] += alpha * delta
            S_t = S_next
            if done:
                break
    return Q
Q = q_learning()
print("learned  max_a Q(start, a) =", round(Q[s0].max(), 3))`,
    }, {
      title: 'How close is it to Q*?',
      prose: 'Value iteration gives the exact Q* for comparison. Look at Q(start, up): the learned value is above Q*. Taking a max over noisy estimates picks whichever is luckiest, so Q-learning overestimates (maximization bias; double Q-learning fixes it). States the agent rarely visits stay far from Q*; that matters less than getting the greedy action right on the route.',
      code: `def q_star(gamma=0.95, slip=0.1):
    V = np.zeros(N_STATES)
    for _ in range(500):
        Qs = np.array([[0.0 if terminal(s) else sum(p * (r + (0 if d else gamma * V[s2])) for p, s2, r, d in outcomes(s, a, slip)) for a in range(4)] for s in range(N_STATES)])
        V = Qs.max(axis=1)
    return Qs
Qs = q_star()
print("Q*(start, a)     =", np.round(Qs[s0], 3))
print("learned Q(start) =", np.round(Q[s0], 3))
visited = [s for s in range(N_STATES) if not terminal(s) and np.any(Q[s] != 0)]
agree = np.mean([Q[s].argmax() == Qs[s].argmax() for s in visited])
print(f"greedy action matches Q* in {agree:.0%} of the {len(visited)} visited states")`,
    }],
  },
  'l37-reward': {
    title: 'Lab 37.5 · Reward design',
    intro: 'Show numerically that a potential-based bonus leaves every discounted return shifted by the same amount along any path, so it cannot create a loop worth circling.',
    cells: [ENV, {
      title: 'A re-collectable bonus versus potential-based shaping',
      prose: 'The +2 checkpoint bonus pays on every entry. A potential-based bonus F = γΦ(s′) − Φ(s) telescopes: over any path it adds γ^T Φ(S_T) − Φ(S_0), so a loop that ends where it started earns exactly nothing extra.',
      code: `gamma = 0.95
CHECK = state(3, 1)
def loop_return(bonus, n_moves=60):
    """Discounted return from circling between the checkpoint and the cell below it."""
    path = [state(3, 2), CHECK] * (n_moves // 2)
    G, s = 0.0, state(3, 2)
    for k, s2 in enumerate(path[1:] + [path[0]]):
        G += gamma ** k * (-0.1 + bonus(s, s2))
        s = s2
    return G
phi = lambda s: 2.0 if s == CHECK else 0.0          # potential: "being at the checkpoint is worth 2"
repeat_bonus = lambda s, s2: 2.0 if s2 == CHECK else 0.0
shaped_bonus = lambda s, s2: gamma * phi(s2) - phi(s)
print("circling 60 moves, re-collectable bonus:", round(loop_return(repeat_bonus), 3))
print("circling 60 moves, potential shaping   :", round(loop_return(shaped_bonus), 3))
print("circling 60 moves, no bonus            :", round(loop_return(lambda s, s2: 0.0), 3))`,
    }],
  },
}
