// Compiled into the learner's program by the CodeLens C# tracer (Program.cs), which adds
// calls to it: L before each statement and at each loop check, Enter/Exit around each
// method, R around each returned value. It keeps a shadow call stack with each frame's
// variables, works out what changed on the heap, and writes one JSON event per step in
// the same shape as the Python and GDB tracers (trace.jsonl). The tracer host calls Start
// before the program's Main and Finish after it.
//
// It lives in its own namespace, with its usings inside it, so the learner's own type
// names (a class called Frame or Ref) can't clash with it.
#nullable disable
namespace __CodeLensRuntime
{
    using System;
    using System.Collections;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.Globalization;
    using System.IO;
    using System.Linq;
    using System.Reflection;
    using System.Runtime.CompilerServices;
    using System.Text;
    using System.Text.Encodings.Web;
    using System.Text.Json;

    public static class __CL
    {
        sealed class Frame
        {
            public string Name;
            public int Line;
            public object[] Locals = Array.Empty<object>();   // name, value, name, value, ...
            public Dictionary<string, object> Previous;      // values at this frame's last step
            public bool HasReturn;
            public object ReturnValue;
        }

        // A reference to a heap object, as {"$ref": id} in the trace.
        readonly record struct Ref(int Id);

        sealed class LimitReached : Exception
        {
            public readonly string Kind;
            public LimitReached(string kind, string message) : base(message) { Kind = kind; }
        }

        // Console output goes to the output file and is also kept until the next event, which
        // carries it as `printed` (what the step before it printed).
        sealed class Tee : TextWriter
        {
            public Tee() { NewLine = "\n"; }   // the same line endings as the other tracers
            public override Encoding Encoding => Encoding.UTF8;
            public override void Write(char value) { if (pending.Length < 20000) pending.Append(value); programOutput.Write(value); }
            public override void Write(string value) { if (value == null) return; if (pending.Length < 20000) pending.Append(value); programOutput.Write(value); }
        }

        // Console.ReadLine reads the Input box (program_input.txt, written by codelens.cjs).
        // Each line read is echoed into the output, the way a terminal shows typed text, and
        // carried by the next event as `inputRead`, like the Python tracer's.
        sealed class ScriptedIn : StringReader
        {
            public ScriptedIn(string text) : base(text) { }
            public override string ReadLine()
            {
                var line = base.ReadLine();
                if (line == null) return null;
                pendingInput.Add(line);
                Console.Out.Write(line + "\n");
                return line;
            }
        }

