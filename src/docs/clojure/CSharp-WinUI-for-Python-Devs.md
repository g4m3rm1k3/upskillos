# C# + WinUI 3 for the Python Developer

### Build one project in stages: XML → SQLite → API → a real desktop UI

You already know how to make computers do things. This tutorial teaches you to make C# do them, and to structure the result so you can **read it, modify it, and explain it** without an AI in the loop.

You will build **Catalog Tracker**: an app that imports items from XML (later from an API), stores them in SQLite, and shows/edits them in a WinUI 3 desktop UI. The domain is deliberately boring, because the app is a vehicle for the skills:

| Skill | Where |
|---|---|
| Reading C# written by someone else | Ch. 3 |
| Data classes, lists, dictionaries, LINQ | Ch. 2, 4 |
| Parsing XML | Ch. 5 |
| Interfaces and dependency injection | Ch. 6 |
| SQLite (raw SQL and Entity Framework, new and existing DBs) | Ch. 7, 8 |
| HTTP/JSON APIs, with XML fallback | Ch. 9 |
| Unit testing | Ch. 10 |
| WinUI: layout, controls, binding, MVVM, dialogs, pickers | Ch. 11–14 |
| Debugging and common errors | Ch. 15 |

---

## Chapter 0: How to use this document

- **Type the code, don't paste it** (you can't paste from home to work anyway). Typing forces you to notice every `;`, `{}`, and capital letter.
- **Run after every section.** Each stage ends with a checkpoint that says what you should see.
- **Do the exercises.** They're where the reading skill comes from.
- Code blocks show the **file name** in a comment on the first line.
- Versions: this was written for the current **.NET LTS (10)** and the **Windows App SDK** WinUI 3 templates. If your Visual Studio gives you a slightly different version (8, 9, ...), everything here still works. Where I know things differ, I say so.
- **Public repo warning:** since your code is public, **never commit API keys, passwords, or internal server URLs**. See Ch. 9.

---

## Chapter 1: Setup

### 1.1 Install

1. **Visual Studio 2022 (17.8+) or newer**, Community is free. In the installer select the workload **"Windows application development"** (older name: ".NET desktop development" plus the WinUI/Windows App SDK pieces). Also tick **".NET desktop development"** so you get console and class library templates.
2. Check the SDK in a terminal: `dotnet --version`.

If you can't install things at work, VS Code + the .NET SDK works for Chapters 1–10 (everything except the WinUI designer experience). WinUI itself really wants Visual Studio.

### 1.2 Mental model of the tooling

| Python | C# |
|---|---|
| `python script.py` | `dotnet run` (or F5 in VS) |
| `pip install requests` | `dotnet add package <name>` (NuGet) |
| `requirements.txt` | `<PackageReference>` lines in the `.csproj` |
| virtualenv | Not needed; packages are per project |
| `import x` | `using X;` |
| A folder of .py files | A **project** (`.csproj`) |
| A repo with several packages | A **solution** (`.sln` / `.slnx`) containing several projects |
| Interpreted, errors at runtime | **Compiled**: many errors appear *before* you can run |

The compiler is your pair programmer. A red squiggle in C# is usually telling you something Python would only reveal at 3 a.m. in production. Learn to read the error list.

### 1.3 Create the solution

In a terminal (or VS terminal), pick an empty folder:

```bash
dotnet new sln -n CatalogTracker
dotnet new classlib -n CatalogTracker.Core
dotnet new console  -n CatalogTracker.Cli
dotnet sln add CatalogTracker.Core CatalogTracker.Cli
dotnet add CatalogTracker.Cli reference CatalogTracker.Core
```

(On .NET 10 `dotnet new sln` creates a `.slnx` file. It's the same idea, just a newer format. Use whichever you get.)

- **CatalogTracker.Core**: your logic: models, interfaces, XML/SQLite/API code. No UI. This is the part you could unit test and reuse.
- **CatalogTracker.Cli**: a tiny console app to try the Core without any UI.
- Later: **CatalogTracker.App** (WinUI) and **CatalogTracker.Tests**.

Delete the generated `Class1.cs`.

Open the `.sln`/`.slnx` in Visual Studio. In the Solution Explorer you can see both projects.

---

## Chapter 2: C# crash course for a Python developer

Create a scratch console project to play in so you don't pollute your real one:

```bash
dotnet new console -n Scratch
cd Scratch
dotnet run
```

Edit `Program.cs` for each experiment. Modern C# lets you write statements at the top of the file (called *top-level statements*), so it looks like a script.

### 2.1 Hello, types

```csharp
// Program.cs
Console.WriteLine("Hello");

int count = 3;
double ratio = 0.5;
decimal price = 12.50m;      // use decimal for money. Note the m suffix.
bool ok = true;
string name = "Ada";
char letter = 'A';           // single quotes = ONE char; double quotes = string
DateTime now = DateTime.Now;

var inferred = 42;           // 'var' = compiler infers int. Still statically typed!
```

Key differences from Python:

- Every variable has a **fixed type** for life. `var` doesn't mean dynamic. It means "you figure out the type, compiler".
- Statements end with `;`. Blocks use `{ }`, not indentation (indentation is just for humans).
- `int / int` is **integer division**: `7 / 2` is `3`. Use `7 / 2.0` or `7m / 2`.
- Use `decimal` for money, `double` for scientific/approximate math.
- `==` on strings compares **values** (like Python). No `is` needed for normal use.

### 2.2 Strings

```csharp
string who = "world";
string a = $"Hello {who}";                  // like f"Hello {who}"
string b = $"Price: {12.5m:F2}";            // like f"{x:.2f}" -> "12.50"
string c = $"Currency: {12.5m:C}";          // $12.50 (uses your culture)
string d = $"{count,5}|{name,-8}|";         // right-align width 5 | left-align width 8

string path = @"C:\data\file.xml";          // verbatim: backslashes are literal
string multi = """
    Raw string literal:
    "quotes" and \backslashes\ are fine.
    """;                                    // like Python's triple quotes

bool has = name.Contains("d");
string up = name.ToUpper();
string[] parts = "a,b,c".Split(',');        // like .split(",")
string joined = string.Join(", ", parts);   // like ", ".join(parts)
bool blank = string.IsNullOrWhiteSpace("  ");
```

### 2.3 Null (Python's `None`)

```csharp
string? maybe = null;           // the ? says "this may be null"
string definitely = "hi";       // compiler warns if you try to put null here

int len = maybe?.Length ?? 0;   // ?. = "if not null, then..."  ?? = "otherwise use"
maybe ??= "default";            // assign only if null
string forced = maybe!;         // ! = "trust me, it's not null" (use sparingly)

if (maybe is not null) { ... }  // preferred null check
```

`NullReferenceException` is C#'s `AttributeError: 'NoneType' ...`. Nullable annotations (`?`) make the compiler warn you *before* it happens. Pay attention to those warnings.

### 2.4 Collections

| Python | C# |
|---|---|
| `[1, 2, 3]` (list) | `List<int>` |
| `{"a": 1}` (dict) | `Dictionary<string, int>` |
| `{1, 2, 3}` (set) | `HashSet<int>` |
| `(1, "a")` (tuple) | `(int, string)` tuple, or a record |
| fixed array | `int[]` |

```csharp
var nums = new List<int> { 1, 2, 3 };
nums.Add(4);
nums.Remove(2);
Console.WriteLine(nums.Count);          // len(nums)
Console.WriteLine(nums[0]);

List<string> names = ["Ann", "Bob"];    // newer "collection expression" syntax (C# 12)

var ages = new Dictionary<string, int>
{
    ["Ann"] = 30,
    ["Bob"] = 25,
};
ages["Cy"] = 41;

// ages["Zed"] throws KeyNotFoundException (Python's KeyError). Safe version:
if (ages.TryGetValue("Zed", out int zedAge))
    Console.WriteLine(zedAge);
else
    Console.WriteLine("no Zed");

foreach (var (key, value) in ages)      // like for k, v in d.items()
    Console.WriteLine($"{key}: {value}");

foreach (var n in nums)                 // like for n in nums
    Console.WriteLine(n);
```

Note `out int zedAge`: C# methods can "return" extra values through `out` parameters. `TryXxx` methods are a common pattern.

### 2.5 LINQ: your list comprehensions

Add `using System.Linq;` (usually already imported by default).

| Python | C# LINQ |
|---|---|
| `[x*2 for x in nums]` | `nums.Select(x => x * 2).ToList()` |
| `[x for x in nums if x > 2]` | `nums.Where(x => x > 2).ToList()` |
| `sorted(nums)` | `nums.OrderBy(x => x).ToList()` |
| `sorted(items, key=lambda i: i.price, reverse=True)` | `items.OrderByDescending(i => i.Price)` |
| `sum(...)` | `.Sum(i => i.Price)` |
| `any(x > 2 for x in nums)` | `nums.Any(x => x > 2)` |
| `next((x for x in nums if x > 2), None)` | `nums.FirstOrDefault(x => x > 2)` |
| `len(nums)` | `nums.Count()` or `.Count` on a list |
| group by (itertools/`defaultdict`) | `items.GroupBy(i => i.Category)` |

`x => x * 2` is a **lambda**, same as Python's `lambda x: x * 2`.

Example, group and summarize:

```csharp
var byCategory = items
    .GroupBy(i => i.Category)
    .Select(g => new { Category = g.Key, Total = g.Sum(i => i.Price * i.Quantity) })
    .OrderByDescending(x => x.Total);
```

LINQ queries are **lazy**: nothing runs until you enumerate (`foreach`, `.ToList()`, `.Count()`, etc.). Same idea as Python generators. If you iterate a lazy query twice it runs twice; call `.ToList()` to freeze the results.

### 2.6 Classes, fields, properties

```csharp
public class Person
{
    private int _age;                       // FIELD: raw storage. Convention: _camelCase

    public string Name { get; set; } = "";  // PROPERTY: the normal way to expose data
    public int Age                          // property with logic (like @property)
    {
        get => _age;
        set
        {
            if (value < 0) throw new ArgumentOutOfRangeException(nameof(value));
            _age = value;
        }
    }

    public Person(string name, int age)     // constructor (like __init__); same name as class
    {
        Name = name;
        Age = age;
    }

    public string Describe() => $"{Name} ({Age})";   // method; => is shorthand for { return ...; }
}

var p = new Person("Ada", 36);       // no 'self', no calling the class like a function: 'new'
Console.WriteLine(p.Describe());
```

- **Field** = a variable inside a class. Usually `private`.
- **Property** = a field-like thing with `get`/`set`. `{ get; set; }` is an "auto-property" and the compiler makes the hidden field for you. This is what you'll see 95% of the time. WinUI binding *requires* properties, not fields.
- **Access modifiers**: `public` (everyone), `private` (this class only, default for members), `internal` (this project), `protected` (subclasses).
- **`static`** = belongs to the class not the instance (like `@staticmethod`; whole classes can be `static` too).
- **`readonly`** = a field that can only be assigned in the constructor.
- There is no `self`. Inside methods you just say `Name`. Use `this.Name` only to disambiguate.
- `init` instead of `set` means "can be set when creating the object, then it's read-only":

```csharp
public string Name { get; init; } = "";
var p = new Person2 { Name = "Ada" };   // "object initializer" syntax
// p.Name = "Bob";                      // compile error
```

- `required` forces callers to set a property in an object initializer:

```csharp
public required string Name { get; init; }
```

### 2.7 Records: your `@dataclass`

```python
# Python
@dataclass(frozen=True)
class Item:
    id: int
    name: str
    price: Decimal = Decimal("0")
```

```csharp
// C#: positional record. One line!
public record Item(int Id, string Name, decimal Price = 0m);

var a = new Item(1, "Hammer", 12.5m);
var b = a with { Price = 15m };          // copy-with-changes, like dataclasses.replace
Console.WriteLine(a);                    // Item { Id = 1, Name = Hammer, Price = 12.5 }
Console.WriteLine(a == new Item(1, "Hammer", 12.5m));   // True: records compare by VALUE
```

Plain `class` compares by reference (identity), `record` by value. We'll use a records with `init` properties for our domain model because they're easy to read and safe to pass around.

### 2.8 Interfaces and inheritance

An **interface** is a contract: "anything that has these methods." It's like a Python `Protocol`/abstract base class.

```csharp
public interface IGreeter
{
    string Greet(string name);
}

public class FriendlyGreeter : IGreeter
{
    public string Greet(string name) => $"Hey {name}!";
}

public class FormalGreeter : IGreeter
{
    public string Greet(string name) => $"Good day, {name}.";
}

IGreeter g = new FriendlyGreeter();   // variable typed as the INTERFACE
Console.WriteLine(g.Greet("Ada"));
```

Convention: interface names start with `I`. This idea (*code against the interface, swap implementations*) is the single most important design idea in this tutorial. XML ↔ API is exactly this.

Inheritance exists (`class Dog : Animal`, `virtual`/`override`), but prefer interfaces + composition. You'll rarely need inheritance in this project.

### 2.9 Enums, switch expressions, pattern matching

```csharp
public enum Status { Active, Retired, Unknown }

string Label(Status s) => s switch
{
    Status.Active  => "In use",
    Status.Retired => "Done",
    _              => "?",          // _ is the default case
};

object thing = 42;
if (thing is int n && n > 10) Console.WriteLine($"big int {n}");

var msg = item switch
{
    { Quantity: 0 }                 => "Out of stock",
    { Quantity: < 5 }               => "Low",
    { Price: > 100m }               => "Pricey",
    _                               => "OK",
};
```

### 2.10 Methods, tuples, lambdas

```csharp
static (decimal Min, decimal Max) Range(IEnumerable<decimal> values)
    => (values.Min(), values.Max());

var (lo, hi) = Range(new[] { 3m, 9m, 1m });

Func<int, int> doubler = x => x * 2;       // a function value: takes int, returns int
Action<string> printer = s => Console.WriteLine(s);   // returns nothing
```

Optional/named args work like Python: `Foo(1, verbose: true)`.

### 2.11 Exceptions and `using` (Python's `with`)

```csharp
try
{
    var text = File.ReadAllText("missing.txt");
}
catch (FileNotFoundException ex)
{
    Console.WriteLine($"Nope: {ex.Message}");
}
catch (Exception ex)                     // catch-all; keep it as the LAST catch
{
    Console.WriteLine(ex);
}
finally
{
    // always runs
}

using var reader = new StreamReader("data.txt");   // disposed automatically at end of scope
// ...like Python's: with open("data.txt") as reader:
```

Anything that holds an external resource (files, DB connections, HTTP streams) implements `IDisposable`; wrap it in `using`. For async disposables use `await using`.

### 2.12 async / await

Python:
```python
async def fetch(): ...
await fetch()
```

C#:
```csharp
public async Task<string> FetchAsync()          // Task<string> ~ coroutine that returns str
{
    await Task.Delay(1000);                     // asyncio.sleep(1)
    return "done";
}

string result = await FetchAsync();
```

Rules of thumb:
- An `async` method returns `Task` (nothing) or `Task<T>` (a value). Name them `SomethingAsync`.
- **`await` all the way up**. Do NOT call `.Result` or `.Wait()` to "block until done". In a UI app that can **freeze/deadlock** your app.
- `async void` is only for UI event handlers (the framework needs it). Everywhere else: `async Task`.
- Pass a `CancellationToken ct = default` to async methods that do I/O. It's how callers cancel work; you'll see it everywhere.
- Unlike Python, you don't need an event loop; the runtime and UI framework provide it.
- `Program.cs` top-level code can use `await` directly.

### 2.13 Namespaces and `using`

```csharp
namespace CatalogTracker.Core.Models;   // file-scoped namespace: applies to the whole file

public record Item(...);
```

Other files say `using CatalogTracker.Core.Models;` to use `Item` without the full path. Namespaces are conventionally the folder path. Don't fight it. "Implicit usings" are on by default so `System`, `System.IO`, `System.Linq`, `System.Collections.Generic`, `System.Threading.Tasks` are already imported everywhere.

One public type per file, with the file named after the type, is the norm.

### 2.14 Generics

`List<int>`, `Dictionary<string, Item>`, `Task<Item?>` are **generics**: types with type parameters, like Python's `list[int]` except enforced by the compiler. You can write your own:

```csharp
public class Box<T>
{
    public T Value { get; set; }
    public Box(T value) => Value = value;
}
var b = new Box<string>("hi");
```

### 2.15 Naming conventions

| Thing | Style | Example |
|---|---|---|
| Classes, records, methods, properties, enums | `PascalCase` | `ItemService`, `GetAllAsync` |
| Local variables, parameters | `camelCase` | `itemCount` |
| Private fields | `_camelCase` | `_store` |
| Interfaces | `IPascalCase` | `IItemStore` |
| Async methods | end in `Async` | `LoadAsync` |
| Constants | `PascalCase` | `MaxItems` |

These are not enforced, but *everyone* follows them, which makes other people's code readable. Follow them so you can read it.

### 2.16 Gotchas that bite Python people

| Surprise | What to do |
|---|---|
| Missing `;` or `}` gives confusing errors | Fix the **first** error in the list; the rest are usually knock-on |
| Case matters: `Item` ≠ `item` | Let IntelliSense complete names |
| `int`/`int` truncates | Use `decimal`/`double` where needed |
| Dictionary missing key throws | `TryGetValue` |
| You can't modify a list while `foreach`-ing it | Loop over `.ToList()` copy or build a new list |
| `DateTime.Parse("1/2/2026")` depends on culture | Use ISO-8601 and `CultureInfo.InvariantCulture` |
| Everything is a type; no loose functions (before top-level statements) | Put helpers in `static` classes |
| Null warnings | Read them. Fix with `?`, `??`, or null checks |
| Index/range: `list[^1]` last item, `list[1..3]` slice | Works on arrays/lists/strings |

### Exercises (Chapter 2)

1. Create a `List<string>` of 5 words. Using LINQ print those longer than 3 chars, upper-cased, sorted.
2. Create a `Dictionary<string, List<int>>` of student → scores. Print each student's average (`.Average()`).
3. Write an interface `IShape` with `double Area()`. Implement `Circle` and `Rectangle`. Put them in a `List<IShape>` and print the total area.
4. Make a `record Point(double X, double Y)`. Create two equal points and prove `==` is true. Use `with` to make a third.

---

## Chapter 3: Reading code you didn't write

The code an agent wrote you in Python has patterns. Here is how each maps to C#, so when you see C# code (from an AI or a coworker) you know what you're looking at.

### 3.1 Reading order

When you open an unfamiliar C# file:

1. **`using` lines at the top**: tells you which libraries/areas it touches (`System.Xml.Linq` = XML, `Microsoft.Data.Sqlite` = DB, `System.Net.Http` = HTTP).
2. **`namespace`**: where it lives.
3. **The type declaration** (`class`, `record`, `interface`, `enum`). Is it an interface (contract), a record (data), or a class (behavior)?
4. **Constructor parameters**: what does it need to do its job? (Its "dependencies".)
5. **Public members**: this is the API of the class. Skim names and signatures first.
6. **Private members**: implementation detail. Read last, only if needed.

In Visual Studio: **F12** = go to definition, **Shift+F12** = find all references, **Ctrl+T** = go to anything, **Ctrl+.** = quick fixes, **Ctrl+K, Ctrl+D** = format document. Hover for types.

### 3.2 Python → C# data-class translation table

| Python | C# |
|---|---|
| `@dataclass class A: x: int` | `public record A(int X);` or a class with `public int X { get; set; }` |
| `@dataclass(frozen=True)` | `record` with `init` properties |
| `field(default_factory=list)` | `public List<string> Tags { get; init; } = new();` |
| `Optional[str]` / `str \| None` | `string?` |
| `List[Item]` | `List<Item>` (or `IReadOnlyList<Item>` as a return type) |
| `Dict[str, int]` | `Dictionary<string, int>` |
| `Tuple[int, str]` | `(int, string)` |
| `@property def total(self)` | `public decimal Total => Price * Quantity;` |
| `@staticmethod` | `static` method |
| `@classmethod def from_xml(cls, e)` | `static Item FromXml(XElement e)` |
| `def __init__(self, ...)` | constructor |
| `__eq__`, `__hash__` | `record`, or override `Equals`/`GetHashCode` |
| `__repr__` | `ToString()` (records generate it) |
| `ABC` / `Protocol` | `interface` |
| `Enum` | `enum` |
| `raise ValueError` | `throw new ArgumentException(...)` |
| `pass` | `{ }` |
| `if __name__ == "__main__":` | `Program.cs` entry point |
| Type hints optional | Types mandatory |
| `with open(...) as f` | `using var f = ...` |

### 3.3 How to read a method signature

```csharp
public async Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
```

Left to right: `public` anyone can call → `async` it awaits inside → `Task<IReadOnlyList<Item>>` you'll `await` it and get a read-only list of `Item` → name → parameter `ct` of type `CancellationToken`, optional (has a default).

### 3.4 How to read a constructor with dependencies

```csharp
public class CatalogService
{
    private readonly IItemStore _store;
    public CatalogService(IItemStore store) { _store = store; }
}
```

"To build a `CatalogService` you must hand it something that implements `IItemStore`. It keeps that thing in a private readonly field and uses it in its methods." That's **dependency injection** in its simplest form: no framework needed, just passing things in.

### 3.5 Exercise

Take one Python dataclass an agent wrote for you and translate it by hand into a C# `record`. Note every place you needed to decide between `string` and `string?`. Those decisions are most of the design work.

---

## Chapter 4: Stage 1: The domain model

Let's start the real project. The **domain model** is the nouns of your app. It knows nothing about XML, databases, or UIs.

Create folders in `CatalogTracker.Core`: `Models`, `Abstractions`, `Sources`, `Storage`, `Services`.

```csharp
// CatalogTracker.Core/Models/Item.cs
namespace CatalogTracker.Core.Models;

public record Item
{
    public int Id { get; init; }
    public required string Name { get; init; }
    public string Category { get; init; } = "";
    public decimal Price { get; init; }
    public int Quantity { get; init; }
    public DateTime Updated { get; init; }
    public List<string> Tags { get; init; } = new();

    // Computed property: no storage, derived from others (like Python @property)
    public decimal TotalValue => Price * Quantity;
}
```

Design notes (principles in action):

- **Separation of concerns.** `Item` has no idea how it's stored or displayed.
- **Immutability.** `init` means once created, an `Item` doesn't change. You make a modified copy with `with`. That makes bugs from "who changed this?" disappear.
- **Make illegal states hard.** `required Name` means you can't create a nameless item by accident.

Try it in the Cli project (`CatalogTracker.Cli/Program.cs`):

```csharp
using CatalogTracker.Core.Models;

var hammer = new Item { Id = 1, Name = "Hammer", Price = 12.5m, Quantity = 10 };
var pricier = hammer with { Price = 15m };
Console.WriteLine(hammer);
Console.WriteLine($"{pricier.Name}: {pricier.TotalValue:C}");
```

Run: `dotnet run --project CatalogTracker.Cli`

**Checkpoint:** you see the record printed and a total like `$150.00`.

### Exercises (Chapter 4)
1. Add `bool IsLowStock => Quantity < 5;` and print it.
2. Add an `enum ItemStatus { Active, Discontinued }` and a `Status` property defaulting to `Active`.

---

## Chapter 5: Stage 2: Parsing XML

You parse XML in Python with `ElementTree`. C#'s equivalent is **LINQ to XML** (the `System.Xml.Linq` namespace): `XDocument`, `XElement`, `XAttribute`. It feels very similar. We'll start with the simplest possible read and add one idea at a time, including a deliberate crash so you recognize it when it happens to you.

### Step 1: The sample data (messy on purpose)

Create `CatalogTracker.Cli/sample.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<catalog>
  <item id="1" category="tools">
    <name>Hammer</name>
    <price currency="USD">12.50</price>
    <quantity>10</quantity>
    <updated>2026-01-15T09:30:00</updated>
    <tags><tag>steel</tag><tag>hand</tag></tags>
  </item>
  <item id="2" category="tools">
    <name>Screwdriver Set</name>
    <price currency="USD">24.99</price>
    <quantity>3</quantity>
    <updated>2026-02-01T14:00:00</updated>
    <tags><tag>set</tag></tags>
  </item>
  <item id="3" category="garden">
    <name>Watering Can</name>
    <price currency="USD">8.00</price>
    <quantity>0</quantity>
    <!-- no <updated> and no <tags> on purpose: real data is messy -->
  </item>
</catalog>
```

Read it like a Python dev: `<catalog>` is the root, each `<item>` has **attributes** (`id`, `category`) and **child elements** (`name`, `price`, ...). `<tags>` holds a list of `<tag>` children. The third item is missing two elements. That's the point: real-world XML has gaps, and your parser has to survive them.

Tell the build to copy the file next to your program when it runs. In `CatalogTracker.Cli.csproj`, inside `<Project>`:

```xml
<ItemGroup>
  <None Update="sample.xml">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

(In VS: right-click the file → Properties → *Copy to Output Directory: Copy if newer* does the same.) Without this, the program looks for `sample.xml` in `bin/Debug/net.../` and can't find it. That's the most common first-run failure.

### Step 2: Load the file and look at the shape

Replace `CatalogTracker.Cli/Program.cs` with:

```csharp
using System.Xml.Linq;

XDocument doc = XDocument.Load("sample.xml");

Console.WriteLine($"Root element: {doc.Root!.Name}");
Console.WriteLine($"Number of <item> elements: {doc.Root.Elements("item").Count()}");
```

Run: `dotnet run --project CatalogTracker.Cli`. Expect `catalog` and `3`.

**How to read it:**

- `XDocument` is the whole document; `.Root` is the top element (`<catalog>`). Same as Python's `ET.parse(path).getroot()`.
- `doc.Root!`: the `!` means "trust me, this isn't null." `Root` *can* be null (an empty document has no root), so the compiler warns unless you promise. We promise here because we know our file has a root. Later we'll handle it properly.
- `Elements("item")` returns the **direct children** named `item` (like `findall("item")`). It's a lazy LINQ sequence, so `.Count()` walks it.

### Step 3: Navigate: elements, attributes, `.Value`

```csharp
foreach (XElement e in doc.Root!.Elements("item"))
{
    string id       = e.Attribute("id")!.Value;
    string category = e.Attribute("category")!.Value;
    string name     = e.Element("name")!.Value;
    Console.WriteLine($"{id} | {category} | {name}");
}
```

(Replace the two `Console.WriteLine` lines from Step 2 with this loop.)

- `e.Attribute("id")` finds an attribute (like `e.get("id")`). `e.Element("name")` finds a **child element** (like `e.find("name")`). Note the singular: `Element` returns one thing, `Elements` returns many.
- Both can return **null** if not found. That's why the compiler wants a `!` before `.Value`.
- `.Value` gives you the text content as a `string`.

Run it. All three items print, because every item has an `id`, `category` and `name`.

### Step 4: Cause the crash on purpose

Add one more line inside the loop:

```csharp
    string updated = e.Element("updated")!.Value;
    Console.WriteLine($"   updated: {updated}");
```

Run. Items 1 and 2 print, then the program dies with a **`NullReferenceException`**. Look at the stack trace: the first line in *your* code points at the `updated` line. The Watering Can has no `<updated>`, so `Element("updated")` returned `null`, and `.Value` on `null` explodes. You told the compiler "trust me" with `!` and it did, but you were wrong for item 3.

This is Python's `AttributeError: 'NoneType' object has no attribute 'text'`. **It's the single most common XML bug** in any language. The fix is next. Delete those two lines.

### Step 5: The cast trick (this is the key idea)

`XElement` and `XAttribute` have **explicit conversion operators**: you can cast them directly to `int`, `decimal`, `DateTime`, `string`, and more, and the library parses the text for you. Cast to the **nullable** version (`int?`, `decimal?`, `DateTime?`, `string?`) and you get `null` for a missing element instead of a crash.

```csharp
foreach (XElement e in doc.Root!.Elements("item"))
{
    int      id       = (int?)e.Attribute("id") ?? 0;
    string   name     = (string?)e.Element("name") ?? "(unnamed)";
    decimal  price    = (decimal?)e.Element("price") ?? 0m;
    int      quantity = (int?)e.Element("quantity") ?? 0;
    DateTime? updated = (DateTime?)e.Element("updated");

    Console.WriteLine($"{id} | {name} | {price:C} | qty {quantity} | updated {updated?.ToString("d") ?? "never"}");
}
```

Run: no crash. The Watering Can prints `updated never`.

**Pieces of the pattern:**

- `(int?)e.Attribute("id")`: "convert this attribute to a nullable int." If the attribute is missing, result is `null`. If it's present but not a number (`id="abc"`), it throws a `FormatException` (bad data should be loud).
- `?? 0`: "if that was null, use 0 instead." Python equivalent: `int(e.get("id") or 0)`, except the C# version also does the parsing and keeps its type.
- `updated?.ToString("d") ?? "never"`: `?.` means "only call `ToString` if `updated` isn't null; otherwise the whole expression is null", and then `??` supplies the fallback text.

A bonus: these conversions use the **XML standard format**, independent of your computer's regional settings, so `12.50` always parses as 12.5 even on a machine set to use commas for decimals. That's a real advantage over `decimal.Parse(text)`.

### Step 6: Nested lists (the tags)

`<tags>` contains `<tag>` children. Add this line in the loop:

```csharp
    List<string> tags = e.Element("tags")?.Elements("tag").Select(t => t.Value).ToList() ?? new();
```

Read it from left to right:

1. `e.Element("tags")`: find `<tags>`. May be null (Watering Can).
2. `?.Elements("tag")`: **only if** `<tags>` was found, get its `<tag>` children. If it was null, **the entire rest of the chain is skipped** and the whole expression becomes `null`.
3. `.Select(t => t.Value)`: for each `<tag>`, take its text (LINQ's version of a list comprehension: `[t.text for t in ...]`).
4. `.ToList()`: freeze into a `List<string>`.
5. `?? new()`: if everything above was null, use an empty list. (`new()` means `new List<string>()`; the compiler infers the type from the variable.)

Print them with `string.Join(", ", tags)` to check: Hammer shows `steel, hand`, Watering Can shows nothing.

### Step 7: Build real `Item` objects

Now convert each `<item>` into your domain model from Chapter 4. Replace the loop with a LINQ query (add `using CatalogTracker.Core.Models;` at the top):

```csharp
List<Item> items = doc.Root!
    .Elements("item")
    .Select(e => new Item
    {
        Id       = (int?)e.Attribute("id") ?? 0,
        Name     = (string?)e.Element("name") ?? "(unnamed)",
        Category = (string?)e.Attribute("category") ?? "",
        Price    = (decimal?)e.Element("price") ?? 0m,
        Quantity = (int?)e.Element("quantity") ?? 0,
        Updated  = (DateTime?)e.Element("updated") ?? DateTime.MinValue,
        Tags     = e.Element("tags")?.Elements("tag").Select(t => t.Value).ToList() ?? new(),
    })
    .ToList();

foreach (var item in items)
    Console.WriteLine($"{item.Id,3}  {item.Name,-18} {item.Price,8:C}  x{item.Quantity}  [{string.Join(", ", item.Tags)}]");
```

`.Select(e => new Item { ... })` is exactly Python's `[Item(id=..., name=...) for e in items]`. You've now got the whole parser; the next step is moving it somewhere reusable.

### Step 8: Move it into a class (and split I/O from parsing)

Create `CatalogTracker.Core/Sources/XmlItemSource.cs`:

```csharp
using System.Xml.Linq;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Sources;

public class XmlItemSource
{
    private readonly string _path;

    public XmlItemSource(string path)
    {
        _path = path;
    }

    // I/O: opens the file, then hands the parsed document to pure parsing code.
    public async Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
    {
        await using var stream = File.OpenRead(_path);
        XDocument doc = await XDocument.LoadAsync(stream, LoadOptions.None, ct);
        return Parse(doc);
    }

    // Pure function: XML in, items out. No files, no network, easy to test.
    public static IReadOnlyList<Item> Parse(XDocument doc)
    {
        if (doc.Root is null)
            return Array.Empty<Item>();

        return doc.Root
            .Elements("item")
            .Select(ParseItem)
            .ToList();
    }

    private static Item ParseItem(XElement e) => new()
    {
        Id       = (int?)e.Attribute("id") ?? 0,
        Name     = (string?)e.Element("name") ?? "(unnamed)",
        Category = (string?)e.Attribute("category") ?? "",
        Price    = (decimal?)e.Element("price") ?? 0m,
        Quantity = (int?)e.Element("quantity") ?? 0,
        Updated  = (DateTime?)e.Element("updated") ?? DateTime.MinValue,
        Tags     = e.Element("tags")?.Elements("tag").Select(t => t.Value).ToList() ?? new(),
    };
}
```

**How to read it, method by method:**

- **Constructor** takes the file path and remembers it. The class does nothing until you call a method.
- **`GetItemsAsync`** is the "do I/O" method. `File.OpenRead` opens the file; `await using` closes it afterward (Python's `with open(...)`); `XDocument.LoadAsync` parses without blocking; then it hands off to `Parse`.
- **`Parse`** is a `static` method: it needs no instance and uses no fields, so it can't touch the file system. Give it an `XDocument` and it gives back items. That purity is deliberate: in Chapter 10 you'll test it with a string literal and no files.
- **`if (doc.Root is null)`** is the proper version of the earlier `Root!`: an empty document returns an empty list instead of crashing.
- **`.Select(ParseItem)`** passes the method itself as the lambda ("for each element, call `ParseItem`"), shorthand for `.Select(e => ParseItem(e))`.
- **`ParseItem`** is the same mapping you wrote in Step 7, just named and made reusable.
- **`IReadOnlyList<Item>`** as the return type says "you get a list you can read and loop but not add to." It's a promise that callers can't modify what you return.

**Why separate I/O from parsing?** The rule of thumb: *code that touches the outside world (files, network, databases, clock) should be as thin as possible, with real logic in pure functions.* Pure functions are the easiest code to understand, test, and fix.

### Step 9: Use it

```csharp
// CatalogTracker.Cli/Program.cs
using CatalogTracker.Core.Sources;

var source = new XmlItemSource("sample.xml");
var items = await source.GetItemsAsync();

foreach (var item in items)
    Console.WriteLine($"{item.Id,3}  {item.Name,-18} {item.Price,8:C}  x{item.Quantity}  [{string.Join(", ", item.Tags)}]");
```

**Checkpoint:** three rows print; the watering can has an empty tag list and no crash.

**If something's off:** `FileNotFoundException` means the XML wasn't copied to the output folder (Step 1). A `XmlException` means the XML itself is malformed (the message gives a line number). All items having `Id = 0`/`"(unnamed)"` usually means a **namespace** problem (see below).

### 5.10 Reference: ElementTree ↔ LINQ to XML

| Python `ElementTree` | C# LINQ to XML |
|---|---|
| `ET.parse(path).getroot()` | `XDocument.Load(path).Root` |
| `ET.fromstring(text)` | `XDocument.Parse(text)` |
| `root.findall("item")` | `root.Elements("item")` (direct children) |
| `root.iter("tag")` | `root.Descendants("tag")` (anywhere below) |
| `e.find("name")` | `e.Element("name")` |
| `e.find("name").text` | `e.Element("name")?.Value` |
| `e.get("id")` | `e.Attribute("id")?.Value` |
| `int(e.get("id"))` | `(int)e.Attribute("id")` (throws if missing) |
| `int(e.get("x", 0))` | `(int?)e.Attribute("x") ?? 0` |
| `e.tag` | `e.Name.LocalName` |
| `e.attrib` | `e.Attributes()` |
| `list(e)` | `e.Elements()` |

### 5.11 Other XML situations you'll meet

**Namespaces** (the #1 reason a query "finds nothing"). If the XML says `<catalog xmlns="http://example.com/schema">`, then *every* element name belongs to that namespace and plain `"item"` won't match:

```csharp
XNamespace ns = "http://example.com/schema";
var items = doc.Root!.Elements(ns + "item");     // names must include the namespace
var name  = (string?)e.Element(ns + "name");
```

**Searching anywhere in the tree:** `doc.Descendants("price")` finds every `<price>` at any depth, like `iter()`.

**Looping attributes:**

```csharp
foreach (XAttribute a in e.Attributes())
    Console.WriteLine($"{a.Name} = {a.Value}");
```

**Reading an attribute of a child:** `(string?)e.Element("price")?.Attribute("currency")` gets `"USD"`. The `?.` after `Element(...)` protects against a missing `<price>`.

**Writing XML** (build a tree out of nested constructors, then save):

```csharp
var doc = new XDocument(
    new XElement("catalog",
        items.Select(i => new XElement("item",
            new XAttribute("id", i.Id),
            new XElement("name", i.Name),
            new XElement("price", i.Price)))));
doc.Save("out.xml");
```

Reading the nesting: each `new XElement(name, child1, child2, ...)` takes the element name followed by its children and attributes. The indentation mirrors the XML you'd produce.

**`XmlSerializer`** maps XML straight to classes via attributes like `[XmlElement]`. It works well for strict, stable schemas but wants mutable classes with parameterless constructors and is awkward for messy third-party XML. For messy data, hand-written LINQ to XML (what we did) is more forgiving and much easier to debug.

**Huge files (hundreds of MB):** `XDocument` loads everything into memory. For big files use `XmlReader` to stream elements one at a time.

**Validation:** if there's an XSD schema, `XmlSchemaSet` and `doc.Validate(...)` can check a document against it.

### Exercises (Chapter 5)

1. Add an optional `<supplier>` element to one item in the XML and a `string? Supplier` property to `Item`. Update `ParseItem`. Which lines changed?
2. Print only items with `Quantity == 0` using `.Where(...)`.
3. Also read the `currency` attribute of `<price>` into a new `Currency` property (default `"USD"`).
4. Break the XML on purpose (delete a closing tag). What exception do you get, and what does its message tell you? Catch it (`catch (System.Xml.XmlException ex)`) and print a friendly message instead.
5. Put a `xmlns="http://example.com/schema"` on `<catalog>` and watch the parser return nothing. Fix it with `XNamespace`.

---

## Chapter 6: Stage 3: Interfaces, design, and a service

This is the most important design chapter in the tutorial. Everything after it (SQLite vs EF, XML vs API, real vs fake in tests) depends on one idea. We'll build it up in small steps and *prove* it works before trusting it.

### Step 1: Feel the problem first

Right now `XmlItemSource` is a concrete class. Imagine the rest of your app growing like this:

```csharp
// somewhere in the app
var source = new XmlItemSource("sample.xml");
var items = await source.GetItemsAsync();
```

...repeated in the main screen, the report screen, the sync button, and a background job. The day you move to the API, you must find and edit every one of them, and hope you didn't miss one. And if the new thing has a slightly different method name, the compiler errors cascade everywhere.

**The question to ask:** *what does the rest of the app actually need?* It doesn't need "an XML parser." It needs **"something that can give me a list of items."** Whether that's XML, an API, or a hard-coded list in a test is not its business.

### Step 2: Express the need as an interface

An **interface** is a contract: "any class that claims to be this must have these members." Python analogy: an abstract base class or `typing.Protocol`, but the compiler enforces it.

Create `CatalogTracker.Core/Abstractions/IItemSource.cs`:

```csharp
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Abstractions;

/// <summary>Anything that can produce a list of items (XML file, web API, test data...).</summary>
public interface IItemSource
{
    Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default);
}
```

**How to read it:**

- Only **signatures**: no bodies, no `public` keyword on members (interface members are public by definition).
- Name starts with `I` by convention.
- The `///` comment is an XML doc comment; hover over the type anywhere in VS and you'll see it. Writing them for your interfaces is good practice.

