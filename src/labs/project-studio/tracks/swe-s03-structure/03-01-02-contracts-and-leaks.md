---
title: "Contracts and Leaks: Framework's First Interface"
runtime: dotnet
---

Framework is the course's web framework: the code that sits between the network and an application, receiving requests and handing them to the right code. Real frameworks (ASP.NET Core, Django, Express) are large, and most of their size is one boundary. On one side is HTTP: bytes on a socket, headers spelled however the client likes, connections that drop halfway. On the other is the application, which wants to be handed "a GET for `/notes`" and to give back an answer. Framework starts at that boundary, from the application's side, with **no networking at all**: a request, a response, and the interface of a handler that turns one into the other. A real network host plugs in much later (stage 7), and the bet this lesson makes is that it will need *no changes* to what you write today. Whether that bet pays depends on the contract written at the boundary, and on whether the abstraction leaks. Here you'll write the contract, find two leaks in it with tests, and seal them.

Framework is written in **C#**. It's the language this concept is best seen in: its compiler checks types, enforces `private`, and (from 03-02-03) stops one project from using another's internals. Python can only ask politely. No C# is assumed; each piece of syntax is explained where it first appears.

**By the end you can:**

- Explain why a framework's core should know nothing about the network, and what that buys (separation of concerns) (U).
- Write a contract at a module boundary, in documentation and in a constructor that refuses anything else, so callers never check (A).
- Recognize a leaky abstraction, where a detail of the implementation shows through the interface, and find one with a test (A).
- Create a .NET solution with a library and a test project, and test the library in memory with xUnit (A).

**You need:** 03-01-01 (interfaces and implementations), 02-06-01 (preconditions and postconditions), 01-04-01 (aliasing: two names, one object), 01-09 (tests). Framework lives in `framework/` in the course folder, with its own Git repository, like Ledger. Commands run inside `framework` unless a step says otherwise.

## Framework, and what it leaves out

Install the **.NET 10 SDK**, the current long-term-support release, from Microsoft's .NET download page. On Windows `winget install Microsoft.DotNet.SDK.10` does it, and on macOS `brew install --cask dotnet-sdk`. Linux distributions have a `dotnet-sdk-10.0` package. Open a new terminal afterwards, so it finds `dotnet`, and check:

```
dotnet --version
```

It should print a version starting `10.0.` (this lesson was written with `10.0.404`). Now, from the course folder, make Framework's folder and repository:

```
mkdir framework
cd framework
git init -b main
dotnet new gitignore
```

`dotnet new gitignore` writes a `.gitignore` for .NET projects. Among much else, it ignores `bin/` and `obj/`, where builds put their output. Now the code. A .NET program is made of **projects**: each is a folder with a `.csproj` file, which says what to build and what it depends on. A **solution** lists projects that belong together, so one command builds or tests them all. Make a solution, a library project for Framework's core, and a test project:

```
dotnet new sln -n Framework
dotnet new classlib -n Framework.Core -o src/Framework.Core
dotnet new xunit -n Framework.Core.Tests -o tests/Framework.Core.Tests
dotnet sln add src/Framework.Core/Framework.Core.csproj tests/Framework.Core.Tests/Framework.Core.Tests.csproj
dotnet add tests/Framework.Core.Tests/Framework.Core.Tests.csproj reference src/Framework.Core/Framework.Core.csproj
```

Line by line:

- `dotnet new sln` writes `Framework.slnx`, the solution: a short XML file listing the projects. (Older SDKs wrote a `.sln` file instead; `.slnx` is new in .NET 10.)
- `dotnet new classlib` makes a **class library**: code for other code to use, with no program to run.
- `dotnet new xunit` makes a test project that uses **xUnit**, the most common test framework for .NET. It plays the part `pytest` plays for Kit.
- `dotnet sln add` puts both projects in the solution.
- `dotnet add … reference` lets the tests use the core. The reference points one way only. The tests depend on the core, and the core will never know the tests exist.

Open `src/Framework.Core/Framework.Core.csproj`:

```
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

</Project>
```

`net10.0` is the .NET version to build for. `ImplicitUsings` makes common namespaces available in every file, so `Dictionary` and `ArgumentException` work without an import line. `Nullable` makes the compiler track which values may be `null` and warn when code might use one. The test project's `.csproj` is the same plus `PackageReference` lines: xUnit and the test runner, downloaded from NuGet, .NET's package registry, the first time you build. That's the one time Framework touches the network.

