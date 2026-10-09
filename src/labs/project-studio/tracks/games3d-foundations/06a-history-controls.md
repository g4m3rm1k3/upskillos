---
title: Verify history branches and add undo and redo controls
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Owned snapshots and two stacks now restore a basic move. Follow Own snapshots and model undo first. In this lesson challenge the contracts with creation, deletion, branching and failed edits, then connect Undo and Redo to visible controls.

## Check order, identities and restoration

```predict
question: After undoing creation and then redoing it, should the restored object have the same ID?
choice: Yes, redo restores the captured object
choice: No, redo creates a replacement with a new ID
answer: Yes, redo restores the captured object
explain: A new ID would break references and selection even if the cube looked identical. Redo restores stored data; it does not call Add again.
```

Create Checks/HistoryChecks.cs. Two moves distinguish a stack from a queue, which would return the oldest state first. A delete-and-restore case checks the exact ID, original ordering and position, rather than merely that another cube appeared. Redo creation must reuse the captured ID, not call Add and generate a new object.

```csharp edit=Checks/HistoryChecks.cs mode=replace
using System.Numerics;
using Studio3D;

public static class HistoryChecks
{
    public static void Run(Action<bool, string> check)
    {
        Scene scene = new();
        Guid first = scene.Add("First", Vector3.Zero);
        Guid second = scene.Add("Second", Vector3.UnitX);
        EditorSession editor = new(scene);
        check(!editor.TryUndo() && !editor.TryRedo(), "Empty history accepted");
        editor.TrySelect(second);
        check(editor.UndoCount == 0, "Selection recorded an edit");
        editor.TryMoveSelected(new Vector3(0.25f, 0, 0));
        editor.TryMoveSelected(new Vector3(0, 0.5f, 0));
        check(editor.UndoCount == 2, "Moves were not recorded separately");
        check(editor.TryUndo() && editor.Selected?.Position == new Vector3(1.25f, 0, 0), "Undo did not restore latest move");
        check(editor.TryUndo() && editor.Selected?.Position == Vector3.UnitX, "Undo did not restore first move");
        check(editor.TryRedo() && editor.Selected?.Position == new Vector3(1.25f, 0, 0), "Redo order is wrong");
        check(editor.TryRedo() && editor.Selected?.Position == new Vector3(1.25f, 0.5f, 0), "Redo did not restore final position");
        check(scene.Objects[0].Id == first && scene.Objects[0].Position == Vector3.Zero, "History changed unrelated object");
        editor.TryDeleteSelected();
        check(scene.Objects.Count == 1 && editor.SelectedId == first, "Delete transition is wrong");
        check(editor.TryUndo() && editor.SelectedId == second, "Undo did not restore deleted selection");
        check(scene.Objects.Count == 2 && scene.Objects[1].Id == second, "Undo recreated identity or order");
        check(editor.Selected?.Position == new Vector3(1.25f, 0.5f, 0), "Undo lost deleted position");
        check(editor.TryRedo() && scene.Objects.Count == 1, "Redo did not delete again");
        editor.TryAdd("New", new Vector3(3, 0, 0));
        Guid created = editor.SelectedId;
        check(editor.TryUndo() && scene.Objects.Count == 1 && editor.SelectedId == first, "Undo creation is wrong");
        check(editor.TryRedo() && editor.SelectedId == created && scene.Objects[1].Id == created, "Redo creation changed identity");
        Console.WriteLine("HISTORY CHECKS PASSED");
    }
}
```

## Check branches, failures and no-op edits

Create Checks/HistoryBranchChecks.cs. After Undo, a rejected or unchanged operation must leave the redo future intact. After a different successful move, redo must be unavailable. The final cases distinguish a finite change too small to affect a float from a change that overflows to infinity; neither should produce history.

```csharp edit=Checks/HistoryBranchChecks.cs mode=replace
using System.Numerics;
using Studio3D;

public static class HistoryBranchChecks
{
    public static void Run(Action<bool, string> check)
    {
        Scene scene = new();
        Guid id = scene.Add("Only", Vector3.Zero);
        EditorSession editor = new(scene);
        editor.TryMoveSelected(Vector3.UnitX);
        editor.TryUndo();
        check(editor.RedoCount == 1 && editor.UndoCount == 0, "Undo did not create redo state");
        check(!editor.TryMoveSelected(Vector3.Zero), "No-op was recorded");
        check(!editor.TryMoveSelected(new Vector3(float.NaN, 0, 0)), "Invalid move accepted");
        check(!editor.TryAdd(" ", Vector3.Zero), "Invalid creation accepted");
        check(!editor.TrySelect(Guid.NewGuid()), "Missing selection accepted");
        check(editor.RedoCount == 1 && editor.UndoCount == 0, "Failed or no-op action changed history");
        editor.TrySelect(id);
        check(editor.RedoCount == 1, "Selection cleared redo");
        editor.TryMoveSelected(Vector3.UnitY);
        check(editor.RedoCount == 0 && !editor.TryRedo(), "New edit kept obsolete redo");
        check(editor.TryUndo() && editor.Selected?.Position == Vector3.Zero, "Branch snapshot was mutated");
        check(editor.TryRedo() && editor.Selected?.Position == Vector3.UnitY, "Branch redo is wrong");
        editor.TryDeleteSelected();
        check(editor.Selected is null && scene.Objects.Count == 0, "Delete final object failed");
        int count = editor.UndoCount;
        check(!editor.TryDeleteSelected() && editor.UndoCount == count, "Empty deletion recorded history");
        check(editor.TryUndo() && editor.SelectedId == id, "Undo empty scene lost identity");
        check(editor.TryRedo() && editor.Selected is null, "Redo empty scene failed");
        Scene large = new();
        large.Add("Large", new Vector3(float.MaxValue, 0, 0));
        EditorSession precision = new(large);
        check(!precision.TryMoveSelected(Vector3.UnitX) && precision.UndoCount == 0, "Rounded-away move recorded history");
        check(!precision.TryMoveSelected(new Vector3(float.MaxValue, 0, 0)) && precision.UndoCount == 0, "Overflow recorded history");
        Console.WriteLine("HISTORY BRANCH CHECKS PASSED");
    }
}
```

