---
title: Save box dimensions and migrate the first scene format
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Your tile and trunk now survive selection and Undo. Restarting must preserve them too. Evolve the saved format before building reusable props, so the first authored assets have a complete edit/save/reopen path.

By the end, you can save differently sized boxes, reopen them with identities intact, load an earlier unit-cube scene and reject invalid new dimensions without losing active work. Prerequisites: per-object box editing and the earlier scene codec/storage lessons. Use a practice scene; keep a copy of your version 1 file to examine migration.

## Specify the two supported versions

Version 1 describes unit cubes with IDs, names and positions. Version 2 adds a Box object with Width, Height and Depth. New saves always write version 2. Loading version 1 explicitly supplies a unit box and preserves IDs. Version 2 requires dimensions; missing, zero, negative, nonfinite or oversized values fail. Unknown versions still fail.

```predict
question: An old version 1 scene has no dimensions. What should loading it do?
choice: Preserve IDs and positions and supply unit-box dimensions
choice: Reject it or generate replacement IDs
answer: Preserve IDs and positions and supply unit-box dimensions
explain: Migration supplies the new field according to the older format's unit-cube meaning. It changes the in-memory representation without changing object identity.
```

## Encode the new contract and migrate the old one

Replace Core/SceneCodec.cs. BoxFile is the file representation; BoxRecipe is the validated domain value. The optional Box argument keeps old file-record construction readable, but does not make dimensions optional in version 2. Check the document version before assigning its meaning.

```csharp edit=Core/SceneCodec.cs mode=replace
using System.Numerics;
using System.Text.Json;

namespace Studio3D;

public sealed record BoxFile(float Width, float Height, float Depth);
public sealed record ObjectFile(Guid Id, string? Name, float X, float Y, float Z, BoxFile? Box = null);
public sealed record SceneFile(int Version, ObjectFile[]? Objects);

public static class SceneCodec
{
    public const int MaxCharacters = 65536;
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true, MaxDepth = 8 };

    public static string Encode(Scene scene)
    {
        List<ObjectFile> items = new();
        foreach (SceneObject item in scene.Objects)
        {
            Vector3 size = item.Box.Size;
            items.Add(new ObjectFile(item.Id, item.Name, item.Position.X, item.Position.Y, item.Position.Z,
                new BoxFile(size.X, size.Y, size.Z)));
        }
        string json = JsonSerializer.Serialize(new SceneFile(2, items.ToArray()), Options);
        Decode(json);
        return json;
    }

    public static Scene Decode(string json)
    {
        if (json.Length > MaxCharacters) throw new InvalidDataException("Scene text is too large.");
        SceneFile data = JsonSerializer.Deserialize<SceneFile>(json, Options)
            ?? throw new InvalidDataException("Scene document is missing.");
        if (data.Version != 1 && data.Version != 2) throw new InvalidDataException("Unsupported scene version.");
        if (data.Objects is null || data.Objects.Length > 1000) throw new InvalidDataException("Invalid object list.");
        HashSet<Guid> ids = new();
        List<SceneObject> validated = new();
        foreach (ObjectFile? item in data.Objects)
        {
            if (item is null || item.Id == Guid.Empty || !ids.Add(item.Id) || string.IsNullOrWhiteSpace(item.Name) || item.Name.Length > 80)
                throw new InvalidDataException("Invalid object identity or name.");
            Vector3 position = new(item.X, item.Y, item.Z);
            if (!Scene.IsFinite(position)) throw new InvalidDataException("Invalid position.");
            BoxRecipe box = new(Vector3.One);
            if (data.Version == 2)
            {
                if (item.Box is null) throw new InvalidDataException("Version 2 needs box dimensions.");
                try { box = new BoxRecipe(new Vector3(item.Box.Width, item.Box.Height, item.Box.Depth)); }
                catch (ArgumentOutOfRangeException error) { throw new InvalidDataException("Invalid box dimensions.", error); }
            }
            validated.Add(new SceneObject(item.Id, item.Name, position) { Box = box });
        }
        Scene scene = new();
        scene.Restore(validated.ToArray());
        return scene;
    }
}
```

