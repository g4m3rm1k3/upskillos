def hours_to_minutes(hours):
    if hours < 0:
        raise ValueError("Negative duration")
    return hours * 60
