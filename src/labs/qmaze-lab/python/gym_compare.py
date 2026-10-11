import gymnasium as gym

from gridworld import GridWorld

# Gymnasium numbers the actions differently from us (LEFT, UP, RIGHT, DOWN = 0, 1, 2, 3).
FROZEN_LAKE_ACTION = {0: 0, 1: 3, 2: 2, 3: 1}     # FrozenLake: LEFT, DOWN, RIGHT, UP
CLIFF_ACTION = {0: 3, 1: 0, 2: 1, 3: 2}           # CliffWalking: UP, RIGHT, DOWN, LEFT


def outcome_set(outcomes):
    """A list of (probability, next_state, reward, terminated) in a fixed order, rounded, to compare."""
    return sorted((round(p, 12), int(s), float(r), bool(t)) for p, s, r, t in outcomes)


def differences(name, gym_env, action_map):
    """Every (state, action) where our P and Gymnasium's P disagree, for states an agent can be in."""
    ours = GridWorld(name)
    theirs = gym_env.unwrapped.P
    found = []
    for state in range(ours.n_states):
        if ours.is_end(state) or ours.cells.get(ours.letter(state), {}).get("to_start"):
            continue
        for action in range(4):
            if outcome_set(ours.P[state][action]) != outcome_set(theirs[state][action_map[action]]):
                found.append((state, action))
    return found


def compare_all():
    results = {
        "frozen_lake": differences("frozen_lake", gym.make("FrozenLake-v1", map_name="4x4", is_slippery=True), FROZEN_LAKE_ACTION),
        "frozen_lake_8x8": differences("frozen_lake_8x8", gym.make("FrozenLake-v1", map_name="8x8", is_slippery=True), FROZEN_LAKE_ACTION),
        "cliff": differences("cliff", gym.make("CliffWalking-v1"), CLIFF_ACTION),
    }
    for name, found in results.items():
        print(name, "identical" if not found else f"{len(found)} differences: {found[:5]}")
    return results
