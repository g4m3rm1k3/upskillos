BEGIN; UPDATE tickets SET status='closed' WHERE ticket_id=2; INSERT INTO ticket_events(ticket_id,new_status) VALUES(2,'closed'); ROLLBACK;
