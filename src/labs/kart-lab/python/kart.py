"""A kart circuit as an environment: three lanes, barriers, moving sweepers, five actions and a reward."""
import random

ACTIONS = ["Left", "Coast", "Right", "Accelerate", "Brake"]
SIZE = 0.65

SUNLIT = {
    "name": "Sunlit Circuit", "length": 144,
    "barriers": [(15, 1), (26, 0), (38, 2), (49, 1), (61, 0), (72, 2), (83, 1), (96, 2), (109, 0), (121, 1), (133, 2)],
    "sweepers": [(32, 0), (90, 13)],
}
HARBOUR = {
    "name": "Harbour Loop", "length": 144,
    "barriers": [(12, 2), (20, 0), (29, 1), (44, 0), (52, 2), (66, 1), (77, 0), (88, 2), (101, 1), (113, 2), (126, 0), (137, 1)],
    "sweepers": [(58, 7), (118, 31)],
}


def clamp(x, low, high):
    """x, but no lower than `low` and no higher than `high`."""
    return max(low, min(high, x))


def reset(seed=1, lane=None):
    """A kart at the start line, standing still, in a lane chosen by the seed (or the one given)."""
    if lane is None:
        lane = random.Random(seed).randrange(3)
    return {"p": 0, "lane": lane, "speed": 0, "ticks": 0, "crashes": 0, "total": 0.0,
            "done": False, "finished": False, "last": None}


def sweeper_lane(tick, offset):
    """Where a sweeper is across the road at time `tick`: from lane 0 to lane 2 and back every 48 ticks."""
    phase = (tick + offset) % 48
    if phase <= 24:
        return phase / 12
    return (48 - phase) / 12


def sweepers(tick, track):
    """The moving sweepers now, each with where it will be one tick later."""
    found = []
    for p, offset in track["sweepers"]:
        found.append({"p": p, "lane": sweeper_lane(tick, offset), "next_p": p,
                      "next_lane": sweeper_lane(tick + 1, offset), "kind": "sweeper"})
    return found


def barriers(track):
    """The barriers, as obstacles that don't move."""
    found = []
    for p, lane in track["barriers"]:
        found.append({"p": p, "lane": lane, "next_p": p, "next_lane": lane, "kind": "barrier"})
    return found


def intent(state, action):
    """Where the kart is trying to go: the lane and speed it asks for, and the sector it would reach."""
    lane = state["lane"]
    if action == 0:
        lane = lane - 1
    if action == 2:
        lane = lane + 1
    speed = state["speed"]
    if action == 3:
        speed = speed + 1
    if action == 4:
        speed = speed - 1
    lane = clamp(lane, 0, 2)
    speed = clamp(speed, 0, 2)
    return {"p": state["p"], "lane": state["lane"], "next_p": state["p"] + speed + 1,
            "next_lane": lane, "speed": speed}


def contact(a, b, length):
    """True if two moving boxes touch at any moment of one tick: both gaps must be under SIZE at the same time."""
    gap = (b["p"] - a["p"] + length / 2) % length - length / 2
    enter = 0.0
    leave = 1.0
    for distance, velocity in ((gap, (b["next_p"] - b["p"]) - (a["next_p"] - a["p"])),
                               (b["lane"] - a["lane"], (b["next_lane"] - b["lane"]) - (a["next_lane"] - a["lane"]))):
        if abs(velocity) < 1e-9:
            if abs(distance) >= SIZE:
                return False
            continue
        t1 = (-SIZE - distance) / velocity
        t2 = (SIZE - distance) / velocity
        enter = max(enter, min(t1, t2))
        leave = min(leave, max(t1, t2))
        if enter >= leave:
            return False
    return enter < leave


def step(state, action, track=SUNLIT, traffic=(), penalty=6, laps=1, kart_contact=False):
    """One decision: move, check for contact, and score the move. A hit stops the kart where it was."""
    if state["done"]:
        return state
    length = track["length"]
    planned = intent(state, action)
    obstacle = None
    for o in barriers(track) + sweepers(state["ticks"], track):
        if obstacle is None and contact(planned, o, length):
            obstacle = o
    hit_kart = kart_contact or any(contact(planned, car, length) for car in traffic)
    hit = obstacle is not None or hit_kart
    p = min(state["p"] if hit else planned["next_p"], length * laps)
    lane = state["lane"] if hit else planned["next_lane"]
    speed = 0 if hit else planned["speed"]
    crashes = state["crashes"] + (1 if hit else 0)
    ticks = state["ticks"] + 1
    finished = p >= length * laps
    done = finished or ticks >= 210 * laps or crashes >= 8 * laps
    parts = {"progress": (p - state["p"]) * 0.15, "time": -0.2,
             "collision": -penalty if hit else 0, "finish": 10 if finished else 0}
    reward = sum(parts.values())
    what = "kart" if hit_kart else (obstacle["kind"] if obstacle is not None else None)
    return {"p": p, "lane": lane, "speed": speed, "ticks": ticks, "crashes": crashes,
            "total": state["total"] + reward, "done": done, "finished": finished,
            "last": {"action": action, "reward": reward, "parts": parts, "hit": what}}


def scripted_traffic(tick, seed, track=SUNLIT):
    """Three practice karts, one per lane, each one sector a tick, starting where the seed puts them."""
    cars = []
    for lane in range(3):
        p = (seed * (lane + 3) + lane * 43 + tick) % track["length"]
        cars.append({"p": p, "lane": lane, "next_p": p + 1, "next_lane": lane})
    return cars


def drive(policy, seed=1, track=SUNLIT, traffic=True):
    """One lap with a policy: policy(state, cars, track) chooses each action. Gives the final state."""
    state = reset(seed)
    while not state["done"]:
        cars = scripted_traffic(state["ticks"], seed, track) if traffic else []
        state = step(state, policy(state, cars, track), track, cars)
    return state
