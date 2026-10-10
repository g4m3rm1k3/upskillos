---
title: 9.1 — TypeScript: prevent impossible states
track: Frontend Developer Bootcamp — TypeScript, Testing and Accessibility
trackOrder: 50.09
runtime: none
reference: optional
---

Outcome: use types to catch mistakes before running. TypeScript checks JavaScript-shaped code and removes type annotations before execution. Types improve tooling and refactoring; they do not validate network JSON at runtime. Our API boundary must keep its runtime checks. This focused exercise introduces TypeScript without pretending the whole React app has been migrated.

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

```check
contains tsconfig.json "\"strict\": true"
```

## Model states as distinct alternatives

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
