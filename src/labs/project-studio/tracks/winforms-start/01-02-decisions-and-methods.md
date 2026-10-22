---
title: 1.2 — Decisions, Methods and Bad Input
runtime: none
reference: optional
---

A quantity is not useful merely because it is a whole number. FormDesk will accept quantities from **1 through 100, including both endpoints**. Learn that rule in a console before connecting it to a button. Continue in the same folder after 1.1.

## Return an explanation

A method groups work under a name, like a Python function. Its parameters are its inputs and `return` sends its result back. Read this replacement for `Scratch/Program.cs` before typing it:

```csharp file=Scratch/Program.cs
string QuantityError(int quantity)
{
    if (quantity < 1 || quantity > 100)
    {
        return "Use a quantity from 1 to 100.";
    }
    return "";
}

Console.WriteLine(QuantityError(0));
Console.WriteLine(QuantityError(1) == "" ? "accepted" : "rejected");
```

`string` before the method's name is its return type; `int quantity` is a typed parameter. Braces delimit a block where Python uses indentation. `<` and `>` compare values; `||` means Python's `or`. Only one comparison has to be true to reject a quantity. `""` is an empty string, our convention for "no error". `==` compares, whereas `=` assigns. The expression `condition ? a : b` chooses `a` if true, otherwise `b`; it resembles Python's `a if condition else b`. This local method belongs to the entry-point code; a reusable public method comes later.

Run `dotnet run --project Scratch`. Expect an error message followed by `accepted`.

```predict
question: What happens to quantity 100 under these comparisons?
choice: accepted
choice: rejected
answer: accepted
explain: 100 is neither less than 1 nor greater than 100. Equality is allowed at both endpoints.
```

```check
run "dotnet run --project Scratch" stdout="Use a quantity from 1 to 100." os=windows label="Zero produces an explanation" -- Use less than 1 OR greater than 100.
```

Temporarily change `||` to `&&` (Python's `and`). Run: zero no longer produces the message. No number can simultaneously be below 1 and above 100. Restore `||`. Explain why the compiler accepted this incorrect program.

## Parse text without crashing

Form controls and command-line arguments often start as text. Replace the entry-point calls, keeping the same method above them:

```csharp file=Scratch/Program.cs
string QuantityError(int quantity)
{
    if (quantity < 1 || quantity > 100)
    {
        return "Use a quantity from 1 to 100.";
    }
    return "";
}

if (args.Length != 1)
{
    Console.WriteLine("Enter one whole-number argument.");
    return;
}
if (!int.TryParse(args[0], out int quantity))
{
    Console.WriteLine("Enter a whole number.");
    return;
}
string error = QuantityError(quantity);
Console.WriteLine(error == "" ? "accepted" : error);
```

`args` is an array of command-line arguments, indexed from zero like a Python list; `Length` gives its size. `!=` means not equal. `!` negates a Boolean, like `not`. `TryParse` returns true/false and writes its parsed integer into the `out` variable. A failed parse takes the early `return`, so we never treat its default zero as valid input. Parsing asks "is this a whole number?"; validation asks "is that number allowed?" They are different questions.

Run `dotnet run --project Scratch -- 5`, then repeat with `abc`, `2.5`, `0` and no argument. The `--` separates dotnet's options from your program's arguments. A decimal quantity is intentionally invalid; we are counting items, not measuring a length.

```check
run "dotnet run --project Scratch -- abc" stdout="Enter a whole number." os=windows label="Text is rejected without an exception" -- TryParse must be checked before the quantity rule.
run "dotnet run --project Scratch -- 100" stdout="accepted" os=windows label="The upper endpoint is accepted" -- Greater than 100 is invalid; equal to 100 is allowed.
```

## Your turn: check both sides of a boundary

In `Practice/Program.cs`, write a method `QuantityError(int quantity)` and print its results for `-1`, `1`, `100` and `101` on four separate lines. Print `accepted` when the method returns no error. Use exactly the same error message as the worked example. Keep the rule in the method so the callers do not repeat comparisons. Design one extra case yourself, run it, then remove that extra output before checking.

```hints
nudge: Choose inputs immediately outside and on the accepted interval.
concept: Each caller asks the same method; a valid result is the empty string.
shape: Store each returned error and choose between accepted and that error when printing.
```

```check
run "dotnet run --project Practice" stdout="Use a quantity from 1 to 100.\naccepted\naccepted\nUse a quantity from 1 to 100." os=windows label="Your method handles both endpoints and both invalid sides" -- Print four lines in the requested order.
```

The checks verify the named inputs, not the general correctness of every method. Your extra case and explanation of the `&&` failure provide additional evidence. No graphical interface has been built yet.