Notice what the core's file *doesn't* have: no package references at all. Framework's core will depend on nothing but .NET itself. The templates made two placeholder files, `Class1.cs` and `UnitTest1.cs`. Delete them, then build and test:

```
rm src/Framework.Core/Class1.cs tests/Framework.Core.Tests/UnitTest1.cs
dotnet build
dotnet test
```

(`rm` works in PowerShell too.) `dotnet build` ends with `Build succeeded.` and `0 Error(s)`. `dotnet test` builds, then says `No test is available`. That's true, and it's the honest starting point.

```check
run "dotnet --version" stdout="10." -- The .NET 10 SDK should be installed.
run "cd framework; dotnet sln list" stdout="Framework.Core.Tests.csproj" -- The solution should list the test project.
run "cd framework; dotnet sln list" stdout="Framework.Core.csproj" -- The solution should list the core library.
run "cd framework; dotnet list tests/Framework.Core.Tests/Framework.Core.Tests.csproj reference" stdout="Framework.Core.csproj" -- The test project should reference the core.
run "cd framework; dotnet build" stdout="0 Error(s)" -- The solution should build.
missing framework/src/Framework.Core/Class1.cs -- Delete the template's Class1.cs.
missing framework/tests/Framework.Core.Tests/UnitTest1.cs -- Delete the template's UnitTest1.cs.
```

## A request, with its contract

A **contract** at a module boundary says what each side may assume. Here the two sides are the code that makes a request (a test today, a network host later) and the handler that answers it. 02-06-01 put it as preconditions and postconditions. A contract is most useful when the module *enforces* its side. Then a `Request` that exists is a valid request, and no handler ever checks whether the method is spelled right. Create `src/Framework.Core/Request.cs`:

```csharp file=framework/src/Framework.Core/Request.cs
namespace Framework.Core;

/// <summary>
/// An HTTP request, as a handler sees it: a method, a path, headers and a
/// body, already read. No sockets, no bytes, no port: those belong to
/// whatever host receives the request.
/// </summary>
/// <remarks>
/// The contract. A Request that exists always has: a Method from Methods,
/// in capitals; a Path that starts with "/"; Headers (empty when there are
/// none); a Body (empty when there is none). The constructor refuses
/// anything else, so a handler never has to check.
/// </remarks>
public sealed class Request
{
    public static readonly IReadOnlySet<string> Methods =
        new HashSet<string> { "GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS" };

    public string Method { get; }
    public string Path { get; }
    public IReadOnlyDictionary<string, string> Headers { get; }
    public string Body { get; }

    public Request(string method, string path, IReadOnlyDictionary<string, string>? headers = null, string body = "")
    {
        if (!Methods.Contains(method))
            throw new ArgumentException($"method {method} isn't one of {string.Join(", ", Methods)}", nameof(method));
        if (!path.StartsWith('/'))
            throw new ArgumentException($"path {path} doesn't start with /", nameof(path));
        Method = method;
        Path = path;
        Headers = headers ?? new Dictionary<string, string>();
        Body = body;
    }
}
```

The C# in it, top to bottom:

- `namespace Framework.Core;` puts everything in the file into a **namespace**, C#'s way of grouping names, like a Python package's name.
- `///` comments are **documentation comments**. Editors show them when you hover over a name, and tools turn them into reference pages. The `<remarks>` section is where the contract is written down, beside the code that keeps it.
- `public sealed class Request` is a class anyone may use (`public`) and nobody may subclass (`sealed`). A subclass could break the contract, by adding a way to change the path, for example.
- `public string Method { get; }` is a **property** with only a `get`. Code outside can read it, and only the constructor can set it. After construction a `Request` can't change. Unlike Python's underscore, this is enforced: code that assigns to `request.Method` doesn't compile.
- `static readonly` belongs to the class itself, not to each request, and is set once. `IReadOnlySet` and `IReadOnlyDictionary` are **interfaces** that offer reading and no writing.
- The constructor has the same name as the class. `IReadOnlyDictionary<string, string>? headers = null` is a parameter that may be `null` (the `?`), and is `null` when left out. `headers ?? x` means "`headers`, or `x` if it's `null`".
- `$"…{method}…"` is an interpolated string, like Python's f-string. `nameof(method)` is the text `"method"`, checked by the compiler, so renaming the parameter can't leave the message stale.
- `throw new ArgumentException(…)` is C#'s `raise ValueError(…)`.

