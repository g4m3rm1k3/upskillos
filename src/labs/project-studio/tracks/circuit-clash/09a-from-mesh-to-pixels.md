---
title: From triangles to pixels — the graphics pipeline
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

Geometry is only the first stage of rendering. You will reason about camera space, perspective, clipping, depth, and lighting so a library failure can be investigated at the correct stage. The next lesson supplies the actual graphics window.

## Apply transforms in a named order

A local vertex belongs to an object's coordinate system. A model transform scales, rotates, and translates it into the world. A view transform expresses that world point relative to the camera's position and orientation. A projection transform maps the camera's view volume toward screen coordinates. Viewport mapping converts those normalized coordinates into pixel locations.

A matrix is a rectangular arrangement of numbers representing a linear mapping; combining it with an extra coordinate allows translation too. In homogeneous coordinates, a point uses (x,y,z,1), while a pure direction uses (x,y,z,0). Translation affects the point but not the direction. Matrix multiplication composes transformations, and their order generally cannot be swapped.

Our Geometry.Transform explicitly computes yaw and translation instead of hiding them in a matrix. Raylib handles view and projection matrices from the camera values. You need not implement a matrix library to explain the boundary: vertices enter in world space, and camera/projection determine where they appear. Libraries differ in row/column vector conventions and handedness; inspect the API's convention before copying a matrix formula from another engine.

## Calculate why farther objects look smaller

In a simplified camera facing positive depth, projected horizontal coordinate is focalScale*x/depth. With scale one, a point one unit right and two units forward projects to .5; the same horizontal offset at depth four projects to .25. This demonstrates perspective division without a graphics driver.

Real projection also handles aspect ratio, field of view, and near/far clipping. A point at depth zero cannot be projected by division; points crossing the near plane must be clipped before rasterization. Our small calculation explicitly accepts only positive depth. `ArgumentOutOfRangeException` identifies an invalid caller argument; `nameof(depth)` supplies the parameter name as text without hard-coding a separate spelling. It is a conceptual experiment, not a replacement for Raylib's projection convention.

If a mesh looks distorted, distinguish bad local coordinates from the wrong camera basis, wrong aspect ratio, or a degree/radian mismatch. Moving the camera changes the view, not the stored mesh. Scaling the mesh changes world geometry and may not change a separate collision model.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
float ProjectX(float x, float depth)
{
    if (depth <= 0) throw new ArgumentOutOfRangeException(nameof(depth));
    return x / depth;
}
if (ProjectX(1,2) != 0.5f || ProjectX(1,4) != 0.25f)
    throw new Exception("Perspective scaling failed");
Console.WriteLine("PERSPECTIVE CHECK PASSED");
```

## Distinguish coverage, depth, and shading

Rasterization determines which pixel samples a projected triangle covers. Barycentric weights express a point within a triangle as a weighted combination of its three corners; they support interpolating attributes across the surface. A depth buffer stores the nearest accepted depth for each sample so farther opaque surfaces do not overwrite nearer ones merely because they were drawn later.

Back-face culling uses triangle orientation to discard a side. Depth testing chooses among overlapping surfaces. Clipping limits the view volume. These are different operations: disabling one is not a general cure for an error in another. Almost coplanar surfaces may map to indistinguishable depth values and flicker, called z-fighting. The road-marking lift addresses that particular problem.

A vertex shader processes vertex data, while a fragment shader computes values for rasterized fragments that may contribute pixels. Raylib supplies the shaders in our implementation. Our Face helper computes a single lit color on the CPU, so each triangle has flat shading. Smooth shading would interpolate normals; texture mapping would interpolate surface coordinates to sample an image. Neither is secretly implemented by our flat-color model.

Before the first window, make a fault table: missing face → winding/camera/clipping candidates; flickering marking → depth precision/coplanarity; wrong brightness → normal direction/light math; low frame rate → measure CPU/GPU work. Diagnose from observations, not from changing every graphics setting.

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

Explain why making a triangle brighter cannot fix a triangle culled for reversed winding. Then explain why drawing a farther opaque triangle last should not make it cover a nearer one when depth testing works.

