SELECT w.name, p.email FROM workspaces AS w JOIN people AS p ON w.owner_id=p.person_id ORDER BY w.workspace_id;
