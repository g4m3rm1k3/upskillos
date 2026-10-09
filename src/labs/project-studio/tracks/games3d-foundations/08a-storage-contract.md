---
title: Use a C# interface to separate storage from editing
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Our codec works without a disk. The editor needs Save and Load, while tests need controlled documents and fast failures. This is a concrete reason for an interface: one caller can work with different implementations of the same required operations.

## State a small contract before implementing it

Create Core/ISceneStore.cs. The I prefix is a C# naming convention, not special syntax. The interface declares members but stores no scene and writes no files. Save succeeds or throws; Load returns a fresh, validated scene or throws. Callers must apply the returned scene only after success. An interface cannot enforce those promises by itself; tests and implementations must honor them.

```csharp edit=Core/ISceneStore.cs mode=replace
namespace Studio3D;

public interface ISceneStore
{
    void Save(Scene scene);
    Scene Load();
}
```

Compare ISceneStore with `IReadOnlyList<SceneObject>`: each describes operations callers may use, not one particular implementation. IReadOnlyList does not promise that another owner never changes its backing collection. An interface is useful when substituting behavior or limiting dependencies matters; a concrete codec is still enough for pure conversion. No dependency injection container is required: passing an object is ordinary constructor injection.

## Implement the disk store and own its resources

Create Core/JsonSceneStore.cs. The colon declares that the sealed class implements the interface. path is normalized once. Save validates/encodes before touching the destination, writes a uniquely named sibling, then replaces the destination. The sibling remains on the same volume. The finally block removes only this call's temporary file. The destination directory must already exist.

```csharp edit=Core/JsonSceneStore.cs mode=replace
using System.Text;

namespace Studio3D;

public sealed class JsonSceneStore : ISceneStore
{
    private readonly string path;
    public JsonSceneStore(string path) { this.path = Path.GetFullPath(path); }

    public void Save(Scene scene)
    {
        string json = SceneCodec.Encode(scene);
        string temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            File.WriteAllText(temporary, json, new UTF8Encoding(false));
            File.Move(temporary, path, overwrite: true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    public Scene Load()
    {
        using FileStream stream = File.OpenRead(path);
        if (stream.Length > 262144) throw new InvalidDataException("Scene file is too large.");
        using StreamReader reader = new(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        char[] buffer = new char[SceneCodec.MaxCharacters + 1];
        int count = 0;
        while (count < buffer.Length)
        {
            int read = reader.Read(buffer, count, buffer.Length - count);
            if (read == 0) break;
            count += read;
        }
        if (count > SceneCodec.MaxCharacters) throw new InvalidDataException("Scene text is too large.");
        return SceneCodec.Decode(new string(buffer, 0, count));
    }
}
```

using declarations dispose the reader and stream when their scope ends, including exceptions. FileStream owns an OS file handle; IDisposable defines deterministic cleanup. This differs from using System.Text, which imports a namespace. Garbage collection reclaims managed memory; it is not a reason to leave file handles open. StreamReader also disposes its underlying stream; an additional stream disposal is supported and harmless here.