### Step 3: Make `XmlItemSource` sign the contract

Change one line in `XmlItemSource.cs` and add a `using`:

```csharp
using CatalogTracker.Core.Abstractions;
...
public class XmlItemSource : IItemSource
```

The `: IItemSource` means "this class implements that interface." Build. It compiles, because `XmlItemSource` already has a matching `GetItemsAsync`.

**See the compiler enforce it:** temporarily rename `GetItemsAsync` in `XmlItemSource` to `GetItemsAsync2`. Build. You get an error like *"'XmlItemSource' does not implement interface member 'IItemSource.GetItemsAsync(CancellationToken)'"* (code CS0535). That is the compiler protecting the contract. Rename it back.

### Step 4: Prove the swap works

Create a second implementation to see the payoff. In `CatalogTracker.Cli`, add `HardCodedItemSource.cs`:

```csharp
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;

public class HardCodedItemSource : IItemSource
{
    public Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
    {
        IReadOnlyList<Item> items = new List<Item>
        {
            new() { Id = 100, Name = "Test Widget", Price = 1m, Quantity = 5 },
            new() { Id = 101, Name = "Test Gadget", Price = 2m, Quantity = 0 },
        };
        return Task.FromResult(items);
    }
}
```

`Task.FromResult(x)` means "I already have the answer, so wrap it in a completed `Task` so that it fits the async signature." (The interface says the method returns a `Task`, so every implementation must, even one that does no real waiting.)

Now use both through the *interface type* in `Program.cs`:

```csharp
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Sources;

IItemSource source = new XmlItemSource("sample.xml");
// IItemSource source = new HardCodedItemSource();     // <- swap by commenting one line

var items = await source.GetItemsAsync();
foreach (var item in items)
    Console.WriteLine($"{item.Id,3}  {item.Name}");
```

Run it, then swap which line is active and run again. The printing code never changed. **The variable is declared as `IItemSource`, not `XmlItemSource`.** That's the whole trick: code that *uses* the thing only knows the interface.

### Step 5: An interface for storage

Same thinking for the other side: the app needs "somewhere to keep items," not "SQLite." Create `Abstractions/IItemStore.cs`:

```csharp
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Abstractions;

/// <summary>Where items are persisted.</summary>
public interface IItemStore
{
    Task InitializeAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default);
    Task<Item?> GetByIdAsync(int id, CancellationToken ct = default);
    Task UpsertAsync(Item item, CancellationToken ct = default);
    Task UpsertManyAsync(IEnumerable<Item> items, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
```

**Reading the signatures** (a skill you'll use constantly, even on code you didn't write):

- `Task` with no `<...>`: an async operation that returns nothing (like an `async def` that returns `None`).
- `Task<IReadOnlyList<Item>>`: async, and you'll `await` it to get a read-only list.
- `Task<Item?>`: async, and the result may be `null`. The `?` is the compiler telling every caller "handle the not-found case."
- **Upsert** = "insert if new, update if it already exists."
- `IEnumerable<Item>` as a *parameter* means "give me anything I can loop over: a list, array, LINQ query." Accept the most general type; return the most useful one.
- Every method takes a `CancellationToken ct = default`, so the caller can cancel long operations. `= default` makes it optional.

### Step 6: A fake store to see everything work (no database yet)

In the Cli project, add `InMemoryItemStore.cs`. Hover the class name, press **Ctrl+.**, and pick *Implement interface* to get the stubs, then fill them in:

```csharp
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;

public class InMemoryItemStore : IItemStore
{
    private readonly Dictionary<int, Item> _data = new();

    public Task InitializeAsync(CancellationToken ct = default) => Task.CompletedTask;

    public Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<Item>>(_data.Values.OrderBy(i => i.Name).ToList());

    public Task<Item?> GetByIdAsync(int id, CancellationToken ct = default)
        => Task.FromResult(_data.GetValueOrDefault(id));

    public Task UpsertAsync(Item item, CancellationToken ct = default)
    {
        _data[item.Id] = item;
        return Task.CompletedTask;
    }

    public Task UpsertManyAsync(IEnumerable<Item> items, CancellationToken ct = default)
    {
        foreach (var item in items) _data[item.Id] = item;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(int id, CancellationToken ct = default)
    {
        _data.Remove(id);
        return Task.CompletedTask;
    }
}
```

It's just a dictionary. `Task.CompletedTask` is "a Task that's already done," for methods with nothing to wait for. This class is boring on purpose. It will be the star of your tests (Chapter 10), and it's how you can build and demo the whole app before any database exists.

### Step 7: The service: the app's logic lives here

Now the piece that *uses* the two interfaces. Create `CatalogTracker.Core/Services/CatalogService.cs`, building it up in parts.

**Part 1: the constructor (dependencies come in)**

```csharp
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Services;

public class CatalogService
{
    private readonly IItemStore _store;
    private readonly IItemSource _defaultSource;

    public CatalogService(IItemStore store, IItemSource defaultSource)
    {
        _store = store;
        _defaultSource = defaultSource;
    }
```

Notice what's **absent**: the words `XmlItemSource`, `SqliteItemStore`, and `new`. The class says "to do my job I need a store and a source" and trusts whoever builds it to supply them. This technique is called **dependency injection** (DI): dependencies are *injected* from outside instead of created inside. No framework required; it's just constructor parameters. `readonly` means the fields can only be set in the constructor.

**Part 2: the real behavior**

```csharp
    public Task InitializeAsync(CancellationToken ct = default) => _store.InitializeAsync(ct);

    /// <summary>Pull from the default source and save into the store. Returns how many items.</summary>
    public Task<int> SyncAsync(CancellationToken ct = default) => ImportAsync(_defaultSource, ct);

    /// <summary>Pull from any source (e.g. a file the user picked) and save. Returns the count.</summary>
    public async Task<int> ImportAsync(IItemSource source, CancellationToken ct = default)
    {
        var items = await source.GetItemsAsync(ct);
        await _store.UpsertManyAsync(items, ct);
        return items.Count;
    }
```

`ImportAsync` is the heart: *get from a source, save to the store.* `SyncAsync` is just `ImportAsync` using the default source. Look at how short and readable it is. That's what good layering buys you: the "business logic" is three lines because the hard parts live elsewhere.

**Part 3: pass-throughs**

```csharp
    public Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default) => _store.GetAllAsync(ct);
    public Task SaveAsync(Item item, CancellationToken ct = default) => _store.UpsertAsync(item, ct);
    public Task DeleteAsync(int id, CancellationToken ct = default) => _store.DeleteAsync(id, ct);
}
```

