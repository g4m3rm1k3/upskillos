---
title: Make the whole studio comfortable in dark and light mode
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

The previous studio places a bright viewport between dark panels. Even readable labels cannot fix that abrupt brightness change. Compare the same three boxes in a dark room and a bright room: the scene, tools and grid should form one coherent view in either mode.

By the end, you can build a semantic palette (colors named for their jobs), switch the entire editor by mouse or F6, and prove the switch is a presentation preference rather than a scene edit. Prerequisites: UI layout, shared input regions, immutable records and the scene/history/storage contracts. We start dark; the header button names the mode it will switch to.

## Predict which state belongs to the game

Move a box, undo the move, then switch modes. Redo must still restore the move. Saving a scene must not force the next person to use your display preference.

```predict
question: Switching to light mode should change which state?
choice: Palette and rendered appearance, preserving objects, selection and both history stacks
choice: Saved box colors and a new scene undo entry
answer: Palette and rendered appearance, preserving objects, selection and both history stacks
explain: Editor appearance is a preference. Our scene format describes authored objects; Undo and Redo describe their edits.
```

## Give both modes the same named roles

Replace Studio/UiTheme.cs. A ThemePalette record holds a complete set of colors; its generated properties are initialized by its constructor. ThemeMode is an enum: two named values instead of unexplained true/false flags. Named constructor arguments such as Canvas: make the long list reviewable. Each color uses red, green, blue and opacity bytes from 0 to 255; 255 here is fully opaque.

Mode has a public getter and private setter. Only Toggle changes it. Current selects one immutable palette. The forwarding properties keep the existing drawing code readable: Canvas always means the viewport background, never "the pale color." They are properties evaluated on access, not fields that capture the initial palette forever. The static state is appropriate for our one-window exercise; multiple independently themed windows would need an owned theme instance.

```csharp edit=Studio/UiTheme.cs mode=replace
using System.Globalization;
using Raylib_cs;

namespace Studio3D;

public enum ThemeMode { Dark, Light }

public sealed record ThemePalette(
    Color Canvas, Color Panel, Color Raised, Color Border,
    Color TextColor, Color Muted, Color Accent, Color Selected, Color Danger,
    Color Grid, Color MajorGrid, Color ObjectColor, Color ObjectSelected, Color ObjectWire);

public static class UiTheme
{
    private static readonly ThemePalette Dark = new(
        Canvas: new(26, 33, 45, 255), Panel: new(22, 28, 39, 255),
        Raised: new(31, 40, 55, 255), Border: new(48, 59, 78, 255),
        TextColor: new(244, 246, 250, 255), Muted: new(158, 175, 195, 255),
        Accent: new(255, 198, 80, 255), Selected: new(65, 50, 25, 255),
        Danger: new(245, 150, 150, 255), Grid: new(50, 62, 79, 255),
        MajorGrid: new(88, 105, 127, 255), ObjectColor: new(96, 174, 231, 255),
        ObjectSelected: new(255, 198, 80, 255), ObjectWire: new(177, 203, 230, 255));

    private static readonly ThemePalette Light = new(
        Canvas: new(232, 236, 242, 255), Panel: new(248, 250, 252, 255),
        Raised: new(236, 241, 247, 255), Border: new(180, 193, 208, 255),
        TextColor: new(29, 40, 55, 255), Muted: new(77, 95, 116, 255),
        Accent: new(133, 77, 8, 255), Selected: new(255, 234, 183, 255),
        Danger: new(161, 41, 49, 255), Grid: new(190, 202, 216, 255),
        MajorGrid: new(139, 156, 179, 255), ObjectColor: new(70, 143, 208, 255),
        ObjectSelected: new(214, 139, 23, 255), ObjectWire: new(26, 64, 101, 255));

    public static ThemeMode Mode { get; private set; } = ThemeMode.Dark;
    public static ThemePalette Current => Mode == ThemeMode.Dark ? Dark : Light;
    public static void Toggle() =>
        Mode = Mode == ThemeMode.Dark ? ThemeMode.Light : ThemeMode.Dark;

    public static Color Canvas => Current.Canvas;
    public static Color Panel => Current.Panel;
    public static Color Raised => Current.Raised;
    public static Color Border => Current.Border;
    public static Color TextColor => Current.TextColor;
    public static Color Muted => Current.Muted;
    public static Color Accent => Current.Accent;
    public static Color Selected => Current.Selected;
    public static Color Danger => Current.Danger;
    public static Color Grid => Current.Grid;
    public static Color MajorGrid => Current.MajorGrid;
    public static Color ObjectColor => Current.ObjectColor;
    public static Color ObjectSelected => Current.ObjectSelected;
    public static Color ObjectWire => Current.ObjectWire;
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

Build Studio at this point. The panels and background can already follow a toggled palette, but the world renderer still has hard-coded colors. Identify that remaining dependency before declaring the feature finished.

```check
run "dotnet build Studio" exit=0 timeout=120
```

## Make the grid and objects follow the viewport

Replace Studio/SceneDrawing.cs. The convenience DrawGrid function does not accept our palette. Draw the same 20-unit grid explicitly: 21 parallel lines in each direction at Y = 0, from -10 to 10. Zero marks the two central lines. Their MajorGrid color is stronger; other lines use Grid. This changes presentation, not positions, box dimensions or simulation coordinates.

ObjectSelected distinguishes selection from ordinary ObjectColor. ObjectWire keeps edges visible in both modes. Keep the selected hierarchy row and inspector name as additional selection cues; color alone must not carry the entire interaction.

```csharp edit=Studio/SceneDrawing.cs mode=replace
using System.Numerics;
using Raylib_cs;

