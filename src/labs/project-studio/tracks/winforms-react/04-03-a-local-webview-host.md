---
title: 4.3 — Host the Compiled React Interface
runtime: none
reference: optional
---

Outcome: implement and test the address rule for a desktop browser control, then explain how the supplied shell calls it. Finish lesson 4.2 first. ReactHost uses the same .NET 10 SDK as our earlier lessons. Install the [Evergreen WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) if it is missing; the NuGet package supplies development assemblies, while the Runtime supplies the browser engine. The WebView2 initialization is provided infrastructure. You will inspect its responsibilities and diagnose its input files; learning to reproduce every SDK call is outside this lesson's outcome.

## Create a separate desktop project

Create this beside `FormDesk`, `Core` and `Web`. A package reference downloads the WebView2 control. The content item copies `Web/dist` into the output’s `Web` folder on every build; `Link` defines the output layout. Rebuild Web before ReactHost whenever JSX changes. The fixed SDK package version is a published [stable WebView2 release](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4191.47).

```xml file=ReactHost/ReactHost.csproj provided
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../Core/Core.csproj" />
    <PackageReference Include="Microsoft.Web.WebView2" Version="1.0.4191.47" />
    <Content Include="../Web/dist/**/*" Link="Web/%(RecursiveDir)%(Filename)%(Extension)" CopyToOutputDirectory="Always" />
  </ItemGroup>
  <Target Name="RemoveUnusedWebView2Wpf" BeforeTargets="ResolveAssemblyReferences">
    <ItemGroup>
      <Reference Remove="@(Reference)" Condition="'%(Reference.Filename)' == 'Microsoft.Web.WebView2.Wpf'" />
    </ItemGroup>
  </Target>
</Project>
```

The final `Target` is build infrastructure you can reuse unchanged. The package includes an adapter for WPF, a different Windows UI toolkit. This WinForms host does not use that adapter, so the target removes its reference before assemblies are resolved. This avoids the package's [reported WindowsBase version conflict](https://github.com/MicrosoftEdge/WebView2Feedback/issues/5219) on current .NET. Compiler warnings remain enabled.

## Start the host window

This is the same WinForms entry point pattern as the native form chapter. Its namespace keeps the host’s classes separate from the core and the other interface.

```csharp file=ReactHost/Program.cs
namespace FormDesk.ReactHost;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new ShellForm());
    }
}
```

## Inspect an address in the console {#inspect-address}

We are about to give a desktop application a browser control. Before it loads a page, the application must decide which address is allowed. A substring search is a poor decision: `https://formdesk.example.evil.test/` contains our chosen name but belongs to another host. A `Uri` is the .NET object that separates an address into pieces. `TryCreate` is like the `TryParse` you used for quantities: it returns success or failure and writes the parsed object through `out`. The `?` in `Uri?` allows a null result on failure. After the successful check below, C# knows it has a usable object.

Use the existing Scratch console project from chapter 1; it is separate from both interfaces.

```csharp file=Scratch/Program.cs
string address = "https://formdesk.example/index.html?mode=other#section";
if (!Uri.TryCreate(address, UriKind.Absolute, out Uri? uri))
{
    Console.WriteLine("Invalid address");
    return;
}
Console.WriteLine("scheme=" + uri.Scheme);
Console.WriteLine("host=" + uri.Host);
Console.WriteLine("path=" + uri.AbsolutePath);
Console.WriteLine("query=" + uri.Query);
Console.WriteLine("fragment=" + uri.Fragment);
```

Run `dotnet run --project Scratch`. Predict which line contains `?mode=other`, then compare. Try `not an address` and the misleading hostname above; observe a parse failure for the first and a different Host for the second. Restore the original address. Parsing proves that a string is an address, not that we trust its parts.

## Allow one local document

Put that parsing decision into a boolean method. Start with two required pieces: the HTTPS scheme and exact host. `&&` means both conditions must be true. This is intentionally incomplete: it still accepts every path and port on that host. Do not launch the shell until the next step has narrowed it.

```csharp file=ReactHost/HostPolicy.cs
namespace FormDesk.ReactHost;

public static class HostPolicy
{
    public static bool IsAppPage(string address)
    {
        if (!Uri.TryCreate(address, UriKind.Absolute, out Uri? uri)) return false;
        return uri.Scheme == "https" && uri.Host == "formdesk.example";
    }
}
```

## Add the remaining document requirements {#address-components}

Require the scheme's default port (`443` for HTTPS), no user information, and either `/` or `/index.html` as the entire path. `uri.UserInfo` would contain `user:password` in an address carrying credentials. Parentheses make `||` choose between the two paths without bypassing the earlier `&&` requirements. Predict why `/index.html/extra` must fail. Query and fragment are deliberately left for your independent task.

