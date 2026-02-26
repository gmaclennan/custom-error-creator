import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createErrorClass,
  createErrorClassesByCode,
  createErrorClassesByName,
  isCustomError,
} from "../index.js";

describe("createErrorClass", () => {
  describe("basic error class creation", () => {
    it("creates an error class that produces Error instances", () => {
      const MyError = createErrorClass({
        code: "MY_ERROR",
        message: "Something went wrong",
        status: 500,
      });
      const err = new MyError();
      assert.ok(err instanceof Error);
      assert.ok(err instanceof MyError);
    });

    it("sets code from definition", () => {
      const NotFound = createErrorClass({
        code: "NOT_FOUND",
        message: "Not found",
        status: 404,
      });
      const err = new NotFound();
      assert.equal(err.code, "NOT_FOUND");
    });

    it("sets status from definition", () => {
      const NotFound = createErrorClass({
        code: "NOT_FOUND",
        message: "Not found",
        status: 404,
      });
      const err = new NotFound();
      assert.equal(err.status, 404);
    });

    it("converts SCREAMING_SNAKE_CASE code to PascalCase name", () => {
      const cases = [
        ["NOT_FOUND", "NotFound"],
        ["UNAUTHORIZED", "Unauthorized"],
        ["VALIDATION_ERROR", "ValidationError"],
        ["INTERNAL_SERVER_ERROR", "InternalServerError"],
        ["BAD_REQUEST", "BadRequest"],
      ];
      for (const [code, expectedName] of cases) {
        const Err = createErrorClass({ code, message: "msg", status: 500 });
        const err = new Err();
        assert.equal(err.name, expectedName, `${code} → ${expectedName}`);
      }
    });

    it("sets the class name to PascalCase", () => {
      const NotFound = createErrorClass({
        code: "NOT_FOUND",
        message: "Not found",
        status: 404,
      });
      assert.equal(NotFound.name, "NotFound");
    });

    it("exposes code as a static property on the class", () => {
      const NotFound = createErrorClass({
        code: "NOT_FOUND",
        message: "Not found",
        status: 404,
      });
      assert.equal(NotFound.code, "NOT_FOUND");
    });

    it("uses the default message when no arguments given", () => {
      const Err = createErrorClass({
        code: "FAIL",
        message: "Default message",
        status: 500,
      });
      const err = new Err();
      assert.equal(err.message, "Default message");
    });
  });

  describe("message templates", () => {
    it("interpolates template parameters", () => {
      const NotFound = createErrorClass({
        code: "NOT_FOUND",
        message: "Resource {resource} not found",
        status: 404,
      });
      const err = new NotFound({ resource: "User" });
      assert.equal(err.message, "Resource User not found");
    });

    it("interpolates multiple template parameters", () => {
      const Validation = createErrorClass({
        code: "VALIDATION_ERROR",
        message: "{field} is invalid: {reason}",
        status: 400,
      });
      const err = new Validation({ field: "email", reason: "too short" });
      assert.equal(err.message, "email is invalid: too short");
    });

    it("leaves unmatched placeholders in place", () => {
      const Err = createErrorClass({
        code: "ERR",
        message: "{a} and {b}",
        status: 500,
      });
      const err = new Err({ a: "hello" });
      assert.equal(err.message, "hello and {b}");
    });
  });

  describe("constructor signatures — errors with template parameters", () => {
    const NotFound = createErrorClass({
      code: "NOT_FOUND",
      message: "Resource {resource} not found",
      status: 404,
    });

    it("accepts params object as first argument", () => {
      const err = new NotFound({ resource: "User" });
      assert.equal(err.message, "Resource User not found");
    });

    it("accepts params object and cause option", () => {
      const cause = new Error("db failed");
      const err = new NotFound({ resource: "User" }, { cause });
      assert.equal(err.message, "Resource User not found");
      assert.equal(err.cause, cause);
    });

    it("accepts custom message string", () => {
      const err = new NotFound("Thing not found");
      assert.equal(err.message, "Thing not found");
    });

    it("accepts custom message with params for interpolation", () => {
      const err = new NotFound("{thing} is gone", { thing: "Widget" });
      assert.equal(err.message, "Widget is gone");
    });

    it("accepts custom message with cause option", () => {
      const cause = new Error("underlying");
      const err = new NotFound("Gone", { cause });
      assert.equal(err.message, "Gone");
      assert.equal(err.cause, cause);
    });

    it("accepts custom message, params, and cause", () => {
      const cause = new Error("underlying");
      const err = new NotFound("{x} missing", { x: "y" }, { cause });
      assert.equal(err.message, "y missing");
      assert.equal(err.cause, cause);
    });
  });

  describe("constructor signatures — errors without template parameters", () => {
    const Unauthorized = createErrorClass({
      code: "UNAUTHORIZED",
      message: "Access denied",
      status: 401,
    });

    it("accepts no arguments", () => {
      const err = new Unauthorized();
      assert.equal(err.message, "Access denied");
    });

    it("accepts custom message string", () => {
      const err = new Unauthorized("Nope");
      assert.equal(err.message, "Nope");
    });

    it("accepts custom message and cause option", () => {
      const cause = new Error("token expired");
      const err = new Unauthorized("Nope", { cause });
      assert.equal(err.message, "Nope");
      assert.equal(err.cause, cause);
    });
  });

  describe("cause chaining", () => {
    it("sets cause via options object", () => {
      const Err = createErrorClass({
        code: "WRAP",
        message: "Wrapped",
        status: 500,
      });
      const original = new TypeError("bad type");
      const err = new Err("Wrapped", { cause: original });
      assert.equal(err.cause, original);
    });

    it("cause is undefined when not provided", () => {
      const Err = createErrorClass({
        code: "NO_CAUSE",
        message: "No cause",
        status: 500,
      });
      const err = new Err();
      assert.equal(err.cause, undefined);
    });

    it("passes through falsy cause values (null, 0, false, empty string)", () => {
      const Err = createErrorClass({
        code: "FALSY",
        message: "Falsy cause",
        status: 500,
      });
      for (const falsyCause of [null, 0, false, ""]) {
        const err = new Err("msg", { cause: falsyCause });
        assert.equal(err.cause, falsyCause, `cause: ${JSON.stringify(falsyCause)}`);
      }
    });

    it("extracts cause and uses remaining keys as params when mixed in second arg", () => {
      const Err = createErrorClass({
        code: "MIXED",
        message: "{x} happened",
        status: 500,
      });
      const cause = new Error("root");
      const err = new Err("{x} happened", { x: "something", cause });
      assert.equal(err.message, "something happened");
      assert.equal(err.cause, cause);
    });

    it("cause is non-enumerable", () => {
      const Err = createErrorClass({
        code: "WRAP",
        message: "Wrapped",
        status: 500,
      });
      const err = new Err("Wrapped", { cause: new Error("root") });
      const descriptor = Object.getOwnPropertyDescriptor(err, "cause");
      assert.equal(descriptor.enumerable, false);
    });

    it("treats second arg as pure cause opts when only cause key is present", () => {
      const Err = createErrorClass({
        code: "PURE_OPTS",
        message: "default",
        status: 500,
      });
      const cause = new Error("root");
      const err = new Err("custom", { cause });
      assert.equal(err.message, "custom");
      assert.equal(err.cause, cause);
    });
  });

  describe("stack traces", () => {
    it("stack trace includes the error name and message", () => {
      const NotFound = createErrorClass({
        code: "NOT_FOUND",
        message: "Resource {resource} not found",
        status: 404,
      });
      const err = new NotFound({ resource: "User" });
      assert.ok(err.stack.includes("NotFound: Resource User not found"));
    });

    it("stack trace does not include internal constructor frames", () => {
      const Err = createErrorClass({
        code: "TEST",
        message: "test",
        status: 500,
      });
      function throwSite() {
        return new Err();
      }
      const err = throwSite();
      const stackLines = err.stack.split("\n");
      // The first frame after the message line should reference this test, not the class internals
      const firstFrame = stackLines[1];
      assert.ok(
        firstFrame.includes("throwSite"),
        `Expected first frame to reference throwSite, got: ${firstFrame}`,
      );
    });
  });

  describe("toString()", () => {
    it("toString() returns PascalCase name with message", () => {
      const NotFound = createErrorClass({
        code: "NOT_FOUND",
        message: "Resource {resource} not found",
        status: 404,
      });
      const err = new NotFound({ resource: "User" });
      assert.equal(err.toString(), "NotFound: Resource User not found");
    });

    it("toString() works for errors without params", () => {
      const Unauthorized = createErrorClass({
        code: "UNAUTHORIZED",
        message: "Access denied",
        status: 401,
      });
      const err = new Unauthorized();
      assert.equal(err.toString(), "Unauthorized: Access denied");
    });

    it("toString() works with custom message", () => {
      const Err = createErrorClass({
        code: "SOME_ERROR",
        message: "default",
        status: 500,
      });
      const err = new Err("custom message");
      assert.equal(err.toString(), "SomeError: custom message");
    });
  });

  describe("reserved parameter validation", () => {
    it("throws at definition time when message uses {cause}", () => {
      assert.throws(
        () =>
          createErrorClass({
            code: "BAD",
            message: "Failed because {cause}",
            status: 500,
          }),
        {
          message:
            'Error definition "BAD" uses reserved parameter name "{cause}" in message template',
        },
      );
    });
  });
});

