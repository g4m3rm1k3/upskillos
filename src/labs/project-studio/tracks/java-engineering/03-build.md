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
