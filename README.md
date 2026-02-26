# custom-error-creator

[![npm version](https://img.shields.io/npm/v/custom-error-creator.svg)](https://www.npmjs.com/package/custom-error-creator)
[![GitHub CI](https://github.com/gmaclennan/custom-error-creator/actions/workflows/test.yml/badge.svg)](https://github.com/gmaclennan/custom-error-creator/actions/workflows/test.yml)
[![bundle size](https://deno.bundlejs.com/badge?q=custom-error-creator&treeshake=[*])](https://bundlejs.com/?q=custom-error-creator&treeshake=%5B*%5D)

Create typed, structured error classes from simple definitions.

## Why?

Lets you define errors declaratively and get back proper classes with:

- **Typed error codes** — catch and handle errors by code, not by sniffing
  message strings
- **HTTP status codes** — errors carry their status, so your error handler
  doesn't need a mapping table
- **Message templates** — parameterised messages with compile-time checking of
  required params
- **PascalCase names** — `NOT_FOUND` becomes `NotFound` in stack traces
  automatically
- **Clean stack traces** — the error points at your throw site, not the class
  internals
- **Standard `cause` chaining** — wrap underlying errors using the ES2022
  `cause` option

I found myself using similar patterns for error handling in multiple projects,
and this module encapsulates the common boilerplate into a simple, reusable API.

## Install

```
npm install typed-error-class
```

## Quick start

```typescript
import { createErrorClass } from "typed-error-class";

const NotFound = createErrorClass({
  code: "NOT_FOUND",
  message: "Resource {resource} not found",
  status: 404,
});

throw new NotFound({ resource: "User" });
// NotFound: Resource User not found
//     at handler (/app/routes.ts:12:9)
```

## API

### `createErrorClass(definition)`

Creates a single error class from a definition.

```typescript
const ValidationError = createErrorClass({
  code: "VALIDATION_ERROR",
  message: "{field} is invalid: {reason}",
  status: 400,
});
```

### `createErrorClassesByCode(definitions)`

Creates multiple error classes at once, returned as an object keyed by code.

```typescript
import { createErrorClassesByCode } from "typed-error-class";

const errors = createErrorClassesByCode([
  { code: "NOT_FOUND", message: "Resource {resource} not found", status: 404 },
  { code: "UNAUTHORIZED", message: "Access denied", status: 401 },
  {
    code: "VALIDATION_ERROR",
    message: "{field} is invalid: {reason}",
    status: 400,
  },
]);

throw new errors.NOT_FOUND({ resource: "User" });
throw new errors.UNAUTHORIZED();
throw new errors.VALIDATION_ERROR({ field: "email", reason: "too short" });
```

### `createErrorClassesByName(definitions)`

Creates multiple error classes at once, returned as an object keyed by
PascalCase name.

```typescript
import { createErrorClassesByName } from "typed-error-class";

const errors = createErrorClassesByName([
  { code: "NOT_FOUND", message: "Resource {resource} not found", status: 404 },
  { code: "UNAUTHORIZED", message: "Access denied", status: 401 },
]);

throw new errors.NotFound({ resource: "User" });
throw new errors.Unauthorized();
```

### `isCustomError(error)`

Type guard to check if an error is an instance of any error class created by
this module.

## Constructor signatures

The constructor is flexible depending on whether the message template has
parameters.

### Errors with template parameters

When the default message contains `{param}` placeholders, the params object is
required:

```typescript
const NotFound = createErrorClass({
  code: "NOT_FOUND",
  message: "Resource {resource} not found",
  status: 404,
});

// Params required — typed and checked at compile time
new NotFound({ resource: "User" });
new NotFound({ resource: "User" }, { cause: underlyingError });

// Custom message — params become optional and untyped
new NotFound("Thing not found");
new NotFound("{thing} is gone", { thing: "Widget" });
new NotFound("Gone", { cause: underlyingError });
new NotFound("{x} missing", { x: "y" }, { cause: underlyingError });
```

### Errors without template parameters

```typescript
const Unauthorized = createErrorClass({
  code: "UNAUTHORIZED",
  message: "Access denied",
  status: 401,
});

new Unauthorized();
new Unauthorized("Custom message");
new Unauthorized("Custom message", { cause: underlyingError });
```

## Error instance properties

Every error instance has the standard `Error` properties plus:

```typescript
const err = new NotFound({ resource: "User" });

err.message; // "Resource User not found"
err.name; // "NotFound"
err.code; // "NOT_FOUND"
err.status; // 404
err.stack; // stack trace pointing at the throw site
err.cause; // underlying error, if provided
```

## Static class properties

Error classes also expose `code` and `name` as static properties, useful for
comparisons without instantiating:

```typescript
const NotFound = createErrorClass({
  code: "NOT_FOUND",
  message: "Resource {resource} not found",
  status: 404,
});

NotFound.code; // "NOT_FOUND"
NotFound.name; // "NotFound"
```

## Error handling patterns

### By code

```typescript
try {
  await getUser(id);
} catch (err) {
  if (err.code === "NOT_FOUND") {
    // handle missing resource
  }
}
```

### By instanceof

```typescript
try {
  await getUser(id);
} catch (err) {
  if (err instanceof NotFound) {
    // handle missing resource
  }
}
```

## Wrapping errors with `cause`

Use the standard `cause` option to chain underlying errors:

```typescript
try {
  await db.query("SELECT ...");
} catch (err) {
  throw new NotFound({ resource: "User" }, { cause: err });
}
```

The `cause` is set using the native `Error` constructor option (ES2022), so it
behaves identically to `new Error("msg", { cause })` — non-enumerable and
compatible with all standard tooling.

## Reserved parameter names

The parameter name `cause` is reserved and cannot be used in message templates.
This is enforced at both compile time and runtime:

```typescript
// ❌ Compile error at definition time
const Bad = createErrorClass({
  code: "BAD",
  message: "Failed because {cause}",
  status: 500,
});

// ❌ Runtime error — throws immediately
```

## Type safety

Template parameters are fully type-checked when using the default message:

```typescript
const NotFound = createErrorClass({
  code: "NOT_FOUND",
  message: "Resource {resource} not found",
  status: 404,
});

new NotFound({ resource: "User" }); // ✅
new NotFound({ resorce: "User" }); // ❌ typo caught at compile time
new NotFound({}); // ❌ missing required param
new NotFound(); // ❌ params required
```

Instance properties are also typed:

```typescript
const err = new NotFound({ resource: "User" });
err.code; // type: "NOT_FOUND"
err.status; // type: 404
err.name; // type: "NotFound"
```

## License

MIT
