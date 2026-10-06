---
title: 8 — Project: a Mini In-Memory Database
track: Data Structures and Algorithms, Measured
runtime: cpp
reference: optional
console: true
---

Databases are data structures with a command language on top. This project builds a small one: a table of people that you can insert into, delete from, and query by id, by city and by age range. You'll make it correct first with plain scans, **measure** it, then add **indexes**, and see which container each kind of query needs.

**Requirements**

| Operation | Meaning | Returns |
|---|---|---|
| `insert(record)` | add a person | `false`, changing nothing, if the id is taken |
| `erase(id)` | remove a person | `false` if there's no such id |
| `get(id)` | look up by id | a pointer to the record, or `nullptr` |
| `in_city(city)` | everyone in a city | records, smallest id first |
| `aged(lo, hi)` | everyone with `lo <= age <= hi` | records, youngest first; same age: smallest id first |
| `size()` | how many people | |

You'll also write `minidb`, a program that runs these as typed commands. This lesson gives less code than earlier ones: the steps say what to build, and the full code is in the reference.

## Step 1 — The interface

**This step: create the supplied `minidb/db.h` and read it.**

Version 1 keeps the rows in a `std::unordered_map<int, Record>` keyed by id: `get`, `insert` and `erase` are O(1) on average, using lesson 3's idea.

`in_city` and `aged` have no such shortcut yet. Version 1 will **scan**: look at every row.

```cpp file=minidb/db.h provided
// db.h: a tiny in-memory database of people.
#pragma once

#include <cstddef>
#include <string>
#include <unordered_map>
#include <vector>

struct Record {
    int id;
    std::string name;
    std::string city;
    int age;
};

class Database {
public:
    // Adds the record. Returns false, and changes nothing, if its id is taken.
    bool insert(const Record& record);

    // Removes the record with this id. Returns false if there isn't one.
    bool erase(int id);

    // The record with this id, or nullptr.
    const Record* get(int id) const;

    // Everyone in this city, smallest id first.
    std::vector<Record> in_city(const std::string& city) const;

    // Everyone with lo <= age <= hi, youngest first; for the same age,
    // smallest id first.
    std::vector<Record> aged(int lo, int hi) const;

    std::size_t size() const;

private:
    std::unordered_map<int, Record> rows_;   // id -> record
};
```

```check
file minidb/db.h
```

## Step 2 — The build file

**This step: create the supplied `minidb/CMakeLists.txt`.**

`db_tests` for now. You'll add a benchmark and the command program as you go.

```cmake file=minidb/CMakeLists.txt provided
cmake_minimum_required(VERSION 3.20)
project(minidb LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Timings mean nothing without optimisation: build Release unless
# configured with -DCMAKE_BUILD_TYPE=Debug.
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Warnings for every target below.
if(MSVC)
    add_compile_options(/W4)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# This folder, the benchmark harness and the test framework.
include_directories(. ../bench ../testing)

# Every tests/*_test.cpp file becomes part of the test program.
file(GLOB TEST_SOURCES CONFIGURE_DEPENDS tests/*_test.cpp)
add_executable(db_tests ../testing/test_main.cpp ${TEST_SOURCES} db.cpp)
```

```check
file minidb/CMakeLists.txt
```

## Step 3 — The specification

**This step: create the supplied `minidb/tests/db_test.cpp` and read it.**

The tests pin down every row of the requirements table, including the orderings. `aged(36, 41)` must give ids 1, 5, 4: Ada (36), Tim (36, a bigger id), then Alan (41).

