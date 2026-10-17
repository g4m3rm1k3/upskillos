"""grid_pieces.py  (L01 piece card)

Name:        parse_floor_plan  (+ kind_at, neighbors_of, describe_shape)
Input:       exported floor-plan text: header with a 'legend:' line, a blank line, map rows
Output:      nested dict: header, legend, grid (list of list of str),
             markers (dict of kind -> list of (row, column)), height, width
Assumes:     rows split on '\n'; every non-space symbol is in the legend; blank = outside;
             one-character symbols; no tabs or '\r\n' (not tested)
Versions:    index loops / comprehensions + enumerate / single pass over characters
Swap rule:   any version may replace another; same (grid, markers) on a valid map
Used later:  L02, L03, L05, L07, A1, A2
"""

PLAIN_KINDS = ("wall", "floor")
BLOCKED_KINDS = ("wall", "void")
DIRECTION_STEPS = {"up": (-1, 0), "down": (1, 0), "left": (0, -1), "right": (0, 1)}


def parse_header(header_text):
    header = {}
    for line in header_text.splitlines():
        key, _, value = line.partition(":")
        header[key.strip()] = value.strip()
    return header


def parse_legend(legend_text):
    legend = {}
    for entry in legend_text.split("|"):
        symbol, _, meaning = entry.strip().partition(" ")
        legend[symbol] = meaning.strip()
    return legend


def parse_floor_plan(text):
    header_text, _, map_text = text.strip("\n").partition("\n\n")
    header = parse_header(header_text)
    legend = parse_legend(header["legend"])

    trimmed_rows = [row_text.rstrip() for row_text in map_text.splitlines()]
    width = max(len(row_text) for row_text in trimmed_rows)
    grid = [list(row_text.ljust(width)) for row_text in trimmed_rows]

    markers = {}
    for row_number, grid_row in enumerate(grid):
        for column_number, character in enumerate(grid_row):
            if character == " ":
                continue
            if character not in legend:
                raise ValueError(
                    f"symbol {character!r} at row {row_number}, column {column_number} "
                    f"is not in the legend")
            kind = legend[character]
            if kind not in PLAIN_KINDS:
                markers.setdefault(kind, []).append((row_number, column_number))

    return {"header": header, "legend": legend, "grid": grid,
            "markers": markers, "height": len(grid), "width": width}


def kind_at(plan, row, column):
    if not (0 <= row < plan["height"] and 0 <= column < plan["width"]):
        return None
    character = plan["grid"][row][column]
    return plan["legend"].get(character, "void")


def neighbors_of(plan, row, column):
    open_neighbors = {}
    for direction_name, (row_change, column_change) in DIRECTION_STEPS.items():
        neighbor_row = row + row_change
        neighbor_column = column + column_change
        kind = kind_at(plan, neighbor_row, neighbor_column)
        if kind is not None and kind not in BLOCKED_KINDS:
            open_neighbors[direction_name] = (neighbor_row, neighbor_column)
    return open_neighbors


def describe_shape(value):
    if isinstance(value, dict):
        if not value:
            return "empty dict"
        key_shapes = {describe_shape(key) for key in value}
        value_shapes = {describe_shape(item) for item in value.values()}
        if len(key_shapes) == 1 and len(value_shapes) == 1:
            return f"dict of {key_shapes.pop()} -> {value_shapes.pop()}"
        fields = ", ".join(f"{key}: {describe_shape(item)}" for key, item in value.items())
        return "record{" + fields + "}"
    if isinstance(value, list):
        if not value:
            return "empty list"
        item_shapes = {describe_shape(item) for item in value}
        if len(item_shapes) == 1:
            return f"list of {item_shapes.pop()}"
        return "list of mixed(" + " | ".join(sorted(item_shapes)) + ")"
    if isinstance(value, tuple):
        return "(" + ", ".join(describe_shape(item) for item in value) + ")"
    return type(value).__name__
