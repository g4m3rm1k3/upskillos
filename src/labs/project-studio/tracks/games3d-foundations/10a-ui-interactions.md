---
title: Make polished controls explain what they will do
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

The new layout groups the selected box's properties. Now make it behave like a clear tool: hovering identifies available actions, unavailable history explains itself and shape presets can be clicked as well as triggered by keys. A pleasing screenshot is only one state of an interface.

By the end, you can implement shared mouse/keyboard preset commands, distinguish rejected actions from unchanged values and keep long labels inside their regions. Prerequisites: the layout lesson, box editing/history and file-failure reporting. Hover feedback is not keyboard focus; global shortcuts remain our current keyboard path.

## Predict an unavailable command

Create an empty scene in a practice copy. Undo may be available if deleting the last object recorded history; Delete and the shape presets must be unavailable because there is no selection. Button appearance must follow those actual rules, not a generic scene-is-empty flag.

```predict
question: Deleting the last object leaves an empty scene with one undo entry. Which control should remain available?
choice: Undo, because it can restore the deleted object
choice: Delete, because the scene used to contain an object
answer: Undo, because it can restore the deleted object
explain: Availability is derived from the operation's current preconditions. Empty scene, missing selection and empty history are different facts.
```

## Measure text and show hover without changing data

Replace Studio/UiTheme.cs. FitText measures the actual font rather than assuming every character has the same width. It returns a shorter presentation string ending in dots when needed. It does not shorten an object's stored name. The range expression value[..index] takes a prefix; the index comes from StringInfo so the cut respects text-element boundaries instead of separating a surrogate pair or combining mark.

The loop tries progressively shorter prefixes. For these small labels this direct algorithm is adequate; a more complicated search needs a measured reason. The supplied bitmap font still has limited glyph coverage: safe string boundaries do not make missing glyphs appear. Localization, font loading and layout scaling remain later topics.

Button adds a hover border only when enabled. The label stays present when disabled. A different background alone cannot explain why a command is unavailable.

```csharp edit=Studio/UiTheme.cs mode=replace
using System.Globalization;
using Raylib_cs;

namespace Studio3D;

public static class UiTheme
{
    public static readonly Color Canvas = new(232, 236, 242, 255);
    public static readonly Color Panel = new(22, 28, 39, 255);
    public static readonly Color Raised = new(31, 40, 55, 255);
    public static readonly Color Border = new(48, 59, 78, 255);
    public static readonly Color TextColor = new(244, 246, 250, 255);
    public static readonly Color Muted = new(158, 175, 195, 255);
    public static readonly Color Accent = new(255, 198, 80, 255);
    public static readonly Color Selected = new(65, 50, 25, 255);
    public static readonly Color Danger = new(245, 150, 150, 255);
    public static Rectangle Viewport => new(240, 64, 580, 488);

    public static string FitText(string value, int width, int size)
    {
        if (Raylib.MeasureText(value, size) <= width) return value;
        const string suffix = "...";
        if (Raylib.MeasureText(suffix, size) > width) return "";
        int[] starts = StringInfo.ParseCombiningCharacters(value);
        for (int count = starts.Length - 1; count >= 0; count--)
        {
            string candidate = value[..starts[count]] + suffix;
            if (Raylib.MeasureText(candidate, size) <= width) return candidate;
        }
        return suffix;
    }

    public static void Text(string value, int x, int y, int width, int size, Color color)
    {
        if (width <= 0) return;
        Raylib.DrawText(FitText(value, width, size), x, y, size, color);
    }

    public static void Card(Rectangle area, Color fill)
    {
        Raylib.DrawRectangleRounded(area, 0.12f, 8, fill);
    }

    public static void Button(Rectangle area, string label, bool enabled)
    {
        bool hover = Raylib.CheckCollisionPointRec(Raylib.GetMousePosition(), area);
        Card(area, enabled && hover ? Border : enabled ? Raised : Panel);
        Raylib.DrawRectangleRoundedLines(area, 0.12f, 8, enabled && hover ? Accent : Border);
        Text(label, (int)area.X + 12, (int)area.Y + 12, (int)area.Width - 24, 16,
            enabled ? TextColor : Muted);
    }
}
```

