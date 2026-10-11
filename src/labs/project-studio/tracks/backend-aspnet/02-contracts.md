---
title: 2 — Types describe different kinds of data
track: Backend Developer Bootcamp — ASP.NET Core — Stock Reservations
trackOrder: 51.03
runtime: none
---

Outcome: separate request contracts, domain rules and public responses. A database entity is not automatically a safe API representation.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Express the contracts

A `record` is a concise data type with value-oriented equality. `sealed` forbids inheritance where no extension contract is intended. The request's Range attribute supports HTTP model validation; the domain guard still protects non-HTTP callers. Validation belongs at every independently reachable boundary, with a shared policy where practical.

The response excludes owner and internal stock state. `string?` in later files means a reference may be null; the controller must handle that case. An exception represents an unsuccessful operation, not an HTTP status until the adapter maps it.

```csharp file=Stock.Api/Contracts.cs
using System.ComponentModel.DataAnnotations;
namespace Stock.Api;
public sealed record ReserveRequest([Range(1, 10)] int Quantity);
public sealed record Reservation(string Id, int Quantity);
public sealed class OutOfStockException : Exception;
public static class ReservationRules
{
    public static void Validate(int quantity)
    {
        if (quantity is < 1 or > 10) throw new ArgumentOutOfRangeException(nameof(quantity));
    }
}
```


```predict
question: Does an int type guarantee a valid stock quantity?
choice: No
choice: Yes
answer: No
explain: The type admits zero and negative values; policy is narrower.
```

## Trace responsibility

The client supplies a quantity, the verified principal supplies ownership, the server creates the reservation id, and the database arbitrates available stock. This split prevents both mass assignment and disagreement between clients. An identifier is a locator, not authorization.

A DTO can stay stable while storage changes. Conversely, changing public field names or numeric meaning can break clients even when a migration succeeds. Track API compatibility separately from database compatibility.

## Your turn: add a policy without HTTP

Define a per-request limit supplied by policy rather than copying a magic number into several callers. Write boundary tests for negative, zero, exactly the limit and one above it. Explain what must change in both validation metadata and the database if the allowed range changes.

Write your evidence in `evidence/contracts.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/contracts.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

Explain the difference between a compiler checking int and the business rule that int must be positive. Use a negative quantity to demonstrate the gap.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
