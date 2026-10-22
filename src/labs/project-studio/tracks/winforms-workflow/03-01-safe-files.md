---
title: 3.1 — Save Data and Validate It Again When Opening
track: WinForms to React — Save, Open and Recover
trackOrder: 47.02
runtime: none
reference: optional
support: FileChecks/FileChecks.csproj, FileChecks/Program.cs
---

Your form can validate a request, but closing it loses the data. Save a **draft** in a JSON file, then recover it without trusting the file to be valid. Continue after the Windows Forms chapter, in the same FormDesk folder. This lesson first tests file behavior without opening a window; the next connects it to dialogs.

## Save a valid snapshot

**JSON** is a text format for named values. Our file will look like `{"Name":"Fixture","Quantity":3}`. Strings use quotes; the quantity is a JSON number. A **serializer** turns a C# object into JSON; a parser reads JSON text. JSON is data, not C# instructions.

Create a helper in Core. `using System.Text.Json;` makes the .NET JSON types available; no NuGet package is needed. `File` is .NET's file API. Its path argument comes from the caller; the helper has no knowledge of a window or a dialog.

```csharp file=Core/DraftFiles.cs
using System.Text.Json;

namespace FormDesk.Core;

public static class DraftFiles
{
    public static void Save(string path, RequestDraft draft)
    {
        string error = RequestRules.Validate(draft.Name, draft.Quantity);
        if (error != "")
        {
            throw new InvalidDataException(error);
        }
        RequestDraft snapshot = new RequestDraft();
        snapshot.Name = draft.Name.Trim();
        snapshot.Quantity = draft.Quantity;
        string json = JsonSerializer.Serialize(snapshot);
        File.WriteAllText(path, json);
    }
}
```

`void` means the method returns no value. A successful write finishes; a failed operation throws an **exception**, an object describing a failure. `InvalidDataException` means the draft violates our rules. Disk failures can throw other exceptions. The next lesson catches these to tell the user what happened.

`snapshot` is a separate object: trimming the saved name does not secretly change what the user typed. Validation runs **before** writing, so invalid data cannot overwrite a good file. This simple teaching version writes a small file synchronously. It does not promise crash-atomic writes or multi-user storage; those are later engineering extensions.

## Parse before replacing anything

Replace the helper with this version, adding Load below Save. Read the guard conditions in order before typing them.

```csharp file=Core/DraftFiles.cs
using System.Text.Json;

namespace FormDesk.Core;

public static class DraftFiles
{
    public static void Save(string path, RequestDraft draft)
    {
        string error = RequestRules.Validate(draft.Name, draft.Quantity);
        if (error != "")
        {
            throw new InvalidDataException(error);
        }
        RequestDraft snapshot = new RequestDraft();
        snapshot.Name = draft.Name.Trim();
        snapshot.Quantity = draft.Quantity;
        string json = JsonSerializer.Serialize(snapshot);
        File.WriteAllText(path, json);
    }

    public static RequestDraft Load(string path)
    {
        string json = File.ReadAllText(path);
        using JsonDocument document = JsonDocument.Parse(json);
        JsonElement root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object ||
            !root.TryGetProperty("Name", out JsonElement nameValue) ||
            nameValue.ValueKind != JsonValueKind.String ||
            !root.TryGetProperty("Quantity", out JsonElement quantityValue) ||
            quantityValue.ValueKind != JsonValueKind.Number ||
            !quantityValue.TryGetInt32(out int quantity))
        {
            throw new InvalidDataException("Expected a text Name and whole-number Quantity.");
        }
        string name = nameValue.GetString() ?? "";
        string error = RequestRules.Validate(name, quantity);
        if (error != "")
        {
            throw new InvalidDataException(error);
        }
        RequestDraft draft = new RequestDraft();
        draft.Name = name.Trim();
        draft.Quantity = quantity;
        return draft;
    }
}
```

`JsonDocument` represents parsed JSON; its `RootElement` is the outer value. `JsonElement` describes one value and `ValueKind` says whether it is an object, string, number, and so on. The `using` declaration here has a different job from a namespace import: it **disposes** the document's resources when the method exits, including on an exception.

`TryGetProperty` checks a named value exists. JSON property names are case sensitive. The Number ValueKind guard rejects text such as `"3"` before `TryGetInt32` asks whether the number is a whole number within an int's range. Calling TryGetInt32 on a string would throw a type exception. `||` stops evaluating once a condition is true: a non-object is rejected before we try to read its properties. `?? ""` supplies an empty string when GetString returns null. Then the familiar C# rules check the values. Extra JSON properties are ignored in this small format; the two required fields must exist and have the expected types.

```predict
question: Is {"Name":"Fixture","Quantity":"3"} accepted?
choice: No, Quantity is text
choice: Yes, it looks numeric
answer: No, Quantity is text
explain: JSON strings and JSON numbers are distinct. TryGetInt32 does not parse a string value into an integer.
```

## Observe real files and expected failures

Create the provided note; its button also creates FileChecks. Open `FileChecks/Program.cs`. It calls Save and Load in a temporary directory, tests a round trip, then feeds missing fields, nulls, bad types, malformed JSON and invalid business values to Load.

```text file=file-checks-guide.txt provided
Run dotnet run --project FileChecks from the form-desk root.
The program writes only inside a temporary test folder and removes that folder afterward.
```

`try` surrounds work that can fail; `catch` handles a specified exception type. In a test, catching a deliberately triggered failure proves rejection. If no failure occurs, the test throws. `finally` runs cleanup on success or failure. Read the first test before reading all the supplied cases; this is testing infrastructure you may inspect rather than memorize.

Run `dotnet run --project FileChecks`. Expect `files: passed`. For a diagnostic experiment, temporarily change `RequestRules.Validate(name, quantity)` in **Load** to `""`. Run again: the outside-range test must fail. Restore the call and rerun. Parsing valid JSON did not make the values valid.

```check
run "dotnet run --project FileChecks" stdout="files: passed" timeout=120 os=windows label="Round trips and invalid files exercise the actual helper" -- Read the first failed assertion; retain validation before returning a loaded draft.
```

The checks establish the listed file cases and that invalid Save does not overwrite a good file. They do not prove permission dialogs, power-loss recovery, encoding interoperability, or large-file responsiveness. Manually inspect one saved file and open a copy with a misspelled property name.

## Your turn: a valid file can still be an invalid request

Add a rejection case to FileChecks before `files: passed`. Use the label `blank-file-name` and a JSON Name containing three spaces with Quantity 3. Also add a valid padded-name case and assert that loading trims it. Do not weaken the other tests. Design one additional file case yourself and explain whether its problem is JSON syntax, value type, or a business rule.

```hints
nudge: The supplied Reject helper already writes JSON into the test file and expects Load to fail.
concept: Whitespace-only text has the right JSON type but violates NameError. Trimming must happen only after validation.
shape: Add Reject with your new label, then write a valid padded-name JSON file, Load it, and compare the Name.
```

```check
run "dotnet run --project FileChecks" stdout="files: passed" os=windows label="The expanded file suite passes" -- Add the new cases before the success message.
contains FileChecks/Program.cs "\"blank-file-name\"" label="Your new case has an identifiable label" -- Use this label on the rejection case so its failure is recognizable.
```

The label check only finds source text. Temporarily bypass NameError in Load and verify your new case fails; then restore it. Keep the observed failure, explanation and additional case as your independent evidence.