Save it and build:

```
dotnet build
```

`Build succeeded.`, `0 Warning(s)`, `0 Error(s)`. Nothing runs it yet.

```check
contains framework/src/Framework.Core/Request.cs "public sealed class Request" -- Create Request.cs with the Request class.
run "cd framework; dotnet build" stdout="0 Error(s)" -- Framework.Core should build with Request.cs.
```

## A response

A handler gives back a **response**: a status code (200 for OK, 404 for not found), the type of content, and a body. Create `src/Framework.Core/Response.cs`:

```csharp file=framework/src/Framework.Core/Response.cs
namespace Framework.Core;

/// <summary>
/// What a handler gives back: a status code, a content type and a body.
/// How it's written to a network, and when, is the host's business.
/// </summary>
public sealed record Response(int Status, string ContentType, string Body)
{
    public static Response Text(string body) => new(200, "text/plain; charset=utf-8", body);
}
```

A `record` is a class written for data. The line `record Response(int Status, string ContentType, string Body)` declares three read-only properties and a constructor that sets them. A record also gets **value equality**: two `Response`s with the same status, type and body are equal, as two `Money`s with the same cents are (02-08-01). It's the C# version of a frozen dataclass. `Text` is a `static` method, a shortcut for the most common response. `=>` gives a method whose body is one expression. `new(200, …)` is `new Response(200, …)`, with the type left for the compiler to work out.

Save it, and run `dotnet build` again: `0 Error(s)`.

```check
contains framework/src/Framework.Core/Response.cs "record Response" -- Create Response.cs with the Response record.
run "cd framework; dotnet build" stdout="0 Error(s)" -- Framework.Core should build with Response.cs.
```

## A handler

Now the interface the whole framework is built around. Create `src/Framework.Core/IHandler.cs`:

```csharp file=framework/src/Framework.Core/IHandler.cs
namespace Framework.Core;

/// <summary>
/// Anything that answers requests. The contract: given any Request (which
/// is valid, because Request refuses to be anything else), Handle returns a
/// Response, never null; a request it has no answer for gets a Response
/// that says so, such as a 404.
/// </summary>
public interface IHandler
{
    Response Handle(Request request);
}
```

An `interface` lists members with no bodies. By convention its name starts with `I`. A class **implements** it by saying so, `class GreetingHandler : IHandler`, and then the compiler requires every member to be there. Compare 03-01-01's `Protocol`. Python accepts anything with the right shape, and checks nothing when the program runs. C# accepts only a class that declares the interface, and checks it before the program can run at all. Both are interfaces: what may be asked, with the implementations out of sight. The difference is who enforces it, and when.

The contract in the comment has two halves. The handler may *assume* a valid `Request`, because `Request` guarantees it. The handler *promises* a `Response`, never `null`. The `Nullable` setting backs part of that promise up: with it on, returning `null` from `Handle` gets a compiler warning. Save it and build (`0 Error(s)`).

```check
contains framework/src/Framework.Core/IHandler.cs "Response Handle(Request request)" -- Create IHandler.cs with the Handle method.
run "cd framework; dotnet build" stdout="0 Error(s)" -- Framework.Core should build with IHandler.cs.
```

## Tests that build requests in memory

Because the core knows nothing about networks, a test can make a `Request` with `new`, hand it to a handler, and look at the `Response`. No server, no port, no waiting. Create `tests/Framework.Core.Tests/RequestTests.cs`:

