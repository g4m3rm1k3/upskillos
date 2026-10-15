---
title: Design Documents and Relationships
track: MEAN — Database Design
runtime: none
---

Outcome: choose embedding or references from access patterns, then defend an invariant and a growth bound. An entity has identity, such as a project. A relationship connects entities. An invariant is a rule that must remain true after every accepted write.

### The story so far

Continue in the same task-board folder after Requirements and Node. We have a tested title rule but no database. Now decide what must be stored before writing routes.

## Start with reads and writes

A schema describes the shape and meaning of stored data. Begin with questions the app must answer, not the shape of a screen. Cardinality means how many records can be related: one project has many tasks. Tasks grow independently, so we store them in their own collection. A collection contains documents: records with typed fields.

```markdown file=design.md
# Task Board data contract

## Access patterns
- Find a project by its unique slug.
- Create a task in an existing project.
- List a project's tasks in _id order, at most 20 at a time.
- Change status only if the stored version matches the reader's version.

## Projects (one) → tasks (many)
projects: { _id: ObjectId, slug: string, name: string, schemaVersion: 1 }
tasks: { _id: ObjectId, projectId: ObjectId, title: string,
         status: "open" | "done", version: integer, schemaVersion: 1 }

## Ownership and bounds
The server owns ids, projectId, initial status, version and schemaVersion.
Titles have 1–100 characters; pages have at most 20 results.
Tasks reference projects. Do not append every task to a project.tasks array.
Project deletion is absent: adding it requires an orphan policy.

## Constraints and indexes
projects.slug: unique; tasks.projectId + tasks._id: compound index.
The API verifies project existence; MongoDB supplies no foreign key here.
An update matches _id + projectId + version, then increments version atomically.
```

## Compare two models

```predict
question: If every task is appended to project.tasks, which resource grows without a bound?
explain: The project document grows with every task. A separate collection bounds each task document and supports pagination without loading the entire project.
```

Embedding places related values inside one document. A small fixed address is a candidate; an ever-growing history is not. A reference stores another document's identifier and may require another query. Relational normalization would also separate projects and tasks to avoid repeating a project's name. MongoDB does not eliminate that reasoning: every duplicated name creates an update obligation.

The _id field identifies a document. ObjectId is a BSON type, not a JSON string. BSON is MongoDB's typed storage representation. Our API converts ids to strings for JSON and back for queries. schemaVersion identifies the layout; version identifies an edit revision. They solve different problems.

## Your turn: model tradeoffs

Design comments and a fixed-size checklist. For each, choose embedding or references, state a maximum size, describe the queries and decide what deletion means. Explain how renaming a project affects your model. Give an example where your original choice becomes expensive.

Record your model, example, explanation and an independently designed counterexample in evidence/model.txt. This file check is a submission gate only.

```hints
nudge: Ask whether the child data can keep growing after its parent is created.
concept: Data read and changed together may fit one document; unbounded independent data often needs references.
shape: Compare a bounded checklist with thousands of comments, then trace the reads and writes for each.
```

```check
file design.md
file evidence/model.txt
```

## Diagnose, explain and review

Draw a task pointing to a missing project. This is an orphan: an index cannot reject it. Our API checks project existence and provides no deletion route. A future deletion route needs a policy and a race analysis. Describe either restricted deletion or a transaction, and identify every operation that must participate. A transaction groups operations that succeed or fail together; it is not a replacement for deciding what deletion should mean.

Review the model manually. A file check cannot establish sound design. Compare your choices with [MongoDB's embedding guidance](https://www.mongodb.com/docs/manual/data-modeling/embedding/).
