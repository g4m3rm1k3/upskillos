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

You parse XML in Python with `ElementTree`. C#'s equivalent is **LINQ to XML** (`System.Xml.Linq`): `XDocument`, `XElement`, `XAttribute`. It's pleasant and very close to what you know.

### 5.1 Sample data

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
    <!-- no updated or tags on purpose: real data is messy -->
  </item>
</catalog>
```

In the Cli `.csproj`, tell the build to copy it next to the executable:

```xml
<ItemGroup>
  <None Update="sample.xml">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

(Right-click the file in VS → Properties → *Copy to Output Directory: Copy if newer* does the same.)

### 5.2 ElementTree vs LINQ to XML

| Python `ElementTree` | C# LINQ to XML |
|---|---|
| `ET.parse(path).getroot()` | `XDocument.Load(path).Root` |
| `ET.fromstring(text)` | `XDocument.Parse(text)` |
| `root.findall("item")` | `root.Elements("item")` |
| `root.iter("tag")` | `root.Descendants("tag")` |
| `e.find("name")` | `e.Element("name")` |
| `e.find("name").text` | `e.Element("name")?.Value` |
| `e.get("id")` | `e.Attribute("id")?.Value` |
| `int(e.get("id"))` | `(int)e.Attribute("id")` ← explicit cast |
| `e.get("x", default)` | `(int?)e.Attribute("x") ?? default` |

The magic trick: **explicit casts on `XElement`/`XAttribute`** do parsing for you, and casting to a *nullable* type (`int?`, `decimal?`, `DateTime?`, `string?`) gives `null` instead of crashing when the element is missing. They also parse using the XML standard (invariant culture), so `12.50` always parses as 12.5 regardless of the machine's locale.

### 5.3 The XML source class

```csharp
// CatalogTracker.Core/Sources/XmlItemSource.cs
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

    // Reads the file (I/O), then hands the parsed document to pure parsing code.
    public async Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
    {
        await using var stream = File.OpenRead(_path);
        XDocument doc = await XDocument.LoadAsync(stream, LoadOptions.None, ct);
        return Parse(doc);
    }

    // Pure function: XML in, items out. Easy to test (Ch. 10).
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

Reading `ParseItem`: "take an `XElement` and build an `Item`; for each property, read the matching bit of XML, cast to nullable, and fall back to a default if missing." The `=>` after the method signature means the whole method is one expression (the `new() { ... }` object creation).

Two things to separate in your head: **I/O** (`GetItemsAsync` opens files) vs **parsing** (`Parse` is pure). Keeping them separate is a real design skill: you can test parsing with a string and no files.

### 5.4 Run it

```csharp
// CatalogTracker.Cli/Program.cs
using CatalogTracker.Core.Sources;

var source = new XmlItemSource("sample.xml");
var items = await source.GetItemsAsync();

foreach (var item in items)
    Console.WriteLine($"{item.Id,3}  {item.Name,-18} {item.Price,8:C}  x{item.Quantity}  [{string.Join(", ", item.Tags)}]");
```

**Checkpoint:** three rows print; the watering can has an empty tag list.

### 5.5 Other XML techniques you may need

**Namespaces** (a frequent source of "my query returns nothing"):

```csharp
XNamespace ns = "http://example.com/schema";
var items = doc.Root!.Elements(ns + "item");     // element names must include the namespace
```

**Searching anywhere:** `doc.Descendants("price")` is like `iter()`.

**Attributes loop:** `foreach (var a in e.Attributes()) Console.WriteLine($"{a.Name} = {a.Value}");`

**Writing XML:**

```csharp
var doc = new XDocument(
    new XElement("catalog",
        items.Select(i => new XElement("item",
            new XAttribute("id", i.Id),
            new XElement("name", i.Name),
            new XElement("price", i.Price)))));
