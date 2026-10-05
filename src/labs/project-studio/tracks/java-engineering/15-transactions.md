---
title: Transactions and concurrent edits — one logical change
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

Advancing a task and recording its audit event are one logical operation. Without a transaction, the first write can succeed and the second fail. Without an atomic revision condition, concurrent requests can both believe they changed the same version.

## Switch composition, preserve the contract

### Connect the helper and transaction manager to the same database

Spring resolves both parameters of the @Bean factory method. JdbcTemplate executes the SQL. PlatformTransactionManager coordinates transactions for the configured datasource. `new TransactionTemplate(manager)` adapts that manager into the callback-style API we will use. The factory passes both collaborators into a new JdbcTasks and returns it as TaskStore.

The controller still receives TaskStore, so its constructor and HTTP methods do not change. The implementation selected at composition is what changes. If the JDBC helper and transaction manager belonged to different datasources, wrapping the callback would not magically make unrelated connections participate together. Our single-datasource configuration avoids that ambiguity.

**Predict:** the existing in-memory StoreTest still constructs MemoryTasks directly and remains a local contract test. Spring integration tests resolve the newly wired JdbcTasks. Both can pass or fail independently; identify which implementation each test is actually exercising.

Replace this small composition file. Spring supplies the configured JDBC helper and transaction manager. The controller still requests TaskStore, so no HTTP code changes. MemoryTasks remains useful for unit tests, but production now uses the database adapter.

The adapter still contains its explicit update stub. First run the tests in the next steps and observe red. After implementing the transaction, run the application and perform the restart test from the previous lesson. Record which file appeared and why Git ignores it. Do not run two local H2 server processes against the same file; a file lock error is distinct from our task revision conflict.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/Application.java`:

```java edit=src/main/java/workspace/Application.java mode=replace
package workspace;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootApplication
public class Application {
    public static void main(String[] args) { SpringApplication.run(Application.class, args); }
    @Bean TaskStore taskStore(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        return new JdbcTasks(jdbc, new TransactionTemplate(manager));
    }
}
```

## Set up an isolated database test

### Force the second write to fail for a known reason

The SpringBootTest properties argument overrides the datasource URL for this test context. Its database is named jdbc-test, separate from the normal course-tests context. Autowired supplies the TaskStore and JdbcTemplate connected to that configured database.

First store.add creates a real TODO task at revision 0. Then the direct INSERT reserves that task's event key at revision 1. The table has columns task_id, revision, status in that order; the VALUES placeholders receive the task's UUID text, integer 1 and DOING text. This deliberately unusual fixture is allowed by our foreign key and composite primary key, even though it is not a normal application history.

Advancing should attempt to insert the same task/revision pair after updating the task. The uniqueness constraint will reject that second event. We are controlling failure at a specific point rather than hoping a connection drops at the right moment. The next fragment reads state afterward to establish whether the preceding task update rolled back.

This test uses a named in-memory database so it never writes your learning data. A fresh random task identity keeps tests independent even when the application context is reused. We deliberately preinsert the next audit key: the update can run, but the audit insert will violate uniqueness. That is a deterministic failure at the dangerous midpoint, not a timing-dependent simulation.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/JdbcTest.java`:

```java edit=src/test/java/workspace/JdbcTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:jdbc-test;DB_CLOSE_DELAY=-1")
class JdbcTest {
    @Autowired TaskStore store;
    @Autowired JdbcTemplate jdbc;
    @Test void rollsBackWhenAuditInsertFails() {
        Task task = store.add("Atomic update");
        jdbc.update("INSERT INTO task_events VALUES (?,?,?)", task.id().toString(), 1, "DOING");
```

## Observe rollback and stale writes

### Read the stream without treating it as hidden control flow

`store.list()` returns the tasks. `.stream()` opens a sequence-processing pipeline over them. `.filter(t -> t.id().equals(task.id()))` keeps tasks whose ids equal the created id. The parameter t is one candidate task; UUID.equals compares identity values. Unlike reference `==`, it does not require the same Java object instance.

