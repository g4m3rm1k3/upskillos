---
title: Create and delete scene objects without losing selection
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Our editor can move objects but cannot make a level of its own yet. Add creation and deletion, while keeping selection meaningful even when the scene becomes empty. Follow the earlier Foundations lessons first: this extends the same Core, Checks and Studio projects.

## Specify creation, deletion and an empty scene

A successful creation adds exactly one object with a new ID and selects it. A failed creation changes neither scene nor selection. Deletion removes only the selected ID, then selects the first remaining object; deleting the final object leaves no selection. Empty-scene actions must fail cleanly, not use an index that no longer exists.

These are acceptance criteria: observable outcomes a reviewer can check. Two objects may share the label Cube; their IDs must still differ. Keyboard Tab will cycle selection, so choosing objects does not require a mouse.

```predict
question: If the first of two objects is deleted, which ID should the remaining object have?
choice: Its original ID
choice: A new ID because its list index changed
answer: Its original ID
explain: An index is a place in a collection, not an identity. Deleting index zero shifts the remaining entry, but must not replace its ID. References and future undo depend on that distinction.
```

## Keep one scene type across small files

Replace Core/Scene.cs with the following version. The only change is partial in the class declaration. A partial class lets the compiler combine declarations of the same type across files in one project. It is still one Scene with one owned list. This lets us add focused editing operations without repeatedly expanding the introductory file. It is not inheritance and does not create a second scene.

```csharp edit=Core/Scene.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed partial class Scene
{
    private readonly List<SceneObject> objects = new();
    public IReadOnlyList<SceneObject> Objects => objects.AsReadOnly();

    public static bool IsFinite(Vector3 value) =>
        float.IsFinite(value.X) && float.IsFinite(value.Y) && float.IsFinite(value.Z);

    public Guid Add(string name, Vector3 position)
    {
        if (string.IsNullOrWhiteSpace(name) || !IsFinite(position))
            throw new ArgumentException("An object needs a name and finite coordinates.");
        Guid id = Guid.NewGuid();
        objects.Add(new SceneObject(id, name.Trim(), position));
        return id;
    }

    public bool TryMove(Guid id, Vector3 delta)
    {
        if (!IsFinite(delta)) return false;
        for (int i = 0; i < objects.Count; i++)
        {
            if (objects[i].Id != id) continue;
            Vector3 position = objects[i].Position + delta;
            if (!IsFinite(position)) return false;
            objects[i] = objects[i] with { Position = position };
            return true;
        }
        return false;
    }
}
```

## Remove the requested identity, not an assumed index

Create Core/SceneEditing.cs. All declarations of Scene must say partial. This declaration can use objects because it is part of the same class, including its private fields. RemoveAt removes one entry and shifts the later entries down; it does not change their records. Return immediately after removal so we do not continue walking a changed list.

```csharp edit=Core/SceneEditing.cs mode=replace
namespace Studio3D;

public sealed partial class Scene
{
    public bool TryRemove(Guid id)
    {
        for (int i = 0; i < objects.Count; i++)
        {
            if (objects[i].Id != id) continue;
            objects.RemoveAt(i);
            return true;
        }
        return false;
    }
}
```

Unknown IDs return false without touching data. That is a useful failure contract, not an exception we need to hide. We will use it when the selected object is absent.

## Make editor actions own selection changes

Replace Core/EditorSession.cs. TryAdd validates before calling Add, then selects the new ID. TryDeleteSelected changes selection only after successful removal. Empty scenes use Guid.Empty. SelectNext searches the selected ID, then advances the index; the remainder operator % wraps the final index back to zero. Its divisor is Count, so we return before that expression when Count is zero.

```csharp edit=Core/EditorSession.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed class EditorSession
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

The existing movement and selection operations keep their contracts. We deliberately choose the first remaining object after deletion. Selecting the closest sibling would also be a reasonable product choice, but requires a different written requirement and test.

## Test successful edits and unchanged failed edits

Create Checks/LifecycleChecks.cs. Begin with an empty scene, create two identically named objects, reject invalid creation, cycle selection and delete each object. The test checks the remaining ID directly, not just Count. Add the final object after the scene is empty to catch a stale-selection bug.

```csharp edit=Checks/LifecycleChecks.cs mode=replace
using System.Numerics;
using Studio3D;

public static class LifecycleChecks
{
    public static void Run(Action<bool, string> check)
    {
        Scene scene = new();
        EditorSession editor = new(scene);
        check(!editor.TryDeleteSelected(), "Empty deletion accepted");
        check(!editor.SelectNext(), "Empty selection accepted");
        check(editor.TryAdd("Cube", Vector3.Zero), "Creation rejected");
        Guid first = editor.SelectedId;
        check(editor.TryAdd("Cube", Vector3.UnitX), "Second creation rejected");
        Guid second = editor.SelectedId;
        check(first != second && scene.Objects.Count == 2, "Creation reused identity");
        check(!editor.TryAdd(" ", Vector3.Zero), "Invalid creation accepted");
        check(!editor.TryAdd("Invalid", new Vector3(float.PositiveInfinity, 0, 0)), "Infinite creation accepted");
        check(editor.SelectedId == second && scene.Objects.Count == 2, "Rejected creation changed state");
        check(editor.SelectNext() && editor.SelectedId == first, "Selection did not wrap");
        check(scene.Objects[0].Position == Vector3.Zero, "Cycling edited scene");
        check(editor.TryDeleteSelected(), "Selected deletion rejected");
        check(scene.Objects.Count == 1 && scene.Objects[0].Id == second, "Deletion removed wrong object");
        check(editor.SelectedId == second, "Deletion left stale selection");
        check(!scene.TryRemove(first), "Missing deletion accepted");
        check(editor.TryDeleteSelected(), "Last deletion rejected");
        check(editor.Selected is null && scene.Objects.Count == 0, "Last deletion left selection");
        check(editor.TryAdd("After empty", Vector3.Zero), "Creation after empty failed");
        check(editor.Selected is not null, "Created object was not selected");
        Console.WriteLine("LIFECYCLE CHECKS PASSED");
    }
}
```

## Run the new assertions with the old ones

Append the invocation below to Checks/Program.cs. Run Checks and expect all earlier messages plus LIFECYCLE CHECKS PASSED. Temporarily change the expected surviving ID from second to first and run again: require Deletion removed wrong object to fail. Restore second before continuing. A compile error is not the intended test failure.

```csharp edit=Checks/Program.cs mode=append
LifecycleChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="LIFECYCLE CHECKS PASSED" timeout=120
```

Checks establish identity, selection and these failure cases. They do not prove a mouse click reaches the correct control or that a long object list is usable.

## Independent task: delete a middle object

In a separate practice copy create three objects with different IDs and identical names. Select and delete the middle object, then test both surviving IDs, their order and positions, and the new selection. Cycle through the survivors and explain why the deleted object's old index must not be remembered as its identity. Add an empty-scene test for the same operation.

```hints
nudge: Record each ID when you create it. Check the survivors by ID, not by the label that all three share.
concept: List deletion changes indices but not surviving objects. Selection follows the specified first-remaining policy and must be absent when nothing remains.
shape: Arrange three IDs, select the second, delete it, then assert the list holds first and third in that order with unchanged coordinates. Assert selection points to first and repeat on an empty editor without indexing its list.
```
