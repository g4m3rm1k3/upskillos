---
title: 9.1 — TypeScript: prevent impossible states
track: Frontend Developer Bootcamp — TypeScript, Testing and Accessibility
trackOrder: 50.09
runtime: none
---

Outcome: use types to catch mistakes before running. TypeScript checks JavaScript-shaped code and removes type annotations before execution. Types improve tooling and refactoring; they do not validate network JSON at runtime. Our API boundary must keep its runtime checks. This focused exercise introduces TypeScript without pretending the whole React app has been migrated.

### The story so far

You have built data boundaries and discovered that missing or misspelled properties can become blank UI. TypeScript catches a different class of mistakes before execution: it checks whether the program’s declared relationships are consistent.

This lesson introduces types in one small module. It does not pretend that changing an extension instantly converts the entire React app. The goal is to understand what the checker can establish, what it cannot, and how to model states that make illegal combinations harder to express.

## Add the compiler

Before trying this step, make a prediction.

```predict
question: Does a TypeScript assertion validate downloaded JSON at runtime?
choice: No
choice: Yes
answer: No
explain: Type information is erased; runtime checks must inspect actual values.
```

Update package.json and run npm install. The typecheck script invokes the locally installed compiler. noEmit checks only; it does not build browser assets. Vite can transform TypeScript but transformation alone does not establish type correctness.

```json file=package.json
{
  "name": "frontend-portfolio",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "vite": "8.3.4",
    "tailwindcss": "4.3.3",
    "@tailwindcss/vite": "4.3.3",
    "typescript": "7.0.2"
  },
  "dependencies": {
    "bootstrap": "5.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  }
}
```

```check
contains package.json "\"typecheck\": \"tsc --noEmit\""
```

## Choose a strict boundary

include restricts this introductory exercise to quality/*.ts. strict enables useful checks such as null handling. DOM supplies browser types. When migrating a real React app, use .tsx, React type packages, a JSX compiler setting and expand include; this configuration deliberately checks only the typed module taught here.

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "lib": [
      "ES2022",
      "DOM"
    ],
    "skipLibCheck": true
  },
  "include": [
    "quality/**/*.ts"
  ]
}
```

### What this configuration actually checks

include limits the exercise to TypeScript files in quality. It does not certify every JavaScript source file in the portfolio. strict enables a useful set of checks, including important null and undefined distinctions. noEmit says to report diagnostics without writing compiled output.

Build transformation and type checking are separate tasks. A tool can strip annotations and produce runnable JavaScript while the program still contains type errors. That is why the release checklist runs both typecheck and build.

```check
contains tsconfig.json "\"strict\": true"
```

## Model states as distinct alternatives

### A type is a description, not a runtime guard

Think of a type as a form template inspected before work begins. It can tell you that a success record requires books and an error record requires a message. It cannot guarantee that a parcel arriving later contains what its label claims.

That is the boundary between static checking and runtime validation. A network response arrives after compilation and still needs inspection. Writing `as Book[]` changes what the checker believes; it does not inspect the actual downloaded value.

### Compare two ways to represent request state

A loose object with optional books, message and loading fields permits confusing combinations: loading true with an old success list and a missing error message. A discriminated union instead says exactly which shapes are allowed.

```text
idle     → no result required
loading  → no result required
error    → message required
success  → books required
```

The status literal is the discriminant. Checking it lets the compiler narrow which fields are available in that branch.

A union (|) accepts one of several shapes. status is the discriminant: checking it narrows what fields exist. The success branch can use books; error can use message. This prevents a loading state from accidentally requiring a finished result. Run npm run typecheck.

```typescript file=quality/search.ts
export type Book = { id: string; title: string; author: string };
export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; books: Book[] };
export function describe(state: SearchState): string {
  switch (state.status) {
    case 'idle': return 'Search for a book';
    case 'loading': return 'Searching';
    case 'error': return state.message;
    case 'success': return `${state.books.length} results`;
  }
}
const example: SearchState = { status: 'success', books: [] };
console.log(describe(example));
```

### Follow narrowing through the switch

Before the switch, state might be any member of SearchState. In the success case, TypeScript knows state has books. In the error case, it knows state has message. Accessing books in the loading case would be rejected because that shape does not promise a result.

The function declares a string return value. Every allowed state must therefore return a string. When you add a new union member but forget its switch case, the compiler can identify a path that may return undefined. That is useful friction: the data model changed, so its consumers need reconsideration.

**Rule of thumb:** model meaningful alternatives directly instead of adding optional properties until every combination is technically allowed. Do not turn every type error into any or a cast; first ask whether the error reveals an ambiguity in the design.

Types can improve editor completion, renaming and navigation. They do not establish contrast, correct business rules, API availability or runtime shape. A perfectly typed subtraction can still subtract the wrong values. Keep the behavioral tests you already wrote.

```check
run "npm run typecheck"
```

## Your turn: add an empty state deliberately

Add { status: empty } as a new union member using the string literal type 'empty'. Handle it in describe by returning Try a broader search. Run the compiler and explain why a missing switch case would violate the promised string return type.

```check
contains quality/search.ts "case 'empty':"
run "npm run typecheck"
```

```hints
nudge: Add the new alternative before writing its branch.
concept: A declared return type exposes paths that return undefined.
shape: Use the exact same status literal in the type and switch.
```

## Diagnose, explain and review

Try { status: success, books: null } with the status quoted correctly and run typecheck. It must reject null under strict checking. Restore the example. A cast such as response as Book[] does not inspect data: explain why runtime validation still belongs after fetch. Do not use any to make errors disappear.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain why `{ status: 'success', books: null }` violates the model, and why a runtime cast cannot repair it. Then add a hypothetical cancelled state on paper and identify every consumer that must decide how to describe it. Distinguish compiler evidence from browser evidence.
