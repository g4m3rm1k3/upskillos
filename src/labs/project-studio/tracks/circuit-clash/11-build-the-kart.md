---
title: Build the low-poly kart from reusable geometry
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

We will turn pure geometry into colored triangles, then compose a recognizable kart. Each part has a local size and offset; no source file or model is supplied for you to import.

## Shade one triangle at the graphics boundary

Mint, Dark, and Paint hold reusable colors. Static readonly prevents reassigning those fields after initialization; the paint array's elements are still mutable, so we treat them as read-only by convention. Kart Id selects a consistent color across the mesh and scoreboard.

Face asks Geometry.Light for brightness, then multiplies each RGB component by that scalar. The byte cast converts the resulting float to the channel's integer storage. Brightness stays between 0.35 and 1, so these products remain in range. Alpha is preserved rather than darkened: lighting a surface should not make it transparent.

DrawTriangle3D is the only drawing call inside Face. That narrow boundary makes our mesh algorithms independent of how we calculate light. The GPU still handles visibility and rasterization. We are computing flat color on the CPU, not implementing a custom shader language.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Game/Art.cs`. Start or replace this file.

```csharp edit=Game/Art.cs mode=replace
using System.Numerics;
using Raylib_cs;
using CircuitClash;

public static class Art
{
    public static readonly Color Mint = new(98, 243, 198, 255);
    public static readonly Color Dark = new(25, 44, 57, 255);
    public static readonly Color[] Paint = { Mint, new(255,101,126,255), new(255,208,107,255), new(157,139,255,255) };
    public static void Face(Vector3 a, Vector3 b, Vector3 c, Color color)
    {
        float brightness = Geometry.Light(a, b, c);
        Color shaded = new((byte)(color.R * brightness), (byte)(color.G * brightness), (byte)(color.B * brightness), color.A);
        Raylib.DrawTriangle3D(a, b, c, shaded);
    }
```

## Transform shared vertices before submitting faces

Box asks for local corners, transforms each into world space once, and then follows groups of three indices. `i += 3` advances one triangle; `indices[i+1]` and `indices[i+2]` select its remaining corners. The inner array access first finds an index, then finds that vertex.

For a box at (10,0,0) with yaw zero, a local corner (-1,-1,-1) becomes (9,-1,-1). With yaw PI/2, it rotates before translation. Use the same transform for every corner to keep the box rigid. Moving only its center without rotating its corners would position a part correctly but leave it facing the wrong direction.

This clear implementation allocates a small corner array on each call. Later we profile before deciding whether to cache static meshes or reuse buffers. The simplest understandable implementation is not automatically the final performance choice.

Type this fragment in `Game/Art.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/Art.cs mode=append
    public static void Box(Vector3 center, Vector3 size, Color color, float yaw = 0)
    {
        Vector3[] vertices = Geometry.Corners(size);
        for (int i = 0; i < vertices.Length; i++) vertices[i] = Geometry.Transform(vertices[i], center, yaw);
        int[] indices = Geometry.BoxIndices;
        for (int i = 0; i < indices.Length; i += 3)
            Face(vertices[indices[i]], vertices[indices[i+1]], vertices[indices[i+2]], color);
    }
```

## Generate a ring and connect its faces

A cone needs a tip and a ring. The loop divides a full turn into equal angles; for six sides, each step is Tau/6. Sine and cosine place neighboring ring vertices on a horizontal circle. Adding center translates them to the desired location. The tip is center plus an upward vector scaled by height.

Each iteration emits one triangle from tip to neighboring ring points. The last iteration uses a full turn for its second angle, meeting the first point and closing the seam. We omit a bottom cap because the trees and mountains meet the ground. That is an explicit visibility tradeoff, unsuitable for an object viewed from underneath.

Fewer sides produce large visible facets; more sides increase triangle work and smooth the silhouette. Low-poly style comes from geometry and lighting decisions together, not merely choosing flat colors.

Type this fragment in `Game/Art.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/Art.cs mode=append
    public static void Cone(Vector3 center, float radius, float height, Color color, int sides = 6)
    {
        Vector3 tip = center + Vector3.UnitY * height;
        for (int i = 0; i < sides; i++)
        {
            float a = MathF.Tau * i / sides, b = MathF.Tau * (i + 1) / sides;
            Vector3 left = center + new Vector3(MathF.Sin(a) * radius, 0, MathF.Cos(a) * radius);
            Vector3 right = center + new Vector3(MathF.Sin(b) * radius, 0, MathF.Cos(b) * radius);
            Face(tip, left, right, color);
        }
    }
```

## Construct a cylinder along the axle

The wheel's axle lies along local X, so its circular cross-section uses Y and Z. Radius is 0.43 and the two caps lie 0.4 apart. For each angular segment, p and q lie on one side; subtracting inside reaches the corresponding points on the other side.

Two triangles form the tread's rectangular strip. One triangle on each cap connects its center to the segment endpoints. Reversed endpoint order on the opposite cap keeps outward winding. The local Map function captures kart and converts each local wheel vertex through the kart's transform. A local function is declared within a method and can use that method's accessible variables.

The tire has ten segments: it is intentionally faceted. This model does not simulate suspension or spin its vertices with speed. That visual detail is separate from whether the kart accelerates correctly. First verify shape, axle direction, and attachment; optional wheel animation must not become a prerequisite for the race rules.

Type this fragment in `Game/Art.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/Art.cs mode=append
    public static void Wheel(Kart kart, Vector3 center)
    {
        for (int i = 0; i < 10; i++)
        {
            float a = i * MathF.Tau / 10, b = (i + 1) * MathF.Tau / 10;
            Vector3 p = center + new Vector3(0.2f, MathF.Cos(a) * 0.43f, MathF.Sin(a) * 0.43f);
            Vector3 q = center + new Vector3(0.2f, MathF.Cos(b) * 0.43f, MathF.Sin(b) * 0.43f);
            Vector3 inside = new(0.4f, 0, 0);
            Vector3 Map(Vector3 v) => Geometry.Transform(v, kart.Position, kart.Yaw);
            Face(Map(p), Map(q), Map(q - inside), Dark);
            Face(Map(p), Map(q - inside), Map(p - inside), Dark);
            Face(Map(center + new Vector3(0.2f,0,0)), Map(q), Map(p), Color.Gray);
            Face(Map(center - new Vector3(0.2f,0,0)), Map(p - inside), Map(q - inside), Color.Gray);
        }
    }
```

## Compose parts in one shared coordinate system

Part is a local helper that converts an offset into a world center and passes the kart yaw to Box. The body, hood, seat, helmet, visor, and spoiler are boxes with different dimensions. Positive Z is the nose, so the visor belongs ahead of the helmet and the spoiler behind the seat. Those coordinates are design data, not unexplained magic needed by the physics.

Nested foreach loops combine two X positions with two Z positions, placing four wheels. This is a Cartesian product: every left/right position pairs with every front/back position. Kart state drives effects: Boost above zero adds an exhaust box; Shield above zero adds a wire sphere. Drawing an effect does not activate it or spend energy.

Keep those responsibilities separate. If the shield is visible but damage is not blocked, investigate Race.Hit. If hits are blocked but the sphere is invisible, investigate this presentation path. A single class doing both would make that distinction harder to maintain.

Type this fragment in `Game/Art.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/Art.cs mode=append
    public static void Kart(Kart kart)
    {
        Color color = Paint[kart.Id];
        void Part(Vector3 offset, Vector3 size, Color paint) =>
            Box(Geometry.Transform(offset, kart.Position, kart.Yaw), size, paint, kart.Yaw);
        Part(new(0,0.45f,0), new(1.7f,0.5f,2.5f), color);
        Part(new(0,0.65f,1), new(1.5f,0.24f,1), color);
        Part(new(0,0.8f,-0.3f), new(0.8f,0.7f,0.85f), Dark);
        Part(new(0,1.35f,-0.15f), new(0.7f,0.7f,0.7f), Color.Beige);
        Part(new(0,1.35f,0.22f), new(0.6f,0.2f,0.1f), Dark);
        Part(new(0,1.15f,-1.2f), new(2,0.13f,0.6f), color);
        foreach (float x in new[] {-1f, 1f}) foreach (float z in new[] {-0.8f, 0.85f}) Wheel(kart, new(x,0.4f,z));
        if (kart.Boost > 0) Part(new(0,0.5f,-1.8f), new(0.6f,0.4f,1.3f), Color.Orange);
        if (kart.Shield > 0) Raylib.DrawSphereWires(kart.Position + Vector3.UnitY, 1.8f, 8, 12, Color.SkyBlue);
    }
}
```

## Verify and explain the boundary

Build Game. To inspect your mesh now, keep the working first-window program and temporarily replace its DrawTriangle3D call with `Art.Kart(new CircuitClash.Kart(0,"Preview",CircuitClash.Package.Handling));`. That kart starts on the track near (0,7,64), so set the camera Position to (0,11,55) and Target to (0,8,64). Explain why leaving the original origin-facing camera would miss it. Run, inspect wheels and face brightness, then restore the triangle preview. The full race entry point will replace this experiment later.

