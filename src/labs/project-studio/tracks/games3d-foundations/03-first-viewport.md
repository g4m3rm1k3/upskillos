---
title: Draw the scene through a real 3D camera
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

The scene model works without graphics. Now Studio reads the same objects and draws unit cubes at their positions. Rendering does not decide how editing works.

## Add the native window dependency

Create a Studio folder. ProjectReference links the scene library. PackageReference pins [Raylib-cs 8.1.0](https://www.nuget.org/packages/Raylib-cs/8.1.0), which supplies the C# binding and platform-specific native library. A binding translates calls to another library; it is not our editor implementation. This package supports the net8.0 target used here.

```xml edit=Studio/Studio.csproj mode=replace
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../Core/Core.csproj" />
    <PackageReference Include="Raylib-cs" Version="8.1.0" />
  </ItemGroup>
</Project>
```

Run `dotnet restore Studio`. The first restore may need internet access. If restore fails, inspect the first error before investigating camera code. A package download failure, a compiler failure and a native graphics failure are distinct stages.

## Translate data into visible cubes

Create Studio/SceneDrawing.cs. static means these operations need no instance of the drawing class. Draw accepts the scene to observe and selectedId for highlighting. foreach visits each object. The conditional expression chooses gold for the selected object and blue otherwise. Selection changes presentation, not the scene data.

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
            Raylib.DrawCube(item.Position, 1f, 1f, 1f, color);
            Raylib.DrawCubeWires(item.Position, 1f, 1f, 1f, Color.DarkBlue);
        }
    }
}
```

The cube dimensions are world units; its position is its center. Y=0.5 puts a unit cube's bottom at Y=0. DrawCubeWires shows its edges. The grid is a visual reference, not a collision surface. We are using real 3D geometry and a depth buffer; we have not implemented physics, textures or lighting tools yet.

## Open a window, draw frames and close cleanly

A camera has an eye position, a target and an up direction. Perspective makes more distant objects appear smaller. FovY is the vertical field of view in degrees. Vector3.UnitY is (0,1,0). Those inputs define the view; the graphics library and driver handle transformation, projection and rasterization into pixels.

The loop repeats while the close request is absent. BeginDrawing and EndDrawing enclose a frame; BeginMode3D and EndMode3D enclose world drawing. ClearBackground clears the previous frame. DrawText afterward uses screen pixels, not world coordinates. Finally releases the window even if drawing throws an exception. SetTargetFPS asks for frame pacing; it is not a simulation clock.

```csharp edit=Studio/Program.cs mode=replace
using System.Numerics;
using Raylib_cs;
using Studio3D;

Scene scene = new();
Guid beacon = scene.Add("Beacon", new Vector3(0, 0.5f, 0));
scene.Add("Crate", new Vector3(2, 0.5f, 1));
Camera3D camera = new()
{
    Position = new Vector3(7, 6, 9),
    Target = new Vector3(1, 0, 0),
    Up = Vector3.UnitY,
    FovY = 45,
    Projection = CameraProjection.Perspective
};

Raylib.InitWindow(1100, 700, "Your 3D Studio - First Viewport");
Raylib.SetTargetFPS(60);
try
{
    while (!Raylib.WindowShouldClose())
    {
        Raylib.BeginDrawing();
        Raylib.ClearBackground(Color.RayWhite);
        Raylib.BeginMode3D(camera);
        SceneDrawing.Draw(scene, beacon);
        Raylib.EndMode3D();
        Raylib.DrawText("Scene data -> 3D cubes | Escape closes", 20, 20, 20, Color.DarkBlue);
        Raylib.EndDrawing();
    }
}
finally { Raylib.CloseWindow(); }
```

Run `dotnet run --project Studio`. Observe a gold Beacon, a blue Crate and a grid. Close the window before continuing. A successful compile proves API use and types, not that the window appeared or geometry was useful.

```check
run "dotnet build Studio" exit=0 timeout=120
run "dotnet run --project Checks" exit=0 stdout="SCENE CHECKS PASSED" timeout=120
```

## Diagnose a picture without changing the rules

```predict
question: Does moving the camera change the positions stored in Scene?
choice: Yes, coordinates move with the camera
choice: No, only the view changes
answer: No, only the view changes
explain: The camera and Scene are different data. Drawing reads object positions; it never calls TryMove. A different camera projects the same world differently.
```

Change the camera's X from 7 to -7; run and explain the different apparent ordering. Restore 7. Then temporarily aim Target at (100,0,0) and observe the missing objects. Restore the shown camera. If the app never opens, inspect native library loading and display/driver diagnostics before altering world positions.

We currently render the whole window. The next lesson overlays panels; a dedicated clipped viewport, resizable layout and camera controls are later UI improvements. This first picture does not certify accessibility, usability or platform support.

## Independent task: a third object, two views

In a practice copy add a third cube above the grid at (0,2,0), keeping the other coordinates unchanged. Observe it with the original camera and with a higher camera. Explain the distinction between changing the object and changing the observer. Add a check proving that drawing experiments have not changed the two original positions.

```hints
nudge: The scene's Add operation already accepts a position. Which coordinate expresses height?
concept: World coordinates describe objects independently of the camera. The camera changes projection, not object identity or position.
shape: Add a new object with Y=2, then change only Camera3D.Position for the second observation. Restore the camera and assert the original scene coordinates separately from inspecting the picture.
```
