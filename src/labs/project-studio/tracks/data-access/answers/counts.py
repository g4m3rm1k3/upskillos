def visible_count(db,actor_id,project_id):
    return db.execute("SELECT count(*) FROM tickets t WHERE t.project_id=%s AND EXISTS (SELECT 1 FROM projects p JOIN memberships m ON m.team_id=p.team_id WHERE p.project_id=t.project_id AND m.user_id=%s)",(project_id,actor_id)).fetchone()[0]
