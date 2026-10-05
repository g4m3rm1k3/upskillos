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

### Work through old data before new code

Before migration an old row contains id and title (plus our real application's other original fields). ALTER TABLE modifies an existing structure. ADD COLUMN introduces description as bounded text. DEFAULT '' supplies an empty string for existing rows and future inserts that omit this column; NOT NULL prevents an absent value.

Empty string is an intentional default, distinct from SQL NULL. Existing Java INSERT statements name their columns explicitly and omit description, so the database supplies its default. Existing SELECT statements name their columns and ignore the new one. This makes the addition compatible with our old code in a way that deleting title would not be.

**Predict:** changing schema.sql alone with CREATE TABLE IF NOT EXISTS would leave an existing table without description. A clean-database test could pass while an upgrade fails. That is why the next test builds the old shape first and applies the actual migration artifact.

A new non-null column needs a value for existing rows; the default supplies an empty description. IF NOT EXISTS makes this particular statement repeatable on H2. It is not a migration history system and does not detect a previously applied script being edited.

Old application queries name columns explicitly, so this addition does not change their mapping. Removing or renaming a column would require coordinated compatibility work. H2 DDL can commit independently of a surrounding transaction; never assume every database can roll back every schema change.

Type this fragment yourself. Start an empty file at `migrations/V2__task_description.sql`:

```sql edit=migrations/V2__task_description.sql mode=replace
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description VARCHAR(1000) DEFAULT '' NOT NULL;
```

## Prove an old row survives the change

### Follow raw JDBC and resource lifetime

DriverManager.getConnection selects a JDBC driver for the URL and opens a connection. connection.createStatement creates a statement object for sending SQL. Here the SQL uses fixed teaching literals rather than external input; application input still needs bound parameters.

Files.readString reads the migration file's text. Path.of interprets the path relative to the test's working directory. Executing the resulting string tests the saved script, so a typo in that file fails the test instead of being hidden by a separately copied SQL statement in Java.

executeQuery returns a ResultSet cursor initially positioned before the first row. `result.next()` advances to the first row and returns whether one exists; asserting true detects accidental loss of the old row. JDBC's numeric column indexes start at 1, unlike Java array indexes. getString(1) reads title and getString(2) reads description in this SELECT's column order.

Resources close in reverse declaration order: result, then statement, then connection. The second migration execution checks repeatability of this specific H2 statement. It does not establish a migration history, detect edited historical scripts, or prove another database engine's DDL rollback behavior.

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

### Work the compatibility sequence through a real column

For descriptions, first add a column with a default that old writers can omit. Next deploy code able to read and write it while tolerating old rows. Backfill data separately if a meaningful default requires computation. Only after every supported reader/writer uses the new contract should you remove old structure. That staged sequence is expand, migrate, contract.

A rollback to old application code is safe only while the schema still supports it. Dropping an old column and then switching back to an old JAR cannot reconstruct the missing data. Write a compatibility matrix: old code/old schema, old code/expanded schema, new code/expanded schema. Test the combinations you intend to use during rollout and recovery.

Changing H2 to PostgreSQL also changes deployment and operational ownership. Common JDBC method names do not prove matching SQL syntax, transaction isolation, lock behavior or backup formats. Keep the local course release on H2 and describe the additional evidence a real engine migration would require, rather than claiming an unperformed deployment.

Write `decisions/012-migration.md`. Compare embedded H2 with PostgreSQL: local setup and isolation are convenient with H2, while a shared database server adds connection management, independent lifecycle and operational responsibility. JDBC is a common API, not a guarantee that SQL dialects, locks and isolation behave identically.

For a PostgreSQL release, add its driver as a managed runtime dependency, externalize the JDBC URL and credentials, run the same integration suite against the actual engine, and test backups and restoration. Do not claim the H2 test proves PostgreSQL behavior. We keep this course's default locally runnable without Docker.

Describe expand–migrate–contract: add compatible structure, backfill and deploy readers/writers that tolerate both states, then remove obsolete structure after old clients are gone. A rollback of application code may not undo a destructive migration.

```check
file decisions/012-migration.md
```
