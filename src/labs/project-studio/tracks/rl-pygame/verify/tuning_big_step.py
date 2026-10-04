# Lesson 7.3: with step 0.5, what does the worst of 10 seeds learn, at epsilon 0.1?
from evaluate_view import make_env
from tuning import final_value
from tuning_view import EPISODES, GAMMA, agent_maker

worst = min(final_value(make_env, agent_maker(0.5, 0.1), seed, EPISODES, GAMMA) for seed in range(10))
print("A policy worth about 0: it never reaches the goal" if worst < 0.02 else worst)
