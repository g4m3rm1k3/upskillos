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

### Read the table as durable values with constraints

A relational table contains rows with named columns. One tasks row represents one task. `CREATE TABLE` declares that structure. Parentheses enclose column definitions and table constraints; commas separate them; the semicolon ends the SQL statement. SQL string literals use single quotes, unlike Java strings.

`VARCHAR(36)` stores variable-length text bounded to 36 characters, enough for a UUID's standard text form. PRIMARY KEY makes id unique and non-null. `VARCHAR(80) NOT NULL` prevents missing title data, but it does not reject an empty or spaces-only string; that is a stronger rule enforced by Titles in our application. Never claim a database constraint enforces more than it actually does.

`CHECK (status IN ('TODO','DOING','DONE'))` restricts status to the listed text values, and NOT NULL separately excludes SQL NULL. SQL NULL represents missing/unknown data and has comparison rules different from ordinary values. `BIGINT` stores the revision integer; its check rejects negative revisions.

The event table's `REFERENCES tasks(id)` is a **foreign key**: an event must refer to an existing task id. Its combined PRIMARY KEY(task_id, revision) makes that pair unique. Two different tasks can both have event revision 1; one task cannot have two events for revision 1.

**Predict:** repeating CREATE TABLE IF NOT EXISTS after changing a column definition does not reshape an existing table. The condition only skips creation when the table already exists. Durable data outlives our code, so evolving its structure requires a migration rather than hoping startup silently reconciles differences.

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

### Interpret the configuration, including its working directory

A properties file uses one key=value setting per line. Spring resolves `${WORKSPACE_DB:jdbc:h2:file:./workspace-data}` by first looking for WORKSPACE_DB and otherwise using the text after the colon as the default. The JDBC URL identifies the driver/protocol, H2 engine, file storage mode and relative base path.

The `./workspace-data` path is relative to the running process's current directory. Starting the same JAR from another directory can create or open a different database. A “my tasks vanished” report can therefore be a configuration/path mismatch rather than lost writes. Record the launch directory during the restart experiment.

`spring.sql.init.mode=always` asks startup to run initialization scripts even for a file-backed datasource. The scripts must tolerate existing tables. `server.address=127.0.0.1` binds the server locally. `server.error.include-message=never` suppresses a class of default error detail; it does not prevent our own code from leaking secrets in a custom response or log.

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

### Expand the query callback one value at a time

A datasource supplies database connections. JdbcTemplate uses them to execute statements and release resources. TransactionTemplate will group several statements in the next lesson. The constructor receives both helpers and saves their references in fields; constructing this adapter does not itself run a SELECT.

`SELECT id,title,status,revision FROM tasks ORDER BY id` asks for four columns from every task row in id order. Without ORDER BY, SQL does not promise a stable order. `jdbc.query(sql, mapper)` executes that query and calls the mapper once per row, accumulating its returned values into a list.

The lambda `(rs, row) -> new Task(...)` receives a ResultSet positioned at the current row and a row number. We use rs and do not need row. `rs.getString("id")` reads the named text column, then UUID.fromString converts that representation back to a UUID value. The title getter reads text. `Status.valueOf(...)` converts an exactly matching enum name such as DOING into the enum constant; unrecognized stored text throws. `getLong("revision")` reads the integer. Those four values become constructor arguments in order.

For a row (A, Plan, DOING, 2), the mapper constructs Task(A, Plan, Status.DOING, 2). The domain constructor still validates that object. The query layer handles storage representation; the domain layer handles valid task values. A corrupted row should produce a visible diagnostic, not a silently invented default state.

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

### Match each placeholder to one value

INSERT names the destination columns explicitly, then VALUES supplies four placeholders in the same order. JdbcTemplate receives the SQL text followed by id text, normalized title, enum name text and revision. A UUID's toString creates its textual representation; an enum's name returns its declared constant name. Neither is a user-facing translation.

A title such as `Sam's task` contains a quote. Concatenating it into SQL can break syntax and allow data to become instructions. A bound parameter keeps the SQL structure fixed and sends that title as a separate value. This is why escaping arbitrary input by hand is not our design.

`jdbc.update` is named for statements that change data, including INSERT as well as SQL UPDATE. It returns an affected-row count. Here insertion failure throws before we return the Task. In the next lesson an update count is essential for detecting a stale write.

**Predict:** the task object is constructed before the INSERT. If title validation throws, no SQL executes. If the INSERT fails, an object was created in memory but the method does not successfully return it. Object construction and durable acceptance are separate events.

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

### Compare costs using one concrete change

Imagine adding due dates and filtering overdue tasks. With JDBC you choose the new column, migration, SELECT predicate and row conversion explicitly. An object-relational mapper can reduce repeated mapping and track object changes, but you must still inspect when it issues queries and whether relationships cause extra reads. A shorter controller is not proof of less database work.

For the restart test, record the process's working directory and effective database URL along with the returned task id. Start a fresh process against that same file and request the id again. For the fresh-database test, use a separate disposable database path; do not erase your learning database to simulate a new user. The first checks retained state; the second checks initialization. Neither alone covers both.

Write `decisions/008-persistence.md`. Trace one request from JSON to Task to an INSERT and back. Compare explicit SQL with an object-relational mapper: an ORM can reduce mapping code but introduces identity, loading and query-generation behavior you still must inspect.

Plan a restart test: create a task, stop the server, start it against the same file and confirm the task remains. Also plan a fresh-database test. Passing only one can hide an initialization failure or a mistaken database path. Perform both after the next lesson wires the finished adapter.

```check
run "mvn -q test" timeout=180
file decisions/008-persistence.md
```
