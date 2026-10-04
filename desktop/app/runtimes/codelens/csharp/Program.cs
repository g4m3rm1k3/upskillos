// CodeLens tracer for C#, desktop app only (desktop/app/runtimes/codelens.cjs builds and runs it).
//
// .NET has no command-line debugger that ships with the SDK the way GDB ships with GCC, so
// instead of stepping a debugger this program rewrites the learner's code: before every
// statement it inserts a call that reports the line and the values of the variables that
// exist there (TraceRuntime.cs), wraps each method in a call/return pair, and wraps loop
// conditions so every check is a step. The result is compiled in memory with the SDK's own
// C# compiler (Roslyn, referenced from the SDK folder, so nothing is downloaded) and run
// in this process.
//
// Usage: CodeLensTracer <source file>, in the run directory. Writes, in that directory:
//   trace.jsonl         one {"event": ...} per step, then {"result": ...} (TraceRuntime.cs)
//   program_output.txt  everything the program printed
//   statements.json     statement position -> what kind of statement it is, for the
//                       explanations (each step reports the position of its statement:
//                       one line can hold two, as in `if (x) return;`)
// Limits come from the CODELENS_LIMITS environment variable (JSON).
using System.Collections.Immutable;
using System.Reflection;
using System.Runtime.Loader;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

static class Host
{
    // The usings a new `dotnet new console` project gets implicitly, so short programs that
    // rely on them (Console, List<T>, LINQ) compile here too.
    const string GlobalUsings = """
        global using System;
        global using System.Collections.Generic;
        global using System.IO;
        global using System.Linq;
        global using System.Net.Http;
        global using System.Threading;
        global using System.Threading.Tasks;
        """;

    static readonly JsonSerializerOptions Json = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    static int Main(string[] args)
    {
        var limits = Environment.GetEnvironmentVariable("CODELENS_LIMITS") ?? "{}";
        try
        {
            var source = File.ReadAllText(args[0]);
            var parse = new CSharpParseOptions(LanguageVersion.Preview);
            var userTree = CSharpSyntaxTree.ParseText(source, parse, path: "Program.cs", encoding: Encoding.UTF8);
            var usingsTree = CSharpSyntaxTree.ParseText(GlobalUsings, parse, path: "GlobalUsings.cs");
            var options = new CSharpCompilationOptions(OutputKind.ConsoleApplication,
                optimizationLevel: OptimizationLevel.Debug, nullableContextOptions: NullableContextOptions.Enable);
            var compilation = CSharpCompilation.Create("Program", [userTree, usingsTree], References(), options);

            // The learner's own compile errors, against their own line numbers.
            var errors = compilation.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error).ToList();
            if (errors.Count > 0)
            {
                WriteResult(CompileError(errors, "CompileError"));
                return 0;
            }

            File.WriteAllText("statements.json", Statements.Collect(userTree, source).ToJsonString(Json));

            var model = compilation.GetSemanticModel(userTree);
            var instrumentedRoot = (CSharpSyntaxNode)new Instrumenter(model).Visit(userTree.GetRoot());
            var instrumentedTree = CSharpSyntaxTree.Create(instrumentedRoot, parse, path: "Program.cs", encoding: Encoding.UTF8);
            var runtimeSource = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "TraceRuntime.cs"));
            var runtimeTree = CSharpSyntaxTree.ParseText(runtimeSource, parse, path: "TraceRuntime.cs");
            var instrumented = compilation.ReplaceSyntaxTree(userTree, instrumentedTree).AddSyntaxTrees(runtimeTree);

            using var image = new MemoryStream();
            var emitted = instrumented.Emit(image);
            if (!emitted.Success)
            {
                // The learner's program compiled, so this is CodeLens's rewrite failing on a
                // construct it doesn't handle yet.
                WriteResult(CompileError(emitted.Diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error).ToList(), "TracerError",
                    "CodeLens could not add tracing to this program (it compiles fine on its own). Details: "));
                return 0;
            }
            image.Position = 0;
            var assembly = AssemblyLoadContext.Default.LoadFromStream(image);
            var runtime = assembly.GetType("__CodeLensRuntime.__CL")!;
            runtime.GetMethod("Start")!.Invoke(null, [limits]);

            Exception? failure = null;
            try
            {
                var entry = assembly.EntryPoint!;
                var returned = entry.Invoke(null, entry.GetParameters().Length == 0 ? null : [Array.Empty<string>()]);
                if (returned is Task task) task.GetAwaiter().GetResult();
            }
            catch (TargetInvocationException e) { failure = e.InnerException ?? e; }
            catch (Exception e) { failure = e; }
            runtime.GetMethod("Finish")!.Invoke(null, [failure]);
            return 0;
        }
        catch (Exception e)
        {
            WriteResult(new JsonObject
            {
                ["status"] = "runtime-error",
                ["error"] = new JsonObject { ["type"] = "TracerError", ["message"] = $"The C# tracer failed: {e.Message}" },
            });
            return 1;
        }
    }

    // The framework this tracer runs on: the same assemblies the learner's program will use.
    static List<MetadataReference> References()
    {
        var frameworkDir = Path.GetDirectoryName(typeof(object).Assembly.Location)!;
        var trusted = ((string)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")!).Split(Path.PathSeparator);
        return trusted
            .Where(p => string.Equals(Path.GetDirectoryName(p), frameworkDir, StringComparison.OrdinalIgnoreCase))
            .Select(p => (MetadataReference)MetadataReference.CreateFromFile(p))
            .ToList();
    }

    static JsonObject CompileError(List<Diagnostic> errors, string type, string prefix = "")
    {
        var shown = errors.Where(d => d.Location.SourceTree?.FilePath == "Program.cs").DefaultIfEmpty(errors.FirstOrDefault()).Take(5).ToList();
        var lines = shown.Where(d => d is not null).Select(d =>
        {
            var line = d!.Location.GetLineSpan().StartLinePosition.Line + 1;
            return $"Line {line}: {d.Id}: {d.GetMessage()}";
        });
        var first = shown.FirstOrDefault();
        var error = new JsonObject { ["type"] = type, ["message"] = prefix + string.Join("\n", lines) };
        if (first is not null && type == "CompileError") error["line"] = first.Location.GetLineSpan().StartLinePosition.Line + 1;
        return new JsonObject { ["status"] = type == "CompileError" ? "syntax-error" : "runtime-error", ["error"] = error };
    }

    static void WriteResult(JsonObject result) =>
        File.WriteAllText("trace.jsonl", new JsonObject { ["result"] = result }.ToJsonString(Json) + "\n");
}

