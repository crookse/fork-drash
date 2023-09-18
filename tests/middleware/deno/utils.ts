import { HTTPError } from "../../../src/core/errors/HTTPError.ts";
import { StatusCode } from "../../../src/core/http/response/StatusCode.ts";
import { StatusDescription } from "../../../src/core/http/response/StatusDescription.ts";
import * as Chain from "../../../src/modules/RequestChain/mod.native.ts";
import { ResourceGroup } from "../../../src/standard/http/ResourceGroup.ts";

export function assertionMessage(...message: string[]): string {
  return `\n\n
------------------ Test Error/Failure ------------------

${message.join("\n")}

--------------------------------------------------------`;
}

export function catchError(error: Error | HTTPError): Response {
  if (
    (error.name === "HTTPError" || error instanceof HTTPError) &&
    "status_code" in error &&
    "status_code_description" in error
  ) {
    return new Response(error.message, {
      status: error.status_code,
      statusText: error.status_code_description,
    });
  }

  return new Response(error.message, {
    status: StatusCode.InternalServerError,
    statusText: StatusDescription.InternalServerError,
  });
}

export function testCaseName(n: number) {
  return `[Test case ${n}${n < 10 ? " " : ""}]`;
}

/**
 * Take the given `kvp` object and convert it to a URL query param string.
 * @param kvp A key-value pair object where the key is the URL query param name
 * and the value is the value of the query param.
 * @returns The given `kvp` in string format.
 *
 * @example
 * ```typescript
 * const queryString = query({
 *   ok: "then",
 *   hello: "goodbye"
 * }); // => "?ok=then&hello=goodbye"
 * ```
 */
export function query(kvp?: Record<string, string>) {
  if (!kvp) {
    return "";
  }

  return "?" + Object
    .keys(kvp)
    .map((key) => `${key}=${kvp[key]}`)
    .join("&");
}

/**
 * Get a chain with a simple `/` path resource. Middleware and resources can be
 * added to it if passed in the `options` param.
 * @param options
 * @returns The `RequestChain`'s handler.
 *
 * @example
 * ```typescript
 * const myChain = chain({
 *   middleware: [
 *     SomeMiddleware()
 *   ],
 *   resources: [
 *     class MyResource extends Chain.Resource { ... }
 *   ],
 * })
 *
 * const req = new Request("/some-path"), reqOptions);
 * const res = await myChain.handle(req); // => a `Response` object
 * ```
 */
export function chain(options: {
  middleware?: typeof Chain.Middleware[];
  resources?: typeof Chain.Resource[];
}) {
  const {
    middleware = [],
    resources = [],
  } = options;

  return Chain
    .builder()
    .resources(
      ResourceGroup
        .builder()
        .resources(
          class Home extends Chain.Resource {
            public paths = ["/"];

            public GET(_request: Chain.Request) {
              return new Response("Hello from Home.GET()!");
            }
          },
          ...resources,
        )
        .middleware(...middleware)
        .build(),
    )
    .build<Request, Response>();
}
