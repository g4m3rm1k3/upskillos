CREATE TABLE departments (
    department_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE desks (
    desk_id INTEGER PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(department_id),
    name TEXT NOT NULL,
    UNIQUE (department_id, name)
);
