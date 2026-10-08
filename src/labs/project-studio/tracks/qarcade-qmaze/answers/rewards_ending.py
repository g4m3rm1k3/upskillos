def how_it_ends(path, reached):
    if reached:
        return "reached the cheese"
    last = set(path[-20:])
    if len(last) == 1:
        return "stands still against a wall"
    if len(last) == 2:
        return "steps back and forth"
    return "wanders"
