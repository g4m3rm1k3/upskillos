---
title: Give each box its own dimensions and undoable edits
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Repair the preview failure you just observed. Beacon should remain a tile when you select Crate and make it a trunk. Resizing should preserve each object's identity and center. Undo must restore its dimensions.

By the end, you can resize two objects independently, trace resize/undo/redo and prove rejected changes preserve history. Prerequisites: the shape preview, validated box recipe and earlier snapshot-history lessons. Save/open still use version 1 until the next lesson; for this milestone do not save a resized scene expecting its dimensions to survive.

## Predict where dimensions belong

```predict
question: Beacon is a tile and Crate is a trunk. Selecting Beacon again should show which dimensions?
choice: Beacon's tile dimensions
choice: The most recent trunk dimensions
answer: Beacon's tile dimensions
explain: The box description now belongs to each immutable SceneObject record. Selection identifies which object to edit; it does not own a shared preview value.
```

## Attach an immutable recipe to the existing record

Replace Core/SceneObject.cs. Keep the existing three-argument constructor and IDs. Newly created objects default to a unit box, so the earlier scene construction still works. The init accessor permits replacing Box in a with expression when constructing a new record. It does not permit ordinary assignment afterward. BoxRecipe's dimensions remain get-only and validated.

```csharp edit=Core/SceneObject.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed record SceneObject(Guid Id, string Name, Vector3 Position)
{
    public BoxRecipe Box { get; init; } = new(Vector3.One);
}
```

A shallow history snapshot remains sufficient: the list is copied and its entries reference immutable records and immutable recipes. That reasoning would fail if BoxRecipe held a mutable vertex list. Nullable annotations guide the compiler; they are not a substitute for validation at external boundaries. We will validate saved dimensions explicitly next.

## Replace the matching record without changing identity

Create Core/SceneBoxes.cs. Reject null, a missing ID and an equal recipe. Return false for a no-op so it does not create an undo entry. Value equality on BoxRecipe makes a newly constructed equal recipe count as unchanged.

```csharp edit=Core/SceneBoxes.cs mode=replace
namespace Studio3D;

public sealed partial class Scene
{
    public bool TrySetBox(Guid id, BoxRecipe? box)
    {
        if (box is null) return false;
        for (int i = 0; i < objects.Count; i++)
        {
            if (objects[i].Id != id) continue;
            if (objects[i].Box == box) return false;
            objects[i] = objects[i] with { Box = box };
            return true;
        }
        return false;
    }
}
```

## Record accepted edits through the session

Create Core/EditorBoxes.cs. Reuse Capture and Remember from the history lesson. TryResizeSelected computes a candidate recipe before recording anything. A zero or negative size violates the recipe contract and becomes a rejected user edit. Catch only the expected constructor exception.

```csharp edit=Core/EditorBoxes.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed partial class EditorSession
{
    public bool TrySetSelectedBox(BoxRecipe? box)
    {
        if (Selected is null || box is null || Selected.Box == box) return false;
        Snapshot before = Capture();
        if (!scene.TrySetBox(SelectedId, box)) return false;
        Remember(before);
        return true;
    }

    public bool TryResizeSelected(Vector3 delta)
    {
        SceneObject? selected = Selected;
        if (selected is null || !Scene.IsFinite(delta)) return false;
        BoxRecipe box;
        try { box = new BoxRecipe(selected.Box.Size + delta); }
        catch (ArgumentOutOfRangeException) { return false; }
        return TrySetSelectedBox(box);
    }
}
```

Unlike the bounded visual prototype, these operations reject out-of-range dimensions rather than clamping them. Resizing changes the center neither to keep the bottom grounded nor to preserve a corner: our current policy holds the center fixed. Grounding and pivots need explicit tools later.

## Draw each object's own recipe

Replace Studio/SceneDrawing.cs. Remove the preview argument. Selection still controls highlighting; each object supplies its own dimensions.

```csharp edit=Studio/SceneDrawing.cs mode=replace
using System.Numerics;
using Raylib_cs;

namespace Studio3D;

public static class SceneDrawing
{
    public static void Draw(Scene scene, Guid selectedId)
    {
        Raylib.DrawGrid(20, 1f);
        foreach (SceneObject item in scene.Objects)
        {
            Color color = item.Id == selectedId ? Color.Gold : Color.SkyBlue;
            Vector3 size = item.Box.Size;
            Raylib.DrawCube(item.Position, size.X, size.Y, size.Z, color);
            Raylib.DrawCubeWires(item.Position, size.X, size.Y, size.Z, Color.DarkBlue);
        }
    }
}

```