Inside the version 2 branch, the recipe constructor performs the same dimension validation used by editing. Translate its expected ArgumentOutOfRangeException into InvalidDataException because the user is opening invalid file data. FileControls already reports this exception and leaves the editor intact. The inner exception preserves diagnostic context. Do not translate unrelated programming failures.

All records are validated before returning a candidate. Version 1 keeps its documented unit-cube meaning and ignores any Box field as an unknown extension. Version 2 rejects missing Box; missing numeric dimensions deserialize to zero and fail validation. Existing coordinate defaults, unknown-field policy and text/depth limits remain. Larger records reach the text limit sooner; an object-count limit alone is not the total size budget.

## Update the future-version regression deliberately

Replace Checks/PersistenceChecks.cs. Its future-version example must now change 2 to 3. If it still replaces 1 with 2, it either changes nothing or tests a supported version. Evolving a contract requires evolving the assertion that describes unsupported data, while retaining the earlier identity and rejection checks.

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
        check(Rejects(json.Replace("\"Version\": 2", "\"Version\": 3")), "Future version accepted");
        check(Rejects(json.Replace(second.ToString(), first.ToString())), "Duplicate IDs accepted");
        check(Rejects(json.Replace(first.ToString(), Guid.Empty.ToString())), "Empty ID accepted");
        check(Rejects("null") && Rejects("{") && Rejects("{}"), "Malformed scene accepted");
        check(Rejects(new string(' ', SceneCodec.MaxCharacters + 1)), "Oversized scene accepted");
        Console.WriteLine("PERSISTENCE CHECKS PASSED");
    }
}

```

## Check migration, round trips and failure safety

Create Checks/BoxStorageChecks.cs. SequenceEqual compares every record in order, including its Box recipe. A round trip alone cannot detect accepting an invalid file; test both paths. The disk example saves a practice scene, changes it and reopens it through the same store used by the app.

```csharp edit=Checks/BoxStorageChecks.cs mode=replace
using System.Numerics;
using System.Text.Json;
using Studio3D;

