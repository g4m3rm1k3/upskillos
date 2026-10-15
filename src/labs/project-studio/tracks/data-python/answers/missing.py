def missing_count(values):
    count = 0
    for value in values:
        if value is None:
            count = count + 1
    return count
