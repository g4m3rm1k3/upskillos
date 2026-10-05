---
title: Maven and dependencies — understand the build
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

A dependency is code your application needs but does not own. Maven resolves declared libraries and executes a build lifecycle. We will type the configuration rather than generate a project. Versions below are a reproducible teaching baseline, not a claim that they are the newest releases.

## Give the build an identity

### Read configuration as a tree

Our earlier compiler command named one source file. A growing project needs a repeatable description of where source lives, which libraries it uses, and which actions build and test it. Maven reads that description from `pom.xml`. POM means Project Object Model. It is configuration, not Java executed by `main`.

XML represents nested elements. `<version>1.0.0</version>` has an opening tag, text content, and a matching closing tag with `/`. `<properties>` contains child elements until `</properties>`. Indentation shows nesting to people; matching tags define it for the parser. A missing close tag prevents Maven from interpreting the project at all, before a compiler gets involved.

`xmlns="http://maven.apache.org/POM/4.0.0"` is an attribute on the project element identifying the vocabulary used here. It is not an instruction to download your application from that address. The model version `4.0.0` selects Maven's configuration model; the later `1.0.0` is our artifact's version. Similar-looking fields belong to different things.

The coordinate `studio:common-ground:1.0.0` combines group, artifact and version. A group distinguishes an organization or namespace; an artifact distinguishes one output within it; a version distinguishes revisions of that artifact. The strings need not match your Java package name, though consistent naming helps people navigate.

The properties section sets values consumed by build plugins. `maven.compiler.release` set to 21 asks the compiler to accept Java 21 language and platform APIs and produce compatible output. It does not install a JDK. `project.build.sourceEncoding` set to UTF-8 specifies how source-file bytes become characters. This matters when a title or comment contains characters outside ASCII.

**Predict:** if Maven reports a mismatched XML tag, would editing `Trace.java` help? No. First repair the configuration layer. Save this opening fragment, but wait for the document to close before asking Maven to read it.

XML elements carry configuration. The namespace identifies Maven's project vocabulary. Group, artifact and version identify our output; `modelVersion` identifies the configuration format, not our application version. `release` selects the Java language level and platform API target. Encoding prevents source text from depending on a machine's locale.

Leave the project element open: subsequent fragments go inside it. Do not run Maven until this lesson closes the document.

Type this fragment yourself. Start an empty file at `pom.xml`:

```xml edit=pom.xml mode=replace
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>studio</groupId>
  <artifactId>common-ground</artifactId>
  <version>1.0.0</version>
  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
```

## Declare a testing dependency

### Follow a library from declaration to use

A Java library is commonly distributed as a JAR, an archive containing compiled classes and metadata. A **dependency** declaration identifies an artifact Maven should obtain and put on the appropriate classpath. `org.junit.jupiter:junit-jupiter:5.11.4` identifies the testing library here. The enclosing plural `dependencies` holds multiple singular `dependency` elements.

The version is exact so two learners ask for the same release. That release's metadata can request other artifacts. These are **transitive dependencies**: your direct dependency depends on them. Maven resolves this graph and caches downloads, normally under your home directory's `.m2/repository`. Deleting a project's `target/` does not delete that shared cache.

`<scope>test</scope>` restricts this dependency to compiling and running tests. Application source under `src/main/java` should not import JUnit. Tests under `src/test/java` can. This boundary keeps test-only tools out of the application's runtime dependency set.

A dependency does not automatically execute when declared. Later `import org.junit.jupiter.api.Test` makes a class's short name usable in source; Maven makes the compiled class available to the compiler and test runner. Importing a name and downloading an artifact solve separate problems.

**Investigate:** after finishing the next step, run `mvn dependency:tree`. Find JUnit's direct entry and one indented child. Write which declaration caused that child to become available. If a library appears unexpectedly, inspect its parent in this tree before adding another version to the POM.

JUnit discovers and executes tests. `test` scope puts it on the test classpath without shipping it as application code. Dependencies can bring transitive dependencies: libraries required by other libraries. A short declaration can therefore produce a longer dependency tree.

We choose an established framework so failure reporting and test isolation do not become a homegrown framework project. Read APIs as contracts: find parameter types, return values, exceptions and examples, then try the smallest experiment that answers your question.

Type this fragment yourself. Append to `pom.xml`:

```xml edit=pom.xml mode=append
  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.4</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
```

## Choose build plugins explicitly

### Work out what runs, and in which order

A **plugin** adds build operations. The compiler plugin translates source. Surefire discovers and executes tests. Their group/artifact/version fields identify plugin artifacts using the same coordinate scheme as dependencies, but the enclosing `build/plugins` section tells Maven to use them as build tools.

Maven's **lifecycle** is an ordered sequence of phases. Requesting `test` runs earlier required phases first: resources are prepared, main source is compiled, test resources are prepared, test source is compiled, then tests run. Requesting `compile` stops earlier. Requesting `package` proceeds farther and makes the distributable archive after testing. A phase is an intended stage; plugins supply the actual operations attached to stages.

The compact `<build><plugins>` opens two nested elements. Its matching `</plugins></build>` closes them in reverse order. Inside Surefire's `configuration`, `failIfNoTests` is true so “there were no tests to execute” cannot silently masquerade as test evidence. This setting cannot prove existing tests are good; it only catches an empty suite.

Maven conventions matter: it will not treat `scratch/Trace.java` as application source. That file remains our independent experiment. Our next class will go under `src/main/java/workspace`, and its test under `src/test/java/workspace`. A successful compile with no application source is not proof that the scratch example was checked.

### Diagnose the layer that failed

| Observation | First investigation |
|---|---|
| XML parsing error | Check tag nesting in `pom.xml` |
| Artifact cannot be resolved | Check the reported coordinates and repository/network access |
| `release version 21 not supported` | Inspect the Java installation reported by `mvn -version` |
| Java error with source line | Read that source line and the compiler's type or syntax complaint |
| No tests executed | Check test path, naming and annotations before interpreting success |

**Predict:** why can `mvn compile` pass while `mvn test` fails? The latter compiles and executes additional code, and a behavior assertion can fail even when all sources compile. Keep build success, test discovery and behavioral correctness separate in your explanation.

A plugin performs build work; a dependency is used by code. Compiler translates sources; Surefire runs tests. `failIfNoTests` stops an empty suite from looking successful. Maven's conventions place application classes under `src/main/java` and tests under `src/test/java`.

Run `mvn dependency:tree`, then `mvn compile`. The first run downloads artifacts into your user Maven cache. If resolution fails, distinguish a repository/network failure from a compiler error before editing code. We have not written a JUnit test yet, so `mvn test` should not be your success criterion here.

Type this fragment yourself. Append to `pom.xml`:

```xml edit=pom.xml mode=append
  <build><plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-compiler-plugin</artifactId>
      <version>3.13.0</version>
    </plugin>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.5.2</version>
      <configuration><failIfNoTests>true</failIfNoTests></configuration>
    </plugin>
  </plugins></build>
</project>
```

```check
run "mvn -q compile" timeout=180
```
