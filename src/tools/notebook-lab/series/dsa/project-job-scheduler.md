# Project: job scheduler

A fabrication shop has a list of jobs for the day: cut the plates, drill the brackets, weld the frame, paint it, assemble the guard. Some jobs depend on others (you cannot weld a frame before its parts are cut), each has a duration, and there are only a few machines or people to do them. In what order should the jobs run, and when will everything be finished? That finishing time is the **makespan**, and making it short is the scheduler's goal.

Finding the very best schedule is hard in general (it is NP-hard, like the travelling salesman problem). But a simple, fast method, **list scheduling**, gives good schedules in practice. Whenever a machine is free, give it the most urgent job whose dependencies are done. "Most urgent" is a choice of rule: a **strategy**. This project builds the scheduler from pieces of the series: a topological sort to check the dependencies, priority queues for the ready jobs and for the machines' finishing times, strategies for urgency, and a schedule checker to test it all.

This lesson covers:

- modelling jobs, and validating their dependencies with Kahn's topological sort;
- list scheduling as an event-driven simulation with two heaps;
- urgency rules as strategies, including the critical path, and comparing them;
- a lower bound that tells you how far from optimal a schedule can be.

## Jobs and their dependencies

A job has a name, a duration and the names of the jobs it depends on. Before scheduling anything, check that the dependencies make sense: every dependency must be a real job, and there must be no **cycle** (A waits for B, which waits for A), or nothing could ever start. Kahn's algorithm from the topological sort lesson does both. Repeatedly take a job with no unfinished dependencies; if jobs remain that never become free, they form a cycle. Predict before running: is the shop's plan valid, and what does the broken plan report?

```python type
from dataclasses import dataclass, field
from collections import deque
import heapq

@dataclass(frozen=True)
class Job:
    name: str
    hours: float
    after: tuple = ()
    priority: int = 0

def topological_order(jobs):
    names = {j.name for j in jobs}
    for j in jobs:
        missing = [d for d in j.after if d not in names]
        if missing:
            raise ValueError(f"{j.name} depends on unknown job(s) {missing}")
    waiting = {j.name: len(set(j.after)) for j in jobs}
    dependants = {j.name: [] for j in jobs}
    for j in jobs:
        for d in set(j.after):
            dependants[d].append(j.name)
    ready = deque(sorted(n for n, w in waiting.items() if w == 0))
    order = []
    while ready:
        name = ready.popleft()
        order.append(name)
        for other in dependants[name]:
            waiting[other] -= 1
            if waiting[other] == 0:
                ready.append(other)
    if len(order) < len(jobs):
        stuck = sorted(n for n in waiting if n not in order)
        raise ValueError(f"dependency cycle among {stuck}")
    return order

shop = [
    Job("cut plates", 2), Job("cut tubes", 3),
    Job("drill brackets", 1.5, ("cut plates",)), Job("weld frame", 4, ("cut tubes", "drill brackets")),
    Job("machine shaft", 3.5), Job("paint frame", 2, ("weld frame",)),
    Job("fit shaft", 1, ("machine shaft", "weld frame")), Job("assemble guard", 1.5, ("paint frame", "fit shaft")),
    Job("print manuals", 0.5, priority=2),
]
print("order:", topological_order(shop))
for broken in [[Job("a", 1, ("b",)), Job("b", 1, ("c",)), Job("c", 1, ("a",)), Job("d", 1)], [Job("weld", 2, ("cut",))]]:
    try:
        topological_order(broken)
    except ValueError as error:
        print("ValueError:", error)
```

```output
order: ['cut plates', 'cut tubes', 'machine shaft', 'print manuals', 'drill brackets', 'weld frame', 'paint frame', 'fit shaft', 'assemble guard']
ValueError: dependency cycle among ['a', 'b', 'c']
ValueError: weld depends on unknown job(s) ['cut']
```

`set(j.after)` ignores a dependency listed twice. Starting from the sorted list of free jobs makes the order deterministic, which keeps results reproducible.

The shop's plan is valid. The order lists every job after everything it depends on. The broken plans are rejected with useful messages: the three jobs in a cycle are named (job `d` is fine and is not blamed), and a dependency on a job that does not exist is reported before anything else runs.

## List scheduling with two heaps

The scheduler simulates the day as a sequence of **events**. It keeps two priority queues from the heaps lesson:

- **ready**: jobs whose dependencies are all finished, ordered by urgency;
- **running**: jobs in progress, ordered by finishing time.

