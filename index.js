function toPascalCase(screamingSnake) {
  return screamingSnake
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function inspect(value, depth = 4, seen = new WeakSet()) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const t = typeof value;
  if (t === "string") return `'${value}'`;
  if (t === "number" || t === "boolean") return String(value);
  if (t === "symbol") return value.toString();
  if (t === "bigint") return `${value}n`;
  if (t === "function") return `[Function: ${value.name || "anonymous"}]`;
  // Non-recursive object types — always show regardless of depth
  if (value instanceof Date)
    return isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  if (value instanceof RegExp) return value.toString();
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  // Depth/circular checks for recursive types
  if (depth < 0) return Array.isArray(value) ? "[…]" : "{…}";
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    result =
      value.length === 0
        ? "[]"
        : `[ ${value.map((v) => inspect(v, depth - 1, seen)).join(", ")} ]`;
  } else if (value instanceof Map) {
    result =
      value.size === 0
        ? "Map(0) {}"
        : `Map(${value.size}) { ${[...value].map(([k, v]) => `${inspect(k, depth - 1, seen)} => ${inspect(v, depth - 1, seen)}`).join(", ")} }`;
  } else if (value instanceof Set) {
    result =
      value.size === 0
        ? "Set(0) {}"
        : `Set(${value.size}) { ${[...value].map((v) => inspect(v, depth - 1, seen)).join(", ")} }`;
  } else {
    const keys = Object.keys(value);
    result =
      keys.length === 0
        ? "{}"
        : `{ ${keys.map((k) => `${k}: ${inspect(value[k], depth - 1, seen)}`).join(", ")} }`;
  }
  seen.delete(value);
  return result;
}

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in params
      ? typeof params[key] === "string"
        ? params[key]
        : inspect(params[key])
      : match,
  );
}

const RESERVED_PARAMS = new Set(["cause"]);

function validateMessage(code, message) {
  const params = message.matchAll(/\{(\w+)\}/g);
  for (const [, key] of params) {
    if (RESERVED_PARAMS.has(key)) {
      throw new Error(
        `Error definition "${code}" uses reserved parameter name "{${key}}" in message template`,
      );
    }
  }
}

export function createErrorClass(definition) {
  const { code, message: defaultMessage, status } = definition;
  const className = toPascalCase(code);

  validateMessage(code, defaultMessage);

  const ErrorKlass = class extends Error {
    code = code;
    status = status;
    name = className;

    constructor(messageOrParams, paramsOrOpts, opts) {
      const message =
        typeof messageOrParams === "string" ? messageOrParams : defaultMessage;

      let params, cause;

      if (typeof messageOrParams === "object" && messageOrParams !== null) {
        // First arg is params object: new Err(params) or new Err(params, opts)
        params = messageOrParams;
        cause = paramsOrOpts?.cause;
      } else if (typeof paramsOrOpts === "object" && paramsOrOpts !== null) {
        if (opts !== undefined) {
          // Three-arg form: new Err("msg", params, opts)
          params = paramsOrOpts;
          cause = opts.cause;
        } else if ("cause" in paramsOrOpts) {
          // Has cause key — extract it, use remaining keys as params
          const { cause: extractedCause, ...rest } = paramsOrOpts;
          cause = extractedCause;
          params = Object.keys(rest).length > 0 ? rest : undefined;
        } else {
          // Pure params object
          params = paramsOrOpts;
        }
      }

      super(
        params ? interpolate(message, params) : message,
        cause !== undefined ? { cause } : undefined,
      );

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  };

  Object.defineProperty(ErrorKlass, "name", { value: className });
  ErrorKlass.code = code;

  return ErrorKlass;
}

export function createErrorClassesByCode(definitions) {
  const classes = {};
  for (const def of definitions) {
    classes[def.code] = createErrorClass(def);
  }
  return classes;
}

export function createErrorClassesByName(definitions) {
  const classes = {};
  for (const def of definitions) {
    classes[toPascalCase(def.code)] = createErrorClass(def);
  }
  return classes;
}

export function isCustomError(error) {
  return (
    error instanceof Error &&
    typeof error.code === "string" &&
    typeof error.status === "number"
  );
}