## Replace preview controls with actual editor commands

Replace Studio/ShapeControls.cs. The class receives the existing editor session and holds no shared size. The UI reads selected.Box.Size and reports rejected or unchanged commands. This is an example of evolving a prototype once its ownership failure is understood, not adding another hidden data source.

```csharp edit=Studio/ShapeControls.cs mode=replace
using System.Numerics;
using Raylib_cs;

namespace Studio3D;

public sealed class ShapeControls
{
    private readonly EditorSession editor;
    private string status = "Choose a box, then resize it";
    public ShapeControls(EditorSession editor) { this.editor = editor; }

    public bool Handle()
    {
        BoxRecipe? preset = null;
        if (Raylib.IsKeyPressed(KeyboardKey.T)) preset = new(new Vector3(2, 0.25f, 2));
        else if (Raylib.IsKeyPressed(KeyboardKey.B)) preset = new(new Vector3(0.5f, 2, 0.5f));
        else if (Raylib.IsKeyPressed(KeyboardKey.Backspace)) preset = new(Vector3.One);
        if (preset is not null)
        {
            status = editor.TrySetSelectedBox(preset) ? "Box changed; Undo restores it" : "No change";
            return true;
        }
        float step = Raylib.IsKeyDown(KeyboardKey.LeftShift) ? -0.25f : 0.25f;
        Vector3 delta = Vector3.Zero;
        if (Raylib.IsKeyPressed(KeyboardKey.W)) delta.X = step;
        if (Raylib.IsKeyPressed(KeyboardKey.H)) delta.Y = step;
        if (Raylib.IsKeyPressed(KeyboardKey.D)) delta.Z = step;
        if (delta == Vector3.Zero) return false;
        status = editor.TryResizeSelected(delta) ? "Box changed; Undo restores it" : "No change; dimension must be in (0, 100]";
        return true;
    }

    public void Draw()
    {
        Raylib.DrawText("BOX EDIT | W/H/D grow, Left Shift shrinks", 260, 600, 16, Color.DarkBlue);
        Raylib.DrawText("T: tile | B: trunk | Backspace: unit box", 260, 624, 16, Color.DarkBlue);
        SceneObject? selected = editor.Selected;
        string dimensions = selected is null ? "No selection" :
            FormattableString.Invariant($"W {selected.Box.Size.X:F2}  H {selected.Box.Size.Y:F2}  D {selected.Box.Size.Z:F2}");
        Raylib.DrawText(dimensions, 260, 648, 16, Color.DarkBlue);
        Raylib.DrawText(status, 260, 676, 14, Color.DarkBlue);
    }
}
```

## Wire the session into shape controls

Replace Studio/Program.cs. The only changes from the visual experiment are new(editor) and removing the preview argument from drawing. Input priority remains file commands, shape commands, then existing editor controls.

```csharp edit=Studio/Program.cs mode=replace
using System.Numerics;
using Raylib_cs;
using Studio3D;

Scene scene = new();
scene.Add("Beacon", new Vector3(0, 0.5f, 0));
scene.Add("Crate", new Vector3(2, 0.5f, 1));
EditorSession editor = new(scene);
string scenePath = Path.Combine(Environment.CurrentDirectory, "scene.json");
Console.WriteLine($"Scene file: {scenePath}");
FileControls files = new(scene, editor, new JsonSceneStore(scenePath));
ShapeControls shapes = new(editor);
Camera3D camera = new()
{
    Position = new Vector3(7, 6, 9),
    Target = new Vector3(1, 0, 0),
    Up = Vector3.UnitY,
    FovY = 45,
    Projection = CameraProjection.Perspective
};

Raylib.InitWindow(1100, 700, "Your 3D Studio - Create and Delete");
Raylib.SetTargetFPS(60);
try
{
    while (!Raylib.WindowShouldClose())
    {
        if (!files.Handle() && !shapes.Handle()) StudioInput.Handle(scene, editor);

        Raylib.BeginDrawing();
        Raylib.ClearBackground(Color.RayWhite);
        Raylib.BeginMode3D(camera);
        SceneDrawing.Draw(scene, editor.SelectedId);
        Raylib.EndMode3D();
        EditorPanels.Draw(scene, editor);
        Raylib.DrawText("YOUR 3D STUDIO | Escape closes", 260, 20, 20, Color.DarkBlue);
        files.Draw();
        shapes.Draw();
        Raylib.EndDrawing();
    }
}
finally { Raylib.CloseWindow(); }

```