At each step it gives every free machine the most urgent ready job. Then it jumps the clock forward to the next finishing time, marks that job done, and releases any jobs that were waiting only for it. The urgency rule is a function, `key(job)`, where a smaller key means more urgent: the strategy pattern as a plain function. Predict before running: with two machines and "highest priority, then longest first", when does the last job finish?

```python type
def schedule(jobs, machines, key):
    topological_order(jobs)
    by_name = {j.name: j for j in jobs}
    waiting = {j.name: len(set(j.after)) for j in jobs}
    dependants = {j.name: [] for j in jobs}
    for j in jobs:
        for d in set(j.after):
            dependants[d].append(j.name)
    ready = [(key(j), j.name) for j in jobs if waiting[j.name] == 0]
    heapq.heapify(ready)
    running, free, now, plan = [], list(range(machines)), 0.0, []
    while ready or running:
        while free and ready:
            _, name = heapq.heappop(ready)
            machine = free.pop(0)
            end = now + by_name[name].hours
            plan.append((name, machine, now, end))
            heapq.heappush(running, (end, machine, name))
        end, machine, name = heapq.heappop(running)
        now = end
        free.append(machine)
        free.sort()
        for other in dependants[name]:
            waiting[other] -= 1
            if waiting[other] == 0:
                heapq.heappush(ready, (key(by_name[other]), other))
    return plan

def makespan(plan):
    return max(end for _, _, _, end in plan) if plan else 0.0

def priority_then_longest(job):
    return (-job.priority, -job.hours)

plan = schedule(shop, machines=2, key=priority_then_longest)
for name, machine, start, end in sorted(plan, key=lambda p: (p[1], p[2])):
    print(f"machine {machine}: {start:4.1f}-{end:4.1f}  {name}")
print("makespan:", makespan(plan), "hours")
```

```output
machine 0:  0.0- 0.5  print manuals
machine 0:  0.5- 3.5  cut tubes
machine 0:  3.5- 5.5  cut plates
machine 0:  5.5- 7.0  drill brackets
machine 0:  7.0-11.0  weld frame
machine 0: 11.0-13.0  paint frame
machine 0: 13.0-14.5  assemble guard
machine 1:  0.0- 3.5  machine shaft
machine 1: 11.0-12.0  fit shaft
makespan: 14.5 hours
```

Heap entries are tuples, so ties in the key are broken by the job's name, and the result never depends on the order of the input list.

Every job starts only after its dependencies finish, and a free machine never waits while a job is ready. Even so, the day takes 14.5 hours, and machine 1 sits idle from 3.5 to 11 hours with nothing ready for it. The rule started the manuals and the machine shaft first, then the long tube cut, so the 11-hour chain of plates, drill, weld, paint and assemble started late, and everything waited on it. Choosing a better rule is the subject of the next section. Each event costs O(log n) heap work, so even thousands of jobs schedule instantly.

## Strategies and the critical path

Which urgency rule is best? A classic one for dependency graphs is the **critical path**. For each job, compute the longest chain of work from the start of that job to the end of the whole project, its own duration plus the longest such chain among the jobs that depend on it. Jobs on long chains should start early, because any delay to them delays everything. Computing it is dynamic programming over a topological order, in reverse.

Comparing rules needs a yardstick, and a **lower bound** provides one: no schedule can beat the longest chain, nor the total work divided among the machines. If a schedule meets the bound, it is optimal. Predict before running: which rule comes closest to the bound on a larger random workload?

```python type
import random

def tail_lengths(jobs):
    by_name = {j.name: j for j in jobs}
    dependants = {j.name: [] for j in jobs}
    for j in jobs:
        for d in set(j.after):
            dependants[d].append(j.name)
    tail = {}
    for name in reversed(topological_order(jobs)):
        tail[name] = by_name[name].hours + max((tail[d] for d in dependants[name]), default=0)
    return tail

def lower_bound(jobs, machines):
    return max(max(tail_lengths(jobs).values(), default=0), sum(j.hours for j in jobs) / machines)

def random_project(n, seed):
    rng = random.Random(seed)
    jobs = []
    for i in range(n):
        deps = tuple(f"J{k}" for k in rng.sample(range(i), min(i, rng.randint(0, 3))))
        jobs.append(Job(f"J{i}", rng.choice([0.5, 1, 1.5, 2, 3, 5, 8]), deps, rng.randint(0, 2)))
    return jobs

project = random_project(60, seed=4)
tails = tail_lengths(project)
rules = {
    "input order": lambda j: int(j.name[1:]),
    "shortest first": lambda j: j.hours,
    "longest first": lambda j: -j.hours,
    "priority then longest": priority_then_longest,
    "critical path": lambda j: -tails[j.name],
}
bound = lower_bound(project, 4)
print(f"lower bound: {bound:.1f} h")
for name, rule in rules.items():
    span = makespan(schedule(project, 4, rule))
    print(f"{name:<22} makespan {span:5.1f} h   {span / bound - 1:6.1%} above the bound")
```