// What kind of statement each statement is, keyed by its position in the source, with the same kinds and fields as the Python tracer
// (codelens_tracer.py statement_info), so one explainer (explainTrace.ts) serves C# too.
static class Statements
{
    static int Line(SyntaxNode node) => node.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
    static int Line(SyntaxToken token) => token.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
    static int EndLine(SyntaxNode node) => node.GetLocation().GetLineSpan().EndLinePosition.Line + 1;

    // A block's statements run from its first statement to its closing brace.
    static JsonArray Span(StatementSyntax statement) => statement is BlockSyntax block
        ? new JsonArray(block.Statements.Count > 0 ? Line(block.Statements[0]) : Line(block), EndLine(block))
        : new JsonArray(Line(statement), EndLine(statement));

    static readonly Dictionary<SyntaxKind, string> AugOperators = new()
    {
        [SyntaxKind.AddAssignmentExpression] = "Add", [SyntaxKind.SubtractAssignmentExpression] = "Sub",
        [SyntaxKind.MultiplyAssignmentExpression] = "Mult", [SyntaxKind.DivideAssignmentExpression] = "Div",
        [SyntaxKind.ModuloAssignmentExpression] = "Mod", [SyntaxKind.OrAssignmentExpression] = "BitOr",
        [SyntaxKind.AndAssignmentExpression] = "BitAnd", [SyntaxKind.ExclusiveOrAssignmentExpression] = "BitXor",
    };

    static JsonArray Names(IEnumerable<string> names) => new(names.Select(n => (JsonNode)n).ToArray());

    static IEnumerable<string> Designated(SyntaxNode node) =>
        node.DescendantNodesAndSelf().OfType<SingleVariableDesignationSyntax>().Select(d => d.Identifier.Text);

