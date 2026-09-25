# Reinforcement Learning & MDPs: Beginner to Mastery

A nine-part path. Each part builds on the last. Do the exercises; RL is learned by implementing it.

**Prerequisites:** basic probability (expectation, conditional probability), Python, and for Parts 6+ some neural-network experience (PyTorch).

---

## Part 1: The Big Picture (Beginner)

**Reinforcement learning (RL)** is learning to make decisions by trial and error. An **agent** interacts with an **environment**. At each step it observes a **state**, picks an **action**, and receives a **reward** and a new state. The goal is to maximize *cumulative* reward over time.

```
      action a_t
  ┌───────────────► Environment
Agent                   │
  ◄───────────────────┘
   state s_{t+1}, reward r_{t+1}
```

**How RL differs from other ML:**
- **vs. supervised learning:** no labeled "correct action." You only get a scalar reward, often delayed.
- **vs. unsupervised learning:** there's an explicit goal (reward), not just structure discovery.
- **Unique challenges:** *exploration vs. exploitation* (try new things or use what works?), *credit assignment* (which past action caused this reward?), and *data depends on your own behavior*.

**Core vocabulary**

| Term | Meaning |
|---|---|
| Policy π(a\|s) | The agent's behavior: probability of action a in state s |
| Reward r | Immediate feedback signal |
| Return G_t | Total (discounted) future reward from time t |
| Value V(s) | Expected return starting from s |
| Q-value Q(s,a) | Expected return after taking a in s |
| Model | The environment's dynamics (transitions and rewards) |

**Example:** a robot vacuum. State = its position and battery. Actions = move/charge. Reward = +1 per clean tile, −10 for running out of battery. The best policy balances cleaning against recharging *before* it's too late. That's credit assignment in action.

---

## Part 2: Markov Decision Processes (Beginner → Intermediate)

An **MDP** is the mathematical framework for almost all of RL. It's a tuple **(S, A, P, R, γ)**:

