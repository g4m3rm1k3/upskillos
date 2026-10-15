def change_estimate(db, ticket_id, expected_version, minutes):
    row = db.execute(
        "UPDATE tickets SET estimate_minutes=%s, version=version+1 "
        "WHERE ticket_id=%s AND version=%s RETURNING version",
        (minutes, ticket_id, expected_version),
    ).fetchone()
    if row is None:
        return None
    return row[0]
