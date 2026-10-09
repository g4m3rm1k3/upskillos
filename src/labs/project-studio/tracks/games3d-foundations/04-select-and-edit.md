---
title: Select an object and edit its position
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

The picture becomes an editor when an intentional action changes the correct object's data. We will click names in an object list, inspect a position and move the selected object in quarter-unit steps. This is a first position inspector; text entry, transform gizmos, saving and undo are still future lessons.

## Separate selection from authored scene data

Selection belongs to the editor, not to the game scene. EditorSession stores the selected object's ID and delegates movement to Scene's validated operation. It retains the Scene reference; it does not make an independent copy. Later Play/Stop needs a real copy precisely because shared references would leak game changes into editing.

The constructor initializes a new session and chooses the first object when one exists. Guid.Empty represents no selection. The selected property has a public getter and private setter. SceneObject? means the result may be null when there is no selected object; null is absence, not a zero position. We search by ID rather than remembering an index that could change when objects are reordered.

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

    public bool TryMoveSelected(Vector3 delta) => scene.TryMove(SelectedId, delta);
}
```

this.scene refers to the field; scene without this in the constructor refers to the parameter. An unknown selection returns false and preserves the previous selection. Selecting a different object makes no call to TryMove, so selection alone does not edit coordinates.

## Check the editor's contract without opening a window

Action<bool,string> describes a function taking a Boolean and a label; the caller supplies our existing Check function. EditorChecks is a static grouping of related assertions. We build an empty scene too, because an editor eventually needs New scene to work before anything is added.

```csharp edit=Checks/EditorChecks.cs mode=replace
using System.Numerics;
using Studio3D;

public static class EditorChecks
{
    public static void Run(Action<bool, string> check)
    {
        Scene scene = new();
        Guid first = scene.Add("First", Vector3.Zero);
        Guid second = scene.Add("Second", new Vector3(2, 0, 0));
        EditorSession editor = new(scene);
        check(editor.SelectedId == first, "Initial selection is wrong");
        check(editor.TrySelect(second), "Existing selection rejected");
        check(scene.Objects[1].Position == new Vector3(2, 0, 0), "Selection edited scene");
        check(!editor.TrySelect(Guid.NewGuid()), "Missing selection accepted");
        check(editor.SelectedId == second, "Failed selection lost previous selection");
        check(editor.TryMoveSelected(new Vector3(0, 0.25f, 0)), "Editor move rejected");
        check(scene.Objects[0].Position == Vector3.Zero, "Editor moved unselected object");
        check(editor.Selected?.Position == new Vector3(2, 0.25f, 0), "Inspector reads stale position");
        EditorSession empty = new(new Scene());
        check(empty.Selected is null, "Empty scene has a selected object");
        check(!empty.TryMoveSelected(Vector3.UnitX), "Empty editor accepted a move");
        Console.WriteLine("EDITOR CHECKS PASSED");
    }
}
```

The ?. operator accesses Position only when Selected is present. Calling Selected again reads the current list entry, including the record replaced by TryMove. Holding an older record would retain its earlier position; read current state to draw the inspector.

## Invoke the additional checks

Append this line to Checks/Program.cs after its existing code. The compiler resolves the method group Check to the required Action signature. Run Checks and expect both SCENE CHECKS PASSED and EDITOR CHECKS PASSED. Temporarily change the expected selected Y to 0.5; require Inspector reads stale position to fail, then restore 0.25.

```csharp edit=Checks/Program.cs mode=append
EditorChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="EDITOR CHECKS PASSED" timeout=120
```

## Draw a list and a readable inspector

Create Studio/EditorPanels.cs. Coordinates in these panels are screen pixels, with (0,0) at the top left. They differ from world coordinates in metres. ObjectRow maps an index to a clickable rectangle. Draw and input handling will use the same rectangle so visual rows and click targets agree.

```csharp edit=Studio/EditorPanels.cs mode=replace
using Raylib_cs;

namespace Studio3D;

public static class EditorPanels
{
    public static Rectangle ObjectRow(int index) => new(16, 80 + index * 36, 208, 30);