```cpp file=minidb/tests/db_test.cpp provided
// Provided by the lesson: what Database must do.
#include "studio_test.hpp"

#include <string>
#include <vector>

#include "db.h"

namespace {

Database people()
{
    Database db;
    db.insert({3, "Grace", "Arlington", 85});
    db.insert({1, "Ada", "London", 36});
    db.insert({4, "Alan", "Wilmslow", 41});
    db.insert({2, "Charles", "London", 79});
    db.insert({5, "Tim", "London", 36});
    return db;
}

std::vector<int> ids(const std::vector<Record>& rows)
{
    std::vector<int> out;
    for (const Record& r : rows)
        out.push_back(r.id);
    return out;
}

} // namespace

TEST(insert_and_get)
{
    Database db = people();
    CHECK_EQ(db.size(), 5u);
    const Record* ada = db.get(1);
    CHECK(ada != nullptr);
    CHECK_EQ(ada->name, std::string("Ada"));
    CHECK_EQ(ada->age, 36);
    CHECK(db.get(99) == nullptr);
}

TEST(ids_are_unique)
{
    Database db = people();
    CHECK(!db.insert({1, "Impostor", "Paris", 20}));
    CHECK_EQ(db.size(), 5u);
    CHECK_EQ(db.get(1)->name, std::string("Ada"));
}

TEST(in_city_is_ordered_by_id)
{
    Database db = people();
    CHECK(ids(db.in_city("London")) == (std::vector<int>{1, 2, 5}));
    CHECK(ids(db.in_city("Wilmslow")) == (std::vector<int>{4}));
    CHECK(db.in_city("Paris").empty());
}

TEST(aged_includes_both_ends)
{
    Database db = people();
    CHECK(ids(db.aged(36, 41)) == (std::vector<int>{1, 5, 4}));
    CHECK(ids(db.aged(0, 200)) == (std::vector<int>{1, 5, 4, 2, 3}));
    CHECK(db.aged(50, 60).empty());
}

TEST(erase_removes_from_every_query)
{
    Database db = people();
    CHECK(db.erase(1));
    CHECK(!db.erase(1));
    CHECK_EQ(db.size(), 4u);
    CHECK(db.get(1) == nullptr);
    CHECK(ids(db.in_city("London")) == (std::vector<int>{2, 5}));
    CHECK(ids(db.aged(36, 36)) == (std::vector<int>{5}));
}
```

```check
file minidb/tests/db_test.cpp
```

## Step 4 — Version 1: correct first

**This step: create `minidb/db.cpp`. Make every test pass using only `rows_`. Configure, build and run the tests.**

- `insert`: `rows_.insert({record.id, record})` returns a pair whose `.second` is `false` if the key was already there, and in that case it changes nothing. That's exactly the requirement.
- `erase(id)`: `rows_.erase(id)` returns how many entries it removed: 0 or 1.
- `get`: `rows_.find(id)`, and return `&found->second`, or `nullptr` if it's `rows_.end()`.
- `in_city` and `aged`: loop over every row (`for (const auto& [id, record] : rows_)`), collect the matches, then `std::sort` them with a lambda that compares the way the requirements say. An `unordered_map` visits rows in no particular order, so the sort is essential.

```text
cmake -S minidb -B minidb/build -G "MinGW Makefiles"     (Windows)
cmake -S minidb -B minidb/build                          (macOS, Linux)
```

```text
cmake --build minidb/build
./minidb/build/db_tests
```

```cpp file=minidb/db.cpp
#include "db.h"

#include <algorithm>

bool Database::insert(const Record& record)
{
    return rows_.insert({record.id, record}).second;   // false if id is taken
}

bool Database::erase(int id)
{
    return rows_.erase(id) == 1;
}

const Record* Database::get(int id) const
{
    auto found = rows_.find(id);
    return found == rows_.end() ? nullptr : &found->second;
}

std::vector<Record> Database::in_city(const std::string& city) const
{
    std::vector<Record> out;
    for (const auto& [id, record] : rows_) {   // look at every row
        if (record.city == city)
            out.push_back(record);
    }
    std::sort(out.begin(), out.end(), [](const Record& a, const Record& b) {
        return a.id < b.id;
    });
    return out;
}

std::vector<Record> Database::aged(int lo, int hi) const
{
    std::vector<Record> out;
    for (const auto& [id, record] : rows_) {
        if (lo <= record.age && record.age <= hi)
            out.push_back(record);
    }
    std::sort(out.begin(), out.end(), [](const Record& a, const Record& b) {
        if (a.age != b.age)
            return a.age < b.age;
        return a.id < b.id;
    });
    return out;
}

std::size_t Database::size() const
{
    return rows_.size();
}
```

```check
file minidb/build/CMakeCache.txt label="minidb/build has been configured" -- Run the configure command for your system, from the track folder.
run "cmake --build minidb/build"
tests "./minidb/build/db_tests" -- Sort the results: an unordered_map visits its rows in no particular order.
```

## Step 5 — Measure

**This step: create the supplied `minidb/bench.cpp`, add a `db_bench` program to `minidb/CMakeLists.txt`, build it and run it.**

