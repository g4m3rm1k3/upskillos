# Part 2: SQL

SQL is the language you use to ask a database questions and to change it. Your editor will generate SQL constantly, so you need to read and write it fluently.

SQL has four families of statements:

| Family | Does | Statements |
| --- | --- | --- |
| Query | Read data | `SELECT` |
| Data changes | Add, change, remove rows | `INSERT`, `UPDATE`, `DELETE` |
| Schema changes | Add, change, remove tables | `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE INDEX` |
| Control | Group and configure | `BEGIN`, `COMMIT`, `ROLLBACK`, `PRAGMA` |

## Set up a practice database

In DB Browser for SQLite (or the `sqlite3` shell), create a new database and run this once. It builds the bookshop from Part 1:

```sql
CREATE TABLE authors (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  country TEXT
);

CREATE TABLE books (
  id        INTEGER PRIMARY KEY,
  title     TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES authors(id),
  price     REAL NOT NULL CHECK (price >= 0),
  year      INTEGER
);

CREATE TABLE customers (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ordered_on  TEXT NOT NULL
);

CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  book_id    INTEGER NOT NULL REFERENCES books(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL,
  PRIMARY KEY (order_id, book_id)
);

INSERT INTO authors (name, country) VALUES
  ('Frank Herbert', 'USA'), ('Jane Austen', 'UK'), ('Ursula K. Le Guin', 'USA');
INSERT INTO books (title, author_id, price, year) VALUES
  ('Dune', 1, 9.99, 1965), ('Emma', 2, 6.50, 1815),
  ('The Dispossessed', 3, 8.75, 1974), ('A Wizard of Earthsea', 3, 7.25, 1968);
INSERT INTO customers (name, email) VALUES
  ('Ana Ruiz', 'ana@example.com'), ('Ben Ito', 'ben@example.com');
INSERT INTO orders (customer_id, ordered_on) VALUES
  (1, '2026-01-15'), (1, '2026-02-02'), (2, '2026-02-10');
INSERT INTO order_items (order_id, book_id, quantity, unit_price) VALUES
  (1, 1, 1, 9.99), (1, 2, 2, 6.50), (2, 1, 1, 9.99), (3, 2, 1, 6.50);
```

Read it slowly. Every line connects to Part 1: primary keys, foreign keys via `REFERENCES`, `NOT NULL`, `UNIQUE`, `CHECK`, and a composite primary key on the junction table.

## Reading data: SELECT

The shape of a query:

```sql
SELECT   columns
FROM     table
WHERE    row filter
GROUP BY grouping
HAVING   group filter
ORDER BY sorting
LIMIT    count;
```

You write them in that order, but the database conceptually runs them as FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT. This explains why you can't use a column alias from `SELECT` inside `WHERE`.

### Selecting and filtering

```sql
SELECT * FROM books;
SELECT title, price FROM books WHERE price < 8 ORDER BY price DESC;
SELECT * FROM books WHERE title LIKE 'A %';
SELECT * FROM authors WHERE country IN ('UK', 'France');
SELECT * FROM books WHERE year BETWEEN 1960 AND 1980;
SELECT * FROM authors WHERE country IS NULL;
```

- `NULL` means "unknown". It is never equal to anything, including itself. Use `IS NULL`, not `= NULL`.
- `LIKE` uses `%` for "any characters" and `_` for "one character".

### Joins

A join combines rows from two tables where a condition matches, normally a foreign key equals a primary key:

```sql
SELECT books.title, authors.name
FROM books
JOIN authors ON authors.id = books.author_id;
```

- `JOIN` (also `INNER JOIN`) keeps only rows that match on both sides.
- `LEFT JOIN` keeps every row from the left table, filling with `NULL` where nothing matches. Use it to find things with no match, such as authors with no books.
- Give tables short aliases when queries grow: `FROM books AS b JOIN authors AS a ON a.id = b.author_id`.

Joining three or more tables is just chaining joins. Which tables does "which customer bought which book" need? Work it out from your Part 1 diagram.

### Aggregates and grouping

```sql
SELECT COUNT(*) FROM books;
SELECT author_id, COUNT(*) AS book_count, AVG(price) AS avg_price
FROM books
GROUP BY author_id
HAVING COUNT(*) > 1;
```

- Aggregate functions: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.
- `WHERE` filters rows **before** grouping; `HAVING` filters groups **after**.
- Every column in `SELECT` must either be in `GROUP BY` or inside an aggregate.

### Subqueries

A query inside a query:

```sql
SELECT title FROM books
WHERE price > (SELECT AVG(price) FROM books);
```

## Changing data

```sql
INSERT INTO authors (name, country) VALUES ('Octavia Butler', 'USA');

UPDATE books SET price = 10.50 WHERE id = 1;

DELETE FROM books WHERE id = 4;
```

**Always write the `WHERE`.** `UPDATE books SET price = 0` changes every row. Your editor will always target rows by primary key; this is why primary keys matter so much for it.

Constraints push back: try inserting a book with a negative price, a book with a nonexistent `author_id`, or a second customer with an existing email, and read each error message.

### Parameters

When your app builds SQL from user input, never paste the input into the query text. Use placeholders:

```sql
UPDATE books SET price = ? WHERE id = ?;
```

The values are passed separately. This prevents SQL injection and handles quotes and special characters correctly. Placeholders work for **values** only, not for table or column names (see Part 3 for what to do about those).

### Transactions

A transaction groups statements so they all succeed or none do:

```sql
BEGIN;
UPDATE books SET price = price * 1.1;
-- check the result, then either:
COMMIT;
-- or:
ROLLBACK;
```

Consider offering an undo feature in your editor later; transactions are one way to build it.

## Changing structure

```sql
CREATE TABLE genres (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
ALTER TABLE books ADD COLUMN isbn TEXT;
ALTER TABLE books RENAME COLUMN year TO published_year;
DROP TABLE genres;
CREATE INDEX idx_books_author ON books(author_id);
```

- An **index** makes lookups on a column faster at the cost of a little space and slower writes. Foreign key columns are usually worth indexing.
- SQLite's `ALTER TABLE` is limited. Changing a column's type or constraints usually means creating a new table, copying the data over, dropping the old one, and renaming. You don't need this for the MVP.

## Try it

Write queries for each. Don't look at answers until you've tried.

1. All books costing less than 8, cheapest first.
2. Every book with its author's name.
3. The number of books each author has, including authors with zero (hint: a `LEFT JOIN`).
4. The total value of each order (hint: `SUM(quantity * unit_price)` and a `GROUP BY`).
5. Customers who have never ordered anything.
6. The most expensive book per author.
7. Increase the price of every book by Ursula K. Le Guin by 10%.
8. Try to delete an author who has books. What happens? Why?
9. Start a transaction, delete every order item, look at the table, then roll back.

When you're stuck, paste your attempt and the error message to me and ask for a hint.

## Checkpoint

- What is the difference between `WHERE` and `HAVING`?
- When does `LEFT JOIN` return a different result than `JOIN`?
- Why is `price = NULL` always false?
- Why should an UPDATE always be targeted by primary key in your editor?
- What does a placeholder protect you from, and what can't it be used for?
- What does a transaction guarantee?
