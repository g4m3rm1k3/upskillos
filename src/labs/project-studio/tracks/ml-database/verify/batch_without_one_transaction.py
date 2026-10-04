# Lesson 5.2: what record_batch would store if every row had its own transaction.
import sqlite3

import experiments

db = experiments.connect(":memory:")
model = experiments.add_model(db, "x", ["sqft"])
rows = [(1500, 3, 20, 1.0), (1500, 3, 20, 1.0), (-1, 3, 20, 2.0)]
try:
    for row in rows:
        experiments.record(db, model, *row)
except sqlite3.IntegrityError:
    pass
print(db.execute("SELECT COUNT(*) FROM predictions").fetchone()[0])
