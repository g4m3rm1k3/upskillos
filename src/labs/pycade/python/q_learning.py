import gymnasium as gym  # setup | Gymnasium supplies the real CartPole simulation and its reset/step interface.
import numpy as np  # setup | NumPy stores rectangular tables and performs numerical operations.

seed = 7  # setup | A seed makes random choices repeatable for this experiment.
alpha = 0.12  # learn | Learning rate: move this fraction of the distance from the old estimate to the target.
gamma = 0.99  # learn | Discount: one future reward counts as 0.99 of a reward now.
epsilon = 0.2  # choose | Explore on about 20 percent of decisions instead of choosing the current best estimate.
env = gym.make("CartPole-v1")  # observe | Construct a world. This does not yet start an episode.
rng = np.random.default_rng(seed)  # choose | Keep a repeatable source of random numbers for action selection.
edges = [np.array([0.0]), np.array([0.0]), np.array([-0.1, 0.0, 0.1]), np.array([-0.5, 0.0, 0.5])]  # represent | Four sets of boundaries turn continuous measurements into 2 × 2 × 4 × 4 discrete regions.
q = np.zeros((64, 2))  # represent | A 64-row, 2-column array. Each row is a region; columns 0 and 1 estimate left and right future reward.
reset_result = env.reset(seed=seed)  # observe | Gymnasium returns a TWO-slot tuple: the initial observation and an information dictionary.
obs, info = reset_result  # observe | Unpacking assigns slot 0 to obs and slot 1 to info. No physics happens on this line.
for step in range(24):  # loop | Repeat a complete observe–choose–act–learn cycle 24 times. This short trace is not a trained expert.
    bins = tuple(int(np.digitize(obs[i], edges[i])) for i in range(4))  # represent | For each observation, count which boundary interval contains it. The four bin indices form a tuple.
    state = int(np.ravel_multi_index(bins, (2, 2, 4, 4)))  # represent | Flatten four coordinates into one table row: ((b0 × 2 + b1) × 4 + b2) × 4 + b3.
    row = q[state].copy()  # choose | Save the two estimates before acting. copy keeps this snapshot separate from future table mutations.
    draw = float(rng.random())  # choose | Draw one number from 0 inclusive to 1 exclusive to decide whether to explore.
    explore = draw < epsilon  # choose | Compare the draw with epsilon. True selects exploration; False selects the largest table entry.
    action = int(rng.integers(2)) if explore else int(np.argmax(row))  # choose | The action is an INDEX, not a Q value: 0 pushes left, 1 pushes right. Ties choose index 0.
    step_result = env.step(action)  # act | Advance the actual Gymnasium world once. It returns FIVE slots; expand them beside the code.
    next_obs, reward, terminated, truncated, info = step_result  # act | Name the five slots in order. This only unpacks the existing tuple; it does not take another action.
    next_bins = tuple(int(np.digitize(next_obs[i], edges[i])) for i in range(4))  # represent | Encode the newly returned measurements with the same boundaries used for obs.
    next_state = int(np.ravel_multi_index(next_bins, (2, 2, 4, 4)))  # represent | This is the row used to estimate what could happen AFTER the action.
    before = float(q[state, action])  # learn | Read one old estimate at the intersection of the previous state row and chosen action column.
    future = 0.0 if terminated else float(np.max(q[next_state]))  # learn | On real failure there is no future reward. A time limit alone still allows a future estimate.
    target = reward + gamma * future  # learn | Target = observed reward + discounted estimate of the best future reward.
    error = target - before  # learn | The temporal-difference error says how far our old estimate is from the new target.
    q[state, action] = before + alpha * error  # learn | Write ONE table cell. Every other estimate stays unchanged.
    after = float(q[state, action])  # learn | Read back the new value so you can check the arithmetic against the table.
    obs = next_obs  # loop | Carry the new observation into the next decision. Otherwise the agent would act on stale measurements.
    if terminated or truncated:  # loop | Either kind of ending requires reset before another environment step.
        obs, info = env.reset()  # observe | Start a new episode; keep the learned Q table across episodes.
env.close()  # loop | Release the environment resources after this short experiment.