    public static void Draw(Scene scene, EditorSession editor)
    {
        Raylib.DrawRectangle(0, 0, 240, 700, Color.DarkBlue);
        Raylib.DrawText("SCENE OBJECTS", 16, 24, 20, Color.White);
        for (int i = 0; i < scene.Objects.Count; i++)
        {
            SceneObject item = scene.Objects[i];
            Rectangle row = ObjectRow(i);
            Raylib.DrawRectangleRec(row, item.Id == editor.SelectedId ? Color.Blue : Color.DarkGray);
            Raylib.DrawText(item.Name, 24, (int)row.Y + 5, 18, Color.White);
        }
        Raylib.DrawRectangle(820, 0, 280, 700, Color.DarkBlue);
        Raylib.DrawText("POSITION INSPECTOR", 836, 24, 18, Color.White);
        SceneObject? selected = editor.Selected;
        if (selected is not null)
        {
            Raylib.DrawText(selected.Name, 836, 80, 20, Color.Gold);
            Raylib.DrawText(FormattableString.Invariant($"X: {selected.Position.X:F2}"), 836, 124, 20, Color.White);
            Raylib.DrawText(FormattableString.Invariant($"Y: {selected.Position.Y:F2}"), 836, 160, 20, Color.White);
            Raylib.DrawText(FormattableString.Invariant($"Z: {selected.Position.Z:F2}"), 836, 196, 20, Color.White);
        }
        Raylib.DrawText("Click an object name", 836, 280, 18, Color.White);
        Raylib.DrawText("Left/Right: X", 836, 316, 18, Color.White);
        Raylib.DrawText("PageDown/PageUp: Y", 836, 352, 18, Color.White);
        Raylib.DrawText("Down/Up: Z", 836, 388, 18, Color.White);
        Raylib.DrawText("Each press: 0.25 units", 836, 436, 18, Color.White);
        Raylib.DrawText("Not saved yet", 836, 500, 18, Color.Gold);
    }
}
```

DrawText requires an integer pixel position, so the cast converts row.Y from float. Panels overlay the 3D frame; the fixed dimensions deliberately match the fixed window. This prototype has two objects and no scrolling, text entry or resizable panels. It is not yet a general-purpose scene hierarchy.

## Route input through the tested editing operation

Replace Studio/Program.cs. IsMouseButtonPressed detects a new press; CheckCollisionPointRec asks whether the mouse is inside a row. IsKeyPressed also reacts to a new press, not continuous held motion. Each action is a discrete quarter-unit edit, independent of elapsed frame time. Later character movement will use speed and simulation time, a different behavior.

```predict
question: After selecting Crate and pressing Right once, which values should the inspector show?
choice: X=2.25, Y=0.50, Z=1.00
choice: X=0.25, Y=0.50, Z=0.00
answer: X=2.25, Y=0.50, Z=1.00
explain: Crate starts at (2,0.5,1). Selection identifies Crate; a quarter-unit X displacement changes only its X. Beacon remains at its starting coordinates.
```

```csharp edit=Studio/Program.cs mode=replace
using System.Numerics;
using Raylib_cs;
using Studio3D;

Scene scene = new();
scene.Add("Beacon", new Vector3(0, 0.5f, 0));
scene.Add("Crate", new Vector3(2, 0.5f, 1));
EditorSession editor = new(scene);
Camera3D camera = new()
{
    Position = new Vector3(7, 6, 9),
    Target = new Vector3(1, 0, 0),
    Up = Vector3.UnitY,
    FovY = 45,
    Projection = CameraProjection.Perspective
};

Raylib.InitWindow(1100, 700, "Your 3D Studio - Select and Edit");
Raylib.SetTargetFPS(60);
try
{
    while (!Raylib.WindowShouldClose())
    {
        if (Raylib.IsMouseButtonPressed(MouseButton.Left))
        {
            for (int i = 0; i < scene.Objects.Count; i++)
                if (Raylib.CheckCollisionPointRec(Raylib.GetMousePosition(), EditorPanels.ObjectRow(i)))
                    editor.TrySelect(scene.Objects[i].Id);
        }
        Vector3 delta = Vector3.Zero;
        if (Raylib.IsKeyPressed(KeyboardKey.Right)) delta.X += 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.Left)) delta.X -= 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.PageUp)) delta.Y += 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.PageDown)) delta.Y -= 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.Up)) delta.Z += 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.Down)) delta.Z -= 0.25f;
        if (delta != Vector3.Zero) editor.TryMoveSelected(delta);

        Raylib.BeginDrawing();
        Raylib.ClearBackground(Color.RayWhite);
        Raylib.BeginMode3D(camera);
        SceneDrawing.Draw(scene, editor.SelectedId);
        Raylib.EndMode3D();
        EditorPanels.Draw(scene, editor);
        Raylib.DrawText("YOUR 3D STUDIO | Escape closes", 260, 20, 20, Color.DarkBlue);
        Raylib.EndDrawing();
    }
}
finally { Raylib.CloseWindow(); }
```

Run Studio. Select Crate in the list, press Right once, then select Beacon. The gold highlight and inspector must agree with selection; Beacon must retain (0,0.5,0). Return to Crate and use Left to restore its X. Try each axis and its inverse. Close and reopen: edits reset because no save feature exists yet. The visible Not saved yet label makes that limitation explicit.

```check
run "dotnet build Studio" exit=0 timeout=120
run "dotnet run --project Checks" exit=0 stdout="EDITOR CHECKS PASSED" timeout=120
```

Checks establish Core/session behavior and compilation. They do not prove clicks reach the correct row, native keyboard mapping, panel legibility or accessible controls. Record those observations manually. The next studio milestones are creation/deletion, undo and validated saving before game simulation.

## Independent task: add a reversible editing action

In a practice copy, add Home to return only the selected object's position to the origin. Use the existing movement operation rather than changing the list externally. Add tests with two objects, showing that only the selected object moves, its ID stays the same and invoking Home twice has no additional effect. This action is not history-based Undo; explain that distinction.

```hints
nudge: Which displacement would take a current coordinate back to zero?
concept: Negating a position gives the displacement to the origin. Doing it twice is harmless because the second displacement is zero. Undo instead restores the previous action's state.
shape: Read the selected object's current position, negate it and call TryMoveSelected. Guard the empty-selection case. Test selection isolation, identity and a second invocation, then connect the action to Home in the input block.
```
