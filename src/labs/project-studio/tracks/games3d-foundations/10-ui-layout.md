---
title: Make the studio readable with layout and visual hierarchy
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Your editor can keep a tile and trunk across restarts. Now use it to select a box, inspect its position, resize it, undo and reopen. Before changing the UI, note where your eyes travel. The current shape controls sit below the scene while positions live on the right. Repeated saturated panels compete with the object being edited.

By the end, you can organize related controls, apply consistent spacing and explain a visual redesign using that actual editing task. Prerequisites: saved box dimensions and the earlier shared click-rectangle lesson. This is a fixed 1100 by 700 native interface; resizing, custom fonts and full accessibility support are later work.

## Sketch a hierarchy before choosing colors

Give the left panel one job: find and manage objects. Give the right panel one job: inspect the selected object. Keep the middle for the scene, with file and box outcomes below it. Put dimensions next to position because both describe the selected object. Give headings more prominence than helper text.

Use 16 pixels of panel padding. A 208-pixel object row fits inside a 240-pixel panel because 16 + 208 + 16 = 240. On the right, three 76-pixel value cards with two 8-pixel gaps occupy 244 pixels. They fit inside the 280-pixel panel with 16 pixels on each side and a little spare room. These numbers form a spacing system, not unrelated offsets. Screen pixels and world units remain different.

```predict
question: You move the Add button down by 28 pixels. What else must move?
choice: Its click rectangle, through the same shared definition
choice: Only its label; input can keep the old rectangle
answer: Its click rectangle, through the same shared definition
explain: The button is an interaction region as well as a drawing. Drawing and input must use the same rectangle, or a visually correct redesign becomes a broken interface.
```

## Give colors and drawing helpers meaningful names

Create Studio/UiTheme.cs. A design token is a named value used consistently: Panel is a background role, Accent marks selection, and Muted reduces helper-text emphasis. Color is a graphics value, so it belongs in Studio rather than the scene model. static readonly permits runtime Color construction while preventing ordinary reassignment; const cannot hold this constructed Color value.

The initial Text helper clips a line to its allotted screen region. It protects nearby controls but may hide the end of a long name. The next lesson replaces silent clipping with measured ellipses. Card draws a modest rounded shape; a radius is not a substitute for clear grouping. Button draws its enabled or unavailable appearance; the tested editor operation still decides whether an action can occur.

```csharp edit=Studio/UiTheme.cs mode=replace
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

    public static void Text(string value, int x, int y, int width, int size, Color color)
    {
        if (width <= 0) return;
        Raylib.BeginScissorMode(x, y, width, size + 4);
        Raylib.DrawText(value, x, y, size, color);
        Raylib.EndScissorMode();
    }

    public static void Card(Rectangle area, Color fill)
    {
        Raylib.DrawRectangleRounded(area, 0.12f, 8, fill);
    }

    public static void Button(Rectangle area, string label, bool enabled)
    {
        Card(area, enabled ? Raised : Panel);
        Raylib.DrawRectangleRoundedLines(area, 0.12f, 8, Border);
        Text(label, (int)area.X + 12, (int)area.Y + 12, (int)area.Width - 24, 16,
            enabled ? TextColor : Muted);
    }
}
```

Keep important text readable. Use the W3C [contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) as a design reference: ordinary text uses a 4.5:1 contrast threshold in that web standard. Do not infer contrast from hue or a screenshot alone. Native bitmap text sizes are not CSS points, and a readable palette does not establish complete accessibility. The supplied font keeps setup unchanged; font assets, scaling and glyph coverage need their own later lesson.

## Align object rows and inspector groups

Replace Studio/EditorPanels.cs. Keep the public rectangle names because StudioInput already uses them. Change the geometry once and drawing and hit detection both follow. Numbered rows help distinguish two objects with the same label; the IDs still establish identity. Selection has a side marker as well as color. Value cards are readouts, not editable text fields: the visible key hints explain how to change their values.

```csharp edit=Studio/EditorPanels.cs mode=replace
using Raylib_cs;

namespace Studio3D;

public static class EditorPanels
{
    public const int VisibleRows = 10;
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
        UiTheme.Text("F5 Save  |  F9 Open", 264, 672, 536, 14, UiTheme.Muted);
    }
}
```