    public static JsonObject Collect(SyntaxTree tree, string source)
    {
        var lines = source.Split('\n');
        var result = new JsonObject();
        string Code(int line)
        {
            var code = (line - 1 < lines.Length ? lines[line - 1] : "").Trim();
            return code.Length <= 120 ? code : code[..119] + "…";
        }
        void Add(SyntaxNode node, int line, JsonObject info)
        {
            var key = node.SpanStart.ToString();
            if (result.ContainsKey(key)) return;
            info["code"] = Code(line);
            result[key] = info;
        }

        // `int Square(int x) => x * x;`: the body is a single returned value.
        foreach (var arrow in tree.GetRoot().DescendantNodes().OfType<ArrowExpressionClauseSyntax>())
        {
            var returnsVoid = arrow.Parent switch
            {
                MethodDeclarationSyntax method => method.ReturnType is PredefinedTypeSyntax { Keyword.RawKind: (int)SyntaxKind.VoidKeyword },
                LocalFunctionStatementSyntax local => local.ReturnType is PredefinedTypeSyntax { Keyword.RawKind: (int)SyntaxKind.VoidKeyword },
                ConstructorDeclarationSyntax => true,
                AccessorDeclarationSyntax accessor => !accessor.IsKind(SyntaxKind.GetAccessorDeclaration),
                _ => false,
            };
            // `void Move(int dx) => X += dx;` is a statement; `int Square(int x) => x * x;` returns.
            if (returnsVoid) Add(arrow.Expression, Line(arrow.Expression), Expression(arrow.Expression));
            else if (arrow.Parent is MethodDeclarationSyntax or LocalFunctionStatementSyntax or PropertyDeclarationSyntax or IndexerDeclarationSyntax or AccessorDeclarationSyntax or OperatorDeclarationSyntax)
                Add(arrow.Expression, Line(arrow.Expression), new() { ["kind"] = "Return", ["expression"] = arrow.Expression.ToString() });
        }

        foreach (var statement in tree.GetRoot().DescendantNodes().OfType<StatementSyntax>())
        {
            var line = Line(statement);
            switch (statement)
            {
                case LocalDeclarationStatementSyntax declaration:
                    Add(statement, line, new() { ["kind"] = "Assign", ["targets"] = Names(declaration.Declaration.Variables.Select(v => v.Identifier.Text)) });
                    break;
                case ExpressionStatementSyntax { Expression: var expression }:
                    Add(statement, line, Expression(expression));
                    break;
                case IfStatementSyntax ifStatement:
                    var info = new JsonObject
                    {
                        ["kind"] = "If", ["condition"] = ifStatement.Condition.ToString(),
                        ["body"] = Span(ifStatement.Statement), ["isElif"] = ifStatement.Parent is ElseClauseSyntax,
                    };
                    if (ifStatement.Else is not null) info["orelse"] = Span(ifStatement.Else.Statement);
                    Add(statement, line, info);
                    break;
                case ForStatementSyntax loop:
                    Add(statement, line, new()
                    {
                        ["kind"] = "CFor",
                        ["init"] = loop.Declaration?.ToString() ?? string.Join(", ", loop.Initializers),
                        ["condition"] = loop.Condition?.ToString() ?? "true",
                        ["update"] = string.Join(", ", loop.Incrementors),
                        ["body"] = Span(loop.Statement),
                    });
                    break;
                case ForEachStatementSyntax loop:
                    Add(statement, line, new() { ["kind"] = "For", ["targets"] = Names([loop.Identifier.Text]), ["iterable"] = loop.Expression.ToString(), ["body"] = Span(loop.Statement) });
                    break;
                case ForEachVariableStatementSyntax loop:
                    Add(statement, line, new() { ["kind"] = "For", ["targets"] = Names(Designated(loop.Variable)), ["iterable"] = loop.Expression.ToString(), ["body"] = Span(loop.Statement) });
                    break;
                case WhileStatementSyntax loop:
                    Add(statement, line, new() { ["kind"] = "While", ["condition"] = loop.Condition.ToString(), ["body"] = Span(loop.Statement) });
                    break;
                case DoStatementSyntax loop:
                    // Its condition is checked at the `while (...)` line, after each pass.
                    Add(statement, Line(loop.WhileKeyword), new() { ["kind"] = "While", ["condition"] = loop.Condition.ToString(), ["body"] = Span(loop.Statement) });
                    break;
                case ReturnStatementSyntax ret:
                    var returnInfo = new JsonObject { ["kind"] = "Return" };
                    if (ret.Expression is not null) returnInfo["expression"] = ret.Expression.ToString();
                    Add(statement, line, returnInfo);
                    break;
                case BreakStatementSyntax:
                    Add(statement, line, new() { ["kind"] = "Break" });
                    break;
                case ContinueStatementSyntax:
                    Add(statement, line, new() { ["kind"] = "Continue" });
                    break;
                case YieldStatementSyntax yielded:
                    Add(statement, line, yielded.Expression is null ? new() { ["kind"] = "Break" } : new() { ["kind"] = "Yield", ["expression"] = yielded.Expression.ToString() });
                    break;
                case SwitchStatementSyntax choice:
                    Add(statement, line, new() { ["kind"] = "Switch", ["expression"] = choice.Expression.ToString() });
                    break;
                case ThrowStatementSyntax thrown:
                    Add(statement, line, new() { ["kind"] = "Raise", ["expression"] = thrown.Expression?.ToString() ?? "" });
                    break;
            }
        }
        return result;
    }

