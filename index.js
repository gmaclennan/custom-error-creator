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