Right now these just forward to the store. "Why have a service at all?" Because this is the place where rules will accumulate: "don't save an item with an empty name," "log every delete," "recalculate totals." The UI will already be calling the service, so when those rules arrive, nothing outside changes. (Don't add the rules before you need them.)

**Notice `=>` without `async`:** these methods simply return the other method's `Task`, so they don't need `async`/`await`. Only methods that do something *after* awaiting (like `ImportAsync`) need `async`.

### Step 8: Wire it together and run it

Back in `CatalogTracker.Cli/Program.cs`:

```csharp
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Services;
using CatalogTracker.Core.Sources;

// ---- composition root: the ONE place that picks the concrete classes ----
IItemSource source = new XmlItemSource("sample.xml");
IItemStore  store  = new InMemoryItemStore();
var catalog        = new CatalogService(store, source);
// -------------------------------------------------------------------------

await catalog.InitializeAsync();
int n = await catalog.SyncAsync();
Console.WriteLine($"Synced {n} items");

foreach (var item in await catalog.GetAllAsync())
    Console.WriteLine($"{item.Id,3}  {item.Name,-18} {item.Price,8:C}");
```

**Checkpoint:** 3 items from the XML, loaded into the fake store, then printed back. Now change just the `source` line to `new HardCodedItemSource()` and rerun: 2 different items, and **`CatalogService` was never touched.**

The block marked "composition root" is where concrete classes get chosen. In the console app it's `Program.cs`; in the WinUI app it'll be `App.xaml.cs` (Chapter 13). Everything else only knows interfaces.

### 6.9 What you just learned: the principles, in plain English

| Principle | What it means here |
|---|---|
| **Single Responsibility** | `XmlItemSource` gets data. `IItemStore` saves it. `CatalogService` coordinates. Each class has one reason to change. |
| **Dependency Inversion** | `CatalogService` depends on abstractions (`IItemStore`) rather than concrete details (`SqliteItemStore`). |
| **Open/Closed** | Supporting a new source means *adding* a class, not editing existing, working ones. |
| **Testability** | Fakes replace real dependencies. No database needed to test logic. |
| **YAGNI** | You aren't gonna need it: don't write code "just in case." |

**When *not* to use an interface:** a good smell test is *"is there already a second implementation, or will there definitely be one soon?"* Here: yes (XML now, API soon, fakes for tests). For a small, stable helper class with only ever one implementation, a plain class is simpler. Over-abstracting makes code *harder* to follow, which is its own kind of bug.

### 6.10 Maintenance skills for interface-heavy code

When you meet code like this (from an agent or a coworker), these navigation tricks make it readable:

- **F12** on a method call goes to the **interface** declaration. That tells you *what* it promises.
- **Ctrl+F12** ("Go To Implementation") jumps to the **concrete classes**. That tells you *how* it's done, and shows how many implementations exist.
- **Shift+F12** ("Find All References") shows everywhere it's used.
- To find out **which implementation is actually used at runtime**, look at the composition root (`Program.cs` / `App.xaml.cs`) and find the line that creates it. If a bug exists "in the store," that tells you which store class to open.
- A dependency diagram in your head: *UI → ViewModel → Service → interfaces ← implementations.* Bugs hide in one box; knowing the boxes tells you where to look.

### Exercises (Chapter 6)

1. Add a method `Task<int> CountAsync(CancellationToken ct = default)` to `IItemStore`. The compiler now reports errors in `InMemoryItemStore`. Fix them. Notice the compiler found every class you needed to update.
2. Write a `RandomItemSource : IItemSource` that generates 5 random items. Plug it into `Program.cs`.
3. Add a rule to `CatalogService.SaveAsync`: throw `ArgumentException` if `item.Name` is blank (`string.IsNullOrWhiteSpace`). Which layers did you *not* have to touch?
4. In `Program.cs`, change the declared type of `source` from `IItemSource` to `var`. Does it still work? Hover over `source`: what type does VS show? Why is it better to declare the interface explicitly in the composition root?

---

## Chapter 7: Stage 4: SQLite with `Microsoft.Data.Sqlite`

You know Python's `sqlite3`. The C# equivalent is **ADO.NET**, using the `Microsoft.Data.Sqlite` package. The flow is the same as Python: **connection → command → parameters → execute or read**.

We'll build this in small steps, running the code after each one. In the first four steps you work in a scratch `Program.cs` so you can see each idea on its own. In Step 5 you turn those ideas into the real `SqliteItemStore` class.

First, add the package to Core:

```bash
dotnet add CatalogTracker.Core package Microsoft.Data.Sqlite
```

In VS you'd right-click the project → *Manage NuGet Packages*. Either way a `<PackageReference>` line appears in the `.csproj`. That line is your `requirements.txt`. Because the Cli project references Core, it can use the package too.

### Step 1: Open a database and create a table

Replace the contents of `CatalogTracker.Cli/Program.cs` with:

```csharp
using Microsoft.Data.Sqlite;

var dbPath = Path.Combine(AppContext.BaseDirectory, "scratch.db");

await using var conn = new SqliteConnection($"Data Source={dbPath}");
await conn.OpenAsync();

await using var create = conn.CreateCommand();
create.CommandText = "CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)";
await create.ExecuteNonQueryAsync();

Console.WriteLine($"Table ready at {dbPath}");
```

Run it: `dotnet run --project CatalogTracker.Cli`.

**What each part does:**

- `AppContext.BaseDirectory` is the folder your program runs from (`bin/Debug/net.../`). That's a safe place for a scratch file.
- `"Data Source=..."` is the **connection string**. For SQLite it's just the file path. SQLite creates the file if it doesn't exist.
- `new SqliteConnection(...)` doesn't connect yet. `await conn.OpenAsync()` does.
- `await using var conn` is Python's `with`: when the variable goes out of scope, the connection is closed and cleaned up automatically.
- `conn.CreateCommand()` makes a command object tied to this connection. You set `CommandText` to your SQL.
- `ExecuteNonQueryAsync()` runs SQL that doesn't return rows (CREATE, INSERT, UPDATE, DELETE). It returns the number of rows affected.

**Checkpoint:** you see "Table ready at ...". Open `scratch.db` in **DB Browser for SQLite** (free) and confirm the `items` table exists.

### Step 2: Insert with parameters

Add this to the end of `Program.cs`:

```csharp
await using var insert = conn.CreateCommand();
insert.CommandText = "INSERT OR REPLACE INTO items (id, name) VALUES ($id, $name)";
insert.Parameters.AddWithValue("$id", 1);
insert.Parameters.AddWithValue("$name", "Hammer");
int rows = await insert.ExecuteNonQueryAsync();

Console.WriteLine($"Inserted/updated {rows} row(s)");
```

Compare with Python: `cur.execute("INSERT ... VALUES (?, ?)", (1, "Hammer"))`. Here the placeholders have **names** (`$id`, `$name`) and you attach each value with `Parameters.AddWithValue`.

**Why parameters matter:** imagine `name` came from a text box and someone typed `x'); DROP TABLE items; --`. If you glued that into the SQL string, you'd run their code. With parameters, the database treats the value strictly as data. **Rule: never build SQL by concatenating or interpolating values. Always use parameters.** (Interpolating a *constant* you wrote yourself, like a list of column names, is fine.)

### Step 3: Read rows back

```csharp
await using var select = conn.CreateCommand();
select.CommandText = "SELECT id, name FROM items ORDER BY id";

await using var reader = await select.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    int id = reader.GetInt32(0);
    string name = reader.GetString(1);
    Console.WriteLine($"{id}: {name}");
}
```

**How to read this:**

- `ExecuteReaderAsync()` runs the query and gives you a **reader**, which is like a cursor over the results.
- `ReadAsync()` moves to the next row and returns `true` if there is one, `false` at the end. So `while (await reader.ReadAsync())` is Python's `for row in cursor`.
- Inside the loop, you pull each column **by position** with a typed getter: `GetInt32(0)` is the first column in your `SELECT`, `GetString(1)` the second. The position comes from the order of columns in your SQL, which is why we always list columns explicitly instead of `SELECT *`.
- If a column can be NULL, check first: `reader.IsDBNull(1) ? "" : reader.GetString(1)`. Calling `GetString` on a NULL throws.

**Checkpoint:** you see `1: Hammer`.

### Step 4: SQLite has no decimal, date, or list types

Our `Item` has a `decimal Price`, a `DateTime Updated` and a `List<string> Tags`. SQLite only really has integers, floats, text and blobs. So we convert at the boundary. Try these in the scratch file (add `using System.Globalization;` at the top):

```csharp
// decimal <-> text
decimal price = 12.50m;
string priceText = price.ToString(CultureInfo.InvariantCulture);          // "12.50"
decimal priceBack = decimal.Parse(priceText, CultureInfo.InvariantCulture);

// DateTime <-> ISO-8601 text
string iso = DateTime.Now.ToString("O");                                   // "2026-11-08T15:50:12.1234567-05:00"
DateTime isoBack = DateTime.Parse(iso, null, DateTimeStyles.RoundtripKind);

// List<string> <-> comma-separated text
string tagsText = string.Join(",", new List<string> { "steel", "hand" });  // "steel,hand"
List<string> tagsBack = tagsText.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();

Console.WriteLine($"{priceBack} | {isoBack:u} | {tagsBack.Count} tags");
```

**Why `CultureInfo.InvariantCulture`?** Without it, C# uses the machine's regional settings. In some locales the decimal separator is a comma, so `12.50` might fail to parse or be read as 1250. Using the invariant culture means "always use the same, culture-neutral format." Whenever you convert numbers or dates to/from text for **storage or data exchange**, pass it. (Only skip it when formatting for display to the user, where you *want* their local style.)

**Why not store price as a REAL?** Floating point can't represent 0.1 exactly, which matters for money. Text (or integer cents) keeps it exact. This is a design decision; the alternative is just as valid as long as you convert in one place.

**Why `"O"` and `RoundtripKind`?** `"O"` is the round-trip ISO-8601 format, which sorts correctly as text and doesn't depend on locale. `RoundtripKind` tells `Parse` to preserve the original kind (local/UTC).

You now know every conversion the store needs. Delete the scratch code; we'll use it properly.

### Step 5: Build the real `SqliteItemStore`, one method at a time

Create `CatalogTracker.Core/Storage/SqliteItemStore.cs`. We'll add methods gradually and test between additions.

#### 5a: The skeleton, a connection helper, and `InitializeAsync`

```csharp
using System.Globalization;
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;
using Microsoft.Data.Sqlite;

namespace CatalogTracker.Core.Storage;

public class SqliteItemStore : IItemStore
{
    private readonly string _connectionString;

    public SqliteItemStore(string dbPath)
    {
        _connectionString = $"Data Source={dbPath}";
    }

    private async Task<SqliteConnection> OpenAsync(CancellationToken ct)
    {
        var conn = new SqliteConnection(_connectionString);
        await conn.OpenAsync(ct);
        return conn;
    }

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS items (
                id       INTEGER PRIMARY KEY,
                name     TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT '',
                price    TEXT NOT NULL DEFAULT '0',
                quantity INTEGER NOT NULL DEFAULT 0,
                updated  TEXT NOT NULL,
                tags     TEXT NOT NULL DEFAULT ''
            );
            """;
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
```

The compiler will complain that `SqliteItemStore` doesn't implement the rest of `IItemStore`. **That's expected**. Hover the red squiggle on the class name, press **Ctrl+.** and choose *Implement interface*. It generates stubs that throw `NotImplementedException`. We'll fill them in over the next steps.

**How to read it:**

- The constructor stores a **connection string**, not a connection. Every method opens its own short-lived connection (cheap for SQLite) and disposes it, so there's no shared state to get tangled up.
- `OpenAsync` is a private helper so that creating and opening a connection lives in one place (don't repeat yourself). It returns an **already-open** connection, and the caller is responsible for disposing it, which is why callers write `await using var conn = await OpenAsync(ct);`.
- `"""..."""` is a raw string literal (Python's triple quotes), perfect for multi-line SQL.
- `CancellationToken ct = default` is passed down to every async call. If someone cancels, the database call stops early.

#### 5b: Write one item (upsert)

Add these to the class:

```csharp
    public async Task UpsertAsync(Item item, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await ExecuteUpsertAsync(conn, null, item, ct);
    }

    private static async Task ExecuteUpsertAsync(
        SqliteConnection conn, SqliteTransaction? tx, Item item, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
            INSERT INTO items (id, name, category, price, quantity, updated, tags)
            VALUES ($id, $name, $category, $price, $quantity, $updated, $tags)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                category = excluded.category,
                price = excluded.price,
                quantity = excluded.quantity,
                updated = excluded.updated,
                tags = excluded.tags;
            """;
        cmd.Parameters.AddWithValue("$id", item.Id);
        cmd.Parameters.AddWithValue("$name", item.Name);
        cmd.Parameters.AddWithValue("$category", item.Category);
        cmd.Parameters.AddWithValue("$price", item.Price.ToString(CultureInfo.InvariantCulture));
        cmd.Parameters.AddWithValue("$quantity", item.Quantity);
        cmd.Parameters.AddWithValue("$updated", item.Updated.ToString("O"));
        cmd.Parameters.AddWithValue("$tags", string.Join(",", item.Tags));
        await cmd.ExecuteNonQueryAsync(ct);
    }
```

**How to read it:**

- **Upsert** = "insert, but if the id already exists, update instead." SQLite's `ON CONFLICT(id) DO UPDATE SET ...` does that in one statement. `excluded.name` means "the value I tried to insert."
- Every `item.X` goes through one of the conversions from Step 4. This is the *only* place that knows how an `Item` becomes a row.
- `SqliteTransaction? tx` is nullable on purpose: pass `null` for a single insert, or a real transaction when doing many (5d). Setting `cmd.Transaction = tx` with `null` just means "no transaction." We split the work into `ExecuteUpsertAsync` so both the single and batch versions share it (DRY).
- `static` here means "this helper doesn't use any instance fields, so it doesn't need `this`." It's a hint to the reader that it's a pure helper.

#### 5c: Read items

```csharp
    private const string SelectColumns =
        "SELECT id, name, category, price, quantity, updated, tags FROM items";

    public async Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"{SelectColumns} ORDER BY name";
        return await ReadItemsAsync(cmd, ct);
    }

    private static async Task<IReadOnlyList<Item>> ReadItemsAsync(SqliteCommand cmd, CancellationToken ct)
    {
        var result = new List<Item>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            result.Add(new Item
            {
                Id       = reader.GetInt32(0),
                Name     = reader.GetString(1),
                Category = reader.GetString(2),
                Price    = decimal.Parse(reader.GetString(3), CultureInfo.InvariantCulture),
                Quantity = reader.GetInt32(4),
                Updated  = DateTime.Parse(reader.GetString(5), null, DateTimeStyles.RoundtripKind),
                Tags     = reader.GetString(6)
                                 .Split(',', StringSplitOptions.RemoveEmptyEntries)
                                 .ToList(),
            });
        }
        return result;
    }
```

**The important detail:** the numbers `0..6` in `ReadItemsAsync` correspond to the **order of columns in `SelectColumns`**. That's why the column list lives in one constant: change the SELECT and you must change the reader. It's the kind of fragile coupling that makes people reach for ORMs (next chapter).

Why a separate `ReadItemsAsync`? Both `GetAllAsync` and `GetByIdAsync` need to turn rows into `Item`s, and we only want to write that once.

**Test it** (in `CatalogTracker.Cli/Program.cs`, replacing the scratch code):

```csharp
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;
using CatalogTracker.Core.Storage;

var dbPath = Path.Combine(AppContext.BaseDirectory, "catalog.db");
IItemStore store = new SqliteItemStore(dbPath);

await store.InitializeAsync();
await store.UpsertAsync(new Item { Id = 1, Name = "Hammer", Price = 12.5m, Quantity = 10, Updated = DateTime.Now, Tags = new() { "steel" } });

foreach (var item in await store.GetAllAsync())
    Console.WriteLine($"{item.Id}: {item.Name} {item.Price:C} {string.Join("|", item.Tags)}");
```

(Other interface methods still throw `NotImplementedException`; that's fine as long as you don't call them yet.)

**Checkpoint:** run it twice; you still see one Hammer, not two (upsert, not duplicate).

#### 5d: Batch writes with a transaction

```csharp
    public async Task UpsertManyAsync(IEnumerable<Item> items, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        using var tx = conn.BeginTransaction();
        foreach (var item in items)
            await ExecuteUpsertAsync(conn, tx, item, ct);
        await tx.CommitAsync(ct);
    }
```

A **transaction** groups many statements into one unit: either all are saved (`CommitAsync`) or, if an exception occurs before the commit, none are (the `using` disposes the transaction and it rolls back). It also makes bulk inserts dramatically faster, since SQLite syncs to disk once instead of once per row.

#### 5e: Get one and delete

```csharp
    public async Task<Item?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"{SelectColumns} WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        var rows = await ReadItemsAsync(cmd, ct);
        return rows.FirstOrDefault();
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM items WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        await cmd.ExecuteNonQueryAsync(ct);
    }
```

`FirstOrDefault()` returns the first row or `null` if there are none. That's why the method's return type is `Item?`. The caller is forced to think about "what if it's not there?"

#### 5f: Wire it up with the XML source

Now use everything together in `Program.cs`. This is the **composition root**, the one place that picks concrete classes.

```csharp
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Services;
using CatalogTracker.Core.Sources;
using CatalogTracker.Core.Storage;

var dbPath = Path.Combine(AppContext.BaseDirectory, "catalog.db");
IItemStore store   = new SqliteItemStore(dbPath);
IItemSource source = new XmlItemSource("sample.xml");
var catalog        = new CatalogService(store, source);

await catalog.InitializeAsync();
int imported = await catalog.SyncAsync();
Console.WriteLine($"Imported {imported} items into {dbPath}");

var all = await catalog.GetAllAsync();
foreach (var item in all)
    Console.WriteLine($"{item.Id,3}  {item.Name,-18} {item.Price,8:C}  x{item.Quantity}");

var first = all[0] with { Price = 99.99m, Updated = DateTime.Now };
await catalog.SaveAsync(first);
Console.WriteLine((await store.GetByIdAsync(first.Id))!.Price);
```

Notice the variable types: `IItemStore store`, `IItemSource source`. We *declare* them as the interface even though we construct concrete classes. That's the habit that keeps the rest of the code swappable.

**Checkpoint:** run twice. Three items both times (upsert). Last line prints `99.99`. Open `catalog.db` in DB Browser and look at how the text columns look for price/updated/tags.

### 5g: The complete file, for reference

If yours doesn't compile, compare against this. Member order doesn't matter to the compiler; this is the order that reads best.

```csharp
using System.Globalization;
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;
using Microsoft.Data.Sqlite;

namespace CatalogTracker.Core.Storage;

public class SqliteItemStore : IItemStore
{
    private readonly string _connectionString;

    public SqliteItemStore(string dbPath) => _connectionString = $"Data Source={dbPath}";

    // ----- public API (the IItemStore contract) -----
    public async Task InitializeAsync(CancellationToken ct = default) { /* CREATE TABLE, see 5a */ }
    public async Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default) { /* 5c */ }
    public async Task<Item?> GetByIdAsync(int id, CancellationToken ct = default) { /* 5e */ }
    public async Task UpsertAsync(Item item, CancellationToken ct = default) { /* 5b */ }
    public async Task UpsertManyAsync(IEnumerable<Item> items, CancellationToken ct = default) { /* 5d */ }
    public async Task DeleteAsync(int id, CancellationToken ct = default) { /* 5e */ }

    // ----- private helpers -----
    private const string SelectColumns = "SELECT id, name, category, price, quantity, updated, tags FROM items";
    private async Task<SqliteConnection> OpenAsync(CancellationToken ct) { /* 5a */ }
    private static async Task ExecuteUpsertAsync(SqliteConnection conn, SqliteTransaction? tx, Item item, CancellationToken ct) { /* 5b */ }
    private static async Task<IReadOnlyList<Item>> ReadItemsAsync(SqliteCommand cmd, CancellationToken ct) { /* 5c */ }
}
```

(That's an outline, with the bodies exactly as written in 5a-5e. The outline is useful as a "map": six public methods the interface demands, four private helpers that avoid repeating yourself.)

### 7.6 Connecting to an *existing* SQLite database

You don't need `InitializeAsync` or the schema; just point at the file and write queries for the tables that exist.

```csharp
var store = new SqliteItemStore(@"C:\data\legacy.db");   // skip InitializeAsync()
```

If the legacy table doesn't look like `items`, **don't bend your domain model to it**. Write a new store class (e.g., `LegacyOrderStore`) with its own SQL and its own mapping into your domain types. The `ReadItemsAsync` pattern from 5c is the template.

Practical tips:

- **Look at the schema first**: DB Browser, or run `SELECT sql FROM sqlite_master;`.
- **Work on a copy** while experimenting.
- **Read-only access:** connection string `Data Source=legacy.db;Mode=ReadOnly`.
- **Column type surprises:** SQLite lets an `INTEGER` column hold text. `GetInt32` throws if the data doesn't match; check with `reader.IsDBNull(i)` and consider `reader.GetValue(i)` + conversion for messy columns.
- **Shared file:** if another program also uses the DB, keep connections short-lived (as we do) and add a timeout: `Data Source=...;Default Timeout=30`.

### Exercises (Chapter 7)

1. Add `Task<IReadOnlyList<Item>> SearchAsync(string text)` to `IItemStore` and `SqliteItemStore` using `WHERE name LIKE $q` with the value `"%" + text + "%"`. (Hint: concatenate in C# and pass the whole thing as the parameter. Don't put it in the SQL string.)
2. Make `category` nullable in SQL and read it safely with `reader.IsDBNull(2) ? "" : reader.GetString(2)`.
3. Add an `Item.Supplier` property and database column. Write down every place you had to edit. (That list is the argument for the next chapter.)
4. Break the transaction on purpose: throw an exception halfway through the `foreach` in `UpsertManyAsync` and confirm that nothing was saved.

---

## Chapter 8: Stage 5: Entity Framework Core (explained for humans)

EF Core is C#'s ORM, like **SQLAlchemy**. If the tutorial you found was unhelpful, it probably started with migrations and jargon. We'll start with the smallest thing that works and add one idea at a time.

### 8.1 Concepts in Python terms

| EF Core term | SQLAlchemy / meaning |
|---|---|
| **Entity** | A class mapped to a table row (a SQLAlchemy model) |
| **`DbContext`** | Your `Session` plus the model configuration: the gateway to the DB |
| **`DbSet<T>`** | A table you can query and add to |
| **LINQ queries** | The same `Where`/`OrderBy`/`Select` you already know, **translated to SQL** |
| **Change tracking** | EF remembers what it loaded; `SaveChanges()` writes the differences (like `session.commit()`) |
| **Migrations** | Alembic: versioned schema changes (optional!) |
| **Scaffolding** | Generating entity classes **from an existing database** |

**Honest take:** for a small app with a few tables, the raw ADO.NET from Chapter 7 is perfectly fine. EF pays off with many tables, relationships, or lots of query variety. A middle path worth knowing about is **Dapper** (you write SQL, it maps rows to objects). You're learning both so you can choose, and thanks to `IItemStore`, you can switch later without touching the rest of the app.

### 8.2 Packages

```bash
dotnet add CatalogTracker.Core package Microsoft.EntityFrameworkCore.Sqlite
dotnet add CatalogTracker.Cli  package Microsoft.EntityFrameworkCore.Design
dotnet tool install --global dotnet-ef
```

The `Design` package and `dotnet-ef` tool are only needed for command-line features (scaffolding, migrations). Normal queries only need the first package.

### Step 1: An entity class (a table as a C# class)

Create `CatalogTracker.Core/Storage/Ef/ItemRow.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CatalogTracker.Core.Storage.Ef;

[Table("items")]
public class ItemRow
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("id")] public int Id { get; set; }

    [Column("name")]     public string Name { get; set; } = "";
    [Column("category")] public string Category { get; set; } = "";
    [Column("price")]    public string Price { get; set; } = "0";
    [Column("quantity")] public int Quantity { get; set; }
    [Column("updated")]  public string Updated { get; set; } = "";
    [Column("tags")]     public string Tags { get; set; } = "";
}
```

**How to read the `[Brackets]`:** they're **attributes**, metadata attached to the thing right below them (similar to Python decorators/annotations). They don't run; EF reads them.

- `[Table("items")]`: this class is the `items` table.
- `[Column("name")]`: this property is the `name` column. (Without attributes, EF assumes the column has the same name as the property, e.g. `Name`. We're being explicit so we match the table from Chapter 7.)
- `[Key]`: this is the primary key.
- `[DatabaseGenerated(None)]`: we supply the IDs ourselves; EF shouldn't expect the database to auto-number.

Notice `Price`, `Updated` and `Tags` are **strings**: exactly how they're stored in the table from Chapter 7. A row class mirrors the *database*, ugly bits included.

### Step 2: The `DbContext`

Create `CatalogDbContext.cs` in the same folder:

```csharp
using Microsoft.EntityFrameworkCore;

namespace CatalogTracker.Core.Storage.Ef;

public class CatalogDbContext : DbContext
{
    private readonly string _dbPath;

    public CatalogDbContext(string dbPath)
    {
        _dbPath = dbPath;
    }

    public DbSet<ItemRow> Items => Set<ItemRow>();

    protected override void OnConfiguring(DbContextOptionsBuilder options)
        => options.UseSqlite($"Data Source={_dbPath}");
}
```

- `DbContext` is the EF base class; you inherit from it to describe "my database."
- `DbSet<ItemRow> Items` says "this database has a table of `ItemRow`s called Items."
- `OnConfiguring` is where you say *which* database engine and file to use. `override` means "replace the base class's version of this method."

### Step 3: Your first EF program

Replace `Program.cs` temporarily (use a throwaway DB file so we don't touch the one from Ch. 7):

```csharp
using CatalogTracker.Core.Storage.Ef;
using Microsoft.EntityFrameworkCore;

var dbPath = Path.Combine(AppContext.BaseDirectory, "ef-test.db");

await using var db = new CatalogDbContext(dbPath);
await db.Database.EnsureCreatedAsync();          // creates file + tables if missing

db.Items.Add(new ItemRow { Id = 1, Name = "Hammer", Updated = DateTime.Now.ToString("O") });
await db.SaveChangesAsync();                     // runs the INSERT

var all = await db.Items.ToListAsync();
foreach (var r in all)
    Console.WriteLine($"{r.Id}: {r.Name}");
```

Run it once. Run it again: the second run throws a "UNIQUE constraint failed" error because Id 1 already exists. **That's good**: it shows EF really did the insert. Delete `ef-test.db` from the output folder (or change the Id) to run again.

Two key ideas here:

1. `db.Items.Add(...)` only changes EF's **in-memory plan**. Nothing hits the database until `SaveChangesAsync()`. It's like building a commit.
2. `ToListAsync()` is where a query is actually **executed**. Anything before it (`Where`, `OrderBy`) is building the query.

### Step 4: Queries, and seeing the SQL

Add logging so you can see exactly what SQL EF writes. In `CatalogDbContext.OnConfiguring`:

```csharp
    protected override void OnConfiguring(DbContextOptionsBuilder options)
        => options
            .UseSqlite($"Data Source={_dbPath}")
            .LogTo(Console.WriteLine, Microsoft.Extensions.Logging.LogLevel.Information);
```

Now try queries in `Program.cs`:

```csharp
var cheap = await db.Items
    .Where(r => r.Quantity < 5)
    .OrderBy(r => r.Name)
    .ToListAsync();
```

In the console output you'll see something like `SELECT ... FROM "items" AS "i" WHERE "i"."quantity" < 5 ORDER BY "i"."name"`. EF **translated your C# lambda to SQL**. This is the best way to learn EF: write a query, look at the SQL.

Limits: EF can only translate expressions it understands. If you call your own C# method inside a `Where`, it may throw "could not be translated". Fix by simplifying the expression, or pull data into memory first with `.ToListAsync()` and filter with LINQ after.

For read-only queries add `.AsNoTracking()` (before `ToListAsync`). It skips change tracking, which is faster and what you want when you're just showing data.

### Step 5: Change tracking (the part that feels like magic)

```csharp
var hammer = await db.Items.FirstAsync(r => r.Id == 1);   // EF loads it AND remembers it
hammer.Name = "Claw Hammer";                               // you changed a plain C# property
await db.SaveChangesAsync();                               // EF notices, writes an UPDATE
```

Look at the log: you'll see an `UPDATE items SET name = ...` with only the changed column. No explicit "update" call. EF compared the object to the snapshot it took when loading. Equivalent in SQLAlchemy: modify an attribute on a loaded object and `session.commit()`.

This matters for design: a `DbContext` is a **short-lived unit of work**. Create one, do a small amount of work, `SaveChanges`, dispose it. Don't keep one around for the life of your app.

### Step 6: Why a separate `ItemRow` and `Item`?

You might wonder why we didn't make EF use our `Item` record directly. We could, but then database oddities (price-as-text, tags-as-comma-string) would leak into the domain model or force awkward EF configuration. Keeping them separate means:

- `ItemRow` = **shape of the database**
- `Item` = **shape of what your app thinks about**
- One small mapping layer translates, in one place

You'll do exactly this with API data (DTOs, Ch. 9) and legacy databases. Write the mappers now. Create `EfItemStore.cs` with the skeleton plus mapping first:

```csharp
using System.Globalization;
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace CatalogTracker.Core.Storage.Ef;

public class EfItemStore : IItemStore
{
    private readonly string _dbPath;

    public EfItemStore(string dbPath) => _dbPath = dbPath;

    private CatalogDbContext NewContext() => new(_dbPath);

    // ---------- mapping ----------
    private static Item ToItem(ItemRow r) => new()
    {
        Id = r.Id,
        Name = r.Name,
        Category = r.Category,
        Price = decimal.Parse(r.Price, CultureInfo.InvariantCulture),
        Quantity = r.Quantity,
        Updated = DateTime.Parse(r.Updated, null, DateTimeStyles.RoundtripKind),
        Tags = r.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
    };

    private static ItemRow ToRow(Item i) => new()
    {
        Id = i.Id,
        Name = i.Name,
        Category = i.Category,
        Price = i.Price.ToString(CultureInfo.InvariantCulture),
        Quantity = i.Quantity,
        Updated = i.Updated.ToString("O"),
        Tags = string.Join(",", i.Tags),
    };
}
```

These are the same conversions you wrote in Chapter 7, moved into two tiny methods. Use **Ctrl+.** → *Implement interface* to stub out the rest.

### Step 7: Fill in the `IItemStore` methods

Add these one at a time:

```csharp
    public async Task InitializeAsync(CancellationToken ct = default)
    {
        await using var db = NewContext();
        await db.Database.EnsureCreatedAsync(ct);
    }
```

`EnsureCreated` creates the schema if the database doesn't exist yet. It does nothing if the DB already exists, so it's safe to point at the file from Chapter 7.

```csharp
    public async Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default)
    {
        await using var db = NewContext();
        var rows = await db.Items.AsNoTracking().OrderBy(r => r.Name).ToListAsync(ct);
        return rows.Select(ToItem).ToList();
    }

    public async Task<Item?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        await using var db = NewContext();
        var row = await db.Items.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        return row is null ? null : ToItem(row);
    }
```

Reading tip: `rows.Select(ToItem)` passes the **method itself** as the lambda ("for each row, call `ToItem`"). It's shorthand for `rows.Select(r => ToItem(r))`.

```csharp
    public async Task UpsertAsync(Item item, CancellationToken ct = default)
        => await UpsertManyAsync(new[] { item }, ct);

    public async Task UpsertManyAsync(IEnumerable<Item> items, CancellationToken ct = default)
    {
        await using var db = NewContext();
        foreach (var item in items)
        {
            var incoming = ToRow(item);
            var existing = await db.Items.FindAsync(new object[] { item.Id }, ct);
            if (existing is null)
                db.Items.Add(incoming);                                  // new -> INSERT
            else
                db.Entry(existing).CurrentValues.SetValues(incoming);    // exists -> UPDATE changed values
        }
        await db.SaveChangesAsync(ct);                                   // one transaction for all
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        await using var db = NewContext();
        await db.Items.Where(r => r.Id == id).ExecuteDeleteAsync(ct);
    }
```

**Reading `UpsertManyAsync`:** `FindAsync` loads the row by primary key (and starts tracking it). If missing, we `Add` the new row. If found, `SetValues` copies the new values onto the tracked row, and EF's change tracking works out which columns differ. `SaveChangesAsync` then writes everything in a single transaction. (EF has no built-in "upsert", so we implement it as find-then-add-or-update.)

`ExecuteDeleteAsync` issues a single `DELETE ... WHERE id = ...` straight away, with no need to load the row first.

### Step 8: Swap it in, and notice what *doesn't* change

In `Program.cs` from Chapter 7 (the version that wires up `CatalogService`) change one line:

```csharp
IItemStore store = new EfItemStore(dbPath);   // was: new SqliteItemStore(dbPath)
```

Run it. Same output, because `CatalogService` and the rest of the program only know about `IItemStore`. That's the payoff of Chapter 6's design: you just replaced your entire data layer by changing one line.

Since both stores use the same table layout, you can even run it against the `catalog.db` written by the raw SQLite version.

### 8.3 Connecting EF to an *existing* database

**Option A: Scaffold.** EF reads the schema and generates the classes for you. From your solution folder:

```bash
dotnet ef dbcontext scaffold "Data Source=C:\data\legacy.db" Microsoft.EntityFrameworkCore.Sqlite ^
    --project CatalogTracker.Core --startup-project CatalogTracker.Cli ^
    --output-dir Storage/Legacy --context LegacyDbContext --data-annotations
```

(`^` is the Windows cmd line-continuation; use `` ` `` in PowerShell or `\` in bash. Or put it all on one line.)

You get one class per table and a context class. **Read what it generates**; it's a fast way to learn how mapping looks. Notes:

- Tables **without a primary key** are skipped (EF warns). Map them by hand as read-only **keyless** entities: put `[Keyless]` on the class.
- **Views** can also be mapped as keyless entities.
- Re-running with `--force` overwrites generated files. Put your own additions in separate `partial class` files so they survive regeneration.

**Option B: Hand-map only what you need.** Write `ItemRow`-style classes with `[Table]`/`[Column]` for just the tables and columns you use. For a messy legacy database, this is often cleaner than a full scaffold.

**Option C: Raw SQL into your own type** (EF 7 and later):

```csharp
public class StockSummary { public string Name { get; set; } = ""; public long Total { get; set; } }

var rows = await db.Database
    .SqlQuery<StockSummary>($"SELECT name AS Name, SUM(quantity) AS Total FROM items GROUP BY name")
    .ToListAsync();
```

Column aliases must match the property names. Values interpolated with `$"..."` in `SqlQuery` become safe parameters automatically (this is a special EF behavior; don't generalize it to normal strings).

### 8.4 Migrations: only if you own the schema

Migrations record schema changes as code files: `dotnet ef migrations add AddSupplier`, then `dotnet ef database update` (or `db.Database.MigrateAsync()` at startup). They're valuable when *your* app owns the database and ships updates. If you're attaching to a database someone else owns, **don't use them**. And don't mix `EnsureCreated` with migrations on the same database.

### Exercises (Chapter 8)

1. Add a `Supplier` column. Count the files you edit in the raw-ADO store versus the EF store.
2. Turn on `LogTo` and watch the SQL for `GetAllAsync`, `UpsertManyAsync` and `DeleteAsync`.
3. Make a copy of `catalog.db`, scaffold from it, and compare the generated class to your hand-written `ItemRow`.
4. Add `Task<IReadOnlyList<Item>> GetLowStockAsync()` to the EF store using `Where(r => r.Quantity < 5)`, and look at the SQL.
5. Break change tracking on purpose: load a row with `AsNoTracking()`, change a property, call `SaveChangesAsync()`. Does the change save? Why not?

---

## Chapter 9: Stage 6: Wiring up the API (while keeping XML)

Your plan: keep XML working while you integrate the API, and fall back to XML if the API doesn't have something. Because of `IItemSource` (Ch. 6), that's three small classes. We'll build up to it in steps, starting with the simplest possible HTTP call.

### 9.1 HTTP + JSON in Python terms

| Python | C# |
|---|---|
| `requests.get(url, headers=...)` | `HttpClient.GetAsync(...)` / `GetFromJsonAsync<T>(...)` |
| `resp.json()` | automatic deserialization into your class |
| `resp.raise_for_status()` | `resp.EnsureSuccessStatusCode()` |
| `json.dumps(obj)` | `JsonSerializer.Serialize(obj)` |
| `requests.Session()` | a long-lived, reused `HttpClient` |

**Rule:** create one `HttpClient` and reuse it. Creating a new one per request in a loop exhausts network sockets. (Bigger apps use `IHttpClientFactory`; a single shared instance is fine for us.)

### Step 1: Make a raw call and look at the text

Use a free public test API so you can see HTTP working before involving your real one. In a scratch `Program.cs`:

```csharp
using var http = new HttpClient();
string raw = await http.GetStringAsync("https://jsonplaceholder.typicode.com/todos/1");
Console.WriteLine(raw);
```

You'll see JSON like `{ "userId": 1, "id": 1, "title": "...", "completed": false }`. (If you're on a corporate network and it fails, a proxy or firewall may be blocking it. That's useful practice for reading `HttpRequestException` messages. You can skip to Step 3, which uses a local file.)

**What happened:** `GetStringAsync` sent a GET request, checked that the status was a success (it throws `HttpRequestException` if not), and returned the body as text. Printing the raw text first is always a great debugging habit.

### Step 2: Turn JSON into a C# object

Make a class whose properties match the JSON keys:

```csharp
using System.Net.Http.Json;

using var http = new HttpClient();
Todo? todo = await http.GetFromJsonAsync<Todo>("https://jsonplaceholder.typicode.com/todos/1");
Console.WriteLine($"{todo?.Id}: {todo?.Title} (done: {todo?.Completed})");

public class Todo
{
    public int UserId { get; set; }
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public bool Completed { get; set; }
}
```

(In a top-level-statements file, type declarations must go **after** the statements, as shown.)

`GetFromJsonAsync<Todo>` does the request and the parse in one go. It's like `Todo(**resp.json())` in Python. The JSON key `userId` matched the property `UserId` because this method uses "web defaults": case-insensitive matching.

Return type is `Todo?` (nullable) because the JSON could be literally `null`, so we use `todo?.Id`.

**When names don't match** (like `item_id` vs `ItemId`), you tell the deserializer with an attribute. That's the next step.

### Step 3: A DTO shaped like *your* API

APIs return their own shape, which won't match your `Item`. Don't distort your domain model to fit every API. Make a **DTO** (data transfer object) class that mirrors the JSON exactly, then **map** it to your `Item` in one place.

Suppose your API returns:

```json
[
  { "item_id": 7, "title": "Saw", "group": "tools", "unit_price": 19.95,
    "stock": 4, "modified": "2026-03-01T10:00:00Z", "labels": ["steel"] }
]
```

Save that as `api-sample.json` in the Cli project (set *Copy to Output Directory* as you did for the XML). Then create `CatalogTracker.Core/Sources/Api/ApiItemDto.cs`:

```csharp
using System.Text.Json.Serialization;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Sources.Api;

public class ApiItemDto
{
    [JsonPropertyName("item_id")]    public int ItemId { get; set; }
    [JsonPropertyName("title")]      public string? Title { get; set; }
    [JsonPropertyName("group")]      public string? Group { get; set; }
    [JsonPropertyName("unit_price")] public decimal UnitPrice { get; set; }
    [JsonPropertyName("stock")]      public int Stock { get; set; }
    [JsonPropertyName("modified")]   public DateTime? Modified { get; set; }
    [JsonPropertyName("labels")]     public List<string>? Labels { get; set; }

    public Item ToItem() => new()
    {
        Id = ItemId,
        Name = Title ?? "(unnamed)",
        Category = Group ?? "",
        Price = UnitPrice,
        Quantity = Stock,
        Updated = Modified ?? DateTime.MinValue,
        Tags = Labels ?? new(),
    };
}
```

**How to read it:**

- `[JsonPropertyName("item_id")]` says "the JSON key `item_id` maps to this C# property." In Python you'd write `data["item_id"]`.
- Properties that might be missing or `null` in the JSON are declared nullable (`string?`, `DateTime?`, `List<string>?`). That's honest: it documents that the API can omit them.
- `ToItem()` is **the only place that knows how API data becomes domain data**. The `??` operators supply defaults for missing values.
- The DTO has public setters (unlike `Item`) because the JSON deserializer needs to fill it in. DTOs are throwaway shuttle objects, so mutability is fine here.

### Step 4: A source that reads the JSON from a file (practice mode)

While you don't have access to the real API, build the pipeline against a file in the same shape. `CatalogTracker.Core/Sources/Api/JsonFileItemSource.cs`:

```csharp
using System.Text.Json;
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Sources.Api;

public class JsonFileItemSource : IItemSource
{
    private readonly string _path;

    public JsonFileItemSource(string path) => _path = path;

    public async Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
    {
        await using var stream = File.OpenRead(_path);
        var dtos = await JsonSerializer.DeserializeAsync<List<ApiItemDto>>(stream, cancellationToken: ct)
                   ?? new List<ApiItemDto>();
        return dtos.Select(d => d.ToItem()).ToList();
    }
}
```

Try it in the console program:

```csharp
IItemSource source = new JsonFileItemSource("api-sample.json");   // was: new XmlItemSource("sample.xml")
```

Run the sync again. The Saw appears. **You swapped the data source by changing one line.** Note that `JsonSerializer.DeserializeAsync` is case-**sensitive** by default, which is fine since every property has an explicit `[JsonPropertyName]`.

**Checkpoint:** the Saw (Id 7) shows up in the printed list and in your database.

### Step 5: The real HTTP source

Now the same thing, but over the network. `CatalogTracker.Core/Sources/Api/HttpItemSource.cs`:

```csharp
using System.Net.Http.Json;
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Sources.Api;

public class HttpItemSource : IItemSource
{
    private readonly HttpClient _http;

    public HttpItemSource(HttpClient http) => _http = http;

    public async Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
    {
        var dtos = await _http.GetFromJsonAsync<List<ApiItemDto>>("items", ct)
                   ?? new List<ApiItemDto>();
        return dtos.Select(d => d.ToItem()).ToList();
    }
}
```

Compare with `JsonFileItemSource`: identical except the data arrives from `_http` instead of a file. Everything after `dtos` is the same, which proves the DTO and mapping design.

Notice the **constructor takes an `HttpClient`** rather than creating one. Whoever builds this class decides the base URL, auth, timeout, and proxy. That keeps secrets and environment details out of the class (and makes it testable).

### Step 6: Configure the `HttpClient` (in the composition root)

```csharp
var http = new HttpClient
{
    BaseAddress = new Uri("https://api.example.com/v1/"),   // trailing slash matters!
    Timeout = TimeSpan.FromSeconds(15),
};
http.DefaultRequestHeaders.Authorization =
    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

IItemSource api = new HttpItemSource(http);
```

With `BaseAddress = ".../v1/"`, a call to `"items"` goes to `.../v1/items`. **If you forget the trailing slash,** `v1` gets dropped from the URL, which is a classic head-scratcher.

Other things you'll need:

```csharp
// Query strings (always escape user-provided values)
var url = $"items?category={Uri.EscapeDataString(category)}&page={page}";

// Custom header (API keys)
http.DefaultRequestHeaders.Add("X-Api-Key", apiKey);

// POST JSON
var resp = await http.PostAsJsonAsync("items", dto, ct);
resp.EnsureSuccessStatusCode();           // throws HttpRequestException on 4xx/5xx

// Inspect the status or body yourself
var resp2 = await http.GetAsync("items", ct);
if (!resp2.IsSuccessStatusCode)
    Console.WriteLine($"{(int)resp2.StatusCode} {await resp2.Content.ReadAsStringAsync(ct)}");
```

Debugging tip: when deserialization surprises you, temporarily call `GetStringAsync` and print the raw JSON (Step 1) to compare with your DTO.

### Step 7: Secrets: your repo is PUBLIC

Never put tokens, API keys, or private URLs in source files. Where does `token` in Step 6 come from?

- **Environment variable:** `Environment.GetEnvironmentVariable("CATALOG_API_TOKEN")`. Set it in your own user environment, outside the repo. Simplest option.
- **User secrets** (dev-time, stored outside the repo): `dotnet user-secrets init`, `dotnet user-secrets set "ApiToken" "abc123"`, read with the `Microsoft.Extensions.Configuration.UserSecrets` package.
- **A local config file** (e.g. `appsettings.local.json`) that is listed in `.gitignore`.
- Run `dotnet new gitignore` at the start of the project so `bin/`, `obj/`, `.vs/` and `*.db` stay out of the repo.
- If a secret ever lands in a commit, **rotate it** (get a new one). Deleting it from later commits doesn't remove it from history.

Check what you're about to publish with `git status` and `git diff --staged` before every push.

### Step 8: Fallback: "API first, XML if it fails"

```csharp
// CatalogTracker.Core/Sources/FallbackItemSource.cs
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Sources;

public class FallbackItemSource : IItemSource
{
    private readonly IItemSource _primary;
    private readonly IItemSource _fallback;

    public FallbackItemSource(IItemSource primary, IItemSource fallback)
    {
        _primary = primary;
        _fallback = fallback;
    }

    public async Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
    {
        try
        {
            return await _primary.GetItemsAsync(ct);
        }
        catch (HttpRequestException)
        {
            return await _fallback.GetItemsAsync(ct);
        }
    }
}
```

**What's neat about it:** a `FallbackItemSource` *is* an `IItemSource` and also *contains* two of them. This is the **composite/decorator pattern**: building bigger behavior out of small pieces of the same shape. `CatalogService` has no idea it's talking to a fallback chain.

Use it:

```csharp
IItemSource source = new FallbackItemSource(
    primary:  new HttpItemSource(http),
    fallback: new XmlItemSource("sample.xml"));
```

(Naming arguments, `primary:` and `fallback:`, is a readability trick that works for any method call.)

**Test it by sabotage:** point `BaseAddress` at a URL that doesn't exist, or turn off your network. The XML takes over. Note that this version silently swallows the API failure; in a real app you'd also log it, or surface "using offline data" in the UI.

### Step 9: Merging instead of fallback (exercise-level)

Sometimes "API has most, XML fills gaps" is what you actually need: take everything from the API, then add any XML items whose `Id` isn't in the API result. The skeleton, with the interesting part left for you:

```csharp
public class MergingItemSource : IItemSource
{
    private readonly IItemSource _primary;
    private readonly IItemSource _secondary;
    public MergingItemSource(IItemSource primary, IItemSource secondary) { _primary = primary; _secondary = secondary; }

    public async Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
    {
        var main = await _primary.GetItemsAsync(ct);
        var extra = await _secondary.GetItemsAsync(ct);

        // TODO: build a HashSet<int> of ids in 'main', then return main plus any 'extra' not in that set.
        throw new NotImplementedException();
    }
}
```

### Files you should have after this chapter

```
Core/Sources/XmlItemSource.cs            (Ch. 5)
Core/Sources/FallbackItemSource.cs
Core/Sources/Api/ApiItemDto.cs
Core/Sources/Api/JsonFileItemSource.cs
Core/Sources/Api/HttpItemSource.cs
Cli/api-sample.json
```

### Exercises (Chapter 9)

1. Add a `supplier` field to the JSON sample, the DTO, `Item`, and the mapping. Which files change? (Compare with the answers from Ch. 7 and 8.)
2. Finish `MergingItemSource` (hint: `var known = main.Select(i => i.Id).ToHashSet();` and `extra.Where(i => !known.Contains(i.Id))`).
3. Wrap the call in `Program.cs` with a `CancellationTokenSource` that times out after 5 seconds: `using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));` then pass `cts.Token` to `SyncAsync`.
4. Make the API return an array that includes an item with `"title": null`. Confirm the mapping gives `"(unnamed)"` and nothing crashes.

---

## Chapter 10: Stage 7: Unit tests

Tests are how you change code without fear, and they're a superb way to learn what code actually does.

```bash
dotnet new xunit -n CatalogTracker.Tests
dotnet sln add CatalogTracker.Tests
dotnet add CatalogTracker.Tests reference CatalogTracker.Core
dotnet test
```

### 10.1 A parsing test

```csharp
// CatalogTracker.Tests/XmlItemSourceTests.cs
using System.Xml.Linq;
using CatalogTracker.Core.Sources;

namespace CatalogTracker.Tests;

public class XmlItemSourceTests
{
    [Fact]   // marks a test method (like pytest's test_ prefix)
    public void Parse_ReadsBasicFields()
    {
        var xml = """
            <catalog>
              <item id="5" category="tools">
                <name>Saw</name><price>19.95</price><quantity>2</quantity>
              </item>
            </catalog>
            """;

        var items = XmlItemSource.Parse(XDocument.Parse(xml));

        var item = Assert.Single(items);
        Assert.Equal(5, item.Id);
        Assert.Equal("Saw", item.Name);
        Assert.Equal(19.95m, item.Price);
        Assert.Empty(item.Tags);
    }

    [Theory]   // parameterized test (pytest.mark.parametrize)
    [InlineData("<catalog/>", 0)]
    [InlineData("<catalog><item id=\"1\"><name>A</name></item></catalog>", 1)]
    public void Parse_CountsItems(string xml, int expected)
    {
        Assert.Equal(expected, XmlItemSource.Parse(XDocument.Parse(xml)).Count);
    }
}
```

This works *because* in Chapter 5 you separated pure parsing from file I/O.

### 10.2 A service test with fakes

```csharp
// CatalogTracker.Tests/CatalogServiceTests.cs
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;
using CatalogTracker.Core.Services;

namespace CatalogTracker.Tests;

public class CatalogServiceTests
{
    private class FakeSource : IItemSource
    {
        public Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Item>>(new List<Item>
            {
                new() { Id = 1, Name = "A" },
                new() { Id = 2, Name = "B" },
            });
    }

    private class InMemoryStore : IItemStore
    {
        public Dictionary<int, Item> Data { get; } = new();
        public Task InitializeAsync(CancellationToken ct = default) => Task.CompletedTask;
        public Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Item>>(Data.Values.ToList());
        public Task<Item?> GetByIdAsync(int id, CancellationToken ct = default)
            => Task.FromResult(Data.GetValueOrDefault(id));
        public Task UpsertAsync(Item item, CancellationToken ct = default)
        { Data[item.Id] = item; return Task.CompletedTask; }
        public Task UpsertManyAsync(IEnumerable<Item> items, CancellationToken ct = default)
        { foreach (var i in items) Data[i.Id] = i; return Task.CompletedTask; }
        public Task DeleteAsync(int id, CancellationToken ct = default)
        { Data.Remove(id); return Task.CompletedTask; }
    }

    [Fact]
    public async Task SyncAsync_SavesEverythingFromSource()
    {
        var store = new InMemoryStore();
        var service = new CatalogService(store, new FakeSource());

        int count = await service.SyncAsync();

        Assert.Equal(2, count);
        Assert.Equal(2, store.Data.Count);
    }
}
```

No files, no database, no network, runs in milliseconds. That's the payoff of interfaces. (Mocking libraries like Moq/NSubstitute can write fakes for you; hand-written fakes are the best way to learn first.)

Run tests: `dotnet test` or Test Explorer in VS (*Test → Test Explorer*).

### 10.3 Exercises
1. Write a test that parsing an `<item>` with a missing `<price>` gives `Price == 0`.
2. Write a `FallbackItemSource` test using a source that throws `HttpRequestException`.
3. Write a test for `Item.TotalValue`.

---

## Chapter 11: Stage 8: WinUI 3 basics

Time for the UI. First, what is WinUI 3?

- **WinUI 3** is Microsoft's modern native Windows UI framework (part of the **Windows App SDK**).
- You write the screen layout in **XAML**, an XML dialect, and the behavior in **C#**.
- You already know XML, so XAML is mostly *reading*: **an element is a class instance, an attribute is a property.**

```xml
<Button Content="Save" Click="SaveButton_Click" />
```

means exactly the same as

```csharp
var b = new Button { Content = "Save" };
b.Click += SaveButton_Click;
```

We'll prove that last claim in 11.2. Everything in this chapter is built in small steps you run immediately.

### 11.1 Create the project

In Visual Studio: *File → New → Project* → search **"WinUI"** → choose **"Blank App, Packaged (WinUI 3 in Desktop)"**. Name it `CatalogTracker.App` and place it in your solution folder, adding it to the existing solution.

Then:

1. Right-click `CatalogTracker.App` → *Add → Project Reference* → tick `CatalogTracker.Core`.
2. Right-click the project → *Manage NuGet Packages* → install:
   - `CommunityToolkit.Mvvm` (removes MVVM boilerplate, Chapter 12)
   - `Microsoft.Extensions.DependencyInjection` (the DI container, Chapter 13)
3. Right-click `CatalogTracker.App` → *Set as Startup Project*.
4. Press **F5**. A window with a "Click Me" button appears. Click it; the text changes. 🎉

**If it won't build:** open the Visual Studio Installer and confirm the *Windows application development* (WinUI / Windows App SDK) workload is installed. Windows may also ask you to enable **Developer Mode** (Settings → System → For developers). If the build complains about a missing target framework, check that `Core`'s target is compatible (`net10.0` Core + `net10.0-windows...` App is fine; the app can reference the plain library).

### 11.2 Tour of the files, and the "XAML is just C#" experiment

| File | Purpose |
|---|---|
| `App.xaml` / `App.xaml.cs` | App entry. `OnLaunched` creates and shows the first window. (Our composition root in Ch. 13.) |
| `MainWindow.xaml` / `MainWindow.xaml.cs` | The top-level window |
| `Package.appxmanifest` | App identity and capabilities (MSIX packaging) |
| `Assets/` | Icons and images |
| Each `*.xaml` + `*.xaml.cs` pair | One screen: the markup and its **code-behind** |

**A XAML file and its `.xaml.cs` file are two halves of one class.** Open `MainWindow.xaml.cs`:

```csharp
public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
    ...
}
```

`partial class` means "this class is split across files." The other half is **generated by the build** from your XAML. It contains a field for every control with an `x:Name`, and the `InitializeComponent()` method that creates all the controls. **Never delete `InitializeComponent();`** from a constructor: without it, none of your XAML exists at runtime. And the `x:Class="CatalogTracker.App.MainWindow"` at the top of the XAML is what connects the two halves.

**Experiment: build UI with no XAML at all.** In `MainWindow.xaml.cs`, add two lines after `InitializeComponent();`:

```csharp
var button = new Microsoft.UI.Xaml.Controls.Button { Content = "Built in code" };
button.Click += (sender, e) => button.Content = "Clicked!";
Content = button;       // Window.Content = the one element the window displays
```

Run it. The window shows only your code-built button, and clicking it changes the text. XAML is simply a *declarative* way of writing the same object construction, with the extra benefit that VS can preview it and Hot Reload can update it while the app runs. Remove those three lines after trying it.

(`Content = button` replaced the entire XAML content. **A Window can hold exactly one child**, which is why layouts always start with one container such as a `Grid`, `StackPanel` or `Frame`.)

### 11.3 Put a page in the window (the structure you'll use for the whole app)

Instead of putting controls directly in the window, we'll put a **Frame** in it and show **Pages** inside the frame. That makes navigation easy later.

**Step 1: Create a page.** Right-click the project → *Add → New Item → "Blank Page (WinUI 3)"* → name it `PlaygroundPage.xaml`. You get two files: `PlaygroundPage.xaml` and `PlaygroundPage.xaml.cs`.

**Step 2: Make `MainWindow.xaml` host a Frame.** Replace its contents with:

```xml
<Window
    x:Class="CatalogTracker.App.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="Catalog Tracker">

    <Frame x:Name="RootFrame"/>
</Window>
```

**Step 3: Navigate to the page.** `MainWindow.xaml.cs`:

```csharp
using Microsoft.UI.Xaml;

namespace CatalogTracker.App;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        RootFrame.Navigate(typeof(PlaygroundPage));    // swap to MainPage in Chapter 13
    }
}
```

(Remove the template's leftover `myButton_Click` method if the compiler complains that `myButton` doesn't exist; it belonged to the sample button we replaced.)

**Reading it:** `RootFrame` is a field generated from `x:Name="RootFrame"`. `typeof(PlaygroundPage)` is "the class itself" (a `Type` value, like passing the class object in Python); the frame creates an instance of it and shows it.

**Step 4: Make the page say something.** `PlaygroundPage.xaml`:

```xml
<Page
    x:Class="CatalogTracker.App.PlaygroundPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

    <TextBlock Text="Hello from the playground" Margin="24"/>
</Page>
```

**Checkpoint:** F5 shows your text. Now try **Hot Reload**: with the app running, change the text in the XAML, save, and watch the running app update (the 🔥 button in the VS toolbar shows its status).

### 11.4 Layout, one panel at a time

You don't place controls at pixel positions. You nest **layout panels** that arrange their children. Replace the page's `TextBlock` with each of these experiments and run them.

**Experiment A: `StackPanel`**: children in a column (or row):

```xml
<StackPanel Margin="24" Spacing="8">
    <TextBlock Text="One"/>
    <TextBlock Text="Two"/>
    <TextBlock Text="Three"/>
</StackPanel>
```

`Spacing="8"` puts 8 pixels between children. Add `Orientation="Horizontal"` and they sit in a row. A `StackPanel` takes **only as much room as its children need**.

**Experiment B: `Margin` vs `Padding`**:

```xml
<StackPanel Spacing="8">
    <Border Background="LightSteelBlue" Margin="24" Padding="16">
        <TextBlock Text="Margin 24 (outside), Padding 16 (inside)"/>
    </Border>
</StackPanel>
```

**Margin** is space *outside* an element (pushes neighbors away). **Padding** is space *inside* (pushes content in). Values: `"8"` all sides, `"8,4"` horizontal, vertical, `"left,top,right,bottom"`. Memorize this; it's most of what "spacing" problems are.

**Experiment C: alignment**:

```xml
<Grid>
    <Button Content="Top left"      HorizontalAlignment="Left"   VerticalAlignment="Top"/>
    <Button Content="Center"        HorizontalAlignment="Center" VerticalAlignment="Center"/>
    <Button Content="Bottom right"  HorizontalAlignment="Right"  VerticalAlignment="Bottom"/>
</Grid>
```

`HorizontalAlignment`/`VerticalAlignment` take `Left/Center/Right/Stretch` (and `Top/Center/Bottom/Stretch`). `Stretch` (the default for most controls) fills the available space.

**Experiment D: `Grid`**, the workhorse. Rows and columns:

```xml
<Grid Padding="24" RowSpacing="12" ColumnSpacing="16">
    <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>   <!-- as tall as its content -->
        <RowDefinition Height="*"/>      <!-- all remaining height -->
    </Grid.RowDefinitions>
    <Grid.ColumnDefinitions>
        <ColumnDefinition Width="2*"/>   <!-- 2 parts of remaining width -->
        <ColumnDefinition Width="3*"/>   <!-- 3 parts -->
    </Grid.ColumnDefinitions>

    <TextBlock Grid.Row="0" Grid.ColumnSpan="2" Text="Header spans both columns"/>
    <Border    Grid.Row="1" Grid.Column="0" Background="LightSteelBlue"><TextBlock Text="Left"/></Border>
    <Border    Grid.Row="1" Grid.Column="1" Background="LightGoldenrodYellow"><TextBlock Text="Right"/></Border>
</Grid>
```

Reading the sizes: **`Auto`** = fit the content; **`*`** = share the leftover space (`2*` and `3*` split it 2:3); a plain number = fixed pixels. `Grid.Row="1"` is an **attached property**: the child tells its parent where to sit. Resize the window and watch the columns flex.

**Experiment E: `ScrollViewer`** wraps content that might not fit:

```xml
<ScrollViewer>
    <StackPanel Spacing="8"> <!-- lots of children -->
    </StackPanel>
</ScrollViewer>
```

**Rules of thumb:**

- A `Grid` for the overall page structure; `StackPanel`s inside cells for simple runs of controls.
- The fix for 80% of "why is it so small/big" issues: check the parent panel's `Height`/`Width` setting (`Auto` vs `*`) and the child's alignment.
- Avoid fixed `Width`/`Height` on controls where you can; let the layout flow.
- Use the **Live Visual Tree** (Debug → Windows) to see the actual layout of a running app.

### 11.5 Controls tour: build the playground page in stages

We'll build one page that exercises every common control, a few at a time. Replace `PlaygroundPage.xaml` with this starting skeleton:

```xml
<Page
    x:Class="CatalogTracker.App.PlaygroundPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

    <ScrollViewer>
        <StackPanel Padding="24" Spacing="12" MaxWidth="480" HorizontalAlignment="Left">

            <TextBlock Text="Controls playground" Style="{StaticResource TitleTextBlockStyle}"/>

            <!-- STAGE A goes here -->
            <!-- STAGE B goes here -->
            <!-- STAGE C goes here -->
            <!-- STAGE D goes here -->

            <TextBlock x:Name="Output" TextWrapping="Wrap"
                       Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
        </StackPanel>
    </ScrollViewer>
</Page>
```

The `Output` text block at the bottom is where every stage will report what it read. And in `PlaygroundPage.xaml.cs` make sure you have:

```csharp
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace CatalogTracker.App;

public sealed partial class PlaygroundPage : Page
{
    public PlaygroundPage()
    {
        InitializeComponent();
    }

    // handlers will be added here, stage by stage
}
```

#### Stage A: Text and a button (events)

Replace `<!-- STAGE A goes here -->` with:

```xml
<TextBox x:Name="NameBox" Header="Name" PlaceholderText="Type here..."/>
<Button x:Name="HelloButton" Content="Say hello" Click="HelloButton_Click"
        Style="{StaticResource AccentButtonStyle}"/>
```

Add to the code-behind class:

```csharp
    private void HelloButton_Click(object sender, RoutedEventArgs e)
    {
        Output.Text = $"Hello, {NameBox.Text}!";
    }
```

**What to notice:**

- `x:Name="NameBox"` creates a **field called `NameBox`**. That's how code reaches a control.
- `Click="HelloButton_Click"` wires the click event to a method with that exact name in the code-behind. If the names don't match, the build fails.
- Event handler signature is always `(object sender, SomeEventArgs e)`. `sender` is the control that raised it; `e` carries details.
- `TextBox.Text` is the current contents.

**Checkpoint:** type a name, click, see the greeting.

#### Stage B: Choices

Replace `<!-- STAGE B goes here -->` with:

```xml
<CheckBox x:Name="ActiveCheck" Content="Active" IsChecked="True"/>
<ToggleSwitch x:Name="NotifySwitch" Header="Notifications" IsOn="False"/>
<ComboBox x:Name="CategoryCombo" Header="Category" SelectedIndex="0" MinWidth="200">
    <x:String>tools</x:String>
    <x:String>garden</x:String>
    <x:String>kitchen</x:String>
</ComboBox>
<RadioButtons x:Name="SizeRadios" Header="Size" SelectedIndex="0">
    <x:String>Small</x:String>
    <x:String>Large</x:String>
</RadioButtons>
```

Now expand the click handler to read them:

```csharp
    private void HelloButton_Click(object sender, RoutedEventArgs e)
    {
        string category = CategoryCombo.SelectedItem as string ?? "?";
        string size = SizeRadios.SelectedItem as string ?? "?";

        Output.Text =
            $"Hello, {NameBox.Text}! active={ActiveCheck.IsChecked}, " +
            $"notify={NotifySwitch.IsOn}, category={category}, size={size}";
    }
```

**What to notice (the types matter):**

| Control | Property | Type | Note |
|---|---|---|---|
| `TextBox` | `Text` | `string` | |
| `CheckBox` | `IsChecked` | `bool?` | nullable: true / false / null (indeterminate) |
| `ToggleSwitch` | `IsOn` | `bool` | |
| `ComboBox` | `SelectedItem` | `object?` | **cast it**: `as string` returns null if it isn't one |
| `ComboBox` | `SelectedIndex` | `int` | -1 means nothing selected |
| `RadioButtons` | `SelectedItem` | `object?` | same as ComboBox |

`<x:String>` is how XAML says "a plain string" when you put items directly in a list. `as string` is a safe cast (null on failure), versus `(string)x` which throws.

**Checkpoint:** toggle things, click, read the output.

#### Stage C: Numbers, dates, and sliders

Replace `<!-- STAGE C goes here -->` with:

```xml
<NumberBox x:Name="QtyBox" Header="Quantity" Value="1" Minimum="0" Maximum="999"
           SpinButtonPlacementMode="Inline"/>
<Slider x:Name="VolSlider" Header="Volume" Minimum="0" Maximum="100" Value="50"/>
<CalendarDatePicker x:Name="DatePick" Header="Date"/>
```

Append to the output string in the handler (before the semicolon, using another `+`):

```csharp
            + $", qty={QtyBox.Value}, volume={VolSlider.Value}, date={DatePick.Date:d}"
```

**What to notice:**

- `NumberBox.Value` and `Slider.Value` are **`double`**. That's why Chapter 13's `ItemViewModel` stores price/quantity as `double` and converts at the boundary. If the user types nothing in a `NumberBox`, `Value` is `double.NaN`. Guard against it with `double.IsNaN(QtyBox.Value)`.
- `CalendarDatePicker.Date` is a `DateTimeOffset?`, so it's null until the user picks something. `DatePick.Date:d` formats it as a short date; if you need a `DateTime`: `DatePick.Date?.DateTime`.

#### Stage D: Lists, feedback, and busy indicators

Replace `<!-- STAGE D goes here -->` with:

```xml
<ListView x:Name="FruitList" Header="Fruits" Height="140"
          SelectionChanged="FruitList_SelectionChanged">
    <x:String>Apple</x:String>
    <x:String>Banana</x:String>
    <x:String>Cherry</x:String>
</ListView>

<StackPanel Orientation="Horizontal" Spacing="12">
    <Button x:Name="SlowButton" Content="Pretend to work" Click="SlowButton_Click"/>
    <ProgressRing x:Name="Spinner" IsActive="False" Width="24" Height="24"/>
</StackPanel>

<InfoBar x:Name="Info" IsOpen="False" Severity="Success" Title="Done"/>
```

Add these handlers:

```csharp
    private void FruitList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (FruitList.SelectedItem is string fruit)
            Output.Text = $"You picked {fruit}";
    }

    private async void SlowButton_Click(object sender, RoutedEventArgs e)
    {
        SlowButton.IsEnabled = false;
        Spinner.IsActive = true;

        await Task.Delay(2000);               // pretend to do something slow; the UI stays responsive

        Spinner.IsActive = false;
        SlowButton.IsEnabled = true;
        Info.Message = "The slow thing finished.";
        Info.IsOpen = true;
    }
```

**What to notice:**

- `if (FruitList.SelectedItem is string fruit)` is a **pattern match**: "if it's a string, call it `fruit`." It's the compact version of cast-and-check.
- The handler is **`async void`**: allowed *only* for event handlers (the framework needs a `void` signature). Everywhere else use `async Task`.
- After `await Task.Delay(2000)`, execution continues **on the UI thread** automatically, so it's safe to touch controls.
- Disable the button while working, show a spinner, re-enable when done: the standard "busy" pattern, which Chapter 13 automates with bindings.

**Checkpoint:** click "Pretend to work": spinner appears, button disables, 2 seconds later the InfoBar shows. Meanwhile the window stays responsive: try dragging it.

#### 11.5.1 The complete playground page (for reference)

If your page doesn't run, compare against this assembled version.

```xml
<Page
    x:Class="CatalogTracker.App.PlaygroundPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

    <ScrollViewer>
        <StackPanel Padding="24" Spacing="12" MaxWidth="480" HorizontalAlignment="Left">
            <TextBlock Text="Controls playground" Style="{StaticResource TitleTextBlockStyle}"/>

            <TextBox x:Name="NameBox" Header="Name" PlaceholderText="Type here..."/>
            <Button x:Name="HelloButton" Content="Say hello" Click="HelloButton_Click"
                    Style="{StaticResource AccentButtonStyle}"/>

            <CheckBox x:Name="ActiveCheck" Content="Active" IsChecked="True"/>
            <ToggleSwitch x:Name="NotifySwitch" Header="Notifications" IsOn="False"/>
            <ComboBox x:Name="CategoryCombo" Header="Category" SelectedIndex="0" MinWidth="200">
                <x:String>tools</x:String>
                <x:String>garden</x:String>
                <x:String>kitchen</x:String>
            </ComboBox>
            <RadioButtons x:Name="SizeRadios" Header="Size" SelectedIndex="0">
                <x:String>Small</x:String>
                <x:String>Large</x:String>
            </RadioButtons>

            <NumberBox x:Name="QtyBox" Header="Quantity" Value="1" Minimum="0" Maximum="999"
                       SpinButtonPlacementMode="Inline"/>
            <Slider x:Name="VolSlider" Header="Volume" Minimum="0" Maximum="100" Value="50"/>
            <CalendarDatePicker x:Name="DatePick" Header="Date"/>

            <ListView x:Name="FruitList" Header="Fruits" Height="140"
                      SelectionChanged="FruitList_SelectionChanged">
                <x:String>Apple</x:String>
                <x:String>Banana</x:String>
                <x:String>Cherry</x:String>
            </ListView>

            <StackPanel Orientation="Horizontal" Spacing="12">
                <Button x:Name="SlowButton" Content="Pretend to work" Click="SlowButton_Click"/>
                <ProgressRing x:Name="Spinner" IsActive="False" Width="24" Height="24"/>
            </StackPanel>

            <InfoBar x:Name="Info" IsOpen="False" Severity="Success" Title="Done"/>

            <TextBlock x:Name="Output" TextWrapping="Wrap"
                       Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
        </StackPanel>
    </ScrollViewer>
</Page>
```

```csharp
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace CatalogTracker.App;

public sealed partial class PlaygroundPage : Page
{
    public PlaygroundPage()
    {
        InitializeComponent();
    }

    private void HelloButton_Click(object sender, RoutedEventArgs e)
    {
        string category = CategoryCombo.SelectedItem as string ?? "?";
        string size = SizeRadios.SelectedItem as string ?? "?";

        Output.Text =
            $"Hello, {NameBox.Text}! active={ActiveCheck.IsChecked}, " +
            $"notify={NotifySwitch.IsOn}, category={category}, size={size}" +
            $", qty={QtyBox.Value}, volume={VolSlider.Value}, date={DatePick.Date:d}";
    }

    private void FruitList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (FruitList.SelectedItem is string fruit)
            Output.Text = $"You picked {fruit}";
    }

    private async void SlowButton_Click(object sender, RoutedEventArgs e)
    {
        SlowButton.IsEnabled = false;
        Spinner.IsActive = true;
        await Task.Delay(2000);
        Spinner.IsActive = false;
        SlowButton.IsEnabled = true;
        Info.Message = "The slow thing finished.";
        Info.IsOpen = true;
    }
}
```

#### 11.5.2 Why this style gets painful (and what Chapter 12 fixes)

Look at `HelloButton_Click`: it reaches into **six controls** and builds a string. Imagine 30 controls and rules about what's enabled when. Code-behind that talks to controls directly becomes tangled and untestable. Chapter 12's data binding replaces "my code reads and writes controls" with "my code changes data and the screen follows." Keep this page around as a reference for *what the controls are*; you'll rarely write handlers like these again for data.

### 11.6 Resources, styles, themes

WinUI follows the system light/dark theme automatically if you use the built-in resources instead of hard-coding colors:

```xml
<TextBlock Foreground="{ThemeResource TextFillColorSecondaryBrush}" Text="muted text"/>

<Border Background="{ThemeResource CardBackgroundFillColorDefaultBrush}"
        BorderBrush="{ThemeResource CardStrokeColorDefaultBrush}"
        BorderThickness="1" CornerRadius="8" Padding="16">
    <TextBlock Text="A card"/>
</Border>
```

Built-in text styles: `TitleTextBlockStyle`, `SubtitleTextBlockStyle`, `BodyStrongTextBlockStyle`, `CaptionTextBlockStyle`. To make your own reusable style, define it in the page's resources:

```xml
<Page.Resources>
    <Style x:Key="SectionHeader" TargetType="TextBlock" BasedOn="{StaticResource SubtitleTextBlockStyle}">
        <Setter Property="Margin" Value="0,12,0,4"/>
    </Style>
</Page.Resources>
...
<TextBlock Text="Details" Style="{StaticResource SectionHeader}"/>
```

- `x:Key` is the style's name; `BasedOn` starts from an existing one; `Setter`s change properties.
- Put styles used app-wide in `App.xaml` under `<Application.Resources>`; page-only ones in `<Page.Resources>`.
- **`StaticResource`** looks the value up once. **`ThemeResource`** re-looks it up when the theme changes. Use `ThemeResource` for colors so dark mode works.
- Test both themes: Windows Settings → Personalization → Colors → light/dark.

### 11.7 Exercises (Chapter 11)

1. Add a **Clear** button that resets the text box, check box, combo box, and slider (set `NameBox.Text = ""`, `ActiveCheck.IsChecked = false`, `CategoryCombo.SelectedIndex = 0`, etc.).
2. Make the `Output` text red when `QtyBox.Value` is 0: `Output.Foreground = new SolidColorBrush(Microsoft.UI.Colors.Red);`.
3. Build a **login form** layout using a `Grid` with a label column (`Auto`) and an input column (`*`), plus a right-aligned Login button.
4. Use Hot Reload to change spacing and colors while the app runs, and use the **Live Visual Tree** to find which element owns a margin you can't explain.
5. Create a second page, `AboutPage`, and make a button on the playground navigate to it with `Frame.Navigate(typeof(AboutPage));` (every `Page` has a `Frame` property).

---

## Chapter 12: Data binding and MVVM

Code-behind like Chapter 11 gets messy fast: logic tangled with controls, impossible to test. **MVVM** (Model–View–ViewModel) is the standard fix:

| Piece | Role | In our app |
|---|---|---|
| **Model** | Data + domain logic | `Item`, `CatalogService` (Core) |
| **View** | XAML: what it looks like | `MainPage.xaml` |
| **ViewModel** | UI state + commands; no UI controls referenced | `MainViewModel`, `ItemViewModel` |

The glue is **data binding**: the view says "show `ViewModel.StatusText` here", and the framework keeps it updated.

### 12.1 `x:Bind`

```xml
<TextBlock Text="{x:Bind ViewModel.Status, Mode=OneWay}"/>
<TextBox   Text="{x:Bind ViewModel.SearchText, Mode=TwoWay}"/>
```

- Path resolves relative to the **page class itself** (so the page needs a `ViewModel` property).
- **Modes**: `OneTime` (default for `x:Bind`!), `OneWay` (view updates when property changes), `TwoWay` (also writes back). Forgetting `Mode=OneWay` is the #1 "why isn't my UI updating?" cause.
- It's compiled, so typos are build errors and it's fast.
- (There's an older `{Binding}` that uses `DataContext`; you'll see it in older samples. Prefer `x:Bind`.)

### 12.2 `INotifyPropertyChanged`: why plain properties don't update the UI

For a `OneWay` binding to refresh, the object must **raise an event** when a property changes. By hand:

```csharp
public class Person : INotifyPropertyChanged
{
    private string _name = "";
    public string Name
    {
        get => _name;
        set
        {
            if (_name == value) return;
            _name = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Name)));
        }
    }
    public event PropertyChangedEventHandler? PropertyChanged;
}
```

That's 12 lines per property. Nobody writes that by hand, which is why we installed **CommunityToolkit.Mvvm**.

### 12.3 The toolkit: attributes generate the boilerplate

```csharp
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

