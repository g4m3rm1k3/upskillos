---
title: Immediate-mode menus and keyboard focus
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

We will build small UI primitives so the later menus express decisions rather than repeating input and drawing details.

## Track focus across a frame

An immediate-mode UI declares its controls during every draw. We retain only focus and counts between frames. Begin advances focus on Tab using the previous frame's count, then resets the index for this frame. Max(1,count) avoids remainder by zero before any buttons have been drawn.

End records the number drawn and clamps focus if a screen change removed controls. This is a minimal focus system: tab order follows declaration order, disabled buttons may receive focus, and there is no screen-reader integration or responsive layout engine. Keyboard activation improves access but is not a claim of complete accessibility.

Text's optional nullable Color allows callers to omit it. The null-coalescing operator selects white when no color was supplied. Default arguments are compile-time convenience; they do not create overload-specific behavior.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Game/Ui.cs`. Start or replace this file.

```csharp edit=Game/Ui.cs mode=replace
using Raylib_cs;

public static class Ui
{
    private static int focus, index, count;
    public static void Begin()
    {
        if (Raylib.IsKeyPressed(KeyboardKey.Tab)) focus = (focus + 1) % Math.Max(1,count);
        index = 0;
    }
    public static void End() { count = index; if (focus >= count) focus = 0; }
    public static void Text(string text, int x, int y, int size = 20, Color? color = null) =>
        Raylib.DrawText(text,x,y,size,color ?? Color.White);
```

## Separate hit testing, appearance, and activation

Rectangle defines the screen-space hit area. CheckCollisionPointRec compares the current mouse coordinate with that rectangle. `index++ == focus` compares the old index, then increments it for the next control. A focused or hovered enabled button gets a brighter fill; a border marks keyboard focus independently of pointer position.

The return expression requires enabled, then either a mouse press while hovering or Enter while focused. Parentheses matter: without grouping, one input path could accidentally bypass enabled. Returning a bool lets a caller write `if (Ui.Button(...)) Start();` without the UI helper owning application state.

Panel draws a translucent rectangle. Alpha 235 leaves a little world visible behind it. Text and controls are drawn after the 3D world, so they occupy screen coordinates and remain legible regardless of camera orientation. Fixed dimensions simplify this first desktop UI; a resizable version would require layout and font-scaling rules.

Type this fragment in `Game/Ui.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/Ui.cs mode=append
    public static bool Button(string text, int x, int y, int width = 280, bool enabled = true)
    {
        Rectangle area = new(x,y,width,40);
        bool hover = Raylib.CheckCollisionPointRec(Raylib.GetMousePosition(),area);
        bool focused = index++ == focus;
        Raylib.DrawRectangleRec(area, enabled && (hover || focused) ? new Color(44,92,91,255) : Art.Dark);
        if (focused) Raylib.DrawRectangleLinesEx(area,2,Art.Mint);
        Text(text,x+12,y+11,18,enabled ? Color.White : Color.Gray);
        return enabled && ((hover && Raylib.IsMouseButtonPressed(MouseButton.Left)) ||
            (focused && Raylib.IsKeyPressed(KeyboardKey.Enter)));
    }
    public static void Panel(int x, int y, int width, int height) =>
        Raylib.DrawRectangle(x,y,width,height,new Color(13,31,44,235));
}
```

## Verify and explain the boundary

Review the boolean expression with four cases: disabled+click, enabled+outside click, enabled+hover click, enabled+focused Enter. Only the last two may return true. Once the final menus run, test both pointer and keyboard paths; rendering a button does not prove it can be activated.