describe("createErrorClassesByCode", () => {
  it("creates multiple error classes keyed by code", () => {
    const errors = createErrorClassesByCode([
      { code: "NOT_FOUND", message: "Not found", status: 404 },
      { code: "UNAUTHORIZED", message: "Access denied", status: 401 },
    ]);
    assert.ok(errors.NOT_FOUND);
    assert.ok(errors.UNAUTHORIZED);
  });

  it("each class works independently", () => {
    const errors = createErrorClassesByCode([
      {
        code: "NOT_FOUND",
        message: "Resource {resource} not found",
        status: 404,
      },
      { code: "UNAUTHORIZED", message: "Access denied", status: 401 },
    ]);

    const notFound = new errors.NOT_FOUND({ resource: "User" });
    assert.equal(notFound.message, "Resource User not found");
    assert.equal(notFound.code, "NOT_FOUND");
    assert.equal(notFound.status, 404);
    assert.equal(notFound.name, "NotFound");

    const unauthorized = new errors.UNAUTHORIZED();
    assert.equal(unauthorized.message, "Access denied");
    assert.equal(unauthorized.code, "UNAUTHORIZED");
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.name, "Unauthorized");
  });

  it("errors from different classes are not instanceof each other", () => {
    const errors = createErrorClassesByCode([
      { code: "NOT_FOUND", message: "Not found", status: 404 },
      { code: "UNAUTHORIZED", message: "Access denied", status: 401 },
    ]);

    const notFound = new errors.NOT_FOUND();
    assert.ok(notFound instanceof errors.NOT_FOUND);
    assert.ok(!(notFound instanceof errors.UNAUTHORIZED));
  });

  it("throws at definition time when a definition uses {cause}", () => {
    assert.throws(
      () =>
        createErrorClassesByCode([
          { code: "BAD", message: "Failed because {cause}", status: 500 },
        ]),
      {
        message:
          'Error definition "BAD" uses reserved parameter name "{cause}" in message template',
      },
    );
  });
});

