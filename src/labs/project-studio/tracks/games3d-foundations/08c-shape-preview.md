---
title: See box dimensions change before designing assets
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Start with a visible problem. A road tile could be 2 units wide, 0.25 units high and 2 units deep. A trunk could be 0.5 units wide, 2 units high and 0.5 units deep. Both use the cube drawing operation you already know, with different dimensions.

By the end, you can preview those shapes, explain their center and bottom height, and demonstrate the missing per-object ownership in a prototype. Prerequisites: the viewport, selection, history and save/open lessons. Keep the camera fixed while comparing shapes.

## Predict a taller box

The existing cube has center Y=0.5 and full height 1. Its bottom is at 0.5 minus half its height: zero. Before changing height, predict where the bottom will go if the center stays fixed.

```predict
question: A box stays centered at Y=0.5 while its height changes to 2. Where is its bottom?
choice: Y=-0.5, below the grid
choice: Y=0, because drawing keeps it grounded
answer: Y=-0.5, below the grid
explain: The drawing call takes a center and full dimensions. Its bottom is center Y minus height/2. Drawing does not automatically reposition it or supply collision.
```

## Give the selected drawing a preview size

Replace Studio/SceneDrawing.cs. The optional nullable Vector3 argument is a preview override; null means use a unit box. The null-coalescing operator ?? supplies that default. Only the selected object's drawing receives the override. The wire edges use the same size as the filled box. Drawing reads the scene without editing it.

```csharp edit=Studio/SceneDrawing.cs mode=replace
using System.Numerics;
using Raylib_cs;

namespace Studio3D;

public static class SceneDrawing
{
    public static void Draw(Scene scene, Guid selectedId, Vector3? previewSize = null)
    {
        Raylib.DrawGrid(20, 1f);
        foreach (SceneObject item in scene.Objects)
        {
            Color color = item.Id == selectedId ? Color.Gold : Color.SkyBlue;
            Vector3 size = item.Id == selectedId ? previewSize ?? Vector3.One : Vector3.One;
            Raylib.DrawCube(item.Position, size.X, size.Y, size.Z, color);
            Raylib.DrawCubeWires(item.Position, size.X, size.Y, size.Z, Color.DarkBlue);
        }
    }
}

```

## Add a small shape experiment

Create Studio/ShapeControls.cs. W changes width (X), H height (Y), D depth (Z). Hold the left Shift key to shrink instead. IsKeyPressed gives one quarter-unit change per press; IsKeyDown observes whether Shift remains held. T previews a tile; B a trunk; Backspace resets the preview. Vector3.Clamp keeps each dimension between 0.25 and 4 so the experiment stays visible.

This is one temporary preview value, not an object property or an asset library. It deliberately exposes the ownership problem we will fix next. Changing selection transfers the preview to the newly selected drawing. Save and Undo cannot preserve it because it is outside scene data.

```csharp edit=Studio/ShapeControls.cs mode=replace
using System.Numerics;
using Raylib_cs;

namespace Studio3D;

public sealed class ShapeControls
{
    public Vector3 Size { get; private set; } = Vector3.One;

    public bool Handle()
    {
        if (Raylib.IsKeyPressed(KeyboardKey.T)) { Size = new Vector3(2, 0.25f, 2); return true; }
        if (Raylib.IsKeyPressed(KeyboardKey.B)) { Size = new Vector3(0.5f, 2, 0.5f); return true; }
        if (Raylib.IsKeyPressed(KeyboardKey.Backspace)) { Size = Vector3.One; return true; }
        float step = Raylib.IsKeyDown(KeyboardKey.LeftShift) ? -0.25f : 0.25f;
        Vector3 delta = Vector3.Zero;
        if (Raylib.IsKeyPressed(KeyboardKey.W)) delta.X = step;
        if (Raylib.IsKeyPressed(KeyboardKey.H)) delta.Y = step;
        if (Raylib.IsKeyPressed(KeyboardKey.D)) delta.Z = step;
        if (delta == Vector3.Zero) return false;
        Size = Vector3.Clamp(Size + delta, new Vector3(0.25f), new Vector3(4));
        return true;
    }

    public void Draw()
    {
        Raylib.DrawText("PREVIEW ONLY | W/H/D grow, Left Shift shrinks", 260, 600, 16, Color.DarkBlue);
        Raylib.DrawText("T: tile | B: trunk | Backspace: unit box", 260, 624, 16, Color.DarkBlue);
        Raylib.DrawText(FormattableString.Invariant($"Width {Size.X:F2}  Height {Size.Y:F2}  Depth {Size.Z:F2}"),
            260, 648, 16, Color.DarkBlue);
    }
}
```

## Connect input and drawing at the application boundary

Replace Studio/Program.cs. File commands retain priority. A handled shape key does not also reach movement input. The application passes the preview to drawing and prints the controls below the viewport. No new dependency is needed.

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
ShapeControls shapes = new();
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
        SceneDrawing.Draw(scene, editor.SelectedId, shapes.Size);
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

```check
run "dotnet build Studio" exit=0 timeout=120
run "dotnet run --project Checks" exit=0 stdout="STORE CHECKS PASSED" timeout=120
```

Run dotnet run --project Studio. Press T and observe a broad thin box. Press B and observe a tall narrow box. With B active, use PageUp twice to move its center from Y=0.5 to Y=1; its bottom now meets the grid. Read the position inspector to verify the center. The grid remains a visual reference, not a collider. Backspace restores unit dimensions; Undo reverses the position edits but not the preview.

## Diagnose an ownership failure

Select Beacon, press T, then press Tab. The tile preview follows selection and Beacon becomes a unit cube again. Explain why: the drawing override comes from one ShapeControls.Size value, not a property on each object. This is a deliberate product failure, not a compiler error. Restore the unit preview with Backspace and the original selection with Tab. Record the two observed sizes. The recipe, per-object editing and format lessons that follow repair this missing ownership in stages.

For a separate rendering defect, temporarily change only DrawCubeWires to use 1,1,1. Press T and compare the edges against the filled shape. Restore size.X, size.Y, size.Z. A successful build cannot diagnose this mismatch; you need the picture.

## Independent task: preview a bridge support

In a separate practice copy choose a support's width, height and depth. Write its expected bottom height before running. Preview it with the controls, position it so its bottom meets the grid and record dimensions and center. Then move the camera without changing those values. Explain why perspective changes apparent proportions but not world dimensions. Keep movement edits and the temporary preview separately identified in your evidence.

```hints
nudge: A full height of 3 needs its center at Y=1.5 to sit on the grid.
concept: Position locates the center; dimensions describe extent around it. Camera projection is a third, separate operation.
shape: Choose dimensions within the preview limits, compute center Y as height/2 and use quarter-unit moves. Record one fixed set of world values with two camera views.
```

### Explain and transfer

Show tile and trunk observations, the wire mismatch you repaired and your independently dimensioned support. Explain why Undo and the saved file cannot restore this preview. The executable checks establish build compatibility and the existing scene/storage rules; they do not establish correct native input delivery, visual alignment or durable dimensions. Those require the observations here and the next lessons' new checks. Close the native window before continuing.
