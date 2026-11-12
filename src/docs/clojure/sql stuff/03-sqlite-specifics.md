# Part 3: SQLite Specifics

SQLite is a complete SQL database engine that lives in a single file, with no server. That makes it perfect for your project: a "database" is just a file the user can upload. But SQLite has its own habits that your editor must handle, because your users' files can come from anywhere.

## Concepts

### One file, no server

A SQLite database is one ordinary file, usually `.db`, `.sqlite` or `.sqlite3`. The extension means nothing; the contents decide. Every valid file starts with the same 16 bytes of text: `SQLite format 3` followed by a zero byte. Your editor can check this to reject non-SQLite uploads with a friendly message.

### Flexible typing and type affinity

Most databases enforce column types strictly. SQLite doesn't. A column has a type **affinity**, which is a preference, not a rule. SQLite has five:

| Affinity | Roughly means |
| --- | --- |
| `INTEGER` | Whole numbers |
| `REAL` | Decimals |
| `TEXT` | Strings |
| `BLOB` | Raw bytes, stored as given |
| `NUMERIC` | Tries to store as a number if it looks like one |

The consequence for your editor: a column declared `INTEGER` can hold text if someone inserted text. Don't assume every cell in a column has the declared type. Look at the actual value, and think about what to show for each of the storage classes: `NULL`, integer, real, text, blob.

Also, SQLite has no real date type. Dates are stored as text (such as `2026-01-15`), numbers, or Unix timestamps, depending on who made the file.

### rowid

Every ordinary table has a hidden integer column called `rowid`. A column declared `INTEGER PRIMARY KEY` becomes an alias for it. Tables with no primary key still have `rowid`, which gives your editor a way to target a row for editing even when the table has no declared key. (A table declared `WITHOUT ROWID` is the exception; handle it later.)

### The schema lives in a table

SQLite stores every table, index and view definition in a built-in table called `sqlite_master` (also reachable as `sqlite_schema`). Try:

```sql
SELECT type, name, tbl_name, sql FROM sqlite_master;
```

This is how your editor will discover what's in an uploaded file: list tables from here. Names starting with `sqlite_` are internal; usually you'll hide them.

### PRAGMA

`PRAGMA` statements read or change database settings and metadata. Three matter to you:

```sql
PRAGMA table_info(books);          -- columns: name, declared type, not null, default, primary key
PRAGMA foreign_key_list(books);    -- the foreign keys of a table
PRAGMA foreign_keys = ON;          -- turn on foreign key enforcement
```

`table_info` tells your editor which columns exist, which are the primary key, and what types they are declared as. This is what lets it draw an editable grid for a table it has never seen.

**Foreign keys are off by default** in SQLite and must be switched on for each connection. Until you do, the database accepts rows pointing at nothing. Decide deliberately which behaviour your editor should have, and tell the user.

### Quoting names

Placeholders (`?`) work for values, not for table or column names. Since your editor builds queries for table names it reads from the file, you must quote identifiers: wrap in double quotes and double any double quote inside the name. Test with a table whose name contains a space and a quote. Real files contain names like that.

### Other things in real files

- **Views**: saved queries that look like tables. Usually read-only.
- **Indexes, triggers**: they live in `sqlite_master` too. Triggers can change other tables when you edit one.
- **Blobs**: images and files stored in cells. Don't try to print them as text.
- **WAL mode**: databases in write-ahead-log mode may have recent changes sitting in a separate `-wal` file next to the `.db`. If a user uploads only the `.db`, those changes are missing. Mention it in your help text.
- **Big files**: the whole file is loaded into memory in your design. Think about what happens at hundreds of megabytes.

## Try it

1. Open the practice database from Part 2 in DB Browser for SQLite. Run `SELECT * FROM sqlite_master;` and read every row.
2. Run `PRAGMA table_info(order_items);`. Which column marks the primary key? Why does a composite key look odd here?
3. Insert a book with the price `'cheap'`. What happens? Then insert one with the year `'unknown'`. Why does one succeed and the other fail?
4. With foreign keys off, insert a book pointing at author 999. Turn them on and try again.
5. Find a `.db` file you didn't create. Browser history and phone-app data are common examples. List its tables using only `sqlite_master`.
6. Open the file in a hex viewer or text editor and look at the first bytes.
7. Create a table named `my "weird" table` and select from it. Which quoting makes it work?

## Checkpoint

- Why can a column declared `INTEGER` still contain text?
- Where does SQLite keep the list of tables, and how do you query it?
- What does `PRAGMA table_info` give you that `sqlite_master` doesn't?
- Why does your editor need `rowid`?
- Why must table and column names be quoted instead of passed as placeholders?
- What is surprising about foreign keys in SQLite?