public static class BoxStorageChecks
{
    public static void Run(Action<bool, string> check)
    {
        Scene scene = new();
        Guid tileId = scene.Add("Tile", new Vector3(0, 0.125f, 0));
        Guid trunkId = scene.Add("Trunk", new Vector3(2, 1, 0));
        EditorSession editor = new(scene);
        BoxRecipe tile = new(new Vector3(2, 0.25f, 2));
        editor.TrySetSelectedBox(tile);
        editor.TrySelect(trunkId);
        editor.TrySetSelectedBox(new BoxRecipe(new Vector3(0.5f, 2, 0.5f)));
        string json = SceneCodec.Encode(scene);
        Scene loaded = SceneCodec.Decode(json);
        check(loaded.Objects.SequenceEqual(scene.Objects), "Box round trip lost data");
        loaded.TrySetBox(tileId, new BoxRecipe(new Vector3(3, 0.25f, 2)));
        check(scene.Objects[0].Box == tile, "Loaded box edit mutated source");
        string legacy = JsonSerializer.Serialize(new SceneFile(1, new[] {
            new ObjectFile(tileId, "Old cube", 0, 0.5f, 0) }));
        Scene migrated = SceneCodec.Decode(legacy);
        check(migrated.Objects[0].Id == tileId && migrated.Objects[0].Box.Size == Vector3.One,
            "Legacy cube migration lost identity or unit dimensions");
        check(JsonSerializer.Deserialize<SceneFile>(SceneCodec.Encode(migrated))!.Version == 2,
            "Migrated scene did not save as version 2");
        bool Rejects(string text)
        {
            try { SceneCodec.Decode(text); return false; }
            catch (InvalidDataException) { return true; }
            catch (JsonException) { return true; }
        }
        string MissingBox() => JsonSerializer.Serialize(new SceneFile(2, new[] {
            new ObjectFile(tileId, "Missing", 0, 0, 0) }));
        check(Rejects(MissingBox()), "Missing version 2 dimensions accepted");
        foreach (float width in new[] { 0f, -1f, 101f })
        {
            string bad = JsonSerializer.Serialize(new SceneFile(2, new[] {
                new ObjectFile(tileId, "Tile", 0, 0, 0, new BoxFile(2, 0.25f, 2)),
                new ObjectFile(trunkId, "Broken", 2, 1, 0, new BoxFile(width, 2, 0.5f)) }));
            check(Rejects(bad), "Invalid saved box dimensions accepted");
        }
        editor.TryUndo();
        SceneObject[] before = scene.Objects.ToArray();
        int redo = editor.RedoCount;
        bool rejected = false;
        try { editor.ReplaceScene(SceneCodec.Decode(MissingBox())); }
        catch (InvalidDataException) { rejected = true; }
        check(rejected && scene.Objects.SequenceEqual(before) && editor.RedoCount == redo,
            "Failed box open changed active scene or redo");
        string directory = Path.Combine(Path.GetTempPath(), "studio-box-store-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            ISceneStore disk = new JsonSceneStore(Path.Combine(directory, "scene.json"));
            disk.Save(scene);
            editor.TryResizeSelected(Vector3.UnitX);
            editor.ReplaceScene(disk.Load());
            check(scene.Objects.SequenceEqual(before) && editor.UndoCount == 0 && editor.RedoCount == 0,
                "Disk box open lost dimensions or kept history");
        }
        finally { Directory.Delete(directory, recursive: true); }
        Console.WriteLine("BOX STORAGE CHECKS PASSED");
    }
}
```

## Run, break and repair migration

Append the invocation.

```csharp edit=Checks/Program.cs mode=append
BoxStorageChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="BOX STORAGE CHECKS PASSED" timeout=120
run "dotnet build Studio" exit=0 timeout=120
```

Temporarily change the version 1 fallback from Vector3.One to new Vector3(2). Require Legacy cube migration lost identity or unit dimensions. Restore Vector3.One and rerun. Explain why successful new-format round trips could miss this backward-compatibility defect.

Run Studio. Make Beacon a tile and Crate a trunk. Put their centers at half their heights if they should meet the grid. Press F5, change one dimension, then press F9 and observe the saved shape restored. Close and restart, then press F9 again. Opening remains explicit and resets history. Inspect scene.json to locate Version and Box. Your color still comes from selection highlighting, not a persisted material; other primitives and materials follow after this box workflow.

## Independent task: reject a late corrupt shape

In a separate practice copy, prepare a version 2 file with a valid first object and a second object whose Height is zero. Attempt to open it through the store and require a reported failure with the active IDs, dimensions, selection and undo/redo counts unchanged. Then repair the height, open successfully and verify history resets. Add a version 1 fixture written without any Box key, and prove it becomes a unit box and saves as version 2.

```hints
nudge: Save expected active records and both history counts before attempting the bad open.
concept: Decode must finish validating the candidate before ReplaceScene changes active data. Migration is a separate contract from new-format round trips.
shape: Arrange two file records, corrupt the second height, catch the documented file-validation failure and compare the active state. Repair that field and assert a successful replacement with zero history counts.
```

### Explain and transfer

Show a saved tile/trunk scene, a migrated unit-cube fixture and a rejected file you designed. Explain why version 1 missing dimensions are acceptable while version 2 missing dimensions are not. The checks establish this small format and storage workflow, not crash durability, concurrent editing, native human input, materials, collision or mesh import. Now primitive extensions can reuse a demonstrated ownership, history and persistence path.
