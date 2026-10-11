from cartpole import CartPole

COUNTS = (1, 1, 6, 12)
LIMITS = (2.4, 3.0, 0.21, 3.5)


def make_edges(limit, count):
    """count - 1 cut points, evenly spaced from -limit to +limit: they split the line into count slots."""
    width = 2 * limit / count
    return [-limit + width * i for i in range(1, count)]


def slot(value, edges):
    """Which slot a number falls in: how many cut points are at or below it (0 ... len(edges))."""
    n = 0
    for edge in edges:
        if value >= edge:
            n += 1
    return n


def to_state(slots, counts):
    """Several slot numbers into one whole number, like reading digits: one row of the Q-table."""
    state = 0
    for s, count in zip(slots, counts):
        state = state * count + s
    return state


class BinnedCartPole:
    """CartPole as a table can see it: the 4 real numbers cut into slots, reported as one state number."""

    def __init__(self, counts=COUNTS, limits=LIMITS, **physics):
        self.world = CartPole(**physics)
        self.counts = counts
        self.edges = [make_edges(limit, count) for limit, count in zip(limits, counts)]
        self.n_states = 1
        for count in counts:
            self.n_states *= count
        self.n_actions = 2

    def state_of(self, observation):
        slots = [slot(value, edges) for value, edges in zip(observation, self.edges)]
        return to_state(slots, self.counts)

    def reset(self, seed=None):
        observation, info = self.world.reset(seed=seed)
        return self.state_of(observation), info

    def step(self, action):
        observation, reward, terminated, truncated, info = self.world.step(action)
        return self.state_of(observation), reward, terminated, truncated, info
