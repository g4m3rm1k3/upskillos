# Capstone: route planner

The last project brings the series together. An industrial site, a factory campus with workshops, stores and loading bays joined by roads, needs a route planner for its vehicles. Forklifts cannot use the steep ramp. Heavy trucks cannot cross the light bridge. Some roads are one-way, and roads close for maintenance. Dispatchers want a route between two points, the best order to visit several delivery points, and answers fast enough to ask again and again.

The algorithms are from the graph lessons: Dijkstra, A* and the travelling-salesman ideas from bitmask DP. The **design** is from the rest of the series: a small API that callers find obvious, a result object instead of loose tuples, strategies for vehicle rules, a cache that knows when it is stale, and clear errors. Building it is mostly a matter of putting known pieces in the right places.

This lesson covers:

- designing the API first: what callers ask for, and what they get back;
- the network model, and Dijkstra with vehicle restrictions as a pluggable rule;
- A*, and measuring how much work it saves;
- caching routes safely when the network can change;
- planning multi-stop deliveries, exactly for a few stops and approximately for many.

## The API first

Before any algorithm, decide what a caller writes and receives. Callers want to say "route from the stores to bay 3 for a forklift" and get back something they can display: the list of places, the total distance, and each leg. A **`Route`** dataclass carries that, so callers never unpack anonymous tuples. Errors are specific: an unknown place, or no route possible for this vehicle. The network itself is built with plain method calls. Predict before running: what does a route object print as?

```python type
from dataclasses import dataclass
import heapq, math

@dataclass(frozen=True)
class Route:
    stops: tuple
    distance: float
    legs: tuple

    def describe(self):
        lines = [f"{a} -> {b}: {d:.0f} m" for a, b, d in self.legs]
        return "\n".join(lines + [f"total {self.distance:.0f} m via {len(self.legs)} roads"])

class NoRoute(Exception):
    pass

class Network:
    def __init__(self):
        self.places = {}
        self.roads = {}
        self.version = 0

    def add_place(self, name, x, y):
        self.places[name] = (x, y)
        self.roads.setdefault(name, {})
        self.version += 1

    def add_road(self, a, b, tags=(), one_way=False):
        for p in (a, b):
            if p not in self.places:
                raise KeyError(f"unknown place {p!r}")
        length = math.dist(self.places[a], self.places[b])
        self.roads[a][b] = {"length": length, "tags": set(tags), "open": True}
        if not one_way:
            self.roads[b][a] = {"length": length, "tags": set(tags), "open": True}
        self.version += 1

    def set_open(self, a, b, is_open):
        for x, y in ((a, b), (b, a)):
            if y in self.roads.get(x, {}):
                self.roads[x][y]["open"] = is_open
        self.version += 1

site = Network()
for name, x, y in [("gate", 0, 0), ("stores", 120, 0), ("press shop", 120, 90), ("weld bay", 260, 90),
                   ("bay 3", 260, 0), ("paint", 380, 90), ("despatch", 380, 0), ("yard", 0, 160), ("bridge end", 260, 160)]:
    site.add_place(name, x, y)
for a, b, tags in [("gate", "stores", ()), ("stores", "press shop", ()), ("press shop", "weld bay", ("ramp",)),
                   ("stores", "bay 3", ()), ("bay 3", "weld bay", ()), ("weld bay", "paint", ()), ("bay 3", "despatch", ()),
                   ("gate", "yard", ()), ("yard", "bridge end", ("light bridge",)), ("bridge end", "weld bay", ())]:
    site.add_road(a, b, tags)
site.add_road("paint", "despatch", one_way=True)
print(Route(("stores", "bay 3"), 140.0, (("stores", "bay 3", 140.0),)))
print("places:", len(site.places), " roads:", sum(len(v) for v in site.roads.values()), " version:", site.version)
```

```output
Route(stops=('stores', 'bay 3'), distance=140.0, legs=(('stores', 'bay 3', 140.0),))
places: 9  roads: 21  version: 20
```

`version` increases on every change to the network. The cache later uses it to know when old answers have gone stale.

A frozen dataclass prints all its fields, compares by value and cannot be changed by the code that receives it: a good shape for a result. The site has 9 places and 21 road entries: each of the 10 two-way roads is stored in both directions, and the road from paint to despatch is one-way.

