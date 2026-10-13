"""Three karts on one track at once: all decide from the same moment, move together, and a bump stops both."""
from drivers import careful
from kart import SUNLIT, contact, reset, step


def create_race():
    """Three karts on the start line, one per lane."""
    return {"cars": [reset(1, lane) for lane in range(3)], "tick": 0}


def as_traffic(car):
    """Another kart as a driver sees it: where it is, with no knowledge of where it will go."""
    return {"p": car["p"], "lane": car["lane"], "next_p": car["p"], "next_lane": car["lane"]}


def path(before, after):
    """A kart's movement during one tick, from where it was to where it ended."""
    return {"p": before["p"], "lane": before["lane"], "next_p": after["p"], "next_lane": after["lane"]}


def step_race(race, policies, track=SUNLIT, laps=3):
    """One tick for everyone. Each kart moves on its own; karts whose paths touch are both stopped, again until no new bumps."""
    cars = race["cars"]
    if all(car["done"] for car in cars):
        return race
    actions = []
    for i, car in enumerate(cars):
        others = [as_traffic(c) for j, c in enumerate(cars) if j != i and not c["done"]]
        actions.append(policies[i](car, others, track))
    moved = [step(car, actions[i], track, (), 6, laps) for i, car in enumerate(cars)]
    bumped = set()
    for _ in range(len(cars)):
        added = set()
        for i in range(len(cars)):
            for j in range(i + 1, len(cars)):
                if cars[i]["done"] or cars[j]["done"]:
                    continue
                if contact(path(cars[i], moved[i]), path(cars[j], moved[j]), track["length"]):
                    added.add(i)
                    added.add(j)
        changed = False
        for i in sorted(added):
            if i not in bumped:
                bumped.add(i)
                changed = True
                moved[i] = step(cars[i], actions[i], track, (), 6, laps, kart_contact=True)
        if not changed:
            break
    return {"cars": moved, "tick": race["tick"] + 1}


def rank_race(race):
    """The order: finishers by time first, then everyone else by how far they got."""
    order = list(range(len(race["cars"])))
    return sorted(order, key=lambda i: (0, race["cars"][i]["ticks"]) if race["cars"][i]["finished"] else (1, -race["cars"][i]["p"]))


def run_race(policies, track=SUNLIT):
    """A whole three-lap race."""
    race = create_race()
    while not all(car["done"] for car in race["cars"]):
        race = step_race(race, policies, track)
    return race


ORDERS = [(0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)]


def tournament(policies, track=SUNLIT):
    """Six races, one for every way to place the three drivers in the three lanes. 3, 2 and 1 points per race; a kart that doesn't finish scores 0."""
    points = [0.0, 0.0, 0.0]
    finishes = [0, 0, 0]
    for order in ORDERS:
        race = run_race([policies[k] for k in order], track)
        cars = race["cars"]
        for seat, car in enumerate(cars):
            if not car["finished"]:
                continue
            driver = order[seat]
            finishes[driver] += 1
            better = len([c for c in cars if c["finished"] and c["ticks"] < car["ticks"]])
            tied = len([c for c in cars if c["finished"] and c["ticks"] == car["ticks"]])
            points[driver] += sum(3 - better - k for k in range(tied)) / tied
    return points, finishes


def lane_draw():
    """Three identical careful drivers in all six orders: any difference in points comes from the starting lanes alone."""
    return tournament([careful, careful, careful])