## Share preset rectangles and give context at a stable location

Replace Studio/EditorPanels.cs. The new preset rectangles are used for drawing and hit detection. DrawHint explains hovered commands in the footer, including why Undo, Redo or Delete is unavailable. Hovering a row shows its full name when it fits the larger footer; very long names still receive ellipses. Essential key labels remain visible without hovering.

```csharp edit=Studio/EditorPanels.cs mode=replace
using Raylib_cs;

namespace Studio3D;

public static class EditorPanels
{
    public const int VisibleRows = 10;
    public static Rectangle TileButton => new(836, 360, 76, 40);
    public static Rectangle TrunkButton => new(920, 360, 76, 40);
    public static Rectangle UnitButton => new(1004, 360, 76, 40);
    public static Rectangle UndoButton => new(836, 576, 116, 40);
    public static Rectangle RedoButton => new(960, 576, 116, 40);
    public static Rectangle AddButton => new(16, 528, 208, 40);
    public static Rectangle DeleteButton => new(16, 576, 208, 40);

    public static int VisibleStart(Scene scene, EditorSession editor)
    {
        for (int i = 0; i < scene.Objects.Count; i++)
            if (scene.Objects[i].Id == editor.SelectedId) return i / VisibleRows * VisibleRows;
        return 0;
    }

    public static Rectangle ObjectRow(int index) => new(16, 112 + index * 36, 208, 32);

    public static void Value(string label, float value, int x, int y)
    {
        UiTheme.Card(new Rectangle(x, y, 76, 64), UiTheme.Raised);
        UiTheme.Text(label, x + 12, y + 8, 52, 14, UiTheme.Muted);
        UiTheme.Text(FormattableString.Invariant($"{value:F2}"), x + 12, y + 32, 52, 18, UiTheme.TextColor);
    }

    public static void Draw(Scene scene, EditorSession editor)
    {
        Raylib.DrawRectangle(0, 0, 240, 700, UiTheme.Panel);
        Raylib.DrawRectangle(820, 0, 280, 700, UiTheme.Panel);
        Raylib.DrawRectangle(240, 0, 580, 64, UiTheme.Panel);
        Raylib.DrawRectangle(240, 552, 580, 148, UiTheme.Panel);
        Raylib.DrawLine(240, 0, 240, 700, UiTheme.Border);
        Raylib.DrawLine(820, 0, 820, 700, UiTheme.Border);
        UiTheme.Text("PROJECT", 16, 24, 208, 20, UiTheme.TextColor);
        UiTheme.Text("SCENE OBJECTS", 16, 80, 208, 14, UiTheme.Muted);
        UiTheme.Text("SCENE VIEW", 264, 24, 400, 20, UiTheme.TextColor);
        UiTheme.Card(new Rectangle(720, 16, 76, 32), UiTheme.Selected);
        UiTheme.Text("EDIT", 736, 24, 48, 16, UiTheme.Accent);
        int first = VisibleStart(scene, editor);
        for (int i = 0; i < VisibleRows && first + i < scene.Objects.Count; i++)
        {
            SceneObject item = scene.Objects[first + i];
            Rectangle row = ObjectRow(i);
            bool selectedRow = item.Id == editor.SelectedId;
            UiTheme.Card(row, selectedRow ? UiTheme.Selected : UiTheme.Raised);
            if (selectedRow) Raylib.DrawRectangle((int)row.X, (int)row.Y + 6, 3, 20, UiTheme.Accent);
            UiTheme.Text($"{first + i + 1:00}", 28, (int)row.Y + 9, 24, 14, UiTheme.Muted);
            UiTheme.Text(item.Name, 64, (int)row.Y + 8, 148, 16, selectedRow ? UiTheme.Accent : UiTheme.TextColor);
        }
        if (scene.Objects.Count == 0) UiTheme.Text("No objects. Add a box.", 16, 120, 208, 16, UiTheme.Muted);
        UiTheme.Text($"{scene.Objects.Count} objects | Tab: next", 16, 488, 208, 14, UiTheme.Muted);
        UiTheme.Button(AddButton, "Add box [N]", true);
        UiTheme.Button(DeleteButton, "Delete [Del]", editor.Selected is not null);
        UiTheme.Text("Select by name or Tab", 16, 656, 208, 14, UiTheme.Muted);
        UiTheme.Text("INSPECTOR", 836, 24, 244, 20, UiTheme.TextColor);
        SceneObject? selected = editor.Selected;
        UiTheme.Text(selected?.Name ?? "No selection", 836, 80, 244, 20, selected is null ? UiTheme.Muted : UiTheme.Accent);
        UiTheme.Text("POSITION / WORLD UNITS", 836, 120, 244, 14, UiTheme.Muted);
        if (selected is not null)
        {
            Value("X", selected.Position.X, 836, 144);
            Value("Y", selected.Position.Y, 920, 144);
            Value("Z", selected.Position.Z, 1004, 144);
        }
        UiTheme.Text("Arrows: X/Z | PageUp/Down: Y", 836, 224, 244, 14, UiTheme.Muted);
        UiTheme.Text("BOX DIMENSIONS", 836, 256, 244, 14, UiTheme.Muted);
        UiTheme.Text("HISTORY", 836, 544, 244, 14, UiTheme.Muted);
        UiTheme.Button(UndoButton, "Undo [U]", editor.UndoCount > 0);
        UiTheme.Button(RedoButton, "Redo [R]", editor.RedoCount > 0);
        UiTheme.Text($"Undo {editor.UndoCount}  /  Redo {editor.RedoCount}", 836, 636, 244, 14, UiTheme.Muted);

    }

    public static void DrawHint(Scene scene, EditorSession editor)
    {
        var mouse = Raylib.GetMousePosition();
        string hint = "F5 Save | F9 Open | Escape closes";
        if (Raylib.CheckCollisionPointRec(mouse, UndoButton))
            hint = editor.UndoCount > 0 ? "Undo [U]: restore the previous edit" : "Undo unavailable: no earlier edit";
        else if (Raylib.CheckCollisionPointRec(mouse, RedoButton))
            hint = editor.RedoCount > 0 ? "Redo [R]: restore the undone edit" : "Redo unavailable: nothing undone";
        else if (Raylib.CheckCollisionPointRec(mouse, DeleteButton))
            hint = editor.Selected is null ? "Delete unavailable: select an object" : "Delete [Del]: remove selection; Undo restores it";
        else if (Raylib.CheckCollisionPointRec(mouse, AddButton))
            hint = "Add [N]: create and select a unit box";
        else if (Raylib.CheckCollisionPointRec(mouse, TileButton)) hint = "Tile [T]: width 2, height 0.25, depth 2";
        else if (Raylib.CheckCollisionPointRec(mouse, TrunkButton)) hint = "Trunk [B]: width 0.5, height 2, depth 0.5";
        else if (Raylib.CheckCollisionPointRec(mouse, UnitButton)) hint = "Unit [Backspace]: dimensions 1, 1, 1";
        else
        {
            int first = VisibleStart(scene, editor);
            for (int row = 0; row < VisibleRows && first + row < scene.Objects.Count; row++)
                if (Raylib.CheckCollisionPointRec(mouse, ObjectRow(row)))
                    hint = scene.Objects[first + row].Name;
        }
        UiTheme.Text(hint, 264, 672, 536, 14, UiTheme.Muted);
    }

}
```

