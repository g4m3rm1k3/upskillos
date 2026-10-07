# Field Guide: Every Major ML Algorithm in Three Answers

Use this when you meet an algorithm and the math looks like noise. Every entry answers the same three questions from the series:

1. **Knobs:** what numbers (or structure) get tuned? This is the "list of values to tune".
2. **Score:** what single number says how well the knobs are doing?
3. **Nudge:** how do the knobs get changed to improve the score?

Plus a plain-language line on what it does, so you know what you're looking at.

Not everything here has a lesson yet. The last column says where to learn it. "Series" means this intuition series (lessons 1 to 4 so far). "ML-math" means your earlier 23-lesson ML + math series, referred to by lesson number.

---

## Step zero: which family is it?

Ask: **what does the algorithm learn from?**

| It learns from... | Family | The maze/CartPole tell |
|---|---|---|
| Examples with the right answers attached | **Supervised** | Like the taxi rides: input and correct fare |
| Examples with no answers | **Unsupervised** | It must find structure on its own (groups, directions) |
| Rewards from trying things in a world | **Reinforcement** | Like the maze and CartPole: no answer key, just consequences |

---

## Three words people use for "the same thing"

You'll see different names in different books. They map like this:

| Say this... | ...or this |
|---|---|
| knobs | parameters, weights, θ, coefficients, "the model" |
| score (lower is better) | loss, cost, error, objective, L(θ), J(θ) |
| nudge rule | optimizer, training algorithm, update rule, "fitting" |

A **hyperparameter** is a knob for the *learning process itself*, set by you and not learned: learning rate, number of clusters k, tree depth, exploration chance.

---

## Supervised learning

| Algorithm | What it does | Knobs | Score | Nudge | Where |
|---|---|---|---|---|---|
| **Linear regression** | Predicts a number as a weighted sum of inputs (the taxi fare, in general) | One weight per input, plus a bias | Mean squared error | Gradient descent, or direct algebra (the "normal equation") | Series 1-2; ML-math 1-3 |
| **Logistic regression** | Predicts a yes/no probability: weighted sum squashed into 0 to 1 by the sigmoid curve | Same as linear regression | Log-loss (cross-entropy): punishes confident wrong answers hard | Gradient descent | ML-math 4 |
| **k-nearest neighbours (KNN)** | To classify a new point, look at the k closest known points and let them vote | **Nothing is trained.** The stored data *is* the model. (k and the distance rule are hyperparameters.) | Accuracy on held-out data | None; there's no learning step | Not yet covered |
| **Decision tree** | A flowchart of yes/no questions on the inputs ("is the angle above 0.1?") ending in answers | At each split: which input and what threshold; at each leaf: the answer | How "mixed" each group is after a split (entropy or Gini impurity) | **Greedy search, no slopes:** try every possible split, keep the best one, repeat on each half | ML-math 5 |
| **Random forest** | Many different trees, each trained on a random slice of the data, then they vote | The trees (same as above) | Same as trees | Train each tree on a random sample so they disagree usefully; average the answers | Not yet covered |
| **Gradient boosting** (XGBoost, LightGBM) | Trees added one at a time, each one fixing the mistakes the previous trees left | The trees, built in sequence | Any loss you choose | Each new tree is fitted to the *slope of the loss* (what the current model gets wrong), so it's gradient descent in "function space" | Not yet covered |
| **Support vector machine (SVM)** | Draws the dividing line with the widest possible empty gap on each side | Weights and bias of the line | Hinge loss plus a penalty for narrow gaps | Gradient or quadratic-programming methods | Not yet covered |
| **Neural network** (MLP) | Layers of neurons; each layer feeds the next. Can learn curved decision boundaries a single neuron can't | Every weight and bias in every neuron | Mean squared error (numbers) or cross-entropy (categories) | **Backpropagation** computes all slopes at once, then gradient descent or Adam uses them | Series 4 for the single neuron; ML-math 8-13 |
| **CNN** (convolutional network) | A neural net for images: small filters slide across the picture detecting edges, then shapes | The filter weights (the same small filter is reused at every position) | Cross-entropy | Backprop + gradient descent | ML-math 15 |
| **RNN / LSTM** | A neural net for sequences: carries a "memory" number forward as it reads each item | Weights reused at every step | Cross-entropy or error | Backprop through the unrolled steps | ML-math 16 |
| **Transformer** (what ChatGPT-style models are built on) | A network where every item in a sequence can look at every other item and decide how much to attend to it | Embeddings plus the query/key/value weight matrices and feed-forward layers, billions of them | Cross-entropy on predicting the next word | Backprop + Adam, on enormous data | ML-math 19-23 |

---

## Unsupervised learning

| Algorithm | What it does | Knobs | Score | Nudge | Where |
|---|---|---|---|---|---|
| **k-means** | Sorts points into k groups by closeness | The positions of the k centre points | Total squared distance from every point to its nearest centre | **Alternate, no slopes:** assign each point to its nearest centre, move each centre to the average of its points, repeat | ML-math 6 |
| **PCA** | Finds the directions along which the data varies most, so you can describe it with fewer numbers | The directions (vectors) | Variance captured (or error after compressing and rebuilding) | Direct linear algebra (eigenvectors); one calculation, not a loop | Not yet covered |
| **Autoencoder** | A neural network squeezes its input through a narrow middle layer, then tries to rebuild it. The middle layer becomes a compressed summary | All network weights | How badly the rebuilt output differs from the input | Backprop + gradient descent | Not yet covered |