`.findFirst()` performs the traversal until it finds a matching element and returns Optional<Task>. **Optional** represents either one present value or absence. `.orElseThrow()` unwraps a present value or throws if none exists. In longhand, loop over tasks, compare each id, retain the matching task, and fail if the loop ends without a match. The pipeline expresses that same search without manually managing a temporary result variable.

The injected duplicate event is deliberate: advance should update a task, then fail trying to insert a second event with the same primary key. Merely observing RuntimeException would also pass against a method that throws before doing any work. Reading back TODO and revision 0 establishes the required post-failure state; the separate successful-first-advance test prevents an always-throw implementation from passing the suite.

Checking only that an exception occurred would miss a partial commit. Reading the stored task afterward establishes the rollback property we care about. The stale-version test covers a sequential representation of two clients sharing an old snapshot; a later experiment starts actual concurrent workers.

Run the suite against the update stub: the stale-version test must fail because its first legitimate advance is not implemented. After green, temporarily move the first update outside the transaction and confirm the rollback test detects it. This is evidence that the test detects the failure, not just that the correct code passes.

Type this fragment yourself. Append to `src/test/java/workspace/JdbcTest.java`:

```java edit=src/test/java/workspace/JdbcTest.java mode=append
        assertThrows(RuntimeException.class, () -> store.advance(task.id(), 0));
        Task after = store.list().stream().filter(t -> t.id().equals(task.id())).findFirst().orElseThrow();
        assertEquals(Status.TODO, after.status());
        assertEquals(0, after.revision());
    }
    @Test void rejectsAnOldVersion() {
        Task task = store.add("Two editors");
        store.advance(task.id(), 0);
        assertThrows(IllegalStateException.class, () -> store.advance(task.id(), 0));
    }
}
```

```check
run "mvn -q test" exit=1 timeout=180 -- Confirm the failure is the deliberately incomplete behavior, not syntax or dependency resolution.
```

## Predict a partial failure

Before editing, describe this schedule: update task to revision 1; process fails; audit insert never happens. A later reader sees updated state without its audit record. Reversing the writes merely reverses the inconsistent outcome.

A transaction groups database work into commit or rollback. It does not make an external email or HTTP call atomic with the database. Isolation controls interactions with concurrent transactions; atomicity alone does not prevent every race.

In JdbcTasks, remove only the advance stub and the final class brace, keeping the constructor, list and add methods. The next fragments replace that method. Save the previous commit so you can compare the focused change.

## Read and validate within a transaction

### Identify the two callbacks and their owners

`transaction.execute(tx -> { ... })` starts or joins a transaction according to its configuration, invokes our callback, and commits when it completes normally. A runtime exception causes rollback before it propagates to the caller. The lambda's tx parameter exposes transaction status; this implementation does not need to call it directly.

Inside that callback, jdbc.query invokes a different callback for each database row. Neither arrow means “run this in a new thread.” A callback describes code another method invokes; its scheduling and transaction behavior come from that method's contract.

WHERE id=? binds the requested id so at most one primary-key row can match. `rows.stream().findFirst()` then wraps the first row, or absence, in Optional. `NoSuchElementException::new` is a constructor reference equivalent to `() -> new NoSuchElementException()`. orElseThrow calls it only when absent. This differs from constructing and throwing an exception unconditionally.

**Predict an interleaving:** A reads revision 0. B reads revision 0. Both pass the Java comparison. A writes revision 1. B now reaches its write. Being inside transactions alone does not make B's old comparison current. The next step must put the expected revision in the SQL write condition.

TransactionTemplate executes the callback in a database transaction. The query uses the task identity as a bound value. A stream's findFirst produces Optional: either a value exists or it does not. orElseThrow makes absence explicit.

The initial revision comparison provides a clear early failure, but it is not enough: another transaction can write after this read. The next SQL condition closes that race. The callback and method remain open.

Type this fragment yourself. Append to `src/main/java/workspace/JdbcTasks.java`:

