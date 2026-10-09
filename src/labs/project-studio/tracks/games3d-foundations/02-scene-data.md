---
title: Scene objects, identity and testable editing
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Before drawing a cube, represent the object a cube depicts. If editing rules require a window, every test must open one. We will store scene data in Core and call it from a small Checks executable. Studio will call the same code later.

## Give the data its own build boundary

Create Core and Checks folders alongside Scratch. A library is compiled code used by another program; omit OutputType Exe because Core has no entry point. Dependency direction means which project can use which other project. Core will know nothing about the graphics library or editor widgets.

```xml edit=Core/Core.csproj mode=replace
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

## Name an object without making its name its identity

A class defines a kind of object; each new instance has its own state. A record is a C# type that supports value comparison and copying with selected changes. This record declares three public properties. Its properties are initialized at construction; positional record properties cannot be reassigned normally afterward.

Guid is an identifier generated independently of the object's list position or display name. Vector3 stores three floats together; it is a value type, so assigning it copies its coordinates. using makes names from System.Numerics available. Our own namespace is Studio3D.

```csharp edit=Core/SceneObject.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed record SceneObject(Guid Id, string Name, Vector3 Position);
```

The scene will eventually allow names and order to change. An ID lets a selection still refer to the same object. sealed prevents subclassing; we have no need for alternative SceneObject subclasses yet. These objects initially describe unit cubes only: shape, rotation, scale and behaviors come later.

## Own the list and validate additions

A List can grow. A private field is accessible only inside this class; public methods expose deliberate operations. IReadOnlyList exposes reading and counting, not list editing. AsReadOnly wraps the underlying list instead of returning a mutable List disguised as a read-only interface. The scene owns changes; clients read the latest state.

A method has parameters, a return type and a body. Add returns the newly created object's ID. Empty or whitespace-only names are rejected before creating an object. IsFinite rejects NaN (not a number) and infinity on every coordinate: those values do not describe a useful renderable position. The exclamation mark negates a Boolean; double ampersand requires both conditions to hold.

```csharp edit=Core/Scene.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed class Scene
{
    private readonly List<SceneObject> objects = new();
    public IReadOnlyList<SceneObject> Objects => objects.AsReadOnly();

    public static bool IsFinite(Vector3 value) =>
        float.IsFinite(value.X) && float.IsFinite(value.Y) && float.IsFinite(value.Z);

    public Guid Add(string name, Vector3 position)
    {
        if (string.IsNullOrWhiteSpace(name) || !IsFinite(position))
            throw new ArgumentException("An object needs a name and finite coordinates.");
        Guid id = Guid.NewGuid();
        objects.Add(new SceneObject(id, name.Trim(), position));
        return id;
    }
}
```

readonly prevents assigning the field to a different list; it does not make the list's contents immutable. The arrow in Objects defines a getter expression. ArgumentException identifies invalid arguments. Throwing interrupts this operation: no object is added after rejection. We will later turn inspector input failures into useful UI messages.

## Move by identity and reject an invalid result

Replace Scene.cs with the version below. The new TryMove operation returns true on success and false for an unknown object or invalid change. The loop starts at zero and visits indices strictly below Count; the last valid index is Count minus one. Vector addition adds corresponding coordinates.

The with expression copies a record, replacing Position while retaining Id and Name. We replace one list entry, leaving other entries unchanged. Check the computed position too: two finite floats can add to infinity through overflow. Validation precedes assignment, so failure preserves existing state.

```csharp edit=Core/Scene.cs mode=replace
using System.Numerics;

namespace Studio3D;

public sealed class Scene
{
    private readonly List<SceneObject> objects = new();
    public IReadOnlyList<SceneObject> Objects => objects.AsReadOnly();

    public static bool IsFinite(Vector3 value) =>
        float.IsFinite(value.X) && float.IsFinite(value.Y) && float.IsFinite(value.Z);

    public Guid Add(string name, Vector3 position)
    {
        if (string.IsNullOrWhiteSpace(name) || !IsFinite(position))
            throw new ArgumentException("An object needs a name and finite coordinates.");
        Guid id = Guid.NewGuid();
        objects.Add(new SceneObject(id, name.Trim(), position));
        return id;
    }

