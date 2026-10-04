# Lesson 7.4: at its worst, how often does each learner go left from A (1000 runs of 300 episodes)?
from bias import left_share
from bias_view import EPISODES, make
from learners import DoubleQLearning, QLearning

q = left_share(make(QLearning), 1000, EPISODES).max()
double = left_share(make(DoubleQLearning), 1000, EPISODES).max()
print("Q-learning: in about 3 episodes of 4" if 0.65 < q < 0.85 and double < 0.25 else (q, double))