---

## Reinforcement learning

| Algorithm | What it does | Knobs | Score | Nudge | Where |
|---|---|---|---|---|---|
| **Random search / hill climbing** | Try a small random change to the knobs, keep it if the result improves | The weights of a simple policy | Total reward from a trial run | Random nudge, keep if better | **Series 4** |
| **Q-learning** (table) | Learns "how good is each move from each situation" as a table | One number per (situation, move) pair | The gap between the table's guess and "reward + discounted best next value" | Move each entry a fraction of the way toward that gap's target | **Series 3**; also planned in your DP/HJB series |
| **Deep Q-network (DQN)** | Q-learning where the table is replaced by a neural network, so it handles situations too numerous to list | The network's weights | Squared gap between the network's guess and the same "better guess" target | Backprop + gradient descent, plus a replay memory so it doesn't forget (and a slow-moving second copy of the network for stable targets) | Next batch |
| **Policy gradient** (REINFORCE) | Skips "how good is each move" and learns directly "how likely should I make each move" | A network's weights that output move probabilities | Expected total reward | Make moves that led to high reward more likely, and moves that led to low reward less likely | Not yet covered |
| **Actor-critic** (PPO and similar) | Two networks: one picks moves, one judges how good the situation is, to steady the learning | Both networks' weights | Reward, corrected by the judge's estimate | Policy gradient plus a Q-style value update | Not yet covered |
| **Dynamic programming / value iteration** | Maze-solving when you already know the full rules of the world, solved by sweeping the table repeatedly | A table of values | Consistency (does each value match reward plus next value?) | Repeat the "better guess" update everywhere until nothing changes | Your DP/HJB series |

---

## The nudge rules, collected in one place

| Nudge rule | In one line | Used by | Needs slopes? |
|---|---|---|---|
| Try everything (grid search) | Test every combination | Series 1 (taxi) | No, but explodes with many knobs |
| Random nudge, keep if better | Hill climbing | Series 4 (CartPole), evolutionary methods | No |
| Gradient descent | Step opposite to the slope | Series 2; almost all neural nets | Yes |
| Backpropagation | A fast way of *getting* all the slopes at once (not an optimizer itself) | Every neural net | It's how you get them |
| SGD / mini-batch | Gradient descent using a small random chunk of the data per step, much cheaper | Large-scale training | Yes |
| Adam, momentum | Gradient descent with smarter step sizes that adapt per knob | Most modern deep learning | Yes |
| Move toward a target | `entry += lr * (target - entry)` | Q-learning (Series 3) | No |
| Greedy split search | Try every split, take the best | Decision trees | No |
| Alternate two steps | Fix one thing, solve the other, swap | k-means | No |
| Closed-form solution | One algebra formula gives the best knobs | Linear regression, PCA | No |

---

## Reading any new algorithm in two minutes

1. **What goes in and what comes out?** (Four state numbers in, yes/no out. A picture in, a label out.)
2. **Find the knobs.** Look for the symbol that appears next to the data in the main formula (w, θ, W, Q). Ask: how many are there, and are they a list, a table, or a structure like a tree?
3. **Find the score.** Look for the formula with a Σ or "E[...]" and L, J, or "loss" in its name. It's how the whole thing measures itself.
4. **Find the update.** Look for an arrow ← or an equals sign with the same symbol on both sides (`w ← w − η ∂L/∂w`). That's the nudge.
5. **Find the hyperparameters.** Everything else (learning rate, k, depth, discount, exploration) is a dial for *you*.

If you can say those five things, you understand the algorithm at the level this series is aiming for. The rest is detail, and the details are what the later lessons fill in.

---

## Math symbols that keep showing up

| Symbol | Means | In your code |
|---|---|---|
| x | the input(s) | `distance_km`, or the 4-number CartPole state |
| y | the correct answer | `actual_fare` |
| ŷ ("y-hat") | the model's guess | `guess(...)` |
| w, W, θ | knobs / weights | `base_fee`, `price_per_km`, `weights`, the Q-table |
| b | the bias (a knob that doesn't multiply an input) | `bias` |
| L, J | the loss / score | `wrongness` |
| Σ | add up over all examples | a `for` loop with `total += ...` |
| argmin / argmax | "which setting gives the smallest / largest value" | `min(..., key=...)` / `max(..., key=...)` |
| ∂L/∂w, ∇L | the slope of the loss with respect to a knob | `slope_of_base_fee` |
| η, α | learning rate | `learning_rate` |
| γ | discount (how much the future counts) | `discount` |
| σ(z) | the sigmoid curve (squashes any number into 0 to 1) | not built yet |
| softmax | turns a list of scores into probabilities that sum to 1 | not built yet |
| E[...] | the average over many tries | `average_balance_time` |
| ← | "update to" | `=` with the old value on the right-hand side |