public partial class Demo : ObservableObject          // 'partial' is REQUIRED
{
    [ObservableProperty]
    private string _name = "";                        // generates a public property "Name"

    [RelayCommand]
    private void Clear() => Name = "";                // generates a property "ClearCommand"

    [RelayCommand]
    private async Task LoadAsync() { await Task.Delay(500); }   // generates "LoadCommand" (async-aware)

    partial void OnNameChanged(string value) { /* runs whenever Name changes */ }
}
```

Rules:
- Field `_name` (or `name`) → property `Name`. **Use the generated `Name` (capital N), not `_name`**, so notifications fire.
- Method `Clear` → `ClearCommand`; `LoadAsync` → `LoadCommand` (the `Async` suffix is dropped).
- `[NotifyPropertyChangedFor(nameof(Other))]` raises change for a dependent computed property.
- `[NotifyCanExecuteChangedFor(nameof(SaveCommand))]` re-evaluates whether a button should be enabled.
- `[RelayCommand(CanExecute = nameof(CanSave))]` ties a command to a `bool CanSave()` method.
- You can see generated code in VS: *Solution Explorer → Dependencies → Analyzers → CommunityToolkit.Mvvm.SourceGenerators*.

Note: in WinUI projects the toolkit's analyzer may show a warning (**MVVMTK0045**) suggesting a newer *partial property* syntax for `[ObservableProperty]`. It's a suggestion about newer language features; the field-based form works fine, and you can ignore the warning while learning.

### 12.4 Lists: `ObservableCollection<T>`

A normal `List<T>` doesn't tell the UI when items are added/removed. `ObservableCollection<T>` does:

```csharp
public ObservableCollection<ItemViewModel> Items { get; } = new();
```

Bind a `ListView` to it, and `Items.Add(...)` immediately appears on screen.

### 12.5 `DataTemplate`: how each row looks

```xml
<ListView ItemsSource="{x:Bind ViewModel.Items}" SelectedItem="{x:Bind ViewModel.Selected, Mode=TwoWay}">
    <ListView.ItemTemplate>
        <DataTemplate x:DataType="vm:ItemViewModel">
            <StackPanel Padding="0,8">
                <TextBlock Text="{x:Bind Name, Mode=OneWay}" Style="{StaticResource BodyStrongTextBlockStyle}"/>
                <TextBlock Text="{x:Bind Category, Mode=OneWay}"
                           Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
            </StackPanel>
        </DataTemplate>
    </ListView.ItemTemplate>