```cmake
add_executable(db_bench bench.cpp db.cpp)
```

The benchmark fills the database with 50,000 people in 500 cities, aged 18 to 97, then times 100 city queries and 100 two-year age queries. It also checks every answer against a plain loop over the same records, so a fast wrong answer can't slip through.

```text
cmake --build minidb/build
./minidb/build/db_bench
```

**Predict:** each city has about 100 people, and each two-year age range about 1,250. Which part of a scan's time is spent finding those few rows, and which part looking at the 49,000 others?

```cpp file=minidb/bench.cpp provided
// How fast are Database's queries with 50,000 people in it?
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <random>
#include <string>
#include <vector>

#include "bench.h"
#include "db.h"

int main()
{
    const int n = 50'000;
    std::mt19937 rng(2024);
    std::vector<Record> all;
    Database db;
    for (int id = 0; id < n; ++id) {
        Record r{id, "person" + std::to_string(id),
                 "city" + std::to_string(rng() % 500),
                 18 + static_cast<int>(rng() % 80)};
        all.push_back(r);
        db.insert(r);
    }

    // 100 queries of each kind: one city each, or a two-year age range.
    const int queries = 100;
    double city_ns = bench::median_ns([&] {
        std::uint64_t found = 0;
        for (int q = 0; q < queries; ++q)
            found += db.in_city("city" + std::to_string(q * 5)).size();
        bench::keep(found);
    }, 3);
    double age_ns = bench::median_ns([&] {
        std::uint64_t found = 0;
        for (int q = 0; q < queries; ++q)
            found += db.aged(18 + q % 78, 19 + q % 78).size();
        bench::keep(found);
    }, 3);
    std::cout << n << " people; time for one query:\n" << std::fixed
              << std::setprecision(1)
              << "  in_city   " << std::setw(10) << city_ns / queries / 1e3
              << " us\n"
              << "  aged      " << std::setw(10) << age_ns / queries / 1e3
              << " us\n";

    // Check the answers against a plain loop over every record.
    int right = 0;
    for (int q = 0; q < queries; ++q) {
        std::string city = "city" + std::to_string(q * 5);
        std::vector<int> want;
        for (const Record& r : all) {
            if (r.city == city)
                want.push_back(r.id);
        }
        std::vector<int> got;
        for (const Record& r : db.in_city(city))
            got.push_back(r.id);
        right += got == want ? 1 : 0;
    }
    for (int q = 0; q < queries; ++q) {
        int lo = 18 + q % 78;
        std::vector<int> want;
        for (int age = lo; age <= lo + 1; ++age) {
            for (const Record& r : all) {
                if (r.age == age)
                    want.push_back(r.id);
            }
        }
        std::vector<int> got;
        for (const Record& r : db.aged(lo, lo + 1))
            got.push_back(r.id);
        right += got == want ? 1 : 0;
    }
    std::cout << right << " of " << 2 * queries << " query results checked"
              << " against a plain loop\n";
}
```

### What happened

```text
50000 people; time for one query:
  in_city        511.2 us
  aged           843.7 us
```

Every query looks at all 50,000 rows to return about 100 of them: **O(n)** per query, however small the answer. Double the table and every query takes twice as long. A real database solves this with **indexes**.

```check
contains minidb/CMakeLists.txt "add_executable(db_bench" -- Add add_executable(db_bench bench.cpp db.cpp) to the end of CMakeLists.txt.
run "cmake --build minidb/build"
run "./minidb/build/db_bench" stdout="200 of 200 query results checked"
```

## Step 6 — Choose the indexes

**This step: add two index members to `Database` in `minidb/db.h`: one for cities and one for ages. Choose their containers.**

An **index** is a second data structure that maps a column's values to the ids of the rows that have them, so a query can jump straight to its answers. The question is which container suits each query:

| Query | Needs | Container |
|---|---|---|
| `in_city("London")` | exact matches only | `std::unordered_map`: O(1) average |
| `aged(30, 40)` | every key **in a range**, in order | `std::map`: `lower_bound`, then walk forward |

A hash map scatters its keys, so it can't find "every age from 30 to 40" without checking every age. An ordered map (lesson 4) jumps to 30 in O(log n) and walks forward in order.

