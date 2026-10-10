---
title: Give scene editing visible controls and keyboard selection
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

The scene/session operations now create and remove objects. Connect them to the studio without duplicating their rules. First complete Create and delete scene objects: this lesson uses its operations in the same project.


By the end, you should be able to: Verify that keyboard selection and pointer rows refer to the same IDs across a page boundary.

## Show controls and keep the selected row visible

Replace Studio/EditorPanels.cs. VisibleRows limits a page to ten rows. VisibleStart locates the selected object and uses integer division to choose the page containing it: index 12 is on the page starting at 10. This is intentional whole-number division, unlike dividing elapsed time in the earlier motion experiment.

```predict
question: If the selected object is at index 12 and a page holds ten rows, what is the first index on its page?
answer: 10
explain: Integer division gives 12 / 10 = 1; multiplying by 10 gives the page start. Local row 2 then refers to global index 12. Selection stores an ID; indices are only used to lay out the list.
```

The drawing code adds the page start to each local row index. It shows an explicit empty-selection message and two action rectangles. We will use those same rectangles for input. Tab advances to objects on the next page, including objects that would otherwise lie below the fixed panel. This is paging, not a full scrolling hierarchy.

```csharp edit=Studio/EditorPanels.cs mode=replace
using Raylib_cs;

namespace Studio3D;

public static class EditorPanels
{
    public const int VisibleRows = 10;
    public static Rectangle AddButton => new(16, 500, 208, 30);
    public static Rectangle DeleteButton => new(16, 540, 208, 30);

    public static int VisibleStart(Scene scene, EditorSession editor)
    {
        for (int i = 0; i < scene.Objects.Count; i++)
            if (scene.Objects[i].Id == editor.SelectedId) return i / VisibleRows * VisibleRows;
        return 0;
    }

    public static Rectangle ObjectRow(int index) => new(16, 80 + index * 36, 208, 30);

    public static void Draw(Scene scene, EditorSession editor)
    {
        Raylib.DrawRectangle(0, 0, 240, 700, Color.DarkBlue);
        Raylib.DrawText("SCENE OBJECTS", 16, 24, 20, Color.White);
        int first = VisibleStart(scene, editor);
        for (int i = 0; i < VisibleRows && first + i < scene.Objects.Count; i++)
        {
            SceneObject item = scene.Objects[first + i];
            Rectangle row = ObjectRow(i);
            Raylib.DrawRectangleRec(row, item.Id == editor.SelectedId ? Color.Blue : Color.DarkGray);
            Raylib.DrawText(item.Name, 24, (int)row.Y + 5, 18, Color.White);
        }
        Raylib.DrawText("Tab: next object/page", 16, 460, 16, Color.White);
        Raylib.DrawRectangleRec(AddButton, Color.Blue);
        Raylib.DrawText("N: Add cube", 24, 506, 18, Color.White);
        Raylib.DrawRectangleRec(DeleteButton, editor.Selected is null ? Color.DarkGray : Color.Blue);
        Raylib.DrawText("Delete selected", 24, 546, 18, Color.White);
        Raylib.DrawText("Delete: remove object", 16, 590, 16, Color.White);
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
        if (selected is null) Raylib.DrawText("No object selected", 836, 80, 18, Color.White);
        Raylib.DrawText("Click an object name", 836, 280, 18, Color.White);
        Raylib.DrawText("Left/Right: X", 836, 316, 18, Color.White);
        Raylib.DrawText("PageDown/PageUp: Y", 836, 352, 18, Color.White);
        Raylib.DrawText("Down/Up: Z", 836, 388, 18, Color.White);
        Raylib.DrawText("Each press: 0.25 units", 836, 436, 18, Color.White);
        Raylib.DrawText("Not saved yet", 836, 500, 18, Color.Gold);
    }
}
```

The grey delete button has no valid target in an empty scene. The scene/session method still checks the request, even if someone sends the input anyway. A disabled-looking control alone is not validation.

## Extract input before adding more controls

Create Studio/StudioInput.cs. The existing input block now has several responsibilities, so we move it into a named operation. Handle receives the scene and editor session explicitly. It observes input and requests edits; it does not mutate the list or draw a frame.

The N and Delete keys and the matching buttons call the same operations. The object-row click loop uses the same page start as rendering. Pressing Tab calls SelectNext. IsKeyPressed makes creation a discrete press instead of creating one cube every frame while N is held.

