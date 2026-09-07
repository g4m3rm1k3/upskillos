// native-languages — Getting Started — Lesson 3: .NET / C#
// Pilot lesson for NativeRunNotebook + the autonomous .NET SDK installer
// (see desktop/app/runtimes/dotnet.cjs). Proves the install -> run -> real
// output pipeline end to end. Each run scaffolds a scratch console project
// around the lesson's code and runs it via `dotnet run --project` — the
// SDK version this targets doesn't yet support file-based apps
// (`dotnet run file.cs` with no project), confirmed live.

export default {
  id: 'native-languages-003-dotnet-hello',
  slug: 'dotnet-hello',
  chapter: 1,
  order: 3,
  title: '.NET: Your First C# Program',
  subtitle: 'Getting Started',
  tags: ['dotnet', 'csharp', '.net'],

  hook: {
    question: 'What actually turns C# source code into a running program on your machine?',
    realWorldContext: 'C# runs on the .NET runtime, a virtual machine similar in spirit to Java\'s JVM — your source code compiles to an intermediate language (IL), not directly to a specific CPU\'s machine code, and the .NET runtime translates that IL to real machine code as the program runs. This lesson runs real C#, through a real .NET SDK running locally on your machine, not a browser simulation.',
    previewVisualizationId: 'NativeRunNotebook',
  },

  intuition: {
    prose: [
      'Modern C# (as used in this lesson) supports top-level statements: unlike Java, you do not need to wrap every line in an explicit class and a `Main` method — the compiler generates that scaffolding for you behind the scenes when a file\'s code starts with ordinary statements rather than a class declaration. This was a deliberate simplification added to C# specifically to make small programs read more like scripts, while a large real-world C# project still organizes its actual logic into classes just as thoroughly as Java does.',
      'The `dotnet` command-line tool is the single entry point for the whole toolchain: `dotnet run` compiles and immediately runs a project, `dotnet build` compiles without running, and `dotnet new` scaffolds a new project from a template — this lesson\'s runner uses a pre-built minimal console-project template and just drops your code into it before calling `dotnet run`.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Objects and Methods Used',
        body: '- **Top-level statements** — C# code written directly at the file\'s top level, with no explicit `class Program { static void Main() { ... } }` wrapper; the compiler synthesizes that structure automatically.\n- **`Console.WriteLine(...)`** — prints a value followed by a newline to standard output. `Console` is a static class from the `System` namespace, available without any explicit import in top-level-statement files.\n- **`for (int i = 1; i <= n; i++)`** — the same classic counting-loop syntax C-family languages share, including Java.\n- **string interpolation (`$"...{expr}..."`)** — a `$`-prefixed string literal where `{expr}` is evaluated and inserted directly into the string, avoiding manual string concatenation.',
      },
    ],
    visualizations: [
      {
        id: 'NativeRunNotebook',
        title: 'Hands-On: C#',
        caption: 'Runs for real via a locally-installed .NET SDK — only works in the OpenCalc desktop app.',
        props: {
          runtime: 'dotnet',
          initialCells: [
            {
              id: 1,
              cellTitle: 'Hello, C#',
              prose: [
                'Top-level statements, a small loop, and string interpolation — no explicit class or Main method needed for a program this size.',
              ],
              filename: 'Program.cs',
              code: 'Console.WriteLine("Hello from C#!");\n\nfor (int i = 1; i <= 5; i++)\n{\n    Console.WriteLine($"{i} squared is {i * i}");\n}\n',
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      'Compiling to an intermediate language rather than directly to machine code is what lets .NET run the same compiled program on different CPU architectures and operating systems without recompiling from source — the same tradeoff Java\'s JVM makes, and part of why both languages became dominant in large enterprise environments where a single codebase might need to run on many different server configurations. The real cost: an extra translation step (IL to machine code, called JIT compilation, "just-in-time") happens at startup and, for hot code paths, continuously during execution — genuinely slower to start than a program compiled directly to native machine code (like C++), though .NET\'s JIT has become sophisticated enough that long-running C# programs often match native-language performance once warmed up.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If Run does nothing, check the environment banner above the editor — the .NET SDK may still be installing (it\'s a large download).',
      'The first run after installing can be slower than later runs — .NET builds some internal caches on first use.',
    ],
    futureLinks: [
      'This completes the native-languages pilot module.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain what top-level statements simplify compared to a fully explicit Main method.',
    'I know that dotnet run compiles and runs a project in one step.',
    'I understand why compiling to an intermediate language (IL) makes a compiled .NET program portable across machine architectures.',
    'I have run real C# code and seen real output from a real .NET SDK.',
  ],

  checkpoints: ['read-intuition'],
}
