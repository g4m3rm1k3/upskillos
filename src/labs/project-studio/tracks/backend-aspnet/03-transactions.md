---
title: 3 — Make stock and reservation one commit
track: Backend Developer Bootcamp — ASP.NET Core — Stock Reservations
trackOrder: 51.03
runtime: none
---

Outcome: prevent overselling with a conditional update and atomic reservation insert. SQL is explicit before introducing an ORM abstraction.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Implement the store

`using` disposes resources even when an exception occurs. The transaction rolls back when it is disposed without commit. The UPDATE's predicate and decrement happen together; a separate SELECT followed by subtraction would expose a race. Checking affected rows tells us whether the operation won. The reservation insert and stock decrement share the transaction, so either both persist or neither does.

The singleton store holds only an immutable connection string. It opens a connection per operation; sharing one mutable connection across requests would be unsafe. Pooling is disabled here to make local database lifetime and test cleanup explicit. The parameters separate SQL syntax from user values.

The bootstrap schema and starter stock are for a new local database. They are not a migration strategy, and restarting must not restock existing inventory. INSERT OR IGNORE preserves the existing stock row.

```csharp file=Stock.Api/StockStore.cs
using Microsoft.Data.Sqlite;
namespace Stock.Api;

public sealed class StockStore
{
    private readonly string connectionString;
    public StockStore(string path)
    {
        connectionString = new SqliteConnectionStringBuilder { DataSource = path, Pooling = false }.ToString();
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS stock (sku TEXT PRIMARY KEY, available INTEGER NOT NULL CHECK(available >= 0));
            CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, owner TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10));
            INSERT OR IGNORE INTO stock VALUES ('starter-kit', 10);
            PRAGMA user_version = 1;
            """;
        cmd.ExecuteNonQuery();
    }
    private SqliteConnection Open()
    {
        var db = new SqliteConnection(connectionString);
        db.Open();
        return db;
    }
    public Reservation Reserve(string owner, int quantity)
    {
        ReservationRules.Validate(quantity);
        using var db = Open();
        using var tx = db.BeginTransaction();
        using var update = db.CreateCommand();
        update.Transaction = tx;
        update.CommandText = "UPDATE stock SET available=available-$quantity WHERE sku='starter-kit' AND available >= $quantity";
        update.Parameters.AddWithValue("$quantity", quantity);
        if (update.ExecuteNonQuery() != 1) throw new OutOfStockException();
        var reservation = new Reservation(Guid.NewGuid().ToString(), quantity);
        using var insert = db.CreateCommand();
        insert.Transaction = tx;
        insert.CommandText = "INSERT INTO reservations VALUES ($id,$owner,$quantity)";
        insert.Parameters.AddWithValue("$id", reservation.Id);
        insert.Parameters.AddWithValue("$owner", owner);
        insert.Parameters.AddWithValue("$quantity", quantity);
        insert.ExecuteNonQuery();
        tx.Commit();
        return reservation;
    }
    public Reservation? Find(string owner, string id)
    {
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT id,quantity FROM reservations WHERE id=$id AND owner=$owner";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.Parameters.AddWithValue("$owner", owner);
        using var reader = cmd.ExecuteReader();
        return reader.Read() ? new Reservation(reader.GetString(0), reader.GetInt32(1)) : null;
    }
}
```


```predict
question: Can an exception after decrement leave less stock when the transaction rolls back?
choice: No
choice: Yes
answer: No
explain: The decrement and insert belong to one transaction.
```

## Compare ORM and SQL responsibility

Entity Framework Core can map entities, track changes and generate migrations. It cannot invent your inventory invariant. If you replace this store with EF Core, use a conditional update or an explicit concurrency token and handle affected rows/concurrency exceptions. DbContext is normally scoped to a request, not a singleton; it is not thread-safe.

Normalize multiple SKUs into stock rows and reference the SKU from each reservation. Price snapshots may intentionally be duplicated in an order because historical price is a fact of that purchase, while the current catalog price is a different fact. “Avoid all duplication” is too crude to guide data design.

## Your turn: prove transaction rollback

Introduce an injectable failure immediately before reservation insertion. Test that available stock is unchanged when it throws. Remove the test hook or isolate it behind a persistence adapter. Then propose an EF Core migration path preserving existing reservations; do not replace migration discipline with EnsureCreated on a live database.

Write your evidence in `evidence/transactions.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/transactions.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If stock disappears after a failed request, inspect whether both commands used the same transaction. Explain why a database CHECK is useful even with a quantity guard.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
