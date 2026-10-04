# Lesson 8.3: two seeds, 2000 episodes each: how do their greedy policies compare on 100 new episodes?
from balance import judge, train_balancer

means = sorted(judge(train_balancer(seed=s)[0]).mean() for s in (0, 1))
print("Very different: one keeps the pole up every time, one doesn't" if means[1] >= 450 and means[0] <= 250 else means)