</ListView>
```

`x:DataType` tells the compiler the type of each row (needed for `x:Bind` inside a template). The `vm:` prefix needs a namespace declaration at the top of the XAML: `xmlns:vm="using:CatalogTracker.App.ViewModels"`. This `using:` syntax is how XAML imports a C# namespace.

### 12.6 Formatting in bindings (replacing "converters")

Old XAML needed `IValueConverter` classes to format values. Modern `x:Bind` can call **static methods** directly:

```csharp
// Helpers/Fmt.cs
namespace CatalogTracker.App.Helpers;

public static class Fmt
{
    public static string Money(double d) => d.ToString("C");
    public static string Count(int n) => n == 1 ? "1 item" : $"{n} items";
}
```

```xml
xmlns:h="using:CatalogTracker.App.Helpers"
...
<TextBlock Text="{x:Bind h:Fmt.Money(Price), Mode=OneWay}"/>
```

For visibility from a bool: `Visibility="{x:Bind HasSelection, Mode=OneWay}"` doesn't compile automatically in some contexts; but WinUI 3 x:Bind **does** auto-convert `bool` → `Visibility` for `Visibility` properties. For `IsEnabled`, just bind to the bool directly. If something refuses, a tiny static helper (`Fmt.Show(bool b) => b ? Visibility.Visible : Visibility.Collapsed`) always works.

### 12.7 Exercises (Chapter 12)
1. Make a tiny page: a `TextBox` (TwoWay) bound to `Name`, a `TextBlock` (OneWay) bound to `Greeting => $"Hello, {Name}!"` with `[NotifyPropertyChangedFor(nameof(Greeting))]`.
2. Add a `List<string>` of fruits to the view model as an `ObservableCollection<string>`, with an Add button + TextBox. Watch it update live.
3. Change `Mode=OneWay` to the default on a binding. Observe it stop updating. Now you will recognize the symptom forever.

---

## Chapter 13: The full app: Catalog Tracker UI

Instead of dropping the whole app on you at once, we'll build it in **seven small steps**. After each step you press F5 and see something working. By the end you'll have a searchable list, an editor, sync, import, and delete, and, more importantly, you'll know why each piece exists.

**The big picture first.** Three layers, one job each:

```
 View (MainPage.xaml)  ──binds to──►  ViewModel (MainViewModel)  ──calls──►  Core (CatalogService)
   what it looks like                   what the screen knows/does           the real work
