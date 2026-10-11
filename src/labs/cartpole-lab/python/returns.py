def discounted_return(rewards, gamma):
    """G_0 = R_1 + gamma R_2 + gamma^2 R_3 + ...: the rewards of one episode, discounted."""
    G = 0.0
    for k, reward in enumerate(rewards):
        G += gamma ** k * reward
    return G


def all_returns(rewards, gamma):
    """G_t for every time step t, worked out backwards with G_t = R_t+1 + gamma G_t+1."""
    G = 0.0
    returns = []
    for reward in reversed(rewards):
        G = reward + gamma * G
        returns.insert(0, G)
    return returns