```java edit=src/main/java/workspace/JdbcTasks.java mode=append
    public Task advance(UUID id, long expectedRevision) {
        return transaction.execute(tx -> {
            var rows = jdbc.query("SELECT id,title,status,revision FROM tasks WHERE id=?",
                (rs, row) -> new Task(UUID.fromString(rs.getString("id")), rs.getString("title"),
                    Status.valueOf(rs.getString("status")), rs.getLong("revision")), id.toString());
            Task current = rows.stream().findFirst().orElseThrow(NoSuchElementException::new);
            if (current.revision() != expectedRevision) throw new IllegalStateException("Stale revision");
            Task next = current.advance();
```

## Make the version check part of the write

```predict
question: The task UPDATE changes one row, then the audit INSERT throws inside our TransactionTemplate callback. What should a new read observe?
choice: The new task without its event.
choice: The original task state, because the update rolls back.
answer: The original task state, because the update rolls back.
explain: The runtime exception exits the callback and TransactionTemplate rolls back participating database writes. A test must inspect state after failure; an exception assertion alone does not establish rollback.
```

### Trace success, conflict and rollback separately

`UPDATE tasks SET status=?,revision=? WHERE id=? AND revision=?` assigns two new column values only to a row matching both identity and old revision. Placeholder order is next status, next revision, id, expected revision. Mixing this order can produce valid-looking code with incorrect behavior, so compare it directly to the SQL.

The database reports the number of rows updated. Because id is unique, a successful match changes one row. If another transaction already changed its revision, this condition no longer matches and the count is zero. `changed != 1` rejects that outcome before recording an event.

| Schedule | Update result | Event insert | Final committed state |
|---|---|---|---|
| Current revision matches, event succeeds | 1 | Succeeds | New task and new event |
| Revision became stale | 0 | Not attempted | Existing winner's task remains |
| Update matches, event key duplicates | 1 inside transaction | Throws | Our task update is rolled back |

`return next` returns from the callback. TransactionTemplate then commits and returns that callback value to the surrounding method, whose own return returns it to the controller. These are two different return boundaries. If commit itself fails, a normal success result does not reach the caller.

**Transfer:** writing a database row then sending an email inside this block does not make email rollback possible. The transaction manager controls participating database work, not an external mail service. This limitation motivates the later delivery design exercise.

The database evaluates the WHERE condition as part of its update. Exactly one changed row means the expected version still matched. Zero changed rows means this command must not claim success. Throwing a runtime exception causes TransactionTemplate to roll back; successful completion commits both statements.

This is optimistic concurrency control: callers proceed from snapshots and conflicts are detected when writing. It avoids holding a lock while a human edits, but clients must handle rejection and reload. Blindly retrying with a new revision could overwrite an intention the user has not reviewed.

Type this fragment yourself. Append to `src/main/java/workspace/JdbcTasks.java`:

```java edit=src/main/java/workspace/JdbcTasks.java mode=append
            int changed = jdbc.update(
                "UPDATE tasks SET status=?,revision=? WHERE id=? AND revision=?",
                next.status().name(), next.revision(), id.toString(), expectedRevision);
            if (changed != 1) throw new IllegalStateException("Concurrent update");
            jdbc.update("INSERT INTO task_events(task_id,revision,status) VALUES (?,?,?)",
                id.toString(), next.revision(), next.status().name());
            return next;
        });
    }
}
```

## Verify atomic behavior and restart persistence

### Keep three claims separate in your evidence

Write a row in your learning log for each claim: a valid advance writes task plus event; an audit failure rolls back the task update; a committed task survives a fresh process. Associate each with an observation. The first two come from database operations and failure injection, while the third requires stopping and starting the server against the same durable path.

A transaction does not imply a backup. Accidental deletion of the database file remains data loss without a recoverable copy. Nor does an in-memory test establish disk persistence. When you later package the application, repeat the restart check using the actual archive and external configuration rather than only the development launcher.

Now run the same tests to observe green. Perform the restart test: create a task in the application, stop it, start it against the same file database and confirm the task survives. Keep this separate from the isolated in-memory test database. Document which evidence establishes durability and which establishes rollback.

```check
run "mvn -q test" timeout=180
```
