SELECT p.project_id FROM projects AS p LEFT JOIN tickets AS t ON t.project_id=p.project_id WHERE t.ticket_id IS NULL ORDER BY p.project_id;