        static readonly List<string> pendingInput = new List<string>();
        static readonly List<Frame> stack = new List<Frame>();
        static readonly Dictionary<object, int> ids = new Dictionary<object, int>(ReferenceEqualityComparer.Instance);
        static readonly Dictionary<int, object> objects = new Dictionary<int, object>();
        static Dictionary<int, (string Type, Dictionary<string, object> Props)> previousHeap = new Dictionary<int, (string, Dictionary<string, object>)>();
        static readonly StringBuilder pending = new StringBuilder();
        static readonly JsonWriterOptions JsonOptions = new JsonWriterOptions { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
        static StreamWriter trace;
        static StreamWriter programOutput;
        static Stopwatch clock;
        static int stepId, maxSteps = 3000, maxDepth = 60, maxHeap = 200, maxItems = 40;
        static long maxMs = 15000;
        // busy: the tracer itself is running (reading a value can run the learner's code, a
        // ToString or a property); calls made meanwhile aren't steps. ghosts counts the
        // Enters skipped that way, so their Exits are skipped too.
        static bool busy, finished;
        static int ghosts;
        // An exception on its way up: its stack as it was when thrown, before the frames
        // unwind. Cleared when the program carries on (it was caught).
        static Exception inFlight;
        static string inFlightStack;
        static int inFlightLine;
        static string lastStack = "[]";
        static int lastLine;

        public static void Start(string limitsJson)
        {
            using (var limits = JsonDocument.Parse(limitsJson))
            {
                foreach (var limit in limits.RootElement.EnumerateObject())
                {
                    if (limit.Value.ValueKind != JsonValueKind.Number) continue;
                    var value = limit.Value.GetInt32();
                    switch (limit.Name)
                    {
                        case "maxSteps": maxSteps = value; break;
                        case "maxRuntimeMs": maxMs = value; break;
                        case "maxRecursionDepth": maxDepth = value; break;
                        case "maxHeapObjects": maxHeap = value; break;
                        case "maxSnapshotItems": maxItems = value; break;
                    }
                }
            }
            trace = new StreamWriter("trace.jsonl", false, new UTF8Encoding(false));
            programOutput = new StreamWriter("program_output.txt", false, new UTF8Encoding(false)) { AutoFlush = true };
            var tee = new Tee();
            Console.SetOut(tee);
            Console.SetError(tee);
            Console.SetIn(new ScriptedIn(File.Exists("program_input.txt") ? File.ReadAllText("program_input.txt") : ""));
            AppDomain.CurrentDomain.FirstChanceException += (_, e) => OnThrow(e.Exception);
            AppDomain.CurrentDomain.ProcessExit += (_, _) => Finish(null);   // Environment.Exit in the program
            clock = Stopwatch.StartNew();
        }

        // ── called by the instrumented program ──────────────────────────────────

        // `at`: where the statement starts in the source, which says which statement this is.
        public static bool L(int line, int at, params object[] locals)
        {
            if (busy || finished) return true;
            if (checkAfterUpdate == at) { checkAfterUpdate = -1; return true; }   // see U
            busy = true;
            try
            {
                inFlight = null;
                inFlightStack = null;
                if (stack.Count == 0) stack.Add(new Frame { Name = "Main" });   // top-level statements
                var frame = stack[stack.Count - 1];
                frame.Line = line;
                frame.Locals = locals ?? Array.Empty<object>();
                Emit("statement_enter", line, w => w.WriteNumber("at", at));
            }
            catch (LimitReached limit) { Stop(limit); }
            finally { busy = false; }
            return true;
        }

        public static void Enter(string name, int line, params object[] arguments)
        {
            if (finished) return;
            if (busy) { ghosts++; return; }
            busy = true;
            try
            {
                inFlight = null;
                inFlightStack = null;
                var frame = new Frame { Name = name, Line = line, Locals = arguments ?? Array.Empty<object>() };
                stack.Add(frame);
                if (stack.Count > maxDepth) throw new LimitReached("recursion", $"Recursion limit ({maxDepth} nested calls) reached");
                Emit("function_call", line, w =>
                {
                    w.WriteString("functionName", name);
                    w.WriteStartArray("args");
                    for (var i = 1; i < frame.Locals.Length; i += 2) WriteValue(w, Val(frame.Locals[i]));
                    w.WriteEndArray();
                    w.WriteStartArray("argNames");
                    for (var i = 0; i < frame.Locals.Length; i += 2) w.WriteStringValue((string)frame.Locals[i]);
                    w.WriteEndArray();
                });
            }
            catch (LimitReached limit) { Stop(limit); }
            finally { busy = false; }
        }

        public static void Exit()
        {
            if (finished) return;
            if (ghosts > 0) { ghosts--; return; }
            if (stack.Count == 0) return;
            busy = true;
            try
            {
                var frame = stack[stack.Count - 1];
                // While an exception unwinds the stack, the method isn't returning.
                if (inFlight == null)
                {
                    Emit("function_return", frame.Line, w =>
                    {
                        w.WriteString("functionName", frame.Name);
                        if (frame.HasReturn) { w.WritePropertyName("returnValue"); WriteValue(w, Val(frame.ReturnValue)); }
                    });
                }
                stack.RemoveAt(stack.Count - 1);
            }
            catch (LimitReached limit) { Stop(limit); }
            finally { busy = false; }
        }

        public static T R<T>(T value)
        {
            if (!busy && !finished && stack.Count > 0)
            {
                var frame = stack[stack.Count - 1];
                frame.HasReturn = true;
                frame.ReturnValue = value;
            }
            return value;
        }

        // A for loop's update (`i++`) and the check after it are one step, reported here,
        // before the update, so the update's effect shows on this step.
        static int checkAfterUpdate = -1;
        public static bool U(int line, int at, params object[] locals)
        {
            if (busy || finished) return true;
            L(line, at, locals);
            checkAfterUpdate = at;
            return true;
        }

        // `yield return Y(x)`: the iterator hands out x and pauses, leaving its frame.
        public static T Y<T>(T value)
        {
            R(value);
            Exit();
            return value;
        }

        static void OnThrow(Exception exception)
        {
            // Keep the first throw: rethrows on the way up (and the wrapper the tracer host's
            // reflection call adds) would report the stack after it has unwound. A step in
            // between (a catch that carries on) clears it.
            if (busy || finished || exception is LimitReached || inFlight != null) return;
            busy = true;
            try
            {
                inFlight = exception;
                inFlightStack = StackJson(out _, out _);
                inFlightLine = stack.Count > 0 ? stack[stack.Count - 1].Line : lastLine;
            }
            catch { /* best effort */ }
            finally { busy = false; }
        }

        // ── the end of the run ──────────────────────────────────────────────────

        public static void Finish(Exception failure)
        {
            if (finished) return;
            finished = true;
            busy = true;
            try
            {
                if (failure != null)
                {
                    var line = inFlightStack != null ? inFlightLine : lastLine;
                    var stackJson = inFlightStack ?? lastStack;
                    var type = failure.GetType().Name;
                    var message = SafeText(() => failure.Message);
                    WriteLine(w =>
                    {
                        w.WriteStartObject("event");
                        Header(w, "error_thrown", line);
                        w.WriteString("errorType", type);
                        w.WriteString("message", message);
                        w.WritePropertyName("stackSnapshot"); w.WriteRawValue(stackJson);
                        w.WriteStartArray("heapDelta"); w.WriteEndArray();
                        w.WriteStartArray("changes"); w.WriteEndArray();
                        Printed(w);
                        w.WriteEndObject();
                    });
                    WriteResult(w =>
                    {
                        w.WriteString("status", "runtime-error");
                        w.WriteStartObject("error");
                        w.WriteString("type", type);
                        w.WriteString("message", message);
                        if (line > 0) w.WriteNumber("line", line);
                        w.WriteEndObject();
                    });
                }
                else
                {
                    if (stepId > 0)
                    {
                        // The state at the end, like the other tracers: the last step's stack,
                        // carrying whatever the program printed after it.
                        WriteLine(w =>
                        {
                            w.WriteStartObject("event");
                            Header(w, "program_end", lastLine);
                            w.WritePropertyName("stackSnapshot"); w.WriteRawValue(lastStack);
                            w.WriteStartArray("heapDelta"); w.WriteEndArray();
                            w.WriteStartArray("changes"); w.WriteEndArray();
                            Printed(w);
                            w.WriteEndObject();
                        });
                    }
                    WriteResult(w => { w.WriteString("status", "completed"); w.WriteNull("error"); });
                }
            }
            finally
            {
                trace?.Flush();
                trace?.Dispose();
                programOutput?.Flush();
            }
        }

        static void Stop(LimitReached limit)
        {
            finished = true;
            WriteResult(w =>
            {
                w.WriteString("status", "limit");
                w.WriteNull("error");
                w.WriteStartObject("limit");
                w.WriteString("kind", limit.Kind);
                w.WriteString("message", limit.Message);
                w.WriteEndObject();
            });
            trace.Flush();
            trace.Dispose();
            programOutput.Flush();
            Environment.Exit(0);
        }

        static void WriteResult(Action<Utf8JsonWriter> body) => WriteLine(w =>
        {
            w.WriteStartObject("result");
            body(w);
            w.WriteEndObject();
        });

        // ── events ──────────────────────────────────────────────────────────────

        static void Header(Utf8JsonWriter w, string type, int line)
        {
            w.WriteNumber("stepId", stepId++);
            w.WriteString("type", type);
            w.WriteString("language", "csharp");
            if (line > 0)
            {
                w.WriteNumber("line", line);
                w.WriteStartObject("sourceLocation");
                w.WriteNumber("line", line);
                w.WriteEndObject();
            }
        }

        static void Printed(Utf8JsonWriter w)
        {
            if (pendingInput.Count > 0)
            {
                w.WriteStartArray("inputRead");
                foreach (var line in pendingInput) w.WriteStringValue(line);
                w.WriteEndArray();
                pendingInput.Clear();
            }
            if (pending.Length == 0) return;
            w.WriteString("printed", pending.ToString());
            pending.Clear();
        }

        static void Emit(string type, int line, Action<Utf8JsonWriter> extra)
        {
            if (stepId >= maxSteps) throw new LimitReached("steps", $"Step limit ({maxSteps} steps) reached: possibly a loop that never ends");
            if (clock.ElapsedMilliseconds > maxMs) throw new LimitReached("timeout", $"Runtime limit ({maxMs / 1000} s) reached: possibly a loop that never ends");

            var stackJson = StackJson(out var roots, out var topValues);
            var top = stack.Count > 0 ? stack[stack.Count - 1] : null;
            WriteLine(w =>
            {
                w.WriteStartObject("event");
                Header(w, type, line);
                w.WritePropertyName("stackSnapshot");
                w.WriteRawValue(stackJson);
                w.WritePropertyName("heapDelta");
                WriteHeapDelta(w, roots);
                w.WriteStartArray("changes");
                // What changed in this frame since its last step (the Python tracer's `changes`).
                if (type == "statement_enter" && top?.Previous != null)
                {
                    foreach (var (name, value) in topValues)
                    {
                        var isNew = !top.Previous.TryGetValue(name, out var old);
                        if (!isNew && Equals(old, value)) continue;
                        w.WriteStartObject();
                        w.WriteString("name", name);
                        if (!isNew) { w.WritePropertyName("oldValue"); WriteValue(w, old); }
                        w.WritePropertyName("newValue"); WriteValue(w, value);
                        w.WriteBoolean("isNew", isNew);
                        w.WriteEndObject();
                    }
                }
                w.WriteEndArray();
                Printed(w);
                extra?.Invoke(w);
                w.WriteEndObject();
            });
            if (top != null && type != "function_return") top.Previous = topValues;
            if (stepId % 50 == 0) trace.Flush();
            lastStack = stackJson;
            lastLine = line;
        }

        static void WriteLine(Action<Utf8JsonWriter> body)
        {
            var buffer = new MemoryStream();
            using (var w = new Utf8JsonWriter(buffer, JsonOptions))
            {
                w.WriteStartObject();
                body(w);
                w.WriteEndObject();
            }
            trace.WriteLine(Encoding.UTF8.GetString(buffer.ToArray()));
        }

        // The call stack, outermost frame first; each frame's variables as plain values or
        // {"$ref": id}. roots: the objects the variables refer to, where the heap walk starts.
        static string StackJson(out List<Ref> roots, out Dictionary<string, object> topValues)
        {
            roots = new List<Ref>();
            topValues = new Dictionary<string, object>();
            var buffer = new MemoryStream();
            using (var w = new Utf8JsonWriter(buffer, JsonOptions))
            {
                w.WriteStartArray();
                for (var f = 0; f < stack.Count; f++)
                {
                    var frame = stack[f];
                    w.WriteStartObject();
                    w.WriteString("name", frame.Name);
                    w.WriteNumber("line", frame.Line);
                    w.WriteStartObject("locals");
                    for (var i = 0; i + 1 < frame.Locals.Length; i += 2)
                    {
                        var name = (string)frame.Locals[i];
                        var value = Val(frame.Locals[i + 1]);
                        if (value is Ref r) roots.Add(r);
                        if (f == stack.Count - 1) topValues[name] = value;
                        w.WritePropertyName(name);
                        WriteValue(w, value);
                    }
                    w.WriteEndObject();
                    w.WriteEndObject();
                }
                w.WriteEndArray();
            }
            return Encoding.UTF8.GetString(buffer.ToArray());
        }

        // ── heap ────────────────────────────────────────────────────────────────

        // Changes since the last step to the objects reachable from the variables: create,
        // mutate (oldValue left out for a property that is new), delete, free.
        static void WriteHeapDelta(Utf8JsonWriter w, List<Ref> roots)
        {
            var current = new Dictionary<int, (string Type, Dictionary<string, object> Props)>();
            var queue = new Queue<Ref>(roots);
            while (queue.Count > 0 && current.Count < maxHeap)
            {
                var r = queue.Dequeue();
                if (current.ContainsKey(r.Id)) continue;
                var target = objects[r.Id];
                var props = Props(target);
                current[r.Id] = (TypeName(target.GetType()), props);
                foreach (var value in props.Values)
                    if (value is Ref inner && !current.ContainsKey(inner.Id)) queue.Enqueue(inner);
            }

            w.WriteStartArray();
            foreach (var (id, (type, props)) in current)
            {
                if (!previousHeap.TryGetValue(id, out var old))
                {
                    w.WriteStartObject();
                    w.WriteString("op", "create");
                    w.WriteNumber("objectId", id);
                    w.WriteString("objectType", type);
                    w.WriteStartObject("properties");
                    foreach (var (name, value) in props) { w.WritePropertyName(name); WriteValue(w, value); }
                    w.WriteEndObject();
                    w.WriteEndObject();
                    continue;
                }
                foreach (var (name, value) in props)
                {
                    var existed = old.Props.TryGetValue(name, out var before);
                    if (existed && Equals(before, value)) continue;
                    w.WriteStartObject();
                    w.WriteString("op", "mutate");
                    w.WriteNumber("objectId", id);
                    w.WriteString("objectType", type);
                    w.WriteString("property", name);
                    if (existed) { w.WritePropertyName("oldValue"); WriteValue(w, before); }
                    w.WritePropertyName("newValue"); WriteValue(w, value);
                    w.WriteEndObject();
                }
                foreach (var name in old.Props.Keys)
                {
                    if (props.ContainsKey(name)) continue;
                    w.WriteStartObject();
                    w.WriteString("op", "delete");
                    w.WriteNumber("objectId", id);
                    w.WriteString("objectType", type);
                    w.WriteString("property", name);
                    w.WriteEndObject();
                }
            }
            foreach (var id in previousHeap.Keys)
            {
                if (current.ContainsKey(id)) continue;
                w.WriteStartObject();
                w.WriteString("op", "free");
                w.WriteNumber("objectId", id);
                w.WriteEndObject();
            }
            w.WriteEndArray();
            previousHeap = current;
        }

        static Dictionary<string, object> Props(object target)
        {
            var props = new Dictionary<string, object>();
            try
            {
                switch (target)
                {
                    case Array array when array.Rank == 1:
                        for (var i = 0; i < Math.Min(array.Length, maxItems); i++) props[i.ToString(CultureInfo.InvariantCulture)] = Val(array.GetValue(i));
                        More(props, array.Length);
                        break;
                    case Array array:
                        var index = 0;
                        foreach (var item in array) { if (index >= maxItems) break; props[(index++).ToString(CultureInfo.InvariantCulture)] = Val(item); }
                        More(props, array.Length);
                        break;
                    case StringBuilder builder:
                        props["text"] = Shorten(builder.ToString());
                        break;
                    case Exception exception:
                        props["Message"] = SafeText(() => exception.Message);
                        break;
                    case IDictionary dictionary:
                        foreach (DictionaryEntry entry in dictionary)
                        {
                            if (props.Count >= maxItems) break;
                            props[KeyText(entry.Key)] = Val(entry.Value);
                        }
                        More(props, dictionary.Count);
                        break;
                    case IList list:
                        for (var i = 0; i < Math.Min(list.Count, maxItems); i++) props[i.ToString(CultureInfo.InvariantCulture)] = Val(list[i]);
                        More(props, list.Count);
                        break;
                    case IEnumerable sequence when IsCollection(target.GetType()):
                        var position = 0;
                        foreach (var item in sequence) { if (position >= maxItems) break; props[(position++).ToString(CultureInfo.InvariantCulture)] = Val(item); }
                        break;
                    default:
                        // The learner's own class: its fields, including those behind auto-properties
                        // (<Name>k__BackingField) and a primary constructor's captured parameters (<x>P).
                        for (var type = target.GetType(); type != null && type != typeof(object) && !IsSystem(type); type = type.BaseType)
                        {
                            foreach (var field in type.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly))
                            {
                                var name = field.Name;
                                if (name.StartsWith("<"))
                                {
                                    var close = name.IndexOf('>');
                                    if (close <= 1 || !(name.EndsWith("k__BackingField") || name.EndsWith(">P"))) continue;
                                    name = name.Substring(1, close - 1);
                                }
                                if (props.Count >= maxItems) break;
                                if (!props.ContainsKey(name)) props[name] = Val(field.GetValue(target));
                            }
                        }
                        break;
                }
            }
            catch { /* a collection changed while being read, or a value that can't be read */ }
            return props;
        }

