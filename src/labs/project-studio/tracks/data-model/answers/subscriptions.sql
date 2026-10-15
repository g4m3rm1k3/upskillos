CREATE TABLE subscriptions(user_id INTEGER NOT NULL, topic_id INTEGER NOT NULL, delivery TEXT NOT NULL CHECK(delivery IN ('immediate','digest')), PRIMARY KEY(user_id, topic_id));
