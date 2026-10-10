---
title: Turn your shape experiment into a validated asset recipe
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

In See box dimensions change before designing assets, you made a tile and a trunk appear. You also saw the preview jump between selected objects and disappear on restart. Now give those dimensions an explicit, validated description. The example is concrete before the abstraction: a trunk uses (0.5, 2, 0.5), while a tile uses (2, 0.25, 2).

This lesson runs in Core and Checks. The visible preview remains available; the next lesson attaches recipes to individual scene objects and the following lesson saves them. These are separate contracts with separate evidence.

By the end, you can create two differently sized low-poly box recipes, reject invalid dimensions and explain why immutable asset data belongs outside the graphics library. Continue from See box dimensions change before designing assets.

## Predict what a recipe owns

An asset recipe describes what to construct. A scene object describes where an instance lives and gives it an identity. A GPU mesh is a resource created from that description. Keeping those roles separate lets headless checks run without a window and lets many objects share a recipe. We start with boxes rather than pretending every primitive is already supported.

```predict
question: Two objects share one immutable box recipe. Moving one object should change what?
choice: Only that object's position
choice: The dimensions of the shared recipe
answer: Only that object's position
explain: Instance position and asset dimensions have different owners. Sharing immutable descriptions is safe because moving an instance does not mutate the description.
```

## Make invalid dimensions impossible to construct

Create Core/BoxRecipe.cs. A sealed record supplies value equality: two recipes with equal dimensions compare equal. Get-only properties and a validating constructor prevent a caller from bypassing validation with an object initializer or a with expression. Do not use a positional record here: its automatically generated init properties would allow that bypass.

Dimensions are full width, height and depth in world units, not half extents. Reject zero, negatives, NaN and infinity. The deliberate maximum is an editor policy, not a universal graphics limit. Validation checks each component; checking only the vector's length can overflow and hides which constraint failed.

```csharp edit=Core/BoxRecipe.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed record BoxRecipe
{
    public Vector3 Size { get; }
    public BoxRecipe(Vector3 size)
    {
        if (!Scene.IsFinite(size) || size.X <= 0 || size.Y <= 0 || size.Z <= 0
            || size.X > 100 || size.Y > 100 || size.Z > 100)
            throw new ArgumentOutOfRangeException(nameof(size), "Each dimension must be finite and in (0, 100].");
        Size = size;
    }
}
```

The exception marks a violated construction contract. A future inspector should validate user input and present a useful message before constructing a recipe. Do not catch every exception and silently create a unit box: that turns bad data into a misleading success. Vector3 is a value type; returning Size returns a value, not a mutable reference into the recipe.

## Check boundaries and sharing

Create Checks/AssetChecks.cs. These checks exercise values rather than merely checking the implementation's spelling. The two accepted recipes represent a trunk and a platform; they are recipes, not complete game objects.

```csharp edit=Checks/AssetChecks.cs mode=replace
using System.Numerics;
using Studio3D;

public static class AssetChecks
{
    public static void Run(Action<bool, string> check)
    {
        BoxRecipe trunk = new(new Vector3(0.5f, 2, 0.5f));
        BoxRecipe platform = new(new Vector3(4, 0.25f, 3));
        check(trunk.Size.Y == 2 && platform.Size.X == 4, "Dimensions were changed");
        check(trunk == new BoxRecipe(trunk.Size), "Recipe value equality changed");
        Vector3 local = trunk.Size;
        local.Y = 9;
        check(trunk.Size.Y == 2, "A copied size mutated its recipe");
        foreach (Vector3 bad in new[] {
            new Vector3(0, 1, 1), new Vector3(1, -1, 1),
            new Vector3(1, 1, float.NaN), new Vector3(float.PositiveInfinity, 1, 1),
            new Vector3(101, 1, 1) })
        {
            bool rejected = false;
            try { _ = new BoxRecipe(bad); }
            catch (ArgumentOutOfRangeException) { rejected = true; }
            check(rejected, "Invalid box dimensions accepted");
        }
        check(new BoxRecipe(new Vector3(100, 0.001f, 1)).Size.X == 100,
            "Valid boundary dimensions rejected");
        Console.WriteLine("ASSET CHECKS PASSED");
    }
}
```

## Run, break and repair the contract

Append the call to Checks/Program.cs. Run the checks before changing the implementation.

```csharp edit=Checks/Program.cs mode=append
AssetChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="ASSET CHECKS PASSED" timeout=120
```

Temporarily remove the size.X <= 0 condition in BoxRecipe. Run again and require Invalid box dimensions accepted, rather than a compiler error. Explain why the zero-width example detects this defect. Restore the condition and rerun. If another condition still rejects the example, inspect its input and explain the overlap rather than declaring the test broken.

## Independent task: define a level's scale

In a separate practice copy, choose dimensions for a fence post, road tile and ramp bounding box. Record units and explain which dimensions need to match so adjoining road tiles fit. A box bounding a ramp is not ramp geometry. Add checks for a negative Z dimension and a value just above the maximum on Y, then implement a different explicit maximum policy. Keep the finite-value checks. Do not change the guided reference merely to obtain a green result.

```hints
nudge: Sketch the three axes and label full dimensions before writing numbers.
concept: A policy limit can change; rejecting NaN and infinity protects the representation regardless of that policy.
shape: Construct one accepted recipe at your new boundary and attempt one immediately beyond it. Catch only ArgumentOutOfRangeException and assert both outcomes.
```

### Explain and transfer

With the reference closed, explain why a copied Vector3 cannot mutate Size, why get-only matters on a record and why a scene position is not a recipe dimension. Keep your prediction, observed assertion failure, repair and independent boundary checks. These checks establish the recipe contract; they do not establish rendering, triangle winding, persistence, collision or mesh import. Those need their own evidence.