        static void More(Dictionary<string, object> props, int count)
        {
            if (count > maxItems) props["…"] = $"{count - maxItems} more";
        }

        static bool IsSystem(Type type) =>
            type.Namespace != null && (type.Namespace == "System" || type.Namespace.StartsWith("System.") || type.Namespace.StartsWith("Microsoft."));

        // Collections whose items can be read without running anything: HashSet, Queue, Stack,
        // LinkedList... Not LINQ queries, which run the query (and its lambdas) when enumerated.
        static bool IsCollection(Type type) =>
            !(type.Namespace ?? "").StartsWith("System.Linq") &&
            (typeof(ICollection).IsAssignableFrom(type) || type.GetInterfaces().Any(i => i.IsGenericType &&
                (i.GetGenericTypeDefinition() == typeof(ICollection<>) || i.GetGenericTypeDefinition() == typeof(IReadOnlyCollection<>))));

        static int IdOf(object target)
        {
            if (ids.TryGetValue(target, out var id)) return id;
            id = ids.Count + 1;
            ids[target] = id;
            objects[id] = target;
            return id;
        }

        // A value as the trace shows it: null, a bool, a number, a string, or a Ref to a heap
        // object. Value types that aren't numbers (structs, tuples, DateTime) are shown as text.
        static object Val(object value)
        {
            switch (value)
            {
                case null: return null;
                case string s: return Shorten(s);
                case bool b: return b;
                case char c: return c.ToString();
                case sbyte or byte or short or ushort or int or uint or long: return Convert.ToInt64(value, CultureInfo.InvariantCulture);
                case ulong u: return u <= long.MaxValue ? (object)(long)u : u.ToString(CultureInfo.InvariantCulture);
                case float f: return Number(double.Parse(f.ToString("R", CultureInfo.InvariantCulture), CultureInfo.InvariantCulture));
                case double d: return Number(d);
                case decimal m: return (double)m;
                case Enum e: return $"{e.GetType().Name}.{e}";
                // A lambda's method has a compiler-made name like <Main>b__0_1.
                case Delegate d: return d.Method.Name.Contains('<') ? "[Function: (lambda)]" : $"[Function: {d.Method.Name}]";
                case Type t: return $"[Class: {TypeName(t)}]";
            }
            var type = value.GetType();
            if (type.IsValueType) return Preview(value, 0);
            if ((type.Namespace ?? "").StartsWith("System.Linq")) return "a LINQ query (it runs when something loops over it)";
            if (value is Array || value is IDictionary || value is IList || value is StringBuilder || value is Exception
                || !IsSystem(type) || (value is IEnumerable && IsCollection(type)))
                return new Ref(IdOf(value));
            return TypeName(type);   // another library object (a Random, a Task): its type is what matters
        }

