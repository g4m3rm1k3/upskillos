SELECT ticket_id FROM tickets WHERE status='open' AND assignee_id IS NULL ORDER BY ticket_id;