doc.Save("out.xml");
```

**Deserialization into classes (`XmlSerializer`):** it maps XML to classes with attributes like `[XmlElement]`. It's fine for stable schemas, but it requires a parameterless-constructor, mutable class, and is awkward for messy data. For messy third-party XML, hand-written LINQ to XML (above) is more forgiving and easier to read.

**Big files (hundreds of MB):** use `XmlReader` to stream rather than loading the whole doc.

### Exercises (Chapter 5)
1. Add an optional `<supplier>` element to one item in the XML and a `Supplier` property (`string?`) to `Item`. Update the parser.
2. Print only items with `Quantity == 0`.
3. Parse the `currency` attribute of `<price>` too. (`e.Element("price")?.Attribute("currency")`.)
4. Break the XML on purpose (unclosed tag). What exception do you get? Catch it (`XmlException`) and print a friendly message.

---

## Chapter 6: Stage 3: Interfaces, design, and a service

Right now `XmlItemSource` is a concrete class. The day you switch to an API you'd have to edit every place that mentions `XmlItemSource`. Let's design for that day.

### 6.1 The idea

Ask: *what does the rest of the app need?* It needs "a way to get a list of items." It does not care whether they come from XML, an API, or a mock. Capture that as an **interface**:

```csharp
// CatalogTracker.Core/Abstractions/IItemSource.cs
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Abstractions;

/// <summary>Anything that can produce a list of items (XML file, web API, test data...).</summary>
public interface IItemSource
{
    Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default);
}
```

And for storage:

```csharp
// CatalogTracker.Core/Abstractions/IItemStore.cs
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

"Upsert" = insert if new, update if it exists.

Update `XmlItemSource` to declare it fulfils the contract. Only the first line changes:

```csharp
public class XmlItemSource : IItemSource
```

(add `using CatalogTracker.Core.Abstractions;`). The compiler now verifies you implemented every member.

### 6.2 The service: where your app's *logic* lives

```csharp
// CatalogTracker.Core/Services/CatalogService.cs
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Services;

public class CatalogService
{
    private readonly IItemStore _store;
    private readonly IItemSource _defaultSource;

    // Dependencies are passed IN. This class never says "new XmlItemSource" or "new SqliteItemStore".
    public CatalogService(IItemStore store, IItemSource defaultSource)
    {
        _store = store;
        _defaultSource = defaultSource;
    }

    public Task InitializeAsync(CancellationToken ct = default) => _store.InitializeAsync(ct);

    /// <summary>Pull from the default source and save into the store. Returns how many items.</summary>
    public Task<int> SyncAsync(CancellationToken ct = default) => ImportAsync(_defaultSource, ct);

    /// <summary>Pull from any source (e.g. a file the user picked) and save.</summary>
    public async Task<int> ImportAsync(IItemSource source, CancellationToken ct = default)
    {
        var items = await source.GetItemsAsync(ct);
        await _store.UpsertManyAsync(items, ct);
        return items.Count;
    }

    public Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default) => _store.GetAllAsync(ct);
    public Task SaveAsync(Item item, CancellationToken ct = default) => _store.UpsertAsync(item, ct);
    public Task DeleteAsync(int id, CancellationToken ct = default) => _store.DeleteAsync(id, ct);
}
```

### 6.3 The principles you just used

| Principle | In this code |
|---|---|
| **Single Responsibility** | Source gets data. Store saves data. Service coordinates. Each class has one reason to change. |
| **Dependency Inversion / Injection** | `CatalogService` depends on `IItemStore`/`IItemSource` (abstractions), not concrete classes. |
| **Open/Closed** | Adding the API source later means *adding* a class, not editing the service. |
| **Testability** | You can give the service fake in-memory implementations (Ch. 10). |
| **YAGNI** ("you aren't gonna need it") | We only added methods the app will actually use. Don't build for imaginary futures. |

Don't over-apply this. A good smell test: **"is there already a second implementation, or will there definitely be one soon?"** Here, yes: XML now, API soon, fakes for tests. If there will only ever be one implementation of something small, a plain class is fine.

### 6.4 Manual wiring ("composition root")

Somewhere the concrete classes get chosen and glued together. That place is the **composition root**: `Program.cs` for the console app, `App.xaml.cs` for WinUI (Ch. 13). Everything else just receives interfaces. We'll do this fully after SQLite exists.

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

