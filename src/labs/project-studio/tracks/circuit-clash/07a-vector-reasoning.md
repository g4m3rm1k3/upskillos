---
title: Vectors and angles — calculate before drawing
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

The track lesson introduced the formulas used by the game. Now test their geometric meaning with tiny independent examples. You do not need prior linear algebra; each operation gets a concrete interpretation.

## Separate a point, a displacement, and a unit direction

From position (1,0,2) to (4,0,6), subtraction produces displacement (3,0,4). Its length is sqrt(3²+4²)=5. Dividing by length produces unit direction (.6,0,.8): it says where to travel without specifying how far. Multiply that direction by speed two and duration .5 to move one unit, landing at (1.6,0,2.8).

System.Numerics.Vector3 stores three floats. The library cannot tell whether a particular vector means a point, direction, or displacement; our names and operations carry that distinction. Adding two positions usually has no direct movement interpretation, while adding a displacement to a position does.

Normalize requires a nonzero length. Before normalizing a possibly zero displacement, compare its squared length with a small threshold and choose a meaningful fallback. Reaching a target is not an error to repair by producing NaN coordinates. NaN means not-a-number; its comparisons do not behave like ordinary finite values and can spread through a scene.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
using System.Numerics;
Vector3 start = new(1,0,2);
Vector3 target = new(4,0,6);
Vector3 displacement = target - start;
float distance = displacement.Length();
Vector3 direction = displacement / distance;
Vector3 next = start + direction * 2f * 0.5f;
if (MathF.Abs(distance - 5f) > 0.0001f || Vector3.Distance(next,new(1.6f,0,2.8f)) > 0.0001f)
    throw new Exception("Direction and distance were confused");
Console.WriteLine("VECTOR MOTION PASSED");
```

## Convert angle units at the boundary

Degrees divide a turn into 360 parts; radians measure arc length relative to radius and divide a turn into 2π, called Tau. Convert degrees to radians by multiplying by π/180. Convert back by multiplying by 180/π. Raylib's camera field of view uses degrees, while MathF.Sin and Cos expect radians.

At ninety degrees, yaw should rotate local forward from +Z to +X. Passing the number 90 directly to Sin would ask for ninety radians, a different direction, and the program would still compile. This is a semantic type error: both quantities use float storage but different units.

Use names ending in Degrees/Radians at API boundaries rather than remembering a convention silently. A larger library can wrap units in distinct value types to make invalid combinations harder to express. Our small game documents its convention and tests the expected directions.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
using System.Numerics;
float yawDegrees = 90f;
float yawRadians = yawDegrees * MathF.PI / 180f;
Vector3 forward = new(MathF.Sin(yawRadians),0,MathF.Cos(yawRadians));
if (Vector3.Distance(forward,Vector3.UnitX) > 0.0001f)
    throw new Exception("Quarter turn should face +X");
Console.WriteLine("ANGLE UNITS PASSED");
```

## Use a dot product as a signed projection

A dot product multiplies corresponding components and adds them. If forward is a unit direction, Dot(displacement,forward) is the signed distance along it. A positive result is ahead; negative is behind; zero is perpendicular. With forward +Z, offset (2,0,10) projects to ten and (2,0,-10) to negative ten.

This is why target selection needs more than distance alone: both offsets have the same Euclidean length but lie on opposite sides of the racer. Dotting with Right separately measures lateral offset. If forward is not normalized, the projection is scaled and no longer a distance in world units.

The face-lighting lesson uses the same operation between two unit directions, where the result measures alignment rather than metres. The numeric operation is identical; the interpretation follows the inputs. That is a transferable math habit: state what each quantity means before applying a formula.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
using System.Numerics;
Vector3 forward = Vector3.UnitZ;
float ahead = Vector3.Dot(new Vector3(2,0,10), forward);
float behind = Vector3.Dot(new Vector3(2,0,-10), forward);
if (ahead != 10 || behind != -10) throw new Exception("Projection direction failed");
Console.WriteLine("SIGNED PROJECTION PASSED");
```

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

A target is exactly at the current position. Write a function that returns “arrived” instead of normalizing a zero vector. Then apply the same idea to two coincident collision centers and explain why that case needs a separation fallback instead.

