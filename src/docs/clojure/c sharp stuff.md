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

You know Python's `sqlite3`. The closest C# equivalent is **ADO.NET** via `Microsoft.Data.Sqlite`. It's the same flow: connection → command → parameters → execute/read.

Add the package to Core:

```bash
dotnet add CatalogTracker.Core package Microsoft.Data.Sqlite
```

(In VS: right-click project → *Manage NuGet Packages*. You'll see a `<PackageReference>` appear in the `.csproj`. That's your `requirements.txt`.)

### 7.1 Python vs C# side by side

```python
conn = sqlite3.connect("catalog.db")
cur = conn.cursor()
cur.execute("INSERT INTO items (id, name) VALUES (?, ?)", (1, "Hammer"))
conn.commit()
for row in cur.execute("SELECT id, name FROM items"):
    print(row[0], row[1])
```

```csharp
await using var conn = new SqliteConnection("Data Source=catalog.db");
await conn.OpenAsync();

await using var cmd = conn.CreateCommand();
cmd.CommandText = "INSERT INTO items (id, name) VALUES ($id, $name)";
cmd.Parameters.AddWithValue("$id", 1);
cmd.Parameters.AddWithValue("$name", "Hammer");
await cmd.ExecuteNonQueryAsync();

await using var read = conn.CreateCommand();
read.CommandText = "SELECT id, name FROM items";
await using var reader = await read.ExecuteReaderAsync();
while (await reader.ReadAsync())
    Console.WriteLine($"{reader.GetInt32(0)} {reader.GetString(1)}");
```

Differences to notice:
- Named parameters (`$id`) instead of `?`.
- `ExecuteNonQuery` (INSERT/UPDATE/DELETE), `ExecuteScalar` (one value), `ExecuteReader` (rows).
- You read columns **by index** with a typed getter: `GetInt32(0)`, `GetString(1)`, etc.
- **Never** build SQL by string concatenation with user input. Always use parameters (SQL injection).

### 7.2 Storage type notes (SQLite is loosely typed)

- No decimal type. We store **price as TEXT** formatted with the invariant culture, which keeps exact values. (Alternatives: integer cents, or REAL and accept float rounding.)
- No date type. We store `DateTime` as an **ISO-8601 text** string (`"O"` format).
- Tags go into one comma-separated TEXT column. (A real many-to-many table is "more correct", and an exercise.)

### 7.3 The SQLite store

```csharp
// CatalogTracker.Core/Storage/SqliteItemStore.cs
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

    public async Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"{SelectColumns} ORDER BY name";
        return await ReadItemsAsync(cmd, ct);
    }

    public async Task<Item?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"{SelectColumns} WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        var rows = await ReadItemsAsync(cmd, ct);
        return rows.FirstOrDefault();       // null if none
    }

    public async Task UpsertAsync(Item item, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await ExecuteUpsertAsync(conn, null, item, ct);
    }

    public async Task UpsertManyAsync(IEnumerable<Item> items, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        using var tx = conn.BeginTransaction();       // all-or-nothing, and MUCH faster for many rows
        foreach (var item in items)
            await ExecuteUpsertAsync(conn, tx, item, ct);
        await tx.CommitAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM items WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    // ---------- helpers ----------

    private const string SelectColumns =
        "SELECT id, name, category, price, quantity, updated, tags FROM items";

    private async Task<SqliteConnection> OpenAsync(CancellationToken ct)
    {
        var conn = new SqliteConnection(_connectionString);
        await conn.OpenAsync(ct);
        return conn;
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
}
```

Things to understand here (this is a "reading code" lesson):
- **`private const string SelectColumns`**: one place defines the column order; `ReadItemsAsync` must match it (index 0 = id, 1 = name...). Mismatch = bugs. That fragility is why ORMs exist (next chapter).
- **`SqliteTransaction? tx`** passed as null for a single upsert, or a real transaction for batches.
- `$"{SelectColumns} ORDER BY name"`: string interpolation of a *constant*, which is safe. Never interpolate user input into SQL.
- Opening a new connection per call is fine for SQLite; connections are pooled and cheap.
- `await using var conn = await OpenAsync(ct);`: `OpenAsync` returns an open connection that the caller is responsible for disposing.

### 7.4 Wire it up in the console app