    static JsonObject Expression(ExpressionSyntax expression)
    {
        switch (expression)
        {
            case AssignmentExpressionSyntax assignment when assignment.IsKind(SyntaxKind.SimpleAssignmentExpression):
                var targets = assignment.Left switch
                {
                    TupleExpressionSyntax tuple => tuple.Arguments.Select(a => a.Expression is DeclarationExpressionSyntax d ? string.Join(", ", Designated(d)) : a.Expression.ToString()),
                    DeclarationExpressionSyntax declaration => Designated(declaration),
                    var left => [left.ToString()],
                };
                return new() { ["kind"] = "Assign", ["targets"] = Names(targets) };
            case AssignmentExpressionSyntax assignment:
                return new()
                {
                    ["kind"] = "AugAssign", ["targets"] = Names([assignment.Left.ToString()]),
                    ["operator"] = AugOperators.TryGetValue(assignment.Kind(), out var op) ? op : assignment.OperatorToken.Text,
                };
            case PostfixUnaryExpressionSyntax { RawKind: (int)SyntaxKind.PostIncrementExpression or (int)SyntaxKind.PostDecrementExpression } unary:
                return new() { ["kind"] = "AugAssign", ["targets"] = Names([unary.Operand.ToString()]), ["operator"] = unary.IsKind(SyntaxKind.PostIncrementExpression) ? "Increment" : "Decrement" };
            case PrefixUnaryExpressionSyntax { RawKind: (int)SyntaxKind.PreIncrementExpression or (int)SyntaxKind.PreDecrementExpression } unary:
                return new() { ["kind"] = "AugAssign", ["targets"] = Names([unary.Operand.ToString()]), ["operator"] = unary.IsKind(SyntaxKind.PreIncrementExpression) ? "Increment" : "Decrement" };
            case InvocationExpressionSyntax call:
                return Call(call);
            case AwaitExpressionSyntax { Expression: InvocationExpressionSyntax call }:
                return Call(call);
            default:
                return new() { ["kind"] = "Expr" };
        }
    }

    static JsonObject Call(InvocationExpressionSyntax call)
    {
        var callee = call.Expression.ToString();
        var info = new JsonObject { ["kind"] = "Expr", ["call"] = callee };
        if (callee is "Console.WriteLine" or "Console.Write" or "System.Console.WriteLine" or "System.Console.Write") info["prints"] = true;
        return info;
    }
}

// Adds the tracing calls. Every decision about which variables can be read at a point comes
// from the compiler's own analysis of the learner's program (the semantic model), so the
// added code always compiles: a variable is only read where the compiler agrees it
// definitely has a value.
sealed class Instrumenter(SemanticModel model) : CSharpSyntaxRewriter
{
    const string CL = "global::__CodeLensRuntime.__CL";

    static int LineOf(SyntaxNode node) => node.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
    static int LineOf(SyntaxToken token) => token.GetLocation().GetLineSpan().StartLinePosition.Line + 1;

    static bool Readable(ITypeSymbol? type) =>
        type is not null and not IErrorTypeSymbol && !type.IsRefLikeType && type.TypeKind is not (TypeKind.Pointer or TypeKind.FunctionPointer);

    static ITypeSymbol? TypeOf(ISymbol symbol) => symbol switch { ILocalSymbol l => l.Type, IParameterSymbol p => p.Type, _ => null };

    // `, "name", (object)@name, ...` for the variables of this method that have a value at `at`.
    string Locals(SyntaxNode at)
    {
        var position = at.SpanStart;
        var enclosing = model.GetEnclosingSymbol(position);
        ImmutableArray<ISymbol> assigned;
        try
        {
            var flow = at switch
            {
                ExpressionSyntax expression => model.AnalyzeDataFlow(expression),
                StatementSyntax statement => model.AnalyzeDataFlow(statement),
                _ => null,
            };
            if (flow is null || !flow.Succeeded) return ThisArgument(enclosing);
            assigned = flow.DefinitelyAssignedOnEntry;
        }
        catch
        {
            return ThisArgument(enclosing);
        }

        var visible = model.LookupSymbols(position)
            .Where(s => s is ILocalSymbol or IParameterSymbol)
            .Where(s => SymbolEqualityComparer.Default.Equals(s.ContainingSymbol, enclosing))
            // The `args` a top-level program gets without declaring it.
            .Where(s => !(s.IsImplicitlyDeclared && s.ContainingSymbol.Name == "<Main>$"))
            .Where(s => Readable(TypeOf(s)))
            .Where(s => s is ILocalSymbol { IsConst: true }
                || (s is IParameterSymbol p && p.RefKind != RefKind.Out)
                || assigned.Contains(s, SymbolEqualityComparer.Default))
            .OrderBy(s => s is IParameterSymbol ? 0 : 1)
            .ThenBy(s => s.Locations.FirstOrDefault()?.SourceSpan.Start ?? 0);

        var text = new StringBuilder();
        foreach (var symbol in visible) text.Append($", \"{symbol.Name}\", (object)@{symbol.Name}");
        text.Append(ThisArgument(enclosing));
        return text.ToString();
    }

