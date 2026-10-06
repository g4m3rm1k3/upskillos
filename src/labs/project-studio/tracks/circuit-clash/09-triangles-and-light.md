---
title: Low-poly geometry — transforms, normals, and light
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

Low-poly rendering means choosing a small number of faces and making their shape readable. We will generate those faces, compute one brightness per face, and submit the triangles. There is no imported kart model or hidden lighting shader to substitute for these calculations.

## Rotate locally, then translate into the world

A kart wheel is easiest to describe relative to the kart's center. That is local space. World space locates it on the track. At yaw zero, local (0,0,1) points along world +Z. At PI/2, it should point along +X. With cosine=0 and sine=1, the formula produces (1,0,0), exactly that result.

The X/Z rotation is `x′ = x cos(yaw) + z sin(yaw)` and `z′ = -x sin(yaw) + z cos(yaw)`. Y remains unchanged because yaw rotates about the vertical axis. We then add the kart's world position. Rotating after adding position would rotate the whole kart around the world's origin, not around its own center. Transformation order changes the result.

`Transform` is pure: it returns a new vector without changing the caller's point. C# evaluates the component expressions, constructs the vector, adds position component-wise, and returns the resulting value. Before typing, calculate the output for point (1,0,0), position (10,2,0), yaw PI/2: it is approximately (10,2,-1). Tiny nonzero residuals come from floating-point trigonometry.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Core/Geometry.cs`. Start or replace this file.

```csharp edit=Core/Geometry.cs mode=replace
using System.Numerics;
namespace CircuitClash;

public static class Geometry
{
    public static Vector3 Transform(Vector3 point, Vector3 position, float yaw)
    {
        float c = MathF.Cos(yaw), s = MathF.Sin(yaw);
        return position + new Vector3(point.X * c + point.Z * s, point.Y, -point.X * s + point.Z * c);
    }
```

## Derive a face normal and its brightness

Take triangle corners a=(0,0,0), b=(0,0,1), c=(1,0,0). Subtracting a produces two edge vectors. Their cross product is (0,1,0), perpendicular to the face and pointing up. Reversing b and c produces (0,-1,0). Vertex order therefore determines which side is the front. Graphics back-face culling can discard a triangle whose winding faces away from the camera.

Cross product components are `(uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx)`. You can expand the simple example to verify the result. Its length also depends on face area; Normalize divides by length to leave a direction of length one. For coincident or collinear corners that length is zero. We test LengthSquared before normalizing to avoid dividing by zero and producing invalid coordinates.

A dot product multiplies matching components and adds them. For unit directions it measures alignment: 1 faces the same way, 0 is perpendicular, -1 faces away. The sunlight direction (-1,2,1) is normalized too. Max(0,dot) prevents negative light. Ambient 0.35 keeps unlit faces visible; the remaining 0.65 scales direct light. For an upward face the dot is 2/sqrt(6), about 0.816, so brightness is about 0.881.

Every triangle gets one brightness, which creates flat shading. Smooth shading interpolates vertex normals and hides many hard edges; we deliberately preserve them. This is a simple Lambert-style diffuse model with an artistic ambient term. It does not cast shadows, reflect light between surfaces, or model physical exposure.

Type this fragment in `Core/Geometry.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Geometry.cs mode=append
    public static float Light(Vector3 a, Vector3 b, Vector3 c)
    {
        Vector3 cross = Vector3.Cross(b - a, c - a);
        if (cross.LengthSquared() < 0.000001f) return 0.35f;
        Vector3 normal = Vector3.Normalize(cross);
        Vector3 sunlight = Vector3.Normalize(new Vector3(-1, 2, 1));
        return 0.35f + 0.65f * Math.Max(0, Vector3.Dot(normal, sunlight));
    }
```

## Share corner data and index the faces

For a box of size (2,4,6), half extents are (1,2,3). Choosing each component's negative or positive half extent creates its eight corners centered at the origin. The returned array has a defined order; changing that order without changing face indices connects the wrong points.

BoxIndices groups three indices per triangle. The first group 4,5,6 selects one triangle on the +Z face; 4,6,7 closes that face. Six faces require twelve triangles. We reuse corner positions rather than storing a separate position for every triangle. This is indexed geometry, a common mesh representation.

Trace the first triangle using the returned coordinates and calculate its cross product. It should point outward along +Z. Later our test checks every triangle by dotting its normal with its centroid: a box centered at zero has outward faces when that dot product is positive. That tests geometric meaning rather than merely counting indices.

Type this fragment in `Core/Geometry.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Geometry.cs mode=append
    public static Vector3[] Corners(Vector3 size)
    {
        Vector3 h = size / 2;
        return new[] { new Vector3(-h.X,-h.Y,-h.Z), new(h.X,-h.Y,-h.Z),
            new(h.X,h.Y,-h.Z), new(-h.X,h.Y,-h.Z), new(-h.X,-h.Y,h.Z),
            new(h.X,-h.Y,h.Z), new(h.X,h.Y,h.Z), new(-h.X,h.Y,h.Z) };
    }
    public static readonly int[] BoxIndices = {
        4,5,6, 4,6,7, 0,3,2, 0,2,1, 0,4,7, 0,7,3,
        1,2,6, 1,6,5, 3,7,6, 3,6,2, 0,1,5, 0,5,4
    };
}
```

## Verify and explain the boundary

Build Core. Explain what changes if you reverse two indices, normalize a zero vector, or translate before rotating. These are different causes of a broken image. Record your predicted effects before the first graphics experiment. We will test normals numerically and inspect the rendered result; neither replaces the other.

