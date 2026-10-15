Timeline: A locks ticket 1; B tries to update it and reaches its lock timeout.
Evidence: the lock probe fails while A holds the row and succeeds after A commits.
Cause: conflicting transaction lifetime.
Disprove: a slow query with no lock wait needs another investigation.
Repair: identify the owner, finish or roll back the transaction, and bound future waits.
