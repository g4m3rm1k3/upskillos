SELECT u.user_id FROM users AS u WHERE NOT EXISTS (SELECT 1 FROM tickets AS t WHERE t.assignee_id=u.user_id AND t.status='open') ORDER BY u.user_id;