```output
lower bound: 36.8 h
input order            makespan  38.5 h     4.8% above the bound
shortest first         makespan  41.5 h    12.9% above the bound
longest first          makespan  38.5 h     4.8% above the bound
priority then longest  makespan  38.0 h     3.4% above the bound
critical path          makespan  37.0 h     0.7% above the bound
```

`rng.sample(range(i), ...)` picks dependencies only among earlier jobs, so random projects never contain cycles.

The critical-path rule comes closest to the bound, because it starts the long chains early so the machines are not left idle at the end waiting on one late chain. The other rules finish later. Swapping rules was a one-word change at the call site: the scheduler never knew which strategy it had. Rankings vary between projects, so in a real shop you would run several rules on today's jobs and keep the best plan, which costs milliseconds.

::: challenge The critical path itself [easy]
Write `critical_path(jobs)`, returning a tuple `(length, names)`: the length in hours of the longest chain of dependent jobs from any starting job to any final one, and the list of job names along that chain, in the order they would run. If several chains tie, return any one of them. Use the lesson's `Job` and `topological_order`. An empty list of jobs gives `(0, [])`.

```python starter
def critical_path(jobs):
    return 0, []

print(critical_path(shop))
```

```python solution
def critical_path(jobs):
    if not jobs:
        return 0, []
    by_name = {j.name: j for j in jobs}
    best, previous = {}, {}
    for name in topological_order(jobs):
        job = by_name[name]
        start, via = 0, None
        for d in job.after:
            if best[d] > start:
                start, via = best[d], d
        best[name] = start + job.hours
        previous[name] = via
    end = max(best, key=best.get)
    chain = []
    while end is not None:
        chain.append(end)
        end = previous[end]
    return best[chain[0]], chain[::-1]

print(critical_path(shop))
```

```python test
assert "critical_path" in dir(), "Keep the function's name as critical_path."
_length, _chain = critical_path(shop)
assert _length == 11 and _chain == ["cut plates", "drill brackets", "weld frame", "paint frame", "assemble guard"], f"The shop's longest chain is 2 + 1.5 + 4 + 2 + 1.5 = 11 hours; got {(_length, _chain)}."
assert critical_path([]) == (0, []), "No jobs, no path."
assert critical_path([Job("solo", 3)]) == (3, ["solo"]), "One job is its own chain."
_jobs = [Job("a", 1), Job("b", 5), Job("c", 2, ("a", "b")), Job("d", 1, ("c",)), Job("e", 10)]
assert critical_path(_jobs) == (10, ["e"]), "A single long job can be the critical path."
_jobs2 = random_project(40, seed=9)
_len2, _ch2 = critical_path(_jobs2)
_by = {_j.name: _j for _j in _jobs2}
assert abs(_len2 - max(tail_lengths(_jobs2).values())) < 1e-9, "The length must match the longest tail."
assert abs(sum(_by[_n].hours for _n in _ch2) - _len2) < 1e-9, "The chain's durations must add up to the length."
assert all(_ch2[_i] in _by[_ch2[_i + 1]].after for _i in range(len(_ch2) - 1)), "Each job in the chain must depend on the one before it."
"SUCCESS: Dynamic programming over a topological order finds the chain of jobs that no schedule can finish faster than."
```

Hint: Go through the jobs in topological order. A job's best finishing time is its duration plus the largest best finishing time among its dependencies; remember which dependency gave it. The chain ends at the job with the largest value; follow the remembered links back and reverse.
:::

::: challenge A schedule checker [medium]
A scheduler is only trustworthy if its output is checked. Write `check_schedule(jobs, plan, machines)`, where `plan` is a list of `(name, machine, start, end)` tuples, returning a list of problem strings (empty if the plan is valid). Check, and report in this order:

