from collections import deque


class ReplayMemory:
    def __init__(self, capacity, rng):
        self.items = deque(maxlen=capacity)
        self.rng = rng

    def __len__(self):
        return len(self.items)

    def add(self, item):
        self.items.append(item)

    def sample(self, n):
        chosen = self.rng.choice(len(self.items), n, replace=False)
        return [self.items[i] for i in chosen]