```csharp
// CatalogTracker.Cli/Program.cs
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Services;
using CatalogTracker.Core.Sources;
using CatalogTracker.Core.Storage;

// Composition root: the ONLY place that knows concrete types.
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

// Edit one and save it
var first = all[0] with { Price = 99.99m, Updated = DateTime.Now };
await catalog.SaveAsync(first);
Console.WriteLine((await store.GetByIdAsync(first.Id))!.Price);
```

**Checkpoint:** run twice. The second run still shows 3 items (upsert, not duplicates). Open `catalog.db` (in `bin/Debug/net.../`) with **DB Browser for SQLite** to see your table.

### 7.5 Connecting to an *existing* SQLite database

You don't have to create the schema; just point at the file and write queries for the tables that exist:

```csharp
var store = new SqliteItemStore(@"C:\data\legacy.db");   // skip InitializeAsync()
```

Tips for existing databases:
- Inspect the schema first (DB Browser, or `SELECT sql FROM sqlite_master;`).
- Read-only access: connection string `Data Source=legacy.db;Mode=ReadOnly`.
- Mind column types: SQLite lets a "INTEGER" column hold text. `GetInt32` throws on mismatched data; check `reader.IsDBNull(i)` for nullable columns.
- Make a **copy** of the file while experimenting.
- If the DB is shared with another app, think about locking (`Cache=Shared`, short-lived connections, busy timeouts: `Default Timeout=30`).

### Exercises (Chapter 7)
1. Add `Task<IReadOnlyList<Item>> SearchAsync(string text)` to `IItemStore` and `SqliteItemStore` using `WHERE name LIKE $q` with `"%" + text + "%"`.
2. Handle a nullable column: make `category` nullable in SQL and read it with `reader.IsDBNull(2) ? "" : reader.GetString(2)`.
3. Add an `Item.Supplier` column. How many places must you edit? (That list is the argument for the next chapter.)

---

## Chapter 8: Stage 5: Entity Framework Core (explained for humans)

EF Core is C#'s ORM, like **SQLAlchemy**. If the tutorial you found was unhelpful, it probably started with migrations and jargon. Here's the minimum you need.

### 8.1 Concepts, in Python terms

| EF Core term | SQLAlchemy / what it means |
|---|---|
| **Entity** | A class mapped to a table row (a SQLAlchemy model) |
| **`DbContext`** | The `Session` + metadata: your gateway to the DB |
| **`DbSet<T>`** | A table you can query/add to (`session.query(T)`) |
| **LINQ queries** | Same `Where/OrderBy/Select` you learned, **translated to SQL** |
| **Change tracking** | EF remembers loaded entities; `SaveChanges()` writes the differences (`session.commit()`) |
| **Migrations** | Alembic: versioned schema changes (optional!) |
| **Scaffolding** | Generate entity classes **from an existing database** |

Honest take: for a small app with a handful of tables, raw ADO.NET (Ch. 7) is fine. EF shines when you have many tables and relationships or want less boilerplate. There's a middle path, **Dapper** (a tiny library: you write SQL, it maps rows to objects), worth a look later. Learn all three in order of complexity; the interface design means you can swap them without touching the rest of the app.

### 8.2 Packages

```bash
dotnet add CatalogTracker.Core package Microsoft.EntityFrameworkCore.Sqlite
dotnet add CatalogTracker.Cli  package Microsoft.EntityFrameworkCore.Design   # only needed for the dotnet-ef tooling
dotnet tool install --global dotnet-ef                                        # command line tool (once per machine)
```

### 8.3 Entity + DbContext

Design decision: the EF entity is a separate **row class** from the domain `Item`. The database shape (tags as a string, etc.) and the domain shape (tags as a list) differ, and mapping between them explicitly in one place keeps database quirks out of your app. You'll do this constantly when working with APIs and legacy databases too.

```csharp
// CatalogTracker.Core/Storage/Ef/ItemRow.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CatalogTracker.Core.Storage.Ef;

[Table("items")]
public class ItemRow
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]   // we supply ids ourselves
    [Column("id")] public int Id { get; set; }

    [Column("name")]     public string Name { get; set; } = "";
    [Column("category")] public string Category { get; set; } = "";
    [Column("price")]    public string Price { get; set; } = "0";     // TEXT in the DB (matches Ch. 7 schema)
    [Column("quantity")] public int Quantity { get; set; }
    [Column("updated")]  public string Updated { get; set; } = "";
    [Column("tags")]     public string Tags { get; set; } = "";
}
```