For the ids under each key, use a `std::set<int>`: a balanced tree like `std::map`, holding keys only. It keeps the ids sorted, which is exactly the order the queries must return, and removes one in O(log n).

```cpp
// city -> ids
std::unordered_map<std::string, std::set<int>> by_city_;
// age -> ids
std::map<int, std::set<int>> by_age_;
```

Include `<map>` and `<set>`.

```cpp file=minidb/db.h
// db.h: a tiny in-memory database of people.
#pragma once

#include <cstddef>
#include <map>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>

struct Record {
    int id;
    std::string name;
    std::string city;
    int age;
};

class Database {
public:
    // Adds the record. Returns false, and changes nothing, if its id is taken.
    bool insert(const Record& record);

    // Removes the record with this id. Returns false if there isn't one.
    bool erase(int id);

    // The record with this id, or nullptr.
    const Record* get(int id) const;

    // Everyone in this city, smallest id first.
    std::vector<Record> in_city(const std::string& city) const;

    // Everyone with lo <= age <= hi, youngest first; for the same age,
    // smallest id first.
    std::vector<Record> aged(int lo, int hi) const;

    std::size_t size() const;

private:
    std::unordered_map<int, Record> rows_;   // id -> record

    // Indexes: kept up to date by insert and erase.
    std::unordered_map<std::string, std::set<int>> by_city_;   // city -> ids
    std::map<int, std::set<int>> by_age_;                      // age -> ids
};
```

```check
matches minidb/db.h "std::unordered_map\s*<\s*std::string\s*,\s*std::set\s*<\s*int\s*>\s*>" label="a hash index from city to a set of ids"
matches minidb/db.h "std::map\s*<\s*int\s*,\s*std::set\s*<\s*int\s*>\s*>" label="an ordered index from age to a set of ids"
run "cmake --build minidb/build"
```

## Step 7 — Version 2: use the indexes

**This step: rewrite `minidb/db.cpp` so that `insert` and `erase` keep both indexes up to date, and the queries use them. Then run the tests and the benchmark again.**

An index is only useful if it's always right. That's the class's **invariant**: every row's id is in exactly the right entry of each index, and no other ids are anywhere in them.

- `insert`: only after `rows_` accepts the record, add its id to `by_city_[record.city]` and `by_age_[record.age]`. (`[]` creates an empty set the first time a key is used.)
- `erase`: before removing the row, remove its id from both indexes. If a set becomes empty, erase that index entry, so the indexes don't fill up with empty keys.
- `in_city`: one `find` in `by_city_`, then `rows_.at(id)` for each id in the set.
- `aged`: start at `by_age_.lower_bound(lo)` and walk forward while the age is `<= hi`.

```text
cmake --build minidb/build
./minidb/build/db_tests
./minidb/build/db_bench
```

```cpp file=minidb/db.cpp
#include "db.h"

bool Database::insert(const Record& record)
{
    if (!rows_.insert({record.id, record}).second)
        return false;                     // id taken: change nothing
    by_city_[record.city].insert(record.id);
    by_age_[record.age].insert(record.id);
    return true;
}

bool Database::erase(int id)
{
    auto found = rows_.find(id);
    if (found == rows_.end())
        return false;
    const Record& record = found->second;
    // Remove the id from both indexes, and drop index entries left empty.
    auto city = by_city_.find(record.city);
    city->second.erase(id);
    if (city->second.empty())
        by_city_.erase(city);
    auto age = by_age_.find(record.age);
    age->second.erase(id);
    if (age->second.empty())
        by_age_.erase(age);
    rows_.erase(found);                   // last: record refers into it
    return true;
}

const Record* Database::get(int id) const
{
    auto found = rows_.find(id);
    return found == rows_.end() ? nullptr : &found->second;
}

std::vector<Record> Database::in_city(const std::string& city) const
{
    std::vector<Record> out;
    auto found = by_city_.find(city);         // one hash lookup
    if (found == by_city_.end())
        return out;
    for (int id : found->second)              // a std::set: ids in order
        out.push_back(rows_.at(id));
    return out;
}

std::vector<Record> Database::aged(int lo, int hi) const
{
    std::vector<Record> out;
    // Jump to the first age >= lo, then walk forward in age order.
    auto it = by_age_.lower_bound(lo);
    for (; it != by_age_.end() && it->first <= hi; ++it) {
        for (int id : it->second)
            out.push_back(rows_.at(id));
    }
    return out;
}

std::size_t Database::size() const
{
    return rows_.size();
}
```

