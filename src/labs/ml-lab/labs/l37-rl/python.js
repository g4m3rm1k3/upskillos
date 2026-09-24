export default {
  filename: 'rl.py', packages: ['numpy'],
  title: 'Policy evaluation, value iteration and Q-learning from scratch.',
  intro: 'Write ε-greedy policies as probability arrays, evaluate a policy with the Bellman expectation equation, solve a known MDP by value iteration, then learn the same policy by Q-learning from interaction only. The checks use a corridor with a goal at the end and a slippery variant, compare policy evaluation with a direct linear solve and with Monte Carlo returns, and finally add a "helpful" bonus that the agent exploits.',
  steps: [
    '`epsilon_greedy_probs(Q, epsilon)` → array `pi[s, a]`: probability 1 − ε + ε/A for each state’s greedy action (`argmax` of its row) and ε/A for the others.',
    '`policy_evaluation(P, R, pi, gamma, tol=1e-10)` → `V`. Repeatedly apply `V(s) = Σ_a pi[s, a] (R[s, a] + gamma Σ_s2 P[s, a, s2] V[s2])` — the Bellman expectation equation — until V changes by less than `tol`.',
    '`value_iteration(P, R, gamma, tol=1e-10)` → `(V, policy)`. `P[s, a, s2]` are transition probabilities, `R[s, a]` expected immediate rewards. Terminal states are absorbing with zero reward. Iterate `Q = R + gamma * P @ V` until V changes by less than `tol`.',
    '`q_learning(step, n_states, n_actions, start, episodes, alpha, gamma, epsilon, rng, max_steps=100)` → Q table. `step(s, a, rng)` returns `(next_state, reward, done)`. Use ε-greedy with random tie-breaking and the target `r` when done, else `r + gamma * max Q[next]`.',
    '`greedy(Q)` → the best action per state (`argmax` along actions).',
  ],
  hints: [
    ['Policy evaluation, vectorized', '`Q = R + gamma * np.einsum("sat,t->sa", P, V)` is the one-step lookahead for every action; `V_new = (pi * Q).sum(axis=1)` averages it over the policy.'],
    ['Vectorized Bellman backup', '`Q = R + gamma * np.einsum("sat,t->sa", P, V)`; then `V_new = Q.max(axis=1)`.'],
    ['Tie-breaking', '`best = np.flatnonzero(q == q.max()); a = rng.choice(best)`. Without it, an all-zero row always picks action 0.'],
  ],
  starter: `import numpy as np

def epsilon_greedy_probs(Q, epsilon):
    raise NotImplementedError

def policy_evaluation(P, R, pi, gamma, tol=1e-10):
    raise NotImplementedError

def value_iteration(P, R, gamma, tol=1e-10):
    raise NotImplementedError

def q_learning(step, n_states, n_actions, start, episodes, alpha, gamma, epsilon, rng, max_steps=100):
    raise NotImplementedError

def greedy(Q):
    raise NotImplementedError
`,
  solution: `import numpy as np

def epsilon_greedy_probs(Q, epsilon):
    S, A = Q.shape
    pi = np.full((S, A), epsilon / A)
    pi[np.arange(S), Q.argmax(axis=1)] += 1 - epsilon
    return pi

def policy_evaluation(P, R, pi, gamma, tol=1e-10):
    V = np.zeros(P.shape[0])
    while True:
        Q = R + gamma * np.einsum("sat,t->sa", P, V)   # one-step lookahead for every (s, a)
        V_new = (pi * Q).sum(axis=1)                  # average over pi(a | s)
        if np.max(np.abs(V_new - V)) < tol:
            return V_new
        V = V_new

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
  solutionNote: 'Policy evaluation and value iteration differ in one operation: an average over π(a | s) versus a max over a. Both use the model; Q-learning uses only sampled steps — yet reaches the same policy. With the bonus, all of them faithfully optimize the wrong objective.',
  checkSummary: 'ε-greedy arrays sum to one with the right entries; policy evaluation matches the linear solve (I − γP_π)V = r_π and a Monte Carlo average of returns, and never exceeds V*; exact corridor values from value iteration; slip lowers values but keeps the policy; Q-learning learns "always right" from experience alone; and with a re-collectable bonus the learned policy stops going to the goal.',
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
pi = epsilon_greedy_probs(np.array([[1.0, 2.0], [3.0, 0.0]]), 0.2)
assert np.allclose(pi, [[0.1, 0.9], [0.9, 0.1]]) and np.allclose(pi.sum(axis=1), 1)
pi_rand = epsilon_greedy_probs(np.zeros((N, 2)), 0.3)          # prefers "left" (argmax of a zero row is 0), explores 30%
V_pe = policy_evaluation(P, R, pi_rand, g)
P_pi, r_pi = np.einsum("sa,sat->st", pi_rand, P), (pi_rand * R).sum(axis=1)
live = np.arange(N) != GOAL                                     # the goal is absorbing with value 0
V_solve = np.zeros(N)
V_solve[live] = np.linalg.solve(np.eye(live.sum()) - g * P_pi[np.ix_(live, live)], r_pi[live])
assert np.allclose(V_pe, V_solve, atol=1e-8), "policy evaluation should solve (I - gamma P_pi) V = r_pi"
rng_mc = np.random.default_rng(5); rets = []
for _ in range(4000):
    s, G, d = 0, 0.0, 1.0
    for _ in range(200):
        a = rng_mc.choice(2, p=pi_rand[s]); s2 = min(N - 1, max(0, s + (1 if a == 1 else -1)))
        G += d * (10 if s2 == GOAL else -0.1); d *= g; s = s2
        if s == GOAL: break
    rets.append(G)
print("V_pi(0): Bellman", round(V_pe[0], 3), "| Monte Carlo", round(np.mean(rets), 3))
assert abs(V_pe[0] - np.mean(rets)) < 0.15, "V_pi is the expected return"
print("PASS: epsilon-greedy arrays and policy evaluation")
V, pi = value_iteration(P, R, g)
assert abs(V[3] - 10) < 1e-8 and abs(V[2] - (-0.1 + g * 10)) < 1e-8 and V[GOAL] == 0
assert list(pi[:GOAL]) == [1, 1, 1, 1]
assert np.all(V_pe <= V + 1e-9), "no policy beats V*"
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
