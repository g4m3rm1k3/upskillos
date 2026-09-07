// native-languages — Getting Started — Lesson 2: Java
// Pilot lesson for NativeRunNotebook + the autonomous Temurin JDK installer
// (see desktop/app/runtimes/java.cjs). Proves the install -> run -> real
// output pipeline end to end via JDK single-file source execution (JEP
// 330/458 — java Main.java directly, no separate javac step).

export default {
  id: 'native-languages-002-java-hello',
  slug: 'java-hello',
  chapter: 1,
  order: 2,
  title: 'Java: Your First Program',
  subtitle: 'Getting Started',
  tags: ['java', 'jdk', 'temurin'],

  hook: {
    question: 'Why does even the smallest Java program need a whole class wrapped around it?',
    realWorldContext: 'Unlike Python or C, Java has no concept of a "bare" statement floating outside any structure — every single line of executable code must live inside a method, and every method must live inside a class. This lesson runs real Java, through a real Eclipse Temurin JDK running locally on your machine, not a browser simulation.',
    previewVisualizationId: 'NativeRunNotebook',
  },

  intuition: {
    prose: [
      'Java is a pure object-oriented language at the syntax level: there is no way to write a floating function or a bare print statement at the top of a file the way Python allows. `public class Main { ... }` declares a class named `Main`; `public static void main(String[] args) { ... }` declares the one method the Java runtime looks for and calls automatically when the program starts — this exact method signature is not a convention you can vary, it is what the JVM (Java Virtual Machine) is hard-coded to look for.',
      'This lesson runs code via a modern JDK feature called single-file source-code execution: `java Main.java` compiles and runs the file in one step, without a separate `javac` compile command first — a genuine simplification introduced specifically to make small programs and learning easier, without changing anything about how a real, multi-file Java project is built.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Objects and Methods Used',
        body: '- **`public class Main`** — declares a class named `Main`. The lesson\'s code must always use this exact class name (the file is written to disk as `Main.java`, and Java requires a public class\'s name to match its filename).\n- **`public static void main(String[] args)`** — the fixed entry-point method signature the JVM calls automatically at startup. `static` means it belongs to the class itself, not to an instance of it — there is no object to construct first.\n- **`System.out.println(...)`** — prints a value followed by a newline to standard output. `System.out` is a pre-existing `PrintStream` object every Java program has access to without creating it.\n- **`for (int i = 0; i < n; i++)`** — a classic C-style counting loop: initialize, test condition, increment, in that order.',
      },
    ],
    visualizations: [
      {
        id: 'NativeRunNotebook',
        title: 'Hands-On: Java',
        caption: 'Runs for real via a locally-installed Temurin JDK — only works in the OpenCalc desktop app.',
        props: {
          runtime: 'java',
          initialCells: [
            {
              id: 1,
              cellTitle: 'Hello, Java',
              prose: [
                'The classic first program, plus a small loop to see basic control flow. The class must be named Main — that\'s a hard requirement of single-file source execution, not a style choice.',
              ],
              filename: 'Main.java',
              code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n\n        for (int i = 1; i <= 5; i++) {\n            System.out.println(i + " squared is " + (i * i));\n        }\n    }\n}\n',
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      'Java\'s "everything is a class" design is not accidental verbosity — it is the direct consequence of choosing pure object-oriented design at the language level, in contrast to C++ (which allows free functions and global variables) or Python (which allows both procedural and object-oriented styles in the same file). The tradeoff: Java code has more required ceremony for a trivial program, but every unit of code in a large Java codebase is uniformly organized around classes and methods, with no free-floating functions to hunt down separately — a real advantage at the scale Java was originally designed for (large, multi-team enterprise codebases in the mid-1990s).',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If Run does nothing, check the environment banner above the editor — the JDK may still be installing.',
      'The class must be named Main exactly — this lesson\'s runner always writes the file as Main.java.',
    ],
    futureLinks: [
      'Next lesson: .NET / C#.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain why Java requires every statement to live inside a class and a method.',
    'I know the fixed signature the JVM looks for: public static void main(String[] args).',
    'I understand that java Main.java compiles and runs in one step, without a separate javac call.',
    'I have run real Java code and seen real output from a real JDK.',
  ],

  checkpoints: ['read-intuition'],
}
