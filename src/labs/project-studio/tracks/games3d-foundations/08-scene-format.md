---
title: Serialize a versioned scene and validate before accepting it
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

A mistaken edit can be undone, but restarting still loses the scene. Design an explicit file format before adding Open and Save. Follow the earlier scene/history lessons; the bot experiment can remain a separate executable.


By the end, you should be able to: Reject a document containing a late invalid object without losing valid active data.

## Define the compatibility and identity contract

Version 1 stores an ordered list of object IDs, names and X/Y/Z coordinates. It does not store selection, undo history or a learned Q-table. Those have different lifetimes and compatibility needs. Preserve IDs on load: calling Add for every loaded object would generate new identities. Reject unknown versions rather than guessing. Empty scenes are valid; missing lists, duplicate/empty IDs, blank/long names and nonfinite coordinates are invalid.

```predict
question: Should loading a saved object call Scene.Add and get a new ID?
choice: No, preserve the saved identity
choice: Yes, a fresh session needs fresh IDs
answer: No, preserve the saved identity
explain: References identify objects by ID, not by labels or position. Loading creates fresh storage while preserving the identities represented in it.
```

## Separate file representation from the live model

Create Core/SceneCodec.cs. A codec encodes data into text and decodes text into data. The two file records describe the wire format, including nullable fields because external data can omit values. They are not our editable scene objects. Scalar coordinates avoid relying on how a serializer handles Vector3 fields. JsonSerializer.`Serialize<T>` and `Deserialize<T>` are generic operations: T names the data shape. Deserialize may return null, hence the null-coalescing throw.

```csharp edit=Core/SceneCodec.cs mode=replace
using System.Numerics;
using System.Text.Json;

namespace Studio3D;

public sealed record ObjectFile(Guid Id, string? Name, float X, float Y, float Z);
public sealed record SceneFile(int Version, ObjectFile[]? Objects);

public static class SceneCodec
{
    public const int MaxCharacters = 65536;
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true, MaxDepth = 8 };

    public static string Encode(Scene scene)
    {
        List<ObjectFile> items = new();
        foreach (SceneObject item in scene.Objects)
            items.Add(new ObjectFile(item.Id, item.Name, item.Position.X, item.Position.Y, item.Position.Z));
        string json = JsonSerializer.Serialize(new SceneFile(1, items.ToArray()), Options);
        Decode(json);
        return json;
    }

    public static Scene Decode(string json)
    {
        if (json.Length > MaxCharacters) throw new InvalidDataException("Scene text is too large.");
        SceneFile data = JsonSerializer.Deserialize<SceneFile>(json, Options)
            ?? throw new InvalidDataException("Scene document is missing.");
        if (data.Version != 1) throw new InvalidDataException("Unsupported scene version.");
        if (data.Objects is null || data.Objects.Length > 1000) throw new InvalidDataException("Invalid object list.");
        HashSet<Guid> ids = new();
        List<SceneObject> validated = new();
        foreach (ObjectFile? item in data.Objects)
        {
            if (item is null || item.Id == Guid.Empty || !ids.Add(item.Id) || string.IsNullOrWhiteSpace(item.Name) || item.Name.Length > 80)
                throw new InvalidDataException("Invalid object identity or name.");
            Vector3 position = new(item.X, item.Y, item.Z);
            if (!Scene.IsFinite(position)) throw new InvalidDataException("Invalid position.");
            validated.Add(new SceneObject(item.Id, item.Name, position));
        }
        Scene scene = new();
        scene.Restore(validated.ToArray());
        return scene;
    }
}
```

The `HashSet<Guid>` checks membership while adding IDs. Unlike a list, it is chosen for efficient duplicate detection, not ordering; the validated List preserves file order. foreach visits records, validates them and builds a candidate. Only after the entire document passes do we construct a scene. Encode also decodes its own output to enforce the same limits before writing anything.