## Check identity, independent instances and history

Create Checks/BoxEditingChecks.cs. Compare actual sizes and IDs, not just object count. The rejected edit occurs after Undo, when a mistaken history change could destroy a valid Redo.

```csharp edit=Checks/BoxEditingChecks.cs mode=replace
using System.Numerics;
using Studio3D;

public static class BoxEditingChecks
{
    public static void Run(Action<bool, string> check)
    {
        Scene scene = new();
        Guid first = scene.Add("Twin", new Vector3(0, 0.5f, 0));
        Guid second = scene.Add("Twin", new Vector3(2, 0.5f, 0));
        EditorSession editor = new(scene);
        BoxRecipe tile = new(new Vector3(2, 0.25f, 2));
        check(editor.TrySetSelectedBox(tile), "Box edit rejected");
        check(scene.Objects[0].Id == first && scene.Objects[0].Position.Y == 0.5f,
            "Resizing changed identity or center");
        check(scene.Objects[0].Box == tile && scene.Objects[1].Box.Size == Vector3.One,
            "Box edit changed wrong object");
        check(editor.UndoCount == 1, "Box edit did not record history");
        check(editor.TryUndo() && editor.Selected!.Box.Size == Vector3.One, "Undo lost box dimensions");
        int redo = editor.RedoCount;
        check(!editor.TryResizeSelected(new Vector3(-1, 0, 0)), "Zero-width resize accepted");
        check(!editor.TryResizeSelected(new Vector3(float.NaN, 0, 0)), "Nonfinite resize accepted");
        check(!editor.TrySetSelectedBox(null) && !editor.TryResizeSelected(Vector3.Zero),
            "Null or no-op resize accepted");
        check(editor.RedoCount == redo && editor.UndoCount == 0, "Rejected resize changed history");
        check(editor.TryRedo() && editor.Selected!.Box == tile, "Redo lost box dimensions");
        editor.TrySelect(second);
        check(editor.Selected!.Box.Size == Vector3.One, "Dimensions followed selection");
        check(editor.TryResizeSelected(Vector3.UnitY) && scene.Objects[1].Box.Size.Y == 2
            && scene.Objects[0].Box == tile, "Resize targeted wrong ID");
        editor.TryUndo();
        check(editor.TryResizeSelected(Vector3.UnitX) && editor.RedoCount == 0,
            "New resize kept obsolete redo");
        check(scene.Objects[0].Box == tile, "Another instance mutated the tile");
        check(!scene.TrySetBox(Guid.NewGuid(), tile), "Unknown box identity accepted");
        Scene empty = new();
        check(!new EditorSession(empty).TryResizeSelected(Vector3.One), "Empty scene resize accepted");
        Console.WriteLine("BOX EDITING CHECKS PASSED");
    }
}
```

## Run and diagnose a broken resize history

Append the invocation. Require the success label.

```csharp edit=Checks/Program.cs mode=append
BoxEditingChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="BOX EDITING CHECKS PASSED" timeout=120
run "dotnet build Studio" exit=0 timeout=120
```

Temporarily remove Remember(before) from Core/EditorBoxes.cs. Require Box edit did not record history. Explain why the scene can change correctly while Undo is broken. Restore the call and rerun. Run Studio, make Beacon a tile and Crate a trunk, then select Beacon again: the original preview failure is repaired. Undo and Redo a resize and inspect the dimensions. Close the window.

## Independent task: protect a third object's recipe

In a separate practice copy create three objects and resize the middle one. Assert all IDs and centers remain unchanged and the outer recipes retain their values. Undo, attempt an oversized resize, then Redo. Add a huge finite delta and require rejection with unchanged history. Explain why checking only whether the delta is finite would miss a result above the size limit.

```hints
nudge: Save the original records before editing; count alone cannot detect a wrong-object edit.
concept: An accepted input delta can still produce an invalid result. Validate the candidate and preserve the redo branch on rejection.
shape: Arrange three IDs, select the middle, resize and compare both neighbors. After Undo, use a huge positive finite X delta, assert false and unchanged stack counts, then require Redo to restore the middle recipe.
```

### Explain and transfer

Show that selection no longer transfers dimensions and that undo/redo restores the same object's recipe. Explain why sharing an immutable recipe is safe while sharing a mutable vertex list would change the snapshot contract. These checks establish box edits and history, not saved dimensions, collision or imported models. The next lesson changes the file format before reusable props are introduced.
