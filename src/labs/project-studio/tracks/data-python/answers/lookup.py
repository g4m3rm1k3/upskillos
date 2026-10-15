def ticket_title(db, ticket_id):
    row = db.execute("SELECT title FROM tickets WHERE ticket_id=%s", (ticket_id,)).fetchone()
    if row is None:
        return None
    return row[0]
