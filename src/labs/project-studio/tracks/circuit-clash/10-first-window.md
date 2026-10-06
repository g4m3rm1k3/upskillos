---
title: Your first 3D frame and the rendering pipeline
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

We will draw one triangle before composing the entire racer. That gives you a small working graphics checkpoint and a place to diagnose a library or driver problem.

## Open the window and describe a camera

`using Raylib_cs` makes the binding's types available. InitWindow requests a native window and graphics context. Its dimensions are pixels. SetTargetFPS asks the library to pace frames; it does not guarantee a fixed physics interval.

Camera3D is a data structure. The object initializer assigns its fields after construction. Position locates the eye; Target locates what it looks toward; Up chooses the camera's vertical direction. Perspective makes distant objects appear smaller. FovY is the vertical field of view in degrees, unlike our yaw calculations in radians. Mixing those units creates a valid but incorrect picture.

The camera defines a view transformation from world coordinates to coordinates relative to the eye. The perspective projection maps that space toward the screen, with division by depth producing distance scaling. Raylib and the graphics driver perform these matrix and rasterization operations. We explicitly supply world geometry and camera values rather than manually rebuilding a graphics driver.

Type this fragment in `Game/Program.cs`. Start or replace this file.

```csharp edit=Game/Program.cs mode=replace
using System.Numerics;
using Raylib_cs;

Raylib.InitWindow(960,640,"First Circuit Clash triangle");
Raylib.SetTargetFPS(60);
Camera3D camera = new()
{
    Position = new Vector3(4,3,5), Target = Vector3.Zero,
    Up = Vector3.UnitY, FovY = 60, Projection = CameraProjection.Perspective
};
```

## Draw, present, and release resources

The loop repeats until the user closes the window. BeginDrawing starts a frame; ClearBackground removes previous color/depth contents. BeginMode3D installs the camera. DrawTriangle3D submits three positions and a color. EndMode3D restores the screen-coordinate drawing mode, and EndDrawing presents the completed frame.

The graphics pipeline transforms vertices, clips geometry outside the visible volume, turns triangles into covered pixels, and uses depth to choose which surface is in front. A color has red, green, blue, and alpha channels; 255 is full intensity/opacity for one byte. Our later Face helper computes RGB values from a normal before submission.

`try` establishes a protected region. `finally` executes when control leaves it, including after an exception, so the window and graphics resources are released. Cleanup is ownership, not optional decoration. The code is intentionally split before the loop; append this part to complete the entry point, then run `dotnet run --project Game`.

Observe a green triangle on a grid. Swap b and c temporarily to investigate winding; rotate the camera if necessary to inspect the opposite side. Restore the shown winding. A blank window can also mean the camera faces away or geometry lies outside its view. Change one cause at a time.

Type this fragment in `Game/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/Program.cs mode=append
try
{
    while (!Raylib.WindowShouldClose())
    {
        Raylib.BeginDrawing(); Raylib.ClearBackground(Color.SkyBlue);
        Raylib.BeginMode3D(camera);
        Raylib.DrawGrid(10,1);
        Raylib.DrawTriangle3D(Vector3.Zero, Vector3.UnitZ*2, Vector3.UnitX*2, Color.Green);
        Raylib.EndMode3D();
        Raylib.DrawText("One triangle, explicit coordinates",20,20,20,Color.Black);
        Raylib.EndDrawing();
    }
}
finally { Raylib.CloseWindow(); }
```

## Investigate the first frame systematically

If compilation fails, inspect the first diagnostic for a misspelled API or package version. If the native library cannot load, compare `dotnet --info` architecture with the installed Raylib runtime. If a window opens but shows only the background, check camera, coordinates, winding, and whether drawing calls occur between the correct Begin/End pair.

Move the triangle farther away while leaving the camera fixed. It should become smaller under perspective. Move only the camera upward and explain why the apparent shape changes without any vertex changing. These experiments distinguish model data, view, projection, and screen presentation.

Close the window before continuing. A program that builds successfully has not necessarily rendered a useful frame. Conversely a nice screenshot does not prove collision, saving, or training correctness.

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Draw a second triangle forming a square and explain which edge is shared. Then deliberately place it at exactly the same depth as another face and investigate unstable overlap, commonly called z-fighting.