```

The View never touches the database. The ViewModel never touches a control. Core never knows a UI exists.

### Step 0: Put the sample XML where the app can find it

Create `CatalogTracker.App/Data/sample.xml` (copy your sample from Chapter 5). In the Properties window set **Build Action = Content** and **Copy to Output Directory = Copy if newer**, so it's placed next to the exe when the app runs.

Make sure you've done 11.1 and 11.5 from Chapter 11 (project reference to Core, packages `CommunityToolkit.Mvvm` and `Microsoft.Extensions.DependencyInjection`, and `MainWindow` containing a `Frame`).

### Step 1: A page, a ViewModel, DI, and one button

Goal: click a button and see "N items in database" on screen. This single step introduces the three most confusing ideas (DI, ViewModel, command), so we'll go slowly.

#### 1a: The ViewModel

Create a folder `ViewModels` and a class:

```csharp
// ViewModels/MainViewModel.cs
using CatalogTracker.Core.Services;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace CatalogTracker.App.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly CatalogService _catalog;

    public MainViewModel(CatalogService catalog)
    {
        _catalog = catalog;
    }

    [ObservableProperty]
    private string _status = "Ready";

    [RelayCommand]
    private async Task LoadAsync()
    {
        await _catalog.InitializeAsync();
        var items = await _catalog.GetAllAsync();
        Status = $"{items.Count} items in database";
    }
}
```

**How to read this, piece by piece:**

- `partial class ... : ObservableObject`: `ObservableObject` is from the toolkit; it knows how to announce "a property changed" to the UI. `partial` is required because the toolkit's *code generator* adds a second half of this class behind the scenes.
- `public MainViewModel(CatalogService catalog)`: the constructor **asks for** a `CatalogService`. It doesn't create one. Who supplies it? The DI container (step 1c).
- `[ObservableProperty] private string _status = "Ready";`: you write only the **field**. The generator creates a public property `Status` (capital S) that raises the change notification whenever you set it. From now on, in code you must set **`Status`**, not `_status`, or the UI won't update.
- `[RelayCommand] private async Task LoadAsync()`: the generator creates a property `LoadCommand` that a button can bind to. When clicked, it runs your method. (It drops "Async" from the name.)
- `async Task`: the method awaits database work without freezing the UI.

To see what's generated: Solution Explorer → `CatalogTracker.App` → *Dependencies* → *Analyzers* → `CommunityToolkit.Mvvm.SourceGenerators`. You'll see `MainViewModel.g.cs` with the properties written out. Nothing magic, just boilerplate you didn't have to type.

#### 1b: The page

Add a Blank Page named `MainPage.xaml` (*Add → New Item → Blank Page (WinUI 3)*). Replace the contents of the XAML with:

```xml
<Page
    x:Class="CatalogTracker.App.MainPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

    <StackPanel Padding="24" Spacing="12">
        <TextBlock Text="Catalog Tracker" Style="{StaticResource TitleTextBlockStyle}"/>
        <Button Content="Load" Command="{x:Bind ViewModel.LoadCommand}"/>
        <TextBlock Text="{x:Bind ViewModel.Status, Mode=OneWay}"/>
    </StackPanel>
</Page>
```

And the code-behind `MainPage.xaml.cs`:

```csharp
using CatalogTracker.App.ViewModels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI.Xaml.Controls;

namespace CatalogTracker.App;

public sealed partial class MainPage : Page
{
    public MainViewModel ViewModel { get; }

    public MainPage()
    {
        ViewModel = App.Services.GetRequiredService<MainViewModel>();
        InitializeComponent();
    }
}
```

**How to read this:**

- `{x:Bind ViewModel.LoadCommand}` means "look on **this page class** for a property named `ViewModel`, then on it for `LoadCommand`." That's why the page has a `public MainViewModel ViewModel { get; }` property.
- `Mode=OneWay` on the `Status` text means "update the screen whenever `Status` changes." Without it, the text would be set once and never refresh. (Remember this; it's the most common mistake.)
- The **order in the constructor matters**: assign `ViewModel` *before* `InitializeComponent()`, because `InitializeComponent` builds the bindings and they need the ViewModel to exist.
- `App.Services.GetRequiredService<MainViewModel>()`: "container, give me a `MainViewModel`." It builds one, supplying its `CatalogService` automatically.

#### 1c: The composition root: `App.xaml.cs`

Where do the concrete classes get chosen and wired together? In **one** place, the app's startup. Replace the contents of `App.xaml.cs`:

```csharp
using CatalogTracker.App.ViewModels;
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Services;
using CatalogTracker.Core.Sources;
using CatalogTracker.Core.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI.Xaml;

namespace CatalogTracker.App;

public partial class App : Application
{
    public static Window CurrentWindow { get; private set; } = null!;
    public static IServiceProvider Services { get; private set; } = null!;

    public App()
    {
        InitializeComponent();
        Services = ConfigureServices();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        CurrentWindow = new MainWindow();
        CurrentWindow.Activate();
    }

    private static IServiceProvider ConfigureServices()
    {
        string dataDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "CatalogTracker");
        Directory.CreateDirectory(dataDir);

        string dbPath  = Path.Combine(dataDir, "catalog.db");
        string xmlPath = Path.Combine(AppContext.BaseDirectory, "Data", "sample.xml");

        var services = new ServiceCollection();

        services.AddSingleton<IItemStore>(_ => new SqliteItemStore(dbPath));
        services.AddSingleton<IItemSource>(_ => new XmlItemSource(xmlPath));
        services.AddSingleton<CatalogService>();
        services.AddTransient<MainViewModel>();

        return services.BuildServiceProvider();
    }
}
```

(The template's `App.xaml.cs` has a different body and a `m_window` field. Replace it. Keep the `InitializeComponent();` call in the constructor.)

**Walkthrough of the DI part**, since it's the strangest bit for Python people:

- `new ServiceCollection()` is a **registry**: a list of "when someone asks for X, here's how to make it."
- `AddSingleton<IItemStore>(_ => new SqliteItemStore(dbPath))` says: *"When anyone asks for an `IItemStore`, create a `SqliteItemStore` with this path, and reuse the same one forever (singleton)."* The `_ =>` is a lambda that ignores its argument (the container itself).
- `AddSingleton<CatalogService>()` has no factory because the container works it out: it looks at `CatalogService`'s constructor, sees it needs an `IItemStore` and an `IItemSource`, finds those registrations, builds them, and passes them in.
- `AddTransient<MainViewModel>()` means "build a **new** one each time it's requested."
- `BuildServiceProvider()` finishes the registry and gives you a provider; `GetRequiredService<T>()` is how you ask for things.

**The payoff:** to move to the API later, you change **one registration line** here (`IItemSource` → `FallbackItemSource(...)`) and nothing else in the app.

Why `CurrentWindow` instead of `MainWindow`? Because a property called `MainWindow` would make `new MainWindow()` ambiguous and fail to compile.

#### 1d: Show the page, run it

In `MainWindow.xaml.cs`: `RootFrame.Navigate(typeof(MainPage));` (replacing `PlaygroundPage` if you used it).

**Checkpoint:** F5. Click **Load**. The text changes to "0 items in database". If you hit errors, check Chapter 15's table: the usual causes here are `partial` missing, `ViewModel` assigned after `InitializeComponent`, or a missing project reference.

### Step 2: Show the items in a list

Goal: sync sample data in, display it in a `ListView`.

#### 2a: A ViewModel for one row

```csharp
// ViewModels/ItemViewModel.cs
using CatalogTracker.Core.Models;
using CommunityToolkit.Mvvm.ComponentModel;

namespace CatalogTracker.App.ViewModels;

public partial class ItemViewModel : ObservableObject
{
    public int Id { get; set; }

    [ObservableProperty] private string _name = "";
    [ObservableProperty] private string _category = "";

    public static ItemViewModel FromItem(Item item) => new()
    {
        Id = item.Id,
        Name = item.Name,
        Category = item.Category,
    };
}
```

**Why not bind the UI directly to `Item`?** `Item` is an immutable record: the UI can't edit it, and it doesn't announce changes. `ItemViewModel` is a **mutable, observable stand-in** for editing. This split (clean immutable domain object, disposable UI wrapper) is a pattern you'll reuse. We'll add the remaining fields in Step 4.

#### 2b: Add a collection and a Sync command to `MainViewModel`

Add `using System.Collections.ObjectModel;` at the top, then add inside the class:

```csharp
    public ObservableCollection<ItemViewModel> Items { get; } = new();

    [RelayCommand]
    private async Task SyncAsync()
    {
        int n = await _catalog.SyncAsync();
        Status = $"Synced {n} items.";
        await LoadAsync();
    }
```

and change `LoadAsync` so it fills the list:

```csharp
    [RelayCommand]
    private async Task LoadAsync()
    {
        await _catalog.InitializeAsync();
        var items = await _catalog.GetAllAsync();

        Items.Clear();
        foreach (var item in items)
            Items.Add(ItemViewModel.FromItem(item));

        Status = $"{Items.Count} items loaded.";
    }
```

`ObservableCollection<T>` is a list that **notifies the UI** when items are added or removed. A plain `List<T>` wouldn't, and the `ListView` would stay empty or stale.

#### 2c: The list in XAML

Replace the page's `StackPanel` contents with:

```xml
<Page
    x:Class="CatalogTracker.App.MainPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:vm="using:CatalogTracker.App.ViewModels">

    <Grid Padding="24" RowSpacing="12">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <TextBlock Grid.Row="0" Text="Catalog Tracker" Style="{StaticResource TitleTextBlockStyle}"/>

        <StackPanel Grid.Row="1" Orientation="Horizontal" Spacing="8">
            <Button Content="Sync" Command="{x:Bind ViewModel.SyncCommand}"/>
        </StackPanel>

        <ListView Grid.Row="2" ItemsSource="{x:Bind ViewModel.Items}">
            <ListView.ItemTemplate>
                <DataTemplate x:DataType="vm:ItemViewModel">
                    <StackPanel Padding="0,8">
                        <TextBlock Text="{x:Bind Name, Mode=OneWay}"
                                   Style="{StaticResource BodyStrongTextBlockStyle}"/>
                        <TextBlock Text="{x:Bind Category, Mode=OneWay}"
                                   Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
                    </StackPanel>
                </DataTemplate>
            </ListView.ItemTemplate>
        </ListView>

        <TextBlock Grid.Row="3" Text="{x:Bind ViewModel.Status, Mode=OneWay}"/>
    </Grid>
</Page>
```

**How to read the new XAML:**

- `xmlns:vm="using:CatalogTracker.App.ViewModels"` imports a C# namespace into XAML under the prefix `vm`. Now `vm:ItemViewModel` means that class.
- `Grid.Row="2"` places an element in row 2 of the surrounding grid. Row heights: `Auto` (as tall as the content), `*` (all remaining space): so the list fills the middle.
- `ItemsSource="{x:Bind ViewModel.Items}"` gives the `ListView` its data.
- A **`DataTemplate`** describes how *one row* looks. `x:DataType="vm:ItemViewModel"` tells the compiler what type each row is, so `{x:Bind Name}` inside the template is checked at build time against `ItemViewModel.Name`.

**Checkpoint:** F5 → click **Sync** → Hammer, Screwdriver Set, Watering Can appear. Close and reopen the app: they're still there (they were saved to SQLite; the app starts empty only until `LoadCommand` runs, so see 2d).

#### 2d: Load automatically when the page appears

In `MainPage`'s constructor, after `InitializeComponent();`:

```csharp
        Loaded += async (_, _) => await ViewModel.LoadCommand.ExecuteAsync(null);
```

`Loaded` is an event fired when the page is on screen. `+=` subscribes a handler, and `(_, _) =>` is a lambda ignoring both parameters (sender and event args). `ExecuteAsync(null)` runs the command from code and lets you `await` it.

**Checkpoint:** restart the app: the list is already filled.

### Step 3: A busy spinner and error handling

Right now if the database throws, the app crashes, and a long operation gives no feedback. Add one reusable wrapper to `MainViewModel`:

```csharp
    [ObservableProperty] private bool _isBusy;

    private async Task RunBusyAsync(Func<Task> work)
    {
        IsBusy = true;
        try { await work(); }
        catch (Exception ex) { Status = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }
```

**How to read it:** `Func<Task> work` is "a function that takes nothing and returns a `Task`", so you can pass a lambda block in. `try/catch/finally` ensures the spinner turns off no matter what. This is the **don't repeat yourself** principle: instead of copy-pasting `IsBusy = true ... finally ...` into every command, you write it once.

Use it in the commands, wrapping the work:

```csharp
    [RelayCommand]
    private async Task LoadAsync()
    {
        await RunBusyAsync(async () =>
        {
            await _catalog.InitializeAsync();
            var items = await _catalog.GetAllAsync();
            Items.Clear();
            foreach (var item in items)
                Items.Add(ItemViewModel.FromItem(item));
            Status = $"{Items.Count} items loaded.";
        });
    }

    [RelayCommand]
    private async Task SyncAsync()
    {
        await RunBusyAsync(async () =>
        {
            int n = await _catalog.SyncAsync();
            Status = $"Synced {n} items.";
        });
        await LoadAsync();
    }
```

In the toolbar `StackPanel` add the spinner beside the button:

```xml
<ProgressRing IsActive="{x:Bind ViewModel.IsBusy, Mode=OneWay}" Width="24" Height="24"/>
```

**Checkpoint:** to test errors, temporarily point `xmlPath` at a nonexistent file in `App.xaml.cs` and click Sync. The status bar shows the error and the app survives. Put the path back.

### Step 4: Select an item and edit it

This is where **two-way binding** shows its value.

#### 4a: Extend `ItemViewModel` with all fields and a way back to `Item`

Replace `ItemViewModel` with:

```csharp
public partial class ItemViewModel : ObservableObject
{
    public int Id { get; set; }

    [ObservableProperty] private string _name = "";
    [ObservableProperty] private string _category = "";
    [ObservableProperty] private double _price;       // double: NumberBox.Value is a double
    [ObservableProperty] private double _quantity;
    [ObservableProperty] private string _tagsText = "";

    public static ItemViewModel FromItem(Item item) => new()
    {
        Id = item.Id,
        Name = item.Name,
        Category = item.Category,
        Price = (double)item.Price,
        Quantity = item.Quantity,
        TagsText = string.Join(", ", item.Tags),
    };

    public Item ToItem() => new()
    {
        Id = Id,
        Name = Name.Trim(),
        Category = Category.Trim(),
        Price = Math.Round((decimal)Price, 2),       // convert at the boundary
        Quantity = (int)Quantity,
        Updated = DateTime.Now,
        Tags = TagsText
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList(),
    };
}
```

**Design point:** the UI side uses `double` because WinUI's `NumberBox` produces doubles, while the domain uses `decimal` for money. The conversion happens in exactly two places, `FromItem` and `ToItem`, the boundary. Don't spread conversions around.

`FromItem` turns the domain object into a UI-friendly one; `ToItem` goes the other way when saving.

#### 4b: Selection state and a Save command in `MainViewModel`

```csharp
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(HasSelection))]
    [NotifyCanExecuteChangedFor(nameof(SaveCommand))]
    private ItemViewModel? _selected;

    public bool HasSelection => Selected is not null;

    [RelayCommand(CanExecute = nameof(HasSelection))]
    private async Task SaveAsync()
    {
        if (Selected is null) return;
        await RunBusyAsync(async () =>
        {
            await _catalog.SaveAsync(Selected.ToItem());
            Status = $"Saved '{Selected.Name}'.";
        });
    }
```

**Reading the attributes:**

- `ItemViewModel? _selected`: nullable, because nothing may be selected.
- `HasSelection` is a **computed property**, with no storage, derived from `Selected`. Because it depends on `Selected`, `[NotifyPropertyChangedFor(nameof(HasSelection))]` tells the toolkit: "when `Selected` changes, also announce that `HasSelection` changed," so the UI re-checks it.
- `[RelayCommand(CanExecute = nameof(HasSelection))]` ties the command's "is this button enabled?" to `HasSelection`. `[NotifyCanExecuteChangedFor(nameof(SaveCommand))]` re-evaluates it whenever `Selected` changes. Result: the **Save button is automatically disabled when nothing is selected**, with no manual enabling/disabling code.
- `nameof(X)` produces the string `"X"` but checked by the compiler: if you rename `X`, it updates.

#### 4c: The editor form

Update the page: change the grid to have two columns, put the list in the left one, and add the editor on the right. Replace the page body with:

```xml
    <Grid Padding="24" RowSpacing="12" ColumnSpacing="24">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="2*" MinWidth="260"/>
            <ColumnDefinition Width="3*"/>
        </Grid.ColumnDefinitions>

        <TextBlock Grid.Row="0" Grid.ColumnSpan="2" Text="Catalog Tracker"
                   Style="{StaticResource TitleTextBlockStyle}"/>

        <StackPanel Grid.Row="1" Grid.ColumnSpan="2" Orientation="Horizontal" Spacing="8">
            <Button Content="Sync" Command="{x:Bind ViewModel.SyncCommand}"/>
            <ProgressRing IsActive="{x:Bind ViewModel.IsBusy, Mode=OneWay}" Width="24" Height="24"/>
        </StackPanel>

        <ListView Grid.Row="2" Grid.Column="0"
                  ItemsSource="{x:Bind ViewModel.Items}"
                  SelectedItem="{x:Bind ViewModel.Selected, Mode=TwoWay}">
            <ListView.ItemTemplate>
                <DataTemplate x:DataType="vm:ItemViewModel">
                    <StackPanel Padding="0,8">
                        <TextBlock Text="{x:Bind Name, Mode=OneWay}"
                                   Style="{StaticResource BodyStrongTextBlockStyle}"/>
                        <TextBlock Text="{x:Bind Category, Mode=OneWay}"
                                   Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
                    </StackPanel>
                </DataTemplate>
            </ListView.ItemTemplate>
        </ListView>

        <Border Grid.Row="2" Grid.Column="1" Padding="16" CornerRadius="8" BorderThickness="1"
                Background="{ThemeResource CardBackgroundFillColorDefaultBrush}"
                BorderBrush="{ThemeResource CardStrokeColorDefaultBrush}">
            <StackPanel Spacing="12" IsEnabled="{x:Bind ViewModel.HasSelection, Mode=OneWay}">
                <TextBlock Text="Details" Style="{StaticResource SubtitleTextBlockStyle}"/>
                <TextBox Header="Name"
                         Text="{x:Bind ViewModel.Selected.Name, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}"/>
                <TextBox Header="Category"
                         Text="{x:Bind ViewModel.Selected.Category, Mode=TwoWay}"/>
                <NumberBox Header="Price" Minimum="0" SpinButtonPlacementMode="Inline" SmallChange="0.5"
                           Value="{x:Bind ViewModel.Selected.Price, Mode=TwoWay}"/>
                <NumberBox Header="Quantity" Minimum="0" SpinButtonPlacementMode="Inline"
                           Value="{x:Bind ViewModel.Selected.Quantity, Mode=TwoWay}"/>
                <TextBox Header="Tags (comma separated)"
                         Text="{x:Bind ViewModel.Selected.TagsText, Mode=TwoWay}"/>
                <Button Content="Save" Command="{x:Bind ViewModel.SaveCommand}"
                        Style="{StaticResource AccentButtonStyle}"/>
            </StackPanel>
        </Border>

        <TextBlock Grid.Row="3" Grid.ColumnSpan="2" Text="{x:Bind ViewModel.Status, Mode=OneWay}"
                   Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
    </Grid>
```

**What `TwoWay` does here:** `SelectedItem="{x:Bind ViewModel.Selected, Mode=TwoWay}"`: clicking a row **writes** the chosen `ItemViewModel` into `ViewModel.Selected`. The form fields bind to `ViewModel.Selected.Name`, etc. Typing in a field writes back into the `ItemViewModel`, which in turn updates the list row's text (because the row's `Name` is `OneWay`-bound to the same object). Type in the Name box and watch the list change live: no code you wrote does that, only bindings.

`UpdateSourceTrigger=PropertyChanged` means "write back on every keystroke" instead of only when the box loses focus.

**Checkpoint:** select an item, edit its price, click **Save**, close and reopen the app: the change persisted. Also note the form is disabled and Save is greyed out when nothing is selected.

### Step 5: Search

A text box that filters the list as you type. First, change how `MainViewModel` holds data: keep a **master list** and let `Items` be a filtered view of it.

Add fields/properties:

```csharp
    private List<ItemViewModel> _all = new();

    [ObservableProperty] private string _searchText = "";

    partial void OnSearchTextChanged(string value) => ApplyFilter();
