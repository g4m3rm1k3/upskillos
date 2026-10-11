import gymnasium as gym  # setup | Gymnasium supplies each real CartPole world.
import numpy as np  # setup | NumPy groups the observations from separate worlds into a rectangular array.
import torch  # setup | PyTorch stores tensors and records how differentiable calculations depend on network weights.
from torch import nn  # setup | nn supplies trainable Linear layers and activation functions.
from torch.distributions import Categorical  # choose | Categorical describes a random choice among discrete action indices.

seed = 7  # setup | Reproduce initial weights, reset states and sampled actions.
gamma = 0.99  # learn | Discount future rewards by 0.99 per step.
learning_rate = 0.003  # learn | The optimizer uses this step size when changing network weights.
entropy_weight = 0.01  # learn | Encourage some uncertainty so the actor does not stop exploring too early.
torch.manual_seed(seed)  # setup | Seed PyTorch before initializing networks or sampling actions.
envs = [gym.make("CartPole-v1") for _ in range(2)]  # observe | Two independent worlds contribute experience to ONE shared actor and critic.
actor = nn.Sequential(nn.Linear(4, 8), nn.Tanh(), nn.Linear(8, 2))  # choose | Four measurements → eight hidden activations → two action scores, called logits.
critic = nn.Sequential(nn.Linear(4, 8), nn.Tanh(), nn.Linear(8, 1))  # learn | Four measurements → eight hidden activations → one estimate of discounted future reward.
optimizer = torch.optim.Adam(list(actor.parameters()) + list(critic.parameters()), lr=learning_rate)  # learn | Adam will update both networks using the gradients calculated from the loss.
obs = np.stack([env.reset(seed=seed + i)[0] for i, env in enumerate(envs)])  # observe | reset returns (observation, info); [0] selects observation. stack builds a [2 worlds, 4 measurements] array.
for update in range(2):  # loop | Two small updates reveal the machinery. This is an untrained learner, not a balancing demonstration.
    rollout = []  # store | A Python list will collect four time steps. Each item is a dictionary of tensors for both worlds.
    for step in range(4):  # loop | Collect four steps in each of the two worlds before synchronously updating the shared weights.
        x = torch.tensor(obs, dtype=torch.float32)  # observe | Convert the NumPy [2, 4] array into a float32 tensor PyTorch layers can use.
        logits = actor(x)  # choose | Apply the actor to both rows. Output shape [2, 2]: world × action score.
        distribution = Categorical(logits=logits)  # choose | Convert each pair of scores to probabilities with softmax; each row sums to one.
        probabilities = distribution.probs  # choose | Inspect the actual chance of left and right in each world, rather than treating logits as probabilities.
        actions = distribution.sample()  # choose | Sample one action index per world. Shape [2]; values are 0 or 1.
        values = critic(x).squeeze(-1)  # learn | The critic gives [2, 1]; squeeze removes only the final singleton axis, giving [2].
        results = [env.step(int(actions[i])) for i, env in enumerate(envs)]  # act | Each world returns its own five-slot tuple. The outer container is a list with two items.
        next_obs = np.stack([result[0] for result in results])  # act | Take slot 0 from each returned tuple. This [2, 4] array contains observations BEFORE any reset.
        rewards = torch.tensor([result[1] for result in results], dtype=torch.float32)  # act | Slot 1 contains the reward actually emitted by each world, one number per world.
        terminated = torch.tensor([result[2] for result in results])  # act | Slot 2 is True for real failure. It tells learning not to bootstrap beyond that ending.
        truncated = torch.tensor([result[3] for result in results])  # act | Slot 3 is True for a time limit. Reset is required but a future value estimate is still meaningful.
        next_values = critic(torch.tensor(next_obs)).squeeze(-1).detach()  # learn | Estimate the next observations. detach freezes these targets so gradients do not chase a moving target through this branch.
        rollout.append(dict(rewards=rewards, values=values, next_values=next_values, terminated=terminated, truncated=truncated, log_prob=distribution.log_prob(actions), entropy=distribution.entropy()))  # store | Save the evidence and differentiable actor/critic outputs. log_prob selects the logarithm of the probability of each action that was actually taken.
        obs = np.stack([envs[i].reset()[0] if result[2] or result[3] else result[0] for i, result in enumerate(results)])  # loop | Use a reset observation only for ended worlds. Stored next_values still refer to the pre-reset observation.
    returns = []  # learn | We will build one reward target per time and world, working backward through the rollout.
    running = rollout[-1]["next_values"]  # learn | Start at the end: estimate rewards beyond the last collected step. [-1] means the last list item.
    for item in reversed(rollout):  # learn | Work backward so each earlier step can include the rewards that followed it.
        continuation = torch.where(item["truncated"], item["next_values"], running)  # learn | At a time limit use the final observation estimate, not rewards from the newly reset episode.
        running = item["rewards"] + gamma * (~item["terminated"]).float() * continuation  # learn | G = r + γ × (1 − terminal) × future. A real terminal state cancels all future reward.
        returns.insert(0, running)  # store | Insert at the FRONT to restore chronological order after walking backward.
    targets = torch.stack(returns)  # learn | Stack four [2] tensors into [4 time steps, 2 worlds].
    baselines = torch.stack([item["values"] for item in rollout])  # learn | Match each target to the critic prediction made BEFORE that action.
    advantages = targets - baselines  # learn | Advantage = observed/estimated return − expected return. Positive means better than the critic expected.
    log_probs = torch.stack([item["log_prob"] for item in rollout])  # learn | A [4, 2] tensor of log probabilities for the chosen actions, still connected to actor weights.
    actor_loss = -(log_probs * advantages.detach()).mean()  # learn | Minimize negative log probability × advantage. Positive advantage increases the chosen action's probability. detach prevents this actor term from changing the critic.
    critic_loss = advantages.square().mean()  # learn | Mean squared prediction error trains the critic to predict the targets more accurately.
    entropy = torch.stack([item["entropy"] for item in rollout]).mean()  # learn | Average uncertainty of the action distributions; higher entropy means less concentrated probabilities.
    loss = actor_loss + 0.5 * critic_loss - entropy_weight * entropy  # learn | Combine acting, prediction and exploration into one scalar objective for gradient descent.
    optimizer.zero_grad()  # learn | Clear gradients left over from a previous update. This does not reset the learned weights.
    loss.backward()  # learn | PyTorch follows the recorded calculation graph backward and writes a derivative into each parameter's .grad field.
    gradient_norm = torch.nn.utils.clip_grad_norm_(list(actor.parameters()) + list(critic.parameters()), 0.5)  # learn | Limit total gradient magnitude to 0.5; the returned number is the norm BEFORE clipping.
    optimizer.step()  # learn | Adam changes the weights using those gradients. Future calls to actor(x) and critic(x) now use the new weights.
for env in envs:  # loop | Both worlds must be released when the experiment ends.
    env.close()  # loop | Close one world. The learned network objects still exist in Python memory.