```csharp file=ReactHost/HostPolicy.cs
namespace FormDesk.ReactHost;

public static class HostPolicy
{
    public static bool IsAppPage(string address)
    {
        if (!Uri.TryCreate(address, UriKind.Absolute, out Uri? uri)) return false;
        return uri.Scheme == "https" && uri.Host == "formdesk.example"
            && uri.IsDefaultPort && uri.UserInfo == ""
            && (uri.AbsolutePath == "/" || uri.AbsolutePath == "/index.html");
    }
}
```

## Observe a pending operation before the browser {#await-first}

The browser engine may need time to start. A C# `Task` represents an operation that may still be pending; a `Task<string>` will eventually supply a string. `async` permits a method to use `await`. Calling the method starts it, and `await pending` continues the caller only when its result is ready. This little console program makes that order visible without a WebView2 API:

```csharp file=Scratch/Program.cs
async Task<string> GetLabelAsync()
{
    await Task.Delay(250);
    return "Ready";
}

Console.WriteLine("Starting");
Task<string> pending = GetLabelAsync();
Console.WriteLine("Work can continue while waiting");
string label = await pending;
Console.WriteLine(label);
```

`Task.Delay(250)` completes after a delay measured in milliseconds. It is a timing demonstration, not a way to speed up a computation. Predict the order, then run `dotnet run --project Scratch`: `Ready` comes last. Temporarily remove only the `await` from `string label = await pending`. The compiler rejects assigning a task to a string: the future result and the result itself are different values. Restore it and rerun. In a Windows event handler, yielding at an incomplete await lets the UI process other events; this console example establishes ordering, not window responsiveness. [Microsoft's async/await guide](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/) develops that distinction.

```check
run "dotnet run --project Scratch" stdout="Ready" timeout=120 label="Await retrieves the eventual result" -- Read the first compiler error and distinguish Task<string> from string.
```

## Initialize WebView2 after the form is shown

Use **Create provided** for this shell. Treat it like the existing provided check programs: a working piece of infrastructure you can inspect and change at named points. Read it in four passes: the constructor creates the window; the method checks copied files; two awaits initialize the browser; event subscriptions restrict browser capabilities. Locate the single `HostPolicy.IsAppPage` call: your own method determines whether a top-level navigation is cancelled. You are not expected to infer these SDK method names from basic C#.

`async void` is used here because a WinForms event handler returns void; exceptions are caught within it. Ordinary asynchronous methods should normally return Task, like the console method. The two `IsDisposed` checks stop the continuation after the form closes. `var` infers a local type, `sealed` prevents subclasses, and `new() { Dock = ... }` constructs the declared field type and assigns its properties. In `(_, args) => ...`, `_` is the unused sender and `args` contains the event details; each `+=` subscribes one callback. The right side of `args.Cancel = !HostPolicy.IsAppPage(args.Uri)` cancels precisely when your policy says false.

```csharp file=ReactHost/ShellForm.cs provided
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace FormDesk.ReactHost;

public sealed class ShellForm : Form
{
    private readonly WebView2 web = new() { Dock = DockStyle.Fill };
    private readonly Label status = new() { Dock = DockStyle.Top, AutoSize = true, Text = "Loading local interface…" };

    public ShellForm()
    {
        Text = "FormDesk — React host";
        ClientSize = new Size(760, 640);
        Controls.Add(web);
        Controls.Add(status);
        Shown += OpenInterface;
    }

    private async void OpenInterface(object? sender, EventArgs e)
    {
        try
        {
            string folder = Path.Combine(AppContext.BaseDirectory, "Web");
            if (!File.Exists(Path.Combine(folder, "index.html")))
                throw new InvalidOperationException("Build Web first, then rebuild ReactHost.");
            string userData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FormDesk", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(null, userData);
            if (IsDisposed) return;
            await web.EnsureCoreWebView2Async(environment);
            if (IsDisposed) return;
            var core = web.CoreWebView2;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.AreDefaultScriptDialogsEnabled = false;
            core.Settings.IsWebMessageEnabled = false;
            core.SetVirtualHostNameToFolderMapping("formdesk.example", folder, CoreWebView2HostResourceAccessKind.Deny);
            core.NavigationStarting += (_, args) => args.Cancel = !HostPolicy.IsAppPage(args.Uri);
            core.FrameNavigationStarting += (_, args) => args.Cancel = true;
            core.NewWindowRequested += (_, args) => args.Handled = true;
            core.PermissionRequested += (_, args) => args.State = CoreWebView2PermissionState.Deny;
            core.DownloadStarting += (_, args) => args.Cancel = true;
            core.Navigate("https://formdesk.example/index.html");
            status.Text = "Local React interface · validation is still in the browser";
        }
        catch (Exception error)
        {
            if (!IsDisposed) status.Text = "Could not open interface: " + error.Message;
        }
    }
}
```

The virtual hostname maps an HTTPS-looking origin to **only** the copied Web folder; it runs no server and makes no network request for that host. The writable user data folder belongs in LocalApplicationData, separate from the program files. We block other navigations, all frames, popups, permissions and downloads. Messaging stays disabled until the next lesson. Microsoft explains [local content mapping](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/working-with-local-content) and [WebView2 trust boundaries](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/security).

```powershell
npm.cmd --prefix Web run build
dotnet build ReactHost
dotnet run --project ReactHost
```

Close the host window before rebuilding. The last command stays running until the window closes.

```predict
question: After a local JSX edit without rebuilding Web, what does the reopened host display?
choice: The last compiled interface
choice: The previous result stays visible
answer: The last compiled interface
explain: ReactHost loads copied dist files; it does not read JSX source or run Vite.
```

Diagnostic experiment: close ReactHost, rename `Web/dist/index.html` to `index.saved.html`, remove the copied `ReactHost/bin/Debug/net10.0-windows/Web/index.html`, and rebuild ReactHost. Run it and observe the explicit build instruction. Restore the source filename, rebuild Web then ReactHost, and reopen. A successful build does not establish Runtime installation or visible rendering: check the window, type a request, resize it, and close it yourself.

```check
run "dotnet build ReactHost" stdout="Build succeeded." timeout=180 label="Windows desktop host compiles" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

## Make the navigation rule executable

This console project links the actual policy source rather than a copy. It needs no test framework package and does not start a window. `Condition` includes the bridge source only after that file exists in the next lesson.

```xml file=BoundaryProbe/BoundaryProbe.csproj
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../Core/Core.csproj" />
    <Compile Include="../ReactHost/HostPolicy.cs" Link="HostPolicy.cs" />
    <Compile Include="../ReactHost/BridgeProtocol.cs" Link="BridgeProtocol.cs" Condition="Exists('../ReactHost/BridgeProtocol.cs')" />
  </ItemGroup>
</Project>
```

## Run policy examples without a window

`Expect` throws an exception if a claim is false, making the command fail. Its arguments are a boolean observation and a human-readable label. `args.Contains("strict")` asks whether that word was passed after `--`; this is a method on the arguments collection.

```csharp file=BoundaryProbe/Program.cs
using FormDesk.ReactHost;

static void Expect(bool condition, string label)
{
    if (!condition) throw new Exception("FAIL: " + label);
}

Expect(HostPolicy.IsAppPage("https://formdesk.example/index.html"), "local compiled page allowed");
Expect(HostPolicy.IsAppPage("https://formdesk.example/"), "root document allowed");
Expect(!HostPolicy.IsAppPage("not an address"), "malformed address blocked");
Expect(!HostPolicy.IsAppPage("https://elsewhere.example/index.html"), "other host blocked");
Expect(!HostPolicy.IsAppPage("https://formdesk.example.evil.test/index.html"), "lookalike host blocked");
Expect(!HostPolicy.IsAppPage("https://person@formdesk.example/index.html"), "user information blocked");
Expect(!HostPolicy.IsAppPage("http://formdesk.example/index.html"), "http blocked");
Expect(!HostPolicy.IsAppPage("https://formdesk.example:444/index.html"), "unexpected port blocked");
Expect(!HostPolicy.IsAppPage("file:///C:/private.txt"), "file blocked");
Expect(!HostPolicy.IsAppPage("https://formdesk.example/other.html"), "other page blocked");
if (args.Contains("strict"))
{
    Expect(!HostPolicy.IsAppPage("https://formdesk.example/index.html?mode=other"), "query blocked");
    Expect(!HostPolicy.IsAppPage("https://formdesk.example/index.html#other"), "fragment blocked");
}
Console.WriteLine(args.Contains("strict") ? "strict policy passed" : "local policy passed");
```

```check
run "dotnet run --project BoundaryProbe" stdout="local policy passed" timeout=120 label="Foreign origins, ports and pages are blocked" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

## Your turn: permit only the exact page

Narrow `HostPolicy.IsAppPage` to reject a query string and fragment as well. Keep both `/` and `/index.html` accepted on the expected HTTPS host. `uri.Query` and `uri.Fragment` are empty strings when absent. First run the strict probe with the unchanged policy: identify which assertion fails and explain why it reached an allowed path. Then change the method and run it again. Add two probe assertions you chose yourself, one allowed and one blocked, and explain which parsed component decides each. Add `evidence/react-4-3.md`: record a window observation, why stale compiled files persisted, and those independent cases/results. The console tests establish address decisions; use the actual host's developer tools (F12 or Ctrl+Shift+I) to attempt `location.href = "https://example.com"` and confirm the local page remains. Close the host afterward.

```hints
nudge: Which address components have not yet been restricted?
concept: Use && to require both Query and Fragment to be empty. Keep the path grouping intact.
shape: Add two empty-string comparisons beside the existing port and user-information checks.
```

```check
run "dotnet run --project BoundaryProbe -- strict" stdout="strict policy passed" timeout=120 label="Queries and fragments are blocked" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```