## Dijkstra with vehicle rules

The route search is Dijkstra's algorithm with a heap, as in the graph lessons, plus two design choices. A **vehicle rule** is a function deciding whether a vehicle may use a road, given the road's data: a strategy, so new vehicle types need no change to the search. And the search records each place's predecessor, so the route can be rebuilt, legs and all. Predict before running: how does the forklift's route differ from the car's, and what does the heavy truck get?

```python type
VEHICLES = {
    "car": lambda road: True,
    "forklift": lambda road: "ramp" not in road["tags"],
    "heavy truck": lambda road: "light bridge" not in road["tags"],
}

def shortest_route(network, start, goal, allowed=VEHICLES["car"], heuristic=None):
    for p in (start, goal):
        if p not in network.places:
            raise KeyError(f"unknown place {p!r}")
    h = heuristic or (lambda place: 0.0)
    best = {start: 0.0}
    previous = {}
    queue = [(h(start), start)]
    done, expanded = set(), 0
    while queue:
        _, place = heapq.heappop(queue)
        if place in done:
            continue
        if place == goal:
            break
        done.add(place)
        expanded += 1
        for nxt, road in network.roads[place].items():
            if not road["open"] or not allowed(road):
                continue
            new = best[place] + road["length"]
            if new < best.get(nxt, math.inf):
                best[nxt] = new
                previous[nxt] = place
                heapq.heappush(queue, (new + h(nxt), nxt))
    if goal not in best:
        raise NoRoute(f"no route from {start} to {goal}")
    stops = [goal]
    while stops[-1] != start:
        stops.append(previous[stops[-1]])
    stops.reverse()
    legs = tuple((a, b, network.roads[a][b]["length"]) for a, b in zip(stops, stops[1:]))
    route = Route(tuple(stops), round(best[goal], 3), legs)
    route_expanded[0] = expanded
    return route

route_expanded = [0]
print(shortest_route(site, "press shop", "paint").describe())
print()
print(shortest_route(site, "press shop", "paint", VEHICLES["forklift"]).describe())
print()
print(shortest_route(site, "yard", "weld bay", VEHICLES["heavy truck"]).stops)
```

```output
press shop -> weld bay: 140 m
weld bay -> paint: 120 m
total 260 m via 2 roads

press shop -> stores: 90 m
stores -> bay 3: 140 m
bay 3 -> weld bay: 90 m
weld bay -> paint: 120 m
total 440 m via 4 roads

('yard', 'gate', 'stores', 'press shop', 'weld bay')
```

`route_expanded` is a small global counter that records how many places the last search expanded, used in the next section to compare searches.

The car takes the ramp straight from the press shop to the weld bay. The forklift must avoid the ramp, so it goes back through the stores and bay 3, a longer route. The heavy truck reaches the weld bay from the yard without the light bridge, by the long way round through the gate and the stores. Each rule is one line, and a new vehicle type is one more line.

## A*: searching less

