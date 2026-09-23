export default {
  filename: 'rl.py', packages: ['numpy'],
  title: 'Value iteration and Q-learning from scratch.',
  intro: 'Solve a known MDP by value iteration, then learn the same policy by Q-learning from interaction only. The checks use a corridor with a goal at the end and a slippery variant, and finally a "helpful" bonus that the agent exploits.',
  steps: [
    '`value_iteration(P, R, gamma, tol=1e-10)` → `(V, policy)`. `P[s, a, s2]` are transition probabilities, `R[s, a]` expected immediate rewards. Terminal states are absorbing with zero reward. Iterate `Q = R + gamma * P @ V` until V changes by less than `tol`.',
    '`q_learning(step, n_states, n_actions, start, episodes, alpha, gamma, epsilon, rng, max_steps=100)` → Q table. `step(s, a, rng)` returns `(next_state, reward, done)`. Use ε-greedy with random tie-breaking and the target `r` when done, else `r + gamma * max Q[next]`.',
    '`greedy(Q)` → the best action per state (`argmax` along actions).',
  ],
  hints: [
    ['Vectorized Bellman backup', '`Q = R + gamma * np.einsum("sat,t->sa", P, V)`; then `V_new = Q.max(axis=1)`.'],
    ['Tie-breaking', '`best = np.flatnonzero(q == q.max()); a = rng.choice(best)`. Without it, an all-zero row always picks action 0.'],
  ],
  starter: `import numpy as np

def value_iteration(P, R, gamma, tol=1e-10):
    raise NotImplementedError

def q_learning(step, n_states, n_actions, start, episodes, alpha, gamma, epsilon, rng, max_steps=100):
    raise NotImplementedError

def greedy(Q):
    raise NotImplementedError
`,
  solution: `import numpy as np

def value_iteration(P, R, gamma, tol=1e-10):
    V = np.zeros(P.shape[0])
    while True:
        Q = R + gamma * np.einsum("sat,t->sa", P, V)
        V_new = Q.max(axis=1)
        if np.max(np.abs(V_new - V)) < tol:
            return V_new, Q.argmax(axis=1)
        V = V_new

def q_learning(step, n_states, n_actions, start, episodes, alpha, gamma, epsilon, rng, max_steps=100):
    Q = np.zeros((n_states, n_actions))
    for _ in range(episodes):
        s = start
        for _ in range(max_steps):
            if rng.random() < epsilon:
                a = int(rng.integers(n_actions))
            else:
                a = int(rng.choice(np.flatnonzero(Q[s] == Q[s].max())))
            s2, r, done = step(s, a, rng)
            target = r if done else r + gamma * Q[s2].max()
            Q[s, a] += alpha * (target - Q[s, a])
            s = s2
            if done:
                break
    return Q

def greedy(Q):
    return Q.argmax(axis=1)
`,
  solutionNote: 'Value iteration uses the model; Q-learning uses only sampled steps — yet both reach the same policy. With the bonus, both faithfully optimize the wrong objective.',
  checkSummary: 'Exact corridor values from value iteration; slip lowers values but keeps the policy; Q-learning learns "always right" from experience alone; and with a re-collectable bonus the learned policy stops going to the goal.',
  checks: `
import numpy as np
N, GOAL, g = 5, 4, 0.9
def model(slip=0.0, bonus=False):
    P = np.zeros((N, 2, N)); R = np.zeros((N, 2))
    for s in range(N):
        for a in range(2):
            if s == GOAL:
                P[s, a, s] = 1; continue
            for b, p in ((a, 1 - slip), (1 - a, slip)):
                s2 = min(N - 1, max(0, s + (1 if b == 1 else -1)))
                P[s, a, s2] += p
                R[s, a] += p * (10 if s2 == GOAL else -0.1 + (1 if bonus and s2 == 1 else 0))
    return P, R
P, R = model()
V, pi = value_iteration(P, R, g)
assert abs(V[3] - 10) < 1e-8 and abs(V[2] - (-0.1 + g * 10)) < 1e-8 and V[GOAL] == 0
assert list(pi[:GOAL]) == [1, 1, 1, 1]
Vs, pis = value_iteration(*model(slip=0.2), g)
assert np.all(Vs[:GOAL] < V[:GOAL]) and list(pis[:GOAL]) == [1, 1, 1, 1]
print("PASS: value iteration", np.round(V, 3))
def step(s, a, rng, bonus=False):
    s2 = min(N - 1, max(0, s + (1 if a == 1 else -1)))
    if s2 == GOAL:
        return s2, 10.0, True
    return s2, -0.1 + (1.0 if bonus and s2 == 1 else 0.0), False
Q = q_learning(step, N, 2, 0, 300, 0.5, g, 0.1, np.random.default_rng(37))
assert list(greedy(Q)[:GOAL]) == [1, 1, 1, 1], "Q-learning should learn to always move right"
assert abs(Q[3, 1] - 10) < 0.5
print("PASS: Q-learning", np.round(Q.max(axis=1), 2))
# A far-sighted agent (gamma 0.99) values an endless stream of bonuses above one goal.
Qb = q_learning(lambda s, a, rng: step(s, a, rng, bonus=True), N, 2, 0, 300, 0.5, 0.99, 0.1, np.random.default_rng(37))
_, pib = value_iteration(*model(bonus=True), 0.99)
assert greedy(Qb)[1] == 0 and greedy(Qb)[0] == 1 and pib[1] == 0, "The re-collectable bonus should be exploited: bounce between states 0 and 1"
print("PASS: reward hacking — the agent bounces on the bonus instead of reaching the goal")
`,
}