namespace Studio3D;

public static class SceneDrawing
{
    public static void Draw(Scene scene, Guid selectedId)
    {
        for (int line = -10; line <= 10; line++)
        {
            Color gridColor = line == 0 ? UiTheme.MajorGrid : UiTheme.Grid;
            Raylib.DrawLine3D(new Vector3(line, 0, -10), new Vector3(line, 0, 10), gridColor);
            Raylib.DrawLine3D(new Vector3(-10, 0, line), new Vector3(10, 0, line), gridColor);
        }
        foreach (SceneObject item in scene.Objects)
        {
            Color color = item.Id == selectedId ? UiTheme.ObjectSelected : UiTheme.ObjectColor;
            Vector3 size = item.Box.Size;
            Raylib.DrawCube(item.Position, size.X, size.Y, size.Z, color);
            Raylib.DrawCubeWires(item.Position, size.X, size.Y, size.Z, UiTheme.ObjectWire);
        }
    }
}
```

## Route mouse and keyboard to one preference operation

Create Studio/ThemeControls.cs. TryClick returns false outside its shared rectangle so other handlers can receive the click. Inside, it toggles and returns true even when no scene object exists. F6 calls the same Toggle operation. A key and a click arriving together cause one switch because the key branch returns immediately.

There is no EditorSession or scene-store dependency in this class. That small boundary makes it harder to accidentally add a theme switch to object history or save it as game content.

```csharp edit=Studio/ThemeControls.cs mode=replace
using System.Numerics;
using Raylib_cs;

namespace Studio3D;

public static class ThemeControls
{
    public static Rectangle Button => new(648, 12, 148, 40);
    public static string Label => UiTheme.Mode == ThemeMode.Dark ? "Light [F6]" : "Dark [F6]";

    public static bool TryClick(Vector2 point)
    {
        if (!Raylib.CheckCollisionPointRec(point, Button)) return false;
        UiTheme.Toggle();
        return true;
    }

