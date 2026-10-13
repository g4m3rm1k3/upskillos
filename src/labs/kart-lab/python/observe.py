"""What a driver knows. The sector observation a table memorises, and sensors that work on any track."""
from kart import SIZE, SUNLIT, barriers, sweepers

N_KEYS = 144 * 3 * 3 * 8
N_SENSOR_KEYS = 3 * 3 * 27
NEAR = 3
FAR = 6


def ahead(p, other, length):
    """How many sectors ahead `other` is, going round the lap: from 0 up to length − 1."""
    return (other - p) % length


def touches(thing, lane):
    """True if a moving thing is in `lane` now or will be one tick from now."""
    return abs(lane - thing["lane"]) <= SIZE or abs(lane - thing["next_lane"]) <= SIZE


def hazard_mask(state, traffic, track=SUNLIT):
    """Three bits, one per lane: set if a kart or a sweeper is in that lane, alongside or up to 4 sectors ahead."""
    length = track["length"]
    mask = 0
    for thing in list(traffic) + sweepers(state["ticks"], track):
        d = ahead(state["p"], thing["p"], length)
        if d <= 4 or d >= length - SIZE:
            for lane in range(3):
                if touches(thing, lane):
                    mask = mask | (1 << lane)
    return mask


def observe(state, traffic, track=SUNLIT):
    """The sector observation as one number: sector, lane, speed and hazard mask, packed like digits."""
    sector = state["p"] % track["length"]
    mask = hazard_mask(state, traffic, track)
    return ((sector * 3 + state["lane"]) * 3 + state["speed"]) * 8 + mask


def sensors(state, traffic, track=SUNLIT):
    """For each lane, the nearest hazard ahead of any kind: 0 clear, 1 within 6 sectors, 2 within 3."""
    length = track["length"]
    near = [0, 0, 0]
    for thing in barriers(track) + sweepers(state["ticks"], track) + list(traffic):
        d = ahead(state["p"], thing["p"], length)
        if d >= length - SIZE:
            d = 0
        level = 2 if d <= NEAR else 1 if d <= FAR else 0
        for lane in range(3):
            if touches(thing, lane):
                near[lane] = max(near[lane], level)
    return near


def sensor_key(state, traffic, track=SUNLIT):
    """The sensor observation as one number: lane, speed and the three lanes' levels."""
    near = sensors(state, traffic, track)
    return ((state["lane"] * 3 + state["speed"]) * 3 + near[0]) * 9 + near[1] * 3 + near[2]
