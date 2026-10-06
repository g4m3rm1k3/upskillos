---
title: A winding track from functions and vectors
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

The road will have height changes, curves, and a closed loop. We will calculate its centerline ourselves. You need no prior trigonometry course: work through the numerical directions here before typing the formulas.

## Define coordinates and a closed curve

A Vector3 contains X, Y, and Z components. We use X across the world, Y up, and Z forward at yaw zero. Adding vectors adds corresponding components. Multiplication by a scalar scales all components. A position locates a point; a direction describes an offset, even though both use the same library type.

`using System.Numerics` makes Vector3 available without its qualified name. `namespace CircuitClash;` places subsequent types in our named group. A static class contains operations we call without creating a Track object. `const` declares a compile-time value. HalfWidth 7 means the drivable road spans 14 world units.

One full turn is Tau, approximately 6.283 radians. A quarter turn is PI/2. For angle zero, sine is 0 and cosine is 1. At a quarter turn, sine is 1 and cosine is 0. Therefore `(82 sin(a), 64 cos(a))` moves around an ellipse in X/Z. Adding `15 sin(3a)` bends its sides. The Y expression adds gradual hills around a base height of 5. Multiplying a fraction from 0 to 1 by Tau maps one lap to one turn. Sine and cosine repeat after a full turn, so Point(0) and Point(1) coincide.

We reuse the tested wrap rule. Count describes samples, not metres: neighboring samples need not be equally spaced. Never treat an index difference as an exact distance.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Core/Track.cs`. Start or replace this file.

```csharp edit=Core/Track.cs mode=replace
using System.Numerics;
namespace CircuitClash;

public static class Track
{
    public const int Count = 360;
    public const float HalfWidth = 7;
    public static int Wrap(int index) => (index % Count + Count) % Count;
    public static Vector3 Point(float fraction)
    {
        float a = fraction * MathF.Tau;
        return new Vector3(82 * MathF.Sin(a) + 15 * MathF.Sin(3 * a),
            5 + 4 * MathF.Sin(2 * a) + 2 * MathF.Cos(a), 64 * MathF.Cos(a));
    }
```

## Build a local forward and right basis

At converts an integer sample index to a fraction. The cast `(float)Count` forces fractional division; otherwise most indices would divide to zero. Forward at yaw zero is (0,0,1); at PI/2 it is (1,0,0). Right at zero is (1,0,0). Their dot product is zero, so they are perpendicular.

Yaw measures a horizontal direction. We estimate the track's tangent by subtracting its current point from a point slightly farther along the curve. Atan2(delta.X, delta.Z) recovers an angle from that direction while distinguishing all quadrants. The argument order matches our convention that zero faces +Z. Swapping them rotates the interpretation.

Angles wrap too. Turning from 179 degrees to -179 degrees should take roughly +2 degrees, not -358. Taking sine and cosine of the difference and passing them to Atan2 returns the shortest signed turn in the interval around -PI to PI. Distance deliberately measures only X/Z using Vector2; this is an arcade ground-plane collision model, not a general 3D collision system.

Type this fragment in `Core/Track.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Track.cs mode=append
    public static Vector3 At(int index) => Point(Wrap(index) / (float)Count);
    public static Vector3 Forward(float yaw) => new(MathF.Sin(yaw), 0, MathF.Cos(yaw));
    public static Vector3 Right(float yaw) => new(MathF.Cos(yaw), 0, -MathF.Sin(yaw));
    public static float Yaw(int index)
    {
        Vector3 delta = Point((index + 0.1f) / Count) - At(index);
        return MathF.Atan2(delta.X, delta.Z);
    }
    public static float Turn(float target, float current) =>
        MathF.Atan2(MathF.Sin(target - current), MathF.Cos(target - current));
    public static float Distance(Vector3 a, Vector3 b) =>
        new Vector2(a.X - b.X, a.Z - b.Z).Length();
```

## Search a bounded neighborhood

Nearest starts with an infinite best distance so the first finite candidate wins. The loop examines offsets -12 through +12 inclusively. It wraps each candidate index, measures horizontal distance, and retains the closest seen so far. The pair best/distance is a loop invariant: after each iteration it describes the best candidate examined up to that point.

This scans a fixed neighborhood instead of the whole track. Its cost is constant for this chosen window, while scanning all samples would grow with track resolution. The optimization assumes a kart moves only a small distance per tick and its hint was already near it. Teleportation must reset the hint, which Place will do. A nearest-point query for an arbitrary world coordinate would need a full scan or a spatial index.

Predict the candidate across the start seam when hint is 359. Wrapping lets the search examine 0 through 11 rather than treating the seam as a wall. Ties keep the first visited candidate because the comparison uses `<`, not `<=`.

Type this fragment in `Core/Track.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Track.cs mode=append
    public static int Nearest(Vector3 position, int hint)
    {
        int best = hint;
        float distance = float.PositiveInfinity;
        for (int offset = -12; offset <= 12; offset++)
        {
            int candidate = Wrap(hint + offset);
            float next = Distance(position, At(candidate));
            if (next < distance) { best = candidate; distance = next; }
        }
        return best;
    }
}
```

## Verify and explain the boundary

Run `dotnet build Core`. Expect a successful library build. Core has no entry point, so `dotnet run --project Core` is the wrong operation.

Trace Point(0): X=0, Y=7, Z=64. Trace Forward(0) and Right(0). Explain why the curve closes and why the local search is not safe for arbitrary teleports. Later executable checks will assert closure and both wrap boundaries. Commit the completed file after inspecting its diff.