    // In a method of a class, the object it was called on.
    // A local function has `this` only when the method it sits in does.
    static string ThisArgument(ISymbol? enclosing)
    {
        var method = enclosing as IMethodSymbol;
        while (method is { MethodKind: MethodKind.LocalFunction, IsStatic: false }) method = method.ContainingSymbol as IMethodSymbol;
        return method is { IsStatic: false, MethodKind: not (MethodKind.LambdaMethod or MethodKind.LocalFunction), ContainingType.TypeKind: TypeKind.Class }
            ? ", \"this\", (object)this" : "";
    }

    // L(line, position of the statement this step is about, variables...)
    StatementSyntax LineCall(int line, SyntaxNode statement, string locals) =>
        SyntaxFactory.ParseStatement($"{CL}.L({line}, {statement.SpanStart}{locals});");

    static bool NeedsLineBefore(StatementSyntax statement) => statement switch
    {
        // Loops report their checks themselves; blocks, local functions and `try` aren't steps.
        BlockSyntax or LocalFunctionStatementSyntax or TryStatementSyntax or WhileStatementSyntax or DoStatementSyntax
            or CommonForEachStatementSyntax or EmptyStatementSyntax or LabeledStatementSyntax or CheckedStatementSyntax
            or UnsafeStatementSyntax => false,
        // A for loop's start part (`int i = 0`) is a step of its own, like GDB shows it.
        ForStatementSyntax loop => loop.Declaration is not null || loop.Initializers.Count > 0,
        _ => true,
    };

    List<StatementSyntax> InstrumentList(IEnumerable<StatementSyntax> originals)
    {
        var result = new List<StatementSyntax>();
        foreach (var statement in originals)
        {
            if (NeedsLineBefore(statement)) result.Add(LineCall(LineOf(statement), statement, Locals(statement)));
            result.Add((StatementSyntax)Visit(statement));
            // Back on the foreach line once it runs out of items: "the loop is finished".
            if (statement is CommonForEachStatementSyntax) result.Add(LineCall(LineOf(statement), statement, Locals(statement)));
        }
        return result;
    }

    // A statement in a spot that holds one statement (an if's body without braces): make it
    // a block, so its line call has somewhere to go.
    StatementSyntax Embedded(StatementSyntax original) =>
        original is BlockSyntax ? (StatementSyntax)Visit(original) : SyntaxFactory.Block(InstrumentList([original]));

    // `(L(line, ...) is var _) && (condition)`: every check of a loop's condition is a step.
    // Not plain `L(...) && (condition)`: the compiler can't know L always returns true, so a
    // variable the condition assigns, as in `while ((line = Console.ReadLine()) != null)`,
    // would no longer be definitely assigned after the loop, and the traced copy wouldn't
    // compile. `is var _` always matches, which the compiler does know.
    ExpressionSyntax Check(int line, StatementSyntax loop, ExpressionSyntax condition) =>
        SyntaxFactory.BinaryExpression(SyntaxKind.LogicalAndExpression,
            SyntaxFactory.ParseExpression($"({CL}.L({line}, {loop.SpanStart}{Locals(condition)}) is var _)"),
            SyntaxFactory.ParenthesizedExpression((ExpressionSyntax)Visit(condition)));

    // ── statements ──────────────────────────────────────────────────────────

    public override SyntaxNode VisitCompilationUnit(CompilationUnitSyntax node)
    {
        // Top-level statements: each one gets its line call as a top-level statement too.
        var members = new List<MemberDeclarationSyntax>();
        foreach (var member in node.Members)
        {
            if (member is GlobalStatementSyntax global && global.Statement is not LocalFunctionStatementSyntax)
                members.AddRange(InstrumentList([global.Statement]).Select(s => SyntaxFactory.GlobalStatement(s)));
            else
                members.Add((MemberDeclarationSyntax)Visit(member));
        }
        return node.WithMembers(SyntaxFactory.List(members));
    }

    public override SyntaxNode VisitBlock(BlockSyntax node) => node.WithStatements(SyntaxFactory.List(InstrumentList(node.Statements)));

    public override SyntaxNode VisitSwitchSection(SwitchSectionSyntax node) =>
        node.WithLabels(SyntaxFactory.List(node.Labels.Select(l => (SwitchLabelSyntax)Visit(l))))
            .WithStatements(SyntaxFactory.List(InstrumentList(node.Statements)));