A failed request can still allocate a temporary snapshot in this small implementation. It must not mutate either stack. Eliminating that allocation is a later optimization, justified by measurements rather than by weakening validation.

## Run and deliberately challenge the assertions

Append these calls to Checks/Program.cs. Run and require both new success messages. Temporarily change the branch test's expected Y position to UnitX; require Branch redo is wrong with a nonzero exit, then restore UnitY and rerun. In Core/EditorHistory.cs temporarily omit redo.Clear from Remember and observe New edit kept obsolete redo. Restore it before continuing.

```csharp edit=Checks/Program.cs mode=append
HistoryChecks.Run(Check);
HistoryBranchChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="HISTORY BRANCH CHECKS PASSED" timeout=120
```

Checks establish these history contracts, including empty scenes. They do not establish memory limits, file persistence, keyboard delivery or that a snapshot of future mutable component data would be independent.

## Show recovery actions and route them before other edits

Replace Studio/EditorPanels.cs. The new buttons show Undo and Redo, their keyboard shortcuts U and R, and both stack counts. Grey means unavailable, but the session still validates attempts. The rest of the object list and position inspector are unchanged.

```csharp edit=Studio/EditorPanels.cs mode=replace
using Raylib_cs;

namespace Studio3D;

public static class EditorPanels
{
    public const int VisibleRows = 10;
    public static Rectangle UndoButton => new(836, 550, 112, 30);
    public static Rectangle RedoButton => new(956, 550, 112, 30);
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
        Raylib.DrawRectangleRec(UndoButton, editor.UndoCount > 0 ? Color.Blue : Color.DarkGray);
        Raylib.DrawRectangleRec(RedoButton, editor.RedoCount > 0 ? Color.Blue : Color.DarkGray);
        Raylib.DrawText("U: Undo", 844, 556, 18, Color.White);
        Raylib.DrawText("R: Redo", 964, 556, 18, Color.White);
        Raylib.DrawText($"Undo: {editor.UndoCount} | Redo: {editor.RedoCount}", 836, 606, 16, Color.White);
    }
}
```

## Give history input priority within a frame

Replace Studio/StudioInput.cs. A history request returns from Handle immediately, so simultaneous movement input does not create another edit in the same frame. Pointer controls use the same rectangles as drawing. This prototype uses U and R across operating systems; platform-standard modifier shortcuts can be added after we teach input binding and focus.

```csharp edit=Studio/StudioInput.cs mode=replace
using System.Numerics;
using Raylib_cs;

namespace Studio3D;

public static class StudioInput
{
    public static void Handle(Scene scene, EditorSession editor)
    {
        if (Raylib.IsKeyPressed(KeyboardKey.U)) { editor.TryUndo(); return; }
        if (Raylib.IsKeyPressed(KeyboardKey.R)) { editor.TryRedo(); return; }
        if (Raylib.IsKeyPressed(KeyboardKey.Tab)) editor.SelectNext();
        if (Raylib.IsKeyPressed(KeyboardKey.N)) editor.TryAdd("Cube", new Vector3(0, 0.5f, 0));
        if (Raylib.IsKeyPressed(KeyboardKey.Delete)) editor.TryDeleteSelected();
        if (Raylib.IsMouseButtonPressed(MouseButton.Left))
        {
            var mouse = Raylib.GetMousePosition();
            if (Raylib.CheckCollisionPointRec(mouse, EditorPanels.UndoButton)) { editor.TryUndo(); return; }
            if (Raylib.CheckCollisionPointRec(mouse, EditorPanels.RedoButton)) { editor.TryRedo(); return; }
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

```check
run "dotnet build Studio" exit=0 timeout=120
run "dotnet run --project Checks" exit=0 stdout="HISTORY BRANCH CHECKS PASSED" timeout=120
```

Run Studio. Create a cube, move it, delete it, then undo each action and redo them in order. Watch identities through tests and positions through the inspector. Undo a move, change selection and redo; then undo again and make a different move, requiring Redo to become unavailable. Delete the final object, undo and redo, then try an empty-history action. Close the window afterward.

This history is kept in memory with no size limit and no save file. That tradeoff is acceptable for the teaching scene, not a claim of production reliability. The next milestone will add versioned persistence with failure-safe replacement. Undo is useful recovery from edits; it is not a backup or crash recovery system.

## Independent task: prove history preserves ownership

In a separate practice copy create three objects, two with identical names. Delete the middle object, undo, edit a survivor, then undo and redo that edit. Assert exact IDs, original order, untouched coordinates and selection at each state. Add an invalid creation after Undo and prove it preserves redo. Explain why comparing only Count would miss an identity bug.

```hints
nudge: Write the expected list of IDs before writing the test. Keep a saved expected position for the object you will not edit.
concept: Independent collections prevent list mutation from changing a stored snapshot. Immutable records preserve the values inside those collections; a mutable nested object would need more work.
shape: Arrange three IDs, delete the second, undo and compare all three IDs in order. Move the first, undo/redo that movement and compare the third's ID and position each time. After another Undo, attempt an invalid Add and assert the redo count and restored outcome remain unchanged.
```
