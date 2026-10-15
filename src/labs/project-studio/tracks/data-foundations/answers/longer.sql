SELECT ticket_id, title
FROM tickets
WHERE estimate_minutes >= 60
ORDER BY estimate_minutes ASC, ticket_id ASC;