```csharp file=framework/tests/Framework.Core.Tests/RequestTests.cs
using Framework.Core;

namespace Framework.Core.Tests;

// A handler made for these tests: it answers in French when the request's
// Accept-Language header asks for it, and in English otherwise.
public class GreetingHandler : IHandler
{
    public Response Handle(Request request) =>
        request.Headers.TryGetValue("Accept-Language", out var language) && language.StartsWith("fr")
            ? Response.Text("bonjour")
            : Response.Text("hello");
}

public class RequestTests
{
    [Fact]
    public void A_request_keeps_what_it_was_given()
    {
        var request = new Request("POST", "/notes", new Dictionary<string, string> { ["Content-Type"] = "text/plain" }, "milk");
        Assert.Equal("POST", request.Method);
        Assert.Equal("/notes", request.Path);
        Assert.Equal("text/plain", request.Headers["Content-Type"]);
        Assert.Equal("milk", request.Body);
    }

    [Theory]
    [InlineData("get")]
    [InlineData("FETCH")]
    [InlineData("")]
    public void A_method_that_isnt_a_known_one_in_capitals_is_refused(string method)
    {
        Assert.Throws<ArgumentException>(() => new Request(method, "/"));
    }

    [Fact]
    public void A_path_must_start_with_a_slash()
    {
        Assert.Throws<ArgumentException>(() => new Request("GET", "notes"));
    }

    [Fact]
    public void A_handler_answers_a_request_built_in_memory()
    {
        var request = new Request("GET", "/", new Dictionary<string, string> { ["Accept-Language"] = "fr-FR" });
        Assert.Equal(Response.Text("bonjour"), new GreetingHandler().Handle(request));
    }
}
```

The new pieces:

- `using Framework.Core;` lets this file use the core's names.
- `GreetingHandler : IHandler` implements the interface. `TryGetValue(name, out var language)` returns `true` and sets `language` when the header is there, and `false` when it isn't, so a missing header is no error. `a ? b : c` is "`b` if `a`, else `c`".
- A method marked `[Fact]` is a test. `[Theory]` with `[InlineData(…)]` runs the test once per data line, like `pytest.mark.parametrize`. xUnit finds tests by these **attributes**, the bracketed markers. `Assert.Equal(expected, actual)` puts the expected value first.
- `Assert.Throws<ArgumentException>(() => …)` passes only if the code inside throws that exception. `() => …` is a **lambda**, a function with no name, like Python's `lambda:`.
- `var` lets the compiler work out the type: `request` is a `Request`.
- `new Dictionary<string, string> { ["Content-Type"] = "text/plain" }` makes a dictionary with one entry.

```predict
question: The second test makes new Request("get", "/"). What happens?
choice: The request is made, with Method "get"
choice: The request is made, with Method changed to "GET"
choice: The constructor throws ArgumentException
answer: The constructor throws ArgumentException
explain: "get" isn't in Methods, which holds the capitalized names, and the constructor refuses rather than guessing. HTTP's method names are case-sensitive (RFC 9110, section 9.1), so "get" isn't a GET, and quietly fixing it would hide a client's bug. Refusing at the boundary means no handler ever sees a request it would have to second-guess.
```

Save it and run the tests:

```
dotnet test
```

```
Passed!  - Failed:     0, Passed:     6, Skipped:     0, Total:     6, Duration: 294 ms - Framework.Core.Tests.dll (net10.0)
```

Six tests (the `Theory` counts once per data line) in a fraction of a second. This is what **separation of concerns** buys. Receiving bytes from a network is one concern. Deciding what a request means is another. Because the core holds only the second, it can be tested without the first.

```check
run "cd framework; dotnet test" stdout="Passed:     6" without="Failed!" -- All six tests should pass.
```

## A leak

The `Headers` property is an `IReadOnlyDictionary`: the interface lets a handler read headers, and nothing else. But behind it is whatever dictionary the caller passed in, and that dictionary's behaviour shows through. Two facts about HTTP matter here. Header names are **case-insensitive**: `Accept-Language` and `accept-language` are the same header (RFC 9110, section 5.1). And HTTP/2, which most browsers use, sends every header name in lower case. A `Dictionary<string, string>` compares keys exactly.

```predict
question: A browser speaking HTTP/2 sends accept-language: fr-FR, and the host builds a Request from it. What does GreetingHandler answer?
choice: bonjour
choice: hello
choice: It throws KeyNotFoundException
answer: hello
explain: TryGetValue("Accept-Language") looks for that exact key in a dictionary holding "accept-language", finds nothing, and returns false, so the handler takes its English branch. Nothing fails; the French speaker just gets the wrong answer. If the handler had used request.Headers["Accept-Language"] instead, it would have thrown KeyNotFoundException.
```