## Send mouse and keyboard input through one preset operation

Replace Studio/ShapeControls.cs. ApplyPreset is shared by clicking and keyboard shortcuts. TryClickPreset accepts a point and returns whether a preset region handled it. A handled click is not the same as a successful edit: clicking an unavailable preset or the already-current recipe changes no scene/history. The feedback makes that difference visible. Drawing derives availability from Selected; the editor operation remains authoritative.

```csharp edit=Studio/ShapeControls.cs mode=replace
using System.Numerics;
using Raylib_cs;

namespace Studio3D;

public sealed class ShapeControls
{
    private readonly EditorSession editor;
    private string status = "Choose a box, then resize it";
    public bool Rejected { get; private set; }
    public string Status => status;
    public ShapeControls(EditorSession editor) { this.editor = editor; }

    private void ApplyPreset(BoxRecipe recipe)
    {
        Rejected = editor.Selected is null;
        if (Rejected) { status = "Select an object first"; return; }
        status = editor.TrySetSelectedBox(recipe) ? "Box changed; U undoes it" : "Already using these dimensions";
    }

    public bool TryClickPreset(Vector2 mouse)
    {
        BoxRecipe? recipe = null;
        if (Raylib.CheckCollisionPointRec(mouse, EditorPanels.TileButton)) recipe = new(new Vector3(2, 0.25f, 2));
        else if (Raylib.CheckCollisionPointRec(mouse, EditorPanels.TrunkButton)) recipe = new(new Vector3(0.5f, 2, 0.5f));
        else if (Raylib.CheckCollisionPointRec(mouse, EditorPanels.UnitButton)) recipe = new(Vector3.One);
        if (recipe is null) return false;
        ApplyPreset(recipe);
        return true;
    }

    public bool Handle()
    {
        if (Raylib.IsMouseButtonPressed(MouseButton.Left) && TryClickPreset(Raylib.GetMousePosition())) return true;
        BoxRecipe? preset = null;
        if (Raylib.IsKeyPressed(KeyboardKey.T)) preset = new(new Vector3(2, 0.25f, 2));
        else if (Raylib.IsKeyPressed(KeyboardKey.B)) preset = new(new Vector3(0.5f, 2, 0.5f));
        else if (Raylib.IsKeyPressed(KeyboardKey.Backspace)) preset = new(Vector3.One);
        if (preset is not null) { ApplyPreset(preset); return true; }
        float step = Raylib.IsKeyDown(KeyboardKey.LeftShift) ? -0.25f : 0.25f;
        Vector3 delta = Vector3.Zero;
        if (Raylib.IsKeyPressed(KeyboardKey.W)) delta.X = step;
        if (Raylib.IsKeyPressed(KeyboardKey.H)) delta.Y = step;
        if (Raylib.IsKeyPressed(KeyboardKey.D)) delta.Z = step;
        if (delta == Vector3.Zero) return false;
        Rejected = !editor.TryResizeSelected(delta);
        status = !Rejected ? "Box changed; U undoes it" :
            editor.Selected is null ? "Select an object first" : "Rejected: dimensions outside range";
        return true;
    }

    public void Draw()
    {
        SceneObject? selected = editor.Selected;
        if (selected is not null)
        {
            EditorPanels.Value("W", selected.Box.Size.X, 836, 280);
            EditorPanels.Value("H", selected.Box.Size.Y, 920, 280);
            EditorPanels.Value("D", selected.Box.Size.Z, 1004, 280);
        }
        UiTheme.Button(EditorPanels.TileButton, "Tile", selected is not null);
        UiTheme.Button(EditorPanels.TrunkButton, "Trunk", selected is not null);
        UiTheme.Button(EditorPanels.UnitButton, "Unit", selected is not null);
        UiTheme.Text("T", 864, 408, 40, 14, UiTheme.Muted);
        UiTheme.Text("B", 948, 408, 40, 14, UiTheme.Muted);
        UiTheme.Text("Backspace", 1004, 408, 76, 14, UiTheme.Muted);
        UiTheme.Text("W/H/D: grow | Shift: shrink", 836, 440, 244, 14, UiTheme.Muted);
        UiTheme.Text("Each dimension: >0 to 100", 836, 464, 244, 14, UiTheme.Muted);
        UiTheme.Text(Rejected ? "BOX ACTION REJECTED" : "LAST BOX ACTION", 264, 620, 536, 14,
            Rejected ? UiTheme.Danger : UiTheme.Muted);
        UiTheme.Text(status, 264, 644, 536, 16, UiTheme.TextColor);
    }
}
```