Time for the UI. First: what is WinUI 3?

- **WinUI 3** is Microsoft's modern native Windows UI framework (part of the **Windows App SDK**).
- UI is written in **XAML**, an XML dialect, with **C# code-behind** and view models.
- You already know XML, so XAML is mostly reading: **element = a class instance, attribute = a property.**

```xml
<Button Content="Save" Click="SaveButton_Click" />
```
is equivalent to
```csharp
var b = new Button { Content = "Save" };
b.Click += SaveButton_Click;
```

### 11.1 Create the project

In Visual Studio: *File → New → Project* → search **"WinUI"** → choose **"Blank App, Packaged (WinUI 3 in Desktop)"**. Name it `CatalogTracker.App`, put it in your solution folder, and add it to the solution.

Then:
1. Right-click `CatalogTracker.App` → *Add → Project Reference* → tick `CatalogTracker.Core`.
2. NuGet packages for the App project:
   - `CommunityToolkit.Mvvm` (removes the MVVM boilerplate)
   - `Microsoft.Extensions.DependencyInjection`
3. Set `CatalogTracker.App` as the startup project (right-click → *Set as Startup Project*) and press **F5**. A blank window appears with a button. 🎉

If the project won't build, check the VS installer for the Windows App SDK / WinUI workload (Ch. 1), and that "Developer Mode" is enabled in Windows settings if prompted.

### 11.2 Tour of the files

| File | Purpose |
|---|---|
| `App.xaml` / `App.xaml.cs` | App entry. `OnLaunched` creates and shows the first window. Our composition root. |
| `MainWindow.xaml` / `.xaml.cs` | The top-level window |
| `Package.appxmanifest` | App identity, capabilities (MSIX packaging) |
| `Assets/` | Icons/images |
| `*.xaml` + `*.xaml.cs` | Every XAML file has a code-behind partner: one `partial class` split across two files |

`partial class` means one class split across multiple files. The XAML compiler generates the other half (fields for each `x:Name`, `InitializeComponent()`, etc.). **Never delete `InitializeComponent();`** from a constructor.

### 11.3 Layout: the thing that surprises everyone

There are no pixel coordinates by default. You nest **layout panels** that arrange children:

| Panel | Use |
|---|---|
| `StackPanel` | Children in a row/column (`Orientation="Vertical"` default, `Spacing="8"`) |
| `Grid` | Rows & columns (the workhorse). Sizes: `Auto` (fit content), `*` (share leftover), number (pixels) |
| `RelativePanel` | Position relative to siblings |
| `ScrollViewer` | Makes its content scrollable |
| `Border` | Draw a border/background around one child |

Common layout properties on any element: `Margin` (outside space), `Padding` (inside), `HorizontalAlignment`/`VerticalAlignment` (`Left/Center/Right/Stretch`), `Width`/`Height`, `MinWidth`. Margins/padding can be `"8"` (all), `"8,4"` (horizontal, vertical), or `"left,top,right,bottom"`.

```xml
<Grid Padding="24" RowSpacing="12" ColumnSpacing="16">
    <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>   <!-- header: as tall as needed -->
        <RowDefinition Height="*"/>      <!-- body: everything left over -->
    </Grid.RowDefinitions>
    <Grid.ColumnDefinitions>
        <ColumnDefinition Width="2*"/>   <!-- left gets 2 parts -->
        <ColumnDefinition Width="3*"/>   <!-- right gets 3 parts -->
    </Grid.ColumnDefinitions>

    <TextBlock Grid.Row="0" Grid.ColumnSpan="2" Text="Catalog" Style="{StaticResource TitleTextBlockStyle}"/>
    <ListView  Grid.Row="1" Grid.Column="0"/>
    <StackPanel Grid.Row="1" Grid.Column="1"/>
</Grid>
```

`Grid.Row="1"` is an **attached property**: the child tells the parent where to place it.

### 11.4 Controls tour: a playground page

