---
title: Save and reopen your editor scene without hiding failures
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Connect the storage contract to the editor. F5 saves to scene.json in the command's current directory; F9 opens that file and replaces current unsaved edits. This simple fixed-path workflow arrives before dialogs, recent files, dirty-state tracking and backups.


By the end, you should be able to: Distinguish a rejected open, a valid empty scene and unsaved changes in the editor.

## Report file outcomes at the UI boundary

Create Studio/FileControls.cs. The constructor receives ISceneStore; the UI need not know whether it is backed by disk. Private readonly fields hold its collaborators. Handle gives file commands priority over movement. TrySave and TryOpen expose the same operations without reading input, so other controls and author checks can exercise them. Status exposes the last outcome without letting a caller rewrite it. Save wins if both keys arrive in the same frame. A failed open never calls ReplaceScene, preserving current objects and history.

```csharp edit=Studio/FileControls.cs mode=replace
using System.Text.Json;
using Raylib_cs;

namespace Studio3D;

public sealed class FileControls
{
    private readonly Scene scene;
    private readonly EditorSession editor;
    private readonly ISceneStore store;
    private string status = "F5: save | F9: open, replacing unsaved edits";

    public FileControls(Scene scene, EditorSession editor, ISceneStore store)
    {
        this.scene = scene; this.editor = editor; this.store = store;
    }

    public bool Handle()
    {
        bool save = Raylib.IsKeyPressed(KeyboardKey.F5);
        bool open = Raylib.IsKeyPressed(KeyboardKey.F9);
        if (!save && !open) return false;
        TryOperation(save);
        return true;
    }

    public bool TrySave() => TryOperation(true);
    public bool TryOpen() => TryOperation(false);
    public string Status => status;

    private bool TryOperation(bool save)
    {
        try
        {
            if (save) { store.Save(scene); status = "Save succeeded; later edits need another save"; }
            else { editor.ReplaceScene(store.Load()); status = "Open succeeded; edit history reset"; }
            return true;
        }
        catch (InvalidDataException error) { Report(error); }
        catch (IOException error) { Report(error); }
        catch (UnauthorizedAccessException error) { Report(error); }
        catch (JsonException error) { Report(error); }
        return false;
    }

    private void Report(Exception error)
    {
        status = "File operation failed; see terminal details";
        Console.Error.WriteLine(error.Message);
    }

    public void Draw() => Raylib.DrawText(status, 260, 54, 16, Color.DarkBlue);
}
```

Catch expected I/O, permission and JSON failures here, where there is a user to notify. InvalidDataException is caught explicitly; sharing the System.IO namespace does not make it derive from IOException. Catch clauses follow type inheritance, not namespace names. Do not swallow arbitrary programming exceptions as file errors. The status describes the last operation, not whether the current scene matches the disk. After a successful save, subsequent edits still need another save. Error details go to the terminal; a future diagnostics panel can present them without overflowing the viewport.

## Wire one store into the application

Replace Studio/Program.cs. The composition point chooses JsonSceneStore and passes it to FileControls. No container or global service locator is needed. The printed absolute path helps distinguish a missing file from a different working directory. The app still starts with the demonstration scene; opening is explicit.

```predict
question: You save, move a cube, then press F9. Which position should appear?
choice: The position stored at the last successful save
choice: The newer unsaved position
answer: The position stored at the last successful save
explain: F9 replaces the active scene with validated file data and clears history. This version warns in its control label but has no unsaved-change dialog. Save another copy outside the practice workflow before experimenting with a valuable file.
```

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
        if (!files.Handle()) StudioInput.Handle(scene, editor);

        Raylib.BeginDrawing();
        Raylib.ClearBackground(Color.RayWhite);
        Raylib.BeginMode3D(camera);
        SceneDrawing.Draw(scene, editor.SelectedId);
        Raylib.EndMode3D();
        EditorPanels.Draw(scene, editor);
        Raylib.DrawText("YOUR 3D STUDIO | Escape closes", 260, 20, 20, Color.DarkBlue);
        files.Draw();
        Raylib.EndDrawing();
    }
}
finally { Raylib.CloseWindow(); }
```

## Replace the obsolete saving label

Replace Studio/EditorPanels.cs. Only the former Not saved yet label changes to F5 save / F9 open. Existing controls, object paging and history indicators remain. Do not label the scene Saved after later edits without implementing dirty-state tracking.

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
        Raylib.DrawText("F5 save / F9 open", 836, 500, 18, Color.Gold);
        Raylib.DrawRectangleRec(UndoButton, editor.UndoCount > 0 ? Color.Blue : Color.DarkGray);
        Raylib.DrawRectangleRec(RedoButton, editor.RedoCount > 0 ? Color.Blue : Color.DarkGray);
        Raylib.DrawText("U: Undo", 844, 556, 18, Color.White);
        Raylib.DrawText("R: Redo", 964, 556, 18, Color.White);
        Raylib.DrawText($"Undo: {editor.UndoCount} | Redo: {editor.RedoCount}", 836, 606, 16, Color.White);
    }
}
```

```check
run "dotnet build Studio" exit=0 timeout=120
run "dotnet run --project Checks" exit=0 stdout="STORE CHECKS PASSED" timeout=120
```

Run Studio from the same folder each time. Create and move a cube, press F5, close and restart, then press F9. Require the saved objects and positions, first-object selection and empty history. In a disposable practice folder make the scene file malformed, then open: require a visible failure, terminal details and unchanged active objects/history. Restore the good file. These manual cases establish input/reporting only when actually observed; headless storage checks do not prove key delivery.

## Independent task: distinguish failure from unsaved work

In a practice folder try a missing file, an unsupported version and a valid empty scene. Write the expected outcome for each before running. Record the actual scene and history after each attempt. Propose a dirty-state design that can return to clean after undo, and explain why UndoCount alone cannot tell whether a scene matches its saved file. Do not implement autosave by silently overwriting the user's only good file.

```hints
nudge: An empty scene is valid data. Missing or invalid data is a failure, not a request to empty the editor.
concept: The last operation status and the current scene's relationship to saved data are separate state. History length is not a file identity or content comparison.
shape: Compare valid saved content with current content, or track a saved revision alongside history. For the practice observations assert invalid opens preserve the previous state while a valid empty open clears objects and history.
```

### Explain and transfer

Record the actual scene and history for your three open cases. Explain why an empty scene is success rather than an error, and why a successful save message does not mean later edits are saved. Give one counterexample to using UndoCount as a dirty flag.

Keep a brief record of your prediction, actual result, explanation and independently chosen change. Try the explanation with the reference closed; reopen it or use hints when needed, then retry the part you could not explain. A green guided check establishes its named behavior, not independent understanding.
