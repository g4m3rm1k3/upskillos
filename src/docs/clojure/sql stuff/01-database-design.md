# Part 1: Database Design Fundamentals

A relational database is a set of tables. Each table describes one kind of thing, and tables point at each other with keys instead of copying data. Good design means every fact is stored exactly once.

## Concepts

### Tables, rows, columns

- A **table** describes one kind of thing: `authors`, `books`, `customers`.
- A **row** is one instance: one author, one book.
- A **column** is one fact about every row: `name`, `price`, `published_year`.

If you can't say in one plain sentence what a row in a table represents, the table is probably doing two jobs.

### Primary keys

A **primary key** is a column (or columns) whose value identifies exactly one row. Rules of thumb:

- Unique and never empty.
- Stable: it never changes once assigned.
- Meaningless: an auto-assigned integer `id` is usually better than an email address or a name, because real-world facts change.

### Foreign keys and relationships

A **foreign key** is a column in one table holding the primary key of a row in another. It is how tables link.

| Relationship | Example | How you store it |
| --- | --- | --- |
| One-to-many | One author has many books | `books.author_id` points at `authors.id` |
| Many-to-many | An order has many books; a book is in many orders | A third table, `order_items`, with `order_id` and `book_id` |
| One-to-one | A customer has one loyalty card | Foreign key with a UNIQUE constraint, or just merge the tables |

Many-to-many always needs a **junction table**. You can't store "a list of books" in one cell without breaking the rules below.

### Normalization in practice

Normalization is a set of rules for splitting tables so facts aren't duplicated. You only need the spirit of the first three:

1. **One value per cell.** No lists in a column, no `genre1`, `genre2`, `genre3` columns.
2. **Every column depends on the whole key.** In a junction table keyed by (order, book), a column like `customer_name` depends on the order only, so it belongs elsewhere.
3. **Columns describe the key and nothing else.** If `books` has `author_name` and `author_country`, those describe the author, not the book. Move them to `authors`.

The test that catches most problems: *if one real-world fact changes, how many places must I update?* The answer should be one.

A bad table, with its problems:

| order_id | customer | customer_email | books |
| --- | --- | --- | --- |
| 1 | Ana Ruiz | ana@example.com | Dune, Emma |
| 2 | Ana Ruiz | ana@example.com | Dune |
| 3 | Ben Ito | ben@example.com | Emma |

- Ana's email is stored twice. If it changes, you must find every copy.
- `books` holds a list, so you can't easily count how many copies of Dune were sold.
- Deleting order 3 also deletes everything you know about Ben.

### Constraints

Constraints are rules the database enforces so bad data can't get in:

- `NOT NULL`: the value must be present.
- `UNIQUE`: no two rows can share this value.
- `CHECK (price >= 0)`: a custom rule.
- `DEFAULT`: a value used when none is given.
- `FOREIGN KEY`: the value must exist in the other table. You decide what happens on delete: refuse it, or cascade it.

Your editor will hit these. When a user edits a cell and the database refuses, the constraint is why, and your interface should say so clearly.

### Naming

Pick conventions and keep them: lowercase `snake_case`, plural table names (`books`), singular column names (`title`), foreign keys named `<table singular>_id` (`author_id`).

### Denormalizing on purpose

Sometimes duplicating a fact is right. An order line should store the price at the time of sale, because the book's price will change later and old orders must not change with it. That's not a violation; it's a different fact ("price charged") from "current price".

## A design process you can reuse

1. List the **nouns** in the problem. Each is a candidate table.
2. For each noun, list the **facts** you need. Each is a candidate column.
3. For each pair of nouns, ask: *one-to-many, many-to-many, or unrelated?* Add foreign keys or junction tables.
4. Pick a primary key for every table.
5. Add constraints for every rule you know.
6. Run the "one fact changes" test on every column.

## Try it

1. On paper, design the bookshop: authors, books, customers, orders. Draw boxes for tables with their columns, and lines for relationships. Mark primary keys and foreign keys.
2. Take the bad orders table above and split it into properly normalized tables. How many do you end up with?
3. Add a feature: books can have several genres, and a genre has many books. What changes?
4. Add a rule: a book's price can never be negative, and two books can't share an ISBN. Which constraints express these?
5. Open any `.db` file you have (or wait until Part 3) and judge its design. Where would you split a table?

## Checkpoint

- What is the difference between a primary key and a foreign key?
- Why does a many-to-many relationship need a third table?
- What does "one fact in one place" mean, and how do you test for it?
- Why store the price on the order line instead of looking it up on the book?
- Why is an email address a poor primary key?
- A user's edit is rejected by the database. Name three constraint types that could be the cause.