        static object Number(double d) => double.IsFinite(d) ? d : d.ToString(CultureInfo.InvariantCulture);

        // Text for a value inside a struct or a tuple, or a dictionary key.
        static string Preview(object value, int depth)
        {
            switch (value)
            {
                case null: return "null";
                case string s: return "\"" + Shorten(s) + "\"";
                case char c: return "'" + c + "'";
                case bool b: return b ? "true" : "false";
                case IFormattable when value.GetType().IsPrimitive || value is decimal: return ((IFormattable)value).ToString(null, CultureInfo.InvariantCulture);
                case Enum e: return $"{e.GetType().Name}.{e}";
            }
            var type = value.GetType();
            if (depth > 2) return TypeName(type);
            if (value is ITuple tuple)
            {
                var items = new List<string>();
                for (var i = 0; i < tuple.Length; i++) items.Add(Preview(tuple[i], depth + 1));
                return "(" + string.Join(", ", items) + ")";
            }
            if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(KeyValuePair<,>))
                return $"[{Preview(type.GetProperty("Key").GetValue(value), depth + 1)}, {Preview(type.GetProperty("Value").GetValue(value), depth + 1)}]";
            if (!type.IsValueType) return TypeName(type);
            if (IsSystem(type)) return SafeText(() => Convert.ToString(value, CultureInfo.InvariantCulture));
            // The learner's own struct: its fields.
            var fields = type.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                .Select(f => (Name: f.Name.StartsWith("<") && f.Name.IndexOf('>') > 1 ? f.Name.Substring(1, f.Name.IndexOf('>') - 1) : f.Name, Field: f))
                .Select(x => $"{x.Name} = {Preview(x.Field.GetValue(value), depth + 1)}");
            return $"{TypeName(type)} {{ {string.Join(", ", fields)} }}";
        }