    public override SyntaxNode VisitIfStatement(IfStatementSyntax node) =>
        node.WithCondition((ExpressionSyntax)Visit(node.Condition))
            .WithStatement(Embedded(node.Statement))
            .WithElse(node.Else?.WithStatement(Embedded(node.Else.Statement)));

    public override SyntaxNode VisitWhileStatement(WhileStatementSyntax node) =>
        node.WithCondition(Check(LineOf(node), node, node.Condition)).WithStatement(Embedded(node.Statement));

    public override SyntaxNode VisitDoStatement(DoStatementSyntax node) =>
        node.WithStatement(Embedded(node.Statement)).WithCondition(Check(LineOf(node.WhileKeyword), node, node.Condition));

    // After each pass the loop updates (`i++`) and checks again: one step on the for line,
    // reported before the update (U), as GDB shows a C for loop. The check right after it
    // then doesn't report a second step; only the first check does.
    public override SyntaxNode VisitForStatement(ForStatementSyntax node)
    {
        var flowAt = (SyntaxNode?)node.Condition ?? node.Statement;
        var condition = node.Condition is not null
            ? Check(LineOf(node), node, node.Condition)
            : SyntaxFactory.ParseExpression($"{CL}.L({LineOf(node)}, {node.SpanStart}{Locals(flowAt)})");
        var update = SyntaxFactory.ParseExpression($"{CL}.U({LineOf(node)}, {node.SpanStart}{Locals(flowAt)})");
        return node.WithCondition(condition)
            .WithIncrementors(SyntaxFactory.SeparatedList(new[] { update }.Concat(node.Incrementors)))
            .WithStatement(Embedded(node.Statement));
    }

    // Each pass starts on the foreach line with the next item already in its variable.
    BlockSyntax ForEachBody(CommonForEachStatementSyntax node)
    {
        var body = node.Statement is BlockSyntax block ? InstrumentList(block.Statements) : InstrumentList([node.Statement]);
        body.Insert(0, LineCall(LineOf(node), node, Locals(node.Statement)));
        return SyntaxFactory.Block(body);
    }

    public override SyntaxNode VisitForEachStatement(ForEachStatementSyntax node) =>
        node.WithExpression((ExpressionSyntax)Visit(node.Expression)).WithStatement(ForEachBody(node));

    public override SyntaxNode VisitForEachVariableStatement(ForEachVariableStatementSyntax node) =>
        node.WithExpression((ExpressionSyntax)Visit(node.Expression)).WithStatement(ForEachBody(node));

    public override SyntaxNode VisitUsingStatement(UsingStatementSyntax node) => node.WithStatement(Embedded(node.Statement));

    public override SyntaxNode VisitLockStatement(LockStatementSyntax node) => node.WithStatement(Embedded(node.Statement));

    public override SyntaxNode VisitReturnStatement(ReturnStatementSyntax node)
    {
        if (node.Expression is null or RefExpressionSyntax) return node;   // `return ref x;` hands back the variable itself
        var value = (ExpressionSyntax)Visit(node.Expression);
        var method = model.GetEnclosingSymbol(node.SpanStart) as IMethodSymbol;
        return node.WithExpression(RecordReturn(method, value));
    }

    // `R<T>(value)`: hands the value back unchanged and records it for the return event.
    // The type is spelled out so `return null;` and target-typed values still compile.
    static ExpressionSyntax RecordReturn(IMethodSymbol? method, ExpressionSyntax value)
    {
        var type = ReturnTypeName(method);
        if (type is null) return value;
        var call = (InvocationExpressionSyntax)SyntaxFactory.ParseExpression($"{CL}.R<{type}>(default)");
        return call.WithArgumentList(SyntaxFactory.ArgumentList(SyntaxFactory.SingletonSeparatedList(SyntaxFactory.Argument(value))));
    }

