---
title: Own snapshots and model undo with two stacks
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Deleting an object is now possible, but a mistaken delete loses work. Recovery becomes a product requirement. This lesson adds undo and redo for successful creation, deletion and movement. Follow the creation/deletion and controls lessons first. Selection by itself is not an edit; restarting still loses everything because persistent saving comes later.


By the end, you should be able to: Trace and test undo/redo states without aliasing the active scene collection.

## Trace history before choosing a representation

Start with an object at X=0. Move to X=1, then X=2. Undo must restore X=1; another Undo restores X=0. Redo then restores X=1 and X=2 in that order. A stack stores the latest item on top: Push adds an item, Pop removes and returns the top. Count tells us whether Pop would be valid. Two stacks represent undoable past states and redoable future states.

```predict
question: After moving X from 0 to 1, undoing, and making a new move to Y=1, should Redo restore X=1?
choice: Yes, every earlier edit stays redoable
choice: No, the new edit starts a different future
answer: No, the new edit starts a different future
explain: Redo describes the future removed by Undo. A new successful edit replaces that future, so it clears the redo stack. A failed request or selection change does not create a new future and must preserve redo.
```

We will store complete snapshots because our scenes are small and this representation is easy to inspect. A snapshot records object identities, order, names, positions and selection. It does not record a camera, graphics resources or a live simulation. Copying all objects costs O(n) time and storage per state; large-scene history will need limits or smaller commands. Here O(n) means cost grows with the number of objects, rather than with one edited object.

## Prepare the session for its history operations

Replace Core/EditorSession.cs with the following revision. Only partial is new. As with Scene, all declarations describe one type. A separate file lets us explain history without mixing it into the object selection loop. Later code will keep every required edit in the same project.

```csharp edit=Core/EditorSession.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed partial class EditorSession
{
    private readonly Scene scene;
    public Guid SelectedId { get; private set; }

    public EditorSession(Scene scene)
    {
        this.scene = scene;
        SelectedId = scene.Objects.Count > 0 ? scene.Objects[0].Id : Guid.Empty;
    }

    public SceneObject? Selected
    {
        get
        {
            foreach (SceneObject item in scene.Objects)
                if (item.Id == SelectedId) return item;
            return null;
        }
    }

    public bool TrySelect(Guid id)
    {
        foreach (SceneObject item in scene.Objects)
        {
            if (item.Id != id) continue;
            SelectedId = id;
            return true;
        }
        return false;
    }

    public bool TryAdd(string name, Vector3 position)
    {
        if (string.IsNullOrWhiteSpace(name) || !Scene.IsFinite(position)) return false;
        SelectedId = scene.Add(name, position);
        return true;
    }

    public bool TryDeleteSelected()
    {
        if (!scene.TryRemove(SelectedId)) return false;
        SelectedId = scene.Objects.Count > 0 ? scene.Objects[0].Id : Guid.Empty;
        return true;
    }

    public bool SelectNext()
    {
        if (scene.Objects.Count == 0) return false;
        for (int i = 0; i < scene.Objects.Count; i++)
        {
            if (scene.Objects[i].Id != SelectedId) continue;
            SelectedId = scene.Objects[(i + 1) % scene.Objects.Count].Id;
            return true;
        }
        SelectedId = scene.Objects[0].Id;
        return true;
    }

    public bool TryMoveSelected(Vector3 delta) => scene.TryMove(SelectedId, delta);
}
```

## Copy collections instead of sharing live state

Create Core/SceneSnapshots.cs. ToArray copies the list entries into a new array. An array has fixed length; a list can grow. Our SceneObject records are immutable through ordinary property assignment and their Vector3 positions are values, so sharing record references within two different collections is safe here. If we later add a mutable List of components to each record, this shallow copy will no longer be sufficient; that design needs its own copying rules and tests.

