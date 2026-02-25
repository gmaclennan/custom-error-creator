function toPascalCase(screamingSnake) {
  return screamingSnake
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? params[key] : match,
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

      const params =
        typeof messageOrParams === "object" && messageOrParams !== null
          ? messageOrParams
          : typeof paramsOrOpts === "object" &&
              paramsOrOpts !== null &&
              !("cause" in paramsOrOpts)
            ? paramsOrOpts
            : undefined;

      const cause = opts?.cause ?? paramsOrOpts?.cause;

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

  return ErrorKlass;
}

export function createErrorClasses(definitions) {
  const classes = {};
  for (const def of definitions) {
    classes[def.code] = createErrorClass(def);
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
