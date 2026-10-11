import numpy as np  # setup | NumPy stores our estimates and supplies repeatable random draws.
rng = np.random.default_rng(7)  # setup | Seed the experiment so that comparisons are repeatable.
payout_chances = np.array([0.2, 0.5, 0.8])  # observe | Three machines have hidden chances of paying 1. These belong to the simulated world, not the learner.
estimates = np.zeros(3)  # setup | The learner initially estimates an average reward of zero for every machine.
counts = np.zeros(3, dtype=int)  # store | Count how often each machine has been tried. This is a separate array from estimates.
epsilon = 0.2  # choose | Try a random machine on about 20 percent of turns.
for turn in range(24):  # loop | Each turn is one independent choice and payout. There is no next state or discounted future here.
    explore = rng.random() < epsilon  # choose | A random draw decides whether to explore this turn.
    action = int(rng.integers(3)) if explore else int(np.argmax(estimates))  # choose | Choose a machine index. Ties in argmax select the first index.
    reward = float(rng.random() < payout_chances[action])  # act | The world returns 1 or 0 using that machine's hidden payout chance.
    counts[action] += 1  # store | Increment only the count for the machine just tried.
    before = float(estimates[action])  # learn | Save the old average reward estimate for this machine.
    error = reward - before  # learn | Compare the actual payout with the previous average estimate.
    estimates[action] = before + error / counts[action]  # learn | Running average: old mean plus (new observation minus old mean) divided by the number of observations.
