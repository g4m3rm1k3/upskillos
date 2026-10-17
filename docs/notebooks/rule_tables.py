"""rule_tables.py  (L02 piece card)

Name:        rule_tables  (outcomes_for, legal_actions, validate_table, reachable_states,
             parse_rules, chance_of_ending_in, add_action, states_that_can_reach)
Input:       table = dict of state -> dict of action -> list of (chance, destination, fee)
Output:      lookups, a list of problems (empty = sound), sets / sorted lists of states
Assumes:     states hashable; every destination is a key; chances per action sum to 1 (1e-9);
             fees >= 0; dead end = empty dict of actions
Versions:    nested dict / flat (state, action) dict / class wrapper
Swap rule:   same outcomes_for result for every (state, action)
Used later:  L03, L04, L05, L07, L08, A1, A2
"""
import copy
import math


def outcomes_for(table, state, action):
    if state not in table:
        raise ValueError(f"unknown state {state!r}")
    if action not in table[state]:
        raise ValueError(
            f"state {state!r} has no action {action!r}; legal actions: {list(table[state])}")
    return table[state][action]


def legal_actions(table, state):
    return list(table[state])


def validate_table(table):
    problems = []
    for state, actions in table.items():
        for action, outcomes in actions.items():
            where = f"{state!r}/{action!r}"
            if not outcomes:
                problems.append(f"{where}: no outcomes listed")
                continue
            total_chance = 0.0
            for chance, destination, fee in outcomes:
                if not 0.0 <= chance <= 1.0:
                    problems.append(f"{where}: chance {chance} is outside 0..1")
                if destination not in table:
                    problems.append(f"{where}: destination {destination!r} is not a state")
                if fee < 0:
                    problems.append(f"{where}: negative fee {fee}")
                total_chance += chance
            if not math.isclose(total_chance, 1.0, abs_tol=1e-9):
                problems.append(f"{where}: chances add up to {total_chance}, not 1")
    return problems


def reachable_states(table, start):
    seen = {start}
    to_visit = [start]
    while to_visit:
        state = to_visit.pop()
        for outcomes in table[state].values():
            for _chance, destination, _fee in outcomes:
                if destination not in seen:
                    seen.add(destination)
                    to_visit.append(destination)
    return seen


def parse_rules(rules_text):
    table = {}
    for rule_line in rules_text.strip().splitlines():
        rule_line = rule_line.strip()
        if not rule_line:
            continue
        if "-->" not in rule_line:
            table.setdefault(rule_line, {})
            continue
        left_text, _, outcomes_text = rule_line.partition("-->")
        state, _, action = left_text.strip().partition("--")
        outcomes = []
        for outcome_text in outcomes_text.split(";"):
            chance_text, destination, fee_text = outcome_text.split()
            outcomes.append((float(chance_text), destination, float(fee_text.lstrip("$"))))
        table.setdefault(state.strip(), {})[action.strip()] = outcomes
    return table


def chance_of_ending_in(table, state, action, target):
    outcomes = outcomes_for(table, state, action)
    return sum(chance for chance, destination, _fee in outcomes if destination == target)


def add_action(table, state, action, outcomes):
    if state not in table:
        raise ValueError(f"unknown state {state!r}")
    if action in table[state]:
        raise ValueError(f"state {state!r} already has action {action!r}")
    new_table = copy.deepcopy(table)
    new_table[state][action] = list(outcomes)
    problems = validate_table(new_table)
    if problems:
        raise ValueError("; ".join(problems))
    return new_table


def states_that_can_reach(table, target):
    can_reach = {target}
    something_changed = True
    while something_changed:
        something_changed = False
        for state, actions in table.items():
            if state in can_reach:
                continue
            for outcomes in actions.values():
                if any(destination in can_reach for _chance, destination, _fee in outcomes):
                    can_reach.add(state)
                    something_changed = True
                    break
    return sorted(can_reach)