The attributes in `[ ]` are like Python decorators/annotations: metadata about the thing below them. Here they say which table/column each property maps to, so EF can use the **same database file** as Chapter 7.

```csharp
// CatalogTracker.Core/Storage/Ef/CatalogDbContext.cs
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

### 8.4 An `IItemStore` powered by EF

```csharp
// CatalogTracker.Core/Storage/Ef/EfItemStore.cs
using System.Globalization;
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace CatalogTracker.Core.Storage.Ef;

public class EfItemStore : IItemStore
{
    private readonly string _dbPath;

    public EfItemStore(string dbPath) => _dbPath = dbPath;

    private CatalogDbContext NewContext() => new(_dbPath);   // short-lived context per operation

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        await using var db = NewContext();
        await db.Database.EnsureCreatedAsync(ct);   // creates the file/tables if missing (no migrations)
    }

    public async Task<IReadOnlyList<Item>> GetAllAsync(CancellationToken ct = default)
    {
        await using var db = NewContext();
        var rows = await db.Items
            .AsNoTracking()                         // read-only query: skip change tracking
            .OrderBy(r => r.Name)
            .ToListAsync(ct);                       // the SQL runs here
        return rows.Select(ToItem).ToList();
    }

    public async Task<Item?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        await using var db = NewContext();
        var row = await db.Items.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        return row is null ? null : ToItem(row);
    }

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
                db.Items.Add(incoming);                                  // INSERT
            else
                db.Entry(existing).CurrentValues.SetValues(incoming);    // UPDATE changed columns
        }
        await db.SaveChangesAsync(ct);                                   // one transaction
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        await using var db = NewContext();
        await db.Items.Where(r => r.Id == id).ExecuteDeleteAsync(ct);    // single DELETE statement
    }

    // ---------- mapping: the only place that knows both shapes ----------

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

Now the payoff of Chapter 6. In `Program.cs` change **one line**:

```csharp
IItemStore store = new EfItemStore(dbPath);   // was: new SqliteItemStore(dbPath)
```

Everything else (service, source, printing) is unchanged. That's the design principle working.

### 8.5 How EF turns C# into SQL

```csharp
await db.Items.Where(r => r.Quantity < 5).OrderBy(r => r.Name).ToListAsync();
// -> SELECT ... FROM items WHERE quantity < 5 ORDER BY name
```

Only translatable expressions are allowed inside `Where`; custom C# methods may throw "could not be translated". Debug tip: add `.LogTo(Console.WriteLine)` in `OnConfiguring` to see the SQL EF generates:

```csharp
options.UseSqlite($"Data Source={_dbPath}").LogTo(Console.WriteLine, LogLevel.Information);
```
(`using Microsoft.Extensions.Logging;`)

### 8.6 Connecting EF to an existing database

Option A: **scaffold** (generate classes from the schema). From the folder with your Cli project:

```bash
dotnet ef dbcontext scaffold "Data Source=C:\data\legacy.db" Microsoft.EntityFrameworkCore.Sqlite ^
    --project CatalogTracker.Core --startup-project CatalogTracker.Cli ^
    --output-dir Storage/Legacy --context LegacyDbContext --data-annotations
```