A detail of the implementation (how this dictionary compares keys) has become something every handler must know about. That's a **leaky abstraction**. Joel Spolsky named it in 2002, in "The Law of Leaky Abstractions": "All non-trivial abstractions, to some degree, are leaky." The law doesn't mean abstractions are useless. It means the leaks are where the bugs are, so you look for them. Write the contract's promise about headers as tests. Create `tests/Framework.Core.Tests/HeaderTests.cs`:

```csharp file=framework/tests/Framework.Core.Tests/HeaderTests.cs
using Framework.Core;

namespace Framework.Core.Tests;

// Headers are part of Request's contract, so they get their own tests: what
// HTTP promises about them, Request must promise too.
public class HeaderTests
{
    // HTTP header names are case-insensitive (RFC 9110, section 5.1), and
    // HTTP/2 sends every name in lower case.
    [Fact]
    public void Header_names_are_case_insensitive()
    {
        var request = new Request("GET", "/", new Dictionary<string, string> { ["accept-language"] = "fr-FR" });
        Assert.Equal(Response.Text("bonjour"), new GreetingHandler().Handle(request));
    }

    // A Request can't change after it's made, even if the dictionary it was
    // made from does.
    [Fact]
    public void Changing_the_dictionary_afterwards_doesnt_change_the_request()
    {
        var headers = new Dictionary<string, string> { ["Accept-Language"] = "fr-FR" };
        var request = new Request("GET", "/", headers);
        headers["Accept-Language"] = "en-GB";
        Assert.Equal("fr-FR", request.Headers["Accept-Language"]);
    }
}
```

The second test checks a promise the contract made in a word: a `Request` can't change. Save it, and run the tests:

```
dotnet test
```

```
  Failed Framework.Core.Tests.HeaderTests.Header_names_are_case_insensitive [19 ms]
  Error Message:
   Assert.Equal() Failure: Values differ
Expected: Response { Status = 200, ContentType = text/plain; charset=utf-8, Body = bonjour }
Actual:   Response { Status = 200, ContentType = text/plain; charset=utf-8, Body = hello }
  Failed Framework.Core.Tests.HeaderTests.Changing_the_dictionary_afterwards_doesnt_change_the_request [3 ms]
  Error Message:
   Assert.Equal() Failure: Strings differ
Expected: "fr-FR"
Actual:   "en-GB"
Failed!  - Failed:     2, Passed:     6, Skipped:     0, Total:     8
```

Read the two failures. They're two different leaks.

1. **Case.** The first is what the prediction said: `hello`, quietly. The record's printout shows the whole response, which makes the difference easy to spot. This leak comes from the dictionary's *comparison*.
2. **Aliasing.** The second is 01-04-01's aliasing. `Headers = headers` stored a reference to the caller's dictionary, not a copy. The caller kept a second name for the same object, and changed it. `IReadOnlyDictionary` stops the *handler* from writing to the headers, but nothing stops whoever still holds the original. Read-only access isn't the same as unchangeable.

Both leaks have the same cause. `Request` let its caller's object become its own inside.

```check
run "cd framework; dotnet test" exit=1 stdout="Failed:     2, Passed:     6" -- With Request storing the caller's dictionary, the two header tests should fail and the six others pass.
```

## Sealing the leak

One change fixes both. `Request` makes its own copy of the headers, and the copy compares names without case. Replace `src/Framework.Core/Request.cs`. Only the line that sets `Headers` changes, with a comment saying why:

```csharp file=framework/src/Framework.Core/Request.cs
namespace Framework.Core;

/// <summary>
/// An HTTP request, as a handler sees it: a method, a path, headers and a
/// body, already read. No sockets, no bytes, no port: those belong to
/// whatever host receives the request.
/// </summary>
/// <remarks>
/// The contract. A Request that exists always has: a Method from Methods,
/// in capitals; a Path that starts with "/"; Headers (empty when there are
/// none); a Body (empty when there is none). The constructor refuses
/// anything else, so a handler never has to check.
/// </remarks>
public sealed class Request
{
    public static readonly IReadOnlySet<string> Methods =
        new HashSet<string> { "GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS" };

    public string Method { get; }
    public string Path { get; }
    public IReadOnlyDictionary<string, string> Headers { get; }
    public string Body { get; }

    public Request(string method, string path, IReadOnlyDictionary<string, string>? headers = null, string body = "")
    {
        if (!Methods.Contains(method))
            throw new ArgumentException($"method {method} isn't one of {string.Join(", ", Methods)}", nameof(method));
        if (!path.StartsWith('/'))
            throw new ArgumentException($"path {path} doesn't start with /", nameof(path));
        Method = method;
        Path = path;
        // A copy, compared without case: HTTP header names are case-insensitive,
        // and a caller changing its own dictionary later mustn't change this one.
        Headers = new Dictionary<string, string>(headers ?? new Dictionary<string, string>(), StringComparer.OrdinalIgnoreCase);
        Body = body;
    }
}
```