### What happened

```text
50000 people; time for one query:
  in_city         12.9 us
  aged           103.6 us
```

`in_city` got about 40× faster: it now touches only its ~100 answers. `aged` improved less, because it still copies about 1,250 records, each with two strings, into its result. The search is gone; the copying is what's left. (A real database would return ids or references to save that copy too.)

Indexes aren't free: every `insert` and `erase` now does two more map updates, and the indexes use memory. Databases make you choose which columns to index for the same reason.

```check
contains minidb/db.cpp "by_city_"
contains minidb/db.cpp "by_age_.lower_bound"
run "cmake --build minidb/build"
tests "./minidb/build/db_tests" require="erase_removes_from_every_query" -- erase must remove the id from both indexes before removing the row.
run "./minidb/build/db_bench" stdout="200 of 200 query results checked"
```

## Step 8 — Challenge: the minidb program

**This step: no code is given. Write `minidb/main.cpp`, a program that reads commands until the input ends, and add it to `CMakeLists.txt` as `minidb`.**

```cmake
add_executable(minidb main.cpp db.cpp)
```

| Command | Output |
|---|---|
| `insert <id> <name> <city> <age>` | `inserted <id>`, or `id <id> already exists` |
| `get <id>` | `<id> <name> <city> <age>`, or `no row <id>` |
| `delete <id>` | `deleted <id>`, or `no row <id>` |
| `city <city>` | one line per record, then `(<n> rows)` (`(1 row)` for one) |
| `age <lo> <hi>` | the same |
| `count` | `<n> rows` |
| anything else | `unknown command: <word>` |

Names and cities are single words. Start it in the terminal and try:

```text
insert 1 Ada London 36
insert 2 Alan Wilmslow 41
insert 3 Tim London 36
city London
age 36 40
delete 1
count
```

```hints
nudge: Split it into two problems: reading one command at a time until the input ends, and doing one command. Get the first working with a single command, `count`, before adding any others.
concept: `while (std::cin >> word)` reads one word at a time and stops at the end of the input. After it reads the command word, the same `>>` reads that command's arguments (`std::cin >> id >> name >> city >> age`), because names and cities are single words. Each command is a call to one `Database` function: `insert` and `erase` return `bool`, `get` returns a pointer that may be `nullptr`, and `in_city` and `aged` return vectors you print one line at a time.
shape: One `Database db;`, then a loop with an `if`/`else if` chain on the command word. Write a small function that prints one record as `id name city age`, and another that prints a vector of records followed by its count, using `(1 row)` for one and `(n rows)` otherwise; `city` and `age` both use it. The final `else` prints `unknown command: ` and the word.
```

```cpp file=minidb/main.cpp
// minidb: type commands to store and query people.
#include <iostream>
#include <string>
#include <vector>

#include "db.h"

namespace {

void print(const Record& r)
{
    std::cout << r.id << ' ' << r.name << ' ' << r.city << ' ' << r.age
              << '\n';
}

void print_all(const std::vector<Record>& rows)
{
    for (const Record& r : rows)
        print(r);
    std::cout << "(" << rows.size()
              << (rows.size() == 1 ? " row" : " rows") << ")\n";
}

} // namespace

int main()
{
    Database db;
    std::string command;
    while (std::cin >> command) {
        if (command == "insert") {
            Record r;
            std::cin >> r.id >> r.name >> r.city >> r.age;
            if (db.insert(r))
                std::cout << "inserted " << r.id << '\n';
            else
                std::cout << "id " << r.id << " already exists\n";
        } else if (command == "get") {
            int id = 0;
            std::cin >> id;
            if (const Record* r = db.get(id))
                print(*r);
            else
                std::cout << "no row " << id << '\n';
        } else if (command == "delete") {
            int id = 0;
            std::cin >> id;
            if (db.erase(id))
                std::cout << "deleted " << id << '\n';
            else
                std::cout << "no row " << id << '\n';
        } else if (command == "city") {
            std::string city;
            std::cin >> city;
            print_all(db.in_city(city));
        } else if (command == "age") {
            int lo = 0;
            int hi = 0;
            std::cin >> lo >> hi;
            print_all(db.aged(lo, hi));
        } else if (command == "count") {
            std::cout << db.size() << " rows\n";
        } else {
            std::cout << "unknown command: " << command << '\n';
        }
    }
}
```