For input priority, file keys still win at the application boundary. Within shape controls, a preset click wins over a simultaneous shape key. A click outside those regions returns false and reaches the existing object-list and history controls. Do not handle every mouse click here, or selection will stop working.

## Represent file failure independently of its wording

Replace Studio/FileControls.cs. Failed is a read-only-to-callers outcome flag, set on a reported failure and cleared on success. Drawing can use it without guessing from the English status text. The visible FILE ACTION FAILED label carries the meaning even if the error color is hard to distinguish. This still describes the last file operation, not unsaved changes.

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
    public bool Failed { get; private set; }

    private bool TryOperation(bool save)
    {
        try
        {
            if (save) { store.Save(scene); status = "Save succeeded; later edits need another save"; }
            else { editor.ReplaceScene(store.Load()); status = "Open succeeded; edit history reset"; }
            Failed = false;
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
        Failed = true;
        status = "File operation failed; see terminal details";
        Console.Error.WriteLine(error.Message);
    }

    public void Draw()
    {
        UiTheme.Text(Failed ? "FILE ACTION FAILED" : "LAST FILE ACTION", 264, 564, 536, 14,
            Failed ? UiTheme.Danger : UiTheme.Muted);
        UiTheme.Text(status, 264, 588, 536, 16, UiTheme.TextColor);
    }
}

