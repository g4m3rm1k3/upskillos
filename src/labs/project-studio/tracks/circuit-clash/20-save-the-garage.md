---
title: Transactions, validation, and persistent upgrades
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

A purchase is a state transition, and a save file is untrusted input. We will preserve an existing player file when it cannot be read rather than silently overwriting it with defaults.

## Make purchasing and equipping different operations

Properties with `{ get; set; }` expose readable and writable values that System.Text.Json can serialize. Initializers create a new garage with starting credits and an owned Handling package. A new List is constructed for each Garage instance; sharing one static list would incorrectly share purchases between players.

Select first rejects enum values outside the defined choices. If the package is already owned, it skips payment and equips it. Otherwise it requires sufficient credits before subtracting or adding ownership. The order prevents a failed purchase from leaving half a transaction applied. Selected changes only after acquisition is established.

Before running it later, specify these observations: buying Engine from 150 leaves zero and owns Engine; equipping Handling then Engine leaves zero; attempting Armor with zero returns false and keeps Engine selected. A test that checks only Selected would miss a double charge. This in-memory operation is synchronous in one thread; it is not a database transaction or a guarantee against concurrent purchases.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Core/Garage.cs`. Start or replace this file.

```csharp edit=Core/Garage.cs mode=replace
using System.Text.Json;
namespace CircuitClash;

public sealed class Garage
{
    public int Version { get; set; } = 1;
    public int Credits { get; set; } = 150;
    public List<Package> Owned { get; set; } = new() { Package.Handling };
    public Package Selected { get; set; } = Package.Handling;
    public bool Select(Package package)
    {
        if (!Enum.IsDefined(package)) return false;
        if (!Owned.Contains(package))
        {
            if (Credits < 150) return false;
            Credits -= 150; Owned.Add(package);
        }
        Selected = package; return true;
    }
```

## Validate the whole saved state

Syntactically valid JSON can still describe impossible game state. Valid requires the recognized version, bounded nonnegative credits, a non-null ownership list, the starting package, only defined package values, and ownership of the selected package. `&&` short-circuiting ensures later list operations do not run when Owned is null.

Load starts with an empty warning. A missing file means a first-time player and returns defaults without error. An existing file is read and deserialized into a nullable Garage. Only a non-null, valid result is accepted. Version is part of the schema contract: a future incompatible version must be migrated explicitly rather than guessed.

The catch filter handles expected file, permission, and JSON problems. It does not swallow every programming error. Returning a temporary garage keeps the session usable, while warning tells the application not to overwrite the original automatically. Error handling has two responsibilities here: explain the failure and protect existing data.

Type this fragment in `Core/Garage.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Garage.cs mode=append
    public bool Valid() => Version == 1 && Credits >= 0 && Credits <= 100000
        && Owned != null && Owned.Contains(Package.Handling)
        && Owned.All(p => Enum.IsDefined(p)) && Owned.Contains(Selected);
    public static Garage Load(string path, out string warning)
    {
        warning = "";
        if (!File.Exists(path)) return new Garage();
        try
        {
            Garage? garage = JsonSerializer.Deserialize<Garage>(File.ReadAllText(path));
            if (garage != null && garage.Valid()) return garage;
            warning = "Invalid save; using a temporary garage. Original file kept.";
        }
        catch (Exception error) when (error is IOException or JsonException or UnauthorizedAccessException)
        { warning = "Save could not be read; original file kept: " + error.Message; }
        return new Garage();
    }
```

## Write a replacement before switching the filename

GetDirectoryName may return null for a bare filename. We create the parent only when it exists as meaningful text. Saving writes complete JSON to a neighboring temporary path, then moves that file over the destination. If serialization or writing fails before the move, the existing destination is still intact.

A same-filesystem rename generally provides an atomic filename replacement, but this is not a universal promise of power-loss durability or multi-process coordination. We do not fsync directory metadata or lock concurrent writers. For this single-process local garage, the strategy improves recovery without pretending to be a database.

The caller must handle write failures and tell the user whether changes are only in memory. Success text must follow the completed save, not precede it. We will test both a valid round trip and preservation of malformed original content.

Type this fragment in `Core/Garage.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Garage.cs mode=append
    public void Save(string path)
    {
        string? directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
        string temporary = path + ".tmp";
        File.WriteAllText(temporary, JsonSerializer.Serialize(this));
        File.Move(temporary, path, true);
    }
}
```

## Validate learned data at its input boundary

A Policy will hold Dictionary<string,float[]> Values; its implementation is the next lesson, so Core cannot compile this reference until then. PolicyFile serializes that data and rejects a missing object, missing dictionary, missing row, a row with the wrong action count, or non-finite numbers. NaN and infinity can poison action comparisons even when a file parses.

Any with a predicate asks whether one invalid entry exists. Nested Any checks each numeric value. The explicit InvalidDataException says the file's meaning is wrong, distinct from malformed JSON syntax. Game can catch the error and fall back to scripted rivals.

This compact policy format has no migration envelope and assumes the declared Tactic order. Changing the state encoding or action order requires discarding/retraining this artifact or adding a versioned migration. Garage saves have stronger preservation requirements than disposable learned policies; we keep that difference explicit. Never load an arbitrary policy and infer competence from the word learned.

Type this fragment in `Core/Garage.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Garage.cs mode=append
public static class PolicyFile
{
    public static void Save(Policy policy, string path) =>
        File.WriteAllText(path, JsonSerializer.Serialize(policy));
    public static Policy Load(string path)
    {
        Policy? policy = JsonSerializer.Deserialize<Policy>(File.ReadAllText(path));
        if (policy == null || policy.Values == null || policy.Values.Any(p =>
            p.Value == null || p.Value.Length != 5 || p.Value.Any(v => !float.IsFinite(v))))
            throw new InvalidDataException("Policy must contain five finite values per state.");
        return policy;
    }
}
```

## Verify and explain the boundary

Review the failure paths before continuing: missing file, malformed JSON, unsupported garage version, invalid selected package, and denied write permission. Explain which return defaults, which preserve an existing file, and which throw to the caller. The next lesson supplies Policy, then Core and its earlier checks can build again.