- every job appears exactly once: `f"{name} is missing"` (in sorted order of name) or `f"{name} appears {k} times"`;
- each entry's machine is between 0 and `machines - 1`: `f"{name} uses machine {m}"`;
- each entry lasts exactly the job's hours (within 1e-9): `f"{name} takes {end - start:g} h, not {hours:g}"`;
- no job starts before every one of its dependencies has ended: `f"{name} starts before {dep} ends"`;
- no two jobs overlap on the same machine (touching ends are fine): `f"{a} and {b} overlap on machine {m}"`, with a and b in order of start time.

Report the machine, duration and dependency problems grouped by kind, each kind in the order the entries appear in `plan`. Report overlaps machine by machine, from machine 0 upwards, checking every pair of entries on the machine (in order of start time).

```python starter
def check_schedule(jobs, plan, machines):
    return []

print(check_schedule(shop, schedule(shop, 2, priority_then_longest), 2))
```

```python solution
from collections import Counter

def check_schedule(jobs, plan, machines):
    problems = []
    by_name = {j.name: j for j in jobs}
    counts = Counter(name for name, _, _, _ in plan)
    for name in sorted(by_name):
        if counts[name] == 0:
            problems.append(f"{name} is missing")
        elif counts[name] > 1:
            problems.append(f"{name} appears {counts[name]} times")
    ends = {name: end for name, _, _, end in plan}
    for name, machine, start, end in plan:
        if not 0 <= machine < machines:
            problems.append(f"{name} uses machine {machine}")
    for name, machine, start, end in plan:
        if name in by_name and abs((end - start) - by_name[name].hours) > 1e-9:
            problems.append(f"{name} takes {end - start:g} h, not {by_name[name].hours:g}")
    for name, machine, start, end in plan:
        for dep in by_name[name].after if name in by_name else ():
            if dep in ends and start < ends[dep] - 1e-9:
                problems.append(f"{name} starts before {dep} ends")
    for m in range(machines):
        entries = sorted((start, end, name) for name, machine, start, end in plan if machine == m)
        for i, (s1, e1, a) in enumerate(entries):
            for s2, e2, b in entries[i + 1:]:
                if s2 < e1 - 1e-9:
                    problems.append(f"{a} and {b} overlap on machine {m}")
    return problems

print(check_schedule(shop, schedule(shop, 2, priority_then_longest), 2))
```

```python test
assert "check_schedule" in dir(), "Keep the function's name as check_schedule."
assert check_schedule(shop, schedule(shop, 2, priority_then_longest), 2) == [], "The lesson's schedule is valid."
for _m in [1, 3, 5]:
    assert check_schedule(shop, schedule(shop, _m, lambda j: j.hours), _m) == [], f"Schedules on {_m} machines are valid."
_jobs = [Job("a", 2), Job("b", 1, ("a",)), Job("c", 3)]
_ok = [("a", 0, 0, 2), ("b", 0, 2, 3), ("c", 1, 0, 3)]
assert check_schedule(_jobs, _ok, 2) == [], "Touching ends are fine."
assert check_schedule(_jobs, [("a", 0, 0, 2), ("c", 1, 0, 3)], 2) == ["b is missing"], "A missing job."
assert check_schedule(_jobs, _ok + [("c", 0, 3, 6)], 2) == ["c appears 2 times"], "A duplicated job."
assert check_schedule(_jobs, [("a", 0, 0, 2), ("b", 2, 2, 3), ("c", 1, 0, 3)], 2) == ["b uses machine 2"], "A machine that does not exist."
assert check_schedule(_jobs, [("a", 0, 0, 2.5), ("b", 0, 2.5, 3.5), ("c", 1, 0, 3)], 2) == ["a takes 2.5 h, not 2"], "Wrong duration."
assert check_schedule(_jobs, [("a", 0, 0, 2), ("b", 1, 1, 2), ("c", 0, 2, 5)], 2) == ["b starts before a ends"], "A dependency broken."
assert check_schedule([Job("a", 10), Job("b", 1), Job("c", 1)], [("a", 0, 0, 10), ("b", 0, 1, 2), ("c", 0, 3, 4)], 1) == ["a and b overlap on machine 0", "a and c overlap on machine 0"], "Check every pair, not just neighbours: a long job can overlap several later ones."
assert check_schedule(_jobs, [("a", 0, 0, 2), ("b", 0, 2, 3), ("c", 0, 1, 4)], 2) == ["a and c overlap on machine 0", "c and b overlap on machine 0"], f"Overlaps, by start time: got {check_schedule(_jobs, [('a', 0, 0, 2), ('b', 0, 2, 3), ('c', 0, 1, 4)], 2)}."
"SUCCESS: The checker turns 'the scheduler seems fine' into five precise rules, each with a message saying exactly what is wrong."
```