```csharp edit=Studio/StudioInput.cs mode=replace
using System.Numerics;
using Raylib_cs;

namespace Studio3D;

public static class StudioInput
{
    public static void Handle(Scene scene, EditorSession editor)
    {
        if (Raylib.IsKeyPressed(KeyboardKey.Tab)) editor.SelectNext();
        if (Raylib.IsKeyPressed(KeyboardKey.N)) editor.TryAdd("Cube", new Vector3(0, 0.5f, 0));
        if (Raylib.IsKeyPressed(KeyboardKey.Delete)) editor.TryDeleteSelected();
        if (Raylib.IsMouseButtonPressed(MouseButton.Left))
        {
            var mouse = Raylib.GetMousePosition();
            int first = EditorPanels.VisibleStart(scene, editor);
            for (int row = 0; row < EditorPanels.VisibleRows && first + row < scene.Objects.Count; row++)
                if (Raylib.CheckCollisionPointRec(mouse, EditorPanels.ObjectRow(row)))
                    editor.TrySelect(scene.Objects[first + row].Id);
            if (Raylib.CheckCollisionPointRec(mouse, EditorPanels.AddButton))
                editor.TryAdd("Cube", new Vector3(0, 0.5f, 0));
            if (Raylib.CheckCollisionPointRec(mouse, EditorPanels.DeleteButton))
                editor.TryDeleteSelected();
        }
        Vector3 delta = Vector3.Zero;
        if (Raylib.IsKeyPressed(KeyboardKey.Right)) delta.X += 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.Left)) delta.X -= 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.PageUp)) delta.Y += 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.PageDown)) delta.Y -= 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.Up)) delta.Z += 0.25f;
        if (Raylib.IsKeyPressed(KeyboardKey.Down)) delta.Z -= 0.25f;
        if (delta != Vector3.Zero) editor.TryMoveSelected(delta);
    }
}
```

New cubes start at the origin at half a unit high. They can overlap existing cubes; move them with the position controls. Automatic placement, unique display names and collision-free placement are separate future requirements.

## Connect and observe the complete workflow

Replace Studio/Program.cs. Its input section becomes one Handle call; rendering and cleanup remain where they were. Build, then run Studio.

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

Raylib.InitWindow(1100, 700, "Your 3D Studio - Create and Delete");
Raylib.SetTargetFPS(60);
try
{
    while (!Raylib.WindowShouldClose())
    {
        StudioInput.Handle(scene, editor);

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

```check
run "dotnet build Studio" exit=0 timeout=120
run "dotnet run --project Checks" exit=0 stdout="LIFECYCLE CHECKS PASSED" timeout=120
```

Press N, move the new cube, select another object and delete it. Use Tab to cycle selection. Delete everything and require an empty list and No object selected, then add a cube again. Add enough cubes to reach a second page; verify Tab reveals the selected name there. Close the window when done. These observations supplement the tests; they are not automated evidence of native input or accessibility.

Restarting still loses edits: saving is not implemented. Deletion has no undo yet; the next lesson builds that recovery mechanism.

## Independent task: test the visible page boundary

In a practice copy create twelve objects and cycle selection using Tab. Describe which row each selected ID should occupy at indices 9, 10 and 11. Add a small rendering-helper test in a separate graphics-referencing test project, or record the manual observations without claiming they are automated. Verify the drawn row and click target agree on page two. Check that an empty scene still accepts creation.

```hints
nudge: Compute the first index on each page, then subtract it from the selected object's index to find the local row.
concept: A viewport row is a temporary representation, not an object identity. Rendering and hit testing must use the same index mapping.
shape: For indices 9, 10 and 11, expect page starts 0, 10 and 10 and local rows 9, 0 and 1. Use the shared VisibleStart and ObjectRow helpers; select the second-page rows and compare the highlighted ID and inspector values.
```

### Explain and transfer

Choose a list size or boundary different from the hinted example, then record selected IDs, page starts and local rows around that boundary. Select a visible row on the second page and compare the highlighted name with the inspector. Explain why the local row number is not a persistent identity. Label human observations separately from automated checks.

Keep a brief record of your prediction, actual result, explanation and independently chosen change. Try the explanation with the reference closed; reopen it or use hints when needed, then retry the part you could not explain. A green guided check establishes its named behavior, not independent understanding.
