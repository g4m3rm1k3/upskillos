SELECT ticket_id FROM tickets WHERE created_at > '2026-01-01T09:00:00Z' OR (created_at = '2026-01-01T09:00:00Z' AND ticket_id > 1) ORDER BY created_at, ticket_id LIMIT 2;
