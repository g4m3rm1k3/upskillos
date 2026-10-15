SELECT p.project_id, count(t.ticket_id) FROM projects AS p LEFT JOIN tickets AS t ON t.project_id=p.project_id AND t.status='open' GROUP BY p.project_id ORDER BY p.project_id;