Hint: Use a `Counter` of names for missing and duplicated jobs. Keep a dict of each job's end time for the dependency check. For overlaps, sort each machine's entries by start time and compare each entry with every later one.
:::

::: challenge Scheduling with machine skills [hard]
Not every machine can do every job: a welding job needs a welding bay. Extend list scheduling. Each job now has a `needs` skill, and `machines` is a list of skill sets, one per machine (machine i can do a job if `job.needs` is in `machines[i]`). Write `skilled_schedule(jobs, machines, key)`, where `jobs` is a list of `SkilledJob` (a frozen dataclass with `name`, `hours`, `after` (a tuple), and `needs`). It returns a plan of `(name, machine, start, end)` tuples. At each moment, for each free machine in order of machine number, start the most urgent ready job (smallest `key(job)`, ties by name) **that this machine can do**. Then advance the clock to the next finishing time. Raise `ValueError` if some job needs a skill that no machine has, or if the dependencies contain a cycle or an unknown job. The plan must pass the rules of the previous challenge, with each job on a machine that has its skill.

```python starter
from dataclasses import dataclass

@dataclass(frozen=True)
class SkilledJob:
    name: str
    hours: float
    after: tuple = ()
    needs: str = "general"

def skilled_schedule(jobs, machines, key):
    return []

print("write skilled_schedule")
```

```python solution
from dataclasses import dataclass
import heapq

@dataclass(frozen=True)
class SkilledJob:
    name: str
    hours: float
    after: tuple = ()
    needs: str = "general"

def skilled_schedule(jobs, machines, key):
    topological_order(jobs)
    for j in jobs:
        if not any(j.needs in skills for skills in machines):
            raise ValueError(f"no machine can do {j.needs!r} for {j.name}")
    by_name = {j.name: j for j in jobs}
    waiting = {j.name: len(set(j.after)) for j in jobs}
    dependants = {j.name: [] for j in jobs}
    for j in jobs:
        for d in set(j.after):
            dependants[d].append(j.name)
    ready = {j.name for j in jobs if waiting[j.name] == 0}
    running, free, now, plan = [], set(range(len(machines))), 0.0, []
    while ready or running:
        for machine in sorted(free):
            options = [n for n in ready if by_name[n].needs in machines[machine]]
            if options:
                name = min(options, key=lambda n: (key(by_name[n]), n))
                ready.discard(name)
                free.discard(machine)
                end = now + by_name[name].hours
                plan.append((name, machine, now, end))
                heapq.heappush(running, (end, machine, name))
        end, machine, name = heapq.heappop(running)
        now = end
        free.add(machine)
        for other in dependants[name]:
            waiting[other] -= 1
            if waiting[other] == 0:
                ready.add(other)
    return plan

weld_shop = [SkilledJob("cut", 2, (), "saw"), SkilledJob("weld", 3, ("cut",), "weld"), SkilledJob("drill", 1, (), "drill"), SkilledJob("paint", 2, ("weld",), "paint")]
print(skilled_schedule(weld_shop, [{"saw", "drill"}, {"weld", "paint"}], key=lambda j: -j.hours))
```