Add a page: right-click the App project → *Add → New Item → "Blank Page (WinUI 3)"* → name it `PlaygroundPage.xaml`. Temporarily make the window show it (see 11.5). Build this up and play:

```xml
<!-- PlaygroundPage.xaml -->
<Page
    x:Class="CatalogTracker.App.PlaygroundPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

    <ScrollViewer>
    <StackPanel Padding="24" Spacing="12" MaxWidth="480" HorizontalAlignment="Left">

        <TextBlock Text="Controls playground" Style="{StaticResource TitleTextBlockStyle}"/>

        <!-- Text input -->
        <TextBox x:Name="NameBox" Header="Name" PlaceholderText="Type here..."/>
        <PasswordBox x:Name="PwBox" Header="Password"/>
        <NumberBox x:Name="QtyBox" Header="Quantity" Value="1" Minimum="0" Maximum="999"
                   SpinButtonPlacementMode="Inline"/>

        <!-- Choices -->
        <CheckBox x:Name="ActiveCheck" Content="Active" IsChecked="True"/>
        <ToggleSwitch x:Name="NotifySwitch" Header="Notifications" IsOn="False"/>
        <ComboBox x:Name="CategoryCombo" Header="Category" SelectedIndex="0" MinWidth="200">
            <x:String>tools</x:String>
            <x:String>garden</x:String>
            <x:String>kitchen</x:String>
        </ComboBox>
        <RadioButtons x:Name="SizeRadios" Header="Size">
            <x:String>Small</x:String>
            <x:String>Large</x:String>
        </RadioButtons>
        <Slider x:Name="VolSlider" Header="Volume" Minimum="0" Maximum="100" Value="50"/>
        <CalendarDatePicker x:Name="DatePick" Header="Date"/>

        <!-- Search -->
        <AutoSuggestBox x:Name="SearchBox" PlaceholderText="Search..." QueryIcon="Find"
                        QuerySubmitted="SearchBox_QuerySubmitted"/>

        <!-- Actions -->
        <StackPanel Orientation="Horizontal" Spacing="8">
            <Button x:Name="HelloButton" Content="Say hello" Click="HelloButton_Click"
                    Style="{StaticResource AccentButtonStyle}"/>
            <Button Content="Disabled" IsEnabled="False"/>
            <ProgressRing x:Name="Spinner" IsActive="False"/>
        </StackPanel>

        <!-- Feedback -->
        <InfoBar x:Name="Info" IsOpen="False" Severity="Success" Title="Done"/>
        <TextBlock x:Name="Output" TextWrapping="Wrap"/>

        <!-- A list -->
        <ListView x:Name="FruitList" Header="Fruits" Height="140"
                  SelectionChanged="FruitList_SelectionChanged">
            <x:String>Apple</x:String>
            <x:String>Banana</x:String>
            <x:String>Cherry</x:String>
        </ListView>
    </StackPanel>
    </ScrollViewer>
</Page>
```

Code-behind:

```csharp
// PlaygroundPage.xaml.cs
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;

namespace CatalogTracker.App;

public sealed partial class PlaygroundPage : Page
{
    public PlaygroundPage()
    {
        InitializeComponent();           // builds the XAML controls; keep this first
    }

    // Event handler: signature is always (object sender, SomethingEventArgs e)
    private async void HelloButton_Click(object sender, RoutedEventArgs e)
    {
        Spinner.IsActive = true;                          // x:Name = a field you can use directly
        HelloButton.IsEnabled = false;

        await Task.Delay(1000);                           // simulate work; UI stays responsive

        string category = CategoryCombo.SelectedItem as string ?? "?";
        Output.Text =
            $"Hello {NameBox.Text}! qty={QtyBox.Value}, active={ActiveCheck.IsChecked}, " +
            $"notify={NotifySwitch.IsOn}, category={category}, " +
            $"size={SizeRadios.SelectedItem}, volume={VolSlider.Value}, " +
            $"date={DatePick.Date:d}";

        Info.Message = "Hello button finished.";
        Info.IsOpen = true;

        HelloButton.IsEnabled = true;
        Spinner.IsActive = false;
    }

    private void FruitList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (FruitList.SelectedItem is string fruit)
            Output.Text = $"You picked {fruit}";
    }

    private void SearchBox_QuerySubmitted(AutoSuggestBox sender, AutoSuggestBoxQuerySubmittedEventArgs args)
    {
        Output.Text = $"Searching for: {args.QueryText}";
    }
}
```