Dijkstra explores outward in all directions. **A*** adds a **heuristic**: an estimate of the remaining distance, here the straight-line distance to the goal. It orders the queue by distance so far plus that estimate, so places in the right direction are tried first. Straight-line distance never overestimates a road distance, and here it is also **consistent** (each road's length is exactly the straight-line distance between its ends), which is what guarantees that A*, even though it never re-expands a place, still finds the shortest route. On a large grid of roads, the saving is large. Predict before running: how many places does each search expand on a 40 × 40 grid?

```python type
grid = Network()
for i in range(40):
    for j in range(40):
        grid.add_place((i, j), i * 10, j * 10)
for i in range(40):
    for j in range(40):
        if i + 1 < 40:
            grid.add_road((i, j), (i + 1, j))
        if j + 1 < 40:
            grid.add_road((i, j), (i, j + 1))

start, goal = (2, 3), (30, 25)
r1 = shortest_route(grid, start, goal)
dijkstra_work = route_expanded[0]
r2 = shortest_route(grid, start, goal, heuristic=lambda p: math.dist(grid.places[p], grid.places[goal]))
astar_work = route_expanded[0]
print(f"Dijkstra: {r1.distance:.0f} m, expanded {dijkstra_work} places")
print(f"A*:       {r2.distance:.0f} m, expanded {astar_work} places")
```

```output
Dijkstra: 500 m, expanded 1314 places
A*:       500 m, expanded 782 places
```

The heuristic is passed in as a function, like the vehicle rule, so the search itself does not care which, if any, is used.

Both find the same 500 m route, and A* expands about 40% fewer places, because the heuristic steers it towards the goal instead of exploring evenly in every direction. On a grid the saving is held back by ties: many different staircase routes have exactly the same length, and A* still examines many of them. On real road maps, with thousands of junctions and few ties, the saving is usually much larger, and that is what makes interactive route planning possible.

## A planner with a cache

Dispatchers ask the same questions all day. The `RoutePlanner` facade answers them and caches results in an LRU cache keyed by start, goal and vehicle. But a cached route is only valid for the network it was computed on: if a road closes, the cached answer may now be wrong. Including the network's `version` in the cache key makes stale entries unreachable automatically: after any change, every key is new. Predict before running: is the second request a cache hit, and does closing a road change the third answer?

```python type
from collections import OrderedDict

class RoutePlanner:
    def __init__(self, network, cache_size=256):
        self.network = network
        self._cache = OrderedDict()
        self._cache_size = cache_size
        self.hits = self.misses = 0

    def route(self, start, goal, vehicle="car"):
        if vehicle not in VEHICLES:
            raise ValueError(f"unknown vehicle {vehicle!r}; choose from {sorted(VEHICLES)}")
        key = (start, goal, vehicle, self.network.version)
        if key in self._cache:
            self.hits += 1
            self._cache.move_to_end(key)
            return self._cache[key]
        self.misses += 1
        goal_xy = self.network.places.get(goal)
        heuristic = (lambda p: math.dist(self.network.places[p], goal_xy)) if goal_xy else None
        result = shortest_route(self.network, start, goal, VEHICLES[vehicle], heuristic)
        self._cache[key] = result
        if len(self._cache) > self._cache_size:
            self._cache.popitem(last=False)
        return result

planner = RoutePlanner(site)
print(planner.route("stores", "despatch").stops)
print(planner.route("stores", "despatch").stops, " hits:", planner.hits)
site.set_open("bay 3", "despatch", False)
print(planner.route("stores", "despatch").stops, " hits:", planner.hits, " misses:", planner.misses)
site.set_open("bay 3", "despatch", True)
try:
    planner.route("stores", "despatch", vehicle="drone")
except ValueError as error:
    print("ValueError:", error)
```

```output
('stores', 'bay 3', 'despatch')
('stores', 'bay 3', 'despatch')  hits: 1
('stores', 'bay 3', 'weld bay', 'paint', 'despatch')  hits: 1  misses: 2
ValueError: unknown vehicle 'drone'; choose from ['car', 'forklift', 'heavy truck']
```

The planner is a facade: callers name places and a vehicle, and never see heaps, heuristics or cache keys.

The second request is a cache hit. Closing the road between bay 3 and despatch bumps the network's version, so the third request misses the cache, recomputes, and goes round through the weld bay and paint. No code had to remember to clear the cache. Old entries simply stop matching, and the LRU limit eventually evicts them.

::: challenge Travel time and a summary [easy]
Write `travel_minutes(route, speeds, default_speed)`, returning the time in minutes to drive a `Route`, where `speeds` is a dict from a road's two ends, as a tuple `(a, b)`, to that road's speed in metres per minute, either direction counting (so `(b, a)` gives the same road), and roads not in `speeds` use `default_speed`. Round to 1 decimal place. Then write `summary(route)`, returning `f"{first} to {last}: {distance:.0f} m, {n} legs"`, or `f"already at {place}"` for a route with no legs.

```python starter
def travel_minutes(route, speeds, default_speed):
    return 0.0

print(travel_minutes(Route(("a", "b"), 100.0, (("a", "b", 100.0),)), {}, 50))
```

```python solution
def travel_minutes(route, speeds, default_speed):
    total = 0.0
    for a, b, length in route.legs:
        speed = speeds.get((a, b), speeds.get((b, a), default_speed))
        total += length / speed
    return round(total, 1)

def summary(route):
    if not route.legs:
        return f"already at {route.stops[0]}"
    return f"{route.stops[0]} to {route.stops[-1]}: {route.distance:.0f} m, {len(route.legs)} legs"

r = Route(("a", "b", "c"), 300.0, (("a", "b", 100.0), ("b", "c", 200.0)))
print(travel_minutes(r, {("c", "b"): 40}, 100), summary(r))
```

```python test
for _n in ["travel_minutes", "summary"]:
    assert _n in dir(), f"Define {_n}."
_r = Route(("a", "b", "c"), 300.0, (("a", "b", 100.0), ("b", "c", 200.0)))
assert travel_minutes(_r, {}, 100) == 3.0, "300 m at 100 m/min is 3 minutes."
assert travel_minutes(_r, {("c", "b"): 40}, 100) == 6.0, "Speeds apply in either direction: 1 + 200/40 = 6 minutes."
assert travel_minutes(_r, {("a", "b"): 30, ("b", "c"): 70}, 100) == round(100 / 30 + 200 / 70, 1), "Each road at its own speed."
assert summary(_r) == "a to c: 300 m, 2 legs", f"Got {summary(_r)!r}."
assert summary(Route(("gate",), 0.0, ())) == "already at gate", "A route with no legs."
_real = shortest_route(site, "gate", "paint")
assert summary(_real).startswith("gate to paint: ") and travel_minutes(_real, {}, 200) == round(_real.distance / 200, 1), "Works on the planner's routes."
"SUCCESS: Because routes are one well-defined object, new reports on them are small functions that never touch the search."
```

Hint: Loop over `route.legs`, looking up each road's speed with `speeds.get((a, b), speeds.get((b, a), default_speed))`. For the summary, use the first and last stops, the distance and the number of legs.
:::

::: challenge Detours around closures [medium]
Write `with_detour(planner, start, goal, closed, vehicle="car")`, which plans a route while temporarily closing every road in `closed` (a list of `(a, b)` pairs, each closed in both directions; a pair may name a one-way road from either end), then **reopens** them, even if planning fails, so the network ends exactly as it started. It returns `(route, extra)`, where `extra` is how many metres longer the detour is than the route with the roads open, rounded to 1 decimal place. If no detour exists, it lets the `NoRoute` error reach the caller (after reopening). Only close roads that are currently open: a road that was already closed must still be closed afterwards. Use the lesson's `RoutePlanner` and the network's `set_open`.

```python starter
def with_detour(planner, start, goal, closed, vehicle="car"):
    return planner.route(start, goal, vehicle), 0.0

print(with_detour(RoutePlanner(site), "stores", "despatch", [("bay 3", "despatch")]))
```

```python solution
def with_detour(planner, start, goal, closed, vehicle="car"):
    network = planner.network
    normal = planner.route(start, goal, vehicle)
    newly_closed = []
    try:
        for a, b in closed:
            if b in network.roads.get(a, {}) and network.roads[a][b]["open"] or a in network.roads.get(b, {}) and network.roads[b][a]["open"]:
                network.set_open(a, b, False)
                newly_closed.append((a, b))
        detour = planner.route(start, goal, vehicle)
    finally:
        for a, b in newly_closed:
            network.set_open(a, b, True)
    return detour, round(detour.distance - normal.distance, 1)

route, extra = with_detour(RoutePlanner(site), "stores", "despatch", [("bay 3", "despatch")])
print(route.stops, extra)
```

```python test
assert "with_detour" in dir(), "Keep the function's name as with_detour."
_p = RoutePlanner(site)
_normal = _p.route("stores", "despatch")
_route, _extra = with_detour(_p, "stores", "despatch", [("bay 3", "despatch")])
assert "despatch" == _route.stops[-1] and ("bay 3", "despatch") not in list(zip(_route.stops, _route.stops[1:])), "The detour avoids the closed road."
assert _extra == round(_route.distance - _normal.distance, 1) and _extra > 0, f"extra is how much longer the detour is; got {_extra}."
assert all(_r["open"] for _ends in site.roads.values() for _r in _ends.values()), "Every road must be open again afterwards."
assert _p.route("stores", "despatch").stops == _normal.stops, "Afterwards, routing is back to normal."
site.set_open("weld bay", "paint", False)
try:
    try:
        with_detour(_p, "stores", "despatch", [("bay 3", "despatch"), ("despatch", "paint"), ("weld bay", "paint")])
        assert False, "With both ways into despatch closed, NoRoute should reach the caller."
    except NoRoute:
        pass
    assert site.roads["bay 3"]["despatch"]["open"] and site.roads["paint"]["despatch"]["open"], "Roads closed for the detour reopen even when planning fails."
    assert not site.roads["weld bay"]["paint"]["open"], "A road that was already closed must stay closed, even if it is in the list."
finally:
    for _x, _ends in site.roads.items():
        for _y in _ends:
            site.roads[_x][_y]["open"] = True
    site.version += 1
_r2, _e2 = with_detour(_p, "gate", "bay 3", [])
assert _e2 == 0 and _r2.stops == _p.route("gate", "bay 3").stops, "No closures, no detour."
"SUCCESS: The detour is planned on a temporarily changed network that is always put back, and the version-aware cache never returns a stale route."
```

Hint: Compute the normal route first. Then close only roads that are currently open, remembering which ones you closed, inside `try`, and plan again; in `finally`, reopen exactly the roads you closed. The planner's cache handles the changes itself, because closing and reopening change the network's version.
:::

::: challenge Best delivery order [hard]
A delivery vehicle starts at `depot`, must visit every place in `stops` once, in any order, and return to the depot. Write `plan_round(planner, depot, stops, vehicle="car")`, returning `(order, distance)`: the visiting order (a list of the stops, not including the depot) that minimises the total driving distance, and that distance rounded to 1 decimal place. Use the planner's road distances between every pair of places (`planner.route(a, b, vehicle).distance`; roads can be one-way, so a→b and b→a may differ). For up to 8 stops, find the **exact** best order. For more, use the **nearest neighbour** heuristic: from the current place, always drive to the nearest unvisited stop, breaking ties by name. Raise `ValueError` if `stops` contains the depot or duplicates. If some stop cannot be reached, let the planner's `NoRoute` error reach the caller. An empty list of stops gives `([], 0.0)`.

```python starter
def plan_round(planner, depot, stops, vehicle="car"):
    return list(stops), 0.0

print(plan_round(RoutePlanner(site), "stores", ["paint", "yard", "bay 3"]))
```

```python solution
import itertools

def plan_round(planner, depot, stops, vehicle="car"):
    if depot in stops or len(set(stops)) != len(stops):
        raise ValueError("stops must be distinct and must not include the depot")
    if not stops:
        return [], 0.0
    places = [depot] + list(stops)
    dist = {(a, b): planner.route(a, b, vehicle).distance for a in places for b in places if a != b}

    def tour_length(order):
        path = [depot] + list(order) + [depot]
        return sum(dist[(a, b)] for a, b in zip(path, path[1:]))

    if len(stops) <= 8:
        best = min(itertools.permutations(stops), key=tour_length)
        return list(best), round(tour_length(best), 1)
    order, here, left = [], depot, set(stops)
    while left:
        nxt = min(left, key=lambda s: (dist[(here, s)], s))
        order.append(nxt)
        left.remove(nxt)
        here = nxt
    return order, round(tour_length(order), 1)

print(plan_round(RoutePlanner(site), "stores", ["paint", "yard", "bay 3"]))
```

```python test
import itertools as _it, random as _random
assert "plan_round" in dir(), "Keep the function's name as plan_round."
_p = RoutePlanner(site)
assert plan_round(_p, "stores", []) == ([], 0.0), "No stops."
_order, _d = plan_round(_p, "stores", ["paint", "yard", "bay 3"])
assert sorted(_order) == ["bay 3", "paint", "yard"], "Visit every stop once."
def _tour(_planner, _depot, _order):
    _path = [_depot] + list(_order) + [_depot]
    return sum(_planner.route(_a, _b).distance for _a, _b in zip(_path, _path[1:]))
_best = min(_tour(_p, "stores", _o) for _o in _it.permutations(["paint", "yard", "bay 3"]))
assert abs(_d - round(_best, 1)) < 1e-9 and abs(_tour(_p, "stores", _order) - _best) < 1e-6, f"For 3 stops the exact best tour is {_best:.1f} m; got {_d}."
for _bad in [["paint", "paint"], ["stores", "paint"]]:
    try:
        plan_round(_p, "stores", _bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
_oneway = Network()
for _n, _x, _y in [("D", 0, 0), ("A", 100, 0), ("B", 100, 100)]:
    _oneway.add_place(_n, _x, _y)
_oneway.add_road("D", "A", one_way=True); _oneway.add_road("A", "B", one_way=True); _oneway.add_road("B", "D", one_way=True)
_oneway.add_road("D", "B", one_way=True); _oneway.add_road("B", "A", one_way=True); _oneway.add_road("A", "D", one_way=True)
_po = RoutePlanner(_oneway)
_o2, _d2 = plan_round(_po, "D", ["A", "B"])
assert abs(_d2 - round(_tour(_po, "D", _o2), 1)) < 1e-9, "Use directed road distances."
_rng = _random.Random(16)
_city = Network()
for _i in range(14):
    _city.add_place(f"P{_i}", _rng.uniform(0, 1000), _rng.uniform(0, 1000))
for _i in range(14):
    for _j in range(_i + 1, 14):
        if _rng.random() < 0.35 or _j == _i + 1:
            _city.add_road(f"P{_i}", f"P{_j}")
_pc = RoutePlanner(_city)
_stops = [f"P{_i}" for _i in range(1, 7)]
_o3, _d3 = plan_round(_pc, "P0", _stops)
_exact = min(_tour(_pc, "P0", _o) for _o in _it.permutations(_stops))
assert abs(_d3 - round(_exact, 1)) < 1e-9, "Up to 8 stops, the answer must be the exact best."
_many = [f"P{_i}" for _i in range(1, 14)]
_o4, _d4 = plan_round(_pc, "P0", _many)
assert sorted(_o4) == sorted(_many) and abs(_d4 - round(_tour(_pc, "P0", _o4), 1)) < 1e-9, "13 stops: a complete order, with its true length."
_here, _left, _nn = "P0", set(_many), []
while _left:
    _nxt = min(_left, key=lambda _s: (_pc.route(_here, _s).distance, _s))
    _nn.append(_nxt); _left.remove(_nxt); _here = _nxt
assert _o4 == _nn, "Over 8 stops, use nearest neighbour (ties by name)."
_isle = Network(); _isle.add_place("D", 0, 0); _isle.add_place("X", 5, 5)
try:
    plan_round(RoutePlanner(_isle), "D", ["X"])
    assert False, "An unreachable stop should let NoRoute through."
except NoRoute:
    pass
"SUCCESS: Road distances from the planner feed an exact search for small rounds and a fast heuristic for large ones: the graph algorithms and the planner's API working together."
```

Hint: Check the inputs, then build a dict of road distances between every ordered pair of places (depot and stops) with `planner.route(a, b, vehicle).distance`. For 8 stops or fewer, take the `min` over `itertools.permutations(stops)` of the tour length, depot to depot. For more, repeatedly move to the nearest unvisited stop, breaking ties by name.
:::

## What you learned

- Design the API before the algorithms: what callers ask (places and a vehicle), what they get (a frozen `Route` with stops, distance and legs) and which errors they can catch (`KeyError`, `NoRoute`, `ValueError`).
- Dijkstra with a heap finds shortest routes. Vehicle restrictions are a pluggable rule (a strategy), and predecessors rebuild the route.
- A* adds a consistent heuristic, straight-line distance, and finds the same route while expanding fewer places.
- A facade with an LRU cache answers repeated questions instantly. Including the network's version in the key makes stale answers unreachable without any manual clearing.
- Multi-stop rounds use the planner's road distances: exact search for a few stops, a fast heuristic for many. The same trade-off between exact exponential methods and good approximations appeared with Held–Karp and the job scheduler.

That completes the series: data structures and algorithms from the cost of a list operation to graph search, and object design from one responsible class to a pattern-shaped, well-tested system. The same habits carry on to any program: measure, choose structures for the operations you need, design for the changes you expect, and test what you build.
