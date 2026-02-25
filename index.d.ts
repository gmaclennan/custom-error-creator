type ExtractParams<T extends string> =
  T extends `${string}{${infer Param}}${infer Rest}`
    ? Param | ExtractParams<Rest>
    : never;

type PascalFromScreamingSnake<T extends string> =
  T extends `${infer Head}_${infer Rest}`
    ? `${Capitalize<Lowercase<Head>>}${PascalFromScreamingSnake<Rest>}`
    : Capitalize<Lowercase<T>>;

type ForbiddenParamKeys = "cause";

type ParamsFor<T extends string> =
  ExtractParams<T> extends never
    ? never
    : ExtractParams<T> & ForbiddenParamKeys extends never
      ? Record<ExtractParams<T>, string>
      : never; // <- causes error when forbidden keys are used

type HasParams<T extends string> =
  ExtractParams<T> extends never ? false : true;

export type ErrorDefinition<TMessage extends string = string> = {
  code: string;
  message: TMessage;
  status: number;
};

type ErrorClassFor<Def extends ErrorDefinition> = new (
  message?: string,
  params?: ParamsFor<Def["message"]>,
) => Error & {
  code: Def["code"];
  status: Def["status"];
  name: PascalFromScreamingSnake<Def["code"]>;
};

type ErrorOpts = { cause?: unknown };

type ErrorInstance<Def extends ErrorDefinition> = Error & {
  code: Def["code"];
  status: Def["status"];
  name: PascalFromScreamingSnake<Def["code"]>;
};

export type ErrorConstructor<Def extends ErrorDefinition> =
  HasParams<Def["message"]> extends true
    ? {
        // Default message — params required
        new (params: ParamsFor<Def["message"]>): ErrorInstance<Def>;
        new (
          params: ParamsFor<Def["message"]>,
          opts: ErrorOpts,
        ): ErrorInstance<Def>;
        // Custom message — params optional
        new (
          message: string,
          params?: Record<string, string>,
        ): ErrorInstance<Def>;
        new (
          message: string,
          params: Record<string, string>,
          opts: ErrorOpts,
        ): ErrorInstance<Def>;
        new (message: string | undefined, opts: ErrorOpts): ErrorInstance<Def>;
      }
    : {
        new (): ErrorInstance<Def>;
        new (message: string): ErrorInstance<Def>;
        new (message: string | undefined, opts: ErrorOpts): ErrorInstance<Def>;
      };

type ValidateDefinition<Def extends ErrorDefinition> = ExtractParams<
  Def["message"]
> &
  ForbiddenParamKeys extends never
  ? ErrorConstructor<Def>
  : "Error: message template cannot use reserved parameter name 'cause'";

export function createErrorClass<const Def extends ErrorDefinition>(
  def: Def,
): ValidateDefinition<Def>;

export function createErrorClasses<
  const Defs extends ReadonlyArray<ErrorDefinition>,
>(
  definitions: Defs,
): {
  [D in Defs[number] as D["code"]]: ValidateDefinition<D>;
};

export function isCustomError(
  error: unknown,
): error is ErrorInstance<ErrorDefinition>;