    public bool TryMove(Guid id, Vector3 delta)
    {
        if (!IsFinite(delta)) return false;
        for (int i = 0; i < objects.Count; i++)
        {
            if (objects[i].Id != id) continue;
            Vector3 position = objects[i].Position + delta;
            if (!IsFinite(position)) return false;
            objects[i] = objects[i] with { Position = position };
            return true;
        }
        return false;
    }
}
```

continue skips to the next loop iteration. Return exits the method. A linear search inspects at most the number of objects in the scene: doubling that number can double the work. A dictionary lookup becomes useful later if measurement shows this scan matters. We do not introduce another data structure just for two objects.

## Make the checks executable

ProjectReference makes Core available to Checks. The relative path goes up from Checks and then into Core. Checks has no graphics dependency, so it can run without a display.

```xml edit=Checks/Checks.csproj mode=replace
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../Core/Core.csproj" />
  </ItemGroup>
</Project>
```

## Assert behavior and observe a meaningful failure

An assertion checks an expected fact and fails if it is false. Arrange data, perform an operation, then inspect its effects. Check below throws with a useful label. An uncaught exception gives the process a nonzero exit code; an automated check can distinguish failure from success. This small runner stops at its first failure; a later test framework will teach isolated cases and richer reporting.

```predict
question: Two objects share the display name Beacon. Does moving the second object's ID move both?
choice: Both move because the names match
choice: Only the second moves because identity is separate
answer: Only the second moves because identity is separate
explain: TryMove compares IDs. Its record replacement preserves the selected object's identity and does not modify the first object. Names are labels, not lookup keys.
```

```csharp edit=Checks/Program.cs mode=replace
using System.Numerics;
using Studio3D;

void Check(bool condition, string label)
{
    if (!condition) throw new Exception(label);
}

Scene scene = new();
Guid first = scene.Add("Beacon", new Vector3(0, 0.5f, 0));
Guid second = scene.Add("Beacon", new Vector3(2, 0.5f, 0));
Check(first != second, "Object identities must differ");
Check(scene.TryMove(second, new Vector3(0.25f, 0, 0)), "Valid move rejected");
Check(scene.Objects[0].Position == new Vector3(0, 0.5f, 0), "Unselected object moved");
Check(scene.Objects[1].Position == new Vector3(2.25f, 0.5f, 0), "Selected object did not move");
Check(scene.Objects[1].Id == second, "Moving changed identity");
Check(!scene.TryMove(Guid.NewGuid(), Vector3.UnitX), "Unknown identity accepted");
Vector3 before = scene.Objects[1].Position;
Check(!scene.TryMove(second, new Vector3(float.NaN, 0, 0)), "Invalid delta accepted");
Check(scene.Objects[1].Position == before, "Rejected move changed state");
Scene large = new();
Guid largeId = large.Add("Far away", new Vector3(float.MaxValue, 0, 0));
Check(!large.TryMove(largeId, new Vector3(float.MaxValue, 0, 0)), "Overflow move accepted");
Check(large.Objects[0].Position.X == float.MaxValue, "Overflow changed state");
bool rejectedName = false;
try { scene.Add("  ", Vector3.Zero); }
catch (ArgumentException) { rejectedName = true; }
Check(rejectedName && scene.Objects.Count == 2, "Invalid addition changed scene");
Console.WriteLine("SCENE CHECKS PASSED");
```

UnitX is (1,0,0); Zero is (0,0,0). Vector equality here is suitable because the small quarter-unit inputs are exactly representable; later physics calculations need tolerances. float.MaxValue is the largest finite float. try/catch intercepts the specific exception expected for the deliberately invalid addition.

Run `dotnet run --project Checks`. Then change the expected selected position from 2.25 to 2.5, run again and require Selected object did not move with a nonzero exit. Restore 2.25 and rerun. This demonstrates a test that actually rejects an incorrect result. A compiler error is not evidence that the assertion worked.

```check
run "dotnet run --project Checks" exit=0 stdout="SCENE CHECKS PASSED" timeout=120
```

These checks establish identity-based movement, isolation and specific invalid-input cases. They do not prove all scene operations, a useful picture or UI correctness. An invalid position on Add remains a case for you to add.

## Independent task: strengthen the input boundary

In a separate practice copy, add tests rejecting an infinite coordinate on Add and on TryMove. Test negative movement and zero movement as valid cases. Verify that invalid additions preserve Count and invalid moves preserve every object's position. Write down why negative is not the same as invalid.

```hints
nudge: Start with a scene you know and capture its state before trying the questionable input.
concept: A finite negative number is a valid coordinate or displacement. NaN and infinity are representation failures, independent of sign.
shape: Use try/catch for Add's exception contract and the Boolean result for TryMove. Assert the result and unchanged state separately; include a finite negative delta that must succeed.
```
