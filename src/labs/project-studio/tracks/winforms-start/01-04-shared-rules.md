---
title: 1.4 — Rules That Both Interfaces Can Reuse
runtime: none
reference: optional
support: Checks/Checks.csproj, Checks/Program.cs
---

If a button owns every rule, replacing that button with React means rewriting the rules. Put them in a **class library**: C# code that another project can call without displaying any interface. This lesson supplies a small test program, then asks you to add a rule test of your own. Continue after 1.3.

## Create a library project

Create this file. No `dotnet new` command is needed when you write the project description yourself.

```xml file=Core/Core.csproj
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

XML has opening and closing tags. `TargetFramework` chooses the .NET API set. With no executable OutputType, this project builds a library rather than starting a program. `ImplicitUsings` makes common names such as `Console` available; `Nullable` warns when code could use a missing object reference. Keep compiler warnings visible; do not disable the setting to conceal them.

## Give the data a namespace

A **namespace** groups related type names, somewhat like a Python module's naming role. `using FormDesk.Core;` in a caller will make those names available without typing their full prefix. It does not copy or run a file, and it does not add a project dependency by itself.

```csharp file=Core/RequestDraft.cs
namespace FormDesk.Core;

public class RequestDraft
{
    public string Name { get; set; } = "";
    public int Quantity { get; set; } = 1;
}
```

The semicolon namespace form applies to the rest of this file. This new type is deliberately separate from the practice class in Scratch. The future forms will reference Core.

## Write small pure rules

A **pure** rule returns an answer from its inputs without opening windows, reading files, or changing controls. A `static` method belongs to the type itself: call `RequestRules.Validate(...)` without constructing an object. A static class groups only such members. These are reusable rule functions, not global form state.

```csharp file=Core/RequestRules.cs
namespace FormDesk.Core;

public static class RequestRules
{
    public static string NameError(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "Enter a name.";
        }
        if (name.Trim().Length > 40)
        {
            return "Use 40 characters or fewer.";
        }
        return "";
    }

    public static string QuantityError(int quantity)
    {
        if (quantity < 1 || quantity > 100)
        {
            return "Use a quantity from 1 to 100.";
        }
        return "";
    }

    public static string Validate(string name, int quantity)
    {
        string error = NameError(name);
        if (error != "")
        {
            return error;
        }
        return QuantityError(quantity);
    }
}
```

The requirements are now explicit: a nonblank name of at most 40 characters **after trimming outside whitespace**, and an integer quantity from 1 to 100. `Trim()` returns text with whitespace removed from its ends; it does not change the original string. `IsNullOrWhiteSpace` covers missing, empty and whitespace-only text. `Validate` returns the first error, checking the name before the quantity. Individual field methods let the later UI show both errors at once.

```predict
question: With a blank name and quantity zero, which error does Validate return first?
choice: Enter a name.
choice: Use a quantity from 1 to 100.
answer: Enter a name.
explain: Validate returns immediately when NameError finds a problem, before calling QuantityError.
```

## Run the supplied behavioral checks

Create this provided note. Its button also creates the two support files listed for this lesson. The `Checks` project references `Core` with an XML `ProjectReference`: that is the build dependency which `using` alone cannot supply.

```text file=checks-guide.txt provided
Run from the form-desk root: dotnet run --project Checks
Read each assertion as input -> expected result. A mismatch throws and exits nonzero.
```

Open `Checks/Program.cs`. It defines an `Expect` method which throws an `Exception` when actual and expected differ. `throw` stops normal execution and reports a failure; we will handle expected file failures with `try/catch` later. Each assertion calls your actual rule, not a copy of it. The checks use no external test package.

Run `dotnet run --project Checks`. Expect `rules: passed`. Temporarily change `quantity > 100` to `quantity >= 100` in Core. The assertion for 100 must fail. Restore `>` and rerun. Describe why a check of only quantity 3 would miss this defect.

```check
run "dotnet run --project Checks" stdout="rules: passed" timeout=120 os=windows label="Shared rules handle empty text and numeric boundaries" -- Inspect the first failed assertion and repair the rule, not the expected result.
```

These checks verify the listed name cases, the numeric boundaries and first-error order. They do not verify UI wiring or Unicode text-length policy. Here "characters" follows C# string.Length (UTF-16 units); we use ordinary ASCII names in the exercises.

## Your turn: protect the name-length boundary

Add two assertions to `Checks/Program.cs`, **before** its success message. A name of exactly 40 `x` characters should pass; 41 should return `Use 40 characters or fewer.`. Keep the other assertions. C#'s `new string('x', 40)` constructs repeated characters; single quotes represent one `char`, while double quotes represent a string.

Use assertion labels `name-40` and `name-41` so a failed run points to the right case. Run your tests against a temporary `>= 40` bug, observe a failure, and restore the valid rule. Design a whitespace-padded length case yourself and record what it teaches.

```hints
nudge: A maximum has an allowed endpoint and an immediately rejected neighbor, just like the quantity interval.
concept: Expect receives actual result, expected result, and a label. Call NameError with each constructed string.
shape: Add one empty-error assertion for 40 and one message assertion for 41 before printing success.
```

```check
run "dotnet run --project Checks" stdout="rules: passed" os=windows label="All rule assertions still pass" -- Run the tests and fix any boundary regression.
contains Checks/Program.cs "\"name-40\"" label="The allowed boundary has a named assertion" -- Add an actual Expect call, not just a comment.
contains Checks/Program.cs "\"name-41\"" label="The rejected neighbor has a named assertion" -- Give the second assertion its own label.
```

The label checks establish only that text exists; they cannot prove those assertions execute or have the right expectations. Your deliberate mutation and observed failure establish whether the tests actually catch the boundary error. Keep that evidence alongside your explanation.