    public static bool Handle()
    {
        if (Raylib.IsKeyPressed(KeyboardKey.F6))
        {
            UiTheme.Toggle();
            return true;
        }
        return Raylib.IsMouseButtonPressed(MouseButton.Left) && TryClick(Raylib.GetMousePosition());
    }
}
```

## Draw the actual switch and explain its direction

Replace Studio/EditorPanels.cs. Replace the old EDIT badge with the shared button and reserve enough header space for it. In dark mode its label is Light [F6]; in light mode its label is Dark [F6]. The hover hint reports the current mode, avoiding a label that could ambiguously describe either the current state or the next action.

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
        UiTheme.Text("SCENE VIEW", 264, 24, 360, 20, UiTheme.TextColor);
        UiTheme.Button(ThemeControls.Button, ThemeControls.Label, true);
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
        if (Raylib.CheckCollisionPointRec(mouse, ThemeControls.Button))
            hint = $"Current mode: {UiTheme.Mode} | F6 switches the whole view";
        else if (Raylib.CheckCollisionPointRec(mouse, UndoButton))
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

## Handle the preference before scene commands

Replace Studio/Program.cs. Short-circuit evaluation of && stops after a handler consumes the event: a theme-button click should not become a hierarchy click. ClearBackground, world drawing and panels read the current palette every frame, so a change appears on the same frame. No reload or new scene is needed.

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

Raylib.InitWindow(1100, 700, "Your 3D Studio - Dark and Light");
Raylib.SetTargetFPS(60);
try
{
    while (!Raylib.WindowShouldClose())
    {
        if (!ThemeControls.Handle() && !files.Handle() && !shapes.Handle()) StudioInput.Handle(scene, editor);

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

Run Studio and compare the same scene using F6 and the header button. Require a dark viewport with dark panels, a light viewport with light panels, and visible grid/box edges in both. Move a box, Undo, switch modes and Redo. Save, switch again and reopen: geometry must match the save and the current mode must stay selected. Delete the final object and switch again; appearance is still available. Close the window. Restarting returns to dark: saving editor preferences across launches is a separate later storage task, not a promised feature here.

## Diagnose a partially themed view

In a practice copy replace ClearBackground(UiTheme.Canvas) with ClearBackground(Color.White). Switch modes: the panels change but the viewport stays bright. Trace the background's dependency and restore the Canvas role. Next, change the TextColor forwarding property into a readonly field initialized from Current.TextColor. Observe text that remains stuck on the startup palette after switching; restore the computed property. A single correct screenshot cannot detect this stale-state defect.

Text readability and whole-screen comfort are different checks. Inspect ordinary text on panels, cards, hovered buttons and selected rows, plus errors and empty states. The [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) uses 4.5:1 for ordinary text as a useful reference. That is not a native-app accessibility certification or a measure of whether the viewport feels glaring. Compare both modes visually under your actual lighting; do not simply invert every RGB byte, which can destroy selection and error roles.

## Independent task: audit and improve a palette

In a separate practice copy adjust one mode for your lighting while preserving the roles. Record the exact foreground/background pairs for main text, muted text, selected labels and error labels. Measure their contrast with a contrast checker; target at least 4.5:1 for these ordinary text pairs. Compare identical selected and empty scenes in both modes. Before switching, record object IDs, positions, sizes, selection and Undo/Redo counts; prove all remain unchanged. Compare saved scene JSON before and after a switch with no authored edit. Deliberately introduce and repair one stale or hard-coded color.

```hints
nudge: Start with the brightest large region, then inspect the labels on each surface rather than judging a list of swatches.
concept: Semantic roles separate meaning from a chosen color. A live property reads the current palette; a stored field keeps an earlier value. Display preferences and authored game data have different owners.
shape: List each actual text/background pair, measure it in Dark and Light, then switch with a pending redo and compare the scene/history snapshot and serialized data. Repair the consumer that bypasses Current.
```

### Explain and transfer

Explain why white background plus dark panels failed even though text contrast could pass, why a mode switch must work in an empty scene, and why changing appearance must not clear redo. Show your repaired defect, palette measurements and unchanged-data evidence. Transfer the same role-based approach to a game HUD: distinguish player-authored colors from display preferences.

Build and domain checks establish compilation and existing scene contracts. Author graphics checks can exercise the toggle operation and inspect rendered frames; real mouse/keyboard delivery, personal comfort, macOS behavior and beginner understanding require the corresponding human observations. Theme modes do not supply numeric text entry, font scaling, keyboard focus or platform accessibility. Those topics remain later lessons.
