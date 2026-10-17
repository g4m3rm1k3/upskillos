"""floor_tables.py  (L02 Combine)

Name:        build_floor_table(plan, slip_chance=0.1)
Input:       a plan from grid_pieces.parse_floor_plan
Output:      a rule table (L02 shape): states are (row, column), actions are directions
Assumes:     exit squares are dead ends; a blocked move leaves you in place; each attempt costs 1.0
Used later:  L05, L07, A1, A2
"""
from grid_pieces import neighbors_of, kind_at, BLOCKED_KINDS

SIDEWAYS = {"up": ("left", "right"), "down": ("left", "right"),
            "left": ("up", "down"), "right": ("up", "down")}


def build_floor_table(plan, slip_chance=0.1):
    exit_squares = set(plan["markers"].get("exit", []))
    table = {}
    for row in range(plan["height"]):
        for column in range(plan["width"]):
            if kind_at(plan, row, column) in BLOCKED_KINDS:
                continue
            address = (row, column)
            actions = {}
            if address not in exit_squares:
                open_neighbors = neighbors_of(plan, row, column)
                for direction, (first_side, second_side) in SIDEWAYS.items():
                    chance_by_destination = {}
                    for move_direction, chance in [(direction, 1.0 - 2 * slip_chance),
                                                   (first_side, slip_chance),
                                                   (second_side, slip_chance)]:
                        destination = open_neighbors.get(move_direction, address)
                        chance_by_destination[destination] = (
                            chance_by_destination.get(destination, 0.0) + chance)
                    actions[direction] = [(chance, destination, 1.0)
                                          for destination, chance in chance_by_destination.items()]
            table[address] = actions
    return table