`new Dictionary<string, string>(source, comparer)` copies every entry of `source` into a new dictionary, and `StringComparer.OrdinalIgnoreCase` makes it compare keys character by character, ignoring case. "Ordinal" means by character code, not by the rules of a language. That's right for protocol names like headers, which are ASCII and mean the same everywhere (02-11-01's collation is for text people read). Save it and run the tests:

```
dotnet test
```

```
Passed!  - Failed:     0, Passed:     8, Skipped:     0, Total:     8
```

Both leaks are sealed at the boundary, once, so no handler has to know. Commit:

```
git add .gitignore Framework.slnx src tests
git commit -m "Start Framework: a request, a response and a handler, with no network"
```

```check
run "cd framework; dotnet test" stdout="Passed:     8" without="Failed!" -- With the headers copied and compared without case, all eight tests should pass.
run "cd framework; git log -1 --format=%s" stdout="Start Framework" -- Commit Framework's start.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../framework'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:src/Framework.Core/Request.cs').returncode == 0, 'OrdinalIgnoreCase' in git('show', 'HEAD:src/Framework.Core/Request.cs').stdout, 'bin/' in git('ls-files').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True False True" -- The commit should hold the sealed Request, no build output (bin/), and nothing left over.
```

**What else, and why not.** You could build on ASP.NET Core, .NET's real web framework, which has all of this and much more. Building Framework is how this course shows what such a framework hides and why. Board, the app that comes later, is the kind of program that should use one. You could make `Request` a `record`, like `Response`. But a record also allows `request with { Method = "get" }`, which copies a request and changes a property *without running the constructor*, slipping past the contract. A `sealed class` with only `get` properties leaves the constructor as the only way in. You could give headers their own type, as ASP.NET Core does (`IHeaderDictionary`, whose values are lists). That's the honest model, because HTTP lets a header appear more than once (`Set-Cookie`, for example), and a `string` to `string` dictionary can't hold that. It's a leak this lesson leaves open, and says so below. You could also lower-case every name on the way in, instead of comparing without case. That works, but then the original spelling is lost, and every reader must remember to lower-case the names it asks for.

## Your turn: Response's contract

`Response` has no contract yet. `new Response(42, "text/plain", "")` builds happily, and so does a status of `-1`. HTTP's status codes run from 100 to 599. Give `Response` a contract, and give Framework its first real handler:

- A `Response` refuses a status below 100 or above 599, by throwing `ArgumentOutOfRangeException`. 100 and 599 are allowed. Write the contract in its `///` comment, as `Request`'s is.
- `Response.NotFound(path)` gives status 404, content type `text/plain; charset=utf-8`, and the body `no page at ` followed by the path (`no page at /nowhere`).
- A `NotFoundHandler` class in `src/Framework.Core/NotFoundHandler.cs` implements `IHandler` and answers every request with `Response.NotFound` of its path.
- `tests/Framework.Core.Tests/ResponseTests.cs` tests both ends of the range, values just outside it, and `NotFoundHandler`. Every test passes. Commit.

`Response` keeps its value equality: two equal responses still compare equal.