```csharp edit=Core/SceneSnapshots.cs mode=replace
namespace Studio3D;

public sealed partial class Scene
{
    internal SceneObject[] Capture() => objects.ToArray();

    internal void Restore(SceneObject[] snapshot)
    {
        objects.Clear();
        objects.AddRange(snapshot);
    }
}
```

Restore clears the scene's existing list and adds the captured records in the original order, preserving IDs. The array stays privately owned by history; no caller gets to change it. internal makes these helpers available inside Core rather than to Studio. These are trusted in-memory snapshots, not an untrusted project-file loader: serialization and file validation are separate lessons.

## Move snapshots between two stacks

Create Core/EditorHistory.cs. The private Snapshot record groups scene data and selection. The stacks belong to one editor session. readonly fixes each field's stack reference; Push and Pop still mutate stack contents. Capture creates fresh scene data. Restore restores both data and the selected ID.

```csharp edit=Core/EditorHistory.cs mode=replace
namespace Studio3D;

public sealed partial class EditorSession
{
    private sealed record Snapshot(SceneObject[] Objects, Guid SelectedId);
    private readonly Stack<Snapshot> undo = new();
    private readonly Stack<Snapshot> redo = new();
    public int UndoCount => undo.Count;
    public int RedoCount => redo.Count;

    private Snapshot Capture() => new(scene.Capture(), SelectedId);

    private void Restore(Snapshot snapshot)
    {
        scene.Restore(snapshot.Objects);
        SelectedId = snapshot.SelectedId;
    }

    private void Remember(Snapshot before)
    {
        undo.Push(before);
        redo.Clear();
    }

    public bool TryUndo()
    {
        if (undo.Count == 0) return false;
        redo.Push(Capture());
        Restore(undo.Pop());
        return true;
    }

    public bool TryRedo()
    {
        if (redo.Count == 0) return false;
        undo.Push(Capture());
        Restore(redo.Pop());
        return true;
    }
}
```

Remember receives the state from before a successful edit, pushes it onto undo and clears redo. Undo first captures the current state into redo, then restores the latest undo state. Redo performs the reverse. Neither calls Remember, because replaying history is not a new branch. An empty stack returns false without mutation. The public counts let the UI report availability without accessing the stacks themselves.

Walk the X=0, X=1, X=2 example by hand, listing both stacks after every action. Then add a new Y edit after an Undo and explain which stack is cleared. This is the behavior the next assertions will inspect.

## Record successful changes through one editing boundary

Replace Core/EditorSession.cs again. Add and delete capture before acting but call Remember only after success. Movement also rejects a zero delta, absent selection and a result that rounds to the existing float position. The last case matters at very large coordinates, where adding one can be too small to change a float.

```csharp edit=Core/EditorSession.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed partial class EditorSession
{
    private readonly Scene scene;
    public Guid SelectedId { get; private set; }

    public EditorSession(Scene scene)
    {
        this.scene = scene;
        SelectedId = scene.Objects.Count > 0 ? scene.Objects[0].Id : Guid.Empty;
    }

    public SceneObject? Selected
    {
        get
        {
            foreach (SceneObject item in scene.Objects)
                if (item.Id == SelectedId) return item;
            return null;
        }
    }

    public bool TrySelect(Guid id)
    {
        foreach (SceneObject item in scene.Objects)
        {
            if (item.Id != id) continue;
            SelectedId = id;
            return true;
        }
        return false;
    }

    public bool TryAdd(string name, Vector3 position)
    {
        if (string.IsNullOrWhiteSpace(name) || !Scene.IsFinite(position)) return false;
        Snapshot before = Capture();
        SelectedId = scene.Add(name, position);
        Remember(before);
        return true;
    }

    public bool TryDeleteSelected()
    {
        Snapshot before = Capture();
        if (!scene.TryRemove(SelectedId)) return false;
        SelectedId = scene.Objects.Count > 0 ? scene.Objects[0].Id : Guid.Empty;
        Remember(before);
        return true;
    }

    public bool SelectNext()
    {
        if (scene.Objects.Count == 0) return false;
        for (int i = 0; i < scene.Objects.Count; i++)
        {
            if (scene.Objects[i].Id != SelectedId) continue;
            SelectedId = scene.Objects[(i + 1) % scene.Objects.Count].Id;
            return true;
        }
        SelectedId = scene.Objects[0].Id;
        return true;
    }

    public bool TryMoveSelected(Vector3 delta)
    {
        SceneObject? selected = Selected;
        if (selected is null || delta == Vector3.Zero || selected.Position + delta == selected.Position)
            return false;
        Snapshot before = Capture();
        if (!scene.TryMove(SelectedId, delta)) return false;
        Remember(before);
        return true;
    }
}
```

