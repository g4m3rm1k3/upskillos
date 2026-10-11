---
title: 5 — Host the real pipeline in tests
track: Backend Developer Bootcamp — ASP.NET Core — Stock Reservations
trackOrder: 51.03
runtime: none
---

Outcome: compile and test a real HTTP pipeline and SQLite store without leaving a server running.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Declare the test project

Create the Stock.Tests folder and this manifest. Run `dotnet restore Stock.Tests --use-lock-file`; commit its lock after tests pass. WebApplicationFactory creates an in-process host; xUnit discovers test methods. Tests reference the API rather than copying business logic.

```xml file=Stock.Tests/Stock.Tests.csproj
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup><TargetFramework>net10.0</TargetFramework><Nullable>enable</Nullable><ImplicitUsings>enable</ImplicitUsings><IsTestProject>true</IsTestProject></PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.14.1" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.1" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.*" />
    <ProjectReference Include="../Stock.Api/Stock.Api.csproj" />
  </ItemGroup>
</Project>
```


```predict
question: Do tests with a fake principal validate the real JWT signature configuration?
choice: No
choice: Yes
answer: No
explain: They bypass token verification to test downstream behavior.
```

## Assert observable behavior

The test-only authentication handler creates principals from a test header. It lives exclusively in the test project; a separate test verifies that the actual application rejects that header. These tests establish downstream authorization, not real identity-provider cryptography. Add invalid-signature, issuer, audience and expiry integration cases against a configured test issuer before release.

Each test instance owns a fresh temporary database. The contention test makes two independent connection attempts and checks what remains available, so a successful status cannot hide an oversell. WebApplicationFactory and clients are disposed; no manual server is needed. Reference: [ASP.NET Core integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0).

```csharp file=Stock.Tests/ReservationTests.cs
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stock.Api;
using Xunit;

public sealed class TestIdentity(IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger, UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var user = Request.Headers["X-Test-User"].ToString();
        if (user is not ("alice" or "bob")) return Task.FromResult(AuthenticateResult.NoResult());
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", user)], Scheme.Name));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name)));
    }
}

public sealed class ReservationTests : IDisposable
{
    private readonly string path = Path.Combine(Path.GetTempPath(), $"stock-{Guid.NewGuid()}.db");
    private readonly WebApplicationFactory<Program> factory;
    public ReservationTests()
    {
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<StockStore>();
                services.AddSingleton(new StockStore(path));
                services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestIdentity>("Test", _ => { });
            });
        });
    }
    private HttpClient Client(string? user = null)
    {
        var client = factory.CreateClient();
        if (user != null) client.DefaultRequestHeaders.Add("X-Test-User", user);
        return client;
    }
    [Fact]
    public async Task OwnershipValidationAndConflict()
    {
        using var anonymous = Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync("/reservations", new { quantity = 1 })).StatusCode);
        using var alice = Client("alice");
        using var bob = Client("bob");
        Assert.Equal(HttpStatusCode.BadRequest, (await alice.PostAsJsonAsync("/reservations", new { quantity = 0 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await alice.PostAsJsonAsync("/reservations", new { quantity = 1, owner = "bob" })).StatusCode);
        var response = await alice.PostAsJsonAsync("/reservations", new { quantity = 7 });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, (await alice.GetAsync(response.Headers.Location)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync(response.Headers.Location)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await bob.PostAsJsonAsync("/reservations", new { quantity = 4 })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await bob.PostAsJsonAsync("/reservations", new { quantity = 3 })).StatusCode);
    }
    [Fact]
    public async Task ConcurrentReservationsCannotOversell()
    {
        var store = new StockStore(path);
        async Task<bool> Attempt(string owner) => await Task.Run(() =>
        {
            try { store.Reserve(owner, 7); return true; }
            catch (OutOfStockException) { return false; }
        });
        var results = await Task.WhenAll(Attempt("alice"), Attempt("bob"));
        Assert.Single(results, success => success);
        var remainder = store.Reserve("alice", 3);
        Assert.Equal(3, remainder.Quantity);
        Assert.Throws<OutOfStockException>(() => store.Reserve("alice", 1));
    }
    [Fact]
    public async Task ProductionAuthenticationDoesNotAcceptTestHeader()
    {
        using var actual = new WebApplicationFactory<Program>().WithWebHostBuilder(b => b.UseEnvironment("Development"));
        using var client = actual.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/reservations/unknown")).StatusCode);
    }
    public void Dispose() { factory.Dispose(); File.Delete(path); }
}
```


## Read test and compiler failures

Run `dotnet test Stock.Tests`. Expected: all tests pass. Compilation errors occur before test discovery; they are not failing assertions. Restore problems are dependency/toolchain failures. Inspect the first failure category before changing application logic. Introduce a negative quantity regression deliberately and confirm the test catches it.

## Your turn: add real token rejection tests

Use a dedicated test signing key and issuer configuration to exercise JWT middleware. Assert 401 for an expired token, a wrong issuer, a wrong audience and a wrong signature, and 200 only for the owner with a valid token. Keep keys generated for testing out of deployed trust. Separately test the rollback experiment from the transaction lesson.

Write your evidence in `evidence/tests.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/tests.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Run the regression suite

Run from this project’s root with its tools installed. A nonzero exit means stop and read the first failure. These are finite tests; no manually running server is required.

```check
run "dotnet test Stock.Tests"
```

## Diagnose, explain and review

A fake authentication handler cannot prove signature verification. Explain which tests establish identity, which establish permissions and which establish stock consistency.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