```hints
nudge: Where can a record check its arguments? The one-line form, record Response(int Status, …), has no constructor body to put a check in.
concept: A record can be written with explicit properties and its own constructor, like Request, and still be a record (value equality, printing). The constructor is the boundary: check there, once, and every Response that exists keeps the contract, whoever made it. Test the edges, 99 and 100, 599 and 600: that's where a > goes wrong.
shape: public sealed record Response { public int Status { get; } … public Response(int status, string contentType, string body) { if (status is < 100 or > 599) throw new ArgumentOutOfRangeException(nameof(status), status, "…"); … } public static Response Text(…) …; public static Response NotFound(string path) => new(404, "text/plain; charset=utf-8", $"no page at {path}"); }. NotFoundHandler: public sealed class NotFoundHandler : IHandler { public Response Handle(Request request) => Response.NotFound(request.Path); }.
answer: src/Framework.Core/Response.cs:
~~~csharp
namespace Framework.Core;

/// <summary>
/// What a handler gives back: a status code, a content type and a body.
/// How it's written to a network, and when, is the host's business.
/// </summary>
/// <remarks>
/// The contract. A Response that exists always has a Status from 100 to
/// 599 (the range HTTP's status codes use), a ContentType, and a Body
/// (empty when there is none). The constructor refuses anything else.
/// </remarks>
public sealed record Response
{
    public int Status { get; }
    public string ContentType { get; }
    public string Body { get; }

    public Response(int status, string contentType, string body)
    {
        if (status is < 100 or > 599)
            throw new ArgumentOutOfRangeException(nameof(status), status, "a status code is from 100 to 599");
        Status = status;
        ContentType = contentType;
        Body = body;
    }

    public static Response Text(string body) => new(200, "text/plain; charset=utf-8", body);

    public static Response NotFound(string path) => new(404, "text/plain; charset=utf-8", $"no page at {path}");
}
~~~
src/Framework.Core/NotFoundHandler.cs:
~~~csharp
namespace Framework.Core;

/// <summary>
/// The handler with no pages: every request gets a 404 that names its path.
/// The last answer when nothing else has one.
/// </summary>
public sealed class NotFoundHandler : IHandler
{
    public Response Handle(Request request) => Response.NotFound(request.Path);
}
~~~
tests/Framework.Core.Tests/ResponseTests.cs:
~~~csharp
using Framework.Core;

namespace Framework.Core.Tests;

public class ResponseTests
{
    [Theory]
    [InlineData(99)]
    [InlineData(600)]
    [InlineData(-200)]
    public void A_status_outside_100_to_599_is_refused(int status)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Response(status, "text/plain", ""));
    }

    [Theory]
    [InlineData(100)]
    [InlineData(599)]
    public void The_ends_of_the_range_are_allowed(int status)
    {
        Assert.Equal(status, new Response(status, "text/plain", "").Status);
    }

    [Fact]
    public void Not_found_names_the_path()
    {
        var response = new NotFoundHandler().Handle(new Request("GET", "/nowhere"));
        Assert.Equal(404, response.Status);
        Assert.Equal("no page at /nowhere", response.Body);
    }
}
~~~
`status is < 100 or > 599` is a C# pattern: true when status is below 100 or above 599. Then git add src tests and git commit -m "Give Response a contract, and add NotFoundHandler". The tempting slip is `status >= 599`, or `status > 500`, which refuses real codes: only a test at 599 itself catches it. The other is checking the status in Text or NotFound only: those are right, and new Response(42, …) still builds.
```