Do not create a new Scene or EditorSession inside Draw. Styling observes state. Disabled buttons keep readable labels; losing contrast is not our only way to communicate availability. The next lesson adds specific explanations and hover states.

## Move dimension readouts into the inspector

Replace Studio/ShapeControls.cs. Handle is unchanged. Only Draw changes: dimensions join position, helper keys stay nearby and the last box outcome gets a dedicated footer line.

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
        SceneObject? selected = editor.Selected;
        if (selected is not null)
        {
            EditorPanels.Value("W", selected.Box.Size.X, 836, 280);
            EditorPanels.Value("H", selected.Box.Size.Y, 920, 280);
            EditorPanels.Value("D", selected.Box.Size.Z, 1004, 280);
        }
        UiTheme.Text("W/H/D: grow | Shift: shrink", 836, 368, 244, 14, UiTheme.Muted);
        UiTheme.Text("T: tile  |  B: trunk", 836, 392, 244, 14, UiTheme.Muted);
        UiTheme.Text("Backspace: unit box", 836, 416, 244, 14, UiTheme.Muted);
        UiTheme.Text("Each dimension: >0 to 100", 836, 448, 244, 14, UiTheme.Muted);
        UiTheme.Text("LAST BOX ACTION", 264, 620, 536, 14, UiTheme.Muted);
        UiTheme.Text(status, 264, 644, 536, 16, UiTheme.TextColor);
    }
}
```

## Give file outcomes a stable place

Replace Studio/FileControls.cs. File handling and exceptions remain unchanged; Draw now uses the theme and its own footer area. LAST FILE ACTION describes the previous operation. It is not a dirty-state indicator or proof that current content matches the disk.

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

    public void Draw()
    {
        UiTheme.Text("LAST FILE ACTION", 264, 564, 536, 14, UiTheme.Muted);
        UiTheme.Text(status, 264, 588, 536, 16, UiTheme.TextColor);
    }
}

```

## Clip world drawing before painting the interface

Replace Studio/Program.cs. Clear the scene to a quiet canvas color. BeginScissorMode restricts pixels to the middle scene area and EndScissorMode ends that restriction before UI drawing. This crops the existing full-window projection; it does not create a new camera aspect ratio or a resizable render target. We keep that limitation explicit until the viewport/resource lesson. The [raylib drawing reference](https://www.raylib.com/cheatsheet/cheatsheet.html) names these drawing operations; our package remains pinned.

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
        Raylib.EndDrawing();
    }
}
finally { Raylib.CloseWindow(); }


```

```check
run "dotnet build Studio" exit=0 timeout=120
run "dotnet run --project Checks" exit=0 stdout="BOX STORAGE CHECKS PASSED" timeout=120
```

Run Studio. Repeat the opening task: select, inspect, resize, undo and reopen. Compare the eye movements and locate each result. Then temporarily remove EndScissorMode immediately after EndMode3D. Observe panel backgrounds missing outside the scene area, restore it and explain why drawing state must end at the intended boundary. Text helpers also change scissor state; they do not restore a previous clip for you. A successful compile cannot diagnose that visible defect.

## Independent task: defend a visual design choice

In a separate practice copy choose a different accent and alter the spacing of one group. Keep the shared hit rectangles and all editing behavior. Compare the same task in the original and modified versions. Include an empty scene and two identically named objects. Check text/background contrast for your normal and selected rows; explain one change that improved clarity and one that made it worse. Do not rate a theme solely by how much you like its colors.

```hints
nudge: Change one group first, then repeat the same task rather than rearranging everything at once.
concept: Hierarchy directs attention; alignment and proximity communicate which labels and values belong together. Consistency makes the next control easier to understand.
shape: Record task steps and observed search mistakes, alter one token or shared rectangle, rerun and compare. Capture normal, selected and empty states with the same window size.
```

### Explain and transfer

Show before/after observations, the clipping failure and repair, and an independently chosen design change. Explain why numeric readouts should not look like text-entry fields and why a muted label still needs readable contrast. The checks establish build compatibility and the existing scene/history/storage rules; they do not establish aesthetics, native human hit delivery, resizing, screen-reader support or successful beginner use. Close the window before continuing.
