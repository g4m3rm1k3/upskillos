# Lesson 7.2: how widely do the 20 seeds' measured final scores spread?
from evaluate_view import CHECKPOINTS, EVAL_EPISODES, EVERY, GAMMA, TARGET_SEEDS, make_agent, make_env
from evaluation import learning_curve

finals = [learning_curve(make_env, make_agent, seed, CHECKPOINTS, EVERY, EVAL_EPISODES, GAMMA)[-1] for seed in range(TARGET_SEEDS)]
spread = max(finals) - min(finals)
print("Over about 0.15: from below 0.2 to above 0.3" if 0.08 < spread < 0.3 else spread)