```check
run "cd framework; dotnet test" stdout="Passed!" without="Failed!" -- Every test should pass.
run "cd kit; .venv/Scripts/python -c \"import pathlib, subprocess, tempfile; p = pathlib.Path('../framework/src/Framework.Core/Framework.Core.csproj').resolve().as_posix(); f = pathlib.Path(tempfile.mkdtemp()) / 'probe.cs'; code = 'using Framework.Core; string Try(int s) { try { return new Response(s, ~text/plain~, ~~).Status.ToString(); } catch (ArgumentOutOfRangeException) { return ~refused~; } } Console.WriteLine(Try(99) + ~ ~ + Try(100) + ~ ~ + Try(599) + ~ ~ + Try(600) + ~ ~ + Try(-1));'; f.write_text('#:project ' + p + chr(10) + code.replace('~', chr(34)), encoding='utf-8'); r = subprocess.run(['dotnet', 'run', str(f)], capture_output=True, text=True); print(r.stdout.strip() or r.stderr.strip()[-400:])\"" stdout="refused 100 599 refused refused" -- Response should refuse 99, 600 and -1 with ArgumentOutOfRangeException, and allow 100 and 599.
run "cd kit; .venv/Scripts/python -c \"import pathlib, subprocess, tempfile; p = pathlib.Path('../framework/src/Framework.Core/Framework.Core.csproj').resolve().as_posix(); f = pathlib.Path(tempfile.mkdtemp()) / 'probe.cs'; code = 'using Framework.Core; IHandler h = new NotFoundHandler(); var r = h.Handle(new Request(~GET~, ~/x/y~)); Console.WriteLine(r.Status + ~ | ~ + r.ContentType + ~ | ~ + r.Body + ~ | ~ + (r == Response.NotFound(~/x/y~)));'; f.write_text('#:project ' + p + chr(10) + code.replace('~', chr(34)), encoding='utf-8'); r = subprocess.run(['dotnet', 'run', str(f)], capture_output=True, text=True); print(r.stdout.strip() or r.stderr.strip()[-400:])\"" stdout="404 | text/plain; charset=utf-8 | no page at /x/y | True" -- NotFoundHandler should be an IHandler answering 404 with the path, equal to Response.NotFound.
contains framework/tests/Framework.Core.Tests/ResponseTests.cs "NotFoundHandler" -- ResponseTests.cs should test NotFoundHandler.
contains framework/tests/Framework.Core.Tests/ResponseTests.cs "599" -- ResponseTests.cs should test the top of the range.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../framework'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:tests/Framework.Core.Tests/ResponseTests.cs').returncode == 0, git('cat-file', '-e', 'HEAD:src/Framework.Core/NotFoundHandler.cs').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit Response, NotFoundHandler and their tests, with nothing left over.
```

**What these checks establish, and what they don't.** They check that Framework builds as a solution of two projects, with the tests depending on the core and not the other way round. They check that `Request` refuses bad methods and paths, compares header names without case, and can't be changed through the caller's dictionary. A small program compiled against your core, outside your own tests, checks that `Response` refuses statuses outside 100 to 599, allows both ends, and that `NotFoundHandler` answers with a 404 naming the path. They can't check that the contract is the right one. `Request` still holds one value per header name, so a request with two `Cookie` lines can't be represented, and the host in stage 7 will have to decide what to do with one (join the values with `, `, as RFC 9110 allows for most headers). Nor do they check that the body should be text: a file upload is bytes, and `string Body` is a leak waiting for its first image. Writing those down as known limits, in the contract's comment, is part of the contract too.

```predict
question: In stage 7 a real host reads requests from a socket and builds Requests from them. One client sends a method of "get". Where should that be dealt with, and what should the client get back?
explain: At the boundary, by the host: Request's constructor refuses "get", so the host can't build one, and it should answer the client itself with an error (HTTP's 400 Bad Request, or 501 for an unknown method) without calling any handler. That's the contract working: the handlers never see an invalid request, and the decision about bad input is made once, by the one component that receives it. If the host lower-cased the method to make it fit, it would be hiding the client's mistake, the quiet fix 02-04-02 warned about.
```

## What you can do now

- **Separation of concerns:** a framework's core holds what a request *means*, and a host holds how it *arrives*. Keeping the network out of the core is why its tests build requests with `new` and run in milliseconds.
- A **contract at a module boundary** says what each side may assume. Write it beside the code (`<remarks>`), and enforce it in the one place every value passes through, the constructor. A `Request` that exists is a valid one, so no handler checks.
- A C# **interface** (`IHandler`) is enforced by the compiler: a class must declare it and have every member. Python's `Protocol` (03-01-01) is checked by nobody at run time. Same idea, different enforcer.
- A **leaky abstraction** lets an implementation detail through the interface. Here that was a dictionary's case-sensitive keys, and a reference to the caller's object. "All non-trivial abstractions, to some degree, are leaky" (Spolsky), so find the leaks with tests that state what the outside world promises (RFC 9110), and seal them once, at the boundary.
- Read-only isn't unchangeable. An `IReadOnlyDictionary` stops the reader from writing, not the owner. Copy what you keep.

**Next:** 03-02-01 measures structure. Blockfall's `game.js` has grown past 370 lines. You'll measure coupling and cohesion, size and the import graph, see what a god file and shared mutable state cost, and move the game's logic into a module that never touches the page.