```

## Draw context after the other interface regions

Replace Studio/Program.cs. DrawHint is the only addition to the layout version. Draw order matters: contextual feedback is painted after the footer and stays visible.

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

Raylib.InitWindow(1100, 700, "Your 3D Studio - Layout and Hierarchy");
Raylib.SetTargetFPS(60);
try
{
    while (!Raylib.WindowShouldClose())
    {
        if (!files.Handle() && !shapes.Handle()) StudioInput.Handle(scene, editor);

        Raylib.BeginDrawing();
        Raylib.ClearBackground(UiTheme.Canvas);
        Rectangle viewport = UiTheme.Viewport;
        Raylib.BeginScissorMode((int)viewport.X, (int)viewport.Y, (int)viewport.Width, (int)viewport.Height);
        Raylib.BeginMode3D(camera);
        SceneDrawing.Draw(scene, editor.SelectedId);
        Raylib.EndMode3D();
        Raylib.EndScissorMode();
        EditorPanels.Draw(scene, editor);
        files.Draw();
        shapes.Draw();
        EditorPanels.DrawHint(scene, editor);
        Raylib.EndDrawing();
    }
}
finally { Raylib.CloseWindow(); }


```

```check
run "dotnet build Studio" exit=0 timeout=120
run "dotnet run --project Checks" exit=0 stdout="BOX STORAGE CHECKS PASSED" timeout=120
```

Run Studio. Compare clicking Tile with pressing T. Both must produce the same dimensions and one accepted history entry. Click Tile again: require unchanged dimensions and no new history. Undo and Redo the edit. Delete the final object: observe unavailable presets but available Undo, then restore it. Try a missing or corrupt file and inspect the error label; a subsequent valid save/open clears it. Close the window.

## Diagnose a good-looking broken button

Temporarily change the click test for TrunkButton to TileButton in TryClickPreset only. The displayed trunk button stays in place but no longer handles a click. Compare B with clicking Trunk to isolate the input path, restore the shared TrunkButton definition and retest. Do not move the drawn button to conceal a wrong hit target. In a separate practice copy remove the false return for an outside click; diagnose the object-list clicks it consumes and repair it.

## Independent task: extend a control coherently

In a separate practice copy add a Post preset with dimensions (0.25, 2, 0.25), a visible keyboard shortcut and a click region. Preserve the existing preset and history operations. Show normal, hovered, unavailable, no-op and accepted states. Record the original long object name before rendering, then prove it is unchanged afterward. Give a failed action an explicit explanation without depending on color alone.

```hints
nudge: Choose the new preset's rectangle before painting it, and check it does not overlap another region.
concept: Drawing, hit detection, command execution and feedback are parts of the same interaction contract. Reuse the validated session operation rather than assigning scene data from a button.
shape: Define one shared rectangle, route both the new key and that rectangle to ApplyPreset, then compare IDs, sizes and history counts for mouse/key, no-op and missing-selection cases.
```

### Explain and transfer

Show your independently added control's state table and the misaligned-hit failure you repaired. Explain why ellipses must never modify saved names and why hover is not keyboard focus. The checks establish compilation and the existing domain/storage contracts; native observations establish the tested appearances and input paths only when actually performed. We have not established screen-reader access, tab focus, font coverage, touch interaction, responsive layout or learner usability. Later UI lessons revisit these needs when the studio adds numeric entry, resizable views and game HUDs.