- **S**: set of states
- **A**: set of actions
- **P(s' | s, a)**: transition probability
- **R(s, a, s')**: reward function (often written R(s,a))
- **γ ∈ [0, 1)**: discount factor

**The Markov property:** the future depends only on the present state, not the history.

```
P(s_{t+1} | s_t, a_t) = P(s_{t+1} | s_0, a_0, ..., s_t, a_t)
```

If your raw observations aren't Markov, you either build a richer state (e.g., stack the last 4 video frames) or move to a POMDP (Part 8).

**Return and discounting**

```
G_t = r_{t+1} + γ r_{t+2} + γ² r_{t+3} + ... = Σ_k γ^k r_{t+k+1}
```

Why discount? (1) keeps infinite sums finite, (2) encodes "sooner is better," (3) models uncertainty about the far future. γ near 0 is myopic; γ near 1 is far-sighted.

**Episodic vs. continuing tasks:** episodic tasks end (a game); continuing ones don't (a thermostat).

**A tiny worked MDP**

Two states, *Cool* and *Hot*, on a machine. Actions: *Run* or *Rest*.
- Run in Cool: reward +2, 70% stay Cool, 30% go Hot.
- Run in Hot: reward +2 but 50% chance of breaking (−10, episode ends).
- Rest: reward 0, moves toward Cool.

Intuition: run when Cool, rest when Hot. Making this rigorous is what the next parts do.

**Exercise:** write down the P and R tables for this MDP as NumPy arrays of shape `[S, A, S]`.

---

## Part 3: Value Functions & Bellman Equations (Intermediate)

**State-value and action-value functions** for a policy π:

```
V^π(s)   = E_π[ G_t | s_t = s ]
Q^π(s,a) = E_π[ G_t | s_t = s, a_t = a ]
```

**The Bellman expectation equation** expresses value recursively (this is the single most important idea in RL):

```
V^π(s)   = Σ_a π(a|s) Σ_s' P(s'|s,a) [ R(s,a,s') + γ V^π(s') ]
Q^π(s,a) = Σ_s' P(s'|s,a) [ R(s,a,s') + γ Σ_a' π(a'|s') Q^π(s',a') ]
```

"The value of a state = immediate reward + discounted value of where you land."

**Optimality.** A policy π* is optimal if V^π*(s) ≥ V^π(s) for all s and all π. Every finite MDP has at least one *deterministic* optimal policy. The **Bellman optimality equation**:

```
V*(s)   = max_a Σ_s' P(s'|s,a) [ R + γ V*(s') ]
Q*(s,a) = Σ_s' P(s'|s,a) [ R + γ max_a' Q*(s',a') ]
π*(s)   = argmax_a Q*(s,a)
```

The max makes it non-linear, so there's no closed form. We solve it iteratively.

**Why iteration works:** the Bellman operator is a **γ-contraction** in the max-norm: ‖T V − T U‖∞ ≤ γ ‖V − U‖∞. By the Banach fixed-point theorem it has a unique fixed point and repeated application converges to it geometrically. Nearly every convergence proof in RL leans on this.

**Exercise:** for a policy on a fixed MDP, the Bellman expectation equation is a linear system `V = R_π + γ P_π V`. Solve it directly with `np.linalg.solve(I - γ P_π, R_π)`.

---

## Part 4: Dynamic Programming (Intermediate)

DP assumes you **know the model** (P and R). It's not practical for huge problems, but it's the conceptual blueprint for everything after.

**Policy evaluation:** repeat `V(s) ← Σ_a π(a|s) Σ_s' P(...)[R + γV(s')]` until V stops changing.

**Policy improvement:** act greedily: `π'(s) = argmax_a Q^π(s,a)`. By the *policy improvement theorem*, π' is at least as good as π.

**Policy iteration:** alternate evaluation and improvement until the policy stops changing. Converges to π* in a finite number of steps.

**Value iteration:** fold both steps into one update:

```python
import numpy as np

def value_iteration(P, R, gamma=0.99, tol=1e-8):
    # P: [S, A, S] transition probs, R: [S, A, S] rewards
    S, A, _ = P.shape
    V = np.zeros(S)
    while True:
        Q = (P * (R + gamma * V)).sum(axis=2)   # [S, A]
        V_new = Q.max(axis=1)
        if np.abs(V_new - V).max() < tol:
            return V_new, Q.argmax(axis=1)
        V = V_new
```

**Generalized Policy Iteration (GPI):** nearly every RL algorithm is some interleaving of "evaluate the current policy" and "improve it." Keep this frame in mind for the rest of the tutorial.

**Exercise:** implement policy iteration and value iteration on a 4×4 gridworld; verify they find the same policy.

---

## Part 5: Model-Free Learning: Monte Carlo & TD (Intermediate)

Usually you **don't know P**. You learn from sampled experience.

### Monte Carlo (MC)
Play a full episode, compute actual returns G_t, average them per state (or state-action):

```
V(s_t) ← V(s_t) + α [ G_t − V(s_t) ]
```
- ✅ Unbiased, no model needed.
- ❌ High variance; must wait for episode end.

### Temporal-Difference (TD) learning
**Bootstrap:** update toward a *guess* built from your own current estimate.

```
TD(0):  V(s_t) ← V(s_t) + α [ r_{t+1} + γ V(s_{t+1}) − V(s_t) ]
                              └────── TD error δ_t ──────┘
```
- ✅ Learns online, every step; lower variance.
- ❌ Biased (bootstraps from estimates).

**n-step returns and TD(λ)** interpolate between TD(0) and MC. λ=0 is TD(0), λ=1 is MC. **Eligibility traces** implement TD(λ) efficiently.

### Control: SARSA vs. Q-learning

Both learn Q(s,a) and are ε-greedy for exploration.

```
SARSA (on-policy):    Q(s,a) ← Q(s,a) + α [ r + γ Q(s', a')      − Q(s,a) ]   # a' actually taken
Q-learning (off-policy): Q(s,a) ← Q(s,a) + α [ r + γ max_a' Q(s',a') − Q(s,a) ]
```

**On- vs. off-policy:** on-policy learns about the policy it's executing; off-policy learns about a *different* (e.g., greedy) policy from data generated by another. Classic illustration: in the Cliff Walking gridworld, SARSA learns the safe path and Q-learning learns the optimal edge-of-cliff path (but falls more during training).

### Full working example: tabular Q-learning

```python
import gymnasium as gym, numpy as np

env = gym.make("FrozenLake-v1", is_slippery=True)
Q = np.zeros((env.observation_space.n, env.action_space.n))
alpha, gamma, eps = 0.1, 0.99, 1.0

for ep in range(20000):
    s, _ = env.reset()
    done = False
    while not done:
        a = env.action_space.sample() if np.random.rand() < eps else Q[s].argmax()
        s2, r, term, trunc, _ = env.step(a)
        done = term or trunc
        target = r + gamma * Q[s2].max() * (not term)   # don't bootstrap past terminal
        Q[s, a] += alpha * (target - Q[s, a])
        s = s2
    eps = max(0.05, eps * 0.9997)
```

**Exploration strategies:** ε-greedy, softmax (Boltzmann), optimism in the face of uncertainty (UCB), Thompson sampling. The *multi-armed bandit* problem is the single-state version of this dilemma; study it, since it's the cleanest place to understand exploration.

**Exercises:** (1) Reproduce Cliff Walking with SARSA and Q-learning. (2) Implement a 10-armed bandit testbed comparing ε-greedy and UCB. (3) Implement Double Q-learning to fix maximization bias.

---

## Part 6: Function Approximation & Deep RL (Advanced)

Tables don't scale (Atari has more states than atoms in the universe). Instead approximate: `V(s) ≈ V_w(s)` or `Q(s,a) ≈ Q_w(s,a)`, with parameters w updated by gradient descent:

```
w ← w + α [ target − Q_w(s,a) ] ∇_w Q_w(s,a)
```

**The Deadly Triad:** combining **function approximation + bootstrapping + off-policy learning** can make training diverge. Deep RL is largely a set of engineering tricks to tame this.

### Deep Q-Networks (DQN)
A neural net Q_w(s,·) trained with two stabilizers:
1. **Experience replay:** store transitions in a buffer and sample random minibatches, which breaks temporal correlation and reuses data.
2. **Target network:** compute targets with a slowly-updated copy Q_w⁻ so the target isn't chasing itself.

```
loss = ( r + γ max_a' Q_{w⁻}(s',a') − Q_w(s,a) )²
```

**Key improvements (know these):**
- **Double DQN:** select the action with Q_w, evaluate with Q_w⁻ (reduces overestimation).
- **Dueling networks:** separate V(s) and advantage A(s,a) streams.
- **Prioritized replay:** sample high-TD-error transitions more often.
- **Distributional RL (C51, QR-DQN):** learn the return *distribution*, not just its mean.
- **Rainbow:** combines the above (plus n-step, noisy nets).

**Limitation:** DQN-style methods need a max over actions, so they suit discrete action spaces.

**Project:** implement DQN in PyTorch on CartPole, then LunarLander. Plot returns across at least 5 seeds; RL results are very seed-sensitive.

---

## Part 7: Policy Gradients & Actor-Critic (Advanced)

Instead of learning values and deriving a policy, **directly optimize a parametrized policy π_θ(a|s)**. This handles continuous actions and stochastic policies naturally.

**Objective:** J(θ) = E_{π_θ}[G_0]. The **policy gradient theorem**:

```
∇_θ J(θ) = E_π [ ∇_θ log π_θ(a|s) · Q^π(s,a) ]
```

Intuition: increase the probability of actions in proportion to how good they turned out to be.

### REINFORCE
Use the sampled return G_t as the estimate of Q:

```python
# per episode, with returns G[t] computed backward:
loss = -sum(log_prob[t] * G[t] for t in range(T))
```
Simple, unbiased, but **very high variance**.

### Variance reduction: baselines & advantage
Subtracting a baseline b(s) (usually V(s)) keeps the gradient unbiased but lowers variance:

```
∇J = E[ ∇ log π_θ(a|s) · A(s,a) ],   A(s,a) = Q(s,a) − V(s)
```

### Actor-Critic
- **Actor:** the policy π_θ.
- **Critic:** a value function V_w that estimates the advantage via the TD error `δ = r + γV(s') − V(s)`.

**A2C/A3C** are synchronous/asynchronous versions. **GAE (Generalized Advantage Estimation)** blends n-step advantages with parameter λ, a bias-variance dial you'll use constantly.

### Trust regions & modern methods
Big policy updates can collapse performance. Fixes:
- **TRPO:** constrain KL divergence between old and new policy.
- **PPO:** the practical workhorse. Clips the probability ratio:

```
r_t(θ) = π_θ(a|s) / π_θ_old(a|s)
L = E[ min( r_t A_t,  clip(r_t, 1−ε, 1+ε) A_t ) ]
```
- **DDPG / TD3 / SAC:** off-policy actor-critic for *continuous control*. **SAC** (maximum-entropy RL) is a strong default: it maximizes reward *plus* policy entropy, which improves exploration and robustness.

**Which to pick?**

| Situation | Reasonable default |
|---|---|
| Discrete actions, sample-efficient | DQN/Rainbow |
| Discrete or continuous, stable, parallel sims | PPO |
| Continuous control, sample-efficient | SAC or TD3 |

**Project:** implement PPO from scratch (start with the "37 implementation details of PPO" blog post as a checklist), then benchmark on MuJoCo/Gymnasium continuous tasks.

---

## Part 8: Mastery Topics

**Model-based RL.** Learn (or be given) a model, then *plan*. Examples: Dyna (mix real and simulated experience), MBPO, Dreamer (learn a latent world model and train in imagination), **MCTS + learned networks** (AlphaGo/AlphaZero/MuZero). Trade-off: better sample efficiency, but model errors compound.

**Exploration in hard problems.** Sparse rewards need directed exploration: count-based bonuses, curiosity/intrinsic motivation (ICM), Random Network Distillation, Go-Explore.

**Offline (batch) RL.** Learn from a fixed dataset with no environment interaction. The core problem is *distribution shift*: the agent overestimates values of actions the data never covered. Study CQL, IQL, and BCQ.

**Imitation & inverse RL.** Behavior cloning, DAgger, GAIL; inverse RL infers the reward function from demonstrations.

**Partial observability (POMDPs).** The agent sees observations, not states. Maintain a *belief state* or use recurrent/transformer policies (R2D2, memory-based agents).

**Multi-agent RL.** Non-stationarity (other learners change the environment), cooperation vs. competition, self-play, centralized-training/decentralized-execution (MADDPG, QMIX).

**Hierarchical RL.** Temporal abstraction via *options* and skill discovery for long-horizon tasks.

**Constrained & safe RL.** Constrained MDPs (CMDPs), Lagrangian methods, shielding.

**Reward design & alignment.** Reward hacking, specification gaming, and **RLHF/RLAIF**: train a reward model from human preferences, then optimize a language model with PPO or related methods (DPO skips the explicit RL loop). Modern LLM post-training with verifiable rewards (RLVR) is an active frontier.

**Theory.**
- Convergence of Q-learning (Robbins–Monro step-size conditions: Σα = ∞, Σα² < ∞)
- Regret bounds (UCRL, PSRL), PAC-MDP sample complexity
- Function approximation theory: linear MDPs, Bellman completeness
- Policy-gradient convergence and natural gradients

**Practical mastery: what separates experts**
- Rigorous evaluation: many seeds, confidence intervals, fixed compute budgets ("Deep RL that Matters," Henderson et al.).
- Debugging discipline: verify on tiny environments where you know the answer; check value-loss and entropy curves; normalize observations, rewards, and advantages.
- Reward shaping with care: use *potential-based shaping* (F = γΦ(s') − Φ(s)), which provably preserves the optimal policy.
- Knowing when *not* to use RL: if you have labeled data or a solvable optimization problem, simpler tools win.

---

## Part 9: Roadmap, Projects & Resources

**Suggested 12-week path**

| Weeks | Focus | Deliverable |
|---|---|---|
| 1–2 | Parts 1–3: MDPs, Bellman equations | Solve a gridworld MDP exactly |
| 3 | Part 4: DP | Policy + value iteration |
| 4–5 | Part 5: MC, TD, bandits | Q-learning, SARSA, bandit testbed |
| 6–7 | Part 6: DQN | DQN on CartPole → Atari-lite |
| 8–9 | Part 7: policy gradients | REINFORCE → A2C → PPO |
| 10 | SAC/TD3 | Continuous control benchmark |
| 11–12 | Part 8: pick one specialty | Reproduce a paper |

**Resources**
- **Book:** *Reinforcement Learning: An Introduction*, Sutton & Barto (free online), the canonical text. Read chapters 1–6 first, then 9–13.
- **Lectures:** David Silver's RL course (DeepMind/UCL); Sergey Levine's CS285 (Berkeley, deep RL).
- **Hands-on:** OpenAI's *Spinning Up in Deep RL*; Hugging Face Deep RL Course.
- **Libraries:** Gymnasium (environments), Stable-Baselines3 (reference implementations), CleanRL (single-file readable code), JAX-based stacks for speed.
- **Theory:** *Reinforcement Learning: Theory and Algorithms* (Agarwal, Jiang, Kakade, Sun); Bertsekas' dynamic programming texts.

**Self-check questions (can you answer these from memory?)**
1. Why is the Bellman optimality operator a contraction, and what does that guarantee?
2. Why does Q-learning work off-policy but SARSA doesn't?
3. What is the deadly triad, and which DQN tricks address which part?
4. Why does subtracting a baseline not bias the policy gradient?
5. What problem does PPO's clipping solve?
6. Why is offline RL harder than online RL with the same data?

If you can answer all six and have implemented Q-learning, DQN, and PPO yourself, you're past the intermediate wall and ready to read research papers.