```python test
assert "skilled_schedule" in dir() and "SkilledJob" in dir(), "Define SkilledJob and skilled_schedule."
def _check_schedule(_jobs, _plan, _machines):
    _out, _by = [], {_j.name: _j for _j in _jobs}
    _names = [_e[0] for _e in _plan]
    _out += [f"{_n} count {_names.count(_n)}" for _n in sorted(_by) if _names.count(_n) != 1]
    _ends = {_n: _e for _n, _m, _s, _e in _plan}
    for _n, _m, _s, _e in _plan:
        if not 0 <= _m < _machines: _out.append(f"{_n} machine {_m}")
        if abs((_e - _s) - _by[_n].hours) > 1e-9: _out.append(f"{_n} duration")
        _out += [f"{_n} before {_d}" for _d in _by[_n].after if _s < _ends.get(_d, 0) - 1e-9]
    for _m in range(_machines):
        _ent = sorted((_s, _e, _n) for _n, _mm, _s, _e in _plan if _mm == _m)
        _out += [f"{_a} overlaps {_b}" for _i, (_s1, _e1, _a) in enumerate(_ent) for _s2, _e2, _b in _ent[_i + 1:] if _s2 < _e1 - 1e-9]
    return _out
def _valid(_jobs, _plan, _machines):
    _plain = [Job(_j.name, _j.hours, _j.after) for _j in _jobs]
    _problems = _check_schedule(_plain, _plan, len(_machines))
    _by = {_j.name: _j for _j in _jobs}
    _problems += [f"{_n} on machine {_m} lacks {_by[_n].needs}" for _n, _m, _, _ in _plan if _by[_n].needs not in _machines[_m]]
    return _problems
_shop = [SkilledJob("cut", 2, (), "saw"), SkilledJob("weld", 3, ("cut",), "weld"), SkilledJob("drill", 1, (), "drill"), SkilledJob("paint", 2, ("weld",), "paint")]
_ms = [{"saw", "drill"}, {"weld", "paint"}]
_plan = skilled_schedule(_shop, _ms, key=lambda j: -j.hours)
assert _valid(_shop, _plan, _ms) == [], f"Plan problems: {_valid(_shop, _plan, _ms)}"
assert sorted(_plan) == [("cut", 0, 0.0, 2.0), ("drill", 0, 2.0, 3.0), ("paint", 1, 5.0, 7.0), ("weld", 1, 2.0, 5.0)], f"Got {sorted(_plan)}."
_two_saws = [SkilledJob(f"cut{_i}", 1, (), "saw") for _i in range(4)] + [SkilledJob("weld", 2, ("cut0", "cut3"), "weld")]
_p2 = skilled_schedule(_two_saws, [{"saw"}, {"saw", "weld"}], key=lambda j: j.name)
assert _valid(_two_saws, _p2, [{"saw"}, {"saw", "weld"}]) == [] and makespan(_p2) == 4, f"Both saws cut, then the weld: makespan 4; got {makespan(_p2)}."
try:
    skilled_schedule([SkilledJob("anodise", 1, (), "anodise")], [{"saw"}], key=lambda j: 0)
    assert False, "A skill no machine has should raise ValueError."
except ValueError:
    pass
try:
    skilled_schedule([SkilledJob("a", 1, ("b",), "saw"), SkilledJob("b", 1, ("a",), "saw")], [{"saw"}], key=lambda j: 0)
    assert False, "A cycle should raise ValueError."
except ValueError:
    pass
import random as _random
_rng = _random.Random(15)
_skills = ["saw", "weld", "drill", "paint"]
for _trial in range(25):
    _jobs = []
    for _i in range(_rng.randint(1, 30)):
        _deps = tuple(f"K{_k}" for _k in _rng.sample(range(_i), min(_i, _rng.randint(0, 2))))
        _jobs.append(SkilledJob(f"K{_i}", _rng.choice([0.5, 1, 2, 3]), _deps, _rng.choice(_skills)))
    _machines = [set(_rng.sample(_skills, _rng.randint(1, 3))) for _ in range(_rng.randint(1, 4))]
    if not all(any(_j.needs in _m for _m in _machines) for _j in _jobs):
        continue
    _p = skilled_schedule(_jobs, _machines, key=lambda j: -j.hours)
    assert _valid(_jobs, _p, _machines) == [], f"Trial {_trial}: {_valid(_jobs, _p, _machines)[:3]}"
"SUCCESS: The scheduler respects dependencies, machine skills and urgency, and every plan it produces passes an independent checker."
```

Hint: Check skills up front, then reuse the lesson's structure, but keep `ready` as a set: for each free machine in machine order, choose among the ready jobs it can do the one with the smallest `(key(job), name)`. A job that no free machine can do waits until a suitable machine is free. Advance time with the running heap as before.
:::

## What you learned

- A dependency graph must be validated before scheduling: Kahn's topological sort finds unknown dependencies and cycles, and names the jobs involved.
- List scheduling simulates events with two heaps: ready jobs by urgency, running jobs by finishing time. It is fast and gives good schedules for a problem where the very best schedule is NP-hard to find.
- The urgency rule is a strategy, a plain key function. The critical path, computed by dynamic programming in reverse topological order, is a strong rule because it starts long chains early.
- A lower bound (the longest chain, or the total work divided among the machines) measures how close any schedule is to optimal.
- An independent schedule checker turns correctness into precise rules, and random tests run the scheduler against it.

The final project brings the whole series together: a route planner with graph algorithms behind a well-designed API.