What to notice:
- `x:Name="NameBox"` creates a field called `NameBox`. That's how code finds controls.
- `Click="HelloButton_Click"` wires an event to a method of that name in the code-behind.
- `async void` is correct **only** for event handlers.
- Reading values: `TextBox.Text`, `CheckBox.IsChecked` (a `bool?`: true/false/null), `ToggleSwitch.IsOn`, `NumberBox.Value` (a `double`), `ComboBox.SelectedItem` (an `object`: cast it), `CalendarDatePicker.Date` (a `DateTimeOffset?`).
- After `await`, execution **resumes on the UI thread** automatically. Safe to touch controls.

### 11.5 Show the page in the window

`MainWindow.xaml`: replace the template's content with a `Frame`:

```xml
<Window
    x:Class="CatalogTracker.App.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="Catalog Tracker">

    <Frame x:Name="RootFrame"/>
</Window>
```

`MainWindow.xaml.cs`:

```csharp
using Microsoft.UI.Xaml;

namespace CatalogTracker.App;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        RootFrame.Navigate(typeof(PlaygroundPage));    // swap to MainPage in Ch. 13
    }
}
```

Note: you'll see template code that sets `Title` in code or has a sample button; remove the sample StackPanel/Button if they conflict with this `Frame`. A `Window` can have only one child element.

**Checkpoint:** F5, click the button, watch the spinner, read the output. Edit the XAML and use **Hot Reload** (the 🔥 button in VS toolbar; with the app running, XAML changes appear live).

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

Built-in text styles: `TitleTextBlockStyle`, `SubtitleTextBlockStyle`, `BodyStrongTextBlockStyle`, `CaptionTextBlockStyle`. Define your own reusable styles in `App.xaml` or a page's `<Page.Resources>`:

```xml
<Page.Resources>
    <Style x:Key="SectionHeader" TargetType="TextBlock" BasedOn="{StaticResource SubtitleTextBlockStyle}">
        <Setter Property="Margin" Value="0,12,0,4"/>
    </Style>
</Page.Resources>
...
<TextBlock Text="Details" Style="{StaticResource SectionHeader}"/>
```

`StaticResource` resolves once; `ThemeResource` re-resolves when the theme changes. Use `ThemeResource` for colors.

### 11.7 Exercises (Chapter 11)
1. Add a `Button` that clears all inputs.
2. Make the `Output` text red if `QtyBox.Value` is 0 (`Output.Foreground = new SolidColorBrush(Microsoft.UI.Colors.Red)`).
3. Build a "login form" layout using `Grid` with a label column and an input column.
4. Use Hot Reload to change spacing and colors while the app runs.

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

### 14.1 Navigation with multiple pages

`NavigationView` gives you a left menu and a content frame:

```xml
<!-- MainWindow.xaml -->
<NavigationView x:Name="Nav" IsBackButtonVisible="Collapsed" PaneDisplayMode="Left"
                SelectionChanged="Nav_SelectionChanged">
    <NavigationView.MenuItems>
        <NavigationViewItem Content="Catalog" Tag="catalog" Icon="List"/>
        <NavigationViewItem Content="Reports" Tag="reports" Icon="Calendar"/>
    </NavigationView.MenuItems>
    <Frame x:Name="ContentFrame"/>
</NavigationView>
```

```csharp
// MainWindow.xaml.cs
private void Nav_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
{
    if (args.IsSettingsSelected) { ContentFrame.Navigate(typeof(SettingsPage)); return; }

    switch ((args.SelectedItem as NavigationViewItem)?.Tag as string)
    {
        case "catalog": ContentFrame.Navigate(typeof(MainPage)); break;
        case "reports": ContentFrame.Navigate(typeof(ReportsPage)); break;
    }
}
```

