---
title: 4 — Controllers consume verified identity
track: Backend Developer Bootcamp — ASP.NET Core — Stock Reservations
trackOrder: 51.03
runtime: none
---

Outcome: route requests through model binding, authentication, authorization and application rules. Token parsing is not token verification.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Create the controller

[ApiController] enables API conventions including model validation. [Authorize] requires authentication, but does not establish ownership of a reservation. The store query supplies the object-level check. `sub` is the identity provider's stable subject within the trusted issuer; a display name or email is not a stable substitute. This single-issuer design needs an issuer+subject identity key before trusting multiple issuers.

The primary constructor receives the store through dependency injection. CreatedAtAction generates a Location header pointing to the new representation. Known insufficient-stock failures map to 409; unexpected failures flow to centralized error handling.

```csharp file=Stock.Api/ReservationsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Stock.Api;

[ApiController]
[Route("reservations")]
[Authorize]
public sealed class ReservationsController(StockStore store) : ControllerBase
{
    private string? Owner => User.FindFirst("sub")?.Value;
    [HttpPost]
    public ActionResult<Reservation> Create(ReserveRequest request)
    {
        if (string.IsNullOrWhiteSpace(Owner)) return Forbid();
        try
        {
            var result = store.Reserve(Owner, request.Quantity);
            return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
        }
        catch (OutOfStockException) { return Conflict(new { error = "insufficient-stock" }); }
    }
    [HttpGet("{id}")]
    public ActionResult<Reservation> Get(string id)
    {
        if (string.IsNullOrWhiteSpace(Owner)) return Forbid();
        var result = store.Find(Owner, id);
        return result is null ? NotFound() : Ok(result);
    }
}
```


```predict
question: Does [Authorize] alone prove a caller owns the requested reservation?
choice: No
choice: Yes
answer: No
explain: It establishes the authentication requirement; resource policy remains separate.
```

## Compose the pipeline

Registration tells the dependency container how to construct services; middleware order tells the request pipeline what happens first. Authentication populates the principal before authorization checks it. ProblemDetails supplies a standard error envelope for unhandled failures without intentionally exposing stack traces.

Production requires Identity:Authority and Identity:Audience. Configure them as `Identity__Authority` and `Identity__Audience` environment variables, using a real HTTPS OIDC authority and this API's audience. JWT bearer middleware verifies signatures, issuer, audience and token lifetime through its configured trust. Never accept an unsigned token or trust a decoded payload alone. No tokens are minted by this API.

Reference: [ASP.NET Core resource authorization](https://learn.microsoft.com/en-us/aspnet/core/mvc/security/authorization/resource-based?view=aspnetcore-10.0). A resource handler becomes useful for richer policies involving roles, states or delegated access.

```csharp file=Stock.Api/Program.cs
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Stock.Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow);
builder.Services.AddProblemDetails();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    if (!builder.Environment.IsDevelopment())
    {
        options.Authority = builder.Configuration["Identity:Authority"]
            ?? throw new InvalidOperationException("Identity authority required");
        options.Audience = builder.Configuration["Identity:Audience"]
            ?? throw new InvalidOperationException("Identity audience required");
        options.RequireHttpsMetadata = true;
    }
});
builder.Services.AddAuthorization();
builder.Services.AddSingleton(_ => new StockStore(builder.Configuration["StockDb"] ?? "stock.db"));
var app = builder.Build();
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => new { status = "up" });
app.MapControllers();
app.Run();
public partial class Program { }
```


## Run with local development tokens

From the project root run `dotnet user-jwts create --project Stock.Api --name alice --audience http://localhost:8002` and follow its output. It writes local development authentication configuration and prints a token; do not commit or log that token. Run `dotnet run --project Stock.Api -- --urls http://localhost:8002`. The template launch profile uses Development; verify the printed environment. Use a second terminal with curl (PowerShell: curl.exe) or an HTTP client to POST JSON `{"quantity":7}` with Content-Type application/json and Authorization Bearer followed by the local token. Expect 201, then 409 for another reservation of seven.

Use separate subjects to test ownership. User-jwts is a development issuer only; production uses the configured authority. Stop the server with Ctrl+C. Bind local development to loopback; a deployed ingress must terminate TLS and enforce request-size/rate budgets.

## Your turn: define a authorization matrix

List anonymous, authenticated owner, other owner and inventory operator against read/reserve/release operations. Add a release endpoint with a policy and ownership checks. Test that a client-supplied role or owner in JSON cannot grant access. Distinguish 401 (no valid authentication) from 403 (authenticated but disallowed).

Write your evidence in `evidence/authentication.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/authentication.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If all signed tokens work across APIs, inspect audience validation. If another account reads your reservation, inspect the resource predicate rather than the login screen.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