Selection methods do not call Remember. An invalid delta still reaches Scene's finite/result validation and returns false without touching history. All editor content changes must go through these session operations. Calling Scene.Add directly after editing starts would bypass history and make old snapshots misleading; the app uses direct scene construction only before creating the session.

Undo restores the selection attached to the state being restored. If you move Crate, select Beacon and then Undo, the scene and selection return to the state before the Crate move. That is our explicit product policy; selection-only navigation itself is not undoable.

## Check a move, an undo and a redo

Create Checks/HistoryBasics.cs. These assertions make the state trace executable: after a move, Undo restores zero and Redo restores UnitX, with the original ID throughout. This small check establishes a first runnable win; the next lesson adds deletion, branching and invalid-input regressions.

```csharp edit=Checks/HistoryBasics.cs mode=replace
using System.Numerics;
using Studio3D;

public static class HistoryBasics
{
    public static void Run(Action<bool, string> check)
    {
        Scene scene = new();
        Guid id = scene.Add("Practice", Vector3.Zero);
        EditorSession editor = new(scene);
        check(!editor.TryUndo(), "Empty undo accepted");
        editor.TryMoveSelected(Vector3.UnitX);
        check(editor.UndoCount == 1, "Move did not record history");
        check(editor.TryUndo() && editor.Selected?.Position == Vector3.Zero, "Basic undo lost original position");
        check(editor.RedoCount == 1, "Basic undo lost redo state");
        check(editor.TryRedo() && editor.Selected?.Position == Vector3.UnitX, "Basic redo lost edited position");
        check(editor.SelectedId == id, "Basic history changed identity");
        Console.WriteLine("HISTORY BASICS PASSED");
    }
}
```

## Execute the basic history contract

Append the invocation to Checks/Program.cs and run. Temporarily expect UnitY after Redo and require Basic redo lost edited position to fail, then restore UnitX. A successful build is not evidence that history order is correct.

```csharp edit=Checks/Program.cs mode=append
HistoryBasics.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="HISTORY BASICS PASSED" timeout=120
```

The checks establish one move's restoration and identity. They do not yet establish every deletion, redo branching or UI input case. Those are the next lesson's requirements.

## Independent task: trace two moves and selection

In a practice copy make two moves, undo both and redo both. Write each expected position, selected ID and stack count before executing. Select a different object between a move and Undo and explain the selection restored by our policy. Add assertions for that case without changing the original objects' IDs.

```hints
nudge: Remember captures the selection before the edit. Selection-only navigation does not add another undo state.
concept: The undo stack contains past states, most recent first. Redo captures the state that Undo is about to replace.
shape: Arrange two IDs, select the second, move it twice, then compare two Undo and two Redo transitions with a handwritten table. After another move select the first before Undo; require restoration of the second's pre-edit selection and position.
```

### Explain and transfer

Draw both stacks through your two-move practice trace, including a selection change. Explain which collection is copied and why immutable records make that copy sufficient here. Choose an undo state not checked in HistoryBasics and test its position and selection.

Keep a brief record of your prediction, actual result, explanation and independently chosen change. Try the explanation with the reference closed; reopen it or use hints when needed, then retry the part you could not explain. A green guided check establishes its named behavior, not independent understanding.
