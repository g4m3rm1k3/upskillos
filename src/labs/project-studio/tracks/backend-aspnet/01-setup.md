---
title: 1 — A typed service and a build toolchain
track: Backend Developer Bootcamp — ASP.NET Core — Stock Reservations
trackOrder: 51.03
runtime: none
---

Build Stockroom, an inventory reservation API for workshop kits. It must never sell more units than exist. This section starts independently in a folder named stockroom and requires basic variables, functions and conditionals in any language. It introduces the C# constructs it uses. Install the .NET 10 SDK and Git; an SDK compiles and includes development tools, while a runtime only executes built programs.

### The story so far

Start here in an empty project folder. This framework section stands alone; you do not need files from another backend section.

## Establish the command line

Run `dotnet --info` and `dotnet --list-sdks`; verify a 10.x SDK is available. From the empty folder run `dotnet new web -n Stock.Api --framework net10.0`. An SDK mismatch is a toolchain issue, not an application bug. `pwd` or PowerShell `Get-Location` shows where the project is created.

A .csproj is an XML build manifest. NuGet resolves packages; obj and bin are generated build output. A namespace groups types. C# compiles before execution, so misspelled member names are usually caught before the first request.

```predict
question: Can the .NET runtime alone compile this project?
choice: No; use the SDK
choice: Yes
answer: No; use the SDK
explain: The SDK supplies the compiler and build tooling.
```

## Declare the service project

Replace the scaffold project file. Run `dotnet restore Stock.Api --use-lock-file`. The 10.0 patch wildcard stays in the selected framework line; packages.lock.json records the actual resolution. Commit that lock and use `dotnet restore Stock.Api --locked-mode` in CI. Update patches deliberately, test and review the lock diff. Do not describe an unpinned wildcard as reproducible by itself.

```xml file=Stock.Api/Stock.Api.csproj
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup><TargetFramework>net10.0</TargetFramework><Nullable>enable</Nullable><ImplicitUsings>enable</ImplicitUsings></PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.*" />
    <PackageReference Include="Microsoft.Data.Sqlite" Version="10.0.*" />
  </ItemGroup>
</Project>
```


## Ignore build products

Run `git init`; inspect generated source and ignore output folders. Secrets belong in environment configuration or a local secret store. `dotnet user-secrets` is a development convenience, not an encrypted production vault.

```text file=.gitignore
**/bin/
**/obj/
*.db
.env
```


## Choose the application shape

The project uses controllers for HTTP, a small policy type for rules and a store for transactional SQL. ASP.NET Core MVC can also render views; this API has no server-rendered view, so its representations are JSON DTOs. Minimal APIs are another valid adapter style. Neither choice requires microservices or a generic repository around every table.

Our first release has one SKU, starter-kit, with ten units. Multiple SKUs, warehouse transfers and payment capture are independent extensions. Keeping the first invariant narrow makes its race condition demonstrable.

## Your turn: define the inventory invariant

Write available >= 0 and requested quantity between 1 and 10. Give a schedule where two requests read seven units and both try to reserve five. Explain why an application-level if statement alone cannot prevent overselling.

Write your evidence in `evidence/setup.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/setup.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If restore succeeds but build fails, read the first compiler diagnostic and verify the target framework. Explain what nullable reference checking can catch and why it cannot establish authorization.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
