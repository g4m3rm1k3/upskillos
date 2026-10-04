---
title: SQL and JDBC — keep data after the process ends
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

Durability requires storage outside the process. A relational schema states data shape and constraints. SQL operates on sets of rows; JDBC sends SQL and maps results. We start with explicit queries so later persistence abstractions have something concrete to simplify.

## Define a schema with invariants

Primary keys enforce uniqueness. NOT NULL rejects missing values, while CHECK constrains stored values. The event table references a task and gives each task revision one audit record. Constraints protect data even when another writer bypasses Java validation.

IF NOT EXISTS makes initial creation repeatable; it does not upgrade an existing table when this file changes. A later lesson handles that distinction with an explicit migration. SQL text has no Java semicolons or braces beyond its own syntax.

Type this fragment yourself. Start an empty file at `src/main/resources/schema.sql`:

```sql edit=src/main/resources/schema.sql mode=replace
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('TODO','DOING','DONE')),
  revision BIGINT NOT NULL CHECK (revision >= 0)
);
CREATE TABLE IF NOT EXISTS task_events (
  task_id VARCHAR(36) NOT NULL REFERENCES tasks(id),
  revision BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  PRIMARY KEY (task_id, revision)
);
```

## Choose a local durable database

The datasource URL selects a file database by default and can be overridden with WORKSPACE_DB. Data files are ignored by Git. Binding to loopback keeps this development server local. SQL initialization runs the schema on startup. Error details remain in server diagnostics rather than being copied to clients.

An environment variable is configuration supplied to a process; editing your shell environment does not reconfigure an already running process. Stop before switching database settings.

Type this fragment yourself. Start an empty file at `src/main/resources/application.properties`:

```properties edit=src/main/resources/application.properties mode=replace
server.address=127.0.0.1
spring.datasource.url=${WORKSPACE_DB:jdbc:h2:file:./workspace-data}
spring.sql.init.mode=always
server.error.include-message=never
```

## Map rows to domain values

JdbcTemplate manages JDBC resource handling; SQL remains visible. The row-mapping lambda is called for each result row. Parsing stored values constructs our domain type, so invalid legacy data fails visibly rather than silently producing a misleading task.

ORDER BY makes result ordering deliberate. UUID order is stable but not creation order; a real creation-time feature would need its own field and ordering contract. Reading all rows will eventually need a bound; pagination arrives later.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/JdbcTasks.java`:

```java edit=src/main/java/workspace/JdbcTasks.java mode=replace
package workspace;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcTasks implements TaskStore {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    public JdbcTasks(JdbcTemplate jdbc, TransactionTemplate transaction) {
        this.jdbc = jdbc;
        this.transaction = transaction;
    }
    public List<Task> list() {
        return jdbc.query("SELECT id,title,status,revision FROM tasks ORDER BY id", (rs, row) ->
            new Task(UUID.fromString(rs.getString("id")), rs.getString("title"),
                Status.valueOf(rs.getString("status")), rs.getLong("revision")));
    }
```

## Insert with bound parameters

Question marks bind values separately from SQL syntax. Concatenating a title into SQL would allow quotes to change the query's meaning. The driver handles quoting and types for bound values.

The explicit update stub makes the remaining work visible. The next lesson deliberately switches composition to observe a failing update test, then completes the adapter before a new release. Keep the working memory-backed version in Git while constructing the replacement.

Type this fragment yourself. Append to `src/main/java/workspace/JdbcTasks.java`:

```java edit=src/main/java/workspace/JdbcTasks.java mode=append
    public Task add(String title) {
        Task task = new Task(UUID.randomUUID(), title, Status.TODO, 0);
        jdbc.update("INSERT INTO tasks(id,title,status,revision) VALUES (?,?,?,?)",
            task.id().toString(), task.title(), task.status().name(), task.revision());
        return task;
    }
    public Task advance(UUID id, long expectedRevision) {
        throw new UnsupportedOperationException("Transaction lesson implements updates");
    }
}
```

## Read SQL before choosing an ORM

Write `decisions/008-persistence.md`. Trace one request from JSON to Task to an INSERT and back. Compare explicit SQL with an object-relational mapper: an ORM can reduce mapping code but introduces identity, loading and query-generation behavior you still must inspect.

Plan a restart test: create a task, stop the server, start it against the same file and confirm the task remains. Also plan a fresh-database test. Passing only one can hide an initialization failure or a mistaken database path. Perform both after the next lesson wires the finished adapter.

```check
run "mvn -q test" timeout=180
file decisions/008-persistence.md
```