(Use `\` instead of `^` on bash; on PowerShell use the backtick.) You get one class per table plus a context. Review the generated code. It's a great way to *learn* how mapping looks. Notes:

- Tables **without a primary key** are skipped (EF warns). You can map those by hand as **keyless** entities (`[Keyless]`) for read-only use.
- Views can be mapped as keyless entities too.
- Re-run with `--force` to regenerate after the schema changes (it overwrites your edits to those files; keep customizations in separate `partial class` files).

Option B: **hand-map** like `ItemRow` above, using `[Table]`/`[Column]`. Only map the tables and columns you need. For a legacy DB this is often cleaner.

Option C: **raw SQL into your own type** (EF 7+):

```csharp
var rows = await db.Database
    .SqlQuery<MyReportRow>($"SELECT name, SUM(quantity) AS Total FROM items GROUP BY name")
    .ToListAsync();
```
(`MyReportRow` is a plain class with matching property names. Interpolated values in `SqlQuery<T>($"...")` become safe parameters.)

### 8.7 Migrations: only if you own the schema

Migrations record schema changes as code: `dotnet ef migrations add AddSupplier`, then `dotnet ef database update`, or `db.Database.MigrateAsync()` at startup. For learning and for legacy DBs you don't own, skip them and use `EnsureCreated` (new throwaway DBs) or no schema management at all (existing DBs). **Don't mix** `EnsureCreated` and migrations in the same database.

### Exercises (Chapter 8)
1. Add a `Supplier` column. Count the files you edit in the raw-ADO store vs the EF store.
2. Use `LogTo` and watch the SQL for `GetAllAsync`.
3. Make a copy of `catalog.db`, scaffold from it, and compare the generated class to `ItemRow`.
4. Add `Task<IReadOnlyList<Item>> GetLowStockAsync()` to the EF store using `Where(r => r.Quantity < 5)`.

---

## Chapter 9: Stage 6: Wiring up the API (while keeping XML)

The plan from your situation: keep XML working while you integrate the API, fall back to XML if the API doesn't have something. With `IItemSource` this takes three small classes.

### 9.1 HTTP + JSON, in Python terms

| Python | C# |
|---|---|
| `requests.get(url, headers=...)` | `HttpClient.GetAsync(...)` / `GetFromJsonAsync<T>(...)` |
| `resp.json()` | automatic deserialization into your class |
| `resp.raise_for_status()` | `resp.EnsureSuccessStatusCode()` |
| `json.dumps(obj)` | `JsonSerializer.Serialize(obj)` |
| `session = requests.Session()` | one long-lived `HttpClient` |

`HttpClient` rules: **create one and reuse it** (don't `new HttpClient()` per request in a loop; it exhausts sockets). In bigger apps use `IHttpClientFactory`, but a single shared instance is fine for us.

### 9.2 The DTO (data transfer object)

APIs return their own shape, which won't match your `Item`. Don't contort your domain model to match every API. Make a **DTO** class that mirrors the JSON exactly, then **map** to your model.

Suppose the API returns:

```json
[
  { "item_id": 7, "title": "Saw", "group": "tools", "unit_price": 19.95, "stock": 4, "modified": "2026-03-01T10:00:00Z", "labels": ["steel"] }
]
```

```csharp
// CatalogTracker.Core/Sources/Api/ApiItemDto.cs
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

    // The ONE place that knows how API shape becomes domain shape.
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

`[JsonPropertyName("...")]` is how you map a JSON key to a C# property when the names differ (your Python equivalent: a dict key lookup).

### 9.3 The HTTP source

```csharp
// CatalogTracker.Core/Sources/Api/HttpItemSource.cs
using System.Net.Http.Json;
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Models;

namespace CatalogTracker.Core.Sources.Api;

public class HttpItemSource : IItemSource
{
    private readonly HttpClient _http;

    // BaseAddress and auth headers are configured by whoever creates the HttpClient.
    public HttpItemSource(HttpClient http) => _http = http;

    public async Task<IReadOnlyList<Item>> GetItemsAsync(CancellationToken ct = default)
    {
        var dtos = await _http.GetFromJsonAsync<List<ApiItemDto>>("items", ct)
                   ?? new List<ApiItemDto>();
        return dtos.Select(d => d.ToItem()).ToList();
    }
}
```

Create the client in the composition root:

```csharp
var http = new HttpClient { BaseAddress = new Uri("https://api.example.com/v1/") };   // trailing slash matters
http.DefaultRequestHeaders.Authorization =
    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
http.Timeout = TimeSpan.FromSeconds(15);
```

Useful variations:
```csharp
// Query string
var url = $"items?category={Uri.EscapeDataString(cat)}&page={page}";

// POST JSON
var resp = await _http.PostAsJsonAsync("items", dto, ct);
resp.EnsureSuccessStatusCode();

// Inspect raw text when debugging
string raw = await _http.GetStringAsync("items", ct);
```
`System.Text.Json` is case-sensitive by default for property names; `GetFromJsonAsync` uses web defaults (case-insensitive, camelCase), but explicit `[JsonPropertyName]` is clearer.

### 9.4 Secrets: your repo is PUBLIC

Never put tokens or private URLs in source. Options:

- **Environment variables**: `Environment.GetEnvironmentVariable("CATALOG_API_TOKEN")`. Set in your own machine/user settings, not the repo.
- **User secrets** (dev-time, stored outside the repo): `dotnet user-secrets init` / `dotnet user-secrets set "ApiToken" "abc"`. Read via the `Microsoft.Extensions.Configuration.UserSecrets` package.
- A local **`appsettings.local.json`** listed in `.gitignore`.
- Add `.gitignore` early (`dotnet new gitignore`) so `bin/`, `obj/`, `.vs/`, and `*.db` don't end up public.
- If you ever commit a secret, **rotate it**; removing it from the repo history isn't enough.

### 9.5 A practice source with no real API: JSON file

While you don't have access to the real API, practice with a file in the same shape:

```csharp
// CatalogTracker.Core/Sources/Api/JsonFileItemSource.cs
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

Put the JSON sample above in `api-sample.json` (copy to output as with the XML) and use `new JsonFileItemSource("api-sample.json")`. When the real API is ready, swap to `HttpItemSource`. The DTO and mapping code are already proven.

### 9.6 Fallback: "API first, XML if it fails"

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
        catch (HttpRequestException)          // network down, 4xx/5xx from EnsureSuccessStatusCode
        {
            return await _fallback.GetItemsAsync(ct);
        }
    }
}
```

This is the **decorator/composite** pattern: a source built out of sources. And it's still an `IItemSource`, so `CatalogService` doesn't change. A related idea: a `MergingItemSource` that takes API items and fills gaps from XML by `Id`. Try that as an exercise.

### Exercises (Chapter 9)
1. Add a second DTO field (e.g. `supplier`) and map it.
2. Write `MergingItemSource(IItemSource api, IItemSource xml)` that returns all API items plus any XML items whose `Id` isn't in the API list (hint: `HashSet<int>`).
3. Add `CancellationTokenSource` with a 5-second timeout in `Program.cs` and pass its `Token` to `SyncAsync`.

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

Now assemble everything. We'll make: a searchable list on the left, an editor on the right, and buttons for Sync, Import XML, New, Save, Delete.

### 13.1 Add sample XML to the App

Create `CatalogTracker.App/Data/sample.xml` (copy your sample from Ch. 5). Set its **Build Action = Content** and **Copy to Output Directory = Copy if newer** (Properties window), so it ships next to the exe.

### 13.2 View models

Create a folder `ViewModels`.

**ItemViewModel**: a *mutable, observable* wrapper around the immutable `Item`. This is the key trick: domain objects stay clean and immutable, while the UI edits a temporary mutable version, then converts back on Save.

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

    // NumberBox.Value is a double, so the UI side uses double and we convert at the boundary.
    [ObservableProperty] private double _price;
    [ObservableProperty] private double _quantity;

    [ObservableProperty] private string _tagsText = "";      // "steel, hand"
    [ObservableProperty] private DateTime _updated;

    public static ItemViewModel FromItem(Item item) => new()
    {
        Id = item.Id,
        _name = item.Name,
        _category = item.Category,
        _price = (double)item.Price,
        _quantity = item.Quantity,
        _tagsText = string.Join(", ", item.Tags),
        _updated = item.Updated,
    };

    public Item ToItem() => new()
    {
        Id = Id,
        Name = Name.Trim(),
        Category = Category.Trim(),
        Price = Math.Round((decimal)Price, 2),
        Quantity = (int)Quantity,
        Updated = DateTime.Now,
        Tags = TagsText
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList(),
    };
}
```

⚠️ In `FromItem` we assign the *private fields* (`_name = ...`) in an object initializer. Object initializers can't set fields of another class's private members from a static method of the same class? They can, since a static method inside the class has access to private members. It works, and avoids firing change notifications while constructing. If your IDE complains, set the generated properties (`Name = item.Name`) instead; behavior is identical for our purposes.

**MainViewModel:**

```csharp
// ViewModels/MainViewModel.cs
using System.Collections.ObjectModel;
using CatalogTracker.Core.Services;
using CatalogTracker.Core.Sources;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace CatalogTracker.App.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly CatalogService _catalog;
    private List<ItemViewModel> _all = new();           // full list; Items below is the filtered view

    public MainViewModel(CatalogService catalog)
    {
        _catalog = catalog;
    }

    public ObservableCollection<ItemViewModel> Items { get; } = new();

    [ObservableProperty] private string _searchText = "";
    [ObservableProperty] private string _status = "";
    [ObservableProperty] private bool _isBusy;

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(HasSelection))]
    [NotifyCanExecuteChangedFor(nameof(SaveCommand))]
    [NotifyCanExecuteChangedFor(nameof(DeleteCommand))]
    private ItemViewModel? _selected;

    public bool HasSelection => Selected is not null;

    // Runs automatically whenever SearchText changes (generated hook).
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
        // Pragmatic: XmlItemSource is a simple, dependency-free parser, so creating it here is OK.
        // Not everything needs DI. Use it where you need to swap or fake something.
        await RunBusyAsync(async () =>
        {
            int n = await _catalog.ImportAsync(new XmlItemSource(path));
            Status = $"Imported {n} items from {System.IO.Path.GetFileName(path)}.";
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
        Status = "New item (not saved yet).";
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
            Selected = null;
            Status = $"Deleted '{doomed.Name}'.";
        });
    }

    // ---------- helpers ----------

    private void ApplyFilter()
    {
        var keep = Selected?.Id;
        var q = SearchText.Trim();

        var filtered = _all
            .Where(i => q.Length == 0
                     || i.Name.Contains(q, StringComparison.OrdinalIgnoreCase)
                     || i.Category.Contains(q, StringComparison.OrdinalIgnoreCase))
            .OrderBy(i => i.Name)
            .ToList();

        Items.Clear();
        foreach (var i in filtered) Items.Add(i);

        Selected = Items.FirstOrDefault(i => i.Id == keep);   // try to keep the selection
    }

    // One place for the "show spinner / catch errors / hide spinner" pattern (DRY).
    private async Task RunBusyAsync(Func<Task> work)
    {
        IsBusy = true;
        try { await work(); }
        catch (Exception ex) { Status = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }
}
```

Reading guide for this class:
- Constructor takes a `CatalogService`: the dependency, supplied by DI (13.4).
- `_all` is the master list, `Items` is the filtered list the UI sees.
- Each `[RelayCommand]` becomes a command a button can bind to: `LoadCommand`, `SyncCommand`, `ImportXmlCommand`, `NewCommand`, `SaveCommand`, `DeleteCommand`.
- `Func<Task> work` is a lambda passed as an argument; `RunBusyAsync(async () => { ... })` is "run this block with the busy/error wrapper".
- No control is mentioned anywhere in this file: no `TextBox`, no `ListView`. That's what makes it testable and reusable.

### 13.3 The page

Add a **Blank Page** `MainPage.xaml`.

```xml
<!-- MainPage.xaml -->
<Page
    x:Class="CatalogTracker.App.MainPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:vm="using:CatalogTracker.App.ViewModels">

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

        <!-- Title -->
        <TextBlock Grid.Row="0" Grid.ColumnSpan="2" Text="Catalog Tracker"
                   Style="{StaticResource TitleTextBlockStyle}"/>

        <!-- Toolbar -->
        <StackPanel Grid.Row="1" Grid.ColumnSpan="2" Orientation="Horizontal" Spacing="8">
            <Button Content="New"          Command="{x:Bind ViewModel.NewCommand}"/>
            <Button Content="Sync"         Command="{x:Bind ViewModel.SyncCommand}"/>
            <Button Content="Import XML…"  Click="ImportButton_Click"/>
            <ProgressRing IsActive="{x:Bind ViewModel.IsBusy, Mode=OneWay}" Width="24" Height="24"/>
        </StackPanel>

        <!-- Left: search + list -->
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
        </Grid>

        <!-- Right: editor -->
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

                <StackPanel Orientation="Horizontal" Spacing="8">
                    <Button Content="Save" Command="{x:Bind ViewModel.SaveCommand}"
                            Style="{StaticResource AccentButtonStyle}"/>
                    <Button Content="Delete…" Click="DeleteButton_Click"/>
                </StackPanel>
            </StackPanel>
        </Border>

        <!-- Status bar -->
        <TextBlock Grid.Row="3" Grid.ColumnSpan="2"
                   Text="{x:Bind ViewModel.Status, Mode=OneWay}"
                   Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
    </Grid>