    static string? ReturnTypeName(IMethodSymbol? method)
    {
        if (method is null || method.IsAsync || method.ReturnsVoid || method.ReturnsByRef || method.ReturnsByRefReadonly
            || method.MethodKind == MethodKind.LambdaMethod) return null;
        var type = method.ReturnType;
        if (!Readable(type) || MentionsAnonymous(type)) return null;
        return type.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat);
    }

    static bool MentionsAnonymous(ITypeSymbol type) => type switch
    {
        { IsAnonymousType: true } => true,
        IArrayTypeSymbol array => MentionsAnonymous(array.ElementType),
        INamedTypeSymbol named => named.TypeArguments.Any(MentionsAnonymous),
        _ => false,
    };

    // Lambdas run whenever something calls them, usually inside library code; left as is.
    public override SyntaxNode? VisitParenthesizedLambdaExpression(ParenthesizedLambdaExpressionSyntax node) => node;
    public override SyntaxNode? VisitSimpleLambdaExpression(SimpleLambdaExpressionSyntax node) => node;
    public override SyntaxNode? VisitAnonymousMethodExpression(AnonymousMethodExpressionSyntax node) => node;

    // ── methods: a call event on entry, a return event on the way out ────────

    static bool IsIterator(SyntaxNode? body) => body is not null && body
        .DescendantNodes(n => n is not (LambdaExpressionSyntax or AnonymousMethodExpressionSyntax or LocalFunctionStatementSyntax))
        .OfType<YieldStatementSyntax>().Any();

    // The iterator whose body is being rewritten: its yields leave and re-enter its frame.
    sealed record IteratorFrame(string Enter, string ElementType);
    IteratorFrame? iterator;

    string EnterCall(SyntaxNode declaration, IMethodSymbol method, string name)
    {
        var arguments = new StringBuilder();
        foreach (var parameter in method.Parameters)
            if (parameter.RefKind != RefKind.Out && Readable(parameter.Type) && parameter.Name.Length > 0)
                arguments.Append($", \"{parameter.Name}\", (object)@{parameter.Name}");
        return $"{CL}.Enter(\"{name}\", {LineOf(declaration)}{arguments});";
    }

    // IEnumerable<T> -> T, for the value a yield hands out.
    static string ElementType(IMethodSymbol method) =>
        method.ReturnType is INamedTypeSymbol { IsGenericType: true } named && named.TypeArguments.Length == 1 && Readable(named.TypeArguments[0])
            ? named.TypeArguments[0].ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat)
            : "object";

    // `yield return x;` pauses the iterator and hands x to the loop that asked for it, like a
    // return; the next item resumes it, like a call. Python's tracer shows generators the same way.
    public override SyntaxNode? VisitYieldStatement(YieldStatementSyntax node)
    {
        if (iterator is null) return base.VisitYieldStatement(node);
        var exit = SyntaxFactory.ParseStatement($"{CL}.Exit();");
        if (node.IsKind(SyntaxKind.YieldBreakStatement) || node.Expression is null) return SyntaxFactory.Block(exit, node);
        var value = (ExpressionSyntax)Visit(node.Expression);
        var handOut = (InvocationExpressionSyntax)SyntaxFactory.ParseExpression($"{CL}.Y<{iterator.ElementType}>(default)");
        handOut = handOut.WithArgumentList(SyntaxFactory.ArgumentList(SyntaxFactory.SingletonSeparatedList(SyntaxFactory.Argument(value))));
        return SyntaxFactory.Block(node.WithExpression(handOut), SyntaxFactory.ParseStatement(iterator.Enter));
    }

    BlockSyntax? FunctionBody(SyntaxNode declaration, BlockSyntax? body, ArrowExpressionClauseSyntax? arrow, IMethodSymbol? method, string name)
    {
        var outer = iterator;
        try
        {
            iterator = method is not null && IsIterator(body) ? new IteratorFrame(EnterCall(declaration, method, name), ElementType(method)) : null;
            return FunctionBodyCore(declaration, body, arrow, method, name);
        }
        finally
        {
            iterator = outer;
        }
    }

    BlockSyntax? FunctionBodyCore(SyntaxNode declaration, BlockSyntax? body, ArrowExpressionClauseSyntax? arrow, IMethodSymbol? method, string name)
    {
        var inner = new List<StatementSyntax>();
        if (body is not null)
        {
            inner.AddRange(InstrumentList(body.Statements));
        }
        else if (arrow is not null)
        {
            if (arrow.Expression is RefExpressionSyntax) return null;
            inner.Add(LineCall(LineOf(arrow.Expression), arrow.Expression, Locals(arrow.Expression)));
            var value = (ExpressionSyntax)Visit(arrow.Expression);
            var returnsValue = method is not null && !method.ReturnsVoid
                && method.MethodKind is not (MethodKind.Constructor or MethodKind.StaticConstructor or MethodKind.Destructor or MethodKind.PropertySet)
                && !(method.IsAsync && method.ReturnType is INamedTypeSymbol { Arity: 0 });
            if (value is ThrowExpressionSyntax thrown) inner.Add(SyntaxFactory.ThrowStatement(thrown.Expression));
            else if (returnsValue) inner.Add(SyntaxFactory.ReturnStatement(RecordReturn(method, value)));
            else inner.Add(SyntaxFactory.ExpressionStatement(value));
        }
        else return null;

        if (method is null) return SyntaxFactory.Block(inner);
        var enter = SyntaxFactory.ParseStatement(EnterCall(declaration, method, name));
        var exit = SyntaxFactory.ParseStatement($"{CL}.Exit();");
        // An iterator leaves its frame at each yield (above) and when it runs out of items. A
        // `finally` would also run when the loop using it stops early, after the frame is gone.
        if (iterator is not null) return SyntaxFactory.Block(new List<StatementSyntax> { enter }.Concat(inner).Append(exit));
        // An async method's frame stays on the stack while it awaits: right as long as its
        // caller awaits it straight away, which is the usual case.
        return SyntaxFactory.Block(enter, SyntaxFactory.TryStatement(SyntaxFactory.Block(inner), default, SyntaxFactory.FinallyClause(SyntaxFactory.Block(exit))));
    }

    public override SyntaxNode? VisitMethodDeclaration(MethodDeclarationSyntax node)
    {
        var method = model.GetDeclaredSymbol(node);
        var body = FunctionBody(node, node.Body, node.ExpressionBody, method, node.Identifier.Text);
        return body is null ? node : node.WithBody(body).WithExpressionBody(null).WithSemicolonToken(default);
    }

    public override SyntaxNode? VisitLocalFunctionStatement(LocalFunctionStatementSyntax node)
    {
        var method = model.GetDeclaredSymbol(node) as IMethodSymbol;
        var body = FunctionBody(node, node.Body, node.ExpressionBody, method, node.Identifier.Text);
        return body is null ? node : node.WithBody(body).WithExpressionBody(null).WithSemicolonToken(default);
    }

    public override SyntaxNode? VisitConstructorDeclaration(ConstructorDeclarationSyntax node)
    {
        var method = model.GetDeclaredSymbol(node);
        var name = node.Modifiers.Any(SyntaxKind.StaticKeyword) ? $"static {node.Identifier.Text}" : $"new {node.Identifier.Text}";
        var body = FunctionBody(node, node.Body, node.ExpressionBody, method, name);
        return body is null ? node : node.WithBody(body).WithExpressionBody(null).WithSemicolonToken(default);
    }

    public override SyntaxNode? VisitOperatorDeclaration(OperatorDeclarationSyntax node)
    {
        var method = model.GetDeclaredSymbol(node);
        var body = FunctionBody(node, node.Body, node.ExpressionBody, method, $"operator {node.OperatorToken.Text}");
        return body is null ? node : node.WithBody(body).WithExpressionBody(null).WithSemicolonToken(default);
    }

    // Finalizers run on the garbage collector's thread, outside the program's order.
    public override SyntaxNode? VisitDestructorDeclaration(DestructorDeclarationSyntax node) => node;

    public override SyntaxNode? VisitAccessorDeclaration(AccessorDeclarationSyntax node)
    {
        if (node.Body is null && node.ExpressionBody is null) return node;   // `get;` of an auto-property
        var method = model.GetDeclaredSymbol(node) as IMethodSymbol;
        var owner = method?.AssociatedSymbol is IPropertySymbol { IsIndexer: true } ? "this[]" : method?.AssociatedSymbol?.Name ?? "property";
        var body = FunctionBody(node, node.Body, node.ExpressionBody, method, $"{owner}.{node.Keyword.Text}");
        return body is null ? node : node.WithBody(body).WithExpressionBody(null).WithSemicolonToken(default);
    }

    // `int Area => W * H;` is a property with only a getter.
    public override SyntaxNode? VisitPropertyDeclaration(PropertyDeclarationSyntax node)
    {
        if (node.ExpressionBody is null) return base.VisitPropertyDeclaration(node);
        var getter = (model.GetDeclaredSymbol(node) as IPropertySymbol)?.GetMethod;
        var body = FunctionBody(node, null, node.ExpressionBody, getter, $"{node.Identifier.Text}.get");
        if (body is null) return node;
        return node.WithExpressionBody(null).WithSemicolonToken(default)
            .WithAccessorList(SyntaxFactory.AccessorList(SyntaxFactory.SingletonList(
                SyntaxFactory.AccessorDeclaration(SyntaxKind.GetAccessorDeclaration, body))));
    }

    public override SyntaxNode? VisitIndexerDeclaration(IndexerDeclarationSyntax node)
    {
        if (node.ExpressionBody is null) return base.VisitIndexerDeclaration(node);
        var getter = (model.GetDeclaredSymbol(node) as IPropertySymbol)?.GetMethod;
        var body = FunctionBody(node, null, node.ExpressionBody, getter, "this[].get");
        if (body is null) return node;
        return node.WithExpressionBody(null).WithSemicolonToken(default)
            .WithAccessorList(SyntaxFactory.AccessorList(SyntaxFactory.SingletonList(
                SyntaxFactory.AccessorDeclaration(SyntaxKind.GetAccessorDeclaration, body))));
    }
}