This version allows missing numeric coordinates to become zero and ignores unknown fields within version 1. That is an explicit compatibility policy, not strict schema validation. Version mismatches still fail. MaxDepth and a text-length cap bound parsing work for this small course format; file-byte limits belong in the storage boundary. JSON syntax errors are JsonException; domain validation errors are InvalidDataException. Do not catch everything as success.

[System.Text.Json documentation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/overview) explains the built-in serializer; no new package is needed.

## Test round trips and rejected documents

Create Checks/PersistenceChecks.cs. A round trip must preserve values, IDs and ordering while allocating an independent scene. Duplicate labels are valid; duplicate IDs are not. The local Rejects function accepts only the two expected validation failures. An unexpected programming exception should fail the checks.

```csharp edit=Checks/PersistenceChecks.cs mode=replace
using System.Numerics;
using System.Text.Json;
using Studio3D;

public static class PersistenceChecks
{
    public static void Run(Action<bool, string> check)
    {
        Scene scene = new();
        Guid first = scene.Add("Twin", new Vector3(1.25f, 2, -3));
        Guid second = scene.Add("Twin", Vector3.Zero);
        string json = SceneCodec.Encode(scene);
        Scene copy = SceneCodec.Decode(json);
        check(copy.Objects.Count == 2 && copy.Objects[0] == scene.Objects[0] && copy.Objects[1].Id == second, "Round trip lost identity order or position");
        copy.TryMove(first, Vector3.UnitX);
        check(scene.Objects[0].Position.X == 1.25f, "Loaded scene shares mutable list");
        check(SceneCodec.Decode(SceneCodec.Encode(new Scene())).Objects.Count == 0, "Empty round trip failed");
        bool Rejects(string text)
        {
            try { SceneCodec.Decode(text); return false; }
            catch (InvalidDataException) { return true; }
            catch (JsonException) { return true; }
        }
        check(Rejects(json.Replace("\"Version\": 1", "\"Version\": 2")), "Future version accepted");
        check(Rejects(json.Replace(second.ToString(), first.ToString())), "Duplicate IDs accepted");
        check(Rejects(json.Replace(first.ToString(), Guid.Empty.ToString())), "Empty ID accepted");
        check(Rejects("null") && Rejects("{") && Rejects("{}"), "Malformed scene accepted");
        check(Rejects(new string(' ', SceneCodec.MaxCharacters + 1)), "Oversized scene accepted");
        Console.WriteLine("PERSISTENCE CHECKS PASSED");
    }
}
```

## Run the format checks and break compatibility

Append the invocation. Require the label. Temporarily allow every Version in Decode; require Future version accepted, then restore the check. Inspect a serialized document and identify the fields. These checks verify selected format contracts, not disk replacement or editor error reporting.

```csharp edit=Checks/Program.cs mode=append
PersistenceChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="PERSISTENCE CHECKS PASSED" timeout=120
```

## Independent task: reject a late invalid object

Create a practice document with one valid object followed by an object with a blank name. Require rejection. Add cases for a name beyond the limit and a missing Objects list. Explain why validating after replacing the active scene would lose valid work. Keep version 1 unchanged rather than silently altering its meaning.

```hints
nudge: Start from Encode output, then alter just the second object's name.
concept: Validating a candidate separately makes failure leave current state intact. Round-trip tests alone exercise valid input and cannot establish rejection.
shape: Pass the changed text to Decode, catch only the documented validation exceptions, and assert that your original Scene still has both original records. Add an independently chosen boundary case.
```

### Explain and transfer

Show a valid round trip and a rejected document you designed, identifying the field and validation responsible. Explain why preserving IDs differs from preserving the same in-memory collection. What failure would a successful round trip alone fail to reveal?

Keep a brief record of your prediction, actual result, explanation and independently chosen change. Try the explanation with the reference closed; reopen it or use hints when needed, then retry the part you could not explain. A green guided check establishes its named behavior, not independent understanding.