Load caps file bytes and decoded characters before parsing. Buffer reads may be partial, hence the loop. The replacement avoids truncating a good file before encoding/writing succeeds. It is not a power-loss durability guarantee, a backup system or a multi-writer protocol. [File.Move's overwrite overload](https://learn.microsoft.com/en-us/dotnet/api/system.io.file.move?view=net-8.0) is available for this target; filesystem-specific crash and interruption behavior needs its own testing.

## Apply a loaded candidate while preserving scene ownership

Create Core/EditorLoading.cs. Existing panels/session retain their Scene instance, so replace its records rather than assigning a different Scene behind their backs. Fresh snapshot storage prevents the candidate's later edits from changing the active scene. Opening resets selection to the first object and clears both history stacks; undo cannot cross a file boundary in this version.

```predict
question: If Load throws before ReplaceScene receives its argument, should redo history disappear?
choice: No, the replacement never runs
choice: Yes, every open attempt clears history
answer: No, the replacement never runs
explain: Method arguments are evaluated before the call. Load must return successfully before ReplaceScene executes. Resetting the editor first would sacrifice valid work on a failed open.
```

```csharp edit=Core/EditorLoading.cs mode=replace
namespace Studio3D;

public sealed partial class EditorSession
{
    public void ReplaceScene(Scene candidate)
    {
        scene.Restore(candidate.Capture());
        SelectedId = scene.Objects.Count > 0 ? scene.Objects[0].Id : Guid.Empty;
        undo.Clear();
        redo.Clear();
    }
}
```

ReplaceScene accepts trusted validated Scene data; it is not an arbitrary JSON boundary. Validation belongs before this call.

## Exercise two implementations through the same type

Create Checks/StoreChecks.cs. MemoryStore stores encoded text, not a live scene reference. Its Text property is exposed only by this private test class so a test can inject malformed data. ISceneStore store = memory keeps the object but changes what operations the variable exposes. Calls dispatch to that object's implementation: this is polymorphism.

```csharp edit=Checks/StoreChecks.cs mode=replace
using System.Numerics;
using System.Text.Json;
using Studio3D;

public static class StoreChecks
{
    private sealed class MemoryStore : ISceneStore
    {
        public string Text { get; set; } = "null";
        public void Save(Scene scene) { Text = SceneCodec.Encode(scene); }
        public Scene Load() => SceneCodec.Decode(Text);
    }

    public static void Run(Action<bool, string> check)
    {
        Scene scene = new();
        Guid id = scene.Add("Keep", Vector3.Zero);
        EditorSession editor = new(scene);
        editor.TryMoveSelected(Vector3.UnitX);
        editor.TryUndo();
        MemoryStore memory = new();
        ISceneStore store = memory;
        store.Save(scene);
        memory.Text = "{";
        bool rejected = false;
        try { editor.ReplaceScene(store.Load()); }
        catch (JsonException) { rejected = true; }
        check(rejected && scene.Objects[0].Id == id && editor.RedoCount == 1, "Failed load changed editor");
        store.Save(scene);
        Scene loaded = store.Load();
        editor.ReplaceScene(loaded);
        loaded.TryMove(id, Vector3.UnitY);
        check(scene.Objects[0].Position == Vector3.Zero, "Open shares source storage");
        check(editor.SelectedId == id && editor.UndoCount == 0 && editor.RedoCount == 0, "Open kept stale history");
        string directory = Path.Combine(Path.GetTempPath(), "studio-store-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            string file = Path.Combine(directory, "scene.json");
            ISceneStore disk = new JsonSceneStore(file);
            disk.Save(scene);
            string good = File.ReadAllText(file);
            Scene invalid = new();
            invalid.Add(new string('x', 81), Vector3.Zero);
            rejected = false;
            try { disk.Save(invalid); }
            catch (InvalidDataException) { rejected = true; }
            check(rejected && File.ReadAllText(file) == good, "Failed save replaced good file");
            disk.Save(loaded);
            check(disk.Load().Objects[0].Position == Vector3.UnitY, "Disk overwrite lost data");
            check(Directory.GetFiles(directory, "*.tmp").Length == 0, "Temporary save leaked");
        }
        finally { Directory.Delete(directory, recursive: true); }
        Console.WriteLine("STORE CHECKS PASSED");
    }
}
```

The disk test uses a unique disposable directory under the temporary folder; its cleanup targets that directory only. It tests a real overwrite and encoding failure without risking a learner save. An in-memory double alone cannot establish actual filesystem behavior.

## Run the storage checks and break the boundary

Append the invocation. Temporarily omit redo.Clear in EditorLoading only; require Open kept stale history. Restore it. Explain why the same operation in EditorHistory has a different purpose. Checks cover documented invalid input and normal disk writes, not disk-full, process interruption or simultaneous writers.

```csharp edit=Checks/Program.cs mode=append
StoreChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="STORE CHECKS PASSED" timeout=120
```

## Independent task: make unavailable storage observable

In a practice check implement ISceneStore with Load throwing IOException. Arrange a selected, moved scene and redo history, attempt a load and assert exact objects, selection and stack counts stay intact. Explain the difference between a missing file, invalid content and a programming bug. Keep the throwing implementation inside Checks.

```hints
nudge: Capture the expected scene and selection before calling Load.
concept: Substitution is useful when the fake obeys the same contract, including failures. Tests of a double do not replace integration tests against real disk.
shape: Define a private sealed UnavailableStore implementing both members, throw IOException from Load, then catch that exception around editor.ReplaceScene(store.Load()) and assert the original state.
```
