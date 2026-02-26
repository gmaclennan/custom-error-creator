import { expectType, expectError, expectAssignable } from "tsd";
import {
  createErrorClass,
  createErrorClasses,
  isCustomError,
  type ErrorDefinition,
} from "./index.js";

// ──────────────────────────────────────────────
// createErrorClass — with template parameters
// ──────────────────────────────────────────────

const NotFound = createErrorClass({
  code: "NOT_FOUND",
  message: "Resource {resource} not found",
  status: 404,
});

// Params required — typed and checked at compile time
const nf1 = new NotFound({ resource: "User" });
expectType<"NOT_FOUND">(nf1.code);
expectType<404>(nf1.status);
expectType<"NotFound">(nf1.name);
expectType<string>(nf1.message);
expectAssignable<Error>(nf1);

// Params with cause option
new NotFound({ resource: "User" }, { cause: new Error() });

// Custom message — params optional
new NotFound("Custom message");
new NotFound("{thing} gone", { thing: "Widget" });
new NotFound("Gone", { cause: new Error() });
new NotFound("{x} gone", { x: "y" }, { cause: new Error() });

// Missing params — should error
expectError(new NotFound());
// Wrong param name — should error
expectError(new NotFound({ resorce: "User" }));
// Empty params — should error
expectError(new NotFound({}));

// ──────────────────────────────────────────────
// createErrorClass — without template parameters
// ──────────────────────────────────────────────

const Unauthorized = createErrorClass({
  code: "UNAUTHORIZED",
  message: "Access denied",
  status: 401,
});

// All valid signatures
const ua1 = new Unauthorized();
expectType<"UNAUTHORIZED">(ua1.code);
expectType<401>(ua1.status);
expectType<"Unauthorized">(ua1.name);
expectAssignable<Error>(ua1);

new Unauthorized("Custom message");
new Unauthorized("Custom message", { cause: new Error() });

// Object arg should error for no-params errors
expectError(new Unauthorized({ x: "y" }));

// ──────────────────────────────────────────────
// createErrorClasses — batch creation
// ──────────────────────────────────────────────

const errors = createErrorClasses([
  {
    code: "NOT_FOUND",
    message: "Resource {resource} not found",
    status: 404,
  },
  {
    code: "UNAUTHORIZED",
    message: "Access denied",
    status: 401,
  },
  {
    code: "VALIDATION_ERROR",
    message: "{field} is invalid: {reason}",
    status: 400,
  },
]);

// Each class exists and is constructible
const e1 = new errors.NOT_FOUND({ resource: "User" });
expectType<"NOT_FOUND">(e1.code);
expectType<404>(e1.status);
expectType<"NotFound">(e1.name);

const e2 = new errors.UNAUTHORIZED();
expectType<"UNAUTHORIZED">(e2.code);
expectType<401>(e2.status);
expectType<"Unauthorized">(e2.name);

const e3 = new errors.VALIDATION_ERROR({ field: "email", reason: "too short" });
expectType<"VALIDATION_ERROR">(e3.code);
expectType<400>(e3.status);
expectType<"ValidationError">(e3.name);

// Missing params should error for batch-created classes too
expectError(new errors.NOT_FOUND());
expectError(new errors.VALIDATION_ERROR());
expectError(new errors.VALIDATION_ERROR({ field: "email" }));

// ──────────────────────────────────────────────
// PascalCase name conversion at type level
// ──────────────────────────────────────────────

const InternalServerError = createErrorClass({
  code: "INTERNAL_SERVER_ERROR",
  message: "Internal server error",
  status: 500,
});
const ise = new InternalServerError();
expectType<"InternalServerError">(ise.name);
expectType<"INTERNAL_SERVER_ERROR">(ise.code);

const BadRequest = createErrorClass({
  code: "BAD_REQUEST",
  message: "Bad request",
  status: 400,
});
const br = new BadRequest();
expectType<"BadRequest">(br.name);

// ──────────────────────────────────────────────
// Reserved parameter name — {cause} in template
// ──────────────────────────────────────────────

// Using {cause} in a message template should produce a type error at definition time
expectError(
  createErrorClass({
    code: "BAD",
    message: "Failed because {cause}",
    status: 500,
  }),
);

// Also for createErrorClasses
expectError(
  createErrorClasses([
    {
      code: "BAD",
      message: "Failed because {cause}",
      status: 500,
    },
  ]),
);

// ──────────────────────────────────────────────
// isCustomError type guard
// ──────────────────────────────────────────────

const unknownErr: unknown = new NotFound({ resource: "test" });
if (isCustomError(unknownErr)) {
  expectType<string>(unknownErr.code);
  expectType<number>(unknownErr.status);
  expectAssignable<Error>(unknownErr);
}

// ──────────────────────────────────────────────
// Multiple template parameters
// ──────────────────────────────────────────────

const MultiParam = createErrorClass({
  code: "MULTI",
  message: "{a} and {b} and {c}",
  status: 500,
});

new MultiParam({ a: "1", b: "2", c: "3" });
// Missing one param should error
expectError(new MultiParam({ a: "1", b: "2" }));
// Extra param should error
expectError(new MultiParam({ a: "1", b: "2", c: "3", d: "4" }));