</Page>
```

Code-behind (UI-only stuff that needs windows/dialogs, because a ViewModel shouldn't touch `ContentDialog` or pickers):

```csharp
// MainPage.xaml.cs
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
        // Must exist BEFORE InitializeComponent(), because x:Bind reads it during initialization.
        ViewModel = App.Services.GetRequiredService<MainViewModel>();
        InitializeComponent();

        Loaded += async (_, _) => await ViewModel.LoadCommand.ExecuteAsync(null);
    }

    private async void ImportButton_Click(object sender, RoutedEventArgs e)
    {
        var picker = new FileOpenPicker();
        picker.FileTypeFilter.Add(".xml");

        // WinUI 3 desktop quirk: pickers must be told which window owns them.
        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
        WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);

        StorageFile? file = await picker.PickSingleFileAsync();
        if (file is null) return;                     // user cancelled

        await ViewModel.ImportXmlCommand.ExecuteAsync(file.Path);
    }

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
            XamlRoot = XamlRoot,                       // REQUIRED, or the dialog throws
        };

        if (await dialog.ShowAsync() == ContentDialogResult.Primary)
            await ViewModel.DeleteCommand.ExecuteAsync(null);
    }
}
```

### 13.4 The composition root: `App.xaml.cs`

```csharp
// App.xaml.cs
using CatalogTracker.Core.Abstractions;
using CatalogTracker.Core.Services;
using CatalogTracker.Core.Sources;
using CatalogTracker.Core.Storage;
using CatalogTracker.App.ViewModels;
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

        // "When someone asks for IItemStore, give them THIS."  <- the one line you change to swap implementations
        services.AddSingleton<IItemStore>(_ => new SqliteItemStore(dbPath));
        services.AddSingleton<IItemSource>(_ => new XmlItemSource(xmlPath));

        services.AddSingleton<CatalogService>();     // DI sees its constructor and supplies both dependencies
        services.AddTransient<MainViewModel>();      // new one each time it's requested

        return services.BuildServiceProvider();
    }
}
```

Name note: we named the static property `CurrentWindow`, not `MainWindow`, because `new MainWindow()` inside `App` would then refer to the property instead of the class and fail to compile.

**Lifetimes:** `Singleton` = one instance for the whole app, `Transient` = new each time, `Scoped` = per scope (mostly web requests; rarely used in desktop). Keep services singleton and view models transient unless you have a reason.

**DI in one sentence:** the container reads each constructor, sees what it needs, builds those first, and passes them in. When you later want the API, you change the `AddSingleton<IItemSource>` registration and *nothing else*:

```csharp
services.AddSingleton<IItemSource>(_ => new FallbackItemSource(
    primary:  new HttpItemSource(CreateHttpClient()),
    fallback: new XmlItemSource(xmlPath)));
```

### 13.5 Show `MainPage`

In `MainWindow.xaml.cs`: `RootFrame.Navigate(typeof(MainPage));`

**Checkpoint:** press F5.
1. The list is empty at first. Click **Sync**: the three sample items appear.
2. Select one, edit the name/price, click **Save**. Close and restart the app; changes persisted.
3. Type in the search box: list filters live.
4. **New** → fill in → **Save**. **Delete…** → confirm.
5. **Import XML…** → pick your own XML file.

If anything doesn't work, see Chapter 15.

### 13.6 Exercises (Chapter 13)
1. Add a "Low stock only" `CheckBox` that filters `Items` (add `[ObservableProperty] bool _lowStockOnly;` and call `ApplyFilter()` in `OnLowStockOnlyChanged`).
2. Show a total inventory value in the status bar (`_all.Sum(i => (decimal)i.Price * (decimal)i.Quantity)`).
3. Show the `Updated` date in the list rows. (Format with a static helper: `Fmt.Date(DateTime d) => d.ToString("d")`.)
4. Swap the store registration to `EfItemStore`. Does the app behave the same?
5. Switch the source to `JsonFileItemSource` for Sync.

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