```

Add the filter method:

```csharp
    private void ApplyFilter()
    {
        var keepId = Selected?.Id;
        var q = SearchText.Trim();

        var filtered = _all
            .Where(i => q.Length == 0
                     || i.Name.Contains(q, StringComparison.OrdinalIgnoreCase)
                     || i.Category.Contains(q, StringComparison.OrdinalIgnoreCase))
            .OrderBy(i => i.Name)
            .ToList();

        Items.Clear();
        foreach (var i in filtered)
            Items.Add(i);

        Selected = Items.FirstOrDefault(i => i.Id == keepId);
    }
```

Change `LoadAsync` so that it fills `_all` and then calls `ApplyFilter()`:

```csharp
            var items = await _catalog.GetAllAsync();
            _all = items.Select(ItemViewModel.FromItem).ToList();
            ApplyFilter();
            Status = $"{_all.Count} items loaded.";
```

**Reading it:**

- `partial void OnSearchTextChanged(string value)` is a **hook** the generator provides: for every `[ObservableProperty]` called `Foo` you can write `OnFooChanged`, and it runs automatically after each change. So typing in the search box → `SearchText` changes → `ApplyFilter()` runs.
- `_all.Where(...).OrderBy(...).ToList()` is your LINQ from Chapter 2, doing the job of a list comprehension with a condition.
- `StringComparison.OrdinalIgnoreCase` makes `Contains` case-insensitive.
- `Selected = Items.FirstOrDefault(...)` tries to keep the same item selected after filtering, or `null` if it's been filtered out.

Add the box above the list. Put the `ListView` and a `TextBox` in a nested grid, or simply a `StackPanel`; the simplest edit is to add a row. Replace the `ListView` element from 4c with:

```xml
        <Grid Grid.Row="2" Grid.Column="0" RowSpacing="8">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="*"/>
            </Grid.RowDefinitions>

            <TextBox Grid.Row="0" PlaceholderText="Search name or category…"
                     Text="{x:Bind ViewModel.SearchText, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}"/>

            <ListView Grid.Row="1"
                      ItemsSource="{x:Bind ViewModel.Items}"
                      SelectedItem="{x:Bind ViewModel.Selected, Mode=TwoWay}">
                <!-- the same ItemTemplate as before -->
            </ListView>
        </Grid>
```

(Keep the `ListView.ItemTemplate` block exactly as before inside the new `ListView`.)

**Checkpoint:** type "ham" → only the Hammer remains; clear it → all return.

### Step 6: New and Delete (with a confirmation dialog)

#### 6a: Commands in the ViewModel

```csharp
    [RelayCommand]
    private void New()
    {
        int nextId = _all.Count == 0 ? 1 : _all.Max(i => i.Id) + 1;
        var vm = new ItemViewModel { Id = nextId, Name = "New item" };
        _all.Add(vm);
        ApplyFilter();
        Selected = vm;
        Status = "New item (not saved yet). Fill it in and click Save.";
    }

    [RelayCommand(CanExecute = nameof(HasSelection))]
    private async Task DeleteAsync()
    {
        if (Selected is null) return;
        var doomed = Selected;
        await RunBusyAsync(async () =>
        {
            await _catalog.DeleteAsync(doomed.Id);
            _all.Remove(doomed);
            ApplyFilter();
            Status = $"Deleted '{doomed.Name}'.";
        });
    }
```

Add `[NotifyCanExecuteChangedFor(nameof(DeleteCommand))]` above `_selected` next to the existing one so the Delete button enables/disables with selection.

Note `New()` isn't `async`: it only touches memory, and the item is saved only when the user clicks Save. Also: the **ViewModel doesn't ask "are you sure?"**. That's UI, so it lives in the page.

#### 6b: Buttons and a confirmation dialog

In the toolbar add: `<Button Content="New" Command="{x:Bind ViewModel.NewCommand}"/>`. Under the Save button in the editor, add:

```xml
<Button Content="Delete…" Click="DeleteButton_Click"/>
```

(Wrap Save and Delete in a horizontal `StackPanel Spacing="8"` so they sit side by side.)

In `MainPage.xaml.cs` add `using Microsoft.UI.Xaml;` (for `RoutedEventArgs`) and the handler:

```csharp
    private async void DeleteButton_Click(object sender, RoutedEventArgs e)
    {
        if (ViewModel.Selected is null) return;

        var dialog = new ContentDialog
        {
            Title = "Delete item?",
            Content = $"'{ViewModel.Selected.Name}' will be removed from the database.",
            PrimaryButtonText = "Delete",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = XamlRoot,
        };

        if (await dialog.ShowAsync() == ContentDialogResult.Primary)
            await ViewModel.DeleteCommand.ExecuteAsync(null);
    }
```

**Why code-behind here?** Dialogs are pure UI. The ViewModel should never reference a `ContentDialog` (that would break the layering and make it untestable). The page asks the user, then calls the ViewModel command. `XamlRoot = XamlRoot` is **required**: without it the dialog throws, because it doesn't know which window to appear in.

**Checkpoint:** New → type a name → Save → it persists. Delete → dialog → confirm → gone; Cancel keeps it.

### Step 7: Import an XML file from disk

#### 7a: ViewModel command

```csharp
    [RelayCommand]
    private async Task ImportXmlAsync(string path)
    {
        await RunBusyAsync(async () =>
        {
            int n = await _catalog.ImportAsync(new XmlItemSource(path));
            Status = $"Imported {n} items from {Path.GetFileName(path)}.";
        });
        await LoadAsync();
    }
```

(Add `using CatalogTracker.Core.Sources;` at the top.)

Notice we create `new XmlItemSource(path)` here instead of injecting it. That's a deliberate trade-off: the user picks the file at runtime, so there's nothing for DI to pre-wire, and `XmlItemSource` is a simple parser with no external dependencies. **Not everything needs to go through DI**: use it where you need to swap or fake something.

This command takes a `string path` parameter; the toolkit generates `ImportXmlCommand` that accepts one.

#### 7b: Picker in the page

Add a toolbar button `<Button Content="Import XML…" Click="ImportButton_Click"/>` and in `MainPage.xaml.cs` add `using Windows.Storage;` and `using Windows.Storage.Pickers;`, then:

```csharp
    private async void ImportButton_Click(object sender, RoutedEventArgs e)
    {
        var picker = new FileOpenPicker();
        picker.FileTypeFilter.Add(".xml");

        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
        WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);

        StorageFile? file = await picker.PickSingleFileAsync();
        if (file is null) return;

        await ViewModel.ImportXmlCommand.ExecuteAsync(file.Path);
    }
```

**Why the two `hwnd` lines?** Desktop WinUI 3 apps need to tell the picker which window owns it. Forgetting them gives a cryptic exception. Copy those lines every time you use a picker.

`if (file is null) return;`: if the user pressed Cancel, `file` is `null`, and we stop quietly.

**Checkpoint:** click Import XML… and pick your `sample.xml` (or any XML in the same format). New rows appear; the status bar says how many.

### 13.8 Complete listings (for reference)

If something isn't working, compare to these. They're the final assembled versions of what you built step by step.

**`MainViewModel.cs`**

```csharp
using System.Collections.ObjectModel;
using CatalogTracker.Core.Services;
using CatalogTracker.Core.Sources;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace CatalogTracker.App.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly CatalogService _catalog;
    private List<ItemViewModel> _all = new();

    public MainViewModel(CatalogService catalog) => _catalog = catalog;

    public ObservableCollection<ItemViewModel> Items { get; } = new();

    [ObservableProperty] private string _searchText = "";
    [ObservableProperty] private string _status = "Ready";
    [ObservableProperty] private bool _isBusy;

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(HasSelection))]
    [NotifyCanExecuteChangedFor(nameof(SaveCommand))]
    [NotifyCanExecuteChangedFor(nameof(DeleteCommand))]
    private ItemViewModel? _selected;

    public bool HasSelection => Selected is not null;

    partial void OnSearchTextChanged(string value) => ApplyFilter();

    [RelayCommand]
    private async Task LoadAsync()
    {
        await RunBusyAsync(async () =>
        {
            await _catalog.InitializeAsync();
            var items = await _catalog.GetAllAsync();
            _all = items.Select(ItemViewModel.FromItem).ToList();
            ApplyFilter();
            Status = $"{_all.Count} items loaded.";
        });
    }

    [RelayCommand]
    private async Task SyncAsync()
    {
        await RunBusyAsync(async () =>
        {
            int n = await _catalog.SyncAsync();
            Status = $"Synced {n} items.";
        });
        await LoadAsync();
    }

    [RelayCommand]
    private async Task ImportXmlAsync(string path)
    {
        await RunBusyAsync(async () =>
        {
            int n = await _catalog.ImportAsync(new XmlItemSource(path));
            Status = $"Imported {n} items from {Path.GetFileName(path)}.";
        });
        await LoadAsync();
    }

    [RelayCommand]
    private void New()
    {
        int nextId = _all.Count == 0 ? 1 : _all.Max(i => i.Id) + 1;
        var vm = new ItemViewModel { Id = nextId, Name = "New item" };
        _all.Add(vm);
        ApplyFilter();
        Selected = vm;
        Status = "New item (not saved yet). Fill it in and click Save.";
    }

    [RelayCommand(CanExecute = nameof(HasSelection))]
    private async Task SaveAsync()
    {
        if (Selected is null) return;
        await RunBusyAsync(async () =>
        {
            await _catalog.SaveAsync(Selected.ToItem());
            Status = $"Saved '{Selected.Name}'.";
        });
    }

    [RelayCommand(CanExecute = nameof(HasSelection))]
    private async Task DeleteAsync()
    {
        if (Selected is null) return;
        var doomed = Selected;
        await RunBusyAsync(async () =>
        {
            await _catalog.DeleteAsync(doomed.Id);
            _all.Remove(doomed);
            ApplyFilter();
            Status = $"Deleted '{doomed.Name}'.";
        });
    }

    private void ApplyFilter()
    {
        var keepId = Selected?.Id;
        var q = SearchText.Trim();

        var filtered = _all
            .Where(i => q.Length == 0
                     || i.Name.Contains(q, StringComparison.OrdinalIgnoreCase)
                     || i.Category.Contains(q, StringComparison.OrdinalIgnoreCase))
            .OrderBy(i => i.Name)
            .ToList();

        Items.Clear();
        foreach (var i in filtered) Items.Add(i);

        Selected = Items.FirstOrDefault(i => i.Id == keepId);
    }

    private async Task RunBusyAsync(Func<Task> work)
    {
        IsBusy = true;
        try { await work(); }
        catch (Exception ex) { Status = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }
}
```

**`MainPage.xaml.cs`** (everything the code-behind does):

```csharp
using CatalogTracker.App.ViewModels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Windows.Storage;
using Windows.Storage.Pickers;

namespace CatalogTracker.App;

public sealed partial class MainPage : Page
{
    public MainViewModel ViewModel { get; }

    public MainPage()
    {
        ViewModel = App.Services.GetRequiredService<MainViewModel>();
        InitializeComponent();
        Loaded += async (_, _) => await ViewModel.LoadCommand.ExecuteAsync(null);
    }

    private async void ImportButton_Click(object sender, RoutedEventArgs e) { /* Step 7b */ }
    private async void DeleteButton_Click(object sender, RoutedEventArgs e) { /* Step 6b */ }
}
```

The final XAML is the 4c layout plus the search grid from Step 5, the `New`/`Import XML…` toolbar buttons, and the Delete button beside Save.

### 13.9 What to take away

- **Binding does the wiring:** you changed properties in the ViewModel and the screen followed. You never wrote "set this label's text."
- **Commands are just methods** exposed to buttons, with `CanExecute` controlling whether they're enabled.
- **DI is just "someone else hands me my dependencies,"** with all the choosing done in one startup file.
- **Layers kept things testable:** nothing in `MainViewModel` mentions a control, so you could write a unit test for `ApplyFilter` with a fake `CatalogService`.

### Exercises (Chapter 13)

1. Add a "Low stock only" `CheckBox` that filters `Items` (add `[ObservableProperty] private bool _lowStockOnly;` and call `ApplyFilter()` from `OnLowStockOnlyChanged`; include `i.Quantity < 5` in the filter).
2. Show a total inventory value in the status bar after a load (`_all.Sum(i => (decimal)i.Price * (decimal)i.Quantity)`), formatted with `:C`.
3. Show the price in each list row, formatted with the `Fmt.Money` static helper from Chapter 12.6.
4. Swap the store registration to `EfItemStore`. Does the app behave the same? (It should. Why?)
5. Change the Sync source to `JsonFileItemSource` (copy `api-sample.json` to the App's `Data` folder first).
6. Add an unsaved-changes indicator: a `[ObservableProperty] private bool _isDirty;` on `ItemViewModel`, set to `true` in an `OnNameChanged` hook, shown as an asterisk in the list. (Hint: `partial void OnNameChanged(string value) => IsDirty = true;`.)

---

## Chapter 14: More UI skills

The Catalog Tracker works. This chapter adds the skills that make an app feel finished (navigation, dialogs, file pickers, background work, remembered settings) and, importantly, teaches you what can go wrong with each. Everything is built in small runnable steps.

### 14.1 Navigation: multiple pages

**What you're building:** a left-hand menu (Catalog, Reports, Settings) where each entry swaps the page shown on the right.

#### Step 1: Create the extra pages

Add two Blank Pages: `ReportsPage.xaml` and `SettingsPage.xaml`. Give each some obvious content so you can tell them apart. For `ReportsPage.xaml`:

```xml
<Page
    x:Class="CatalogTracker.App.ReportsPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

    <StackPanel Padding="24" Spacing="12">
        <TextBlock Text="Reports" Style="{StaticResource TitleTextBlockStyle}"/>
        <TextBlock x:Name="Message" Text="Nothing selected yet."/>
    </StackPanel>
</Page>
```

and the same shape for `SettingsPage.xaml` with `x:Class="CatalogTracker.App.SettingsPage"` and a title of "Settings".

#### Step 2: Put a `NavigationView` in the window

Replace the contents of `MainWindow.xaml`:

```xml
<Window
    x:Class="CatalogTracker.App.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="Catalog Tracker">

    <NavigationView x:Name="Nav"
                    IsBackButtonVisible="Collapsed"
                    PaneDisplayMode="Left"
                    SelectionChanged="Nav_SelectionChanged">
        <NavigationView.MenuItems>
            <NavigationViewItem Content="Catalog" Tag="catalog" Icon="List"/>
            <NavigationViewItem Content="Reports" Tag="reports" Icon="Document"/>
        </NavigationView.MenuItems>

        <Frame x:Name="ContentFrame"/>
    </NavigationView>
</Window>
```

**How to read it:**

- `NavigationView` is the standard Windows side menu. `MenuItems` are the entries; the built-in **Settings** gear item appears automatically at the bottom.
- `Tag="catalog"` is an arbitrary label you attach to each entry so your code can tell which was clicked.
- `Icon="List"` names a built-in symbol.
- The `Frame` inside is the content area, just like `RootFrame` before. (Remember: a `Window` has one child. `NavigationView` is that child, and the frame is *its* child.)

#### Step 3: React to selection

`MainWindow.xaml.cs`:

```csharp
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace CatalogTracker.App;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Nav.SelectedItem = Nav.MenuItems[0];        // start on the first entry
    }

    private void Nav_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
    {
        if (args.IsSettingsSelected)
        {
            ContentFrame.Navigate(typeof(SettingsPage));
            return;
        }

        string? tag = (args.SelectedItem as NavigationViewItem)?.Tag as string;
        switch (tag)
        {
            case "catalog": ContentFrame.Navigate(typeof(MainPage));    break;
            case "reports": ContentFrame.Navigate(typeof(ReportsPage)); break;
        }
    }
}
```

**Reading `Nav_SelectionChanged`:**

1. The built-in Settings entry isn't one of our `MenuItems`, so it's signaled separately by `args.IsSettingsSelected`.
2. Otherwise `args.SelectedItem` is the clicked entry as a plain `object`. We cast it (`as NavigationViewItem`), read its `Tag` (also an `object`, so `as string`), and the `?.` chain returns `null` if anything is missing.
3. A `switch` on the tag decides which page type to navigate to.
4. `Nav.SelectedItem = Nav.MenuItems[0];` in the constructor selects the first entry, which *triggers* `SelectionChanged`, which navigates to `MainPage`.

**Checkpoint:** run. Clicking the menu entries swaps pages. If the window is blank at startup, check that the `SelectedItem` line is **after** `InitializeComponent()`.

#### Step 4: What the frame does with pages

Each `Navigate` call creates a **brand-new instance** of the page (and, through our DI registration `AddTransient<MainViewModel>`, a new ViewModel). So switching away from Catalog and back **loses the selection and search text**, and reloads from the database. That's correct and simple. If you want a page to survive navigation, set `NavigationCacheMode="Required"` on the `<Page>` element. Know the trade-off: cached pages hold memory, and a stale page may show old data.

#### Step 5: Pass data to a page

Navigate with a parameter:

```csharp
ContentFrame.Navigate(typeof(ReportsPage), "Hammer");
```

Receive it in the destination page by overriding `OnNavigatedTo`. In `ReportsPage.xaml.cs`:

```csharp
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;

namespace CatalogTracker.App;

public sealed partial class ReportsPage : Page
{
    public ReportsPage()
    {
        InitializeComponent();
    }

    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        Message.Text = e.Parameter is string name
            ? $"You asked about: {name}"
            : "Nothing selected yet.";
    }
}
```

`override` replaces a method from the base class; `base.OnNavigatedTo(e)` runs the original too (don't forget it). `e.Parameter` is an `object?`, so test its type with `is string name`. For real data, pass a simple id and look the details up in the destination, rather than passing big objects around.

### 14.2 Dialogs and messages

Four tools, each with a purpose:

| Tool | Use for | Blocks the user? |
|---|---|---|
| `ContentDialog` | confirmations, small forms | yes (modal) |
| `InfoBar` | inline success/warning/error messages | no |
| `TeachingTip` | contextual hints | no |
| Status text/`TextBlock` | passive progress info | no |

#### Step 1: A message dialog

In `PlaygroundPage` (or anywhere with a `XamlRoot`), a button handler:

```csharp
private async void MessageButton_Click(object sender, RoutedEventArgs e)
{
    var dialog = new ContentDialog
    {
        Title = "Heads up",
        Content = "This is a simple message.",
        CloseButtonText = "OK",
        XamlRoot = XamlRoot,
    };
    await dialog.ShowAsync();
}
```

`XamlRoot = XamlRoot` (the dialog's property set to the page's property) is **mandatory**. Without it the dialog throws, because it doesn't know which window to appear in.

#### Step 2: A confirmation that returns an answer

```csharp
var dialog = new ContentDialog
{
    Title = "Delete everything?",
    Content = "This can't be undone.",
    PrimaryButtonText = "Delete",
    CloseButtonText = "Cancel",
    DefaultButton = ContentDialogButton.Close,     // safest button is the default
    XamlRoot = XamlRoot,
};

ContentDialogResult result = await dialog.ShowAsync();
if (result == ContentDialogResult.Primary)
{
    // user clicked Delete
}
```

`ShowAsync()` returns *which button was pressed*: `Primary`, `Secondary`, or `None` (Cancel/close). Making the destructive action the *non*-default button is a good UX habit.

#### Step 3: A dialog with a small form

```csharp
var nameBox = new TextBox { PlaceholderText = "Category name" };
var dialog = new ContentDialog
{
    Title = "New category",
    Content = nameBox,                  // any control can be the content
    PrimaryButtonText = "Add",
    CloseButtonText = "Cancel",
    XamlRoot = XamlRoot,
};
if (await dialog.ShowAsync() == ContentDialogResult.Primary)
{
    string name = nameBox.Text.Trim();
    // use it...
}
```

For anything bigger than a field or two, build a real page instead.

#### Step 4: One rule that causes a classic crash

**Only one `ContentDialog` can be open at a time in a window.** If you call `ShowAsync()` while another is open, you get an exception. This bites when an async operation finishes and tries to show an error dialog while a confirmation dialog is still up. Keep dialogs rare and deliberate; prefer `InfoBar` for non-blocking messages.

#### Step 5: Don't repeat yourself: a helper

You've now written the same dialog code three times. Extract it. Create `Helpers/Dialogs.cs`:

```csharp
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace CatalogTracker.App.Helpers;

public static class Dialogs
{
    public static async Task<bool> ConfirmAsync(
        XamlRoot root, string title, string message, string confirmText = "OK")
    {
        var dialog = new ContentDialog
        {
            Title = title,
            Content = message,
            PrimaryButtonText = confirmText,
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = root,
        };
        return await dialog.ShowAsync() == ContentDialogResult.Primary;
    }

    public static async Task ShowAsync(XamlRoot root, string title, string message)
    {
        var dialog = new ContentDialog
        {
            Title = title, Content = message, CloseButtonText = "OK", XamlRoot = root,
        };
        await dialog.ShowAsync();
    }
}
```

Usage (this replaces the delete handler in Chapter 13's `MainPage`):

```csharp
private async void DeleteButton_Click(object sender, RoutedEventArgs e)
{
    if (ViewModel.Selected is null) return;

    bool yes = await Dialogs.ConfirmAsync(
        XamlRoot, "Delete item?", $"'{ViewModel.Selected.Name}' will be removed.", "Delete");

    if (yes)
        await ViewModel.DeleteCommand.ExecuteAsync(null);
}
```

(`using CatalogTracker.App.Helpers;` at the top.) `static class` = a bag of functions that needs no instance, Python's "module of helpers."

#### Step 6: Inline messages with `InfoBar`

```xml
<InfoBar x:Name="Info" IsOpen="False" Severity="Warning" Title="Offline"
         Message="Using the local XML file instead of the API."/>
```

Show it in code with `Info.IsOpen = true;`. `Severity` is `Informational`, `Success`, `Warning` or `Error`. Unlike a dialog it doesn't block anything, so it's the right choice for "the API was unreachable, using offline data" messages from Chapter 9's fallback.

**Guidance on errors:** show a *friendly* message to the user and keep the technical details (`ex.ToString()`) for logs. Never swallow exceptions silently, because the day something breaks you'll have nothing to look at.

### 14.3 File pickers, and exporting to CSV

Pickers let the user choose where files come from and go. We'll build **Export to CSV** end to end.

#### Step 1: The pure part first (in Core, testable)

Turning items into CSV text is logic, not UI, so it belongs in Core. Create `CatalogTracker.Core/Services/CsvExporter.cs`:

```csharp
using System.Globalization;
using System.Text;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Services;

public static class CsvExporter
{
    public static string ToCsv(IEnumerable<Item> items)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Id,Name,Category,Price,Quantity,Updated,Tags");

        foreach (var i in items)
        {
            sb.AppendLine(string.Join(",",
                i.Id,
                Escape(i.Name),
                Escape(i.Category),
                i.Price.ToString(CultureInfo.InvariantCulture),
                i.Quantity,
                i.Updated.ToString("s"),
                Escape(string.Join(";", i.Tags))));
        }
        return sb.ToString();
    }

    // CSV rule: wrap in quotes if it contains a comma, quote or newline; double any quotes inside.
    private static string Escape(string value)
        => value.Contains(',') || value.Contains('"') || value.Contains('\n')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
```

**Reading it:** `StringBuilder` is the efficient way to build large strings piece by piece (Python's `list.append` then `"".join`). `string.Join(",", a, b, c, ...)` joins a *mix* of values (numbers get converted with `ToString`). The `Escape` rule is real CSV: a name like `Hammer, 16oz` would otherwise be split into two columns. Because this is a pure function, Chapter 10 shows how to test it, and a CSV bug would show up in a unit test, not in front of a user.

#### Step 2: The picker (UI) part

Pickers on desktop WinUI 3 need to know which window owns them, so wrap that once. Create `Helpers/Pickers.cs`:

```csharp
using Windows.Storage;
using Windows.Storage.Pickers;

namespace CatalogTracker.App.Helpers;

