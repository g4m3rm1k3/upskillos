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

Now run the same tests to observe green. Perform the restart test: create a task in the application, stop it, start it against the same file database and confirm the task survives. Keep this separate from the isolated in-memory test database. Document which evidence establishes durability and which establishes rollback.

```check
run "mvn -q test" timeout=180
```
