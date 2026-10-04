# Lesson 7.2: do any of the 20 seeds' measured final scores come out above the proven optimum?
from evaluate_view import CHECKPOINTS, EVAL_EPISODES, EVERY, GAMMA, TARGET_SEEDS, make_agent, make_env, reference_values
from evaluation import learning_curve

best, _ = reference_values()
finals = [learning_curve(make_env, make_agent, seed, CHECKPOINTS, EVERY, EVAL_EPISODES, GAMMA)[-1] for seed in range(TARGET_SEEDS)]
print("Yes: a few measure above it" if max(finals) > best else max(finals))