        static string KeyText(object key) => key is string s ? s : Preview(key, 0);

        static string Shorten(string s) => s.Length <= 300 ? s : s.Substring(0, 299) + "…";

        static string SafeText(Func<string> read)
        {
            try { return read() ?? ""; } catch { return ""; }
        }

        static readonly Dictionary<Type, string> Aliases = new Dictionary<Type, string>
        {
            [typeof(int)] = "int", [typeof(long)] = "long", [typeof(short)] = "short", [typeof(byte)] = "byte",
            [typeof(sbyte)] = "sbyte", [typeof(uint)] = "uint", [typeof(ulong)] = "ulong", [typeof(ushort)] = "ushort",
            [typeof(double)] = "double", [typeof(float)] = "float", [typeof(decimal)] = "decimal", [typeof(bool)] = "bool",
            [typeof(char)] = "char", [typeof(string)] = "string", [typeof(object)] = "object",
        };

        // The type as it's written in C#: List<int>, int[], Dictionary<string, int>.
        static string TypeName(Type type)
        {
            if (Aliases.TryGetValue(type, out var alias)) return alias;
            if (type.IsArray) return TypeName(type.GetElementType()) + "[" + new string(',', type.GetArrayRank() - 1) + "]";
            if (type.Name.StartsWith("<>f__AnonymousType")) return "anonymous object";
            var underlying = Nullable.GetUnderlyingType(type);
            if (underlying != null) return TypeName(underlying) + "?";
            if (!type.IsGenericType) return type.Name;
            var name = type.Name;
            var tick = name.IndexOf('`');
            if (tick > 0) name = name.Substring(0, tick);
            return name + "<" + string.Join(", ", type.GetGenericArguments().Select(TypeName)) + ">";
        }

        static void WriteValue(Utf8JsonWriter w, object value)
        {
            switch (value)
            {
                case null: w.WriteNullValue(); break;
                case bool b: w.WriteBooleanValue(b); break;
                case long l: w.WriteNumberValue(l); break;
                case double d: w.WriteNumberValue(d); break;
                case string s: w.WriteStringValue(s); break;
                case Ref r:
                    w.WriteStartObject();
                    w.WriteNumber("$ref", r.Id);
                    w.WriteEndObject();
                    break;
                default: w.WriteStringValue(Convert.ToString(value, CultureInfo.InvariantCulture)); break;
            }
        }
    }
}