```check
contains minidb/CMakeLists.txt "add_executable(minidb" -- Add add_executable(minidb main.cpp db.cpp) to CMakeLists.txt.
run "cmake --build minidb/build"
run "./minidb/build/minidb" stdin="insert 1 Ada London 36\ninsert 2 Alan Wilmslow 41\ninsert 3 Tim London 36\ninsert 1 Bob Paris 20\nget 2\nget 9\ncity London\nage 36 40\ndelete 1\ndelete 1\ncity London\ncount\n" stdout="inserted 3\nid 1 already exists\n2 Alan Wilmslow 41\nno row 9"
run "./minidb/build/minidb" stdin="insert 1 Ada London 36\ninsert 2 Alan Wilmslow 41\ninsert 3 Tim London 36\ninsert 1 Bob Paris 20\nget 2\nget 9\ncity London\nage 36 40\ndelete 1\ndelete 1\ncity London\ncount\n" stdout="1 Ada London 36\n3 Tim London 36\n(2 rows)\n1 Ada London 36\n3 Tim London 36\n(2 rows)"
run "./minidb/build/minidb" stdin="insert 1 Ada London 36\ninsert 2 Alan Wilmslow 41\ninsert 3 Tim London 36\ninsert 1 Bob Paris 20\nget 2\nget 9\ncity London\nage 36 40\ndelete 1\ndelete 1\ncity London\ncount\n" stdout="deleted 1\nno row 1\n3 Tim London 36\n(1 row)\n2 rows"
```

## Step 9 — The reviewer's tests

**This step: create the supplied `minidb/tests/db_review_test.cpp`, rebuild, and fix `db.cpp` if any test fails.**

The reviewer goes after the invariant: an insert that's rejected must leave the indexes untouched; an id that's erased and reused must appear only under its new city and age; an empty age range and near-miss city names must find nobody.

When these pass, you've built a small database engine, measured why it needs indexes, and chosen each index's container from what its queries need: the main lesson of this track, in one project.

```cpp file=minidb/tests/db_review_test.cpp provided
// The reviewer's tests for Database. Do not edit them: make them pass.
#include "studio_test.hpp"

#include <string>
#include <vector>

#include "db.h"

namespace {

std::vector<int> ids(const std::vector<Record>& rows)
{
    std::vector<int> out;
    for (const Record& r : rows)
        out.push_back(r.id);
    return out;
}

} // namespace

TEST(review_a_rejected_insert_leaves_the_indexes_alone)
{
    Database db;
    db.insert({1, "Ada", "London", 36});
    CHECK(!db.insert({1, "Ada again", "Paris", 50}));
    CHECK(db.in_city("Paris").empty());
    CHECK(db.aged(50, 50).empty());
    CHECK(ids(db.in_city("London")) == (std::vector<int>{1}));
}

TEST(review_erase_then_insert_the_same_id)
{
    Database db;
    db.insert({7, "Linus", "Helsinki", 30});
    CHECK(db.erase(7));
    CHECK(db.insert({7, "Linus", "Portland", 50}));
    CHECK(db.in_city("Helsinki").empty());
    CHECK(ids(db.in_city("Portland")) == (std::vector<int>{7}));
    CHECK(db.aged(30, 30).empty());
    CHECK(ids(db.aged(50, 50)) == (std::vector<int>{7}));
}

TEST(review_erase_from_an_empty_database)
{
    Database db;
    CHECK(!db.erase(1));
    CHECK_EQ(db.size(), 0u);
}

TEST(review_an_empty_age_range)
{
    Database db;
    db.insert({1, "Ada", "London", 36});
    CHECK(db.aged(40, 30).empty());   // lo > hi: nobody
}

TEST(review_city_names_are_exact)
{
    Database db;
    db.insert({1, "Ada", "London", 36});
    CHECK(db.in_city("london").empty());
    CHECK(db.in_city("London ").empty());
}
```

```check
file minidb/tests/db_review_test.cpp
run "cmake --build minidb/build"
tests "./minidb/build/db_tests" require="review_a_rejected_insert_leaves_the_indexes_alone review_erase_then_insert_the_same_id" -- Update the indexes only after rows_ has accepted the record.
```