public static class Pickers
{
    private static nint Hwnd => WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);

    public static async Task<StorageFile?> PickOpenAsync(params string[] extensions)
    {
        var picker = new FileOpenPicker();
        foreach (var ext in extensions) picker.FileTypeFilter.Add(ext);
        WinRT.Interop.InitializeWithWindow.Initialize(picker, Hwnd);
        return await picker.PickSingleFileAsync();
    }

    public static async Task<StorageFile?> PickSaveAsync(string suggestedName, string description, string extension)
    {
        var picker = new FileSavePicker { SuggestedFileName = suggestedName };
        picker.FileTypeChoices.Add(description, new List<string> { extension });
        WinRT.Interop.InitializeWithWindow.Initialize(picker, Hwnd);
        return await picker.PickSaveFileAsync();
    }

    public static async Task<StorageFolder?> PickFolderAsync()
    {
        var picker = new FolderPicker();
        picker.FileTypeFilter.Add("*");
        WinRT.Interop.InitializeWithWindow.Initialize(picker, Hwnd);
        return await picker.PickSingleFolderAsync();
    }
}
```

**Why a helper?** The two `InitializeWithWindow` lines are mandatory boilerplate for *every* picker. Forgetting them gives a cryptic exception. Writing them once means no one has to remember. `nint` is "native integer," the type of a window handle (`HWND`); you can treat it as an opaque value. `params string[] extensions` lets callers write `PickOpenAsync(".xml", ".json")`. Pickers return `null` if the user cancels, so every caller must check.

#### Step 3: Wire up an Export button

Add to `MainPage.xaml`'s toolbar: `<Button Content="Export CSV…" Click="ExportButton_Click"/>`, and to `MainPage.xaml.cs` (with `using CatalogTracker.App.Helpers;` and `using CatalogTracker.Core.Services;`):

```csharp
private async void ExportButton_Click(object sender, RoutedEventArgs e)
{
    var file = await Pickers.PickSaveAsync("catalog", "CSV file", ".csv");
    if (file is null) return;                                   // user cancelled

    var items = ViewModel.Items.Select(i => i.ToItem()).ToList();
    string csv = CsvExporter.ToCsv(items);
    await File.WriteAllTextAsync(file.Path, csv);

    ViewModel.Status = $"Exported {items.Count} items to {file.Name}.";
}
```

(`ViewModel.Status` is a normal property; setting it from the page is fine. For anything with real logic, prefer a ViewModel command.) The import button from Chapter 13 simplifies the same way: `var file = await Pickers.PickOpenAsync(".xml");`.

**Checkpoint:** click Export CSV…, choose a location, open the result in Excel or Notepad. Add an item whose name contains a comma and confirm it stays in one column.

### 14.4 Threading: why UIs freeze, and how to avoid it

A UI has **one UI thread** that draws the screen and handles clicks. Controls may only be touched from it, and if you keep it busy, the window stops responding. Let's see that with your own eyes.

**Experiment 1: freeze it on purpose.** In `PlaygroundPage` add a button with a handler:

```csharp
private void FreezeButton_Click(object sender, RoutedEventArgs e)
{
    Thread.Sleep(5000);          // blocks the UI thread for 5 seconds
    Output.Text = "Done sleeping";
}
```

Click it, then try to drag the window: nothing responds, and Windows may show "Not Responding." That's what a blocked UI thread looks like. Everything on screen is frozen because the one thread that handles it is asleep.

**Experiment 2: the fix is `await`.**

```csharp
private async void NoFreezeButton_Click(object sender, RoutedEventArgs e)
{
    await Task.Delay(5000);      // yields the UI thread while waiting
    Output.Text = "Done waiting";
}
```

Same 5 seconds, but the window stays alive. `await` means "go do other things; come back to me when this finishes, on the UI thread."

**Experiment 3: CPU-heavy work.** `await` helps for waiting (network, disk, database). For heavy *computation*, push it onto a background thread:

```csharp
private async void CrunchButton_Click(object sender, RoutedEventArgs e)
{
    long total = await Task.Run(() =>
    {
        long sum = 0;
        for (long i = 0; i < 2_000_000_000; i++) sum += i;   // heavy loop
        return sum;
    });
    Output.Text = $"Sum: {total}";   // back on the UI thread automatically
}
```

`Task.Run(() => ...)` runs the lambda on a thread-pool thread, returns a `Task<long>` you can `await`, and the code after the `await` resumes on the UI thread. (Numeric literals can use `_` separators for readability.) Rule: **I/O → `await` the async method; heavy CPU → `await Task.Run(...)`.**

**Updating the UI from a background thread** (when you can't `await`, e.g. from an event raised by a library):

```csharp
App.CurrentWindow.DispatcherQueue.TryEnqueue(() => Status = "Update from another thread");
```

`DispatcherQueue` is the UI thread's inbox: "run this lambda on the UI thread." Touching a control directly from a background thread throws a "wrong thread" `COMException`.

**The mistake to never make: blocking on async code.**

```csharp
var items = _catalog.GetAllAsync().Result;     // ✗ DON'T
_catalog.SyncAsync().Wait();                   // ✗ DON'T
```

On the UI thread, `.Result` and `.Wait()` block waiting for a task that needs the UI thread to finish. That's a **deadlock**: the app hangs forever. The rule is **`await` all the way up**: if a method calls an async method, it should be `async` too, and so on up to the event handler (the one place `async void` is allowed). If you ever see an app that hangs with no error, search your code for `.Result`, `.Wait()` and `.GetAwaiter().GetResult()`.

**Long operations, good manners:** show a spinner, disable the triggering button, and accept a `CancellationToken` so a Cancel button can stop it:

```csharp
private CancellationTokenSource? _cts;

private async void StartButton_Click(object sender, RoutedEventArgs e)
{
    _cts = new CancellationTokenSource();
    try   { await Task.Delay(10_000, _cts.Token); Output.Text = "Finished"; }
    catch (OperationCanceledException) { Output.Text = "Cancelled"; }
}

private void CancelButton_Click(object sender, RoutedEventArgs e) => _cts?.Cancel();
```

This is why every method in Core accepts a `CancellationToken`: the plumbing is there when you want to use it.

### 14.5 Remembering settings

We'll build a small, testable settings system that saves to a JSON file. It works in packaged *and* unpackaged apps and lives in Core.

#### Step 1: The settings class

`CatalogTracker.Core/Models/AppSettings.cs`:

```csharp
namespace CatalogTracker.Core.Models;

public class AppSettings
{
    public string DefaultCategory { get; set; } = "";
    public string? ApiBaseUrl { get; set; }          // a URL is fine to store; NEVER store the token here
    public bool CompactList { get; set; }
}
```

(Settings is a case where a mutable class is the right tool: it's edited from a form and serialized.)

#### Step 2: Load and save

`CatalogTracker.Core/Services/SettingsStore.cs`:

```csharp
using System.Text.Json;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Services;

public class SettingsStore
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };
    private readonly string _path;

    public SettingsStore(string path) => _path = path;

    public AppSettings Load()
    {
        try
        {
            if (!File.Exists(_path)) return new AppSettings();
            string json = File.ReadAllText(_path);
            return JsonSerializer.Deserialize<AppSettings>(json) ?? new AppSettings();
        }
        catch (JsonException)
        {
            return new AppSettings();     // corrupt file: start fresh rather than crash at startup
        }
    }

    public void Save(AppSettings settings)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        File.WriteAllText(_path, JsonSerializer.Serialize(settings, Options));
    }
}
```

**Reading it:** `Load` never throws for the *expected* problems (missing file, garbled JSON); it hands back defaults, since a settings problem shouldn't stop the app from starting. `WriteIndented` makes the JSON human-readable. It's synchronous on purpose: the file is tiny and loaded at startup. (Not everything has to be async.)

#### Step 3: Register it and use it on the Settings page

In `App.xaml.cs`'s `ConfigureServices`:

```csharp
string settingsPath = Path.Combine(dataDir, "settings.json");
services.AddSingleton(new SettingsStore(settingsPath));
```

Add a form to `SettingsPage.xaml`:

```xml
<StackPanel Padding="24" Spacing="12" MaxWidth="480" HorizontalAlignment="Left">
    <TextBlock Text="Settings" Style="{StaticResource TitleTextBlockStyle}"/>
    <TextBox x:Name="CategoryBox" Header="Default category"/>
    <ToggleSwitch x:Name="CompactSwitch" Header="Compact list"/>
    <Button Content="Save" Click="SaveButton_Click" Style="{StaticResource AccentButtonStyle}"/>
    <TextBlock x:Name="Saved" Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
</StackPanel>
```

`SettingsPage.xaml.cs`:

```csharp
using CatalogTracker.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace CatalogTracker.App;

public sealed partial class SettingsPage : Page
{
    private readonly SettingsStore _store = App.Services.GetRequiredService<SettingsStore>();

    public SettingsPage()
    {
        InitializeComponent();
        var s = _store.Load();
        CategoryBox.Text = s.DefaultCategory;
        CompactSwitch.IsOn = s.CompactList;
    }

    private void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        var s = _store.Load();
        s.DefaultCategory = CategoryBox.Text.Trim();
        s.CompactList = CompactSwitch.IsOn;
        _store.Save(s);
        Saved.Text = "Saved.";
    }
}
```

**Checkpoint:** change a setting, save, restart the app, reopen Settings: it's remembered. Open `%LocalAppData%\CatalogTracker\settings.json` and read it.

**Alternatives:** packaged apps can use `Windows.Storage.ApplicationData.Current.LocalSettings.Values["Key"]` for simple key/values. It's convenient but only works for packaged apps, so a JSON file is more portable and testable.

**Secrets (API tokens, passwords):** do **not** put them in `AppSettings`/`settings.json`. Use the Windows Credential Locker (`Windows.Security.Credentials.PasswordVault`) or an environment variable (see Chapter 9).

### 14.6 Other controls you'll want

| Need | Control |
|---|---|
| Table with columns | `ListView` with a column `Grid` in the item template, or the Windows Community Toolkit DataGrid package (check its current package name and status in the Toolkit docs before depending on it) |
| Tabs | `TabView`, or `Pivot` |
| Tree | `TreeView` |
| Date / time | `CalendarDatePicker`, `DatePicker`, `TimePicker` |
| Expand/collapse section | `Expander` |
| Toolbar | `CommandBar` with `AppBarButton`s |
| Menus | `MenuBar`, `MenuFlyout`, right-click `ContextFlyout` |
| Images | `<Image Source="ms-appx:///Assets/foo.png"/>` |
| Charts | Third-party (LiveCharts2, ScottPlot, OxyPlot): check current WinUI 3 support |

**The best reference you'll find:** the free **WinUI 3 Gallery** app (Microsoft Store) and its source on GitHub (`microsoft/WinUI-Gallery`). It shows every control with copy-able XAML and C#. Since you won't have AI at work yet, this is your best "show me an example of X" tool, along with the official Microsoft Learn docs for the Windows App SDK.

### Exercises (Chapter 14)

1. Replace the delete handler in `MainPage` with the `Dialogs.ConfirmAsync` helper. Count the lines you removed.
2. Add a "Reports" page that shows the total value per category (`GroupBy` from Chapter 2) fetched from `CatalogService`. Pass it through a new `ReportsViewModel` registered in DI.
3. Make the Settings page's `DefaultCategory` pre-fill the category of a **new** item in `MainViewModel.New()`.
4. Write a unit test for `CsvExporter` that checks a name containing a comma and a quote comes out correctly escaped (Chapter 10 shows the pattern).
5. Run the three threading experiments in order and write down, in your own words, why #1 freezes but #2 doesn't.

---

## Chapter 15: Debugging and common errors

### 15.1 Tools

- **Breakpoints:** click the left margin (F9). F5 run, F10 step over, F11 step into, Shift+F11 step out. Hover variables; *Locals*/*Watch* windows show values. Conditional breakpoints: right-click the red dot.
- **Immediate window**, **Output window**, **Error List**.
- **Live Visual Tree** and **Live Property Explorer** (Debug → Windows) let you inspect the running XAML like browser devtools.
- **Binding failures** appear in the Output window when debugging (look for "Binding" messages) or in the *XAML Binding Failures* window.
- **Debug.WriteLine("text")** prints to Output (like `print`); `Console.WriteLine` shows in console apps.
- **Hot Reload** for XAML and, often, for C# edits while running.
- Run your **tests** often.

### 15.2 Common problems

| Symptom | Likely cause |
|---|---|
| UI text never updates | Missing `Mode=OneWay`; or you set the field `_name` instead of the property `Name`; or the class isn't `ObservableObject` |
| List doesn't update when adding | You used `List<T>` instead of `ObservableCollection<T>` |
| "Partial" error from CommunityToolkit | Class must be `partial` and inherit `ObservableObject` |
| `[RelayCommand]` command not found in XAML | Name is `<Method>Command` with `Async` stripped; rebuild first |
| App crashes at startup: XAML parse exception | Typo in XAML, wrong namespace, or missing `x:Class` namespace match. Message includes a line number |
| `InvalidOperationException`/COM error opening a picker | Forgot `InitializeWithWindow.Initialize` |
| `ContentDialog` crash | Forgot `XamlRoot = this.XamlRoot` or showing two dialogs at once |
| `NullReferenceException` in `MainPage()` | `ViewModel` assigned **after** `InitializeComponent()` |
| `KeyNotFoundException` / sqlite errors at first run | DB folder doesn't exist (`Directory.CreateDirectory`), or table not created (`InitializeAsync`) |
| `InvalidCastException` reading SQLite | Column type mismatch: check with DB Browser; use `IsDBNull` |
| Date/decimal parse errors in other regions | Missing `CultureInfo.InvariantCulture` |
| `HttpRequestException` | URL, trailing slash on `BaseAddress`, auth header, TLS/proxy (corporate networks!) |
| Build error `CS8618` nullable warnings | Give a default (`= ""`), mark `?`, or use `required` |
| Everything's red after pasting code | Missing `using` lines: put cursor on the red name, **Ctrl+.**, pick "using ..." |
| `The type or namespace 'X' could not be found` | Missing NuGet package or project reference |
| Weird stale behavior | *Build → Clean Solution*, delete `bin/` and `obj/`, rebuild |
| Can't find the DB file | It's in `%LocalAppData%\CatalogTracker\` (for packaged apps, Windows may redirect under `%LocalAppData%\Packages\...\LocalCache\Local\`) |

### 15.3 How to read a stack trace

Read from the **top**: the first line is the exception type and message. Then scan down for the first line that mentions **your** namespace (`CatalogTracker...`); that's where *your* code was running when it failed. Lines for framework code (`System...`, `Microsoft.UI...`) are context. The `InnerException` often has the real reason.

---

## Chapter 16: Design principles: a checklist you can reuse

**Structure**
- Separate **what the app does** (Core) from **how it looks** (App) and **where data lives** (sources/stores).
- Dependencies point **inward**: UI → Core; Core never references UI.
- One class, one job. If you describe it with "and", split it.
- Depend on interfaces at *boundaries* (data in/out, network, file system, clock), not for everything.

**Data**
- Domain models are immutable records; DTOs and DB rows are separate types; **map at the boundary**, in one place.
- Keep parsing (pure) separate from I/O (files/network).
- Validate at the edges (when data enters), and fail with clear messages.
- Use `decimal` for money, UTC/ISO for dates when crossing systems, invariant culture for parsing.

**Code**
- Name things for what they mean (`ImportAsync`, not `DoStuff`).
- Prefer small methods; extract a method when you write a comment explaining a block.
- Don't repeat yourself *after* you've seen the repetition 3 times. Don't abstract too early.
- Don't build features nobody asked for (YAGNI).
- Handle errors where you can do something about them; show friendly messages at the UI.
- Prefer composition ("has a") over inheritance ("is a").

**UI**
- Views display; ViewModels hold state and decide; Core does the work.
- A ViewModel should never reference a control, a dialog, or a window.
- Disable buttons that can't work yet instead of letting them fail.
- Always show something while working (spinner/status).
- Don't block the UI thread.

**Process**
- Commit small, commit often, with messages that say *why*.
- Write a test when you fix a bug so it stays fixed.
- Keep secrets out of the repo.
- When a class gets hard to understand, split it. That is always better than a comment.

---

## Chapter 17: Reference sheets

### 17.1 `dotnet` CLI

| Task | Command |
|---|---|
| New solution/project | `dotnet new sln -n X` / `dotnet new console\|classlib\|xunit -n Y` |
| Add project to solution | `dotnet sln add Y` |
| Reference another project | `dotnet add Y reference Z` |
| Add a NuGet package | `dotnet add Y package PackageName` |
| Build | `dotnet build` |
| Run | `dotnet run --project Y` |
| Test | `dotnet test` |
| Clean | `dotnet clean` |
| Restore packages | `dotnet restore` |
| New .gitignore | `dotnet new gitignore` |
| List installed SDKs | `dotnet --list-sdks` |

### 17.2 Rosetta stone: everyday tasks

| Task | Python | C# |
|---|---|---|
| Read text file | `open(p).read()` | `File.ReadAllText(p)` / `await File.ReadAllTextAsync(p)` |
| Read lines | `open(p).readlines()` | `File.ReadAllLines(p)` |
| Write text | `open(p,"w").write(s)` | `File.WriteAllText(p, s)` |
| Path join | `os.path.join(a, b)` | `Path.Combine(a, b)` |
| File exists | `os.path.exists(p)` | `File.Exists(p)` / `Directory.Exists(p)` |
| List files | `glob("*.xml")` | `Directory.GetFiles(dir, "*.xml")` |
| Env var | `os.environ["X"]` | `Environment.GetEnvironmentVariable("X")` |
| Now | `datetime.now()` | `DateTime.Now` (local) / `DateTime.UtcNow` |
| Parse int safely | `int(s)` in try | `int.TryParse(s, out var n)` |
| Format number | `f"{x:,.2f}"` | `$"{x:N2}"` |
| Sleep | `time.sleep(1)` | `await Task.Delay(1000)` |
| Regex | `re.match(...)` | `Regex.Match(...)` (`System.Text.RegularExpressions`) |
| JSON load | `json.loads(s)` | `JsonSerializer.Deserialize<T>(s)` |
| CSV | `csv` module | CsvHelper package (or `Split(',')` for trivial) |
| Logging | `logging` | `ILogger<T>` (Microsoft.Extensions.Logging) or `Debug.WriteLine` |
| Dict get default | `d.get(k, 0)` | `d.GetValueOrDefault(k, 0)` |
| Enumerate | `for i, x in enumerate(xs)` | `foreach (var (x, i) in xs.Select((x, i) => (x, i)))` or `for (int i = 0; ...)` |
| Zip | `zip(a, b)` | `a.Zip(b)` |
| Unique | `set(xs)` | `xs.Distinct()` |
| Min/max by key | `max(xs, key=f)` | `xs.MaxBy(f)` |
| Chunks | manual | `xs.Chunk(100)` |
| Try/else | `try/except/else` | `try/catch` (no `else`) |
| `with` multiple | `with a, b:` | `using var a = ...; using var b = ...;` |

### 17.3 Control flow syntax

```csharp
if (x > 0) { ... } else if (x == 0) { ... } else { ... }

for (int i = 0; i < 10; i++) { ... }          // classic
foreach (var item in items) { ... }           // for item in items
while (cond) { ... }
do { ... } while (cond);

int y = x > 0 ? 1 : -1;                       // ternary (Python: 1 if x > 0 else -1)
bool both = a && b;   bool either = a || b;   bool not = !a;     // and / or / not

break; continue; return;                      // same as Python
```

### 17.4 Visual Studio shortcuts worth memorizing

| Shortcut | Does |
|---|---|
| F5 / Ctrl+F5 | Run with / without debugger |
| F9 | Breakpoint |
| F12 | Go to definition |
| Shift+F12 | Find all references |
| Ctrl+. | Quick actions (add using, generate method, implement interface) |
| Ctrl+K, Ctrl+D | Format document |
| Ctrl+K, Ctrl+C / U | Comment / uncomment |
| Ctrl+T | Go to anything |
| F2 | Rename symbol everywhere |
| Ctrl+Space | Force IntelliSense |
| Ctrl+Shift+B | Build |

"Implement interface" via **Ctrl+.** on a class that says `: IItemStore` stubs out all methods for you.

### 17.5 Glossary

- **Assembly**: compiled output (`.dll`/`.exe`) of a project.
- **NuGet**: package manager (pip equivalent).
- **CLR/.NET runtime**: the thing that runs your compiled code.
- **TFM**: target framework moniker, e.g. `net10.0` or `net10.0-windows10.0.19041.0`.
- **POCO**: "plain old CLR object": a simple class with just properties.
- **DTO**: object shaped like an external data format (API JSON).
- **Dependency injection**: passing a class its collaborators instead of it creating them.
- **Composition root**: the single place where objects are wired together.
- **MVVM**: Model–View–ViewModel UI pattern.
- **XAML**: XML-based UI markup.
- **Code-behind**: the C# file paired with a XAML file.
- **Binding**: automatic synchronization between a UI property and a data property.
- **MSIX / packaged app**: Windows app installer format, the template's default.

---

## Chapter 18: Working effectively with AI help (when you have it)

You said the problem with AI-written code is that you can't change it or explain what to change. With this tutorial you now can. Some habits that make AI help far better:

1. **Describe changes with vocabulary**: "In `MainViewModel`, add an `[ObservableProperty] bool _lowStockOnly` and filter in `ApplyFilter()`," instead of "make it filter."
2. **Name the layer.** Is the change in the **Core** (logic/data), the **ViewModel** (state/commands), or the **View** (XAML)? Say so.
3. **Share the interface and the model**, not only the broken line. Paste `IItemStore`, `Item`, and the failing method.
4. **Paste the exact error text** (and the first stack frame in your code).
5. **Ask for small steps** and run after each, same as this tutorial.
6. **Ask "why?"** about every unfamiliar construct. Add the answer to your own notes.
7. **Ask for a test** with each non-trivial change, so you can tell if a later edit broke it.
8. **Review before pasting**: read it using Chapter 3's order. If you can't explain a line, ask what it does before using it.

---

## Chapter 19: Where to go next (capstone ideas)

Each of these exercises one more skill, using the same architecture:

1. **Real API swap**: implement `HttpItemSource` against your actual API; keep `FallbackItemSource` with XML.
2. **Two-way sync**: add `IItemSink` (push local edits back to the API). Handle conflicts by `Updated` timestamps.
3. **Categories table**: normalize the DB (items → categories foreign key) and see EF relationships (`HasOne/WithMany`, `Include`).
4. **Reports page**: LINQ `GroupBy` totals per category + a chart library.
5. **Export**: CSV/XML export via `FileSavePicker`.
6. **Settings page**: choose DB path, API URL (not the token!), theme.
7. **Logging**: add `ILogger<T>` through DI, write to a file.
8. **Background refresh**: a timer that syncs every N minutes using `DispatcherQueueTimer`, with cancellation.
9. **Validation**: show inline errors using `InfoBar` or `TextBox` `Header` coloring; disable Save until valid (`[NotifyCanExecuteChangedFor]` + `CanExecute`).
10. **Packaging**: try *Publish → Create App Packages*, or build unpackaged by adjusting project properties, and note what changes for file locations.

---

## Appendix A: Final project layout

```
CatalogTracker/
├─ CatalogTracker.slnx (or .sln)
├─ .gitignore
├─ CatalogTracker.Core/
│  ├─ Abstractions/   IItemSource.cs, IItemStore.cs
│  ├─ Models/         Item.cs
│  ├─ Services/       CatalogService.cs
│  ├─ Sources/        XmlItemSource.cs, FallbackItemSource.cs
│  │  └─ Api/         ApiItemDto.cs, HttpItemSource.cs, JsonFileItemSource.cs
│  └─ Storage/        SqliteItemStore.cs
│     └─ Ef/          ItemRow.cs, CatalogDbContext.cs, EfItemStore.cs
├─ CatalogTracker.Cli/     Program.cs, sample.xml          (console playground)
├─ CatalogTracker.Tests/   XmlItemSourceTests.cs, CatalogServiceTests.cs
└─ CatalogTracker.App/     (WinUI 3)
   ├─ App.xaml(.cs)        composition root
   ├─ MainWindow.xaml(.cs) navigation host
   ├─ MainPage.xaml(.cs)   the catalog UI
   ├─ ViewModels/          MainViewModel.cs, ItemViewModel.cs
   ├─ Helpers/             Fmt.cs
   └─ Data/                sample.xml
```

## Appendix B: Dependency map

```
 App (WinUI)  ──►  Core  ◄──  Tests
   │                ▲
   └─ ViewModels ───┘        Cli ──► Core

 Inside Core:
   CatalogService ──► IItemSource ◄── XmlItemSource | HttpItemSource | JsonFileItemSource | FallbackItemSource
                 └──► IItemStore  ◄── SqliteItemStore | EfItemStore
```

The arrows tell you what you can change freely: anything on the right of an interface can be replaced without touching the left.

## Appendix C: A one-page "when I'm stuck" routine

1. Read the **first** error. Ignore the rest until it's fixed.
2. Find the first line **in your namespace** in the stack trace.
3. Put a breakpoint there; inspect values.
4. Search the exact error message plus the library name.
5. Reduce: can you reproduce it in the console project or a unit test?
6. Check the usual suspects: `partial`, `Mode=OneWay`, `ObservableCollection`, `XamlRoot`, `InitializeWithWindow`, `InvariantCulture`, missing `await`, missing `using`.
7. Write down what you learned in your own words. That *is* the skill.

Happy building. Type everything, run everything, break everything on purpose once.