Select the first item at startup: `Nav.SelectedItem = Nav.MenuItems[0];` in the constructor (after `InitializeComponent`). Pass data when navigating: `ContentFrame.Navigate(typeof(DetailPage), itemId)` and receive it in `OnNavigatedTo(NavigationEventArgs e)` via `e.Parameter`.

### 14.2 Dialogs

- `ContentDialog`: confirmations and small forms (always set `XamlRoot`).
- `InfoBar`: inline non-blocking message (success/warn/error).
- `TeachingTip`: contextual hints.
- Errors: show friendly text in the UI and log the details; never swallow exceptions silently.

A form in a dialog:

```csharp
var nameBox = new TextBox { PlaceholderText = "Name" };
var dialog = new ContentDialog
{
    Title = "New category", Content = nameBox,
    PrimaryButtonText = "Add", CloseButtonText = "Cancel", XamlRoot = XamlRoot,
};
if (await dialog.ShowAsync() == ContentDialogResult.Primary)
    Console.WriteLine(nameBox.Text);
```

### 14.3 File pickers (open, save, folder)

```csharp
// Save
var save = new FileSavePicker();
save.FileTypeChoices.Add("CSV", new List<string> { ".csv" });
save.SuggestedFileName = "catalog";
WinRT.Interop.InitializeWithWindow.Initialize(save, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
StorageFile? target = await save.PickSaveFileAsync();
if (target is not null) await File.WriteAllTextAsync(target.Path, csvText);

// Folder
var folder = new FolderPicker();
folder.FileTypeFilter.Add("*");
WinRT.Interop.InitializeWithWindow.Initialize(folder, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
StorageFolder? dir = await folder.PickSingleFolderAsync();
```

Always `InitializeWithWindow` first or you'll get a cryptic exception.

### 14.4 Threading: the UI thread

- UI controls may only be touched from the **UI thread**.
- After `await` in an event handler/command, you're back on the UI thread: safe.
- Heavy CPU work: `await Task.Run(() => HeavyThing());` runs it on a background thread, then resumes on the UI thread.
- If you're on a background thread and must update UI:

```csharp
App.CurrentWindow.DispatcherQueue.TryEnqueue(() => Status = "done");
```
- Never `.Result`/`.Wait()` on the UI thread.
- Long operations: show `ProgressRing`/`ProgressBar` (`IsIndeterminate="True"`), disable buttons while busy, support `CancellationToken`.

### 14.5 Settings persistence

Simple per-user settings (packaged app):

```csharp
var settings = Windows.Storage.ApplicationData.Current.LocalSettings;
settings.Values["LastCategory"] = "tools";
string? cat = settings.Values["LastCategory"] as string;
```

Or serialize your own `AppSettings` class to JSON in your data directory with `System.Text.Json`, which also works in unpackaged apps and in your Core project.

### 14.6 Other controls you'll want

| Need | Control |
|---|---|
| Table with columns | `ListView` with a column `Grid` in the template, or the **CommunityToolkit.WinUI.UI.Controls.DataGrid** NuGet (check current package name/state in the Windows Community Toolkit docs) |
| Tabs | `TabView`, or `Pivot` |
| Tree | `TreeView` |
| Date/time | `CalendarDatePicker`, `DatePicker`, `TimePicker` |
| Expand/collapse | `Expander` |
| Commands strip | `CommandBar` with `AppBarButton`s |
| Menus | `MenuBar`, `MenuFlyout`, right-click `ContextFlyout` |
| Images | `Image Source="ms-appx:///Assets/foo.png"` |
| Charts | Third-party (LiveCharts2, ScottPlot, OxyPlot): look for current WinUI 3 support |

The **WinUI 3 Gallery** app (free in the Microsoft Store) shows every control with copy-able XAML and C#. It's the best reference you'll find; while at work without AI, its sample code is exactly what to look at (it's also on GitHub: `microsoft/WinUI-Gallery`).

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