describe("createErrorClassesByName", () => {
  it("creates multiple error classes keyed by PascalCase name", () => {
    const errors = createErrorClassesByName([
      { code: "NOT_FOUND", message: "Not found", status: 404 },
      { code: "UNAUTHORIZED", message: "Access denied", status: 401 },
    ]);
    assert.ok(errors.NotFound);
    assert.ok(errors.Unauthorized);
  });

  it("each class works independently", () => {
    const errors = createErrorClassesByName([
      {
        code: "NOT_FOUND",
        message: "Resource {resource} not found",
        status: 404,
      },
      { code: "UNAUTHORIZED", message: "Access denied", status: 401 },
    ]);

    const notFound = new errors.NotFound({ resource: "User" });
    assert.equal(notFound.message, "Resource User not found");
    assert.equal(notFound.code, "NOT_FOUND");
    assert.equal(notFound.status, 404);
    assert.equal(notFound.name, "NotFound");

    const unauthorized = new errors.Unauthorized();
    assert.equal(unauthorized.message, "Access denied");
    assert.equal(unauthorized.code, "UNAUTHORIZED");
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.name, "Unauthorized");
  });

  it("errors from different classes are not instanceof each other", () => {
    const errors = createErrorClassesByName([
      { code: "NOT_FOUND", message: "Not found", status: 404 },
      { code: "UNAUTHORIZED", message: "Access denied", status: 401 },
    ]);

    const notFound = new errors.NotFound();
    assert.ok(notFound instanceof errors.NotFound);
    assert.ok(!(notFound instanceof errors.Unauthorized));
  });

  it("throws at definition time when a definition uses {cause}", () => {
    assert.throws(
      () =>
        createErrorClassesByName([
          { code: "BAD", message: "Failed because {cause}", status: 500 },
        ]),
      {
        message:
          'Error definition "BAD" uses reserved parameter name "{cause}" in message template',
      },
    );
  });
});

describe("isCustomError", () => {
  it("returns true for errors created by createErrorClass", () => {
    const Err = createErrorClass({
      code: "TEST",
      message: "test",
      status: 500,
    });
    assert.ok(isCustomError(new Err()));
  });

  it("returns false for plain Error instances", () => {
    assert.ok(!isCustomError(new Error("plain")));
  });

  it("returns false for non-error objects", () => {
    assert.ok(!isCustomError({ code: "TEST", status: 500 }));
  });

  it("returns false for null and undefined", () => {
    assert.ok(!isCustomError(null));
    assert.ok(!isCustomError(undefined));
  });

  it("returns false for errors with code but no status", () => {
    const err = new Error("test");
    err.code = "TEST";
    assert.ok(!isCustomError(err));
  });

  it("returns false for errors with status but no code", () => {
    const err = new Error("test");
    err.status = 500;
    assert.ok(!isCustomError(err));
  });

  it("returns true for a manually augmented Error with code and status (duck-typing)", () => {
    const err = new Error("manual");
    err.code = "MANUAL";
    err.status = 500;
    assert.ok(isCustomError(err));
  });
});
