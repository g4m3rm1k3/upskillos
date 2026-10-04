---
title: Schema changes — preserve old data and old clients
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

A migration changes durable structure that outlives the running code. Rebuilding a database is not an upgrade strategy. We practice an additive change, prove old records survive, and distinguish a local SQL experiment from a coordinated production migration.

## Write an additive migration

A new non-null column needs a value for existing rows; the default supplies an empty description. IF NOT EXISTS makes this particular statement repeatable on H2. It is not a migration history system and does not detect a previously applied script being edited.

Old application queries name columns explicitly, so this addition does not change their mapping. Removing or renaming a column would require coordinated compatibility work. H2 DDL can commit independently of a surrounding transaction; never assume every database can roll back every schema change.

Type this fragment yourself. Start an empty file at `migrations/V2__task_description.sql`:

```sql edit=migrations/V2__task_description.sql mode=replace
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description VARCHAR(1000) DEFAULT '' NOT NULL;
```

## Prove an old row survives the change

The test creates an old schema independently of today's initialization file. Reading a migration from disk tests the actual artifact, not a duplicated SQL string. Try-with-resources closes the result, statement and connection in reverse order even on failure.

The migration is intentionally an experiment here: it is not automatically applied to the learner's file database or used by the UI. A release adding descriptions would update fresh initialization, introduce a versioned runner such as Flyway, and test upgrades from supported historical schemas before enabling the feature.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/MigrationTest.java`:

```java edit=src/test/java/workspace/MigrationTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.sql.*;
import static org.junit.jupiter.api.Assertions.*;
class MigrationTest {
    @Test void preservesAnExistingRowAndCanRepeat() throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:migration");
             var statement = connection.createStatement()) {
            statement.execute("CREATE TABLE tasks(id VARCHAR(36) PRIMARY KEY, title VARCHAR(80))");
            statement.execute("INSERT INTO tasks VALUES ('old', 'Existing work')");
            String migration = Files.readString(Path.of("migrations/V2__task_description.sql"));
            statement.execute(migration); statement.execute(migration);
            try (var result = statement.executeQuery("SELECT title,description FROM tasks WHERE id='old'")) {
                assertTrue(result.next());
                assertEquals("Existing work", result.getString(1));
                assertEquals("", result.getString(2));
            }
        }
    }
}
```

```check
run "mvn -q test" timeout=180
```

## Plan a database engine change

Write `decisions/012-migration.md`. Compare embedded H2 with PostgreSQL: local setup and isolation are convenient with H2, while a shared database server adds connection management, independent lifecycle and operational responsibility. JDBC is a common API, not a guarantee that SQL dialects, locks and isolation behave identically.

For a PostgreSQL release, add its driver as a managed runtime dependency, externalize the JDBC URL and credentials, run the same integration suite against the actual engine, and test backups and restoration. Do not claim the H2 test proves PostgreSQL behavior. We keep this course's default locally runnable without Docker.

Describe expand–migrate–contract: add compatible structure, backfill and deploy readers/writers that tolerate both states, then remove obsolete structure after old clients are gone. A rollback of application code may not undo a destructive migration.

```check
file decisions/012-migration.md
```
